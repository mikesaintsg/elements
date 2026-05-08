# Surfaces

> Browser-rendered chrome that isn't a tag or a composition. Folder: [src/styles/surfaces/](../src/styles/surfaces/). **Status: three surfaces shipped (`_backdrop.scss`, `_popover.scss`, `_scrollbar.scss`).**

A **surface** is a CSS hook into a UA-controlled feature: pseudo-elements, attribute APIs, at-rules, UA-behavior properties. Things like `[popover]`, `dialog::backdrop`, `::placeholder`, view transitions, scrollbar styling, anchor positioning. Distinct from elements (which name HTML tags) and components (which compose elements) — these name **a seam in the browser itself**.

The folder exists with an empty barrel ([index.scss](../src/styles/surfaces/index.scss)) so the cascade layer is established. Real surfaces arrive when the framework needs them. This document describes the convention so future contributors land on the same shape, plus catalogs the Chromium-shipped candidate surfaces.

---

## 1. The category line

What unifies surfaces is that every entry styles, toggles, or queries something the user agent renders or maintains on its own — backdrops, validity bookkeeping, top-layer overlays, scrollbars, captions, transition snapshots, popovers, autofill state, anchor relationships — none of which the author wrote into the DOM as a styleable element.

| Category      | What it is                                                                                                        | Where it lives                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Element**   | A real HTML tag the framework styles.                                                                             | [src/styles/elements/](../src/styles/elements/)     |
| **Component** | A composed widget built from elements.                                                                            | [src/styles/components/](../src/styles/components/) |
| **Surface**   | A UA-controlled feature surfaced for styling — pseudo-elements, attribute APIs, at-rules, UA-behavior properties. | [src/styles/surfaces/](../src/styles/surfaces/)     |

Decision rules:

- If you'd write `<{tag}>` in HTML to use it → **element**.
- If you'd assemble it from multiple elements with a single class root → **component**.
- If the browser provides it through an attribute, pseudo, at-rule, or behavior property → **surface**.

---

## 2. Naming

Filename: `_{surface}.scss`. The `{surface}` segment names the underlying feature, not the CSS form:

```
src/styles/surfaces/_popover.scss          /* covers [popover], :popover-open, [popovertarget] */
src/styles/surfaces/_backdrop.scss         /* covers ::backdrop on dialog and popover */
src/styles/surfaces/_view-transition.scss  /* covers ::view-transition-* family + @view-transition */
src/styles/surfaces/_scrollbar.scss        /* covers scrollbar-color, scrollbar-width, scrollbar-gutter */
src/styles/surfaces/_placeholder.scss      /* covers ::placeholder on inputs */
src/styles/surfaces/_marker.scss           /* covers ::marker on lists */
src/styles/surfaces/_anchor-position.scss  /* covers anchor-name, position-anchor, position-area */
src/styles/surfaces/_field-sizing.scss     /* covers field-sizing: content */
```

