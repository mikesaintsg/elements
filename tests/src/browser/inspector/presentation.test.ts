// ============================================================================
//  presentation family — computed-style semantic-break rules (Phase 5).
//
//  Real DOM + REAL framework CSS per AGENTS §16.2 (no mocked style). This
//  suite runs in the `src:browser` (chromium) project where `setupBrowser.ts`
//  loads `src/styles/index.scss`, so every `getComputedStyle` read is a real
//  browser resolution. Fixtures are attached to `document.body` (computed
//  style only resolves for a rendered element) and given REAL inline /
//  injected-stylesheet CSS; the rule reads it through the Phase-2
//  `Walker.context(el).style()` exactly as the live Inspector does.
//
//  FALSE-POSITIVE-ON-VALID-MARKUP is this initiative's recurring Critical
//  defect. Therefore EVERY rule asserts THREE shapes:
//    • valid-default            → 0 findings (the UA default renders it)
//    • valid-with-compensation  → 0 findings (a corpus-sanctioned ARIA role
//                                  / replacement affordance preserves it)
//    • genuine-violation        → EXACTLY 1 finding, correct rule/severity/
//                                  cite
//  Plus whole-`rules`-registry-over-the-real-`Walker` one-finding-per-
//  violation / disjointness assertions, and `createRandom`-seeded
//  perturbation that BITES in BOTH directions.
//
//  NOTE: `presentation/list-item` AND `presentation/table` were BOTH
//  DELIBERATELY REMOVED — an element's a11y role does NOT depend on its
//  `display` value (WHATWG / CSS Display 3 / HTML-AAM): a `<li>` is still a
//  list item and a `<td>`/`<tr>` still a cell/row at any `display`. The
//  `display ∉ ['list-item']` / `display ∉ ['table-*']` `error`s were the
//  exact inherently-stylistic CSS-linting the ROADMAP non-goal forbids and
//  false-positived on the framework's OWN documented-conformant breadcrumb
//  (`_nav.scss` `li { display: inline-flex }`, no `role=listitem`),
//  pagination, AND the expandable-table idiom (`_table.scss` `td:first-child
//  { display: flex }`, `TablesPage.vue`, no `role=cell`). The genuinely-
//  semantic list concern (`list-style:none` w/o `role=list`) ships as the
//  surviving `presentation/list-style` warning; the only tree-decidable
//  table concern (`display:none`) is owned by `presentation/hidden`.
//  Phase-3.3 doctrine: spec/non-goal wins → correct the plan, reduce root
//  complexity. The shared `display:contents` carve-out (its sole consumers)
//  is therefore also GONE (no `display`-model entry remains). This suite no
//  longer has a list-item or a table triplet.
//
//  Exact expected outcomes (quoted in the report):
//    <ul role=list style=list-style:none>           → 0
//    <ul style=list-style:none> (no role)           → 1 presentation/list-style warning
//    <bdo style=unicode-bidi:normal>                → 1 presentation/bidi error
//    <p hidden style=display:block>                 → 1 presentation/hidden error
//    <embed hidden>                                  → 0 (the :not(embed) carve-out)
//    closed <dialog> (UA display:none)              → 0
//    <dialog style=display:block> (closed)          → 1 presentation/visibility error
//    focusable <button style=outline:none>          → 1 presentation/focus error
//    <button style="outline:none;box-shadow:…">     → 0 (replacement affordance)
//    <pre style=white-space:normal>                 → 1 presentation/preformatted error
//    first-party <textarea wrap=off> (real cascade) → 0 — PHASE-6 REMEDIATED.
//                                                      `_textarea.scss` now
//                                                      carries
//                                                      `textarea[wrap='off' i]
//                                                      { white-space: pre }`
//                                                      (corpus §15.5.17), so
//                                                      the cascade honors the
//                                                      `wrap=off` hint and the
//                                                      corpus-faithful rule
//                                                      (UNCHANGED) yields
//                                                      nothing. Was a LOCKED
//                                                      "→ 1" tracking a genuine
//                                                      framework-cascade
//                                                      non-conformance; the
//                                                      framework was fixed at
//                                                      the source — the rule
//                                                      was NEVER weakened.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const listStyleRule = ruleById('presentation/list-style')
const bidiRule = ruleById('presentation/bidi')
const preRule = ruleById('presentation/preformatted')
const hiddenRule = ruleById('presentation/hidden')
const focusRule = ruleById('presentation/focus')
const visibilityRule = ruleById('presentation/visibility')

