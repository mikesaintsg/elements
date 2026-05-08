# Styles — Top-Level Architecture

> SCSS partials in `src/styles/` · Tailwind v4 base · Token-driven · TS-mirrored API surface

This document is the entry point to the styling system. It explains the framework's philosophy, the file layout, the cascade order, and the contract every partial follows. Deep-dives live alongside it: [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md). Implementation status is tracked in [plan.md](plan.md).

It has four parts:

1. **Design philosophy** — the principles that govern every rule and token.
2. **File layout & cascade** — what lives where and the order it loads in.
3. **Author's contract** — what every new partial must do.
4. **Build & distribution** — how the styles ship.

---

## Part 1 — Design philosophy

### 1.1 Build on what the browser provides

Every CSS property the framework names is a real CSS property. Token names mirror CSS keys (`--set-color`, `--set-background-color`, `--set-border-radius`, `--set-padding-inline`). Class-name conventions mirror CSS keys for utilities (Tailwind owns those) and use spelled-out semantic English for modifiers (`.primary`, `.large`, `.ghost`). The framework's brand is **clarity through alignment with the platform** — never invent vocabulary CSS already supplies, and cede class names to Tailwind where they collide (`.rounded`, `.outline`).

Where CSS doesn't supply a name (semantic variants, scale steps, modifier context) we follow Tailwind's actual conventions. We don't redeclare what Tailwind already exports.

### 1.2 Tokens over hard-coded values

Every value that varies across themes, breakpoints, or components flows through a CSS custom property. Partials read tokens; they do not declare numeric literals for color, spacing, or timing.

Two token namespaces:

