// ============================================================================
//  components/_spinner.scss — `<span class="spinner">` rotating loading ring.
//
//  Three-quarter ring with `spinner-rotate` animation. Standalone usage
//  resolves color via `--set-variant-background-color` (the IDENTITY tint);
//  inside a `.loading` button the override re-routes to `currentColor` so
//  the spinner paints the button's text color.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, style, token } from '../../../setupStyles'

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

	it('standalone `<span class="spinner primary">` paints the variant IDENTITY (not contrast)', () => {
		// Regression: an earlier draft resolved spinner color through
		// `--set-variant-color` (the white-on-fill contrast color), so a
		// standalone `<span class="spinner primary">` on the page canvas
		// painted white — invisible in light mode. Fix: baseline cascade
		// resolves to `--set-variant-background-color` (the IDENTITY tint)
		// so standalone spinners read as their variant identity.
		const spinner = build('span', 'spinner primary')
		mount(spinner)
		const primaryIdentity = style(document.documentElement, '--color-primary').trim()
		const borderTop = style(spinner, 'border-top-color').trim()
		expect(primaryIdentity).not.toBe('')
		expect(borderTop).not.toBe('rgba(0, 0, 0, 0)')
		// Hue match — both primary identity and the resolved border use
		// the same `264` hue (the framework's tuned royal-cobalt primary).
		expect(borderTop).toContain('264')
	})

	it('spinner inside a `.loading` button uses `currentColor` (contrast on filled bg)', () => {
		const btn = build('button', 'primary loading')
		const spinner = build('span', 'spinner')
		btn.appendChild(spinner)
		mount(btn)
		// Override re-routes spinner color to `currentColor`, which the
		// button's own color cascade resolves to the contrast tier
		// (white on a filled `.primary` button).
		expect(token(spinner, '--set-spinner-color').trim()).toBe('currentColor')
	})
})
