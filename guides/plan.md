# Implementation Plan & Status

> Living tracker of what's built, what's next, and what's deferred. Update with every meaningful change. The companion guides ([styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md)) describe the architecture; this file tracks how much of it has actually shipped and what to build next.

The architectural plan-of-record lives at `~/.claude/plans/i-want-to-make-nifty-quill.md`. This file mirrors its current state of execution.

---

## How to read this plan

- **Substantive (âœ… cascade)** â€” element has a full `--set-{tag}-*` token chain, consumes the modifier cascade, has a TS entry in `elements.ts`, has a behavior test, and has a showcase page.
- **Override (ðŸŸ¡)** â€” element ships a small framework-essential rule (often UA quirk normalization or a single missing default) but does NOT enter the modifier cascade. No TS entry, no per-element test beyond shape parity.
- **n/a (ðŸš«)** â€” partial is comment-only documentation. Tailwind preflight + UA defaults handle everything.

The element-rule philosophy stays the same: only ship a rule when it earns its keep. Most elements stay ðŸš« indefinitely. Promote to ðŸŸ¡ when a specific UA quirk demands a fix, and to âœ… when an element earns the full cascade.

---

## Foundation phase â€” complete

| Concern | Status | File(s) |
| --- | --- | --- |
| Tailwind v4 dependency + `@tailwindcss/postcss` | âœ… | [package.json](../package.json), [vite.config.ts](../vite.config.ts) |
| `@layer` order declared (`theme, base, elements, components, surfaces, modifiers, utilities`) | âœ… | [tests/setup.css](../tests/setup.css), [app/browser/styles/main.css](../app/browser/styles/main.css) |
| Token surface (`--set-*` + `@theme` variants) | âœ… | [src/styles/\_tokens.scss](../src/styles/_tokens.scss), [src/styles/\_theme.scss](../src/styles/_theme.scss) |
| Mixins registry (`reduced-motion`, `transition`, `focus-ring`, `$variants`/`$sizes`/`$styles`/`$states`) | âœ… | [src/styles/\_mixins.scss](../src/styles/_mixins.scss) |
| Modifier system â€” four dimensions (variant / size / style / state) | âœ… | [src/styles/modifiers/](../src/styles/modifiers/) |
| Element baseline â€” `<button>` | âœ… cascade | [\_button.scss](../src/styles/elements/_button.scss) |
| Element baseline â€” `<a>` | âœ… cascade | [\_a.scss](../src/styles/elements/_a.scss) |
| Element baseline â€” `<input>` | âœ… cascade | [\_input.scss](../src/styles/elements/_input.scss) |
| Element baseline â€” `<textarea>` | âœ… cascade | [\_textarea.scss](../src/styles/elements/_textarea.scss) |
| Element baseline â€” `<select>` | âœ… cascade | [\_select.scss](../src/styles/elements/_select.scss) |
| Element baseline â€” `<dialog>` (+ `::backdrop`) | âœ… cascade | [\_dialog.scss](../src/styles/elements/_dialog.scss), [\_backdrop.scss](../src/styles/surfaces/_backdrop.scss) |
| Element baseline â€” table & friends | âœ… | [src/styles/elements/_table.scss](../src/styles/elements/_table.scss) |
| Element baseline â€” `<label>` (light cascade) | âœ… cascade | [\_label.scss](../src/styles/elements/_label.scss) |
| Element baseline â€” `<fieldset>` + `<legend>` | âœ… cascade | [\_fieldset.scss](../src/styles/elements/_fieldset.scss), [\_legend.scss](../src/styles/elements/_legend.scss) |
| Element baseline â€” `<details>` + `<summary>` | âœ… cascade | [\_details.scss](../src/styles/elements/_details.scss), [\_summary.scss](../src/styles/elements/_summary.scss) |
| Element baseline â€” `<progress>` | âœ… cascade | [\_progress.scss](../src/styles/elements/_progress.scss) |
| Element baseline â€” `<meter>` | âœ… cascade | [\_meter.scss](../src/styles/elements/_meter.scss) |
| Element baseline â€” `<output>` | âœ… cascade (light) | [\_output.scss](../src/styles/elements/_output.scss) |
| Surface â€” `::backdrop` (dialog + popover) | âœ… | [src/styles/surfaces/_backdrop.scss](../src/styles/surfaces/_backdrop.scss) |
| Surface â€” `[popover]` panel + open transition | âœ… | [src/styles/surfaces/_popover.scss](../src/styles/surfaces/_popover.scss) |
| Surface â€” scrollbar styling | âœ… | [src/styles/surfaces/_scrollbar.scss](../src/styles/surfaces/_scrollbar.scss) |
| Empty barrels for `components/` and `surfaces/` | âœ… | [src/styles/components/index.scss](../src/styles/components/index.scss), [src/styles/surfaces/index.scss](../src/styles/surfaces/index.scss) |
| TS contract layer (`tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`) | âœ… | [src/browser/](../src/browser/) |
| Bidirectional parity tests (tokens, modifiers, elements, events) | âœ… | [tests/src/browser/](../tests/src/browser/) |
| Modifier behavior tests | âœ… | [tests/src/styles/modifiers/](../tests/src/styles/modifiers/) |
| Per-element behavior tests (button, a, input, textarea, select, dialog, table) | âœ… | [tests/src/styles/elements/](../tests/src/styles/elements/) |
| Tailwind interop test | âœ… | [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts) |
| Showcase pages â€” Home + 7 element pages | âœ… | [app/browser/pages/](../app/browser/pages/) |

