# Tokens

> CSS source: [src/styles/\_tokens.scss](../src/styles/_tokens.scss) and [src/styles/\_theme.scss](../src/styles/_theme.scss). TS mirror: [src/browser/tokens.ts](../src/browser/tokens.ts). Bidirectional parity: [tests/src/browser/tokens.test.ts](../tests/src/browser/tokens.test.ts).

The token surface is the framework's public theming contract. Renaming or removing a token is a breaking change for consumers.

---

## 1. Overview — two namespaces

The framework's token surface splits cleanly along ownership lines.

**Tailwind-owned** (consumed, never redeclared):

| Namespace      | Examples                                             |
| -------------- | ---------------------------------------------------- |
| `--color-*`    | `--color-blue-500`, `--color-slate-200`              |
| `--spacing`    | single base; multiply via `calc(var(--spacing) * N)` |
| `--radius-*`   | `--radius-sm`, `--radius-md`, `--radius-lg`          |
| `--text-*`     | `--text-xs`, `--text-sm`, `--text-base`              |
| `--shadow-*`   | `--shadow-sm`, `--shadow-md`                         |
| `--duration-*` | `--duration-150`, `--duration-300`                   |

Tailwind's documentation is authoritative. The framework reads these via `var()`; it never wraps, mirrors, or re-emits them.

**Framework-owned** (`--set-*`):

| Group              | Examples                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus ring         | `--set-focus-box-shadow-width`, `--set-focus-box-shadow-opacity`                                                                                                       |
| Variant context    | `--set-variant-color`, `--set-variant-background-color`                                                                                                                |
| Modifier context   | `--set-style-*`, `--set-size-*`                                                                                                                                        |
| Density / radius   | `--set-density-factor`, `--set-radius-factor`                                                                                                                          |
| Baseline hydration | `--set-border-radius`, `--set-border-width`, `--set-gap`, `--set-stack-spacing`, `--set-sticky-offset`                                                                 |
| Z-index scale      | `--set-z-index-{sticky,fixed,dropdown,modal,popover,tooltip,toast}`                                                                                                    |
| Elevation          | `--set-box-shadow-sm`, `--set-box-shadow`, `--set-box-shadow-lg`                                                                                                       |
| Icon               | `--set-icon-chevron-*`, `--set-icon-check`, `--set-icon-close`, …                                                                                                      |
| Floater            | `--set-floater-gutter`, `--set-floater-inset-*`, `--set-floater-max-*`                                                                                                 |
| Transition         | `--set-transition-duration` (150 ms, small UI tints); `--set-motion-duration` (250 ms, substantive show/hide) + `--set-motion-timing-function` (iOS stiff-decel curve) |
| Element-scoped     | `--set-button-*`, `--set-input-*`, `--set-dialog-*`, …                                                                                                                 |

Plus `--color-{variant}` (seven semantic palette tokens registered via `@theme` so Tailwind generates `.bg-primary` / `.text-success` / etc.), the `--color-{variant}-{bg-subtle, text-emphasis, border-subtle}` triplets declared on `:root` for theme-aware tinted surfaces, and the single-token `--color-{variant}-on-canvas` tier for variant text painted directly on the body canvas.

---

## 2. The variation surface

Tokens flow through a four-tier cascade. Each tier writes context tokens that the next consumes via `var()` fallback chains.

```
modifier class    →  context tokens    →  element-scoped token    →  CSS property
.primary             --set-variant-*       --set-button-color         color
.small               --set-size-*          --set-button-padding-*     padding-inline
.subtle              --set-style-*         --set-button-background-*  background-color
```

**Element-scoped tokens** declare the resolution chain on the element selector:

```scss
button {
	--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor));
	--set-button-background-color: var(
		--set-style-background-color,
		var(--set-variant-background-color, transparent)
	);
}
```

**Modifier classes** write into the context layer:

```scss
.primary {
	--set-variant-color: var(--color-canvas);
	--set-variant-background-color: var(--color-primary);
	--set-variant-border-color: var(--color-primary);
	--set-variant-border-width: 1px;
}

.small {
	--set-size-padding-inline: calc(var(--spacing) * 2);
	--set-size-font-size: 0.875rem;
}
```

Cascade priority on every element: `--set-style-* → --set-variant-* → --set-size-* → element default`. Style wins over variant because `.subtle` and `.filled` deliberately re-paint a variant surface; variant wins over size because density tweaks must never overwrite identity.

