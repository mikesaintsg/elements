# Traversals integration + maximalist `src/browser` extraction — design

> Make the brought-over `traversals` trio look native to the repo, then sweep every non-exported top-level symbol in `src/browser` into the centralized files (maximalist), then a consolidation pass. Behavior-preserving, verified + committed in batches.

Date: 2026-05-17
Status: approved (brainstorming) — pending written-spec review

## 1. Context

Three foreign files were copied in from another project (`low*`/`lowdom`/`lowcore` ecosystem) and need to look as if they were always part of this repo:

- `src/browser/traversals.ts` — high-performance DOM traversal utilities.
- `tests/src/browser/traversals.test.ts` — its unit tests (some labels/assertions are sloppy).
- `guides/traversals.md` — its guide, which does **not** follow this repo's mandatory spec-guide skeleton and is factually stale vs the implementation.

`src/browser/index.ts` already has `export * from './traversals.js'` (user-added). The repo enforces TS↔SCSS↔guide parity via tests; `guides/README.test.ts` enforces a guide↔driver bijection and a fixed heading skeleton, so the repo gate is **currently red** until the guide is reshaped and a `tests/guides/traversals.test.ts` driver exists.

Beyond the trio, the task is a repo-wide cleanup: extract **every** non-exported top-level constant/function across all ~13 `src/browser` implementation files into `constants.ts` / `helpers.ts`, ensure all helpers have comprehensive tests in `tests/src/browser/helpers.test.ts` (which does not exist yet), then consolidate.

### Decisions taken during brainstorming

1. **Sweep scope:** whole `src/browser` (traversals trio + all impl files + consolidation). "src/core" in the request was shorthand for the browser impl files; the actual `src/core` package already had its FU9 consolidation and is out of scope.
2. **Collision policy:** decide per-symbol in this design (table in §4).
3. **Extraction depth:** maximalist relocate — impl files end up containing only their class/factory; module-private state/builders are relocated, not left in place.
4. **`isElement` rename:** the DOM node-type guard takes the canonical `isElement`; the existing tag-assertion guard (partner of `assertElement`) is renamed **`isTagged`**.
5. **Theme singleton:** extracted into a new dedicated `src/browser/theme.ts` service module; `createTheme.ts` becomes a thin per-caller wrapper.

## 2. Non-negotiable constraints (AGENTS.md)

- No `any`, no `!` (non-null assertion), no `as` (type assertion), no `@ts-*`/`eslint-disable`.
- Reusable/public types live in `*/types.ts` first; implementation conforms to types.
- Centralized-file pattern: `types.ts` (types), `helpers.ts` (guards/utilities, **framework-agnostic — no Vue**), `constants.ts` (UPPER_SNAKE values), `index.ts` (sole barrel; `export *`). Implementation files contain only the class/factory.
- Code style: tabs, single quotes, no semicolons, `.js` import extensions, type imports first.
- Helper naming §4.3: `{verb}{Noun}`; single-word only when unambiguous.
- `index.ts` re-exports `helpers.ts` and `traversals.ts` both via `export *` — any duplicate exported name is a hard barrel error, so every collision must resolve to distinct names.
- Spec-guide skeleton (enforced by `tests/guides/README.test.ts`): line 1 `# Title`, line 3 `>` blockquote, then `## Surface` → `## Contract` → `## Patterns` → `## Tests` → `## See also`. Guide↔driver bijection: `guides/{name}.md` ⇔ `tests/guides/{name}.test.ts`. Pointer file `guides/README.md` must link every guide.

## 3. `traversals.ts` cleanup

- Replace the foreign file header and all TSDoc with project-voice documentation.
- Apply code style (tabs/quotes/no-semicolons/`.js`), fix spacing artifacts (`criteria. id`, `element. childElementCount`, etc.).
- Eliminate every AGENTS §1 violation, reworking with guards/narrowing rather than assertions:
  - `stack.pop()!` (several) → length-checked pop / `undefined` narrowing.
  - `current as HTMLElementTagNameMap[K]`, `cloneNode(deep) as T`, `doc.getElementById(id) as T`, `event.target as Element | null`, `listener as EventListener` → typed signatures + narrowing; generic returns derived without assertion.
