import type {
	AttributeIntegerBound,
	ChildModel,
	ContentModelEntry,
	Finding,
	PresentationDefault,
	RuleContext,
	RuleInterface,
	RuleSubject,
} from '../types.js'
import { andOf, notOf, whereOf } from '@elements/core'
import {
	buildFinding,
	citeOf,
	coerceEnumAttribute,
	coerceIntegerAttribute,
	constraintOf,
	countLeadingTag,
	effectiveCategories,
	findAttributeRule,
	findFlatDescendant,
	findForbiddenDescendant,
	findMiscategorizedChild,
	findOffendingEnumAttribute,
	findOffendingEnumDomain,
	findOffendingIntegerBound,
	flatChildren,
	flatParent,
	hasAttributeRule,
	hasFlatAncestorTag,
	hasLinkAncestorWithHref,
	isHiddenNode,
	isPopoverOpen,
	matchesTag,
	readChildText,
	readHiddenState,
	readInlineStyle,
	readRoleTokens,
	readStyleValue,
	requiresLeadingTag,
	resolveLeadingSingularTag,
	resolvePermittedTags,
	resolveReferencedTarget,
	satisfiesChildModel,
	tagOf,
} from '../helpers.js'
import { FOCUSABLE_TAGS, LIST_CONTAINER_TAGS, PRESENTATION_DEFAULTS } from '../constants.js'
import { describeElement, isKnownElement, isVoid } from '../schema.js'

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
//      prefix) is not satisfied (incl. a CLOSED model's duplicate, via
//      closed-exhaustiveness).
//    - content/cardinality  — fires on the PARENT when a PREFIX
//      (`closed:false`) model's required-leading SINGULAR child (a leading
//      `{tag,'1'|'?'}` segment) occurs MORE THAN ONCE — the duplicate the
//      open trailing arm would otherwise absorb silently. Defers to
//      content/required (so a closed model's duplicate is single-sourced
//      there). `structure/single-first-child` defers the cardinality aspect
//      to it (its lone-mispositioned-child POSITION concern stays its own).
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

// ── Shared predicates / finding builder ─────────────────────────────────────
//
// The generic building blocks — `isContentCategory` guards,
// `matchesTagCategory` / `matchesForbiddenToken`, `constraintOf`,
// `buildFinding`, `citeOf` — live in the centralized `helpers.ts` (the
// `{verb}{Noun}` rule-engine-helper section). This registry composes them;
// it does not own them (AGENTS §4.6/§5).

// ── Child-model engine ──────────────────────────────────────────────────────
//
// The ONE consumer of `entry.childModel` (types.ts `ChildModel` /
// `ChildSegment`) — generic over EVERY ordered/prefix/group/choice model in
// the registry. The engine itself (`tagOf` / `matchesChildCategory` /
// `hasOpenCategoryArm` / `collectSegmentTags` / `resolvePermittedTags` /
// `satisfiesCount` / `matchSegments` / `satisfiesChildModel` /
// `requiresLeadingTag` / `resolveLeadingSingularTag` / `countLeadingTag`)
// is centralized in `helpers.ts`; this registry composes it. Two pure
// answers per parent: `resolvePermittedTags(model)` (the closed set the
// model can EVER admit, or `null` for an open `category` arm — read by
// `context/parent-model`) and `matchSegments(...)` (does the ordered child
// run satisfy the segment list — read by `content/required`). They never
// overlap (membership-miss vs. order-miss).

// Human-readable expectation, derived from the model's verbatim prose
// (`note`) — the corpus is the single source of the message wording.
function describeModel(model: ChildModel): string {
	return model.note
}

// ── Cardinality / sequence reporting helpers (kept for the message body) ────

function childrenSummary(children: readonly Element[]): string {
	return children.map((c) => `<${tagOf(c)}>`).join(', ') || '(no element children)'
}

// ============================================================================
//  Family: context — child tag the parent's ordered model can never admit.
//
//  Schema-driven: the parent entry's `childModel` IS its constrained child
//  list. If the parent carries a `childModel` whose `resolvePermittedTags`
//  is a CLOSED set (no open `category` arm) and the element's tag is not in it
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
	const allowed = resolvePermittedTags(parentEntry.childModel)
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
			parentEntry?.childModel === undefined ? null : resolvePermittedTags(parentEntry.childModel)
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
//  Four generic concerns, each schema-data-driven:
//    1. required/order — `entry.childModel` is the element's ordered child
//       content model (closed sequence OR structural prefix + open category
//       arm). The element-children must satisfy it (cardinality + order,
//       script-supporting intermixed). Drives `ul`/`ol` (li*), `table`,
//       `picture`, `select`, `hgroup`, `dl`, `ruby`, `details`, `fieldset`,
//       `figure`, … from ONE datum. Fires ONLY when every child tag is
//       admissible (else the membership miss is `context/parent-model`'s) —
//       so a violation yields exactly one finding.
//    2. cardinality — a PREFIX (`closed:false`) model whose required-leading
//       SINGULAR child (a leading `{kind:'tag', count:'1'|'?'}` segment —
//       `details`→`summary`, `fieldset`→`legend`) occurs MORE THAN ONCE.
//       The open trailing arm would otherwise absorb the duplicate
//       silently. Generic off `resolveLeadingSingularTag(childModel)`; defers to
//       (1) when the ordered model is itself unsatisfied (a CLOSED model's
//       duplicate — `table`→`caption` — is single-sourced there). One
//       finding per parent.
//    3. forbidden descendant — any flat-tree descendant whose tag/category
//       is named in `entry.forbidden` (e.g. `dt` forbids heading/sectioning,
//       `header` forbids header/footer).
//    4. category — a bare-category parent (`entry.permits` non-empty: the
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

// The first forbidden flat-tree descendant is resolved by the centralized
// `findForbiddenDescendant` helper (helpers.ts) — a single flat traversal
// mirroring `Walker.walk()`'s flat tree (§3/§9).

