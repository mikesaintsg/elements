# Styles — Top-Level Architecture

> SCSS partials in `src/styles/` · TypeScript surface in `src/browser/` · Tailwind v4 base · Token-driven · Composable-paired.

This is the entry-point document for the framework. It explains the design philosophy, the file layout, the cascade order, the contract every partial follows, and how the framework ships to consumers. Deep-dives live alongside: [tokens.md](tokens.md), [mixins.md](mixins.md), [modifiers.md](modifiers.md), [elements.md](elements.md), [components.md](components.md), [composables.md](composables.md), [surfaces.md](surfaces.md). Implementation status is tracked in [plan.md](plan.md).

---

## 1. Design philosophy

Six principles govern every rule, every token, every TypeScript export.

### 1.1 Build on what the browser provides

Every CSS property the framework names is a real CSS property. Token names mirror CSS keys (`--set-color`, `--set-background-color`, `--set-border-radius`, `--set-padding-inline`). The framework cedes utility class names to Tailwind, ranges its modifier names against the platform's vocabulary, and never invents words that CSS or HTML already supply. UA features — `:popover-open`, `::backdrop`, `[open]`, `dialog:modal`, `details > summary`, anchor positioning, view transitions — are surfaced directly. The framework brand is clarity through alignment with the platform.

### 1.2 Tokens over literals

Every value that varies across themes, breakpoints, or modifier contexts flows through a CSS custom property. Partials read tokens; they do not declare numeric literals for color, spacing, duration, or radius. Two namespaces:

- **Tailwind tokens** — `--color-{ramp}-{shade}`, `--spacing`, `--radius-{step}`, `--text-{step}`, `--font-weight-{step}`, `--shadow-{step}`. Registered via `@theme` in the consumer's entry CSS; Tailwind generates utility classes from them.
- **`--set-*`** — the framework-authored namespace. Covers element-scoped tokens (`--set-button-color`), modifier-context tokens (`--set-variant-color`, `--set-size-padding-inline`), and framework specifics (`--set-focus-box-shadow-width`). The `set` prefix reads as the imperative verb and namespaces the framework against consumer-authored properties.

Full surface in [tokens.md](tokens.md).

### 1.3 Modifiers set tokens, elements consume them

A `.primary` class does not declare colors — it sets `--set-variant-*` tokens. An element partial consumes those tokens through a fallback chain:

```scss
--set-button-background-color: var(
	--set-style-background-color,
	var(--set-variant-background-color, transparent)
);
```

Any modifier dimension works on any element that consumes the right context tokens. Adding a new element is purely additive: it joins the cascade and inherits every modifier for free. The dimensions and their token contracts are in [modifiers.md](modifiers.md).

### 1.4 Tailwind v4 is the base

Tailwind owns the color ramps, the scale tokens, every utility class, and preflight (the UA reset). The framework does not redeclare any of it. Modifier and utility classes compose freely on the same element: `<button class="primary large subtle rounded-full m-4 shadow-lg">`. Tailwind v4 ships through `@tailwindcss/postcss` so it runs after Sass and sees the compiled output — this is required for `@theme` blocks authored in SCSS to expand into `:root`.

### 1.5 TypeScript mirrors anything with a CSS identity

The framework is dual-distribution: CSS plus TypeScript. Anything a consumer programmatically reaches for has a TypeScript mirror, parity-tested against its CSS source.

| Surface                | TypeScript file                             | Why                                                             |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| CSS variable names     | [tokens.ts](../src/browser/tokens.ts)       | `getComputedStyle().getPropertyValue()` / `style.setProperty()` |
| Modifier class names   | [modifiers.ts](../src/browser/modifiers.ts) | `classList.add()`, typed component props, factories             |
| Styled HTML tags       | [elements.ts](../src/browser/elements.ts)   | enumerate which tags carry framework styling                    |
| Namespaced event names | [events.ts](../src/browser/events.ts)       | typed listeners for composable-emitted events                   |

A TypeScript leaf without a matching CSS rule fails parity; a CSS rule without a TS entry fails parity. The relationship is bidirectional.

