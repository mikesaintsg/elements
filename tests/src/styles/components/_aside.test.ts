// ============================================================================
//  components/_aside.scss — bare <aside> as sidebar (in body shell) or
//  callout (in <article>). Disambiguated by ancestor context, no class.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

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