**Recent fixes (2026-05-08):**

- `<select>` chevron: replaced `linear-gradient(currentColor, currentColor)` (which painted a flat rectangle) with an inline SVG data URL. Stroke is hardcoded slate-500 â€” see file header for why `currentColor` can't be used in CSS background-image SVGs.
- `<dialog>` positioning: explicit `&:modal` rule re-anchors modal dialogs to viewport center; explicit `&[open]:not(:modal)` rule sets `position: static; margin: 0` so non-modal dialogs flow inline at their source position instead of getting punted to the top of the nearest positioned ancestor.
- `<a>.filled` chrome: added medium-default `padding-inline` / `padding-block` / `border-radius` inside `&.filled` so a filled link without an explicit size modifier still has breathing room. Size modifiers continue to win because `--set-size-*` tokens take precedence in the fallback chain.

**Verification (run `npm test && npm run check` to reproduce):**

- 444/444 tests pass across `src:core`, `src:browser`, `src:styles`, `app:core`, `app:browser`.
- 0 oxlint warnings/errors.
- 0 vue-tsc errors.

---

## Phase 2 â€” Form controls & disclosure

The form-control story is half-done: input, textarea, and select are full-cascade; the rest are placeholder partials. Phase 2 finishes the form story so a complete `<form>` can be assembled out of framework-styled elements without falling back to Tailwind utilities for chrome.

Sequenced by ROI â€” each row depends only on rows above it:

