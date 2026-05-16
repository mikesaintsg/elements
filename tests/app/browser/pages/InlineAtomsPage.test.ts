// ============================================================================
//  InlineAtomsPage — per-page BESPOKE parity (Phase-2 §7,
//  Elements-Content). PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: the canonical demo for the five CLASS-ROOT inline
//  atoms (.badge / .dot / .tag / .spinner / .skeleton — no semantic HTML
//  home, so they're class roots not tags). Every atom in the bundle
//  must render, the variant cascade must be shown on the canonical atom
//  (.badge.{variant} for every modifiers.variant), and each atom's
//  distinctive style/shape modifier must be demonstrated. Asserted
//  against the MOUNTED DOM (modifiers are :class bindings).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { modifiers } from '@elements/browser'
import { InlineAtomsPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const VARIANTS = Object.values(modifiers.variant) as string[]
const BUNDLE = PAGE_SURFACE_BUNDLES.InlineAtomsPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(InlineAtomsPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('InlineAtomsPage — render smoke', () => {
	it('mounts + renders the "inline-atoms" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#inline-atoms-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Inline atoms')
		} finally {
			teardown()
		}
	})
})

describe('InlineAtomsPage — every bundled atom class is demonstrated (§7)', () => {
	it('discovers the bundle (vacuous-pass guard)', () => {
		expect(BUNDLE.length).toBe(5)
	})

	for (const atom of BUNDLE) {
		// On failure: `PAGE_SURFACE_BUNDLES.InlineAtomsPage` lists
		// `${atom}` but the mounted page renders no `.${atom}` — the
		// class root is not a tag, so parity.test.ts resolves it THROUGH
		// this bundle; an unrendered atom is a silent coverage hole.
		it(`renders .${atom}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`.${atom}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('InlineAtomsPage — variant cascade on the canonical atom (§7)', () => {
	for (const v of VARIANTS) {
		// On failure: the badge section renders no `.badge.${v}` — the
		// atoms read from the shared seven-variant cascade and the
		// canonical atom must show every variant.
		it(`renders .badge.${v}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(`.badge.${v}`)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('InlineAtomsPage — distinctive per-atom modifiers (§7)', () => {
	// Each atom's signature style/shape/interactive modifier, verified
	// against the live render.
	const SIGNATURES: Readonly<Record<string, string>> = {
		'badge.filled': '.badge.filled',
		'badge.pill': '.badge.pill',
		'dot.pulse': '.dot.pulse',
		'dot.large': '.dot.large',
		'tag.ghost': '.tag.ghost',
		'tag.square': '.tag.square',
		'interactive chip (button.tag)': 'button.tag',
		'dismiss glyph (button.remove)': 'button.remove',
		'tag-group wrapper': '.tag-group',
		'spinner.large': '.spinner.large',
		'skeleton.text': '.skeleton.text',
		'skeleton.circle': '.skeleton.circle',
	}
	for (const [label, selector] of Object.entries(SIGNATURES)) {
		it(`demonstrates ${label}`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(selector)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})
