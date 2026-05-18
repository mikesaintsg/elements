import type { RuleContext, RuleRestrictions, WalkerInterface } from '../types.js'
import {
	effectiveCategories,
	flatChildren,
	isElement,
	matchesTag,
	resolveModel,
} from '../helpers.js'
import { isForeign } from '../schema.js'
import { getAncestors } from '../traversals.js'

/**
 * The DOM-walk spine of the semantic inspector — a thin layer over
 * `@elements/browser` `traversals` + the frozen content-model `schema`.
 *
 * The Walker adds exactly what `traversals` does not: flat-tree awareness
 * (descend `shadowRoot`, resolve `<slot>` via `assignedElements()`,
 * `<template>.content`) and foreign-content pruning (`<svg>` / `<math>`).
 * Its `walk()` reuses the documented lazy stack idiom of
 * `traversals.walkDescendantsGenerator()` (O(depth), no recursion limit,
 * early-exit safe) driven by the `flatChildren()` adapter (slot / shadow /
 * template aware, frozen with `toArray()` per `traversals.md` §Contract 6)
 * instead of `lastElementChild`. For an ordinary light-DOM, non-foreign
 * subtree it visits exactly the nodes `walkDescendantsGenerator()` would.
 *
 * `context(element)` resolves the per-node {@link RuleContext} the Phase-3
 * rule families consume: the transparent-resolved effective model /
 * categories (via the `resolveModel` / `effectiveCategories` adapters,
 * which walk live ancestors), the `getAncestors()` parent chain, the
 * inherited descendant restrictions accumulated across that chain, and a
 * lazily-computed, memoized `getComputedStyle` accessor (the structure
 * lens never calls it; the Phase-5 presentation lens does).
 *
 * @example
 * ```ts
 * const walker = new Walker(document.body)
 * for (const element of walker.walk()) {
 *   const context = walker.context(element)
 *   if (context.restrictions.interactive) reportInteractiveDescendant(element)
 * }
 * ```
 */
export class Walker implements WalkerInterface {
	readonly #element: Element

	constructor(element: Element) {
		// A non-Element root is a programmer error, not a recoverable input
		// (AGENTS.md §13) — the inspector walks parsed DOM, never strings.
		if (!isElement(element)) {
			throw new Error('Walker: root must be an Element')
		}
		this.#element = element
	}

	/** The subtree root this Walker was constructed over. */
	get element(): Element {
		return this.#element
	}

	/**
	 * Lazily yield every relevant element of the flat subtree rooted at
	 * {@link element}, depth-first, in document order. Descends shadow
	 * roots / slotted elements / `<template>` content; yields a foreign
	 * (`<svg>` / `<math>`) host but never its subtree — and a Walker rooted
	 * *at* a foreign element yields nothing at all (its parent Walker reports
	 * the host; this one would only ever descend the pruned foreign subtree).
	 * Early `break` is safe — nothing is materialized ahead of the consumer.
	 */
	*walk(): Generator<Element, void, unknown> {
		// A Walker rooted AT a foreign element yields nothing: the foreign
		// host is reported by its parent Walker, never by one rooted at it
		// ("yields a foreign host but never its subtree" — the root's own
		// subtree IS that foreign subtree). Without this short-circuit a
		// `new Walker(svg)` would descend the SVG/MathML subtree.
		if (this.#foreign(this.#element)) return
		const stack: Element[] = []
		this.#push(stack, flatChildren(this.#element))
		while (stack.length > 0) {
			const current = stack.pop()
			if (current === undefined) break // pop() under-narrows to T|undefined
			yield current
			// Prune foreign-content subtrees: the host is reported, its
			// non-HTML descendants follow a different content model.
			if (!this.#foreign(current)) {
				this.#push(stack, flatChildren(current))
			}
		}
	}

	/**
	 * The eager frozen snapshot of {@link walk} — safe to iterate while
	 * mutating the DOM (`traversals.md` §Contract 6). Use this when a rule
	 * pass needs a stable node list across mutations; otherwise prefer the
	 * lazy `walk()`.
	 */
	nodes(): readonly Element[] {
		return Array.from(this.walk())
	}

	/**
	 * Resolve the per-node {@link RuleContext}: transparent-resolved
	 * effective model + categories, the nearest-first ancestor chain, the
	 * inherited descendant restrictions accumulated across it, and the lazy
	 * memoized computed-style accessor.
	 */
	context(element: Element): RuleContext {
		const parents = getAncestors(element)
		let computed: CSSStyleDeclaration | null = null
		return {
			element,
			model: resolveModel(element),
			categories: effectiveCategories(element),
			parents,
			restrictions: this.#restrictions(parents),
			style: (): CSSStyleDeclaration => {
				if (computed === null) computed = getComputedStyle(element)
				return computed
			},
		}
	}

	// Push `children` so the stack pops them in document order (mirror of
	// `walkDescendantsGenerator()`'s reverse-sibling push).
	#push(stack: Element[], children: readonly Element[]): void {
		for (let index = children.length - 1; index >= 0; index -= 1) {
			const child = children[index]
			if (child !== undefined) stack.push(child)
		}
	}

	// Foreign-ness is owned by the parity-gated schema registry
	// (`isForeign`), not a second hand-maintained list in this impl file.
	#foreign(element: Element): boolean {
		return isForeign(element.tagName.toLowerCase())
	}

	// Accumulate the transparent-content-model descendant restrictions every
	// ancestor on the resolved chain imposes (`dom.html#the-a-element`
	// "no interactive content / no `a` / no `tabindex` descendant";
	// media elements forbid nested `audio` / `video`).
	#restrictions(parents: readonly Element[]): RuleRestrictions {
		let interactive = false
		let link = false
		let tabindex = false
		let media = false
		for (const parent of parents) {
			if (matchesTag(parent, 'a')) {
				interactive = true
				link = true
				tabindex = true
			} else if (matchesTag(parent, 'button')) {
				interactive = true
				tabindex = true
			} else if (matchesTag(parent, 'canvas')) {
				interactive = true
			} else if (matchesTag(parent, 'audio') || matchesTag(parent, 'video')) {
				media = true
			}
		}
		return { interactive, link, tabindex, media }
	}
}
