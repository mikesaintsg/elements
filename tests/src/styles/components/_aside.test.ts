// ============================================================================
//  components/_aside.scss — bare <aside> as sidebar (in body shell) or
//  callout (in <article>). Disambiguated by ancestor context, no class.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, render, rootToken, style, token } from '../../../setupStyles'

afterEach(() => {
	// Tests in this file mount things on document.body to exercise body-rooted
	// rules. Clean up direct sectioning children.
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (
			tag === 'MAIN' ||
			tag === 'ASIDE' ||
			tag === 'HEADER' ||
			tag === 'FOOTER' ||
			tag === 'NAV'
		) {
			child.remove()
		}
	}
})

describe('aside — token surface (declared on bare element)', () => {
	it('exposes --set-aside-* tokens on a bare <aside>', () => {
		const el = render('aside', '')
		// A handful of representative tokens — full surface is parity-tested.
		expect(token(el, '--set-aside-color').trim()).not.toBe('')
		expect(token(el, '--set-aside-padding-inline').trim()).not.toBe('')
		expect(token(el, '--set-aside-inline-size').trim()).not.toBe('')
	})

	it('.primary tints the border via the variant cascade', () => {
		const el = render('aside', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-aside-border-color').trim()).toBe(expected)
	})
})

describe('aside — sidebar chrome only paints inside the layout shell', () => {
	it('a bare <aside> outside any shell has no chrome', () => {
		const el = render('aside', '')
		// Chrome rule is scoped to `body:has(main) > aside` — without a main
		// sibling, no padding / border / sized inline-size apply.
		expect(pixels(el, 'border-left-width')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('<aside> + <main> as siblings of body activate sidebar chrome', () => {
		const main = build('main', '', 'Page body')
		const aside = build('aside', '', 'Sidebar')
		document.body.append(main, aside)

		expect(pixels(aside, 'border-left-width')).toBe(1)
		expect(pixels(aside, 'padding-left')).toBeGreaterThan(0)
		expect(style(aside, 'overflow-y')).toBe('auto')
	})

	it('.start modifier flips the border to the inline-end edge', () => {
		const main = build('main', '', 'Page body')
		const aside = build('aside', 'start', 'Leading sidebar')
		document.body.append(main, aside)

		expect(pixels(aside, 'border-left-width')).toBe(0)
		expect(pixels(aside, 'border-right-width')).toBe(1)
	})
})

describe('aside — article descendant becomes a callout', () => {
	it('article aside has the leading bar + italic + indent', () => {
		const article = build('article')
		const aside = build('aside', '', 'Tangentially related note')
		article.appendChild(aside)
		mount(article)

		// Leading bar — non-zero inline-start border.
		expect(pixels(aside, 'border-left-width')).toBe(4)
		// Italic body.
		expect(style(aside, 'font-style')).toBe('italic')
		// Indent.
		expect(pixels(aside, 'padding-left')).toBeGreaterThan(0)
		// Background reset (sidebars set their own bg; callouts stay transparent).
		expect(style(aside, 'background-color')).toBe('rgba(0, 0, 0, 0)')
	})

	it('article aside uses --set-callout-* tokens (not --set-aside-*)', () => {
		const article = build('article')
		const aside = build('aside', '', 'Note')
		article.appendChild(aside)
		mount(article)

		expect(token(aside, '--set-callout-bar-width').trim()).toBe('4px')
		expect(token(aside, '--set-callout-padding-inline').trim()).not.toBe('')
	})
})

describe('aside — body-shell rail sticky pin only applies in-flow', () => {
	// Regression: an earlier framework rule pinned the drawer header
	// with `position: sticky` regardless of whether the rail was
	// in-flow or popover-mode. On popover-mode rails (the body-shell
	// rails on mobile when their `:popover="isMobile ? 'auto' :
	// undefined"` binding takes effect) the sticky pin fought the
	// drawer's own flex-column layout and pulled the header band
	// above the drawer's outer edge. Fix: scope the framework's
	// sticky-pin rule to `body:has(main) > nav:not([popover]) >
	// header` (and `> aside:not([popover]) > header`) so popover-mode
	// rails leave the band as a normal flex child.
	it('in-flow `<nav>` rail header gets `position: sticky` from the framework', () => {
		const nav = build('nav', '', 'Sidebar')
		const main = build('main', '', 'Body')
		const header = build('header')
		nav.appendChild(header)
		document.body.append(nav, main)

		expect(style(header, 'position')).toBe('sticky')
	})

	it('popover-mode `<nav>` rail header does NOT get the sticky pin', () => {
		const nav = build('nav', '', 'Sidebar')
		nav.setAttribute('popover', '')
		const main = build('main', '', 'Body')
		const header = build('header')
		nav.appendChild(header)
		document.body.append(nav, main)
		nav.showPopover()

		expect(style(header, 'position')).not.toBe('sticky')

		nav.hidePopover()
	})

	it('popover-mode `<aside>` rail header does NOT get the sticky pin', () => {
		const aside = build('aside', '', 'TOC')
		aside.setAttribute('popover', '')
		const main = build('main', '', 'Body')
		const header = build('header')
		aside.appendChild(header)
		document.body.append(main, aside)
		aside.showPopover()

		expect(style(header, 'position')).not.toBe('sticky')

		aside.hidePopover()
	})
})

describe('aside — `<aside popover>` overrides anchor-position cap', () => {
	// Regression: the popover surface declares `max-inline-size:
	// var(--set-anchor-max-inline-size)` (= 18 rem) on `[popover]:not
	// (output)`. Drawers want viewport-edge geometry, not anchor-
	// positioned panels capped at 18 rem. Fix: `:is(aside, nav)
	// [popover]` lifts `--set-popover-max-inline-size`,
	// `--set-anchor-max-inline-size`, and `--set-popover-viewport-
	// inset` to 100 dvw / 0 so the surface's clamp formula collapses
	// to "no clamp" for drawers.
	it('an `<aside popover>` lifts the anchor cap so the drawer can be edge-to-edge', () => {
		const aside = build('aside')
		aside.setAttribute('popover', '')
		mount(aside)
		aside.showPopover()

		// `--set-popover-max-inline-size` should be 100 dvw on the
		// drawer (NOT the 17.25 rem popover-surface default).
		const cap = token(aside, '--set-popover-max-inline-size').trim()
		expect(cap).toContain('100dvw')

		aside.hidePopover()
	})

	it('a `<nav popover>` ALSO lifts the anchor cap (same drawer chrome)', () => {
		const nav = build('nav')
		nav.setAttribute('popover', '')
		mount(nav)
		nav.showPopover()

		const cap = token(nav, '--set-popover-max-inline-size').trim()
		expect(cap).toContain('100dvw')

		nav.hidePopover()
	})
})

// ── aside-as-alert banner ──────────────────────────────────────────────────
//
// Aside's third context (alongside body-shell sidebar and article callout):
// when `role="alert"` is present, `_aside.scss` flips the shape into a
// flex-row banner with a leading variant bar and a trailing dismiss
// affordance. `useAlert` toggles `[data-alert-open]` to drive the
// open/closed chrome; static markup that wants the alert visible from the
// start sets the attribute up front (its absence is the dismissed state).

describe('aside-as-alert — `<aside role="alert">` banner', () => {
	it('exposes --set-alert-* tokens on :root', () => {
		expect(rootToken('--set-alert-color').trim()).not.toBe('')
		expect(rootToken('--set-alert-border-color').trim()).not.toBe('')
		expect(rootToken('--set-alert-bar-width').trim()).not.toBe('')
	})

	it('paints a flex row with a leading variant bar', () => {
		const aside = render('aside', 'danger')
		aside.setAttribute('role', 'alert')
		aside.setAttribute('data-alert-open', '')
		mount(aside)
		expect(style(aside, 'display')).toBe('flex')
		// Leading bar: thicker inline-start border (not the regular container border).
		expect(pixels(aside, 'border-inline-start-width')).toBeGreaterThan(2)
	})

	it('a trailing dismiss `<button>` is pushed to the inline-end edge', () => {
		const aside = render('aside', '')
		aside.setAttribute('role', 'alert')
		aside.setAttribute('data-alert-open', '')
		const text = document.createElement('span')
		text.textContent = 'Heads up.'
		const close = document.createElement('button')
		close.setAttribute('aria-label', 'Dismiss')
		close.textContent = '×'
		aside.append(text, close)
		mount(aside)
		// `margin-inline-start: auto` is the "push to end" convention.
		expect(style(close, 'margin-inline-start')).not.toBe('0px')
	})
})
