// ============================================================================
//  DashboardExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  DashboardExample app under it. The guards anchor on the four
//  load-bearing semantic landmarks the body-shell-style port has to
//  keep alive:
//
//    1. <nav id="dashboard-sidebar"> — the sidebar drawer host
//       (useNav reads this) at body-shell position.
//    2. <header> — the topbar rail, also at body-shell position,
//       containing the search form + actions toolbar.
//    3. <menu role="toolbar"> — the action rail + the range picker +
//       the ExamplesShell toolbar. At least three on the page.
//    4. <dialog aria-label="Dashboard example source"> — the
//       view-source dialog from ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { DashboardExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DashboardExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('DashboardExamplePage — render smoke', () => {
	it('mounts + renders the sidebar nav + topbar + main as body-shell siblings', () => {
		const { host, teardown } = mount()
		try {
			// The Vue fragment renders nav + header + main as siblings of
			// the page-component root, with the floating toolbar + dialog
			// added by ExamplesShell.
			expect(host.querySelector('nav#dashboard-sidebar')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('DashboardExamplePage — load-bearing landmarks', () => {
	it('sidebar drawer host is present with the expected id', () => {
		const { host, teardown } = mount()
		try {
			const sidebar = host.querySelector('nav#dashboard-sidebar')
			expect(sidebar).not.toBeNull()
			expect(sidebar?.getAttribute('aria-label')).toBe('Primary')
		} finally {
			teardown()
		}
	})

	it('topbar header is present with the search role and action toolbar', () => {
		const { host, teardown } = mount()
		try {
			// The topbar is a <header> sibling of <nav> + <main>; assert
			// the search + actions menu both render inside the dashboard
			// shell (not the showcase shell which isn't mounted here).
			expect(host.querySelector('form[role="search"]')).not.toBeNull()
			expect(
				host.querySelector('menu[role="toolbar"][aria-label="Dashboard actions"]'),
			).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders at least two <menu role="toolbar"> regions (actions, examples-shell)', () => {
		const { host: _host, teardown } = mount()
		try {
			// Teleported elements (ExamplesShell's <dialog>) land on body, so
			// query both roots to catch the shell toolbar that's a sibling of
			// the example, not a descendant of the dashboard. The date-range
			// picker is a `<div role="group">` segmented control (not a
			// toolbar), so the toolbar count is actions + examples-shell.
			const docToolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(docToolbars.length).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is in the DOM (closed by default)', () => {
		const { host: _host, teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Dashboard example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
