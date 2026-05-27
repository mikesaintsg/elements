// ============================================================================
//  _tabs.scss — `[aria-selected]` state-gated styling on tab triggers.
//
//  Three modifier classes (`.pills`, `.vertical`, `.bordered`) re-paint
//  the tablist; each retunes `[role='tab'][aria-selected='true']` styling
//  relative to the resting trigger. These tests assert the active vs.
//  resting computed-style difference for each modifier — proving the
//  ARIA-attribute gate is the cascade-side source of truth for which
//  trigger looks selected.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, style } from '../../../setupStyles'

function renderTablist(modifier: 'pills' | 'vertical' | 'bordered'): {
	readonly tablist: HTMLElement
	readonly active: HTMLButtonElement
	readonly resting: HTMLButtonElement
} {
	const tablist = document.createElement('div')
	tablist.setAttribute('role', 'tablist')
	tablist.classList.add(modifier)
	const active = document.createElement('button')
	active.type = 'button'
	active.setAttribute('role', 'tab')
	active.setAttribute('aria-selected', 'true')
	active.textContent = 'One'
	const resting = document.createElement('button')
	resting.type = 'button'
	resting.setAttribute('role', 'tab')
	resting.setAttribute('aria-selected', 'false')
	resting.textContent = 'Two'
	tablist.append(active, resting)
	mount(tablist)
	return { tablist, active, resting }
}

describe('tablist.pills — [aria-selected] background gate', () => {
	it('rule is declared in the loaded cascade', () => {
		expect(findRule(`[role="tablist"].pills`)).toBe(true)
	})

	it('active trigger paints a non-transparent background; resting does not', () => {
		const { active, resting } = renderTablist('pills')
		const activeBg = style(active, 'background-color')
		const restingBg = style(resting, 'background-color')
		// `.pills [aria-selected="true"]` sets background to `--set-tab-
		// active-color`. The resting trigger inherits the unstyled tablist
		// chrome (typically rgba(0, 0, 0, 0) or transparent).
		expect(activeBg).not.toBe(restingBg)
		expect(activeBg).not.toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)/)
	})
})

describe('tablist.vertical — [aria-selected] inline-end indicator gate', () => {
	it('rule is declared in the loaded cascade', () => {
		expect(findRule(`[role="tablist"].vertical`)).toBe(true)
	})

	it('active trigger paints a colored inline-end border; resting border is transparent', () => {
		const { active, resting } = renderTablist('vertical')
		const activeBorder = style(active, 'border-inline-end-color')
		const restingBorder = style(resting, 'border-inline-end-color')
		// Active: `border-inline-end-color: var(--set-tab-active-color)`.
		// Resting: `border-inline-end: var(--set-tab-active-indicator-size) solid transparent`.
		expect(activeBorder).not.toBe(restingBorder)
	})
})

describe('tablist.bordered — [aria-selected] frame gate', () => {
	it('rule is declared in the loaded cascade', () => {
		expect(findRule(`[role="tablist"].bordered`)).toBe(true)
	})

	it('active trigger paints a non-transparent border + canvas background', () => {
		const { active, resting } = renderTablist('bordered')
		// Active: `border-color: var(--set-tablist-border-color)` and
		// `background-color: var(--color-canvas)`. Resting border is
		// transparent (initial `border: ... solid transparent`).
		expect(style(active, 'border-top-color')).not.toBe(style(resting, 'border-top-color'))
		expect(style(active, 'background-color')).not.toBe(style(resting, 'background-color'))
	})
})
