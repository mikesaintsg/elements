// ============================================================================
//  Browser-side helpers shared across composables / factories.
//
//  Everything here is framework-agnostic: no Vue imports, no SCSS class
//  manipulation. The pure DOM / table / event helpers take no `traversals`
//  or `schema` dependency. The inspector content-model adapters
//  (`resolveModel` / `effectiveCategories` / `flatChildren` / `nodePath`)
//  AND the generic inspector rule-engine helpers (`buildFinding` /
//  `matchSegments` / `constraintOf` / `findAttributeRule` / … — the
//  `{verb}{Noun}` building blocks `inspector/rules.ts` composes its rule
//  registry from) are the deliberate exception: they COMPOSE `traversals`
//  (ancestor / child / path / id walks) and `schema` (the frozen
//  content-model registry + `CATEGORY_MEMBERS` / `describeElement`) rather
//  than re-implement either. Every cross-imported symbol on that edge is a
//  hoisted `function` used only at call time, so the resulting
//  `helpers ↔ traversals` / `helpers ↔ schema` import cycle is
//  initialization-safe (`schema.ts` builds its frozen array from the
//  hoisted `defineModel` here at module load; nothing here runs at load,
//  and `rules.ts` rule records are object literals — no init-time call).
//  Helpers are grouped, in file order, as:
//
//    • Identity / narrowing — `generateId`, value guards.
//    • DOM node-type guards — `isElement`, `isTagType`, `createMatcher`, …
//    • Taxonomy primitives — `entry` (taxonomy registry row builder).
//    • Content-model schema primitives — `defineModel` (schema row
//      builder) + the inspector adapters `resolveModel` /
//      `effectiveCategories` / `flatChildren` / `nodePath` + the inspector
//      attribute-value coercion (`coerceEnumAttribute` /
//      `coerceIntegerAttribute`).
//    • Inspector rule-engine helpers — the generic `{verb}{Noun}` building
//      blocks `inspector/rules.ts` composes its rule registry from
//      (`buildFinding` / `matchSegments` / `constraintOf` / … ).
//    • Table sort / escape — `cssEscape`, `compareCellValues`.
//    • SCSS selector parsing — `splitTopLevel`, `tagsInHead`, …
//    • String-list coercion — `toStringList`.
//    • Semantic-element gating — `assertElement` / `isTagged` reject hosts
//      that don't match the composable's expected tag (e.g. `useDialog`
//      only accepts `<dialog>`).
//    • Custom-event plumbing — `dispatch`, `emit`, `listen`,
//      `bindEventMap`, `attachListeners`.
//    • Transition coordination — `runTransition`, `waitForFrame`.
//    • Shared body-scroll lock — `lockBodyScroll` / `unlockBodyScroll`
//      used by `useDialog` and `useAside`.
//    • Drag/drop, form, and table primitives.
//    • Popover placement primitives — `sideOf`, `alignmentOf`,
//      `areaForPopoverPlacement`, etc.
//    • Focusability — `isFocusable` and the container scans built on it
//      (`findFocusableElements`, `findFirstFocusable`, `findLastFocusable`).
//    • Roving keyboard navigation — `focusableItems`, `rove`.
// ============================================================================

import type {
	Alignment,
	AttributeEnumDomain,
	AttributeIntegerBound,
	AttributeRule,
	ChildModel,
	ChildSegment,
	ContentCategory,
	ContentConstraint,
	ContentConstraintKind,
	ContentCount,
	ContentModel,
	ContentModelEntry,
	DragDropDetail,
	DragOverDetail,
	DragStartDetail,
	DragTapDetail,
	DropPosition,
	ElementCategory,
	ElementPredicate,
	ElementTreatment,
	Finding,
	FindingDraft,
	FormEntry,
	FormError,
	FormFieldElement,
	MatcherOptions,
	Placement,
	RuleContext,
	RuleSubject,
	Side,
	TableCell,
	TableInput,
	TableRange,
	TableRow,
	TableTarget,
	TaxonomyEntry,
	ThemeSetting,
} from './types.js'
import {
	arrayOf,
	coerceNumber,
	instanceOf,
	isFiniteNumber,
	isFunction,
	isNull,
	isNumber,
	isRecord,
	isString,
	isUndefined,
	literalOf,
	nullableOf,
	orOf,
	parseEnum,
	parseInteger,
	parseNumber,
	parseString,
	recordOf,
} from '@elements/core'
import {
	ATTRIBUTE_ENUM_DOMAINS,
	ATTRIBUTE_INTEGER_BOUNDS,
	BODY_LOCKED_ATTR,
	PLACEMENT_AREAS,
	PLACEMENT_SELFS,
	TABLE_ARIA_ROWCOUNT,
	TABLE_ARIA_ROWINDEX,
	TABLE_EXPANSION_ATTR,
	TRANSITION_FALLBACK_MS,
} from './constants.js'
import { CATEGORY_MEMBERS, categoriesOf, isKnownElement, isTransparent, modelOf } from './schema.js'
import {
	getAncestors,
	getElementById,
	getPathToAncestor,
	getSiblingIndex,
	toArray,
} from './traversals.js'

// ── Identity / narrowing ────────────────────────────────────────────────────

function randomBytes(count: number): Uint8Array {
	const buffer = new Uint8Array(count)
	globalThis.crypto.getRandomValues(buffer)
	return buffer
}

