// ============================================================================
//  Layer charter parity.
//
//  Every folder under `src/styles/{layer}/` owns one cascade layer (the layer
//  name matches the folder name). The folder's `index.scss` is its charter —
//  it documents what the folder MUST and MUST NOT contain. This test asserts
//  two cheap invariants that catch the most common drift:
//
//    1. Every layered SCSS file in `{layer}/` wraps its rules in `@layer
//       {layer}` (with the exception of pure `:root` token blocks, which are
//       global and must NOT be layered).
//
//    2. No SCSS file in `{layer}/` declares an `@layer X` block where `X` is
//       a different layer. Cross-layer authorship from a single file is the
//       audit pattern that produces the "form layout chrome lives in
//       components/" problem the architecture audit flagged.
//
//  This test does not enforce the prose of every charter (that would need
//  an LLM). It enforces the mechanical contract that the prose describes.
// ============================================================================

import { describe, expect, it } from 'vitest'

const sources = import.meta.glob('../../../src/styles/{elements,components,surfaces,composables,modifiers}/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

interface Partial {
	readonly layer: string
	readonly tag: string
	readonly source: string
	readonly path: string
}

// Strip `//` line comments and SCSS / CSS block comments. Use string-form
// RegExp because the literal form trips vite-oxc's tokenizer on the
// closing-comment escape sequence.
const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

const partials: Partial[] = Object.entries(sources).map(([path, source]) => {
	const match = path.match(/\/styles\/([^/]+)\/_([^/]+)\.scss$/)
	if (!match) throw new Error(`Unexpected partial path: ${path}`)
	return { layer: match[1]!, tag: match[2]!, source: stripComments(source), path }
})

const layerNames = new Set(partials.map((p) => p.layer))

function findLayerDirectives(source: string): readonly string[] {
	const out: string[] = []
	const regex = /@layer\s+([a-z][a-z0-9-]*)/gi
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

function hasNonTokenRule(source: string): boolean {
	// Any rule selector OTHER than `:root`. Token-only files (rare) declare
	// `:root { … }` and don't need to live in a layer.
	const lines = source.split('\n')
	for (const line of lines) {
		const stripped = line.trim()
		if (!stripped.endsWith('{')) continue
		if (stripped.startsWith(':root')) continue
		if (stripped.startsWith('@')) continue // `@layer`, `@media`, `@supports`, etc.
		if (stripped.startsWith('//')) continue
		return true
	}
	return false
}

// ── 1. Every layered partial wraps its rules in its own layer ──────────────

describe('charters — partials wrap rules in their own cascade layer', () => {
	for (const partial of partials) {
		// `index.scss` is a barrel of `@use` statements; no rules of its own.
		if (partial.tag === 'index') continue

		it(`${partial.layer}/_${partial.tag}.scss is wrapped in @layer ${partial.layer}`, () => {
			const layers = findLayerDirectives(partial.source)
			const hasRule = hasNonTokenRule(partial.source)

			if (!hasRule) {
				// Comment-only stub — allowed. The taxonomy test catches stubs
				// that should be substantive.
				expect(layers.length).toBeLessThanOrEqual(1)
				return
			}

			expect(layers, `${partial.path} declares rules but no @layer wrapper`).toContain(
				partial.layer,
			)
		})
	}
})

// ── 2. No partial declares rules in a foreign layer ────────────────────────

describe('charters — no cross-layer authorship', () => {
	for (const partial of partials) {
		if (partial.tag === 'index') continue

		it(`${partial.layer}/_${partial.tag}.scss only writes to @layer ${partial.layer}`, () => {
			const foreign = findLayerDirectives(partial.source).filter(
				(name) => layerNames.has(name) && name !== partial.layer,
			)
			expect(
				foreign,
				`${partial.path} writes into foreign layer(s): ${foreign.join(', ')}`,
			).toEqual([])
		})
	}
})
