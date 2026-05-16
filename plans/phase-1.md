# Phase 1 — Foundation + Alignment

> Stand up the `tests/app/browser/` page suite the way `tests/guides/` is built — a uniform-structure meta-driver + a **total** page↔route↔test bijection — and, because a parity test can only be locked green against truth, **realign every page with the guides and the actual `src/` implementation first**. Phase 1 ships structure + a clean codebase; Phase 2 ([phase-2.md](phase-2.md)) ships the up/down-stream parity drivers + per-page bespoke parity.

---

## Progress

> Live execution tracker. Status: ☐ todo · 🔄 in progress · ✅ done.

Foundation milestone shipped in commit `92936f5` (58 files: driver + `_contract` + 43 scaffolds + 1D-d skeleton + barrel-import fix). `npm run check` 0/0, guides 3475/3475, `app:core` 633 pass — §1–§6 (uniformity / skeleton / total bijection) fully green. The 24 remaining `app:core` failures are the precise 1D-c worklist enumerated below.

| WS | Item | Status | Notes |
| --- | --- | --- | --- |
| 1A | Test infra | ✅ `92936f5` | **Decision:** suite lives under `tests/app/core/pages/` (not `…/browser/`). The `app:core` glob already covers `tests/app/core/**`; `router.test.ts` is the sibling text-parity precedent; `app:browser` has no `node:fs`. Zero `vite.config.ts` change. `readAllPages()` added to `setupServer.ts`. **Also fixed:** `router.test.ts` / `constants.test.ts` imported the `app/browser` barrel, which `export *`s `./router.js` → pulls 43 `.vue` into the no-vue-plugin `app:core` (pre-existing collection break) — repointed to the submodules. |
| 1E | Lock the maps (`_contract.ts`) | ✅ `92936f5` | `PAGE_EXEMPTIONS` / `PAGE_SURFACE_BUNDLES` / `PAGE_H1_DEMO` / `INTRO_ID_EXCEPTIONS` (empty — convention total). |
| 1D-d | Convention nits (skeleton-blocking) | ✅ `92936f5` | JSDoc leading-space + `{Page} — ` first line (Home/Sectioning/Typography); import regroup (Button/DialogElement); intro-id fixes (article-card / inline-atoms / scroll-and-transition); h1↔title alignment (route `Home`→`Elements`; `Sectioning content`→`Sectioning`; `useTheme &amp;`→`useTheme /`). |
| 1B | `pages.test.ts` meta-driver | ✅ `92936f5` | §1–§6 green + faithful §7/§8 (per-decl exemption, top-level sections, comment-stripped selectors). Drives the 24-item 1D-c worklist below. |
| 1C | 43 per-page scaffolds | ✅ `92936f5` | Thin/real/page-specific; Phase 2 fills bespoke. |
| 1D-c | showcase §2/§4 violations | 🔄 in progress | **Worklist (24, driver-enumerated):** §7 inline-style (14): ArticleCard, Button, Details, DialogElement, FormSurfaces, InlineAtoms, Media, Nav, PopoverSurfaces, Tokens, UseNav, UsePointer, UseTable, UseTooltip. §8 scoped-namespace (10): FormControls, UseDetails, UseDialog, UseDragDrop, UseMenu, UsePopover, UseTabs, UseThemeButton, UseToast, UseTooltip. |
| 1D-a | page↔src factual drift (10) | ☐ todo | The 10-row table in §1D-a below. |
| 1D-e | re-verify low-confidence flags | ☐ todo | |
| — | Phase close (check + guides 3475 + test:app) | ☐ todo | Gated on 1D-c/a/e all resolved. |

**Execution order (as run):** 1A → 1E → 1D-d → 1B → 1C → [foundation commit `92936f5`] → 1D-c → 1D-a → 1D-e → close. 1D-d/1E preceded 1B because the strict meta-driver can only go green against an already-uniform skeleton + the declared allow-list maps.

---

## Surface

The guides suite is the template. It has three layers; the pages suite mirrors each:

