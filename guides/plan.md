# Plan — Current Status & Next Steps

> Living checklist of where the framework stands and what remains. Read this to know **where to pick up**; read [contribute.md](contribute.md) to know **how to work**.

Status of every layer is recorded below. Sections marked ✅ are fully shipped (with parity tests); 🟡 are partially shipped; ⬜ are queued. The Phase 9 showcase page roster is the bulk of remaining work.

---

## At a glance

| Phase | Description | Status |
| --- | --- | --- |
| 0 | Repo bootstrap (deps, scripts, vite + vitest projects) | ✅ |
| 1 | Cascade layer order + style entry | ✅ |
| 2 | Tokens (variant palette, `--set-*` namespace, theme) | ✅ |
| 3 | Mixins + Sass-list constants | ✅ |
| 4 | Modifiers (5 dimensions × full required-token coverage) | ✅ |
| 5 | Element baselines (94 partials; 49 substantive, 8 reset, rest passthrough) | ✅ |
| 6 | Components (19 partials; tag-rooted + class-component primitives) | ✅ |
| 7 | Surfaces (9 partials; pseudo-element + attribute) | ✅ |
| 8 | Composables (20 use/create pairs + 6 chrome partials) | ✅ |
| 9 | Showcase pages | 🟡 |
| 10 | Distribution (build + pack) | ✅ |
| 11 | Invariant verification | ✅ |
| **Audit** | **5-folder file-by-file audit + 8 codified contracts + parity tests** | ✅ |

**Tests:** `src:browser` 1210/1210 · `src:styles` 3646/3646 · total **4856/4856 pass**.

---

## What's shipped — the audit phase outputs

The 5-folder audit (elements → modifiers → surfaces → components → composables) landed a codified contract surface in [`src/browser/patterns.ts`](../src/browser/patterns.ts) + [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts), enforced by 9 parity tests:

| Contract | Source | Test |
| --- | --- | --- |
| Folder structural | `FOLDER_CONTRACTS`, `FILE_EXCEPTIONS` | [`_contracts.test.ts`](../tests/src/styles/_contracts.test.ts) |
| HTML taxonomy | `taxonomy`, `TAXONOMY_BY_TAG`, `TOKEN_GROUPS` | [`_taxonomy.test.ts`](../tests/src/styles/_taxonomy.test.ts), [`browser/taxonomy.test.ts`](../tests/src/browser/taxonomy.test.ts) |
| Interactive elements | `INTERACTIVE_ELEMENTS`, `FORCED_COLORS_INCLUDE_REGEX`, `hasBareFocusRule` | [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts) |
| Scope discipline | `hasChainedTagNots`, `hasScopingFunction` | [`_scope.test.ts`](../tests/src/styles/_scope.test.ts) |
| Modifier dimensions | `MODIFIER_DIMENSION_TOKENS` | [`_dimensions.test.ts`](../tests/src/styles/_dimensions.test.ts) |
| Surface contracts | `SURFACE_CONTRACTS` | [`_surfaces.test.ts`](../tests/src/styles/_surfaces.test.ts) |
| Component contracts | `COMPONENT_CONTRACTS` | [`_components.test.ts`](../tests/src/styles/_components.test.ts) |
| Composable contracts | `COMPOSABLE_CONTRACTS` | [`_composables.test.ts`](../tests/src/styles/_composables.test.ts) |
| TS shape | (the registries themselves) | [`browser/patterns.test.ts`](../tests/src/browser/patterns.test.ts) |

Every new SCSS partial added under `src/styles/` is held to **eight contracts** before it can merge. See [`patterns.md`](patterns.md) for the prose explanation of each.

---

## Remaining work

### 9.1 Foundation pages (4)

The page roster opens with four pages that document the framework's primitives. These are the highest-leverage pages because every other page references them.

- ⬜ **TokensPage** — every `--set-*` leaf surfaced with its live computed value; retune playground (consumer pins `--set-border-radius: 0` and watches every rounded surface flatten); icon registry preview; elevation scale (`--set-box-shadow-small / -base / -large`).
- ⬜ **ThemePage** — light / dark / system, brand retune (`--color-primary` slider drives variant cascade across every surface on the page), inverted tier, surface / text / border tier demonstration, subtle / emphasis / border-subtle / on-canvas tiers per variant.
- ⬜ **ModifiersPage** — variant × size × style × state × placement cascade demonstration. Single shared markup, 16+ rendered permutations.
- ⬜ **PlacementsPage** — popover anchor positioning live (`.top`, `.bottom`, `.start`, `.end`, plus corners), `position-try-fallbacks` flip demo, viewport-clamp behaviour. Cross-refs the flattened `:not(:where(...))` scope-discipline rule (see [`patterns.md`](patterns.md) §5).

### 9.2 Composable pages — element-bound (12)

