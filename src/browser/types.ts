// ============================================================================
//  Browser-side type definitions shared across composables / factories.
//
//  Two flavours of declaration land in this file:
//    1. Cross-cutting primitives — `Side`, `Placement`, `DropPosition`,
//       `FormFieldElement`, `TableCell`, … the small scalar / structural
//       types that more than one composable depends on. They live here
//       so `helpers.ts` and any composable can import from a single
//       module without circular imports.
//    2. Per-composable option / return / event-map / detail interfaces.
//       Each `use*` / `create*` declares its own `Use{Name}Options`,
//       `Use{Name}Return`, `Create{Name}Options`, `Create{Name}Instance`,
//       and `Use{Name}EventMap` here so consumers (and the tokens.ts /
//       events.ts parity tests) have a single canonical surface.
//
//  Composable-specific blocks are added when each composable lands. The
//  current file ships only the cross-cutting primitives — composable
//  blocks are filled in turn-by-turn.
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// Theme primitives
// ─────────────────────────────────────────────────────────────────────────

/** Theme color mode currently rendered. Written to `<html data-theme="…">`
 *  ONLY when the user has pinned an explicit choice — when the user is on
 *  `'system'` the attribute is removed and CSS handles the OS-follow via
 *  `@media (prefers-color-scheme: dark)`. */
export type ThemeMode = 'light' | 'dark'

/**
 * User-facing theme setting. `'system'` is the default and defers entirely
 * to the OS `prefers-color-scheme` media query at the CSS layer — the
 * composable removes `<html data-theme="…">` so the framework stylesheet
 * owns the flip. `'light'` and `'dark'` are explicit pins that write the
 * attribute and override the media query.
 */
export type ThemeSetting = ThemeMode | 'system'

export interface ThemeChangeDetail {
	/** Resolved mode (`'light' | 'dark'`) currently rendered. */
	readonly mode: ThemeMode
	/** Raw user setting (`'light' | 'dark' | 'system'`) before resolution. */
	readonly setting: ThemeSetting
}

/**
 * Live shared refs handed by `themeState()` to every `createTheme` wrapper.
 * `setting` is the WRITABLE singleton ref — the wrapper assigns
 * `setting.value` in `set()` — so it is intentionally NOT wrapped in
 * `Readonly<>`. `mode` is the derived `ComputedRef` (read-only by nature).
 * Identity is stable across calls (one singleton per page).
 */
export interface ThemeStateRefs {
	readonly setting: Ref<ThemeSetting>
	readonly mode: ComputedRef<ThemeMode>
}

// ─────────────────────────────────────────────────────────────────────────
// Taxonomy primitives
// ─────────────────────────────────────────────────────────────────────────

export type ElementCategory =
	| 'main-root'
	| 'sectioning-root'
	| 'content-sectioning'
	| 'text-content'
	| 'inline-text'
	| 'image-multimedia'
	| 'embedded-content'
	| 'demarcating-edits'
	| 'table-content'
	| 'forms'
	| 'interactive'
	| 'class-component'

export type ElementTreatment = 'substantive' | 'reset' | 'composable' | 'passthrough'

export interface TaxonomyEntry {
	readonly tag: string
	readonly category: ElementCategory
	readonly treatment: ElementTreatment
	/** `use{Name}` factory key when treatment === 'composable'. */
	readonly composable: string | null
}

// ─────────────────────────────────────────────────────────────────────────
// Content-model schema primitives
// ─────────────────────────────────────────────────────────────────────────
//
// The frozen TS mirror of the W3C content-model corpus (`guides/w3c/**`).
// One `ContentModelEntry` per HTML element the spec cards. The inspector's
// structure lens resolves every element's contextual / content-model /
// transparent rule against this registry. The vocabulary below is derived
// verbatim from `guides/w3c/categories.md` §3.2.5; the entry shape mirrors
// each card's **Categories** / **Contexts** / **Content model** boxes.

/**
 * The HTML content-category vocabulary (`guides/w3c/categories.md` §3.2.5).
 *
 * @remarks
 * The seven categories with explicit element-membership lists (`metadata`,
 * `flow`, `sectioning`, `heading`, `phrasing`, `embedded`, `interactive`),
 * plus `palpable` (the derived non-empty category), `script-supporting`
 * (`script` / `template`, always permitted where a constrained list says
 * "optionally intermixed"), and `transparent` (the §3.2.5.1 model — an
 * element whose content model is its parent's). These are the buckets a
 * `context` / `content` rule checks against.
 */
export type ContentCategory =
	| 'metadata'
	| 'flow'
	| 'sectioning'
	| 'heading'
	| 'phrasing'
	| 'embedded'
	| 'interactive'
	| 'palpable'
	| 'script-supporting'
	| 'transparent'

/**
 * The shape of an element's content model — the kind of children the spec
 * permits.
 *
 * - `transparent` — model derived from the parent (`a`, `ins`, `del`, …).
 * - `void` — no children, no end tag (`br`, `img`, `hr`, …).
 * - `text` — text only (`title`, `textarea`, `option` w/ `label`, …).
 * - `nothing` — neither children nor text (`base`, `col`, `track`, …).
 * - `children` — an element/category-constrained child list (everything
 *   else — flow/phrasing content, the `table` model, list models, …).
 */
export type ContentModel = 'transparent' | 'void' | 'text' | 'nothing' | 'children'

/**
 * The discrete, tree-decidable named constraints the spec attaches to
 * specific elements (encoded as DATA so rules stay generic, never
 * per-element hand-code). Each kind maps to one rule family in Phase 3.
 *
 * - `no-self-nest` — no descendant of the element's own tag (`a`, `dfn`).
 * - `no-interactive-descendant` — no interactive-content descendant
 *   (`a`, `button`).
 * - `no-tabindex-descendant` — no descendant with `tabindex` (`a`,
 *   `button`).
 * - `single-first-child` — exactly one `tag` child, and it must be first
 *   (`summary`→`details`, `legend`→`fieldset`, `caption`→`table`).
 * - `edge-child` — the element must be the first or last child of `parent`
 *   (`figcaption`→`figure`).
 * - `parent-restricted` — the element is only valid inside one of `parents`
 *   (`li`→`ul`/`ol`/`menu`, `td`/`th`→`tr`, `option`→`select`/`optgroup`/
 *   `datalist`).
 *
 * - `single-first-child` — the element must be the unique first element
 *   child of its `parents` (`summary`→`details`, `legend`→`fieldset`,
 *   `caption`→`table`). This is the CHILD-side placement constraint; the
 *   reciprocal PARENT-side ordered model lives in {@link ChildModel}.
 * - `edge-child` — the element must be the first / last / first-or-last
 *   child of one of `parents` (`figcaption`→`figure`).
 *
 * @remarks The pure-ordering kinds (`child-order` / `group-order`) have been
 * folded into the dedicated {@link ChildModel} — an element's ordered child
 * content model is encoded ONCE there (closed sequence vs. structural prefix
 * + open category arm), never duplicated across `required` + a constraint.
 * `single-first-child` / `edge-child` stay: they are the reciprocal
 * CHILD-keyed placement constraints (evaluated on the child, naming its
 * `parents`), not the parent's ordered child model.
 */
export type ContentConstraintKind =
	| 'no-self-nest'
	| 'no-interactive-descendant'
	| 'no-tabindex-descendant'
	| 'single-first-child'
	| 'edge-child'
	| 'parent-restricted'

/**
 * One discrete named constraint, encoded as data. `kind` selects the rule
 * family; the optional fields carry that family's parameters (a constraint
 * only sets the fields its `kind` consumes).
 */