function formatUuid(bytes: Uint8Array): string {
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * Generate a UUID v4 id, optionally namespaced with `prefix`.
 *
 * Use `useId()` from Vue when calling inside a component setup — this
 * fallback is for non-component callers (tests, factory internals).
 *
 * @param prefix - When omitted, a bare UUID v4 is returned; otherwise the
 * result is `` `${prefix}-${uuid}` `` (an empty string yields a leading hyphen).
 * @returns A unique identifier string
 */
export function generateId(prefix?: string): string {
	const bytes = randomBytes(16)
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
	const id = formatUuid(bytes)
	return isUndefined(prefix) ? id : `${prefix}-${id}`
}

/**
 * Safely read an own property from a plain record value.
 *
 * @remarks Delegates the value check to core `isRecord` (canonical): only
 * plain objects (`Object.prototype` / null prototype) qualify — class
 * instances, arrays, and DOM objects return `undefined`.
 */
export function extractProperty(value: unknown, key: string): unknown {
	return isRecord(value) && Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined
}

/** Narrow an unknown value to a readonly string array. */
export const isStringArray: (value: unknown) => value is readonly string[] = arrayOf(isString)

const settingGuard = literalOf('light', 'dark', 'system')

/** Narrow an unknown value to a `ThemeSetting`. */
export function isSetting(value: unknown): value is ThemeSetting {
	return settingGuard(value)
}

/** Narrow an unknown value to a CustomEvent handler. */
export function isEventHandler(value: unknown): value is (event: CustomEvent) => void {
	return isFunction(value)
}

/**
 * Return true when the input event represents a mouse interaction (or no
 * pointer event at all). Touch / pen `PointerEvent`s return `false`.
 */
export function isMouseEvent(
	event: MouseEvent | KeyboardEvent | PointerEvent | undefined,
): boolean {
	if (isUndefined(event)) return true
	if (event instanceof PointerEvent) return event.pointerType === 'mouse'
	return true
}

/** Extract native data-transfer types. */
export function extractTypes(event: DragEvent): readonly string[] {
	const types = event.dataTransfer?.types
	return types ? Array.from(types) : []
}

// ── DOM node-type guards ────────────────────────────────────────────────────

/** Narrow a node to an `Element`. */
export function isElement(node: Node | null): node is Element {
	return node !== null && node.nodeType === Node.ELEMENT_NODE
}

/** Narrow a node to an `HTMLElement`. */
export function isHTMLElement(node: Node | null): node is HTMLElement {
	return node instanceof HTMLElement
}

/** Narrow a node to a `Text` node. */
export function isTextNode(node: Node | null): node is Text {
	return node !== null && node.nodeType === Node.TEXT_NODE
}

/** Narrow an element to a specific tag. */
export function isTagType<K extends keyof HTMLElementTagNameMap>(
	element: Element | null,
	tagName: K,
): element is HTMLElementTagNameMap[K] {
	return element !== null && element.tagName === tagName.toUpperCase()
}

/** Check an element's tag name (case-insensitive). */
export function matchesTag(element: Element, tagName: string): boolean {
	return element.tagName === tagName.toUpperCase()
}

/** Check a single class. */
export function hasClass(element: Element, className: string): boolean {
	return element.classList.contains(className)
}

/** Check every class in `classNames` is present. */
export function hasClasses(element: Element, classNames: readonly string[]): boolean {
	for (const className of classNames) {
		if (!element.classList.contains(className)) return false
	}
	return true
}

/** Check an element id. */
export function hasId(element: Element, id: string): boolean {
	return element.id === id
}

/** Check attribute presence, or exact value when `value` is given. */
export function hasAttribute(element: Element, name: string, value?: string): boolean {
	return value === undefined ? element.hasAttribute(name) : element.getAttribute(name) === value
}

/** Build an `ElementPredicate` from a `MatcherOptions` criteria bag. */
export function createMatcher(criteria: MatcherOptions): ElementPredicate {
	return (element: Element): boolean => {
		if (criteria.tag !== undefined && element.tagName !== criteria.tag.toUpperCase()) return false
		if (criteria.id !== undefined && element.id !== criteria.id) return false
		if (criteria.class !== undefined && !element.classList.contains(criteria.class)) return false
		if (criteria.classes !== undefined && !hasClasses(element, criteria.classes)) return false
		if (criteria.attributes !== undefined) {
			for (const name in criteria.attributes) {
				const expected = criteria.attributes[name]
				if (expected === undefined) {
					if (!element.hasAttribute(name)) return false
				} else if (element.getAttribute(name) !== expected) {
					return false
				}
			}
		}
		return true
	}
}

// ── Taxonomy primitives ─────────────────────────────────────────────────────
// Factor out the boilerplate so adding rows stays a one-liner.

/** Build a {@link TaxonomyEntry} row for the taxonomy registry. */
export function entry(
	tag: string,
	category: ElementCategory,
	treatment: ElementTreatment,
	composable: string | null = null,
): TaxonomyEntry {
	return { tag, category, treatment, composable }
}

// ── Content-model schema primitives ──────────────────────────────────────────
// Row builder for `schema.ts` — the §4.2.1 options bag keeps the optional
// fields single-word leaves instead of a long positional argument list. The
// builder normalizes `transparent` / `void` from `model` so the registry
// can never drift those booleans away from the model shape.

/** Build a {@link ContentModelEntry} row for the content-model registry. */
export function defineModel(
	tag: string,
	categories: readonly ContentCategory[],
	context: string,
	model: ContentModel,
	cite: string,
	options: {
		readonly childModel?: ChildModel
		readonly permits?: readonly ContentCategory[]
		readonly forbidden?: readonly (ContentCategory | string)[]
		readonly constraints?: readonly ContentConstraint[]
		readonly attributes?: readonly AttributeRule[]
	} = {},
): ContentModelEntry {
	return {
		tag,
		categories,
		context,
		model,
		// `childModel` and `permits` are the optional (`?:`) entry fields —
		// mirror the compiled contract's `optionalShape(...)` by leaving each
		// `undefined` when omitted (not an empty placeholder), so an
		// ordered-model parent carries `childModel`, a bare-category parent
		// carries `permits`, and never both (the disjointness the rules and
		// the parity gate depend on).
		...(options.childModel === undefined ? {} : { childModel: options.childModel }),
		...(options.permits === undefined ? {} : { permits: options.permits }),
		forbidden: options.forbidden ?? [],
		constraints: options.constraints ?? [],
		attributes: options.attributes ?? [],
		transparent: model === 'transparent',
		void: model === 'void',
		cite,
	}
}

// ── Inspector content-model adapters ────────────────────────────────────────
// Thin adapters that COMPOSE `traversals` (live ancestor / child / path
// walks) and `schema` (the frozen content-model registry). They re-implement
// neither DOM walking nor content-model data — they bridge the two so the
// Phase-2 Walker / RuleContext (and the Phase-3 rule families) read one
// resolved answer per node. The transparent resolution is a bounded,
// stack-based ancestor walk over `getAncestors()` (O(depth), no recursion
// limit — already adversarial-input-safe per the traversals contract), NOT
// a hand-rolled recursive loop and NOT a self-referential `lazyShape`.

/**
 * The element's *effective* content model — the transparent-content-model
 * resolver, the spine of the inspector's structure lens.
 *
 * A non-transparent known element resolves to its own schema model. A
 * transparent element (`a`, `ins`, `del`, `object`, `video`, `audio`,
 * `canvas`, `map`, `slot`) inherits the model of its nearest
 * **non-transparent** ancestor — walking up through any chain of
 * transparent ancestors. A transparent element with **no non-transparent
 * ancestor** (a detached / fully-transparent root) resolves to `'children'`:
 * the spec rule *"when a transparent element has no parent, its content
 * model restrictions are instead based on flow content"* (flow content's
 * model shape is `children`).
 *
 * @param element - The element whose effective model to resolve.
 * @returns The resolved {@link ContentModel}; `'children'` when the element
 *   is a transparent chain with no non-transparent ancestor (the detached /
 *   fully-transparent flow-content fallback); or `null` when the element's
 *   tag (or the resolved non-transparent ancestor's tag) is not a known
 *   HTML element.
 */
export function resolveModel(element: Element): ContentModel | null {
	const tag = element.tagName.toLowerCase()
	if (!isTransparent(tag)) return isKnownElement(tag) ? modelOf(tag) : null
	for (const ancestor of getAncestors(element)) {
		const ancestorTag = ancestor.tagName.toLowerCase()
		if (!isTransparent(ancestorTag)) {
			return isKnownElement(ancestorTag) ? modelOf(ancestorTag) : null
		}
	}
	// No non-transparent ancestor: a detached / fully-transparent root —
	// content model restrictions fall back to flow content.
	return 'children'
}

/**
 * The element's *effective* content categories. A non-transparent known
 * element exposes its own schema categories. A transparent element exposes
 * the categories of the nearest **non-transparent** ancestor it resolved
 * to (so a rule asking "is this flow content?" gets the spec answer without
 * re-walking); a detached / fully-transparent transparent root falls back
 * to `['flow']` (the same flow-content fallback {@link resolveModel} uses).
 *
 * @param element - The element whose effective categories to resolve.
 * @returns The resolved categories (empty array when the tag is unknown).
 */
export function effectiveCategories(element: Element): readonly ContentCategory[] {
	const tag = element.tagName.toLowerCase()
	if (!isTransparent(tag)) return categoriesOf(tag)
	for (const ancestor of getAncestors(element)) {
		const ancestorTag = ancestor.tagName.toLowerCase()
		if (!isTransparent(ancestorTag)) return categoriesOf(ancestorTag)
	}
	return ['flow']
}

/**
 * The element's flat-tree element children — slot / shadow / template
 * aware, frozen with `toArray()` before return so callers can iterate
 * while mutating the DOM (`traversals.md` §Contract 6):
 *
 * - a `<slot>` yields its `assignedElements()` (the flattened distribution);
 * - a shadow host yields its `shadowRoot` children (the shadow tree);
 * - a `<template>` yields its inert `content` document-fragment children;
 * - anything else yields its ordinary element `children`.
 *
 * @param element - The element whose flat children to read.
 * @returns A frozen snapshot of the flat-tree element children.
 */
export function flatChildren(element: Element): readonly Element[] {
	if (element instanceof HTMLSlotElement) {
		return element.assignedElements()
	}
	if (element.shadowRoot !== null) {
		return toArray(element.shadowRoot.children)
	}
	if (element instanceof HTMLTemplateElement) {
		return toArray(element.content.children)
	}
	return toArray(element.children)
}

/**
 * The element's flat-tree CONTENT parent — the inverse of
 * {@link flatChildren} with shadow `<slot>` conduits collapsed (the spec's
 * flattened tree elides the slot: a distributed node's content-model parent
 * is the element that hosts the slot, not the `<slot>` element). The rule
 * layer reads THIS instead of light-DOM `parentElement` so a rule's notion
 * of "the parent" agrees with the flat tree `Walker.walk()` traverses (the
 * §3 slotted-`<li>` false-positive root cause — `<li>` distributed into a
 * shadow `<ul>` resolves its parent to that `<ul>`, never the light host).
 *
 * Resolution, mirroring {@link flatChildren} exactly:
 * - a slotted element (`assignedSlot !== null`) ⇒ the slot's OWN flat
 *   parent (the slot is collapsed — recurse so nested slots elide too);
 * - a child of a shadow root ⇒ the shadow host element;
 * - otherwise the ordinary `parentElement` (a node inside an inert
 *   `<template>` content fragment has no light parent ⇒ `null`, which is
 *   the correct "no content-model parent" answer — `<template>` content is
 *   a separate inert document fragment, not a content-model context).
 *
 * @param element - The element whose flat content parent to resolve.
 * @returns The flat-tree content parent, or `null` at a flat-tree root.
 */
export function flatParent(element: Element): Element | null {
	const slot = element instanceof HTMLElement ? element.assignedSlot : null
	if (slot !== null && slot !== undefined) return flatParent(slot)
	const parentNode = element.parentNode
	if (parentNode instanceof ShadowRoot) return parentNode.host
	return element.parentElement
}

/**
 * Lazily yield every flat-tree element descendant of `element`, depth-first
 * in document order — the rule layer's descendant traversal, the EXACT
 * element set `Walker.walk()` visits (driven by {@link flatChildren}: slot
 * distribution, shadow roots, `<template>` content), so a rule's
 * forbidden-descendant / self-nest scan never diverges from the walk spine
 * (the §3 light-vs-flat-tree mismatch root cause). Foreign-content subtrees
 * are NOT pruned here — that pruning is the Walker's per-node concern;
 * descendant scans operate on the parent's own subtree, which never starts
 * inside a foreign host (the Walker never recurses past `<svg>`/`<math>`).
 *
 * @param element - The element whose flat descendants to enumerate.
 * @returns A lazy depth-first generator over the flat-tree descendants.
 */
export function* flatDescendants(element: Element): Generator<Element, void, unknown> {
	const stack: Element[] = []
	const children = flatChildren(element)
	for (let index = children.length - 1; index >= 0; index -= 1) {
		const child = children[index]
		if (child !== undefined) stack.push(child)
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		yield current
		const next = flatChildren(current)
		for (let index = next.length - 1; index >= 0; index -= 1) {
			const child = next[index]
			if (child !== undefined) stack.push(child)
		}
	}
}

/**
 * The stable DOM path from `element` up to (but excluding) `ancestor` —
 * a thin wrapper over `traversals.getPathToAncestor()`. With no `ancestor`
 * the path runs to the document root.
 *
 * This is an *intentional* public-API seam, not accidental dead indirection:
 * the ROADMAP enumerates `nodePath` as a Phase-2 `helpers.ts` deliverable
 * (alongside `resolveModel` / `effectiveCategories` / `flatChildren`) and
 * names its concrete consumer — Phase-4 `Finding.path` ("stable DOM path
 * from `getPathToAncestor()`"). Landing the named seam now keeps the public
 * surface stable across phases; it deliberately adds no behavior over
 * `getPathToAncestor()` because none is required of it.
 *
 * @param element - The path's starting element (index 0).
 * @param ancestor - Exclusive upper bound; omitted ⇒ walk to the root.
 * @returns The element chain, nearest first, `ancestor` excluded.
 */
export function nodePath(element: Element, ancestor?: Element | null): readonly Element[] {
	return getPathToAncestor(element, ancestor)
}

/**
 * The **serializable stable DOM path string** for `element` — the faithful
 * serializable projection of {@link nodePath} (the `getPathToAncestor()`
 * element chain) for a `Finding` / the JSON-serializable `FindingRecord`.
 *
 * Each path step is `{tag}:{siblingIndex}` (the lowercased tag + the
 * `traversals.getSiblingIndex()` structural position — the same stable,
 * deterministic locator CSS `:nth-child` uses), joined root-first with `>`.
 * Derived ENTIRELY from the existing `nodePath` / `getPathToAncestor()` +
 * `getSiblingIndex()` traversals (no bespoke DOM walk); deterministic across
 * runs over the same DOM, exactly as the inspector itself is deterministic.
 * Contains no live `Element` refs — it is the serializable counterpart of
 * the in-memory `Finding.path` `readonly Element[]`.
 *
 * @param element - The element to locate (the path's leaf).
 * @param ancestor - Exclusive upper bound; omitted ⇒ path to the root.
 * @returns The `root > … > leaf` path string (`'html:0 > body:0 > p:2'`).
 */
export function describePath(element: Element, ancestor?: Element | null): string {
	const chain = nodePath(element, ancestor)
	const steps: string[] = []
	// `nodePath` is nearest-first (leaf at index 0); emit root-first so the
	// string reads top-down like a CSS path.
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const node = chain[index]
		if (node === undefined) continue
		steps.push(`${node.tagName.toLowerCase()}:${getSiblingIndex(node)}`)
	}
	return steps.join(' > ')
}

