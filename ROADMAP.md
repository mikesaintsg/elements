# Roadmap — the `reveal` modifier

> A phased, implementation-ready plan for adding a **reveal-on-hover** button
> modifier to the framework: an icon button whose text label is collapsed at
> rest and expands on `:hover` / `:focus-visible` (and an opt-in always-shown
> state). Modelled on the mailbox reference's `.btn-reveal` family, re-expressed
> through this framework's element-local-modifier + token + mixin vocabulary,
> and hardened for **both desktop and touch**.

This document is the single source of truth for the feature until it ships. It
exists because the mechanism is subtle: mailbox's implementation took several
iterations, still has rough edges (group hand-off flicker, label measurement),
and leans on a `0fr → 1fr` grid-track animation that is easy to get wrong. We
plan it fully before writing a line of shipping CSS.

---

## 1. Motivation

A collapsed navigation rail or a dense toolbar wants buttons that read as a
single glyph but announce their meaning on hover/focus — the icon is always
visible, the label slides out when the pointer (or keyboard focus) lands. Today
a consumer can only choose between **icon-only** (`<button aria-label>` — no
visible text, looks unlabelled at rest) or **icon + permanent label** (always
wide). `reveal` fills the gap: icon at rest, icon + label on engagement, with
the width animating smoothly so neighbouring layout settles.

Until this ships, examples must use **permanently-labelled** buttons (icon +
visible text) or genuinely-iconographic buttons (`×` close, `☰` menu) with
`aria-label`. Do **not** fake reveal by hiding text with `hidden`/`sr-only` —
that produces an unlabelled-looking button with none of the hover affordance,
which is the exact anti-pattern this modifier replaces.

---

## 2. How mailbox does it (reference analysis)

Source: `mailbox/src/styles/_buttons.scss` (`.btn-reveal*`),
`_nav.scss` (`.nav-button.btn-reveal*` re-emission), `_mixins.scss`
(`reveal`, `reveal-revealed`, `reveal-label`, `reveal-revealed-label`).

**Markup contract**

```html
<button class="btn btn-primary btn-reveal">
  <i class="bi bi-plus-lg" aria-hidden="true"></i>
  <span class="btn-label">Add new</span>
</button>
```

**Layout mechanism** — the button becomes a two-track grid:

- Idle (`reveal` mixin): `display: inline-grid; grid-template-columns: auto 0fr;
  column-gap: 0`. The icon sits in the `auto` track; the label sits in the
  collapsed `0fr` track.
- Label slot (`reveal-label` mixin): `min-inline-size: 0; overflow: hidden;
  white-space: nowrap; opacity: 0`. The `min-inline-size: 0` is **load-bearing**
  — without it the label's `min-content` width fights the `0fr` track and the
  column never collapses.
- Revealed (`reveal-revealed`, on `:hover, :focus-visible, .show`):
  `grid-template-columns: auto 1fr; column-gap: var(--bs-btn-reveal-gap)`.
- Revealed label (`reveal-revealed-label`): `opacity: 1`.

**Asymmetric timing** — entry is fast with no delay (decelerate easing); exit is
slower with a delay (so a mouse drifting across the button doesn't blank the
label instantly). Tunables: `--bs-btn-reveal-{in,out}-duration`,
`--bs-btn-reveal-out-delay`, `--bs-btn-reveal-gap`.

**Variants mailbox ships (and our verdict):**

| mailbox feature | what it does | our plan |
| --- | --- | --- |
| `.btn-reveal` | always reveal-on-hover | **Phase 1** — base `button.reveal` |
| `.btn-reveal-end` | label reveals to the inline-start (icon on the right) | **Phase 2** — `button.reveal.end` (compose the single-word `.end` placement modifier, not a hyphenated name) |
| `.btn-reveal-{sm,md,lg,xl}` | reveal only ≥ breakpoint; below, icon+label both shown | **Reframed** — see §5 (we defer responsive to Tailwind / container queries, not baked breakpoint classes) |
| `.btn-reveal-group` exclusive hand-off | one-revealed-at-a-time with `:is(:hover,:focus-within)` + 220ms out-delay to prevent flicker | **Phase 3** — opt-in, the hardest part |

**Known mailbox rough edges to design around:**

1. **Group hand-off flicker.** mailbox switched from `:has(.btn-reveal:hover)`
   to `.btn-reveal-group:is(:hover, :focus-within)` because `:has` went false in
   the gap between siblings and the `.show` button re-revealed mid-traversal.
   We adopt the `:is(:hover, :focus-within)` solution from the start.
