# Mixins & Sass Constants

> Centralized SCSS helpers and shared list constants. Source: [src/styles/\_mixins.scss](../src/styles/_mixins.scss).

`_mixins.scss` is the SCSS analogue of a `helpers.ts` registry. It emits no top-level CSS of its own — every consumer writes `@use '../mixins' as *;` to bring helpers into scope. Sass list constants documented here drive every per-modifier loop in the codebase, so a contributor changing a list (e.g., adding a variant) updates every iterator that depends on it in one place.

---

## 1. The "extract once duplicated" rule

A pattern moves into `_mixins.scss` only when **two or more partials would otherwise duplicate it**. Single-use patterns stay inline in their own partial. The risk we're guarding against: a registry full of bespoke helpers that obscure what's actually shared.

A new helper added here gets:

- A single-line `///` doc-comment naming its purpose.
- Lowercase kebab-case name (verb or verb-noun: `reduced-motion`, `transition`, `focus-ring`).
- An entry in §3 of this guide.

---

## 2. Sass list constants

The five modifier dimensions surface here as plural-named lists, in the same order as their CSS source files. A `@each` loop that needs to enumerate a dimension reaches for these.

```scss
$variants: (primary, secondary, tertiary, success, warning, danger, information) !default;
$sizes: (small, large) !default;
$styles: (ghost, filled) !default;
$states: (disabled, active, loading) !default;
```

The full shape dimension was dropped because Tailwind v4's `.rounded-{none|sm|md|lg|xl|2xl|3xl|full}` utility scale covers every value a shape modifier would set. `.huge` was dropped from sizes to align with mailbox's `sm`/`lg`-only convention; oversized CTAs are composable from Tailwind utilities (`.px-8`, `.text-xl`) when needed. `$styles` ships only `ghost` + `filled` — `.outline` collides with Tailwind's outline utility. See [modifiers.md](modifiers.md) for the full vocabulary rationale.

| List        | Used by                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `$variants` | `modifiers/_variants.scss` (defines the seven values), parity tests, future per-color generators |
| `$sizes`    | `modifiers/_sizes.scss`, future per-size generators                                              |
| `$shapes`   | `modifiers/_shapes.scss`, future per-shape generators                                            |
| `$styles`   | `modifiers/_styles.scss`, future per-style generators                                            |
| `$states`   | `modifiers/_states.scss`, future per-state generators                                            |

The `!default` flag makes them downstream-overridable: a consumer can `@use 'mixins' with ($variants: (primary, accent, warning, danger))` to ship a project-specific palette.

**Names match the modifier dimensions exactly.** No `$colors`, no `$button-sizes` — the lists are dimension-named so loops read uniformly across the codebase. When `modifiers.ts` exports a `Variant` type, the SCSS `$variants` list is the same axis on the SCSS side.

---

## 3. Helpers

### `reduced-motion`

```scss
@mixin reduced-motion {
	@media (prefers-reduced-motion: reduce) {
		@content;
	}
}
```

Wraps content in the `prefers-reduced-motion: reduce` media query. Usage:

```scss
.spinner {
	animation: spin 1s linear infinite;

	@include reduced-motion {
		animation: none;
	}
}
```

This is the lower-level building block. For transitions, use `transition()` instead — it pairs the declaration with the guard automatically.

### `transition`

```scss
@mixin transition($value) {
	transition: $value;
	@include reduced-motion {
		transition: none;
	}
}
```

Emits a `transition:` declaration plus the matching reduced-motion guard. The two-line pattern was the dominant duplicate across animated partials — this collapses it into one call. **Use this for every transition declared in the project.** Hand-writing the pair is a code smell.

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

### `focus-ring`

```scss
@mixin focus-ring($alpha: 0.35) {
	box-shadow: 0 0 0 var(--set-focus-box-shadow-width)
		color-mix(
			in oklab,
			var(--set-variant-background-color, var(--color-primary)) calc(#{$alpha} * 100%),
			transparent
		);
}
```