// ── Inspector attribute-value coercion ───────────────────────────────────────
// HOW an HTML attribute value is coerced before a closed-domain / numeric
// check — the ONE source of truth the inspector's attribute rules compose
// over the GENERIC `@elements/core` parsers. The case-insensitivity / integer
// grammar is a property of HTML *attribute parsing*, NOT of the environment-
// agnostic core parsers (not every enum is case-insensitive; a JS integer
// string is not the HTML integer microsyntax) — so it lives here, on the
// inspector edge, composing core rather than mutating it (the correct blast
// radius). Both enum value paths (`attribute/value` schema `values` +
// `attribute/enum` global `ATTRIBUTE_ENUM_DOMAINS`) route through
// `coerceEnumAttribute`; every corpus integer attribute through
// `coerceIntegerAttribute`.

/**
 * Coerce a raw HTML enumerated-attribute value against its (already
 * ASCII-lowercase, corpus-faithful) keyword domain, returning the matched
 * keyword or `undefined`.
 *
 * @remarks HTML enumerated-attribute keyword matching is **ASCII
 * case-insensitive** (the corpus cards `scope` / `dir` / `contenteditable` /
 * `inputmode` / `closedby` explicitly as *"Enumerated attribute"*), so the
 * raw value is ASCII-lowercased (per the HTML spec — NOT a locale
 * `toLowerCase`, which has non-ASCII surprises like Turkish dotless-i) before
 * delegating to the generic `@elements/core` {@link parseEnum} (which trims +
 * exact-matches). The domain stays the corpus keyword list verbatim,
 * unwidened; only the input is normalised. This is the single coercion the
 * inspector's enum-value rules share so "valid enumerated value" is decided
 * one way, not via two scattered `.toLowerCase()` patches.
 *
 * @param raw - The raw attribute string (e.g. `getAttribute(...)`).
 * @param domain - The corpus keyword domain (already lowercase).
 * @returns The matched keyword (always lowercase) or `undefined`.
 */
export function coerceEnumAttribute<T extends string>(
	raw: string,
	domain: readonly T[],
): T | undefined {
	// ASCII-only lower-casing per the HTML spec's ASCII case-insensitive
	// keyword match — replace just A–Z, never a locale fold.
	const lowered = raw.replace(/[A-Z]/g, (c) => c.toLowerCase())
	return parseEnum(lowered, domain)
}

/**
 * Coerce a raw HTML integer-attribute value to its integer, gating on the
 * HTML **valid integer** grammar before the numeric/bounds check.
 *
 * @remarks The corpus cards the inspector's integer attributes plainly —
 * `tabindex` *"a valid integer"* (interactions.md §6.6.3), `colspan` /
 * `rowspan` *"a valid non-negative integer"* (tables.md §4.9.11), `span`
 * *"number of columns spanned"* (tables.md) — and an HTML *valid integer* is
 * exactly `-?[0-9]+` (optional `U+002D` then ASCII digits): no hex, no
 * exponent, no leading `+`, no surrounding whitespace. The corpus reserves
 * the *"potentially surrounded by spaces"* allowance for URL attributes
 * (`cite` / `src`) and does **not** state it for these integer cards, so the
 * faithful gate is STRICT — `" 2 "` is not a valid integer. The generic
 * `@elements/core` {@link parseInteger} (→ `Number(...)`) would accept
 * `"0x10"` / `"1e3"` / `"+5"` / `" 5 "`; this gates the value on the HTML
 * grammar FIRST, then composes `parseInteger` for the actual int parse (not a
 * reinvented number parse). Callers apply the corpus min/max afterwards.
 *
 * @param raw - The raw attribute string (e.g. `getAttribute(...)`).
 * @returns The integer when the value is an HTML valid integer, else
 *   `undefined`.
 */
export function coerceIntegerAttribute(raw: string): number | undefined {
	if (!/^-?\d+$/.test(raw)) return undefined
	return parseInteger(raw)
}

// ── Inspector rule-engine helpers ────────────────────────────────────────────
// The genuinely-generic `{verb}{Noun}` building blocks the inspector's
// rule registry (`inspector/rules.ts`) composes — extracted verbatim from
// `rules.ts` so that module stays a pure registry (rule records +
// rule-specific guard compositions) per AGENTS §4.6/§5. Behavior is
// byte-identical to the originals; only names changed to satisfy AGENTS
// §4.3 `{verb}{Noun}`. Like the inspector adapters above, every symbol on
// this edge is a hoisted `function`/`const` guard used only at call time —
// `rules.ts` rule records are object literals, so the resulting import
// cycle stays initialization-safe (nothing here runs at module load).

// `script-supporting` (`script` / `template`) is always permitted where a
// constrained child list says "optionally intermixed"
// (guides/w3c/categories.md §3.2.5), so the content/context families treat
// it as universally allowed.
const isScriptSupporting = literalOf('script', 'template')

/**
 * The closed content-category vocabulary, as a guard, so a `forbidden`
 * token (typed `ContentCategory | string`) narrows to a real
 * `ContentCategory` without an `as` assertion (AGENTS §1).
 */
export const isContentCategory: (value: unknown) => value is ContentCategory = literalOf(
	'metadata',
	'flow',
	'sectioning',
	'heading',
	'phrasing',
	'embedded',
	'interactive',
	'palpable',
	'script-supporting',
	'transparent',
)

/**
 * A tag belongs to a content category iff the inverted `CATEGORY_MEMBERS`
 * index (schema-derived, parity-gated) lists it — never a hand-kept set.
 */
export function matchesTagCategory(tag: string, category: ContentCategory): boolean {
	return CATEGORY_MEMBERS.get(category)?.has(tag) === true
}

/**
 * A `forbidden` token is either a content category or a literal tag;
 * resolve it generically against the schema data, never a per-element
 * branch.
 */
export function matchesForbiddenToken(
	forbidden: ContentCategory | string,
	descendantTag: string,
): boolean {
	if (descendantTag === forbidden) return true
	return isContentCategory(forbidden) && matchesTagCategory(descendantTag, forbidden)
}

/**
 * Find the first constraint of a kind on an entry (constraints are encoded
 * as data so the structure family stays generic per `kind`).
 */
export function constraintOf(
	modelEntry: ContentModelEntry | null,
	kind: ContentConstraintKind,
): ContentConstraint | null {
	if (modelEntry === null) return null
	for (const constraint of modelEntry.constraints) {
		if (constraint.kind === kind) return constraint
	}
	return null
}

/**
 * Assemble the shared `Finding` record — the stable DOM path is the
 * Phase-2 {@link nodePath} adapter (wraps `getPathToAncestor()`); `cite` is
 * the schema entry's corpus anchor verbatim. Pure: builds a frozen record,
 * no I/O.
 */
export function buildFinding(draft: FindingDraft): Finding {
	return {
		severity: draft.severity,
		rule: draft.rule,
		element: draft.element,
		path: nodePath(draft.element),
		message: draft.message,
		cite: draft.cite,
		...(draft.expected === undefined ? {} : { expected: draft.expected }),
		...(draft.actual === undefined ? {} : { actual: draft.actual }),
	}
}

/**
 * Cite fallback: a generic family rule cites the element's own schema
 * entry when it has one. The corpus anchor is the single source of truth —
 * no rule invents an anchor (AGENTS §"corpus = source of truth").
 */
export function citeOf(modelEntry: ContentModelEntry | null, fallback: string): string {
	return modelEntry?.cite ?? fallback
}

/** The lowercased tag name of an element (the child-model engine's reader). */
export function tagOf(child: Element): string {
	return child.tagName.toLowerCase()
}

/**
 * True when `child` is in `category` by its EFFECTIVE (transparent-resolved)
 * categories — the same resolution `RuleContext.categories` is built from, so
 * a category arm absorbs exactly the children the spec's content category
 * admits. A transparent child resolves through its ancestors; a structural
 * child (empty categories — `td`/`li`/…) never matches a category arm (its
 * placement is the structure family's concern, keeping the families
 * disjoint).
 */
export function matchesChildCategory(child: Element, category: ContentCategory): boolean {
	return effectiveCategories(child).includes(category)
}

/**
 * True when any segment in the (recursive) list is an OPEN content-category
 * arm — the model then admits any category-matching child, so a closed-tag
 * membership check cannot apply. Recurses through `group` / `choice`.
 */
export function hasOpenCategoryArm(segments: readonly ChildSegment[]): boolean {
	for (const segment of segments) {
		if (segment.kind === 'category') return true
		if (segment.kind === 'group' && hasOpenCategoryArm(segment.segments)) return true
		if (segment.kind === 'choice' && segment.options.some((o) => hasOpenCategoryArm(o))) return true
	}
	return false
}

/** Collect every concrete tag a (recursive) segment list can admit. */
export function collectSegmentTags(segments: readonly ChildSegment[], into: Set<string>): void {
	for (const segment of segments) {
		if (segment.kind === 'tag') into.add(segment.tag)
		else if (segment.kind === 'group') collectSegmentTags(segment.segments, into)
		else if (segment.kind === 'choice') {
			for (const option of segment.options) collectSegmentTags(option, into)
		}
	}
}

/**
 * The closed tag set a `ChildModel` admits, or `null` when the model has an
 * open `category` arm (any category-matching child is admissible — a
 * membership check cannot reject, so `context/parent-model` must defer to
 * `content/required`). Script-supporting is always in the set.
 */
export function resolvePermittedTags(model: ChildModel): ReadonlySet<string> | null {
	if (hasOpenCategoryArm(model.segments)) return null
	const tags = new Set<string>(['script', 'template'])
	collectSegmentTags(model.segments, tags)
	return tags
}

/** Does `observed` satisfy a `ContentCount` cardinality marker? */
export function satisfiesCount(count: ContentCount, observed: number): boolean {
	if (count === '?') return observed <= 1
	if (count === '*') return true
	if (count === '+') return observed >= 1
	return observed === 1
}

/**
 * Try to consume a contiguous run of `children` starting at `start` that
 * satisfies `segments` in order. Returns the cursor AFTER the matched run,
 * or `null` when the run does not satisfy the segments. Script-supporting
 * elements are skippable anywhere ("optionally intermixed with
 * script-supporting elements"). Pure + total — generic over the recursive
 * `ChildSegment` union (tag / category / group / choice).
 */
