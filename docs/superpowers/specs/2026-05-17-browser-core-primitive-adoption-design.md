# `@elements/core` adoption across `src/browser` — design

> Make `@elements/browser` depend on `@elements/core` and replace every ad-hoc JS type/enum/shape/coercion guard across all of `src/browser` with core primitives. Core is canonical; DOM operations stay native. Verified + committed in batches.

Date: 2026-05-17
Status: approved (brainstorming) — pending written-spec review

## 1. Context & goal

`@elements/core` (`src/core/`) is a large, environment-agnostic, rigorously-tested library: `validators.ts` (primitive/built-in/protocol/collection/JSON/typed-array/emptiness/arity guards + compositors), `parsers.ts` (`unknown → typed | undefined` + coercion + enum + field + shape-bridge), `helpers.ts` (`attempt` never-throw Result boundary, `createRandom` Mulberry32 PRNG, contract-DSL internals), and the `shapers`+`compilers` contract DSL. Barrel: `src/core/index.ts` exports types/constants/helpers/validators/parsers/shapers/compilers (no `schema` — the inverse subsystem was removed as root-complexity reduction).

`src/browser` currently imports **zero** core (only one doc-comment mention). It hand-rolls ~218 guard/parse/narrow/coerce sites across 40 files — concentrated in `helpers.ts` (76), `createTable.ts` (27), `createDrag.ts` (18), `createToast.ts` (12), `traversals.ts` (6). These are duplicated complexity core already solves correctly.

**Goal:** introduce `@elements/core` as a real runtime dependency of `@elements/browser` and replace every ad-hoc JS-domain guard/parse/coerce with the core equivalent, repo-wide. Per the complexity-philosophy memory, this is root-cause removal (delete the parallel implementations), not workarounds.

### Decisions taken during brainstorming

1. **Scope:** all of `src/browser` (helpers, traversals, every factory/composable/taxonomy/patterns file). `@elements/core` becomes a real import.
2. **Behavior policy:** core is canonical. Where a call site needs different behavior, **compose** core (`whereOf`/`andOf`/`nullableOf`/refine) — never re-hand-roll, never special-case. Edge-case test expectations that shift are updated to the new canonical contract, audited via a divergence ledger.
3. **DSL depth:** lightweight guard compositors (`recordOf`/`arrayOf`/`literalOf`/`whereOf`/`instanceOf`/`enumOf`) by default; the `shapers`+`compilers` contract DSL only where a site genuinely needs parse+guard from one declaration, compiled **once at module scope** (never on a hot event path).
4. **Sequencing:** Approach A — two-pass: wire dependency + core-canonical `helpers.ts`/`traversals.ts` first (the call epicenter + divergence ledger), then ripple category-by-category across the 38 remaining files; each a verified+committed batch.

## 2. Architecture & dependency boundary

- `src/browser` files import core primitives **by name** from `@elements/core` (resolved via the existing `@elements/*` tsconfig path alias → `src/core/index.ts`; vitest/vite reuse that alias). Core is the sanctioned shared layer and never imports back (AGENTS §5).
- **Barrel rule (AGENTS §6):** `src/browser/index.ts` must NOT re-export any `@elements/core` symbol. Consumers of `@elements/browser` that also want core import `@elements/core` directly.
- **Build:** `@elements/core` and `@elements/browser` are two subpath exports of the one `elements` package (`./core`, `./browser`). Batch 1 verifies `configs/src/vite.browser.config.ts` + `configs/src/tsconfig.browser.json` resolve/handle the new browser→core import consistently with publication (bundle vs externalize). Any build-config change is its own reviewed step in batch 1, not bundled into a code batch.

### The clean boundary (complexity-philosophy memory)

Core owns, and `src/browser` delegates to core for: JS primitive/collection **type guards**; **enums/literals** (`literalOf`/`enumOf`); **arrays/records/sets/tuples** (`arrayOf`/`recordOf`/`setOf`/`tupleOf`); **coercion/parsing** (`parse*`/`coerce*`/`parseEnum`); the never-throw **`attempt`** Result boundary; the **`createRandom`** PRNG.

DOM stays native — `el instanceof HTMLElement`, `node.nodeType`, `event instanceof PointerEvent`, element/event property reads, `getBoundingClientRect`, focus/scroll/Vue-reactivity mechanics. This is core's deliberate environment-agnostic non-scope: a clean architectural boundary, **not** a hack. We do NOT wrap DOM `instanceof` in `instanceOf(Ctor)(x)` — that is ceremony with zero correctness gain and is itself the circumvention/awkward-exception anti-pattern the memory forbids. `traversals.ts` stays DOM-native; only its non-DOM logic (the `MatcherOptions`/`ElementPredicate` composition, any enum/array bits) adopts core.

## 3. Substitution catalog (by category)

