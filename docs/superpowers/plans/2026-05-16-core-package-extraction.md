# Core Package Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the dumped contract/parser/validator slice out of `src/browser/` into a new node-environment `@elements/core` package, conventions-cleaned and foreign-domain stripped, with three skeleton-compliant guides.

**Architecture:** A new `src/core/` package (sole barrel `index.ts`, source-of-truth `types.ts`) holds `compilers/factories/parsers/shapers/validators` + a tight `helpers.ts` (`createRandom` only). `src/browser/{index,types,helpers}.ts` revert to HEAD, with `generateId` unified on the brought-over UUID impl + optional prefix. Tests move to `tests/src/core/` (node `src:core` vitest project, already scaffolded); foreign-domain assertions are stripped. Guides `contracts.md`/`parsers.md`/`validators.md` are rewritten to the enforced skeleton; `src.md` is dropped.

**Tech Stack:** TypeScript (strict, ESM, `.js` import extensions), Vitest (node `src:core` + `guides` projects), Vite lib build, oxlint/oxfmt, vue-tsc typecheck.

**Spec:** `docs/superpowers/specs/2026-05-16-core-package-extraction-design.md`

---

## Conventions for every task

- Run `npm run check` = `oxlint --fix . && vue-tsc --noEmit --project tsconfig.json`.
- Commit at the end of every task. Use `git add <explicit paths>` — NEVER `git add -A`/`.` (the repo has unrelated staged WIP). Do not skip hooks.
- The five source modules' inter-imports are already sibling-relative (`./types.js`, `./compilers.js`, …) and stay valid after a `git mv` into `src/core/`.
- "Foreign-domain" = anything coupled to the source monorepo's concepts: JSON-RPC (`JsonRpc*`, `isJsonRpc*`), Ollama (`isOllama*`), MCP, stream parsers (SSE/NDJSON), prompt/reason/agent/sandbox, choice normalization (`normalizeChoice`). "Generic" = `isString`/`isRecord`/`recordOf`/`arrayOf`/`unionOf`/`isJsonSchema*`, `parseString`/`parseNumber`/`parse*Field`/`coerce*`/`parseJson*`/`parseEnv`, all `*Shape`/`compile*`/`createContract`/`createSchema`/`createRandom`.

---

## Task 1: Scaffold `src/core/` package wiring

**Files:**
- Create: `configs/src/tsconfig.core.json`
- Create: `configs/src/vite.core.config.ts`
- Modify: `tsconfig.json` (`compilerOptions.paths`)
- Modify: `package.json` (`exports`, `scripts`)

- [ ] **Step 1: Create `configs/src/tsconfig.core.json`** (mirrors `tsconfig.browser.json`, node libs, no DOM)

```json
{
	"extends": "../../tsconfig.json",
	"compilerOptions": {
		"lib": ["ESNext"],
		"types": [],
		"noEmit": false,
		"declaration": true,
		"emitDeclarationOnly": true,
		"rootDir": "../../src",
		"outDir": "../../dist/src"
	},
	"include": ["../../src/core/**/*.ts"]
}
```

- [ ] **Step 2: Create `configs/src/vite.core.config.ts`** (the `srcCore` base has no lib build, so add one inline)

```ts
import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { srcCore } from '../../vite.config'

export default defineConfig(
	mergeConfig(srcCore(), {
		build: {
			lib: {
				entry: resolve(import.meta.dirname, '../../src/core/index.ts'),
				formats: ['es'],
				fileName: () => 'index.js',
			},
			outDir: 'dist/src/core',
		},
	}),
)
```

- [ ] **Step 3: Add the path alias in `tsconfig.json`**

In `compilerOptions.paths`, add `"@elements/core"` so the block reads:

```json
"paths": {
	"@elements/core": ["./src/core/index.ts"],
	"@elements/browser": ["./src/browser/index.ts"],
	"@elements/styles": ["./src/styles/index.ts"]
}
```

- [ ] **Step 4: Add the `./core` export + build scripts in `package.json`**

In `exports`, add the `"./core"` block before `"./styles"`:

