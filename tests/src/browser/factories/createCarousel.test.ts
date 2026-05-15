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
	options: { readonly withIndicators?: boolean } = {},
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
	if (options.withIndicators) {
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
		const { carousel, indicators } = createCarouselFixture(3, { withIndicators: true })
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

	it('destroy clears aria-selected on indicators', () => {
		const { carousel, indicators } = createCarouselFixture(3, { withIndicators: true })
		const api = createCarousel(carousel)
		expect(indicators[0]?.getAttribute('aria-selected')).toBe('true')
		api.destroy()
		expect(indicators[0]?.getAttribute('aria-selected')).toBeNull()
		expect(indicators[1]?.getAttribute('aria-selected')).toBeNull()
		expect(indicators[2]?.getAttribute('aria-selected')).toBeNull()
	})
})
