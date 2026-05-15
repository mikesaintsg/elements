// ============================================================================
//  Browser-side helpers shared across composables / factories.
//
//  Everything here is framework-agnostic: no Vue imports, no SCSS class
//  manipulation. Helpers fall into seven groups:
//
//    1. Identity / narrowing — `generateId`, type guards.
//    2. Semantic-element gating — `assertElement` rejects hosts that
//       don't match the composable's expected tag (e.g. `useDialog`
//       only accepts `<dialog>`).
//    3. Custom-event plumbing — `dispatch`, `emit`, `listen`,
//       `bindEventMap`, `attachListeners`.
//    4. Transition coordination — `runTransition`, `waitForFrame`.
//    5. Shared body-scroll lock — `lockBodyScroll` / `unlockBodyScroll`
//       used by `useDialog` and `useAside`.
//    6. Form / table primitives.
//    7. Popover placement primitives — `sideOf`, `alignmentOf`,
//       `areaForPopoverPlacement`, etc.
// ============================================================================

import type {
	Alignment,
	DragDropDetail,
	DragOverDetail,
	DragStartDetail,
	DragTapDetail,
	DropPosition,
	FormEntry,
	FormError,
	FormFieldElement,
	Placement,
	Side,
	TableCell,
	TableInput,
	TableRange,
	TableRow,
	TableTarget,
} from './types.js'
import {
	BODY_LOCKED_ATTR,
	POPOVER_SIDE_SET,
	TABLE_ARIA_ROWCOUNT,
	TABLE_ARIA_ROWINDEX,
	TABLE_EXPANSION_ATTR,
	TRANSITION_FALLBACK_MS,
} from './constants.js'

// ── 1. Identity / narrowing ─────────────────────────────────────────────────

/**
 * Generate a stable-looking random id with the given prefix.
 * Use `useId()` from Vue when calling inside a component setup — this
 * fallback is for non-component callers (tests, factory internals).
 */
export const generateId = (prefix: string): string =>
	`${prefix}-${Math.random().toString(36).slice(2, 9)}`

/** Safely read an own property from an unknown value. */
export function extractProperty(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined
	return Object.prototype.hasOwnProperty.call(value, key) ? Reflect.get(value, key) : undefined
}

/** Narrow an unknown value to a readonly string array. */
export function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** Narrow an unknown value to a CustomEvent handler. */
export function isEventHandler(value: unknown): value is (event: CustomEvent) => void {
	return typeof value === 'function'
}

/**
 * Return true when the input event represents a mouse interaction (or no
 * pointer event at all). Touch / pen `PointerEvent`s return `false`.
 */
export function isMouseEvent(
	event: MouseEvent | KeyboardEvent | PointerEvent | undefined,
): boolean {
	if (!event) return true
	if (event instanceof PointerEvent) return event.pointerType === 'mouse'
	return true
}

/** Extract native data-transfer types. */
export function extractTypes(event: DragEvent): readonly string[] {
	const types = event.dataTransfer?.types
	return types ? Array.from(types) : []
}

// ── 2. Semantic-element gating ──────────────────────────────────────────────

/**
 * Tag-name guard for composables that bind to a single semantic element.
 *
 * Every `use*` / `create*` that targets a specific HTML element runs this
 * before instantiating its factory state, so the host element MUST be the
 * tag the composable was designed for. Mismatches throw immediately —
 * silently downgrading would let a `<div>` masquerade as a `<dialog>` and
 * break ARIA contracts, scroll-lock pairing, focus-trap assumptions, etc.
 *
 * The `expected` argument is one or more lowercased tag names; anything
 * else throws `TypeError`. Pass an array when a composable accepts a
 * narrow family (e.g. `useDrop` accepts every element, but `useTabs`
 * accepts only `<menu>` / `<ul>` / `<ol>` wrappers).
 *
 * @example
 *   assertElement(el, 'dialog')           // strict — must be HTMLDialogElement
 *   assertElement(el, ['ul', 'ol', 'menu']) // family — any list element
 */