Emits the canonical focus-ring `box-shadow`. The color tracks the active variant via `--set-variant-background-color`, falling back to `--color-primary` when no variant is applied. The `$alpha` parameter (default `0.35`, matching `--set-focus-box-shadow-opacity`) controls ring intensity.

The mixin **is not yet called from any partial** — `_button.scss` currently inlines the same `box-shadow` + `color-mix` formula because it's the only consumer. Once a second element (e.g., `<a>`, `<input>`) opts into the same focus ring, both partials will switch to the mixin.

---

## 4. Decision tree — function vs. mixin vs. placeholder

Sass offers three tools. Pick the right one for what you're sharing.

| You need                                    | Tool                                  | Returns | Emits                                   | Example use                                                  |
| ------------------------------------------- | ------------------------------------- | ------- | --------------------------------------- | ------------------------------------------------------------ |
| A value to plug into a property             | `@function`                           | a value | nothing                                 | `tint($name, $alpha)` (future), `clamp-spacing($n)`          |
| To emit a block of CSS                      | `@mixin`                              | nothing | the block at every call site            | `transition($value)`, `focus-ring($alpha)`, `reduced-motion` |
| Static identical declarations sharable once | `%placeholder` extended via `@extend` | nothing | once at the placeholder's compile point | (none currently)                                             |

**Caveat on placeholders:** Sass placeholders are NOT reachable across `@use` boundaries. They're file-local. If you need cross-file sharing, use `@mixin` (the trade-off is N copies in compiled output rather than one). For the framework's current scope, every reusable pattern is small enough that the duplication cost is negligible.

**The `transition` mixin's design.** Could it be a function? No — functions return values; this emits two declarations. Could it be a placeholder? No — `@extend` would cross `@use` boundaries with edge-cases around `@layer`. A mixin is the right tool: declarative at the call site, no surprise specificity coupling.

---

## 5. Custom-property values and `#{…}` interpolation

When a Sass function call appears inside a CSS custom-property value (`--bs-foo: …;`), wrap it in `#{}` to force evaluation:

```scss
// Wrong — Sass treats the value as plain CSS and emits the literal `tint(...)`
.alert {
	--set-alert-bg: tint('primary', 0.1);
}

// Right — interpolation forces the function to evaluate
.alert {
	--set-alert-bg: #{tint('primary', 0.1)};
}
```

Sass treats custom-property values as plain CSS by default. In regular property declarations (`background-color: tint(…)`), no interpolation is needed because Sass knows the property is a Sass value site.

This rule will surface as soon as we add a function (e.g., a `tint()` helper). Document it now so the convention is clear when the time comes.

---

## 6. What `_mixins.scss` is NOT for

- One-off rules that only one partial would use. Inline them in the partial.
- Component-specific chrome (e.g., button's hover darken). That's `color-mix` inline; not a shared pattern.
- Property-shaped patterns that look reusable but are actually variant-specific. Premature abstraction is more expensive than the third instance you eventually extract.
- Patterns that already have a Tailwind utility. `.shadow-lg`, `.rounded-md`, `.text-center` — Tailwind owns those.

---

## 7. Adding a new helper

1. Confirm ≥ 2 partials would otherwise duplicate the pattern.
2. Decide function vs. mixin vs. placeholder via §4's decision tree.
3. Write the helper with a `///` doc-comment.
4. If the helper takes user-overridable values (like a list), use `!default` so consumers can re-tune via `@use ... with (…)`.
5. Update §3 (helpers) or §2 (lists) of this guide.
6. Migrate the call sites from inlined patterns to the new helper in the same change.

A helper added without immediate call-site adoption is dead code. The pattern's third instance is what justifies the helper, not anticipation of future reuse.

---

## Reference

- [\_mixins.scss](../src/styles/_mixins.scss) — SCSS source
- [styles.md](styles.md) §"Author's contract" — when to reach for a helper
- [modifiers.md](modifiers.md) — four-dimension list constants and their consumers
- [tokens.md](tokens.md) — token surface the helpers integrate with
