// ============================================================================
//  HomePage — per-page STRUCTURE-ONLY parity (Phase-2 §2B-7).
//
//  HomePage is a PAGE_EXEMPTION: a narrative landing page that
//  demonstrates no single framework artifact (chrome demo, no bundle).
//  Exemption is parity-only — the page still owes the structural
//  skeleton, so the bespoke is exactly that: it mounts, the intro
//  section + page-H1 render, and the narrative section spine is intact.
//  Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { HomePage } from '../../../../app/browser/index.js'

const SECTIONS = ['home-intro', 'philosophy', 'layers', 'modifiers', 'getting-started', 'next']

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(HomePage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('HomePage — render smoke', () => {
	it('mounts + renders the "home" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#home-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Elements')
		} finally {
			teardown()
		}
	})
})

describe('HomePage — narrative section spine (structure-only)', () => {
	for (const id of SECTIONS) {
		// On failure: the landing page's `<section id="${id}">` is gone —
		// the narrative spine the exemption rationale rests on is broken.
		it(`renders section#${id}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`section#${id}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}

	it('every non-intro section carries an <h2> (outline integrity)', () => {
		const { host, teardown } = mount()
		try {
			for (const id of SECTIONS) {
				if (id === 'home-intro') continue
				expect(host.querySelector(`section#${id} h2`)).not.toBeNull()
			}
		} finally {
			teardown()
		}
	})
})
