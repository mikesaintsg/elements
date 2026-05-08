// ============================================================================
//  _scrollbar.scss — UA scrollbar styling tokens.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { rootToken, style } from '../../../setupStyles'

describe('scrollbar — surface tokens', () => {
	it('--set-scrollbar-thumb-color resolves on :root', () => {
		expect(rootToken('--set-scrollbar-thumb-color')).not.toBe('')
	})

	it('--set-scrollbar-track-color resolves on :root', () => {
		// `transparent` is a valid resolved value and should not be empty.
		expect(rootToken('--set-scrollbar-track-color')).not.toBe('')
	})

	it('--set-scrollbar-width resolves on :root', () => {
		expect(rootToken('--set-scrollbar-width')).not.toBe('')
	})

	it('--set-scrollbar-gutter resolves on :root', () => {
		expect(rootToken('--set-scrollbar-gutter')).not.toBe('')
	})
})

describe('scrollbar — applied properties', () => {
	it('applies scrollbar-width on :root', () => {
		expect(style(document.documentElement, 'scrollbar-width')).not.toBe('')
	})

	it('applies scrollbar-gutter on :root', () => {
		expect(style(document.documentElement, 'scrollbar-gutter')).not.toBe('')
	})
})