- ⬜ **UseMenuPage** — `<menu popover>` panel + toggle, arrow-key roving, Home / End, click-outside dismiss.
- ⬜ **UseDialogPage** — modal vs non-modal, every dismissal path (Esc, backdrop, programmatic), `'static'` mode (no backdrop dismiss), scrollable + fullscreen modifiers, non-modal scroll-lock.
- ⬜ **UseAsidePage** — drawer mode (`<aside popover="manual">`) at every edge (`.start`, `.end`, `.top`, `.bottom`), backdrop dismiss, `[data-aside-closing]` lifecycle exposed.
- ⬜ **UseDetailsPage** — programmatic open / close synced with native `toggle`, animated height, group accordion (one-open-at-a-time pattern).
- ⬜ **UseToastPage** — linear stack (default), Sonner-deck mode (`[data-toast-stack]`), auto-hide timer + pause-on-hover, swipe-to-dismiss, variant tinting, hidden-overflow indicator.
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
- ⬜ **Reduced-motion full-suite** — verify every animation + transition collapses across all 42 pages (paired-mixin coverage already enforced by the surface / component / composable contracts).
- ⬜ **Forced-colors full-suite** — Windows High Contrast walkthrough (per-element coverage already enforced by [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts); this is the end-to-end visual pass).
- ⬜ **Console-clean full-suite** — boot the dev server, walk every page, capture zero Vue warns / zero Tailwind missing-source warns.

---

## What's shipped — Phase 9 to date

26 of 42 pages built. Each page passes the per-page rubric in [contribute.md §6](contribute.md#6-authoring-a-showcase-page).

| Group | Pages |
| --- | --- |
| Shell + chrome | sidebar, TOC, theme toggle, mobile drawer (with edge-aware close + drawer-header parity) |
| Elements — Interactive | ButtonPage, AnchorPage, FormControlsPage, DetailsPage, DialogElementPage |
| Elements — Content | HeadingsPage, TypographyPage, ListsPage, TablesPage, MediaPage, FiguresPage, SectioningPage |
| Components | ArticleCardPage, AsidePage, NavPage, MenuPage, InlineAtomsPage |
| Surfaces | PopoverSurfacesPage, FormSurfacesPage, ScrollAndTransitionPage |
| Composables — Primitives | UseFocusPage, UsePointerPage, UseDragDropPage, UseThemeButtonPage |
| Composables — Floating | UsePopoverPage, UseTooltipPage |

Cross-cutting framework changes surfaced and resolved during page authoring (selected):

- **`--color-{variant}-on-canvas` tier** — added per-variant text-on-canvas tier with per-mode `color-mix` tuning so bare variant anchors / labels clear WCAG AA against the body canvas in both themes.
- **Alert / toast / popover taxonomy** — clarified the IN-FLOW (alerts, callouts) vs TOP-LAYER (popovers, toasts) split; documented in [components.md](components.md).
- **Body-shell motion contract** — shared `--set-motion-{duration, timing-function}` tokens consumed by every panel-style reveal: rail drawers + `<aside popover>` offcanvas + `<dialog>` modal/non-modal + `<details>::details-content` + table row expansion.
- **`button.dropdown` opt-in caret** — caret affordance moved from "every `button[popovertarget]`" to a deliberate `.dropdown` opt-in, with rotation gated on `[aria-expanded='true']`.
- **List-group cascade ordering** — `.active` now follows the variant tint rules in `_li.scss` so `<li class="success active">` paints the saturated identity fill (active wins) rather than the subtle tint.
- **Scrollbars Module L1 inheritance gap** — `scrollbar-width` and `scrollbar-gutter` don't inherit; moved to universal selector `*, *::before, *::after` so the non-inherited properties land on every scroll container.

---

## Future work (post-Phase 9)

Identified but not started. Open the matching contribute.md workflow when picking one up.

### Token surface refinements

- ⬜ **`.disabled` modifier customizability gap** — `.disabled` currently hard-codes `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`. Expose as `--set-state-disabled-{opacity, cursor}` so consumers can retune globally at `:root` (see [`patterns.md`](patterns.md) §6.4 and `MODIFIER_DIMENSION_TOKENS.state.rationale`).
- ⬜ **Composable state-attribute audit** — review every `[data-{name}-*]` attribute name for consistency; document the canonical set in [composables.md](composables.md).

### Refactor opportunities

- ⬜ **Element-local modifier consolidation** — survey component partials for `{tag}.{modifier}` rules that should migrate to `modifiers/_local.scss` (e.g. `form.row` in `components/_form.scss`).
- ⬜ **Page-shell uniformity** — `_main.scss` declares minimum tokens to satisfy the page-shell group; revisit whether `main` belongs in the group or warrants its own contract.

### Cross-cutting

- ⬜ **README consumer-setup snippet** — finalise the public-facing README with install / cascade-layer-order / token-override examples.
- ⬜ **Changelog discipline** — adopt conventional commits or similar so the next release pulls a clean delta.

---

## Reference

- [`contribute.md`](contribute.md) — the workflow for humans + agents (how to add an element, modifier, composable, showcase page).
- [`patterns.md`](patterns.md) — per-folder structural contracts + scope discipline + the 8 codified contract registries.
- [`taxonomy.md`](taxonomy.md) — every native HTML element + the framework's treatment of it.
- [`AGENTS.md`](../AGENTS.md) — codified conventions (naming, typing, Sass / SCSS rules).
- [`styles.md`](styles.md), [`tokens.md`](tokens.md), [`modifiers.md`](modifiers.md), [`mixins.md`](mixins.md), [`elements.md`](elements.md), [`components.md`](components.md), [`composables.md`](composables.md), [`surfaces.md`](surfaces.md) — the per-layer specs.