export function matchSegments(
	children: readonly Element[],
	start: number,
	segments: readonly ChildSegment[],
): number | null {
	let cursor = start
	const skipScript = (): void => {
		while (cursor < children.length) {
			const c = children[cursor]
			if (c === undefined || !isScriptSupporting(tagOf(c))) break
			cursor += 1
		}
	}
	for (const segment of segments) {
		skipScript()
		if (segment.kind === 'tag') {
			// Consume a run of same-tag children, but never PAST this
			// segment's cardinality upper bound: `'1'`/`'?'` admit at most
			// one, so a trailing same-tag sibling is LEFT for the next
			// segment / the next iteration of an enclosing repeating
			// `group` (the spec's `group*( choice([{tag,1}]…) )` idiom —
			// `tr` td/th, `select` option/optgroup, `optgroup` option).
			// `'+'`/`'*'` have no finite upper bound, so they stay greedy.
			const max = segment.count === '1' || segment.count === '?' ? 1 : Infinity
			let run = 0
			while (cursor < children.length && run < max) {
				const c = children[cursor]
				if (c === undefined || tagOf(c) !== segment.tag) break
				run += 1
				cursor += 1
				skipScript()
			}
			if (!satisfiesCount(segment.count, run)) return null
		} else if (segment.kind === 'category') {
			while (cursor < children.length) {
				const c = children[cursor]
				if (c === undefined) break
				if (isScriptSupporting(tagOf(c))) {
					cursor += 1
					continue
				}
				if (!matchesChildCategory(c, segment.category)) break
				cursor += 1
			}
		} else if (segment.kind === 'group') {
			let groups = 0
			for (;;) {
				const next = matchSegments(children, cursor, segment.segments)
				if (next === null || next === cursor) break
				cursor = next
				groups += 1
			}
			if (!satisfiesCount(segment.count, groups)) return null
		} else {
			let matched: number | null = null
			for (const option of segment.options) {
				const next = matchSegments(children, cursor, option)
				if (next !== null && (matched === null || next > matched)) matched = next
			}
			if (matched === null) return null
			cursor = matched
		}
	}
	skipScript()
	return cursor
}

/**
 * Does the parent's flat-tree element children satisfy its whole ordered
 * `ChildModel`? A `closed` model must consume EVERY child (no trailing
 * content outside the segments); a non-`closed` (prefix) model only
 * requires the structural prefix segments to match — the trailing open
 * `category` arm (already a segment) absorbs the rest, and any leftover
 * beyond a fully consumed prefix is governed elsewhere (transparent
 * resolution, etc.).
 */
export function satisfiesChildModel(children: readonly Element[], model: ChildModel): boolean {
	const end = matchSegments(children, 0, model.segments)
	if (end === null) return false
	if (model.closed) return end === children.length
	return true
}

/**
 * Does the parent's `childModel` make `tag` a REQUIRED leading segment —
 * the first tag-bearing segment, with a mandatory count (`'1'`/`'+'`)? When
 * it does, an out-of-place / missing `tag` makes the whole model
 * unsatisfied so `content/required` (parent-keyed) is the SINGLE reporter
 * and the child-keyed `single-first-child` rule must DEFER (no §1/§2
 * double-report, e.g. `<details><p><summary>`). When `tag` is only an
 * OPTIONAL leading segment (`'?'`, e.g. `legend` in `fieldset`, `caption`
 * in `table`), the permissive prefix model CANNOT detect a late occurrence
 * — `content/required` stays silent, so `single-first-child` is the sole
 * reporter and must NOT defer. This is the disjoint-source partition
 * (structural, not a per-rule special-case): exactly one rule owns each
 * violation.
 */
export function requiresLeadingTag(model: ChildModel, tag: string): boolean {
	const first = model.segments[0]
	if (first === undefined) return false
	if (first.kind === 'tag') return first.tag === tag && (first.count === '1' || first.count === '+')
	return false
}

/**
 * The tag a model permits AT MOST ONE of as its required-leading SINGULAR
 * child, or `null`. A leading `{kind:'tag', count:'1'|'?'}` `segments[0]`
 * segment is, per the corpus **Content model** prose, a singular slot:
 * `details` "One `summary` element followed by flow content." (`summary`(1)),
 * `fieldset` "Optionally a `legend` element, followed by flow content."
 * (`legend`(?)), `table` "Optionally a `caption`, followed by …"
 * (`caption`(?)). The parent therefore permits at most ONE of that tag; a
 * SECOND occurrence among its flat children is a tree-decidable
 * content-model violation. Encoded GENERICALLY off the `childModel` datum —
 * `'1'` and `'?'` (and only a leading TAG segment; a `choice`/`group`/
 * `category` head is not a singular slot, so `figure`'s figcaption — inside
 * a `choice` — is correctly NOT in scope, its position owned by
 * `structure/edge-child`). The `closed` flag is irrelevant to the upper
 * bound itself; rule ownership (closed → `content/required` exhaustiveness;
 * prefix → `content/cardinality`) is partitioned at the rule site so the
 * violation yields exactly one finding.
 */
export function resolveLeadingSingularTag(model: ChildModel): string | null {
	const first = model.segments[0]
	if (first === undefined || first.kind !== 'tag') return null
	if (first.count === '1' || first.count === '?') return first.tag
	return null
}

/**
 * How many of the parent's flat-tree element children carry `tag` — the
 * SAME flat tree the Walker visits (slot/shadow/template), so the
 * cardinality count never diverges from the walk spine (§3); a nested
 * same-tag element under an intermediate child is NOT counted (only direct
 * flat children), so an inner `<details><summary>` is scoped to the inner
 * `<details>`.
 */
export function countLeadingTag(parent: Element, tag: string): number {
	let count = 0
	for (const child of flatChildren(parent)) {
		if (tagOf(child) === tag) count += 1
	}
	return count
}

/**
 * The first flat-tree descendant of `element` satisfying `predicate`
 * (depth-first, document order — driven by {@link flatDescendants}, the EXACT
 * element set `Walker.walk()` visits), or `null`. The generic find-first flat
 * traversal both {@link findForbiddenDescendant} and the rule layer's
 * self-nest scan compose so a descendant check never diverges from the walk
 * spine (§3/§9). Bounded by the finite flat-tree depth.
 */
export function findFlatDescendant(
	element: Element,
	predicate: (descendant: Element) => boolean,
): Element | null {
	for (const descendant of flatDescendants(element)) {
		if (predicate(descendant)) return descendant
	}
	return null
}

/**
 * The first flat-tree descendant whose tag/category is forbidden — a SINGLE
 * flat traversal (find-first idiom, mirroring `Walker.walk()`'s flat tree
 * so the rule layer never diverges from the walk spine, §3/§9).
 */
export function findForbiddenDescendant(
	element: Element,
	forbidden: readonly (ContentCategory | string)[],
): Element | null {
	if (forbidden.length === 0) return null
	return findFlatDescendant(element, (descendant) => {
		const descendantTag = tagOf(descendant)
		for (const token of forbidden) {
			if (matchesForbiddenToken(token, descendantTag)) return true
		}
		return false
	})
}

/**
 * The first FLAT-tree element child whose resolved effective content
 * categories (transparent-resolved via the {@link effectiveCategories}
 * adapter — the SAME resolution `RuleContext.categories` is built from) are
 * NON-EMPTY and share NOTHING with the parent's corpus-derived `permits`
 * set. Transparent children are skipped: their content model IS their
 * parent's (resolved at walk time), so they are permitted wherever their
 * resolved content is — the `transparent` family owns their side-channel.
 * A child with EMPTY effective categories (a structural element — `td`/`li`/
 * `dd`/`summary`/… all carry `categories: []`) is likewise skipped: its
 * placement is governed by the `structure` family's `parent-restricted` /
 * `edge-child` / `single-first-child` constraints — the disjoint boundary
 * that keeps `<div><td>` a single `structure/parent-restricted` finding.
 */
export function findMiscategorizedChild(
	element: Element,
	permits: readonly ContentCategory[],
): Element | null {
	if (permits.length === 0) return null
	for (const child of flatChildren(element)) {
		if (isTransparent(tagOf(child))) continue
		const categories = effectiveCategories(child)
		if (categories.length === 0) continue
		if (!categories.some((category) => permits.includes(category))) return child
	}
	return null
}

/**
 * The first flat-tree ANCESTOR of `element` satisfying `predicate`, or
 * `null`. Walks the SAME flat parent chain `readSubject` resolves "the
 * parent" from ({@link flatParent} — slot conduits collapsed, shadow host as
 * parent), STARTING at `flatParent(element)` (ancestor-only — `element`
 * itself is never tested; the self-inclusive Hidden-state scan
 * {@link isHiddenNode} deliberately does NOT compose this), so a descendant
 * check never diverges from the walk spine (§3 — never light-tree
 * `closest`/`parentElement`). Bounded by the finite flat-tree depth. The
 * generic find-first flat-ancestor traversal both {@link hasFlatAncestorTag}
 * and {@link hasLinkAncestorWithHref} compose.
 */
export function findFlatAncestor(
	element: Element,
	predicate: (ancestor: Element) => boolean,
): Element | null {
	let current = flatParent(element)
	while (current !== null) {
		if (predicate(current)) return current
		current = flatParent(current)
	}
	return null
}

/**
 * Does any flat-tree ancestor of `element` satisfy `predicate`? The boolean
 * projection of {@link findFlatAncestor} (the shared find-first flat-ancestor
 * walk) every ancestor-presence check composes.
 */
export function hasFlatAncestor(
	element: Element,
	predicate: (ancestor: Element) => boolean,
): boolean {
	return findFlatAncestor(element, predicate) !== null
}

/**
 * Does any flat-tree ANCESTOR of `element` carry one of `parents` as its
 * tag? Walks the SAME flat parent chain `readSubject` resolves "the parent"
 * from ({@link flatParent} — slot conduits collapsed, shadow host as
 * parent), so a descendant check never diverges from the walk spine (§3 —
 * never light-tree `closest`/`parentElement`). Bounded by the finite
 * flat-tree depth.
 */
export function hasFlatAncestorTag(element: Element, parents: readonly string[]): boolean {
	return hasFlatAncestor(element, (ancestor) => parents.includes(ancestor.tagName.toLowerCase()))
}

/**
 * The element's flat-tree ancestor chain carries an `a` with a non-empty
 * `href` — the `img[ismap]` corpus check, over the SAME flat parent chain
 * `readSubject` resolves "the parent" from ({@link flatParent} — slot
 * conduits collapsed), never light-tree `closest`. Bounded by the finite
 * flat depth.
 *
 * @remarks Generic via {@link hasFlatAncestor} (predicate = `a` + `href`):
 * the Batch-1-deferred `rules.ts` resident bakes in an extra
 * `hasAttribute('href')` predicate beyond a bare tag match, so it could not
 * be reduced to `hasFlatAncestorTag(el, ['a'])`. The Batch-2 generic
 * predicate-taking base ({@link hasFlatAncestor}) closes that deferral — the
 * walk is byte-identical, the helper is now a centralized `helpers.ts`
 * export (AGENTS §4.6/§5: `rules.ts` keeps only registry + rule-specific
 * content).
 */
