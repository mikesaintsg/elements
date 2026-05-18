// ============================================================================
//  Full-registry walk over the ordered / prefix parents — the regression
//  guard that would have caught Criticals #1 + #2.
//
//  The other inspector suites only ever evaluate ONE rule in isolation
//  (`evaluateOn(rule, …)`). That is exactly the blind spot two spec reviews
//  missed: the §1/§2 double-report only manifests when the WHOLE `rules`
//  registry runs over the WHOLE flat subtree. This suite walks the entire
//  registry (the realistic Phase-4 inspection pass) over every ordered /
//  prefix parent — `details` / `fieldset` / `figure` / `hgroup` / `picture`
//  / `table` / `select` / `ruby` — and asserts:
//
//    - a VALID tree yields ZERO findings;
//    - each SINGLE content-model violation yields EXACTLY ONE finding
//      (never the content↔structure double-report §1/§2 named).
//
//  Real DOM per AGENTS §16.2 (no mocks); perturbation-verified so the suite
//  BITES if the single-source/disjoint invariant ever regresses.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

describe('rules — full registry over ordered/prefix parents', () => {
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

	function text(tag: string, value: string): Element {
		const node = document.createElement(tag)
		node.textContent = value
		return node
	}

	// Run the WHOLE registry over the WHOLE flat subtree rooted at
	// `container` (the realistic full-tree inspection) and collect the rule
	// id of every finding, in walk order.
	function findings(root: Element): readonly string[] {
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

	function mount(node: Element): Element {
		container.appendChild(node)
		return node
	}

	// ── VALID trees → ZERO findings ───────────────────────────────────────

	describe('valid ordered/prefix trees yield zero findings', () => {
		it('<details> with one <summary> then flow content (the §1 case)', () => {
			// The exact §1 reproduction: previously TWO false positives
			// (content/required on details + context/parent-model on the
			// <p>). Now the prefix model is satisfied → ZERO.
			mount(el('details', [text('summary', 'Label'), text('p', 'Body')]))
			expect(findings(container)).toEqual([])
		})

		it('<fieldset> with optional <legend> then flow content', () => {
			mount(el('fieldset', [text('legend', 'Group'), text('p', 'Body')]))
			expect(findings(container)).toEqual([])
		})

		it('<fieldset> with NO legend (legend is optional) then flow', () => {
			mount(el('fieldset', [text('p', 'Body')]))
			expect(findings(container)).toEqual([])
		})

		it('<figure> with <figcaption> first then flow', () => {
			mount(el('figure', [text('figcaption', 'Cap'), el('img')]))
			expect(findings(container)).toEqual([])
		})

		it('<figure> with flow then <figcaption> last', () => {
			mount(el('figure', [el('img'), text('figcaption', 'Cap')]))
			expect(findings(container)).toEqual([])
		})

		it('<hgroup> with p* then one heading then p*', () => {
			mount(el('hgroup', [text('p', 'a'), text('h1', 'Title'), text('p', 'b')]))
			expect(findings(container)).toEqual([])
		})

		it('<picture> with source* then one img', () => {
			mount(el('picture', [el('source'), el('source'), el('img')]))
			expect(findings(container)).toEqual([])
		})

		it('<table> in canonical caption→colgroup→thead→tbody→tfoot order', () => {
			mount(el('table', [el('caption'), el('colgroup'), el('thead'), el('tbody'), el('tfoot')]))
			expect(findings(container)).toEqual([])
		})

		it('<table> with the tr-direct alternative (tbody/tr choice arm)', () => {
			mount(el('table', [el('tr', [el('td')])]))
			expect(findings(container)).toEqual([])
		})

		it('<select> with optional button then option/optgroup/hr', () => {
			mount(
				el('select', [
					el('button'),
					text('option', 'A'),
					el('optgroup', [text('option', 'B')]),
					el('hr'),
				]),
			)
			expect(findings(container)).toEqual([])
		})

		it('<ruby> with base phrasing then rt', () => {
			mount(el('ruby', [text('span', '漢'), text('rt', 'かん')]))
			expect(findings(container)).toEqual([])
		})

		it('<ruby> with rp-bracketed rt groups', () => {
			mount(el('ruby', [text('span', '漢'), text('rp', '('), text('rt', 'かん'), text('rp', ')')]))
			expect(findings(container)).toEqual([])
		})

		it('<dl> with dt+ dd+ groups', () => {
			mount(el('dl', [text('dt', 'Term'), text('dd', 'Def')]))
			expect(findings(container)).toEqual([])
		})

		it('<dl> with the div-form alternative', () => {
			mount(el('dl', [el('div', [text('dt', 'T'), text('dd', 'D')])]))
			expect(findings(container)).toEqual([])
		})
	})

	// ── SINGLE violation → EXACTLY ONE finding ────────────────────────────

	describe('each single content-model violation yields exactly one finding', () => {
		it('<details> missing its required <summary> → exactly one', () => {
			mount(el('details', [text('p', 'Body')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<details><p/><summary/> (summary not first) → exactly one (no §1 dup)', () => {
			// The §1/§2 double-report case: content/required (parent) MUST be
			// the single reporter — structure/single-first-child defers.
			mount(el('details', [text('p', 'Body'), text('summary', 'Late')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<fieldset> with content before <legend> → exactly one', () => {
			// `legend` is OPTIONAL in fieldset's prefix model (`legend?`),
			// so the permissive model cannot see a LATE legend —
			// structure/single-first-child is the sole reporter (disjoint:
			// content/required owns required-leading, single-first-child owns
			// optional-leading position). Exactly one finding.
			mount(el('fieldset', [text('p', 'Body'), text('legend', 'Late')]))
			expect(findings(container)).toEqual(['structure/single-first-child'])
		})

		it('<figure> with <figcaption> in the MIDDLE → exactly one', () => {
			// figure's childModel is a permissive flow model; the edge rule
			// is the SOLE reporter of a mid-figure figcaption (disjoint by
			// what each can structurally see).
			mount(el('figure', [el('img'), text('figcaption', 'Mid'), text('p', 'x')]))
			expect(findings(container)).toEqual(['structure/edge-child'])
		})

		it('<hgroup> with two headings (p between) → exactly one', () => {
			mount(el('hgroup', [text('h1', 'A'), text('p', 'x'), text('h1', 'B')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<picture> missing its required <img> → exactly one', () => {
			mount(el('picture', [el('source')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<table> with tfoot before tbody (out of order) → exactly one (no §2 dup)', () => {
			// The §2 reproduction: previously content/required +
			// structure/child-order. structure/child-order is GONE; exactly
			// one content/required now.
			mount(el('table', [el('tfoot'), el('tbody')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<select> with a non-permitted <p> child → exactly one (membership)', () => {
			// `<p>` is not an admissible select child tag: a MEMBERSHIP miss
			// owned solely by context/parent-model (fires on the <p>),
			// content/required defers — exactly one finding.
			mount(el('select', [text('option', 'A'), text('p', 'bad')]))
			expect(findings(container)).toEqual(['context/parent-model'])
		})

		it('<ruby> with NO annotation (bare base, no rt) → exactly one', () => {
			mount(el('ruby', [text('span', '漢')]))
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<dl> with a <dt> but no <dd> → exactly one', () => {
			mount(el('dl', [text('dt', 'Term')]))
			expect(findings(container)).toEqual(['content/required'])
		})
	})

	// ── perturbation: the regression guard bites ──────────────────────────

	describe('perturbation — the single-source guard bites (seeded)', () => {
		it('seeded valid/invalid <details> verdict is reproducible & exactly-one', () => {
			// valid = summary then flow → zero findings; invalid = missing
			// summary → exactly one. Same seed ⇒ same shape ⇒ same verdict;
			// the count is the discriminator that fails if the §1 double-
			// report (or under-detection) ever regresses.
			for (const seed of [11, 222, 3003, 44004]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const kids = valid ? [text('summary', 'S'), text('p', 'B')] : [text('p', 'B')]
					const details = el('details', kids)
					container.appendChild(details)
					const ids = findings(container)
					details.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(valid ? [] : ['content/required'])
			}
		})

		it('seeded ordered/out-of-order <table> verdict is exactly-one (no §2 dup)', () => {
			for (const seed of [7, 99, 1212, 30303]) {
				const random = createRandom(seed)
				const ordered = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const kids = ordered ? [el('thead'), el('tbody')] : [el('tbody'), el('thead')]
					const table = el('table', kids)
					container.appendChild(table)
					const ids = findings(container)
					table.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				// Ordered → zero; out-of-order → EXACTLY ONE (never two: the
				// §2 content↔structure double-report is structurally gone).
				expect(first).toEqual(ordered ? [] : ['content/required'])
			}
		})
	})
})
