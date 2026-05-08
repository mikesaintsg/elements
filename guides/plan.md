# Implementation Plan & Status

> Living tracker of what's built, what's next, and what's deferred. Update with every meaningful change. The companion guides ([styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md)) describe the architecture; this file tracks how much of it has actually shipped and what to build next.

The architectural plan-of-record lives at `~/.claude/plans/i-want-to-make-nifty-quill.md`. This file mirrors its current state of execution.

---

## How to read this plan

- **Substantive (✅ cascade)** — element has a full `--set-{tag}-*` token chain, consumes the modifier cascade, has a TS entry in `elements.ts`, has a behavior test, and a showcase placement (its own page or under a grouped pattern page).
- **Override (🟡)** — element ships a small framework-essential rule (often UA quirk normalization or a single missing default) but does NOT enter the modifier cascade. No TS entry, no per-element test beyond shape parity.
- **n/a (🚫)** — partial is comment-only documentation. Tailwind preflight + UA defaults handle everything.

The element-rule philosophy stays the same: only ship a rule when it earns its keep. Most elements stay 🚫 indefinitely. Promote to 🟡 when a specific UA quirk demands a fix, and to ✅ when an element earns the full cascade.

---

## Foundation phase — complete

Phase 1 (foundation), Phase 2 (form controls), Phase 3 (typography), Phase 4 (media) are all shipped. Phase 6 surfaces have started — `[popover]`, `::backdrop`, scrollbar styling are in.

### Architecture

| Concern                                                                                                                                                     | Status | File(s)                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Tailwind v4 + `@tailwindcss/postcss`                                                                                                                        | ✅     | [package.json](../package.json), [vite.config.ts](../vite.config.ts)                                 |
| `@layer` order (`theme, base, elements, components, surfaces, modifiers, utilities`)                                                                        | ✅     | [tests/setup.css](../tests/setup.css), [app/browser/styles/main.css](../app/browser/styles/main.css) |
| Token surface (`--set-*` + `@theme` variants)                                                                                                               | ✅     | [\_tokens.scss](../src/styles/_tokens.scss), [\_theme.scss](../src/styles/_theme.scss)               |
| Mixins registry (`reduced-motion`, `transition`, `focus-ring`, `$variants`/`$sizes`/`$styles`/`$states`)                                                    | ✅     | [\_mixins.scss](../src/styles/_mixins.scss)                                                          |
| Modifier system — four dimensions (variant / size / style / state)                                                                                          | ✅     | [src/styles/modifiers/](../src/styles/modifiers/)                                                    |
| TS contract layer (`tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`)                                                                                 | ✅     | [src/browser/](../src/browser/)                                                                      |
| Bidirectional parity tests                                                                                                                                  | ✅     | [tests/src/browser/](../tests/src/browser/)                                                          |
| Modifier behavior tests                                                                                                                                     | ✅     | [tests/src/styles/modifiers/](../tests/src/styles/modifiers/)                                        |
| Per-element behavior tests (button, a, input, textarea, select, dialog, table, label, fieldset, details, progress, meter, output) + typography pattern test | ✅     | [tests/src/styles/elements/](../tests/src/styles/elements/)                                          |
| Tailwind interop test                                                                                                                                       | ✅     | [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts)                      |
| Showcase pages — Home + 7 element pages + 3 pattern pages (Forms, Typography, Surfaces)                                                                     | ✅     | [app/browser/pages/](../app/browser/pages/)                                                          |

### Element baselines shipped (✅ cascade, full `--set-{tag}-*` token chain)

