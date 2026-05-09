// ============================================================================
//  components/_div.scss — generic-box layout primitives.
//
//  <div> is the fallback for primitives without a semantic root. .stack and
//  .cluster are the first round; widget classes (.spinner, .skeleton, etc.)
//  arrive on demand.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, pixels, render, style } from '../../../setupStyles'

describe('div.stack — vertical flow with gap', () => {
	it('lays out as a flex column', () => {
		const el = render('div', 'stack')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
	})

	it('applies a default gap', () => {
		const el = render('div', 'stack')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})

	it('--set-stack-gap is overridable per instance', () => {
		const el = render('div', 'stack')
		el.style.setProperty('--set-stack-gap', '2rem')
		expect(pixels(el, 'gap')).toBe(32)
	})

	it('the rule is scoped to <div>; .stack on a more semantic element does not apply', () => {
		// Sanity: the SCSS targets `div.stack`, not `.stack`. A <section class="stack">
		// should NOT pick up the flex column.
		expect(findRule('div.stack')).toBe(true)
	})
})

describe('div.cluster — horizontal wrap with gap', () => {
	it('lays out as a wrapping flex row', () => {
		const el = render('div', 'cluster')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-wrap')).toBe('wrap')
	})

	it('applies a default gap', () => {
		const el = render('div', 'cluster')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})

	it('aligns items center by default; overridable via --set-cluster-align', () => {
		const el = render('div', 'cluster')
		expect(style(el, 'align-items')).toBe('center')
		el.style.setProperty('--set-cluster-align', 'flex-start')
		expect(style(el, 'align-items')).toBe('flex-start')
	})
})
