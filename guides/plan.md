# Implementation Plan & Status

> Living tracker of what's built, what's next, and what's deferred. Update with every meaningful change. The companion guides ([styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md)) describe the architecture; this file tracks how much of it has actually shipped and what to build next.

The architectural plan-of-record lives at `~/.claude/plans/i-want-to-make-nifty-quill.md`. This file mirrors its current state of execution.

---

## How to read this plan

- **Substantive (✅ cascade)** — element has a full `--set-{tag}-*` token chain, consumes the modifier cascade, has a TS entry in `elements.ts`, has a behavior test, and has a showcase page.
- **Override (🟡)** — element ships a small framework-essential rule (often UA quirk normalization or a single missing default) but does NOT enter the modifier cascade. No TS entry, no per-element test beyond shape parity.
- **n/a (🚫)** — partial is comment-only documentation. Tailwind preflight + UA defaults handle everything.

The element-rule philosophy stays the same: only ship a rule when it earns its keep. Most elements stay 🚫 indefinitely. Promote to 🟡 when a specific UA quirk demands a fix, and to ✅ when an element earns the full cascade.

---

## Foundation phase — complete

| Concern | Status | File(s) |
| --- | --- | --- |
| Tailwind v4 dependency + `@tailwindcss/postcss` | ✅ | [package.json](../package.json), [vite.config.ts](../vite.config.ts) |
| `@layer` order declared (`theme, base, elements, components, surfaces, modifiers, utilities`) | ✅ | [tests/setup.css](../tests/setup.css), [app/browser/styles/main.css](../app/browser/styles/main.css) |
| Token surface (`--set-*` + `@theme` variants) | ✅ | [src/styles/\_tokens.scss](../src/styles/_tokens.scss), [src/styles/\_theme.scss](../src/styles/_theme.scss) |
| Mixins registry (`reduced-motion`, `transition`, `focus-ring`, `$variants`/`$sizes`/`$styles`/`$states`) | ✅ | [src/styles/\_mixins.scss](../src/styles/_mixins.scss) |
| Modifier system — four dimensions (variant / size / style / state) | ✅ | [src/styles/modifiers/](../src/styles/modifiers/) |
| Element baseline — `<button>` | ✅ cascade | [\_button.scss](../src/styles/elements/_button.scss) |
| Element baseline — `<a>` | ✅ cascade | [\_a.scss](../src/styles/elements/_a.scss) |
| Element baseline — `<input>` | ✅ cascade | [\_input.scss](../src/styles/elements/_input.scss) |
| Element baseline — `<textarea>` | ✅ cascade | [\_textarea.scss](../src/styles/elements/_textarea.scss) |
| Element baseline — `<select>` | ✅ cascade | [\_select.scss](../src/styles/elements/_select.scss) |
| Element baseline — `<dialog>` (+ `::backdrop`) | ✅ cascade | [\_dialog.scss](../src/styles/elements/_dialog.scss), [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss) |
| Element baseline — `<table>` & friends | ✅ cascade | [\_table.scss](../src/styles/elements/_table.scss) |
| Empty barrels for `components/` and `surfaces/` | ✅ | [components/index.scss](../src/styles/components/index.scss), [surfaces/index.scss](../src/styles/surfaces/index.scss) |
| TS contract layer (`tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`) | ✅ | [src/browser/](../src/browser/) |
| Bidirectional parity tests (tokens, modifiers, elements, events) | ✅ | [tests/src/browser/](../tests/src/browser/) |
| Modifier behavior tests | ✅ | [tests/src/styles/modifiers/](../tests/src/styles/modifiers/) |
| Per-element behavior tests (button, a, input, textarea, select, dialog, table) | ✅ | [tests/src/styles/elements/](../tests/src/styles/elements/) |
| Tailwind interop test | ✅ | [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts) |
| Showcase pages — Home + 7 element pages | ✅ | [app/browser/pages/](../app/browser/pages/) |

**Recent fixes (2026-05-08):**

