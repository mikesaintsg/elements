// ============================================================================
//  AsidePage — per-page BESPOKE parity (Phase-2 §7, Components).
//
//  Reason to exist: <aside> is one element with FOUR shapes the
//  framework paints, disambiguated by ancestry / role / attribute
//  (never a class root). The body-shell sidebar rail is the SURROUNDING
//  showcase chrome (not rendered by this page's own mount), so the
//  guard covers the three in-mount shapes + the top-layer drawer:
//    2. article callout (article aside) + variant cascade
//    3. alert banner (aside[role="alert"]) + .flat / .flush + slots
//    4. status banner (aside[role="status"])
//    5. drawer (aside[popover]) + the 4 placement modifiers
//  The callout + alert variant loops cover EVERY modifiers.variant.
//  Asserted against the MOUNTED DOM (popover elements are in the DOM
//  even while hidden).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { AsidePage } from '../../../../app/browser/index.js'

const VARIANTS = Object.values(modifiers.variant) as string[]
// The drawer placement modifiers the page demonstrates (the four
// single-axis values; corners are not a drawer concept).
const DRAWER_PLACEMENTS = ['start', 'end', 'top', 'bottom']

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(AsidePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('AsidePage — render smoke', () => {
	it('mounts + renders the "aside" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#aside-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Aside')
		} finally {
			teardown()
		}
	})
})

describe('AsidePage — the four <aside> shapes (§7)', () => {
	it('shape 2: article-callout (article aside)', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('article aside')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('shape 3: alert banner (aside[role="alert"][data-alert-open])', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('aside[role="alert"]')).not.toBeNull()
			expect(host.querySelector('aside[role="alert"][data-alert-open]')).not.toBeNull()
			// header/footer band composition + the two dissolution modifiers.
			expect(host.querySelector('aside[role="alert"] > header')).not.toBeNull()
			expect(host.querySelector('aside[role="alert"] > footer')).not.toBeNull()
			expect(host.querySelector('aside[role="alert"].flat')).not.toBeNull()
			expect(host.querySelector('aside[role="alert"].flush')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('shape 4: status banner (aside[role="status"])', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('aside[role="status"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('shape 5: drawer (aside[popover])', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('aside[popover]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('AsidePage — variant cascade across callout + alert (§7)', () => {
	for (const v of VARIANTS) {
		// On failure: neither the callout loop nor the alert loop renders
		// an `aside.${v}` — the canonical aside page must show every
		// variant tint on the leading bar / banner.
		it(`renders aside.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`aside.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('AsidePage — drawer placement modifiers (§7)', () => {
	for (const p of DRAWER_PLACEMENTS) {
		// On failure: no `aside[popover].${p}` — the drawer must
		// demonstrate every edge it can slide in from.
		it(`renders aside[popover].${p}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`aside[popover].${p}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
