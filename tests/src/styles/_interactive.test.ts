// ============================================================================
//  Interactive-element accessibility contracts.
//
//  The framework paints interaction chrome (hover / focus / active /
//  disabled) on a closed set of native HTML elements declared in
//  `INTERACTIVE_ELEMENTS` (src/browser/patterns.ts). Every member of that
//  set is held to two accessibility-critical contracts:
//
//    1. FORCED-COLORS COVERAGE — Windows High Contrast strips author
//       colors and replaces them with system tokens. The partial MUST
//       invoke `@include forced-colors { … }` from `_mixins.scss` so
//       the affordance remains visible in HC mode.
//
//    2. FOCUS-VISIBLE DISCIPLINE — keyboard focus chrome MUST use
//       `:focus-visible`. The bare `:focus` form fires on mouse click
//       (visual noise) and is the deviation; `:focus-visible` is the
//       modern accessible primitive.
//
//  An additional cross-folder check fails when ANY partial under
//  `src/styles/` uses a bare `:focus` rule — the rule is accessibility-
//  critical and never element-specific.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	FORCED_COLORS_INCLUDE_REGEX,
	INTERACTIVE_ELEMENTS,
	hasBareFocusRule,
	isInteractive,
} from '@elements/browser'

// Strip comments before scanning so commented-out examples / explanatory
// blocks don't trip the regex. String-form RegExp because the literal form
// trips vite-oxc's tokenizer on the closing-comment escape sequence.
const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

const elementSources = import.meta.glob('../../../src/styles/elements/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const allStylesSources = import.meta.glob('../../../src/styles/**/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function tagOfPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	return match?.[1] ?? ''
}

interface ElementPartial {
	readonly tag: string
	readonly path: string
	readonly relative: string
	readonly stripped: string
}

const elementPartials: readonly ElementPartial[] = Object.entries(elementSources)
	.map(([path, source]) => {
		const tag = tagOfPath(path)
		if (tag === '' || tag === 'index') return null
		return {
			tag,
			path,
			relative: path.replace(/^.*\/src\/styles\//, 'src/styles/'),
			stripped: stripComments(source),
		}
	})
	.filter((p): p is ElementPartial => p !== null)

// ============================================================================
//  1. INTERACTIVE_ELEMENTS registry shape
// ============================================================================

describe('interactive — registry shape', () => {
	it('is a non-empty set of single-word tag names', () => {
		expect(INTERACTIVE_ELEMENTS.size).toBeGreaterThan(0)
		for (const tag of INTERACTIVE_ELEMENTS) {
			expect(tag).toMatch(/^[a-z][a-z0-9-]*$/)
		}
	})

	it('every member has a matching elements/_{tag}.scss partial', () => {
		const partialTags = new Set(elementPartials.map((p) => p.tag))
		for (const tag of INTERACTIVE_ELEMENTS) {
			expect(
				partialTags.has(tag),
				`INTERACTIVE_ELEMENTS lists '${tag}' but no elements/_${tag}.scss partial exists`,
			).toBe(true)
		}
	})

	it('isInteractive() agrees with the set', () => {
		for (const tag of INTERACTIVE_ELEMENTS) {
			expect(isInteractive(tag)).toBe(true)
		}
		expect(isInteractive('p')).toBe(false)
		expect(isInteractive('section')).toBe(false)
		expect(isInteractive('xyz-not-a-tag')).toBe(false)
	})
})

// ============================================================================
//  2. Forced-colors coverage — every interactive element invokes the mixin
// ============================================================================

describe('interactive — forced-colors coverage', () => {
	for (const partial of elementPartials) {
		if (!isInteractive(partial.tag)) continue
		it(`${partial.relative} invokes @include forced-colors`, () => {
			expect(
				FORCED_COLORS_INCLUDE_REGEX.test(partial.stripped),
				`${partial.relative} is an interactive element but does not invoke @include forced-colors. ` +
					`Windows High Contrast mode strips author colors — the partial must paint a system-token ` +
					`fallback via the mixin from _mixins.scss.`,
			).toBe(true)
		})
	}
})

// ============================================================================
//  3. Focus-visible discipline — every interactive element uses :focus-visible
// ============================================================================

describe('interactive — every interactive element declares a :focus-visible rule', () => {
	for (const partial of elementPartials) {
		if (!isInteractive(partial.tag)) continue
		// _summary.scss focuses through its parent <details>; _label.scss
		// inherits :focus-within from its associated control. Both
		// legitimately have no own :focus-visible rule.
		if (partial.tag === 'summary' || partial.tag === 'label') continue
		it(`${partial.relative} declares :focus-visible chrome`, () => {
			expect(
				/:focus-visible/.test(partial.stripped),
				`${partial.relative} is an interactive element but does not declare a :focus-visible rule. ` +
					`The framework's focus contract requires every interactive element to paint a focus ring ` +
					`via :focus-visible.`,
			).toBe(true)
		})
	}
})

// ============================================================================
//  4. Bare :focus is forbidden anywhere in src/styles/
// ============================================================================

describe('interactive — no partial uses bare :focus rule (always :focus-visible)', () => {
	for (const [path, source] of Object.entries(allStylesSources)) {
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const stripped = stripComments(source)
		it(`${relative} uses :focus-visible, never bare :focus`, () => {
			expect(
				hasBareFocusRule(stripped),
				`${relative} declares a bare \`:focus\` rule. Bare :focus fires on mouse click ` +
					`and produces visual noise. Use :focus-visible instead — it distinguishes keyboard ` +
					`focus from mouse focus. (Bare :focus inside :not(:focus), :is(:focus, …), ` +
					`:where(:focus), :has(:focus) is exempt — those are legitimate negation / grouping.)`,
			).toBe(false)
		})
	}
})

// ============================================================================
//  5. Edge-case sanity checks
// ============================================================================

describe('interactive — registry coherence', () => {
	it('every interactive element is in the taxonomy as substantive or composable', () => {
		// Implicit cross-check: if the element partial exists (verified
		// above) AND the taxonomy parity test passes (separate test), the
		// taxonomy classification is correct by transitive parity. This
		// test asserts the chain holds explicitly.
		for (const tag of INTERACTIVE_ELEMENTS) {
			const partial = elementPartials.find((p) => p.tag === tag)
			expect(partial, `INTERACTIVE_ELEMENTS '${tag}' has no partial`).toBeDefined()
			// Substantive partials declare at least one --set-{tag}-* token;
			// every interactive element must be substantive (interaction
			// chrome implies token-driven retunability).
			const hasToken = new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`).test(partial!.stripped)
			expect(
				hasToken,
				`${partial!.relative} is interactive but declares no --set-${tag}-* tokens. ` +
					`Interactive elements must expose tokens for consumer retuning.`,
			).toBe(true)
		}
	})
})
