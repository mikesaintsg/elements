# Components

> Authoritative reference for the elements framework's component catalog. Components are UI patterns bigger than one element. The framework's stance is direct: **the HTML element IS the component**. Modifier classes carry the variations. Class roots appear only when no semantic tag fits.

---

## 1. Overview

A **component** is a UI pattern bigger than one element — a card, a sidebar, a modal, a toolbar, a filter bar. In a class-heavy framework these are class roots (`.card`, `.modal`, `.btn-toolbar`). In _elements_ they are, wherever possible, **bare HTML tags**.

- `<article>` IS a card.
- `<aside>` IS a sidebar.
- `<dialog>` IS a modal.
- `<menu>` IS a toolbar.
- `<details>` IS an accordion item.
- `<search>` IS a search bar.
- `<output>` IS a toast / status banner.

The HTML tag carries the identity; modifier classes (variant / size / style / state / placement) carry the variations. Class-root patterns (`.skeleton`, `.spinner`, `.badge`, `.dot`, `.tag`) appear only when there is no semantic HTML home — the deliberate fallback, not the default.

---

## 2. Four style folders

A new partial slots into exactly one of four folders. Cascade-layer order (`theme, base, elements, components, surfaces, composables, modifiers, utilities`) means later folders beat earlier ones for the same selector.

| Folder                                                  | Scope                                                                                                        | Example root                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`src/styles/elements/`](../src/styles/elements/)       | One partial per HTML tag. Token-driven baseline + UA-quirk reset. Targets the bare tag.                      | `button { … }`, `input { … }`, `table { … }`                      |
| [`src/styles/components/`](../src/styles/components/)   | Element composition (static chrome). Targets bare HTML roots. Class-root fallback when no semantic tag fits. | `article { … card }`, `body:has(main) { … grid }`, `div.stack`    |
| [`src/styles/surfaces/`](../src/styles/surfaces/)       | Browser-rendered chrome — see [surfaces.md](./surfaces.md).                                                  | `[popover]`, `dialog::backdrop`, `::-webkit-scrollbar`            |
| [`src/styles/composables/`](../src/styles/composables/) | Component chrome gated on a composable's state attribute — see [composables.md](./composables.md).           | `aside[popover][data-aside-open]`, `output[popover]:popover-open` |

If a partial styles a single tag with no composition, it belongs in `elements/`. If it composes multiple elements into one pattern, it belongs in `components/`. If it styles a pseudo-element or attribute API the browser owns, it belongs in `surfaces/`. If it depends on a composable being attached and toggling state attributes, it belongs in `composables/`.

Any rule that asserts `display`, `position: fixed`, or a large `transform` on a popover-bearing, `<dialog>`, or `<details>` selector MUST gate on the open-state selector or it defeats the UA's `display: none` for the closed state.

---

## 3. Element-driven components (the default path)

The HTML element IS the component. No `.card`, no `.sidebar`, no `.modal-dialog` class on the root. Variations come from the modifier cascade plus, where context matters, descendant-selector disambiguation.

**Why element-driven:**

- **Pure semantic markup.** `<article>` already means "self-contained composition" in HTML5; styling it as a card is the literal interpretation.
- **Tiny class surface.** Modifier vocabulary (variant / size / style / state / placement) is the entire user-facing API. No `.card-body` vs `.modal-body` to memorize.
- **Memorable.** "I want a card → `<article>`." "I want a sidebar → `<aside>`."
- **Lints, syndication, screen-reader landmarks all align** with intent.

### Disambiguation by ancestry

When one HTML tag plays multiple roles depending on context, descendant selectors carry the variants — not class modifiers on the root.

