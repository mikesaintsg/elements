// ============================================================================
//  interaction family — hidden / inert reference integrity (Phase 3.3).
//
//  Real DOM per AGENTS §16.2 (no mocks): real `hidden` / `inert` / `id` /
//  `for` / `href="#id"` attributes and a real `<dialog>` opened modally. The
//  family is GENERIC over the corpus-stated reference associations — the
//  hyperlink `a[href="#id"]` plus the schema-carried `for` AttributeRule on
//  `label` / `output` — never an `if (tag==='label')` branch. Reachability /
//  inertness is decided with `@elements/browser` `traversals`
//  (`isDescendantOf` / `findClosest` / `getElementById` / `contains`) and the
//  flat-tree helpers, never a bespoke DOM walk.
//
//  Each rule gets a clean-pass + dirty-fail + a seeded `createRandom`
//  perturbation that BITES both directions. The whole-`rules`-registry walk
//  over the real `Walker` asserts the one-finding-per-violation guarantee and
//  disjointness from the attribute family — in particular `<dialog tabindex>`
//  stays EXACTLY ONE `attribute/coupling-domain` finding (owned by the
//  Phase-3.2 attribute family), never a second interaction finding.
//
//  Exact expected outcomes (quoted in the report):
//    non-hidden <a href="#t"> → <div id=t hidden>      → 1 interaction/hidden-reference
//    same with target NOT hidden                       → 0
//    <label for=t> → hidden target                     → 1 interaction/hidden-reference
//    active control with for/href into an [inert] tree → 1 interaction/inert-reference
//    <dialog tabindex=0>                               → exactly ONE attribute/
//                                                         coupling-domain (NOT a
//                                                         second interaction finding)
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
const inertReferenceRule = ruleById('interaction/inert-reference')

describe('rules — interaction family', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		// Close any modal dialog a test left open so the document is not
		// blocked / inert for the next test.
		for (const dialog of container.querySelectorAll('dialog')) {
			if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close()
		}
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

	// ── inert reference integrity (interactions.md §6.3 / §6.3.1) ───────────

	describe('inert-reference — active referrer for/href into an [inert] / modal-inert subtree', () => {
		it('clean: <label for=t> → target NOT in an inert subtree is allowed', () => {
			const input = el('input', { id: 't' })
			const label = el('label', { for: 't' })
			container.append(label, input)
			expect(evaluateOn(inertReferenceRule, container, label)).toBeNull()
		})

		it('dirty: active <label for=t> → target inside an [inert] subtree is flagged', () => {
			const input = el('input', { id: 't' })
			const region = el('div', { inert: '' }, [input])
			const label = el('label', { for: 't' })
			container.append(label, region)
			const finding = evaluateOn(inertReferenceRule, container, label)
			if (finding === null) throw new Error('expected an interaction/inert-reference finding')
			expect(finding.rule).toBe('interaction/inert-reference')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('interactions#inert-subtrees')
		})

		it('clean: an INERT referrer → inert target is allowed (referrer not active)', () => {
			const input = el('input', { id: 't' })
			const region = el('div', { inert: '' }, [el('label', { for: 't' }), input])
			container.appendChild(region)
			const label = region.querySelector('label')
			if (label === null) throw new Error('fixture: label missing')
			expect(evaluateOn(inertReferenceRule, container, label)).toBeNull()
		})

		it('dirty: active <a href="#t"> → target inside an [inert] subtree is flagged', () => {
			const target = el('span', { id: 't' })
			const region = el('div', { inert: '' }, [target])
			const a = el('a', { href: '#t' })
			container.append(a, region)
			expect(evaluateOn(inertReferenceRule, container, a)?.rule).toBe('interaction/inert-reference')
		})

		it('dirty: active referrer INSIDE the modal → target OUTSIDE it (modal-inert) is flagged', () => {
			// An open modal <dialog> makes every connected node EXCEPT the
			// dialog and its flat-tree descendants inert (interactions.md
			// §6.3.1). The realistic violation: an ACTIVE referrer inside the
			// modal (it escapes inertness) pointing at a target OUTSIDE the
			// modal (which is modal-inert and thus unreachable).
			const target = el('span', { id: 't' })
			const a = el('a', { href: '#t' })
			const dialog = el('dialog', {}, [a])
			container.append(target, dialog)
			if (!(dialog instanceof HTMLDialogElement)) throw new Error('fixture: not a dialog')
			dialog.showModal()
			try {
				expect(evaluateOn(inertReferenceRule, container, a)?.rule).toBe(
					'interaction/inert-reference',
				)
			} finally {
				dialog.close()
			}
		})

		it('clean: referrer OUTSIDE the modal → target OUTSIDE it is allowed (referrer itself modal-inert)', () => {
			// Both the referrer and the target are outside the open modal, so
			// BOTH are modal-inert: the referrer is not "active", mirroring the
			// hidden-referrer exemption (a co-located inert pair is not a
			// cross-boundary reference into inert).
			const target = el('span', { id: 't' })
			const a = el('a', { href: '#t' })
			const dialog = el('dialog', {}, [el('p', {}, [])])
			container.append(a, target, dialog)
			if (!(dialog instanceof HTMLDialogElement)) throw new Error('fixture: not a dialog')
			dialog.showModal()
			try {
				expect(evaluateOn(inertReferenceRule, container, a)).toBeNull()
			} finally {
				dialog.close()
			}
		})

		it('clean: referrer INSIDE the modal dialog → target inside it is allowed', () => {
			const target = el('span', { id: 't' })
			const a = el('a', { href: '#t' })
			const dialog = el('dialog', {}, [a, target])
			container.appendChild(dialog)
			if (!(dialog instanceof HTMLDialogElement)) throw new Error('fixture: not a dialog')
			dialog.showModal()
			try {
				expect(evaluateOn(inertReferenceRule, container, a)).toBeNull()
			} finally {
				dialog.close()
			}
		})

		it('clean: ARIA aria-controls into an [inert] subtree is allowed (no invented ARIA domain)', () => {
			// The corpus never cards an `aria-*` IDREF domain; the family is
			// faithfully scoped to the corpus-stated for/href associations only
			// (the Phase-3.2 loading/crossorigin deliberate-omission precedent).
			const panel = el('div', { id: 'p' })
			const region = el('div', { inert: '' }, [panel])
			const trigger = el('button', { 'aria-controls': 'p' })
			container.append(trigger, region)
			expect(evaluateOn(inertReferenceRule, container, trigger)).toBeNull()
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

		it('active <label for=t> → [inert] target → exactly one interaction/inert-reference', () => {
			container.append(
				el('label', { for: 't' }),
				el('div', { inert: '' }, [el('input', { id: 't' })]),
			)
			expect(registryFindings(container)).toEqual(['interaction/inert-reference'])
		})

		it('<dialog tabindex=0> → exactly ONE attribute/coupling-domain (NOT a second interaction finding)', () => {
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

		it('seeded <label for=t> inert/active target verdict is reproducible & exactly-one', () => {
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
				expect(first).toEqual(targetInert ? ['interaction/inert-reference'] : [])
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