- **Primitive/type guards → core:** `isStringArray`→`arrayOf(isString)`; `isEventHandler`→`isFunction`; ad-hoc `typeof x === 'string'|'number'|'function'|'boolean'` → `isString`/`isNumber`/`isFunction`/`isBoolean`; `Array.isArray`→`isArray`.
- **Enums/literals → `literalOf(...)`:** `isSetting` (`'light'|'dark'|'system'`), `isDropPosition` (`'before'|'after'|'into'`), `isSide`, and scattered string-union checks across `createSelect`/`createToast`/`createTable`/composables.
- **Object-shaped runtime guards → `recordOf({...})` compositions:** `isDragTapDetail`, `isDragStartDetail`, `isDragOverDetail`, `isDragDropDetail`; `MatcherOptions` validation; table/form predicate shapes. DSL `objectShape`+`compileGuard`/`compileParser` only where a site also parses input (e.g. form/table coercion), compiled once at module scope.
- **Numeric/coercion → core parsers:** `normalizeIndex` → `parseInteger` + bounds composition; ad-hoc `Number(...)`/`parseFloat`/`Number.isFinite`/`Number.isInteger` in `createTable`/`createToast`/`createDrag`/popover offsets → `parseNumber`/`parseInteger`/`coerceNumber`; `toStringList` reconciled against core `parseArray`/`coerceString`.
- **Safe property reads:** `extractProperty` reworked over core `isRecord` + `Reflect.get`; drag/detail guards consume it consistently.
- **Never-throw boundaries → `attempt`:** ad-hoc `try/catch`-returning-fallback (`createTheme`/`theme.ts` storage, `createToast`, etc.) where the pattern is "run callback, contain throw."
- **Stays native:** every DOM `instanceof`, `nodeType`, element/event property access, layout/measurement, focus/scroll, Vue reactivity.

## 4. Behavior-divergence handling (core canonical)

Pass 1 produces a **divergence ledger** (in the plan): each site where core semantics differ from the hand-rolled one — e.g. core `isRecord` rejects class instances & arrays via prototype check (old code used `Object.prototype.hasOwnProperty`); `parseInteger`/`parseNumber` reject `±Infinity`/`NaN`; `parseEnum` trims then exact-matches. For each entry: adopt core's behavior; where a call site legitimately needs a narrower/different predicate, **compose** core (`whereOf(base, refine)`, `andOf`, `nullableOf`) — never re-hand-roll, never special-case (root-cause discipline). Any of the 5288 `src:browser`/`guides`/factory/composable tests whose edge expectations shift are updated to assert the new canonical contract, with rationale recorded in the ledger so the change is auditable, not silent. `src/browser/types.ts` is updated wherever a guard's narrowed type changes (types-first, AGENTS §5). Now-redundant local guards/`@remarks` (e.g. `helpers.ts` `toStringList` notes) are **deleted**, not shimmed.

## 5. Testing & verification

Per-batch gate (unchanged from prior effort): `npm run check` → 0 errors/0 warnings; targeted `npx vitest run --project src:browser` (plus `--project guides` where doc/parity is touched); `npm run build`. Commit per green batch on `main` with explicit pathspecs; push only on explicit per-push authorization (workflow memory). The 5288 existing tests are the safety net; behavior-shift batches add/adjust tests to lock the new canonical contract. `tests/src/browser/helpers.test.ts` (122 tests) is updated alongside the `helpers.ts` rewrite. No casual full-suite runs (AGENTS §16).

## 6. Batching & risk

~6–9 verified, subagent-reviewed (spec + code-quality two-stage) batches:

1. **B1** — core dependency wiring: import-alias confirmation, `configs/src/vite.browser.config.ts` / `tsconfig.browser.json` build-boundary check, a single trivial `@elements/core` import proven through the browser build/test. No behavior change.
2. **B2** — `helpers.ts` core-canonical rewrite + divergence ledger + `helpers.test.ts` updates. The epicenter (76 sites).
3. **B3** — `traversals.ts` non-DOM bits adopt core (compositors for `MatcherOptions`/predicate logic); DOM stays native.
4. **B4–Bn** — category ripple across the 38 factory/composable files: drag, table, toast, form, select, popover/tooltip, theme, then the remaining low-count files — each its own batch (one file or one tight category per batch, by site concentration).
5. **Bfinal** — consolidation pass + update any `guides/` docs that describe the changed surface + parity drivers.

**Risk:** behavior shifts in shipped composables that drive real DOM/drag/forms/tables. Mitigations: core-canonical was the explicit chosen policy; the divergence ledger makes every shift auditable; per-batch real-DOM tests; subagent two-stage review per batch; the two-pass sequence puts the shared `helpers.ts` contract right before any downstream file inherits it.

## 7. Out of scope

- No changes to `src/core` (it is canonical and correct; do not modify it to fit a browser call site — compose it instead).
- No DOM-`instanceof`→`instanceOf(...)` ceremony rewrites.
- No `src/styles`, `app/`, or `tests/` changes beyond test updates required by audited behavior shifts and the `helpers.test.ts` rewrite.
- No new full-suite runs; no push without explicit authorization.
