// ============================================================================
//  MenuPage — per-page BESPOKE parity (Phase-2 §7, Components).
//
//  Reason to exist: <menu> is the HTML LS toolbar element painted into
//  several contexts by ancestry / attribute. The nav-rail + aside-TOC
//  shapes are the SURROUNDING showcase chrome (documented as markup,
//  not rendered by this page's own mount), so the guard covers the
//  three in-mount shapes:
//    1. bare toolbar         (<menu> with real <li><button> children)
//    2. card action row      (article menu — flex-end justification)
//    5. dropdown             (menu[popover]) + h6/hr/[aria-disabled]
//                            grouping + .start/.end/.top placement +
//                            the wrapped div[popover] menu + the
//                            button.dropdown caret trigger
//  Asserted against the MOUNTED DOM (popover elements are in the DOM
//  even while hidden).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { MenuPage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MenuPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('MenuPage — render smoke', () => {
	it('mounts + renders the "menu" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#menu-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Menu')
		} finally {
			teardown()
		}
	})
})

describe('MenuPage — bare toolbar shape (§7)', () => {
	it('renders a <menu> with real interactive <li><button> children', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('menu')).not.toBeNull()
			expect(host.querySelector('menu > li > button[type="button"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('MenuPage — card action row shape (§7)', () => {
	it('renders an <article> with a nested <menu> action row', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('article menu')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('MenuPage — dropdown shape (§7)', () => {
	it('renders menu[popover] triggered by a button.dropdown caret', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('menu[popover]')).not.toBeNull()
			expect(host.querySelector('button.dropdown[popovertarget]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('demonstrates the grouped dropdown (h6 + hr + [aria-disabled])', () => {
		const { host, teardown } = mount()
		try {
			const full = host.querySelector('#demo-dropdown-full')
			expect(full).not.toBeNull()
			expect(full?.querySelector('h6')).not.toBeNull()
			expect(full?.querySelector('hr')).not.toBeNull()
			expect(full?.querySelector('button[aria-disabled="true"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	for (const p of ['start', 'end', 'top']) {
		// On failure: no `menu[popover].${p}` — the dropdown placement
		// modifiers (shared with the popover surface) must be shown.
		it(`renders menu[popover].${p}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`menu[popover].${p}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	it('demonstrates the wrapped dropdown (div[popover] > … > menu)', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('div[popover] menu')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
