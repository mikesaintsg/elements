// ============================================================================
// Tailwind v4 utility ↔ framework modifier conflict detector.
//
// The framework's modifiers live in `@layer components` (or earlier);
// Tailwind's utilities live in `@layer utilities`, the last layer in our
// merged order. When two layers declare a rule for the same class name,
// the later layer wins — so any framework modifier that collides with a
// Tailwind bare-name utility loses every cascade fight, silently.
//
// This test scans every framework SCSS partial for class selectors and
// asserts no extracted modifier name appears in the Tailwind bare-name
// catalog (`tests/fixtures/tailwind-utility-classes.ts`). One assertion
// per scanned name keeps the failure message specific.
//
// What gets scanned:
//   * Every `.scss` file under `src/styles/` (modifiers, components,
//     elements, surfaces).
//   * Patterns matched: `.foo {`, `&.foo {`, `.foo,` (comma-separated
//     selectors), `:is(.foo, ...)` lists.
//
// What's intentionally NOT scanned:
//   * Tailwind utility classes the framework consumes (e.g.
//     `.flex`, `.bg-primary`) inside SCSS — those would be authoring
//     mistakes; the framework's job is to define semantic modifiers, not
//     to redefine Tailwind utilities. Our scan only looks at TOP-LEVEL
//     selector tokens, so an attribute selector or a Tailwind utility
//     used in a `:where(.foo)` context would still be picked up — if you
//     hit a false positive, refactor to use the Tailwind utility on the
//     consumer markup directly.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TAILWIND_SINGLE_TOKEN_UTILITIES } from '../../fixtures/tailwind-utility-classes.js'

// ----------------------------------------------------------------------------
// Walk `src/styles/**/*.scss` recursively. Returns absolute paths.
// ----------------------------------------------------------------------------
function walkScssFiles(dir: string): string[] {
	const out: string[] = []
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry)
		const stat = statSync(path)
		if (stat.isDirectory()) {
			out.push(...walkScssFiles(path))
		} else if (entry.endsWith('.scss')) {
			out.push(path)
		}
	}
	return out
}

// ----------------------------------------------------------------------------
// Extract every class-token introduced as a SELECTOR (not consumed via
// utility composition). We're after patterns like:
//
//   .foo { ... }
//   .foo, .bar { ... }
//   &.foo { ... }
//   element.foo { ... }
//
// We DON'T want to pick up `var(--text-lg)` or class names mentioned in
// comments. Comments are stripped first; then a regex finds class tokens
// that appear at the START of a selector segment.
// ----------------------------------------------------------------------------
function extractFrameworkModifiers(scss: string): Set<string> {
	const stripped = scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

	const found = new Set<string>()

	// Match `.foo` where the preceding char is one of: line-start, whitespace,
	// `,`, `&`, `:`, `>`, `~`, `+`, `(`. That gives us tokens at the head of
	// any selector segment.
	const re = /(?:^|[\s,&:>~+(])\.([a-z][a-zA-Z0-9_-]*)\b/gm
	for (const match of stripped.matchAll(re)) {
		found.add(match[1])
	}

	return found
}

// ----------------------------------------------------------------------------
// Build the global "every class token the framework introduces" set, once.
// ----------------------------------------------------------------------------
function collectAllFrameworkModifiers(): Map<string, string[]> {
	// Resolve relative to the test file location. import.meta.dirname is
	// available in Node ≥ 20.11; we walk three levels up to reach the repo
	// root, then into `src/styles`.
	const stylesRoot = join(import.meta.dirname, '..', '..', '..', 'src', 'styles')
	const files = walkScssFiles(stylesRoot)
	const indexByModifier = new Map<string, string[]>()

	for (const file of files) {
		const text = readFileSync(file, 'utf8')
		const tokens = extractFrameworkModifiers(text)
		for (const token of tokens) {
			const list = indexByModifier.get(token) ?? []
			list.push(file)
			indexByModifier.set(token, list)
		}
	}

	return indexByModifier
}

const frameworkModifiers = collectAllFrameworkModifiers()
const tailwindBareUtilities = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

describe('Tailwind v4 utility ↔ framework modifier conflicts', () => {
	it('no framework modifier shares a name with a Tailwind bare-name utility', () => {
		const conflicts: Array<{ modifier: string; files: string[] }> = []
		for (const [modifier, files] of frameworkModifiers) {
			if (tailwindBareUtilities.has(modifier)) {
				conflicts.push({ modifier, files })
			}
		}

		// Throw a descriptive error so the failure points at exactly which
		// modifier collides and where it's declared (a plain
		// `expect(conflicts).toEqual([])` produces an unhelpful diff).
		if (conflicts.length > 0) {
			const detail = conflicts
				.map((c) => `  .${c.modifier} declared in ${c.files.join(', ')}`)
				.join('\n')
			throw new Error(
				`Found ${conflicts.length} framework modifier(s) colliding with Tailwind utilities:\n${detail}`,
			)
		}
		expect(conflicts).toEqual([])
	})

	it('the Tailwind catalog contains the well-known bare utilities we expect', () => {
		// Spot-check that the catalog hasn't been accidentally emptied. If
		// these specific utilities ever leave Tailwind, this test (and the
		// whole conflict surface) needs revisiting.
		const mustContain = ['inline', 'block', 'flex', 'grid', 'hidden', 'container', 'rounded']
		for (const name of mustContain) {
			expect(tailwindBareUtilities.has(name)).toBe(true)
		}
	})

	it('the framework SCSS scan finds at least the canonical modifier set', () => {
		// Sanity check: if our scanner regressed and returns an empty set, the
		// conflict assertion above would pass vacuously. Verify the scan picks
		// up known framework modifiers.
		const mustFind = ['primary', 'small', 'large', 'ghost', 'filled', 'disabled', 'row']
		for (const name of mustFind) {
			expect(frameworkModifiers.has(name)).toBe(true)
		}
	})
})
