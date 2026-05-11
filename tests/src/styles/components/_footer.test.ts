// ============================================================================
//  components/_footer.scss — bare <footer> as page footer inside the body
//  shell. Card-footer chrome (article > footer) is tested in _article.test.ts
//  separately.
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

describe('footer — token surface', () => {
	it('exposes --set-footer-* tokens on a bare <footer>', () => {
		const el = render('footer', '')
		expect(token(el, '--set-footer-color').trim()).not.toBe('')
		expect(token(el, '--set-footer-padding-inline').trim()).not.toBe('')
	})

	it('.primary tints the top border via the variant cascade', () => {
		const el = render('footer', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-footer-border-color').trim()).toBe(expected)
	})
})

describe('footer — chrome inside the layout shell', () => {
	it('a bare <footer> outside any shell has no chrome', () => {
		const el = render('footer', '')
		expect(pixels(el, 'border-top-width')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('<footer> + <main> as siblings of body activate footer chrome', () => {
		const main = build('main', '', 'Page body')
		const footer = build('footer', '', '© 2026')
		document.body.append(main, footer)

		expect(pixels(footer, 'border-top-width')).toBe(1)
		expect(pixels(footer, 'padding-left')).toBeGreaterThan(0)
		expect(style(footer, 'display')).toBe('flex')
	})
})

describe('footer — anchor-as-footer-item defaults', () => {
	it('<a> inside the page footer drops the bare-anchor underline', () => {
		const main = build('main')
		const footer = build('footer')
		const a = build('a', '', 'Imprint')
		footer.appendChild(a)
		document.body.append(main, footer)

		expect(style(a, 'text-decoration-line')).toBe('none')
	})

	it('<a> inside the page footer inherits the muted footer color', () => {
		const main = build('main')
		const footer = build('footer')
		const a = build('a', '', 'Imprint')
		footer.appendChild(a)
		document.body.append(main, footer)

		expect(style(a, 'color')).toBe(style(footer, 'color'))
	})
})
