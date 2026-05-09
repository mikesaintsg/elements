# Components

> Higher-level UI patterns that compose elements. Folder: [src/styles/components/](../src/styles/components/). **Status: Phase 5 (sectioning components) shipped; widgets + composable-driven components planned.**

A **component** is a UI pattern bigger than one element — a card, a sidebar, a modal, a toolbar, a filter bar. In a class-heavy framework these are class roots (`.card`, `.modal`, `.btn-toolbar`). In _elements_ they're, wherever possible, **bare HTML tags**: `<article>` IS a card, `<aside>` IS a sidebar, `<dialog>` IS a modal. The HTML tag carries the identity; modifier classes (variant / size / style / state / placement) carry the variations.

Class-root patterns (`.skeleton`, `.spinner`, `.badge`) appear only when there's no semantic HTML home — they're the explicit fallback, not the default path. The current ratio: 12 element-driven components plus role-driven attribute selectors (`[role="tablist"]`, `[role="tab"]`, `[role="tabpanel"]`, `[popover=hint]`), versus 1 class-root partial (`<div>` for `.stack` / `.cluster`).

---

## 1. Component, element, surface — three layers

A new partial slots into exactly one of three folders.

| Category      | Folder                                              | What it is                                                                                                                      | Example root                                                             |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Element**   | [src/styles/elements/](../src/styles/elements/)     | One file per HTML tag. Token-driven baseline + UA reset. Targets the bare tag.                                                  | `button { … }`, `input { … }`, `table { … }`                             |
| **Component** | [src/styles/components/](../src/styles/components/) | A composition of elements that reads as one UI thing. **Targets the bare HTML root** when one fits; class root when it doesn't. | `body:has(main) { … grid }`, `article { … card }`, `<div class="stack">` |
| **Surface**   | [src/styles/surfaces/](../src/styles/surfaces/)     | CSS for browser-rendered chrome that isn't a tag or composition.                                                                | `[popover]`, `dialog::backdrop`, `::-webkit-scrollbar`                   |

If a partial styles a single tag with no composition (`button`, `input`), it belongs in `elements/`. If it composes multiple elements into one pattern (a layout shell across `<body>` / `<header>` / `<main>` / `<aside>` / `<footer>`, a card across `<article>` / `<header>` / `<footer>`, a search-bar across `<search>` / `<input>` / `<button>`), it belongs in `components/`. If it styles a pseudo-element or attribute API the browser owns, it belongs in `surfaces/`.

When the same tag has both an element-baseline file and a component file (e.g. `<aside>` and `<menu>`), the element file holds the bare-tag UA-quirk normalization (often empty) and the component file holds the chrome — the two layers cohabit cleanly because `@layer components` beats `@layer elements`.

---

## 2. Element-driven components (preferred path)

The HTML element IS the component. No `.card`, no `.sidebar`, no `.modal-dialog` class on the root. Variations come from the modifier cascade plus, where context matters, descendant-selector disambiguation.

### Why element-driven

- **Pure semantic markup.** `<article>` already means "self-contained composition" in HTML 5; styling it as a card is the literal interpretation. Same for `<aside>` (sidebar / callout), `<dialog>` (modal), `<details>` (disclosure / accordion item), `<menu>` (toolbar), `<nav>` (navigation), `<search>` (search bar).
- **Tiny class surface.** Modifier vocabulary (variant / size / style / state / placement) is the entire user-facing API. No memorizing `.card-body` vs `.modal-body`.
- **Memorable.** "I want a card → `<article>`." "I want a sidebar → `<aside>`."
- **Lints, syndication, screen-reader landmarks all align** with intent.

### Disambiguation by ancestry

When one HTML tag plays multiple roles depending on context, descendant selectors carry the variants — not class modifiers on the root. Examples shipped today:

