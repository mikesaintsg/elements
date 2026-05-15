// ============================================================================
//  Per-component contract enforcement.
//
//  Drives every partial in `src/styles/components/` against its
//  COMPONENT_CONTRACTS entry. Four clauses per component:
//
//    1. Filename ↔ contract parity — every contract has a partial,
//       every partial has a contract.
//    2. Required-token coverage — every declared suffix appears as a
//       `--set-{tokenPrefix}-{suffix}:` declaration in the partial.
//    3. Animated-component mixin discipline — when `animated: true`, the
//       partial must invoke `@include transition(...)` OR
//       `@include reduced-motion { … }` somewhere. Same rule as surfaces.
//    4. Customizability gap — any component that declares a duration
//       token MUST invoke a motion mixin, regardless of the animated flag.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { COMPONENT_CONTRACTS, componentContractFor } from '@elements/browser'
import {
	declaresToken,
	stripComments,
	tagFromPath,
	usesMotionMixin,
} from '../../setupStyles'

const componentSources = import.meta.glob('../../../src/styles/components/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

// ── 1. Filename ↔ contract parity ──────────────────────────────────────────

describe('components — every partial has a contract', () => {
	for (const path of Object.keys(componentSources)) {
		const name = tagFromPath(path)
		if (name === '' || name === 'index') continue
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		// On failure: `${relative}` has no entry in COMPONENT_CONTRACTS. Add one to
		// src/browser/patterns.ts § COMPONENT_CONTRACTS with the canonical token +
		// animation discipline.
		it(`${relative} has a COMPONENT_CONTRACTS entry`, () => {
			expect(componentContractFor(name)).not.toBeNull()
		})
	}
})

describe('components — every contract has a partial', () => {
	const basenames = new Set(
		Object.keys(componentSources)
			.map(tagFromPath)
			.filter((n) => n !== '' && n !== 'index'),
	)
	for (const name of Object.keys(COMPONENT_CONTRACTS)) {
		// On failure: COMPONENT_CONTRACTS lists `${name}` but src/styles/components/_${name}.scss is missing.
		it(`COMPONENT_CONTRACTS.${name} has src/styles/components/_${name}.scss`, () => {
			expect(basenames.has(name)).toBe(true)
		})
	}
})

// ── 2. Required-token coverage ─────────────────────────────────────────────

describe('components — required tokens are declared in the partial', () => {
	for (const [path, source] of Object.entries(componentSources)) {
		const name = tagFromPath(path)
		const contract = componentContractFor(name)
		if (!contract) continue

		const stripped = stripComments(source)
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const prefix = contract.tokens.prefix ?? contract.name

		for (const suffix of contract.tokens.required) {
			// On failure: `${relative}` does not declare --set-${prefix}-${suffix}.
			// See COMPONENT_CONTRACTS.notes for the rationale.
			it(`${relative} declares --set-${prefix}-${suffix}`, () => {
				expect(declaresToken(stripped, prefix, suffix)).toBe(true)
			})
		}
	}
})

// ── 3. Animated components invoke a motion mixin ───────────────────────────

describe('components — animated components invoke a motion mixin', () => {
	for (const [path, source] of Object.entries(componentSources)) {
		const name = tagFromPath(path)
		const contract = componentContractFor(name)
		if (!contract || !contract.animated) continue

		const stripped = stripComments(source)
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')

		// On failure: `${relative}` is marked animated but doesn't invoke
		// @include transition() or @include reduced-motion. Bare transition:
		// declarations break the prefers-reduced-motion opt-out.
		it(`${relative} invokes @include transition() or @include reduced-motion`, () => {
			expect(usesMotionMixin(stripped)).toBe(true)
		})
	}
})

// ── 4. Customizability gap — duration tokens require the motion mixin ──────

describe('components — partials that ship a duration token honor the reduced-motion contract', () => {
	for (const [path, source] of Object.entries(componentSources)) {
		const name = tagFromPath(path)
		const contract = componentContractFor(name)
		if (!contract) continue

		const stripped = stripComments(source)
		const prefix = contract.tokens.prefix ?? contract.name
		const hasTransitionToken = declaresToken(stripped, prefix, 'transition-duration')
		const hasDurationToken = declaresToken(stripped, prefix, 'duration')
		const hasPulseDuration = declaresToken(stripped, prefix, 'pulse-duration')
		if (!hasTransitionToken && !hasDurationToken && !hasPulseDuration) continue

		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		// On failure: `${relative}` declares a duration token but doesn't
		// invoke @include transition() or @include reduced-motion. Exposing
		// the duration token without the mixin lets a consumer retune
		// duration but cannot opt out via prefers-reduced-motion.
		it(`${relative} declares a duration token AND invokes a motion mixin`, () => {
			expect(usesMotionMixin(stripped)).toBe(true)
		})
	}
})

// ── 5. COMPONENT_CONTRACTS shape ───────────────────────────────────────────

describe('components — COMPONENT_CONTRACTS shape', () => {
	it('declares at least one component', () => {
		expect(Object.keys(COMPONENT_CONTRACTS).length).toBeGreaterThan(0)
	})

	it('every name matches its key', () => {
		for (const [key, contract] of Object.entries(COMPONENT_CONTRACTS)) {
			expect(contract.name).toBe(key)
		}
	})

	it('every required-token suffix is kebab-case', () => {
		for (const contract of Object.values(COMPONENT_CONTRACTS)) {
			for (const suffix of contract.tokens.required) {
				expect(suffix).toMatch(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/)
			}
		}
	})

	it('every notes field is non-empty', () => {
		for (const contract of Object.values(COMPONENT_CONTRACTS)) {
			expect(contract.notes.length).toBeGreaterThan(20)
		}
	})
})