- **`--color-{variant}`** (and Tailwind's own `--color-{ramp}-{shade}`, `--spacing`, `--radius-*`, `--text-*`, `--font-weight-*`, `--shadow-*`) — registered via `@theme` in the consumer's entry CSS so Tailwind's plugin processes them and generates utilities. This is the consumer-facing theming surface.
- **`--set-*`** — the framework-authored namespace. Covers element-scoped tokens (`--set-button-color`), modifier-context tokens (`--set-variant-color`, `--set-size-padding-inline`), and framework specifics (`--set-focus-box-shadow-width`). Acts as both a verb (`set` reads as the imperative) and a project namespace so consumers' own `--*` properties don't collide with ours.

A consumer overrides any token at any specificity and the cascade does the rest.

### 1.3 Modifiers as token-setters; elements as token-consumers

A `.primary` class doesn't declare colors — it sets `--set-variant-*` tokens. An element file (e.g. `_button.scss`) consumes those tokens via fallback chains:

```scss
--set-button-background-color: var(
	--set-style-background-color,
	var(--set-variant-background-color, transparent)
);
```

This means: any modifier dimension (variant / size / style / state) works on any element that consumes the right context tokens. Adding a new element doesn't add new modifier code — it just consumes the same `--set-{context}-*` tokens. See [modifiers.md](modifiers.md) for the four dimensions and their context-token contracts.

### 1.4 Tailwind v4 is the base

Tailwind owns:

- The full color palette ramps (`--color-blue-500`, `--color-slate-100`, …).
- Scale tokens (`--spacing`, `--radius-{step}`, `--text-{step}`, `--font-weight-{step}`, `--shadow-{step}`).
- Utility classes (`.bg-blue-500`, `.p-4`, `.rounded-md`, `.text-lg`, `.shadow-lg`, `.m-4`, …).
- Preflight (UA reset).

We don't redeclare any of that. Modifier and utility classes compose freely on the same element: `<button class="primary large ghost pill m-4 shadow-lg">`. The integration is verified in [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts).

### 1.5 TypeScript mirrors anything with a CSS identity

The framework is dual-distribution: CSS + TypeScript. Anything a consumer programmatically reaches for has a TypeScript mirror.

| Surface                | TS file                                     | Why                                                             |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| CSS variable names     | [tokens.ts](../src/browser/tokens.ts)       | `getComputedStyle().getPropertyValue()` / `style.setProperty()` |
| Modifier class names   | [modifiers.ts](../src/browser/modifiers.ts) | `classList.add()`, typed component props, test factories        |
| Styled HTML tags       | [elements.ts](../src/browser/elements.ts)   | enumerate which elements have framework styling                 |
| Namespaced event names | [events.ts](../src/browser/events.ts)       | typed event listeners (when composables arrive)                 |

Each TS file is paired with a bidirectional parity test against its CSS-side source — TS leaf without a CSS rule fails the test, and vice versa. See [tokens.md](tokens.md), [modifiers.md](modifiers.md), and [elements.md](elements.md) for each surface's contract.

### 1.6 No abbreviations, ever

Class names, modifier values, token segments — all spelled out. `information`, not `info`. `large`, not `lg`. `background-color`, not `bg`. Verbosity buys greppability, zero translation overhead between markup and stylesheet, and a single rule a contributor never has to relearn.

The two exceptions that aren't really exceptions:

- **Tailwind utilities use Tailwind's vocabulary** (`bg-blue-500`, not `background-color-blue-500`). That's Tailwind's contract, not ours.
- **Format-hint suffix `-hsl`** indicates an HSL triplet form on palette tokens (when we ship them; current scope uses `hsl()`-wrapped values).

### 1.7 Reduced motion

Every rule that declares a `transition` follows it with a `@media (prefers-reduced-motion: reduce) { transition: none; }` guard. The canonical syntax is `@include transition($value)` from [\_mixins.scss](../src/styles/_mixins.scss) — it emits both lines in one call. Animations use `@include reduced-motion { animation: none; }` directly.

---

## Part 2 — File layout & cascade

```
src/styles/
├── index.scss             ← compilation barrel (one big @use chain)
├── index.ts               ← TypeScript barrel (re-exports the compiled CSS URL)
├── _tokens.scss           ← :root declarations + @layer order comment
├── _theme.scss            ← default theme (@theme block registering semantic variants)
├── _mixins.scss           ← Sass list constants + reduced-motion / transition / focus-ring helpers
│
├── elements/              ← One file per HTML tag — UA reset + token-driven baseline
│   ├── _a.scss · _abbr.scss · ... · _button.scss · ... · _video.scss
│
├── modifiers/             ← Five-dimension modifier classes (token-setters only)
│   ├── _variants.scss     ← .primary .secondary .tertiary .success .warning .danger .information
│   ├── _sizes.scss        ← .small .large
│   ├── _styles.scss       ← .ghost .filled
│   ├── _states.scss       ← .disabled .active .loading
│   └── index.scss
│
├── components/            ← Composed widgets (future — see components.md)
│   └── index.scss
│
└── surfaces/              ← Browser-rendered surfaces (future — see surfaces.md)
    └── index.scss
```

### Cascade layer order

Declared in [tests/setup.css](../tests/setup.css) and [app/browser/styles/main.scss](../app/browser/styles/main.scss) **before** `@import "tailwindcss"` so Tailwind's own `@layer theme, base, components, utilities` declaration merges as a no-op against the wider order:

```
theme < base < elements < components < surfaces < modifiers < utilities
```

Layers later in the list win. Unlayered rules win against any layered rule. Tokens stay unlayered so a consumer can re-declare them at any specificity.

| Layer        | Owner    | Responsibility                                                                             |
| ------------ | -------- | ------------------------------------------------------------------------------------------ |
| `theme`      | Tailwind | `@theme` blocks expand into `:root` CSS variables                                          |
| `base`       | Tailwind | preflight (UA reset, `font-family: inherit` on form controls, `box-sizing: border-box`, …) |
| `elements`   | us       | element baselines under `_{tag}.scss`                                                      |
| `components` | us       | composed widgets (future)                                                                  |
| `surfaces`   | us       | browser-surface styling (future)                                                           |
| `modifiers`  | us       | `.primary`, `.large`, `.ghost`, … set context tokens                                       |
| `utilities`  | Tailwind | `.bg-blue-500`, `.p-4`, `.rounded-md`, … (highest, win when explicitly applied)            |

### Why `_tokens.scss` carries the layer-order comment

The actual `@layer` declaration that establishes order lives in the consumer's entry CSS so it can sit before `@import "tailwindcss"`. Sass would rewrite the order of any equivalent declaration in `_tokens.scss` because it requires `@use` rules to come before any other rules, and the framework's `index.scss` opens with `@use 'tokens'`. The comment in `_tokens.scss` documents the intended order so contributors don't have to dig.

### Naming summary

| Kind                | Pattern                             | Example                                              |
| ------------------- | ----------------------------------- | ---------------------------------------------------- |
| Element partial     | `_{tag}.scss` (singular)            | `_button.scss`, `_input.scss`                        |
| Modifier partial    | `_{dimension}.scss` (plural)        | `_variants.scss`, `_sizes.scss`                      |
| Sass `@use`         | `'{name}'` (no underscore)          | `@use 'tokens'`, `@use 'mixins' as *`                |
| CSS variable        | `--set-[scope-]property[-modifier]` | `--set-button-padding-inline`, `--set-variant-color` |
| Modifier class      | spelled-out semantic adjective      | `.primary`, `.large`, `.ghost`                       |
| Utility class       | Tailwind                            | `.bg-blue-500`, `.p-4`                               |
| Element scope token | `--set-{element}-{css-property}`    | `--set-button-background-color`                      |
| Context scope token | `--set-{context}-{css-property}`    | `--set-variant-color`, `--set-size-padding-inline`   |

---

## Part 3 — Author's contract

When you reach for a new partial — element, component, surface, or modifier — these rules apply.

### A. Decide where it goes

- **Tag-shaped (`<dialog>`, `<input>`, `<table>`)** → `src/styles/elements/_{tag}.scss`. Substantive partials get a `--set-{tag}-*` token block and an entry in [elements.ts](../src/browser/elements.ts).
- **Composed widget (card, modal, dropdown)** → `src/styles/components/_{name}.scss`. Future. See [components.md](components.md) for the convention.
- **Browser-surface styling (`[popover]`, `::backdrop`, `::placeholder`, view transitions)** → `src/styles/surfaces/_{name}.scss`. Future. See [surfaces.md](surfaces.md).
- **Modifier dimension (only if a real new dimension surfaces)** → `src/styles/modifiers/_{dimension}.scss`. Update [modifiers.ts](../src/browser/modifiers.ts), the `$variants`/`$sizes`/etc. constants in [\_mixins.scss](../src/styles/_mixins.scss), and the parity test.

### B. Tokens before declarations

1. **Reuse before authoring.** Open [tokens.md](tokens.md) and check what already resolves. Most components need zero new global tokens — Tailwind's palette + scales plus our context tokens cover the surface.
2. **Element-scoped tokens declare on the element selector**, not on `:root`. `_button.scss` declares `--set-button-*` inside the `button { … }` block.
3. **Reference tokens through their fallback chain.** Element files follow the cascade `style → variant → size → shape → element-default`. Don't bypass the chain by reading `--set-variant-*` directly when the appropriate token is `--set-style-*`.

### C. Author the partial

4. **`_{name}.scss` opens with a header comment** describing the public selector surface, the modifier dimensions consumed (if any), and the composable that wires it (when composables exist).
5. **Wrap rules in `@layer {layer-name}`** matching the partial's folder (`@layer elements { … }`, `@layer components { … }`, `@layer surfaces { … }`, `@layer modifiers { … }`).
6. **Use the centralized helpers.** `@use '../mixins' as *;` then call `@include transition(…)`, `@include reduced-motion { … }`, `@include focus-ring(…)`. Never hand-roll the `prefers-reduced-motion` guard. See [mixins.md](mixins.md).
7. **Logical CSS properties.** `padding-inline`, not `padding-left/right`. `margin-block`, not `margin-top/bottom`. `inset-inline-start`, not `left`.
8. **No literal colors, durations, or radii.** Read tokens. If no token covers the value, declare the token first (see [tokens.md](tokens.md) §"Adding a token"), then reference it.

### D. Wire it up

9. **`@use '{name}'` in `index.scss`.** Element partials are alphabetized; modifier partials follow the dimension order in `modifiers/index.scss`.
10. **TS mirror.** If the partial introduces a public concept (a styled tag, a modifier class, a future event), update the matching TS file in `src/browser/`. Run the parity test (`npm run test:src:browser`) — every browser-side test file (`tokens.test.ts`, `modifiers.test.ts`, `elements.test.ts`) carries shape + bidirectional parity for its surface.

### E. Test

11. **Behavior test.** Every substantive partial gets a behavior test in `tests/src/styles/{folder}/`. Modifier partials assert each class sets the expected context tokens. Element partials assert variant / size / style / shape modifiers cascade through to the right computed styles.
12. **Real Chromium, no mocks.** Tests run via Playwright in real browsers. The helpers in [tests/setupStyles.ts](../tests/setupStyles.ts) (`render`, `mount`, `token`, `rootToken`, `colorEqual`, `findRule`, `hover`, `tabTo`, …) are the only abstraction layer.

### F. Document

13. **Update the matching guide.** New element → row in [elements.md](elements.md) checklist. New token → entry in [tokens.md](tokens.md). New mixin → entry in [mixins.md](mixins.md). New component → row in [components.md](components.md). New surface → row in [surfaces.md](surfaces.md).
14. **Update [plan.md](plan.md) status table.** This is non-negotiable for tracking — out-of-date status is worse than missing status.

### G. Anti-patterns

- Declaring a CSS variable that duplicates a Tailwind token (`--set-color-blue-500`, `--set-spacing-4`). Use Tailwind's namespace directly.
- Inventing a utility class Tailwind ships (`.background-color-blue-500`, `.padding-md`). Tailwind owns utilities.
- Hardcoded colors / durations / radii in a partial. Read tokens.
- A modifier class that declares a CSS property directly. Modifiers SET tokens; elements CONSUME them. The single exception: `.disabled` and `.loading` declare cursor + pointer-events because that behavior is universal across elements.
- An element file that hand-rolls per-variant rules (`&.primary { … }`). The cascade does this for free — variant context tokens flow through `--set-button-*` (or whatever element-scoped chain) to the property declarations.
- A `transition` declaration without `@include transition(…)`. Reduced-motion is non-negotiable.
- An abbreviation in a public name. `info` ❌ → `information` ✓. `lg` ❌ → `large` ✓. `bg` ❌ → `background-color` ✓.

---

## Part 4 — Build & distribution

### Local development

`npm run dev` boots the showcase app via `configs/app/vite.browser.config.ts`. The app entry [app/browser/styles/main.scss](../app/browser/styles/main.scss) declares the layer order, imports Tailwind, sets `@source` paths, and `@import`s the framework SCSS. The framework's own [\_theme.scss](../src/styles/_theme.scss) registers the seven semantic variants via `@theme`; consumers can add a sibling `@theme` block to override. Tailwind v4 ships through `@tailwindcss/postcss` (configured under `css.postcss.plugins` in `vite.config.ts`) so it runs _after_ Vite's Sass step — the plugin sees the Sass-compiled output and expands every `@theme` block into `:root` custom properties. Using `@tailwindcss/vite` instead would skip Sass-compiled files entirely, leaving `@theme default {…}` as a literal at-rule the browser ignores.

### Tests

```bash
npm test                     # all 5 projects (src:core, src:browser, src:styles, app:core, app:browser)
npm run test:src:styles      # CSS-aware tests (real Chromium via Playwright)
npm run test:src:browser     # TS shape + parity tests
npm run check                # oxlint --fix + vue-tsc --noEmit
```

Both [tests/setupStyles.ts](../tests/setupStyles.ts) (loaded by `src:styles`) and [tests/setupBrowser.ts](../tests/setupBrowser.ts) (loaded by `src:browser`) import [tests/setup.css](../tests/setup.css) (Tailwind + framework `@theme`) followed by `src/styles/index.scss` (the framework). Every CSS-aware test inherits the framework's full computed cascade — that's why parity tests sit in the browser project alongside their TS-shape counterparts.

### Build outputs

- `npm run build:src:styles` → `dist/src/styles/index.css` + a copy of the SCSS sources at `dist/src/styles/scss/`.
- `npm run build:src:browser` → `dist/src/browser/index.js` + `index.d.ts`.
- `npm run build:app:browser` → `dist/app/browser/` (the showcase as an SPA).

### Consumer setup (sketch — finalized when the package is published)

A downstream consumer brings their own Tailwind v4 setup, declares the layer order before `@import "tailwindcss"`, and imports the framework's compiled CSS:

```css
/* consumer's entry CSS */
@layer theme, base, elements, components, surfaces, modifiers, utilities;

@import 'tailwindcss';

@theme {
	/* the consumer redeclares variants here; otherwise the framework's defaults apply */
	--color-primary: hsl(211 100% 50%);
	--color-secondary: hsl(210 11% 71%);
	/* ... */
}

@import '@elements/styles';
```

Tailwind's plugin processes the chain in one pass: its own theme + ours + the framework's `:root` declarations all expand into `:root` CSS variables; modifier classes and element rules cascade through their layers.

The showcase app's [app/browser/styles/main.scss](../app/browser/styles/main.scss) is the canonical reference for the import sequence — copy it.

---

## Reference

- [plan.md](plan.md) — implementation status & next-up priorities
- [tokens.md](tokens.md) — full token surface (CSS + TS)
- [modifiers.md](modifiers.md) — four-dimension modifier system
- [mixins.md](mixins.md) — `_mixins.scss` registry (Sass list constants + helpers)
- [elements.md](elements.md) — per-element catalog as a checklist
- [components.md](components.md) — composed-widget convention (currently empty)
- [surfaces.md](surfaces.md) — browser-surface convention (currently empty)
- [AGENTS.md](../AGENTS.md) — repository-wide coding standards