- Move non-exported types to `types.ts` (§4); move non-exported guards to `helpers.ts` (§4, §5).
- All symbols referenced by `tests/src/browser/traversals.test.ts` must be exported through the barrel.

## 4. Collision / near-duplicate resolution

| Symbol | Conflict | Resolution |
|---|---|---|
| `isElement` | traversals `isElement(node): node is Element` vs helpers `isElement<T>(el, expected): el is T` | Node-type guard keeps `isElement`. Existing tag-assertion guard → **`isTagged`**; update every internal call site (composables/factories). |
| `isFormElement` (traversals; tag-set) vs `isFormFieldElement` (helpers; instanceof×7) | near-duplicate | Drop `isFormElement` (its INPUT/TEXTAREA/SELECT/BUTTON set is a subset of `isFormFieldElement`); callers use `isFormFieldElement`. Re-introduce a narrowed guard only if a concrete call site needs exactly that set. |
| `isHTMLElement` (traversals) | overlaps `assertElement` family but distinct | Keep `isHTMLElement` (node→HTMLElement guard). |
| `isFocusable` / `findFocusableElements` (traversals) vs `focusableItems` + `FOCUSABLE_SELECTOR` (helpers/constants) + `createFocus` | semantic overlap | Keep traversals' generic `isFocusable`/`findFocusableElements`; fold `focusableItems` to reuse them in the consolidation pass; `FOCUSABLE_SELECTOR` stays in constants. |
| `delegateWithPredicate`, `findAllChildren` | guide-only; no such exports | Guide rewritten to the real exports (`delegate`, `findChildren`). |
| `clear` / `remove` / `append` / `prepend` / `replace` / `move` / `swap` | no helpers collision; `clear` matches §11 vocab | Keep as-is. |

Types relocated to `types.ts`: `ElementPredicate` (kept — reads as a role), `MatchCriteria` → **`MatcherOptions`** (§4.5 config→`Options`; it is the input bag for `createMatcher`).

## 5. Maximalist extraction across `src/browser`

### → `constants.ts` (pure values)
`ALERT_DISMISS_SELECTOR` (createAlert), `DRAG_ROW_CLASSES` (createDrag), `FORM_VALIDATED_ATTR` (createForm), `PANEL_ATTR`/`PANEL_SELECTOR`/`RESIZE_HANDLE_ATTR`/`RESIZE_HANDLE_SELECTOR`/`ARIA_SORT_VALUE` (createTable), `SEGMENT` (taxonomy), `PLACEMENT_AREAS`/`PLACEMENT_SELFS` (helpers), and the `EMPTY_*` sentinels (useTable ×6, useForm ×5, useDrag ×1).

### → `helpers.ts` (pure functions)
traversals guards (§4); `cssEscape` + `compareCellValues` + `sortCollator` (createTable); `entry` (taxonomy row builder); `splitTopLevel` / `leadingTagsOfCompound` / `trailingTagsOfCombinatorChain` / `tagsInHead` (patterns selector parsers); `normalize` (createSelect) → renamed **`toStringList`** (§4.3 — `normalize` is too vague at module scope). Existing internal `randomBytes`/`formatUuid` stay (already private helpers of `helpers.ts`).

### Special handling
- **`PAIRING_INDEX` (patterns.ts):** a derived `Map` from the exported `STRUCTURAL_PAIRINGS`. The codebase already exports sibling derived indices (`TAXONOMY_BY_TAG`, `GROUPS_BY_TAG`). Resolution: **export it** for consistency rather than relocate a memoized lookup into `constants.ts`.
- **`createTheme.ts` singleton:** uses `@vue/reactivity`; `helpers.ts` is framework-agnostic, so a literal move is infeasible. Extract the reactive singleton (`setting`/`systemDark`/`mode`/`bootstrapped`/`mediaQuery`/`mediaListener`/`stopApply`/`storageKey` + `loadStored`/`writeAttribute`/`writeStorage`/`fireChange`/`bootstrap`) into a new **`src/browser/theme.ts`** service module, barrel-exported. `createTheme.ts` becomes the thin per-caller wrapper (`set`/`toggle`/`destroy`/`on.change`). Pure `isSetting` guard → `helpers.ts`. `resetTheme` stays test-only, exported from `theme.ts`. `guides/README.md` `src/browser` table gains a `theme.ts` row.