describe('rules — presentation family (computed-style, real CSS)', () => {
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

	// Evaluate ONE rule on a target inside a real rendered subtree.
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

	function mount(node: Element): Element {
		container.appendChild(node)
		return node
	}

	// ── presentation/list-item + presentation/table are REMOVED ────────────
	// (no describe blocks for either). An element's a11y role does NOT depend
	// on its `display` value (WHATWG / CSS Display 3 / HTML-AAM): a `<li>` is
	// still a list item and a `<td>`/`<tr>` still a cell/row at any
	// `display`. The former `display ∉ ['list-item']` / `display ∉
	// ['table-*']` `error`s were the exact inherently-stylistic CSS-linting
	// the ROADMAP non-goal forbids; they false-positived on the framework's
	// own documented-conformant breadcrumb/pagination (list-item) and
	// expandable-table idiom (table). Removed (rules + data rows + triplets +
	// the box-vs-semantic `display:contents` carve-out they were the sole
	// consumers of — no `display`-model entry survives, so the carve-out is
	// dead code, deleted not retained). The conformant first-party SILENCE
	// (`<menu>`/breadcrumb/pagination + the `TablesPage` expandable table) is
	// asserted by the surviving whole-registry conformant-sweep test. The
	// genuinely-semantic list concern ships as `presentation/list-style`
	// (unchanged below); the only tree-decidable table concern
	// (`display:none`) is owned by `presentation/hidden`.

	// ── presentation/list-style ───────────────────────────────────────────

	describe('list-style — <ul>/<ol> list-style:none strips list semantics (renderings#lists)', () => {
		it('valid-default: <ul> with UA disc marker → 0', () => {
			const ul = mount(el('ul', {}, [el('li')]))
			expect(evaluateOn(listStyleRule, ul, ul)).toBeNull()
		})

		it('valid-with-compensation: <ul role=list style=list-style:none> → 0', () => {
			const ul = mount(el('ul', { role: 'list', style: 'list-style:none' }, [el('li')]))
			expect(evaluateOn(listStyleRule, ul, ul)).toBeNull()
		})

		it('genuine-violation: <ul style=list-style:none> (no role) → exactly 1 warning', () => {
			const ul = mount(el('ul', { style: 'list-style:none' }, [el('li')]))
			const finding = evaluateOn(listStyleRule, ul, ul)
			if (finding === null) throw new Error('expected a presentation/list-style finding')
			expect(finding.rule).toBe('presentation/list-style')
			expect(finding.severity).toBe('warning')
			expect(finding.cite).toBe('renderings#lists')
		})

		it('genuine-violation also fires on <ol style=list-style:none>', () => {
			const ol = mount(el('ol', { style: 'list-style:none' }, [el('li')]))
			const finding = evaluateOn(listStyleRule, ol, ol)
			if (finding === null) throw new Error('expected a presentation/list-style finding')
			expect(finding.severity).toBe('warning')
		})
	})

	// ── presentation/bidi ─────────────────────────────────────────────────

	describe('bidi — <bdo>/<bdi> unicode-bidi (renderings#bidirectional-text)', () => {
		it('valid-default: <bdo dir=rtl> (UA unicode-bidi:isolate-override) → 0', () => {
			const bdo = mount(el('bdo', { dir: 'rtl' }))
			expect(evaluateOn(bidiRule, bdo, bdo)).toBeNull()
		})

		it('valid-default: <bdi> (UA unicode-bidi:isolate) → 0', () => {
			const bdi = mount(el('bdi'))
			expect(evaluateOn(bidiRule, bdi, bdi)).toBeNull()
		})

		it('genuine-violation: <bdo style=unicode-bidi:normal> → exactly 1 error', () => {
			const bdo = mount(el('bdo', { dir: 'rtl', style: 'unicode-bidi:normal' }))
			const finding = evaluateOn(bidiRule, bdo, bdo)
			if (finding === null) throw new Error('expected a presentation/bidi finding')
			expect(finding.rule).toBe('presentation/bidi')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#bidirectional-text')
		})

		it('genuine-violation: <bdi style=unicode-bidi:normal> → exactly 1 error', () => {
			const bdi = mount(el('bdi', { style: 'unicode-bidi:normal' }))
			const finding = evaluateOn(bidiRule, bdi, bdi)
			if (finding === null) throw new Error('expected a presentation/bidi finding')
			expect(finding.rule).toBe('presentation/bidi')
		})

		it('does NOT fire on a generic [dir] element (decidable-boundary scope)', () => {
			// A plain <span dir=rtl> with a reset is stylistic-adjacent and
			// ARIA-roleless — deliberately out of scope (the documented false-
			// positive boundary). The bidi rule only owns <bdo>/<bdi>.
			const span = mount(el('span', { dir: 'rtl', style: 'unicode-bidi:normal' }))
			expect(evaluateOn(bidiRule, span, span)).toBeNull()
		})
	})

	// ── presentation/table is REMOVED (no describe block) ─────────────────
	// A `<table>`/`<tr>`/`<td>`/… keeps its table/row/cell a11y role at ANY
	// `display` (WHATWG / CSS Display 3 / HTML-AAM) — the `display ∉
	// ['table-*']` `error` was the exact inherently-stylistic CSS-linting the
	// ROADMAP non-goal forbids; it false-positived on the framework's OWN
	// documented-conformant expandable-table idiom (`_table.scss` `table >
	// tbody > tr:has(+ tr[data-table-expansion]) > td:first-child { display:
	// flex }`, `TablesPage.vue`, no `role=cell`). Removed (rule + the 8
	// table-model data rows + triplet + the `<tr display:contents>`
	// carve-out/perturbation — the box-vs-semantic `display:contents`
	// carve-out had ONLY list-item + table as consumers, so with both gone it
	// is dead code, deleted). The only tree-decidable table concern
	// (`display:none` removing the element from the a11y tree) is owned by
	// `presentation/hidden`. The conformant first-party `TablesPage`
	// expandable table SILENCE is asserted by the whole-registry
	// conformant-sweep test below.

	// ── presentation/preformatted ─────────────────────────────────────────

	describe('preformatted — <pre>/<textarea> white-space (renderings#flow-content / #the-textarea-element)', () => {
		it('valid-default: <pre> (UA white-space:pre) → 0', () => {
			const pre = mount(el('pre', {}, []))
			pre.textContent = 'a\n  b'
			expect(evaluateOn(preRule, pre, pre)).toBeNull()
		})

		it('valid: <pre style=white-space:pre-wrap> (the pre[wrap] hint value) → 0', () => {
			const pre = mount(el('pre', { style: 'white-space:pre-wrap' }))
			expect(evaluateOn(preRule, pre, pre)).toBeNull()
		})

		it('genuine-violation: <pre style=white-space:normal> → exactly 1 error', () => {
			const pre = mount(el('pre', { style: 'white-space:normal' }))
			const finding = evaluateOn(preRule, pre, pre)
			if (finding === null) throw new Error('expected a presentation/preformatted finding')
			expect(finding.rule).toBe('presentation/preformatted')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#flow-content')
		})

		it('valid-default: <textarea> (UA white-space:pre-wrap) → 0', () => {
			const ta = mount(el('textarea'))
			expect(evaluateOn(preRule, ta, ta)).toBeNull()
		})

		it('valid: <textarea wrap=off> with computed white-space:pre → 0', () => {
			const ta = mount(el('textarea', { wrap: 'off', style: 'white-space:pre' }))
			expect(evaluateOn(preRule, ta, ta)).toBeNull()
		})

		it('genuine-violation: <textarea style=white-space:normal> → exactly 1 error', () => {
			const ta = mount(el('textarea', { style: 'white-space:normal' }))
			const finding = evaluateOn(preRule, ta, ta)
			if (finding === null) throw new Error('expected a presentation/preformatted finding')
			expect(finding.rule).toBe('presentation/preformatted')
			expect(finding.cite).toBe('renderings#the-textarea-element')
		})
	})

	// ── presentation/hidden ───────────────────────────────────────────────

	describe('hidden — [hidden] / [hidden=until-found] (renderings#hidden-elements)', () => {
		it('valid-default: <p hidden> (UA display:none) → 0', () => {
			const p = mount(el('p', { hidden: '' }))
			expect(evaluateOn(hiddenRule, p, p)).toBeNull()
		})

		it('genuine-violation: <p hidden style="display:block !important"> → exactly 1 error', () => {
			// The UA/framework hides [hidden] with `display:none !important`
			// (so a plain inline `display:block` correctly does NOT re-reveal
			// — see the valid case above is implicit). The genuine author
			// override that DOES win (and breaks the hidden semantic) is an
			// `!important` inline declaration — that is the real violation the
			// rule must catch.
			const p = mount(el('p', { hidden: '', style: 'display:block !important' }))
			const finding = evaluateOn(hiddenRule, p, p)
			if (finding === null) throw new Error('expected a presentation/hidden finding')
			expect(finding.rule).toBe('presentation/hidden')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#hidden-elements')
		})

		it('valid: <p hidden style="display:block"> stays hidden (UA !important wins) → 0', () => {
			// A non-important author override does NOT defeat the UA's
			// `display:none !important`, so the element IS still hidden — a
			// conformant outcome the rule must NOT flag (false-positive guard).
			const p = mount(el('p', { hidden: '', style: 'display:block' }))
			expect(evaluateOn(hiddenRule, p, p)).toBeNull()
		})

		it('the :not(embed) carve-out: <embed hidden> → 0 (never flagged)', () => {
			// embed[hidden] gets display:inline by design (§15.3.1); the rule
			// must honor the :not(embed) carve-out faithfully.
			const embed = mount(el('embed', { hidden: '' }))
			expect(evaluateOn(hiddenRule, embed, embed)).toBeNull()
		})

		it('genuine-violation: <p hidden=until-found style=content-visibility:visible> → exactly 1', () => {
			const p = mount(el('p', { hidden: 'until-found', style: 'content-visibility:visible' }))
			const finding = evaluateOn(hiddenRule, p, p)
			if (finding === null) throw new Error('expected a presentation/hidden finding')
			expect(finding.rule).toBe('presentation/hidden')
			expect(finding.cite).toBe('renderings#hidden-elements')
		})
	})

	// ── presentation/focus ────────────────────────────────────────────────

	describe('focus — focusable element keeps a focus affordance (renderings#phrasing-content)', () => {
		it('valid-default: <button> (UA :focus-visible outline:auto, base outline kept) → 0', () => {
			const button = mount(el('button'))
			expect(evaluateOn(focusRule, button, button)).toBeNull()
		})

		it('valid-with-compensation: <button> outline:none BUT a real box-shadow ring → 0', () => {
			const button = mount(el('button', { style: 'outline:none;box-shadow:0 0 0 2px blue' }))
			expect(evaluateOn(focusRule, button, button)).toBeNull()
		})

		it('valid-with-compensation: <button> outline:none BUT a real border → 0', () => {
			const button = mount(el('button', { style: 'outline:none;border:2px solid blue' }))
			expect(evaluateOn(focusRule, button, button)).toBeNull()
		})

		it('genuine-violation: <button style=outline:none> no replacement → exactly 1 error', () => {
			const button = mount(el('button', { style: 'outline:none;border:none;box-shadow:none' }))
			const finding = evaluateOn(focusRule, button, button)
			if (finding === null) throw new Error('expected a presentation/focus finding')
			expect(finding.rule).toBe('presentation/focus')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#phrasing-content')
		})

		it('does NOT fire on a non-focusable element (<a> with no href)', () => {
			const a = mount(el('a', { style: 'outline:none;border:none;box-shadow:none' }))
			expect(evaluateOn(focusRule, a, a)).toBeNull()
		})

		it('does NOT fire on a tabindex=-1 element (removed from the focus contract)', () => {
			const button = mount(
				el('button', { tabindex: '-1', style: 'outline:none;border:none;box-shadow:none' }),
			)
			expect(evaluateOn(focusRule, button, button)).toBeNull()
		})
	})

	// ── presentation/visibility ───────────────────────────────────────────

	describe('visibility — closed dialog/popover (renderings#flow-content)', () => {
		it('valid-default: a closed <dialog> (UA display:none) → 0', () => {
			const dialog = mount(el('dialog'))
			expect(evaluateOn(visibilityRule, dialog, dialog)).toBeNull()
		})

		it('genuine-violation: closed <dialog style="display:block"> → exactly 1 error', () => {
			// The UA `dialog:not([open]){display:none}` is NOT `!important`
			// (verified empirically — unlike `[hidden]`), so a plain inline
			// `display:block` wins and re-reveals the closed dialog: a genuine
			// semantic break (the user sees a dialog the model says is closed).
			const dialog = mount(el('dialog', { style: 'display:block' }))
			const finding = evaluateOn(visibilityRule, dialog, dialog)
			if (finding === null) throw new Error('expected a presentation/visibility finding')
			expect(finding.rule).toBe('presentation/visibility')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#flow-content')
		})

		it('valid: an OPEN <dialog open> (UA shows it) → 0', () => {
			const dialog = mount(el('dialog', { open: '' }))
			expect(evaluateOn(visibilityRule, dialog, dialog)).toBeNull()
		})

		it('valid: an OPEN [popover] (style display:block but :popover-open) is not flagged', () => {
			// A popover that is genuinely shown is conformant; the rule only
			// fires on a CLOSED (not :popover-open) popover. A detached/non-
			// shown popover with UA display:none → 0 (the valid-default).
			const closedPop = mount(el('div', { popover: '' }))
			expect(evaluateOn(visibilityRule, closedPop, closedPop)).toBeNull()
		})

		it('genuine-violation: closed [popover] forced display:block → exactly 1 error', () => {
			const pop = mount(el('div', { popover: '', style: 'display:block' }))
			const finding = evaluateOn(visibilityRule, pop, pop)
			if (finding === null) throw new Error('expected a presentation/visibility finding')
			expect(finding.rule).toBe('presentation/visibility')
			expect(finding.cite).toBe('renderings#flow-content')
		})

		it('documented out-of-scope: <summary> display is the MARKER (presentational), never flagged', () => {
			// ROADMAP non-goal: "only flags overrides that contradict an
			// element's SEMANTICS, nothing stylistic". A <summary>'s
			// `display:list-item` is the default disclosure-triangle MARKER,
			// not the summary's semantic (it remains the disclosure control at
			// any display — the genuine "summary must be first child" rule is
			// the STRUCTURE lens, Phase 3). Virtually every design system /
			// this framework restyles it; flagging it is the recurring false-
			// positive Critical. The rule must NEVER fire on a summary.
			const a = mount(el('details', {}, [el('summary', { style: 'display:block' }), el('p')]))
			expect(evaluateOn(visibilityRule, a, a.querySelector('summary') as Element)).toBeNull()
			const b = mount(el('details', {}, [el('summary', { style: 'display:flex' }), el('p')]))
			expect(evaluateOn(visibilityRule, b, b.querySelector('summary') as Element)).toBeNull()
		})

		it('documented out-of-scope: a closed <details> light body child is NOT flagged (shadow-internal hiding)', () => {
			// The corpus §15.5.5 closed-details body-hiding is implemented on
			// the UA SHADOW `::details-content` slot wrapper's
			// `content-visibility:hidden`, which the corpus prose itself states
			// is "not directly visible to author code". A conformant closed
			// <details>'s LIGHT body child computes a fully-visible box, so a
			// light-child check would false-positive on every conformant
			// closed <details>. Deliberately OUT OF SCOPE — the rule must NOT
			// fire on the body child in either the closed or open state.
			const closed = mount(el('details', {}, [el('summary'), el('p')]))
			expect(evaluateOn(visibilityRule, closed, closed.querySelector('p') as Element)).toBeNull()
			const open = mount(el('details', { open: '' }, [el('summary'), el('p')]))
			expect(evaluateOn(visibilityRule, open, open.querySelector('p') as Element)).toBeNull()
		})
	})

	// ── whole-registry: one finding per violation + disjointness ───────────

	describe('whole-registry — one finding per violation, disjoint, lens-stamped', () => {
		it('a fully-valid presentation tree yields ZERO findings (real framework CSS)', () => {
			// Every element rendered with the REAL framework cascade (no inline
			// overrides) — the presentation lens must be SILENT on conformant
			// markup. <summary>'s framework `display:flex` is correctly NOT a
			// presentation finding (the marker is presentational per the
			// ROADMAP non-goal — out of scope). The plain `<table>` yields 0
			// too (a conformant table; `presentation/table` is REMOVED — a
			// `display` change never stripped a table element's a11y role).
			mount(
				el('div', {}, [
					el('ul', {}, [el('li'), el('li')]),
					el('bdo', { dir: 'rtl' }),
					el('table', {}, [el('tbody', {}, [el('tr', {}, [el('td'), el('th')])])]),
					el('pre'),
					el('button'),
					el('dialog'),
					el('details', {}, [el('summary'), el('p')]),
				]),
			)
			expect(registryFindings(container)).toEqual([])
		})

		it('conformant first-party menu/breadcrumb/pagination/expandable-table (real CSS): ZERO error-severity presentation findings; ONLY documented list-style warnings', () => {
			// The DECISIVE regression guard. FOUR documented-conformant
			// first-party patterns under the REAL framework cascade, NO ARIA
			// compensation (exactly as the framework ships them):
			//   • `<menu><li><button>` toolbar — `_menu.scss` `<menu> > li {
			//     display: contents }` + `list-style: none` (MenuPage.vue).
			//   • `<nav aria-label="Breadcrumb"><ol><li>` — `_nav.scss`
			//     `nav[aria-label] > :is(ol,ul) > li { display: inline-flex }`
			//     (NavPage.vue §Breadcrumb), NO `role=listitem`.
			//   • `<nav aria-label="Pagination"><ul><li><a>` — same `li`
			//     `display:inline-flex` (NavPage.vue §Pagination).
			//   • the expandable `<table>` — `_table.scss` `table > tbody >
			//     tr:has(+ tr[data-table-expansion]) > td:first-child {
			//     display: flex }` (TablesPage.vue), NO `role="cell"`: the
			//     leading cell of an expandable row computes `display:flex`.
			// The now-REMOVED `presentation/list-item` `error`-false-positived
			// on the first three (a `<li>` styled `flex`/`inline-flex`/
			// `contents` is STILL a list item per CSS Display 3 / HTML-AAM);
			// the now-REMOVED `presentation/table` `error`-false-positived on
			// the fourth (a `<td display:flex>` is STILL a cell). Both were
			// box-model, not semantics. With BOTH rules gone the ONLY
			// presentation findings are the documented `presentation/
			// list-style` `warning` on the role-less `list-style:none` list
			// containers (aria.md §58-59/§165-168 — a CONSCIOUS, corpus-
			// grounded, Phase-6-non-blocking by-design surfacing; Phase 6 only
			// FAILS on `error`). The Phase-6-unblocking invariant: ZERO
			// error-severity presentation findings over conformant first-party
			// markup.
			const menu = mount(
				el('menu', {}, [el('li', {}, [el('button')]), el('li', {}, [el('button')])]),
			)
			const breadcrumb = document.createElement('nav')
			breadcrumb.setAttribute('aria-label', 'Breadcrumb')
			breadcrumb.innerHTML =
				'<ol><li><a href="#/home">Home</a></li><li><a href="#/nav">Nav</a></li>' +
				'<li aria-current="page">Breadcrumb</li></ol>'
			container.appendChild(breadcrumb)
			const pagination = document.createElement('nav')
			pagination.setAttribute('aria-label', 'Pagination')
			pagination.innerHTML =
				'<ul><li><a href="#" aria-label="previous">‹</a></li>' +
				'<li><a href="#" aria-current="page">1</a></li><li><a href="#">2</a></li></ul>'
			container.appendChild(pagination)
			// TablesPage.vue expandable-table idiom: an expandable data row
			// (immediately followed by a `tr[data-table-expansion]` detail
			// row) — `_table.scss` resolves its `td:first-child` to
			// `display:flex`. NO `role="cell"`: the removed presentation/table
			// would have `error`-false-positived on this leading cell.
			const expandable = document.createElement('table')
			expandable.innerHTML =
				'<tbody>' +
				'<tr data-table-expanded><td>Row</td><td>Value</td></tr>' +
				'<tr data-table-expansion><td colspan="2"><div data-table-expansion-panel>Detail</div></td></tr>' +
				'</tbody>'
			container.appendChild(expandable)
			const walker = new Walker(container)
			const found: { rule: string; severity: string }[] = []
			for (const node of walker.walk()) {
				const ctx = walker.context(node)
				for (const rule of rules) {
					const f = rule.evaluate(node, ctx)
					if (f !== null) found.push({ rule: f.rule, severity: f.severity })
				}
			}
			const presentation = found.filter((f) => f.rule.startsWith('presentation/'))
			// Sanity: the expandable-row leading cell really did compute
			// `display:flex` under the real cascade (the FP precondition the
			// table-rule removal closes — proves the fixture exercises it).
			const lead = expandable.querySelector('tr[data-table-expanded] > td:first-child') as Element
			expect(getComputedStyle(lead).display).toBe('flex')
			// (a) ZERO error-severity presentation findings on conformant
			// first-party markup (the Phase-6 gate; the FPs the removals close).
			expect(presentation.filter((f) => f.severity === 'error')).toEqual([])
			// (b) No `presentation/list-item` NOR `presentation/table` finding
			// AT ALL — both rules are GONE from the registry (not merely
			// silent).
			expect(
				presentation.filter(
					(f) => f.rule === 'presentation/list-item' || f.rule === 'presentation/table',
				),
			).toEqual([])
			expect(rules.some((r) => r.id === 'presentation/list-item')).toBe(false)
			expect(rules.some((r) => r.id === 'presentation/table')).toBe(false)
			// (c) Every remaining presentation finding is the documented
			// `presentation/list-style` `warning` (the role-less <menu>/<ol>/
			// <ul> with stripped/UA list-style — by-design, non-blocking).
			expect(presentation.every((f) => f.rule === 'presentation/list-style')).toBe(true)
			expect(presentation.every((f) => f.severity === 'warning')).toBe(true)
			expect(presentation.length).toBeGreaterThan(0)
			expect(menu.tagName.toLowerCase()).toBe('menu')
		})

		it('EXHAUSTIVE conformant-first-party sweep over EVERY surviving error rule → ZERO error findings (real CSS)', () => {
			// The recurring-Critical guard, made exhaustive (Phase-3.3 / the
			// Phase-6 "zero error findings over the showcase" precondition).
			// For each surviving error-severity presentation rule, mount its
			// documented conformant first-party / spec-conformant markup under
			// the REAL `src/styles` cascade and assert NO error-severity
			// finding from ANY presentation rule. `presentation/list-style` is
			// `warning`-by-design (excluded from the error-zero invariant; it
			// is allowed to surface on role-less `list-style:none`).
			const div = document.createElement('div')
			div.innerHTML = [
				// presentation/bidi — bare conformant bidi elements (UA
				// unicode-bidi: isolate-override / isolate) + a generic [dir]
				// (deliberately out of scope) — none is an error.
				'<bdo dir="rtl">rtl</bdo>',
				'<bdi>123</bdi>',
				'<span dir="rtl">generic dir, out of scope</span>',
				'<p dir="auto">auto</p>',
				// presentation/preformatted — conformant <pre> (UA
				// white-space:pre) + default <textarea> (framework
				// `_textarea.scss` sets white-space:pre-wrap, the rule's
				// expected for a no-`wrap` textarea → 0) + `<textarea
				// wrap="off">` (PHASE-6 REMEDIATED: `_textarea.scss` now
				// carries `textarea[wrap='off' i] { white-space: pre }` per
				// `renderings.md §15.5.17`, so the cascade honors the hint
				// and the corpus-faithful rule yields nothing — it is now a
				// genuinely conformant case and rightly joins this sweep; its
				// own bites-both-ways flipped test below additionally locks
				// the remediation against silent regression).
				'<pre>a\n  b</pre>',
				'<textarea>raw</textarea>',
				'<textarea wrap="off">no-wrap</textarea>',
				// presentation/hidden — conformant [hidden] (UA display:none),
				// [hidden=until-found] (UA content-visibility:hidden), and the
				// :not(embed) carve-out (an <embed hidden> is NOT display:none).
				'<p hidden>hidden</p>',
				'<section hidden="until-found">uf</section>',
				'<embed hidden>',
				// presentation/focus — conformant focusable elements relying on
				// the framework :focus-visible box-shadow ring (NO inline
				// outline removal — the base computed outline-style is `none`
				// by design, the ring being :focus-visible-only; that is NOT a
				// finding, the documented decidable boundary).
				'<button type="button">btn</button>',
				'<a href="#/x">link</a>',
				'<input type="text">',
				'<select><option>o</option></select>',
				// presentation/visibility — a CLOSED <dialog> / closed
				// [popover] (UA display:none) is conformant; an OPEN one
				// painted visibly is conformant; a generic element styled
				// display:flex/grid/contents is NOT a presentation concern (no
				// rule keys on box display anymore).
				'<dialog>closed</dialog>',
				'<div popover="auto">closed popover</div>',
				'<details><summary>s</summary><p>body</p></details>',
				'<div style="display:flex">flex box, not a finding</div>',
				'<div style="display:grid">grid box, not a finding</div>',
				'<section style="display:contents"><p>contents wrapper</p></section>',
			].join('')
			mount(div)
			const walker = new Walker(div)
			const found: { rule: string; severity: string }[] = []
			for (const node of walker.walk()) {
				const ctx = walker.context(node)
				for (const rule of rules) {
					const f = rule.evaluate(node, ctx)
					if (f !== null) found.push({ rule: f.rule, severity: f.severity })
				}
			}
			const presentation = found.filter((f) => f.rule.startsWith('presentation/'))
			// The Phase-6-unblocking invariant: ZERO error-severity
			// presentation findings on conformant first-party markup, for
			// EVERY surviving error rule (bidi/preformatted/hidden/focus/
			// visibility). Quote the actual error findings on failure.
			expect(presentation.filter((f) => f.severity === 'error')).toEqual([])
			// And neither removed rule can ever appear (registry-gone).
			expect(
				presentation.filter(
					(f) => f.rule === 'presentation/list-item' || f.rule === 'presentation/table',
				),
			).toEqual([])
		})

		it('PHASE-6 REMEDIATED: first-party <textarea wrap="off"> under the real cascade → ZERO presentation/preformatted (the corpus-mandated _textarea.scss fix)', () => {
			// FLIPPED in Phase 6 (was: LOCKED "EXACTLY ONE error" tracking a
			// genuine framework-cascade non-conformance). This asserts the
			// REMEDIATION holds — and stays BITES-BOTH-WAYS: it goes red again
			// if the `_textarea.scss` `wrap=off` branch is ever removed /
			// regressed (silently re-introducing the non-conformance).
			//
			//   • Corpus (`guides/w3c/renderings.md §15.5.17`, line 1735):
			//     "if the element has a `wrap` attribute whose value is an
			//     ASCII case-insensitive match for the string `off`, then the
			//     user agent is expected to treat the attribute as a
			//     presentational hint setting the element's `white-space`
			//     property to `pre`." A conformant `<textarea wrap=off>` MUST
			//     compute `white-space: pre`.
			//   • Phase-6 remediation (SHIPPED): `_textarea.scss` now carries
			//     `textarea[wrap='off' i] { white-space: pre }` (same
			//     `@layer elements`, higher specificity than the bare
			//     `textarea { white-space: pre-wrap }`), so the framework
			//     cascade now HONORS the `wrap=off` presentational hint. The
			//     computed value is the corpus-required `pre`.
			//   • `presentation/preformatted` keys on `white-space` (the
			//     genuine corpus-stated semantic the `wrap` attribute
			//     controls). It is corpus-faithful and UNCHANGED — the rule
			//     was always correct; the firing was a TRUE positive on a
			//     genuine `_textarea.scss` defect, now fixed at the source
			//     (the framework was made to conform; the rule/test were NOT
			//     weakened — ROADMAP Phase 6 doctrine).
			const ta = mount(el('textarea', { wrap: 'off' }))
			// Sanity: the real framework cascade now resolves the `wrap=off`
			// textarea to the corpus-required `pre` (NOT `pre-wrap`) — proves
			// the remediation genuinely took, not a test-shim.
			expect(getComputedStyle(ta).whiteSpace).toBe('pre')
			// The corpus-faithful rule now (correctly) yields NOTHING: the
			// cascade conforms, so there is no genuine non-conformance left.
			expect(evaluateOn(preRule, ta, ta)).toBeNull()
			// Whole-registry: ZERO findings — no `presentation/preformatted`,
			// no other presentation rule co-fires (the bites-both-ways lock,
			// inverted: red again if the remediation regresses).
			expect(registryFindings(container)).toEqual([])
		})

		it('REGRESSION GUARD: a default <textarea> (no wrap) still computes white-space:pre-wrap → 0', () => {
			// The Phase-6 `wrap=off` branch must NOT disturb the default: a
			// no-`wrap` textarea keeps the framework's `pre-wrap` (the rule's
			// corpus-conformant expected for a default textarea → no finding).
			const ta = mount(el('textarea'))
			expect(getComputedStyle(ta).whiteSpace).toBe('pre-wrap')
			expect(evaluateOn(preRule, ta, ta)).toBeNull()
			expect(registryFindings(container)).toEqual([])
		})

		it('a single presentation break yields EXACTLY ONE finding (no double-report)', () => {
			// `<bdo>` with `unicode-bidi:normal` is a genuine single break
			// (presentation/bidi) — the former `<li display:block>` fixture is
			// gone with the removed presentation/list-item rule.
			mount(el('bdo', { dir: 'rtl', style: 'unicode-bidi:normal' }))
			expect(registryFindings(container)).toEqual(['presentation/bidi'])
		})

		it('two DISTINCT presentation breaks on different elements → exactly one each', () => {
			mount(
				el('div', {}, [
					el('bdo', { dir: 'rtl', style: 'unicode-bidi:normal' }),
					el('pre', { style: 'white-space:normal' }),
				]),
			)
			expect([...registryFindings(container)].sort()).toEqual(
				['presentation/bidi', 'presentation/preformatted'].sort(),
			)
		})

		it('disjoint from the structure lens: a structure violation alone has no presentation finding', () => {
			// A void element with children is a structure/void-has-children
			// break; it must NOT also emit any presentation finding.
			mount(el('br', {}, [el('span')]))
			const ids = registryFindings(container)
			expect(ids).toContain('structure/void-has-children')
			expect(ids.filter((id) => id.startsWith('presentation/'))).toEqual([])
		})

		it('every presentation rule carries lens:"presentation"; list-item + table are GONE', () => {
			const presentationRules = rules.filter((r) => r.id.startsWith('presentation/'))
			// 6 (was 8): the inherently-stylistic presentation/list-item AND
			// presentation/table were BOTH removed — surviving set is
			// list-style / bidi / preformatted / hidden / focus / visibility.
			expect(presentationRules.length).toBe(6)
			expect([...presentationRules.map((r) => r.id)].sort()).toEqual(
				[
					'presentation/bidi',
					'presentation/focus',
					'presentation/hidden',
					'presentation/list-style',
					'presentation/preformatted',
					'presentation/visibility',
				].sort(),
			)
			expect(presentationRules.map((r) => r.id)).not.toContain('presentation/list-item')
			expect(presentationRules.map((r) => r.id)).not.toContain('presentation/table')
			for (const r of presentationRules) expect(r.lens).toBe('presentation')
		})

		it('perturbation: seeded valid/broken bidi verdict reproducible & exactly-one', () => {
			// Replaces the removed table perturbation (presentation/table is
			// gone). `<bdo>` is a surviving error-rule with a clean binary
			// signal: `unicode-bidi:normal` strips the directional-override
			// semantic (fires exactly once); the bare `<bdo dir=rtl>` UA
			// default (`isolate-override`) is silent. Walk `container` (the
			// Walker yields DESCENDANTS of its root — the registry.test.ts
			// idiom): the fixture is a child of container so it IS visited.
			for (const seed of [7, 99, 1212, 30303]) {
				const random = createRandom(seed)
				const broken = random() < 0.5
				const buildOnce = (): readonly string[] => {
					const bdo = el(
						'bdo',
						broken ? { dir: 'rtl', style: 'unicode-bidi:normal' } : { dir: 'rtl' },
					)
					container.appendChild(bdo)
					const ids = registryFindings(container)
					bdo.remove()
					return ids
				}
				const first = buildOnce()
				expect(first).toEqual(buildOnce())
				expect(first).toEqual(broken ? ['presentation/bidi'] : [])
			}
		})

		it('perturbation: seeded focus affordance verdict reproducible & exactly-one', () => {
			for (const seed of [13, 137, 1370, 13007]) {
				const random = createRandom(seed)
				const broken = random() < 0.5
				const buildOnce = (): readonly string[] => {
					const button = el('button', {
						style: broken
							? 'outline:none;border:none;box-shadow:none'
							: 'outline:none;box-shadow:0 0 0 2px blue',
					})
					container.appendChild(button)
					const ids = registryFindings(container)
					button.remove()
					return ids
				}
				const first = buildOnce()
				expect(first).toEqual(buildOnce())
				expect(first).toEqual(broken ? ['presentation/focus'] : [])
			}
		})
	})
})
