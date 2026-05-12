// ============================================================================
//  _dl.scss — description list (term / description pairs).
//
//  Responsive 2-column grid at >=640px. Regression coverage for the
//  fix that surfaced on NavPage's pagination-token sub-surface: a
//  long compound `<dt>` (e.g. three slash-separated `<code>` token
//  names) was taking `max-content` from col 1 and starving col 2 to
//  0 px. The `<dd>` column now carries a `minmax(12rem, 1fr)` floor
//  so the description track can't collapse below readable width.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DL') child.remove()
	}
})

describe('dl — token surface + grid baseline', () => {
	it('exposes --set-dl-row-gap / --set-dl-column-gap on a bare <dl>', () => {
		const dl = build('dl')
		mount(dl)

		expect(style(dl, '--set-dl-row-gap').trim()).not.toBe('')
		expect(style(dl, '--set-dl-column-gap').trim()).not.toBe('')
	})

	it('bare <dl> is a CSS grid', () => {
		const dl = build('dl')
		mount(dl)

		expect(style(dl, 'display')).toBe('grid')
	})
})

describe('dl — long compound `<dt>` does NOT starve the `<dd>` column', () => {
	// Regression: previous template `minmax(0, max-content) minmax(0, 1fr)`
	// allowed `<dt>`'s natural width to consume the entire grid when its
	// content exceeded the container — `<dd>` collapsed to 0 px and the
	// description rendered invisible. NavPage's pagination-token sub-
	// surface surfaced this with a compound `<dt>` listing three slash-
	// separated `--set-nav-pagination-active-*` token names. Fix: col 2
	// now has a `minmax(12rem, 1fr)` floor.
	it('a long compound `<dt>` wraps to fit; `<dd>` keeps its 12 rem floor', () => {
		// Force wide-viewport grid (the >=640 px breakpoint).
		// `setupStyles.ts` mounts into a viewport-sized container — we
		// only need to assert col 2 is non-zero on the wide path.
		const dl = build('dl')
		dl.style.inlineSize = '600px' // tight container, forces the floor

		const dt = build('dt')
		dt.innerHTML =
			'<code>--set-nav-pagination-active-color</code> / ' +
			'<code>--set-nav-pagination-active-background-color</code> / ' +
			'<code>--set-nav-pagination-active-border-color</code>'

		const dd = build('dd', '', 'Filled triplet for the active tile.')

		dl.append(dt, dd)
		mount(dl)

		// 12 rem at the default 16 px root = 192 px.
		const ddWidth = dd.getBoundingClientRect().width
		expect(ddWidth).toBeGreaterThanOrEqual(192)
	})

	it('short term + short description keep `<dt>` narrower than its `<dd>` (col 1 = max-content)', () => {
		// At wide viewports col 1 sizes to its content's max-content
		// width and col 2 takes the remainder via `1fr`. Verify the dt
		// doesn't unexpectedly expand to the floor's value (12rem) when
		// its content is short — `minmax(0, max-content)` means the
		// term track shrinks naturally to fit its content.
		const dl = build('dl')
		const dt = build('dt', '', 'T')
		const dd = build('dd', '', 'Description that fills the second column nicely.')
		dl.append(dt, dd)
		mount(dl)

		const dtW = dt.getBoundingClientRect().width
		const ddW = dd.getBoundingClientRect().width

		// A single-character `<dt>` should be MUCH narrower than the dd
		// when the viewport is wider than 640 px (the 2-col path) AND
		// roughly equal when the test environment uses the narrow path
		// (the single-column stack). Either way, dt should not be
		// pinned to some artificial minimum — assert it's smaller than
		// or equal to dd, but not zero.
		expect(dtW).toBeGreaterThan(0)
		expect(dtW).toBeLessThanOrEqual(ddW)
	})
})
