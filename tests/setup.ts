// ============================================================================
//  Base test setup — generic helpers shared across every Vitest project
//  (`srcCore`, `srcBrowser`, `srcStyles`, `appCore`, `appBrowser`).
//
//  Loaded directly by node-environment projects and re-exported by
//  `setupBrowser.ts` via `export * from './setup'` so browser-test files
//  can pull the same primitives from a single import surface.
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

afterEach(() => {
	vi.restoreAllMocks()
})
