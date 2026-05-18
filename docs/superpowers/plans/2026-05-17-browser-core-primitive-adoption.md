# `@elements/core` Adoption Across `src/browser` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@elements/browser` import `@elements/core` and replace every ad-hoc JS type/enum/shape/coercion guard across all of `src/browser` with core primitives; core is canonical; DOM operations stay native.

**Architecture:** Two-pass: (B1) wire the browser→core dependency + settle the lib build boundary; (B2) rewrite the `helpers.ts` epicenter to core-canonical and produce the divergence ledger; (B3) `traversals.ts` non-DOM bits; (B4–B8) ripple the substitution category-by-category across the 38 factory/composable files; (B9) consolidation + guide/parity. Every batch is `npm run check` + targeted vitest + `npm run build` green, committed on `main` with explicit pathspecs.

**Tech Stack:** TypeScript (strict; no `any`/`!`/`as`/`@ts-*`), `@elements/core` (env-agnostic guard/parser/compositor library), Vitest (`src:browser`, `guides`), Vue `@vue/reactivity`, the repo's AGENTS.md conventions.

Spec: [docs/superpowers/specs/2026-05-17-browser-core-primitive-adoption-design.md](../specs/2026-05-17-browser-core-primitive-adoption-design.md)

---

## Core API reference (use these — do not re-hand-roll)

**Guards** (`isX(v: unknown): v is X`, never throw): `isNull isUndefined isDefined isString isNumber isFiniteNumber isBoolean isBigInt isSymbol isFunction isDate isRegExp isError isPromise isPromiseLike isObject isRecord isJsonValue isJsonObject isMap isSet isWeakMap isWeakSet isArray isIterable isAsyncIterable isEmptyString isEmptyArray isEmptyObject isEmptyMap isEmptySet isNonEmptyString isNonEmptyArray isNonEmptyObject isNonEmptyMap isNonEmptySet isNullableString isNullableNumber isNullableBoolean isTrue isFalse isZeroArg isAsyncFunction isGeneratorFunction` (+ typed-array guards).
**Compositors:** `arrayOf tupleOf literalOf instanceOf enumOf setOf mapOf recordOf iterableOf keyOf pickOf omitOf andOf orOf notOf complementOf unionOf intersectionOf whereOf lazyOf transformOf nullableOf`.
**Parsers/coercers:** `parseString parseNumber parseInteger parseBoolean parseRecord parseArray parseEnum parseJson parseJsonAs parseStringField parseNumberField parseIntegerField parseBooleanField parseRecordField parseArrayField parseEnumField coerceString coerceNumber coerceRecord matchesShape parseShape`.
**Helpers:** `attempt` (`<T>(cb: () => T) => Result<T>` — never-throw boundary), `createRandom(seed)` (Mulberry32). **DSL (sparingly):** `objectShape/stringShape/...` + `compileGuard/compileParser/compileContract` — compile ONCE at module scope only.

Import specifier: `import { isString, arrayOf, literalOf, parseInteger, attempt } from '@elements/core'` (tsconfig path `@elements/core` → `src/core/index.ts`; type imports first per AGENTS §3).

## Conventions every task must hold (AGENTS.md)

- NO `any`/`!`(non-null)/`as`(type-assertion; `as const` ok)/`@ts-*`/`eslint-disable`. Tabs, single quotes, no semicolons, `.js` import extensions on intra-package relative imports, `import type` first, named exports only, trailing newline.
- `src/browser/index.ts` MUST NOT re-export any `@elements/core` symbol (AGENTS §6).
- DOM stays native: do NOT wrap `el instanceof HTMLElement` / `event instanceof PointerEvent` / `node.nodeType` / element-property reads in core `instanceOf(...)`. Replace only JS-domain type/enum/array/record/coerce/never-throw logic.
- Per-batch gate: `npm run check` (0/0) → `npx vitest run --project src:browser` (+ `--project guides` when docs/parity touched) → `npm run build`. Commit each green batch on `main` with explicit pathspecs (never `-A`/`.`, never `--amend`/`--no-verify`/push). Push only on explicit user authorization (not part of any task).
- When core semantics differ from the replaced hand-rolled logic: adopt core; if a call site needs different behavior, COMPOSE core (`whereOf`/`andOf`/`orOf`/`nullableOf`/`complementOf`) — never re-hand-roll, never special-case. Record every shift in the divergence ledger (Task 2) and update the affected test to assert the new canonical contract.
- `src/core` is OUT OF SCOPE — never modify it to fit a browser call site; compose it instead.

