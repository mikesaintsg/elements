import type {
	CreateTooltipElements,
	CreateTooltipInstance,
	CreateTooltipOptions,
	Placement,
} from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DEFAULT_FLOATING_OFFSET, TOOLTIP_EVENTS } from '../constants.js'
import {
	areaForPopoverPlacement,
	bindEventMap,
	dispatch,
	emit,
	generateId,
	hasTransitionDuration,
	resolvePopoverSide,
	runTransition,
	selfsForPopoverPlacement,
	sideOf,
} from '../helpers.js'

/**
 * Framework-agnostic tooltip factory. Hover + focus triggers are always
 * on (the canonical tooltip UX); programmatic `show` / `hide` / `toggle`
 * remain available alongside.
 *
 * Same chrome model as `createPopover`:
 *   - `panel.popover = 'manual'` for top-layer rendering.
 *   - Inline `position-area` drives placement; `position-try-fallbacks`
 *     (declared on the surface rule) flips on overflow.
 *   - `dataset.tooltipSide` carries the resolved side for chrome that
 *     follows it (arrow rotation, callout edge gradient).
 *   - No `.show` / `.fade` / `.tooltip-{side}` classes.
 *
 * Element gating: any `HTMLElement` works as the panel — every element
 * supports the popover API. The `useTooltip` composable narrows further
 * to `[role="tooltip"]` if authors want a stricter contract.
 */