## 6. Consolidation pass (after extraction is green)

- `EMPTY_*` family → shared frozen typed sentinels (`EMPTY_ARRAY`, `EMPTY_SET`, plus the few element-typed ones) with stable identity for reactivity; replace per-file declarations.
- Apply the §4 merges (`isFormElement` removal, `focusableItems` folded into traversals focus utilities).
- Re-scan `helpers.ts` for any other near-duplicate verbs introduced by the sweep; unify per AGENTS §4.4 ("identical verbs mean identical things").

## 7. Tests

- **Create `tests/src/browser/helpers.test.ts`** — comprehensive behavior coverage for every `helpers.ts` export (pre-existing + newly extracted). Browser env (real DOM, no mocked DOM APIs), recorder/setup helpers per AGENTS §16, happy path + edge cases (empty, NaN, null host, Set/Map order) + error conditions (`assertElement` throws).
- **Clean `tests/src/browser/traversals.test.ts`** — fix the `describe('areSiblings')` label that tests `isSiblingOf`; replace weak `typeof result === 'boolean'` assertions with real DOM-state assertions where the environment allows; align imports to the final export names; drop/repair the "domain-specific tests that are not necessarily related."
- No test files for `constants.ts` / `types.ts` / `index.ts` (AGENTS §16).

## 8. Guide + parity (fixes the currently-red gate)

- Rewrite `guides/traversals.md` to the skeleton: `# Traversals` → `>` blockquote → `## Surface` (categorized export tables) → `## Contract` (doc↔source invariants) → `## Patterns` (usage) → `## Tests` → `## See also`. Every backticked API must resolve to a real export; surface must be exhaustive.
- **Create `tests/guides/traversals.test.ts`** — doc↔source parity driver modeled on `tests/guides/parsers.test.ts` (every documented call-form API is a real `traversals.ts`/`helpers.ts` export; every relevant export is documented).
- Update `guides/README.md`: new "By concept" entry, `src/browser` directory rows (`traversals.ts`, `theme.ts`), the `guides/` table row, and a pointer link to `traversals.md`.

## 9. Execution batches (each: `npm run check` + targeted vitest project + `npm run build`, then commit)

1. `traversals.ts` cleanup + type relocation to `types.ts` + guards to `helpers.ts` + collision renames (`isTagged`) + barrel sanity. Update `traversals.test.ts`.
2. Extraction sweep into `constants.ts`/`helpers.ts` across the remaining impl files; export `PAIRING_INDEX`.
3. `theme.ts` service-module extraction; `createTheme.ts` thinned; README `src/browser` row.
4. Create `tests/src/browser/helpers.test.ts` (comprehensive).
5. Consolidation pass (`EMPTY_*`, §4 merges, verb unification).
6. `guides/traversals.md` rewrite + `tests/guides/traversals.test.ts` + `guides/README.md` map updates.

Targeted vitest projects: `src:browser` for code/helpers/traversals, `guides` for the doc-parity + README drivers.

## 10. Risks

- Wide call-site churn from `isElement`→`isTagged` rename; `npm run check` is the safety net (AGENTS §2 "User Changes Override Everything" workflow — typecheck finds every site).
- `theme.ts` is a new module shape not in the AGENTS centralized list; mitigated by treating it as a service implementation file and updating the README map (no guide/test-bijection requirement applies to `src/` files, only `guides/`).
- Consolidating `EMPTY_*` must preserve referential stability (Vue reactivity depends on stable identity for unchanged empty collections).
