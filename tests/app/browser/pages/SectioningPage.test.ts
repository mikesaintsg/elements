// ============================================================================
//  SectioningPage — per-page STRUCTURE-ONLY parity (Phase-2 §2B-7).
//
//  SectioningPage is a PAGE_EXEMPTION: the sectioning-landmark sweep
//  with no single root. It owns a PAGE_SURFACE_BUNDLES entry of 9
//  landmark tags; 8 render as real elements. `<main>` is DELIBERATELY
//  documented-not-rendered: the framework's "one visible <main> per
//  page" rule means a standalone-mounted demo must not paint a second
//  <main> (it would collide with the showcase shell's). The
//  `#sectioning-main` section explains it; parity.test.ts resolves the
//  `main` key through the bundle, not markup — so the split is
//  intentional, mirroring MediaPage's embed/object. Asserted against
//  the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { SectioningPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.SectioningPage ?? []
const RENDERED = ['section', 'article', 'aside', 'header', 'footer', 'nav', 'search', 'hgroup']
const DOCUMENTED_ONLY = ['main']

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(SectioningPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('SectioningPage — render smoke', () => {
	it('mounts + renders the "sectioning" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#sectioning-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Sectioning')
		} finally {
			teardown()
		}
	})
})

describe('SectioningPage — bundle accounting (structure-only)', () => {
	it('the rendered + documented-only split exactly covers the bundle', () => {
		expect([...RENDERED, ...DOCUMENTED_ONLY].sort()).toEqual([...BUNDLE].sort())
	})
})

describe('SectioningPage — every live landmark renders (structure-only)', () => {
	for (const tag of RENDERED) {
		// On failure: the landmark sweep no longer renders `<${tag}>` —
		// the page's reason to exist (every sectioning landmark
		// demonstrated) has regressed.
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

describe('SectioningPage — <main> is intentionally documented-only', () => {
	it('does NOT render a live <main> (one-visible-main rule) but explains it', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main')).toBeNull()
			expect(host.querySelector('section#sectioning-main')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