export interface ContentConstraint {
	readonly kind: ContentConstraintKind
	/** Allowed parent tags (`parent-restricted`) or the required single
	 *  parent (`single-first-child` / `edge-child`). */
	readonly parents?: readonly string[]
	/**
	 * Qualifies a `parent-restricted` constraint with the spec's
	 * child-vs-descendant distinction (the corpus card's **Contexts** prose):
	 *
	 * - `'child'` ⇒ the element must be a *direct* flat-tree child of one of
	 *   `parents` (the ~13 "**as a child of** X" / "inside an X element"
	 *   constraints — `li`→ul/ol/menu, `td`/`th`→tr, `tr`→thead/tbody/tfoot,
	 *   `rt`/`rp`→ruby, `source`→picture/media, `track`→media,
	 *   `col`/`colgroup`/`tbody`/`thead`/`tfoot`→table/colgroup). This is the
	 *   deliberate `<div><td>` detection.
	 * - `'descendant'` ⇒ the element must merely have one of `parents` as a
	 *   flat-tree *ancestor*; spec-permitted generic wrappers (`<div>` /
	 *   `<noscript>`) may sit between them (the ~2 "**as a descendant of** X"
	 *   constraints — `option`/`optgroup`→select/optgroup/datalist).
	 *
	 * It is effectively REQUIRED on every `parent-restricted` constraint: the
	 * schema populates it on all of them and `tests/guides/w3c.test.ts`
	 * asserts each `parent-restricted` constraint carries an explicit
	 * `relation` bound to the card's Contexts wording, so the distinction is
	 * always parity-gated and the `?:` optionality can never silently drift.
	 * The optionality is type-level ergonomics only; the rule layer treats a
	 * `parent-restricted` constraint with no `relation` as `'child'`.
	 */
	readonly relation?: 'child' | 'descendant'
	/** The constrained child tag (`single-first-child` — e.g. `summary`). */
	readonly child?: string
	/** Which edge the element must occupy (`edge-child`). */
	readonly edge?: 'first' | 'last' | 'first-or-last'
	/** Human-readable restatement of the spec clause, for the Finding
	 *  message Phase 3/4 emit. */
	readonly note?: string
}

/**
 * Child-sequence cardinality. `'?'` zero-or-one · `'*'` zero-or-more ·
 * `'+'` one-or-more · `'1'` exactly one.
 */
export type ContentCount = '?' | '*' | '+' | '1'

// ─────────────────────────────────────────────────────────────────────────
// The ordered child content model (the ONE encoding — replaces the
// overloaded `required` + the `child-order`/`group-order` constraint
// duplication)
// ─────────────────────────────────────────────────────────────────────────
//
// An element whose **Content model** box constrains the ORDER / CARDINALITY
// of its element children (the `table` model, `picture`, `ul`/`ol`/`menu`,
// `hgroup`, `dl`, `ruby`, `select`, `optgroup`, `colgroup`,
// `tbody`/`thead`/`tfoot`/`tr`, `details`, `fieldset`, `figure`, `html`)
// carries exactly one {@link ChildModel}. It is the SINGLE source of that
// element's ordered child shape — no second copy in a constraint, so the
// content/structure rules consume one datum and emit one finding per
// violation (the §1/§2 double-report root cause is structurally gone).
//
// The model is an ordered list of {@link ChildSegment}s plus a `closed`
// discriminator:
//
//   - `closed: true` — EXHAUSTIVE: the children are EXACTLY the listed
//     segments, in order; no child outside the segments' tags is permitted
//     (`table`, `picture`, `ul`/`ol`/`menu`, `hgroup`, `dl`, `select`,
//     `optgroup`, `colgroup`, `tbody`/`thead`/`tfoot`/`tr`, `html`, `ruby`).
//   - `closed: false` — PREFIX + open arm: the leading tag segments are a
//     structural PREFIX, followed by a trailing open content-category arm
//     that absorbs any number of category-matching children (`details` =
//     one `summary` then *flow content*; `fieldset` = optional `legend`
//     then *flow content*; `figure` = `figcaption` first-or-last around
//     *flow content*). The trailing `category` segment IS the open arm.
//
// `script` / `template` (script-supporting, `categories.md` §3.2.5) are
// always tolerated interleaved where the prose says "optionally intermixed
// with script-supporting elements" — the rules add them implicitly so the
// schema stays a faithful transcription of the prose.

/**
 * One segment of a {@link ChildModel}'s ordered child sequence.
 *
 * - `tag` — a run of one tag at a cardinality (`source`*, `img`×1, `li`*).
 * - `category` — an OPEN content-category arm: any number of children in
 *   that category, in place (the trailing *flow content* of `details` /
 *   `fieldset` / `figure`). Only ever appears in a non-`closed` model (or
 *   inside a `choice` arm that models a prefix/suffix-flow shape).
 * - `group` — a repeating GROUP: `count` copies of the inner `segments`
 *   run, in order (`dl` = zero-or-more groups of one-or-more `dt` then
 *   one-or-more `dd`; `ruby` = one-or-more base-then-annotation groups).
 * - `choice` — an ALTERNATION: the children here satisfy exactly one of
 *   `options` (each an ordered segment list). Models the spec's "Either:
 *   … Or: …" boxes (`table`'s `tbody`* vs. `tr`+; `figure`'s three arms;
 *   `dl`'s group-form vs. `div`-form; `select`'s drop-down arm).
 */
export type ChildSegment =
	| { readonly kind: 'tag'; readonly tag: string; readonly count: ContentCount }
	| { readonly kind: 'category'; readonly category: ContentCategory }
	| {
			readonly kind: 'group'
			readonly count: ContentCount
			readonly segments: readonly ChildSegment[]
	  }
	| { readonly kind: 'choice'; readonly options: readonly (readonly ChildSegment[])[] }

/**
 * An element's ordered child content model — the ONE faithful encoding of a
 * **Content model** box that constrains child order / cardinality. Replaces
 * the overloaded `ContentModelEntry.required` field and the redundant
 * `child-order` / `group-order` constraint `sequence` duplication: an
 * element's ordered model now lives here and NOWHERE else, so the content
 * and structure rule families consume a single datum and report exactly one
 * finding per violation.
 *
 * @remarks
 * - `segments` — the ordered child sequence (see {@link ChildSegment}).
 * - `closed` — `true` ⇒ EXHAUSTIVE (only the listed segment tags, in order;
 *   the spec's "Zero or more X, followed by one Y" closed boxes). `false` ⇒
 *   the segments are a structural PREFIX terminated by an open `category`
 *   arm (the spec's "One `summary` followed by flow content" prefix boxes).
 * - `note` — the verbatim **Content model** prose, for the `Finding`
 *   message (the parity test binds every segment back to this prose).
 */
export interface ChildModel {
	readonly segments: readonly ChildSegment[]
	readonly closed: boolean
	readonly note: string
}

/**
 * An attribute-coupling rule — an attribute whose presence requires
 * another attribute (`a[target]` ⇒ `href`), a value domain (`bdo` ⇒
 * `dir∈{ltr,rtl}`), or a mandatory attribute (`data` ⇒ `value`). The
 * Phase-3 `attribute` family consumes these; Phase 1 only records them.
 */
export interface AttributeRule {
	readonly attribute: string
	/** Sibling attribute that must also be present when `attribute` is. */
	readonly requires?: string
	/** Closed value domain for `attribute` when present. */
	readonly values?: readonly string[]
	/** `attribute` is mandatory on the element (not merely coupled). */
	readonly required?: boolean
	readonly note?: string
}

/**
 * One frozen content-model registry row — the TS mirror of one
 * `guides/w3c/**` element card. Authoring surface is the frozen
 * `contentModel` array in `schema.ts`; the `@elements/core` `ContractShape`
 * in `schema.ts` is this interface's compiled contract (guard + JSON
 * Schema + generator), derived from this declaration, never duplicated.
 */