---

## File Structure

| File | Responsibility | Batch |
|---|---|---|
| `vite.config.ts` (`srcBrowser`) | Lib build: externalize `@elements/core` so published `./browser` imports `./core` | B1 |
| `src/browser/<one trivial file>` | Smoke import proving the browser→core boundary builds | B1 |
| `src/browser/helpers.ts` | Core-canonical rewrite of all JS-domain guards/parsers (76 sites) | B2 |
| `tests/src/browser/helpers.test.ts` | Updated to the new canonical contract | B2 |
| `docs/superpowers/plans/...ledger.md` | The divergence ledger (created in B2, appended each later batch) | B2+ |
| `src/browser/types.ts` | Narrowed-type updates where a guard's `value is T` changes | B2+ |
| `src/browser/traversals.ts` | Non-DOM bits (`MatcherOptions`/`ElementPredicate`, enum/array logic) → core | B3 |
| `src/browser/factories/createDrag.ts` `composables/useDrag.ts` | drag/drop detail guards, classes → `recordOf`/`literalOf`/core (18+1) | B4 |
| `src/browser/factories/createTable.ts` `composables/useTable.ts` | numeric/coerce/enum/shape (27+7) | B5 |
| `src/browser/factories/createToast.ts` `createForm.ts` `composables/useForm.ts` | numeric/coerce/never-throw (12+6+1) | B6 |
| `src/browser/factories/createSelect.ts` `createPopover.ts` `createTooltip.ts` `composables/{useSelect,usePopover,useTooltip,useMenu}.ts` | enum/literal/shape (7+6+4+…) | B7 |
| `src/browser/factories/{createTheme,createFocus,createPointer,createDrop,createNav,createAside,createDialog,createDetails,createAlert}.ts` + remaining composables + `taxonomy.ts` `patterns.ts` `theme.ts` | low-count residual sweep | B8 |
| `guides/*.md` + affected `tests/guides/*.test.ts` | doc/parity updates for the changed surface; ledger finalization | B9 |

Site counts (controller-measured): helpers 76, createTable 27, createDrag 18, createToast 12, createSelect/createForm 7, createPopover/createForm 6, createDrop 5, createTooltip/createMenu 4, createFocus/createPointer 3, traversals 6, plus ~1–2 across the remaining ~20 files (≈218 total / 40 files). Many are DOM `instanceof` — **left native**.

---

## Task 1 (B1): Wire the browser→core dependency + settle the build boundary

