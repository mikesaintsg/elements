// ============================================================================
//  Base test setup — environment-agnostic helpers shared across every
//  Vitest project (`srcCore`, `srcBrowser`, `srcStyles`, `guides`,
//  `appCore`, `appBrowser`).
//
//  Configured first in every project's `setupFiles` array so the
//  afterEach hook below runs on every test no matter the environment:
//
//      setupFiles: ['./tests/setup.ts', …]
//
//  Test files import these helpers DIRECTLY from this module
//  (`'./setup'` / `'../setup'`) — not through `setupBrowser.ts` or
//  `setupStyles.ts`, which only ship the DOM-only helpers on top.
//
//  Everything here MUST stay environment-agnostic (no `node:fs`,
//  no `document`). Node-only helpers (like `node:fs`-based SCSS
//  loaders) live in project-local helpers files such as
//  `tests/guides/_helpers.ts`.
// ============================================================================

import { afterEach, vi } from 'vitest'

interface TestRecorderInterface<TArgs extends readonly unknown[]> {
	readonly calls: readonly TArgs[]
	readonly count: number
	readonly handler: (...args: TArgs) => void
	clear(): void
}

export function extractProperty(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined
	return Reflect.get(value, key)
}

export function createRecorder<TArgs extends readonly unknown[]>(): TestRecorderInterface<TArgs> {
	const calls: TArgs[] = []
	return {
		get calls() {
			return calls
		},
		get count() {
			return calls.length
		},
		handler(...args: TArgs): void {
			calls.push(args)
		},
		clear(): void {
			calls.length = 0
		},
	}
}

