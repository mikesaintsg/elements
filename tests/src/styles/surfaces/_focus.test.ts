// ============================================================================
//  _focus.scss — keyboard `:focus-visible` ring surface tokens + applied rule.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, rootToken } from '../../../setupStyles'

describe('focus — surface tokens', () => {
	it('--set-focus-color resolves on :root', () => {
		expect(rootToken('--set-focus-color')).not.toBe('')
	})

	it('--set-focus-box-shadow-width resolves on :root', () => {
		expect(rootToken('--set-focus-box-shadow-width')).not.toBe('')
	})

	it('--set-focus-box-shadow-opacity resolves on :root', () => {
		expect(rootToken('--set-focus-box-shadow-opacity')).not.toBe('')
	})
})

describe('focus — surface rule', () => {
	it('declares a :focus-visible rule that opts out of native form controls', () => {
		// The surface rule scopes via :where(input, textarea, select) so
		// per-element form-control focus chrome continues to win.
		expect(findRule(':focus-visible:not(:where(input, textarea, select))')).toBe(true)
	})

	it('paints a non-empty box-shadow on a focusable surface element', () => {
		const button = document.createElement('button')
		button.textContent = 'focus me'
		mount(button)
		// Force `:focus-visible` semantics via the keyboard pseudo-class
		// binding; resolved box-shadow on a focused button should be
		// non-empty under the surface rule.
		button.focus({ focusVisible: true } as FocusOptions)
		const shadow = globalThis.getComputedStyle(button).boxShadow
		expect(shadow).not.toBe('none')
	})
})