// Fires only when the parent carries a `childModel` AND every flat child tag
// is admissible by it (a non-admissible tag is `context/parent-model`'s — the
// two predicates are mutually exclusive, so the registry produces exactly one
// finding for one violation).
// The plain predicate: the parent carries a `childModel`, every flat child
// tag is admissible by it (a non-admissible tag is `context/parent-model`'s),
// and the ordered model is NOT satisfied. Named so the cardinality rule can
// reuse the exact same "ordered model unsatisfied" decision WITHOUT a guard
// re-narrowing `subject` to `never` (a guard's negative branch is not a
// boolean — it is a type-narrowing site).
function childModelUnsatisfied(subject: RuleSubject): boolean {
	const entry = subject.entry
	if (entry?.childModel === undefined) return false
	const children = flatChildren(subject.element)
	const allowed = resolvePermittedTags(entry.childModel)
	if (allowed !== null) {
		// Closed-tag model: a non-admissible child is the context family's
		// membership miss, not an order miss — defer (one finding per
		// violation).
		for (const child of children) {
			if (!allowed.has(tagOf(child))) return false
		}
	}
	return !satisfiesChildModel(children, entry.childModel)
}

const violatesChildModel = whereOf(isSubject, childModelUnsatisfied)

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

// `content/cardinality` — the parent's `childModel` permits AT MOST ONE of
// its required-leading SINGULAR child (a leading `{kind:'tag',
// count:'1'|'?'}` `segments[0]`) yet its flat children carry MORE THAN one.
// This is the duplicate the open trailing arm of a PREFIX (`closed:false`)
// model would otherwise absorb silently (the `<details>` with two
// `<summary>` → zero-findings gap; `<fieldset>` with two `<legend>`). It
// DEFERS to `content/required` when that already bites — a CLOSED model
// (`<table>` with two `<caption>`) breaks closed-exhaustiveness, so
// `content/required` is the single owner there. Parent-keyed, fires EXACTLY
// ONCE per parent; generic over EVERY entry with a leading-singular tag
// segment, never per-element. `structure/single-first-child` defers the
// cardinality aspect (its single-occurrence POSITION concern stays its
// own), so one violation yields exactly one finding (the §1/§2 disjoint
// single-source partition, extended to cardinality).
const violatesLeadingCardinality = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const entry = subject.entry
	if (entry?.childModel === undefined) return false
	// Defer to content/required: when the ordered model itself is
	// unsatisfied (a CLOSED model's duplicate breaks exhaustiveness) the
	// violation is reported there — single source, no double-report.
	if (childModelUnsatisfied(subject)) return false
	const tag = resolveLeadingSingularTag(entry.childModel)
	if (tag === null) return false
	return countLeadingTag(subject.element, tag) > 1
})