| `tests/guides/` (template) | `tests/app/browser/` (this plan) |
| --- | --- |
| `README.test.ts` meta-driver — every `*.md` opens `# Title`→`> blockquote`, ships the `## Surface…See also` skeleton, **total guide↔test bijection**, cross-ref resolution | `pages.test.ts` meta-driver — every `*Page.vue` ships the uniform `<script setup>`+`<template>` skeleton, **total page↔route↔test bijection** |
| `{guide}.test.ts` ×12 — per-guide parity vs `src/browser` + `src/styles` | `pages/{X}Page.test.ts` ×43 — per-page bespoke parity (Phase 2) |
| node project, `tests/setup.ts` + `tests/setupServer.ts`, text-parity (reads `.md`) | `app:core` node project, same setup stack, text-parity (reads `.vue`) |

Authoritative registries the suite keys off (named by `guides/showcase.md` §Contract 7):

- `src/browser/elements.ts` — substantive element baselines.
- `src/browser/factories/create{Name}.ts` ×20 / `src/browser/composables/use{Name}.ts` ×20.
- `src/browser/patterns.ts` — `COMPONENT_CONTRACTS`, `SURFACE_CONTRACTS`, `COMPOSABLE_CONTRACTS`, `MODIFIER_DIMENSION_TOKENS`, `STYLE_LAYERS`.
- `src/browser/{tokens,modifiers,taxonomy,events}.ts`.
- `app/browser/types.ts` `ROUTE_GROUPS`, `app/browser/router.ts` route table.

---

## Contract — the uniform `.vue` skeleton

The `.vue` analogue of the guide `# Title → > blockquote → ## Surface …` skeleton. **Strict for all 43 pages, zero exemptions** (per the locked decision "skeleton strict, parity exempt"):

1. File named `{Pascal}Page.vue`; exactly one `<script lang="ts" setup>` and one `<template>`.
2. Script opens with a JSDoc block whose first content line is `{Pascal}Page — {summary}`.
3. `<template>`'s first element child is `<section id="{routeId}-intro">` containing exactly one `<hgroup><h1>…</h1><p>…</p></hgroup>`.
4. Exactly one **page** `<h1>` (the intro H1). Demo H1s inside a clearly-marked demo region are the only allowed exception — see `PAGE_H1_DEMO` allow-list (HeadingsPage).
5. Every top-level `<section>` carries a unique `id` (the TOC contract — `App.vue` builds the right rail from `section[id]`).
6. **Page↔route↔test bijection** (the guide↔test totality): every `pages/{X}Page.vue` ↔ exactly one `router.ts` route ↔ exactly `tests/app/browser/pages/{X}Page.test.ts`. `<h1>` text === route `title`; intro id === `{routeId}-intro`. All three directions, **no skips**.
7. No inline `style=` except the `showcase.md` §2 exemptions (reactive `:style` binding; single-property dimensional one-off; pure token demo `--x: var(--set-…)`).
8. Page-authored classes are `.showcase-`-namespaced; every class authored in `styles/showcase.css` starts `.showcase-`.

Two declared single-source-of-truth maps (the `PROCESS_DOCS` / `FILE_EXCEPTIONS` analogues), consumed by Phase 2 parity but **declared in Phase 1**:

- `PAGE_EXEMPTIONS` — pages that demo no single framework artifact, exempt from Phase-2 *parity* only (still pass the skeleton): `HomePage`, `TypographyPage`, `SectioningPage`.
- `PAGE_SURFACE_BUNDLES` — legit one-page-covers-many: `HeadingsPage→[h1..h6,hgroup]`, `InlineAtomsPage→[badge,dot,tag,spinner,skeleton]`, `MediaPage→[img,picture,video,audio,canvas,svg,iframe,embed,object]`, `TypographyPage→[~23 inline/block text tags]`, `SectioningPage→[main,section,article,aside,header,footer,nav,search,hgroup]`, `FormControlsPage→[input,textarea,select,datalist,label,fieldset,legend,output,progress,meter]`, `PopoverSurfacesPage→[popover,anchor-position,backdrop]`, `FormSurfacesPage→[focus,placeholder,marker,selection]`, `ScrollAndTransitionPage→[scrollbar,view-transition]`, `UseThemeButtonPage→[useTheme,useButton]`, `UseDragDropPage→[useDrag,useDrop]`.

---

## Workstreams

### 1A — Test infra

