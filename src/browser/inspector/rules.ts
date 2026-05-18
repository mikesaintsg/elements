import type {
	AttributeEnumDomain,
	AttributeIntegerBound,
	AttributeRule,
	ChildModel,
	ChildSegment,
	ContentCategory,
	ContentConstraint,
	ContentConstraintKind,
	ContentCount,
	ContentModelEntry,
	Finding,
	FindingDraft,
	RuleContext,
	RuleInterface,
	RuleSubject,
} from '../types.js'
import { andOf, literalOf, notOf, parseString, whereOf } from '@elements/core'
import {
	coerceEnumAttribute,
	coerceIntegerAttribute,
	effectiveCategories,
	flatChildren,
	flatDescendants,
	flatParent,
	matchesTag,
	nodePath,
} from '../helpers.js'
import { getElementById } from '../traversals.js'
import { ATTRIBUTE_ENUM_DOMAINS, ATTRIBUTE_INTEGER_BOUNDS } from '../constants.js'
import {
	CATEGORY_MEMBERS,
	describeElement,
	isKnownElement,
	isTransparent,
	isVoid,
} from '../schema.js'

// ============================================================================
//  Inspector rule engine + the four schema-data-driven rule families.
//
//  A rule is a PURE record (`RuleInterface`) — `(element, context) =>
//  Finding | null` — with no shared mutable state. Every composite predicate
//  is a NAMED `@elements/core` validator composition over a `RuleSubject`
//  projection (the live element + its resolved `RuleContext` + the frozen
//  `schema` entries for it and its parent), so each rule reads as a guard
//  composition, never ad-hoc boolean spaghetti. The families iterate the
//  Phase-1 `schema` DATA (`describeElement` → `model` / `categories` /
//  `childModel` / `forbidden` / `constraints`, `CATEGORY_MEMBERS`, `isVoid`)
//  and the Phase-2 `RuleContext` (resolved `model` / `categories` /
//  `parents` / `restrictions`) — they are GENERIC, never per-element
//  hand-code. `evaluate` is TOTAL (AGENTS §13): a non-match yields `null`,
//  a guard non-match yields `false`, nothing throws.
//
//  Flat-tree contract (§3): every child / descendant read goes through the
//  `flatChildren` / `flatDescendants` adapters — the SAME flat tree
//  `Walker.walk()` visits (slot distribution, shadow roots, `<template>`
//  content). The rule layer NEVER reads `element.children` /
//  `querySelectorAll` raw, so the walk spine and the rules can never
//  disagree about which elements exist (the slotted-`<li>` false positive).
//
//  Single-source ordered model (§1/§2): an element's ordered child content
//  model lives ONCE in `entry.childModel` (see types.ts) — never duplicated
//  across `required` + a constraint. The content / context families consume
//  ONLY that datum and partition the parents disjointly:
//    - context/parent-model — fires on a CHILD whose tag the parent's
//      `childModel` can NEVER admit anywhere (a pure membership miss).
//    - content/required     — fires on the PARENT when every child tag IS
//      admissible but the ordered model (order / cardinality / required
//      prefix) is not satisfied.
//  These predicates are mutually exclusive by construction, so one
//  content-model violation yields exactly one finding (no content↔structure
//  double-report — `structure/child-order` is GONE; `childModel` is the sole
//  order owner).
//
//  Families (Phase 3 parts 1 + 2 + 3 — Phase 3 COMPLETE):
//    - context      child tag the parent's `childModel` can never admit
//                    (dom.html#content-models).
//    - content      parent's `childModel` order/cardinality unsatisfied;
//                    forbidden descendant present; child not an allowed
//                    category (dom.html#kinds-of-content).
//    - transparent  interactive / `a` / `tabindex` descendant of `<a>` (etc.)
//                    and nested media — driven by `RuleContext.restrictions`
//                    (dom.html#transparent-content-models).
//    - structure    the discrete named `entry.constraints` (per `kind`,
//                    generic) plus `void-has-children`.
//    - attribute    coupling (`AttributeRule.requires`), required-attribute
//                    (`AttributeRule.required`), enum-value
//                    (`AttributeRule.values` via `coerceEnumAttribute`),
//                    coupling-domain (the `note`-keyed corpus DOM checks —
//                    `time`/`datetime`, `img`/`ismap`, `colgroup`/`span`,
//                    `dialog`/`tabindex`), integer/range
//                    (`coerceIntegerAttribute` over the corpus-bound
//                    `ATTRIBUTE_INTEGER_BOUNDS`), and global-enum
//                    (`coerceEnumAttribute` over `ATTRIBUTE_ENUM_DOMAINS`)
//                    — generic, schema-data-driven, attribute-only (the
//                    other families never read attributes ⇒ disjoint).
//    - interaction  hidden REFERENCE integrity — a non-hidden
//                    `a[href="#id"]`/`label[for]`/`output[for]` referencing
//                    a `hidden` target (interactions.md §6.1). Generic over
//                    the corpus-carded associations (the `for` IDREF read
//                    via the schema `AttributeRule`), reference resolution
//                    composed from `traversals` (`getElementById`).
//                    `dialog[tabindex]` is deferred to the attribute family
//                    (no double-report). NOTE: an "inert reference" rule was
//                    deliberately NOT encoded — the WHATWG spec (§6.3) never
//                    states an inert reference-integrity conformance rule
//                    (§6.3's only near-prose is non-normative and not
//                    tree-walker-decidable); encoding one would invent a
//                    rule the corpus does not state (spec is source of
//                    truth — see the omitted-ARIA-domain rationale below).
//
//  Phase 4 (FindingManager / Inspector / ContractShape) plugs into THIS
//  `RuleInterface` + `rules` registry unchanged — the contract is designed
//  for it, not built here (YAGNI). Phase 3 is COMPLETE.
// ============================================================================

// ── Rule subject ────────────────────────────────────────────────────────────
//
// `RuleSubject` (declared in types.ts — the project's single type source,
// §5) is the projection every family guard composes over: pre-resolving the
// parent + the two schema entries once keeps each rule a pure guard
// composition over one value rather than re-deriving them ad-hoc.

// The structural base every family guard refines via `whereOf`. `readSubject`
// always produces a well-formed subject, so this is a total identity base —
// it exists so each rule's predicate is a NAMED `whereOf(isSubject, …)`
// composition (the validators.md "rule = named guard composition" idiom)
// rather than a bare arrow.
const isSubject = (value: unknown): value is RuleSubject =>
	value !== null && typeof value === 'object'

function readSubject(element: Element, context: RuleContext): RuleSubject {
	const tag = element.tagName.toLowerCase()
	// The FLAT-tree content parent (slot conduits collapsed) — NOT
	// `context.parents[0]` (light-DOM `getAncestors()`). This is the §3
	// fix: the rule's notion of "the parent" must agree with the flat tree
	// `Walker.walk()` traverses, so a slotted child resolves to its shadow
	// host's containing element, never the light host (the slotted-`<li>`
	// false positive). `context.parents` stays the Walker's light ancestor
	// chain for the transparent family's accumulated restrictions.
	const parent = flatParent(element)
	return {
		element,
		context,
		tag,
		entry: describeElement(tag),
		parent,
		parentEntry: parent === null ? null : describeElement(parent.tagName.toLowerCase()),
	}
}

// ── Shared predicates ───────────────────────────────────────────────────────
//
// Tiny `is{Condition}` guards the family guards compose. `script-supporting`
// (`script` / `template`) is always permitted where a constrained child list
// says "optionally intermixed" (guides/w3c/categories.md §3.2.5), so the
// content/context families treat it as universally allowed.

const isScriptSupporting = literalOf('script', 'template')