export function hasLinkAncestorWithHref(element: Element): boolean {
	return hasFlatAncestor(
		element,
		(ancestor) => ancestor.tagName.toLowerCase() === 'a' && ancestor.hasAttribute('href'),
	)
}

/**
 * The element's child text content, trimmed via the `@elements/core`
 * {@link parseString} parser (coerce-or-`undefined`: a whitespace-only /
 * empty result is `undefined`) — never a hand-rolled `.trim()` length test.
 * Only the element's OWN text nodes count (the corpus `time` datetime value
 * is the element's child text content).
 */
export function readChildText(element: Element): string | undefined {
	let text = ''
	for (const node of element.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
	}
	return parseString(text)
}

/**
 * Find the first `AttributeRule` on an entry matching a predicate — the
 * generic accessor every schema-data-driven attribute rule iterates
 * through, so no rule hand-codes a per-element attribute list.
 */
export function findAttributeRule(
	modelEntry: ContentModelEntry | null,
	match: (rule: AttributeRule) => boolean,
): AttributeRule | null {
	if (modelEntry === null) return null
	for (const rule of modelEntry.attributes) {
		if (match(rule)) return rule
	}
	return null
}

/**
 * The element's `[attribute]` value coerces OUT of its schema-carried
 * closed `values` domain (via {@link coerceEnumAttribute} — ASCII
 * case-insensitive per the HTML spec, then the `@elements/core` `parseEnum`)
 * — the offending `AttributeRule`, or `null`.
 */
export function findOffendingEnumAttribute(
	modelEntry: ContentModelEntry | null,
	element: Element,
): AttributeRule | null {
	return findAttributeRule(modelEntry, (rule) => {
		if (rule.values === undefined) return false
		const raw = element.getAttribute(rule.attribute)
		if (raw === null) return false
		return coerceEnumAttribute(raw, rule.values) === undefined
	})
}

/**
 * The entry carries an `AttributeRule` for `attribute` (the note-bearing
 * schema datum the coupling-domain / interaction families key off, never a
 * tag literal).
 */
export function hasAttributeRule(modelEntry: ContentModelEntry | null, attribute: string): boolean {
	return findAttributeRule(modelEntry, (rule) => rule.attribute === attribute) !== null
}

/**
 * The first `ATTRIBUTE_INTEGER_BOUNDS` corpus bound the element's value
 * violates — coerced via {@link coerceIntegerAttribute} (the HTML valid
 * integer grammar then `parseInteger`), then the corpus min/max — or
 * `null`.
 */
export function findOffendingIntegerBound(
	element: Element,
	tag: string,
): AttributeIntegerBound | null {
	for (const bound of ATTRIBUTE_INTEGER_BOUNDS) {
		if (bound.tags !== undefined && !bound.tags.includes(tag)) continue
		const raw = element.getAttribute(bound.attribute)
		if (raw === null) continue
		const value = coerceIntegerAttribute(raw)
		if (value === undefined) return bound
		if (bound.min !== undefined && value < bound.min) return bound
		if (bound.max !== undefined && value > bound.max) return bound
	}
	return null
}

/**
 * The element's OWN schema entry already carries an `AttributeRule.values`
 * (a closed domain) on `attribute` — so the global-enum rule must DEFER to
 * `attribute/value` (the element-specific schema domain is the spec's
 * narrower authoritative set; one finding per violation).
 */
export function schemaConstrainsValues(
	modelEntry: ContentModelEntry | null,
	attribute: string,
): boolean {
	return (
		findAttributeRule(
			modelEntry,
			(rule) => rule.attribute === attribute && rule.values !== undefined,
		) !== null
	)
}

/**
 * The first `ATTRIBUTE_ENUM_DOMAINS` global keyword domain the element's
 * value coerces OUT of (via {@link coerceEnumAttribute}), skipping any
 * attribute the element's own schema entry already constrains
 * ({@link schemaConstrainsValues} — `attribute/value` owns those), or
 * `null`.
 */
export function findOffendingEnumDomain(
	element: Element,
	modelEntry: ContentModelEntry | null,
): AttributeEnumDomain | null {
	for (const domain of ATTRIBUTE_ENUM_DOMAINS) {
		if (schemaConstrainsValues(modelEntry, domain.attribute)) continue
		const raw = element.getAttribute(domain.attribute)
		if (raw === null) continue
		if (domain.empty === true && raw === '') continue
		if (coerceEnumAttribute(raw, domain.values) === undefined) return domain
	}
	return null
}

/**
 * A referencing element points at a target by one of the corpus-carded
 * associations. `a[href="#id"]` is a same-document fragment; `label[for]` /
 * `output[for]` are plain IDREFs carried as a schema `AttributeRule` (so
 * the recognition is schema-data-driven, never a tag literal). Returns the
 * raw referenced id, or `null` when the element is not a corpus referrer /
 * the reference is not a same-document id.
 */
export function resolveReferencedId(subject: RuleSubject): string | null {
	// Fragment hyperlink: only a bare `#id` same-document fragment is a
	// "link to a section" the corpus §6.1 rule scopes (an absolute / path
	// URL is a navigation, not an in-document reference).
	if (matchesTag(subject.element, 'a')) {
		const href = subject.element.getAttribute('href')
		if (href !== null && href.startsWith('#') && href.length > 1) return href.slice(1)
		return null
	}
	// `for` IDREF — recognized from the SCHEMA `AttributeRule` the element's
	// own card carries (`label` / `output`), never a hardcoded tag set.
	if (hasAttributeRule(subject.entry, 'for')) {
		const target = subject.element.getAttribute('for')
		if (target !== null && target.length > 0) return target
	}
	return null
}

/**
 * Resolve a corpus referrer's same-document target through `traversals`
 * `getElementById` over the referring element's own document (faithful
 * IDREF resolution — never a bespoke `querySelector`); `null` when
 * unresolved.
 */
export function resolveReferencedTarget(subject: RuleSubject): Element | null {
	const id = resolveReferencedId(subject)
	if (id === null) return null
	return getElementById(id, subject.element.ownerDocument)
}

/**
 * An element is in the Hidden state, or inside a `[hidden]` subtree — the
 * corpus §6.1 "hidden" state, decided over the SAME flat parent chain the
 * structure family walks (§3 — never light-tree `closest`). `hidden` is an
 * enumerated attribute; `hidden=until-found` is treated as hidden here, a
 * DELIBERATE conservative reading: the corpus (interactions.md §6.1) does
 * not explicitly exempt the `until-found` state for the `href="#id"`
 * fragment-reveal case, so presence alone is the test. Treating it as
 * hidden cannot under-report a genuine §6.1 violation; carving out an
 * until-found exemption would be an unauthorized corpus-judgment change
 * (the spec does not state one). Accepted conservative reading.
 */
export function isHiddenNode(element: Element): boolean {
	let current: Element | null = element
	while (current !== null) {
		if (current.hasAttribute('hidden')) return true
		current = flatParent(current)
	}
	return false
}

/**
 * A computed-style value, normalized: `getComputedStyle` returns canonical
 * lowercase keywords already, but trim defensively. Never parses/regexes —
 * just the trimmed string the CSSOM resolved.
 */
export function readStyleValue(context: RuleContext, property: string): string {
	return context.style().getPropertyValue(property).trim().toLowerCase()
}

/**
 * The element's explicit ARIA role tokens (the `role` attribute is a
 * space-separated token list; the first valid token wins per ARIA, but for
 * a compensation test ANY listed token suffices). Lowercased, never parsed
 * beyond a whitespace split (HTML-faithful token list).
 */
export function readRoleTokens(element: Element): readonly string[] {
	const raw = element.getAttribute('role')
	if (raw === null) return []
	return raw
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter((token) => token.length > 0)
}

/**
 * The element's `[hidden]` state — `'plain'`, `'until-found'` (ASCII
 * case-insensitive enumerated keyword, via {@link coerceEnumAttribute}), or
 * `null` when the attribute is absent.
 */
export function readHiddenState(element: Element): 'plain' | 'until-found' | null {
	const raw = element.getAttribute('hidden')
	if (raw === null) return null
	// `hidden` is an enumerated attribute; `until-found` is its only non-
	// default keyword (ASCII case-insensitive). `coerceEnumAttribute` is the
	// SAME ASCII-case-insensitive coercion the attribute family uses.
	if (coerceEnumAttribute(raw, ['until-found']) === 'until-found') return 'until-found'
	return 'plain'
}

/**
 * Whether the element matches `:popover-open`. When the engine does not
 * support the pseudo, conservatively treat it as open (do NOT
 * false-positive on an undecidable engine). Total.
 */
export function isPopoverOpen(element: Element): boolean {
	try {
		return element.matches(':popover-open')
	} catch {
		// `:popover-open` unsupported ⇒ cannot decide ⇒ conservatively treat
		// as open (do NOT false-positive on an undecidable engine). Total.
		return true
	}
}

/**
 * The element's INLINE style declaration (decidable author intent — the
 * `style` attribute, NOT computed style; this is the documented-boundary
 * signal, deliberately distinct from `context.style()` which is the
 * ambiguous base computed value for this dynamic-pseudo rule).
 */
export function readInlineStyle(element: Element): CSSStyleDeclaration | null {
	return element instanceof HTMLElement ? element.style : null
}

// ── Table sort / escape primitives ──────────────────────────────────────────

