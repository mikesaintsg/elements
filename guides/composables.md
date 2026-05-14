# Composables

> Vue 3 composables that wrap native HTML element behaviour. Single-word public API. Every composable has a paired framework-agnostic factory under [`src/browser/factories/`](../src/browser/factories/) — drop the Vue adapter and call `createDialog(el, opts)` directly from any framework or vanilla JS.

A **composable** owns state (open/closed, active/inactive, transitions). The matching component partial owns chrome (color, layout, sizing). The element baseline owns UA-quirk resets and token chains. Three layers, each with a single responsibility.

This document covers:

1. [Factory + adapter split](#1-factory--adapter-split) — why every composable has two files.
2. [Naming](#2-naming) — element → composable → factory rules; event-name vocabulary; state-attribute scheme.
3. [Open/closed lifecycle](#3-openclosed-lifecycle) — the dual-attribute gating discipline every popover-bearing surface follows.
4. [Anatomy of a composable](#4-anatomy-of-a-composable) — the canonical body layout.
5. [Per-composable reference](#5-per-composable-reference) — host element, owns, key options, events.
6. [Contributing](#6-contributing) — checklist for adding a new composable.
7. [Cross-references](#7-cross-references).

---

## 1. Factory + adapter split

Every composable in [`src/browser/composables/`](../src/browser/composables/) is a thin Vue adapter over a framework-agnostic `create*` factory in [`src/browser/factories/`](../src/browser/factories/).

```
src/browser/
├── composables/use{Name}.ts   Vue adapter — resolves refs, watchEffect, readonly() state.
├── factories/create{Name}.ts  Framework-agnostic — imports only from @vue/reactivity.
├── helpers.ts                 Shared utilities (assertElement, runTransition, lockBodyScroll, …).
├── types.ts                   Use*Options / Use*Return / Create*Options / Create*Instance.
├── constants.ts               Event-name maps, selector strings, data-attribute markers, default timing tokens.
├── events.ts                  Event-name registry — parity-tested against constants.ts.
├── tokens.ts                  --set-* token mirror, parity-tested against styles/tokens.
├── modifiers.ts               Class-name mirror, parity-tested against styles/modifiers.
├── elements.ts                Styled-tag mirror, parity-tested against styles/elements.
└── index.ts                   Public barrel.
```

**Why the split:**

- The factory is the logic. It owns DOM listeners, attribute lifecycle, ARIA wiring, event emission, and `destroy()`. It imports only from `@vue/reactivity`, so it works in any framework or in vanilla JS.
- The composable is the Vue adapter. It resolves `Ref<HTMLElement | null>`, watches for ref changes via `watchEffect({ flush: 'post' })`, and wraps the factory's reactive state in `readonly()` before returning. Most composables are 20–40 lines.
- Both layers carry their own tests. Factory tests use real DOM through `mountSetup` + `withElement`. Composable tests mount via Vue test utilities.

**Authoring rule:** put logic in the factory. The composable is plumbing.

---

## 2. Naming

Three buckets, one rule per bucket:

| Bucket                     | Rule                                                                                              | Examples                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Element-bound**          | Composable name = wrapped HTML tag. One composable per tag, even if the tag plays multiple roles. | `useDialog` ↔ `<dialog>`, `useAside` ↔ `<aside>`, `useDetails` ↔ `<details>`, `useMenu` ↔ `<menu>`, `useToast` ↔ `<output>`, `useTable` ↔ `<table>`, `useForm` ↔ `<form>`, `useSelect` ↔ `<select>`, `useNav` ↔ `<nav>`, `useButton` ↔ `<button>` |
| **Attribute-bound**        | Composable name = attribute API.                                                                  | `usePopover` wraps `[popover]`. `useTooltip` wraps tooltip-host elements via `aria-describedby` + `[popover=hint]`.                                                                                                                               |
| **Behavioural primitives** | No specific element — reusable building blocks.                                                   | `useFocus`, `useDrag`, `useDrop`, `usePointer`, `useTheme`, `useTabs` (role-based, not tag-bound).                                                                                                                                                |

### Event names

Every event follows `elements:{source}:{verb}`:

```ts
elements: dialog: show // pre-transition; preventDefault aborts
elements: dialog: open // post-transition; informational
elements: dialog: hide // pre-transition; preventDefault aborts
elements: dialog: close // post-transition; informational
elements: aside: show // same shape for every open/close composable
elements: menu: open
elements: select: select // single-emission verb
elements: toast: close
```

Verbs come from a fixed vocabulary: `show / open / hide / close`, `start / stop`, `pause / resume`, `abort`, `destroy`, `select / deselect`, `focus / blur`. Adding a new verb means extending the vocabulary, not bolting one onto a single composable.

The `{source}` segment uses the **element name** when the composable binds to one (`dialog`, `details`, `popover`, `select`, `aside`, `menu`, `nav`, `table`) and the **composable noun** otherwise (`drag`, `theme`, `pointer`, `combo`).

### State attributes

Every state attribute follows `data-{name}-{state}`:

```
data-aside-open          data-aside-closing
data-toast-stack-closing data-toast-hidden-count
data-table-expanded      data-table-resizing
data-form-validated      data-alert-open
```

Open-state markers (`data-{name}-open`) flip on at the start of `show()`. Closing-state markers (`data-{name}-closing`) flip on at the start of `hide()` and persist through the close transition — see §3.

---

## 3. Open/closed lifecycle

The most subtle area of the framework. Every composable that opens and closes (popover, dialog, drawer, toast, dropdown menu) participates in a dance between three players:

1. **The UA stylesheet** provides `display: none` for closed popovers (`[popover]:not(:popover-open)`), closed dialogs (`dialog:not([open])`), and closed details (`details:not([open]) > :not(summary)`).
2. **Author CSS** paints chrome, sets geometry, declares transitions.
3. **The factory** flips open-state attributes and calls native APIs (`.showPopover()`, `.showModal()`, `[open]`).

Get the interaction wrong and you ship a "ghost" — a closed element that stays rendered at the wrong position. The dual-attribute gating discipline below prevents the entire bug class.

### 3.1 The CSS structure

Every open/close composable's component partial follows this layout:

```scss
@layer composables {
	// ── Bare element rule — minimal. No display: flex, no position: fixed,
	//    no large translate. Only tokens + color / border / font chrome
	//    that survives the close transition.
	aside[popover] {
		/* token declarations + color, border, padding */
	}

	// ── Open-state rule — gated on the dual attribute. Owns the drawer
	//    geometry that defeats the UA's display: none for closed popovers.
	//
	//    [data-aside-open]    set during open lifecycle, removed in hide().
	//    [data-aside-closing] set during slide-out AND persists after close
	//                         completes until the next show() or destroy().
	//                         Keeps geometry alive through the popover
	//                         surface's transition-behavior: allow-discrete
	//                         tail (~150 ms after hidePopover() before
	//                         display: none lands), preventing a ghost
	//                         flash at the popover-surface default position.
	aside[popover][data-aside-open],
	aside[popover][data-aside-closing] {
		position: fixed !important;
		display: flex;
		inset-block: 0 !important;
		block-size: 100dvh !important;
		/* drawer geometry */
	}

	// ── @starting-style targets a selector ONE specificity step BELOW the
	//    open-state rule. Works around Chrome 148+ cascade-tier leakage
	//    where matching-specificity starting-style declarations can win
	//    over the open-state rule.
	@starting-style {
		aside[popover].start {
			transform: translateX(-100%);
			opacity: 1;
		}
	}
}
```

### 3.2 The factory structure

The factory's lifecycle mirrors the CSS:

```ts
const show = (): void => {
	if (visible.value) return
	// clear any lingering closing flag before re-opening
	element.removeAttribute('data-aside-closing')
	element.setAttribute('data-aside-open', '')
	if (!element.matches(':popover-open')) element.showPopover()
}

const hide = (): void => {
	if (!visible.value) return
	element.removeAttribute('data-aside-open')
	element.setAttribute('data-aside-closing', '') // synchronous — slide begins

	transition = runTransition(element, () => {
		if (element.matches(':popover-open')) element.hidePopover()
		// INTENTIONALLY DO NOT remove data-aside-closing here.
		// Keep it set until next show() or destroy() so the geometry
		// block stays alive through the popover surface's discrete-
		// transition tail. Removing it synchronously flips the cascade
		// to surface defaults (position: absolute, max-block-size: 18rem),
		// producing a ghost flash at top-left for ~150 ms.
	})
}
```

### 3.3 The four invariants

1. **Bare element rule is minimal.** No `display: flex`, no `position: fixed`, no large `translate`. Only tokens, color, border, font-size, padding — anything that survives the close.
2. **Open-state rule gates on the dual attribute.** `[data-{name}-open], [data-{name}-closing]` — or `:popover-open` / `:modal` / `[open]` for cases that use the native lifecycle directly. Owns geometry.
3. **Closing-state attribute persists.** `hide()` sets it; the `runTransition` callback does NOT remove it after `hidePopover()`. The next `show()` removes it; `destroy()` removes it as part of teardown.
4. **`@starting-style` targets a lower-specificity selector.** Typically the bare element-with-placement selector (`aside[popover].start`), NOT the open-state selector. Avoids the Chrome 148+ cascade-tier leakage. The element still matches the bare selector at the transition's first frame, so `@starting-style` resolves its from-state values.

### 3.4 Composables that follow this pattern

| Composable              | Open-state selectors                                        | Closing attribute           | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAside`              | `aside[popover]:popover-open`                               | (native popover lifecycle)  | After the `createAside` strip the factory is a thin shim; the slide-in / out + scrim are entirely platform-driven via `:popover-open` + `@starting-style` + `transition-behavior: allow-discrete`. No JS-side `[data-aside-*]` lifecycle attrs anymore.                                                                                                                                                           |
| `useToast`              | `output[popover]:popover-open`                              | (native popover lifecycle)  | Layout (`display: flex`) gates on `:popover-open`; chrome (background / padding / border) stays unconditional. Deck rules gate on `:popover-open`. Banded header / footer chrome (`:has(> :is(header, footer))`) ALSO gates on `:popover-open` so `align-items: stretch` outranks the open-state `align-items: center` (otherwise the negative-margin bleed only shifts position rather than extending the band). |
| `useDialog`             | `dialog:modal`, `dialog.scrollable[open]`                   | (native `[open]` lifecycle) | `:modal` covers centered modal; `[open]` covers non-modal. Size modifiers (`.scrollable`) MUST gate `display` on `[open]`.                                                                                                                                                                                                                                                                                        |
| `useMenu` / `useSelect` | `menu[popover]:popover-open`, `[popover]:popover-open menu` | (native popover lifecycle)  | Popover-mode `<menu>` only flips to flex-column-list while open.                                                                                                                                                                                                                                                                                                                                                  |
| `usePopover`            | `[popover]:popover-open` (surface-layer rule)               | (native popover lifecycle)  | The popover surface itself owns the open-state rule.                                                                                                                                                                                                                                                                                                                                                              |
| `useDetails`            | `details[open]`                                             | (native `[open]` lifecycle) | The `::details-content` pseudo gates animation on `[open]`.                                                                                                                                                                                                                                                                                                                                                       |

### 3.5 Gotchas

- **Tailwind layout utilities on `[popover]` elements.** Adding `.flex` / `.grid` / `.block` to a `<menu popover>` or `<output popover>` defeats the UA's `display: none` for closed popovers. Wrap the content in a child div instead, or use the framework's component-layer rules which gate `display` on `:popover-open`. See [surfaces.md §6.1](./surfaces.md#61-gotcha--tailwind-layout-utilities-on-popover-elements).
- **`hidePopover()` doesn't fire `transitionend`** if no transitioning property changes. `runTransition` falls back to a `TRANSITION_FALLBACK_MS` (400 ms) timeout. For composables that need deterministic close-completion timing, transition `opacity` (always changes) rather than `transform` alone.
- **Use `inert`, not `aria-hidden`, for closed state.** Setting `aria-hidden="true"` while a descendant still has focus triggers a Chrome console warning. `inert` is the W3C-recommended alternative — it blurs descendants, removes them from the a11y tree, and blocks pointer events. `createAside` uses `inert`.

---

## 4. Anatomy of a composable

Every factory follows this section order; the composable mirrors it, omitting empty sections.

```ts
// factories/createDialog.ts
import type { CreateDialogInstance, CreateDialogOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DIALOG_EVENTS } from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	lockBodyScroll,
	runTransition,
	unlockBodyScroll,
} from '../helpers.js'

export function createDialog(
	element: HTMLDialogElement,
	options: CreateDialogOptions = {},
): CreateDialogInstance {
	// === Options — resolve defaults
	assertElement<HTMLDialogElement>(element, 'dialog', 'createDialog')
	const backdrop = options.dismiss?.backdrop ?? true
	const escape = options.dismiss?.escape ?? true
	const modal = options.modal ?? true

	// === State — reactive scope owns refs for cleanup
	const scope = effectScope()
	const visible = scope.run(() => ref(element.open))!

	// === Helpers — cancellation, attribute writers, native-event bridges
	let transition: (() => void) | null = null
	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}

	// === Actions — public surface
	const show = (): void => {
		/* ... */
	}
	const hide = (): void => {
		/* ... */
	}
	const toggle = (): void => (visible.value ? hide() : show())

	// === Handlers — DOM event listeners
	const onCancel = (event: Event): void => {
		/* ... */
	}
	const onClick = (event: Event): void => {
		/* ... */
	}

	// === Setup — register listeners, set initial ARIA
	const offBound = bindEventMap(element, DIALOG_EVENTS, options.on)
	const offNative = attachListeners(element, [
		{ name: 'cancel', handler: onCancel },
		{ name: 'click', handler: onClick },
	])

	// === Return — exposed surface + idempotent destroy
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

	watchEffect(
		(onCleanup) => {
			const el = host.value
			if (!el) return
			instance = createDialog(el, options)
			onCleanup(() => {
				instance?.destroy()
				instance = null
			})
		},
		{ flush: 'post' },
	)

	onScopeDispose(() => {
		instance?.destroy()
		instance = null
	})

	return {
		get visible() {
			return instance?.visible ?? readonly(ref(false))
		},
		show: () => instance?.show(),
		hide: () => instance?.hide(),
		toggle: () => instance?.toggle(),
	}
}
```

**Conventions:**

- `assertElement<T>(host, tag, caller)` rejects mismatched tags at construction. A `<div>` masquerading as `<dialog>` throws.
- Listener registration via `attachListeners` returns a single off-function for cleanup.
- Event emission via `dispatch` (cancellable; honours `preventDefault`) or `emit` (informational).
- `destroy()` is idempotent — calling it twice is safe.
- Reactive state is wrapped in `readonly()` before return, so consumers can't write the ref directly.

---

## 5. Per-composable reference

Twenty composables ship today. Each has a paired showcase page under [`app/browser/pages/Use*Page.vue`](../app/browser/pages/) and tests under `tests/src/browser/{composables,factories}/`.

### Element-bound

| Composable    | Host element                         | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Key options                                                                                                                                                                                                                                  | Events                                                                  |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `useDialog`   | `<dialog>`                           | `showModal` / `show` / `close` lifecycle, Escape dismiss, backdrop-click dismiss, scroll lock for non-modal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `modal`, `dismiss.backdrop` (`true` / `false` / `'static'`), `dismiss.escape`, `scroll.lock`                                                                                                                                                 | `show`, `open`, `hide`, `close`, `prevent`                              |
| `useAside`    | `<aside popover>`                    | Programmatic shim over the native Popover API: `showPopover` / `hidePopover` / `togglePopover`, native `beforetoggle` / `toggle` event bridge, optional `popover` mode toggle. Light-dismiss, top-layer rendering, slide animation, and `::backdrop` scrim are all platform-driven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `popover` (`'auto'` / `'manual'` / `false`)                                                                                                                                                                                                  | `show`, `open`, `hide`, `close`                                         |
| `useDetails`  | `<details>`                          | `[open]` toggle synchronous with the native `toggle` event; CSS height transition via `interpolate-size`; optional accordion grouping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `group`                                                                                                                                                                                                                                      | `show`, `open`, `hide`, `close`, `deactivate`                           |
| `useMenu`     | `<menu popover>` + toggle `<button>` | Dropdown lifecycle, arrow-key roving, Home/End, click-outside dismiss, anchor positioning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `placement`, `offset`, `flip`, `dismiss.outside`, `dismiss.escape`, `dismiss.inside`                                                                                                                                                         | `show`, `open`, `hide`, `close`                                         |
| `useSelect`   | `<menu>` listbox + toggle / input    | Listbox + combobox + multi-select + autocomplete. Wraps `createMenu`. Substring filter via `[data-hidden]` marker on rejected options (consumed by `[data-hidden] { display: none }` in `composables/_select.scss`). Autocomplete mode treats the typed query AS the committed value — the dropdown stays open even when the filter rejects every option, and a `:has()`-driven empty-state hint (`--set-select-empty-text`, default `"No matches"`) paints the appropriate "filter found nothing" feedback. Enter on a no-match closes the dropdown (typed value already in `.value`). IME composition guard (`compositionstart` / `compositionend` listeners) defers filtering until multi-keystroke input methods (Chinese / Japanese / Korean, dead-key sequences) commit their string so the row set doesn't thrash mid-composition. Native `<select>` / `<input>` mirror writes the value on every commit + dispatches `change` for form-data participation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `menu`, `input`, `native`, `multiple`, `autocomplete`, `placement`, `flip`, `value`, `dismiss.*`                                                                                                                                             | `show`, `open`, `hide`, `close`, `select`, `clear`, `input`             |
| `useToast`    | `<output popover>`                   | Auto-hide timer, deck-stack layout (`[data-toast-stack]` opt-in with depth-clamp + hidden-count indicator), pause-on-hover / pause-on-focus, swipe-to-dismiss ("touch the bounds, dismiss" — composes `createPointer` to write `--set-toast-swipe-offset` per frame which `_toast.scss` consumes via the standalone `translate` property so it composes with the deck's `transform: translateY()`; visual translate capped at `--set-toast-swipe-threshold` and auto-commits dismiss the moment the bound is reached, parallel to UsePointerPage Demo 4's `clear()`-at-max-extent idiom; below-bound release snaps back via motion-contract transition; mobile contract via `touch-action: pan-y` declared on the toast at REST so the browser routes horizontal gestures to JS instead of claiming them for page-pan or swipe-back; `accept` rejects pointer-down on all interactive descendants — `a, button, input, textarea, select, [role="button"]` — so clicks survive), all four placement corners (`.start` / `.end` / `.top` / `.bottom`), banded header / footer chrome via negative-margin bleed (`<dialog>`-style; toast root keeps padding, bands escape via `margin-inline: calc(padding * -1)`), `@media (max-width: 480px)` retune for nearly-edge-to-edge mobile centring (paired with `scrollbar-gutter: auto` on `html, body` so fixed-position descendants anchor against the actual viewport, not html's content area), bulletproof Sonner-deck hover bridges (paired `::before` + `::after` per card, sized `--set-toast-spacing × 2` to absorb sub-pixel drift between expanded cards' natural heights). Layout gated on `:popover-open`.                                                                                                                                           | `autohide` (`false \| { delay?: number }`), `swipe` (`false \| { threshold?: number }`)                                                                                                                                                      | `show`, `open`, `hide`, `close`                                         |
| `useTabs`     | `[role="tablist"]` wrapper           | Arrow-key roving, `aria-selected` toggling, lazy panel mounting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `orientation`, `activation` (`auto` / `manual`), `loop`                                                                                                                                                                                      | `show`, `open`, `hide`, `close`, `deactivate`                           |
| `useNav`      | `<nav>`                              | `IntersectionObserver`-driven scroll-spy; `aria-current="location"` on the active link.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `target`, `rootMargin`, `threshold`                                                                                                                                                                                                          | `activate`                                                              |
| `useForm`     | `<form>`                             | Native constraint-validation pipeline, `[data-form-validated]` mirror after first attempt (Bootstrap `.was-validated` parity), `aria-invalid="true"`/`"false"` mirror on every validatable field, reactive `data` / `dirty` / `touched` / `valid` / `validated` refs, per-field `validity.errors` for summary regions, `validity.mark(name, message)` for custom / cross-field / server-side rules, `fields.{focus,enable,disable}` for imperative control. `reset()` vs `clear()` distinction — `reset()` calls native `form.reset()` (values + flags); `clear()` only strips the flag attrs (values preserved). Captures `invalid` events (`useCapture: true`) because the native `invalid` event doesn't bubble. Cancellable `elements:form:submit` dispatched with `{ data, errors, valid }` detail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `submit.invalid` (allow submit when invalid), `validate.input` (live-as-you-type), `validate.mount`, `validate.submit` (default `true`), `on.*`                                                                                              | `change`, `formdata`, `input`, `invalid`, `reset`, `submit`, `validate` |
| `useTable`    | `<table>`                            | Sort (single + shift-multi-column with `aria-sort` mirror), paginate (rows-per-page or rendered-page baseline; `Ref<number>` size; `aria-rowcount` / `aria-rowindex` parity via `total` + `offset` options; consumer UI uses framework's `<nav aria-label="Pagination">` chrome from `components/_nav.scss` — density-aligned with table via `--set-nav-pagination-font-size` defaulting to `var(--text-sm)`), multi-select (shift / ctrl / cmd / outside-click clear; `[data-no-select]` opt-out target), inline cell editing (consumer-driven via the `.flat` / `.flush` modifier pair in `modifiers/_local.scss`: `.flat` for transparent-rest + focus-promote-to-bordered-baseline; `.flush` for host-owns-the-boundary + element fills the cell on both axes), row expansion (CSS-driven via `tr[data-table-expanded] + tr > td > [data-table-expansion-panel]` using `interpolate-size: allow-keywords` + motion-contract tokens; the factory flips `[data-table-expanded]` and `[inert]` on the panel — no JS height tween; expandable rows get a chevron `::before` that rotates 90° on `[data-table-expanded]` via the `--set-table-expansion-icon{,-size,-gap}` token surface; `expansion.click: true \| 'row' \| 'caret' \| false` wires row-click → toggle), column resize via pointer-capture handles (`[data-table-resizing]` marker), APG roving-tabindex focus model (arrow / Home / End / Tab; optional wrap; `<table>` focus seeds the first cell so keyboard nav has a starting cursor). Sticky header chrome is element-layer (`table.sticky` modifier in `elements/_table.scss`, opaque backdrop), not composable. `<table role='grid'>` is excluded from the universal `:focus-visible` ring in `surfaces/_focus.scss` — the table is the focus anchor, cells are the visible target. | `caption`, `headers`, `rows`, `footer`, `columns`, `value`, `offset`, `total`, `sort.*`, `pagination.size`, `expansion.{multiple, initial, click}`, `selection.{strategy, selectable, click}`, `resize.{min, max}`, `focus.{keyboard, wrap}` | `change`, `focus`, `select`, `sort`, `expand`, `collapse`, `paginate`   |
| `useButton`   | `<button>`                           | Toggle state, `aria-pressed` mirror.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `pressed` (ref), `disabled` (ref)                                                                                                                                                                                                            | `toggle`                                                                |
| `useAlert`    | `[role="alert"]` / `[role="status"]` | Open / dismiss lifecycle via `[data-alert-open]` and `[data-alert-dismiss]` trigger.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `dismiss` (`true` / `false` / `'static'`)                                                                                                                                                                                                    | `show`, `open`, `hide`, `close`                                         |
| `useCarousel` | `<section class="carousel">`         | Slide navigation, autoplay, keyboard / touch / swipe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `interval`, `pauseOn`, `wrap`, `swipe`                                                                                                                                                                                                       | `slide`, `change`, `pause`, `resume`                                    |

### Attribute-bound

| Composable   | Host                                  | Owns                                                                                                       | Key options                                       | Events                                   |
| ------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| `usePopover` | `[popover]` panel + invoker           | Programmatic show / hide, anchor positioning, click-outside dismiss. Backbone for menu / tooltip / select. | `placement`, `offset`, `flip`, `dismiss.*`        | `show`, `open`, `hide`, `close`, `place` |
| `useTooltip` | Any element + `[popover=hint]` target | Hover + focus triggers, `role="tooltip"` wiring, anchor positioning, delay control.                        | `placement`, `offset`, `delay.show`, `delay.hide` | `show`, `open`, `hide`, `close`, `place` |

### Behavioural primitives

| Composable   | Wraps                 | Owns                                                                                                                                                                      |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFocus`   | Any container ref     | Tab-trap loop with `activate()` / `deactivate()`. Used by drawer-like surfaces without native focus management.                                                           |
| `useDrag`    | `[data-index]` rows   | HTML5 drag-source pipeline. Emits `tap`, `start`, `over`, `drop`, `end`, `reorder`.                                                                                       |
| `useDrop`    | Drop-target container | Drop-zone with `relatedTarget`-aware `over` tracking. Pairs with `useDrag`.                                                                                               |
| `usePointer` | Any element           | `pointerdown → pointermove* → pointerup` multiplex with body cursor lock. Foundation for splitter / slider.                                                               |
| `useTheme`   | Document root         | Singleton theme controller — `data-theme` explicit pin OR attribute-absent (CSS-owned `prefers-color-scheme` follow). JS reactivity reserved for the resolved `mode` ref. |

**`useReducedMotion` is deliberately not shipped.** Tailwind v4 exposes the media query as a class variant, and the framework's `transition` mixin honours `@media (prefers-reduced-motion: reduce)` directly. A composable would be redundant.

---

## 6. Contributing

### A. Align before any code

1. **Read [§3](#3-openclosed-lifecycle).** The dual-attribute gating discipline is non-negotiable for any open / closed composable.
2. **Read the closest sibling.** New floating panel? Read `usePopover`. New form control? Read `useForm`. The closest sibling is the template you adapt — don't invent shape.

### B. Types-first

3. **Edit `src/browser/types.ts` first.** In this order: `{Entity}EventMap`, `Create{Entity}Elements` (if multi-element), `Create{Entity}Options`, `Create{Entity}Instance`, `Use{Entity}Options`, `Use{Entity}Return`. Every property `readonly`.
4. **Add constants to `src/browser/constants.ts`** — event-name map (`{ENTITY}_EVENTS`), state-attribute strings, selector strings, default timing tokens.
5. **Run `npx vue-tsc --noEmit`** to lock the contract before implementation.

### C. Implement

6. **Factory at `src/browser/factories/create{Entity}.ts`.** Imports from `@vue/reactivity` (not `vue`). Section banners in the order shown in [§4](#4-anatomy-of-a-composable). Owns `destroy()`; idempotent. No DOM creation. No presentation decisions.
7. **Composable at `src/browser/composables/use{Entity}.ts`.** Vue adapter — `watchEffect({ flush: 'post' })` to bind the ref, wraps factory output in `readonly()`. Same section banners (omit when empty).
8. **Add to barrels** — `src/browser/factories/index.ts` and `src/browser/index.ts`.

### D. Style partial when chrome is needed

9. **Component partial at `src/styles/composables/_{entity}.scss`,** wrapped in `@layer composables`. Gate any `display` / `position: fixed` / large-`transform` rules on the open-state selector ([§3.3](#33-the-four-invariants)). Add `@use '{entity}'` in the right `index.scss` section.

### E. Test

10. **Add fixtures to `tests/setupBrowser.ts`** — element factory + child appenders + any custom event helpers. Centralise.
11. **Factory tests at `tests/src/browser/factories/create{Entity}.test.ts`.** Cover: construction + ARIA wiring; every action; every event; `preventDefault` cancellation; `destroy()` idempotence; `assertCleanDispose` (listeners + observers + timers all reverse).
12. **Composable tests at `tests/src/browser/composables/use{Entity}.test.ts`.** Mirror the factory's coverage. Add reactive-option tests if the composable accepts `Ref` props.
13. **Run targeted tests** — `npx vitest run tests/src/browser/factories/create{Entity}.test.ts tests/src/browser/composables/use{Entity}.test.ts`.

### F. Showcase

14. **Add `app/browser/pages/Use{Entity}Page.vue`** demonstrating each option, the event sequence, and visual states. Wire through the `Composables` group in `router.ts`.

### G. Document

15. **Update [§5 per-composable reference](#5-per-composable-reference)** with the new row.

---

## 7. Cross-references

- [components.md](./components.md) — component partials. Static chrome lives in `components/`; composable-attached chrome lives in `composables/`.
- [elements.md](./elements.md) — the element baselines composables wrap.
- [surfaces.md](./surfaces.md) — `[popover]` + anchor positioning, the surfaces every floating composable depends on.
- [styles.md](./styles.md) — top-level architecture, layer ordering, partial conventions.
- [modifiers.md](./modifiers.md) — class-root mirror parity-tested against `src/browser/modifiers.ts`.
- [tokens.md](./tokens.md) — `--set-*` token mirror parity-tested against `src/browser/tokens.ts`.
- [plan.md](./plan.md) — invariants and roadmap.
