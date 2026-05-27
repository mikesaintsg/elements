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

// ── Interactive drives ─────────────────────────────────────────────────────

describe('MailExamplePage — message selection', () => {
	function waitFor(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms)
		})
	}

	it('clicking a message row updates the reading-pane subject', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const buttons = [
				...host.querySelectorAll<HTMLButtonElement>(
					'section[aria-label="Messages"] menu li button',
				),
			]
			const subjectHeading = host.querySelector<HTMLElement>(
				'section[aria-label="Conversation"] header h2',
			)
			if (buttons.length < 2 || !subjectHeading) throw new Error('mail list / heading missing')
			const initialSubject = subjectHeading.textContent?.trim() ?? ''
			const other = buttons.find((b) => b.getAttribute('aria-current') !== 'true')
			if (!other) throw new Error('expected an unselected message row')
			other.click()
			await waitFor(80)
			const updated = subjectHeading.textContent?.trim() ?? ''
			expect(updated.length).toBeGreaterThan(0)
			expect(updated).not.toBe(initialSubject)
		} finally {
			teardown()
		}
	})

	it('clicking a different message row flips [aria-current] from the previous row to the new one', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const buttons = [
				...host.querySelectorAll<HTMLButtonElement>(
					'section[aria-label="Messages"] menu li button',
				),
			]
			expect(buttons.length).toBeGreaterThan(1)
			const current = buttons.find((b) => b.getAttribute('aria-current') === 'true')
			const other = buttons.find((b) => b.getAttribute('aria-current') !== 'true')
			if (!current || !other) throw new Error('expected one selected + one unselected message row')

			other.click()
			await waitFor(80)
			expect(other.getAttribute('aria-current')).toBe('true')
			expect(current.getAttribute('aria-current')).not.toBe('true')
		} finally {
			teardown()
		}
	})
})
