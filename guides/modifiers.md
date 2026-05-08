# Modifiers

> Four orthogonal dimensions, all spelled-out semantic English. CSS source: [src/styles/modifiers/](../src/styles/modifiers/). TS mirror: [src/browser/modifiers.ts](../src/browser/modifiers.ts). Bidirectional parity tests live alongside the shape tests in [tests/src/browser/modifiers.test.ts](../tests/src/browser/modifiers.test.ts).

A modifier class is a **token-setter**, never a property-setter. The class declares the values of context tokens (`--set-variant-*`, `--set-size-*`, `--set-style-*`); element files consume those tokens via fallback chains. This is what makes `<button class="primary large ghost">` Just Work — every modifier carries no element-specific code, and every element that consumes the cascade gets all modifiers for free.

The four dimensions are orthogonal: an element takes at most one value per dimension. They compose without conflict.

| Dimension                       | Values                                                                            | Sets these tokens                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Variant** (semantic identity) | `primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `information` | `--set-variant-color`, `--set-variant-background-color`, `--set-variant-border-color`, `--set-variant-border-width` |
| **Size** (physical scale)       | `small`, `large`                                                                  | `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius`         |
| **Style** (fill treatment)      | `ghost`, `filled`                                                                 | `--set-style-color`, `--set-style-background-color`, `--set-style-border-color`, `--set-style-border-width`         |
| **State** (interaction state)   | `disabled`, `active`, `loading`                                                   | (mostly element-owned; states declare universal cursor + pointer-events at the modifier level)                      |

**Why no shape dimension?** Tailwind v4 ships `.rounded-{none|sm|md|lg|xl|2xl|3xl|full}` utilities that cover every corner-radius value the framework would want a modifier for — `.pill` ≡ `.rounded-full`, `.square` ≡ `.rounded-none`, intermediate steps map directly. Shipping a shape modifier dimension would just duplicate Tailwind's vocabulary under different names. Consumers reach for `.rounded-full` and friends directly.

**Why no `.huge` size?** Mailbox's reference button system has only `.btn-sm` and `.btn-lg`; oversized CTAs are composable from Tailwind utilities (`.px-8`, `.py-3`, `.text-xl`) when needed. Two coarse steps (`small`, `large`) cover the common cases without bloating the size scale.

**Naming clashes that aren't shipped.** `.rounded` collides with Tailwind's `.rounded` utility (border-radius: 0.25rem) and `.outline` collides with Tailwind's `.outline` utility (outline-style: solid). Both Tailwind utilities live in the highest cascade layer and would always win against our modifiers. Rather than reorder layers (which would break the convention that explicit utility application overrides everything), the framework cedes the names to Tailwind. Consumers who want outlined patterns compose Tailwind's `border` + `bg-transparent` + `text-{variant}` utilities with a variant.

---

## 1. Why these names

- **Spelled out.** `information` not `info`. `large` not `lg`. `outline` not `ol`. The class name reads in HTML as English; every framework rule is "no abbreviations, ever."
- **Singular nouns or adjectives, no compounds.** No `extra-large`, `outlined-primary`, `pill-shaped`. Each dimension stays a clean axis.
- **No overlap across dimensions.** `dark` already names a theme; doesn't reuse here. `tight` already describes line-height; doesn't reuse for size. Vocabulary is partitioned.
- **No `medium` size.** The absence of any size class IS the default size — adding `.medium` would just be `.normal` in disguise.

---

## 2. Variant — semantic identity

Each variant chooses its own contrast text color. White on saturated colors (primary/tertiary/success/danger), black on light/yellow ones (secondary/warning/information). Consumers re-tuning the palette via `@theme` should also re-set `--set-variant-color` per variant if their palette inverts contrast.

```scss
/* src/styles/modifiers/_variants.scss */
.primary {
  --set-variant-color:            white;
  --set-variant-background-color: var(--color-primary);
  --set-variant-border-color:     var(--color-primary);
  --set-variant-border-width:     1px;
}
.secondary    { --set-variant-color: black; ... }
.tertiary     { --set-variant-color: white; ... }
.success      { --set-variant-color: white; ... }
.warning      { --set-variant-color: black; ... }
.danger       { --set-variant-color: white; ... }
.information  { --set-variant-color: black; ... }
```

The variant's identity color (used by outline / ghost / focus-ring) is `--set-variant-background-color` — the same token that fills the background in the filled state. No separate "base" token needed; the background color _is_ the variant's color.

`--set-variant-border-width: 1px` bumps the border width on a variant'd element so its border-color shows. Bare elements default to `0`, keeping them borderless.

---

## 3. Size — physical scale

Two coarse steps: small and large. Bare element renders at the default size (declared on the element itself in `elements/_{tag}.scss`) — no `.medium` class because absence is the default.

```scss
/* src/styles/modifiers/_sizes.scss */
.small {
	--set-size-padding-inline: calc(var(--spacing) * 2); /* 0.5rem  / 8px  */
	--set-size-padding-block: calc(var(--spacing) * 1); /* 0.25rem / 4px  */
	--set-size-font-size: var(--text-xs); /* 0.75rem / 12px */
	--set-size-border-radius: var(--radius-sm); /* 0.25rem / 4px  */
}
.large {
	--set-size-padding-inline: calc(var(--spacing) * 4); /* 1rem    / 16px */
	--set-size-padding-block: calc(var(--spacing) * 2); /* 0.5rem  / 8px  */
	--set-size-font-size: var(--text-base); /* 1rem    / 16px */
	--set-size-border-radius: var(--radius-lg); /* 0.5rem  / 8px  */
}
```

`var(--text-*)` and `var(--radius-*)` reference Tailwind theme tokens directly. `@tailwindcss/postcss` runs after Vite's Sass pass and processes the compiled CSS — it sees the var() references and emits the matching theme tokens on `:root`, so consumers can override `--text-xs` (etc.) at the `@theme` level and the size cascade follows.

The size context **does not** override font-weight or line-height — those inherit from the element's own defaults. If a consumer wants the small button's text bolder, they apply a Tailwind utility (`font-bold`) rather than overloading the modifier.

---

## 4. Style — fill treatment

`.ghost` / `.filled` re-route the variant's color through the style-context tokens. They consume `--set-variant-*` and rewrite `--set-style-*` to express different fill behaviors.

```scss
/* src/styles/modifiers/_styles.scss */
.ghost {
	--set-style-color: var(--set-variant-background-color);
	--set-style-background-color: transparent;
	--set-style-border-color: transparent;
	--set-style-border-width: 0;
}
.filled {
	--set-style-color: var(--set-variant-color);
	--set-style-background-color: var(--set-variant-background-color);
	--set-style-border-color: var(--set-variant-border-color);
	--set-style-border-width: 1px;
}
```

| Style     | Color            | Background       | Border         | Use case                                                               |
| --------- | ---------------- | ---------------- | -------------- | ---------------------------------------------------------------------- |
| `.ghost`  | variant identity | transparent      | transparent, 0 | tertiary / inline action                                               |
| `.filled` | variant text     | variant identity | variant border | primary CTA (also the implicit default when only a variant is applied) |

**`.filled` is mostly redundant** when you're already applying a variant — the cascade resolves to filled-style rendering by default. `.filled` exists for the case where a parent context applied `.ghost` and a child needs to opt back in.

**Outlined patterns** (transparent fill, visible border, variant text) compose with Tailwind utilities on top of a variant: `<button class="primary bg-transparent text-primary border border-primary">`. An `.outline` modifier was intentionally dropped because Tailwind's `.outline` utility (which sets `outline-style: solid; outline-width: 1px`) would stack a separate outline alongside our framework's border.

---

## 5. State — interaction state

State modifiers describe an interaction state distinct from native DOM attributes. They're useful when an element doesn't have a native `:disabled` (e.g., a styled `<a>`) or when state needs to drive styling beyond what the pseudo-class affords.

```scss
/* src/styles/modifiers/_states.scss */
.disabled {
	cursor: not-allowed;
	pointer-events: none;
	opacity: 0.5;
}
.active {
	/* element files own the visual treatment */
}
.loading {
	cursor: progress;
}
```

States are different from variant/size/style: they declare **CSS properties directly** (cursor, opacity), not context tokens. The behavior is universal — `cursor: not-allowed` on `.disabled` is correct on every element, whether it consumes the modifier cascade or not. Element files own the visual treatment of `.active` (e.g., button's `&.active` rule darkens the background).

For native disabled state, prefer the attribute (`disabled`, `aria-disabled="true"`). The class is the escape hatch.

---

## 6. The cascade — how an element resolves a modifier stack

Element files declare element-scoped tokens with fallback chains. `<button>`'s chain:

```scss
/* src/styles/elements/_button.scss (excerpt) */
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
	/* ... */
}
```

Reading the chains tells you the precedence:

- **Color / fill:** `style → variant → element default`. `.ghost` wins, then `.primary`, then bare button.
- **Border width:** same chain — `.ghost` sets 0, `.primary` sets 1px, bare button is 0.
- **Border radius:** `size → element default`. `.large` wins, then `--radius-md` literal. For non-default-non-size radii, consumers reach for Tailwind's `.rounded-{step}` directly.
- **Padding:** `size → element default`. `.large` wins, then bare button's default spacing.
- **Typography (font-size, font-weight, line-height):** size sets font-size; the bare element's own defaults handle weight + line-height.

This is what `<button class="primary large ghost">` resolves to:

1. `.primary` sets `--set-variant-*` (white text, primary fill, 1px border).
2. `.large` sets `--set-size-*` (wider padding, larger font, larger radius).
3. `.ghost` sets `--set-style-*` (reads `--set-variant-background-color`, drops to transparent fill + transparent border).
4. Button's chain reads each `--set-*` slot in priority order.

**Adding a new element** that wants the modifier system: declare element-scoped tokens with these fallback chains. Zero per-element variant/size/style rules.

---

## 7. TypeScript mirror

[`src/browser/modifiers.ts`](../src/browser/modifiers.ts) exports a frozen `modifiers` object plus derived string-literal-union types for typed component props.

```ts
import { modifiers, type Variant, type Size, type Style, type State } from '@elements/browser'

