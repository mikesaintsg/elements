// ============================================================================
//  attribute family — coupling + parser-coerced attribute-value rules
//  (Phase 3.2).
//
//  Real DOM per AGENTS §16.2 (no mocks). Every rule is GENERIC &
//  schema-data-driven: the per-element rules iterate the Phase-1
//  `entry.attributes` (`AttributeRule`) data; the global value rules iterate
//  the corpus-bound `ATTRIBUTE_INTEGER_BOUNDS` / `ATTRIBUTE_ENUM_DOMAINS`
//  constants. Each rule gets a clean-pass + dirty-fail + a seeded
//  perturbation that BITES. The whole-`rules`-registry-over-the-real-`Walker`
//  walk asserts the one-finding-per-violation guarantee and disjointness
//  from context/content/transparent/structure (those families never read
//  attributes).
//
//  Exact expected outcomes (quoted in the report):
//    <a target=_blank> no href            → 1 attribute/coupling
//    <a href=x target=_blank>             → 0
//    <th scope=bogus>                     → 1 attribute/value
//    <td colspan=0>                       → 1 attribute/integer
//    <td colspan=2> (valid)               → 0
//    <bdo> no dir                         → 1 attribute/required
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const couplingRule = ruleById('attribute/coupling')
const requiredRule = ruleById('attribute/required')
const valueRule = ruleById('attribute/value')
const couplingDomainRule = ruleById('attribute/coupling-domain')
const integerRule = ruleById('attribute/integer')
const enumRule = ruleById('attribute/enum')

