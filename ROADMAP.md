# Plan — Semantic HTML Inspector

> Living blueprint for the next initiative: a dependency-free, DOM-walking
> **semantic HTML inspector**. Read this to know **where to pick up**; read
> [`AGENTS.md`](AGENTS.md) for the non-negotiable coding rules and
> [`guides/contribute.md`](guides/contribute.md) for the workflow.

**Framework baseline (done — not the subject of this roadmap):** every
framework layer (tokens, theme, mixins, modifiers, elements, components,
surfaces, composables) and all 43 showcase pages ship green — full suite
**146 files / 7057 tests**, `npm run check` 0/0, all 11 build phases
complete. The framework is the *substrate* the inspector validates; it is
not re-planned here.

---

## The idea

A **semantic HTML inspector**: a TypeScript analyzer that **walks a live DOM
subtree node-by-node** (never parses HTML strings) and reports where the tree
— or the CSS painted on it — violates the HTML content-model, contextual,
interaction, and spec-rendering rules.

Two lenses, one walk:

1. **Structure lens** — for every element, decide: *is this element allowed
   where it sits* (its parent's / ancestor context), and *does its own
   subtree satisfy its content model* (required children present and ordered,
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
   CSS that strips the semantics: `<li>` not `display: list-item`, `<bdo>`
   not `unicode-bidi: isolate-override`, the `<table>` display model
   collapsed, focus outline removed with no replacement affordance,
   `[hidden]` overridden visible, `<pre>` losing `white-space: pre`,
   `<textarea>` losing `pre-wrap`, list-semantics stripped with no
   compensating ARIA, etc. This turns the inspector into a **self-audit of
   our own cascade** — the same instrumented-audit muscle the theme-retune /
   reduced-motion / forced-colors passes used, made permanent and codified.

**Why from scratch:** no off-the-shelf tool does *DOM-tree* semantic
conformance with a citeable rule corpus and zero dependencies. The HTML
validator parses source strings; linters are AST/source based; AT-focused
tools check ARIA, not HTML content models. We already own a mirrored W3C
corpus (`guides/w3c/**`), a frozen-registry + parity-test discipline, and a
DOM-walking idiom across every factory. The inspector is the natural apex of
that doctrine: **the WHATWG spec is the source of truth, the `guides/w3c/**`
cache + a frozen schema mirror it, the inspector enforces it on real DOM,
parity tests keep cache ↔ schema ↔ spec in lock-step** (see the
[W3C spec reference map](#w3c-spec-reference-map)).

### Hard constraints (non-negotiable)

- **No new dependencies.** Native `Document` / `Element` / `Node` /
  `getComputedStyle` / `ShadowRoot` / slot APIs only (AGENTS.md §1).
- **No string / regex HTML parsing.** The inspector consumes a *parsed*
  `ParentNode` (default `document`); it walks `.children` /
  `.parentElement` / `.attributes` / `assignedElements()` and reads
  `tagName` / computed style — exactly the idiom every `create*` factory and
  `helpers.ts` (`extractRows`, `readTableRows`, `findDetailRow`, …) already
  uses.
- **Types-first (TTTDD).** Every public type lands in
  [`src/browser/types.ts`](src/browser/types.ts) (the single source of
  truth) before implementation. Single-word entity members; split via the
  Manager pattern (§4.2.2) when a verb family grows.
- **Operates on the post-parse DOM.** Tag-omission and implicit-element
  insertion (`<tbody>`, `<head>`) are already resolved by the parser, so
  omission rules are out of scope *by construction* — but the engine must
  know the DOM can differ from source (implicit `<tbody>`; `<table>` model).
- **Deterministic, offline, fast.** Same DOM → same findings. A budget for
  large trees (Phase 8). Runs inside the existing Chromium test harness.

### Non-goals

- Not an accessibility/ARIA auditor (axe-core's domain) — implicit-role data
  is used only where the *HTML* spec makes it content-model-relevant.
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
        ▼
src/browser/inspector/         ← one class per file (Manager pattern)
   Walker.ts        depth-first native traversal + Context resolution
   RuleManager.ts   the rule registry  (rule(id) / rules())
   FindingManager.ts findings collection (finding(id) / findings() / clear())
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
- **Helpers** → `src/browser/helpers.ts`, `{verb}{Noun}` per §4.3:
  `resolveModel` (transparent resolution up the ancestor chain),
  `effectiveCategories`, `parentChain`, `nodePath` (a stable DOM path for
  findings), `flatChildren` (slot/shadow-aware child list).
- **Constants** → `src/browser/constants.ts`: `VOID_TAGS`,
  `TRANSPARENT_TAGS`, `INTERACTIVE_TAGS`, category membership sets.
- **No `errors.ts`** — findings are *data*, not exceptions.

### The transparent content model (first-class)

`<a>`, `<ins>`, `<del>`, `<object>`, `<video>`, `<audio>`, `<canvas>`,
`<map>`, `<slot>` are "transparent" ([spec:
`dom.html#transparent-content-models`](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models)).
`resolveModel(node)` walks ancestors: if the parent is itself transparent,
recurse; otherwise the effective model is the one the nearest
**non-transparent** ancestor imposes; a detached root resolves to **flow**
(verbatim spec rule: *"when a transparent element has no parent, its content
model restrictions are instead based on flow content"*). Ancestor
*restrictions* propagate through (no interactive / no `<a>` / no `tabindex`
descendant of [`<a>`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element);
no nested `<audio>`/`<video>`). This resolver is the spine of the structure
lens and gets its own dedicated unit suite.

---

## At a glance

| Phase | Description                                                                                  | Status |
| ----- | -------------------------------------------------------------------------------------------- | ------ |
| 0     | Reconcile the `guides/w3c/**` cache against the canonical WHATWG spec                         | ✅     |
| 1     | Schema registry `src/browser/schema.ts` + bidirectional parity test                          | ⬜     |
| 2     | Walker + Context (native traversal, transparent resolver, shadow/slot)                       | ⬜     |
| 3     | Rule engine + rule families (structure / content-model / attribute / ARIA-relevant)          | ⬜     |
| 4     | Findings + `Inspector` entity (Manager + Emitter + severity + DOM path) + barrel             | ⬜     |
| 5     | Presentation lens (computed-style: load-bearing rendering overrides)                         | ⬜     |
| 6     | Showcase self-audit suite — run Inspector on every page; remediate our findings              | ⬜     |
| 7     | `/inspector` showcase page (dogfood, live) + `guides/inspector.md`                           | ⬜     |
| 8     | Public-API parity hardening + large-tree performance budget                                  | ⬜     |

---

## W3C spec reference map

The canonical authority for every rule. Base:
`https://html.spec.whatwg.org/multipage/`. Each corpus area below maps to
its **local cache file** (what the schema mirrors today) and its
**canonical multipage page** (what Phase 0 reconciles against — fetch with a
tightly-scoped, subsection-named prompt). Every phase, rule family, and
Phase-0 gap links back to the matching row here.

| Corpus area | Local cache | Canonical multipage page |
| ----------- | ----------- | ------------------------ |
| Content categories · content models · **transparent** · palpable · inter-element whitespace | *(none — Phase 0 adds `categories.md`)* | [dom.html](https://html.spec.whatwg.org/multipage/dom.html#content-models) |
| Sectioning — `article` `section` `nav` `aside` `h1`–`h6` `hgroup` `header` `footer` `address` | [`elements/sections.md`](guides/w3c/elements/sections.md) *(truncated)* | [sections.html](https://html.spec.whatwg.org/multipage/sections.html) |
| Grouping — `p` `hr` `pre` `blockquote` `ol` `ul` `menu` `li` `dl` `dt` `dd` `figure` `figcaption` `main` `search` `div` | [`elements/groupings.md`](guides/w3c/elements/groupings.md) | [grouping-content.html](https://html.spec.whatwg.org/multipage/grouping-content.html) |
| Text-level (incl. `a`, `bdo`, `data`, `time`, `ruby`, `br`/`wbr`) | [`elements/texts.md`](guides/w3c/elements/texts.md) | [text-level-semantics.html](https://html.spec.whatwg.org/multipage/text-level-semantics.html) |
| Link mechanics — `href` `rel` `ping` `hreflang` keyword tables | [`elements/links.md`](guides/w3c/elements/links.md) | [links.html](https://html.spec.whatwg.org/multipage/links.html) |
| Edits — `ins` `del` (transparent) | [`elements/edits.md`](guides/w3c/elements/edits.md) | [edits.html](https://html.spec.whatwg.org/multipage/edits.html) |
| Embedded — `picture` `source` `img` `iframe` `embed` `object` | [`elements/embeddeds.md`](guides/w3c/elements/embeddeds.md) *(partial)* | [embedded-content.html](https://html.spec.whatwg.org/multipage/embedded-content.html) |
| Media — `video` `audio` `track` (transparent media) | *(none — Phase 0)* | [media.html](https://html.spec.whatwg.org/multipage/media.html) |
| Image maps — `map` `area` | *(none — Phase 0)* | [image-maps.html](https://html.spec.whatwg.org/multipage/image-maps.html) |
| Tabular — `table` `caption` `colgroup` `col` `thead` `tbody` `tfoot` `tr` `td` `th` | [`elements/tables.md`](guides/w3c/elements/tables.md) | [tables.html](https://html.spec.whatwg.org/multipage/tables.html) |
| Forms — `form`, `label` | [`elements/forms.md`](guides/w3c/elements/forms.md) *(form/label only)* | [forms.html](https://html.spec.whatwg.org/multipage/forms.html#the-form-element) |
| Forms — `input` | *(none — Phase 0)* | [input.html](https://html.spec.whatwg.org/multipage/input.html#the-input-element) |
| Forms — `button` `select` `optgroup` `option` `textarea` `fieldset` `legend` `output` `datalist` `meter` `progress` | *(none — Phase 0)* | [form-elements.html](https://html.spec.whatwg.org/multipage/form-elements.html) |
| Interactive — `details` `summary` `dialog` | [`elements/interactives.md`](guides/w3c/elements/interactives.md) | [interactive-elements.html](https://html.spec.whatwg.org/multipage/interactive-elements.html) |
| Interaction — `hidden` `inert` focus/`tabindex` `contenteditable` popover, page visibility, user activation | [`interactions.md`](guides/w3c/interactions.md) *(§6.1–6.4 only)* | [interaction.html](https://html.spec.whatwg.org/multipage/interaction.html) |
| Rendering — UA default CSS / semantically load-bearing presentation | [`renderings.md`](guides/w3c/renderings.md) | [rendering.html](https://html.spec.whatwg.org/multipage/rendering.html) |

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
curated *local cache* of it — convenient and citeable, but it has drifted /
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
- *Sections gap* → `multipage/sections.html`: `header`/`footer` (flow, **no
  `header`/`footer` descendants**), `hgroup` (`p* · one h1–h6 · p*`,
  intermixed script-supporting), `address` (flow, **no heading /
  sectioning / `header` / `footer` / `address` descendants**), `nav`/`aside`
  (flow, sectioning, palpable).
- *Category linchpin* (absent from the cache entirely) →
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
- [`elements/links.md`](guides/w3c/elements/links.md) — link *mechanics*
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
- **No implicit-ARIA role table** (needed only where the *HTML* spec makes
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
  concise clearly-labeled *illustrative* examples (never misattributed —
  the canonical spec URL is on every card).
- ⬜ **`tests/guides/w3c.test.ts` gate** — lands with **Phase 1** (not
  Phase 0): asserts every `taxonomy.ts` element has a fully carded entry
  under `guides/w3c/**` and every schema `cite` resolves. The corpus
  content is done; this test mechanizes the invariant.

---

## Phase 1 — Schema registry (`src/browser/schema.ts`)

The frozen TS mirror of the corpus, shaped exactly like
[`taxonomy.ts`](src/browser/taxonomy.ts).

- ⬜ **Types first** in `types.ts`: `ContentCategory`, `ContentModel`,
  `ContentModelEntry` (`tag`, `categories`, `context` — allowed
  parents/ancestor predicate, `model`, `required` — ordered/cardinal child
  spec, `forbidden` — forbidden descendant categories/tags, `transparent`,
  `void`, `attributes` — coupling rules, `cite` — `guides/w3c` anchor).
- ⬜ **`schema.ts`**: frozen `contentModel: readonly ContentModelEntry[]`
  via a typed `entry(...)` helper; pre-computed `SCHEMA_BY_TAG`,
  `VOID_TAGS`, `TRANSPARENT_TAGS`, `CATEGORY_MEMBERS`; single-word
  predicates `isVoid`, `isTransparent`, `modelOf`, `categoriesOf`,
  `contextOf`, `isKnownElement`.
- ⬜ Encode the discrete named constraints as data (so rules stay generic):
  `no-self-nest` (`a`, `dfn`), `no-interactive-descendant` (`a`,
  `button`), `single-first-child` (`summary`→`details`,
  `legend`→`fieldset`, `caption`→`table`), `edge-child`
  (`figcaption`→`figure` first|last), `group-order` (`dt`/`dd`,
  `ruby` rt/rp), `parent-restricted` (`li`→ul/ol/menu, `td`/`th`→tr,
  `option`→select/optgroup/datalist), the `table` model, `picture` order
  (`source`* then one `img`).
- ⬜ Barrel: `export * from './schema.js'` in
  [`src/browser/index.ts`](src/browser/index.ts).
- ⬜ **`tests/guides/w3c.test.ts`** (bidirectional, mirrors
  `tests/guides/elements.test.ts`): every `guides/w3c/**` carded element
  has a `contentModel` entry whose categories/context/model match the
  prose; every schema entry's `cite` resolves to a real guide anchor; no
  schema entry without a card; no card without a schema entry.

---

## Phase 2 — Walker + Context

- ⬜ `Walker` class: depth-first traversal of a `ParentNode` via native
  `.children` (element-only) with **flat-tree awareness** — descend
  `shadowRoot`, resolve `<slot>` via `assignedElements()`, treat
  `<template>.content` correctly, skip foreign-content subtrees
  (`<svg>`/`<math>`) for HTML content-model checks.
- ⬜ `RuleContext` per node: resolved effective content model (via
  `resolveModel` through transparent ancestors), `parentChain`, inherited
  restrictions (no-interactive / no-`a` / no-`tabindex` flags accumulated
  from ancestors), and a lazily-computed `getComputedStyle` accessor (only
  read when the presentation lens asks — keeps the structure lens style-free
  and fast).
- ⬜ `resolveModel` / `effectiveCategories` / `flatChildren` / `nodePath`
  helpers in `helpers.ts`.
- ⬜ Unit suite (`tests/src/browser/inspector/Walker.test.ts`) — real DOM
  fixtures per AGENTS §16.2: detached root → flow; nested transparent
  (`<a><ins>…`) resolution; slotted/shadow descent; `<template>` content.

---

## Phase 3 — Rule engine + rule families

- ⬜ `RuleInterface`: `{ id, severity, lens, evaluate(element, context) }`
  — pure, side-effect-free, one finding or null.
- ⬜ Rule families (each a small set of generic rules driven by the schema
  data, not per-element hand-code):
  - **context** — element not allowed in its parent's resolved model
    ([dom.html#content-models](https://html.spec.whatwg.org/multipage/dom.html#content-models)).
  - **content** — required child missing / mis-ordered / wrong cardinality;
    forbidden descendant present; child not an allowed category
    ([dom.html#kinds-of-content](https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content)).
  - **transparent** — interactive / `a` / `tabindex` descendant of `<a>`;
    nested-`<audio>`/`<video>`
    ([dom.html#transparent-content-models](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models)).
  - **structure** — the discrete named constraints from the schema:
    `single-first-child`
    ([summary](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element),
    [legend](https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element),
    [caption](https://html.spec.whatwg.org/multipage/tables.html#the-caption-element)),
    `edge-child`
    ([figcaption](https://html.spec.whatwg.org/multipage/grouping-content.html#the-figcaption-element)),
    `parent-restricted`
    ([li](https://html.spec.whatwg.org/multipage/grouping-content.html#the-li-element),
    [dt/dd](https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element)),
    `group-order`
    ([ruby](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element)),
    `table-model`
    ([tables.html](https://html.spec.whatwg.org/multipage/tables.html#the-table-element)),
    `picture-order`
    ([picture](https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element)),
    void-has-children.
  - **attribute** — coupling rules (`a[target|download|ping|rel|hreflang|
    type|referrerpolicy]` ⇒ `href`
    ([links.html](https://html.spec.whatwg.org/multipage/links.html));
    `bdo` ⇒ `dir∈{ltr,rtl}`; `data` ⇒ `value`; `time` w/o `datetime` ⇒
    text-only datetime
    ([text-level-semantics.html](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element));
    `img[ismap]` ⇒ ancestor `a[href]`; `colgroup[span]` ⇒ no `col`
    children; `th[scope]` domain
    ([tables.html](https://html.spec.whatwg.org/multipage/tables.html#the-th-element))).
  - **interaction** — `hidden`/`inert` reference integrity (a non-hidden
    `a[href="#id"]`/`label[for]`/`output[for]` must not target a `hidden`
    element; active `aria-*` IDREF must not point into an `[inert]` /
    modal-inert subtree); `dialog` must not carry `tabindex`
    ([interaction.html](https://html.spec.whatwg.org/multipage/interaction.html)).
- ⬜ Each family gets a fixture-driven unit suite (real DOM, no mocks).

---

## Phase 4 — Findings + `Inspector` entity

- ⬜ `Finding` (data, `readonly`): `severity`, `rule` (id), `element`,
  `path` (stable DOM path), `message`, `cite` (guide anchor),
  `expected`/`actual` where applicable.
- ⬜ `FindingManager` (§9/§10): `finding(id)` / `findings()`; filter by
  `severity` / `lens` / subtree; `clear()` / `clear(id)` / `clear(ids)`.
- ⬜ `Inspector` (§7 class order, §14 emitter): `inspect(root = document)`
  → `InspectionResult` (`findings`, counts by severity, walked-node count,
  duration). `InspectorOptions` per §4.2.1:
  `{ on?, severity?, lens?, root? }`. Emits `start` → `finding`\* →
  `done`.
- ⬜ `export * from './inspector/index.js'` through the sole barrel; full
  TSDoc + an `@example`.
- ⬜ Suite: end-to-end on hand-built clean and dirty trees; emitter event
  order; severity filtering; manager batch ops.

---

## Phase 5 — Presentation lens (computed-style)

The "inspect our CSS" half. Each rule reads `context.style` (lazily) and
fires only when an override **breaks semantics** (corpus:
[`renderings.md`](guides/w3c/renderings.md) §15, canonical
[rendering.html](https://html.spec.whatwg.org/multipage/rendering.html)):

- ⬜ `li` ⇒ `display: list-item`; `ul`/`ol` + `list-style:none` + non-list
  `li` ⇒ list semantics stripped with no compensating `role=list`.
- ⬜ `bdo` ⇒ `unicode-bidi: isolate-override`; `bdi`/`[dir]` ⇒ `isolate`.
- ⬜ Table display model intact (`table`/`tr`/`td`/`th`/`thead`/`tbody`/
  `caption`/`col*` keep their `display:table-*`); flag collapse w/o ARIA
  table roles.
- ⬜ `[hidden]:not([until-found])` ⇒ `display:none`; `[hidden=until-found]`
  ⇒ `content-visibility:hidden` (not `display:none/contents/inline`).
- ⬜ `pre` ⇒ `white-space: pre|pre-wrap`; `textarea` ⇒ `pre-wrap`
  (or `pre` when `wrap=off`).
- ⬜ Focusable/interactive elements: no `outline:none`/`0` on
  `:focus-visible` **without** a replacement affordance (box-shadow /
  border / background delta).
- ⬜ `dialog:not([open])` / `[popover]:not(:popover-open)` ⇒ not visibly
  rendered; `summary:first-of-type` ⇒ `display:list-item`; closed
  `details` content not `display:none` (find-in-page reveal).
- ⬜ Reuses the running-showcase / `getComputedStyle` harness already
  proven by the theme-retune / reduced-motion / forced-colors audits.

---

## Phase 6 — Showcase self-audit suite

- ⬜ `tests/app/browser/semantics.test.ts` — mount every one of the 43
  showcase pages, run `Inspector.inspect()` over the mounted DOM with both
  lenses, assert **zero `error`-severity findings** (warnings/advice
  reported, not failed). Mirrors the `parity.test.ts` / `pages.test.ts`
  standing-driver pattern; makes the showcase a continuously-verified
  conformance corpus.
- ⬜ Triage + remediate every real finding the inspector surfaces on our own
  markup and our own cascade (the whole point — dogfood it against the
  framework). Each fix follows the established per-item rhythm
  (check 0/0 → suite → show → format → ROADMAP → commit/push).

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
  schema↔guides parity is permanent (Phase 1).
- ⬜ Large-tree budget: a perf test (build a deep/wide synthetic DOM)
  asserting a walked-node-per-ms floor so a regression in the walker or a
  rule's complexity is caught. Tune only with evidence (AGENTS §16.3).
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
- [src/browser/taxonomy.ts](src/browser/taxonomy.ts) /
  [patterns.ts](src/browser/patterns.ts) — the frozen-registry +
  parity-test pattern `schema.ts` is modeled on.
- [src/browser/helpers.ts](src/browser/helpers.ts) — the existing
  DOM-walking idiom (`extractRows`, `readTableRows`, `findDetailRow`, …)
  the Walker extends.
- [guides/patterns.md](guides/patterns.md) — codified-contract prose,
  parallel to how the rule catalog will be documented.
