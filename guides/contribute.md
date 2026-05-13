# Contributing to Elements

> The workflow document for humans and agents. The **what** lives in the spec guides; the **rules** live in [`AGENTS.md`](../AGENTS.md); the **current roster of work** lives in [`plan.md`](plan.md). This document is **how to actually do the work**.

---

## 1. What this project is

`elements` is a **semantic-first CSS framework** layered on **Tailwind v4** via `@tailwindcss/postcss`. You write `<button class="primary large">`, not `.btn-primary-lg`. The tag carries identity; modifier classes carry variation.

The framework ships in two halves that mirror each other:

- **SCSS bundle** (`src/styles/`) — one partial per HTML element + per-class component + per-pseudo surface + per-composable chrome.
- **TypeScript public API** (`src/browser/`) — every CSS identifier consumers programmatically reach for has a typed mirror: [`tokens.ts`](../src/browser/tokens.ts), [`modifiers.ts`](../src/browser/modifiers.ts), [`elements.ts`](../src/browser/elements.ts), [`taxonomy.ts`](../src/browser/taxonomy.ts), [`patterns.ts`](../src/browser/patterns.ts), [`events.ts`](../src/browser/events.ts).

Plus a Vue 3 showcase (`app/browser/`) that doubles as living documentation, a Vitest browser-environment test suite (`tests/`), and long-form guides (`guides/`).

**Twenty composables** (`useDialog`, `useToast`, `usePopover`, `useTabs`, …) each pair with a framework-agnostic factory (`createDialog`, …). When the JS-driven open-state needs CSS support, a matching partial under `src/styles/composables/_{name}.scss` paints state-gated chrome.

**The visual goal**: dropping the framework into a page should make HTML **feel hydrated** — bare `<button>` already has proper colors, spacing, alignment, hover; bare `<form>` spaces its controls; bare `<dialog>` lifts with the right shadow. Consistent and uniform, **not opinionated** (no brand palette, no funky radii).

---

## 2. Quality bar

Every element, component, composable, and showcase page must be **production-ready** across all of:

| Dimension           | What "production-ready" means                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Colors**          | WCAG AA contrast on every variant in both light and dark mode; subtle / emphasis / on-canvas / border-subtle triplets resolve cleanly; no inline hex outside `_theme.scss`'s `@theme` block. |
| **Sizes**           | `.small` / default / `.large` all readable; padding scales coherently; font-size jumps intentional, not arbitrary.                                                                           |
| **Placements**      | Anchor positioning lands where the modifier name says; viewport overflow falls back gracefully via `position-try-fallbacks`.                                                                 |
| **Alignments**      | Headings balance (`text-wrap: balance`); buttons center text+icon; form labels align with inputs; cards align children predictably.                                                          |
| **Animations**      | Every `transition:` paired with `prefers-reduced-motion: reduce` via the `@include transition()` mixin. Every `animation:` paired with `@include reduced-motion { animation: none }`.        |
| **Transitions**     | Popover / dialog / toast use `@starting-style` for entry and `transition-behavior: allow-discrete` for exit; durations consume `--set-transition-duration`.                                  |
| **Interactions**    | hover / focus-visible / active / disabled all painted; focus uses the `focus-ring()` mixin; cursor changes match (`pointer` / `not-allowed` / `progress`).                                   |
| **Forced colors**   | Every interactive element invokes `@include forced-colors { … }` so Windows High Contrast keeps the affordance visible.                                                                      |
| **Themes**          | Variant retune (`--color-primary: brand-red` at `:root`) cascades through every consumer. Light ↔ dark flip is instant.                                                                      |
| **Customizability** | Every visible value flows through a `--set-*` token. Consumer overrides at `:root` or per-element scope without forking.                                                                     |

The quality bar applies even when the patch looks small. Adding one token without the parity test, one modifier without the docs row, one new file without the charter comment is what produces the drift the audit phase caught.

---

## 3. Working posture

### 3.1 Spec before code

Every change starts with the spec, not the existing source. Read the matching guide section first — [`styles.md`](styles.md), [`tokens.md`](tokens.md), [`modifiers.md`](modifiers.md), [`taxonomy.md`](taxonomy.md), [`patterns.md`](patterns.md), [`elements.md`](elements.md), [`components.md`](components.md), [`surfaces.md`](surfaces.md), [`composables.md`](composables.md), [`mixins.md`](mixins.md). Form the production-correct vision from the spec, then compare to what's there, then close the gap. **Existing code is not ground truth** — it's something to verify.

When writing or refactoring a SCSS partial, [`patterns.md`](patterns.md) is the operational reference. Nine contracts apply to every change:

