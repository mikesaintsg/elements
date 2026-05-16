// ============================================================================
//  ModifiersPage — per-page BESPOKE parity (Phase-2 §7/§8, Foundation).
//
//  Universal rules live in pages.test.ts; cross-registry in parity.test.ts.
//  ModifiersPage's reason to exist: it must demonstrate EVERY value of
//  EVERY cross-cutting modifier dimension in `modifiers.ts`
//  (variant / size / style / state) as a real class in rendered markup.
//  (placement is PlacementsPage's job.)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { ModifiersPage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ModifiersPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('ModifiersPage — render smoke', () => {
	it('mounts + renders the "modifiers" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#modifiers-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Modifiers')
		} finally {
			teardown()
		}
	})
})

describe('ModifiersPage — every modifier dimension value is demonstrated (§7/§8)', () => {
	const dims = ['variant', 'size', 'style', 'state'] as const

	it('discovers the modifier registry (vacuous-pass guard)', () => {
		for (const d of dims) expect(Object.values(modifiers[d]).length).toBeGreaterThan(0)
	})

	for (const dim of dims) {
		for (const value of Object.values(modifiers[dim]) as string[]) {
			if (value === '') continue // '' = the bare default (no class)
			// On failure: `modifiers.${dim}.…` ships `.${value}` but
			// ModifiersPage renders no element carrying that class — the
			// modifier vocabulary page must demo every dimension value.
			it(`renders a .${value} element (${dim})`, () => {
				const { host, teardown } = mount()
				try {
					expect(host.querySelector(`.${value}`), `.${value}`).not.toBeNull()
				} finally {
					teardown()
				}
			})
		}
	}
})
