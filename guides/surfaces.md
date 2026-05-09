# Surfaces

> Browser-rendered chrome that isn't a tag or a composition. Folder: [src/styles/surfaces/](../src/styles/surfaces/). **Status: four surfaces shipped — `_anchor-position.scss`, `_backdrop.scss`, `_popover.scss`, `_scrollbar.scss`.**

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
src/styles/surfaces/_backdrop.scss         /* covers ::backdrop on modal dialog only */
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

| Surface                                                                 | Status  | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                 | Composable                             |
| ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [`_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss) | ✅ done | Auto-anchored placement for every `[popover]` via `position-area` + `position-try-fallbacks` + viewport-aware size bounds. Default places the popover below the anchor (`block-end`); placement modifiers (`.top` / `.bottom-start` / …) override per-host. Boundary detection: shrink → flip → shrink-after-flip via `max-block-size`, `position-try-fallbacks`, and `position-visibility: anchors-visible`. See §"Boundary detection" below. | _(future `usePopover` / `useTooltip`)_ |
| [`_backdrop.scss`](../src/styles/surfaces/_backdrop.scss)               | ✅ done | `dialog:modal::backdrop` only — dim + blur scrim. Popovers (`auto` / `manual` / `hint`) intentionally keep the UA-default transparent backdrop so non-modal floating panels don't dim the page.                                                                                                                                                                                                                                                | _(none yet)_                           |
| [`_popover.scss`](../src/styles/surfaces/_popover.scss)                 | ✅ done | `[popover]` panel chrome + `:popover-open` entry/exit transition (`transition-behavior: allow-discrete` + `@starting-style`) + `[popover=hint]` / `[role=tooltip]` smaller-variant chrome.                                                                                                                                                                                                                                                     | _(future `usePopover` / `useTooltip`)_ |
| [`_scrollbar.scss`](../src/styles/surfaces/_scrollbar.scss)             | ✅ done | `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`                                                                                                                                                                                                                                                                                                                                                                   | _(none — purely declarative)_          |

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

### 6.2 Boundary detection — how `_anchor-position.scss` keeps popovers on screen

A dropdown that prefers to drop down but flips up when the trigger is near the bottom of the viewport. A tooltip that shrinks (rather than overflows) when its anchor is at the edge of a small phone screen. A menu that auto-hides when its trigger scrolls offscreen. All three behaviours come for free in CSS — no JavaScript Floating-UI library needed — when four primitives are wired together correctly. Mailbox calls this the **shrink → flip → shrink-after-flip** recipe; the framework adopts the same pattern in [`_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss) and applies it to every `[popover]` automatically.

**The four primitives:**

| Property                                                                                        | What it buys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position-area: var(--set-anchor-position-area)`                                                | The requested side. Defaults to `block-end` (below); placement modifiers (`.top`, `.bottom-start`, …) override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `position-try-fallbacks: flip-inline` (block-axis flip OFF by default)                          | Fallback list — INLINE only. We deliberately omit `flip-block` because Chromium re-evaluates fallbacks only on layout change; once block-axis flips at open time, scrolling won't unstick it. Mailbox's `createDropdown.ts` opts out the same way (`flipThreshold === 0` → `position-try-fallbacks: flip-inline`) for plain dropdowns. The popover ALWAYS keeps the requested block-axis side and stays there as the anchor moves on scroll — predictable, no surprises. Consumers who want `flip-block` opt in per-host: `#my-popover { position-try-fallbacks: flip-block, flip-inline; }`. |
| `max-block-size` + `max-inline-size` clamped to `100dvh` / `100dvw` minus a viewport-edge inset | The **demanded space**. Without an explicit max-size, the browser uses the popover's intrinsic content size — which on a tiny mobile viewport could exceed the viewport itself. Clamping to `100dvh - 2 * --set-anchor-viewport-inset` (or `safe-area-inset-*`, whichever's larger) means the popover _shrinks before overflowing_.                                                                                                                                                                                                                                                           |
| `overflow: auto`                                                                                | Scrolls the popover's content when the demanded size still exceeds what fits — the cap doesn't truncate the menu, it scrolls it.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `position-visibility: anchors-visible`                                                          | Auto-hides the popover when the anchor scrolls offscreen. Without this, a dropdown left open in a scrolling list floats untethered at its computed position, pointing at nothing.                                                                                                                                                                                                                                                                                                                                                                                                             |

**The recipe in action.** Imagine a dropdown anchored to a button near the bottom of the viewport:

1. The browser plans the popover at `position-area: block-end` (below the button).
2. The popover's natural height is 264 px; only 12 px of viewport remain below the button.
3. **No block-axis flip.** With our default `position-try-fallbacks: flip-inline` (no `flip-block`), the popover stays committed to `block-end`. It DOESN'T flip up to `block-start`.
4. **Chromium auto-shifts to fit.** When the popover overflows its requested side, the UA shifts the popover up to fit within the viewport — the popover may overlap the trigger in this edge case. This is rare in practice (most dropdowns open with plenty of room below); when it matters, the consumer either opts in to `flip-block` per-host or sets a smaller `max-block-size` so the menu naturally fits + scrolls its content.
5. **Direction stays consistent on scroll.** Because we don't flip, scrolling the page doesn't change which side the popover is on. The popover always opens below the trigger and stays below it for the entire session — even when the anchor moves into space that would have allowed flipping in either direction.

All of this happens in the layout pass, before paint — there's no flicker, no JS observer, no re-positioning event.

**Tokens consumers can override.**

| Token                                 | Default                    | Notes                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--set-anchor-gap`                    | `calc(var(--spacing) * 1)` | Distance between anchor and popover (the gap below a dropdown).                                                                                                                                         |
| `--set-anchor-position-area`          | `block-end`                | Default placement; placement modifiers override.                                                                                                                                                        |
| `--set-anchor-position-try-fallbacks` | `flip-inline`              | Default fallback chain. Block-axis flip OFF by default to dodge the in-session-stickiness gotcha. Override per-host to opt back in: `#my-popover { position-try-fallbacks: flip-block, flip-inline; }`. |
| `--set-anchor-viewport-inset`         | `calc(var(--spacing) * 2)` | Minimum gap between popover and viewport edge. The framework takes the larger of this and `safe-area-inset-*` so notched / rounded-corner phones keep clearance even when the consumer asked for `p-0`. |

**What the framework intentionally does NOT use.**

- `position-try-order: most-width` (or `most-height`) is rejected. It's greedier — flips the moment the opposite side has even one pixel more room — which produces the "dropdown snaps up even when there's plenty of space below" symptom that mailbox debugged out of their dropdown.
- A separate JS Floating-UI / Floating-DOM dependency. The four primitives above cover the patterns we ship; a composable layer (Phase 6 `usePopover` / `useTooltip`) only adds keyboard nav, ARIA state writes, and arrow-side detection for tooltips — placement and boundary handling stay CSS.

#### What CSS handles vs. what JS handles

The flip side of the recipe runs at OPEN TIME. Each fresh open re-evaluates `position-try-fallbacks` cleanly — a popover that opens near the viewport bottom flips up; close it, scroll the trigger into the middle of the viewport, re-open, and it drops down again. Verified live: open near bottom → flipped up; close → scroll up → re-open → dropped down.

What CSS CANNOT do today is **re-flip a still-open popover when its anchor scrolls inside a nested scroll container**. Chromium re-evaluates `position-try-fallbacks` only when the popover's own layout changes (size or containing block). Scrolling an anchor's parent doesn't trigger that. We exhaustively tested CSS-only workarounds:

| Approach                                                                       | Result                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `position-try-order: most-block-size` (greedier flip)                          | No effect — sticky flip persists                                                                                         |
| `animation-timeline: scroll(nearest)` on `[popover]`                           | Doesn't run — top-layer popover's nearest scroller resolves to the viewport, not the inner scroller                      |
| `animation-timeline: scroll(self)` on `<main>` propagating a custom property   | Property changes correctly, but its presence in the popover's `max-block-size` calc doesn't trigger layout re-evaluation |
| Animating `max-block-size` directly via scroll-driven animation on the popover | Same — animation doesn't run for top-layer hosts                                                                         |

Mailbox lives with the same limitation in its CSS layer: their JS composables observe where Chromium placed the panel (to update an arrow-side class) but don't force re-flip either. The honest answer is that Chromium's anchor-positioning needs a layout invalidation hook that fires on anchor scroll — and until that lands, the gap is JS-shaped.

The Phase 6 composable layer (`useMenu` / `usePopover` / `useTooltip`) closes this gap with a small recipe:

```ts
// Phase 6 sketch — not shipped yet
function observeAnchorScroll(popover: HTMLElement): () => void {
	let frame = 0
	const tick = () => {
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(() => {
			// Toggle max-block-size by 1 sub-pixel to force layout invalidation;
			// Chromium re-runs position-try-fallbacks against the anchor's
			// current position. Confirmed via manual testing that this is the
			// minimum nudge that re-evaluates the flip.
			const previous = popover.style.maxBlockSize
			popover.style.maxBlockSize = previous === '' ? '99999px' : ''
		})
	}
	document.addEventListener('scroll', tick, { capture: true, passive: true })
	return () => document.removeEventListener('scroll', tick, true)
}
```

Until Phase 6 ships, the in-session stickiness is documented behaviour: open ⇒ commit ⇒ live until closed. Closing and re-opening always re-evaluates correctly, so the practical impact is small — most dropdown / popover sessions don't span a meaningful scroll.

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