### 1.6 The HTML element IS the component

A card is `<article>`. A modal is `<dialog>`. A sidebar is `<aside>`. A disclosure is `<details>`. A toast is `<output>`. The tag carries the identity; modifier classes carry variation; descendant context disambiguates dual-role tags (`body > header` is the app bar, `article > header` is the card header). Class-root patterns (`.stack`, `.cluster`, `.skeleton`) appear only when there is no semantic HTML home. The Vue composable layer and framework-agnostic factory layer follow the same rule: one composable per tag, named after the tag (`useDialog`, `useAside`, `useDetails`, `useMenu`, `useTable`). Full discussion in [components.md](components.md) and [composables.md](composables.md).

### 1.7 Baseline hydration — Bootstrap-parity defaults

The framework ships **non-color baseline tokens** alongside the color palette so a bare HTML element drops into a page already feeling "wired up": consistent border-radius and border-width, consistent flex/grid `gap`, sibling vertical rhythm, focus rings, hover/active/disabled states, transitions paired with `prefers-reduced-motion`, and a canonical z-index layering scale for floating chrome. The intent mirrors Bootstrap's appeal — coherent visual grammar across every primitive — but the surface is the elements themselves, not utility classes. Concretely:

- `--set-border-radius`, `--set-border-width`, `--set-gap`, `--set-stack-spacing`, `--set-sticky-offset` declared on `:root` so unsized elements have sensible defaults.
- `--set-z-index-{sticky,fixed,dropdown,modal,popover,tooltip,toast}` — single canonical layering scale (Bootstrap-aligned) for every floating surface.
- `--set-box-shadow-small`, `--set-box-shadow` (un-suffixed base tier — Bootstrap-aligned `--bs-box-shadow` convention), `--set-box-shadow-large` — three-tier elevation scale consumed by every floating chrome partial.
- `--set-focus-box-shadow-{width,opacity}` — focus-ring composition consumed by the `focus-ring()` mixin so every interactive element rings consistently.

The baseline is **deliberately unopinionated**: a slate ramp for surfaces, a Tailwind `-600`-step palette for variant identities, a 0.375rem default radius, a 1px default border. Consumers who want a brand identity override at `:root` and the cascade re-tunes every consumer at once. The framework feels coherent the moment it loads; opinions stay optional.

---

## 2. File layout

```
src/styles/
├── index.scss               compilation barrel (one @use chain)
├── index.ts                 re-exports the compiled CSS URL
├── _tokens.scss             @theme + --set-* declarations
├── _theme.scss              [data-theme="dark"] re-tune
├── _mixins.scss             Sass list constants + reduced-motion / transition / focus-ring helpers
│
├── elements/                one partial per HTML tag — UA-quirk reset + token-driven baseline
│   ├── _a.scss · _abbr.scss · _button.scss · _dialog.scss · ... · _video.scss
│
├── components/              element compositions — static chrome that applies regardless of state
│   ├── _article.scss · _aside.scss · _header.scss · _menu.scss · _nav.scss · ...
│
├── surfaces/                pseudo-elements + attribute APIs the browser owns
│   ├── _anchor-position.scss   anchor-name / position-anchor / position-area
│   ├── _backdrop.scss          dialog::backdrop
│   ├── _focus-ring.scss        :focus-visible box-shadow contract
│   ├── _marker.scss            ::marker on lists
│   ├── _placeholder.scss       ::placeholder on inputs
│   ├── _popover.scss           [popover] / :popover-open / [popovertarget]
│   ├── _scrollbar.scss         scrollbar-color / scrollbar-width / scrollbar-gutter
│   ├── _selection.scss         ::selection
│   ├── _view-transition.scss   ::view-transition-* family + @view-transition
│
├── composables/             component chrome gated on a composable's state attribute
│   ├── _aside.scss             aside[popover][data-aside-open] drawer geometry
│   ├── _dialog.scss            dialog.scrollable[open] body layout
│   ├── _select.scss            select listbox / combobox layout
│   ├── _toast.scss             output[popover]:popover-open toast-deck stacking
│   ├── _menu.scss · _details.scss · _tabs.scss · _tooltip.scss · ...
│
└── modifiers/               token-setters, never property-setters
    ├── _variants.scss          .primary .secondary .tertiary .success .warning .danger .information
    ├── _sizes.scss             .small .large
    ├── _styles.scss            .subtle .filled
    ├── _local.scss             form.row, button.dropdown, … — element-local modifiers
    ├── _states.scss            .disabled .active .loading
    ├── _placements.scss        .top .bottom .start .end .top-start .top-end .bottom-start .bottom-end
    └── index.scss

src/browser/
├── index.ts                 barrel (public exports)
├── composables/             Vue 3 adapters — useDialog, useAside, useDetails, useMenu, useToast, ...
├── factories/               framework-agnostic — createDialog, createAside, createDetails, ...
├── tokens.ts                CSS variable name registry
├── modifiers.ts             modifier class registry
├── elements.ts              styled-tag registry
├── events.ts                namespaced event-name registry (elements:{source}:{verb})
├── constants.ts             selector strings, default timing tokens, event-name maps
├── helpers.ts               assertElement, runTransition, lockBodyScroll, …
└── types.ts                 Use*Options / Use*Return / Create*Options / Create*Instance
```

