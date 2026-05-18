# Browser → Core Primitive Adoption — Divergence Ledger

Tracks every site in `src/browser` where an ad-hoc guard/coercion is replaced
by an `@elements/core` primitive, and any behavior divergence that adoption
surfaces. Companion to the plan
(`2026-05-17-browser-core-primitive-adoption.md`) and spec
(`2026-05-17-browser-core-primitive-adoption-design.md`).

## Boundary facts

- **Alias (Step 1):** `@elements/core` resolves for check/vitest/vite-build
  via the shared tsconfig-path alias. `tsconfig.json`
  `compilerOptions.paths` maps `"@elements/core" → ["./src/core/index.ts"]`;
  `vite.config.ts` (`resolve.alias`, ≈ lines 84-89) derives
  `resolve.alias` from `tsconfig.compilerOptions.paths`, and that single
  `resolve` is shared by `srcCore`/`srcBrowser` and the root
  `defineConfig`, so vue-tsc (`npm run check`), vitest, and `vite build`
  all resolve `@elements/core` identically with no per-config alias.

- **Build decision (Step 2):** `srcBrowser`'s `build` block had `lib` +
  `outDir` but no `rollupOptions`. Added a new `build.rollupOptions` (no
  pre-existing block to merge, no other externalization mechanism present)
  to `srcBrowser` in `vite.config.ts`:

  ```ts
  rollupOptions: {
  	external: (id: string) => id === '@elements/core',
  	output: {
  		paths: { '@elements/core': '../core/index.js' },
  	},
  },
  ```

  Rationale: `@elements/browser` and `@elements/core` publish as two
  subpaths of one package; externalize ONLY `@elements/core` so the
  browser lib imports the sibling core build rather than inlining a copy
  of `src/core`. Vue stays inlined exactly as in the parent build — Vite
  lib mode inlines deps by default and the `external` function overrides
  that selectively, so the predicate is deliberately minimal. The
  `@elements/core/` sub-path and `@vue/` clauses that appeared in B1 are
  removed: core has no `@elements/core/*` subpaths, and externalizing vue
  caused bare `@vue/runtime-dom` imports that consumers cannot resolve
  (`@vue/runtime-dom` is not a declared dependency).

- **Emitted external-import line (Step 4):** the first line of the built
  `dist/src/browser/index.js` is exactly:

  ```js
  import { isFunction } from "../core/index.js";
  ```

  No `function isFunction` body is inlined anywhere in the browser bundle
  (verified by grep) — core is externalized to the sibling build, not
  duplicated. Vue is fully inlined (zero bare `from "@vue/` imports in the
  bundle; bundle size ~445 KB, matching the parent build).

- **Real-resolution smoke test (required boundary check for future batches):**
  The `tsconfig` alias masks bundle resolution at `npm run check` / vitest
  time. After every build that touches `rollupOptions`, verify the emitted
  bundle actually resolves by running:

  ```sh
  node --input-type=module -e "import('./dist/src/browser/index.js').then(()=>console.log('RESOLVED OK')).catch(e=>{console.error('IMPORT FAILED:',e.code,e.message);process.exit(1)})"
  ```

  Expected output: `RESOLVED OK`. A failing `ERR_MODULE_NOT_FOUND` means
  the `paths` mapping is wrong; do not declare the build done until this
  passes.

## Divergences

| Site | Old behavior | Core behavior | Resolution | Test(s) updated |
| --- | --- | --- | --- | --- |
| helpers.ts:extractProperty | `typeof v==='object' && v!==null && Object.prototype.hasOwnProperty.call(v,k)` — accepted class instances, arrays, DOM objects | core `isRecord(v)` requires `prototype === Object.prototype \| null` — rejects class instances, arrays, DOM objects | canonical adopted (`isRecord(v) && Object.hasOwn(v,k) ? Reflect.get : undefined` — kept `Object.hasOwn` own-key gate so the inherited-key contract is preserved, only the value-type check moved to core) | helpers.test.ts:"helpers — extractProperty > rejects class instances and arrays (core isRecord canonical: plain records only)" |
| helpers.ts:isDragTapDetail | presence/type of required keys only; extra/unknown keys ignored (built on `extractProperty`) | core `recordOf({...})` rejects unknown keys (Object.keys scan) + presence via `Object.hasOwn` | canonical adopted (composed via `recordOf` + `isNumber` + native lazy `isPointerEvent` closure for the DOM field); real dispatch path in createDrag.ts constructs the detail with exactly the declared keys | helpers.test.ts:"helpers — isDragTapDetail > rejects unknown extra keys (core recordOf canonical: strict shape)" |
| helpers.ts:isDragStartDetail | presence/type of required keys only; extra keys ignored | core `recordOf` rejects unknown keys | canonical adopted (composed via `recordOf` + core `instanceOf(Set)` + native lazy `isPointerEvent`) | helpers.test.ts:"helpers — isDragStartDetail > rejects unknown extra keys (core recordOf canonical: strict shape)" |
| helpers.ts:isDragOverDetail | presence/type of required keys only; extra keys ignored | core `recordOf` rejects unknown keys | canonical adopted (composed via `recordOf` + `isNumber` + `literalOf('before','after','into')` + `arrayOf(isString)` + native lazy DOM closures) | helpers.test.ts:"helpers — isDragOverDetail > rejects unknown extra keys (core recordOf canonical: strict shape)" |
| helpers.ts:isDragDropDetail | presence/type of required keys only; extra keys ignored | core `recordOf` rejects unknown keys | canonical adopted (composed via `recordOf` + `nullableOf(isNumber)` + `nullableOf(literalOf(...))` + `orOf(isHtmlElement,isNull)` + `arrayOf(isString)` + native lazy `isPointerEvent`) | helpers.test.ts:"helpers — isDragDropDetail > rejects unknown extra keys (core recordOf canonical: strict shape)" |
| helpers.ts:indexOfRow | `Number(row.dataset.index)` then `Number.isFinite` — empty/whitespace `data-index=""` coerced to `0` (a valid index) | core `parseNumber` returns `undefined` for empty / whitespace-only strings (and for non-numeric, ±Infinity, NaN) | canonical adopted (`const i = parseNumber(row.dataset.index); return i === undefined ? null : i`); the `'7'`/`'abc'`/null cases are behavior-identical, only the degenerate empty-attribute case shifts (now `null`) | helpers.test.ts:"helpers — extractRow / indexOfRow / extractRows > indexOfRow parses data-index, null on missing/non-finite" (added empty-`data-index` assertion) |

