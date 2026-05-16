# Index

> The pointer file. A map of every authored file in the repository — by concept (group related files across `src/` + `src/styles/` + `tests/` + `app/` + `guides/`) and by directory (quick lookup per folder). Read this once to build a mental model; follow links for depth. Companion docs: [AGENTS.md](../AGENTS.md) (rules), [contribute.md](contribute.md) (workflow), [ROADMAP.md](../ROADMAP.md) (current roster).

---

## How this repository is organized

- **The framework ships in two halves that mirror each other.** A SCSS bundle under [`src/styles/`](../src/styles/) and a TypeScript public API under [`src/browser/`](../src/browser/). Every CSS identifier consumers reach for has a TS leaf; bidirectional parity is enforced by tests under [`tests/src/`](../tests/src/).
- **The documentation under [`guides/`](../guides/) is the third pillar.** Each guide carries the spec for a concept. Parity tests under [`tests/guides/`](../tests/guides/) keep doc claims aligned with what ships.
- **The showcase under [`app/browser/`](../app/browser/) is the living-documentation layer.** Every spec'd surface has a page in [`app/browser/pages/`](../app/browser/pages/) that demonstrates it.
- **Tests sit alongside source by topic.** Style tests under [`tests/src/styles/`](../tests/src/styles/) mirror the SCSS folder layout; browser tests under [`tests/src/browser/`](../tests/src/browser/) mirror the TS folder layout; guide-parity tests under [`tests/guides/`](../tests/guides/) mirror `guides/`.

---

## By concept

Cross-folder bundles. Each concept ties together its spec doc, TS source, SCSS source, tests, and showcase page.

### Tokens — the customization surface

The `--set-*` namespace is the framework's public theming contract. Renaming or removing a token is a breaking change.

| Role                                    | File                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Spec                                    | [`guides/tokens.md`](tokens.md)                                                                                |
| SCSS source                             | [`src/styles/_tokens.scss`](../src/styles/_tokens.scss), [`src/styles/_theme.scss`](../src/styles/_theme.scss) |
| TS mirror                               | [`src/browser/tokens.ts`](../src/browser/tokens.ts)                                                            |
| Token-resolution test (runtime)         | [`tests/src/styles/tokens.test.ts`](../tests/src/styles/tokens.test.ts)                                        |
| TS ↔ SCSS parity                        | [`tests/src/browser/tokens.test.ts`](../tests/src/browser/tokens.test.ts)                                      |
| Token-naming + abbreviation black-list  | [`tests/guides/tokens.test.ts`](../tests/guides/tokens.test.ts)                                                |
| Token-group uniformity (`TOKEN_GROUPS`) | [`tests/guides/elements.test.ts`](../tests/guides/elements.test.ts)                                            |
| Showcase                                | [`app/browser/pages/TokensPage.vue`](../app/browser/pages/TokensPage.vue)                                      |

### Modifiers — five orthogonal dimensions

Cross-cutting classes (`.primary`, `.large`, `.subtle`, `.disabled`, `.top`, …) that set context tokens. Five dimensions: variant, size, style, state, placement.

| Role                                  | File                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec                                  | [`guides/modifiers.md`](modifiers.md)                                                                                                                                                                                                                                                                                                                                                       |
| SCSS sources                          | [`src/styles/modifiers/_variants.scss`](../src/styles/modifiers/_variants.scss), [`_sizes.scss`](../src/styles/modifiers/_sizes.scss), [`_styles.scss`](../src/styles/modifiers/_styles.scss), [`_states.scss`](../src/styles/modifiers/_states.scss), [`_placements.scss`](../src/styles/modifiers/_placements.scss), [`_local.scss`](../src/styles/modifiers/_local.scss) (element-local) |
| TS mirror                             | [`src/browser/modifiers.ts`](../src/browser/modifiers.ts)                                                                                                                                                                                                                                                                                                                                   |
| TS ↔ SCSS parity                      | [`tests/src/browser/modifiers.test.ts`](../tests/src/browser/modifiers.test.ts)                                                                                                                                                                                                                                                                                                             |
| Doc parity (md §1 ↔ TS)               | [`tests/guides/modifiers.test.ts`](../tests/guides/modifiers.test.ts)                                                                                                                                                                                                                                                                                                                       |
| Per-dimension required-token coverage | [`tests/src/styles/modifiers/_index.test.ts`](../tests/src/styles/modifiers/_index.test.ts)                                                                                                                                                                                                                                                                                                 |
| Per-modifier behavior tests           | [`tests/src/styles/modifiers/`](../tests/src/styles/modifiers/) — `_variants`, `_sizes`, `_styles`, `_placements`, `_local`, `_states` test files                                                                                                                                                                                                                                           |
| Cross-cutting class isolation         | [`tests/guides/modifiers.test.ts`](../tests/guides/modifiers.test.ts)                                                                                                                                                                                                                                                                                                                       |
| No hand-rolled variant blocks         | [`tests/guides/modifiers.test.ts`](../tests/guides/modifiers.test.ts)                                                                                                                                                                                                                                                                                                                       |
| Showcase                              | [`app/browser/pages/ModifiersPage.vue`](../app/browser/pages/ModifiersPage.vue), [`PlacementsPage.vue`](../app/browser/pages/PlacementsPage.vue)                                                                                                                                                                                                                                            |