// The closed content-category vocabulary, as a guard, so a `forbidden` token
// (typed `ContentCategory | string`) narrows to a real `ContentCategory`
// without an `as` assertion (AGENTS §1).
const isContentCategory = literalOf(
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

// A tag belongs to a content category iff the inverted `CATEGORY_MEMBERS`
// index (schema-derived, parity-gated) lists it — never a hand-kept set.
function tagInCategory(tag: string, category: ContentCategory): boolean {
	return CATEGORY_MEMBERS.get(category)?.has(tag) === true
}

// A `forbidden` token is either a content category or a literal tag; resolve
// it generically against the schema data, never a per-element branch.
function descendantHits(forbidden: ContentCategory | string, descendantTag: string): boolean {
	if (descendantTag === forbidden) return true
	return isContentCategory(forbidden) && tagInCategory(descendantTag, forbidden)
}

// Find the first constraint of a kind on an entry (constraints are encoded
// as data so the structure family stays generic per `kind`).
function constraintOf(
	entry: ContentModelEntry | null,
	kind: ContentConstraintKind,
): ContentConstraint | null {
	if (entry === null) return null
	for (const constraint of entry.constraints) {
		if (constraint.kind === kind) return constraint
	}
	return null
}

// ── Finding builder ─────────────────────────────────────────────────────────
//
// `FindingDraft` (types.ts, §5) is `Finding` minus the DOM `path` the
// builder derives — a rule never restates the path-derivation.

// Assemble the shared `Finding` record — the stable DOM path is the Phase-2
// `nodePath` adapter (wraps `getPathToAncestor()`); `cite` is the schema
// entry's corpus anchor verbatim. Pure: builds a frozen record, no I/O.
function buildFinding(draft: FindingDraft): Finding {
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

// Cite fallback: a generic family rule cites the element's own schema entry
// when it has one. The corpus anchor is the single source of truth — no rule
// invents an anchor (AGENTS §"corpus = source of truth").
function citeOf(entry: ContentModelEntry | null, fallback: string): string {
	return entry?.cite ?? fallback
}

// ── Child-model engine ──────────────────────────────────────────────────────
//
// The ONE consumer of `entry.childModel` (types.ts `ChildModel` /
// `ChildSegment`). Generic over EVERY ordered/prefix/group/choice model in
// the registry — never table-specific or picture-specific code. Two pure
// answers per parent:
//
//   - permittedTags(model)  the closed set of tags the model can EVER admit
//                            (every `tag`/`group`/`choice` segment's tags,
//                            plus script-supporting). A `category` arm makes
//                            the set OPEN (any category-matching child) —
//                            signalled by `null`.
//   - matchSegments(...)    does the ordered child run satisfy the segment
//                            list (cardinality + order, script-supporting
//                            freely intermixed, `category` arm absorbing any
//                            run of category-matching children)?
//
// `context/parent-model` reads `permittedTags`; `content/required` reads
// `matchSegments`. They never overlap (membership-miss vs. order-miss).

function childTag(child: Element): string {
	return child.tagName.toLowerCase()
}

// True when `child` is in `category` by its EFFECTIVE (transparent-resolved)
// categories — the same resolution `RuleContext.categories` is built from, so
// a category arm absorbs exactly the children the spec's content category
// admits. A transparent child resolves through its ancestors; a structural
// child (empty categories — `td`/`li`/…) never matches a category arm (its
// placement is the structure family's concern, keeping the families
// disjoint).
function childInCategory(child: Element, category: ContentCategory): boolean {
	return effectiveCategories(child).includes(category)
}

// True when any segment in the (recursive) list is an OPEN content-category
// arm — the model then admits any category-matching child, so a closed-tag
// membership check cannot apply. Recurses through `group` / `choice`.
function hasOpenArm(segments: readonly ChildSegment[]): boolean {
	for (const segment of segments) {
		if (segment.kind === 'category') return true
		if (segment.kind === 'group' && hasOpenArm(segment.segments)) return true
		if (segment.kind === 'choice' && segment.options.some((o) => hasOpenArm(o))) return true
	}
	return false
}

// Collect every concrete tag a (recursive) segment list can admit.
function collectTags(segments: readonly ChildSegment[], into: Set<string>): void {
	for (const segment of segments) {
		if (segment.kind === 'tag') into.add(segment.tag)
		else if (segment.kind === 'group') collectTags(segment.segments, into)
		else if (segment.kind === 'choice') {
			for (const option of segment.options) collectTags(option, into)
		}
	}
}

// The closed tag set a `ChildModel` admits, or `null` when the model has an
// open `category` arm (any category-matching child is admissible — a
// membership check cannot reject, so `context/parent-model` must defer to
// `content/required`). Script-supporting is always in the set.
function permittedTags(model: ChildModel): ReadonlySet<string> | null {
	if (hasOpenArm(model.segments)) return null
	const tags = new Set<string>(['script', 'template'])
	collectTags(model.segments, tags)
	return tags
}

function withinCount(count: ContentCount, observed: number): boolean {
	if (count === '?') return observed <= 1
	if (count === '*') return true
	if (count === '+') return observed >= 1
	return observed === 1
}

// NB: the per-segment cardinality-to-prose formatter the old `required`-era
// rule used is GONE — the `Finding.expected` message's single source is now
// the verbatim corpus **Content model** prose (`ChildModel.note`, via
// `describeModel`), so a hand-rolled re-statement would be a second wording
// source (the very over­load this refactor removed). Cardinality is decided
// numerically by `withinCount`; the human wording comes from the corpus.

// Try to consume a contiguous run of `children` starting at `start` that
// satisfies `segments` in order. Returns the cursor AFTER the matched run, or
// `null` when the run does not satisfy the segments. Script-supporting
// elements are skippable anywhere ("optionally intermixed with
// script-supporting elements"). Pure + total — generic over the recursive
// `ChildSegment` union (tag / category / group / choice).
function matchSegments(
	children: readonly Element[],
	start: number,
	segments: readonly ChildSegment[],
): number | null {
	let cursor = start
	const skipScript = (): void => {
		while (cursor < children.length) {
			const c = children[cursor]
			if (c === undefined || !isScriptSupporting(childTag(c))) break
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
				if (c === undefined || childTag(c) !== segment.tag) break
				run += 1
				cursor += 1
				skipScript()
			}
			if (!withinCount(segment.count, run)) return null
		} else if (segment.kind === 'category') {
			while (cursor < children.length) {
				const c = children[cursor]
				if (c === undefined) break
				if (isScriptSupporting(childTag(c))) {
					cursor += 1
					continue
				}
				if (!childInCategory(c, segment.category)) break
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
			if (!withinCount(segment.count, groups)) return null
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

// Does the parent's flat-tree element children satisfy its whole ordered
// `ChildModel`? A `closed` model must consume EVERY child (no trailing
// content outside the segments); a non-`closed` (prefix) model only requires
// the structural prefix segments to match — the trailing open `category` arm
// (already a segment) absorbs the rest, and any leftover beyond a fully
// consumed prefix is governed elsewhere (transparent resolution, etc.).
function childModelSatisfied(children: readonly Element[], model: ChildModel): boolean {
	const end = matchSegments(children, 0, model.segments)
	if (end === null) return false
	if (model.closed) return end === children.length
	return true
}

// Does the parent's `childModel` make `tag` a REQUIRED leading segment —
// the first tag-bearing segment, with a mandatory count (`'1'`/`'+'`)? When
// it does, an out-of-place / missing `tag` makes the whole model unsatisfied
// so `content/required` (parent-keyed) is the SINGLE reporter and the
// child-keyed `single-first-child` rule must DEFER (no §1/§2 double-report,
// e.g. `<details><p><summary>`). When `tag` is only an OPTIONAL leading
// segment (`'?'`, e.g. `legend` in `fieldset`, `caption` in `table`), the
// permissive prefix model CANNOT detect a late occurrence — `content/
// required` stays silent, so `single-first-child` is the sole reporter and
// must NOT defer. This is the disjoint-source partition (structural, not a
// per-rule special-case): exactly one rule owns each violation.
function modelRequiresLeading(model: ChildModel, tag: string): boolean {
	const first = model.segments[0]
	if (first === undefined) return false
	if (first.kind === 'tag') return first.tag === tag && (first.count === '1' || first.count === '+')
	return false
}

// Human-readable expectation, derived from the model's verbatim prose
// (`note`) — the corpus is the single source of the message wording.
function describeModel(model: ChildModel): string {
	return model.note
}

// ── Cardinality / sequence reporting helpers (kept for the message body) ────

function childrenSummary(children: readonly Element[]): string {
	return children.map((c) => `<${childTag(c)}>`).join(', ') || '(no element children)'
}

// ============================================================================
//  Family: context — child tag the parent's ordered model can never admit.
//
//  Schema-driven: the parent entry's `childModel` IS its constrained child
//  list. If the parent carries a `childModel` whose `permittedTags` is a
//  CLOSED set (no open `category` arm) and the element's tag is not in it
//  (nor script-supporting), the element can NEVER legally sit here — a
//  membership miss, reported on the CHILD. A parent with no `childModel`, or
//  one with an open category arm, is NOT this family's concern (the
//  `content/category` / `content/required` families own those) — disjoint by
//  construction, one finding per violation. Cite: the parent's corpus anchor
//  (the constraint is the parent's), dom.html#content-models.
// ============================================================================

const isMisplacedChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const parentEntry = subject.parentEntry
	if (parentEntry?.childModel === undefined) return false
	// Only a KNOWN content element can be a content-model membership
	// violation. A non-schema tag — a custom element, or a flat-tree
	// conduit the Walker descends THROUGH (`<slot>` / `<template>`) — is
	// not placeable by the content vocabulary, so the spec cannot reject it
	// by tag membership (and `<slot>` is the distribution point, not the
	// distributed content — its assigned elements are walked separately,
	// §3). Defer rather than false-positive on the conduit.
	if (!isKnownElement(subject.tag)) return false
	const allowed = permittedTags(parentEntry.childModel)
	// Open category arm ⇒ a membership check cannot reject; defer to
	// content/category + content/required (no double report).
	if (allowed === null) return false
	return !allowed.has(subject.tag)
})

const contextRule: RuleInterface = {
	id: 'context/parent-model',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!isMisplacedChild(subject)) return null
		const parentEntry = subject.parentEntry
		const parentTag = subject.parent?.tagName.toLowerCase() ?? '(root)'
		const allowed =
			parentEntry?.childModel === undefined ? null : permittedTags(parentEntry.childModel)
		return buildFinding({
			rule: 'context/parent-model',
			severity: 'error',
			element,
			cite: citeOf(parentEntry, 'dom#content-models'),
			message: `<${subject.tag}> is not allowed as a child of <${parentTag}> — the parent's content model constrains its children.`,
			expected: allowed === null ? undefined : [...allowed].sort().join(', '),
			actual: subject.tag,
		})
	},
}

// ============================================================================
//  Family: content — the element's OWN child list / descendants are wrong.
//
//  Three generic concerns, each schema-data-driven:
//    1. required/order — `entry.childModel` is the element's ordered child
//       content model (closed sequence OR structural prefix + open category
//       arm). The element-children must satisfy it (cardinality + order,
//       script-supporting intermixed). Drives `ul`/`ol` (li*), `table`,
//       `picture`, `select`, `hgroup`, `dl`, `ruby`, `details`, `fieldset`,
//       `figure`, … from ONE datum. Fires ONLY when every child tag is
//       admissible (else the membership miss is `context/parent-model`'s) —
//       so a violation yields exactly one finding.
//    2. forbidden descendant — any flat-tree descendant whose tag/category
//       is named in `entry.forbidden` (e.g. `dt` forbids heading/sectioning,
//       `header` forbids header/footer).
//    3. category — a bare-category parent (`entry.permits` non-empty: the
//       corpus-derived "Flow content." / "Phrasing content." child set)
//       whose non-transparent element child's resolved categories do not
//       intersect `permits` (e.g. `<p><div>` — flow inside phrasing). The
//       general category class neither `context` nor the `childModel`-driven
//       rule can see (those parents carry `permits`, never `childModel`) —
//       disjoint by construction (parity-guarded), one finding per
//       violation.
//  Cite: the element's own corpus anchor, dom.html#kinds-of-content (the
//  category sub-rule cites dom.html#content-models — the model boundary it
//  enforces).
// ============================================================================

// The first flat-tree descendant whose tag/category is forbidden — a SINGLE
// flat traversal (find-first idiom, mirroring `Walker.walk()`'s flat tree so
// the rule layer never diverges from the walk spine, §3/§9).
function firstForbiddenDescendant(
	element: Element,
	forbidden: readonly (ContentCategory | string)[],
): Element | null {
	if (forbidden.length === 0) return null
	for (const descendant of flatDescendants(element)) {
		const descendantTag = childTag(descendant)
		for (const token of forbidden) {
			if (descendantHits(token, descendantTag)) return descendant
		}
	}
	return null
}

// Fires only when the parent carries a `childModel` AND every flat child tag
// is admissible by it (a non-admissible tag is `context/parent-model`'s — the
// two predicates are mutually exclusive, so the registry produces exactly one
// finding for one violation).
const violatesChildModel = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const entry = subject.entry
	if (entry?.childModel === undefined) return false
	const children = flatChildren(subject.element)
	const allowed = permittedTags(entry.childModel)
	if (allowed !== null) {
		// Closed-tag model: a non-admissible child is the context family's
		// membership miss, not an order miss — defer (one finding per
		// violation).
		for (const child of children) {
			if (!allowed.has(childTag(child))) return false
		}
	}
	return !childModelSatisfied(children, entry.childModel)
})