If a surface family spans multiple selectors (e.g., view-transition's `::view-transition-old/new/group/image-pair`), one partial covers them together — the unit of organization is the underlying browser feature.

---

## 3. Surface partial template

```scss
// ============================================================================
// {surface} — {one-line description of the browser feature being styled}
//
// Browser support: Chrome {version}+, Edge {version}+. Safari/Firefox status
// noted only when relevant.
//
// Surfaces covered by this partial:
//   {selector or feature name}
//   {selector or feature name}
//
// Quirks:
//   {anything non-obvious about the surface — UA-default values that need
//    overriding, top-layer constraints, focus interactions, etc.}
// ============================================================================

@use '../mixins' as *;

@layer surfaces {
	/* Selectors and feature rules */
}
```

**Conventions enforced:**

- Wrap rules in `@layer surfaces`.
- Use tokens, not literals — read `--set-*` and Tailwind palette tokens. A surface can declare its own `--set-{surface}-*` tokens on whichever selector scope owns the styling, just like an element.
- Logical CSS properties (`inset-inline-start` not `left`).
- Reduced-motion-paired transitions via `@include transition(…)`.
- Document browser support in the header comment. Surfaces sit at the leading edge of CSS — many are Chrome 130+ — so consumers need to know.

---

## 4. Wiring it up

When a surface lands, three touch points:

1. **`@use '{surface}'` in [src/styles/surfaces/index.scss](../src/styles/surfaces/index.scss).** Alphabetical.
2. **Behavior test** under `tests/src/styles/surfaces/_{surface}.test.ts`. Test what the surface actually styles — for `[popover]`, that the popover panel renders with the right padding when open. For `::backdrop`, that the backdrop shows the configured color. The test environment is real Chromium via Playwright, so UA features work.
3. **Documentation** — add a row to §"Catalog" below.

If the surface pairs with a composable (e.g., `usePopover` to manage the show/hide lifecycle), follow the [components.md](components.md) §"Composables and events" convention. Surfaces and composables can pair the same way components and composables do.

---

## 5. Chromium-shipped candidate surfaces

Catalog of browser-rendered surfaces that could earn a partial. Use this as a menu, not a roadmap — most won't need styling. Promote when product UI actually uses them.

### 5.1 Pseudo-elements that style browser-rendered chrome

| Surface                                                                    | Styles                                 | Chrome shipped              |
| -------------------------------------------------------------------------- | -------------------------------------- | --------------------------- |
| `::backdrop`                                                               | dialog / fullscreen / popover backdrop | 37 (popover support 114)    |
| `::placeholder`                                                            | input/textarea placeholder text        | 57                          |
| `::marker`                                                                 | list item bullet/number                | 86                          |
| `::file-selector-button`                                                   | `<input type="file">` button           | 89                          |
| `::cue` / `::cue(selector)`                                                | WebVTT caption cues on `<video>`       | 26                          |
| `::target-text`                                                            | text-fragment scroll-to-text highlight | 89                          |
| `::spelling-error` / `::grammar-error`                                     | UA spelling/grammar underlines         | 121                         |
| `::highlight(name)`                                                        | Custom Highlight API ranges            | 105                         |
| `::selection`                                                              | selected-text highlight                | 1 (inheritance updates 134) |
| `::view-transition`, `::view-transition-{old,new,image-pair,group}(name)`  | view-transition snapshots              | 111                         |
| `::scroll-marker` / `::scroll-marker-group` / `::scroll-button(direction)` | scroll-driven indicators               | 135                         |
| `::picker(select)`, `::picker-icon`, `::checkmark`                         | customizable `<select>` UI             | 134                         |
| `::details-content`                                                        | `<details>` content region             | 131                         |

### 5.2 Pseudo-classes that key off browser state

| Surface                                                 | Selects                                       | Chrome shipped             |
| ------------------------------------------------------- | --------------------------------------------- | -------------------------- | --- |
| `:focus-visible`                                        | UA-determined keyboard focus                  | 86 (UA stylesheet 90)      |
| `:focus-within`                                         | focus inside descendant                       | 60                         |
| `:has(...)`                                             | relational selector                           | 105                        |
| `:is(...)` / `:where(...)`                              | selector list grouping                        | 88                         |
| `:placeholder-shown`                                    | input currently showing placeholder           | 47                         |
| `:autofill`                                             | UA-autofilled form control                    | 109                        |
| `:user-valid` / `:user-invalid`                         | form validity after user interaction          | 119                        |
| `:fullscreen`                                           | element rendered fullscreen                   | 71                         |
| `:modal`                                                | modal `<dialog>` / fullscreen                 | 105                        |
| `:popover-open`                                         | popover currently shown                       | 114                        |
| `:open`                                                 | open `<dialog>`/`<details>`/`<select>`/picker | 133                        |
| `:picture-in-picture`                                   | element currently in PiP                      | 105                        |
| `:state(name)`                                          | custom-element state                          | 125                        |
| `:dir(ltr                                               | rtl)`                                         | UA-resolved directionality | 123 |
| `:host` / `:host()` / `:host-context()` / `::slotted()` | Shadow DOM boundary                           | 53                         |

### 5.3 Attribute-as-feature APIs

| Surface                                                  | Behavior                              | Chrome shipped |
| -------------------------------------------------------- | ------------------------------------- | -------------- |
| `[popover]` / `[popover=auto/manual/hint]`               | popover top-layer element             | 114 (hint 134) |
| `[inert]`                                                | UA disables hit-testing/focus/AT      | 102            |
| `[hidden=until-found]`                                   | find-in-page reveals collapsed region | 102            |
| `[draggable]`                                            | drag source for HTML5 DnD             | 4              |
| `[contenteditable]` / `[contenteditable=plaintext-only]` | UA-managed editing                    | 1 / 100        |
| `[autocomplete]`                                         | UA autofill/autocomplete behavior     | 1              |
| `[spellcheck]`                                           | UA spellcheck rendering               | 9              |
| `[anchor]`                                               | implicit anchor association           | 125            |
| `[writingsuggestions]`                                   | UA writing-suggestion underlines      | 124            |

### 5.4 CSS at-rules that hook UA behaviors

| Surface                                       | Purpose                               | Chrome shipped |
| --------------------------------------------- | ------------------------------------- | -------------- |
| `@view-transition`                            | cross-document view transitions       | 126            |
| `@starting-style`                             | entry/exit interpolation start values | 117            |
| `@scope`                                      | scoped style block with donut hole    | 118            |
| `@container (size)`                           | size container queries                | 105            |
| `@container style(...)`                       | style container queries               | 111            |
| `@container scroll-state(...)`                | scroll-state container queries        | 133            |
| `@property`                                   | typed/registered custom properties    | 85             |
| `@layer`                                      | cascade layers                        | 99             |
| `@supports selector(...)`                     | selector feature query                | 88             |
| `@font-palette-values`                        | palette overrides for color fonts     | 101            |
| `@counter-style`                              | custom list/counter styles            | 91             |
| `@page` (with margin boxes)                   | print pagination                      | 2+             |
| `@position-try`                               | anchor-position fallback try blocks   | 125            |
| `scroll()` / `view()` on `animation-timeline` | scroll-driven animations              | 115            |

### 5.5 CSS properties that opt into UA behaviors

| Surface                                                                                                                 | Behavior                                                         | Chrome shipped  |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------- |
| `field-sizing: content`                                                                                                 | input/textarea auto-size to content                              | 123             |
| `text-wrap: balance` / `pretty` / `stable`                                                                              | UA balances last lines / orphan optimization / re-wrap stability | 114 / 117 / 130 |
| `interpolate-size: allow-keywords`                                                                                      | animate to/from `auto`/`min-content`/etc.                        | 129             |
| `view-transition-name` / `view-transition-class`                                                                        | opts element into VT capture                                     | 111 / 125       |
| `content-visibility: auto/hidden`                                                                                       | UA render-skipping                                               | 85              |
| `contain-intrinsic-size`                                                                                                | placeholder size for skipped subtrees                            | 83              |
| `scrollbar-color` / `scrollbar-width` / `scrollbar-gutter`                                                              | standard scrollbar styling                                       | 121 / 121 / 94  |
| `overscroll-behavior`                                                                                                   | UA scroll chain/glow control                                     | 63              |
| `accent-color`                                                                                                          | UA color of checkboxes/radios/range/progress                     | 93              |
| `caret-color`                                                                                                           | text-input caret color                                           | 57              |
| `color-scheme: light \| dark`                                                                                           | opts into UA dark form controls/scrollbars                       | 81              |
| `appearance: base-select` / `base`                                                                                      | opts `<select>` into customizable rendering                      | 134             |
| `anchor-name` / `position-anchor` / `position-area` / `position-try-fallbacks` / `position-visibility` / `anchor-scope` | anchor positioning                                               | 125–131         |
| `overlay: auto` (animation-only)                                                                                        | top-layer transition hook                                        | 117             |
| `transition-behavior: allow-discrete`                                                                                   | animate `display`/`content-visibility`/top-layer                 | 117             |
| `text-spacing-trim` / `text-box` / `text-box-trim` / `text-box-edge`                                                    | UA-managed CJK punctuation / leading trim                        | 123 / 133       |
| `font-variant-emoji`                                                                                                    | UA emoji presentation                                            | 131             |
| `print-color-adjust` / `forced-color-adjust`                                                                            | UA color-overrides hook                                          | 17 / 89         |
| `pointer-events: none/auto`                                                                                             | UA hit-testing opt-out                                           | 2+              |
| `touch-action`                                                                                                          | UA gesture/scroll opt-in                                         | 36              |
| `user-select`                                                                                                           | UA selection behavior                                            | 54              |

---

## 6. Catalog (built surfaces)

| Surface                                                     | Status  | What it covers                                                                                                               | Composable                    |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`_backdrop.scss`](../src/styles/surfaces/_backdrop.scss)   | ✅ done | `dialog::backdrop` + `[popover]::backdrop` — top-layer backdrop color, blur, transition                                      | _(none yet)_                  |
| [`_popover.scss`](../src/styles/surfaces/_popover.scss)     | ✅ done | `[popover]` panel chrome + `:popover-open` entry/exit transition (`transition-behavior: allow-discrete` + `@starting-style`) | _(future `usePopover`)_       |
| [`_scrollbar.scss`](../src/styles/surfaces/_scrollbar.scss) | ✅ done | `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`                                                 | _(none — purely declarative)_ |