- `<select>` chevron: replaced `linear-gradient(currentColor, currentColor)` (which painted a flat rectangle) with an inline SVG data URL. Stroke is hardcoded slate-500 — see file header for why `currentColor` can't be used in CSS background-image SVGs.
- `<dialog>` positioning: explicit `&:modal` rule re-anchors modal dialogs to viewport center; explicit `&[open]:not(:modal)` rule sets `position: static; margin: 0` so non-modal dialogs flow inline at their source position instead of getting punted to the top of the nearest positioned ancestor.
- `<a>.filled` chrome: added medium-default `padding-inline` / `padding-block` / `border-radius` inside `&.filled` so a filled link without an explicit size modifier still has breathing room. Size modifiers continue to win because `--set-size-*` tokens take precedence in the fallback chain.

**Verification (run `npm test && npm run check` to reproduce):**

- 303/303 tests pass across `src:core`, `src:browser`, `src:styles`, `app:core`, `app:browser`.
- 0 oxlint warnings/errors.
- 0 vue-tsc errors.

---

## Phase 2 — Form controls & disclosure

The form-control story is half-done: input, textarea, and select are full-cascade; the rest are placeholder partials. Phase 2 finishes the form story so a complete `<form>` can be assembled out of framework-styled elements without falling back to Tailwind utilities for chrome.

Sequenced by ROI — each row depends only on rows above it:

| # | Element | Verdict | Why now | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | `<label>` | 🟡 → ✅ light cascade | Pairs with every form control. Needs consistent typography, vertical alignment with controls, and a `.required` modifier reading variant for the asterisk color. | Light cascade — only inherits typography/color tokens; no border/background of its own. Lives in `tokens.label.{color,fontSize}` only. |
| 2.2 | `<fieldset>` + `<legend>` | 🟡 → ✅ cascade | Already has a UA quirk override (`min-inline-size: 0`) but doesn't enter the cascade. Promote to full chrome (border, padding, legend positioning) so grouped form sections get framework chrome. | `<legend>` only earns chrome when it's a child of `<fieldset>`; ship as a single coupled partial. |
| 2.3 | `<details>` + `<summary>` | 🚫 → ✅ cascade | Native disclosure widget. Needs framework chrome around the box, summary marker normalization (UA marker varies wildly), open-state visual feedback. State modifier `.open` reads `[open]` attribute. | First element to use a state attribute as its open-signal. Surface-y feature: the `::details-content` pseudo (Chromium 131+) is still not universal — keep it markup-driven. |
| 2.4 | `<progress>` | 🚫 → ✅ cascade | UA chrome differs across every browser. Needs a value/max-driven fill via `::-webkit-progress-bar` and `::-moz-progress-bar` plus a fallback that variant-tracks. | Reaches into surfaces — the pseudo-element rules will live in `surfaces/_progress.scss` so the element file stays declarative. |
| 2.5 | `<meter>` | 🚫 → ✅ cascade | Cousin of `<progress>` but with low/high/optimum semantics — fill color reads variant-by-zone (success / warning / danger) computed from attributes. | Same surface split as progress. |
| 2.6 | `<output>` | 🚫 → ✅ cascade (light) | Form result display. Inline by default; framework gives it monospace + subtle background option via a style-modifier-only path. | Lightweight — no border or padding by default. |
| 2.7 | `<datalist>` | 🚫 stays | Render is OS-controlled (autocomplete dropdown). No CSS surface to style. | Document the limitation in elements.md; await `appearance: base-select`-style opt-in. |
| 2.8 | `<option>`, `<optgroup>` | 🚫 stays | Native popup, not stylable. Same limitation as datalist. | Will become reachable once `<select appearance="base-select">` lands stable. |

**Phase 2 deliverables (all rows):**

- For each ✅: substantive `_{tag}.scss` with `--set-{tag}-*` token chain, TS entry in `elements.ts`, behavior test in `tests/src/styles/elements/_{tag}.test.ts`, showcase page in `app/browser/pages/`, route entry in `app/browser/router.ts`, status flip in `elements.md`.
- For each 🟡: small partial wrapped in `@layer elements`, comment justifying the rule, no TS entry, no per-element test (parity tests still scan).
- One-line update to this file moving the row out of Phase 2 into Foundation.

