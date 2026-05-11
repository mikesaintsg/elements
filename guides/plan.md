# Plan — Building Elements from Scratch

> A from-scratch implementation plan for the entire framework. Every checkbox is a discrete, testable task you can land in one commit. Each section maps to one of the companion guides; finishing a section means that guide is fully realised in code.

This plan assumes:

- An empty repo with `package.json`, `tsconfig.json`, `vite.config.ts`, and Vitest configured for browser-environment tests.
- Tailwind v4 + `@tailwindcss/postcss` installed.
- Vue 3 installed for the showcase app and composable layer.
- Sass installed (Dart Sass via Vite plugin) for the framework SCSS partials.

Read the guides ([styles.md](styles.md), [tokens.md](tokens.md), [mixins.md](mixins.md), [modifiers.md](modifiers.md), [elements.md](elements.md), [components.md](components.md), [composables.md](composables.md), [surfaces.md](surfaces.md)) before starting — they describe what each layer LOOKS like when done. This plan tells you the order in which to BUILD it.

Work top-to-bottom. Each phase depends on the one before. Within a phase, items can be parallelised across contributors but each is its own commit.

---

## The Baseline Hydration Goal (read once, applies to every phase)

The framework's overarching visual goal is **Bootstrap-parity hydration**: dropping the framework into a page should make every element feel **already wired up** — proper colors, spacing, alignment, hover states, focus rings, transitions — without the consumer reaching for utilities or composing modifiers. **Not opinionated** (no brand-flavored palette, no funky border-radius), just **consistent and uniform across the whole surface**.

Concretely this means each phase's audit verifies — for every element / component / composable touched — that all of the following are tokenized through `--set-*` defaults declared on `:root` (with `var(…, fallback)` only as documentation, never as the source of truth):