| Tag        | Context                                   | Selector                                                          | Component                                 |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `<header>` | direct child of body shell                | `body > header`                                                   | App bar (page banner)                     |
| `<header>` | inside an `<article>`                     | `article > header`                                                | Card header                               |
| `<footer>` | direct child of body shell                | `body > footer`                                                   | Page footer                               |
| `<footer>` | inside an `<article>`                     | `article > footer`                                                | Card footer                               |
| `<aside>`  | direct child of body shell                | `body > aside`                                                    | Sidebar / TOC rail                        |
| `<aside>`  | inside an `<article>`                     | `article aside`                                                   | Pull-quote / callout                      |
| `<nav>`    | direct child of body shell                | `body > nav`                                                      | Primary nav rail (vertical column)        |
| `<nav>`    | with `<ol>` / `<ul>` child + `aria-label` | `nav[aria-label='Breadcrumb']`, `[aria-label='Pagination']`, etc. | Breadcrumb / pagination / list-nav        |
| `<nav>`    | with `[role="tablist"]` child             | `nav [role=tablist]`                                              | Tabs (placement reserved; chrome pending) |
| `<menu>`   | inside an `<article>`                     | `article menu`                                                    | Card action row (`justify-end`)           |
| `<menu>`   | inside a `<nav>`                          | `nav menu`                                                        | Vertical column inside the rail           |
| `<dialog>` | opened via `.showModal()`                 | `dialog:modal`                                                    | Modal (centered + ::backdrop)             |
| `<dialog>` | opened via `.show()`                      | `dialog[open]:not(:modal)`                                        | Non-modal (inline)                        |

This pattern lets one partial own one tag and still cover three or four variants without inventing class names.

---

## 3. Class-root components (fallback)

When the pattern has no native HTML home, a class root on `<div>` or `<span>` carries the identity. This is deliberate fallback, not the default. The framework prefers the semantic alternative whenever one exists:

| If you'd reach for…                               | Use this instead                                  |
| ------------------------------------------------- | ------------------------------------------------- |
| `<div class="card">`                              | `<article>`                                       |
| `<div class="sidebar">`                           | `<aside>` (inside `<body>`)                       |
| `<div class="modal">`                             | `<dialog>` opened with `.showModal()`             |
| `<div class="accordion-item">`                    | `<details><summary>`                              |
| `<div class="alert">`                             | `<aside role="alert">` or `<output role="alert">` |
| `<div class="toast">`                             | `<output role="status">` (live region)            |
| `<div class="toolbar">`                           | `<menu>`                                          |
| `<div class="search">`                            | `<search>`                                        |
| `<div class="form-group">`                        | `<fieldset><legend>`                              |
| `<span class="highlight">`                        | `<mark>`                                          |
| `<span class="badge">` for a count tied to a form | `<output>`                                        |
| `<span class="term">`                             | `<dfn>`                                           |
| `<span class="kbd">`                              | `<kbd>`                                           |
| `<div class="quote">`                             | `<blockquote><cite>`                              |
| `<img class="avatar">`                            | `<img>` + size modifiers (no `.avatar` class)     |
| `<div class="progress">`                          | `<progress>`                                      |
| `<div class="meter">`                             | `<meter>`                                         |

Class roots are reserved for these widgets where no semantic element fits cleanly:

- **Layout primitives** — `.stack` (vertical flow with gap), `.cluster` (horizontal wrap with gap). Live in [`components/_div.scss`](../src/styles/components/_div.scss). Already shipped.
- **Inline atoms** — `.badge` (when not tied to a form), `.chip`, `.tag`, `.dot`. Live in a future `components/_span.scss`.
- **Loading states** — `.skeleton` (shimmer), `.spinner` (could also use `<progress>` indeterminate).
- **Empty / null states** — `.empty-state` (icon + heading + body + action).
- **Composite widgets without a clean root** — `.splitter` (resizable panes), `.carousel`, `.stepper`, `.timeline`, `.rating`, `.stat` (KPI tile).

---

## 4. Naming

**Element-driven component** — file name mirrors the HTML tag: `_aside.scss`, `_article.scss`, `_nav.scss`. The selector targets the bare tag. No class root anywhere on the file.

**Class-root component** — file name is the catch-all tag (`_div.scss`, `_span.scss`); inside, each pattern uses a single-word class root (`.stack`, `.cluster`, `.badge`). Slot subnames use the `{root}-{slot}` pattern (`.stat-value`, `.stat-label`, `.timeline-marker`) when the root is a class. Element-driven components don't need slot classes — the slot IS its own element (`<article> > <header>`, `<article> > <footer>`).

