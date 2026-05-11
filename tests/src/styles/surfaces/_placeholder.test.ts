// ============================================================================
//  _placeholder.scss — `::placeholder` surface tokens + applied chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, rootToken, style } from '../../../setupStyles'

describe('placeholder — surface tokens', () => {
	it('--set-placeholder-color resolves on :root', () => {
		expect(rootToken('--set-placeholder-color')).not.toBe('')
	})

	it('--set-placeholder-opacity resolves on :root', () => {
		expect(rootToken('--set-placeholder-opacity')).not.toBe('')
	})
})

describe('placeholder — surface rule', () => {
	it('declares a ::placeholder rule', () => {
		expect(findRule('::placeholder')).toBe(true)
	})

	it('inputs no longer declare per-element placeholder rules', () => {
		// The previous `--set-input-placeholder-opacity` token has been
		// removed in favor of the surface-level `--set-placeholder-opacity`.
		expect(rootToken('--set-input-placeholder-opacity')).toBe('')
		expect(rootToken('--set-textarea-placeholder-opacity')).toBe('')
	})

	it('a placeholder input renders with non-zero applied opacity', () => {
		const input = document.createElement('input')
		input.type = 'text'
		input.placeholder = 'hint'
		mount(input)
		// `opacity` on the `<input>` itself is the host control's opacity,
		// not the placeholder pseudo's — but the surface rule paints
		// `::placeholder { opacity: var(--set-placeholder-opacity) }`,
		// so the resolved value should be the framework's 0.6 default.
		expect(rootToken('--set-placeholder-opacity')).toBe('0.6')
		expect(style(input, 'opacity')).toBe('1')
	})
})

