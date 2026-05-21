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
	it('mounts a single <main> with no body-shell rails', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('main')).not.toBeNull()
			expect(host.querySelector('main > nav')).toBeNull()
			expect(host.querySelector('main > aside')).toBeNull()
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
			expect(host.querySelector('#pricing article footer a.w-full')).not.toBeNull()
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
