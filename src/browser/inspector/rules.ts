import type {
	ContentCategory,
	ContentConstraint,
	ContentModelEntry,
	ContentSequenceSegment,
	Finding,
	FindingDraft,
	RuleContext,
	RuleInterface,
	RuleSubject,
} from '../types.js'
import { andOf, literalOf, notOf, whereOf } from '@elements/core'
import { effectiveCategories, matchesTag, nodePath } from '../helpers.js'
import { CATEGORY_MEMBERS, describeElement, isTransparent, isVoid } from '../schema.js'
import { getChildren } from '../traversals.js'

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
//  `required` / `forbidden` / `constraints`, `CATEGORY_MEMBERS`, `isVoid`)
//  and the Phase-2 `RuleContext` (resolved `model` / `categories` /
//  `parents` / `restrictions`) — they are GENERIC, never per-element
//  hand-code. `evaluate` is TOTAL (AGENTS §13): a non-match yields `null`,
//  a guard non-match yields `false`, nothing throws.
//
//  Families (Phase 3 part 1):
//    - context      element sits where the parent's constrained child list
//                    forbids it (dom.html#content-models).
//    - content      required child missing / mis-ordered / wrong
//                    cardinality; forbidden descendant present; child not an
//                    allowed category (dom.html#kinds-of-content).
//    - transparent  interactive / `a` / `tabindex` descendant of `<a>` (etc.)
//                    and nested media — driven by `RuleContext.restrictions`
//                    (dom.html#transparent-content-models).
//    - structure    the discrete named `entry.constraints` (per `kind`,
//                    generic) plus `void-has-children`.
//
//  Phase 3 parts 2/3 (attribute / interaction families) and Phase 4
//  (FindingManager / Inspector / ContractShape) plug into THIS `RuleInterface`
//  + `rules` registry unchanged — the contract is designed for them, not
//  built here (YAGNI).
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
	const parent = context.parents[0] ?? null
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

// The set of tags a constrained-child sequence permits (its segment tags
// plus the always-intermixable script-supporting elements).
function sequenceTags(sequence: readonly ContentSequenceSegment[]): ReadonlySet<string> {
	const tags = new Set<string>(['script', 'template'])
	for (const segment of sequence) tags.add(segment.tag)
	return tags
}

// Find the first constraint of a kind on an entry (constraints are encoded
// as data so the structure family stays generic per `kind`).
function constraintOf(
	entry: ContentModelEntry | null,
	kind: ContentConstraint['kind'],
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

// ── Cardinality ─────────────────────────────────────────────────────────────
//
// A `ContentSequenceSegment.count` ('?' '*' '+' '1') as a numeric bound the
// content family checks an observed child count against, generically.

function withinCount(count: ContentSequenceSegment['count'], observed: number): boolean {
	if (count === '?') return observed <= 1
	if (count === '*') return true
	if (count === '+') return observed >= 1
	return observed === 1
}

function expectedCount(count: ContentSequenceSegment['count']): string {
	if (count === '?') return 'zero or one'
	if (count === '*') return 'zero or more'
	if (count === '+') return 'one or more'
	return 'exactly one'
}

// Does the element's ordered element-children match the constrained sequence
// (each segment's run, in order, with script-supporting freely intermixed)?
// Generic over ANY `child-order` / `required` sequence — never table-specific
// or picture-specific code.
function sequenceSatisfied(
	children: readonly Element[],
	sequence: readonly ContentSequenceSegment[],
): boolean {
	const permitted = sequenceTags(sequence)
	for (const child of children) {
		if (!permitted.has(child.tagName.toLowerCase())) return false
	}
	let cursor = 0
	for (const segment of sequence) {
		let run = 0
		while (cursor < children.length && children[cursor]?.tagName.toLowerCase() === segment.tag) {
			run += 1
			cursor += 1
		}
		// Skip script-supporting elements interleaved between segments.
		while (
			cursor < children.length &&
			isScriptSupporting(children[cursor]?.tagName.toLowerCase())
		) {
			cursor += 1
		}
		if (!withinCount(segment.count, run)) return false
	}
	return cursor === children.length
}

// ============================================================================
//  Family: context — element sits where its parent forbids it.
//
//  Schema-driven: the parent entry's `required` sequence IS its constrained
//  child list. If the parent constrains its children (non-empty `required`)
//  and the element's tag is not one of the permitted segment tags (nor
//  script-supporting), the element is misplaced. Free flow/phrasing parents
//  carry an empty `required`, so this never false-positives on ordinary
//  content. Cite: the parent's corpus anchor (the constraint is the
//  parent's), dom.html#content-models.
// ============================================================================

const isMisplacedChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const parentEntry = subject.parentEntry
	if (parentEntry === null || parentEntry.required.length === 0) return false
	return !sequenceTags(parentEntry.required).has(subject.tag)
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
		return buildFinding({
			rule: 'context/parent-model',
			severity: 'error',
			element,
			cite: citeOf(parentEntry, 'dom#content-models'),
			message: `<${subject.tag}> is not allowed as a child of <${parentTag}> — the parent's content model constrains its children.`,
			expected:
				parentEntry === null ? undefined : [...sequenceTags(parentEntry.required)].join(', '),
			actual: subject.tag,
		})
	},
}

