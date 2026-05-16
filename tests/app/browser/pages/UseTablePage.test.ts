// ============================================================================
//  UseTablePage — per-page parity scaffold (browser env).
//
//  Thin, real, page-SPECIFIC render smoke test (not a placeholder): the
//  component imported from the `app/browser` barrel mounts and renders
//  its intro section bound to the `use-table` route. Universal skeleton +
//  bijection + inline-style/namespace rules are enforced once for all 43
//  pages by tests/app/browser/pages.test.ts — NOT duplicated here.
//
//  Phase 2 (plans/phase-2.md §2D) fills the bespoke parity body: this
//  page's framework artifact(s) demonstrated + every applicable
//  modifier / option / event present.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { UseTablePage } from '../../../../app/browser/index.js'

describe('UseTablePage — parity scaffold', () => {
	it('mounts + renders the "use-table" intro section', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		const app = createApp(UseTablePage)
		try {
			app.mount(host)
			const intro = host.querySelector('section#use-table-intro')
			expect(intro, 'intro <section id="use-table-intro">').not.toBeNull()
			const h1 = intro?.querySelector('h1')?.textContent?.trim()
			expect(h1, 'intro <h1> === route title').toBe("useTable")
		} finally {
			app.unmount()
			host.remove()
		}
	})
})