```json
"./core": {
	"types": "./dist/src/core/index.d.ts",
	"import": "./dist/src/core/index.js",
	"default": "./dist/src/core/index.js"
},
```

In `scripts`, change `build:src` and add `build:src:core`:

```json
"build:src": "npm run build:src:styles && npm run build:src:browser && npm run build:src:core",
"build:src:core": "vite build --config configs/src/vite.core.config.ts && tsc -p configs/src/tsconfig.core.json",
```

(`test:src:core` and `test:src` already exist and already reference `--project src:core` — no change.)

- [ ] **Step 5: Verify wiring typechecks (no core source yet — alias resolves lazily)**

Run: `npm run check`
Expected: PASS (no file references `@elements/core` yet; JSON configs are not typechecked).

- [ ] **Step 6: Commit**

```bash
git add configs/src/tsconfig.core.json configs/src/vite.core.config.ts tsconfig.json package.json
git commit -m "build: scaffold @elements/core package wiring"
```

---

## Task 2: Move source modules + author `types.ts`, `helpers.ts`, `index.ts`

**Files:**
- Move: `src/browser/{compilers,factories,parsers,shapers,validators}.ts` → `src/core/`
- Create: `src/core/types.ts`, `src/core/helpers.ts`, `src/core/index.ts`

- [ ] **Step 1: Move the five source modules**

```bash
mkdir -p src/core
git mv src/browser/compilers.ts src/core/compilers.ts
git mv src/browser/factories.ts src/core/factories.ts
git mv src/browser/parsers.ts  src/core/parsers.ts
git mv src/browser/shapers.ts  src/core/shapers.ts
git mv src/browser/validators.ts src/core/validators.ts
```

- [ ] **Step 2: Author `src/core/types.ts` — kept types only**

Extract the appended block from the working-tree `src/browser/types.ts` (everything after the original line 1674, i.e. `git diff HEAD -- src/browser/types.ts`). Copy into `src/core/types.ts` **only** these symbols (the coherent contract surface + the retained Tool/JSON-Schema families):

- Result infra: `Success`, `Failure`, `Result`
- Guard infra: `Guard`, `GuardType`, `GuardsShape`, `FromGuards`, `OptionalFromGuards`
- JSON value model: `JsonPrimitive`, `JsonArray`, `JsonObject`, `JsonValue`
- JSON Schema family: `JsonSchemaType`, `JsonSchemaMap`, `JsonSchemaStringArrayMap`, `JsonSchemaDefinition`, `JsonSchema`, `JsonSchemaObject`
- Tool family: `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolOptions`
- Contract/shape: `ContractShape`, every `*Shape` interface, `Infer`, `InferObject`, `InferUnion`, `RandomFunction`, `ContractInterface`, every `*ShapeOptions` interface

**Do NOT copy** `JsonRpcRequest`, `JsonRpcErrorData`, `JsonRpcResponse`, `JsonRpcMessage`, or any `DatabaseValue`/`Row`/`Relation`/`TableDefinition`-style foreign type. Preserve `readonly` on all interface properties.

- [ ] **Step 3: Verify no kept type references a stripped type**

Run: `grep -nE 'JsonRpc|DatabaseValue|TableDefinition|\bRow\b|Relation' src/core/types.ts`
Expected: no output. If any line matches, that kept type transitively depends on a foreign type — replace the offending field with its structural type (`JsonValue`/`unknown`) or drop the member; re-run until empty.

- [ ] **Step 4: Author `src/core/helpers.ts` — `createRandom` only**

```ts
import type { RandomFunction } from './types.js'

/**
 * Deterministic Mulberry32 PRNG. Same seed → same `[0, 1)` sequence.
 *
 * @param seed - Unsigned 32-bit seed
 * @returns A pure function yielding the next value in the sequence
 *
 * @example
 * ```ts
 * const random = createRandom(42)
 * random() // 0.xxx — deterministic
 * ```
 */
export function createRandom(seed: number): RandomFunction {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
```