---

## Phase 3 — Typographic content

Prose elements. Most are handled by Tailwind preflight (margin reset, line-height) but a few earn substantive treatment because they carry a recognizable "shape" beyond text:

| # | Element | Verdict | Why | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | `<h1>`–`<h6>` | 🟡 → ✅ cascade | Already a multi-tag partial with override. Promote to full cascade so a heading can wear `.primary` / `.large` / `.ghost` and pick up the variant tokens consistently with anchors. | `_h1-h6.scss` already exists; just expand the cascade. |
| 3.2 | `<hr>` | 🚫 → 🟡 | Single-rule override: `--set-hr-color: var(--set-variant-background-color, currentColor)` + opacity. Lets `<hr class="primary">` paint a variant-colored divider. | No padding/border — just color tracking. |
| 3.3 | `<blockquote>` | 🚫 → 🟡 | Override: leading vertical bar driven by variant color (`border-inline-start: 4px solid var(--set-variant-background-color)`), padding-inline, italic. | Tailwind preflight resets margin/quotes; we just add the bar. |
| 3.4 | `<code>`, `<kbd>`, `<samp>`, `<var>` | 🚫 → 🟡 | Inline code/keyboard styling — monospace, subtle tinted background via `color-mix(in srgb, currentColor 8%, transparent)`. | Single rule per partial; no cascade. |
| 3.5 | `<pre>` | 🚫 → 🟡 | Block code. Padding, overflow-x, monospace, subtle border. Consumes Tailwind's `--text-sm`. | Pairs with `<code>` semantically; tested together. |
| 3.6 | `<mark>` | 🟡 → 🟡 (kept) | Already overrides UA `yellow`/`black` with system `mark`/`marktext`. No promotion needed. | Stays as-is. |
| 3.7 | `<abbr>` | 🟡 → 🟡 (kept) | Already overrides with `cursor: help` + dotted underline normalization. | Stays as-is. |
| 3.8 | `<address>` | 🟡 → 🟡 (kept) | Already overrides UA italic with `font-style: normal`. | Stays as-is. |
| 3.9 | `<dl>`, `<dt>`, `<dd>` | 🚫 → 🟡 | Definition lists need a sane vertical rhythm — Tailwind preflight zeroes the margin and the bare list collapses. Add minimal vertical spacing tokens. | Single coupled partial set; one test. |
| 3.10 | `<ul>`, `<ol>`, `<li>` | 🚫 stays | Tailwind preflight already strips the marker. Keep that — re-styling list markers is an opt-in component (e.g. `.list-disc`, `.list-decimal` are Tailwind utilities). | Document in elements.md. |
| 3.11 | `<p>` | 🟡 → 🟡 (kept) | Already overrides with vertical rhythm (`margin-block-end: 1em`). No promotion needed. | Stays as-is. |
| 3.12 | `<q>`, `<cite>`, `<dfn>`, `<time>` | 🚫 stays | UA defaults + Tailwind preflight handle inline phrasing perfectly. No framework rule earns its place. | Document in elements.md. |
| 3.13 | `<del>`, `<ins>`, `<s>`, `<u>` | 🚫 stays | Browser-default strikethrough/underline are correct. No add-ons. | Document in elements.md. |
| 3.14 | `<sub>`, `<sup>`, `<small>`, `<strong>`, `<em>`, `<b>`, `<i>` | 🚫 stays | Inline phrasing. UA + Tailwind preflight cover them entirely. | Document in elements.md. |
| 3.15 | `<bdi>`, `<bdo>`, `<wbr>`, `<rp>`, `<rt>`, `<ruby>` | 🚫 stays | Bidi / ruby annotation. UA defaults are correct. | Document in elements.md. |

**Phase 3 deliverables:** every row above results in a one-line update to elements.md (verdict + rationale). Substantive promotions (3.1) get the full cascade treatment per the Phase 2 deliverable list.

---

## Phase 4 — Media & embeds

