// ============================================================================
//  components/_menu.scss — bare <menu> as toolbar / action row.
//  Article-context menu = card actions (justify-end);
//  Nav-context menu = vertical column.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, colorEqual, mount, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (tag === 'MAIN' || tag === 'NAV' || tag === 'MENU') {
			child.remove()
		}
	}
})

describe('menu — token surface', () => {
	it('exposes --set-menu-* tokens on a bare <menu>', () => {
		const el = render('menu', '')
		expect(token(el, '--set-menu-color').trim()).not.toBe('')
		expect(token(el, '--set-menu-gap').trim()).not.toBe('')
		expect(token(el, '--set-menu-justify-content').trim()).not.toBe('')
	})
})

describe('menu — bare horizontal toolbar', () => {
	it('flex row with no list markers', () => {
		const el = render('menu', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-wrap')).toBe('wrap')
		expect(style(el, 'list-style-type')).toBe('none')
		expect(pixels(el, 'margin-top')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('justify-content defaults to flex-start', () => {
		const el = render('menu', '')
		expect(style(el, 'justify-content')).toBe('flex-start')
	})

	it('<li> wrappers use display: contents so their children are flex items', () => {
		const menu = build('menu')
		const li = build('li')
		const button = build('button', '', 'Action')
		li.appendChild(button)
		menu.appendChild(li)
		mount(menu)

		expect(style(li, 'display')).toBe('contents')
	})
})

describe('menu — article context = card actions', () => {
	it('article menu has justify-content: flex-end', () => {
		const article = build('article')
		const menu = build('menu')
		article.appendChild(menu)
		mount(article)

		expect(style(menu, 'justify-content')).toBe('flex-end')
	})
})

describe('menu — nav-rail context = vertical column', () => {
	it('menu inside a body-shell nav rail goes vertical', () => {
		const nav = build('nav')
		const menu = build('menu')
		const main = build('main', '', 'Body')
		nav.appendChild(menu)
		document.body.append(nav, main)

		expect(style(menu, 'flex-direction')).toBe('column')
	})
})

describe('menu — nav-rail item defaults', () => {
	function buildRail(): { menu: HTMLElement; a: HTMLAnchorElement; button: HTMLButtonElement } {
		const nav = build('nav')
		const main = build('main', '', 'Body')
		const menu = build('menu')
		const liA = build('li')
		const a = build('a', '', 'Link') as HTMLAnchorElement
		a.href = '#'
		liA.appendChild(a)
		const liB = build('li')
		const button = build('button', '', 'Cmd') as HTMLButtonElement
		liB.appendChild(button)
		menu.append(liA, liB)
		nav.appendChild(menu)
		document.body.append(nav, main)
		return { menu, a, button }
	}

	it('<a> inside a nav-rail menu drops the bare-anchor underline', () => {
		const { a } = buildRail()
		expect(style(a, 'text-decoration-line')).toBe('none')
	})

	it('<a> inside a nav-rail menu uses --color-text (not --color-primary)', () => {
		const { a } = buildRail()
		expect(colorEqual(style(a, 'color'), 'var(--color-text)')).toBe(true)
	})

	it('<a> inside a nav-rail menu paints start-aligned and full-width', () => {
		const { a } = buildRail()
		expect(style(a, 'display')).toBe('flex')
		expect(style(a, 'justify-content')).toBe('flex-start')
		expect(style(a, 'text-align')).toBe('start')
	})

	it('<button> inside a nav-rail menu strips the framework button chrome', () => {
		const { button } = buildRail()
		// Bare-button baseline is `inline-flex` + center; nav-rail rule
		// re-orients to flex / start / full-width.
		expect(style(button, 'display')).toBe('flex')
		expect(style(button, 'text-align')).toBe('start')
		expect(pixels(button, 'border-top-width')).toBe(0)
	})

	it('aria-current="page" overlays the active affordance', () => {
		const { a } = buildRail()
		a.setAttribute('aria-current', 'page')
		const bg = style(a, 'background-color')
		expect(bg).not.toBe('rgba(0, 0, 0, 0)')
		expect(bg).not.toBe('transparent')
		expect(colorEqual(bg, 'var(--color-primary-bg-subtle)')).toBe(true)
	})
})

describe('menu — aside (TOC) item defaults', () => {
	function buildToc(): { a: HTMLAnchorElement } {
		const aside = build('aside')
		const main = build('main', '', 'Body')
		const menu = build('menu')
		const li = build('li')
		const a = build('a', '', 'Section') as HTMLAnchorElement
		a.href = '#'
		li.appendChild(a)
		menu.appendChild(li)
		aside.appendChild(menu)
		document.body.append(main, aside)
		return { a }
	}

	it('<a> inside an aside menu drops the bare-anchor underline', () => {
		const { a } = buildToc()
		expect(style(a, 'text-decoration-line')).toBe('none')
	})

	it('<a> inside an aside menu reads as muted metadata', () => {
		const { a } = buildToc()
		expect(colorEqual(style(a, 'color'), 'var(--color-text-muted)')).toBe(true)
	})
})

describe('menu — touch-action contract on nav-rail interactive rows', () => {
	// Regression: an earlier version of `_menu.scss` left
	// `body:has(main) > nav menu > li > :where(a, button)` at the UA
	// default `touch-action: auto`. On iOS Safari that meant the
	// browser's heuristic about which gesture (scroll vs tap) to
	// dispatch had to "decide" between scrolling the rail and
	// activating the link — and inside a top-layer popover drawer it
	// frequently chose tap, blocking scroll-on-link entirely. Users
	// could only scroll the rail by swiping non-interactive whitespace.
	// Fix: explicit `touch-action: pan-y` so the contract is declarative.
	it('nav-rail menu `<a>` rows declare `touch-action: pan-y`', () => {
		const nav = build('nav')
		const main = build('main', '', 'Body')
		const menu = build('menu')
		const li = build('li')
		const a = build('a', '', 'Link') as HTMLAnchorElement
		a.href = '#'
		li.appendChild(a)
		menu.appendChild(li)
		nav.appendChild(menu)
		document.body.append(nav, main)

		expect(style(a, 'touch-action')).toBe('pan-y')
	})

	it('aside-TOC menu `<a>` rows declare `touch-action: pan-y` (same iOS contract)', () => {
		const aside = build('aside')
		const main = build('main', '', 'Body')
		const menu = build('menu')
		const li = build('li')
		const a = build('a', '', 'Section') as HTMLAnchorElement
		a.href = '#'
		li.appendChild(a)
		menu.appendChild(li)
		aside.appendChild(menu)
		document.body.append(main, aside)

		expect(style(a, 'touch-action')).toBe('pan-y')
	})

	it('a bare <menu> outside any popover gets the toolbar shape, not dropdown chrome', () => {
		// Regression-adjacent: the dropdown chrome (`overflow-block:
		// auto`, `min-inline-size: 12rem`, `flex-wrap: nowrap`) used to
		// over-match into nav-rail menus. The bare-menu toolbar shape
		// stays `flex-wrap: wrap` and no overflow-block auto.
		const menu = build('menu')
		mount(menu)

		expect(style(menu, 'flex-direction')).toBe('row')
		expect(style(menu, 'flex-wrap')).toBe('wrap')
	})
})