(The five source modules do not import `./helpers.js`; `createRandom` exists for the public API + tests + guide. Nothing else from the foreign 2935-line append is carried.)

- [ ] **Step 5: Strip the unused foreign import in `src/core/factories.ts`**

Delete the line `import type { ToolOptions } from './types.js'` (it is unused in the file body; the `ToolOptions` type itself stays exported from `src/core/types.ts` for future agentic-tool work). Leave the rest of `factories.ts` untouched.

- [ ] **Step 6: Author `src/core/index.ts` — sole barrel**

```ts
export type * from './types.js'
export * from './helpers.js'
export * from './validators.js'
export * from './parsers.js'
export * from './shapers.js'
export * from './compilers.js'
export * from './factories.js'
```

- [ ] **Step 7: Conventions pass on the five moved modules**

In `src/core/parsers.ts`, replace the two `value as readonly T[]` assertions (the `parseArray` body) with guard-narrowing — when `guard === undefined` return a shallow copy `[...value]`; when `value.every(guard)` the array is already `readonly T[]` by control-flow, return `value` typed via a generic helper, never `as`. Sweep all five files: no `any`/`as`/`!`/`@ts-*`/`eslint-disable`; named exports only; tabs; single quotes; no semicolons; `import type` first. Module-scope `{verb}{Noun}` names (`compileSchema`, `parseStringField`) are correct per AGENTS.md §4.3 — do not rename.

- [ ] **Step 8: Typecheck the new package**

Run: `npm run check`
Expected: PASS. (`@elements/core` now resolves; `vue-tsc` typechecks `src/core/**` via the root project.)
If failures reference a stripped foreign symbol used by a moved module, that symbol is foreign-domain too — remove the function and its now-dead imports from the offending core module (it has no place in the generic surface), then re-run.

- [ ] **Step 9: Commit**

```bash
git add src/core tsconfig.json
git commit -m "feat(core): move contract/parser/validator surface into @elements/core"
```

---

## Task 3: Revert `src/browser` + unify `generateId`

**Files:**
- Revert: `src/browser/index.ts`, `src/browser/types.ts`, `src/browser/helpers.ts` (to HEAD)
- Modify: `src/browser/helpers.ts` (generateId carve-out)

- [ ] **Step 1: Revert the three browser files to HEAD**

```bash
git checkout HEAD -- src/browser/index.ts src/browser/types.ts src/browser/helpers.ts
```

This removes the +4 barrel lines, the +621 types append, the +2935 helpers append, AND restores the original `generateId`.

- [ ] **Step 2: Replace the restored original `generateId` with the unified version**

In `src/browser/helpers.ts`, the restored original is:

```ts
export const generateId = (prefix: string): string =>
	`${prefix}-${Math.random().toString(36).slice(2, 9)}`
```

Replace it with the brought-over UUID-v4 implementation, prefix optional, plus its two support functions:

```ts
function randomBytes(count: number): Uint8Array {
	const buffer = new Uint8Array(count)
	globalThis.crypto.getRandomValues(buffer)
	return buffer
}

function formatUuid(bytes: Uint8Array): string {
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function generateId(prefix?: string): string {
	const bytes = randomBytes(16)
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
	const id = formatUuid(bytes)
	return prefix === undefined ? id : `${prefix}-${id}`
}
```

`globalThis.crypto` is always present in browser + chromium test env (no `Math.random` fallback, no ambient `declare` needed — `lib.dom` types it). No `as`/`!`; `tsconfig.json` has no `noUncheckedIndexedAccess`, so `bytes[6]` is `number`.

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Verify existing browser callers still work**

Run: `npm run test:src:browser`
Expected: PASS. Callers `generateId('p')`, `generateId('select-menu')`, `generateId('t').slice(2)` (createPopover/createSelect/createTabs/createTooltip) now receive `${prefix}-${uuid}` and continue to function.

- [ ] **Step 5: Commit**

```bash
git add src/browser/index.ts src/browser/types.ts src/browser/helpers.ts
git commit -m "refactor(browser): revert dump, unify generateId on UUID impl with optional prefix"
```

