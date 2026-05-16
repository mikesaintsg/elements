# Plan — Current Status & Next Steps

> Living checklist of where the framework stands and what remains. Read this to know **where to pick up**; read [contribute.md](guides/contribute.md) to know **how to work**.

Status: every framework layer (tokens, theme, mixins, modifiers, elements, components, surfaces, composables) is shipped + parity-tested. **All 43 showcase pages are built AND parity-tested** — the `tests/app/browser/` showcase suite shipped (a clean total page↔route↔barrel↔test bijection, the consolidated up/down-stream `parity.test.ts` driver, 43 per-page bespoke parity files asserting against the mounted Chromium DOM, and the §9 composable API-name guard that prevents the showcase silently rotting against `src/`). §9.1 (sidebar nav adjustments — collapsible groups, in-rail keyboard nav, per-page glyphs) is **complete**, and §9.2's **console-clean full-suite** passed (all 43 routes walked live — zero Vue/runtime/Vite/Tailwind warnings). The only remaining Phase-9 work is the **three human visual passes** (§9.2 — theme-retune / reduced-motion / forced-colors; mechanisms already enforced by contracts, these are the end-to-end eyeball confirmations), plus the post-Phase-9 audits queued under "Future work."

**Tests:** full suite **145 files / 7049 tests pass** across every project (`src:core` / `src:browser` / `src:styles` / `app:core` / `app:browser` / `guides`); `npm run check` 0/0. The showcase parity contract is codified in [`guides/showcase.md`](guides/showcase.md) §Contract / §Tests.

---

## At a glance

| Phase | Description                                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| 0     | Repo bootstrap (deps, scripts, vite + vitest projects)                                                              | ✅     |
| 1     | Cascade layer order + style entry                                                                                   | ✅     |
| 2     | Tokens (variant palette, `--set-*` namespace, theme)                                                                | ✅     |
| 3     | Mixins + Sass-list constants                                                                                        | ✅     |
| 4     | Modifiers (5 dimensions × full required-token coverage + element-local)                                             | ✅     |
| 5     | Element baselines (94 partials; 49 substantive, 8 reset, rest passthrough)                                          | ✅     |
| 6     | Components (18 partials; tag-rooted + class-component primitives)                                                   | ✅     |
| 7     | Surfaces (9 partials; pseudo-element + attribute)                                                                   | ✅     |
| 8     | Composables (20 use/create pairs + 6 chrome partials)                                                               | ✅     |
| 9     | Showcase pages — 43/43 built + parity-tested; §9.1 sidebar + §9.2 console-clean done (3 human visual passes remain) | 🟡     |
| 10    | Distribution (build + pack)                                                                                         | ✅     |
| 11    | Invariant verification (11 codified contracts)                                                                      | ✅     |

For per-layer details see the matching spec guide: [tokens.md](guides/tokens.md), [mixins.md](guides/mixins.md), [modifiers.md](guides/modifiers.md), [elements.md](guides/elements.md), [components.md](guides/components.md), [surfaces.md](guides/surfaces.md), [composables.md](guides/composables.md), [patterns.md](guides/patterns.md) (codified contracts).

---

## Showcase pages — 43 of 43 shipped + parity-tested

| Group                       | Pages                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shell + chrome              | HomePage, sidebar, TOC, theme toggle, mobile drawer                                                                                                                      |
| Foundations                 | TokensPage, ThemePage, ModifiersPage, PlacementsPage                                                                                                                     |
| Elements — Interactive      | ButtonPage, AnchorPage, FormControlsPage, DetailsPage, DialogElementPage                                                                                                 |
| Elements — Content          | HeadingsPage, TypographyPage, ListsPage, TablesPage, MediaPage, FiguresPage, SectioningPage                                                                              |
| Components                  | ArticleCardPage, AsidePage, NavPage, MenuPage, InlineAtomsPage                                                                                                           |
| Surfaces                    | PopoverSurfacesPage, FormSurfacesPage, ScrollAndTransitionPage                                                                                                           |
| Composables — Primitives    | UseFocusPage, UsePointerPage, UseDragDropPage, UseThemeButtonPage                                                                                                        |
| Composables — Floating      | UsePopoverPage, UseTooltipPage                                                                                                                                           |
| Composables — Element-bound | UseMenuPage, UseDialogPage, UseAsidePage, UseTabsPage, UseDetailsPage, UseToastPage, UseSelectPage, UseTablePage, UseFormPage, UseNavPage, UseAlertPage, UseCarouselPage |