const contentCardinalityRule: RuleInterface = {
	id: 'content/cardinality',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesLeadingCardinality(subject)) return null
		const entry = subject.entry
		if (entry?.childModel === undefined) return null
		const tag = resolveLeadingSingularTag(entry.childModel)
		if (tag === null) return null
		const count = countLeadingTag(element, tag)
		return buildFinding({
			rule: 'content/cardinality',
			severity: 'error',
			element,
			cite: citeOf(entry, 'dom#content-models'),
			message: `<${subject.tag}> permits at most one <${tag}> child — its content model is "${describeModel(entry.childModel)}".`,
			expected: `at most one <${tag}>`,
			actual: `${count} <${tag}> children`,
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
		const offender = findForbiddenDescendant(element, entry.forbidden)
		if (offender === null) return null
		const offenderTag = tagOf(offender)
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

// The first miscategorized flat-tree child (resolved effective categories
// NON-EMPTY and disjoint from the parent's corpus-derived `permits`;
// transparent + structural children skipped) is resolved by the
// centralized `findMiscategorizedChild` helper (helpers.ts) — the
// disjoint boundary that keeps `<div><td>` a single
// `structure/parent-restricted` finding.

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
		const offender = findMiscategorizedChild(element, permits)
		if (offender === null) return null
		const offenderTag = tagOf(offender)
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

// The flat-tree ancestor-tag scan (`hasFlatAncestorTag` — walks the SAME
// flat parent chain `readSubject` resolves "the parent" from, §3) is
// centralized in helpers.ts.

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
// SINGLE SOURCE / one-finding-per-violation (§1/§2): the violation is
// partitioned by WHAT each rule can structurally detect, so exactly one
// rule owns each:
//   - REQUIRED-leading child (e.g. `summary`(1) in `details`): an
//     out-of-place/missing child makes the whole model unsatisfied, so
//     `content/required` (parent-keyed) is the sole reporter — this
//     child-keyed rule DEFERS (the §1 case; do NOT undo).
//   - CARDINALITY of a leading SINGULAR child (a SECOND `summary`/`legend`/
//     `caption`): owned by `content/cardinality` (prefix model) or
//     `content/required` (closed-model exhaustiveness — `table`), both
//     parent-keyed. This child-keyed rule DEFERS the cardinality aspect
//     (the >1-occurrence case) so a duplicate yields exactly one finding,
//     not one-per-duplicate-child.
//   - POSITION of a lone OPTIONAL-leading child (one `legend`/`caption`
//     that is NOT first — the permissive prefix model cannot see a late
//     single occurrence): this rule is the SOLE reporter and must NOT
//     defer — its genuine, preserved concern.
const violatesSingleFirstChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const own = constraintOf(subject.entry, 'single-first-child')
	if (own?.parents === undefined) return false
	// No parent ⇒ the constraint is not applicable (an explicit
	// not-applicable, not a misleading "treat self as parent" fallback, #8).
	if (subject.parent === null) return false
	if (!own.parents.includes(subject.parent.tagName.toLowerCase())) return false
	const parentModel = subject.parentEntry?.childModel
	// Defer when the parent's childModel REQUIRES this child as its
	// mandatory leading segment (content/required is the single source for
	// the §1 missing/out-of-place case).
	if (parentModel !== undefined && requiresLeadingTag(parentModel, subject.tag)) return false
	const siblings = flatChildren(subject.parent)
	const occurrences = siblings.filter((s) => tagOf(s) === subject.tag)
	// Defer the CARDINALITY aspect: when the parent's childModel makes this
	// child a leading SINGULAR slot AND it occurs more than once, the
	// duplicate is the content family's single concern (content/cardinality
	// for a prefix model, content/required for a closed one) — not this
	// rule's, and never one-finding-per-duplicate-child.
	if (
		parentModel !== undefined &&
		resolveLeadingSingularTag(parentModel) === subject.tag &&
		occurrences.length > 1
	) {
		return false
	}
	// The remaining, preserved concern: a lone child that is not first.
	return siblings[0] !== subject.element
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
	return (
		findFlatDescendant(subject.element, (descendant) => tagOf(descendant) === subject.tag) !== null
	)
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

// The `img[ismap]` flat-tree ancestor `a[href]` check (`hasLinkAncestorWithHref`)
// is centralized in helpers.ts — it composes the shared `hasFlatAncestor`
// base (predicate = `a` + `href`) the structure family's `hasFlatAncestorTag`
// also composes, the SAME flat parent chain (`flatParent` — slot conduits
// collapsed) `readSubject` resolves "the parent" from, never light-tree
// `closest` (§3). Bounded by the finite flat depth.

// The element's child text content (`readChildText`) and the generic
// `AttributeRule` accessor (`findAttributeRule`) are centralized in
// helpers.ts — the schema-data-driven accessors every attribute rule
// iterates through, so no rule hand-codes a per-element attribute list.

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
		const rule = findAttributeRule(
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
		const rule = findAttributeRule(
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
// SAME enumerated-value coercion `attribute/enum` uses (one source of
// truth). `findOffendingEnumAttribute` is centralized in helpers.ts.

const violatesAttributeValue = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		findOffendingEnumAttribute(subject.entry, subject.element) !== null,
)

const attributeValueRule: RuleInterface = {
	id: 'attribute/value',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesAttributeValue(subject)) return null
		const rule = findOffendingEnumAttribute(subject.entry, element)
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
// `hasAttributeRule` (the schema-datum accessor) is centralized in
// helpers.ts.

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
	return readChildText(subject.element) === undefined
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
			const rule = findAttributeRule(
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
			const rule = findAttributeRule(subject.entry, (candidate) => candidate.attribute === 'ismap')
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
			const rule = findAttributeRule(
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
// `findOffendingIntegerBound` is centralized in helpers.ts.

const violatesIntegerBound = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		findOffendingIntegerBound(subject.element, subject.tag) !== null,
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
		const bound = findOffendingIntegerBound(element, subject.tag)
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
// `schemaConstrainsValues` (the disjointness gate) and
// `findOffendingEnumDomain` (the global-domain scan) are centralized in
// helpers.ts.

const violatesEnumDomain = whereOf(
	isSubject,
	(subject: RuleSubject): boolean =>
		findOffendingEnumDomain(subject.element, subject.entry) !== null,
)

const attributeEnumRule: RuleInterface = {
	id: 'attribute/enum',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesEnumDomain(subject)) return null
		const domain = findOffendingEnumDomain(element, subject.entry)
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

// The corpus-referrer resolution (`resolveReferencedId` →
// `resolveReferencedTarget`, schema-data-driven `a[href="#id"]` /
// `label[for]` / `output[for]` via `traversals` `getElementById`) and the
// `isHiddenNode` Hidden-state scan (the SAME flat parent chain the
// structure family walks, §3 — the conservative `until-found`-is-hidden
// reading documented there) are centralized in helpers.ts.

// The referrer is "active" for the corpus rule iff it is NOT itself in the
// state it must not reference into: the §6.1 rule scopes to referrers "that
// are not themselves hidden" (a hidden referrer legitimately co-locates
// with a hidden target).
const violatesHiddenReference = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (isHiddenNode(subject.element)) return false
	const target = resolveReferencedTarget(subject)
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

// ============================================================================
//  Family: presentation — computed-style semantic-break rules (Phase 5).
//
//  The ONLY family that reads `context.style()` (lazily — the structure
//  families never do, keeping them fast/style-free). Each rule fires ONLY
//  when a CSS override BREAKS an element's semantically load-bearing default
//  rendering (corpus = `guides/w3c/renderings.md §15`), NEVER for a merely
//  stylistic difference (ROADMAP non-goal: "Not a CSS linter — only flags
//  overrides that contradict an element's semantics, nothing stylistic").
//  `lens: 'presentation'` so the Phase-4 Inspector stamps it onto every
//  `Finding` and `inspect({lens:'presentation'})` / `findings('presentation')`
//  route it.
//
//  FALSE-POSITIVE-ON-VALID-MARKUP is this initiative's recurring Critical
//  defect (resolved `getComputedStyle` values legitimately vary; a
//  compensating ARIA role / replacement affordance makes a "stripped"
//  default conformant). EVERY rule therefore fires ONLY when the semantic is
//  genuinely broken AND no corpus-sanctioned compensation exists — the
//  compensation logic is designed from the corpus prose (`renderings.md` +
//  `aria.md`), never intuition:
//    - presentation/list-style  `ul`/`ol`/`menu` computed `list-style-type:
//                                none` with NO compensating `role=list`
//                                (aria.md §58/§165-168) — the genuinely-
//                                stripped, uncompensated list (degraded
//                                affordance ⇒ `warning`).
//    - presentation/bidi        `bdo` ≠ `isolate-override` / `bdi` ≠
//                                `isolate` (renderings.md §15.3.5). Scoped to
//                                the elements whose ENTIRE semantic IS the
//                                bidi algorithm; a generic `[dir]` override
//                                is stylistic-adjacent and ARIA-roleless
//                                (aria.md §85) — flagging it would false-
//                                positive on every CSS-reset `[dir]` element
//                                (documented decidable boundary).
//    (presentation/table is DELIBERATELY REMOVED — see the boundary block
//     below; a `<td>`/`<tr>`'s a11y cell/row role does not depend on its
//     `display`, so the rule was inherently-stylistic CSS-linting.)
//    - presentation/hidden      `[hidden]:not([hidden=until-found])
//                                :not(embed)` `display` ≠ `none`;
//                                `[hidden=until-found]:not(embed)`
//                                `content-visibility` ≠ `hidden` (or forced
//                                `display:none`/`contents`/`inline`) —
//                                renderings.md §15.3.1 exact UA rule, the
//                                `:not(embed)` carve-out honored faithfully.
//    - presentation/preformatted `pre` `white-space` ∉ {pre,pre-wrap};
//                                `textarea` ≠ `pre-wrap` (≠ `pre` when
//                                `wrap` is an ASCII-case-insensitive `off`)
//                                — renderings.md §15.3.3 / §15.5.17.
//    - presentation/focus       a focusable element whose INLINE `style`
//                                removes the UA focus outline (`outline:
//                                none`/`0` — inline specificity provably
//                                defeats `:focus-visible{outline:auto}` in
//                                EVERY state) with NO inline replacement
//                                affordance (box-shadow / border / explicit
//                                non-interactive role) — renderings.md
//                                §15.3.4. `:focus-visible` is a dynamic
//                                pseudo NOT synthesizable in a tree-walk
//                                (a conformant `<button>`'s BASE computed
//                                `outline-style` is `none`), so the rule is
//                                scoped to the ONE false-positive-free
//                                decidable signal — the inline override
//                                (documented boundary; no invented
//                                `:focus-visible` synthesis). The
//                                replacement-affordance check is symmetrically
//                                inline-only BY DESIGN: it reads the SAME
//                                inline `style` surface as the inline-outline-
//                                removal trigger, so a stylesheet
//                                `:focus-visible` replacement deliberately does
//                                NOT suppress an inline removal (reading
//                                computed style on the affordance side would
//                                reintroduce the `:focus-visible` non-
//                                decidability the trigger side exists to avoid
//                                — do not "fix" the asymmetry away).
//    - presentation/visibility  `dialog:not([open])` / `[popover]:not(
//                                :popover-open)` `display` ≠ `none` — a
//                                CLOSED dialog/popover painted visibly is a
//                                genuine semantic break (renderings.md
//                                §15.3.3). The `summary` `list-item` MARKER
//                                and the shadow-internal closed-`<details>`
//                                body-hiding are presentational / not light-
//                                tree-decidable respectively, so deliberately
//                                OUT OF SCOPE per the ROADMAP non-goal
//                                ("nothing stylistic") + the false-positive
//                                doctrine (documented boundaries).
//
//  DOCUMENTED CORPUS-GROUNDED BOUNDARIES (the Phase-3.3 precedent — faithful
//  carve-outs / spec-non-goal-driven removals, NOT ad-hoc exceptions; each
//  grounded in `renderings.md §15` / `aria.md` / CSS-Display-3 / HTML-AAM
//  prose, never intuition):
//    • `presentation/list-item` (the `li` ⇒ `display:list-item` rule) AND
//      `presentation/table` (the `table`/`caption`/`thead`/`tbody`/`tfoot`/
//      `tr`/`td`/`th` ⇒ `display:table-*` rule) are BOTH DELIBERATELY
//      REMOVED — neither ships. Per WHATWG HTML / CSS Display Module Level 3
//      / HTML-AAM, an element's a11y-tree role does NOT depend on its
//      `display` value: a `<li>` styled `flex`/`grid`/`inline-flex`/
//      `contents`/`block` is STILL a list item, and a `<td>`/`<tr>` so
//      styled is STILL a cell/row in the accessibility tree (each loses only
//      its generated marker/table box, a purely visual layout affordance).
//      Keying an `error` on `display ∉ ['list-item']` / `display ∉
//      ['table-*']` is therefore the exact STYLISTIC CSS-linting the ROADMAP
//      non-goal forbids ("only flags overrides that contradict an element's
//      SEMANTICS, nothing stylistic"): list-item false-positived on the
//      framework's OWN documented-conformant breadcrumb (`_nav.scss`
//      `nav[aria-label] > :is(ol,ul) > li { display: inline-flex }`,
//      `NavPage.vue` §Breadcrumb, no `role=listitem`) and pagination row,
//      and table false-positived on the framework's OWN documented
//      expandable-table idiom (`_table.scss` `table > tbody >
//      tr:has(+ tr[data-table-expansion]) > td:first-child { display:
//      flex }`, `TablesPage.vue`, no `role="cell"`). An a11y-OUTCOME-correct
//      version of either would fire only on (a) `display:none` — already
//      owned by `presentation/hidden` — or (b) a `role` reassignment, the
//      ROADMAP "not an ARIA auditor" non-goal: redundant or disclaimed
//      either way. The genuinely-semantic, corpus-stated, tree-decidable
//      list concern — `list-style:none` stripping the list role without
//      `role=list` — ALREADY ships as the surviving `presentation/list-style`
//      `warning` below (there is no analogous tree-decidable table concern
//      beyond `display:none`, already owned by `presentation/hidden`). This
//      is the Phase-3.3 doctrine: when the spec / non-goal wins, CORRECT THE
//      PLAN and reduce root complexity, do not pile carve-outs onto an
//      inherently-stylistic rule. The `li` row AND the 8 table-model rows
//      are removed from `PRESENTATION_DEFAULTS` alongside the rules (they
//      existed ONLY for these rules); the parity binding ("every entry
//      corpus-supported") is un-weakened — removing corpus-supported entries
//      cannot weaken a forall.
//    • The former `display: contents` box-vs-semantic CARVE-OUT in
//      `offendingPresentationDefault` is now GONE. It existed ONLY to keep
//      `presentation/list-item` + `presentation/table` from firing on a
//      box-eliding `display:contents` (the element keeps its a11y role per
//      CSS Display 3 / HTML-AAM). With BOTH rules removed, no
//      `PRESENTATION_DEFAULTS` entry has `property === 'display'` (only the
//      bidi `unicode-bidi` + preformatted `white-space` rows remain), so the
//      `if (property==='display' && actual==='contents') continue` branch was
//      dead code. Per the philosophy "reduce root complexity, do not leave
//      vestigial exceptions / dead carve-outs", it is DELETED, not retained.
//      The surviving `unicode-bidi`/`white-space` rows are a different
//      semantic axis a `display:contents` never preserved, so the bidi/pre
//      behavior is byte-equivalent and the verbatim `w3c.test.ts` parity
//      binding stays un-weakened (the data was never the carve-out's
//      mechanism — it was rule logic).
//    • `presentation/list-style` will (CORRECTLY, BY DESIGN) surface as a
//      `warning` on a `list-style:none` list lacking `role="list"` —
//      INCLUDING the framework's own first-party `<menu>` (`_menu.scss`
//      strips `list-style` so the menu reads as a toolbar). This is a
//      CONSCIOUS, corpus-grounded decision, NOT a false positive: `aria.md`
//      §58-59 card `ol`/`ul`/`menu`→implicit `list` role, and `aria.md`
//      §165-168 states the presentation lens flags `list-style:none` +
//      non-`list-item` `display` stripping the list role without a
//      compensating `role="list"` (per `renderings.md §15` which sets the
//      `dir, menu, ul { list-style-type: disc }` marker affordance). A list
//      stripped of its marker affordance with NO `role="list"` genuinely
//      DEGRADES the AT list affordance — defensible AS a `warning` (the list
//      still groups items; only the affordance is weakened, hence `warning`
//      not `error`). Phase 6 reports/triages warnings and only FAILS on
//      `error`, so this surfacing on first-party `<menu>` is expected and
//      non-blocking. NOT downgraded/removed (that would be symptom-hiding).
//
//  The tabular list/bidi/table/pre checks ITERATE the parity-gated
//  `PRESENTATION_DEFAULTS` corpus DATA (constants.ts) — no per-element
//  branch; the bespoke hidden/focus/visibility rules are focused individual
//  rules, still corpus-faithful + cited. DISJOINT: every presentation rule
//  keys on a distinct element/property/state, so an element failing two
//  presentation checks reports each distinct corpus violation once (like the
//  attribute family) and never double-reports ONE conceptual issue; disjoint
//  from the structure-lens families (those never read style). One finding
//  per violation; pure/total (AGENTS §13) — non-match ⇒ `null`, nothing
//  throws.
// ============================================================================

// The normalized computed-style reader (`readStyleValue`) and the ARIA
// role-token reader (`readRoleTokens`) are centralized in helpers.ts.

// Does the element carry one of the corpus-sanctioned compensating ARIA
// roles for this `PRESENTATION_DEFAULTS` entry? (The false-positive guard —
// a re-asserted implicit role preserves the stripped semantic.) An entry
// with no `roles` can never be compensated this way (`bidi`/`pre`).
function hasCompensatingRole(element: Element, fallback: PresentationDefault): boolean {
	if (fallback.roles === undefined) return false
	const tokens = readRoleTokens(element)
	return fallback.roles.some((role) => tokens.includes(role))
}

// The first `PRESENTATION_DEFAULTS` entry whose `tags` includes this tag
// AND whose property the element's COMPUTED style resolves OUTSIDE
// `expected` AND for which no compensating ARIA role is present — i.e. the
// genuine, uncompensated semantic break. `null` ⇒ conformant (the common
// case: every default-rendered element). Iterates the corpus DATA, never a
// per-element branch.
function offendingPresentationDefault(subject: RuleSubject): PresentationDefault | null {
	for (const fallback of PRESENTATION_DEFAULTS) {
		if (!fallback.tags.includes(subject.tag)) continue
		const actual = readStyleValue(subject.context, fallback.property)
		// An empty computed value (detached / `display:none` ancestor in a
		// non-rendered subtree) is NOT a semantic-break signal — the override
		// rule needs a RESOLVED value to contradict. Skip (conservative: a
		// genuine violation in a rendered tree always resolves a value).
		if (actual === '') continue
		if (fallback.expected.includes(actual)) continue
		// No `display`-model entry survives in PRESENTATION_DEFAULTS (only the
		// bidi `unicode-bidi` + preformatted `white-space` rows remain), so
		// the former `display:contents` box-vs-semantic CARVE-OUT here is gone
		// — it was REMOVED with the inherently-stylistic `presentation/
		// list-item` + `presentation/table` rules it existed to guard (a
		// `<li>`/`<tr display:contents>` keeps its a11y role per CSS Display 3
		// / HTML-AAM; flagging the box-elision was the stylistic CSS-linting
		// the ROADMAP non-goal forbids — see the head-comment boundary block).
		// Per the philosophy "remove root complexity, do not leave vestigial
		// exceptions", the now-dead `if (property==='display' && actual===
		// 'contents') continue` is deleted rather than left as dead code. The
		// surviving `unicode-bidi`/`white-space` rows are a different semantic
		// axis a `display:contents` never preserved, so behavior for bidi/pre
		// is byte-equivalent.
		if (hasCompensatingRole(subject.element, fallback)) continue
		return fallback
	}
	return null
}

// presentation/list-style — the `ul`/`ol`/`menu` list whose computed
// `list-style-type` is `none` with NO compensating `role="list"`. This is
// the corpus-stated list-semantics-stripping case (renderings.md §15.3.7
// `dir, menu, ul { list-style-type: disc }` / `ol { list-style-type:
// decimal }` define the marker; aria.md §58/§165-168: a `list-style: none`
// list loses its implicit `list` role in some engines unless `role="list"`
// re-asserts it). It is a DEGRADED affordance, not a destroyed element
// (`warning`, not `error` — the list still groups items; only the visual/
// AT list affordance is weakened). The compensation guard (`role="list"`)
// is the false-positive bound: `ul[role=list]` with `list-style:none` (the
// single most common real-world reset) is conformant ⇒ ZERO findings.
// `LIST_CONTAINER_TAGS` is the corpus-derived tag vocabulary in constants.ts
// (§4.6/§5 — no module-level const collection lives in rules.ts).
const violatesListStyle = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (!LIST_CONTAINER_TAGS.has(subject.tag)) return false
	if (readRoleTokens(subject.element).includes('list')) return false
	const value = readStyleValue(subject.context, 'list-style-type')
	return value === 'none'
})

const presentationListStyleRule: RuleInterface = {
	id: 'presentation/list-style',
	severity: 'warning',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesListStyle(subject)) return null
		return buildFinding({
			rule: 'presentation/list-style',
			severity: 'warning',
			element,
			cite: 'renderings#lists',
			message: `<${subject.tag}> with computed 'list-style-type: none' strips the list affordance — add role="list" to preserve list semantics, or keep a marker.`,
			expected: `a list marker, or a compensating role="list"`,
			actual: 'list-style-type: none with no role="list"',
		})
	},
}

// presentation/bidi — the `bdo`/`bdi` PRESENTATION_DEFAULTS rows. Scoped to
// the bidi elements themselves (their ENTIRE semantic is the bidi algorithm
// override/isolation): a `bdo` whose `unicode-bidi` is not
// `isolate-override`, or a `bdi` whose `unicode-bidi` is not `isolate`, has
// had its sole purpose stripped (renderings.md §15.3.5). A generic `[dir]`
// element is DELIBERATELY out of scope — aria.md §85 cards `bdo`/`bdi` (and
// every `[dir]`-bearing element) roleless for directionality, so no ARIA
// compensation exists and flagging every CSS-reset `[dir]` element would be
// the exact false-positive-on-valid-markup Critical this initiative keeps
// shipping. The decidable, semantic-only boundary is the two bidi elements.
function offendingBidiDefault(subject: RuleSubject): PresentationDefault | null {
	if (subject.tag !== 'bdo' && subject.tag !== 'bdi') return null
	const fallback = offendingPresentationDefault(subject)
	return fallback !== null && fallback.property === 'unicode-bidi' ? fallback : null
}

const violatesBidi = whereOf(
	isSubject,
	(subject: RuleSubject): boolean => offendingBidiDefault(subject) !== null,
)

const presentationBidiRule: RuleInterface = {
	id: 'presentation/bidi',
	severity: 'error',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesBidi(subject)) return null
		const fallback = offendingBidiDefault(subject)
		if (fallback === null) return null
		return buildFinding({
			rule: 'presentation/bidi',
			severity: fallback.severity,
			element,
			cite: fallback.cite,
			message: `<${subject.tag}> must keep 'unicode-bidi: ${fallback.expected.join(' | ')}' — its directional ${subject.tag === 'bdo' ? 'override' : 'isolation'} semantic is otherwise stripped.`,
			expected: `unicode-bidi: ${fallback.expected.join(' | ')}`,
			actual: `unicode-bidi: ${readStyleValue(context, 'unicode-bidi')}`,
		})
	},
}

