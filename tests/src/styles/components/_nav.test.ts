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

describe('nav — bare element is block flow', () => {
	it('a bare <nav> is block-level, not auto-flex (so nested navs do not stagger)', () => {
		// We deliberately do NOT default <nav> to flex, because nested
		// `<nav><nav>...</nav></nav>` patterns (sub-nav inside a primary nav
		// rail) would wrap horizontally and stagger items on narrow viewports.
		// Specific contexts (`body > nav`, `nav > ol`) add their own layouts.
		const el = render('nav', '')
		expect(style(el, 'display')).toBe('block')
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

describe('nav — inner list defaults to vertical block; horizontal flex is opt-in via aria-label', () => {
	it('plain <nav><ol> stays in vertical block flow (TOC, sub-nav, etc.)', () => {
		const nav = build('nav')
		const ol = build('ol')
		ol.appendChild(build('li', '', 'Home'))
		ol.appendChild(build('li', '', 'Library'))
		ol.appendChild(build('li', '', 'Data'))
		nav.appendChild(ol)
		mount(nav)

		// Block flow — markers stripped, padding zeroed, but no flex / wrap.
		expect(style(ol, 'display')).toBe('block')
		expect(style(ol, 'list-style-type')).toBe('none')
		expect(pixels(ol, 'padding-left')).toBe(0)
	})

	it('plain <nav><ul> stays vertical too', () => {
		const nav = build('nav')
		const ul = build('ul')
		ul.appendChild(build('li', '', 'About'))
		ul.appendChild(build('li', '', 'Contact'))
		nav.appendChild(ul)
		mount(nav)

		expect(style(ul, 'display')).toBe('block')
		expect(style(ul, 'list-style-type')).toBe('none')
	})

	it('aria-label="Primary" navbar opts into horizontal flex', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Primary')
		const ul = build('ul')
		ul.appendChild(build('li', '', 'About'))
		ul.appendChild(build('li', '', 'Contact'))
		nav.appendChild(ul)
		mount(nav)

		expect(style(ul, 'display')).toBe('flex')
		expect(style(ul, 'flex-wrap')).toBe('wrap')
	})

	it('aria-label="Pagination" opts into horizontal flex without chevrons', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Pagination')
		const ol = build('ol')
		const first = build('li', '', '1')
		const second = build('li', '', '2')
		ol.appendChild(first)
		ol.appendChild(second)
		nav.appendChild(ol)
		mount(nav)

		expect(style(ol, 'display')).toBe('flex')
		// No chevron pseudo content for pagination.
		expect(globalThis.getComputedStyle(second, '::before').content).toBe('none')
	})
})

describe('nav — breadcrumb is opt-in via aria-label="Breadcrumb"', () => {
	it('plain `<nav><ol>` does NOT get chevron separators (could be pagination, TOC, etc.)', () => {
		const nav = build('nav')
		const ol = build('ol')
		const first = build('li', '', '1')
		const second = build('li', '', '2')
		ol.appendChild(first)
		ol.appendChild(second)
		nav.appendChild(ol)
		mount(nav)

		const before = globalThis.getComputedStyle(second, '::before').content
		// No pseudo-element content set — `none` is the empty default.
		expect(before).toBe('none')
	})

	it('`<nav aria-label="Breadcrumb"><ol>` paints chevrons between siblings', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Breadcrumb')
		const ol = build('ol')
		const first = build('li', '', 'Home')
		const second = build('li', '', 'Library')
		ol.appendChild(first)
		ol.appendChild(second)
		nav.appendChild(ol)
		mount(nav)

		const before = globalThis.getComputedStyle(second, '::before').content
		// The chevron's `content: ''` resolves to a quoted empty string.
		expect(before).not.toBe('none')
		// First-child is excluded.
		const firstBefore = globalThis.getComputedStyle(first, '::before').content
		expect(firstBefore).toBe('none')
	})
})
