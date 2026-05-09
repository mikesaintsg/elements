// ============================================================================
//  surfaces/_anchor-position.scss — CSS anchor positioning defaults applied
//  to non-manual popovers. Tokens declare on :root so authors can theme
//  the gap / fallbacks / default placement-area globally.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DIV' || child.tagName === 'OUTPUT') {
			child.remove()
		}
	}
})

describe('anchor-position — token surface', () => {
	it('exposes --set-anchor-* on :root', () => {
		expect(rootToken('--set-anchor-gap').trim()).not.toBe('')
		expect(rootToken('--set-anchor-position-area').trim()).not.toBe('')
		expect(rootToken('--set-anchor-position-try-fallbacks').trim()).not.toBe('')
	})

	it('default position-area places below the anchor (block-end)', () => {
		// Logical `block-end` is the conventional dropdown placement —
		// flips automatically in vertical / RTL writing modes.
		const value = rootToken('--set-anchor-position-area').trim()
		expect(value).toBe('block-end')
	})
})

describe('anchor-position — applies to non-manual popovers', () => {
	it('a `[popover]` (auto, the default) consumes the position-area token', () => {
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'auto-anchor'
		mount(div)
		// `position-area` resolves through `var(--set-anchor-position-area)`.
		// Browsers report the resolved keyword, not the var() expression, so
		// we check it's a non-empty position-area value.
		expect(style(div, 'position-area').trim()).not.toBe('')
	})

	it('a `[popover=hint]` (tooltip) gets the same anchor-positioning', () => {
		const div = build('div')
		div.setAttribute('popover', 'hint')
		div.id = 'hint-anchor'
		mount(div)
		expect(style(div, 'position-area').trim()).not.toBe('')
	})
})

describe('anchor-position — excludes manual popovers (toasts)', () => {
	it('an `output[popover=manual]` does NOT receive the anchor position-area', () => {
		const out = build('output')
		out.setAttribute('popover', 'manual')
		out.id = 'manual-anchor'
		mount(out)
		// Manual popovers are excluded by selector; `position-area` should
		// resolve to empty / `none`.
		const positionArea = style(out, 'position-area').trim()
		// Different browsers serialize "no position-area" differently —
		// either an empty string or "none". Accept both.
		expect(positionArea === '' || positionArea === 'none').toBe(true)
	})
})
