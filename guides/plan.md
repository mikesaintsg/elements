# Plan — Current Status & Next Steps

> Living checklist of where the framework stands and what remains. Read this to know **where to pick up**; read [contribute.md](contribute.md) to know **how to work**.

Status: every layer (tokens, theme, mixins, modifiers, elements, components, surfaces, composables) is fully shipped + parity-tested. Phase 9 (showcase pages) is the bulk of remaining work — 29 of 43 pages built; the foundation pages + composable-bound pages are queued below. Cross-cutting framework polish (floating-surface styling pass, `.disabled` token surface, etc.) is enumerated in §Future work.

---

## At a glance

| Phase     | Description                                                                | Status |
| --------- | -------------------------------------------------------------------------- | ------ |
| 0         | Repo bootstrap (deps, scripts, vite + vitest projects)                     | ✅     |
| 1         | Cascade layer order + style entry                                          | ✅     |
| 2         | Tokens (variant palette, `--set-*` namespace, theme)                       | ✅     |
| 3         | Mixins + Sass-list constants                                               | ✅     |
| 4         | Modifiers (5 dimensions × full required-token coverage)                    | ✅     |
| 5         | Element baselines (94 partials; 49 substantive, 8 reset, rest passthrough) | ✅     |
| 6         | Components (18 partials; tag-rooted + class-component primitives)          | ✅     |
| 7         | Surfaces (9 partials; pseudo-element + attribute)                          | ✅     |
| 8         | Composables (20 use/create pairs + 6 chrome partials)                      | ✅     |
| 9         | Showcase pages                                                             | 🟡     |
| 10        | Distribution (build + pack)                                                | ✅     |
| 11        | Invariant verification (11 codified contracts)                             | ✅     |
| **Audit** | **Element-hardcoding, motion contract, token-group uniformity sweeps**     | ✅     |

**Tests:** `src:browser` 1211/1211 · `src:styles` 3852/3852 · total **5063/5063 pass**.

---

## What's shipped — framework layers

### Tokens (`src/styles/_tokens.scss` + `src/styles/_theme.scss`)

`:root` declarations for color palette (7 variants × 4 tiers: bg-subtle / text-emphasis / border-subtle / on-canvas), spacing, font sizes, line heights, motion (`--set-motion-duration`, `--set-motion-timing-function`), transitions (`--set-transition-duration`), border / radius defaults, icon mask paths, focus chrome, sticky offset, z-index slots. Light + dark via `light-dark()` per `color-scheme`. Per-tag token surface mirrored in [`src/browser/tokens.ts`](../src/browser/tokens.ts).

### Mixins + Sass lists (`src/styles/_mixins.scss`)

Functions, mixins, and Sass-list registries. Documented in [mixins.md](mixins.md):

- `$variants`, `$sizes`, `$styles`, `$states`, `$placements` — modifier-vocabulary source of truth.
- `@mixin transition($list)` + `@mixin reduced-motion` — reduced-motion-aware transition wrapping.
- `@mixin forced-colors` — Windows High Contrast fallback wrapper.
- `@mixin focus-ring($alpha)` — canonical focus-visible ring.
- `@mixin palette-each` — iterate `$variants` to emit per-variant rules without hand-rolling.

### Modifiers — 5 dimensions (`src/styles/modifiers/`)

