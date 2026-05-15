// ============================================================================
//  guides/tokens.md ↔ src/styles/**/_*.scss + src/browser/{patterns,taxonomy}.ts
//
//  The token surface is the framework's public theming contract. Renaming
//  or removing a token is a breaking change for consumers. Two source-
//  level contracts hold across every `--set-*` token the framework ships:
//
//    A. NAMING — every `--set-*` matches `--set-{kebab-case}` shape, and
//                no hyphen-separated segment matches the abbreviation
//                black-list (`bg`, `fg`, `lg`, `sm`, `info`, `btn`, …).
//                Documented in tokens.md.
//
//    B. MOTION — every partial registered in `MOTION_CONTRACT_PARTIALS`
//                (drawers, dialogs, disclosures, alerts, table-row
//                expansion, …) reads from the shared
//                `--set-motion-{duration, timing-function}` tokens so
//                the whole panel family retunes from one `:root`
//                override. Hardcoded duration literals on panel-reveal
//                properties are forbidden.
//
//  Plus a global sanity check: `<html>` ships `interpolate-size:
//  allow-keywords` so the height-tween-from-zero contract works.
//
//  Runtime token resolution (every `--set-*` actually resolves on
//  :root / on an element) lives in `tests/src/styles/tokens.test.ts` —
//  that's a runtime cascade check, not a guide-parity check.
//
//  Pure node — node:fs reads the SCSS sources (Vite's CSS pipeline
//  isn't active in the node-env guides project).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { FORBIDDEN_TOKEN_SEGMENTS, MOTION_CONTRACT_PARTIALS } from '@elements/browser'
import { relativeStylesPath, stripComments } from '../setup'
import { readScssPartials } from '../setupServer'

const sources = readScssPartials(
	'src/styles/elements',
	'src/styles/components',
	'src/styles/composables',
	'src/styles/surfaces',
	'src/styles/modifiers',
)

// ── A. Token naming ────────────────────────────────────────────────────────

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
	const file = relativeStylesPath(path)
	for (const name of tokenNamesIn(source)) sightings.push({ name, file })
}

// Deduplicate — multiple files may declare the same token via fallback chains.
const uniqueTokens: ReadonlyMap<string, string> = (() => {
	const map = new Map<string, string>()
	for (const sighting of sightings) {
		if (!map.has(sighting.name)) map.set(sighting.name, sighting.file)
	}
	return map
})()

describe('naming — every --set-* token matches the documented shape', () => {
	for (const [name, file] of uniqueTokens) {
		// On failure: `${name}` does not match --set-{kebab-case} (in `${file}`).
		it(`${name} (in ${file}) is kebab-case with a --set- prefix`, () => {
			expect(TOKEN_SHAPE.test(name)).toBe(true)
		})
	}
})

describe('naming — no token segment matches the abbreviation black-list', () => {
	for (const [name, file] of uniqueTokens) {
		// On failure: the `offenders` array prints the forbidden segments.
		// Spell the name out — see `src/browser/taxonomy.ts` § FORBIDDEN_TOKEN_SEGMENTS.
		it(`${name} (in ${file}) has no forbidden segment`, () => {
			const segments = name.replace(/^--set-/, '').split('-')
			const offenders = segments.filter((segment) => FORBIDDEN_TOKEN_SEGMENTS.has(segment))
			expect(offenders).toEqual([])
		})
	}
})

// ── B. Motion contract ─────────────────────────────────────────────────────
//
// Every "substantial reveal" surface (disclosure panels, drawers, dialogs,
// alerts, table-row expansion) animates with one shared pair of motion
// tokens so the perceptual feel stays uniform across the whole library.
//
// Drift looks like:
//   transition: block-size 0.25s ease, opacity 0.2s ease-out, …;
//
// Aligned looks like:
//   @include transition((
//     block-size var(--set-motion-duration) var(--set-motion-timing-function),
//     opacity var(--set-motion-duration) ease-out,
//     visibility var(--set-motion-duration) allow-discrete,
//   ));

function sourceFor(relativePath: string): string {
	const match = Object.entries(sources).find(([key]) =>
		key.replace(/\\/g, '/').endsWith(`/${relativePath}`),
	)
	if (!match) throw new Error(`No source loaded for ${relativePath}`)
	return match[1] ?? ''
}

