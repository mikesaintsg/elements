// ============================================================================
//  DialogElementPage — per-page BESPOKE parity (Phase-2 §7,
//  Elements-Interactive).
//
//  Reason to exist: the bare `<dialog>` baseline demonstrates the
//  container cascade. Dialogs are heavyweight, so the page shows a
//  REPRESENTATIVE variant set (not all 7 modal dialogs) — the guard is
//  therefore: `<dialog>` is rendered, the cascade is exercised
//  (≥1 variant + size + the `.filled` style), and no junk modifier.
//  Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { DialogElementPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DialogElementPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('DialogElementPage — render smoke', () => {
	it('mounts + renders the "dialog-element" intro + a <dialog>', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#dialog-element-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Dialog element')
			expect(host.querySelector('dialog')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('DialogElementPage — container cascade exercised (§7)', () => {
	it('demonstrates ≥1 variant + size + .filled on a <dialog>, no junk modifier', () => {
		const { host, teardown } = mount()
		try {
			const dialogs = [...host.querySelectorAll('dialog')]
			expect(dialogs.length).toBeGreaterThan(0)
			const variantsSeen = VARIANTS.filter((v) => dialogs.some((d) => d.classList.contains(v)))
			expect(variantsSeen.length).toBeGreaterThan(0)
			expect(host.querySelector('dialog.small')).not.toBeNull()
			expect(host.querySelector('dialog.large')).not.toBeNull()
			expect(host.querySelector('dialog.filled')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
