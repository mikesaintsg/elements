# Implementation Plan & Status

> Living tracker of what's built, what's next, and what's deferred. Update with every meaningful change. The companion guides ([styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md)) describe the architecture; this file tracks how much of it has actually shipped and what to build next.

The architectural plan-of-record lives at `~/.claude/plans/i-want-to-make-nifty-quill.md`. This file mirrors its current state of execution.

---

## How to read this plan

- **Substantive (✅ cascade)** — element has a full `--set-{tag}-*` token chain, consumes the modifier cascade, has a TS entry in `elements.ts`, has a behavior test, and a showcase placement (its own page or under a grouped pattern page).
- **Override (🟡)** — element ships a small framework-essential rule (often UA quirk normalization or a single missing default) but does NOT enter the modifier cascade. No TS entry, no per-element test beyond shape parity.
- **n/a (🚫)** — partial is comment-only documentation. Tailwind preflight + UA defaults handle everything.

The element-rule philosophy stays the same: only ship a rule when it earns its keep. Most elements stay 🚫 indefinitely. Promote to 🟡 when a specific UA quirk demands a fix, and to ✅ when an element earns the full cascade.

---

## Foundation phase — complete

Phase 1 (foundation), Phase 2 (form controls), Phase 3 (typography), Phase 4 (media) are all shipped. Phase 6 surfaces have started — `[popover]`, `::backdrop`, scrollbar styling are in.

### Architecture

| Concern                                                                                                                                                     | Status | File(s)                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Tailwind v4 + `@tailwindcss/postcss`                                                                                                                        | ✅     | [package.json](../package.json), [vite.config.ts](../vite.config.ts)                                 |
| `@layer` order (`theme, base, elements, components, surfaces, modifiers, utilities`)                                                                        | ✅     | [tests/setup.css](../tests/setup.css), [app/browser/styles/main.css](../app/browser/styles/main.css) |
| Token surface (`--set-*` + `@theme` variants)                                                                                                               | ✅     | [\_tokens.scss](../src/styles/_tokens.scss), [\_theme.scss](../src/styles/_theme.scss)               |
| Mixins registry (`reduced-motion`, `transition`, `focus-ring`, `$variants`/`$sizes`/`$styles`/`$states`)                                                    | ✅     | [\_mixins.scss](../src/styles/_mixins.scss)                                                          |
| Modifier system — four dimensions (variant / size / style / state)                                                                                          | ✅     | [src/styles/modifiers/](../src/styles/modifiers/)                                                    |
| TS contract layer (`tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`)                                                                                 | ✅     | [src/browser/](../src/browser/)                                                                      |
| Bidirectional parity tests                                                                                                                                  | ✅     | [tests/src/browser/](../tests/src/browser/)                                                          |
| Modifier behavior tests                                                                                                                                     | ✅     | [tests/src/styles/modifiers/](../tests/src/styles/modifiers/)                                        |
| Per-element behavior tests (button, a, input, textarea, select, dialog, table, label, fieldset, details, progress, meter, output) + typography pattern test | ✅     | [tests/src/styles/elements/](../tests/src/styles/elements/)                                          |
| Tailwind interop test                                                                                                                                       | ✅     | [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts)                      |
| Showcase pages — Home + 7 element pages + 3 pattern pages (Forms, Typography, Surfaces)                                                                     | ✅     | [app/browser/pages/](../app/browser/pages/)                                                          |

### Element baselines shipped (✅ cascade, full `--set-{tag}-*` token chain)

| Element                                          | Phase | Partial                                                                                                        | Test                                                                  | Showcase                                               |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `<button>`                                       | 1     | [\_button.scss](../src/styles/elements/_button.scss)                                                           | [\_button.test.ts](../tests/src/styles/elements/_button.test.ts)      | [/button](../app/browser/pages/ButtonPage.vue)         |
| `<a>`                                            | 1     | [\_a.scss](../src/styles/elements/_a.scss)                                                                     | [\_a.test.ts](../tests/src/styles/elements/_a.test.ts)                | [/anchor](../app/browser/pages/AnchorPage.vue)         |
| `<input>`                                        | 1     | [\_input.scss](../src/styles/elements/_input.scss)                                                             | [\_input.test.ts](../tests/src/styles/elements/_input.test.ts)        | [/input](../app/browser/pages/InputPage.vue)           |
| `<textarea>`                                     | 1     | [\_textarea.scss](../src/styles/elements/_textarea.scss)                                                       | [\_textarea.test.ts](../tests/src/styles/elements/_textarea.test.ts)  | [/textarea](../app/browser/pages/TextareaPage.vue)     |
| `<select>`                                       | 1     | [\_select.scss](../src/styles/elements/_select.scss)                                                           | [\_select.test.ts](../tests/src/styles/elements/_select.test.ts)      | [/select](../app/browser/pages/SelectPage.vue)         |
| `<dialog>` (+ `::backdrop` surface)              | 1     | [\_dialog.scss](../src/styles/elements/_dialog.scss), [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss) | [\_dialog.test.ts](../tests/src/styles/elements/_dialog.test.ts)      | [/dialog](../app/browser/pages/DialogPage.vue)         |
| `<table>` family                                 | 1     | [\_table.scss](../src/styles/elements/_table.scss)                                                             | [\_table.test.ts](../tests/src/styles/elements/_table.test.ts)        | [/table](../app/browser/pages/TablePage.vue)           |
| `<label>` (light cascade)                        | 2.1   | [\_label.scss](../src/styles/elements/_label.scss)                                                             | [\_label.test.ts](../tests/src/styles/elements/_label.test.ts)        | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<fieldset>` + `<legend>`                        | 2.2   | [\_fieldset.scss](../src/styles/elements/_fieldset.scss), [\_legend.scss](../src/styles/elements/_legend.scss) | [\_fieldset.test.ts](../tests/src/styles/elements/_fieldset.test.ts)  | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<details>` + `<summary>`                        | 2.3   | [\_details.scss](../src/styles/elements/_details.scss), [\_summary.scss](../src/styles/elements/_summary.scss) | [\_details.test.ts](../tests/src/styles/elements/_details.test.ts)    | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<progress>`                                     | 2.4   | [\_progress.scss](../src/styles/elements/_progress.scss)                                                       | [\_progress.test.ts](../tests/src/styles/elements/_progress.test.ts)  | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<meter>`                                        | 2.5   | [\_meter.scss](../src/styles/elements/_meter.scss)                                                             | [\_meter.test.ts](../tests/src/styles/elements/_meter.test.ts)        | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<output>` (light cascade)                       | 2.6   | [\_output.scss](../src/styles/elements/_output.scss)                                                           | [\_output.test.ts](../tests/src/styles/elements/_output.test.ts)      | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<h1>`–`<h6>` (shared `--set-heading-*` cascade) | 3.1   | [\_h1-h6.scss](../src/styles/elements/_h1-h6.scss)                                                             | [typography.test.ts](../tests/src/styles/elements/typography.test.ts) | [/typography](../app/browser/pages/TypographyPage.vue) |

