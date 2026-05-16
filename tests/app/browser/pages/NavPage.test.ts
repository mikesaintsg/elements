// ============================================================================
//  NavPage — per-page BESPOKE parity (Phase-2 §7, Components).
//
//  Reason to exist: <nav> is one element painted into multiple contexts
//  disambiguated by aria-label / role / inner-content shape — NEVER a
//  class root. The body-shell rail is the SURROUNDING showcase chrome
//  (not rendered by this page's own mount), so the guard covers the
//  four in-mount shapes:
//    2. breadcrumb  (nav[aria-label="Breadcrumb"] > ol, current leaf)
//    3. pagination  (nav[aria-label="Pagination"] > ol, current tile)
//    4. tablist     (nav[role="tablist"] + tab/tabpanel, one selected)
//    5. .fill / .justified equal-width row modifiers on the inner <ol>
//  The variant cascade here is a TOKEN override (inline --set-nav-*),
//  not a class modifier, so it is intentionally NOT asserted as a
//  `nav.{variant}` class. Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { NavPage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(NavPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('NavPage — render smoke', () => {
	it('mounts + renders the "nav" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#nav-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Nav')
		} finally {
			teardown()
		}
	})
})

describe('NavPage — breadcrumb shape (§7)', () => {
	it('renders nav[aria-label="Breadcrumb"] > ol with a current leaf', () => {
		const { host, teardown } = mount()
		try {
			const bc = host.querySelector('nav[aria-label="Breadcrumb"]')
			expect(bc).not.toBeNull()
			expect(bc?.querySelector('ol')).not.toBeNull()
			expect(bc?.querySelector('li[aria-current="page"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('NavPage — pagination shape (§7)', () => {
	it('renders nav[aria-label="Pagination"] > ol with a current tile', () => {
		const { host, teardown } = mount()
		try {
			const pg = host.querySelector('nav[aria-label="Pagination"]')
			expect(pg).not.toBeNull()
			expect(pg?.querySelector('ol')).not.toBeNull()
			// page=2 is seeded — the active tile carries aria-current="page".
			expect(
				host.querySelector('nav[aria-label="Pagination"] [aria-current="page"]'),
			).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('NavPage — tablist shape (§7)', () => {
	it('renders nav[role="tablist"] with tab/tabpanel + exactly one selected', () => {
		const { host, teardown } = mount()
		try {
			const tl = host.querySelector('nav[role="tablist"]')
			expect(tl).not.toBeNull()
			expect(tl?.querySelector('button[role="tab"]')).not.toBeNull()
			expect(host.querySelector('[role="tabpanel"]')).not.toBeNull()
			const selected = host.querySelectorAll('button[role="tab"][aria-selected="true"]')
			expect(selected.length).toBe(1)
			// The non-selected panels are [hidden]; exactly one is visible.
			const panels = [...host.querySelectorAll('[role="tabpanel"]')]
			const visible = panels.filter((p) => !(p as HTMLElement).hidden)
			expect(visible.length).toBe(1)
		} finally {
			teardown()
		}
	})
})

describe('NavPage — .fill / .justified row modifiers (§7)', () => {
	for (const cls of ['fill', 'justified']) {
		// On failure: no inner `ol.${cls}` — the equal-width row
		// modifiers (Mailbox .nav-fill / .nav-justified parity) must be
		// demonstrated.
		it(`renders nav ol.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`nav ol.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
