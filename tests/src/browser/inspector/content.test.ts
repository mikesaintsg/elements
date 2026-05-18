// ============================================================================
//  content family — `content/required` + `content/forbidden` rules.
//
//  Real DOM per AGENTS §16.2 (no mocks). `content/required` drives off
//  `entry.required` (the constrained child sequence); `content/forbidden`
//  off `entry.forbidden` (forbidden descendant categories/tags). Clean
//  trees → no finding; deliberately dirty trees → the exact expected
//  finding. Perturbation: seeded valid/invalid `<ul>` child lists are
//  reproducible and the suite bites if cardinality/order logic is wrong.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const requiredRule = ruleById('content/required')
const forbiddenRule = ruleById('content/forbidden')

describe('rules — content family', () => {
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
		rule: typeof requiredRule,
		root: Element,
		target: Element,
	): ReturnType<typeof requiredRule.evaluate> {
		const walker = new Walker(root)
		return rule.evaluate(target, walker.context(target))
	}

	// ── content/required ──────────────────────────────────────────────────

	describe('content/required — clean', () => {
		it('a <ul> with only <li> children satisfies its required sequence', () => {
			const ul = el('ul', [el('li'), el('li')])
			container.appendChild(ul)
			expect(evaluateOn(requiredRule, ul, ul)).toBeNull()
		})

		it('a <table> in canonical caption→colgroup→thead→tbody→tfoot order is clean', () => {
			const table = el('table', [
				el('caption'),
				el('colgroup'),
				el('thead'),
				el('tbody'),
				el('tfoot'),
			])
			container.appendChild(table)
			expect(evaluateOn(requiredRule, table, table)).toBeNull()
		})

		it('an element with no required sequence (<p>) is never flagged', () => {
			const p = el('p', [el('span'), el('em')])
			container.appendChild(p)
			expect(evaluateOn(requiredRule, p, p)).toBeNull()
		})
	})

	describe('content/required — dirty', () => {
		it('a <picture> missing its required <img> is flagged', () => {
			// picture requires: source* then exactly one img.
			const picture = el('picture', [el('source')])
			container.appendChild(picture)
			const finding = evaluateOn(requiredRule, picture, picture)
			if (finding == null) throw new Error('expected a content/required finding')
			expect(finding.rule).toBe('content/required')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(picture)
			expect(finding.cite).toBe('embeddeds#the-picture-element')
			expect(finding.expected).toContain('<img>')
		})

		it('a <table> with children out of order (tfoot before tbody) is flagged', () => {
			const table = el('table', [el('tfoot'), el('tbody')])
			container.appendChild(table)
			const finding = evaluateOn(requiredRule, table, table)
			expect(finding?.rule).toBe('content/required')
		})

		it('a <ul> containing a non-<li> element child is flagged', () => {
			const ul = el('ul', [el('li'), el('div')])
			container.appendChild(ul)
			expect(evaluateOn(requiredRule, ul, ul)?.rule).toBe('content/required')
		})
	})

	// ── content/forbidden ─────────────────────────────────────────────────

	describe('content/forbidden — clean', () => {
		it('a <header> with no nested header/footer is clean', () => {
			const header = el('header', [el('h1'), el('nav')])
			container.appendChild(header)
			expect(evaluateOn(forbiddenRule, header, header)).toBeNull()
		})

		it('a <dt> with phrasing content only is clean', () => {
			const dt = el('dt', [el('span'), el('abbr')])
			container.appendChild(dt)
			expect(evaluateOn(forbiddenRule, dt, dt)).toBeNull()
		})
	})

	describe('content/forbidden — dirty', () => {
		it('a <header> containing a nested <footer> descendant is flagged', () => {
			const footer = el('footer')
			const header = el('header', [el('div', [footer])])
			container.appendChild(header)
			const finding = evaluateOn(forbiddenRule, header, header)
			if (finding == null) throw new Error('expected a content/forbidden finding')
			expect(finding.rule).toBe('content/forbidden')
			expect(finding.cite).toBe('sections#the-header-element')
			expect(finding.actual).toBe('<footer>')
			expect(finding.message).toContain('must not contain a <footer> descendant')
		})

		it('a <dt> containing a heading (category-driven) descendant is flagged', () => {
			// dt forbids the `heading` category — h2 is a heading member.
			const dt = el('dt', [el('h2')])
			container.appendChild(dt)
			expect(evaluateOn(forbiddenRule, dt, dt)?.rule).toBe('content/forbidden')
		})

		it('an <a> containing an interactive (category-driven) <button> is flagged', () => {
			const a = el('a', [el('button')])
			container.appendChild(a)
			expect(evaluateOn(forbiddenRule, a, a)?.rule).toBe('content/forbidden')
		})
	})

	// ── perturbation ──────────────────────────────────────────────────────

	describe('perturbation — content/required bites (seeded)', () => {
		it('seeded valid/invalid <ul> child lists verdict is reproducible & correct', () => {
			for (const seed of [7, 88, 2024, 40000]) {
				const random = createRandom(seed)
				const valid = random() < 0.5
				const count = 1 + Math.floor(random() * 4)

				const buildOnce = (): boolean => {
					const children: Element[] = []
					for (let i = 0; i < count; i += 1) {
						children.push(el(valid ? 'li' : 'div'))
					}
					const ul = el('ul', children)
					container.appendChild(ul)
					const finding = evaluateOn(requiredRule, ul, ul)
					ul.remove()
					return finding !== null
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				// Valid list (all <li>) → no finding; invalid (<div>) → finding.
				expect(first).toBe(!valid)
			}
		})
	})
})
