# Phase 2 — Parity drivers + per-page bespoke + completion

> With the codebase realigned and the structure/​bijection locked by [phase-1.md](phase-1.md), Phase 2 fills the 43 per-page test files with their **bespoke parity** and adds the up/down-stream **parity drivers** that prove the showcase stays in lock-step with `src/browser`, `src/styles`, and the guides — the `{guide}.test.ts` analogue, scaled to 43 pages. Hard dependency: **every Phase-1 1D batch resolved** (a parity test authored against drift codifies the lie).

---

## Surface

**One** consolidated parity driver + 43 filled per-page files, all in the **`app:browser`** project (the Phase-1 architecture pivot — NOT `app:core` node text-parity). Each imports the route table + page components from the `app/browser` barrel and reads raw `src/` / `.vue` source via `import.meta.glob('…', { query: '?raw', eager: true })` — the server-less idiom `tests/src/browser` uses (no `setupServer` / `readAllPages()` / `node:fs`). Per-page files additionally **mount the component in real Chromium** (the Phase-1 scaffolds already do this), so bespoke parity can assert against the *rendered DOM*, not just parse `.vue` text — a stronger capability than this plan originally assumed.

| File                                          | Role                                                                                                  | Guide-suite analogue                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `tests/app/browser/pages/_contract.ts`        | exported maps from Phase 1 (`PAGE_EXEMPTIONS`, `PAGE_SURFACE_BUNDLES`, …)                             | `src/browser/patterns.ts` registries                    |
| `tests/app/browser/parity.test.ts`            | **single** driver — pages ↔ `src/browser` (elements / factories / contracts, bidirectional) + pages ↔ `src/styles` chrome-bearing partials + pages ↔ guide topology / guide-drift guard. Three `describe` regions (SRC-BROWSER / SRC-STYLES / GUIDES), one file. | `tests/guides/elements.test.ts` + `composables.test.ts` + `showcase.test.ts`, fused |
| `tests/app/browser/pages/{X}Page.test.ts` ×43 | each page's bespoke parity (filled from Phase-1 scaffolds)                                            | `tests/guides/{guide}.test.ts` ×12                      |

Complements `tests/app/core/router.test.ts` (route **table** parity, still node `app:core`, unchanged in Phase 1) — Phase 2 tests the page **files** + the element/component/surface coverage that file never touches. **No assertion is duplicated across the two**; where they’d overlap (composable↔route), Phase 2 keys off the page file, router.test off the route literal.

---

> ## Phase-1 carry-over — direction inputs for Phase 2
>
> Phase 1 changed three things this plan was written before; honour them:
>
> 1. **Browser-env, barrel-keyed (not node text-parity).** The pivot moved the whole suite to `app:browser`. Every Phase-2 driver + per-page file imports `routes` / page components from `../../../app/browser` and globs raw source with `?raw`; per-page files mount the component (`createApp(Page).mount(...)`) and query the live DOM. Do **not** reach for `setupServer`/`readAllPages()`/`readFactorySources()` — use `import.meta.glob`.
> 2. **Single-word-modifier convention shipped + already enforced.** `guides/modifiers.md §Anti-rules` + `classNameIsSanctioned` / `componentNamespacesFromPaths` (`tests/setup.ts`) police it in **guides + src:styles + the showcase** (`pages.test.ts` already runs `REMOVED_FRAMEWORK_MODIFIERS` + a framework-class-sanction check). ⇒ **2C must NOT re-implement** the single-word/guide-drift check for modifiers; and **§7's modifier-coverage must treat sanctioned multi-word names (placement corners `top-start…`, component-namespaced `select-*`/`carousel-*`) as valid** — reuse `classNameIsSanctioned`, don't flag them as "not a modifier".
> 3. **Reuse the hardened Phase-1 parsers — re-deriving them will re-hit fixed bugs.** `splitDeclarations()` (top-level `;` only, parens/quote-aware), **real-start-tag-scoped** attribute extraction (never match `style=`/`class=` inside escaped `<pre><code>` documentation snippets), and **static `class="…"`-only** token rewrites (never `:class` / `v-for` / mustache — the `tray` v-for corruption lesson). The §9 `use{Name}({…})` / `.on.{…}` / return-destructure parser must follow the same start-tag/real-token discipline (call-sites are in `<script setup>`, but code-in-`<pre>` snippets and `:bind` expressions must not be mis-scanned).
> 4. **Phase 1 is fully complete** (1A–1E + 1D-a/b/c/d/e + the single-word convention); `npm run check` 0/0, full suite **144 files / 6283 tests** green. Every Phase-2 hard dependency is satisfied — the roadmap can start immediately.

---

## Contract — the parity invariants (from `showcase.md` §Contract 7)

**Down-stream (`src/` ships → showcase must demo), bidirectional, bundle-aware:**

