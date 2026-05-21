// ============================================================================
//  CrmExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  CrmExample app under it. The guards anchor on the four load-bearing
//  semantic landmarks the body-shell-style port has to keep alive:
//
//    1. <nav id="crm-context"> — the context rail drawer at body-shell
//       position. On desktop: in-flow. On mobile: popover drawer (left).
//    2. <main> — the chat pane with thread + reply composer.
//    3. <aside id="crm-docs"> — the documents panel at body-shell position.
//       On desktop: in-flow. On mobile: popover drawer (right).
//    4. <dialog aria-label="CRM example source"> — view-source dialog from
//       ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { CrmExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(CrmExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('CrmExamplePage — render smoke', () => {
	it('mounts + renders the context nav, main, and docs aside as body-shell siblings', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('nav#crm-context')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelector('aside#crm-docs')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('CrmExamplePage — load-bearing landmarks', () => {
	it('context nav is present with the expected id and aria-label', () => {
		const { host, teardown } = mount()
		try {
			const nav = host.querySelector('nav#crm-context')
			expect(nav).not.toBeNull()
			expect(nav?.getAttribute('aria-label')).toBe('Context')
		} finally {
			teardown()
		}
	})

	it('docs aside is present with the expected id and aria-label', () => {
		const { host, teardown } = mount()
		try {
			const aside = host.querySelector('aside#crm-docs')
			expect(aside).not.toBeNull()
			expect(aside?.getAttribute('aria-label')).toBe('Documents')
		} finally {
			teardown()
		}
	})

	it('main contains the chat thread and reply composer', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main')
			expect(main).not.toBeNull()
			expect(main?.querySelector('ol.crm-turns')).not.toBeNull()
			expect(main?.querySelector('footer.crm-composer')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders at least two <menu role="toolbar"> regions (chat actions + ExamplesShell toolbar)', () => {
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
			const dialog = document.querySelector('dialog[aria-label="CRM example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
