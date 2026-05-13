// ============================================================================
//  HTML taxonomy parity.
//
//  Bidirectional check that the taxonomy registry, the SCSS partials, the
//  elements.ts substantive list, and the factories/composables match.
//
//  Contracts (see src/browser/taxonomy.ts for the source of truth):
//
//    1. Every tag in `taxonomy` has a `src/styles/elements/_{tag}.scss`
//       partial. The partial may be a comment-only stub (passthrough) or a
//       reset; the substantive cases declare `--set-{tag}-*` tokens.
//
//    2. Every `_{tag}.scss` partial corresponds to a taxonomy row.
//
//    3. A taxonomy entry with treatment === 'substantive' or 'composable'
//       resolves at least one `--set-{tag}-*` declaration somewhere in
//       src/styles/ (elements/ or components/).
//
//    4. A taxonomy entry with treatment === 'composable' references a
//       factory key that exists in `src/browser/factories/`.
//
//    5. Every tag in `elements.ts` (the registry of elements-folder
//       substantive baselines) appears in the taxonomy AND has element-
//       layer tokens.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { elements, taxonomy, TAXONOMY_BY_TAG, isSubstantive, isComposable } from '@elements/browser'

const elementSources = import.meta.glob('../../../src/styles/elements/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const componentSources = import.meta.glob('../../../src/styles/components/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const factorySources = import.meta.glob('../../../src/browser/factories/*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function tagOfPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract tag from ${path}`)
	return match[1]
}

function declaresElementToken(source: string, tag: string): boolean {
	return new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`, 'i').test(source)
}

const elementsByTag: ReadonlyMap<string, string> = new Map(
	Object.entries(elementSources).map(([path, source]) => [tagOfPath(path), source]),
)

const componentsByTag: ReadonlyMap<string, string> = new Map(
	Object.entries(componentSources).map(([path, source]) => [tagOfPath(path), source]),
)

const factoryNames: ReadonlySet<string> = new Set(
	Object.keys(factorySources).map((p) => {
		const match = p.match(/(create[A-Z][A-Za-z]+)\.ts$/)
		return match?.[1] ?? ''
	}),
)

// ── 1. Every taxonomy tag has an _{tag}.scss partial ───────────────────────

describe('taxonomy — every entry has a matching elements partial', () => {
	for (const entry of taxonomy) {
		it(`_${entry.tag}.scss exists`, () => {
			expect(elementsByTag.has(entry.tag)).toBe(true)
		})
	}
})

// ── 2. Every elements partial has a taxonomy entry ─────────────────────────

describe('taxonomy — every elements partial is enumerated', () => {
	for (const tag of elementsByTag.keys()) {
		it(`taxonomy entry exists for _${tag}.scss`, () => {
			expect(TAXONOMY_BY_TAG.has(tag), `_${tag}.scss has no taxonomy row`).toBe(true)
		})
	}
})

// ── 3. Substantive / composable entries declare element-scoped tokens ──────

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

// ── 4. Composable entries reference a real factory ─────────────────────────

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

// ── 5. elements.ts ⊆ taxonomy ──────────────────────────────────────────────

describe('taxonomy — elements.ts entries are a subset of taxonomy substantive+composable', () => {
	for (const tag of Object.keys(elements)) {
		it(`${tag} (in elements.ts) is enumerated as substantive or composable in taxonomy`, () => {
			expect(isSubstantive(tag) || isComposable(tag)).toBe(true)
		})
	}
})
