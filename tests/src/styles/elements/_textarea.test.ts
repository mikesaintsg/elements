// ============================================================================
//  _textarea.scss — UA reset + cascade + multi-line ergonomics.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { pixels, render, style, token } from '../../../setupStyles'

describe('textarea — UA reset', () => {
	it('removes native appearance', () => {
		const el = render('textarea', '')
		expect(style(el, 'appearance')).toBe('none')
	})

	it('forces resize to vertical (UA default is both)', () => {
		const el = render('textarea', '')
		expect(style(el, 'resize')).toBe('vertical')
	})

	it('applies a min-block-size for usable click target', () => {
		const el = render('textarea', '')
		expect(pixels(el, 'min-height')).toBeGreaterThan(0)
	})

	it('applies a 1px border', () => {
		const el = render('textarea', '')
		expect(pixels(el, 'border-top-width')).toBe(1)
	})
})

describe('textarea — variant cascade', () => {
	it('.primary moves the border to the primary color', () => {
		const el = render('textarea', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-textarea-border-color').trim()).toBe(expected)
	})
})

describe('textarea — disabled', () => {
	it('disabled removes resize handle and applies not-allowed cursor', () => {
		const el = render('textarea', '')
		el.disabled = true
		expect(style(el, 'cursor')).toBe('not-allowed')
		expect(style(el, 'resize')).toBe('none')
	})
})