| Element                                          | Phase | Partial                                                                                                        | Test                                                                  | Showcase                                               |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `<button>`                                       | 1     | [\_button.scss](../src/styles/elements/_button.scss)                                                           | [\_button.test.ts](../tests/src/styles/elements/_button.test.ts)      | [/button](../app/browser/pages/ButtonPage.vue)         |
| `<a>`                                            | 1     | [\_a.scss](../src/styles/elements/_a.scss)                                                                     | [\_a.test.ts](../tests/src/styles/elements/_a.test.ts)                | [/anchor](../app/browser/pages/AnchorPage.vue)         |
| `<input>`                                        | 1     | [\_input.scss](../src/styles/elements/_input.scss)                                                             | [\_input.test.ts](../tests/src/styles/elements/_input.test.ts)        | [/input](../app/browser/pages/InputPage.vue)           |
| `<textarea>`                                     | 1     | [\_textarea.scss](../src/styles/elements/_textarea.scss)                                                       | [\_textarea.test.ts](../tests/src/styles/elements/_textarea.test.ts)  | [/textarea](../app/browser/pages/TextareaPage.vue)     |
| `<select>`                                       | 1     | [\_select.scss](../src/styles/elements/_select.scss)                                                           | [\_select.test.ts](../tests/src/styles/elements/_select.test.ts)      | [/select](../app/browser/pages/SelectPage.vue)         |
| `<dialog>` (+ `::backdrop` surface)              | 1     | [\_dialog.scss](../src/styles/elements/_dialog.scss), [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss) | [\_dialog.test.ts](../tests/src/styles/elements/_dialog.test.ts)      | [/dialog](../app/browser/pages/DialogPage.vue)         |
| `<table>` family                                 | 1     | [\_table.scss](../src/styles/elements/_table.scss)                                                             | [\_table.test.ts](../tests/src/styles/elements/_table.test.ts)        | [/table](../app/browser/pages/TablePage.vue)           |
| `<label>` (light cascade)                        | 2.1   | [\_label.scss](../src/styles/elements/_label.scss)                                                             | [\_label.test.ts](../tests/src/styles/elements/_label.test.ts)        | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<fieldset>` + `<legend>`                        | 2.2   | [\_fieldset.scss](../src/styles/elements/_fieldset.scss), [\_legend.scss](../src/styles/elements/_legend.scss) | [\_fieldset.test.ts](../tests/src/styles/elements/_fieldset.test.ts)  | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<details>` + `<summary>`                        | 2.3   | [\_details.scss](../src/styles/elements/_details.scss), [\_summary.scss](../src/styles/elements/_summary.scss) | [\_details.test.ts](../tests/src/styles/elements/_details.test.ts)    | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<progress>`                                     | 2.4   | [\_progress.scss](../src/styles/elements/_progress.scss)                                                       | [\_progress.test.ts](../tests/src/styles/elements/_progress.test.ts)  | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<meter>`                                        | 2.5   | [\_meter.scss](../src/styles/elements/_meter.scss)                                                             | [\_meter.test.ts](../tests/src/styles/elements/_meter.test.ts)        | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<output>` (light cascade)                       | 2.6   | [\_output.scss](../src/styles/elements/_output.scss)                                                           | [\_output.test.ts](../tests/src/styles/elements/_output.test.ts)      | [/forms](../app/browser/pages/FormsPage.vue)           |
| `<h1>`–`<h6>` (shared `--set-heading-*` cascade) | 3.1   | [\_h1-h6.scss](../src/styles/elements/_h1-h6.scss)                                                             | [typography.test.ts](../tests/src/styles/elements/typography.test.ts) | [/typography](../app/browser/pages/TypographyPage.vue) |

### Element overrides shipped (🟡, single-rule normalization)

| Element                                | Phase         | Partial                                                                                                            |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `<abbr>`, `<address>`, `<mark>`, `<p>` | (preexisting) | individual partials in `src/styles/elements/`                                                                      |
| `<hr>`, `<blockquote>`                 | 3.2, 3.3      | [\_hr.scss](../src/styles/elements/_hr.scss), [\_blockquote.scss](../src/styles/elements/_blockquote.scss)         |
| `<code>`, `<kbd>`, `<samp>`, `<var>`   | 3.4           | individual partials                                                                                                |
| `<pre>`                                | 3.5           | [\_pre.scss](../src/styles/elements/_pre.scss)                                                                     |
| `<dl>`, `<dt>`, `<dd>`                 | 3.9           | individual partials                                                                                                |
| `<figure>` + `<figcaption>`            | 4.2           | [\_figure.scss](../src/styles/elements/_figure.scss), [\_figcaption.scss](../src/styles/elements/_figcaption.scss) |
| `<video>`, `<audio>`                   | 4.3           | individual partials                                                                                                |
| `<iframe>`, `<embed>`, `<object>`      | 4.4           | individual partials                                                                                                |

### Surfaces shipped

| Surface                                      | Status | File                                                       |
| -------------------------------------------- | ------ | ---------------------------------------------------------- |
| `dialog::backdrop` + `[popover]::backdrop`   | ✅     | [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss)   |
| `[popover]` panel + entry/exit transition    | ✅     | [\_popover.scss](../src/styles/surfaces/_popover.scss)     |
| Scrollbar (`scrollbar-color/-width/-gutter`) | ✅     | [\_scrollbar.scss](../src/styles/surfaces/_scrollbar.scss) |

### Recent fixes (2026-05-08)

- `<select>` chevron: tokenized as `--set-select-background-image` so consumers can swap or remove it without touching the framework partial. Default is an inline SVG (slate-500 stroke, hardcoded because CSS background-image SVGs don't reliably resolve `currentColor`).
- `<dialog>` positioning: explicit `&:modal` rule re-anchors modal dialogs to viewport center; `&[open]:not(:modal)` rule sets `position: static; margin: 0` so non-modal dialogs flow inline at their source position.
- `<a>.filled` chrome: medium-default `padding-inline` / `padding-block` / `border-radius` inside `&.filled` so a filled link without an explicit size modifier still has breathing room.
- `app/browser/styles/main.scss` → `main.css`: dropped Sass `@import` deprecation warnings by mirroring the test-side setup. Sass-side framework SCSS is now a separate import in `main.ts`.
- **SurfacesPage popover bug**: Tailwind layout utilities (`.grid` / `.flex` / `.block`) on `[popover]` elements override the UA's `display: none` for closed popovers, causing the panel to render flat in document flow. Fixed by wrapping popover content in a child div and documented as a gotcha in [surfaces.md](surfaces.md#61-gotcha--tailwind-layout-utilities-on-popover-elements).

### Verification (run `npm test && npm run check` to reproduce)

- **575 / 575 tests** pass across 25 test files.
- 0 oxlint warnings/errors.
- 0 vue-tsc errors.
- Dev server compile clean — no Sass deprecations, no PostCSS warnings.

---

## What's left in each phase

### Phase 2 — Form controls & disclosure (✅ done)

All substantive elements shipped. Datalist / option / optgroup remain 🚫 documented limitations (UA-rendered popups, not stylable until `appearance: base-select` lands).

### Phase 3 — Typographic content (✅ done)

All overrides + the heading cascade shipped. Inline phrasing elements stay 🚫 — UA + Tailwind preflight cover them entirely. `<ul>` / `<ol>` / `<li>` stay 🚫 — list-marker styling is opt-in via Tailwind utilities.

### Phase 4 — Media & embeds (✅ done)

`<img>`, `<figure>`, `<figcaption>`, `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>` all have override partials. `<canvas>`, `<svg>`, `<picture>`, `<math>` stay 🚫.

### Phase 5 — Sectioning & generic (🚫, intentional)

All sectioning elements (`<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<hgroup>`, `<search>`) and generic boxes (`<div>`, `<span>`) stay 🚫. They're semantic landmarks; visual treatment is the consumer's job.

### Phase 6 — Composables, components, remaining surfaces (in progress)

| Item                                                                                                                  | Status      | Notes                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_backdrop.scss`                                                                                                      | ✅ shipped  | Used by `<dialog>` and `[popover]`                                                                                                                                                                                                |
| `_popover.scss`                                                                                                       | ✅ shipped  | Panel chrome + open/close transition. Placement / `anchor-name` integration deferred.                                                                                                                                             |
| `_scrollbar.scss`                                                                                                     | ✅ shipped  | `scrollbar-color`, `-width`, `-gutter` defaults on `:root`                                                                                                                                                                        |
| `_placeholder.scss` (for `::placeholder`)                                                                             | ⏳ pending  | Small surface. Currently `<input>`/`<textarea>` paint placeholder via `::placeholder { opacity: var(--set-input-placeholder-opacity) }` inside the element file — extract to a shared surface partial when more elements need it. |
| `_marker.scss` (for `::marker`)                                                                                       | ⏳ pending  | Currently `_summary.scss` paints its own marker. Promote to a shared surface when `<details>` isn't the only consumer.                                                                                                            |
| `_picker-select.scss` (for `::picker(select)`)                                                                        | ⏳ pending  | Awaiting Firefox + Safari support for `appearance: base-select`. Track Chromium 134+ adoption.                                                                                                                                    |
| Anchor positioning (`anchor-name` / `position-area`)                                                                  | ⏳ pending  | Foundational for `<dialog>` modal placement, `[popover]` placement, tooltip placement. Resolve placement vocabulary first (see Cross-cutting).                                                                                    |
| View transitions (`::view-transition-*`)                                                                              | ⏳ pending  | Independent surface; can ship any time.                                                                                                                                                                                           |
| Composables — `useDialog`, `useDisclosure`, `usePopover`, `useFocusTrap`, `useReducedMotion`, `useVariant`, `useSize` | ⏳ none yet | First composable populates `events.ts`. Belongs after current surfaces stabilize.                                                                                                                                                 |
| Components — `card`, `alert`, `modal` (wraps `<dialog>` + composables), `dropdown`, `tooltip`, `toast`                | ⏳ none yet | Each is a separate spec. Depends on composables being usable.                                                                                                                                                                     |
| Theming beyond default                                                                                                | ⏳ none yet | Architecture is theme-friendly already; specific themes are content.                                                                                                                                                              |
| Distribution polish                                                                                                   | ⏳ none yet | Published-package guidance + dual-distribution build verification.                                                                                                                                                                |

