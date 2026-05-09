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

describe('placements — corner classes use span- syntax for dropdown alignment', () => {
	// Corner placements use the position-area `span-` modifier so the
	// popover hugs the anchor's matching edge instead of sitting in a
	// single corner cell of the 3×3 grid (which would place the popover
	// OUTSIDE the anchor's inline bounds — wrong for a dropdown).
	//
	// `.bottom-start` reads "below the anchor, aligned to its start edge"
	//   → popover's start edge sits at anchor's start edge
	//   → the popover area extends from there toward inline-end
	//   → CSS: `block-end span-inline-end` → Chromium computed: `end span-end`
	//
	// `.bottom-end` reads "below, aligned to anchor's end edge"
	//   → popover ends at anchor's end edge, extends back toward start
	//   → CSS: `block-end span-inline-start` → computed: `end span-start`
	it('.top-start computes to `start span-end` (above, start-aligned)', () => {
		expect(placement('top-start')).toBe('start span-end')
	})
	it('.top-end computes to `start span-start` (above, end-aligned)', () => {
		expect(placement('top-end')).toBe('start span-start')
	})
	it('.bottom-start computes to `end span-end` (below, start-aligned)', () => {
		expect(placement('bottom-start')).toBe('end span-end')
	})
	it('.bottom-end computes to `end span-start` (below, end-aligned)', () => {
		expect(placement('bottom-end')).toBe('end span-start')
	})
})

describe('placements — edge classes hug the anchor via align-self / justify-self', () => {
	// The position-area alone places the popover SOMEWHERE in the matching
	// row / column of the 3×3 grid — but without `align-self` / `justify-
	// self` it floats in the middle of that band rather than pressing
	// against the anchor edge. The modifier rule supplies both alignments.
	function alignment(klass: string): { align: string; justify: string } {
		const div = build('div')
		div.setAttribute('popover', '')
		div.classList.add(klass)
		div.id = `align-${klass}`
		mount(div)
		return {
			align: style(div, 'align-self').trim(),
			justify: style(div, 'justify-self').trim(),
		}
	}

	it('.top hugs the anchor block-end + inline-centers', () => {
		const a = alignment('top')
		expect(a.align).toBe('end')
		expect(a.justify).toBe('anchor-center')
	})
	it('.bottom hugs the anchor block-start + inline-centers', () => {
		const a = alignment('bottom')
		expect(a.align).toBe('start')
		expect(a.justify).toBe('anchor-center')
	})
	it('.start centers vertically + hugs anchor inline-end', () => {
		const a = alignment('start')
		expect(a.align).toBe('anchor-center')
		expect(a.justify).toBe('end')
	})
	it('.end centers vertically + hugs anchor inline-start', () => {
		const a = alignment('end')
		expect(a.align).toBe('anchor-center')
		expect(a.justify).toBe('start')
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