2. **Source-order / specificity tie with `.nav-button`.** mailbox re-emits the
   whole reveal contract under `.nav-button.btn-reveal*` at higher specificity
   because `_buttons.scss` loads before `_nav.scss`. We avoid this entirely:
   our modifier lives in `@layer modifiers`, which beats `@layer elements` and
   `@layer components` by cascade-layer order regardless of source order. **No
   re-emission needed** — this is a concrete win from our layer architecture.
3. **Label measurement.** The `0fr → 1fr` animation animates the *track*, not a
   pixel width, so it works without JS measuring the label. Keep that — never
   reach for a JS width measurement.

---

## 3. How it maps onto THIS framework

### 3.1 Classification — element-local modifier

`reveal` only makes sense on a `<button>` (and possibly `<a>` styled as a
button). It is **not** one of the five cross-cutting dimensions (variant / size
/ style / state / placement), so per `guides/modifiers.md` §Contract.7 and
`AGENTS.md` §21.4 it is an **element-local modifier** living in
[`src/styles/modifiers/_local.scss`](src/styles/modifiers/_local.scss) as the
compound selector `button.reveal`. It is **not** registered in
`src/browser/modifiers.ts` (that file is the five frozen dimensions only); it is
governed instead by `tests/src/styles/modifiers/_local.test.ts`.

Precedent in `_local.scss` confirms the shapes we need are already permitted:
`form.row > label` (descendant combinator), `button.dropdown::after`
(pseudo-element), `:has()` sibling rules, and documented charter exceptions for
selectors that don't match the bare `{tag}.{name}` regex.

### 3.2 The label-slot — no bespoke class

mailbox uses `.btn-label`. This framework forbids bespoke component classes, so
the label slot is the button's **plain child `<span>`** and the icon is the
existing `<i class="icon">`. The collapse targets `button.reveal > span`:

```html
<button type="button" class="reveal primary">
  <i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
  <span>New invoice</span>
</button>
```

The label is always in the DOM (so it is always in the accessibility tree — the
button is **never** unlabelled, even collapsed). Only its visual track collapses.
Open question O-1 (§9): if a button has more than one non-icon child, scope the
collapse to the last child or require exactly one `<span>`. Decision for Phase 1:
**require exactly one `<span>` label child**; document it; the rule targets
`button.reveal > span`.

### 3.3 Token surface

Declared on the `<button>` token surface in
[`src/styles/elements/_button.scss`](src/styles/elements/_button.scss) (the
element that owns them), consumed from `_local.scss`, mirrored 1:1 in
[`src/browser/tokens.ts`](src/browser/tokens.ts) (`button.reveal*` leaves) so the
`tests/src/browser/tokens.test.ts` parity gate stays green:

```scss
--set-button-reveal-gap: calc(var(--spacing) * 1.5);          // 0.375rem-ish, factor-aware
--set-button-reveal-transition-duration-in: var(--set-transition-duration);
--set-button-reveal-transition-duration-out: calc(var(--set-transition-duration) * 1.4);
--set-button-reveal-transition-delay-out: 120ms;
```

Naming follows §21.3: last segment is a real CSS property key
(`transition-duration`, `transition-delay`) with an `in` / `out` modifier. **No
new easing tokens** — we reuse the framework's existing transition timing
function; mailbox's three-easing system is out of scope.

### 3.4 Mixins

Add to [`src/styles/_mixins.scss`](src/styles/_mixins.scss) so the contract is
single-sourced and reusable if `a.reveal` (Phase 2) is added:

- `reveal($end: false)` — idle grid (`auto 0fr`, gap 0, the out transition).
- `reveal-revealed($end: false)` — revealed grid (`auto 1fr`, gap restored, the
  in transition).
- `reveal-label` — idle label slot (`min-inline-size: 0; overflow: hidden;
  white-space: nowrap; opacity: 0`).
- `reveal-revealed-label` — revealed label (`opacity: 1`).

Each transition goes through the existing `transition()` mixin so the
`prefers-reduced-motion: reduce` opt-out is emitted automatically (§21.8).

### 3.5 Phase-1 SCSS (target shape)

```scss
@layer modifiers {
  button.reveal {
    @include reveal;
  }
  button.reveal > span {
    @include reveal-label;
  }
  button.reveal:hover,
  button.reveal:focus-visible {
    @include reveal-revealed;
  }
  button.reveal:hover > span,
  button.reveal:focus-visible > span {
    @include reveal-revealed-label;
  }
}
```

`.show` (always-revealed, controlled) is added in Phase 3 alongside the group
behavior; Phase 1 ships hover/focus only.

---

## 4. Accessibility

