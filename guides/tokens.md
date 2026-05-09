# Tokens

> Public theming surface. CSS source: [src/styles/\_tokens.scss](../src/styles/_tokens.scss). TS mirror: [src/browser/tokens.ts](../src/browser/tokens.ts). Bidirectional parity tests live alongside the shape tests in [tests/src/browser/tokens.test.ts](../tests/src/browser/tokens.test.ts).

The token surface has two halves:

1. **Tailwind v4 tokens** — `--color-{ramp}-{shade}`, `--spacing`, `--radius-{step}`, `--text-{step}`, `--font-weight-{step}`, `--shadow-{step}`. Ship via `@import "tailwindcss"`. Tailwind's documentation is the source of truth; we do not redeclare or wrap them.
2. **Framework tokens** — `--set-*` (we author) plus `--color-{variant}` (we register via `@theme` so Tailwind generates utilities for them). This document covers those.

Renaming or removing a token is a breaking change for consumers. Read this guide before adding or changing one.

---

## 1. Token name pattern

`--set-[scope-]property[-modifier]`

Three slots, applied in order:

| Slot       | Source                                                              | Examples                                                                                                                         |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `scope`    | empty (global) or HTML element name or context name                 | `button`, `input`, `variant`, `size`, `style`, `shape`                                                                           |
| `property` | a real CSS property key when one exists, else a CSS-resolvable noun | `color`, `background-color`, `border-color`, `border-radius`, `padding-inline`, `font-size`, `box-shadow`, `transition-duration` |
| `modifier` | scale step / palette swatch / state                                 | `hover`, `active`, `disabled`, `focus`                                                                                           |

The last segment is **always a CSS-property-keyed noun** when CSS supplies one. Scope/context segments (`variant`, `size`, `style`, `shape`, `button`, …) are framework concepts and do not need to be CSS keys.

### Anti-examples

| ❌                      | ✅                                 | Why                                                       |
| ----------------------- | ---------------------------------- | --------------------------------------------------------- |
| `--set-radius`          | `--set-border-radius`              | CSS uses `border-radius`                                  |
| `--set-shadow`          | `--set-box-shadow`                 | CSS uses `box-shadow`                                     |
| `--set-bg`              | `--set-background-color`           | CSS uses `background-color`                               |
| `--set-padding-x`       | `--set-padding-inline`             | Modern CSS uses logical `padding-inline`                  |
| `--set-easing`          | `--set-transition-timing-function` | CSS property name                                         |
| `--set-button-bg-color` | `--set-button-background-color`    | element-scoped also follows the rule                      |
| `--set-color-blue-500`  | `var(--color-blue-500)` (Tailwind) | don't redeclare what Tailwind ships                       |
| `--set-spacing-4`       | `calc(var(--spacing) * 4)`         | Tailwind ships `--spacing` as a single base, not per-step |

---

## 2. The current token catalog

### 2.1 Semantic variants — registered via `@theme`

The framework ships a **default theme** at [`src/styles/_theme.scss`](../src/styles/_theme.scss) that registers the seven semantic variants via `@theme`. Tailwind's PostCSS plugin processes the block (alongside Tailwind's own theme) and exposes each `--color-{variant}` on `:root`. Because the variant is part of the registered theme, Tailwind also auto-generates utilities (`.bg-primary`, `.text-primary`, `.border-primary`, …) for it.

```scss
/* src/styles/_theme.scss — the framework's default theme */
@theme {
	--color-primary: oklch(62.3% 0.214 259.815); /* Tailwind blue-500   */
	--color-secondary: oklch(70.4% 0.04 256.788); /* Tailwind slate-400  */
	--color-tertiary: oklch(60.6% 0.25 292.717); /* Tailwind violet-500 */
	--color-success: oklch(69.6% 0.17 162.48); /* Tailwind emerald-500 */
	--color-warning: oklch(82.8% 0.189 84.429); /* Tailwind amber-400  */
	--color-danger: oklch(63.7% 0.237 25.331); /* Tailwind red-500    */
	--color-information: oklch(71.5% 0.143 215.221); /* Tailwind cyan-500   */
}
```

