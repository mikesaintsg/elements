# Statechart-driven event-map audit

> **Status:** All findings below have been implemented. See `## Implementation summary` at the end for the per-finding landing notes + commit reference. Kept here as the design rationale for the new event surface.

Cross-checks every factory's `{SOURCE}_EVENTS` constant (in `src/browser/constants.ts`) and the public mirror in `src/browser/events.ts` against the state × event tables we landed under `tests/src/browser/factories/`. The goal is to surface where the public event surface drifts from the actual statechart vocabulary — places we already emit something but never declared it, places consumers can't observe a transition we model, and naming inconsistencies relative to the AGENTS.md §11 lifecycle verb table.

## Format

Each section per factory:

- **States** the statechart models.
- **Events** the test table fires (test-side vocabulary).
- **Emits today** — what the factory actually `dispatchEvent`s today.
- **Public surface** — what the `events.ts` tree currently exposes.
- **Gaps** — drift between the three rows above.
- **Proposed** — concrete change with rationale, or "no change" when the surface is already aligned.

---

## 1. `createButton`

- **States:** `'inactive' | 'active'`
- **Events fired in tests:** `toggle`, `click`, `destroy`
- **Emits today:** `BUTTON_EVENTS.toggle` (single verb, with `detail.active: boolean`)
- **Public surface:** `events.button.toggle`

**Gaps**

- The statechart distinguishes `inactive → active` from `active → inactive` transitions; the emitted event collapses both into one `toggle` carrying the new state in `detail.active`. Consumers wanting to react only to "becomes active" or "becomes inactive" must inspect detail.
- The lifecycle vocab table in `events.ts` documents `toggle` as the canonical "two-state flip without a separate show/hide pair (button)" — so the single-verb shape is intentional.

**Proposed:** no change. `toggle` + `detail.active` is the right surface; the statechart model is just richer than the wire event. Document this on `events.button.toggle` so consumers know the detail shape carries direction.

## 2. `createDetails`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `nativetoggle`, `deactivate`, `destroy`
- **Emits today:** `DETAILS_EVENTS.{show, open, hide, close, deactivate}`
- **Public surface:** `events.details.{show, open, hide, close, deactivate}`

**Gaps**

- `nativetoggle` (the bridge from the native `<details>` toggle event into the reactive `visible` mirror) is a test-side transition only; on the wire it still emits `open` / `close`. That's correct — the bridge is the implementation, the public verb is the lifecycle outcome.

**Proposed:** no change.

## 3. `createDialog`

- **States:** `'closed' | 'open' | 'open-nonmodal'`
- **Events fired in tests:** `show`, `hide`, `nativeclose`, `destroy`
- **Emits today:** `DIALOG_EVENTS.{show, open, hide, close, prevent}`
- **Public surface:** `events.dialog.{show, open, hide, close, prevent}`

**Gaps**

- The statechart distinguishes modal vs non-modal open states; neither dispatches a different event. Consumers reading `event.target.matches(':modal')` get that information for free, so no extra event is warranted.
- `prevent` fires on `dismiss.backdrop: 'static'` only — not modeled in the statechart table because the table covers the modal lifecycle, not the static-backdrop edge case.

**Proposed:** no change.

## 4. `createMenu`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `toggleclick`, `itemclick`, `escape`, `outside`, `destroy`
- **Emits today:** `MENU_EVENTS.{show, open, hide, close}`
- **Public surface:** `events.menu.{show, open, hide, close}`

**Gaps**

- `itemclick` is modeled as a test event because it's the dominant dismiss path, but on the wire it just rides the existing `hide` / `close` pipeline. Consumers wanting to know "did a menu item trigger this dismissal?" have no observable signal.
- `MENU_EVENTS` doesn't include a `select` verb even though menu-item clicks are the primary "selection" interaction. The `select` verb already exists in `SELECT_EVENTS` for the listbox cousin.

**Proposed:** add `MENU_EVENTS.select` emitting on the toggle when a menu item is activated, with `detail: { item: HTMLElement; value: string | null }`. This surfaces the "menu item N was chosen" affordance without piggybacking on the dismiss event. Update `events.ts` to mirror. The shape mirrors `SELECT_EVENTS.select` — single-word verb, structured detail.

## 5. `createPopover`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `toggle`, `escape`, `outside`, `hoverin`, `hoverout`, `destroy`
- **Emits today:** `POPOVER_EVENTS.{show, open, hide, close, place}`
- **Public surface:** `events.popover.{show, open, hide, close, place}`

