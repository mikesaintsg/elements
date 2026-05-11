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
	it('every variant except `warning` uses white text', () => {
		// At Tailwind's `-600` step, every variant background sits at
		// oklch L ≤ 0.55 — white text wins WCAG AA. `warning` is the
		// outlier (`-500` amber, L ~ 0.85) where black is the only
		// readable choice.
		for (const name of [
			'primary',
			'secondary',
			'tertiary',
			'success',
			'danger',
			'information',
		] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('white')
		}
	})

	it('warning uses black text', () => {
		const el = render('div', 'warning')
		expect(token(el, '--set-variant-color').trim()).toBe('black')
	})
})