**Why oklch instead of hsl?** Tailwind v4 ships its entire palette in `oklch()` for color-space-correct interpolation (perceptually uniform). Inlining the actual oklch values keeps the framework's defaults visually identical to Tailwind's palette.

**Why inline values instead of `var(--color-blue-500)` references?** Tailwind v4 tree-shakes palette tokens that aren't used by emitted utilities. A `var(--color-blue-500)` reference inside our `@theme` block isn't a "use" Tailwind tracks (only utility-class generation counts), so the palette token would be tree-shaken out of the consumer's `:root` and our reference would resolve to nothing. Inlining the value keeps the theme self-contained.

**Hex / rgb / library compatibility.** CSS variables accept any color value — oklch, hsl, hex, rgb, named colors. Three paths for code that needs hex:

1. **Override the variant directly with hex.** `:root { --color-primary: #ff8800; }` works — the hex value cascades through the entire variant chain (`--set-variant-background-color`, `--set-button-background-color`, …), all preserved as `#ff8800` end-to-end. Verified in browser.
2. **Resolve via a probe element.** Apply the variable to a CSS property and read the computed value:
   ```js
   const probe = document.createElement('div')
   probe.style.color = 'var(--color-primary)'
   document.body.appendChild(probe)
   const resolved = getComputedStyle(probe).color // browser-formatted resolved color
   probe.remove()
   ```
   Browsers serialize the computed value in the original color function; convert to hex with a small helper if your library requires it.
3. **Read the declared string.** `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')` returns the literal declared string (`oklch(...)`, `#ff8800`, `var(...)`, etc., depending on what was set). The browser does NOT auto-convert the declared form.

**Customizing variants.** A consumer-side `@theme {…}` block in their entry CSS overrides the framework's defaults — Tailwind aggregates @theme blocks and later declarations win:

```css
/* consumer's entry CSS, after @import 'tailwindcss' */
@theme {
	--color-primary: #2563eb; /* hex — works */
	--color-success: hsl(150 70% 40%); /* hsl — works */
}
@import '@elements/styles';
```

**Why no `-foreground` pair?** A palette in two formats (color + paired contrast text) couples the framework to a specific text color per variant. Instead, each variant **modifier class** (`.primary`, `.warning`, …) chooses its own contrast text via `--set-variant-color` — see [modifiers.md](modifiers.md). The palette stays a pure swatch; the modifier owns the design decision.

### 2.2 Framework `--set-*` tokens

Declared in [`src/styles/_tokens.scss`](../src/styles/_tokens.scss) `:root` block.

