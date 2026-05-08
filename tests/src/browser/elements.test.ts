// ============================================================================
// Element surface — TS shape + bidirectional SCSS parity.
//
// Three layers of contract:
//   1. Shape — every key matches its value (no aliasing); `Element` type
//      narrows to the union of values.
//   2. TS → SCSS — every key in `elements` has a `_{tag}.scss` partial that
//      declares at least one --set-{tag}-* token (the marker of "substantive
//      styling," not just a UA reset note).
//   3. SCSS → TS — every `_{tag}.scss` that declares a --set-{tag}-* token
//      appears in the `elements` object.
//
// Empty placeholder partials (UA reset only) are not enumerated either way.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { elements, type Element } from '@src/browser'

const elementSources = import.meta.glob('../../../src/styles/elements/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function tagFromPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract tag from ${path}`)
	return match[1]
}

function declaresElementToken(source: string, tag: string): boolean {
	// True if the partial declares any `--set-{tag}-*` custom property.
	return new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`, 'i').test(source)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('elements — shape', () => {
	it('button is the only element with substantive styling at this stage', () => {
		expect(Object.keys(elements)).toEqual(['button'])
		expect(elements.button).toBe('button')
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

// ─────────────────────────────────────────────────────────────────────────────
//  TS → SCSS
// ─────────────────────────────────────────────────────────────────────────────

describe('TS → SCSS: every TS element key has a substantive partial', () => {
	const TS_KEYS = Object.keys(elements)

	it.each(TS_KEYS)('%s has a partial that declares --set-%s-* tokens', (tag) => {
		const entry = Object.entries(elementSources).find(([path]) => tagFromPath(path) === tag)
		expect(entry, `No _${tag}.scss partial found`).toBeDefined()
		const [, source] = entry!
		expect(
			declaresElementToken(source, tag),
			`_${tag}.scss exists but declares no --set-${tag}-* token`,
		).toBe(true)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  SCSS → TS
// ─────────────────────────────────────────────────────────────────────────────

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