| # | Element | Verdict | Why now | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | `<label>` | âœ… light cascade â€” done | Pairs with every form control. Needs consistent typography, vertical alignment with controls, and a `.required` modifier reading variant for the asterisk color. | Light cascade â€” only inherits typography/color tokens; no border/background of its own. Lives in `tokens.label.{color,fontSize}` only. |
| 2.2 | `<fieldset>` + `<legend>` | âœ… cascade â€” done | Already has a UA quirk override (`min-inline-size: 0`) but doesn't enter the cascade. Promote to full chrome (border, padding, legend positioning) so grouped form sections get framework chrome. | `<legend>` only earns chrome when it's a child of `<fieldset>`; ship as a single coupled partial. |
| 2.3 | `<details>` + `<summary>` | âœ… cascade â€” done | Native disclosure widget. Needs framework chrome around the box, summary marker normalization (UA marker varies wildly), open-state visual feedback. State modifier `.open` reads `[open]` attribute. | First element to use a state attribute as its open-signal. Surface-y feature: the `::details-content` pseudo (Chromium 131+) is still not universal â€” keep it markup-driven. |
| 2.4 | `<progress>` | âœ… cascade â€” done | UA chrome differs across every browser. Needs a value/max-driven fill via `::-webkit-progress-bar` and `::-moz-progress-bar` plus a fallback that variant-tracks. | Vendor pseudos live in the element file directly because the host can't expose tokens to them via inheritance â€” they're reasserted on each pseudo. |
| 2.5 | `<meter>` | âœ… cascade â€” done | Cousin of `<progress>` but with low/high/optimum semantics â€” fill color reads variant-by-zone (success / warning / danger) computed from attributes. | Vendor-pseudo styling on three Chromium pseudos + Firefox host pseudo-classes. |
| 2.6 | `<output>` | âœ… cascade (light) â€” done | Form result display. Inline by default; framework gives it monospace + subtle background option via a style-modifier-only path. | Lightweight â€” no border or padding by default; `.filled` gives pill chrome. |
| 2.7 | `<datalist>` | ðŸš« stays | Render is OS-controlled (autocomplete dropdown). No CSS surface to style. | Document the limitation in elements.md; await `appearance: base-select`-style opt-in. |
| 2.8 | `<option>`, `<optgroup>` | ðŸš« stays | Native popup, not stylable. Same limitation as datalist. | Will become reachable once `<select appearance="base-select">` lands stable. |

**Phase 2 deliverables (all rows):**

- For each âœ…: substantive `_{tag}.scss` with `--set-{tag}-*` token chain, TS entry in `elements.ts`, behavior test in `tests/src/styles/elements/_{tag}.test.ts`, showcase page in `app/browser/pages/`, route entry in `app/browser/router.ts`, status flip in `elements.md`.
- For each ðŸŸ¡: small partial wrapped in `@layer elements`, comment justifying the rule, no TS entry, no per-element test (parity tests still scan).
- One-line update to this file moving the row out of Phase 2 into Foundation.

---

## Phase 3 â€” Typographic content

Prose elements. Most are handled by Tailwind preflight (margin reset, line-height) but a few earn substantive treatment because they carry a recognizable "shape" beyond text:

| # | Element | Verdict | Why | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | `<h1>`â€“`<h6>` | ðŸŸ¡ â†’ âœ… cascade | Already a multi-tag partial with override. Promote to full cascade so a heading can wear `.primary` / `.large` / `.ghost` and pick up the variant tokens consistently with anchors. | `_h1-h6.scss` already exists; just expand the cascade. |
| 3.2 | `<hr>` | ðŸš« â†’ ðŸŸ¡ | Single-rule override: `--set-hr-color: var(--set-variant-background-color, currentColor)` + opacity. Lets `<hr class="primary">` paint a variant-colored divider. | No padding/border â€” just color tracking. |
| 3.3 | `<blockquote>` | ðŸš« â†’ ðŸŸ¡ | Override: leading vertical bar driven by variant color (`border-inline-start: 4px solid var(--set-variant-background-color)`), padding-inline, italic. | Tailwind preflight resets margin/quotes; we just add the bar. |
| 3.4 | `<code>`, `<kbd>`, `<samp>`, `<var>` | ðŸš« â†’ ðŸŸ¡ | Inline code/keyboard styling â€” monospace, subtle tinted background via `color-mix(in srgb, currentColor 8%, transparent)`. | Single rule per partial; no cascade. |
| 3.5 | `<pre>` | ðŸš« â†’ ðŸŸ¡ | Block code. Padding, overflow-x, monospace, subtle border. Consumes Tailwind's `--text-sm`. | Pairs with `<code>` semantically; tested together. |
| 3.6 | `<mark>` | ðŸŸ¡ â†’ ðŸŸ¡ (kept) | Already overrides UA `yellow`/`black` with system `mark`/`marktext`. No promotion needed. | Stays as-is. |
| 3.7 | `<abbr>` | ðŸŸ¡ â†’ ðŸŸ¡ (kept) | Already overrides with `cursor: help` + dotted underline normalization. | Stays as-is. |
| 3.8 | `<address>` | ðŸŸ¡ â†’ ðŸŸ¡ (kept) | Already overrides UA italic with `font-style: normal`. | Stays as-is. |
| 3.9 | `<dl>`, `<dt>`, `<dd>` | ðŸš« â†’ ðŸŸ¡ | Definition lists need a sane vertical rhythm â€” Tailwind preflight zeroes the margin and the bare list collapses. Add minimal vertical spacing tokens. | Single coupled partial set; one test. |
| 3.10 | `<ul>`, `<ol>`, `<li>` | ðŸš« stays | Tailwind preflight already strips the marker. Keep that â€” re-styling list markers is an opt-in component (e.g. `.list-disc`, `.list-decimal` are Tailwind utilities). | Document in elements.md. |
| 3.11 | `<p>` | ðŸŸ¡ â†’ ðŸŸ¡ (kept) | Already overrides with vertical rhythm (`margin-block-end: 1em`). No promotion needed. | Stays as-is. |
| 3.12 | `<q>`, `<cite>`, `<dfn>`, `<time>` | ðŸš« stays | UA defaults + Tailwind preflight handle inline phrasing perfectly. No framework rule earns its place. | Document in elements.md. |
| 3.13 | `<del>`, `<ins>`, `<s>`, `<u>` | ðŸš« stays | Browser-default strikethrough/underline are correct. No add-ons. | Document in elements.md. |
| 3.14 | `<sub>`, `<sup>`, `<small>`, `<strong>`, `<em>`, `<b>`, `<i>` | ðŸš« stays | Inline phrasing. UA + Tailwind preflight cover them entirely. | Document in elements.md. |
| 3.15 | `<bdi>`, `<bdo>`, `<wbr>`, `<rp>`, `<rt>`, `<ruby>` | ðŸš« stays | Bidi / ruby annotation. UA defaults are correct. | Document in elements.md. |

**Phase 3 deliverables:** every row above results in a one-line update to elements.md (verdict + rationale). Substantive promotions (3.1) get the full cascade treatment per the Phase 2 deliverable list.

---

## Phase 4 â€” Media & embeds

Once form controls and prose are done, media is the remaining substantive surface:

| # | Element | Verdict | Why | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | `<img>` | ðŸš« â†’ ðŸŸ¡ | Tailwind preflight already gives `display: block; max-width: 100%;`. Add `block-size: auto;` and `vertical-align: middle;` for the cases preflight misses. | Tiny override. |
| 4.2 | `<figure>` + `<figcaption>` | ðŸš« â†’ ðŸŸ¡ | Pair gets `gap`-driven vertical spacing + caption typography (smaller, muted). | Coupled partial pair. |
| 4.3 | `<video>`, `<audio>` | ðŸš« â†’ ðŸŸ¡ | UA media controls are stylable only via vendor pseudos; offer `display: block; max-width: 100%; border-radius` baseline so embedded media respects layout. | Cascade not earned â€” too few user-controllable surfaces. |
| 4.4 | `<iframe>`, `<embed>`, `<object>` | ðŸš« â†’ ðŸŸ¡ | Set `border: 0` and `max-width: 100%` so embeds don't blow out. | Tiny overrides. |
| 4.5 | `<canvas>`, `<svg>`, `<picture>`, `<math>` | ðŸš« stays | UA + preflight correct. | Document in elements.md. |

---

## Phase 5 â€” Sectioning & generic