- Wire `tests/setupServer.ts` into the `app:core` project `setupFiles` in `vite.config.ts` (currently only `tests/setup.ts`) so page tests share the guides stack (`WORKSPACE_ROOT`, `readGuide`, `readFactorySources`).
- Add `readAllPages()` to `tests/setupServer.ts` — mirrors `readAllGuides()`; returns `{ {X}Page: rawSource }` from `app/browser/pages/`.
- Decide test-tree home: per the locked decision the per-page files live under `tests/app/browser/pages/` and run in **`app:core`** (node text-parity — browser env has no `fs`, importing 43 `.vue` is heavy). Confirm `vite.config.ts` `app:core` include glob covers `tests/app/**` (currently `tests/app/core/**`); add `tests/app/browser/pages/**` to the `app:core` include OR relocate — **decision recorded in 1A**, default: extend `app:core` include to `tests/app/**/*.test.ts` minus the existing `tests/app/browser/{helpers,composables,index}.test.ts` (those stay `app:browser`).

### 1B — Uniform-structure meta-driver (`tests/app/browser/pages.test.ts`)

Iterates `readAllPages()` and enforces Contract §1–§8 across all 43 + the total bijection against `router.ts` + the `tests/app/browser/pages/` directory listing. Mirrors `README.test.ts` exactly: a UNIFORMITY block, a SKELETON block, a BIJECTION block, an inline-style/namespace block. Failure messages name the offending page + the precise rule (same `On failure:` convention as the guide drivers).

### 1C — Scaffold the 43 per-page test files

Create `tests/app/browser/pages/{X}Page.test.ts` ×43, each asserting only the page's own skeleton conformance initially (a thin, real test — not a placeholder). This *establishes* the bijection so 1B's bijection block goes green. Phase 2 fills each with bespoke parity.

### 1D — Alignment remediation (the load-bearing workstream)

The audit (43 pages × guides × `src/`) found the suspected staleness is real but **localized**: no broad API-name rot, but concrete factual drift where pages/guides describe behavior `src/` no longer has. A parity test authored against drift would either fail or codify the lie — so these are fixed **before** Phase 2. Fix in verified batches (`npm run test:app` + `npm run check` + browser-preview the touched page each batch, like the guide-batch cadence), each batch its own commit.

> **Status — guide leg COMPLETE.** The guide↔`src/` half of the three-way alignment is fully closed: a deep 12-guide audit + remediation shipped in commits `7b7cfc5` (1D-b core), `ca154b3` (Batch A: tokens/surfaces/components/patterns/composables/modifiers/README), `d8e1339` (Batch B: `elements.md` realigned to `taxonomy.ts`), `532a163` (Batch C: verification-pass residuals in styles/contribute/patterns/components/showcase/README). `npm run check` 0/0 and guides 3475/3475 throughout. **The guides are now a trustworthy Phase-2 parity reference.** Remaining 1D work below is **page-side only** (1D-a, 1D-c, 1D-d) plus the 1D-e re-verifications — 1D-b is done.

**Batch 1D-a — page ↔ `src/` factual drift (HIGH/MED):**

