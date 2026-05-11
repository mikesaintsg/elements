// ============================================================================
//  _selection.scss — `::selection` surface tokens + applied chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, rootToken } from '../../../setupStyles'

describe('selection — surface tokens', () => {
	it('--set-selection-color resolves on :root', () => {
		expect(rootToken('--set-selection-color')).not.toBe('')
	})

	it('--set-selection-background-color resolves on :root', () => {
		expect(rootToken('--set-selection-background-color')).not.toBe('')
	})
})

describe('selection — surface rule', () => {
	it('declares a ::selection rule', () => {
		expect(findRule('::selection')).toBe(true)
	})
})
