import type { CreatePointerInstance, CreatePointerOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'

/**
 * Framework-agnostic factory wrapping the
 * `pointerdown → pointermove* → pointerup` lifecycle. Sets pointer capture
 * so move/up keep firing across siblings, locks the body cursor for the
 * duration, and disables text selection. Use `accept` to veto specific
 * `pointerdown` events; `on.start/move/end` are pure notification hooks.
 *
 * @remarks Unlike most factories, `createPointer` does not dispatch
 * synthetic `CustomEvent`s — `start/move/end` callbacks receive the raw
 * `PointerEvent` directly because consumers (splitters, sliders) need
 * pointer geometry that wouldn't survive boxing into `event.detail`.
 *
 * @remarks Element-agnostic — accepts any `HTMLElement`. Composables
 * built on top of `createPointer` (sliders, splitters) impose their own
 * tag-specific gating via `assertElement` at the composable layer.
 */
export function createPointer(
	element: HTMLElement,
	options: CreatePointerOptions = {},
): CreatePointerInstance {
	const { cursor, accept, on } = options

	const scope = effectScope()
	const dragging = scope.run(() => ref(false))
	if (!dragging) throw new Error('createPointer: failed to initialize reactive scope')

	let activePointer: number | null = null
	let prevCursor = ''
	let prevSelect = ''

	const restoreBody = (): void => {
		document.body.style.cursor = prevCursor
		document.body.style.userSelect = prevSelect
	}

	const clear = (): void => {
		if (activePointer === null) return
		if (element.hasPointerCapture(activePointer)) element.releasePointerCapture(activePointer)
		restoreBody()
		activePointer = null
		dragging.value = false
	}

	const onMove = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (event.pointerId !== activePointer) return
		on?.move?.(event)
	}

	const onEnd = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (event.pointerId !== activePointer) return
		if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
		element.removeEventListener('pointermove', onMove)
		element.removeEventListener('pointerup', onEnd)
		element.removeEventListener('pointercancel', onEnd)
		restoreBody()
		activePointer = null
		dragging.value = false
		on?.end?.(event)
	}

	const onDown = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (activePointer !== null) return
		if (accept && !accept(event)) return
		event.preventDefault()
		activePointer = event.pointerId
		element.setPointerCapture(activePointer)

		prevCursor = document.body.style.cursor
		prevSelect = document.body.style.userSelect
		if (cursor) document.body.style.cursor = cursor
		document.body.style.userSelect = 'none'

		element.addEventListener('pointermove', onMove)
		element.addEventListener('pointerup', onEnd)
		element.addEventListener('pointercancel', onEnd)
		dragging.value = true
		on?.start?.(event)
	}

	element.addEventListener('pointerdown', onDown)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			element.removeEventListener('pointerdown', onDown)
			scope.stop()
		}
		clear()
	}

	return { dragging: readonly(dragging), clear, destroy }
}