/** Minimal CSS.escape polyfill for attribute selector key values. */
export function cssEscape(value: string): string {
	if (typeof CSS !== 'undefined' && isFunction(CSS.escape)) return CSS.escape(value)
	return value.replace(/(["\\\][])/g, '\\$1')
}

/**
 * Smart-compare two cell text values. Numeric-looking strings are
 * compared numerically; otherwise we fall back to a locale-aware
 * collator (`numeric: true` so "row 9" sorts before "row 10"; case
 * insensitive so "B" doesn't always trail "a"). Returns `<0`, `0`,
 * or `>0` per `Array.sort` convention.
 */
export const sortCollator =
	typeof Intl !== 'undefined'
		? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
		: null
export function compareCellValues(a: string, b: string): number {
	const at = a.trim()
	const bt = b.trim()
	const an = parseNumber(at)
	const bn = parseNumber(bt)
	if (at !== '' && bt !== '' && an !== undefined && bn !== undefined) {
		return an - bn
	}
	if (sortCollator) return sortCollator.compare(at, bt)
	return at < bt ? -1 : at > bt ? 1 : 0
}

// ── SCSS selector parsing ───────────────────────────────────────────────────

/**
 * Split `s` by `sep` only at the top level — respecting paren and bracket
 * nesting so functional pseudos and attribute selectors stay intact.
 */
export function splitTopLevel(s: string, sep: string): string[] {
	const out: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < s.length; i += 1) {
		const ch = s[i]
		if (ch === '(' || ch === '[') depth += 1
		else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
		else if (ch === sep && depth === 0) {
			const part = s.slice(start, i).trim()
			if (part.length > 0) out.push(part)
			start = i + 1
		}
	}
	const last = s.slice(start).trim()
	if (last.length > 0) out.push(last)
	return out
}

/**
 * Extract tag names from the LEADING compound of a piece (e.g., `nav` from
 * `nav.foo[bar]:not(...)`, or `[a, b]` from `:is(a, b)`). Returns empty
 * array if the compound has no tag head (class, attribute, `*`, pseudo).
 */
export function leadingTagsOfCompound(piece: string): readonly string[] {
	// A piece may be a descendant chain: `body:has(main) header` — the LEADING
	// compound for the next `>` combinator is `body:has(main)`. Split by
	// whitespace at top level; take the first chunk.
	const chunks = splitTopLevel(piece, ' ')
	return tagsInHead(chunks[0] ?? '')
}

/**
 * Mirror of `leadingTagsOfCompound` but for the TRAILING compound (the side
 * preceding the `>`). When a piece is `body:has(main) nav`, the relevant
 * compound for the `>` is `nav`, not `body:has(main)`.
 */
export function trailingTagsOfCombinatorChain(piece: string): readonly string[] {
	const chunks = splitTopLevel(piece, ' ')
	return tagsInHead(chunks[chunks.length - 1] ?? '')
}

/**
 * Return the tag names at the head of a single compound selector.
 * `:is(a, b)` / `:where(a, b)` flatten to their inner tag branches.
 * Universal (`*`), classes, attributes, and other pseudos return empty.
 */
export function tagsInHead(compound: string): readonly string[] {
	const trimmed = compound.trim()
	if (trimmed.length === 0) return []
	if (trimmed.startsWith('&')) return []
	if (trimmed === '*' || trimmed.startsWith('*')) return []

	// :is(...) / :where(...) at start (no preceding tag) — flatten.
	const fnMatch = trimmed.match(/^:(is|where)\(/)
	if (fnMatch) {
		const open = trimmed.indexOf('(')
		let depth = 1
		let i = open + 1
		for (; i < trimmed.length && depth > 0; i += 1) {
			const ch = trimmed[i]
			if (ch === '(') depth += 1
			else if (ch === ')') depth -= 1
		}
		const inner = trimmed.slice(open + 1, i - 1)
		return splitTopLevel(inner, ',').flatMap((b) => tagsInHead(b))
	}

	// Bare tag at start. Reject leading `:`, `[`, `.`, `#`.
	const tagMatch = trimmed.match(/^([a-z][a-z0-9]*)\b/)
	if (tagMatch && tagMatch[1] !== undefined) return [tagMatch[1]]
	return []
}

// ── String-list coercion ────────────────────────────────────────────────────

/**
 * Coerce the `value` option into the internal `readonly string[]` form.
 *
 * Typed → typed reshaping of an already-typed union (sibling of traversals'
 * `toArray`); the input-type guards delegate to core (`isUndefined` /
 * `isString`), the empty-string and clone reshape stays identical.
 */
export function toStringList(input: string | readonly string[] | undefined): readonly string[] {
	if (isUndefined(input)) return []
	if (isString(input)) return input === '' ? [] : [input]
	return [...input]
}

// ── Semantic-element gating ─────────────────────────────────────────────────

/**
 * Tag-name guard for composables that bind to a single semantic element.
 *
 * Every `use*` / `create*` that targets a specific HTML element runs this
 * before instantiating its factory state, so the host element MUST be the
 * tag the composable was designed for. Mismatches throw immediately —
 * silently downgrading would let a `<div>` masquerade as a `<dialog>` and
 * break ARIA contracts, scroll-lock pairing, focus-trap assumptions, etc.
 *
 * The `expected` argument is one or more lowercased tag names; anything
 * else throws `TypeError`. Pass an array when a composable accepts a
 * narrow family (e.g. `useDrop` accepts every element, but `useTabs`
 * accepts only `<menu>` / `<ul>` / `<ol>` wrappers).
 *
 * @example
 *   assertElement(el, 'dialog')           // strict — must be HTMLDialogElement
 *   assertElement(el, ['ul', 'ol', 'menu']) // family — any list element
 */
export function assertElement<T extends HTMLElement>(
	element: HTMLElement | null | undefined,
	expected: string | readonly string[],
	composable: string = '',
): asserts element is T {
	if (!element) {
		throw new TypeError(
			`${composable || 'composable'}: host element is null. Pass a ref to a mounted element.`,
		)
	}
	const tag = element.tagName.toLowerCase()
	const list = isString(expected) ? [expected] : expected
	if (!list.includes(tag)) {
		const printed = list.length === 1 ? `<${list[0]}>` : list.map((t) => `<${t}>`).join(' / ')
		throw new TypeError(
			`${composable || 'composable'}: expected ${printed} host element, received <${tag}>. ` +
				`Use the semantically-correct element so framework styles and ARIA contracts apply.`,
		)
	}
}

/**
 * Boolean variant of {@link assertElement}. Useful inside reactive
 * watchers / lazy guards where throwing isn't appropriate (e.g., during
 * SSR teardown when the host transitions through `null`).
 */
export function isTagged<T extends HTMLElement>(
	element: HTMLElement | null | undefined,
	expected: string | readonly string[],
): element is T {
	if (!element) return false
	const tag = element.tagName.toLowerCase()
	const list = isString(expected) ? [expected] : expected
	return list.includes(tag)
}

// ── Custom-event plumbing ───────────────────────────────────────────────────
// Composables dispatch typed CustomEvents on bound elements so external
// consumers can observe or cancel transitions via addEventListener — the
// same pattern Bootstrap uses for `show.bs.modal`, etc.

/**
 * Dispatch a cancelable `CustomEvent` on `el`.
 * Returns `true` when the action should proceed (not prevented),
 * `false` when a listener called `event.preventDefault()`.
 *
 * @remarks Use for cancellable lifecycle transitions: show, hide, slide.
 */
export function dispatch(el: Element, name: string, detail?: unknown): boolean {
	const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail })
	el.dispatchEvent(event)
	return !event.defaultPrevented
}

/**
 * Dispatch a non-cancelable notification `CustomEvent` on `el`.
 *
 * @remarks Use for post-transition notifications: open, close, change, place, activate.
 */
export function emit(el: Element, name: string, detail?: unknown): void {
	el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: false, detail }))
}

/**
 * Add a typed `CustomEvent` listener to `el`.
 * Returns a cleanup function that removes the listener.
 * Internally wraps the handler so it satisfies `EventListener` typing
 * without requiring `as EventListener` casts.
 */
export function listen(
	el: Element,
	name: string,
	handler: (event: CustomEvent) => void,
): () => void {
	const listener = (event: Event): void => {
		if (event instanceof CustomEvent) handler(event)
	}
	el.addEventListener(name, listener)
	return () => el.removeEventListener(name, listener)
}

/**
 * Bind every key in `events` that has a matching handler in `on`.
 * Returns a single composite teardown that removes all listeners.
 *
 * @remarks Replaces the repeated `if (on?.show) offs.push(listen(...))` blocks.
 */
export function bindEventMap(
	el: Element,
	events: Readonly<Record<string, string>>,
	on: object | undefined,
): () => void {
	if (isUndefined(on)) return () => {}
	const offs: (() => void)[] = []
	for (const [key, name] of Object.entries(events)) {
		const value = extractProperty(on, key)
		if (isEventHandler(value)) offs.push(listen(el, name, value))
	}
	return () => offs.forEach((o) => o())
}

/**
 * Bind multiple native event listeners to `el`.
 * Returns a single composite teardown that removes all listeners.
 */
export function attachListeners(
	el: EventTarget,
	entries: readonly { readonly name: string; readonly handler: EventListener }[],
): () => void {
	for (const { name, handler } of entries) el.addEventListener(name, handler)
	return () => {
		for (const { name, handler } of entries) el.removeEventListener(name, handler)
	}
}

// ── Transition coordination ─────────────────────────────────────────────────

/**
 * Run `callback` once after the next CSS transition on `el`, with a
 * timeout fallback in case the transition never fires.
 */
export function runTransition(
	el: HTMLElement,
	callback: () => void,
	fallbackMs: number = TRANSITION_FALLBACK_MS,
): () => void {
	let done = false
	let cancelled = false
	const finish = (): void => {
		if (done) return
		done = true
		el.removeEventListener('transitionend', onEnd)
		clearTimeout(timer)
		if (!cancelled) callback()
	}
	const onEnd = (event: TransitionEvent): void => {
		if (event.target !== el) return
		finish()
	}
	const timer = setTimeout(finish, fallbackMs)
	el.addEventListener('transitionend', onEnd)
	return () => {
		cancelled = true
		finish()
	}
}

/**
 * Report whether `el` has a non-zero declared CSS `transition-duration`.
 *
 * A non-zero declared `transition-duration` means the open/close
 * transition will actually fire, so the lifecycle must wait for
 * `transitionend` (via {@link runTransition}); a `0s` duration means the
 * open/close events can be emitted synchronously. This replaces the legacy
 * `.fade` opt-in: any CSS transition the author declares — via a modifier
 * class, an attribute selector, or a custom property — automatically
 * participates.
 *
 * `transition-duration` may be a comma-separated list; any non-zero entry
 * counts. `coerceNumber`'s string branch is `parseFloat`, so `'0.3s'` → 0.3
 * and `'0s'` → 0; a non-numeric token (`''`, `'s'`) yields `undefined`, so
 * `!isUndefined(n) && n > 0` is the precise non-zero test.
 */
export function hasTransitionDuration(el: HTMLElement): boolean {
	if (typeof getComputedStyle === 'undefined') return false
	const raw = getComputedStyle(el).transitionDuration
	if (!raw) return false
	return raw.split(',').some((v) => {
		const n = coerceNumber(v.trim())
		return !isUndefined(n) && n > 0
	})
}

/**
 * Wait for the next animation frame.
 * Needed to prevent the browser from collapsing a `display` change and an
 * attribute change into a single paint (which would skip the CSS transition).
 */
export function waitForFrame(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
		else setTimeout(resolve, 0)
	})
}