describe('rules — attribute family', () => {
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

	// ── coupling (AttributeRule.requires) ──────────────────────────────────

	describe('coupling — a[target|download|ping|rel|hreflang|type|referrerpolicy] ⇒ href', () => {
		it('clean: <a href=x target=_blank> is allowed', () => {
			const a = el('a', { href: 'x', target: '_blank' })
			container.appendChild(a)
			expect(evaluateOn(couplingRule, a, a)).toBeNull()
		})

		it('dirty: <a target=_blank> with no href is flagged', () => {
			const a = el('a', { target: '_blank' })
			container.appendChild(a)
			const finding = evaluateOn(couplingRule, a, a)
			if (finding === null) throw new Error('expected an attribute/coupling finding')
			expect(finding.rule).toBe('attribute/coupling')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(a)
			expect(finding.cite).toBe('texts#the-a-element')
			expect(finding.expected).toBe('[href] present')
		})

		it('dirty: <a download> with no href is flagged (generic over every requires rule)', () => {
			const a = el('a', { download: 'file.txt' })
			container.appendChild(a)
			expect(evaluateOn(couplingRule, a, a)?.rule).toBe('attribute/coupling')
		})

		it('dirty: <area ping=...> with no href is flagged (same generic rule, other element)', () => {
			const area = el('area', { ping: 'https://p.example' })
			const map = el('map', { name: 'm' }, [area])
			container.appendChild(map)
			expect(evaluateOn(couplingRule, map, area)?.rule).toBe('attribute/coupling')
		})

		it('clean: <a> with neither target nor href (rule only fires when trigger present)', () => {
			const a = el('a', {})
			container.appendChild(a)
			expect(evaluateOn(couplingRule, a, a)).toBeNull()
		})
	})

	// ── required (AttributeRule.required) ──────────────────────────────────

	describe('required — bdo ⇒ dir, data ⇒ value, map ⇒ name', () => {
		it('clean: <bdo dir=ltr> is allowed', () => {
			const bdo = el('bdo', { dir: 'ltr' })
			container.appendChild(bdo)
			expect(evaluateOn(requiredRule, bdo, bdo)).toBeNull()
		})

		it('dirty: <bdo> with no dir is flagged', () => {
			const bdo = el('bdo', {})
			container.appendChild(bdo)
			const finding = evaluateOn(requiredRule, bdo, bdo)
			if (finding === null) throw new Error('expected an attribute/required finding')
			expect(finding.rule).toBe('attribute/required')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('texts#the-bdo-element')
			expect(finding.actual).toBe('[dir] absent')
		})

		it('dirty: <data> with no value is flagged (generic over every required rule)', () => {
			const data = el('data', {})
			container.appendChild(data)
			expect(evaluateOn(requiredRule, data, data)?.rule).toBe('attribute/required')
		})

		it('clean: <data value=42> is allowed', () => {
			const data = el('data', { value: '42' })
			container.appendChild(data)
			expect(evaluateOn(requiredRule, data, data)).toBeNull()
		})
	})

	// ── value (AttributeRule.values via parseEnum) ─────────────────────────

	describe('value — th[scope] / bdo[dir] / dialog[closedby] closed domain', () => {
		it('clean: <th scope=row> is allowed', () => {
			const th = el('th', { scope: 'row' })
			const tr = el('tr', {}, [th])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(valueRule, th, th)).toBeNull()
		})

		it('dirty: <th scope=bogus> is flagged', () => {
			const th = el('th', { scope: 'bogus' })
			const tr = el('tr', {}, [th])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			const finding = evaluateOn(valueRule, th, th)
			if (finding === null) throw new Error('expected an attribute/value finding')
			expect(finding.rule).toBe('attribute/value')
			expect(finding.cite).toBe('tables#the-th-element')
			expect(finding.expected).toBe('row, col, rowgroup, colgroup')
			expect(finding.actual).toBe('bogus')
		})

		it('dirty: <bdo dir=sideways> is flagged (generic over schema values)', () => {
			const bdo = el('bdo', { dir: 'sideways' })
			container.appendChild(bdo)
			expect(evaluateOn(valueRule, bdo, bdo)?.rule).toBe('attribute/value')
		})

		it('clean: <dialog closedby=any> is allowed', () => {
			const dialog = el('dialog', { closedby: 'any' })
			container.appendChild(dialog)
			expect(evaluateOn(valueRule, dialog, dialog)).toBeNull()
		})

		it('dirty: <dialog closedby=sometimes> is flagged', () => {
			const dialog = el('dialog', { closedby: 'sometimes' })
			container.appendChild(dialog)
			expect(evaluateOn(valueRule, dialog, dialog)?.rule).toBe('attribute/value')
		})
	})

	// ── coupling-domain (note-keyed corpus DOM checks) ─────────────────────

	describe('coupling-domain — time/datetime, img/ismap, colgroup/span, dialog/tabindex', () => {
		it('clean: <time datetime=2026-05-18> is allowed', () => {
			const time = el('time', { datetime: '2026-05-18' })
			time.textContent = 'today'
			container.appendChild(time)
			expect(evaluateOn(couplingDomainRule, time, time)).toBeNull()
		})

		it('clean: <time>2026-05-18</time> (no datetime, non-empty text) is allowed', () => {
			const time = el('time', {})
			time.textContent = '2026-05-18'
			container.appendChild(time)
			expect(evaluateOn(couplingDomainRule, time, time)).toBeNull()
		})

		it('dirty: <time></time> (no datetime, empty text) is flagged', () => {
			const time = el('time', {})
			container.appendChild(time)
			const finding = evaluateOn(couplingDomainRule, time, time)
			if (finding === null) throw new Error('expected an attribute/coupling-domain finding')
			expect(finding.rule).toBe('attribute/coupling-domain')
			expect(finding.cite).toBe('texts#the-time-element')
		})

		it('clean: <a href=x><img ismap></a> is allowed (ancestor a[href])', () => {
			const img = el('img', { ismap: '' })
			const a = el('a', { href: 'x' }, [img])
			container.appendChild(a)
			expect(evaluateOn(couplingDomainRule, a, img)).toBeNull()
		})

		it('dirty: <img ismap> with no ancestor a[href] is flagged', () => {
			const img = el('img', { ismap: '' })
			container.appendChild(img)
			const finding = evaluateOn(couplingDomainRule, img, img)
			if (finding === null) throw new Error('expected an attribute/coupling-domain finding')
			expect(finding.rule).toBe('attribute/coupling-domain')
			expect(finding.cite).toBe('embeddeds#the-img-element')
		})

		it('dirty: <a> (no href) ancestor does NOT satisfy <img ismap>', () => {
			const img = el('img', { ismap: '' })
			const a = el('a', {}, [img])
			container.appendChild(a)
			expect(evaluateOn(couplingDomainRule, a, img)?.rule).toBe('attribute/coupling-domain')
		})

		it('clean: <colgroup span=2> with no col children is allowed', () => {
			const colgroup = el('colgroup', { span: '2' })
			container.appendChild(el('table', {}, [colgroup]))
			expect(evaluateOn(couplingDomainRule, colgroup, colgroup)).toBeNull()
		})

		it('dirty: <colgroup span=2><col></colgroup> is flagged', () => {
			const colgroup = el('colgroup', { span: '2' }, [el('col', {})])
			container.appendChild(el('table', {}, [colgroup]))
			expect(evaluateOn(couplingDomainRule, colgroup, colgroup)?.rule).toBe(
				'attribute/coupling-domain',
			)
		})

		it('dirty: <dialog tabindex=0> is flagged (must not be specified)', () => {
			const dialog = el('dialog', { tabindex: '0' })
			container.appendChild(dialog)
			const finding = evaluateOn(couplingDomainRule, dialog, dialog)
			if (finding === null) throw new Error('expected an attribute/coupling-domain finding')
			expect(finding.rule).toBe('attribute/coupling-domain')
			expect(finding.cite).toBe('interactives#the-dialog-element')
		})

		it('clean: <dialog open> (no tabindex) is allowed', () => {
			const dialog = el('dialog', { open: '' })
			container.appendChild(dialog)
			expect(evaluateOn(couplingDomainRule, dialog, dialog)).toBeNull()
		})
	})

	// ── integer / range (parseInteger over ATTRIBUTE_INTEGER_BOUNDS) ───────

	describe('integer/range — tabindex / span / colspan / rowspan', () => {
		it('clean: <td colspan=2> is allowed', () => {
			const td = el('td', { colspan: '2' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)).toBeNull()
		})

		it('dirty: <td colspan=0> is flagged (corpus bound > 0)', () => {
			const td = el('td', { colspan: '0' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			const finding = evaluateOn(integerRule, td, td)
			if (finding === null) throw new Error('expected an attribute/integer finding')
			expect(finding.rule).toBe('attribute/integer')
			expect(finding.cite).toBe('tables#the-td-element')
			expect(finding.expected).toBe('an integer in [1, 1000]')
			expect(finding.actual).toBe('0')
		})

		it('dirty: <td colspan=1001> is flagged (corpus bound <= 1000)', () => {
			const td = el('td', { colspan: '1001' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)?.rule).toBe('attribute/integer')
		})

		it('clean: <td rowspan=0> is allowed (corpus rowspan 0 = span all remaining)', () => {
			const td = el('td', { rowspan: '0' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)).toBeNull()
		})

		it('dirty: <td rowspan=65535> is flagged (corpus bound <= 65534)', () => {
			const td = el('td', { rowspan: '65535' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)?.rule).toBe('attribute/integer')
		})

		it('dirty: <td colspan=abc> is flagged (parseInteger rejects non-integer)', () => {
			const td = el('td', { colspan: 'abc' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)?.rule).toBe('attribute/integer')
		})

		it('dirty: <td colspan=2.5> is flagged (parseInteger rejects a float)', () => {
			const td = el('td', { colspan: '2.5' })
			const tr = el('tr', {}, [td])
			container.appendChild(el('table', {}, [el('tbody', {}, [tr])]))
			expect(evaluateOn(integerRule, td, td)?.rule).toBe('attribute/integer')
		})

		it('clean: <div tabindex=-1> is allowed (any valid integer, global)', () => {
			const div = el('div', { tabindex: '-1' })
			container.appendChild(div)
			expect(evaluateOn(integerRule, div, div)).toBeNull()
		})

		it('dirty: <div tabindex=foo> is flagged (tabindex must be a valid integer)', () => {
			const div = el('div', { tabindex: 'foo' })
			container.appendChild(div)
			const finding = evaluateOn(integerRule, div, div)
			if (finding === null) throw new Error('expected an attribute/integer finding')
			expect(finding.rule).toBe('attribute/integer')
			expect(finding.expected).toBe('a valid integer')
		})

		it('clean: <colgroup span=1000> is allowed (upper bound inclusive)', () => {
			const colgroup = el('colgroup', { span: '1000' })
			container.appendChild(el('table', {}, [colgroup]))
			expect(evaluateOn(integerRule, colgroup, colgroup)).toBeNull()
		})
	})

	// ── enum (global) (parseEnum over ATTRIBUTE_ENUM_DOMAINS) ──────────────

	describe('enum (global) — dir / contenteditable / inputmode', () => {
		it('clean: <div dir=rtl> is allowed', () => {
			const div = el('div', { dir: 'rtl' })
			container.appendChild(div)
			expect(evaluateOn(enumRule, div, div)).toBeNull()
		})

		it('dirty: <div dir=sideways> is flagged', () => {
			const div = el('div', { dir: 'sideways' })
			container.appendChild(div)
			const finding = evaluateOn(enumRule, div, div)
			if (finding === null) throw new Error('expected an attribute/enum finding')
			expect(finding.rule).toBe('attribute/enum')
			expect(finding.cite).toBe('renderings#bidirectional-text')
			expect(finding.expected).toBe('ltr, rtl, auto')
		})

		it('clean: <div contenteditable> (empty value = the true state) is allowed', () => {
			const div = el('div', { contenteditable: '' })
			container.appendChild(div)
			expect(evaluateOn(enumRule, div, div)).toBeNull()
		})

		it('clean: <div contenteditable=plaintext-only> is allowed', () => {
			const div = el('div', { contenteditable: 'plaintext-only' })
			container.appendChild(div)
			expect(evaluateOn(enumRule, div, div)).toBeNull()
		})

		it('dirty: <div contenteditable=maybe> is flagged', () => {
			const div = el('div', { contenteditable: 'maybe' })
			container.appendChild(div)
			expect(evaluateOn(enumRule, div, div)?.rule).toBe('attribute/enum')
		})

		it('clean: <input inputmode=numeric> is allowed', () => {
			const input = el('input', { inputmode: 'numeric' })
			container.appendChild(input)
			expect(evaluateOn(enumRule, input, input)).toBeNull()
		})

		it('dirty: <input inputmode=keyboard> is flagged', () => {
			const input = el('input', { inputmode: 'keyboard' })
			container.appendChild(input)
			expect(evaluateOn(enumRule, input, input)?.rule).toBe('attribute/enum')
		})
	})

	// ── one finding per violation / disjointness (full registry) ───────────

	describe('one finding per violation & disjoint from the other families', () => {
		it('<a target=_blank> (no href) → exactly one attribute/coupling', () => {
			container.appendChild(el('a', { target: '_blank' }))
			expect(registryFindings(container)).toEqual(['attribute/coupling'])
		})

		it('<a href=x target=_blank> → zero findings (the clean coupling)', () => {
			container.appendChild(el('a', { href: 'x', target: '_blank' }))
			expect(registryFindings(container)).toEqual([])
		})

		it('<th scope=bogus> inside a valid table → exactly one attribute/value', () => {
			const th = el('th', { scope: 'bogus' })
			container.appendChild(el('table', {}, [el('tbody', {}, [el('tr', {}, [th])])]))
			expect(registryFindings(container)).toEqual(['attribute/value'])
		})

		it('<td colspan=0> inside a valid table → exactly one attribute/integer', () => {
			const td = el('td', { colspan: '0' })
			container.appendChild(el('table', {}, [el('tbody', {}, [el('tr', {}, [td])])]))
			expect(registryFindings(container)).toEqual(['attribute/integer'])
		})

		it('<td colspan=2> (valid) inside a valid table → zero findings', () => {
			const td = el('td', { colspan: '2' })
			container.appendChild(el('table', {}, [el('tbody', {}, [el('tr', {}, [td])])]))
			expect(registryFindings(container)).toEqual([])
		})

		it('<bdo> (no dir) → exactly one attribute/required', () => {
			container.appendChild(el('bdo', {}))
			expect(registryFindings(container)).toEqual(['attribute/required'])
		})

		it('<bdo dir=sideways> → exactly one attribute/value (enum DEFERS, no double-report)', () => {
			// The disjoint-single-source case: `bdo`'s schema AttributeRule
			// constrains `dir∈{ltr,rtl}` (the spec's NARROWER per-element
			// domain ⊂ the global `dir∈{ltr,rtl,auto}`). `attribute/value`
			// (schema-`values`-owned) is the sole reporter; the global
			// `attribute/enum` defers — never two findings for one violation.
			container.appendChild(el('bdo', { dir: 'sideways' }))
			expect(registryFindings(container)).toEqual(['attribute/value'])
		})

		it('<div dir=sideways> → exactly one attribute/enum (no schema AttributeRule ⇒ global owns)', () => {
			// The complement: `div` has NO `dir` schema AttributeRule, so the
			// global `attribute/enum` is the sole owner (the deferral does NOT
			// over-suppress a genuinely global-only violation).
			container.appendChild(el('div', { dir: 'sideways' }))
			expect(registryFindings(container)).toEqual(['attribute/enum'])
		})

		it('a fully clean attribute-rich tree → zero findings', () => {
			container.appendChild(
				el('a', { href: '/x', target: '_blank', rel: 'noopener' }, [
					el('bdo', { dir: 'rtl' }, [el('data', { value: '7' })]),
				]),
			)
			expect(registryFindings(container)).toEqual([])
		})

		it('<colgroup span=2><col> → exactly one (attribute/coupling-domain only, no structure dup)', () => {
			// `col` IS a valid child of `colgroup`'s childModel (col*), and a
			// direct child (parent-restricted child relation satisfied), so the
			// ONLY violation is the attribute coupling: span ⇒ no col children.
			const colgroup = el('colgroup', { span: '2' }, [el('col', {})])
			container.appendChild(el('table', {}, [colgroup]))
			expect(registryFindings(container)).toEqual(['attribute/coupling-domain'])
		})

		it('<dialog tabindex=0> → exactly one attribute/coupling-domain', () => {
			// `dialog` permits flow; an empty dialog is content-clean — the
			// sole violation is the tabindex prohibition. Disjoint: the
			// transparent family reads RuleContext.restrictions, never the
			// element's own attribute, so it does not double-report.
			container.appendChild(el('dialog', { tabindex: '0' }))
			expect(registryFindings(container)).toEqual(['attribute/coupling-domain'])
		})
	})

	// ── perturbation (seeded, reproducible, bites both directions) ─────────

	describe('perturbation — attribute verdicts are reproducible & bite', () => {
		it('seeded <a> href/target verdict is reproducible & exactly-one', () => {
			for (const seed of [5, 55, 555, 55005]) {
				const random = createRandom(seed)
				const hasHref = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const a = hasHref
						? el('a', { href: '/x', target: '_blank' })
						: el('a', { target: '_blank' })
					container.appendChild(a)
					const ids = registryFindings(container)
					a.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(hasHref ? [] : ['attribute/coupling'])
			}
		})

		it('seeded <td colspan> in/out of [1,1000] verdict is reproducible & exactly-one', () => {
			for (const seed of [8, 88, 808, 80008]) {
				const random = createRandom(seed)
				const inBounds = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const value = inBounds ? '3' : '0'
					const td = el('td', { colspan: value })
					const table = el('table', {}, [el('tbody', {}, [el('tr', {}, [td])])])
					container.appendChild(table)
					const ids = registryFindings(container)
					table.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(inBounds ? [] : ['attribute/integer'])
			}
		})

		it('seeded <img ismap> ancestor verdict is reproducible & bites', () => {
			// Rule-isolated (the `coupling-domain` evaluate) so the ismap
			// ancestor logic is the discriminator: an `<a href><img ismap>`
			// is independently an a-forbids-interactive violation (img IS
			// interactive content), so the FULL registry can't be the
			// clean-branch oracle here. Still real DOM + seeded; the verdict
			// flips with `hasLinkAncestor`, biting in both directions.
			for (const seed of [3, 33, 333, 33003]) {
				const random = createRandom(seed)
				const hasLinkAncestor = random() < 0.5

				const buildOnce = (): boolean => {
					const img = el('img', { ismap: '' })
					const root = hasLinkAncestor ? el('a', { href: '/x' }, [img]) : el('span', {}, [img])
					container.appendChild(root)
					const flagged = evaluateOn(couplingDomainRule, root, img) !== null
					root.remove()
					return flagged
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				// ancestor a[href] ⇒ clean; no a[href] ancestor ⇒ flagged.
				expect(first).toBe(!hasLinkAncestor)
			}
		})
	})
})
