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
		expect(rootToken('--set-anchor-viewport-inset').trim()).not.toBe('')
	})

	it('default position-area places below the anchor (block-end)', () => {
		// Logical `block-end` is the conventional dropdown placement —
		// flips automatically in vertical / RTL writing modes.
		const value = rootToken('--set-anchor-position-area').trim()
		expect(value).toBe('block-end')
	})
})

describe('anchor-position — boundary-detection recipe', () => {
	it('a popover declares `position-visibility: anchors-visible`', () => {
		// Auto-hide when the trigger scrolls offscreen — without this, a
		// dropdown left open in a scrolled list would float untethered at
		// its computed position, pointing at nothing.
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'anchor-vis'
		mount(div)
		expect(style(div, 'position-visibility')).toBe('anchors-visible')
	})

	it('a popover gets a viewport-aware max-block-size budget', () => {
		// 100dvh minus a safe-area inset on each block-axis side. The
		// popover shrinks before overflowing; if it still doesn't fit,
		// `position-try-fallbacks` flips to the opposite side.
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'anchor-block'
		mount(div)
		const value = style(div, 'max-block-size').trim()
		// Browsers serialize the resolved calc() to a px value. Just
		// assert it's bounded (not `none` / unset).
		expect(value).not.toBe('none')
		expect(value).not.toBe('')
	})

	it('a popover gets a viewport-aware max-inline-size budget', () => {
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'anchor-inline'
		mount(div)
		const value = style(div, 'max-inline-size').trim()
		expect(value).not.toBe('none')
		expect(value).not.toBe('')
	})

	it('a popover overflows scrollable when content exceeds the budget', () => {
		// `overflow: auto` is what makes the size budget actually clamp
		// the content — without it the popover would just bleed past the
		// max-size declarations.
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'anchor-overflow'
		mount(div)
		expect(style(div, 'overflow-y')).toBe('auto')
	})
})

describe('anchor-position — applies to every popover flavour', () => {
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

	it('a `[popover=manual]` ALSO gets anchor-positioning (same as auto)', () => {
		// Manual popovers used to be excluded; that meant a bare
		// `<div popover="manual">` defaulted to UA top-left placement,
		// which is awful UX. Now they consume the same anchor surface as
		// auto / hint. The toast component overrides this via @layer
		// components (selector `output[popover]`); see the toast test
		// below for the override path.
		const div = build('div')
		div.setAttribute('popover', 'manual')
		div.id = 'manual-anchor'
		mount(div)
		expect(style(div, 'position-area').trim()).not.toBe('')
	})
})

describe('anchor-position — toast (output[popover]) overrides via @layer components', () => {
	it('an `output[popover=manual]` ends up `position: fixed` from toast component layer', () => {
		const out = build('output')
		out.setAttribute('popover', 'manual')
		out.id = 'toast-anchor'
		mount(out)
		// Toast component (components/_output.scss) sets `position: fixed`
		// + viewport-corner inset-* values; the components layer beats the
		// surfaces layer regardless of selector specificity, so the toast
		// wins even though the surface rule sets position-area.
		expect(style(out, 'position').trim()).toBe('fixed')
	})
})
