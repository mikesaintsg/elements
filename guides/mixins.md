# Mixins & Sass Constants

> Authoritative reference for the framework's Sass-side reusable helpers. Source: [\_mixins.scss](../src/styles/_mixins.scss).

## Surface

`src/styles/_mixins.scss` declares every Sass helper the framework ships. It emits no top-level CSS on its own — every consumer writes `@use '../mixins' as *;` to bring helpers into scope.

**Sass list constants** (drive every `@each` loop):

| Constant    | Values                                                                | Role                                                                                                                                  |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `$variants` | `primary, secondary, tertiary, success, warning, danger, information` | Seven semantic palette roles. Iterated by `_variants.scss` and every per-variant tint emitter.                                        |
| `$sizes`    | `small, large`                                                        | Two non-default sizes. `medium` is the bare-element default and is intentionally absent.                                              |
| `$styles`   | `subtle, filled`                                                      | Two fill treatments applied on top of a variant. (`.outline` removed — Tailwind owns it; `.ghost` removed — failed WCAG AA contrast.) |
| `$states`   | `disabled, active, loading`                                           | Three interaction / lifecycle states.                                                                                                 |

**`@mixin` declarations** (cross-cutting helpers):

| Mixin                                           | Purpose                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `reduced-motion`                                | Wrap content in `@media (prefers-reduced-motion: reduce)`.                        |
| `transition($value)`                            | Declare `transition: $value` with a paired `reduced-motion { transition: none }`. |
| `focus-ring($alpha: 0.35)`                      | Paint the framework's canonical focus signal.                                     |
| `forced-colors`                                 | Wrap content in `@media (forced-colors: active)` for Windows High Contrast.       |
| `truncate`                                      | Single-line text ellipsis.                                                        |
| `size-container($name, $type)`                  | Mark the element as a size-aware `@container` host.                               |
| `floater-bounds($component, $width-prop)`       | Pair design width against the viewport-clamp budget for floating surfaces.        |
| `floater-side-insets($component, $padding-var)` | Emit the four `--set-{component}-inset-*` tokens with `env()` safe-area max.      |
| `floater-edge($edge)`                           | Anchor a fixed-position element to a single viewport edge.                        |
| `floater-fullscreen`                            | Fill the viewport on both axes with `inset: 0` + dynamic viewport units.          |
| `palette-each($exclude: ())`                    | `@each` over `$variants` yielding the variant name to a content block.            |
| `reveal($end: false)`                           | Idle (collapsed) reveal-on-hover grid — label track `0fr`, gap zero, exit timing. |
| `reveal-revealed($end: false)`                  | Revealed (expanded) reveal grid — label track `1fr`, gap restored, entry timing.  |
| `reveal-label($end: false)`                     | Idle reveal label slot — `min-inline-size: 0`, clip, fade + slide out from behind the icon (`.end` mirrors). |
| `reveal-revealed-label`                         | Revealed reveal label slot — fade + slide the label home (`translateX(0)`).       |

---

## Contract

These invariants hold across `_mixins.scss` ↔ `mixins.md` ↔ consuming partials:

1. **SCSS → DOC.** Every `@mixin name(...)` declared in `_mixins.scss` is mentioned in this guide as a backticked identifier (bare ` ` `name` ` ` or signature-form ` ` `name($arg)` ` `).
2. **DOC → SCSS.** Every kebab-case backticked identifier in this guide that names a mixin resolves to a real declaration in `_mixins.scss`. CSS keywords and property names are exempt.
3. **List constants drive iteration.** Every `@each` loop over a modifier dimension reads from one of `$variants` / `$sizes` / `$styles` / `$states`. Hard-coded loops over the same vocabulary are forbidden.

Both directions are enforced by [`tests/guides/mixins.test.ts`](../tests/guides/mixins.test.ts).

---

## Patterns

### Motion & focus

#### `reduced-motion`

Wraps content in `@media (prefers-reduced-motion: reduce)`. Every rule that should reset when the user prefers reduced motion routes through this mixin.

