// ============================================================================
//  Toast chrome — `<output popover>` (or `<output role="status">` standalone).
//
//  Output's element baseline styles it as a calc-result chip; the
//  component layer extends two specific shapes on top: a top-layer
//  `popover`-promoted toast, and an in-flow status banner. These tests
//  assert the chrome paints under both shapes.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'OUTPUT') child.remove()
	}
})

describe('toast — token surface', () => {
	it('exposes --set-toast-* on :root', () => {
		expect(rootToken('--set-toast-color').trim()).not.toBe('')
		expect(rootToken('--set-toast-border-color').trim()).not.toBe('')
		expect(rootToken('--set-toast-edge-inset').trim()).not.toBe('')
	})
})

describe('toast — `<output popover>` is a fixed-position banner', () => {
	it('paints flex layout with non-zero padding', () => {
		const out = build('output')
		out.setAttribute('popover', 'manual')
		out.id = 'toast-1'
		out.textContent = 'Saved'
		mount(out)
		expect(style(out, 'display')).toBe('flex')
		expect(pixels(out, 'padding-top')).toBeGreaterThan(0)
	})

	it('positions at the bottom-end corner by default', () => {
		const out = build('output')
		out.setAttribute('popover', 'manual')
		out.id = 'toast-corner'
		out.textContent = 'Saved'
		mount(out)
		expect(style(out, 'position')).toBe('fixed')
		expect(pixels(out, 'inset-block-end')).toBeGreaterThan(0)
		expect(pixels(out, 'inset-inline-end')).toBeGreaterThan(0)
	})
})

describe('toast — `<output role="status">` (in-flow) gets banner shape', () => {
	it('without `.filled` (the calc-chip opt-in), an output[role=status] is a flex banner', () => {
		const out = build('output')
		out.setAttribute('role', 'status')
		out.textContent = 'Saving…'
		mount(out)
		expect(style(out, 'display')).toBe('flex')
	})
})
