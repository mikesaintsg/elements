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
//  Everything here MUST stay environment-agnostic: STILL no `node:fs` /
//  `node:path`, STILL no `document` / `window` / Vue / SCSS. Genuine
//  node-only helpers (like `node:fs`-based SCSS loaders) live in
//  `setupServer.ts`; genuine DOM/Vue/SCSS helpers live in
//  `setupBrowser.ts` / `setupStyles.ts`.
//
//  This file ALSO hosts the `@elements/core` invariant test helpers (the
//  shape fixtures + parse↔guard / generator∘guard / prototype-pollution
//  assertions consumed only by the `tests/src/core/**` suites). That is
//  correct, not a leak: `@elements/core` is itself environment-agnostic
//  pure TypeScript — it touches no `node:*` API and no browser/DOM API —
//  so importing it here does NOT make this file environment-specific. It
//  remains the universal agnostic setup, loaded as `setupFiles[0]` by all
//  six projects; an agnostic core import is safe in every one. "Used by
//  only the core project" is not the same as "environment-specific" — this
//  file already hosts agnostic helpers used by only some projects (the
//  SCSS-introspection helpers below are exercised only by guides/styles).
// ============================================================================

import type { ContractShape } from '@elements/core'
import {
	arrayShape,
	compileGenerator,
	compileGuard,
	compileParser,
	createRandom,
	integerShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	recordShape,
	stringShape,
	unionShape,
} from '@elements/core'
import { afterEach, expect, vi } from 'vitest'

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

// ── Single-word-modifier convention ─────────────────────────────────────────
//
// Framework modifier class names are SINGLE words. A kebab/multi-word class
// name is only sanctioned when it is one of:
//   1. a placement corner — `top-start` / `top-end` / `bottom-start` /
//      `bottom-end` (a corner is inherently {block}-{inline}; mirrors the
//      CSS `position-area` keyword pair and the modifiers.ts parity);
//   2. component/composable-namespaced — the name is, or is prefixed by,
//      a real `src/styles/{components,composables}/_{name}.scss` partial
//      basename (the prefix is a namespace, like Tailwind / `.showcase-`);
//   3. `showcase-`-namespaced (showcase-only chrome);
//   4. an explicit, documented allow-list entry.
// Anything else multi-word is a violation — see guides/modifiers.md
// §Anti-rules and the parity tests in tests/guides/modifiers.test.ts +
// tests/src/styles/integration.test.ts.

/** Component/composable partial basenames from a list of SCSS paths. */
export function componentNamespacesFromPaths(paths: Iterable<string>): Set<string> {
	const out = new Set<string>()
	for (const p of paths) {
		const match = p
			.replace(/\\/g, '/')
			.match(/\/(?:components|composables)\/_([a-z][a-z0-9-]*)\.scss$/)
		if (match?.[1]) out.add(match[1])
	}
	return out
}

/**
 * True when `cls` complies with the single-word-modifier convention:
 * single word, or a sanctioned multi-word exception (placement corner,
 * component-namespaced, `showcase-`, or an explicit allow-list entry).
 */