See [modifiers.md](modifiers.md) for the full five-dimension cascade (variant, size, style, state, placement) and the exact values each class writes.

---

## 3. Framework-level tokens

All declared on `:root` in [`_tokens.scss`](../src/styles/_tokens.scss).

### Focus ring

```scss
--set-focus-box-shadow-width: 0.25rem;
--set-focus-box-shadow-opacity: 0.35;
```

Consumed by the `focus-ring()` mixin ([mixins.md](mixins.md)) to compose a `color-mix`-blended ring whose hue tracks the active variant.

### Variant context fallback

```scss
--set-variant-color: currentColor;
--set-variant-border-width: 0;
```

`--set-variant-background-color` and `--set-variant-border-color` are deliberately **not** declared globally. Elements use them with `var(…, fallback)` so the absence yields the element's own default (e.g. `currentColor` border) rather than an explicit `transparent` that would erase per-element baselines.

### Density factor

```scss
--set-density-factor: 1; /* 0.75 = compact, 1.25 = spacious */
```

Global multiplier. Component partials that opt in wrap padding math: `calc(var(--set-size-padding-inline) * var(--set-density-factor))`. A single `:root` declaration retunes the entire framework's spacing rhythm.

### Radius factor

```scss
--set-radius-factor: 1; /* 0 = sharp, 1.5 = very rounded */
```

Same idea for corner roundness. `0` flattens every radius to a hard corner; `1.5` rounds aggressively.

### Elevation scale

```scss
--set-box-shadow-sm: 0 0.125rem 0.25rem color-mix(in srgb, black 7.5%, transparent);
--set-box-shadow:
	0 0.25rem 0.75rem color-mix(in srgb, black 8%, transparent),
	0 0.0625rem 0.1875rem color-mix(in srgb, black 6%, transparent);
--set-box-shadow-lg:
	0 0.5rem 2rem color-mix(in srgb, black 18%, transparent),
	0 0.125rem 0.375rem color-mix(in srgb, black 10%, transparent);
```

Three-tier scale. `sm` for hover-raised list items and subtle action panels. Base for popover panels and dropdown menus. `lg` for modal dialogs, toasts, and drawer chrome. Each level layers a diffuse main drop with a tighter contact shadow so the surface reads as a discrete floating layer.

### Icon tokens

```scss
--set-icon-chevron-down: url('data:image/svg+xml,…');
--set-icon-chevron-up: url(…);
--set-icon-chevron-left: url(…);
--set-icon-chevron-right: url(…);
--set-icon-caret-down: url(…);
--set-icon-caret-up: url(…);
--set-icon-check: url(…);
--set-icon-dash: url(…);
--set-icon-radio: url(…);
--set-icon-switch-off: url(…);
--set-icon-switch-on: url(…);
--set-icon-close: url(…);
--set-icon-menu: url(…);
--set-icon-more: url(…);
--set-icon-search: url(…);
--set-icon-filter: url(…);
--set-icon-sort: url(…);
--set-icon-external: url(…);
--set-icon-sun: url(…);
--set-icon-moon: url(…);
--set-icon-system: url(…);
--set-icon-info: url(…);
--set-icon-success: url(…);
--set-icon-warning: url(…);
--set-icon-danger: url(…);
--set-icon-plus: url(…);
--set-icon-minus: url(…);
```