| Token                            | Default        | Purpose                                                                           |
| -------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `--set-focus-box-shadow-width`   | `0.25rem`      | Width of the focus ring drawn by [`focus-ring`](mixins.md#focus-ring)             |
| `--set-focus-box-shadow-opacity` | `0.35`         | Alpha for the focus ring's `color-mix` blend                                      |
| `--set-variant-color`            | `currentColor` | Variant context — text color when a variant fills a surface                       |
| `--set-variant-background-color` | `transparent`  | Variant context — fill color (also read by `.ghost` for text + by focus-ring)     |
| `--set-variant-border-color`     | `transparent`  | Variant context — paired border color                                             |
| `--set-variant-border-width`     | `0`            | Variant context — bumps border to 1px when a variant is active so its color shows |
| `--set-transition-duration`      | `150ms`        | Default transition duration (Tailwind v4 doesn't ship a single duration token)    |

#### Surface-layer + composable-driven `--set-*` tokens

Set by the surface partials and / or read inline by the composable factories. Shipped today:

| Token                                 | Default                                           | Set by / read by                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--set-anchor-gap`                    | `calc(var(--spacing) * 1)`                        | Surface: gap between anchored popover and its trigger.                                                                                                                                                                       |
| `--set-anchor-position-area`          | `block-end`                                       | Surface: default `position-area` for non-manual popovers. Inline overrides written by `usePopover` / `useTooltip` win.                                                                                                       |
| `--set-anchor-position-try-fallbacks` | `flip-block, flip-inline, flip-block flip-inline` | Surface: how the browser flips placement on overflow.                                                                                                                                                                        |
| `--set-anchor-position-try-order`     | `normal`                                          | Surface: spec default — prefer the requested side.                                                                                                                                                                           |
| `--set-anchor-viewport-inset`         | (declared in `_anchor-position.scss`)             | Safe-area inset reserved on each block-axis side.                                                                                                                                                                            |
| `--set-anchor-max-block-size`         | `18rem`                                           | Cap on popover block-size (drives `position-try-order: most-block-size` flip behavior).                                                                                                                                      |
| `--set-anchor-max-inline-size`        | `28rem`                                           | Cap on popover inline-size.                                                                                                                                                                                                  |
| `--set-menu-flip`                     | (per-instance, written inline)                    | `useMenu` writes the flip-threshold inline; the surface rule caps `max-block-size: calc(var(--set-menu-flip) * row-height)` so the browser flips the menu when the requested side has fewer than N rows. `flip: 0` opts out. |
| `--set-tabs-indicator-x`              | (per-tablist, written inline)                     | `useTabs` paints the active-tab indicator coordinates on the tablist group.                                                                                                                                                  |
| `--set-tabs-indicator-y`              | (per-tablist, written inline)                     | (same)                                                                                                                                                                                                                       |
| `--set-tabs-indicator-width`          | (per-tablist, written inline)                     | (same)                                                                                                                                                                                                                       |
| `--set-tabs-indicator-height`         | (per-tablist, written inline)                     | (same)                                                                                                                                                                                                                       |
| `--set-toast-spacing`                 | (consumer-set)                                    | `createToast` reads this to compute the linear-stack offset between toasts.                                                                                                                                                  |
| `--set-toast-stack-depth`             | (consumer-set; default `3`)                       | Read by `createToast` deck mode to decide how many cards stay visible.                                                                                                                                                       |
| `--set-toast-stack-index`             | (per-toast, written inline)                       | Per-toast deck index — drives transform / opacity gradient in toast CSS.                                                                                                                                                     |
| `--set-toast-stack-offset`            | (per-toast, written inline)                       | Linear-mode cumulative pixel offset.                                                                                                                                                                                         |
| `--set-toast-front-height`            | (per-deck, written inline)                        | Deck-mode shared height so all peeking cards line up.                                                                                                                                                                        |

These tokens are NOT registered with Tailwind via `@theme` because they're framework-internal — consumers that want to override them write a `:root` override directly. The composable factories that write the inline-style tokens preserve any caller-set values across `destroy()` so the host element returns to its original state.

### 2.3 Modifier-context tokens (set by modifier classes)

These tokens are NOT declared on `:root` — they're only set on elements that wear a modifier class, then consumed by the element via fallback chains.

| Token                            | Set by                                                                                   | Consumed by                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--set-variant-color`            | `.primary`, `.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information` | element-scoped `--set-{tag}-color`                                      |
| `--set-variant-background-color` | (same as above)                                                                          | element-scoped `--set-{tag}-background-color` + ghost text + focus-ring |
| `--set-variant-border-color`     | (same as above)                                                                          | element-scoped `--set-{tag}-border-color`                               |
| `--set-variant-border-width`     | (same as above)                                                                          | element-scoped `--set-{tag}-border-width`                               |
| `--set-size-padding-inline`      | `.small`, `.large`                                                                       | element-scoped `--set-{tag}-padding-inline`                             |
| `--set-size-padding-block`       | (same as above)                                                                          | element-scoped `--set-{tag}-padding-block`                              |
| `--set-size-font-size`           | (same as above)                                                                          | element-scoped `--set-{tag}-font-size`                                  |
| `--set-size-border-radius`       | (same as above)                                                                          | element-scoped `--set-{tag}-border-radius`                              |
| `--set-style-color`              | `.ghost`, `.filled`                                                                      | element-scoped `--set-{tag}-color` (highest priority in the chain)      |
| `--set-style-background-color`   | (same as above)                                                                          | element-scoped `--set-{tag}-background-color`                           |
| `--set-style-border-color`       | (same as above)                                                                          | element-scoped `--set-{tag}-border-color`                               |
| `--set-style-border-width`       | (same as above)                                                                          | element-scoped `--set-{tag}-border-width`                               |

See [modifiers.md](modifiers.md) for which class sets which tokens to which values, and the precedence chain elements use to resolve them.

### 2.4 Element-scoped tokens

Declared **on the element selector**, not on `:root`. The mature element baselines (`<button>`, `<a>`, `<input>`, `<textarea>`, `<select>`, `<dialog>`, `<details>`, `<table>`, the `<form>` family) all ship the same shape — a `--set-{tag}-*` triplet of color / background / border tokens that fall back through `--set-style-*` → `--set-variant-*` → element-default, plus size / radius / font-size tokens that fall back through `--set-size-*`. The reference walk-through below uses `<button>`; new elements follow the identical pattern.

`button { … }` (in [\_button.scss](../src/styles/elements/_button.scss)):

| Token                              | Source of fallback                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `--set-button-color`               | `--set-style-color` → `--set-variant-color` → `currentColor`                              |
| `--set-button-background-color`    | `--set-style-background-color` → `--set-variant-background-color` → `transparent`         |
| `--set-button-border-color`        | `--set-style-border-color` → `--set-variant-border-color` → `transparent`                 |
| `--set-button-border-width`        | `--set-style-border-width` → `--set-variant-border-width` → `0`                           |
| `--set-button-border-radius`       | `--set-size-border-radius` → `var(--radius-md)`                                           |
| `--set-button-padding-inline`      | `--set-size-padding-inline` → `calc(var(--spacing) * 3)` (12px)                           |
| `--set-button-padding-block`       | `--set-size-padding-block` → `calc(var(--spacing) * 1.5)` (6px)                           |
| `--set-button-font-size`           | `--set-size-font-size` → `var(--text-sm)` (14px — mailbox-aligned)                        |
| `--set-button-font-weight`         | `var(--font-weight-normal)` (400)                                                         |
| `--set-button-line-height`         | `var(--leading-normal)` (1.5)                                                             |
| `--set-button-transition-duration` | `--set-transition-duration`                                                               |
| `--set-button-cursor`              | `pointer` (literal — element default)                                                     |
| `--set-button-disabled-opacity`    | `0.5` (literal)                                                                           |
| `--set-button-focus-box-shadow`    | composed from `--set-variant-background-color` + `--set-focus-box-shadow-{width,opacity}` |

**Pattern when adding a new element:** declare element-scoped tokens with the same fallback chains. The cascade gives you variant / size / shape / style for free.

---

## 3. TypeScript mirror

[`src/browser/tokens.ts`](../src/browser/tokens.ts) exports a frozen `tokens` object whose leaves are CSS variable name strings. Use these constants instead of bare strings when reading or writing tokens from JavaScript, so renames propagate and typos surface at type-check time.

```ts
import { tokens } from '@elements/browser'

// Reading
const value = getComputedStyle(el).getPropertyValue(tokens.color.primary)

// Writing
el.style.setProperty(tokens.color.primary, 'hsl(150 70% 40%)')

// Element-scoped — read on a button element
const padding = getComputedStyle(buttonEl).getPropertyValue(tokens.button.paddingInline)
```

The mirror covers exactly the tokens we author. Tailwind's full surface (`--color-blue-500`, `--spacing-4`, …) is **not** mirrored — Tailwind ships its own types and IntelliSense, and aliasing them would invert the dependency direction.

### TS shape mirrors CSS shape

CSS kebab-case → TS camelCase. Element + state grouping is preserved as nested objects:

```ts
tokens.color.primary // '--color-primary'
tokens.focus.boxShadowWidth // '--set-focus-box-shadow-width'
tokens.variant.backgroundColor // '--set-variant-background-color'
tokens.size.paddingInline // '--set-size-padding-inline'
tokens.button.borderRadius // '--set-button-border-radius'
tokens.button.disabled.opacity // '--set-button-disabled-opacity'
tokens.button.focus.boxShadow // '--set-button-focus-box-shadow'
```

---

## 4. Parity tests — drift prevention

Two test files guard the token surface from drift between SCSS source and TS mirror. Both run in real Chromium (Playwright).

| Test                                                    | Project       | What it checks                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [tokens.test.ts](../tests/src/browser/tokens.test.ts)   | `src:browser` | **Shape:** every leaf is a `--*` string; framework-authored tokens use the `--set-*` namespace; the button group declares the expected slots. **TS → CSS:** every leaf in `tokens` resolves on the appropriate element (`:root`, button, or modifier-classed element). **SCSS / CSS → TS:** every `--set-*` declaration in `_tokens.scss` + `_button.scss` and every `--color-{variant}` in `_theme.scss`'s `@theme` block appears as a leaf in `tokens.ts`. |
| [\_tokens.test.ts](../tests/src/styles/_tokens.test.ts) | `src:styles`  | Resolution sanity — every framework token resolves at runtime; HSL triplets are valid; Tailwind's `--spacing` is shipped. Some redundancy with the `src:browser` test; this one stays under styles to verify the `setupStyles.ts` pipeline specifically.                                                                                                                                                                                                     |

**A failing parity test is the contract enforcement.** When a TS leaf doesn't resolve, either the SCSS forgot to declare it or the TS has a stale name. When a SCSS declaration is missing from TS, either the TS export needs updating or the declaration is dead code. The test names the missing token in the failure message.

---

## 5. Adding a new token

1. **Decide the layer.**
   - **`--color-{variant}`** semantic variant addition → add to the framework default theme at [src/styles/\_theme.scss](../src/styles/_theme.scss) `@theme {…}` block. Tailwind auto-generates utilities (`.bg-{name}`, `.text-{name}`, `.border-{name}`); consumers can override in their own entry CSS.
   - **`--set-*` global** (focus ring, default fallback for a context) → `:root` block in [\_tokens.scss](../src/styles/_tokens.scss).
   - **`--set-*` element-scoped** → on the element selector inside its `_{tag}.scss` partial.
2. **Mirror in TS.** Add the leaf to [tokens.ts](../src/browser/tokens.ts) under the matching group. Use the camelCase form of the CSS property as the key.
3. **Run the parity test.** `npm run test:src:browser -- tokens.test.ts` — bidirectional check passes when both sides are in sync.
4. **Document it.** Add a row to §2 of this file under the matching subsection.

---

## 6. Tailwind tree-shake — why scale tokens look hand-rolled

Tailwind v4 emits a theme variable on `:root` only when a corresponding utility class is generated (or when the variable is referenced in a CSS file the plugin scans). Our SCSS-compiled output is processed by Sass before Tailwind sees it, so `var(--text-sm)` references inside `_sizes.scss` aren't visible to Tailwind's tree-shake heuristics. As a result, `--text-sm`, `--text-lg`, `--radius-sm`, `--radius-lg`, etc. are NOT on `:root` unless the test/showcase environment generates the matching utility class.

To keep `--set-size-*` and `--set-shape-*` reliable across environments, modifier files use rem literals where Tailwind would tree-shake:

```scss
// modifiers/_sizes.scss
.small {
	--set-size-padding-inline: calc(var(--spacing) * 2); // --spacing IS shipped
	--set-size-font-size: 0.875rem; // Tailwind --text-sm tree-shaken
	--set-size-border-radius: 0.25rem; // Tailwind --radius-sm tree-shaken
}
```

Consumers retune via `--set-size-*` directly. If Tailwind ever ships an `@theme static` opt-out (or equivalent), modifier files can switch back to `var(--text-sm)` etc. in a single search-and-replace.

`--spacing` is the exception: it's shipped as a single base variable, and our SCSS references it via `calc(var(--spacing) * N)` which Tailwind can see when scanning paths declared via `@source`.

---

## Reference

- [\_tokens.scss](../src/styles/_tokens.scss) — canonical CSS source
- [tokens.ts](../src/browser/tokens.ts) — TS mirror
- [tokens.test.ts](../tests/src/browser/tokens.test.ts) — bidirectional parity contract (subsumes the old `tokens.parity.test.ts`)
- [modifiers.md](modifiers.md) — which classes set which context tokens
- [\_theme.scss](../src/styles/_theme.scss) — framework default theme (`@theme` registration of the seven semantic variants)
- [setup.css](../tests/setup.css) and [main.css](../app/browser/styles/main.css) — canonical Tailwind import + framework consumption pattern
