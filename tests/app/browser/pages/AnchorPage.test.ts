// ============================================================================
//  AnchorPage — per-page BESPOKE parity (Phase-2 §7, Elements-Interactive).
//
//  Reason to exist: `<a>` carries the link-as-button cascade — every
//  `modifiers.variant` + the size/style + the disabled/active states
//  (no `.loading`: that is button-only). Asserted against the MOUNTED
//  DOM (modifiers are `:class` bindings).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { AnchorPage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(AnchorPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('AnchorPage — render smoke', () => {
	it('mounts + renders the "anchor" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#anchor-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Anchor')
		} finally {
			teardown()
		}
	})
})

describe('AnchorPage — link-as-button cascade (§7)', () => {
	for (const v of VARIANTS) {
		// On failure: `<a class="${v}">` (link-as-button) not demonstrated.
		it(`renders a.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`a.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	for (const cls of ['small', 'large', 'subtle', 'filled', 'disabled', 'active']) {
		// On failure: `<a class="${cls}">` not demonstrated.
		it(`renders a.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`a.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