- **Never unlabelled.** The `<span>` label stays in the DOM and the a11y tree at
  all times; collapse is purely visual. No `aria-label` needed, though a
  redundant one is harmless.
- **Keyboard parity.** `:focus-visible` reveals exactly like `:hover`, so
  keyboard and switch users get the label on focus. Tab order is unaffected.
- **Reduced motion.** Via the `transition()` mixin, `prefers-reduced-motion:
  reduce` collapses the animation to an instant state change — the label still
  appears on hover/focus, just without the slide.
- **Forced colors.** No special handling needed (the modifier paints no color);
  the button's own `forced-colors` chrome from `_button.scss` is untouched.
- **Hit area.** The collapsed button must keep a ≥ 24×24 (ideally 44×44 on
  touch) target. Because touch shows the full label (§5), the collapsed target
  size only matters on pointer-fine devices where it is already a comfortable
  icon button.

---

## 5. Desktop vs mobile / touch — the critical reconciliation

Reveal-on-hover is meaningless on touch (no hover; the first tap would have to
both reveal AND activate). mailbox solved this by gating reveal behind
min-width **breakpoint** classes (`.btn-reveal-md`), so below the breakpoint the
label is always shown. We take a cleaner, capability-based route that fits this
framework's "defer responsive to the consumer" philosophy:

**Gate the collapse behind pointer/hover capability, not viewport width:**

```scss
@layer modifiers {
  // Always-expanded baseline: on touch / coarse pointers the label is shown
  // permanently (icon + label), so the button is never a mystery glyph.
  button.reveal {
    display: inline-grid;
    grid-template-columns: auto auto;   // both tracks intrinsic == expanded
    column-gap: var(--set-button-reveal-gap);
    align-items: center;
  }
  button.reveal > span { min-inline-size: 0; }

  // Collapse-on-rest only where a fine pointer can hover to reveal.
  @media (hover: hover) and (pointer: fine) {
    button.reveal { @include reveal; }            // auto 0fr at rest
    button.reveal > span { @include reveal-label; }
    button.reveal:hover,
    button.reveal:focus-visible { @include reveal-revealed; }
    button.reveal:hover > span,
    button.reveal:focus-visible > span { @include reveal-revealed-label; }
  }
}
```

Result:

- **Desktop (mouse / trackpad):** icon at rest, label slides out on hover/focus.
- **Touch (phone / tablet):** icon + label always shown — no broken hover, no
  unlabelled glyph, full target size. This is the correct degradation and is
  superior to mailbox's width-breakpoint approach (which mislabels a small
  desktop window as "mobile" and a large touch screen as "desktop").
- **Keyboard on desktop:** focus reveals (covered by the `hover: hover` block,
  since such machines report `pointer: fine`). Keyboard-only on a touch device
  shows the always-expanded baseline — also fine.

Consumers who still want viewport-conditional reveal can wrap with their own
Tailwind responsive utilities or a container query around the rail; we do **not**
bake `-sm/-md/-lg` modifier variants (Tailwind owns responsive — `AGENTS.md`
§21.4 "No `.huge` size" reasoning).

---

## 6. Showcase / examples integration

Once Phase 1 ships, adopt `reveal` in:

- A **collapsed navigation rail** variant (a new or existing app-shell example):
  the rail sits at icon width and each `<menu>` row's button reveals its label on
  hover — the canonical use case. On touch the rail shows full labels.
- The Console toolbar's secondary actions, if a denser default is wanted (Filter
  / Sort collapse to glyphs on desktop, full labels on touch).

A dedicated **ButtonPage** showcase section demonstrates: base reveal, reveal in
a vertical rail, reveal.end (Phase 2), and the reduced-motion + touch fallbacks.

---

## 7. Phasing

> **Status (shipped):** Phase 1 ✅ and Phase 2 ✅ are implemented and green.
> Phase 3 is intentionally **deferred** per its own gating rule below (no
> concrete consumer yet; building it now would expand the public API without
> multi-site need — `AGENTS.md` §20). The `$end` parameter already threads
> through the mixins, so Phase 3's `.show` / group work composes on top without
> reshaping the contract.

**Phase 1 — base `button.reveal` (ship first). ✅ Shipped.**
Tokens (§3.3) + mixins (§3.4) + the capability-gated SCSS (§5) + `tokens.ts`
parity + `guides/modifiers.md` element-local section + ButtonPage demo +
`_local.test.ts` / `tokens.test.ts` green. Adopt in one collapsed-rail example.
Landed as:

- Tokens: `--set-button-reveal-{gap, transition-duration-in, transition-duration-out, transition-delay-out}`
  on `:root` in [`elements/_button.scss`](src/styles/elements/_button.scss),
  mirrored at `tokens.button.reveal.*` in [`tokens.ts`](src/browser/tokens.ts).