### Element overrides shipped (🟡, single-rule normalization)

| Element                                | Phase         | Partial                                                                                                            |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `<abbr>`, `<address>`, `<mark>`, `<p>` | (preexisting) | individual partials in `src/styles/elements/`                                                                      |
| `<hr>`, `<blockquote>`                 | 3.2, 3.3      | [\_hr.scss](../src/styles/elements/_hr.scss), [\_blockquote.scss](../src/styles/elements/_blockquote.scss)         |
| `<code>`, `<kbd>`, `<samp>`, `<var>`   | 3.4           | individual partials                                                                                                |
| `<pre>`                                | 3.5           | [\_pre.scss](../src/styles/elements/_pre.scss)                                                                     |
| `<dl>`, `<dt>`, `<dd>`                 | 3.9           | individual partials                                                                                                |
| `<figure>` + `<figcaption>`            | 4.2           | [\_figure.scss](../src/styles/elements/_figure.scss), [\_figcaption.scss](../src/styles/elements/_figcaption.scss) |
| `<video>`, `<audio>`                   | 4.3           | individual partials                                                                                                |
| `<iframe>`, `<embed>`, `<object>`      | 4.4           | individual partials                                                                                                |

### Surfaces shipped

| Surface                                      | Status | File                                                       |
| -------------------------------------------- | ------ | ---------------------------------------------------------- |
| `dialog::backdrop` + `[popover]::backdrop`   | ✅     | [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss)   |
| `[popover]` panel + entry/exit transition    | ✅     | [\_popover.scss](../src/styles/surfaces/_popover.scss)     |
| Scrollbar (`scrollbar-color/-width/-gutter`) | ✅     | [\_scrollbar.scss](../src/styles/surfaces/_scrollbar.scss) |

### App-shell refactor + framework polish (2026-05-09)

A semantic + visual audit pass driven by issues caught while using the app. Findings + fixes:

**`<header>` vs `<nav>` decision rule** — added research-backed checklist (HTML LS + WAI-ARIA APG):

1. `<nav>` = "major navigation block." Always labeled with `aria-label` when more than one exists. Footer link rows aren't `<nav>`.
2. `<header>` = "introductory band of the sectioning element you're inside." `body > header` = banner landmark; everywhere else = structural hook.
3. `<aside>` = catch-all for tangential rails. Pure nav rails → `<nav>`; nav + non-nav content → `<aside>` containing a labelled `<nav>`.

**App.vue refactor**: the page now has a real `<header>` page banner (always-visible, contains brand + global search + mobile menu trigger). The left sidebar is `<nav aria-label="Primary">` containing the SiteNav rail directly (no nested nav). The right TOC is `<aside>` containing `<nav aria-label="Table of contents">`. The `<small>Press / to focus</small>` hint moved into the `<search>` itself as a trailing `<kbd>` element.

**`nav > ol/ul` flex default → opt-in** — the previous rule made every list-shaped `<nav>` a horizontal flex row, which broke TOC (vertical list) and SiteNav-style grouped rails (sub-headings + ULs). Horizontal flex is now opt-in via WAI-ARIA standard labels (`aria-label="Breadcrumb"|"Pagination"|"Primary"|"Secondary"|"Page navigation"`). Plain `<nav><ul>` and `<nav aria-label="Table of contents"><ol>` stay vertical block flow — what their use cases actually want.

**Body-shell rail rule was missing `display: flex`** — the `flex-direction: column` was set without `display: flex`, so the rail children fell back to block flow. Fixed; sidebar is now a real flex column with gap.

**Container variant cascades stay neutral** — `<fieldset class="primary">` and `<details class="primary">` had the same auto-fill bug `<article>` had earlier: variant cascade reached `--set-{tag}-background-color` and filled the surface. Fix: variant tints BORDER only by default; `.filled` opts into surface fill. Containers stay neutral; action surfaces (button, anchor) auto-fill.

**Article size scale** — `.small` / `.large` modifier values were tuned for buttons (8px / 16px padding), making `.large article` SMALLER than the default article (20px). Per-element overrides in `_article.scss`: small 12/12, default 20/20, large 32/32 — now visibly small → default → large.

