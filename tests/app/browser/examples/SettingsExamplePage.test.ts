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
