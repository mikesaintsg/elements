// ============================================================================
//  components/_nav.scss — bare <nav> as navigation. Variant shape comes from
//  descendant content (inner <ol> = breadcrumb; otherwise flex row / rail).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, colorEqual, mount, pixels, render, style, token } from '../../../setupStyles'

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

describe('nav — pagination chrome', () => {
	function buildPagination(activeIndex: number = 1): {
		nav: HTMLElement
		anchors: HTMLAnchorElement[]
	} {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Pagination')
		const ol = build('ol')
		const anchors: HTMLAnchorElement[] = []
		for (let i = 0; i < 3; i++) {
			const li = build('li')
			const a = build('a', '', `${i + 1}`) as HTMLAnchorElement
			a.href = '#'
			if (i === activeIndex) a.setAttribute('aria-current', 'page')
			li.appendChild(a)
			ol.appendChild(li)
			anchors.push(a)
		}
		nav.appendChild(ol)
		mount(nav)
		return { nav, anchors }
	}

	it('the active page tile paints the primary fill via the variant cascade', () => {
		const { anchors } = buildPagination(1)
		const active = anchors[1]
		// `aria-current="page"` flips background to
		// `--set-nav-pagination-active-background-color`, which defaults
		// to `--color-primary`. Resolved value should be the primary
		// theme color (not the bare-tile transparent default).
		// `colorEqual` normalises between `oklch(0.546 …)` (computed)
		// and `oklch(54.6% …)` (custom-property declaration) forms.
		const bg = style(active, 'background-color')
		expect(colorEqual(bg, 'var(--color-primary)')).toBe(true)
	})

	it('the active page tile reads white-on-fill (every variant takes white text)', () => {
		const { anchors } = buildPagination(1)
		const active = anchors[1]
		expect(style(active, 'color')).toBe('rgb(255, 255, 255)')
	})

	it('an `aria-disabled="true"` tile mutes its opacity below 1', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Pagination')
		const ol = build('ol')
		const li = build('li')
		const a = build('a', '', 'Prev') as HTMLAnchorElement
		a.href = '#'
		a.setAttribute('aria-disabled', 'true')
		li.appendChild(a)
		ol.appendChild(li)
		nav.appendChild(ol)
		mount(nav)

		expect(Number(style(a, 'opacity'))).toBeLessThan(1)
		expect(style(a, 'pointer-events')).toBe('none')
	})
})

describe('nav — `.fill` / `.justified` modifiers on inner list', () => {
	it('`.fill` grows items proportionally (`flex: 1 1 auto`)', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Primary')
		const ol = build('ol')
		ol.classList.add('fill')
		const li = build('li')
		li.textContent = 'Item'
		ol.appendChild(li)
		nav.appendChild(ol)
		mount(nav)

		expect(style(li, 'flex-grow')).toBe('1')
	})

	it('`.justified` gives every item equal flex-basis (zero)', () => {
		const nav = build('nav')
		nav.setAttribute('aria-label', 'Primary')
		const ol = build('ol')
		ol.classList.add('justified')
		const li = build('li')
		li.textContent = 'Item'
		ol.appendChild(li)
		nav.appendChild(ol)
		mount(nav)

		expect(style(li, 'flex-grow')).toBe('1')
		expect(style(li, 'flex-basis')).toBe('0px')
	})
})

describe('nav — tablist has no opinionated baseline track', () => {
	// Regression: an earlier version of `_nav.scss` painted a continuous
	// `border-block-end` on `[role='tablist']` (Mailbox / Bootstrap
	// stretched-row look). User feedback was that it read as opinionated
	// chrome the framework hadn't earned — the bare tablist now relies
	// entirely on the active tab's own bottom-border indicator. Style
	// variants live in `composables/_tabs.scss` (`.pills` / `.bordered`
	// / `.vertical`) and earn their chrome under `useTabs`.
	it('a bare [role="tablist"] paints NO continuous bottom-border track', () => {
		const tablist = build('nav', '', 'Test')
		tablist.setAttribute('role', 'tablist')
		const tab = build('button')
		tab.setAttribute('role', 'tab')
		tab.setAttribute('aria-selected', 'true')
		tablist.appendChild(tab)
		mount(tablist)

		expect(pixels(tablist, 'border-bottom-width')).toBe(0)
	})

	it('the active tab paints its own bottom-border indicator', () => {
		const tablist = build('nav', '', 'Test')
		tablist.setAttribute('role', 'tablist')
		const tab = build('button')
		tab.setAttribute('role', 'tab')
		tab.setAttribute('aria-selected', 'true')
		tablist.appendChild(tab)
		mount(tablist)

		// `--set-tab-active-indicator-size` defaults to 2 px; the
		// `[role='tab']` baseline declares `border-block-end: var(...)
		// solid transparent` and the [aria-selected="true"] rule flips
		// the colour to the variant identity. Without a continuous
		// tablist track to overlap, no negative margin is needed.
		expect(pixels(tab, 'border-bottom-width')).toBeGreaterThan(0)
		expect(pixels(tab, 'margin-bottom')).toBe(0)
	})

	it('inactive tabs keep a transparent bottom-border (placeholder for the indicator)', () => {
		const tablist = build('nav', '', 'Test')
		tablist.setAttribute('role', 'tablist')
		const tab = build('button')
		tab.setAttribute('role', 'tab')
		tab.setAttribute('aria-selected', 'false')
		tablist.appendChild(tab)
		mount(tablist)

		expect(pixels(tab, 'border-bottom-width')).toBeGreaterThan(0)
		// The indicator paints transparent until selected, so layout
		// doesn't shift between the active and inactive tab box.
		// `transparent` resolves to `rgba(0, 0, 0, 0)` in computed
		// styles, so check either form.
		const color = style(tab, 'border-bottom-color')
		const isTransparent =
			color.includes('transparent') ||
			color.includes('rgba(0, 0, 0, 0)') ||
			color.replace(/\s+/g, '') === 'rgba(0,0,0,0)'
		expect(isTransparent).toBe(true)
	})
})

