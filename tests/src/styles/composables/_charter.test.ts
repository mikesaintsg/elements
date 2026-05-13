// ============================================================================
//  Composables-layer charter parity.
//
//  Every file under src/styles/composables/ paints chrome that is gated on a
//  composable's state attribute (`[data-aside-open]`, `[data-form-validated]`,
//  `[popover-open]`, etc.). The cascade order — composables sits after
//  surfaces, before modifiers — is what lets a useX widget's geometry beat
//  the surface defaults while still losing to the deliberate modifier
//  signal.
//
//  This test asserts the charter mechanics for the composables layer:
//
//    1. Every composables/_{name}.scss file wraps its rules in
//       `@layer composables` (matches the folder name).
//
//    2. Every file declares at least one selector that contains a
//       composable-state attribute — that's the whole point of the layer.
//       A file with no `[data-*-*]` / `[popover-open]` / `[open]`-style
//       selector is misfiled.
//
//    3. The composables/ folder's siblings are mirrored: every {name}.scss
//       partial corresponds to a `use{Name}` composable in src/browser/
//       composables/ (or is part of a documented exception listed below).
// ============================================================================

import { describe, expect, it } from 'vitest'

const sources = import.meta.glob('../../../../src/styles/composables/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const composableFactories = import.meta.glob('../../../../src/browser/composables/use*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function nameOfPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract name from ${path}`)
	return match[1]
}

// Strip `//` line and CSS/SCSS block comments so commented selectors don't
// count. Use string-form RegExp because the literal form trips vite-oxc's
// tokenizer on the closing-comment escape sequence.
const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

function composableKeyOfPath(path: string): string {
	const match = path.match(/\/(use[A-Z][A-Za-z]+)\.ts$/)
	return match?.[1] ?? ''
}

const composableNames: ReadonlySet<string> = new Set(
	Object.keys(composableFactories)
		.map(composableKeyOfPath)
		.map((key) => key.replace(/^use/, '').toLowerCase()),
)

/**
 * Composable-state markers the framework writes from inside a `use{Name}` /
 * `create{Name}` factory:
 *   - `[data-*]`             — single- or multi-segment data attribute
 *   - `[aria-*='...']`       — ARIA state with explicit value (selected,
 *                              expanded, pressed, checked, current, etc.)
 *   - `[role='...']`         — composable promotes a host element to an
 *                              ARIA role (`tablist`, `tab`, `menu`, …)
 *   - `[open]` / `[popover]` — boolean attribute selectors
 *   - `:popover-open`, `:modal`, `:open` — UA-managed top-layer states
 *
 * The regex is a substring match; we only need any ONE of these to appear
 * somewhere in the file (after comment-stripping) to count the partial as
 * gating on composable state.
 */
const STATE_SELECTOR_REGEX = /\[(?:data-[a-z][a-z0-9-]*|aria-[a-z][a-z0-9-]*=|role=|popover[\]=]|open\])|:popover-open\b|:modal\b|:open\b/

// ── 1. @layer composables wrap ──────────────────────────────────────────────

describe('composables — every partial is wrapped in @layer composables', () => {
	for (const [path, source] of Object.entries(sources)) {
		const name = nameOfPath(path)
		it(`_${name}.scss is wrapped in @layer composables`, () => {
			expect(/@layer\s+composables\b/.test(source)).toBe(true)
		})
	}
})

// ── 2. Every file references at least one composable-state selector ────────

describe('composables — every partial gates on a composable-state selector', () => {
	for (const [path, source] of Object.entries(sources)) {
		const name = nameOfPath(path)
		it(`_${name}.scss uses a composable-state selector ([data-*], [aria-*], [role=…], [open], :popover-open, :modal, :open)`, () => {
			const stripped = stripComments(source)
			expect(
				STATE_SELECTOR_REGEX.test(stripped),
				`_${name}.scss declares no composable-state selector — should it live in components/ instead?`,
			).toBe(true)
		})
	}
})

// ── 3. Each composables/_{name}.scss has a matching use{Name} factory ──────

describe('composables — every SCSS partial pairs with a use{Name} composable', () => {
	for (const path of Object.keys(sources)) {
		const name = nameOfPath(path)
		it(`use${name[0]!.toUpperCase() + name.slice(1)} composable exists`, () => {
			expect(
				composableNames.has(name),
				`_${name}.scss has no matching src/browser/composables/use${name[0]!.toUpperCase() + name.slice(1)}.ts`,
			).toBe(true)
		})
	}
})
