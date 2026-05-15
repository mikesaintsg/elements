# Modifiers

> Authoritative reference for the elements framework's modifier system. Modifiers are the framework's variation surface — five orthogonal dimensions, each a small CSS partial under [`src/styles/modifiers/`](../src/styles/modifiers/). A modifier class doesn't paint pixels directly; it sets `--set-{context}-*` tokens that the element / component baseline consumes via fallback chains.

This means every modifier dimension works on every element that consumes the right context tokens. Adding a new element doesn't add new modifier code — it just consumes the same `--set-{context}-*` tokens.

> **Source of truth:** the shipped surface is [`src/browser/modifiers.ts`](../src/browser/modifiers.ts) and the SCSS partials it mirrors in [`src/styles/modifiers/`](../src/styles/modifiers/). The bidirectional parity tests at [`tests/src/browser/modifiers.test.ts`](../tests/src/browser/modifiers.test.ts) and [`tests/guides/modifiers.test.ts`](../tests/guides/modifiers.test.ts) fail if this document drifts from either.

---

## 1. The five dimensions

Each dimension is orthogonal — an element takes at most one value from each.

| Dimension                                  | Values                                                                                        | Context tokens it writes                                                                                                                                                                                                                                                                     | Partial                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Variant** (semantic identity)            | `.primary`, `.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information`      | FILLED: `--set-variant-color`, `--set-variant-background-color`, `--set-variant-border-color`, `--set-variant-border-width`. SUBTLE: `--set-variant-subtle-color`, `--set-variant-subtle-background-color`, `--set-variant-subtle-border-color`. ON-CANVAS: `--set-variant-on-canvas-color`. | [`_variants.scss`](../src/styles/modifiers/_variants.scss)     |
| **Size** (physical scale)                  | `.small`, `.large` (no `.medium` — bare element is medium)                                    | `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius`                                                                                                                                                                                  | [`_sizes.scss`](../src/styles/modifiers/_sizes.scss)           |
| **Style** (fill treatment)                 | `.subtle`, `.filled`                                                                          | `--set-style-color`, `--set-style-background-color`, `--set-style-border-color`, `--set-style-border-width`                                                                                                                                                                                  | [`_styles.scss`](../src/styles/modifiers/_styles.scss)         |
| **State** (interaction state)              | `.disabled`, `.active`, `.loading`                                                            | (typically toggles existing element rules; no dedicated context tokens)                                                                                                                                                                                                                      | [`_states.scss`](../src/styles/modifiers/_states.scss)         |
| **Placement** (anchored surface placement) | `.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end` | Maps to CSS `position-area` keywords plus matching `align-self` / `justify-self`                                                                                                                                                                                                             | [`_placements.scss`](../src/styles/modifiers/_placements.scss) |

The dimensions compose freely. `<button class="primary large filled">` resolves all three through the cascade in one pass.

### Names that look like they should be modifiers but aren't

- **No `Shape` dimension.** Corner roundness flows through `--set-radius-factor` (a `:root` multiplier on every `--set-{element}-border-radius`). Per-call shape changes use Tailwind's `.rounded-{size}` / `.rounded-full` utilities directly. The names `.rounded`, `.pill`, `.square` are reserved territory because Tailwind owns `.rounded`.
- **No `.outline` style.** Tailwind owns `.outline` (`outline-style: solid`); stacking a framework outline alongside it would double-draw. The outlined look is the bare element default — `<button class="primary">` (no `.filled`) paints variant text + variant border on a transparent surface.
- **No `.ghost` style.** Removed because the transparent-text-on-canvas pattern failed WCAG AA on 4 of 7 variants in dark mode and 3 of 7 in light. The intent it served — "minimal chrome action button" — is now covered by either the bare element (no style modifier) or `.subtle` (tinted but always readable).
- **No `.huge` size.** Tailwind owns the `text-*` size scale. Per-call typography changes use Tailwind utilities directly; the framework's size modifier covers only the bundled `padding + font-size + radius` package that Tailwind has no single-utility equivalent for.

---

## 2. How the cascade resolves

Walk through `<button class="primary large filled">`:

1. `.primary` sets the variant tier tokens:
   ```css
   --set-variant-color: white;
   --set-variant-background-color: var(--color-primary);
   --set-variant-border-color: var(--color-primary);
   --set-variant-border-width: 1px;
   --set-variant-subtle-color: var(--color-primary-text-emphasis);
   --set-variant-subtle-background-color: var(--color-primary-bg-subtle);
   --set-variant-subtle-border-color: var(--color-primary-border-subtle);
   --set-variant-on-canvas-color: var(--color-primary-on-canvas);
   ```
2. `.large` sets the size tokens:
   ```css
   --set-size-padding-inline: calc(var(--spacing) * 4);
   --set-size-padding-block: calc(var(--spacing) * 2);
   --set-size-font-size: var(--text-base);
   --set-size-border-radius: var(--radius-lg);
   ```
3. `.filled` rewrites the style context from the variant FILLED tier:
   ```css
   --set-style-color: var(--set-variant-color, currentColor);
   --set-style-background-color: var(--set-variant-background-color, transparent);
   --set-style-border-color: var(--set-variant-border-color, transparent);
   --set-style-border-width: 1px;
   ```
4. The `<button>` partial's fallback chain reads them in priority:
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
   --set-button-border-width: var(--set-style-border-width, var(--set-variant-border-width, 0));
   --set-button-border-radius: var(--set-size-border-radius, var(--radius-md));
   --set-button-padding-inline: var(--set-size-padding-inline, calc(var(--spacing) * 3));
   ```

Result: filled primary button at large size. **Zero per-element variant / size / style code.** Every substantively-styled element consumes the same context tokens; the modifier dimension that wrote them doesn't know or care which element is consuming.

The same `<button class="primary">` without `.filled` falls back through `--set-variant-color` (white) / `--set-variant-background-color` (the primary fill) — so the bare-variant action surface paints filled automatically. Non-action surfaces (alerts, callouts) leave `--set-style-*` empty so they stay neutral until `.subtle` or `.filled` is added.

---

## 3. Variants

Seven semantic identities. Each `.{variant}` class sets EIGHT context tokens across three "treatment" tiers — FILLED, SUBTLE, and ON-CANVAS — each tuned for a different surface context.

```scss
.primary {
	// FILLED — saturated identity surface (consumed by `.filled` style and
	// by bare element variants that paint with a fill).
	--set-variant-color: white;
	--set-variant-background-color: var(--color-primary);
	--set-variant-border-color: var(--color-primary);
	--set-variant-border-width: 1px;

	// SUBTLE — tinted bg + emphasis text + subtle border (consumed by
	// `.subtle` style). The triplet is theme-aware via `_theme.scss`.
	--set-variant-subtle-color: var(--color-primary-text-emphasis);
	--set-variant-subtle-background-color: var(--color-primary-bg-subtle);
	--set-variant-subtle-border-color: var(--color-primary-border-subtle);

	// ON-CANVAS — single-token tier for variant text painted directly on
	// `--color-canvas` (no tinted container). Tuned per-mode so the same
	// token clears WCAG AA in both light and dark themes.
	--set-variant-on-canvas-color: var(--color-primary-on-canvas);
}
```

(`.secondary`, `.tertiary`, `.success`, `.warning`, `.danger`, `.information` follow the same eight-token shape.)

**Tier semantics:**

- **FILLED** — saturated identity surface. Consumed by `.filled` style and by bare element variants that need a fill (e.g. `<button class="primary">` paints filled by default). Text color (`--set-variant-color`) is **white on every variant** — the framework deliberately shifts the lighter hues (`success`, `warning`, `danger`, `information`) up to their `-700` Tailwind step so white-on-fill clears WCAG AA uniformly across all seven. `primary` / `secondary` / `tertiary` stay on `-600` because their lower-luminance hues already clear the bar. The all-variants-take-white contract gives consumers a single mental model: there is no "this variant needs dark text" exception.
- **SUBTLE** — tinted bg + emphasis text + subtle border. Consumed by `.subtle` style; mirrors Bootstrap 5's `.btn-{color}-subtle`. The bg + text pair is tuned per-mode in `_theme.scss` so the combination clears AA in both themes.
- **ON-CANVAS** — single-token tier for unboxed variant text (bare variant anchor, bare variant label, header / footer / menu-current foreground hover). Solves the WCAG gap where the saturated `-600` step doesn't clear 4.5:1 against the body canvas. Naming follows Material Design's `on-X` convention — the suffix names the SURFACE the color is safe ON. Sibling to (but decoupled from) the SUBTLE tier's `text-emphasis` member; canvas-context and bg-subtle-context can retune independently.

When to reach for which:

| Surface under the glyph                                | Token to consume                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Variant fill (`.filled`, primary button bg)            | `--set-variant-background-color` for bg, `--set-variant-color` for fg               |
| Variant-tinted container (`.subtle`, alert, callout)   | `--set-variant-subtle-background-color` for bg, `--set-variant-subtle-color` for fg |
| Body canvas — no tinted container (bare anchor, label) | `--set-variant-on-canvas-color` for fg                                              |

The variant context tokens are also consumed by element baselines that need a tint without a class — alerts and callouts read `--color-{variant}-bg-subtle`, `--color-{variant}-text-emphasis`, `--color-{variant}-border-subtle` directly from the theme layer.

---

## 4. Sizes

Two scale steps plus the default (no `.medium` class — the bare element IS medium). Sizes consume Tailwind's scale tokens.

```scss
.small {
	--set-size-padding-inline: calc(var(--spacing) * 2); // 0.5rem  / 8px
	--set-size-padding-block: calc(var(--spacing) * 1); // 0.25rem / 4px
	--set-size-font-size: var(--text-xs); // 0.75rem  / 12px
	--set-size-border-radius: var(--radius-sm); // 0.25rem / 4px
}
.large {
	--set-size-padding-inline: calc(var(--spacing) * 4); // 1rem  / 16px
	--set-size-padding-block: calc(var(--spacing) * 2); // 0.5rem / 8px
	--set-size-font-size: var(--text-base); // 1rem   / 16px
	--set-size-border-radius: var(--radius-lg); // 0.5rem / 8px
}
```

The framework-level `--set-density-factor` (declared in [`_tokens.scss`](../src/styles/_tokens.scss)) lets consumers globally retune the padding rhythm. Element partials that opt in wrap their padding tokens with `calc(value * var(--set-density-factor))`, so a `:root { --set-density-factor: 0.75 }` declaration compacts every action surface in lockstep.

**Why no `.huge`:** Tailwind owns the `text-*` size scale; a `.huge` modifier that bundled a coordinated padding + font + radius step would silently lose every cascade fight against any `.text-{n}` utility a consumer dropped in. Per-call typography sizing uses Tailwind utilities; per-component scale escalation past `.large` is rare enough to be a custom token override.

---

## 5. Styles

Two fill treatments. Each consumes the variant context — meaning the same `.subtle` class produces a primary-tinted callout or a danger-tinted callout depending on the variant set alongside it.

```scss
.subtle {
	--set-style-color: var(--set-variant-subtle-color, currentColor);
	--set-style-background-color: var(--set-variant-subtle-background-color, transparent);
	--set-style-border-color: var(--set-variant-subtle-border-color, transparent);
	--set-style-border-width: 1px;
}
.filled {
	--set-style-color: var(--set-variant-color, currentColor);
	--set-style-background-color: var(--set-variant-background-color, transparent);
	--set-style-border-color: var(--set-variant-border-color, transparent);
	--set-style-border-width: 1px;
}
```

`<button class="primary subtle">` paints emphasis-blue text on a tinted-blue background with a subtle blue border — `.subtle` pulls the variant SUBTLE tier into the style context. `<button class="primary filled">` is the explicit version of `<button class="primary">` for action surfaces (the bare-variant action surface defaults to `.filled` automatically; non-action surfaces stay neutral and require `.subtle` or `.filled` to opt into the surface fill).

**Why no `.outline`:** Tailwind ships its own `.outline` utility (`outline-style: solid`) which would stack a separate UA outline alongside the framework border. Consumers who want an outlined look use the bare-variant element (`<button class="primary">` with no `.filled` paints variant text + variant border on transparent) or compose Tailwind border utilities (`<button class="primary bg-transparent">`).

**Why no `.ghost`:** Audited at framework cleanup. The transparent text-on-canvas pattern failed WCAG AA on 4 of 7 variants in dark mode and 3 of 7 in light. The "minimal-chrome button that doesn't compete" intent is now covered by the bare element (outline-ish) or `.subtle` (tinted but always readable).

---

## 6. States

State classes mirror existing element pseudo-classes for hosts that don't expose a native attribute equivalent.

```scss
.disabled {
	cursor: not-allowed;
	pointer-events: none;
	opacity: 0.5;
}
.active {
	/* marker class — element files paint per-element active chrome */
}
.loading {
	cursor: progress;
	/* element partials / composables paint a spinner overlay */
}
```

Use the state class when the native attribute isn't available. `<a class="disabled">` is the right pattern because `<a>` has no `disabled` attribute. `<button disabled>` is the right pattern because `<button>` does — the `.disabled` class is redundant and shouldn't be applied. Pair `.disabled` with `aria-disabled="true"` for accessibility on non-form elements.

`.active` is a marker class — element partials (button, anchor, tab) provide visual treatment via `&.active` rules. The class itself emits no declarations.

`.loading` is the framework's spinner-overlay state. The element partial decides whether to render the spinner via a `::after` pseudo (default) or to defer to a child `<progress>` indeterminate (for hosts that already contain a progress slot).

---

## 7. Placements

Eight values map to CSS `position-area` keywords plus paired `align-self` / `justify-self` so the panel hugs the anchor's edge instead of drifting to the middle of the available area. Scoped to `[popover]:not(aside):not(nav):not(output)` so per-element placement semantics on `<aside>` (drawer edge), `<nav>` (rail side), and `<output>` (toast corner) aren't disrupted by the global vocabulary.

```scss
[popover]:not(aside):not(nav):not(output).top {
	position-area: block-start;
	align-self: end;
	justify-self: anchor-center;
}
[popover]:not(aside):not(nav):not(output).bottom-start {
	position-area: block-end span-inline-end;
	align-self: start;
	justify-self: start;
}
/* … six more cardinal + corner placements, see _placements.scss */
```

Logical-axis values (`block-start`, `inline-start`) keep RTL working. The full anchor positioning surface — including `position-try-fallbacks` for viewport overflow — lives in [`surfaces/_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss).

