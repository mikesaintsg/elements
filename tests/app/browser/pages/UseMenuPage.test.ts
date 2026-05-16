// ============================================================================
//  UseMenuPage — per-page parity scaffold (browser env).
//
//  Thin, real, page-SPECIFIC render smoke test (not a placeholder): the
//  component imported from the `app/browser` barrel mounts and renders
//  its intro section bound to the `use-menu` route. Universal skeleton +
//  bijection + inline-style/namespace rules are enforced once for all 43
//  pages by tests/app/browser/pages.test.ts — NOT duplicated here.
//
//  Phase 2 (plans/phase-2.md §2D) fills the bespoke parity body: this
//  page's framework artifact(s) demonstrated + every applicable
//  modifier / option / event present.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { UseMenuPage } from '../../../../app/browser/index.js'

describe('UseMenuPage — parity scaffold', () => {
	it('mounts + renders the "use-menu" intro section', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		const app = createApp(UseMenuPage)
		try {
			app.mount(host)
			const intro = host.querySelector('section#use-menu-intro')
			expect(intro, 'intro <section id="use-menu-intro">').not.toBeNull()
			const h1 = intro?.querySelector('h1')?.textContent?.trim()
			expect(h1, 'intro <h1> === route title').toBe('useMenu')
		} finally {
			app.unmount()
			host.remove()
		}
	})
})
