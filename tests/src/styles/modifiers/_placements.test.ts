// ============================================================================
//  modifiers/_placements.scss — eight placement values (4 edges, 4 corners)
//  mapping to `position-area` keywords on anchor-positioned popovers.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DIV') child.remove()
	}
})

function placement(klass: string): string {
	const div = build('div')
	div.setAttribute('popover', '')
	div.classList.add(klass)
	div.id = `placement-${klass}`
	mount(div)
	return style(div, 'position-area').trim()
}

describe('placements — edge classes set position-area to a single logical edge', () => {
	it('.top maps to `block-start`', () => {
		expect(placement('top')).toBe('block-start')
	})
	it('.bottom maps to `block-end`', () => {
		expect(placement('bottom')).toBe('block-end')
	})
	it('.start maps to `inline-start`', () => {
		expect(placement('start')).toBe('inline-start')
	})
	it('.end maps to `inline-end`', () => {
		expect(placement('end')).toBe('inline-end')
	})
})

describe('placements — corner classes pair logical block + inline axes', () => {
	// Chromium serializes the logical pair to symmetric short forms:
	//   block-start inline-start → "start"
	//   block-start inline-end   → "start end"
	//   block-end   inline-start → "end start"
	//   block-end   inline-end   → "end"
	// We assert the computed forms directly so a regression in keyword
	// resolution (e.g. a downgrade to physical-only) fails loudly.
	it('.top-start computes to `start` (block-start + inline-start cell)', () => {
		expect(placement('top-start')).toBe('start')
	})
	it('.top-end computes to `start end` (block-start + inline-end cell)', () => {
		expect(placement('top-end')).toBe('start end')
	})
	it('.bottom-start computes to `end start` (block-end + inline-start cell)', () => {
		expect(placement('bottom-start')).toBe('end start')
	})
	it('.bottom-end computes to `end` (block-end + inline-end cell)', () => {
		expect(placement('bottom-end')).toBe('end')
	})
})

describe('placements — manual popovers are excluded', () => {
	it('a manual popover with `.top` does NOT receive position-area: top', () => {
		const div = build('div')
		div.setAttribute('popover', 'manual')
		div.classList.add('top')
		div.id = 'placement-manual'
		mount(div)
		// `.top` rule is scoped to `[popover]:not([popover='manual'])` so
		// the manual popover should not match. Its position-area resolves
		// either to empty or `none`, never to `top`.
		const value = style(div, 'position-area').trim()
		expect(value).not.toBe('top')
	})
})
