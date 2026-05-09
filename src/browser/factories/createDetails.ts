import type { CreateDetailsInstance, CreateDetailsOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DETAILS_EVENTS } from '../constants.js'
import { assertElement, attachListeners, bindEventMap, dispatch, emit } from '../helpers.js'

/**
 * Framework-agnostic native `<details>` factory. Owns the cancellable
 * `elements:details:show / hide` lifecycle and accordion sibling
 * coordination, while delegating actual open / close to the platform's
 * `[open]` attribute and `toggle` event.
 *
 * Animation contract:
 *   The factory does not run a JS height-transition. Authors enable
 *   smooth open / close via CSS (`interpolate-size: allow-keywords` plus
 *   `transition: height` on `details::details-content`, or a `grid-rows`
 *   trick on the inner content slot). This keeps the factory thin and
 *   the framework's "build on the platform" stance honest.
 *
 * Accordion: when `accordion` is supplied, opening one details panel
 * dispatches `elements:details:deactivate` on its visible siblings so
 * each closes itself — no shared registry, pure DOM event delegation.
 *
 * Semantic gating: throws if the host is not `<details>`.
 */
export function createDetails(
	element: HTMLDetailsElement,
	options: CreateDetailsOptions = {},
): CreateDetailsInstance {
	assertElement<HTMLDetailsElement>(element, 'details', 'createDetails')

	const { initial, accordion } = options

	const scope = effectScope()
	const visible = scope.run(() => ref(element.open))
	if (!visible) throw new Error('createDetails: failed to initialize reactive scope')

	const closeSiblings = (): void => {
		if (!accordion) return
		for (const sibling of accordion.querySelectorAll<HTMLDetailsElement>('details[open]')) {
			if (sibling !== element) emit(sibling, DETAILS_EVENTS.deactivate)
		}
	}

	// ── Native bridge ───────────────────────────────────────────────────────
	// `toggle` is async (queued as a microtask after `[open]` mutates), so
	// our `show()` / `hide()` does the synchronous reactive-state update
	// and event emission. The native `toggle` listener is a backstop for
	// *external* mutations (a third-party `<summary>` click, a script
	// flipping `details.open` directly, etc.) — when those drift our
	// state out of sync, we resync without re-firing.
	const onNativeToggle = (): void => {
		if (visible.value === element.open) return
		visible.value = element.open
		if (element.open) {
			closeSiblings()
			emit(element, DETAILS_EVENTS.open)
		} else {
			emit(element, DETAILS_EVENTS.close)
		}
	}

	const show = (): void => {
		if (visible.value) return
		if (!dispatch(element, DETAILS_EVENTS.show)) return
		element.open = true
		visible.value = true
		closeSiblings()
		emit(element, DETAILS_EVENTS.open)
	}

	const hide = (): void => {
		if (!visible.value) return
		if (!dispatch(element, DETAILS_EVENTS.hide)) return
		element.open = false
		visible.value = false
		emit(element, DETAILS_EVENTS.close)
	}

	const toggle = (): void => (visible.value ? hide() : show())

	const offBound = bindEventMap(element, DETAILS_EVENTS, options.on)
	const offNative = attachListeners(element, [{ name: 'toggle', handler: onNativeToggle }])
	const offDeactivate = attachListeners(element, [
		{ name: DETAILS_EVENTS.deactivate, handler: () => hide() },
	])

	if (initial && !visible.value) {
		void Promise.resolve().then(show)
	}

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offNative()
			offDeactivate()
			scope.stop()
		}
		// Don't force-close: let the consumer keep the disclosure state.
		// `destroy()` reverses listeners only.
	}

	return {
		visible: readonly(visible),
		show,
		hide,
		toggle,
		destroy,
	}
}
