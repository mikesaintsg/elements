import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CAROUSEL_EVENTS, createCarousel, TRANSITION_FALLBACK_MS } from '@elements/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

function createCarouselFixture(
	count: number,
	options: { readonly indicators?: boolean } = {},
): {
	readonly carousel: HTMLElement
	readonly items: readonly HTMLLIElement[]
	readonly indicators: readonly HTMLButtonElement[]
} {
	const carousel = buildElement('section', { attrs: { role: 'region' } })
	const list = document.createElement('ol')
	list.setAttribute('role', 'list')
	const items: HTMLLIElement[] = []
	for (let i = 0; i < count; i++) {
		const li = document.createElement('li')
		li.setAttribute('role', 'listitem')
		li.textContent = `Slide ${i + 1}`
		if (i === 0) li.classList.add('active')
		list.appendChild(li)
		items.push(li)
	}
	carousel.appendChild(list)

	const indicators: HTMLButtonElement[] = []
	if (options.indicators) {
		const tablist = document.createElement('menu')
		tablist.setAttribute('role', 'tablist')
		tablist.className = 'carousel-indicators'
		for (let i = 0; i < count; i++) {
			const li = document.createElement('li')
			const btn = document.createElement('button')
			btn.type = 'button'
			btn.setAttribute('role', 'tab')
			li.appendChild(btn)
			tablist.appendChild(li)
			indicators.push(btn)
		}
		carousel.appendChild(tablist)
	}

	return { carousel, items, indicators }
}

describe('createCarousel', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('seeds index from the active item', () => {
		const { carousel, items } = createCarouselFixture(3)
		items[0]?.classList.remove('active')
		items[2]?.classList.add('active')
		const [api] = createFactoryFixture(() => createCarousel(carousel))
		expect(api.index.value).toBe(2)
	})

	it('next advances; prev rewinds; both with wrap', () => {
		const { carousel } = createCarouselFixture(3)
		const [api] = createFactoryFixture(() => createCarousel(carousel))
		api.next()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(api.index.value).toBe(1)
		api.next()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.next()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(api.index.value).toBe(0) // wrapped
		api.prev()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(api.index.value).toBe(2) // wrapped
	})

	it('start / stop drive cycling state', () => {
		const { carousel } = createCarouselFixture(3)
		const [api] = createFactoryFixture(() =>
			createCarousel(carousel, { autoplay: { interval: 1000 } }),
		)
		api.start()
		expect(api.cycling.value).toBe(true)
		api.stop()
		expect(api.cycling.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { carousel } = createCarouselFixture(3)
		const slide = createRecorder<[Event]>()
		carousel.addEventListener(CAROUSEL_EVENTS.slide, slide.handler)
		const [api] = createFactoryFixture(() => createCarousel(carousel))
		api.next()
		expect(slide.count).toBe(1)
	})

	it('destroy reverses every listener and timer', () => {
		assertCleanDispose(() => {
			const { carousel } = createCarouselFixture(3)
			return createCarousel(carousel)
		})
	})

	it('syncs aria-selected on `<menu role="tablist"> > li > button` indicators', () => {
		const { carousel, indicators } = createCarouselFixture(3, { indicators: true })
		const [api] = createFactoryFixture(() => createCarousel(carousel))
		expect(indicators[0]?.getAttribute('aria-selected')).toBe('true')
		expect(indicators[1]?.getAttribute('aria-selected')).toBe('false')
		expect(indicators[2]?.getAttribute('aria-selected')).toBe('false')
		api.to(1)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(indicators[0]?.getAttribute('aria-selected')).toBe('false')
		expect(indicators[1]?.getAttribute('aria-selected')).toBe('true')
		expect(indicators[2]?.getAttribute('aria-selected')).toBe('false')
	})

	it('rapid imperative calls do NOT leave stale transitional classes', () => {
		// Reproduces the "to(2) → to(4) → to(1) leaves slide[2] and slide[4]
		// stuck visible" bug: each subsequent call must cancel the previous
		// in-flight transition AND clean the four-class slide-axis lifecycle
		// off every item, otherwise the cancelled targets remain at
		// translateX(0), z-index:1, stacked on top of the final destination.
		const { carousel, items } = createCarouselFixture(5)
		const [api] = createFactoryFixture(() => createCarousel(carousel))

		api.to(2) // start a transition we'll cancel
		api.to(4) // cancel the to(2) before transitionend fires
		api.to(1) // cancel the to(4) before transitionend fires

		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)

		expect(api.index.value).toBe(1)
		// Only slide[1] should be active; every other slide should be clean
		// (no `.active`, no `carousel-item-{next,prev,start,end}`).
		const STALE_CLASSES = [
			'carousel-item-next',
			'carousel-item-prev',
			'carousel-item-start',
			'carousel-item-end',
		] as const
		const activeIndices: number[] = []
		const stale: string[] = []
		for (let i = 0; i < items.length; i++) {
			const slide = items[i]
			if (!slide) continue
			const classes = Array.from(slide.classList)
			if (classes.includes('active')) activeIndices.push(i)
			for (const cls of STALE_CLASSES) {
				if (classes.includes(cls)) stale.push(`slide[${i}] carries stale ${cls}`)
			}
		}
		expect(activeIndices).toEqual([1])
		expect(stale).toEqual([])
	})

	it('destroy clears aria-selected on indicators', () => {
		const { carousel, indicators } = createCarouselFixture(3, { indicators: true })
		const api = createCarousel(carousel)
		expect(indicators[0]?.getAttribute('aria-selected')).toBe('true')
		api.destroy()
		expect(indicators[0]?.getAttribute('aria-selected')).toBeNull()
		expect(indicators[1]?.getAttribute('aria-selected')).toBeNull()
		expect(indicators[2]?.getAttribute('aria-selected')).toBeNull()
	})
})
