// ============================================================================
//  PopoverSurfacesPage — per-page BESPOKE parity (Phase-2 §7, Surfaces).
//  PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: the canonical demo for the top-layer popover
//  surface family. The bundle's three keys are CSS SURFACES, not tags:
//    - `popover`        — queryable: [popover] in all three modes
//                         (auto / manual / hint) + button[popovertarget]
//    - `anchor-position`— queryable proxy: the .top/.bottom/.start/.end
//                         placement modifiers on [popover] + the anchor
//                         section (position-area itself is not a node)
//    - `backdrop`       — the ::backdrop pseudo has NO queryable node;
//                         the actual scrim only paints on modal <dialog>
//                         / <aside popover> (other pages). Here it is
//                         DOCUMENTED via its dedicated section. parity
//                         .test.ts resolves it through the bundle, so
//                         this split is intentional, not a gap.
//  Asserted against the MOUNTED DOM (popovers are in the DOM while
//  hidden).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { PopoverSurfacesPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.PopoverSurfacesPage ?? []

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(PopoverSurfacesPage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('PopoverSurfacesPage — render smoke', () => {
	it('mounts + renders the "popover-surfaces" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#popover-surfaces-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Popover surfaces')
		} finally {
			teardown()
		}
	})
})

describe('PopoverSurfacesPage — bundle accounting (§7)', () => {
	it('the bundle is exactly the three surface keys', () => {
		expect([...BUNDLE].sort()).toEqual(['anchor-position', 'backdrop', 'popover'])
	})
})

describe('PopoverSurfacesPage — `popover` surface, all three modes (§7)', () => {
	it('renders [popover]=auto, [popover=manual], [popover=hint] + a popovertarget trigger', () => {
		const { host, teardown } = mount()
		try {
			// auto: bare `popover` attribute (no value) — exclude the
			// manual/hint variants so this asserts the auto mode itself.
			const auto = [...host.querySelectorAll('[popover]')].filter(
				(el) => (el.getAttribute('popover') ?? '') === '',
			)
			expect(auto.length).toBeGreaterThan(0)
			expect(host.querySelector('[popover="manual"]')).not.toBeNull()
			expect(host.querySelector('[popover="hint"]')).not.toBeNull()
			expect(host.querySelector('button[popovertarget]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('PopoverSurfacesPage — `anchor-position` surface (§7)', () => {
	it('demonstrates the placement modifiers on [popover] + the anchor section', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('section#popover-surfaces-anchor')).not.toBeNull()
			for (const p of ['top', 'bottom', 'start', 'end']) {
				expect(host.querySelector(`[popover].${p}`)).not.toBeNull()
			}
		} finally {
			teardown()
		}
	})
})

describe('PopoverSurfacesPage — `backdrop` surface (§7)', () => {
	it('documents the ::backdrop scrim via its dedicated section', () => {
		// The scrim is a pseudo-element with no queryable node, and it
		// only paints on modal <dialog> / <aside popover> (cross-
		// referenced to other pages). The canonical explanation is this
		// section — that is what "demonstrated" means for this key.
		const { host, teardown } = mount()
		try {
			const sec = host.querySelector('section#popover-surfaces-backdrop')
			expect(sec).not.toBeNull()
			expect(sec?.querySelector('h2')?.textContent ?? '').toContain('backdrop')
		} finally {
			teardown()
		}
	})
})
