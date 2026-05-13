// ============================================================================
//  Modifier-class isolation.
//
//  Cross-cutting modifier classes (the five dimensions in modifiers.ts) MUST
//  only be declared as rules inside `src/styles/modifiers/`. A bare `.row {
//  ... }` or `.pill { ... }` rule inside `components/_form.scss` violates the
//  cascade contract — modifiers/ is the conceptual home and the layer-order
//  home for these names, and declaring them elsewhere makes the framework's
//  surface confusing to navigate and unsafe to extend.
//
//  Element-local modifiers (rules like `form.row` that are scoped to a
//  single element type) are allowed outside modifiers/_local.scss only when
//  the selector includes the element prefix. The compound form is unique
//  per element; the bare form is universal and must live in the modifier
//  layer.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { modifiers } from '@elements/browser'
import { TAILWIND_SINGLE_TOKEN_UTILITIES } from '../../setupStyles.ts'

const sources = import.meta.glob('../../../src/styles/{elements,components,surfaces,composables}/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

const MODIFIER_NAMES = new Set(leaves(modifiers))
const TAILWIND_NAMES = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

/**
 * Find bare class selectors at rule start. Compound selectors (`form.row`,
 * `button.dropdown`) are excluded — those are element-local modifiers and
 * have their own home (`modifiers/_local.scss`) and their own test
 * (`tests/src/styles/modifiers/_local.test.ts`).
 *
 * Match shape: optional whitespace, `.`, name, optional whitespace, `{` —
 * with no preceding non-whitespace character on the line (so `&` chains,
 * `body &`, `*.name`, etc. don't trip the test).
 */
const BARE_CLASS_RULE = /^\s*\.([a-z][a-z0-9-]*)\s*\{/gim

function bareClassNamesIn(source: string): readonly string[] {
	const out: string[] = []
	let match: RegExpExecArray | null
	while ((match = BARE_CLASS_RULE.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

describe('isolation — modifier-vocabulary class rules only live in modifiers/', () => {
	for (const [path, source] of Object.entries(sources)) {
		const filename = path.replace(/^.*\/src\/styles\//, 'src/styles/')

		it(`${filename} does not declare a bare .{modifier-name} rule`, () => {
			const offenders = bareClassNamesIn(source).filter((name) => MODIFIER_NAMES.has(name))
			expect(
				offenders,
				`${filename} declares bare rules for modifier names: ${offenders.join(', ')}. ` +
					`Either move the rule to src/styles/modifiers/, or scope it to an element ` +
					`(e.g. \`{tag}.{name}\`) and place it in modifiers/_local.scss.`,
			).toEqual([])
		})
	}
})

describe('isolation — no framework class collides with a Tailwind single-token utility', () => {
	it('every modifier name avoids the Tailwind utility set', () => {
		const collisions = Array.from(MODIFIER_NAMES).filter((name) => TAILWIND_NAMES.has(name))
		expect(
			collisions,
			`modifier names collide with Tailwind utilities: ${collisions.join(', ')}`,
		).toEqual([])
	})
})