export function waitForDelay(ms = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Recursively collect every string leaf in a nested object tree. Used by
 * TS↔SCSS parity tests to flatten the frozen `tokens.ts` / `modifiers.ts`
 * trees into the set of declared identifiers.
 */
export function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

// ── Guide doc parsing ──────────────────────────────────────────────────────
//
// The guides under `guides/*.md` are the documentation surface for the
// framework. Parity tests in `tests/src/guides/` read each guide via Vite's
// `?raw` query and assert the documented identifiers match what the TS /
// SCSS surfaces actually ship. These helpers are the shared parser for
// every guide-parity test — keep them generic; guide-specific knowledge
// stays in the test that uses them.

/**
 * Find the FIRST markdown table row whose label cell is `**heading**` and
 * return the next cell's raw content. Used to pull a row's value column out
 * of a bold-labeled table (the standard shape across the guides). Returns
 * the empty string when no row matches.
 */
export function tableCellFor(doc: string, heading: string): string {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const rowRegex = new RegExp(`\\|\\s*\\*\\*${escaped}\\*\\*[^|]*\\|([^|]+)\\|`, 'i')
	const match = doc.match(rowRegex)
	return match?.[1] ?? ''
}

/**
 * Pull every backtick-quoted identifier out of `text`. Parenthesized
 * commentary is stripped first so "(no `.medium` — bare element is medium)"
 * doesn't surface `medium` as a documented value.
 *
 * - `{ prefix: '.' }` matches `\`.{name}\`` (modifier class), returns `{name}`.
 * - `{ prefix: '--' }` matches `\`--{name}\`` (custom property), keeps the
 *   `--` prefix in the returned identifier (the prefix is part of the
 *   custom-property identity).
 * - `{ prefix: '<' }` matches `\`<{tag}>\`` (HTML element), returns `{tag}`.
 * - default: matches `\`{name}\`` (any bare identifier), returns `{name}`.
 */
export function extractBacktickedNames(
	text: string,
	options: { readonly prefix?: '.' | '--' | '<' } = {},
): readonly string[] {
	const sanitized = text.replace(/\([^)]*\)/g, '')
	const prefix = options.prefix
	const pattern =
		prefix === '--'
			? /`(--[a-z][a-z0-9-]*)`/gi
			: prefix === '.'
				? /`\.([a-z][a-z0-9-]*)`/gi
				: prefix === '<'
					? /`<([a-z][a-z0-9-]*)>`/gi
					: /`([a-z][a-z0-9-]*)`/gi
	const out: string[] = []
	let match: RegExpExecArray | null
	while ((match = pattern.exec(sanitized)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// ── SCSS source introspection ──────────────────────────────────────────────
//
// Test files glob SCSS partials as raw strings via `import.meta.glob(...,
// { query: '?raw' })` and assert against the raw source. These helpers are
// the shared vocabulary every contract / parity test reaches for. String-
// form RegExps for the comment matchers because the literal `\*/` trips
// vite-oxc's tokenizer on the closing-comment escape sequence.
//
// Node-safe (no DOM). Live in `setup.ts` so they're available to the
// `guides` Vitest project (node env) as well as `src:browser` / `src:styles`
// (browser env via `setupBrowser` / `setupStyles` which re-export `setup`).

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

/** Strip SCSS line + block comments from a raw partial source. */
export function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

/**
 * Extract the `{tag}` segment from an `_{tag}.scss` partial path. Throws
 * when the path doesn't match — paths come from `import.meta.glob` patterns
 * that already constrain the shape, so a miss is a programmer error.
 */
export function tagFromPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract tag from ${path}`)
	return match[1]
}

/** True when `source` declares `--set-{prefix}-{suffix}: ...`. */
export function declaresToken(source: string, prefix: string, suffix: string): boolean {
	const escaped = suffix.replace(/-/g, '\\-')
	return new RegExp(`--set-${prefix}-${escaped}\\s*:`).test(source)
}

/** True when `source` declares any `--set-{tag}-*` custom property. */
export function declaresElementToken(source: string, tag: string): boolean {
	return new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`, 'i').test(source)
}

/**
 * True when `source` invokes either of the framework's motion mixins —
 * `@include transition(...)` (which emits the bare transition + a paired
 * `prefers-reduced-motion: reduce` opt-out) or `@include reduced-motion`
 * (the same opt-out for `animation:` declarations).
 */
export function usesMotionMixin(source: string): boolean {
	return /@include\s+transition\s*\(/.test(source) || /@include\s+reduced-motion\b/.test(source)
}

/**
 * Normalize an absolute or Vite-glob path into a friendly
 * `src/styles/{folder}/_{name}.scss`-style relative form for use in test
 * descriptions and failure messages. Handles backslashes (Windows) and
 * paths with arbitrary leading prefix.
 */
export function relativeStylesPath(path: string): string {
	return path.replace(/\\/g, '/').replace(/^.*\/src\/styles\//, 'src/styles/')
}

/**
 * Pull every rule opener out of a SCSS source — a non-at-rule line ending
 * with `{`. Selectors may span multiple lines; the helper joins until the
 * brace appears. Excluded by design:
 *
 *   - `@layer / @media / @supports / @container / @include / @each / @if /
 *     @else / @use / @mixin / @function / @keyframes / @starting-style` —
 *     at-rules introduce non-selector bodies.
 *   - Lines that start with `&` — those are nested Sass and qualify the
 *     parent selector; the parent's classification already gates the
 *     rule body, so testing only top-level rules covers every shape the
 *     cascade ever sees.
 *
 * Comments are stripped first so commented-out examples don't surface
 * as openers.
 */
export function extractRuleOpeners(source: string): readonly string[] {
	const stripped = stripComments(source)
	const out: string[] = []
	const lines = stripped.split('\n')
	let buffer: string[] = []
	for (const line of lines) {
		const trimmed = line.trim()
		if (trimmed.length === 0) {
			if (buffer.length === 0) continue
			continue
		}
		buffer.push(trimmed)
		if (trimmed.endsWith('{')) {
			const text = buffer
				.join(' ')
				.replace(/\s*\{\s*$/, '')
				.trim()
			buffer = []
			if (text.startsWith('@')) continue
			if (text.length === 0) continue
			if (text.startsWith('&')) continue
			out.push(text)
		} else if (trimmed.endsWith(';') || trimmed.endsWith('}')) {
			buffer = []
		}
	}
	return out
}

/**
 * Pull every bare `.{name}` rule opener out of a SCSS source. Matches the
 * shape `^\s*\.{kebab-name}\s*\{` so compound (`form.row`) or pseudo-chained
 * (`.disabled:hover`) rules don't surface. Comments are NOT stripped — pass
 * `stripComments(source)` when commented-out examples could surface.
 */
const BARE_CLASS_RULE_REGEX = /^\s*\.([a-z][a-z0-9-]*)\s*\{/gim

export function bareClassNamesIn(source: string): readonly string[] {
	const out: string[] = []
	BARE_CLASS_RULE_REGEX.lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = BARE_CLASS_RULE_REGEX.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

/**
 * Pull every `--set-*:` declaration name out of a SCSS source. Returns the
 * unique set of declared token names in source order — multiple declarations
 * of the same name (fallback chains) collapse to one.
 */
const SET_TOKEN_DECLARATION_REGEX = /(?:^|[\s;{])(--set-[a-z0-9-]+)\s*:/g

export function extractSetTokenDeclarations(source: string): readonly string[] {
	const out = new Set<string>()
	SET_TOKEN_DECLARATION_REGEX.lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = SET_TOKEN_DECLARATION_REGEX.exec(source)) !== null) {
		if (match[1]) out.add(match[1])
	}
	return Array.from(out)
}

/**
 * Pull every `@layer NAME` directive name out of a SCSS source. Returns layer
 * names in source order; duplicates are preserved (a file declaring the same
 * `@layer` twice surfaces twice).
 */
const LAYER_DIRECTIVE_REGEX = /@layer\s+([a-z][a-z0-9-]*)/gi

export function findLayerDirectives(source: string): readonly string[] {
	const out: string[] = []
	LAYER_DIRECTIVE_REGEX.lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = LAYER_DIRECTIVE_REGEX.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// ============================================================================
// Tailwind v4 utility class catalog — collision watch list.
//
// Why this exists:
//   The framework lives in `@layer components` (and `elements`, `surfaces`).
//   Tailwind sits in `@layer utilities`, the LAST layer in the merged
//   order. Layered rules from a later layer always beat earlier ones,
//   regardless of selector specificity. So if a Tailwind utility shares a
//   name with a framework modifier (e.g. `.inline`), Tailwind wins —
//   silently — and the framework rule never paints.
//
// What's in this list:
//   Every Tailwind v4 utility class whose ENTIRE class name is a single
//   token (no hyphen-separated value suffix). These are the only ones at
//   risk of colliding with framework modifiers, because every framework
//   modifier is a single semantic English word (`primary`, `small`,
//   `ghost`, `disabled`, etc.).
//
//   Functional utilities (`.bg-blue-500`, `.p-4`, `.text-lg`, etc.) are
//   excluded — the hyphenated value suffix makes a name collision
//   impossible by construction.
//
// How to update:
//   When Tailwind ships a new bare utility, add it here. The conflict
//   detector in `tests/src/styles/integration.test.ts` will then refuse
//   any framework modifier that matches.
//
// Source: https://tailwindcss.com/docs (v4 reference, last reviewed
// 2026-05). Pseudo-class variants and arbitrary values aren't included
// because they can't appear standalone as a class name.
// ============================================================================

export const TAILWIND_SINGLE_TOKEN_UTILITIES: readonly string[] = [
	// ── Display ───────────────────────────────────────────────────────────────
	'block',
	'inline',
	'flex',
	'grid',
	'contents',
	'hidden',
	'table',
	'flow-root',
	'list-item',

	// ── Position ──────────────────────────────────────────────────────────────
	'static',
	'fixed',
	'absolute',
	'relative',
	'sticky',

	// ── Visibility ────────────────────────────────────────────────────────────
	'visible',
	'invisible',
	'collapse',

	// ── Layout helpers ────────────────────────────────────────────────────────
	'isolate',
	'container',
	'truncate',

	// ── Flex/Grid item shorthand ─────────────────────────────────────────────
	'shrink',
	'grow',

	// ── Typography ────────────────────────────────────────────────────────────
	'italic',
	'underline',
	'overline',
	'uppercase',
	'lowercase',
	'capitalize',
	'antialiased',
	'ordinal',
	'normal-nums',

	// ── Borders / decoration ──────────────────────────────────────────────────
	'border',
	'rounded',
	'shadow',
	'ring',
	'outline',

	// ── Behavior ──────────────────────────────────────────────────────────────
	'resize',

	// ── Print / accessibility ─────────────────────────────────────────────────
	'sr-only',

	// ── SVG ───────────────────────────────────────────────────────────────────
	'fill-current',
	'stroke-current',
] as const

afterEach(() => {
	vi.restoreAllMocks()
})
