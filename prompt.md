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

| Phase                                     | Status | Highlights of what was changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Cascade & barrel**                  | ✅     | Created missing `src/styles/elements/index.scss` barrel; slimmed root `src/styles/index.scss`; removed spec-violating `@use 'mixins'` from root                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **2 — Tokens**                            | ✅     | Color + elevation + icon + floater + density + radius tokens all present and parity-tested. **Baseline hydration non-color tokens added in turn 3** (z-index scale, gap, stack-spacing, sticky-offset, border-radius/width defaults)                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **3 — Mixins**                            | ✅     | All required mixins (`reduced-motion`, `transition`, `focus-ring`, `forced-colors`, `truncate`, `size-container`, `floater-*`, `palette-each`) present with Sass-list constants `$variants`, `$sizes`, `$styles`, `$states`. Plan corrected to drop spurious `$shapes`                                                                                                                                                                                                                                                                                                                                                                                                       |
| **4 — Modifiers**                         | ✅     | WCAG contrast bug: `.secondary` and `.information` were using `black` text on dark backgrounds; fixed both to `white`. `.warning` (amber) keeps `black`. Test updated to match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **5a — Sectioning containers**            | ✅     | `<main>`, `<section>`, `<hgroup>` promoted from "no chrome" to substantive element baselines. Hydrated flex-column rhythm + nesting collapse so authors stop reaching for `<div class="stack">`. Mirrored in `tokens.ts` + `elements.ts`; obsolete pin-test for "section has no chrome" removed; HomePage.vue updated to reflect actual modifier surface (4 dimensions + placements; no `shape`, no `huge`, no `outline`).                                                                                                                                                                                                                                                   |
| **5b — Anchor / button context defaults** | ✅     | `<a>` no longer paints as a primary-blue underlined hyperlink when it lives inside the page app bar (`body:has(main) > header`), the page footer (`body:has(main) > footer`), the body-rail nav menu, or the aside TOC menu. New rules in `_header.scss`, `_footer.scss`, `_menu.scss` make anchors-as-nav-commands quiet by default (currentColor / muted, no underline, hover tint toward primary, full-width start-aligned rows). Bare `<button>` in the same nav-rail / TOC menu drops its inline-button center-text chrome and matches the link rows so a `<menu><li><a>` and `<menu><li><button>` read identically. Modal/popover/article/dropdown contexts unchanged. |

**1294/1294 vitest cases passing. Lint clean.**

Phases left to audit (in order):

| Phase                            | What it covers                                                                                                                                                                                                                                                                                                                                                                                                      | Estimated depth |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **5 — Element baselines**        | Per-tag `--set-{tag}-*` cascade, hover/focus/active/disabled states, transitions paired with reduced-motion. ~13 substantive partials (button, a, input, textarea, select, label, fieldset/legend, output, progress, meter, details/summary, dialog, table family, h1-h6) **plus the sectioning containers (`<main>`, `<section>`, `<hgroup>`) which are hydrated as flex-column containers, not invisible blocks** | Deep            |
| **6 — Components**               | `body`, `main`, `article`, `aside`, `header`, `footer`, `nav`, `search`, `menu`, `output`, `form`, `div`, `skeleton`, `spinner`, `role-group`, `tag`, `dot`, `badge`. Composition rules + descendant chrome                                                                                                                                                                                                         | Deep            |
| **7 — Surfaces**                 | `_popover`, `_backdrop`, `_anchor-position`, `_scrollbar` exist. **Missing per spec:** `_focus.scss`, `_placeholder.scss`, `_marker.scss`, `_selection.scss`, `_view-transition.scss`. Need to author each.                                                                                                                                                                                                         | Medium-Deep     |
| **8 — Composables**              | 20 `use*` + 20 `create*` + 6 chrome partials all exist. **14 missing `use*` test files** (only `useAside`, `useDetails`, `useDialog`, `usePointer`, `usePopover`, `useTheme` have tests). 14 factories have tests. Each composable test should mirror the factory's coverage.                                                                                                                                       | Medium          |
| **9 — Showcase**                 | **49 missing pages** (only `HomePage.vue` exists). One per substantive element + component + composable. Sidebar filter, TOC autoload, theme toggle, mobile drawer                                                                                                                                                                                                                                                  | Deep (volume)   |
| **10 — Distribution**            | Dual-build (`dist/src/styles/index.css` + `dist/src/browser/`), `package.json` exports map, `npm pack --dry-run` audit                                                                                                                                                                                                                                                                                              | Medium          |
| **11 — Invariants verification** | Cascade-layer-order grep, token-driven-variation grep, dual-attribute-gating grep, parity tests, no-mojibake check                                                                                                                                                                                                                                                                                                  | Light           |

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
  pages/             ← showcase pages (only HomePage.vue currently)
  components/        ← SiteNav, Toc
  styles/main.css    ← single CSS entry
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