export function assertElement<T extends HTMLElement>(
	element: HTMLElement | null | undefined,
	expected: string | readonly string[],
	composable: string = '',
): asserts element is T {
	if (!element) {
		throw new TypeError(
			`${composable || 'composable'}: host element is null. Pass a ref to a mounted element.`,
		)
	}
	const tag = element.tagName.toLowerCase()
	const list = typeof expected === 'string' ? [expected] : expected
	if (!list.includes(tag)) {
		const printed = list.length === 1 ? `<${list[0]}>` : list.map((t) => `<${t}>`).join(' / ')
		throw new TypeError(
			`${composable || 'composable'}: expected ${printed} host element, received <${tag}>. ` +
				`Use the semantically-correct element so framework styles and ARIA contracts apply.`,
		)
	}
}

/**
 * Boolean variant of {@link assertElement}. Useful inside reactive
 * watchers / lazy guards where throwing isn't appropriate (e.g., during
 * SSR teardown when the host transitions through `null`).
 */
export function isElement<T extends HTMLElement>(
	element: HTMLElement | null | undefined,
	expected: string | readonly string[],
): element is T {
	if (!element) return false
	const tag = element.tagName.toLowerCase()
	const list = typeof expected === 'string' ? [expected] : expected
	return list.includes(tag)
}

// ── 3. Custom-event plumbing ────────────────────────────────────────────────
// Composables dispatch typed CustomEvents on bound elements so external
// consumers can observe or cancel transitions via addEventListener — the
// same pattern Bootstrap uses for `show.bs.modal`, etc.

/**
 * Dispatch a cancelable `CustomEvent` on `el`.
 * Returns `true` when the action should proceed (not prevented),
 * `false` when a listener called `event.preventDefault()`.
 *
 * @remarks Use for cancellable lifecycle transitions: show, hide, slide.
 */
export function dispatch(el: Element, name: string, detail?: unknown): boolean {
	const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail })
	el.dispatchEvent(event)
	return !event.defaultPrevented
}

/**
 * Dispatch a non-cancelable notification `CustomEvent` on `el`.
 *
 * @remarks Use for post-transition notifications: open, close, change, place, activate.
 */
export function emit(el: Element, name: string, detail?: unknown): void {
	el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: false, detail }))
}

/**
 * Add a typed `CustomEvent` listener to `el`.
 * Returns a cleanup function that removes the listener.
 * Internally wraps the handler so it satisfies `EventListener` typing
 * without requiring `as EventListener` casts.
 */
export function listen(
	el: Element,
	name: string,
	handler: (event: CustomEvent) => void,
): () => void {
	const listener = (event: Event): void => {
		if (event instanceof CustomEvent) handler(event)
	}
	el.addEventListener(name, listener)
	return () => el.removeEventListener(name, listener)
}

/**
 * Bind every key in `events` that has a matching handler in `on`.
 * Returns a single composite teardown that removes all listeners.
 *
 * @remarks Replaces the repeated `if (on?.show) offs.push(listen(...))` blocks.
 */
export function bindEventMap(
	el: Element,
	events: Readonly<Record<string, string>>,
	on: object | undefined,
): () => void {
	if (!on) return () => {}
	const offs: (() => void)[] = []
	for (const [key, name] of Object.entries(events)) {
		const value = extractProperty(on, key)
		if (isEventHandler(value)) offs.push(listen(el, name, value))
	}
	return () => offs.forEach((o) => o())
}

/**
 * Bind multiple native event listeners to `el`.
 * Returns a single composite teardown that removes all listeners.
 */
export function attachListeners(
	el: EventTarget,
	entries: readonly { readonly name: string; readonly handler: EventListener }[],
): () => void {
	for (const { name, handler } of entries) el.addEventListener(name, handler)
	return () => {
		for (const { name, handler } of entries) el.removeEventListener(name, handler)
	}
}

// ── 4. Transition coordination ──────────────────────────────────────────────

/**
 * Run `callback` once after the next CSS transition on `el`, with a
 * timeout fallback in case the transition never fires.
 */