Naming summary:

| Kind               | Pattern                             | Example                                              |
| ------------------ | ----------------------------------- | ---------------------------------------------------- |
| Element partial    | `_{tag}.scss` (singular)            | `_button.scss`, `_input.scss`                        |
| Component partial  | `_{tag-or-name}.scss`               | `_article.scss`, `_menu.scss`                        |
| Surface partial    | `_{feature}.scss`                   | `_popover.scss`, `_view-transition.scss`             |
| Composable partial | `_{tag}.scss`                       | `_dialog.scss`, `_toast.scss`                        |
| Modifier partial   | `_{dimension}.scss` (plural)        | `_variants.scss`, `_sizes.scss`                      |
| Sass `@use`        | `'{name}'` (no underscore)          | `@use 'tokens'`, `@use 'mixins' as *`                |
| CSS variable       | `--set-[scope-]property[-modifier]` | `--set-button-padding-inline`, `--set-variant-color` |
| Modifier class     | spelled-out semantic adjective      | `.primary`, `.large`, `.subtle`                      |
| Event name         | `elements:{source}:{verb}`          | `elements:dialog:show`, `elements:toast:close`       |

---

## 3. Cascade layer order

The framework declares one layer order. It lives in the consumer's entry CSS, **before** `@import "tailwindcss"`, so Tailwind's own `@layer theme, base, components, utilities` declaration merges as a no-op against the wider order:

```css
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
@import 'tailwindcss';
```

Later layers win. Unlayered rules win against any layered rule. Tokens stay unlayered so consumers re-declare them at any specificity.

| Layer         | Owner     | Responsibility                                                                                                          |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `theme`       | Tailwind  | `@theme` blocks expand into `:root` CSS variables                                                                       |
| `base`        | Tailwind  | preflight (UA reset, `font-family: inherit` on form controls, `box-sizing: border-box`, …)                              |
| `elements`    | framework | bare-tag baselines under `elements/_{tag}.scss`                                                                         |
| `components`  | framework | element compositions (card via `<article>`, sidebar via `body > aside`, …) — static chrome                              |
| `surfaces`    | framework | pseudo-elements + attribute APIs (`[popover]`, `::backdrop`, scrollbar, anchor, `::placeholder`, `::marker`, …)         |
| `composables` | framework | component chrome gated on a composable's state attribute (`dialog.scrollable[open]`, `aside[popover][data-aside-open]`) |
| `modifiers`   | framework | `.primary`, `.large`, `.subtle`, `.disabled`, `.top` — token-setters only                                               |
| `utilities`   | Tailwind  | `.bg-blue-500`, `.p-4`, `.rounded-md` — last-mile per-element overrides                                                 |

**Why this order:**