const contentRequiredRule: RuleInterface = {
	id: 'content/required',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesChildModel(subject)) return null
		const entry = subject.entry
		if (entry?.childModel === undefined) return null
		const children = flatChildren(element)
		return buildFinding({
			rule: 'content/required',
			severity: 'error',
			element,
			cite: citeOf(entry, 'dom#kinds-of-content'),
			message: `<${subject.tag}> requires a specific child content model that its children do not satisfy.`,
			expected: describeModel(entry.childModel),
			actual: childrenSummary(children),
		})
	},
}

const hasForbiddenList = whereOf(
	isSubject,
	(subject: RuleSubject): boolean => subject.entry !== null && subject.entry.forbidden.length > 0,
)

const contentForbiddenRule: RuleInterface = {
	id: 'content/forbidden',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!hasForbiddenList(subject)) return null
		const entry = subject.entry
		if (entry === null) return null
		const offender = firstForbiddenDescendant(element, entry.forbidden)
		if (offender === null) return null
		const offenderTag = childTag(offender)
		return buildFinding({
			rule: 'content/forbidden',
			severity: 'error',
			element,
			cite: citeOf(entry, 'dom#kinds-of-content'),
			message: `<${subject.tag}> must not contain a <${offenderTag}> descendant.`,
			expected: `no ${entry.forbidden.join(' / ')} descendant`,
			actual: `<${offenderTag}>`,
		})
	},
}

// The first FLAT-tree element child whose resolved effective content
// categories (transparent-resolved via the Phase-2 `effectiveCategories`
// adapter — the SAME resolution `RuleContext.categories` is built from) are
// NON-EMPTY and share NOTHING with the parent's corpus-derived `permits`
// set. Transparent children are skipped: their content model IS their
// parent's (resolved at walk time), so they are permitted wherever their
// resolved content is — the `transparent` family owns their side-channel.
// A child with EMPTY effective categories (a structural element — `td`/`li`/
// `dd`/`summary`/… all carry `categories: []`) is likewise skipped: its
// placement is governed by the `structure` family's `parent-restricted` /
// `edge-child` / `single-first-child` constraints — the disjoint boundary
// that keeps `<div><td>` a single `structure/parent-restricted` finding.
function firstMiscategorizedChild(
	element: Element,
	permits: readonly ContentCategory[],
): Element | null {
	if (permits.length === 0) return null
	for (const child of flatChildren(element)) {
		if (isTransparent(childTag(child))) continue
		const categories = effectiveCategories(child)
		if (categories.length === 0) continue
		if (!categories.some((category) => permits.includes(category))) return child
	}
	return null
}

// Engages ONLY for a bare-category parent (`entry.permits` non-empty). The
// corpus guarantees such a parent has no `childModel` (its **Content model**
// box is a bare "Flow/Phrasing content.", never an ordered model) — the
// disjointness is parity-GUARDED (w3c.test.ts: no entry carries both
// `permits` and `childModel`), so this never overlaps `context/parent-model`
// or `content/required` (those fire on `childModel`). One finding per
// violation, structurally.
const permitsCategoryChildren = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		subject.entry !== null && (subject.entry.permits ?? []).length > 0,
)

const contentCategoryRule: RuleInterface = {
	id: 'content/category',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!permitsCategoryChildren(subject)) return null
		const entry = subject.entry
		if (entry === null) return null
		const permits = entry.permits ?? []
		const offender = firstMiscategorizedChild(element, permits)
		if (offender === null) return null
		const offenderTag = childTag(offender)
		return buildFinding({
			rule: 'content/category',
			severity: 'error',
			element: offender,
			cite: citeOf(entry, 'dom#content-models'),
			message: `<${offenderTag}> is not allowed as a child of <${subject.tag}> — the parent only permits ${permits.join(' / ')} content.`,
			expected: `${permits.join(' / ')} content`,
			actual: `<${offenderTag}> (${effectiveCategories(offender).join(', ') || 'no content category'})`,
		})
	},
}

