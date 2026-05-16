// ============================================================================
//  ThemePage — per-page BESPOKE parity (Phase-2 §8, Foundation).
//
//  Reason to exist: the variant-palette surface must render a base
//  swatch for EVERY `modifiers.variant` (`--color-{variant}`). The page
//  swatches the 7 variant bases and documents the per-variant tier
//  naming (`-bg-subtle` / `-text-emphasis` / `-border-subtle` /
//  `-on-canvas`) in prose — so the decidable guard is: no shipped
//  variant lacks a `--color-{variant}` swatch, and the documented tier
//  vocabulary matches `THEME_TIERS`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { THEME_TIERS, ThemePage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ThemePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

const swatchTokens = (host: HTMLElement): Set<string> =>
	new Set(
		[...host.querySelectorAll('.showcase-swatch-label')].map((el) => el.textContent?.trim() ?? ''),
	)

describe('ThemePage — render smoke', () => {
	it('mounts + renders the "theme" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#theme-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Theme')
		} finally {
			teardown()
		}
	})
})

describe('ThemePage — every variant base colour has a swatch (§8)', () => {
	it('discovers variants + tiers (vacuous-pass guard)', () => {
		expect(VARIANTS.length).toBeGreaterThanOrEqual(7)
		expect(THEME_TIERS.length).toBeGreaterThan(0)
	})

	// The documented per-variant tiers must match THEME_TIERS exactly —
	// the page's tier vocabulary can't drift from its own constant.
	it('THEME_TIERS is the documented tier set', () => {
		expect([...THEME_TIERS].sort()).toEqual(
			['bg-subtle', 'border-subtle', 'on-canvas', 'text-emphasis'].sort(),
		)
	})

	for (const v of VARIANTS) {
		// On failure: `modifiers.variant` ships `${v}` but ThemePage
		// renders no `--color-${v}` base swatch — a variant with no
		// visible palette entry.
		it(`renders a --color-${v} base swatch`, () => {
			const { host, teardown } = mount()
			try {
				expect(swatchTokens(host).has(`--color-${v}`)).toBe(true)
			} finally {
				teardown()
			}
		})
	}
})
