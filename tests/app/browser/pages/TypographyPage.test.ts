// ============================================================================
//  TypographyPage — per-page STRUCTURE-ONLY parity (Phase-2 §2B-7).
//
//  TypographyPage is a PAGE_EXEMPTION: a sweep of ~two-dozen text tags
//  with no single framework root. Its PAGE_SURFACE_BUNDLES entry is
//  explicitly flagged APPROXIMATE in _contract.ts ("Phase 2 reconciles
//  the exact set against the page markup") — so this structure-only
//  test asserts the page's REAL documented sweep (the 23 elements its
//  own JSDoc enumerates and its template renders), independent of the
//  stale bundle. Reconciling the bundle itself is a parity.test.ts /
//  §1 concern, out of scope for this structure-only batch.
//
//  Verified against the live template: `b`/`i`/`cite`/`dfn`/`dl`/`dt`/
//  `dd` are NOT rendered here (covered on Lists/Figures/Headings);
//  `ins`/`del` ARE (edits) though absent from the bundle. Asserted
//  against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { TypographyPage } from '../../../../app/browser/index.js'

// The page's actual rendered text-element sweep (its JSDoc's 23 +
// verified present in the mounted DOM, not just in <pre> snippets).
const SWEEP = [
	'p',
	'blockquote',
	'pre',
	'address',
	'hr',
	'strong',
	'em',
	'small',
	'mark',
	'u',
	's',
	'ins',
	'del',
	'code',
	'kbd',
	'samp',
	'var',
	'q',
	'abbr',
	'time',
	'data',
	'sub',
	'sup',
]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(TypographyPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('TypographyPage — render smoke', () => {
	it('mounts + renders the "typography" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#typography-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Typography')
		} finally {
			teardown()
		}
	})
})

describe('TypographyPage — the text-element sweep renders (structure-only)', () => {
	it('discovers the sweep (vacuous-pass guard)', () => {
		expect(SWEEP.length).toBe(23)
	})

	for (const tag of SWEEP) {
		// On failure: the typography sweep no longer renders `<${tag}>`
		// in body-copy context — the page's reason to exist (every text
		// element demonstrated in prose) has regressed.
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
