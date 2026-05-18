// ============================================================================
//  interaction family — hidden reference integrity (Phase 3.3).
//
//  Real DOM per AGENTS §16.2 (no mocks): real `hidden` / `id` / `for` /
//  `href="#id"` attributes (and a real modal `<dialog>` only as the
//  attribute-family disjointness fixture). The family is GENERIC over the
//  corpus-stated reference associations — the hyperlink `a[href="#id"]` plus
//  the schema-carried `for` AttributeRule on `label` / `output` — never an
//  `if (tag==='label')` branch. Resolution is decided with
//  `@elements/browser` `traversals` (`getElementById`) and the flat-tree
//  helpers, never a bespoke DOM walk.
//
//  NOTE: an "inert reference" rule was deliberately NOT shipped — the WHATWG
//  spec (interactions.md §6.3) states no inert reference-integrity
//  conformance rule (its only near-prose is non-normative and not
//  tree-walker-decidable), so encoding one would invent a rule the corpus
//  does not state (spec is source of truth). These tests therefore cover the
//  single surviving corpus-faithful rule only.
//
//  The rule gets a clean-pass + dirty-fail + a seeded `createRandom`
//  perturbation that BITES both directions. The whole-`rules`-registry walk
//  over the real `Walker` asserts the one-finding-per-violation guarantee and
//  disjointness from the attribute family — in particular `<dialog tabindex>`
//  stays EXACTLY ONE `attribute/coupling-domain` finding (owned by the
//  Phase-3.2 attribute family), never an interaction finding.
//
//  Exact expected outcomes (quoted in the report):
//    non-hidden <a href="#t"> → <div id=t hidden>      → 1 interaction/hidden-reference
//    same with target NOT hidden                       → 0
//    <label for=t> → hidden target                     → 1 interaction/hidden-reference
//    referrer inside [inert] subtree referenced        → 0 (no inert-reference rule)
//    <dialog tabindex=0>                               → exactly ONE attribute/
//                                                         coupling-domain (NOT an
//                                                         interaction finding)
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const hiddenReferenceRule = ruleById('interaction/hidden-reference')