Once form controls and prose are done, media is the remaining substantive surface:

| # | Element | Verdict | Why | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | `<img>` | 🚫 → 🟡 | Tailwind preflight already gives `display: block; max-width: 100%;`. Add `block-size: auto;` and `vertical-align: middle;` for the cases preflight misses. | Tiny override. |
| 4.2 | `<figure>` + `<figcaption>` | 🚫 → 🟡 | Pair gets `gap`-driven vertical spacing + caption typography (smaller, muted). | Coupled partial pair. |
| 4.3 | `<video>`, `<audio>` | 🚫 → 🟡 | UA media controls are stylable only via vendor pseudos; offer `display: block; max-width: 100%; border-radius` baseline so embedded media respects layout. | Cascade not earned — too few user-controllable surfaces. |
| 4.4 | `<iframe>`, `<embed>`, `<object>` | 🚫 → 🟡 | Set `border: 0` and `max-width: 100%` so embeds don't blow out. | Tiny overrides. |
| 4.5 | `<canvas>`, `<svg>`, `<picture>`, `<math>` | 🚫 stays | UA + preflight correct. | Document in elements.md. |

---

## Phase 5 — Sectioning & generic

Sectioning elements (`<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<hgroup>`, `<search>`) and generic boxes (`<div>`, `<span>`) earn no framework rule. They're semantic landmarks; their visual treatment is the consumer's job (or comes from a `<dialog>`/component composing them).

All stay 🚫. Their partials remain comment-only documentation.

---

## Phase 6 — Composables, components, surfaces, theming, distribution

Each of these is a multi-day effort with its own design pass. They're scoped here only to make the dependency order legible.

- **6.1 Composables** — `useVariant`, `useSize`, `useDialog`, `useDisclosure`, `usePopover`, `useFocusTrap`, `useReducedMotion`. First composable populates `events.ts`. Depends on Phase 2.3 (details) and Phase 2.x components having lifecycle to observe.
- **6.2 Components** — composed widgets (`card`, `alert`, `modal` (wraps `<dialog>` + composables), `dropdown`, `popover`, `tooltip`, `toast`). Each is a separate spec. Depends on 6.1.
- **6.3 Surfaces** — `[popover]`, `::placeholder`, `::marker`, `::file-selector-button`, `::picker(select)` once that ships, `::view-transition-*`, `::scrollbar-*`, anchor positioning. Catalog in [surfaces.md](surfaces.md). Each surface added is a small spec; depends on the elements it surrounds.
- **6.4 Theming beyond default** — additional `[data-theme="…"]` blocks, dark-mode-aware tokens. Architecture is theme-friendly already; specific themes are content. Depends on Phase 1–4 being stable so a theme doesn't have to chase moving tokens.
- **6.5 Distribution polish** — published-package guidance in [styles.md](styles.md) §Distribution, `@source` ergonomics, dual-distribution (CSS + TS) build verification, NPM publish dry-run. Final phase before 1.0.

---

## Cross-cutting open questions

These come up in multiple phases; resolve once and reuse.

- **Placement vocabulary.** Today the dialog page demonstrates that non-modal dialogs flow inline at source position, but composed components (modal, popover, tooltip) need a real placement vocabulary (`top`, `bottom`, `start`, `end`, `top-start`, …). Belongs in 6.3 surfaces but the modifier-class names should be locked in earlier — start a `modifiers/_placements.scss` partial in Phase 2.3 (details) so the surfaces consume an established vocabulary.
- **Loading state handoff.** `.loading` is in the state modifier set but no element interprets it yet. Decision needed: does `.loading` toggle a spinner pseudo-element, or just dim + cursor? Settle in Phase 2.4 (progress lands the spinner asset).
- **`appearance: base-select`.** Chromium 134+ ships a real anchor-positioned popover for `<select>`. Once Firefox + Safari catch up, the select chevron's hardcoded color goes away — the picker becomes a real surface in 6.3. Track support; revisit when ≥2 evergreens ship it.
- **Input validation states.** `:invalid` is the natural state to color the border with `--color-danger`. Decision: do we ship that automatically, or require an opt-in (`.validate`) modifier? Lean toward opt-in — automatic `:invalid` is too aggressive on initial render. Settle in Phase 3 retrospective.

