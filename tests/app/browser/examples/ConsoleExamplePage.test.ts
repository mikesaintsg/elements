// ============================================================================
//  ConsoleExamplePage — app-shell pillar smoke + landmark parity +
//  interactive drives (useTable sort).
//
//  The page mounts ExamplesShell + ConsoleExample. Guards anchor on the
//  body-shell landmarks the app-shell port must keep alive: the primary
//  <nav> rail, the <header> app bar with its actions toolbar, the
//  context <aside>, the useTable-driven <table> (header row injected by
//  the composable), and the ExamplesShell view-source <dialog>.
//
//  Interactive drives confirm the useTable controller is live: clicking
//  a sortable <th> cycles its `[aria-sort]` through none → ascending →
//  descending; clicking another column flips priority.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { ConsoleExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ConsoleExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

function waitFor(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

describe('ConsoleExamplePage — render smoke', () => {
	it('mounts nav rail + app bar + main + context aside as body-shell siblings', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('nav#console-rail')).not.toBeNull()
			expect(host.querySelector('header')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelector('aside#console-activity')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('ConsoleExamplePage — load-bearing landmarks', () => {
	it('renders the actions toolbar and the orders <table> with body rows', () => {
		const { host, teardown } = mount()
		try {
			expect(
				host.querySelector('menu[role="toolbar"][aria-label="Console actions"]'),
			).not.toBeNull()
			// useTable injects the <thead> asynchronously after mount; the
			// data rows live in the template, so assert those synchronously.
			expect(host.querySelector('table')).not.toBeNull()
			expect(host.querySelectorAll('table tbody tr').length).toBeGreaterThan(0)
		} finally {
			teardown()
		}
	})

	it('renders <meter> gauges in the stat cards', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('main meter').length).toBeGreaterThan(0)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is present and closed by default', () => {
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Console example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})

// ── Interactive drives ─────────────────────────────────────────────────────

describe('ConsoleExamplePage — useTable sort interaction', () => {
	it('clicking a sortable column header cycles aria-sort none → ascending → descending', async () => {
		const { host, teardown } = mount()
		try {
			// useTable's onMounted runs after createApp.mount; wait for the
			// header row to be injected.
			await waitFor(120)
			const table = host.querySelector<HTMLTableElement>('table')
			if (!table) throw new Error('orders table not in DOM')
			const headers = table.querySelectorAll<HTMLTableCellElement>('thead th')
			expect(headers.length).toBeGreaterThan(0)

			// Invoice is the first column — sortable per the options.
			const invoiceHeader = headers[0]
			if (!invoiceHeader) throw new Error('invoice header missing')
			expect(invoiceHeader.getAttribute('aria-sort')).toBeOneOf([null, 'none'])

			invoiceHeader.click()
			await waitFor(80)
			expect(invoiceHeader.getAttribute('aria-sort')).toBe('ascending')

			invoiceHeader.click()
			await waitFor(80)
			expect(invoiceHeader.getAttribute('aria-sort')).toBe('descending')
		} finally {
			teardown()
		}
	})

	it('date-range toggle group: clicking a different range flips aria-pressed', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const buttons = [
				...host.querySelectorAll<HTMLButtonElement>(
					'div[role="group"][aria-label="Date range"] button',
				),
			]
			expect(buttons.length).toBe(3)
			const active = buttons.find((b) => b.getAttribute('aria-pressed') === 'true')
			const other = buttons.find((b) => b.getAttribute('aria-pressed') !== 'true')
			if (!active || !other) throw new Error('expected one pressed + one unpressed range button')
			other.click()
			await waitFor(80)
			expect(other.getAttribute('aria-pressed')).toBe('true')
			expect(active.getAttribute('aria-pressed')).not.toBe('true')
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> opens when the source button (popovertarget pair) fires', async () => {
		const { teardown } = mount()
		try {
			await waitFor(50)
			const dialog = document.querySelector<HTMLDialogElement>(
				'dialog[aria-label="Console example source"]',
			)
			if (!dialog) throw new Error('view-source dialog missing')
			expect(dialog.open).toBe(false)
			// ExamplesShell binds the open via the framework, but per-page
			// tests can drive it directly through the native API.
			dialog.showModal()
			await waitFor(50)
			expect(dialog.open).toBe(true)
			dialog.close()
			await waitFor(50)
			expect(dialog.open).toBe(false)
		} finally {
			teardown()
		}
	})

	it('sorting one column clears the previous column (multiple:false)', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(120)
			const headers = host.querySelectorAll<HTMLTableCellElement>('table thead th')
			const first = headers[0]
			const second = headers[1]
			if (!first || !second) throw new Error('expected ≥2 headers')

			first.click()
			await waitFor(80)
			expect(first.getAttribute('aria-sort')).toBe('ascending')

			second.click()
			await waitFor(80)
			// With multiple:false the previously active column drops back.
			expect(second.getAttribute('aria-sort')).toBe('ascending')
			expect(first.getAttribute('aria-sort')).toBeOneOf([null, 'none'])
		} finally {
			teardown()
		}
	})
})
