// ============================================================================
//  MediaPage — per-page BESPOKE parity (Phase-2 §7, Elements-Content).
//  PAGE_SURFACE_BUNDLES owner.
//
//  Reason to exist: the canonical demo for the replaced-element family.
//  The bundle lists 10 tags; 8 (img/picture/video/audio/canvas/svg/
//  math/iframe) render as real elements. `<embed>` and `<object>` are
//  DELIBERATELY shown as the escaped markup CONTRACT inside <pre><code>,
//  not as live elements — a real `<embed src="document.pdf">` would
//  404 in the showcase and a live <object> is pointless to mount, so
//  the page documents the contract instead (see the page's own
//  "embed / object" section rationale). parity.test.ts resolves these
//  two keys THROUGH the bundle (registry coverage), not via markup, so
//  there is no contradiction: this bespoke proves the 8 rendered tags
//  AND that embed/object are intentionally code-only, not a silent gap.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { MediaPage } from '../../../../app/browser/index.js'
import { PAGE_SURFACE_BUNDLES } from './_contract'

const BUNDLE = PAGE_SURFACE_BUNDLES.MediaPage ?? []
const RENDERED = ['img', 'picture', 'video', 'audio', 'canvas', 'svg', 'math', 'iframe']
const DOCUMENTED_ONLY = ['embed', 'object']

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(MediaPage)
	app.mount(host)
	return { host, teardown: () => { app.unmount(); host.remove() } }
}

describe('MediaPage — render smoke', () => {
	it('mounts + renders the "media" intro section', () => {
		const { host, teardown } = mount()
		try {
			const intro = host.querySelector('section#media-intro')
			expect(intro).not.toBeNull()
			expect(intro?.querySelector('h1')?.textContent?.trim()).toBe('Media')
		} finally {
			teardown()
		}
	})
})

describe('MediaPage — bundle accounting (§7)', () => {
	it('the rendered + documented-only split exactly covers the bundle', () => {
		expect([...RENDERED, ...DOCUMENTED_ONLY].sort()).toEqual([...BUNDLE].sort())
	})
})

describe('MediaPage — every live media tag is demonstrated (§7)', () => {
	for (const tag of RENDERED) {
		// On failure: `PAGE_SURFACE_BUNDLES.MediaPage` lists `${tag}` but
		// the mounted page renders no `<${tag}>` — parity.test.ts
		// resolves the media family THROUGH this bundle, so an
		// unrendered tag is a silent coverage hole.
		it(`renders <${tag}>`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(tag)).not.toBeNull()
			} finally {
				teardown()
			}
		})
	}
})

describe('MediaPage — embed/object are intentionally code-only (§7)', () => {
	// These two are in the bundle for registry resolution but are NOT
	// mounted — the page shows their markup contract instead. Assert
	// BOTH halves so a future "render them for real" or "drop the
	// contract" change trips a named test rather than slipping through.
	for (const tag of DOCUMENTED_ONLY) {
		it(`does NOT render a live <${tag}> element`, () => {
			const { host, teardown } = mount()
			try {
				expect(host.querySelector(tag)).toBeNull()
			} finally {
				teardown()
			}
		})
	}

	it('documents the embed + object markup contract as text', () => {
		const { host, teardown } = mount()
		try {
			const text = host.textContent ?? ''
			expect(text).toContain('embed src="document.pdf"')
			expect(text).toContain('object data="document.pdf"')
		} finally {
			teardown()
		}
	})
})
