# @elements/core Hardening & Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development — fresh subagent per task, two-stage review (spec compliance → code quality) after each. Steps use `- [ ]`.

**Goal:** Harden `@elements/core` for security/soundness, bring it to AGENTS.md convention, trim domain leakage, complete the shaper algebra, add the inverse "from JSON Schema" subsystem, make tests comprehensive with edge coverage, and reconcile the guides + README.

**Architecture:** Lean the public surface first (Phase A), then make the forward pipeline secure/sound/convention-clean (B–C), then extend it (shapers D, from-schema E), then comprehensive tests (F), then docs (G), then final gate (H). Every code task is TDD; every task gets two-stage review.

**Tech Stack:** TypeScript (strict, ESM `.js` imports, no `any`/`as`/`!`/`@ts-*`), Vitest node `src:core` project, oxlint/oxfmt/vue-tsc, the `guides` vitest project (bidirectional parity drivers).

**Source spec/audit basis:** the four deep audits (conventions+hardening, tests, guides, generic-completeness) + the user's scope decisions:
- Inverse JSON Schema: **full** subsystem (guard + shape + parser; `$ref`/`$defs`; composition `allOf`/`anyOf`/`oneOf`/`not`/`if-then-else`; `patternProperties`/`prefixItems`/`const`/`enum`/`format`).
- Add shapers: **tupleShape, intersectionShape, lazyShape, constShape, defaultShape**.
- **Trim** parseEnv, parsePositiveInt, parseStringFields; **consolidate** `createSchema`→`compileSchema` and `createContract`→`compileContract` duplicate layers; keep `coerce*` and `parse*Field`.
- **Remove** `Tool*` types (`ToolDefinition/ToolCall/ToolResult/ToolOptions`) — supersedes the earlier keep instruction; strict generic purity wins. Keep `JsonSchemaObject` (generic).

---

## Global conventions (every task)

- Branch: work on `main` (user-authorized earlier; already pushed). Each task = pathspec-limited commit `git commit -m "..." -- <exact paths>`; never `git add -A`/`.`; no amend; no skip-hooks. Working tree currently clean.
- Gates per code task: `npx tsc -p configs/src/tsconfig.core.json --noEmit` (core typecheck), `npx oxlint src/core` (0 errors), `npm run test:src:core` (green), and — when guide-affecting — `npx vitest run --config vite.config.ts --project guides` (0 failed). `npm run check` for whole-repo before Phase H.
- AGENTS.md is binding: types in `src/core/types.ts` only; named exports; tabs/single-quote/no-semi; `import type` first; `readonly` on interface props + public returns; module helpers `{verb}{Noun}`; §13 (guards never throw; programmer error → throw at the boundary; optional → undefined); §15 full TSDoc w/ `@param`/`@returns`/`@example` on every public export; §20 smallest valid impl, dedupe.
- The bidirectional guide drivers (`tests/guides/{contracts,parsers,validators}.test.ts`) must stay green: removing/adding an export requires updating the matching guide in the SAME task (DOC↔SOURCE both directions).

---

## PHASE A — Trim domain leakage & consolidate layers

### Task A1: Remove `Tool*` types

**Files:** Modify `src/core/types.ts`; check `src/core/*.ts` for refs; `guides/contracts.md`; `tests/src/core/*`.

