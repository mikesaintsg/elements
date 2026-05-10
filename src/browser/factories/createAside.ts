import type { CreateAsideInstance, CreateAsideOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { ASIDE_EVENTS } from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	lockBodyScroll,
	runTransition,
	unlockBodyScroll,
} from '../helpers.js'

/**
 * Framework-agnostic `<aside>` slide-in drawer factory. Uses the native
 * popover API (`popover="manual"`) so the panel renders in the top layer
 * and gets the native `::backdrop` pseudo-element for scrim styling. The
 * factory owns:
 *
 *   - cancellable `elements:aside:show / hide` pipeline,
 *   - body scroll lock while open,
 *   - Escape dismiss (popover="manual" opts out of native light-dismiss,
 *     so we wire it ourselves to honor `dismiss.escape`),
 *   - backdrop-click dismiss with `'static'` mode that fires `prevent`,
 *   - `[data-aside-open]` attribute mirror for CSS slide-in transitions.
 *
 * Semantic gating: throws if the host is not `<aside>`.
 */
export function createAside(
	element: HTMLElement,
	options: CreateAsideOptions = {},
): CreateAsideInstance {
	assertElement(element, 'aside', 'createAside')

	const backdropMode = options.dismiss?.backdrop ?? true
	const escape = options.dismiss?.escape ?? true
	const lock = options.scroll?.lock ?? true

	const scope = effectScope()
	const visible = scope.run(() => ref(false))
	if (!visible) throw new Error('createAside: failed to initialize reactive scope')

	let locked = false
	let transition: (() => void) | null = null

	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}

	// Set up the popover API early so the surface CSS rule
	// (`[popover]:not(output)`) applies. Authors who want a different
	// chrome can override via the aside's own CSS.
	const previousPopover = element.popover
	element.popover = 'manual'

	// A11y wiring uses the `inert` attribute (rather than `aria-hidden`) for
	// the closed state. `aria-hidden` triggers a browser console warning if
	// any descendant retains focus when the attribute is set — focus must
	// not be hidden from assistive tech, and a closing transition can leave
	// a focused button inside the panel for several frames before the
	// popover machinery's automatic blur fires.
	//
	// `inert` is the platform-blessed alternative the W3C points to in the
	// aria-hidden spec note. Setting `inert` on an element:
	//   1. immediately blurs any focused descendant (no warning),
	//   2. removes the subtree from the accessibility tree (same a11y goal
	//      as aria-hidden), and
	//   3. blocks pointer events on the subtree (matches "the panel is
	//      closed" semantics — the user can't interact with controls
	//      inside a hidden drawer).
	//
	// Browser support: Chrome 102+, Firefox 112+, Safari 15.5+ — already a
	// hard prerequisite for the popover API this composable depends on.
	const openAria = (): void => {
		element.removeAttribute('inert')
		element.setAttribute('aria-modal', 'true')
		element.setAttribute('role', 'dialog')
	}
	const closeAria = (): void => {
		element.setAttribute('inert', '')
		element.removeAttribute('aria-modal')
		element.removeAttribute('role')
	}

	const show = (): void => {
		if (visible.value) return
		if (!dispatch(element, ASIDE_EVENTS.show)) return

		visible.value = true
		if (lock) {
			lockBodyScroll()
			locked = true
		}

		openAria()
		element.setAttribute('data-aside-open', '')
		if (!element.matches(':popover-open')) element.showPopover()

		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, ASIDE_EVENTS.open)
		})
	}

	const hide = (): void => {
		if (!visible.value) return
		if (!dispatch(element, ASIDE_EVENTS.hide)) return

		visible.value = false
		// Swap `[data-aside-open]` for `[data-aside-closing]` synchronously so
		// `composables/_aside.scss` keeps the drawer geometry alive (position:
		// fixed, block-size: 100dvh) while flipping the slide transform to its
		// off-screen value — driving a clean slide-out instead of collapsing
		// back to popover-surface defaults (288px tall, position: absolute).
		// The closing attribute is removed in the transition completion below.
		element.removeAttribute('data-aside-open')
		element.setAttribute('data-aside-closing', '')

		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			closeAria()
			if (element.matches(':popover-open')) element.hidePopover()
			element.removeAttribute('data-aside-closing')
			if (locked) {
				unlockBodyScroll()
				locked = false
			}
			emit(element, ASIDE_EVENTS.close)
		})
	}

	const toggle = (): void => (visible.value ? hide() : show())

	const onKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		if (!visible.value || event.key !== 'Escape') return
		if (escape) hide()
		else if (backdropMode === 'static') emit(element, ASIDE_EVENTS.prevent)
	}

	// Backdrop-click: a click whose target is the aside itself (not a
	// descendant) means the user clicked the ::backdrop pseudo.
	const onClick = (event: Event): void => {
		if (!visible.value || event.target !== element) return
		if (backdropMode === true) hide()
		else if (backdropMode === 'static') emit(element, ASIDE_EVENTS.prevent)
	}

	closeAria()

	const offBound = bindEventMap(element, ASIDE_EVENTS, options.on)
	const offDoc = attachListeners(document, [{ name: 'keydown', handler: onKeydown }])
	const offClick = attachListeners(element, [{ name: 'click', handler: onClick }])

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offDoc()
			offClick()
			scope.stop()
		}
		cancelTransition()
		if (locked) {
			unlockBodyScroll()
			locked = false
		}
		if (element.matches(':popover-open')) element.hidePopover()
		element.removeAttribute('data-aside-open')
		element.removeAttribute('data-aside-closing')
		closeAria()
		element.popover = previousPopover
		visible.value = false
	}

	return {
		visible: readonly(visible),
		show,
		hide,
		toggle,
		destroy,
	}
}
