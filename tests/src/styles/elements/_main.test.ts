// ============================================================================
//  _main.scss — primary content landmark baseline.
//
//  `<main>` is the dominant content of the document body. The framework
//  hydrates it as a flex-column container with fluid inline padding and a
//  generous gap so its top-level sectioning children (`<section>`,
//  `<article>`, …) get consistent rhythm out of the box. The body-grid rule
//  in `components/_main.scss` layers `overflow-y: auto` on top when `<main>`
//  is a child of the layout shell.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'MAIN') child.remove()
	}
})

describe('main — bare baseline', () => {
	it('renders as a flex-column container', () => {
		const el = render('main', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
	})

	it('declares the --set-main-* token surface', () => {
		const el = render('main', '')
		expect(token(el, '--set-main-padding-inline')).not.toBe('')
		expect(token(el, '--set-main-padding-block')).not.toBe('')
		expect(token(el, '--set-main-gap')).not.toBe('')
	})

	it('paints inline padding gutters on both sides', () => {
		const el = render('main', '')
		expect(pixels(el, 'padding-left')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-right')).toBeGreaterThan(0)
	})

	it('paints vertical padding above first / below last child', () => {
		const el = render('main', '')
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-bottom')).toBeGreaterThan(0)
	})

	it('sets a flex gap larger than --set-section-gap (page-level rhythm)', () => {
		const el = render('main', '')
		expect(pixels(el, 'row-gap')).toBeGreaterThan(0)
	})
})
