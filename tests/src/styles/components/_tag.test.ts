// ============================================================================
//  components/_tag.scss — `<span class="tag">` keyword / chip atom.
//
//  Pill-shaped by default; opts out via `.square`. Variant + style cascade
//  applies. `<button class="tag">` auto-promotes to interactive; a nested
//  `<button class="remove">` paints a dismiss glyph.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

describe('.tag — token surface + variant cascade', () => {
	it('exposes --set-tag-* tokens on a `<span class="tag">`', () => {
		const el = build('span', 'tag', 'label')
		mount(el)
		expect(token(el, '--set-tag-color').trim()).not.toBe('')
		expect(token(el, '--set-tag-background-color').trim()).not.toBe('')
		expect(token(el, '--set-tag-border-color').trim()).not.toBe('')
		expect(token(el, '--set-tag-border-radius').trim()).not.toBe('')
	})

	it('is pill-shaped by default (border-radius 9999px → capped to half the box)', () => {
		const el = build('span', 'tag', 'label')
		mount(el)
		expect(pixels(el, 'border-top-left-radius')).toBeGreaterThan(100)
	})

	it('`.tag.square` opts out of the pill shape', () => {
		const def = build('span', 'tag', 'pill')
		const square = build('span', 'tag square', 'square')
		mount(def)
		mount(square)
		expect(pixels(square, 'border-top-left-radius')).toBeLessThan(
			pixels(def, 'border-top-left-radius'),
		)
	})

	it('`.tag.filled` flips to a saturated variant identity bg', () => {
		const el = build('span', 'tag primary filled', 'live')
		mount(el)
		expect(style(el, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
	})

	it('`.tag.ghost` strips the tinted background', () => {
		const el = build('span', 'tag ghost', 'label')
		mount(el)
		const bg = style(el, 'background-color')
		expect(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent').toBe(true)
	})

	it('`<button class="tag">` auto-promotes to interactive (cursor: pointer)', () => {
		const btn = build('button', 'tag', 'chip')
		mount(btn)
		expect(style(btn, 'cursor')).toBe('pointer')
	})

	it('a descendant `<button class="remove">` paints a dismiss glyph baseline', () => {
		const tag = build('span', 'tag primary', 'frontend')
		const remove = build('button', 'remove', '×')
		tag.appendChild(remove)
		mount(tag)
		// `.remove` button: explicit border-radius: 50% + non-default cursor.
		expect(style(remove, 'cursor')).toBe('pointer')
		expect(style(remove, 'border-top-left-radius')).toContain('%')
	})
})