Sectioning elements (`<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<hgroup>`, `<search>`) and generic boxes (`<div>`, `<span>`) earn no framework rule. They're semantic landmarks; their visual treatment is the consumer's job (or comes from a `<dialog>`/component composing them).

All stay ðŸš«. Their partials remain comment-only documentation.

---

## Phase 6 â€” Composables, components, surfaces, theming, distribution

Each of these is a multi-day effort with its own design pass. They're scoped here only to make the dependency order legible.

- **6.1 Composables** â€” `useVariant`, `useSize`, `useDialog`, `useDisclosure`, `usePopover`, `useFocusTrap`, `useReducedMotion`. First composable populates `events.ts`. Depends on Phase 2.3 (details) and Phase 2.x components having lifecycle to observe.
- **6.2 Components** â€” composed widgets (`card`, `alert`, `modal` (wraps `<dialog>` + composables), `dropdown`, `popover`, `tooltip`, `toast`). Each is a separate spec. Depends on 6.1.
- **6.3 Surfaces** â€” `[popover]`, `::placeholder`, `::marker`, `::file-selector-button`, `::picker(select)` once that ships, `::view-transition-*`, `::scrollbar-*`, anchor positioning. Catalog in [surfaces.md](surfaces.md). Each surface added is a small spec; depends on the elements it surrounds.
- **6.4 Theming beyond default** â€” additional `[data-theme="â€¦"]` blocks, dark-mode-aware tokens. Architecture is theme-friendly already; specific themes are content. Depends on Phase 1â€“4 being stable so a theme doesn't have to chase moving tokens.
- **6.5 Distribution polish** â€” published-package guidance in [styles.md](styles.md) Â§Distribution, `@source` ergonomics, dual-distribution (CSS + TS) build verification, NPM publish dry-run. Final phase before 1.0.

---

## Cross-cutting open questions

These come up in multiple phases; resolve once and reuse.

- **Placement vocabulary.** Today the dialog page demonstrates that non-modal dialogs flow inline at source position, but composed components (modal, popover, tooltip) need a real placement vocabulary (`top`, `bottom`, `start`, `end`, `top-start`, â€¦). Belongs in 6.3 surfaces but the modifier-class names should be locked in earlier â€” start a `modifiers/_placements.scss` partial in Phase 2.3 (details) so the surfaces consume an established vocabulary.
- **Loading state handoff.** `.loading` is in the state modifier set but no element interprets it yet. Decision needed: does `.loading` toggle a spinner pseudo-element, or just dim + cursor? Settle in Phase 2.4 (progress lands the spinner asset).
- **`appearance: base-select`.** Chromium 134+ ships a real anchor-positioned popover for `<select>`. Once Firefox + Safari catch up, the select chevron's hardcoded color goes away â€” the picker becomes a real surface in 6.3. Track support; revisit when â‰¥2 evergreens ship it.
- **Input validation states.** `:invalid` is the natural state to color the border with `--color-danger`. Decision: do we ship that automatically, or require an opt-in (`.validate`) modifier? Lean toward opt-in â€” automatic `:invalid` is too aggressive on initial render. Settle in Phase 3 retrospective.

---

## Element verdict roster

Single source of truth for "where does each tag stand?" Sorted alphabetically. Cross-references the phase that delivers each promotion.

