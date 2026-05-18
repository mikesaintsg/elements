// ============================================================================
//  components/_output.scss — toast / status-banner surface.
//
//  The toast root is a `<div role="status">`: a toast renders flow content
//  (`<header>` bands + paragraphs) that `<output>`'s phrasing-only HTML
//  content model forbids. `role="status"` IS `<output>`'s implicit ARIA
//  role (an atomic, polite live region), so the announcement semantic is
//  preserved exactly. (The bare `<output>` calc-result chip is unrelated
//  and keeps its own baseline in `elements/_output.scss` /
//  `tests/src/styles/elements/_output.test.ts`.)
//
//  Two toast shapes: a top-layer `popover`-promoted toast
//  (`[popover][role="status"]`), and an in-flow status banner
//  (`div[role="status"]:not([popover])`).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DIV' && child.getAttribute('role') === 'status') child.remove()
	}
})

describe('toast — token surface', () => {
	it('exposes --set-toast-* on :root', () => {
		expect(rootToken('--set-toast-color').trim()).not.toBe('')
		expect(rootToken('--set-toast-border-color').trim()).not.toBe('')
		expect(rootToken('--set-toast-edge-inset').trim()).not.toBe('')
	})
})

describe('toast — `<div role="status" popover>` is a fixed-position banner', () => {
	it('paints flex layout with non-zero padding', () => {
		const out = build('div')
		out.setAttribute('role', 'status')
		out.setAttribute('popover', 'manual')
		out.id = 'toast-1'
		out.textContent = 'Saved'
		mount(out)
		// `display: flex` is gated on `:popover-open` so the UA's
		// `display: none` for closed popovers wins (otherwise a closed
		// toast would stay visible at its corner). Open the popover so
		// the open-state rule applies.
		out.showPopover()
		expect(style(out, 'display')).toBe('flex')
		expect(pixels(out, 'padding-top')).toBeGreaterThan(0)
	})

	it('positions at the bottom-end corner by default', () => {
		const out = build('div')
		out.setAttribute('role', 'status')
		out.setAttribute('popover', 'manual')
		out.id = 'toast-corner'
		out.textContent = 'Saved'
		mount(out)
		expect(style(out, 'position')).toBe('fixed')
		expect(pixels(out, 'inset-block-end')).toBeGreaterThan(0)
		expect(pixels(out, 'inset-inline-end')).toBeGreaterThan(0)
	})
})

describe('toast — `<div role="status">` (in-flow, no popover) gets banner shape', () => {
	it('without `.filled`, a div[role=status] is a flex banner', () => {
		const out = build('div')
		out.setAttribute('role', 'status')
		out.textContent = 'Saving…'
		mount(out)
		expect(style(out, 'display')).toBe('flex')
	})
})