// ============================================================================
//  Family: transparent — the transparent-content-model side-channel.
//
//  Driven entirely by the Phase-2 `RuleContext.restrictions` flags the
//  Walker accumulated over ancestors (`a` ⇒ no interactive / no `a` / no
//  `tabindex` descendant; media ⇒ no nested `audio`/`video`). A node trips a
//  restriction when an ancestor set the flag AND the node is the forbidden
//  kind. The composition is a NAMED guard over the restriction + the node's
//  effective categories / tag / attributes — not a hand-rolled ancestor
//  walk (that lives in the Walker).
//
//  Cite: the corpus single source of truth for a transparent restriction is
//  the RESTRICTING ANCESTOR's card (the `<a>` card literally states "no
//  interactive content descendant, no `a` descendant, no `tabindex`
//  descendant"; a media card states "no media element descendants") — NOT
//  the offender's card and NOT a hoisted module string const (§4.6/§5).
//  `restrictingCite` resolves it through the SAME `citeOf(...)` path every
//  other family uses, off the nearest ancestor whose schema entry carries
//  the constraint that imposes the tripped restriction (schema-data-driven),
//  with the §3.2.5.1 anchor as the inline fallback for a detached chain.
// ============================================================================

// The schema constraint kind (or media `forbidden`) that, carried on an
// ANCESTOR's entry, imposes each transparent restriction. Derived from the
// parity-gated registry, so it stays in lock-step with the cards.
function imposesRestriction(entry: ContentModelEntry, restriction: string): boolean {
	if (restriction === 'media') {
		return entry.forbidden.includes('audio') || entry.forbidden.includes('video')
	}
	if (restriction === 'link') {
		// "no `a` element descendant" is uniquely the transparent-model
		// element's self-nest ban (`<a>`); `no-self-nest` alone is shared by
		// non-transparent `dfn`/`form`/`progress`/`meter`, so gate on the
		// transparent model too — the corpus marks only `a` both transparent
		// AND self-nest-banned, so this resolves to the `<a>` card.
		return entry.transparent && entry.constraints.some((c) => c.kind === 'no-self-nest')
	}
	const kind = restriction === 'tabindex' ? 'no-tabindex-descendant' : 'no-interactive-descendant'
	return entry.constraints.some((constraint) => constraint.kind === kind)
}

// The corpus anchor for a tripped transparent restriction: the nearest
// ancestor whose schema entry imposes it (its card is the source of truth),
// resolved via the shared `citeOf` path; the §3.2.5.1 transparent anchor is
// the inline fallback (no module const) when no carded ancestor is found.
function restrictingCite(subject: RuleSubject, restriction: string): string {
	for (const ancestor of subject.context.parents) {
		const entry = describeElement(ancestor.tagName.toLowerCase())
		if (entry !== null && imposesRestriction(entry, restriction)) {
			return citeOf(entry, 'dom#transparent-content-models')
		}
	}
	return 'dom#transparent-content-models'
}

const isInteractiveNode = whereOf(isSubject, (subject: RuleSubject): boolean =>
	subject.context.categories.includes('interactive'),
)

const isLinkNode = whereOf(isSubject, (subject: RuleSubject): boolean =>
	matchesTag(subject.element, 'a'),
)

const isTabindexNode = whereOf(isSubject, (subject: RuleSubject): boolean =>
	subject.element.hasAttribute('tabindex'),
)

const isNestedMediaNode = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		matchesTag(subject.element, 'audio') || matchesTag(subject.element, 'video'),
)

// Each transparent restriction = "ancestor forbids it" AND "node is it".
const tripsInteractive = andOf(
	whereOf(isSubject, (s: RuleSubject) => s.context.restrictions.interactive),
	// `a` already covered by the link rule; here it is the broader
	// interactive-content prohibition (button/input/select/… under `a`).
	andOf(isInteractiveNode, notOf(isLinkNode)),
)
const tripsLink = andOf(
	whereOf(isSubject, (s: RuleSubject) => s.context.restrictions.link),
	isLinkNode,
)
const tripsTabindex = andOf(
	whereOf(isSubject, (s: RuleSubject) => s.context.restrictions.tabindex),
	isTabindexNode,
)
const tripsMedia = andOf(
	whereOf(isSubject, (s: RuleSubject) => s.context.restrictions.media),
	isNestedMediaNode,
)

const transparentInteractiveRule: RuleInterface = {
	id: 'transparent/interactive-descendant',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!tripsInteractive(subject)) return null
		return buildFinding({
			rule: 'transparent/interactive-descendant',
			severity: 'error',
			element,
			cite: restrictingCite(subject, 'interactive'),
			message: `interactive <${subject.tag}> is not allowed inside an element that forbids interactive descendants (e.g. an ancestor <a> / <button>).`,
		})
	},
}

const transparentLinkRule: RuleInterface = {
	id: 'transparent/link-descendant',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!tripsLink(subject)) return null
		return buildFinding({
			rule: 'transparent/link-descendant',
			severity: 'error',
			element,
			cite: restrictingCite(subject, 'link'),
			message: `<a> must not have an <a> ancestor (no nested links).`,
		})
	},
}

const transparentTabindexRule: RuleInterface = {
	id: 'transparent/tabindex-descendant',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!tripsTabindex(subject)) return null
		return buildFinding({
			rule: 'transparent/tabindex-descendant',
			severity: 'error',
			element,
			cite: restrictingCite(subject, 'tabindex'),
			message: `a [tabindex] descendant is not allowed inside an element that forbids it (e.g. an ancestor <a> / <button>).`,
		})
	},
}

const transparentMediaRule: RuleInterface = {
	id: 'transparent/nested-media',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!tripsMedia(subject)) return null
		return buildFinding({
			rule: 'transparent/nested-media',
			severity: 'error',
			element,
			cite: restrictingCite(subject, 'media'),
			message: `<${subject.tag}> must not be nested inside another media element (<audio> / <video>).`,
		})
	},
}

// ============================================================================
//  Family: structure — the discrete named `entry.constraints`, per `kind`.
//
//  GENERIC per `ContentConstraintKind` — one evaluator per kind, driven by
//  the constraint DATA on the element's entry (and, for the "is this the
//  required first/edge child of its parent" direction, the constraint on the
//  CHILD's entry naming its `parents`). Plus `void-has-children`: an element
//  `isVoid()` per schema must have no element children. Cite: the schema
//  entry's `cite` / the constraint's `note` carries the spec clause.
//
//  The pure-ordering kinds (`child-order` / `group-order`) are GONE — the
//  ordered child model lives once in `entry.childModel`, consumed solely by
//  the content/context families, so there is no `structure/child-order` rule
//  to double-report alongside `content/required` (§1/§2 root cause removed).
// ============================================================================

// Does any flat-tree ANCESTOR of `element` carry one of `parents` as its
// tag? Walks the SAME flat parent chain `readSubject` resolves "the parent"
// from (`flatParent` — slot conduits collapsed, shadow host as parent), so a
// descendant check never diverges from the walk spine (§3 — never light-tree
// `closest`/`parentElement`). Bounded by the finite flat-tree depth.
function hasFlatAncestorTag(element: Element, parents: readonly string[]): boolean {
	let current = flatParent(element)
	while (current !== null) {
		if (parents.includes(current.tagName.toLowerCase())) return true
		current = flatParent(current)
	}
	return false
}

// `parent-restricted` — the element is only valid inside one of `parents`.
// The corpus distinguishes two spec readings, encoded as the constraint's
// `relation` datum (parity-gated, populated on every `parent-restricted`
// constraint from the card's **Contexts** prose):
//   - `'child'` (the ~13 "as a child of" / "inside an X element"
//     constraints, AND the absent default): the element must be a DIRECT
//     flat-tree child of one of `parents` (the deliberate `<div><td>`
//     detection — strict direct-parent, unchanged).
//   - `'descendant'` (the 2 "as a descendant of" constraints — `option` /
//     `optgroup` → select/optgroup/datalist): the element need only have
//     one of `parents` as a flat-tree ANCESTOR; spec-permitted generic
//     wrappers (`<div>`/`<noscript>`) may sit between (the C4 fix —
//     `<select><div><option>` is valid HTML).
const violatesParentRestricted = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const constraint = constraintOf(subject.entry, 'parent-restricted')
	if (constraint?.parents === undefined) return false
	if (constraint.relation === 'descendant') {
		return !hasFlatAncestorTag(subject.element, constraint.parents)
	}
	const parentTag = subject.parent?.tagName.toLowerCase() ?? null
	return parentTag === null || !constraint.parents.includes(parentTag)
})

