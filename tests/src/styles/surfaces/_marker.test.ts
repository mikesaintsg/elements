// ============================================================================
//  _marker.scss — `::marker` surface tokens + applied list-item chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, rootToken } from '../../../setupStyles'

describe('marker — surface tokens', () => {
	it('--set-marker-color resolves on :root', () => {
		expect(rootToken('--set-marker-color')).not.toBe('')
	})

	it('--set-marker-content resolves on :root', () => {
		// `normal` is the UA default that means "use list-style-type". A
		// non-empty resolved value documents the marker contract.
		expect(rootToken('--set-marker-content')).not.toBe('')
	})
})

describe('marker — surface rule', () => {
	it('declares a ::marker rule', () => {
		expect(findRule('::marker')).toBe(true)
	})
})