### Elements — per-tag baselines

One SCSS partial per native HTML tag. Most are passthroughs; the substantive ones declare `--set-{tag}-*` tokens and carry the modifier cascade.

| Role                                                | File                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spec                                                | [`guides/elements.md`](elements.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SCSS folder                                         | [`src/styles/elements/`](../src/styles/elements/) — one `_{tag}.scss` per HTML tag                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| TS registry (substantive baselines)                 | [`src/browser/elements.ts`](../src/browser/elements.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| TS ↔ SCSS parity                                    | [`tests/guides/elements.test.ts`](../tests/guides/elements.test.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Per-element behavior tests                          | [`tests/src/styles/elements/`](../tests/src/styles/elements/) — `_a`, `_button`, `_details`, `_dialog`, `_dl`, `_fieldset`, `_hgroup`, `_input`, `_label`, `_lists`                                                                                                                                                                                                                                                                                                                                                            |
| Interactive a11y (forced-colors + `:focus-visible`) | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Structural `parent > child` pairings                | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Showcase                                            | [`app/browser/pages/ButtonPage.vue`](../app/browser/pages/ButtonPage.vue), [`FormControlsPage.vue`](../app/browser/pages/FormControlsPage.vue), [`HeadingsPage.vue`](../app/browser/pages/HeadingsPage.vue), [`InlineAtomsPage.vue`](../app/browser/pages/InlineAtomsPage.vue), [`ListsPage.vue`](../app/browser/pages/ListsPage.vue), [`MediaPage.vue`](../app/browser/pages/MediaPage.vue), [`TypographyPage.vue`](../app/browser/pages/TypographyPage.vue), [`SectioningPage.vue`](../app/browser/pages/SectioningPage.vue) |

### Components — composed widgets

Element compositions: `<article>` as a card, `<body>` as a layout shell, `<aside>` as a callout, etc. The framework promotes existing HTML elements into named widgets; class-component fallbacks (`.badge`, `.tag`, `.dot`, `.skeleton`, `.spinner`) live here too.

| Role                         | File                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec                         | [`guides/components.md`](components.md)                                                                                                                                                                                                                                                                                 |
| SCSS folder                  | [`src/styles/components/`](../src/styles/components/) — `_article`, `_aside`, `_badge`, `_body`, `_div`, `_dot`, `_footer`, `_form`, `_header`, `_main`, `_menu`, `_nav`, `_output`, `_role-group`, `_search`, `_skeleton`, `_spinner`, `_tag`                                                                          |
| Per-component contracts      | [`src/browser/patterns.ts`](../src/browser/patterns.ts) § `COMPONENT_CONTRACTS`                                                                                                                                                                                                                                         |
| Contract enforcement         | [`tests/src/styles/components/_index.test.ts`](../tests/src/styles/components/_index.test.ts)                                                                                                                                                                                                                           |
| Per-component behavior tests | [`tests/src/styles/components/`](../tests/src/styles/components/) — `_accordion`, `_alert`, `_article`, `_aside`, `_body`, `_div`, `_dropdown`, `_footer`, `_form`, `_header`, `_inline_atoms`, `_menu`, `_nav`, `_search`, `_tabs`, `_toast`, `_tooltip`                                                               |
| Showcase                     | [`app/browser/pages/ArticleCardPage.vue`](../app/browser/pages/ArticleCardPage.vue), [`AsidePage.vue`](../app/browser/pages/AsidePage.vue), [`MenuPage.vue`](../app/browser/pages/MenuPage.vue), [`NavPage.vue`](../app/browser/pages/NavPage.vue), [`FormSurfacesPage.vue`](../app/browser/pages/FormSurfacesPage.vue) |

### Surfaces — browser-rendered chrome

Pseudo-element + attribute + at-rule surfaces — `::backdrop`, `[popover]`, `:focus-visible`, `::placeholder`, `::marker`, `::selection`, scrollbar, anchor-position, view-transition.

| Role                       | File                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec                       | [`guides/surfaces.md`](surfaces.md)                                                                                                                                                                                                     |
| SCSS folder                | [`src/styles/surfaces/`](../src/styles/surfaces/) — `_anchor-position`, `_backdrop`, `_focus`, `_marker`, `_placeholder`, `_popover`, `_scrollbar`, `_selection`, `_view-transition`                                                    |
| Per-surface contracts      | [`src/browser/patterns.ts`](../src/browser/patterns.ts) § `SURFACE_CONTRACTS`                                                                                                                                                           |
| Contract enforcement       | [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts)                                                                                                                                               |
| Per-surface behavior tests | [`tests/src/styles/surfaces/`](../tests/src/styles/surfaces/) — `_anchor-position`, `_backdrop`, `_focus`, `_marker`, `_placeholder`, `_popover`, `_scrollbar`, `_selection`, `_view-transition`                                        |
| Showcase                   | [`app/browser/pages/PopoverSurfacesPage.vue`](../app/browser/pages/PopoverSurfacesPage.vue), [`AnchorPage.vue`](../app/browser/pages/AnchorPage.vue), [`ScrollAndTransitionPage.vue`](../app/browser/pages/ScrollAndTransitionPage.vue) |

### Composables — Vue adapters + framework-agnostic factories

20 paired `use{Name}` Vue adapters + `create{Name}` factories. The factory owns the DOM mutation logic + `@vue/reactivity` state; the composable is a thin Vue lifecycle bridge.

| Role                                | File                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec                                | [`guides/composables.md`](composables.md)                                                                                                                                                                                                                                                                         |
| Vue adapters                        | [`src/browser/composables/`](../src/browser/composables/) — `useAlert`, `useAside`, `useButton`, `useCarousel`, `useDetails`, `useDialog`, `useDrag`, `useDrop`, `useFocus`, `useForm`, `useMenu`, `useNav`, `usePointer`, `usePopover`, `useSelect`, `useTable`, `useTabs`, `useTheme`, `useToast`, `useTooltip` |
| Factory logic                       | [`src/browser/factories/`](../src/browser/factories/) — paired `create{Name}` per composable, plus the public barrel [`index.ts`](../src/browser/factories/index.ts)                                                                                                                                              |
| Chrome SCSS                         | [`src/styles/composables/`](../src/styles/composables/) — `_aside`, `_carousel`, `_dialog`, `_select`, `_tabs`, `_toast` (state-gated chrome)                                                                                                                                                                     |
| Per-composable contracts            | [`src/browser/patterns.ts`](../src/browser/patterns.ts) § `COMPOSABLE_CONTRACTS`                                                                                                                                                                                                                                  |
| Contract enforcement                | [`tests/src/styles/composables/_index.test.ts`](../tests/src/styles/composables/_index.test.ts)                                                                                                                                                                                                                   |
| Native-platform redundancy (JS↔CSS) | [`tests/guides/composables.test.ts`](../tests/guides/composables.test.ts)                                                                                                                                                                                                                                         |
| Factory tests                       | [`tests/src/browser/factories/`](../tests/src/browser/factories/) — one `create{Name}.test.ts` per factory                                                                                                                                                                                                        |
| Composable adapter tests            | [`tests/src/browser/composables/`](../tests/src/browser/composables/) — `useAside`, `useDetails`, `useDialog`, `usePointer`, `usePopover`, `useTheme`                                                                                                                                                             |
| Showcase                            | [`app/browser/pages/`](../app/browser/pages/) — `UseAlert`, `UseAside`, `UseCarousel`, `UseDetails`, `UseDialog`, `UseDragDrop`, `UseFocus`, `UseForm`, `UseMenu`, `UseNav`, `UsePointer`, `UsePopover`, `UseSelect`, `UseTable`, `UseTabs`, `UseThemeButton`, `UseToast`, `UseTooltip`                           |

### Taxonomy — HTML element → framework treatment

Every native HTML tag with its framework treatment (`substantive` / `reset` / `composable` / `passthrough`).

| Role                      | File                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec                      | [`guides/elements.md`](elements.md)                                                                                                                                                      |
| TS source                 | [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts) — registry + `TAXONOMY_BY_TAG`, `SUBSTANTIVE_TAGS`, `COMPOSABLE_TAGS`, `MODIFIABLE_TAGS`, `TOKEN_GROUPS`, `INTERACTIVE_ELEMENTS` |
| TS shape + indices        | [`tests/guides/elements.test.ts`](../tests/guides/elements.test.ts)                                                                                                                      |
| SCSS ↔ TS taxonomy parity | [`tests/guides/elements.test.ts`](../tests/guides/elements.test.ts)                                                                                                                      |

### Patterns — per-folder structural contracts

The contract codification: every SCSS partial under `elements/`, `modifiers/`, `surfaces/`, `components/`, `composables/` is held to a layered contract.

| Role                              | File                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spec                              | [`guides/patterns.md`](patterns.md)                                                                                                                                                                                                                                                  |
| TS source                         | [`src/browser/patterns.ts`](../src/browser/patterns.ts) — `FOLDER_CONTRACTS`, `FILE_EXCEPTIONS`, `SURFACE_CONTRACTS`, `COMPONENT_CONTRACTS`, `COMPOSABLE_CONTRACTS`, `MODIFIER_DIMENSION_TOKENS`, `INTERACTIVE_ELEMENTS`, `MOTION_CONTRACT_PARTIALS`, `STRUCTURAL_PAIRINGS`, helpers |
| Patterns helper tests             | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                  |
| Per-folder structural enforcement | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                  |
| Scope discipline                  | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                  |
| Structural pairings allowlist     | [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts)                                                                                                                                                                                                                  |
| Motion contract                   | [`tests/guides/tokens.test.ts`](../tests/guides/tokens.test.ts)                                                                                                                                                                                                                      |

### Mixins — Sass helpers + lists

The mixin / function registry — `transition()`, `focus-ring()`, `reduced-motion`, `forced-colors`, `palette-each`, plus the `$variants` / `$sizes` / `$styles` / `$states` Sass lists.

| Role        | File                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Spec        | [`guides/mixins.md`](mixins.md)                                                                                     |
| SCSS source | [`src/styles/_mixins.scss`](../src/styles/_mixins.scss)                                                             |
| Used by     | Every partial under `src/styles/{elements,modifiers,surfaces,components,composables}/` via `@use '../mixins' as *;` |

### Events — namespaced event names

Pattern: `elements:{source}:{verb}`. Every composable / factory emits through this registry.

| Role         | File                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| Spec         | Covered inline in [`guides/composables.md`](composables.md#event-names)   |
| TS source    | [`src/browser/events.ts`](../src/browser/events.ts)                       |
| Shape parity | [`tests/guides/composables.test.ts`](../tests/guides/composables.test.ts) |

### Tailwind interop

The framework layers on Tailwind v4. The interop test verifies modifier+utility composition and the collision watch list.

| Role                                  | File                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Spec                                  | [`guides/styles.md`](styles.md) § "Tailwind v4 is the base"                           |
| Composition test + collision detector | [`tests/src/styles/integration.test.ts`](../tests/src/styles/integration.test.ts)     |
| Collision watch list                  | [`tests/setup.ts`](../tests/setup.ts) § `TAILWIND_SINGLE_TOKEN_UTILITIES` |

---

## By directory

### `guides/` — documentation

| File                               | Purpose                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`README.md`](README.md)           | This file. The pointer to everything else.                                                               |
| [`contribute.md`](contribute.md)   | Workflow for humans + agents. Step-by-step procedures with the exact parity-test commands.               |
| [`ROADMAP.md`](../ROADMAP.md)      | Phase-by-phase blueprint and current work-in-progress roster.                                            |
| [`styles.md`](styles.md)           | Top-level architecture: layer order, Tailwind interop, design philosophy.                                |
| [`patterns.md`](patterns.md)       | Per-folder structural contracts. The operational reference when authoring or refactoring a SCSS partial. |
| [`elements.md`](elements.md)       | Every native HTML tag with its framework treatment. The first stop before authoring a new element.       |
| [`tokens.md`](tokens.md)           | Token surface — `--set-*` namespace, fallback chains, theming contract.                                  |
| [`modifiers.md`](modifiers.md)     | Five-dimension cascade — variant / size / style / state / placement.                                     |
| [`elements.md`](elements.md)       | Per-tag catalog — substantive / override / non-styled / non-visual.                                      |
| [`components.md`](components.md)   | Element compositions — element-driven + class-root patterns.                                             |
| [`surfaces.md`](surfaces.md)       | Browser-rendered chrome — pseudo-elements, `[popover]`, anchor-position, etc.                            |
| [`composables.md`](composables.md) | Vue + factory layer — adapter / factory split, naming, lifecycle.                                        |
| [`mixins.md`](mixins.md)           | Sass-side helper registry + list constants.                                                              |
| [`showcase.md`](showcase.md)       | The showcase app (`app/browser/`) — strict authoring rules, sidebar / TOC patterns, custom-class triage. |
| [`mixins.md`](mixins.md)           | Sass mixin + function registry — `transition()`, `focus-ring()`, `palette-each`, etc.                    |

### `src/browser/` — TypeScript public API

Frozen object trees and derived string-literal-union types. Every CSS identifier the framework authors has a leaf here. The sole public barrel is [`src/browser/index.ts`](../src/browser/index.ts).

| File                                          | Purpose                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`index.ts`](../src/browser/index.ts)         | Sole public barrel. `export *` from each surface file.                                                                                                |
| [`types.ts`](../src/browser/types.ts)         | SOURCE OF TRUTH for the TS public API. Every interface and type alias lives here first.                                                               |
| [`tokens.ts`](../src/browser/tokens.ts)       | Frozen tree mirroring every `--set-*` token + `--color-{variant}` palette.                                                                            |
| [`modifiers.ts`](../src/browser/modifiers.ts) | The five modifier dimensions and their values.                                                                                                        |
| [`elements.ts`](../src/browser/elements.ts)   | Registry of substantive element baselines.                                                                                                            |
| [`taxonomy.ts`](../src/browser/taxonomy.ts)   | Per-tag treatment + indices (`SUBSTANTIVE_TAGS`, `COMPOSABLE_TAGS`, `TOKEN_GROUPS`, `INTERACTIVE_ELEMENTS`, `MODIFIABLE_TAGS`).                       |
| [`patterns.ts`](../src/browser/patterns.ts)   | Per-folder contracts (`FOLDER_CONTRACTS`, `SURFACE_CONTRACTS`, `COMPONENT_CONTRACTS`, `COMPOSABLE_CONTRACTS`, …) and selector-classification helpers. |
| [`events.ts`](../src/browser/events.ts)       | Namespaced event-name registry (`elements:{source}:{verb}`).                                                                                          |
| [`helpers.ts`](../src/browser/helpers.ts)     | `assertElement`, `attachListeners`, focus-ring helpers, etc.                                                                                          |
| [`constants.ts`](../src/browser/constants.ts) | UPPER_SNAKE_CASE values, `*_EVENTS` maps, selector strings, storage keys.                                                                             |
| [`composables/`](../src/browser/composables/) | 20 `use{Name}.ts` Vue adapters + `index.ts` barrel.                                                                                                   |
| [`factories/`](../src/browser/factories/)     | 20 `create{Name}.ts` framework-agnostic factories + `index.ts` barrel.                                                                                |

### `src/styles/` — SCSS source

Compile pipeline: Sass → PostCSS (`@tailwindcss/postcss`). The compilation barrel is [`index.scss`](../src/styles/index.scss). Mixins are NOT `@use`d by the barrel; consumers write `@use '../mixins' as *;` directly.

| Path                                         | Purpose                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`index.scss`](../src/styles/index.scss)     | Sole compilation barrel — tokens → theme → elements → components → surfaces → composables → modifiers.                                                        |
| [`_tokens.scss`](../src/styles/_tokens.scss) | `:root { --set-* }` global tokens + cascade-layer order.                                                                                                      |
| [`_theme.scss`](../src/styles/_theme.scss)   | `@theme { … }` block registering semantic variant colors with Tailwind.                                                                                       |
| [`_mixins.scss`](../src/styles/_mixins.scss) | Mixin / function / Sass-list registry. `@use` directly, never via the barrel.                                                                                 |
| [`elements/`](../src/styles/elements/)       | One partial per HTML tag (~94 files). Most are comment-only placeholders; substantive ones declare `--set-{tag}-*` tokens. See [elements.md §3](elements.md). |
| [`modifiers/`](../src/styles/modifiers/)     | One partial per modifier dimension: `_variants`, `_sizes`, `_styles`, `_states`, `_placements`, plus `_local` for element-local modifiers.                    |
| [`surfaces/`](../src/styles/surfaces/)       | Pseudo-element / attribute / at-rule surfaces.                                                                                                                |
| [`components/`](../src/styles/components/)   | Element compositions + class-root fallbacks.                                                                                                                  |
| [`composables/`](../src/styles/composables/) | State-gated chrome activated by `use{Name}` composables. Every rule gates on a composable-state selector.                                                     |

### `tests/` — test suite

Vitest projects defined in [`vite.config.ts`](../vite.config.ts). Each project owns one folder:

- `src:core` — `tests/src/core/` (node env, currently empty placeholder)
- `src:browser` — `tests/src/browser/` (chromium)
- `src:styles` — `tests/src/styles/` (chromium, full cascade loaded)
- `guides` — `tests/guides/` (node env, fast)
- `app:core` — `tests/app/core/` (node env)
- `app:browser` — `tests/app/browser/` (chromium)

| File                                          | Purpose                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`setup.css`](../tests/setup.css)             | Cascade-layer order + Tailwind import + `@source` directives.                                                                                                                                                                                                                                                                                                             |
| [`setup.ts`](../tests/setup.ts)               | Generic helpers: `createRecorder`, `extractProperty`, `waitForDelay`, `leaves`, `tableCellFor`, `extractBacktickedNames`. Re-exported by `setupBrowser` and `setupStyles`.                                                                                                                                                                                                |
| [`setupBrowser.ts`](../tests/setupBrowser.ts) | Vue mounting (`mountSetup`, `withElement`), factory fixtures (`createFactoryFixture`), event helpers (`createPointerEvent`, `createDragEvent`), dispose hygiene (`assertCleanDispose`), DOM builder (`buildElement`), `waitForBootstrap`.                                                                                                                                 |
| [`setupStyles.ts`](../tests/setupStyles.ts)   | CSS pipeline import, computed-style readers (`style`, `token`, `rootToken`, `pixels`), color helpers (`rgba`, `colorEqual`), fixture builders (`mount`, `render`, `build`), stylesheet introspection (`findRule`), SCSS source introspection (`stripComments`, `tagFromPath`, `declaresToken`, `declaresElementToken`, `usesMotionMixin`), Tailwind collision watch list. |
| [`src/browser/`](../tests/src/browser/)       | TS public-API parity tests + factory + composable tests.                                                                                                                                                                                                                                                                                                                  |
| [`src/styles/`](../tests/src/styles/)         | Per-partial behavior tests + cross-cutting SCSS contract enforcers.                                                                                                                                                                                                                                                                                                       |
| [`guides/`](../tests/guides/)                 | One test per guide (`{guide}.test.ts`) + cross-guide meta-tests.                                                                                                                                                                                                                                                                                                          |