// ============================================================================
//  Family: content — the element's OWN child list / descendants are wrong.
//
//  Three generic concerns, each schema-data-driven:
//    1. required/order — `entry.required` is a constrained sequence the
//       element's element-children must satisfy (cardinality + order, with
//       script-supporting intermixed). Drives `ul`/`ol` (li+), `table`,
//       `picture`, `select`, `hgroup`, etc. from DATA.
//    2. forbidden descendant — any descendant whose tag/category is named
//       in `entry.forbidden` (e.g. `dt` forbids heading/sectioning,
//       `header` forbids header/footer).
//    3. category — a bare-category parent (`entry.permits` non-empty: the
//       corpus-derived "Flow content." / "Phrasing content." child set)
//       whose non-transparent element child's resolved categories do not
//       intersect `permits` (e.g. `<p><div>` — flow inside phrasing). This
//       is the general category class the `required`-driven `context`
//       family structurally CANNOT see (those parents have no `required`),
//       so the two are disjoint by construction — one finding per
//       violation.
//  Cite: the element's own corpus anchor, dom.html#kinds-of-content (the
//  category sub-rule cites dom.html#content-models — the model boundary it
//  enforces).
// ============================================================================

function firstForbiddenDescendant(
	element: Element,
	forbidden: readonly (ContentCategory | string)[],
): Element | null {
	if (forbidden.length === 0) return null
	for (const descendant of element.querySelectorAll('*')) {
		const descendantTag = descendant.tagName.toLowerCase()
		for (const token of forbidden) {
			if (descendantHits(token, descendantTag)) return descendant
		}
	}
	return null
}

const hasConstrainedChildren = whereOf(
	isSubject,
	(subject: RuleSubject): boolean => subject.entry !== null && subject.entry.required.length > 0,
)