---

## Task 4: Move + strip tests to `tests/src/core/`

**Files:**
- Move: `tests/src/browser/{compilers,parsers,shapers,validators}.test.ts` → `tests/src/core/`

- [ ] **Step 1: Move the four test files**

```bash
mkdir -p tests/src/core
git mv tests/src/browser/compilers.test.ts  tests/src/core/compilers.test.ts
git mv tests/src/browser/parsers.test.ts    tests/src/core/parsers.test.ts
git mv tests/src/browser/shapers.test.ts    tests/src/core/shapers.test.ts
git mv tests/src/browser/validators.test.ts tests/src/core/validators.test.ts
```

(The `srcCore` vitest project already includes `tests/src/core/**`; `srcBrowser` already excludes it. No config change.)

- [ ] **Step 2: Retarget imports**

In all four moved files, replace every `from '@elements/browser'` with `from '@elements/core'` (both the value-import block and any `import type` line).

- [ ] **Step 3: Strip foreign-domain test references**

These reference dropped foreign helpers (not exported by `@elements/core`). Remove the imports AND their `describe`/`it` blocks entirely:

- `tests/src/core/validators.test.ts`: remove imports `isJsonRpcRequest`, `isJsonRpcResponse`, `isOllamaMessageChunk`; remove `import type { JsonRpcMessage } from '@elements/core'`; delete the `it`/`describe` blocks that use them (the JSON-RPC + Ollama assertions, ≈ lines 666–702) and the "prompt and reason structures" / `isPendingPromptResponse` block (≈ lines 806+).
- `tests/src/core/shapers.test.ts`: delete the `it('normalizes prompt and checkbox strings into named choices', …)` block (≈ lines 21–30) and the `normalizeChoice` import.
- `tests/src/core/parsers.test.ts`: the `['admin', 'member', 'guest'] as const` enum fixtures (≈ lines 430, 460) are **generic** — keep them; they exercise `parseEnum`. (`as const` is a literal-tuple annotation, not a type assertion — allowed.)

Deterministic rule for anything ambiguous: if a referenced symbol is not exported by `src/core/index.ts`, the reference is foreign — delete its block. Keep every assertion whose symbols ARE core exports.

- [ ] **Step 4: Run the core test suite**

Run: `npm run test:src:core`
Expected: PASS, with all four files collected under the `src:core` (node) project and zero unresolved imports.
If a file fails to collect on an unresolved symbol, that symbol is foreign — remove its block (Step 3 rule) and re-run.

- [ ] **Step 5: Confirm browser suite is unaffected**

Run: `npm run test:src:browser`
Expected: PASS (the four files no longer run under `src:browser`; nothing else changed).

- [ ] **Step 6: Commit**

```bash
git add tests/src/core tests/src/browser
git commit -m "test(core): relocate suite to tests/src/core, strip foreign-domain assertions"
```

---

## Task 5: Author the three guide-parity drivers

**Files:**
- Create: `tests/guides/contracts.test.ts`, `tests/guides/parsers.test.ts`, `tests/guides/validators.test.ts`

The `guides` vitest project enforces a clean bijection (`tests/guides/README.test.ts`): every `guides/{name}.md` needs `tests/guides/{name}.test.ts`. Model on `tests/guides/mixins.test.ts` (bidirectional backtick-name parity). Each driver asserts every backticked `name(` / `name`` API in the guide is a real export of the matching `src/core` module.

- [ ] **Step 1: Create `tests/guides/contracts.test.ts`**

```ts
// guides/contracts.md ↔ src/core/{shapers,compilers,factories,helpers}.ts
// Every API documented with a backticked call form resolves to a real export.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const SOURCES = ['shapers', 'compilers', 'factories', 'helpers'] as const
const doc = readGuide('contracts')

function exportedNames(file: string): readonly string[] {
	const src = readFileSync(resolvePath(WORKSPACE_ROOT, `src/core/${file}.ts`), 'utf8')
	const out: string[] = []
	const regex = /^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z][A-Za-z0-9]*)/gm
	let m: RegExpExecArray | null
	while ((m = regex.exec(src)) !== null) if (m[1]) out.push(m[1])
	return out
}

