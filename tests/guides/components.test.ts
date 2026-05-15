// ============================================================================
//  guides/components.md ↔ src/styles/components/_*.scss
//
//  Two directions of parity (same shape as surfaces.test.ts):
//
//    1. SCSS → DOC — every `components/_{name}.scss` partial appears in
//       the "Shipped catalog" table in components.md. A new component
//       that ships without a documented row is invisible to consumers.
//
//    2. DOC → SCSS — every `components/_{name}.scss` referenced in
//       components.md resolves to a real file. Stale references after a
//       rename / delete are caught.
//
//  Component names are extracted from `_{name}.scss` (the conventional
//  partial naming) and from components.md links of the shape
//  `[`_{name}.scss`](../src/styles/components/_{name}.scss)`.
//
//  Pure node — node:fs reads the SCSS partials + markdown source.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { tagFromPath } from '../setup'
import { readGuide, readScssPartials } from '../setupServer'

const componentSources = readScssPartials('src/styles/components')
const componentsDoc = readGuide('components')

const SHIPPED_COMPONENTS: readonly string[] = Object.keys(componentSources)
	.map(tagFromPath)
	.filter((name) => name !== 'index')

// ── 1. SCSS → DOC ──────────────────────────────────────────────────────────

describe('components — every shipped partial is documented in components.md', () => {
	for (const name of SHIPPED_COMPONENTS) {
		// On failure: `src/styles/components/_${name}.scss` exists but is
		// not referenced in `guides/components.md`. Add a row to the
		// "Shipped catalog" table: partial link, root selector, what it
		// composes, modifier dimensions.
		it(`_${name}.scss appears in guides/components.md`, () => {
			const escaped = name.replace(/-/g, '\\-')
			expect(new RegExp(`_${escaped}\\.scss`).test(componentsDoc)).toBe(true)
		})
	}
})

// ── 2. DOC → SCSS ──────────────────────────────────────────────────────────

describe('components — every partial referenced in components.md exists on disk', () => {
	const shippedSet = new Set(SHIPPED_COMPONENTS)
	const referenced = new Set<string>()
	const regex = /components\/_([a-z][a-z0-9-]*)\.scss/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(componentsDoc)) !== null) {
		if (match[1] && match[1] !== 'index') referenced.add(match[1])
	}

	it('discovers at least one referenced component partial', () => {
		expect(referenced.size).toBeGreaterThan(0)
	})

	for (const name of referenced) {
		// On failure: `guides/components.md` references
		// `components/_${name}.scss` but the file is missing from
		// `src/styles/components/`. Either restore the partial or remove
		// the stale reference.
		it(`_${name}.scss (documented) exists in src/styles/components/`, () => {
			expect(shippedSet.has(name)).toBe(true)
		})
	}
})
