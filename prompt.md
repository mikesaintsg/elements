# Resume Prompt — Elements Framework Audit

> Copy-paste this whole file into a fresh chat to resume the production-polish audit at the exact point we left off. The repo is at `C:\Users\mikes\WebstormProjects\elements`.

---

## 1. The Project (one paragraph)

`elements` is a CSS framework over **semantic HTML elements** (you reach for `<button class="primary large">` not `.btn-primary-lg`), layered on **Tailwind v4** via `@tailwindcss/postcss`. Dual-distribution: a SCSS bundle (`src/styles/`) and a TypeScript public API (`src/browser/`) that mirrors every CSS identifier consumers programmatically reach for. There's a Vue 3 showcase app (`app/browser/`) that doubles as living documentation, a Vitest browser-environment test suite (`tests/`), and long-form guides (`guides/`) that describe the framework as it exists when complete.

The framework has 20 composables (`useDialog`, `useToast`, `usePopover`, `useTabs`, etc.) each paired with a framework-agnostic factory (`createDialog`, …) and corresponding chrome partials when the JS-driven open-state needs CSS support.

---

## 2. The Working Approach (mandatory)

**Treat `guides/plan.md` as the authoritative greenfield blueprint.** Audit each phase against the matching guide (`styles.md`, `tokens.md`, `mixins.md`, `modifiers.md`, `elements.md`, `components.md`, `surfaces.md`, `composables.md`) **before looking at existing code**. Form the production-correct vision from the spec, then compare to what's there, then fix the gaps. Existing code is not ground truth — it's something to verify.

**Never declare "done" without:**

- Running the targeted vitest scope (`npx vitest run --config vite.config.ts tests/src/styles/elements/_button.test.ts`)
- Running `npm run check` (oxlint + vue-tsc)
- Manually walking the showcase page to confirm visual polish

**Never run the full suite casually.** It takes ~8 seconds and emits noise — only run it as a final-verification gate after a phase audit is complete. Targeted runs are faster and more focused.

**No backwards compatibility, no deprecation warnings, no migration guides.** This is greenfield — change types, rename symbols, restructure files freely. Update every consumer site with a parity-test pass.

---

## 3. The Quality Bar (the thing the user asks for)

Every element / component / composable must be **production-ready** across **all** of:

| Dimension           | What "production-ready" means                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Colors**          | WCAG AA contrast on every variant in both light and dark mode; subtle/emphasis/border-subtle triplets resolve cleanly; no inline hex                                                   |
| **Sizes**           | `.small` / default / `.large` all readable; padding scales coherently; font-size jumps feel intentional not arbitrary                                                                  |
| **Placements**      | Anchor positioning lands where the modifier name says; viewport overflow falls back gracefully via `position-try-fallbacks`                                                            |
| **Alignments**      | Headings balance (`text-wrap: balance`); buttons center text+icon; form labels align with inputs; cards align children predictably                                                     |
| **Animations**      | Every `transition:` paired with `prefers-reduced-motion: reduce` opt-out via the `@include transition()` mixin; `animation:` paired with `@include reduced-motion { animation: none }` |
| **Transitions**     | Popover / dialog / toast use `@starting-style` for entry and `transition-behavior: allow-discrete` for exit; durations consume `--set-transition-duration`                             |
| **Interactions**    | hover / focus / active / disabled all painted; focus uses the framework's `focus-ring()` mixin; cursor changes match (pointer / not-allowed / progress)                                |
| **Themes**          | Variant retune (e.g. `--color-primary: brand-red`) cascades through every consumer; light↔dark flip is instant with no per-component override needed                                   |
| **Customizability** | Every visible value flows through a `--set-*` token; consumer can override at `:root` or per-element scope without forking                                                             |

---

## 4. The Baseline Hydration Vision (a non-negotiable)

**The user's most important visual goal:** dropping the framework into a page should make it **feel hydrated like Bootstrap** — you put a `<button>` and it already has the proper colors, spacing, alignment, hover states; you put a `<form>` and the controls space themselves; you put a `<dialog>` and it lifts above the page with the right shadow. **Not opinionated** (no brand-flavored palette, no funky border-radius), just **consistent and uniform**.

