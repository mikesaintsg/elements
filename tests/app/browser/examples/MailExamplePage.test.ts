// ============================================================================
//  MailExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  MailExample app under it. The guards anchor on the four load-bearing
//  semantic landmarks the body-shell-style port has to keep alive:
//
//    1. <nav id="mail-folders"> — the folders rail drawer host at body-shell
//       position. On desktop: in-flow. On mobile: popover drawer.
//    2. <main> — contains the inner two-pane grid (thread list + reading pane).
//    3. <menu role="toolbar"> — list actions, reading-pane actions, and the
//       ExamplesShell toolbar. At least two on the page.
//    4. <dialog aria-label="Mail example source"> — view-source dialog from
//       ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { MailExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MailExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('MailExamplePage — render smoke', () => {
	it('mounts + renders the folders nav + main as body-shell siblings', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('nav#mail-folders')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('MailExamplePage — load-bearing landmarks', () => {
	it('folders nav is present with the expected id and aria-label', () => {
		const { host, teardown } = mount()
		try {
			const nav = host.querySelector('nav#mail-folders')
			expect(nav).not.toBeNull()
			expect(nav?.getAttribute('aria-label')).toBe('Folders')
		} finally {
			teardown()
		}
	})

	it('main contains both inner panes (thread list + reading pane)', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			expect(main).not.toBeNull()
			expect(main?.querySelector('section[aria-label="Threads"]')).not.toBeNull()
			expect(main?.querySelector('section[aria-label="Message"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders at least two <menu role="toolbar"> regions (list actions + reading actions)', () => {
		const { host: _host, teardown } = mount()
		try {
			// Teleported elements (ExamplesShell's toolbar) land on body.
			const docToolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(docToolbars.length).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is in the DOM (closed by default)', () => {
		const { host: _host, teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Mail example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
