// ============================================================================
//  Per-folder structural contract driver.
//
//  Loads every SCSS partial under src/styles/ and applies the matching
//  FOLDER_CONTRACTS clause from @elements/browser. This file SUBSUMES the
//  earlier _charters.test.ts and composables/_charter.test.ts (both deleted)
//  with a broader contract surface:
//
//    1. LAYER WRAPPER       — every partial wraps its rules in @layer <folder>.
//                              No cross-layer authorship.
//    2. ROOT SELECTOR KIND  — every rule's head (first simple selector) is one
//                              of the folder's allowed kinds. Forbidden kinds
//                              produce a failure message naming the correct
//                              home for the misfiled rule.
//    3. STATE SELECTOR      — every rule in composables/ gates on at least one
//                              composable-state selector. _aside.scss is the
//                              documented exception (behavior-only useAside).
//    4. COMMENT-ONLY POLICY — passthrough stubs allowed in elements/ and
//                              composables/_aside.scss. Forbidden elsewhere.
//    5. TOKEN NAMESPACE     — every --set-*: declaration matches the folder's
//                              namespace policy + the file's exception list.
//
//  Edge cases covered:
//    - Multi-tag partials (elements/_h1-h6.scss).
//    - Nested @layer blocks for pseudo-element global tokens (button.dropdown).
//    - Compound selectors with descendant combinators (body:has(main) > main).
//    - Universal selector justified by CSS Scrollbars L1 inheritance.
//    - Sass nesting (& prefix) for state pseudo-classes inside element rules.
//    - @media / @supports / @container wrappers.
//    - SCSS comments (line + block) stripped before scanning.
//
//  Contract data + helpers live in src/browser/patterns.ts. Adding a new
//  exception goes there, not here — the test is folder-agnostic.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	FOLDER_CONTRACTS,
	STYLE_LAYERS,
	allowedTokenPrefixes,
	classifyHeadSelector,
	exceptionFor,
	hasFreeTokenNamespace,
	hasStateSelector,
	partialBasename,
	partialFolder,
	type StyleLayer,
} from '@elements/browser'

const sources = import.meta.glob(
	'../../../src/styles/{elements,modifiers,surfaces,components,composables}/_*.scss',
	{ query: '?raw', import: 'default', eager: true },
) as Record<string, string>

// ── Comment stripping ──────────────────────────────────────────────────────
//
// Use string-form RegExp because the literal `/\/\*[\s\S]*?\*\//g` form
// trips vite-oxc's tokenizer on the closing-comment escape sequence.
const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

// ── Rule-opener extraction ─────────────────────────────────────────────────
//
// A "rule opener" is anything ending in `{` that introduces a CSS rule body.
// We exclude:
//   - @layer / @media / @supports / @container / @each / @include / @if /
//     @else / @use / @mixin / @function / @keyframes / @starting-style — those
//     open at-rule bodies, not selector bodies.
// Each opener may carry a comma-separated selector list — we split and
// classify each branch.

interface RuleOpener {
	readonly selector: string
	readonly branches: readonly string[]
}

/**
 * Split a selector list on top-level commas only. CSS functional pseudos
 * `:is()`, `:where()`, `:not()`, `:has()`, `[attr~='a,b']` etc. embed commas
 * that must NOT be treated as branch separators.
 */
function splitSelectorBranches(selector: string): readonly string[] {
	const out: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < selector.length; i += 1) {
		const ch = selector[i]
		if (ch === '(' || ch === '[') depth += 1
		else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
		else if (ch === ',' && depth === 0) {
			const branch = selector.slice(start, i).trim()
			if (branch.length > 0) out.push(branch)
			start = i + 1
		}
	}
	const last = selector.slice(start).trim()
	if (last.length > 0) out.push(last)
	return out
}

