// ============================================================================
//  guides/modifiers.md ↔ src/browser/modifiers.ts parity.
//
//  guides/modifiers.md §1 lists the five modifier dimensions and the values
//  shipped in each. The TS surface in `src/browser/modifiers.ts` is the
//  authoritative source. This test parses §1's table out of the markdown
//  and asserts bidirectional parity:
//
//    - Every value shipped in `modifiers.{dim}` is listed in the doc.
//    - Every value listed in the doc is shipped in `modifiers.{dim}`.
//
//  Parses with the centralized `tableCellFor` + `extractBacktickedNames`
//  helpers from `tests/setup.ts`. Parenthesized commentary
//  (e.g. "no `.medium` — bare element is medium") is stripped before
//  identifier extraction so disqualified mentions don't show up as
//  documented values.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'
import { extractBacktickedNames, tableCellFor } from '../setup'
import modifiersDoc from '../../guides/modifiers.md?raw'

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

function docValuesFor(heading: string): readonly string[] {
	return extractBacktickedNames(tableCellFor(modifiersDoc, heading), { prefix: '.' })
}

describe('guides/modifiers.md §1 lists the same values as modifiers.ts', () => {
	for (const dimension of DIMENSIONS) {
		const shippedValues = Object.values(modifiers[dimension.key])

		// On failure: a value lives in modifiers.{dim} but isn't named in
		// guides/modifiers.md §1. Either add it to the doc or remove it
		// from the TS surface.
		it(`${dimension.heading}: doc names every shipped value`, () => {
			const docValues = new Set(docValuesFor(dimension.heading))
			const missing = shippedValues.filter((value) => !docValues.has(value))
			expect(missing).toEqual([])
		})

		// On failure: the doc lists a value that isn't shipped. Either ship
		// it or remove the doc entry.
		it(`${dimension.heading}: doc lists no values that aren't shipped`, () => {
			const shipped: ReadonlySet<string> = new Set(shippedValues)
			const orphans = docValuesFor(dimension.heading).filter((value) => !shipped.has(value))
			expect(orphans).toEqual([])
		})
	}
})