// presentation/table — DELIBERATELY REMOVED (does not ship), same root-cause
// doctrine as `presentation/list-item` (see the head-comment boundary
// block). Per WHATWG HTML / CSS Display Module Level 3 / HTML-AAM a
// table-model element's a11y-tree role (`table`/`row`/`cell`/`rowgroup`/
// `columnheader`/…) does NOT depend on its `display` value: a `<td>`/`<tr>`
// styled `flex`/`grid`/`block`/`contents` is STILL a cell/row in the
// accessibility tree (it loses only its generated table box, a purely
// visual layout affordance). Keying an `error` on `display ∉ ['table-*']`
// is therefore the exact STYLISTIC CSS-linting the ROADMAP non-goal forbids
// — it `error`-false-positived on the framework's OWN documented-conformant
// expandable-table idiom (`_table.scss` `table > tbody >
// tr:has(+ tr[data-table-expansion]) > td:first-child { display: flex }`,
// `TablesPage.vue`, no `role="cell"`). The only genuinely-semantic,
// tree-decidable table concern — `display:none` removing the element from
// the a11y tree — is ALREADY owned by `presentation/hidden`; a `role`
// reassignment is the ROADMAP "not an ARIA auditor" non-goal: redundant or
// disclaimed either way. Phase-3.3 doctrine: when the spec / non-goal wins,
// CORRECT THE PLAN and reduce root complexity, do not pile carve-outs onto
// an inherently-stylistic rule. The 8 table-model `PRESENTATION_DEFAULTS`
// rows are removed alongside it (they existed ONLY for this rule); the
// parity binding ("every entry corpus-supported") is un-weakened — removing
// corpus-supported entries cannot weaken a forall.

