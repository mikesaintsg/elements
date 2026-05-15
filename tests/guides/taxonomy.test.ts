// ============================================================================
//  guides/taxonomy.md ↔ src/browser/taxonomy.ts ↔ src/styles/
//
//  The taxonomy is the framework's catalog of native HTML elements with
//  their framework treatment. Five contracts hold across guide / TS /
//  SCSS / factories:
//
//    1. TS SHAPE        — every taxonomy entry has `tag/category/treatment`
//                          and `composable` is non-null iff `treatment ===
//                          'composable'`. Pre-computed indices
//                          (`TAXONOMY_BY_TAG`, `SUBSTANTIVE_TAGS`,
//                          `COMPOSABLE_TAGS`, etc.) stay in sync.
//    2. PARTIAL PARITY  — every taxonomy tag has a
//                          `src/styles/elements/_{tag}.scss` partial (even
//                          passthroughs ship a comment-only stub) and
//                          vice versa.
//    3. TOKEN COVERAGE  — substantive + composable treatments declare at
//                          least one `--set-{tag}-*` token in elements/ or
//                          components/.
//    4. FACTORY PAIRING — composable entries reference a real
//                          `src/browser/factories/create{Name}.ts`.
//    5. TOKEN_GROUPS    — every member of every logical group (form-control,
//                          page-shell, card-region, …) declares every
//                          required token suffix. Documented in
//                          taxonomy.md § "Token groups".
//
//  Pure node — TS data + raw SCSS via node:fs.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	COMPONENT_CONTRACTS,
	COMPOSABLE_TAGS,
	MODIFIABLE_TAGS,
	PASSTHROUGH_TAGS,
	RESET_TAGS,
	SUBSTANTIVE_TAGS,
	TAXONOMY_BY_TAG,
	TOKEN_GROUPS,
	describeTag,
	elements,
	groupsForTag,
	isComposable,
	isKnownTag,
	isModifiable,
	isPassthrough,
	isReset,
	isSubstantive,
	taxonomy,
	type TokenGroup,
} from '@elements/browser'
import { declaresElementToken, tagFromPath } from '../setup'
import { readFactorySources, readScssPartials } from '../setupServer'

const elementSources = readScssPartials('src/styles/elements')
const componentSources = readScssPartials('src/styles/components')
const factorySources = readFactorySources()

const elementsByTag: ReadonlyMap<string, string> = new Map(
	Object.entries(elementSources).map(([path, source]) => [tagFromPath(path), source]),
)

const componentsByTag: ReadonlyMap<string, string> = new Map(
	Object.entries(componentSources).map(([path, source]) => [tagFromPath(path), source]),
)

const factoryNames: ReadonlySet<string> = new Set(
	Object.keys(factorySources).map((p) => {
		const match = p.match(/(create[A-Z][A-Za-z]+)\.ts$/)
		return match?.[1] ?? ''
	}),
)

// ── 1. TS shape ────────────────────────────────────────────────────────────

describe('taxonomy.ts — shape', () => {
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
		// Stray factory keys on non-composable rows (or missing keys on
		// composable rows) surface here as readable strings.
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

describe('taxonomy.ts — pre-computed indices stay in sync', () => {
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
		const total =
			SUBSTANTIVE_TAGS.size + COMPOSABLE_TAGS.size + RESET_TAGS.size + PASSTHROUGH_TAGS.size
		expect(total).toBe(taxonomy.length)
		expect(MODIFIABLE_TAGS.size).toBe(SUBSTANTIVE_TAGS.size + COMPOSABLE_TAGS.size)
	})
})

