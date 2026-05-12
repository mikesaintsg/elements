// ============================================================================
//  Dropdown chrome — `<menu popover>` paired with `<button popovertarget>`.
//
//  The popover surface (surfaces/_popover.scss) paints the panel chrome
//  on `[popover]`; this partial extends `_menu.scss` to flip menu's
//  default horizontal toolbar layout into a vertical column when the
//  menu IS the popover panel (or sits inside one).
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, style } from '../../../setupStyles'

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

describe('dropdown — section header + divider composition', () => {
	// Mailbox / Bootstrap parity. `<menu popover>` can host an
	// `<h6>` to label a group of commands and an `<hr>` to separate
	// command groups. The framework paints both inside the menu's
	// popover-mode chrome (bare list items + the header + the
	// divider all read as one panel).
	function buildMenu(): { menu: HTMLElement; h6: HTMLElement; hr: HTMLElement } {
		const menu = build('menu')
		menu.setAttribute('popover', '')
		menu.id = 'composition-menu'
		const h6 = build('h6', '', 'Edit')
		const hr = build('hr')
		const li = build('li')
		const btn = build('button')
		btn.textContent = 'Cut'
		li.appendChild(btn)
		menu.append(h6, li, hr)
		mount(menu)
		menu.showPopover()
		return { menu, h6, hr }
	}

	it('`<h6>` inside `<menu popover>` paints as a quiet section label', () => {
		const { h6 } = buildMenu()
		// muted text colour + small / uppercase / tracked
		expect(style(h6, 'text-transform')).toBe('uppercase')
		expect(style(h6, 'font-size')).toBe('12px') // --text-xs
	})

	it('`<hr>` inside `<menu popover>` paints as a thin perimeter rule', () => {
		const { hr } = buildMenu()
		// Border-block-start carries the rule; the hr's own content
		// area is zero so the visual is exactly the 1 px border line.
		expect(pixels(hr, 'border-top-width')).toBeGreaterThan(0)
		expect(hr.getBoundingClientRect().height).toBeLessThanOrEqual(2)
	})

	it('`<hr>` divider bleeds inline edges past the panel padding', () => {
		const { hr } = buildMenu()
		// Negative inline margin pulls the divider to the panel's
		// outer content edges (so it renders as a full-width rule
		// instead of being inset by the panel's `padding-inline`).
		expect(pixels(hr, 'margin-left')).toBeLessThan(0)
	})

	it('an `aria-disabled="true"` item is opacity-muted + pointer-events: none', () => {
		const menu = build('menu')
		menu.setAttribute('popover', '')
		menu.id = 'disabled-menu'
		const li = build('li')
		const btn = build('button')
		btn.setAttribute('aria-disabled', 'true')
		btn.textContent = 'Paste'
		li.appendChild(btn)
		menu.appendChild(li)
		mount(menu)
		menu.showPopover()

		expect(Number(style(btn, 'opacity'))).toBeLessThan(1)
		expect(style(btn, 'pointer-events')).toBe('none')
	})
})
