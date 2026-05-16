// ============================================================================
//  FormControlsPage — per-page BESPOKE parity (Phase-2 §7,
//  Elements-Interactive). PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: this is the canonical demo for the whole form-control
//  family, so every tag in its PAGE_SURFACE_BUNDLES entry must actually
//  render. The bundle is the contract; this proves the page honours it.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { FormControlsPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.FormControlsPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(FormControlsPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('FormControlsPage — render smoke', () => {
	it('mounts + renders the "form-controls" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#form-controls-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Form controls')
		} finally {
			teardown()
		}
	})
})

describe('FormControlsPage — every bundled form-control tag is demonstrated (§7)', () => {
	it('discovers the bundle (vacuous-pass guard)', () => {
		expect(BUNDLE.length).toBeGreaterThanOrEqual(10)
	})

	for (const tag of BUNDLE) {
		// On failure: `PAGE_SURFACE_BUNDLES.FormControlsPage` lists `${tag}`
		// but the mounted page renders no `<${tag}>` — the page does not
		// honour its own bundle contract (parity.test.ts resolves form
		// controls THROUGH this bundle, so an unrendered tag is a silent
		// coverage hole).
		it(`renders <${tag}>`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(tag)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
