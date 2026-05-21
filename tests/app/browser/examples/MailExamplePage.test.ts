// ============================================================================
//  MailExamplePage — three-pane app pillar smoke + landmark parity.
//
//  Mounts ExamplesShell + MailExample. Guards the body-shell folder <nav>
//  rail, the <header> app bar, the two panes inside <main> (the message
//  list + the reading-pane <article>), and the ExamplesShell view-source
//  <dialog>.
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
	it('mounts folder rail + app bar + main panes', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('nav#mail-rail')).not.toBeNull()
			expect(host.querySelector('header')).not.toBeNull()
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelector('main section[aria-label="Messages"]')).not.toBeNull()
			expect(host.querySelector('main section[aria-label="Conversation"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('MailExamplePage — load-bearing landmarks', () => {
	it('renders the message list with row buttons and a reading-pane body', () => {
		const { host, teardown } = mount()
		try {
			expect(
				host.querySelectorAll('section[aria-label="Messages"] menu li').length,
			).toBeGreaterThan(0)
			expect(host.querySelectorAll('section[aria-label="Conversation"] p').length).toBeGreaterThan(
				0,
			)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is present and closed by default', () => {
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Mail example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