describe('motion — every panel-reveal partial uses the motion-contract tokens', () => {
	for (const { path } of MOTION_CONTRACT_PARTIALS) {
		const source = stripComments(sourceFor(path))
		const hasDuration = source.includes('var(--set-motion-duration)')
		const hasTiming = source.includes('var(--set-motion-timing-function)')

		// On failure: `${path}` is registered in MOTION_CONTRACT_PARTIALS but
		// its non-comment source never references `var(--set-motion-duration)`.
		// Panel reveals MUST read from the shared motion-duration token so
		// the whole panel family retunes from one `:root` override.
		it(`${path} references --set-motion-duration`, () => {
			expect(hasDuration).toBe(true)
		})

		// On failure: `${path}` never references
		// `var(--set-motion-timing-function)`. The iOS-stiff-decel curve
		// must be uniform across drawers, dialogs, disclosures, alerts, and
		// table-row expansions. Opacity entries can keep `ease-out`;
		// discrete entries can keep `allow-discrete` — but block-size /
		// transform / padding-block / etc. must read the shared token.
		it(`${path} references --set-motion-timing-function`, () => {
			expect(hasTiming).toBe(true)
		})
	}
})

// Negative check: panel reveals must not hardcode durations.
//
// Heuristic: in any `transition:` or `@include transition(...)` call inside
// a registered partial, every entry that animates a "panel" property
// (block-size, transform, padding-block, etc.) and uses a hardcoded
// duration literal (`0.25s`, `200ms`) is a drift point.

const PANEL_PROPERTIES: ReadonlySet<string> = new Set([
	'block-size',
	'inline-size',
	'transform',
	'padding-block',
	'padding-inline',
	'border-block-start-width',
	'border-block-end-width',
	'border-inline-start-width',
	'border-inline-end-width',
])

const HARDCODED_DURATION_REGEX = /\b(\d+(?:\.\d+)?)(s|ms)\b/

function extractTransitionLists(source: string): readonly string[] {
	const stripped = stripComments(source)
	const out: string[] = []
	const rawRegex = /transition:\s*([^;]+);/g
	const mixinRegex = /@include\s+transition\s*\(\s*\(([\s\S]+?)\)\s*\)/g
	let match: RegExpExecArray | null
	while ((match = rawRegex.exec(stripped)) !== null) {
		const value = match[1]?.trim()
		if (value && value !== 'none') out.push(value)
	}
	while ((match = mixinRegex.exec(stripped)) !== null) {
		const value = match[1]?.trim()
		if (value) out.push(value)
	}
	return out
}

function splitTransitionEntries(list: string): readonly string[] {
	const out: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < list.length; i += 1) {
		const ch = list[i]
		if (ch === '(') depth += 1
		else if (ch === ')') depth = Math.max(0, depth - 1)
		else if (ch === ',' && depth === 0) {
			const part = list.slice(start, i).trim()
			if (part.length > 0) out.push(part)
			start = i + 1
		}
	}
	const last = list.slice(start).trim()
	if (last.length > 0) out.push(last)
	return out
}

describe('motion — panel-reveal transitions never hardcode duration literals', () => {
	for (const { path } of MOTION_CONTRACT_PARTIALS) {
		const source = sourceFor(path)
		const transitions = extractTransitionLists(source)
		const offenders: string[] = []
		for (const list of transitions) {
			for (const entry of splitTransitionEntries(list)) {
				const firstWord = entry.split(/\s+/)[0]?.trim() ?? ''
				if (!PANEL_PROPERTIES.has(firstWord)) continue
				if (entry.includes('var(--set-motion-duration)')) continue
				// Allow scoped duration tokens that resolve through the cascade.
				if (entry.includes('var(--set-') && entry.includes('-duration)')) continue
				if (HARDCODED_DURATION_REGEX.test(entry)) offenders.push(entry)
			}
		}

		// On failure: the `offenders` array prints each panel-reveal
		// transition entry with a hardcoded duration literal. Replace it
		// with `var(--set-motion-duration)` (or a partial-scoped
		// `--set-{partial}-transition-duration` token) so consumers can
		// retune the whole motion family from one `:root` override.
		it(`${path} has no hardcoded duration on panel-reveal properties`, () => {
			expect(offenders).toEqual([])
		})
	}
})

// ── Sanity check: `interpolate-size: allow-keywords` ships globally ────────

describe('motion — global `interpolate-size: allow-keywords` is declared', () => {
	// On failure: `elements/_html.scss` must declare
	// `interpolate-size: allow-keywords` on `<html>` so panel reveals can
	// animate `block-size: 0 ↔ auto` cleanly across the framework. Without
	// this declaration the keyword endpoint won't resolve to a length the
	// engine can interpolate, and every height-animating panel will snap
	// instead of tweening.
	it('elements/_html.scss declares `interpolate-size: allow-keywords`', () => {
		const source = sourceFor('elements/_html.scss')
		expect(source.includes('interpolate-size: allow-keywords')).toBe(true)
	})
})
