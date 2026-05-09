// ============================================================================
//  components/_nav.scss — bare <nav> as navigation. Variant shape comes from
//  descendant content (inner <ol> = breadcrumb; otherwise flex row / rail).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (
			tag === 'MAIN' ||
			tag === 'NAV' ||
			tag === 'HEADER' ||
			tag === 'FOOTER' ||
			tag === 'ASIDE'
		) {
			child.remove()
		}
	}
})

describe('nav — token surface', () => {
	it('exposes --set-nav-* tokens on a bare <nav>', () => {
		const el = render('nav', '')
		expect(token(el, '--set-nav-color').trim()).not.toBe('')
		expect(token(el, '--set-nav-inline-size').trim()).not.toBe('')
		expect(token(el, '--set-nav-gap').trim()).not.toBe('')
	})

	it('.primary tints the rail border via the variant cascade', () => {
		const el = render('nav', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-nav-border-color').trim()).toBe(expected)
	})
})

describe('nav — bare flex container', () => {
	it('renders as a wrapping horizontal flex row', () => {
		const el = render('nav', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-wrap')).toBe('wrap')
	})

	it('has a default gap', () => {
		const el = render('nav', '')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})
})

describe('nav — body-shell rail', () => {
	it('a bare <nav> outside the shell has no rail chrome', () => {
		const el = render('nav', '')
		expect(pixels(el, 'border-right-width')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('<nav> + <main> as siblings of body activate rail chrome (vertical, bordered)', () => {
		const nav = build('nav', '', 'Sidebar')
		const main = build('main', '', 'Page')
		document.body.append(nav, main)

		expect(style(nav, 'flex-direction')).toBe('column')
		expect(pixels(nav, 'padding-left')).toBeGreaterThan(0)
		expect(pixels(nav, 'border-right-width')).toBe(1)
		expect(style(nav, 'overflow-y')).toBe('auto')
	})

	it('.end placement modifier flips the border to the leading edge', () => {
		const nav = build('nav', 'end', 'Trailing rail')
		const main = build('main', '', 'Page')
		document.body.append(nav, main)

		expect(pixels(nav, 'border-right-width')).toBe(0)
		expect(pixels(nav, 'border-left-width')).toBe(1)
	})
})

describe('nav — breadcrumb (nav > ol)', () => {
	it('inner <ol> renders as a horizontal flex with no list markers', () => {
		const nav = build('nav')
		const ol = build('ol')
		ol.appendChild(build('li', '', 'Home'))
		ol.appendChild(build('li', '', 'Library'))
		ol.appendChild(build('li', '', 'Data'))
		nav.appendChild(ol)
		mount(nav)

		expect(style(ol, 'display')).toBe('flex')
		expect(style(ol, 'list-style-type')).toBe('none')
		expect(pixels(ol, 'padding-left')).toBe(0)
	})

	it('non-first <li> in nav > ol gets a chevron separator pseudo-element', () => {
		const nav = build('nav')
		const ol = build('ol')
		const first = build('li', '', 'Home')
		const second = build('li', '', 'Library')
		ol.appendChild(first)
		ol.appendChild(second)
		nav.appendChild(ol)
		mount(nav)

		// The ::before content is the chevron.
		const before = globalThis.getComputedStyle(second, '::before').content
		// Just check that a ::before exists with a non-empty content value.
		expect(before).not.toBe('none')
	})
})