---

## Element verdict roster

Single source of truth for "where does each tag stand?" Sorted alphabetically. Cross-references the phase that delivers each promotion.

| Tag | Current | Target | Phase |
| --- | --- | --- | --- |
| `<a>` | ✅ cascade | ✅ cascade | done |
| `<abbr>` | 🟡 | 🟡 | done (3.7) |
| `<address>` | 🟡 | 🟡 | done (3.8) |
| `<article>` | 🚫 | 🚫 | stays |
| `<aside>` | 🚫 | 🚫 | stays |
| `<audio>` | 🚫 | 🟡 | 4.3 |
| `<b>` | 🚫 | 🚫 | stays |
| `<bdi>`, `<bdo>` | 🚫 | 🚫 | stays |
| `<blockquote>` | 🚫 | 🟡 | 3.3 |
| `<body>` | 🚫 | 🚫 | stays |
| `<button>` | ✅ cascade | ✅ cascade | done |
| `<canvas>` | 🚫 | 🚫 | stays |
| `<caption>` | 🚫 (folded into table) | covered | done (table) |
| `<cite>` | 🚫 | 🚫 | stays |
| `<code>` | 🚫 | 🟡 | 3.4 |
| `<col>`, `<colgroup>` | 🚫 (folded into table) | covered | done (table) |
| `<data>` | 🚫 | 🚫 | stays |
| `<datalist>` | 🚫 | 🚫 | 2.7 (documented limitation) |
| `<dd>`, `<dl>`, `<dt>` | 🚫 | 🟡 | 3.9 |
| `<del>`, `<ins>`, `<s>`, `<u>` | 🚫 | 🚫 | stays (3.13) |
| `<details>` | 🚫 | ✅ cascade | 2.3 |
| `<dfn>` | 🚫 | 🚫 | stays |
| `<dialog>` | ✅ cascade | ✅ cascade | done |
| `<div>`, `<span>` | 🚫 | 🚫 | stays |
| `<em>`, `<i>`, `<strong>` | 🚫 | 🚫 | stays |
| `<embed>` | 🚫 | 🟡 | 4.4 |
| `<fieldset>` + `<legend>` | 🟡 | ✅ cascade | 2.2 |
| `<figcaption>`, `<figure>` | 🚫 | 🟡 | 4.2 |
| `<footer>`, `<header>`, `<main>`, `<nav>`, `<section>` | 🚫 | 🚫 | stays |
| `<form>` | 🚫 | 🚫 | stays (no chrome of its own) |
| `<h1>`–`<h6>` | 🟡 | ✅ cascade | 3.1 |
| `<hgroup>` | 🚫 | 🚫 | stays |
| `<hr>` | 🚫 | 🟡 | 3.2 |
| `<html>` | 🚫 | 🚫 | stays |
| `<iframe>` | 🚫 | 🟡 | 4.4 |
| `<img>` | 🚫 | 🟡 | 4.1 |
| `<input>` | ✅ cascade | ✅ cascade | done |
| `<kbd>` | 🚫 | 🟡 | 3.4 |
| `<label>` | 🚫 | ✅ cascade (light) | 2.1 |
| `<li>` | 🚫 | 🚫 | stays (3.10) |
| `<map>`, `<area>` | 🚫 | 🚫 | stays |
| `<mark>` | 🟡 | 🟡 | done (3.6) |
| `<math>` | 🚫 | 🚫 | stays |
| `<menu>` | 🚫 | 🚫 | stays |
| `<meter>` | 🚫 | ✅ cascade | 2.5 |
| `<object>` | 🚫 | 🟡 | 4.4 |
| `<ol>`, `<ul>` | 🚫 | 🚫 | stays (3.10) |
| `<optgroup>`, `<option>` | 🚫 | 🚫 | 2.8 (documented limitation) |
| `<output>` | 🚫 | ✅ cascade (light) | 2.6 |
| `<p>` | 🟡 | 🟡 | done (3.11) |
| `<picture>` | 🚫 | 🚫 | stays |
| `<pre>` | 🚫 | 🟡 | 3.5 |
| `<progress>` | 🚫 | ✅ cascade | 2.4 |
| `<q>` | 🚫 | 🚫 | stays |
| `<rp>`, `<rt>`, `<ruby>` | 🚫 | 🚫 | stays (3.15) |
| `<samp>` | 🚫 | 🟡 | 3.4 |
| `<search>` | 🚫 | 🚫 | stays |
| `<select>` | ✅ cascade | ✅ cascade | done |
| `<small>` | 🚫 | 🚫 | stays |
| `<sub>`, `<sup>` | 🚫 | 🚫 | stays |
| `<summary>` | 🚫 | ✅ cascade (with details) | 2.3 |
| `<svg>` | 🚫 | 🚫 | stays |
| `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<td>`, `<th>` | ✅ cascade | ✅ cascade | done |
| `<textarea>` | ✅ cascade | ✅ cascade | done |
| `<time>` | 🚫 | 🚫 | stays |
| `<var>` | 🚫 | 🟡 | 3.4 |
| `<video>` | 🚫 | 🟡 | 4.3 |
| `<wbr>` | 🚫 | 🚫 | stays |

