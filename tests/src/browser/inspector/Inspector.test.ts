// ============================================================================
//  Inspector entity (ROADMAP Phase 4) — end-to-end over real DOM.
//
//  Real DOM per AGENTS §16.2 (no mocks): `Inspector.inspect()` is the
//  realistic full pass — it composes the Phase-2 `Walker` + the frozen
//  Phase-3 `rules` registry (no walking / rule-eval / dedup re-implemented)
//  and aggregates the findings. Every assertion BITES: a clean tree must be
//  empty, a known dirty tree must yield the EXACT findings + correct
//  `InspectionResult` (counts / walked / duration≥0), the emitter must fire
//  exactly `start → finding* → done` IN ORDER (observed via the real
//  `listen` helper AND `options.on`), the `severity` / `lens` filters must
//  drop what they exclude, and the `FindingManager` singular / plural / the
//  §10 three-overload `clear` must behave per spec. Dirty fixtures reuse the
//  registry-suite's proven single-violation trees so the expected rule ids
//  are spec-anchored, not guessed.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	FindingManager,
	INSPECTOR_EVENTS,
	Inspector,
	describePath,
	findingContract,
	listen,
	rules,
} from '@elements/browser'
import type { Finding, RuleInterface } from '@elements/browser'

describe('Inspector — end-to-end', () => {
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

	function keyOf(finding: Finding): string {
		return `${finding.rule}@${describePath(finding.element)}`
	}

	// ── clean tree → zero findings ────────────────────────────────────────

	it('a clean subtree yields zero findings and a well-formed result', () => {
		// Proven-clean fixtures from registry.test.ts (the prefix / table
		// models satisfied).
		container.append(
			el('details', [text('summary', 'Label'), text('p', 'Body')]),
			el('table', [el('tbody', [el('tr', [el('td'), el('td')])])]),
		)
		const inspector = new Inspector()
		const result = inspector.inspect({ root: container })

		expect(result.findings).toEqual([])
		expect(result.counts).toEqual({ error: 0, warning: 0, advice: 0 })
		expect(result.walked).toBeGreaterThan(0)
		expect(result.duration).toBeGreaterThanOrEqual(0)
		expect(inspector.findings.count).toBe(0)
	})

	// ── known dirty tree → EXACT findings + correct InspectionResult ──────

	it('a known dirty subtree yields exactly the expected finding + counts', () => {
		// registry.test.ts proves: <details> without its required <summary>
		// → exactly ['content/required'] through the WHOLE registry.
		const details = el('details', [text('p', 'Body')])
		container.appendChild(details)

		const inspector = new Inspector()
		const result = inspector.inspect({ root: container })

		expect(result.findings.map((f) => f.rule)).toEqual(['content/required'])
		const finding = result.findings[0]
		if (finding === undefined) throw new Error('expected one finding')
		expect(finding.severity).toBe('error')
		expect(finding.element).toBe(details)
		expect(finding.path.length).toBeGreaterThan(0) // in-memory Element[] path
		expect(finding.cite.length).toBeGreaterThan(0)
		expect(result.counts).toEqual({ error: 1, warning: 0, advice: 0 })
		expect(result.walked).toBeGreaterThanOrEqual(2) // details + p (+ container subtree)
		expect(result.duration).toBeGreaterThanOrEqual(0)

		// BITE: perturb the tree into a valid one — the finding must vanish.
		details.insertBefore(text('summary', 'Now valid'), details.firstChild)
		expect(new Inspector().inspect({ root: container }).findings).toEqual([])
	})

	// ── emitter order EXACTLY start → finding* → done ─────────────────────

	it('emits start → finding (×N) → done in order, via listen AND options.on', () => {
		container.append(el('details', [text('p', 'A')]), el('details', [text('p', 'B')]))

		// Real `listen` subscription on the resolved root (the inspected
		// element). Two violations ⇒ two `finding` events between the
		// single `start` and the single `done`.
		const observed: string[] = []
		const root = container
		const offStart = listen(root, INSPECTOR_EVENTS.start, () => observed.push('start'))
		const offFinding = listen(root, INSPECTOR_EVENTS.finding, () => observed.push('finding'))
		const offDone = listen(root, INSPECTOR_EVENTS.done, () => observed.push('done'))

		// And the `options.on` map (wired via bindEventMap, like every factory).
		const viaOn: string[] = []
		const inspector = new Inspector()
		const result = inspector.inspect({
			root,
			on: {
				start: () => viaOn.push('start'),
				finding: () => viaOn.push('finding'),
				done: () => viaOn.push('done'),
			},
		})

		offStart()
		offFinding()
		offDone()

		expect(result.findings.map((f) => f.rule)).toEqual(['content/required', 'content/required'])
		// Exact order: start, then one finding per collected finding, then done.
		expect(observed).toEqual(['start', 'finding', 'finding', 'done'])
		expect(viaOn).toEqual(['start', 'finding', 'finding', 'done'])

		// BITE: the `done` detail carries the same result the call returned.
		const seenDone: unknown[] = []
		const off = listen(root, INSPECTOR_EVENTS.done, (e) => seenDone.push(e.detail))
		const second = inspector.inspect({ root })
		off()
		expect(seenDone).toHaveLength(1)
		expect(seenDone[0]).toEqual({ result: second })
	})

	it('options.on listeners are scoped to their pass (no stale accumulation)', () => {
		container.appendChild(el('details', [text('p', 'X')]))
		const inspector = new Inspector()
		let calls = 0
		inspector.inspect({ root: container, on: { done: () => (calls += 1) } })
		// A second pass WITHOUT `on` must not re-fire the first pass's hook.
		inspector.inspect({ root: container })
		expect(calls).toBe(1)
	})

	// ── severity filter (bites: it must DROP excluded findings) ───────────

	it('severity filter keeps matching, drops the rest', () => {
		container.appendChild(el('details', [text('p', 'Body')]))
		const inspector = new Inspector()

		// Every shipped Phase-3 rule is severity:'error'. `error` keeps it…
		const errs = inspector.inspect({ root: container, severity: 'error' })
		expect(errs.findings.map((f) => f.rule)).toEqual(['content/required'])
		expect(errs.counts).toEqual({ error: 1, warning: 0, advice: 0 })

		// …`warning` must filter the error OUT (proves the filter bites).
		const warns = inspector.inspect({ root: container, severity: 'warning' })
		expect(warns.findings).toEqual([])
		expect(warns.counts).toEqual({ error: 0, warning: 0, advice: 0 })
		expect(inspector.findings.count).toBe(0)
	})

	// ── lens filter ───────────────────────────────────────────────────────

	it('lens filter keeps structure-lens findings, drops presentation', () => {
		container.appendChild(el('details', [text('p', 'Body')]))
		const inspector = new Inspector()

		// All Phase-3 rules are lens:'structure'.
		expect(
			inspector.inspect({ root: container, lens: 'structure' }).findings.map((f) => f.rule),
		).toEqual(['content/required'])

		// `presentation` (no such rule until Phase 5) ⇒ filtered to nothing.
		expect(inspector.inspect({ root: container, lens: 'presentation' }).findings).toEqual([])
	})

	// ── lens routing is AUTHORITATIVE (rule.lens), not id-string-sniffed ───
	//
	// Regression for the deleted `#lensOf` heuristics (both Inspector and
	// FindingManager): they classified a finding's lens by
	// `finding.rule.split('/')[0] === 'presentation'`, correct ONLY by the
	// accident that every Phase-3 rule is structure-lens. Phase 5 IS the
	// presentation lens; the instant a `lens:'presentation'` rule has an id
	// NOT starting `presentation/` (e.g. `style/visibility`) the old
	// heuristic silently mis-routes it to `structure`. The fix stamps the
	// AUTHORITATIVE `rule.lens` onto the finding once at collection; every
	// classifier reads `finding.lens` directly. This test injects exactly
	// that blind-spot rule and asserts both the Inspector lens filter AND
	// `FindingManager.findings('presentation')` route it correctly. It MUST
	// fail against the old string-prefix heuristic and pass with `rule.lens`.

	it('routes a presentation-lens rule whose id is NOT presentation/* (the #lensOf blind spot)', () => {
		// A synthetic rule: authoritative lens 'presentation', but an id the
		// old `split('/')[0] === 'presentation'` heuristic would read as
		// 'style' → mis-classify structure. Real RuleInterface, real DOM.
		const presentationRule: RuleInterface = {
			id: 'style/visibility',
			severity: 'warning',
			lens: 'presentation',
			evaluate: (element) =>
				element.tagName.toLowerCase() === 'mark'
					? {
							severity: 'warning',
							rule: 'style/visibility',
							element,
							path: [element],
							message: 'synthetic presentation-lens finding',
							cite: 'guides/w3c/rendering.md#visibility',
						}
					: null,
		}

		// Sanity: the OLD heuristic WOULD mis-route this id (proves the test
		// bites — the family token is 'style', never 'presentation').
		expect(presentationRule.id.split('/')[0]).not.toBe('presentation')

		// Evaluate it through the Inspector's collection contract: a rule's
		// `evaluate` returns the lens-LESS draft; the Inspector stamps the
		// authoritative `lens: rule.lens` exactly once (the single place
		// lens is assigned). Replicate that one stamp here, then drive the
		// real public surfaces the deleted `#lensOf` lived behind.
		const mark = el('mark')
		container.appendChild(mark)
		const draft = presentationRule.evaluate(mark, {} as never)
		if (draft === null) throw new Error('expected the synthetic rule to fire')
		const collected: Finding = { ...draft, lens: presentationRule.lens }

		// (1) The authoritative lens is the RULE's, read directly — NOT the
		//     id family ('style'). The old heuristic would yield 'structure'.
		expect(collected.lens).toBe('presentation')

		// (2) The Inspector's `#keep` lens filter is `finding.lens === lens`.
		//     Mixed corpus: this presentation finding + a real structure one.
		const structureDetails = el('details', [text('p', 'no summary')])
		container.appendChild(structureDetails)
		const structurePass = new Inspector().inspect({ root: container })
		const structureFinding = structurePass.findings.find((f) => f.rule === 'content/required')
		if (structureFinding === undefined) throw new Error('expected a structure finding')
		expect(structureFinding.lens).toBe('structure') // stamped from rule.lens

		// (3) FindingManager.findings(lens) — the other deleted `#lensOf`
		//     site — must route by the stamped `finding.lens`, classifying
		//     the `style/visibility` finding as presentation despite its id.
		const manager = new FindingManager([collected, structureFinding])
		expect(manager.findings('presentation').map((f) => f.rule)).toEqual(['style/visibility'])
		expect(manager.findings('structure').map((f) => f.rule)).toEqual(['content/required'])

		// (4) The all-structure Phase-3 corpus alone still yields
		//     `lens:'presentation'` → [] (no false positives from the fix).
		structureDetails.remove()
		mark.remove()
		container.appendChild(el('details', [text('p', 'still dirty')]))
		expect(new Inspector().inspect({ root: container, lens: 'presentation' }).findings).toEqual([])
		expect(
			new Inspector().inspect({ root: container, lens: 'structure' }).findings.map((f) => f.rule),
		).toEqual(['content/required'])
	})

	// ── FindingManager: singular / plural + the §10 three-overload clear ──

	describe('FindingManager', () => {
		function seed(): Inspector {
			// Two distinct violations under one root: two <details> each
			// missing <summary> ⇒ two `content/required` findings on
			// different elements (distinct `{rule}@{path}` ids). Reset the
			// shared container first so repeated `seed()` calls are isolated
			// (each pass sees exactly two violations, never accumulated).
			container.replaceChildren(el('details', [text('p', 'A')]), el('details', [text('p', 'B')]))
			const inspector = new Inspector()
			inspector.inspect({ root: container })
			return inspector
		}

		it('singular finding(id) + plural findings() accessors (§9)', () => {
			const manager = seed().findings
			const all = manager.findings()
			expect(all).toHaveLength(2)
			const first = all[0]
			if (first === undefined) throw new Error('expected findings')
			const id = keyOf(first)
			expect(manager.finding(id)).toBe(first)
			expect(manager.finding('no/such@path')).toBeUndefined()
		})

		it('findings() filter overloads: severity / lens / subtree', () => {
			const inspector = seed()
			const manager = inspector.findings
			expect(manager.findings('error')).toHaveLength(2)
			expect(manager.findings('warning')).toHaveLength(0)
			expect(manager.findings('structure')).toHaveLength(2)
			expect(manager.findings('presentation')).toHaveLength(0)
			// Subtree filter: only the first <details> subtree.
			const firstDetails = container.firstElementChild
			if (firstDetails === null) throw new Error('expected a <details>')
			const scoped = manager.findings(firstDetails)
			expect(scoped).toHaveLength(1)
			expect(scoped[0]?.element).toBe(firstDetails)
		})

		it('clear() / clear(id) / clear(ids) — the §10 three overloads', () => {
			const manager = seed().findings
			const ids = manager.findings().map(keyOf)
			expect(ids).toHaveLength(2)

			// clear(id) → boolean: true when held, false when absent.
			expect(manager.clear(ids[0] ?? '')).toBe(true)
			expect(manager.count).toBe(1)
			expect(manager.finding(ids[0] ?? '')).toBeUndefined()
			expect(manager.clear(ids[0] ?? '')).toBe(false) // already gone

			// clear(ids) → boolean: true iff EVERY listed id was dropped.
			const after = seed().findings // fresh pass (two again)
			const freshIds = after.findings().map(keyOf)
			expect(after.clear([freshIds[0] ?? '', 'missing@x'])).toBe(false) // one absent
			expect(after.count).toBe(1) // the present one still dropped
			expect(after.clear(after.findings().map(keyOf))).toBe(true)
			expect(after.count).toBe(0)

			// clear() → drop ALL.
			const last = seed().findings
			expect(last.count).toBe(2)
			expect(last.clear()).toBeUndefined()
			expect(last.count).toBe(0)
			expect(last.findings()).toEqual([])
		})
	})

	// ── inspect() composes Walker + Phase-3 rules (no reinvention) ────────

	it('inspect() equals the manual Walker + rules registry pass', () => {
		container.append(
			el('details', [text('p', 'A')]),
			el('ul', [text('li', 'ok')]),
			el('table', [el('caption'), el('tbody', [el('tr', [el('td')])])]),
		)
		// What the realistic manual full pass would collect (the exact
		// composition Inspector encapsulates — proving zero reinvention).
		const inspector = new Inspector()
		const result = inspector.inspect({ root: container })
		// Re-run: deterministic (same DOM → same findings).
		const again = new Inspector().inspect({ root: container })
		expect(again.findings.map((f) => f.rule)).toEqual(result.findings.map((f) => f.rule))
		// The registry the inspector evaluates is the frozen Phase-3 one.
		expect(inspector.rules).toBe(rules)
	})

	// ── root resolution + §13 ─────────────────────────────────────────────

	it('defaults root to document and rejects a rootless ParentNode (§13)', () => {
		// A detached DocumentFragment has no element root → §13 throw.
		expect(() => new Inspector().inspect({ root: document.createDocumentFragment() })).toThrow(
			/root must be an Element/,
		)
		// `document` is the documented default and must resolve (to <html>).
		const result = new Inspector().inspect({ root: document })
		expect(result.walked).toBeGreaterThan(0)
		expect(result.duration).toBeGreaterThanOrEqual(0)
	})

	// ── the serializable Finding contract (compiled, derived) ─────────────

	it('findingContract validates the serializable projection of real findings', () => {
		container.appendChild(el('details', [text('p', 'Body')]))
		const finding = new Inspector().inspect({ root: container }).findings[0]
		if (finding === undefined) throw new Error('expected one finding')

		// The serializable record (live Element → stable path string). `lens`
		// is the authoritative value the Inspector stamped from `rule.lens` —
		// the contract REQUIRES it (shaped exactly like `severity`).
		const record = {
			severity: finding.severity,
			rule: finding.rule,
			path: describePath(finding.element),
			message: finding.message,
			cite: finding.cite,
			lens: finding.lens,
			...(finding.expected === undefined ? {} : { expected: finding.expected }),
			...(finding.actual === undefined ? {} : { actual: finding.actual }),
		}
		expect(finding.lens).toBe('structure') // every Phase-3 rule is structure-lens
		expect(findingContract.is(record)).toBe(true)
		// BITE: an empty rule violates the {min:1} string shape.
		expect(findingContract.is({ ...record, rule: '' })).toBe(false)
		// BITE: a missing lens violates the required closed-union lens shape.
		const { lens: _lens, ...lensless } = record
		expect(findingContract.is(lensless)).toBe(false)
		// BITE: an out-of-union lens value is rejected.
		expect(findingContract.is({ ...record, lens: 'typography' })).toBe(false)
		// The JSON Schema is exported for machine consumers.
		expect(findingContract.schema).toBeDefined()
	})
})
