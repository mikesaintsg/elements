// ============================================================================
//  guides/styles.md ↔ STYLE_LAYERS ↔ the canonical `@layer` declaration
//
//  The cascade-layer order is the framework's load-bearing contract: it
//  lives in the consumer's entry CSS BEFORE `@import "tailwindcss"`, so
//  Tailwind's narrower `@layer theme, base, components, utilities` merges
//  as a no-op against the wider order. It is declared in THREE places
//  that MUST agree byte-for-byte:
//
//    - `guides/styles.md`                — the documented order (twice:
//                                           §Surface code block + the
//                                           consumer-setup block).
//    - `tests/setup.css`                 — the test harness's entry CSS.
//    - `app/browser/styles/main.css`     — the showcase's entry CSS.
//
//  Plus `STYLE_LAYERS` (src/browser/patterns.ts) enumerates the five
//  FRAMEWORK-owned layers; every one MUST appear in the declared order
//  (the order also contains the two Tailwind-owned bookends `theme` /
//  `base` / `utilities` which are NOT in STYLE_LAYERS by design).
//
//  Pure node — sources read as text.
// ============================================================================

import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STYLE_LAYERS } from '@elements/browser'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const CANONICAL_LAYER_LINE =
	'@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;'

const stylesDoc = readGuide('styles')
const setupCss = readFileSync(resolvePath(WORKSPACE_ROOT, 'tests/setup.css'), 'utf8')
const mainCss = readFileSync(resolvePath(WORKSPACE_ROOT, 'app/browser/styles/main.css'), 'utf8')

/** Pull every `@layer a, b, c;` declaration line out of a CSS / md source. */
function layerDeclarations(source: string): readonly string[] {
	const out: string[] = []
	const regex = /^@layer [a-z, ]+;$/gm
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[0]) out.push(match[0].trim())
	}
	return out
}

// ── 1. The canonical declaration is identical everywhere ────────────────────

describe('styles — the @layer declaration is byte-identical across entry points', () => {
	it('tests/setup.css declares the canonical layer order', () => {
		expect(layerDeclarations(setupCss)).toContain(CANONICAL_LAYER_LINE)
	})

	it('app/browser/styles/main.css declares the canonical layer order', () => {
		expect(layerDeclarations(mainCss)).toContain(CANONICAL_LAYER_LINE)
	})

	it('guides/styles.md documents the canonical layer order', () => {
		expect(layerDeclarations(stylesDoc)).toContain(CANONICAL_LAYER_LINE)
	})

	it('every @layer declaration in styles.md is the canonical order (no drifted copy)', () => {
		const decls = layerDeclarations(stylesDoc)
		expect(decls.length).toBeGreaterThan(0)
		const drifted = decls.filter((d) => d !== CANONICAL_LAYER_LINE)
		expect(drifted).toEqual([])
	})
})

// ── 2. STYLE_LAYERS ⊆ the declared order, correctly positioned ──────────────

describe('styles — every STYLE_LAYERS member is in the canonical order', () => {
	// The declared order, parsed from the canonical line.
	const declared = CANONICAL_LAYER_LINE.replace(/^@layer /, '')
		.replace(/;$/, '')
		.split(',')
		.map((s) => s.trim())

	for (const layer of STYLE_LAYERS) {
		// On failure: `STYLE_LAYERS` includes `${layer}` but the canonical
		// `@layer` declaration doesn't. Either the declaration is missing
		// a framework layer or STYLE_LAYERS drifted.
		it(`framework layer "${layer}" is in the @layer declaration`, () => {
			expect(declared).toContain(layer)
		})
	}

	it('the framework layers sit between the Tailwind bookends (base … utilities)', () => {
		const baseIdx = declared.indexOf('base')
		const utilitiesIdx = declared.indexOf('utilities')
		expect(baseIdx).toBeGreaterThanOrEqual(0)
		expect(utilitiesIdx).toBeGreaterThan(baseIdx)
		for (const layer of STYLE_LAYERS) {
			const idx = declared.indexOf(layer)
			expect(idx).toBeGreaterThan(baseIdx)
			expect(idx).toBeLessThan(utilitiesIdx)
		}
	})

	it('STYLE_LAYERS contains only framework-owned layers (no Tailwind bookends)', () => {
		const tailwindOwned = ['theme', 'base', 'utilities']
		const leaked = STYLE_LAYERS.filter((l) => tailwindOwned.includes(l))
		expect(leaked).toEqual([])
	})
})
