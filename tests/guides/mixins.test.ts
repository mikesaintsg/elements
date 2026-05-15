// ============================================================================
//  guides/mixins.md ↔ src/styles/_mixins.scss
//
//  Two directions of parity:
//
//    1. SCSS → DOC — every `@mixin name(...)` declared in `_mixins.scss`
//       is mentioned in mixins.md. A new mixin that ships without doc
//       coverage is invisible to consumers.
//
//    2. DOC → SCSS — every mixin name documented in mixins.md exists in
//       `_mixins.scss`. Stale doc references are caught.
//
//  Names are matched on backtick-quoted occurrences (`` `name` ``) — the
//  framework's own naming convention in markdown prose.
//
//  Pure node — node:fs reads the SCSS + markdown sources.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_FILE_DIR = fileURLToPath(new URL('.', import.meta.url))
const WORKSPACE_ROOT = resolvePath(TEST_FILE_DIR, '../..')

const mixinsScss = readFileSync(resolvePath(WORKSPACE_ROOT, 'src/styles/_mixins.scss'), 'utf8')
const mixinsDoc = readFileSync(resolvePath(WORKSPACE_ROOT, 'guides/mixins.md'), 'utf8')

/** Pull every `@mixin name(...)` declaration name out of `_mixins.scss`. */
function shippedMixins(source: string): readonly string[] {
	const out: string[] = []
	const regex = /^@mixin\s+([a-z][a-z0-9-]*)/gm
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

/**
 * True if `name` appears as a backticked identifier in the markdown source.
 * Matches both bare (`` `truncate` ``) and signature (`` `transition($value)` ``)
 * forms — the framework's mixin docs use either depending on whether the
 * mixin takes arguments.
 */
function isDocumented(doc: string, name: string): boolean {
	const escaped = name.replace(/[-]/g, '\\-')
	return new RegExp(`\`${escaped}(?:\\(|\`)`).test(doc)
}

const SHIPPED = shippedMixins(mixinsScss)

// ── 1. SCSS → DOC ──────────────────────────────────────────────────────────

describe('mixins — every shipped @mixin is documented in mixins.md', () => {
	for (const name of SHIPPED) {
		// On failure: `@mixin ${name}` exists in `src/styles/_mixins.scss` but
		// is not mentioned in `guides/mixins.md`. Add a documentation entry
		// (signature + purpose + use case) so consumers can discover it.
		it(`@mixin ${name} appears in guides/mixins.md`, () => {
			expect(isDocumented(mixinsDoc, name)).toBe(true)
		})
	}
})

// ── 2. DOC → SCSS ──────────────────────────────────────────────────────────
//
// Pull every backticked identifier from mixins.md that LOOKS like a mixin
// name (kebab-case, single word or hyphenated, not a CSS property). Filter
// against a small allowlist of common non-mixin tokens that show up in
// prose (e.g. CSS keywords, sizes) so the test stays signal-rich.

const NON_MIXIN_TOKENS = new Set([
	'start',
	'end',
	'top',
	'bottom',
	'left',
	'right',
	'medium',
	'small',
	'large',
	'inline-size',
	'block-size',
	'max-block-size',
	'max-inline-size',
	'min-block-size',
	'min-inline-size',
	'container-name',
	'container-type',
	'color-mix',
	'button-hover',
	'p-0',
])

function documentedMixinCandidates(doc: string): readonly string[] {
	const out = new Set<string>()
	// Backticked, kebab-case identifiers
	const regex = /`([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+)`/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(doc)) !== null) {
		if (match[1] && !NON_MIXIN_TOKENS.has(match[1])) out.add(match[1])
	}
	return Array.from(out)
}

describe('mixins — every documented mixin name exists in _mixins.scss', () => {
	const shippedSet = new Set(SHIPPED)
	// Only flag identifiers that match the shape `floater-*`, `focus-*`,
	// or any name beginning with a verb that's documented as a mixin
	// header. Backticked identifiers that don't look like mixin headers
	// (CSS properties, sizes, etc.) sit in the allowlist above.

	for (const candidate of documentedMixinCandidates(mixinsDoc)) {
		// On failure: `${candidate}` is documented as a mixin in
		// `guides/mixins.md` but no `@mixin ${candidate}` declaration exists
		// in `src/styles/_mixins.scss`. Either restore the mixin or remove
		// the stale doc entry. Add to NON_MIXIN_TOKENS if it's actually a
		// CSS property / value referenced in prose.
		it(`${candidate} (documented) has a matching @mixin declaration`, () => {
			expect(shippedSet.has(candidate)).toBe(true)
		})
	}
})
