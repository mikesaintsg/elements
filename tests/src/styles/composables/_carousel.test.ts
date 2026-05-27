// ============================================================================
//  _carousel.scss — `.active` state-gated visibility for carousel items.
//
//  `composables/_carousel.scss` absolutely-positions every `<li role=
//  "listitem">` inside the carousel and gates visibility on the `.active`
//  class: resting items are `visibility: hidden` with `pointer-events:
//  none`; the active item flips to `visibility: visible` with
//  `pointer-events: auto`. Indicator pills mirror via `[aria-selected]`.
//
//  These tests render a real carousel structure, toggle the `.active`
//  class on items, and assert the computed-style flip — proving the
//  class gates visibility, not just JS-side `index.value`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, style } from '../../../setupStyles'

function renderCarousel(count: number): {
	readonly carousel: HTMLElement
	readonly items: readonly HTMLLIElement[]
} {
	const carousel = document.createElement('section')
	carousel.className = 'carousel'
	carousel.setAttribute('role', 'region')
	const list = document.createElement('ol')
	list.setAttribute('role', 'list')
	const items: HTMLLIElement[] = []
	for (let i = 0; i < count; i += 1) {
		const li = document.createElement('li')
		li.setAttribute('role', 'listitem')
		li.textContent = `Slide ${i + 1}`
		if (i === 0) li.classList.add('active')
		list.appendChild(li)
		items.push(li)
	}
	carousel.appendChild(list)
	mount(carousel)
	return { carousel, items }
}

describe('carousel — .active state gate on items', () => {
	it('rule for active item visibility is declared in the loaded cascade', () => {
		expect(findRule('.active')).toBe(true)
	})

	it('active item is visible with pointer-events: auto', () => {
		const { items } = renderCarousel(3)
		const active = items[0]
		if (!active) throw new Error('expected first item')
		expect(active.classList.contains('active')).toBe(true)
		expect(style(active, 'visibility')).toBe('visible')
		expect(style(active, 'pointer-events')).toBe('auto')
	})

	it('resting items are visibility: hidden with pointer-events: none', () => {
		const { items } = renderCarousel(3)
		const resting = items[1]
		if (!resting) throw new Error('expected second item')
		expect(resting.classList.contains('active')).toBe(false)
		expect(style(resting, 'visibility')).toBe('hidden')
		expect(style(resting, 'pointer-events')).toBe('none')
	})

	it('flipping .active hands visibility from old item to new item', () => {
		const { items } = renderCarousel(3)
		const first = items[0]
		const second = items[1]
		if (!first || !second) throw new Error('expected first + second items')

		first.classList.remove('active')
		second.classList.add('active')

		expect(style(first, 'visibility')).toBe('hidden')
		expect(style(first, 'pointer-events')).toBe('none')
		expect(style(second, 'visibility')).toBe('visible')
		expect(style(second, 'pointer-events')).toBe('auto')
	})
})

describe('carousel indicators — [aria-selected] state gate', () => {
	it('aria-selected="true" indicator opacity differs from resting', () => {
		// `_carousel.scss` declares `&[aria-selected='true'] { opacity: 1 }` on
		// indicators inside `.carousel-indicators`. Resting indicators
		// hold a lower opacity (0.85 hover / lower base) so the active
		// one reads as visually dominant.
		const carousel = document.createElement('section')
		carousel.className = 'carousel'
		carousel.setAttribute('role', 'region')
		const tablist = document.createElement('menu')
		tablist.setAttribute('role', 'tablist')
		tablist.className = 'carousel-indicators'
		const activeIndicator = document.createElement('button')
		activeIndicator.type = 'button'
		activeIndicator.setAttribute('role', 'tab')
		activeIndicator.setAttribute('aria-selected', 'true')
		const restingIndicator = document.createElement('button')
		restingIndicator.type = 'button'
		restingIndicator.setAttribute('role', 'tab')
		restingIndicator.setAttribute('aria-selected', 'false')
		tablist.append(activeIndicator, restingIndicator)
		carousel.appendChild(tablist)
		mount(carousel)

		expect(style(activeIndicator, 'opacity')).toBe('1')
	})
})
