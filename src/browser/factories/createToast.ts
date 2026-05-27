import type {
	CreatePointerInstance,
	CreatePopoverInstance,
	CreateToastInstance,
	CreateToastOptions,
} from '../types.js'
import { coerceNumber, isFiniteNumber, isUndefined, parseNumber } from '@elements/core'
import {
	DEFAULT_TOAST_DELAY_MS,
	DEFAULT_TOAST_SWIPE_THRESHOLD_PX,
	TOAST_EVENTS,
	TOAST_HIDDEN_COUNT_ATTR,
	TOAST_STACK_ATTR,
	TOAST_STACK_CLOSING_ATTR,
	TOAST_STACK_HIDDEN_ATTR,
} from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	runTransition,
} from '../helpers.js'
import { createPointer } from './createPointer.js'
import { createPopover } from './createPopover.js'

/**
 * Framework-agnostic toast factory. Bound to `<div role="status">`: a toast
 * renders flow content (`<header>` + `<p>` bands), which `<output>`'s
 * phrasing-only HTML content model forbids. `role="status"` IS `<output>`'s
 * implicit ARIA role (a polite, atomic live region), so the screen-reader
 * announcement semantic is preserved EXACTLY while the element accepts the
 * flow content the toast actually renders. The toast surface
 * (`src/styles/surfaces/_anchor-position.scss` exclusion +
 * `src/styles/components/_output.scss` rule) scopes itself with
 * `[popover][role="status"]` — the only popover the framework gives
 * `role="status"`, so the scope is exact (non-broadening) and keeps the
 * toast's component-layer `position: fixed` from being beat by the
 * surface-layer popover positioning.
 *
 * Composes `createPopover` for native top-layer visibility, owns the
 * autohide timer (paused while the pointer hovers / focus is inside),
 * and manages stack-deck layout when the parent container opts in via
 * `[data-toast-stack]`.
 *
 * Custom-property contract:
 *   - `--set-toast-spacing`     gap between linear-stack toasts.
 *   - `--set-toast-stack-depth` how many cards stay visible in deck mode.
 *   - `--set-toast-stack-index` per-toast 0-based deck index (written here).
 *   - `--set-toast-stack-offset` per-toast cumulative offset (linear mode).
 *   - `--set-toast-front-height` deck-mode shared height (written here).
 *
 * Element gating: throws if the host is not a `<div>`. The factory sets
 * `role="status"` if the consumer didn't, so the live-region contract holds
 * regardless of markup discipline.
 */
