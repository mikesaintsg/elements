// ============================================================================
//  AuthExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  AuthExample app under it. The guards anchor on the load-bearing semantic
//  landmarks the body-shell-style port has to keep alive:
//
//    1. <main class="auth-shell"> — single page-content host (no sidebar nav,
//       no body-shell header; auth pages render just <main>). Zero-padding
//       tokens applied so the auth-shell grid owns all layout.
//    2. <aside class="auth-brand"> — brand panel inside <main> (not a
//       body-shell <aside>; it's a scoped grid child). Hidden on mobile.
//    3. <form> — sign-in form wired with useForm; has email + password fields.
//    4. <dialog aria-label="Auth example source"> — view-source dialog from
//       ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { AuthExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(AuthExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('AuthExamplePage — render smoke', () => {
	it('mounts + renders <main class="auth-shell"> with the brand panel and form', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main.auth-shell')).not.toBeNull()
			expect(host.querySelector('main aside.auth-brand')).not.toBeNull()
			expect(host.querySelector('main form')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('AuthExamplePage — load-bearing landmarks', () => {
	it('<main class="auth-shell"> is present with zero-padding token overrides', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main.auth-shell')
			expect(main).not.toBeNull()
			const style = main?.getAttribute('style') ?? ''
			expect(style).toContain('--set-main-padding-inline: 0')
			expect(style).toContain('--set-main-padding-block: 0')
			expect(style).toContain('--set-main-gap: 0')
		} finally {
			teardown()
		}
	})

	it('<aside class="auth-brand"> is inside <main> (not a body-shell sibling)', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main.auth-shell')
			const brand = host.querySelector('aside.auth-brand')
			expect(brand).not.toBeNull()
			// Brand panel must be inside <main>, not a body-shell sibling
			expect(main?.contains(brand)).toBe(true)
		} finally {
			teardown()
		}
	})

	it('<form> is inside <main> with email + password fields', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main.auth-shell')
			const form = main?.querySelector('form')
			expect(form).not.toBeNull()
			expect(form?.querySelector('input[type="email"]')).not.toBeNull()
			expect(form?.querySelector('input[type="password"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('brand panel <aside> is inside the auth-shell grid, not a body-shell aside', () => {
		const { host, teardown } = mount()
		try {
			// The brand aside should be a descendant of <main>, meaning it's a scoped
			// grid child rather than a sibling of <main> at body-shell position.
			const main = host.querySelector('main.auth-shell')
			const brandAside = main?.querySelector('aside.auth-brand')
			expect(brandAside).not.toBeNull()
			// Confirm no body-shell aside exists outside main
			const bodyAside = document.querySelector('body > aside')
			expect(bodyAside).toBeNull()
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is in the DOM (closed by default)', () => {
		const { host: _host, teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Auth example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})

	it('renders ExamplesShell toolbar (menu[role="toolbar"]) in the document', () => {
		const { host: _host, teardown } = mount()
		try {
			// ExamplesShell toolbar is a sibling of the example, not a descendant;
			// query the full document.
			const toolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(toolbars.length).toBeGreaterThanOrEqual(1)
		} finally {
			teardown()
		}
	})

	it('has h1 "Welcome back" as the form heading', () => {
		const { host, teardown } = mount()
		try {
			const h1 = host.querySelector('main h1')
			expect(h1).not.toBeNull()
			expect(h1?.textContent?.trim()).toBe('Welcome back')
		} finally {
			teardown()
		}
	})
})
