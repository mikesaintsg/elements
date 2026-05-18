import type { Finding, FindingManagerInterface, FindingSeverity, RuleLens } from '../types.js'
import { FINDING_SEVERITIES, RULE_LENSES } from '../constants.js'
import { describePath } from '../helpers.js'
import { isArray, isString, isUndefined } from '@elements/core'

/**
 * The query surface over one {@link import('./Inspector.js').Inspector}
 * pass's collected findings — the §4.2.2 sub-entity the `Inspector` exposes
 * as its single-word `readonly findings` property.
 *
 * Modeled exactly on the in-repo `createTable` selection sub-domain
 * (`TableSelectionManagerInterface` + the `selectionSelect` / `selectionClear`
 * function-overload implementation): a §9 singular accessor `finding(id)`
 * + plural `findings()` (filter overloads discriminated by argument TYPE,
 * the §4.2.3-spirit "split by type, never a flag"), and the §10
 * three-overload single-verb batch `clear()` / `clear(id)` / `clear(ids)`
 * (same single-verb-many-overloads shape as `createTable`'s
 * `select()/select(id)/select(ids)`).
 *
 * A finding's stable id is the deterministic `{rule}@{path}` composite
 * (`path` = the serializable {@link describePath} string) — stable across
 * runs over the same DOM exactly as the inspector itself is deterministic,
 * and unique because Phase 3 guarantees one finding per violation. `clear`
 * (§11) resets the held collection without destroying the manager and never
 * mutates the DOM.
 *
 * @example
 * ```ts
 * const inspector = new Inspector()
 * inspector.inspect({ root })
 * const manager = inspector.findings
 * manager.count                         // total held
 * manager.findings('error')             // only errors
 * manager.findings(someSection)         // only that subtree
 * manager.finding(id)                   // one by `{rule}@{path}` id
 * manager.clear(id)                     // drop one  → boolean
 * manager.clear([idA, idB])             // drop many → boolean (all-ok)
 * manager.clear()                       // drop all
 * ```
 */
export class FindingManager implements FindingManagerInterface {
	#findings: Finding[]
	readonly #ids: Map<string, Finding>

	constructor(findings: readonly Finding[]) {
		this.#findings = [...findings]
		this.#ids = new Map(this.#findings.map((finding) => [this.#key(finding), finding]))
	}

	/** The number of findings currently held (post-filter for the pass;
	 *  decremented by `clear`). */
	get count(): number {
		return this.#findings.length
	}

	/**
	 * Look up ONE finding by its `{rule}@{path}` id (§9 singular accessor;
	 * an absent id is an optional-lookup miss → `undefined`, AGENTS §13).
	 */
	finding(id: string): Finding | undefined {
		return this.#ids.get(id)
	}

	// ALL held, or only a severity / lens / subtree — overloaded by the
	// argument TYPE, never a flag (§4.2.3 spirit), mirroring how
	// `createTable`'s `selectionSelect` overloads its single verb.
	findings(): readonly Finding[]
	findings(severity: FindingSeverity): readonly Finding[]
	findings(lens: RuleLens): readonly Finding[]
	findings(root: ParentNode): readonly Finding[]
	findings(filter?: FindingSeverity | RuleLens | ParentNode): readonly Finding[] {
		if (isUndefined(filter)) return [...this.#findings]
		if (isString(filter)) {
			// The two string unions are disjoint closed sets (constants.ts):
			// a severity filters by `severity`, anything else is a lens.
			if (this.#isSeverity(filter)) {
				return this.#findings.filter((finding) => finding.severity === filter)
			}
			return this.#findings.filter((finding) => this.#lensOf(finding) === filter)
		}
		// A `ParentNode` (Document / Element / DocumentFragment): the subtree
		// filter. `Node.contains` is inclusive — a finding on `root` itself
		// is within its subtree.
		return this.#findings.filter((finding) => filter.contains(finding.element))
	}

	// Drop ALL / ONE / LISTED — the §10 three-overload single verb (the
	// `createTable` `selectionClear` precedent), but per the §10 canonical
	// table `clear(id)` / `clear(ids)` return `boolean` (held-and-dropped;
	// `clear(ids)` true iff EVERY id succeeded). `clear` is §11 reset —
	// the collection only, never the DOM.
	clear(): void
	clear(id: string): boolean
	clear(ids: string[]): boolean
	clear(target?: string | string[]): void | boolean {
		if (isUndefined(target)) {
			this.#findings = []
			this.#ids.clear()
			return
		}
		if (isArray(target)) {
			let all = true
			for (const id of target) {
				if (!this.#drop(id)) all = false
			}
			return all
		}
		return this.#drop(target)
	}

	// Drop one finding by id; true iff it was held.
	#drop(id: string): boolean {
		const finding = this.#ids.get(id)
		if (isUndefined(finding)) return false
		this.#ids.delete(id)
		this.#findings = this.#findings.filter((held) => held !== finding)
		return true
	}

	// The deterministic stable id: `{rule}@{serializable-path}`. Pure —
	// `describePath` composes the existing `nodePath` / `getSiblingIndex`
	// traversals, no bespoke DOM walk.
	#key(finding: Finding): string {
		return `${finding.rule}@${describePath(finding.element)}`
	}

	#isSeverity(value: string): value is FindingSeverity {
		return (FINDING_SEVERITIES as readonly string[]).includes(value)
	}

	// The lens a finding belongs to, read from its rule-id family — never
	// re-derived per element. Until Phase 5 only `structure`-lens rules
	// exist, so a `presentation` filter correctly yields nothing; the
	// Phase-5 presentation family will id its rules `presentation/*`.
	#lensOf(finding: Finding): RuleLens {
		const family = finding.rule.split('/')[0] ?? ''
		return family === RULE_LENSES[1] ? RULE_LENSES[1] : RULE_LENSES[0]
	}
}