const contentRequiredRule: RuleInterface = {
	id: 'content/required',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!hasConstrainedChildren(subject)) return null
		const entry = subject.entry
		if (entry === null) return null
		const children = getChildren(element)
		if (sequenceSatisfied(children, entry.required)) return null
		const expected = entry.required
			.map((segment) => `${expectedCount(segment.count)} <${segment.tag}>`)
			.join(', then ')
		return buildFinding({
			rule: 'content/required',
			severity: 'error',
			element,
			cite: citeOf(entry, 'dom#kinds-of-content'),
			message: `<${subject.tag}> requires a specific child sequence that its children do not satisfy.`,
			expected,
			actual:
				children.map((child) => `<${child.tagName.toLowerCase()}>`).join(', ') ||
				'(no element children)',
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
		const offenderTag = offender.tagName.toLowerCase()
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

// The first ELEMENT child whose resolved effective content categories
// (transparent-resolved via the Phase-2 `effectiveCategories` adapter — the
// SAME resolution `RuleContext.categories` is built from) are NON-EMPTY and
// share NOTHING with the parent's corpus-derived `permits` set. Transparent
// children are skipped: their content model IS their parent's (resolved at
// walk time), so they are permitted wherever their resolved content is —
// the `transparent` family owns their side-channel, not this one. A child
// with EMPTY effective categories (a structural element — `td`/`li`/`dd`/
// `summary`/… all carry `categories: []`) is likewise skipped: its
// placement is governed by the `structure` family's `parent-restricted` /
// `edge-child` / `single-first-child` constraints, never a category match
// — this is exactly the disjoint boundary that keeps `<div><td>` a single
// `structure/parent-restricted` finding, not a double report.
function firstMiscategorizedChild(
	element: Element,
	permits: readonly ContentCategory[],
): Element | null {
	if (permits.length === 0) return null
	for (const child of getChildren(element)) {
		if (isTransparent(child.tagName.toLowerCase())) continue
		const categories = effectiveCategories(child)
		if (categories.length === 0) continue
		if (!categories.some((category) => permits.includes(category))) return child
	}
	return null
}

// Engages ONLY for a bare-category parent (`entry.permits` non-empty). The
// corpus guarantees such a parent has no `required` sequence (its **Content
// model** box is a bare "Flow/Phrasing content.", never "Zero or more …"),
// so this never overlaps `context/parent-model` (fires on `required`) — the
// two families partition the parents disjointly with no shared coverage.
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
		const offenderTag = offender.tagName.toLowerCase()
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
//  the offender's card and NOT a hoisted module string const (§4.6/§5; same
//  anti-pattern as the Phase-2 `FOREIGN_TAGS` impl-file const dropped in
//  d02a480). `restrictingCite` resolves it through the SAME `citeOf(...)`
//  path every other family uses, off the nearest ancestor whose schema
//  entry carries the constraint that imposes the tripped restriction
//  (schema-data-driven — never a second hand-kept restricting-tag list, the
//  Walker already owns that knowledge), with the §3.2.5.1 anchor as the
//  inline fallback for a detached/uncarded chain.
// ============================================================================

// The schema constraint kind (or media `forbidden`) that, carried on an
// ANCESTOR's entry, imposes each transparent restriction. Derived from the
// parity-gated registry, so it stays in lock-step with the cards (the `a` /
// `button` / `canvas` entries' constraints, the media entries' `forbidden`)
// rather than re-stating the Walker's restricting-tag knowledge.
function imposesRestriction(entry: ContentModelEntry, restriction: string): boolean {
	if (restriction === 'media') {
		return entry.forbidden.includes('audio') || entry.forbidden.includes('video')
	}
	if (restriction === 'link') {
		// "no `a` element descendant" is uniquely the transparent-model
		// element's self-nest ban (`<a>`); `no-self-nest` alone is shared by
		// non-transparent `dfn`/`form`/`progress`/`meter`, so gate on the
		// transparent model too — the corpus marks only `a` both transparent
		// AND self-nest-banned, so this resolves to the `<a>` card with no
		// per-tag list.
		return entry.transparent && entry.constraints.some((c) => c.kind === 'no-self-nest')
	}
	// `no-interactive-descendant` / `no-tabindex-descendant` are carried ONLY
	// by the restrictor cards (`a` / `button` / `canvas`) — unambiguous.
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

// node is interactive content (its effective categories include
// `interactive` — schema-resolved by the Walker via effectiveCategories).
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
//  `isVoid()` reports per schema must have no element children. Cite: the
//  schema entry's `cite` / the constraint's `note` carries the spec clause.
// ============================================================================

// `parent-restricted` — the element is only valid inside one of `parents`.
const violatesParentRestricted = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const constraint = constraintOf(subject.entry, 'parent-restricted')
	if (constraint?.parents === undefined) return false
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
		return buildFinding({
			rule: 'structure/parent-restricted',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: constraint?.note ?? `<${subject.tag}> must be a child of ${parents.join(' / ')}.`,
			expected: `child of ${parents.join(' / ')}`,
			actual:
				subject.parent === null
					? '(no parent)'
					: `child of <${subject.parent.tagName.toLowerCase()}>`,
		})
	},
}

// `single-first-child` — when carried on the CHILD entry naming its
// `parents`, the element must be the first element child of that parent;
// when carried on the PARENT entry naming a `child`, that child (if present)
// must be the unique first child.
const violatesSingleFirstChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const own = constraintOf(subject.entry, 'single-first-child')
	if (own?.parents !== undefined) {
		const parent = subject.parent
		if (parent === null || !own.parents.includes(parent.tagName.toLowerCase())) return false
		return getChildren(parent)[0] !== subject.element
	}
	const parentSpec = constraintOf(subject.parentEntry, 'single-first-child')
	if (parentSpec?.child === undefined) return false
	// Evaluate on the constrained child only.
	if (subject.tag !== parentSpec.child) return false
	const siblings = getChildren(subject.parent ?? subject.element)
	const occurrences = siblings.filter((s) => s.tagName.toLowerCase() === parentSpec.child)
	return occurrences.length > 1 || siblings[0]?.tagName.toLowerCase() !== parentSpec.child
})