### No-shift / boundary notes

- **Behavior-identical substitutions (no test change — the existing 122 tests
  are the regression gate, all stayed green pre- AND post-change):**
  `isStringArray` → `arrayOf(isString)`; `isSetting` → wrapper over
  `literalOf('light','dark','system')`; `isDropPosition` → wrapper over
  `literalOf('before','after','into')`; `isSide` → wrapper over module-scope
  `literalOf('top','end','bottom','start')` (was `POPOVER_SIDE_SET.has`,
  removed the now-unused `POPOVER_SIDE_SET` import); `alignmentOf`'s
  `tail==='start'||tail==='end'` → module-scope `literalOf('start','end')`
  guard; `isEventHandler` → `isFunction` (B1, verified intact);
  `generateId`'s `prefix===undefined` → `isUndefined`; `isMouseEvent`'s
  `!event` → `isUndefined(event)`; `cssEscape`'s `typeof CSS.escape===
  'function'` → `isFunction(CSS.escape)`; `compareCellValues`'s
  `Number()`+`Number.isFinite` → `parseNumber` (the `!== ''` pre-guards make
  it exactly equivalent for the non-empty trimmed-string domain);
  `applyRowIndex`/`applyRowCount`'s `Number.isFinite(x)` → `isFiniteNumber(x)`
  (identical for the `number`-typed param); `isTableCellTarget`/
  `isTableRangeTarget`'s `typeof target==='object'` → `isRecord(target)`
  (identical for the typed `TableTarget` union — plain-object members
  accepted, string/number sentinels rejected, exactly as before; the
  `'row' in target` / `'from' in target` property-presence operators
  retained); `toStringList`'s `input===undefined`/`typeof input==='string'`
  → `isUndefined`/`isString` (typed→typed reshape unchanged; the stale
  `@remarks` note about the core `coerce*` boundary was deleted as
  instructed since the function now visibly uses core guards);
  `bindEventMap`'s `if (!on)` → `isUndefined(on)`; `assertElement`/
  `isTagged`'s `typeof expected==='string'` → `isString(expected)`;
  `writeTableCell`'s `value===null||value===undefined` →
  `isNull(value)||isUndefined(value)`.

- **`normalizeIndex` — NO observable shift (typed `number` param).** The
  substitution rule maps it to `parseInteger`. Adopted
  (`const n = parseInteger(index); return n!==undefined && n>=0 && n<=count
  ? n : null`). `parseInteger` additionally accepts numeric strings, but the
  public signature is `(index: number, count: number)` and all three call
  sites in `createTable.ts` pass `number` — the string-acceptance is
  unreachable via the type. For the `number` domain `parseInteger` rejects
  non-integers / ±Infinity / NaN exactly as the old `Number.isInteger`
  did, so there is no observable contract change. No test change (the
  existing `normalizeIndex` tests stay green; inventing a string-input
  test would assert an unreachable path).

- **`extractProperty` — divergence is real but the only in-repo callers are
  internal:** `bindEventMap` (always receives a plain `options.on` object
  literal across all 15 factory call sites — verified) and the drag-detail
  guards (rebuilt on `recordOf`, no longer call `extractProperty`). No
  `src/browser` caller passes a class instance / array to it, so no
  factory/composable test rippled; the full `src:browser` project (30
  files, 1224 tests) stayed green.

- **DOM `instanceof` left native (clean boundary, expected outcome — not a
  gap):** `isFormFieldElement` (7-way HTML element `instanceof` union),
  `isValidityElement` (3-way union), `isFocusable` (disabled-control
  `instanceof` union), `isElement`/`isHTMLElement`/`isTextNode`
  (`node.nodeType` / `node instanceof HTMLElement`), `extractRow`/
  `findDetailRow`/`extractRows`/`focusableItems` (`instanceof
  HTMLElement`/`HTMLTableRowElement`, `if (!root)`/`if (!row)`
  DOM-ref-presence early-returns), `listen` (`event instanceof
  CustomEvent`), `assertElement`/`isTagged` (`if (!element)`
  DOM-element-ref nullness — kept native; core `isDefined`'s
  non-narrowing overload broke the `asserts`/predicate control-flow
  narrowing, and a DOM-ref presence early-return is the DOM boundary
  anyway). These are the deliberate environment-agnostic non-scope of
  `@elements/core`; wrapping them in `instanceOf(...)` would be ceremony
  with zero correctness gain.

- **Drag-detail DOM fields: native lazy `instanceof` inside the core
  `recordOf` composition.** The record SHAPE/enum/array/nullable structure
  is core (`recordOf`/`literalOf`/`arrayOf`/`nullableOf`/`orOf` +
  `isNumber`/`isString`/`isNull`); the `PointerEvent`/`HTMLElement` fields
  are bare native `instanceof` wrapped in module-scope typed-predicate
  closures (`isPointerEvent`/`isHtmlElement`). This is required for
  correctness, not preference: a module-scope `instanceOf(PointerEvent)`
  eagerly dereferences the `PointerEvent` global at import time, which
  threw `ReferenceError: PointerEvent is not defined` under the mandated
  DOM-less bundle-resolution smoke (`node --input-type=module -e
  import('./dist/src/browser/index.js')`). The closures defer the DOM
  global read to guard-call time, exactly matching the original in-body
  `instanceof` laziness, keeping `helpers.ts` import-safe in a DOM-less
  runtime. `Set` is a JS built-in (always defined) so it stays core
  `instanceOf(Set)`.

- **Environment-existence probes left native:** `typeof CSS !== 'undefined'`,
  `typeof Intl !== 'undefined'`, `typeof requestAnimationFrame ===
  'function'` — these probe a possibly-undeclared GLOBAL; `typeof` is the
  only safe form (`isFunction(requestAnimationFrame)` would throw
  `ReferenceError` when the global is undeclared, e.g. SSR/Node). This is
  the same environment boundary as the DOM-less import contract, not a
  JS-domain value guard. Only the value-side `typeof CSS.escape ===
  'function'` was moved to `isFunction(CSS.escape)`.

- **`MatcherOptions` / `hasAttribute` optional-config `!== undefined`
  checks left as-is.** `createMatcher`'s `criteria.tag !== undefined` /
  `criteria.id !== undefined` / … and `hasAttribute`'s `value === undefined`
  test "was this optional config key supplied" on a typed optional
  (`string | undefined`) — the idiomatic options-presence boundary, not a
  JS-domain value-type guard on external input. Converting each to
  `isUndefined`/`!isUndefined` is pure churn with no behavior or
  correctness gain and reduces matcher readability (the
  complexity-philosophy "no ceremony" rule). Recorded as a conscious
  scoping decision.

- **`src/browser/types.ts`: NO change required.** Every converted guard
  preserved its exact `value is T` narrowing — `isStringArray`
  (`arrayOf(isString)` annotated `(value:unknown) => value is readonly
  string[]`), `isSetting`/`isDropPosition`/`isSide` (wrapper functions
  keeping `value is ThemeSetting`/`DropPosition`/`Side`), the drag-detail
  guards (wrapper functions keeping `value is DragTapDetail` etc.). No
  public type widened or weakened; no `as`/`!`/`any` used.

- **createTable.ts / useTable.ts (B5): all substitutions behavior-identical;
  ZERO divergences (no test change — `createTable.test.ts` 17 tests + full
  `src:browser` 30 files / 1224 tests stayed green pre- AND post-change).**
  Converted sites, each a semantically exact swap on a loose/boundary input:
  - `createTable.ts:initOffset/initTotal/initSize` — `typeof provided ===
    'number'` → `isNumber(provided)` (`provided` is `number | Ref<number> |
    undefined` from `options.*`; `isNumber` IS `typeof === 'number'`, NaN
    still admitted exactly as before — identical).
  - `createTable.ts:to` — `!Number.isFinite(page)` → `!isFiniteNumber(page)`
    (`page: number` typed param; `isFiniteNumber` = `typeof === 'number' &&
    Number.isFinite` — for a `number` input identical to `Number.isFinite`).
  - `createTable.ts:recomputeSortColumns` — `if (dir)` (Map-lookup `'asc' |
    'desc' | undefined`) → `if (!isUndefined(dir))`. Used `!isUndefined`
    NOT `isDefined` (B4 precedent rule 2): `!isUndefined` preserves `null`
    (admits every defined value including `null`) and is truth-table-equivalent
    to the original `!== undefined` / truthy guard at sites whose value domain
    is `'asc' | 'desc' | undefined` (no falsy-but-defined member); it keeps
    the project's uniform "loose-undefined guard → `!isUndefined`" convention.
    `isDefined` would additionally exclude `null` — a behavioral difference at
    any site where `null` is admissible — that, not any TS-narrowing limitation,
    is why `!isUndefined` is the consistent choice.
    Value is never null so it is exact, not just admit-null-safe.
  - `createTable.ts:applySortToDOM` — `if (!direction) continue` /
    `if (cellIndex === undefined) continue` (Map-lookup `'asc'|'desc'|
    undefined` and `number | undefined`) → `isUndefined(...)`. `isUndefined(0)
    === false`, so the valid `cellIndex === 0` column is preserved exactly
    (no degenerate-zero shift); the `'asc'|'desc'` union has no falsy member
    so `!direction` ≡ `=== undefined`.
  - `createTable.ts:sortToggle` — `if (!col || …)` (Map-lookup `TableColumn |
    undefined`) → `if (isUndefined(col) || …)`; a `TableColumn` object is
    always truthy so `!col` ≡ `col === undefined`. `col.sortable !== true`
    left native (typed-optional-boolean comparison, declared).
  - `createTable.ts` selection/expansion overloads + `useTable.ts`
    selection/expansion overloads — `arg === undefined` → `isUndefined(arg)`
    and `Array.isArray(arg)` → `isArray(arg)` on the overloaded
    `arg?: string | string[]` API-boundary param. `isArray` wraps
    `Array.isArray`; narrowing `string | string[]` → `readonly string[]`
    feeds `selectIds`/`clearIds`/`toggleIds`/`expandOne`-iteration unchanged
    (all accept `readonly string[]`); no public type weakened.

  Native, NOT converted (B4 precedent — no re-derivation):
  - `options.caption !== undefined` (createTable.ts:seed): typed-optional
    options-presence boundary — same class as B4's `MatcherOptions !==
    undefined` left native.
  - `if (target === null)` ×3 (headers/rows/footer `insert`): `target` is
    `normalizeIndex(...)`'s DECLARED `number | null` return (a B2
    core-canonical helper) — declared typed-null state, not loose input.
  - `sortDirection.get(key) ?? 'none'` / `col?.sortable === true`: `??` and
    optional-chaining idioms, not `typeof`/`=== undefined`/`Array.isArray`
    guards — nothing to substitute.
  - `selectionAnchor !== null` ×2: `selectionAnchor: string | null` declared
    internal state (typed-null discriminator, B4 precedent).
  - `selectionStrategy === 'single'|'page'`, `direction === 'none'`,
    `sortOrder === 'asc'`, `current === sortOrder`, `expansionClick ===
    'caret'`, etc.: comparisons on ALREADY-typed unions (`TableStrategy`,
    `TableSortDirection`, `'asc'|'desc'`) — typed discriminators, B4
    precedent (LEAVE NATIVE).
  - `if (!reactives)` / `if (!computedAll || !computedMixed)` / `factory
    .value?.…` / `?.value ?? …` / `provided.value ?? 1`: Vue
    effect-scope-result + ref-reactivity mechanics — unconditionally native.
  - `typeof window === 'undefined'` (useTable.ts watch): SSR env probe —
    unconditionally native (`isUndefined(window)` ReferenceErrors under the
    DOM-less smoke), B4 precedent.
  - `useTable.ts:145` `(options.selection?.strategy ?? 'page') as
    TableStrategy`: a PRE-EXISTING `as` on a typed-optional default, not an
    ad-hoc JS-domain guard/parser — out of B5 substitution scope, left
    untouched (no new `as` introduced by B5).
  - All DOM `instanceof`/`.dataset`/`.cells`/`.rows`/`.tBodies`/`.closest`/
    `.querySelector*`/`.getAttribute`/`.setAttribute`/`.style`/`.textContent`/
    `aria-*` and `Array.from(Set)`/`Array.from(HTMLCollection)` iteration:
    the clean DOM boundary — never ceremony-wrapped, B4 precedent.

  No `Number(...)`/`parseInt`/`parseFloat`/`Number(el.dataset.*)`/
  `Number(el.getAttribute('aria-*'))` raw coercion exists in either file —
  every table numeric helper (`normalizeIndex`/`applyRowIndex`/
  `applyRowCount`/`compareCellValues`/`extractRowId`) is imported from
  `./helpers.js` and was already core-canonicalized in B2, so there is no
  `Number(dataset/aria)` coercion shift to resolve in B5. All sort/select
  event-detail object literals (`{ part, action }`, `{ ids: new Set(...) }`,
  `{ cell }`, `{ columns }`, `{ id }`, `{ page, offset, size }`,
  `{ key, direction: dir }`) remain EXACT-shape with only static declared
  keys — no spreads / dynamic keys — so helpers.ts's strict B2 `recordOf`
  table/detail guards still accept them unchanged. `src/browser/types.ts`:
  NO change (every converted guard preserved its exact narrowing; no public
  type widened).

- **createDrag.ts / useDrag.ts (B4): all substitutions behavior-identical
  (no divergence).** The single converted site —
  `createDrag.ts:reorder`'s `if (item !== undefined)` (splice-extracted
  `T | undefined`) → `if (!isUndefined(item))` — is a semantically exact
  swap: `!isUndefined(item)` has the identical truth table to `item !==
  undefined` (rejects only `undefined`, still admits `null` and every
  other `T`), so the reorder/extract path is unchanged and a list
  containing `null` items still reorders them. No test change (the
  existing `createDrag.test.ts` suite is the regression gate; it stayed
  green pre- AND post-change). All other JS-looking sites in both files
  are DOM-native or typed-param boundary, not core-substitutable (see the
  B4 note in `## Notes`). `src/browser/types.ts`: NO change (no narrowed
  return type altered).