State classes — `.disabled`, `.active`, `.loading` — come from the modifier cascade in [src/browser/modifiers.ts](../src/browser/modifiers.ts). Component-specific states get their own attribute when one exists (`[open]` on `<details>` and `<dialog>`, `[aria-busy]` on anything loading) or a class on the root.

---

## 5. Component partial template

```scss
// ============================================================================
// {tag-or-component} — {one-line description}
//
// Architecture:
//   1. Token declarations on the bare tag (or class root) — full --set-{name}-*
//      cascade with fallback chains identical to the element pattern in
//      tokens.md.
//   2. Chrome rules wrapped in @layer components.
//   3. Variant / size / style / state modifier cascade flows through the
//      --set-{name}-* tokens — no per-element variant rules.
//
// Quirks: (any element-specific quirks the composition introduces)
// ============================================================================

@use '../mixins' as *;

@layer components {
  {selector} {
    --set-{name}-color:               var(--set-style-color, var(--set-variant-color, currentColor));
    --set-{name}-background-color:    var(--set-style-background-color, var(--set-variant-background-color, transparent));
    --set-{name}-border-color:        var(--set-style-border-color, var(--set-variant-border-color, transparent));
    --set-{name}-border-radius:       var(--set-size-border-radius, var(--radius-md));
    --set-{name}-padding-inline:      var(--set-size-padding-inline, calc(var(--spacing) * 4));
    --set-{name}-padding-block:       var(--set-size-padding-block,  calc(var(--spacing) * 3));
    --set-{name}-transition-duration: var(--set-transition-duration);

    /* Layout + base properties consume the tokens. */
    color:            var(--set-{name}-color);
    background-color: var(--set-{name}-background-color);
    border-color:     var(--set-{name}-border-color);
    border-radius:    var(--set-{name}-border-radius);
    padding-inline:   var(--set-{name}-padding-inline);
    padding-block:    var(--set-{name}-padding-block);
    @include transition((
      color            var(--set-{name}-transition-duration),
      background-color var(--set-{name}-transition-duration),
      border-color     var(--set-{name}-transition-duration)
    ));
  }
}
```

**Conventions enforced:**

- Wrap rules in `@layer components`.
- Tokens declared on the component root; flow through the modifier cascade.
- Don't hand-roll `&.primary` / `&.large` / `&.ghost` — the variant / size / style cascades already feed `--set-{name}-*` via the fallback chain. Only declare per-modifier rules when the component genuinely needs them (e.g. `<form>.row` flips flex-direction, which can't come from a token).
- Logical CSS properties (`padding-inline`, `margin-block`, `inset-inline-start`).
- Reduced-motion-paired transitions via `@include transition(…)`.
- Bidirectional parity test maintained: every `--set-{name}-*` you add appears as a leaf in [src/browser/tokens.ts](../src/browser/tokens.ts).

---

## 6. Catalog — shipped

Twelve element-driven component partials plus one class-root partial for layout primitives. All under `@layer components` (the popover surface lives in `@layer surfaces`).

### Sectioning + layout (Phase 5, threads A + B)

