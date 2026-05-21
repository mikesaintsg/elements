// ============================================================================
//  ConsoleExamplePage — app-shell pillar smoke + landmark parity.
//
//  The page mounts ExamplesShell + ConsoleExample. Guards anchor on the
//  body-shell landmarks the app-shell port must keep alive: the primary
//  <nav> rail, the <header> app bar with its actions toolbar, the
//  context <aside>, the useTable-driven <table> (header row injected by
//  the composable), and the ExamplesShell view-source <dialog>.
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