// presentation/pre — the `pre` PRESENTATION_DEFAULTS row PLUS the corpus
// `textarea` rule. `pre`'s `white-space` ∉ {pre,pre-wrap} collapses its
// preformatted whitespace semantic (renderings.md §15.3.3 — the `pre[wrap]`
// presentational hint resolves the conformant `pre-wrap`). `textarea` is
// not in PRESENTATION_DEFAULTS (its expected value is `wrap`-attribute-
// dependent, not a flat tabular constant): the corpus (§15.5.17) sets
// `white-space: pre-wrap`, OR `pre` when the `wrap` attribute is an ASCII
// case-insensitive match for "off" (the historical presentational hint).
// `coerceEnumAttribute` is the SAME ASCII-case-insensitive enumerated-value
// coercion the attribute family uses (no hand-rolled `.toLowerCase()` test).
function textareaExpectedWhiteSpace(element: Element): readonly string[] {
	const raw = element.getAttribute('wrap')
	if (raw !== null && coerceEnumAttribute(raw, ['off']) === 'off') return ['pre']
	return ['pre-wrap']
}

const violatesPre = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (subject.tag === 'pre') {
		const fallback = offendingPresentationDefault(subject)
		return fallback !== null && fallback.property === 'white-space'
	}
	if (subject.tag === 'textarea') {
		const actual = readStyleValue(subject.context, 'white-space')
		if (actual === '') return false
		return !textareaExpectedWhiteSpace(subject.element).includes(actual)
	}
	return false
})

