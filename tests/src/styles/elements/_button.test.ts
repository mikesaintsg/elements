// ============================================================================
//  _button.scss — UA reset, disabled state, and modifier-cascade behavior.
//
//  Verifies that:
//   1. UA-default styles are overridden (cursor, appearance, border, etc.)
//   2. The disabled state propagates correctly.
//   3. Modifier classes (.primary, .small, .outline, .rounded) flow through
//      the context-token cascade and produce the expected computed styles.
//
//  Pattern: render the real element, assert computed styles. No mocking.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { colorEqual, mount, pixels, render, rgba, style, token } from '../../../setupStyles'

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

	it('uses an explicit small font-size (mailbox-aligned, 14px)', () => {
		const btn = render('button', '')
		// Default font-size is var(--text-sm) = 0.875rem = 14px.
		expect(style(btn, 'font-size')).toBe('14px')
	})

	it('inherits color from parent (currentColor fallback in variant token)', () => {
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

// ─────────────────────────────────────────────────────────────────────────────
//  Variant cascade — .primary etc. flow through the context tokens.
// ─────────────────────────────────────────────────────────────────────────────

describe('button — variant modifiers', () => {
	it('.primary fills the background with the primary color', () => {
		const btn = render('button', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim() || 'blue'
		const actual = style(btn, 'background-color')
		expect(colorEqual(expected, actual, 4)).toBe(true)
	})

	it('.primary uses white text', () => {
		const btn = render('button', 'primary')
		// "white" resolves to rgb(255, 255, 255).
		expect(rgba(style(btn, 'color'))).toEqual([255, 255, 255, 1])
	})

	it('.warning uses black text (warning yellow needs dark contrast)', () => {
		const btn = render('button', 'warning')
		expect(rgba(style(btn, 'color'))).toEqual([0, 0, 0, 1])
	})

	it('.primary bumps border-width to 1px (variant border-color is now visible)', () => {
		const btn = render('button', 'primary')
		expect(pixels(btn, 'border-top-width')).toBe(1)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Size cascade — .small / .large change padding + font-size + radius.
// ─────────────────────────────────────────────────────────────────────────────

describe('button — size modifiers', () => {
	it('.small reduces padding compared to default', () => {
		const def = render('button', '')
		const small = render('button', 'small')
		expect(pixels(small, 'padding-left')).toBeLessThan(pixels(def, 'padding-left'))
	})

	it('.large increases padding compared to default', () => {
		const def = render('button', '')
		const large = render('button', 'large')
		expect(pixels(large, 'padding-left')).toBeGreaterThan(pixels(def, 'padding-left'))
	})

	it('.small font-size is smaller than default', () => {
		const def = render('button', '')
		const small = render('button', 'small')
		expect(pixels(small, 'font-size')).toBeLessThan(pixels(def, 'font-size'))
	})

	it('.large font-size is larger than default', () => {
		const def = render('button', '')
		const large = render('button', 'large')
		expect(pixels(large, 'font-size')).toBeGreaterThan(pixels(def, 'font-size'))
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Style cascade — .ghost / .filled override variant.
//  (.outline was dropped; Tailwind's `.outline` utility owns that name.)
// ─────────────────────────────────────────────────────────────────────────────

describe('button — style modifiers', () => {
	it('.primary.ghost has transparent background AND zero border-width', () => {
		const btn = render('button', 'primary ghost')
		expect(rgba(style(btn, 'background-color'))).toEqual([0, 0, 0, 0])
		expect(pixels(btn, 'border-top-width')).toBe(0)
	})

	it('.primary.filled mirrors the bare-variant fill', () => {
		const filled = render('button', 'primary filled')
		const bare = render('button', 'primary')
		expect(style(filled, 'background-color')).toBe(style(bare, 'background-color'))
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Combined cascade — variant + size + style stack without conflict.
//  Shape modifiers (.pill / .square / .rounded) were dropped because Tailwind
//  ships equivalent `.rounded-{step}` utilities that handle the corner-radius
//  axis directly.
// ─────────────────────────────────────────────────────────────────────────────

describe('button — combined modifiers', () => {
	it('.primary.large.ghost composes correctly', () => {
		const btn = render('button', 'primary large ghost')
		expect(rgba(style(btn, 'background-color'))).toEqual([0, 0, 0, 0]) // ghost → transparent
		expect(pixels(btn, 'border-top-width')).toBe(0) // ghost → 0
		expect(pixels(btn, 'padding-left')).toBeGreaterThan(12) // large → wider than default 12px
	})

	it('button-scoped tokens reflect the cascade priority', () => {
		const btn = render('button', 'primary large ghost')
		expect(token(btn, '--set-button-color')).not.toBe('')
		expect(token(btn, '--set-button-background-color')).not.toBe('')
		expect(token(btn, '--set-button-border-color')).not.toBe('')
		expect(token(btn, '--set-button-border-radius')).not.toBe('')
	})
})
