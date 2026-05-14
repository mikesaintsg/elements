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

	// ── Native bridges ──────────────────────────────────────────────────────
	//
	// Two native event paths the factory bridges:
	//
	//   1. `<summary>` click — the user-driven open / close path. Per the
	//      HTML activation-behavior spec, calling `preventDefault()` on
	//      the click event aborts the details `[open]` toggle. The
	//      factory dispatches the cancellable `elements:details:show` or
	//      `elements:details:hide` synchronously on the click; if a
	//      consumer's handler calls `event.preventDefault()`, we
	//      `preventDefault()` on the native click and the platform skips
	//      the toggle. This makes the cancellable lifecycle work for
	//      ALL flip paths — programmatic `show()` / `hide()` AND native
	//      summary clicks.
	//
	//      Why click and not `beforetoggle`: `beforetoggle` for
	//      `<details>` is a recent addition (Chromium added the event
	//      later than the popover variant) and isn't reliably fired
	//      across the supported browser matrix. The summary-click
	//      activation-behavior path has been stable since the original
	//      `<details>` shipped in 2020.
	//
	//   2. `toggle` — post-flip, NOT cancellable. Async (queued as a
	//      microtask after `[open]` mutates). The factory bridges it
	//      into `elements:details:open` / `close` and re-syncs `visible`
	//      so EXTERNAL mutations (`details.open = …` from outside the
	//      composable, third-party scripts) update the reactive state.
	//      The summary-click path is already handled synchronously by
	//      `show()` / `hide()` (called from the click bridge), so the
	//      guard `visible.value === element.open` prevents double-emit
	//      when toggle catches up.
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

	// Summary-click bridge — intercepts the user-driven flip before the
	// platform toggles `[open]`, so the cancellable lifecycle veto
	// works for native clicks too. Walks up from the click target to
	// find the nearest `<summary>` (handles clicks on summary children
	// like icons or text spans), and verifies the summary belongs to
	// THIS details (not a nested one).
	const onSummaryClick = (event: Event): void => {
		if (!(event.target instanceof Element)) return
		const summary = event.target.closest('summary')
		if (!summary || summary.parentElement !== element) return
		const willOpen = !element.open
		const ok = dispatch(element, willOpen ? DETAILS_EVENTS.show : DETAILS_EVENTS.hide)
		if (!ok) {
			event.preventDefault()
			return
		}
		// Mirror what show()/hide() would do, since the platform's flip
		// will fire `toggle` post-hoc and our `onNativeToggle` guard
		// (`visible.value === element.open`) suppresses double-emit.
		if (willOpen) closeSiblings()
	}

	const offBound = bindEventMap(element, DETAILS_EVENTS, options.on)
	const offNative = attachListeners(element, [
		{ name: 'click', handler: onSummaryClick },
		{ name: 'toggle', handler: onNativeToggle },
	])
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
