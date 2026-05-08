# Components

> Composed widgets built from elements. Folder: [src/styles/components/](../src/styles/components/). **Status: scaffolded; no entries yet.**

A **component** is a higher-level pattern composed from one or more HTML elements plus the framework's modifier cascade. Cards, alerts, modals, dropdowns, toasts — anything that's a "thing" in product UI rather than a single tag. They opt-in: consumers import the components they want, and the rest of the file isn't shipped (treeshakeable).

The folder exists with an empty barrel ([index.scss](../src/styles/components/index.scss)) so the cascade layer is established. Real components arrive when the framework needs them. Until then, this document describes the convention so future contributors land on the same shape.

---

## 1. Components vs. elements vs. surfaces

Three categories, three folders. Any new partial slots into exactly one.

| Category | Folder | What it is | Example |
|---|---|---|---|
| **Element** | [src/styles/elements/](../src/styles/elements/) | One file per real HTML tag. Token-driven baseline + UA reset. | `<button>`, `<input>`, `<table>` |
| **Component** | [src/styles/components/](../src/styles/components/) | Composed widget built from elements. Has a class root (`.card`, `.alert`). Opt-in. | `.card`, `.alert`, `.modal`, `.dropdown` |
| **Surface** | [src/styles/surfaces/](../src/styles/surfaces/) | CSS for browser-rendered chrome that isn't a tag or composition: `[popover]`, `::backdrop`, `::placeholder`, view transitions, scrollbar styling. | `[popover]`, `dialog::backdrop`, `::picker(select)` |

