# Core Package Extraction — Contract / Parser / Validator Surface

> Relocate the dumped `@scsr/core` slice (contract DSL, flat parsers, type guards) out of `src/browser/` into a new node-environment `@elements/core` package, conventions-cleaned and foreign-domain stripped, with three skeleton-compliant guides.

---

## 1. Background

A slice of a foreign `@scsr/core` monorepo was dumped into this repo:

- New files in `src/browser/`: `compilers.ts`, `factories.ts`, `parsers.ts`, `shapers.ts`, `validators.ts`.
- `src/browser/types.ts` grew **+621 lines**; `src/browser/helpers.ts` grew **+2935 lines**; `src/browser/index.ts` gained 4 `export *` lines.
- New tests in `tests/src/browser/`: `compilers/parsers/shapers/validators.test.ts`.
- New guides: `guides/src.md`, `guides/parsers.md`, `guides/contracts.md` (they document the foreign monorepo, not this repo).

The coherent in-scope domain is a **shape-driven contract system** (`shapers → compilers → factories`) plus standalone **flat value parsers** (`parsers.ts`) and **type guards/compositors** (`validators.ts`), backed by a Mulberry32 PRNG (`createRandom`). Everything else that rode along (SQL, relations, agents, JSON-RPC, workflow, stream parsers) is foreign noise.

`src/browser/` is a CSS-mirror API with strict TS↔SCSS parity tests; this generic node infrastructure does not belong there and does not need a browser. The repo already scaffolds the destination: `vite.config.ts` defines a `srcCore` project (node, `tests/src/core/**`), `srcBrowser` *excludes* `tests/src/core/**`, and `test:src:core` / `build:src` scripts exist.

## 2. Authoritative decisions

From the brainstorming Q&A and follow-up refinements (these override conflicting defaults):

1. **Placement.** All in-scope source + tests move to a new `src/core/` package and `tests/src/core/` (node env), not `browser`. This also resolves the `factories.ts` vs `factories/` collision (browser keeps its `factories/`; core owns `factories.ts`).
2. **Guides.** Final guide set is `contracts.md` + `parsers.md` + `validators.md`. `src.md` is dropped.
3. **Cleanup depth.** Conventions + structural refactor per AGENTS.md, behavior-preserving.
4. **Test fixtures.** Strip foreign-domain tests; keep generic primitive/edge-case coverage.
5. **Refinement — types.** Keep the **JSON Schema family** and the **Tool family** in `core/types.ts` (needed later to `compileSchema`/`parse` for an agentic tool). Strip `JsonRpc*` (foreign MCP transport — not JSON Schema) and DB/Row/Relation foreign types.
6. **Refinement — `generateId`.** Adopt the brought-over UUID-v4 implementation but make the prefix **optional** so existing browser callers (`generateId('p')`, etc.) keep working.

## 3. Target architecture

New node package `src/core/`:

```
src/core/
  index.ts       # sole barrel — export type * from types.js; export * from each value module
  types.ts       # SOURCE OF TRUTH — contract/shape/parser/guard + JSON Schema + Tool types
  validators.ts  # isString, isRecord, isJsonSchema, recordOf, arrayOf, unionOf, …
  parsers.ts     # parseString/Number/Integer/Boolean/Enum, *Field, coerce*, parseJson*, parseEnv
  shapers.ts     # stringShape, numberShape, …, objectShape, unionShape, rawShape
  compilers.ts   # compileSchema/Guard/Parser/Generator/Contract
  factories.ts   # createContract, createSchema
  helpers.ts     # createRandom + only the closure utilities actually referenced
```

Dependency order (matches observed imports; acyclic): `types ← validators ← parsers ← compilers ← factories`; `shapers → types`; `compilers → helpers (createRandom)`.

Core has **zero** references to `@scsr`, `@elements/browser`, `@elements/styles`, or DOM globals.

## 4. Package wiring (first-class, "as if always meant to be there")