| Partial                                                   | Root selector(s)                                                                     | What it composes                                                                                                                                                                                                                                   | Modifiers                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`_body.scss`](../src/styles/components/_body.scss)       | `body:has(main)`                                                                     | CSS-grid template-areas layout shell. Direct + once-removed selectors so Vue/React mount-point wrappers (`display: contents`) work cleanly.                                                                                                        | —                             |
| [`_main.scss`](../src/styles/components/_main.scss)       | `body:has(main) > main`                                                              | Scroll container (`overflow-y: auto` + scroll containment).                                                                                                                                                                                        | —                             |
| [`_article.scss`](../src/styles/components/_article.scss) | `article` + `article > header` + `article > footer`                                  | Card. Variant cascade reaches the border only; `.filled` opts into surface fill. Sizes + states.                                                                                                                                                   | variant, size, style, state   |
| [`_aside.scss`](../src/styles/components/_aside.scss)     | `body > aside` + `article aside` + `aside[role="alert"]`                             | Three contexts: sidebar rail (page) + leading-bar callout (in article) + alert banner. Disambiguated by ancestry / role.                                                                                                                           | placement (`.start` / `.end`) |
| [`_header.scss`](../src/styles/components/_header.scss)   | `body > header`                                                                      | Page app bar (shell-only scoping; in-prose headers stay free-form).                                                                                                                                                                                | —                             |
| [`_footer.scss`](../src/styles/components/_footer.scss)   | `body > footer`                                                                      | Page footer (shell-only scoping).                                                                                                                                                                                                                  | —                             |
| [`_nav.scss`](../src/styles/components/_nav.scss)         | `nav`, `body > nav`, `nav > ol/ul`, `nav[aria-label='…']`, `[role='tablist']` family | Single canonical chrome. Content shape decides: bare = horizontal flex; `body > nav` = vertical rail; inner `<ol>` w/ aria-label = breadcrumb / pagination / list-nav; `role="tablist"` = tabs (with `[role="tab"]` + `[role="tabpanel"]` chrome). | placement (`.end`)            |
| [`_search.scss`](../src/styles/components/_search.scss)   | `search`                                                                             | Search bar — flex row that pairs with the framework-styled `<input>`.                                                                                                                                                                              | —                             |
| [`_menu.scss`](../src/styles/components/_menu.scss)       | `menu`, `article menu`, `nav menu`, `menu[popover]`, `[popover] menu`                | Toolbar / action row. Article-context = `justify-end`; nav-context = vertical column; popover-context = vertical dropdown column.                                                                                                                  | —                             |
| [`_output.scss`](../src/styles/components/_output.scss)   | `output[popover]`, `output[role='status']:not(.filled)`                              | Toast / status banner. `popover` variant pins to the bottom-end corner; in-flow variant reads as a banner. Element baseline ([`elements/_output.scss`](../src/styles/elements/_output.scss)) keeps the inline calc-chip shape.                     | placement (`.start` / `.top`) |
| [`_form.scss`](../src/styles/components/_form.scss)       | `form`, `form > label`, `form.row`                                                   | Form-control stack. Vertical flex with gap; `.row` flips to a wrapping horizontal row (filter bars, quick-input).                                                                                                                                  | layout (`.row`)               |
| [`_div.scss`](../src/styles/components/_div.scss)         | `div.stack`, `div.cluster`                                                           | Layout primitives. The deliberate fallback for patterns with no semantic root.                                                                                                                                                                     | —                             |

### Surfaces + element baselines that act as their own components

These ship in [`src/styles/elements/`](../src/styles/elements/) or [`src/styles/surfaces/`](../src/styles/surfaces/) and complete a UI pattern without needing a separate `components/` partial.

| Tag / surface               | UI pattern                                    | Notes                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<dialog>`                  | Modal + non-modal dialog                      | `:modal` centers + uses `::backdrop`; `[open]:not(:modal)` flows inline. Footer row painted as flex-end with gap.                                                                                 |
| `<details>` + sibling group | Disclosure / accordion item / accordion group | Single `<details>` is a disclosure. Sibling `<details>` get a small block-start margin so a stack reads as one accordion group; `[name="…"]` makes the group exclusive (HTML5).                   |
| `<table>`                   | Data table                                    | `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>` all styled via [`_table.scss`](../src/styles/elements/_table.scss).                                                          |
| `<form>` family             | Form controls                                 | `<input>`, `<textarea>`, `<select>`, `<button>`, `<label>`, `<fieldset>`, `<legend>`, `<output>`, `<progress>`, `<meter>`. Each has a substantive partial.                                        |
| `<figure>` + `<figcaption>` | Captioned media                               | Pairs with `<img>` / `<video>` / `<audio>` baselines.                                                                                                                                             |
| `<blockquote>` + `<cite>`   | Pull-quote                                    | `<cite>` styled inline; `<blockquote>` paints the leading bar.                                                                                                                                    |
| `[popover]` (surface)       | Floating panel                                | Top-layer panel with entry transition; `[popover=hint]` / `[role=tooltip]` paints a smaller, inverted tooltip variant. Lives in [`surfaces/_popover.scss`](../src/styles/surfaces/_popover.scss). |

### Element baselines that already act as their own components

These ship in [`src/styles/elements/`](../src/styles/elements/) but the element baseline + bare-tag chrome together carry a complete UI pattern. No separate partial in `components/` is needed.

| Tag                         | UI pattern                  | Notes                                                                                                                                                      |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<dialog>`                  | Modal + non-modal dialog    | `:modal` centers + uses `::backdrop`; `[open]:not(:modal)` flows inline. Footer row painted as flex-end with gap.                                          |
| `<details>`                 | Disclosure / accordion item | Accordion **group** = sibling `<details>` (use `name=` attribute for exclusive groups, HTML5 standards-track).                                             |
| `<table>`                   | Data table                  | `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>` all styled via `_table.scss`.                                                         |
| `<form>` family             | Form controls               | `<input>`, `<textarea>`, `<select>`, `<button>`, `<label>`, `<fieldset>`, `<legend>`, `<output>`, `<progress>`, `<meter>`. Each has a substantive partial. |
| `<figure>` + `<figcaption>` | Captioned media             | Pairs with `<img>` / `<video>` / `<audio>` baselines.                                                                                                      |
| `<blockquote>` + `<cite>`   | Pull-quote                  | `<cite>` styled inline; `<blockquote>` paints the leading bar.                                                                                             |