**Gaps**

- None observed. `hoverin` / `hoverout` are trigger paths that ride `show` / `hide` on the wire; `escape` / `outside` ditto.

**Proposed:** no change.

## 6. `createAside`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `toggle`, `hidepopover`, `destroy`
- **Emits today:** `ASIDE_EVENTS.{show, open, hide, close}`
- **Public surface:** `events.aside.{show, open, hide, close}`

**Gaps**

- None observed. `hidepopover` is the platform-native bridge that rides `close` on the wire.

**Proposed:** no change.

## 7. `createToast`

- **States:** `'closed' | 'open-playing' | 'open-paused'`
- **Events fired in tests:** `show`, `hide`, `pause`, `resume`, `mouseenter`, `mouseleave`, `autohide`, `destroy`
- **Emits today:** `TOAST_EVENTS.{show, open, hide, close}`
- **Public surface:** `events.toast.{show, open, hide, close}`

**Gaps**

- The statechart's autohide-timer region (`playing` vs. `paused`) has no observable event. Consumers wiring per-toast progress bars or "pause on focus" affordances can't react to the suspension state without inspecting reactive refs.
- AGENTS.md §11 ratifies `pause` / `resume` as part of the lifecycle vocabulary. They already exist in `CAROUSEL_EVENTS`. Toast's omission is asymmetric.

**Proposed:** add `TOAST_EVENTS.pause` and `TOAST_EVENTS.resume`, emitted on the toast root when the autohide timer is suspended / restarted (programmatically, via hover bridge, or via focus). Update `events.ts` to mirror. Single-word verbs, no detail shape needed (host element identifies the toast).

## 8. `createForm`

- **States:** `'pristine' | 'dirty' | 'validated-valid' | 'validated-invalid'`
- **Events fired in tests:** `input-valid`, `input-invalid`, `check`, `clear`, `reset`, `destroy`
- **Emits today:** `FORM_EVENTS.{change, formdata, input, invalid, reset, submit, validate}`
- **Public surface:** `events.form.{change, formdata, input, invalid, reset, submit, validate}`

**Gaps**

- The statechart's `dirty` and `validated` flips happen entirely through reactive refs (`dirty.value`, `validated.value`). No event fires when the form first goes dirty or when `clear()` reverts the bookkeeping.
- Of all the factories, Form has the most events already. The omission is in the orthogonal-state-region transitions (dirty / validated flips), not in the obvious lifecycle verbs.

**Proposed:** add `FORM_EVENTS.dirty` (fired the first time the form transitions `pristine → dirty`), and re-use `clear` (already in `FORM_EVENTS`? no — only `reset`). Decision: rename the bookkeeping reset method's emitted event from `reset` to keep `reset` for the native form-reset hook, and add `FORM_EVENTS.clear` to cover the factory's `api.clear()` path. The `dirty` event surfaces the "user touched this form for the first time" signal autosave / unsaved-changes guards need. All single-word verbs.

## 9. `createTabs`

- **States:** `'inactive' | 'active'` (per trigger)
- **Events fired in tests:** `show`, `hide`, `toggle`, `click`, `destroy`
- **Emits today:** `TABS_EVENTS.{show, open, hide, close, deactivate}`
- **Public surface:** `events.tabs.{show, open, hide, close, deactivate}`

**Gaps**

- None observed. `click` rides `show` on the wire; `toggle` rides `show` / `hide`. `deactivate` is the sibling-coordination event the tests already model.

**Proposed:** no change.

## 10. `createTooltip`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `mouseenter`, `mouseleave`, `focusin`, `focusout`, `escape`, `destroy`
- **Emits today:** `TOOLTIP_EVENTS.{show, open, hide, close, place}`
- **Public surface:** `events.tooltip.{show, open, hide, close, place}`

**Gaps**

- None observed. Trigger paths (hover, focus) ride `show` / `hide` on the wire; the test events are arrange/act vocabulary, not wire events.

**Proposed:** no change.

## 11. `createSelect`

- **States:** `'closed-empty' | 'open-empty' | 'closed-single' | 'open-single'`
- **Events fired in tests:** `show`, `hide`, `select`, `clear`, `destroy`
- **Emits today:** `SELECT_EVENTS.{show, open, hide, close, select, clear, input}`
- **Public surface:** `events.select.{show, open, hide, close, select, clear, input}`

