// ============================================================================
//  Phase 3 typography — heading cascade, hr, blockquote, code/kbd/samp/var,
//  pre, dl/dt/dd. Tests focus on shape: heading scale, override behavior,
//  inline-vs-block code, dl grid layout.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

describe('headings — shared cascade', () => {
	for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
		it(`<${tag}> renders the configured font-weight`, () => {
			const el = render(tag, '')
			expect(parseInt(style(el, 'font-weight'), 10)).toBe(600)
		})

		it(`<${tag}> renders text-wrap: balance`, () => {
			const el = render(tag, '')
			expect(style(el, 'text-wrap')).toBe('balance')
		})
	}

	it('per-level font-size descends from h1 to h6', () => {
		const sizes = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) =>
			pixels(render(tag, ''), 'font-size'),
		)
		for (let i = 1; i < sizes.length; i++) {
			const prev = sizes[i - 1] ?? 0
			const cur = sizes[i] ?? 0
			expect(cur).toBeLessThanOrEqual(prev)
		}
	})

	it('.primary tints heading via --set-heading-color', () => {
		const h2 = render('h2', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(h2, '--set-heading-color').trim()).toBe(expected)
	})
})

describe('hr — variant tracking', () => {
	it('renders a single border-block-start', () => {
		const hr = render('hr', '')
		expect(pixels(hr, 'border-top-width')).toBe(1)
		expect(pixels(hr, 'border-bottom-width')).toBe(0)
	})

	it('opacity defaults to 0.2', () => {
		const hr = render('hr', '')
		expect(parseFloat(style(hr, 'opacity'))).toBeCloseTo(0.2, 2)
	})

	it('.danger routes the border color through --set-hr-color', () => {
		const hr = render('hr', 'danger')
		const expected = style(document.documentElement, '--color-danger').trim()
		expect(token(hr, '--set-hr-color').trim()).toBe(expected)
	})
})

describe('blockquote — leading bar', () => {
	it('renders an inline-start border bar', () => {
		const bq = render('blockquote', '')
		expect(pixels(bq, 'border-left-width')).toBeGreaterThan(0)
	})

	it('renders inline-start padding', () => {
		const bq = render('blockquote', '')
		expect(pixels(bq, 'padding-left')).toBeGreaterThan(0)
	})

	it('font-style is italic', () => {
		const bq = render('blockquote', '')
		expect(style(bq, 'font-style')).toBe('italic')
	})
})

describe('code — inline vs block', () => {
	it('inline <code> has tinted background', () => {
		const code = render('code', '')
		code.textContent = 'foo'
		expect(style(code, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
	})

	it('<pre><code> drops the inline background', () => {
		const pre = build('pre', '')
		const code = build('code', '', 'foo')
		pre.appendChild(code)
		mount(pre)
		expect(style(code, 'background-color')).toBe('rgba(0, 0, 0, 0)')
	})
})

describe('kbd — keycap chrome', () => {
	it('renders a 1px border', () => {
		const k = render('kbd', '')
		k.textContent = 'Esc'
		expect(pixels(k, 'border-top-width')).toBe(1)
	})
})

describe('pre — block code', () => {
	it('renders padding + border + overflow-x: auto', () => {
		const pre = render('pre', '')
		pre.textContent = 'line\nline'
		expect(pixels(pre, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(pre, 'border-top-width')).toBe(1)
		expect(style(pre, 'overflow-x')).toBe('auto')
	})
})

describe('dl — grid layout', () => {
	it('renders as grid with 2 columns', () => {
		const dl = render('dl', '')
		expect(style(dl, 'display')).toBe('grid')
		expect(style(dl, 'grid-template-columns').split(' ').length).toBe(2)
	})

	it('dt is bold', () => {
		const dl = build('dl')
		const dt = build('dt', '', 'Term')
		const dd = build('dd', '', 'Description')
		dl.appendChild(dt)
		dl.appendChild(dd)
		mount(dl)
		expect(parseInt(style(dt, 'font-weight'), 10)).toBe(600)
	})

	it('dd has no inline-start margin', () => {
		const dl = build('dl')
		const dt = build('dt', '', 'Term')
		const dd = build('dd', '', 'Description')
		dl.appendChild(dt)
		dl.appendChild(dd)
		mount(dl)
		expect(pixels(dd, 'margin-left')).toBe(0)
	})
})