---

## 7. Catalog — planned

Mapped against the bare-element-IS-component philosophy and gap-checked against beercss, picocss, semantic-ui, mailbox, and the conceptual semantic-element model. Each row notes the canonical HTML root we want; class-root fallbacks only appear when no element fits.

### Element-driven components — next priorities

These need ONE small partial because the element baseline + a bit of context-specific chrome covers the pattern. Keyboard / show-hide behavior arrives with the Phase 6 composables.

| Pattern             | Root                                              | What's still missing                                                                                                                                                                                                                                | Rough effort      |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Hero / banner       | `<section class="hero">` (or any element)         | **Skipped intentionally** — Tailwind utilities (`py-24 text-center`, optional gradient) cover this in two classes. Adding a `.hero` modifier would duplicate utilities for marginal value. Document and revisit if a real consumer pattern emerges. | —                 |
| Anchor positioning  | `[popover]` + `[popovertarget]`, `<dialog>:modal` | `anchor-name` + `position-area` defaults. Foundation for tooltip / dropdown placement vocabulary (currently both default to viewport-fixed positioning).                                                                                            | Surface partial.  |
| Placement modifiers | any element                                       | `.top`, `.bottom`, `.start`, `.end`, `.top-start`, etc. mapped to `position-area`. Used by tooltip / dropdown / toast.                                                                                                                              | Modifier partial. |

### Element baselines still placeholder (block component plans)

These elements have placeholder partials with UA-only styling; substantive baselines unblock the components above.

| Element                                                               | Why it matters                                                                                                                                         | Status      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `<small>`                                                             | Footnote / disclaimer / meta-text typography. Used heavily in card subtitles and form-help text.                                                       | placeholder |
| `<mark>`                                                              | Highlight. The semantic alternative to `<span class="highlight">`.                                                                                     | placeholder |
| `<address>`                                                           | Author / contact info. Common in card footers and article bylines.                                                                                     | placeholder |
| `<time>`                                                              | Timestamp. Pairs with `<address>` in article meta.                                                                                                     | placeholder |
| `<abbr>`                                                              | Hover tooltip via the `title` attribute. Underline-dotted is the convention.                                                                           | placeholder |
| `<cite>`                                                              | Citation / source attribution. Used inside `<blockquote>` and `<figure>`.                                                                              | placeholder |
| `<dfn>`                                                               | Defining term — semantic alternative to `<span class="term">`.                                                                                         | placeholder |
| `<ins>` / `<del>`                                                     | Inserted / deleted content (tracked changes, diff views).                                                                                              | placeholder |
| `<q>`                                                                 | Inline quotation (auto-quoted by the browser).                                                                                                         | placeholder |
| `<s>`                                                                 | Strikethrough for "no longer accurate" content.                                                                                                        | placeholder |
| `<ul>`, `<ol>`, `<li>`                                                | List typography. `<nav>` already strips list markers in nav-list contexts; bare lists in prose still rely on UA + Tailwind utilities for marker style. | placeholder |
| `<hgroup>`                                                            | Heading + tagline pairing — `<h1>` + `<p>`. Replaces ad-hoc `class="subtitle"` patterns.                                                               | placeholder |
| `<picture>`                                                           | Responsive image wrapper around `<img>`.                                                                                                               | placeholder |
| `<datalist>`                                                          | Combobox suggestions for `<input list>`. Currently UA-rendered (limited stylability).                                                                  | placeholder |
| `<input type=checkbox>` / `<input type=radio>`                        | Excluded from `_input.scss` (UA chrome). Need a dedicated partial with `appearance: none` + custom mark.                                               | placeholder |
| `<input type=range>`                                                  | Slider. Excluded from `_input.scss`; needs a partial with `::-webkit-slider-thumb` / `::-moz-range-thumb` styling.                                     | placeholder |
| `<input type=color>` / `<input type=file>` / `<input type=date>` etc. | UA chrome varies dramatically. Defer until the use case appears.                                                                                       | placeholder |