Single overridable inline-SVG library for every chrome glyph the framework paints. Defaults are URL-encoded 16×16 viewBox data URLs at `stroke-width='2'` with `stroke='currentColor'` (or `fill='currentColor'` for filled glyphs — `caret-*`, `radio`, `more`, `sort`, `switch-*`), so the same value works as either `background-image` (paints the stroke) or `mask-image` (drives the SHAPE; tint comes from the consumer's `background-color: currentColor` on the masked pseudo).

Consumer partials reference these through per-element aliases (`--set-select-background-image`, `--set-summary-marker-image`, `--set-nav-breadcrumb-separator-image`, `--set-check-checkbox-svg`, the carousel `mask-image`, the table sort indicator, …) so a host-page override at `:root` scope retunes every consumer at once:

```scss
:root {
	--set-icon-chevron-down: url('/icons/heroicons/chevron-down.svg');
	--set-icon-check: url('/icons/lucide/check.svg');
}
```

Override a single icon (`--set-icon-check`) to swap one glyph, or replace the whole set with a different icon library. The per-element alias (`--set-select-background-image`) remains overridable for one-off element-specific swaps.

### Floater token chain

```scss
--set-floater-gutter: 1rem;
--set-floater-inset-top: max(var(--set-floater-gutter), env(safe-area-inset-top, 0px));
--set-floater-inset-bottom: max(var(--set-floater-gutter), env(safe-area-inset-bottom, 0px));
--set-floater-inset-start: max(var(--set-floater-gutter), env(safe-area-inset-left, 0px));
--set-floater-inset-end: max(var(--set-floater-gutter), env(safe-area-inset-right, 0px));
--set-floater-max-inline-size: calc(
	100dvw - var(--set-floater-inset-start) - var(--set-floater-inset-end)
);
--set-floater-max-block-size: calc(
	100dvh - var(--set-floater-inset-top) - var(--set-floater-inset-bottom)
);
```

Single source of truth for top-layer panel sizing. Insets resolve to the larger of the design gutter and the device's safe-area inset — notched / rounded-corner devices keep clearance automatically. Max-size uses dynamic-viewport units so the budget honors mobile-browser chrome that shows and hides.

Requires the host page to declare `<meta name="viewport" content="… viewport-fit=cover">` for `env(safe-area-inset-*)` to resolve non-zero on iOS.

### Transition duration + motion contract

```scss
// Small UI tints (hover, focus, color/border fades, theme flips)
--set-transition-duration: 150ms;

// Substantive show / hide motion (drawer slide-in, dialog scale-in,
// details expansion, table row expansion). Shared so motion feels
// uniform across every "panel-style reveal" in the framework.
--set-motion-duration: 250ms;
--set-motion-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
```

Two perceptual registers, one consistent contract:

- **`--set-transition-duration` (150 ms).** Consumed by the `transition()` mixin and by every element-scoped `--set-{tag}-transition-duration`. Used for hover tints, focus rings, theme-flip color animations — anywhere a property smoothly transitions inside an otherwise-stable layout. Tailwind v4 ships per-step `--duration-*` tokens but no single canonical default; this token fills that gap.

- **`--set-motion-{duration, timing-function}` (250 ms + iOS stiff-decel curve).** Consumed by every framework surface that physically moves a panel in or out of view: body-shell rail drawers (`<nav>` / `<aside>` on mobile, lifted into popover mode via the conditional `:popover="isMobile ? 'auto' : undefined"` binding so they share the same `:is(aside, nav)[popover]` drawer chrome as the standalone `<aside popover>` offcanvas surface), `<dialog>` modals + non-modals, `<details>::details-content` disclosure expansions, and the `tr.expansion .expansion-panel` table row reveal. The curve is the iOS-native "stiff decelerate" — fast start, gentle settle — matching Bootstrap's offcanvas + modal timing and the iOS native sheet feel. Opacity fades inside the motion family use plain `ease-out` (the cubic-bezier's tail looks identical for opacity but `ease-out` is the universally-readable name for fades). Backdrop scrims (`dialog:modal::backdrop` and `:is(aside, nav)[popover]:popover-open::backdrop`) fade out over the same window so backdrop + panel dismiss in lockstep — no parallel app-side scrim element is needed since both body-shell drawers ride the native `::backdrop` pseudo.

Consumers retune motion globally at `:root` (`--set-motion-duration: 400ms` for a slower house style) or per-component (`dialog { --set-motion-duration: 200ms }` for snappier dialog open/close while leaving drawers at 250).

### Baseline hydration tokens

These exist so the framework feels **already wired up** the moment a consumer drops it onto a page — Bootstrap-parity, not opinionated theming. Every value is a real `:root` declaration (not just a `var(…, fallback)` inlined elsewhere) so consumers can read or override them at one global scope.

```scss
--set-border-radius: var(--radius-md); /* Tailwind --radius-md = 0.375rem */
--set-border-width: 1px;
--set-gap: calc(var(--spacing) * 3); /* 0.75rem default flex/grid gap */
--set-stack-spacing: 1em; /* sibling vertical rhythm relative to local font-size */
--set-sticky-offset: 0px; /* consumer sets per app: `:root { --set-sticky-offset: 4rem; }` */
```