describe('taxonomy.ts — predicate getters', () => {
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

// ── 2. Partial parity (SCSS ↔ taxonomy) ────────────────────────────────────

describe('taxonomy — every entry has a matching elements partial', () => {
	for (const entry of taxonomy) {
		it(`_${entry.tag}.scss exists`, () => {
			expect(elementsByTag.has(entry.tag)).toBe(true)
		})
	}
})

describe('taxonomy — every elements partial is enumerated', () => {
	for (const tag of elementsByTag.keys()) {
		it(`taxonomy entry exists for _${tag}.scss`, () => {
			expect(TAXONOMY_BY_TAG.has(tag)).toBe(true)
		})
	}
})

// ── 3. Token coverage (substantive + composable) ───────────────────────────

describe('taxonomy — substantive + composable entries declare --set-{tag}-* tokens', () => {
	for (const entry of taxonomy) {
		if (entry.treatment !== 'substantive' && entry.treatment !== 'composable') continue

		it(`${entry.tag} (${entry.treatment}) declares --set-${entry.tag}-* somewhere in src/styles/`, () => {
			const elementSource = elementsByTag.get(entry.tag) ?? ''
			const componentSource = componentsByTag.get(entry.tag) ?? ''
			const declared =
				declaresElementToken(elementSource, entry.tag) ||
				declaresElementToken(componentSource, entry.tag)
			expect(declared).toBe(true)
		})
	}
})

// ── 4. Factory pairing ─────────────────────────────────────────────────────

describe('taxonomy — composable entries reference a real factory', () => {
	for (const entry of taxonomy) {
		if (entry.treatment !== 'composable') continue
		if (!entry.composable) continue

		const factoryName = entry.composable.replace(/^use/, 'create')

		it(`${entry.tag}'s composable ${entry.composable} has factory ${factoryName}.ts`, () => {
			expect(factoryNames.has(factoryName)).toBe(true)
		})
	}
})

// ── 5. elements.ts ⊆ substantive + composable ──────────────────────────────

describe('taxonomy — elements.ts entries are substantive or composable', () => {
	for (const tag of Object.keys(elements)) {
		it(`${tag} (in elements.ts) is enumerated as substantive or composable in taxonomy`, () => {
			const entry = TAXONOMY_BY_TAG.get(tag)
			expect(entry).toBeDefined()
			expect(isSubstantive(tag) || isComposable(tag)).toBe(true)
		})
	}
})

// ── 6. TOKEN_GROUPS (token uniformity within logical groups) ───────────────
//
// The customizability contract: elements in the same logical group MUST
// expose the same minimum token surface. A consumer who wants to retune
// "every form control" can do so by overriding one token per member; if
// `<input>` ships `--set-input-color` but `<select>` does not, that
// contract breaks silently.
//
// Class-component group members are framework class names (e.g. `.badge`)
// carried by neutral HTML wrappers — they aren't HTML tags, so `isKnownTag`
// returns false. They appear as keys in `COMPONENT_CONTRACTS`.

const CLASS_COMPONENT_NAMES: ReadonlySet<string> = new Set(Object.keys(COMPONENT_CONTRACTS))

// Per-tag SCSS source list combining elements/ + components/. A token may
// be declared in either folder (e.g. `<article>` baseline lives in
// `components/_article.scss` rather than `elements/_article.scss`); the
// group-uniformity check looks at both.
const groupSources: ReadonlyMap<string, readonly string[]> = (() => {
	const map = new Map<string, string[]>()
	for (const [tag, source] of elementsByTag) {
		map.set(tag, [...(map.get(tag) ?? []), source])
	}
	for (const [tag, source] of componentsByTag) {
		map.set(tag, [...(map.get(tag) ?? []), source])
	}
	return map
})()

function declaresSuffix(member: string, suffix: string): boolean {
	const list = groupSources.get(member) ?? []
	const regex = new RegExp(`--set-${member}-${suffix.replace(/-/g, '\\-')}\\s*:`)
	return list.some((source) => regex.test(source))
}

describe('TOKEN_GROUPS — every group member is a known taxonomy tag or class-component', () => {
	it('all members resolve to either a known tag or a class-component', () => {
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

	it('groupsForTag is consistent with TOKEN_GROUPS', () => {
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

describe('TOKEN_GROUPS — every group member declares the required tokens', () => {
	for (const [name, definition] of Object.entries(TOKEN_GROUPS) as readonly [
		TokenGroup,
		(typeof TOKEN_GROUPS)[TokenGroup],
	][]) {
		describe(`${name} group`, () => {
			for (const member of definition.members) {
				for (const suffix of definition.required) {
					// On failure: `${member}` is in the `${name}` group but does not declare
					// --set-${member}-${suffix}. See `src/browser/taxonomy.ts` § TOKEN_GROUPS
					// for the group contract.
					it(`${member} declares --set-${member}-${suffix}`, () => {
						expect(declaresSuffix(member, suffix)).toBe(true)
					})
				}
			}
		})
	}
})
