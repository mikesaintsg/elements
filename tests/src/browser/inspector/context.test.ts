// ============================================================================
//  context family — `context/parent-model` rule.
//
//  Real DOM per AGENTS §16.2 (no mocks). A clean tree (parent does not
//  constrain its children, or the child is a permitted segment tag) yields
//  no finding; a dirty tree (a non-permitted tag inside a parent whose
//  schema `required` sequence constrains its children) yields exactly the
//  `context/parent-model` finding. Perturbation: seeded synthetic
//  permitted/forbidden child placements are reproducible from their seed,
//  and the suite bites when the rule is wrong (a permitted child must NOT
//  produce a finding).
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const contextRule = ruleById('context/parent-model')

describe('rules — context/parent-model', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	function el(tag: string, children: readonly Element[] = []): Element {
		const node = document.createElement(tag)
		for (const child of children) node.appendChild(child)
		return node
	}

	// Run the rule over every node of a subtree, returning all its findings.
	function findingsFor(root: Element): ReturnType<typeof contextRule.evaluate>[] {
		const walker = new Walker(root)
		const out: ReturnType<typeof contextRule.evaluate>[] = []
		for (const node of walker.walk()) {
			out.push(contextRule.evaluate(node, walker.context(node)))
		}
		return out
	}

	describe('clean trees produce no finding', () => {
		it('<div> (no `required` sequence) is outside the context family', () => {
			// `context/parent-model` fires ONLY on a parent with a `required`
			// sequence; `<div>` has none, so it never produces a context
			// finding. This is NOT "div does not constrain its children" —
			// `<div>` permits flow content, which the `content/category`
			// family enforces (see content.test.ts). This legal tree
			// (p/span/table are all flow, div permits flow) yields zero from
			// the context rule because the context family simply does not own
			// this parent — the disjoint-coverage boundary, not a gap.
			const root = el('div', [el('p'), el('span'), el('table')])
			container.appendChild(root)
			expect(findingsFor(root).every((finding) => finding === null)).toBe(true)
		})

		it('a permitted segment child (<li> inside <ul>) is clean', () => {
			const root = el('ul', [el('li'), el('li')])
			container.appendChild(root)
			expect(findingsFor(root).every((finding) => finding === null)).toBe(true)
		})

		it('script-supporting (<script>) is always permitted in a constrained parent', () => {
			const root = el('ul', [el('li'), el('script'), el('template')])
			container.appendChild(root)
			expect(findingsFor(root).every((finding) => finding === null)).toBe(true)
		})
	})

	describe('dirty trees produce exactly the context finding', () => {
		it('<div> directly inside <ul> (constrained to li/script/template) is flagged', () => {
			const bad = el('div')
			const root = el('ul', [el('li'), bad])
			container.appendChild(root)

			const findings = findingsFor(root).filter((finding) => finding !== null)
			expect(findings).toHaveLength(1)
			const finding = findings[0]
			if (finding == null) throw new Error('expected one finding')
			expect(finding.rule).toBe('context/parent-model')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(bad)
			expect(finding.cite).toBe('groupings#the-ul-element')
			expect(finding.actual).toBe('div')
			expect(finding.message).toContain('<div> is not allowed as a child of <ul>')
			expect(finding.path[0]).toBe(bad)
		})

		it('<p> inside <tr> (constrained to td/th/script/template) is flagged', () => {
			const bad = el('p')
			const root = el('tr', [el('td'), bad])
			container.appendChild(root)
			const findings = findingsFor(root).filter((finding) => finding !== null)
			expect(findings.some((finding) => finding?.element === bad)).toBe(true)
		})
	})

	describe('perturbation — the rule bites (seeded, reproducible)', () => {
		// Constrained parents and their permitted vs. forbidden child tags,
		// read straight from the schema constraints the rule is driven by.
		const PERMITTED: ReadonlyArray<readonly [string, string]> = [
			['ul', 'li'],
			['ol', 'li'],
			['tr', 'td'],
			['tr', 'th'],
			['select', 'option'],
		]
		const FORBIDDEN: ReadonlyArray<readonly [string, string]> = [
			['ul', 'div'],
			['ol', 'p'],
			['tr', 'span'],
			['select', 'div'],
		]

		it('same seed → identical placement → identical verdict', () => {
			for (const seed of [1, 42, 1337, 65535]) {
				const random = createRandom(seed)
				const pair =
					random() < 0.5
						? PERMITTED[Math.floor(random() * PERMITTED.length)]
						: FORBIDDEN[Math.floor(random() * FORBIDDEN.length)]
				if (pair === undefined) throw new Error('fixture: empty pair')
				const [parentTag, childTag] = pair
				const isPermitted = PERMITTED.some(([p, c]) => p === parentTag && c === childTag)

				const buildOnce = (): boolean => {
					const child = el(childTag)
					const root = el(parentTag, [child])
					container.appendChild(root)
					const walker = new Walker(root)
					const finding = contextRule.evaluate(child, walker.context(child))
					root.remove()
					return finding !== null
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				// A permitted child must NOT flag; a forbidden one MUST — this
				// is the perturbation that fails if the rule is wrong.
				expect(first).toBe(!isPermitted)
			}
		})
	})
})
