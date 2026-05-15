// ============================================================================
//  Scope discipline — flatten cross-cutting modifier rules.
//
//  A cross-cutting modifier rule is a selector that combines:
//    - an attribute / pseudo head (e.g. `[popover]`, `::backdrop`)
//    - one or more modifier-vocabulary class qualifiers (`.top`, `.subtle`,
//      `.disabled`, etc.)
//
//  Two anti-patterns this test catches:
//
//    1. CHAINED NOTS — `[popover]:not(aside):not(nav):not(output).top`.
//       Each `:not(tag)` adds 0,0,1 to specificity; three of them inflate
//       the rule to 0,2,3 instead of 0,2,0. Collapse to
//       `:not(:where(t1, t2, t3))` — `:where()` contributes 0 to
//       specificity, keeping the rule flat in the cascade.
//
//    2. UNSCOPED CROSS-CUTTING — `[popover].top` with no `:not()`,
//       `:is()`, or `:where()` scoping. Applies to every popover host
//       including those with intrinsic placement chrome (aside drawers,
//       nav rails, output toasts). Future popover-able elements would
//       silently inherit the rule.
//
//  See `guides/patterns.md` § "Scope discipline" for the cascade-design
//  rationale and the patterns we accept.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	classQualifiers,
	classifyHeadSelector,
	hasChainedTagNots,
	hasScopingFunction,
	modifiers,
} from '@elements/browser'
import { leaves, stripComments } from '../../setupStyles'

const sources = import.meta.glob(
	'../../../src/styles/{elements,modifiers,surfaces,components,composables}/_*.scss',
	{ query: '?raw', import: 'default', eager: true },
) as Record<string, string>

// ── Rule opener extraction ─────────────────────────────────────────────────
//
// Find every rule opener — a non-at-rule line ending with `{`. Selectors
// may span multiple lines; collect until the brace appears.

function extractRuleOpeners(source: string): readonly string[] {
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
			if (text.startsWith('@')) continue // at-rule
			if (text.length === 0) continue
			if (text.startsWith('&')) continue // nested Sass — qualifies parent
			out.push(text)
		} else if (trimmed.endsWith(';') || trimmed.endsWith('}')) {
			buffer = []
		}
	}
	return out
}

const MODIFIER_VOCABULARY: ReadonlySet<string> = new Set(leaves(modifiers))

/**
 * True when the selector is a "cross-cutting modifier compound" — the
 * specific shape subject to the scope-discipline check. Three conditions
 * must hold:
 *
 *   1. EVERY branch of the selector list has an attribute or pseudo HEAD
 *      (the first simple selector). Tag heads are already element-scoped
 *      and don't bleed across element types.
 *
 *   2. The selector qualifies with at least one class from the cross-
 *      cutting modifier vocabulary (`.primary`, `.large`, `.subtle`,
 *      `.disabled`, `.top`, etc.).
 *
 *   3. (Implicit from 1+2) The rule is a broad attribute / pseudo rule
 *      narrowed by a modifier class — exactly the bleeding-risk shape.
 *
 * Examples that match (cross-cutting):
 *   `[popover].top`
 *   `:not(:where(aside, nav, output))[popover].bottom-start`
 *
 * Examples that don't match (already tag-scoped, no risk):
 *   `output[popover].drawer`           — head is `output` (tag)
 *   `nav[aria-label='X'] > ol > li.active` — head is `nav` (tag)
 *   `button.dropdown`                  — head is `button` (tag)
 *   `dialog.scrollable[open]`          — head is `dialog` (tag)
 *
 * Examples that don't match (no modifier qualifier):
 *   `[popover]`                        — no modifier class
 *   `[popover] menu`                   — modifier is on the descendant
 */
function isCrossCuttingModifierRule(selector: string): boolean {
	// Split branches respecting paren-depth so `:is(a, b)` and `:where(c, d)`
	// don't break apart. Pure simple split; the test below classifies the
	// head of each branch and rejects if any head isn't broad.
	const branches: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < selector.length; i += 1) {
		const ch = selector[i]
		if (ch === '(' || ch === '[') depth += 1
		else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
		else if (ch === ',' && depth === 0) {
			const branch = selector.slice(start, i).trim()
			if (branch.length > 0) branches.push(branch)
			start = i + 1
		}
	}
	const last = selector.slice(start).trim()
	if (last.length > 0) branches.push(last)

	// Every branch's head must be broad (attribute, pseudo-element,
	// pseudo-class, or wildcards). A single tag-headed branch makes the
	// rule element-scoped — not subject to this discipline.
	const broadKinds: ReadonlySet<string> = new Set([
		'attribute',
		'data-attribute',
		'aria-attribute',
		'role-attribute',
		'pseudo-element',
		'pseudo-class',
		'universal',
	])
	const allBroad = branches.every((branch) => broadKinds.has(classifyHeadSelector(branch)))
	if (!allBroad) return false

	// Must qualify with at least one modifier-vocabulary class.
	const classes = classQualifiers(selector)
	return classes.some((c) => MODIFIER_VOCABULARY.has(c))
}

// ============================================================================
//  1. No chained :not(tag):not(tag) — collapse to :not(:where(t1, t2, ...))
// ============================================================================