// String-literal constants — refactor-safe class names
el.classList.add(modifiers.variant.primary)             // 'primary'
el.classList.add(modifiers.size.large)                  // 'large'

// Derived types — typed component props
defineProps<{ variant?: Variant; size?: Size }>()

// Test factories
createButton({ variant: 'primary', size: 'large' })

// Runtime iteration (e.g., docs site auto-generation)
Object.values(modifiers.variant).forEach(name => /* ... */)
```

**TS keys match modifier-class names verbatim.** No `info` / `information` mismatch. Whatever the CSS class is, that's the string literal.

---

## 8. Parity tests

One file guards the modifier surface from drift, plus per-dimension behavior tests. All run in real Chromium (Playwright).

| Test                                                        | Project       | What it checks                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [modifiers.test.ts](../tests/src/browser/modifiers.test.ts) | `src:browser` | **Shape:** four dimensions present, expected keys per dimension, every leaf string equals its key. **TS → CSS:** every leaf has a `.{name}` rule via `findRule()`. **SCSS → TS:** every `.X { … }` declared in `modifiers/_*.scss` appears as a leaf in `modifiers.ts`. |

Plus per-dimension behavior tests in [tests/src/styles/modifiers/](../tests/src/styles/modifiers/) that mount an element and verify each modifier sets the expected context tokens.

---

## 9. Adding a new modifier

A new modifier dimension is a real architectural decision — not the same as adding a value to an existing dimension. Follow the smaller path first.

### Adding a value to an existing dimension

Example: a fourth size step `.tiny`.

1. Declare `.tiny { --set-size-* : … }` in [\_sizes.scss](../src/styles/modifiers/_sizes.scss).
2. Add `tiny: 'tiny'` to `modifiers.size` in [modifiers.ts](../src/browser/modifiers.ts).
3. Update the `$sizes` Sass list in [\_mixins.scss](../src/styles/_mixins.scss) (e.g., `(small, medium, large)` if reintroducing a `medium` step).
4. Add the value to the test in [\_sizes.test.ts](../tests/src/styles/modifiers/_sizes.test.ts).
5. Update the table in §3 of this guide.

The parity tests catch any drift automatically — TS without a CSS rule fails; CSS without a TS leaf fails.

### Adding a new dimension

Example: a `density` dimension (compact / cozy / spacious).

1. Decide the context-token namespace (`--set-density-*`).
2. Author `src/styles/modifiers/_densities.scss` with each class setting the context tokens.
3. Add a `density` group to [modifiers.ts](../src/browser/modifiers.ts) and a derived `Density` type.
4. Add `$densities` to [\_mixins.scss](../src/styles/_mixins.scss) Sass lists.
5. **Update every element file that wants to consume the dimension** — add a `--set-{tag}-* : var(--set-density-*, …)` link in their fallback chains.
6. Add `_densities.test.ts` to verify each class sets its context tokens.
7. Update the parity test if its grouping logic needs to know about the new dimension.
8. Update §1 of this guide and add a §X subsection describing the dimension's contract.

A new dimension is rare — the existing five are designed to be near-exhaustive for HTML element modification. Reach for it only when the design surfaces a genuinely orthogonal axis.

---

## Reference

- [src/styles/modifiers/](../src/styles/modifiers/) — SCSS sources
- [modifiers.ts](../src/browser/modifiers.ts) — TS mirror
- [modifiers.test.ts](../tests/src/browser/modifiers.test.ts) — bidirectional parity contract (subsumes the old `modifiers.parity.test.ts`)
- [tokens.md](tokens.md) — context-token surface (modifiers set the tokens documented there)
- [elements.md](elements.md) — element-side consumption pattern
