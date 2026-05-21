// ============================================================================
//  MailExample — framework-usage assertions.
//
//  Separate from MailExamplePage.test.ts so the assertions stay focused on
//  the framework idioms the example exercises (rather than the ExamplesShell
//  scaffolding). The page-level test owns landmarks; this file owns counts
//  + data wiring + the inner two-pane grid structure.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import MailExample from '../../../../app/browser/examples/MailExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MailExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('MailExample — framework idioms', () => {
	it('folders rail uses semantic <nav> with the expected id', () => {
		const { host, teardown } = mount()
		try {
			const nav = host.querySelector('nav#mail-folders')
			expect(nav).not.toBeNull()
			// popover binding is conditional on viewport; assert absent or "auto".
			const popover = nav?.getAttribute('popover')
			expect(popover === null || popover === 'auto').toBe(true)
		} finally {
			teardown()
		}
	})

	it('renders 7 folder links in the folders rail', () => {
		const { host, teardown } = mount()
		try {
			const folderLinks = host.querySelectorAll('nav#mail-folders > menu:first-of-type > li > a')
			expect(folderLinks.length).toBe(7)
		} finally {
			teardown()
		}
	})

	it('renders 3 label entries with colored dots in the folders rail', () => {
		const { host, teardown } = mount()
		try {
			// The labels <h6> + <menu> come after the folder <menu>; look for dots.
			const dots = host.querySelectorAll('nav#mail-folders .dot')
			expect(dots.length).toBe(3)
			expect(host.querySelector('nav#mail-folders .dot.danger')).not.toBeNull()
			expect(host.querySelector('nav#mail-folders .dot.information')).not.toBeNull()
			expect(host.querySelector('nav#mail-folders .dot.warning')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders 7 message rows in the thread list', () => {
		const { host, teardown } = mount()
		try {
			const rows = host.querySelectorAll('ul.mail-rows > li')
			expect(rows.length).toBe(7)
		} finally {
			teardown()
		}
	})

	it('the first message is selected by default (aria-pressed="true")', () => {
		const { host, teardown } = mount()
		try {
			const pressed = host.querySelector('ul.mail-rows button[aria-pressed="true"]')
			expect(pressed).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('reading pane action toolbar has 4 buttons (Reply, Reply all, Forward, Archive)', () => {
		const { host, teardown } = mount()
		try {
			const toolbar = host.querySelector('menu[role="toolbar"][aria-label="Message actions"]')
			expect(toolbar).not.toBeNull()
			expect(toolbar?.querySelectorAll('button').length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('thread list toolbar is a <menu role="toolbar">', () => {
		const { host, teardown } = mount()
		try {
			const toolbar = host.querySelector('menu[role="toolbar"][aria-label="List actions"]')
			expect(toolbar).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('search input uses <form role="search"> with <input type="search">', () => {
		const { host, teardown } = mount()
		try {
			const form = host.querySelector('form[role="search"]')
			expect(form).not.toBeNull()
			const input = form?.querySelector('input[type="search"]')
			expect(input).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('folder count badges use the framework .badge primitive', () => {
		const { host, teardown } = mount()
		try {
			// Inbox (24) and Starred (7) and Drafts (3) and Spam (1) have counts > 0.
			const badges = host.querySelectorAll('nav#mail-folders .badge')
			expect(badges.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('account footer is present in the folders nav', () => {
		const { host, teardown } = mount()
		try {
			const footer = host.querySelector('nav#mail-folders > footer')
			expect(footer).not.toBeNull()
			// The account mark initials
			expect(footer?.querySelector('.mail-avatar-account')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('tagged messages render a .tag chip with the correct variant', () => {
		const { host, teardown } = mount()
		try {
			// The thread list has messages tagged urgent (danger), work (information), personal (warning).
			expect(host.querySelector('ul.mail-rows .tag.danger')).not.toBeNull()
			expect(host.querySelector('ul.mail-rows .tag.information')).not.toBeNull()
			expect(host.querySelector('ul.mail-rows .tag.warning')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
