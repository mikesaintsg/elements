import type {
	CreateMenuElements,
	CreateMenuInstance,
	CreateMenuOptions,
	CreatePopoverInstance,
	Placement,
} from '../types.js'
import {
	DEFAULT_MENU_FLIP,
	DEFAULT_MENU_OFFSET,
	MENU_EVENTS,
	MENU_ITEM_SELECTOR,
} from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	focusableItems,
	rove,
} from '../helpers.js'
import { createPopover } from './createPopover.js'

/**
 * Framework-agnostic dropdown / nav menu factory. Composes `createPopover`
 * for native top-layer visibility and adds menu semantics:
 *
 *   - `aria-expanded` mirror on the toggle.
 *   - Item-click dismiss (every element matching `MENU_ITEM_SELECTOR`).
 *   - Arrow-key roving focus + Home / End navigation.
 *   - `flip` threshold forwarded to CSS as `--set-menu-flip` so the
 *     surface-layer `max-block-size: calc(...)` rule lets the browser
 *     resolve the side during layout.
 *
 * Element gating: the panel MUST be `<menu>` (`HTMLMenuElement`). Authors
 * who want a `<ul>` panel should use `createPopover` directly with their
 * own item-keyboard logic — `createMenu` reserves the semantic `<menu>`
 * tag for the dropdown / context-menu pattern.
 *
 * @see src/browser/factories/createPopover.ts
 */
export function createMenu(
	elements: CreateMenuElements,
	options: CreateMenuOptions = {},
): CreateMenuInstance {
	const { toggle: toggleEl, menu } = elements
	assertElement<HTMLMenuElement>(menu, 'menu', 'createMenu')

	const dismissOutside = options.dismiss?.outside ?? true
	const dismissEscape = options.dismiss?.escape ?? true
	const dismissInside = options.dismiss?.inside ?? true
	const strategy = options.strategy ?? 'absolute'
	const offset = options.offset ?? DEFAULT_MENU_OFFSET
	const flipThreshold = Math.max(0, options.flip ?? DEFAULT_MENU_FLIP)

	// Forward `flip` to CSS via `--set-menu-flip`. The surface-layer rule
	// caps the menu's `max-block-size` to N rows so the browser's
	// `position-try-fallbacks` flips when the requested side has no room.
	// `flip: 0` opts out — drops the cap and the block-axis fallback.
	const previousFlip = menu.style.getPropertyValue('--set-menu-flip')
	const previousMaxBlock = menu.style.maxBlockSize
	const previousFallbacks = menu.style.positionTryFallbacks
	if (flipThreshold === 0) {
		menu.style.maxBlockSize = 'none'
		menu.style.positionTryFallbacks = 'flip-inline'
	} else {
		menu.style.setProperty('--set-menu-flip', String(flipThreshold))
	}

	const popover: CreatePopoverInstance = createPopover(
		{ anchor: toggleEl, panel: menu },
		{
			placement: options.placement ?? 'bottom-start',
			strategy,
			offset,
			trigger: {},
			dismiss: { outside: dismissOutside, escape: dismissEscape },
			on: {
				show: (event: CustomEvent) => {
					if (!dispatch(toggleEl, MENU_EVENTS.show)) {
						event.preventDefault()
						return
					}
					// ARIA mirror happens synchronously alongside the popover
					// pipeline so screen readers announce the open state
					// before the transition completes.
					toggleEl.setAttribute('aria-expanded', 'true')
				},
				open: () => emit(toggleEl, MENU_EVENTS.open),
				hide: (event: CustomEvent) => {
					if (!dispatch(toggleEl, MENU_EVENTS.hide)) {
						event.preventDefault()
						return
					}
					// Same — flip ARIA synchronously so the closed state is
					// announced even if the post-transition `close` callback
					// is still pending.
					toggleEl.setAttribute('aria-expanded', 'false')
				},
				close: () => emit(toggleEl, MENU_EVENTS.close),
			},
		},
	)

	const onClickToggle = (event: Event): void => {
		event.preventDefault()
		popover.toggle()
	}

	const onMenuClick = (event: Event): void => {
		if (!popover.visible.value) return
		if (!dismissInside) return
		if (!(event.target instanceof HTMLElement)) return
		if (event.target.closest(MENU_ITEM_SELECTOR)) popover.hide()
	}

	const onKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			const onToggle = event.target === toggleEl
			const et = event.target instanceof Node ? event.target : null
			const onMenu = menu.contains(et)
			if (!onToggle && !onMenu) return
			event.preventDefault()
			if (!popover.visible.value) popover.show()
			const items = focusableItems(menu, MENU_ITEM_SELECTOR)
			if (items.length === 0) return
			const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
			const cur = focused ? items.indexOf(focused) : -1
			items[rove(items, event.key, cur)]?.focus()
			return
		}
		if (event.key === 'Home' || event.key === 'End') {
			if (!popover.visible.value) return
			const items = focusableItems(menu, MENU_ITEM_SELECTOR)
			if (items.length === 0) return
			event.preventDefault()
			items[rove(items, event.key, -1)]?.focus()
		}
	}

	toggleEl.setAttribute('aria-expanded', 'false')
	toggleEl.setAttribute('aria-haspopup', 'menu')

	const offBound = bindEventMap(toggleEl, MENU_EVENTS, options.on)
	const offToggle = attachListeners(toggleEl, [
		{ name: 'click', handler: onClickToggle },
		{ name: 'keydown', handler: onKeydown },
	])
	const offMenu = attachListeners(menu, [
		{ name: 'click', handler: onMenuClick },
		{ name: 'keydown', handler: onKeydown },
	])

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offToggle()
			offMenu()
			popover.destroy()
			if (previousFlip) menu.style.setProperty('--set-menu-flip', previousFlip)
			else menu.style.removeProperty('--set-menu-flip')
			menu.style.maxBlockSize = previousMaxBlock
			menu.style.positionTryFallbacks = previousFallbacks
		}
		toggleEl.removeAttribute('aria-expanded')
		toggleEl.removeAttribute('aria-haspopup')
	}

	const update = (next?: { readonly placement?: Placement }): void => {
		popover.update(next ? { placement: next.placement } : undefined)
	}

	return {
		visible: popover.visible,
		show: () => popover.show(),
		hide: () => popover.hide(),
		toggle: () => popover.toggle(),
		update,
		destroy,
	}
}