```scss
.spinner {
	animation: spin 1s linear infinite;

	@include reduced-motion {
		animation: none;
	}
}
```

#### `transition($value)`

Declares `transition: $value` plus a nested `reduced-motion { transition: none }`. Every transitional rule in the framework uses this; consumers should not write bare `transition:` declarations on framework-styled elements.

```scss
button {
	@include transition(
		(
			color var(--set-button-transition-duration),
			background-color var(--set-button-transition-duration),
			border-color var(--set-button-transition-duration),
			box-shadow var(--set-button-transition-duration)
		)
	);
}
```

#### `focus-ring($alpha: 0.35)`

Paints the framework's canonical focus signal:

```scss
box-shadow: 0 0 0 var(--set-focus-box-shadow-width)
	color-mix(
		in oklab,
		var(--set-variant-background-color, var(--color-primary)) calc(#{$alpha} * 100%),
		transparent
	);
```

The color tracks `--set-variant-background-color`, falling back to `--color-primary` when no modifier is applied. `$alpha` (default `0.35`) controls ring intensity.

```scss
button:focus-visible {
	outline: none;
	@include focus-ring;
}
```

Pair with `outline: none` so the ring reads as the sole focus affordance.

### Accessibility & responsive

#### `forced-colors`

Wraps a rule body in `@media (forced-colors: active)` — Windows High Contrast mode. Element baselines use this to swap custom colors for system color keywords (`Canvas`, `CanvasText`, `Field`, `FieldText`, `Highlight`, `HighlightText`, `ButtonFace`, `ButtonText`, `LinkText`, `GrayText`, `AccentColor`, `AccentColorText`). Documented on `<button>`, `<input>`, `<dialog>`, `<aside>`, and `[popover]`.

```scss
.badge {
	@include forced-colors {
		background-color: ButtonFace;
		color: ButtonText;
		border: 1px solid ButtonText;
	}
}
```

#### `truncate`

Single-line text ellipsis. Emits `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Used by `<select-value>`, breadcrumb segments, and table cell labels.

```scss
select-value {
	@include truncate;
}
```

#### `size-container($name, $type: inline-size)`

Marks the element as a size-aware container for `@container` queries — declares `container-type` and `container-name` so descendant `@container $name (…)` queries resolve. Used wherever element-internal layout depends on the element's own width, not the viewport's.

```scss
article {
	@include size-container('card');
}