| Tag        | Context                    | Selector                       | Component                                                                                                     |
| ---------- | -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `<header>` | direct child of body shell | `body > header`                | App bar (page banner)                                                                                         |
| `<header>` | inside an `<article>`      | `article > header`             | Card header                                                                                                   |
| `<footer>` | direct child of body shell | `body > footer`                | Page footer                                                                                                   |
| `<footer>` | inside an `<article>`      | `article > footer`             | Card footer                                                                                                   |
| `<aside>`  | direct child of body shell | `body > aside`                 | Sidebar / TOC rail                                                                                            |
| `<aside>`  | inside an `<article>`      | `article aside`                | Pull-quote / callout                                                                                          |
| `<nav>`    | direct child of body shell | `body > nav`                   | Primary nav rail (vertical column)                                                                            |
| `<nav>`    | breadcrumb trail           | `nav[aria-label='Breadcrumb']` | Breadcrumb                                                                                                    |
| `<nav>`    | pagination                 | `nav[aria-label='Pagination']` | Pagination                                                                                                    |
| `<nav>`    | tab strip                  | `nav [role=tablist]`           | Tabs                                                                                                          |
| `<menu>`   | inside an `<article>`      | `article menu`                 | Card action row (justify-end)                                                                                 |
| `<menu>`   | inside a `<nav>`           | `nav menu`                     | Vertical column inside the rail                                                                               |
| `<dialog>` | opened via `.showModal()`  | `dialog:modal`                 | Centered modal with backdrop scrim                                                                            |
| `<dialog>` | opened via `.show()`       | `dialog[open]:not(:modal)`     | Non-modal inline dialog (no scrim)                                                                            |
| `<aside>`  | `popover` attribute        | `aside[popover]:popover-open`  | Offcanvas drawer with backdrop scrim — shares the `dialog:modal` scrim recipe (see `surfaces/_backdrop.scss`) |

One partial owns one tag and still covers three or four variants without inventing class names.

---

## 4. Class-root components (the fallback)

When a pattern has no native HTML home, a class root on `<div>` or `<span>` carries the identity. This is deliberate fallback, not the default. The framework prefers the semantic alternative whenever one exists:

| If you'd reach for…            | Use this instead                                  |
| ------------------------------ | ------------------------------------------------- |
| `<div class="card">`           | `<article>`                                       |
| `<div class="sidebar">`        | `<aside>` (inside `<body>`)                       |
| `<div class="modal">`          | `<dialog>` opened with `.showModal()`             |
| `<div class="accordion-item">` | `<details><summary>`                              |
| `<div class="alert">`          | `<aside role="alert">` (in-flow, assertive)       |
| `<div class="status">`         | `<aside role="status">` (in-flow, polite)         |
| `<div class="toast">`          | `<output popover>` (top-layer, polite, transient) |
| `<div class="toolbar">`        | `<menu>`                                          |
| `<div class="search">`         | `<search>`                                        |
| `<div class="form-group">`     | `<fieldset><legend>`                              |
| `<span class="highlight">`     | `<mark>`                                          |
| `<span class="term">`          | `<dfn>`                                           |
| `<div class="quote">`          | `<blockquote><cite>`                              |
| `<div class="progress">`       | `<progress>`                                      |
| `<div class="meter">`          | `<meter>`                                         |

Class roots are reserved for:

- **Layout primitives** — `.stack` (vertical flow with gap), `.cluster` (horizontal wrap with gap).
- **Inline atoms** — `.badge`, `.chip`, `.tag`, `.dot`.
- **Loading affordances** — `.skeleton` (shimmer), `.spinner` (rotating ring).
- **Empty / null states** — `.empty-state` (icon + heading + body + action).
- **Composite widgets without a clean root** — `.splitter`, `.carousel`, `.stepper`, `.timeline`, `.rating`, `.stat`.

---

## 5. Naming

**Element-driven component** — file name mirrors the HTML tag: `_aside.scss`, `_article.scss`, `_nav.scss`. The selector targets the bare tag. No class root anywhere on the file.

**Class-root component** — file name is the catch-all tag (`_div.scss`, `_span.scss`); inside, each pattern uses a single-word class root (`.stack`, `.cluster`, `.badge`). When a single class root grows beyond a few rules it earns its own partial (`_skeleton.scss`, `_spinner.scss`, `_role-group.scss`).

Slot subnames use the `{root}-{slot}` pattern (`.stat-value`, `.stat-label`, `.timeline-marker`) **only when the root is a class**. Element-driven components don't need slot classes — the slot IS its own element (`<article> > <header>`, `<article> > <footer>`).

State classes — `.disabled`, `.active`, `.loading` — come from the modifier cascade in [src/browser/modifiers.ts](../src/browser/modifiers.ts). Component-specific states get their own attribute when one exists (`[open]` on `<details>` and `<dialog>`, `[aria-busy]` on anything loading).

---

## 6. Component partial template

