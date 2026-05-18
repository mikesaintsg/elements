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

		// ── multi-child repeating groups (the blind spot every other
		//    "valid" fixture missed: exactly ONE element per group never
		//    exercised the `group*( choice([{tag,1}]…) )` idiom with ≥2
		//    consecutive matching children — the exact shape the greedy
		//    `tag`-run over-consumption regression false-positived on).
		//    A two-cell row / multi-option select are the most common
		//    HTML structures; these MUST yield ZERO findings. They are
		//    GREEN only with the bounded-cardinality matcher and RED
		//    without it (perturbation-verified below).

		it('<tr> with TWO <td> cells (canonical multi-cell row)', () => {
			mount(el('table', [el('tbody', [el('tr', [el('td'), el('td')])])]))
			expect(findings(container)).toEqual([])
		})

		it('<tr> with mixed <th> then <td> cells', () => {
			mount(el('table', [el('tbody', [el('tr', [el('th'), el('td'), el('td')])])]))
			expect(findings(container)).toEqual([])
		})

		it('<select> with TWO direct <option> children', () => {
			mount(el('select', [text('option', 'A'), text('option', 'B')]))
			expect(findings(container)).toEqual([])
		})

		it('<optgroup> with TWO <option> children (nested repeating group)', () => {
			mount(el('select', [el('optgroup', [text('option', 'A'), text('option', 'B')])]))
			expect(findings(container)).toEqual([])
		})

		it('<select> mixing <option> then <hr> (heterogeneous choice arms)', () => {
			mount(el('select', [text('option', 'A'), el('hr'), text('option', 'B')]))
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

		// ── parent-restricted DESCENDANT relation (the C4 fix) ────────────────
		//
		// `option`/`optgroup` are valid as a *descendant* of select/datalist/
		// optgroup (the spec sanctions generic `<div>`/`<noscript>` wrappers
		// inside `<select>`/`<optgroup>` per their inner-content category) —
		// NOT merely a direct child. The strict direct-flat-parent check
		// false-positived on the inner `<option>` whose flat-parent is the
		// `<div>`; the `relation:'descendant'` datum fixes it. These MUST be
		// `[]` (and were the C4 false positive before the relation branch).

		it('C4: <select><option/><div><option/></div></select> is valid → []', () => {
			mount(el('select', [text('option', 'a'), el('div', [text('option', 'b')])]))
			expect(findings(container)).toEqual([])
		})

		it('<select><noscript><option/></noscript></select> is valid → []', () => {
			// The `select` card sanctions `noscript` in its inner-content
			// category; `option` is valid as a descendant of `select`.
			mount(el('select', [el('noscript', [text('option', 'a')])]))
			expect(findings(container)).toEqual([])
		})

		it('<select><div><optgroup><option/></optgroup></div></select> → []', () => {
			// `optgroup` is also `relation:'descendant'` of `select` — a
			// wrapping `<div>` between them is spec-permitted.
			mount(el('select', [el('div', [el('optgroup', [text('option', 'a')])])]))
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

		// ── parent-restricted descendant/child still BITE on real violations ──

		it('<div><option/></div> with NO select/optgroup/datalist ancestor → exactly one', () => {
			// The genuine INVALID descendant case: an `option` with no
			// select/optgroup/datalist flat-ANCESTOR still violates its
			// `relation:'descendant'` parent-restriction — the fix relaxes the
			// check to "any ancestor", it does NOT disable it.
			mount(el('div', [text('option', 'orphan')]))
			expect(findings(container)).toEqual(['structure/parent-restricted'])
		})

		it('<div><td/></div> still fires exactly one structure/parent-restricted (child, no regression)', () => {
			// `td` is `relation:'child'` — the strict direct-flat-parent check
			// is UNCHANGED, so the deliberate `<div><td>` detection must still
			// fire exactly once (the child relation is the no-regression
			// anchor for the C4 fix).
			mount(el('div', [el('td')]))
			expect(findings(container)).toEqual(['structure/parent-restricted'])
		})

		// ── duplicate required-leading SINGULAR child (the Phase-7 dogfood
		//    gap): a `closed:false` prefix model whose `segments[0]` is a
		//    `{kind:'tag', count:'1'|'?'}` segment permits AT MOST ONE of that
		//    tag. A SECOND occurrence is a content-model violation the prefix
		//    model's open trailing arm previously absorbed silently (the
		//    `<details>`→ZERO-findings bug). Now exactly ONE
		//    `content/cardinality` finding (parent-keyed), with
		//    structure/single-first-child DEFERRING the cardinality aspect
		//    (its position concern stays its own for the single-occurrence
		//    case) — the disjoint single-source partition preserved.

		it('<details> with TWO <summary> → exactly one content/cardinality', () => {
			// The exact reported defect: previously ZERO findings (silently
			// missed). `summary`(1) is `details`'s required-leading singular
			// child; a second <summary> is a tree-decidable violation.
			mount(el('details', [text('summary', 'a'), text('summary', 'b'), text('p', 'x')]))
			expect(findings(container)).toEqual(['content/cardinality'])
		})

		it('<fieldset> with TWO <legend> → exactly one content/cardinality', () => {
			// `legend`(?) is `fieldset`'s optional-leading singular child —
			// at most one. Previously TWO structure/single-first-child
			// findings (one per legend); now the cardinality is content's
			// single concern → exactly one content/cardinality.
			mount(el('fieldset', [text('legend', 'a'), text('legend', 'b'), text('p', 'x')]))
			expect(findings(container)).toEqual(['content/cardinality'])
		})

		it('<table> with TWO <caption> → exactly one content/required (closed model owns it)', () => {
			// `table` is a CLOSED model: the second <caption> already breaks
			// the closed-exhaustiveness check, so content/required is the
			// single owner. structure/single-first-child must DEFER the
			// cardinality aspect here too (previously fired twice → triple
			// report). content/cardinality must NOT also fire (it defers to
			// content/required when that already bites). Exactly one.
			mount(
				el('table', [
					text('caption', 'a'),
					text('caption', 'b'),
					el('tbody', [el('tr', [el('td')])]),
				]),
			)
			expect(findings(container)).toEqual(['content/required'])
		})

		it('<details> with a NESTED <details><summary> — inner summary scoped to inner (no false count)', () => {
			// Flat-children scoping must be correct: the INNER <summary>
			// belongs to the INNER <details>; it must NOT be counted against
			// the OUTER <details>. Both are conformant → ZERO findings.
			mount(
				el('details', [
					text('summary', 'outer'),
					text('p', 'x'),
					el('details', [text('summary', 'inner'), text('p', 'y')]),
				]),
			)
			expect(findings(container)).toEqual([])
		})

		it('<details> with TWO <summary> AND a nested conformant <details> → exactly one (outer only)', () => {
			// The outer duplicate fires exactly once; the inner conformant
			// <details> contributes nothing — proves the count is scoped to
			// each parent's own flat children, not the whole subtree.
			mount(
				el('details', [
					text('summary', 'a'),
					text('summary', 'b'),
					el('details', [text('summary', 'inner'), text('p', 'y')]),
				]),
			)
			expect(findings(container)).toEqual(['content/cardinality'])
		})

		it('<details> with one <summary>, script-supporting intermixed, second <summary> → exactly one', () => {
			// Script-supporting (<script>/<template>) intermixed must not mask
			// the duplicate: the cardinality count is over the real same-tag
			// children, script-supporting freely skipped.
			const details = el('details', [
				text('summary', 'a'),
				el('script'),
				text('summary', 'b'),
				el('template'),
				text('p', 'x'),
			])
			mount(details)
			expect(findings(container)).toEqual(['content/cardinality'])
		})
	})

	// ── duplicate required-leading singular child: CONFORMANT cases MUST be
	//    zero (the recurring critical: NO false-positive on valid markup).

	describe('conformant required-leading-singular trees yield zero findings', () => {
		it('<details> with exactly one <summary> then flow (one summary + flow)', () => {
			mount(el('details', [text('summary', 'x'), text('p', 'flow'), text('div', 'more flow')]))
			expect(findings(container)).toEqual([])
		})

		it('<fieldset> with exactly one <legend> then flow', () => {
			mount(el('fieldset', [text('legend', 'x'), text('p', 'flow')]))
			expect(findings(container)).toEqual([])
		})

		it('<fieldset> with NO legend then flow (legend optional → zero)', () => {
			mount(el('fieldset', [text('p', 'flow')]))
			expect(findings(container)).toEqual([])
		})

		it('<table> with exactly one <caption> then colgroup/thead/tbody', () => {
			mount(el('table', [el('caption'), el('colgroup'), el('thead'), el('tbody')]))
			expect(findings(container)).toEqual([])
		})

		it('<figure> with <figcaption> first then flow (figcaption not a leading-tag segment)', () => {
			mount(el('figure', [text('figcaption', 'c'), el('img')]))
			expect(findings(container)).toEqual([])
		})

		it('<figure> with flow then <figcaption> last', () => {
			mount(el('figure', [el('img'), text('figcaption', 'c')]))
			expect(findings(container)).toEqual([])
		})

		it('<details> with one <summary> then script-supporting then flow', () => {
			mount(el('details', [text('summary', 'x'), el('script'), text('p', 'flow')]))
			expect(findings(container)).toEqual([])
		})

		it('<details><summary/> with a nested <details><summary/> (inner scoped, both conformant)', () => {
			mount(
				el('details', [
					text('summary', 'outer'),
					el('details', [text('summary', 'inner'), text('p', 'y')]),
				]),
			)
			expect(findings(container)).toEqual([])
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

		it('seeded multi-cell <tr> over group*(choice([{tag,1}]…)) — zero vs exactly-one', () => {
			// The blind-spot guard with TEETH: the `valid` branch is the
			// canonical TWO-cell row — a repeating group with ≥2 children
			// satisfying a `count:'1'` choice arm. The greedy-`tag`-run
			// regression swallowed both <td> into one run, withinCount('1',2)
			// → false, the enclosing `group*` matched zero iterations, the
			// `closed` <tr> model was left unconsumed, and a FALSE
			// `content/required` fired on perfectly valid markup. So the
			// `valid` branch is `[]` ONLY with the bounded-cardinality
			// matcher; it is RED (`['content/required']`) without it — this
			// perturbation bites in BOTH directions. The `invalid` branch
			// (a non-admitted <span> the closed <tr> model cannot absorb)
			// is a MEMBERSHIP miss owned solely by context/parent-model
			// (content/required defers — disjoint single source), so it
			// stays EXACTLY ONE finding regardless of the matcher.
			for (const seed of [13, 137, 1370, 13007]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const row = valid
						? el('tr', [el('td'), el('td')])
						: el('tr', [el('td'), text('span', 'x'), el('td')])
					const table = el('table', [el('tbody', [row])])
					container.appendChild(table)
					const ids = findings(container)
					table.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(valid ? [] : ['context/parent-model'])
			}
		})

		it('seeded multi-option <select> over group*(choice([{tag,1}]…)) — zero vs exactly-one', () => {
			// Same idiom, the OTHER canonical victim: a multi-option
			// drop-down. `valid` = two direct <option> (the regression
			// false-positived `content/required` on the <select>); `invalid`
			// = an unadmitted <p> sibling the closed select model rejects.
			for (const seed of [21, 211, 2110, 21007]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const sel = valid
						? el('select', [text('option', 'A'), text('option', 'B')])
						: el('select', [text('option', 'A'), text('p', 'bad'), text('option', 'B')])
					container.appendChild(sel)
					const ids = findings(container)
					sel.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				// valid → []; invalid → exactly one (the <p> membership miss
				// is owned solely by context/parent-model, content/required
				// defers — disjoint single source).
				expect(first).toEqual(valid ? [] : ['context/parent-model'])
			}
		})

		it('seeded duplicate-required-leading <details> verdict is reproducible & exactly-one', () => {
			// valid = exactly one <summary> then flow → ZERO findings;
			// invalid = TWO <summary> → EXACTLY ONE content/cardinality. Same
			// seed ⇒ same shape ⇒ same verdict. The discriminator bites in
			// BOTH directions: a false-positive on the conformant single
			// summary would turn `valid` non-empty; a regression that misses
			// the duplicate would turn `invalid` empty.
			for (const seed of [19, 191, 1907, 19077]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const kids = valid
						? [text('summary', 'S'), text('p', 'B')]
						: [text('summary', 'S1'), text('summary', 'S2'), text('p', 'B')]
					const details = el('details', kids)
					container.appendChild(details)
					const ids = findings(container)
					details.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(valid ? [] : ['content/cardinality'])
			}
		})

		it('seeded duplicate-required-leading <fieldset> verdict is reproducible & exactly-one', () => {
			// `legend`(?) optional-leading singular: valid = zero-or-one
			// legend → ZERO; invalid = TWO legends → EXACTLY ONE
			// content/cardinality (single-first-child defers the cardinality;
			// no double-report). Bites both directions.
			for (const seed of [23, 233, 2307, 23077]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const kids = valid
						? [text('legend', 'L'), text('p', 'B')]
						: [text('legend', 'L1'), text('legend', 'L2'), text('p', 'B')]
					const fieldset = el('fieldset', kids)
					container.appendChild(fieldset)
					const ids = findings(container)
					fieldset.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(valid ? [] : ['content/cardinality'])
			}
		})

		it('seeded <option> descendant-relation verdict is reproducible & exactly-one', () => {
			// Perturbation over a `relation:'descendant'` constraint (the C4
			// fix). `valid` = an `<option>` wrapped in a spec-permitted
			// `<div>` UNDER a `<select>` (a descendant, not a direct child —
			// the exact C4 false-positive shape: MUST be `[]`, and is RED
			// `['structure/parent-restricted']` without the descendant
			// branch). `invalid` = the SAME `<div><option>` with NO
			// select/optgroup/datalist ancestor — the descendant restriction
			// still BITES (exactly one structure/parent-restricted). Same
			// seed ⇒ same shape ⇒ same verdict; the discriminator fails in
			// BOTH directions if the relation branch regresses.
			for (const seed of [17, 173, 1730, 17007]) {
				const random = createRandom(seed)
				const valid = random() < 0.5

				const buildOnce = (): readonly string[] => {
					const inner = el('div', [text('option', 'x')])
					const root = valid ? el('select', [inner]) : el('div', [inner])
					container.appendChild(root)
					const ids = findings(container)
					root.remove()
					return ids
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toEqual(second)
				expect(first).toEqual(valid ? [] : ['structure/parent-restricted'])
			}
		})
	})
})
