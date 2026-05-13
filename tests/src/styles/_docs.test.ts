// ============================================================================
//  Docs ↔ code parity for modifier dimensions.
//
//  guides/modifiers.md §1 names the five dimensions and enumerates the
//  values for each. The shipped TS surface in src/browser/modifiers.ts is
//  the source of truth. This test parses the §1 table out of the markdown
//  and asserts every value listed appears in the matching `modifiers.{dim}`
//  object, AND vice versa — every shipped modifier name is listed in the
//  doc.
//
//  The parse is intentionally simple: find rows that start with a known
//  dimension keyword (Variant / Size / Style / State / Placement) and
//  scan the cell for backtick-quoted `.{name}` values. Drift in any
//  direction — adding a modifier to TS without updating the doc, or
//  documenting a modifier that hasn't shipped — fails the test.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'
import modifiersDoc from '../../../guides/modifiers.md?raw'

interface DocDimension {
	readonly key: keyof typeof modifiers
	readonly heading: string
}

const DIMENSIONS: readonly DocDimension[] = [
	{ key: 'variant', heading: 'Variant' },
	{ key: 'size', heading: 'Size' },
	{ key: 'style', heading: 'Style' },
	{ key: 'state', heading: 'State' },
	{ key: 'placement', heading: 'Placement' },
]

function valuesFromDocRow(heading: string): readonly string[] {
	// Match the table row whose first cell contains the bolded heading.
	const rowRegex = new RegExp(`\\|\\s*\\*\\*${heading}\\*\\*[^|]*\\|([^|]+)\\|`, 'i')
	const match = modifiersDoc.match(rowRegex)
	if (!match || !match[1]) return []
	// Drop parenthesized exclusion text — patterns like "(no `.medium` —
	// bare element is medium)" embed disqualified names that aren't actual
	// shipped values. Treat anything inside parens as commentary.
	const cell = match[1].replace(/\([^)]*\)/g, '')
	// Extract backtick-quoted `.{name}` values from what remains.
	const valueRegex = /`\.([a-z][a-z0-9-]*)`/g
	const out: string[] = []
	let m: RegExpExecArray | null
	while ((m = valueRegex.exec(cell)) !== null) {
		if (m[1]) out.push(m[1])
	}
	return out
}

describe('docs — guides/modifiers.md §1 lists the same values as modifiers.ts', () => {
	for (const dimension of DIMENSIONS) {
		const shippedValues = Object.values(modifiers[dimension.key])

		it(`${dimension.heading}: doc names every shipped value`, () => {
			const docValues = valuesFromDocRow(dimension.heading)
			for (const value of shippedValues) {
				expect(
					docValues,
					`'${value}' is shipped in modifiers.${dimension.key} but not listed in modifiers.md §1`,
				).toContain(value)
			}
		})

		it(`${dimension.heading}: doc lists no values that aren't shipped`, () => {
			const docValues = valuesFromDocRow(dimension.heading)
			const shipped: ReadonlySet<string> = new Set(shippedValues)
			const orphans = docValues.filter((value) => !shipped.has(value))
			expect(
				orphans,
				`modifiers.md §1 lists ${dimension.key} values that aren't in modifiers.ts: ${orphans.join(', ')}`,
			).toEqual([])
		})
	}
})
