// ============================================================================
//  DashboardExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  DashboardExample app under it. The guards anchor on the four
//  load-bearing semantic landmarks the port has to keep alive:
//
//    1. <aside id="dashboard-sidebar"> — the sidebar drawer host
//       (useAside reads this).
//    2. <header class="dashboard-topbar"> — the topbar rail.
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
	it('mounts + renders the example shell + the dashboard app', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('.examples-stage')).not.toBeNull()
			expect(host.querySelector('.dashboard-shell')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('DashboardExamplePage — load-bearing landmarks', () => {
	it('sidebar drawer host is present with the expected id', () => {
		const { host, teardown } = mount()
		try {
			const sidebar = host.querySelector('aside#dashboard-sidebar')
			expect(sidebar).not.toBeNull()
			expect(sidebar?.getAttribute('aria-label')).toBe('Primary navigation')
		} finally {
			teardown()
		}
	})

	it('topbar header is present with the search role and action toolbar', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('header.dashboard-topbar')).not.toBeNull()
			expect(host.querySelector('form[role="search"]')).not.toBeNull()
			expect(host.querySelector('menu[role="toolbar"][aria-label="Dashboard actions"]'))
				.not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders at least three <menu role="toolbar"> regions (actions, range, examples-shell)', () => {
		const { host: _host, teardown } = mount()
		try {
			// Teleported elements (ExamplesShell's <dialog>) land on body, so
			// query both roots to catch the shell toolbar that's a sibling of
			// the example, not a descendant of the dashboard.
			const docToolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(docToolbars.length).toBeGreaterThanOrEqual(3)
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