export function createToast(
	element: HTMLDivElement,
	options: CreateToastOptions = {},
): CreateToastInstance {
	assertElement<HTMLDivElement>(element, 'div', 'createToast')
	// `role="status"` is `<output>`'s implicit role — set it so the toast is
	// a polite, atomic live region (the AT semantic the old `<output>` root
	// carried for free) AND so the chrome selector `[popover][role="status"]`
	// matches. Idempotent: respects a consumer-set role.
	if (!element.hasAttribute('role')) element.setAttribute('role', 'status')

	const auto = options.autohide !== false
	const delay = options.autohide === false ? 0 : (options.autohide?.delay ?? DEFAULT_TOAST_DELAY_MS)
	const swipeEnabled = options.swipe !== false
	const swipeThreshold =
		options.swipe === false ? 0 : (options.swipe?.threshold ?? DEFAULT_TOAST_SWIPE_THRESHOLD_PX)

	let timer: ReturnType<typeof setTimeout> | null = null
	let transition: (() => void) | null = null
	let frame: number | null = null

	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}
	const cancelFrame = (): void => {
		if (frame === null) return
		cancelAnimationFrame(frame)
		frame = null
	}
	const clearTimer = (): void => {
		if (timer) {
			clearTimeout(timer)
			timer = null
		}
	}

	const length = (value: string, host: HTMLElement): number => {
		const text = value.trim()
		const amount = coerceNumber(text)
		if (!isFiniteNumber(amount)) return 0
		if (text.endsWith('rem')) {
			const size = coerceNumber(getComputedStyle(document.documentElement).fontSize)
			return amount * (isFiniteNumber(size) ? size : 16)
		}
		if (text.endsWith('em')) {
			const size = coerceNumber(getComputedStyle(host).fontSize)
			return amount * (isFiniteNumber(size) ? size : 16)
		}
		return amount
	}

	const stack = (): void => {
		const container = element.parentElement
		if (!container) return

		const toasts = Array.from(container.children).filter(
			(child): child is HTMLDivElement =>
				child instanceof HTMLDivElement &&
				child.getAttribute('role') === 'status' &&
				child.hasAttribute('popover') &&
				child.matches(':popover-open'),
		)
		// Top-anchored containers stack newest-first; bottom-anchored stack
		// oldest-first. We treat any container without an explicit
		// `data-toast-position="top"` marker as bottom.
		const ordered = container.dataset.toastPosition === 'top' ? toasts : [...toasts].reverse()
		// Deck mode opts in via `[data-toast-stack]`. Linear is the default.
		const isDeck = container.hasAttribute(TOAST_STACK_ATTR)
		let offset = 0
		for (const toast of ordered) {
			toast.style.setProperty('--set-toast-stack-offset', isDeck ? '0px' : `${offset}px`)
			if (isDeck) continue
			const style = getComputedStyle(toast)
			const gap = length(style.getPropertyValue('--set-toast-spacing'), toast)
			offset += toast.getBoundingClientRect().height + gap
		}

		if (!isDeck) return

		const depthRaw = getComputedStyle(container).getPropertyValue('--set-toast-stack-depth').trim()
		const depthValue = parseNumber(depthRaw)
		const depth = !isUndefined(depthValue) && depthValue >= 1 ? Math.floor(depthValue) : 3

		const front = ordered[0]
		const frontHeight = front ? front.getBoundingClientRect().height : 0
		container.style.setProperty('--set-toast-front-height', `${frontHeight}px`)

		let hiddenCount = 0
		ordered.forEach((toast, index) => {
			toast.style.setProperty('--set-toast-stack-index', String(index))
			if (index >= depth) {
				toast.setAttribute(TOAST_STACK_HIDDEN_ATTR, '')
				toast.setAttribute('aria-hidden', 'true')
				hiddenCount += 1
			} else {
				toast.removeAttribute(TOAST_STACK_HIDDEN_ATTR)
				toast.removeAttribute('aria-hidden')
			}
		})
		container.setAttribute(TOAST_HIDDEN_COUNT_ATTR, String(hiddenCount))
	}

	const schedule = (): void => {
		if (typeof window === 'undefined') return
		cancelFrame()
		frame = requestAnimationFrame(() => {
			frame = null
			stack()
		})
	}

	const startTimer = (): void => {
		if (!auto) return
		clearTimer()
		timer = setTimeout(() => hide(), delay)
	}

	const popover: CreatePopoverInstance = createPopover(
		{ anchor: element, panel: element },
		{
			placement: false,
			trigger: {},
			dismiss: { outside: false, escape: false },
			on: {
				show: (event: CustomEvent) => {
					if (!dispatch(element, TOAST_EVENTS.show)) {
						event.preventDefault()
						return
					}
					// Re-append so the toast lands at the end of the container's
					// children — newest at the bottom of the stack (or top
					// when reversed).
					element.parentElement?.appendChild(element)
				},
				hide: (event: CustomEvent) => {
					if (!dispatch(element, TOAST_EVENTS.hide)) {
						event.preventDefault()
						return
					}
					clearTimer()
				},
				open: schedule,
				close: schedule,
			},
		},
	)

	const clearSwipeState = (): void => {
		element.removeAttribute('data-toast-swiping')
		element.style.removeProperty('--set-toast-swipe-offset')
		element.style.removeProperty('--set-toast-swipe-opacity')
	}

	const show = (): void => {
		const hidden = !popover.visible.value
		// Always start from a clean swipe state — a previous commit-dismiss
		// path leaves `--set-toast-swipe-offset: ±100vw` inline so the close
		// animation can play out; without this reset the toast re-opens
		// off-screen. Safe to call even on the re-show-while-open path
		// (token defaults are zero offset + full opacity).
		clearSwipeState()
		popover.show()
		if (!hidden || !popover.visible.value) return
		schedule()
		// Wait for the surface-layer entry transition (driven by
		// `transition-behavior: allow-discrete` + `@starting-style`) before
		// firing `open` and starting the autohide timer.
		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, TOAST_EVENTS.open)
			startTimer()
		})
	}

	const hide = (): void => {
		const shown = popover.visible.value
		popover.hide()
		if (!shown || popover.visible.value) return
		schedule()

		// Deck close-flicker fix: pin the expanded layout while the closing
		// card animates out so the deck doesn't collapse and re-expand when
		// the cursor briefly loses the close button.
		const container = element.parentElement
		const decking = container?.hasAttribute(TOAST_STACK_ATTR) === true
		if (decking && container) container.setAttribute(TOAST_STACK_CLOSING_ATTR, '')

		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, TOAST_EVENTS.close)
			// Reset the swipe overrides AFTER the close transition finishes
			// so the commit-dismiss "fly off the inline-end edge" animation
			// (driven by the inline `--set-toast-swipe-offset: ±100vw` the
			// pointer-end handler wrote) plays out cleanly before we wipe
			// the tokens. Belt-and-suspenders with the clear in `show()`
			// — covers the case where a consumer doesn't reopen the toast.
			clearSwipeState()
			if (decking && container) {
				requestAnimationFrame(() => container.removeAttribute(TOAST_STACK_CLOSING_ATTR))
			}
		})
	}

	// Track timer-suspension state separately from `popover.visible` so
	// repeated `pause()` / `resume()` calls (or hover bridges that fire
	// mouseenter twice without a leave in between) don't double-emit. The
	// timer's null-ness is the source of truth for "is the autohide
	// suspended right now", but we de-dupe events explicitly.
	let paused = false
	const pause = (): void => {
		if (paused) return
		paused = true
		clearTimer()
		emit(element, TOAST_EVENTS.pause)
	}
	const resume = (): void => {
		if (!paused) return
		paused = false
		if (popover.visible.value) startTimer()
		emit(element, TOAST_EVENTS.resume)
	}

	const offBound = bindEventMap(element, TOAST_EVENTS, options.on)
	const offEl = attachListeners(element, [
		{ name: 'mouseenter', handler: pause },
		{ name: 'mouseleave', handler: resume },
		{ name: 'focusin', handler: pause },
		{ name: 'focusout', handler: resume },
	])

	// ── Swipe-to-dismiss ─────────────────────────────────────────────────
	// Composes `createPointer` to capture the `pointerdown → pointermove* →
	// pointerup` lifecycle. The factory writes `--set-toast-swipe-offset`
	// (inline-axis displacement) and `--set-toast-swipe-opacity` (fade) per
	// frame; `_toast.scss` consumes them via the standalone `translate`
	// property (composes with the deck's `transform: translateY()`) and
	// `opacity`, gating the snap-back transition on the absence of
	// `[data-toast-swiping]`.
	//
	// Interaction model — "touch the bounds, dismiss" (Sonner / iOS / Demo
	// 4 of UsePointerPage). The toast follows the pointer 1:1 along the
	// inline axis, but the visual translate is CAPPED at the swipe
	// threshold so the toast can't be dragged unreasonably far. The moment
	// the drag REACHES the bounds (|dx| ≥ threshold), we auto-commit
	// dismiss without waiting for pointerup: pointer.clear() ends the drag
	// programmatically (same idiom as the resizable-card demo's max-extent
	// auto-end), and the close animation flies the toast off the inline-
	// end edge via the `±100vw` offset the move handler writes. If the
	// pointer is released BEFORE reaching the bounds, the end handler
	// clears the inline overrides and the motion-contract transition
	// (gated on `:not([data-toast-swiping])`) snaps the toast home.
	//
	// `accept` rejects pointer-downs on the trailing dismiss `<button>` so
	// button clicks survive, and non-primary buttons (right-click stays
	// available for the OS context menu).
	let pointer: CreatePointerInstance | null = null
	if (swipeEnabled) {
		let startX = 0
		let startY = 0
		let axisLocked: 'inline' | 'block' | null = null
		let committed = false // true once auto-dismiss has fired in `move`
		const LOCK_THRESHOLD = 6 // px before we commit to an axis
		pointer = createPointer(element, {
			accept: (event) => {
				// Primary button only — secondary / aux buttons keep the
				// platform's right-click / middle-click semantics
				// available. On touch, `event.button` is always 0, so this
				// is a no-op for touch.
				if (event.button !== 0) return false
				// Toast must be open. `popover-open` is the source of
				// truth; we don't engage swipe on a closed toast even if
				// pointerdown somehow fires on it.
				if (!popover.visible.value) return false
				// Reject pointer-down on any interactive descendant so
				// link / button / form-control clicks all survive. The
				// trailing `× dismiss` is the headline case (single-tap
				// dismiss must work), but a banded toast can also host
				// action buttons (`<button class="warning">Extend
				// session</button>`), and rich toasts might contain
				// `<a>` links or inputs. The `closest()` walk stops at
				// the toast itself if it doesn't match — the toast root
				// `<div role="status">` isn't in the interactive set, so
				// a pointer-down on a non-interactive descendant
				// (paragraph text, decorative `<span>`, the `<header>`
				// band background) correctly engages the swipe.
				const target = event.target
				if (
					target instanceof Element &&
					target.closest('a, button, input, textarea, select, [role="button"]')
				) {
					return false
				}
				return true
			},
			on: {
				start: (event) => {
					startX = event.clientX
					startY = event.clientY
					axisLocked = null
					committed = false
					pause()
					element.setAttribute('data-toast-swiping', '')
				},
				move: (event) => {
					if (committed) return
					const dx = event.clientX - startX
					const dy = event.clientY - startY
					if (axisLocked === null) {
						const absDx = Math.abs(dx)
						const absDy = Math.abs(dy)
						if (absDx < LOCK_THRESHOLD && absDy < LOCK_THRESHOLD) return
						axisLocked = absDx >= absDy ? 'inline' : 'block'
					}
					if (axisLocked !== 'inline') {
						// User started a vertical movement — release axis to the
						// host (page scroll). We don't dismiss on vertical swipes.
						return
					}
					const absDx = Math.abs(dx)
					const sign = Math.sign(dx) || 1
					// Visual cap at the threshold — past it, the toast stops
					// moving with the pointer. The cap establishes a clear
					// "you've reached the dismiss bound" affordance: visual
					// stops, opacity hits floor, the next frame fires
					// auto-dismiss below. Without the cap, the toast would
					// follow the pointer arbitrarily far off-screen, which
					// reads as "I'm flinging this away" — natural-feeling at
					// first but with no defined dismiss commit point.
					const cappedDx = absDx >= swipeThreshold ? sign * swipeThreshold : dx
					element.style.setProperty('--set-toast-swipe-offset', `${cappedDx}px`)
					// Opacity tapers across the threshold: full at origin,
					// 0.4 at the bound, 0 in the post-commit fly-off. The
					// 0.4 floor (not 0) keeps the toast readable mid-swipe
					// so users can hesitate / cancel without it disappearing
					// before they decide.
					const opacity = Math.max(0.4, 1 - (absDx / swipeThreshold) * 0.6)
					element.style.setProperty('--set-toast-swipe-opacity', String(opacity))

					if (absDx >= swipeThreshold) {
						// Touched the bounds → auto-dismiss without waiting
						// for pointerup. Same pattern as the resizable-card
						// demo (UsePointerPage § 4 — `resizer.clear()` at max).
						committed = true
						element.removeAttribute('data-toast-swiping')
						element.style.setProperty('--set-toast-swipe-offset', `${sign * window.innerWidth}px`)
						element.style.setProperty('--set-toast-swipe-opacity', '0')
						pointer?.clear()
						hide()
					}
				},
				end: () => {
					if (committed) {
						// Auto-dismiss already ran in `move` — leave the inline
						// styles in place so the close animation plays out.
						return
					}
					element.removeAttribute('data-toast-swiping')
					// User released before reaching the bounds — snap back to
					// origin. Removing the inline overrides lets the CSS
					// transition (motion-contract tokens, gated on
					// `:not([data-toast-swiping])`) carry the toast home.
					element.style.removeProperty('--set-toast-swipe-offset')
					element.style.removeProperty('--set-toast-swipe-opacity')
					resume()
				},
			},
		})
	}

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offEl()
			pointer?.destroy()
			popover.destroy()
		}
		clearTimer()
		cancelFrame()
		cancelTransition()
		element.removeAttribute(TOAST_STACK_HIDDEN_ATTR)
		element.removeAttribute('data-toast-swiping')
		element.removeAttribute('aria-hidden')
		element.style.removeProperty('--set-toast-stack-index')
		element.style.removeProperty('--set-toast-swipe-offset')
		element.style.removeProperty('--set-toast-swipe-opacity')
		const container = element.parentElement
		if (container?.hasAttribute(TOAST_STACK_ATTR)) {
			container.removeAttribute(TOAST_HIDDEN_COUNT_ATTR)
			container.removeAttribute(TOAST_STACK_CLOSING_ATTR)
		}
	}

	return {
		visible: popover.visible,
		show,
		hide,
		pause,
		resume,
		destroy,
	}
}