- Mixins: `reveal` / `reveal-revealed` / `reveal-label` / `reveal-revealed-label`
  in [`_mixins.scss`](src/styles/_mixins.scss) (documented in `guides/mixins.md`).
- SCSS: `button.reveal` in [`modifiers/_local.scss`](src/styles/modifiers/_local.scss),
  always-expanded baseline + collapse gated behind
  `@media (hover: hover) and (pointer: fine)`.
- Parity: `(button, span)` pairing added to `STRUCTURAL_PAIRINGS`
  ([`patterns.ts`](src/browser/patterns.ts)); behavioural test
  [`_reveal.test.ts`](tests/src/styles/modifiers/_reveal.test.ts).
- Showcase: the `#button-reveal` section in
  [`ButtonPage.vue`](app/browser/pages/ButtonPage.vue) (base reveal, collapsed
  rail, reduced-motion + touch note).

**Phase 2 — `button.reveal.end`. ✅ Shipped.**
Direction reuses the single-word `.end` placement modifier (the same
`.start` / `.end` / `.top` / `.bottom` vocabulary `<aside>` / `<nav>` drawers
and `<output>` toasts compose) rather than a hyphenated `.reveal-end` — so the
framework keeps zero multi-word element-local modifiers. `button.reveal.end`
drives the `$end: true` mixin branch (label reveals to the inline-start) and
pins the label `<span>` to a definite leading cell so the icon auto-trails — no
`(button, i)` pairing needed. `position-area` is a no-op on the non-popover
button, so composing `.end` doesn't collide with the popover-placement rule.
Demoed in the same ButtonPage section.

**Phase 3 — controlled `.show` + exclusive group. ⏸ Deferred (by design).**
`button.reveal.show` (always revealed, JS/state-controlled) and the
`div.reveal-group` exclusive hand-off (`:is(:hover, :focus-within)` +
extended out-delay). This is the hardest part and the one mailbox still has not
perfected — treat as research-grade, gate behind its own design note before
implementation, and only build it if a concrete consumer needs it.

---

## 8. Test & parity plan

- `tests/src/browser/tokens.test.ts` — every new `--set-button-reveal-*` leaf
  resolves at runtime and appears in `tokens.ts` (bidirectional).
- `tests/src/styles/modifiers/_local.test.ts` — `button.reveal` matches the
  element-local charter; the `> span` descendant rule is a documented exception
  like `form.row > label`.
- `tests/guides/tokens.test.ts` — new token segments pass the kebab-case +
  no-abbreviation gate (`transition-duration`, not `dur`).
- New behavioral browser test (`tests/src/styles/modifiers/_reveal.test.ts`):
  - At rest under `(hover: hover)`, the label track computes to `0fr` /
    label `opacity: 0`.
  - On `:focus-visible`, the label track expands and `opacity: 1`.
  - Under an emulated coarse pointer, the label is shown at rest (baseline).
  - `prefers-reduced-motion: reduce` removes the transition.
- `npm run check` + `npm run format` + `npm run show` clean before commit.

---

## 9. Open questions

- **O-1 label slot:** require exactly one `<span>` label child (Phase 1 decision)
  vs. collapse the last child generically. Chosen: require one `<span>`; revisit
  if a real consumer needs an icon-on-both-sides shape.
- **O-2 `<a class="reveal">`:** anchors styled as buttons may want reveal too. The
  mixins are already element-agnostic; add `a.reveal` in Phase 2 only if a
  consumer appears (YAGNI until then).
- **O-3 group primitive:** `div.reveal-group` vs a `[data-reveal-group]` host.
  Prefer the bare element-local-style class to stay class-driven; settle in the
  Phase 3 design note.
- **O-4 size interplay:** confirm `reveal` composes with `.small` / `.large`
  (the grid + gap should ride the size tokens). Add a parity demo.

---

## 10. Risks

- **Track-collapse fragility.** The `min-inline-size: 0` on the label is
  essential; omitting it silently breaks the collapse. Covered by a behavioral
  test asserting the `0fr` computed track.
- **Layout jank in flex/grid parents.** A reveal button inside a `flex` rail
  changes intrinsic width on hover, nudging siblings. Mitigate by recommending
  the button live in a fixed-width rail track (the collapsed-rail example
  demonstrates the correct host) and documenting the caveat.
- **Scope creep into Phase 3.** The exclusive-group behavior is where mailbox
  still struggles. Keep Phases 1–2 shippable on their own; do not block them on
  the group work.