For non-popover surfaces (`<aside>` drawer, `<output>` toast, `<nav>` rail), the placement classes map to per-element rules in the matching component partial. A `<aside class="start">` slides in from the inline-start edge regardless of whether it's a popover-mode drawer or an in-flow rail.

---

## 8. TypeScript mirror

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
	size: {
		small: 'small',
		large: 'large',
	},
	style: {
		subtle: 'subtle',
		filled: 'filled',
	},
	state: {
		disabled: 'disabled',
		active: 'active',
		loading: 'loading',
	},
	placement: {
		top: 'top',
		bottom: 'bottom',
		start: 'start',
		end: 'end',
		'top-start': 'top-start',
		'top-end': 'top-end',
		'bottom-start': 'bottom-start',
		'bottom-end': 'bottom-end',
	},
} as const

export type Variant = (typeof modifiers.variant)[keyof typeof modifiers.variant]
export type Size = (typeof modifiers.size)[keyof typeof modifiers.size]
export type Style = (typeof modifiers.style)[keyof typeof modifiers.style]
export type State = (typeof modifiers.state)[keyof typeof modifiers.state]
// Placement is the canonical floating-panel side+alignment union; declared
// in `./types.ts` and re-exported here so consumers reaching for modifiers
// and the placement type find one shape.
export type { Placement } from './types.js'
```

The bidirectional parity test at [`tests/src/browser/modifiers.test.ts`](../tests/src/browser/modifiers.test.ts) enforces: every CSS class declared in `modifiers/_*.scss` appears as a TS leaf, and every TS leaf has a matching CSS rule.

---

## 9. Element-local modifiers

A small set of modifiers only make sense on one specific element — for example `<form>.row` (flip the form's flex direction from column to row), `<button>.dropdown` (rotate a chevron when paired with `[aria-expanded]`), or `<article>.frame` (zero the article's outer inset + gap so children fill edge-to-edge). These do not belong in any of the five cross-cutting dimensions, but they DO belong in the modifier layer so the cascade order matches the conceptual role.

They live in [`src/styles/modifiers/_local.scss`](../src/styles/modifiers/_local.scss), grouped alphabetically by element. The file's charter rejects:

- Class names that match the cross-cutting modifier vocabulary (a `.row` rule that only applied to forms but used the unscoped `.row` selector would collide with other elements' rules).
- Class names that collide with Tailwind single-token utilities (`block`, `flex`, `grid`, `rounded`, `outline`, etc.).
- Rules that aren't gated to a single element selector (`form.row`, `button.dropdown`, `details.flush`, `article.frame`, `td.frame` — never bare `.row` / `.dropdown` / `.frame`).

Rules MAY declare `--set-{tag}-*` tokens scoped to the same element the selector targets (e.g., `article.frame` writes `--set-article-padding-{inline,block}: 0` so descendant chrome reading those tokens — auto-banded header bleed margins — collapses to zero alongside the padding). Per-element token namespaces are recorded as `tokens.extras` in the relevant [`FILE_EXCEPTIONS`](../src/browser/patterns.ts) entry.

The element-local test at [`tests/src/styles/modifiers/_local.test.ts`](../tests/src/styles/modifiers/_local.test.ts) enforces the charter.

---

## 10. Adding a value to an existing dimension

Most dimensions stay closed. The framework is opinionated about the vocabulary — extending it is a deliberate design decision, not a per-project customization. Adding a value:

1. Add the rule to the matching `modifiers/_*.scss` partial. Use the existing rules as templates; new variants tune contrast text + identity color; new sizes step the four context tokens consistently.
2. Add the value to the matching `modifiers.ts` object + derived type.
3. Add the value to the matching Sass list in [`_mixins.scss`](../src/styles/_mixins.scss) (`$variants`, `$sizes`, etc.) so any `@each` loops in element / component partials pick up the new value automatically.
4. The bidirectional parity test catches drift between SCSS and TS. The docs-parity test ([`tests/guides/modifiers.test.ts`](../tests/guides/modifiers.test.ts)) catches drift between this document's dimension table and the shipped TS.

---

## 11. Anti-rules

- **Don't abbreviate.** `.info` is wrong; `.information` is right. `.lg` is wrong; `.large` is right. `.bg-primary` is Tailwind utility-class territory — framework modifiers don't compete with utilities.
- **Don't overlap dimension vocabularies.** `.dark` is reserved for theming, not a variant value. `.tight` is line-height; not a size value. Each dimension's values are distinct adjectives within that dimension; no cross-dimension collisions.
- **Don't introduce a modifier whose effect is "set a hard-coded color or value."** Modifiers set tokens; the cascade does the rest. A `.brand` modifier that hard-codes `color: red` is wrong — instead, the consumer overrides `--color-primary` at `:root` and uses `.primary`.
- **Don't hand-roll `&.primary { color: … }` blocks inside element / component files.** The cascade already feeds `--set-{name}-*` through the fallback chain. Per-modifier rules in element files are only justified when a property genuinely cannot come from a token (e.g. `<form>.row` flips a flex-direction layout primitive that has no token equivalent) — and those rules belong in `_element-scoped.scss`. The [`handrolled.test.ts`](../tests/guides/modifiers.test.ts) parity test fails when three or more `.X.{variant}` rules appear in one non-modifier file.
- **Don't apply modifier classes to elements that don't consume the matching context tokens.** A `.primary` class on a `<section>` does nothing because `<section>` has no `--set-section-*` token chain. Use the substantive element instead (`<article class="primary">`).
- **Don't reuse a Tailwind utility class name as a framework modifier.** `.rounded`, `.outline`, `.inline`, `.block`, `.hidden`, `.shadow`, `.ring`, `.border`, `.truncate`, etc. are all Tailwind territory. The collision watch list lives in [`tests/setupStyles.ts`](../tests/setupStyles.ts).

---

## 12. Reference

- [elements.md](elements.md) — every native HTML element + the framework's treatment of it.
- [styles.md](styles.md) — top-level architecture; the cascade layer order modifiers participate in.
- [tokens.md](tokens.md) — the `--set-*` namespace modifiers write.
- [mixins.md](mixins.md) — the `$variants` / `$sizes` / `$styles` / `$states` Sass lists modifier partials iterate.
- [elements.md](elements.md) — the catalog of token-consuming elements.
- [components.md](components.md) — element compositions that consume the same modifier tokens.
- [composables.md](composables.md) — Vue + factory layer; composables consume state-class modifiers for the open / closed lifecycle.
- [surfaces.md](surfaces.md) — the anchor-positioning surface that powers `.top` / `.bottom` / `.start` / `.end` placement.
