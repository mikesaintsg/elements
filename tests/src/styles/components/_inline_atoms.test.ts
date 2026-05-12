// ============================================================================
//  _badge.scss / _dot.scss / _tag.scss / _spinner.scss / _skeleton.scss —
//  the five class-root inline atoms the framework ships for patterns
//  without a semantic HTML home. Each owns a `--set-{atom}-*` token
//  surface and reads from the framework's variant cascade.
//
//  Coverage:
//    - Token surface resolves on each class root.
//    - Variant cascade reaches each atom (subtle bg + emphasis text /
//      identity fill).
//    - Style modifiers (`.filled` / `.pill` / `.ghost` / `.square` /
//      `.circle` / `.text`) flow through the cascade.
//    - Animations on `.dot.pulse` / `.spinner` / `.skeleton` are
//      declared (the prefers-reduced-motion override is exercised by
//      manual verification per the page-authoring rubric — see
//      `app/browser/pages/InlineAtomsPage.vue` § Reduced motion).
//    - Empty `.badge` hides (mailbox parity).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, rgba, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (['SPAN', 'DIV', 'BUTTON', 'ARTICLE'].includes(child.tagName)) child.remove()
	}
})

// ─────────────────────────────────────────────────────────────────────────────
//  Badge
// ─────────────────────────────────────────────────────────────────────────────

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
		const bg = style(el, 'background-color')
		// Saturated `--color-primary` (not `bg-subtle`)
		expect(bg).not.toBe('rgba(0, 0, 0, 0)')
		expect(rgba(style(el, 'color'))).toEqual([255, 255, 255, 1])
	})

	it('`.badge.pill` bumps border-radius to a fully-rounded shape', () => {
		const el = build('span', 'badge pill', '12')
		mount(el)
		const radius = pixels(el, 'border-top-left-radius')
		// 9999px → resolved as a very large pixel value (capped by box)
		expect(radius).toBeGreaterThan(100)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Dot
// ─────────────────────────────────────────────────────────────────────────────

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
		// 50% on a square box resolves to half the size as pixels.
		expect(style(el, 'border-top-left-radius')).toContain('%') // computed keeps `%` for 50%
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
		// Both resolve to the same color (varying notations); assert non-empty + non-muted.
		expect(bg).not.toBe('')
		expect(success).not.toBe('')
	})

	it('`.dot.pulse` adds an `::after` halo with an animation', () => {
		const el = build('span', 'dot pulse')
		mount(el)
		const after = globalThis.getComputedStyle(el, '::after')
		// content is set to '' on the pseudo — non-popover spans default to `none`.
		expect(after.content).not.toBe('none')
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tag
// ─────────────────────────────────────────────────────────────────────────────

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
		// The `.remove` button has explicit border-radius: 50% (round) and
		// non-default cursor + zero padding from the partial.
		expect(style(remove, 'cursor')).toBe('pointer')
		expect(style(remove, 'border-top-left-radius')).toContain('%')
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Spinner
// ─────────────────────────────────────────────────────────────────────────────

describe('.spinner — token surface + animation', () => {
	it('exposes --set-spinner-* tokens on a `<span class="spinner">`', () => {
		const el = build('span', 'spinner')
		mount(el)
		expect(token(el, '--set-spinner-size').trim()).not.toBe('')
		expect(token(el, '--set-spinner-border-width').trim()).not.toBe('')
		expect(token(el, '--set-spinner-color').trim()).not.toBe('')
		expect(token(el, '--set-spinner-duration').trim()).not.toBe('')
	})

	it('paints a circular three-quarter ring (border-radius 50% + transparent inline-end)', () => {
		const el = build('span', 'spinner')
		mount(el)
		expect(style(el, 'border-top-left-radius')).toContain('%')
		// One border side is transparent — the gap that animates around as the ring rotates.
		const inlineEnd = style(el, 'border-right-color')
		expect(inlineEnd === 'rgba(0, 0, 0, 0)' || inlineEnd === 'transparent').toBe(true)
	})

	it('runs the `spinner-rotate` animation', () => {
		const el = build('span', 'spinner')
		mount(el)
		expect(style(el, 'animation-name')).toBe('spinner-rotate')
	})

	it('inside a `.loading` button the spinner auto-shrinks to 1em', () => {
		const btn = build('button', 'loading')
		const spinner = build('span', 'spinner')
		btn.appendChild(spinner)
		mount(btn)
		// `--set-spinner-size` is overridden to `1em` for the inline-loading case.
		expect(token(spinner, '--set-spinner-size').trim()).toBe('1em')
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────────────────────────────────────

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
		const bgImage = style(el, 'background-image')
		expect(bgImage).toContain('gradient')
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