| Tag | Current | Target | Phase |
| --- | --- | --- | --- |
| `<a>` | âœ… cascade | âœ… cascade | done |
| `<abbr>` | ðŸŸ¡ | ðŸŸ¡ | done (3.7) |
| `<address>` | ðŸŸ¡ | ðŸŸ¡ | done (3.8) |
| `<article>` | ðŸš« | ðŸš« | stays |
| `<aside>` | ðŸš« | ðŸš« | stays |
| `<audio>` | ðŸš« | ðŸŸ¡ | 4.3 |
| `<b>` | ðŸš« | ðŸš« | stays |
| `<bdi>`, `<bdo>` | ðŸš« | ðŸš« | stays |
| `<blockquote>` | ðŸš« | ðŸŸ¡ | 3.3 |
| `<body>` | ðŸš« | ðŸš« | stays |
| `<button>` | âœ… cascade | âœ… cascade | done |
| `<canvas>` | ðŸš« | ðŸš« | stays |
| `<caption>` | ðŸš« (folded into table) | covered | done (table) |
| `<cite>` | ðŸš« | ðŸš« | stays |
| `<code>` | ðŸš« | ðŸŸ¡ | 3.4 |
| `<col>`, `<colgroup>` | ðŸš« (folded into table) | covered | done (table) |
| `<data>` | ðŸš« | ðŸš« | stays |
| `<datalist>` | ðŸš« | ðŸš« | 2.7 (documented limitation) |
| `<dd>`, `<dl>`, `<dt>` | ðŸš« | ðŸŸ¡ | 3.9 |
| `<del>`, `<ins>`, `<s>`, `<u>` | ðŸš« | ðŸš« | stays (3.13) |
| `<details>` | ðŸš« | âœ… cascade | 2.3 |
| `<dfn>` | ðŸš« | ðŸš« | stays |
| `<dialog>` | âœ… cascade | âœ… cascade | done |
| `<div>`, `<span>` | ðŸš« | ðŸš« | stays |
| `<em>`, `<i>`, `<strong>` | ðŸš« | ðŸš« | stays |
| `<embed>` | ðŸš« | ðŸŸ¡ | 4.4 |
| `<fieldset>` + `<legend>` | ðŸŸ¡ | âœ… cascade | 2.2 |
| `<figcaption>`, `<figure>` | ðŸš« | ðŸŸ¡ | 4.2 |
| `<footer>`, `<header>`, `<main>`, `<nav>`, `<section>` | ðŸš« | ðŸš« | stays |
| `<form>` | ðŸš« | ðŸš« | stays (no chrome of its own) |
| `<h1>`â€“`<h6>` | ðŸŸ¡ | âœ… cascade | 3.1 |
| `<hgroup>` | ðŸš« | ðŸš« | stays |
| `<hr>` | ðŸš« | ðŸŸ¡ | 3.2 |
| `<html>` | ðŸš« | ðŸš« | stays |
| `<iframe>` | ðŸš« | ðŸŸ¡ | 4.4 |
| `<img>` | ðŸš« | ðŸŸ¡ | 4.1 |
| `<input>` | âœ… cascade | âœ… cascade | done |
| `<kbd>` | ðŸš« | ðŸŸ¡ | 3.4 |
| `<label>` | ðŸš« | âœ… cascade (light) | 2.1 |
| `<li>` | ðŸš« | ðŸš« | stays (3.10) |
| `<map>`, `<area>` | ðŸš« | ðŸš« | stays |
| `<mark>` | ðŸŸ¡ | ðŸŸ¡ | done (3.6) |
| `<math>` | ðŸš« | ðŸš« | stays |
| `<menu>` | ðŸš« | ðŸš« | stays |
| `<meter>` | ðŸš« | âœ… cascade | 2.5 |
| `<object>` | ðŸš« | ðŸŸ¡ | 4.4 |
| `<ol>`, `<ul>` | ðŸš« | ðŸš« | stays (3.10) |
| `<optgroup>`, `<option>` | ðŸš« | ðŸš« | 2.8 (documented limitation) |
| `<output>` | ðŸš« | âœ… cascade (light) | 2.6 |
| `<p>` | ðŸŸ¡ | ðŸŸ¡ | done (3.11) |
| `<picture>` | ðŸš« | ðŸš« | stays |
| `<pre>` | ðŸš« | ðŸŸ¡ | 3.5 |
| `<progress>` | ðŸš« | âœ… cascade | 2.4 |
| `<q>` | ðŸš« | ðŸš« | stays |
| `<rp>`, `<rt>`, `<ruby>` | ðŸš« | ðŸš« | stays (3.15) |
| `<samp>` | ðŸš« | ðŸŸ¡ | 3.4 |
| `<search>` | ðŸš« | ðŸš« | stays |
| `<select>` | âœ… cascade | âœ… cascade | done |
| `<small>` | ðŸš« | ðŸš« | stays |
| `<sub>`, `<sup>` | ðŸš« | ðŸš« | stays |
| `<summary>` | ðŸš« | âœ… cascade (with details) | 2.3 |
| `<svg>` | ðŸš« | ðŸš« | stays |
| `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<td>`, `<th>` | âœ… cascade | âœ… cascade | done |
| `<textarea>` | âœ… cascade | âœ… cascade | done |
| `<time>` | ðŸš« | ðŸš« | stays |
| `<var>` | ðŸš« | ðŸŸ¡ | 3.4 |
| `<video>` | ðŸš« | ðŸŸ¡ | 4.3 |
| `<wbr>` | ðŸš« | ðŸš« | stays |

