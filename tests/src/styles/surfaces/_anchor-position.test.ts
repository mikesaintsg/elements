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
		// auto / hint. A bare `<div popover>` WITHOUT `role="status"` is
		// NOT a toast, so it gets the anchor surface (the toast component
		// overrides this only for `[popover][role="status"]` via @layer
		// components; see the toast test below for the override path).
		const div = build('div')
		div.setAttribute('popover', 'manual')
		div.id = 'manual-anchor'
		mount(div)
		expect(style(div, 'position-area').trim()).not.toBe('')
	})
})

describe('anchor-position — toast ([popover][role="status"]) excluded from surface defaults', () => {
	it('a `<div role="status" popover="manual">` keeps the toast component-layer `position: fixed`', () => {
		// The toast root is `<div role="status">` (a toast renders flow
		// content `<output>`'s phrasing-only content model forbids;
		// `role="status"` is `<output>`'s implicit role so the polite
		// live-region announcement semantic is preserved). The surface
		// rule scopes itself with `:not(:where(…, [role="status"]))` so
		// toast's component-layer `position: fixed` resolves cleanly.
		// Without the scope, the surface `[popover] { position: absolute }`
		// would win because surfaces layer beats components in our cascade
		// order (theme < base < elements < components < surfaces).
		const toast = build('div')
		toast.setAttribute('role', 'status')
		toast.setAttribute('popover', 'manual')
		toast.id = 'toast-anchor'
		mount(toast)
		expect(style(toast, 'position').trim()).toBe('fixed')
	})
})
