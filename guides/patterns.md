# Style-folder structural contracts

> One contract per folder under [`src/styles/`](../src/styles/). Every SCSS partial in a folder is held to the matching contract by the parity test at [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts). The contract data lives in [`src/browser/patterns.ts`](../src/browser/patterns.ts); this document is the prose explanation. When the two disagree, the TS is authoritative.

## Surface

Eleven codified contract registries govern every SCSS partial the framework ships. Each is a typed structure in [`src/browser/patterns.ts`](../src/browser/patterns.ts), each is enforced by a test, and each has a per-folder or per-domain prose section in this guide.

### Contract registries

| Registry                    | Scope                                                                           | TS location (`src/browser/patterns.ts`)                 | Prose                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `FOLDER_CONTRACTS`          | Per-folder rules (layer, head-kind allow/forbid, state-selector, namespace).    | `FOLDER_CONTRACTS`                                      | [§ Per-folder contracts](#per-folder-contracts)                                            |
| `FILE_EXCEPTIONS`           | Per-partial deltas relaxing the folder contract.                                | `FILE_EXCEPTIONS`                                       | [§ File exceptions](#file-exceptions)                                                      |
| `STYLE_LAYERS`              | The five `@layer` names the framework owns.                                     | `STYLE_LAYERS`                                          | [§ Per-folder contracts](#per-folder-contracts)                                            |
| `MODIFIER_DIMENSION_TOKENS` | Required context tokens per modifier dimension.                                 | `MODIFIER_DIMENSION_TOKENS`                             | [§ Per-dimension required tokens](#per-dimension-required-tokens)                          |
| `SURFACE_CONTRACTS`         | Per-surface required tokens + animation discipline.                             | `SURFACE_CONTRACTS`                                     | [§ Per-surface contracts](#per-surface-contracts)                                          |
| `COMPONENT_CONTRACTS`       | Per-component required tokens + animation discipline.                           | `COMPONENT_CONTRACTS`                                   | [§ Per-component contracts](#per-component-contracts)                                      |
| `COMPOSABLE_CONTRACTS`      | Per-composable required tokens + state selectors + factory pairing.             | `COMPOSABLE_CONTRACTS`                                  | [§ Per-composable contracts](#per-composable-contracts)                                    |
| `STRUCTURAL_PAIRINGS`       | Allowlist of bare-tag `parent > child` pairs in framework selectors.            | `STRUCTURAL_PAIRINGS`                                   | [§ Structural pairings](#structural-pairings)                                              |
| `INTERACTIVE_ELEMENTS`      | Closed set of interactive tags subject to focus/forced-colors discipline.       | `INTERACTIVE_ELEMENTS`                                  | [§ Per-dimension required tokens](#per-dimension-required-tokens) (§ Interactive elements) |
| `MOTION_CONTRACT_PARTIALS`  | Partials that must reference the shared motion tokens (no hardcoded durations). | `MOTION_CONTRACT_PARTIALS`                              | [tokens.md](tokens.md) — also enforced here                                                |
| `TOKEN_GROUPS`              | Logical families of elements sharing a minimum token surface.                   | [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts) | [elements.md](elements.md) § Token-uniformity groups                                       |

### What every per-folder contract covers

Each folder contract names:

1. **Cascade layer** — `@layer {folder}`. Every rule body in the folder MUST wrap in this layer.
2. **Allowed root selector kinds** — what kinds of selectors the rule's _head_ (first simple selector) may be.
3. **Forbidden root selector kinds** — selectors that have a clearly-better home elsewhere; the failure message names the right folder.
4. **State-selector requirement** — `composables/` is the only folder where every rule must gate on a composable-state selector.
5. **Token namespace policy** — which `--set-*` prefixes the partial is allowed to declare. Three modes: `filename` (basename of the partial), `dimension` (one of `variant`, `size`, `style`, `state`, `placement`), or `free` (no namespace check).
6. **Comment-only policy** — whether a partial may contain no rules (only header comments). `elements/` allows passthrough stubs; `composables/_aside.scss` is the documented behavior-only exception.

---

## Contract

These invariants hold across `src/styles/**/*.scss` ↔ `src/browser/patterns.ts` ↔ this guide:

1. **Folder structural.** Every partial wraps in its matching `@layer`, uses only the folder's allowed rule-head kinds, gates on a state selector if required, and declares tokens only under the namespace policy. The comment-only exemption holds where the folder contract allows it.
2. **Per-dimension required-token coverage.** Every modifier in each dimension declares every token in `MODIFIER_DIMENSION_TOKENS.{dim}.required`.
3. **Per-surface / per-component / per-composable required-token coverage.** Every partial registered in `SURFACE_CONTRACTS` / `COMPONENT_CONTRACTS` / `COMPOSABLE_CONTRACTS` declares the listed `--set-{name}-*` tokens.
4. **Animated-partial mixin discipline.** Any partial flagged `animated: true` invokes `@include transition(…)` or `@include reduced-motion`. Bare `transition:` declarations without the paired reduced-motion opt-out are forbidden.
5. **Factory pairing.** Every entry in `COMPOSABLE_CONTRACTS` references a real `src/browser/factories/create{Name}.ts`; every composable partial has a matching factory and vice versa.
6. **Scope discipline.** No chained `:not(tag)` / `:not([attr])` qualifiers — collapse to `:not(:where(t1, t2, …))`. Every cross-cutting modifier rule (broad-head + modifier class) enumerates its scope via `:not(:where(…))` blocklist or `:is(…)` allowlist.
7. **Interactive minimum.** Every member of `INTERACTIVE_ELEMENTS` declares `--set-{tag}-transition-duration`, invokes `@include forced-colors`, and ships a `:focus-visible` rule. No bare `:focus { … }` selectors anywhere in `src/styles/` (always `:focus-visible`).
8. **Structural pairings.** Every `parent > child` bare-tag pair in compiled framework selectors appears in `STRUCTURAL_PAIRINGS` with a `spec` / `slot` / `reset` / `context` reason. New pairings either earn a justified entry or refactor onto a wrapper class.
9. **TS-shape.** Every registry in `patterns.ts` is well-formed (kinds exist, recommendations carry text, allow/forbid sets don't overlap, exceptions reference real folders).

Enforced by [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts) (the single driver covers contracts 1, 4, 6, 7, 8, 9), [`tests/src/styles/modifiers/_index.test.ts`](../tests/src/styles/modifiers/_index.test.ts) (contract 2), [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts), [`tests/src/styles/components/_index.test.ts`](../tests/src/styles/components/_index.test.ts), [`tests/src/styles/composables/_index.test.ts`](../tests/src/styles/composables/_index.test.ts) (contracts 3 + 4 + 5).

---

## Patterns

### Per-folder contracts

#### `elements/`

> One partial per HTML tag. Substantive partials declare `--set-{tag}-*` tokens via a fallback chain (style → variant → size → element default); reset partials normalize UA defaults only; passthrough partials are comment-only stubs.

| Clause                 | Value                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                  | `@layer elements`                                                                                                                                         |
| Allow comment-only     | **yes** (passthrough stubs document why the framework has no opinion)                                                                                     |
| Require state selector | no                                                                                                                                                        |
| Allowed head kinds     | `tag`, `root` (for nested global token blocks like `button.dropdown` caret defaults), `nested` (Sass `&`-prefixed state pseudos), `at-rule`               |
| Forbidden head kinds   | `data-attribute` (→ `composables/_{name}.scss`), `class` (→ `modifiers/_{dimension}.scss` or `components/_{name}.scss`), `pseudo-element` (→ `surfaces/`) |
| Token namespace        | `filename` — `_button.scss` may declare `--set-button-*`; `_input.scss` may declare `--set-input-*`                                                       |

**Canonical substantive partial** (button is the reference):

```scss
// ============================================================================
// {tag} — {one-sentence description}.
// Architecture: token fallback chain (style → variant → size → element default).
// Quirks: UA-specific reset notes, type-specific behavior, etc.
// ============================================================================

@use '../mixins' as *;

@layer elements {
    {tag} {
        --set-{tag}-color: var(--set-style-color, var(--set-variant-color, currentColor));
        --set-{tag}-background-color: var(
            --set-style-background-color,
            var(--set-variant-background-color, transparent)
        );
        /* …rest of token resolution… */

        color: var(--set-{tag}-color);
        background-color: var(--set-{tag}-background-color);
        @include transition((color var(--set-transition-duration), background-color var(--set-transition-duration)));
    }
}
```

**Acceptable variants** (no contract violation):

- A nested `@layer elements { :root { --set-{tag}-X: … } }` block declaring globally-overridable defaults (used by `button.dropdown` for the caret SVG / size / rotation tokens).
- Pseudo-element rules INSIDE the element selector — `button.dropdown::after`, `summary::before`, `th[data-key]::after`, `q::before/::after`. The head is still the tag; the pseudo is an element-local affordance, not a reusable surface.
- Sass `&`-prefixed state pseudos: `&:hover`, `&:focus-visible`, `&:disabled`. These nest under the tag's selector and inherit its classification.
- Bare `transition:` declarations inside vendor pseudo-elements (`::file-selector-button`, `::details-content`) where `@include transition()` can't reach. Document the reduced-motion handling at the partial level.

#### `modifiers/`

> Cross-cutting modifiers (5 dimensions) + `_local.scss` for element-local modifiers. Modifiers set `--set-{dimension}-*` context tokens; elements consume them.

| Clause                 | Value                                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                  | `@layer modifiers`                                                                                                                                                                                                                                                                       |
| Allow comment-only     | no (even `_local.scss` ships its charter comment block)                                                                                                                                                                                                                                  |
| Require state selector | no                                                                                                                                                                                                                                                                                       |
| Allowed head kinds     | `class` (bare `.primary`, `.small`, `.filled`, `.disabled`), `attribute` (`[popover]:not(aside):not(nav):not(output).{name}` in `_placements.scss`), `tag` (`form.row`, `button.dropdown` in `_local.scss`), `at-rule`                                                                   |
| Forbidden head kinds   | `pseudo-element` (→ `surfaces/`), `data-attribute` (→ `composables/_{name}.scss`)                                                                                                                                                                                                        |
| Token namespace        | `dimension` — `_variants.scss` may declare `--set-variant-*`; `_sizes.scss` may declare `--set-size-*`; `_styles.scss` may declare `--set-style-*`. `_states.scss` and `_placements.scss` legitimately declare no `--set-*` tokens (they emit direct CSS properties for layout / cursor) |

**Cross-cutting modifiers** are bare class rules in their dimension partial:

```scss
@layer modifiers {
	.primary {
		--set-variant-color: white;
		--set-variant-background-color: var(--color-primary);
		/* … */
	}
}
```

**Element-local modifiers** are compound selectors in `_local.scss`. The element scope is what makes them local:

```scss
@layer modifiers {
	form.row {
		flex-direction: row;
		flex-wrap: wrap;
	}
	button.dropdown {
		/* caret-on-trigger chrome */
	}
	details.flush {
		padding-inline: 0;
	}
}
```

The contract enforces:

- Names don't collide with the cross-cutting modifier vocabulary (from `modifiers.variant` / `.size` / `.style` / `.state` / `.placement`).
- Names don't collide with the Tailwind single-token utility set (`TAILWIND_SINGLE_TOKEN_UTILITIES` in [`tests/setup.ts`](../tests/setup.ts)).
- `_local.scss` rules never use a bare class selector — compound `{tag}.{name}` is required.

#### `surfaces/`

> Pseudo-elements + attribute selectors. Each surface owns a `--set-{surface}-*` token namespace and may read tokens from sibling surfaces via `var()`.

| Clause                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                  | `@layer surfaces`                                                                                                                                                                                                                                                                                                                                                                                                               |
| Allow comment-only     | no                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Require state selector | no                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Allowed head kinds     | `pseudo-element` (`::backdrop`, `::marker`, `::placeholder`, `::selection`, `::view-transition-*`), `pseudo-class` (`:focus-visible`), `attribute` (`[popover]`), `role-attribute` (`[role='tooltip']` for the popover hint variant), `universal` (`*`, `*::before`, `*::after` for scrollbar — CSS Scrollbars L1 inheritance quirk), `root`, `tag` (`dialog::backdrop` — head is the tag, pseudo follows), `nested`, `at-rule` |
| Forbidden head kinds   | `class` (→ `components/_{name}.scss` or `modifiers/_{dimension}.scss`), `data-attribute` (→ `composables/_{name}.scss`)                                                                                                                                                                                                                                                                                                         |
| Token namespace        | `filename` — `_backdrop.scss` → `--set-backdrop-*`; `_marker.scss` → `--set-marker-*`                                                                                                                                                                                                                                                                                                                                           |

**Cross-surface composition is OK** — `surfaces/_popover.scss` reads `var(--set-anchor-*)` declared in `surfaces/_anchor-position.scss`. Inline-comment the dependency.

#### `components/`

> Element compositions (`article`, `form`, `nav`) + class-component primitives (`.badge`, `.dot`, `.tag`). Substantive baselines for tags whose chrome is too rich for `elements/`.

| Clause                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                  | `@layer components`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Allow comment-only     | no                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Require state selector | no                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Allowed head kinds     | `tag` (`article`, `aside`, `body`, `footer`, `form`, `header`, `main`, `menu`, `nav`, `output`, `search`), `class` (`.badge`, `.dot`, `.skeleton`, `.spinner`, `.tag`, `.stack`, `.cluster`, `.frame`), `attribute` (`[popover]` for the menu / nav drawer), `role-attribute` (`[role='tablist']`, `[role='tab']`, `[role='tabpanel']`, `[role='group']`, `[role='toolbar']`), `pseudo-class` (`:is(aside, nav)` / `:where(…)` for selector grouping), `root` (consumer-overridable global tokens), `nested`, `at-rule` |
| Forbidden head kinds   | `pseudo-element` (→ `surfaces/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Token namespace        | `filename` — `_article.scss` → `--set-article-*`; adjacent namespaces opt in via `FILE_EXCEPTIONS` (see [File exceptions](#file-exceptions))                                                                                                                                                                                                                                                                                                                                                                            |

#### `composables/`

> Chrome partials gated on composable state (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`). Filename matches a `create{Name}` factory.

| Clause                 | Value                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                  | `@layer composables`                                                                                                                                                                                                                                                                                          |
| Allow comment-only     | yes (only `_aside.scss` — `useAside` is behavior-only)                                                                                                                                                                                                                                                        |
| Require state selector | **yes** — every partial must use at least one state selector somewhere                                                                                                                                                                                                                                        |
| Allowed head kinds     | `tag` (`dialog.scrollable[open]`), `class` (`.carousel-item-next` lifecycle classes), `attribute` (`[popover]`, `[open]`), `data-attribute` (`[data-toast-stack]`), `aria-attribute` (`[aria-expanded='true']`), `role-attribute` (`[role='tablist']`), `pseudo-class` (`:popover-open`), `nested`, `at-rule` |
| Forbidden head kinds   | `pseudo-element` (→ `surfaces/`)                                                                                                                                                                                                                                                                              |
| Token namespace        | `free` — composables read and override any namespace by design (a `useDialog` chrome partial routinely overrides `--set-popover-*` and `--set-variant-*` to retune the modal cascade)                                                                                                                         |

**Filename ↔ factory parity** — every `composables/_{name}.scss` must have a matching `create{Name}.ts` in `src/browser/factories/`. The contract fails if you add a partial without the factory or vice versa.

### File exceptions

Known-good outliers are recorded in [`FILE_EXCEPTIONS`](../src/browser/patterns.ts) so the contract test exempts them cleanly. Each exception names what it relaxes and why. Each entry uses the nested-entity shape (`comments.allowed`, `state.required`, `tokens.extras`) so each override reads as a per-file delta.

| Path                                     | Relaxation                                                       | Reason                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `composables/_aside.scss`                | `state: { required: false }`, `comments: { allowed: true }`      | `useAside` is a behavior-only composable; drawer geometry lives in `components/_aside.scss`.                                           |
| `components/_aside.scss`                 | `tokens: { extras: [callout, alert, variant, popover, anchor] }` | `<aside>` plays three roles (sidebar / callout / alert); drawer variant overrides variant/popover/anchor cascade.                      |
| `components/_output.scss`                | `tokens: { extras: [toast, variant] }`                           | `<output popover>` becomes a toast; band-dismiss button overrides `--set-variant-*` (parallel to aside-alert).                         |
| `components/_div.scss`                   | `tokens: { extras: [stack, cluster] }`                           | Class-component primitives carried by `<div>` (`.stack`, `.cluster`, `.frame` — `.frame` declares no tokens).                          |
| `modifiers/_local.scss`                  | `tokens: { extras: [article, table-cell] }`                      | Element-local modifiers may declare `--set-{tag}-*` tokens scoped to the element their selector targets (`article.frame`, `td.frame`). |
| `components/_nav.scss`                   | `tokens: { extras: [tablist, tab, tabpanel] }`                   | `<nav>` carries breadcrumb / pagination / tablist patterns.                                                                            |
| `surfaces/_popover.scss`                 | `tokens: { extras: [popover-hint, anchor] }`                     | Tooltip variant extends with the hint namespace; reads anchor tokens from `_anchor-position.scss`.                                     |
| `surfaces/_anchor-position.scss`         | `tokens: { extras: [anchor] }`                                   | File basename names the CSS feature; tokens live under `--set-anchor-*`.                                                               |
| `elements/_h1-h6.scss`                   | `tokens: { extras: [heading] }`                                  | Multi-tag partial covering `h1`–`h6`; tokens share the `--set-heading-*` namespace.                                                    |
| `elements/_input.scss`                   | `tokens: { extras: [check, switch, range, color, file] }`        | `<input>` subtypes (`checkbox` / `radio` / `switch` / `range` / `color` / `file`) ship dedicated namespaces.                           |
| `elements/_li.scss`, `elements/_ul.scss` | `tokens: { extras: [group] }`                                    | `<ul class="group">` list-group component carried by both elements.                                                                    |

**Adding an exception** is a deliberate change. Every entry carries a `note` explaining the architectural reason; if the note can't be written in one sentence, the exception probably isn't justified.

### Selector classification helpers

[`classifyHeadSelector(selector)`](../src/browser/patterns.ts) returns the kind of the rule's _head_ — the first simple selector. Key behaviors:

- Compound selectors classify by their head: `button.dropdown::after` → `tag` (head is `button`).
- Descendant selectors classify by their leftmost head: `body:has(main) > main` → `tag` (head is `body`).
- Functional pseudos `:is()`, `:where()`, `:not()`, `:has()` peer into their inner content: `:where(h1, h2)` → `tag` (inner head is `h1`). Specificity differs but the architectural classification follows the subject.
- `:root` is classified as `root` (separate from `pseudo-class`).
- Sass nesting (`&.primary`, `&:hover`) classifies as `nested` — the parent's classification already gates the rule body.
- `@media` / `@supports` / `@container` rule openers classify as `at-rule` and skip the head-kind check.

[`hasStateSelector(selector)`](../src/browser/patterns.ts) is true when the selector contains at least one `[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `[popover]`, `:popover-open`, `:modal`, or `:open`. The composables/ contract requires at least one of these to appear somewhere in every partial.

[`hasPseudoElement(selector)`](../src/browser/patterns.ts) is true when the selector contains any `::pseudo` segment. Used to catch top-level pseudo-element rules that should live in `surfaces/`.

### Scope discipline

Cross-cutting modifier rules — selectors that combine an attribute or pseudo head (e.g. `[popover]`) with a class qualifier from the modifier vocabulary (`.top`, `.subtle`, `.disabled`) — need explicit scoping. Two anti-patterns the parity test catches:

#### Chained tag / attribute `:not()` qualifiers — collapse to `:not(:where(…))`

```scss
/* ❌ Chained :not()s inflate specificity. */
[popover]:not(aside):not(nav):not(output).top { … }    /* specificity 0,2,3 */

/* ✓ Flattened blocklist. `:where()` contributes 0 to specificity. */
[popover]:not(:where(aside, nav, output)).top { … }    /* specificity 0,2,0 */
```

Each `:not(tag)` adds 0,0,1 and each `:not([attr])` adds 0,1,0. Three of them inflate `[popover].top` from the intended 0,2,0 to 0,2,3, which can out-fight unrelated rules in the cascade. The `:not(:where(t1, t2, t3))` form keeps the exception list at zero specificity — adding or removing an opt-out is a single-token edit.

The parity test exempts pseudo-class chains (`:not(:first-child):not(:last-child)`, `:not(:placeholder-shown):not(:focus)`) because they're position / state checks where the idiom is well-known and the inflation rarely matters.

#### Unscoped cross-cutting modifier rules — add a scope clause

```scss
/* ❌ Unscoped. Applies to every popover host, including those with
   intrinsic placement chrome (drawers, toasts). Future popover-able
   elements silently inherit the rule. */
[popover].top { … }

/* ✓ Blocklist — broad default + narrow exceptions. Preferred when the
   exception set is small and bounded. */
[popover]:not(:where(aside, nav, output)).top { … }

/* ✓ Allowlist — enumerate the tags that opt in. Preferred when the
   accepting set is small and bounded forever. */
:is(dialog, div, menu)[popover].top { … }
```

The rule is gated to **cross-cutting modifier compounds** specifically — selectors where:

- Every branch's head is an attribute, pseudo-class, pseudo-element, role-attribute, data-attribute, aria-attribute, or universal selector.
- AND at least one class qualifier matches the cross-cutting modifier vocabulary (`modifiers.variant`, `.size`, `.style`, `.state`, `.placement`).

Tag-headed rules (`output[popover].drawer`, `nav[aria-label='Breadcrumb'] > ol > li.active`, `button.dropdown`) are already element-scoped — they don't bleed and don't trigger the check.

Bare attribute rules without a modifier class (`[popover] { … }` for popover surface defaults) are intentionally broad — that's how the surface paints the default chrome on every popover host.

#### Cascade-design rationale

CSS is built around **broad defaults + narrow exceptions**, with the cascade resolving conflicts. The scope-discipline rules align selector form with that design:

- **Blocklists honor the cascade.** A new popover-able element you didn't anticipate (`<details popover>`, `<section popover>`) automatically inherits the default placement — no silent failure.
- **Flattened specificity prevents accidental cascade fights.** A 0,2,0 rule loses cleanly to a 0,2,1 rule when the consumer adds one. An inflated 0,2,3 rule fights specificity in ways that surprise authors.
- **Single edit point.** Adding or removing an opt-out is one token; chained `:not()`s require editing every branch of every rule.

### Per-dimension required tokens

Every modifier in a dimension MUST declare the dimension's full required context-token set. This is the cascade contract that lets element partials consume `var(--set-{dimension}-X)` with confidence — if a variant drops a token, every consumer's fallback chain silently degrades.

The contract is codified in [`MODIFIER_DIMENSION_TOKENS`](../src/browser/patterns.ts) and enforced by [`tests/src/styles/modifiers/_index.test.ts`](../tests/src/styles/modifiers/_index.test.ts).

#### Variant — 8 tokens per modifier (FILLED + SUBTLE + ON-CANVAS tiers)

Every `.{variant}` declares all eight `--set-variant-*` tokens:

| Tier      | Token suffix                                                     | Consumer                                                                |
| --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| FILLED    | `color`, `background-color`, `border-color`, `border-width`      | `.filled` style, bare-variant action surfaces                           |
| SUBTLE    | `subtle-color`, `subtle-background-color`, `subtle-border-color` | `.subtle` style                                                         |
| ON-CANVAS | `on-canvas-color`                                                | bare variant text painted directly on the body canvas (anchors, labels) |

Dropping a tier token silently breaks the cascade — `.filled` falls back to `currentColor` / `transparent`, `.subtle` similarly. The test asserts all 7 variants × 8 tokens.

#### Size — 4 tokens per modifier

Every `.{size}` declares: `padding-inline`, `padding-block`, `font-size`, `border-radius`. These are the four geometry tokens elements consume to scale chrome coherently. Missing one leaves the element half-resized.

#### Style — 4 tokens per modifier

Every `.{style}` declares: `color`, `background-color`, `border-color`, `border-width`. These rewrite the element surface from the variant tier (`.subtle` reads `--set-variant-subtle-*`; `.filled` reads `--set-variant-*`). Partial coverage leaves the surface inconsistent across consumers.

#### State — direct CSS properties, no tokens (current state)

`.disabled`, `.active`, `.loading` emit direct properties (`cursor`, `pointer-events`, `opacity`). No context tokens are required today.

**Known customizability gap:** `.disabled { opacity: 0.5; }` hard-codes the opacity. A future refactor could expose `--set-state-disabled-opacity` so a single `:root` override retunes the disabled affordance framework-wide. Tracked in `MODIFIER_DIMENSION_TOKENS.state.rationale` for visibility; not enforced.

#### Placement — direct CSS properties, no tokens by design

Placement modifiers emit `position-area` + `align-self` + `justify-self` directly. The cascade composes these with anchor positioning; no tokens are tunable. This is intentional — placement is a layout primitive, not a chrome dial.

#### Interactive elements — minimum `transition-duration`

The `interactive` entry in [`TOKEN_GROUPS`](../src/browser/taxonomy.ts) declares the universal interactive contract: every element in [`INTERACTIVE_ELEMENTS`](../src/browser/patterns.ts) (a, button, details, dialog, fieldset, input, label, select, summary, textarea) MUST declare `--set-{tag}-transition-duration`. State changes (hover, focus, disabled) animate; consumers need a single override point to retune motion centrally.

Element-specific contracts extend the universal minimum:

- **form-control** (button, input, textarea, select) extends with `color`, `background-color`, `border-*`, `padding-*`, `font-size`, `cursor`.
- **disclosure** (details, summary) extends with `transition-duration` already covered.
- **floating-surface** (dialog, output-as-toast) extends with `box-shadow` + popover geometry.

See [elements.md § Token-uniformity groups](elements.md) for the full token-group catalog.

### Per-surface contracts

Each file in [`src/styles/surfaces/`](../src/styles/surfaces/) paints a single browser-rendered pseudo-element / attribute surface and owns a dedicated `--set-{surface}-*` token namespace. The contract is codified in [`SURFACE_CONTRACTS`](../src/browser/patterns.ts) and enforced by [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts).

#### Shape

Each surface contract records:

| Field             | Meaning                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | Filename basename (`anchor-position`, `backdrop`, `focus`, …).                                                                                                                            |
| `tokens.prefix`   | Token namespace prefix. Optional; defaults to `name`. Set explicitly when the filename names the CSS feature (`anchor-position`) while the tokens live under a shorter prefix (`anchor`). |
| `tokens.required` | Property suffixes the partial MUST declare on `:root`. The full token name is `--set-{tokens.prefix ?? name}-{suffix}`.                                                                   |
| `selectors`       | Selector head kinds the partial uses (`pseudo-element`, `pseudo-class`, `attribute`, `universal`, `tag`). Constrains where the surface paints.                                            |
| `animated`        | True when the partial paints motion. Triggers the reduced-motion mixin requirement.                                                                                                       |
| `notes`           | One-sentence description shown in failure messages.                                                                                                                                       |

#### The nine surfaces

| Surface           | Selector                                                     | Required tokens                                                                                                                                                                           | Animated |
| ----------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `anchor-position` | `[popover]:not(:where(output, aside, nav))`                  | `gap`, `max-block-size`, `max-inline-size`, `position-area`, `position-try-fallbacks`, `position-try-order`, `viewport-inset`                                                             | no       |
| `backdrop`        | `dialog::backdrop`, `:is(aside, nav)[popover]::backdrop`     | `background-color`, `backdrop-filter`, `transition-duration`                                                                                                                              | yes      |
| `focus`           | `:focus-visible`                                             | `color`                                                                                                                                                                                   | no       |
| `marker`          | `::marker`                                                   | `color`, `content`                                                                                                                                                                        | no       |
| `placeholder`     | `::placeholder`                                              | `color`, `opacity`                                                                                                                                                                        | no       |
| `popover`         | `[popover]` (+ `[popover]:not(:where(aside, nav))`)          | `color`, `background-color`, `border-color`, `border-width`, `border-radius`, `padding-inline`, `padding-block`, `box-shadow`, `transition-duration`, `max-inline-size`, `viewport-inset` | yes      |
| `scrollbar`       | `*`, `*::before`, `*::after`                                 | `thumb-color`, `track-color`, `width`, `gutter`                                                                                                                                           | no       |
| `selection`       | `::selection`                                                | `background-color`, `color`                                                                                                                                                               | no       |
| `view-transition` | `::view-transition-old(root)`, `::view-transition-new(root)` | `duration`, `timing-function`                                                                                                                                                             | yes      |

#### Animated-surface contract

Surfaces marked `animated: true` MUST invoke either `@include transition(...)` or `@include reduced-motion { ... }`. Bare `transition: ...` declarations break the `prefers-reduced-motion` opt-out.

Additionally, **any surface that declares a `transition-duration` or `duration` token must invoke a motion mixin**, regardless of the `animated` flag. Exposing the customizability surface without the reduced-motion contract is a coverage gap — consumers can retune the duration but can't opt out of motion.

#### Cross-surface composition

Surfaces freely read each other's tokens via `var()` chains. `_popover.scss` reads `--set-anchor-*` declared in `_anchor-position.scss`; `_backdrop.scss` reads `--set-transition-duration` declared in `_tokens.scss`. These reads are documented in `FILE_EXCEPTIONS[*].tokens.extras` so the namespace check allows them.

#### Adding a new surface

1. Add the partial under `src/styles/surfaces/_{name}.scss`.
2. Add a `SURFACE_CONTRACTS` entry with the canonical token + animation discipline.
3. Add the row to [surfaces.md § Surface](surfaces.md) — bidirectional parity test catches drift in either direction.

### Per-component contracts

Each file in [`src/styles/components/`](../src/styles/components/) paints either a tag-rooted shell composition (`<article>` card, `<form>` stack, `<nav>` rails) or a class-component primitive that has no semantic root (`.badge`, `.dot`, `.spinner`). The contract is codified in [`COMPONENT_CONTRACTS`](../src/browser/patterns.ts) and enforced by [`tests/src/styles/components/_index.test.ts`](../tests/src/styles/components/_index.test.ts).

#### Shape

Mirrors `SURFACE_CONTRACTS` (see [§ Shape](#shape) above). Each entry carries `name`, `tokens` (`{ prefix?, required }` — `prefix` defaults to `name`), `animated`, `notes`. The animation rule + customizability-gap rule apply identically: every component with a duration token MUST invoke `@include transition()` or `@include reduced-motion`.

#### The nineteen components

Grouped by role:

**Tag-rooted shell compositions** (page-grid sections + tag-keyed widgets):

| Component    | Required tokens (suffixes)                                                                                                                        | Animated |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `article`    | color, bg, border-{color,width,radius}, padding-{inline,block}, gap, font-{size,line-height}, box-shadow, transition-duration, disabled-opacity   | yes      |
| `aside`      | color, bg, border-{color,width}, padding-{inline,block}, inline-size, gap, font-{size,line-height}, transition-duration + drawer-\* sub-namespace | yes      |
| `body`       | rail-width                                                                                                                                        | no       |
| `footer`     | color, bg, border-{color,width}, padding-{inline,block}, font-{size,line-height}, transition-duration                                             | yes      |
| `form`       | gap, row-gap, label-gap, transition-duration                                                                                                      | yes      |
| `header`     | same as footer                                                                                                                                    | yes      |
| `main`       | (none — layout only, by design)                                                                                                                   | no       |
| `menu`       | color, bg, gap, padding-{inline,block}, justify-content, transition-duration                                                                      | yes      |
| `nav`        | core 11 tokens + breadcrumb-_ + pagination-_ sub-namespaces                                                                                       | yes      |
| `output`     | `--set-toast-*` namespace (tokens live under toast, not output)                                                                                   | no¹      |
| `role-group` | border-width                                                                                                                                      | no       |
| `search`     | color, bg, padding-{inline,block}, gap, transition-duration                                                                                       | yes      |

¹ `_output.scss` ships no own duration token. Motion lives in `composables/_toast.scss` (the toast deck is a composable surface).

**Class-component primitives** (no semantic root):

| Component  | Carrier element                                 | Required tokens (suffixes)                                                                                               | Animated |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| `badge`    | `<span class="badge">`                          | color, bg, border-radius, padding-{inline,block}, font-{size,weight,line-height}                                         | no       |
| `div`      | `<div class="stack">` / `<div class="cluster">` | gap (under `--set-stack-*`; `cluster` prefix via FILE_EXCEPTIONS)                                                        | no       |
| `dot`      | `<span class="dot">`                            | size, bg, pulse-duration, pulse-easing                                                                                   | yes      |
| `skeleton` | `<div class="skeleton">`                        | bg, highlight-color, border-radius, duration, line-block-size, line-gap                                                  | yes      |
| `spinner`  | `<span class="spinner" role="status">`          | size, color, border-width, duration                                                                                      | yes      |
| `tag`      | `<span class="tag">`                            | color, bg, border-{color,width,radius}, padding-{inline,block}, font-{size,weight,line-height}, gap, transition-duration | yes      |

#### Cross-namespace components

Four components ship tokens under namespaces that differ from their filename:

- `_aside.scss` — `aside`, `callout`, `alert` + drawer overrides for `variant`, `popover`, `anchor` (multi-role element + drawer cascade)
- `_div.scss` — `stack`, `cluster` (class-component carriers; no `--set-div-*`)
- `_output.scss` — `toast` (filename names the element; tokens name the surface)
- `_nav.scss` — `nav` + `tablist`, `tab`, `tabpanel` (multi-pattern element)

The additional prefixes are declared in [`FILE_EXCEPTIONS`](../src/browser/patterns.ts) so the namespace check allows them; the per-component contract documents the canonical primary prefix.

#### Adding a new component

1. Add the partial under `src/styles/components/_{name}.scss`.
2. Add a `COMPONENT_CONTRACTS` entry with the canonical token + animation discipline.
3. If the partial declares tokens under a namespace other than its filename, add the extras to `FILE_EXCEPTIONS[*].tokens.extras`.
4. The parity test catches drift in both directions (partial without contract, contract without partial).

### Per-composable contracts

Each file in [`src/styles/composables/`](../src/styles/composables/) paints chrome gated on state set by a `use{Name}` / `create{Name}` factory pair. The contract is codified in [`COMPOSABLE_CONTRACTS`](../src/browser/patterns.ts) and enforced by [`tests/src/styles/composables/_index.test.ts`](../tests/src/styles/composables/_index.test.ts).

#### Shape

Each entry adds two clauses beyond the surface / component contract:

| Field             | Meaning                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state.selectors` | Composable-state selector kinds the partial uses (`pseudo-class`, `attribute`, `data-attribute`, `aria-attribute`, `role-attribute`). Empty for behavior-only composables. |
| `factory`         | The matching `create{Name}` factory in `src/browser/factories/`. The parity test asserts the file exists.                                                                  |

Plus the standard `name`, `tokens` (`{ prefix?, required }`), `animated`, `notes`.

#### The six composables

| Composable | Token namespace                            | State selectors                                                      | Animated | Factory          |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------- | -------- | ---------------- |
| `aside`    | (none — behavior-only)                     | (none — chrome lives in `components/_aside.scss`)                    | no       | `createAside`    |
| `carousel` | `--set-carousel-*` (13 tokens)             | `[aria-selected="true"]`, `[role="list"]`, `[role="listitem"]`       | yes      | `createCarousel` |
| `dialog`   | `--set-dialog-*` (3 sizing extensions)     | `:modal`, `[open]`                                                   | no¹      | `createDialog`   |
| `select`   | `--set-select-*` (5 menu / toggle sizing)  | `[aria-expanded="true"]`, `[data-hidden]`, `[popover]`               | no       | `createSelect`   |
| `tabs`     | (none — reads from `components/_nav.scss`) | `[role="tablist"]`, `[role="tab"]`, `[aria-selected="true"]`         | no       | `createTabs`     |
| `toast`    | `--set-toast-stack-offset`                 | `:popover-open`, `[data-toast-stack]`, `[data-stack-*]`, `[popover]` | yes      | `createToast`    |

¹ `_dialog.scss` declares sizing extensions only; motion lives on `elements/_dialog.scss` + `surfaces/_popover.scss`.

#### Animated-composable contract

Composables that declare `transition:` or `animation:` properties — OR are marked `animated: true` — MUST invoke `@include transition()` or `@include reduced-motion`.

#### Behavior-only composables

Some composables are pure JavaScript behavior with no CSS chrome (`useAside` does scroll lock + focus trap + light dismiss; the visual chrome lives in `components/_aside.scss`). The partial exists as a placeholder so `src/styles/composables/` mirrors `src/browser/composables/`. `FILE_EXCEPTIONS['composables/_aside.scss']` records this with `state: { required: false }` and `comments: { allowed: true }`.

#### Adding a new composable

1. Add `create{Name}.ts` to `src/browser/factories/`.
2. Add `use{Name}.ts` to `src/browser/composables/`.
3. Add `composables/_{name}.scss` (or a comment-only placeholder if behavior-only).
4. Add a `COMPOSABLE_CONTRACTS` entry with the token + state-selector + animation discipline.
5. The parity test catches drift in both directions (partial without contract, contract without partial / factory).

### Structural pairings

A framework rule of the form `tag1 > tag2` (both bare tag names, joined by a child combinator) blesses one HTML element as the structural marker for its role inside a container. Some pairings are unavoidable — HTML spec requires them; some are documented framework slots filled by the universally-natural element. But many candidate pairings would be **element-hardcoding inside containment**: arbitrary picks of one element type as a chrome trigger inside an otherwise-generic container.

The audit caught and removed `body:has(main) > nav > search` on this basis. `<search>` was one of many elements that could be pinned in a docs-sidebar rail; the framework rule against it forced every consumer to use exactly `<search>`. The pattern was moved to the showcase's wrapper-class composition.

#### The four reason categories

Every entry in `STRUCTURAL_PAIRINGS` (in [`src/browser/patterns.ts`](../src/browser/patterns.ts)) names one reason:

| Kind      | Meaning                                                                                                                                        | Examples                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `spec`    | HTML spec requires this nesting; no other child can fulfill the role.                                                                          | `tr > td`, `details > summary`, `picture > source`, `select > option`. |
| `slot`    | Parent is a card / dialog / drawer-shaped container with a DOCUMENTED slot, filled by the universally-natural semantic element.                | `article > header:first-child` (card band), `dialog > header` (modal). |
| `reset`   | The rule strips a UA default that only exists for that child element type, or zeroes a baseline value carried by the child (nesting-collapse). | `nav > ul` (list-marker reset), `main > section` (nesting-collapse).   |
| `context` | Child gets contextual chrome because of its position inside the parent's documented internal structure.                                        | `header > button:last-child` (dismiss trail in alert/drawer band).     |

#### What the test enforces

[`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts) scans every rule opener in every framework SCSS partial. For each selector, it extracts `(parent-tag, child-tag)` pairs (flattening `:is(...)` / `:where(...)` and respecting selector-list commas / descendant-vs-child combinators). Every pair must appear in `STRUCTURAL_PAIRINGS`.

Universal heads (`*`), classes, attributes, and pseudos generate no pair — they don't single out an element type and aren't subject to this discipline.

#### Adding a pairing

If a new framework rule needs `parent > child` between bare tags:

1. Decide if the pairing is genuinely universal (matches the `spec` / `slot` / `reset` / `context` categories above), OR
2. If not, refactor the rule onto a wrapper class so consumers can use any child element under that wrapper. The showcase's `.showcase-sidebar-region` (any content can be a pinned region in the composed docs-sidebar shape) is the canonical example.

If (1), add an entry to `STRUCTURAL_PAIRINGS` with a one-sentence justification. The justification surfaces in the test failure when the pairing is later violated, and serves as the in-tree spec for future authors.

#### The `<search>` violation, and the precedent it set

The framework can't decide on the consumer's behalf that "any `<search>` inside a `<nav>` rail gets pinned-filter chrome." `<search>` is a search landmark, not a positional/structural element. Many other elements (a `<form>` filter, a `<header>`-style toolbar, a status row, etc.) could equally well take the pinned slot. Hardcoding chrome against `<search>` locks the pattern to one specific markup choice.

The right architectural shape: the rail provides containment (flex column, overflow management); the consumer composes regions inside; consumer styling targets WRAPPER CLASSES, not element types. Framework styling targets semantic elements with universal roles (`<header>` is THE intro band, `<footer>` is THE outro band, etc.). The boundary is enforced by this test.

---

## Tests

The single driver for every contract above is [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts), organized in seven sections:

1. **TS surface shape** — `FOLDER_CONTRACTS`, `FILE_EXCEPTIONS`, `STYLE_LAYERS`, `INTERACTIVE_ELEMENTS` are well-formed.
2. **Classification helpers** — `classifyHeadSelector`, `hasStateSelector`, `hasPseudoElement`, `BARE_FOCUS_REGEX`, `hasBareFocusRule`, mixin-invocation regexes, `hasChainedTagNots`, `hasScopingFunction`, `classQualifiers`.
3. **Path helpers + namespace policy** — `partialFolder`, `partialBasename`, `allowedTokenPrefixes`, `hasFreeTokenNamespace`, `exceptionFor`.
4. **Folder structural contract** — every partial wraps in its layer, every rule head is allowed, composables gate on state, namespace policy holds, every composable pairs with a factory.
5. **Structural pairings** — every `parent > child` tag pair is allowlisted; `extractTagPairs` unit checks.
6. **Scope discipline** — no chained `:not(tag)`, cross-cutting modifier rules enumerate scope.
7. **Interactive minimum** — every `INTERACTIVE_ELEMENTS` member invokes `@include forced-colors` and declares `:focus-visible`; no bare `:focus` rule anywhere in `src/styles/`.

Plus the four per-folder catch-all drivers:

- [`tests/src/styles/modifiers/_index.test.ts`](../tests/src/styles/modifiers/_index.test.ts) — `MODIFIER_DIMENSION_TOKENS` required-token coverage.
- [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts) — `SURFACE_CONTRACTS` required tokens + animated discipline.
- [`tests/src/styles/components/_index.test.ts`](../tests/src/styles/components/_index.test.ts) — `COMPONENT_CONTRACTS` required tokens + animated discipline.
- [`tests/src/styles/composables/_index.test.ts`](../tests/src/styles/composables/_index.test.ts) — `COMPOSABLE_CONTRACTS` required tokens + state selectors + factory pairing.

---

## See also

- [`src/browser/patterns.ts`](../src/browser/patterns.ts) — contract data + helpers (folder contracts, file exceptions, modifier-dimension tokens, surface / component / composable contracts, structural pairings).
- [styles.md](styles.md) — top-level cascade architecture.
- [tokens.md](tokens.md) — token surface + motion-contract enforcement.
- [modifiers.md](modifiers.md) — modifier cascade + dimension vocabulary.
- [elements.md](elements.md) — per-element catalog + taxonomy + token-uniformity groups.
- [components.md](components.md) — element compositions + class-root primitives.
- [surfaces.md](surfaces.md) — browser-rendered chrome.
- [composables.md](composables.md) — Vue composable + factory layer; § 3 open / closed lifecycle.
- [contribute.md](contribute.md) — the workflow for authoring framework changes that conform to these contracts.
- [AGENTS.md](../AGENTS.md) §21 — codified Sass / SCSS conventions cross-referencing patterns.
