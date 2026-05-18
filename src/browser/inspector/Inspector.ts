import type {
	Finding,
	FindingManagerInterface,
	FindingSeverity,
	InspectionResult,
	InspectorInterface,
	InspectorOptions,
	RuleInterface,
	RuleLens,
} from '../types.js'
import { FINDING_SEVERITIES, INSPECTOR_EVENTS } from '../constants.js'
import { bindEventMap, emit } from '../helpers.js'
import { isUndefined } from '@elements/core'
import { FindingManager } from './FindingManager.js'
import { Walker } from './Walker.js'
import { rules } from './rules.js'

/**
 * The root semantic-HTML inspector entity — one class, one file (AGENTS §7
 * class order: `#` fields → constructor → public API → `#` helpers).
 *
 * `inspect()` is **pure orchestration**: it composes the Phase-2 {@link Walker}
 * (the DOM-walk spine) with the frozen Phase-3 {@link rules} registry and
 * collects the non-`null` {@link Finding}s — ZERO re-implementation of
 * walking, rule evaluation, content-model resolution, or dedup (Phase 3
 * already guarantees one finding per violation; Phase 4 only aggregates).
 * It walks `new Walker(root)` (a non-Element root throws per AGENTS §13 —
 * the inspector delegates that guard to the Walker, never re-implements it),
 * runs every frozen rule's `evaluate(node, context)` per yielded node,
 * applies the optional `severity` / `lens` filters, and returns a value
 * {@link InspectionResult} (a DOM walk does not "fail").
 *
 * Observable events follow AGENTS §14 (the CustomEvent idiom — there is no
 * `Emitter` object): each pass dispatches `start` → `finding`* → `done`
 * (`INSPECTOR_EVENTS`, `elements:inspector:{verb}`) via the shared `emit`
 * helper on the **resolved root element** (the same element the Walker
 * walks); `options.on` initial listeners are wired on that element with
 * `bindEventMap`, exactly as every `create*` factory does, and the binding
 * is scoped to the single pass it was supplied for. The events bubble, so a
 * consumer may also `addEventListener` / `listen` on any ancestor
 * (`document`).
 *
 * @example
 * ```ts
 * import { Inspector } from '@elements/browser'
 *
 * const inspector = new Inspector()
 * const result = inspector.inspect({
 * 	root: document.body,
 * 	severity: 'error',
 * 	on: {
 * 		start: () => console.time('inspect'),
 * 		finding: (e) => console.warn(e.detail.finding.message),
 * 		done: (e) => console.timeEnd('inspect') ?? e.detail.result.counts,
 * 	},
 * })
 * result.counts.error          // hard violations in the subtree
 * inspector.findings.findings('error')
 * ```
 */
export class Inspector implements InspectorInterface {
	#findings: FindingManager

	constructor() {
		this.#findings = new FindingManager([])
	}

	/** The frozen Phase-3 rule registry the inspector evaluates (read-only;
	 *  Phase 4 adds no rules — it is orchestration only). */
	get rules(): readonly RuleInterface[] {
		return rules
	}

	/** The {@link FindingManagerInterface} over the LAST pass's collected
	 *  findings (an empty manager before the first `inspect`). */
	get findings(): FindingManagerInterface {
		return this.#findings
	}