### Class-root widgets (no semantic home)

These earn a class root only because no element fits. They live in `_div.scss`, `_span.scss`, or a dedicated partial when the surface is large enough.

| Pattern       | Class root                                                          | Lift-from                          | Composable              |
| ------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------------------- |
| Spinner       | `<progress>` indeterminate (preferred) **or** `.spinner` on `<div>` | mailbox `_spinner.scss`            | —                       |
| Skeleton      | `.skeleton` on `<div>`                                              | mailbox `_skeleton.scss`           | —                       |
| Empty state   | `.empty-state` on `<div>` (or `<aside>`)                            | mailbox `_empty-state.scss`        | —                       |
| Stat / KPI    | `<output>` styled (preferred) **or** `.stat` on `<div>`             | mailbox `_stat.scss`               | —                       |
| Badge / chip  | `.badge` / `.chip` on `<span>`                                      | mailbox `_badge.scss`, `_tag.scss` | —                       |
| Dot indicator | `.dot` on `<span>`                                                  | mailbox `_dot.scss`                | —                       |
| Avatar        | `<img>` + size modifier (preferred) **or** `.avatar`                | mailbox `_avatar.scss`             | —                       |
| Stepper       | `<ol class="stepper">` (preferred) **or** `.stepper` on `<div>`     | mailbox `_stepper.scss`            | —                       |
| Timeline      | `<ol class="timeline">` **or** `.timeline` on `<div>`               | mailbox `_timeline.scss`           | —                       |
| Rating        | `<meter>` (preferred) **or** `.rating` on `<div>`                   | mailbox `_rating.scss`             | —                       |
| Splitter      | `.splitter` on `<div>`                                              | mailbox `_splitter.scss`           | `useDrag`, `usePointer` |
| Carousel      | `<section class="carousel">`                                        | mailbox `_carousel.scss`           | `useCarousel`           |

### Surfaces still planned

| Surface                                        | Status     | Notes                                                                                                       |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `_anchor-positioning.scss`                     | ⏳ pending | `anchor-name` + `position-area` defaults. Foundation for tooltip / dropdown / popover placement vocabulary. |
| `_placeholder.scss` (for `::placeholder`)      | ⏳ pending | Currently `<input>` / `<textarea>` paint placeholder inline. Extract when more elements need it.            |
| `_marker.scss` (for `::marker`)                | ⏳ pending | `_summary.scss` paints its own marker today. Extract when `<details>` isn't the only consumer.              |
| `_picker-select.scss` (for `::picker(select)`) | ⏳ pending | Awaiting Firefox + Safari `appearance: base-select`.                                                        |
| `_view-transition.scss`                        | ⏳ pending | `::view-transition-old/new/group(*)` for cross-page transitions on `<a>` navigation.                        |
| `_selection.scss` (for `::selection`)          | ⏳ pending | Variant-tinted selection color.                                                                             |

### Modifier partials still planned

| Partial                                     | What it adds                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `modifiers/_placements.scss`                | `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end` mapping to `position-area`. Used by tooltip / dropdown / popover surfaces. |
| Density modifier (`.compact` / `.spacious`) | Adjusts `--set-{tag}-padding-*` + `--set-{tag}-font-size`. Defer until a real need appears (most pages run fine on the default size).                                    |