**Files:**
- Modify: `vite.config.ts` (the `srcBrowser` factory's `build.rollupOptions.external`)
- Modify: one trivial existing file, e.g. `src/browser/helpers.ts` (add a single proven core import used in place of one ad-hoc check), to prove the boundary end-to-end
- Test: existing `tests/src/browser/helpers.test.ts` (no new test; the existing suite + build are the proof)

- [ ] **Step 1: Confirm the alias resolves (no code change yet)**

Run: `node -e "console.log(require('node:fs').readFileSync('tsconfig.json','utf8'))" ` is unnecessary — instead verify by reading `tsconfig.json` `compilerOptions.paths` contains `"@elements/core": ["./src/core/index.ts"]` (it does) and `vite.config.ts` builds `resolve.alias` from `tsconfig.compilerOptions.paths` (it does, lines ~84-89). Conclusion to record in the ledger file header: `@elements/core` resolves for `check`, `vitest`, and `vite build` via the shared tsconfig-path alias — no per-config alias needed.

- [ ] **Step 2: Externalize `@elements/core` in the browser lib build**

In `vite.config.ts`, locate the `srcBrowser` config object's `build.lib` block (entry `src/browser/index.ts`). Add a `rollupOptions.external` that treats the core entry as external so the published `dist/src/browser/index.js` imports the sibling `./core` rather than inlining it (the package.json already exposes `./core` + `./browser` as separate subpath exports; `@vue/reactivity` is already external by being a dependency). Concrete edit — add to the `srcBrowser` `build` object:

```ts
rollupOptions: {
	external: (id: string) =>
		id === '@elements/core' ||
		id.startsWith('@elements/core/') ||
		id === '@vue/reactivity' ||
		id.startsWith('@vue/'),
	output: {
		paths: { '@elements/core': './core/index.js' },
	},
},
```

If a `rollupOptions` already exists on `srcBrowser`'s build, merge these keys into it (do not duplicate the block). Rationale to record in ledger: browser and core publish as two subpaths of one package; externalizing avoids shipping core twice when a consumer imports both, and keeps the browser bundle lean. (If, on inspection, the existing config already externalizes by another mechanism, record that and skip the edit — do not double-externalize.)

- [ ] **Step 3: Prove the boundary with one real substitution**

In `src/browser/helpers.ts`, replace exactly ONE trivial ad-hoc guard with its core equivalent as the smoke proof — `isEventHandler`:

Before:
```ts
export function isEventHandler(value: unknown): value is (event: CustomEvent) => void {
	return typeof value === 'function'
}
```
After (add `isFunction` to a new `import { … } from '@elements/core'`, type-import line ordering per AGENTS §3):
```ts
import { isFunction } from '@elements/core'
// …
export function isEventHandler(value: unknown): value is (event: CustomEvent) => void {
	return isFunction(value)
}
```
(`isFunction` is `typeof value === 'function'` — semantically identical; zero behavior change. Larger substitutions are Task 2.)

- [ ] **Step 4: Verify the full gate**

Run: `npm run check` — Expected: `Found 0 warnings and 0 errors.`
Run: `npx vitest run --project src:browser tests/src/browser/helpers.test.ts` — Expected: all pass (isEventHandler tests unchanged behavior).
Run: `npm run build` — Expected: succeeds; inspect `dist/src/browser/index.js` head and confirm it contains an `import ... from "./core/index.js"` (or `@elements/core`) rather than an inlined copy of core. If core is still inlined, the externalization in Step 2 is wrong — fix `rollupOptions.external` until the build emits an external import, then re-run.

- [ ] **Step 5: Create the divergence ledger file**

Create `docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md` with a header (boundary facts from Step 1, build decision from Step 2) and an empty `## Divergences` table: `| Site | Old behavior | Core behavior | Resolution | Test(s) updated |`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/browser/helpers.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
git commit -m "build(browser): wire @elements/core dependency + externalize in lib build" -- vite.config.ts src/browser/helpers.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
```
Then `git show --stat HEAD` (exactly 3 files) and `git status --short` (clean).

---

## Task 2 (B2): `helpers.ts` core-canonical rewrite + divergence ledger

**Files:**
- Modify: `src/browser/helpers.ts`
- Modify: `src/browser/types.ts` (only where a guard's narrowed type changes)
- Modify: `tests/src/browser/helpers.test.ts`
- Append: the ledger file

- [ ] **Step 1: Read the current file and inventory the 76 sites**

Read `src/browser/helpers.ts` fully. Build a working list of every JS-domain guard/parse/coerce/narrow (NOT DOM `instanceof`/property reads — those stay). Expected categories and the exact substitution for each:

| Current | Replace with | Notes |
|---|---|---|
| `isStringArray(v)` = `Array.isArray(v) && v.every(t=>typeof t==='string')` | `arrayOf(isString)` (export the composed guard) | core `isArray` + `isString` |
| `isEventHandler` | `isFunction` (done in B1) | — |
| `isSetting(v)` = `v==='light'\|'dark'\|'system'` | `literalOf('light','dark','system')` | divergence: none (Object.is exact) |
| `isDropPosition(v)` = `v==='before'\|'after'\|'into'` | `literalOf('before','after','into')` | none |
| `isSide(v)` (literal union) | `literalOf(...the sides...)` | none |
| `extractProperty(v,k)` (hasOwnProperty read) | rework over core `isRecord(v)` then `Reflect.get(v,k)` | **divergence:** core `isRecord` rejects class instances & arrays (prototype check) where the old `typeof==='object' && hasOwnProperty` accepted them. Record. Compose `orOf(isRecord, isArray)`-style only if a real caller needs arrays — check call sites; otherwise adopt canonical. |
| `normalizeIndex(i,count)` integer+range | `parseInteger` then bounds: `const n = parseInteger(i); return n!==undefined && n>=0 && n<=count ? n : null` | **divergence:** `parseInteger` accepts numeric strings + rejects `±Infinity/NaN`; old code used `Number.isInteger`. Record; update tests. |
| `toStringList(input)` | reconcile vs `parseArray`/`coerceString`; keep typed→typed reshape but express via core where it doesn't change behavior; delete the `@remarks` divergence note (no longer needed once core-expressed) | record any shift |
| drag/detail guards `isDragTapDetail`/`isDragStartDetail`/`isDragOverDetail`/`isDragDropDetail` | `recordOf({...})` compositions using core element/number guards + `instanceOf(PointerEvent)`/`instanceOf(HTMLElement)` for the DOM fields (DOM via core `instanceOf` compositor is acceptable HERE because the guard is a composed record predicate, not a bare DOM check) + `literalOf` for the position enum | **divergence:** `recordOf` rejects unknown keys + uses `Object.hasOwn`; old guards only checked presence of required keys. Record per guard; update tests. |
| `isFormFieldElement` (instanceof union of 7 HTML element types) | keep as DOM `instanceof` union (clean boundary — pure DOM), OR express as `unionOf(instanceOf(HTMLButtonElement), …)` if it reads cleaner — choose the lower-ceremony form; do NOT change behavior | likely keep native; record decision |

For each concrete site not in this table, apply the spec §3 catalog. Anything that is a bare DOM `instanceof`/`nodeType`/property read: leave it.

- [ ] **Step 2: For every behavior-shifting site, write the failing test FIRST (TDD for canonical shifts)**

For each divergence identified in Step 1 (e.g. `extractProperty` now rejecting a class instance, `normalizeIndex` now accepting `'3'`, drag guards now rejecting extra keys), update the corresponding test in `tests/src/browser/helpers.test.ts` to assert the NEW canonical behavior. Example for `normalizeIndex`:

```ts
it('normalizeIndex accepts numeric strings (core parseInteger canonical)', () => {
	expect(normalizeIndex('3' as never, 5)).toBe(3) // was: returned null
})
it('normalizeIndex rejects Infinity/NaN', () => {
	expect(normalizeIndex(Infinity, 5)).toBeNull()
	expect(normalizeIndex(NaN, 5)).toBeNull()
})
```
(Use the real argument types; if the public signature is `number`, the canonical shift may be a no-op for that signature — only add a test where the observable contract actually changes. Do not invent shifts that don't occur.)

Run: `npx vitest run --project src:browser tests/src/browser/helpers.test.ts` — Expected: the newly-written canonical-contract tests FAIL (old impl still in place); behavior-identical substitutions still pass.

- [ ] **Step 3: Apply the substitutions**

Rewrite each site per the Step 1 table. Add a single grouped `import { isString, isNumber, isFunction, isRecord, isArray, arrayOf, literalOf, recordOf, instanceOf, unionOf, parseInteger, attempt } from '@elements/core'` (only the names actually used; type-import block first then this value import; merge with the B1 `isFunction` import — one `@elements/core` import line). Delete every now-redundant hand-rolled body. Update `src/browser/types.ts` ONLY where a guard's `value is T` narrowing changes (e.g. if a guard's element type widens/narrows). Do NOT touch DOM-native code.

- [ ] **Step 4: Record every divergence in the ledger**

Append one row per shift to `docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md`: `| helpers.ts:extractProperty | accepted class instances | core isRecord rejects non-plain | canonical adopted | helpers.test.ts:"extractProperty rejects class instance" |` etc. Every row must name the test that locks the new contract.

- [ ] **Step 5: Verify the full gate**

Run: `npx vitest run --project src:browser tests/src/browser/helpers.test.ts` — Expected: ALL pass (the Step 2 canonical tests now pass; nothing else regressed).
Run: `npx vitest run --project src:browser` — Expected: only behavior shifts that have a corresponding updated test; if any OTHER suite fails, that's an unrecorded ripple — either it's a real downstream behavior change (record it in the ledger + update that test to the canonical contract) or a mistake (fix it). No silent failures.
Run: `npm run check` (0/0) and `npm run build` (succeeds).

- [ ] **Step 6: Commit**

```bash
git add src/browser/helpers.ts src/browser/types.ts tests/src/browser/helpers.test.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
git commit -m "refactor(browser): helpers.ts core-canonical via @elements/core guards/parsers" -- src/browser/helpers.ts src/browser/types.ts tests/src/browser/helpers.test.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
```
(Adjust pathspec to exactly the files changed.) Then `git show --stat HEAD` + `git status --short` (clean).

---

## Task 3 (B3): `traversals.ts` non-DOM bits

**Files:** Modify `src/browser/traversals.ts`; possibly `src/browser/types.ts`; update `tests/src/browser/traversals.test.ts` only if a canonical shift occurs.

- [ ] **Step 1:** Read `src/browser/traversals.ts`. Identify ONLY non-DOM JS-domain logic: the `MatcherOptions`/`ElementPredicate` composition in `createMatcher` (criteria validation — any `typeof`/array checks), any enum/literal/array logic. Every `el instanceof Element`, `node.nodeType`, `querySelector`, `closest`, `getBoundingClientRect`, attribute/property read **stays native** (the clean boundary — record the decision once in the ledger: "traversals.ts is DOM-native by design; only `createMatcher` criteria validation adopts core").
- [ ] **Step 2:** If `createMatcher` validates `criteria.classes` as a string array or similar, replace that ad-hoc check with `arrayOf(isString)` / `isString` from core. Write/adjust the matching test in `tests/src/browser/traversals.test.ts` FIRST if behavior shifts; run to see it fail.
- [ ] **Step 3:** Apply the substitution(s). If none qualify (traversals is essentially all DOM), record "no core-substitutable sites in traversals.ts beyond DOM boundary" in the ledger and make zero code changes — then this task is a ledger-only note folded into B4's commit (do NOT make an empty commit).
- [ ] **Step 4:** Gate: `npm run check` 0/0, `npx vitest run --project src:browser tests/src/browser/traversals.test.ts` pass (+ full `src:browser` if shifted), `npm run build`.
- [ ] **Step 5:** Commit (only if code changed):
```bash
git add src/browser/traversals.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
git commit -m "refactor(browser): traversals.ts criteria validation via @elements/core" -- src/browser/traversals.ts docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption-ledger.md
```

---

## Tasks 4–8 (B4–B8): Category ripple across the 38 factory/composable files

Each task is ONE batch over a tight file group (by site concentration). The procedure is identical per batch — apply it to the listed files:

- **Task 4 (B4) — drag:** `src/browser/factories/createDrag.ts`, `src/browser/composables/useDrag.ts` (18+1 sites)
- **Task 5 (B5) — table:** `src/browser/factories/createTable.ts`, `src/browser/composables/useTable.ts` (27+7)
- **Task 6 (B6) — toast/form:** `src/browser/factories/createToast.ts`, `src/browser/factories/createForm.ts`, `src/browser/composables/useForm.ts` (12+6+1)
- **Task 7 (B7) — select/popover/tooltip/menu:** `src/browser/factories/{createSelect,createPopover,createTooltip,createMenu}.ts`, `src/browser/composables/{useSelect,usePopover,useTooltip,useMenu}.ts` (7+6+4+4+…)
- **Task 8 (B8) — residual:** `src/browser/factories/{createTheme,createFocus,createPointer,createDrop,createNav,createAside,createDialog,createDetails,createButton,createCarousel}.ts`, `src/browser/theme.ts`, remaining `src/browser/composables/*.ts`, `src/browser/taxonomy.ts`, `src/browser/patterns.ts` (≈1–5 each)

**Per-batch procedure (all 5 tasks follow this exactly):**

- [ ] **Step 1: Read each file in the batch.** List every JS-domain site (catalog §3): `typeof x==='string'|'number'|'function'|'boolean'` → `isString`/`isNumber`/`isFunction`/`isBoolean`; `Array.isArray` → `isArray`; string-union/enum checks → `literalOf(...)`; numeric `Number(...)`/`parseFloat`/`Number.isFinite`/`Number.isInteger` → `parseNumber`/`parseInteger`/`coerceNumber`; object-shape runtime guards → `recordOf({...})`; `try/catch`-returning-fallback (storage/IO/user callback) → `attempt`; `?? fallback` after a parse → keep but feed by the core parser. **Leave native:** every `el instanceof HTML*`, `event instanceof PointerEvent/DragEvent/KeyboardEvent`, `node.nodeType`, `.dataset`/attribute/`getBoundingClientRect`/Vue-reactivity.
- [ ] **Step 2: For each behavior-shifting site, update its test FIRST.** Locate the owning test (`tests/src/browser/factories/<name>.test.ts` or `tests/src/browser/composables/<name>.test.ts`). Write the new canonical-contract assertion; run that test file and confirm the new assertion FAILS pre-change. For behavior-identical substitutions, no test change — the existing test is the regression gate.
- [ ] **Step 3: Apply substitutions.** One merged `import { … } from '@elements/core'` per file (only used names; type imports first). Delete redundant hand-rolled logic. Update `src/browser/types.ts` only where a narrowed type changes. Compose core (`whereOf`/`orOf`/`nullableOf`) where a site needs a refined predicate — never re-hand-roll.
- [ ] **Step 4: Append divergence rows** to the ledger for every shift, each naming the test that locks it.
- [ ] **Step 5: Gate.** `npm run check` → 0/0. `npx vitest run --project src:browser <the batch's test files>` → pass. `npx vitest run --project src:browser` → only recorded shifts fail-then-pass; no unrecorded ripple (if a non-batch suite breaks, it's a real downstream shift → record + update its test to canonical, or it's a bug → fix). `npm run build` → succeeds.
- [ ] **Step 6: Commit** with explicit pathspec of exactly the files changed (the batch's source files + any `types.ts` + the test files + the ledger):
```bash
git add <explicit list>
git commit -m "refactor(browser): <area> core-canonical via @elements/core" -- <same explicit list>
```
`git show --stat HEAD` (only intended files) + `git status --short` (clean).

**Escalation:** if a batch's substitution would require changing `src/core`, or a DOM/Vue behavior can't be preserved while adopting core canonical, STOP and report BLOCKED with the exact site + the conflict — do not modify `src/core`, do not silently special-case.

---

## Task 9 (B9): Consolidation + guide/parity + ledger finalization

**Files:** affected `guides/*.md` (any that document a changed `src/browser` symbol's behavior), affected `tests/guides/*.test.ts`, the ledger.

- [ ] **Step 1:** Grep `guides/` for documented behavior of changed symbols (e.g. `traversals.md` / `composables.md` / any guide describing a guard whose canonical contract shifted). For each, update the prose to the new core-canonical behavior. Do NOT alter the mandatory spec-guide skeleton.
- [ ] **Step 2:** Run `npx vitest run --project guides` — fix any doc↔source parity driver failure caused by a renamed/retyped export (update the guide or the driver to reflect reality; never weaken a driver to hide a real mismatch).
- [ ] **Step 3:** Consolidation scan of `src/browser`: any duplicate core-composition (e.g. the same `literalOf(...)`/`recordOf({...})` built in two files) → hoist the shared composed guard into `src/browser/helpers.ts` and import it (one definition, per AGENTS §5 dedupe). Re-verify the gate.
- [ ] **Step 4:** Finalize the ledger: ensure every divergence row has a "Test(s) updated" entry; add a closing summary (total sites converted, total divergences, files left DOM-native and why).
- [ ] **Step 5: Full gate.** `npm run check` 0/0; `npx vitest run --project src:browser` all pass; `npx vitest run --project guides` all pass; `npm run build` succeeds.
- [ ] **Step 6: Commit:**
```bash
git add <explicit list of changed guides/tests/helpers + ledger>
git commit -m "docs+refactor(browser): reconcile guides + consolidate core compositions; finalize ledger" -- <same list>
```

---

## Self-Review

**1. Spec coverage:** §1 context/decisions → all tasks. §2 architecture/boundary → Task 1 (dependency + build) + the "leave native" rule in every task. §3 substitution catalog → Task 2 (helpers) + Task 4–8 procedure Step 1 + Task 3. §4 behavior-divergence/ledger → Task 2 Step 4 creates it, every batch appends, Task 9 finalizes; canonical-test-first in every batch Step 2. §5 testing/verification → per-batch gate in every task. §6 batching/risk → Tasks 1–9 map 1:1 to B1–B9; subagent two-stage review is the execution harness. §7 out-of-scope → "src/core OUT OF SCOPE" + DOM-ceremony prohibition restated in conventions and Task 8 escalation. No gap.

**2. Placeholder scan:** Task 2 Step 1 uses a substitution TABLE with concrete before/after, not "TBD". Tasks 4–8 share ONE fully-specified procedure rather than "similar to Task N" (the procedure is repeated in full, not referenced). The only deferred artifact is the divergence ledger's *rows* — correct, because the exact divergences are discovered by reading current files at execution time; the pre-identifiable ones (extractProperty/normalizeIndex/recordOf-unknown-keys) ARE concretely listed. No "add error handling"/"handle edge cases" placeholders. Build externalization shows exact code.

**3. Type consistency:** core API names verified against `src/core` reads (`arrayOf`, `literalOf`, `recordOf`, `whereOf`, `parseInteger`, `attempt`, `isRecord`, `isFunction`, `instanceOf`, `unionOf`, `nullableOf` — all confirmed exports). Import specifier `@elements/core` matches `tsconfig.json` paths. Ledger filename consistent across Tasks 1/2/3/9. `npm run check`/`vitest --project src:browser`/`npm run build` consistent with package.json scripts + prior effort.

No issues found requiring inline fix.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-browser-core-primitive-adoption.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage (spec + code-quality) review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session via executing-plans, batch checkpoints.

Which approach?