```scss
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

**Conventions:**

- Wrap rules in `@layer components`.
- Declare tokens on the component root with fallback chains (style → variant → element default).
- Don't hand-roll `&.primary` / `&.large` / `&.ghost` — the variant / size / style cascades already feed `--set-{name}-*` via the fallback chain. Only declare per-modifier rules when the component genuinely needs them (e.g. `<form>.row` flips flex-direction, which can't come from a token).
- Logical CSS properties (`padding-inline`, `margin-block`, `inset-inline-start`).
- Reduced-motion-paired transitions via `@include transition(…)`.
- Bidirectional parity test maintained: every `--set-{name}-*` you add appears as a leaf in [src/browser/tokens.ts](../src/browser/tokens.ts).

---

## 7. Shipped catalog

Every component partial under [`src/styles/components/`](../src/styles/components/).

| Partial                                                         | Root selector                                                                                 | What it composes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Modifiers                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`_body.scss`](../src/styles/components/_body.scss)             | `body:has(main)`                                                                              | CSS-grid template-areas layout shell. Direct + once-removed selectors so framework mount-point wrappers (`display: contents`) work cleanly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                  |
| [`_main.scss`](../src/styles/components/_main.scss)             | `body:has(main) > main`                                                                       | Scroll container (`overflow-y: auto` + scroll containment).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                  |
| [`_article.scss`](../src/styles/components/_article.scss)       | `article`, `article > header`, `article > footer`                                             | Card with header/footer slots. Variant cascade tints the border; `.filled` opts into surface fill. Container-query named `article` for width-adaptive layouts.                                                                                                                                                                                                                                                                                                                                                                                                                                              | variant, size, style, state                        |
| [`_aside.scss`](../src/styles/components/_aside.scss)           | `body > aside`, `article aside`, `aside[role="alert"]`, `:is(aside, nav)[popover]`            | Four contexts disambiguated by ancestry / role / attributes: sidebar rail (`body > aside`), leading-bar callout (`article aside`), IN-FLOW alert / status banner (`aside[role="alert"]` / `[role="status"]`), and TOP-LAYER offcanvas drawer (`:is(aside, nav)[popover]:popover-open` — covers both `<aside popover>` and `<nav popover>` with the same chrome contract). `useAside` is an optional layer for drawers that need richer behavior (focus trap, scroll lock, dual-attribute `[data-aside-open]` / `[data-aside-closing]` lifecycle). _Toasts are NOT `<aside>` — they use `<output popover>`._ | placement (`.start` / `.end` / `.top` / `.bottom`) |
| [`_header.scss`](../src/styles/components/_header.scss)         | `body > header`                                                                               | Page app bar. Shell-only scoping; in-prose headers stay free-form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                  |
| [`_footer.scss`](../src/styles/components/_footer.scss)         | `body > footer`                                                                               | Page footer. Shell-only scoping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                  |
| [`_nav.scss`](../src/styles/components/_nav.scss)               | `nav`, `body > nav`, `nav > ol`, `nav > ul`, `nav[aria-label='…']`, `[role='tablist']` family | Single canonical chrome — content shape decides. Bare = horizontal flex; `body > nav` = vertical rail; `nav[popover]` shares the offcanvas drawer chrome from `_aside.scss` (`:is(aside, nav)[popover]`, default placement `inline-start`); inner `<ol>` w/ aria-label = breadcrumb / pagination / list-nav; `role="tablist"` = tabs (with `[role="tab"]` + `[role="tabpanel"]` chrome).                                                                                                                                                                                                                    | placement (`.start` / `.end` / `.top` / `.bottom`) |
| [`_search.scss`](../src/styles/components/_search.scss)         | `search`                                                                                      | Search bar — flex row that pairs with the framework-styled `<input>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                  |
| [`_menu.scss`](../src/styles/components/_menu.scss)             | `menu`, `article menu`, `nav menu`, `menu[popover]`, `[popover] menu`                         | Toolbar / action row / dropdown column. Article-context = `justify-end`; nav-context = vertical column; popover-context = vertical dropdown column.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | placement                                          |
| [`_output.scss`](../src/styles/components/_output.scss)         | `output[popover]`, `output[role='status']:not(.filled)`                                       | Toast surface. `output[popover]` is the canonical toast (top-layer, polite `role="status"` implicit, transient, corner-anchored via the placement modifier, auto-dismiss via `useToast`). In-flow `output[role='status']` reads as an inline status chip beside its calculation. _For in-flow alert banners that shift UI, use `<aside role="alert">` instead — toasts overlay, alerts shift._                                                                                                                                                                                                              | placement (`.start` / `.top`)                      |
| [`_form.scss`](../src/styles/components/_form.scss)             | `form`, `form > label`, `form.row`                                                            | Form-control stack. Vertical flex with gap; `.row` flips to a wrapping horizontal row (filter bars, quick-input).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | layout (`.row`)                                    |
| [`_div.scss`](../src/styles/components/_div.scss)               | `div.stack`, `div.cluster`                                                                    | Layout primitives — the deliberate fallback for patterns with no semantic root.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —                                                  |
| [`_badge.scss`](../src/styles/components/_badge.scss)           | `.badge`                                                                                      | Inline pill for counts, labels, status keywords. Bare = neutral chip; variant class repaints with subtle bg + emphasis text; `.filled` flips to saturated fill.                                                                                                                                                                                                                                                                                                                                                                                                                                             | variant, style                                     |
| [`_tag.scss`](../src/styles/components/_tag.scss)               | `.tag`                                                                                        | Inline tag (mailbox `.tag` parity) — pill-shaped chip with dismiss affordance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | variant, style                                     |
| [`_dot.scss`](../src/styles/components/_dot.scss)               | `.dot`                                                                                        | Small status dot — solid circle in the variant color.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | variant                                            |
| [`_skeleton.scss`](../src/styles/components/_skeleton.scss)     | `.skeleton`                                                                                   | Shimmering loading placeholder. Highlight derived from `--color-text` mixed into the bg so it tracks the theme. `prefers-reduced-motion` strips animation + gradient.                                                                                                                                                                                                                                                                                                                                                                                                                                       | shape (`.text`)                                    |
| [`_spinner.scss`](../src/styles/components/_spinner.scss)       | `.spinner`, `progress.indeterminate`                                                          | Rotating loading indicator. 3/4 border ring; variant tinting via `currentColor`. `prefers-reduced-motion` slows rotation rather than removing it.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | variant, size                                      |
| [`_role-group.scss`](../src/styles/components/_role-group.scss) | `[role='group']`, `[role='toolbar']`, `[role='radiogroup']`                                   | ARIA-role groupings — overlapping borders, shared corner radii. `aria-orientation='vertical'` flips axis; `role='toolbar'` wraps multiple groups in a flex row.                                                                                                                                                                                                                                                                                                                                                                                                                                             | orientation                                        |

