// ============================================================================
//  guides/surfaces.md ↔ src/styles/surfaces/_*.scss
//
//  Two directions of parity:
//
//    1. SCSS → DOC — every `surfaces/_{name}.scss` partial appears in the
//       "Shipped surfaces" table in surfaces.md. A new surface that ships
//       without a documented row is invisible to consumers.
//
//    2. DOC → SCSS — every `_{name}.scss` referenced in surfaces.md
//       resolves to a real file. Stale references after a rename / delete
//       are caught.
//
//  Surface names are extracted from `_{name}.scss` (matching the
//  conventional partial naming) and surfaces.md links of the shape
//  `[`_{name}.scss`](../src/styles/surfaces/_{name}.scss)`.
//
//  Pure node — node:fs reads the SCSS partials + markdown source.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { tagFromPath } from '../setup'
import { readGuide, readScssPartials } from '../setupServer'

const surfaceSources = readScssPartials('src/styles/surfaces')
const surfacesDoc = readGuide('surfaces')

const SHIPPED_SURFACES: readonly string[] = Object.keys(surfaceSources)
	.map(tagFromPath)
	.filter((name) => name !== 'index')

// ── 1. SCSS → DOC ──────────────────────────────────────────────────────────

describe('surfaces — every shipped partial is documented in surfaces.md', () => {
	for (const name of SHIPPED_SURFACES) {
		// On failure: `src/styles/surfaces/_${name}.scss` exists but is not
		// referenced in `guides/surfaces.md`. Add a row to the "Shipped
		// surfaces" table with: partial link, what it owns, key tokens.
		it(`_${name}.scss appears in guides/surfaces.md`, () => {
			const escaped = name.replace(/-/g, '\\-')
			expect(new RegExp(`_${escaped}\\.scss`).test(surfacesDoc)).toBe(true)
		})
	}
})

// ── 2. DOC → SCSS ──────────────────────────────────────────────────────────

describe('surfaces — every partial referenced in surfaces.md exists on disk', () => {
	const shippedSet = new Set(SHIPPED_SURFACES)
	const referenced = new Set<string>()
	const regex = /surfaces\/_([a-z][a-z0-9-]*)\.scss/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(surfacesDoc)) !== null) {
		if (match[1]) referenced.add(match[1])
	}

	for (const name of referenced) {
		// On failure: `guides/surfaces.md` references
		// `surfaces/_${name}.scss` but the file is missing from
		// `src/styles/surfaces/`. Either restore the partial or remove the
		// stale reference.
		it(`_${name}.scss (documented) exists in src/styles/surfaces/`, () => {
			expect(shippedSet.has(name)).toBe(true)
		})
	}
})