---

## 8. Composable pairings (Phase 6)

Components that need JS interactivity pair with a composable in `src/browser/composables/`. Naming mirrors the element: `useDialog` ↔ `<dialog>`, `useDetails` ↔ `<details>`, `useAside` ↔ `<aside>`. The plan-of-record list lives in [plan.md §Phase 6](./plan.md#phase-6--composables-lift-from-mailbox-adapted); the abridged map below shows which component each composable powers.

| Component              | Composable                                                               | Notes                                                                                               |
| ---------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Modal                  | `useDialog` (wraps `<dialog>`)                                           | Covers what mailbox calls `useModal`. Populates `events.ts` with `elements:dialog:open` / `:close`. |
| Accordion / disclosure | `useDetails` (wraps `<details>`)                                         | Covers what mailbox calls `useCollapse`.                                                            |
| Tooltip / popover      | `usePopover` (attribute-bound to `[popover]`) + `useTooltip` (primitive) | Two primitives; consumed by tooltip + dropdown.                                                     |
| Dropdown               | `useMenu` (wraps `<menu>`) + `usePopover`                                | Covers what mailbox calls `useDropdown`. Under our rule, a dropdown IS a `<menu>`.                  |
| Sidebar / drawer       | `useAside` (wraps `<aside>`)                                             | Covers what mailbox calls `useOffcanvas`.                                                           |
| Tabs                   | `useTabs` (primitive — keyboard ARIA-tablist)                            | Independent of `<nav>` so it works on `<ol>` / `<div>` too.                                         |
| Toast                  | `useToast` (primitive — no clean element home)                           | May later fold into `useOutput` once `<output role="status">` is the canonical root.                |
| Form                   | `useForm` (wraps `<form>`)                                               | Constraint-validation API wrapper.                                                                  |
| Table                  | `useTable` (wraps `<table>`)                                             | Sort / paginate / select / expand / focus / resize.                                                 |
| Carousel               | `useCarousel` (primitive)                                                | No element home; primitive with slide nav.                                                          |
| Splitter               | `useDrag` + `usePointer` primitives                                      | Resizable two-pane layout.                                                                          |

The composable owns **state** (open/closed, active/inactive, transitions). The component partial owns **chrome** (color, layout, sizing). Event names follow `elements:{element-or-component}:{verb}` per [src/browser/events.ts](../src/browser/events.ts).

---

## 9. Wiring it up

When a component lands, four touch points:

1. **`@use '{partial}'` in [src/styles/components/index.scss](../src/styles/components/index.scss)** — alphabetical inside the file.
2. **Token mirror** — every `--set-{name}-*` appears as a TS leaf in [src/browser/tokens.ts](../src/browser/tokens.ts). The bidirectional parity test enforces this on every commit.
3. **Behavior test** under `tests/src/styles/components/_{name}.test.ts` covering: bare component renders, modifier cascade reaches the root tokens, each slot resolves the expected layout. (Class-root components also assert the root selector matches.)
4. **Showcase page** under `app/browser/pages/{Name}Page.vue` demonstrating the variant / size / style / state cascade, plus any composition slots. Add to `app/browser/router.ts`.
5. **Documentation** — update §6 (shipped) or §7 (planned) above with the row's status.

Adding a class root that wasn't listed in §3 / §7 needs a separate reason — write up why no element fits, in the partial's header comment.

---

## 10. Cross-references

- [plan.md §Phase 5](./plan.md#phase-5--sectioning-elements-become-their-components-the-pivot) — full strategic context for the "element IS component" pivot.
- [plan.md §Phase 6](./plan.md#phase-6--composables-lift-from-mailbox-adapted) — composable lift list with priorities.
- [plan.md §Phase 7](./plan.md#phase-7--remaining-surfaces-in-progress) — surface roadmap.
- [styles.md](./styles.md) — top-level architecture and authoring contract.
- [tokens.md](./tokens.md) — element-scoped token pattern (components follow the same).
- [modifiers.md](./modifiers.md) — modifier cascade components consume.
- [elements.md](./elements.md) — element baselines components compose from.
- [surfaces.md](./surfaces.md) — sibling category for browser-rendered chrome.
