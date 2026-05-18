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
//  Exact expected outcomes (quoted in the report):
//    <li style=display:block> in a plain <ul>       → 1 presentation/list-item error  renderings#lists
//    <li role=listitem style=display:block>         → 0
//    <ul role=list style=list-style:none>           → 0
//    <ul style=list-style:none> (no role)           → 1 presentation/list-style warning
//    <bdo style=unicode-bidi:normal>                → 1 presentation/bidi error
//    <table style=display:block> (no role)          → 1 presentation/table error
//    <div role=table style=display:block> table…    → 0 (role compensation)
//    <p hidden style=display:block>                 → 1 presentation/hidden error
//    <embed hidden>                                  → 0 (the :not(embed) carve-out)
//    closed <dialog> (UA display:none)              → 0
//    <dialog style=display:block> (closed)          → 1 presentation/visibility error
//    focusable <button style=outline:none>          → 1 presentation/focus error
//    <button style="outline:none;box-shadow:…">     → 0 (replacement affordance)
//    <pre style=white-space:normal>                 → 1 presentation/preformatted error
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const listItemRule = ruleById('presentation/list-item')
const listStyleRule = ruleById('presentation/list-style')
const bidiRule = ruleById('presentation/bidi')
const tableRule = ruleById('presentation/table')
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

	// ── presentation/list-item ────────────────────────────────────────────

	describe('list-item — <li> display must be list-item (renderings#lists)', () => {
		it('valid-default: <li> in a plain <ul> (UA display:list-item) → 0', () => {
			const ul = mount(el('ul', {}, [el('li', {}, [])]))
			const li = ul.firstElementChild as Element
			expect(evaluateOn(listItemRule, ul, li)).toBeNull()
		})

		it('valid-with-compensation: <li role=listitem style=display:block> → 0', () => {
			const ul = mount(el('ul', {}, [el('li', { role: 'listitem', style: 'display:block' })]))
			const li = ul.firstElementChild as Element
			expect(evaluateOn(listItemRule, ul, li)).toBeNull()
		})

		it('genuine-violation: <li style=display:block> (no role) → exactly 1 error', () => {
			const ul = mount(el('ul', {}, [el('li', { style: 'display:block' })]))
			const li = ul.firstElementChild as Element
			const finding = evaluateOn(listItemRule, ul, li)
			if (finding === null) throw new Error('expected a presentation/list-item finding')
			expect(finding.rule).toBe('presentation/list-item')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#lists')
			expect(finding.element).toBe(li)
		})

		it('perturbation: seeded block/list-item verdict is reproducible & exactly-one', () => {
			for (const seed of [11, 222, 3003, 44004]) {
				const random = createRandom(seed)
				const broken = random() < 0.5
				const buildOnce = (): readonly string[] => {
					const ul = el('ul', {}, [el('li', broken ? { style: 'display:block' } : {})])
					container.appendChild(ul)
					const ids = registryFindings(ul)
					ul.remove()
					return ids
				}
				const first = buildOnce()
				expect(first).toEqual(buildOnce())
				expect(first).toEqual(broken ? ['presentation/list-item'] : [])
			}
		})
	})

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

	// ── presentation/table ────────────────────────────────────────────────

	describe('table — table-model display intact w/o ARIA role (renderings#tables)', () => {
		it('valid-default: a canonical <table> (UA display:table) → 0', () => {
			const table = mount(el('table', {}, [el('tbody', {}, [el('tr', {}, [el('td')])])]))
			const tr = table.querySelector('tr') as Element
			const td = table.querySelector('td') as Element
			expect(evaluateOn(tableRule, table, table)).toBeNull()
			expect(evaluateOn(tableRule, table, tr)).toBeNull()
			expect(evaluateOn(tableRule, table, td)).toBeNull()
		})

		it('valid-with-compensation: <table role=table style=display:block> → 0', () => {
			const table = mount(el('table', { role: 'table', style: 'display:block' }))
			expect(evaluateOn(tableRule, table, table)).toBeNull()
		})

		it('genuine-violation: <table style=display:block> (no role) → exactly 1 error', () => {
			const table = mount(el('table', { style: 'display:block' }))
			const finding = evaluateOn(tableRule, table, table)
			if (finding === null) throw new Error('expected a presentation/table finding')
			expect(finding.rule).toBe('presentation/table')
			expect(finding.severity).toBe('error')
			expect(finding.cite).toBe('renderings#tables')
		})

		it('genuine-violation: <tr style=display:block> with no role=row → exactly 1', () => {
			// The tr is wrapped so its computed display override is the only
			// break (the parent table stays a real table).
			const table = mount(
				el('table', {}, [el('tbody', {}, [el('tr', { style: 'display:block' }, [el('td')])])]),
			)
			const tr = table.querySelector('tr') as Element
			const finding = evaluateOn(tableRule, table, tr)
			if (finding === null) throw new Error('expected a presentation/table finding')
			expect(finding.rule).toBe('presentation/table')
		})

		it('valid-with-compensation: <td role=cell style=display:block> → 0', () => {
			const table = mount(
				el('table', {}, [
					el('tbody', {}, [el('tr', {}, [el('td', { role: 'cell', style: 'display:block' })])]),
				]),
			)
			const td = table.querySelector('td') as Element
			expect(evaluateOn(tableRule, table, td)).toBeNull()
		})

		it('does NOT fire on <colgroup>/<col> (corpus aria.md §112: roleless)', () => {
			const table = mount(
				el('table', {}, [
					el('colgroup', { style: 'display:block' }, [el('col', { style: 'display:block' })]),
					el('tbody', {}, [el('tr', {}, [el('td')])]),
				]),
			)
			const colgroup = table.querySelector('colgroup') as Element
			const col = table.querySelector('col') as Element
			expect(evaluateOn(tableRule, table, colgroup)).toBeNull()
			expect(evaluateOn(tableRule, table, col)).toBeNull()
		})
	})

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
			// ROADMAP non-goal — out of scope).
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

		it('a single presentation break yields EXACTLY ONE finding (no double-report)', () => {
			mount(el('ul', {}, [el('li', { style: 'display:block' })]))
			expect(registryFindings(container)).toEqual(['presentation/list-item'])
		})

		it('two DISTINCT presentation breaks on different elements → exactly one each', () => {
			mount(
				el('div', {}, [
					el('ul', {}, [el('li', { style: 'display:block' })]),
					el('bdo', { dir: 'rtl', style: 'unicode-bidi:normal' }),
				]),
			)
			expect([...registryFindings(container)].sort()).toEqual(
				['presentation/bidi', 'presentation/list-item'].sort(),
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

		it('every presentation rule carries lens:"presentation"', () => {
			const presentationRules = rules.filter((r) => r.id.startsWith('presentation/'))
			expect(presentationRules.length).toBe(8)
			for (const r of presentationRules) expect(r.lens).toBe('presentation')
		})

		it('perturbation: seeded valid/broken table verdict reproducible & exactly-one', () => {
			// Walk `container` (the Walker yields DESCENDANTS of its root, not
			// the root itself — the registry.test.ts idiom): the fixture is a
			// child of container so it IS visited.
			for (const seed of [7, 99, 1212, 30303]) {
				const random = createRandom(seed)
				const broken = random() < 0.5
				const buildOnce = (): readonly string[] => {
					const table = el('table', broken ? { style: 'display:block' } : {}, [
						el('tbody', {}, [el('tr', {}, [el('td')])]),
					])
					container.appendChild(table)
					const ids = registryFindings(container)
					table.remove()
					return ids
				}
				const first = buildOnce()
				expect(first).toEqual(buildOnce())
				expect(first).toEqual(broken ? ['presentation/table'] : [])
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
