import type {
	CreatePopoverElements,
	CreatePopoverInstance,
	CreatePopoverOptions,
	Placement,
} from '../types.js'
import { computed, effectScope, readonly, ref } from '@vue/reactivity'
import { DEFAULT_FLOATING_OFFSET, POPOVER_EVENTS, POPOVER_TOUCH_GUARD_MS } from '../constants.js'
import {
	areaForPopoverPlacement,
	bindEventMap,
	dispatch,
	emit,
	generateId,
	resolvePopoverSide,
	runTransition,
	selfsForPopoverPlacement,
	sideOf,
} from '../helpers.js'

/**
 * Framework-agnostic native popover factory. Owns the lifecycle pipeline
 * (show/open/hide/close), trigger wiring, and dismiss handling, while
 * delegating top-layer visibility to the browser's popover API and
 * placement to the surface layer's CSS Anchor Positioning recipe.
 *
 * Element-IS-component coupling:
 *   - The panel is set to `popover="manual"` (the surface CSS scope is
 *     `[popover]:not(output)` so toast `<output popover>` keeps its own
 *     fixed-positioned chrome).
 *   - Placement is propagated via two surfaces:
 *       1. `panel.style.positionArea` — the inline override that wins
 *          over `var(--set-anchor-position-area)` in the surface rule.
 *          The browser's `position-try-fallbacks` flips it when needed.
 *       2. `panel.dataset.popoverSide` — read by author CSS for
 *          chrome that has to follow the *resolved* side (arrow
 *          rotation, callout edge gradient).
 *   - Anchor binding via `anchor-name` / `position-anchor` so the
 *     surface CSS can read the anchor's edges via `anchor()` (e.g. menu
 *     `max-block-size` capped to the room available below the toggle).
 *
 * Reactivity is provided by `@vue/reactivity` — the same runtime objects
 * Vue itself uses, so the returned refs are natively readable inside a Vue
 * template or `watchEffect`. Caller-owned reactive options (e.g. a Vue
 * `Ref<Placement>`) are observed by the calling adapter and pushed in via
 * `update({ placement })` — the factory never imports `'vue'`.
 *
 * `destroy()` removes every listener the factory installed, stops the
 * internal effect scope, and cleans up native popover state. The returned
 * `show` / `hide` actions remain callable after destroy and continue to
 * mutate DOM state, but auto-triggers and dismiss listeners are gone.
 */