const structureSingleFirstChildRule: RuleInterface = {
	id: 'structure/single-first-child',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesSingleFirstChild(subject)) return null
		const note =
			constraintOf(subject.entry, 'single-first-child')?.note ??
			constraintOf(subject.parentEntry, 'single-first-child')?.note
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
// of one of `parents`.
const violatesEdgeChild = whereOf(isSubject, (subject: RuleSubject): boolean => {
	const constraint = constraintOf(subject.entry, 'edge-child')
	if (constraint?.parents === undefined) return false
	const parent = subject.parent
	if (parent === null || !constraint.parents.includes(parent.tagName.toLowerCase())) return false
	const siblings = getChildren(parent)
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

// `no-self-nest` — no descendant of the element's own tag.
const violatesNoSelfNest = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (constraintOf(subject.entry, 'no-self-nest') === null) return false
	return subject.element.querySelector(subject.tag) !== null
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

// `group-order` / `child-order` — the element's element-children must
// satisfy the constraint's ordered sequence (generic over ANY sequence).
const ORDER_KINDS = literalOf('group-order', 'child-order')

const violatesOrder = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (subject.entry === null) return false
	for (const constraint of subject.entry.constraints) {
		if (!ORDER_KINDS(constraint.kind)) continue
		if (constraint.sequence === undefined) continue
		if (!sequenceSatisfied(getChildren(subject.element), constraint.sequence)) return true
	}
	return false
})

const structureOrderRule: RuleInterface = {
	id: 'structure/child-order',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesOrder(subject) || subject.entry === null) return null
		const ordered = subject.entry.constraints.find(
			(constraint) => ORDER_KINDS(constraint.kind) && constraint.sequence !== undefined,
		)
		const sequence = ordered?.sequence ?? []
		return buildFinding({
			rule: 'structure/child-order',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: ordered?.note ?? `<${subject.tag}> children must follow the required order.`,
			expected: sequence
				.map((segment) => `${expectedCount(segment.count)} <${segment.tag}>`)
				.join(', then '),
			actual:
				getChildren(element)
					.map((child) => `<${child.tagName.toLowerCase()}>`)
					.join(', ') || '(no element children)',
		})
	},
}

// `no-interactive-descendant` / `no-tabindex-descendant` on an entry are the
// schema mirror of the transparent restrictions the Walker accumulates; the
// transparent family already reports them via `RuleContext.restrictions`, so
// the structure family does NOT re-evaluate those two kinds (one finding per
// violation — no double report).

// `void-has-children` — an element the schema marks `void` must have no
// element children (not encoded as a `ContentConstraint`, derived from
// `isVoid`).
const violatesVoidHasChildren = whereOf(isSubject, (subject: RuleSubject): boolean => {
	if (!isVoid(subject.tag)) return false
	return subject.element.children.length > 0
})

const structureVoidRule: RuleInterface = {
	id: 'structure/void-has-children',
	severity: 'error',
	lens: 'structure',
	evaluate: (element, context): Finding | null => {
		const subject = readSubject(element, context)
		if (!violatesVoidHasChildren(subject)) return null
		return buildFinding({
			rule: 'structure/void-has-children',
			severity: 'error',
			element,
			cite: citeOf(subject.entry, 'dom#content-models'),
			message: `<${subject.tag}> is a void element and must have no children.`,
			expected: 'no children',
			actual: `${subject.element.children.length} element child(ren)`,
		})
	},
}

// ── Registry ────────────────────────────────────────────────────────────────
//
// The frozen, ordered rule registry every Phase-3 family contributes to and
// Phase-4 (`Inspector` / `FindingManager`) consumes unchanged. Each family
// guard above is a named `@elements/core` composition (`whereOf` / `andOf` /
// `notOf` / `literalOf`); the parts-2/3 attribute / interaction families
// extend this same array with the same compositor vocabulary.

/**
 * The frozen inspector rule registry — the four Phase-3 part-1 families
 * (`context` / `content` / `transparent` / `structure`), each a generic
 * schema-data-driven {@link RuleInterface}. Pure: every `evaluate` is
 * side-effect-free and total (one {@link Finding} or `null`). Parts 2/3
 * (attribute / interaction) append to this same array; Phase 4 iterates it.
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
	structureOrderRule,
	structureVoidRule,
] as const
