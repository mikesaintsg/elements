// ============================================================================
//  structure family — the discrete named `entry.constraints`, per `kind`,
//  plus `void-has-children`.
//
//  Real DOM per AGENTS §16.2 (no mocks). Each rule is GENERIC per
//  `ContentConstraintKind`, driven by the schema constraint DATA. Clean
//  trees → no finding; deliberately dirty trees → the exact finding.
//  Perturbation: seeded valid/invalid `<li>` parents are reproducible and
//  the suite bites if `parent-restricted` evaluation is wrong.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const parentRestrictedRule = ruleById('structure/parent-restricted')
const singleFirstChildRule = ruleById('structure/single-first-child')
const edgeChildRule = ruleById('structure/edge-child')
const noSelfNestRule = ruleById('structure/no-self-nest')
const orderRule = ruleById('structure/child-order')
const voidRule = ruleById('structure/void-has-children')

describe('rules — structure family', () => {
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

	function evaluateOn(
		rule: (typeof rules)[number],
		root: Element,
		target: Element,
	): ReturnType<(typeof rules)[number]['evaluate']> {
		const walker = new Walker(root)
		return rule.evaluate(target, walker.context(target))
	}

	// ── parent-restricted ─────────────────────────────────────────────────

	describe('parent-restricted', () => {
		it('clean: <li> inside <ul> is allowed', () => {
			const li = el('li')
			const ul = el('ul', [li])
			container.appendChild(ul)
			expect(evaluateOn(parentRestrictedRule, ul, li)).toBeNull()
		})

		it('dirty: <li> directly inside <div> is flagged', () => {
			const li = el('li')
			const div = el('div', [li])
			container.appendChild(div)
			const finding = evaluateOn(parentRestrictedRule, div, li)
			if (finding === null) throw new Error('expected a parent-restricted finding')
			expect(finding.rule).toBe('structure/parent-restricted')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(li)
			expect(finding.cite).toBe('groupings#the-li-element')
			expect(finding.expected).toContain('ul')
		})

		it('dirty: <td> outside <tr> is flagged', () => {
			const td = el('td')
			const div = el('div', [td])
			container.appendChild(div)
			expect(evaluateOn(parentRestrictedRule, div, td)?.rule).toBe('structure/parent-restricted')
		})
	})

	// ── single-first-child ────────────────────────────────────────────────

	describe('single-first-child', () => {
		it('clean: <summary> as the first child of <details>', () => {
			const summary = el('summary')
			const details = el('details', [summary, el('p')])
			container.appendChild(details)
			expect(evaluateOn(singleFirstChildRule, details, summary)).toBeNull()
		})

		it('dirty: <summary> NOT first in <details> is flagged', () => {
			const summary = el('summary')
			const details = el('details', [el('p'), summary])
			container.appendChild(details)
			expect(evaluateOn(singleFirstChildRule, details, summary)?.rule).toBe(
				'structure/single-first-child',
			)
		})

		it('dirty: <legend> not first in <fieldset> is flagged', () => {
			const legend = el('legend')
			const fieldset = el('fieldset', [el('p'), legend])
			container.appendChild(fieldset)
			expect(evaluateOn(singleFirstChildRule, fieldset, legend)?.rule).toBe(
				'structure/single-first-child',
			)
		})
	})

	// ── edge-child ────────────────────────────────────────────────────────

	describe('edge-child', () => {
		it('clean: <figcaption> as the first child of <figure>', () => {
			const cap = el('figcaption')
			const figure = el('figure', [cap, el('img')])
			container.appendChild(figure)
			expect(evaluateOn(edgeChildRule, figure, cap)).toBeNull()
		})

		it('clean: <figcaption> as the LAST child of <figure>', () => {
			const cap = el('figcaption')
			const figure = el('figure', [el('img'), cap])
			container.appendChild(figure)
			expect(evaluateOn(edgeChildRule, figure, cap)).toBeNull()
		})

		it('dirty: <figcaption> in the MIDDLE of <figure> is flagged', () => {
			const cap = el('figcaption')
			const figure = el('figure', [el('img'), cap, el('p')])
			container.appendChild(figure)
			expect(evaluateOn(edgeChildRule, figure, cap)?.rule).toBe('structure/edge-child')
		})
	})

	// ── no-self-nest ──────────────────────────────────────────────────────

	describe('no-self-nest', () => {
		it('clean: an <a> with no nested <a>', () => {
			const a = el('a', [el('span')])
			container.appendChild(a)
			expect(evaluateOn(noSelfNestRule, a, a)).toBeNull()
		})

		it('dirty: a <form> containing a nested <form> is flagged', () => {
			const form = el('form', [el('div', [el('form')])])
			container.appendChild(form)
			expect(evaluateOn(noSelfNestRule, form, form)?.rule).toBe('structure/no-self-nest')
		})

		it('dirty: a <dfn> containing a nested <dfn> is flagged', () => {
			const dfn = el('dfn', [el('dfn')])
			container.appendChild(dfn)
			expect(evaluateOn(noSelfNestRule, dfn, dfn)?.rule).toBe('structure/no-self-nest')
		})
	})

	// ── child-order / group-order ─────────────────────────────────────────

	describe('child-order', () => {
		it('clean: <hgroup> with p* then h1 then p*', () => {
			const hgroup = el('hgroup', [el('p'), el('h1'), el('p')])
			container.appendChild(hgroup)
			expect(evaluateOn(orderRule, hgroup, hgroup)).toBeNull()
		})

		it('dirty: <hgroup> with h1 before its leading <p> reversed wrongly', () => {
			// h1 then p then h1 — two h1 breaks the "exactly one h1" segment.
			const hgroup = el('hgroup', [el('h1'), el('p'), el('h1')])
			container.appendChild(hgroup)
			expect(evaluateOn(orderRule, hgroup, hgroup)?.rule).toBe('structure/child-order')
		})

		it('dirty: <ruby> with rt before any content (group-order) is flagged', () => {
			// ruby group-order: rp? rt+ rp? — a leading stray <b> then rt is fine,
			// but an rt with a trailing rp then another bare rt out of group is not.
			const ruby = el('ruby', [el('rt'), el('rp'), el('rp')])
			container.appendChild(ruby)
			expect(evaluateOn(orderRule, ruby, ruby)?.rule).toBe('structure/child-order')
		})
	})

	// ── void-has-children ─────────────────────────────────────────────────

	describe('void-has-children', () => {
		it('clean: a childless <br>', () => {
			const br = el('br')
			container.appendChild(br)
			expect(evaluateOn(voidRule, br, br)).toBeNull()
		})

		it('dirty: a <br> with an element child is flagged', () => {
			const br = el('br', [el('span')])
			container.appendChild(br)
			const finding = evaluateOn(voidRule, br, br)
			if (finding === null) throw new Error('expected a void-has-children finding')
			expect(finding.rule).toBe('structure/void-has-children')
			expect(finding.cite).toBe('texts#the-br-element')
			expect(finding.actual).toContain('1')
		})

		it('dirty: an <img> with an element child is flagged', () => {
			const img = el('img', [el('span')])
			container.appendChild(img)
			expect(evaluateOn(voidRule, img, img)?.rule).toBe('structure/void-has-children')
		})
	})

	// ── perturbation ──────────────────────────────────────────────────────

	describe('perturbation — parent-restricted bites (seeded)', () => {
		it('seeded <li> parent verdict is reproducible & correct', () => {
			const VALID = ['ul', 'ol', 'menu'] as const
			const INVALID = ['div', 'section', 'p'] as const
			for (const seed of [9, 64, 777, 50000]) {
				const random = createRandom(seed)
				const validParent = random() < 0.5
				const parentTag = validParent
					? (VALID[Math.floor(random() * VALID.length)] ?? 'ul')
					: (INVALID[Math.floor(random() * INVALID.length)] ?? 'div')

				const buildOnce = (): boolean => {
					const li = el('li')
					const parent = el(parentTag, [li])
					container.appendChild(parent)
					const walker = new Walker(parent)
					const flagged = parentRestrictedRule.evaluate(li, walker.context(li)) !== null
					parent.remove()
					return flagged
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				// <li> in ul/ol/menu → clean; anywhere else → flagged.
				expect(first).toBe(!validParent)
			}
		})
	})
})
