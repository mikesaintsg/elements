// ============================================================================
//  ScrollAndTransitionPage — per-page BESPOKE parity (Phase-2 §7,
//  Surfaces). PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: the canonical demo for two property/pseudo CSS
//  surfaces applied app-wide. Neither has a queryable node, so each
//  bundle key is verified via (a) its dedicated section AND (b) a
//  concrete demo element that exercises it:
//    - scrollbar       → #scroll-transition-scrollbar + .showcase-scroll-
//                        stage demos + a per-element --set-scrollbar-*
//                        override
//    - view-transition → #scroll-transition-view-transition + the live
//                        startViewTransition trigger + the morphing
//                        article + the per-element-name section
//  Asserted against the MOUNTED DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { ScrollAndTransitionPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.ScrollAndTransitionPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(ScrollAndTransitionPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('ScrollAndTransitionPage — render smoke', () => {
	it('mounts + renders the "scroll-and-transition" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#scroll-and-transition-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Scroll & transition')
		} finally {
			teardown()
		}
	})
})

describe('ScrollAndTransitionPage — bundle accounting (§7)', () => {
	it('the bundle is exactly the two surface keys', () => {
		expect([...BUNDLE].sort()).toEqual(['scrollbar', 'view-transition'])
	})
})

describe('ScrollAndTransitionPage — `scrollbar` surface (§7)', () => {
	it('section + scroll-stage demos + a per-element --set-scrollbar override', () => {
		const { host, teardown } = mount()
		try {
			const sec = host.querySelector('section#scroll-transition-scrollbar')
			expect(sec).not.toBeNull()
			expect(host.querySelectorAll('.showcase-scroll-stage').length).toBeGreaterThan(0)
			// Per-host override demo pins a --set-scrollbar-* token inline.
			expect(host.querySelector('[style*="--set-scrollbar-"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('ScrollAndTransitionPage — `view-transition` surface (§7)', () => {
	it('section + the live startViewTransition trigger + the morphing article + named section', () => {
		const { host, teardown } = mount()
		try {
			const sec = host.querySelector('section#scroll-transition-view-transition')
			expect(sec).not.toBeNull()
			// The live demo: a trigger button + the variant-tinted article
			// that morphs when document.startViewTransition() fires.
			expect(sec?.querySelector('button[type="button"]')).not.toBeNull()
			expect(sec?.querySelector('article.filled')).not.toBeNull()
			// The per-element view-transition-name discussion.
			expect(host.querySelector('section#scroll-transition-named')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
