// ============================================================================
//  Element-local modifier charter — src/styles/modifiers/_local.scss.
//
//  Element-local modifiers are rules of the form `{tag}.{name}` where:
//   - {tag} is a known taxonomy element type
//   - {name} is NOT one of the cross-cutting modifier dimensions
//     (variant / size / style / state / placement) and NOT a Tailwind
//     single-token utility.
//
//  Cross-cutting modifiers and bare class rules belong in the dimension
//  partials (_variants, _sizes, _styles, _states, _placements). This file
//  is the home for the small set of one-element modifiers that have no
//  cross-cutting home: `form.row`, `button.dropdown`, `details.flush`, etc.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers, TAXONOMY_BY_TAG } from '@elements/browser'
import { bareClassNamesIn, leaves, TAILWIND_SINGLE_TOKEN_UTILITIES } from '../../../setup.ts'

import localScss from '../../../../src/styles/modifiers/_local.scss?raw'

const CROSS_CUTTING = new Set(leaves(modifiers))
const TAILWIND = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

/** Match `{tag}.{name}` rule openers. Tag = letters + digits; name = same. */
const COMPOUND_RULE = /(?:^|\s)([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)\s*\{/gim

interface CompoundSighting {
	readonly tag: string
	readonly name: string
}

function compoundSelectorsIn(source: string): readonly CompoundSighting[] {
	const out: CompoundSighting[] = []
	let match: RegExpExecArray | null
	while ((match = COMPOUND_RULE.exec(source)) !== null) {
		if (match[1] && match[2]) out.push({ tag: match[1], name: match[2] })
	}
	return out
}

// ── Shape ───────────────────────────────────────────────────────────────────

describe('local — file is wrapped in @layer modifiers', () => {
	it('declares @layer modifiers', () => {
		expect(/@layer\s+modifiers\b/.test(localScss)).toBe(true)
	})

	it('declares no other @layer wrapper', () => {
		const layers = Array.from(localScss.matchAll(/@layer\s+([a-z-]+)/gi)).map((m) => m[1])
		const foreign = layers.filter((name) => name && name !== 'modifiers')
		expect(foreign).toEqual([])
	})
})

// ── Bare rules forbidden ────────────────────────────────────────────────────

describe('local — file declares no bare class selectors', () => {
	it('every rule is element-scoped (compound selector)', () => {
		// _local.scss must not declare bare class rules — those belong in dimension partials.
		expect(bareClassNamesIn(localScss)).toEqual([])
	})
})

// ── Compound rules respect the charter ──────────────────────────────────────
//
// When `_local.scss` has no compound rules yet (scaffold state), the per-rule
// assertions below are simply skipped — the shape tests above still run, and
// the (empty) for-loop emits no tests.

describe('local — every compound rule respects the charter', () => {
	const compounds = compoundSelectorsIn(localScss)

	for (const { tag, name } of compounds) {
		it(`${tag}.${name} — {tag} is a known taxonomy entry`, () => {
			expect(TAXONOMY_BY_TAG.has(tag)).toBe(true)
		})

		// `${name}` must NOT collide with a cross-cutting modifier (declare on its
		// dimension partial, not here) or a Tailwind single-token utility.
		it(`${tag}.${name} — {name} is not a cross-cutting modifier`, () => {
			expect(CROSS_CUTTING.has(name)).toBe(false)
		})

		it(`${tag}.${name} — {name} does not collide with a Tailwind utility`, () => {
			expect(TAILWIND.has(name)).toBe(false)
		})
	}
})