const presentationPreRule: RuleInterface = {
	id: 'presentation/preformatted',
	severity: 'error',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesPre(subject)) return null
		if (subject.tag === 'pre') {
			const fallback = offendingPresentationDefault(subject)
			if (fallback === null) return null
			return buildFinding({
				rule: 'presentation/preformatted',
				severity: fallback.severity,
				element,
				cite: fallback.cite,
				message: `<pre> must keep 'white-space: ${fallback.expected.join(' | ')}' — its preformatted-whitespace semantic is otherwise collapsed.`,
				expected: `white-space: ${fallback.expected.join(' | ')}`,
				actual: `white-space: ${readStyleValue(context, 'white-space')}`,
			})
		}
		const expected = textareaExpectedWhiteSpace(element)
		return buildFinding({
			rule: 'presentation/preformatted',
			severity: 'error',
			element,
			// `textarea`'s preformatted rule is in the same §15.5.17 chapter
			// the corpus cards it; the anchor resolves through the SAME
			// `renderings` chapter path the data-driven cites use.
			cite: 'renderings#the-textarea-element',
			message: `<textarea> must keep 'white-space: ${expected.join(' | ')}' — its multiline raw-value semantic is otherwise collapsed.`,
			expected: `white-space: ${expected.join(' | ')}`,
			actual: `white-space: ${readStyleValue(context, 'white-space')}`,
		})
	},
}