const structureParentRestrictedRule: RuleInterface = {
	id: 'structure/parent-restricted',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesParentRestricted(subject)) return null
		const constraint = constraintOf(subject.entry, 'parent-restricted')
		const parents = constraint?.parents ?? []
		// `expected`/`actual` mirror the constraint's child-vs-descendant
		// `relation` so the Finding restates the SAME spec reading the rule
		// enforced (a `descendant` violation is "no … ancestor", not "child
		// of <wrong-parent>"). `note` is still the verbatim corpus clause.
		const relationWord = constraint?.relation === 'descendant' ? 'descendant' : 'child'
		return buildFinding({
			rule: 'structure/parent-restricted',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message:
				constraint?.note ?? `<${subject.tag}> must be a ${relationWord} of ${parents.join(' / ')}.`,
			expected: `${relationWord} of ${parents.join(' / ')}`,
			actual:
				relationWord === 'descendant'
					? `no ${parents.join(' / ')} ancestor`
					: subject.parent === null
						? '(no parent)'
						: `child of <${subject.parent.tagName.toLowerCase()}>`,
		})
	},
}

// `single-first-child` — the element must be the unique FIRST element child
// of one of its constraint's `parents` (the CHILD-keyed placement rule:
// `summary`→`details`, `legend`→`fieldset`, `caption`→`table`).
//
// SINGLE SOURCE / one-finding-per-violation (§1/§2): when the parent's
// `childModel` makes this child a REQUIRED leading segment (e.g.
// `summary`(1) in `details`), an out-of-place/missing child already makes
// the whole model unsatisfied, so `content/required` (parent-keyed) is the
// sole reporter and this child-keyed rule DEFERS (no content↔structure
// double-report — the §1 case). When the child is only OPTIONAL in the
// model (e.g. `legend`(?) in `fieldset`, `caption`(?) in `table`), the
// permissive prefix model CANNOT see a late occurrence, so this rule is the
// sole reporter and must NOT defer — disjoint by what each can structurally
// detect, exactly one rule per violation.
const violatesSingleFirstChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const own = constraintOf(subject.entry, 'single-first-child')
	if (own?.parents === undefined) return false
	// No parent ⇒ the constraint is not applicable (an explicit
	// not-applicable, not a misleading "treat self as parent" fallback, #8).
	if (subject.parent === null) return false
	if (!own.parents.includes(subject.parent.tagName.toLowerCase())) return false
	// Defer ONLY when the parent's childModel REQUIRES this child as its
	// mandatory leading segment (then content/required is the single
	// source); an optional-leading child stays this rule's concern.
	const parentModel = subject.parentEntry?.childModel
	if (parentModel !== undefined && modelRequiresLeading(parentModel, subject.tag)) return false
	const siblings = flatChildren(subject.parent)
	const occurrences = siblings.filter((s) => childTag(s) === subject.tag)
	return occurrences.length > 1 || siblings[0] !== subject.element
})

const structureSingleFirstChildRule: RuleInterface = {
	id: 'structure/single-first-child',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesSingleFirstChild(subject)) return null
		const note = constraintOf(subject.entry, 'single-first-child')?.note
		return buildFinding({
			rule: 'structure/single-first-child',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: note ?? `<${subject.tag}> must be the single first child of its parent.`,
		})
	},
}

// `edge-child` — the element must be the first / last / first-or-last child
// of one of `parents`. This is the SOLE reporter of the figcaption-edge
// position: `figure`'s `childModel` is a permissive `closed:false` flow
// model (its open flow arm legitimately absorbs arbitrary content around an
// optional figcaption), so `content/required` cannot decide "figcaption in
// the MIDDLE" — only this child-keyed edge rule can. No double-report: the
// two are disjoint by what each can structurally see (the model's flow arm
// vs. the child's edge position), not by a per-rule special-case.
const violatesEdgeChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const constraint = constraintOf(subject.entry, 'edge-child')
	if (constraint?.parents === undefined) return false
	const parent = subject.parent
	if (parent === null || !constraint.parents.includes(parent.tagName.toLowerCase())) return false
	const siblings = flatChildren(parent)
	const first = siblings[0] === subject.element
	const last = siblings[siblings.length - 1] === subject.element
	if (constraint.edge === 'first') return !first
	if (constraint.edge === 'last') return !last
	return !(first || last)
})

const structureEdgeChildRule: RuleInterface = {
	id: 'structure/edge-child',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesEdgeChild(subject)) return null
		const constraint = constraintOf(subject.entry, 'edge-child')
		return buildFinding({
			rule: 'structure/edge-child',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message:
				constraint?.note ??
				`<${subject.tag}> must be the ${constraint?.edge ?? 'first-or-last'} child of its parent.`,
		})
	},
}

// `no-self-nest` — no flat-tree descendant of the element's own tag (flat
// traversal so it agrees with the Walker spine, §3 — never a raw
// `querySelector` over the light tree).
const violatesNoSelfNest = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (constraintOf(subject.entry, 'no-self-nest') === null) return false
	for (const descendant of flatDescendants(subject.element)) {
		if (childTag(descendant) === subject.tag) return true
	}
	return false
})

const structureNoSelfNestRule: RuleInterface = {
	id: 'structure/no-self-nest',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesNoSelfNest(subject)) return null
		const constraint = constraintOf(subject.entry, 'no-self-nest')
		return buildFinding({
			rule: 'structure/no-self-nest',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message:
				constraint?.note ?? `<${subject.tag}> must not contain a <${subject.tag}> descendant.`,
		})
	},
}

// `no-interactive-descendant` / `no-tabindex-descendant` on an entry are the
// schema mirror of the transparent restrictions the Walker accumulates; the
// transparent family already reports them via `RuleContext.restrictions`, so
// the structure family does NOT re-evaluate those two kinds (one finding per
// violation — no double report).

// `void-has-children` — an element the schema marks `void` must have no
// flat-tree element children (not encoded as a `ContentConstraint`, derived
// from `isVoid`; flat read so a slotted/shadow child still counts, §3).
const violatesVoidHasChildren = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (!isVoid(subject.tag)) return false
	return flatChildren(subject.element).length > 0
})

const structureVoidRule: RuleInterface = {
	id: 'structure/void-has-children',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesVoidHasChildren(subject)) return null
		const count = flatChildren(element).length
		return buildFinding({
			rule: 'structure/void-has-children',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: `<${subject.tag}> is a void element and must have no children.`,
			expected: 'no children',
			actual: `${count} element child(ren)`,
		})
	},
}

// ============================================================================
//  Family: attribute — coupling + parser-coerced attribute-value rules.
//
//  GENERIC & schema-data-driven: the per-element rules iterate the Phase-1
//  `entry.attributes` (`AttributeRule` — `{attribute, requires?, values?,
//  required?, note?}`) DATA, never an `if (tag==='a')` branch. Predicates are
//  named `@elements/core` validator/parser compositions; every attribute
//  VALUE check coerces through the inspector's HTML-attribute coercion layer
//  (`helpers.ts` `coerceEnumAttribute` / `coerceIntegerAttribute` composing
//  the `@elements/core` `parseEnum` / `parseInteger`; child text via
//  `parseString`) — coerce-or-`undefined`, HTML-faithful (enumerated values
//  ASCII case-insensitive, integers `-?[0-9]+`), never a hand-rolled
//  `parseInt`/regex/`Number()` on an attribute. The corpus is the source of
//  truth: each rule fires only on a card-stated constraint and every
//  `Finding.cite` resolves to the offending element's own schema-entry anchor.
//
//  Concerns (one finding per violation, disjoint from context/content/
//  transparent/structure — those families never read attributes):
//    1. coupling          an `AttributeRule.requires` sibling is absent
//                          (`a`/`area` target/download/ping/rel/hreflang/type/
//                          referrerpolicy ⇒ href) — links.html.
//    2. required          an `AttributeRule.required` attribute is absent
//                          (`bdo` ⇒ dir, `data` ⇒ value, `map` ⇒ name).
//    3. value             an `AttributeRule.values` (closed domain) attribute
//                          is present but `coerceEnumAttribute` rejects it
//                          (ASCII case-insensitive — `bdo` dir ∈
//                          {ltr,rtl}; `th` scope ∈ {row,col,rowgroup,
//                          colgroup}; `dialog` closedby ∈ {any,closerequest,
//                          none}).
//    4. coupling-domain   the corpus DOM-relationship rules a tree-walker can
//                          decide, recognized from a `note`-bearing
//                          `AttributeRule` the rule knows (the established
//                          Phase-1 note-only precedent — `time`/`datetime`,
//                          `dialog`/`tabindex`, `img`/`ismap`): `time` w/o
//                          `datetime` ⇒ non-empty child text; `img[ismap]` ⇒
//                          a flat-tree ancestor `a[href]`; `colgroup[span]` ⇒
//                          no `col` flat children; `dialog[tabindex]` ⇒ must
//                          not be specified.
//    5. integer/range     the corpus integer attributes: `tabindex` (any
//                          element — a valid integer; interactions.md §6.6.3);
//                          `colgroup`/`col` `span` ∈ [1,1000];
//                          `td`/`th` `colspan` ∈ [1,1000], `rowspan` ∈
//                          [0,65534] (tables.html bounds). Coerced via
//                          `coerceIntegerAttribute` (HTML valid-integer
//                          grammar, then `parseInteger`), then the bound.
//    6. enum (global)     the global enumerated attributes whose closed
//                          domain the corpus cards STATE: `dir` ∈
//                          {ltr,rtl,auto}, `contenteditable` ∈ {true,'',false,
//                          plaintext-only}, `inputmode` ∈ {none,text,tel,url,
//                          email,numeric,decimal,search} (interactions.md
//                          §6.8.1/§6.8.9). `loading`/`crossorigin` are NOT
//                          encoded — the corpus prose states only "limited to
//                          only known values", never the keyword set, so
//                          encoding a domain would invent one.
// ============================================================================