- [ ] Grep `ToolDefinition|ToolCall|ToolResult|ToolOptions` across `src/core/`, `tests/src/core/`, `guides/` — confirm zero runtime consumers (factories.ts already doesn't import them).
- [ ] Delete the four interfaces from `types.ts`. Keep `JsonSchemaObject` and all JSON-Schema types.
- [ ] Remove any mention from `guides/contracts.md` (the "Tool / agent schemas" prose + the tool-input example → re-frame generically as "object-root JSON Schema via `compileSchema(objectShape(...))`", no Tool nouns). Keep contracts.test.ts driver green (no `Tool*` backticked anywhere now).
- [ ] Gate: core typecheck + oxlint + `test:src:core` + guides project all green. Commit `-- src/core/types.ts guides/contracts.md` (+ any test file touched).

### Task A2: Remove `parseEnv`, `parsePositiveInt`, `parseStringFields`

**Files:** `src/core/parsers.ts`, `src/core/index.ts` (barrel re-exports via `export *` — automatic), `guides/parsers.md`, `tests/src/core/parsers.test.ts`, `tests/guides/parsers.test.ts` (driver is bidirectional — guide must not document removed fns).

- [ ] Delete `parseEnv`, `parsePositiveInt`, `parseStringFields` and any now-unused private helpers they alone used. Verify nothing else in `src/core` references them (grep).
- [ ] Remove their rows/sections/examples from `guides/parsers.md` (Surface tables + Patterns). The bidirectional `tests/guides/parsers.test.ts` SOURCE→DOC block enumerates exports — since these are gone from source, just ensure no dangling doc mention; DOC→SOURCE stays green.
- [ ] Remove their tests from `tests/src/core/parsers.test.ts` (and the foreign-domain note about parseEnv coverage).
- [ ] Gate: all green incl. guides project. Commit pathspec-limited.

### Task A3: Consolidate `createSchema`→`compileSchema`, `createContract`→`compileContract`

**Files:** `src/core/factories.ts`, `src/core/compilers.ts`, `src/core/index.ts`, `guides/contracts.md`, `tests/guides/contracts.test.ts` (bidirectional), `tests/src/core/*`.

- [ ] Decision (locked): keep the `compile*` primitives as the single public algebra; **delete `src/core/factories.ts`** entirely (both `createContract` and `createSchema` are verbatim pass-throughs to `compileContract`/`compileSchema`). Remove its `export *` line from `index.ts`. Remove `factories` from any guide SOURCES list.
- [ ] Update `guides/contracts.md`: replace all `createContract(`/`createSchema(` usage with `compileContract(`/`compileSchema(`. Update `tests/guides/contracts.test.ts` SOURCES (drop `factories`; keep `shapers,compilers,helpers`). Update `guides/README.md` By-concept/By-directory (remove `factories.ts` row; the package no longer ships a factories module).
- [ ] Confirm no `tests/src/core/factories.test.ts` needs to exist (module removed). Update any test importing `createContract`/`createSchema` → `compileContract`/`compileSchema`.
- [ ] Gate: core typecheck, oxlint, `test:src:core`, guides project all green; `git grep -nE 'createContract|createSchema|factories' src/core guides tests` clean. Commit pathspec-limited.

---

## PHASE B — Test infrastructure + security & soundness hardening (TDD)

### Task B1: Core test helper module (`tests/src/core/_helpers.ts`)

**Files:** Create `tests/src/core/_helpers.ts`; it must be importable by core test files (mirror the `tests/guides/`-local helper precedent; not a `.test.ts` so the runner won't collect it — verify the `src:core` include glob `tests/src/core/**/*.test.ts` excludes it).

- [ ] Export canonical fixtures + invariant assertions (real implementations, no mocks; §16.1):
  - `personShape()`, `nestedShape()`, `unionShape`-based and `recordShape`-based canonical shapes (dedupe the duplicated inline `personShape` in parsers.test.ts).
  - `assertParseGuardSymmetry(shape, samples: readonly unknown[])` — for each sample asserts: if `compileGuard(shape)(s)` is true then `compileParser(shape)(s)` is **not** `undefined` AND the parsed value still passes `compileGuard(shape)`; document the exact intended contract in a header comment.
  - `generatorSatisfiesGuard(shape, seeds: readonly number[])` — asserts `compileGuard(shape)(compileGenerator(shape, createRandom(seed)))` for each seed, and that two different seeds can differ.
  - `POLLUTION_KEYS = ['__proto__','constructor','prototype']` and a `assertNoPrototypePollution(fn)` helper.
  - `makeCyclic()` builders (cyclic array, cyclic object, self-referential ContractShape) for recursion-safety tests.
- [ ] Gate: `npm run test:src:core` still green (helper unused yet ⇒ no collection); core typecheck. Commit.

### Task B2: Prototype-pollution hardening (security)

**Files:** `src/core/compilers.ts` (object `compileParser` arms), `src/core/parsers.ts` (any object-accumulator builders that survived A2 — e.g. record paths), `tests/src/core/compilers.test.ts`, `tests/src/core/parsers.test.ts`.

- [ ] TDD: add failing tests first using `assertNoPrototypePollution` + `POLLUTION_KEYS` — feed `JSON.parse('{"__proto__":{"x":1}}')`-style and `{constructor:…}` objects through `compileParser` (closed, `additionalProperties:true`, `additionalProperties:shape`) and surviving record parsers; assert (a) `Object.prototype` is not polluted, (b) dangerous keys are dropped (or safely set as own keys on a null-proto object — pick one policy, document it).
- [ ] Fix: build object accumulators with `Object.create(null)` OR explicitly skip keys in `POLLUTION_KEYS`; read source keys via `Object.hasOwn`. Apply consistently across every object-building parser arm. No `as`/`!`.
- [ ] Gate: new tests pass; full `test:src:core` green; core typecheck/oxlint. Commit.

### Task B3: parse↔guard soundness

**Files:** `src/core/compilers.ts` (string/literal/number parser arms), `tests/src/core/compilers.test.ts`, `tests/src/core/_helpers.ts` usage.

- [ ] TDD: `assertParseGuardSymmetry` over: `stringShape()` with `''`, `'  hi  '`; `stringShape({min:4})` with `'  hi  '`; `stringShape({min:0})`; `literalShape('a','b')` with `'  a  '`; `numberShape()` with `'5'`; nested `objectShape({s:stringShape()})` with `{s:''}`. These fail today — they encode the intended contract.
- [ ] Fix: the **compiled** string parser must not inherit the opinionated standalone `parseString` empty-rejection/trim-then-fail; it should accept any string the shape's `compileGuard` accepts (apply only the shape's `min`/`max`/`pattern`; trimming, if any, must not turn a guard-valid value into a guard-invalid one — prefer NO trim in the compiled path, or trim then re-validate and keep raw if trim breaks the guard). Align literal/number parser arms similarly (the parsed value must pass the same shape's guard). Decouple compiled parsers from the standalone `parse*` opinionated primitives where they diverge from guard semantics. Document the final contract in code comment + (Phase G) the guide.
- [ ] Gate: symmetry helper green for all listed shapes; full suite green. Commit.

### Task B4: `oneOf` exclusivity + `rawShape` generator + bounds + empty literal/union

**Files:** `src/core/compilers.ts`, `src/core/shapers.ts`, `src/core/types.ts` (if a non-empty constraint is expressible), tests.

- [ ] TDD + fix `oneOf`: `compileGuard`/`compileParser` for `mode:'oneOf'` must accept iff **exactly one** variant matches (not first-match). Add tests: value matching 2 variants → guard false for oneOf, true for anyOf.
- [ ] TDD + fix `rawShape` generator: instead of `undefined`, emit a deterministic JSON-valid placeholder (e.g. `null` or a seeded primitive) so `generate()` of a required `rawShape` slot satisfies its own (always-true) guard and object `required`. Add `generatorSatisfiesGuard` for a shape containing a required `rawShape`.
- [ ] TDD + fix bounds: in `shapers.ts`, validate at build time (§13 programmer error → throw Error) that `min <= max` and bounds are finite for string/number/array shapes; that `literalShape`/`unionShape`/`oneOfShape` get ≥1 value/variant (throw in the builder, not deferred to the generator). Then delete the now-unreachable empty-literal/empty-union throw branches in `compileGenerator` (dead code). Add tests asserting the builder throws on `min>max`, non-finite bound, empty literal/union.
- [ ] `generatorSatisfiesGuard` over all shape kinds incl. nested/optional/nullable/union/array(min=max) — fix any generator arm whose output fails its guard (e.g. string length must count any prefix so `min` is honored).
- [ ] Gate: full suite green. Commit (may split into B4a oneOf, B4b raw/bounds if large — keep each independently green+committed).

### Task B5: Recursion / cycle safety (guards never throw — §13)

**Files:** `src/core/validators.ts` (`isJsonValue`, `isJsonObject`, `isJsonSchema`), `src/core/compilers.ts` (compile-time recursion over shape trees), tests.

- [ ] TDD: cyclic array/object into `isJsonValue`/`isJsonObject`/`isJsonSchema` must return `false` (or terminate), never throw `RangeError`; a self-referential `ContractShape` into the compilers must not infinitely recurse (cap depth or visited-set; document the limit). Use `makeCyclic()`.
- [ ] Fix: add a visited-set or depth cap in the recursive guards (return `false` past limit / on cycle). Remove the redundant trailing `Object.values`→`isJsonValue` re-sweep in `isJsonSchema` (or scope to unrecognized keys only) to halve recursion (audit I6/§5).
- [ ] Gate: full suite green; confirm `validators.test.ts` still green. Commit.

---

## PHASE C — Conventions & dedup

### Task C1: Relocate misplaced helpers; remove disguised-assertion helpers

**Files:** `src/core/validators.ts`, `src/core/helpers.ts`, `src/core/types.ts`, tests, `guides/validators.md` (bidirectional driver).

- [ ] Move `enumerableSymbolCount` and `isConstructor` from `validators.ts` to `helpers.ts` (§5/§4.3 — they are `{verb}{Noun}` utilities, not `is*` type-guard family). Update internal call sites. They remain public via barrel; update `guides/validators.md` if it documented them under guards → move to the right section so SOURCE→DOC + DOC→SOURCE stay green (the `tests/guides/validators.test.ts` SOURCES is `validators` only — if these move out of validators.ts they must NOT be documented in validators.md anymore; document them where appropriate, e.g. a helpers note in contracts.md or a brief validators.md callout that points to helpers — pick the option that keeps both guide drivers green; verify the contracts driver SOURCES includes `helpers`).
- [ ] Replace the no-op `asserts`-helper type-laundering in `pickOf`/`omitOf` (audit I4) with correctly-typed accumulation (build `Record<K, Guard<unknown>>` honestly) or a single localized, commented narrowing — no fake `asserts`. No `as`.
- [ ] Gate: full suite + guides project green. Commit.

### Task C2: §15 TSDoc completeness on all public exports

**Files:** `src/core/validators.ts` (compositors `arrayOf`…`nullableOf`, json-schema sub-guards), `src/core/parsers.ts`, `src/core/compilers.ts`, `src/core/helpers.ts`, `src/core/shapers.ts`.

- [ ] Add full TSDoc (description, `@param`, `@returns`, `@example`) to every public export currently lacking it: the entire guard-compositor family, `isJsonSchemaArray`/`isJsonSchemaMapValue`/`isJsonSchemaStringArrayMapValue`, `matchesShape`/`parseShape`, any compiler/shaper export with only a one-liner. Examples must compile against real signatures. WHY-not-WHAT per §15.
- [ ] Gate: core typecheck/oxlint; `test:src:core` green (no behavior change). Commit (may split per file).

### Task C3: Dedup & behavior-preserving simplification

**Files:** `src/core/compilers.ts`, `src/core/parsers.ts`, `src/core/helpers.ts`.

- [ ] Extract the triplicated `additionalProperties → ContractShape` discriminator (compileSchema/Guard/Parser) into one helper (in `helpers.ts`, `{verb}{Noun}` e.g. `resolveAdditional` / a guard `isShapeAdditional`). Replace all 3 copies.
- [ ] Collapse the union index-loops in `compileParser`/`compileGenerator` to `for...of` over the dense `.map`-built arrays (removes the provably-impossible `undefined` branches → also removes a soundness lie).
- [ ] `parseArray` no-guard branch → `[...value]` (drop manual push loop). Decide & document (code comment now; guide in G) the alias-vs-copy policy consistently across `parseArray`/`parseRecord`/`coerceRecord`.
- [ ] Optionally drop the redundant same-type first overloads on primitive guards ONLY if zero behavior/type change and tests stay green (low-risk; skip if any test or `Infer` depends on them).
- [ ] Gate: full suite green; behavior unchanged (diff review). Commit.

---

## PHASE D — Shaper completeness

For EACH new shaper, one task delivering: type in `types.ts`, builder in `shapers.ts`, `Infer` support, all four compiler arms (`compileSchema`/`compileGuard`/`compileParser`/`compileGenerator`) in `compilers.ts`, tests (structure + symmetry + generator∘guard via the B1 helpers), and a guide Surface/Pattern entry (Phase G consolidates docs, but the bidirectional driver requires the guide to document any new backticked builder in the SAME task — so add the Surface row + a `## Patterns` snippet now and refine prose in G).

### Task D1: `tupleShape(...shapes)` → `prefixItems`
- [ ] `TupleShape` type (`readonly ContractShape[]`); `Infer` → readonly tuple of inner infers; `compileSchema` → `{type:'array', prefixItems:[...], items:false}` (closed) ; `compileGuard` → array + exact length + per-index guard; `compileParser` → per-index parse, fail→undefined; `compileGenerator` → tuple of generated; tests incl. wrong-length/empty-tuple; doc Surface+pattern. Mirror `tupleOf`. Gate green. Commit.

### Task D2: `intersectionShape(...shapes)` → `allOf`
- [ ] `IntersectionShape`; `Infer` → intersection of inners; schema `{allOf:[...]}`; guard = every inner guard; parser = parse through (object-merge semantics: define + document — e.g. all must be object shapes; or generic "all guards pass, value returned"); generator = pick a strategy that satisfies all (document constraint, e.g. require object shapes and deep-merge generated). Tests + doc. Mirror `intersectionOf`. Gate. Commit.

### Task D3: `lazyShape(() => ContractShape)` → recursive/`$ref`
- [ ] `LazyShape` (thunk); `Infer` (recursive — use an interface indirection if needed to avoid TS infinite-instantiation); compilers must memoize the resolved inner per-compile and be cycle-safe (ties to B5 depth guard); schema → emit `$ref` into `$defs` (define a deterministic `$defs` naming + a `$ref` resolution story consistent with Phase E's resolver); tests incl. a recursive tree shape; doc. Mirror `lazyOf`. Gate. Commit. (If `$defs` emission is complex, scope D3 to guard/parser/generator + a documented schema limitation, and complete schema-`$ref` emission in Phase E where the resolver lives — note the seam.)

### Task D4: `constShape(value)` + `defaultShape(inner, value)` → `const`/`default`
- [ ] `ConstShape` (single JSON value) → schema `{const:v}`, guard `Object.is`-equality (align with `literalOf` semantics — pick one equality, document), parser exact, generator returns `v`. `DefaultShape` wraps an inner shape + default → schema `{...inner, default:v}`, guard = inner (default is advisory), parser: if input `undefined` → `default` else parse inner, generator → inner generator (or default). `Infer`: const → literal type; default → inner infer. Tests + doc. Gate. Commit.

---

## PHASE E — Inverse "from JSON Schema" subsystem

New module(s) under `src/core/` (e.g. `src/core/schema.ts`), types in `types.ts`, barrel via `index.ts`. Bidirectional with the forward pipeline. Each task independently green+committed; doc work staged here (final prose in G) but a new guide may be needed (see E5).

### Task E1: `$ref`/`$defs` resolver
- [ ] `resolveSchema(schema, root?): JsonSchemaDefinition` — resolves internal `#/$defs/...` / `#/...` JSON pointers against the document root; detects cycles (return a lazy indirection, not infinite recursion); rejects/echoes external refs (document: external `$ref` unsupported → treated as `unknown`/throw at boundary per §13 — pick + document). Pure, total, no `as`. Full TSDoc. Comprehensive tests incl. nested `$defs`, recursive `$ref`, missing pointer (→ programmer error throw, or unknown — decide+document), JSON-pointer escaping (`~0`/`~1`). Gate. Commit.

### Task E2: `compileSchemaGuard(schema): Guard<unknown>`
- [ ] JSON Schema → runtime guard. Cover: `type` (single + array), `enum`, `const`, string `minLength`/`maxLength`/`pattern`/`format` (format = best-effort, documented set: date-time/email/uuid/uri or "format is advisory unless known"), number `minimum`/`maximum`/`exclusive*`/`multipleOf`/integer, array `items`/`prefixItems`/`minItems`/`maxItems`/`uniqueItems`, object `properties`/`required`/`additionalProperties`/`patternProperties`/`propertyNames`/`min`/`maxProperties`, composition `allOf`/`anyOf`/`oneOf`(exactly-one)/`not`, `if`/`then`/`else`, boolean schemas (`true`/`false`), `$ref` via E1. Guard never throws (§13). Cycle-safe. Reuse `validators.ts` primitives. Full TSDoc + comprehensive edge tests (incl. adversarial/cyclic schema, prototype keys in instance). Gate. Commit (split by keyword-group if large: E2a primitives/enum/const, E2b composition/if-then-else, E2c object/array/$ref — each green).

### Task E3: `compileSchemaShape(schema): ContractShape`
- [ ] JSON Schema → `ContractShape` (so it flows back into the forward pipeline → guard/parser/generator/schema round-trip). Map each keyword to the shaper algebra (incl. the new D shapers: composition→union/intersection, recursive `$ref`→`lazyShape`, `const`→`constShape`, tuple→`tupleShape`). Document round-trip fidelity limits (what doesn't round-trip exactly). Tests: `compileSchema(compileSchemaShape(s))` structural-equivalence for a representative dialect subset; `compileSchemaShape` then `compileGuard` agrees with `compileSchemaGuard`. Gate. Commit.

### Task E4: `compileSchemaParser(schema): (v: unknown) => unknown | undefined`
- [ ] Either derive from `compileSchemaShape`→`compileParser`, or implement directly; must satisfy parse↔guard symmetry vs `compileSchemaGuard` (reuse `assertParseGuardSymmetry`-style invariant for schema inputs). Prototype-pollution-safe object building (Phase B policy). Full TSDoc + tests. Gate. Commit.

### Task E5: Barrel + guide for the from-schema surface
- [ ] Ensure `index.ts` exports the new surface. Decide doc home: a NEW `guides/schema.md` (skeleton-compliant) + `tests/guides/schema.test.ts` bidirectional driver + README pointer/maps/bijection — OR fold into `contracts.md`. Given the subsystem size, prefer a dedicated `guides/schema.md` (+ driver + README registration, mirroring how contracts/parsers/validators were wired; keep `tests/guides/README.test.ts` bijection clean). This task wires the driver + skeleton; rich prose in Phase G. Gate: guides project green (new driver passes both directions). Commit.

---

## PHASE F — Comprehensive & edge-case tests

### Task F1: Zero-coverage exports
- [ ] Add behavioral tests for `coerceNumber` (incl. the `coerceNumber(NaN)` real behavior — see G doc fix), `coerceRecord`, `createRandom` (determinism: same seed→identical N-sequence; different seed differs; seed `0`/negative/float/`2**32`; range `[0,1)`), `compileContract` (schema==compileSchema; is/parse/generate consistency; generate differs across random). Place shared bits in `_helpers.ts`. Gate. Commit.

### Task F2: Edge-case backlog sweep
- [ ] Implement the prioritized edge backlog from the test audit per module: numeric-string traps (`'0x1F'`,`'1e3'`,`'Infinity'`,`'  42  '`,`MAX_SAFE_INTEGER+1`), `parseBoolean` case/trim, `parseString` Unicode/NBSP, `parseArray` sparse/alias, `parseJson` duplicate-keys/`'undefined'` ambiguity, `literalOf` `Object.is` (`NaN`,`-0`), `keyOf('__proto__')`, empty-collection vacuous-true (`arrayOf`/`setOf`/`mapOf`/`tupleOf`/`unionOf()`/`intersectionOf()`), `transformOf` curried branch, `isFiniteNumber` `-Infinity`/`-0`, the json-schema sub-guards directly, `nullableOf(undefined)`. Fix any real bug a new test exposes (with its own commit) or document intended behavior. Gate. Commit (may split per module).

### Task F3: Invariant sweeps across the whole surface
- [ ] Run `assertParseGuardSymmetry` + `generatorSatisfiesGuard` across a representative matrix of ALL shape kinds (incl. new D shapers and composed/nested/optional/nullable). `assertNoPrototypePollution` across every object-building parser + the from-schema parser. Cyclic-input safety across every recursive guard + compiler + the from-schema resolver. These become permanent regression guards. Gate. Commit.

---

## PHASE G — Guides & README reconciliation

### Task G1: `guides/parsers.md`
- [ ] Reconcile to final code: remove parseEnv/parsePositiveInt/parseStringFields; fix `coerceNumber(NaN)` (returns `NaN` not `undefined`) and the `parsers.ts` JSDoc too if not already; add the alias-vs-copy matrix; add parse↔guard asymmetry note (now resolved → state the actual contract). Keep skeleton; both driver directions green. Gate. Commit.

### Task G2: `guides/contracts.md`
- [ ] Reconcile: `compile*` is the entry layer (no `create*`/factories); document the new D shapers; `oneOf` exclusivity now enforced; `generate` invariant scope (deterministic; in-order PRNG consumption; satisfies `is` — note any documented exception); empty literal/union throws at build (§13); remove Tool framing. Skeleton + bidirectional driver green. Gate. Commit.

### Task G3: `guides/validators.md`
- [ ] Reconcile: helper relocation (enumerableSymbolCount/isConstructor moved — adjust documentation home so SOURCE↔DOC stays green); `isJsonSchema` depth/cycle behavior + the removed redundant sweep; full-TSDoc-backed accuracy. Skeleton + driver green. Gate. Commit.

### Task G4: `guides/schema.md` (from-schema) + DRY + README
- [ ] Write the full `guides/schema.md` prose (Surface/Contract/Patterns/Tests/See also) for the from-JSON-Schema subsystem; ensure its bidirectional driver passes. DRY the triplicated "guards vs parsers vs contracts" explainer to one canonical copy (in parsers.md) + one-line cross-links from the others. Make `## See also` symmetric across contracts/parsers/validators/schema (+README). Update `guides/README.md`: remove `factories.ts`; add `src/core/schema.ts` (By-directory) + the schema concept (By-concept) + `schema.md` guide-table row + pointer link; fix the `compilers.ts` one-liner. Keep `tests/guides/README.test.ts` fully green (skeleton/pointer/bijection/cross-ref). Gate: guides project green. Commit.

---

## PHASE H — Final full gate

### Task H1: Whole-repo verification
- [ ] Run, report evidence: `npm run check` (0/0 + vue-tsc clean); `npm run build:src` (emits `dist/src/core/index.{js,d.ts}`); `npm run test:src:core`; `npm run test:src:browser` (regression-clean); `npx vitest run --config vite.config.ts --project guides` (0 failed); `npm test` (whole suite); foreign-leakage grep `grep -rnE '@scsr|@elements/browser|JsonRpc|Ollama|ToolDefinition|parseEnv|createContract' src/core/` (empty); `git status --short` clean. BLOCKED with diagnosis if anything fails. No code changes.

---

## Self-Review

**Scope coverage vs the four audits + user decisions:** prototype-pollution (B2), parse↔guard (B3), oneOf/rawShape/bounds/empty (B4), recursion/cycle (B5), §15 TSDoc (C2), helper placement/asserts (C1), dedup/simplify (C3), trims+consolidation (A1–A3, incl. Tool* removal per the user's reversal), shaper completeness ×5 (D1–D4), full from-JSON-Schema subsystem incl. `$ref`/composition (E1–E5), zero-coverage + edge backlog + invariant sweeps + factories handled (F1–F3; factories.ts deleted in A3 so no factories.test needed), doc/README reconciliation incl. DRY + new guide + bijection (G1–G4), final gate (H1). All audit "must-fix" + all four user scope decisions map to a task.

**Placeholder scan:** new public APIs have signatures specified; ambiguous design points (intersection merge semantics, lazy `$ref` `$defs` emission, format-assertion set, external `$ref`, alias-vs-copy policy, equality for const/literal) are explicitly called out as "decide + document in the task" rather than left silent — these are deliberate, bounded decisions delegated to the implementing subagent WITH the requirement to document, not vague TODOs. Each task has concrete files + gates + commit.

**Consistency:** every export added/removed pairs with the matching guide change in the same task to keep the bidirectional drivers green; phase ordering (trim → harden → convention → extend → test → doc → gate) prevents rework; B1 ships the invariant helpers before B2–B5/D/E/F consume them; E depends on D's new shapers and B5's cycle policy (noted in E1/E3).