- `tsconfig.json`: add path alias `"@elements/core": ["./src/core/index.ts"]`.
- `package.json` `exports`: add a `"./core"` subpath mirroring `"./browser"` (dist d.ts + import + default).
- `package.json` `scripts`: add `build:src:core` mirroring `build:src:browser`; include it in `build:src`.
- `configs/src/tsconfig.core.json` + `configs/src/vite.core.config.ts`: mirror the browser equivalents (node target, `src/core/**`).
- `vite.config.ts`: the `srcCore` project already exists and already scopes `tests/src/core/**`; `srcBrowser` already excludes it. No vitest-project change needed beyond confirming the build config wires in.

## 5. What moves, what is stripped

### 5.1 Source modules

`compilers.ts`, `factories.ts`, `parsers.ts`, `shapers.ts`, `validators.ts` move verbatim into `src/core/` (their inter-module imports are already sibling-relative `./x.js`, so they stay valid). Then cleaned per §6.

### 5.2 `core/types.ts` — keep / strip list

**Keep** (the coherent contract surface + explicit refinement):

- Result infra: `Success`, `Failure`, `Result`.
- Guard infra: `Guard`, `GuardType`, `GuardsShape`, `FromGuards`, `OptionalFromGuards`.
- JSON value model: `JsonPrimitive`, `JsonArray`, `JsonObject`, `JsonValue`.
- **JSON Schema family**: `JsonSchemaType`, `JsonSchemaMap`, `JsonSchemaStringArrayMap`, `JsonSchemaDefinition`, `JsonSchema`, `JsonSchemaObject`.
- **Tool family**: `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolOptions`.
- Contract/shape: `ContractShape`, all `*Shape`, `Infer`, `InferObject`, `InferUnion`, `RandomFunction`, `ContractInterface`, all `*ShapeOptions`.

**Strip** (foreign, not JSON Schema): `JsonRpcRequest`, `JsonRpcErrorData`, `JsonRpcResponse`, `JsonRpcMessage`, and any DB/Row/Relation/TableDefinition foreign types. The plan must verify the kept-type closure has **no dangling references** to stripped types.

### 5.3 `core/helpers.ts` — tight transitive closure

Carry only helpers the in-scope code actually references (e.g. `createRandom`, plus any pure util in its closure such as `deepFreeze`/`escapeRegex` *iff* compilers/shapers/parsers use them). The ~2900 foreign helper lines (SQL, relations, agents, JSON-RPC, workflow) are dropped. The plan derives the exact set by following imports from the five source modules.

### 5.4 Browser revert + `generateId` carve-out

- Revert `src/browser/index.ts` to HEAD (drop the 4 `export *` lines).
- Revert `src/browser/types.ts` to HEAD (drop the +621 append).
- Revert `src/browser/helpers.ts` to HEAD (drop the +2935 append **and** the deletion of the original `generateId`), then apply **one** targeted change:

```ts
export function generateId(prefix?: string): string {
	const bytes = randomBytes(16)
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
	const id = formatUuid(bytes)
	return prefix === undefined ? id : `${prefix}-${id}`
}
```

`randomBytes(count)` and `formatUuid(bytes)` are carried into `src/browser/helpers.ts` as the only support utilities for this (browser-only — core does not use `generateId`). Existing callers (`generateId('p')`, `generateId('select-menu')`, `generateId('t').slice(2)`, …) keep working: prefix path returns `${prefix}-${uuid}`. Must compile under `strict` with no `as`/`!`/`any` (no `noUncheckedIndexedAccess` in tsconfig, so `bytes[6]` is `number`).

## 6. Code cleanup (conventions + structural refactor)

Applied to every `src/core/*` file, behavior-preserving:

- Remove `any` / `as` / `!` / `@ts-*` / `eslint-disable`. Known site: `parsers.ts` `value as readonly T[]` → narrow via the element guard instead of asserting.
- Named exports only; no default exports. Tabs; single quotes; no semicolons (except ASI). `.js` ESM import extensions. `import type` first, then value imports, no blank lines between same-kind imports.
- All interfaces/aliases live in `core/types.ts`; implementation files contain only implementation. `readonly` on interface props and public return types.
- §4 naming: module-scope helpers/factories keep `{verb}{Noun}` (`compileSchema`, `parseStringField`, `createContract`) — correct per §4.3, not violations. Entity-member single-word rule applies to interface members (`ContractInterface.schema/is/parse/generate`, `*ShapeOptions.{min,max,pattern,description}` — already compliant; the plan verifies). The parser/shaper families stay independent functions (§4.2.3 / §4.3 sanction this — no forced class promotion).
- Delete dead foreign imports/symbols. `factories.ts` currently imports `ToolOptions` unused — since the Tool family is *kept* (decision 5), the plan either wires `ToolOptions` into a real factory signature for tool-schema creation or removes only the *unused import line* while keeping the type exported from `types.ts`. No symbol is deleted merely to satisfy the linter.

