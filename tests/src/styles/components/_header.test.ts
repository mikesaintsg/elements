// ============================================================================
//  components/_header.scss — bare <header> as page app bar inside the body
//  shell. Card-header chrome (article > header) is tested in _article.test.ts
//  and _body.test.ts already; this file focuses on the body-rooted variant.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (
			tag === 'MAIN' ||
			tag === 'HEADER' ||
			tag === 'ASIDE' ||
			tag === 'FOOTER' ||
			tag === 'NAV'
		) {
			child.remove()
		}
	}
})

describe('header — token surface', () => {
	it('exposes --set-header-* tokens on a bare <header>', () => {
		const el = render('header', '')
		expect(token(el, '--set-header-color').trim()).not.toBe('')
		expect(token(el, '--set-header-padding-inline').trim()).not.toBe('')
	})

	it('.primary tints the bottom border via the variant cascade', () => {
		const el = render('header', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-header-border-color').trim()).toBe(expected)
	})
})

describe('header — app-bar chrome inside the layout shell', () => {
	it('a bare <header> outside any shell has no chrome', () => {
		// Hero / landing pages put <header> outside a layout shell. The
		// framework should not auto-paint a compact app bar there.
		const el = render('header', '')
		expect(pixels(el, 'border-bottom-width')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('<header> + <main> as siblings of body activate app-bar chrome', () => {
		const header = build('header', '', 'App brand')
		const main = build('main', '', 'Page body')
		document.body.append(header, main)

		expect(pixels(header, 'border-bottom-width')).toBe(1)
		expect(pixels(header, 'padding-left')).toBeGreaterThan(0)
		expect(style(header, 'display')).toBe('flex')
		expect(style(header, 'align-items')).toBe('center')
	})
})