**Heading color cascade** — `<article class="primary filled">` headings disappeared into the primary surface because `_h1-h6.scss` resolved `--set-heading-color` from `--set-variant-background-color`. Updated cascade prefers `--set-style-color` (the variant's CONTRAST color, set by `.filled`); bare `.primary` headings still tint to variant identity.

**`<summary>` chevron** — replaced unicode `▶` / `▼` with a CSS-painted SVG mask (same pattern as the select chevron). Tracks `currentColor` via `mask-image` + `background-color`, rotates 90° on `[open]`. No more font-rendering inconsistencies.

**Dialog mobile padding** — added `@media (max-width: 480px)` reduction to `--set-dialog-padding-{inline,block}` so content gets more breathing room on phones.

**ButtonPage Form context** — was using `class="flex flex-wrap items-end gap-3"` which didn't include `flex-row`, so our framework's `form { flex-direction: column }` won. Switched to `<form class="inline">` (the framework's horizontal form modifier).

### Naming & coverage audit (2026-05-08)

A second audit pass enforced the "element IS the component" rule consistently across the showcase + fixed two visual bugs.

**Naming consistency** — the only page named after a _component concept_ rather than its _element_ was CardPage. Renamed to **ArticlePage** (route `/article`, title `<article> (card)`). Every component group page now follows `tag → ElementPage.vue` naming. Pages reference the spec's element name first, the common-name role parenthesized when helpful (e.g. `aside (sidebar / callout)`, `header (app bar)`, `menu (toolbar)`).

**Showcase coverage** — added pages for the 8 components that didn't have a dedicated demo: AsidePage, HeaderPage, FooterPage, NavPage, SearchPage, MenuPage, FormPage, DivPage. Each page demos the element's variants in the contexts the framework styles (e.g. NavPage shows the breadcrumb opt-in via `aria-label="Breadcrumb"` alongside pagination, navbar-with-`<ul>`, and the body-shell rail).

**Heading color bug fix** — `<article class="primary filled">` had a contrast collapse: card body filled with primary-blue, but headings inside still resolved `--set-heading-color` to `--set-variant-background-color` (also primary-blue) → heading text disappeared into the surface. Fix in `_h1-h6.scss`: prefer `--set-style-color` (the variant's _contrast_ color, set by `.filled`) over `--set-variant-background-color`. Bare `.primary` headings still tint to the variant identity (style-color is unset → falls through to variant-background-color); only filled-context headings flip to the contrast color.

**Form spacing** — bare `<form>` now provides label-on-top stacking for every direct `<label>` child, plus full-width inputs / textareas / selects:

```scss
form > label {
	display: flex;
	flex-direction: column;
	gap: var(--set-form-label-gap);
}
form > label > :is(input, textarea, select),
form > :is(input, textarea, select) {
	inline-size: 100%;
}
form.inline > label > :is(input, textarea, select) {
	inline-size: auto; /* intrinsic in the inline variant */
}
```

The flex-column structure adapts cleanly to mobile widths without viewport-specific rules — inputs at `inline-size: 100%` fit whatever parent width the form has.

### Semantic audit (2026-05-08)

After Threads A + B landed, an audit caught four element-vs-spec mismatches that needed correcting:

1. **Showcase pages were wrapping content in `<article>`.** Per spec, `<article>` is "a self-contained composition... independently distributable, e.g., in syndication." A documentation page is a _section of a docs site_, not a syndicatable article. The framework's bare-`<article>` = card chrome was incidentally being applied to every page wrapper, surfacing the conflict. Fix: every page (HomePage, ButtonPage, AnchorPage, DialogPage, InputPage, SelectPage, TablePage, TextareaPage, CardPage, FormsPage, TypographyPage, SurfacesPage) now uses `<section>` as its root wrapper — semantically correct, no chrome conflict. The CardPage in particular dropped its `!block !shadow-none !border-0 !p-0 !bg-transparent` overrides — that anti-pattern was itself the smell flagging the wrong tag choice.

2. **`nav > ol` auto-applied breadcrumb chevrons to every list-shaped nav.** Pagination, table-of-contents, sequential-step indicators all use `<nav><ol>` and were getting unwanted chevron separators. The WAI-ARIA Authoring Practices Guide explicitly recommends `aria-label="Breadcrumb"` on the breadcrumb's nav, so we use that label as the disambiguator. Fix: chevron is now scoped to `nav[aria-label="Breadcrumb"] > ol`. Plain `<nav><ol>` stays separator-free; consumers opt in via the aria attribute.

3. **Toc.vue selector `article section[id]` would have broken when wrappers became `<section>`.** Fix: use `section[id]` (the wrapper has no id, only inner demo sections do).

4. **FormsPage didn't actually demo a `<form>`.** The page name is "Forms" but it only showed individual form controls (`<fieldset>`, `<input>`, `<details>`, `<progress>`, `<meter>`, `<output>`). The framework's `_form.scss` was unexercised in the showcase. Fix: added a real `<form>` demo (vertical stack) and a `<form class="inline">` demo (horizontal row).

A new `tests/src/styles/components/_section.test.ts` locks in the "section has no chrome" decision so future contributors don't accidentally add styling to bare `<section>` and break consumers.

### Recent fixes (2026-05-08)

- `<select>` chevron: tokenized as `--set-select-background-image` so consumers can swap or remove it without touching the framework partial. Default is an inline SVG (slate-500 stroke, hardcoded because CSS background-image SVGs don't reliably resolve `currentColor`).
- `<dialog>` positioning: explicit `&:modal` rule re-anchors modal dialogs to viewport center; `&[open]:not(:modal)` rule sets `position: static; margin: 0` so non-modal dialogs flow inline at their source position.
- `<a>.filled` chrome: medium-default `padding-inline` / `padding-block` / `border-radius` inside `&.filled` so a filled link without an explicit size modifier still has breathing room.
- `app/browser/styles/main.scss` → `main.css`: dropped Sass `@import` deprecation warnings by mirroring the test-side setup. Sass-side framework SCSS is now a separate import in `main.ts`.
- **SurfacesPage popover bug**: Tailwind layout utilities (`.grid` / `.flex` / `.block`) on `[popover]` elements override the UA's `display: none` for closed popovers, causing the panel to render flat in document flow. Fixed by wrapping popover content in a child div and documented as a gotcha in [surfaces.md](surfaces.md#61-gotcha--tailwind-layout-utilities-on-popover-elements).

### Component partials shipped (Phase 5 — bare-element-IS-component)

| File                                                                 | Selector                           | What it does                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`components/_body.scss`](../src/styles/components/_body.scss)       | `body:has(main)`                   | CSS-grid template-areas layout shell. Direct + once-removed selectors so Vue/React mount-point wrappers (with `display: contents`) work without breaking placement.                                                                                                  |
| [`components/_main.scss`](../src/styles/components/_main.scss)       | `body:has(main) > main`            | `overflow-y: auto`, scroll containment. Main scrolls independently of the surrounding chrome.                                                                                                                                                                        |
| [`components/_article.scss`](../src/styles/components/_article.scss) | `article`                          | Card. Bare `<article>` ships chrome (padding, border, radius, soft shadow). Variant cascade reaches the border only — `.filled` is the explicit opt-in for surface fills. Descendant `<header>` / `<footer>` get card-header/footer chrome via descendant selectors. |
| [`components/_aside.scss`](../src/styles/components/_aside.scss)     | `body > aside`, `article aside`    | Two contexts disambiguated by ancestry: page sidebar (rail chrome) vs article callout (leading-bar pull-quote).                                                                                                                                                      |
| [`components/_header.scss`](../src/styles/components/_header.scss)   | `body > header`                    | Page app bar. Scoped to layout-shell context so heroes outside the shell stay free-form.                                                                                                                                                                             |
| [`components/_footer.scss`](../src/styles/components/_footer.scss)   | `body > footer`                    | Page footer. Same shell-only scoping.                                                                                                                                                                                                                                |
| [`components/_nav.scss`](../src/styles/components/_nav.scss)         | `nav`, `body > nav`, `nav > ol`    | Navigation. Bare `<nav>` is a flex row; body-shell context makes it a vertical rail; inner `<ol>` becomes a chevron-separated breadcrumb.                                                                                                                            |
| [`components/_search.scss`](../src/styles/components/_search.scss)   | `search`                           | Search bar — flex row container that pairs with the framework-styled `<input>` for the field.                                                                                                                                                                        |
| [`components/_menu.scss`](../src/styles/components/_menu.scss)       | `menu`, `article menu`, `nav menu` | Toolbar / action row. Article-context = `justify-end` (card actions); nav-context = vertical column.                                                                                                                                                                 |
| [`components/_form.scss`](../src/styles/components/_form.scss)       | `form`                             | Form-control stack. Vertical flex with gap; `.inline` modifier flips horizontal.                                                                                                                                                                                     |
| [`components/_div.scss`](../src/styles/components/_div.scss)         | `div.stack`, `div.cluster`         | Layout primitives where `<div>` is the unavoidable fallback (no semantic alternative).                                                                                                                                                                               |

### Verification (run `npm test && npm run check` to reproduce)

- **712 / 712 tests** pass across 35 test files.
- 0 oxlint warnings/errors.
- 0 vue-tsc errors.
- Dev server compile clean — no Sass deprecations, no PostCSS warnings.
- Showcase build: 194 kB single-file → [demo/showcase.html](../demo/showcase.html).

---

## What's left in each phase

### Phase 2 — Form controls & disclosure (✅ done)

All substantive elements shipped. Datalist / option / optgroup remain 🚫 documented limitations (UA-rendered popups, not stylable until `appearance: base-select` lands).

### Phase 3 — Typographic content (✅ done)

All overrides + the heading cascade shipped. Inline phrasing elements stay 🚫 — UA + Tailwind preflight cover them entirely. `<ul>` / `<ol>` / `<li>` stay 🚫 — list-marker styling is opt-in via Tailwind utilities.

### Phase 4 — Media & embeds (✅ done)

`<img>`, `<figure>`, `<figcaption>`, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>` all have override partials. `<canvas>`, `<svg>`, `<picture>`, `<math>` stay 🚫.

### Phase 5 — Sectioning elements **become** their components (the pivot)

The original plan had sectioning + generic elements stay 🚫 forever ("visual treatment is the consumer's job"). After looking at how beercss leverages `<article>` / `<nav>` / `<menu>` / `<dialog>` directly, and how the sibling `mailbox` framework has 50+ component partials that mostly target semantic tags, **the framework's stance is**:

> **The element IS the component.** No naming class. `<aside>` is a sidebar. `<article>` is a card. `<header>` is an app bar. `<nav>` is navigation. The HTML tag carries the identity; modifiers (variant / size / style / state / placement) carry the variations.

This goes further than beercss (which still mixes `.card` on `<article>` with class-only `.snackbar` on `<div>`). It's purer: every shipped component has a canonical HTML root, and that root is its name. If a developer wants a card, they write `<article>`. If they want a sidebar, they write `<aside>`. Done.

**Layer separation:**

| Layer                 | Path                                | Owns                                                                                                                                                                                                            |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Element baseline      | `src/styles/elements/_{tag}.scss`   | Bare-tag UA-quirk normalization. For component-home tags, this stays minimal (or empty) — the chrome lives in `components/_{tag}.scss` instead.                                                                 |
| Component composition | `src/styles/components/_{tag}.scss` | Component chrome on the bare tag. Selector targets the tag directly: `aside { … }`, `article { … }`, `nav { … }`. Disambiguation when needed via descendant selectors (e.g. `body > aside` vs `article aside`). |

The naming rule: file name mirrors the root HTML tag. `components/_aside.scss` styles `<aside>` (sidebar). `components/_article.scss` styles `<article>` (card). Same shape as `src/styles/elements/`, different layer in the cascade — components sit in `@layer components`, elements in `@layer elements`. Components win when both target the same selector.

**Component map under the "element IS component" rule:**

| Tag         | Canonical component                                                                                                                                                                                                                                                                                                                                                                 | Disambiguation when nested differently                                         | Lift-from                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `<body>`    | **Layout shell** — CSS grid with template-areas (`header / nav / main / aside / footer`). Modifier classes pick areas (`.layout-rail-start`, `.layout-rail-end`, `.layout-no-aside`).                                                                                                                                                                                               | —                                                                              | beercss main-layout, mailbox `.container-shell-row`           |
| `<main>`    | **Content slot** — viewport-locked frame, `overflow: hidden` so children own scroll.                                                                                                                                                                                                                                                                                                | —                                                                              | mailbox `.container-shell`                                    |
| `<header>`  | **App bar** when child of `<body>` (page header). **Card header** when descendant of `<article>`. Disambiguated via `body > header` vs `article header`.                                                                                                                                                                                                                            | `body > header` = appbar, `article header` = card-header chrome                | beercss `<header class="responsive fixed">`                   |
| `<footer>`  | **App footer** when child of `<body>`. **Card footer** when descendant of `<article>`. Same disambiguation pattern.                                                                                                                                                                                                                                                                 | `body > footer` = page footer, `article footer` = card-footer chrome           | beercss `<footer class="responsive fixed">`                   |
| `<nav>`     | **Navigation** — single canonical chrome. The shape variants (rail/bar/tabs/breadcrumb/pagination) are determined by **inner content**, not by class on `<nav>` itself: an inner `<ol>` of `<a>`s is a breadcrumb (links separated by chevrons), an inner `<ol>` of numbered links is pagination, a `role="tablist"` makes it tabs. The `<nav>` chrome itself is a clean container. | Inner `<ol>` → breadcrumb. Inner `[role=tablist]` → tabs. Bare links → navbar. | mailbox `_nav.scss` + `_breadcrumb.scss` + `_pagination.scss` |
| `<aside>`   | **Sidebar** when child of `<body>` (persistent or responsive drawer). **Callout / pull quote** when descendant of `<article>`. Disambiguated via `body > aside` vs `article aside`. Placement via `.start` / `.end` / `.top` / `.bottom` modifiers (sidebars).                                                                                                                      | `body > aside` = sidebar chrome, `article aside` = callout chrome              | mailbox `_sidebar.scss` + `_offcanvas.scss` (fully developed) |
| `<article>` | **Card** — the flagship. Self-contained composition with optional `<header>`/`<footer>` slots styled via the descendant rules above.                                                                                                                                                                                                                                                | —                                                                              | beercss `<article>` direct, mailbox `_card.scss`              |
| `<section>` | **Labeled region** — currently no chrome by default. Stays 🚫 unless we find a single canonical use (e.g., a banded marketing section). Sections are too generic to opinionate.                                                                                                                                                                                                     | —                                                                              | —                                                             |
| `<hgroup>`  | **Title group** — heading + tagline (`<p>`) pair. Tight vertical rhythm + de-emphasized tagline color.                                                                                                                                                                                                                                                                              | —                                                                              | —                                                             |
| `<search>`  | **Search bar** — `<input>` + optional submit + suggestions slot. Composes with `<form>` and `<input>` element styling already shipped.                                                                                                                                                                                                                                              | —                                                                              | (fresh territory)                                             |
| `<menu>`    | **Toolbar / action row** — list of commands (the spec's intent). Pairs naturally with descendant `<button>`s. When descendant of `<article>` (card), it's the card's action row (no extra rule needed; descendant selectors handle layout).                                                                                                                                         | `article menu` = card actions, `body menu` = page-level toolbar                | beercss FAB `<menu>` patterns                                 |
| `<form>`    | **Form stack** — vertical layout, `gap`-driven, label-on-top by default. `.inline` modifier flips to label-beside-control.                                                                                                                                                                                                                                                          | —                                                                              | mailbox `_forms.scss` + `useForm`                             |
| `<dialog>`  | already shipped (modal centered + non-modal inline)                                                                                                                                                                                                                                                                                                                                 | —                                                                              | mailbox `_modal.scss` + `useModal` for dynamics               |
| `<details>` | already shipped (disclosure with marker normalization)                                                                                                                                                                                                                                                                                                                              | —                                                                              | mailbox `_accordion.scss` + `useCollapse` for dynamics        |
| `<table>`   | already shipped (table-family cascade)                                                                                                                                                                                                                                                                                                                                              | —                                                                              | mailbox `useTable` for dynamics                               |

**Generic-box exception:** `<div>` and `<span>` have no semantic identity, so widgets without a more specific tag still live there — class-named because the tag itself doesn't carry meaning. These are a deliberate fallback, not the default path:

| Tag      | Where class-naming is acceptable                       | Examples                                                                                                                                                         |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<div>`  | Layout primitives + widgets that have no semantic root | `.container`, `.stack`, `.cluster`, `.center`, `.splitter`, `.spinner`, `.skeleton`, `.placeholder`, `.empty-state`, `.stat`, `.timeline`, `.stepper`, `.rating` |
| `<span>` | Inline atoms with no semantic root                     | `.badge`, `.chip`, `.tag`, `.dot`                                                                                                                                |

But always prefer the semantic alternative when it exists:

- Avatar → `<img>` (already styled), with size modifiers — not `<div class="avatar">`.
- Live count → `<output>` (already styled) — not `<span class="badge">` (use `.badge` only when there's no associated form).
- Inline code → `<code>` / `<kbd>` / `<samp>` / `<var>` (already styled).
- Highlight → `<mark>` (already styled) — not `<span class="highlight">`.
- Block quote → `<blockquote>` (already styled).
- Definition term → `<dfn>` — not `<span class="term">`.
- Full prose chunk → `<article>`, never `<div>`.

**Tradeoffs of the "element IS component" rule:**

- ✅ Pure semantic markup. Lints, syndication, screen-reader landmarks all align with intent.
- ✅ Tiny class surface. Modifier vocabulary (variant/size/style/state/placement) is the entire user-facing API.
- ✅ Memorable: "I want a card → `<article>`. I want a sidebar → `<aside>`."
- ⚠️ Forces opinionated mappings. `<section>` doesn't get a default chrome (correctly — it's too generic), but neither does `<menu>`-as-context-menu-popover (we'd lose that pattern). Tradeoff: one tag, one canonical form.
- ⚠️ Descendant-selector disambiguation has to be careful. `body > header` and `article header` selectors must be specific enough to avoid bleeding (e.g., a `<dialog>` inside `<article>` shouldn't pick up card-header styling on its own internal header).
- ⚠️ Every component partial inevitably also paints rules on the bare tag — the line between "element baseline" and "component chrome" thins. We may eventually merge `elements/_aside.scss` and `components/_aside.scss` into a single file, with the component layer wrapped in `@layer components` and the baseline in `@layer elements`. **Decision deferred** until the first component lands and the friction shows up in practice.

### Phase 6 — Composables (lift from mailbox, adapted)

`mailbox` ships 19 composables paired with 19 framework-agnostic factories importing only from `@vue/reactivity`. The pattern is sound — bring it forward.

**Architecture (mirrored from mailbox):**

```
src/browser/
├── composables/      Vue adapter layer — useDialog.ts, useDetails.ts, useAside.ts, …
├── factories/        Framework-agnostic — createDialog.ts, createDetails.ts, createAside.ts, …
├── helpers.ts        Shared utilities (generateId, extract*, etc.)
├── types.ts          Composable option/return types (Use*Return, Create*Options, …)
├── constants.ts      Event names, selector strings, default timing tokens
└── events.ts         Event-name registry (gets populated as composables ship)
```

**Composable naming rule (mirrors the "element IS component" rule).** Composables follow the same naming logic as components — the wrapped element's tag is the composable's name. Every Bootstrap-flavored mailbox name (`useModal`, `useDropdown`, `useOffcanvas`, `useCollapse`) renames to its element. The factory layer mirrors: `createDialog`, `createDetails`, `createMenu`, etc.

The naming sorts composables into three buckets:

1. **Element-bound (named for the wrapped HTML tag).** `useDialog` wraps `<dialog>`, `useDetails` wraps `<details>`, etc. One composable per tag, even if the tag plays multiple roles (the composable handles all of them — e.g. `useAside` covers both page-sidebar drawer behavior and any aside-level state, with options if there's variation).
2. **Attribute-bound (named for the attribute API).** `usePopover` wraps the `popover` attribute (which can sit on any element). `useReducedMotion` wraps the `prefers-reduced-motion` media query.
3. **Behavioral primitives (no specific element).** `useFocusTrap`, `useTheme`, `useDrag`, `useDrop`, `usePointer`. These are reusable building blocks composed into multiple element-bound composables.

**Composable lift list** — element-bound and attribute-bound composables get tag-mirrored names. Mailbox's behavior-named ones either rename to their element or stay as primitives:

| Composable            | Bucket                             | Wraps                                                                                                                                                                                                                                       | Mailbox source (rename direction)              | Priority                                                                          |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `useReducedMotion`    | primitive                          | `prefers-reduced-motion` media query                                                                                                                                                                                                        | author fresh                                   | 1st (foundation; consumed by every transition)                                    |
| `useFocusTrap`        | primitive                          | trap focus inside container + restore                                                                                                                                                                                                       | adapt from mailbox `_modal.scss` internals     | 1st (foundation; consumed by `useDialog`, `useMenu`)                              |
| `useDialog`           | element                            | `<dialog>` show/showModal/close + Escape + focus restore                                                                                                                                                                                    | ← from `useModal`                              | 1st (populates `events.ts` with `elements:dialog:open` / `elements:dialog:close`) |
| `useDetails`          | element                            | `<details>` open/close, `[open]` attribute, `toggle` event                                                                                                                                                                                  | ← from `useCollapse`                           | 2nd                                                                               |
| `usePopover`          | attribute                          | `[popover]` show/hide, smart placement, anchor positioning                                                                                                                                                                                  | unchanged                                      | 2nd (unblocks `useTooltip` and `useMenu`)                                         |
| `useMenu`             | element                            | `<menu>` toggle + keyboard nav + descendant `<button>` activation. Encompasses what mailbox called "dropdown" because under our rule a dropdown IS a `<menu>` (popover-positioned by `usePopover`).                                         | ← from `useDropdown`                           | 3rd                                                                               |
| `useTooltip`          | primitive (no clean element home)  | hover/focus floating label, attaches to any element + `[popover]` panel                                                                                                                                                                     | unchanged                                      | 3rd                                                                               |
| `useAside`            | element                            | `<aside>` drawer / sidebar show-hide, responsive-breakpoint behavior, focus management when used as drawer                                                                                                                                  | ← from `useOffcanvas`                          | 3rd                                                                               |
| `useToast`            | primitive (no clean element home)  | transient notification stack. (Could later collapse into `useOutput` if we standardize on `<output role="status">` as the toast root — left as separate for now.)                                                                           | unchanged                                      | 3rd                                                                               |
| `useNav`              | element                            | `<nav>` responsive collapse + scroll-spy + active-link tracking. Extends mailbox `useScrollSpy` (which becomes a sub-feature) and adds drawer/responsive behavior.                                                                          | merge of `useScrollSpy` + nav-related concerns | 4th                                                                               |
| `useTable`            | element                            | `<table>` sort / pagination / selection / expansion / focus / resize                                                                                                                                                                        | unchanged                                      | 4th (own spec)                                                                    |
| `useForm`             | element                            | `<form>` constraint validation API wrapper                                                                                                                                                                                                  | unchanged                                      | 4th                                                                               |
| `useSelect`           | element                            | `<select>` keyboard navigation + filter. (Element-side `<select>` already styles correctly; the composable adds combobox-style enhancements.)                                                                                               | unchanged                                      | 5th                                                                               |
| `useTabs`             | primitive (sub-feature, not a tag) | `[role="tablist"]` keyboard arrow + roving tabindex pattern. Lives separate from `useNav` because tablist semantics are role-based, not element-based — `<nav>` with tablist is one consumer; an `<ol>` or `<div>` with tablist is another. | ← from `useTab`                                | 5th                                                                               |
| `useDrag` + `useDrop` | primitive                          | drag source / drop target list mutation                                                                                                                                                                                                     | unchanged                                      | 5th                                                                               |
| `useTheme`            | primitive                          | reactive theme controller (light/dark + named cores)                                                                                                                                                                                        | unchanged                                      | 5th                                                                               |
| `useCarousel`         | primitive (no element home)        | slide navigation                                                                                                                                                                                                                            | unchanged                                      | 6th                                                                               |
| `usePointer`          | primitive                          | mouse/touch/pen multiplex                                                                                                                                                                                                                   | unchanged                                      | last (primitive used by `useDrag`, `useSelect`)                                   |

**Naming-convention notes:**

- The Vue adapter is `useX.ts` in `composables/`; the framework-agnostic factory is `createX.ts` in `factories/`. Both live under the same name as the wrapped tag/attribute/behavior. So `useDialog` ↔ `createDialog`, `useAside` ↔ `createAside`.
- **Element-bound composables emit events under their tag namespace:** `elements:dialog:open`, `elements:details:toggle`, `elements:aside:show`. Behavioral primitives don't emit framework-namespaced events at all (they return reactive state only — `useReducedMotion` returns a `Ref<boolean>`).
- **No `useDisclosure`, `useDropdown`, `useModal`, `useOffcanvas`, `useCollapse`** — these were mailbox names tied to Bootstrap UI vocabulary. Under our rule, they become `useDetails`, `useMenu`, `useDialog`, `useAside`, `useDetails` respectively (the last two collapse into their element).
- Tests live in `tests/src/browser/composables/{name}.test.ts`. Each test file mirrors the composable's name exactly.

### Phase 7 — Remaining surfaces (in progress)

| Item                                                 | Status     | Notes                                                                                                                                       |
| ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `_backdrop.scss`                                     | ✅ shipped | Used by `<dialog>` and `[popover]`                                                                                                          |
| `_popover.scss`                                      | ✅ shipped | Panel chrome + open/close transition. Placement / `anchor-name` integration deferred.                                                       |
| `_scrollbar.scss`                                    | ✅ shipped | `scrollbar-color`, `-width`, `-gutter` defaults on `:root`                                                                                  |
| `_anchor-positioning.scss`                           | ⏳ pending | `anchor-name` + `position-area` defaults. Foundation for tooltip/dropdown placement vocabulary.                                             |
| `_placements.scss` (modifier partial, not a surface) | ⏳ pending | `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end`. Class names map to `position-area` keywords. |
| `_placeholder.scss` (for `::placeholder`)            | ⏳ pending | Currently `<input>`/`<textarea>` paint placeholder inline — extract when more elements need it.                                             |
| `_marker.scss` (for `::marker`)                      | ⏳ pending | `_summary.scss` paints its own marker today. Extract when `<details>` isn't the only consumer.                                              |
| `_picker-select.scss` (for `::picker(select)`)       | ⏳ pending | Awaiting Firefox + Safari `appearance: base-select`.                                                                                        |
| View transitions (`::view-transition-*`)             | ⏳ pending | Independent surface; can ship any time.                                                                                                     |

### Phase 8 — Theming + distribution

| Item                 | Status      | Notes                                                                                                                                                                                                                                |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multiple theme cores | ⏳ none yet | Mailbox ships 4 named cores (auroramoon, eclipse, honeymoon, lagunamoon) under `themes/` with `[data-bs-theme]` overrides. We can offer 1–2 alternates beyond the default to dogfood the theming surface.                            |
| Dark mode            | ⏳ none yet | `[data-theme="dark"]` block layered on top of the default.                                                                                                                                                                           |
| Density modifier     | ⏳ none yet | New dimension worth considering: `.compact` / `.comfortable` / `.spacious` adjusting `--set-{tag}-padding-*` + `--set-{tag}-font-size`. Beercss skips this; mailbox uses a `--bs-density-factor` `@property` for animatable density. |
| Distribution polish  | ⏳ none yet | Published-package guidance, `@source` ergonomics, dual-distribution (CSS + TS) build verification, NPM publish dry-run.                                                                                                              |

| Item                                                                                                                                                                                                                                                                                | Status      | Notes                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_backdrop.scss`                                                                                                                                                                                                                                                                    | ✅ shipped  | Used by `<dialog>` and `[popover]`                                                                                                                                                                                                   |
| `_popover.scss`                                                                                                                                                                                                                                                                     | ✅ shipped  | Panel chrome + open/close transition. Placement / `anchor-name` integration deferred.                                                                                                                                                |
| `_scrollbar.scss`                                                                                                                                                                                                                                                                   | ✅ shipped  | `scrollbar-color`, `-width`, `-gutter` defaults on `:root`                                                                                                                                                                           |
| `_placeholder.scss` (for `::placeholder`)                                                                                                                                                                                                                                           | ⏳ pending  | Small surface. Currently `<input>`/`<textarea>` paint placeholder via `::placeholder { opacity: var(--set-input-placeholder-opacity) }` inside the element file — extract to a shared surface partial when more elements need it.    |
| `_marker.scss` (for `::marker`)                                                                                                                                                                                                                                                     | ⏳ pending  | Currently `_summary.scss` paints its own marker. Promote to a shared surface when `<details>` isn't the only consumer.                                                                                                               |
| `_picker-select.scss` (for `::picker(select)`)                                                                                                                                                                                                                                      | ⏳ pending  | Awaiting Firefox + Safari support for `appearance: base-select`. Track Chromium 134+ adoption.                                                                                                                                       |
| Anchor positioning (`anchor-name` / `position-area`)                                                                                                                                                                                                                                | ⏳ pending  | Foundational for `<dialog>` modal placement, `[popover]` placement, tooltip placement. Resolve placement vocabulary first (see Cross-cutting).                                                                                       |
| View transitions (`::view-transition-*`)                                                                                                                                                                                                                                            | ⏳ pending  | Independent surface; can ship any time.                                                                                                                                                                                              |
| Composables — `useDialog`, `useDetails`, `usePopover`, `useMenu`, `useAside`, `useNav`, `useTooltip`, `useToast`, `useTabs`, `useTable`, `useForm`, `useSelect`, `useDrag`, `useDrop`, `usePointer`, `useCarousel`, `useTheme`, plus primitives `useReducedMotion` + `useFocusTrap` | ⏳ none yet | Element-bound names mirror the wrapped tag (`useDialog` ↔ `<dialog>`). Behavioral primitives keep their behavior names. Mailbox-style names like `useModal` / `useDropdown` / `useOffcanvas` / `useCollapse` are renamed in transit. |
| Components — `card`, `alert`, `modal` (wraps `<dialog>` + composables), `dropdown`, `tooltip`, `toast`                                                                                                                                                                              | ⏳ none yet | Each is a separate spec. Depends on composables being usable.                                                                                                                                                                        |
| Theming beyond default                                                                                                                                                                                                                                                              | ⏳ none yet | Architecture is theme-friendly already; specific themes are content.                                                                                                                                                                 |
| Distribution polish                                                                                                                                                                                                                                                                 | ⏳ none yet | Published-package guidance + dual-distribution build verification.                                                                                                                                                                   |

---

## Best next steps (recommended ordering)

The element-baseline work is broadly done. The remaining productive work splits along **four threads**, with **Thread A** the highest leverage for the next session because every consumer-facing demo improves the moment a layout primitive lands.

### Thread A — Layout shell + flagship card (CSS-only, no JS, no naming classes)

These are the bare-tag components a developer reaches for on day one. None require a composable; all live as pure SCSS in `src/styles/components/_{tag}.scss`. The selectors target the bare element (e.g. `aside { … }`, `article { … }`) — no `.sidebar` or `.card` classes anywhere. Ship in this order:

1. **`<body>` → layout shell** — `src/styles/components/_body.scss`. CSS-grid template-areas (`header / nav / main / aside / footer`) on `body` directly. Modifier classes adjust the grid (e.g. `body.rail-end` flips the nav rail to the right; `body.no-aside` collapses the sidebar column). Replaces hand-rolled app shells.
2. **`<main>` → content slot** — `src/styles/components/_main.scss`. Viewport-locked frame with `overflow: hidden` so children own scroll. Selector targets bare `main`.
3. **`<article>` → card** — `src/styles/components/_article.scss`. Flagship of the "element IS component" pitch. Card chrome on bare `article`. Nested `<header>` / `<footer>` slots styled via descendant selectors (`article > header`, `article > footer`) — no `.card-header` / `.card-footer` classes. Lift visual register from mailbox `_card.scss`.
4. **`<aside>` → sidebar (page) / callout (in article)** — `src/styles/components/_aside.scss`. Two contexts, one partial. `body > aside` = persistent sidebar + drawer-below-breakpoint behavior; `article aside` = inline pull-quote / callout chrome. Placement via existing modifier vocabulary (`.start`/`.end`/`.top`/`.bottom`). Lift sidebar/offcanvas conventions from mailbox.
5. **`<header>` / `<footer>` → page chrome / card chrome** — `src/styles/components/_header.scss`, `_footer.scss`. `body > header` = app bar (with optional `.fixed` / `.responsive` modifiers from beercss vocabulary); `article header` = card header. Same disambiguation for footer.

**Generic-box layout primitives** — Phase 5 explicitly accepts `<div>`-with-class for layout primitives that have no semantic equivalent. Ship these alongside Thread A items 1–2:

6. **`.container` + `.stack` + `.cluster` + `.center`** — `src/styles/components/_div.scss`. The core layout primitives every page reaches for. Class-keyed because `<div>` carries no semantics. Lift conventions from mailbox `_grid.scss`.

**Why Thread A first**: the showcase app's `App.vue` shell can drop its hand-rolled layout for bare `<body>` + `<main>` the moment items 1–2 land. The homepage gets a flagship `<article>` row in items 3. No JS dependency, no test infrastructure changes.

### Thread B — Navigation + landmarks (still no naming classes)

After Thread A's layout shell:

7. **`<nav>` → navigation** — `src/styles/components/_nav.scss`. Single canonical chrome on bare `<nav>`. Variant shape comes from **inner content semantics**, not from a class on `<nav>`:
   - Inner `<ol>` of `<a>` links → breadcrumb (chevron separators)
   - Inner `<ol>` with numeric link text → pagination
   - Inner `[role="tablist"]` → tabs
   - Bare child links → navbar / nav rail (positioned by parent layout)
   - Lift styling from mailbox `_nav.scss` + `_breadcrumb.scss` + `_pagination.scss`.
8. **`<search>` → search bar** — `src/styles/components/_search.scss`. Bare `<search>` paints search-bar chrome (icon + input + optional submit). Composes with `<input>` element styling already shipped.
9. **`<menu>` → toolbar / action row** — `src/styles/components/_menu.scss`. Bare `<menu>` styles a command row. Descendant context disambiguates: `article menu` (card actions) vs `body menu` (page toolbar).
10. **`<form>` → form stack** — `src/styles/components/_form.scss`. Vertical stack with gap, label-on-top by default. `<form class="inline">` flips to label-beside-control. Pairs with `<input>` / `<textarea>` / `<select>` / `<label>` / `<fieldset>` / `<legend>` already shipped.

### Thread C — Composables + their components

Once Thread A + B are stable, the composable layer gives static components dynamic behavior. **Recommended first composable: `useReducedMotion`** (smallest, no DOM touchpoints) followed by `useDialog` (populates `events.ts`). Names match the wrapped element where applicable — see Phase 6's naming rule.

10. **Anchor-positioning surface** (`src/styles/surfaces/_anchor-positioning.scss`) + **placement modifiers** (`src/styles/modifiers/_placements.scss`). Unblocks `usePopover`, `useTooltip`, `useMenu`.
11. **`useReducedMotion`** + **`useFocusTrap`** — primitives consumed by every animation- or focus-bearing composable below.
12. **`useDialog`** wraps `<dialog>` — first element-bound composable; populates `events.ts` with `elements:dialog:*`.
13. **`useDetails`** wraps `<details>` (covers what mailbox called "collapse" / disclosure).
14. **`usePopover`** wraps `[popover]` + **`useTooltip`** primitive.
15. **`useMenu`** wraps `<menu>` (covers what mailbox called "dropdown"; uses `usePopover` for positioning).
16. **`useAside`** wraps `<aside>` (covers what mailbox called "offcanvas"; drawer + responsive-breakpoint behavior).
17. **`useNav`** wraps `<nav>` (responsive collapse + scroll-spy + active-link). Replaces mailbox's standalone `useScrollSpy`.
18. **`useToast`** — primitive (no clean element home; may later fold into `useOutput`).
19. **`useTabs`** — primitive for `[role="tablist"]` keyboard pattern (independent of `<nav>` so it works on `<ol>`/`<div>` too).
20. **`useTable`** wraps `<table>` + **`useForm`** wraps `<form>` — bigger composables, own specs.
21. **`useSelect`** wraps `<select>` (combobox-style enhancements over the bare element).
22. **`useDrag` + `useDrop`** + **`usePointer`** — drag primitives.
23. **`useCarousel`** — primitive (no element home).
24. **`useTheme`** — primitive; integrates with Phase 8 theming.

### Thread D — Widgets + remaining surfaces

Lower-priority but useful:

21. **`<span class="badge|chip|tag|dot>`** — `components/_span.scss`. Inline atoms. Mailbox has `_badge.scss` + `_tag.scss` + `_dot.scss` ready to lift.
22. **`<div class="spinner|skeleton|placeholder|empty-state|stat>`** — `components/_div.scss` (extends Thread A). Mailbox ships all of these.
23. **`<div class="splitter">`** — resizable two-pane layout. Pairs with `useDrag` and `usePointer`.
24. **`<div class="stepper|timeline|rating|carousel>`** — composite widgets.
25. **`<form class="form">`** — `components/_form.scss`. Field-grid + labeled-row variants. Pairs with `useForm`.

### Recommended next commit

**Thread A and Thread B are complete** as of 2026-05-08 (1 commit; see Foundation table). Every sectioning element + generic-box layout primitive has shipped: `<body>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`, `<nav>`, `<search>`, `<menu>`, `<form>` plus `<div class="stack|cluster">`.

The next high-leverage commit is **Thread C item 10** (anchor-positioning surface + placement modifiers) followed by **Thread C items 11–12** (`useReducedMotion` + `useDialog`). These are the foundation of the composable layer:

1. `src/styles/surfaces/_anchor-positioning.scss` — `anchor-name` + `position-area` defaults. Foundational for tooltip/dropdown placement.
2. `src/styles/modifiers/_placements.scss` — class names `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end` mapping to `position-area` keywords.
3. `src/browser/composables/useReducedMotion.ts` + `factories/createReducedMotion.ts` — primitive composable consumed by every animation-bearing composable below.
4. `src/browser/composables/useDialog.ts` + `factories/createDialog.ts` — first element-bound composable; populates `events.ts` with `elements:dialog:open` / `elements:dialog:close`.

After that, the rest of Thread C unrolls naturally (`useDetails`, `usePopover`, `useMenu`, `useAside`, `useNav`, `useTooltip`, `useToast`, `useTabs`, `useTable`, `useForm`, `useSelect`, `useDrag`/`useDrop`, `useCarousel`, `useTheme` — each lifting the framework-agnostic factory pattern from mailbox).

---

## Cross-cutting open questions

These come up in multiple phases; resolve once and reuse.

- **Placement vocabulary.** Resolved by Thread C above — ship `_placements.scss` with class names matching `position-area` keywords, alongside the anchor-positioning surface.
- **Loading state handoff.** `.loading` is in the state modifier set but no element interprets it yet. Decision needed: does `.loading` toggle a spinner pseudo-element, or just dim + cursor? Settle when the first component (Modal? Toast?) actually needs it.
- **`appearance: base-select`.** Track Chromium 134+ adoption. Once Firefox + Safari ship it, the select chevron's hardcoded color goes away — the picker becomes a real surface (`_picker-select.scss`). Until then the `--set-select-background-image` token is the customization point.
- **Input validation states.** `:invalid` is the natural state to color the border with `--color-danger`. Decision: ship it automatically or require an opt-in (`.validate`) modifier? Lean toward opt-in — automatic `:invalid` is too aggressive on initial render. Settle when a form composable lands.
- **Tailwind layout utilities on `[popover]` / state-driven elements.** Documented as a gotcha in surfaces.md §6.1 — don't put `.grid` / `.flex` / `.block` directly on a `[popover]` element; wrap content in a child instead. May warrant a dedicated `_state-display.scss` surface that re-asserts UA hide rules in `@layer base` if it bites a second time.

---

## Element verdict roster

Single source of truth for "where does each tag stand?" Cross-references the phase that delivered each promotion. Shipped status flips visible in [elements.md](elements.md).

| Status      | Count | Examples                                                                                                                                                                     |
| ----------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ cascade  | 21    | button, a, input, textarea, select, dialog, table-family-7, label, fieldset+legend, details+summary, progress, meter, output, h1–h6                                          |
| 🟡 override | 17    | abbr, address, mark, p, hr, blockquote, code, kbd, samp, var, pre, dl, dt, dd, figure, figcaption, video, audio, iframe, embed, object (some are coupled multi-tag partials) |
| 🚫 stays    | ~55   | inline phrasing, sectioning landmarks, void/inert metadata, MathML/SVG/canvas containers, list markers (`<ul>`/`<ol>`/`<li>`)                                                |

(Multi-tag partials like `_h1-h6.scss` and the table-family count each tag as its own consumer surface.)

---

## Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide (token surface change → `tokens.md`; new element → `elements.md`; new mixin → `mixins.md`; new surface → `surfaces.md`).
2. This file's tables — move the row out of the upcoming-phase table into Foundation, update the verdict roster, bump the test count.

Don't wait for a "doc pass" — out-of-date status is worse than missing status.

When picking the next thing to work on, prefer the lowest-numbered row in **Best next steps** above. Thread A items 1–3 (`<body>`/`<main>`/`<article>` as components) are pure-SCSS unblockers for the showcase. Thread C item 10 (anchor positioning + placement modifiers) is the prerequisite for any popover-shaped composable. Thread C items 11–12 (`useReducedMotion` + `useDialog`) are the start of the composable layer — they populate `events.ts` and establish the test pattern under `tests/src/browser/composables/`.
