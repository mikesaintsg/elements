// ============================================================================
//  _section.scss — sectioning-content baseline.
//
//  `<section>` is "a thematic grouping of content, typically with a heading"
//  per the HTML Living Standard. The framework treats it as a hydrated
//  container so a bare section ships with proper vertical padding and a
//  flex-column gap — no manual `<div class="stack">` needed. Successive
//  nested sections collapse their padding-block so consumers don't pay the
//  spacing budget twice.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (tag === 'MAIN' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'HGROUP') {
			child.remove()
		}
	}
})

describe('section — bare baseline', () => {
	it('uses a flex-column layout so children stack with consistent rhythm', () => {
		const el = render('section', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
	})

	it('declares the --set-section-* token surface', () => {
		const el = render('section', '')
		expect(token(el, '--set-section-padding-block')).not.toBe('')
		expect(token(el, '--set-section-gap')).not.toBe('')
		expect(token(el, '--set-section-scroll-margin')).not.toBe('')
	})

	it('paints vertical padding-block from the framework', () => {
		const el = render('section', '')
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-bottom')).toBeGreaterThan(0)
	})

	it('keeps inline padding to zero (parent owns the gutter)', () => {
		const el = render('section', '')
		expect(pixels(el, 'padding-left')).toBe(0)
		expect(pixels(el, 'padding-right')).toBe(0)
	})

	it('paints no border or box-shadow by default', () => {
		const el = render('section', '')
		expect(pixels(el, 'border-top-width')).toBe(0)
		expect(style(el, 'box-shadow')).toBe('none')
	})

	it('sets a flex gap so children breathe without per-child margins', () => {
		const el = render('section', '')
		expect(pixels(el, 'row-gap')).toBeGreaterThan(0)
	})
})

describe('section — nesting collapse', () => {
	it('a <section> directly inside <main> drops its own padding-block', () => {
		const main = build('main')
		const section = build('section')
		main.appendChild(section)
		document.body.appendChild(main)

		expect(pixels(section, 'padding-top')).toBe(0)
		expect(pixels(section, 'padding-bottom')).toBe(0)
	})

	it('a nested <section> inside another <section> drops its own padding-block', () => {
		const outer = build('section')
		const inner = build('section')
		outer.appendChild(inner)
		document.body.appendChild(outer)

		expect(pixels(inner, 'padding-top')).toBe(0)
		expect(pixels(inner, 'padding-bottom')).toBe(0)
	})

	it('a <section> inside <article> drops its own padding-block', () => {
		const article = build('article')
		const section = build('section')
		article.appendChild(section)
		document.body.appendChild(article)

		expect(pixels(section, 'padding-top')).toBe(0)
		expect(pixels(section, 'padding-bottom')).toBe(0)
	})
})
