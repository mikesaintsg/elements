import type { CreateAlertInstance, CreateAlertOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { ALERT_EVENTS } from '../constants.js'
import { attachListeners, bindEventMap, dispatch, emit, runTransition } from '../helpers.js'

/** Selector for the dismiss control inside an alert. Authors mark a
 *  child element with this attribute (typically a `<button>`); a click on
 *  any descendant triggers `hide()`. Replaces Bootstrap's `.btn-close`. */
const ALERT_DISMISS_SELECTOR = '[data-alert-dismiss]'

/**
 * Framework-agnostic dismissible alert factory. Owns the visible-state
 * pipeline (`[data-alert-open]` attribute mirror, `aria-hidden`,
 * cancellable `elements:alert:show / hide` events, post-transition
 * `open` / `close` notifications) and a click handler that watches for
 * descendant `[data-alert-dismiss]` triggers.
 *
 * Element gating: the host must carry an alert role. We accept either a
 * native `[role="alert"]` element (any tag) or `<aside role="alert">`.
 * The factory does not impose a tag because the alert role is the
 * semantic contract, not the wrapper element.
 */
export function createAlert(
	element: HTMLElement,
	options: CreateAlertOptions = {},
): CreateAlertInstance {
	const role = element.getAttribute('role')
	if (role !== 'alert' && role !== 'status') {
		// We don't throw because some authors set `role` after instantiation
		// (frameworks that bind on mount). But we do nudge: assign 'alert'
		// when the role is missing entirely.
		if (!role) element.setAttribute('role', 'alert')
	}

	const scope = effectScope()
	const visible = scope.run(() => ref(element.hasAttribute('data-alert-open')))
	if (!visible) throw new Error('createAlert: failed to initialize reactive scope')

	if (visible.value) element.removeAttribute('aria-hidden')
	else element.setAttribute('aria-hidden', 'true')

	let transition: (() => void) | null = null
	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}

	const show = (): void => {
		if (visible.value) return
		if (!dispatch(element, ALERT_EVENTS.show)) return
		element.removeAttribute('aria-hidden')
		element.setAttribute('data-alert-open', '')
		visible.value = true
		void element.offsetHeight
		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, ALERT_EVENTS.open)
		})
	}

	const hide = (): void => {
		if (!visible.value) return
		if (!dispatch(element, ALERT_EVENTS.hide)) return
		element.removeAttribute('data-alert-open')
		visible.value = false
		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			element.setAttribute('aria-hidden', 'true')
			emit(element, ALERT_EVENTS.close)
		})
	}

	const toggle = (): void => (visible.value ? hide() : show())

	const onClick = (event: Event): void => {
		const target = event.target instanceof Element ? event.target : null
		if (!target?.closest(ALERT_DISMISS_SELECTOR)) return
		hide()
	}

	const offBound = bindEventMap(element, ALERT_EVENTS, options.on)
	const offClick = attachListeners(element, [{ name: 'click', handler: onClick }])

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offClick()
			scope.stop()
		}
		cancelTransition()
		element.removeAttribute('data-alert-open')
		element.setAttribute('aria-hidden', 'true')
	}

	return {
		visible: readonly(visible),
		show,
		hide,
		toggle,
		destroy,
	}
}
