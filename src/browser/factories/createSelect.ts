import type {
	CreateMenuInstance,
	CreateSelectElements,
	CreateSelectInstance,
	CreateSelectOptions,
	Placement,
} from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import {
	DEFAULT_SELECT_FLIP,
	SELECT_EVENTS,
	SELECT_HIDDEN_ATTR,
	SELECT_ITEM_SELECTOR,
	SELECT_VALUE_ATTR,
} from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	generateId,
	rove,
} from '../helpers.js'
import { createMenu } from './createMenu.js'

/**
 * Framework-agnostic select factory. Composes `createMenu` for popover
 * visibility, dismiss, and position; layers WAI-ARIA listbox semantics on
 * top:
 *
 *   - `role="listbox"` on the `<menu>` panel
 *   - `role="option"` + `aria-selected` on each option row
 *   - `aria-activedescendant` cursor that moves with arrow keys without
 *     shifting DOM focus
 *
 * When an `input` element is provided, the toggle is promoted to a
 * combobox: typing filters options on substring match (`[data-hidden]`
 * attribute on filtered rows), the active descendant follows the visible
 * subset, and `Enter` commits the cursor.
 *
 * When a `native` `<select>` (or `<input>`) is provided, the factory
 * mirrors the current value into it so the selection participates in
 * form data and constraint validation.
 *
 * Element gating: the panel MUST be `<menu>` (gated by the wrapped
 * `createMenu`).
 *
 * @see src/browser/factories/createMenu.ts — the underlying popover.
 */