export interface ContentModelEntry {
	/** Lowercase tag name, no chevrons (`a`, `li`, `h1`). */
	readonly tag: string
	/** Content categories the element belongs to (card **Categories**). */
	readonly categories: readonly ContentCategory[]
	/** Allowed-parent / ancestor context (card **Contexts**), restated. */
	readonly context: string
	/** The element's content-model shape (card **Content model**). */
	readonly model: ContentModel
	/**
	 * The element's ORDERED child content model — present iff the card's
	 * **Content model** box constrains child order / cardinality (the
	 * `table` model, `picture`, `ul`/`ol`/`menu`, `hgroup`, `dl`, `ruby`,
	 * `select`, `optgroup`, `colgroup`, `tbody`/`thead`/`tfoot`/`tr`,
	 * `details`, `fieldset`, `figure`, `html`). The SINGLE source of that
	 * shape (see {@link ChildModel}); omitted for free flow/phrasing parents
	 * (those carry `permits`) and for `void`/`nothing`/`text`/`transparent`
	 * models. A parent never carries BOTH `childModel` and `permits` — that
	 * disjointness is guarded by the parity test, and is what keeps the
	 * content/structure rules from double-firing.
	 */
	readonly childModel?: ChildModel
	/**
	 * The content category(ies) this element permits as ELEMENT children when
	 * its content model is a *bare content category* — i.e. the card's
	 * **Content model** box reads "Flow content." / "Phrasing content."
	 * (optionally narrowed by "but with no … descendants", which the
	 * `forbidden` field already carries). Derived verbatim from that prose:
	 * "Flow content" ⇒ `['flow']`, "Phrasing content" ⇒ `['phrasing']`.
	 *
	 * @remarks Deliberately **omitted / empty** for every element whose
	 * children are governed otherwise, so the rule families stay disjoint
	 * (one finding per violation):
	 * - `void` / `nothing` / `text` / `transparent` models (no element
	 *   children, or resolved at walk time);
	 * - structured parents whose child list is an ordered/cardinal model
	 *   carried in `childModel` (`table`, `ul`, `ol`, `menu`, `tr`, `dl`,
	 *   `picture`, `ruby`, `select`, `optgroup`, `hgroup`, `details`,
	 *   `fieldset`, `figure`, `colgroup`, `tbody`/`thead`/`tfoot`, …) —
	 *   those are owned by the `content`/`structure` `childModel` rule.
	 *
	 * The `content` family's "child not an allowed category" sub-rule reads
	 * this: a parent with non-empty `permits` whose non-transparent element
	 * child's resolved categories do not intersect it is a content-model
	 * violation (`dom.html#content-models`). `childModel` and `permits` are
	 * mutually exclusive on any entry (parity-guarded).
	 */
	readonly permits?: readonly ContentCategory[]
	/** Forbidden descendant categories / tags the card's prose names
	 *  (e.g. `dt` forbids `header`/`footer`/sectioning/heading). */
	readonly forbidden: readonly (ContentCategory | string)[]
	/** Discrete named constraints, as data (see {@link ContentConstraint}). */
	readonly constraints: readonly ContentConstraint[]
	/** Attribute-coupling rules the card states. */
	readonly attributes: readonly AttributeRule[]
	/** True when `model === 'transparent'`. */
	readonly transparent: boolean
	/** True when `model === 'void'` (no children, no end tag). */
	readonly void: boolean
	/** The `guides/w3c` card anchor — `{file}#{slug}` (e.g.
	 *  `texts#the-a-element`). The Phase-1 parity test resolves it. */
	readonly cite: string
}

// ─────────────────────────────────────────────────────────────────────────
// Inspector context primitives
// ─────────────────────────────────────────────────────────────────────────
//
// Phase 2 of the semantic HTML inspector: the Walker (the DOM-walk spine,
// a thin layer over `traversals`) and the per-node `RuleContext` the
// Phase-3 rule families consume. The Walker yields every relevant element
// in a live subtree — descending the flat tree (shadow roots, slotted
// elements, `<template>` content) and skipping foreign-content subtrees
// (`<svg>` / `<math>`, `guides/w3c/categories.md` §3.2.5.2.6) — and resolves
// each yielded node's `RuleContext`. The structure lens never reads style;
// the presentation lens (Phase 5) pulls `RuleContext.style()` lazily.

/**
 * The accumulated descendant restrictions an ancestor imposes on a node —
 * the transparent-content-model side-channel the spec attaches to specific
 * containers (`a`, `button`, `canvas`, media elements). Each flag is `true`
 * once *any* ancestor on the resolved chain forbids that descendant kind;
 * the Phase-3 `transparent` rule family reads them directly.
 *
 * @remarks
 * - `interactive` — no interactive-content descendant permitted (an
 *   ancestor `a` / `button` / `canvas`,
 *   `dom.html#the-a-element` "no interactive content descendant").
 * - `link` — no `a` descendant permitted (inside an ancestor `a`).
 * - `tabindex` — no descendant with the `tabindex` attribute (inside an
 *   ancestor `a` / `button`).
 * - `media` — no nested `audio` / `video` descendant (inside an ancestor
 *   `audio` / `video`).
 */
export interface RuleRestrictions {
	readonly interactive: boolean
	readonly link: boolean
	readonly tabindex: boolean
	readonly media: boolean
}

/**
 * The per-node resolved context the Walker hands every rule. Built once per
 * yielded element; the structure lens reads `model` / `categories` /
 * `parents` / `restrictions` and never touches `style` (the lazy
 * presentation accessor — only the Phase-5 lens calls it, and it is memoized
 * so repeated calls cost one `getComputedStyle`).
 *
 * @remarks
 * - `model` — the element's *effective* content model. For a transparent
 *   element (`a`, `ins`, `del`, `object`, `video`, `audio`, `canvas`, `map`,
 *   `slot`) this is the model its nearest non-transparent ancestor imposes;
 *   a transparent element with no parent resolves to `'children'` (the
 *   flow-content fallback the spec mandates). For every other known element
 *   it is the element's own schema model; `null` for an unknown tag.
 * - `categories` — the element's effective content categories: a
 *   transparent element exposes the categories of the model it resolved to
 *   (flow when detached), so a rule asking "is this flow content?" gets the
 *   spec answer without re-walking.
 * - `parents` — the resolved ancestor chain, nearest first
 *   (`traversals.getAncestors()` directly — closest ancestor at index 0).
 * - `restrictions` — see {@link RuleRestrictions}; accumulated across
 *   `parents`.
 * - `style` — lazily-computed, memoized `getComputedStyle(element)`. The
 *   structure lens must not call it; the presentation lens does.
 */
export interface RuleContext {
	readonly element: Element
	readonly model: ContentModel | null
	readonly categories: readonly ContentCategory[]
	readonly parents: readonly Element[]
	readonly restrictions: RuleRestrictions
	readonly style: () => CSSStyleDeclaration
}

/**
 * The contract the {@link RuleContext}-producing DOM-walk spine implements
 * (the §4.5 behavioral-interface role). `walk` is the lazy generator the
 * inspector iterates (`for…of`, O(depth), no recursion limit) — it yields
 * every relevant element of the flat subtree rooted at the Walker's host,
 * descending shadow roots / slotted elements / `<template>` content and
 * skipping foreign-content (`<svg>` / `<math>`) subtrees. `context`
 * resolves the per-node {@link RuleContext} (transparent model resolved
 * over live ancestors).
 *
 * @remarks
 * - `walk()` — lazy depth-first generator over the flat subtree.
 * - `nodes()` — the eager frozen array snapshot of `walk()` (DOM-safe to
 *   iterate while mutating, per `traversals.md` §Contract 6).
 * - `context(element)` — the resolved {@link RuleContext} for one element.
 */
export interface WalkerInterface {
	readonly element: Element
	readonly walk: () => Generator<Element, void, unknown>
	readonly nodes: () => readonly Element[]
	readonly context: (element: Element) => RuleContext
}

// ─────────────────────────────────────────────────────────────────────────
// Inspector rule + finding primitives
// ─────────────────────────────────────────────────────────────────────────
//
// Phase 3 of the semantic HTML inspector: the rule contract + the data
// record every rule emits. A rule is a PURE, side-effect-free record —
// `(element, context) => Finding | null` — composed from `@elements/core`
// validator compositors so each rule reads as a named guard composition,
// never ad-hoc boolean spaghetti, and driven by the frozen `schema` data so
// the families stay generic (one rule per content-model concern, never a
// per-element branch). The structure lens (this phase) produces only
// `'structure'`-lens findings; the `'presentation'` lens value exists for
// the Phase-5 computed-style lens. `Finding` is the shared shape every
// Phase-3 family and the Phase-4 `FindingManager` / `Inspector` consume;
// Phase 4 later compiles it (minus the live `element` ref) to an
// `@elements/core` ContractShape — the record declared here stays the one
// source of truth that compilation derives from, never duplicated.

/**
 * How severe a {@link Finding} is. `error` — a hard content-model violation
 * the spec forbids; `warning` — a likely-unintended structure the spec
 * discourages; `advice` — a non-conformance the spec merely notes.
 */
export type FindingSeverity = 'error' | 'warning' | 'advice'

/**
 * Which inspection lens produced a rule. `structure` — the DOM-shape /
 * content-model lens (Phase 3, schema-driven, never reads style);
 * `presentation` — the computed-style lens (Phase 5, load-bearing rendering
 * overrides). Defining the union member now is types-first; only
 * `structure`-lens rules exist in this phase.
 */
export type RuleLens = 'structure' | 'presentation'