export function runTransition(
	el: HTMLElement,
	callback: () => void,
	fallbackMs: number = TRANSITION_FALLBACK_MS,
): () => void {
	let done = false
	let cancelled = false
	const finish = (): void => {
		if (done) return
		done = true
		el.removeEventListener('transitionend', onEnd)
		clearTimeout(timer)
		if (!cancelled) callback()
	}
	const onEnd = (event: TransitionEvent): void => {
		if (event.target !== el) return
		finish()
	}
	const timer = setTimeout(finish, fallbackMs)
	el.addEventListener('transitionend', onEnd)
	return () => {
		cancelled = true
		finish()
	}
}

/**
 * Wait for the next animation frame.
 * Needed to prevent the browser from collapsing a `display` change and an
 * attribute change into a single paint (which would skip the CSS transition).
 */
export function waitForFrame(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
		else setTimeout(resolve, 0)
	})
}

// ── 5. Shared body-scroll lock ──────────────────────────────────────────────
// Both `useDialog` and `useAside` call these helpers so concurrent open
// instances don't stomp each other's paddingRight.

let scrollLockCount = 0
let scrollLockApplied = false
let scrollLockPad = ''

/**
 * Increment the global scroll-lock counter. On the first call, saves the
 * current `body.style.paddingRight`, adds the scrollbar-compensation width,
 * and toggles the `BODY_LOCKED_ATTR` data-attribute.
 *
 * @remarks The counter is process-global. Calling `unlockBodyScroll()`
 * without a prior `lockBodyScroll()` is a no-op (counter clamps to 0).
 */
export function lockBodyScroll(): void {
	scrollLockCount++
	if (scrollLockApplied) return
	scrollLockApplied = true
	scrollLockPad = document.body.style.paddingRight
	const sw = window.innerWidth - document.documentElement.clientWidth
	if (sw > 0) document.body.style.paddingRight = `${sw}px`
	document.body.setAttribute(BODY_LOCKED_ATTR, '')
}

/**
 * Decrement the global scroll-lock counter. Restores `paddingRight` and
 * removes `BODY_LOCKED_ATTR` only when the counter reaches zero.
 */
export function unlockBodyScroll(): void {
	scrollLockCount = Math.max(0, scrollLockCount - 1)
	if (scrollLockCount > 0 || !scrollLockApplied) return
	scrollLockApplied = false
	document.body.style.paddingRight = scrollLockPad
	document.body.removeAttribute(BODY_LOCKED_ATTR)
}

// ── 6a. Drag/drop detail guards ─────────────────────────────────────────────

/** Narrow an unknown value to a drag/drop insertion position. */
export function isDropPosition(value: unknown): value is DropPosition {
	return value === 'before' || value === 'after' || value === 'into'
}

/** Narrow a `CustomEvent.detail` value to drag tap detail. */
export function isDragTapDetail(value: unknown): value is DragTapDetail {
	return (
		typeof extractProperty(value, 'index') === 'number' &&
		extractProperty(value, 'pointer') instanceof PointerEvent
	)
}

/** Narrow a `CustomEvent.detail` value to drag start detail. */
export function isDragStartDetail(value: unknown): value is DragStartDetail {
	return (
		extractProperty(value, 'indices') instanceof Set &&
		extractProperty(value, 'pointer') instanceof PointerEvent
	)
}

/** Narrow a `CustomEvent.detail` value to drag over detail. */
export function isDragOverDetail(value: unknown): value is DragOverDetail {
	return (
		typeof extractProperty(value, 'index') === 'number' &&
		isDropPosition(extractProperty(value, 'position')) &&
		extractProperty(value, 'target') instanceof HTMLElement &&
		extractProperty(value, 'pointer') instanceof PointerEvent &&
		isStringArray(extractProperty(value, 'types'))
	)
}

/** Narrow a `CustomEvent.detail` value to drag drop detail. */
export function isDragDropDetail(value: unknown): value is DragDropDetail {
	const index = extractProperty(value, 'index')
	const position = extractProperty(value, 'position')
	return (
		(typeof index === 'number' || index === null) &&
		(isDropPosition(position) || position === null) &&
		(extractProperty(value, 'target') instanceof HTMLElement ||
			extractProperty(value, 'target') === null) &&
		extractProperty(value, 'pointer') instanceof PointerEvent &&
		isStringArray(extractProperty(value, 'types'))
	)
}