- `composables` sits **after** `surfaces` so per-composable chrome (a drawer's transform, a listbox's max-block-size, the toast deck's stacking) beats popover-surface defaults declared in `surfaces/_popover.scss`. The composables layer knows what kind of popover this is; the surfaces layer doesn't.
- `modifiers` sits **after** `composables` so `.primary` reliably tints a `<dialog>` or a `<aside>` even when the composables layer has set a position-specific background. Modifiers are the user's deliberate signal; chrome is the framework's default.
- `utilities` sits **last** so `<button class="primary p-8">` ends up with `p-8` padding — the explicit utility wins. Tailwind is the consumer's escape hatch from every framework default.

The open/closed gating rules that depend on this order are documented in [composables.md §3](composables.md#3-openclosed-lifecycle).

---

## 4. Author's contract

Every new partial — element, component, surface, composable, modifier — follows these rules.

### 4.1 Decide where it goes

- **Bare HTML tag, no composition** → `elements/_{tag}.scss`. Substantive partials declare `--set-{tag}-*` tokens and register in [elements.ts](../src/browser/elements.ts).
- **Composition of elements with a single root concept** → `components/_{name}.scss`. Static chrome, applies whether or not a composable is attached.
- **Pseudo-element, attribute API, at-rule, UA-behavior property** → `surfaces/_{feature}.scss`. Convention in [surfaces.md](surfaces.md).
- **Chrome that depends on a composable's state attribute** → `composables/_{tag}.scss`. Gated on `[data-{name}-open]`, `[data-{name}-closing]`, `:popover-open`, `:modal`, or `[open]`. Convention in [composables.md](composables.md).
- **New modifier dimension** (rare) → `modifiers/_{dimension}.scss`. Update [modifiers.ts](../src/browser/modifiers.ts), the Sass list constant in [`_mixins.scss`](../src/styles/_mixins.scss), and the parity test.

### 4.2 Wrap in the matching layer

Every rule sits inside `@layer {folder}`. The folder name and the layer name match:

```scss
@layer elements   { button { … } }
@layer components { article { … } }
@layer surfaces   { [popover] { … } }
@layer composables { dialog.scrollable[open] { … } }
@layer modifiers  { .primary { … } }
```

### 4.3 Tokens before declarations

Element-scoped `--set-{name}-*` tokens declare on the element selector, not on `:root`. Reference tokens through their fallback chain — the canonical order is `style → variant → size → element-default`. Reuse before authoring: open [tokens.md](tokens.md) and check what already resolves. Most partials need zero new global tokens.

### 4.4 Logical CSS properties

`padding-inline`, not `padding-left/right`. `margin-block`, not `margin-top/bottom`. `inset-block-start`, not `top`. The framework is direction-agnostic by default.

### 4.5 `@include transition()` for transitions

Every `transition` declaration pairs with `prefers-reduced-motion: reduce { transition: none }`. The canonical syntax is `@include transition($value)` from [`_mixins.scss`](../src/styles/_mixins.scss) — it emits both lines in one call. Animations use `@include reduced-motion { animation: none }`. Hand-rolled transition rules without the guard are an anti-pattern. Full mixin registry in [mixins.md](mixins.md).

### 4.6 Gate open/closed lifecycle rules

Any rule that asserts `display`, `position: fixed`, or a large `transform` on a popover-bearing element, a `<dialog>`, or a `<details>` MUST gate on the open-state selector (`:popover-open`, `[open]`, `:modal`, `[data-{name}-open]`). Without the gate the rule defeats the UA's `display: none` for the closed state and ships a ghost. The full discipline is in [composables.md §3](composables.md#3-openclosed-lifecycle).

### 4.7 TypeScript mirror

If the partial introduces a public concept — a styled tag, a modifier class, an emitted event — update the matching TypeScript file in `src/browser/` and run the parity test (`npm run test:src:browser`).

### 4.8 No abbreviations

Class names, modifier values, token segments — all spelled out. `information`, not `info`. `large`, not `lg`. `background-color`, not `bg`. The single exception is Tailwind utility vocabulary, which follows Tailwind's contract.

---

## 5. Build & distribution

### 5.1 Local development

`npm run dev` boots the showcase app at `app/browser/` via `configs/app/vite.browser.config.ts`. The app entry `app/browser/styles/main.css` declares the layer order, imports Tailwind, sets `@source` paths, and imports the framework SCSS. Tailwind v4 ships through `@tailwindcss/postcss` so it runs after Sass and sees compiled output — using `@tailwindcss/vite` would skip Sass-compiled files entirely and leave `@theme` as a literal at-rule the browser ignores.

### 5.2 Tests

```bash
npm test                     # all five projects
npm run test:src:styles      # CSS-aware tests, real Chromium via Playwright
npm run test:src:browser     # TypeScript shape + bidirectional parity
npm run check                # oxlint --fix + vue-tsc --noEmit
```

CSS-aware tests load `tests/setup.css` (Tailwind + framework `@theme`) followed by `src/styles/index.scss`. Every behaviour test inherits the framework's full computed cascade. Browser tests cover the factory layer directly via `mountSetup` + `withElement` and the Vue adapter layer via Vue's test utilities.

### 5.3 Build outputs

- `npm run build:src:styles` → `dist/src/styles/index.css` (the bundled framework CSS) + a copy of the SCSS sources at `dist/src/styles/scss/`.
- `npm run build:src:browser` → `dist/src/browser/index.js` + `index.cjs` + `index.d.ts` (ESM + CJS bundle).
- `npm run build:app:browser` → `dist/app/browser/` (the showcase as an SPA).
- `npm run show` → `dist/showcase/index.html` (one self-contained file via `vite-plugin-singlefile`), then copied to `demo/showcase.html` for `file://` review.

The showcase output is explicitly **no-cache**: `app/browser/index.html` carries the three `Cache-Control` / `Pragma` / `Expires` meta tags so the browser revalidates on every reload — without this, `file://` reloads happily serve a stale build. On top of that, `configs/app/vite.showcase.config.ts` injects a fresh ISO timestamp in two places per build:

- a `<meta name="build-id" content="…">` tag in `<head>` (changes the HTML byte content, defeating any byte-identical cache hit), and
- a `__BUILD_ID__` global exposed via Vite's `define` — `app/browser/env.d.ts` declares it so Vue/TS components can read it. Surface it in the App footer (`<small>build {{ __BUILD_ID__ }}</small>`) for an at-a-glance "yes, this is the new build" signal.

Consumers building their own single-file or `file://`-distributed apps can copy the same three pieces: meta tags in `index.html`, an inline `transformIndexHtml` plugin that stamps `<meta name="build-id">`, and a `define: { __BUILD_ID__: JSON.stringify(new Date().toISOString()) }` block.

### 5.4 Consumer setup

A consumer brings their own Tailwind v4 setup. The full integration is two imports plus an optional `@theme` block:

```css
/* consumer's entry CSS */
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;

@import 'tailwindcss';

@theme {
	/* override semantic variants if desired; the framework defaults
	   reference Tailwind's own palette via `var(--color-blue-600)` etc.,
	   so consumers who retune Tailwind's palette automatically retune
	   the framework variants. */
	--color-primary: oklch(60% 0.22 30); /* warm orange */
	--color-secondary: var(--color-zinc-600); /* warmer neutral than slate */
}

@import '@elements/styles';
```

```ts
// consumer's TypeScript
import { useDialog, useAside, useToast } from '@elements/browser'
```

The showcase at `app/browser/` is the dogfooding consumer and the canonical reference for the import sequence — copy it.

---

## Reference

- [tokens.md](tokens.md) — full token surface (CSS + TypeScript)
- [mixins.md](mixins.md) — `_mixins.scss` registry (Sass list constants + helpers)
- [modifiers.md](modifiers.md) — five-dimension modifier system
- [elements.md](elements.md) — per-element catalog
- [components.md](components.md) — element-composition convention
- [composables.md](composables.md) — Vue adapters + framework-agnostic factories
- [surfaces.md](surfaces.md) — pseudo-elements and attribute APIs
- [plan.md](plan.md) — implementation status
- [AGENTS.md](../AGENTS.md) — repository-wide coding standards
