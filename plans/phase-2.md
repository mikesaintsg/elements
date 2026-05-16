# Phase 2 — Parity drivers + per-page bespoke + completion

> With the codebase realigned and the structure/​bijection locked by [phase-1.md](phase-1.md), Phase 2 fills the 43 per-page test files with their **bespoke parity** and adds the up/down-stream **parity drivers** that prove the showcase stays in lock-step with `src/browser`, `src/styles`, and the guides — the `{guide}.test.ts` analogue, scaled to 43 pages. Hard dependency: **every Phase-1 1D batch resolved** (a parity test authored against drift codifies the lie).

---

## Surface

Three new driver files + 43 filled per-page files, all `app:core` node text-parity:

| File | Role | Guide-suite analogue |
| --- | --- | --- |
| `tests/app/browser/pages/_contract.ts` | exported maps from Phase 1 (`PAGE_EXEMPTIONS`, `PAGE_SURFACE_BUNDLES`, …) | `src/browser/patterns.ts` registries |
| `tests/app/browser/srcBrowserParity.test.ts` | pages ↔ `src/browser` (elements / factories / component+surface+composable contracts) — bidirectional | `tests/guides/elements.test.ts` + `composables.test.ts` |
| `tests/app/browser/srcStylesParity.test.ts` | pages ↔ `src/styles` chrome-bearing partials, keyed off the contract registries | `tests/src/styles/*/_index.test.ts` |
| `tests/app/browser/guidesParity.test.ts` | pages ↔ guide topology + the guide-drift guard the existing guide tests miss | `tests/guides/showcase.test.ts` |
| `tests/app/browser/pages/{X}Page.test.ts` ×43 | each page's bespoke parity (filled from Phase-1 scaffolds) | `tests/guides/{guide}.test.ts` ×12 |

Complements `tests/app/core/router.test.ts` (route **table** parity) — Phase 2 tests the page **files** + the element/component/surface coverage that file never touches. **No assertion is duplicated across the two**; where they’d overlap (composable↔route), Phase 2 keys off the page file, router.test off the route literal.

---

## Contract — the parity invariants (from `showcase.md` §Contract 7)

**Down-stream (`src/` ships → showcase must demo), bidirectional, bundle-aware:**

1. Every substantive key in `src/browser/elements.ts` is demonstrated on an Elements-group page (directly or via `PAGE_SURFACE_BUNDLES`); every Elements page maps to ≥1 real element key.
2. Every `src/browser/factories/create{Name}.ts` ↔ a `Use{Name}Page.vue` (or a bundle entry: `UseThemeButtonPage`→theme+button, `UseDragDropPage`→drag+drop); every `Use*Page` maps to ≥1 real factory. *(router.test.ts already does route↔composable; this does **page-file**↔factory — the missing edge.)*
3. Every `COMPONENT_CONTRACTS` key is exercised on a Components/Surfaces page; every `SURFACE_CONTRACTS` key on a Surfaces page; every `COMPOSABLE_CONTRACTS` key on its `Use*Page`.
4. No orphan page: every non-exempt `*Page.vue` resolves to ≥1 registry entry.

**Down-stream (`src/styles` chrome must be visually smoke-tested):**

5. Every chrome-bearing partial — `src/styles/{components,surfaces,composables}/_{name}.scss` — maps to a page that demonstrates it, resolved through the contract registries (not raw filenames; `_aside.scss` is multi-role, `composables/` is a 6-file subset). Extends `router.test.ts`'s composables-only check to components + surfaces.

**Up-stream (guides ↔ pages topology only — avoid triple-counting):**

6. The `ROUTE_GROUPS` → guide mapping holds (already in `router.test.ts`); Phase 2 adds the **guide-drift guard**: the audit proved `tests/guides/*` miss prose drift (`composables.md` stale option lists, `modifiers.md` placement scope, the `_local.scss` aspirational claim). Add targeted assertions so guide↔`src/` drift the existing guide parity can't see is caught here (e.g. every `use{Name}` documented in `composables.md` exists in `src/browser/composables/`; documented option keys exist on the `*Options` type).

**Per-page bespoke (the 43 filled files — each its own reason to exist, like each `{guide}.test.ts`):**

