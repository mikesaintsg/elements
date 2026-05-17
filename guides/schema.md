# Schema

> The inverse subsystem — go from a JSON Schema document back to a runtime guard, a `ContractShape`, and an input parser, `$ref`/`$defs`-resolved and recursion-safe. Package: `@elements/core`. Source: [src/core/schema.ts](../src/core/schema.ts).

## Surface

[contracts.md](contracts.md) compiles the **forward** direction — declare a `ContractShape` once and derive a JSON Schema, a guard, a parser, and a generator from it. This module is the **inverse**: hand it a JSON-Schema document and get the same operations back out. It is the bridge that lets an externally-authored schema re-enter the forward pipeline.

The subsystem is one resolver plus three compilers, each built on the resolver:

| Export                  | Input → Output                                       | Role                                                                                                       |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `resolveRef()`          | `JsonSchema`, pointer → `JsonSchemaDefinition \| boolean` | The single-hop RFC-6901 primitive: resolve ONE `$ref`/`$defs` pointer against a document root.          |
| `createRefResolver()`   | `JsonSchema` → `RefResolver`                          | The cycle-safe resolver closure E2–E4 walk a schema with — chain-following + recursive-`$ref` lazy break.   |
| `compileSchemaGuard()`  | `JsonSchema` → `Guard<unknown>`                       | E2 — a runtime predicate accepting exactly the values the schema describes (the inverse of `compileGuard`). |
| `compileSchemaShape()`  | `JsonSchema` → `ContractShape`                        | E3 — map the schema back to a `ContractShape` so the forward pipeline (`compileContract`, `Infer`) accepts it. |
| `compileSchemaParser()` | `JsonSchema` → `(value: unknown) => unknown \| undefined` | E4 — an input parser/coercer, *derived* as `compileParser` ∘ `compileSchemaShape`.                       |

### The resolver

`resolveRef(root, pointer)` is the single-hop primitive: it walks one RFC-6901 JSON Pointer (`#`, `#/$defs/Node`, the bare `/a/b`, the whole-document empty form) against `root` and returns the resolved schema node. Per-token unescaping is `~1`→`/` then `~0`→`~` (order is load-bearing — `~01` decodes to the literal `~1`, never `/`); a URI-fragment pointer is percent-decoded first. Both 2020-12 `$defs` and legacy draft-07 `definitions` resolve (the walker descends whatever key the pointer names). It does NOT follow a `$ref` found *at* the resolved target — for that, use the resolver.

`createRefResolver(root)` returns a `RefResolver` bound to one document:

| Member              | Behavior                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `root`               | The `JsonSchema` document every pointer resolves against (the only sanctioned base).                                                 |
| `resolve` (method)   | EAGER: follow a `$ref` chain to a concrete (non-`$ref`) node or boolean. For finite, non-recursive positions.                        |
| `lazy` (method)      | CYCLE-BROKEN: return a `LazyRef` indirection — the JSON-Schema mirror of `lazyShape`'s thunk memoization (see [contracts.md](contracts.md)). |

A `LazyRef` is `{ pointer, cyclic, thunk }`: `pointer` is the E1 canonical pointer, `cyclic` is `true` iff this canonical pointer is already being compiled higher on the stack (the recursive back-edge), and `thunk` is an idempotent, memoized, deferred resolution that resolves by pointer (never by re-entering a body) so it always terminates. A consumer (E2–E4) keeps a `Map<pointer, artifact>`, installs a deferred closure *before* compiling a body, and on a `cyclic: true` hit reuses the in-progress artifact instead of recursing — exactly the D3 `lazyShape` discipline, which makes a recursive `#/$defs/Node` a *recursive* (not infinite) compiled function.

### The three compilers

- `compileSchemaGuard(schema)` — E2. A schema is a **conjunction** of its keywords (every present constraint must hold; an absent keyword imposes nothing). Keyword coverage: `type` (single + array union + `integer`), `enum`, `const`, `minLength`/`maxLength`, `pattern`, `format`, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, `multipleOf`, `items`/`prefixItems`/`minItems`/`maxItems`/`uniqueItems`, `properties`/`required`/`additionalProperties`/`patternProperties`/`propertyNames`/`minProperties`/`maxProperties`/`dependentRequired`, `allOf`/`anyOf`/`oneOf` (exactly-one)/`not`, `if`/`then`/`else`, boolean schemas, and `$ref`/`$defs` (recursion-safe).
- `compileSchemaShape(schema)` — E3. Maps each keyword family to the matching `contracts.md` builder (`{ type: 'string' }` → `stringShape`, `properties` → `objectShape`, `anyOf` → `unionShape`, `$ref` recursion → `lazyShape` memoized by canonical pointer, …). Best-effort and strictly looser where the DSL cannot express a keyword — see the round-trip fidelity contract below.
- `compileSchemaParser(schema)` — E4. **Derived**, not re-implemented: `compileSchemaParser(s) = compileParser(compileSchemaShape(s))`. It inherits the forward `compileParser`'s coercion, its B2 prototype-pollution hardening, its B3 parse↔guard discipline, its D3 lazy memoization, and E3's fidelity contract verbatim.

