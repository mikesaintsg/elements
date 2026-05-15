// ============================================================================
//  guides/elements.md ↔ src/browser/elements.ts ↔ src/styles/elements/*.scss
//
//  The element surface has three layers; this test verifies parity in all
//  three directions so a change to any layer immediately surfaces drift:
//
//    1. SHAPE       — `elements.ts` is a frozen key=value mirror; the
//                     `Element` type narrows to the union of values.
//    2. TS → SCSS   — every key in `elements` has an `_{tag}.scss` partial
//                     that declares at least one `--set-{tag}-*` token
//                     (the marker of "substantive styling," not just a UA
//                     reset note).
//    3. SCSS → TS   — every `_{tag}.scss` that declares a `--set-{tag}-*`
//                     token appears in the `elements` object.
//
//  Empty placeholder partials (UA reset only) are not enumerated either
//  way. The `h1-h6` multi-tag partial is the one acknowledged exception
//  and skipped from the substantive sweep.
//
//  Pure node — globs SCSS via `?raw` and inspects raw source. No DOM
//  needed.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { elements, type Element } from '@elements/browser'
import { declaresElementToken, tagFromPath } from '../setup'
import { readScssPartials } from '../setupServer'

const elementSources = readScssPartials('src/styles/elements')

// ── 1. Shape ───────────────────────────────────────────────────────────────

describe('elements.ts — shape', () => {
	it('exposes at least one substantive element', () => {
		expect(Object.keys(elements).length).toBeGreaterThan(0)
	})

	it('every key matches its value (no aliasing)', () => {
		for (const [key, value] of Object.entries(elements)) {
			expect(value).toBe(key)
		}
	})

	it('Element type narrows to the union of values (compile-time check)', () => {
		const e: Element = 'button'
		expect(e).toBe('button')
	})
})

// ── 2. TS → SCSS ───────────────────────────────────────────────────────────

describe('TS → SCSS: every TS element key has a substantive partial', () => {
	const TS_KEYS = Object.keys(elements)

	it.each(TS_KEYS)('%s has a partial that declares --set-%s-* tokens', (tag) => {
		const entry = Object.entries(elementSources).find(([path]) => tagFromPath(path) === tag)
		expect(entry).toBeDefined()
		const source = entry?.[1] ?? ''
		expect(declaresElementToken(source, tag)).toBe(true)
	})
})

// ── 3. SCSS → TS ───────────────────────────────────────────────────────────

describe('SCSS → TS: every substantive partial is enumerated in elements.ts', () => {
	const TS_SET = new Set(Object.keys(elements))

	const substantiveTags: string[] = []
	for (const [path, source] of Object.entries(elementSources)) {
		const tag = tagFromPath(path)
		// h1-h6 is a multi-tag partial; skip it from the substantive check.
		if (tag.includes('-')) continue
		if (declaresElementToken(source, tag)) substantiveTags.push(tag)
	}

	it.each(substantiveTags)('_%s.scss is substantive and enumerated in elements.ts', (tag) => {
		expect(TS_SET).toContain(tag)
	})
})
