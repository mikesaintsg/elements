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
- **Elevation** — `--set-box-shadow-{sm,base,lg}` for the three "lift" tiers consumed by every floating surface.
- **Focus** — `:focus-visible` ring painted via `focus-ring()` mixin consuming `--set-focus-*` tokens.
- **Animations / transitions** — every `transition:` paired with `prefers-reduced-motion: reduce` opt-out via `@include transition()`; every `animation:` paired with `@include reduced-motion { animation: none }`. Durations consume `--set-transition-duration`.
- **Interactions** — hover / focus / active / disabled / loading all painted with appropriate cursor + visual state.
- **Themes** — light / dark flip on `[data-theme]` retunes everything without per-component override; consumer can pin a brand color at `:root` and the cascade re-tunes every consumer.
- **Customizability** — every visible value flows through a `--set-*` token; no inline hex, no magic numbers in element / component / surface partials.

Each phase below explicitly notes the baseline-hydration items its scope owns. A phase is not "done" until every element / component / composable in its scope passes the hydration checklist above.

---

## Phase 0 — Repo bootstrap

- [ ] Install dependencies: `vue@^3`, `@vue/reactivity`, `tailwindcss@^4`, `@tailwindcss/postcss`, `sass`, `vite`, `vitest`, `@vitest/browser`, `playwright`, `vue-tsc`, `oxlint`, `oxfmt`.
- [ ] Create folder skeleton:
  ```
  src/styles/{elements,components,surfaces,composables,modifiers}/
  src/browser/{composables,factories}/
  app/browser/{pages,styles}/
  tests/src/{styles,browser}/
  guides/
  ```
