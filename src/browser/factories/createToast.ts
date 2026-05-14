import type {
	CreatePointerInstance,
	CreatePopoverInstance,
	CreateToastInstance,
	CreateToastOptions,
} from '../types.js'
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
 * Framework-agnostic toast factory. Bound to `<output>` because the toast
 * surface (`src/styles/surfaces/_anchor-position.scss` exclusion +
 * `src/styles/components/_toast.scss` rule) scopes itself with
 * `output[popover]` — that keeps toast's component-layer `position: fixed`
 * from being beat by the surface-layer popover positioning.
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
 * Element gating: throws if the host is not `<output>`.
 */
export function createToast(
	element: HTMLOutputElement,
	options: CreateToastOptions = {},
): CreateToastInstance {
	assertElement<HTMLOutputElement>(element, 'output', 'createToast')

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
		const amount = Number.parseFloat(text)
		if (!Number.isFinite(amount)) return 0
		if (text.endsWith('rem')) {
			const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
			return amount * (Number.isFinite(size) ? size : 16)
		}
		if (text.endsWith('em')) {
			const size = Number.parseFloat(getComputedStyle(host).fontSize)
			return amount * (Number.isFinite(size) ? size : 16)
		}
		return amount
	}

	const stack = (): void => {
		const container = element.parentElement
		if (!container) return

		const toasts = Array.from(container.children).filter(
			(child): child is HTMLOutputElement =>
				child instanceof HTMLOutputElement &&
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
		const depthValue = Number(depthRaw)
		const depth = Number.isFinite(depthValue) && depthValue >= 1 ? Math.floor(depthValue) : 3

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

	const pause = (): void => clearTimer()
	const resume = (): void => {
		if (popover.visible.value) startTimer()
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
	// pointerup` lifecycle. Setup is consciously thin: the factory writes
	// `--set-toast-swipe-offset` (inline-axis displacement) and
	// `--set-toast-swipe-opacity` (fade) per frame; `_toast.scss` composables-
	// layer rules consume those tokens via `translate` (standalone property
	// composes with the deck's `transform: translateY()`) and `opacity`,
	// gating the snap-back transition on the absence of `[data-toast-
	// swiping]`. Bidirectional horizontal — either direction commits when
	// `|dx| > threshold`. The `accept` predicate rejects pointer-downs on
	// the trailing dismiss `<button>` (so button clicks survive) and
	// non-primary buttons.
	let pointer: CreatePointerInstance | null = null
	if (swipeEnabled) {
		let startX = 0
		let startY = 0
		let axisLocked: 'inline' | 'block' | null = null
		const LOCK_THRESHOLD = 6 // px before we commit to an axis
		pointer = createPointer(element, {
			accept: (event) => {
				if (event.button !== 0) return false
				if (!popover.visible.value) return false
				const target = event.target
				if (target instanceof Element && target.closest('button')) return false
				return true
			},
			on: {
				start: (event) => {
					startX = event.clientX
					startY = event.clientY
					axisLocked = null
					pause()
					element.setAttribute('data-toast-swiping', '')
				},
				move: (event) => {
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
					element.style.setProperty('--set-toast-swipe-offset', `${dx}px`)
					const opacity = Math.max(0, 1 - Math.abs(dx) / (swipeThreshold * 2))
					element.style.setProperty('--set-toast-swipe-opacity', String(opacity))
				},
				end: (event) => {
					element.removeAttribute('data-toast-swiping')
					const dx = event.clientX - startX
					if (axisLocked === 'inline' && Math.abs(dx) > swipeThreshold) {
						// Commit dismiss — translate off the inline-end edge then
						// fire `hide()`. The hide path runs the popover lifecycle,
						// which dispatches the cancellable `elements:toast:hide`
						// event; if a consumer vetoes, the snap-back applies on
						// the next frame because the inline style is still set.
						const sign = Math.sign(dx) || 1
						element.style.setProperty('--set-toast-swipe-offset', `${sign * window.innerWidth}px`)
						element.style.setProperty('--set-toast-swipe-opacity', '0')
						hide()
						return
					}
					// Snap back to origin — clear the inline overrides so the CSS
					// transition (defined in `_toast.scss`) carries us home.
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
