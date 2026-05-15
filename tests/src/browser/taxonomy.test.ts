// ============================================================================
//  Taxonomy surface — TS shape + bidirectional invariants.
//
//  Three contracts at the TypeScript level:
//
//    1. Shape — every taxonomy entry has a tag, a category, a treatment, and
//       a composable that is non-null exactly when treatment === 'composable'.
//
//    2. Coverage — every tag in elements.ts (substantive baselines living in
//       elements/_*.scss) is also enumerated in taxonomy with treatment
//       'substantive' or 'composable'.
//
//    3. Indices — the pre-computed lookups (TAXONOMY_BY_TAG, SUBSTANTIVE_TAGS,
//       COMPOSABLE_TAGS, etc.) stay in sync with the source array.
//
//  The cross-file SCSS↔TS parity for taxonomy lives in
//  tests/src/styles/taxonomy.test.ts. This file's job is the TS-side
//  invariants only.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	elements,
	taxonomy,
	TAXONOMY_BY_TAG,
	SUBSTANTIVE_TAGS,
	COMPOSABLE_TAGS,
	RESET_TAGS,
	PASSTHROUGH_TAGS,
	MODIFIABLE_TAGS,
	TOKEN_GROUPS,
	COMPONENT_CONTRACTS,
	groupsForTag,
	isKnownTag,
	isSubstantive,
	isComposable,
	isReset,
	isPassthrough,
	isModifiable,
	describeTag,
	type TokenGroup,
} from '@elements/browser'

// ── 1. Shape ───────────────────────────────────────────────────────────────

describe('taxonomy — shape', () => {
	it('has at least one entry', () => {
		expect(taxonomy.length).toBeGreaterThan(0)
	})

	it('every entry has tag / category / treatment', () => {
		for (const entry of taxonomy) {
			expect(entry.tag).toMatch(/^[a-z][a-z0-9-]*$/)
			expect(entry.category).toBeTruthy()
			expect(entry.treatment).toBeTruthy()
		}
	})

	it('composable field is non-null iff treatment === composable', () => {
		// Stray factory keys on non-composable rows (or missing keys on composable rows)
		// surface here as `${tag}:${treatment}:${composable === null}` strings.
		const offenders = taxonomy
			.filter((entry) => (entry.treatment === 'composable') !== (entry.composable !== null))
			.map((entry) => `${entry.tag} (${entry.treatment}) → composable=${entry.composable}`)
		expect(offenders).toEqual([])
	})

	it('every tag appears exactly once', () => {
		const seen = new Set<string>()
		const dupes: string[] = []
		for (const entry of taxonomy) {
			if (seen.has(entry.tag)) dupes.push(entry.tag)
			seen.add(entry.tag)
		}
		expect(dupes).toEqual([])
	})
})

// ── 2. Indices ─────────────────────────────────────────────────────────────

describe('taxonomy — pre-computed indices stay in sync', () => {
	it('TAXONOMY_BY_TAG matches the source array', () => {
		expect(TAXONOMY_BY_TAG.size).toBe(taxonomy.length)
		for (const entry of taxonomy) {
			expect(TAXONOMY_BY_TAG.get(entry.tag)).toBe(entry)
		}
	})

	it('SUBSTANTIVE_TAGS mirrors treatment === substantive', () => {
		for (const entry of taxonomy) {
			expect(SUBSTANTIVE_TAGS.has(entry.tag)).toBe(entry.treatment === 'substantive')
		}
	})

	it('COMPOSABLE_TAGS mirrors treatment === composable', () => {
		for (const entry of taxonomy) {
			expect(COMPOSABLE_TAGS.has(entry.tag)).toBe(entry.treatment === 'composable')
		}
	})

	it('RESET_TAGS, PASSTHROUGH_TAGS, MODIFIABLE_TAGS partition correctly', () => {
		const allFour =
			SUBSTANTIVE_TAGS.size + COMPOSABLE_TAGS.size + RESET_TAGS.size + PASSTHROUGH_TAGS.size
		expect(allFour).toBe(taxonomy.length)
		expect(MODIFIABLE_TAGS.size).toBe(SUBSTANTIVE_TAGS.size + COMPOSABLE_TAGS.size)
	})
})

