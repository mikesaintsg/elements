// ============================================================================
//  components/_form.scss — bare <form> as a vertical stack with gap.
//  `.inline` modifier flips to horizontal.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { pixels, render, style, token } from '../../../setupStyles'

describe('form — token surface', () => {
	it('exposes --set-form-* tokens on a bare <form>', () => {
		const el = render('form', '')
		expect(token(el, '--set-form-gap').trim()).not.toBe('')
		expect(token(el, '--set-form-inline-gap').trim()).not.toBe('')
	})
})

describe('form — vertical stack by default', () => {
	it('flex column with gap', () => {
		const el = render('form', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})
})

describe('form — .inline modifier', () => {
	it('flips to a wrapping flex row', () => {
		const el = render('form', 'inline')
		expect(style(el, 'flex-direction')).toBe('row')
		expect(style(el, 'flex-wrap')).toBe('wrap')
	})

	it('aligns items to baseline (end) so labels + inputs sit on the same line', () => {
		const el = render('form', 'inline')
		expect(style(el, 'align-items')).toBe('end')
	})
})