A pull request that proposes "a button-shaped thing" almost always belongs in `elements/` (refactor `<button>`'s baseline) or stays as a usage of existing modifiers. Reach for `components/` when the thing genuinely composes elements — a card has a header + body + footer, a dropdown has a trigger + a menu.

---

## 2. Naming

Filename: `_{component}.scss` (singular).

Class root: `.{component}` (single word, spelled out).

Slots: `.{component}-{slot}` (header, body, footer, action, …).

State: `.{component}-{state}` only when state is component-specific. Universal states (`.disabled`, `.active`, `.loading`) come from the modifier cascade.

Examples:

```
src/styles/components/_card.scss
  .card                  /* root */
  .card-header           /* slot */
  .card-body             /* slot */
  .card-footer           /* slot */
  .card-actions          /* slot */
  .card-elevated         /* component-specific modifier — adds box-shadow */
```

```
src/styles/components/_alert.scss
  .alert                 /* root */
  .alert-icon            /* slot */
  .alert-message         /* slot */
  .alert-dismiss         /* slot */
```

If a slot's name overlaps with another component's slot, that's fine — `.card-header` and `.modal-header` are scoped by their root selector when the partial declares rules like `.card .card-header { ... }` (or relies on the slot only making sense inside the root).

---

## 3. Component partial template

```scss
// ============================================================================
// {component} — {one-line description of what it composes}
//
// Architecture:
//   1. .{component} is the root selector; declares element-scoped tokens
//      (--set-{component}-*) with fallback chains identical to the element
//      cascade pattern in tokens.md.
//   2. Slot selectors (.{component}-{slot}) provide structure-specific rules.
//   3. Modifier cascade applies via the same --set-variant-* / --set-size-* /
//      etc. tokens — adding .primary on a .card flows through.
//
// Quirks: (any element-specific quirks the composition introduces)
// ============================================================================

@use '../mixins' as *;

@layer components {
  .{component} {
    // Element-scoped tokens (read modifier-context tokens with fallbacks)
    --set-{component}-color:            var(--set-style-color, var(--set-variant-color, currentColor));
    --set-{component}-background-color: var(--set-style-background-color, var(--set-variant-background-color, transparent));
    --set-{component}-border-radius:    var(--set-shape-border-radius, var(--set-size-border-radius, 0.375rem));
    --set-{component}-padding-inline:   var(--set-size-padding-inline, calc(var(--spacing) * 4));
    --set-{component}-padding-block:    var(--set-size-padding-block,  calc(var(--spacing) * 3));
    --set-{component}-transition-duration: var(--set-transition-duration);

    // Layout + base properties
    display: flex;
    flex-direction: column;
    padding-inline: var(--set-{component}-padding-inline);
    padding-block:  var(--set-{component}-padding-block);
    color:            var(--set-{component}-color);
    background-color: var(--set-{component}-background-color);
    border-radius: var(--set-{component}-border-radius);
    @include transition(background-color var(--set-{component}-transition-duration));
  }

  .{component}-header {
    /* slot rules */
  }

  .{component}-body {
    /* slot rules */
  }

  /* ... */
}
```

**Conventions enforced:**
- Wrap rules in `@layer components`.
- Use the modifier cascade. Don't hand-roll `&.primary`, `&.large`, etc. — let the variant/size/shape/style modifiers cascade through `--set-{component}-*` tokens just like elements do.
- Element-scoped tokens declare on the component's root selector, not on `:root`.
- Logical CSS properties (`padding-inline`, `margin-block`, `inset-inline-start`).
- Reduced-motion-paired transitions via `@include transition(…)`.

---

## 4. Wiring it up

When a component lands, four touch points:

1. **`@use '{component}'` in [src/styles/components/index.scss](../src/styles/components/index.scss).** Alphabetical inside the file.
2. **Class names listed in TS** — when component classes (slots, component-specific modifiers) need a TS mirror, add a `components` group to a future `src/browser/components.ts`. Initial scope can skip this if all component classes are static (no JS interaction). Once the first component composable lands (e.g., `useDialog`), the TS surface is non-trivial and components.ts becomes mandatory.
3. **Behavior test** under `tests/src/styles/components/_{component}.test.ts` covering: bare component renders, modifier cascade reaches the root tokens, each slot resolves the expected layout.
4. **Documentation** — add a row to §"Catalog" below with status, root selector, and slots.

---

## 5. Composables and events (when they arrive)

Components that need JS interactivity (modal open/close, dropdown toggle, toast show/hide) pair with a composable in `src/browser/composables/` (folder doesn't exist yet — created with the first composable). The composable / partial contract:

- The composable owns **state**: which class is on the element right now, when transitions fire, what `aria-*` attributes are set.
- The partial owns **chrome**: color, layout, sizing, transitions.

State class names are framework-defined and live in `src/browser/modifiers.ts` (`.disabled`, `.active`, `.loading`, plus future component-specific states).

Event names follow the convention locked in [src/browser/events.ts](../src/browser/events.ts): `elements:{component}:{verb}` where verb is from the lifecycle vocabulary (`open`, `close`, `show`, `hide`, `start`, `stop`, `pause`, `resume`, `abort`, `destroy`, `select`, `deselect`, `focus`, `blur`).

Example sketch (when modal lands):

```scss
/* src/styles/components/_modal.scss */
.modal {
  /* tokens, layout, transition */
  @include transition(opacity var(--set-modal-transition-duration));

  &:not([open]) {
    /* hidden state */
  }
}
```

```ts
// src/browser/composables/useModal.ts (future)
export const events = {
  modal: {
    open:  'elements:modal:open'  as const,
    close: 'elements:modal:close' as const,
  },
}
```

The composable adds/removes attributes on the element (`open`, `aria-hidden`); the partial styles the resulting state. Same contract every component follows.

---

## 6. Catalog

| Component | Status | Root selector | Slots | Composable |
|---|---|---|---|---|

(empty)

When the first component lands, this table is the at-a-glance reference. Update with every new component.

---

## Reference

- [src/styles/components/](../src/styles/components/) — SCSS sources (currently empty)
- [styles.md](styles.md) — top-level architecture and authoring contract
- [tokens.md](tokens.md) — element-scoped token pattern (components follow the same)
- [modifiers.md](modifiers.md) — modifier cascade components consume
- [elements.md](elements.md) — element baselines components compose from
- [surfaces.md](surfaces.md) — sibling category for browser-rendered chrome