**Gaps**

- None observed. `select` and `clear` map directly to the statechart's selection-region events; `input` covers the autocomplete-filter pipeline.

**Proposed:** no change.

## 12. `createCarousel`

- **States:** `'first' | 'middle' | 'last' | 'first-cycling' | 'first-paused'` (slide × autoplay regions)
- **Events fired in tests:** `next`, `prev`, `to-last`, `start`, `stop`, `pause`, `resume`, `mouseenter`, `mouseleave`, `autohide`, `destroy`
- **Emits today:** `CAROUSEL_EVENTS.{slide, change, pause, resume}`
- **Public surface:** `events.carousel.{slide, change, pause, resume}`

**Gaps**

- The autoplay region's `start` / `stop` verbs (entering / exiting the cycling state) have no observable event. `pause` / `resume` are emitted only when the cycling timer is suspended mid-cycle (hover bridge); the initial `start()` / `stop()` calls don't fire anything.
- AGENTS.md §11 reserves `start` / `stop` for "begin or restart an operation" / "end an operation permanently". The carousel's cycling lifecycle fits this exactly.

**Proposed:** add `CAROUSEL_EVENTS.start` and `CAROUSEL_EVENTS.stop`, emitted when `api.start()` / `api.stop()` transition the cycling region. Differentiates a one-shot pause (timer suspended for hover) from a hard cycling shutdown (consumer called `stop()`). Update `events.ts` to mirror.

## 13. `createAlert`

- **States:** `'closed' | 'open'`
- **Events fired in tests:** `show`, `hide`, `dismissclick`, `destroy`
- **Emits today:** `ALERT_EVENTS.{show, open, hide, close}`
- **Public surface:** `events.alert.{show, open, hide, close}`

**Gaps**

- None observed. `dismissclick` rides `hide` / `close` on the wire.

**Proposed:** no change.

## 14. `createTheme`

- **States:** `'light' | 'dark' | 'system'`
- **Events fired in tests:** `set-light`, `set-dark`, `set-system`, `toggle`, `destroy`
- **Emits today:** `THEME_EVENTS.change` (single event for any setting flip)
- **Public surface:** `events.theme.change`

**Gaps**

- The single `change` event carries `detail: { setting, mode, name }`. Consumers can't subscribe to just "the user picked dark" without inspecting detail.
- AGENTS.md §14 explicitly says "**Never** use a generic `status` event that passes the value as a parameter — each transition is its own named event." `THEME_EVENTS.change` is exactly the generic-status pattern.

**Proposed:** **this is the largest finding.** Replace `THEME_EVENTS.change` with three verbs that mirror the state machine:

- `THEME_EVENTS.light` — fired when the resolved mode transitions to light.
- `THEME_EVENTS.dark` — fired when the resolved mode transitions to dark.
- `THEME_EVENTS.system` — fired when the setting flips back to system (and the resolved mode then follows the OS).

The current `change` event would be deprecated. This is a breaking change — consumers wiring `addEventListener('elements:theme:change', …)` would need to migrate. Confirm the impact before applying.

## 15. Non-composable / cross-cutting

### `createNav`

- **States:** `active: string | null` (which section is currently in the intersection viewport)
- **Events fired in tests:** none (observer-driven, no synthetic transitions)
- **Emits today:** `NAV_EVENTS.activate`
- **Public surface:** `events.nav.activate`

**Proposed:** no change.

### `createDrop`

- **States:** `'idle' | 'over'`
- **Events fired in tests:** `dragenter`, `dragleave`, `drop`, `dragenter-rejected`, `destroy`
- **Emits today:** nothing — the factory only exposes the `over` reactive ref and `on.{dragenter, dragover, dragleave, drop}` callback hooks
- **Public surface:** **none** — `DROP_EVENTS` does not exist

**Gaps**

- `createDrop` is the only stateful factory that emits no namespaced events. The reactive `over.value` mirror is the entire observable surface. A consumer wiring "tell me when the user dropped a payload here" can't `addEventListener('elements:drop:drop', …)`.

**Proposed:** add a `DROP_EVENTS` constant with `enter` / `leave` / `drop` verbs. Mirror into `events.ts` as `events.drop.{enter, leave, drop}`. Wire `createDrop` to emit on the host element so the bridge matches every other stateful factory. Single-word verbs aligned with the platform DragEvent vocabulary.