## Notes

traversals.ts (B3): no core-substitutable JS-domain sites — file is DOM-native by design (traversal/batch/delegate/keyed all operate on real DOM nodes; matching guards + createMatcher already core-canonicalized in helpers.ts B2). Clean boundary, not a gap.

createDrag.ts / useDrag.ts (B4): exactly one core-substitutable site across both files — `createDrag.ts:reorder`'s splice-result `item !== undefined` → `!isUndefined(item)` (behavior-identical, ledgered above under No-shift / boundary notes). Every other JS-looking construct is the deliberate clean boundary, left native with reason:

- **DOM event/element `instanceof` (createDrag.ts):** `event instanceof MouseEvent/DragEvent/KeyboardEvent/PointerEvent`, `eventTarget/handle/pressed instanceof HTMLElement`, `related/t instanceof Node`, plus `.closest`/`.querySelector`/`.querySelectorAll`/`.contains`/`.dataset`/`.draggable`/`dataTransfer`/`getBoundingClientRect`/`getSelection` — the native DOM boundary; wrapping in core `instanceOf(...)` is forbidden ceremony.
- **Typed-param literal comparison (createDrag.ts):** `axis === 'vertical'` compares an already-typed `'vertical' | 'horizontal'` option, not a guard on `unknown` — no `literalOf` needed (typed comparison, no shift).
- **DOM-event shape discrimination (createDrag.ts:select):** `'ctrlKey' in event` / `'shiftKey' in event` and the surrounding `event && …` discriminate a `MouseEvent | KeyboardEvent | PointerEvent | undefined` DOM-event union — native DOM-event interrogation, not a JS-domain value guard.
- **Vue-reactivity / internal numeric state (createDrag.ts):** `if (!refs)` (typed `scope.run()` result — Vue effect-scope mechanic), `selectionAnchor !== null` / `target.value` / index `.sort`/`.filter`/`Math.max`/`Math.min` (index arithmetic on already-`number` reactive state), `String(startIndex)` (number→string serialization for `dataTransfer.setData`, the inverse of a core parser — not unknown→typed). Native, per "Vue reactivity / index arithmetic stays native".
- **DOM structural nullness (createDrag.ts):** `row.parentElement === element`, `!!row` on `HTMLElement | null`, `if (!row)` early-returns — DOM-ref structural checks, native (NOT loose-input value guards).
- **SSR environment probe + Vue reactivity (useDrag.ts):** `typeof window === 'undefined'` is the environment-existence idiom core deliberately does not replace (identical boundary as B2's `typeof CSS/Intl/requestAnimationFrame` and the DOM-less import contract — `isObject(window)` would `ReferenceError` under SSR). `!el` (Vue `Ref<HTMLElement | null>.value`), `options.list?.value ?? []`, `options.items?.value ?? []`, `?? false`/`?? EMPTY_SET`/`?? null` on `computed`/ref reads, `options.list ? … : undefined`, `if (!arr)` on a Vue ref `.value` — all Vue-reactivity mechanics, native. **Net: useDrag.ts has zero core-substitutable JS-domain sites — DOM/Vue-adapter by design, clean boundary, not a gap.**

createTable.ts / useTable.ts (B5): all substitutions behavior-identical; native sites cite B4 precedent. createTable.ts converted 20 sites (3× `typeof provided === 'number'` → `isNumber`; 1× `!Number.isFinite(page)` → `!isFiniteNumber`; 4 Map-lookup undefined-guards → `isUndefined`/`!isUndefined`; 6× `arg === undefined` → `isUndefined` + 6× `Array.isArray(arg)` → `isArray` across the selection/expansion overloads (selection ×3 + expansion ×3 each)). useTable.ts converted 12 sites (6× `arg === undefined` → `isUndefined` + 6× `Array.isArray(arg)` → `isArray` across its selection/expansion overload adapters). Zero behavior shifts (no test/`types.ts` change; `createTable.test.ts` 17 + full `src:browser` 30/1224 green pre- and post-change). `normalizeIndex`/`applyRowIndex`/`applyRowCount`/`compareCellValues`/`extractRowId` reused from B2-core-canonical `./helpers.js` (NOT re-coerced). Full native-exclusion rationale (typed discriminators, declared `number | null` helper returns, Vue/SSR mechanics, pre-existing `as`, DOM boundary) detailed under the B5 entry in `### No-shift / boundary notes`.

All six drag-detail object literals in createDrag.ts (`DragEndDetail` L137, `DragStartDetail` ~L165, `DragOverDetail` ~L188, `DragDropDetail` ~L226, `DragTapDetail` ~L371, the `reorder` emit payload ~L216) remain EXACT-shape object literals with only static declared keys — no spreads, no dynamic keys introduced — so helpers.ts's strict `recordOf({...})` drag-detail guards (B2) still accept them unchanged.

createToast.ts / createForm.ts / useForm.ts (B6): four sites converted in createToast.ts (1 depth site + 3 `Number.parseFloat`/`Number.isFinite` sites in `length()`); createForm.ts and useForm.ts have zero core-substitutable JS-domain sites. Zero behavior shifts (no test/`types.ts` change; full `src:browser` 30/1224 green pre- and post-change).

**Converted sites (createToast.ts):**
- `createToast.ts:stack/depth` — `const depthValue = Number(depthRaw)` + `Number.isFinite(depthValue) && depthValue >= 1` → `const depthValue = parseNumber(depthRaw)` + `!isUndefined(depthValue) && depthValue >= 1`. `depthRaw` is from `getComputedStyle(container).getPropertyValue('--set-toast-stack-depth').trim()`, a CSS custom-property string that is a JS-domain numeric input to the deck-depth logic. `parseNumber` guarantees finite (eliminating the redundant `Number.isFinite` check); the `undefined`-guard (`!isUndefined(depthValue)`) replaces the finitude gate with the precise `parseNumber` contract. Behavior-identical: the degenerate empty-property case (`''`) reaches `depth = 3` via both paths (`Number('')` = 0 → fails `>= 1`; `parseNumber('')` = undefined → also fallback 3). No test change; existing `createToast.test.ts` suite is the regression gate (7 tests, green pre- and post-change). No divergence recorded.
- `createToast.ts:length()` — 3× `Number.parseFloat(...)` → `coerceNumber(...)` and 3× paired `Number.isFinite(...)` → `isFiniteNumber(...)` (the `getComputedStyle(...).fontSize` DOM reads stay native). Behavior-identical: `coerceNumber`'s string branch is `parseFloat(value)`, which is exactly `Number.parseFloat`; `isFiniteNumber(x)` = `isNumber(x) && Number.isFinite(x)` — rejects `undefined`/`NaN`/`Infinity` exactly as the old `!Number.isFinite` guards did (for `undefined` from `coerceNumber`, `isNumber(undefined)` is false so `isFiniteNumber` returns false, identical to `!Number.isFinite(NaN)` on the old `parseFloat`-of-non-numeric path). The `getComputedStyle(document.documentElement).fontSize` and `getComputedStyle(host).fontSize` DOM reads are the clean boundary and stay native. Core import updated to `import { coerceNumber, isFiniteNumber, isUndefined, parseNumber } from '@elements/core'` (alphabetized; `parseNumber`/`isUndefined` retained for the depth site). No test change; behavior-identical. No divergence recorded.

**Native, NOT converted (B4/B5 precedent):**

createToast.ts:
- `typeof window === 'undefined'` (schedule guard): SSR env probe — unconditionally native; `isUndefined(window)` would `ReferenceError` under the DOM-less bundle smoke. B4/B5 precedent.
- `container.dataset.toastPosition === 'top'`: DOM `.dataset` read + typed string comparison on a declared union — DOM boundary + typed discriminator. B4/B5 precedent.
- `String(index)` (×1, `--set-toast-stack-index`) / `String(hiddenCount)` (×1, `TOAST_HIDDEN_COUNT_ATTR`): `number → string` serialization for `setAttribute` — inverse of a parser, not unknown→typed coercion. B5 precedent (`String(startIndex)` in createDrag.ts).

createForm.ts:
- All `event.target instanceof Element` (×4, in `onFocusout`/`onInput`/`onChange`/`onInvalid`): DOM `instanceof` boundary, never ceremony-wrapped. B4/B5 precedent.
- `isValidityElement(field/target)` (×5): already uses the B2-core-canonical `helpers.ts` helper — not a conversion target; reused exactly as specified (prefer existing core-canonical helpers over re-coercing inline).
- `options.submit?.invalid ?? false`, `options.validate?.input ?? false`, `options.validate?.mount ?? false`, `options.validate?.submit ?? true`: typed optional-boolean defaults — option-presence `??` idiom on declared types, not JS-domain guards on loose input. B4/B5 precedent (`options.X !== undefined` option-presence left native).
- `if (!refs)` (effectScope result): Vue effect-scope mechanic, unconditionally native. B4/B5 precedent.
- `if (!el)` (×multiple, typed `HTMLFormElement | null`): typed declared-null state, DOM-ref structural check. B4/B5 precedent.
- `if (!name)` / `if (!name) return` (string|null discriminator): declared typed-union discriminator on a `string | null` return, not a loose-input guard. B4/B5 precedent.
- `errors.value.length === 0`, `fieldsByName(name).length > 0`: arithmetic on already-typed reactive arrays, native.
- All `emit(el, FORM_EVENTS.x, { field, data, valid })` / `{ errors, valid }` / `{ data, errors, valid }` / `{ field, message, validity }` / `{ data }` / `{ data: event.formData }` detail literals: remain EXACT-shape object literals with only static declared keys — no spreads, no dynamic keys — so B2's strict `recordOf(...)` form-detail guards still accept them unchanged.

useForm.ts:
- `typeof window === 'undefined'` (watch guard): SSR env probe — unconditionally native. B4/B5 precedent (identical to useDrag.ts / useTable.ts). **Net: useForm.ts has zero core-substitutable JS-domain sites — pure Vue adapter by design, clean boundary, not a gap.**
- All `factory.value?.x ?? fallback`, `?? EMPTY_ARRAY`, `?? EMPTY_SET`, `?? false`, `?? null`: Vue ref / computed reactivity mechanics, unconditionally native. B4/B5 precedent.

createSelect.ts / createPopover.ts / createTooltip.ts / createMenu.ts + useSelect.ts / usePopover.ts / useTooltip.ts / useMenu.ts (B7): exactly TWO core-substitutable sites across all 8 files — `createPopover.ts:hasTransition` and `createTooltip.ts:hasTransition`, the identical `parseFloat`-of-CSS-`transition-duration` site. Both converted, both behavior-identical, ZERO divergences (no test/`types.ts` change; `createPopover.test.ts` 14 + `createTooltip.test.ts` 8 + `createMenu.test.ts` 8 + `createSelect.test.ts` 7 + `usePopover.test.ts` 21 + full `src:browser` stayed green pre- AND post-change). `createSelect.ts`, `createMenu.ts`, and all four composables have zero core-substitutable JS-domain sites (pure DOM / Vue-adapter / typed-discriminator / option-presence boundary by design — clean boundary, not a gap).

**Converted sites (createPopover.ts / createTooltip.ts, identical):**
- `hasTransition()` — `raw.split(',').some((v) => parseFloat(v.trim()) > 0)` → `const n = coerceNumber(v.trim()); return !isUndefined(n) && n > 0`. `raw` is the `getComputedStyle(panel).transitionDuration` string (the DOM read stays native; only the string→number coercion is the convert target). B6 lesson: `parseFloat(s)` leading-numeric → core `coerceNumber` (its string branch IS `parseFloat`). Failure-mode match: the old code had NO `Number.isFinite` guard (bare `parseFloat(...) > 0`), so the result was paired with `!isUndefined` (NOT `isFiniteNumber`) — `coerceNumber`'s failure value is `undefined`, never null, so `!isUndefined(n)` is the precise, exact guard. `coerceNumber('0.3s')`=0.3 (defined, `>0` true), `coerceNumber('0s')`=0 (defined, `0>0` false), `coerceNumber('')`/`coerceNumber('s')`=undefined (`!isUndefined`=false — matches the old `NaN > 0` = false). Pairing with `isFiniteNumber` instead would have ADDED a finitude gate the original lacked (changing the `parseFloat('Infinity')` → Infinity > 0 = true path to false); the computed `transition-duration` is a browser-normalized finite `<time>` and `'Infinity'` is not a representable computed value, so that path is unreachable anyway — but `!isUndefined` keeps it bit-exact regardless, so there is no observable shift. No test change; behavior-identical. No divergence recorded.

**Native, NOT converted (B4/B5/B6 precedent):**

createSelect.ts (zero conversions — DOM/Vue-adapter factory by design):
- `options.multiple ?? false`, `options.autocomplete ?? false`, `options.dismiss?.{outside,escape,inside} ?? …`, `options.placement ?? 'bottom-start'`, `options.flip ?? DEFAULT_SELECT_FLIP`: typed optional-`??` option-presence defaults — B4/B5/B6 precedent (`options.X ?? default` left native).
- `options.value === undefined ? input.value : (value.value ?? '')`: option-presence `=== undefined` on the declared `string | readonly string[] | undefined` option — B4 precedent (`MatcherOptions !== undefined` class), left native.
- `toStringList(options.value)`: B2-core-canonical `./helpers.js` helper — reused, not a conversion target (prefer existing core-canonical helpers over re-coercing).
- `if (!visible || !value || !values || !query)` (effectScope `scope.run()` results), `values?.value[0] ?? null`, `factory`-less ref reads: Vue effect-scope / ref reactivity — unconditionally native. B4/B5/B6 precedent.
- `v === null` / `v !== null` (×4, `el.getAttribute(SELECT_VALUE_ATTR)` results), `menu.id || generateId(...)`, `controlEl.getAttribute('aria-activedescendant')`: DOM `.getAttribute`/`.id` reads + their `string | null` structural null-checks — the clean DOM boundary. B4/B5/B6 precedent.
- `native instanceof HTMLSelectElement`, `event.target instanceof HTMLElement`/`HTMLInputElement`, `event instanceof KeyboardEvent`, `item instanceof HTMLElement`, `.closest`/`.querySelectorAll`/`.contains`/`document.getElementById`/`Array.from(...)`/`.dataset`/`.classList`/`.scrollIntoView`/`.hasAttribute`/`.setAttribute`/`.showPopover`: DOM `instanceof` / DOM API — never ceremony-wrapped. B4/B5/B6 precedent.
- `key === 'ArrowDown' | 'ArrowUp' | 'Home' | 'End' | 'Enter'`, `input === toggleEl`, `input.value !== (value.value ?? '')`: DOM `KeyboardEvent.key` interrogation + DOM element identity — DOM-event/element boundary (same class as createPopover's `event.key === 'Escape'`), NOT a guard on `unknown` narrowing to a project union. B4/B5/B6 precedent.
- `needle === ''`, `query.value === '' ? …`, `seed === '' ? …`: empty-string comparisons on already-`string` derived/typed values — not a JS-domain value-type guard on loose input. B4/B5/B6 precedent.
- `rove(...)` reused from B2-core-canonical `./helpers.js` — not a conversion target.

createMenu.ts (zero conversions — DOM/Vue-adapter factory by design):
- `options.{dismiss?.*,strategy,offset} ?? …`, `Math.max(0, options.flip ?? DEFAULT_MENU_FLIP)`: typed optional-`??` option-presence defaults + numeric arithmetic on a `number` — B4/B5/B6 precedent.
- `flipThreshold === 0`: comparison on a derived `number` (typed numeric state, not a guard on `unknown`) — B5 precedent (numeric-state comparison stays native).
- `String(flipThreshold)`: number→string serialization for `setProperty`/template — inverse of a core parser, B5 precedent (`String(startIndex)` in createDrag.ts / `String(index)` in createToast.ts).
- `previousFlip` truthy-check (`menu.style.getPropertyValue('--set-menu-flip')` empty-string), `menu.style.*`/`.setProperty`/`.removeProperty`: DOM `.style` reads/writes + their `string` structural checks — DOM boundary. B4/B5/B6 precedent.
- `event.target instanceof HTMLElement`/`Node`, `event instanceof KeyboardEvent`, `event.target === toggleEl`, `event.key === 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'`, `.closest`/`.contains`/`document.activeElement instanceof HTMLElement`/`.preventDefault`/`.setAttribute`/`.removeAttribute`: DOM `instanceof` / DOM-event-key / DOM API — clean DOM boundary. B4/B5/B6 precedent.
- `if (!popover.visible.value)`, `if (!dismissInside)`, `items.length === 0`: Vue ref read / boolean / array-length — Vue/arithmetic, native.
- `focusableItems(menu, MENU_ITEM_SELECTOR)` / `rove(...)` reused from B2-core-canonical `./helpers.js` — reused, not conversion targets.

createPopover.ts / createTooltip.ts (besides the one converted `hasTransition` site each):
- `options.{strategy,offset,trigger,dismiss?.*,delay?.*} ?? …`, `options.placement ?? 'bottom'`: typed optional-`??` option-presence defaults — B4/B5/B6 precedent.
- `placementOpt !== false`, `placed && placementOpt !== false`, `next.placement !== false`, `placementOpt === false ? 'bottom' : placementOpt`, `next && 'placement' in next`, `next.placement ?? 'bottom'`: comparisons / `in` on the ALREADY-typed `false | Placement` (and `{ placement?: false | Placement }`) option discriminator — typed discriminator + option-presence, NOT a guard on a loose placement/side string. B4/B5/B6 precedent. (Deciding declared types: `placementOpt: false | Placement`, `options.placement?: false | Placement`, `next?: { readonly placement?: false | Placement }`.)
- `if (!refs)` (effectScope `scope.run()` result): Vue effect-scope mechanic — unconditionally native. B4/B5/B6 precedent.
- `typeof window === 'undefined'` (scheduleResolvedSide), `typeof getComputedStyle === 'undefined'` (hasTransition), `typeof performance !== 'undefined'` (doShow): environment-existence probes on possibly-undeclared globals — `isUndefined(window/getComputedStyle/performance)` would `ReferenceError` under the DOM-less bundle smoke; the env boundary core deliberately does not replace. B6 precedent (`typeof CSS/Intl/requestAnimationFrame`).
- `if (!raw)` (`getComputedStyle(panel).transitionDuration` empty-string), `panel.matches(':popover-open')`, `event.target instanceof Node`, `event.key !== 'Escape'`, `event.pointerType !== 'touch'/'pen'` (createTooltip), `anchor.getAttribute(...)`/`previousAria* === null`/`previousPanelId === ''`/`panel.id`/`.contains`/`.showPopover`/`.hidePopover`/`.style`/`.dataset`/`requestAnimationFrame`: DOM API + DOM-read `string | null`/empty structural checks + DOM-event interrogation — the clean DOM boundary. B4/B5/B6 precedent.
- `const target = event.target as Node | null` (createTooltip:onDocPointerDown): a PRE-EXISTING `as` on a DOM-event target, not an ad-hoc JS-domain guard/parser — out of B7 substitution scope, left untouched (no new `as` introduced; B5 precedent for pre-existing `as`).
- `sideOf`/`areaForPopoverPlacement`/`selfsForPopoverPlacement`/`resolvePopoverSide` reused from B2-core-canonical `./helpers.js` — the placement helpers are reused exactly, NOT duplicated or re-coerced (per the placement-enum note: convert only genuinely-loose placement/side arrivals; here every placement value is already the typed `Placement` union, so the helpers handle decomposition canonically).
- `if (placed)`, `if (visible.value)`, `if (triggers.{hover,focus,click})`, `if (!dismissOutside/dismissEscape)`: boolean / Vue ref / typed-optional-boolean truthy reads — native.

useSelect.ts / usePopover.ts / useTooltip.ts / useMenu.ts (B7): **zero core-substitutable JS-domain sites — pure Vue adapters by design, clean boundary, not a gap** (identical posture to useDrag.ts / useTable.ts / useForm.ts in B4/B5/B6).
- `typeof window === 'undefined'` (×4, watch guards): SSR env probe — unconditionally native; `isUndefined(window)` would `ReferenceError` under the DOM-less smoke. B4/B5/B6 precedent.
- `placementOpt` computed `if (value === false) … if (value === undefined) … return typeof value === 'string' ? value : value.value` (×4): `value` is the DECLARED `false | Placement | Ref<Placement> | undefined` (useSelect/useMenu: `Placement | Ref<Placement> | undefined`) option union. `=== false` is a typed discriminator; `=== undefined` is option-presence on a typed optional; `typeof value === 'string' ? value : value.value` is the canonical Vue-adapter "unwrap a `T | Ref<T>`" idiom — discriminating raw-vs-Vue-ref within an ALREADY-typed union, a Vue-reactivity adapter mechanic, NOT a JS-domain value guard on loose `unknown`. (`isString(value)` would be a 1:1 swap but the input is a typed Vue-ref-or-raw union, not a boundary-loose value — Vue reactivity stays native, B4/B5/B6 precedent.) Left native; explicitly noted per the placement-enum guidance (default LEAVE NATIVE for an already-typed union rather than risk a ceremony-wrap).
- `!toggle`/`!menuOption`/`!anchor`/`!panel`/`!menu` (Vue `Ref<HTMLElement | null>.value`), `nativeOption ?? null`, `inputOption ?? null`, `arrow ?? null`, `factory.value?.x.value ?? fallback`, `if (next) factory.value?.update(...)`, `watch(...)`/`computed(...)`/`shallowRef(...)`: Vue ref / computed / watch reactivity mechanics — unconditionally native. B4/B5/B6 precedent.

theme.ts (B8): **one converted file** — `src/browser/theme.ts` only. All other remaining `src/browser` files (all factories and composables in B8 scope, plus `taxonomy.ts`, `patterns.ts`, `constants.ts`, `elements.ts`, `events.ts`, `modifiers.ts`, `tokens.ts`, `factories/index.ts`, `composables/index.ts`) have **zero core-substitutable JS-domain sites** — clean boundary by design (frozen data, DOM-native, Vue-adapter, typed-discriminator, option-presence, SSR-env-probe).

**Converted sites (theme.ts):**
- `theme.ts:loadStored` — `try { localStorage.getItem(key); raw.split(':')[0] … } catch { return null }` → `const result = attempt(() => { localStorage.getItem(key); … }); return result.success ? result.value : null`. `localStorage.getItem` can throw in privacy mode / file:// origins; `attempt(cb)` wraps the throwing IO, returns `{ success: false }` on any throw, which maps to `null` — behavior-identical to the original `catch { return null }`. `isSetting` (already imported from `./helpers.js`) reused, NOT re-implemented — per the B8 SPECIAL instruction.
- `theme.ts:writeStorage` — `try { localStorage.setItem(key, next) } catch { /* silent no-op */ }` → `attempt(() => localStorage.setItem(key, next))`. `localStorage.setItem` can throw on quota / privacy mode; `attempt` catches silently, result is ignored — behavior-identical to the original silent catch. Core import updated to add `attempt` from `'@elements/core'` (alphabetized, positioned after type imports, before `@vue/reactivity`).

**Behavior-identical substitutions (no test change):** Both `loadStored` and `writeStorage` conversions are semantically exact — the try/catch fallback path (`return null` / silent no-op) is identically reproduced by the `attempt` branch (`!result.success → null` / ignore result). The `useTheme.test.ts` localStorage tests (`seeds from localStorage`, `tolerates legacy mode:core format`, `persists setting changes to localStorage`, `handles invalid stored values`, `storage:false skips localStorage`, `honors custom storage key`) all stayed green pre- and post-change. No divergence recorded.

**Native, NOT converted (B4–B7 precedent):**
- `typeof document === 'undefined'` (writeAttribute, fireChange): SSR env probe on a possibly-undeclared global — `isUndefined(document)` would `ReferenceError` under the DOM-less bundle smoke. B4/B5/B6/B7 precedent.
- `typeof window !== 'undefined'` (bootstrapTheme, loadStored guard): SSR env probe — same boundary. B4/B5/B6/B7 precedent.
- `typeof window.matchMedia === 'function'` (bootstrapTheme): environment-existence probe on a potentially-absent DOM API — same env boundary as `typeof CSS.escape === 'function'` in B2, `typeof performance !== 'undefined'` in B7. B4–B7 precedent.
- `setting.value === 'system'` / `next === 'system'` (mode computed, writeAttribute): comparison on ALREADY-typed `ThemeSetting` union (`'light' | 'dark' | 'system'`) — typed discriminator, B4–B7 precedent.
- `options.storage === false` / `options.storage?.key ?? STORAGE_KEY_THEME`: option-presence `=== false` + `??` default on typed `false | { key: string } | undefined` — option-presence typed-optional boundary, not a guard on `unknown`. B4–B7 precedent.
- `if (!key)` (writeStorage): `key` is `string | null` — declared typed-null state, DOM-ref structural check class. B4–B7 precedent.
- `raw.split(':')[0] ?? ''` inside the `attempt` callback: `.split` on a confirmed-truthy `string` (already checked `if (!raw) return null`) — string manipulation inside the callback, not a value guard on `unknown`. Left as-is; the callback interior is unchanged.
- `createTheme.ts:30` `typeof document !== 'undefined'`: SSR env probe — unconditionally native. B4–B7 precedent. (`createTheme.ts` has zero other conversion candidates — all remaining sites are typed-option reads, `isSetting` reuse from `./helpers.js`, and Vue readonly wraps.)

**All other B8-scope files — zero conversions (full enumeration):**

Factories: `createFocus.ts` (`typeof initialOpt === 'function'` = typed `((el: HTMLElement) => HTMLElement | null) | HTMLElement | null | undefined` discriminator — typed union unwrap, not `unknown`; all `instanceof` = DOM boundary), `createPointer.ts` (`activePointer === null` = declared `number | null` state; all `instanceof PointerEvent` = DOM), `createDrop.ts` (`dropEffect === undefined` = typed optional option-presence; `=== 'none'` = typed union discriminator; all `instanceof DragEvent`/`Node` = DOM), `createNav.ts` (`typeof threshold === 'number'` / `=== undefined` on typed `number | number[] | undefined` — typed discriminator, not `unknown`), `createAside.ts` (`'newState' in event` = DOM-event discriminator; `=== 'open'` on typed `ToggleEvent.newState` = typed discriminator), `createDialog.ts` (`backdropMode === 'static'` on typed `true | false | 'static'` = typed discriminator; `instanceof MouseEvent` = DOM), `createDetails.ts` (`event.target instanceof Element` = DOM), `createButton.ts` (`String(active.value)` = number→string for `setAttribute` — B5/B6 precedent), `createCarousel.ts` (`touchStartX === null` = declared `number | null` state; `event.key === ...` = DOM-event-key interrogation; all option comparisons = typed discriminators; `ReturnType<typeof setInterval>` = TS type utility), `createAlert.ts` (`event.target instanceof Element` = DOM), `createTabs.ts` (`options.initial === true` = typed-optional-boolean comparison; `=== 'true'` on `.getAttribute(...)` = DOM-read typed string comparison).

Composables (`useFocus`, `usePointer`, `useDrop`, `useNav`, `useAside`, `useDialog`, `useDetails`, `useButton`, `useCarousel`, `useAlert`, `useTabs`, `useToast`, `useTheme`): ALL have `typeof window === 'undefined'` SSR env probes (native, B4–B7 precedent) as their only grep hit. **Zero core-substitutable JS-domain sites — pure Vue adapters by design, clean boundary, not a gap** (identical posture to useDrag/useTable/useForm/useSelect/usePopover/useTooltip/useMenu in B4–B7).

Data / registry files (`constants.ts`, `elements.ts`, `events.ts`, `modifiers.ts`, `tokens.ts`, `taxonomy.ts`): `typeof` grep hits are TypeScript type-utility expressions (`(typeof x)[keyof typeof x]`, `ReturnType<typeof setInterval>`, `keyof typeof`) — not JS-domain value guards. `=== null` in `constants.ts` is a comment string. Zero conversion candidates.

`patterns.ts`: `=== undefined` on typed optional regex `match?.[1]` (option-presence boundary, B4–B7 precedent); `.split(',')` on a confirmed `string` in an SCSS helper (string manipulation on already-typed input — not unknown→typed). Zero conversion candidates.

`factories/index.ts`, `composables/index.ts`: barrel re-exports, zero runtime logic.

**`src/browser/types.ts`: NO change required.** No new narrowing introduced; `attempt` returns `Result<T>` with a concrete `.value: T` branch — no `as` cast needed, TS infers `result.value` as `ThemeSetting | null` directly from the callback return type.

**B8 divergences: none.** Both `attempt` substitutions are behavior-identical; no test/`types.ts` change. Full `src:browser` 30 files / 1224 tests green pre- and post-change. `npm run check` 0/0. `npm run build` succeeds; `node --input-type=module -e "import('./dist/src/browser/index.js')"` → `OK`.