**Tally after all phases:**

- âœ… cascade: 14 elements (button, a, input, textarea, select, dialog, table-family-7, label, fieldset+legend, details+summary, progress, meter, output, h1-h6).
- ðŸŸ¡ override: 16 (abbr, address, mark, p, h1-h6 [if kept as override â€” actually promoted], hr, blockquote, code, kbd, samp, var, pre, dl/dt/dd, img, figure/figcaption, video/audio, iframe/embed/object).
- ðŸš« stays: ~63 elements â€” the long tail of inline phrasing, sectioning, metadata, void / inert content.

(Counts double-count multi-tag partials like h1-h6 and table-family deliberately, since each tag is its own consumer surface.)

---

## Deferred / later

Items the foundation phase deliberately doesn't include. Each becomes its own spec when its time comes (most map to Phase 6 above).

- **Composables** (`useVariant`, `useSize`, `usePopover`, `useDialog`, â€¦). [`src/browser/events.ts`](../src/browser/events.ts) ships empty with the naming convention locked in (`elements:{source}:{verb}` + a fixed lifecycle vocabulary). First composable is what makes that surface non-trivial.
- **Components** â€” composed widgets (card, alert, modal, dropdown, â€¦). Folder + barrel exist; no entries yet. Convention is documented in [components.md](components.md).
- **Surfaces** â€” `::placeholder`, `::marker`, `::file-selector-button`, view transitions, scroll-driven animations, anchor positioning, `::picker(select)`. `_backdrop.scss`, `_popover.scss`, and `_scrollbar.scss` are shipped today. Catalog in [surfaces.md](surfaces.md).
- **Theming beyond default** â€” additional `[data-theme="â€¦"]` blocks or `[data-core="â€¦"]` palettes. The `--color-*` and `--set-*` namespaces are theme-friendly today; specific themes are content, not architecture.
- **Distribution polish** â€” published-package guidance for consumers in [styles.md](styles.md) Â§Distribution remains a sketch until we publish a real version.
- **`@source` ergonomics** â€” Tailwind v4's tree-shake means scale tokens like `--text-sm` and `--radius-lg` aren't on `:root` unless their utility class is generated. Modifier files currently use rem literals (see [tokens.md](tokens.md) Â§"Tailwind tree-shake"). Worth revisiting if Tailwind ships a `@theme static` opt-out.

---

## Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide (token surface change â†’ `tokens.md`; new element â†’ `elements.md`; new mixin â†’ `mixins.md`; etc.).
2. This file's tables â€” move the row out of the upcoming-phase table into Foundation, update the verdict roster, bump the test count.

Don't wait for a "doc pass" â€” out-of-date status is worse than missing status.

When picking the next thing to work on, prefer the lowest-numbered row in the next-up phase that doesn't have a hard dependency on something later. Phases 2 and 3 can interleave once 2.1â€“2.3 are done â€” typography promotion (3.1) is independent of progress/meter (2.4â€“2.5).