### `createFocus`

- **States:** `'inactive' | 'active'`
- **Events fired in tests:** `activate`, `deactivate`, `destroy`
- **Emits today:** nothing — the factory only exposes the `active` reactive ref
- **Public surface:** **none** — `FOCUS_EVENTS` does not exist

**Gaps**

- Like `createDrop`, `createFocus` is observable only through its reactive ref. A consumer wiring "the focus trap engaged just now" can't subscribe.

**Proposed:** add `FOCUS_EVENTS.{activate, deactivate}`. Mirror into `events.ts`. Single-word verbs already in the AGENTS.md §11 lifecycle vocabulary (`activate` is documented as "focus / scroll-target advancement" — fits exactly).

### `createPointer`

- **States:** `'idle' | 'dragging'`
- **Events fired in tests:** `pointerdown`, `pointerup`, `clear`, `pointerdown-rejected`, `destroy`
- **Emits today:** nothing — the factory exposes `dragging` reactive ref + `on.{start, move, end}` callback hooks (no `dispatchEvent`)
- **Public surface:** **none** — `POINTER_EVENTS` does not exist

**Gaps**

- The `on.start` / `on.move` / `on.end` callbacks are constructor-time only — a consumer who didn't pass them at construction can't observe pointer-capture lifecycle later. Every other stateful factory's `on.*` is mirrored into a `dispatchEvent` on the host so late subscribers can attach.

**Proposed:** add `POINTER_EVENTS.{start, move, end}`. Mirror into `events.ts`. Wire `createPointer` to emit on the host element alongside the existing `on.*` callbacks. Single-word verbs from the lifecycle vocabulary (`start`, `stop` — but `end` is the platform vocabulary for pointer/touch/drag lifecycle; both ratify).

### `createDrag`

- **States (selection):** `'empty' | 'single' | 'range'`
- **States (drag):** pointer-driven, not modeled in the statechart table
- **Events fired in tests:** `select-1`, `shift-3`, `clear`, `destroy`
- **Emits today:** `DRAG_EVENTS.{tap, start, over, drop, end, reorder}`
- **Public surface:** `events.drag.{tap, start, over, drop, end, reorder}`

**Gaps**

- The selection sub-machine's transitions have no observable event — only `tap` / `reorder` cover the structural drag operations. Selection state ("the user just selected row N") is reactive-ref only.

**Proposed:** add `DRAG_EVENTS.select` (fires when the selection set changes — `detail: { added, removed, anchor }`) and `DRAG_EVENTS.clear` (fires when the selection clears). Mirror into `events.ts`. Single-word verbs already in `events.ts`'s vocabulary for the selection family.

### `createTable`

- **States (sort):** `'none' | 'asc' | 'desc'` per column
- **States (selection):** `'unselected' | 'selected'` per row
- **States (expansion):** `'collapsed' | 'expanded'` per row
- **Events fired in tests:** `toggle`, `select`, `clear`, `expand`, `collapse`
- **Emits today:** `TABLE_EVENTS.{change, focus, select, sort, expand, collapse, paginate}`
- **Public surface:** `events.table.{change, focus, select, sort, expand, collapse, paginate}`

**Gaps**

- None observed. `TABLE_EVENTS` is the richest single map and aligns with every statechart sub-machine.

**Proposed:** no change.

## Summary of recommended changes

If applied in full, the audit yields these new / changed events:

1. **`THEME_EVENTS`** — replace `change` with `light` / `dark` / `system` (BREAKING).
2. **`TOAST_EVENTS`** — add `pause` / `resume`.
3. **`MENU_EVENTS`** — add `select`.
4. **`FORM_EVENTS`** — add `dirty` / `clear` (rename the test-event `clear` to match if it differs).
5. **`CAROUSEL_EVENTS`** — add `start` / `stop`.
6. **`DROP_EVENTS`** — NEW constant; add to `events.ts` as `events.drop`.
7. **`FOCUS_EVENTS`** — NEW constant; add to `events.ts` as `events.focus`.
8. **`POINTER_EVENTS`** — NEW constant; add to `events.ts` as `events.pointer`.
9. **`DRAG_EVENTS`** — add `select` / `clear`.

Items 6, 7, and 8 also require wiring the matching factories (`createDrop`, `createFocus`, `createPointer`) to `dispatchEvent` on their host element so late subscribers can attach — today these factories rely on constructor-time `on.*` callbacks only.

