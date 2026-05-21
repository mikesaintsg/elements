// ============================================================================
//  AuthExample — framework-usage assertions.
//
//  Separate from AuthExamplePage.test.ts so the assertions stay focused on
//  the framework idioms the example exercises (rather than the ExamplesShell
//  scaffolding). The page-level test owns landmarks; this file owns counts +
//  data wiring.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import AuthExample from '../../../../app/browser/examples/AuthExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(AuthExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('AuthExample — framework idioms', () => {
	it('renders <main class="auth-shell"> with token override inline styles', () => {
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

	it('renders the brand panel <aside> inside <main>', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main.auth-shell')
			const brand = main?.querySelector('aside.auth-brand')
			expect(brand).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('brand panel contains a blockquote with attribution', () => {
		const { host, teardown } = mount()
		try {
			const brand = host.querySelector('aside.auth-brand')
			expect(brand?.querySelector('blockquote')).not.toBeNull()
			// Author avatar (migrated to framework .avatar)
			expect(brand?.querySelector('.avatar')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('brand panel contains 3 trust badges', () => {
		const { host, teardown } = mount()
		try {
			const badges = host.querySelector('.auth-trust-badges')
			expect(badges).not.toBeNull()
			const items = badges?.querySelectorAll('li')
			expect(items?.length).toBe(3)
		} finally {
			teardown()
		}
	})

	it('form panel has header with mobile brand + "Create account" link', () => {
		const { host, teardown } = mount()
		try {
			const formHeader = host.querySelector('.auth-form-header')
			expect(formHeader).not.toBeNull()
			expect(formHeader?.querySelector('a')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders 2 OAuth buttons inside .auth-oauth-buttons', () => {
		const { host, teardown } = mount()
		try {
			const oauthList = host.querySelector('.auth-oauth-buttons')
			expect(oauthList).not.toBeNull()
			const buttons = oauthList?.querySelectorAll('button')
			expect(buttons?.length).toBe(2)
			// Both buttons use the secondary class (framework modifier)
			buttons?.forEach((btn) => {
				expect(btn.classList.contains('secondary')).toBe(true)
			})
		} finally {
			teardown()
		}
	})

	it('renders the labelled "or" divider (.auth-divider)', () => {
		const { host, teardown } = mount()
		try {
			const divider = host.querySelector('.auth-divider')
			expect(divider).not.toBeNull()
			expect(divider?.textContent?.trim()).toBe('or')
		} finally {
			teardown()
		}
	})

	it('<form> has email + password inputs (required)', () => {
		const { host, teardown } = mount()
		try {
			const form = host.querySelector('form')
			expect(form).not.toBeNull()
			const email = form?.querySelector('input[type="email"][name="email"][required]')
			const password = form?.querySelector('input[type="password"][name="password"][required]')
			expect(email).not.toBeNull()
			expect(password).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('<form> has a remember-me checkbox', () => {
		const { host, teardown } = mount()
		try {
			const form = host.querySelector('form')
			const checkbox = form?.querySelector('input[type="checkbox"][name="remember"]')
			expect(checkbox).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('submit button has class "primary w-full"', () => {
		const { host, teardown } = mount()
		try {
			const submit = host.querySelector('button[type="submit"]')
			expect(submit).not.toBeNull()
			expect(submit?.classList.contains('primary')).toBe(true)
			expect(submit?.classList.contains('w-full')).toBe(true)
		} finally {
			teardown()
		}
	})

	it('terms text is present below the submit button', () => {
		const { host, teardown } = mount()
		try {
			const terms = host.querySelector('.auth-terms')
			expect(terms).not.toBeNull()
			expect(terms?.textContent).toContain('Terms')
			expect(terms?.textContent).toContain('Privacy notice')
		} finally {
			teardown()
		}
	})

	it('form footer has 3 links (Trust center, Help, language)', () => {
		const { host, teardown } = mount()
		try {
			const footer = host.querySelector('.auth-form-footer')
			expect(footer).not.toBeNull()
			const links = footer?.querySelectorAll('a')
			expect(links?.length).toBe(3)
		} finally {
			teardown()
		}
	})
})