---

## Best next steps (recommended ordering)

The element-baseline work is broadly done. The remaining productive work splits along three threads, with **Thread A** the highest leverage for the next session.

### Thread A — Composables (unblocks components)

The framework today is CSS-only. Composables turn it into a proper toolkit. **Recommended first composable: `useDialog`** — it's the smallest one with the highest immediate value, since `<dialog>` already ships with framework chrome and the composable gives it idiomatic open/close + focus-restore + `Escape` handling.

1. **`useDialog(target?)`** — wraps a `<dialog>` ref. Returns `{ open, close, isOpen, emitter }`. Emits `elements:dialog:open` / `elements:dialog:close`. Populates `events.ts` with the first real entries. Test in `tests/src/browser/composables/useDialog.test.ts` against a real `<dialog>` element.
2. **`useDisclosure(target?)`** — wraps `<details>`. Reads/writes `[open]`. Same emitter shape.
3. **`usePopover(target?)`** — wraps `[popover]`. Calls `.showPopover()` / `.hidePopover()`. Listens to `toggle` events.
4. **`useReducedMotion()`** — primitive. Reactive boolean tracking `prefers-reduced-motion`. Used by every animation-bearing composable.
5. **`useFocusTrap(container?)`** — primitive for `useDialog` modal mode and components like `modal`/`dropdown`.