### Types

`RefResolver` and `LazyRef` are declared first in [src/core/types.ts](../src/core/types.ts); `createRefResolver()` conforms to those types, never the reverse. The inverse subsystem reuses the JSON-Schema type family (`JsonSchema`, `JsonSchemaDefinition`, `JsonSchemaType`) and the `Guard<T>` / `ContractShape` types the forward pipeline already owns.

---

## Contract

These invariants hold across `src/core/{schema,types}.ts` ↔ `schema.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide — `resolveRef`, `createRefResolver`, `compileSchemaGuard`, `compileSchemaShape`, `compileSchemaParser` — is a real `export function` in [src/core/schema.ts](../src/core/schema.ts). A renamed or removed export breaks the parity gate until the doc is reconciled.
2. **SOURCE → DOC.** Every value exported from `src/core/schema.ts` is documented above — the surface is exhaustive, not a sample.
3. **TYPES ARE THE SOURCE OF TRUTH.** `RefResolver`, `LazyRef`, the `JsonSchema` family, `Guard<T>`, and `ContractShape` are declared first in [src/core/types.ts](../src/core/types.ts); the inverse compilers conform to those types, never the reverse.
4. **RFC-6901 RESOLUTION.** `$ref`/`$defs` resolution is pure RFC-6901 pointer-walking: `#`/empty (whole document), `#/...` (URI-fragment, percent-decoded), the bare `/...` form; `~1`→`/` then `~0`→`~` per token; `$defs` and legacy `definitions` both addressable; boolean schemas and a boolean root resolve.
5. **§13 ERROR SPLIT — fail-fast COMPILE vs total RUNTIME.** A supplied schema is a build-time artifact the programmer controls, so a *malformed* one is a programmer error caught at **compile time** with a precise `throw`:
   - an **unresolvable** pointer (missing key / out-of-range index / descent into a non-schema) → `Error` naming the pointer;
   - an **external / non-local** `$ref` (`https://…`, `other.json#/…`) → `external $ref unsupported: <ref>` (unsupported by design — a future external-resolver seam intercepts exactly this branch);
   - a **pure-`$ref`-only cycle** (a `$ref` loop with no concrete body anywhere) → `circular $ref with no concrete schema: <path>`;
   - a `$ref` chain exceeding **`MAX_REF_DEPTH`** (the validators `MAX_JSON_DEPTH` analogue — a backstop for a pathologically long *acyclic* chain) → a precise `Error` naming the chain;
   - for E3/E4 additionally, the `false` boolean schema (no "never" shape in the DSL), and any keyword the forward builders §13-reject (e.g. contradictory bounds, a non-object `allOf` member) — the builder's own precise `Error`, deferred-to, not duplicated.

   The **produced** artifacts, by contrast, never throw on runtime input: the guard returns `false` (every read via a `try`-wrapped get; cyclic / pathologically deep DATA capped) and the parser returns `undefined`. This now holds **through the recursive‑lazy boundary too**: the forward `compileGuard`/`compileParser` `'lazy'` arms thread a per‑compilation ancestor `WeakSet` + a depth backstop (the §13 fix, mirroring the validators' `MAX_JSON_DEPTH` / E2's `compileRef`), so genuinely self‑cyclic *data* through a recursive `$ref` — and the canonical `lazyShape` pattern — return `false` (guard) / `undefined` (parser), **never `RangeError`**; finite recursive data still parses correctly and a shared‑but‑acyclic (DAG) substructure is not mis‑flagged as a cycle.
