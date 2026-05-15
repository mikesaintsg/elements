// ============================================================================
//  Modifier-dimension token contracts.
//
//  Every modifier class in a dimension MUST declare the dimension's full
//  required context-token set, as documented in
//  `src/browser/patterns.ts § MODIFIER_DIMENSION_TOKENS`. This test
//  enforces the contract: if a `.{variant}` class drops one of the eight
//  required `--set-variant-*` tokens, every element consuming the
//  fallback chain silently degrades.
//
//  Three dimensions are subject to coverage checks today:
//
//    - variant — 8 tokens per class (FILLED + SUBTLE + ON-CANVAS tiers)
//    - size    — 4 tokens per class (padding-* / font-size / border-radius)
//    - style   — 4 tokens per class (color / bg / border-* tier rewrite)
//
//  State and placement dimensions emit direct CSS properties instead of
//  context tokens; coverage = 0 by design.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { MODIFIER_DIMENSION_TOKENS } from '@elements/browser'
import { declaresToken, stripComments } from '../../../setup'

import variantsScss from '../../../../src/styles/modifiers/_variants.scss?raw'
import sizesScss from '../../../../src/styles/modifiers/_sizes.scss?raw'
import stylesScss from '../../../../src/styles/modifiers/_styles.scss?raw'
import statesScss from '../../../../src/styles/modifiers/_states.scss?raw'
import placementsScss from '../../../../src/styles/modifiers/_placements.scss?raw'

const dimensionSources: Readonly<Record<string, string>> = {
	variant: variantsScss,
	size: sizesScss,
	style: stylesScss,
	state: statesScss,
	placement: placementsScss,
}

/**
 * Find the rule body for a specific class name within a SCSS source.
 * Returns the text between `{ … }` after `.{name}`, or empty string if
 * the class is absent. Handles `.{name} {` and `.{name}, .{other} {`
 * by matching the line containing the name.
 */
function ruleBodyFor(className: string, source: string): string {
	const stripped = stripComments(source)
	// Match `.{name}` followed by `{ … }`. Handles single-class rules.
	// Multi-class compound rules like `.{name} .{other}` would have
	// shared body — those aren't expected in dimension partials (each
	// modifier class gets its own rule).
	const pattern = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 'g')
	const match = pattern.exec(stripped)
	return match?.[1] ?? ''
}

// ── Per-class token coverage ───────────────────────────────────────────────

for (const [dimension, contract] of Object.entries(MODIFIER_DIMENSION_TOKENS)) {
	const source = dimensionSources[dimension]
	if (source === undefined) continue

	describe(`dimensions — ${dimension} classes declare every required --set-${dimension}-* token`, () => {
		// Dimensions with zero required tokens (state, placement) emit direct CSS
		// properties only — the per-class loop below is a no-op for them.
		it(`${dimension} dimension shape is consistent with MODIFIER_DIMENSION_TOKENS`, () => {
			expect(Array.isArray(contract.tokens.required)).toBe(true)
		})

		for (const className of contract.classes) {
			const body = ruleBodyFor(className, source)

			for (const suffix of contract.tokens.required) {
				// Rationale on failure: `.${className}` in modifiers/_${dimension}s.scss
				// is missing --set-${dimension}-${suffix}. See MODIFIER_DIMENSION_TOKENS
				// in src/browser/patterns.ts for the contract.
				it(`.${className} declares --set-${dimension}-${suffix}`, () => {
					expect(declaresToken(body, dimension, suffix)).toBe(true)
				})
			}
		}
	})
}

// ── Shape assertions ───────────────────────────────────────────────────────

describe('dimensions — MODIFIER_DIMENSION_TOKENS shape', () => {
	it('declares one contract per documented dimension', () => {
		expect(Object.keys(MODIFIER_DIMENSION_TOKENS).sort()).toEqual([
			'placement',
			'size',
			'state',
			'style',
			'variant',
		])
	})

	it('every contract carries classes and required-tokens arrays', () => {
		for (const contract of Object.values(MODIFIER_DIMENSION_TOKENS)) {
			expect(Array.isArray(contract.classes)).toBe(true)
			expect(Array.isArray(contract.tokens.required)).toBe(true)
			expect(contract.rationale.length).toBeGreaterThan(20)
		}
	})

	it('every class name is single-word and lowercase / kebab-case', () => {
		for (const contract of Object.values(MODIFIER_DIMENSION_TOKENS)) {
			for (const className of contract.classes) {
				expect(className).toMatch(/^[a-z][a-z0-9-]*$/)
			}
		}
	})

	it('every required-token suffix is kebab-case', () => {
		for (const contract of Object.values(MODIFIER_DIMENSION_TOKENS)) {
			for (const suffix of contract.tokens.required) {
				expect(suffix).toMatch(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/)
			}
		}
	})
})
