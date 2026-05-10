// ============================================================================
//  Dropdown chrome — `<menu popover>` paired with `<button popovertarget>`.
//
//  The popover surface (surfaces/_popover.scss) paints the panel chrome
//  on `[popover]`; this partial extends `_menu.scss` to flip menu's
//  default horizontal toolbar layout into a vertical column when the
//  menu IS the popover panel (or sits inside one).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'MENU' || child.tagName === 'DIV' || child.tagName === 'BUTTON') {
			child.remove()
		}
	}
})

describe('dropdown — `<menu popover>` flips to a vertical column', () => {
	it('a bare `<menu>` is a horizontal flex row', () => {
		const menu = build('menu')
		mount(menu)
		expect(style(menu, 'display')).toBe('flex')
		expect(style(menu, 'flex-direction')).toBe('row')
	})

	it('`<menu popover>` flips to a vertical flex column when shown', () => {
		const menu = build('menu')
		menu.setAttribute('popover', '')
		menu.id = 'test-popover'
		mount(menu)
		// The framework only flips the menu to a column AFTER it enters
		// `:popover-open` — closed popovers inherit the platform's
		// `display: none` so they don't render at all in the document
		// flow. The previous "always-flex" version forced popover-mode
		// menus to render in-page, which broke `useMenu` / `useSelect`
		// (the `:popover-open` flip became a no-op since `display` was
		// already non-none, so the menu never entered the top layer).
		menu.showPopover()
		expect(style(menu, 'flex-direction')).toBe('column')
		menu.hidePopover()
	})

	it('a `<menu>` nested inside a `[popover]` panel also flips vertical when shown', () => {
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'wrapping-popover'
		const menu = build('menu')
		div.appendChild(menu)
		mount(div)
		div.showPopover()
		expect(style(menu, 'flex-direction')).toBe('column')
		div.hidePopover()
	})
})

describe('dropdown — popover surface paints panel chrome', () => {
	it('`[popover]` carries a border-radius from the popover surface', () => {
		const menu = build('menu')
		menu.setAttribute('popover', '')
		menu.id = 'rad-popover'
		mount(menu)
		expect(style(menu, 'border-top-left-radius')).not.toBe('0px')
	})
})
