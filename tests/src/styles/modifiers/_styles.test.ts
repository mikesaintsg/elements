// ============================================================================
// Style modifier behavior — .subtle / .filled set --set-style-* context
// tokens by reading the active variant's --set-variant-* tier values.
// Element files prefer --set-style-* over raw --set-variant-*. Two values
// shipped; the previous `.ghost` modifier was removed because its
// transparent-text-on-canvas pattern failed WCAG AA for 4 of 7 variants
// in dark and 3 of 7 in light (variant text against the canvas dropped
// to 2–4:1 ratios). `.subtle` replaces it with a Bootstrap-style tinted-
// bg + emphasis-text pattern that clears AA in both modes by giving the
// text its own tinted lift off the canvas. An `.outline` modifier was
// also dropped because Tailwind's `.outline` utility would stack a
// separate outline alongside ours.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { render, token } from '../../../setupStyles.ts'

describe('style modifiers set --set-style-* context tokens', () => {
	it('.subtle reads the variant SUBTLE-tier tokens (text-emphasis + bg-subtle + border-subtle)', () => {
		const el = render('div', 'primary subtle')
		expect(token(el, '--set-style-color')).not.toBe('')
		expect(token(el, '--set-style-background-color')).not.toBe('')
		expect(token(el, '--set-style-border-color')).not.toBe('')
		expect(token(el, '--set-style-border-width').trim()).toBe('1px')
		// The .subtle color slot must resolve to the variant's SUBTLE-tier
		// color derivation, not the saturated background-color. Equality of
		// the computed value to --set-variant-subtle-color proves the cascade
		// chain (style → variant subtle-color) lands correctly.
		const styleColor = token(el, '--set-style-color').trim()
		const variantSubtle = token(el, '--set-variant-subtle-color').trim()
		expect(styleColor).toBe(variantSubtle)
	})

	it('.filled mirrors the variant FILLED-tier tokens directly', () => {
		const el = render('div', 'primary filled')
		expect(token(el, '--set-style-color')).not.toBe('')
		expect(token(el, '--set-style-background-color')).not.toBe('')
		expect(token(el, '--set-style-border-color')).not.toBe('')
		expect(token(el, '--set-style-border-width').trim()).toBe('1px')
	})
})
