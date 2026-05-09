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

	it('`<menu popover>` flips to a vertical flex column', () => {
		const menu = build('menu')
		menu.setAttribute('popover', '')
		menu.id = 'test-popover'
		mount(menu)
		expect(style(menu, 'flex-direction')).toBe('column')
	})

	it('a `<menu>` nested inside a `[popover]` panel also flips vertical', () => {
		const div = build('div')
		div.setAttribute('popover', '')
		div.id = 'wrapping-popover'
		const menu = build('menu')
		div.appendChild(menu)
		mount(div)
		expect(style(menu, 'flex-direction')).toBe('column')
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
