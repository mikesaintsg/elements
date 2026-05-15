import type { CreateTabsElements, CreateTabsInstance, CreateTabsOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { TAB_TRIGGER_SELECTOR, TABS_EVENTS } from '../constants.js'
import { bindEventMap, dispatch, emit, generateId, listen } from '../helpers.js'

/**
 * Framework-agnostic tabs factory. Wires ONE trigger to ONE pane within a
 * `[role="tablist"]` group; sibling triggers coordinate via per-element
 * DOM events (no shared registry).
 *
 * Source of truth for "which sibling is active" is the `[aria-selected]`
 * attribute on the trigger. Each trigger carries `aria-controls="<paneId>"`
 * so the factory can locate the sibling pane it must hide before
 * activating its own.
 *
 * Visibility contract: the inactive pane is hidden via the HTML
 * **`[hidden]`** attribute (NOT `[aria-hidden]`). The `[hidden]` attribute
 * removes the pane from the layout (`display: none`) AND the
 * accessibility tree — one declaration, both effects, matching the
 * `[role='tabpanel'][hidden] { display: none }` rule in
 * `components/_nav.scss`. Consumers who want an animated pane transition
 * layer their own `[role='tabpanel']` keyframes on top; the factory
 * doesn't await any JS-driven transition (the previous version waited
 * for a CSS `transitionend` that the framework's tab chrome doesn't
 * declare — a 400 ms `TRANSITION_FALLBACK_MS` of dead wait on every
 * switch).
 *
 * Element gating: the trigger should be a `<button>` (or any
 * `[role="tab"]` element); the pane should be `[role="tabpanel"]`. The
 * group must carry `[role="tablist"]`. The factory adds these roles when
 * absent.
 */
export function createTabs(
	elements: CreateTabsElements,
	options: CreateTabsOptions = {},
): CreateTabsInstance {
	const { trigger: triggerEl, pane, group } = elements

	if (!group.hasAttribute('role')) group.setAttribute('role', 'tablist')
	if (!triggerEl.hasAttribute('role')) triggerEl.setAttribute('role', 'tab')
	if (!pane.hasAttribute('role')) pane.setAttribute('role', 'tabpanel')

	const scope = effectScope()
	// Initial active state: `options.initial` wins (lets framework adapters
	// pass a flag instead of pre-authoring ARIA), otherwise read the
	// trigger's existing `aria-selected="true"`.
	const initialActive =
		options.initial === true || triggerEl.getAttribute('aria-selected') === 'true'
	const active = scope.run(() => ref(initialActive))
	if (!active) throw new Error('createTabs: failed to initialize reactive scope')

	// Paint sliding-indicator CSS variables on the group. Authors hook
	// `--set-tabs-indicator-{x,y,width,height}` from their tablist CSS to
	// position an active-tab marker.
	const paintIndicator = (): void => {
		const groupRect = group.getBoundingClientRect()
		const triggerRect = triggerEl.getBoundingClientRect()
		const x = triggerRect.left - groupRect.left
		const y = triggerRect.top - groupRect.top
		group.style.setProperty('--set-tabs-indicator-x', `${x}px`)
		group.style.setProperty('--set-tabs-indicator-y', `${y}px`)
		group.style.setProperty('--set-tabs-indicator-width', `${triggerRect.width}px`)
		group.style.setProperty('--set-tabs-indicator-height', `${triggerRect.height}px`)
	}

	const findActiveSibling = (): { trigger: HTMLElement | null; pane: HTMLElement | null } => {
		const triggers = group.querySelectorAll<HTMLElement>(TAB_TRIGGER_SELECTOR)
		for (const t of triggers) {
			if (t === triggerEl) continue
			if (t.getAttribute('aria-selected') !== 'true') continue
			const id = t.getAttribute('aria-controls')
			const paneEl = id ? document.getElementById(id) : null
			return { trigger: t, pane: paneEl }
		}
		return { trigger: null, pane: null }
	}

	const show = (): void => {
		if (active.value || triggerEl.hasAttribute('disabled')) return
		if (!dispatch(triggerEl, TABS_EVENTS.show)) return

		paintIndicator()

		const { trigger: prevTrigger, pane: prevPane } = findActiveSibling()

		// Swap trigger states synchronously.
		if (prevTrigger && prevTrigger !== triggerEl) {
			prevTrigger.setAttribute('aria-selected', 'false')
			prevTrigger.setAttribute('tabindex', '-1')
			emit(prevTrigger, TABS_EVENTS.deactivate)
		}

		triggerEl.setAttribute('aria-selected', 'true')
		triggerEl.removeAttribute('tabindex')
		active.value = true

		// Hide the previous pane via [hidden] (display: none + removed from a11y tree).
		if (prevPane && prevPane !== pane) {
			prevPane.setAttribute('hidden', '')
			if (prevTrigger) emit(prevTrigger, TABS_EVENTS.close)
		}

		// Reveal this pane.
		pane.removeAttribute('hidden')
		emit(triggerEl, TABS_EVENTS.open)
	}

	const hide = (): void => {
		if (!active.value) return
		if (!dispatch(triggerEl, TABS_EVENTS.hide)) return

		triggerEl.setAttribute('aria-selected', 'false')
		triggerEl.setAttribute('tabindex', '-1')
		active.value = false

		pane.setAttribute('hidden', '')
		emit(triggerEl, TABS_EVENTS.close)
	}

	const toggle = (): void => (active.value ? hide() : show())

	const onClick = (event: MouseEvent): void => {
		event.preventDefault()
		show()
	}

	// Initial state hydration: paint ARIA + `[hidden]` based on
	// `initialActive` so the factory's contract is consistent regardless
	// of what the markup pre-declares.
	if (active.value) {
		triggerEl.setAttribute('aria-selected', 'true')
		triggerEl.removeAttribute('tabindex')
		paintIndicator()
		pane.removeAttribute('hidden')
	} else {
		triggerEl.setAttribute('aria-selected', 'false')
		triggerEl.setAttribute('tabindex', '-1')
		pane.setAttribute('hidden', '')
	}
	if (!triggerEl.hasAttribute('aria-controls')) {
		if (!pane.id) pane.id = generateId('tab-pane')
		triggerEl.setAttribute('aria-controls', pane.id)
	}

	const offBound = bindEventMap(triggerEl, TABS_EVENTS, options.on)
	const offDeactivate = listen(triggerEl, TABS_EVENTS.deactivate, () => {
		if (active.value) active.value = false
	})
	triggerEl.addEventListener('click', onClick)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offDeactivate()
			triggerEl.removeEventListener('click', onClick)
			scope.stop()
		}
	}

	return {
		active: readonly(active),
		show,
		hide,
		toggle,
		destroy,
	}
}