export function createPopover(
	elements: CreatePopoverElements,
	options: CreatePopoverOptions = {},
): CreatePopoverInstance {
	const { anchor, panel } = elements
	const strategy = options.strategy ?? 'absolute'
	const offset = options.offset ?? DEFAULT_FLOATING_OFFSET
	const triggers = options.trigger ?? { click: true }
	const dismissOutside = options.dismiss?.outside ?? true
	const dismissEscape = options.dismiss?.escape ?? true
	const showDelay = options.delay?.show ?? 0
	const hideDelay = options.delay?.hide ?? 0

	let placementOpt: false | Placement = options.placement ?? 'bottom'
	let placed = placementOpt !== false

	const scope = effectScope()
	const refs = scope.run(() => ({
		visible: ref(false),
		placement: ref<Placement>(placed && placementOpt !== false ? placementOpt : 'bottom'),
	}))

	if (!refs) {
		throw new Error('createPopover: failed to initialize reactive scope')
	}

	const visible = refs.visible
	const placement = refs.placement

	let showTimer: ReturnType<typeof setTimeout> | null = null
	let hideTimer: ReturnType<typeof setTimeout> | null = null
	let transition: (() => void) | null = null
	let frame: number | null = null
	let openedAt = 0

	const styles = computed(() => ({ panel: {}, arrow: {} }))

	const clearTimers = (): void => {
		if (showTimer) {
			clearTimeout(showTimer)
			showTimer = null
		}
		if (hideTimer) {
			clearTimeout(hideTimer)
			hideTimer = null
		}
	}

	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}

	const cancelFrame = (): void => {
		if (frame === null) return
		cancelAnimationFrame(frame)
		frame = null
	}

	const applyPlacement = (): void => {
		if (!placed || placementOpt === false) return
		// Inline `position-area` overrides the surface-layer
		// `var(--set-anchor-position-area)` default. The browser's
		// `position-try-fallbacks` (declared on the surface rule) takes it
		// from there and flips when the requested side overflows.
		panel.style.positionArea = areaForPopoverPlacement(placementOpt)
		// `align-self` / `justify-self` paired with `position-area` —
		// the surface default (`align-self: start; justify-self:
		// anchor-center`) is only correct for the `'bottom'` placement;
		// every aligned variant (`bottom-start`, `top-end`, …) must
		// override or the panel inherits inline-axis centering and ends
		// up pinned to the anchor's CENTER instead of its start/end edge.
		// Mirrors mailbox's `$placements` map (`_mixins.scss`).
		const [alignSelf, justifySelf] = selfsForPopoverPlacement(placementOpt)
		panel.style.alignSelf = alignSelf
		panel.style.justifySelf = justifySelf
		panel.dataset.popoverSide = sideOf(placementOpt)
		panel.dataset.popoverStrategy = strategy
		panel.dataset.popoverOffset = String(offset)
	}

	const syncResolvedSide = (): void => {
		if (!placed || !visible.value) return
		const resolved = resolvePopoverSide(anchor, panel)
		panel.dataset.popoverSide = resolved
	}

	const scheduleResolvedSide = (): void => {
		if (typeof window === 'undefined') return
		cancelFrame()
		frame = requestAnimationFrame(() => {
			frame = null
			syncResolvedSide()
		})
	}

	const clearPanel = (): void => {
		delete panel.dataset.popoverSide
		delete panel.dataset.popoverStrategy
		delete panel.dataset.popoverOffset
		panel.style.positionArea = ''
		panel.style.alignSelf = ''
		panel.style.justifySelf = ''
		if (panel.matches(':popover-open')) panel.hidePopover()
	}

	// Detect a CSS transition on the panel. If `transition-duration` is `0s`
	// the open/close events fire synchronously; otherwise we wait for
	// `transitionend` (with a fallback timer inside `runTransition`). This
	// replaces the legacy `.fade` opt-in: any CSS transition the author
	// declares — via a modifier class, an attribute selector, or a custom
	// property — automatically participates.
	const hasTransition = (): boolean => {
		if (typeof getComputedStyle === 'undefined') return false
		const raw = getComputedStyle(panel).transitionDuration
		if (!raw) return false
		// `transition-duration` may be a comma-separated list. Any non-zero
		// value means a transition is declared.
		return raw.split(',').some((v) => parseFloat(v.trim()) > 0)
	}

	const finishOpen = (): void => {
		cancelTransition()
		if (!hasTransition()) {
			emit(anchor, POPOVER_EVENTS.open)
			return
		}
		transition = runTransition(panel, () => {
			transition = null
			emit(anchor, POPOVER_EVENTS.open)
		})
	}

	const finishClose = (): void => {
		cancelTransition()
		if (!hasTransition()) {
			emit(anchor, POPOVER_EVENTS.close)
			return
		}
		transition = runTransition(panel, () => {
			transition = null
			emit(anchor, POPOVER_EVENTS.close)
		})
	}

	const doShow = (): void => {
		if (visible.value) return
		showTimer = null
		if (!dispatch(anchor, POPOVER_EVENTS.show)) return
		visible.value = true
		anchor.setAttribute('aria-expanded', 'true')
		openedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
		update()
		panel.showPopover({ source: anchor })
		scheduleResolvedSide()
		finishOpen()
	}

	const doHide = (): void => {
		if (!visible.value) return
		if (!dispatch(anchor, POPOVER_EVENTS.hide)) return
		visible.value = false
		anchor.setAttribute('aria-expanded', 'false')
		if (panel.matches(':popover-open')) panel.hidePopover()
		finishClose()
	}

	const update = (next?: { readonly placement?: false | Placement }): void => {
		if (next && 'placement' in next) {
			placementOpt = next.placement ?? 'bottom'
			placed = next.placement !== false
		}
		const target: Placement = placementOpt === false ? 'bottom' : placementOpt
		placement.value = target
		applyPlacement()
		scheduleResolvedSide()
		if (placed) emit(anchor, POPOVER_EVENTS.place, { placement: placement.value })
	}

	const show = (): void => {
		clearTimers()
		if (showDelay) showTimer = setTimeout(doShow, showDelay)
		else doShow()
	}

	const hide = (): void => {
		clearTimers()
		if (hideDelay) hideTimer = setTimeout(doHide, hideDelay)
		else doHide()
	}

	const toggle = (): void => (visible.value ? hide() : show())

	// ── Listeners ─────────────────────────────────────────────────────────
	const onEnter = (): void => show()
	const onLeave = (): void => hide()
	const onClick = (): void => toggle()

	const onDocPointerDown = (event: PointerEvent): void => {
		if (!visible.value || !dismissOutside) return
		if (event.timeStamp - openedAt < POPOVER_TOUCH_GUARD_MS) return
		const target = event.target instanceof Node ? event.target : null
		if (anchor.contains(target)) return
		if (panel.contains(target)) return
		hide()
	}

	const onDocKeydown = (event: KeyboardEvent): void => {
		if (!visible.value || !dismissEscape) return
		if (event.key !== 'Escape') return
		event.preventDefault()
		hide()
	}

	const onViewportChange = (): void => scheduleResolvedSide()

	// ── Setup ─────────────────────────────────────────────────────────────
	panel.popover = 'manual'
	// Wire an explicit anchor-name / position-anchor pair so consumer
	// CSS can read the anchor's edges via the `anchor()` function (e.g.
	// menu `max-block-size` capped to the room available below the
	// toggle so a tall option list scrolls inside the menu instead of
	// being yanked above the trigger). `showPopover({source})` alone
	// establishes the *implicit* anchor used by `position-area`, but
	// `anchor()` reads need the explicit binding.
	const anchorName = `--elements-anchor-${generateId('p')}`
	const previousAnchor = anchor.style.anchorName
	const previousPositionAnchor = panel.style.positionAnchor
	anchor.style.anchorName = anchorName
	panel.style.positionAnchor = anchorName

	// A11y wiring on the trigger so screen readers announce the
	// disclosure state and link the trigger to the panel it controls.
	// Mailbox doesn't write these (acknowledged gap in their composable);
	// the framework-agnostic factory is the right place because it owns
	// the trigger ↔ panel pair and the open/close lifecycle. We only set
	// `aria-haspopup` / `aria-controls` once (boilerplate) and toggle
	// `aria-expanded` synchronously with `visible` from the lifecycle
	// hooks below. Saved previous values are restored by `destroy()`.
	const previousAriaHasPopup = anchor.getAttribute('aria-haspopup')
	const previousAriaControls = anchor.getAttribute('aria-controls')
	const previousAriaExpanded = anchor.getAttribute('aria-expanded')
	const previousPanelId = panel.id
	if (!panel.id) panel.id = `elements-popover-${generateId('p').slice(2)}`
	if (previousAriaHasPopup === null) anchor.setAttribute('aria-haspopup', 'dialog')
	anchor.setAttribute('aria-controls', panel.id)
	anchor.setAttribute('aria-expanded', 'false')

	update()

	const offBound = bindEventMap(anchor, POPOVER_EVENTS, options.on)

	if (triggers.hover) {
		anchor.addEventListener('mouseenter', onEnter)
		anchor.addEventListener('mouseleave', onLeave)
	}
	if (triggers.focus) {
		anchor.addEventListener('focusin', onEnter)
		anchor.addEventListener('focusout', onLeave)
	}
	if (triggers.click) {
		anchor.addEventListener('click', onClick)
	}
	document.addEventListener('pointerdown', onDocPointerDown)
	document.addEventListener('keydown', onDocKeydown)
	document.addEventListener('scroll', onViewportChange, true)
	window.addEventListener('resize', onViewportChange)

	let destroyed = false
	const destroy = (): void => {
		if (destroyed) {
			// Idempotent — still ensure DOM is clean.
			clearTimers()
			cancelFrame()
			cancelTransition()
			clearPanel()
			visible.value = false
			return
		}
		destroyed = true
		offBound()
		anchor.removeEventListener('mouseenter', onEnter)
		anchor.removeEventListener('mouseleave', onLeave)
		anchor.removeEventListener('focusin', onEnter)
		anchor.removeEventListener('focusout', onLeave)
		anchor.removeEventListener('click', onClick)
		document.removeEventListener('pointerdown', onDocPointerDown)
		document.removeEventListener('keydown', onDocKeydown)
		document.removeEventListener('scroll', onViewportChange, true)
		window.removeEventListener('resize', onViewportChange)
		clearTimers()
		cancelFrame()
		cancelTransition()
		clearPanel()
		anchor.style.anchorName = previousAnchor
		panel.style.positionAnchor = previousPositionAnchor
		// Restore prior a11y wiring. If the trigger had no aria-* before
		// the factory ran, remove what we added; otherwise put back the
		// original value so the host page's contract is preserved.
		if (previousAriaHasPopup === null) anchor.removeAttribute('aria-haspopup')
		else anchor.setAttribute('aria-haspopup', previousAriaHasPopup)
		if (previousAriaControls === null) anchor.removeAttribute('aria-controls')
		else anchor.setAttribute('aria-controls', previousAriaControls)
		if (previousAriaExpanded === null) anchor.removeAttribute('aria-expanded')
		else anchor.setAttribute('aria-expanded', previousAriaExpanded)
		if (previousPanelId === '') panel.removeAttribute('id')
		visible.value = false
		scope.stop()
	}

	return {
		visible: readonly(visible),
		placement: readonly(placement),
		styles,
		show,
		hide,
		toggle,
		update,
		destroy,
	}
}
