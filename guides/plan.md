# Plan & Status

> Living tracker of where the framework stands today and what to build next. Companion guides — [styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [composables.md](composables.md), [surfaces.md](surfaces.md) — describe how each layer works; this file tracks what's shipped, what's next, and the invariants every contributor must respect.

---

## 1. Where we are

A working framework built over Tailwind v4, layered into the `@layer` order:

```
theme, base, elements, components, surfaces, composables, modifiers, utilities
```

Five concrete layers ship today:

| Layer | What lives there | Folder |
|---|---|---|
| **Elements** | One file per HTML tag. Token-driven baselines + UA-quirk resets. Targets bare tags. | [`src/styles/elements/`](../src/styles/elements/) |
| **Components** | Element compositions that read as one UI thing — card, sidebar, navbar, dropdown, toast. Targets bare HTML roots; class-root fallback when no semantic tag fits. | [`src/styles/components/`](../src/styles/components/) |
| **Surfaces** | Browser-rendered chrome that isn't a tag or composition — `[popover]`, `::backdrop`, scrollbar, anchor positioning. | [`src/styles/surfaces/`](../src/styles/surfaces/) |
| **Composables** | Component-specific layout / chrome that only applies while a composable's state attribute is set. Lives `@layer composables`, beats every previous layer for the same selector. | [`src/styles/composables/`](../src/styles/composables/) |
| **Modifiers** | The four-dimension cascade — variant, size, style, shape, state, placement. | [`src/styles/modifiers/`](../src/styles/modifiers/) |

The TypeScript surface mirrors what ships under three folders:

| Folder | Owns |
|---|---|
| [`src/browser/composables/`](../src/browser/composables/) | 21 Vue 3 adapters — `useDialog`, `useAside`, `useMenu`, `useSelect`, `useToast`, `useTooltip`, `usePopover`, `useDetails`, `useTabs`, `useNav`, `useForm`, `useTable`, `useCarousel`, `useDrag`, `useDrop`, `useFocus`, `usePointer`, `useTheme`, `useButton`, `useAlert`, `useAside`. |
| [`src/browser/factories/`](../src/browser/factories/) | Framework-agnostic `create*` factories — one per composable. Import only from `@vue/reactivity`. The Vue adapter is the thin layer; the factory is the logic. |
| [`src/browser/`](../src/browser/) | `tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`, `constants.ts`, `helpers.ts`, `types.ts` — the contract surface. Bidirectionally parity-tested against SCSS. |

---

## 2. Invariants — must respect

These are framework-wide rules every commit honors. Breaking one ships a bug. The recent audits ([§5](#5-recent-audits--lessons-learned)) all trace back to one of these being violated.

### 2.1 The cascade layer order is load-bearing

Layer order is declared once in the consumer entry CSS (`tests/setup.css`, `app/browser/styles/main.css`):

```css
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
```

Later layers win. Composables sits AFTER surfaces, so a composable rule on `<aside>` beats the popover surface's defaults for the same selector. Modifiers sit AFTER everything except utilities, so `.primary` reliably tints regardless of what else matches. Don't reorder.

### 2.2 Tokens are the variation surface — modifiers don't hand-roll selectors

Every component-level rule reads through the four-dimension fallback chain:

```scss
--set-{name}-color:
  var(--set-style-color,
  var(--set-variant-color,
  currentColor));
```

A `<button class="primary large outline rounded">` resolves via that chain — `.outline` rewrites `--set-style-*`, `.primary` writes `--set-variant-*`, `.large` writes `--set-size-*`, `.rounded` writes `--set-shape-border-radius`. No `&.primary { color: ... }` blocks inside element files. The four dimensions cover ~99% of variations; only declare per-modifier rules in element files when a property genuinely can't come from a token (`<form>.row` flips flex-direction — that can't be a token).

### 2.3 Open/closed lifecycle: dual-attribute gating with persistent closing state

Any element that opens and closes (popover, dialog, aside drawer, toast, menu) MUST gate its drawer-shaped CSS on the open-state selector. Author CSS that asserts `display: flex`, `position: fixed`, or large transforms on a bare popover-bearing selector defeats the UA's `display: none` for the closed state — the element stays rendered after `.hidePopover()` / `.close()`.

The discipline:

1. **Bare element rule** stays minimal — typically only tokens and color/border chrome that survives the close. No `display`, no `position: fixed`, no large translate.
2. **Open-state rule** gates on `:popover-open` / `:modal` / `[data-{name}-open]` and owns the drawer geometry (display, position, inset, sizing, transforms).
3. **Closing-state attribute** (e.g. `[data-aside-closing]`) is set synchronously when `hide()` runs AND intentionally NOT removed after the slide completes — it persists until the next `show()` (which clears it) or `destroy()`. This keeps the drawer geometry alive through the popover surface's `transition-behavior: allow-discrete` window (~150 ms after `hidePopover()` before `display: none` lands), preventing a "ghost flash" at the popover-surface default position.
4. **`@starting-style` for from-state** targets a selector ONE specificity step below the open-state rule (e.g. `aside[popover].start` vs `aside[popover][data-aside-open].start`) — works around the Chrome 148+ cascade-tier bleed-through bug where matching-specificity starting-style declarations defeat the open-state rule.

Full discussion + per-composable lifecycle map in [composables.md §Open/closed lifecycle](./composables.md).

### 2.4 Factories are dual-distribution; composables are the Vue adapter

Every composable has a paired `create*` factory under `src/browser/factories/`. The composable is a Vue adapter (resolves refs, watchEffect, returns `readonly()` state). The factory is the logic (imports only `@vue/reactivity`, attaches listeners, manages attributes, emits events, owns `destroy()`).

Non-Vue consumers drop the composable and call `createDialog(el, opts)` directly. Tests cover both layers separately.

### 2.5 Naming

| Surface | Convention |
|---|---|
| HTML tag → composable | `<dialog>` → `useDialog`, `<aside>` → `useAside`, `<menu>` → `useMenu`. One composable per tag. |
| Composable → factory | `useDialog` ↔ `createDialog`. Same name, different layer. |
| Event names | `elements:{source}:{verb}` — source = tag or composable noun, verb from the lifecycle vocabulary (`show`/`open`/`hide`/`close`/`select`/`destroy`/etc.). |
| State attributes | `[data-{name}-{state}]` — `data-aside-open`, `data-aside-closing`, `data-table-expanded`, `data-toast-stack-closing`. |
| CSS tokens | `--set-{scope}[-context]-{property}` where `{property}` is the real CSS property key (`color`, `background-color`, `padding-inline`). |

Bootstrap class soup (`.show`, `.fade`, `.modal-backdrop`, `.btn-close`, `.dropdown-*`) is OUT. Use the data attribute or the native ARIA state instead.

---

## 3. Element status

Detailed checklist in [elements.md](elements.md). Top-level counts:

| Status | Count | Examples |
|---|---|---|
| ✅ cascade | ~21 | `<button>`, `<a>`, `<input>`, `<textarea>`, `<select>`, `<dialog>`, `<aside>`, `<details>`, `<table>`-family, `<form>`-controls, `<output>`, `<progress>`, `<meter>`, `<h1>`–`<h6>` |
| 🟡 override | ~17 | `<abbr>`, `<address>`, `<mark>`, `<p>`, `<hr>`, `<blockquote>`, `<code>`-family, `<pre>`, `<dl>`-family, `<figure>`-family, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>` |
| 🚫 stays | ~55 | Inline phrasing, sectioning landmarks (handled at components layer), void/inert metadata, MathML/SVG/canvas, list markers |

---

## 4. Component status

Detailed catalog in [components.md](components.md). Element-driven components live in `src/styles/components/`; composable-attached chrome lives in `src/styles/composables/`.

| Layer | Shipped | Notes |
|---|---|---|
| `components/` static | 12 partials — `_body.scss`, `_main.scss`, `_article.scss`, `_aside.scss`, `_header.scss`, `_footer.scss`, `_nav.scss`, `_search.scss`, `_menu.scss`, `_output.scss`, `_form.scss`, `_div.scss` | Plus three small atoms (`_badge.scss`, `_dot.scss`, `_tag.scss`, `_role-group.scss`, `_skeleton.scss`, `_spinner.scss`). |
| `composables/` dynamic | 6 partials — `_aside.scss` (drawer geometry), `_dialog.scss` (size modifiers), `_select.scss` (listbox/combobox chrome), `_toast.scss` (deck stacking), `_tabs.scss` (indicator + roving tabindex), `_carousel.scss` | Each gated on the composable's data attribute so the rule only applies while the composable is mounted. |
| `surfaces/` | 5 partials — `_popover.scss`, `_backdrop.scss`, `_anchor-position.scss`, `_scrollbar.scss`, `_focus.scss` | `_anchor-position.scss` ships the placement vocabulary (`.start`/`.end`/`.top`/`.bottom` + corners) consumed by every floating component. |

---

## 5. Recent audits + lessons learned

These shaped the invariants in §2. Each is a class of bug we'd hit more than once, fixed once, documented going forward.

### 5.1 The `[open]` / `:popover-open` gating audit (2026-05)

Found three places where author CSS asserted `display: flex` on a popover-bearing or `<dialog>`-bearing selector without gating on the open-state pseudo. Each one defeated the UA's `display: none` for the closed state, leaving the element rendered after `.close()` / `.hidePopover()`:

1. `dialog.scrollable { display: flex }` — closed scrollable dialog stayed at top-left of viewport (`:modal` no longer matched, centering rule dropped, UA position absolute won).
2. `output[popover] { display: flex }` — closed toast stayed at bottom-end corner after autohide elapsed.
3. `[data-toast-stack] > output[popover] { transform: ...; opacity: ... }` — closing toast in a 2+ deck never faded cleanly because deck specificity beat the popover surface's close-state values.

All three fixed by splitting the rule: layout (`display`/`transform`/`opacity`) gates on the open-state selector; chrome (background/border/sizing) stays unconditional so closing elements retain visual identity for the surface's discrete-transition tail.

Codified in invariant §2.3 above.

### 5.2 The `<aside>` post-close ghost flash (2026-05)

After the slide-out completed and `data-aside-closing` was removed synchronously, the drawer-geometry block stopped matching. For the popover surface's ~150 ms discrete-transition tail (display:none → block transition with `transition-behavior: allow-discrete` keeps the element in the render tree), the panel snapped from `position: fixed; inset: 0; block-size: 100dvh` to popover-surface defaults (`position: absolute; inset: auto; max-block-size: 18rem`). User saw a ~288 px-tall ghost at the top of the page before display:none lands.

Fixed by stopping `createAside` from removing `data-aside-closing` after `hidePopover()`. The attribute persists until the next `show()` (which clears it) or `destroy()`. The drawer-geometry block stays alive through the discrete-transition tail; the panel parks off-screen at `translateX(±100%)` and silently disappears when display:none kicks in.

Codified in invariant §2.3 above. Pattern is documented next to the `display: flex` line in `composables/_aside.scss` as load-bearing.

### 5.3 `@starting-style` Chrome 148+ bleed-through (2026-05)

Nesting `@starting-style { ... }` inside an open-state rule (e.g. `aside[popover][data-aside-open].start`) compiled to a starting-style declaration with the SAME specificity as the open-state rule. Chrome 148+ has a regression where matching-specificity starting-style declarations leak into the normal cascade tier when transitions don't fully engage — same specificity + later source order means the off-screen transform wins permanently, leaving the panel stuck off-screen.

Fixed by extracting `@starting-style` to target a BARE selector one specificity step below the open-state rule (`aside[popover].start` vs `aside[popover][data-aside-open].start`). The element still matches the bare selector at the transition's first frame so `@starting-style` resolves its from-state values; the open-state rule wins by specificity regardless of cascade-tier leakage.

Same fix applied earlier to `surfaces/_popover.scss` for `[popover]:popover-open`. Pattern is documented in the header of both files.

### 5.4 The `useSelect` combobox filter + click (2026-05)

`SELECT_ITEM_SELECTOR` aliased `MENU_ITEM_SELECTOR` (`:where(li, a, button):not([disabled]):not([aria-disabled])`), which caught every interactive descendant including the filter input's wrapping `<li class="select-search">` and option-wrapper `<li>`s. Clicks on the search row matched closest() and silently returned (no `data-value`); arrow-key roving doubled-counted options because both `<li>` and inner `<button>` matched.

Fixed by narrowing `SELECT_ITEM_SELECTOR` to `[data-value]:not([disabled]):not([aria-disabled="true"])` — only value-bearing elements qualify. The elements-flavoured equivalent of mailbox's `.dropdown-item[data-value]`.

Separately, the factory marked filtered options with `[data-hidden]` but no CSS rule hid them. Added `.select [data-hidden] { display: none }` in `composables/_select.scss`.

### 5.5 The `<menu>` dropdown wrap + alignment (2026-05)

`<menu>` items wrapped into a second COLUMN instead of scrolling when content exceeded the popover's `max-block-size` cap, because the bare `<menu>` rule's `flex-wrap: wrap` inherited into popover-mode menus with `flex-direction: column`. Fix: `flex-wrap: nowrap; overflow-block: auto; overscroll-behavior: contain` on popover-mode `<menu>` rules.

Items were also center-aligned because the bare `<button>` rule sets `justify-content: center`. Fix: `justify-content: flex-start` on popover-menu item rules (text-align alone didn't cover multi-child flex layouts).

---

## 6. What's next

Active threads in priority order:

### 6.1 Showcase polish

The 20 `Use*Page.vue` showcase pages cover every composable but vary in fidelity. Highest-value pass: visual + interaction audit on each, mobile + desktop, light + dark theme. The audits in §5 came from this kind of pass.

### 6.2 Theming surface

| Item | Status | Notes |
|---|---|---|
| Dark mode | ✅ shipped | `[data-theme="dark"]` block in `_theme.scss` with full variant + neutral re-tuning. |
| Named theme cores | ⏳ none yet | Mailbox ships 4 named cores. We could offer 1–2 alternates to dogfood the theming surface. |
| Density factor (`--set-density-factor`) | ✅ shipped | Global multiplier in `_tokens.scss`. Per-component opt-in pending. |
| Radius factor (`--set-radius-factor`) | ✅ shipped | Same shape. |
| Elevation scale (`--set-box-shadow-{sm,base,lg}`) | ✅ shipped | Three-tier scale; toast/popover/dialog all consume. |

### 6.3 Remaining surfaces

| Surface | Status | Notes |
|---|---|---|
| `_placeholder.scss` (`::placeholder`) | ⏳ pending | Currently `<input>`/`<textarea>` paint placeholder inline — extract when more elements need it. |
| `_marker.scss` (`::marker`) | ⏳ pending | `_summary.scss` paints its own marker. Extract when `<details>` isn't the only consumer. |
| `_picker-select.scss` (`::picker(select)`) | ⏳ pending | Awaiting Firefox + Safari `appearance: base-select`. |
| `_view-transition.scss` | ⏳ pending | Cross-page transitions on `<a>` navigation. Independent surface; can ship any time. |
| `_selection.scss` (`::selection`) | ⏳ pending | Variant-tinted selection color. |

### 6.4 Class-root widgets (no semantic home)

Layout primitives shipped (`.stack`, `.cluster`). Atoms shipped (`.badge`, `.dot`, `.tag`, `.skeleton`, `.spinner`). Still pending:

| Widget | Class root / element | Lift-from |
|---|---|---|
| Empty state | `.empty-state` on `<aside>` | mailbox `_empty-state.scss` |
| Stat / KPI | `<output>` styled (preferred) or `.stat` | mailbox `_stat.scss` |
| Avatar | `<img>` + size modifier (preferred) or `.avatar` | mailbox `_avatar.scss` |
| Stepper | `<ol class="stepper">` | mailbox `_stepper.scss` |
| Timeline | `<ol class="timeline">` | mailbox `_timeline.scss` |
| Rating | `<meter>` (preferred) or `.rating` | mailbox `_rating.scss` |
| Splitter | `.splitter` on `<div>` | mailbox `_splitter.scss` — pairs with `useDrag` + `usePointer` |

### 6.5 Distribution polish

Published-package guidance, `@source` ergonomics, dual-distribution (CSS + TS) build verification, npm publish dry-run. Defer until the framework is consumed by a second app.

---

## 7. Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide ([tokens.md](tokens.md) / [elements.md](elements.md) / [components.md](components.md) / [composables.md](composables.md) / [surfaces.md](surfaces.md) / [mixins.md](mixins.md) / [modifiers.md](modifiers.md)).
2. This file's tables — move shipped items into the right status table; if it's a new lesson learned, add a §5 entry.

Out-of-date status is worse than missing status. Don't wait for a "doc pass."

When picking what to work on next, prefer the lowest-numbered §6 row. The §2 invariants are non-negotiable for every commit.