// presentation/hidden — renderings.md §15.3.1, the EXACT UA rule:
//   [hidden]:not([hidden=until-found i]):not(embed) { display: none }
//   [hidden=until-found i]:not(embed) { content-visibility: hidden }
//   embed[hidden] { display: inline; height: 0; width: 0 }
// The `:not(embed)` carve-out is honored faithfully: an `<embed hidden>` is
// NEVER flagged (the UA does not give it `display:none`; it gets
// `display:inline` by design). `hidden=until-found` (ASCII case-insensitive)
// must compute `content-visibility: hidden` AND must not be forced to
// `display:none`/`contents`/`inline` (the corpus prose: the choice of
// `content-visibility:hidden` instead of `display:none` is load-bearing for
// the find-in-page reveal — §15.5.5's analogous note). A plain `[hidden]`
// (not `until-found`, not `embed`) must compute `display: none`.
// `readHiddenState` (the enumerated `[hidden]` keyword reader) is
// centralized in helpers.ts.

const violatesHidden = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (subject.tag === 'embed') return false // the §15.3.1 :not(embed) carve-out
	const state = readHiddenState(subject.element)
	if (state === null) return false
	if (state === 'plain') {
		const display = readStyleValue(subject.context, 'display')
		return display !== '' && display !== 'none'
	}
	// until-found: content-visibility MUST be hidden, and the box must not be
	// forced display:none/contents/inline (those defeat the find-in-page
	// reveal the corpus mandates content-visibility:hidden specifically for).
	const cv = readStyleValue(subject.context, 'content-visibility')
	const display = readStyleValue(subject.context, 'display')
	if (cv === '' && display === '') return false
	if (cv !== 'hidden') return true
	return display === 'none' || display === 'contents' || display === 'inline'
})

const presentationHiddenRule: RuleInterface = {
	id: 'presentation/hidden',
	severity: 'error',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesHidden(subject)) return null
		const state = readHiddenState(element)
		if (state === 'plain') {
			return buildFinding({
				rule: 'presentation/hidden',
				severity: 'error',
				element,
				cite: 'renderings#hidden-elements',
				message: `<${subject.tag}> with [hidden] must compute 'display: none' — an override re-reveals content the author hid.`,
				expected: 'display: none',
				actual: `display: ${readStyleValue(context, 'display')}`,
			})
		}
		return buildFinding({
			rule: 'presentation/hidden',
			severity: 'error',
			element,
			cite: 'renderings#hidden-elements',
			message: `<${subject.tag}> with [hidden=until-found] must compute 'content-visibility: hidden' and must not be forced display:none/contents/inline (find-in-page reveal).`,
			expected: 'content-visibility: hidden',
			actual: `content-visibility: ${readStyleValue(context, 'content-visibility')}, display: ${readStyleValue(context, 'display')}`,
		})
	},
}

// presentation/focus — renderings.md §15.3.4 `:focus-visible { outline:
// auto }`. A focusable element whose author CSS removes that UA focus ring
// with no replacement affordance makes keyboard focus invisible (an
// accessibility-breaking presentation override).
//
// DECIDABLE BOUNDARY (documented, no invention): `:focus-visible` is a
// dynamic pseudo-state — a tree-walker visits an UNFOCUSED element, and the
// UA `:focus-visible{outline:auto}` ring exists ONLY in that state, so the
// element's BASE computed `outline-style` is `none` for a *perfectly
// conformant* `<button>` (verified empirically: chromium resolves a bare
// `<button>` to `outline-style: none`, the ring being `:focus-visible`-only).
// Reading the base computed outline would therefore FALSE-POSITIVE on every
// conformant focusable element — the exact Critical this initiative keeps
// shipping. The ONE statically decidable, false-positive-free signal is an
// **inline `style` outline removal**: an inline `outline: none` / `outline:
// 0` has inline specificity (1,0,0,0) and therefore overrides the UA
// `:focus-visible{outline:auto}` rule (specificity 0,1,0) in EVERY state,
// including `:focus-visible` — the focus ring is *provably, statically,
// unconditionally removed*. This reads the element's own inline declaration
// (decidable author intent), NOT the ambiguous base computed style; the
// replacement-affordance guard (the false-positive bound) likewise reads the
// inline declaration so the signal is one coherent decidable surface. A bare
// `<button>` (no inline outline) is never flagged. The narrower author-rule
// `button:focus-visible{outline:none}` form is NOT statically decidable from
// a walk (it needs the pseudo-state) and is deliberately out of scope — the
// honest corpus-faithful boundary, documented, not invented.
// `FOCUSABLE_TAGS` is the tag vocabulary in constants.ts (§4.6/§5 — no
// module-level const collection lives in rules.ts).
function isFocusableElement(element: Element, tag: string): boolean {
	// A negative `tabindex` removes the element from sequential focus AND the
	// `:focus-visible` keyboard-focus contract — not a focus-affordance
	// concern (decidable, corpus-consistent). A `disabled` form control is
	// likewise not keyboard-focusable.
	const tabindex = element.getAttribute('tabindex')
	if (tabindex !== null) {
		const value = coerceIntegerAttribute(tabindex)
		if (value !== undefined && value < 0) return false
	}
	if (element.hasAttribute('disabled')) return false
	if (FOCUSABLE_TAGS.has(tag)) {
		// `<a>` is focusable only with an `href` (the spec's tabbable rule);
		// other listed tags are intrinsically focusable.
		if (tag === 'a') return element.hasAttribute('href')
		return true
	}
	// Any element made focusable by an explicit non-negative `tabindex`.
	return tabindex !== null && coerceIntegerAttribute(tabindex) !== undefined
}

// The element's INLINE style declaration reader (`readInlineStyle` —
// decidable author intent, the `style` attribute, NOT computed style; the
// documented-boundary signal deliberately distinct from `context.style()`)
// is centralized in helpers.ts.

