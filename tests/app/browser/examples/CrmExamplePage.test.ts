// ============================================================================
//  CrmExamplePage — agent-workspace pillar smoke + landmark parity +
//  interactive drives (<details> disclosures + useForm composer).
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

function waitFor(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
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

// ── Interactive drives ─────────────────────────────────────────────────────

describe('CrmExamplePage — chat-turn disclosures', () => {
	it('clicking a closed <summary> opens its <details>', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const details = [...host.querySelectorAll<HTMLDetailsElement>('main details')]
			expect(details.length).toBeGreaterThan(0)
			// Find a turn that starts closed so we can drive open → flip.
			const closed = details.find((d) => !d.open)
			if (!closed) throw new Error('expected at least one closed chat turn')
			const summary = closed.querySelector<HTMLElement>('summary')
			if (!summary) throw new Error('closed <details> missing <summary>')
			summary.click()
			await waitFor(80)
			expect(closed.open).toBe(true)
		} finally {
			teardown()
		}
	})
})

describe('CrmExamplePage — composer form', () => {
	it('submitting the composer clears the draft (useForm submit handler)', async () => {
		const { host, teardown } = mount()
		try {
			await waitFor(50)
			const textarea = host.querySelector<HTMLTextAreaElement>('main form textarea')
			const form = host.querySelector<HTMLFormElement>('main form')
			if (!textarea || !form) throw new Error('composer form missing')

			// `v-model` binds via input; type some draft text.
			textarea.value = 'sketch a follow-up'
			textarea.dispatchEvent(new Event('input', { bubbles: true }))
			await waitFor(50)
			expect(textarea.value).toBe('sketch a follow-up')

			// Submit — the useForm `on.submit` handler clears `draft`,
			// which the v-model propagates back to the textarea value.
			form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
			await waitFor(80)
			expect(textarea.value).toBe('')
		} finally {
			teardown()
		}
	})
})
