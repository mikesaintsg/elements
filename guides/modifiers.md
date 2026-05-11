# Modifiers

> Authoritative reference for the elements framework's modifier system. Modifiers are the framework's variation surface — six orthogonal dimensions, each a small CSS partial under [`src/styles/modifiers/`](../src/styles/modifiers/). A modifier class doesn't paint pixels directly; it sets `--set-{context}-*` tokens that the element / component baseline consumes via fallback chains.

This means every modifier dimension works on every element that consumes the right context tokens. Adding a new element doesn't add new modifier code — it just consumes the same `--set-{context}-*` tokens.

---

## 1. The six dimensions

Each dimension is orthogonal — an element takes at most one value from each.

| Dimension                                  | Values                                                                                        | Context tokens it writes                                                                                    | Partial                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Variant** (semantic identity)            | `.primary`, `.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information`      | `--set-variant-color`, `--set-variant-background-color`, `--set-variant-border-color`                       | [`_variants.scss`](../src/styles/modifiers/_variants.scss)     |
| **Size** (physical scale)                  | `.small`, `.large`, `.huge` (no `.medium` — that's the default)                               | `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius` | [`_sizes.scss`](../src/styles/modifiers/_sizes.scss)           |
| **Style** (fill treatment)                 | `.outline`, `.ghost`, `.filled`                                                               | `--set-style-color`, `--set-style-background-color`, `--set-style-border-color`                             | [`_styles.scss`](../src/styles/modifiers/_styles.scss)         |
| **Shape** (corner radius)                  | `.rounded`, `.pill`, `.square`                                                                | `--set-shape-border-radius`                                                                                 | [`_shapes.scss`](../src/styles/modifiers/_shapes.scss)         |
| **State** (interaction state)              | `.disabled`, `.active`, `.loading`                                                            | (typically toggles existing element rules; no dedicated context tokens)                                     | [`_states.scss`](../src/styles/modifiers/_states.scss)         |
| **Placement** (anchored surface placement) | `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end` | Maps to CSS `position-area` keywords                                                                        | [`_placements.scss`](../src/styles/modifiers/_placements.scss) |

The dimensions compose freely. `<button class="primary large outline rounded">` resolves all four through the cascade in one pass.

---

## 2. How the cascade resolves

Walk through `<button class="primary large outline rounded">`:

1. `.primary` sets:
   ```css
   --set-variant-color: white;
   --set-variant-background-color: var(--color-primary);
   --set-variant-border-color: var(--color-primary);
   ```
2. `.large` sets:
   ```css
   --set-size-padding-inline: var(--spacing-5);
   --set-size-padding-block: var(--spacing-2);
   --set-size-font-size: var(--text-lg);
   --set-size-border-radius: var(--radius-lg);
   ```
3. `.outline` reads `--set-variant-background-color` (the variant identity) and rewrites:
   ```css
   --set-style-color: var(--set-variant-background-color);
   --set-style-background-color: transparent;
   --set-style-border-color: var(--set-variant-background-color);
   ```
4. `.rounded` sets:
   ```css
   --set-shape-border-radius: var(--radius-lg);
   ```
5. The `<button>` partial's fallback chain reads them in priority:
   ```css
   --set-button-color: var(--set-style-color, var(--set-variant-color, currentColor));
   --set-button-background-color: var(
   	--set-style-background-color,
   	var(--set-variant-background-color, transparent)
   );
   --set-button-border-color: var(
   	--set-style-border-color,
   	var(--set-variant-border-color, transparent)
   );
   --set-button-border-radius: var(
   	--set-shape-border-radius,
   	var(--set-size-border-radius, var(--radius-md))
   );
   --set-button-padding-inline: var(--set-size-padding-inline, calc(var(--spacing) * 3));
   ```

Result: outlined primary button at large size with rounded corners. **Zero per-element variant/size/style code.** Every substantively-styled element consumes the same context tokens; the modifier dimension that wrote them doesn't know or care which element is consuming.

---

## 3. Variants

Seven semantic identities. Each variant's identity color is `--set-variant-background-color` — the same token that fills the background in `.filled` state. There's no separate "base" token because the background color IS the variant's color.

```scss
.primary {
	--set-variant-color: white;
	--set-variant-background-color: var(--color-primary);
	--set-variant-border-color: var(--color-primary);
}
.secondary {
	--set-variant-color: black;
	--set-variant-background-color: var(--color-secondary);
	--set-variant-border-color: var(--color-secondary);
}
.tertiary {
	--set-variant-color: white;
	--set-variant-background-color: var(--color-tertiary);
	--set-variant-border-color: var(--color-tertiary);
}
.success {
	--set-variant-color: white;
	--set-variant-background-color: var(--color-success);
	--set-variant-border-color: var(--color-success);
}
.warning {
	--set-variant-color: black;
	--set-variant-background-color: var(--color-warning);
	--set-variant-border-color: var(--color-warning);
}
.danger {
	--set-variant-color: white;
	--set-variant-background-color: var(--color-danger);
	--set-variant-border-color: var(--color-danger);
}
.information {
	--set-variant-color: black;
	--set-variant-background-color: var(--color-information);
	--set-variant-border-color: var(--color-information);
}
```

The contrast text color (`--set-variant-color`) is hand-tuned per variant for WCAG AA contrast against the variant's background. `.warning` and `.information` use black text; the others use white.

The variant context tokens are also consumed by element baselines that need a tint without a class — alerts and callouts read `--color-{variant}-bg-subtle`, `--color-{variant}-text-emphasis`, `--color-{variant}-border-subtle` directly from the theme layer.

---

## 4. Sizes

Three scale steps plus the default (no `.medium` class — the bare element IS medium). Sizes consume Tailwind's scale tokens.

```scss
.small {
	--set-size-padding-inline: var(--spacing-2);
	--set-size-padding-block: var(--spacing-1);
	--set-size-font-size: var(--text-sm);
	--set-size-border-radius: var(--radius-sm);
}
.large {
	--set-size-padding-inline: var(--spacing-5);
	--set-size-padding-block: var(--spacing-2);
	--set-size-font-size: var(--text-lg);
	--set-size-border-radius: var(--radius-lg);
}
.huge {
	--set-size-padding-inline: var(--spacing-8);
	--set-size-padding-block: var(--spacing-3);
	--set-size-font-size: var(--text-xl);
	--set-size-border-radius: var(--radius-xl);
}
```

The framework-level `--set-density-factor` (declared in [`_tokens.scss`](../src/styles/_tokens.scss)) lets consumers globally retune the padding rhythm. Element partials that opt in wrap their padding tokens with `calc(value * var(--set-density-factor))`, so a `:root { --set-density-factor: 0.75 }` declaration compacts every action surface in lockstep.

---

## 5. Styles

Three fill treatments. Each consumes the variant context — meaning the same `.outline` class produces a primary-outlined button or a danger-outlined alert depending on the variant set alongside it.

```scss
.outline {
	--set-style-color: var(--set-variant-background-color);
	--set-style-background-color: transparent;
	--set-style-border-color: var(--set-variant-background-color);
}
.ghost {
	--set-style-color: var(--set-variant-background-color);
	--set-style-background-color: transparent;
	--set-style-border-color: transparent;
}
.filled {
	--set-style-color: var(--set-variant-color);
	--set-style-background-color: var(--set-variant-background-color);
	--set-style-border-color: var(--set-variant-border-color);
}
```

`<button class="primary outline">` paints blue text on transparent with a blue border — `.outline` pulls the variant identity into the style context. `<button class="primary filled">` is the explicit version of `<button class="primary">` for action surfaces (the bare-variant action surface defaults to `.filled` automatically; non-action surfaces stay neutral and require `.filled` to opt into the surface fill).

---

## 6. Shapes

The simplest dimension — just sets `--set-shape-border-radius`.

```scss
.rounded {
	--set-shape-border-radius: var(--radius-lg);
}
.pill {
	--set-shape-border-radius: var(--radius-full);
}
.square {
	--set-shape-border-radius: 0;
}
```

The element's `border-radius` chain reads `--set-shape-border-radius → --set-size-border-radius → element default`, so `.rounded` overrides the size-driven default, `.pill` produces a full pill regardless of size, and `.square` strips the radius entirely.

The framework-level `--set-radius-factor` (declared in [`_tokens.scss`](../src/styles/_tokens.scss)) lets consumers globally retune the corner rhythm. A `:root { --set-radius-factor: 0 }` declaration produces a sharp / angular variant of the framework; `1.5` produces a very-rounded variant.

---

## 7. States

State classes mirror existing element pseudo-classes for hosts that don't expose a native attribute equivalent.

```scss
.disabled {
	cursor: not-allowed;
	opacity: var(--set-disabled-opacity, 0.5);
	pointer-events: none;
}
.active {
	/* mirrors :active chrome; element partials decide what active looks like */
}
.loading {
	cursor: progress;
	pointer-events: none;
	position: relative;
	/* element partials paint a spinner overlay reading --set-loading-* tokens */
}
```

Use the state class when the native attribute isn't available. `<a class="disabled">` is the right pattern because `<a>` has no `disabled` attribute. `<button disabled>` is the right pattern because `<button>` does — the `.disabled` class is redundant and shouldn't be applied.

`.loading` is the framework's spinner-overlay state. The element partial decides whether to render the spinner via a `::after` pseudo (default) or to defer to a child `<progress>` indeterminate (for hosts that already contain a progress slot).

---

## 8. Placements

Eight values map to CSS `position-area` keywords. Scoped to `[popover]:not([popover='manual'])` so per-element placement semantics on `<aside>` (drawer edge) / `<nav>` (rail side) / `<output>` (toast corner) aren't disrupted by the global placement vocabulary.

```scss
[popover]:not([popover='manual']).top {
	position-area: block-start;
}
[popover]:not([popover='manual']).bottom {
	position-area: block-end;
}
[popover]:not([popover='manual']).start {
	position-area: inline-start;
}
[popover]:not([popover='manual']).end {
	position-area: inline-end;
}
[popover]:not([popover='manual']).top-start {
	position-area: block-start inline-start;
}
[popover]:not([popover='manual']).top-end {
	position-area: block-start inline-end;
}
[popover]:not([popover='manual']).bottom-start {
	position-area: block-end inline-start;
}
[popover]:not([popover='manual']).bottom-end {
	position-area: block-end inline-end;
}
```

Logical-axis values (`block-start`, `inline-start`) keep RTL working. The full anchor positioning surface — including `position-try-fallbacks` for viewport overflow — lives in [`surfaces/_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss).

For non-popover surfaces (`<aside>` drawer, `<output>` toast, `<nav>` rail), the placement classes map to per-element rules in the matching component partial. A `<aside class="start">` slides in from the inline-start edge regardless of whether it's a popover-mode drawer or an in-flow rail.

---

## 9. TypeScript mirror

[`src/browser/modifiers.ts`](../src/browser/modifiers.ts) exports a frozen object tree per dimension plus derived string-literal-union types:

```ts
export const modifiers = {
	variant: {
		primary: 'primary',
		secondary: 'secondary',
		tertiary: 'tertiary',
		success: 'success',
		warning: 'warning',
		danger: 'danger',
		information: 'information',
	},
	size: { small: 'small', large: 'large', huge: 'huge' },
	style: { outline: 'outline', ghost: 'ghost', filled: 'filled' },
	shape: { rounded: 'rounded', pill: 'pill', square: 'square' },
	state: { disabled: 'disabled', active: 'active', loading: 'loading' },
	placement: {
		top: 'top',
		bottom: 'bottom',
		start: 'start',
		end: 'end',
		topStart: 'top-start',
		topEnd: 'top-end',
		bottomStart: 'bottom-start',
		bottomEnd: 'bottom-end',
	},
} as const

export type Variant = (typeof modifiers.variant)[keyof typeof modifiers.variant]
export type Size = (typeof modifiers.size)[keyof typeof modifiers.size]
export type Style = (typeof modifiers.style)[keyof typeof modifiers.style]
export type Shape = (typeof modifiers.shape)[keyof typeof modifiers.shape]
export type State = (typeof modifiers.state)[keyof typeof modifiers.state]
export type Placement = (typeof modifiers.placement)[keyof typeof modifiers.placement]
```

A bidirectional parity test at [`tests/src/browser/modifiers.test.ts`](../tests/src/browser/modifiers.test.ts) enforces: every CSS class declared in `modifiers/_*.scss` appears as a TS leaf, and every TS leaf has a matching CSS rule.

---

## 10. Adding a value to an existing dimension

Most dimensions stay closed. The framework is opinionated about the vocabulary — extending it is a deliberate design decision, not a per-project customization. Adding a value:

1. Add the rule to the matching `modifiers/_*.scss` partial. Use the existing rules as templates; new variants tune contrast text + identity color; new sizes step the four context tokens consistently.
2. Add the value to the matching `modifiers.ts` object + derived type.
3. Add the value to the matching Sass list in [`_mixins.scss`](../src/styles/_mixins.scss) (`$variants`, `$sizes`, etc.) so any `@each` loops in element partials pick up the new value automatically.
4. The bidirectional parity test catches drift between SCSS and TS.

---

## 11. Anti-rules

- **Don't abbreviate.** `.info` is wrong; `.information` is right. `.lg` is wrong; `.large` is right. `.bg-primary` is Tailwind utility-class territory — framework modifiers don't compete with utilities.
- **Don't overlap dimension vocabularies.** `.dark` is reserved for theming, not a variant value. `.tight` is line-height; not a size value. Each dimension's values are distinct adjectives within that dimension; no cross-dimension collisions.
- **Don't introduce a modifier whose effect is "set a hard-coded color or value."** Modifiers set tokens; the cascade does the rest. A `.brand` modifier that hard-codes `color: red` is wrong — instead, the consumer overrides `--color-primary` at `:root` and uses `.primary`.
- **Don't hand-roll `&.primary { color: ... }` blocks inside element files.** The cascade already feeds `--set-{element}-*` through the fallback chain. Per-modifier rules in element files are only justified when a property genuinely cannot come from a token — for example, `<form>.row { flex-direction: row }` flips a layout primitive that has no token equivalent.
- **Don't apply modifier classes to elements that don't consume the matching context tokens.** A `.primary` class on a `<section>` does nothing because `<section>` has no `--set-section-*` token chain. Use the substantive element instead (`<article class="primary">`).

---

## 12. Reference

- [styles.md](styles.md) — top-level architecture; the cascade layer order modifiers participate in.
- [tokens.md](tokens.md) — the `--set-*` namespace modifiers write.
- [mixins.md](mixins.md) — the `$variants` / `$sizes` / `$styles` / `$shapes` / `$states` / `$placements` Sass lists modifier partials iterate.
- [elements.md](elements.md) — the catalog of token-consuming elements.
- [components.md](components.md) — element compositions that consume the same modifier tokens.
- [composables.md](composables.md) — Vue + factory layer; composables consume state-class modifiers for the open/closed lifecycle.
- [surfaces.md](surfaces.md) — the anchor-positioning surface that powers `.top` / `.bottom` / `.start` / `.end` placement.