export function createSelect(
	elements: CreateSelectElements,
	options: CreateSelectOptions = {},
): CreateSelectInstance {
	const { toggle: toggleEl, menu, native = null, input = null } = elements
	assertElement<HTMLMenuElement>(menu, 'menu', 'createSelect')

	const multiple = options.multiple ?? false
	const autocomplete = options.autocomplete ?? false
	if (autocomplete && multiple) {
		throw new Error('createSelect: `autocomplete` and `multiple` are mutually exclusive')
	}
	if (autocomplete && !input) {
		throw new Error('createSelect: `autocomplete: true` requires the `input` element')
	}
	const dismissOutside = options.dismiss?.outside ?? true
	const dismissEscape = options.dismiss?.escape ?? true
	// Single-select dismisses on inside click by default; multi keeps the
	// menu open so callers can build up the selection without reopening.
	const dismissInside = options.dismiss?.inside ?? !multiple

	// === Reactive state
	const scope = effectScope()
	const visible = scope.run(() => ref<boolean>(false))
	const values = scope.run(() => ref<readonly string[]>(normalize(options.value)))
	const value = scope.run(() => ref<string | null>(values?.value[0] ?? null))
	const query = scope.run(() => ref<string>(''))
	if (!visible || !value || !values || !query) {
		throw new Error('createSelect: failed to initialize reactive scope')
	}

	// === Static accessibility wiring
	// `id` + `role` on the menu must be set BEFORE createMenu runs so the
	// wrapped popover can reference it via `aria-controls`.
	const menuId = menu.id || generateId('select-menu')
	if (!menu.id) menu.id = menuId
	menu.setAttribute('role', 'listbox')
	if (multiple) menu.setAttribute('aria-multiselectable', 'true')

	// The control element ARIA contract is set AFTER createMenu so the
	// listbox-flavoured values override createMenu's menu-flavoured ones
	// (createMenu sets `aria-haspopup="menu"`; selects need `"listbox"`).
	const controlEl: HTMLElement = input ?? toggleEl

	// === Helpers
	const items = (): HTMLElement[] =>
		Array.from(menu.querySelectorAll<HTMLElement>(SELECT_ITEM_SELECTOR))

	const visibleItems = (): HTMLElement[] =>
		items().filter((el) => !el.hasAttribute(SELECT_HIDDEN_ATTR))

	const activeId = (): string | null => controlEl.getAttribute('aria-activedescendant')

	const setActive = (target: HTMLElement | null): void => {
		for (const el of items()) {
			if (el !== target) el.classList.remove('active')
		}
		if (target) {
			if (!target.id) target.id = generateId('select-option')
			target.classList.add('active')
			controlEl.setAttribute('aria-activedescendant', target.id)
			target.scrollIntoView({ block: 'nearest' })
		} else {
			controlEl.removeAttribute('aria-activedescendant')
		}
	}

	const ensureIds = (): void => {
		for (const el of items()) {
			if (!el.id) el.id = generateId('select-option')
		}
	}

	const writeSelectionAttrs = (): void => {
		const set = new Set(values.value)
		for (const el of items()) {
			const v = el.getAttribute(SELECT_VALUE_ATTR)
			if (v === null) continue
			if (set.has(v)) el.setAttribute('aria-selected', 'true')
			else el.removeAttribute('aria-selected')
		}
	}

	const writeNative = (): void => {
		if (!native) return
		if (native instanceof HTMLSelectElement) {
			if (multiple) {
				const set = new Set(values.value)
				for (const opt of Array.from(native.options)) opt.selected = set.has(opt.value)
			} else {
				native.value = value.value ?? ''
			}
		} else {
			native.value = value.value ?? ''
		}
		native.dispatchEvent(new Event('change', { bubbles: true }))
	}

	const sync = (): void => {
		value.value = values.value[0] ?? null
		writeSelectionAttrs()
		writeNative()
	}

	const filter = (q: string): void => {
		const needle = q.trim().toLowerCase()
		for (const el of items()) {
			if (needle === '') {
				el.removeAttribute(SELECT_HIDDEN_ATTR)
				continue
			}
			const haystack = (el.textContent ?? '').toLowerCase()
			if (haystack.includes(needle)) el.removeAttribute(SELECT_HIDDEN_ATTR)
			else el.setAttribute(SELECT_HIDDEN_ATTR, '')
		}
		// Keep the active descendant valid — clear it if it was filtered out,
		// or move it to the first visible row.
		const active = activeId()
		const activeEl = active ? document.getElementById(active) : null
		if (active && !activeEl?.isConnected) setActive(null)
		else if (activeEl?.hasAttribute(SELECT_HIDDEN_ATTR)) {
			setActive(visibleItems()[0] ?? null)
		} else if (!active) {
			setActive(visibleItems()[0] ?? null)
		}
	}

	// === Wrapped menu
	const dropdown: CreateMenuInstance = createMenu(
		{ toggle: toggleEl, menu },
		{
			placement: options.placement ?? 'bottom-start',
			strategy: options.strategy,
			offset: options.offset,
			// Selects opt INTO flip by default — a listbox at the bottom of
			// the viewport should reveal upwards rather than scroll an
			// out-of-view tail. Menus inherit the createMenu default of 5
			// rows; useSelect just shares that baseline.
			flip: options.flip ?? DEFAULT_SELECT_FLIP,
			dismiss: { outside: dismissOutside, escape: dismissEscape, inside: false },
			on: {
				show: (event: CustomEvent) => {
					if (!dispatch(toggleEl, SELECT_EVENTS.show)) {
						event.preventDefault()
						return
					}
					ensureIds()
					writeSelectionAttrs()
					controlEl.setAttribute('aria-expanded', 'true')
					const first = items().find((el) => el.getAttribute(SELECT_VALUE_ATTR) === value.value)
					setActive(first ?? visibleItems()[0] ?? null)
					visible.value = true
				},
				open: () => {
					// Combobox path: shift focus to the input the moment
					// the dropdown opens so typing can drive the filter
					// without an extra tap. `useMenu` already wires the
					// click → open path, so we hook focus on the open
					// event instead of duplicating the click listener.
					if (input) input.focus()
					emit(toggleEl, SELECT_EVENTS.open)
				},
				hide: (event: CustomEvent) => {
					if (!dispatch(toggleEl, SELECT_EVENTS.hide)) event.preventDefault()
				},
				close: () => {
					controlEl.setAttribute('aria-expanded', 'false')
					setActive(null)
					visible.value = false
					emit(toggleEl, SELECT_EVENTS.close)
				},
			},
		},
	)

	// Listbox-flavoured ARIA. Set AFTER createMenu so these values win
	// over the menu-flavoured `aria-haspopup="menu"` createMenu writes.
	if (input) {
		controlEl.setAttribute('role', 'combobox')
		controlEl.setAttribute('aria-autocomplete', 'list')
	}
	controlEl.setAttribute('aria-controls', menuId)
	controlEl.setAttribute('aria-haspopup', 'listbox')
	controlEl.setAttribute('aria-expanded', 'false')

	// === Actions
	const show = (): void => dropdown.show()
	const hide = (): void => dropdown.hide()
	const toggle = (): void => dropdown.toggle()

	const select = (next: string): void => {
		if (multiple) {
			const set = new Set(values.value)
			if (set.has(next)) set.delete(next)
			else set.add(next)
			values.value = Array.from(set)
		} else {
			values.value = next === '' ? [] : [next]
		}
		sync()
		if (autocomplete && input && input.value !== (value.value ?? '')) {
			input.value = value.value ?? ''
			query.value = input.value
		}
		emit(toggleEl, SELECT_EVENTS.select, {
			value: value.value,
			values: values.value,
		})
		if (!multiple && dismissInside) dropdown.hide()
	}

	const clear = (): void => {
		if (values.value.length === 0 && (!autocomplete || !input || input.value === '')) return
		values.value = []
		if (autocomplete && input) {
			input.value = ''
			query.value = ''
		}
		sync()
		emit(toggleEl, SELECT_EVENTS.clear)
	}

	const update = (next?: { readonly placement?: Placement }): void => {
		dropdown.update(next)
	}

	// === Handlers
	const onMenuClick = (event: Event): void => {
		if (!(event.target instanceof HTMLElement)) return
		const item = event.target.closest<HTMLElement>(SELECT_ITEM_SELECTOR)
		if (!item || !menu.contains(item)) return
		const v = item.getAttribute(SELECT_VALUE_ATTR)
		if (v === null) return
		event.preventDefault()
		select(v)
	}

	const onMenuMouseOver = (event: Event): void => {
		if (!(event.target instanceof HTMLElement)) return
		const item = event.target.closest<HTMLElement>(SELECT_ITEM_SELECTOR)
		if (!item || !menu.contains(item)) return
		setActive(item)
	}

	// Note: there's intentionally NO click handler here. `createMenu`
	// (which `dropdown` wraps) already binds `click` on the toggle to
	// `dropdown.toggle()`. Adding our own click listener fired the
	// toggle twice — open then immediately close — so the dropdown
	// looked like it never opened. Combobox input focus lives in the
	// `open` callback above.

	const onKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		const key = event.key
		if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
			event.preventDefault()
			if (!visible.value) {
				dropdown.show()
				return
			}
			const list = visibleItems()
			if (list.length === 0) return
			const cur = list.findIndex((el) => el.id === activeId())
			setActive(list[rove(list, key, cur)] ?? null)
			return
		}
		if (key === 'Enter') {
			if (!visible.value) {
				dropdown.show()
				event.preventDefault()
				return
			}
			const id = activeId()
			const item = id ? document.getElementById(id) : null
			if (item instanceof HTMLElement) {
				const v = item.getAttribute(SELECT_VALUE_ATTR)
				if (v !== null) {
					event.preventDefault()
					select(v)
				}
			}
		}
	}

	const onInput = (event: Event): void => {
		if (!(event.target instanceof HTMLInputElement)) return
		query.value = event.target.value
		filter(query.value)
		if (autocomplete) {
			values.value = query.value === '' ? [] : [query.value]
			value.value = values.value[0] ?? null
			writeNative()
			emit(toggleEl, SELECT_EVENTS.select, {
				value: value.value,
				values: values.value,
			})
		}
		emit(toggleEl, SELECT_EVENTS.input, { query: query.value })
		const hasMatches = visibleItems().length > 0
		if (autocomplete && !hasMatches) {
			if (visible.value) dropdown.hide()
		} else if (!visible.value) {
			dropdown.show()
		}
	}

	const onInputFocus = (): void => {
		if (!visible.value) dropdown.show()
	}

	// === Setup
	const offBound = bindEventMap(toggleEl, SELECT_EVENTS, options.on)
	const sameTrigger = input === toggleEl
	// Only the keyboard handler binds here — the click is owned by
	// `createMenu` further down the chain (see comment near
	// `onToggleClick` for the full reasoning).
	const offToggle = sameTrigger
		? () => {}
		: attachListeners(toggleEl, [{ name: 'keydown', handler: onKeydown }])
	const offMenu = attachListeners(menu, [
		{ name: 'click', handler: onMenuClick },
		{ name: 'mouseover', handler: onMenuMouseOver },
	])
	const offInput = input
		? attachListeners(input, [
				{ name: 'input', handler: onInput },
				{ name: 'keydown', handler: onKeydown },
				...(autocomplete ? [{ name: 'focus', handler: onInputFocus }] : []),
			])
		: () => {}

	if (autocomplete && input) {
		const seed = options.value === undefined ? input.value : (value.value ?? '')
		input.value = seed
		query.value = seed
		values.value = seed === '' ? [] : [seed]
		value.value = values.value[0] ?? null
	}

	ensureIds()
	writeSelectionAttrs()
	writeNative()

	let destroyed = false
	const destroy = (): void => {
		if (destroyed) return
		destroyed = true
		offBound()
		offToggle()
		offMenu()
		offInput()
		dropdown.destroy()
		controlEl.removeAttribute('aria-controls')
		controlEl.removeAttribute('aria-haspopup')
		controlEl.removeAttribute('aria-expanded')
		controlEl.removeAttribute('aria-activedescendant')
		if (input) {
			controlEl.removeAttribute('role')
			controlEl.removeAttribute('aria-autocomplete')
		}
		menu.removeAttribute('role')
		menu.removeAttribute('aria-multiselectable')
		for (const el of items()) {
			el.removeAttribute('aria-selected')
			el.removeAttribute(SELECT_HIDDEN_ATTR)
			el.classList.remove('active')
		}
		scope.stop()
	}

	return {
		visible: readonly(visible),
		value: readonly(value),
		values: readonly(values),
		query: readonly(query),
		show,
		hide,
		toggle,
		select,
		clear,
		update,
		destroy,
	}
}

/** Coerce the `value` option into the internal `readonly string[]` form. */
function normalize(input: string | readonly string[] | undefined): readonly string[] {
	if (input === undefined) return []
	if (typeof input === 'string') return input === '' ? [] : [input]
	return [...input]
}
