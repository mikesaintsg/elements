// ============================================================================
//  _input.scss — UA reset, focus + variant cascade, disabled propagation.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, render, style, token } from '../../../setupStyles'

describe('input — UA reset', () => {
	it('removes native appearance', () => {
		const el = render('input', '')
		expect(style(el, 'appearance')).toBe('none')
	})

	it('inherits font-family (UA does not by default)', () => {
		const parent = document.createElement('div')
		parent.style.fontFamily = '"Test Font", serif'
		const el = document.createElement('input')
		parent.appendChild(el)
		mount(parent)
		expect(style(el, 'font-family')).toContain('Test Font')
	})

	it('applies non-zero padding from the size context', () => {
		const el = render('input', '')
		expect(pixels(el, 'padding-left')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
	})

	it('applies a 1px border', () => {
		const el = render('input', '')
		expect(pixels(el, 'border-top-width')).toBe(1)
	})

	it('uses the small font-size by default (mailbox-aligned 14px)', () => {
		const el = render('input', '')
		expect(style(el, 'font-size')).toBe('14px')
	})
})

describe('input — type-specific chrome', () => {
	it('paints checkbox with appearance: none + framework border', () => {
		const el = render('input', '')
		el.type = 'checkbox'
		// Mailbox port: framework draws the box itself so checked state can
		// paint the variant color + SVG.
		expect(style(el, 'appearance')).toBe('none')
		expect(pixels(el, 'border-top-width')).toBe(1)
	})

	it('paints radio with appearance: none + circular border-radius', () => {
		const el = render('input', '')
		el.type = 'radio'
		expect(style(el, 'appearance')).toBe('none')
		expect(style(el, 'border-top-left-radius')).toBe('50%')
	})
})

describe('input — variant cascade', () => {
	it('.primary moves the border to the primary color', () => {
		const el = render('input', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(style(el, 'border-top-color')).not.toBe('')
		expect(token(el, '--set-input-border-color').trim()).toBe(expected)
	})
})

describe('input — size cascade', () => {
	it('.small reduces padding compared to default', () => {
		const def = render('input', '')
		const small = render('input', 'small')
		expect(pixels(small, 'padding-left')).toBeLessThan(pixels(def, 'padding-left'))
	})

	it('.large increases padding compared to default', () => {
		const def = render('input', '')
		const large = render('input', 'large')
		expect(pixels(large, 'padding-left')).toBeGreaterThan(pixels(def, 'padding-left'))
	})
})

describe('input — disabled', () => {
	it('disabled attribute applies not-allowed cursor', () => {
		const el = render('input', '')
		el.disabled = true
		expect(style(el, 'cursor')).toBe('not-allowed')
	})

	it('propagates disabled cursor from fieldset[disabled]', () => {
		const fieldset = document.createElement('fieldset')
		fieldset.disabled = true
		const el = document.createElement('input')
		fieldset.appendChild(el)
		mount(fieldset)
		expect(style(el, 'cursor')).toBe('not-allowed')
	})
})