Every element page covers the static markup contract; the matching `Use*Page` covers the JS interaction layer. Every page is mounted in real Chromium by its `tests/app/browser/pages/{X}Page.test.ts` and asserted against the rendered DOM; `pages.test.ts` holds the total bijection; `parity.test.ts` proves the showcase stays in lock-step with `src/browser` / `src/styles` / the guides.

**Authoring procedure for any new composable demo** — walk the [Native-platform redundancy checklist](guides/contribute.md#541-native-platform-redundancy-checklist) (`contribute.md` §5.4.1) against the factory _before_ writing the page: strip dead `[data-X-*]` writes, drop redundant ARIA, fix `runTransition`-before-native-call ordering. Ship the strip in the same PR as the page.

---

## Remaining work — Phase 9

### 9.1 Sidebar nav adjustments

The flat sidebar list worked for 14 pages; with all 43 it was a 42-line scroll — the group-collapsible rail (below) solved it.

- ✅ **Group-collapsible sidebar** — every `RouteGroup` wraps in `<details class="flush" open><summary><h6>{group}</h6></summary><menu>…</menu></details>`. `App.vue` auto-expands the active route's group on navigation but never auto-collapses user-collapsed groups elsewhere. Inter-group dividers + open-state h6 contrast painted via `app/browser/styles/showcase.css`. Codified in [`guides/showcase.md`](guides/showcase.md).
- ✅ **Keyboard nav inside the rail** — `App.vue`'s `onRailKeydown` (a rail-scoped `@keydown`, never a document handler, so it never fights the filter input) builds an ordered focus model — each group's `<summary>`, then that group's links when open. Arrow Up/Down walk the rows (clamped, no wrap); `[` collapses / `]` expands the group owning the focused row, pulling focus back to the summary on collapse so the rail stays walkable. Setting `details.open` rides the existing native-`toggle` → `onGroupToggle` sync so the controlled state stays coherent.
- ✅ **Per-page sidebar glyphs** — every rail link carries a custom, visually-descriptive icon (`<i class="icon showcase-nav-icon">`). Authored exactly the way the framework authors its `--set-icon-*` tokens (16×16 outline SVG, `currentColor`, data-URI) but namespaced `.showcase-*` and `[href]`-keyed in `app/browser/styles/showcase.css` — page files carry only classes (no inline `style`), and a per-page icon set is documentation chrome the framework deliberately doesn't ship. The active page's glyph reads at full opacity alongside the `aria-current="page"` row treatment.

### 9.2 Cross-page polish (after all pages exist)

- ✅ **Console-clean full-suite** — walked all 43 routes live on the dev server (hash-driving every page mount): **zero** `console.error`/`warn`, zero uncaught errors, empty browser console buffer, zero dev-server (Vite/Tailwind) warnings. Automated, repeatable via the preview harness.
- ⬜ **Theme retune end-to-end** — _human visual pass._ Pin a brand color at `:root` and walk every page; verify the cascade reaches focus rings / toasts / alerts / selections / popovers / tabs / breadcrumbs. (Mechanism auto-verified: a `:root` `--color-primary` override resolves and the `--set-*` → variant cascade is enforced by `tokens.test.ts` + the variant-cascade contracts — this item is the _visual_ end-to-end confirmation.)
- ⬜ **Reduced-motion full-suite** — _human visual pass._ Verify every animation + transition collapses across all 43 pages (paired-mixin coverage already enforced by the surface / component / composable / motion contracts — this is the visual confirmation).
- ⬜ **Forced-colors full-suite** — _human visual pass._ Windows High Contrast walkthrough (per-element coverage already enforced by [`patterns.test.ts`](tests/guides/patterns.test.ts) § interactive; this is the end-to-end visual pass).

---

## Future work — post-Phase 9

### Completed (post-Phase-9 refinements)

- ✅ **`.disabled` token customizability** — `.disabled` reads `--set-state-disabled-opacity` / `--set-state-disabled-cursor` (`:root`-retunable; `pointer-events: none` stays the hard interaction lock). Wired through `_tokens.scss` → `_states.scss` → TS `tokens.state` → `MODIFIER_DIMENSION_TOKENS.state` → [patterns.md](guides/patterns.md) §6.4 + [modifiers.md](guides/modifiers.md). Browser-verified; runtime + registry parity tests added.
- ✅ **Composable state-attribute audit** — surface confirmed already consistent (no drift; `createTabs` uses native `role`/`aria`, the old `data-tab-open`/`data-aside-closing` regressions stay fixed). Canonical set (state / structural / config / framework-global / native-generic) documented in [composables.md](guides/composables.md) § State-attribute scheme + **Contract 8**, and codified as a standing `composables.test.ts` parity test: every framework `data-*` is `data-{factory-stem}-…` or a rationale'd allow-list exception (`data-theme` scopes via `createTheme`; `data-elements-scroll-locked` + native/content generics allow-listed).
- ✅ **Element-local modifier consolidation** — surveyed every `{tag}.{modifier}` rule in `components/` + `elements/`; the `.flat`/`.flush`/`.frame`/`group`/striped-table/etc. surfaces are correctly-placed component/element chrome (stay). The two thin charter-canonical element-local modifiers — `form.row` and `button.dropdown` — migrated into `modifiers/_local.scss` (declarations unchanged; cascade layer components/elements → modifiers, the charter's explicit intent). `--set-form-row-gap` / `--set-button-dropdown-caret-*` token surfaces stay on the bare element; `_local.scss` consumes them. `integration.test.ts` `mustFind` corrected (`.row` is now the element-scoped `form.row`, intentionally not a bare-name token); doc rot fixed in modifiers.md ×2 / components.md / `_local.scss` header. Browser-verified (form.row flips + intrinsic-width inputs; caret paints + rotates to 180° on `[aria-expanded]`).
- ✅ **README consumer-setup snippet** — root `README.md` finalised: fixed two doc bugs (`.ghost` is not a framework style — only `subtle`/`filled`; `useDialog`'s option is `modal: boolean`, not `mode: 'modal'`) and added the signature **`--set-*` token-override** section (global `:root` retune + scoped/per-instance override, using real shipped tokens incl. the new `--set-state-disabled-opacity` + relocated `--set-form-row-gap`). Install / cascade-layer-order / PostCSS sections were already accurate. (Root README is not parity-tested; `tests/guides/README.test.ts` targets `guides/README.md`.)
- ✅ **Floating-surface styling pass** — audited bare `[popover]` / non-modal `<dialog>` / `<menu popover>` dropdown / `<aside·nav popover>` drawer / `[popover=hint]` tooltip / `output[popover]` toast. One philosophy confirmed: `--set-popover-*` is the canonical panel; exactly three deliberate deviations — `--set-popover-hint-*` (tooltip), `--set-toast-*` (toast = distinct banner/deck surface), dropdown (inherits panel + adds row layout only). Surface≠placement separation already clean (`_placements.scss` / `_anchor-position.scss` carry zero paint). Codified in [surfaces.md](guides/surfaces.md) § "Floating surface family"; fixed the one stale claim (`_output.scss` comment said toast padding/radius/shadow came from popover defaults — it uses its own `--set-toast-*`); added a standing parity test (`surfaces/_index.test.ts § placement layers carry position only`) enforcing the separation forever.
- ✅ **Page-shell uniformity** — resolved: `<main>` **belongs** in the `page-shell` group as the CONTENT slot. The group is a uniform shell-theming vocabulary — every body-grid slot exposes the same `--set-{tag}-{color,background-color,padding-inline,padding-block}` API so a consumer themes the whole shell with one knob-set. `<main>`'s tokens are meaningful (padding = fluid content gutter + page rhythm; color/bg = opt-in tinted-well hook, see-through `currentColor`/`transparent` defaults vs the bands/rails' component-layer backplate), not a no-op-to-satisfy shim. Splitting `main` into its own contract was considered and rejected (fragments the one-vocabulary consumer API for no gain). Rationale codified in `taxonomy.ts § TOKEN_GROUPS.page-shell`, `_main.scss`, and [elements.md](guides/elements.md) (the `<main>` row + the token-group table note). No contract split / no new test — the group is already enforced by `tests/guides/elements.test.ts`.

### Refactor opportunities
- ⬜ **`role-group` variant cascading** — `<div role="group" class="success">` currently does NOT tint child buttons. Audit whether parent-variant-context cascade is desirable (may conflict with mixed-variant button rows).

### Cross-cutting

- ⬜ **Changelog discipline** — adopt conventional commits or similar so the next release pulls a clean delta.

---

## Conventions to keep applying

These patterns surfaced during real audits and govern how new work proceeds. Each is documented in the spec guide listed alongside — refresh memory there before doing parallel work in the same area.

- **Native-platform redundancy** — every `create{Name}` factory walks the checklist in [contribute.md §5.4.1](guides/contribute.md) before its showcase page ships. Dead `[data-X-*]` writes are caught by [`composables.test.ts`](tests/guides/composables.test.ts) § JS↔CSS.
- **Motion contract** — shared `--set-motion-{duration, timing-function}` tokens for panel reveals; per-element custom durations (e.g. `--set-carousel-transition-duration` for slide-axis translateX) only when motion is substantial. Small UI tints route through the global 150 ms `--set-transition-duration`. Enforced by `MOTION_CONTRACT_PARTIALS` + [`tokens.test.ts`](tests/guides/tokens.test.ts) § motion. See [patterns.md](guides/patterns.md) §10.
- **AGENTS.md §4.1 Single-Word Principle** — entity-scoped names (interface fields, option keys, event-detail keys) are single words; compound concepts split into nested entity keys (§4.2.1). Recent example: `withIndicators` → `indicators`; `additionalTokenPrefixes` → `tokens.extras`; `fromIndices` / `toIndex` → `from` / `to`.
- **Structural pairing discipline** — every bare-tag `>` combinator pair in framework SCSS requires an entry in `STRUCTURAL_PAIRINGS` (`spec` / `slot` / `reset` / `context` kinds). Enforced by [`patterns.test.ts`](tests/guides/patterns.test.ts) § pairings. See [patterns.md](guides/patterns.md) §12.
- **Inline-style triage rule** — no `style="..."` for layout or chrome in `app/browser/pages/`. Reactive `:style` bindings, single-property dimensional one-offs, and intentional token demonstrations are the only legitimate inline cases. Codified in [contribute.md](guides/contribute.md) §6.4.
- **Spacing-shape family** — `div.stack` (gap > 0), `div.cluster` (wrap + gap > 0), `div.frame` (gap = 0, padding = 0, overflow clip). Element-local `article.frame` and `td.frame` retune `--set-{tag}-*` tokens so descendant chrome (header bleed margins, list-group edge math) collapses alongside the padding. Documented in [modifiers.md](guides/modifiers.md) §9.
- **Surface dissolution family** (`.flat` / `.flush`) — `.flat`: transparent at rest, hover reveal, focus promotes to the element's bordered baseline. `.flush`: no margin / border / radius / ring; fills host's content box. Pairs with `.frame` host (`article.frame > .flush`, `td.frame > .flush`). Per-element applicability matrix in [modifiers.md](guides/modifiers.md) §9 + per-element rows in [elements.md](guides/elements.md).
- **WAI-ARIA carousel pattern** — indicators live as `<menu role="tablist"> > <li> > <button role="tab" aria-selected="true|false">`. The framework chrome reads `[aria-selected='true']` to paint the active pill-stretch. Indicator transitions route through `--set-transition-duration` (150 ms UI-tint), NOT `--set-carousel-transition-duration` (600 ms slide-axis). Indicator mid-transition class cleanup in `cancelTransition()` keeps stale `carousel-item-{next,prev,start,end}` off cancelled targets after rapid `to()` skips.

---

## Reference

- [contribute.md](guides/contribute.md) — workflow for humans + agents (how to add an element, modifier, composable, showcase page).
- [patterns.md](guides/patterns.md) — per-folder structural contracts + scope discipline + the 11 codified contract registries.
- [AGENTS.md](AGENTS.md) — codified conventions (naming, typing, Sass / SCSS rules).
- Per-layer specs: [styles.md](guides/styles.md), [tokens.md](guides/tokens.md), [modifiers.md](guides/modifiers.md), [mixins.md](guides/mixins.md), [elements.md](guides/elements.md), [components.md](guides/components.md), [composables.md](guides/composables.md), [surfaces.md](guides/surfaces.md).