`--set-border-radius` and `--set-border-width` are the "default" answer when no `.small` / `.large` size modifier is active and no element-scoped chain provides a more specific value. `--set-gap` is the default `flex` / `grid` `gap` for layout primitives (`.stack`, `.cluster`, `<form>` control list, `<menu>` toolbar). `--set-stack-spacing` drives sibling vertical rhythm (e.g. `p + p { margin-block-start: var(--set-stack-spacing) }`). `--set-sticky-offset` is consumed by `<html>`'s `scroll-padding-block-start` so anchor jumps clear a sticky toolbar.

### Z-index scale

```scss
--set-z-index-sticky: 1020;
--set-z-index-fixed: 1030;
--set-z-index-dropdown: 1040;
--set-z-index-modal: 1050;
--set-z-index-popover: 1070;
--set-z-index-tooltip: 1080;
--set-z-index-toast: 1090;
```

Single canonical layering order for every floating surface, mirroring Bootstrap's z-index scale so consumers familiar with that ecosystem keep their intuitions. Native popovers and `<dialog>:modal` use the browser's **top layer** (z-index inert there), but the scale still applies to:

- Non-popover dropdowns and sticky panels in the regular stacking context (e.g. `<select>` listbox in fallback mode, `useNav` rail).
- In-flow `output[role="status"]` banners that opt out of popover.
- Consumer-authored chrome that needs to layer against the framework's surfaces without guessing values.

20-step gaps between tiers leave breathing room for consumer-layered chrome (e.g. an app-shell sticky header pinned at 1025 sits above generic sticky content but below a dropdown at 1040).

---

## 4. Semantic variant colors

Seven variants registered via `@theme` in [`_theme.scss`](../src/styles/_theme.scss) — Tailwind's PostCSS plugin processes the block and auto-generates `.bg-{name}`, `.text-{name}`, `.border-{name}` utilities:

```scss
@theme {
	--color-primary: var(--color-blue-600);
	--color-secondary: var(--color-slate-600);
	--color-tertiary: var(--color-violet-600);
	--color-success: var(--color-green-700);
	--color-warning: var(--color-amber-700);
	--color-danger: var(--color-red-700);
	--color-information: var(--color-sky-700);
}
```

Every variant references Tailwind's own oklch palette via `var(--color-{hue}-{step})`. This is the framework's zero-gap with Tailwind: consumers who customise Tailwind's palette automatically retune the framework variants, and there is no HSL or hand-tuned color value anywhere in the framework outside the `@theme` block.

**Variant step selection — the all-variants-take-white-text contract.** Four variants sit on the `-700` step (`success`, `warning`, `danger`, `information`) and three on `-600` (`primary`, `secondary`, `tertiary`). Every variant clears WCAG AA contrast for **white text** on its fill — that's the single rule that picks the step:

- `primary` blue-600, `secondary` slate-600, `tertiary` violet-600 — `-600` already clears AA with white text (the hue's natural luminance + chroma stays low enough).
- `success` green-700, `warning` amber-700, `danger` red-700, `information` sky-700 — bumped one step because their `-600` siblings are too bright (white-on-green-600 = 3.30, white-on-amber-500 = 1.80, white-on-red-600 = 4.6 but flagged as "fire-engine intense", white-on-sky-600 = 4.02). The `-700` step keeps the hue + identity but pulls luminance + chroma into the "comfortable, calm" range (M3 error-40 / Atlassian danger-bold / Polaris critical all sit in the same territory).

Tailwind v4 tree-shakes palette tokens not referenced by an emitted utility class — the four `-700` steps are re-pinned explicitly in `@theme` so they survive the bundle.

For each variant, a `{bg-subtle, text-emphasis, border-subtle}` triplet is declared on `:root` (outside `@theme` so they can re-resolve under `[data-theme="dark"]`):

```scss
--color-primary-bg-subtle: color-mix(in oklab, var(--color-primary) 12%, var(--color-canvas));
--color-primary-text-emphasis: color-mix(in oklab, var(--color-primary) 70%, var(--color-text));
--color-primary-border-subtle: color-mix(in oklab, var(--color-primary) 35%, var(--color-canvas));
```

Toast, alert, and callout surfaces consume these triplets so a consumer who retunes `--color-primary` automatically gets matching subtle / emphasis / border-subtle without redeclaring each one.

Alongside the triplet, each variant exposes a single `--color-{variant}-on-canvas` token for text painted directly on `--color-canvas` (no tinted container under the glyph):

```scss
// Light :root
--color-primary-on-canvas: color-mix(in oklab, var(--color-primary) 70%, var(--color-text));

// Dark :root (slightly more variant chroma since canvas has no tint)
--color-primary-on-canvas: color-mix(in oklab, var(--color-primary) 80%, var(--color-text));
```

Naming follows Material Design's `on-X` convention — the suffix names the SURFACE the color is safe ON. The bare `-600` step that reads as a saturated FILL doesn't have enough luminance contrast to clear WCAG AA when painted as TEXT on canvas (amber/green/sky fail in light mode; every variant fails in dark mode at ~3–4 ratio). The `on-canvas` tier solves it with a per-mode `color-mix(in oklab, variant {70|80}%, --color-text)` so the shade auto-inverts polarity between light and dark and clears AA on both canvases. After the variant-step shift the formula is uniform across all seven variants — the prior warning special case (30% mix / bare amber) collapsed back to the standard ratios.

`text-emphasis` and `on-canvas` are decoupled by name even though their formulas match today: `text-emphasis` is "text emphasized on `bg-subtle`" (variant-tinted bg), `on-canvas` is "text safe on `--color-canvas`" (no bg tint). Canvas-context can retune independently of bg-subtle-context if a future theme needs divergent shades. Bare variant anchors (`elements/_a.scss`), bare variant labels (`elements/_label.scss`), header/footer/menu-current foreground hover states, and any inline variant text consume the `on-canvas` tier through `--set-variant-on-canvas-color`.

**Dark-mode tunes** live under `[data-theme="dark"]` in `_theme.scss`. Surface, text, and border tokens flip from the slate `50`/`100` light scale to the slate `900`/`950` dark scale; variant identities stay constant (Tailwind's `-600` step contrasts well against both extremes); subtle triplets re-derive against `--color-surface` with bumped mix percentages so the tint reads cleanly against the deep canvas.

The framework uses explicit `[data-theme]` attribute overrides rather than `light-dark()` because Chromium currently fails to re-resolve `light-dark()` values stored in custom properties against a child element's `color-scheme`.

---

## 5. Element-scoped tokens

Every substantively-styled element declares its own `--set-{tag}-*` token group on the element selector. Each token resolves via a fallback chain through `style → variant → size → element default`:

```scss
button {
	--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor));
	--set-button-background-color: var(
		--set-style-background-color,
		var(--set-variant-background-color, transparent)
	);
	--set-button-border-color: var(
		--set-style-border-color,
		var(--set-variant-border-color, transparent)
	);
	--set-button-border-width: var(--set-style-border-width, var(--set-variant-border-width, 0));
	--set-button-border-radius: var(--set-size-border-radius, var(--radius-md));
	--set-button-padding-inline: var(--set-size-padding-inline, calc(var(--spacing) * 3));
	--set-button-padding-block: var(--set-size-padding-block, calc(var(--spacing) * 1.5));
	--set-button-font-size: var(--set-size-font-size, var(--text-sm));
	--set-button-font-weight: var(--font-weight-normal);
	--set-button-line-height: var(--leading-normal);
	--set-button-transition-duration: var(--set-transition-duration);
	--set-button-cursor: pointer;
	--set-button-disabled-opacity: 0.5;
	--set-button-focus-box-shadow: /* composed from variant + focus ring tokens */;
}
```

The base style block then consumes the element-scoped tokens (`padding-inline: var(--set-button-padding-inline)`, etc.). Modifier classes never touch element-scoped tokens directly — they only write into the context layer, and the element's fallback chain pulls the new values automatically.

**Elements with full token chains:**

| Element                      | Token group                                               |
| ---------------------------- | --------------------------------------------------------- |
| `button`                     | `--set-button-*`                                          |
| `a`                          | `--set-a-*`                                               |
| `input`                      | `--set-input-*`                                           |
| `textarea`                   | `--set-textarea-*`                                        |
| `select`                     | `--set-select-*`                                          |
| `dialog`                     | `--set-dialog-*`                                          |
| `aside`                      | `--set-aside-*`                                           |
| `details` / `summary`        | `--set-details-*`, `--set-summary-*`                      |
| `fieldset` / `legend`        | `--set-fieldset-*`, `--set-legend-*`                      |
| `output`                     | `--set-output-*`                                          |
| `progress` / `meter`         | `--set-progress-*`, `--set-meter-*`                       |
| `table` / `tr` / `th` / `td` | `--set-table-*`, `--set-tr-*`, `--set-th-*`, `--set-td-*` |
| `h1`–`h6`                    | `--set-heading-*` (shared across the six levels)          |

See [elements.md](elements.md) for the per-element catalog with each tag's full token list and defaults.

---

## 6. TypeScript mirror

[`src/browser/tokens.ts`](../src/browser/tokens.ts) exports a frozen object tree whose leaves are CSS variable name strings. Use these constants when reading or writing tokens from JavaScript so renames propagate and typos surface at type-check time.

CSS kebab-case maps to TS camelCase. Element + state grouping is preserved as nested objects:

```ts
import { tokens } from '@elements/browser'

tokens.color.primary // '--color-primary'
tokens.focus.boxShadowWidth // '--set-focus-box-shadow-width'
tokens.variant.backgroundColor // '--set-variant-background-color'
tokens.size.paddingInline // '--set-size-padding-inline'
tokens.button.borderRadius // '--set-button-border-radius'
tokens.button.backgroundColor // '--set-button-background-color'
tokens.boxShadow.lg // '--set-box-shadow-lg'
tokens.floater.maxInlineSize // '--set-floater-max-inline-size'

const value = getComputedStyle(el).getPropertyValue(tokens.color.primary)
el.style.setProperty(tokens.color.primary, '#2563eb')
```

**Tailwind's own tokens are not mirrored.** Tailwind ships its own types and IntelliSense; aliasing `--color-blue-500` or `--spacing` here would invert the dependency direction.

**Bidirectional parity test.** [tokens.test.ts](../tests/src/browser/tokens.test.ts) enforces both directions in real Chromium:

- Every `--set-*` declaration in the SCSS source appears as a leaf in `tokens.ts`.
- Every leaf in `tokens.ts` resolves at runtime on the appropriate element (`:root`, the element selector, or a modifier-classed element).

A failing parity test names the missing token in the failure message — either the TS export needs updating, or the SCSS declaration is dead code.

---

## 7. Adding a new token

Three places, in order:

1. **Declare it in SCSS.** Pick the partial:
   - Global (`:root`) → [`_tokens.scss`](../src/styles/_tokens.scss).
   - Semantic palette addition (`--color-{variant}`) → `@theme` block in [`_theme.scss`](../src/styles/_theme.scss).
   - Element-scoped → on the element selector inside its `src/styles/elements/_{tag}.scss` partial.
   - Component-scoped → the component's `src/styles/components/_{name}.scss` partial.
2. **Mirror in TS.** Add the leaf to [`src/browser/tokens.ts`](../src/browser/tokens.ts) under the matching group, camelCasing the CSS name.
3. **Run the parity test.** `npm run test:src:browser -- tokens.test.ts` — bidirectional check passes when both sides are in sync.

That's it. The test catches every kind of drift.

---

## 8. Anti-rules

**Don't redeclare what Tailwind already exports.**

| Wrong                  | Right                      |
| ---------------------- | -------------------------- |
| `--set-color-blue-500` | `var(--color-blue-500)`    |
| `--set-spacing-4`      | `calc(var(--spacing) * 4)` |
| `--set-radius-md`      | `var(--radius-md)`         |
| `--set-text-sm`        | `var(--text-sm)`           |

**Don't invent utility classes Tailwind already ships.** If `text-center`, `flex`, `rounded-md` already exist, use them.

**Don't abbreviate in token names.** The last segment is always the full CSS property keyword when one exists.

| Wrong                   | Right                              |
| ----------------------- | ---------------------------------- |
| `--set-bg-color`        | `--set-background-color`           |
| `--set-button-bg-color` | `--set-button-background-color`    |
| `--set-radius`          | `--set-border-radius`              |
| `--set-shadow`          | `--set-box-shadow`                 |
| `--set-padding-x`       | `--set-padding-inline`             |
| `--set-easing`          | `--set-transition-timing-function` |

Scope and context segments (`variant`, `size`, `style`, `shape`, `button`, …) are framework concepts and need not be CSS keys; the property segment always is.

---

## Cross-references

- [styles.md](styles.md) — top-level styles architecture and cascade layer order.
- [modifiers.md](modifiers.md) — four-dimension cascade (variant, size, style, shape) and the context tokens each class writes.
- [mixins.md](mixins.md) — `transition()`, `focus-ring()`, and `floater-*` mixins that consume tokens.
- [elements.md](elements.md) — per-element catalog with every tag's token chain.
- [composables.md](composables.md) — composable-level tokens (toast deck stacking, floater bounds, tabs indicator coordinates).