function extractRuleOpeners(source: string): readonly RuleOpener[] {
	const stripped = stripComments(source)
	const out: RuleOpener[] = []
	const lines = stripped.split('\n')
	let buffer: string[] = []
	for (const line of lines) {
		const trimmed = line.trim()
		if (trimmed.length === 0) {
			if (buffer.length === 0) continue
			continue
		}
		// Track lines that build toward a rule opener — a single rule's
		// selector can span multiple lines (form > label > :is(...) split).
		// We collect until we hit `{`, `;`, or `}`.
		buffer.push(trimmed)
		if (trimmed.endsWith('{')) {
			const text = buffer
				.join(' ')
				.replace(/\s*\{\s*$/, '')
				.trim()
			buffer = []
			// Skip at-rule openers — they don't introduce a selector-keyed
			// rule body in the cascade-rule sense.
			if (text.startsWith('@')) continue
			// Skip pure values (e.g. closing of a multi-line declaration).
			if (text.length === 0) continue
			// `&` prefixes are nested Sass — they qualify the parent
			// selector, not a fresh rule opener. Skip; the parent's
			// classification already gates the rule body.
			if (text.startsWith('&')) continue
			const branches = splitSelectorBranches(text)
			out.push({ selector: text, branches })
		} else if (trimmed.endsWith(';') || trimmed.endsWith('}')) {
			buffer = []
		}
	}
	return out
}

// ── Layer-directive extraction ─────────────────────────────────────────────

function findLayerDirectives(source: string): readonly string[] {
	const out: string[] = []
	const regex = /@layer\s+([a-z][a-z0-9-]*)/gi
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// ── Token-declaration extraction ───────────────────────────────────────────

function tokenDeclarationsIn(source: string): readonly string[] {
	const out = new Set<string>()
	const regex = /(?:^|[\s;{])(--set-[a-z0-9-]+)\s*:/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[1]) out.add(match[1])
	}
	return Array.from(out)
}

/** Extract the segment of a --set-*-token that follows the prefix. */
function tokenPrefixOf(name: string): string {
	const stripped = name.replace(/^--set-/, '')
	const dash = stripped.indexOf('-')
	if (dash === -1) return stripped
	return stripped.slice(0, dash)
}

/**
 * Match a token against an allow-list of prefixes. Handles multi-segment
 * prefixes (e.g. 'popover-hint' on `--set-popover-hint-color`).
 */
function tokenAllowed(name: string, prefixes: readonly string[]): boolean {
	if (prefixes.includes('*')) return true
	for (const prefix of prefixes) {
		if (name === `--set-${prefix}`) return true
		if (name.startsWith(`--set-${prefix}-`)) return true
	}
	return false
}

// ── Inventory ───────────────────────────────────────────────────────────────

interface Partial {
	readonly path: string
	readonly relative: string
	readonly folder: StyleLayer
	readonly basename: string
	readonly source: string
	readonly stripped: string
}

const partials: readonly Partial[] = Object.entries(sources)
	.map(([path, source]): Partial | null => {
		const folder = partialFolder(path)
		if (folder === null) return null
		const basename = partialBasename(path)
		if (basename === '' || basename === 'index') return null
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		return { path, relative, folder, basename, source, stripped: stripComments(source) }
	})
	.filter((p): p is Partial => p !== null)

// ============================================================================
//  1. Layer wrapper — every partial wraps its rules in @layer {folder}
// ============================================================================

describe('contracts — every partial wraps rules in its folder layer', () => {
	for (const partial of partials) {
		const contract = FOLDER_CONTRACTS[partial.folder]
		const exception = exceptionFor(partial.path)
		const commentOnlyAllowed = exception?.comments?.allowed ?? contract.comments.allowed
		const layers = findLayerDirectives(partial.stripped)
		const hasRules = /[^\s]\s*\{/.test(partial.stripped)

		it(`${partial.relative} → wraps in @layer ${partial.folder} (or is a documented comment-only stub)`, () => {
			if (!hasRules) {
				expect(
					commentOnlyAllowed,
					`${partial.relative} is comment-only but the ${partial.folder}/ folder forbids stubs`,
				).toBe(true)
				return
			}
			expect(
				layers,
				`${partial.relative} has rules but no @layer ${partial.folder} wrapper`,
			).toContain(partial.folder)
		})
	}
})

describe('contracts — no partial writes into a foreign layer', () => {
	const layerNames = new Set<string>(STYLE_LAYERS)

	for (const partial of partials) {
		const layers = findLayerDirectives(partial.stripped)
		const foreign = layers.filter(
			(name) => layerNames.has(name as StyleLayer) && name !== partial.folder,
		)
		it(`${partial.relative} → no foreign @layer directives`, () => {
			expect(
				foreign,
				`${partial.relative} writes into foreign layer(s): ${foreign.join(', ')}`,
			).toEqual([])
		})
	}
})

// ============================================================================
//  2. Root selector kind — every rule's head matches the folder allow-list
// ============================================================================

describe('contracts — every rule head is one of the folder allowed selector kinds', () => {
	for (const partial of partials) {
		const contract = FOLDER_CONTRACTS[partial.folder]
		const allowed = new Set(contract.head.allowed)
		const forbidden = new Map(contract.head.forbidden.map((f) => [f.kind, f.recommendation]))
		const openers = extractRuleOpeners(partial.source)

		it(`${partial.relative} → every rule head is allowed in ${partial.folder}/`, () => {
			const violations: string[] = []
			for (const opener of openers) {
				for (const branch of opener.branches) {
					const kind = classifyHeadSelector(branch)
					if (allowed.has(kind)) continue
					if (forbidden.has(kind)) {
						violations.push(`'${branch}' (kind: ${kind}) — ${forbidden.get(kind)}`)
						continue
					}
					if (kind === 'unknown') continue
					violations.push(`'${branch}' (kind: ${kind}) — not in the ${partial.folder}/ allow-list`)
				}
			}
			expect(
				violations,
				`${partial.relative} has ${violations.length} disallowed rule head(s):\n  - ${violations.join('\n  - ')}`,
			).toEqual([])
		})
	}
})

// ============================================================================
//  3. State selector — composables/ must gate every rule on composable state
// ============================================================================

describe('contracts — composables/ partials gate on composable-state selectors', () => {
	for (const partial of partials) {
		if (partial.folder !== 'composables') continue
		const exception = exceptionFor(partial.path)
		if (exception?.state?.required === false) continue
		it(`${partial.relative} → at least one rule references a composable-state selector`, () => {
			expect(
				hasStateSelector(partial.stripped),
				`${partial.relative} has no [data-*] / [aria-*=…] / [role=…] / [open] / :popover-open / :modal / :open selector — ` +
					`rules belong in components/ or elements/ unless gated on composable state`,
			).toBe(true)
		})
	}
})

// ============================================================================
//  4. Token namespace — every --set-* declaration matches the folder policy
// ============================================================================

describe('contracts — every --set-* declaration matches the folder token namespace', () => {
	for (const partial of partials) {
		if (hasFreeTokenNamespace(partial.path)) continue // composables / components-with-free are unrestricted
		const allowed = allowedTokenPrefixes(partial.path)
		const tokens = tokenDeclarationsIn(partial.stripped)

		it(`${partial.relative} → declares only --set-{${allowed.join('|')}}-* tokens`, () => {
			const violations: string[] = []
			for (const token of tokens) {
				if (tokenAllowed(token, allowed)) continue
				violations.push(`${token} (prefix '${tokenPrefixOf(token)}' not allowed)`)
			}
			expect(
				violations,
				`${partial.relative} declares ${violations.length} out-of-namespace token(s):\n  - ${violations.join('\n  - ')}\n` +
					`Allowed prefixes: ${allowed.join(', ')}`,
			).toEqual([])
		})
	}
})

// ============================================================================
//  5. composables/ filename ↔ factory parity
// ============================================================================

describe('contracts — every composables/_{name}.scss has a matching use{Name} factory', () => {
	const factorySources = import.meta.glob('../../../src/browser/factories/create*.ts', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>

	const factoryNames = new Set(
		Object.keys(factorySources).map((p) => {
			const match = p.match(/create([A-Z][A-Za-z]+)\.ts$/)
			return match?.[1]?.toLowerCase() ?? ''
		}),
	)

	for (const partial of partials) {
		if (partial.folder !== 'composables') continue
		it(`${partial.relative} → matching create${partial.basename[0]!.toUpperCase() + partial.basename.slice(1)}.ts factory exists`, () => {
			expect(
				factoryNames.has(partial.basename),
				`${partial.relative} has no matching src/browser/factories/create${
					partial.basename[0]!.toUpperCase() + partial.basename.slice(1)
				}.ts factory`,
			).toBe(true)
		})
	}
})

// ============================================================================
//  6. Edge-case sanity — every folder has at least one passing partial
// ============================================================================

describe('contracts — folder inventory sanity', () => {
	for (const folder of STYLE_LAYERS) {
		const folderPartials = partials.filter((p) => p.folder === folder)
		it(`${folder}/ has at least one partial`, () => {
			expect(folderPartials.length).toBeGreaterThan(0)
		})
	}
})
