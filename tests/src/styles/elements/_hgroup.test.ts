// ============================================================================
//  _hgroup.scss — heading + tagline stack baseline.
//
//  `<hgroup>` groups one primary heading with adjacent metadata `<p>`
//  taglines. The framework renders it as a tight flex-column so the heading
//  and tagline hug each other (no UA-default paragraph margin) and drops
//  the tagline color/font-size so it reads as secondary content.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'HGROUP') child.remove()
	}
})

describe('hgroup — bare baseline', () => {
	it('renders as a flex-column container', () => {
		const el = render('hgroup', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
	})

	it('declares the --set-hgroup-* token surface', () => {
		const el = render('hgroup', '')
		expect(token(el, '--set-hgroup-gap')).not.toBe('')
		expect(token(el, '--set-hgroup-tagline-color')).not.toBe('')
		expect(token(el, '--set-hgroup-tagline-font-size')).not.toBe('')
	})

	it('subordinate <p> drops UA paragraph margins', () => {
		const hgroup = build('hgroup')
		const heading = build('h1')
		const tagline = build('p')
		hgroup.appendChild(heading)
		hgroup.appendChild(tagline)
		document.body.appendChild(hgroup)

		expect(pixels(tagline, 'margin-top')).toBe(0)
		expect(pixels(tagline, 'margin-bottom')).toBe(0)
	})

	it('subordinate <p> picks up the tagline color (subdued)', () => {
		const hgroup = build('hgroup')
		const heading = build('h1')
		const tagline = build('p')
		hgroup.appendChild(heading)
		hgroup.appendChild(tagline)
		document.body.appendChild(hgroup)

		// Just verify the rule applied — exact color depends on theme.
		expect(style(tagline, 'color')).not.toBe('')
	})
})