	/**
	 * Run one inspection pass over `options.root` (default `document`),
	 * keeping only findings of `options.severity` / `options.lens` when
	 * given. Composes the Walker + the frozen `rules` registry; returns the
	 * {@link InspectionResult}. Re-runnable — each call replaces the
	 * `findings` manager and emits a fresh `start` → `finding` (×N) →
	 * `done` sequence on that pass's resolved root element.
	 */
	inspect(options: InspectorOptions = {}): InspectionResult {
		// Resolve the walk host: `Document` (the documented default) walks
		// from its `<html>`; an `Element` walks itself; anything else is
		// handed straight to `new Walker(...)`, which throws per §13 (the
		// inspector never re-implements the root guard).
		const host = this.#host(options.root ?? document)
		const offBound = bindEventMap(host, INSPECTOR_EVENTS, options.on)
		try {
			emit(host, INSPECTOR_EVENTS.start, { root: host })
			const started = performance.now()
			const walker = new Walker(host)
			let walked = 0
			const collected: Finding[] = []
			for (const node of walker.walk()) {
				walked += 1
				const context = walker.context(node)
				for (const rule of rules) {
					const draft = rule.evaluate(node, context)
					if (draft === null) continue
					// Stamp the AUTHORITATIVE lens from the rule in hand — the
					// single place lens is ever assigned (never re-derived by
					// string-sniffing the rule id). `lens` is a property of
					// the RULE, not of the rule-eval draft.
					const finding: Finding = { ...draft, lens: rule.lens }
					if (!this.#keep(finding, options.severity, options.lens)) continue
					collected.push(finding)
				}
			}
			const duration = performance.now() - started
			const result: InspectionResult = {
				findings: collected,
				counts: this.#counts(collected),
				walked,
				duration,
			}
			this.#findings = new FindingManager(collected)
			for (const finding of collected) {
				emit(host, INSPECTOR_EVENTS.finding, { finding })
			}
			emit(host, INSPECTOR_EVENTS.done, { result })
			return result
		} finally {
			// The `on` binding is scoped to exactly the pass it was given
			// for — a re-`inspect()` with a new `on` never accumulates stale
			// listeners (the factory precedent releases its `bindEventMap`
			// teardown on tear-down; a pass IS the inspector's unit of work).
			offBound()
		}
	}

	// Resolve the Walker host element from a `ParentNode`. `document` (the
	// documented `inspect()` default) is not itself an `Element`, so a
	// `Document` resolves to its `<html>` document element; an `Element`
	// walks itself. Any other `ParentNode` (a bare `DocumentFragment`, or a
	// document with no root element) has NO inspectable element root — a
	// §13 programmer error thrown at the inspector boundary. The Walker
	// constructor independently re-asserts element-ness on `new Walker(host)`
	// (one canonical guard, not re-implemented — only the Document→root
	// resolution + the rootless-fragment rejection are the inspector's).
	#host(root: ParentNode): Element {
		if (root instanceof Element) return root
		if (root instanceof Document && root.documentElement !== null) return root.documentElement
		// A bare `DocumentFragment`, or a `Document` with no root element,
		// has no inspectable element root — a §13 programmer error.
		throw new Error('Inspector: root must be an Element or a Document with a root element')
	}

	// Apply the optional severity / lens filters (omitted ⇒ keep all).
	// Both read the finding's own fields directly — `lens` is the
	// authoritative value stamped from `rule.lens` at collection (above),
	// never re-derived by string-sniffing the rule id.
	#keep(finding: Finding, severity?: FindingSeverity, lens?: RuleLens): boolean {
		if (!isUndefined(severity) && finding.severity !== severity) return false
		if (!isUndefined(lens) && finding.lens !== lens) return false
		return true
	}

	// Tally findings by severity — every key present (zero when none), so
	// `counts.error` / `.warning` / `.advice` are always numbers.
	#counts(findings: readonly Finding[]): Readonly<Record<FindingSeverity, number>> {
		// Seed every severity to 0 from the single constants.ts tuple (no
		// second hardcoded `error`/`warning`/`advice` list to drift), then
		// tally — assertion-free (§1): a typed Map, read back per key.
		const tally = new Map<FindingSeverity, number>()
		for (const severity of FINDING_SEVERITIES) tally.set(severity, 0)
		for (const finding of findings) {
			tally.set(finding.severity, (tally.get(finding.severity) ?? 0) + 1)
		}
		return {
			error: tally.get('error') ?? 0,
			warning: tally.get('warning') ?? 0,
			advice: tally.get('advice') ?? 0,
		}
	}
}
