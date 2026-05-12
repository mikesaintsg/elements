// ============================================================================
//  Tabs chrome — `[role="tablist"]` + `[role="tab"]` + `[role="tabpanel"]`.
//
//  The framework styles the role attributes directly so any element can
//  carry the tablist semantics (the canonical pattern is `<nav
//  role="tablist">`, but `<menu role="tablist">` or `<div role="tablist">`
//  work too). These tests assert the chrome paints regardless of which
//  element carries the role.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, render, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (tag === 'NAV' || tag === 'MENU' || tag === 'DIV' || tag === 'SECTION') {
			child.remove()
		}
	}
})

describe('tabs — token surface', () => {
	it('exposes --set-tablist-* / --set-tab-* / --set-tabpanel-* on :root', () => {
		expect(rootToken('--set-tablist-color').trim()).not.toBe('')
		expect(rootToken('--set-tablist-border-color').trim()).not.toBe('')
		expect(rootToken('--set-tab-color').trim()).not.toBe('')
		expect(rootToken('--set-tab-active-color').trim()).not.toBe('')
		expect(rootToken('--set-tabpanel-padding-block').trim()).not.toBe('')
	})
})

describe('tabs — tablist chrome', () => {
	it('`<nav role="tablist">` paints a flex row with NO opinionated baseline track', () => {
		// User feedback during NavPage authoring: the continuous
		// `border-block-end` on the bare tablist read as opinionated
		// chrome the framework hadn't earned. The active tab's own
		// `border-block-end-color` indicator (declared on `[role="tab"]`)
		// carries the entire "this is the active tab" signal. Stretched-
		// row variants (`.bordered` / `.pills` / `.vertical`) live in
		// `composables/_tabs.scss` and earn their chrome under `useTabs`.
		const nav = build('nav')
		nav.setAttribute('role', 'tablist')
		mount(nav)
		expect(style(nav, 'display')).toBe('flex')
		expect(pixels(nav, 'border-bottom-width')).toBe(0)
	})

	it('`<menu role="tablist">` (non-`<nav>` host) gets the same chrome', () => {
		const menu = build('menu')
		menu.setAttribute('role', 'tablist')
		mount(menu)
		expect(style(menu, 'display')).toBe('flex')
		expect(pixels(menu, 'border-bottom-width')).toBe(0)
	})
})

describe('tabs — `[role="tab"]` chrome', () => {
	it('paints a flex container with a pill-shaped border-radius (no border-line)', () => {
		const nav = build('nav')
		nav.setAttribute('role', 'tablist')
		const tab = build('button')
		tab.setAttribute('role', 'tab')
		tab.textContent = 'Profile'
		nav.appendChild(tab)
		mount(nav)
		// The display resolves to either `flex` or `inline-flex` depending on
		// which layer wins (nav-tab role wraps button, both are inline-flex).
		expect(style(tab, 'display')).toMatch(/flex/)
		// Active-state indicator is a background fill (matching the
		// framework's nav-row `aria-current="page"` idiom), NOT a
		// bottom-border line. The pill shape comes from the button
		// baseline's `border-radius`.
		expect(pixels(tab, 'border-bottom-width')).toBe(0)
		expect(pixels(tab, 'border-top-left-radius')).toBeGreaterThan(0)
	})

	it('`aria-selected="true"` flips the tab to a `bg-subtle` fill + emphasis text', () => {
		const nav = build('nav')
		nav.setAttribute('role', 'tablist')
		const tab = build('button')
		tab.setAttribute('role', 'tab')
		tab.setAttribute('aria-selected', 'true')
		tab.textContent = 'Profile'
		const sibling = build('button')
		sibling.setAttribute('role', 'tab')
		sibling.textContent = 'Account'
		nav.appendChild(tab)
		nav.appendChild(sibling)
		mount(nav)

		const activeBg = style(tab, 'background-color')
		const siblingBg = style(sibling, 'background-color')

		// Active tab has a non-transparent bg; sibling is transparent.
		expect(activeBg).not.toBe(siblingBg)
		expect(activeBg).not.toBe('rgba(0, 0, 0, 0)')
		// Inactive tab keeps the transparent toolbar bg.
		expect(siblingBg).toBe('rgba(0, 0, 0, 0)')
	})
})

describe('tabs — `[role="tabpanel"]`', () => {
	it('paints block-direction padding so the panel separates from the tablist track', () => {
		const panel = render('section', '')
		panel.setAttribute('role', 'tabpanel')
		expect(pixels(panel, 'padding-top')).toBeGreaterThan(0)
	})

	it('honours the `[hidden]` attribute (display: none)', () => {
		const panel = render('section', '')
		panel.setAttribute('role', 'tabpanel')
		panel.setAttribute('hidden', '')
		expect(style(panel, 'display')).toBe('none')
	})
})
