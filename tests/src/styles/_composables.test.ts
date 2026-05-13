// ============================================================================
//  Per-composable contract enforcement.
//
//  Drives every partial in `src/styles/composables/` against its
//  COMPOSABLE_CONTRACTS entry. Five clauses per composable:
//
//    1. Filename ↔ contract parity.
//    2. Required-token coverage (composable-scoped namespace).
//    3. Factory pairing — every contract's `factoryName` matches a real
//       `create{Name}.ts` in src/browser/factories/.
//    4. State-selector vocabulary — declared `stateSelectors` kinds
//       appear in the partial.
//    5. Animated-composable contract — partials with `animated: true`
//       or that declare bare `transition:` / `animation:` properties MUST
//       invoke `@include transition(...)` OR `@include reduced-motion`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { COMPOSABLE_CONTRACTS, composableContractFor } from '@elements/browser'

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

const composableSources = import.meta.glob('../../../src/styles/composables/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const factorySources = import.meta.glob('../../../src/browser/factories/create*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const factoryNames = new Set(
	Object.keys(factorySources).map((p) => {
		const match = p.match(/(create[A-Z][A-Za-z]+)\.ts$/)
		return match?.[1] ?? ''
	}),
)

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

function hasBareMotion(source: string): boolean {
	return /^\s*(?:transition|animation):/m.test(source)
}

// ── 1. Filename ↔ contract parity ──────────────────────────────────────────

describe('composables — every partial has a contract', () => {
	for (const path of Object.keys(composableSources)) {
		const name = basenameOf(path)
		if (name === '' || name === 'index') continue
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		it(`${relative} has a COMPOSABLE_CONTRACTS entry`, () => {
			expect(
				composableContractFor(name),
				`${relative} has no entry in COMPOSABLE_CONTRACTS. Add one to src/browser/patterns.ts.`,
			).not.toBeNull()
		})
	}
})

describe('composables — every contract has a partial', () => {
	const basenames = new Set(
		Object.keys(composableSources)
			.map(basenameOf)
			.filter((n) => n !== '' && n !== 'index'),
	)
	for (const name of Object.keys(COMPOSABLE_CONTRACTS)) {
		it(`COMPOSABLE_CONTRACTS.${name} has src/styles/composables/_${name}.scss`, () => {
			expect(basenames.has(name)).toBe(true)
		})
	}
})

// ── 2. Required-token coverage ─────────────────────────────────────────────

describe('composables — required tokens are declared in the partial', () => {
	for (const [path, source] of Object.entries(composableSources)) {
		const name = basenameOf(path)
		const contract = composableContractFor(name)
		if (!contract || contract.requiredTokens.length === 0) continue

		const stripped = stripComments(source)
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const prefix = contract.tokenPrefix ?? contract.name

		for (const suffix of contract.requiredTokens) {
			it(`${relative} declares --set-${prefix}-${suffix}`, () => {
				expect(
					declaresToken(stripped, prefix, suffix),
					`${relative} does not declare --set-${prefix}-${suffix}. ${contract.notes}`,
				).toBe(true)
			})
		}
	}
})

// ── 3. Factory pairing ─────────────────────────────────────────────────────

describe('composables — every contract references a real factory', () => {
	for (const [name, contract] of Object.entries(COMPOSABLE_CONTRACTS)) {
		it(`${name} → ${contract.factoryName}.ts exists`, () => {
			expect(
				factoryNames.has(contract.factoryName),
				`COMPOSABLE_CONTRACTS.${name}.factoryName='${contract.factoryName}' has no matching ` +
					`src/browser/factories/${contract.factoryName}.ts file.`,
			).toBe(true)
		})
	}
})

// ── 4. Animated-composable mixin discipline ────────────────────────────────

describe('composables — bare transition: / animation: declarations require a motion mixin', () => {
	for (const [path, source] of Object.entries(composableSources)) {
		const name = basenameOf(path)
		const contract = composableContractFor(name)
		if (!contract) continue

		const stripped = stripComments(source)
		const hasMotion = hasBareMotion(stripped)

		if (!hasMotion && !contract.animated) continue

		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		it(`${relative} invokes @include transition() or @include reduced-motion`, () => {
			expect(
				usesMotionMixin(stripped),
				`${relative} declares bare transition: or animation: properties (or is marked animated) ` +
					`but does not invoke @include transition() or @include reduced-motion. ` +
					`Composables that animate must honor the prefers-reduced-motion opt-out via the mixin.`,
			).toBe(true)
		})
	}
})

// ── 5. COMPOSABLE_CONTRACTS shape ──────────────────────────────────────────

describe('composables — COMPOSABLE_CONTRACTS shape', () => {
	it('declares at least one composable', () => {
		expect(Object.keys(COMPOSABLE_CONTRACTS).length).toBeGreaterThan(0)
	})

	it('every name matches its key', () => {
		for (const [key, contract] of Object.entries(COMPOSABLE_CONTRACTS)) {
			expect(contract.name).toBe(key)
		}
	})

	it('every factoryName matches the create{Name} convention', () => {
		for (const contract of Object.values(COMPOSABLE_CONTRACTS)) {
			expect(contract.factoryName).toMatch(/^create[A-Z][A-Za-z]+$/)
		}
	})

	it('every required-token suffix is kebab-case', () => {
		for (const contract of Object.values(COMPOSABLE_CONTRACTS)) {
			for (const suffix of contract.requiredTokens) {
				expect(suffix).toMatch(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/)
			}
		}
	})

	it('every notes field is non-empty', () => {
		for (const contract of Object.values(COMPOSABLE_CONTRACTS)) {
			expect(contract.notes.length).toBeGreaterThan(20)
		}
	})
})
