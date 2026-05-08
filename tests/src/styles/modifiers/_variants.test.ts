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
	it('primary, tertiary, success, danger use white text', () => {
		for (const name of ['primary', 'tertiary', 'success', 'danger'] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('white')
		}
	})

	it('secondary, warning, information use black text', () => {
		for (const name of ['secondary', 'warning', 'information'] as const) {
			const el = render('div', name)
			expect(token(el, '--set-variant-color').trim()).toBe('black')
		}
	})
})