- [ ] Wire `vite.config.ts` for the framework build (`src/styles/index.scss` → `dist/src/styles/index.css`) and for the TS bundle (`src/browser/index.ts` → `dist/src/browser/`).
- [ ] Wire `configs/app/vite.showcase.config.ts` for the showcase build with `vite-plugin-singlefile` so demos can be shipped as one HTML.
- [ ] Wire `configs/src/vite.styles.config.ts` for the CSS-only build of the framework (used by NPM consumers who don't want to compile SCSS).
- [ ] Wire `vite.config.ts` for Vitest with browser environment + `tests/setup.ts` (DOM helpers) and `tests/setup.css` (cascade layer order).
- [ ] Add NPM scripts: `dev`, `build`, `build:src:styles`, `build:src:browser`, `test`, `check` (`oxlint --fix` + `vue-tsc --noEmit`), `format` (`oxfmt --write .`), `show` (`build:showcase` + copy to `demo/showcase.html`).

**Verification:** `npm install` succeeds; `npm run check` exits 0 against an empty src tree.

---

## Phase 1 — Style entry + cascade layer order

The cascade layer order is the load-bearing invariant. Get it wrong and modifiers don't beat element baselines, popover surfaces leak into composable rules, and Tailwind utilities lose to framework rules.

- [ ] Create `tests/setup.css`:
  ```css
  @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
  @import 'tailwindcss';
  ```
- [ ] Create `app/browser/styles/main.css` (the single CSS entry):
  ```css
  @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
  @import 'tailwindcss';
  @import '../../../src/styles/index.scss';
  @source '../../../src/styles';
  @source '../../../app';
  #app {
  	display: contents;
  }
  ```
- [ ] Create `src/styles/index.scss` as the framework barrel:
  ```scss
  @use 'tokens';
  @use 'theme';
  @use 'mixins';
  @use 'elements';
  @use 'components';
  @use 'surfaces';
  @use 'composables';
  @use 'modifiers';
  ```
- [ ] Create empty `index.scss` files in each subfolder (`elements/index.scss`, `components/index.scss`, …) so the barrel resolves even before partials land.

**Verification:** `npm run build:src:styles` succeeds and emits an empty `dist/src/styles/index.css` (just the cascade layer declaration). `npm run dev` boots Vite without errors.

---

## Phase 2 — Tokens

The variation surface every element, component, and modifier reads through.

- [ ] **`src/styles/_tokens.scss`** — `:root` declarations for every framework-owned `--set-*` token. Three families:
  - **Variation surface** — focus ring (`--set-focus-box-shadow-{width,opacity}`), variant context (`--set-variant-{color,background-color,border-color,border-width}`), density / radius factors, transition duration.
  - **Baseline hydration** (Bootstrap-parity defaults so a bare element looks "alive" without per-component overrides):
    - `--set-border-radius`, `--set-border-width` — default rounded-corner + border thickness for any element that hasn't been sized.
    - `--set-gap`, `--set-stack-spacing` — default flex/grid gap and sibling vertical rhythm.
    - `--set-sticky-offset` — `scroll-padding-block-start` budget.
    - `--set-z-index-{sticky,fixed,dropdown,modal,popover,tooltip,toast}` — Bootstrap-style layering scale (top-layer surfaces still take precedence; this scale governs in-flow chrome + consumer-authored layering).
    - `--set-box-shadow-{sm,base,lg}` — three-tier elevation scale for floating surfaces.
    - `--set-icon-*` — single overridable inline-SVG library for every chrome glyph.
    - `--set-floater-*` — viewport-clamped sizing budget for top-layer panels.
  - Every value is a real `:root` declaration — never a `var(…, fallback)` inlined elsewhere — so consumers can override at one global scope without forking partials.
- [ ] **`src/styles/_theme.scss`** — `@theme` block registering semantic colour variants (`--color-primary`, `--color-success`, …) so Tailwind generates matching `.bg-*` / `.text-*` / `.border-*` utilities. `:root` block of surface / text / border tier tokens (`--color-canvas`, `--color-text`, `--color-border`, …) and per-variant `bg-subtle / text-emphasis / border-subtle` triplets derived via `color-mix()`. Dark-mode overrides under `[data-theme="dark"]` (and `prefers-color-scheme: dark` follow on `:root:not([data-theme])`).
- [ ] **`src/browser/tokens.ts`** — TypeScript mirror of every `--set-*` token. Frozen object tree of string literals + derived union types.
- [ ] **`tests/src/browser/tokens.test.ts`** — bidirectional parity: every TS leaf resolves on `:root`, every `--set-*` in any SCSS partial appears as a TS leaf.

**Verification:** Tests pass. Open DevTools on a blank page, inspect `:root` — every token in `tokens.ts` is present and has a non-empty resolved value (no token whose only definition is a `var(…, fallback)` chain).

---

## Phase 3 — Mixins

Shared SCSS helpers every partial reaches for.

- [ ] **`src/styles/_mixins.scss`** with these mixins (each documented in [mixins.md](mixins.md)):
  - `@mixin reduced-motion` — `@media (prefers-reduced-motion: reduce) { @content; }`
  - `@mixin transition($value)` — declares `transition: $value` and nests `reduced-motion { transition: none; }`
  - `@mixin focus-ring($alpha)` — paints the framework focus shadow using `--set-variant-background-color` and the focus sub-tokens.
  - `@mixin forced-colors` — `@media (forced-colors: active) { @content; }`
  - `@mixin truncate` — single-line text ellipsis.
  - `@mixin size-container($name)` — container-query setup with a stable `container-name`.
  - `@mixin floater-bounds($name, $axis)` — viewport-clamped max-inline / max-block-size using `--set-floater-*` tokens.
  - `@mixin floater-side-insets($name)` / `@mixin floater-edge` / `@mixin floater-fullscreen` — composable inset patterns for tooltips/popovers/toasts.
  - `@mixin palette-each` — `@each` loop over the `$variants` Sass list.
- [ ] Sass list constants alongside the mixins: `$variants`, `$sizes`, `$styles`, `$states` — used by `@each` loops in modifier partials. (Shape is **not** a modifier dimension; corner-roundness is driven by `--set-radius-factor` in [tokens.md](tokens.md) and the `.rounded` / `.pill` family is reserved to Tailwind utilities. See [modifiers.md](modifiers.md).)

**Verification:** A trivial element partial that `@include`s `transition()` compiles and ships both the transition and the reduced-motion override.

---

## Phase 4 — Modifiers

Four orthogonal dimensions plus placement and state. The variation surface every element consumes.

- [ ] **`src/styles/modifiers/_variants.scss`** — `.primary`, `.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information`. Each sets `--set-variant-color`, `--set-variant-background-color`, `--set-variant-border-color`. Variant identity color = the variant's background color; contrast text is white or black depending on luminance.
- [ ] **`src/styles/modifiers/_sizes.scss`** — `.small`, `.large`. Each sets `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius` from Tailwind scales. (Default size is bare-element; `.huge` is **not** part of the surface — it would clash with Tailwind text-\* utilities.)
- [ ] **`src/styles/modifiers/_styles.scss`** — `.ghost`, `.filled`. Each rewrites `--set-style-{color, background-color, border-color}` by consuming the variant context. (`.outline` is reserved to Tailwind's `outline-*` family; the framework's outlined look is the bare-element default.)
- [ ] **`src/styles/modifiers/_states.scss`** — `.disabled`, `.active`, `.loading`. Typically just toggle existing element rules.
- [ ] **`src/styles/modifiers/_placements.scss`** — `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end`. Map to CSS `position-area` keywords. Scoped to `[popover]:not([popover='manual'])` so per-element placement semantics on `<aside>` / `<nav>` / `<output>` aren't disrupted.
- [ ] **`src/styles/modifiers/index.scss`** — barrel.
- [ ] **`src/browser/modifiers.ts`** — TS mirror: frozen object tree of class names + derived `Variant`, `Size`, `Style`, `State`, `Placement` union types.
- [ ] **`tests/src/browser/modifiers.test.ts`** — bidirectional parity test.
- [ ] **`tests/src/styles/modifiers/_{name}.test.ts`** — one test per modifier dimension verifying the rule emits the expected `--set-*-*` token values.

**Verification:** Every modifier class resolves correctly when applied to a sample `<div>` mounted in a test fixture.

---

## Phase 5 — Element baselines

One partial per HTML tag. Token-driven baselines + UA-quirk resets. The `<button>` partial is the reference implementation; bring it up first, then port the cascade pattern to every other substantive element.

### 5.1 Reference implementation — `<button>`

- [ ] **`src/styles/elements/_button.scss`** with the full `--set-button-*` cascade. Token fallback chain: `--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor))`. Same shape for background, border, radius, padding, font-size, transition. Hover / active / focus / disabled rules read through the tokens.
- [ ] **`src/browser/elements.ts`** — register `button`. TS object frozen as `as const` + derived `Element` union type.
- [ ] **`tests/src/browser/elements.test.ts`** — bidirectional parity: every TS element has a partial declaring at least one `--set-{tag}-*` token.
- [ ] **`tests/src/styles/elements/_button.test.ts`** — bare button paints, modifier cascade reaches the root tokens, every variant / size / style / shape / state combination resolves the expected color/padding/radius.
- [ ] **`app/browser/pages/ButtonPage.vue`** — showcase demo of every variant + size + style + shape + state combination.

### 5.2 Form controls

- [ ] `<input>`, `<textarea>`, `<select>`, `<label>`, `<fieldset>` + `<legend>`, `<output>`, `<progress>`, `<meter>` — each with the same cascade pattern. Per-element quirks documented inline.
- [ ] Add each to `elements.ts`, write per-element behaviour tests, write showcase pages.

### 5.3 Interactive elements

- [ ] `<a>` (substantive — keeps underline by default; variants tint text; `.filled` fills with the variant identity and drops the underline).
- [ ] `<details>` + `<summary>` (substantive — `interpolate-size: allow-keywords` for CSS-driven height animation).
- [ ] `<dialog>` (substantive — `:modal` centers via `position: fixed; translate: -50% -50%`; `[open]:not(:modal)` flows inline at source position).
- [ ] `<table>` family (`<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`).
- [ ] `<h1>`–`<h6>` (shared `--set-heading-*` cascade — six tags, one partial).

### 5.3a Sectioning content

Sectioning landmarks the framework treats as **hydrated containers**, not invisible block boxes. Bare element + per-element token surface; no class needed.

- [x] `<main>` (substantive — fluid inline padding gutter via `clamp(1rem, 5vw, …)` + page-level vertical gap; component-layer `overflow-y: auto` layered on top inside the body grid).
- [x] `<section>` (substantive — flex-column with `--set-section-padding-block` + `--set-section-gap` so a bare section reads with proper rhythm; nested `<section>` inside `<main>` / `<section>` / `<article>` collapses its padding-block to avoid double-counting; `scroll-margin-block-start` consumes `--set-sticky-offset` so deep links land clear of sticky headers).
- [x] `<hgroup>` (substantive — tight flex-column gap + subordinate `<p>` margin reset and subdued color/font-size so the tagline reads as metadata).
- [x] **Audit pass for the rest:** `<header>`, `<footer>`, `<nav>`, `<aside>`, `<article>`, `<form>`, `<menu>`, `<search>`, `<details>`, `<dialog>` all already substantive at element or component layer; baseline-hydration audit clean (token surfaces present, anchor / button context defaults applied per §6.1, elevation through `--set-box-shadow-*`, focus rings via `focus-ring()`).

### 5.4 Typography overrides

- [ ] `<abbr>`, `<address>`, `<mark>`, `<p>`, `<hr>`, `<blockquote>`, `<code>`, `<kbd>`, `<samp>`, `<var>`, `<pre>`, `<dl>` + `<dt>` + `<dd>`, `<figure>` + `<figcaption>` — single-rule UA-quirk overrides. No cascade entry, no TS mirror.

**Done so far:** `<address>` promoted from "italic-reset only" to a full small-contact-info block (subdued color, smaller font, tight line-height, stack-spacing margin); `<dd>` color token swapped from `--color-slate-600` (Tailwind palette leak) to `--color-text-muted` (semantic token). `<blockquote>`, `<dl>`, `<figure>`, `<figcaption>` already substantive — verified token surfaces and audit clean.

### 5.5 Media + embeds

- [ ] `<img>`, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>` — overrides only.

**Verification:** Every element's behaviour test passes. The showcase has one page per substantive element demonstrating the cascade. **Baseline-hydration audit (per substantive element):** every `--set-{tag}-*` chain falls back through `style → variant → size → :root baseline (--set-border-radius / --set-gap / etc.)` so no element renders flat; every `transition:` paired with `prefers-reduced-motion`; every `:focus-visible` painted via `focus-ring()`; hover / active / disabled all visually distinct.

---

## Phase 6 — Components

Element compositions that read as one UI thing. Static chrome (always applies) lives in `src/styles/components/`; composable-attached chrome (only while a state attribute is set) lives in `src/styles/composables/` and comes in Phase 8.

- [ ] **`src/styles/components/_body.scss`** — `body:has(> main)` CSS-grid layout shell with template-areas (`header / nav / main / aside / footer`).
- [ ] **`src/styles/components/_main.scss`** — `body:has(main) > main` — `overflow-y: auto`, scroll containment.
- [ ] **`src/styles/components/_article.scss`** — card chrome on bare `<article>`. Descendant `<header>` / `<footer>` get card-header/footer chrome via descendant selectors. `.filled` opts into surface fill.
- [ ] **`src/styles/components/_aside.scss`** — three contexts disambiguated by ancestry: `body > aside` (sidebar rail), `article aside` (pull-quote / callout), `aside[role="alert"]` (alert banner).
- [ ] **`src/styles/components/_header.scss`** — `body > header` page app bar.
- [ ] **`src/styles/components/_footer.scss`** — `body > footer` page footer.
- [ ] **`src/styles/components/_nav.scss`** — single canonical chrome on `<nav>`. Shape determined by inner content: bare = horizontal flex; `body > nav` = vertical rail; `<ol>`/`<ul>` with `aria-label="Breadcrumb"` = chevron-separated breadcrumb; `[role="tablist"]` child = tab strip.
- [ ] **`src/styles/components/_search.scss`** — search-bar layout on `<search>`.
- [ ] **`src/styles/components/_menu.scss`** — toolbar / action row on `<menu>`. Article-context = `justify-content: flex-end` (card actions). Nav-context = vertical column.
- [ ] **`src/styles/components/_output.scss`** — toast / status banner chrome (bare-element baseline; the popover-mode toast lifecycle lives in `src/styles/composables/_toast.scss`).
- [ ] **`src/styles/components/_form.scss`** — vertical form-control stack. `.row` flips horizontal.
- [ ] **`src/styles/components/_div.scss`** — class-root layout primitives (`.stack`, `.cluster`).
- [ ] **`src/styles/components/_span.scss`** — inline atoms (`.badge`, `.chip`, `.tag`, `.dot`).
- [ ] **`src/styles/components/_skeleton.scss`** + **`_spinner.scss`** — loading affordances.
- [ ] **`src/styles/components/_role-group.scss`** — `[role="group"]`, `[role="toolbar"]`, `[role="radiogroup"]` baseline.
- [ ] **`tests/src/styles/components/_{name}.test.ts`** for each partial.
- [ ] Showcase page per component under `app/browser/pages/{Name}Page.vue`.

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

- [ ] **`src/styles/surfaces/_popover.scss`** — `[popover]` panel chrome + open/close transition. `@starting-style` for entry. `transition-behavior: allow-discrete` for the close tail. Hint variant `[popover='hint'], [role='tooltip']` for tooltip-shaped popovers.
- [ ] **`src/styles/surfaces/_backdrop.scss`** — `dialog:modal::backdrop` dim scrim. Non-modal popovers keep the UA-default transparent backdrop.
- [ ] **`src/styles/surfaces/_anchor-position.scss`** — `[popover]:not([popover='manual'])` anchor positioning. Default `position-area: block-end`. `position-try-fallbacks` for viewport overflow.
- [ ] **`src/styles/surfaces/_scrollbar.scss`** — `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`.
- [ ] **`src/styles/surfaces/_focus.scss`** — `:focus-visible` ring rules using the framework's focus tokens.
- [ ] **`src/styles/surfaces/_placeholder.scss`** — `::placeholder` opacity + color across `<input>` / `<textarea>`.
- [ ] **`src/styles/surfaces/_marker.scss`** — `::marker` styling shared across `<details>` / `<summary>` / `<li>`.
- [ ] **`src/styles/surfaces/_selection.scss`** — variant-tinted `::selection`.
- [ ] **`src/styles/surfaces/_view-transition.scss`** — `::view-transition-old/new/group(*)` cross-page transitions for `<a>` navigation.
- [ ] **`src/styles/surfaces/index.scss`** — barrel.

**Verification:** A `[popover]` panel opens and closes with the entry/exit transition. Modal `<dialog>` paints a dim backdrop; non-modal stays transparent.

---

## Phase 8 — Composables

Each `use*` composable has a paired framework-agnostic factory under `src/browser/factories/`. The composable is a thin Vue adapter; the factory is the logic.

### 8.1 Shared infrastructure

- [ ] **`src/browser/constants.ts`** — event-name maps (`DIALOG_EVENTS`, `ASIDE_EVENTS`, …), selector strings (`MENU_ITEM_SELECTOR`, `SELECT_ITEM_SELECTOR`, `FOCUSABLE_SELECTOR`), default timing tokens, data-attribute markers (`BODY_LOCKED_ATTR`, `SELECT_HIDDEN_ATTR`, `TOAST_STACK_ATTR`, …).
- [ ] **`src/browser/helpers.ts`** — `assertElement<T>(el, tag, fn)`, `attachListeners(el, list)`, `bindEventMap(el, map, on)`, `dispatch(el, name, detail)`, `emit(el, name, detail)`, `runTransition(el, callback, fallbackMs)`, `waitForFrame()`, `lockBodyScroll()` / `unlockBodyScroll()`.
- [ ] **`src/browser/types.ts`** — `{Entity}EventMap`, `Use{Entity}Options`, `Use{Entity}Return`, `Create{Entity}Options`, `Create{Entity}Instance` for every composable.
- [ ] **`src/browser/events.ts`** — frozen event-name registry, parity-tested against `constants.ts`.
- [ ] **`src/browser/index.ts`** — barrel re-exports tokens, modifiers, elements, events, every composable.
- [ ] **`src/browser/factories/index.ts`** — barrel re-exports every factory.
- [ ] **`tests/setupBrowser.ts`** — element factory utilities (`createDialogElements`, `createAsideElements`, …), `mountSetup`, `withElement`, `assertCleanDispose`.

### 8.2 Primitives (no specific element)

- [ ] `useFocus` ↔ `createFocus` — tab-trap with `activate()` / `deactivate()`.
- [ ] `usePointer` ↔ `createPointer` — `pointerdown → pointermove* → pointerup` multiplex with body cursor lock.
- [ ] `useDrag` ↔ `createDrag` — HTML5 drag-source pipeline.
- [ ] `useDrop` ↔ `createDrop` — drop-target with `relatedTarget`-aware `over` tracking.
- [ ] `useTheme` ↔ `createTheme` — singleton theme controller; `data-theme` + `data-core` attributes; `prefers-color-scheme` follow.

### 8.3 Floating-panel layer

- [ ] `usePopover` ↔ `createPopover` — `[popover]` toggle + anchor positioning + click-outside dismiss.
- [ ] `useTooltip` ↔ `createTooltip` — hover/focus triggers + `role="tooltip"` + `[popover=hint]` panel. Composes `usePopover`.
- [ ] `useMenu` ↔ `createMenu` — `<menu popover>` panel + toggle `<button>`. Arrow-key roving, Home/End, click-outside dismiss. Composes `usePopover`.

### 8.4 Element-bound composables

Each binds to one semantic element via `assertElement`. Drawer-shaped CSS lives in matching `src/styles/composables/_{entity}.scss` partials gated on `:popover-open` / `:modal` / `[open]` / `[data-{name}-open]`.

- [ ] **`useDialog` ↔ `createDialog`** — `<dialog>` wrapper. Cancellable `show / open / hide / close` over native `showModal()` / `close()`. Escape dismiss, backdrop-click dismiss with `'static'` mode, optional non-modal scroll lock.
- [ ] **`useAside` ↔ `createAside`** — `<aside popover="manual">` drawer. Dual-attribute gating (`[data-aside-open]`, `[data-aside-closing]`). Closing attribute persists until next `show()` / `destroy()` — see [composables.md §3](composables.md#3-openclosed-lifecycle).
- [ ] **`useDetails` ↔ `createDetails`** — `<details>`. Flips `[open]` synchronously, listens to native `toggle` for external mutation.
- [ ] **`useToast` ↔ `createToast`** — `<output popover>`. Auto-hide timer, deck stacking via `[data-toast-stack]`, pause-on-hover, swipe-to-dismiss.
- [ ] **`useSelect` ↔ `createSelect`** — `<menu>` listbox + toggle + optional `<input>`. Listbox + combobox + multi-select + autocomplete. Filter via substring + `[data-hidden]` marker.
- [ ] **`useTable` ↔ `createTable`** — `<table>`. Sort, paginate, multi-select, row expansion (sync or animated), column resize, focus management.
- [ ] **`useForm` ↔ `createForm`** — `<form>`. Constraint-validation pipeline + `[data-form-validated]` + `aria-invalid` mirrors.
- [ ] **`useNav` ↔ `createNav`** — `<nav>`. `IntersectionObserver`-driven scroll-spy + `aria-current="location"`.
- [ ] **`useButton` ↔ `createButton`** — `<button>`. Toggle state + `aria-pressed`.
- [ ] **`useAlert` ↔ `createAlert`** — `[role="alert"]` / `[role="status"]`. Open/dismiss lifecycle.
- [ ] **`useTabs` ↔ `createTabs`** — `[role="tablist"]`. Arrow-key roving + lazy panel mount.
- [ ] **`useCarousel` ↔ `createCarousel`** — `<section class="carousel">`. Slide nav + autoplay + touch/swipe.

### 8.5 Composable chrome partials

For each composable that needs drawer-shaped CSS (display/position/transform gated on the open-state):

- [ ] `src/styles/composables/_aside.scss` — drawer geometry.
- [ ] `src/styles/composables/_dialog.scss` — size modifiers (`.small`, `.large`, `.fullscreen`, `.scrollable`). Every modifier that touches `display` MUST gate on `[open]`.
- [ ] `src/styles/composables/_select.scss` — listbox/combobox chrome. `[data-hidden]` filter rule.
- [ ] `src/styles/composables/_toast.scss` — deck-mode rules. Per-card transform/opacity gates on `:popover-open`.
- [ ] `src/styles/composables/_tabs.scss` — indicator + roving tabindex chrome.
- [ ] `src/styles/composables/_carousel.scss` — slide track + indicator chrome.

### 8.6 Tests + showcase

For each composable:

- [ ] **Factory test** at `tests/src/browser/factories/create{Entity}.test.ts`. Cover construction + ARIA wiring + every action + every event + `preventDefault` cancellation + `destroy()` idempotence + `assertCleanDispose` (no listener/observer/timer leaks).
- [ ] **Composable test** at `tests/src/browser/composables/use{Entity}.test.ts`. Mirror the factory's coverage.
- [ ] **Showcase page** at `app/browser/pages/Use{Entity}Page.vue` demoing the API surface end-to-end on real DOM.

**Verification:** Every composable's factory + composable + showcase page exist; the test suite passes; each `Use*Page.vue` is reachable in the showcase and demonstrates the full API.

---

## Phase 9 — Showcase polish

- [ ] **Sidebar navigation** — `app/browser/components/SiteNav.vue` with filter input + grouped route list.
- [ ] **In-page TOC** — `app/browser/components/Toc.vue` reading `section[id]` inside the scroller, building an on-this-page list.
- [ ] **Theme toggle** — banner-mounted dark/light switch using `useTheme`.
- [ ] **Mobile drawer** — sidebar slides in via `useAside` below the layout breakpoint.
- [ ] **Per-page audits** — verify every showcase page reads cleanly in light + dark, desktop + mobile, with framework-only chrome (Tailwind utilities reserved for last-mile fine-tuning).

---

## Phase 10 — Distribution

- [ ] **Dual-build verification** — `dist/src/styles/index.css` (CSS bundle) + `dist/src/browser/` (TS bundle, ESM + CJS).
- [ ] **`package.json` exports map** — `"./styles"` → CSS bundle, `"."` → TS entry.
- [ ] **Consumer setup snippet** in the README:
  ```css
  /* user-entry.css */
  @import 'tailwindcss';
  @import '@elements/styles';
  ```
  ```ts
  // user-entry.ts
  import { useDialog } from '@elements/browser'
  ```
- [ ] **NPM publish dry-run** — `npm pack --dry-run` lists the right files. No source maps, no SCSS, no tests in the published tarball.
- [ ] **CHANGELOG.md** — automated from conventional-commits or hand-curated.

---

## Phase 11 — Invariants verification

Before declaring done, run the framework-wide invariants checklist (also covered in each guide):

- [ ] **Cascade layer order** — `@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;` is the only declaration in any `@layer` listing across the codebase. Run `grep -rn "@layer " src/ tests/ app/` and verify.
- [ ] **Token-driven variation** — no element partial contains a `&.primary { color: ... }`-style block. Variation flows through `--set-style-*` → `--set-variant-*` → element default. Run `grep -rn "&\.primary\|&\.success\|&\.large" src/styles/elements/` and verify each match is a legitimate exception (documented inline).
- [ ] **No Tailwind-palette leaks outside `_theme.scss`** — `_theme.scss` is the only file allowed to reference `--color-{slate,blue,zinc,gray,stone,red,green,sky,amber}-{step}` directly. Element / component / surface / composable partials must consume **semantic** tokens (`--color-text`, `--color-text-muted`, `--color-surface`, `--color-border`, `--color-{variant}`). Run `grep -rn "color-slate\|color-blue\|color-zinc\|color-gray\|color-stone\|color-red\|color-green\|color-sky\|color-amber" src/styles/{elements,components,surfaces,composables}/` — empty output means clean.
- [ ] **No hardcoded color literals outside fallbacks** — element / component partials emit no inline `#hex`, `rgb()`, `hsl()`, or `oklch()` colors except as the **last fallback** of a `var()` chain. Box-shadows route through `--set-box-shadow-{sm,base,lg}`; floating-surface backgrounds route through theme tier tokens. Run `grep -rn "rgb(\|rgba(\|hsl(\|hsla(" src/styles/{elements,components,surfaces,composables}/` and audit each match.
- [ ] **Open/closed dual-attribute gating** — every popover-bearing / dialog / details composable that owns `display: flex` / `position: fixed` / large `transform` gates on the open-state selector. Run `grep -rn "display: flex\|position: fixed" src/styles/composables/ src/styles/components/` and verify each is gated.
- [ ] **Bidirectional parity** — `tokens.test.ts`, `modifiers.test.ts`, `elements.test.ts`, `events.test.ts` all pass.
- [ ] **Test coverage** — every element/composable/factory has a behaviour test. Run the full suite (`npm test`) — every file under `src/browser/{composables,factories}` and `src/styles/elements` has at least one matching test.
- [ ] **No mojibake** — every `.md` under `guides/` is valid UTF-8. Run `python -c "import re; [print(p) for p in __import__('glob').glob('guides/*.md') if re.search(r'[ðâÃÂ][^ ]{0,3}', open(p, encoding='utf-8').read())]"` — empty output means clean.
- [ ] **Lint + typecheck clean** — `npm run check` exits 0.

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
