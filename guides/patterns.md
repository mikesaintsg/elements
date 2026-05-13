# Style-folder structural contracts

> One contract per folder under [`src/styles/`](../src/styles/). Every SCSS partial in a folder is held to the matching contract by the parity test at [`tests/src/styles/_contracts.test.ts`](../tests/src/styles/_contracts.test.ts).

The contract data lives in [`src/browser/patterns.ts`](../src/browser/patterns.ts) as `FOLDER_CONTRACTS` + `FILE_EXCEPTIONS`. This document is the prose explanation. When the two disagree, the TS is authoritative — the parity test will fail loudly until either the code or this document is updated.

---

## 1. What a contract covers

Each folder's contract names:

1. **The cascade layer** — `@layer {folder}`. Every rule body in the folder MUST wrap in this layer. The parity test rejects unlayered rules and rejects rules wrapped in a foreign layer.
2. **Allowed root selector kinds** — what kinds of selectors the rule's *head* (first simple selector) may be (tag, class, pseudo-element, attribute, data-attribute, etc.). The test classifies every rule opener; mismatches surface with a recommended target folder for the misfiled rule.
3. **Forbidden root selector kinds** — selectors that have a clearly-better home elsewhere. The failure message names the right folder.
4. **State-selector requirement** — `composables/` is the only folder where every rule must gate on a composable-state selector (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`). Other folders' rules may or may not gate on state.
5. **Token namespace policy** — which `--set-*` prefixes the partial is allowed to declare. Three modes: `filename` (basename of the partial; e.g. `_button.scss` → `--set-button-*`), `dimension` (one of `variant`, `size`, `style`, `state`, `placement`), or `free` (no namespace check — composables override any token by design).
6. **Comment-only policy** — whether a partial in the folder may contain no rules at all (only header comments). `elements/` allows passthrough stubs; `composables/_aside.scss` is the documented behavior-only exception.

---

## 2. Per-folder contracts

### 2.1 `elements/`

> One partial per HTML tag. Substantive partials declare `--set-{tag}-*` tokens via a fallback chain (style → variant → size → element default); reset partials normalize UA defaults only; passthrough partials are comment-only stubs.

| Clause | Value |
| --- | --- |
| Layer | `@layer elements` |
| Allow comment-only | **yes** (passthrough stubs document why the framework has no opinion) |
| Require state selector | no |
| Allowed head kinds | `tag`, `root` (for nested global token blocks like `button.dropdown` caret defaults), `nested` (Sass `&`-prefixed state pseudos), `at-rule` |
| Forbidden head kinds | `data-attribute` (→ `composables/_{name}.scss`), `class` (→ `modifiers/_{dimension}.scss` or `components/_{name}.scss`), `pseudo-element` (→ `surfaces/`) |
| Token namespace | `filename` — `_button.scss` may declare `--set-button-*`; `_input.scss` may declare `--set-input-*` |

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

**Known passthrough partials** (34): `_article.scss`, `_aside.scss`, `_bdi.scss`, `_bdo.scss`, `_caption.scss`, `_cite.scss`, `_col.scss`, `_colgroup.scss`, `_datalist.scss`, `_del.scss`, `_dfn.scss`, `_div.scss`, `_em.scss`, `_footer.scss`, `_form.scss`, `_header.scss`, `_ins.scss`, `_menu.scss`, `_nav.scss`, `_optgroup.scss`, `_option.scss`, `_q.scss`, `_rp.scss`, `_rt.scss`, `_ruby.scss`, `_s.scss`, `_search.scss`, `_span.scss`, `_tbody.scss`, `_td.scss`, `_tfoot.scss`, `_th.scss`, `_thead.scss`, `_tr.scss`. (Several of these are passthrough at the *elements* layer because their substantive baseline lives in `components/_{tag}.scss` — see [`taxonomy.md`](taxonomy.md).)

### 2.2 `modifiers/`

> Cross-cutting modifier classes (5 dimensions) + `_local.scss` for element-local modifiers. Modifiers set `--set-{dimension}-*` context tokens; elements consume them.

| Clause | Value |
| --- | --- |
| Layer | `@layer modifiers` |
| Allow comment-only | no (even `_local.scss` ships its charter comment block) |
| Require state selector | no |
| Allowed head kinds | `class` (bare `.primary`, `.small`, `.filled`, `.disabled`), `attribute` (`[popover]:not(aside):not(nav):not(output).{name}` in `_placements.scss`), `tag` (`form.row`, `button.dropdown` in `_local.scss`), `at-rule` |
| Forbidden head kinds | `pseudo-element` (→ `surfaces/`), `data-attribute` (→ `composables/_{name}.scss`) |
| Token namespace | `dimension` — `_variants.scss` may declare `--set-variant-*`; `_sizes.scss` may declare `--set-size-*`; `_styles.scss` may declare `--set-style-*`. `_states.scss` and `_placements.scss` legitimately declare no `--set-*` tokens (they emit direct CSS properties for layout / cursor) |

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
    form.row { flex-direction: row; flex-wrap: wrap; }
    button.dropdown { /* caret-on-trigger chrome */ }
    details.flush { padding-inline: 0; }
}
```

The contract test enforces:

- Class names don't collide with the cross-cutting modifier vocabulary (from `modifiers.variant`, `.size`, `.style`, `.state`, `.placement`).
- Class names don't collide with the Tailwind single-token utility set (`TAILWIND_SINGLE_TOKEN_UTILITIES` in `tests/setupStyles.ts`).
- `_local.scss` rules never use a bare class selector — compound `{tag}.{name}` is required.

### 2.3 `surfaces/`

> Pseudo-elements + attribute selectors. Each surface owns a `--set-{surface}-*` token namespace and may read tokens from sibling surfaces via `var()`.

| Clause | Value |
| --- | --- |
| Layer | `@layer surfaces` |
| Allow comment-only | no |
| Require state selector | no |
| Allowed head kinds | `pseudo-element` (`::backdrop`, `::marker`, `::placeholder`, `::selection`, `::view-transition-*`), `pseudo-class` (`:focus-visible`), `attribute` (`[popover]`), `role-attribute` (`[role='tooltip']` for the popover hint variant), `universal` (`*`, `*::before`, `*::after` for scrollbar — CSS Scrollbars L1 inheritance quirk), `root`, `tag` (`dialog::backdrop` — head is the tag, pseudo follows), `nested`, `at-rule` |
| Forbidden head kinds | `class` (→ `components/_{name}.scss` or `modifiers/_{dimension}.scss`), `data-attribute` (→ `composables/_{name}.scss`) |
| Token namespace | `filename` — `_backdrop.scss` → `--set-backdrop-*`; `_marker.scss` → `--set-marker-*` |

**Cross-surface composition is OK** — `surfaces/_popover.scss` reads `var(--set-anchor-*)` declared in `surfaces/_anchor-position.scss`. Inline-comment the dependency.

### 2.4 `components/`

> Element compositions (`article`, `form`, `nav`) + class-component primitives (`.badge`, `.dot`, `.tag`). Substantive baselines for tags whose chrome is too rich for `elements/`.

| Clause | Value |
| --- | --- |
| Layer | `@layer components` |
| Allow comment-only | no |
| Require state selector | no |
| Allowed head kinds | `tag` (`article`, `aside`, `body`, `footer`, `form`, `header`, `main`, `menu`, `nav`, `output`, `search`), `class` (`.badge`, `.dot`, `.skeleton`, `.spinner`, `.tag`, `.stack`, `.cluster`), `attribute` (`[popover]` for the menu / nav drawer), `role-attribute` (`[role='tablist']`, `[role='tab']`, `[role='tabpanel']`, `[role='group']`, `[role='toolbar']`), `pseudo-class` (`:is(aside, nav)` / `:where(…)` for selector grouping), `root` (consumer-overridable global tokens), `nested`, `at-rule` |
| Forbidden head kinds | `pseudo-element` (→ `surfaces/`) |
| Token namespace | `filename` — `_article.scss` → `--set-article-*`; adjacent namespaces opt in via `FILE_EXCEPTIONS` (see §3) |

### 2.5 `composables/`

> Chrome partials gated on composable state (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`). Filename matches a `use{Name}` factory.

| Clause | Value |
| --- | --- |
| Layer | `@layer composables` |
| Allow comment-only | yes (only `_aside.scss` — `useAside` is behavior-only) |
| Require state selector | **yes** — every partial must use at least one state selector somewhere |
| Allowed head kinds | `tag` (`dialog.scrollable[open]`), `class` (`.carousel-item-next` lifecycle classes), `attribute` (`[popover]`, `[open]`), `data-attribute` (`[data-toast-stack]`), `aria-attribute` (`[aria-expanded='true']`), `role-attribute` (`[role='tablist']`), `pseudo-class` (`:popover-open`), `nested`, `at-rule` |
| Forbidden head kinds | `pseudo-element` (→ `surfaces/`) |
| Token namespace | `free` — composables read and override any namespace by design (a `useDialog` chrome partial routinely overrides `--set-popover-*` and `--set-variant-*` to retune the modal cascade) |

**Filename ↔ factory parity** — every `composables/_{name}.scss` must have a matching `create{Name}.ts` in `src/browser/factories/`. The contract test fails if you add a partial without the factory or vice versa.

---

## 3. File exceptions

Six known-good outliers are recorded in [`FILE_EXCEPTIONS`](../src/browser/patterns.ts) so the contract test exempts them cleanly. Each exception names what it relaxes and why.

| Path | Relaxation | Reason |
| --- | --- | --- |
| `composables/_aside.scss` | `skipStateSelectorCheck`, `allowCommentOnly` | `useAside` is a behavior-only composable; drawer geometry lives in `components/_aside.scss`. |
| `components/_aside.scss` | `additionalTokenPrefixes: [callout, alert, variant, popover, anchor]` | `<aside>` plays three roles (sidebar / callout / alert); drawer variant overrides variant/popover/anchor cascade. |
| `components/_output.scss` | `additionalTokenPrefixes: [toast]` | `<output popover>` becomes a toast — `useToast` shares the `--set-toast-*` namespace. |
| `components/_div.scss` | `additionalTokenPrefixes: [stack, cluster]` | Class-component primitives carried by `<div>`. |
| `components/_nav.scss` | `additionalTokenPrefixes: [tablist, tab, tabpanel]` | `<nav>` carries breadcrumb / pagination / tablist patterns. |
| `surfaces/_popover.scss` | `additionalTokenPrefixes: [popover-hint, anchor]` | Tooltip variant extends with the hint namespace; reads anchor tokens from `_anchor-position.scss`. |
| `surfaces/_anchor-position.scss` | `additionalTokenPrefixes: [anchor]` | File basename names the CSS feature; tokens live under `--set-anchor-*`. |
| `elements/_h1-h6.scss` | `additionalTokenPrefixes: [heading]` | Multi-tag partial covering `h1`–`h6`; tokens share the `--set-heading-*` namespace. |
| `elements/_input.scss` | `additionalTokenPrefixes: [check, switch, range, color, file]` | `<input>` subtypes (`checkbox` / `radio` / `switch` / `range` / `color` / `file`) ship dedicated namespaces. |
| `elements/_li.scss`, `elements/_ul.scss` | `additionalTokenPrefixes: [group]` | `<ul class="group">` list-group component carried by both elements. |

**Adding an exception** is a deliberate change. Every entry carries a `note` explaining the architectural reason; if the note can't be written in one sentence, the exception probably isn't justified.

---

## 4. The selector classification helpers

[`classifyHeadSelector(selector)`](../src/browser/patterns.ts) returns the kind of the rule's *head* — the first simple selector. Key behaviors:

- Compound selectors classify by their head: `button.dropdown::after` → `tag` (head is `button`).
- Descendant selectors classify by their leftmost head: `body:has(main) > main` → `tag` (head is `body`).
- Functional pseudos `:is()`, `:where()`, `:not()`, `:has()` peer into their inner content: `:where(h1, h2)` → `tag` (inner head is `h1`). Specificity differs but the architectural classification follows the subject.
- `:root` is classified as `root` (separate from `pseudo-class`).
- Sass nesting (`&.primary`, `&:hover`) classifies as `nested` — the parent's classification already gates the rule body.
- `@media` / `@supports` / `@container` rule openers classify as `at-rule` and skip the head-kind check.

[`hasStateSelector(selector)`](../src/browser/patterns.ts) is true when the selector contains at least one `[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `[popover]`, `:popover-open`, `:modal`, or `:open`. The composables/ contract requires at least one of these to appear somewhere in every partial.

[`hasPseudoElement(selector)`](../src/browser/patterns.ts) is true when the selector contains any `::pseudo` segment. Used to catch top-level pseudo-element rules that should live in `surfaces/`.

---

## 5. Scope discipline (cascade-first selector design)

Cross-cutting modifier rules — selectors that combine an attribute or pseudo head (e.g. `[popover]`) with a class qualifier from the modifier vocabulary (`.top`, `.subtle`, `.disabled`) — need explicit scoping. Two anti-patterns the parity test at [`tests/src/styles/_scope.test.ts`](../tests/src/styles/_scope.test.ts) catches:

### 5.1 Chained tag / attribute `:not()` qualifiers — collapse to `:not(:where(...))`

```scss
/* ❌ Chained :not()s inflate specificity. */
[popover]:not(aside):not(nav):not(output).top { … }    /* specificity 0,2,3 */

/* ✓ Flattened blocklist. `:where()` contributes 0 to specificity. */
[popover]:not(:where(aside, nav, output)).top { … }    /* specificity 0,2,0 */
```

Each `:not(tag)` adds 0,0,1 and each `:not([attr])` adds 0,1,0. Three of them inflate `[popover].top` from the intended 0,2,0 to 0,2,3, which can out-fight unrelated rules in the cascade. The `:not(:where(t1, t2, t3))` form keeps the exception list at zero specificity — adding or removing an opt-out is a single-token edit.

The parity test exempts pseudo-class chains (`:not(:first-child):not(:last-child)`, `:not(:placeholder-shown):not(:focus)`) because they're position / state checks where the idiom is well-known and the inflation rarely matters.

### 5.2 Unscoped cross-cutting modifier rules — add a scope clause

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

### 5.3 Cascade-design rationale

CSS is built around **broad defaults + narrow exceptions**, with the cascade resolving conflicts. The scope-discipline rules align selector form with that design:

- **Blocklists honor the cascade.** A new popover-able element you didn't anticipate (`<details popover>`, `<section popover>`) automatically inherits the default placement — no silent failure.
- **Flattened specificity prevents accidental cascade fights.** A 0,2,0 rule loses cleanly to a 0,2,1 rule when the consumer adds one. An inflated 0,2,3 rule fights specificity in ways that surprise authors.
- **Single edit point.** Adding or removing an opt-out is one token; chained `:not()`s require editing every branch of every rule.

### 5.4 Where the rule is enforced

- [`src/browser/patterns.ts`](../src/browser/patterns.ts) — `hasChainedTagNots()`, `hasScopingFunction()`, `classQualifiers()` helpers.
- [`tests/src/styles/_scope.test.ts`](../tests/src/styles/_scope.test.ts) — drives every partial in `src/styles/` against both anti-patterns.
- This document — prose rationale + canonical examples.

---

## 6. Reference

- [`src/browser/patterns.ts`](../src/browser/patterns.ts) — the contract data and helpers.
- [`tests/src/styles/_contracts.test.ts`](../tests/src/styles/_contracts.test.ts) — the parity test that consumes the contract.
- [`tests/src/browser/patterns.test.ts`](../tests/src/browser/patterns.test.ts) — the TS-shape assertions for the contract surface itself.
- [`taxonomy.md`](taxonomy.md) — every native HTML element + framework treatment (the per-tag complement to this per-folder doc).
- [`styles.md`](styles.md) — top-level cascade architecture.
- [`contribute.md`](contribute.md) — the workflow for authoring framework changes that conform to these contracts.
- [`AGENTS.md`](../AGENTS.md) §21 — codified Sass / SCSS conventions cross-referencing patterns.