#### `tests/src/browser/` — TS public-API parity + factory + composable behaviour

Browser-environment tests. The bidirectional TS↔SCSS parity tests for `elements.ts`, `taxonomy.ts`, `events.ts`, `patterns.ts` all live under `tests/guides/` (node env) — see the doc-parity table below.

| File                                                          | Purpose                                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`modifiers.test.ts`](../tests/src/browser/modifiers.test.ts) | `modifiers.ts` ↔ modifier SCSS rules, runtime cascade resolution.                                              |
| [`tokens.test.ts`](../tests/src/browser/tokens.test.ts)       | `tokens.ts` ↔ `--set-*` declarations parity; runtime token resolution on `:root` + per-element + per-modifier. |
| [`composables/`](../tests/src/browser/composables/)           | Per-composable Vue-adapter tests.                                                                              |
| [`factories/`](../tests/src/browser/factories/)               | Per-factory behaviour tests (real DOM via Vitest browser provider).                                            |

#### `tests/src/styles/` — SCSS contracts + per-partial behaviour

Browser-environment tests (real Chromium) covering rendered cascade behaviour + folder-level contract enforcement.

| File                                                                           | Purpose                                                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [`tokens.test.ts`](../tests/src/styles/tokens.test.ts)                         | Every framework token resolves to a non-empty value at runtime.                                                 |
| [`integration.test.ts`](../tests/src/styles/integration.test.ts)               | Tailwind utility composition + collision detector.                                                              |
| [`components/_index.test.ts`](../tests/src/styles/components/_index.test.ts)   | Every `components/_{name}.scss` honors its `COMPONENT_CONTRACTS` entry (required tokens + animated discipline). |
| [`composables/_index.test.ts`](../tests/src/styles/composables/_index.test.ts) | Every `composables/_{name}.scss` honors its `COMPOSABLE_CONTRACTS` entry.                                       |
| [`surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts)       | Every `surfaces/_{name}.scss` honors its `SURFACE_CONTRACTS` entry.                                             |
| [`modifiers/_index.test.ts`](../tests/src/styles/modifiers/_index.test.ts)     | Every modifier in each dimension declares the required context tokens (`MODIFIER_DIMENSION_TOKENS`).            |
| [`modifiers/_local.test.ts`](../tests/src/styles/modifiers/_local.test.ts)     | Element-local modifier charter — no bare class rules, no Tailwind collisions, no cross-dimension reuse.         |
| [`components/`](../tests/src/styles/components/)                               | Per-component behaviour tests.                                                                                  |
| [`elements/`](../tests/src/styles/elements/)                                   | Per-element behaviour tests (only substantive ones with meaningful CSS behaviour).                              |
| [`modifiers/`](../tests/src/styles/modifiers/)                                 | Per-dimension behaviour tests (`_variants`, `_sizes`, `_styles`, `_states`, `_placements`).                     |
| [`surfaces/`](../tests/src/styles/surfaces/)                                   | Per-surface behaviour tests.                                                                                    |

#### `tests/guides/` — doc ↔ code parity

Node-environment tests. One driver per spec guide, plus the meta `README.test.ts` for cross-guide structural uniformity.

| File                                                         | Purpose                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`README.test.ts`](../tests/guides/README.test.ts)           | Meta: heading skeleton uniformity + cross-reference link parity + `tests/guides/*.test.ts` ↔ `guides/*.md` pairing.                                                                                                                     |
| [`elements.test.ts`](../tests/guides/elements.test.ts)       | `elements.ts` + `taxonomy.ts` shape, pre-computed indices, predicate getters, partial parity, token coverage, factory pairing, `TOKEN_GROUPS` membership, markdown-table parity.                                                        |
| [`modifiers.test.ts`](../tests/guides/modifiers.test.ts)     | `modifiers.md` dimension table ↔ `modifiers.ts` shipped values; isolation (cross-cutting modifiers only declared in `modifiers/`); no hand-rolled `.X.{variant}` enumeration outside `modifiers/`; no Tailwind single-token collisions. |
| [`tokens.test.ts`](../tests/guides/tokens.test.ts)           | Token naming (kebab-case shape + abbreviation black-list); motion contract (`MOTION_CONTRACT_PARTIALS` reference `--set-motion-{duration, timing-function}`); no hardcoded duration literals on panel-reveal properties.                |
| [`patterns.test.ts`](../tests/guides/patterns.test.ts)       | Folder structural contracts (layer wrap, allowed selector kinds, token namespace, state-selector requirement, comment-only policy); scope discipline; structural pairings; interactive minimum; selector-classification helpers.        |
| [`surfaces.test.ts`](../tests/guides/surfaces.test.ts)       | Bidirectional parity — every `surfaces/_*.scss` partial appears in `surfaces.md`; every `surfaces/_*.scss` reference resolves to a real file.                                                                                           |
| [`composables.test.ts`](../tests/guides/composables.test.ts) | Event-name registry (`elements:{source}:{verb}` lifecycle vocabulary); JS↔CSS attribute parity (every `setAttribute('data-X-*', …)` referenced in `src/styles/`); factory↔guide pairing (every `create{Name}.ts` documented).           |
| [`mixins.test.ts`](../tests/guides/mixins.test.ts)           | Bidirectional parity — every `@mixin` declared in `_mixins.scss` is documented in `mixins.md`; every documented mixin name resolves to a real declaration.                                                                              |

### `app/browser/` — showcase Vue app

The living-documentation layer. Every spec'd surface has a page demonstrating it. Built into a single self-contained HTML file via [`configs/app/vite.showcase.config.ts`](../configs/app/vite.showcase.config.ts).

| Path                                                        | Purpose                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`index.html`](../app/browser/index.html)                   | Showcase shell. Inlines a data-URL favicon; `<script src="./main.ts">` is the entry.                                                                                                                                               |
| [`main.ts`](../app/browser/main.ts)                         | Vue app bootstrap. Mounts `App.vue` and registers the hash router.                                                                                                                                                                 |
| [`App.vue`](../app/browser/App.vue)                         | Showcase shell — header, left nav rail (grouped route filter + `h6`/`<menu>` link list, mobile popover drawer), `<main>` content area, right TOC rail (`IntersectionObserver`-driven section list, mobile popover drawer), footer. |
| [`types.ts`](../app/browser/types.ts)                       | Shared type definitions — `Route`, `RouteLocation`, `Group`, `Section`.                                                                                                                                                            |
| [`router.ts`](../app/browser/router.ts)                     | Hash router (`#/{route}/{section}`). Route table is the source of truth for navigation.                                                                                                                                            |
| [`env.d.ts`](../app/browser/env.d.ts)                       | Vite client type augmentation.                                                                                                                                                                                                     |
| [`styles/main.css`](../app/browser/styles/main.css)         | Single CSS entry — `@layer` order + `@import 'tailwindcss'` + `@import '../../../src/styles/index'`.                                                                                                                               |
| [`styles/showcase.css`](../app/browser/styles/showcase.css) | Showcase-only chrome (NOT framework). `.showcase-*` classes for cross-page patterns.                                                                                                                                               |
| [`pages/`](../app/browser/pages/)                           | One `.vue` page per concept. See "By concept" above for the spec-to-page map.                                                                                                                                                      |

---

## Build + tooling

| File                                                                            | Purpose                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`vite.config.ts`](../vite.config.ts)                                           | Vitest project definitions (`srcCore`, `srcBrowser`, `srcStyles`, `guides`, `appCore`, `appBrowser`) + Playwright browser provider with Claude Code chromium auto-detection. |
| [`configs/app/vite.browser.config.ts`](../configs/app/vite.browser.config.ts)   | Dev-server + library build for the showcase Vue app.                                                                                                                         |
| [`configs/app/vite.showcase.config.ts`](../configs/app/vite.showcase.config.ts) | Single-file showcase build (`vite-plugin-singlefile` + custom HTML minifier).                                                                                                |
| [`configs/src/vite.browser.config.ts`](../configs/src/vite.browser.config.ts)   | Library build for `src/browser/`.                                                                                                                                            |
| [`configs/src/vite.styles.config.ts`](../configs/src/vite.styles.config.ts)     | Library build for `src/styles/`.                                                                                                                                             |
| [`configs/src/tsconfig.browser.json`](../configs/src/tsconfig.browser.json)     | Type-emit config for the browser library.                                                                                                                                    |
| [`tsconfig.json`](../tsconfig.json)                                             | Root TS config — `target: ESNext`, `moduleResolution: bundler`, `strict: true`, `allowImportingTsExtensions: true`.                                                          |
| [`package.json`](../package.json)                                               | Scripts: `dev`, `build`, `test`, `check`, `format`, `show`, `showcase`.                                                                                                      |
| [`.oxlintrc.json`](../.oxlintrc.json)                                           | Lint rules — `oxlint` with strict TypeScript + Vitest plugins.                                                                                                               |
| [`.oxfmtrc.json`](../.oxfmtrc.json)                                             | Formatter config.                                                                                                                                                            |
| [`AGENTS.md`](../AGENTS.md)                                                     | Non-negotiable rules — naming, layout, types-first, no `any`/`!`/`as`.                                                                                                       |

---

## Conventions at a glance

- **Single-word public API.** Every property, method, option key, event name is a single descriptive word. The entity supplies the disambiguating context. See [AGENTS.md](../AGENTS.md) §4.1.
- **Types-first.** Reusable types live in `*/types.ts` before implementation. Implementation matches the type, never the reverse.
- **Centralized files.** `*/types.ts` (types), `*/helpers.ts` (guards/utilities), `*/constants.ts` (UPPER_SNAKE), `*/errors.ts` (error classes), `*/index.ts` (sole barrel). Implementation files contain ONLY the class.
- **TS ↔ SCSS bidirectional parity** is enforced by tests. Drift in either direction fails the gate.
- **Tabs, single quotes, no semicolons** (except where required for ASI). Named exports only. Type imports first, then internal modules.

For the full ruleset see [AGENTS.md](../AGENTS.md). For the workflow see [contribute.md](contribute.md).