Element baselines in [`src/styles/elements/`](../src/styles/elements/) that complete a UI pattern on their own — `<dialog>`, `<details>`, `<table>`, `<form>` family, `<figure>` + `<figcaption>`, `<blockquote>` + `<cite>`, `<progress>`, `<meter>` — do not need a separate `components/` partial. The element baseline and bare-tag chrome together carry the pattern. See [elements.md](./elements.md).

---

## 8. Composable pairings

Components that need JS interactivity pair with a composable. The composable owns **state** (open/closed, transitions, ARIA mirrors). The dynamic chrome partial in `src/styles/composables/` owns **state-gated chrome** (drawer geometry, deck stacks). The bare-tag partial in `src/styles/components/` or `src/styles/elements/` owns the **static baseline** that survives the close transition. Three layers, one responsibility each.

| Component                | Composable                                                                                                    | One-line                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Modal                    | [`useDialog`](../src/browser/composables/useDialog.ts)                                                        | Native `showModal()` / `close()` + cancellable show/hide events.                         |
| Drawer / sidebar         | [`useAside`](../src/browser/composables/useAside.ts)                                                          | Popover top-layer + slide-in via dual-attribute gating.                                  |
| Accordion                | [`useDetails`](../src/browser/composables/useDetails.ts)                                                      | `[open]` toggle + height transition via `interpolate-size`.                              |
| Dropdown / popover panel | [`useMenu`](../src/browser/composables/useMenu.ts) / [`usePopover`](../src/browser/composables/usePopover.ts) | `<menu popover>` panel + arrow-key roving + anchor positioning.                          |
| Tooltip                  | [`useTooltip`](../src/browser/composables/useTooltip.ts)                                                      | Hover / focus triggers + `[popover=hint]` panel.                                         |
| Listbox / combobox       | [`useSelect`](../src/browser/composables/useSelect.ts)                                                        | `<menu>` listbox with filter + multi-select + autocomplete.                              |
| Toast                    | [`useToast`](../src/browser/composables/useToast.ts)                                                          | `<output popover>` with auto-hide + deck stacking.                                       |
| Tabs                     | [`useTabs`](../src/browser/composables/useTabs.ts)                                                            | `[role='tablist']` keyboard roving + lazy panel mount.                                   |
| Scroll-spy nav           | [`useNav`](../src/browser/composables/useNav.ts)                                                              | `IntersectionObserver` + `aria-current='location'`.                                      |
| Form validation          | [`useForm`](../src/browser/composables/useForm.ts)                                                            | Constraint validation + `[data-form-validated]` + `aria-invalid`.                        |
| Data table               | [`useTable`](../src/browser/composables/useTable.ts)                                                          | Sort + paginate + select + expand + resize.                                              |
| Carousel                 | [`useCarousel`](../src/browser/composables/useCarousel.ts)                                                    | Slide nav + autoplay + touch / swipe.                                                    |
| Drag and drop            | [`useDrag`](../src/browser/composables/useDrag.ts) + [`useDrop`](../src/browser/composables/useDrop.ts)       | HTML5 DnD with reorder events.                                                           |
| Toggle button            | [`useButton`](../src/browser/composables/useButton.ts)                                                        | `aria-pressed` toggle.                                                                   |
| Alert                    | [`useAlert`](../src/browser/composables/useAlert.ts)                                                          | `[role='alert']` dismiss lifecycle.                                                      |
| Focus trap               | [`useFocus`](../src/browser/composables/useFocus.ts)                                                          | `activate()` / `deactivate()` tab-trap primitive.                                        |
| Pointer                  | [`usePointer`](../src/browser/composables/usePointer.ts)                                                      | `pointerdown` → `pointermove*` → `pointerup` multiplex.                                  |
| Theme                    | [`useTheme`](../src/browser/composables/useTheme.ts)                                                          | `data-theme` explicit pin OR attribute-absent (CSS-owned `prefers-color-scheme` follow). |