// The element's flat-tree ancestor chain carries an `a` with a non-empty
// `href` — the `img[ismap]` corpus check, over the SAME flat parent chain
// `readSubject` resolves "the parent" from (`flatParent` — slot conduits
// collapsed), never light-tree `closest`. Bounded by the finite flat depth.
function hasLinkAncestorWithHref(element: Element): boolean {
	let current = flatParent(element)
	while (current !== null) {
		if (current.tagName.toLowerCase() === 'a' && current.hasAttribute('href')) return true
		current = flatParent(current)
	}
	return false
}

// The element's child text content, trimmed via the `@elements/core`
// `parseString` parser (coerce-or-`undefined`: a whitespace-only / empty
// result is `undefined`) — never a hand-rolled `.trim()` length test. Only
// the element's OWN text nodes count (the corpus `time` datetime value is the
// element's child text content).
function childText(element: Element): string | undefined {
	let text = ''
	for (const node of element.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
	}
	return parseString(text)
}

// Find the first `AttributeRule` on an entry matching a predicate — the
// generic accessor every schema-data-driven attribute rule iterates through,
// so no rule hand-codes a per-element attribute list.
function attributeRuleWhere(
	entry: ContentModelEntry | null,
	match: (rule: AttributeRule) => boolean,
): AttributeRule | null {
	if (entry === null) return null
	for (const rule of entry.attributes) {
		if (match(rule)) return rule
	}
	return null
}

// 1. coupling — an `AttributeRule.requires` sibling attribute is absent while
// its trigger attribute is present (the spec's "if `target` is present,
// `href` must be present" couplings, all carried as schema DATA).
const violatesCoupling = whereOf(isSubject, (subject: RuleSubject): boolean =>
	subject.entry === null
		? false
		: subject.entry.attributes.some(
				(rule) =>
					rule.requires !== undefined &&
					subject.element.hasAttribute(rule.attribute) &&
					!subject.element.hasAttribute(rule.requires),
			),
)

const attributeCouplingRule: RuleInterface = {
	id: 'attribute/coupling',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesCoupling(subject)) return null
		const rule = attributeRuleWhere(
			subject.entry,
			(candidate) =>
				candidate.requires !== undefined &&
				element.hasAttribute(candidate.attribute) &&
				!element.hasAttribute(candidate.requires),
		)
		if (rule?.requires === undefined) return null
		return buildFinding({
			rule: 'attribute/coupling',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'links#attributes-common-to-ins-and-del-elements'),
			message: `<${subject.tag}> with [${rule.attribute}] must also have [${rule.requires}].`,
			expected: `[${rule.requires}] present`,
			actual: `[${rule.attribute}] without [${rule.requires}]`,
		})
	},
}

// 2. required — an `AttributeRule.required` attribute is absent (the spec's
// "the `value` attribute must be present" mandatory attributes, as DATA).
const violatesRequiredAttribute = whereOf(isSubject, (subject: RuleSubject): boolean =>
	subject.entry === null
		? false
		: subject.entry.attributes.some(
				(rule) => rule.required === true && !subject.element.hasAttribute(rule.attribute),
			),
)

const attributeRequiredRule: RuleInterface = {
	id: 'attribute/required',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesRequiredAttribute(subject)) return null
		const rule = attributeRuleWhere(
			subject.entry,
			(candidate) => candidate.required === true && !element.hasAttribute(candidate.attribute),
		)
		if (rule === null) return null
		return buildFinding({
			rule: 'attribute/required',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: rule.note ?? `<${subject.tag}> must have the [${rule.attribute}] attribute.`,
			expected: `[${rule.attribute}] present`,
			actual: `[${rule.attribute}] absent`,
		})
	},
}

// 3. value — an `AttributeRule.values` (closed domain) attribute is present
// but its value is not in the domain. The domain check coerces through the
// inspector's `coerceEnumAttribute` (ASCII-lowercase per the HTML spec — the
// corpus cards `scope`/`dir`/etc. as "Enumerated attribute", which is ASCII
// case-insensitive — then the `@elements/core` `parseEnum`) over the
// schema-carried `values` — never a hand-written membership test, and the
// SAME enumerated-value coercion `attribute/enum` uses (one source of truth).
function offendingEnumAttribute(
	entry: ContentModelEntry | null,
	element: Element,
): AttributeRule | null {
	return attributeRuleWhere(entry, (rule) => {
		if (rule.values === undefined) return false
		const raw = element.getAttribute(rule.attribute)
		if (raw === null) return false
		return coerceEnumAttribute(raw, rule.values) === undefined
	})
}

const violatesAttributeValue = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		offendingEnumAttribute(subject.entry, subject.element) !== null,
)

const attributeValueRule: RuleInterface = {
	id: 'attribute/value',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesAttributeValue(subject)) return null
		const rule = offendingEnumAttribute(subject.entry, element)
		if (rule?.values === undefined) return null
		return buildFinding({
			rule: 'attribute/value',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: `<${subject.tag}> [${rule.attribute}] must be one of: ${rule.values.join(', ')}.`,
			expected: rule.values.join(', '),
			actual: element.getAttribute(rule.attribute) ?? '(absent)',
		})
	},
}

// 4. coupling-domain — the corpus DOM-relationship rules a tree-walker can
// decide, recognized from a `note`-bearing `AttributeRule` the schema carries
// (the established Phase-1 note-only precedent). Each branch is a NAMED
// predicate keyed off the SCHEMA datum (the attribute name on the entry's
// `attributes`), so the rule stays driven by the corpus, not a tag literal.
function hasAttributeRule(entry: ContentModelEntry | null, attribute: string): boolean {
	return attributeRuleWhere(entry, (rule) => rule.attribute === attribute) !== null
}

// The four `coupling-domain` branch predicates are PLAIN `RuleSubject →
// boolean` checks (not `whereOf` guards): they are dispatched inside ONE
// rule body, so a `Guard` would negatively-narrow `subject` to `never` on
// the next branch. The rule's structural shape is already guaranteed by
// `readSubject`; these only decide WHICH corpus DOM-relationship fired. Each
// stays driven by the SCHEMA datum (`hasAttributeRule` — the note-bearing
// `AttributeRule` the entry carries), never a tag literal.

// `time` whose schema carries the `datetime` note-rule, with NO `datetime`
// attribute, must have a non-empty child text (the corpus datetime value).
function violatesTimeDatetime(subject: RuleSubject): boolean {
	if (!hasAttributeRule(subject.entry, 'datetime')) return false
	if (subject.element.hasAttribute('datetime')) return false
	return childText(subject.element) === undefined
}

// `img` whose schema carries the `ismap` note-rule, WITH `ismap` present,
// must have a flat-tree ancestor `a[href]`.
function violatesIsmap(subject: RuleSubject): boolean {
	if (!hasAttributeRule(subject.entry, 'ismap')) return false
	if (!subject.element.hasAttribute('ismap')) return false
	return !hasLinkAncestorWithHref(subject.element)
}

