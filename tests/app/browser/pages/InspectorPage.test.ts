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

	it('renders the core panel sections (filters, live, fixture, sandbox, api)', () => {
		const { host, teardown } = mount()
		try {
			for (const id of [
				'inspector-filters',
				'inspector-live',
				'inspector-fixture',
				'inspector-sandbox',
				'inspector-api',
			]) {
				expect(host.querySelector(`section#${id}`), `section#${id}`).not.toBeNull()
			}
			// The inspect controls exist before any pass has run (page +
			// fixture + sandbox inspect, plus the sandbox reset).
			expect(host.querySelectorAll('button[type="button"]').length).toBeGreaterThanOrEqual(2)
			// The sandbox ships an editable <textarea> seeded with markup.
			const editor = host.querySelector<HTMLTextAreaElement>('section#inspector-sandbox textarea')
			expect(editor, 'the sandbox <textarea>').not.toBeNull()
			expect((editor?.value ?? '').length, 'seeded with starting markup').toBeGreaterThan(0)
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
			const cards = fixtureSection?.querySelectorAll('dd ul > li')
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

	it('the sandbox inspects the edited markup (seed → real findings; reset clears)', async () => {
		const { host, teardown } = mount()
		try {
			const sandbox = host.querySelector('section#inspector-sandbox')
			expect(sandbox).not.toBeNull()
			// No result list before the pass.
			expect(sandbox?.querySelector('dl')).toBeNull()

			const run = [...host.querySelectorAll('button')].find((b) =>
				/inspect this markup/i.test(b.textContent ?? ''),
			)
			expect(run, 'the sandbox inspect button').toBeDefined()
			run?.click()
			await nextTick()

			// The seed mixes conformant markup with tree-decidable breaks, so a
			// rendered <dl> with at least one rule-id + spec-cited finding card
			// must appear — the inspector ran against the PARSED textarea value.
			const dl = sandbox?.querySelector('dl')
			expect(dl, 'rendered findings <dl> after the sandbox pass').not.toBeNull()
			const cards = sandbox?.querySelectorAll('dd ul > li')
			expect((cards?.length ?? 0) > 0, 'at least one finding card').toBe(true)
			expect(cards?.[0]?.querySelector('code')?.textContent ?? '').toMatch(/\//) // {family}/{concern}
			expect(cards?.[0]?.querySelector('footer')?.textContent ?? '').toMatch(/#/) // a cite

			// Reset restores the seed and drops the rendered result.
			const reset = [...host.querySelectorAll('button')].find((b) =>
				/reset to seed/i.test(b.textContent ?? ''),
			)
			expect(reset, 'the sandbox reset button').toBeDefined()
			reset?.click()
			await nextTick()
			expect(sandbox?.querySelector('dl'), 'result cleared after reset').toBeNull()
		} finally {
			teardown()
		}
	})
})
