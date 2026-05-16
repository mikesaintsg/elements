// ============================================================================
//  UseToastPage — per-page parity scaffold.
//
//  Thin, real, page-SPECIFIC assertion (not a placeholder): the page loads
//  and its intro section binds to the `use-toast` route. Universal skeleton
//  rules (one setup script, JSDoc shape, h1===title, no-skip bijection,
//  inline-style / namespace) are enforced once for all 43 pages by the
//  meta-driver tests/app/core/pages.test.ts — NOT duplicated here.
//
//  Phase 2 (plans/phase-2.md §2D) fills the bespoke parity body: this
//  page's framework artifact(s) demonstrated + every applicable
//  modifier / option / event present.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { readAllPages } from '../../../setupServer'

const SRC = readAllPages()['UseToastPage'] ?? ''

describe('UseToastPage — parity scaffold', () => {
	it('source loads + opens with the setup-script skeleton', () => {
		expect(SRC).not.toBe('')
		expect(/<script lang="ts" setup>/.test(SRC)).toBe(true)
		expect(SRC.includes('<template>')).toBe(true)
	})

	it('intro section binds to the "use-toast" route', () => {
		const tpl = SRC.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
		expect(tpl).toMatch(/<section\s+id="use-toast-intro"/)
	})
})
