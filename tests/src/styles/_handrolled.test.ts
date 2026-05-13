// ============================================================================
//  Hand-rolled-variant detector.
//
//  Per the modifiers.md anti-rule and AGENTS.md §1.5, modifier classes set
//  context tokens; elements consume them via fallback chains. Hand-rolling
//  `.foo.primary { ... } .foo.secondary { ... } ...` for every variant in a
//  non-modifier partial is the canonical drift signal — it duplicates work
//  the cascade already does and forces every new variant addition to touch
//  every consumer. The `palette-each` mixin in `_mixins.scss` exists
//  specifically to eliminate this pattern.
//
//  This test scans every SCSS file outside `src/styles/modifiers/` and fails
//  when three or more compound `.X.{variant}` rules appear in the same file
//  for variants in the shipped variant vocabulary. Three is the threshold
//  because two compound rules are sometimes legitimate (e.g. a "filled bg
//  for primary, transparent for secondary" pair), but three signals a
//  systematic enumeration that should use `palette-each`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'

const sources = import.meta.glob(
	'../../../src/styles/{elements,components,surfaces,composables}/_*.scss',
	{
		query: '?raw',
		import: 'default',
		eager: true,
	},
) as Record<string, string>

const variantNames: readonly string[] = Object.values(modifiers.variant)

/**
 * Count compound selectors of the form `<something>.<variant>` in a single
 * file. Match shape: a class selector immediately followed (no whitespace)
 * by a variant class. We deliberately match against the start of a rule —
 * `\.foo\.primary\s*{` — so token references inside `var()` chains aren't
 * counted.
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
	for (const [path, source] of Object.entries(sources)) {
		const filename = path.replace(/^.*\/src\/styles\//, 'src/styles/')

		it(`${filename} does not hand-roll three or more variant rules`, () => {
			const counts = countCompoundRules(source)
			expect(
				counts.size,
				`${filename} declares compound rules for ${counts.size} variants ` +
					`(${Array.from(counts.keys()).join(', ')}). ` +
					`Use @include palette-each from src/styles/_mixins.scss instead.`,
			).toBeLessThan(3)
		})
	}
})
