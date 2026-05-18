import type {
	CreateDragInstance,
	CreateDragOptions,
	DragDropDetail,
	DragEndDetail,
	DragOverDetail,
	DragStartDetail,
	DragTapDetail,
	DropPosition,
} from '../types.js'
import { isUndefined } from '@elements/core'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DRAG_EVENTS, DRAG_ROW_CLASSES } from '../constants.js'
import { emit, extractRow, extractRows, indexOfRow, listen } from '../helpers.js'

/**
 * Framework-agnostic native drag-source / drop-target factory — wraps the
 * HTML5 Drag and Drop API. Operates on direct `[data-index]` children of
 * the host element.
 *
 * Selection model:
 *  - Mouse: plain click replaces, Ctrl/Meta toggles, Shift extends from anchor.
 *  - Clicking outside the bound element with an active selection clears it.
 *
 * Element-agnostic — accepts any `HTMLElement` (typically `<ul>`, `<ol>`,
 * `<menu>`, `<table>` body section, or a custom row container). Composables
 * that bind to a specific list element impose their own gate.
 */
export function createDrag<T = unknown>(
	element: HTMLElement,
	options: CreateDragOptions<T> = {},
): CreateDragInstance {
	const {
		auto = true,
		effect: effectOpt,
		list,
		items,
		axis = 'vertical',
		on,
		types: payloadTypes = [],
	} = options
	const source = list ?? items
	const effectAllowed = effectOpt?.allowed
	const dropEffect = effectOpt?.drop
	const isSource = options.source ?? (auto || !!effectAllowed || !!source)
	const isTarget = options.target ?? (!!dropEffect || !!source)
	const allowSelect = options.select ?? true
	const zone = options.resolve?.zone
	const indicesOf = options.resolve?.indices

	const scope = effectScope()
	const refs = scope.run(() => ({
		dragging: ref(false),
		indices: ref<Set<number>>(new Set()),
		selected: ref<Set<number>>(new Set()),
		target: ref<number | null>(null),
		position: ref<DropPosition | null>(null),
	}))
	if (!refs) throw new Error('createDrag: failed to initialize reactive scope')
	const { dragging, indices, selected, target, position } = refs

	let selectionAnchor: number | null = null
	let targetEl: HTMLElement | null = null
	let pressedRow: HTMLElement | null = null
	let pressedAllowed = false

	const positionOf = (row: HTMLElement, event: DragEvent): DropPosition => {
		const rect = row.getBoundingClientRect()
		return axis === 'vertical'
			? event.clientY < rect.top + rect.height / 2
				? 'before'
				: 'after'
			: event.clientX < rect.left + rect.width / 2
				? 'before'
				: 'after'
	}

	const zoneOf = (row: HTMLElement, event: DragEvent): DropPosition | null =>
		zone ? zone(row, event) : positionOf(row, event)

	const applyImage = (row: HTMLElement, event: DragEvent): void => {
		if (!event.dataTransfer) return
		const rect = row.getBoundingClientRect()
		event.dataTransfer.setDragImage(
			row,
			Math.max(0, event.clientX - rect.left),
			Math.max(0, event.clientY - rect.top),
		)
	}

	const syncRows = (): void => {
		for (const row of extractRows(element)) {
			const i = indexOfRow(row)
			const dragged = i !== null && indices.value.has(i)
			const marked = i !== null && selected.value.has(i)
			const hovered = row === targetEl && !dragged
			const into = hovered && position.value === 'into'
			row.classList.toggle('dragging', dragged)
			row.classList.toggle('selected', marked && !dragged)
			row.classList.toggle('drop-target', hovered)
			row.classList.toggle('drop-indicator', hovered && !into)
			row.classList.toggle('drop-indicator-before', hovered && position.value === 'before')
			row.classList.toggle('drop-indicator-after', hovered && position.value === 'after')
			if (isSource && auto) {
				// When the row contains a `.drag-handle`, only the handle
				// gets `draggable`. Authors using handles want the rest of
				// the row to behave normally — buttons inside still click,
				// text inside still selects, scroll still gestures — and a
				// drag attempt outside the handle should be a no-op rather
				// than a cancelled-with-flicker. Without this guard the
				// row is `draggable` too, the platform fires `dragstart`
				// for grabs anywhere in the row, and `canStartFrom`
				// cancels the drag mid-flight (jumpy preview, weird focus).
				const handles = row.querySelectorAll<HTMLElement>('.drag-handle')
				if (handles.length > 0) {
					row.draggable = false
					for (const handle of handles) handle.draggable = true
				} else {
					row.draggable = true
				}
			}
		}
	}

	const queueSync = (): void => {
		syncRows()
		queueMicrotask(syncRows)
	}

	const setTarget = (row: HTMLElement | null, pos: DropPosition | null): void => {
		targetEl = row
		target.value = indexOfRow(row)
		position.value = pos
	}

	const fireEnd = (cancelled: boolean): void => {
		const detail: DragEndDetail = { cancelled, pointer: null }
		emit(element, DRAG_EVENTS.end, detail)
	}

	const resetState = (notify: boolean, cancelled: boolean): void => {
		const wasDragging = dragging.value
		dragging.value = false
		setTarget(null, null)
		indices.value = new Set()
		queueSync()
		if (notify && wasDragging) fireEnd(cancelled)
	}

	const computeIndices = (startIndex: number): Set<number> => {
		if (indicesOf) return new Set(indicesOf(startIndex))
		if (selected.value.has(startIndex)) return new Set(selected.value)
		return new Set([startIndex])
	}

	const begin = (row: HTMLElement, startIndex: number, event: DragEvent): void => {
		if (!isSource) return
		dragging.value = true
		indices.value = computeIndices(startIndex)
		if (event.dataTransfer) {
			if (effectAllowed) event.dataTransfer.effectAllowed = effectAllowed
			if (source) event.dataTransfer.setData('text/plain', String(startIndex))
		}
		applyImage(row, event)
		const detail: DragStartDetail = {
			indices: new Set(indices.value),
			pointer: new PointerEvent('pointerdown'),
		}
		emit(element, DRAG_EVENTS.start, detail)
		queueSync()
	}

	const update = (row: HTMLElement | null, event: DragEvent): void => {
		if (!row) {
			setTarget(null, null)
			queueSync()
			return
		}
		const pos = zoneOf(row, event)
		if (pos === null) {
			setTarget(null, null)
			queueSync()
			return
		}
		setTarget(row, pos)
		const idx = indexOfRow(row)
		if (idx !== null) {
			const detail: DragOverDetail = {
				index: idx,
				position: pos,
				target: row,
				pointer: new PointerEvent('pointermove'),
				types: payloadTypes,
			}
			emit(row, DRAG_EVENTS.over, detail)
		}
		queueSync()
	}

	const reorder = (targetIndex: number, pos: DropPosition): void => {
		if (!list || indices.value.size === 0 || pos === 'into') return
		const sorted = [...indices.value].sort((a, b) => a - b)
		const rawInsert = pos === 'after' ? targetIndex + 1 : targetIndex
		const data = list.read()
		const extracted: T[] = []
		for (const i of [...sorted].reverse()) {
			const [item] = list.splice(i, 1)
			if (!isUndefined(item)) extracted.unshift(item)
		}
		const offsetCount = sorted.filter((i) => i < rawInsert).length
		const insertAt = Math.max(0, Math.min(rawInsert - offsetCount, list.read().length))
		list.splice(insertAt, 0, ...extracted)
		void data
		selected.value = new Set()
		selectionAnchor = null
		emit(element, DRAG_EVENTS.reorder, {
			from: sorted,
			to: insertAt,
			items: extracted,
		})
	}

	const drop = (row: HTMLElement | null): void => {
		const idx = indexOfRow(row)
		const pos = position.value
		const detail: DragDropDetail = {
			index: idx,
			position: pos,
			target: row,
			pointer: new PointerEvent('pointerup'),
			types: payloadTypes,
		}
		if (row) emit(row, DRAG_EVENTS.drop, detail)
		const own = !!row && row.parentElement === element
		if (own && idx !== null && pos !== null) reorder(idx, pos)
		if (row && pos !== null) {
			selected.value = new Set()
			selectionAnchor = null
		}
		resetState(true, false)
	}

	const rowFromNative = (event: DragEvent): HTMLElement | null => extractRow(event.target, element)

	const canStartFrom = (row: HTMLElement, eventTarget: EventTarget | null): boolean => {
		if (eventTarget instanceof HTMLElement && eventTarget.closest('.no-drag')) return false
		const handle = row.querySelector('.drag-handle')
		if (!(handle instanceof HTMLElement)) return true
		if (!(eventTarget instanceof HTMLElement)) return false
		const pressed = eventTarget.closest('.drag-handle')
		return pressed instanceof HTMLElement && row.contains(pressed)
	}

	const allowsDrag = (row: HTMLElement, eventTarget: EventTarget | null): boolean => {
		if (pressedRow === row) return pressedAllowed
		return canStartFrom(row, eventTarget)
	}

	const clearPress = (): void => {
		pressedRow = null
		pressedAllowed = false
	}

	const select = (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent): void => {
		const ctrl = !!(event && 'ctrlKey' in event && (event.ctrlKey || event.metaKey))
		const shift = !!(event && 'shiftKey' in event && event.shiftKey && selectionAnchor !== null)

		if (ctrl || shift) event?.preventDefault()

		if (shift && selectionAnchor !== null) {
			const lo = Math.min(selectionAnchor, index)
			const hi = Math.max(selectionAnchor, index)
			const next = new Set<number>()
			for (let i = lo; i <= hi; i++) next.add(i)
			selected.value = next
		} else if (ctrl) {
			const next = new Set(selected.value)
			if (next.has(index)) next.delete(index)
			else next.add(index)
			selected.value = next
			selectionAnchor = index
		} else {
			selected.value = new Set([index])
			selectionAnchor = index
		}

		window.getSelection()?.removeAllRanges()
		queueSync()
	}

	const clear = (): void => {
		selected.value = new Set()
		selectionAnchor = null
		resetState(false, false)
	}

	const onMouseDown = (event: Event): void => {
		if (!(event instanceof MouseEvent)) return
		if (event.button !== 0) return
		const row = extractRow(event.target, element)
		pressedRow = row
		pressedAllowed = row ? canStartFrom(row, event.target) : false
	}

	const onDragStart = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (event.target instanceof HTMLElement && event.target.closest('.no-drag')) {
			event.preventDefault()
			clearPress()
			return
		}
		const row = rowFromNative(event)
		const index = indexOfRow(row)
		if (row && !allowsDrag(row, event.target)) {
			event.preventDefault()
			clearPress()
			return
		}
		if (!row || index === null) {
			clearPress()
			return
		}
		begin(row, index, event)
		clearPress()
	}

	const onDragEnd = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		clearPress()
		resetState(true, true)
	}

	const onDragEnter = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (!isTarget) return
		if (dropEffect && event.dataTransfer) event.dataTransfer.dropEffect = dropEffect
		event.preventDefault()
	}

	const onDragOver = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (!isTarget) return
		if (dropEffect && event.dataTransfer) event.dataTransfer.dropEffect = dropEffect
		event.preventDefault()
		update(rowFromNative(event), event)
	}

	const onDragLeave = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		const related = event.relatedTarget
		if (!element.contains(related instanceof Node ? related : null)) {
			setTarget(null, null)
			queueSync()
		}
	}

	const onDrop = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (!isTarget) return
		event.preventDefault()
		drop(rowFromNative(event))
	}

	const onClick = (event: Event): void => {
		if (!(event instanceof MouseEvent)) return
		const row = extractRow(event.target, element)
		const index = indexOfRow(row)
		if (!row || index === null) return
		if (event.target instanceof HTMLElement && event.target.closest('.no-drag')) return
		if (allowSelect) select(index, event)
		const detail: DragTapDetail = {
			index,
			pointer: new PointerEvent('pointerup', {
				pointerType: 'mouse',
				clientX: event.clientX,
				clientY: event.clientY,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
			}),
		}
		emit(element, DRAG_EVENTS.tap, detail)
	}

	const onKeyDown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		if (event.key !== 'Escape') return
		if (!dragging.value) return
		event.preventDefault()
		resetState(true, true)
	}

	const onDocumentDown = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (selected.value.size === 0) return
		if (dragging.value) return
		const t = event.target
		if (!(t instanceof Node)) return
		if (element.contains(t)) return
		selected.value = new Set()
		selectionAnchor = null
		queueSync()
	}

	queueSync()
	const offs: (() => void)[] = []
	if (on?.tap) offs.push(listen(element, DRAG_EVENTS.tap, on.tap))
	if (on?.start) offs.push(listen(element, DRAG_EVENTS.start, on.start))
	if (on?.over) offs.push(listen(element, DRAG_EVENTS.over, on.over))
	if (on?.drop) offs.push(listen(element, DRAG_EVENTS.drop, on.drop))
	if (on?.end) offs.push(listen(element, DRAG_EVENTS.end, on.end))
	if (on?.reorder) offs.push(listen(element, DRAG_EVENTS.reorder, on.reorder))
	if (isSource) {
		element.addEventListener('dragstart', onDragStart)
		element.addEventListener('dragend', onDragEnd)
	}
	if (isTarget) {
		element.addEventListener('dragenter', onDragEnter)
		element.addEventListener('dragover', onDragOver)
		element.addEventListener('dragleave', onDragLeave)
		element.addEventListener('drop', onDrop)
	}
	element.addEventListener('click', onClick)
	element.addEventListener('mousedown', onMouseDown)
	document.addEventListener('keydown', onKeyDown)
	document.addEventListener('mouseup', clearPress, true)
	document.addEventListener('pointerdown', onDocumentDown, true)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			for (const off of offs) off()
			element.removeEventListener('dragstart', onDragStart)
			element.removeEventListener('dragend', onDragEnd)
			element.removeEventListener('dragenter', onDragEnter)
			element.removeEventListener('dragover', onDragOver)
			element.removeEventListener('dragleave', onDragLeave)
			element.removeEventListener('drop', onDrop)
			element.removeEventListener('click', onClick)
			element.removeEventListener('mousedown', onMouseDown)
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('mouseup', clearPress, true)
			document.removeEventListener('pointerdown', onDocumentDown, true)
			scope.stop()
		}
		for (const row of extractRows(element)) {
			for (const name of DRAG_ROW_CLASSES) row.classList.remove(name)
			if (auto) {
				row.draggable = false
				for (const handle of row.querySelectorAll<HTMLElement>('.drag-handle')) {
					handle.draggable = false
				}
			}
		}
		selected.value = new Set()
		selectionAnchor = null
	}

	return {
		dragging: readonly(dragging),
		indices: readonly(indices),
		selected: readonly(selected),
		target: readonly(target),
		position: readonly(position),
		select,
		tap: select,
		clear,
		destroy,
	}
}