/** Find the direct `[data-index]` child of `root` that contains `target`. */
export function extractRow(
	target: EventTarget | null,
	root: HTMLElement | null,
): HTMLElement | null {
	if (!root) return null
	if (!(target instanceof HTMLElement)) return null
	const el = target.closest<HTMLElement>('[data-index]')
	if (!el || el.parentElement !== root) return null
	return el
}

/** Parse `data-index` of a row, returning `null` if it is not a finite number. */
export function indexOfRow(row: HTMLElement | null): number | null {
	if (!row) return null
	const i = Number(row.dataset.index)
	return Number.isFinite(i) ? i : null
}

/** Return direct `[data-index]` HTMLElement children from `root`. */
export function extractRows(root: HTMLElement | null): readonly HTMLElement[] {
	if (!root) return []
	return Array.from(root.children).filter(
		(child): child is HTMLElement =>
			child instanceof HTMLElement && child.hasAttribute('data-index'),
	)
}

// ── 6b. Form helpers ────────────────────────────────────────────────────────

/** Narrow an element to a native form-associated field element. */
export function isFormFieldElement(element: Element): element is FormFieldElement {
	return (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLFieldSetElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLObjectElement ||
		element instanceof HTMLOutputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	)
}

/** Narrow an element to a field that exposes constraint-validation APIs. */
export function isValidityElement(
	element: Element,
): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	)
}

/** Read form-associated controls from a native form. */
export function readFormFields(form: HTMLFormElement): readonly FormFieldElement[] {
	return Array.from(form.elements).filter(isFormFieldElement)
}

/** Read unique non-empty field names in form order. */
export function readFormNames(fields: readonly FormFieldElement[]): readonly string[] {
	const names = new Set<string>()
	for (const field of fields) {
		if (field.name) names.add(field.name)
	}
	return Array.from(names)
}

/** Snapshot native form data entries. */
export function readFormData(form: HTMLFormElement): readonly FormEntry[] {
	return Array.from(new FormData(form).entries()).map(([name, value]) => ({ name, value }))
}

/**
 * Snapshot current validation errors from form fields.
 *
 * Skips fields where `willValidate` is false — disabled inputs, readonly
 * inputs, inputs inside a disabled `<fieldset>`, and non-submit buttons
 * always report `validity.valid === true` regardless of their value, and
 * do not participate in constraint validation.
 */
export function readFormErrors(fields: readonly FormFieldElement[]): readonly FormError[] {
	const errors: FormError[] = []
	for (const field of fields) {
		if (!isValidityElement(field)) continue
		if (!field.willValidate) continue
		if (field.validity.valid) continue
		errors.push({
			name: field.name,
			message: field.validationMessage,
			validity: field.validity,
		})
	}
	return errors
}

/** Read a form field name from an event target element. */
export function fieldName(element: Element): string | null {
	return isFormFieldElement(element) && element.name ? element.name : null
}

// ── 6c. Table helpers ───────────────────────────────────────────────────────

/** Write a primitive or Node value into a native table cell. */
export function writeTableCell(cell: HTMLTableCellElement, value: TableInput): void {
	cell.textContent = ''
	if (value === null || value === undefined) return
	if (value instanceof Node) {
		cell.appendChild(value)
		return
	}
	cell.textContent = String(value)
}

/** Write a complete native table row, adding or removing cells as needed. */
export function writeTableRow(row: HTMLTableRowElement, values: readonly TableInput[]): void {
	while (row.cells.length > values.length) row.deleteCell(row.cells.length - 1)
	for (let index = 0; index < values.length; index++) {
		const existing = row.cells[index]
		const cell = existing ?? row.insertCell()
		writeTableCell(cell, values[index])
	}
}

/** Read text values from every cell in a table row. */
export function readTableCells(row: HTMLTableRowElement): TableRow {
	return Array.from(row.cells).map((cell) => cell.textContent ?? '')
}

/** Serialize a body-cell coordinate for Set storage. */
export function keyOfTableCell(cell: TableCell): string {
	return `${cell.row},${cell.column}`
}

/** Normalize an insertion index against an inclusive upper bound. */
export function normalizeIndex(index: number, count: number): number | null {
	if (!Number.isInteger(index) || index < 0 || index > count) return null
	return index
}