@container card (min-width: 480px) {
	/* … */
}
```

`$name` is a single-word, kebab-case identifier. Pass `$type: size` for the rare case where block-axis queries are also required; the default `inline-size` matches the W3C primitive the framework standardises on.

### Floating-surface mixins

The floater family centralises the viewport-clamped sizing used by tooltip, popover, toast, dropdown, drawer, and modal. Every consumer reads through the same `--set-floater-*` token chain (declared in [tokens.md](tokens.md)), so a single retune at `:root` scope retunes every floating surface.

#### `floater-bounds($component, $width-prop: 'max-inline-size')`

Pairs the consumer's design width against the framework's viewport budget. Sets the chosen inline-size property to `min(var(--set-{component}-inline-size), var(--set-floater-max-inline-size))`, and `max-block-size` to `var(--set-floater-max-block-size)`. On desktop the panel lands at design width; on mobile it shrinks to fit. Pass `$component: null` for panels with no design upper bound, or `$width-prop: 'inline-size'` for fixed-width panels (toast) that should take the smaller of the two values rather than just be capped by it.

```scss
output[popover] {
	@include floater-bounds('toast', 'inline-size');
}
```

#### `floater-side-insets($component, $padding-var)`

Emits the four `--set-{component}-inset-{top,bottom,start,end}` tokens. Each side resolves to `max(var($padding-var), env(safe-area-inset-*, 0px))` — the larger of the component's placement padding and the platform's safe-area inset, so notched and rounded-corner devices keep clearance even when the consumer asked for `p-0`. Requires `viewport-fit=cover` in the host page's viewport meta tag for non-zero `env()` values on iOS.

```scss
output[popover] {
	@include floater-side-insets('toast', --set-toast-edge-inset);
}
```

#### `floater-edge($edge)`

Anchors a fixed-position element to a single viewport edge — drawer territory, plus toast bottom-end and similar pinned surfaces. Accepts `start`, `end`, `top`, or `bottom`; sets only the inset values, leaving sizing, border direction, and slide transforms to the consumer.

```scss
aside[popover].drawer-end {
	@include floater-edge('end');
}
```

#### `floater-fullscreen`

Fills the viewport on both axes with `inset: 0` and dynamic-viewport units (`100dvw` / `100dvh`), and drops border + border-radius so the surface reads as full-bleed. Used by `useDialog.fullscreen` and `useAside` fullscreen variants.

```scss
dialog.fullscreen[open] {
	@include floater-fullscreen;
}
```

### Palette iteration

#### `palette-each($exclude: ())`

`@each` loop over `$variants` that yields the variant name to its content block. Removes the boilerplate of typing the seven-value list in every per-variant rule emitter. Used by `_variants.scss` and any component that needs per-variant rules (toast tint, alert tint, callout tint, badge tint). Pass `$exclude` to skip variants that do not apply — e.g. `(secondary)` for chrome that does not carry a neutral semantic role.

```scss
@include palette-each using ($variant) {
	.badge.#{$variant} {
		background-color: var(--color-#{$variant});
		color: var(--color-#{$variant}-contrast);
	}
}
```

Saves repeating seven near-identical rules by hand and guarantees every consumer iterates the same list in the same order.

### Reveal (collapse-on-rest button label)

The reveal-on-hover contract for the `button.reveal` (+ `.end` direction) element-local modifier (in [modifiers/\_local.scss](../src/styles/modifiers/_local.scss)). An icon button whose text label is collapsed at rest and expands on `:hover` / `:focus-visible`. Single-sourced here so the default (label trails the icon) and the `.end` direction (label leads, `$end: true`) share one definition of the load-bearing two-track grid + asymmetric-timing math — and so a future `a.reveal` can reuse it without re-deriving the mechanism.

Four mixins compose the contract — two for the host grid, two for the label slot:

#### `reveal($end: false)` / `reveal-revealed($end: false)`

The host grid. `reveal($end)` is the idle (collapsed) state — the label track is `0fr`, the column gap is zero, and the EXIT transition (slower, delayed, so the label lingers as the pointer leaves) is applied. `reveal-revealed($end)` is the engaged state — the label track is `1fr`, the column gap is restored to the button's own icon↔label gap (`--set-button-gap`), and the ENTRY transition (fast, no delay) is applied. The `0fr` → `1fr` track animation works without measuring the label in JS: the engine interpolates the `fr` track between the two rules. Pass `$end: true` to put the collapsed track on the inline-start (icon trailing).

```scss
@media (hover: hover) and (pointer: fine) {
	button.reveal {
		@include reveal;
	}
	button.reveal:hover,
	button.reveal:focus-visible {
		@include reveal-revealed;
	}
}
```

#### `reveal-label($end: false)` / `reveal-revealed-label`

The label slot, applied to the button's child `<span>`. `reveal-label` is the idle slot — `min-inline-size: 0` (load-bearing: a label's min-content width otherwise fights the `0fr` track and the column never collapses), clipped overflow, and a fade **+ slide out from behind the icon** on the exit timing: the label starts tucked under the glyph (which the host raises above it in the stacking order) and slides into place, so `$end: true` mirrors the slide direction for the icon-trailing variant. `reveal-revealed-label` fades + slides the label home (`translateX(0)`) on the entry timing.

```scss
@media (hover: hover) and (pointer: fine) {
	button.reveal > span {
		@include reveal-label;
	}
	button.reveal:hover > span,
	button.reveal:focus-visible > span {
		@include reveal-revealed-label;
	}
}
```

Every transition routes through `transition()`, so each mixin emits the paired `prefers-reduced-motion: reduce` opt-out automatically. The asymmetric durations are tunable through the `--set-button-reveal-*` token surface (declared on `<button>` — see [tokens.md](tokens.md)); the revealed column-gap reuses the button's own `--set-button-gap`, so a revealed reveal matches a static icon+text button at every size.

### List-constant overrides

The `!default` flag on every list constant lets a consumer override any list via `@use 'mixins' with ($variants: (primary, accent, warning, danger))` to ship a project-specific palette without forking the framework.

Names match the modifier dimensions exactly — no `$colors`, no `$button-sizes`. When `modifiers.ts` exports a `Variant` type, `$variants` is the same axis on the SCSS side. See [modifiers.md](modifiers.md) for the full vocabulary.

No `$shapes` list — corner roundness flows through `--set-radius-factor` at `:root` ([modifiers.md](modifiers.md) §1). Placement values are emitted directly in `_placements.scss` without a Sass list because the eight values don't compose with anything else.

### Authoring new mixins

Add a new mixin only when **the pattern repeats across three or more partials AND the partials would otherwise drift**. The third instance is what justifies the helper; anticipation of future reuse is not.

When adding a mixin:

1. Pick a lowercase kebab-case name. Verb or verb-noun: `reduced-motion`, `focus-ring`, `floater-bounds`.
2. Write a `///` doc-comment naming purpose, parameters, and a usage snippet showing the call site (not the implementation).
3. If the mixin takes a list or token that consumers might want to retune, declare it with `!default`.
4. Document the new mixin in this guide under the appropriate `### {name}` section.
5. Add a test fixture if the mixin emits non-trivial CSS (viewport math, `color-mix`, container-query pairings).
6. Migrate every existing duplicate call site to the new mixin in the same change. A mixin added without immediate adoption is dead code.

### Anti-rules

- **No element-specific mixins.** An element's quirks belong in its element partial, not the shared registry. `<button>`'s hover darken is `color-mix` inline; it is not a `button-hover` mixin.
- **No mixin that wraps `@layer`.** Use the layer directive directly — the indirection adds no leverage.
- **No mixin whose contract is "declare these three properties".** That's a snippet, not a reusable abstraction. The exception is `truncate`, which earned its place by appearing in five partials and being a named, well-known CSS pattern.
- **No premature abstraction.** A property-shaped pattern that looks reusable across two partials but turns out to be variant-specific costs more to unwind than to inline.
- **No mixin that duplicates a Tailwind utility.** `.shadow-lg`, `.rounded-md`, `.text-center` — Tailwind owns those.

### Custom-property values and `#{…}` interpolation

When a Sass function call appears inside a CSS custom-property value (`--set-foo: …;`), wrap it in `#{}` to force evaluation. Sass treats custom-property values as plain CSS by default:

```scss
// Wrong — emits the literal `tint(...)` to CSS
.alert {
	--set-alert-bg: tint('primary', 0.1);
}

// Right — interpolation forces the function to evaluate
.alert {
	--set-alert-bg: #{tint('primary', 0.1)};
}
```

Regular property declarations (`background-color: tint(…)`) do not need interpolation — Sass knows the right-hand side is a Sass value site there.

---

## Tests

- [`tests/guides/mixins.test.ts`](../tests/guides/mixins.test.ts) — bidirectional parity between `_mixins.scss` and this guide. Every shipped mixin is documented; every documented mixin name resolves to a real declaration.

---

## See also

- [\_mixins.scss](../src/styles/_mixins.scss) — Sass source
- [styles.md](styles.md) — top-level cascade architecture
- [tokens.md](tokens.md) — token surface the mixins read through
- [modifiers.md](modifiers.md) — modifier-dimension lists and their consumers
- [components.md](components.md) — component partials that consume the floater family
- [composables.md](composables.md) — composables whose CSS counterparts use these mixins