## 7. Tests → `tests/src/core/`

- Move `compilers/parsers/shapers/validators.test.ts` to `tests/src/core/`; retarget imports from `@elements/browser` to `@elements/core`.
- **Strip foreign-domain tests**: drop assertions/fixtures that exercise scsr-only behavior — `JsonRpcMessage` import, agent/MCP/SSE/NDJSON/Ollama scenarios, foreign domain shapes (`role: admin|member|guest` style fixtures used purely as scsr examples). Keep every generic primitive, compositor, coercion, schema-shape, and edge-case assertion. Replace any retained-but-domain-flavored fixture with a neutral one of equal coverage.
- No `factories.test.ts` — `factories.ts` is two slim overloads over `compilers`; covered transitively by the compiler/contract tests (matches the source project's own layout).
- Tests run under the existing node `src:core` vitest project; excluded from `src:browser` automatically.

## 8. Guides

Three spec guides, rewritten to this repo's reality (`src/core/…`, `@elements/core`, package `elements`) and the skeleton enforced by `tests/guides/README.test.ts`:

- Line 1 `# Title`; line 3 `> blockquote`; then `## Surface` → `## Contract` → `## Patterns` → `## Tests` → `## See also`; every relative link resolves.

Guides:

- **`guides/contracts.md`** — shape → schema/guard/parser/generator pipeline (shapers/compilers/factories/`createRandom`), including JSON Schema + Tool-schema usage.
- **`guides/parsers.md`** — *content correction*: the dumped file documents foreign SSE/NDJSON **stream** parsers that did **not** arrive. Rewrite to document the actual **flat value/field parsers** in `src/core/parsers.ts` (`parseString`, `parseNumber`, `parse*Field`, `coerce*`, `parseJson*`, `parseEnv`).
- **`guides/validators.md`** — type guards + compositors in `src/core/validators.ts`.
- **Drop `guides/src.md`** (foreign monorepo overview; no parity surface here).

Parity wiring (bijection enforced with **no exceptions** by `README.test.ts`):

- Create `tests/guides/contracts.test.ts`, `tests/guides/parsers.test.ts`, `tests/guides/validators.test.ts` — doc↔`src/core` export parity drivers (every name documented resolves to a real export and vice-versa). No `src.test.ts` is created (and none exists, so the bijection stays clean).
- `guides/README.md`: add links to all three guides in the pointer prose **and** add their rows to the "By concept" / "By directory" maps so pointer-coverage + cross-ref tests pass.

## 9. Quality gates (all green before done)

- `npm run check` (lint + typecheck) — including no `any`/`as`/`!` in `src/core/**`.
- `npm run format`.
- `build:src` (browser + styles + new core target).
- `test:src:core` (the moved, stripped tests) and `test:guides` (skeleton + bijection + new parity drivers).
- `test:src:browser` unaffected by the revert (in particular `generateId` callers still pass).

## 10. Risks / non-goals

- **Risk:** a kept type transitively references a stripped foreign type. *Mitigation:* the plan computes the kept-type closure and fails fast if a dangling foreign reference remains.
- **Risk:** `helpers.ts` revert is large; the `generateId` carve-out must be surgical. *Mitigation:* revert to HEAD then a single reviewed edit + two support functions only.
- **Non-goal:** implementing the future agentic-tool runtime. We only *retain* the Tool/JSON-Schema types and ensure `compileSchema` can serve them.
- **Non-goal:** porting the foreign stream parsers, DB, relations, agents, MCP, JSON-RPC surfaces.
- **Non-goal:** changing `src/browser`/`src/styles` behavior beyond the `generateId` unification and the clean revert.
