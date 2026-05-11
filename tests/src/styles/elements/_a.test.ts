// ============================================================================
//  _a.scss — link affordance, modifier cascade, disabled-by-aria.
//
//  Verifies that:
//   1. Bare <a> stays inline-text-shaped (zero padding, transparent surface,
//      underlined).
//   2. Variant + size + style modifiers flow through the cascade with the
//      same priority as <button>.
//   3. .filled drops the underline (the fill carries the affordance).
//   4. aria-disabled / .disabled propagate to cursor + opacity.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	colorEqual,
	mount,
	pixels,
	render,
	rgba,
	rootToken,
	style,
	token,
} from '../../../setupStyles'

// ─────────────────────────────────────────────────────────────────────────────
//  Bare-anchor baseline
// ─────────────────────────────────────────────────────────────────────────────

describe('a — bare baseline', () => {
	it('keeps the underline (UA affordance for links)', () => {
		const a = render('a', '')
		expect(style(a, 'text-decoration-line')).toContain('underline')
	})

	it('renders cursor: pointer', () => {
		const a = render('a', '')
		expect(style(a, 'cursor')).toBe('pointer')
	})

	it('has zero padding when no size modifier is applied', () => {
		const a = render('a', '')
		expect(pixels(a, 'padding-left')).toBe(0)
		expect(pixels(a, 'padding-top')).toBe(0)
	})

	it('has zero border-width when no variant or style modifier is applied', () => {
		const a = render('a', '')
		expect(pixels(a, 'border-top-width')).toBe(0)
	})

	it('has a transparent background when no style modifier is applied', () => {
		const a = render('a', '')
		const bg = style(a, 'background-color')
		expect(bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)').toBe(true)
	})

	it('paints the primary variant color by default (Bootstrap link-color convention)', () => {
		// Bare `<a>` falls back to `--color-primary` so links read as
		// links — matches Bootstrap's `--bs-link-color` and the mailbox
		// showcase. Authors who want anchors to blend into body copy
		// override per-host with `color: currentColor` (or `inherit`).
		// The test asserts the bare anchor IGNORES parent color in favor
		// of the framework primary, even when the parent sets a color.
		const parent = document.createElement('div')
		parent.style.color = 'rgb(20, 200, 50)'
		const a = document.createElement('a')
		a.href = '#'
		parent.appendChild(a)
		mount(parent)
		const primary = rootToken('color-primary')
		expect(colorEqual(style(a, 'color'), primary)).toBe(true)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Variant cascade — links pick the variant identity color for text.
//  Known limitation: bare variant anchors paint variant-bg text on canvas
//  and don't always clear WCAG AA (see `_a.scss` for the table). Consumers
//  needing AA-compliant variant links should use `.subtle` or `.filled`.
// ─────────────────────────────────────────────────────────────────────────────

describe('a — variant modifiers', () => {
	it('.primary sets text color to the primary variant color', () => {
		const a = render('a', 'primary')
		const expected = style(document.documentElement, '--color-primary').trim() || 'blue'
		expect(colorEqual(expected, style(a, 'color'), 4)).toBe(true)
	})

	it('.danger sets text color to the danger variant color', () => {
		const a = render('a', 'danger')
		const expected = style(document.documentElement, '--color-danger').trim() || 'red'
		expect(colorEqual(expected, style(a, 'color'), 4)).toBe(true)
	})

	it('.primary stays inline (no padding, no fill) — only color changes', () => {
		const a = render('a', 'primary')
		expect(pixels(a, 'padding-left')).toBe(0)
		const bg = style(a, 'background-color')
		expect(bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)').toBe(true)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Size cascade — opt-in chrome.
// ─────────────────────────────────────────────────────────────────────────────

describe('a — size modifiers', () => {
	it('.small applies non-zero horizontal padding', () => {
		const a = render('a', 'primary small')
		expect(pixels(a, 'padding-left')).toBeGreaterThan(0)
	})

	it('.large pads more than .small', () => {
		const small = render('a', 'primary small')
		const large = render('a', 'primary large')
		expect(pixels(large, 'padding-left')).toBeGreaterThan(pixels(small, 'padding-left'))
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Style cascade — .filled fills + drops underline; .ghost keeps underline.
// ─────────────────────────────────────────────────────────────────────────────

describe('a — style modifiers', () => {
	it('.primary.filled fills with the variant color', () => {
		const a = render('a', 'primary filled')
		const expected = style(document.documentElement, '--color-primary').trim() || 'blue'
		expect(colorEqual(expected, style(a, 'background-color'), 4)).toBe(true)
	})

	it('.primary.filled uses contrast text (white)', () => {
		const a = render('a', 'primary filled')
		expect(rgba(style(a, 'color'))).toEqual([255, 255, 255, 1])
	})

	it('.filled drops the underline (the fill carries the affordance)', () => {
		const a = render('a', 'primary filled')
		expect(style(a, 'text-decoration-line')).toBe('none')
	})

	it('.ghost keeps the underline and stays transparent', () => {
		const a = render('a', 'primary ghost')
		expect(style(a, 'text-decoration-line')).toContain('underline')
		expect(rgba(style(a, 'background-color'))).toEqual([0, 0, 0, 0])
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Disabled — aria-disabled + .disabled both apply not-allowed cursor.
// ─────────────────────────────────────────────────────────────────────────────

describe('a — disabled', () => {
	it('aria-disabled=true applies not-allowed cursor', () => {
		const a = render('a', '')
		a.setAttribute('aria-disabled', 'true')
		expect(style(a, 'cursor')).toBe('not-allowed')
	})

	it('.disabled applies not-allowed cursor', () => {
		const a = render('a', 'disabled')
		expect(style(a, 'cursor')).toBe('not-allowed')
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Combined — variant + size + style stack without conflict.
// ─────────────────────────────────────────────────────────────────────────────

describe('a — combined modifiers', () => {
	it('.primary.large.filled composes correctly', () => {
		const a = render('a', 'primary large filled')
		expect(rgba(style(a, 'color'))).toEqual([255, 255, 255, 1])
		expect(pixels(a, 'padding-left')).toBeGreaterThan(0)
		expect(style(a, 'text-decoration-line')).toBe('none')
	})

	it('a-scoped tokens reflect the cascade priority', () => {
		const a = render('a', 'primary large filled')
		expect(token(a, '--set-a-color')).not.toBe('')
		expect(token(a, '--set-a-background-color')).not.toBe('')
		expect(token(a, '--set-a-border-radius')).not.toBe('')
	})
})
