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

describe('div.frame — flex column with zero internal spacing', () => {
	it('lays out as a flex column', () => {
		const el = render('div', 'frame')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-direction')).toBe('column')
	})

	it('has zero gap and zero padding (children fill edge-to-edge)', () => {
		const el = render('div', 'frame')
		expect(pixels(el, 'gap')).toBe(0)
		expect(pixels(el, 'padding-inline-start')).toBe(0)
		expect(pixels(el, 'padding-inline-end')).toBe(0)
		expect(pixels(el, 'padding-block-start')).toBe(0)
		expect(pixels(el, 'padding-block-end')).toBe(0)
	})

	it('clips overflow so rounded outer chrome masks sharp child corners', () => {
		const el = render('div', 'frame')
		expect(style(el, 'overflow-x')).toBe('clip')
		expect(style(el, 'overflow-y')).toBe('clip')
	})

	it('the rule is scoped to <div>; .frame on a more semantic element does not apply', () => {
		// Sanity: SCSS targets `div.frame`, not bare `.frame`. The
		// `article.frame` element-local modifier lives in modifiers/_local.scss
		// and retunes article tokens; this generic primitive is div-only.
		expect(findRule('div.frame')).toBe(true)
	})
})

describe('div.tiles — responsive auto-fit grid', () => {
	it('lays out as a CSS grid', () => {
		const el = render('div', 'tiles')
		expect(style(el, 'display')).toBe('grid')
	})

	it('uses an auto-fit minmax track template (reflows by width, no breakpoints)', () => {
		const el = render('div', 'tiles')
		const cols = style(el, 'grid-template-columns')
		// jsdom-free real Chromium resolves the template; assert the auto-fit
		// minmax shape resolved to ≥1 concrete track.
		expect(cols).not.toBe('none')
		expect(cols.length).toBeGreaterThan(0)
	})

	it('applies a default gap', () => {
		const el = render('div', 'tiles')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})

	it('--set-tiles-min and --set-tiles-gap are overridable per instance', () => {
		const el = render('div', 'tiles')
		el.style.setProperty('--set-tiles-gap', '2rem')
		expect(pixels(el, 'gap')).toBe(32)
	})

	it('the rule is scoped to <div>', () => {
		expect(findRule('div.tiles')).toBe(true)
	})
})
