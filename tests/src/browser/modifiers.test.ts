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
import { modifiers, type Size, type State, type Style, type Variant } from '@elements/browser'
import { bareClassNamesIn, leaves } from '../../setup.ts'
import { findRule } from '../../setupStyles.ts'

import variantsScss from '../../../src/styles/modifiers/_variants.scss?raw'
import sizesScss from '../../../src/styles/modifiers/_sizes.scss?raw'
import stylesScss from '../../../src/styles/modifiers/_styles.scss?raw'
import statesScss from '../../../src/styles/modifiers/_states.scss?raw'

const TS_LEAVES = leaves(modifiers)
const TS_SET = new Set(TS_LEAVES)

// ─────────────────────────────────────────────────────────────────────────────
//  Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('modifiers — five orthogonal dimensions', () => {
	it('exposes the expected dimensions', () => {
		expect(Object.keys(modifiers).sort()).toEqual([
			'placement',
			'size',
			'state',
			'style',
			'variant',
		])
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

	it('style has subtle/filled (no .outline — Tailwind owns that name; .ghost was dropped over WCAG AA failures — see _styles.scss notes)', () => {
		expect(Object.keys(modifiers.style).sort()).toEqual(['filled', 'subtle'])
	})

	it('state has disabled/active/loading', () => {
		expect(Object.keys(modifiers.state).sort()).toEqual(['active', 'disabled', 'loading'])
	})

	it('placement has 4 edges + 4 corners (top/bottom/start/end + corners)', () => {
		expect(Object.keys(modifiers.placement).sort()).toEqual([
			'bottom',
			'bottom-end',
			'bottom-start',
			'end',
			'start',
			'top',
			'top-end',
			'top-start',
		])
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
		const st: Style = 'subtle'
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
		for (const name of bareClassNamesIn(source)) {
			expect(TS_SET, `.${name} declared in ${file} but missing in modifiers.ts`).toContain(name)
		}
	})
})
