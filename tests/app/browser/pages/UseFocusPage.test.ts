// ============================================================================
//  UseFocusPage — per-page parity scaffold (browser env).
//
//  Thin, real, page-SPECIFIC render smoke test (not a placeholder): the
//  component imported from the `app/browser` barrel mounts and renders
//  its intro section bound to the `use-focus` route. Universal skeleton +
//  bijection + inline-style/namespace rules are enforced once for all 43
//  pages by tests/app/browser/pages.test.ts — NOT duplicated here.
//
//  Phase 2 (plans/phase-2.md §2D) fills the bespoke parity body: this
//  page's framework artifact(s) demonstrated + every applicable
//  modifier / option / event present.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { UseFocusPage } from '../../../../app/browser/index.js'

describe('UseFocusPage — parity scaffold', () => {
	it('mounts + renders the "use-focus" intro section', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		const app = createApp(UseFocusPage)
		try {
			app.mount(host)
			const intro = host.querySelector('section#use-focus-intro')
			expect(intro, 'intro <section id="use-focus-intro">').not.toBeNull()
			const h1 = intro?.querySelector('h1')?.textContent?.trim()
			expect(h1, 'intro <h1> === route title').toBe("useFocus")
		} finally {
			app.unmount()
			host.remove()
		}
	})
})