// `colgroup` whose schema carries the `span` note-rule, WITH `span` present,
// must have no `col` flat children ("If span is present: nothing").
function violatesColgroupSpan(subject: RuleSubject): boolean {
	if (!hasAttributeRule(subject.entry, 'span')) return false
	if (!subject.element.hasAttribute('span')) return false
	return flatChildren(subject.element).some((child) => child.tagName.toLowerCase() === 'col')
}

// `dialog` whose schema carries the `tabindex` note-rule, WITH `tabindex`
// present — the attribute must not be specified on a `dialog`.
function violatesDialogTabindex(subject: RuleSubject): boolean {
	if (!hasAttributeRule(subject.entry, 'tabindex')) return false
	return subject.element.hasAttribute('tabindex')
}

const attributeCouplingDomainRule: RuleInterface = {
	id: 'attribute/coupling-domain',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (violatesTimeDatetime(subject)) {
			const rule = attributeRuleWhere(
				subject.entry,
				(candidate) => candidate.attribute === 'datetime',
			)
			return buildFinding({
				rule: 'attribute/coupling-domain',
				severity: 'error',
				element,
				cite: citeOf(subject.entry, 'texts#the-time-element'),
				message:
					rule?.note ?? `<${subject.tag}> without [datetime] must have a valid datetime text.`,
				expected: '[datetime] present, or non-empty datetime text',
				actual: 'no [datetime] and empty text content',
			})
		}
		if (violatesIsmap(subject)) {
			const rule = attributeRuleWhere(subject.entry, (candidate) => candidate.attribute === 'ismap')
			return buildFinding({
				rule: 'attribute/coupling-domain',
				severity: 'error',
				element,
				cite: citeOf(subject.entry, 'embeddeds#the-img-element'),
				message: rule?.note ?? `<${subject.tag}>[ismap] requires an ancestor <a href>.`,
				expected: 'an ancestor <a> with [href]',
				actual: '[ismap] without an <a href> ancestor',
			})
		}
		if (violatesColgroupSpan(subject)) {
			return buildFinding({
				rule: 'attribute/coupling-domain',
				severity: 'error',
				element,
				cite: citeOf(subject.entry, 'tables#the-colgroup-element'),
				message: `<${subject.tag}> with [span] must have no <col> children.`,
				expected: 'no <col> children when [span] is present',
				actual: '[span] present with <col> children',
			})
		}
		if (violatesDialogTabindex(subject)) {
			const rule = attributeRuleWhere(
				subject.entry,
				(candidate) => candidate.attribute === 'tabindex',
			)
			return buildFinding({
				rule: 'attribute/coupling-domain',
				severity: 'error',
				element,
				cite: citeOf(subject.entry, 'interactives#the-dialog-element'),
				message:
					rule?.note ?? `the [tabindex] attribute must not be specified on <${subject.tag}>.`,
				expected: 'no [tabindex] on <dialog>',
				actual: '[tabindex] specified',
			})
		}
		return null
	},
}

// 5. integer / range — the corpus integer attributes. `tabindex` is GLOBAL
// (any element; interactions.md §6.6.3 "a valid integer"); the bounded ones
// carry their corpus bound. Coerced via the inspector's
// `coerceIntegerAttribute` (gates the HTML *valid integer* grammar `-?[0-9]+`
// — no hex/exponent/leading-`+`/whitespace, which `Number(...)` would wrongly
// accept — then composes the `@elements/core` `parseInteger`), then the
// corpus bound — never a hand-rolled `parseInt`. The bound DATA is the
// corpus-bound `ATTRIBUTE_INTEGER_BOUNDS` constant (constants.ts — the §5
// module-data home; bidirectionally bound to the cards by w3c.test.ts), NOT
// per-element schema `values` (the `AttributeRule` shape has no range field
// and `tabindex` is a GLOBAL attribute with no owning entry). Cites the
// offending element's own entry (its anchor is where the rule fired).
function offendingIntegerBound(element: Element, tag: string): AttributeIntegerBound | null {
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

const violatesIntegerBound = whereOf(
	isSubject,
	(subject: RuleSubject): boolean => offendingIntegerBound(subject.element, subject.tag) !== null,
)

function describeBound(bound: AttributeIntegerBound): string {
	if (bound.min !== undefined && bound.max !== undefined) {
		return `an integer in [${bound.min}, ${bound.max}]`
	}
	return 'a valid integer'
}

const attributeIntegerRule: RuleInterface = {
	id: 'attribute/integer',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesIntegerBound(subject)) return null
		const bound = offendingIntegerBound(element, subject.tag)
		if (bound === null) return null
		return buildFinding({
			rule: 'attribute/integer',
			severity: 'error',
			element,
			// The bound's OWN corpus anchor is its single source of truth
			// (interactions.md / tables.md) — not the element's content-model
			// card; the constant carries the resolvable cite, parity-bound.
			cite: bound.cite,
			message: `<${subject.tag}> [${bound.attribute}] must be ${describeBound(bound)}.`,
			expected: describeBound(bound),
			actual: element.getAttribute(bound.attribute) ?? '(absent)',
		})
	},
}

// 6. enum (global) — the global enumerated attributes whose closed keyword
// domain the corpus cards STATE. Coerced via the inspector's
// `coerceEnumAttribute` (ASCII-lowercase per the HTML spec, then the
// `@elements/core` `parseEnum`) — the SAME enumerated-value coercion
// `attribute/value` uses (one source of truth: an HTML enumerated value is
// matched ASCII case-insensitively in exactly ONE place) — over the
// corpus-bound `ATTRIBUTE_ENUM_DOMAINS` constant (constants.ts —
// bidirectionally bound to the cards by w3c.test.ts).
// `contenteditable`'s empty-string value IS its valid `true` state per the
// card ("`true` (or the empty string)"), so an empty raw value is faithful,
// not a violation — only a non-empty out-of-domain value fires.
// `loading`/`crossorigin` are deliberately ABSENT (the corpus never cards
// their keyword set, only "limited to only known values" — encoding a domain
// would invent one).
//
// DISJOINT SINGLE SOURCE (one finding per violation): when the element's OWN
// schema entry already carries an `AttributeRule.values` (a closed domain) on
// the same attribute, `attribute/value` is the sole reporter and this global
// rule DEFERS — the element-specific schema domain is authoritative (it is
// the spec's NARROWER per-element set, e.g. `bdo` `dir∈{ltr,rtl}` ⊂ the
// global `dir∈{ltr,rtl,auto}`; double-reporting `<bdo dir=sideways>` as both
// `attribute/value` + `attribute/enum` would violate one-finding-per-
// violation). The two value-domain rules are thus disjoint by construction:
// `attribute/value` owns every schema-`values`-constrained attribute,
// `attribute/enum` owns the GLOBAL attributes no element entry constrains.
function schemaConstrainsValues(entry: ContentModelEntry | null, attribute: string): boolean {
	return (
		attributeRuleWhere(
			entry,
			(rule) => rule.attribute === attribute && rule.values !== undefined,
		) !== null
	)
}

function offendingEnumDomain(
	element: Element,
	entry: ContentModelEntry | null,
): AttributeEnumDomain | null {
	for (const domain of ATTRIBUTE_ENUM_DOMAINS) {
		if (schemaConstrainsValues(entry, domain.attribute)) continue
		const raw = element.getAttribute(domain.attribute)
		if (raw === null) continue
		if (domain.empty === true && raw === '') continue
		if (coerceEnumAttribute(raw, domain.values) === undefined) return domain
	}
	return null
}

const violatesEnumDomain = whereOf(
	isSubject,
	(subject: RuleSubject): boolean => offendingEnumDomain(subject.element, subject.entry) !== null,
)

const attributeEnumRule: RuleInterface = {
	id: 'attribute/enum',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesEnumDomain(subject)) return null
		const domain = offendingEnumDomain(element, subject.entry)
		if (domain === null) return null
		return buildFinding({
			rule: 'attribute/enum',
			severity: 'error',
			element,
			// The domain's OWN corpus anchor (interactions.md / renderings.md)
			// is its source of truth — parity-bound by w3c.test.ts.
			cite: domain.cite,
			message: `<${subject.tag}> [${domain.attribute}] must be one of: ${domain.values.join(', ')}.`,
			expected: domain.values.join(', '),
			actual: element.getAttribute(domain.attribute) ?? '(absent)',
		})
	},
}

