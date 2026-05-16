// ============================================================================
//  ArticleCardPage — per-page parity scaffold (browser env).
//
//  Thin, real, page-SPECIFIC render smoke test (not a placeholder): the
//  component imported from the `app/browser` barrel mounts and renders
//  its intro section bound to the `article-card` route. Universal skeleton +
//  bijection + inline-style/namespace rules are enforced once for all 43
//  pages by tests/app/browser/pages.test.ts — NOT duplicated here.
//
//  Phase 2 (plans/phase-2.md §2D) fills the bespoke parity body: this
//  page's framework artifact(s) demonstrated + every applicable
//  modifier / option / event present.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { ArticleCardPage } from '../../../../app/browser/index.js'

describe('ArticleCardPage — parity scaffold', () => {
	it('mounts + renders the "article-card" intro section', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		const app = createApp(ArticleCardPage)
		try {
			app.mount(host)
			const intro = host.querySelector('section#article-card-intro')
			expect(intro, 'intro <section id="article-card-intro">').not.toBeNull()
			const h1 = intro?.querySelector('h1')?.textContent?.trim()
			expect(h1, 'intro <h1> === route title').toBe("Article card")
		} finally {
			app.unmount()
			host.remove()
		}
	})
})
