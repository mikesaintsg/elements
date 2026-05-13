// ============================================================================
//  Token-naming conventions.
//
//  Every `--set-*` custom property the framework declares MUST satisfy two
//  conventions:
//
//    A. SHAPE — `--set-` prefix followed by one or more kebab-case segments
//       (lowercase letters / digits, hyphen-separated, no underscores, no
//       trailing hyphens). This rejects accidental camelCase, leading
//       digits, double-hyphens, and the like.
//
//    B. NO ABBREVIATIONS — no hyphen-separated segment exactly matches the
//       black-list (`bg`, `fg`, `lg`, `sm`, `md`, `xl`, `info`, `btn`, …).
//       Spell every name out. Real HTML tag names like `nav` and real CSS
//       keywords like `min` / `max` are deliberately NOT on the black-list
//       — the check is segment-equal, not substring-contains.
//
//  Tag-segment ↔ taxonomy parity is covered separately by
//  tests/src/styles/_taxonomy.test.ts. This test's job is purely the naming
//  surface — shape and forbidden segments. Group uniformity is covered by
//  tests/src/styles/_uniformity.test.ts.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { FORBIDDEN_TOKEN_SEGMENTS } from '@elements/browser'

const sources = import.meta.glob('../../../src/styles/**/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const TOKEN_DECLARATION = /(?:^|[\s;{])(--set-[a-z0-9-]+)\s*:/g

/** Shape regex: `--set-` + one-or-more kebab-case segments, no trailing hyphens. */
const TOKEN_SHAPE = /^--set-[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/

function tokenNamesIn(source: string): readonly string[] {
	const out = new Set<string>()
	let match: RegExpExecArray | null
	while ((match = TOKEN_DECLARATION.exec(source)) !== null) {
		if (match[1]) out.add(match[1])
	}
	return Array.from(out)
}

interface TokenSighting {
	readonly name: string
	readonly file: string
}

const sightings: TokenSighting[] = []
for (const [path, source] of Object.entries(sources)) {
	const file = path.replace(/^.*\/src\/styles\//, 'src/styles/')
	for (const name of tokenNamesIn(source)) sightings.push({ name, file })
}

// Deduplicate (multiple files may declare the same token via fallback chains).
const uniqueTokens: ReadonlyMap<string, string> = (() => {
	const map = new Map<string, string>()
	for (const sighting of sightings) {
		if (!map.has(sighting.name)) map.set(sighting.name, sighting.file)
	}
	return map
})()

// ── A. Shape ────────────────────────────────────────────────────────────────

describe('naming — every --set-* token matches the documented shape', () => {
	for (const [name, file] of uniqueTokens) {
		it(`${name} (in ${file}) is kebab-case with a --set- prefix`, () => {
			expect(TOKEN_SHAPE.test(name), `${name} does not match --set-{kebab-case}`).toBe(true)
		})
	}
})

// ── B. Forbidden abbreviations ──────────────────────────────────────────────

describe('naming — no token segment matches the abbreviation black-list', () => {
	for (const [name, file] of uniqueTokens) {
		it(`${name} (in ${file}) has no forbidden segment`, () => {
			const segments = name.replace(/^--set-/, '').split('-')
			const offenders = segments.filter((segment) => FORBIDDEN_TOKEN_SEGMENTS.has(segment))
			expect(
				offenders,
				`${name} contains forbidden abbreviation(s): ${offenders.join(', ')}. ` +
					`Spell the name out — see src/browser/taxonomy.ts § FORBIDDEN_TOKEN_SEGMENTS.`,
			).toEqual([])
		})
	}
})
