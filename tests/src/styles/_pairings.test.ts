// ============================================================================
//  Structural pairings — `parent > child` element-pair allowlist.
//
//  A rule that combines two bare tag names with a child combinator
//  blesses one HTML element as the structural marker for its role inside
//  a container. Some pairings are unavoidable per HTML spec (`tr > td`,
//  `details > summary`); some are documented framework slots
//  (`article > header:first-child` for the card band). But many candidate
//  pairings are element-hardcoding inside containment — singling out one
//  element type to drive chrome inside an otherwise-generic container.
//
//  The previous audit caught and removed `body:has(main) > nav > search`
//  on that basis: `<search>` was one of many elements that could be
//  pinned in a docs-sidebar rail; baking the framework rule against it
//  forced every consumer to use exactly `<search>`. The rule was moved
//  to the showcase's wrapper-class composition.
//
//  This test enforces the allowlist for every `parent > child` pair
//  appearing in compiled framework selectors. New pairings must be
//  added to `STRUCTURAL_PAIRINGS` in `src/browser/patterns.ts` with a
//  reason, OR refactored to a wrapper class / element baseline that
//  doesn't hardcode the child element.
//
//  See `guides/patterns.md` § "Structural pairings" for the rationale
//  and the four reason categories (`spec`, `slot`, `reset`, `context`).
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	extractTagPairs,
	isAllowedTagPair,
	pairingFor,
	STRUCTURAL_PAIRINGS,
} from '@elements/browser'

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

const sources = import.meta.glob(
	'../../../src/styles/{elements,modifiers,surfaces,components,composables}/_*.scss',
	{ query: '?raw', import: 'default', eager: true },
) as Record<string, string>

// ── Rule opener extraction (selector text from each rule, in source-order) ──
//
// Mirrors `_scope.test.ts`'s opener extractor: collect every non-at-rule
// line ending with `{`, joining multi-line selectors. Skip nested-Sass
// rules starting with `&` — those qualify their parent and are unioned
// with the parent's selector at compile time; testing only top-level
// rules covers all pair shapes that the cascade ever sees.

function extractRuleOpeners(source: string): readonly string[] {
	const stripped = stripComments(source)
	const out: string[] = []
	const lines = stripped.split('\n')
	let buffer: string[] = []
	for (const line of lines) {
		const trimmed = line.trim()
		if (trimmed.length === 0) {
			if (buffer.length === 0) continue
			continue
		}
		buffer.push(trimmed)
		if (trimmed.endsWith('{')) {
			const text = buffer
				.join(' ')
				.replace(/\s*\{\s*$/, '')
				.trim()
			buffer = []
			if (text.startsWith('@')) continue // at-rule
			if (text.length === 0) continue
			if (text.startsWith('&')) continue // nested Sass — qualifies parent
			out.push(text)
		} else if (trimmed.endsWith(';') || trimmed.endsWith('}')) {
			buffer = []
		}
	}
	return out
}

// ── Test: every (parent, child) tag pair must be on the allowlist ──────────
//
// Each SCSS partial gets its own `it()` block so a failure points to the
// exact partial. The body iterates every rule opener, extracts pairs,
// and reports the offending pair(s) per opener.

describe('pairings — every `parent > child` tag pair must be on the allowlist', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const openers = extractRuleOpeners(source)

		const offenders: { selector: string; parent: string; child: string }[] = []
		for (const selector of openers) {
			for (const { parent, child } of extractTagPairs(selector)) {
				if (!isAllowedTagPair(parent, child)) {
					offenders.push({ selector, parent, child })
				}
			}
		}

		// On failure: the `offenders` array prints each `parent > child` tag pair
		// not in STRUCTURAL_PAIRINGS. Each entry is element-hardcoding inside
		// containment — either:
		//   (a) add the pairing to STRUCTURAL_PAIRINGS in src/browser/patterns.ts
		//       with a justification (spec / slot / reset / context), OR
		//   (b) refactor the rule onto a wrapper class so consumers can use any
		//       child element under that wrapper.
		// See guides/patterns.md § "Structural pairings" for the rationale.
		it(`${relative} uses only allowlisted parent > child tag pairs`, () => {
			expect(offenders).toEqual([])
		})
	}
})

// ── Allowlist sanity: every entry has a non-empty reason ───────────────────

describe('pairings — allowlist entries are well-formed', () => {
	// On failure: the `bad` array prints each malformed STRUCTURAL_PAIRINGS entry.
	it('every STRUCTURAL_PAIRINGS entry has parent + child + kind + reason', () => {
		const bad = STRUCTURAL_PAIRINGS.filter(
			(p) => !p.parent || !p.child || !p.kind || !p.reason || p.reason.length < 10,
		)
		expect(bad).toEqual([])
	})

	it('`pairingFor` returns the entry for an allowlisted pair', () => {
		// Spot-check a few well-known pairings to guard the lookup helper.
		expect(pairingFor('article', 'header')?.kind).toBe('slot')
		expect(pairingFor('tr', 'td')?.kind).toBe('spec')
		expect(pairingFor('nav', 'ul')?.kind).toBe('reset')
		expect(pairingFor('header', 'button')?.kind).toBe('context')
		expect(pairingFor('nav', 'search')).toBeNull() // the removed violation
	})
})

// ── extractTagPairs unit checks — guard against regression in the parser ──

describe('extractTagPairs — unit checks', () => {
	it('extracts bare child combinators', () => {
		expect(extractTagPairs('nav > header')).toEqual([{ parent: 'nav', child: 'header' }])
	})

	it('flattens :is(...) on the parent side', () => {
		expect(extractTagPairs(':is(nav, aside) > header')).toEqual([
			{ parent: 'nav', child: 'header' },
			{ parent: 'aside', child: 'header' },
		])
	})

	it('flattens :where(...) on the child side', () => {
		expect(extractTagPairs('article > :where(header, footer)')).toEqual([
			{ parent: 'article', child: 'header' },
			{ parent: 'article', child: 'footer' },
		])
	})

	it('handles multi-step chains', () => {
		expect(extractTagPairs('body > nav > header')).toEqual([
			{ parent: 'body', child: 'nav' },
			{ parent: 'nav', child: 'header' },
		])
	})

	it('skips universal heads (`*`)', () => {
		expect(extractTagPairs('body > * > nav')).toEqual([])
	})

	it('skips pieces with no tag head (classes, attributes, pseudos)', () => {
		expect(extractTagPairs('.foo > .bar')).toEqual([])
		expect(extractTagPairs('[popover] > header')).toEqual([])
	})

	it('ignores descendant combinators (no `>` between)', () => {
		expect(extractTagPairs('nav menu')).toEqual([])
	})

	it('takes the LAST compound before `>` from a descendant chain', () => {
		// `body:has(main) menu > li` — the `>` is between `menu` and `li`.
		expect(extractTagPairs('body:has(main) menu > li')).toEqual([{ parent: 'menu', child: 'li' }])
	})

	it('respects pseudo qualifiers on the child compound', () => {
		expect(extractTagPairs('article > header:first-child')).toEqual([
			{ parent: 'article', child: 'header' },
		])
	})

	it('splits selector lists', () => {
		expect(extractTagPairs('nav > ol, nav > ul')).toEqual([
			{ parent: 'nav', child: 'ol' },
			{ parent: 'nav', child: 'ul' },
		])
	})
})
