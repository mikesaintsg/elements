// ============================================================================
//  guides/elements.md ↔ src/browser/{elements,taxonomy}.ts ↔ src/styles/
//
//  The element surface has multiple layers; this test drives parity across
//  every one of them so a change to any layer immediately surfaces drift:
//
//    1. SHAPE             — `elements.ts` is a frozen key=value mirror; the
//                            `Element` type narrows to the union of values.
//    2. TS → SCSS         — every key in `elements` has an `_{tag}.scss`
//                            partial that declares at least one
//                            `--set-{tag}-*` token.
//    3. SCSS → TS         — every `_{tag}.scss` that declares a
//                            `--set-{tag}-*` token appears in `elements`.
//    4. TAXONOMY SHAPE    — every taxonomy entry carries tag/category/treatment
//                            and `composable` is non-null iff treatment ===
//                            'composable'; pre-computed indices stay in sync.
//    5. PARTIAL PARITY    — every taxonomy tag has a matching
//                            `src/styles/elements/_{tag}.scss` partial and
//                            vice versa.
//    6. TOKEN COVERAGE    — substantive + composable treatments declare at
//                            least one `--set-{tag}-*` token in elements/ or
//                            components/.
//    7. FACTORY PAIRING   — composable entries reference a real
//                            `src/browser/factories/create{Name}.ts`.
//    8. TOKEN GROUPS      — every member of every logical group declares every
//                            required token suffix (guides/elements.md § 10).
//
//  Pure node — TS data + raw SCSS via `tests/setupServer.ts`.
// ============================================================================

import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
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
	type Element,
	type TokenGroup,
} from '@elements/browser'
import { declaresElementToken, tagFromPath } from '../setup'
import { readFactorySources, readScssPartials } from '../setupServer'

const TEST_FILE_DIR = fileURLToPath(new URL('.', import.meta.url))
const WORKSPACE_ROOT = resolvePath(TEST_FILE_DIR, '../..')
const elementsDoc = readFileSync(resolvePath(WORKSPACE_ROOT, 'guides/elements.md'), 'utf8')

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

// ── 1. elements.ts — shape ──────────────────────────────────────────────────

describe('elements.ts — shape', () => {
	it('exposes at least one substantive element', () => {
		expect(Object.keys(elements).length).toBeGreaterThan(0)
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

// ── 2. TS → SCSS ────────────────────────────────────────────────────────────

describe('TS → SCSS: every TS element key has a substantive partial', () => {
	const TS_KEYS = Object.keys(elements)

	it.each(TS_KEYS)('%s has a partial that declares --set-%s-* tokens', (tag) => {
		const entry = Object.entries(elementSources).find(([path]) => tagFromPath(path) === tag)
		expect(entry).toBeDefined()
		const source = entry?.[1] ?? ''
		expect(declaresElementToken(source, tag)).toBe(true)
	})
})

// ── 3. SCSS → TS ────────────────────────────────────────────────────────────

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

// ── 4. taxonomy.ts — shape ──────────────────────────────────────────────────

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

// ── 5. Partial parity (SCSS ↔ taxonomy) ─────────────────────────────────────

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

// ── 6. Token coverage (substantive + composable) ────────────────────────────

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

// ── 7. Factory pairing ──────────────────────────────────────────────────────

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

// ── elements.ts ⊆ substantive + composable ──────────────────────────────────

describe('taxonomy — elements.ts entries are substantive or composable', () => {
	for (const tag of Object.keys(elements)) {
		it(`${tag} (in elements.ts) is enumerated as substantive or composable in taxonomy`, () => {
			const entry = TAXONOMY_BY_TAG.get(tag)
			expect(entry).toBeDefined()
			expect(isSubstantive(tag) || isComposable(tag)).toBe(true)
		})
	}
})

// ── 8. TOKEN_GROUPS (token uniformity within logical groups) ────────────────
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

// ── 9. elements.md markdown table parity ────────────────────────────────────
//
// Every TS-enumerated element (`elements` object) must appear as a row in
// `guides/elements.md`. The doc references tags either as `<tag>` (most rows)
// or `<h1>`–`<h6>` (the heading family). A change to `elements.ts` that
// ships a tag without a matching doc entry breaks the framework's
// "guide is the spec" claim.

function isMentionedInDoc(tag: string): boolean {
	// Match `<tag>` (most common), `<tag` (start of e.g. `<table>`), or
	// the heading-family shorthand `<h1>`–`<h6>` for h1..h6.
	if (/^h[1-6]$/.test(tag)) return /<h1>\s*[–-]\s*<h6>|<h1>.+<h6>/.test(elementsDoc)
	const escaped = tag.replace(/-/g, '\\-')
	return new RegExp(`<${escaped}\\b`).test(elementsDoc)
}

describe('elements.md — every TS element key has a doc entry', () => {
	for (const tag of Object.keys(elements)) {
		// On failure: `elements.${tag}` ships but the tag is not referenced
		// in `guides/elements.md`. Add a row to one of the §4–§9 tables
		// (Substantive / Override / Reference catalog) describing the
		// framework's treatment of `<${tag}>`.
		it(`<${tag}> appears in guides/elements.md`, () => {
			expect(isMentionedInDoc(tag)).toBe(true)
		})
	}
})

describe('elements.md — every taxonomy substantive/composable tag has a doc entry', () => {
	for (const entry of taxonomy) {
		if (entry.treatment !== 'substantive' && entry.treatment !== 'composable') continue
		// On failure: `${entry.tag}` is in the taxonomy as ${entry.treatment}
		// but `guides/elements.md` does not mention `<${entry.tag}>`.
		it(`<${entry.tag}> (${entry.treatment}) appears in guides/elements.md`, () => {
			expect(isMentionedInDoc(entry.tag)).toBe(true)
		})
	}
})