describe('nav — `<nav popover>` shares the offcanvas drawer chrome with `<aside popover>`', () => {
	// Regression: the body-shell rails (`<nav>` / `<aside>` direct
	// children of `<body>`) opt into popover mode on mobile via a
	// `:popover="isMobile ? 'auto' : undefined"` binding and inherit
	// the framework's canonical `:is(aside, nav)[popover]` drawer
	// chrome from `components/_aside.scss`. The earlier `<div class=
	// "showcase-backdrop">` + `[data-open]` machinery is gone; the
	// rails ride native `::backdrop` directly.

	it('a `<nav popover>` opts into the drawer transform (defaults to inline-start slide)', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		mount(nav)
		nav.showPopover()

		// `nav[popover]` overrides the shared `:is(aside, nav)[popover]`
		// default of trailing-edge slide with leading-edge slide (the
		// iOS / Material / Bootstrap navigation-drawer convention).
		// `:popover-open` flips transform to translateX(0); we test the
		// open-state value here since closed popovers are
		// `display: none` and computed transform is unreliable.
		expect(style(nav, 'transform')).not.toBe('none')

		nav.hidePopover()
	})

	it('a `<nav popover>` picks up the drawer container chrome (padding tokens + scroll)', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		mount(nav)
		nav.showPopover()

		// `:is(aside, nav)[popover]` declares the popover-padding tokens
		// (consumed by the popover surface as `padding-inline` /
		// `padding-block`). The drawer is `overflow-y: auto`.
		expect(token(nav, '--set-popover-padding-inline').trim()).not.toBe('')
		expect(style(nav, 'overflow-y')).toBe('auto')

		nav.hidePopover()
	})

	it('a `<nav popover> > <header>:first-child` picks up the drawer band chrome (edge bleed)', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		const header = build('header')
		nav.appendChild(header)
		mount(nav)
		nav.showPopover()

		// Drawer-band rule `:is(aside, nav)[popover] > header:first-
		// child` ships `margin-inline: calc(--set-aside-drawer-padding-
		// inline * -1)` so the band bleeds past the drawer's own
		// padding to reach the outer edges. A negative inline-start
		// margin is the marker.
		expect(pixels(header, 'margin-left')).toBeLessThan(0)

		nav.hidePopover()
	})

	it('a `<nav popover>` body-shell rail keeps `transform` in its element-level transition list', () => {
		// Regression captured in plan.md §9.7 "Transition shorthand vs
		// cascade order audit": `_nav.scss` and `_aside.scss` both
		// declared `transition: color, bg, border` on `body:has(main) >
		// {nav, aside}`, and an earlier `_body.scss` mobile-drawer
		// `@media` declared `transition: transform`. Components barrel
		// import order `_aside.scss` → `_body.scss` → `_nav.scss` meant
		// the transform-transition was STRIPPED from the nav element
		// rule (transition shorthand replaces, doesn't merge). Left
		// drawer snapped, right drawer slid. Fix: include the transform
		// entry in the element-level transition lists in `_nav.scss` +
		// `_aside.scss` so cascade order can't break the slide.
		const nav = build('nav', '', 'Sidebar')
		const main = build('main', '', 'Body')
		document.body.append(nav, main)

		// The transition value is a long comma-separated list. Search
		// for the transform entry that ties into the motion contract.
		const transition = style(nav, 'transition')
		expect(transition).toContain('transform')
	})

	it('a `<menu>` inside `<nav popover>` does NOT pick up the dropdown-menu chrome', () => {
		// Regression: an earlier `[popover] menu` selector in `_menu.scss`
		// over-matched. A `<menu>` inside a `<nav popover>` body (the
		// grouped-sidebar pattern) inherited the dropdown chrome
		// including `overflow-block: auto` and `min-inline-size: 12rem`,
		// which made the menu a competing scroll container and broke
		// iOS Safari touch-scroll on links. Scoped to
		// `menu[popover], [popover]:not(aside):not(nav) menu`.
		const nav = build('nav')
		nav.setAttribute('popover', '')
		const menu = build('menu')
		const li = build('li')
		const a = build('a')
		li.appendChild(a)
		menu.appendChild(li)
		nav.appendChild(menu)
		mount(nav)
		nav.showPopover()

		// The bare-menu shape uses `flex-wrap: wrap` (toolbar default);
		// the dropdown shape uses `flex-wrap: nowrap` + `overflow-block:
		// auto` + a 12 rem `min-inline-size` floor. We assert the
		// dropdown overflow + min-inline-size DO NOT appear.
		expect(style(menu, 'overflow-block')).not.toBe('auto')
		expect(style(menu, 'overflow-block')).not.toBe('scroll')
		expect(style(menu, 'min-inline-size')).not.toBe('192px') // 12rem at 16px root

		nav.hidePopover()
	})
})