1. Every substantive key in `src/browser/elements.ts` is demonstrated on an Elements-group page (directly or via `PAGE_SURFACE_BUNDLES`); every Elements page maps to ≥1 real element key.
2. Every `src/browser/factories/create{Name}.ts` ↔ a `Use{Name}Page.vue` (or a bundle entry: `UseThemeButtonPage`→theme+button, `UseDragDropPage`→drag+drop); every `Use*Page` maps to ≥1 real factory. _(router.test.ts already does route↔composable; this does **page-file**↔factory — the missing edge.)_
3. Every `COMPONENT_CONTRACTS` key is exercised on a Components/Surfaces page; every `SURFACE_CONTRACTS` key on a Surfaces page; every `COMPOSABLE_CONTRACTS` key on its `Use*Page`.
4. No orphan page: every non-exempt `*Page.vue` resolves to ≥1 registry entry.

**Down-stream (`src/styles` chrome must be visually smoke-tested):**

5. Every chrome-bearing partial — `src/styles/{components,surfaces,composables}/_{name}.scss` — maps to a page that demonstrates it, resolved through the contract registries (not raw filenames; `_aside.scss` is multi-role, `composables/` is a 6-file subset). Extends `router.test.ts`'s composables-only check to components + surfaces.

**Up-stream (guides ↔ pages topology only — avoid triple-counting):**

6. The `ROUTE_GROUPS` → guide mapping holds (already in `router.test.ts`); Phase 2 adds the **guide-drift guard**: the audit proved `tests/guides/*` miss prose drift (`composables.md` stale option lists, `modifiers.md` placement scope, the `_local.scss` aspirational claim). **Those specific instances are already FIXED** — the 12-guide audit (Phase-1 1D-b + Batches A/B/C) realigned every guide to `src/`, so the guard's job is **regression prevention**, not removing existing drift: add targeted assertions so future guide↔`src/` divergence the existing guide parity can't see is caught here (e.g. every `use{Name}` documented in `composables.md` exists in `src/browser/composables/`; documented option keys exist on the `*Options` type).

**Per-page bespoke (the 43 filled files — each its own reason to exist, like each `{guide}.test.ts`):**

