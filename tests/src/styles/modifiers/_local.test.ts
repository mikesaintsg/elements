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
import { TAILWIND_SINGLE_TOKEN_UTILITIES } from '../../../setupStyles.ts'

import localScss from '../../../../src/styles/modifiers/_local.scss?raw'

function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

const CROSS_CUTTING = new Set(leaves(modifiers))
const TAILWIND = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

/** Match `{tag}.{name}` rule openers. Tag = letters + digits; name = same. */
const COMPOUND_RULE = /(?:^|\s)([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)\s*\{/gim

/** Match bare `.{name}` rule openers (no preceding selector). */
const BARE_RULE = /^\s*\.([a-z][a-z0-9-]*)\s*\{/gim

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

function bareSelectorsIn(source: string): readonly string[] {
	const out: string[] = []
	let match: RegExpExecArray | null
	while ((match = BARE_RULE.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
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
		const bare = bareSelectorsIn(localScss)
		expect(
			bare,
			`_local.scss declares bare class rule(s) — those belong in dimension partials: ${bare.join(', ')}`,
		).toEqual([])
	})
})

// ── Compound rules respect the charter ──────────────────────────────────────

describe('local — every compound rule respects the charter', () => {
	const compounds = compoundSelectorsIn(localScss)

	if (compounds.length === 0) {
		// File is currently a scaffold — no rules yet. Skip the per-rule
		// assertions; the shape tests above still run.
		it('no compound rules declared yet (scaffold state — see charter at top of file)', () => {
			expect(compounds.length).toBe(0)
		})
		return
	}

	for (const { tag, name } of compounds) {
		it(`${tag}.${name} — {tag} is a known taxonomy entry`, () => {
			expect(TAXONOMY_BY_TAG.has(tag), `${tag} is not in taxonomy`).toBe(true)
		})

		it(`${tag}.${name} — {name} is not a cross-cutting modifier`, () => {
			expect(
				CROSS_CUTTING.has(name),
				`${name} is a cross-cutting modifier — declare on its dimension partial, not here`,
			).toBe(false)
		})

		it(`${tag}.${name} — {name} does not collide with a Tailwind utility`, () => {
			expect(TAILWIND.has(name), `${name} is a Tailwind single-token utility`).toBe(false)
		})
	}
})