| Dimension     | Members                                                                               | Partial                                                        |
| ------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `variant`     | `primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `information`     | [`_variants.scss`](../src/styles/modifiers/_variants.scss)     |
| `size`        | `small`, `large`                                                                      | [`_sizes.scss`](../src/styles/modifiers/_sizes.scss)           |
| `style`       | `subtle`, `filled`                                                                    | [`_styles.scss`](../src/styles/modifiers/_styles.scss)         |
| `state`       | `disabled`, `active`, `loading`                                                       | [`_states.scss`](../src/styles/modifiers/_states.scss)         |
| `placement`   | `top`, `bottom`, `start`, `end`, `top-start`, `top-end`, `bottom-start`, `bottom-end` | [`_placements.scss`](../src/styles/modifiers/_placements.scss) |
| element-local | `form.row`, `button.dropdown`, `table.striped`, … (single-element modifiers)          | [`_local.scss`](../src/styles/modifiers/_local.scss)           |

Full reference in [modifiers.md](modifiers.md). Required tokens per dimension in [patterns.md](patterns.md) § 6.

### Elements — 94 partials (`src/styles/elements/`)

Per the taxonomy ([taxonomy.md](taxonomy.md)): 49 substantive (own `--set-{tag}-*` tokens), 8 reset (UA normalization only), 34 passthrough (comment-only stubs documenting why the framework has no opinion). Cross-referenced in [`src/browser/elements.ts`](../src/browser/elements.ts) (substantive baselines) + [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts) (every tag's treatment).

### Components — 18 partials (`src/styles/components/`)

| Partial                                                         | Role                                                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`_article.scss`](../src/styles/components/_article.scss)       | Card chrome — `<article>` with optional `> header:first-child`, `> footer:last-child`, `> img:first-child` / `> picture:first-child`, `> ul.group` / `> ol.group` slots. |
| [`_aside.scss`](../src/styles/components/_aside.scss)           | Three contexts on one element: body-shell rail · alert banner (`aside[role='alert']`) · drawer surface (`:is(aside, nav)[popover]`).                                     |
| [`_badge.scss`](../src/styles/components/_badge.scss)           | Inline pill class-component (`.badge`).                                                                                                                                  |
| [`_body.scss`](../src/styles/components/_body.scss)             | Layout shell — promotes `<body>` with a `<main>` child to a 3×3 template-area grid.                                                                                      |
| [`_div.scss`](../src/styles/components/_div.scss)               | Layout primitives — `.stack`, `.cluster`, `.scrollable:not(dialog)`.                                                                                                     |
| [`_dot.scss`](../src/styles/components/_dot.scss)               | Status dot class-component (`.dot`).                                                                                                                                     |
| [`_footer.scss`](../src/styles/components/_footer.scss)         | Footer band in page-shell, article, dialog contexts.                                                                                                                     |
| [`_form.scss`](../src/styles/components/_form.scss)             | Form-control stack + `form.row` modifier + `[data-form-validated]` chrome.                                                                                               |
| [`_header.scss`](../src/styles/components/_header.scss)         | Header band in page-shell, article, dialog, rail-drawer contexts; sticky-pin on in-flow rails.                                                                           |
| [`_main.scss`](../src/styles/components/_main.scss)             | `<main>` scroll container in the body grid.                                                                                                                              |
| [`_menu.scss`](../src/styles/components/_menu.scss)             | Toolbar / action row / dropdown column / nav-rail menu / TOC menu / grouped-sidebar `<h6>+<menu>` rhythm.                                                                |
| [`_nav.scss`](../src/styles/components/_nav.scss)               | Nav rail + `<nav><ol>` breadcrumb + `<nav aria-label='Pagination'>` + tablist chrome.                                                                                    |
| [`_output.scss`](../src/styles/components/_output.scss)         | Toast surface — `<output popover>` (top-layer, corner-anchored) + in-flow `<output role='status'>`.                                                                      |
| [`_role-group.scss`](../src/styles/components/_role-group.scss) | `[role='group']` / `[role='toolbar']` ARIA composition chrome.                                                                                                           |
| [`_search.scss`](../src/styles/components/_search.scss)         | Search-bar row layout for `<search>` (input + optional submit + suggestion slot).                                                                                        |
| [`_skeleton.scss`](../src/styles/components/_skeleton.scss)     | Loading placeholder block class-component (`.skeleton`).                                                                                                                 |
| [`_spinner.scss`](../src/styles/components/_spinner.scss)       | Rotating ring loader class-component (`.spinner`).                                                                                                                       |
| [`_tag.scss`](../src/styles/components/_tag.scss)               | Chip-shape tag class-component (`.tag`) + `.tag.ghost` element-local style.                                                                                              |

Full per-component contract data in [`COMPONENT_CONTRACTS`](../src/browser/patterns.ts) and [components.md](components.md).

### Surfaces — 9 partials (`src/styles/surfaces/`)

Cross-cutting pseudo-element / attribute / state surfaces; cascade-layer `surfaces` sits after `components`.

| Partial                                                                 | Selector(s)                                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss) | `[popover]:not(:where(aside, dialog, nav, output))` — anchor-positioning baseline. |
| [`_backdrop.scss`](../src/styles/surfaces/_backdrop.scss)               | `::backdrop` — scrim under dialog / popover.                                       |
| [`_focus.scss`](../src/styles/surfaces/_focus.scss)                     | `:focus-visible` — canonical focus ring.                                           |
| [`_marker.scss`](../src/styles/surfaces/_marker.scss)                   | `::marker` — list-marker color sync.                                               |
| [`_placeholder.scss`](../src/styles/surfaces/_placeholder.scss)         | `::placeholder` — form-input placeholder color + opacity.                          |
| [`_popover.scss`](../src/styles/surfaces/_popover.scss)                 | `[popover]:not(:where(aside, dialog, nav))` — generic popover surface chrome.      |
| [`_scrollbar.scss`](../src/styles/surfaces/_scrollbar.scss)             | `::-webkit-scrollbar*` + `scrollbar-width` / `scrollbar-gutter`.                   |
| [`_selection.scss`](../src/styles/surfaces/_selection.scss)             | `::selection` — text-selection tint.                                               |
| [`_view-transition.scss`](../src/styles/surfaces/_view-transition.scss) | `::view-transition*` — declarative route transitions.                              |

Full per-surface contract data in [`SURFACE_CONTRACTS`](../src/browser/patterns.ts) and [surfaces.md](surfaces.md).

### Composables — 20 use/create pairs (`src/browser/composables/` + `src/browser/factories/`)

Every composable pairs `use{Name}` (Vue adapter) with `create{Name}` (framework-agnostic factory). 14 element-bound + 6 attribute-bound primitives. The 6 chrome partials in `src/styles/composables/` paint state-gated CSS on top of the JS.

| Composable    | Bound to                              | Chrome partial?                                                            |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `useButton`   | `<button>`                            | (none — element baseline)                                                  |
| `useDialog`   | `<dialog>`                            | [`_dialog.scss`](../src/styles/composables/_dialog.scss)                   |
| `useAside`    | `<aside popover="manual">`            | [`_aside.scss`](../src/styles/composables/_aside.scss) (behavior-only)     |
| `useDetails`  | `<details>`                           | (chrome lives on `<details>::details-content` in `_details.scss`)          |
| `useToast`    | `<output popover>`                    | [`_toast.scss`](../src/styles/composables/_toast.scss)                     |
| `useMenu`     | `<menu popover>` + `<button>`         | (chrome on `menu[popover]` in components/\_menu.scss)                      |
| `useSelect`   | `<menu>` listbox + `<button>` / input | [`_select.scss`](../src/styles/composables/_select.scss)                   |
| `useTable`    | `<table>`                             | (chrome on `[data-table-*]` in elements/\_table.scss)                      |
| `useForm`     | `<form>`                              | (chrome on `[data-form-validated]` in components/\_form.scss)              |
| `useNav`      | `<nav>`                               | (uses `aria-current="location"` already painted in components/\_menu.scss) |
| `useAlert`    | `aside[role='alert']`                 | (chrome on `[data-alert-open]` in components/\_aside.scss)                 |
| `useTabs`     | `[role='tablist']`                    | [`_tabs.scss`](../src/styles/composables/_tabs.scss)                       |
| `useCarousel` | `<section class="carousel">`          | [`_carousel.scss`](../src/styles/composables/_carousel.scss)               |
| `usePopover`  | `[popover]` panel + invoker           | (chrome from surfaces/\_popover.scss)                                      |
| `useTooltip`  | Any + `[popover=hint]` target         | (chrome from surfaces/\_popover.scss)                                      |
| `useFocus`    | Any container ref                     | (behavior only — no chrome)                                                |
| `useDrag`     | `[data-index]` rows                   | (behavior only)                                                            |
| `useDrop`     | Drop-target container                 | (behavior only)                                                            |
| `usePointer`  | Any element                           | (behavior only)                                                            |
| `useTheme`    | Document root                         | (behavior only — `data-theme` flips CSS)                                   |

Full per-composable contract data in [`COMPOSABLE_CONTRACTS`](../src/browser/patterns.ts) and [composables.md](composables.md).

---

## What's shipped — codified contracts (11)

Every SCSS partial is held to these contracts before it can merge. The contract data lives in [`src/browser/patterns.ts`](../src/browser/patterns.ts) + [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts); prose explanation in [patterns.md](patterns.md).

| #   | Contract                   | Source                                                                     | Test                                                                                                                                                                                                |
| --- | -------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Folder structural          | `FOLDER_CONTRACTS`, `FILE_EXCEPTIONS`                                      | [`_contracts.test.ts`](../tests/src/styles/_contracts.test.ts)                                                                                                                                      |
| 2   | HTML taxonomy + uniformity | `taxonomy`, `TAXONOMY_BY_TAG`, `TOKEN_GROUPS` (12 groups), `GROUPS_BY_TAG` | [`_taxonomy.test.ts`](../tests/src/styles/_taxonomy.test.ts), [`_uniformity.test.ts`](../tests/src/styles/_uniformity.test.ts), [`browser/taxonomy.test.ts`](../tests/src/browser/taxonomy.test.ts) |
| 3   | Interactive elements       | `INTERACTIVE_ELEMENTS`, `FORCED_COLORS_INCLUDE_REGEX`, `hasBareFocusRule`  | [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts)                                                                                                                                  |
| 4   | Scope discipline           | `hasChainedTagNots`, `hasScopingFunction`                                  | [`_scope.test.ts`](../tests/src/styles/_scope.test.ts)                                                                                                                                              |
| 5   | Modifier dimensions        | `MODIFIER_DIMENSION_TOKENS`                                                | [`_dimensions.test.ts`](../tests/src/styles/_dimensions.test.ts)                                                                                                                                    |
| 6   | Surface contracts          | `SURFACE_CONTRACTS`                                                        | [`_surfaces.test.ts`](../tests/src/styles/_surfaces.test.ts)                                                                                                                                        |
| 7   | Component contracts        | `COMPONENT_CONTRACTS`                                                      | [`_components.test.ts`](../tests/src/styles/_components.test.ts)                                                                                                                                    |
| 8   | Composable contracts       | `COMPOSABLE_CONTRACTS`                                                     | [`_composables.test.ts`](../tests/src/styles/_composables.test.ts)                                                                                                                                  |
| 9   | Structural pairings        | `STRUCTURAL_PAIRINGS`, `extractTagPairs`, `isAllowedTagPair`               | [`_pairings.test.ts`](../tests/src/styles/_pairings.test.ts)                                                                                                                                        |
| 10  | Motion contract            | `MOTION_CONTRACT_PARTIALS`                                                 | [`_motion.test.ts`](../tests/src/styles/_motion.test.ts)                                                                                                                                            |
| 11  | TS shape parity            | (the registries themselves)                                                | [`browser/patterns.test.ts`](../tests/src/browser/patterns.test.ts)                                                                                                                                 |

**12 token-uniformity groups** (per `TOKEN_GROUPS`): `interactive`, `form-control`, `page-shell`, `card-region`, `floating-surface`, `inline-chip`, `disclosure`, `media-embed`, `progress-indicator`, `numeric-data`, `boxed-container`, `class-chip`. Each names members + required `--set-{member}-*` token suffixes; enforced by `_uniformity.test.ts`.

---

## What's shipped — showcase pages (29 of 43)

| Group                    | Pages                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Shell + chrome           | HomePage, sidebar, TOC, theme toggle, mobile drawer                                         |
| Foundations              | TokensPage, ThemePage                                                                       |
| Elements — Interactive   | ButtonPage, AnchorPage, FormControlsPage, DetailsPage, DialogElementPage                    |
| Elements — Content       | HeadingsPage, TypographyPage, ListsPage, TablesPage, MediaPage, FiguresPage, SectioningPage |
| Components               | ArticleCardPage, AsidePage, NavPage, MenuPage, InlineAtomsPage                              |
| Surfaces                 | PopoverSurfacesPage, FormSurfacesPage, ScrollAndTransitionPage                              |
| Composables — Primitives | UseFocusPage, UsePointerPage, UseDragDropPage, UseThemeButtonPage                           |
| Composables — Floating   | UsePopoverPage, UseTooltipPage                                                              |

Element pages cover the static markup contract; the matching `Use*Page` (planned, §9.2) covers the JS interaction layer — `DetailsPage` proves the bare `<details>` element baseline, `UseDetailsPage` (planned) proves the `useDetails` programmatic open/close. Both pages exist for elements with composables.

---

## Remaining work — Phase 9 (16 pages)

### 9.1 Foundation pages (4)

Highest leverage — every other page references them.

- ✅ **TokensPage** — every `--set-*` leaf surfaced with its live computed value; retune playgrounds (radius factor, density factor, motion duration + curve, focus ring width + opacity); icon registry preview; elevation scale (`--set-box-shadow-small / -base / -large`); z-index scale; floater viewport budget; summary marker swap demo; "How + where to set tokens" with Tailwind v4 `@theme` integration.
- ✅ **ThemePage** — `useTheme()` light / dark / system switcher; variant palette swatches (7 saturated bases); brand-retune playground (`<input type="color">` writes `--color-primary` and the four-tier cascade re-derives live); per-variant four-tier swatch grids (`bg-subtle` / `text-emphasis` / `border-subtle` / `on-canvas`); canvas / text / border / inverted tier demonstrations; light-vs-dark resolution explainer (data-theme + media query); customization paths (Tailwind `@theme` blocks, `:root` overrides, scoped overrides).
- ⬜ **ModifiersPage** — variant × size × style × state × placement cascade demonstration. Single shared markup, 16+ rendered permutations.
- ⬜ **PlacementsPage** — popover anchor positioning live (`.top`, `.bottom`, `.start`, `.end`, plus corners), `position-try-fallbacks` flip demo, viewport-clamp behaviour. Cross-refs the flattened `:not(:where(...))` scope-discipline rule (see [patterns.md](patterns.md) §5).

### 9.2 Composable pages — element-bound (12)

Each page proves the `use{Name}` factory's JS layer on top of the matching element page.

- ⬜ **UseMenuPage** — `<menu popover>` panel + toggle, arrow-key roving, Home / End, click-outside dismiss.
- ⬜ **UseDialogPage** — modal vs non-modal, every dismissal path (Esc, backdrop, programmatic), `'static'` mode (no backdrop dismiss), scrollable + fullscreen modifiers, non-modal scroll-lock.
- ⬜ **UseAsidePage** — drawer mode (`<aside popover="manual">`) at every edge (`.start`, `.end`, `.top`, `.bottom`), backdrop dismiss, `[data-aside-closing]` lifecycle exposed.
- ⬜ **UseDetailsPage** — programmatic open / close synced with native `toggle`, animated height (the `::details-content` reference behavior the framework's motion contract matches), group accordion (one-open-at-a-time pattern).
- ⬜ **UseToastPage** — `<output popover>` toast surface. Linear stack (default), Sonner-deck mode (`[data-toast-stack]`), auto-hide timer + pause-on-hover, swipe-to-dismiss, variant tinting, hidden-overflow indicator. Covers the toast end of the toast-vs-alert disambiguation (banner alert lives on `AsidePage`).
- ⬜ **UseSelectPage** — listbox + combobox + multi-select + autocomplete + typeahead filter. Three sub-demos: native select repaint, custom listbox, combobox with sticky search.
- ⬜ **UseTablePage** — sort (one / multi-column), paginate, multi-select with shift-range, row expansion (sync + animated), column resize, focus management, sticky header.
- ⬜ **UseFormPage** — constraint-validation pipeline, `[data-form-validated]` after first submit, per-field `aria-invalid` mirror, summary error region, submit-disabled-on-invalid.
- ⬜ **UseNavPage** — scroll-spy on a long article with anchored sections; `aria-current="location"` flips as scroll position passes section boundaries.
- ⬜ **UseAlertPage** — `useAlert` open / dismiss lifecycle, transition collapse, polite vs assertive (`role="alert"` vs `role="status"`), persistence across re-mounts.
- ⬜ **UseTabsPage** — `[role="tablist"]` arrow-key roving, lazy panel mount, vertical vs horizontal orientation, manual vs automatic activation.
- ⬜ **UseCarouselPage** — slide nav, autoplay + pause-on-hover, touch / swipe, indicator dots, variant-tinted slides, every-axis transition lifecycle.

### 9.3 Sidebar nav adjustments (before page #15)

The current flat sidebar list works for 1–14 pages. By the time the roster hits ~15 entries:

- ⬜ **Group-collapsible sidebar** — `<details><summary>{group}</summary><menu>…</menu></details>` per group so the rail isn't a 42-line scroll.
- ⬜ **Keyboard nav inside the rail** — arrow keys move focus between visible items; `[` / `]` collapse / expand groups.

### 9.4 Cross-page polish (after all pages exist)

- ⬜ **Theme retune end-to-end** — pin a brand color at `:root` and walk every page; verify the cascade reaches focus rings / toasts / alerts / selections / popovers / tabs / breadcrumbs.
- ⬜ **Reduced-motion full-suite** — verify every animation + transition collapses across all 43 pages (paired-mixin coverage already enforced by the surface / component / composable / motion contracts).
- ⬜ **Forced-colors full-suite** — Windows High Contrast walkthrough (per-element coverage already enforced by [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts); this is the end-to-end visual pass).
- ⬜ **Console-clean full-suite** — boot the dev server, walk every page, capture zero Vue warns / zero Tailwind missing-source warns.

---

## Cross-cutting framework changes (recent)

Selected updates surfaced during page authoring + audit phases:

- **`--color-{variant}-on-canvas` tier** — added per-variant text-on-canvas tier with per-mode `color-mix` tuning so bare variant anchors / labels clear WCAG AA against the body canvas in both themes.
- **Alert / toast / popover taxonomy** — clarified the IN-FLOW (alerts, callouts) vs TOP-LAYER (popovers, toasts) split; documented in [components.md](components.md).
- **Alert is a BANNER, not a card or toast** — removed the `--set-alert-max-inline-size: 32rem` cap (was toast-shaped thinking); alert now spans its parent's content area like every other in-flow announcement, with optional card-like composition via direct-child `<header>` / `<footer>` bands.
- **Body-shell motion contract** — shared `--set-motion-{duration, timing-function}` tokens consumed by every panel-style reveal: rail drawers + `<aside popover>` offcanvas + `<dialog>` modal/non-modal + `<details>::details-content` + table row expansion + alert open/close + summary trailing margin. The `::details-content` native animation is the reference smoothness the framework matches across the family; enforced by `MOTION_CONTRACT_PARTIALS` + `_motion.test.ts`.
- **`button.dropdown` opt-in caret** — caret affordance moved from "every `button[popovertarget]`" to a deliberate `.dropdown` opt-in, with rotation gated on `[aria-expanded='true']`.
- **List-group cascade ordering** — `.active` now follows the variant tint rules in `_li.scss` so `<li class="success active">` paints the saturated identity fill (active wins) rather than the subtle tint.
- **Scrollbars Module L1 inheritance gap** — `scrollbar-width` and `scrollbar-gutter` don't inherit; moved to universal selector `*, *::before, *::after` so the non-inherited properties land on every scroll container.
- **Popover-broadcast exclusion alignment** — added `<dialog>` to the `:not(:where(aside, dialog, nav, output))` lists in `modifiers/_placements.scss` + `surfaces/_anchor-position.scss` (drawer-shaped elements with their own viewport-fixed placement geometry); alphabetized for diff stability.
- **No element-hardcoding inside containment** — removed an early absorption that singled out `<search>` as the structural marker for docs-sidebar pinned-filter chrome (`nav:has(> search)` + `nav > search` rules). Composed-rail patterns now live on consumer wrapper classes (`.showcase-sidebar*` in `app/browser/styles/showcase.css`); framework keeps the rail's bare-default single-scroller. The architectural rule is codified as `STRUCTURAL_PAIRINGS` (51-entry allowlist with `spec` / `slot` / `reset` / `context` kinds), enforced by `_pairings.test.ts` — see [patterns.md](patterns.md) §10.
- **`<h6>` + `<menu>` rail rhythm** — paid for the grouped-sidebar pattern `_menu.scss` already documented: uppercase eyebrow chrome on `<h6>` inside body-shell `<nav>` / `<aside>` rails, asymmetric inter-group margins, zeroed `<menu>` block margins.
- **Token-group expansion** — added 5 new uniformity groups (`media-embed`, `progress-indicator`, `numeric-data`, `boxed-container`, `class-chip`) bringing the total to 12. Surfaced a `<video>` drift (raw `max-inline-size: 100%` instead of the `--set-video-max-inline-size` token used by every other embed); fixed.

---

## Future work (post-Phase 9)

Identified but not started. Open the matching contribute.md workflow when picking one up.

### Token surface refinements

- ⬜ **`.disabled` modifier customizability gap** — `.disabled` currently hard-codes `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`. Expose as `--set-state-disabled-{opacity, cursor}` so consumers can retune globally at `:root` (see [patterns.md](patterns.md) §6.4 and `MODIFIER_DIMENSION_TOKENS.state.rationale`).
- ⬜ **Composable state-attribute audit** — review every `[data-{name}-*]` attribute name for consistency; document the canonical set in [composables.md](composables.md).

### Refactor opportunities

- ⬜ **Element-local modifier consolidation** — survey component partials for `{tag}.{modifier}` rules that should migrate to `modifiers/_local.scss` (e.g. `form.row` in `components/_form.scss`).
- ⬜ **Page-shell uniformity** — `_main.scss` declares minimum tokens to satisfy the page-shell group; revisit whether `main` belongs in the group or warrants its own contract.

### Floating-surface styling pass (toast + popover + tooltip + menu-popover)

The framework's floating-surface family (`<output popover>` toasts, generic `[popover]`, `[popover=hint]` tooltips, `<menu popover>` dropdowns, in-flow callouts on `<aside>`, modal chrome on `<dialog>`) already shares the same `--set-popover-*` surface tokens for fill / border / radius / shadow / transition. The per-surface chrome has accumulated without a single styling-philosophy pass to confirm:

- ⬜ **Visual language uniformity** — each floating surface paints chrome (corner radius, elevation, padding, border) that reads as one family across the framework. Verify the bare-popover, toast, tooltip, dropdown all reach for the same surface tokens (vs. each declaring its own one-off literal). Decide which differences are meaningful (toast: deck offset; tooltip: smaller padding; dropdown: row chrome) and which are accidental drift.
- ⬜ **Surface-vs-placement separation** — placement modifiers (`.top`, `.bottom-start`, etc.) live in `modifiers/_placements.scss` and apply to every `[popover]` host. Surface chrome lives in `surfaces/_popover.scss` + per-component partials. Confirm the boundary: placement modifiers should set position only (`position-area` + alignment); surfaces own background, border, shadow, radius, padding. No surface partial should hardcode a placement; no placement modifier should reach into surface tokens.
- ⬜ **Toast-vs-alert disambiguation across the framework** — the alert (`<aside role="alert">`) is an in-flow banner; the toast (`<output popover>`) is a top-layer transient. They share the variant palette (bg-subtle / text-emphasis / border-subtle) but NOT the geometry (banner fills parent; toast is corner-anchored). Audit every page + guide for language conflating the two.
- ⬜ **Tooltip + dropdown styling parity** — currently the popover surface paints `[popover]:not(:where(aside, dialog, nav))` with scale-in chrome (the generic popover entry transition). Verify tooltips (`[popover=hint]`) inherit cleanly without override drift, and that dropdown menus (`<menu popover>`) keep their row chrome from `_menu.scss` without fighting the surface defaults.

Outcome: one styling philosophy across every floating surface, codified in [surfaces.md](surfaces.md) § "Floating surface family" and enforced by a parity test that asserts each surface declares the canonical token superset.

### Cross-cutting

- ⬜ **README consumer-setup snippet** — finalise the public-facing README with install / cascade-layer-order / token-override examples.
- ⬜ **Changelog discipline** — adopt conventional commits or similar so the next release pulls a clean delta.

---

## Reference

- [contribute.md](contribute.md) — the workflow for humans + agents (how to add an element, modifier, composable, showcase page).
- [patterns.md](patterns.md) — per-folder structural contracts + scope discipline + the 11 codified contract registries.
- [taxonomy.md](taxonomy.md) — every native HTML element + the framework's treatment of it + the 12 token-uniformity groups.
- [AGENTS.md](../AGENTS.md) — codified conventions (naming, typing, Sass / SCSS rules).
- [styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [composables.md](composables.md), [surfaces.md](surfaces.md) — the per-layer specs.