// ── Shared body-scroll lock ─────────────────────────────────────────────────
// Both `useDialog` and `useAside` call these helpers so concurrent open
// instances don't stomp each other's paddingRight.

let scrollLockCount = 0
let scrollLockApplied = false
let scrollLockPad = ''

/**
 * Increment the global scroll-lock counter. On the first call, saves the
 * current `body.style.paddingRight`, adds the scrollbar-compensation width,
 * and toggles the `BODY_LOCKED_ATTR` data-attribute.
 *
 * @remarks The counter is process-global. Calling `unlockBodyScroll()`
 * without a prior `lockBodyScroll()` is a no-op (counter clamps to 0).
 */
export function lockBodyScroll(): void {
	scrollLockCount++
	if (scrollLockApplied) return
	scrollLockApplied = true
	scrollLockPad = document.body.style.paddingRight
	const sw = window.innerWidth - document.documentElement.clientWidth
	if (sw > 0) document.body.style.paddingRight = `${sw}px`
	document.body.setAttribute(BODY_LOCKED_ATTR, '')
}

/**
 * Decrement the global scroll-lock counter. Restores `paddingRight` and
 * removes `BODY_LOCKED_ATTR` only when the counter reaches zero.
 */
export function unlockBodyScroll(): void {
	scrollLockCount = Math.max(0, scrollLockCount - 1)
	if (scrollLockCount > 0 || !scrollLockApplied) return
	scrollLockApplied = false
	document.body.style.paddingRight = scrollLockPad
	document.body.removeAttribute(BODY_LOCKED_ATTR)
}

// ── Drag/drop detail guards ─────────────────────────────────────────────────

const positionGuard = literalOf('before', 'after', 'into')

/** Narrow an unknown value to a drag/drop insertion position. */
export function isDropPosition(value: unknown): value is DropPosition {
	return positionGuard(value)
}

// The drag-detail record shapes are composed once at module scope via core
// `recordOf` (strict: rejects unknown keys, presence via `Object.hasOwn` —
// every drag detail is constructed internally in `createDrag.ts` with exactly
// the declared keys, so strictness is canonical) + core `arrayOf`/`literalOf`/
// `nullableOf` for the JS-domain fields. The DOM-constructor fields stay a
// bare, native `instanceof` (the clean DOM boundary) wrapped in a closure so
// the `PointerEvent`/`HTMLElement` references are read lazily at guard-call
// time — `helpers.ts` must stay import-safe in a DOM-less runtime, exactly as
// the previous in-body `instanceof` was. `Set` is a JS built-in, so it stays
// core `instanceOf(Set)`.
// Native lazy closures (NOT core `instanceOf(PointerEvent)`/`instanceOf(HTMLElement)`):
// a module-scope `instanceOf(DOMGlobal)` dereferences the DOM global at import
// time and `ReferenceError`s under the DOM-less bundle-resolution smoke. The
// closure defers the global read to call time. Do not "simplify" to instanceOf.
const isPointerEvent = (value: unknown): value is PointerEvent => value instanceof PointerEvent
const isHtmlElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement

const dragTapGuard = recordOf({
	index: isNumber,
	pointer: isPointerEvent,
})

const dragStartGuard = recordOf({
	indices: instanceOf(Set),
	pointer: isPointerEvent,
})

const dragOverGuard = recordOf({
	index: isNumber,
	position: positionGuard,
	target: isHtmlElement,
	pointer: isPointerEvent,
	types: arrayOf(isString),
})

const dragDropGuard = recordOf({
	index: nullableOf(isNumber),
	position: nullableOf(positionGuard),
	target: orOf(isHtmlElement, isNull),
	pointer: isPointerEvent,
	types: arrayOf(isString),
})

/** Narrow a `CustomEvent.detail` value to drag tap detail. */
export function isDragTapDetail(value: unknown): value is DragTapDetail {
	return dragTapGuard(value)
}

/** Narrow a `CustomEvent.detail` value to drag start detail. */
export function isDragStartDetail(value: unknown): value is DragStartDetail {
	return dragStartGuard(value)
}

/** Narrow a `CustomEvent.detail` value to drag over detail. */
export function isDragOverDetail(value: unknown): value is DragOverDetail {
	return dragOverGuard(value)
}

/** Narrow a `CustomEvent.detail` value to drag drop detail. */
export function isDragDropDetail(value: unknown): value is DragDropDetail {
	return dragDropGuard(value)
}

/** Find the direct `[data-index]` child of `root` that contains `target`. */
export function extractRow(
	target: EventTarget | null,
	root: HTMLElement | null,
): HTMLElement | null {
	if (!root) return null
	if (!(target instanceof HTMLElement)) return null
	const el = target.closest<HTMLElement>('[data-index]')
	if (!el || el.parentElement !== root) return null
	return el
}

/** Parse `data-index` of a row, returning `null` if it is not a finite number. */
export function indexOfRow(row: HTMLElement | null): number | null {
	if (!row) return null
	const i = parseNumber(row.dataset.index)
	return i === undefined ? null : i
}

/** Return direct `[data-index]` HTMLElement children from `root`. */
export function extractRows(root: HTMLElement | null): readonly HTMLElement[] {
	if (!root) return []
	return Array.from(root.children).filter(
		(child): child is HTMLElement =>
			child instanceof HTMLElement && child.hasAttribute('data-index'),
	)
}

// ── Form helpers ────────────────────────────────────────────────────────────

/** Narrow an element to a native form-associated field element. */
export function isFormFieldElement(element: Element): element is FormFieldElement {
	return (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLFieldSetElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLObjectElement ||
		element instanceof HTMLOutputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	)
}

/** Narrow an element to a field that exposes constraint-validation APIs. */
export function isValidityElement(
	element: Element,
): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	)
}

/** Read form-associated controls from a native form. */
export function readFormFields(form: HTMLFormElement): readonly FormFieldElement[] {
	return Array.from(form.elements).filter(isFormFieldElement)
}

/** Read unique non-empty field names in form order. */
export function readFormNames(fields: readonly FormFieldElement[]): readonly string[] {
	const names = new Set<string>()
	for (const field of fields) {
		if (field.name) names.add(field.name)
	}
	return Array.from(names)
}

/** Snapshot native form data entries. */
export function readFormData(form: HTMLFormElement): readonly FormEntry[] {
	return Array.from(new FormData(form).entries()).map(([name, value]) => ({ name, value }))
}

/**
 * Snapshot current validation errors from form fields.
 *
 * Skips fields where `willValidate` is false — disabled inputs, readonly
 * inputs, inputs inside a disabled `<fieldset>`, and non-submit buttons
 * always report `validity.valid === true` regardless of their value, and
 * do not participate in constraint validation.
 */
export function readFormErrors(fields: readonly FormFieldElement[]): readonly FormError[] {
	const errors: FormError[] = []
	for (const field of fields) {
		if (!isValidityElement(field)) continue
		if (!field.willValidate) continue
		if (field.validity.valid) continue
		errors.push({
			name: field.name,
			message: field.validationMessage,
			validity: field.validity,
		})
	}
	return errors
}

/** Read a form field name from an event target element. */
export function fieldName(element: Element): string | null {
	return isFormFieldElement(element) && element.name ? element.name : null
}

// ── Table helpers ───────────────────────────────────────────────────────────

/** Write a primitive or Node value into a native table cell. */
export function writeTableCell(cell: HTMLTableCellElement, value: TableInput): void {
	cell.textContent = ''
	if (isNull(value) || isUndefined(value)) return
	if (value instanceof Node) {
		cell.appendChild(value)
		return
	}
	cell.textContent = String(value)
}

/** Write a complete native table row, adding or removing cells as needed. */
export function writeTableRow(row: HTMLTableRowElement, values: readonly TableInput[]): void {
	while (row.cells.length > values.length) row.deleteCell(row.cells.length - 1)
	for (let index = 0; index < values.length; index++) {
		const existing = row.cells[index]
		const cell = existing ?? row.insertCell()
		writeTableCell(cell, values[index])
	}
}

/** Read text values from every cell in a table row. */
export function readTableCells(row: HTMLTableRowElement): TableRow {
	return Array.from(row.cells).map((cell) => cell.textContent ?? '')
}

/** Serialize a body-cell coordinate for Set storage. */
export function keyOfTableCell(cell: TableCell): string {
	return `${cell.row},${cell.column}`
}

/** Normalize an insertion index against an inclusive upper bound. */
export function normalizeIndex(index: number, count: number): number | null {
	const n = parseInteger(index)
	return n !== undefined && n >= 0 && n <= count ? n : null
}

/** Narrow a table target to one cell coordinate. */
export function isTableCellTarget(target: TableTarget): target is TableCell {
	return isRecord(target) && 'row' in target && 'column' in target
}

/** Narrow a table target to one row range. */
export function isTableRangeTarget(target: TableTarget): target is TableRange {
	return isRecord(target) && 'from' in target && 'to' in target
}

/**
 * Read body rows across every `<tbody>` in document order. Section-scoped, so
 * `<thead>` and `<tfoot>` rows are never returned. The factory indexes
 * everything off the result, so any caller that needs body-only rows should
 * use this rather than `element.rows` (which is table-flat).
 */
export function readTableRows(element: HTMLTableElement): readonly HTMLTableRowElement[] {
	const rows: HTMLTableRowElement[] = []
	for (const section of Array.from(element.tBodies)) {
		rows.push(...Array.from(section.rows))
	}
	return rows
}

/**
 * Extract the stable id from a table row.
 * Reads `TABLE_ROW_ID_ATTR` (`data-id`), falls back to `data-index`.
 * Empty string is returned when neither attribute is present, indicating
 * positional (unstable) identity.
 */
export function extractRowId(row: HTMLTableRowElement): string {
	return row.dataset.id ?? row.dataset.index ?? ''
}

/**
 * Find the expansion detail `<tr>` immediately following a body row. Returns
 * `null` if the sibling is absent or doesn't carry the expansion attribute.
 */
export function findDetailRow(row: HTMLTableRowElement): HTMLTableRowElement | null {
	const next = row.nextElementSibling
	if (!(next instanceof HTMLTableRowElement)) return null
	return next.hasAttribute(TABLE_EXPANSION_ATTR) ? next : null
}

/**
 * Update `aria-rowindex` on all body rows using the provided `offset`.
 * Indices are 1-based per the ARIA grid spec.
 */
export function applyRowIndex(rows: readonly HTMLTableRowElement[], offset: number): void {
	const base = isFiniteNumber(offset) && offset >= 1 ? Math.floor(offset) : 1
	for (let i = 0; i < rows.length; i++) {
		rows[i]?.setAttribute(TABLE_ARIA_ROWINDEX, String(base + i))
	}
}

