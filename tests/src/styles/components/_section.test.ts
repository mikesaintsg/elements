// ============================================================================
//  components/_section.scss — intentionally absent.
//
//  `<section>` is "a thematic grouping of content, typically with a heading"
//  per the HTML Living Standard. It's deliberately too generic for the
//  framework to opinionate on chrome — sections are everywhere (chapters,
//  marketing blocks, settings groups, doc pages...). Whatever visual shape a
//  particular section takes is the consumer's call.
//
//  These tests pin that "no chrome" decision so a future contributor doesn't
//  accidentally add styling to bare `<section>` and break consumers (like the
//  showcase pages, which use `<section>` as their wrapper).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, pixels, render, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (tag === 'MAIN' || tag === 'SECTION' || tag === 'ARTICLE') child.remove()
	}
})

describe('section — bare element has no framework chrome', () => {
	it('a bare <section> has no padding from the framework', () => {
		const el = render('section', '')
		expect(pixels(el, 'padding-top')).toBe(0)
		expect(pixels(el, 'padding-bottom')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
		expect(pixels(el, 'padding-right')).toBe(0)
	})

	it('a bare <section> has no border from the framework', () => {
		const el = render('section', '')
		expect(pixels(el, 'border-top-width')).toBe(0)
		expect(pixels(el, 'border-bottom-width')).toBe(0)
		expect(pixels(el, 'border-left-width')).toBe(0)
		expect(pixels(el, 'border-right-width')).toBe(0)
	})

	it('a bare <section> has no shadow from the framework', () => {
		const el = render('section', '')
		expect(style(el, 'box-shadow')).toBe('none')
	})

	it('a bare <section> uses the default block display (no flex / grid imposed)', () => {
		const el = render('section', '')
		expect(style(el, 'display')).toBe('block')
	})

	it('a <section> inside <article> does NOT pick up card-slot chrome', () => {
		// Card-slot chrome is reserved for `<header>` / `<footer>` direct
		// children of `<article>`. A nested `<section>` inside an article
		// should remain unstyled.
		const article = build('article')
		const section = build('section', '', 'inner content')
		article.appendChild(section)
		document.body.appendChild(article)

		expect(style(section, 'background-color')).toBe('rgba(0, 0, 0, 0)')
		expect(pixels(section, 'border-top-width')).toBe(0)
	})
})
