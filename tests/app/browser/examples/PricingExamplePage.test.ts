// ============================================================================
//  PricingExamplePage — composition pillar smoke.
//
//  The page mounts ExamplesShell + PricingExample. Guards anchor on the
//  composed pieces: the feature + pricing <article> cards, the .badge
//  atoms, the anchors-as-buttons CTAs, and the trailing in-flow footer
//  (a <main>-nested <footer>, not a body-shell footer).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { PricingExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(PricingExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('PricingExamplePage — render smoke', () => {
	it('mounts a single <main> marketing page (top nav + content, no aside rail)', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main')).not.toBeNull()
			// A content top-nav lives inside <main>; the page has no body-shell
			// <aside> rail (it's a marketing page, not an app shell).
			expect(host.querySelector('main > nav')).not.toBeNull()
			expect(host.querySelector('aside')).toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('PricingExamplePage — composition vocabulary', () => {
	it('renders three pricing plan cards with full-width CTA anchors', () => {
		const { host, teardown } = mount()
		try {
			const planCards = host.querySelectorAll('#pricing article')
			expect(planCards.length).toBe(3)
			expect(host.querySelector('#pricing article footer a.fill')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders .badge atoms and a trailing in-flow footer', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelectorAll('.badge').length).toBeGreaterThan(0)
			expect(host.querySelector('main > footer')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

// ── Interactive drives ─────────────────────────────────────────────────────
//
// PricingExample is a marketing page — its only interactive surface is
// anchor navigation. We assert each CTA anchor is a real `<a>` with a
// usable `href` so a screen reader / keyboard user can reach the next
// hop, and that the in-page `#pricing` anchor resolves to a real
// section. The richer interactive guards live with the app-shell
// pillars (Console / Crm / Settings / Signin).

describe('PricingExamplePage — CTA navigation', () => {
	it('every plan CTA exposes a non-empty href so it is keyboard-reachable', () => {
		const { host, teardown } = mount()
		try {
			const ctas = [...host.querySelectorAll<HTMLAnchorElement>('#pricing article footer a.fill')]
			expect(ctas.length).toBeGreaterThan(0)
			for (const cta of ctas) {
				const href = cta.getAttribute('href') ?? ''
				expect(href.length).toBeGreaterThan(0)
			}
		} finally {
			teardown()
		}
	})

	it('the top-nav #pricing link points at the rendered <section id="pricing">', () => {
		const { host, teardown } = mount()
		try {
			const link = host.querySelector<HTMLAnchorElement>('main > nav a[href="#pricing"]')
			const target = host.querySelector<HTMLElement>('#pricing')
			expect(link).not.toBeNull()
			expect(target).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