/**
 * One reported content-model violation — a pure data record (no behavior,
 * every member `readonly`, single-word per §4.1). Emitted by a
 * {@link RuleInterface}'s `evaluate`; collected by the Phase-4
 * `FindingManager`.
 *
 * @remarks
 * - `severity` — see {@link FindingSeverity}.
 * - `rule` — the emitting rule's {@link RuleInterface.id}.
 * - `element` — the live offending element (the Phase-4 ContractShape omits
 *   this non-serializable ref; the record keeps it for in-memory consumers).
 * - `path` — the stable DOM path to the element, nearest first, via the
 *   Phase-2 `nodePath` helper (which wraps `getPathToAncestor()`).
 * - `message` — the human-readable restatement of the violated clause.
 * - `cite` — the `guides/w3c` anchor carried on the schema entry's `cite`
 *   (`{file}#{slug}`), so every finding resolves back to the corpus.
 * - `expected` / `actual` — the spec-expected vs. observed shape, when the
 *   rule can name them (cardinality / order / category mismatches).
 */
export interface Finding {
	readonly severity: FindingSeverity
	readonly rule: string
	readonly element: Element
	readonly path: readonly Element[]
	readonly message: string
	readonly cite: string
	readonly expected?: string
	readonly actual?: string
}

/**
 * The contract one inspector rule satisfies (the §4.5 behavioral role for a
 * pure-record rule — the rule *is* this record, there is no rule class, so
 * `Interface` marks the contract that `rules` entries conform to, mirroring
 * how `WalkerInterface` contracts the walk spine). `evaluate` is **pure and
 * total**: it never throws, has no shared mutable state, and returns exactly
 * one {@link Finding} for a violation or `null` for a clean node.
 *
 * @remarks
 * - `id` — the stable rule identifier (`{family}/{concern}`), copied onto
 *   every {@link Finding.rule} it emits.
 * - `severity` — the {@link FindingSeverity} every finding it emits carries.
 * - `lens` — the {@link RuleLens} this rule belongs to.
 * - `evaluate` — `(element, context) => Finding | null`, side-effect-free.
 */
export interface RuleInterface {
	readonly id: string
	readonly severity: FindingSeverity
	readonly lens: RuleLens
	readonly evaluate: (element: Element, context: RuleContext) => Finding | null
}

/**
 * The per-node projection every rule-family guard composes over — the live
 * element, its resolved {@link RuleContext}, its lowercased tag, the
 * FLAT-tree content parent (slot conduits collapsed — agreeing with the
 * Walker spine, never light-DOM `parentElement`), and the pre-resolved
 * schema entries for it and its parent. Resolving these once keeps each rule
 * a pure named guard composition over a single value rather than re-deriving
 * them inside ad-hoc boolean expressions.
 *
 * @remarks
 * A PUBLIC seam. `src/browser/index.ts` re-exports `types.ts` wholesale via
 * `export type *`, so every type declared here is part of the public API by
 * the project's barrel idiom — there is no "declared-but-not-exported"
 * carve-out (§5/§6). `RuleSubject` is therefore documented honestly as the
 * public rule-authoring projection a custom {@link RuleInterface} composes
 * over; it is not an internal-only type, and claiming otherwise contradicted
 * the barrel.
 */
export interface RuleSubject {
	readonly element: Element
	readonly context: RuleContext
	readonly tag: string
	readonly entry: ContentModelEntry | null
	readonly parent: Element | null
	readonly parentEntry: ContentModelEntry | null
}

/**
 * The inputs a rule hands the shared finding builder before it attaches the
 * stable DOM `path` (so a rule never restates the path-derivation). Mirrors
 * {@link Finding} minus `path` (the builder computes it via the Phase-2
 * `nodePath` adapter).
 *
 * @remarks
 * A PUBLIC seam, for the same reason as {@link RuleSubject}: `types.ts` is
 * re-exported wholesale through the sole barrel (`export type *`), so this
 * is part of the public rule-authoring surface (a custom rule builds a
 * `FindingDraft` and the shared builder turns it into a {@link Finding}).
 * Documented honestly as public — no contradictory "internal" claim.
 */
export interface FindingDraft {
	readonly rule: string
	readonly severity: FindingSeverity
	readonly element: Element
	readonly cite: string
	readonly message: string
	readonly expected?: string
	readonly actual?: string
}

/**
 * One integer-valued attribute the W3C corpus bounds, with the spec-stated
 * range the Phase-3 `attribute` family's `attribute/integer` rule enforces
 * via the `@elements/core` `parseInteger` parser. The bound DATA lives in
 * `constants.ts § ATTRIBUTE_INTEGER_BOUNDS` (the §5 home for module data,
 * corpus-bound by `tests/guides/w3c.test.ts`); this is its shape.
 *
 * @remarks
 * - `attribute` — the lowercased attribute name (`tabindex`, `span`,
 *   `colspan`, `rowspan`).
 * - `min` / `max` — the inclusive corpus bound, omitted when the spec states
 *   no bound (`tabindex` is "a valid integer" with no range).
 * - `tags` — the element tags the bound applies to, omitted for a GLOBAL
 *   attribute that applies to any element (`tabindex`).
 * - `cite` — the `guides/w3c` card anchor the corpus bound is stated in, so
 *   the parity gate binds the constant back to the prose bidirectionally.
 */
export interface AttributeIntegerBound {
	readonly attribute: string
	readonly min?: number
	readonly max?: number
	readonly tags?: readonly string[]
	readonly cite: string
}

/**
 * One global enumerated attribute whose closed keyword domain the W3C corpus
 * cards STATE — the Phase-3 `attribute` family's `attribute/enum` rule
 * coerces the value through the `@elements/core` `parseEnum` parser over
 * `values`. The DATA lives in `constants.ts § ATTRIBUTE_ENUM_DOMAINS`
 * (corpus-bound by `tests/guides/w3c.test.ts`); this is its shape.
 *
 * @remarks
 * - `attribute` — the lowercased attribute name (`dir`, `contenteditable`,
 *   `inputmode`).
 * - `values` — the closed keyword domain, verbatim from the corpus card.
 * - `empty` — `true` iff the empty-string value is a valid keyword (the
 *   `contenteditable` *true* state — the card states "`true` (or the empty
 *   string)"), so a present-but-empty attribute is faithful, not a violation.
 * - `cite` — the `guides/w3c` card anchor the keyword domain is stated in
 *   (the parity gate resolves it, same discipline as the schema `cite`).
 */
export interface AttributeEnumDomain {
	readonly attribute: string
	readonly values: readonly string[]
	readonly empty?: boolean
	readonly cite: string
}

// ─────────────────────────────────────────────────────────────────────────
// Popover placement primitives
// ─────────────────────────────────────────────────────────────────────────

/** Logical popover side. `start` / `end` are inline-axis. */
export type Side = 'top' | 'end' | 'bottom' | 'start'
/** Optional alignment along the popover's flat edge against the anchor. */
export type Alignment = 'start' | 'end'
/** Combined placement — bare side, or side-aligned corner. */
export type Placement = Side | `${Side}-${Alignment}`
/** Popover positioning strategy. `absolute` participates in layout flow;
 *  `fixed` floats above stacking contexts. */
export type Strategy = 'absolute' | 'fixed'
/** Discriminator across popover-derived widgets. Drives chrome class names
 *  (`popover` for rich content, `tooltip` for inline labels). */
export type PopoverKind = 'popover' | 'tooltip'
/** Trigger interaction that opens the popover. */
export type PopoverTrigger = 'hover' | 'focus' | 'click'

export interface PopoverPlaceDetail {
	readonly placement: Placement
}

// ─────────────────────────────────────────────────────────────────────────
// Drag / drop primitives
// ─────────────────────────────────────────────────────────────────────────

/** Insertion position relative to the item currently under the drag cursor. */
export type DropPosition = 'before' | 'after' | 'into'