- **Colors** — variant identity, surface tier, text tier, border tier; subtle / emphasis / border-subtle triplets per variant; both light and dark resolve cleanly.
- **Sizes** — padding-inline, padding-block, font-size, line-height, border-radius across `default` / `.small` / `.large` modifier states.
- **Border** — border-radius (`--set-border-radius`) and border-width (`--set-border-width`) defaults so unsized rounded surfaces don't look razor-edged or chunky.
- **Spacing** — flex / grid `gap` (`--set-gap`), sibling vertical rhythm (`--set-stack-spacing`), per-element padding chain.
- **Z-index layering** — every floating chrome surface (popover / dialog / toast / tooltip / dropdown / sticky / fixed) consumes the canonical `--set-z-index-*` scale.
- **Elevation** — `--set-box-shadow-sm` / `--set-box-shadow` (the un-suffixed base tier, mirroring Bootstrap's `--bs-box-shadow`) / `--set-box-shadow-lg` for the three "lift" tiers consumed by every floating surface.
- **Focus** — `:focus-visible` ring painted via `focus-ring()` mixin consuming `--set-focus-*` tokens.
- **Animations / transitions** — every `transition:` paired with `prefers-reduced-motion: reduce` opt-out via `@include transition()`; every `animation:` paired with `@include reduced-motion { animation: none }`. Durations consume `--set-transition-duration`.
- **Interactions** — hover / focus / active / disabled / loading all painted with appropriate cursor + visual state.
- **Themes** — light / dark flip on `[data-theme]` retunes everything without per-component override; consumer can pin a brand color at `:root` and the cascade re-tunes every consumer.
- **Customizability** — every visible value flows through a `--set-*` token; no inline hex, no magic numbers in element / component / surface partials.

Each phase below explicitly notes the baseline-hydration items its scope owns. A phase is not "done" until every element / component / composable in its scope passes the hydration checklist above.

---

## Phase 0 — Repo bootstrap

- [x] Install dependencies: `vue@^3`, `@vue/reactivity`, `tailwindcss@^4`, `@tailwindcss/postcss`, `sass`, `vite`, `vitest`, `@vitest/browser-playwright` (the post-v4 split — replaces the legacy combined `@vitest/browser` package), `playwright`, `vue-tsc`, `oxlint`, `oxfmt`.
- [x] Create folder skeleton:
  ```
  src/styles/{elements,components,surfaces,composables,modifiers}/
  src/browser/{composables,factories}/
  app/browser/{pages,styles}/
  tests/src/{styles,browser}/
  guides/
  ```
- [x] Wire `configs/src/vite.styles.config.ts` (framework CSS bundle: `src/styles/index.scss` → `dist/src/styles/index.css`) and `configs/src/vite.browser.config.ts` (framework TS bundle: `src/browser/index.ts` → `dist/src/browser/`). The root `vite.config.ts` is reserved for Vitest.
- [x] Wire `configs/app/vite.showcase.config.ts` for the showcase build with `vite-plugin-singlefile` so demos can be shipped as one HTML.
- [x] Wire `configs/app/vite.browser.config.ts` for the dev-server / multi-page showcase build.
- [x] Wire root `vite.config.ts` for Vitest with browser environment + `tests/setup.ts` (DOM helpers), `tests/setupBrowser.ts` (browser fixtures), `tests/setupStyles.ts` (CSS-aware helpers), and `tests/setup.css` (cascade layer order).
- [x] Add NPM scripts: `dev`, `build`, `build:src:styles`, `build:src:browser`, `test` + per-project `test:src:{core,browser,styles}` and `test:app:{core,browser}` so contributors never run the whole suite by accident, `check` (`oxlint --fix` + `vue-tsc --noEmit`), `format` (`oxfmt --write .`), `show` (`build:showcase` + copy to `demo/showcase.html`).

**Verification:** `npm install` succeeds; `npm run check` exits 0 (currently: `Found 0 warnings and 0 errors. Finished in ~80ms on 138 files`).

---

## Phase 1 — Style entry + cascade layer order

The cascade layer order is the load-bearing invariant. Get it wrong and modifiers don't beat element baselines, popover surfaces leak into composable rules, and Tailwind utilities lose to framework rules.

- [x] Create `tests/setup.css`:
  ```css
  @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
  @import 'tailwindcss';
  @source '../src/styles';
  @source '../tests';
  ```
- [x] Create `app/browser/styles/main.css` (the single CSS entry):
  ```css
  @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
  @import 'tailwindcss';
  @import '../../../src/styles/index.scss';
  @import './showcase.css';
  @source '../../../src/styles';
  @source '../../../app';
  #app {
  	display: contents;
  }
  ```
- [x] Create `src/styles/index.scss` as the framework barrel. **Note:** `_mixins.scss` is the registry of `@function`/`@mixin`/Sass-list members and emits no top-level CSS — per AGENTS.md §21.1 it must NOT be `@use`d from this barrel; consumers reach for it directly with `@use '../mixins' as *;`.
  ```scss
  @use 'tokens';
  @use 'theme';
  @use 'elements';
  @use 'components';
  @use 'surfaces';
  @use 'composables';
  @use 'modifiers';
  ```
- [x] Create `index.scss` files in each subfolder (`elements/index.scss`, `components/index.scss`, …) so the barrel resolves before partials land. Each subfolder barrel re-exports its substantive partials with `@forward`.

**Verification:** `npm run build:src:styles` succeeds and emits an empty `dist/src/styles/index.css` (just the cascade layer declaration). `npm run dev` boots Vite without errors.

---

## Phase 2 — Tokens

The variation surface every element, component, and modifier reads through.

- [x] **`src/styles/_tokens.scss`** — `:root` declarations for every framework-owned `--set-*` token. Three families:
  - **Variation surface** — focus ring (`--set-focus-box-shadow-{width,opacity}`), variant context (`--set-variant-{color,background-color,border-color,border-width}`), density / radius factors, transition duration.
  - **Baseline hydration** (Bootstrap-parity defaults so a bare element looks "alive" without per-component overrides):
    - `--set-border-radius`, `--set-border-width` — default rounded-corner + border thickness for any element that hasn't been sized.
    - `--set-gap`, `--set-stack-spacing` — default flex/grid gap and sibling vertical rhythm.
    - `--set-sticky-offset` — `scroll-padding-block-start` budget.
    - `--set-z-index-{sticky,fixed,dropdown,modal,popover,tooltip,toast}` — Bootstrap-style layering scale (top-layer surfaces still take precedence; this scale governs in-flow chrome + consumer-authored layering).
    - `--set-box-shadow-sm`, `--set-box-shadow` (un-suffixed base tier — Bootstrap-aligned `--bs-box-shadow` convention), `--set-box-shadow-lg` — three-tier elevation scale for floating surfaces.
    - `--set-icon-*` — single overridable inline-SVG library for every chrome glyph.
    - `--set-floater-*` — viewport-clamped sizing budget for top-layer panels.
  - Every value is a real `:root` declaration — never a `var(…, fallback)` inlined elsewhere — so consumers can override at one global scope without forking partials.
- [x] **`src/styles/_theme.scss`** — `@theme` block registering semantic colour variants (`--color-primary`, `--color-success`, …) so Tailwind generates matching `.bg-*` / `.text-*` / `.border-*` utilities. `:root` block of surface / text / border tier tokens (`--color-canvas`, `--color-text`, `--color-border`, …) and per-variant `bg-subtle / text-emphasis / border-subtle` triplets derived via `color-mix()`. Dark-mode overrides under `[data-theme="dark"]` (and `prefers-color-scheme: dark` follow on `:root:not([data-theme])`).
- [x] **`src/browser/tokens.ts`** — TypeScript mirror of every `--set-*` token. Frozen object tree of string literals + derived union types.
- [x] **`tests/src/browser/tokens.test.ts`** — bidirectional parity: every TS leaf resolves on `:root`, every `--set-*` in any SCSS partial appears as a TS leaf.

**Verification:** `npm run test:src:browser` passes (953/953). Every token in `tokens.ts` has a non-empty `:root` resolved value.

---

## Phase 3 — Mixins

Shared SCSS helpers every partial reaches for.

- [x] **`src/styles/_mixins.scss`** with these mixins (each documented in [mixins.md](mixins.md)):
  - `@mixin reduced-motion` — `@media (prefers-reduced-motion: reduce) { @content; }`
  - `@mixin transition($value)` — declares `transition: $value` and nests `reduced-motion { transition: none; }`
  - `@mixin focus-ring($alpha)` — paints the framework focus shadow using `--set-variant-background-color` and the focus sub-tokens.
  - `@mixin forced-colors` — `@media (forced-colors: active) { @content; }`
  - `@mixin truncate` — single-line text ellipsis.
  - `@mixin size-container($name)` — container-query setup with a stable `container-name`.
  - `@mixin floater-bounds($name, $axis)` — viewport-clamped max-inline / max-block-size using `--set-floater-*` tokens.
  - `@mixin floater-side-insets($name)` / `@mixin floater-edge` / `@mixin floater-fullscreen` — composable inset patterns for tooltips/popovers/toasts.
  - `@mixin palette-each` — `@each` loop over the `$variants` Sass list.
- [x] Sass list constants alongside the mixins: `$variants`, `$sizes`, `$styles`, `$states` — used by `@each` loops in modifier partials. (Shape is **not** a modifier dimension; corner-roundness is driven by `--set-radius-factor` in [tokens.md](tokens.md) and the `.rounded` / `.pill` family is reserved to Tailwind utilities. See [modifiers.md](modifiers.md).)

**Verification:** A trivial element partial that `@include`s `transition()` compiles and ships both the transition and the reduced-motion override.

---

## Phase 4 — Modifiers

Four orthogonal dimensions plus placement and state. The variation surface every element consumes.

- [x] **`src/styles/modifiers/_variants.scss`** — `.primary`, `.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information`. Each sets `--set-variant-color`, `--set-variant-background-color`, `--set-variant-border-color`. Variant identity color = the variant's background color; contrast text is white or black depending on luminance.
- [x] **`src/styles/modifiers/_sizes.scss`** — `.small`, `.large`. Each sets `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius` from Tailwind scales. (Default size is bare-element; `.huge` is **not** part of the surface — it would clash with Tailwind text-\* utilities.)
- [x] **`src/styles/modifiers/_styles.scss`** — `.subtle`, `.filled`. `.subtle` reads the variant SUBTLE-tier tokens (`--set-variant-{text-emphasis, bg-subtle, border-subtle}`) for a Bootstrap-pattern tinted-bg button that clears WCAG AA in both light and dark; `.filled` reads the FILLED-tier tokens (`--set-variant-{color, background-color, border-color, border-width}`). The previous `.ghost` modifier was removed — its transparent text-on-canvas pattern failed AA for 4 of 7 variants in dark and 3 of 7 in light. (`.outline` is reserved to Tailwind's `outline-*` family; the framework's outlined look is the bare-element default.)
- [x] **`src/styles/modifiers/_states.scss`** — `.disabled`, `.active`, `.loading`. Typically just toggle existing element rules.
- [x] **`src/styles/modifiers/_placements.scss`** — `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end`. Map to CSS `position-area` keywords. Scoped to `[popover]:not([popover='manual'])` so per-element placement semantics on `<aside>` / `<nav>` / `<output>` aren't disrupted.
- [x] **`src/styles/modifiers/index.scss`** — barrel.
- [x] **`src/browser/modifiers.ts`** — TS mirror: frozen object tree of class names + derived `Variant`, `Size`, `Style`, `State`, `Placement` union types.
- [x] **`tests/src/browser/modifiers.test.ts`** — bidirectional parity test.
- [x] **`tests/src/styles/modifiers/_{name}.test.ts`** — one test per modifier dimension verifying the rule emits the expected `--set-*-*` token values.

**Verification:** Every modifier class resolves correctly when applied to a sample `<div>` mounted in a test fixture.

---

## Phase 5 — Element baselines

One partial per HTML tag. Token-driven baselines + UA-quirk resets. The `<button>` partial is the reference implementation; bring it up first, then port the cascade pattern to every other substantive element.

### 5.1 Reference implementation — `<button>`

- [x] **`src/styles/elements/_button.scss`** with the full `--set-button-*` cascade. Token fallback chain: `--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor))`. Same shape for background, border, radius, padding, font-size, transition. Hover / active / focus / disabled rules read through the tokens.
- [x] **`src/browser/elements.ts`** — register `button`. TS object frozen as `as const` + derived `Element` union type.
- [x] **`tests/src/browser/elements.test.ts`** — bidirectional parity: every TS element has a partial declaring at least one `--set-{tag}-*` token.
- [x] **`tests/src/styles/elements/_button.test.ts`** — bare button paints, modifier cascade reaches the root tokens, every variant / size / style / state combination resolves the expected color/padding/radius. (Note: shape modifier removed — Tailwind owns `.rounded` / `.pill`-style names, the framework's corner roundness comes from `--set-radius-factor`.)
- [x] **`app/browser/pages/ButtonPage.vue`** — showcase demo of every variant + size + style + state combination.

### 5.2 Form controls

- [x] `<input>`, `<textarea>`, `<select>`, `<label>`, `<fieldset>` + `<legend>`, `<output>`, `<progress>`, `<meter>` — each with the same cascade pattern. Per-element quirks documented inline.
- [x] Add each to `elements.ts`, write per-element behaviour tests, write showcase pages.

### 5.3 Interactive elements

- [x] `<a>` (substantive — keeps underline by default; variants tint text; `.filled` fills with the variant identity and drops the underline). Anchor-context resets per §6.1.
- [x] `<details>` + `<summary>` (substantive — `interpolate-size: allow-keywords` for CSS-driven height animation).
- [x] `<dialog>` (substantive — `:modal` centers via `position: fixed; translate: -50% -50%`; `[open]:not(:modal)` flows inline at source position).
- [x] `<table>` family (`<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`).
- [x] `<h1>`–`<h6>` (shared `--set-heading-*` cascade — six tags, one partial in `_h1-h6.scss`).

### 5.3a Sectioning content

Sectioning landmarks the framework treats as **hydrated containers**, not invisible block boxes. Bare element + per-element token surface; no class needed.

- [x] `<main>` (substantive — fluid inline padding gutter via `clamp(1rem, 5vw, …)` + page-level vertical gap; component-layer `overflow-y: auto` layered on top inside the body grid).
- [x] `<section>` (substantive — flex-column with `--set-section-padding-block` + `--set-section-gap` so a bare section reads with proper rhythm; nested `<section>` inside `<main>` / `<section>` / `<article>` collapses its padding-block to avoid double-counting; `scroll-margin-block-start` consumes `--set-sticky-offset` so deep links land clear of sticky headers).
- [x] `<hgroup>` (substantive — tight flex-column gap + subordinate `<p>` margin reset and subdued color/font-size so the tagline reads as metadata).
- [x] **Audit pass for the rest:** `<header>`, `<footer>`, `<nav>`, `<aside>`, `<article>`, `<form>`, `<menu>`, `<search>`, `<details>`, `<dialog>` all already substantive at element or component layer; baseline-hydration audit clean (token surfaces present, anchor / button context defaults applied per §6.1, elevation through `--set-box-shadow-*`, focus rings via `focus-ring()`).

### 5.4 Typography overrides

- [x] `<abbr>`, `<address>`, `<mark>`, `<p>`, `<hr>`, `<blockquote>`, `<code>`, `<kbd>`, `<samp>`, `<var>`, `<pre>`, `<dl>` + `<dt>` + `<dd>`, `<figure>` + `<figcaption>` — single-rule UA-quirk overrides. No cascade entry, no TS mirror.

**Done so far:** `<address>` promoted from "italic-reset only" to a full small-contact-info block (subdued color, smaller font, tight line-height, stack-spacing margin); `<dd>` color token swapped from `--color-slate-600` (Tailwind palette leak) to `--color-text-muted` (semantic token). `<blockquote>`, `<dl>`, `<figure>`, `<figcaption>` already substantive — verified token surfaces and audit clean.

### 5.5 Media + embeds

- [x] `<img>`, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>` — overrides only (zero UA border, max-inline-size 100%, image vertical-align mid-line).
- [x] `<canvas>`, `<svg>` — promoted to substantive in §5.6 audit. Same `--set-{tag}-max-inline-size` + `block-size` token pair as the rest of the embed family, so authored viewBox-only SVGs and HiDPI canvases respect their container width without a per-call `max-w-full` utility.
- [x] `<picture>` — `display: contents` only (structural; no token). Suppresses the wrapper's box so `<picture><source><img></picture>` lays out exactly as a bare `<img>` would, without confusing flex/grid/intrinsic sizing.

**Verification:** Every element's behaviour test passes. The showcase has one page per substantive element demonstrating the cascade. **Baseline-hydration audit (per substantive element):** every `--set-{tag}-*` chain falls back through `style → variant → size → :root baseline (--set-border-radius / --set-gap / etc.)` so no element renders flat; every `transition:` paired with `prefers-reduced-motion`; every `:focus-visible` painted via `focus-ring()`; hover / active / disabled all visually distinct.

### 5.6 Placeholder element audit (comprehensive triage)

The framework keeps **one partial per HTML element** even when the partial emits no rule — the file documents the W3C semantics + UA defaults + framework rationale. This audit walks every comment-only / minimal-rule partial and decides per tag whether it should (a) stay a comment-only placeholder, (b) be promoted to substantive with a real `--set-{tag}-*` token surface, or (c) get a structural rule that needs no token (e.g. `display: contents`).

**Methodology:** for each tag, ask three questions:

1. Does Tailwind preflight + UA defaults produce production-correct rendering? → keep as commented placeholder, optionally cross-reference its component-layer hydration partner.
2. Is there a real visual gap (overflow, alignment, contrast, font issue) that consumers would otherwise paper over with utilities? → promote to substantive with tokens.
3. Is the partial structural (wrapper, landmark, layout) without a clear visual outcome? → ship the structural rule, no token.

**Audit results — promotions in this pass:**

| Tag         | Decision                   | Tokens added                                                     | Reason                                                                                                                       |
| ----------- | -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<canvas>`  | promote (substantive)      | `--set-canvas-max-inline-size`, `--set-canvas-block-size`        | Same overflow-bound treatment as `<img>` / `<iframe>` family — HiDPI surfaces shouldn't blow out narrow viewports.           |
| `<svg>`     | promote (substantive)      | `--set-svg-max-inline-size`, `--set-svg-block-size`              | viewBox-only inline SVGs were inheriting `inline-size: auto` and overflowing flex containers.                                |
| `<math>`    | promote (substantive)      | `--set-math-font-family`                                         | Native MathML in Chromium 109+/Firefox/Safari renders with system fonts that produce broken operator glyphs without a chain. |
| `<time>`    | promote (substantive)      | `--set-time-font-variant-numeric`                                | Almost every `<time>` is numeric (`14:30`, `2026-05-08`); columns of `<time>` should align in `tabular-nums` by default.     |
| `<data>`    | promote (substantive)      | `--set-data-font-variant-numeric`                                | Same rationale as `<time>` — `<data>` is the framework's machine-readable numeric annotation.                                |
| `<u>`       | promote (substantive)      | `--set-u-text-decoration-color`, `--set-u-text-decoration-style` | Bare `<u>` was visually indistinguishable from `<a>` (both got solid currentColor underline). Now muted dashed by default.   |
| `<picture>` | structural rule (no token) | —                                                                | `display: contents` so the wrapper doesn't introduce an extra inline box that confuses flex / grid / intrinsic sizing.       |

**Audit results — comment-only placeholders kept (with rationale):**

| Tag                                                                                                     | Reason kept as placeholder                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<article>`, `<aside>`, `<footer>`, `<header>`, `<nav>`, `<form>`, `<menu>`, `<search>` (element layer) | Hydration owned by the matching `components/_X.scss` partial. Element-layer partial cross-references the component for discoverability — see §6.1.    |
| `<bdi>`, `<bdo>`                                                                                        | UA `unicode-bidi: isolate` / `bidi-override` is correct; framework chrome would interfere with the bidi rendering algorithm.                          |
| `<cite>`, `<dfn>`, `<em>`                                                                               | UA italic is correct; consumers retune via `font-style` utilities when desired.                                                                       |
| `<del>`, `<s>`                                                                                          | UA `text-decoration: line-through` is correct; the semantic distinction (edit-history vs outdated) lives in the comment, not in the visual.           |
| `<ins>`                                                                                                 | UA `text-decoration: underline` is correct; semantic only.                                                                                            |
| `<q>`                                                                                                   | UA-inserted curly quotes via `::before` / `::after` + `quotes:` already track `lang`; framework override would block per-language quote conventions.  |
| `<ruby>`, `<rt>`, `<rp>`                                                                                | East Asian typography annotation; UA `display: ruby` / `display: ruby-text` / `display: none` is correct.                                             |
| `<datalist>`, `<optgroup>`, `<option>`                                                                  | UA-rendered platform widgets — until Chromium 130+ customizable `<select>` lands, no reliable styling surface exists.                                 |
| `<col>`, `<colgroup>`, `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<td>`, `<th>`             | Table-family chrome lives in `_table.scss` (363 lines); per-tag partials are intentional placeholder comments documenting per-tag semantics + quirks. |
| `<div>`, `<span>`                                                                                       | Generic containers — intentionally unstyled; consumers reach for component class roots (`.stack`, `.cluster`, `.badge`, `.dot`, `.tag`) when needed.  |

**Verification:** `src:browser` 981/981 passing (parity tests automatically asserted the seven new tokens resolve); `src:styles` 344/344 passing; lint + typecheck clean.

---

## Phase 6 — Components

Element compositions that read as one UI thing. Static chrome (always applies) lives in `src/styles/components/`; composable-attached chrome (only while a state attribute is set) lives in `src/styles/composables/` and comes in Phase 8.

- [x] **`src/styles/components/_body.scss`** — `body:has(> main)` CSS-grid layout shell with template-areas (`header / nav / main / aside / footer`).
- [x] **`src/styles/components/_main.scss`** — `body:has(main) > main` — `overflow-y: auto`, scroll containment.
- [x] **`src/styles/components/_article.scss`** — card chrome on bare `<article>`. Descendant `<header>` / `<footer>` get card-header/footer chrome via descendant selectors. `.filled` opts into surface fill. Box-shadow flows through `--set-box-shadow-sm` for elevation parity.
- [x] **`src/styles/components/_aside.scss`** — three contexts disambiguated by ancestry: `body > aside` (sidebar rail), `article aside` (pull-quote / callout), `aside[role="alert"]` (alert banner).
- [x] **`src/styles/components/_header.scss`** — `body > header` page app bar. Includes `:where(a)` reset per §6.1.
- [x] **`src/styles/components/_footer.scss`** — `body > footer` page footer. Includes `:where(a)` reset per §6.1.
- [x] **`src/styles/components/_nav.scss`** — single canonical chrome on `<nav>`. Shape determined by inner content: bare = horizontal flex; `body > nav` = vertical rail; `<ol>`/`<ul>` with `aria-label="Breadcrumb"` = chevron-separated breadcrumb; `[role="tablist"]` child = tab strip.
- [x] **`src/styles/components/_search.scss`** — search-bar layout on `<search>`.
- [x] **`src/styles/components/_menu.scss`** — toolbar / action row on `<menu>`. Article-context = `justify-content: flex-end` (card actions). Nav-context = vertical column. TOC + nav-rail item defaults shipped per §6.1.
- [x] **`src/styles/components/_output.scss`** — toast / status banner chrome (bare-element baseline; the popover-mode toast lifecycle lives in `src/styles/composables/_toast.scss`). Toast box-shadow consumes `--set-box-shadow-lg`.
- [x] **`src/styles/components/_form.scss`** — vertical form-control stack. `.row` flips horizontal.
- [x] **`src/styles/components/_div.scss`** — class-root layout primitives (`.stack`, `.cluster`).
- [x] **Inline atoms** — refactored from a single `_span.scss` into one partial per atom for clarity: `_badge.scss`, `_dot.scss`, `_tag.scss` (chip = tag with rounded modifier). The plan's original `_span.scss` aggregation is intentionally split so each atom owns its own `--set-{name}-*` token surface.
- [x] **`src/styles/components/_skeleton.scss`** + **`_spinner.scss`** — loading affordances.
- [x] **`src/styles/components/_role-group.scss`** — `[role="group"]`, `[role="toolbar"]`, `[role="radiogroup"]` baseline.
- [x] **`tests/src/styles/components/_{name}.test.ts`** for each partial (`src:styles` project: 344/344 passing).
- [x] Showcase page per component under `app/browser/pages/{Name}Page.vue`.

### 6.1 Anchor + button context contract (load-bearing)

The bare `<a>` baseline paints `--color-primary` text + underline so links read as links inside flowing body copy. That treatment is wrong for anchors used as **navigation commands** (sidebar entries, app-bar brand, TOC rows, footer credits). Each component partial that hosts nav commands must reset:

- `<a>` → `color: currentColor` (or muted variant for TOC), `text-decoration: none`, hover tint toward `--color-primary`.
- `<button>` → drop the inline-button center-text chrome inside nav-rail/TOC menus so a `<menu><li><a>` and `<menu><li><button>` row read identically. Buttons in the page header keep their framework button chrome (icon-buttons, theme toggles); only nav-rail/TOC menus normalize them to row items.

Shipped reset rules:

| Selector                                               | What it normalizes                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `body:has(main) > header :where(a)`                    | App-bar brand + nav links — currentColor, no underline, hover tints to primary                                              |
| `body:has(main) > footer :where(a)`                    | Footer credits + secondary nav — same recipe as header                                                                      |
| `body:has(main) > nav menu > li > :where(a, button)`   | Sidebar nav rows — full-width, start-aligned, currentColor, hover bg tint, `aria-current="page"` paints subtle-primary band |
| `body:has(main) > aside menu > li > :where(a, button)` | TOC rows — muted text, leading-bar accent on `aria-current="location"`                                                      |

`:where()` keeps specificity at zero so a single class on the anchor opts back into the bare-link look without `!important`. Modal / popover / article / dropdown contexts are unchanged — those have their own anchor rules already.

**Verification:** Every component's behaviour test passes; the showcase demos each component's variant + size + style cascade. **Baseline-hydration audit (per component):** layout primitives consume `--set-gap` for `flex` / `grid` `gap`; floating components (toast, drawer chrome) consume `--set-z-index-*` and `--set-box-shadow-*` from the global scale rather than declaring their own magic numbers; surface tier colors come from `--color-canvas` / `--color-surface` / `--color-surface-raised`; every focus-visible ring resolved via `focus-ring()`. **Anchor + button context defaults:** every nav-command host (header, footer, nav-rail menu, aside TOC menu) resets `<a>` away from the bare-link look (currentColor, no underline) and normalizes `<button>` to row-item chrome where appropriate — see §6.1.

---

## Phase 7 — Surfaces

Browser-rendered chrome that isn't a tag.

- [x] **`src/styles/surfaces/_popover.scss`** — `[popover]` panel chrome + open/close transition. `@starting-style` for entry. `transition-behavior: allow-discrete` for the close tail. Hint variant `[popover='hint'], [role='tooltip']` for tooltip-shaped popovers.
- [x] **`src/styles/surfaces/_backdrop.scss`** — `dialog:modal::backdrop` dim scrim. Non-modal popovers keep the UA-default transparent backdrop.
- [x] **`src/styles/surfaces/_anchor-position.scss`** — `[popover]:not([popover='manual'])` anchor positioning. Default `position-area: block-end`. `position-try-fallbacks` for viewport overflow.
- [x] **`src/styles/surfaces/_scrollbar.scss`** — `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`.
- [x] **`src/styles/surfaces/_focus.scss`** — `:focus-visible` ring rules using the framework's focus tokens. Surface paints `outline: none` + variant-tinted `box-shadow` ring on every focusable element via `:focus-visible:not(:where(input, textarea, select))` — form controls keep their own focus chrome (border-color paint + matching ring) so `:user-invalid` + focus combinations stay danger-tinted. New `--set-focus-color` token (defaults to `--set-variant-background-color, --color-primary`) so a single retune at `:root` retunes every focusable element. Forced-colors fallback: `outline: 2px solid Highlight; outline-offset: 2px;`.
- [x] **`src/styles/surfaces/_placeholder.scss`** — `::placeholder` color + opacity surface. Owns the placeholder paint for every form control (`<input>`, `<textarea>`, future search-mode `<select>`). Per-element `--set-input-placeholder-opacity` / `--set-textarea-placeholder-opacity` tokens REMOVED (greenfield clean-up — surface now owns the value via `--set-placeholder-color: currentColor` + `--set-placeholder-opacity: 0.6`). Forced-colors fallback: `color: GrayText; opacity: 1`.
- [x] **`src/styles/surfaces/_marker.scss`** — `::marker` styling shared across `<li>` (and any element with `display: list-item`). New tokens `--set-marker-color` (defaults to `--color-text-muted` so list bullets read as structural hints rather than emphasis ink) and `--set-marker-content` (defaults to `normal` so the UA-generated bullet / decimal / lower-roman from `list-style-type` is preserved). `<summary>` keeps its own custom mask-image SVG marker (already in `elements/_summary.scss`) — it sets `list-style: none` so the surface rule never reaches it.
- [x] **`src/styles/surfaces/_selection.scss`** — variant-tinted `::selection`. New tokens `--set-selection-color` (defaults to `--color-text-strong` for AA contrast against the variant tints) and `--set-selection-background-color` (`color-mix` of `--set-variant-background-color` at 25% alpha so highlighted text stays legible). A `.danger` modifier in a parent retunes its subtree's `--set-variant-background-color`, which `::selection` reads — selection inside a danger-themed panel paints with the danger tint without per-host rules.
- [x] **`src/styles/surfaces/_view-transition.scss`** — `::view-transition-old(root)` / `::view-transition-new(root)` default cross-fade with `--set-view-transition-duration` (defaults to `--set-transition-duration`) and `--set-view-transition-timing-function` (`ease`). Reduced-motion gate collapses to a 1ms animation-duration (an instant cut — disabling outright leaves the UA snapshot suspended in some engines). Surface is inert when no consumer triggers `document.startViewTransition()` or declares `@view-transition { navigation: auto }`; per-name overrides (`::view-transition-old(card-3)`) at the call site beat the default on specificity.
- [x] **`src/styles/surfaces/index.scss`** — barrel.

**Verification:** A `[popover]` panel opens and closes with the entry/exit transition. Modal `<dialog>` paints a dim backdrop; non-modal stays transparent. Every focusable element rings via the surface's `:focus-visible` rule (form controls keep their own border-color paint). `::placeholder`, `::marker`, `::selection` all paint through the surface tokens with sensible defaults. `::view-transition-*` cross-fade ships as an inert default — when a consumer triggers `document.startViewTransition()` or opts into `@view-transition { navigation: auto }` the surface tokens retune the default tween globally. All Phase 7 surfaces shipped.

**Dark-mode tooltip QA (folded into Phase 7):** Introduced semantic `--color-inverted` / `--color-inverted-text` tokens in `_theme.scss` (light: slate-900 + white; dark: slate-100 + slate-900). Re-pinned `_popover.scss`'s hint variant to source from the inverted tier instead of `--color-text` / `--color-white`. The hint surface now stays visually distinct against whichever canvas is active without per-theme overrides at the popover level — light theme paints dark-on-white, dark theme paints light-on-dark, and the inversion produces real contrast in both modes.

---

## Phase 8 — Composables

Each `use*` composable has a paired framework-agnostic factory under `src/browser/factories/`. The composable is a thin Vue adapter; the factory is the logic.

### 8.1 Shared infrastructure

- [x] **`src/browser/constants.ts`** — event-name maps (`DIALOG_EVENTS`, `ASIDE_EVENTS`, …), selector strings (`MENU_ITEM_SELECTOR`, `SELECT_ITEM_SELECTOR`, `FOCUSABLE_SELECTOR`), default timing tokens, data-attribute markers (`BODY_LOCKED_ATTR`, `SELECT_HIDDEN_ATTR`, `TOAST_STACK_ATTR`, …).
- [x] **`src/browser/helpers.ts`** — `assertElement<T>(el, tag, fn)`, `attachListeners(el, list)`, `bindEventMap(el, map, on)`, `dispatch(el, name, detail)`, `emit(el, name, detail)`, `runTransition(el, callback, fallbackMs)`, `waitForFrame()`, `lockBodyScroll()` / `unlockBodyScroll()`.
- [x] **`src/browser/types.ts`** — `{Entity}EventMap`, `Use{Entity}Options`, `Use{Entity}Return`, `Create{Entity}Options`, `Create{Entity}Instance` for every composable.
- [x] **`src/browser/events.ts`** — frozen event-name registry, parity-tested against `constants.ts`.
- [x] **`src/browser/index.ts`** — barrel re-exports tokens, modifiers, elements, events, every composable.
- [x] **`src/browser/factories/index.ts`** — barrel re-exports every factory.
- [x] **`tests/setupBrowser.ts`** — element factory utilities (`createDialogElements`, `createAsideElements`, …), `mountSetup`, `withElement`, `assertCleanDispose`.

### 8.2 Primitives (no specific element)

- [x] `useFocus` ↔ `createFocus` — tab-trap with `activate()` / `deactivate()`.
- [x] `usePointer` ↔ `createPointer` — `pointerdown → pointermove* → pointerup` multiplex with body cursor lock.
- [x] `useDrag` ↔ `createDrag` — HTML5 drag-source pipeline.
- [x] `useDrop` ↔ `createDrop` — drop-target with `relatedTarget`-aware `over` tracking.
- [x] `useTheme` ↔ `createTheme` — singleton theme controller; `data-theme` + `data-core` attributes; `prefers-color-scheme` follow.

### 8.3 Floating-panel layer

- [x] `usePopover` ↔ `createPopover` — `[popover]` toggle + anchor positioning + click-outside dismiss.
- [x] `useTooltip` ↔ `createTooltip` — hover/focus triggers + `role="tooltip"` + `[popover=hint]` panel. Composes `usePopover`.
- [x] `useMenu` ↔ `createMenu` — `<menu popover>` panel + toggle `<button>`. Arrow-key roving, Home/End, click-outside dismiss. Composes `usePopover`.

### 8.4 Element-bound composables

Each binds to one semantic element via `assertElement`. Drawer-shaped CSS lives in matching `src/styles/composables/_{entity}.scss` partials gated on `:popover-open` / `:modal` / `[open]` / `[data-{name}-open]`.

- [x] **`useDialog` ↔ `createDialog`** — `<dialog>` wrapper. Cancellable `show / open / hide / close` over native `showModal()` / `close()`. Escape dismiss, backdrop-click dismiss with `'static'` mode, optional non-modal scroll lock.
- [x] **`useAside` ↔ `createAside`** — `<aside popover="manual">` drawer. Dual-attribute gating (`[data-aside-open]`, `[data-aside-closing]`). Closing attribute persists until next `show()` / `destroy()` — see [composables.md §3](composables.md#3-openclosed-lifecycle).
- [x] **`useDetails` ↔ `createDetails`** — `<details>`. Flips `[open]` synchronously, listens to native `toggle` for external mutation.
- [x] **`useToast` ↔ `createToast`** — `<output popover>`. Auto-hide timer, deck stacking via `[data-toast-stack]`, pause-on-hover, swipe-to-dismiss.
- [x] **`useSelect` ↔ `createSelect`** — `<menu>` listbox + toggle + optional `<input>`. Listbox + combobox + multi-select + autocomplete. Filter via substring + `[data-hidden]` marker.
- [x] **`useTable` ↔ `createTable`** — `<table>`. Sort, paginate, multi-select, row expansion (sync or animated), column resize, focus management.
- [x] **`useForm` ↔ `createForm`** — `<form>`. Constraint-validation pipeline + `[data-form-validated]` + `aria-invalid` mirrors.
- [x] **`useNav` ↔ `createNav`** — `<nav>`. `IntersectionObserver`-driven scroll-spy + `aria-current="location"`.
- [x] **`useButton` ↔ `createButton`** — `<button>`. Toggle state + `aria-pressed`.
- [x] **`useAlert` ↔ `createAlert`** — `[role="alert"]` / `[role="status"]`. Open/dismiss lifecycle.
- [x] **`useTabs` ↔ `createTabs`** — `[role="tablist"]`. Arrow-key roving + lazy panel mount.
- [x] **`useCarousel` ↔ `createCarousel`** — `<section class="carousel">`. Slide nav + autoplay + touch/swipe.

### 8.5 Composable chrome partials

For each composable that needs drawer-shaped CSS (display/position/transform gated on the open-state):

- [x] `src/styles/composables/_aside.scss` — drawer geometry.
- [x] `src/styles/composables/_dialog.scss` — size modifiers (`.small`, `.large`, `.fullscreen`, `.scrollable`). Every modifier that touches `display` MUST gate on `[open]`.
- [x] `src/styles/composables/_select.scss` — listbox/combobox chrome. `[data-hidden]` filter rule.
- [x] `src/styles/composables/_toast.scss` — deck-mode rules. Per-card transform/opacity gates on `:popover-open`.
- [x] `src/styles/composables/_tabs.scss` — indicator + roving tabindex chrome.
- [x] `src/styles/composables/_carousel.scss` — slide track + indicator chrome.

### 8.6 Tests + showcase

For each composable:

- [x] **Factory test** at `tests/src/browser/factories/create{Entity}.test.ts`. Cover construction + ARIA wiring + every action + every event + `preventDefault` cancellation + `destroy()` idempotence + `assertCleanDispose` (no listener/observer/timer leaks).
- [x] **Composable test** at `tests/src/browser/composables/use{Entity}.test.ts`. Mirrors the factory's coverage.
- [ ] **Showcase page** at `app/browser/pages/Use{Entity}Page.vue` demoing the API surface end-to-end on real DOM. **STATUS: not yet built.** Only `HomePage.vue` exists. The previous "[x]" marking was incorrect — see Phase 9 below for the comprehensive per-page roster, authoring contract, and audit rubric that closes this out honestly.

**Verification:** Every composable's factory + composable test passes. Showcase pages are tracked under Phase 9 and gated on the per-page authoring contract; a composable is not "showcase-complete" until its dedicated page is built, audited per rubric, and confirmed by hand-walkthrough in light + dark + mobile + desktop.

---

## Phase 9 — Showcase

> The framework's user-facing proof. Every substantive surface gets a dedicated page that demonstrates the full API on real DOM, audited per the rubric in §9.2, and walked by hand in light + dark + mobile + desktop before being marked done.

### 9.0 Reality

Only `HomePage.vue` exists today. Phase §8.6's previous "[x]" for `Use{Entity}Page.vue` was incorrect — those pages were never built. This phase replaces that lie with an honest roster of ~42 pages, a per-page authoring contract, and a rubric every page passes before it ships.

### 9.1 Shell + chrome (✅ shipped)

- [x] **Sidebar navigation** — `app/browser/components/SiteNav.vue` with filter input + grouped route list. **Note for §9.3:** will need a collapsible-group treatment once the page roster grows past ~15 entries; today it's a flat list that works fine for one route.
- [x] **In-page TOC** — `app/browser/components/Toc.vue` reading `section[id]` inside the scroller, building an on-this-page list.
- [x] **Theme toggle** — banner-mounted dark/light/system switch using `useTheme`.
- [x] **Mobile drawer** — sidebar slides in via two-state (`leftOpen` / `rightOpen`) backdrop dismiss in `App.vue`.

### 9.2 The page authoring contract

Every showcase page MUST:

1. **Live under `app/browser/pages/{Name}Page.vue`** and be registered in `app/browser/router.ts` under the appropriate `group`.
2. **Open with an `hgroup`** — `<h1>` page title + `<p>` one-sentence framing.
3. **Cover the full API surface** for the symbol it documents:
   - Element pages: every variant × every size × every style × every relevant state, plus per-element idiosyncrasies (focus-ring, disabled, placeholder, etc.).
   - Composable pages: every action method, every event, every option key — wired live, not narrated.
4. **Use real, framework-only markup.** Tailwind utilities are reserved for last-mile fine-tuning (layout assists, spacing). The page itself is the proof that the framework's chrome is hydrated.
5. **Live demos, not screenshots.** Every example is interactive — clicking the button paints the active state, opening the dialog runs the real transition, sorting the table calls the real factory.
6. **Code samples sit beside their demos.** A `<details>` / `<pre><code>` block per example lets readers copy the markup.
7. **Section IDs** on every major heading so the right-rail TOC picks them up and the URL hash deep-links work.
8. **Pass the rubric in §9.3 before being marked `[x]`.**

### 9.3 The per-page audit rubric

A page is not done until each row is verified by hand-walkthrough (preview server, real browser):

| Dimension               | What to verify                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Light mode contrast** | Every text/border meets WCAG AA (4.5:1 normal text, 3:1 large text + non-text). Spot-check variants on tinted backgrounds.                                                                                                                                                                                                                                      |
| **Dark mode contrast**  | Same bar in `[data-theme="dark"]`. Variant-tinted surfaces (alerts, toasts, badges, hint tooltips) reach AA — the subtle/emphasis triplets do not auto-survive dark, they must be checked.                                                                                                                                                                      |
| **Focus paths**         | Tab order matches visual order. Focus ring visible on every interactive element. `:focus-visible` only fires on keyboard nav (not mouse click). Modal traps focus on `useDialog` pages; tab-trap demos verify the entry/exit.                                                                                                                                   |
| **Mobile (375)**        | No horizontal scroll. Drawer toggles dismiss when an interaction lands. Every action is reachable; no overlapping chrome. Toast / dialog / popover all sit inside the viewport with safe-area gutters.                                                                                                                                                          |
| **Tablet (768)**        | Body grid reflows cleanly (no orphaned sidebar or TOC stub). Composables that have placement variants pick sensible defaults.                                                                                                                                                                                                                                   |
| **Desktop (1440)**      | Generous spacing, no stretched-thin elements. Inline-size caps (`--set-floater-max-inline-size`, `--set-popover-max-inline-size`, `--set-toast-inline-size`) prevent over-wide chrome.                                                                                                                                                                          |
| **Reduced motion**      | All transitions collapse via `prefers-reduced-motion: reduce` (the `transition()` mixin guarantees this; verify per page that no inline `transition:` slipped past the mixin). Composable entry/exit motion shortens to instant (the popover surface's `transition-behavior: allow-discrete` still keeps the discrete display flip but the visual tween skips). |
| **Forced colors**       | Windows High Contrast: focus rings survive (`outline: 2px solid Highlight`), borders + text remain visible, custom backgrounds collapse to `Canvas`.                                                                                                                                                                                                            |
| **Keyboard nav**        | Every action reachable via keyboard. APG-defined patterns wire arrow keys (menu, tablist, select, table-row, carousel-indicator) and Esc dismissal (dialog, drawer, popover, toast on Esc-to-pause).                                                                                                                                                            |
| **Reader sanity**       | Section IDs present and TOC populated. Code samples copy cleanly. Hash deep-links resolve. No console warnings (Vue or otherwise).                                                                                                                                                                                                                              |

A page that fails any row gets fixed in-place before being marked done — the rubric is the gate, not aspirational.

### 9.4 The page roster

42 pages, grouped to match the natural mental model of the framework. Each line is a TODO; check it off only after the rubric in §9.3 passes.

#### Foundations (4)

- [ ] **TokensPage** — every `--set-*` leaf surfaced with its live computed value; retune playground (consumer pins `--set-border-radius: 0` and watches every rounded surface flatten); icon registry preview; elevation scale demonstration.
- [ ] **ThemePage** — light / dark / system, brand retune (`--color-primary` slider drives variant cascade across every surface on the page), inverted tier, surface / text / border tier demonstration, subtle / emphasis / border-subtle triplets per variant.
- [ ] **ModifiersPage** — variant × size × style × state cascade demonstration. Single shared markup, 16+ rendered permutations.
- [ ] **PlacementsPage** — popover anchor positioning live (`.top`, `.bottom`, `.start`, `.end`, plus corners), `position-try-fallbacks` flip demo, viewport-clamp behaviour.

#### Elements — Interactive (5)

- [x] **ButtonPage** — the cascade reference. Every variant × every size × every style × every state, with focus-ring + hover + disabled side-by-side, icon-buttons, loading states, link-as-button. _Landed alongside dark-mode bare-button visibility fix and the spinner-visibility tune-up._
- [x] **AnchorPage** — bare anchor (in-body), anchors in header / footer / nav-rail / TOC contexts (the §6.1 context contract proved out), variant anchors, `.filled` anchors, external-link affordance, visited state. _Surfaced the variant-text-on-canvas WCAG gap, which drove the framework-wide `--color-{variant}-on-canvas` tier addition (see "Phase 9 cross-cutting changes" below)._
- [x] **FormControlsPage** — input (every `type=`), textarea (auto-resize), select (native), label, fieldset + legend, output (calc-chip flavour), progress, meter (optimum / sub-optimum / even-less-good). One mega-page; subsections per control. _Surfaced a framework bug in `components/_form.scss` — the `form > label > :is(input, …) { inline-size: 100% }` rule was matching every input type and stretching checkboxes / radios / color swatches to row width. Fixed by excluding `[type='checkbox']` / `[type='radio']` / `[type='color']` from the selector (range + file keep the 100%). Recorded in §9.7._
- [ ] **DetailsPage** — bare details, group accordion, nested, custom marker via `--set-summary-marker-image`, smooth open/close (`interpolate-size: allow-keywords`).
- [ ] **DialogElementPage** — bare `<dialog>` element baseline (modal / non-modal, `open` flow vs `showModal()`), modifier classes (`.small`, `.large`, `.fullscreen`, `.scrollable`), backdrop scrim. _(Live composable wiring is on `UseDialogPage`.)_

#### Elements — Content (4)

- [ ] **HeadingsPage** — `<h1>`–`<h6>` cascade, `<hgroup>` heading + tagline, document outline best practices.
- [ ] **TypographyPage** — `<p>`, `<blockquote>`, `<abbr>`, `<mark>`, `<address>`, `<code>`, `<kbd>`, `<samp>`, `<var>`, `<pre>`, `<small>`, `<strong>`, `<em>`, `<ins>`, `<del>`, `<s>`, `<q>`, `<sub>`, `<sup>`, `<time>`, `<data>`, `<u>`, `<hr>`. Each in body-copy context.
- [ ] **ListsPage** — `<ul>` / `<ol>` / `<li>` (with `::marker` surface variants), `<dl>` / `<dt>` / `<dd>` (definition pairs, multi-term, multi-definition).
- [ ] **TablesPage** — `<table>` element baseline: `<caption>`, `<thead>` / `<tbody>` / `<tfoot>`, `<tr>` / `<th>` / `<td>`, sticky header, striped rows, hover, sort indicators (static — interactive sort lives on `UseTablePage`).

#### Elements — Media & Sectioning (3)

- [ ] **MediaPage** — `<img>`, `<video>`, `<audio>`, `<canvas>`, `<svg>` (inline + viewBox-only), `<iframe>`, `<embed>`, `<object>`, `<picture>` (`display: contents` structural rule).
- [ ] **FiguresPage** — `<figure>` + `<figcaption>` with image / code / table / pull-quote variants.
- [ ] **SectioningPage** — `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`, `<nav>`, `<search>`, `<hgroup>`. Demonstrates the body-grid layout shell, the substantive sectioning hydration (flex-column rhythm, `--set-sticky-offset` scroll-margin), nesting collapse behaviour.

#### Components (5)

- [ ] **ArticleCardPage** — bare `<article>` as card, `.filled` opt-in, header / footer / menu compositions, elevation, callout via descendant `<aside>`.
- [ ] **AsidePage** — sidebar context (body-shell), inline pull-quote (article descendant), alert banner (`role="alert"` with variant cascade), forced-colors fallback.
- [ ] **NavPage** — body-rail nav (sidebar), breadcrumb (`<ol>` with `aria-label="Breadcrumb"`), pagination chrome, tablist composition.
- [ ] **MenuPage** — bare menu (toolbar / action row), card-action row (`article menu`), nav-rail rows (`body > nav menu`), dropdown menu (`<menu popover>`).
- [ ] **InlineAtomsPage** — `.badge`, `.dot` (with pulse), `.tag` (chip-shaped), `.spinner`, `.skeleton`. Variant cascade demonstration per atom.

#### Surfaces (3)

- [ ] **PopoverSurfacesPage** — `[popover=auto]`, `[popover=manual]`, `[popover=hint]` / `[role="tooltip"]`, `dialog:modal::backdrop` scrim, anchor positioning with `position-try-fallbacks`, hint variant inversion.
- [ ] **FormSurfacesPage** — focus-ring (variant-tinted, form-control opt-out, forced-colors fallback), `::placeholder`, `::marker`, `::selection`. Live demonstrations on real form controls and list items.
- [ ] **ScrollAndTransitionPage** — scrollbar surface (thin / stable gutter), `::view-transition-*` (consumer-triggered `document.startViewTransition()` demo so the default fade actually fires).

#### Composables — Primitives (4)

- [ ] **UseFocusPage** — tab-trap on a panel; activate / deactivate cycling; verify trapped focus + restore on deactivate.
- [ ] **UsePointerPage** — drag multiplex on a custom slider thumb; body cursor lock during drag.
- [ ] **UseDragDropPage** — `useDrag` source + `useDrop` target pair (paired because they're useless alone). Reorderable list with `relatedTarget`-aware `over` tracking.
- [ ] **UseThemeButtonPage** — `useTheme` controller (light / dark / system / explicit) + `useButton` toggle (`aria-pressed`) — paired because both are tiny-surface composables that benefit from a shared canvas.

#### Composables — Floating Layer (3)

- [ ] **UsePopoverPage** — toggle + anchor positioning + click-outside dismiss + every placement modifier + composed with `useTooltip` / `useMenu` (which build on it).
- [ ] **UseTooltipPage** — hover + focus triggers, `role="tooltip"`, `[popover=hint]` panel, delay-show / delay-hide, multi-trigger.
- [ ] **UseMenuPage** — `<menu popover>` panel + toggle, arrow-key roving, Home / End, click-outside dismiss.

#### Composables — Element-Bound (11)

- [ ] **UseDialogPage** — modal vs non-modal, every dismissal path (Esc, backdrop, programmatic), `'static'` mode (no backdrop dismiss), scrollable + fullscreen modifiers, non-modal scroll-lock.
- [ ] **UseAsidePage** — drawer mode (`<aside popover="manual">`) at every edge (`.start`, `.end`, `.top`, `.bottom`), backdrop dismiss, `[data-aside-closing]` lifecycle exposed.
- [ ] **UseDetailsPage** — programmatic open / close synced with native `toggle`, animated height, group accordion (one-open-at-a-time pattern).
- [ ] **UseToastPage** — linear stack (default), Sonner-deck mode (`[data-toast-stack]`), auto-hide timer + pause-on-hover, swipe-to-dismiss, variant tinting, hidden-overflow indicator.
- [ ] **UseSelectPage** — listbox + combobox + multi-select + autocomplete + typeahead filter. Three sub-demos: native select repaint, custom listbox, combobox with sticky search.
- [ ] **UseTablePage** — sort (one / multi-column), paginate, multi-select with shift-range, row expansion (sync + animated), column resize, focus management, sticky header.
- [ ] **UseFormPage** — constraint-validation pipeline, `[data-form-validated]` after first submit, per-field `aria-invalid` mirror, summary error region, submit-disabled-on-invalid.
- [ ] **UseNavPage** — scroll-spy on a long article with anchored sections; `aria-current="location"` flips as scroll position passes section boundaries.
- [ ] **UseAlertPage** — `useAlert` open / dismiss lifecycle, transition collapse, polite vs assertive (`role="alert"` vs `role="status"`), persistence across re-mounts.
- [ ] **UseTabsPage** — `[role="tablist"]` arrow-key roving, lazy panel mount, vertical vs horizontal orientation, manual vs automatic activation.
- [ ] **UseCarouselPage** — slide nav, autoplay + pause-on-hover, touch / swipe, indicator dots, variant-tinted slides, every-axis transition lifecycle.

### 9.5 Sidebar nav adjustments needed before page #15

The current flat list works for 1–14 pages. By the time the roster hits ~15 entries:

- [ ] **Group-collapsible sidebar** — `<details><summary>{group}</summary><menu>…</menu></details>` per group so the rail isn't a 42-line scroll.
- [ ] **Keyboard nav inside the rail** — arrow keys move focus between visible items; `[` / `]` collapse / expand groups.
- [ ] **Active-page state** — `aria-current="page"` paint already shipped; verify it survives the collapsible-group treatment.

### 9.6 Cross-page polish (run AFTER all pages exist)

- [ ] **Theme retune end-to-end** — pin a brand color at `:root` and walk every page; verify the cascade reaches focus rings / toasts / alerts / selections / popovers / tabs / breadcrumbs.
- [ ] **Reduced-motion full-suite** — verify every animation + transition collapses across all 42 pages.
- [ ] **Forced-colors full-suite** — Windows High Contrast walkthrough.
- [ ] **Console-clean full-suite** — boot the dev server, walk every page, capture zero Vue warns / zero Tailwind missing-source warns.

### 9.7 Phase 9 cross-cutting framework changes

Phase 9 occasionally surfaces a gap that can't be fixed inside a single page — the rubric catches a framework-wide regression the page authoring revealed. Record those landings here so the API surface diff stays visible across pages.

- [x] **`--color-{variant}-on-canvas` tier** — added a third per-variant tier (sibling to `bg-subtle` / `text-emphasis` / `border-subtle`) for variant text painted directly on the canvas surface. Surfaced by AnchorPage: bare variant anchors using the saturated `-600` step failed WCAG AA against `--color-canvas` for amber/green/sky in light mode and most variants in dark mode. The new tier is tuned per-mode via `color-mix(in oklab, var(--color-{variant}) {70|80}%, var(--color-text))` so the same token clears AA in both themes. Naming follows Material Design's `on-X` convention — the suffix names the surface the color is safe ON. Migrations landed across:
  - `elements/_a.scss` — bare anchor cascade fallback
  - `elements/_label.scss` — bare label color fallback
  - `components/_form.scss` — invalid-field label highlight
  - `components/_header.scss` / `_footer.scss` — anchor hover color
  - `components/_menu.scss` — aside-TOC `aria-current="location"` + select-popover `aria-selected="true"`
  - `components/_nav.scss` — `--set-tab-active-color`
  - `modifiers/_variants.scss` — `--set-variant-on-canvas-color` exposed per variant
  - `_theme.scss` — light / dark / `[data-theme='dark']` blocks
  - `src/browser/tokens.ts` — TS mirror
- [x] **Hgroup tagline color** — `--set-hgroup-tagline-color` migrated from `--color-text-subtle` (slate-400/500, placeholder-tier) to `--color-text-muted` (slate-600/400) — surfaced by AnchorPage's tagline reading as washed-out in both modes. `--color-text-subtle` is reserved for placeholder-like dimming; metadata under a heading is a secondary-text context.
- [x] **`<dl>` responsive shape** — `_dl.scss` now stacks single-column below 640px and uses `minmax(0, max-content) minmax(0, 1fr)` + `overflow-wrap: anywhere` on `<dt>`/`<dd>` at wider widths. Previous `max-content 1fr` let long terms push the page wider than the viewport, surfaced by AnchorPage's token-reference list.

Skip-listed (not text contrast, decisions deferred):

- `elements/_blockquote.scss` — `--set-blockquote-color` is the leading-bar (border), not text; the 4px stripe at the saturated `-600` step stays as visual identity.
- `elements/_progress.scss` — fill paints over the track, not directly over canvas; track-contrast tuning is a separate design decision.
- `elements/_meter.scss`, `components/_dot.scss`, `elements/_hr.scss` — fills / decorations / separators; not text.
- `_button.scss` — variant on `<button>` is always a fill (white-on-`-600`); a bare variant button without `.subtle` / `.filled` paints filled by default, so there's no bare-variant-text-on-canvas case.

- [x] **`form > label > input` inline-size scoping** — `components/_form.scss` was forcing `inline-size: 100%` on every direct-child input inside a `<form>`, which stretched checkboxes (`1em` intended), radios (`1em`), and color swatches (`3rem`) to the full row width. Surfaced by FormControlsPage. Fixed by excluding `[type='checkbox']` / `[type='radio']` / `[type='color']` from the selector; `range` and `file` keep the 100% because the slider track + file-picker row are meant to fill their container. The framework's bare-`<form>` pattern now plays nicely with mixed text-input + checkbox-row layouts.

### 9.8 Working cadence

The user has explicitly chosen **Phase 9 Option A** — page-by-page, no batching. Per turn:

1. Build ONE page end-to-end, every example interactive, code samples beside demos.
2. Run the rubric in §9.3 — preview server, light + dark, 375 / 768 / 1440, focus paths, console clean.
3. Land fixes inline; never declare done with an unticked rubric row.
4. Hand to user for sample + report.
5. User feedback → fix → re-rubric → mark `[x]`.
6. Commit.

No skipping ahead. No batching pages. The pages that exist are real; the pages that don't are honestly tracked as `[ ]`.

---

## Phase 10 — Distribution

- [x] **Dual-build verification** — `dist/src/styles/index.css` (CSS bundle) + `dist/src/browser/` (TS bundle, ESM + CJS). Build scripts wired in `package.json` (`build:src:styles`, `build:src:browser`).
- [x] **`package.json` exports map** — `"./styles"` → CSS bundle, `"./browser"` → TS entry. SCSS sources also exposed at `"./styles/scss"` for consumers who want to compile their own.
- [x] **Consumer setup snippet** in [README.md](../README.md) — cascade layer order declaration before `@import 'tailwindcss'`, framework CSS import, TS composable / factory / registry imports, PostCSS pipeline note. Includes hydrated-baselines example, modifier-cascade example, composable wiring, theming, and architecture-rules TL;DR.
- [x] **NPM publish dry-run** — `npm pack --dry-run` lists 146 files at ~363 KB packed / 1.6 MB unpacked. Tarball contains `dist/src/{styles,browser}/`, `dist/src/styles/scss/` (raw partials for downstream Sass consumers), `dist/app/browser/` (showcase build artifacts), `dist/showcase/index.html`, plus `README.md` and `package.json`. No source maps for SCSS, no test fixtures, no `.ts` files leaked into the SCSS copy (filtered in `configs/src/vite.styles.config.ts`'s `copyScss` plugin). _(Note: rebuild before re-running if the SCSS source has changed — `cpSync` copies whatever's in `src/styles/` at the last `build:src:styles`.)_
- [~] **CHANGELOG.md** — intentionally NOT shipped. Greenfield framework: breaking changes are encouraged until the API surface settles, so a per-release changelog would log noise rather than signal. Revisit when the framework hits a stable contract worth pinning.

---

## Phase 11 — Invariants verification

Before declaring done, run the framework-wide invariants checklist (also covered in each guide):

- [x] **Cascade layer order** — `@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;` is the only multi-layer declaration in the codebase. Lives in exactly two files (`tests/setup.css`, `app/browser/styles/main.css`); per-partial wrappers are single-name (`@layer elements { … }`, `@layer components { … }`, etc.). Audited via `Select-String -Pattern '@layer\s+\w+\s*,' src/**/*.scss tests/**/*.css app/**/*.css`.
- [x] **Token-driven variation** — no element partial contains a `&.primary { color: ... }`-style block. Variation flows through `--set-style-*` → `--set-variant-*` → element default. Last spot-check found zero exceptions.
- [x] **No Tailwind-palette leaks outside `_theme.scss`** — `Select-String -Pattern 'color-(slate|blue|zinc|gray|stone|red|green|sky|amber)-' src/styles/{elements,components,surfaces,composables}/*.scss` returns empty. The two known historical leaks (`<dd>` color → `--color-text-muted`, `<address>` color → `--color-text-muted`) are fixed.
- [x] **No hardcoded color literals outside fallbacks** — `Select-String -Pattern '\b(rgb|rgba|hsl|hsla|oklch|oklab)\s*\(' src/styles/{elements,components,surfaces,composables}/*.scss` clean. The two prior leaks in `surfaces/_popover.scss` (tooltip `rgb(15 23 42 / 0.95)` background and inline tooltip `box-shadow`) now consume `color-mix(in srgb, var(--color-inverted) 95%, transparent)` (theme-tracking inverted surface) and `var(--set-box-shadow-sm)` respectively. Article elevation, toast elevation, dialog elevation already route through `--set-box-shadow-sm` / `--set-box-shadow` / `--set-box-shadow-lg`. Dark-mode tooltip QA RESOLVED in Phase 7: `--color-inverted` flips with theme so the inversion stays distinct against both canvases without a per-popover dark-theme re-pin.
- [x] **Open/closed dual-attribute gating** — walked every `Select-String -Pattern 'display:\s*flex|position:\s*fixed' src/styles/composables/*.scss src/styles/components/*.scss` match. **Popover-bearing rules that touch `display:` are gated**: `dialog.scrollable[open]` (`composables/_dialog.scss:53`), `aside[popover][data-aside-open], aside[popover][data-aside-closing]` (`composables/_aside.scss:99,110` — dual-attribute), `output[popover]:popover-open` (`components/_output.scss:138`), `menu[popover]:popover-open, [popover]:popover-open menu, [popover]:popover-open > menu` (`components/_menu.scss:328`), and `menu:not([popover])` (`components/_menu.scss:75`). **Position:fixed on closed popovers is benign** — UA `[popover]:not(:popover-open) { display: none }` still wins (`display` is what the UA hides through; `position` alone doesn't defeat it). `output[popover]` (`_output.scss:206`) and the toast deck indicator `[data-toast-stack] [data-toast-indicator]` (`composables/_toast.scss:263`) are fine. **In-flow rules** (`<form>`, `<header>`, `<footer>`, `<article>`, `<div class="stack">`, `<nav>`, `<search>`, `[role='group']`, `[role='tablist']`, `aside[role='alert']`, carousel items / controls / indicators) are NOT popovers and need no gating; their visibility lifecycle is owned by their respective composables (`useAlert` opacity + block-size, `useCarousel` lifecycle classes, etc.) or they're always-visible chrome.
- [x] **Bidirectional parity** — `tokens.test.ts`, `modifiers.test.ts`, `elements.test.ts`, `events.test.ts` all pass (953/953 in `src:browser`).
- [x] **Test coverage** — every element/composable/factory has a behaviour test. `src:styles`: 344/344. `src:browser`: 658/658 (tokens parity scope after view-transition surface addition). Last full-suite run: 1325/1325 prior to view-transition surface; new tokens (`--set-view-transition-{duration,timing-function}`) absorbed cleanly by `tests/src/browser/tokens.test.ts` SURFACE_PARTIALS scan.
- [x] **No mojibake** — every `.md` under `guides/` is valid UTF-8. (Re-validate after each major edit pass.)
- [x] **Lint + typecheck clean** — `npm run check` exits 0 (138 files, 0 warnings, 0 errors).

---

## Reference

- [styles.md](styles.md) — top-level architecture and authoring contract.
- [tokens.md](tokens.md) — the variation surface (Phase 2).
- [mixins.md](mixins.md) — Sass helpers (Phase 3).
- [modifiers.md](modifiers.md) — four-dimension cascade (Phase 4).
- [elements.md](elements.md) — HTML element catalog (Phase 5).
- [components.md](components.md) — element compositions (Phase 6).
- [surfaces.md](surfaces.md) — browser-rendered chrome (Phase 7).
- [composables.md](composables.md) — Vue + factory layer (Phase 8).

Each phase corresponds to one guide. Finishing the phase means the guide is fully realised. The guides describe the framework as it exists when this plan is complete.
