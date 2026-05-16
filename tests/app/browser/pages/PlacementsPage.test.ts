// ============================================================================
//  PlacementsPage — per-page BESPOKE parity (Phase-2 §8, Foundation).
//
//  Reason to exist: the page's placement vocabulary must stay in
//  lock-step with `modifiers.placement` (all 8). PlacementsPage is an
//  INTERACTIVE demo — a single live `[popover]` whose placement class is
//  driven by a picker — so the parity guard is constant↔src on
//  `PLACEMENTS_MODIFIER` (the picker's data: a placement can't ship
//  without a picker entry, nor an entry outlive its placement), plus a
//  render smoke that the live popover exists.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { PLACEMENTS_MODIFIER, PlacementsPage } from '../../../../app/browser/index.js'

const PLACEMENTS = Object.values(modifiers.placement) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(PlacementsPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('PlacementsPage — render smoke', () => {
	it('mounts + renders the "placements" intro + the live popover', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#placements-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Placements')
			expect(host.querySelector('#placements-live-popover')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('PlacementsPage — all 8 placements (§8)', () => {
	it('discovers the placement registry (vacuous-pass guard)', () => {
		expect(PLACEMENTS.length).toBe(8)
	})

	// On failure: `PLACEMENTS_MODIFIER` (the picker's data) drifted from
	// `modifiers.placement` (src) — a placement shipped without a picker
	// entry, or an entry outlived its placement. This is the permanent
	// "all 8 demonstrated" guard for an interactive picker page.
	it('PLACEMENTS_MODIFIER === modifiers.placement (constant↔src)', () => {
		expect([...PLACEMENTS_MODIFIER].sort()).toEqual([...PLACEMENTS].sort())
	})
})
