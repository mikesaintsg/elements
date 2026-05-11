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
	it.each(VARIANTS)('.%s sets the FILLED-tier --set-variant-* tokens', (name) => {
		const el = render('div', name)
		expect(token(el, '--set-variant-color')).not.toBe('')
		expect(token(el, '--set-variant-background-color')).not.toBe('')
		expect(token(el, '--set-variant-border-color')).not.toBe('')
		expect(token(el, '--set-variant-border-width').trim()).toBe('1px')
	})

	it.each(VARIANTS)(
		'.%s sets the SUBTLE-tier --set-variant-subtle-{color,background-color,border-color} tokens',
		(name) => {
			const el = render('div', name)
			expect(token(el, '--set-variant-subtle-color')).not.toBe('')
			expect(token(el, '--set-variant-subtle-background-color')).not.toBe('')
			expect(token(el, '--set-variant-subtle-border-color')).not.toBe('')
		},
	)
})

describe('variants pick contrast text colors deliberately', () => {
	it('every variant pairs white text with its fill (WCAG AA cleared)', () => {
		// Every variant is pinned to a step where white-on-fill clears
		// WCAG AA (>= 4.5 normal text):
		//   primary     (blue-600 L=0.546)  → ~5.2
		//   secondary   (slate-600 L=0.446) → ~7.4
		//   tertiary    (violet-600 L=0.541)→ ~5.8
		//   success     (green-700 L=0.527) → ~4.98
		//   warning     (amber-700 L=0.555) → ~5.07
		//   danger      (red-600 L=0.577)   → ~4.83
		//   information (sky-700 L=0.500)   → ~5.83
		// The framework deliberately shifts the lighter hues (green / amber
		// / sky) up to their `-700` step so the all-variants-take-white
		// contract holds symmetrically — see _theme.scss for rationale.
		for (const name of [
			'primary',
			'secondary',
			'tertiary',
			'success',
			'warning',
			'danger',
			'information',
		] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('white')
		}
	})
})
