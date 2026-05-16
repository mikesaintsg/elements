// ============================================================================
//  TokensPage — per-page BESPOKE parity (Phase-2 §8, Foundation batch).
//
//  Universal skeleton / bijection / inline-style / namespace / single-word
//  are enforced once for all 43 pages by tests/app/browser/pages.test.ts;
//  cross-registry coverage by tests/app/browser/parity.test.ts. This file
//  holds ONLY TokensPage's own reason to exist:
//
//    • the icon DEMO count === `tokens.ts` icon-registry length, and the
//      page's `TOKENS_ICONS` data is in lock-step with `tokens.icon`
//      (the audit's "~25 / ~20" lesson, made a permanent guard — the
//      page may never silently under/over-state the shipped icon set).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { tokens } from '@elements/browser'
import { TOKENS_ICONS, TokensPage } from '../../../../app/browser/index.js'

const ICON_KEYS = Object.keys((tokens as { icon: Record<string, unknown> }).icon)

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(TokensPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('TokensPage — render smoke', () => {
	it('mounts + renders the "tokens" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#tokens-intro')
			expect(intro, 'intro <section id="tokens-intro">').not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Tokens')
		} finally {
			teardown()
		}
	})
})

describe('TokensPage — icon-registry parity (Phase-2 §8)', () => {
	it('discovers the icon registry (vacuous-pass guard)', () => {
		expect(ICON_KEYS.length).toBeGreaterThanOrEqual(20)
	})

	// On failure: `TOKENS_ICONS` (app/browser/constants.ts — the data the
	// page renders) drifted from `tokens.icon` (src). Either an icon
	// shipped without a showcase row or a row outlived its token. The
	// permanent form of the Phase-1 1D-a "~25" prose-drift fix.
	it('TOKENS_ICONS length === tokens.icon registry length', () => {
		expect(TOKENS_ICONS.length).toBe(ICON_KEYS.length)
	})

	// On failure: `#tokens-icons` does not render exactly one tile per
	// shipped icon — the page under/over-renders the set.
	it('renders exactly one icon tile per registry entry', () => {
		const { host, teardown } = mount()
		try {
			const tiles = host.querySelectorAll('section#tokens-icons .showcase-tile-grid > article')
			expect(tiles.length).toBe(ICON_KEYS.length)
		} finally {
			teardown()
		}
	})
})
