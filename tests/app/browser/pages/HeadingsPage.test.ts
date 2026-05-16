// ============================================================================
//  HeadingsPage — per-page BESPOKE parity (Phase-2 §7, Elements-Content).
//  PAGE_SURFACE_BUNDLES owner; also in PAGE_H1_DEMO (renders real <h1>
//  samples, not just the intro page-H1).
//
//  Reason to exist: this is the canonical demo for the heading family,
//  so every tag in its PAGE_SURFACE_BUNDLES entry must actually render,
//  AND the heading cascade (every modifiers.variant on an <h2> + the
//  .small/.large size shift on an <h3>) must be demonstrated against the
//  MOUNTED DOM (modifiers are :class bindings).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { HeadingsPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const VARIANTS = Object.values(modifiers.variant) as string[]
const BUNDLE = PAGE_SURFACE_BUNDLES.HeadingsPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(HeadingsPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('HeadingsPage — render smoke', () => {
	it('mounts + renders the "headings" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#headings-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Headings')
		} finally {
			teardown()
		}
	})
})

describe('HeadingsPage — every bundled heading tag is demonstrated (§7)', () => {
	it('discovers the bundle (vacuous-pass guard)', () => {
		expect(BUNDLE.length).toBeGreaterThanOrEqual(7)
	})

	for (const tag of BUNDLE) {
		// On failure: `PAGE_SURFACE_BUNDLES.HeadingsPage` lists `${tag}`
		// but the mounted page renders no `<${tag}>` — parity.test.ts
		// resolves the heading family THROUGH this bundle, so an
		// unrendered tag is a silent coverage hole.
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

describe('HeadingsPage — heading cascade demonstrated (§7)', () => {
	for (const v of VARIANTS) {
		// On failure: the variant cascade section renders no `<h2 class="${v}">`
		// — the canonical heading page must show every variant tint.
		it(`renders h2.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`h2.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	// Size modifiers shift font-size without changing rank — demonstrated
	// on an <h3> (verified against the live render).
	for (const cls of ['small', 'large']) {
		it(`renders h3.${cls}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`h3.${cls}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
