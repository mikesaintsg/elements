# Plan — Semantic HTML Inspector

> Living blueprint for the next initiative: a dependency-free, DOM-walking
> **semantic HTML inspector**. Read this to know **where to pick up**; read
> [`AGENTS.md`](AGENTS.md) for the non-negotiable coding rules and
> [`guides/contribute.md`](guides/contribute.md) for the workflow.

**Framework baseline (done — not the subject of this roadmap):** every
framework layer (tokens, theme, mixins, modifiers, elements, components,
surfaces, composables) and all 43 showcase pages ship green — full suite
**146 files / 7057 tests**, `npm run check` 0/0, all 11 build phases
complete. The framework is the _substrate_ the inspector validates; it is
not re-planned here.

---

## The idea

A **semantic HTML inspector**: a TypeScript analyzer that **walks a live DOM
subtree node-by-node** (never parses HTML strings) and reports where the tree
— or the CSS painted on it — violates the HTML content-model, contextual,
interaction, and spec-rendering rules.

Two lenses, one walk:

1. **Structure lens** — for every element, decide: _is this element allowed
   where it sits_ (its parent's / ancestor context), and _does its own
   subtree satisfy its content model_ (required children present and ordered,
   no forbidden descendants, every child an allowed category). Plus the
   discrete spec constraints a tree-walker can decide: no `<a>` inside `<a>`,
   no interactive content inside `<a>`/`<button>`, exactly one `<summary>` as
   the first child of `<details>`, `<figcaption>` first-or-last in `<figure>`,
   `<li>` only under `ul`/`ol`/`menu`, `<dt>`/`<dd>` grouping, the full
   `<table>` model, the **transparent** content model resolved through
   ancestors, void elements with no children, attribute-coupling
   (`a[target]` requires `href`, `bdo` requires `dir`, `data` requires
   `value`, …). Every constraint cites the canonical spec — see the
   [W3C spec reference map](#w3c-spec-reference-map) below.

2. **Presentation lens** — for elements whose **default rendering is
   semantically load-bearing**, read `getComputedStyle` and flag framework
   CSS that strips the semantics: `<bdo>` not
   `unicode-bidi: isolate-override`, focus outline removed with no
   replacement affordance, `[hidden]` overridden visible, `<pre>` losing
   `white-space: pre`, `<textarea>` losing `pre-wrap`, list-marker semantics
   stripped with no compensating ARIA, etc. (neither a `<li>`'s nor a
   table element's `display` is **load-bearing** — each keeps its a11y role
   (`listitem` / `table`/`row`/`cell`/…) at any `display`; those two
   inherently-stylistic checks were removed, see Phase 5 boundary (e)). This
   turns the inspector into a **self-audit of
   our own cascade** — the same instrumented-audit muscle the theme-retune /
   reduced-motion / forced-colors passes used, made permanent and codified.

**Why from scratch:** no off-the-shelf tool does _DOM-tree_ semantic
conformance with a citeable rule corpus and zero dependencies. The HTML
validator parses source strings; linters are AST/source based; AT-focused
tools check ARIA, not HTML content models. We already own a mirrored W3C
corpus (`guides/w3c/**`), a frozen-registry + parity-test discipline, and a
DOM-walking idiom across every factory. The inspector is the natural apex of
that doctrine: **the WHATWG spec is the source of truth, the `guides/w3c/**`
cache + a frozen schema mirror it, the inspector enforces it on real DOM,
parity tests keep cache ↔ schema ↔ spec in lock-step\*\* (see the
[W3C spec reference map](#w3c-spec-reference-map)).

### Hard constraints (non-negotiable)

- **No new dependencies — and no reinvention.** Native `Document` /
  `Element` / `Node` / `getComputedStyle` / `ShadowRoot` / slot APIs only
  (AGENTS.md §1), composed through the **already-shipped first-party
  packages** `@elements/browser` ([traversals](guides/traversals.md)) and
  `@elements/core` ([shapers](guides/shapers.md) / [compilers](guides/compilers.md)
  / [validators](guides/validators.md) / [parsers](guides/parsers.md)).
  These are not new deps; using them is mandatory (see
  [Existing tooling we build on](#existing-tooling-we-build-on-no-reinvention)).
- **No string / regex HTML parsing.** The inspector consumes a _parsed_
  `ParentNode` (default `document`); it walks via
  [`traversals`](guides/traversals.md) (`walkDescendantsGenerator()`,
  `getAncestors()`, the `is*`/`matchesTag` guards) and reads `tagName` /
  computed style — the same DOM-walk idiom every `create*` factory uses,
  now centralized in `traversals.ts`.
- **Types-first (TTTDD).** Every public type lands in
  [`src/browser/types.ts`](src/browser/types.ts) (the single source of
  truth) before implementation. Single-word entity members; split via the
  Manager pattern (§4.2.2) when a verb family grows.
- **Operates on the post-parse DOM.** Tag-omission and implicit-element
  insertion (`<tbody>`, `<head>`) are already resolved by the parser, so
  omission rules are out of scope _by construction_ — but the engine must
  know the DOM can differ from source (implicit `<tbody>`; `<table>` model).
- **Deterministic, offline, fast.** Same DOM → same findings. A budget for
  large trees (Phase 8). Runs inside the existing Chromium test harness.

### Non-goals

- Not an accessibility/ARIA auditor (axe-core's domain) — implicit-role data
  is used only where the _HTML_ spec makes it content-model-relevant.
- Not a CSS linter — the presentation lens only flags overrides that
  contradict an element's **semantics**, nothing stylistic.
- Not a source/string validator — the DOM is the input, always.

---

## Architecture (AGENTS.md-faithful)

```
https://html.spec.whatwg.org/ ← CANONICAL SOURCE OF TRUTH (live WHATWG spec)
        │  (Phase 0 reconciles the local mirror against it)
        ▼
guides/w3c/**                  ← curated local cache of the spec (prose)
        │  (Phase 0 completes it from canonical; parity test binds it)
        ▼
src/browser/schema.ts          ← FROZEN content-model registry (TS mirror)
        │  one ContentModelEntry per element; indices; predicates
        │  + an @elements/core ContractShape → compiled guard + JSON Schema
        ▼
EXISTING FIRST-PARTY TOOLING (shipped, parity-gated — composed, not rebuilt):
  @elements/browser  traversals.ts  walk / ancestor / relationship / focus
  @elements/core     shapers+compilers  shape → guard+schema+generator
                     validators  predicate compositors · parsers  attr coercion
        ▼
src/browser/inspector/         ← one class per file (Manager pattern)
   Walker.ts        thin Context layer over traversals.walkDescendantsGenerator
   RuleManager.ts   rule registry (rule(id)/rules()); predicates = validators
   FindingManager.ts findings collection (finding(id)/findings()/clear())
   Inspector.ts     root entity: inspect(root) → InspectionResult; Emitter
        ▼
src/browser/index.ts           ← sole barrel re-exports it (public API)
        ▼
tests/                         ← parity (schema↔guides), unit (rule↔fixture),
                                  self-audit (Inspector↔every showcase page)
```

- **Types** → `src/browser/types.ts` only. Suffix discipline per §4.5:
  `InspectorInterface`, `InspectorOptions`, `InspectionResult`, `Finding`,
  `FindingSeverity` (`'error' | 'warning' | 'advice'`), `RuleInterface`,
  `RuleContext`, `ContentModelEntry`, `ContentCategory`,
  `ContentModel` (`'transparent' | 'void' | 'text' | 'nothing' | 'children'`),
  `InspectorEventMap`.
- **Schema registry** → `src/browser/schema.ts`, modeled exactly on
  [`taxonomy.ts`](src/browser/taxonomy.ts) / [`patterns.ts`](src/browser/patterns.ts):
  a frozen `contentModel` array of typed `entry(...)` records, pre-computed
  `ReadonlyMap`/`ReadonlySet` indices, single-word predicates (`isVoid`,
  `isTransparent`, `modelOf`, `categoriesOf`, `contextOf`). Each entry cites
  its `guides/w3c/**` anchor so the parity test is bidirectional.
- **Inspector entity** (Manager pattern, §4.2.2 / §9 / §14):
  - `Inspector` owns `#walker`, `#rules`, `#findings`, `#emitter`.
  - Single-word public surface: `inspect(root)`, `findings`, `rules`,
    `emitter`. Options grouped per §4.2.1: `{ on?, severity?, lens?, root? }`.
  - `RuleManager`: `rule(id)` / `rules()`; rules are pure predicates
    `(element, context) => Finding | null` — no shared mutable state.
  - `FindingManager`: `finding(id)` / `findings()`; batch `clear()` /
    `clear(id)` / `clear(ids)` per §10.
  - `Emitter<InspectorEventMap>` (§14) so a large-tree walk streams:
    events `start`, `finding`, `done` (≤4, single-word).
  - `inspect()` returns a value `InspectionResult` (DOM-walking does not
    "fail"); a non-`Node` argument is a programmer error → `throw Error`
    (§13). Optional fallible sub-operations use `Result<T,E>`.
- **Helpers** → `src/browser/helpers.ts`, `{verb}{Noun}` per §4.3, each a
  THIN adapter over existing first-party tooling (see [Existing tooling we
  build on](#existing-tooling-we-build-on-no-reinvention)): `resolveModel`
  (transparent resolution — walks `getAncestors()` / `findClosest()` from
  [`traversals`](guides/traversals.md)), `effectiveCategories`,
  `nodePath` (wraps `getPathToAncestor()` from `traversals`),
  `flatChildren` (slot/shadow-aware, over the `traversals` child walks).
  `parentChain` is `getAncestors()` directly.
- **Constants** → `src/browser/constants.ts`: `VOID_TAGS`,
  `TRANSPARENT_TAGS`, `INTERACTIVE_TAGS`, category membership sets
  (`CATEGORY_MEMBERS` mirrors [`categories.md`](guides/w3c/categories.md)).
- **Built on existing first-party tooling, not reinvented.** The Walker is
  a thin Context layer over [`@elements/browser` `traversals`](guides/traversals.md);
  the schema's structured constraint data + the `Finding`/`InspectionResult`
  shapes are [`@elements/core`](guides/shapers.md) `ContractShape`s
  ([compilers.md](guides/compilers.md) derives their guard + JSON Schema +
  deterministic generator); rule predicates compose
  [`@elements/core` validators](guides/validators.md); attribute-value
  rules use the [`@elements/core` parsers](guides/parsers.md). These are
  first-party packages already shipped + parity-gated — using them honors
  "no new dependencies" **and** "no reinvention".
- **No `errors.ts`** — findings are _data_, not exceptions.

### The transparent content model (first-class)

`<a>`, `<ins>`, `<del>`, `<object>`, `<video>`, `<audio>`, `<canvas>`,
`<map>`, `<slot>` are "transparent" ([spec:
`dom.html#transparent-content-models`](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models)).
`resolveModel(node)` walks ancestors: if the parent is itself transparent,
recurse; otherwise the effective model is the one the nearest
**non-transparent** ancestor imposes; a detached root resolves to **flow**
(verbatim spec rule: _"when a transparent element has no parent, its content
model restrictions are instead based on flow content"_). Ancestor
_restrictions_ propagate through (no interactive / no `<a>` / no `tabindex`
descendant of [`<a>`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element);
no nested `<audio>`/`<video>`). This resolver is the spine of the structure
lens and gets its own dedicated unit suite. **Implementation:** the
ancestor walk is [`traversals`](guides/traversals.md) `getAncestors()` /
`findClosest()` (not a hand-rolled loop); the recursive _guard_ form of a
transparent/recursive content model is expressed with
[`@elements/core`](guides/validators.md) `lazyOf` (guard) /
[`lazyShape`](guides/shapers.md) (the only sanctioned recursion boundary —
its acyclicity + bounded-depth + cycle-safety are already proven and
tested), so the resolver inherits adversarial-input safety instead of
re-deriving it.

---

## Existing tooling we build on (no reinvention)

The inspector's two heaviest layers — DOM traversal and
shape/guard/parse/generate — **already exist as shipped, parity-gated
first-party packages**. The build composes them; it does not re-implement
them. Every row's API is exhaustively documented + doc↔source-gated in the
linked guide.

| Inspector need                                                                                                                                           | Reuse (already shipped)                                                                                                     | Source / guide                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Depth-first element walk (lazy, no recursion limit)                                                                                                      | `walkDescendantsGenerator()` (`for…of`), `walkDescendants()`, `walkDescendantsBreadthFirst()`                               | [`traversals`](guides/traversals.md) · `src/browser/traversals.ts`      |
| Transparent-model ancestor resolution                                                                                                                    | `getAncestors()`, `findClosest()`, `findAncestor()`, `findCommonAncestor()`                                                 | [traversals.md](guides/traversals.md)                                   |
| Node typing / matching guards                                                                                                                            | `isElement`, `isHTMLElement`, `isTextNode`, `isTagType`, `matchesTag`, `hasAttribute`, `createMatcher` (`ElementPredicate`) | [traversals.md](guides/traversals.md) · `helpers.ts`                    |
| Stable DOM path for a `Finding`                                                                                                                          | `getPathToAncestor()`, `getTreeDistance()`, `getSiblingIndex()`                                                             | [traversals.md](guides/traversals.md)                                   |
| Relationship checks (interaction lens)                                                                                                                   | `isDescendantOf`, `isAncestorOf`, `isBefore`, `isAfter`, `contains`                                                         | [traversals.md](guides/traversals.md)                                   |
| Focus/interaction rules                                                                                                                                  | `isFocusable`, `findFocusableElements`, `findFirstFocusable`, `findLastFocusable`                                           | [traversals.md](guides/traversals.md)                                   |
| Live-vs-static collection safety while walking                                                                                                           | `toArray()` to freeze before DOM-sensitive iteration                                                                        | [traversals.md](guides/traversals.md) §Contract 6                       |
| `ContentModelEntry` constraint data + `Finding` / `InspectionResult` shape → free **guard + JSON Schema**                                                | declare a `ContractShape` once; `compileContract()` derives `is` + `schema`                                                 | [shapers.md](guides/shapers.md) · [compilers.md](guides/compilers.md)   |
| Recursive content model (transparent / `ruby` / nested)                                                                                                  | `lazyShape()` (shape) · `lazyOf` (guard) — the only sanctioned recursion boundary, cycle-safe + depth-capped                | [shapers.md](guides/shapers.md) · [validators.md](guides/validators.md) |
| Deterministic synthetic DOM/shape fixtures + perf-budget trees                                                                                           | `compileGenerator()` + `createRandom(seed)` (reproducible per seed)                                                         | [compilers.md](guides/compilers.md)                                     |
| Rule predicate composition                                                                                                                               | `andOf` / `orOf` / `unionOf` / `whereOf` / `notOf` / `enumOf` / `literalOf` / `recordOf`                                    | [validators.md](guides/validators.md)                                   |
| Attribute-value rules (`tabindex` integer · `colgroup[span]` ≤1000 · `th[scope]` enum · `dir∈{ltr,rtl}` · `loading`/`crossorigin` enums · `data[value]`) | `parseInteger` / `parseEnum` / `parseBoolean` / `parseString` (coerce → typed-or-`undefined`)                               | [parsers.md](guides/parsers.md)                                         |
| Machine-consumable findings output (JSON Schema + a guard for consumers)                                                                                 | the `Finding` `ContractShape`'s compiled `schema` + `is`                                                                    | [compilers.md](guides/compilers.md)                                     |

**Consequence for the phases:** Phase 2's "Walker" shrinks to a Context
resolver over `traversals`; Phase 1's schema gains a _compiled_ guard +
JSON Schema for free; Phase 3 rule predicates are validator compositions
and attribute checks are `parsers` calls; Phase 3/8 fixtures + the perf
budget use the seeded generator. **The doc↔source parity discipline these
five guides exemplify** (DOC→SOURCE + SOURCE→DOC + TYPES-ARE-TRUTH +
`tests/guides/{x}.test.ts` ↔ `tests/src/**`) **is the exact contract
`guides/inspector.md` (Phase 7) must itself satisfy.**

---

## At a glance

| Phase | Description                                                                         | Status |
| ----- | ----------------------------------------------------------------------------------- | ------ |
| 0     | Reconcile the `guides/w3c/**` cache against the canonical WHATWG spec               | ✅     |
| 1     | Schema registry `src/browser/schema.ts` + bidirectional parity test                 | ✅     |
| 2     | Walker + Context (native traversal, transparent resolver, shadow/slot)              | ✅     |
| 3     | Rule engine + rule families (structure / content-model / attribute / ARIA-relevant) | ✅     |
| 4     | Findings + `Inspector` entity (Manager + Emitter + severity + DOM path) + barrel    | ✅     |
| 5     | Presentation lens (computed-style: load-bearing rendering overrides)                | ✅     |
| 6     | Showcase self-audit suite — gate SHIPPED (40/43 green) + `_textarea` fixed; 3-page error inventory ESCALATED for owner triage | ⬜     |
| 7     | `/inspector` showcase page (dogfood, live) + `guides/inspector.md`                  | ⬜     |
| 8     | Public-API parity hardening + large-tree performance budget                         | ⬜     |

---

## W3C spec reference map

The canonical authority for every rule. Base:
`https://html.spec.whatwg.org/multipage/`. Each corpus area below maps to
its **local cache file** (what the schema mirrors today) and its
**canonical multipage page** (what Phase 0 reconciles against — fetch with a
tightly-scoped, subsection-named prompt). Every phase, rule family, and
Phase-0 gap links back to the matching row here.

| Corpus area                                                                                                             | Local cache                                                             | Canonical multipage page                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Content categories · content models · **transparent** · palpable · inter-element whitespace                             | _(none — Phase 0 adds `categories.md`)_                                 | [dom.html](https://html.spec.whatwg.org/multipage/dom.html#content-models)                    |
| Sectioning — `article` `section` `nav` `aside` `h1`–`h6` `hgroup` `header` `footer` `address`                           | [`elements/sections.md`](guides/w3c/elements/sections.md) _(truncated)_ | [sections.html](https://html.spec.whatwg.org/multipage/sections.html)                         |
| Grouping — `p` `hr` `pre` `blockquote` `ol` `ul` `menu` `li` `dl` `dt` `dd` `figure` `figcaption` `main` `search` `div` | [`elements/groupings.md`](guides/w3c/elements/groupings.md)             | [grouping-content.html](https://html.spec.whatwg.org/multipage/grouping-content.html)         |
| Text-level (incl. `a`, `bdo`, `data`, `time`, `ruby`, `br`/`wbr`)                                                       | [`elements/texts.md`](guides/w3c/elements/texts.md)                     | [text-level-semantics.html](https://html.spec.whatwg.org/multipage/text-level-semantics.html) |
| Link mechanics — `href` `rel` `ping` `hreflang` keyword tables                                                          | [`elements/links.md`](guides/w3c/elements/links.md)                     | [links.html](https://html.spec.whatwg.org/multipage/links.html)                               |
| Edits — `ins` `del` (transparent)                                                                                       | [`elements/edits.md`](guides/w3c/elements/edits.md)                     | [edits.html](https://html.spec.whatwg.org/multipage/edits.html)                               |
| Embedded — `picture` `source` `img` `iframe` `embed` `object`                                                           | [`elements/embeddeds.md`](guides/w3c/elements/embeddeds.md) _(partial)_ | [embedded-content.html](https://html.spec.whatwg.org/multipage/embedded-content.html)         |
| Media — `video` `audio` `track` (transparent media)                                                                     | _(none — Phase 0)_                                                      | [media.html](https://html.spec.whatwg.org/multipage/media.html)                               |
| Image maps — `map` `area`                                                                                               | _(none — Phase 0)_                                                      | [image-maps.html](https://html.spec.whatwg.org/multipage/image-maps.html)                     |
| Tabular — `table` `caption` `colgroup` `col` `thead` `tbody` `tfoot` `tr` `td` `th`                                     | [`elements/tables.md`](guides/w3c/elements/tables.md)                   | [tables.html](https://html.spec.whatwg.org/multipage/tables.html)                             |
| Forms — `form`, `label`                                                                                                 | [`elements/forms.md`](guides/w3c/elements/forms.md) _(form/label only)_ | [forms.html](https://html.spec.whatwg.org/multipage/forms.html#the-form-element)              |
| Forms — `input`                                                                                                         | _(none — Phase 0)_                                                      | [input.html](https://html.spec.whatwg.org/multipage/input.html#the-input-element)             |
| Forms — `button` `select` `optgroup` `option` `textarea` `fieldset` `legend` `output` `datalist` `meter` `progress`     | _(none — Phase 0)_                                                      | [form-elements.html](https://html.spec.whatwg.org/multipage/form-elements.html)               |
| Interactive — `details` `summary` `dialog`                                                                              | [`elements/interactives.md`](guides/w3c/elements/interactives.md)       | [interactive-elements.html](https://html.spec.whatwg.org/multipage/interactive-elements.html) |
| Interaction — `hidden` `inert` focus/`tabindex` `contenteditable` popover, page visibility, user activation             | [`interactions.md`](guides/w3c/interactions.md) _(§6.1–6.4 only)_       | [interaction.html](https://html.spec.whatwg.org/multipage/interaction.html)                   |
| Rendering — UA default CSS / semantically load-bearing presentation                                                     | [`renderings.md`](guides/w3c/renderings.md)                             | [rendering.html](https://html.spec.whatwg.org/multipage/rendering.html)                       |

**Stable anchor conventions** (verified live): per-element anchors are
`#the-{tag}-element` (headings are the combined
`sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements`); content-category
anchors are `dom.html#{flow,phrasing,sectioning,heading,embedded,
interactive,metadata}-content[-2]`, plus
[`#transparent-content-models`](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models),
[`#palpable-content`](https://html.spec.whatwg.org/multipage/dom.html#palpable-content),
and
[`#inter-element-whitespace`](https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace).
The schema's `cite` field stores both the canonical URL and the local
cache anchor; the Phase-1 parity test resolves each.

---

## Phase 0 — Complete the W3C corpus (source of truth)

**Canonical source:** the **live WHATWG spec at
<https://html.spec.whatwg.org/>** is the authority. `guides/w3c/**` is a
curated _local cache_ of it — convenient and citeable, but it has drifted /
truncated. Phase 0 **reconciles the cache against the canonical spec** and
the schema (Phase 1) mirrors the reconciled cache; parity tests bind all
three. Where the cache and the spec disagree, **the spec wins** and the
cache is corrected.

**Fetch strategy (proven, twice):** use the **multipage** spec
(`https://html.spec.whatwg.org/multipage/{section}.html`) with a
**tightly-scoped prompt naming the exact subsection(s)** to extract. A
broad prompt against a large page (or the single-page spec) gets
summarized/truncated; a narrow "extract only §X.Y" prompt extracts cleanly
even from large pages. Canonical section URLs (from the multipage TOC):
`dom.html` (content models / kinds of content / transparent),
`sections.html`, `grouping-content.html`, `text-level-semantics.html`,
`edits.html`, `embedded-content.html`, `media.html`, `image-maps.html`,
`tables.html`, `forms.html`, `interactive-elements.html`,
`interaction.html`. Two live validations:

- _Sections gap_ → `multipage/sections.html`: `header`/`footer` (flow, **no
  `header`/`footer` descendants**), `hgroup` (`p* · one h1–h6 · p*`,
  intermixed script-supporting), `address` (flow, **no heading /
  sectioning / `header` / `footer` / `address` descendants**), `nav`/`aside`
  (flow, sectioning, palpable).
- _Category linchpin_ (absent from the cache entirely) →
  `multipage/dom.html` §3.2.5.2–3.2.5.3: full element-membership lists for
  all eight categories + palpable rule + the transparent rule verbatim
  ("content model derived from the parent's content model; **when a
  transparent element has no parent, its restrictions are based on flow
  content**"). The same path closes every gap below.

**Status — corpus reconciled & complete (✅):** every gap below is closed.
`sections.md` / `forms.md` / `embeddeds.md` / `interactions.md` completed
from the canonical spec; `categories.md`, `aria.md`, and `elements/
document.md` added; `math`/`svg` carded; verbatim/illustrative spec
examples added throughout. **All 93 `taxonomy.ts` elements have a carded
entry under `guides/w3c/**`** (verified). The only Phase-0-adjacent item
left is the `tests/guides/w3c.test.ts` parity gate, which is **Phase 1**
work (it mechanizes this now-satisfied invariant). The gap list below is
retained as the rationale record.

**Why first:** the schema (Phase 1) cannot be trusted unless the corpus it
derives from is complete and spec-accurate. Deep reading of `guides/w3c/**`
surfaced concrete, load-bearing gaps (now closed via the fetch strategy
above):

- [`elements/sections.md`](guides/w3c/elements/sections.md) — **truncated**
  after `section`; `nav`, `aside`, `h1`–`h6`, `hgroup`, `header`, `footer`,
  `address` have only ToC stubs. → reconcile from
  [sections.html](https://html.spec.whatwg.org/multipage/sections.html).
- [`elements/forms.md`](guides/w3c/elements/forms.md) — only `form` /
  `label` carded; `button`, `input`, `select`, `textarea`, `fieldset`,
  `legend`, `option`, `optgroup`, `datalist`, `meter`, `output`,
  `progress` unmodeled. → `input` from
  [input.html](https://html.spec.whatwg.org/multipage/input.html#the-input-element),
  the rest from
  [form-elements.html](https://html.spec.whatwg.org/multipage/form-elements.html),
  `form`/`label` from
  [forms.html](https://html.spec.whatwg.org/multipage/forms.html#the-form-element).
- [`elements/links.md`](guides/w3c/elements/links.md) — link _mechanics_
  only; **no element cards** for `a` / `area` / `map`. → `a` from
  [text-level-semantics.html#the-a-element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element);
  `map`/`area` from
  [image-maps.html](https://html.spec.whatwg.org/multipage/image-maps.html);
  rel/href keyword tables from
  [links.html](https://html.spec.whatwg.org/multipage/links.html).
- [`elements/embeddeds.md`](guides/w3c/elements/embeddeds.md) — only
  `picture` / `source` / `img`; `object`, `embed`, `iframe`, `canvas`,
  `param` absent and `video`/`audio`/`track` not modeled. → static embeds
  from
  [embedded-content.html](https://html.spec.whatwg.org/multipage/embedded-content.html);
  media from
  [media.html](https://html.spec.whatwg.org/multipage/media.html).
- [`interactions.md`](guides/w3c/interactions.md) — only §6.1–§6.4
  (`hidden`, page-visibility, `inert`, user-activation); §6.5+ (activation
  behavior, focus / `tabindex` / `autofocus`, `contenteditable`, popover &
  dialog activation, close watchers) are ToC-only. → complete from
  [interaction.html](https://html.spec.whatwg.org/multipage/interaction.html).
- **No verbatim content-category definitions** anywhere ("flow",
  "phrasing", "embedded", "interactive", "palpable", "sectioning",
  "heading", "metadata", "script-supporting", "form-associated" …). →
  source from
  [dom.html#kinds-of-content](https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content).
- **No implicit-ARIA role table** (needed only where the _HTML_ spec makes
  a role content-model-relevant, e.g. `main`'s "hierarchically correct").

**Work:**

- ✅ **Element mirror reconciled from the canonical multipage spec** —
  `sections.md` completed (`nav`/`aside`/`h1`–`h6`/`hgroup`/`header`/
  `footer`/`address` + §4.3.11–4.3.12); `forms.md` completed (all 12
  form-control cards §4.10.5–4.10.16 from `input.html` /
  `form-elements.html`); `embeddeds.md` extended (`iframe`/`embed`/
  `object`/`video`/`audio`/`track`/`map`/`area`/`canvas` from
  `iframe-embed-object.html` / `media.html` / `image-maps.html` /
  `canvas.html`). `a` was already carded in `texts.md`; `links.md` is the
  faithful §4.6 link-mechanics chapter (no element cards by spec design).
  Every card carries its canonical spec URL; ToCs regenerated; transparent
  models captured precisely.
- ✅ **`guides/w3c/categories.md` added** — the §3.2.5 content-model
  vocabulary (transparent model, the eight content categories with full
  element membership, palpable rule, paragraphs, inter-element whitespace),
  the linchpin every content-model rule resolves against.
- ✅ **`interactions.md` §6.5–§6.10 completed** — activation behavior,
  focus / `tabindex` / `autofocus`, `accesskey`, editing
  (`contenteditable` / `spellcheck` / `autocapitalize` / `inputmode` /
  `enterkeyhint` / `draggable`), find-in-page, close watchers — oriented to
  the DOM/attribute-checkable rules Phase 3 / Phase 5 cite.
- ✅ **`guides/w3c/aria.md` added** — the scoped implicit-role appendix:
  faithful implicit ARIA role per element from ARIA-in-HTML / HTML-AAM,
  with the content-model-relevant cases pinned (`main` hierarchical
  correctness, `li`/list & table-model roles, `a`/`area` href flip, `img`
  alt polarity, interactive-content lookup).
- ✅ **`document.md` added + `math`/`svg` carded** — cross-checking the
  corpus against [`taxonomy.ts`](src/browser/taxonomy.ts) surfaced `html`
  (root) and `math`/`svg` (foreign embedded) as uncarded. Added
  `elements/document.md` (§4.1 `html` + §4.2 `head`/`title`/`base`/`link`/
  `meta`/`style` from `semantics.html`) and `math`/`svg` cards to
  `embeddeds.md` (foreign content — HTML checking stops at the boundary).
  **All 93 `taxonomy.ts` elements now have a carded entry** (verified).
- ✅ **Spec examples added** — verbatim canonical code examples inserted
  into every newly-carded element where the multipage page was reachable
  (sections ×7, button/select/datalist/optgroup/input, iframe/object/
  video/audio/track/map/canvas, html/head/title/base/link/meta/style);
  the deep-in-long-page elements the fetch tool structurally truncates got
  concise clearly-labeled _illustrative_ examples (never misattributed —
  the canonical spec URL is on every card).
- ✅ **`tests/guides/w3c.test.ts` gate** — landed with **Phase 1** (not
  Phase 0): asserts every carded element under `guides/w3c/**` has a
  `contentModel` entry whose categories/context/model match the prose, and
  every schema `cite` resolves bidirectionally. The corpus content was
  done; this test mechanizes the invariant.

---

## Phase 1 — Schema registry (`src/browser/schema.ts`)

The frozen TS mirror of the corpus, shaped exactly like
[`taxonomy.ts`](src/browser/taxonomy.ts).

- ✅ **Types first** in `types.ts`: `ContentCategory`, `ContentModel`,
  `ContentModelEntry` (`tag`, `categories`, `context` — allowed
  parents/ancestor predicate, `model`, `childModel` — the element's ONE
  ordered child content model (closed sequence vs. structural prefix + open
  category arm; replaces the overloaded `required` field + the duplicated
  `child-order`/`group-order` constraint encoding — Phase-3.1 fix),
  `permits` — bare-category child set (disjoint from `childModel`, parity-
  guarded), `forbidden` — forbidden descendant categories/tags,
  `transparent`, `void`, `attributes` — coupling rules, `cite` —
  `guides/w3c` anchor). Sub-types `ContentConstraint` / `ChildModel` /
  `ChildSegment` / `AttributeRule` land alongside (constraints-as-data +
  the recursive ordered-model encoding + coupling rules).
- ✅ **`schema.ts`**: frozen `contentModel: readonly ContentModelEntry[]`
  via a typed `defineModel(...)` helper (the `entry(...)` analogue — bare
  `entry` is taxonomy's; `defineModel` is the schema's, both in
  `helpers.ts`); pre-computed `SCHEMA_BY_TAG`, `VOID_TAGS`,
  `TRANSPARENT_TAGS`, `CATEGORY_MEMBERS`; single-word predicates `isVoid`,
  `isTransparent`, `modelOf`, `categoriesOf`, `contextOf`,
  `isKnownElement`. 110 entries (the 93 taxonomy tags with the single
  `h1`–`h6` taxonomy entry expanded to six real elements, plus the 12
  metadata / media / image-map elements the corpus additionally cards:
  `area`, `base`, `br`, `head`, `link`, `map`, `meta`, `source`, `style`,
  `title`, `track`, `wbr`).
- ✅ Encode the discrete named constraints as data (so rules stay generic):
  `no-self-nest` (`a`, `dfn`), `no-interactive-descendant` (`a`,
  `button`), `single-first-child` (`summary`→`details`,
  `legend`→`fieldset`, `caption`→`table`), `edge-child`
  (`figcaption`→`figure` first|last), `parent-restricted` (`li`→ul/ol/menu,
  `td`/`th`→tr, `option`→select/optgroup/datalist). The ordered/cardinal
  child models (`table`, `picture` `source`\*-then-`img`, `dl` `dt`+`dd`+,
  `ruby`, `hgroup`, list models, `details`/`fieldset` prefix, …) are encoded
  ONCE in `childModel` — NOT as duplicated `child-order`/`group-order`
  constraints (the Phase-3.1 single-source fix; those constraint kinds were
  removed).
- ✅ **Express the entry as an `@elements/core` `ContractShape`** (an
  `objectShape` of the fields above; `literalShape` for the category /
  model unions) run through `compileContract()` — the inspector gets a
  **runtime guard** (`contentModelContract.is`; the frozen registry is
  validated against it at module load via `CONTRACT_GUARDED`, fixture
  inputs in tests) and a **JSON Schema** of `ContentModelEntry`
  (machine-readable corpus export) for free, plus a **seeded generator**
  of synthetic entries for Phase-3 fixtures. The frozen `taxonomy.ts`-style
  array stays the authoring surface; the shape is its compiled contract —
  derived, not duplicated ([shapers.md](guides/shapers.md) /
  [compilers.md](guides/compilers.md)). NB: the `ChildSegment` arm IS
  recursive (`group` nests `ChildSegment[]`, `choice` nests segment lists),
  so the contract uses `lazyShape` — the sole sanctioned recursion boundary
  — for it; the transparent model is the one shape resolved at WALK time
  (Phase 2) over live ancestors, not encoded as a self-referential shape.
- ✅ Barrel: `export * from './schema.js'` in
  [`src/browser/index.ts`](src/browser/index.ts).
- ✅ **`tests/guides/w3c.test.ts`** (bidirectional, mirrors
  `tests/guides/elements.test.ts`): every `guides/w3c/**` carded element
  has a `contentModel` entry whose categories/context/model match the
  prose; every schema entry's `cite` resolves to a real guide anchor; no
  schema entry without a card; no card without a schema entry. Paired 1:1
  with the new pointer guide [`guides/w3c.md`](guides/w3c.md) (the total
  test↔guide bijection `README.test.ts` enforces).

---

## Phase 2 — Walker + Context

- ✅ `Walker` class: **thin layer over [`traversals`](guides/traversals.md)** —
  the spine is `walkDescendantsGenerator()` (lazy `for…of`, O(depth), no
  recursion limit; `walkDescendantsBreadthFirst()` available where a BFS
  pass is cheaper). The Walker adds only what `traversals` doesn't: flat-tree
  awareness (descend `shadowRoot`, resolve `<slot>` via `assignedElements()`,
  `<template>.content`) and **skipping foreign-content subtrees**
  (`<svg>`/`<math>`) per [`categories.md`](guides/w3c/categories.md) — node
  typing via the `isElement` / `isHTMLElement` / `matchesTag` / `isTagType`
  guards, never hand-rolled `nodeType` checks. Freeze live collections with
  `toArray()` before any DOM-sensitive pass (traversals.md §Contract 6).
- ✅ `RuleContext` per node: resolved effective content model (via
  `resolveModel`, which walks `getAncestors()` / `findClosest()`),
  `parentChain` = `getAncestors()`, inherited restrictions
  (no-interactive / no-`a` / no-`tabindex` flags accumulated from ancestors),
  and a lazily-computed `getComputedStyle` accessor (only read when the
  presentation lens asks — keeps the structure lens style-free and fast).
- ✅ `resolveModel` / `effectiveCategories` / `flatChildren` / `nodePath`
  (the last wraps `getPathToAncestor()`) helpers in `helpers.ts` — adapters,
  not re-implementations.
- ✅ Unit suite (`tests/src/browser/inspector/Walker.test.ts`) — real DOM
  fixtures per AGENTS §16.2 (seeded via `compileGenerator()` +
  `createRandom()` for synthetic trees): detached root → flow; nested
  transparent (`<a><ins>…`) resolution; slotted/shadow descent;
  `<template>` content; foreign-subtree skip.

---

## Phase 3 — Rule engine + rule families

> Split into 3 sequential, independently-reviewable parts. **Part 1 ✅:**
> the `RuleInterface`/`Finding`/`FindingSeverity`/`RuleLens` types + the
> rule engine + the four schema-data-driven families (`context` /
> `content` / `transparent` / `structure`) + their real-DOM fixture
> suites. **Part 2 ✅:** the `attribute` family (coupling +
> parser-coerced value rules) over the same frozen `rules` registry,
> driven by the Phase-1 `AttributeRule` data + two corpus-bound
> attribute-bound/domain constants. **Part 3 ✅:** the `interaction`
> family (hidden reference integrity — the invented inert-reference rule
> was removed as non-corpus; spec is source of truth), plugged into the
> same `rules` registry / `RuleInterface` contract unchanged. **Phase 3
> is COMPLETE.**

- ✅ `RuleInterface`: `{ id, severity, lens, evaluate(element, context) }`
  — pure, side-effect-free, one finding or null. Composite predicates are
  built from [`@elements/core` validators](guides/validators.md)
  compositors (`andOf` / `orOf` / `unionOf` / `whereOf` / `notOf` /
  `enumOf` / `literalOf`) rather than ad-hoc boolean spaghetti — each rule
  reads as a named guard composition. Landed in
  [`src/browser/inspector/rules.ts`](src/browser/inspector/rules.ts) as a
  frozen `rules: readonly RuleInterface[]` registry; `Finding` /
  `FindingSeverity` / `RuleLens` types live in
  [`types.ts`](src/browser/types.ts) (the shared shape Phase 4 compiles).
- ✅ Rule families (each a small set of generic rules driven by the schema
  data, not per-element hand-code) — **context / content / transparent /
  structure ✅ (part 1); attribute ✅ (part 2); interaction ✅ (part 3)**:
  - ✅ **context** — element not allowed in its parent's resolved model
    ([dom.html#content-models](https://html.spec.whatwg.org/multipage/dom.html#content-models)).
  - ✅ **content** — the parent's `childModel` order/cardinality unsatisfied
    (the ONE ordered-model reporter — closed sequence or prefix + open
    category arm); forbidden descendant present; child not an allowed
    category
    ([dom.html#kinds-of-content](https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content)).
  - ✅ **transparent** — interactive / `a` / `tabindex` descendant of `<a>`;
    nested-`<audio>`/`<video>`
    ([dom.html#transparent-content-models](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models)).
  - ✅ **structure** — the discrete named constraints from the schema:
    `single-first-child`
    ([summary](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element),
    [legend](https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element),
    [caption](https://html.spec.whatwg.org/multipage/tables.html#the-caption-element)),
    `edge-child`
    ([figcaption](https://html.spec.whatwg.org/multipage/grouping-content.html#the-figcaption-element)),
    `parent-restricted`
    ([li](https://html.spec.whatwg.org/multipage/grouping-content.html#the-li-element),
    [dt/dd](https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element)),
    void-has-children. Implemented GENERIC per `ContentConstraintKind`
    (one evaluator per kind, driven by the schema constraint DATA), not
    per-element. The pure-ordering kinds (`child-order` / `group-order`,
    the `table`/`picture`/`ruby`/… models) are NOT a structure rule — they
    are folded into `childModel`, owned solely by the `content` family
    (Phase-3.1 single-source fix: one finding per violation, no
    content↔structure double-report; `single-first-child` / `edge-child`
    are the disjoint CHILD-keyed reciprocals, deferring to `content` when
    the parent's `childModel` already requires that position).
    `no-interactive-descendant` / `no-tabindex-descendant` constraint kinds
    are reported by the `transparent` family via `RuleContext.restrictions`
    (one finding per violation — the structure family deliberately does not
    re-evaluate those two kinds).
  - ✅ **attribute** _(part 2)_ — six generic schema-data-driven rules over
    the Phase-1 `entry.attributes` (`AttributeRule`) data + two
    corpus-bound module constants (`ATTRIBUTE_INTEGER_BOUNDS` /
    `ATTRIBUTE_ENUM_DOMAINS`): `attribute/coupling`
    (`a`/`area[target|download|ping|rel|hreflang|type|referrerpolicy]` ⇒
    `href`, [links.html](https://html.spec.whatwg.org/multipage/links.html)),
    `attribute/required` (`bdo` ⇒ `dir`, `data` ⇒ `value`, `map` ⇒
    `name`), `attribute/value` (`AttributeRule.values` via `parseEnum` —
    `bdo` `dir∈{ltr,rtl}`, `th` `scope` domain
    ([tables.html](https://html.spec.whatwg.org/multipage/tables.html#the-th-element)),
    `dialog` `closedby`), `attribute/coupling-domain` (the note-keyed
    corpus DOM checks a tree-walker can decide — `time` w/o `datetime` ⇒
    non-empty child text
    ([text-level-semantics.html](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element)),
    `img[ismap]` ⇒ flat ancestor `a[href]`, `colgroup[span]` ⇒ no `col`
    children, `dialog[tabindex]` ⇒ must not be specified),
    `attribute/integer` (`parseInteger` over the corpus bounds —
    `tabindex` valid integer, `colgroup`/`col` `span` 1–1000, `td`/`th`
    `colspan` 1–1000 / `rowspan` 0–65534), `attribute/enum` (`parseEnum`
    over the corpus-stated global domains — `dir∈{ltr,rtl,auto}`,
    `contenteditable`, `inputmode`). All attribute-VALUE checks coerce via
    the inspector's HTML-faithful coercion helpers (`coerceEnumAttribute` —
    ASCII case-insensitive enumerated-keyword match — / `coerceIntegerAttribute`
    — HTML `-?[0-9]+` valid-integer grammar) composing the
    [`@elements/core` parsers](guides/parsers.md) (coerce-or-`undefined`,
    never hand-written attribute parsing); attribute-only ⇒ disjoint from
    the other families (one finding per violation). `loading`/`crossorigin`
    deliberately NOT encoded — the corpus prose states only "limited to
    only known values", never the keyword set (faithfulness: no invented
    domain). One faithful schema addition: `img`'s `ismap` and `colgroup`'s
    `span` note-only `AttributeRule` (the established `time`/`datetime`,
    `dialog`/`tabindex` precedent), bidirectionally parity-bound in
    `tests/guides/w3c.test.ts` (strengthen-only).
  - ✅ **interaction** _(part 3)_ — `hidden` reference integrity: a
    non-hidden `a[href="#id"]`/`label[for]`/`output[for]` must not target a
    `hidden` element (`interaction/hidden-reference`)
    ([interaction.html](https://html.spec.whatwg.org/multipage/interaction.html)
    §6.1, corpus-faithful per interactions.md §6.1). Generic over the
    corpus associations (the `for` IDREF read via the schema
    `AttributeRule`, never a tag literal); reference resolution composed
    from [`traversals`](guides/traversals.md) `getElementById` — not
    bespoke DOM walks. **No inert reference-integrity rule ships.** An
    `interaction/inert-reference` rule was specified here and built, then
    **removed**: the WHATWG spec (interaction.html §6.3 "Inert subtrees",
    incl. §6.3.1 / §6.3.2) states only what inertness _does_ and _how_ a
    node becomes inert — it states **no** inert reference-integrity
    conformance rule, and its only near-prose (§6.3 "an inert subtree
    should not contain content or controls which are critical to
    understanding…") is explicitly non-normative AND not
    tree-walker-decidable. Encoding it would have **invented a rule the
    spec does not state**, citing a section that does not state it. Per
    this ROADMAP's own governing doctrine (the WHATWG spec is the source of
    truth; code never invents a rule the spec doesn't state; **when cache
    and spec disagree, the spec wins and the cache — here the plan's
    rule-list text — is corrected**), the rule was removed and this
    spec-text corrected to match what ships. `dialog` must not carry
    `tabindex` is **owned by the `attribute` family**
    (`attribute/coupling-domain`, interactives.md:552) — the interaction
    family deliberately defers it (no double-report); `aria-*` IDREFs are
    deliberately NOT a reference kind (the corpus never cards an `aria-*`
    domain — the only `aria-*` it mentions, `aria-describedby`, is the
    hidden-rule EXEMPTION — so encoding one would invent it; the Phase-3.2
    `loading`/`crossorigin` faithfulness precedent).
- ✅ Each family gets a fixture-driven unit suite (real DOM, no mocks;
  seeded `createRandom()` perturbation so failures are reproducible).
  **Part 1 ✅:**
  `tests/src/browser/inspector/{context,content,transparent,structure}.test.ts`.
  **Part 2 ✅:** `tests/src/browser/inspector/attribute.test.ts` —
  clean-pass + dirty-fail + seeded perturbation per rule, plus
  whole-`rules`-registry one-finding-per-violation / disjointness
  assertions. **Part 3 ✅:**
  `tests/src/browser/inspector/interaction.test.ts` — clean-pass +
  dirty-fail + seeded perturbation per rule, plus whole-`rules`-registry
  one-finding-per-violation / disjointness assertions (incl. the
  `dialog[tabindex]`-stays-one-`attribute/coupling-domain` boundary).

---

## Phase 4 — Findings + `Inspector` entity

> **§14 amended (governing-doc correction, owner-authorized).** AGENTS.md
> §14 described a class-based `Emitter<TMap>` / `EmitterInterface` /
> `EmitterHooks` primitive that **did not exist anywhere in the repo** (the
> tokens appeared only in ROADMAP/AGENTS prose; no `src/**` implementation).
> The repo's real observable-events idiom is the DOM `CustomEvent` model —
> `emit` / `dispatch` / `listen` / `bindEventMap` (`helpers.ts`), the
> `elements:{source}:{verb}` name constants (`constants.ts`, mirrored into
> the composable/component CSS-parity tree in `events.ts`), and
> `{Entity}Options.on?: Partial<{Entity}EventMap>` wired via `bindEventMap`
> — used by every `create*` factory. §14 was rewritten to describe that real
> contract faithfully (only §14; house style kept; nothing invented; the
> unimplemented `Emitter` primitive description removed). Same doctrine as
> the corpus rule: spec/reality is source of truth — correct the
> aspirational doc to match established code. The Inspector uses this
> established idiom; it invents no `Emitter` class. The inspector is a
> dev-tool ENTITY, not a composable, so its `INSPECTOR_EVENTS` constant
> lives in `constants.ts` only and is deliberately NOT registered into the
> `events.ts` composable tree (whose `composables.test.ts` vocabulary gate
> governs composables/components, not the inspector) — keeping that Phase-1
> gate green and semantically honest with zero escape-hatch.

- ✅ `Finding` (data, `readonly`): `severity`, `rule` (id), `element`,
  `path` (stable DOM `Element[]` from `getPathToAncestor()`), `message`,
  `cite`, `expected`/`actual`. The **serializable** projection
  `FindingRecord` (live `element` dropped, `path` the serializable
  `describePath` string) is declared **once** in `types.ts` and expressed
  as an `@elements/core` `ContractShape` run through `compileContract()` in
  `schema.ts` (`findingContract`, beside the Phase-1 `contentModelContract`,
  with a module-load `FINDING_CONTRACT_GUARDED` `generate∘is` soundness IIFE
  mirroring `CONTRACT_GUARDED`) — yields the JSON Schema findings-report
  contract + a `Guard` consumers import, DERIVED from the one declaration.
  The in-memory `Finding` is reconciled ADDITIVELY (`extends
Omit<FindingRecord,'path'>` + the runtime `element` / `Element[]` path):
  zero duplication, no hand-maintained parallel interface, the Phase-3
  `Finding` / `RuleInterface` / rules.ts untouched (structurally identical).
- ✅ `FindingManager` (§9/§10, `src/browser/inspector/FindingManager.ts`):
  `finding(id)` / `findings()` (overloaded by argument TYPE — `severity` /
  `lens` / subtree `ParentNode`); `clear()` / `clear(id)` / `clear(ids)` the
  §10 three-overload single verb (`clear(id)`/`clear(ids)` → `boolean`).
  Modeled on the in-repo `createTable` `TableSelectionManagerInterface` +
  `selectionClear`/`selectionSelect` function-overload precedent.
- ✅ `Inspector` (§7 class order, the §14-amended CustomEvent emitter,
  `src/browser/inspector/Inspector.ts`): `inspect(options? = { root:
document })` → `InspectionResult` (`findings`, `counts` by severity,
  `walked`, `duration`). `InspectorOptions` per §4.2.1
  `{ on?, severity?, lens?, root? }`. Emits `start` → `finding` (×N) →
  `done` via `emit` on the resolved root element (the events bubble);
  `options.on` wired via `bindEventMap`, scoped to the pass. `inspect()`
  composes the Phase-2 `Walker` + the frozen Phase-3 `rules` registry with
  ZERO re-implementation of walking / rule-eval / dedup; a non-Element /
  rootless `ParentNode` throws per §13.
- ✅ `export * from './Inspector.js'` (+ `./FindingManager.js'`) through the
  inspector barrel → the sole `src/browser/index.ts`; full TSDoc + an
  `@example` on `Inspector` and `FindingManager`.
- ✅ Suite `tests/src/browser/inspector/Inspector.test.ts` — real-DOM
  (§16.2, no mocks): clean tree → zero findings; the registry-proven dirty
  tree → exact `['content/required']` + `InspectionResult`
  counts/walked/duration≥0; emitter order EXACTLY `['start','finding',
'finding','done']` via the real `listen` helper AND `options.on`;
  pass-scoped `on` (no stale accumulation); `severity` filter bites
  (`'warning'` drops the real `error`); `lens` filter
  (`'presentation'`→none); `FindingManager` singular/plural + the §10
  three-overload `clear`; `inspect()` determinism + `inspector.rules === rules`;
  §13 rootless-`ParentNode` throw; `findingContract` validates the
  serializable projection (and bites on an empty `rule`).

---

## Phase 5 — Presentation lens (computed-style)

The "inspect our CSS" half. Each rule reads `context.style` (lazily) and
fires only when an override **breaks semantics** (corpus:
[`renderings.md`](guides/w3c/renderings.md) §15, canonical
[rendering.html](https://html.spec.whatwg.org/multipage/rendering.html)):

> **Phase 5 COMPLETE.** Six `lens:'presentation'` rules
> (`presentation/{list-style,bidi,preformatted,hidden,focus,visibility}`)
> appended to the frozen `rules` registry, the tabular core
> driven by the parity-gated `PRESENTATION_DEFAULTS` corpus DATA
> (`constants.ts`, `PresentationDefault` in `types.ts`, STRENGTHENED
> bidirectional binding in `tests/guides/w3c.test.ts`), unit suite
> `tests/src/browser/inspector/presentation.test.ts` (real DOM + real
> framework CSS; valid-default + valid-with-compensation → 0,
> genuine-violation → 1, seeded perturbation, whole-registry
> disjointness). Scope boundaries are corpus-faithfully documented +
> tested (the Phase-3.3 "correct the plan to what faithfully ships"
> precedent — spec/decidability/non-goal is the source of truth):
> **(a)** the `summary:first-of-type ⇒ display:list-item` MARKER is
> presentational, not the summary's semantic (it stays the disclosure
> control at any `display`; the genuine "summary first child" rule is the
> STRUCTURE lens) — per the ROADMAP non-goal ("nothing stylistic") +
> the false-positive doctrine (virtually every design system / this
> framework restyles it), it is deliberately OUT OF SCOPE;
> **(b)** the closed-`<details>` body-hiding is shadow-`::details-content`
> internal and (per the §15.5.5 corpus prose itself) "not directly
> visible to author code", so a light-child computed-style check would
> false-positive on every conformant closed `<details>` — NOT statically
> decidable, deliberately OUT OF SCOPE; **(c)** `presentation/focus` is
> scoped to the INLINE `outline` removal (the one false-positive-free
> decidable signal — a conformant `<button>`'s BASE computed
> `outline-style` is `none`, the ring being `:focus-visible`-only), the
> dynamic-pseudo synthesis deliberately not invented;
> **(d)** the former `display: contents` box-vs-semantic CARVE-OUT in
> `offendingPresentationDefault` is now **OBSOLETE and REMOVED**. It
> existed solely to keep `presentation/list-item` + `presentation/table`
> from firing on a box-eliding `display:contents` (the element keeps its
> a11y role per CSS Display 3 / HTML-AAM). With BOTH those rules removed
> (boundary (e)), NO `PRESENTATION_DEFAULTS` entry has
> `property === 'display'` (only the bidi `unicode-bidi` + preformatted
> `white-space` rows remain), so the
> `if (property==='display' && actual==='contents') continue` branch was
> dead code; per the philosophy "reduce root complexity, do not leave
> vestigial exceptions / dead carve-outs" it is DELETED, not retained. The
> surviving `unicode-bidi`/`white-space` rules are a different semantic
> axis a `display:contents` never preserved, so bidi/pre behavior is
> byte-equivalent and the verbatim `w3c.test.ts` parity binding stays
> un-weakened (the data was never the carve-out's mechanism — it was rule
> logic, now gone with its sole consumers); **(e)** `presentation/list-item`
> (the `li ⇒ display:list-item` rule) **AND** `presentation/table` (the
> `table`/`caption`/`thead`/`tbody`/`tfoot`/`tr`/`td`/`th ⇒ display:table-*`
> rule) are **BOTH DELIBERATELY REMOVED — neither ships.** Per WHATWG HTML
> / CSS Display Module Level 3 / HTML-AAM an element's a11y-tree role does
> NOT depend on its `display` value: a `<li>` styled
> `flex`/`grid`/`inline-flex`/`contents`/`block` is STILL a list item, and
> a `<td>`/`<tr>` so styled is STILL a cell/row (each loses only the
> purely-visual generated marker/table box). Keying an `error` on
> `display ∉ ['list-item']` / `display ∉ ['table-*']` is therefore the
> exact STYLISTIC CSS-linting the ROADMAP non-goal forbids ("only flags
> overrides that contradict an element's SEMANTICS, nothing stylistic") —
> list-item `error`-false-positived on the framework's OWN
> documented-conformant breadcrumb (`_nav.scss`
> `nav[aria-label] > :is(ol,ul) > li { display: inline-flex }`,
> `NavPage.vue` §Breadcrumb, no `role=listitem`) and pagination row, and
> table `error`-false-positived on the framework's OWN documented
> expandable-table idiom (`_table.scss` `table > tbody >
tr:has(+ tr[data-table-expansion]) > td:first-child { display: flex }`,
> `TablesPage.vue`, no `role="cell"`). An a11y-OUTCOME-correct version of
> either would fire only on `display:none` (already owned by
> `presentation/hidden`) or a `role` reassignment (the "not an ARIA
> auditor" non-goal) — redundant or disclaimed either way. The
> genuinely-semantic, corpus-stated, tree-decidable list concern
> (`list-style:none` stripping the list role without `role=list`) ALREADY
> ships as the surviving `presentation/list-style` `warning`; there is no
> analogous tree-decidable table concern beyond `display:none` (owned by
> `presentation/hidden`). Phase-3.3 doctrine: when the spec / non-goal
> wins, CORRECT THE PLAN and reduce root complexity — do not pile
> carve-outs onto an inherently-stylistic rule. The `li` row **and** the 8
> table-model rows are removed from `PRESENTATION_DEFAULTS` alongside the
> rules (they existed ONLY for these rules); parity is un-weakened (the
> binding is the forall "every entry corpus-supported" — removing
> corpus-supported entries cannot weaken it). Conscious related decision:
> `presentation/list-style` will
> (correctly, BY DESIGN) surface as a `warning` on a `list-style:none`
> list lacking `role="list"` INCLUDING the first-party `<menu>`
> (`_menu.scss` strips `list-style`) — corpus-grounded (`aria.md`
> §58-59/§165-168 + `renderings.md` §15 marker) as a genuine degraded AT
> list affordance; kept a `warning` (NOT downgraded — that would be
> symptom-hiding), and Phase 6 triages warnings (only FAILS on `error`),
> so it is expected & non-blocking.

- ✅ `ul`/`ol`/`menu` computed `list-style-type:none` ⇒ list semantics
  stripped with no compensating `role=list` (`presentation/list-style`,
  `warning` — a degraded affordance). The `li ⇒ display:list-item` rule
  was **REMOVED** (not shipped): a `display` change does NOT strip the
  `<li>`'s a11y `listitem` role (WHATWG / CSS Display 3 / HTML-AAM), so it
  was the inherently-stylistic CSS-linting the non-goal forbids and
  `error`-false-positived on the framework's own conformant breadcrumb /
  pagination — spec/non-goal wins, plan corrected (boundary (e) above;
  Phase-3.3 doctrine). `[dir]`-generic deliberately scoped out
  (ARIA-roleless, stylistic-adjacent — documented boundary).
- ✅ `bdo` ⇒ `unicode-bidi: isolate-override`; `bdi` ⇒ `isolate`
  (`presentation/bidi`, scoped to the bidi elements themselves).
- The `table`/`caption`/`thead`/`tbody`/`tfoot`/`tr`/`td`/`th ⇒
display:table-*` rule (`presentation/table`) was **REMOVED** (not
  shipped): a `display` change does NOT strip a table element's a11y
  `table`/`row`/`cell`/`rowgroup`/`columnheader` role (WHATWG / CSS Display
  3 / HTML-AAM), so it was the inherently-stylistic CSS-linting the non-goal
  forbids and `error`-false-positived on the framework's own
  documented-conformant expandable-table idiom (`_table.scss` `table >
tbody > tr:has(+ tr[data-table-expansion]) > td:first-child {
display: flex }`, `TablesPage.vue`, no `role="cell"`). The only
  tree-decidable table concern (`display:none`) is owned by
  `presentation/hidden`; a `role` reassignment is the "not an ARIA auditor"
  non-goal — redundant or disclaimed either way. The 8 table-model
  `PRESENTATION_DEFAULTS` rows are removed with it — spec/non-goal wins,
  plan corrected (boundary (e) above; Phase-3.3 doctrine; same root cause
  as the removed `presentation/list-item`).
- ✅ `[hidden]:not([until-found]):not(embed)` ⇒ `display:none`;
  `[hidden=until-found]:not(embed)` ⇒ `content-visibility:hidden` (not
  `display:none/contents/inline`). The `:not(embed)` carve-out honored.
- ✅ `pre` ⇒ `white-space: pre|pre-wrap`; `textarea` ⇒ `pre-wrap`
  (or `pre` when `wrap` is an ASCII-case-insensitive `off`).
- ✅ Focusable/interactive elements: an INLINE `outline:none`/`0`
  (provably defeats `:focus-visible{outline:auto}` by inline specificity
  in every state) **without** a replacement affordance (box-shadow /
  border / non-interactive role). `:focus-visible` synthesis is not
  decidable in a tree-walk and is deliberately not invented (boundary
  documented above + in `rules.ts`).
- ✅ `dialog:not([open])` / `[popover]:not(:popover-open)` ⇒ not visibly
  rendered (`presentation/visibility`). The `summary:first-of-type` marker
  and closed-`details` body checks are documented OUT OF SCOPE (above) —
  presentational / shadow-internal-undecidable per the corpus.
- ✅ Reuses the running `src:browser` (chromium) `getComputedStyle`
  harness (`setupBrowser.ts` loads `src/styles/index.scss`) — same
  instrumented-audit muscle as the theme-retune / reduced-motion /
  forced-colors passes.

---

## Phase 6 — Showcase self-audit suite

- ✅ `tests/app/browser/semantics.test.ts` — mounts every one of the 43
  showcase pages in ISOLATION (`createApp(page).mount(host)` onto a fresh
  body `<div>`, the `ButtonPage.test.ts` idiom), runs
  `new Inspector().inspect({ root: host })` over the mounted DOM with both
  lenses (real framework cascade via `setupBrowser.ts`), one `it()` per
  page, asserts **zero `error`-severity findings** (`counts.error === 0`);
  warnings/advice are REPORTED (per-page `advisory` collection + a
  non-failing `afterAll` `console.warn` summary), NOT failed. Mirrors the
  `parity.test.ts` / `pages.test.ts` standing-driver pattern (barrel
  `*Page` identity map, no separate registry); a permanent
  continuously-verified conformance corpus. SHIPPED & green for 40/43
  pages; the 3 red pages are the genuine inventory escalated below.
- ⬜ Triage + remediate every real finding the inspector surfaces on our own
  markup and our own cascade. **ESCALATED (NEEDS_CONTEXT) — substantial &
  judgment-laden, NOT mass-edited unilaterally** (per the ROADMAP
  escalation bar: documented framework idioms, competing remediation
  approaches, high blast radius). The COMPLETE actual inventory from the
  real run (the source of truth — not a prediction):
  - **`error` · `context/parent-model` · MenuPage (×4) + UseMenuPage (×4)
    · cite `groupings#the-menu-element`.** `<h6>` and `<hr>` are direct
    children of `<menu>` (MenuPage `<menu popover id="demo-dropdown-full">`
    "Section headers + dividers"; UseMenuPage `stickyMenu`/`filterMenu`
    `<h6>`, `defaultMenu`/`filterMenu` `<hr>`). `<menu>`'s content model
    is "zero or more `li` and script-supporting elements"
    (`groupings.md` line 804) — a GENUINE markup non-conformance, but a
    DELIBERATE JSDoc-documented "Mailbox-parity composition" framework
    idiom used repeatedly across the canonical `<menu>` reference page +
    its composable page + embedded `<pre><code>` doc snippets. Remediation
    is a judgment call (per-group `<li>` wrappers vs. role vs. element
    restructure) touching ≥2 pages + `_menu.scss` chrome — owner-decided.
  - **`error` · `content/category` · UseToastPage (×22) · cite
    `forms#the-output-element`.** `<p>` (×21) and `<header>` (×1) are
    direct children of `<output popover>` (the toast composable's core
    chrome — `<output>` + `<p>` body + optional `<header>`/`<footer>`).
    `<output>`'s content model is "phrasing content" (`forms.md` line
    881); `<p>`/`<header>` are flow — a GENUINE non-conformance, but it is
    the FUNDAMENTAL element architecture of the shipped `createToast`
    composable (highest blast radius: `createToast` + `_toast.scss` +
    `UseToastPage.vue` + toast tests) — owner-decided.
  - **`warning` · `presentation/list-style` ×113 across the showcase** —
    role-less `list-style:none` lists (incl. the first-party `<menu>`).
    BY-DESIGN per Phase-5 boundary (e); REPORTED by the gate, NOT failed.
    Expected & non-blocking. No remediation (a conscious design warning).
  - `advice`: none. No other `error` rules fired over the 27-rule × 43-page
    matrix.
- ✅ **`_textarea.scss` `wrap=off` non-conformance (a Phase-5-surfaced
  genuine finding) — REMEDIATED.** `src/styles/elements/_textarea.scss`
  set `white-space: pre-wrap` UNCONDITIONALLY; per `renderings.md
  §15.5.17` a `<textarea wrap="off">` is a presentational hint that MUST
  compute `white-space: pre`. **Done:** added
  `&[wrap='off' i] { white-space: pre }` inside the `@layer elements`
  `textarea` block (higher specificity than the bare rule, same layer →
  deterministically wins for `wrap=off`/`wrap=OFF` while default/`soft`
  keep `pre-wrap`). Verified by real computed style on the live showcase
  dev server (`wrap=off`/`wrap=OFF` → `pre`; default/`soft` → `pre-wrap`,
  no visual regression) and the inspector. The locked
  `<textarea wrap="off">`→`presentation/preformatted` test in
  `tests/src/browser/inspector/presentation.test.ts` was FLIPPED from
  "exactly one error" to "ZERO" (kept bites-both-ways: red again if the
  remediation regresses) + a new default-`<textarea>` regression-guard
  test; the conformant-sweep gained a `<textarea wrap="off">` case. The
  corpus-faithful rule was NEVER weakened — the framework was fixed at the
  source.

---

## Phase 7 — `/inspector` showcase page + guide

- ⬜ `app/browser/pages/InspectorPage.vue` + route + `tests/app/browser/
pages/InspectorPage.test.ts` (the standard page bijection) — a live,
  in-page panel that runs the inspector on the current document and renders
  findings (severity, element path, message, spec citation). Authored
  framework-faithfully (elements → modifiers → utilities → `showcase.css`
  only if unavoidable), no inline styles, app logic out of framework code.
- ⬜ `guides/inspector.md` — the spec for the inspector: schema shape, rule
  catalog, the transparent algorithm, the two lenses, how to add a rule
  (types-first → schema/rule → fixture suite → parity), citing
  `guides/w3c/**`. Add to the `AGENTS.md` companion-doc list + the phase
  spec-guide map.

---

## Phase 8 — Public-API parity hardening + performance

- ⬜ Treat the inspector as part of the public `src/browser` API: it ships
  through the sole barrel; `tests/src/browser/inspector/**` covers it;
  schema↔guides parity is permanent (Phase 1). The inspector's own guide
  (`guides/inspector.md`, Phase 7) is held to the **same doc↔source
  contract** the five tooling guides exemplify — `tests/guides/inspector.test.ts`
  (every backticked API resolves to a real export, bidirectional) ↔
  `tests/src/browser/inspector/**` (behavior).
- ⬜ Large-tree budget: a perf test over a **deterministic** deep/wide DOM
  built from `compileGenerator()` + `createRandom(seed)` (reproducible
  across runs), asserting a walked-node-per-ms floor so a walker / rule
  complexity regression is caught. Tune only with evidence (AGENTS §16.3).
- ⬜ Final sweep: `npm run check` 0/0, targeted suites green, `npm run
format`, ROADMAP + guides updated, commit/push.

---

## Conventions to keep applying

Carried from the framework build; they govern inspector work too.

- **The WHATWG spec is the source of truth.** `guides/w3c/**` is a curated
  local cache of <https://html.spec.whatwg.org/>; the schema mirrors the
  cache; code never invents a rule the spec doesn't state. When cache and
  spec disagree, the spec wins and the cache is corrected. A bidirectional
  parity test binds cache↔schema (Phase 1); Phase 0 reconciles cache↔spec
  via targeted multipage fetches.
- **Types-first, single-word, Manager-split.** Public types in
  `src/browser/types.ts` before code; entity members one word; verb
  families become Manager sub-entities (AGENTS §4). Helpers in
  `helpers.ts` are `{verb}{Noun}`.
- **Walk the DOM, never the string.** Native `Element`/`Node`/slot APIs
  only; the inspector accepts any `ParentNode`. No regex, no `innerHTML`
  round-trips, no new dependency.
- **Reuse first-party tooling; don't reinvent.** DOM walks/relationships/
  focus → [`@elements/browser` traversals](guides/traversals.md);
  shape→guard+schema+generator → [`@elements/core` shapers/compilers](guides/compilers.md);
  predicate composition → [validators](guides/validators.md);
  attribute-value coercion → [parsers](guides/parsers.md). New helpers are
  thin adapters over these, not parallel implementations. See
  [Existing tooling we build on](#existing-tooling-we-build-on-no-reinvention).
- **Findings are data.** Structured `Finding` records with a spec
  citation; `Result<T,E>`/`throw` only per AGENTS §13. Severity is a
  closed union (`error`/`warning`/`advice`).
- **Rules are pure.** `(element, context) → Finding | null`, no shared
  mutable state, fixture-tested with real DOM nodes (AGENTS §16.2).
- **Self-audit is permanent.** The showcase is the living conformance
  corpus; the semantics suite is a standing gate, not a one-off pass —
  same philosophy as the instrumented theme/motion/forced-colors audits.
- **Per-item rhythm.** Each ⬜ ships its own slice: check 0/0 → targeted
  suite → `npm run show` (if showcase touched) → `npm run format` →
  ROADMAP/guides update → commit + push.

---

## Reference

- [AGENTS.md](AGENTS.md) — non-negotiable coding rules (read first).
- [guides/contribute.md](guides/contribute.md) — workflow + parity-gate
  commands for each shape of change.
- [**W3C spec reference map**](#w3c-spec-reference-map) — the master table:
  every corpus area → its local cache file → its canonical multipage page +
  stable anchor conventions. The single place to look up the spec link for
  any element/category while implementing a rule.
- <https://html.spec.whatwg.org/multipage/> — the **canonical** source of
  truth. Fetch targeted subsections with a prompt that names the exact §;
  broad/whole-page prompts summarize and must be avoided.
- [guides/w3c/](guides/w3c/) — the curated local cache the schema derives
  from (Phase 0 reconciles it against the canonical spec and closes the
  known gaps; see the reference map for per-file ↔ page mapping).
- [**Existing tooling we build on**](#existing-tooling-we-build-on-no-reinvention)
  — the need → reused-API table; read before writing any Walker/rule code.
- [guides/traversals.md](guides/traversals.md) — `@elements/browser`
  `src/browser/traversals.ts`: the complete native DOM walk / relationship /
  focus surface the Walker is a thin layer over.
- [guides/shapers.md](guides/shapers.md) · [guides/compilers.md](guides/compilers.md)
  — `@elements/core` shape DSL → JSON Schema + guard + parser + **seeded
  generator** from one declaration (schema-entry & `Finding` contracts,
  test/perf fixtures).
- [guides/validators.md](guides/validators.md) — `@elements/core` runtime
  guards + compositors (`andOf`/`orOf`/`whereOf`/`lazyOf`/…) — rule
  predicate composition.
- [guides/parsers.md](guides/parsers.md) — `@elements/core` coercing
  parsers (`parseInteger`/`parseEnum`/`parseBoolean`/…) — attribute-value
  rules.
- [src/browser/taxonomy.ts](src/browser/taxonomy.ts) /
  [patterns.ts](src/browser/patterns.ts) — the frozen-registry +
  parity-test pattern `schema.ts` is modeled on.
- [src/browser/helpers.ts](src/browser/helpers.ts) — the existing
  DOM-walking idiom (`extractRows`, `readTableRows`, `findDetailRow`, …)
  the Walker extends.
- [guides/patterns.md](guides/patterns.md) — codified-contract prose,
  parallel to how the rule catalog will be documented.