7. Element pages: the page markup demonstrates its tag(s) **and** every applicable `modifiers.ts` variant/size/style/state appears.
8. Foundation pages: `TokensPage` surfaces every `tokens.ts` group (and the icon **count** === `tokens.ts` icon-registry length — the audit's "~25" lesson); `ModifiersPage` every modifier dimension; `ThemePage` every `--color-*`; `PlacementsPage` all 8 placements.
9. `Use*Page`: the page's live demo uses only option keys / return fields / event names that exist on the current `use{Name}` + `create{Name}` + `*EventMap` — **this is where the audit's API-name checks become a permanent guard** (parses the page's `use{Name}({...})` call sites + `.on.{…}` + return destructures, asserts each against `src/browser/types.ts`).
10. Component/Surface pages: every owned `COMPONENT_/SURFACE_CONTRACTS` member is exercised.
11. `PAGE_EXEMPTIONS` pages (`HomePage`/`TypographyPage`/`SectioningPage`): the per-page file exists (bijection is total) and asserts **structure-only** + a one-line "no framework artifact — see PAGE_EXEMPTIONS" note.

---

## Workstreams

### 2A — `srcBrowserParity.test.ts`
Iterate `elements.ts`, `readFactorySources()`, `COMPONENT_/SURFACE_/COMPOSABLE_CONTRACTS`; resolve each through `PAGE_SURFACE_BUNDLES`; assert bidirectional coverage vs `readAllPages()`. Failure prints the unmapped registry key + the page expected to own it.

### 2B — `srcStylesParity.test.ts`
For each `components/`+`surfaces/`+`composables/` partial, resolve its contract-registry entry → the owning page; assert that page demonstrates it. Reuse `router.test.ts`'s composables result; add components/surfaces. Document (in-file) why `composables/` is a 6-partial subset (behavior-only composables ship no chrome).

### 2C — `guidesParity.test.ts`
`ROUTE_GROUPS`→guide topology (lift from router.test.ts if cleaner here) + the guide-drift guard (Contract §6). Scope tight — guides↔src is `tests/guides/*`'s job; this only adds the cross-checks the audit proved are missing.

### 2D — Fill the 43 `pages/{X}Page.test.ts`
Per-category templates (Contract §7–§11). Sequence in verified batches by group, matching the guide-batch cadence:

1. Foundation: Tokens, Modifiers, Theme, Placements (richest parity; the count/coverage asserts).
2. Elements-Interactive: Button, Anchor, FormControls, Details, DialogElement.
3. Elements-Content: Headings, Typography, Lists, Tables, Media, Figures, Sectioning, InlineAtoms.
4. Components: ArticleCard, Aside, Nav, Menu.
5. Surfaces: PopoverSurfaces, FormSurfaces, ScrollAndTransition.
6. Composables ×18 — the API-name guard (§9) is the high-value batch; it permanently prevents the staleness Phase-1 1D-a just fixed from recurring.
7. `PAGE_EXEMPTIONS` ×3 — structure-only.

### 2E — Tighten the meta-driver to README-grade totality
Once 2A–2D are green, remove any temporary skips/soft-asserts in `pages.test.ts`; the bijection + skeleton must be a **clean total bijection with no exception list** — the exact bar `tests/guides/README.test.ts` holds (its comment: "a clean bijection with NO special-case exceptions"). `PAGE_EXEMPTIONS`/`PAGE_SURFACE_BUNDLES` remain (they're parity scoping, not bijection holes — every page still has its file + route).

---

## Roadmap / sequencing

```
Phase 1 complete (structure + bijection + ALL 1D drift resolved + maps locked)
        │
        ├─ 2A srcBrowserParity ─┐
        ├─ 2B srcStylesParity ──┼─ (independent; land + commit each)
        ├─ 2C guidesParity ─────┘
        │
        └─ 2D per-page fill (7 batches, group order above)
                 │
                 └─ 2E meta-driver totality tighten  → suite complete
```

Dependencies: 2D-batch-6 (composable API guard) **must** post-date Phase-1 1D-a (UseToast/Pointer fixes) and 1D-e (`UseCarouselReturn` resolution) or it asserts against known-bad. 2A/2B depend on `PAGE_SURFACE_BUNDLES` (locked in Phase-1 1E). 2C depends on 1D-b (guide fixes) — otherwise the guide-drift guard fails on the very drift Phase 1 is removing.

## Tests / exit criteria

- Every driver + all 43 per-page files green; `pages.test.ts` a total no-exception bijection.
- `npm run test:app`, `npm run check`, guides 3475, `tests/src/*` all green.
- A deliberately-introduced drift (rename a `use*` option in a page; remove a registry-covered surface demo; drop a section `id`) fails a *specific, well-named* test — the suite's value proven, the way the guides suite proves itself.
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
