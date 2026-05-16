// ============================================================================
//  app/browser/helpers.ts — pure-function behavior.
//
//  Every helper is deterministic (no Vue, no DOM, no clock). `MouseEvent`
//  is a real browser constructor in the app:browser project, so
//  `hasModifierKey` exercises a genuine event.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	capitalize,
	clamp,
	formatSize,
	hasModifierKey,
	pageList,
	timingFunctionFor,
} from '../../../app/browser/helpers.js'

describe('hasModifierKey', () => {
	it('is false when no modifier is held', () => {
		expect(hasModifierKey(new MouseEvent('click'))).toBe(false)
	})

	for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
		it(`is true when ${key} is held`, () => {
			expect(hasModifierKey(new MouseEvent('click', { [key]: true }))).toBe(true)
		})
	}
})

describe('formatSize', () => {
	it('bytes below 1 KiB render as whole bytes', () => {
		expect(formatSize(0)).toBe('0 B')
		expect(formatSize(512)).toBe('512 B')
		expect(formatSize(1023)).toBe('1023 B')
	})

	it('the KiB boundary switches unit', () => {
		expect(formatSize(1024)).toBe('1.0 KB')
		expect(formatSize(1536)).toBe('1.5 KB')
		expect(formatSize(1024 * 1024 - 1)).toMatch(/ KB$/)
	})

	it('the MiB boundary switches unit (two decimals)', () => {
		expect(formatSize(1024 * 1024)).toBe('1.00 MB')
		expect(formatSize(1024 * 1024 * 2.25)).toBe('2.25 MB')
	})
})

describe('timingFunctionFor', () => {
	it('maps every preset to its CSS timing function', () => {
		expect(timingFunctionFor('iOS')).toBe('cubic-bezier(0.32, 0.72, 0, 1)')
		expect(timingFunctionFor('ease')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
		expect(timingFunctionFor('linear')).toBe('linear')
		expect(timingFunctionFor('snappy')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
	})
})

describe('pageList', () => {
	it('lists every page when the count fits the window (≤ 7)', () => {
		expect(pageList(1, 1)).toEqual([1])
		expect(pageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
	})

	it('windows around the active page with ellipsis gaps', () => {
		expect(pageList(5, 20)).toEqual([1, null, 4, 5, 6, null, 20])
	})

	it('collapses only true gaps (adjacent pages keep no ellipsis)', () => {
		expect(pageList(1, 20)).toEqual([1, 2, null, 20])
		expect(pageList(20, 20)).toEqual([1, null, 19, 20])
	})

	it('omits the ellipsis when the gap is a single page', () => {
		// window = {1, 9, 1, 2, 3} → [1,2,3,9]; 3→9 is the only >1 gap
		expect(pageList(2, 9)).toEqual([1, 2, 3, null, 9])
	})
})

describe('capitalize', () => {
	it('upper-cases only the first character', () => {
		expect(capitalize('primary')).toBe('Primary')
		expect(capitalize('a')).toBe('A')
		expect(capitalize('hELLO')).toBe('HELLO')
	})

	it('leaves an already-capitalized or empty string intact', () => {
		expect(capitalize('ABC')).toBe('ABC')
		expect(capitalize('')).toBe('')
	})
})

describe('clamp', () => {
	it('returns the value when it is already in range', () => {
		expect(clamp(5, 0, 10)).toBe(5)
		expect(clamp(0.5, 0, 1)).toBe(0.5)
	})

	it('pins to the nearest bound when out of range', () => {
		expect(clamp(-1, 0, 10)).toBe(0)
		expect(clamp(11, 0, 10)).toBe(10)
		expect(clamp(2, 0, 1)).toBe(1)
	})

	it('handles a degenerate range', () => {
		expect(clamp(5, 5, 5)).toBe(5)
		expect(clamp(9, 5, 5)).toBe(5)
	})
})
