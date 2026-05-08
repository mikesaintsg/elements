// ============================================================================
//  _select.scss — UA reset, chevron, multiple-mode, cascade.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { pixels, render, style, token } from '../../../setupStyles'

describe('select — UA reset', () => {
	it('removes native appearance', () => {
		const el = render('select', '')
		expect(style(el, 'appearance')).toBe('none')
	})

	it('reserves extra padding-inline-end for the chevron', () => {
		const el = render('select', '')
		expect(pixels(el, 'padding-right')).toBeGreaterThan(pixels(el, 'padding-left'))
	})

	it('paints a chevron via background-image by default', () => {
		const el = render('select', '')
		expect(style(el, 'background-image')).not.toBe('none')
	})

	it('cursor is pointer by default', () => {
		const el = render('select', '')
		expect(style(el, 'cursor')).toBe('pointer')
	})
})

describe('select — multiple/list-box mode', () => {
	it('[multiple] hides the chevron', () => {
		const el = render('select', '')
		el.multiple = true
		expect(style(el, 'background-image')).toBe('none')
	})

	it('[size>1] hides the chevron', () => {
		const el = render('select', '')
		el.setAttribute('size', '5')
		expect(style(el, 'background-image')).toBe('none')
	})
})

describe('select — variant cascade', () => {
	it('.primary moves the border to the primary color', () => {
		const el = render('select', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(el, '--set-select-border-color').trim()).toBe(expected)
	})
})

describe('select — disabled', () => {
	it('disabled applies not-allowed cursor', () => {
		const el = render('select', '')
		el.disabled = true
		expect(style(el, 'cursor')).toBe('not-allowed')
	})
})