| Section                  | Contract                                                                                                                                                                                        | Enforcer                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| §1–4 Folder structural   | Layer wrapping, allowed selector kinds, token namespace policy, comment-only policy                                                                                                             | [`_contracts.test.ts`](../tests/src/styles/_contracts.test.ts)     |
| §5 Scope discipline      | Flatten `:not(t1):not(t2)` → `:not(:where(...))`; explicit scope on cross-cutting modifier compounds                                                                                            | [`_scope.test.ts`](../tests/src/styles/_scope.test.ts)             |
| §6 Modifier dimensions   | Variant 8 / size 4 / style 4 required context tokens per class                                                                                                                                  | [`_dimensions.test.ts`](../tests/src/styles/_dimensions.test.ts)   |
| §6.6 Interactive minimum | Every `INTERACTIVE_ELEMENTS` member declares `transition-duration` + `@include forced-colors` + `:focus-visible`                                                                                | [`_interactive.test.ts`](../tests/src/styles/_interactive.test.ts) |
| §7 Surfaces              | Per-surface required tokens + animated-mixin discipline                                                                                                                                         | [`_surfaces.test.ts`](../tests/src/styles/_surfaces.test.ts)       |
| §8 Components            | Per-component required tokens + animated-mixin discipline                                                                                                                                       | [`_components.test.ts`](../tests/src/styles/_components.test.ts)   |
| §9 Composables           | Per-composable tokens + state-selector vocabulary + factory pairing + animated discipline                                                                                                       | [`_composables.test.ts`](../tests/src/styles/_composables.test.ts) |
| §10 Structural pairings  | Every `parent > child` bare-tag pair must appear in `STRUCTURAL_PAIRINGS` with a `spec` / `slot` / `reset` / `context` reason                                                                   | [`_pairings.test.ts`](../tests/src/styles/_pairings.test.ts)       |
| Motion contract          | Every `MOTION_CONTRACT_PARTIALS` member references both `var(--set-motion-duration)` AND `var(--set-motion-timing-function)`; panel-reveal transitions never hardcode numeric duration literals | [`_motion.test.ts`](../tests/src/styles/_motion.test.ts)           |

[`taxonomy.md`](taxonomy.md) is the reference for **what element to reach for**: every native HTML tag with its framework treatment (substantive / reset / composable / passthrough / class-component). When a new design problem arises, walk the taxonomy first.

### 3.2 No backwards compatibility

This is a greenfield framework. Change types, rename symbols, restructure files freely. Update every consumer site with a parity-test pass. Never carry deprecation shims, migration aliases, or "for backwards-compat" branches.

### 3.3 Targeted tests over full suite

The full suite is for final-verification, not iteration:

```bash
# Targeted style tests for one element
npx vitest run --config vite.config.ts tests/src/styles/elements/_button.test.ts --reporter=dot

# Targeted browser tests for one composable
npx vitest run --config vite.config.ts tests/src/browser/composables/usePopover.test.ts --reporter=dot

# Targeted contract test for the surface you changed
npx vitest run --config vite.config.ts tests/src/styles/_surfaces.test.ts --reporter=dot
```

Lint + typecheck (`npm run check`) is required before any "done" claim. The full suite (`npm test`) is the final gate.

### 3.4 Never declare "done" without

- Running the targeted tests for what changed (green).
- Running `npm run check` (oxlint + vue-tsc) clean.
- For showcase pages: manually walking the live page in the dev server.
- For framework changes that touch the runtime cascade: a `getComputedStyle` assertion in the relevant style test.

---

## 4. Architecture rules — TL;DR

The full rules live in [`AGENTS.md`](../AGENTS.md). The eight that come up most often:

1. **Cascade layer order** (declared once in consumer entry CSS, before `@import 'tailwindcss'`):

   ```css
   @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
   ```

   Composables sit after surfaces so per-composable chrome beats surface defaults. Modifiers sit after composables so `.primary` reliably tints a `<dialog>` even when composables set position-specific backgrounds. Utilities last so `<button class="primary p-8">` ends up with `p-8` padding.

2. **Five orthogonal modifier dimensions** ([`modifiers.md`](modifiers.md) §1): `variant`, `size`, `style`, `state`, `placement`. No `shapes` dimension (Tailwind owns `.rounded`). No `.outline` style (Tailwind owns `.outline`). No `.ghost` style (failed WCAG AA on 4 of 7 variants in dark mode). No `.huge` size (Tailwind owns `text-*`).

3. **Modifiers set tokens; elements consume them.** No hand-rolled `&.primary { color: … }` blocks inside element / component files. The fallback chain `--set-style-* → --set-variant-* → --set-size-* → element default` resolves variation. Use `@include palette-each` (from [`_mixins.scss`](../src/styles/_mixins.scss)) for any per-variant emission.