/** Narrow a table target to one cell coordinate. */
export function isTableCellTarget(target: TableTarget): target is TableCell {
	return typeof target === 'object' && 'row' in target && 'column' in target
}

/** Narrow a table target to one row range. */
export function isTableRangeTarget(target: TableTarget): target is TableRange {
	return typeof target === 'object' && 'from' in target && 'to' in target
}

/**
 * Read body rows across every `<tbody>` in document order. Section-scoped, so
 * `<thead>` and `<tfoot>` rows are never returned. The factory indexes
 * everything off the result, so any caller that needs body-only rows should
 * use this rather than `element.rows` (which is table-flat).
 */
export function readTableRows(element: HTMLTableElement): readonly HTMLTableRowElement[] {
	const rows: HTMLTableRowElement[] = []
	for (const section of Array.from(element.tBodies)) {
		rows.push(...Array.from(section.rows))
	}
	return rows
}

/**
 * Extract the stable id from a table row.
 * Reads `TABLE_ROW_ID_ATTR` (`data-id`), falls back to `data-index`.
 * Empty string is returned when neither attribute is present, indicating
 * positional (unstable) identity.
 */
export function extractRowId(row: HTMLTableRowElement): string {
	return row.dataset.id ?? row.dataset.index ?? ''
}

/**
 * Find the expansion detail `<tr>` immediately following a body row. Returns
 * `null` if the sibling is absent or doesn't carry the expansion attribute.
 */
export function findDetailRow(row: HTMLTableRowElement): HTMLTableRowElement | null {
	const next = row.nextElementSibling
	if (!(next instanceof HTMLTableRowElement)) return null
	return next.hasAttribute(TABLE_EXPANSION_ATTR) ? next : null
}

/**
 * Update `aria-rowindex` on all body rows using the provided `offset`.
 * Indices are 1-based per the ARIA grid spec.
 */
export function applyRowIndex(rows: readonly HTMLTableRowElement[], offset: number): void {
	const base = Number.isFinite(offset) && offset >= 1 ? Math.floor(offset) : 1
	for (let i = 0; i < rows.length; i++) {
		rows[i]?.setAttribute(TABLE_ARIA_ROWINDEX, String(base + i))
	}
}

/** Write `aria-rowcount` on the table element; remove it when `count` is 0. */
export function applyRowCount(el: HTMLTableElement, count: number): void {
	if (Number.isFinite(count) && count > 0)
		el.setAttribute(TABLE_ARIA_ROWCOUNT, String(Math.floor(count)))
	else el.removeAttribute(TABLE_ARIA_ROWCOUNT)
}

