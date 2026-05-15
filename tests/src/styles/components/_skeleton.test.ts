// ============================================================================
//  components/_skeleton.scss — `<div class="skeleton">` loading placeholder.
//
//  Animated gradient highlight over a base bg. `.circle` overrides
//  border-radius to 50%; `.text` switches to inline-block + line-height
//  block-size for inline-text placeholders.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, style, token } from '../../../setupStyles'

describe('.skeleton — token surface + animation', () => {
	it('exposes --set-skeleton-* tokens on a `<div class="skeleton">`', () => {
		const el = build('div', 'skeleton')
		mount(el)
		expect(token(el, '--set-skeleton-background-color').trim()).not.toBe('')
		expect(token(el, '--set-skeleton-highlight-color').trim()).not.toBe('')
		expect(token(el, '--set-skeleton-duration').trim()).not.toBe('')
	})

	it('runs the `skeleton-shimmer` animation', () => {
		const el = build('div', 'skeleton')
		mount(el)
		expect(style(el, 'animation-name')).toBe('skeleton-shimmer')
	})

	it('paints a gradient highlight layer over the base bg', () => {
		const el = build('div', 'skeleton')
		mount(el)
		expect(style(el, 'background-image')).toContain('gradient')
	})

	it('`.skeleton.circle` overrides border-radius to 50%', () => {
		const el = build('div', 'skeleton circle')
		mount(el)
		expect(style(el, 'border-top-left-radius')).toContain('%')
	})

	it('`.skeleton.text` switches to inline-block + line-height block-size', () => {
		const el = build('span', 'skeleton text')
		mount(el)
		expect(style(el, 'display')).toBe('inline-block')
	})
})
