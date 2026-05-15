# Plan — Current Status & Next Steps

> Living checklist of where the framework stands and what remains. Read this to know **where to pick up**; read [contribute.md](contribute.md) to know **how to work**.

Status: every framework layer (tokens, theme, mixins, modifiers, elements, components, surfaces, composables) is shipped + parity-tested. **40 of 43 showcase pages are built** — every `Use*Page` in the composable catalog now ships. Remaining work is sidebar nav adjustments + cross-page polish (§9.1 / §9.2), plus a handful of post-Phase 9 audits queued under "Future work."

**Tests:** `src:browser` + `src:styles` = **5157 / 5157 pass**.

---

## At a glance

| Phase | Description                                                                | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| 0     | Repo bootstrap (deps, scripts, vite + vitest projects)                     | ✅     |
| 1     | Cascade layer order + style entry                                          | ✅     |
| 2     | Tokens (variant palette, `--set-*` namespace, theme)                       | ✅     |
| 3     | Mixins + Sass-list constants                                               | ✅     |
| 4     | Modifiers (5 dimensions × full required-token coverage + element-local)    | ✅     |
| 5     | Element baselines (94 partials; 49 substantive, 8 reset, rest passthrough) | ✅     |
| 6     | Components (18 partials; tag-rooted + class-component primitives)          | ✅     |
| 7     | Surfaces (9 partials; pseudo-element + attribute)                          | ✅     |
| 8     | Composables (20 use/create pairs + 6 chrome partials)                      | ✅     |
| 9     | Showcase pages — 40 of 43 (sidebar + polish remaining)                     | 🟡     |
| 10    | Distribution (build + pack)                                                | ✅     |
| 11    | Invariant verification (11 codified contracts)                             | ✅     |

For per-layer details see the matching spec guide: [tokens.md](tokens.md), [mixins.md](mixins.md), [modifiers.md](modifiers.md), [taxonomy.md](taxonomy.md) + [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md), [composables.md](composables.md), [patterns.md](patterns.md) (codified contracts).

---

## Showcase pages — 40 of 43 shipped

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

Every element page covers the static markup contract; the matching `Use*Page` covers the JS interaction layer.