/** Detail for `elements:drag:tap` — single click on a row. */
export interface DragTapDetail {
	readonly index: number
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:start` — native drag has begun. */
export interface DragStartDetail {
	readonly indices: ReadonlySet<number>
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:over` — native drag hovering a candidate target. */
export interface DragOverDetail {
	readonly index: number
	readonly position: DropPosition
	readonly target: HTMLElement
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:drop` — native drop over a target. */
export interface DragDropDetail {
	readonly index: number | null
	readonly position: DropPosition | null
	readonly target: HTMLElement | null
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:end` — drag terminated for any reason. */
export interface DragEndDetail {
	readonly cancelled: boolean
	readonly pointer: PointerEvent | null
}

/** Detail for `elements:drag:reorder` — successful in-list reorder. */
export interface DragReorderDetail {
	readonly from: readonly number[]
	readonly to: number
	readonly items: readonly unknown[]
}

// ─────────────────────────────────────────────────────────────────────────
// Misc cross-cutting details
// ─────────────────────────────────────────────────────────────────────────

export interface ButtonToggleDetail {
	readonly active: boolean
}

/** Slide direction for carousel transitions. `'left'` = forwards (next),
 *  `'right'` = backwards (prev). LTR-physical naming because the
 *  transition classes use the same axis. */
export type CarouselDirection = 'left' | 'right'

export interface CarouselSlideDetail {
	readonly direction: CarouselDirection
	readonly from: number
	readonly to: number
}

export interface NavActivateDetail {
	readonly id: string
}

// ─────────────────────────────────────────────────────────────────────────
// DOM traversal primitives
// ─────────────────────────────────────────────────────────────────────────

/** Predicate over an element — the matching contract for the `find*`
 *  / `walk*` traversal helpers. */
export type ElementPredicate = (element: Element) => boolean

/** Criteria bag consumed by `createMatcher` to build an `ElementPredicate`. */
export interface MatcherOptions {
	readonly tag?: string
	readonly id?: string
	readonly class?: string
	readonly classes?: readonly string[]
	readonly attributes?: Readonly<Record<string, string | undefined>>
}

// ─────────────────────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────────────────────

/** Native form-associated control element. */
export type FormFieldElement =
	| HTMLButtonElement
	| HTMLFieldSetElement
	| HTMLInputElement
	| HTMLObjectElement
	| HTMLOutputElement
	| HTMLSelectElement
	| HTMLTextAreaElement

/**
 * One `FormData` entry. Multi-value fields (checkbox groups, multi-selects,
 * `<input type="file" multiple>`) appear once per value, so the same `name`
 * may repeat across the array — duplicates are preserved on purpose.
 */
export interface FormEntry {
	readonly name: string
	readonly value: FormDataEntryValue
}

export interface FormError {
	readonly name: string
	readonly message: string
	readonly validity: ValidityState
}

export interface FormInputDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormChangeDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormSubmitDetail {
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormValidateDetail {
	readonly errors: readonly FormError[]
	readonly valid: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Table primitives
// ─────────────────────────────────────────────────────────────────────────

/** Acceptable cell input. `Node` is appended as a child; everything else
 *  becomes the cell's text content. */
export type TableInput = string | number | boolean | null | undefined | Node
/** Cell value as read back from a row. Always serialized to string. */
export type TableValue = string
/** A row's cells as an immutable array of values. */
export type TableRow = readonly TableValue[]
/** A row's cells as input values. */
export type TableInputRow = readonly TableInput[]

/** Body-cell coordinate inside a table. Both axes are 0-based. */
export interface TableCell {
	readonly row: number
	readonly column: number
}

/** Closed range of body-row indices. Both bounds inclusive. */
export interface TableRange {
	readonly from: number
	readonly to: number
}

/** Selection / focus / sort target. Either a sentinel, single row,
 *  cell coordinate, or row range. */
export type TableTarget = 'all' | number | TableCell | TableRange

/** Direction for a sorted column. `'none'` is the unsorted state. */
export type TableSortDirection = 'asc' | 'desc' | 'none'

/** Single entry in the active sort list (in priority order). */
export interface TableSortEntry {
	readonly key: string
	readonly direction: Exclude<TableSortDirection, 'none'>
}

/** Selection scope strategy applied by select-all operations. */
export type TableStrategy = 'single' | 'page' | 'all'

/** Arrow-key navigation direction inside a grid. */
export type TableDirection = 'up' | 'down' | 'left' | 'right'

/** Logical sub-region of a `<table>` that an action targets. */
export type TablePart =
	| 'caption'
	| 'headers'
	| 'rows'
	| 'cells'
	| 'footer'
	| 'selection'
	| 'expansion'
	| 'sort'
	| 'resize'
	| 'focus'

/** Mutation verb a table action expresses. */
export type TableAction =
	| 'set'
	| 'append'
	| 'prepend'
	| 'insert'
	| 'update'
	| 'remove'
	| 'move'
	| 'swap'
	| 'clear'
	| 'refresh'

// ─────────────────────────────────────────────────────────────────────────
// Per-composable option / return / instance blocks. Order alphabetical.
// ─────────────────────────────────────────────────────────────────────────

import type { ComputedRef, Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePointer
// ─────────────────────────────────────────────────────────────────────────

export interface UsePointerEventMap {
	readonly start: (event: PointerEvent) => void
	readonly move: (event: PointerEvent) => void
	readonly end: (event: PointerEvent) => void
}

export interface CreatePointerOptions {
	/** Cursor applied to `document.body` for the duration of the drag. */
	readonly cursor?: string
	/** Pure decision callback — return `false` to reject a `pointerdown`. */
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface CreatePointerInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UsePointerOptions {
	readonly cursor?: string
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface UsePointerReturn {
	readonly dragging: Readonly<Ref<boolean>>
	/** Programmatically cancel an in-progress drag and restore body styles. */
	readonly clear: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTheme
// ─────────────────────────────────────────────────────────────────────────

export interface UseThemeEventMap {
	/** `event.detail` is `ThemeChangeDetail`. */
	readonly change: (event: CustomEvent) => void
}

export interface CreateThemeOptions {
	/**
	 * Initial setting when nothing is stored. Defaults to `'system'` —
	 * `<html>` carries no `data-theme` attribute and the stylesheet's
	 * `@media (prefers-color-scheme: dark)` rule handles the OS-follow on
	 * its own. Pick `'light'` or `'dark'` for an explicit pin.
	 */
	readonly initial?: ThemeSetting
	/** Persistence. Defaults to `localStorage` under the framework's
	 *  `STORAGE_KEY_THEME`. `false` disables it; an object with `key`
	 *  overrides the storage key. */
	readonly storage?: false | { readonly key?: string }
	readonly on?: Partial<UseThemeEventMap>
}

export interface CreateThemeInstance {
	/** User's raw choice (`'light' | 'dark' | 'system'`). Use this for
	 *  tri-state UI surfaces (segmented button, dropdown). */
	readonly setting: Readonly<Ref<ThemeSetting>>
	/** Resolved mode (`'light' | 'dark'`) currently rendered. Tracks
	 *  `setting` when explicit; mirrors `prefers-color-scheme` when
	 *  `setting === 'system'`. Use this for binary UI affordances (sun /
	 *  moon icon swap). */
	readonly mode: Readonly<Ref<ThemeMode>>
	/** Pick light, dark, or system. No-op when the value matches the
	 *  current setting. */
	readonly set: (next: ThemeSetting) => void
	/** Binary flip between explicit light and dark — anchors the choice
	 *  away from `'system'`. Call `set('system')` to opt back into OS
	 *  follow. */
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseThemeOptions extends CreateThemeOptions {}

export interface UseThemeReturn {
	readonly setting: Readonly<Ref<ThemeSetting>>
	readonly mode: Readonly<Ref<ThemeMode>>
	readonly set: (next: ThemeSetting) => void
	readonly toggle: () => void
}

// `ComputedRef` is re-exported here so per-composable blocks below can use
// it without each one re-importing from 'vue'. The first import must stay
// in alphabetical order with `Ref`.
export type { ComputedRef, Ref }

import type { CSSProperties } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePopover
// ─────────────────────────────────────────────────────────────────────────

export interface UsePopoverEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired after placement is refreshed. `event.detail` is `PopoverPlaceDetail`. */
	readonly place: (event: CustomEvent) => void
}

export interface CreatePopoverElements {
	/** Reference (anchor) element. */
	readonly anchor: HTMLElement
	/** Floating panel element (must be in the DOM, ideally teleported to body). */
	readonly panel: HTMLElement
	/** Optional arrow inside the panel. */
	readonly arrow?: HTMLElement | null
}

export interface CreatePopoverOptions {
	/** Placement for the floating panel. `false` keeps native visibility
	 *  without applying any placement attributes. */
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface CreatePopoverInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UsePopoverOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface UsePopoverReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDialog (← useModal). Bound to the native `<dialog>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDialogEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired when a dismiss attempt is blocked by `dismiss.backdrop: 'static'`. */
	readonly prevent: (event: CustomEvent) => void
}

export interface CreateDialogOptions {
	/** `false` calls `dialog.show()` (non-modal). Default `true`. */
	readonly modal?: boolean
	readonly dismiss?: {
		/** `true` dismiss on `::backdrop` click. `'static'` fires `prevent`. */
		readonly backdrop?: boolean | 'static'
		readonly escape?: boolean
	}
	readonly scroll?: {
		/** Lock body scroll when `modal: false` (modal dialogs already lock natively). */
		readonly lock?: boolean
	}
	readonly on?: Partial<UseDialogEventMap>
}

export interface CreateDialogInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDialogOptions extends CreateDialogOptions {}

export interface UseDialogReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDetails (← useCollapse). Bound to the native `<details>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDetailsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateDetailsOptions {
	/** Open on mount. Default `false`. */
	readonly initial?: boolean
	/** Optional accordion container — opening one panel closes its open siblings. */
	readonly accordion?: HTMLElement | null
	readonly on?: Partial<UseDetailsEventMap>
}

export interface CreateDetailsInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDetailsOptions {
	readonly initial?: boolean
	readonly accordion?: Ref<HTMLElement | null>
	readonly on?: Partial<UseDetailsEventMap>
}

export interface UseDetailsReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAside (← useOffcanvas). Bound to the native `<aside>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAsideEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateAsideOptions {
	/**
	 * Initial popover mode. `'auto'` (default) opts into native
	 * light-dismiss (Escape + outside-click). `'manual'` opts out — the
	 * panel only closes via a programmatic `hide()` or an inner
	 * `popovertargetaction="hide"` button. `false` leaves whatever the
	 * author put on the element (use when the markup already declares
	 * `popover="manual"` and you don't want the composable to overwrite).
	 */
	readonly popover?: 'auto' | 'manual' | false
	readonly on?: Partial<UseAsideEventMap>
}

export interface CreateAsideInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseAsideOptions extends CreateAsideOptions {}

export interface UseAsideReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTooltip
// ─────────────────────────────────────────────────────────────────────────

export interface UseTooltipEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly place: (event: CustomEvent) => void
}

export interface CreateTooltipElements {
	readonly anchor: HTMLElement
	readonly panel: HTMLElement
	readonly arrow?: HTMLElement | null
}

export interface CreateTooltipOptions {
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface CreateTooltipInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UseTooltipOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface UseTooltipReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useMenu (← useDropdown). Bound to the native `<menu>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseMenuEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateMenuElements {
	readonly toggle: HTMLElement
	readonly menu: HTMLMenuElement
}

export interface CreateMenuOptions {
	readonly placement?: Placement
	readonly strategy?: Strategy
	readonly offset?: number
	/** Min item-rows the requested side must hold before the menu commits.
	 *  `0` opts out — surplus rows scroll inside the panel. Default 5. */
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface CreateMenuInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: Placement }) => void
	readonly destroy: () => void
}

export interface UseMenuOptions {
	readonly placement?: Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface UseMenuReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useSelect. Bound to the native `<menu>` listbox; layers WAI-ARIA
// listbox + optional combobox semantics on top of `useMenu`.
// ─────────────────────────────────────────────────────────────────────────

/** Payload of the `elements:select:select` event. Fired on every value
 *  commit; carries both the single-select scalar (`value`) and the
 *  multi-select snapshot (`values`) so listeners pick whichever shape
 *  fits their model. */
export interface SelectSelectDetail {
	readonly value: string | null
	readonly values: readonly string[]
}

/** Payload of the `elements:select:input` event. Fired on every
 *  combobox-input keystroke after the filter has settled; carries the
 *  current query string. */
export interface SelectInputDetail {
	readonly query: string
}

export interface UseSelectEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly select: (event: CustomEvent<SelectSelectDetail>) => void
	readonly clear: (event: CustomEvent) => void
	readonly input: (event: CustomEvent<SelectInputDetail>) => void
}

/** Element refs the factory takes. `toggle` is the trigger button (or
 *  the wrapping <select> mirror element); `menu` is the listbox panel.
 *  `native` is the optional <select> (or <input>) the factory mirrors
 *  values into for form-data participation. `input` promotes the
 *  toggle to a combobox — typing filters options. */
export interface CreateSelectElements {
	readonly toggle: HTMLElement
	readonly menu: HTMLMenuElement
	readonly native?: HTMLSelectElement | HTMLInputElement | null
	readonly input?: HTMLInputElement | null
}

export interface CreateSelectOptions {
	/** Multi-select mode. Mutually exclusive with `autocomplete`. */
	readonly multiple?: boolean
	/** Combobox autocomplete mode. Requires `input` in the elements. */
	readonly autocomplete?: boolean
	/** Initial value — a scalar (single-select), an array (multi-select),
	 *  or undefined for empty initial state. */
	readonly value?: string | readonly string[]
	readonly placement?: Placement
	readonly strategy?: Strategy
	readonly offset?: number
	/** Min item-rows the requested side must hold before the menu commits.
	 *  `0` opts out — surplus rows scroll inside the panel. Default 5. */
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		/** Single-select defaults to `true` (dismiss on commit); multi-
		 *  select defaults to `false` so callers can build up a selection
		 *  without reopening the panel. */
		readonly inside?: boolean
	}
	readonly on?: Partial<UseSelectEventMap>
}

export interface CreateSelectInstance {
	readonly visible: Readonly<Ref<boolean>>
	/** Single-select scalar. Tracks the first entry of `values` in multi-
	 *  select mode (always `null` when the selection is empty). */
	readonly value: Readonly<Ref<string | null>>
	/** Multi-select snapshot. Always the canonical source of truth — the
	 *  scalar `value` is derived. */
	readonly values: Readonly<Ref<readonly string[]>>
	/** Combobox-mode query string. Empty in non-autocomplete mode. */
	readonly query: Readonly<Ref<string>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	/** Commit a value. Single-select replaces; multi-select toggles
	 *  membership. Fires `elements:select:select`. */
	readonly select: (next: string) => void
	/** Empty the selection. Fires `elements:select:clear`. */
	readonly clear: () => void
	readonly update: (options?: { readonly placement?: Placement }) => void
	readonly destroy: () => void
}

export interface UseSelectOptions {
	readonly menu: Ref<HTMLMenuElement | null>
	readonly native?: Ref<HTMLSelectElement | HTMLInputElement | null>
	readonly input?: Ref<HTMLInputElement | null>
	readonly multiple?: boolean
	readonly autocomplete?: boolean
	readonly value?: string | readonly string[]
	readonly placement?: Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseSelectEventMap>
}

export interface UseSelectReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly value: Readonly<Ref<string | null>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly query: Readonly<Ref<string>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly select: (next: string) => void
	readonly clear: () => void
	readonly update: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useToast. Bound to the native `<output>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseToastEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateToastOptions {
	/** `false` keeps the toast sticky. Object enables auto-hide with optional delay. */
	readonly autohide?: false | { readonly delay?: number }
	/**
	 * Swipe-to-dismiss gesture. `false` disables; object enables with optional
	 * threshold override (CSS pixels, default 80 — distance the pointer must
	 * travel along the inline axis before release commits to dismiss). The
	 * gesture is bidirectional horizontal (swipe left OR right), composes
	 * with the deck `transform: translateY()` via the standalone `translate`
	 * property, and dispatches the cancellable `elements:toast:hide` event
	 * on commit so consumers can veto. Pointer-down on the trailing
	 * `<button>` dismiss is ignored so button clicks survive.
	 */
	readonly swipe?: false | { readonly threshold?: number }
	readonly on?: Partial<UseToastEventMap>
}

export interface CreateToastInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseToastOptions extends CreateToastOptions {}

export interface UseToastReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrag
// ─────────────────────────────────────────────────────────────────────────

export interface UseDragEventMap {
	readonly tap: (event: CustomEvent) => void
	readonly start: (event: CustomEvent) => void
	readonly over: (event: CustomEvent) => void
	readonly drop: (event: CustomEvent) => void
	readonly end: (event: CustomEvent) => void
	readonly reorder: (event: CustomEvent) => void
}

/** Mutable list accessor used by the factory in place of a Vue ref. */
export interface CreateDragList<T> {
	readonly read: () => T[]
	readonly splice: (start: number, deleteCount: number, ...items: T[]) => T[]
}

export interface CreateDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: CreateDragList<T>
	readonly items?: () => readonly T[]
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface CreateDragInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: Ref<T[]>
	readonly items?: Ref<readonly T[]>
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface UseDragReturn {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrop
// ─────────────────────────────────────────────────────────────────────────

export interface UseDropEventMap {
	readonly dragenter: (event: DragEvent) => void
	readonly dragover: (event: DragEvent) => void
	readonly dragleave: (event: DragEvent) => void
	readonly drop: (event: DragEvent) => void
}

export interface CreateDropOptions {
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly accept?: readonly string[]
	readonly on?: Partial<UseDropEventMap>
}

export interface CreateDropInstance {
	readonly over: Readonly<Ref<boolean>>
	readonly destroy: () => void
}

export interface UseDropOptions extends CreateDropOptions {}

export interface UseDropReturn {
	readonly over: Readonly<Ref<boolean>>
}

// ─────────────────────────────────────────────────────────────────────────
// useFocus (extracted from mailbox's useModal focus-trap loop)
// ─────────────────────────────────────────────────────────────────────────

export interface CreateFocusOptions {
	/** Element (or selector function) to focus on activate. Defaults to the
	 *  first focusable descendant. */
	readonly initial?: HTMLElement | ((host: HTMLElement) => HTMLElement | null)
	/** Restore focus to the previously-focused element on deactivate.
	 *  Default `true`. */
	readonly restore?: boolean
}

export interface CreateFocusInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
	readonly destroy: () => void
}

export interface UseFocusOptions extends CreateFocusOptions {}

export interface UseFocusReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useButton. Bound to native `<button>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseButtonEventMap {
	/** Fired after toggle. `event.detail` is `ButtonToggleDetail`. */
	readonly toggle: (event: CustomEvent) => void
}

export interface CreateButtonOptions {
	readonly on?: Partial<UseButtonEventMap>
}

export interface CreateButtonInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseButtonOptions extends CreateButtonOptions {}

export interface UseButtonReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAlert. Bound to any element carrying `[role="alert"]` / `[role="status"]`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAlertEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateAlertOptions {
	/**
	 * Initial visibility. Defaults to `true` so alerts render visible
	 * out of the box (`<aside role="alert">` is meaningless if hidden).
	 * Pass `false` to mount in the dismissed state — useful when the
	 * alert is going to be triggered by an upstream event.
	 */
	readonly initial?: boolean
	readonly on?: Partial<UseAlertEventMap>
}

export interface CreateAlertInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export type UseAlertOptions = CreateAlertOptions

export interface UseAlertReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTabs (← useTab). Operates on one tab/pane pair within a tablist group.
// ─────────────────────────────────────────────────────────────────────────

export interface UseTabsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateTabsElements {
	readonly trigger: HTMLElement
	readonly pane: HTMLElement
	readonly group: HTMLElement
}

export interface CreateTabsOptions {
	readonly on?: Partial<UseTabsEventMap>
	/**
	 * Force this tab to be the initially active one. When `true` the trigger
	 * is seeded with `aria-selected="true"` and its pane's `[hidden]`
	 * attribute is removed before the first paint, so consumers don't have
	 * to pre-author the markup. Defaults to reading
	 * `aria-selected="true"` from the trigger.
	 */
	readonly initial?: boolean
}

export interface CreateTabsInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseTabsOptions {
	readonly pane: Ref<HTMLElement | null>
	readonly group: Ref<HTMLElement | null>
	readonly on?: Partial<UseTabsEventMap>
	/**
	 * Force this tab to be active on first mount. Equivalent to pre-authoring
	 * `aria-selected="true"` on the trigger before the composable runs.
	 */
	readonly initial?: boolean
}

export interface UseTabsReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useNav (← useScrollSpy). Bound to native `<nav>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseNavEventMap {
	/** `event.detail` is `NavActivateDetail`. */
	readonly activate: (event: CustomEvent) => void
}

export interface CreateNavElements {
	readonly container: HTMLElement
	readonly nav?: HTMLElement | null
}

export interface CreateNavOptions {
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface CreateNavInstance {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
	readonly destroy: () => void
}

export interface UseNavOptions {
	readonly nav?: Ref<HTMLElement | null>
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface UseNavReturn {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useCarousel
// ─────────────────────────────────────────────────────────────────────────

export interface UseCarouselEventMap {
	readonly slide: (event: CustomEvent) => void
	readonly change: (event: CustomEvent) => void
	readonly pause: (event: CustomEvent) => void
	readonly resume: (event: CustomEvent) => void
}

export interface CreateCarouselOptions {
	readonly autoplay?: {
		readonly interval?: number
		readonly pause?: 'hover' | false
		readonly ride?: 'mount' | 'interaction' | false
	}
	readonly keyboard?: boolean
	readonly wrap?: boolean
	readonly touch?: boolean
	readonly on?: Partial<UseCarouselEventMap>
}

export interface CreateCarouselInstance {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseCarouselOptions extends CreateCarouselOptions {}

export interface UseCarouselReturn {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useForm. Bound to native `<form>`.
// ─────────────────────────────────────────────────────────────────────────

export interface FormDataDetail {
	readonly data: FormData
}
export interface FormInvalidDetail {
	readonly field: string | null
	readonly message: string
	readonly validity: ValidityState | null
}
export interface FormResetDetail {
	readonly data: readonly FormEntry[]
}

export interface FormEventMap {
	readonly change: (event: CustomEvent) => void
	readonly formdata: (event: CustomEvent) => void
	readonly input: (event: CustomEvent) => void
	readonly invalid: (event: CustomEvent) => void
	readonly reset: (event: CustomEvent) => void
	readonly submit: (event: CustomEvent) => void
	readonly validate: (event: CustomEvent) => void
}

export interface CreateFormOptions {
	readonly submit?: { readonly invalid?: boolean }
	readonly validate?: {
		readonly input?: boolean
		readonly mount?: boolean
		readonly submit?: boolean
	}
	readonly on?: Partial<FormEventMap>
}

export interface FormFieldsInterface {
	readonly items: Readonly<Ref<readonly FormFieldElement[]>>
	readonly names: Readonly<Ref<readonly string[]>>
	readonly field: (name: string) => FormFieldElement | null
	readonly fields: (name?: string) => readonly FormFieldElement[]
	readonly has: (name: string) => boolean
	readonly focus: (name: string) => boolean
	readonly enable: (name: string) => void
	readonly disable: (name: string) => void
}

export interface FormValidityInterface {
	readonly errors: Readonly<Ref<readonly FormError[]>>
	readonly field: (name: string) => ValidityState | null
	readonly message: (name: string) => string | null
	readonly mark: (name: string, message: string) => boolean
	readonly clear: (name?: string) => void
}

export interface CreateFormInstance {
	readonly element: HTMLFormElement
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseFormOptions extends CreateFormOptions {}

export interface UseFormReturn {
	readonly element: Readonly<Ref<HTMLFormElement | null>>
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTable
// ─────────────────────────────────────────────────────────────────────────

/** Per-column schema entry — drives sortable / filterable behavior. */
export interface TableColumn {
	readonly key: string
	readonly title?: string
	readonly sortable?: boolean
	readonly filterable?: boolean
	/** Custom sort comparator. Receives cell `textContent` from two rows. */
	readonly sort?: (a: string, b: string) => number
	/** Custom filter predicate. */
	readonly filter?: (value: string, query: string) => boolean
}

export interface TableChangeDetail {
	readonly part: TablePart
	readonly action: TableAction
}

export interface TableSelectDetail {
	readonly ids: ReadonlySet<string>
}

export interface TablePaginateDetail {
	readonly page: number
	readonly offset: number
	readonly size: number
}

export interface TableFocusDetail {
	readonly cell: TableCell | null
}

export interface TableSortDetail {
	readonly columns: readonly TableSortEntry[]
}

export interface TableExpansionDetail {
	readonly id: string
}

export interface TableEventMap {
	readonly change: (event: CustomEvent) => void
	readonly focus: (event: CustomEvent) => void
	readonly select: (event: CustomEvent) => void
	readonly sort: (event: CustomEvent) => void
	readonly expand: (event: CustomEvent) => void
	readonly collapse: (event: CustomEvent) => void
	readonly paginate: (event: CustomEvent) => void
}

export interface CreateTableOptions {
	readonly caption?: string
	readonly footer?: TableInputRow
	readonly focus?: {
		readonly keyboard?: boolean
		readonly wrap?: boolean
	}
	readonly headers?: TableInputRow
	readonly id?: () => string
	readonly on?: Partial<TableEventMap>
	readonly rows?: readonly TableInputRow[]
	/** Per-column schema — drives sort/filter and column key discovery. */
	readonly columns?: readonly TableColumn[]
	/** Property name read from row data for stable identity (written as `data-id`). */
	readonly value?: string
	/** 1-based index of the first visible row in the full dataset (drives `aria-rowindex`). */
	readonly offset?: number | Ref<number>
	/** Total row count written as `aria-rowcount` on the `<table>` element. */
	readonly total?: number | Ref<number>
	readonly pagination?: {
		/**
		 * Rows per page — drives `pagination.page` / `pagination.count`
		 * derivations. When omitted the body row count at the time of access
		 * is used (the rendered page IS the page).
		 */
		readonly size?: number | Ref<number>
	}
	readonly sort?: {
		/** Allow multi-column sort. Default `false`. */
		readonly multiple?: boolean
		/** Prevent clearing sort (cycles asc→desc→asc). Default `false`. */
		readonly mandate?: boolean
		/** Direction on first click. Default `'asc'`. */
		readonly order?: 'asc' | 'desc'
		/**
		 * Reorder `<tbody>` rows in place when sort state changes.
		 * Default `true`. Set `false` for server-paged datasets where
		 * the consumer refetches in response to the
		 * `elements:table:sort` event.
		 */
		readonly auto?: boolean
	}
	readonly expansion?: {
		/** Allow multiple rows expanded simultaneously. Default `true`. */
		readonly multiple?: boolean
		/** Row ids to expand at construction (stale ids silently ignored). */
		readonly initial?: readonly string[]
		/**
		 * Wire row-click → expansion toggle.
		 *  - `true` / `'row'` (default): clicking anywhere on an expandable
		 *    row (one with a sibling `<tr data-table-expansion>`) toggles.
		 *    Interactive descendants (`a, button, input, textarea, select,
		 *    label, [data-no-select]`) are skipped so row-internal action
		 *    chrome survives.
		 *  - `'caret'`: only descendants of `[data-table-expansion-trigger]`
		 *    toggle. Use when the rest of the row should read as plain
		 *    content (e.g. a leading-cell caret button).
		 *  - `false`: no built-in handler; consumers drive
		 *    `expansion.toggle(id)` themselves.
		 */
		readonly click?: boolean | 'row' | 'caret'
	}
	readonly selection?: {
		/** Scope for select-all operations. Default `'page'`. */
		readonly strategy?: TableStrategy
		/** Predicate — return `false` to prevent a row from being selected. */
		readonly selectable?: (row: HTMLTableRowElement) => boolean
		/**
		 * When `true` (default), `createTable` listens for clicks on body rows
		 * and applies the canonical desktop selection model:
		 *  - plain click replaces the selection with that row
		 *  - Ctrl / ⌘ click toggles that row in or out of the selection
		 *  - Shift click extends from the anchor to the clicked row
		 *  - clicking outside the table with an active selection clears it
		 *
		 * Clicks whose target is interactive (`input`, `button`, `a`, `select`,
		 * `textarea`, `label`, or any descendant of `[data-no-select]`) are
		 * skipped so checkboxes / row actions still work.
		 *
		 * Set to `false` when driving selection entirely from custom UI.
		 */
		readonly click?: boolean
	}
	/** Column resize configuration. Absent = no resize handles. */
	readonly resize?: {
		/** Minimum column width in pixels. Default `40`. */
		readonly min?: number
		/** Maximum column width in pixels. Default `Infinity`. */
		readonly max?: number
	}
}

export interface CreateTableInstance {
	readonly element: HTMLTableElement
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	/** Column schema (structural, not reactive). */
	readonly columns: readonly TableColumn[]
	/** Reactive total ref — reflects `options.total`. */
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseTableOptions extends CreateTableOptions {}

export interface TableCaptionInterface {
	readonly value: Readonly<Ref<string | null>>
	readonly caption: () => HTMLTableCaptionElement | null
	readonly set: (value: string) => void
	readonly clear: () => void
}

export interface TableHeadersInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly headers: () => readonly HTMLTableCellElement[]
	readonly header: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableRowsInterface {
	readonly count: Readonly<Ref<number>>
	readonly ids: Readonly<Ref<readonly string[]>>
	readonly rows: () => readonly HTMLTableRowElement[]
	readonly row: (index: number) => HTMLTableRowElement | null
	readonly id: (index: number) => string | null
	readonly has: (index: number) => boolean
	readonly append: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly prepend: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly insert: (index: number, values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly update: (index: number, values: TableInputRow) => boolean
	readonly remove: (index: number) => TableRow | null
	readonly move: (from: number, to: number) => boolean
	readonly swap: (first: number, second: number) => boolean
	readonly clear: () => void
}

export interface TableCellsInterface {
	readonly cell: (cell: TableCell) => HTMLTableCellElement | null
	readonly read: (cell: TableCell) => string | null
	readonly update: (cell: TableCell, value: TableInput) => boolean
	readonly clear: (cell: TableCell) => boolean
}

export interface TableFooterInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly footers: () => readonly HTMLTableCellElement[]
	readonly footer: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableSortManagerInterface {
	/** Active sort entries in priority order. */
	readonly columns: Readonly<Ref<readonly TableSortEntry[]>>
	/** Toggle sort direction for a column key. */
	readonly toggle: (key: string) => void
	/** Sort direction for a column key. */
	readonly direction: (key: string) => TableSortDirection
	/** Sort priority (0-based) for a column key in multi-sort; `-1` if unsorted. */
	readonly priority: (key: string) => number
	/** Clear all sort state. */
	readonly clear: () => void
}

export interface TableSelectionManagerInterface {
	/** Currently selected row ids. */
	readonly ids: ReadonlySet<string>
	/** Whether all selectable rows in strategy scope are selected. */
	readonly all: Readonly<Ref<boolean>>
	/** Whether some but not all selectable rows in strategy scope are selected. */
	readonly mixed: Readonly<Ref<boolean>>
	/** Active strategy (read from options). */
	readonly strategy: TableStrategy
	readonly select: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly clear: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/** Whether a row can be selected (based on `selection.selectable` option). */
	readonly selectable: (row: HTMLTableRowElement) => boolean
}

export interface TableExpansionManagerInterface {
	/** Currently expanded row ids (`shallowReactive` Set — reactive in templates). */
	readonly expanded: ReadonlySet<string>
	readonly expand: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly collapse: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/**
	 * Replace the entire expanded set atomically (for state restoration).
	 *
	 * @remarks Stale ids (no matching body row) are silently ignored.
	 * Respects `expansion.multiple: false` — only first id is kept when false.
	 */
	readonly set: (ids: readonly string[]) => void
}

export interface TablePaginationInterface {
	/** Rows per page — caller-supplied or rendered body row count. */
	readonly size: Readonly<Ref<number>>
	/** 1-based current page number (1 when offset and size are 0). */
	readonly page: Readonly<Ref<number>>
	/** Total page count (1 minimum, even for empty datasets). */
	readonly count: Readonly<Ref<number>>
	/**
	 * Emit an `elements:table:paginate` event with the requested page (clamped
	 * to `[1, count]`) and the corresponding 1-based offset. Caller listens
	 * to apply the navigation — the factory does not mutate caller-owned
	 * `offset` or `data`.
	 */
	readonly to: (page: number) => void
	/** Sugar for `to(page + 1)`. */
	readonly next: () => void
	/** Sugar for `to(page - 1)`. */
	readonly prev: () => void
}

export interface TableResizeManagerInterface {
	/** True while a column resize drag is active. */
	readonly active: Readonly<Ref<boolean>>
	/** Current width of column at `index` (reads `offsetWidth`). */
	readonly width: (index: number) => number
	/** Programmatically set a column width in pixels. */
	readonly set: (index: number, width: number) => void
	/** Reset all columns to natural (content-driven) widths. */
	readonly clear: () => void
}

export interface TableFocusInterface {
	readonly cell: Readonly<Ref<TableCell | null>>
	readonly focus: (cell: TableCell) => boolean
	readonly move: (direction: TableDirection) => boolean
	readonly clear: () => void
}

export interface UseTableReturn {
	readonly element: Readonly<Ref<HTMLTableElement | null>>
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	readonly columns: readonly TableColumn[]
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}
