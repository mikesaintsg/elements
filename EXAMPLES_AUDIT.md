# Example-pages audit — framework gaps + cleanup notes

> Companion to `STATECHART_EVENT_AUDIT.md`. That doc audits the JS-side
> statechart event vocabulary; this one audits the CSS-side authoring
> contract across `app/browser/examples/*.vue`.
>
> **Status (round 2):** the four framework-gap recommendations at the
> end of this doc have landed. See `## Framework gaps — resolved` near
> the bottom for the per-fix landing notes.

## Scope

Eight example pages assemble framework elements + modifiers into
full-page applications (Mail, Console, CRM, Editorial, Pricing,
Settings, Sign-in, Board). They are the framework's reference for
what real apps look like when authored "with the grain of the web".
Anything they need that the framework doesn't already provide
surfaces as **inline styles**, **`<style scoped>` blocks**, or
**hardcoded color tokens** — each of which is a smell.

Auditing tactic: grep every `style="…"` + `<style>` block + raw
token reference, then categorise:

1. **Genuinely dynamic** (data-bound value, can't be a class).
2. **Framework token tune** (legitimate per-app override).
3. **Framework gap** (the framework should provide this).
4. **App-logic chrome** (per-example layout / behaviour that
   doesn't belong in the example template).

## Findings, by category

### A. Genuinely dynamic — keep inline

| Site | Inline | Why it's fine |
|---|---|---|
| `ConsoleExample.vue` sparkline | `:style="height: ${bar.value}%; background-color: var(--color-${bar.forecast ? 'information' : 'primary'}); opacity: ${...}"` | Per-bar height + forecast tint vary per data point. A class can't carry the dynamic height; the variant + opacity stay coupled to the height in one expression. |
| `ExamplesShell.vue` icon glyph picker | `style="--icon: var(--set-icon-${name})"` | The chrome's example switcher binds an icon per route item dynamically. |
| `ExamplesShell.vue` copy-button glyph | `:style="--icon: var(--set-icon-${copied ? 'check' : 'copy'})"` | Two-state animated icon swap. |

### B. Framework token tunes — promoted to `.examples-{name}-*` classes

| Was | Now | Class home |
|---|---|---|
| `style="--set-main-padding-inline: 0; --set-main-padding-block: 0"` | `class="examples-mail-main"` | `examples.css` |
| `<div class="panes" style="--set-panes-aside-size: 24rem">` | `class="examples-mail-main > div.panes"` token block | `examples.css` |
| `<div class="split flip" style="--set-split-gap: 3rem">` | `class="examples-editorial-hero"` | `examples.css` |
| `<div class="tiles fill" style="--set-tiles-min: 14rem">` | `class="examples-pricing-metrics"` | `examples.css` |
| `<div class="tiles fill" style="--set-tiles-min: 18rem">` | `class="examples-pricing-plans"` | `examples.css` |

These were legitimate uses of the framework's token-override
mechanism, but inline `style="--set-X: Y"` reads like the example is
fighting the framework. Promoting to a namespaced class makes the
per-app tune explicit and refactorable.

### C. Framework gaps — example-side workaround in place

| Site | Workaround | Framework should provide |
|---|---|---|
| `PricingExample` metric value | `.examples-pricing-metric { color: var(--color-primary); }` | A text-color-only variant modifier (`text-{variant}` or similar). The framework's variant modifiers (`.primary` / `.success`) currently tune surface tokens (background + border) — there's no "this element's TEXT color is the variant" shape. Adding it would let `<strong class="primary">$24</strong>` work without a wrapper class. |
| `PricingExample` check icons | `.examples-pricing-check { color: var(--color-success); }` | Same gap. The icon primitive paints with `currentColor`, so a text-color variant modifier would make `<i class="icon check success">` colorise the glyph green. Today the GLYPH-name slot (`.success` = success-named glyph) collides with the variant-modifier slot. |
| `BoardExample` draggable cards | `.examples-board-card { cursor: grab; }` | `src/styles/composables/_drag.scss` doesn't exist yet. Every `useDrag` source-host should carry a `cursor: grab` hint by default (and switch to `grabbing` on `:active`). Adding a `_drag.scss` partial that paints the cursor on `[data-drag-source]` (set by the factory) would remove the per-example need. |
| `MailExample` mobile `.panes` layout | `.examples-mail-main` carries the mobile fill-and-scroll rules | The framework's `.panes` primitive applies the desktop fill rules at `≥ 64rem` only and assumes flow-mode below; this is mostly the right call (some app layouts WANT shrink-to-fit panes on mobile), but the mail-app shape is common enough that a `.panes.fill` modifier could opt into the desktop rules at every breakpoint. |
| `ConsoleExample` activity dot | `.examples-console-activity-dot { margin-block-start: 0.4rem; }` | `<span class="dot">` doesn't currently consume a `--set-dot-baseline-offset` token; the alignment is hardcoded. Either every dot baselines to the centre of the line-height (would need an `align-self`-based fix) or the dot exposes a baseline-offset token for callers that need to align to multi-line text. |

### D. App-logic chrome — extracted to `examples.css`

| Site | Was | Now |
|---|---|---|
| `MailExample` `<style scoped>` block | inline scoped style with mobile `.panes` layout fix | `examples.css` under `.examples-mail-main`, no `<style>` block in the example file |
| `MailExample` per-row `rowStyle()` Vue function | a `:style="rowStyle(message)"` Vue computed building border + bg from `selectedId.value` | `examples.css` under `.examples-mail-row > button[aria-current="true"]` — keyed off the `aria-current` attribute Vue already binds, so no Vue computed needed |

### E. Already-clean — no changes

- `ExamplesShell.vue`'s dynamic icon bindings — necessary for the
  docs chrome's example switcher.
- The `<a>` / `<label>` / `<button>` / `<dialog>` / `<form>` /
  `<input>` / `<table>` element baselines + variant modifiers —
  the example bodies use these as-is without overrides.

## Authoring contract — new gate

Two test gates added to `tests/app/browser/pages.test.ts`:

1. **`example bodies — no inline `style="…"` beyond the §2 exemptions`**
   — applies the same exemption rules the page wrappers already
   follow (token assignments, off-scale dimensional one-offs) to the
   per-example `{Name}Example.vue` bodies. The original gate only
   policed wrappers; bodies were silently allowed to drift.
2. **`example bodies — no `<style>` blocks (app logic belongs in
   examples.css)`** — forbids any `<style>` block (scoped or
   unscoped) inside an example body. Per-example chrome MUST live in
   `app/browser/styles/examples.css` under a `.examples-{name}-*`
   namespace.

Failure modes the gates now catch:

- A `style="cursor: grab"` would fail — `cursor` is neither a token
  declaration nor an off-scale dimensional value.
- A `<style scoped>` block (even with a `.examples-*` class) would
  fail — examples are zero-CSS authoring surfaces.

## Recommendations to the framework

(For future PRs, not in scope for this audit.)

1. **Text-color variant modifier** — add `.text-{variant}` (or
   reuse `.{variant}` on text-leaf elements) that sets `color` from
   the variant on-canvas token. Would resolve the
   `examples-pricing-metric` and `examples-pricing-check` gaps and
   replace the ad-hoc `color: var(--color-X)` pattern everywhere.
2. **`createDrag` cursor hint** — ship a
   `src/styles/composables/_drag.scss` partial that paints
   `cursor: grab` on `[data-drag-source]` (set by the factory) and
   `cursor: grabbing` on `:active` / `[data-dragging]`. Would resolve
   the `examples-board-card` gap.
3. **`.panes.fill` modifier** — opt into the desktop fill-and-scroll
   layout at every breakpoint. Would resolve the `examples-mail-main`
   mobile-layout workaround; mail-style apps wouldn't need any
   per-example CSS.
4. **Dot baseline-offset token** — expose `--set-dot-baseline-offset`
   on `<span class="dot">` so list rows aligning a dot with the
   first line of multi-line text don't have to nudge inline. Would
   resolve the `examples-console-activity-dot` gap.

Items 1–4 are all *additive* — no breaking changes, just framework
features that would shrink the per-example chrome surface. The
existing `.examples-{name}-*` classes documented above can be the
acceptance criteria when each framework feature lands.

## Framework gaps — resolved

Round 2 of this audit landed all four gaps. Per-fix notes:

### 1. Icon variant-color cascade — `src/styles/elements/_i.scss`

`<i class="icon">` now consumes `--set-variant-on-canvas-color` for
its `color` (falling through to the inherited `currentColor` when no
variant token is in scope). The mask still paints with
`background-color: currentColor`, so the color cascade flows through
in one step.

Authoring shape (idiomatic):

```html
<span class="success">
    <i class="icon check" aria-hidden="true"></i>
</span>
```

The wrapper carries the variant class so the variant token cascades
into the icon without colliding with the framework's variant-named
glyph slot (`.success` on `<i class="icon">` would swap the GLYPH to
the success badge — that's by design and still works for "show the
framework's success badge" usage). The wrapper's text content stays
at the inherited body color because `.success` doesn't set `color`
directly — only token cascades.

`.examples-pricing-check` removed (was `color: var(--color-success)`
on the icon).

### 2. Drag cursor + drop-indicator chrome — `src/styles/composables/_drag.scss`

New composable partial paints:

- `cursor: grab` on every `[draggable="true"]` row the framework
  produces (the `createDrag` factory writes `row.draggable = true`).
- `cursor: grabbing` while the pointer is held + while the source
  row is mid-drag (`.dragging` class).
- A 50% opacity dim on the source row mid-drag (visual anchor for
  the destination).
- A subtle `--color-primary` tint on the `[data-index].drop-target`
  row currently under the pointer.
- 2px primary-color insertion bars on
  `[data-index].drop-indicator-before::before` and
  `[data-index].drop-indicator-after::after`.

The new `COMPOSABLE_CONTRACTS.drag` entry in `src/browser/patterns.ts`
records the contract — no required tokens, factory `createDrag`,
class-state selectors. The pages-test gate for `_{name}.scss ↔
use-{name}` was satisfied by renaming the existing combined route
`use-drag-drop` to `use-drag` (the page itself still demos both
useDrag + useDrop because the two are inherently paired — the
`COMPOUND` map in `tests/app/core/router.test.ts` reflects this).

`.examples-board-card` removed (was `cursor: grab` on the article).

### 3. `.panes.fill` modifier — `src/styles/components/_div.scss`

The framework's `.panes` primitive already applied a desktop ≥ 64rem
`block-size: 100%` + `overflow: hidden` + `overflow-y: auto on the
body` block. The `.fill` opt-in modifier extends those rules to every
breakpoint:

- `.panes.fill` itself takes `block-size: 100%` at all widths.
- At < 64rem, `.panes.fill > .pane` takes `block-size: 100%` +
  `overflow: hidden`, and `.panes.fill > .pane > .fluid` takes
  `overflow-y: auto` + `overflow-x: hidden`.

The shape matches what mail / IDE / three-pane consoles want on
mobile (sticky header + sticky footer + scrolling body inside a
fixed-height pane), without imposing it on every `.panes` consumer.

`MailExample.vue` uses `<div class="panes fill">`; the previous
example-side `.examples-mail-main > div.panes` mobile-mode override
in `examples.css` is gone.

### 4. `--set-dot-baseline-offset` token — `src/styles/components/_dot.scss`

`.dot` now exposes `--set-dot-baseline-offset` (default `0`), consumed
as `margin-block-start`. Lets a caller nudge the dot vertically to
align with the optical centre of a multi-line text block in a flex
row (the default `align-items: flex-start` puts the dot at the
cap-height of the first line, which reads as too high).

`tokens.dot.baselineOffset` mirrors the token in the TS surface
(`src/browser/tokens.ts`).

`.examples-console-activity-dot` now sets the framework token
(`--set-dot-baseline-offset: 0.4rem`) instead of `margin-block-start`
directly — same visual, framework-idiomatic.

### Outstanding (not closed by this round)

- **Text-color variant on `<strong>`** — the framework's `<strong>`
  baseline deliberately doesn't take a variant fallback (per
  `elements/_strong.scss` § "strong is part of the prose and should
  respect prose color discipline"). The PricingExample metric value
  (`<strong class="text-5xl examples-pricing-metric">$24</strong>`)
  is therefore staying on the `.examples-pricing-metric` class — a
  per-example display-number color decision rather than a general
  framework gap. The original recommendation (#1) is partially
  resolved (icon side closed; strong side left intentional).