describe('scope — chained :not(tag) / :not([attr]) qualifiers are forbidden (collapse to :not(:where(...)))', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')
		const openers = extractRuleOpeners(source)
		const offenders = openers.filter(hasChainedTagNots)

		// On failure: the `offenders` array prints each chained-:not selector.
		// Each :not(tag) adds 0,0,1 and each :not([attr]) adds 0,1,0 to
		// specificity. Collapse to :not(:where(t1, t2, ...)) so the
		// exception list contributes 0 to specificity. (Pseudo-class :not()
		// chains like :not(:first-child):not(:last-child) are exempt.) See
		// guides/patterns.md § "Scope discipline".
		it(`${relative} uses no chained :not(tag):not(tag) or :not([attr]):not([attr]) patterns`, () => {
			expect(offenders).toEqual([])
		})
	}
})

// ============================================================================
//  2. Cross-cutting modifier rules must scope their tag set
// ============================================================================

describe('scope — cross-cutting modifier rules must enumerate their scope', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = path.replace(/^.*\/src\/styles\//, 'src/styles/')

		// _local.scss is the home for element-local modifiers — every rule
		// there is already tag-scoped (`form.row`, `button.dropdown`), so
		// the cross-cutting compound pattern never appears there.
		if (relative.endsWith('modifiers/_local.scss')) continue

		const openers = extractRuleOpeners(source).filter(isCrossCuttingModifierRule)

		for (const selector of openers) {
			// On failure: cross-cutting modifier rule `${selector}` has no
			// explicit scope. Add either:
			//   - a :not(:where(t1, t2, ...)) blocklist (preferred for narrow exceptions), or
			//   - an :is(t1, t2, ...) allowlist (for bounded element sets).
			// Unscoped cross-cutting rules bleed into every host of the attribute.
			it(`${relative} → '${selector}' has explicit scope (\`:not(:where(...))\` or \`:is(...)\`)`, () => {
				expect(hasScopingFunction(selector)).toBe(true)
			})
		}
	}
})

// ============================================================================
//  3. Edge-case sanity — the patterns we accept
// ============================================================================

describe('scope — accepted patterns', () => {
	it('isCrossCuttingModifierRule recognizes the canonical popover-placement form', () => {
		expect(isCrossCuttingModifierRule('[popover].top')).toBe(true)
		expect(isCrossCuttingModifierRule('[popover]:not(:where(aside, nav, output)).top')).toBe(true)
	})

	it('isCrossCuttingModifierRule excludes tag-headed rules (already element-scoped)', () => {
		expect(isCrossCuttingModifierRule('form.row')).toBe(false)
		expect(isCrossCuttingModifierRule('button.dropdown')).toBe(false)
		expect(isCrossCuttingModifierRule('dialog.scrollable[open]')).toBe(false)
		expect(isCrossCuttingModifierRule('output[popover].drawer')).toBe(false)
		expect(isCrossCuttingModifierRule("nav[aria-label='Breadcrumb'] > ol > li.active")).toBe(false)
	})

	it('isCrossCuttingModifierRule excludes attribute-only rules (no modifier class)', () => {
		expect(isCrossCuttingModifierRule('[popover]')).toBe(false)
		expect(isCrossCuttingModifierRule('[data-toast-stack]')).toBe(false)
	})

	it('isCrossCuttingModifierRule excludes mixed-head selector lists with a tag branch', () => {
		// If ANY branch is tag-headed, the whole rule is treated as element-scoped.
		expect(isCrossCuttingModifierRule('[popover].top, output.toast')).toBe(false)
	})

	it('hasChainedTagNots catches tag-chain anti-pattern', () => {
		expect(hasChainedTagNots('[popover]:not(aside):not(nav).top')).toBe(true)
		expect(hasChainedTagNots('[popover]:not(aside):not(nav):not(output)')).toBe(true)
		expect(hasChainedTagNots('input:not([type=checkbox]):not([type=radio])')).toBe(true)
	})

	it('hasChainedTagNots accepts single :not() and flattened :not(:where(...))', () => {
		expect(hasChainedTagNots('[popover]:not(:where(aside, nav, output))')).toBe(false)
		expect(hasChainedTagNots(':not(.foo)')).toBe(false)
		expect(hasChainedTagNots(':not(aside)')).toBe(false)
	})

	it('hasChainedTagNots exempts pseudo-class chains', () => {
		expect(hasChainedTagNots(':not(:first-child):not(:last-child)')).toBe(false)
		expect(hasChainedTagNots(':not(:placeholder-shown):not(:focus)')).toBe(false)
		expect(hasChainedTagNots('button:not(:disabled):not(.loading)')).toBe(false)
	})

	it('hasScopingFunction accepts :where() and :is()', () => {
		expect(hasScopingFunction(':not(:where(aside, nav))')).toBe(true)
		expect(hasScopingFunction(':is(dialog, menu)[popover]')).toBe(true)
		expect(hasScopingFunction(':where(button, a)')).toBe(true)
	})

	it('hasScopingFunction rejects unscoped selectors', () => {
		expect(hasScopingFunction('[popover].top')).toBe(false)
		expect(hasScopingFunction('::backdrop')).toBe(false)
	})

	it('classQualifiers extracts class names from compound selectors', () => {
		expect(classQualifiers('[popover].top')).toEqual(['top'])
		expect(classQualifiers('button.primary.large')).toEqual(['primary', 'large'])
		expect(classQualifiers(':is(aside, nav)[popover].drawer')).toEqual(['drawer'])
		expect(classQualifiers('h1')).toEqual([])
	})
})
