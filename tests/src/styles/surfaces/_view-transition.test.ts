// ============================================================================
//  _view-transition.scss — `::view-transition-*` surface tokens + rules.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, rootToken } from '../../../setupStyles'

describe('view-transition — surface tokens', () => {
	it('--set-view-transition-duration resolves on :root', () => {
		expect(rootToken('--set-view-transition-duration')).not.toBe('')
	})

	it('--set-view-transition-timing-function resolves on :root', () => {
		expect(rootToken('--set-view-transition-timing-function')).not.toBe('')
	})
})

describe('view-transition — surface rules', () => {
	it('declares the default cross-fade on ::view-transition-old(root) / ::view-transition-new(root)', () => {
		// The compiled CSS pairs both pseudos in one selector list so a single
		// rule paints the default tween for both snapshots.
		expect(findRule('::view-transition-old(root)')).toBe(true)
		expect(findRule('::view-transition-new(root)')).toBe(true)
	})
})