describe('rules — interaction family', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	function el(
		tag: string,
		attrs: Readonly<Record<string, string>> = {},
		children: readonly Element[] = [],
	): Element {
		const node = document.createElement(tag)
		for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
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

	// Run the WHOLE registry over the WHOLE flat subtree (the realistic
	// Phase-4 inspection pass) and collect the rule id of every finding.
	function registryFindings(root: Element): readonly string[] {
		const walker = new Walker(root)
		const out: string[] = []
		for (const node of walker.walk()) {
			const ctx = walker.context(node)
			for (const rule of rules) {
				const finding = rule.evaluate(node, ctx)
				if (finding !== null) out.push(finding.rule)
			}
		}
		return out
	}

	// ── hidden reference integrity (interactions.md §6.1 verbatim) ──────────

	describe('hidden-reference — a[href="#id"] / label[for] / output[for] → hidden target', () => {
		it('clean: non-hidden <a href="#t"> → non-hidden <div id=t> is allowed', () => {
			const target = el('div', { id: 't' })
			const a = el('a', { href: '#t' })
			container.append(a, target)
			expect(evaluateOn(hiddenReferenceRule, container, a)).toBeNull()
		})

		it('dirty: non-hidden <a href="#t"> → <div id=t hidden> is flagged', () => {
			const target = el('div', { id: 't', hidden: '' })
			const a = el('a', { href: '#t' })
			container.append(a, target)
			const finding = evaluateOn(hiddenReferenceRule, container, a)
			if (finding === null) throw new Error('expected an interaction/hidden-reference finding')
			expect(finding.rule).toBe('interaction/hidden-reference')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(a)
			expect(finding.cite).toBe('interactions#the-hidden-attribute')
		})

		it('clean: a HIDDEN <a href="#t"> → <div id=t hidden> is allowed (referrer itself hidden)', () => {
			// The corpus exempts a hidden referrer: "Elements that are not
			// themselves hidden must not hyperlink to elements that are hidden."
			const target = el('div', { id: 't', hidden: '' })
			const a = el('a', { href: '#t', hidden: '' })
			container.append(a, target)
			expect(evaluateOn(hiddenReferenceRule, container, a)).toBeNull()
		})

		it('dirty: <a href="#t"> → target inside a [hidden] subtree is flagged', () => {
			const target = el('span', { id: 't' })
			const wrapper = el('section', { hidden: '' }, [target])
			const a = el('a', { href: '#t' })
			container.append(a, wrapper)
			expect(evaluateOn(hiddenReferenceRule, container, a)?.rule).toBe(
				'interaction/hidden-reference',
			)
		})

		it('dirty: non-hidden <label for=t> → hidden target is flagged (schema-driven `for`)', () => {
			const input = el('input', { id: 't', hidden: '' })
			const label = el('label', { for: 't' })
			container.append(label, input)
			const finding = evaluateOn(hiddenReferenceRule, container, label)
			if (finding === null) throw new Error('expected an interaction/hidden-reference finding')
			expect(finding.rule).toBe('interaction/hidden-reference')
		})

		it('dirty: non-hidden <output for=t> → hidden target is flagged (same generic rule)', () => {
			const src = el('input', { id: 't', hidden: '' })
			const output = el('output', { for: 't' })
			container.append(output, src)
			expect(evaluateOn(hiddenReferenceRule, container, output)?.rule).toBe(
				'interaction/hidden-reference',
			)
		})

		it('clean: <label for=t> → non-hidden target is allowed', () => {
			const input = el('input', { id: 't' })
			const label = el('label', { for: 't' })
			container.append(label, input)
			expect(evaluateOn(hiddenReferenceRule, container, label)).toBeNull()
		})

		it('clean: ARIA aria-describedby → hidden target is allowed (corpus-exempt)', () => {
			// The corpus explicitly permits aria-describedby to a hidden target:
			// "It would be fine, however, to use the ARIA aria-describedby
			// attribute to refer to descriptions that are themselves hidden."
			const desc = el('p', { id: 'd', hidden: '' })
			const input = el('input', { 'aria-describedby': 'd' })
			container.append(input, desc)
			expect(evaluateOn(hiddenReferenceRule, container, input)).toBeNull()
		})

		it('clean: <a href="#missing"> with no such id is allowed (no resolved target)', () => {
			const a = el('a', { href: '#missing' })
			container.appendChild(a)
			expect(evaluateOn(hiddenReferenceRule, container, a)).toBeNull()
		})

		it('clean: <a href="https://example.test/"> (non-fragment) is allowed', () => {
			const a = el('a', { href: 'https://example.test/' })
			container.appendChild(a)
			expect(evaluateOn(hiddenReferenceRule, container, a)).toBeNull()
		})
	})

	// ── one finding per violation / disjointness (full registry) ───────────

	describe('one finding per violation & disjoint from the attribute family', () => {
		it('non-hidden <a href="#t"> → <div id=t hidden> → exactly one interaction/hidden-reference', () => {
			container.append(el('a', { href: '#t' }), el('div', { id: 't', hidden: '' }))
			expect(registryFindings(container)).toEqual(['interaction/hidden-reference'])
		})

		it('non-hidden <a href="#t"> → non-hidden target → zero findings', () => {
			container.append(el('a', { href: '#t' }), el('div', { id: 't' }))
			expect(registryFindings(container)).toEqual([])
		})

		it('<label for=t> → hidden target → exactly one interaction/hidden-reference', () => {
			container.append(el('label', { for: 't' }), el('input', { id: 't', hidden: '' }))
			expect(registryFindings(container)).toEqual(['interaction/hidden-reference'])
		})

		it('active <label for=t> → element inside an [inert] subtree → ZERO findings (no inert-reference rule)', () => {
			// The invented `interaction/inert-reference` rule was removed (the
			// WHATWG spec §6.3 states no such conformance rule). A non-hidden
			// referrer into an `[inert]` subtree is therefore NOT a finding —
			// and no other corpus-faithful rule legitimately fires for a plain
			// `<label for>` → `<input id>` pair, so the verdict is exactly `[]`.
			container.append(
				el('label', { for: 't' }),
				el('div', { inert: '' }, [el('input', { id: 't' })]),
			)
			expect(registryFindings(container)).toEqual([])
		})

		it('<dialog tabindex=0> → exactly ONE attribute/coupling-domain (NOT an interaction finding)', () => {
			// CRITICAL disjointness: the Phase-3.2 attribute family OWNS
			// dialog[tabindex] via `attribute/coupling-domain`. The interaction
			// family deliberately does NOT re-implement it — so a bare
			// <dialog tabindex=0> stays EXACTLY ONE finding, owned by the
			// attribute family, never double-reported here.
			container.appendChild(el('dialog', { tabindex: '0' }))
			expect(registryFindings(container)).toEqual(['attribute/coupling-domain'])
		})

		it('a fully clean reference-rich tree → zero findings', () => {
			container.append(
				el('a', { href: '#sec' }),
				el('label', { for: 'fld' }),
				el('output', { for: 'fld' }),
				el('section', { id: 'sec' }, [el('input', { id: 'fld' })]),
			)
			expect(registryFindings(container)).toEqual([])
		})
	})

	// ── perturbation (seeded, reproducible, bites both directions) ─────────

	describe('perturbation — interaction verdicts are reproducible & bite', () => {
		it('seeded <a href="#t"> hidden/visible target verdict is reproducible & exactly-one', () => {
			for (const seed of [6, 66, 606, 60006]) {
				const random = createRandom(seed)
				const targetHidden = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const target = targetHidden ? el('div', { id: 't', hidden: '' }) : el('div', { id: 't' })
					const a = el('a', { href: '#t' })
					container.append(a, target)
					const ids = registryFindings(container)
					a.remove()
					target.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(targetHidden ? ['interaction/hidden-reference'] : [])
			}
		})

		it('seeded <label for=t> inside/outside an [inert] subtree → always ZERO (rule removed)', () => {
			// Cross-check the removal: whether or not the target sits in an
			// `[inert]` subtree, the verdict is reproducibly `[]` — the
			// removed `interaction/inert-reference` rule never fires again, and
			// no other corpus-faithful rule fills the gap.
			for (const seed of [9, 99, 909, 90009]) {
				const random = createRandom(seed)
				const targetInert = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const input = el('input', { id: 't' })
					const slot = targetInert ? el('div', { inert: '' }, [input]) : el('div', {}, [input])
					const label = el('label', { for: 't' })
					container.append(label, slot)
					const ids = registryFindings(container)
					label.remove()
					slot.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual([])
			}
		})

		it('seeded hidden-referrer exemption verdict is reproducible & bites', () => {
			// The corpus referrer-hidden exemption discriminator: a hidden
			// referrer to a hidden target is CLEAN; a non-hidden referrer to
			// the same hidden target FLAGS. Flip the exemption and the
			// hidden-referrer branch wrongly flags — this perturbation proves
			// the exemption bites.
			for (const seed of [4, 44, 404, 40004]) {
				const random = createRandom(seed)
				const referrerHidden = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const target = el('div', { id: 't', hidden: '' })
					const a = referrerHidden ? el('a', { href: '#t', hidden: '' }) : el('a', { href: '#t' })
					container.append(a, target)
					const ids = registryFindings(container)
					a.remove()
					target.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(referrerHidden ? [] : ['interaction/hidden-reference'])
			}
		})
	})
})