**Authoring procedure for any new composable demo** — walk the [Native-platform redundancy checklist](contribute.md#541-native-platform-redundancy-checklist) (`contribute.md` §5.4.1) against the factory _before_ writing the page: strip dead `[data-X-*]` writes, drop redundant ARIA, fix `runTransition`-before-native-call ordering. Ship the strip in the same PR as the page.

---

## Remaining work — Phase 9

### 9.1 Sidebar nav adjustments (before page #43)

The flat sidebar list works for 14 pages; with 40+ it's a 42-line scroll.

- ⬜ **Group-collapsible sidebar** — `<details><summary>{group}</summary><menu>…</menu></details>` per group so the rail isn't a 42-line scroll.
- ⬜ **Keyboard nav inside the rail** — arrow keys move focus between visible items; `[` / `]` collapse / expand groups.

### 9.2 Cross-page polish (after all pages exist)

- ⬜ **Theme retune end-to-end** — pin a brand color at `:root` and walk every page; verify the cascade reaches focus rings / toasts / alerts / selections / popovers / tabs / breadcrumbs.
- ⬜ **Reduced-motion full-suite** — verify every animation + transition collapses across all 43 pages (paired-mixin coverage already enforced by the surface / component / composable / motion contracts).
- ⬜ **Forced-colors full-suite** — Windows High Contrast walkthrough (per-element coverage already enforced by [`interactive.test.ts`](../tests/guides/patterns.test.ts); this is the end-to-end visual pass).
- ⬜ **Console-clean full-suite** — boot the dev server, walk every page, capture zero Vue warns / zero Tailwind missing-source warns.

---

## Future work — post-Phase 9

### Token surface refinements

- ⬜ **`.disabled` modifier customizability gap** — `.disabled` hard-codes `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`. Expose as `--set-state-disabled-{opacity, cursor}` so consumers can retune globally at `:root` (see [patterns.md](patterns.md) §6.4 and `MODIFIER_DIMENSION_TOKENS.state.rationale`).
- ⬜ **Composable state-attribute audit** — review every `[data-{name}-*]` attribute name for consistency; document the canonical set in [composables.md](composables.md).

### Refactor opportunities

- ⬜ **Element-local modifier consolidation** — survey component partials for `{tag}.{modifier}` rules that should migrate to `modifiers/_local.scss` (e.g. `form.row` in `components/_form.scss`).
- ⬜ **Page-shell uniformity** — `_main.scss` declares minimum tokens to satisfy the page-shell group; revisit whether `main` belongs in the group or warrants its own contract.
- ⬜ **`role-group` variant cascading** — `<div role="group" class="success">` currently does NOT tint child buttons. Audit whether parent-variant-context cascade is desirable (may conflict with mixed-variant button rows).

### Floating-surface styling pass

The framework's floating-surface family (`<output popover>` toasts, generic `[popover]`, `[popover=hint]` tooltips, `<menu popover>` dropdowns) shares `--set-popover-*` surface tokens but has accumulated per-surface chrome without a single styling-philosophy pass:

- ⬜ **Visual language uniformity** — verify bare-popover, toast, tooltip, dropdown all reach for the same surface tokens (vs. each declaring its own one-off literal). Decide which differences are meaningful (toast: deck offset; tooltip: smaller padding; dropdown: row chrome) and which are accidental drift.
- ⬜ **Surface-vs-placement separation** — confirm placement modifiers (`modifiers/_placements.scss`) set position only (`position-area` + alignment); surfaces (`surfaces/_popover.scss` + per-component partials) own background / border / shadow / radius / padding.
- ⬜ **Toast-vs-alert disambiguation across pages + guides** — audit every page + guide for language conflating the two.
- ⬜ **Tooltip + dropdown styling parity** — verify tooltips (`[popover=hint]`) inherit cleanly without override drift; dropdown menus (`<menu popover>`) keep row chrome without fighting surface defaults.

Outcome: one styling philosophy across every floating surface, codified in [surfaces.md](surfaces.md) § "Floating surface family" and enforced by a parity test asserting each surface declares the canonical token superset.

### Cross-cutting

- ⬜ **README consumer-setup snippet** — finalise the public-facing README with install / cascade-layer-order / token-override examples.
- ⬜ **Changelog discipline** — adopt conventional commits or similar so the next release pulls a clean delta.

---

## Conventions to keep applying

These patterns surfaced during real audits and govern how new work proceeds. Each is documented in the spec guide listed alongside — refresh memory there before doing parallel work in the same area.

- **Native-platform redundancy** — every `create{Name}` factory walks the checklist in [contribute.md §5.4.1](contribute.md) before its showcase page ships. Dead `[data-X-*]` writes are caught by [`redundancy.test.ts`](../tests/guides/composables.test.ts).
- **Motion contract** — shared `--set-motion-{duration, timing-function}` tokens for panel reveals; per-element custom durations (e.g. `--set-carousel-transition-duration` for slide-axis translateX) only when motion is substantial. Small UI tints route through the global 150 ms `--set-transition-duration`. Enforced by `MOTION_CONTRACT_PARTIALS` + [`motion.test.ts`](../tests/guides/tokens.test.ts). See [patterns.md](patterns.md) §10.
- **AGENTS.md §4.1 Single-Word Principle** — entity-scoped names (interface fields, option keys, event-detail keys) are single words; compound concepts split into nested entity keys (§4.2.1). Recent example: `withIndicators` → `indicators`; `additionalTokenPrefixes` → `tokens.extras`; `fromIndices` / `toIndex` → `from` / `to`.
- **Structural pairing discipline** — every bare-tag `>` combinator pair in framework SCSS requires an entry in `STRUCTURAL_PAIRINGS` (`spec` / `slot` / `reset` / `context` kinds). Enforced by [`pairings.test.ts`](../tests/guides/patterns.test.ts). See [patterns.md](patterns.md) §12.
- **Inline-style triage rule** — no `style="..."` for layout or chrome in `app/browser/pages/`. Reactive `:style` bindings, single-property dimensional one-offs, and intentional token demonstrations are the only legitimate inline cases. Codified in [contribute.md](contribute.md) §6.4.
- **Spacing-shape family** — `div.stack` (gap > 0), `div.cluster` (wrap + gap > 0), `div.frame` (gap = 0, padding = 0, overflow clip). Element-local `article.frame` and `td.frame` retune `--set-{tag}-*` tokens so descendant chrome (header bleed margins, list-group edge math) collapses alongside the padding. Documented in [modifiers.md](modifiers.md) §9.
- **Surface dissolution family** (`.flat` / `.flush`) — `.flat`: transparent at rest, hover reveal, focus promotes to the element's bordered baseline. `.flush`: no margin / border / radius / ring; fills host's content box. Pairs with `.frame` host (`article.frame > .flush`, `td.frame > .flush`). Per-element applicability matrix in [modifiers.md](modifiers.md) §9 + per-element rows in [taxonomy.md](taxonomy.md).
- **WAI-ARIA carousel pattern** — indicators live as `<menu role="tablist"> > <li> > <button role="tab" aria-selected="true|false">`. The framework chrome reads `[aria-selected='true']` to paint the active pill-stretch. Indicator transitions route through `--set-transition-duration` (150 ms UI-tint), NOT `--set-carousel-transition-duration` (600 ms slide-axis). Indicator mid-transition class cleanup in `cancelTransition()` keeps stale `carousel-item-{next,prev,start,end}` off cancelled targets after rapid `to()` skips.

---

## Reference

- [contribute.md](contribute.md) — workflow for humans + agents (how to add an element, modifier, composable, showcase page).
- [patterns.md](patterns.md) — per-folder structural contracts + scope discipline + the 11 codified contract registries.
- [taxonomy.md](taxonomy.md) — every native HTML element + framework treatment + the 12 token-uniformity groups.
- [AGENTS.md](../AGENTS.md) — codified conventions (naming, typing, Sass / SCSS rules).
- Per-layer specs: [styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [composables.md](composables.md), [surfaces.md](surfaces.md).