export function classNameIsSanctioned(
	cls: string,
	componentNames: ReadonlySet<string>,
	allow: ReadonlySet<string> = new Set<string>(),
): boolean {
	if (!cls.includes('-')) return true
	if (cls.startsWith('showcase-')) return true
	if (/^(top|bottom)-(start|end)$/.test(cls)) return true
	for (const ns of componentNames) {
		if (cls === ns || cls.startsWith(`${ns}-`)) return true
	}
	return allow.has(cls)
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

// ============================================================================
// === @elements/core invariant test helpers ===
//
//  Shared invariant helpers + shape fixtures every `tests/src/core/**/*.test.ts`
//  suite leans on. Relocated here (superseding the short-lived `setupCore.ts`)
//  because `@elements/core` is environment-agnostic pure TypeScript — see the
//  header above for why this belongs in the universal agnostic setup.
//
//  This section pulls in `@elements/core` (the shape compilers under test) and
//  vitest's `expect` (the invariant assertions below call it directly). That
//  pairing is the canonical soundness contract for the codebase: the
//  parse↔guard (§4) and generator∘guard (§5) statements here are the single
//  source of truth for what "sound" means, and the Phase B soundness fixes
//  (B2–B5) regress against exactly these contracts.
//
//  How it's consumed: every reusable helper, fixture factory, constant, and
//  assertion is exported and imported EXPLICITLY by the sibling
//  `tests/src/core/*.test.ts` suites — never injected as a magic global.
//
//  House style (AGENTS.md §16.1): real implementations, never mocks. Every
//  fixture factory returns a FRESH shape per call so a test that mutates a
//  shape cannot leak into another test.
// ============================================================================

// === Canonical shape fixtures

/**
 * A representative closed object shape: required `name` (non-empty string),
 * required `age` (non-negative integer), optional `bio` (string).
 *
 * @returns A fresh {@link ContractShape} every call so per-test mutation
 *          cannot leak across suites.
 */
export function createPersonShape(): ContractShape {
	return objectShape({
		name: stringShape({ min: 1 }),
		age: integerShape({ min: 0 }),
		bio: optionalShape(stringShape()),
	})
}

/**
 * A nested shape exercising object-in-object and array-of-object: an outer
 * object with an `address` sub-object and a `tags` string array.
 *
 * @returns A fresh nested {@link ContractShape} every call.
 */
export function createNestedShape(): ContractShape {
	return objectShape({
		id: stringShape({ min: 1 }),
		address: objectShape({
			city: stringShape({ min: 1 }),
			zip: stringShape({ min: 1 }),
		}),
		tags: arrayShape(stringShape({ min: 1 })),
	})
}

/**
 * A union shape (`anyOf` JSON Schema) of string | integer.
 *
 * @returns A fresh union {@link ContractShape} every call.
 */
export function createUnionShape(): ContractShape {
	return unionShape(stringShape({ min: 1 }), integerShape({ min: 0 }))
}

/**
 * A one-of shape (`oneOf` JSON Schema) of string | boolean — runtime
 * behaviour matches {@link createUnionShape}; only the emitted keyword
 * differs.
 *
 * @returns A fresh one-of {@link ContractShape} every call.
 */
export function createOneOfShape(): ContractShape {
	return oneOfShape(stringShape({ min: 1 }), integerShape({ min: 0 }))
}

/**
 * A dictionary shape — an open object with no fixed keys whose every value
 * is a number (`recordShape(numberShape())`).
 *
 * @returns A fresh record-dictionary {@link ContractShape} every call.
 */
export function createRecordDictShape(): ContractShape {
	return recordShape(numberShape())
}

// === Prototype pollution

/**
 * The attacker-controlled keys a parser or builder must never let reach
 * `Object.prototype`. Used to construct hostile inputs for
 * {@link assertNoPrototypePollution}.
 */
export const POLLUTION_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype']

/**
 * Assert that running `run()` does not pollute `Object.prototype`.
 *
 * Invariant encoded:
 *
 *   No code path reachable from `run()` may add, change, or remove an own
 *   property of `Object.prototype`. Concretely, after `run()`:
 *     1. `Object.prototype` has the exact same set of own property keys it
 *        had before (no key from {@link POLLUTION_KEYS} — or any other —
 *        was grafted on);
 *     2. a freshly created `{}` exposes no inherited sentinel value (the
 *        `({}).polluted === undefined` style check), proving the prototype
 *        chain was not tainted.
 *
 * The function is pure and deterministic: it snapshots `Object.prototype`'s
 * own keys, plants a uniquely-named sentinel probe to detect chain taint,
 * invokes `run()` (which should feed pollution-keyed input to a parser /
 * builder), asserts the invariant via `expect`, then removes any sentinel
 * it introduced and any own key `run()` grafted on so no global state
 * leaks between tests.
 *
 * @param run - Exercises a parser/builder with pollution-keyed input.
 */
export function assertNoPrototypePollution(run: () => void): void {
	const sentinelKey = `__pollution_sentinel_${Math.random().toString(36).slice(2)}__`
	const before = new Set(Object.getOwnPropertyNames(Object.prototype))

	try {
		run()

		const after = Object.getOwnPropertyNames(Object.prototype)
		const grafted = after.filter((key) => !before.has(key))
		expect(grafted, `run() grafted own keys onto Object.prototype: ${grafted.join(', ')}`).toEqual(
			[],
		)

		// A clean `{}` must not inherit a value at the sentinel key nor at
		// any pollution key — proves the prototype chain stayed untainted.
		const probe: Record<string, unknown> = {}
		expect(
			Reflect.get(probe, sentinelKey),
			'a fresh object inherited a sentinel value — Object.prototype is polluted',
		).toBeUndefined()
		for (const key of POLLUTION_KEYS) {
			if (key === 'constructor') {
				// `constructor` legitimately resolves up the chain to
				// `Object` — assert it is still the native constructor,
				// not an attacker-supplied replacement.
				expect(Reflect.get(probe, key), 'Object.prototype.constructor was replaced').toBe(Object)
				continue
			}
			expect(
				Object.prototype.hasOwnProperty.call(probe, key),
				`a fresh object gained own key "${key}" via prototype pollution`,
			).toBe(false)
		}
	} finally {
		// Clean every own key that wasn't there before (defensive — a
		// failing invariant must not contaminate later tests).
		for (const key of Object.getOwnPropertyNames(Object.prototype)) {
			if (!before.has(key)) {
				Reflect.deleteProperty(Object.prototype, key)
			}
		}
		Reflect.deleteProperty(Object.prototype, sentinelKey)
	}
}

// === Parse ↔ guard symmetry

/**
 * Assert the parse↔guard soundness contract for `shape` over `samples`.
 *
 * Canonical contract (the definition of parse↔guard soundness for the
 * whole codebase):
 *
 *   Let `g = compileGuard(shape)` and `p = compileParser(shape)`. For
 *   every input `x`:
 *
 *     (A) Acceptance preservation — if `g(x)` is true then `p(x)` is not
 *         `undefined`: the parser must accept everything the guard
 *         already deems valid (a value that passes the type test must
 *         survive normalization).
 *
 *     (B) Round-trip validity — if `g(x)` is true then `g(p(x))` is also
 *         true: parsing an already-valid value yields a value that still
 *         satisfies the guard (normalization is guard-stable on accepted
 *         input).
 *
 *     (C) Output soundness — whenever `p(x)` returns a defined value `y`,
 *         `g(y)` is true: the parser never emits a value the guard would
 *         reject (no path produces guard-invalid output, even from input
 *         the guard rejected).
 *
 * `undefined` is the parser's sole failure sentinel, so a shape that
 * legitimately produces `undefined` (e.g. an `optional` whose value is
 * absent) is exercised at the object level, not as a bare sample here.
 *
 * @param shape   - The shape whose parser/guard pair is under test.
 * @param samples - Inputs to check the contract against (mix accepted and
 *                   rejected values for full coverage).
 */
export function assertParseGuardSymmetry(shape: ContractShape, samples: readonly unknown[]): void {
	const guard = compileGuard(shape)
	const parser = compileParser(shape)
	const label = describeShape(shape)

	for (const sample of samples) {
		const printed = printValue(sample)
		const accepted = guard(sample)

		if (accepted) {
			const parsed = parser(sample)
			expect(
				parsed,
				`(A) ${label}: guard accepts ${printed} but parser rejected it (returned undefined)`,
			).not.toBeUndefined()
			expect(
				guard(parsed),
				`(B) ${label}: parsed result of accepted ${printed} no longer satisfies the guard`,
			).toBe(true)
		}

		const parsed = parser(sample)
		if (parsed !== undefined) {
			expect(
				guard(parsed),
				`(C) ${label}: parser produced a guard-invalid value from ${printed}`,
			).toBe(true)
		}
	}
}

// === Generator ∘ guard

/**
 * Assert the generator∘guard soundness contract for `shape` over `seeds`.
 *
 * Canonical contract (the definition of generator∘guard soundness for the
 * whole codebase):
 *
 *   Let `gen(seed) = compileGenerator(shape, createRandom(seed))` and
 *   `g = compileGuard(shape)`. Then:
 *
 *     (A) Validity — for every `seed`, `g(gen(seed))` is true: every
 *         generated value satisfies its own shape's guard (the generator
 *         only ever produces in-contract data).
 *
 *     (B) Determinism — for every `seed`, two independent calls with a
 *         freshly seeded `createRandom(seed)` are structurally deep-equal:
 *         a seed fully determines the output.
 *
 *     (C) Variability — across the provided `seeds`, at least two
 *         structurally distinct outputs are produced, PROVIDED the shape
 *         admits variation. The heuristic: if every seed yields a
 *         deep-equal value the shape is treated as constant-output (e.g.
 *         a single-value literal, an empty-properties object) and the
 *         variability clause is skipped rather than false-failing.
 *
 * @param shape - The shape whose generator is under test.
 * @param seeds - Distinct PRNG seeds (at least two recommended for the
 *                variability clause to be meaningful).
 */
export function assertGeneratorSatisfiesGuard(
	shape: ContractShape,
	seeds: readonly number[],
): void {
	const guard = compileGuard(shape)
	const label = describeShape(shape)
	const outputs: unknown[] = []

	for (const seed of seeds) {
		const first = compileGenerator(shape, createRandom(seed))
		expect(
			guard(first),
			`(A) ${label}: generated value for seed ${seed} fails the shape's own guard`,
		).toBe(true)

		const second = compileGenerator(shape, createRandom(seed))
		expect(
			deepEquals(first, second),
			`(B) ${label}: generator is non-deterministic for seed ${seed}`,
		).toBe(true)

		outputs.push(first)
	}

	// (C) Variability — only assert when the shape actually varied across
	// seeds. A shape every seed collapses to one value (single-value
	// literal, empty object) is constant-output by construction; demanding
	// distinct outputs there would be a false failure.
	const varied = outputs.some((value, index) => index > 0 && !deepEquals(value, outputs[0]))
	if (varied) {
		const distinct = countDistinct(outputs)
		expect(
			distinct,
			`(C) ${label}: generator varied but produced fewer than 2 distinct outputs across ${seeds.length} seeds`,
		).toBeGreaterThanOrEqual(2)
	}
}

// === Cyclic builders

/**
 * Build a self-referential array (`a[0] === a`).
 *
 * Consumers feed this to guards/parsers to assert recursion-safe
 * termination — the compiled function must return `false` / cap depth,
 * never blow the stack with a `RangeError`.
 *
 * @returns An array whose first element is the array itself.
 */
export function makeCyclicArray(): readonly unknown[] {
	const array: unknown[] = []
	array.push(array)
	return array
}

/**
 * Build a self-referential object (`o.self === o`).
 *
 * Consumers feed this to guards/parsers to assert recursion-safe
 * termination — the compiled function must return `false` / cap depth,
 * never blow the stack with a `RangeError`.
 *
 * @returns An object with a `self` key pointing back at the object.
 */
export function makeCyclicObject(): Record<string, unknown> {
	const object: Record<string, unknown> = {}
	object['self'] = object
	return object
}

/**
 * Build a structurally cyclic {@link ContractShape}: an object shape whose
 * `self` property's shape is the object shape itself.
 *
 * The shape is constructed by handing {@link objectShape} a mutable
 * property record, then grafting the returned shape back into that same
 * record — `objectShape` passes the record through by reference, so the
 * cycle is genuine (`shape.properties.self === shape`).
 *
 * Consumers feed this to `compileGuard` / `compileParser` /
 * `compileGenerator` to assert they terminate (return false / cap depth)
 * on a cyclic shape rather than recursing until a `RangeError`.
 *
 * @returns A {@link ContractShape} that references itself.
 */
export function makeCyclicShape(): ContractShape {
	const properties: Record<string, ContractShape> = {
		name: stringShape({ min: 1 }),
	}
	const shape = objectShape(properties)
	properties['self'] = shape
	return shape
}

// === Internal structural utilities (no external deps)

/**
 * Structural deep-equality with `Object.is` leaf semantics (so `NaN`
 * equals `NaN` and `+0` differs from `-0`). Handles nested arrays and
 * plain objects; treats cyclic inputs as unequal-safe by tracking a
 * visited pair set so it cannot itself recurse forever.
 */
export function deepEquals(a: unknown, b: unknown, seen: Set<unknown> = new Set()): boolean {
	if (Object.is(a, b)) {
		return true
	}
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false
	}
	if (seen.has(a)) {
		// Re-entered a cycle — defer to reference identity already
		// covered by the Object.is check above; treat as equal here so a
		// shared cyclic structure does not loop forever.
		return true
	}
	seen.add(a)

	const aArray = Array.isArray(a)
	const bArray = Array.isArray(b)
	if (aArray !== bArray) {
		return false
	}
	if (aArray && bArray) {
		if (a.length !== b.length) {
			return false
		}
		for (let index = 0; index < a.length; index += 1) {
			if (!deepEquals(a[index], b[index], seen)) {
				return false
			}
		}
		return true
	}

	const aKeys = Object.keys(a).sort()
	const bKeys = Object.keys(b).sort()
	if (aKeys.length !== bKeys.length) {
		return false
	}
	for (let index = 0; index < aKeys.length; index += 1) {
		if (aKeys[index] !== bKeys[index]) {
			return false
		}
	}
	for (const key of aKeys) {
		if (!deepEquals(Reflect.get(a, key), Reflect.get(b, key), seen)) {
			return false
		}
	}
	return true
}

/** Count structurally distinct values in a list via {@link deepEquals}. */
export function countDistinct(values: readonly unknown[]): number {
	const distinct: unknown[] = []
	for (const value of values) {
		if (!distinct.some((existing) => deepEquals(existing, value))) {
			distinct.push(value)
		}
	}
	return distinct.length
}

/** A short human-readable tag for a shape, used in failure messages. */
export function describeShape(shape: ContractShape): string {
	if (shape.type === 'object') {
		const keys = Object.keys(shape.properties).join(', ')
		return `object{${keys}}`
	}
	if (shape.type === 'array') {
		return `array<${shape.items.type}>`
	}
	if (shape.type === 'union') {
		return `union(${shape.variants.map((variant) => variant.type).join(' | ')})`
	}
	return shape.type
}

/** Compact, recursion-safe rendering of an arbitrary value for messages. */
export function printValue(value: unknown): string {
	try {
		const seen = new WeakSet<object>()
		return (
			JSON.stringify(value, (_key, current) => {
				if (typeof current === 'object' && current !== null) {
					if (seen.has(current)) {
						return '[Circular]'
					}
					seen.add(current)
				}
				return current
			}) ?? String(value)
		)
	} catch {
		return String(value)
	}
}
