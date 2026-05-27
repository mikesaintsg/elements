// ============================================================================
//  SettingsExamplePage — forms pillar smoke + landmark parity.
//
//  The page mounts ExamplesShell + SettingsExample. Guards anchor on the
//  single useForm-wrapped <form>, the section <article> cards, the
//  <fieldset> groups, and a role="switch" toggle — the forms vocabulary
//  the example demonstrates.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { SettingsExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(SettingsExamplePage)
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

function findButton(host: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.textContent?.trim().toLowerCase() === label.toLowerCase(),
	)
}

describe('SettingsExamplePage — render smoke', () => {
	it('mounts the app bar + a single form with section cards', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('header')).not.toBeNull()
			expect(host.querySelectorAll('main form').length).toBe(1)
			expect(host.querySelectorAll('main article').length).toBeGreaterThanOrEqual(4)
		} finally {
			teardown()
		}
	})
})

describe('SettingsExamplePage — forms vocabulary', () => {
	it('renders fieldsets, a switch, radios, range, and color controls', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('fieldset').length).toBeGreaterThanOrEqual(3)
			expect(host.querySelector('input[role="switch"]')).not.toBeNull()
			expect(host.querySelector('input[type="radio"]')).not.toBeNull()
			expect(host.querySelector('input[type="range"]')).not.toBeNull()
			expect(host.querySelector('input[type="color"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is present and closed by default', () => {
		const { teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Settings example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})

// ── Interactive drives ─────────────────────────────────────────────────────

describe('SettingsExamplePage — useForm interactive drives', () => {
	it('Save button submits the form (useForm `api.submit()` routes through the same handler)', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const form = host.querySelector<HTMLFormElement>('main form')
			if (!form) throw new Error('settings form missing')

			let submitted = 0
			form.addEventListener('submit', (event) => {
				event.preventDefault()
				submitted += 1
			})
			const save = findButton(host, 'Save changes')
			if (!save) throw new Error('"Save changes" button missing')

			save.click()
			await waitFor(80)
			expect(submitted).toBe(1)
		} finally {
			teardown()
		}
	})

	it('role="switch" toggle inputs flip checked state on click', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const sw = host.querySelector<HTMLInputElement>('input[role="switch"]')
			if (!sw) throw new Error('switch input missing')
			const initial = sw.checked
			sw.click()
			await waitFor(50)
			expect(sw.checked).toBe(!initial)
			sw.click()
			await waitFor(50)
			expect(sw.checked).toBe(initial)
		} finally {
			teardown()
		}
	})

	it('theme radio group: picking "dark" updates the form field value', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const dark = host.querySelector<HTMLInputElement>('input[type="radio"][value="dark"]')
			const system = host.querySelector<HTMLInputElement>('input[type="radio"][value="system"]')
			if (!dark || !system) throw new Error('theme radio inputs missing')
			expect(system.checked).toBe(true)
			expect(dark.checked).toBe(false)
			dark.click()
			await waitFor(50)
			expect(dark.checked).toBe(true)
			expect(system.checked).toBe(false)
		} finally {
			teardown()
		}
	})

	it('Reset button clears a typed input back to its default', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const inputs = [
				...host.querySelectorAll<HTMLInputElement>(
					'main form input[type="text"], main form input[type="email"]',
				),
			]
			const target = inputs[0]
			if (!target) throw new Error('expected at least one text/email input in the form')
			const original = target.value
			target.value = 'edited-by-test'
			target.dispatchEvent(new Event('input', { bubbles: true }))
			await waitFor(50)
			expect(target.value).toBe('edited-by-test')

			const reset = findButton(host, 'Reset')
			if (!reset) throw new Error('"Reset" button missing')
			reset.click()
			await waitFor(80)
			expect(target.value).toBe(original)
		} finally {
			teardown()
		}
	})
})
