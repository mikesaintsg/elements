// ============================================================================
// Modifier surface — TS shape + bidirectional CSS parity.
//
// Three layers of contract:
//   1. Shape — four orthogonal dimensions, expected keys per dimension, every
//      leaf string equals its key.
//   2. TS → CSS — every leaf in `modifiers` (e.g. 'primary', 'large') has a
//      CSS rule with a `.{name}` selector somewhere in the loaded cascade.
//   3. SCSS → TS — every `.X { … }` rule declared in modifiers/_*.scss appears
//      as a leaf in the `modifiers` object.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	modifiers,
	type Size,
	type State,
	type Style,
	type Variant,
} from '@src/browser'
import { findRule } from '../../setupStyles.ts'

import variantsScss from '../../../src/styles/modifiers/_variants.scss?raw'
import sizesScss from '../../../src/styles/modifiers/_sizes.scss?raw'
import stylesScss from '../../../src/styles/modifiers/_styles.scss?raw'
import statesScss from '../../../src/styles/modifiers/_states.scss?raw'

function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

const TS_LEAVES = leaves(modifiers)
const TS_SET = new Set(TS_LEAVES)

// Match top-level class selectors at the start of a line: `.name {`.
// Excludes pseudo-class chains (e.g. `.disabled:hover`) — only bare class names.
const CLASS_RULE_REGEX = /^\s*\.([a-z][a-z-]*)\s*\{/gim

function classNamesIn(source: string): readonly string[] {
	const out: string[] = []
	let match
	while ((match = CLASS_RULE_REGEX.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('modifiers — four orthogonal dimensions', () => {
	it('exposes the expected dimensions', () => {
		expect(Object.keys(modifiers).sort()).toEqual(['size', 'state', 'style', 'variant'])
	})

	it('variant has all 7 semantic names', () => {
		expect(Object.keys(modifiers.variant).sort()).toEqual([
			'danger',
			'information',
			'primary',
			'secondary',
			'success',
			'tertiary',
			'warning',
		])
	})

	it('size has small/large (the default size is bare-element)', () => {
		expect(Object.keys(modifiers.size).sort()).toEqual(['large', 'small'])
	})

	it('style has ghost/filled (no .outline — Tailwind owns that name)', () => {
		expect(Object.keys(modifiers.style).sort()).toEqual(['filled', 'ghost'])
	})

	it('state has disabled/active/loading', () => {
		expect(Object.keys(modifiers.state).sort()).toEqual(['active', 'disabled', 'loading'])
	})

	it('every leaf is its own key (string === key)', () => {
		for (const dimension of Object.values(modifiers)) {
			for (const [key, value] of Object.entries(dimension)) {
				expect(value).toBe(key)
			}
		}
	})
})

describe('modifiers — string-literal-union types', () => {
	it('typed values pass type-checking (compile-time check)', () => {
		const v: Variant = 'primary'
		const s: Size = 'large'
		const st: Style = 'ghost'
		const state: State = 'disabled'
		expect([v, s, st, state]).toBeTruthy()
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  TS → CSS
// ─────────────────────────────────────────────────────────────────────────────

describe('TS → CSS: every modifier name has a CSS rule', () => {
	it.each(TS_LEAVES)('.%s rule exists in the cascade', (name) => {
		expect(findRule(`.${name}`)).toBe(true)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  SCSS → TS
// ─────────────────────────────────────────────────────────────────────────────

describe('SCSS → TS: every modifier class declared in SCSS is mirrored', () => {
	const cases: ReadonlyArray<readonly [string, string]> = [
		['_variants.scss', variantsScss],
		['_sizes.scss', sizesScss],
		['_styles.scss', stylesScss],
		['_states.scss', statesScss],
	]

	it.each(cases)('every class in %s appears in modifiers.ts', (file, source) => {
		for (const name of classNamesIn(source)) {
			expect(TS_SET, `.${name} declared in ${file} but missing in modifiers.ts`).toContain(name)
		}
	})
})