// ── 3. Predicates ──────────────────────────────────────────────────────────

describe('taxonomy — predicate getters', () => {
	it('isKnownTag returns true for every entry, false for unknown', () => {
		for (const entry of taxonomy) expect(isKnownTag(entry.tag)).toBe(true)
		expect(isKnownTag('zzzzzz-not-a-tag')).toBe(false)
	})

	it('isSubstantive / isComposable / isReset / isPassthrough mirror treatment', () => {
		for (const entry of taxonomy) {
			expect(isSubstantive(entry.tag)).toBe(entry.treatment === 'substantive')
			expect(isComposable(entry.tag)).toBe(entry.treatment === 'composable')
			expect(isReset(entry.tag)).toBe(entry.treatment === 'reset')
			expect(isPassthrough(entry.tag)).toBe(entry.treatment === 'passthrough')
		}
	})

	it('isModifiable === substantive OR composable', () => {
		for (const entry of taxonomy) {
			expect(isModifiable(entry.tag)).toBe(
				entry.treatment === 'substantive' || entry.treatment === 'composable',
			)
		}
	})

	it('describeTag returns the entry for known tags, null for unknown', () => {
		for (const entry of taxonomy) expect(describeTag(entry.tag)).toBe(entry)
		expect(describeTag('zzzzzz-not-a-tag')).toBe(null)
	})
})

// ── 4. Coverage of elements.ts ─────────────────────────────────────────────

describe('taxonomy — elements.ts is a subset of substantive + composable', () => {
	for (const tag of Object.keys(elements)) {
		// h1-h6 is enumerated under that exact key in both registries.
		it(`${tag} appears in taxonomy as substantive or composable`, () => {
			const entry = TAXONOMY_BY_TAG.get(tag)
			expect(entry).toBeDefined()
			expect(entry?.treatment === 'substantive' || entry?.treatment === 'composable').toBe(true)
		})
	}
})

// ── 5. Token groups ────────────────────────────────────────────────────────

// Class-component group members are framework class names (e.g. `.badge`,
// `.tag`) carried by neutral HTML wrappers (`<span>`). They aren't HTML
// tags so `isKnownTag` returns false, but they're legitimate framework
// symbols enumerated as keys in `COMPONENT_CONTRACTS`. Accept either
// source.
const CLASS_COMPONENT_NAMES: ReadonlySet<string> = new Set(Object.keys(COMPONENT_CONTRACTS))

describe('taxonomy — TOKEN_GROUPS', () => {
	it('every group member is a known taxonomy tag or class-component', () => {
		const offenders: string[] = []
		for (const [name, definition] of Object.entries(TOKEN_GROUPS) as readonly [
			TokenGroup,
			(typeof TOKEN_GROUPS)[TokenGroup],
		][]) {
			for (const member of definition.members) {
				if (!(isKnownTag(member) || CLASS_COMPONENT_NAMES.has(member))) {
					offenders.push(`${name}.${member}`)
				}
			}
		}
		expect(offenders).toEqual([])
	})

	it('every required suffix is a kebab-case CSS-property segment', () => {
		const segmentRegex = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/
		for (const definition of Object.values(TOKEN_GROUPS)) {
			for (const suffix of definition.required) {
				expect(suffix).toMatch(segmentRegex)
			}
		}
	})

	it('GROUPS_BY_TAG is consistent with TOKEN_GROUPS', () => {
		for (const [name, definition] of Object.entries(TOKEN_GROUPS) as readonly [
			TokenGroup,
			(typeof TOKEN_GROUPS)[TokenGroup],
		][]) {
			for (const member of definition.members) {
				expect(groupsForTag(member)).toContain(name)
			}
		}
	})
})