**Tally after all phases:**

- ✅ cascade: 14 elements (button, a, input, textarea, select, dialog, table-family-7, label, fieldset+legend, details+summary, progress, meter, output, h1-h6).
- 🟡 override: 16 (abbr, address, mark, p, h1-h6 [if kept as override — actually promoted], hr, blockquote, code, kbd, samp, var, pre, dl/dt/dd, img, figure/figcaption, video/audio, iframe/embed/object).
- 🚫 stays: ~63 elements — the long tail of inline phrasing, sectioning, metadata, void / inert content.

(Counts double-count multi-tag partials like h1-h6 and table-family deliberately, since each tag is its own consumer surface.)

---

## Deferred / later

Items the foundation phase deliberately doesn't include. Each becomes its own spec when its time comes (most map to Phase 6 above).

- **Composables** (`useVariant`, `useSize`, `usePopover`, `useDialog`, …). [`src/browser/events.ts`](../src/browser/events.ts) ships empty with the naming convention locked in (`elements:{source}:{verb}` + a fixed lifecycle vocabulary). First composable is what makes that surface non-trivial.
- **Components** — composed widgets (card, alert, modal, dropdown, …). Folder + barrel exist; no entries yet. Convention is documented in [components.md](components.md).
- **Surfaces** — `[popover]`, `::placeholder`, `::marker`, `::file-selector-button`, view transitions, scroll-driven animations, anchor positioning. `_backdrop.scss` is the only surface shipped today. Catalog in [surfaces.md](surfaces.md).
- **Theming beyond default** — additional `[data-theme="…"]` blocks or `[data-core="…"]` palettes. The `--color-*` and `--set-*` namespaces are theme-friendly today; specific themes are content, not architecture.
- **Distribution polish** — published-package guidance for consumers in [styles.md](styles.md) §Distribution remains a sketch until we publish a real version.
- **`@source` ergonomics** — Tailwind v4's tree-shake means scale tokens like `--text-sm` and `--radius-lg` aren't on `:root` unless their utility class is generated. Modifier files currently use rem literals (see [tokens.md](tokens.md) §"Tailwind tree-shake"). Worth revisiting if Tailwind ships a `@theme static` opt-out.

---

## Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide (token surface change → `tokens.md`; new element → `elements.md`; new mixin → `mixins.md`; etc.).
2. This file's tables — move the row out of the upcoming-phase table into Foundation, update the verdict roster, bump the test count.

Don't wait for a "doc pass" — out-of-date status is worse than missing status.

When picking the next thing to work on, prefer the lowest-numbered row in the next-up phase that doesn't have a hard dependency on something later. Phases 2 and 3 can interleave once 2.1–2.3 are done — typography promotion (3.1) is independent of progress/meter (2.4–2.5).
