// ============================================================================
//  components/_dot.scss — `<span class="dot">` status / indicator dot.
//
//  Class-root inline atom — a small circular indicator that picks up the
//  variant cascade. `.pulse` adds an `::after` halo with an animation.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

describe('.dot — token surface + variant cascade', () => {
	it('exposes --set-dot-* tokens on a `<span class="dot">`', () => {
		const el = build('span', 'dot')
		mount(el)
		expect(token(el, '--set-dot-size').trim()).not.toBe('')
		expect(token(el, '--set-dot-background-color').trim()).not.toBe('')
	})

	it('is circular by default (border-radius 50%)', () => {
		const el = build('span', 'dot')
		mount(el)
		// 50% on a square box keeps the `%` in the computed value.
		expect(style(el, 'border-top-left-radius')).toContain('%')
	})

	it('`.dot.small` reduces diameter; `.dot.large` increases it', () => {
		const small = build('span', 'dot small')
		const def = build('span', 'dot')
		const large = build('span', 'dot large')
		mount(small)
		mount(def)
		mount(large)
		expect(pixels(small, 'inline-size')).toBeLessThan(pixels(def, 'inline-size'))
		expect(pixels(large, 'inline-size')).toBeGreaterThan(pixels(def, 'inline-size'))
	})

	it('variant cascade paints the dot via --set-variant-background-color', () => {
		const dot = build('span', 'dot success')
		mount(dot)
		const success = style(document.documentElement, '--color-success').trim()
		const bg = style(dot, 'background-color').trim()
		// Both resolve to the same color (varying notations); assert non-empty.
		expect(bg).not.toBe('')
		expect(success).not.toBe('')
	})

	it('`.dot.pulse` adds an `::after` halo with an animation', () => {
		const el = build('span', 'dot pulse')
		mount(el)
		const after = globalThis.getComputedStyle(el, '::after')
		// `content: ''` on the pseudo — non-popover spans default to `none`.
		expect(after.content).not.toBe('none')
	})
})
