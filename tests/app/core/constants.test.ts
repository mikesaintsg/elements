// ============================================================================
//  app/browser/constants.ts — derivation + framework-parity contracts.
//
//  Not value restatements (AGENTS.md §16) — these assert the *behavior*
//  of the derived constants: the variant vocabularies stay in lock-step
//  with `@elements/browser`'s `modifiers`, the consolidated slices remain
//  true slices of their source, and the demo datasets keep their
//  structural invariants (unique ids, well-formed shapes).
//
//  Pure node (app:core): constants.ts imports only `@elements/browser`
//  + type-only — no `.vue`, no DOM.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'
import {
	PLACEMENTS,
	PLACEMENTS_MODIFIER,
	SELECT_FRUITS,
	TABLE_DICTIONARY,
	TABLE_FRUITS,
	TABLE_ISSUES,
	TABLES_BASIC_ROWS,
	TABLES_MEMBERS,
	TOKENS_ICONS,
	VARIANTS,
	VARIANTS_ALERT,
	VARIANTS_FEEDBACK,
	VARIANTS_FORM,
} from '../../../app/browser'

describe('variant vocabularies derive from @elements/browser', () => {
	it('VARIANTS is exactly modifiers.variant, in declared order', () => {
		expect(VARIANTS).toEqual(Object.values(modifiers.variant))
	})

	it('VARIANTS_ALERT is VARIANTS without `tertiary`', () => {
		expect(VARIANTS_ALERT).toEqual(VARIANTS.filter((v) => v !== 'tertiary'))
		expect(VARIANTS_ALERT).not.toContain('tertiary')
	})

	it('VARIANTS_FORM is VARIANTS without `information`', () => {
		expect(VARIANTS_FORM).toEqual(VARIANTS.filter((v) => v !== 'information'))
		expect(VARIANTS_FORM).not.toContain('information')
	})

	it('VARIANTS_FEEDBACK is VARIANTS without `secondary`/`tertiary`', () => {
		expect(VARIANTS_FEEDBACK).toEqual(VARIANTS.filter((v) => v !== 'secondary' && v !== 'tertiary'))
	})

	it('every subset is a strict, in-order subsequence of VARIANTS', () => {
		for (const subset of [VARIANTS_ALERT, VARIANTS_FORM, VARIANTS_FEEDBACK]) {
			expect(subset.length).toBeGreaterThan(0)
			expect(subset.length).toBeLessThan(VARIANTS.length)
			for (const v of subset) expect(VARIANTS).toContain(v)
			// order preserved: filtering VARIANTS by the subset yields the subset
			expect(VARIANTS.filter((v) => subset.includes(v))).toEqual([...subset])
		}
	})
})

describe('consolidated slices stay true slices of their source', () => {
	it('TABLES_BASIC_ROWS === TABLES_MEMBERS.slice(0, 4)', () => {
		expect(TABLES_BASIC_ROWS).toEqual(TABLES_MEMBERS.slice(0, 4))
		expect(TABLES_BASIC_ROWS.length).toBe(4)
	})

	it('SELECT_FRUITS === TABLE_FRUITS.slice(0, 7)', () => {
		expect(SELECT_FRUITS).toEqual(TABLE_FRUITS.slice(0, 7))
		expect(SELECT_FRUITS.length).toBe(7)
		for (const f of SELECT_FRUITS) expect(TABLE_FRUITS).toContain(f)
	})
})

describe('placement vocabularies parity with the framework', () => {
	const MODIFIER_PLACEMENTS = Object.values(modifiers.placement)

	it('PLACEMENTS_MODIFIER is exactly the 8 framework modifier placements', () => {
		expect(PLACEMENTS_MODIFIER.length).toBe(8)
		expect(new Set(PLACEMENTS_MODIFIER).size).toBe(8) // no dupes
		expect([...PLACEMENTS_MODIFIER].sort()).toEqual([...MODIFIER_PLACEMENTS].sort())
	})

	it('PLACEMENTS is the full 12-value floating set and supersets the modifier 8', () => {
		expect(PLACEMENTS.length).toBe(12)
		expect(new Set(PLACEMENTS).size).toBe(12)
		for (const p of MODIFIER_PLACEMENTS) expect(PLACEMENTS).toContain(p)
	})
})

describe('demo datasets keep their structural invariants', () => {
	it('TABLES_MEMBERS / TABLE_ISSUES / TOKENS_ICONS have unique ids', () => {
		for (const rows of [TABLES_MEMBERS, TABLE_ISSUES]) {
			const ids = rows.map((r) => r.id)
			expect(new Set(ids).size).toBe(ids.length)
		}
		const tokens = TOKENS_ICONS.map((i) => i.token)
		expect(new Set(tokens).size).toBe(tokens.length)
	})

	it('every TOKENS_ICONS token is an `--set-icon-*` custom property', () => {
		for (const { token } of TOKENS_ICONS) expect(token).toMatch(/^--set-icon-[a-z-]+$/)
	})

	it('TABLE_ISSUES status/priority stay within their unions', () => {
		for (const issue of TABLE_ISSUES) {
			expect(['open', 'in-progress', 'resolved']).toContain(issue.status)
			expect(['low', 'medium', 'high', 'critical']).toContain(issue.priority)
		}
	})

	it('TABLE_DICTIONARY rows are 3-tuples', () => {
		for (const row of TABLE_DICTIONARY) expect(row).toHaveLength(3)
	})
})
