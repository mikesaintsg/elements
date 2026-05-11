// ============================================================================
// Variant modifier behavior — each .{variant} sets the four --set-variant-*
// context tokens on the element it's applied to.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { render, token } from '../../../setupStyles.ts'

const VARIANTS = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

describe('variant modifiers set --set-variant-* context tokens', () => {
	it.each(VARIANTS)('.%s sets all four --set-variant-* tokens', (name) => {
		const el = render('div', name)
		expect(token(el, '--set-variant-color')).not.toBe('')
		expect(token(el, '--set-variant-background-color')).not.toBe('')
		expect(token(el, '--set-variant-border-color')).not.toBe('')
		expect(token(el, '--set-variant-border-width').trim()).toBe('1px')
	})
})

describe('variants pick contrast text colors deliberately', () => {
	it('dark-luminance variants use white text', () => {
		// Empirically WCAG-checked: white-on-variant clears AA (>= 4.5) for
		// the four variants whose Tailwind step sits at oklch L ≤ 0.55:
		// primary (blue-600 L=0.546), secondary (slate-600 L=0.446), tertiary
		// (violet-600 L=0.541), danger (red-600 L=0.577). The remaining three
		// (success/warning/information) sit at L ≥ 0.57 where white-on-variant
		// drops below 4.5 — see the black-text spec below.
		for (const name of ['primary', 'secondary', 'tertiary', 'danger'] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('white')
		}
	})

	it('light-luminance variants use black text', () => {
		// Measured WCAG ratios against white-on-variant:
		//   success (green-600 L=0.573)      = 3.22 — fails AA
		//   warning (amber-500 L=0.769)      = 1.80 — hard fail
		//   information (sky-600 L=0.588)    = 4.02 — fails AA
		// Black-on-variant clears AA easily for all three (>= 6.4).
		for (const name of ['success', 'warning', 'information'] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('black')
		}
	})
})
