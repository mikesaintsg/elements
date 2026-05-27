// ============================================================================
//  SigninExamplePage — focused-form + overlay pillar smoke + interactive drives.
//
//  The page mounts ExamplesShell + SigninExample. Guards anchor on the
//  split-screen brand panel, the useForm sign-in form, the useDialog
//  reset-password modal, and the useToast confirmation surface
//  (<div role="status" popover>).
//
//  Two layers:
//
//    1. Render smoke — landmarks + surfaces are wired into the DOM.
//    2. Interactive drives — click "Forgot password?", verify the reset
//       dialog opens; click Cancel, verify it closes; submit the reset
//       form, verify the dialog closes AND the toast surfaces (the
//       end-to-end "user requested a reset link" loop).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { SigninExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(SigninExamplePage)
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

describe('SigninExamplePage — render smoke', () => {
	it('mounts the brand panel + the sign-in form', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main article.primary')).not.toBeNull()
			expect(host.querySelector('main form')).not.toBeNull()
			expect(host.querySelector('input[type="email"]')).not.toBeNull()
			expect(host.querySelector('input[type="password"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('SigninExamplePage — overlay surfaces', () => {
	it('renders the reset-password <dialog> (closed) and the toast surface', () => {
		const { host, teardown } = mount()
		try {
			const reset = host.querySelector('dialog[aria-labelledby="reset-title"]')
			expect(reset).not.toBeNull()
			expect((reset as HTMLDialogElement | null)?.open).toBe(false)
			expect(host.querySelector('[role="status"][popover]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('OAuth buttons are type="button" so they never submit the form', () => {
		const { host, teardown } = mount()
		try {
			const oauth = [...host.querySelectorAll('button.secondary')]
			expect(oauth.length).toBeGreaterThanOrEqual(2)
			expect(oauth.every((b) => b.getAttribute('type') === 'button')).toBe(true)
		} finally {
			teardown()
		}
	})
})

// ── Interactive drives ─────────────────────────────────────────────────────
//
// The pages-test suite already proves the static markup is wired; these
// tests drive the actual user paths the example sells (forgot-password
// dialog, reset confirmation toast). Each test mounts a fresh app,
// fires DOM events / API calls the example wires to, asserts the
// observable side-effects, and tears down — leaks would poison other
// pages mounted later in the same chromium project.

describe('SigninExamplePage — forgot-password dialog interaction', () => {
	it('"Forgot password?" link opens the reset dialog', async () => {
		const { host, teardown } = mount()
		try {
			const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-labelledby="reset-title"]')
			if (!dialog) throw new Error('reset dialog not in DOM')
			// useDialog wires its listeners inside the composable's
			// onMounted hook, which runs AFTER createApp.mount() returns.
			// Wait for the Vue scheduler to flush before driving any
			// click — otherwise the link's `@click.prevent="reset.show()"`
			// fires before the composable has captured the dialog ref.
			await waitFor(50)
			expect(dialog.open).toBe(false)

			const link = [...host.querySelectorAll<HTMLAnchorElement>('a[href="#"]')].find((a) =>
				/forgot password/i.test(a.textContent ?? ''),
			)
			if (!link) throw new Error('"Forgot password?" link not in DOM')
			link.click()
			await waitFor(150)

			expect(dialog.open).toBe(true)
		} finally {
			teardown()
		}
	})

	it('Cancel button in the reset dialog closes it', async () => {
		const { host, teardown } = mount()
		try {
			const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-labelledby="reset-title"]')
			if (!dialog) throw new Error('reset dialog not in DOM')
			await waitFor(50)
			const link = [...host.querySelectorAll<HTMLAnchorElement>('a[href="#"]')].find((a) =>
				/forgot password/i.test(a.textContent ?? ''),
			)
			link?.click()
			await waitFor(150)
			expect(dialog.open).toBe(true)

			const cancel = [...dialog.querySelectorAll<HTMLButtonElement>('button.subtle')].find(
				(b) => b.textContent?.trim() === 'Cancel',
			)
			if (!cancel) throw new Error('Cancel button not in dialog')
			cancel.click()
			await waitFor(150)

			expect(dialog.open).toBe(false)
		} finally {
			teardown()
		}
	})

	it('Submitting the reset form closes the dialog AND surfaces the confirmation toast', async () => {
		const { host, teardown } = mount()
		try {
			const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-labelledby="reset-title"]')
			const toast = host.querySelector<HTMLElement>('[role="status"][popover]')
			if (!dialog || !toast) throw new Error('reset dialog or toast not in DOM')
			await waitFor(50)

			// Open the dialog via the link.
			const link = [...host.querySelectorAll<HTMLAnchorElement>('a[href="#"]')].find((a) =>
				/forgot password/i.test(a.textContent ?? ''),
			)
			link?.click()
			await waitFor(150)
			expect(dialog.open).toBe(true)

			// Submit the reset form (`@submit.prevent="sendReset"` calls
			// `reset.hide()` + `notify(…)` which surfaces the toast).
			const form = dialog.querySelector<HTMLFormElement>('form')
			if (!form) throw new Error('reset form not in dialog')
			form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
			await waitFor(150)

			expect(dialog.open).toBe(false)
			expect(toast.matches(':popover-open')).toBe(true)
			expect(toast.textContent ?? '').toMatch(/reset link/i)

			// Tidy up the popover so subsequent suite-level mounts don't
			// inherit an open top-layer surface.
			if (typeof toast.hidePopover === 'function') toast.hidePopover()
			await waitFor(50)
		} finally {
			teardown()
		}
	})
})
