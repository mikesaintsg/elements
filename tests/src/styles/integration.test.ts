// ============================================================================
// Tailwind interop — modifier classes and Tailwind utilities cohabit cleanly
// when applied to the same element.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { pixels, render, style } from '../../setupStyles.ts'

describe('Tailwind v4 utilities compose with framework modifiers', () => {
	it('a Tailwind margin utility (.m-4) applies on top of .primary', () => {
		const btn = render('button', 'primary m-4')
		// .m-4 → margin: calc(var(--spacing) * 4) = 1rem ≈ 16px
		expect(pixels(btn, 'margin-top')).toBeGreaterThan(0)
		expect(pixels(btn, 'margin-left')).toBeGreaterThan(0)
	})

	it('a Tailwind shadow utility (.shadow-lg) applies on top of .primary', () => {
		const btn = render('button', 'primary shadow-lg')
		const shadow = style(btn, 'box-shadow')
		expect(shadow).not.toBe('none')
		expect(shadow.length).toBeGreaterThan(0)
	})

	it('a Tailwind background utility wins over a variant background', () => {
		// Tailwind utilities live in @layer utilities (highest); variants in
		// @layer modifiers. A Tailwind .bg-red-500 should beat .primary.
		const variantOnly = render('button', 'primary')
		const overridden = render('button', 'primary bg-red-500')
		const variantBg = style(variantOnly, 'background-color')
		const overriddenBg = style(overridden, 'background-color')
		// Tailwind v4 emits colors in oklch() so a numeric channel comparison
		// is brittle; assert simply that the utility produced a different
		// computed background-color than the bare variant.
		expect(overriddenBg).not.toBe(variantBg)
		expect(overriddenBg.length).toBeGreaterThan(0)
	})
})