7. Element pages: the page markup demonstrates its tag(s) **and** every applicable `modifiers.ts` variant/size/style/state appears.
8. Foundation pages: `TokensPage` surfaces every `tokens.ts` group; assert the **rendered icon-demo count === `tokens.ts` icon-registry length** against `tokens.ts` itself (Phase-1 1D-a *deleted* the brittle "~20/~25" prose, so there is no number in the page to check — derive it from src + the mounted DOM). `ModifiersPage` every modifier dimension; `ThemePage` every `--color-*`; `PlacementsPage` all 8 placements.
9. `Use*Page`: the page's live demo uses only option keys / return fields / event names that exist on the current `use{Name}` + `create{Name}` + `*EventMap` — **this is where the audit's API-name checks become a permanent guard** (parses the page's `use{Name}({...})` call sites + `.on.{…}` + return destructures, asserts each against `src/browser/types.ts`).
10. Component/Surface pages: every owned `COMPONENT_/SURFACE_CONTRACTS` member is exercised.
11. `PAGE_EXEMPTIONS` pages (`HomePage`/`TypographyPage`/`SectioningPage`): the per-page file exists (bijection is total) and asserts **structure-only** + a one-line "no framework artifact — see PAGE_EXEMPTIONS" note.

---

## Workstreams

### 2A — `tests/app/browser/parity.test.ts` (single consolidated driver)

One file, three top-level `describe` regions (commit once it's green; it is independent of 2B):

- **`parity — pages ↔ src/browser`** — iterate `elements`, `COMPONENT_/SURFACE_/COMPOSABLE_CONTRACTS` (barrel imports) + the `create*` factory list + `.vue` page sources (both via `import.meta.glob('…',{query:'?raw'})`); resolve each through `PAGE_SURFACE_BUNDLES`; assert bidirectional coverage vs the barrel page exports (no `readAllPages()` / node fs). Failure prints the unmapped registry key + the page expected to own it. (Contract §1–§4.)
- **`parity — pages ↔ src/styles`** — for each chrome-bearing `components/`+`surfaces/`+`composables/` partial (globbed `?raw`), resolve its contract-registry entry → the owning page; assert that page demonstrates it. In-file comment: why `composables/` is the 6-partial subset (behaviour-only composables ship no chrome). (Contract §5.)
- **`parity — pages ↔ guides`** — `ROUTE_GROUPS`→guide topology + the **scoped** guide-drift guard: ONLY the `composables.md` option/return/event cross-checks the existing `tests/guides/*` miss. The single-word / modifier-drift guard is **already shipped** in Phase 1 (`pages.test.ts` + `tests/{guides,src/styles}`) — do not duplicate. (Contract §6.)

Rationale for one file (per the user's call): the three regions share the same imports (barrel `routes`/registries, the `?raw` globs, `PAGE_SURFACE_BUNDLES`, `classNameIsSanctioned`) and the same resolve-through-bundles helper — three files would triplicate that scaffolding. `pages.test.ts` (the Phase-1 meta-driver) stays separate (it's the `README.test.ts` analogue); `parity.test.ts` is the fused `{elements,composables,showcase}.test.ts` analogue; the 43 `pages/{X}Page.test.ts` are the per-`{guide}.test.ts` analogue.

### 2B — Fill the 43 `pages/{X}Page.test.ts`

Per-category templates (Contract §7–§11). Sequence in verified batches by group, matching the guide-batch cadence:

1. Foundation: Tokens, Modifiers, Theme, Placements (richest parity; the count/coverage asserts).
2. Elements-Interactive: Button, Anchor, FormControls, Details, DialogElement.
3. Elements-Content: Headings, Typography, Lists, Tables, Media, Figures, Sectioning, InlineAtoms.
4. Components: ArticleCard, Aside, Nav, Menu.
5. Surfaces: PopoverSurfaces, FormSurfaces, ScrollAndTransition.
6. Composables ×18 — the API-name guard (§9) is the high-value batch; it permanently prevents the staleness Phase-1 1D-a just fixed from recurring.
7. `PAGE_EXEMPTIONS` ×3 — structure-only.

### 2C — Tighten the meta-driver to README-grade totality

Once 2A–2B are green, remove any temporary skips/soft-asserts in `pages.test.ts`; the bijection + skeleton must be a **clean total bijection with no exception list** — the exact bar `tests/guides/README.test.ts` holds (its comment: "a clean bijection with NO special-case exceptions"). `PAGE_EXEMPTIONS`/`PAGE_SURFACE_BUNDLES` remain (they're parity scoping, not bijection holes — every page still has its file + route).

---

## Roadmap / sequencing

```
Phase 1 complete (structure + bijection + ALL 1D drift resolved + maps locked)
        │
        ├─ 2A  parity.test.ts  (one file, 3 describe regions) — land + commit
        │
        └─ 2B  per-page fill (7 batches, group order above)
                 │
                 └─ 2C  meta-driver totality tighten  → suite complete
```

Dependencies: **all satisfied — Phase 1 is fully complete** (1A–1E + 1D-a/b/c/d/e + the single-word convention; full suite 6283 green). 2A consumes `PAGE_SURFACE_BUNDLES` (Phase-1 1E) and lands as one commit. 2B-batch-6 (composable API guard) no longer races anything — 1D-a (UseToast/Pointer) and 1D-e (`UseCarouselReturn` start/stop, `createTooltip` `dataset.tooltipSide`/`place`, `VARIANTS_ALERT`=6, `div.stack`, `_anchor-position` defaults — all confirmed-correct) are resolved, so it asserts against a clean baseline. The parity.test.ts GUIDES region only *locks in* the already-aligned guides; the single-word/guide-drift modifier check is **already shipped** in `pages.test.ts` + `tests/{guides,src/styles}`, so it scopes to the remaining `composables.md` option/return/event cross-checks only.

## Tests / exit criteria

- Every driver + all 43 per-page files green; `pages.test.ts` a total no-exception bijection.
- `npm run check` 0/0; full suite green (Phase-1 close baseline: **144 files / 6283 tests**; Phase 2 only adds — never makes the baseline regress). Don't hard-code counts in assertions; derive from src.
- A deliberately-introduced drift (rename a `use*` option in a page; remove a registry-covered surface demo; drop a section `id`) fails a _specific, well-named_ test — the suite's value proven, the way the guides suite proves itself.
- `guides/showcase.md` §Tests checklist fully satisfied; update its "test project is queued" line to "shipped" as the closing commit.

## Patterns

- Per-page files carry **bespoke** logic only — anything true for all 43 belongs in `pages.test.ts`, not copy-pasted ×43 (the guide suite's discipline: `README.test.ts` holds the universal, `{guide}.test.ts` holds the specific).
- The composable API guard (§9) is the strategic centerpiece: it converts the one-time Phase-1 audit into a standing invariant so pages can never silently rot against `src/` again — the whole reason the user flagged "a lot of the content is out of date."
- Commit per driver and per 2D batch; never a mega-commit; push on the session cadence.

## See also

- [phase-1.md](phase-1.md) — foundation, bijection, and the full 1D drift punch-list this phase depends on.
- `tests/guides/{showcase,elements,composables}.test.ts` — the per-surface parity drivers this mirrors.
- `tests/app/core/router.test.ts` — route-table parity; Phase 2 extends to page files, never duplicates.
- `src/browser/patterns.ts` — the contract registries 2A/2B iterate.
