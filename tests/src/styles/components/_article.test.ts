// ============================================================================
//  components/_article.scss — bare <article> as the framework's card.
//
//  The element IS the component: no `.card` class. Every card is just an
//  <article>; modifiers (variant / style / size / state) cascade from the
//  same vocabulary used everywhere else.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

describe('article — bare element renders as card', () => {
	it('paints chrome (padding, border, radius, shadow) on a bare <article>', () => {
		const el = render('article', '')
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-left')).toBeGreaterThan(0)
		expect(pixels(el, 'border-top-width')).toBe(1)
		expect(pixels(el, 'border-top-left-radius')).toBeGreaterThan(0)
		expect(style(el, 'box-shadow')).not.toBe('none')
	})

	it('lays out children as a flex column with gap', () => {
		const el = render('article', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})

	it('registers as a size container named "article"', () => {
		const el = render('article', '')
		expect(style(el, 'container-name')).toBe('article')
		expect(style(el, 'container-type')).toBe('inline-size')
	})
})

describe('article — modifier cascade reaches --set-article-* tokens', () => {
	it('.primary tints the border via the variant cascade', () => {
		const el = render('article', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-article-border-color').trim()).toBe(expected)
	})

	it('.primary alone does NOT fill the background (cards stay neutral until .filled)', () => {
		// Cards are containers. Unlike buttons, a bare `.primary` does not
		// flood the surface — only `.filled` opts into that.
		const el = render('article', 'primary')
		const primary = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-article-background-color').trim()).not.toBe(primary)
	})

	it('.filled fills the background with the variant color', () => {
		const el = render('article', 'primary filled')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-article-background-color').trim()).toBe(expected)
	})

	it('.large bumps padding from the size context', () => {
		const small = render('article', 'small')
		const large = render('article', 'large')
		expect(pixels(large, 'padding-left')).toBeGreaterThan(pixels(small, 'padding-left'))
	})

	it('.disabled dims the article and disables pointer events', () => {
		const el = render('article', 'disabled')
		expect(parseFloat(style(el, 'opacity'))).toBeLessThan(1)
		expect(style(el, 'pointer-events')).toBe('none')
	})
})

describe('article — descendant <header>/<footer> get card slot chrome', () => {
	it('article > header gets a tinted band with a bottom separator', () => {
		const article = build('article')
		const header = build('header', '', 'Title')
		article.appendChild(header)
		mount(article)
		// Subtle tint applies a non-transparent background.
		expect(style(header, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
		// Separator at the bottom.
		expect(pixels(header, 'border-bottom-width')).toBe(1)
	})

	it('article > footer gets a tinted band with a top separator', () => {
		const article = build('article')
		const footer = build('footer', '', 'Actions')
		article.appendChild(footer)
		mount(article)
		expect(style(footer, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
		expect(pixels(footer, 'border-top-width')).toBe(1)
	})

	it('article > header bleeds to the inner edge: inline negative margin + zeroed top padding', () => {
		const article = build('article')
		const header = build('header', '', 'Title')
		article.appendChild(header)
		mount(article)
		// Inline negative margins pull the header to the article's inner
		// padding edge (left/right).
		expect(pixels(header, 'margin-left')).toBeLessThan(0)
		expect(pixels(header, 'margin-right')).toBeLessThan(0)
		// Vertical bleed is handled by zeroing the article's top padding when
		// a header is the first child (instead of a negative margin on the
		// header — which Tailwind's space-y-* utility would clobber).
		expect(pixels(article, 'padding-top')).toBe(0)
	})

	it('a non-direct-descendant <header> is NOT styled as a card slot', () => {
		// <article><div><header></header></div></article> — header is nested,
		// not a direct child, so the slot rule must not match.
		const article = build('article')
		const wrapper = build('div')
		const header = build('header', '', 'Inner')
		wrapper.appendChild(header)
		article.appendChild(wrapper)
		mount(article)
		// No tinted band on a non-direct header.
		expect(style(header, 'background-color')).toBe('rgba(0, 0, 0, 0)')
		expect(pixels(header, 'border-bottom-width')).toBe(0)
	})
})
