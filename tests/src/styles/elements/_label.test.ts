// ============================================================================
//  _label.scss — light cascade: typography only, no chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, render, style, token } from '../../../setupStyles'

describe('label — baseline', () => {
	it('renders text with cursor: pointer', () => {
		const label = render('label', '')
		label.textContent = 'Email'
		expect(style(label, 'cursor')).toBe('pointer')
	})

	it('inherits no padding (light cascade ships none)', () => {
		const label = render('label', '')
		label.textContent = 'Name'
		expect(pixels(label, 'padding-top')).toBe(0)
		expect(pixels(label, 'padding-left')).toBe(0)
	})

	it('renders a non-empty color token', () => {
		const label = render('label', '')
		expect(token(label, '--set-label-color').trim()).not.toBe('')
	})
})

describe('label — variant cascade', () => {
	it('.primary tints label color via --set-label-color', () => {
		const label = render('label', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(label, '--set-label-color').trim()).toBe(expected)
	})
})

describe('label — disabled state', () => {
	it('aria-disabled changes cursor to not-allowed', () => {
		const label = render('label', '')
		label.setAttribute('aria-disabled', 'true')
		expect(style(label, 'cursor')).toBe('not-allowed')
	})

	it('opacity dims when inside a disabled fieldset', () => {
		const fieldset = document.createElement('fieldset')
		fieldset.disabled = true
		const label = document.createElement('label')
		label.textContent = 'Inside disabled fieldset'
		fieldset.appendChild(label)
		mount(fieldset)
		expect(parseFloat(style(label, 'opacity'))).toBeLessThan(1)
	})
})