Full per-composable reference — options, return shapes, events, open/closed lifecycle discipline — lives in [composables.md](./composables.md). Non-Vue consumers can drop the Vue adapter and call the framework-agnostic factory in [`src/browser/factories/`](../src/browser/factories/) directly.

---

## 9. Wiring it up

When a component lands, five touch points:

1. **`@use '{partial}'`** in [`src/styles/components/index.scss`](../src/styles/components/index.scss) — alphabetical inside the file.
2. **Token mirror** — every `--set-{name}-*` appears as a TS leaf in [`src/browser/tokens.ts`](../src/browser/tokens.ts). The bidirectional parity test enforces this on every commit.
3. **Behaviour test** under `tests/src/styles/components/_{name}.test.ts` covering: bare component renders, modifier cascade reaches the root tokens, each slot resolves the expected layout.
4. **Showcase page** under [`app/browser/pages/`](../app/browser/pages/) demonstrating the variant / size / style / state cascade plus any composition slots. Add to `app/browser/router.ts`.
5. **Documentation** — add the partial to §7 above with its root selector, composition, and modifier dimensions.

Adding a class root that wasn't listed in §4 needs a separate reason — write up why no element fits, in the partial's header comment.

---

## 10. App-shell composition patterns

A handful of compositions show up across consumer apps that aren't shipped as a partial but ARE the framework's recommended shape. Documented here so consumers don't re-invent them per project.

### Docs / settings sidebar — grouped nav with optional filter, popover-drawer on mobile

The semantic structure inside `<nav>`:

```html
<nav aria-label="Primary" :popover="isMobile ? 'auto' : undefined">
	<!-- Drawer header band — title + close, mobile only.
	     Inherits the framework's `:is(aside, nav)[popover] >
	     header:first-child` chrome (chunky padding, edge bleed,
	     bottom divider, close-button trail via
	     `margin-inline-start: auto`). -->
	<header class="drawer-header">
		<strong>Navigation</strong>
		<button popovertarget="primary-rail" popovertargetaction="hide" aria-label="Close">…</button>
	</header>

	<!-- Optional filter — `<search>` ships the row chrome -->
	<search>
		<label>
			<span class="sr-only">Filter pages</span>
			<input type="search" />
		</label>
	</search>

	<!-- Groups: alternating `<h6>` + `<menu>` sibling pairs -->
	<h6>Group label</h6>
	<menu>
		<li><a href="…">Page A</a></li>
		<li><a href="…">Page B</a></li>
	</menu>
	<h6>Next group</h6>
	<menu>…</menu>
</nav>
```