/** Return the first tbody, optionally creating it. */
export function tableBody(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableSectionElement | null {
	const existing = element.tBodies[0]
	if (existing) return existing
	return create ? element.createTBody() : null
}

/** Return the first header row, optionally creating thead and row. */
export function tableHeaderRow(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableRowElement | null {
	const head = create ? element.createTHead() : element.tHead
	if (!head) return null
	return head.rows[0] ?? (create ? head.insertRow() : null)
}

/** Return the first footer row, optionally creating tfoot and row. */
export function tableFooterRow(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableRowElement | null {
	const foot = create ? element.createTFoot() : element.tFoot
	if (!foot) return null
	return foot.rows[0] ?? (create ? foot.insertRow() : null)
}

/** Write a `<th scope="col">` header row, replacing any existing cells. */
export function writeTableHeaderRow(
	element: HTMLTableElement,
	values: readonly TableInput[],
): void {
	const row = tableHeaderRow(element, true)
	if (!row) return
	while (row.cells.length > 0) row.deleteCell(0)
	for (const value of values) {
		const cell = document.createElement('th')
		cell.scope = 'col'
		writeTableCell(cell, value)
		row.appendChild(cell)
	}
}

/** Write the first footer row with native table cells. */
export function writeTableFooterRow(
	element: HTMLTableElement,
	values: readonly TableInput[],
): void {
	const row = tableFooterRow(element, true)
	if (!row) return
	while (row.cells.length > 0) row.deleteCell(0)
	for (const value of values) writeTableCell(row.insertCell(), value)
}

/**
 * Strip composable-owned selected state from every row and cell. Used by
 * `useTable` to rebuild selection from scratch on the next paint.
 */
export function cleanTableSelection(element: HTMLTableElement): void {
	for (const row of Array.from(element.rows)) {
		row.removeAttribute('aria-selected')
		for (const cell of Array.from(row.cells)) {
			cell.removeAttribute('aria-selected')
		}
	}
}

/**
 * Write `aria-selected="false"` on every body row not already marked
 * `"true"`. ARIA grids require triadic selection state on rows when
 * selection is active.
 */
export function markTableUnselectedRows(element: HTMLTableElement): void {
	for (const section of Array.from(element.tBodies)) {
		for (const row of Array.from(section.rows)) {
			if (row.getAttribute('aria-selected') !== 'true') {
				row.setAttribute('aria-selected', 'false')
			}
		}
	}
}

/** Read the first header row as text values. */
export function readTableHeaders(element: HTMLTableElement): readonly string[] {
	const row = element.tHead?.rows[0]
	return row ? readTableCells(row) : []
}

/** Read the first footer row as text values. */
export function readTableFooter(element: HTMLTableElement): readonly string[] {
	const row = element.tFoot?.rows[0]
	return row ? readTableCells(row) : []
}

/**
 * Read body rows as a two-dimensional text matrix. One entry per physical
 * cell — `colspan="2"` produces one slot, not two.
 */
export function readTableData(element: HTMLTableElement): readonly TableRow[] {
	return readTableRows(element).map(readTableCells)
}

/** Read body data grouped by column index. Returns one `TableRow` per column. */
export function readTableColumns(element: HTMLTableElement): readonly TableRow[] {
	const rows = readTableData(element)
	const count = rows.reduce((max, row) => Math.max(max, row.length), 0)
	const columns: TableRow[] = []
	for (let column = 0; column < count; column++) {
		columns.push(rows.map((row) => row[column] ?? ''))
	}
	return columns
}

// ── 7. Popover placement primitives ─────────────────────────────────────────
// Pure transformers over the `Placement = Side | ${Side}-${Alignment}` shape.
// Used by usePopover (and any composable that wraps it) to decompose a
// placement string and feed it into the surface-layer `position-area` token.

/** Type guard narrowing a string to `Side`. */
export function isSide(value: string): value is Side {
	return POPOVER_SIDE_SET.has(value)
}

/** Extract the side component of a `Placement`; defaults to `'bottom'`. */
export function sideOf(placement: Placement): Side {
	const head = placement.split('-')[0] ?? ''
	return isSide(head) ? head : 'bottom'
}

/** Extract the alignment component of a `Placement`, or `null` if absent. */
export function alignmentOf(placement: Placement): Alignment | null {
	const tail = placement.split('-')[1]
	return tail === 'start' || tail === 'end' ? tail : null
}

/** Re-assemble a `Placement` from a `Side` and optional `Alignment`. */
export function makePlacement(side: Side, align: Alignment | null): Placement {
	return align ? `${side}-${align}` : side
}

// CSS `position-area` value per `Placement`. Single-side variants stay
// centered; aligned variants use `span-*` so the panel keeps a flat edge
// against the anchor (`bottom-start` = below + start-aligned, not the corner
// cell). Logical `start` / `end` map to physical `left` / `right` because
// Chromium's `position-area` parser only accepts the physical keywords today.
const PLACEMENT_AREAS: Readonly<Record<Placement, string>> = {
	top: 'top',
	'top-start': 'top span-right',
	'top-end': 'top span-left',
	bottom: 'bottom',
	'bottom-start': 'bottom span-right',
	'bottom-end': 'bottom span-left',
	end: 'right',
	'end-start': 'right span-bottom',
	'end-end': 'right span-top',
	start: 'left',
	'start-start': 'left span-bottom',
	'start-end': 'left span-top',
}

/** Translate a `Placement` to a CSS `position-area` value. */
export function areaForPopoverPlacement(placement: Placement): string {
	return PLACEMENT_AREAS[placement] ?? PLACEMENT_AREAS.bottom
}

// `align-self` / `justify-self` per `Placement`. Mirrors mailbox's
// `$placements` map in `_mixins.scss`. The surface default
// (`align-self: start; justify-self: anchor-center`) only happens to be
// correct for the `'bottom'` placement — every aligned placement
// (`bottom-start`, `top-end`, etc.) needs an explicit override or it
// inherits the surface default and visually CENTERS on the anchor or
// drifts to the wrong edge of the position-area band. Composables write
// these inline alongside `position-area` so the placement contract is
// self-contained per panel.
const PLACEMENT_SELFS: Readonly<Record<Placement, readonly [string, string]>> = {
	top: ['end', 'anchor-center'],
	'top-start': ['end', 'start'],
	'top-end': ['end', 'end'],
	bottom: ['start', 'anchor-center'],
	'bottom-start': ['start', 'start'],
	'bottom-end': ['start', 'end'],
	end: ['anchor-center', 'start'],
	'end-start': ['start', 'start'],
	'end-end': ['end', 'start'],
	start: ['anchor-center', 'end'],
	'start-start': ['start', 'end'],
	'start-end': ['end', 'end'],
}

/** `[alignSelf, justifySelf]` pair for a popover `Placement`. */
export function selfsForPopoverPlacement(placement: Placement): readonly [string, string] {
	return PLACEMENT_SELFS[placement] ?? PLACEMENT_SELFS.bottom
}

/**
 * Resolve the side the browser actually placed the panel on. Native popover
 * + `position-try-fallbacks` may flip the requested placement when it would
 * overflow, so the consuming chrome (arrow rotation, callout-edge class)
 * needs the resolved side, not the requested one. Falls back to `'bottom'`
 * when the panel overlaps the anchor (e.g., before first paint).
 */
export function resolvePopoverSide(anchor: HTMLElement, panel: HTMLElement): Side {
	const a = anchor.getBoundingClientRect()
	const p = panel.getBoundingClientRect()
	if (p.bottom <= a.top + 1) return 'top'
	if (p.top >= a.bottom - 1) return 'bottom'
	if (p.right <= a.left + 1) return 'start'
	if (p.left >= a.right - 1) return 'end'
	return 'bottom'
}

// ── 8. Roving keyboard navigation ───────────────────────────────────────────

/**
 * Return all `selector`-matching descendants of `root` that can actually
 * receive focus, as a flat array.
 *
 * Why the focusability filter exists: `MENU_ITEM_SELECTOR` matches
 * `<li>`, `<a>`, and `<button>` so authors can rove either over the
 * spec-required `<menu><li>` wrappers OR over the inner interactive
 * element. But when BOTH are present (`<menu><li><button>…</button></li>`
 * — the most common shape) a raw `querySelectorAll` returns
 * `[LI, BUTTON, LI, BUTTON, …]` and roving lands on the `<li>` first.
 * `<li>` has `tabIndex = -1` by default, so `.focus()` is a silent no-op
 * and the user sees nothing happen.
 *
 * Filtering on `tabIndex >= 0` drops the non-focusable wrapper while
 * preserving the case where the `<li>` itself is the tab-stop (the
 * author opts in with `tabindex="0"` and presumably hasn't also nested
 * an `<a>` / `<button>` inside).
 */
export function focusableItems(root: HTMLElement | null, selector: string): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => el.tabIndex >= 0)
}

/**
 * Compute the next focused index for roving keyboard navigation.
 * Handles `ArrowDown`, `ArrowUp`, `Home`, and `End`.
 *
 * @param items — flat list of candidate elements
 * @param key — `KeyboardEvent.key` value
 * @param current — index of the currently focused element (-1 when none)
 * @returns new target index, clamped to `[0, items.length - 1]`
 */
export function rove(items: readonly HTMLElement[], key: string, current: number): number {
	const n = items.length
	if (n === 0) return 0
	if (key === 'Home') return 0
	if (key === 'End') return n - 1
	if (key === 'ArrowDown' || key === 'ArrowUp') {
		const delta = key === 'ArrowDown' ? 1 : -1
		if (current < 0) return key === 'ArrowDown' ? 0 : n - 1
		return (current + delta + n) % n
	}
	return current
}