4. **TS ↔ SCSS bidirectional parity.** Every `--set-*` token has a leaf in `tokens.ts`. Every modifier class has a leaf in `modifiers.ts`. Every substantive element baseline appears in `elements.ts` AND `taxonomy.ts`. Every component / surface / composable partial has a corresponding contract entry in `patterns.ts`. Drift in either direction fails parity tests.

5. **Centralized files per domain.** `*/types.ts` is the **SOURCE OF TRUTH** for the TS public API; implementation matches types, never the reverse. `*/helpers.ts`, `*/constants.ts`, `*/index.ts` (barrel) — implementation files contain only the class definition. Single-word naming per AGENTS.md §4.1.

6. **Scope discipline on cross-cutting selectors.** Flatten `:not(t1):not(t2):not(t3)` → `:not(:where(t1, t2, t3))` to keep specificity flat. Every cross-cutting modifier compound (`[popover].top`) must explicitly enumerate its scope via `:not(:where(...))` blocklist or `:is(...)` allowlist. See [`patterns.md`](patterns.md) §5.

7. **Accessibility-critical mixins are non-negotiable.** Every `transition:` pairs with `@include transition()` (reduced-motion); every interactive element invokes `@include forced-colors { … }` (Windows HC); every keyboard-focus rule uses `:focus-visible`, never bare `:focus`. The parity tests enforce all three.

8. **No element-hardcoding inside containment.** A rule that combines two bare tag names with `>` (e.g. `nav > search`, `article > div`) blesses one element as the structural marker for a role inside a container. Only allowed when the pairing is on the `STRUCTURAL_PAIRINGS` allowlist with a `spec` / `slot` / `reset` / `context` reason: HTML-spec required nesting, a documented framework slot filled by the universally-natural element, a UA-default reset, or contextual chrome inside the parent's documented internal structure. Anything else moves to a wrapper class that the consumer styles — framework provides containment, consumer composes regions. See [`patterns.md`](patterns.md) §10.

---

## 5. Authoring a framework change

Five common workflows, end-to-end.

### 5.1 Adding a new styled element

For example: promoting an element from passthrough to substantive.

**Step 1 — Taxonomy first.** Open [`taxonomy.md`](taxonomy.md) §3. Locate the row for the tag. If it lists the tag as `passthrough` but you're about to add `--set-{tag}-*` tokens, change the row's Treatment column to `substantive` (or `composable` if a factory is paired). Update the matching row in [`src/browser/taxonomy.ts`](../src/browser/taxonomy.ts). The parity test at [`_taxonomy.test.ts`](../tests/src/styles/_taxonomy.test.ts) will check both directions.

**Step 2 — Token surface in TypeScript first.** Add the `{tag}: { … }` object to [`src/browser/tokens.ts`](../src/browser/tokens.ts) listing every `--set-{tag}-*` property the element will expose. Each leaf is `'--set-{tag}-{property}'`. Property names mirror CSS property names in kebab-case under dotted TS keys (`'--set-button-focus-box-shadow'` ↔ `button.focus.boxShadow`).

**Step 3 — SCSS partial.** Write `src/styles/elements/_{tag}.scss` to the canonical shape:

```scss
@use '../mixins' as *;

@layer elements {
    {tag} {
        // 1. Element-scoped tokens (fallback chains).
        --set-{tag}-color: var(--set-style-color, var(--set-variant-color, currentColor));
        --set-{tag}-background-color: var(--set-style-background-color, var(--set-variant-background-color, transparent));
        // … all tokens listed in tokens.ts

        // 2. Consume the tokens.
        color: var(--set-{tag}-color);
        background-color: var(--set-{tag}-background-color);
        // …

        // 3. State chrome (if interactive — see step 5).
        &:hover { /* … */ }
        &:focus-visible {
            outline: none;
            @include focus-ring();
        }
        &:disabled, &.disabled {
            opacity: var(--set-{tag}-disabled-opacity, 0.5);
            cursor: not-allowed;
        }

        // 4. Reduced motion + forced colors.
        @include transition((color var(--set-{tag}-transition-duration), background-color var(--set-{tag}-transition-duration)));
        @include forced-colors {
            background-color: ButtonFace;
            color: ButtonText;
            border-color: ButtonText;
        }
    }
}
```

**Step 4 — Token-group membership.** If the new element belongs to a logical group (`interactive`, `form-control`, `page-shell`, `card-region`, `floating-surface`, `inline-chip`, `disclosure`), add it to the matching group's `members` in [`taxonomy.ts § TOKEN_GROUPS`](../src/browser/taxonomy.ts). The uniformity test fails until every member declares every required token suffix.

**Step 5 — Interactive registry.** If the element paints interaction chrome (hover / focus / active / disabled), add the tag to [`INTERACTIVE_ELEMENTS`](../src/browser/patterns.ts). The interactive contract test asserts forced-colors coverage + `:focus-visible` discipline for every member.

