// ============================================================================
//  InspectorPage — per-page BESPOKE parity (Phase-2 §7, Composables-Primitives).
//
//  InspectorPage is the LIVE dogfood of the public `Inspector` — it runs
//  `new Inspector().inspect()` on real DOM and renders the findings. Its
//  reason to exist is "the inspect control actually inspects": clicking it
//  must populate a rendered result region (the fixture panel surfaces real
//  findings; the page panel surfaces the conform state). Real DOM, real
//  framework cascade, no mocks (§16.2) — mirrors the ButtonPage.test.ts
//  mount idiom + the semantics.test.ts isolation mount.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { InspectorPage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(InspectorPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('InspectorPage — render smoke', () => {
	it('mounts + renders the "inspector" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#inspector-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Inspector')
		} finally {
			teardown()
		}
	})

	it('renders the core panel sections (filters, live, fixture, api)', () => {
		const { host, teardown } = mount()
		try {
			for (const id of [
				'inspector-filters',
				'inspector-live',
				'inspector-fixture',
				'inspector-api',
			]) {
				expect(host.querySelector(`section#${id}`), `section#${id}`).not.toBeNull()
			}
			// The two inspect controls exist before any pass has run.
			expect(host.querySelectorAll('button[type="button"]').length).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})
})

describe('InspectorPage — the inspect controls actually inspect (§7 dogfood)', () => {
	it('clicking "Inspect the broken fixture" populates a rendered findings region', async () => {
		const { host, teardown } = mount()
		try {
			const fixtureSection = host.querySelector('section#inspector-fixture')
			expect(fixtureSection).not.toBeNull()
			// No result list before the pass.
			expect(fixtureSection?.querySelector('dl')).toBeNull()

			const button = [...host.querySelectorAll('button')].find((b) =>
				/broken fixture/i.test(b.textContent ?? ''),
			)
			expect(button, 'the fixture inspect button').toBeDefined()
			button?.click()
			await nextTick()

			// The deliberately-broken fixture must surface real findings: a
			// rendered <dl> grouping with at least one finding card carrying a
			// rule id + a spec-cited link.
			const dl = fixtureSection?.querySelector('dl')
			expect(dl, 'rendered findings <dl> after the pass').not.toBeNull()
			const cards = fixtureSection?.querySelectorAll('dd menu > li')
			expect((cards?.length ?? 0) > 0, 'at least one finding card').toBe(true)
			const firstCard = cards?.[0]
			expect(firstCard?.querySelector('code')?.textContent ?? '').toMatch(/\//) // {family}/{concern}
			expect(firstCard?.querySelector('footer')?.textContent ?? '').toMatch(/#/) // a cite
		} finally {
			teardown()
		}
	})

	it('clicking "Inspect this page" renders a result region (conform or grouped)', async () => {
		const { host, teardown } = mount()
		try {
			const liveSection = host.querySelector('section#inspector-live')
			const button = [...host.querySelectorAll('button')].find((b) =>
				/inspect this page/i.test(b.textContent ?? ''),
			)
			expect(button, 'the page inspect button').toBeDefined()
			button?.click()
			await nextTick()

			// Either the conform state (zero error — the dogfood property) or a
			// grouped list rendered; never a silent blank after a pass.
			const conform = liveSection?.querySelector('aside[role="status"].success')
			const grouped = liveSection?.querySelector('dl')
			expect(
				conform !== null || grouped !== null,
				'a result region (conform or grouped) is rendered after the pass',
			).toBe(true)
		} finally {
			teardown()
		}
	})
})
