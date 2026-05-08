// ============================================================================
//  _button.scss — base element reset tests
//
//  Verifies the UA-override rules declared in `src/styles/elements/_button.scss`
//  against the real cascade in a real Chromium document. These tests assert
//  the reset contract only — modifier classes (.primary, .sm, …) are tested
//  separately once they exist.
//
//  Pattern: render the bare element, assert computed styles. No mocking.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, render, style } from '../../../setupStyles'

// ─────────────────────────────────────────────────────────────────────────────
//  UA reset
// ─────────────────────────────────────────────────────────────────────────────

describe('button — UA reset', () => {
	it('overrides cursor to pointer', () => {
		const btn = render('button', '')
		expect(style(btn, 'cursor')).toBe('pointer')
	})

	it('removes native appearance', () => {
		const btn = render('button', '')
		expect(style(btn, 'appearance')).toBe('none')
	})

	it('removes native border', () => {
		const btn = render('button', '')
		expect(pixels(btn, 'border-top-width')).toBe(0)
	})

	it('removes native background', () => {
		const btn = render('button', '')
		const bg = style(btn, 'background-color')
		// resolves to transparent in all browser representations
		expect(bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)').toBe(true)
	})

	it('applies non-zero horizontal and vertical padding', () => {
		const btn = render('button', '')
		expect(pixels(btn, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(btn, 'padding-left')).toBeGreaterThan(0)
	})

	it('applies equal left and right padding', () => {
		const btn = render('button', '')
		expect(pixels(btn, 'padding-left')).toBe(pixels(btn, 'padding-right'))
	})

	it('inherits font-size from parent', () => {
		const parent = document.createElement('div')
		parent.style.fontSize = '20px'
		const btn = document.createElement('button')
		parent.appendChild(btn)
		mount(parent)
		expect(style(btn, 'font-size')).toBe('20px')
	})

	it('inherits color from parent', () => {
		const parent = document.createElement('div')
		parent.style.color = 'rgb(255, 0, 0)'
		const btn = document.createElement('button')
		parent.appendChild(btn)
		mount(parent)
		expect(style(btn, 'color')).toBe('rgb(255, 0, 0)')
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Disabled state
// ─────────────────────────────────────────────────────────────────────────────

describe('button — disabled state', () => {
	it('applies not-allowed cursor when disabled', () => {
		const btn = render('button', '')
		btn.disabled = true
		expect(style(btn, 'cursor')).toBe('not-allowed')
	})

	it('propagates disabled cursor from fieldset[disabled]', () => {
		const fieldset = document.createElement('fieldset')
		fieldset.disabled = true
		const btn = document.createElement('button')
		fieldset.appendChild(btn)
		mount(fieldset)
		expect(style(btn, 'cursor')).toBe('not-allowed')
	})
})

