# Composables

> Vue 3 composables that wrap native HTML element behaviour. Single-word public API. Every composable has a paired framework-agnostic factory under [`src/browser/factories/`](../src/browser/factories/) — drop the Vue adapter and call `createDialog(el, opts)` directly from any framework.

A **composable** owns state (open/closed, active/inactive, transitions). The matching component partial owns chrome (color, layout, sizing). The element baseline owns UA-quirk resets and token chains. Three layers, each with a single responsibility.

This document covers:

1. [The factory + adapter split](#1-factory--adapter-split) — why every composable has two files.
2. [Naming](#2-naming) — element → composable → factory rules.
3. [Open/closed lifecycle](#3-openclosed-lifecycle) — the dual-attribute gating discipline every popover-bearing surface follows.
4. [Anatomy of a composable](#4-anatomy-of-a-composable) — the canonical body layout.
5. [Per-composable reference](#5-per-composable-reference) — purpose, options, return shape, events, attributes managed.
6. [Contributing](#6-contributing) — checklist for adding a new composable.

---

## 1. Factory + adapter split

Every composable in [`src/browser/composables/`](../src/browser/composables/) is a thin Vue adapter over a framework-agnostic `create*` factory in [`src/browser/factories/`](../src/browser/factories/).

```
src/browser/
├── composables/use{Name}.ts    Vue adapter — resolves refs, watchEffect, readonly() state.
├── factories/create{Name}.ts   Framework-agnostic — imports only from @vue/reactivity.
├── helpers.ts                  Shared utilities (assertElement, runTransition, lockBodyScroll, …).
├── types.ts                    Use*Options / Use*Return / Create*Options / Create*Instance.
├── constants.ts                Event-name maps, selector strings, default timing tokens.
└── events.ts                   Event-name registry (parity-tested against constants.ts).
```

**Why the split:**

- The factory is the logic — owns DOM listeners, attribute lifecycle, ARIA wiring, event emission, `destroy()`. It imports only from `@vue/reactivity` so it's usable in any framework or in vanilla JS.
- The composable is the Vue adapter — resolves `Ref<HTMLElement>`, watches for ref changes, wraps the factory's reactive state in `readonly()`. Most composables are 20–40 lines.
- Tests cover both layers. Factory tests use real DOM via `mountSetup` + `withElement`. Composable tests mount via Vue's test utilities.

**Authoring rule:** put logic in the factory. The composable is plumbing.

---

## 2. Naming

Three buckets, one rule per bucket:

| Bucket | Naming rule | Examples |
|---|---|---|
| **Element-bound** | Composable name = wrapped HTML tag. One composable per tag, even if the tag plays multiple roles. | `useDialog` ↔ `<dialog>`, `useAside` ↔ `<aside>`, `useDetails` ↔ `<details>`, `useMenu` ↔ `<menu>`, `useToast` ↔ `<output>`, `useTable` ↔ `<table>`, `useForm` ↔ `<form>`, `useSelect` ↔ `<select>`, `useNav` ↔ `<nav>`, `useButton` ↔ `<button>` |
| **Attribute-bound** | Composable name = attribute API. | `usePopover` wraps `[popover]`, `useTooltip` wraps tooltip-host elements via `aria-describedby` + `[popover=hint]` |
| **Behavioral primitives** | No specific element — reusable building blocks. | `useFocus`, `useDrag`, `useDrop`, `usePointer`, `useTheme`, `useTabs` (role-based, not element-based) |

**Renames from mailbox lift:** `useModal → useDialog`, `useCollapse → useDetails`, `useDropdown → useMenu`, `useOffcanvas → useAside`, `useTab → useTabs`, `useScrollSpy → useNav`. Every Bootstrap-flavoured name renames to its element under the element-IS-component rule.

**Event names** follow `elements:{source}:{verb}`:

```ts
elements:dialog:show       // pre-transition; preventDefault aborts
elements:dialog:open       // post-transition; informational
elements:dialog:hide
elements:dialog:close
elements:aside:show        // same pattern
elements:menu:open
elements:select:select     // verb: select (single emission)
elements:toast:close
```

Lifecycle verbs come from a fixed vocabulary: `show/open/hide/close`, `start/stop`, `pause/resume`, `abort`, `destroy`, `select/deselect`, `focus/blur`. Adding a new verb means adding it to the vocabulary, not to one specific composable.

---

## 3. Open/closed lifecycle

The most subtle area of the framework. Every composable that opens and closes (popover, dialog, drawer, toast, dropdown menu) participates in a dance between three players:

1. **The UA stylesheet** — provides `display: none` for closed popovers (`[popover]:not(:popover-open)`), closed dialogs (`dialog:not([open])`), and closed details (`details:not([open]) > :not(summary)`).
2. **Author CSS** — paints chrome, sets geometry, declares transitions.
3. **The factory** — flips open-state attributes and calls native APIs (`.showPopover()`, `.showModal()`, `[open]`).

Get the interaction wrong and you ship a "ghost" — a closed element that stays rendered at the wrong position. We've hit and fixed this class four times. See [plan.md §5](./plan.md#5-recent-audits--lessons-learned) for the bug history.

### 3.1 The dual-attribute gating discipline

Every open/closed composable follows this CSS structure:

```scss
@layer composables {
  // ── Bare element rule — minimal. No display:flex, no position:fixed,
  //    no large translate. Only tokens + color/border chrome that
  //    survives the close transition.
  aside[popover] {
    /* token declarations */
  }

  // ── Open-state rule — gated on the dual attribute. Owns the drawer
  //    geometry that defeats the UA's display:none for closed popovers.
  //
  //    `[data-{name}-open]` set during open lifecycle.
  //    `[data-{name}-closing]` set during slide-out AND persists after
  //    close completes until the next show() or destroy(). This keeps
  //    the geometry alive through the popover surface's
  //    `transition-behavior: allow-discrete` window (~150 ms after
  //    `hidePopover()` before display:none lands), preventing a ghost
  //    flash at the popover-surface default position.
  aside[popover][data-aside-open],
  aside[popover][data-aside-closing] {
    position: fixed !important;
    display: flex;
    inset-block: 0 !important;
    block-size: 100dvh !important;
    /* ... */
  }

  // ── @starting-style targets a selector ONE specificity step below
  //    the open-state rule. Works around Chrome 148+ cascade-tier
  //    leakage where matching-specificity starting-style declarations
  //    can win over the open-state rule.
  @starting-style {
    aside[popover].start {
      transform: translateX(-100%);
      opacity: 1;
    }
  }
}
```

The factory's responsibilities mirror the CSS:

```ts
const show = (): void => {
  if (visible.value) return
  // ...
  element.removeAttribute('data-aside-closing')  // clear lingering
  element.setAttribute('data-aside-open', '')
  if (!element.matches(':popover-open')) element.showPopover()
}

const hide = (): void => {
  if (!visible.value) return
  // ...
  element.removeAttribute('data-aside-open')
  element.setAttribute('data-aside-closing', '')  // sync — slide starts

  transition = runTransition(element, () => {
    if (element.matches(':popover-open')) element.hidePopover()
    // INTENTIONALLY DO NOT remove `data-aside-closing` here.
    // Keep it set until next show() or destroy() so the geometry
    // block stays alive through the popover surface's discrete-
    // transition tail. Removing it synchronously flips the cascade
    // to surface defaults (position:absolute, max-block-size:18rem),
    // producing a ghost flash at top-left for ~150 ms.
  })
}
```

### 3.2 The four invariants

1. **Bare element rule is minimal** — no `display: flex`, no `position: fixed`, no large `translate`. Only tokens, color, border, font-size, padding that survives the close.

2. **Open-state rule gates on the dual attribute** — `[data-{name}-open], [data-{name}-closing]` (or `:popover-open` / `:modal` / `[open]` for cases without a custom attribute). Owns geometry.

3. **Closing-state attribute persists** — `hide()` sets it; the runTransition callback does NOT remove it after `hidePopover()`. Next `show()` removes it; `destroy()` removes it as part of teardown.

4. **`@starting-style` targets a lower-specificity selector** — typically the bare element-with-placement selector (`aside[popover].start`), NOT the open-state selector. Avoids the Chrome 148+ bleed-through bug. The element still matches the bare selector at the transition's first frame so `@starting-style` resolves its from-state values.

### 3.3 Composables that follow this pattern

| Composable | Open-state selectors | Closing attribute | Notes |
|---|---|---|---|
| `useAside` | `aside[popover][data-aside-open]`, `aside[popover][data-aside-closing]` | `data-aside-closing` (persistent) | Reference implementation. See `composables/_aside.scss` + `factories/createAside.ts`. |
| `useToast` | `output[popover]:popover-open` | (uses native popover lifecycle) | Layout (`display: flex`) gates on `:popover-open`; chrome (background/padding/border) stays unconditional. Deck rules also gated on `:popover-open`. |
| `useDialog` | `dialog:modal`, `dialog.scrollable[open]` | (uses native `[open]` lifecycle) | `:modal` covers centered modal; `[open]` covers non-modal. Size modifiers (`.scrollable`) MUST gate `display` on `[open]`. |
| `useMenu` / `useSelect` | `menu[popover]:popover-open`, `[popover]:popover-open menu` | (uses native popover lifecycle) | Popover-mode `<menu>` only flips to flex-column-list while open. |
| `usePopover` | `[popover]:popover-open` (surface-layer rule) | (uses native popover lifecycle) | The popover surface itself owns the open-state rule. |
| `useDetails` | `details[open]` | (uses native `[open]` lifecycle) | The `::details-content` pseudo gates animation on `[open]`. |

### 3.4 Other gotchas

- **Tailwind layout utilities on `[popover]` elements** — adding `.flex` / `.grid` / `.block` to a `<menu popover>` or `<output popover>` defeats the UA's `display: none` for closed popovers. Wrap the content in a child div instead, or use the framework's component-layer rules which gate display on `:popover-open`. Documented as a gotcha in [surfaces.md §6.1](./surfaces.md#61-gotcha--tailwind-layout-utilities-on-popover-elements).
- **`hidePopover()` doesn't fire `transitionend`** if no transitioning property changes. `runTransition` falls back to a `TRANSITION_FALLBACK_MS` (400 ms) timeout. For composables that need deterministic close-completion timing, transition `opacity` (always changes) rather than `transform` alone.
- **`inert` instead of `aria-hidden`** for closed-state. Setting `aria-hidden="true"` while a descendant still has focus triggers a Chrome console warning; `inert` is the W3C-recommended alternative (blurs descendants, removes from a11y tree, blocks pointer events). `createAside` does this.

---

## 4. Anatomy of a composable

The canonical layout. Every composable's factory follows this section order; the composable mirrors it (omitting empty sections).

```ts
// factories/createDialog.ts
import type { CreateDialogInstance, CreateDialogOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DIALOG_EVENTS } from '../constants.js'
import {
  assertElement, attachListeners, bindEventMap, dispatch, emit,
  lockBodyScroll, runTransition, unlockBodyScroll,
} from '../helpers.js'

export function createDialog(
  element: HTMLDialogElement,
  options: CreateDialogOptions = {},
): CreateDialogInstance {
  // === Options — resolve defaults
  assertElement<HTMLDialogElement>(element, 'dialog', 'createDialog')
  const backdropMode = options.dismiss?.backdrop ?? true
  const escape = options.dismiss?.escape ?? true
  const modal = options.modal ?? true

  // === State — reactive scope owns refs for cleanup
  const scope = effectScope()
  const visible = scope.run(() => ref(element.open))
  if (!visible) throw new Error('createDialog: failed to initialize')

  // === Helpers — cancellation, attribute writers, native-event bridges
  let transition: (() => void) | null = null
  const cancelTransition = (): void => { transition?.(); transition = null }

  // === Actions — public surface
  const show = (): void => { /* ... */ }
  const hide = (): void => { /* ... */ }
  const toggle = (): void => visible.value ? hide() : show()

  // === Handlers — DOM event listeners
  const onCancel = (event: Event): void => { /* ... */ }
  const onClick = (event: Event): void => { /* ... */ }

  // === Setup — register listeners, set initial ARIA
  const offBound = bindEventMap(element, DIALOG_EVENTS, options.on)
  const offNative = attachListeners(element, [
    { name: 'cancel', handler: onCancel },
    { name: 'click', handler: onClick },
  ])

  // === Return — exposed surface + destroy()
  let destroyed = false
  const destroy = (): void => {
    if (destroyed) return
    destroyed = true
    offBound()
    offNative()
    cancelTransition()
    scope.stop()
    /* clear attributes, release locks */
  }

  return { visible: readonly(visible), show, hide, toggle, destroy }
}
```

The Vue adapter:

```ts
// composables/useDialog.ts
import { onScopeDispose, watchEffect } from 'vue'
import { createDialog } from '../factories/createDialog.js'

export function useDialog(
  host: Ref<HTMLDialogElement | null>,
  options: UseDialogOptions = {},
): UseDialogReturn {
  let instance: CreateDialogInstance | null = null

  watchEffect((onCleanup) => {
    const el = host.value
    if (!el) return
    instance = createDialog(el, options)
    onCleanup(() => { instance?.destroy(); instance = null })
  }, { flush: 'post' })

  onScopeDispose(() => { instance?.destroy(); instance = null })

  return {
    get visible() { return instance?.visible ?? readonly(ref(false)) },
    show: () => instance?.show(),
    hide: () => instance?.hide(),
    toggle: () => instance?.toggle(),
  }
}
```

**Conventions enforced:**

- `assertElement<T>(host, tag)` rejects mismatched tags at construction time. A `<div>` masquerading as `<dialog>` throws.
- Listener registration via `attachListeners` returns a single off-function for cleanup.
- Event emission via `dispatch` (cancellable) or `emit` (informational).
- `destroy()` is idempotent — calling it twice is safe.
- Reactive state wrapped in `readonly()` before returning so consumers can't write the ref directly.

---

## 5. Per-composable reference

21 composables shipped today. Each has a paired showcase page under [`app/browser/pages/Use*Page.vue`](../app/browser/pages/) and tests under `tests/src/browser/{composables,factories}/`.

### Element-bound

| Composable | Host element | Owns | Key options | Events |
|---|---|---|---|---|
| `useDialog` | `<dialog>` | Show/showModal/close lifecycle, Escape dismiss, backdrop-click dismiss, scroll lock for non-modal. | `modal`, `dismiss.backdrop` (`true`/`false`/`'static'`), `dismiss.escape`, `scroll.lock` | `show`, `open`, `hide`, `close`, `prevent` |
| `useAside` | `<aside popover="manual">` | Drawer slide-in lifecycle, top-layer rendering, scroll lock, Escape + backdrop dismiss, dual-attribute gating ([§3](#3-openclosed-lifecycle)). | `dismiss.backdrop` (`true`/`false`/`'static'`), `dismiss.escape`, `scroll.lock` | `show`, `open`, `hide`, `close`, `prevent` |
| `useDetails` | `<details>` | `[open]` toggle synchronous with native `toggle` event. CSS-driven height transition via `interpolate-size`. | — | `show`, `open`, `hide`, `close`, `deactivate` (group mode) |
| `useMenu` | `<menu popover>` + toggle `<button>` | Dropdown lifecycle, arrow-key roving, Home/End, click-outside dismiss, anchor positioning. | `placement`, `offset`, `flip`, `dismiss.outside`, `dismiss.escape`, `dismiss.inside` | `show`, `open`, `hide`, `close` |
| `useSelect` | `<menu>` listbox + toggle/input | Listbox + combobox + multi-select + autocomplete. Wraps `createMenu`. Filter via substring + `[data-hidden]` marker. | `menu`, `input`, `native`, `multiple`, `autocomplete`, `placement`, `flip`, `value`, `dismiss.*` | `show`, `open`, `hide`, `close`, `select`, `clear`, `input` |
| `useToast` | `<output popover>` | Auto-hide timer, deck-stack layout, pause-on-hover, swipe-to-dismiss. Layout gated on `:popover-open`. | `delay`, `stack`, `position`, `pauseOn`, `swipe` | `show`, `open`, `hide`, `close` |
| `useTooltip` | Any element + `[popover=hint]` target | Hover + focus triggers, `role="tooltip"` wiring, anchor positioning. | `placement`, `offset`, `delay.show`, `delay.hide` | `show`, `open`, `hide`, `close`, `place` |
| `usePopover` | `[popover]` panel + invoker | Programmatic show/hide, anchor positioning, click-outside dismiss. Backbone for menu/tooltip/select. | `placement`, `offset`, `flip`, `dismiss.*` | `show`, `open`, `hide`, `close`, `place` |
| `useTabs` | `[role="tablist"]` wrapper | Arrow-key roving, `aria-selected` toggling, lazy panel mounting. | `orientation`, `activation` (`auto`/`manual`), `loop` | `show`, `open`, `hide`, `close`, `deactivate` |
| `useNav` | `<nav>` | `IntersectionObserver`-driven scroll-spy, `aria-current="location"` on active link. | `target`, `rootMargin`, `threshold` | `activate` |
| `useForm` | `<form>` | Constraint-validation pipeline, `[data-form-validated]` mirror, `aria-invalid` on controls, debounced revalidation. | `validateOn` (`submit`/`blur`/`input`), `debounce` | `change`, `formdata`, `input`, `invalid`, `reset`, `submit`, `validate` |
| `useTable` | `<table>` | Sort, paginate, multi-select, row expansion (sync or animated), column resize, focus management. | `data`, `keys`, `sort`, `paginate`, `select`, `expansion.animate`, `resize` | `change`, `focus`, `select`, `sort`, `expand`, `collapse`, `paginate` |
| `useButton` | `<button>` | Toggle state, `aria-pressed` mirror, `elements:button:toggle` event. | `pressed` (ref), `disabled` (ref) | `toggle` |
| `useAlert` | `[role="alert"]` / `[role="status"]` | Open/dismiss lifecycle via `[data-alert-open]` and `[data-alert-dismiss]`. | `dismiss` (`true`/`false`/`'static'`) | `show`, `open`, `hide`, `close` |
| `useCarousel` | `<section class="carousel">` | Slide navigation, autoplay, keyboard/touch/swipe. | `interval`, `pauseOn`, `wrap`, `swipe` | `slide`, `change`, `pause`, `resume` |

### Behavioral primitives

| Composable | Wraps | Owns |
|---|---|---|
| `useFocus` | Any container ref | Tab-trap loop with `activate()` / `deactivate()`. Used by drawer-like surfaces that don't have native focus management. |
| `useDrag` | `[data-index]` rows | HTML5 drag-source pipeline. Emits `tap` / `start` / `over` / `drop` / `end` / `reorder`. |
| `useDrop` | Drop-target container | Drop-zone with `relatedTarget`-aware `over` tracking. Pairs with `useDrag`. |
| `usePointer` | Any element | `pointerdown → pointermove* → pointerup` multiplex with body cursor lock. Foundation for splitter / slider. |
| `useTheme` | Document root | Singleton theme controller — `data-theme` + `data-core` attributes; `prefers-color-scheme` follow. |

**Note on `useReducedMotion`:** intentionally NOT shipped. Tailwind v4 exposes the media query as a class variant, and the framework's `transition` mixin honors `@media (prefers-reduced-motion: reduce)` directly. A composable would be redundant.

---

## 6. Contributing

### A. Align before any code

1. **Read [plan.md §2 invariants](./plan.md#2-invariants--must-respect).** The dual-attribute gating discipline is non-negotiable for any open/closed composable.
2. **Read the closest sibling.** New floating panel? Read `usePopover`. New form control? Read `useForm`. The closest sibling is the template you adapt — don't invent shape.
3. **Brainstorm with the user.** API shape is the most expensive thing to change later — invoke `superpowers:brainstorming` before writing types.

### B. Types-first

4. **Edit `src/browser/types.ts` first.** Add `{Entity}EventMap`, `Create{Entity}Elements` (if multi-element), `Create{Entity}Options`, `Create{Entity}Instance`, `Use{Entity}Options`, `Use{Entity}Return` — in that order. Every property `readonly`.
5. **Add constants to `src/browser/constants.ts`.** Event-name map (`{ENTITY}_EVENTS`), state-attribute strings, selector strings, default timing tokens.
6. **Run `npx vue-tsc --noEmit`** to lock the contract before implementation.

### C. Implement

7. **Factory at `src/browser/factories/create{Entity}.ts`.** Imports from `@vue/reactivity` (not `vue`). Section banners in the order shown in [§4](#4-anatomy-of-a-composable). Owns `destroy()`; idempotent. No DOM creation. No presentation decisions.
8. **Composable at `src/browser/composables/use{Entity}.ts`.** Vue adapter — `watchEffect({ flush: 'post' })` to bind refs, wraps factory output in `readonly()`. Same section banners (omit when empty).
9. **Add to barrels.** `src/browser/factories/index.ts` + `src/browser/index.ts`.
10. **Component partial when chrome is needed.** `src/styles/composables/_{entity}.scss`, wrapped in `@layer composables`. Gate any `display`/`position`/large-`transform` rules on the open-state selector ([§3.2](#32-the-four-invariants)). Add `@use '{entity}'` in the right `index.scss` section.

### D. Test

11. **Add fixtures to `tests/setupBrowser.ts`.** Element factory + child appenders + any custom event helpers. Centralise.
12. **Factory tests at `tests/src/browser/factories/create{Entity}.test.ts`.** Cover: construction & ARIA wiring · open/close lifecycle · every action · every event · cancellation via `preventDefault` · `destroy()` idempotence · `assertCleanDispose` (listeners + observers + timers all reverse).
13. **Composable tests at `tests/src/browser/composables/use{Entity}.test.ts`.** Mirror the factory's coverage. Add reactive-option tests if the composable accepts `Ref` props.
14. **Run targeted tests** — `npx vitest run tests/src/browser/factories/create{Entity}.test.ts tests/src/browser/composables/use{Entity}.test.ts`.

### E. Showcase

15. **Add `app/browser/pages/Use{Entity}Page.vue`** demonstrating each option, the event sequence, and visual states. Wire through the `Composables` group in `router.ts`.

### F. Document

16. **Update this file's [§5 per-composable reference](#5-per-composable-reference)** with the new row.
17. **Update [plan.md §1 composables list](./plan.md#1-where-we-are)** if the count changes.
18. **If the composable hits a new bug class**, add a §5 entry to plan.md so it shapes future invariants.

---

## 7. Cross-references

- [plan.md §2](./plan.md#2-invariants--must-respect) — the four invariants every composable obeys.
- [plan.md §5](./plan.md#5-recent-audits--lessons-learned) — bug-class history that shaped §3 of this doc.
- [components.md](./components.md) — component partials. Static chrome lives in `components/`; composable-attached chrome lives in `composables/`.
- [elements.md](./elements.md) — element baselines composables wrap.
- [surfaces.md](./surfaces.md) — `[popover]` + anchor positioning, the surfaces every floating composable depends on.
- [styles.md](./styles.md) — top-level architecture.
