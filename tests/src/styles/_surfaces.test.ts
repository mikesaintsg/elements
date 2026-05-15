// ============================================================================
//  Per-surface contract enforcement.
//
//  Drives every partial in `src/styles/surfaces/` against its
//  SURFACE_CONTRACTS entry. Three clauses per surface:
//
//    1. Filename ↔ contract parity — every contract has a partial,
//       every partial has a contract.
//    2. Required-token coverage — every declared suffix appears as a
//       `--set-{surface}-{suffix}:` declaration in the partial.
//    3. Animated-surface mixin discipline — when `animated: true`, the
//       partial must invoke `@include transition(...)` OR
//       `@include reduced-motion { ... }` somewhere.
//
//  Surfaces with `animated: false` are not required to use the motion
//  mixins. Surfaces that DECLARE a `transition-duration` token must
//  invoke one of the motion mixins regardless of the `animated` flag —
//  the test catches the customizability gap when tokens are exposed
//  without the reduced-motion contract.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { SURFACE_CONTRACTS, surfaceContractFor } from '@elements/browser'

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

const surfaceSources = import.meta.glob('../../../src/styles/surfaces/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function basenameOf(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	return match?.[1] ?? ''
}

function declaresToken(source: string, prefix: string, suffix: string): boolean {
	const escaped = suffix.replace(/-/g, '\\-')
	const pattern = new RegExp(`--set-${prefix}-${escaped}\\s*:`)
	return pattern.test(source)
}

function usesMotionMixin(source: string): boolean {
	return /@include\s+transition\s*\(/.test(source) || /@include\s+reduced-motion\b/.test(source)
}

// ============================================================================
//  1. Filename ↔ contract parity
// ============================================================================

describe('surfaces — every partial has a contract', () => {
	for (const path of Object.keys(surfaceSources)) {
		const name = basenameOf(path)
		if (name === '' || name === 'index') continue
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		// On failure: `${relative}` has no entry in SURFACE_CONTRACTS. Add one
		// to src/browser/patterns.ts § SURFACE_CONTRACTS with the canonical
		// token + animation discipline for the surface.
		it(`${relative} has a SURFACE_CONTRACTS entry`, () => {
			expect(surfaceContractFor(name)).not.toBeNull()
		})
	}
})

describe('surfaces — every contract has a partial', () => {
	const basenames = new Set(
		Object.keys(surfaceSources)
			.map(basenameOf)
			.filter((n) => n !== '' && n !== 'index'),
	)
	for (const name of Object.keys(SURFACE_CONTRACTS)) {
		// On failure: SURFACE_CONTRACTS lists `${name}` but src/styles/surfaces/_${name}.scss is missing.
		it(`SURFACE_CONTRACTS.${name} has src/styles/surfaces/_${name}.scss`, () => {
			expect(basenames.has(name)).toBe(true)
		})
	}
})

// ============================================================================
//  2. Required-token coverage
// ============================================================================

describe('surfaces — required tokens are declared in the partial', () => {
	for (const [path, source] of Object.entries(surfaceSources)) {
		const name = basenameOf(path)
		const contract = surfaceContractFor(name)
		if (!contract) continue

		const stripped = stripComments(source)
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const prefix = contract.tokens.prefix ?? contract.name

		for (const suffix of contract.tokens.required) {
			// On failure: `${relative}` does not declare --set-${prefix}-${suffix}.
			// See SURFACE_CONTRACTS.notes for the rationale.
			it(`${relative} declares --set-${prefix}-${suffix}`, () => {
				expect(declaresToken(stripped, prefix, suffix)).toBe(true)
			})
		}
	}
})

// ============================================================================
//  3. Animated surfaces invoke @include transition or @include reduced-motion
// ============================================================================

describe('surfaces — animated surfaces invoke a motion mixin', () => {
	for (const [path, source] of Object.entries(surfaceSources)) {
		const name = basenameOf(path)
		const contract = surfaceContractFor(name)
		if (!contract || !contract.animated) continue

		const stripped = stripComments(source)
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')

		// On failure: `${relative}` is marked animated but doesn't invoke
		// @include transition() or @include reduced-motion. Every motion
		// declaration in the framework must pair with the reduced-motion
		// contract — bare transition: declarations break the
		// prefers-reduced-motion opt-out.
		it(`${relative} invokes @include transition() or @include reduced-motion`, () => {
			expect(usesMotionMixin(stripped)).toBe(true)
		})
	}
})

// ============================================================================
//  4. Any surface that DECLARES a transition-duration token must invoke the
//     motion mixin (covers customizability gap: tokens exposed without the
//     reduced-motion contract).
// ============================================================================

describe('surfaces — partials that ship --set-{surface}-transition-duration honor the reduced-motion contract', () => {
	for (const [path, source] of Object.entries(surfaceSources)) {
		const name = basenameOf(path)
		const contract = surfaceContractFor(name)
		if (!contract) continue

		const stripped = stripComments(source)
		const prefix = contract.tokens.prefix ?? contract.name
		const hasTransitionToken = declaresToken(stripped, prefix, 'transition-duration')
		const hasDurationToken = declaresToken(stripped, prefix, 'duration')
		if (!hasTransitionToken && !hasDurationToken) continue

		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		// On failure: `${relative}` declares a duration token but doesn't
		// invoke @include transition() or @include reduced-motion. Exposing
		// the token without the mixin lets a consumer override duration but
		// cannot opt out via prefers-reduced-motion — break the contract
		// entirely or invoke the mixin.
		it(`${relative} declares a duration token AND invokes a motion mixin`, () => {
			expect(usesMotionMixin(stripped)).toBe(true)
		})
	}
})

// ============================================================================
//  5. SURFACE_CONTRACTS shape
// ============================================================================

describe('surfaces — SURFACE_CONTRACTS shape', () => {
	it('declares at least one surface', () => {
		expect(Object.keys(SURFACE_CONTRACTS).length).toBeGreaterThan(0)
	})

	it('every name matches its key', () => {
		for (const [key, contract] of Object.entries(SURFACE_CONTRACTS)) {
			expect(contract.name).toBe(key)
		}
	})

	it('every required-token suffix is kebab-case', () => {
		for (const contract of Object.values(SURFACE_CONTRACTS)) {
			for (const suffix of contract.tokens.required) {
				expect(suffix).toMatch(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/)
			}
		}
	})

	it('every notes field is non-empty', () => {
		for (const contract of Object.values(SURFACE_CONTRACTS)) {
			expect(contract.notes.length).toBeGreaterThan(20)
		}
	})

	it('every selectorKinds entry is non-empty', () => {
		for (const contract of Object.values(SURFACE_CONTRACTS)) {
			expect(contract.selectors.length).toBeGreaterThan(0)
		}
	})

	it('animated surfaces include transition-duration OR duration in required tokens', () => {
		for (const contract of Object.values(SURFACE_CONTRACTS)) {
			if (!contract.animated) continue
			const hasMotionToken =
				contract.tokens.required.includes('transition-duration') ||
				contract.tokens.required.includes('duration')
			expect(
				hasMotionToken,
				`${contract.name} is marked animated but doesn't require a duration token in its contract`,
			).toBe(true)
		}
	})
})
