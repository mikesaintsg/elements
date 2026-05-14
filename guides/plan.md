# Plan — Current Status & Next Steps

> Living checklist of where the framework stands and what remains. Read this to know **where to pick up**; read [contribute.md](contribute.md) to know **how to work**.

Status: every framework layer (tokens, theme, mixins, modifiers, elements, components, surfaces, composables) is shipped + parity-tested. Phase 9 (showcase pages) is the bulk of remaining work — 36 of 43 pages built (4 Foundations + 8 composable-bound: **UseMenu**, **UseDialog**, **UseAside**, **UseTabs**, **UseDetails**, **UseToast**, **UseSelect**, **UseTable**); 4 composable-bound pages queued. The current cross-cutting push is the **`.flat` / `.flush` modifier family** rollout — see §Future work.

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

**Tests:** `src:browser` + `src:styles` total **5108/5108 pass**.

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

### Modifiers — 5 dimensions + element-local (`src/styles/modifiers/`)

| Dimension     | Members                                                                                                   | Partial                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `variant`     | `primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `information`                         | [`_variants.scss`](../src/styles/modifiers/_variants.scss)     |
| `size`        | `small`, `large`                                                                                          | [`_sizes.scss`](../src/styles/modifiers/_sizes.scss)           |
| `style`       | `subtle`, `filled`                                                                                        | [`_styles.scss`](../src/styles/modifiers/_styles.scss)         |
| `state`       | `disabled`, `active`, `loading`                                                                           | [`_states.scss`](../src/styles/modifiers/_states.scss)         |
| `placement`   | `top`, `bottom`, `start`, `end`, `top-start`, `top-end`, `bottom-start`, `bottom-end`                     | [`_placements.scss`](../src/styles/modifiers/_placements.scss) |
| element-local | `form.row`, `button.dropdown`, `table.striped`, `{tag}.flat`, `{tag}.flush`, … (single-element modifiers) | [`_local.scss`](../src/styles/modifiers/_local.scss)           |

Full reference in [modifiers.md](modifiers.md). Required tokens per dimension in [patterns.md](patterns.md) § 6.

### Elements, components, surfaces, composables

| Layer       | Count                                                                                                                                                                                                                                                                                                                         | Reference                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Elements    | 94 partials (49 substantive, 8 reset, 34 passthrough)                                                                                                                                                                                                                                                                         | [`elements.ts`](../src/browser/elements.ts) + [`taxonomy.ts`](../src/browser/taxonomy.ts), prose in [taxonomy.md](taxonomy.md) |
| Components  | 18 partials — `_article`, `_aside`, `_badge`, `_body`, `_div`, `_dot`, `_footer`, `_form`, `_header`, `_main`, `_menu`, `_nav`, `_output`, `_role-group`, `_search`, `_skeleton`, `_spinner`, `_tag`                                                                                                                          | [`COMPONENT_CONTRACTS`](../src/browser/patterns.ts), prose in [components.md](components.md)                                   |
| Surfaces    | 9 partials — `_anchor-position`, `_backdrop`, `_focus`, `_marker`, `_placeholder`, `_popover`, `_scrollbar`, `_selection`, `_view-transition`                                                                                                                                                                                 | [`SURFACE_CONTRACTS`](../src/browser/patterns.ts), prose in [surfaces.md](surfaces.md)                                         |
| Composables | 20 use/create pairs (14 element-bound + 6 attribute-bound primitives) — `useButton`, `useDialog`, `useAside`, `useDetails`, `useToast`, `useMenu`, `useSelect`, `useTable`, `useForm`, `useNav`, `useAlert`, `useTabs`, `useCarousel`, `usePopover`, `useTooltip`, `useFocus`, `useDrag`, `useDrop`, `usePointer`, `useTheme` | [`COMPOSABLE_CONTRACTS`](../src/browser/patterns.ts), prose in [composables.md](composables.md)                                |

---

## What's shipped — codified contracts (11)

Every SCSS partial is held to these contracts before it can merge. Contract data in [`src/browser/patterns.ts`](../src/browser/patterns.ts) + [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts); prose in [patterns.md](patterns.md).

| #   | Contract                   | Test                                                                                |
| --- | -------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Folder structural          | [`_contracts.test.ts`](../tests/src/styles/_contracts.test.ts)                      |
| 2   | HTML taxonomy + uniformity | [`_taxonomy.test.ts`](../tests/src/styles/_taxonomy.test.ts), `_uniformity.test.ts` |
| 3   | Interactive elements       | [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts)                  |
| 4   | Scope discipline           | [`_scope.test.ts`](../tests/src/styles/_scope.test.ts)                              |
| 5   | Modifier dimensions        | [`_dimensions.test.ts`](../tests/src/styles/_dimensions.test.ts)                    |
| 6   | Surface contracts          | [`_surfaces.test.ts`](../tests/src/styles/_surfaces.test.ts)                        |
| 7   | Component contracts        | [`_components.test.ts`](../tests/src/styles/_components.test.ts)                    |
| 8   | Composable contracts       | [`_composables.test.ts`](../tests/src/styles/_composables.test.ts)                  |
| 9   | Structural pairings        | [`_pairings.test.ts`](../tests/src/styles/_pairings.test.ts)                        |
| 10  | Motion contract            | [`_motion.test.ts`](../tests/src/styles/_motion.test.ts)                            |
| 11  | TS shape parity            | [`patterns.test.ts`](../tests/src/browser/patterns.test.ts)                         |

**12 token-uniformity groups** (per `TOKEN_GROUPS`): `interactive`, `form-control`, `page-shell`, `card-region`, `floating-surface`, `inline-chip`, `disclosure`, `media-embed`, `progress-indicator`, `numeric-data`, `boxed-container`, `class-chip`. Members + required `--set-{member}-*` suffixes enforced by `_uniformity.test.ts`.

---

## What's shipped — showcase pages (36 of 43)

| Group                       | Pages                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Shell + chrome              | HomePage, sidebar, TOC, theme toggle, mobile drawer                                                              |
| Foundations                 | TokensPage, ThemePage, ModifiersPage, PlacementsPage                                                             |
| Elements — Interactive      | ButtonPage, AnchorPage, FormControlsPage, DetailsPage, DialogElementPage                                         |
| Elements — Content          | HeadingsPage, TypographyPage, ListsPage, TablesPage, MediaPage, FiguresPage, SectioningPage                      |
| Components                  | ArticleCardPage, AsidePage, NavPage, MenuPage, InlineAtomsPage                                                   |
| Surfaces                    | PopoverSurfacesPage, FormSurfacesPage, ScrollAndTransitionPage                                                   |
| Composables — Primitives    | UseFocusPage, UsePointerPage, UseDragDropPage, UseThemeButtonPage                                                |
| Composables — Floating      | UsePopoverPage, UseTooltipPage                                                                                   |
| Composables — Element-bound | UseMenuPage, UseDialogPage, UseAsidePage, UseTabsPage, UseDetailsPage, UseToastPage, UseSelectPage, UseTablePage |

Element pages cover the static markup contract; the matching `Use*Page` covers the JS interaction layer.

---

## Remaining work — Phase 9 (4 composable-bound pages + cross-page polish)

### 9.1 Composable pages — element-bound (4 of 12 remaining)

Each page proves the matching `use{Name}` factory's JS layer on top of the matching element page. **Per-page procedure**: _before_ authoring the demo, walk the [Native-platform redundancy checklist](contribute.md#541-native-platform-redundancy-checklist) (`contribute.md` §5.4.1) against the factory — strip dead writes, fix anti-patterns, ship the strip in the same PR as the page. Every prior page in this set surfaced at least one redundancy worth fixing.

- ⬜ **UseFormPage** — constraint-validation pipeline, `[data-form-validated]` after first submit, per-field `aria-invalid` mirror, summary error region, submit-disabled-on-invalid.
- ⬜ **UseNavPage** — scroll-spy on a long article with anchored sections; `aria-current="location"` flips as scroll position passes section boundaries.
- ⬜ **UseAlertPage** — `useAlert` open / dismiss lifecycle, transition collapse, polite vs assertive (`role="alert"` vs `role="status"`), persistence across re-mounts.
- ⬜ **UseCarouselPage** — slide nav, autoplay + pause-on-hover, touch / swipe, indicator dots, variant-tinted slides, every-axis transition lifecycle.

### 9.2 Sidebar nav adjustments (before page #15)

The current flat sidebar list works for 1–14 pages. By page #15:

- ⬜ **Group-collapsible sidebar** — `<details><summary>{group}</summary><menu>…</menu></details>` per group so the rail isn't a 42-line scroll.
- ⬜ **Keyboard nav inside the rail** — arrow keys move focus between visible items; `[` / `]` collapse / expand groups.

### 9.3 Cross-page polish (after all pages exist)

- ⬜ **Theme retune end-to-end** — pin a brand color at `:root` and walk every page; verify the cascade reaches focus rings / toasts / alerts / selections / popovers / tabs / breadcrumbs.
- ⬜ **Reduced-motion full-suite** — verify every animation + transition collapses across all 43 pages (paired-mixin coverage already enforced by the surface / component / composable / motion contracts).
- ⬜ **Forced-colors full-suite** — Windows High Contrast walkthrough (per-element coverage already enforced by [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts); this is the end-to-end visual pass).
- ⬜ **Console-clean full-suite** — boot the dev server, walk every page, capture zero Vue warns / zero Tailwind missing-source warns.

---

## Consequential learnings — patterns to keep applying

These are not just "what's done" — they are conventions that govern how future work proceeds. Every entry surfaced during a real audit / page authoring and represents a recurring trap or contract.

### Native-platform redundancy (per-composable strip discipline)

After the `createAside` strip (close latency 400 ms → 73 ms by dropping dead `[data-aside-open]` / `[data-aside-closing]` writes + the `runTransition`-before-native-call wait), every factory is audited against this checklist:

1. **Dead lifecycle attributes** — `setAttribute('data-X-{open,closing,opening,…}')` calls whose attribute is not referenced anywhere in `src/styles/`. Enforced by [`_native-redundancy.test.ts`](../tests/src/styles/_native-redundancy.test.ts) — adding a dead-attribute write to a factory fails CI. Legitimate JS-only attributes opt in via the `JS_ONLY` map.
2. **`runTransition` BEFORE the native lifecycle call** — waiting on `transitionend` and then calling `hidePopover()` inside the callback. The transition can't have started because the native call hasn't been made. Always call the native method first, THEN await.
3. **Re-implemented Escape / outside-click dismiss** when `popover="auto"` already provides it.
4. **JS-driven ARIA chrome** (`aria-modal`, `role`, `inert`) the consumer markup could declare directly.
5. **Hand-written `lockBodyScroll`** when the platform already pins the page (modal `<dialog>`, top-layer popovers).
6. **Cancellable wrappers around natively non-cancellable events** (`beforetoggle` for popover is informational only).

Strips shipped: ✅ `createTabs` (dropped `[data-tab-open]`, switched `[aria-hidden]` → `[hidden]`, dropped `runTransition` chasing a non-existent transition; factory 200 → 158 lines), ✅ `createTable` (dropped JS height tween + `[data-collapsing]` + `expansion.animate` option + `[hidden]` → `[inert]` panel toggle; ~80 lines removed; CSS `interpolate-size: allow-keywords` is now the only animation contract). Clean factories: `createButton`, `createDialog`, `createMenu`, `createPopover`, `createTooltip`, `createFocus`, `createDrag`, `createDrop`, `createPointer`, `createTheme`, `createNav`, `createDetails`, `createForm`, `createCarousel`, `createSelect`, `createToast` — verified directly. Frequently misread cases: `createDialog`'s `runTransition` IS after the native call; `createTooltip` + `createPopover` use `popover="manual"` deliberately and re-implement Escape because that's correct for those surfaces.

### Motion contract

Shared `--set-motion-{duration, timing-function}` tokens consumed by every panel-style reveal: rail drawers, `<aside popover>` offcanvas, `<dialog>` modal/non-modal, `<details>::details-content`, `[data-table-expansion-panel]`, alert open/close, summary trailing margin. The `::details-content` native animation is the reference smoothness the rest of the family matches. Enforced by `MOTION_CONTRACT_PARTIALS` + `_motion.test.ts`.

### Scrollbars (non-inherited properties)

`scrollbar-width` and `scrollbar-gutter` don't inherit. Declared on universal selector `*, *::before, *::after` so every scroll container picks them up. `scrollbar-gutter: stable` is dropped on `<html>` / `<body>` below the 480-px mobile breakpoint to keep fixed-position toasts symmetric. Sidebar `<nav>` / `<aside>` rails opt-out of stable gutter so right-edge divider lines reach the inline-end edge (extends the in-flow alert / non-modal dialog fix).

### Alert vs toast disambiguation

Alert (`<aside role="alert">`) is an in-flow banner; toast (`<output popover>`) is a top-layer transient. They share the variant palette (`bg-subtle` / `text-emphasis` / `border-subtle`) but NOT the geometry (banner fills parent; toast is corner-anchored). The `--set-alert-max-inline-size` cap was removed — alerts span their parent's content area like every other in-flow announcement.

### `--color-{variant}-on-canvas` tier

Per-variant text-on-canvas tier with per-mode `color-mix` tuning so bare variant anchors / labels clear WCAG AA against the body canvas in both themes.

### Body-shell + popover-broadcast exclusion alignment

`<dialog>` is included in the `:not(:where(aside, dialog, nav, output))` lists in `modifiers/_placements.scss` + `surfaces/_anchor-position.scss` (drawer-shaped elements with their own viewport-fixed placement geometry); alphabetized for diff stability.

### Structural pairing discipline

No element-hardcoding inside containment. A rule that combines two bare tag names with `>` (e.g. `nav > search`, `article > div`) requires an entry in `STRUCTURAL_PAIRINGS` (51-entry allowlist, `spec` / `slot` / `reset` / `context` kinds) — `_pairings.test.ts` fails any new pair without a reason. Consumer wrappers carry composed-rail patterns (`.showcase-sidebar*` in `app/browser/styles/showcase.css`); the framework provides containment, the consumer composes regions.

### Toast lifecycle — recurring fix patterns

- **State-attribute naming**: every `data-{name}-{state}` follows the documented convention; mismatch between TS constants and SCSS rules silently breaks chrome.
- **No magic-number fallbacks**: `var(--set-transition-duration, 200ms)` is a smell — `:root` always declares the token, the fallback hides a missing import.
- **`length()` parses via `parseFloat`** — `calc(...)` expressions return `NaN`. Use literal `rem` / `px` for any value the factory needs to read.
- **`background-color` overlays**: where a sticky / overlay surface paints over a scrolling region, the bg-color may be alpha-tinted; pair it with a `var(--color-canvas)` floor (or `linear-gradient` of the same tint) so the result is opaque.
- **Mobile retune via dual-inset**: anchoring `inset-inline-start` + `inset-inline-end` + `inline-size: auto` yields symmetric gutters regardless of the parent's scrollbar reservation.

### Roving-focus discipline

`focusableItems` filters to `tabIndex >= 0` so non-focusable wrappers (`<li>` carrying default `tabIndex = -1`) are skipped while still allowing intentional `<li tabindex="0">` tab-stops. Surfaced in UseMenuPage authoring; carries forward into every roving-keyboard handler.

### Composed-rail flex contract

`.showcase-sidebar-region` writes `flex: none` (= 0 0 auto) — overriding ALL three sub-properties. Partial overrides (`flex-shrink: 0` alone) leave the framework's `flex: 1 1 auto` grow / basis intact. Lesson for consumers: when overriding a drawer-body flex layout, use the shorthand or override all three.

### `<h6>` + `<menu>` rail rhythm

Uppercase eyebrow chrome on `<h6>` inside body-shell `<nav>` / `<aside>` rails; asymmetric inter-group margins; zeroed `<menu>` block margins. Pattern documented in `_menu.scss`.

### `.flat` / `.flush` modifier family (in progress — see Future work §"The `.flat` / `.flush` rollout")

The framework distinguishes two surface-dissolution idioms:

- **`.flat`** — transparent at rest, hover / focus reveal subtle backdrop, focus promotes to the element's full bordered baseline. Keeps the element's own padding + intrinsic size. Use when the element should _signal_ it's interactive on engagement.
- **`.flush`** — no margin / border / radius / ring at any state; `border-radius: inherit`; fills the host's content box on both axes (`inline-size: 100%` + `block-size: 100%` + `min-block-size: 100%` + `align-self: stretch`). Hover / focus reveals a subtle backdrop for discoverability. The HOST owns the boundary.

Shipped variants: `input.flat`, `select.flat`, `textarea.flat`, `input.flush`, `select.flush`, `textarea.flush`, `button.flush`, `ul.group.flush`, `ol.group.flush`. The remainder is the active push — see Future work §"The `.flat` / `.flush` rollout" below for the per-element matrix and authoring plan.

---

## Cross-cutting changes — recently shipped

Selected updates from the most recent push (UseTablePage v3-v5 + dl ratio fix):

- **`createTable` row-click expansion** — new `expansion.click: true | 'row' | 'caret' | false` option. Default `true` toggles on any non-interactive click inside an expandable row (mirrors `selection.click` opt-out shape). `onTableFocus` seeds the first cell when the bare `<table tabindex="0">` receives focus so the APG roving model has a starting cursor.
- **`table.sticky` modifier + opaque backdrop** — pins `<thead> > <th>` via `position: sticky` with paired `background-color: var(--color-canvas)` + `background-image` overlay so scrolling rows don't bleed through the header tint.
- **`th { position: relative }` on every header** — not just sortable headers — so resize handles anchor to the cell instead of the table coord system.
- **Row-expansion chevron** — `--set-table-expansion-icon{,-size,-gap}` tokens; chevron `::before` rotates 90° on `[data-table-expanded]`.
- **`--set-nav-pagination-font-size`** — defaults to `var(--text-sm)` so the bare `<nav aria-label="Pagination">` aligns with table density.
- **`<dl>` term:description ratio** — wide-viewport grid switched from `minmax(0, max-content) minmax(12rem, 1fr)` to `minmax(0, 1fr) minmax(0, 2fr)`. Long terms wrap inside their 1fr track instead of starving the description. Mobile (<640 px) single-column stack unchanged.
- **`table[role='grid']` excluded from universal `:focus-visible` ring** in `surfaces/_focus.scss` — the table is the focus anchor, cells are the visible target.

---

## Future work — post-Phase 9

### The `.flat` / `.flush` rollout

The framework's surface-dissolution modifier family is the active cross-cutting push. The shared style contract and per-element matrix below are the authoring guide for every remaining variant.

#### Shared style contract — `.flat`

Every `{tag}.flat` rule consumes the same shape; the element baseline is what differs.

```scss
{tag}.flat {
    background-color: transparent;
    border-color: transparent;
    box-shadow: none;

    // Hover reveal — subtle backdrop + framework neutral border.
    // Excludes disabled / readonly / invalid / focus-visible so each owns its own state.
    &:hover:not(:disabled):not([readonly]):not(:focus-visible):not(:user-invalid) {
        background-color: color-mix(in oklab, currentColor 4%, transparent);
        border-color: var(--color-border);
    }

    // Focus promotes to the element's variant focus chrome.
    &:focus-visible {
        outline: none;
        // Each element re-states its own --set-{tag}-focus-border-color
        // and --set-{tag}-focus-box-shadow + restores its background.
    }

    // Validation chain unchanged — element baseline's :user-invalid rule
    // would lose to the modifier layer; restate the danger border here.
    &:user-invalid { border-color: var(--color-danger); }

    // Forced-colors fallback so HC mode still outlines the control.
    @include forced-colors {
        background-color: Field;
        border-color: ButtonText;
    }
}
```

#### Shared style contract — `.flush`

```scss
{tag}.flush {
    margin: 0;
    border: 0;
    border-radius: inherit;
    box-shadow: none;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 100%;
    align-self: stretch;
    background-color: transparent;

    // Discoverability backdrop — visible on hover AND focus so the user
    // can SEE the engaged element (without it, a focused flush input is
    // indistinguishable from the surrounding cell content).
    &:hover:not(:disabled):not([readonly]):not(:user-invalid),
    &:focus-visible:not(:disabled):not([readonly]):not(:user-invalid) {
        background-color: color-mix(in oklab, currentColor 4%, transparent);
    }

    &:focus-visible { outline: none; }

    @include forced-colors {
        background-color: Field;
    }
}
```

Notes that apply to every flush rule:

- **`<td>` parents need `block-size: 1px` on the cell** — the legacy table-cell height trick. Without it, percentage-height children of `<td>` fall back to `auto` on every engine.
- **`border-radius: inherit`** picks up the host's curvature (cards, list-group items, expansion panels all set their own corners).
- **No own focus ring** — `outline: none` plus the discoverability backdrop is the entire focus indicator. The host surface is expected to declare a `:focus-within` ring if it wants one.
- **Flush is content-agnostic** — same shape for inputs, buttons, links, articles, media. Per-element quirks (below) are the SHAPE of the host fill, not the contract.

#### Per-element applicability matrix

Tier ordering follows authoring priority — Tier 1 is shipped, Tier 2 is highest-value next, Tier 5 is stretch.

| Element                                    | `.flat`                         | `.flush` | Notes / quirks                                                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tier 1 — shipped**                       |                                 |          |                                                                                                                                                                                                                                      |
| `input`                                    | ✅                              | ✅       | Element-baseline padding preserved on `.flush` (padding-inline only — block-axis zeroed for height-fill).                                                                                                                            |
| `select`                                   | ✅                              | ✅       | Chevron mask (`--set-select-background-image`) — flush keeps the chevron via element's own background-image cascade.                                                                                                                 |
| `textarea`                                 | ✅                              | ✅       | `resize: vertical` + `field-sizing: content` baseline preserved; flush only drops chrome.                                                                                                                                            |
| `button`                                   | ⬜ (Tier 2)                     | ✅       | Flush button: all padding zeroed (text/icon centers against host's content box).                                                                                                                                                     |
| `ul.group` / `ol.group`                    | —                               | ✅       | Predates the split; semantic aligned with the new flush family. Audit: confirm hover backdrop alignment with the new contract.                                                                                                       |
| **Tier 2 — highest value**                 |                                 |          |                                                                                                                                                                                                                                      |
| `a`                                        | ⬜                              | ⬜       | `.flat`: drop underline at rest, restore on hover. `.flush`: link fills the host (tile-as-link); drop underline + color shift, inherit foreground. Host's `:focus-within` paints focus ring.                                         |
| `details`                                  | ⬜                              | ⬜       | `.flat`: drop outer border, hover reveal, summary chrome intact. `.flush`: accordion-item shape — parent group owns the boundary, `<details>` dissolves outer chrome and shares the parent's radius. `[open]` state still indicates. |
| `aside[role='alert']`                      | ⬜                              | ⬜       | `.flat`: low-emphasis inline note that brightens on hover. `.flush`: divider band inset into a card or sidebar; drops outer border + radius.                                                                                         |
| `dialog`                                   | —                               | ⬜       | Modal at rest IS its chrome; flat doesn't apply. `.flush` scoped to `dialog[open]:not(:modal)` (inline non-modal); drops outer border + radius, keeps header / footer pin chrome.                                                    |
| `button`                                   | ⬜                              | ✅       | `.flat` for toolbar / inline action chips — overrides variant background fill at rest, restores on hover. Distinct from `.subtle` (which keeps full chrome but drops variant fill); flat dissolves the chrome entirely.              |
| **Tier 3 — container surfaces**            |                                 |          |                                                                                                                                                                                                                                      |
| `article`                                  | ⬜                              | ⬜       | `.flat`: card chrome dissolves at rest (use for nested cards). `.flush`: outer chrome entirely dropped (nested card inside another article or list-group row).                                                                       |
| `fieldset`                                 | ⬜                              | ⬜       | `.flat`: drop border at rest. `.flush`: drop all outer chrome. CAVEAT: `<legend>` notch — flush may need to suppress the legend's notch via `legend { float: left }` or similar.                                                     |
| `form`                                     | —                               | ⬜       | `.flush`: fill card body. Form's internal vertical gap stays; only outer chrome (rarely present) dropped. Most useful as documentation that the form fills its container.                                                            |
| `section`                                  | —                               | ⬜       | `.flush`: drop section padding for nested-section use (e.g. tab panel section that should butt against the tablist).                                                                                                                 |
| **Tier 4 — media / embed surfaces**        |                                 |          |                                                                                                                                                                                                                                      |
| `img`                                      | —                               | ⬜       | `.flush`: fill host slot with `object-fit: cover`; consumer sets `aspect-ratio` on the host or uses a height-1px wrapper.                                                                                                            |
| `video`                                    | —                               | ⬜       | Same as `img.flush`; framework's tinted backplate (`--set-video-background-color`) overridable per-instance.                                                                                                                         |
| `iframe`, `embed`, `object`                | —                               | ⬜       | `.flush`: fill embed slot. Aspect ratio is the consumer's responsibility.                                                                                                                                                            |
| `canvas`, `svg`                            | —                               | ⬜       | `.flush`: fill bitmap / vector slot. `svg.flush` retains `preserveAspectRatio`.                                                                                                                                                      |
| **Tier 5 — class-components + rare cases** |                                 |          |                                                                                                                                                                                                                                      |
| `.badge`, `.tag`                           | —                               | ⬜       | `.flush`: chip fills its slot (rare — usually badges sit inline). Audit need before authoring.                                                                                                                                       |
| `.spinner`, `.skeleton`                    | —                               | ⬜       | `.flush`: fills loading region (skeleton fills card body during fetch). Common use case.                                                                                                                                             |
| `.alert` (`<aside role='alert'>`)          | (same as `aside[role='alert']`) | (same)   | The `.alert` class-component IS `aside[role='alert']`; alignment audit when `aside` variant lands.                                                                                                                                   |
| `menu`, `nav`                              | —                               | ⬜       | `.flush`: fill rail. Less common; consumer usually fills via `flex: 1 1 auto` on the rail body.                                                                                                                                      |
| `label`, `legend`                          | —                               | ⬜       | `.flush`: fill card body label area. Rare but consistent.                                                                                                                                                                            |

#### Elements where neither modifier applies

For completeness — explicitly **not** in scope:

- **Pure-text elements** (`p`, `blockquote`, `code`, `kbd`, `mark`, `samp`, `small`, `strong`, `em`, `i`, `u`, `time`, `data`, `var`, etc.) — inline-flow, chrome IS the content; dissolving makes them invisible.
- **Reset elements** (`html`, `body`, `h1`–`h6`, `hr`, `ol`, `ul`, `li` outside `.group`) — no chrome to dissolve.
- **Class-only primitives without chrome** (`.dot`) — already minimal.
- **Top-layer toast** (`<output popover>`) — chrome IS the floating geometry; flush doesn't apply.
- **`<table>` itself** — table's chrome is per-cell, not per-table.

#### Button-group logic (parallel audit)

The framework's current "group" pattern lives on `<ul class="group">` / `<ol class="group">` (declared in `_ul.scss` + `_li.scss`). There's no dedicated button-group pattern (Bootstrap's `.btn-group` shape — adjacent buttons sharing borders, end-cap radius on first / last; framework currently uses `[role="group"]` declared in `components/_role-group.scss`). Audit:

- ⬜ Confirm `[role="group"]` is the canonical button-group host (it is — `components/_role-group.scss` handles overlap-border, first / last radius, vertical orientation).
- ⬜ Adjacent-border collapse uses negative `margin-inline-start` on `button + button` — same idiom as `nav[aria-label='Pagination']`. Already shipped; verify the parity.
- ⬜ Variant cascading: a single `<div role="group" class="success">` should tint every button inside. Today buttons don't inherit variant via parent context. Audit whether this is desirable (might conflict with mixed-variant button rows).

#### Authoring phases

Each phase ships:

1. SCSS rules in `modifiers/_local.scss` (extending the existing flat/flush blocks).
2. Demo on the matching element page (or a dedicated section on the appropriate Use\*Page).
3. `_local.test.ts` charter assertions land automatically as rules are added.
4. Doc updates in [modifiers.md](modifiers.md) and the affected element row in [taxonomy.md](taxonomy.md).

| Phase | Scope                                                                                 | Demo home(s)                                                           |
| ----- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A     | `ul.group.flush` / `ol.group.flush` alignment audit + hover parity                    | ListsPage `<ul class="group flush">` demo update                       |
| B     | `details.flat` / `details.flush`                                                      | DetailsPage + UseDetailsPage (accordion-item shape demo)               |
| C     | `aside.flat` / `aside.flush` (for `role='alert'`)                                     | AsidePage callout / alert variations                                   |
| D     | `dialog.flush`                                                                        | DialogElementPage + UseDialogPage (inline non-modal inset into a card) |
| E     | `a.flat` / `a.flush`                                                                  | AnchorPage tile-as-link demo + ArticleCardPage clickable-card demo     |
| F     | `button.flat`                                                                         | ButtonPage toolbar / inline-action-chip demo                           |
| G     | `article.flush` / `fieldset.flat` / `fieldset.flush` / `form.flush`                   | ArticleCardPage nested cards + FormControlsPage + FormSurfacesPage     |
| H     | Media `.flush` (`img`, `video`, `iframe`, `embed`, `object`, `canvas`, `svg`)         | MediaPage hero-image demo + FiguresPage embed-fill demo                |
| I     | Class-component alignment (`.alert.flush`, `.spinner.flush`, `.skeleton.flush`, etc.) | InlineAtomsPage loading-state demos                                    |

#### Audit deliverable

By the end of the rollout:

1. Every element in the matrix has its `.flat` / `.flush` rule declared in `modifiers/_local.scss` (or aligned to the existing precedent in its element partial, e.g. `ul.group.flush` in `_ul.scss`).
2. [modifiers.md](modifiers.md) gains a new section naming `.flat` as the "transparent-rest, full-chrome-on-engagement" family and `.flush` as the "no-chrome-ever, fuse-into-parent" family — with the shared style contracts above as the reference.
3. Each affected row in [taxonomy.md](taxonomy.md) gets a `flat` / `flush` annotation in its "Framework usage" column.
4. The `_local.test.ts` charter test stays green (taxonomy entry + non-cross-cutting name + no Tailwind collision — automatic as rules land).
5. A dedicated section on the appropriate Use\*Page or a new `FlatAndFlushPage` enumerates every variant side-by-side for visual + interaction parity.

### Token surface refinements

- ⬜ **`.disabled` modifier customizability gap** — `.disabled` currently hard-codes `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`. Expose as `--set-state-disabled-{opacity, cursor}` so consumers can retune globally at `:root` (see [patterns.md](patterns.md) §6.4 and `MODIFIER_DIMENSION_TOKENS.state.rationale`).
- ⬜ **Composable state-attribute audit** — review every `[data-{name}-*]` attribute name for consistency; document the canonical set in [composables.md](composables.md).

### Refactor opportunities

- ⬜ **Element-local modifier consolidation** — survey component partials for `{tag}.{modifier}` rules that should migrate to `modifiers/_local.scss` (e.g. `form.row` in `components/_form.scss`).
- ⬜ **Page-shell uniformity** — `_main.scss` declares minimum tokens to satisfy the page-shell group; revisit whether `main` belongs in the group or warrants its own contract.

### Floating-surface styling pass (toast + popover + tooltip + menu-popover)

The framework's floating-surface family (`<output popover>` toasts, generic `[popover]`, `[popover=hint]` tooltips, `<menu popover>` dropdowns, in-flow callouts on `<aside>`, modal chrome on `<dialog>`) already shares the same `--set-popover-*` surface tokens for fill / border / radius / shadow / transition. The per-surface chrome has accumulated without a single styling-philosophy pass to confirm:

- ⬜ **Visual language uniformity** — each floating surface paints chrome (corner radius, elevation, padding, border) that reads as one family. Verify the bare-popover, toast, tooltip, dropdown all reach for the same surface tokens (vs. each declaring its own one-off literal). Decide which differences are meaningful (toast: deck offset; tooltip: smaller padding; dropdown: row chrome) and which are accidental drift.
- ⬜ **Surface-vs-placement separation** — placement modifiers (`.top`, `.bottom-start`, etc.) live in `modifiers/_placements.scss` and apply to every `[popover]` host. Surface chrome lives in `surfaces/_popover.scss` + per-component partials. Confirm the boundary: placement modifiers should set position only (`position-area` + alignment); surfaces own background, border, shadow, radius, padding.
- ⬜ **Toast-vs-alert disambiguation across pages + guides** — audit every page + guide for language conflating the two.
- ⬜ **Tooltip + dropdown styling parity** — currently `surfaces/_popover.scss` paints `[popover]:not(:where(aside, dialog, nav))` with scale-in chrome. Verify tooltips (`[popover=hint]`) inherit cleanly without override drift, and dropdown menus (`<menu popover>`) keep their row chrome without fighting surface defaults.

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