// The author painted a replacement focus affordance inline — a non-`none`
// box-shadow, a real border (style + non-zero width), or an explicit
// non-interactive role (the corpus aria.md `presentation`/`none` decorative
// carve-out — the element opted OUT of the interactive focus contract).
function hasReplacementAffordance(element: Element): boolean {
	const style = readInlineStyle(element)
	if (style === null) return false
	const shadow = style.boxShadow.trim().toLowerCase()
	if (shadow !== '' && shadow !== 'none') return true
	const borderStyle = style.borderStyle.trim().toLowerCase()
	const borderWidth = style.borderWidth.trim().toLowerCase()
	if (
		borderStyle !== '' &&
		borderStyle !== 'none' &&
		borderStyle !== 'hidden' &&
		borderWidth !== '' &&
		borderWidth !== '0px' &&
		borderWidth !== '0'
	) {
		return true
	}
	const roles = readRoleTokens(element)
	return roles.includes('presentation') || roles.includes('none')
}

const violatesFocus = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (!isFocusableElement(subject.element, subject.tag)) return false
	const style = readInlineStyle(subject.element)
	if (style === null) return false
	// The inline outline removal that provably defeats `:focus-visible{
	// outline:auto}` in every state by inline specificity.
	const outlineStyle = style.outlineStyle.trim().toLowerCase()
	const outlineWidth = style.outlineWidth.trim().toLowerCase()
	const removed = outlineStyle === 'none' || outlineWidth === '0px' || outlineWidth === '0'
	if (!removed) return false
	return !hasReplacementAffordance(subject.element)
})

const presentationFocusRule: RuleInterface = {
	id: 'presentation/focus',
	severity: 'error',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesFocus(subject)) return null
		return buildFinding({
			rule: 'presentation/focus',
			severity: 'error',
			element,
			// §15.3.4 Phrasing content carries the `:focus-visible { outline:
			// auto }` UA rule; the anchor resolves through the `renderings`
			// chapter path.
			cite: 'renderings#phrasing-content',
			message: `focusable <${subject.tag}> removes its UA focus outline with no replacement affordance (no box-shadow / border focus indicator) — keyboard focus is invisible.`,
			expected: 'a visible focus indicator (UA outline or a replacement box-shadow/border)',
			actual: 'outline removed, no replacement affordance',
		})
	},
}

// presentation/visibility — renderings.md §15.3.3. The corpus state-
// rendering invariants that are genuine SEMANTIC breaks (not stylistic) AND
// decidable from the NODE's OWN computed style (`context.style()`):
//   1. `dialog:not([open])` MUST compute `display: none`
//      (§15.3.3 `dialog:not([open]) { display: none }`) — a CLOSED dialog
//      rendered visibly is a genuine semantic break (the user sees a
//      dialog that the document model says is closed).
//   2. `[popover]:not(:popover-open):not(dialog[open])` MUST compute
//      `display: none` (§15.3.3) — same: a closed popover visibly painted
//      contradicts its closed state. `:popover-open` is decidable via the
//      `:popover-open` match (top layer iff matched).
//
// SCOPE BOUNDARIES (documented, corpus-faithful, false-positive-safe — the
// recurring Critical of this initiative is flagging conformant markup):
//   • `details > summary:first-of-type { display: list-item }` (§15.5.5) is
//     DELIBERATELY OUT OF SCOPE. Per the ROADMAP non-goal ("only flags
//     overrides that contradict an element's SEMANTICS, nothing stylistic"),
//     a `<summary>`'s `list-item`+`disclosure-closed` is the default MARKER
//     RENDERING, not the summary's semantic — the summary remains the
//     disclosure control for its `<details>` at ANY `display` (the genuine
//     "summary must be the first child" constraint is the STRUCTURE lens's,
//     Phase 3). Virtually every design system / this framework restyles the
//     summary marker (`display:flex`); flagging it would false-positive on
//     conformant real-world markup — the exact Critical defect class. The
//     marker is presentational; the semantic is intact.
//   • The closed-`<details>` body-hiding is implemented on the UA SHADOW
//     `::details-content` slot wrapper's `content-visibility:hidden`, which
//     the corpus §15.5.5 prose itself states is "not directly visible to
//     author code". A conformant closed `<details>`'s LIGHT body child
//     therefore computes a fully-visible box — a light-child check would
//     false-positive on every conformant closed `<details>`. NOT decidable
//     from a tree-walk; deliberately OUT OF SCOPE (the corpus says the
//     mechanism is shadow-internal; inventing a light-child check would
//     contradict it).
// `isPopoverOpen` (the `:popover-open` match, conservatively-open on an
// undecidable engine) is centralized in helpers.ts.

const violatesVisibility = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const { tag, element, context } = subject
	if (tag === 'dialog' && !element.hasAttribute('open') && !element.hasAttribute('popover')) {
		const display = readStyleValue(context, 'display')
		return display !== '' && display !== 'none'
	}
	if (element.hasAttribute('popover') && !isPopoverOpen(element)) {
		// `dialog[open]` popovers are exempt (the §15.3.3 selector's
		// `:not(dialog[open])` arm).
		if (tag === 'dialog' && element.hasAttribute('open')) return false
		const display = readStyleValue(context, 'display')
		return display !== '' && display !== 'none'
	}
	return false
})

const presentationVisibilityRule: RuleInterface = {
	id: 'presentation/visibility',
	severity: 'error',
	lens: 'presentation',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesVisibility(subject)) return null
		const tag = subject.tag
		const kind = element.hasAttribute('popover')
			? '[popover] (not :popover-open)'
			: 'dialog:not([open])'
		return buildFinding({
			rule: 'presentation/visibility',
			severity: 'error',
			element,
			cite: 'renderings#flow-content',
			message: `${kind} must compute 'display: none' — an override renders a closed ${tag === 'dialog' ? 'dialog' : 'popover'} visibly.`,
			expected: 'display: none',
			actual: `display: ${readStyleValue(context, 'display')}`,
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
	contentCardinalityRule,
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
	// presentation (Phase 5 — computed-style semantic-break, lens:'presentation')
	presentationListStyleRule,
	presentationBidiRule,
	presentationPreRule,
	presentationHiddenRule,
	presentationFocusRule,
	presentationVisibilityRule,
] as const
