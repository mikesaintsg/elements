// ============================================================================
//  DashboardExample — framework-usage assertions.
//
//  Separate from DashboardExamplePage.test.ts so the assertions stay
//  focused on the framework idioms the example exercises (rather than
//  the ExamplesShell scaffolding). The page-level test owns landmarks;
//  this file owns counts + data wiring.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import DashboardExample from '../../../../app/browser/examples/DashboardExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DashboardExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('DashboardExample — framework idioms', () => {
	it('sidebar uses semantic <aside> with the expected id (useAside host)', () => {
		const { host, teardown } = mount()
		try {
			const sidebar = host.querySelector('aside#dashboard-sidebar')
			expect(sidebar).not.toBeNull()
			// The popover binding is conditional on viewport — desktop = no
			// attribute, mobile = "auto". In the jsdom/headless browser the
			// matchMedia listener is fired on mount; the assertion stays
			// agnostic by checking the attribute is *either* absent or "auto".
			const popover = sidebar?.getAttribute('popover')
			expect(popover === null || popover === 'auto').toBe(true)
		} finally {
			teardown()
		}
	})

	it('topbar action rail uses <menu role="toolbar">', () => {
		const { host, teardown } = mount()
		try {
			const toolbar = host.querySelector('menu[role="toolbar"][aria-label="Dashboard actions"]')
			expect(toolbar).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders one <article> per stat (4 stats)', () => {
		const { host, teardown } = mount()
		try {
			const cards = host.querySelectorAll('section.dashboard-stats > article')
			expect(cards.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('renders one timeline <li> per activity row (5 rows)', () => {
		const { host, teardown } = mount()
		try {
			const rows = host.querySelectorAll('ol.dashboard-timeline > li')
			expect(rows.length).toBe(5)
		} finally {
			teardown()
		}
	})

	it('status tags use the framework variant modifiers (.success / .warning / .danger)', () => {
		const { host, teardown } = mount()
		try {
			// The data has 2 paid, 2 pending, 1 failed.
			expect(host.querySelectorAll('ol.dashboard-timeline > li[data-status="paid"]').length).toBe(2)
			expect(
				host.querySelectorAll('ol.dashboard-timeline > li[data-status="pending"]').length,
			).toBe(2)
			expect(host.querySelectorAll('ol.dashboard-timeline > li[data-status="failed"]').length).toBe(
				1,
			)
			expect(host.querySelector('ol.dashboard-timeline .tag.success')).not.toBeNull()
			expect(host.querySelector('ol.dashboard-timeline .tag.warning')).not.toBeNull()
			expect(host.querySelector('ol.dashboard-timeline .tag.danger')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('range picker is a <menu role="toolbar"> with three .subtle buttons', () => {
		const { host, teardown } = mount()
		try {
			const range = host.querySelector('menu[role="toolbar"][aria-label="Date range"]')
			expect(range).not.toBeNull()
			expect(range?.querySelectorAll('button.subtle').length).toBe(3)
			// The default selection is 30d (per `range = ref('30d')`).
			const pressed = range?.querySelector('button[aria-pressed="true"]')
			expect(pressed?.textContent?.trim()).toBe('30d')
		} finally {
			teardown()
		}
	})
})