/** Write `aria-rowcount` on the table element; remove it when `count` is 0. */
export function applyRowCount(el: HTMLTableElement, count: number): void {
	if (isFiniteNumber(count) && count > 0)
		el.setAttribute(TABLE_ARIA_ROWCOUNT, String(Math.floor(count)))
	else el.removeAttribute(TABLE_ARIA_ROWCOUNT)
}

/** Return the first tbody, optionally creating it. */
export function tableBody(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableSectionElement | null {
	const existing = element.tBodies[0]
	if (existing) return existing
	return create ? element.createTBody() : null
}

/** Return the first header row, optionally creating thead and row. */
export function tableHeaderRow(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableRowElement | null {
	const head = create ? element.createTHead() : element.tHead
	if (!head) return null
	return head.rows[0] ?? (create ? head.insertRow() : null)
}

/** Return the first footer row, optionally creating tfoot and row. */
export function tableFooterRow(
	element: HTMLTableElement,
	create: boolean,
): HTMLTableRowElement | null {
	const foot = create ? element.createTFoot() : element.tFoot
	if (!foot) return null
	return foot.rows[0] ?? (create ? foot.insertRow() : null)
}

/** Write a `<th scope="col">` header row, replacing any existing cells. */
export function writeTableHeaderRow(
	element: HTMLTableElement,
	values: readonly TableInput[],
): void {
	const row = tableHeaderRow(element, true)
	if (!row) return
	while (row.cells.length > 0) row.deleteCell(0)
	for (const value of values) {
		const cell = document.createElement('th')
		cell.scope = 'col'
		writeTableCell(cell, value)
		row.appendChild(cell)
	}
}

/** Write the first footer row with native table cells. */
export function writeTableFooterRow(
	element: HTMLTableElement,
	values: readonly TableInput[],
): void {
	const row = tableFooterRow(element, true)
	if (!row) return
	while (row.cells.length > 0) row.deleteCell(0)
	for (const value of values) writeTableCell(row.insertCell(), value)
}

/**
 * Strip composable-owned selected state from every row and cell. Used by
 * `useTable` to rebuild selection from scratch on the next paint.
 */
export function cleanTableSelection(element: HTMLTableElement): void {
	for (const row of Array.from(element.rows)) {
		row.removeAttribute('aria-selected')
		for (const cell of Array.from(row.cells)) {
			cell.removeAttribute('aria-selected')
		}
	}
}

/**
 * Write `aria-selected="false"` on every body row not already marked
 * `"true"`. ARIA grids require triadic selection state on rows when
 * selection is active.
 */
export function markTableUnselectedRows(element: HTMLTableElement): void {
	for (const section of Array.from(element.tBodies)) {
		for (const row of Array.from(section.rows)) {
			if (row.getAttribute('aria-selected') !== 'true') {
				row.setAttribute('aria-selected', 'false')
			}
		}
	}
}

/** Read the first header row as text values. */
export function readTableHeaders(element: HTMLTableElement): readonly string[] {
	const row = element.tHead?.rows[0]
	return row ? readTableCells(row) : []
}

/** Read the first footer row as text values. */
export function readTableFooter(element: HTMLTableElement): readonly string[] {
	const row = element.tFoot?.rows[0]
	return row ? readTableCells(row) : []
}

/**
 * Read body rows as a two-dimensional text matrix. One entry per physical
 * cell — `colspan="2"` produces one slot, not two.
 */
export function readTableData(element: HTMLTableElement): readonly TableRow[] {
	return readTableRows(element).map(readTableCells)
}

/** Read body data grouped by column index. Returns one `TableRow` per column. */
export function readTableColumns(element: HTMLTableElement): readonly TableRow[] {
	const rows = readTableData(element)
	const count = rows.reduce((max, row) => Math.max(max, row.length), 0)
	const columns: TableRow[] = []
	for (let column = 0; column < count; column++) {
		columns.push(rows.map((row) => row[column] ?? ''))
	}
	return columns
}

// ── Popover placement primitives ────────────────────────────────────────────
// Pure transformers over the `Placement = Side | ${Side}-${Alignment}` shape.
// Used by usePopover (and any composable that wraps it) to decompose a
// placement string and feed it into the surface-layer `position-area` token.

const sideGuard = literalOf('top', 'end', 'bottom', 'start')

/** Type guard narrowing a string to `Side`. */
export function isSide(value: string): value is Side {
	return sideGuard(value)
}

/** Extract the side component of a `Placement`; defaults to `'bottom'`. */
export function sideOf(placement: Placement): Side {
	const head = placement.split('-')[0] ?? ''
	return isSide(head) ? head : 'bottom'
}

const alignGuard = literalOf('start', 'end')

/** Extract the alignment component of a `Placement`, or `null` if absent. */
export function alignmentOf(placement: Placement): Alignment | null {
	const tail = placement.split('-')[1]
	return alignGuard(tail) ? tail : null
}

/** Re-assemble a `Placement` from a `Side` and optional `Alignment`. */
export function makePlacement(side: Side, align: Alignment | null): Placement {
	return align ? `${side}-${align}` : side
}

/** Translate a `Placement` to a CSS `position-area` value. */
export function areaForPopoverPlacement(placement: Placement): string {
	return PLACEMENT_AREAS[placement] ?? PLACEMENT_AREAS.bottom
}

/** `[alignSelf, justifySelf]` pair for a popover `Placement`. */
export function selfsForPopoverPlacement(placement: Placement): readonly [string, string] {
	return PLACEMENT_SELFS[placement] ?? PLACEMENT_SELFS.bottom
}

/**
 * Resolve the side the browser actually placed the panel on. Native popover
 * + `position-try-fallbacks` may flip the requested placement when it would
 * overflow, so the consuming chrome (arrow rotation, callout-edge class)
 * needs the resolved side, not the requested one. Falls back to `'bottom'`
 * when the panel overlaps the anchor (e.g., before first paint).
 */
export function resolvePopoverSide(anchor: HTMLElement, panel: HTMLElement): Side {
	const a = anchor.getBoundingClientRect()
	const p = panel.getBoundingClientRect()
	if (p.bottom <= a.top + 1) return 'top'
	if (p.top >= a.bottom - 1) return 'bottom'
	if (p.right <= a.left + 1) return 'start'
	if (p.left >= a.right - 1) return 'end'
	return 'bottom'
}

// ── Focusability ────────────────────────────────────────────────────────────
// The real focusability predicate plus container scans built on it. These
// live here (not in `traversals.ts`) so `traversals.ts` stays free of focus
// logic and `helpers.ts` keeps a one-way `traversals → helpers` edge with no
// import cycle. All three scans share a single private depth-first generator
// (`eachDescendant`) — same pre-order as the traversals `walkDescendantsGenerator`:
// children pushed last-first so the stack pops in document order.

function* eachDescendant(element: Element): Generator<Element, void, unknown> {
	const stack: Element[] = []
	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		yield current
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}
}

/** Check if an element can actually receive focus. */
export function isFocusable(element: HTMLElement): boolean {
	if (
		(element instanceof HTMLButtonElement ||
			element instanceof HTMLFieldSetElement ||
			element instanceof HTMLInputElement ||
			element instanceof HTMLOptGroupElement ||
			element instanceof HTMLOptionElement ||
			element instanceof HTMLSelectElement ||
			element instanceof HTMLTextAreaElement) &&
		element.disabled
	) {
		return false
	}

	if (element.tabIndex < 0) {
		return false
	}

	const tag = element.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
		return true
	}

	if (tag === 'A' && element.hasAttribute('href')) {
		return true
	}

	if (element.hasAttribute('tabindex')) {
		return true
	}

	return element.isContentEditable
}

/** Find all focusable elements within a container, in document order. */
export function findFocusableElements(element: Element): readonly HTMLElement[] {
	const focusable: HTMLElement[] = []
	for (const el of eachDescendant(element)) {
		if (el instanceof HTMLElement && isFocusable(el)) focusable.push(el)
	}
	return focusable
}

/** Find the first focusable element (depth-first, document order). */
export function findFirstFocusable(element: Element): HTMLElement | null {
	for (const el of eachDescendant(element)) {
		if (el instanceof HTMLElement && isFocusable(el)) return el
	}
	return null
}

/** Find the last focusable element. */
export function findLastFocusable(element: Element): HTMLElement | null {
	let last: HTMLElement | null = null
	for (const el of eachDescendant(element)) {
		if (el instanceof HTMLElement && isFocusable(el)) last = el
	}
	return last
}

// ── Roving keyboard navigation ──────────────────────────────────────────────

/**
 * Return all `selector`-matching descendants of `root` that can actually
 * receive focus, as a flat array.
 *
 * Why the focusability filter exists: `MENU_ITEM_SELECTOR` matches
 * `<li>`, `<a>`, and `<button>` so authors can rove either over the
 * spec-required `<menu><li>` wrappers OR over the inner interactive
 * element. But when BOTH are present (`<menu><li><button>…</button></li>`
 * — the most common shape) a raw `querySelectorAll` returns
 * `[LI, BUTTON, LI, BUTTON, …]` and roving lands on the `<li>` first.
 * `<li>` has `tabIndex = -1` by default, so `.focus()` is a silent no-op
 * and the user sees nothing happen.
 *
 * Filtering through {@link isFocusable} drops the non-focusable wrapper
 * while preserving the case where the `<li>` itself is the tab-stop (the
 * author opts in with `tabindex="0"` and presumably hasn't also nested
 * an `<a>` / `<button>` inside). Reusing the shared focusability predicate
 * (rather than a bare `tabIndex >= 0` check) also excludes disabled native
 * controls that happen to keep a non-negative `tabIndex`.
 */
export function focusableItems(root: HTMLElement | null, selector: string): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => isFocusable(el))
}

/**
 * Compute the next focused index for roving keyboard navigation.
 * Handles `ArrowDown`, `ArrowUp`, `Home`, and `End`.
 *
 * @param items — flat list of candidate elements
 * @param key — `KeyboardEvent.key` value
 * @param current — index of the currently focused element (-1 when none)
 * @returns new target index, clamped to `[0, items.length - 1]`
 */
export function rove(items: readonly HTMLElement[], key: string, current: number): number {
	const n = items.length
	if (n === 0) return 0
	if (key === 'Home') return 0
	if (key === 'End') return n - 1
	if (key === 'ArrowDown' || key === 'ArrowUp') {
		const delta = key === 'ArrowDown' ? 1 : -1
		if (current < 0) return key === 'ArrowDown' ? 0 : n - 1
		return (current + delta + n) % n
	}
	return current
}
