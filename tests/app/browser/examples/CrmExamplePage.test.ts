// ============================================================================
//  CrmExamplePage — agent-workspace pillar smoke + landmark parity.
//
//  Mounts ExamplesShell + CrmExample. Guards the dual rails (context <nav>
//  + documents <aside>), the chat thread of <details> turns inside <main>,
//  the composer <form>, and the ExamplesShell view-source <dialog>.
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
	it('mounts context rail + app bar + main + documents aside', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('nav#crm-rail')).not.toBeNull()
			expect(host.querySelector('header')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelector('aside#crm-docs')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('CrmExamplePage — load-bearing landmarks', () => {
	it('renders collapsible chat turns and a composer textarea', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('main details').length).toBeGreaterThan(0)
			expect(host.querySelector('main form textarea')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is present and closed by default', () => {
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="CRM example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
