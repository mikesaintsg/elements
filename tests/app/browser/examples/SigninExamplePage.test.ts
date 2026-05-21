// ============================================================================
//  SigninExamplePage — focused-form + overlay pillar smoke.
//
//  The page mounts ExamplesShell + SigninExample. Guards anchor on the
//  split-screen brand panel, the useForm sign-in form, the useDialog
//  reset-password modal, and the useToast confirmation surface
//  (<div role="status" popover>).
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
