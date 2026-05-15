// ============================================================================
//  Motion contract — `--set-motion-{duration, timing-function}` uniformity.
//
//  Every "substantial reveal" surface in the framework — disclosure
//  panels, drawers, dialogs, alerts, table-row expansion — animates
//  with one shared pair of motion tokens so the perceptual feel stays
//  uniform across the whole library. The reference behavior is
//  `<details>::details-content`'s native animation (Chromium 131+ /
//  Safari 18.4+): height tweens cleanly between 0 and `auto` because
//  `<html>` ships `interpolate-size: allow-keywords` globally;
//  opacity fades alongside; `content-visibility` flips discretely via
//  `transition-behavior: allow-discrete`.
//
//  Drift looks like:
//
//    transition:
//      block-size 0.25s ease,           // ← hardcoded; should be tokens
//      opacity 0.2s ease-out,
//      padding-block 0.25s ease;
//
//  Aligned looks like:
//
//    @include transition((
//      block-size var(--set-motion-duration) var(--set-motion-timing-function),
//      padding-block var(--set-motion-duration) var(--set-motion-timing-function),
//      opacity var(--set-motion-duration) ease-out,
//      visibility var(--set-motion-duration) allow-discrete,
//    ));
//
//  Consumers retune the family at `:root` (every panel slows / speeds
//  together) or per-consumer (`dialog { --set-motion-duration: 400ms }`).
//  The hardcoded-duration form locks the timing to that one author's
//  guess, breaking the global retune contract.
//
//  This test enforces that every partial in `MOTION_CONTRACT_PARTIALS`
//  references BOTH `var(--set-motion-duration)` AND
//  `var(--set-motion-timing-function)` in the partial's source.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { MOTION_CONTRACT_PARTIALS } from '@elements/browser'

const sources = import.meta.glob(
	'../../../src/styles/{elements,modifiers,surfaces,components,composables}/_*.scss',
	{ query: '?raw', import: 'default', eager: true },
) as Record<string, string>

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

function sourceFor(relativePath: string): string {
	const match = Object.entries(sources).find(([key]) => key.endsWith(`/${relativePath}`))
	if (!match) throw new Error(`No source loaded for ${relativePath}`)
	return match[1] ?? ''
}

// ── Per-partial motion-token coverage ──────────────────────────────────────
//
// Coarse check: the partial's source (with comments stripped so the
// "see _tokens.scss for the motion contract" docstring doesn't
// satisfy the check on its own) must reference both motion tokens.

describe('motion — every panel-reveal partial uses the motion-contract tokens', () => {
	for (const { path } of MOTION_CONTRACT_PARTIALS) {
		const source = stripComments(sourceFor(path))
		const hasDuration = source.includes('var(--set-motion-duration)')
		const hasTiming = source.includes('var(--set-motion-timing-function)')

		// On failure: `${path}` is registered in MOTION_CONTRACT_PARTIALS (${reason})
		// but its non-comment source never references `var(--set-motion-duration)`.
		// Panel reveals MUST read from the shared motion-duration token so the
		// whole panel family retunes from one `:root` override. See
		// src/styles/_tokens.scss § "Framework-wide motion contract".
		it(`${path} references --set-motion-duration`, () => {
			expect(hasDuration).toBe(true)
		})

		// On failure: `${path}` is registered in MOTION_CONTRACT_PARTIALS (${reason})
		// but its non-comment source never references `var(--set-motion-timing-function)`.
		// Panel reveals MUST read from the shared motion-timing token so the
		// iOS-stiff-decel curve is uniform across drawers, dialogs, disclosures,
		// alerts, and table-row expansions. Opacity entries can keep `ease-out`;
		// discrete entries can keep `allow-discrete` — but block-size / transform /
		// padding-block / etc. must read `var(--set-motion-timing-function)`.
		it(`${path} references --set-motion-timing-function`, () => {
			expect(hasTiming).toBe(true)
		})
	}
})

// ── Negative check: panel reveals must not hardcode durations ─────────────
//
// Heuristic: in any `transition:` declaration or `@include transition(...)`
// call inside a registered partial, every entry that animates a "panel"
// property (block-size, opacity, transform, padding-block, padding-inline,
// border-*-width, visibility) and uses a hardcoded duration literal
// (`0.25s`, `200ms`, etc.) is a drift point — it should reference one
// of the motion tokens (or `--set-transition-duration` for the small-tint
// tier, when the property is non-panel like color / background-color).
//
// The check is intentionally conservative: it scans ONLY entries whose
// property is unambiguously a panel-reveal property AND the duration is
// a numeric literal (not a `var(...)` reference). False positives are
// rare; false negatives (hardcoded durations buried in a complex
// expression) are tolerated.

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
	// Match `transition: ...;` (raw shorthand) and `@include transition((...));`
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
				// Tokens: 1st is property, then values. Hardcoded duration
				// = first numeric-with-unit token in the entry.
				const firstWord = entry.split(/\s+/)[0]?.trim() ?? ''
				if (!PANEL_PROPERTIES.has(firstWord)) continue
				if (entry.includes('var(--set-motion-duration)')) continue
				// Allow `var(--set-popover-transition-duration)` and similar
				// scoped duration tokens that resolve through the cascade.
				if (entry.includes('var(--set-') && entry.includes('-duration)')) continue
				if (HARDCODED_DURATION_REGEX.test(entry)) offenders.push(entry)
			}
		}

		// On failure: the `offenders` array prints each panel-reveal transition
		// entry with a hardcoded duration literal. Replace the literal with
		// `var(--set-motion-duration)` (or a partial-scoped
		// `--set-{partial}-transition-duration` token that resolves through
		// the cascade) so consumers can retune the whole motion family from
		// one `:root` override.
		it(`${path} has no hardcoded duration on panel-reveal properties`, () => {
			expect(offenders).toEqual([])
		})
	}
})

// ── Sanity check: `interpolate-size: allow-keywords` ships globally ────────
//
// The framework's panel reveals that animate `block-size: 0 ↔ auto`
// rely on `interpolate-size: allow-keywords` being declared at the
// root so the keyword endpoint resolves to a length the engine can
// interpolate. Lives on `<html>` in `_html.scss`. If this declaration
// ever moves or is dropped, every panel that animates auto-keyword
// height will snap instead of tweening — a regression that would
// otherwise be invisible until visual review.

describe('motion — global `interpolate-size: allow-keywords` is declared', () => {
	// On failure: elements/_html.scss must declare
	// `interpolate-size: allow-keywords` on `<html>` so panel reveals can
	// animate `block-size: 0 ↔ auto` cleanly across the framework
	// (details::details-content, table row expansion, alert open / close).
	// Without this declaration the keyword endpoint won't resolve to a
	// length the engine can interpolate, and every height-animating panel
	// will snap instead of tweening.
	it('elements/_html.scss declares `interpolate-size: allow-keywords`', () => {
		const source = sourceFor('elements/_html.scss')
		expect(source.includes('interpolate-size: allow-keywords')).toBe(true)
	})
})