// ============================================================================
//  Family: interaction — hidden reference integrity (Phase 3.3).
//
//  One corpus-stated reference-integrity rule a tree-walker can decide,
//  GENERIC over the corpus-carded reference associations (NOT a per-element
//  branch). The associations are the corpus's own list, resolved as DATA:
//    - the hyperlink `a[href="#id"]` (interactions.md §6.1: "it would be
//      incorrect to use the `href` attribute to link to a section marked
//      with the `hidden` attribute");
//    - the `for` IDREF carried as a SCHEMA `AttributeRule` on `label` /
//      `output` (interactions.md §6.1: "The `for` attributes of `label` and
//      `output` elements …") — read via the SAME `hasAttributeRule` schema
//      accessor the attribute family uses, so the family stays schema-data-
//      driven, never an `if (tag==='label')`.
//  `aria-*` IDREFs are DELIBERATELY NOT a reference kind here: the corpus
//  never cards an `aria-*` IDREF domain (the only `aria-*` it mentions is
//  `aria-describedby`, and only to EXEMPT it from the hidden rule —
//  interactions.md §6.1). Encoding an `aria-*` domain would invent one — the
//  exact faithfulness line the Phase-3.2 `loading`/`crossorigin` omission
//  drew ("the corpus never cards the keyword set, so encoding a domain would
//  invent one"). The corpus is the source of truth; no invented ARIA rule.
//
//  Reference resolution composes `@elements/browser` `traversals`
//  (`getElementById` for the IDREF / `#id`-fragment lookup), NOT a bespoke
//  DOM walk; the hidden SUBTREE test walks the SAME flat parent chain
//  (`flatParent`) the structure family's `hasFlatAncestorTag` uses (§3 —
//  never light-tree `closest`).
//
//  NO INERT REFERENCE RULE: an "inert reference integrity" rule was
//  deliberately NOT encoded. The WHATWG spec (interactions.md §6.3 / §6.3.1
//  / §6.3.2) states only what inertness DOES and HOW a node becomes inert;
//  it states no inert reference-integrity conformance rule. Its only
//  near-prose (§6.3 "an inert subtree should not contain content or
//  controls which are critical to understanding…") is explicitly
//  non-normative AND not tree-walker-decidable. Encoding a rule citing
//  `interactions#inert-subtrees` would therefore restate a rule the section
//  does not state — the exact invent-a-rule line the omitted-ARIA-domain
//  rationale above draws. The corpus is the source of truth; no invented
//  inert rule (spec wins; the ROADMAP rule-list text was corrected to
//  match).
//
//  DISJOINTNESS (one finding per violation):
//    - `dialog[tabindex]` is OWNED by the Phase-3.2 attribute family
//      (`attribute/coupling-domain` `violatesDialogTabindex`, citing
//      interactives#the-dialog-element). The ROADMAP lists "dialog must not
//      carry tabindex" under interaction, but it is ALREADY fully covered
//      there (verified: interactives.md:552 "The `tabindex` attribute must
//      not be specified on `dialog` elements." — the card carries the
//      `tabindex` note `AttributeRule`, the rule fires on its presence). The
//      interaction family therefore does NOT re-implement it — a bare
//      `<dialog tabindex>` stays EXACTLY ONE `attribute/coupling-domain`
//      finding, never double-reported (the `interaction.test.ts` registry
//      assertion + the structure-lens guard below pin this boundary).
// ============================================================================

// A referencing element points at a target by one of the corpus-carded
// associations. `a[href="#id"]` is a same-document fragment; `label[for]` /
// `output[for]` are plain IDREFs carried as a schema `AttributeRule` (so the
// recognition is schema-data-driven, never a tag literal). Returns the raw
// referenced id, or `null` when the element is not a corpus referrer / the
// reference is not a same-document id.
function referencedId(subject: RuleSubject): string | null {
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

// Resolve a corpus referrer's same-document target through `traversals`
// `getElementById` over the referring element's own document (faithful IDREF
// resolution — never a bespoke `querySelector`); `null` when unresolved.
function referencedTarget(subject: RuleSubject): Element | null {
	const id = referencedId(subject)
	if (id === null) return null
	return getElementById(id, subject.element.ownerDocument)
}

// An element is in the Hidden state, or inside a `[hidden]` subtree — the
// corpus §6.1 "hidden" state, decided over the SAME flat parent chain the
// structure family walks (§3 — never light-tree `closest`). `hidden` is an
// enumerated attribute; `hidden=until-found` is treated as hidden here, a
// DELIBERATE conservative reading: the corpus (interactions.md §6.1) does
// not explicitly exempt the `until-found` state for the `href="#id"`
// fragment-reveal case, so presence alone is the test. Treating it as
// hidden cannot under-report a genuine §6.1 violation; carving out an
// until-found exemption would be an unauthorized corpus-judgment change
// (the spec does not state one). Accepted conservative reading.
function isHiddenNode(element: Element): boolean {
	let current: Element | null = element
	while (current !== null) {
		if (current.hasAttribute('hidden')) return true
		current = flatParent(current)
	}
	return false
}

// The referrer is "active" for the corpus rule iff it is NOT itself in the
// state it must not reference into: the §6.1 rule scopes to referrers "that
// are not themselves hidden" (a hidden referrer legitimately co-locates
// with a hidden target).
const violatesHiddenReference = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (isHiddenNode(subject.element)) return false
	const target = referencedTarget(subject)
	return target !== null && isHiddenNode(target)
})

const interactionHiddenReferenceRule: RuleInterface = {
	id: 'interaction/hidden-reference',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesHiddenReference(subject)) return null
		return buildFinding({
			rule: 'interaction/hidden-reference',
			severity: 'error',
			element,
			// The corpus single source of truth for this rule is the
			// `hidden` chapter section (interactions.md §6.1) — the chapter
			// cite resolves through the SAME `citeResolves` path the
			// Phase-3.2 chapter-cited constants use.
			cite: 'interactions#the-hidden-attribute',
			message: `a non-hidden <${subject.tag}> must not reference the [hidden] element it points at (user confusion).`,
			expected: 'a non-hidden referenced target',
			actual: 'references a [hidden] target',
		})
	},
}

// ── Registry ────────────────────────────────────────────────────────────────
//
// The frozen, ordered rule registry every Phase-3 family contributes to and
// Phase-4 (`Inspector` / `FindingManager`) consumes unchanged. Each family
// guard above is a named `@elements/core` composition (`whereOf` / `andOf` /
// `notOf` / `literalOf`), with the attribute-value rules composing the
// inspector's `coerceEnumAttribute` / `coerceIntegerAttribute` over the core
// `parseEnum` / `parseInteger` parsers; the part-3 interaction family extends
// this same array with the same vocabulary (reference resolution via
// `@elements/browser` `traversals` `getElementById`).

/**
 * The frozen inspector rule registry — the Phase-3 part-1 families
 * (`context` / `content` / `transparent` / `structure`), the part-2
 * `attribute` family (coupling + parser-coerced value rules), and the part-3
 * `interaction` family (hidden reference integrity), each a generic
 * corpus-data-driven {@link RuleInterface}. Pure: every `evaluate` is
 * side-effect-free and total (one {@link Finding} or `null`). Phase 4
 * iterates it; Phase 3 is now COMPLETE.
 *
 * @example
 * ```ts
 * import { Walker, rules } from '@elements/browser'
 *
 * const walker = new Walker(document.body)
 * for (const element of walker.walk()) {
 *   const context = walker.context(element)
 *   for (const rule of rules) {
 *     const finding = rule.evaluate(element, context)
 *     if (finding !== null) report(finding)
 *   }
 * }
 * ```
 */
export const rules: readonly RuleInterface[] = [
	// context
	contextRule,
	// content
	contentRequiredRule,
	contentForbiddenRule,
	contentCategoryRule,
	// transparent
	transparentInteractiveRule,
	transparentLinkRule,
	transparentTabindexRule,
	transparentMediaRule,
	// structure
	structureParentRestrictedRule,
	structureSingleFirstChildRule,
	structureEdgeChildRule,
	structureNoSelfNestRule,
	structureVoidRule,
	// attribute (Phase 3.2)
	attributeCouplingRule,
	attributeRequiredRule,
	attributeValueRule,
	attributeCouplingDomainRule,
	attributeIntegerRule,
	attributeEnumRule,
	// interaction (Phase 3.3)
	interactionHiddenReferenceRule,
] as const