Concretely, this means the theme + tokens layer must ship **non-color baseline defaults too**:

- **Z-index scale** for popover/modal/toast/tooltip/dropdown/sticky/fixed layering (`--set-z-index-*`)
- **Default gap/stack rhythm** for flex/grid layouts (`--set-gap`, `--set-stack-spacing`)
- **Default border-radius / border-width** so unsized rounded surfaces don't look razor-edged or chunky
- **Default sticky offset** for `scroll-padding-block-start`
- **Default elevation scale** (`--set-box-shadow-{sm,base,lg}`) — already done
- **Default density / radius factors** for global retune — already done
- **Default focus ring tokens** — already done

Anything that an element or component reaches for as a "default value" in a `var(…, fallback)` chain should have a real `:root` declaration so the fallback is documentation, not the actual source of the value.

---

## 5. The Architecture Rules (TL;DR — full version in `AGENTS.md`)

- `src/browser/types.ts` is the **source of truth** for the TypeScript public API. Implementation matches types, never the other way.
- **Single-word naming** for every entity-scoped property/method/option/event (per AGENTS.md §4.1). Compound names → split via §4.2 strategies.
- **Centralized files** per domain: `types.ts`, `helpers.ts`, `constants.ts`, `errors.ts`, `index.ts` — implementation files contain only their class.
- **Cascade layer order** (declared once in consumer entry CSS before `@import 'tailwindcss'`):
  ```css
  @layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
  ```
- **`_mixins.scss` is registry-only** — never `@use`'d from `src/styles/index.scss`; consumers reach for it via `@use '../mixins' as *;`
- **TS ↔ SCSS parity** is enforced bidirectionally by `tests/src/browser/{tokens,modifiers,elements,events}.test.ts`. Adding a `--set-*` declaration without a TS leaf (or vice versa) fails CI.
- **Four modifier dimensions:** `variants`, `sizes`, `styles`, `states`, plus a `placements` system. **No `shapes` dimension** (Tailwind owns `.rounded`); **no `.outline` style** (Tailwind owns `.outline`); **no `.huge` size** (Tailwind owns `text-*`).
- **Token-driven variation only.** No `&.primary { color: … }` blocks in element partials — variation flows through `--set-style-* → --set-variant-* → element default`.

---

## 6. Where We Are (progress checkpoint)

Phases 1–4 audited and polished:

| Phase                                          | Status | Highlights of what was changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Cascade & barrel**                       | ✅     | Created missing `src/styles/elements/index.scss` barrel; slimmed root `src/styles/index.scss`; removed spec-violating `@use 'mixins'` from root                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **2 — Tokens**                                 | ✅     | Color + elevation + icon + floater + density + radius tokens all present and parity-tested. **Baseline hydration non-color tokens added in turn 3** (z-index scale, gap, stack-spacing, sticky-offset, border-radius/width defaults)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **3 — Mixins**                                 | ✅     | All required mixins (`reduced-motion`, `transition`, `focus-ring`, `forced-colors`, `truncate`, `size-container`, `floater-*`, `palette-each`) present with Sass-list constants `$variants`, `$sizes`, `$styles`, `$states`. Plan corrected to drop spurious `$shapes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **4 — Modifiers**                              | ✅     | WCAG contrast bug: `.secondary` and `.information` were using `black` text on dark backgrounds; fixed both to `white`. `.warning` (amber) keeps `black`. Test updated to match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **5a — Sectioning containers**                 | ✅     | `<main>`, `<section>`, `<hgroup>` promoted from "no chrome" to substantive element baselines. Hydrated flex-column rhythm + nesting collapse so authors stop reaching for `<div class="stack">`. Mirrored in `tokens.ts` + `elements.ts`; obsolete pin-test for "section has no chrome" removed; HomePage.vue updated to reflect actual modifier surface (4 dimensions + placements; no `shape`, no `huge`, no `outline`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **5b — Anchor / button context defaults**      | ✅     | `<a>` no longer paints as a primary-blue underlined hyperlink when it lives inside the page app bar (`body:has(main) > header`), the page footer (`body:has(main) > footer`), the body-rail nav menu, or the aside TOC menu. New rules in `_header.scss`, `_footer.scss`, `_menu.scss` make anchors-as-nav-commands quiet by default (currentColor / muted, no underline, hover tint toward primary, full-width start-aligned rows). Bare `<button>` in the same nav-rail / TOC menu drops its inline-button center-text chrome and matches the link rows so a `<menu><li><a>` and `<menu><li><button>` read identically. Modal/popover/article/dropdown contexts unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **5c — Token hygiene + `<address>` hydration** | ✅     | `<address>` promoted from "italic-reset only" to a full small-contact-info block (subdued color via `--color-text-muted`, smaller font `--text-sm`, tight line-height, stack-spacing margin); 4-token surface mirrored in `tokens.ts`. Audit pass: `<dd>` color swapped from `--color-slate-600` (Tailwind palette leak) to `--color-text-muted` (semantic token). `<article>` box-shadow now flows through `--set-box-shadow-sm` so consumers retuning the global elevation scale automatically retunes cards. Carousel arrow shadow same. Plan §5.3a / §5.4 marked done; new Phase 11 invariants added (no Tailwind-palette leaks outside `_theme.scss`; no hardcoded color literals outside `var()` fallbacks).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0–11 — Plan reconciliation pass**            | ✅     | Walked every Phase 0–11 task in `guides/plan.md`, verified against actual code state, and marked every implemented item `[x]`. Phase 0 (deps + scripts), Phase 1 (cascade + barrels), Phases 2–4 (tokens / mixins / modifiers — green parity), Phase 5 (every substantive element + sectioning + typography overrides), Phase 6 (every component partial including the inline-atom split into `_badge` / `_dot` / `_tag` instead of one `_span`), Phase 7 (popover / backdrop / anchor-position / scrollbar shipped — `_focus.scss` / `_placeholder.scss` / `_marker.scss` / `_selection.scss` / `_view-transition.scss` deferred with rationale), Phase 8 (all 19 composables + factories + chrome partials), Phase 9 (sidebar / TOC / theme toggle / mobile drawer all shipped). Reconciled three doc/code drifts: (1) `--set-box-shadow-{sm,base,lg}` notation in `plan.md` + `styles.md` corrected to `--set-box-shadow-sm` / `--set-box-shadow` (un-suffixed base mirroring Bootstrap's `--bs-box-shadow` convention) / `--set-box-shadow-lg`; (2) Phase 1 root-barrel example removed the spec-violating `@use 'mixins'` line per AGENTS.md §21.1; (3) Phase 0 dep list updated `@vitest/browser` → `@vitest/browser-playwright` (the post-v4 split).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **11a — Color-literal hardening**              | ✅     | Phase 11 invariant `Select-String -Pattern '\b(rgb\|rgba\|hsl\|hsla\|oklch\|oklab)\s*\('` surfaced two leaks in `surfaces/_popover.scss`: tooltip background `rgb(15 23 42 / 0.95)` and inline tooltip `box-shadow: 0 4px 8px -2px rgb(0 0 0 / 0.18)`. Refactored both: hint background now `color-mix(in srgb, var(--color-text) 95%, transparent)` consuming the semantic theme tier; hint elevation now consumes `--set-box-shadow-sm` via a new `--set-popover-hint-box-shadow` per-tooltip indirection. Inline TODO documents the dark-theme tooltip-contrast follow-up (since `--color-text` is canvas-contrasting in both themes, the dark-mode hint inverts wrong; needs a `_theme.scss` re-pin). Side-fix: removed a stray `l` typo on line 1 of `_popover.scss` that broke SCSS parsing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **5.6 — Placeholder element audit**            | ✅     | Walked every comment-only / minimal element partial in `src/styles/elements/` (~50 files) against W3C semantics + Tailwind preflight + UA defaults. Triage table in `guides/plan.md §5.6`. **Promotions** (substantive, with new `--set-{tag}-*` tokens mirrored in `tokens.ts` + registered in `elements.ts`): `<canvas>` (max-inline-size + block-size), `<svg>` (same — viewBox-only inline SVGs were overflowing flex containers), `<math>` (`--set-math-font-family` chain to STIX/Latin Modern Math/`math` keyword/serif so native MathML doesn't render with broken operator glyphs on systems without a math font), `<time>` (`--set-time-font-variant-numeric: tabular-nums` so columns of times line up), `<data>` (same tabular-nums), `<u>` (muted dashed underline tokens to disambiguate from `<a>`). **Structural promotion** (no token): `<picture>` → `display: contents` so the wrapper doesn't introduce an extra inline box that confuses flex/grid/intrinsic sizing. **Comment improvements**: 8 element-layer placeholders that are hydrated by their `components/_X.scss` partner (`<article>`, `<aside>`, `<footer>`, `<header>`, `<nav>`, `<form>`, `<menu>`, `<search>`) gained cross-reference pointers to the component file. **Kept as placeholder with rationale** (logged in §5.6 table): bidirectional text (`<bdi>` / `<bdo>`), text annotations whose UA defaults are correct (`<cite>`, `<dfn>`, `<em>`, `<del>`, `<ins>`, `<s>`, `<q>`), East-Asian ruby annotation (`<ruby>` / `<rt>` / `<rp>`), platform widgets (`<datalist>` / `<optgroup>` / `<option>`), the table family (chrome owned by `_table.scss`), and the generic containers (`<div>` / `<span>`). Tests jumped from 1298 → 1325 as parity tests automatically asserted the seven new token resolutions. |
| **9 — Showcase pages (in progress)**           | 🟡     | Phase 9 underway page-by-page (Option A — no batching). Shipped so far: shell + chrome (sidebar, TOC, theme toggle, mobile drawer with edge-aware close buttons), **ButtonPage** (full cascade reference, dark-mode bare-button visibility + spinner-contrast tuning), **AnchorPage** (bare anchor + 7 variants + every state + §6.1 host-context contract live demos). Per-page audit rubric (light/dark contrast, focus paths, 375/768/1440, reduced-motion, forced-colors, keyboard nav, reader sanity) gates each landing. 40 pages still queued in `plan.md §9.4`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **9.7 — `on-canvas` variant tier**             | ✅     | AnchorPage surfaced a framework-wide WCAG gap: bare variant anchors painting the saturated `-600` step as TEXT on the body canvas failed AA for amber/green/sky in light mode and most variants in dark mode. Added `--color-{variant}-on-canvas` as a third per-variant theme tier (sibling to `bg-subtle / text-emphasis / border-subtle`), tuned per-mode via `color-mix(in oklab, variant {70\|80}%, --color-text)` so the same token clears AA on both canvases. Naming follows Material's `on-X` convention. Wired through `--set-variant-on-canvas-color` in `modifiers/_variants.scss`; migrated `elements/_a.scss`, `elements/_label.scss`, `components/_form.scss` (invalid-label color), `components/_header.scss` + `_footer.scss` (anchor hover color), `components/_menu.scss` (aside-TOC `aria-current` + select-popover `aria-selected`), `components/_nav.scss` (`--set-tab-active-color`). TS mirror added to `src/browser/tokens.ts`. See `guides/plan.md §9.7` for the full file list + skip-listed cases (blockquote bar, progress fill, button — all decorative / non-text).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**1380/1380 vitest cases passing. Lint clean.**

Phases left to audit (in order):

| Phase                          | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Estimated depth |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **9 — Showcase pages**         | 40 of 42 pages remaining (ButtonPage + AnchorPage shipped). Continue Option A page-by-page. Per-page rubric in `plan.md §9.3` is the gate. Cross-cutting framework changes that surface during a page get tracked in `plan.md §9.7`. Next up per roster order: **FormControlsPage** (every input type + textarea + select + label/fieldset/legend + output + progress + meter). _High-density page — plan for two passes (markup walkthrough, then dark-mode + a11y rubric)._ | Deep (volume)   |
| **9.x — Cross-cutting follow** | Watch for framework-wide gaps surfaced by upcoming pages. Recent example: AnchorPage drove the `--color-{variant}-on-canvas` tier. FormControlsPage may surface invalid-state contrast tuning, native-control dark-mode QA, and the `:user-invalid` lifecycle question.                                                                                                                                                                                                       | Variable        |
| **10 — Distribution**          | Run `npm run build` + `npm pack --dry-run`. Confirm tarball is lean (no SCSS sources unless via `./styles/scss`, no test fixtures, no source maps unless intentional). Author the README consumer-setup snippet. **Done in §6.1.**                                                                                                                                                                                                                                            | Medium          |
| **11 — Remaining invariant**   | Audit `Select-String -Pattern 'display:\s*flex\|position:\s*fixed' src/styles/composables/*.scss src/styles/components/*.scss` and verify each match is gated on the appropriate open-state selector (`[data-{name}-open]`, `:popover-open`, `:modal`, `[open]`). Other Phase 11 invariants now satisfied (see plan.md §11).                                                                                                                                                  | Light           |

---

## 7. Resume Instructions

When resuming, paste this whole file and say:

> Resume the elements production-polish audit. Read `AGENTS.md` and `guides/plan.md` first, then proceed with the next unfinished phase. Pretend nothing is implemented and audit blind against the relevant guide before looking at existing source. Make production-polish edits where the audit finds gaps. Run `npx vitest run --config vite.config.ts tests/src/{styles,browser}/<scope> --reporter=dot` to verify changes; never run the full suite casually. Update `guides/plan.md` checkpoints as phases complete.

The agent should pick up at the next `❌` row in the progress table above.

---

## 8. Important File Map

```
guides/
  plan.md            ← phase-by-phase blueprint (the "what to do")
  styles.md          ← top-level architecture
  tokens.md          ← token surface
  mixins.md          ← Sass mixin registry
  modifiers.md       ← four-dimension cascade
  elements.md        ← per-tag catalog
  components.md      ← element compositions
  surfaces.md        ← browser-rendered chrome
  composables.md     ← Vue + factory layer

src/
  browser/
    types.ts         ← SOURCE OF TRUTH for TS public API
    tokens.ts        ← TS mirror of every --set-* token
    modifiers.ts     ← TS mirror of every modifier class
    elements.ts      ← TS mirror of substantive element partials
    events.ts        ← namespaced event-name registry
    helpers.ts       ← assertElement, attachListeners, …
    constants.ts     ← UPPER_SNAKE_CASE values, EVENT_MAPS, selectors
    composables/     ← 20 use* Vue adapters
    factories/       ← 20 create* framework-agnostic logic
  styles/
    _tokens.scss     ← :root { --set-* } declarations
    _theme.scss      ← @theme + light/dark color tokens
    _mixins.scss     ← @function / @mixin / Sass lists (registry; not @use'd by index.scss)
    index.scss       ← barrel: tokens → theme → elements → components → surfaces → composables → modifiers
    elements/        ← one partial per HTML tag (~93 files)
    components/      ← element compositions
    modifiers/       ← variants, sizes, styles, states, placements
    surfaces/        ← popover, backdrop, anchor-position, scrollbar (more to add)
    composables/     ← chrome partials gated on JS-driven state attributes

tests/
  setup.css          ← cascade layer order + Tailwind import
  setup.ts           ← shared test bootstrap
  setupBrowser.ts    ← buildElement, mountSetup, createRecorder, …
  setupStyles.ts     ← build, mount, render, token, style, pixels, findRule, …
  src/
    browser/         ← parity tests + composable/factory tests
    styles/          ← per-partial behavior tests

app/browser/
  pages/             ← showcase pages (HomePage, ButtonPage, AnchorPage shipped; 40 queued)
  components/        ← SiteNav, Toc
  styles/main.css    ← single CSS entry
  router.ts          ← hash router (#/{id}/{section} deep-links)
```

---

## 9. Quick Commands

```powershell
# Targeted style tests for one element
npx vitest run --config vite.config.ts tests/src/styles/elements/_button.test.ts --reporter=dot

# Targeted browser tests for one composable
npx vitest run --config vite.config.ts tests/src/browser/composables/usePopover.test.ts --reporter=dot

# Lint + typecheck
npm run check

# Format
npm run format

# Full suite (avoid casual use; final-verification only)
npm test
```

---

## 10. Communication Style With the User

- Short summary in chat — no walls of text
- Show exact changes via diff (the system handles this)
- Do the work — don't ask permission to do something obvious
- Be honest about scope — if a phase is too big for one turn, say so and break it down
- Track progress in chat with a small status table (Phase | Status | Highlights)
- Never overstate completion — only mark a phase ✅ after tests run green and the audit was actually done against the guide