| # | Page / loc | Claim | `src/` reality | Fix |
| --- | --- | --- | --- | --- |
| 1 | `UseToastPage.vue` ~783–788 | "Audit note: factory does NOT implement swipe-to-dismiss; struck from guides" | `createToast.ts` 24,56,287–394 fully implements swipe via `createPointer`; `types.ts:849` `swipe` option; `composables.md:396` documents it; page's own §7 demos it | **Delete the stale audit note.** Highest priority — actively self-contradicting. |
| 2 | `InlineAtomsPage.vue` ~284–287 | spinner default mid-chain `--set-variant-color`; standalone `.spinner.primary` paints white | `_spinner.scss:48` = `var(--set-style-color, var(--set-variant-background-color, currentColor))` → standalone = variant **identity (blue)**; white-on-button is a separate `button.loading > .spinner` override | Rewrite the cascade prose to match `_spinner.scss`. |
| 3 | `ModifiersPage.vue` ~470–473 | `form.row` / `button.dropdown` / `table.striped` live in `modifiers/_local.scss` | `_local.scss` has them **commented-out reserved**; live in `components/_form.scss`, `elements/_button.scss`, `elements/_table.scss` | Correct the file references; note `_local.scss` migration is future. (Couples with guide fix 1D-b#1.) |
| 4 | `NavPage.vue` ~300 + JSDoc 40–42 | bare tablist active = per-tab **bottom-border / overlap indicator** | `_nav.scss` 357–369 abandoned the border for a `bg-subtle` background-tint | Rewrite the tablist-indicator description. |
| 5 | `NavPage.vue` ~504–505 | `--set-nav-border-color` defaults flat `--color-border` | `_nav.scss:66–69` variant-aware cascade (`--set-style-border-color → --set-variant-background-color → --color-border`) | Correct the default description. |
| 6 | `ListsPage.vue` ~173–176 | `.active` row "switches text to the matching on-fill color" | `_li.scss:68` `--set-group-active-color: white` (hardcoded) | Correct to "white". |
| 7 | `UsePointerPage.vue` ~180–181 | prose: reach for `useDragDrop` | no such composable; it's `useDrag` + `useDrop` (JSDoc cross-ref already correct) | Fix the body prose. |
| 8 | `MediaPage.vue` ~265–266 | `<svg>` retints via `--set-variant-on-canvas-color` ancestor mechanism | `_svg.scss` has no variant rule; mechanism is page invention | Reword to plain `currentColor` inheritance (no invented token). |
| 9 | `UseToastPage.vue` ~406 | code-sample comment references `[data-toast-stack-hidden]` | factory uses `aria-hidden="true"` (`createToast.ts:135`) | Correct the sample comment. |
| 10 | `TokensPage.vue` 44 + ~967 | "~20" / "~25" inline-SVG icon mask URLs | `tokens.ts` icon registry = **26 keys** | Replace prose count with the live count OR drop the approximation; Phase-2 asserts count against `tokens.ts`. |

**Batch 1D-b — guide ↔ `src/` drift — ✅ RESOLVED (commits `7b7cfc5` + Batch A `ca154b3`).** The four items below all shipped; the subsequent full-guide audit (Batches A/B/C) closed every remaining guide↔`src/` drift across all 12 guides, so this batch is a closed historical record, not pending work:

| # | Guide / loc | Claim | `src/` reality | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `modifiers.md` ~220–233 | placement scope `:not(aside):not(nav):not(output)` | `_placements.scss:87` flattened `:not(:where(aside, dialog, nav, output))` (adds `dialog`, `:where()` form) | Updated guide to the src form (PlacementsPage already correct). | ✅ done |
| 2 | `modifiers.md` (~L38/§element-local) | element-local rules live in `modifiers/_local.scss` ("only" home) | live in `components/_form.scss` etc.; `_local.scss` migration is a future follow-up | Softened to "target home; migration pending" (couples with page fix 1D-a#3, still open). | ✅ done |
| 3 | `composables.md:397` | `useTabs` options `orientation / activation / loop` | `UseTabsOptions` = `{ pane, group, initial, on }` | Struck the stale option list. | ✅ done |
| 4 | `composables.md:401` | `useButton` options `pressed / disabled` (refs) | `UseButtonOptions` = `{ on? }` only | Struck the stale option list. | ✅ done |

**Batch 1D-c — `showcase.md` §Contract §2/§4 violations (non-namespaced classes + non-exempt inline styles):**

| Sev | Page | Issue | Fix |
| --- | --- | --- | --- |
| HIGH | `FormControlsPage.vue` 800–871 | non-namespaced `.form-row*` system in `<style scoped>`, coexists with compliant `.showcase-form-row` | Collapse to the `.showcase-form-row*` system (move to `showcase.css` or namespace + keep scoped per the §4 ruling — decision in 1D-c). |
| HIGH | `ButtonPage.vue` ~518 | `class="event-log"` non-namespaced showcase-only class | Rename `.showcase-event-log`. |
| MED | `ArticleCardPage.vue` ~225 | inline `background-color: rgb(255 255 255 / 0.2)` (hardcoded, non-token) | `.showcase-*` class or token. |
| MED | `InlineAtomsPage.vue` ~142 | inline hardcoded `rgba(...)` badge bg | `.showcase-*` class or token. |
| MED | `FormSurfacesPage.vue` ~240–245 | 4-prop inline mixing layout + token | `.showcase-*` class. |
| MED | `MenuPage.vue` ~376–380 | 3-prop inline header chrome | `.showcase-*` class. |
| MED | `NavPage.vue` ~273 | 3-prop inline flex layout | `.stack` / Tailwind / `.showcase-*`. |
| MED | `UseFocusPage.vue` 138/193/250 | static `border`/`border-radius`/`padding` baked into reactive `:style` objects | split: reactive props stay inline, static chrome → `.showcase-*`. |
| LOW | `MediaPage.vue` ~268 | `display:inline-block` + color inline | utility / `.showcase-*`. |
| LOW | Details/Dialog/Figures/Anchor | borderline 2-prop token+dimensional inline | tighten to single-property or `.showcase-*`. |

**Batch 1D-d — convention nits the strict skeleton (1B) will flag:**

- `HomePage.vue` first section id `home` → `home-intro` (or add `HomePage` to a documented `INTRO_ID_EXCEPTIONS` of size 1 — **decision: rename**, the convention should be total).
- `SectioningPage.vue` / `TypographyPage.vue` JSDoc opens ` /**` (leading space) → first content line slips to line 3. **Decision: fix the whitespace** so the skeleton check stays a clean "first JSDoc content line === `{Page} — …`".
- `HeadingsPage.vue` legitimately renders 3 `<h1>` (it demos `<h1>`). Add it to the `PAGE_H1_DEMO` allow-list (the only entry) — the rule becomes "exactly one page-H1; demo-H1s allowed only for allow-listed pages."
- `ButtonPage.vue` / `DialogElementPage.vue` split `import → logic → import` ordering — **decision: regroup imports** to the single-block convention (oxlint has no `import/first`, so this is a convention fix, low risk).

**Batch 1D-e — re-verify the agents' low-confidence flags before they enter Phase-2 assertions:** `surfaces/_anchor-position.scss` token defaults (PlacementsPage L365/373), `components/_div.scss` `.stack` primitive (Headings/Lists), `createTooltip.ts` `on.place` / `[data-tooltip-side]`, `VARIANTS_ALERT.length` vs UseAlertPage "Six". Each either confirmed-correct (no change) or added to 1D-a.

- ✅ **`UseCarouselReturn` `start/stop` — RESOLVED, no action.** The verification audit confirmed `start` / `stop` are present on `UseCarouselReturn` in `src/browser/types.ts` and the `composables.md` carousel row is accurate. No src change and no JSDoc change is needed; drop this from the Phase-2 dependency (was a suspected src-side gap, now closed).

### 1E — Lock the maps

Finalize `PAGE_EXEMPTIONS`, `PAGE_SURFACE_BUNDLES`, `PAGE_H1_DEMO`, `INTRO_ID_EXCEPTIONS` (empty after 1D-d) as exported constants in a `tests/app/browser/pages/_contract.ts` helper (the `patterns.ts`-registry analogue) — single source of truth Phase 2 imports.

---

## Tests / exit criteria

- 1A–1C land first (structure is content-independent): `pages.test.ts` green, 43 scaffolds green, bijection total — **no skips, no special-cases**, exactly the `README.test.ts` totality bar.
- 1D batches each gated by `npm run test:app` + `npm run check` + browser-preview of the touched page; one commit per batch; the drift tables above are the punch-list — Phase 1 is done when every row is resolved (fixed, or consciously moved to `PAGE_EXEMPTIONS`/a map with a one-line rationale).
- `npm run check` + guides 3475 + `test:app` all green at phase close; `git push` per the session's cadence.

## Patterns

- Mirror the guide drivers' ergonomics: `it('… On failure: …')` messages that name the file + the exact contract clause + the remedy.
- Batch + verify + commit like the guide-skeleton rewrites — never a 43-file mega-commit.
- Alignment edits are **showcase/guide-side only** — Phase 1 never touches `src/` (the showcase consumes the framework; drift is fixed by correcting the doc/markup to match `src/`, not by changing `src/`). The earlier suspected `src/`-adjacent exception (1D-e `UseCarouselReturn` type) was re-verified and is **not** a gap — no framework change needed. Any genuinely stale `src/` comment found incidentally (e.g. a `_nav.scss` note, or `patterns.ts` header comments referencing test paths that don't exist) is flagged for a separate, explicitly-authorized framework change — **not** folded into the showcase alignment commits.

## See also

- [phase-2.md](phase-2.md) — the parity drivers + per-page bespoke + completion roadmap.
- `guides/showcase.md` §Contract / §Tests — the codified contract this suite enforces.
- `tests/guides/README.test.ts` — the meta-driver this mirrors.
- `tests/app/core/router.test.ts` — the route-table parity already shipped; Phase 2 extends, never duplicates it.
