import type { CarouselDirection, CreateCarouselInstance, CreateCarouselOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import {
	CAROUSEL_EVENTS,
	CAROUSEL_INDICATOR_SELECTOR,
	CAROUSEL_ITEM_SELECTOR,
	DEFAULT_CAROUSEL_INTERVAL_MS,
	SWIPE_THRESHOLD_PX,
} from '../constants.js'
import { dispatch, emit, listen, runTransition } from '../helpers.js'

/**
 * Framework-agnostic carousel factory. Owns active-slide index, autoplay
 * timer, keyboard navigation, and touch swipe. Renders no DOM — the caller
 * supplies an `<ol>` / `<ul>` of items (`[role="listitem"]` / `<li>`) and
 * optional indicator buttons inside a `[role="tablist"]` wrapper.
 *
 * Element-agnostic at the host level — typically the carousel root is a
 * `<section role="region" aria-roledescription="carousel">`, but any
 * focusable element works.
 *
 * Authored CSS contract:
 *   - `.active` on the visible item and active indicator.
 *   - Transition classes during a slide:
 *     `.carousel-item-next` / `.carousel-item-prev` mark the incoming item;
 *     `.carousel-item-start` / `.carousel-item-end` drive the slide axis
 *     (consumer CSS hooks these to animate transform / opacity).
 */
export function createCarousel(
	element: HTMLElement,
	options: CreateCarouselOptions = {},
): CreateCarouselInstance {
	const interval = options.autoplay?.interval ?? DEFAULT_CAROUSEL_INTERVAL_MS
	const ride = options.autoplay?.ride ?? false
	const pauseOn = options.autoplay?.pause ?? 'hover'
	const wrap = options.wrap ?? true
	const keyboard = options.keyboard ?? true
	const touch = options.touch ?? true

	const scope = effectScope()
	const refs = scope.run(() => ({
		index: ref(0),
		cycling: ref(false),
	}))
	if (!refs) throw new Error('createCarousel: failed to initialize reactive scope')
	const { index, cycling } = refs

	let timer: ReturnType<typeof setInterval> | null = null
	let touchStartX: number | null = null
	let animation: (() => void) | null = null

	const items = (): HTMLElement[] =>
		Array.from(element.querySelectorAll<HTMLElement>(CAROUSEL_ITEM_SELECTOR))
	const indicators = (): HTMLElement[] =>
		Array.from(element.querySelectorAll<HTMLElement>(CAROUSEL_INDICATOR_SELECTOR))

	// Cancelling a transition mid-flight must (a) stop the previous
	// `transitionend` watcher AND (b) clean the four-class slide-axis
	// lifecycle classes off every item. Without (b), a rapid sequence
	// like `to(2) → to(4) → to(1)` leaves the cancelled targets
	// (slide[2], slide[4]) stuck with `carousel-item-next + carousel-
	// item-start` — visibility: visible, z-index: 1, stacked on top of
	// the final destination. The user sees three slides painted at the
	// same translateX(0) position.
	const cancelTransition = (): void => {
		animation?.()
		animation = null
		for (const item of items()) {
			item.classList.remove(
				'carousel-item-next',
				'carousel-item-prev',
				'carousel-item-start',
				'carousel-item-end',
			)
		}
	}

	const syncIndicators = (): void => {
		const list = indicators()
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			if (!item) continue
			const selected = i === index.value
			// Indicators are `<button role="tab">` per the markup contract —
			// `aria-selected` is the ARIA-spec attribute for "current tab".
			// `components/_carousel.scss` reads `[aria-selected='true']` to
			// paint the active-pill stretch + tinted background.
			item.setAttribute('aria-selected', selected ? 'true' : 'false')
		}
	}

	const apply = (from: number, to: number, direction: CarouselDirection): void => {
		// Cancel any in-flight transition BEFORE setting up the new one.
		// cancelTransition() clears the four-class slide-axis lifecycle
		// off every item — if we set up the new transition's classes
		// first and cancelled after, we'd wipe what we just added.
		cancelTransition()

		const list = items()
		const fromEl = list[from]
		const toEl = list[to]
		if (!toEl) return

		const enter = direction === 'left' ? 'carousel-item-next' : 'carousel-item-prev'
		const slide = direction === 'left' ? 'carousel-item-start' : 'carousel-item-end'

		toEl.classList.add(enter)
		void toEl.offsetHeight
		fromEl?.classList.add(slide)
		toEl.classList.add(slide)

		animation = runTransition(toEl, () => {
			animation = null
			fromEl?.classList.remove('active', 'carousel-item-start', 'carousel-item-end')
			toEl.classList.remove(
				'carousel-item-next',
				'carousel-item-prev',
				'carousel-item-start',
				'carousel-item-end',
			)
			toEl.classList.add('active')
			index.value = to
			syncIndicators()
			emit(element, CAROUSEL_EVENTS.change, { direction, from, to })
		})
	}

	const transition = (from: number, target: number, direction: CarouselDirection): void => {
		if (target === from) return
		if (!dispatch(element, CAROUSEL_EVENTS.slide, { direction, from, to: target })) return
		apply(from, target, direction)
	}

	const next = (): void => {
		const list = items()
		if (list.length === 0) return
		const from = index.value
		const target = wrap ? (from + 1) % list.length : Math.min(list.length - 1, from + 1)
		if (target === from) return
		transition(from, target, 'left')
	}

	const prev = (): void => {
		const list = items()
		if (list.length === 0) return
		const from = index.value
		const target = wrap ? (from - 1 + list.length) % list.length : Math.max(0, from - 1)
		if (target === from) return
		transition(from, target, 'right')
	}

	const to = (target: number): void => {
		const list = items()
		if (list.length === 0) return
		const from = index.value
		const clamped = wrap
			? ((target % list.length) + list.length) % list.length
			: Math.max(0, Math.min(list.length - 1, target))
		const direction: CarouselDirection = clamped > from ? 'left' : 'right'
		transition(from, clamped, direction)
	}

	// Internal cycling-region writers — adjust `cycling.value` + timer
	// without emitting. The public `start` / `stop` and the hover-bridge
	// `pause` / `resume` layer their own events on top so we never
	// double-emit (pause must not also fire stop, etc.).
	const startInternal = (): void => {
		if (cycling.value) return
		cycling.value = true
		timer = setInterval(next, interval)
	}

	const stopInternal = (): void => {
		if (!cycling.value) return
		cycling.value = false
		if (timer) {
			clearInterval(timer)
			timer = null
		}
	}

	const start = (): void => {
		if (cycling.value) return
		startInternal()
		emit(element, CAROUSEL_EVENTS.start)
	}

	const stop = (): void => {
		if (!cycling.value) return
		stopInternal()
		emit(element, CAROUSEL_EVENTS.stop)
	}

	const pause = (): void => {
		if (!cycling.value) return
		stopInternal()
		emit(element, CAROUSEL_EVENTS.pause)
	}

	const resume = (): void => {
		if (cycling.value) return
		startInternal()
		emit(element, CAROUSEL_EVENTS.resume)
	}

	const interactionRide = (): void => {
		if (ride === 'interaction' && !cycling.value) start()
	}

	const wrappedNext = (): void => {
		next()
		interactionRide()
	}
	const wrappedPrev = (): void => {
		prev()
		interactionRide()
	}
	const wrappedTo = (i: number): void => {
		to(i)
		interactionRide()
	}

	const onKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'ArrowLeft') {
			event.preventDefault()
			wrappedPrev()
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault()
			wrappedNext()
		}
	}

	const onMouseEnter = (): void => {
		if (pauseOn === 'hover') pause()
	}
	const onMouseLeave = (): void => {
		if (pauseOn === 'hover') resume()
	}

	const onTouchStart = (event: TouchEvent): void => {
		const t = event.touches[0]
		touchStartX = t ? t.clientX : null
	}

	const onTouchEnd = (event: TouchEvent): void => {
		if (touchStartX === null) return
		const t = event.changedTouches[0]
		if (!t) {
			touchStartX = null
			return
		}
		const dx = t.clientX - touchStartX
		touchStartX = null
		if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
		if (dx < 0) wrappedNext()
		else wrappedPrev()
	}

	// Seed from `.active` item.
	const initialList = items()
	const initial = initialList.findIndex((item) => item.classList.contains('active'))
	if (initial >= 0) index.value = initial
	syncIndicators()

	const { on } = options
	const offs: (() => void)[] = []
	if (on?.slide) offs.push(listen(element, CAROUSEL_EVENTS.slide, on.slide))
	if (on?.change) offs.push(listen(element, CAROUSEL_EVENTS.change, on.change))
	if (on?.start) offs.push(listen(element, CAROUSEL_EVENTS.start, on.start))
	if (on?.stop) offs.push(listen(element, CAROUSEL_EVENTS.stop, on.stop))
	if (on?.pause) offs.push(listen(element, CAROUSEL_EVENTS.pause, on.pause))
	if (on?.resume) offs.push(listen(element, CAROUSEL_EVENTS.resume, on.resume))

	if (keyboard) element.addEventListener('keydown', onKeydown)
	if (pauseOn === 'hover') {
		element.addEventListener('mouseenter', onMouseEnter)
		element.addEventListener('mouseleave', onMouseLeave)
	}
	if (touch) {
		element.addEventListener('touchstart', onTouchStart, { passive: true })
		element.addEventListener('touchend', onTouchEnd, { passive: true })
	}

	if (ride === 'mount') start()

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			stop()
			cancelTransition()
			for (const off of offs) off()
			element.removeEventListener('keydown', onKeydown)
			element.removeEventListener('mouseenter', onMouseEnter)
			element.removeEventListener('mouseleave', onMouseLeave)
			element.removeEventListener('touchstart', onTouchStart)
			element.removeEventListener('touchend', onTouchEnd)
			scope.stop()
		}
		for (const item of element.querySelectorAll<HTMLElement>(CAROUSEL_ITEM_SELECTOR)) {
			item.classList.remove(
				'carousel-item-next',
				'carousel-item-prev',
				'carousel-item-start',
				'carousel-item-end',
			)
		}
		for (const item of element.querySelectorAll<HTMLElement>(CAROUSEL_INDICATOR_SELECTOR)) {
			item.removeAttribute('aria-selected')
		}
	}

	return {
		index: readonly(index),
		cycling: readonly(cycling),
		next: wrappedNext,
		prev: wrappedPrev,
		to: wrappedTo,
		start,
		stop,
		pause,
		resume,
		destroy,
	}
}
