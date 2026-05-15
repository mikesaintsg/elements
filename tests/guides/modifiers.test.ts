// ============================================================================
//  guides/modifiers.md ↔ src/browser/modifiers.ts ↔ src/styles/
//
//  Three contracts the modifiers guide hardcodes:
//
//    1. DOC ↔ TS PARITY — guides/modifiers.md §1 lists the five
//       dimensions and the values shipped in each. modifiers.ts is the
//       authoritative source; every shipped value MUST be listed in the
//       doc and vice versa.
//
//    2. CLASS ISOLATION — cross-cutting modifier classes (the five
//       dimensions) MUST only be declared as bare rules inside
//       `src/styles/modifiers/`. A bare `.row` rule in
//       `components/_form.scss` violates the cascade contract.
//       Element-local modifiers (`form.row`) live in
//       `modifiers/_local.scss` and use the compound form.
//
//    3. NO HAND-ROLLED VARIANTS — modifier classes set context tokens;
//       elements consume them via fallback chains. Hand-rolling
//       `.foo.primary { … } .foo.secondary { … } …` for every variant
//       in a non-modifier partial is the canonical drift signal —
//       `@include palette-each` (from `_mixins.scss`) exists exactly to
//       eliminate this pattern. Three+ compound `.X.{variant}` rules
//       in one non-modifier file fails the test.
//
//  Plus: no modifier name may collide with a Tailwind single-token
//  utility (Tailwind wins on cascade-layer ordering, silently shadowing
//  the framework rule).
//
//  Pure node — md via `?raw`, SCSS via `node:fs`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'
import {
	TAILWIND_SINGLE_TOKEN_UTILITIES,
	bareClassNamesIn,
	extractBacktickedNames,
	leaves,
	relativeStylesPath,
	tableCellFor,
} from '../setup'
import { readScssPartials } from '../setupServer'
import modifiersDoc from '../../guides/modifiers.md?raw'

// ── 1. Doc ↔ TS parity ─────────────────────────────────────────────────────

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

// ── 2. Class isolation (modifier names only declared in modifiers/) ───────

const MODIFIER_NAMES = new Set(leaves(modifiers))
const TAILWIND_NAMES = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

const isolationSources = readScssPartials(
	'src/styles/elements',
	'src/styles/components',
	'src/styles/surfaces',
	'src/styles/composables',
)

// Compound selectors (`form.row`, `button.dropdown`) are excluded by
// `bareClassNamesIn` — those are element-local modifiers and have their
// own home (`modifiers/_local.scss`).

describe('isolation — modifier-vocabulary class rules only live in modifiers/', () => {
	for (const [path, source] of Object.entries(isolationSources)) {
		const filename = relativeStylesPath(path)

		// On failure: the `offenders` array prints the modifier-name rules
		// declared bare outside modifiers/. Either move the rule to
		// `src/styles/modifiers/`, or scope it to an element
		// (`{tag}.{name}`) and place it in `modifiers/_local.scss`.
		it(`${filename} does not declare a bare .{modifier-name} rule`, () => {
			const offenders = bareClassNamesIn(source).filter((name) => MODIFIER_NAMES.has(name))
			expect(offenders).toEqual([])
		})
	}
})

describe('isolation — no framework class collides with a Tailwind single-token utility', () => {
	// On failure: the named modifier values collide with Tailwind utilities
	// (Tailwind wins cascade-layer ordering and silently shadows). Rename
	// the framework modifier to a non-colliding name.
	it('every modifier name avoids the Tailwind utility set', () => {
		const collisions = Array.from(MODIFIER_NAMES).filter((name) => TAILWIND_NAMES.has(name))
		expect(collisions).toEqual([])
	})
})

// ── 3. No hand-rolled variant enumeration outside modifiers/ ──────────────

const variantNames: readonly string[] = Object.values(modifiers.variant)

/**
 * Count compound selectors of the form `<something>.<variant>` in a single
 * file. Match shape: a class selector immediately followed (no whitespace)
 * by a variant class — `\.foo\.primary\s*{` — so token references inside
 * `var()` chains aren't counted.
 */
function countCompoundRules(source: string): Map<string, number> {
	const counts = new Map<string, number>()
	for (const variant of variantNames) {
		const regex = new RegExp(`[a-z][a-z0-9-]*\\.${variant}\\s*\\{`, 'gi')
		const matches = source.match(regex)
		if (matches && matches.length > 0) counts.set(variant, matches.length)
	}
	return counts
}

describe('handrolled — no manual variant enumeration outside modifiers/', () => {
	for (const [path, source] of Object.entries(isolationSources)) {
		const filename = relativeStylesPath(path)

		// On failure: the test prints the variant names hand-rolled in this
		// file. Use `@include palette-each` from `src/styles/_mixins.scss`
		// instead. Three+ compound `.X.{variant}` rules signal systematic
		// enumeration that the mixin handles.
		it(`${filename} does not hand-roll three or more variant rules`, () => {
			const variants = Array.from(countCompoundRules(source).keys())
			const offenders = variants.length >= 3 ? variants : []
			expect(offenders).toEqual([])
		})
	}
})
