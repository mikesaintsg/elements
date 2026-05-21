// ============================================================================
//  components/_avatar.scss — `<span class="avatar">` circular identity chip.
//
//  Class-root inline atom for a circular initials or image badge with no
//  semantic HTML home. Token surface + variant cascade + size/shape modifiers.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

describe('.avatar — token surface + variant cascade', () => {
	it('exposes --set-avatar-* tokens on a `<span class="avatar">`', () => {
		const el = build('span', 'avatar', 'MS')
		mount(el)
		expect(token(el, '--set-avatar-size').trim()).not.toBe('')
		expect(token(el, '--set-avatar-color').trim()).not.toBe('')
		expect(token(el, '--set-avatar-background-color').trim()).not.toBe('')
		expect(token(el, '--set-avatar-border-radius').trim()).not.toBe('')
	})

	it('renders as a circle — equal inline-size and block-size, full border-radius', () => {
		const el = build('span', 'avatar', 'MS')
		mount(el)
		const w = pixels(el, 'width')
		const h = pixels(el, 'height')
		expect(w).toBeGreaterThan(0)
		expect(w).toBe(h)
		// 9999px border-radius resolves to a very large pixel value (capped by box).
		const radius = pixels(el, 'border-top-left-radius')
		expect(radius).toBeGreaterThan(100)
	})

	it('`.avatar.primary` paints the primary `bg-subtle` + `text-emphasis` pair', () => {
		const el = build('span', 'avatar primary', 'MS')
		mount(el)
		const bgSubtle = style(document.documentElement, '--color-primary-bg-subtle').trim()
		const textEmphasis = style(document.documentElement, '--color-primary-text-emphasis').trim()
		expect(token(el, '--set-avatar-background-color').trim()).toContain(
			bgSubtle.match(/[\w-]+/)?.[0] ?? '',
		)
		expect(token(el, '--set-avatar-color').trim()).toContain(
			textEmphasis.match(/[\w-]+/)?.[0] ?? '',
		)
	})

	it('`.avatar.small` retunes size token to a smaller diameter', () => {
		const base = build('span', 'avatar', 'MS')
		const small = build('span', 'avatar small', 'MS')
		mount(base)
		mount(small)
		const baseSize = pixels(base, 'width')
		const smallSize = pixels(small, 'width')
		expect(smallSize).toBeLessThan(baseSize)
	})

	it('`.avatar.large` retunes size token to a larger diameter', () => {
		const base = build('span', 'avatar', 'MS')
		const large = build('span', 'avatar large', 'MS')
		mount(base)
		mount(large)
		const baseSize = pixels(base, 'width')
		const largeSize = pixels(large, 'width')
		expect(largeSize).toBeGreaterThan(baseSize)
	})

	it('`.avatar.square` drops border-radius to a rounded-rect (not a full circle)', () => {
		const el = build('span', 'avatar square', 'MS')
		mount(el)
		const radius = pixels(el, 'border-top-left-radius')
		// Rounded-rect: > 0 but NOT the capped 9999px circle value.
		expect(radius).toBeGreaterThan(0)
		expect(radius).toBeLessThan(100)
	})

	it('a child <img> inside .avatar fills the circle', () => {
		const el = build('span', 'avatar', '')
		const img = document.createElement('img')
		img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOW=='
		img.alt = 'Test avatar'
		el.appendChild(img)
		mount(el)
		expect(style(img, 'object-fit')).toBe('cover')
		expect(style(img, 'inline-size') || style(img, 'width')).not.toBe('0px')
	})
})