Item 1 is the only breaking change in the list. Items 2 – 9 are purely additive — the test mirror in `events.ts` grows, the constants gain new keys, and the parity tests (`tests/guides/composables.test.ts` for the vocabulary gate; `tests/guides/elements.test.ts` for the events-tree mirror) will need their expectations updated in the same change.

---

## Implementation summary

All nine findings shipped together. Per-factory landing notes:

| # | Finding | Result |
|---|---------|--------|
| 1 | THEME: `change` → `light` / `dark` / `system` + `name` | **Breaking change applied.** `THEME_EVENTS.change` is gone. `src/browser/theme.ts` fires `fireSettingChange(next, previous)` on each setting flip (selecting `light` / `dark` / `system` based on the new value) and `fireNameChange(next, previous)` on each palette-name flip. `UseThemeEventMap` (in `types.ts`) now declares four `on.*` slots; `createTheme` wires each via `listen`. Migrated `tests/src/browser/composables/useTheme.test.ts` + `tests/src/browser/factories/createTheme.test.ts` to the new vocabulary. |
| 2 | TOAST: add `pause` / `resume` | `createToast` now tracks a private `paused` flag so the hover/focus bridge and `api.pause()` / `api.resume()` no longer double-emit. `TOAST_EVENTS.pause` / `.resume` added. `UseToastEventMap` updated. |
| 3 | MENU: add `select` | `createMenu`'s `onMenuClick` fires `MENU_EVENTS.select` with `detail: { item, value }` BEFORE the `dismiss.inside` pipeline, so consumers always see which item was activated even when the menu auto-dismisses. `UseMenuEventMap` updated. |
| 4 | FORM: add `dirty` / `clear` | `createForm.touch()` emits `FORM_EVENTS.dirty` once on the first `pristine → dirty` edge (de-duped via a `wasPristine` check). `createForm.clear()` emits `FORM_EVENTS.clear` after resetting the bookkeeping. Both verbs added to `FormEventMap`. The native `reset` event remains separate (fires on the underlying form's `reset()`). |
| 5 | CAROUSEL: add `start` / `stop` | `createCarousel` now splits cycling-region mutators into private `startInternal` / `stopInternal` (no-emit) + public `start` / `stop` (emit). `pause` / `resume` use the private writers so a hover-bridge `pause` no longer also emits `stop`. `UseCarouselEventMap` updated. |
| 6 | DRAG: add `select` / `clear` | `createDrag.select()` emits `DRAG_EVENTS.select` with `detail: { added, removed, anchor, selection }` (added/removed computed via a tiny `diffIndices` helper). `createDrag.clear()` emits `DRAG_EVENTS.clear` (skipped when the selection was already empty). `UseDragEventMap` updated. |
| 7 | NEW `DROP_EVENTS.{enter, leave, drop}` | `createDrop` (previously emit-less) now dispatches `enter` / `leave` on the `over` edges (so duplicate `dragenter` doesn't double-fire) and `drop` on every accepted release. Constant + `events.drop` mirror added. |
| 8 | NEW `FOCUS_EVENTS.{activate, deactivate}` | `createFocus.activate()` / `.deactivate()` now emit on the host. Constant + `events.focus` mirror added. |
| 9 | NEW `POINTER_EVENTS.{start, move, end}` | `createPointer` now dispatches `start` / `move` / `end` on the host alongside the existing constructor-time `on.*` callbacks. `detail.originalEvent` carries the raw `PointerEvent` so consumers needing geometry can still reach it. Constant + `events.pointer` mirror added. |

Cross-cutting:

- **Vocabulary gate.** `tests/guides/composables.test.ts` and `guides/composables.md` both grew the `dirty` / `enter` / `leave` / `light` / `dark` / `system` / `name` verbs. The four THEME verbs are value-shaped per AGENTS.md §14 (each transition is its own named event); composables.md explains the rationale inline next to the registry.
- **Showcase docs.** `guides/showcase.md` documents the new `Statechart playgrounds` `ROUTE_GROUP`.
- **Test counts.** `npm test` passes `189` test files / `10841` tests after the change. The unit-test transition tables in `tests/src/browser/factories/createTheme.test.ts` (and friends) drive every renamed event so the existing statechart coverage continues to verify the new wire vocabulary.
