import type { CreateTabsElements, CreateTabsInstance, CreateTabsOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { TAB_TRIGGER_SELECTOR, TABS_EVENTS } from '../constants.js'
import { bindEventMap, dispatch, emit, generateId, listen, runTransition } from '../helpers.js'

/**
 * Framework-agnostic tabs factory (renamed from `createTab`). Wires ONE
 * trigger to ONE pane within a `[role="tablist"]` group; sibling triggers
 * are coordinated via per-element DOM events (no shared registry).
 *
 * Source of truth for "which sibling is active" is the `[aria-selected]`
 * attribute. Each trigger carries `aria-controls="<paneId>"` so the
 * factory can locate the sibling pane it must close before activating its
 * own.
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

	const transitions = new Set<() => void>()

	const transition = (el: HTMLElement, done: () => void): void => {
		const cancel = runTransition(el, () => {
			transitions.delete(cancel)
			done()
		})
		transitions.add(cancel)
	}

	const cancelTransitions = (): void => {
		for (const cancel of [...transitions]) cancel()
		transitions.clear()
	}

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

	const hasTransition = (el: HTMLElement): boolean => {
		if (typeof getComputedStyle === 'undefined') return false
		const raw = getComputedStyle(el).transitionDuration
		return !!raw && raw.split(',').some((v) => parseFloat(v.trim()) > 0)
	}

	const activatePane = (el: HTMLElement, onDone: () => void): void => {
		el.setAttribute('data-tab-open', '')
		el.removeAttribute('aria-hidden')
		if (hasTransition(el)) {
			void el.offsetWidth
			transition(el, onDone)
		} else {
			onDone()
		}
	}

	const deactivatePane = (el: HTMLElement, onDone: () => void): void => {
		if (hasTransition(el)) {
			el.removeAttribute('data-tab-open')
			transition(el, () => {
				el.setAttribute('aria-hidden', 'true')
				onDone()
			})
		} else {
			el.removeAttribute('data-tab-open')
			el.setAttribute('aria-hidden', 'true')
			onDone()
		}
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

		// Swap trigger states synchronously — before any pane animation.
		if (prevTrigger && prevTrigger !== triggerEl) {
			prevTrigger.setAttribute('aria-selected', 'false')
			prevTrigger.setAttribute('tabindex', '-1')
			emit(prevTrigger, TABS_EVENTS.deactivate)
		}

		triggerEl.setAttribute('aria-selected', 'true')
		triggerEl.removeAttribute('tabindex')
		active.value = true

		if (prevPane && prevPane !== pane) {
			deactivatePane(prevPane, () => {
				if (prevTrigger) emit(prevTrigger, TABS_EVENTS.close)
				activatePane(pane, () => emit(triggerEl, TABS_EVENTS.open))
			})
		} else {
			activatePane(pane, () => emit(triggerEl, TABS_EVENTS.open))
		}
	}

	const hide = (): void => {
		if (!active.value) return
		if (!dispatch(triggerEl, TABS_EVENTS.hide)) return

		triggerEl.setAttribute('aria-selected', 'false')
		triggerEl.setAttribute('tabindex', '-1')
		active.value = false

		deactivatePane(pane, () => emit(triggerEl, TABS_EVENTS.close))
	}

	const toggle = (): void => (active.value ? hide() : show())

	const onClick = (event: MouseEvent): void => {
		event.preventDefault()
		show()
	}

	if (active.value) {
		triggerEl.setAttribute('aria-selected', 'true')
		triggerEl.removeAttribute('tabindex')
		paintIndicator()
		pane.setAttribute('data-tab-open', '')
		pane.removeAttribute('aria-hidden')
	} else {
		triggerEl.setAttribute('aria-selected', 'false')
		triggerEl.setAttribute('tabindex', '-1')
		pane.setAttribute('aria-hidden', 'true')
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
			cancelTransitions()
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