6. **RECURSIVE `$ref` IS LAZY / MEMO-BY-POINTER.** A recursive `$ref` is broken through `RefResolver.lazy` → `LazyRef`, memoized by E1 canonical pointer (one compiled artifact per def). A recursive schema yields a *finite* recursive guard/shape/parser, not an infinitely-expanded one; recursion is realised only over the finite DATA at guard/parse time — the JSON-Schema mirror of D3's `lazyShape` thunk memoization.
7. **ROUND-TRIP FIDELITY (the single authoritative gap list).** For the supported keyword subset, `compileGuard` ∘ `compileSchemaShape` ≡ `compileSchemaGuard`, and `compileSchema` ∘ `compileSchemaShape` is structurally faithful (the forward `compileGuard`/`compileSchema` are documented in [contracts.md](contracts.md)). Where the shape DSL cannot express a keyword, `compileSchemaShape` **omits** it, so the round-tripped shape is strictly **looser** than the schema (and looser than E2's guard). The exhaustive, intended, tested looser-gap list: `format`, `exclusiveMinimum`/`exclusiveMaximum` (degrade to *unconstrained*, not to the inclusive bound), `multipleOf`, `uniqueItems`, `patternProperties`, `propertyNames`, `minProperties`/`maxProperties`, `not`, `if`/`then`/`else`, open-tail `prefixItems` (+ a schema `items` tail), `contains`, `dependentRequired`/`dependentSchemas`, `unevaluatedProperties`. There is exactly **one stricter divergence**: an open-tail positional array maps to the **closed** tuple of its prefix (the least-wrong representation — `tupleShape` is closed), so `compileSchemaShape` rejects a longer array E2 would accept. E4 inherits this two-tier parse↔guard relationship verbatim: against E2's guard it is exact on the supported subset and looser exactly at the gap keywords; against its own derived-shape guard (`compileGuard` over `compileSchemaShape`) the B3 A/B/C clauses hold universally.

Enforced by:

- [`tests/guides/schema.test.ts`](../tests/guides/schema.test.ts) — every documented call-form API resolves to a real `src/core/schema.ts` export, and every export is documented here (bidirectional).
- [`tests/src/core/schema.test.ts`](../tests/src/core/schema.test.ts) — resolver RFC-6901 + escaping + cycle/depth throws; per-keyword guard behaviour; the E3 round-trip fidelity gaps; the E4 derived two-tier parse↔guard contract.

---

## Patterns

### JSON Schema → runtime guard

```ts
import { compileSchemaGuard } from '@elements/core'

const isUser = compileSchemaGuard({
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 1 },
		age: { type: 'integer', minimum: 0 },
	},
	required: ['name', 'age'],
	additionalProperties: false,
})

isUser({ name: 'Ada', age: 36 }) // true
isUser({ name: '', age: 36 }) // false — fails minLength: 1
isUser({ name: 'Ada', age: 36, x: 1 }) // false — closed object
isUser('not-an-object') // false — never throws on bad input
```

### JSON Schema → ContractShape → the forward pipeline

`compileSchemaShape()` is the round-trip bridge: an external schema becomes a `ContractShape`, which feeds every forward operation ([contracts.md](contracts.md)).

```ts
import { compileContract, compileSchema, compileSchemaShape } from '@elements/core'

const shape = compileSchemaShape({
	type: 'object',
	properties: { name: { type: 'string', minLength: 1 } },
	required: ['name'],
	additionalProperties: false,
})

const contract = compileContract(shape) // schema → shape → schema + is + parse + generate
contract.is({ name: 'Ada' }) // true
compileSchema(shape) // structurally faithful round-trip back to JSON Schema
```

### JSON Schema → input parser

```ts
import { compileSchemaParser } from '@elements/core'

const parseUser = compileSchemaParser({
	type: 'object',
	properties: { name: { type: 'string', minLength: 1 }, age: { type: 'integer' } },
	required: ['name', 'age'],
	additionalProperties: false,
})

parseUser({ name: 'Ada', age: '36' }) // { name: 'Ada', age: 36 } — coerced (forward parser)
parseUser({ name: '', age: 36 }) // undefined — fails minLength: 1
parseUser('not-an-object') // undefined — never throws
```

### Recursive `$defs` / `$ref`

A self-referential schema is walked cycle-safely — the recursive `$ref` is broken through a memoized `LazyRef`, so the compiled guard is recursive over finite data, not infinite.

```ts
import { compileSchemaGuard } from '@elements/core'

const isTree = compileSchemaGuard({
	$defs: {
		Node: {
			type: 'object',
			properties: {
				value: { type: 'number' },
				children: { type: 'array', items: { $ref: '#/$defs/Node' } },
			},
			required: ['value', 'children'],
			additionalProperties: false,
		},
	},
	$ref: '#/$defs/Node',
})

isTree({ value: 0, children: [{ value: 1, children: [] }] }) // true — recurses over finite data
```

The single-hop primitive `resolveRef()` and the resolver `createRefResolver()` are the foundation underneath — reach for them only when building a custom inverse walk; the three compilers already wire one resolver per compile call.

```ts
import { createRefResolver, resolveRef } from '@elements/core'

const root = { $defs: { Id: { type: 'string' } }, $ref: '#/$defs/Id' }
resolveRef(root, '#/$defs/Id') // { type: 'string' } — single hop
resolveRef(root, '#') // the whole root document

const resolver = createRefResolver(root)
resolver.resolve('#/$defs/Id') // { type: 'string' } — chain-followed, eager
const back = resolver.lazy('#/$defs/Id') // cycle-broken indirection
back.thunk() // terminates — resolves by pointer, never re-enters a body
```

### The fidelity-gap caveat, concretely

`compileSchemaShape()` is best-effort. A keyword the DSL cannot express is **dropped**, so the round-tripped guard is looser than E2's `compileSchemaGuard()` exactly there:

```ts
import { compileGuard, compileSchemaGuard, compileSchemaShape } from '@elements/core'

const schema = { type: 'string', format: 'email' } as const

compileSchemaGuard(schema)('not-an-email') // false — E2 asserts the documented format set
compileGuard(compileSchemaShape(schema))('not-an-email') // true — `format` is a dropped gap keyword
```

The full looser-gap list (`format`, `exclusiveMinimum`/`exclusiveMaximum`, `multipleOf`, `uniqueItems`, `patternProperties`, `propertyNames`, `minProperties`/`maxProperties`, `not`, `if`/`then`/`else`, open-tail `prefixItems`, `contains`, `dependentRequired`/`dependentSchemas`, `unevaluatedProperties`) plus the one stricter closed-tuple divergence is in the **Contract** section above. Use `compileSchemaGuard()` directly when you need the full keyword fidelity; use `compileSchemaShape()` when you need the value back inside the forward pipeline and the gap keywords don't matter for your schema.

### Practices

- **`compileSchemaGuard()` for full keyword fidelity; `compileSchemaShape()` for the forward pipeline.** The shape round-trip is looser by the documented gap list — pick the guard when those keywords matter.
- **A malformed `$ref` is a build-time throw, not a runtime sentinel.** Unresolvable / external / pure-`$ref`-cycle / over-`MAX_REF_DEPTH` schemas fail fast at compile time; the *produced* guard/parser never throw on input (`false` / `undefined`).
- **Recursive schemas are safe — use `$ref`/`$defs`.** The recursive `$ref` is the sanctioned recursion boundary (the JSON-Schema mirror of `lazyShape`); it compiles to a finite recursive artifact.
- **`compileSchemaParser()` is `compileParser` ∘ `compileSchemaShape`.** Its coercion and parse↔guard behaviour are the forward parser's, inherited verbatim — no new policy here.
- **External `$ref` is unsupported by design.** A non-local pointer is a precise throw, not a silent opaque pass — a future document-loader seam will intercept it.

---

## Tests

- [`tests/src/core/schema.test.ts`](../tests/src/core/schema.test.ts) — resolver RFC-6901 token-walking + `~`/percent escaping + external/missing/cycle/`MAX_REF_DEPTH` throws; `compileSchemaGuard` per-keyword behaviour and the produced-guard-never-throws contract; `compileSchemaShape` round-trip fidelity (the supported subset equivalence + every documented looser gap + the one stricter closed-tuple divergence); the `compileSchemaParser` derived two-tier parse↔guard contract and recursive-`$ref` finiteness.
- [`tests/guides/schema.test.ts`](../tests/guides/schema.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real `export` in `src/core/schema.ts`, and every `src/core/schema.ts` export is documented here (bidirectional).

---

## See also

- [contracts.md](contracts.md) — the **forward** shape-driven DSL (shape → schema / guard / parser / generator); this module is its inverse and `compileSchemaShape()` feeds back into it.
- [validators.md](validators.md) — the runtime type-guard library; `compileSchemaGuard()` produces a `Guard<unknown>` and `resolveRef()` validates resolved nodes with `isJsonSchema`.
- [parsers.md](parsers.md) — the flat coercing parsers; `compileSchemaParser()` inherits the forward `compileParser`'s coercion the contract compilers reuse.
- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
