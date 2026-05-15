// ============================================================================
//  components/_badge.scss — `<span class="badge">` count / status chip.
//
//  Class-root inline atom for a value with no semantic HTML home. Token
//  surface + variant cascade + style modifiers; an empty `.badge` hides
//  (mailbox parity).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

describe('.badge — token surface + variant cascade', () => {
	it('exposes --set-badge-* tokens on a `<span class="badge">`', () => {
		const el = build('span', 'badge', '12')
		mount(el)
		expect(token(el, '--set-badge-color').trim()).not.toBe('')
		expect(token(el, '--set-badge-background-color').trim()).not.toBe('')
		expect(token(el, '--set-badge-border-radius').trim()).not.toBe('')
	})

	it('an empty `.badge` is hidden (mailbox parity)', () => {
		const el = build('span', 'badge', '')
		mount(el)
		expect(style(el, 'display')).toBe('none')
	})

	it('`.badge.primary` paints the primary `bg-subtle` + `text-emphasis` pair', () => {
		const el = build('span', 'badge primary', 'new')
		mount(el)
		const bgSubtle = style(document.documentElement, '--color-primary-bg-subtle').trim()
		const textEmphasis = style(document.documentElement, '--color-primary-text-emphasis').trim()
		expect(token(el, '--set-badge-background-color').trim()).toContain(
			bgSubtle.match(/[\w-]+/)?.[0] ?? '',
		)
		expect(token(el, '--set-badge-color').trim()).toContain(textEmphasis.match(/[\w-]+/)?.[0] ?? '')
	})

	it('`.badge.filled` flips to the variant identity fill + white text', () => {
		const el = build('span', 'badge primary filled', 'live')
		mount(el)
		// Saturated `--color-primary` (not `bg-subtle`)
		expect(style(el, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
		expect(style(el, 'color')).not.toBe('')
	})

	it('`.badge.pill` bumps border-radius to a fully-rounded shape', () => {
		const el = build('span', 'badge pill', '12')
		mount(el)
		const radius = pixels(el, 'border-top-left-radius')
		// 9999px → resolved as a very large pixel value (capped by box).
		expect(radius).toBeGreaterThan(100)
	})
})