**Step 6 — Element-layer registry.** If the substantive baseline lives in `elements/_{tag}.scss` (not `components/_{tag}.scss`), add the tag to [`src/browser/elements.ts`](../src/browser/elements.ts).

**Step 7 — Behavioral test.** Add `tests/src/styles/elements/_{tag}.test.ts` mirroring `_button.test.ts`: assert UA reset, token resolution, state chrome, modifier cascade.

**Step 8 — Run the parity gate**:

```bash
npx vitest run --config vite.config.ts \
  tests/src/styles/_taxonomy.test.ts \
  tests/src/styles/_naming.test.ts \
  tests/src/styles/_uniformity.test.ts \
  tests/src/styles/_interactive.test.ts \
  tests/src/styles/_contracts.test.ts \
  tests/src/browser/tokens.test.ts \
  tests/src/browser/elements.test.ts \
  tests/src/styles/elements/_{tag}.test.ts \
  --reporter=dot
```

All gates must be green before claiming done.

### 5.2 Adding a new modifier value (variant / size / etc.)

Rare — the framework is opinionated about the vocabulary — but documented in [`modifiers.md`](modifiers.md) §10. Walk:

1. Add the rule to the matching `src/styles/modifiers/_{dimension}.scss` partial. Use the existing rules as templates.
2. Add the value to the matching object in [`src/browser/modifiers.ts`](../src/browser/modifiers.ts).
3. Add the value to the matching Sass list in [`_mixins.scss`](../src/styles/_mixins.scss) (`$variants`, `$sizes`, etc.) so every `@each` loop and `palette-each` invocation picks it up.
4. Update [`modifiers.md`](modifiers.md) §1 — the table parsed by [`_docs.test.ts`](../tests/src/styles/_docs.test.ts).
5. Update the matching `MODIFIER_DIMENSION_TOKENS` entry in [`patterns.ts`](../src/browser/patterns.ts) if the new value adds a required token suffix.
6. Run parity:
   ```bash
   npx vitest run --config vite.config.ts \
     tests/src/browser/modifiers.test.ts \
     tests/src/styles/_docs.test.ts \
     tests/src/styles/_isolation.test.ts \
     tests/src/styles/_dimensions.test.ts \
     --reporter=dot
   ```

### 5.3 Adding an element-local modifier (`form.row`, `button.dropdown`)

Single-element modifiers — values that only make sense on one tag and can't be expressed as a context token — live in [`src/styles/modifiers/_local.scss`](../src/styles/modifiers/_local.scss). Walk:

1. Confirm no cross-cutting dimension would express the same intent. (If a new style value would do the job, extend the dimension instead — single source of truth.)
2. Write the rule as `{tag}.{name}` (compound selector). Never bare `.{name}`.
3. Verify `{name}` doesn't collide with the cross-cutting modifier vocabulary or the Tailwind single-token utility set ([`_local.test.ts`](../tests/src/styles/modifiers/_local.test.ts) enforces both).
4. Run:
   ```bash
   npx vitest run --config vite.config.ts tests/src/styles/modifiers/_local.test.ts --reporter=dot
   ```

### 5.4 Adding a composable

Pair a `use{Name}` Vue adapter with a `create{Name}` framework-agnostic factory and (when chrome is needed) a `composables/_{name}.scss` partial.

