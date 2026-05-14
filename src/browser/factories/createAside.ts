import type { CreateAsideInstance, CreateAsideOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { ASIDE_EVENTS } from '../constants.js'
import { assertElement, attachListeners, bindEventMap, emit } from '../helpers.js'

/**
 * Framework-agnostic `<aside>` drawer factory. Thin programmatic shim
 * over the native Popover API — the platform already gives us:
 *
 *   - Top-layer rendering (`[popover]:popover-open { display: flex }`),
 *   - Light-dismiss for `popover="auto"` (outside-click + Escape),
 *   - The native `::backdrop` pseudo (styled in `surfaces/_backdrop.scss`),
 *   - Slide-in / slide-out animation via `:popover-open` +
 *     `@starting-style` + `transition-behavior: allow-discrete` (declared
 *     in `components/_aside.scss`),
 *   - `beforetoggle` / `toggle` lifecycle events.
 *
 * So the factory is now just:
 *
 *   1. Element gating (must be `<aside>`),
 *   2. Sets `popover` to `'auto'` (default) or `'manual'` on attach so
 *      authors who hand-wired `popovertarget` keep working AND
 *      composable-driven asides get a sensible default. Pass `false` to
 *      leave whatever the author already put on the element.
 *   3. Bridges native `beforetoggle` → `elements:aside:show` /
 *      `elements:aside:hide` (informational; not cancellable — the
 *      native event isn't either),
 *   4. Bridges native `toggle` → `elements:aside:open` /
 *      `elements:aside:close`,
 *   5. Programmatic `show()` / `hide()` / `toggle()` map to the native
 *      `showPopover()` / `hidePopover()` / `togglePopover()`,
 *   6. Reactive `visible` mirrors `element.matches(':popover-open')`,
 *      synced on every `toggle` event.
 *
 * Removed (deliberately, see commit history):
 *
 *   - `[data-aside-open]` / `[data-aside-closing]` attribute writes —
 *     the CSS doesn't key on them; the slide is driven entirely by
 *     `:popover-open` + `@starting-style` + `allow-discrete`.
 *   - `runTransition` wait before `hidePopover()` — caused a ~400 ms
 *     dead wait on close (the transition we were waiting for hadn't
 *     started yet because `hidePopover()` is what triggers it).
 *   - `aria-modal` / `role="dialog"` / `inert` auto-wiring — the static
 *     element chrome handles a11y; consumers who need modal semantics
 *     wire those directly on the markup.
 *   - Body scroll lock — the popover is already top-layer; consumers
 *     who want the body locked too compose `useAside` with
 *     `lockBodyScroll()` themselves (or use `<dialog>`).
 *   - Custom Escape + backdrop-click dismiss — `popover="auto"` is the
 *     contract for light-dismiss; `popover="manual"` is the contract
 *     for sticky panels. The factory doesn't reimplement either.
 *
 * Semantic gating: throws if the host is not `<aside>`.
 */
export function createAside(
	element: HTMLElement,
	options: CreateAsideOptions = {},
): CreateAsideInstance {
	assertElement(element, 'aside', 'createAside')

	const scope = effectScope()
	const visible = scope.run(() => ref(false))
	if (!visible) throw new Error('createAside: failed to initialize reactive scope')

	const previousPopover = element.popover
	if (options.popover !== false) {
		element.popover = options.popover ?? 'auto'
	}

	const isOpen = (): boolean => element.matches(':popover-open')
	visible.value = isOpen()

	// Counters track pending native events we want to suppress because
	// we've already emitted the namespaced equivalents synchronously
	// from show() / hide(). External state changes (Escape,
	// outside-click, an inner popovertargetaction button) leave the
	// counters at 0 and the bridge fires normally.
	let suppressBeforeToggle = 0
	let suppressToggle = 0

	const onBeforeToggle = (event: Event): void => {
		if (!('newState' in event)) return
		if (suppressBeforeToggle > 0) {
			suppressBeforeToggle--
			return
		}
		const newState = (event as ToggleEvent).newState
		visible.value = newState === 'open'
		emit(element, newState === 'open' ? ASIDE_EVENTS.show : ASIDE_EVENTS.hide)
	}

	const onToggle = (event: Event): void => {
		if (!('newState' in event)) return
		if (suppressToggle > 0) {
			suppressToggle--
			return
		}
		const newState = (event as ToggleEvent).newState
		visible.value = newState === 'open'
		emit(element, newState === 'open' ? ASIDE_EVENTS.open : ASIDE_EVENTS.close)
	}

	const offBound = bindEventMap(element, ASIDE_EVENTS, options.on)
	const offNative = attachListeners(element, [
		{ name: 'beforetoggle', handler: onBeforeToggle },
		{ name: 'toggle', handler: onToggle },
	])

	const show = (): void => {
		if (isOpen()) return
		suppressBeforeToggle++
		suppressToggle++
		element.showPopover()
		visible.value = true
		emit(element, ASIDE_EVENTS.show)
		emit(element, ASIDE_EVENTS.open)
	}
	const hide = (): void => {
		if (!isOpen()) return
		suppressBeforeToggle++
		suppressToggle++
		element.hidePopover()
		visible.value = false
		emit(element, ASIDE_EVENTS.hide)
		emit(element, ASIDE_EVENTS.close)
	}
	const toggle = (): void => {
		if (isOpen()) hide()
		else show()
	}

	let destroyed = false
	const destroy = (): void => {
		if (destroyed) return
		destroyed = true
		offBound()
		offNative()
		scope.stop()
		if (isOpen()) element.hidePopover()
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