**Naming + folder convention**: composables live in `src/browser/composables/{verb}{Noun}.ts`, the file naming we use for helpers (see AGENTS.md §4.3). Each ships its own test in `tests/src/browser/composables/`. Public types in `src/browser/types.ts`. Re-exported via the existing `src/browser/index.ts` barrel.

**Why first**: every component on the Thread B list eventually consumes one of these. Shipping them now establishes the events.ts surface and the composable testing pattern.

### Thread B — Components (consumers of composables)

After at least `useDialog` + `usePopover` ship, the highest-leverage components are:

1. **`<Modal>` (Vue SFC at `src/browser/components/Modal.vue`)** — wraps `<dialog>` + `useDialog` + `useFocusTrap`. Slot-driven. Shows the composition pattern end-to-end.
2. **`<Tooltip>`** — wraps `[popover=manual]` + `usePopover` + anchor-positioning surface. First proof that surfaces + composables + components stack.
3. **`<Dropdown>`** — `<select>` is fine for simple value-picking; `<Dropdown>` is for command menus. Uses `[popover]` + anchor positioning.
4. **`<Alert>` / `<Toast>`** — paired primitives. Toast composes alert + auto-dismiss timer.
5. **`<Card>`** — pure-CSS composition; could ship without a composable. Lowest priority but highest visibility on a homepage.

### Thread C — Remaining surfaces

The two we should ship before composables get noisy:

1. **Anchor positioning surface** (`anchor-name` + `position-area`). Unblocks `usePopover`'s placement vocabulary (top / bottom / start / end / top-start / …). Without it, `<Tooltip>` and `<Dropdown>` have no placement story. Belongs in `src/styles/surfaces/_anchor-positioning.scss`.
2. **Placement modifier vocabulary** (`src/styles/modifiers/_placements.scss`). Class names `.top`, `.bottom`, `.start`, `.end`, `.top-start`, etc. that map to `position-area` values. Pairs with the anchor-positioning surface; both ship together.

These two unblock Thread B's tooltip/dropdown work.

### Recommended sequence

1. **Anchor-positioning surface + placement modifiers** (Thread C, ~1 small task)
2. **`useReducedMotion`** (Thread A, smallest composable, foundation for the rest)
3. **`useDialog`** (Thread A, populates `events.ts`)
4. **`<Modal>`** (Thread B, consumes `useDialog`, proves the composition pattern)
5. **`useDisclosure` + `usePopover`** (Thread A)
6. **`<Tooltip>` + `<Dropdown>`** (Thread B, consume `usePopover` + anchor positioning)
7. **`<Card>` + `<Alert>` + `<Toast>`** (Thread B, lower-leverage UI primitives)

Each of 1, 2, 3, 5 is a single-day task. Each of 4, 6, 7 is multi-day (component design + tests + showcase).

---

## Cross-cutting open questions

These come up in multiple phases; resolve once and reuse.

- **Placement vocabulary.** Resolved by Thread C above — ship `_placements.scss` with class names matching `position-area` keywords, alongside the anchor-positioning surface.
- **Loading state handoff.** `.loading` is in the state modifier set but no element interprets it yet. Decision needed: does `.loading` toggle a spinner pseudo-element, or just dim + cursor? Settle when the first component (Modal? Toast?) actually needs it.
- **`appearance: base-select`.** Track Chromium 134+ adoption. Once Firefox + Safari ship it, the select chevron's hardcoded color goes away — the picker becomes a real surface (`_picker-select.scss`). Until then the `--set-select-background-image` token is the customization point.
- **Input validation states.** `:invalid` is the natural state to color the border with `--color-danger`. Decision: ship it automatically or require an opt-in (`.validate`) modifier? Lean toward opt-in — automatic `:invalid` is too aggressive on initial render. Settle when a form composable lands.
- **Tailwind layout utilities on `[popover]` / state-driven elements.** Documented as a gotcha in surfaces.md §6.1 — don't put `.grid` / `.flex` / `.block` directly on a `[popover]` element; wrap content in a child instead. May warrant a dedicated `_state-display.scss` surface that re-asserts UA hide rules in `@layer base` if it bites a second time.

---

## Element verdict roster

Single source of truth for "where does each tag stand?" Cross-references the phase that delivered each promotion. Shipped status flips visible in [elements.md](elements.md).

| Status      | Count | Examples                                                                                                                                                                     |
| ----------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ cascade  | 21    | button, a, input, textarea, select, dialog, table-family-7, label, fieldset+legend, details+summary, progress, meter, output, h1–h6                                          |
| 🟡 override | 17    | abbr, address, mark, p, hr, blockquote, code, kbd, samp, var, pre, dl, dt, dd, figure, figcaption, video, audio, iframe, embed, object (some are coupled multi-tag partials) |
| 🚫 stays    | ~55   | inline phrasing, sectioning landmarks, void/inert metadata, MathML/SVG/canvas containers, list markers (`<ul>`/`<ol>`/`<li>`)                                                |

(Multi-tag partials like `_h1-h6.scss` and the table-family count each tag as its own consumer surface.)

---

## Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide (token surface change → `tokens.md`; new element → `elements.md`; new mixin → `mixins.md`; new surface → `surfaces.md`).
2. This file's tables — move the row out of the upcoming-phase table into Foundation, update the verdict roster, bump the test count.

Don't wait for a "doc pass" — out-of-date status is worse than missing status.

When picking the next thing to work on, prefer the lowest-numbered row in **Best next steps** above. Anchor positioning + placement modifiers are the foundation for Thread B; `useReducedMotion` + `useDialog` are the foundation for Thread A.