1. **Types first.** Add `Use{Name}Options`, `Use{Name}Return`, `Create{Name}Options`, `Create{Name}Instance`, `{Name}EventMap` to [`src/browser/types.ts`](../src/browser/types.ts).
2. **Factory.** `src/browser/factories/create{Name}.ts` — owns the DOM mutation logic + `@vue/reactivity` state. Use `assertElement(el, '{tag}')` to gate on the right semantic root.
3. **Composable.** `src/browser/composables/use{Name}.ts` — thin Vue adapter that registers a cleanup callback with the component's scope and delegates to the factory.
4. **Event names.** Add namespaced names to [`src/browser/constants.ts`](../src/browser/constants.ts) and re-export from [`events.ts`](../src/browser/events.ts) (pattern: `elements:{source}:{verb}` per AGENTS.md §11).
5. **Chrome partial** (if state-gated CSS is needed). `src/styles/composables/_{name}.scss` — wrap rules in `@layer composables`; gate every rule on a composable-state selector (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`). If the partial declares `transition:` or `animation:`, invoke `@include transition()` or `@include reduced-motion` — the composable charter enforces it.
6. **Contract entry.** Add an entry to [`COMPOSABLE_CONTRACTS`](../src/browser/patterns.ts) with the token namespace, required tokens, state-selector kinds, animated flag, and factory pairing.
7. **Taxonomy entry.** Update the matching row in `taxonomy.md` and `taxonomy.ts` — if a tag is now composable, set its row's Treatment to `composable` and `composable` field to `'use{Name}'`.
8. **Tests.** Add `tests/src/browser/composables/use{Name}.test.ts` (Vue adapter) and `tests/src/browser/factories/create{Name}.test.ts` (factory logic). If chrome was added, ensure [`_composables.test.ts`](../tests/src/styles/_composables.test.ts) passes.

---

## 6. Authoring a showcase page

The reproducible discipline for every page under `app/browser/pages/`. Apply each phase fully before moving to the next. **Skipping a phase = re-doing it later.**

### 6.1 North star

A showcase page exists to **prove the framework's API is real**:

1. **Live demos, not screenshots.** Every example is interactive markup. Composables wire to real DOM with real factories. No faking.
2. **Code samples sit beside the demos.** `<details><summary>Markup</summary><pre><code>…</code></pre></details>` per example. Copy-pasteable.
3. **The page itself uses framework chrome.** Layout via `<section>`, `<hgroup>`, `<article>`, `<dl>`, `.stack`, `.cluster`. Tailwind utilities only for last-mile assists (grid gap, sr-only, etc.). The page IS the proof — chrome-on-chrome reads honest.

Aesthetic direction across all pages: **technical-documentation editorial** — restrained, reference-grade, the framework's hydrated baselines on display.

### 6.2 Phase 1 — Pre-build audit

Read everything the page must cover before writing markup.

**Element pages** (`ButtonPage`, `FormControlsPage`, …):

- `src/styles/elements/_{tag}.scss` — element baseline, every selector, every `--set-{tag}-*` token, forced-colors block.
- `src/styles/modifiers/_{variants,sizes,styles,states,placements}.scss` — the modifier cascade hooks.
- `src/browser/elements.ts`, `src/browser/taxonomy.ts` — the TS mirrors.
- `guides/elements.md` and `guides/taxonomy.md` (relevant rows) — design rationale.

**Composable pages** (`UseDialogPage`, …):

- `src/browser/factories/create{Entity}.ts` — full factory surface.
- `src/browser/composables/use{Entity}.ts` — Vue adapter.
- `src/browser/types.ts` — search for `{Entity}EventMap`, `Use{Entity}Options`, `Use{Entity}Return`, `Create{Entity}Options`, `Create{Entity}Instance`. ALL of them.
- `src/browser/constants.ts` — `{ENTITY}_EVENTS` map.
- `src/styles/composables/_{entity}.scss` — chrome-on-state partial.
- `src/styles/elements/_{tag}.scss` — bound element baseline.
- `guides/composables.md` (relevant section).

**Component pages** (`ArticleCardPage`, …):

- `src/styles/components/_{tag}.scss` — composition rules.
- Every element the composition touches (e.g. `ArticleCardPage` needs `<article>`, `<header>`, `<footer>`, `<menu>`).

**Surface pages** (`PopoverSurfacesPage`, …):

- `src/styles/surfaces/_{name}.scss` per surface.
- `guides/surfaces.md` (relevant section).

**Output of Phase 1**: a checklist in the page's `<script>` comment block listing every API surface item the page MUST demonstrate. The checklist drives Phase 3.

### 6.3 Phase 2 — Page skeleton + route registration

Build the empty page first. No demos yet — just structure.

```vue
<script lang="ts" setup>
/**
 * {Name}Page — {one-sentence purpose}.
 *
 * API surface coverage (from Phase 1):
 *   - [ ] {item 1}
 *   - [ ] {item 2}
 *   - …
 *
 * Cross-references: {other pages this composes with}
 */
import { ref } from 'vue'
</script>

<template>
	<section id="{name}-intro">
		<hgroup>
			<h1>{Page Title}</h1>
			<p>{One-sentence framing — what the page proves about the framework.}</p>
		</hgroup>
	</section>
	<!-- Sections follow, one per API dimension. Each gets an id. -->
</template>
```

**Section ID convention**: `{page-name}-{section}` (e.g. `button-variants`, `button-sizes`). URL-safe and stable — they're the TOC anchors AND deep-link hash keys.

**Route registration** in `app/browser/router.ts`:

1. Import the page at the top: `import {Name}Page from './pages/{Name}Page.vue'`.
2. Add a `Route` constant: `const {NAME}: Route = { id: '{name}', title: '{Display Title}', group: '{Group Name}', page: {Name}Page }`.
3. Push into the `routes` array in group order (group order matches `plan.md`).

After Phase 2: the page is empty but reachable at `#/{name}` and shows up in SiteNav.

### 6.4 Phase 3 — Demos, section by section

One section per API dimension. Each section follows the same shape:

```vue
<section id="{page}-{section}">
	<h2>{Section title}</h2>
	<p>{One-sentence framing of what this section proves.}</p>

	<!-- Live demo. Real working markup. -->
	<div class="cluster">
		<!-- demo elements -->
	</div>

	<!-- Code sample. -->
	<details>
		<summary><small>Markup</small></summary>
		<pre><code>{escaped markup}</code></pre>
	</details>
</section>
```

**Section ordering** (use the order most natural for the symbol; `ButtonPage` is the reference):

1. **Bare / default** — what you get with zero classes.
2. **Variants** — semantic identity (`primary`, `success`, etc.).
3. **Sizes** — `.small` / default / `.large`.
4. **Styles** — `.subtle` / `.filled`.
5. **States** — `:hover` / `:active` / `:focus-visible` / `[disabled]` / `.active` / `.loading`.
6. **Combinations** — the orthogonal cascade (variant × size × style).
7. **Element-specific patterns** — icon-only, link-as-button, groups, etc.
8. **Composable wiring** — `useButton`, `useDialog`, etc. (when applicable).
9. **A11y verification blocks** — reduced-motion, forced-colors, keyboard.
10. **Tokens reference** — the `--set-*` surface the consumer overrides.

**Hard rules during demo authoring:**

- **No utility classes inside framework demos.** If `<button class="primary">` doesn't render right without a `bg-blue-500` rescue, the framework is broken. Fix the framework, not the demo.
- **Every variant demonstrated**, not "a sample of variants." If there are 7 variants, render 7. The page IS the proof that the cascade hits every one.
- **Reduced-motion verification block is mandatory.** Every page includes a section the reader can toggle their OS reduced-motion preference against and verify the framework respects it.
- **Forced-colors verification block is mandatory.** A note + a representative element the reader can verify in Windows HC mode.
- **Tokens reference section is mandatory.** `<dl>` listing every `--set-{tag}-*` token the page exposes, with a one-line description.

### 6.5 Phase 4 — Verification (live preview)

Real verification via the preview server. Sample 3 variants × 3 states per page; capture screenshots at 375 / 768 / 1440 px.

| #   | Row                           | How to verify                                                                                                                    |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Light mode contrast**       | Read computed styles for representative selectors. WCAG AA = 4.5:1 for normal text, 3:1 for large text + UI components.          |
| 2   | **Dark mode contrast**        | `document.documentElement.dataset.theme = 'dark'` + 200ms wait. Re-sample. Variant + on-canvas tiers both flip cleanly.          |
| 3   | **Variant cascade**           | Every variant rendered (not "a sample").                                                                                         |
| 4   | **State coverage**            | Hover / focus / active / disabled / aria-current / aria-selected / loading — render or describe each state the element supports. |
| 5   | **Viewport responsiveness**   | 375 / 768 / 1440 px. No horizontal scroll on mobile; body grid reflows; drawers / TOC accessible.                                |
| 6   | **Reduced motion**            | Either toggle the OS preference, or rely on the framework's `@include transition()` mixin everywhere.                            |
| 7   | **Forced colors / a11y**      | For variant chrome that carries semantic signal, verify in Chrome DevTools' "Emulate CSS media feature forced-colors: active".   |
| 8   | **Keyboard nav**              | Tab through interactives; Esc dismisses popovers, Enter activates buttons, arrow keys follow APG patterns.                       |
| 9   | **Console clean**             | Zero error / warning logs after a full reload.                                                                                   |
| 10  | **SiteNav + TOC integration** | The page appears in `SiteNav` under its group; sections have `id` attributes the TOC picks up.                                   |

**Per row, the format**:

```
Row 1 — Light mode contrast: [PASS|FAIL] {one-line evidence — measured contrast, sampled selector, OK / NG}
```

**Any FAIL gets fixed before moving on.** Fix at the SCSS / TS source, not in the page markup. If the framework chrome is broken, the page is broken too — and the page just earned its keep by surfacing the bug.

**Cross-cutting framework changes**: when a page audit surfaces a framework bug, fix it at the framework level, then log the change in [`plan.md`](plan.md) under "Cross-cutting framework changes" so the API surface diff stays visible across pages.

### 6.6 Phase 5 — Findings report

A short structured report:

```
## {Name}Page — Page Build Report

### Built
- {section 1 description}
- {section 2 description}

### Rubric
- ✅ Row 1 — Light mode contrast
- ✅ Row 2 — Dark mode contrast
- …

### Framework chrome gaps surfaced (if any)
- {gap 1} — fixed in {commit / file}

### Open questions for the user
- {if any}

### Reproduction
- URL: http://localhost:5173/#/{name}
- Browser: Chrome (dev server)
- Viewports tested: 375 / 768 / 1440
- Themes tested: light, dark
```

### 6.7 Phase 6 — Hand-off + close

1. **Leave the preview server running** so the user iterates against the same live preview the audit ran against.
2. **Run the standard cadence**: `npm run show` (rebuilds the single-file `demo/showcase.html`), `npm run format`, commit, push.
3. **Mark the plan checkbox** `✅` in [`plan.md`](plan.md) §9.1 / §9.2 only after the user confirms the page is acceptable.
4. **Triage feedback**: real issues → fix → re-verify → re-commit. Style preferences → discuss; only land with user confirmation.
5. **App-specific vs framework-specific**: when a pattern lives in `src/styles/`, ask "would every consumer of the framework's `<X>` element want this?" If yes, framework. If it's a deliberate composition choice (e.g. sticky sidebar search, drawer-header inside flex-column rail), it belongs in `app/browser/styles/showcase.css` instead.

---

## 7. Anti-patterns

These are failures previous work fell into. Don't repeat them.

- **Marking ✅ before building.** Never check a box that doesn't reflect shipping code.
- **Batching pages.** Building 5 pages in one turn means 5 pages get half-attention. Build one, verify it, hand it off. Repeat.
- **"Sample of variants" cop-out.** If the symbol has 7 variants, render all 7.
- **Adding showcase composition to `src/styles/`.** Cross-check: "would every consumer of the framework's `<X>` element want this?" If no, it's app-specific.
- **Inlining demos as code-fence-only.** A `<pre><code>...</code></pre>` is not a demo. The demo is the working element; the code sample (if shown) is the supplement.
- **Tailwind utility rescues.** Adding `class="bg-blue-500 px-4"` to make a demo look right hides a framework gap. Fix the framework.
- **Console warnings.** Vue warns / Tailwind missing-source warns / unhandled errors all fail Row 9.
- **Dragging Bootstrap / mailbox class names in verbatim.** Generic single English word; past-participle for visual treatments; no element-name prefix; no library namespace. The framework's modifier-naming rules are codified in [`patterns.md`](patterns.md).
- **Letting an apparent fix mask a deeper issue.** When a fix feels "too easy," it might be papering over a deeper inconsistency. Ask "is the original rule wrong, or just wrong here?" — if wrong everywhere, fix at the source.
- **Hand-rolling `&.primary { ... } &.secondary { ... }` blocks.** Use `@include palette-each` from [`_mixins.scss`](../src/styles/_mixins.scss). [`_handrolled.test.ts`](../tests/src/styles/_handrolled.test.ts) fails on three or more compound variant rules in one non-modifier file.
- **Token abbreviations.** No `bg`, `fg`, `lg`, `sm`, `info`, `btn` as token segments. Spell every name out. [`_naming.test.ts`](../tests/src/styles/_naming.test.ts) enforces the black-list in `taxonomy.ts § FORBIDDEN_TOKEN_SEGMENTS`.
- **Chained `:not(t1):not(t2)` qualifiers.** Each `:not(tag)` adds 0,0,1 to specificity. Collapse to `:not(:where(t1, t2, ...))`. [`_scope.test.ts`](../tests/src/styles/_scope.test.ts) enforces this.
- **Bare `transition:` declarations** outside `@include transition()`. Breaks the reduced-motion contract. The surface / component / composable contracts enforce mixin usage on every animated partial.
- **Bare `:focus { … }` rules.** Use `:focus-visible`. The interactive contract enforces this across the whole `src/styles/` tree.
- **Element-hardcoding inside containment.** Rules like `nav > search` (chrome painted on a specific child element type) lock a pattern to one markup choice and force consumers to use exactly that element. Move the chrome to a wrapper class the consumer adds (`<nav><div class="my-region"><search>…</search></div></nav>`); style the wrapper, not its content. [`_pairings.test.ts`](../tests/src/styles/_pairings.test.ts) fails any new `tag1 > tag2` pair that isn't on `STRUCTURAL_PAIRINGS`.

---

## 8. Communication style

- Short summary in chat — no walls of text.
- Show exact changes via diff (the system handles this).
- Do the work — don't ask permission to do something obvious.
- Be honest about scope. If a phase is too big for one turn, say so and break it down.
- Never overstate completion — only mark a phase ✅ after tests run green AND the audit was actually done against the guide.

---

## 9. Quick reference

### 9.1 Commands

```bash
# Targeted style tests for one element
npx vitest run --config vite.config.ts tests/src/styles/elements/_button.test.ts --reporter=dot

# Targeted browser tests for one composable
npx vitest run --config vite.config.ts tests/src/browser/composables/usePopover.test.ts --reporter=dot

# Lint + typecheck
npm run check

# Format
npm run format

# Dev server
npm run dev   # http://localhost:5173

# Rebuild single-file showcase
npm run show   # → demo/showcase.html

# Full suite (avoid casual use; final-verification only)
npm test
```

### 9.2 File map

```
guides/
  contribute.md      ← this file — the workflow for humans + agents
  plan.md            ← current state + remaining-work checklist
  taxonomy.md        ← every native HTML element + framework treatment
  patterns.md        ← per-folder SCSS structural contracts + 8 codified registries
  styles.md          ← top-level architecture
  tokens.md          ← token surface
  mixins.md          ← Sass mixin registry
  modifiers.md       ← five-dimension cascade
  elements.md        ← per-tag catalog
  components.md      ← element compositions
  surfaces.md        ← browser-rendered chrome
  composables.md     ← Vue + factory layer

src/
  browser/
    types.ts         ← SOURCE OF TRUTH for TS public API
    tokens.ts        ← TS mirror of every --set-* token
    modifiers.ts     ← TS mirror of every modifier class
    elements.ts      ← TS registry of element-layer substantive baselines
    taxonomy.ts      ← TS taxonomy + TOKEN_GROUPS + INTERACTIVE_ELEMENTS
    patterns.ts      ← FOLDER_CONTRACTS + FILE_EXCEPTIONS + SURFACE/COMPONENT/COMPOSABLE_CONTRACTS + MODIFIER_DIMENSION_TOKENS + STRUCTURAL_PAIRINGS + scope-discipline helpers
    events.ts        ← namespaced event-name registry
    helpers.ts       ← assertElement, attachListeners, focus-ring helpers, …
    constants.ts     ← UPPER_SNAKE_CASE values, EVENT_MAPS, selectors
    composables/     ← 20 use* Vue adapters
    factories/       ← 20 create* framework-agnostic logic
  styles/
    _tokens.scss     ← :root { --set-* } declarations
    _theme.scss      ← @theme + light/dark color tokens
    _mixins.scss     ← @function / @mixin / Sass lists (registry; not @use'd by index.scss)
    index.scss       ← barrel: tokens → theme → elements → components → surfaces → composables → modifiers
    elements/        ← one partial per HTML tag (~94 files)
    components/      ← element compositions + class-component primitives
    modifiers/
      _variants.scss   ← cross-cutting variants (7 × 8-token tier set)
      _sizes.scss      ← cross-cutting sizes
      _styles.scss     ← cross-cutting styles
      _states.scss     ← cross-cutting states
      _placements.scss ← cross-cutting placements
      _local.scss      ← element-local modifiers (form.row, button.dropdown, …)
    surfaces/        ← popover, backdrop, anchor-position, scrollbar, …
    composables/     ← chrome partials gated on composable-state attributes

tests/
  setup.css          ← cascade layer order + Tailwind import
  setup.ts           ← shared test bootstrap
  setupBrowser.ts    ← browser-test helpers
  setupStyles.ts     ← build, mount, render, token, style, pixels, findRule, theme, framework variant arrays, …
  src/
    browser/         ← parity tests + composable/factory tests + taxonomy.test.ts + patterns.test.ts
    styles/          ← per-partial behavior tests + contract enforcers:
      _contracts.test.ts     ← per-folder structural
      _interactive.test.ts   ← element a11y (forced-colors + :focus-visible)
      _scope.test.ts         ← selector specificity discipline
      _dimensions.test.ts    ← modifier-dimension required tokens
      _surfaces.test.ts      ← per-surface required tokens + animated discipline
      _components.test.ts    ← per-component required tokens + animated discipline
      _composables.test.ts   ← per-composable tokens + state-selector vocab + factory pairing
      _pairings.test.ts      ← structural parent > child element-pair allowlist
      _motion.test.ts        ← panel-reveal partials must use motion tokens (--set-motion-{duration, timing-function})
      _naming.test.ts        ← --set-* shape + abbreviation black-list
      _handrolled.test.ts    ← no manual variant enumeration
      _isolation.test.ts     ← modifier classes only in modifiers/
      _taxonomy.test.ts      ← SCSS ↔ TS taxonomy parity
      _uniformity.test.ts    ← TOKEN_GROUPS member coverage
      _docs.test.ts          ← modifiers.md ↔ modifiers.ts parity

app/browser/
  pages/             ← showcase pages
  components/        ← SiteNav, Toc
  styles/main.css    ← single CSS entry
  router.ts          ← hash router (#/{id}/{section} deep-links)
```

### 9.3 Resume prompt (for a fresh agent session)

> Read `AGENTS.md`, `guides/contribute.md`, and `guides/plan.md` first. Then `guides/patterns.md` for the structural contracts and `guides/taxonomy.md` for the per-element treatment. Pretend nothing is implemented and audit blind against the relevant guide before looking at existing source. Make production-polish edits where the audit finds gaps. Run `npx vitest run --config vite.config.ts tests/src/{styles,browser}/<scope> --reporter=dot` to verify changes; never run the full suite casually. Update `plan.md` checkpoints as work completes.