When the next surface lands, add a row above.

### 6.1 Gotcha — Tailwind layout utilities on `[popover]` elements

The UA hides closed popovers with `[popover]:not(:popover-open) { display: none; }`. That UA rule sits in the lowest cascade tier, so any author rule (including a Tailwind utility) wins. Putting `class="grid"`, `class="flex"`, or `class="block"` directly on a `[popover]` element forces `display: grid|flex|block` even when the popover is closed — the panel renders flat in document flow until first opened.

**Fix:** wrap the popover's content in a child div that takes the layout utility, leave the popover element itself layout-utility-free.

```html
<!-- ✗ Wrong — `.grid` defeats the UA's hide-when-closed rule -->
<div popover="auto" class="grid gap-2">…</div>

<!-- ✓ Right — popover element keeps UA-controlled display, child handles layout -->
<div popover="auto" style="max-inline-size: 24rem">
	<div class="grid gap-2">…</div>
</div>
```

A future `_popover.scss` enhancement could re-assert `display: revert-layer` for closed popovers in `@layer surfaces`, but the current trade-off (predictable cascade, simple author rule) is preferred — let utilities follow the layer order without exceptions.

---

## 7. First candidates

When time comes to add surfaces, the first three are likely:

1. **`_popover.scss`** — `[popover]` + `:popover-open` + the placement / `position-area` / `anchor-name` integration. Pairs with a future `usePopover` composable for show/hide lifecycle. Unlocks tooltip, dropdown, menu patterns. **(✅ shipped — placement / `anchor-name` integration deferred.)**
2. **`_backdrop.scss`** — `dialog::backdrop` + `[popover]::backdrop`. Small surface; one or two color/blur declarations. Earned alongside `<dialog>`'s element promotion. **(✅ shipped.)**
3. **`_scrollbar.scss`** — `scrollbar-color` + `scrollbar-width` + `scrollbar-gutter` defaults. Theme-friendly and unobtrusive; can be authored without composable support. **(✅ shipped.)**

Next up after these three: view transitions, anchor positioning, and `::picker(select)` follow as the framework's component layer earns them.

---

## Reference

- [src/styles/surfaces/](../src/styles/surfaces/) — SCSS sources (currently empty)
- [styles.md](styles.md) — top-level architecture and authoring contract
- [components.md](components.md) — sibling category for composed widgets
- [elements.md](elements.md) — sibling category for HTML tags
- [tokens.md](tokens.md) — token surface for any `--set-{surface}-*` tokens you author
- [modifiers.md](modifiers.md) — modifier cascade (rarely consumed by surfaces, but available)