export function createTooltip(
	elements: CreateTooltipElements,
	options: CreateTooltipOptions = {},
): CreateTooltipInstance {
	const { anchor, panel } = elements
	const strategy = options.strategy ?? 'absolute'
	const offset = options.offset ?? DEFAULT_FLOATING_OFFSET
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
	if (!refs) throw new Error('createTooltip: failed to initialize reactive scope')
	const visible = refs.visible
	const placement = refs.placement

	let showTimer: ReturnType<typeof setTimeout> | null = null
	let hideTimer: ReturnType<typeof setTimeout> | null = null
	let transition: (() => void) | null = null
	let frame: number | null = null

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
		panel.style.positionArea = areaForPopoverPlacement(placementOpt)
		// `align-self` / `justify-self` paired with `position-area` —
		// the surface default (`align-self: start; justify-self:
		// anchor-center`) only renders correctly for the `'bottom'`
		// placement. Every other placement (`top`, `start`, `end`, every
		// corner, etc.) needs an override or the tooltip pins to the
		// edge of the available area (e.g. `position-area: top` +
		// `align-self: start` = tooltip stuck at viewport-top instead of
		// hugging the anchor's top edge). Mirrors `createPopover`'s same
		// step — the tooltip factory was previously missing this and
		// every non-bottom placement misrendered.
		const [alignSelf, justifySelf] = selfsForPopoverPlacement(placementOpt)
		panel.style.alignSelf = alignSelf
		panel.style.justifySelf = justifySelf
		panel.dataset.tooltipSide = sideOf(placementOpt)
		panel.dataset.tooltipStrategy = strategy
		panel.dataset.tooltipOffset = String(offset)
	}

	const syncResolvedSide = (): void => {
		if (!placed || !visible.value) return
		panel.dataset.tooltipSide = resolvePopoverSide(anchor, panel)
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
		delete panel.dataset.tooltipSide
		delete panel.dataset.tooltipStrategy
		delete panel.dataset.tooltipOffset
		panel.style.positionArea = ''
		panel.style.alignSelf = ''
		panel.style.justifySelf = ''
		if (panel.matches(':popover-open')) panel.hidePopover()
	}

	const finishOpen = (): void => {
		cancelTransition()
		if (!hasTransitionDuration(panel)) {
			emit(anchor, TOOLTIP_EVENTS.open)
			return
		}
		transition = runTransition(panel, () => {
			transition = null
			emit(anchor, TOOLTIP_EVENTS.open)
		})
	}
	const finishClose = (): void => {
		cancelTransition()
		if (!hasTransitionDuration(panel)) {
			emit(anchor, TOOLTIP_EVENTS.close)
			return
		}
		transition = runTransition(panel, () => {
			transition = null
			emit(anchor, TOOLTIP_EVENTS.close)
		})
	}

	const doShow = (): void => {
		if (visible.value) return
		showTimer = null
		if (!dispatch(anchor, TOOLTIP_EVENTS.show)) return
		visible.value = true
		update()
		panel.showPopover({ source: anchor })
		scheduleResolvedSide()
		finishOpen()
	}

	const doHide = (): void => {
		if (!visible.value) return
		if (!dispatch(anchor, TOOLTIP_EVENTS.hide)) return
		visible.value = false
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
		if (placed) emit(anchor, TOOLTIP_EVENTS.place, { placement: placement.value })
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

	const onEnter = (): void => show()
	const onLeave = (): void => hide()

	// Touch / click-toggle support — on coarse-pointer devices (phones,
	// tablets) `mouseenter` / `mouseleave` either don't fire at all or
	// fire alongside synthesized click events that immediately blur the
	// anchor. Wire `pointerdown` against a `pointerType: 'touch'` filter
	// so a tap toggles the tooltip without waiting for hover. Mouse and
	// pen pointers fall through to the existing hover path.
	const onPointerDown = (event: PointerEvent): void => {
		if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
		toggle()
	}

	// Light-dismiss for the touch path — tapping anywhere outside the
	// anchor / panel hides an open tooltip. Without this, a touch-opened
	// tooltip would persist until another tap on the anchor.
	const onDocPointerDown = (event: PointerEvent): void => {
		if (!visible.value) return
		if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
		const target = event.target as Node | null
		if (target && (anchor.contains(target) || panel.contains(target))) return
		hide()
	}

	const onDocKeydown = (event: KeyboardEvent): void => {
		if (!visible.value || !dismissEscape) return
		if (event.key !== 'Escape') return
		event.preventDefault()
		hide()
	}
	const onViewportChange = (): void => scheduleResolvedSide()

	panel.popover = 'manual'
	const anchorName = `--elements-anchor-${generateId('t')}`
	const previousAnchor = anchor.style.anchorName
	const previousPositionAnchor = panel.style.positionAnchor
	anchor.style.anchorName = anchorName
	panel.style.positionAnchor = anchorName
	panel.setAttribute('role', 'tooltip')
	update()

	const offBound = bindEventMap(anchor, TOOLTIP_EVENTS, options.on)
	anchor.addEventListener('mouseenter', onEnter)
	anchor.addEventListener('mouseleave', onLeave)
	anchor.addEventListener('focusin', onEnter)
	anchor.addEventListener('focusout', onLeave)
	anchor.addEventListener('pointerdown', onPointerDown)
	document.addEventListener('pointerdown', onDocPointerDown, true)
	document.addEventListener('keydown', onDocKeydown)
	document.addEventListener('scroll', onViewportChange, true)
	window.addEventListener('resize', onViewportChange)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			anchor.removeEventListener('mouseenter', onEnter)
			anchor.removeEventListener('mouseleave', onLeave)
			anchor.removeEventListener('focusin', onEnter)
			anchor.removeEventListener('focusout', onLeave)
			anchor.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('pointerdown', onDocPointerDown, true)
			document.removeEventListener('keydown', onDocKeydown)
			document.removeEventListener('scroll', onViewportChange, true)
			window.removeEventListener('resize', onViewportChange)
			scope.stop()
		}
		clearTimers()
		cancelFrame()
		cancelTransition()
		clearPanel()
		anchor.style.anchorName = previousAnchor
		panel.style.positionAnchor = previousPositionAnchor
		visible.value = false
	}

	return {
		visible: readonly(visible),
		placement: readonly(placement),
		show,
		hide,
		toggle,
		update,
		destroy,
	}
}
