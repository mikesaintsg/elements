// ============================================================================
//  content family — `content/required` + `content/forbidden` +
//  `content/category` rules.
//
//  Real DOM per AGENTS §16.2 (no mocks). `content/required` drives off
//  `entry.required` (the constrained child sequence); `content/forbidden`
//  off `entry.forbidden` (forbidden descendant categories/tags);
//  `content/category` off `entry.permits` (the corpus-derived bare child
//  category of a free flow/phrasing parent — the general category class the
//  `required`-driven `context` family structurally cannot see). Clean
//  trees → no finding; deliberately dirty trees → the exact expected
//  finding. Perturbation: seeded valid/invalid `<ul>` child lists and
//  seeded category-(mis)placed children are reproducible and the suite
//  bites if cardinality/order/category logic is wrong.
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
const categoryRule = ruleById('content/category')

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

	// ── content/category ──────────────────────────────────────────────────

	describe('content/category — clean (legal category placement)', () => {
		it('<div> (permits flow) with flow children p/span/table is clean', () => {
			// The exact tree context.test.ts keeps green — now PROVABLY legal
			// (p/span/table are all flow; div permits flow), not an
			// under-detected gap.
			const div = el('div', [el('p'), el('span'), el('table')])
			container.appendChild(div)
			expect(evaluateOn(categoryRule, div, div)).toBeNull()
		})

		it('<p> (permits phrasing) with a phrasing <span> child is clean', () => {
			const p = el('p', [el('span')])
			container.appendChild(p)
			expect(evaluateOn(categoryRule, p, p)).toBeNull()
		})

		it('a transparent <a> child of <p> is skipped (transparent family owns it)', () => {
			// `<a>` is transparent — its model IS its parent's, so it is
			// permitted wherever its resolved content is; the category rule
			// must not flag it.
			const p = el('p', [el('a')])
			container.appendChild(p)
			expect(evaluateOn(categoryRule, p, p)).toBeNull()
		})

		it('a structural <td> child (empty categories) is NOT a category finding', () => {
			// `<td>` carries `categories: []` — its placement is the
			// `structure` family's `parent-restricted` concern, never a
			// category match. The category rule skips it (disjoint coverage).
			const div = el('div', [el('td')])
			container.appendChild(div)
			expect(evaluateOn(categoryRule, div, div)).toBeNull()
		})
	})

	describe('content/category — dirty (illegal category placement)', () => {
		it('<p><div></div></p> (block-in-paragraph) fires exactly the category finding', () => {
			const bad = el('div')
			const p = el('p', [bad])
			container.appendChild(p)
			const finding = evaluateOn(categoryRule, p, p)
			if (finding == null) throw new Error('expected a content/category finding')
			expect(finding.rule).toBe('content/category')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(bad)
			expect(finding.cite).toBe('groupings#the-p-element')
			expect(finding.expected).toBe('phrasing content')
			expect(finding.message).toContain('<div> is not allowed as a child of <p>')
			expect(finding.path[0]).toBe(bad)
		})

		it('<span><div></div></span> fires exactly the category finding', () => {
			const bad = el('div')
			const span = el('span', [bad])
			container.appendChild(span)
			const finding = evaluateOn(categoryRule, span, span)
			if (finding == null) throw new Error('expected a content/category finding')
			expect(finding.rule).toBe('content/category')
			expect(finding.element).toBe(bad)
			expect(finding.cite).toBe('texts#the-span-element')
		})

		it('<p><section></section></p> (sectioning, non-phrasing) is flagged', () => {
			const bad = el('section')
			const p = el('p', [bad])
			container.appendChild(p)
			const finding = evaluateOn(categoryRule, p, p)
			expect(finding?.rule).toBe('content/category')
			expect(finding?.element).toBe(bad)
		})

		it('one finding per violation — no double-report with context/structure', () => {
			// `<p><div></div></p>`: the WHOLE registry must yield exactly one
			// finding (the category rule's), never a context/parent-model or
			// structure/* duplicate. `<p>` has no `required` (so
			// context/parent-model cannot fire) and `<div>` has no
			// parent-restricted/edge constraint (so structure cannot fire) —
			// disjoint by construction, asserted here.
			const bad = el('div')
			const p = el('p', [bad])
			container.appendChild(p)
			// Root the walk ABOVE the violating parent (realistic full-tree
			// inspection) so `<p>` itself is visited and the parent-keyed
			// category rule can fire; the assertion is that the ENTIRE
			// registry produces exactly one finding across every node.
			const walker = new Walker(container)
			const findings: string[] = []
			for (const node of walker.walk()) {
				const ctx = walker.context(node)
				for (const rule of rules) {
					const finding = rule.evaluate(node, ctx)
					if (finding !== null) findings.push(finding.rule)
				}
			}
			expect(findings).toEqual(['content/category'])
		})

		it('<div><td></td></div> stays a single structure/parent-restricted finding', () => {
			// The disjoint boundary the spec review called out: `<td>` (empty
			// categories) must be owned ONLY by structure/parent-restricted,
			// never additionally by content/category.
			const td = el('td')
			const div = el('div', [td])
			container.appendChild(div)
			const walker = new Walker(container)
			const findings: string[] = []
			for (const node of walker.walk()) {
				const ctx = walker.context(node)
				for (const rule of rules) {
					const finding = rule.evaluate(node, ctx)
					if (finding !== null) findings.push(finding.rule)
				}
			}
			expect(findings).toEqual(['structure/parent-restricted'])
		})
	})

	// ── perturbation ──────────────────────────────────────────────────────

	describe('perturbation — content/category bites (seeded)', () => {
		it('seeded legal/illegal category children verdict is reproducible & correct', () => {
			// Parent permits phrasing (`<p>`). A phrasing child (`<span>`) is
			// legal → no finding; a flow-only child (`<div>`) is illegal →
			// finding. Same seed ⇒ same placement ⇒ same verdict; the
			// expected verdict is the discriminator that fails if the rule
			// (or `permits`) is wrong.
			for (const seed of [5, 73, 1234, 50000]) {
				const random = createRandom(seed)
				const legal = random() < 0.5
				const childTag = legal ? 'span' : 'div'

				const buildOnce = (): boolean => {
					const p = el('p', [el(childTag)])
					container.appendChild(p)
					const finding = evaluateOn(categoryRule, p, p)
					p.remove()
					return finding !== null
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				expect(first).toBe(!legal)
			}
		})
	})

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