The `:popover` Vue binding (or equivalent React / Solid / Svelte) toggles the `popover` attribute below a mobile breakpoint (e.g. 960 px). When the attribute is present, the rail is lifted into the top layer and picks up the canonical drawer chrome from `components/_aside.scss`'s `:is(aside, nav)[popover]` rule set — slide-from-edge motion, native `::backdrop` scrim (`surfaces/_backdrop.scss`), header band with edge bleed, close-button trail, and Esc / click-outside dismiss. When the attribute is absent (desktop), the rail renders as a regular in-flow grid cell of the body shell.

**Group structure: `<h6>` + `<menu>` siblings, NOT `<section>` wrappers.**

- `<section>` ships `padding-block` (sectioning-content baseline) that bloats sidebar vertical rhythm.
- `<section>` inside `<nav>` nests region landmarks unnecessarily — `<nav>` is already a landmark.
- Heading + menu pairs are the correct semantic for "this heading labels these nav targets."
- Control inter-group rhythm via h6 asymmetric margins (room above each non-first heading, tight below to its menu) so the heading reads as a label for the list directly beneath it.

### Scroll-container model

The framework's body-shell rail is a SINGLE scroll container by default: the `<nav>` itself has `overflow-y: auto` so all its content (drawer header + any inner regions + menus) scrolls together. This is the right baseline for product navs.

Docs-style sidebars often want a SPLIT scroll container: title + filter pinned at the top, the link list scrolling below. That's a CONSUMER composition (not a framework chrome) — the consumer turns `<nav>` into a flex column with `overflow: hidden`, pads each region with its own `padding-inline` (since the rail's own padding is zeroed so dividers paint edge-to-edge), and wraps the link list in a `flex: 1; overflow-y: auto` scroll region. Both modes (in-flow desktop AND popover-drawer mobile) use the same split because the title band + filter row should stay reachable while the link list scrolls in both contexts. See `app/browser/styles/showcase.css` for the worked example.

Two notes for consumers running the split-scroll pattern:

1. **Drawer-band negative-margin override.** The framework's `:is(aside, nav)[popover] > header:first-child` rule ships `margin-inline: calc(var(--set-aside-drawer-padding-inline) * -1)` so the band bleeds past the drawer's own inline padding to reach the outer edge. With the split pattern, the rail's padding is `0` — the negative margin would push the band off-screen. Cancel it on the consumer's drawer-header class:

   ```css
   :is(aside, nav)[popover]:has(> search) > header:first-child {
   	margin-inline: 0;
   }
   ```

   The band still uses its own `padding-inline` (also from `--set-aside-drawer-padding-inline`) so visual position is unchanged — just sourced from padding instead of negative margin.

2. **Framework drawer-header sticky pin only applies in-flow.** `_header.scss`'s `body:has(main) > nav:not([popover]) > header` rule pins the rail's drawer header with `position: sticky` while the rail scrolls. The `:not([popover])` clause means this only fires in desktop in-flow mode; popover-drawer mode leaves the band as a normal flex child (`flex-shrink: 0`) at the top of the column. With the split pattern AND a hidden desktop header (the showcase's `.drawer-header { display: none }` below 961 px), the sticky pin is a no-op anyway — but the gating keeps the framework rule from fighting the consumer's chrome on mobile.

### App bar header parity

`<header>` inside the body-grid (page app bar, side rail header) consumes `--set-header-padding-*` from `_header.scss`. The mobile drawer header band (`:is(aside, nav)[popover] > header:first-child`) consumes `--set-aside-drawer-padding-*` from `_aside.scss` — the standalone offcanvas convention (chunkier, mailbox-style padding). On a typical mobile viewport the band reads as a slightly taller strip than the body app bar; if the host wants visual height parity across all three bands when a drawer is open, override the drawer-band padding-block at the consumer's class:

```css
body:has(main) > :is(aside, nav)[popover] > header.drawer-header {
	padding-block: var(--set-header-padding-block);
}
```

---

## 11. Cross-references

- [styles.md](./styles.md) — top-level architecture and authoring contract.
- [tokens.md](./tokens.md) — the token system components consume.
- [modifiers.md](./modifiers.md) — the modifier cascade components consume.
- [elements.md](./elements.md) — element baselines components compose from.
- [surfaces.md](./surfaces.md) — sibling category for browser-rendered chrome.
- [composables.md](./composables.md) — Vue + factory layer for the dynamic component partials.