function documentedApis(source: string): readonly string[] {
	const out = new Set<string>()
	const regex = /`([a-z][A-Za-z0-9]*)\(/g
	let m: RegExpExecArray | null
	while ((m = regex.exec(source)) !== null) if (m[1]) out.add(m[1])
	return Array.from(out)
}

const EXPORTS = new Set(SOURCES.flatMap(exportedNames))

describe('contracts — every documented API resolves to a src/core export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/contracts.md but is
		// not exported by any of src/core/{shapers,compilers,factories,helpers}.ts.
		// Fix the doc or restore the export.
		it(`${name}() is a real src/core export`, () => {
			expect(EXPORTS.has(name)).toBe(true)
		})
	}
})
```

- [ ] **Step 2: Create `tests/guides/parsers.test.ts`** — identical to Step 1 with `const SOURCES = ['parsers'] as const` and `readGuide('parsers')`, describe label `parsers`.

- [ ] **Step 3: Create `tests/guides/validators.test.ts`** — identical to Step 1 with `const SOURCES = ['validators'] as const` and `readGuide('validators')`, describe label `validators`.

- [ ] **Step 4: Sanity-run (drivers will fail until guides are rewritten — that is expected)**

Run: `npm run test:guides -- -t contracts`
Expected: the driver collects and runs (failures about old foreign API names are fine here; Task 9 makes them green).

- [ ] **Step 5: Commit**

```bash
git add tests/guides/contracts.test.ts tests/guides/parsers.test.ts tests/guides/validators.test.ts
git commit -m "test(guides): add contracts/parsers/validators parity drivers"
```

---

## Task 6: Rewrite `guides/contracts.md`

**Files:**
- Modify: `guides/contracts.md`

- [ ] **Step 1: Rewrite to the enforced skeleton + this repo's reality**

Required exact shape (enforced by `tests/guides/README.test.ts`):
- Line 1: `# Contracts`
- Line 3: `> ` blockquote one-liner
- Top-level sections, in order: `## Surface`, `## Contract`, `## Patterns`, `## Tests`, `## See also`

Content rules (source the substance from the existing dumped `guides/contracts.md` body, which is accurate for the DSL, but correct all paths/identifiers):
- Replace every `@scsr/core` with `@elements/core`; every `src/core/...` path stays `src/core/...`; package is `elements`.
- `## Surface`: the shape→`schema`/`is`/`parse`/`generate` pipeline; the shaper builders table; `ContractInterface`; `createContract`/`createSchema`; `createRandom`; the JSON Schema + Tool-schema (`compileSchema(objectShape(...))` for tool params) usage.
- `## Contract`: the invariants — every shaper/compiler/factory named here is a real `src/core` export and vice-versa; types live in `src/core/types.ts`; enforced by `tests/guides/contracts.test.ts` + `tests/src/core/{shapers,compilers}.test.ts`.
- `## Patterns`: the Quick-Start example, `additionalProperties` table, `unionShape`/`oneOfShape`, `recordShape`, `rawShape`, `Infer<S>` — all using `@elements/core` imports.
- `## Tests`: link `tests/src/core/compilers.test.ts`, `tests/src/core/shapers.test.ts`, `tests/guides/contracts.test.ts`.
- `## See also`: relative links to `parsers.md`, `validators.md`, `README.md` — every `](relative)` link MUST resolve to a real file (no `signals.md`/`bootstrap.md`/foreign links).

- [ ] **Step 2: Verify links + skeleton**

Run: `npm run test:guides -- -t "contracts.md"`
Expected: the README.test.ts skeleton/blockquote/H1/cross-ref checks for `contracts.md` PASS.

- [ ] **Step 3: Commit**

```bash
git add guides/contracts.md
git commit -m "docs(contracts): rewrite for @elements/core + enforced skeleton"
```

---

## Task 7: Rewrite `guides/parsers.md` (content correction)

**Files:**
- Modify: `guides/parsers.md`

- [ ] **Step 1: Rewrite — document the flat value parsers that actually shipped**

The dumped `guides/parsers.md` documents foreign **SSE/NDJSON stream parsers that did not arrive**. Discard that subject. Document the actual `src/core/parsers.ts` flat parsers instead. Skeleton (enforced):
- Line 1: `# Parsers`; Line 3: `> ` blockquote (e.g. "Standalone value, field, and format parsers for `unknown` → typed extraction.")
- `## Surface`: primitive parsers (`parseString`, `parseNumber`, `parseInteger`, `parseBoolean`, `parseRecord`, `parseArray`, `parseEnum`), field parsers (`parse*Field`), utility parsers (`parseJson`, `parseJsonAs`, `coerceString`, `coerceNumber`, `coerceRecord`, `parseStringFields`, `parsePositiveInt`, `parseEnv`) — derive the exact list by reading `src/core/parsers.ts` exports so the parity driver passes.
- `## Contract`: every parser named here is a real `src/core/parsers.ts` export and vice-versa; enforced by `tests/guides/parsers.test.ts` + `tests/src/core/parsers.test.ts`.
- `## Patterns`: realistic `@elements/core` import examples for primitive vs field vs coercion vs `parseEnv`.
- `## Tests`: link `tests/src/core/parsers.test.ts`, `tests/guides/parsers.test.ts`.
- `## See also`: resolving relative links to `contracts.md`, `validators.md`, `README.md`.

No SSE/NDJSON/Ollama content anywhere.

- [ ] **Step 2: Verify**

Run: `npm run test:guides -- -t "parsers.md"`
Expected: README.test.ts checks for `parsers.md` PASS.

- [ ] **Step 3: Commit**

```bash
git add guides/parsers.md
git commit -m "docs(parsers): rewrite to document src/core/parsers.ts flat parsers"
```

---

## Task 8: Rewrite `guides/validators.md`

**Files:**
- Create/Modify: `guides/validators.md` (the dump had no `validators.md`; create it)

- [ ] **Step 1: Author `guides/validators.md`**

Skeleton (enforced):
- Line 1: `# Validators`; Line 3: `> ` blockquote (e.g. "General-purpose runtime type guards and guard compositors.")
- `## Surface`: primitive guards (`isString`, `isNumber`, `isBoolean`, `isRecord`, `isArray`, `isJsonValue`, `isJsonSchema`, `isJsonSchemaObject`, …) and compositors (`recordOf`, `arrayOf`, `unionOf`, `intersectionOf`, `literalOf`, optionality/emptiness guards) — derive the exact names by reading `src/core/validators.ts` exports so the parity driver passes. No `isJsonRpc*`/`isOllama*`/`isPendingPrompt*` (those were dropped).
- `## Contract`: every guard named here is a real `src/core/validators.ts` export and vice-versa; `Guard<T>` + compositor types live in `src/core/types.ts`; enforced by `tests/guides/validators.test.ts` + `tests/src/core/validators.test.ts`.
- `## Patterns`: `@elements/core` examples — a primitive guard narrowing `unknown`, a `recordOf`/`arrayOf` composition, guard-driven parsing.
- `## Tests`: link `tests/src/core/validators.test.ts`, `tests/guides/validators.test.ts`.
- `## See also`: resolving relative links to `contracts.md`, `parsers.md`, `README.md`.

- [ ] **Step 2: Verify**

Run: `npm run test:guides -- -t "validators.md"`
Expected: README.test.ts checks for `validators.md` PASS.

- [ ] **Step 3: Commit**

```bash
git add guides/validators.md
git commit -m "docs(validators): add guide for src/core/validators.ts"
```

---

## Task 9: Drop `src.md`, update the pointer file, full guides gate

**Files:**
- Delete: `guides/src.md`
- Modify: `guides/README.md`

- [ ] **Step 1: Delete the foreign overview guide**

```bash
git rm guides/src.md
```

(No `tests/guides/src.test.ts` exists, so the bijection stays clean.)

- [ ] **Step 2: Add the three guides to `guides/README.md`**

`tests/guides/README.test.ts` requires the pointer file to link every guide. Add to `guides/README.md`:
- A new "By concept" subsection (e.g. **### Core — contract / parser / validator surface**) with a role→file table linking `guides/contracts.md`, `guides/parsers.md`, `guides/validators.md`, `src/core/*`, and `tests/src/core/*` / `tests/guides/*`.
- A new "By directory" subsection for `src/core/` (one row per module) and a `tests/src/core/` row in the `tests/` section.
- Entries in the `### guides/ — documentation` table for `contracts.md`, `parsers.md`, `validators.md`.

Every relative link must resolve to a real file.

- [ ] **Step 3: Full guides gate**

Run: `npm run test:guides`
Expected: PASS — H1/blockquote uniformity, spec-guide skeleton for all three new guides, pointer-file coverage, the clean test↔guide bijection, all cross-reference links resolve, and the three new parity drivers (every documented API resolves to a `src/core` export).
On failure, the failing assertion names the exact file + missing section/link/symbol — fix that file and re-run.

- [ ] **Step 4: Commit**

```bash
git add guides/README.md guides/src.md
git commit -m "docs(guides): drop foreign src.md, wire core guides into the pointer file"
```

---

## Task 10: Final full-gate verification

**Files:** none (verification only)

- [ ] **Step 1: Lint + typecheck + format**

Run: `npm run check && npm run format`
Expected: PASS; `git status` shows no unexpected formatter churn outside touched files.

- [ ] **Step 2: Build all source targets (incl. new core lib + d.ts)**

Run: `npm run build:src`
Expected: PASS; `dist/src/core/index.js` and `dist/src/core/index.d.ts` are emitted.

- [ ] **Step 3: All affected test projects**

Run: `npm run test:src:core && npm run test:src:browser && npm run test:guides`
Expected: all PASS.

- [ ] **Step 4: Confirm no foreign leakage in core**

Run: `grep -rnE '@scsr|@elements/browser|@elements/styles|JsonRpc|Ollama|\bSSE\b|NDJSON' src/core/`
Expected: no output.

- [ ] **Step 5: Final commit (if Steps 1–2 produced formatting changes)**

```bash
git add -- src/core tests/src/core guides
git commit -m "chore(core): final formatting + gate pass"
```

(If nothing changed, skip — do not create an empty commit.)

---

## Self-Review

**Spec coverage:**
- §3 architecture (src/core layout, dep graph) → Tasks 1–2.
- §4 package wiring (alias, exports, configs, scripts) → Task 1.
- §5.1 source move → Task 2 Step 1. §5.2 types keep/strip → Task 2 Steps 2–3. §5.3 helpers closure → Task 2 Step 4. §5.4 browser revert + generateId → Task 3.
- §6 cleanup conventions + dead `ToolOptions` import → Task 2 Steps 5,7.
- §7 tests move + strip foreign + no factories.test → Task 4.
- §8 guides (contracts/parsers/validators rewrite, parsers content-correction, drop src.md, bijection drivers, README pointer) → Tasks 5–9.
- §9 quality gates → Task 10. §10 risks (kept-type closure check, surgical generateId) → Task 2 Step 3, Task 3 Step 2.

**Placeholder scan:** Authored artifacts (wiring configs, `core/helpers.ts`, `core/index.ts`, `generateId`, the three parity drivers) are given verbatim. Relocation/strip steps give exact ops + deterministic rules + concrete line anchors. Guide rewrites specify exact skeleton, substitutions, per-section content, and link constraints — acceptance is the `guides` project passing. No "TBD"/"handle edge cases"/"similar to Task N".

**Type consistency:** `RandomFunction` (core/types.ts) ↔ `createRandom` return (core/helpers.ts) ↔ documented in contracts.md ↔ asserted by contracts driver. `generateId(prefix?: string)` signature consistent across Task 3 and its browser callers. Barrel order in `core/index.ts` respects the dep graph (types→helpers→validators→parsers→compilers→factories).
