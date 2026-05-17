# Compilers

> The forward pipeline — turn one shape into a JSON Schema document, a runtime guard, an input parser, and a seeded generator. Package: `@elements/core`. Source: [src/core/compilers.ts](../src/core/compilers.ts).

## Surface

A **shape** (built with the DSL in [shapers.md](shapers.md)) is inert data. The **compilers** are the functions that turn that one shape into four cohesive operations. You describe the shape once; the compilers derive everything else at construction time, and subsequent calls are pure lookups against pre-compiled closures.

| Operation  | Purpose                                                  | Output            |
| ---------- | -------------------------------------------------------- | ----------------- |
| `schema`   | JSON Schema document (for external validators / interop) | `JsonSchema`      |
| `is`       | Runtime type guard with full narrowing                   | `Guard<T>`        |
| `parse`    | Input normalization and coercion                         | `T \| undefined`  |
| `generate` | Deterministic seed data from a seeded PRNG               | `T`               |

The shape is the **single source of truth**. The same shape feeds the schema, the guard, the parser, and the generator — they cannot drift from one another because they are all derived from one declaration.

### The compile pipeline

The compilers in [src/core/compilers.ts](../src/core/compilers.ts) are the low-level functions that turn a shape into a single operation. Use them directly for custom pipelines, or let `compileContract()` bundle all four for you.

| Compiler              | Produces                                                         |
| --------------------- | ---------------------------------------------------------------- |
| `compileSchema()`     | a JSON Schema document (`JsonSchemaObject` for an object root)    |
| `compileGuard()`      | `(value: unknown) => boolean` runtime predicate                  |
| `compileParser()`     | `(value: unknown) => unknown` coercing parser                    |
| `compileGenerator()`  | a deterministic value from a `RandomFunction` seed               |
| `compileContract()`   | a `ContractInterface<T>` bundling all four                       |

### Entry points

The compilers are also the public entry points:

- `compileContract(shape)` — the full `ContractInterface<unknown>`: `schema`, `is`, `parse`, `generate`. Precompiles schema, guard, and parser once, then exposes them through a plain object with a deterministic `generate` method.
- `compileSchema(shape)` — JSON Schema only — produces the same JSON Schema value as `compileContract(shape).schema` but without constructing the guard, parser, or generator. An `ObjectShape` argument narrows the return to `JsonSchemaObject` (there is no separate object-schema builder — an object-root schema is just `compileSchema(objectShape(...))`).

### Structural `const` equality

`deepEqual(a, b)` is the one structural deep-equality behind JSON-Schema `const` — both `compileGuard()` and `compileParser()` use it for the `const` arm. It is a recursive structural deep-equality over finite JSON-shaped values: arrays compare by length + positional recursion; primitive / non-plain leaves by `Object.is` (so `NaN` === `NaN`, `+0` ≠ `-0` — the SAME equality validators' `literalOf` uses); plain objects (validators' `isRecord` discrimination: non-array, prototype `Object.prototype`/`null`) by same-own-key-set (`Object.hasOwn`, B2) then per-key recursion. `a` is the trusted finite operand bounding the recursion; `b` (the untrusted input) has its plain-object property values read directly via `Reflect.get`, so a throwing accessor propagates (the trusted-input regime). It is exported alongside the compilers but consumers compose contracts via `constShape` (see [shapers.md](shapers.md)) rather than calling it directly.

### Seeded generation

`createRandom(seed)` (in [src/core/helpers.ts](../src/core/helpers.ts)) returns a deterministic Mulberry32 PRNG: a pure `() => number` yielding the same `[0, 1)` sequence for the same 32-bit seed. Feed it to the contract's `generate` method (or directly to `compileGenerator()`) for reproducible seed data across test runs.

### Shared helpers

`src/core/helpers.ts` is the home for general-purpose `{verb}{Noun}` utilities shared across the core surface (it has no domain of its own — implementation modules contain only their own domain). One helper from that module, `validateBounds`, is the shape-builders' bounds check and is documented with the builders in [shapers.md](shapers.md). Every **other** `helpers.ts` export — the seeded PRNG, the reflection helpers the validators module uses internally, the `attempt()` guard-body throw boundary, and the structural helpers the compilers themselves branch on — is documented here:

| Helper                       | Returns                     | Behavior                                                                                                                  |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `createRandom(seed)`           | `RandomFunction`          | Deterministic Mulberry32 PRNG — a pure `() => number` over `[0, 1)`. Seeds `compileGenerator()` for reproducible fixtures. |
| `attempt(callback)`            | `Result<T>`               | Invokes `callback` and captures the outcome as a `Result` — `Success` with its return value, or `Failure` with the thrown reason normalised to an `Error`. The single sanctioned boundary the guard compositors (`transformOf` / `whereOf` / `lazyOf`) route their user-supplied projector / predicate / factory through so a throw is contained as a non-match instead of propagating out of the guard (§13). Not for build-time programmer-error checks — those still throw at the boundary. |
| `enumerableSymbolCount(value)` | `number`                  | The count of enumerable own-symbol keys on `value` (string keys ignored). Backs the object-emptiness guards `isEmptyObject` / `isNonEmptyObject` so a symbol-only record is not mistaken for empty. |
| `isConstructor(value)`         | `value is AnyConstructor<object>` | Whether `value` can be a `Reflect.construct` `newTarget` — a real constructor passes; arrow / plain functions and non-functions yield `false` (never throws). Backs the `instanceOf` guard compositor. |
| `isShapeAdditional(value)`     | `value is ContractShape`    | Whether an `ObjectShape.additionalProperties` slot carries a nested `ContractShape` (a typed open object) rather than `undefined` / `false` / `true`. Single source of the discriminator the schema, guard, and parser compilers all branch on; prototype-pollution-safe (reads no properties off `value`). |
| `assertAcyclicShape(shape, seen)` | `void`                   | Build-time acyclicity throw (§13 — NOT a runtime guard) every public compiler runs once up front: throws the precise `'cyclic ContractShape: use a lazy/deferred shape for recursion'` on a non-lazy structural shape cycle. `seen` is the ancestor path (a DAG of shared acyclic sub-shapes is fine); `lazy`/`const`/`raw` are terminals, wrapper kinds recurse. |
| `guardPermitsAbsence(shape)`   | `boolean`                   | Whether an object property of this shape may be absent at the GUARD/SCHEMA/GENERATOR level: `optional` → `true`, `default` recurses to its inner (a default is advisory, not optionality, so a `defaultShape` is required unless its inner is optional), everything else → `false`. The parser-only "apply default on absence" rule lives elsewhere. |
| `flattenIntersectionObjects(shape)` | `readonly ObjectShape[]` | The effective leaf `ObjectShape` members of an `IntersectionShape`, recursing through nested intersections so the merged-key universe and closed/open policy are computed over every real object member. Terminates because the shape is proven acyclic by `assertAcyclicShape()` first. |

Prefer the validators-module guards these back (`isEmptyObject` / `isNonEmptyObject` / `instanceOf`, see [validators.md](validators.md)) at call sites rather than calling the helpers directly. `isShapeAdditional()`, `guardPermitsAbsence()`, `flattenIntersectionObjects()`, and `assertAcyclicShape()` are consumed internally by the contract compilers — callers building shapes never invoke them directly. `attempt()` is the shared guard-body throw boundary used internally by the validators compositors; consumers compose guards, never invoke it directly.

### Object-root schemas

An object-root JSON Schema uses the same compiler path as every other contract: `compileSchema(objectShape(...))`. The `ObjectShape` overload narrows the result to `JsonSchemaObject`. There is no separate object-schema builder — object-root schemas are ordinary contracts compiled from an `objectShape` (see [shapers.md](shapers.md)).

> Guards narrow, parsers coerce, contracts derive — see [validators.md](validators.md) for the full three-surface framing. The flat value parsers ([parsers.md](parsers.md)) are a standalone surface these compilers reuse internally for primitive coercion, but they are not part of the contract DSL.

---

## Contract

These invariants hold across `src/core/compilers.ts` (plus the `src/core/helpers.ts` exports other than `validateBounds`) ↔ `compilers.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide — every compiler and every documented helper written in call form — is a real `export function` / `export const` in [src/core/compilers.ts](../src/core/compilers.ts) or [src/core/helpers.ts](../src/core/helpers.ts). The shape builders are documented in [shapers.md](shapers.md), and `validateBounds` (the builders' bounds check) is documented there too; this guide owns the compilers plus every other `helpers.ts` export. A renamed or removed export breaks the gate until the doc is reconciled.
2. **SOURCE → DOC.** Every `export function` / `export const` in `src/core/compilers.ts`, and every `src/core/helpers.ts` export except `validateBounds`, is documented (backticked) in this guide — the compiler + shared-helper surface is exhaustive, not a sample.
3. **TYPES ARE THE SOURCE OF TRUTH.** `ContractShape`, `ContractInterface<T>`, the JSON Schema family (`JsonSchema`, `JsonSchemaObject`, `JsonSchemaDefinition`), and `RandomFunction` are declared first in [src/core/types.ts](../src/core/types.ts). The compilers conform to those types, never the reverse.
4. **DERIVED, NOT DUPLICATED.** Schema, guard, parser, and generator are all compiled from the one shape. No operation is hand-written per shape — adding a shape variant means extending the discriminated `ContractShape` union and every compiler `switch`, never patching call sites.
5. **PARSE↔GUARD SOUNDNESS (B3).** For any compiled contract `{ is, parse }`: *(A) acceptance preservation* — a guard-valid input is never rejected by its own parser (returns non-`undefined`); *(B) round-trip validity* — parsing an already-valid value yields a value that still satisfies the guard; *(C) output soundness* — the parser never emits a value the guard would reject. The standalone flat parsers (`parseString`, `parseNumber`, etc.) in [parsers.md](parsers.md) are a SEPARATE opinionated surface that coerces more aggressively — they are not part of the B3 invariant, but the contract compilers reuse them internally for primitive coercion and then re-validate against the shape guard to keep A/B/C whole.
6. **GENERATE∘GUARD SOUNDNESS.** `compileGenerator(shape, random)` is deterministic (same seed → same value; the `random` source is consumed in a fixed shape-document order) and its output satisfies `compileGuard(shape)` for every well-formed shape. `rawShape` generates `null` (the smallest valid JSON placeholder). Recursive `lazyShape` generation terminates at a bounded lazy-recursion depth via the minimal-inhabitant strategy; a required-recursive shape with no finite inhabitant throws a precise §13 `Error` rather than recurse forever. For a `oneOfShape` with non-disjoint (overlapping) variants the generator generates a candidate, tests it against the compiled `oneOf` guard, and retries (driven by the same seeded `random`, so generation stays reproducible per seed) until an exactly-one-matching value is found — so the output is exactly-one valid even for resolvable overlapping variants. If the variants overlap so heavily that no exactly-one-matching value exists within the retry bound (an ill-posed `oneOf`), a precise generation-time §13 `Error` is thrown naming the variants and suggesting disjoint branches or `anyOf`.

Enforced by:

- [`tests/guides/compilers.test.ts`](../tests/guides/compilers.test.ts) — every documented call-form API resolves to a real `src/core/compilers.ts` or `src/core/helpers.ts` export, and every such export (excluding `validateBounds`, owned by shapers.md) is documented here.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — schema / guard / parser / generator behaviour, including `additionalProperties`, `oneOf`, raw passthrough, and object-root schema typing.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder produces the documented shape value the compilers consume.

---

## Patterns

### Quick start

```ts
import {
	compileContract,
	compileSchema,
	createRandom,
	integerShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@elements/core'

// 1. Define a shape — the single source of truth (see shapers.md).
const userShape = objectShape({
	name: stringShape({ min: 1, max: 80, description: 'Display name' }),
	age: integerShape({ min: 0, max: 120 }),
	role: literalShape('admin', 'member', 'guest'),
	bio: optionalShape(stringShape({ max: 500 })),
})

// 2. Compile the full contract.
const userContract = compileContract(userShape)

// 3. JSON Schema (e.g. for external schema validation / interop).
userContract.schema

// 4. Runtime type guard with full narrowing.
if (userContract.is(input)) {
	// input is { readonly name: string; readonly age: number; readonly role: 'admin' | 'member' | 'guest'; readonly bio?: string }
}

// 5. Parse and normalize unknown input.
const parsed = userContract.parse(rawBody)
// parsed: { readonly name: string; readonly age: number; readonly role: ...; readonly bio?: string } | undefined

// 6. Deterministic seed data — same seed, same output every time.
const seed = userContract.generate(createRandom(42))

// Schema-only when the guard/parser/generator aren't needed:
const schema = compileSchema(userShape)
```

### `additionalProperties` behaviour

The `additionalProperties` option on an `objectShape` controls unknown-key handling across the compiled guard, parser, and schema in lockstep:

```ts
import { numberShape, objectShape, stringShape } from '@elements/core'

// Closed (default) — unknown keys rejected by the guard, dropped by the parser.
objectShape({ id: stringShape() })

// Open — unknown keys accepted as-is and passed through.
objectShape({ id: stringShape() }, { additionalProperties: true })

// Constrained — unknown keys validated/parsed against a shape.
objectShape({ name: stringShape() }, { additionalProperties: numberShape() })
```

| `additionalProperties` | Guard                  | Parser                  | Schema                          |
| ---------------------- | ---------------------- | ----------------------- | ------------------------------- |
| `undefined` / `false`  | reject unknown keys    | drop unknown keys       | `additionalProperties: false`   |
| `true`                 | accept any unknown key | pass unknown keys       | `additionalProperties: true`    |
| `ContractShape`        | validate against shape | parse through shape     | `additionalProperties: { ... }` |

`isShapeAdditional()` is the single discriminator the schema, guard, and parser compilers all branch on to tell the third row apart from the boolean cases.

### `unionShape` vs `oneOfShape` — compiled semantics

The two union builders (see [shapers.md](shapers.md) for construction) differ in both the emitted JSON Schema keyword **and** the runtime semantics the compilers give them:

- **`anyOf`** — variants checked in order; the first variant whose guard accepts the raw input wins. One or more matches is fine.
- **`oneOf`** — ALL variant guards are checked on the raw input; the result is valid iff **exactly one** guard accepts it (zero or ≥2 matches → guard returns `false`, parser returns `undefined`). The parser never silently picks a winner when two variants overlap.

Generation for a `oneOf` shape: `compileGenerator()` generates a candidate from a PRNG-picked variant and verifies it against the compiled `oneOf` guard. Disjoint variants match exactly one branch on the first attempt. When the variants overlap — e.g. an `oneOfShape` of `numberShape` and `integerShape`, where every integer satisfies both — the generator retries, driven by the same seeded `random` (so generation stays deterministic per seed), until it produces an exactly-one-matching value. If the variants overlap so heavily that no exactly-one-matching value exists within the retry bound (e.g. two variants with identical value sets), `compileGenerator()` throws a precise generation-time `Error` naming the variants and suggesting disjoint branches or `anyOf`/`unionShape` — it never emits a guard-invalid value.

### `deepEqual()` — the `const` equality oracle

```ts
import { deepEqual } from '@elements/core'

deepEqual({ a: [1, 2] }, { a: [1, 2] }) // true
deepEqual(Number.NaN, Number.NaN)       // true  (Object.is)
deepEqual(0, -0)                        // false (Object.is)
deepEqual({ a: 1 }, { a: 1, b: 2 })     // false (key-set differs)
```

`deepEqual(a, b)` is the single structural equality behind the `const` keyword in both `compileGuard()` and `compileParser()`. Arrays compare by length then positional recursion; a primitive / non-plain leaf by `Object.is` (so `NaN` equals `NaN`, `+0` is distinct from `-0` — the SAME rule `literalOf` in [validators.md](validators.md) uses); a plain object requires `b` to be a plain object with an identical own-key set (presence tested via `Object.hasOwn` so an inherited key is never mistaken for an own one — B2 prototype-pollution discipline) and every value deep-equal. `a` is the trusted schema-supplied operand (a finite acyclic `JsonValue`) so the recursion is bounded regardless of the untrusted `b`. It is exported alongside the compilers, but consumers compose contracts via `constShape` rather than calling it directly.

### Recursive shapes — `assertAcyclicShape()` and the lazy boundary

Every public compiler runs `assertAcyclicShape(shape, new WeakSet())` once, up front:

- A non-lazy structural cycle (a property whose shape *is* an ancestor object, no `lazyShape` wrapper) throws the precise `'cyclic ContractShape: use a lazy/deferred shape for recursion'` `Error` at the first `compile*()` call — never a bare `RangeError` from V8, never a silently-broken compiled function.
- A `lazyShape` node is a **terminal** for that walk (its thunk is deliberately not invoked during checking), so a shape recursive *through* a `lazyShape` has no static back-edge and compiles. `assertAcyclicShape()` tracks the ancestor path (add-on-enter / delete-on-exit), so a shared-but-acyclic sub-shape (a DAG) is not misreported.

Behavioural contract of a recursive `lazyShape` once it compiles:

- **schema** — emits `{ $ref: '#/$defs/Lazyn' }` and hoists the resolved definition onto a root `$defs` (one named definition per distinct thunk, so a recursive schema is finite, not infinitely nested). The emitted schema is `isJsonSchema`-valid. *Limitation (Phase E seam):* a single self-contained `$defs` block with deterministic per-compile names (`Lazy0`, `Lazy1`, …); cross-document `$id` resolution and `$ref` dedup across separate `compileSchema()` calls are completed in Phase E.
- **guard / parse** — delegate verbatim to the resolved inner shape (memoized per compilation so the self-reference reuses one compiled function); recursion over genuinely recursive **data** terminates because the data is finite. **Adversarial data is §13-safe at runtime:** the compiled recursive-lazy guard/parser thread a per-compilation ancestor tracker (a `WeakSet` of the objects currently on the recursion path — added on enter, removed on exit) plus a generous depth backstop, so a **cyclic** value (`const n = { value: 1 }; n.next = n`) yields `false` (guard) / `undefined` (parser) and a **pathologically deep acyclic** value is capped the same way — **never a thrown `RangeError`**. A shared-but-acyclic substructure (the same finite object referenced under two keys — a DAG) is *not* mis-flagged as a cycle, and genuinely finite recursive data still validates/parses correctly.
- **generate** — bounded: a recursive lazy shape generates a finite nested value up to a small fixed lazy-recursion depth, then collapses the recursive child to its **minimal inhabitant** (array → `[]`, optional → absent, nullable → `null`, object → required keys only). The generated value still satisfies the guard and is deterministic. A required, non-optional, infinitely-deep recursive child (an object whose only property is a self-referential `lazyShape` with no terminating container) has **no finite inhabitant**: the generator throws a precise `Error` (`recursive shape has no finite inhabitant within depth N`) rather than recurse forever or emit a guard-violating value (schema/guard/parse do not need a finite inhabitant and still compile).

### `guardPermitsAbsence()` — the optionality discriminator

`guardPermitsAbsence(shape)` is how the guard, schema, and generator compilers decide whether an object property may be absent: `optional` → `true`; a `default` recurses to its inner (a default is *advisory metadata, not optionality*, so a `defaultShape` over a required inner like `integerShape` stays **required**, while a `defaultShape` over an `optionalShape` inner may be absent); everything else → `false`. This is why a `defaultShape`'s **guard** delegates verbatim to `inner` (the guard does not accept `undefined` just because a default exists) while its **parser** applies the default on absence — the deliberate, useful asymmetry documented for `defaultShape` in [shapers.md](shapers.md). The parser-only "apply default on absence" rule lives inline in the object parser arm, not in this discriminator. parse↔guard A/B/C still hold: `defaultShape` build-validates the default against `inner`'s guard, so every parser output (the default **or** a parsed-inner value) is guard-valid (clause C); A/B are inherited from `inner`'s own sound parser for every non-`undefined` input.

### Intersection schema emission — a MERGE, not a naive `allOf`

`flattenIntersectionObjects(shape)` collects the effective leaf object members of an `intersectionShape` (recursing through nested intersections). The compiler then **merges** them rather than emitting a naive `allOf`:

```ts
import { compileSchema, integerShape, intersectionShape, objectShape, stringShape } from '@elements/core'

const named = objectShape({ name: stringShape({ min: 1 }) })
const aged = objectShape({ age: integerShape({ min: 0 }) })

compileSchema(intersectionShape(named, aged))
// { type: 'object', properties: { name: …, age: … }, required: ['name','age'],
//   additionalProperties: false }   ← members MERGED, not allOf'd
```

JSON-Schema `allOf` applies every sub-schema *independently* to the whole instance, so an `allOf` of *closed* object members (the default) would be **unsatisfiable** — each closed member would reject the keys contributed by its siblings as "additional" — even though the guard accepts the merged object. `compileSchema()` therefore merges the effective leaf object members into one object schema: the **union of their `properties`**, the **union of their `required`**, and `additionalProperties` reconciled exactly as the guard does (closed iff *every* leaf member is closed, then closed over the **union** of known keys; open if any leaf is open). A property key declared by **more than one member** is emitted as the per-key conjunction `{ allOf: [<member-A's value schema>, <member-B's value schema>, …] }` (a single declarer keeps its bare value schema — no needless wrapper); its accept-set for that key is the **intersection** of the members' per-key accept-sets — exactly what the guard enforces (each member's guard checks its own declared key conjunctively). So a guard-uninhabited overlap (`{a:string} ∩ {a:integer}`) and a compatible-but-distinct overlap (`{a:string,minLength:1} ∩ {a:string,maxLength:5}`) both round-trip **exactly** — not the pre-fix overwrite that kept only the last member's per-key schema. A distinct-typed-open member keeps an `allOf` over the per-member schemas as a fallback (there is no single sound merged `additionalProperties` when distinct members constrain unknown keys with different sub-schemas; the guard arm likewise defers there). This keeps the emitted schema's accept-set equal to the guard's (round-trip parity).

### Forward-emission fidelity

**The one stricter known-divergence.** For everything JSON Schema can represent, `compileSchema(s)` and `compileGuard(s)` describe the **exact same value set**. A **nested** `optionalShape` property round-trips exactly — absence is carried structurally by the enclosing object omitting the key from `required` (JSON-Schema object validation checks a property's schema only when the key is present, so an absent optional key is never checked and a present one is checked against `inner`). There is exactly **one** stricter divergence: a **bare top-level `optionalShape`** has no enclosing `required` to carry absence and JSON Schema has no value-level `undefined`, so the emitted bare-inner schema rejects exactly the single value `undefined` that the guard accepts — **and nothing wider** (the schema is strictly *tighter* than the guard by exactly `{undefined}` at a bare document root). It is **not** the prior degenerate `{ anyOf: [inner, {}] }`: JSON-Schema 2020-12 `{}` accepts every instance, so that collapsed to a universally-true root that erased all of `inner`'s structure.

### Guard-body throw containment — `attempt()`

`attempt(callback)` is the single sanctioned boundary that converts a throwing user callback into a `Result`: `Success` carrying the return value, or `Failure` carrying the thrown reason normalised to an `Error`.

```ts
import { attempt } from '@elements/core'

const outcome = attempt(() => project(value))
if (!outcome.success) {
	return false // contain the throw — the guard reports a non-match
}
use(outcome.value)
```

The validators' guard compositors (`transformOf` / `whereOf` / `lazyOf`) invoke a caller-supplied projector / predicate / factory *inside the runtime guard body*, yet per §13 a guard must NEVER throw. `attempt()` is where that containment is written once and shared, instead of copy-pasted `try`/`catch` across every compositor. Build-time programmer-error checks do **not** route through it — a genuine §13 build-boundary throw is correct there. Consumers compose guards (see [validators.md](validators.md)); they never invoke `attempt()` directly.

### Reflection helpers — `enumerableSymbolCount()` / `isConstructor()`

```ts
import { enumerableSymbolCount, isConstructor } from '@elements/core'

const flag = Symbol('flag')
enumerableSymbolCount(Object.defineProperty({}, flag, { value: 1, enumerable: true })) // 1
enumerableSymbolCount({}) // 0

isConstructor(class Example {}) // true
isConstructor(() => undefined)  // false
```

`enumerableSymbolCount(value)` counts enumerable own-symbol keys (string keys ignored) so the validators-module object-emptiness guards `isEmptyObject` / `isNonEmptyObject` do not mistake a symbol-only record for empty. `isConstructor(value)` probes with `Reflect.construct(String, [], value)` — a real constructor succeeds; arrow/plain functions and non-functions throw and yield `false` (never throws) — backing the validators-module `instanceOf` compositor. Prefer the validators-module guards these back (see [validators.md](validators.md)) at call sites rather than calling the helpers directly.

### Practices

- **`compileContract()` for the full pipeline; `compileSchema()` for schema-only.** Skip the full contract when you only need the JSON Schema (for external validation or interop).
- **`compileSchema(objectShape(...))` for an object-root schema.** An object-root schema is just a contract compiled from an `objectShape`.
- **`createRandom()` with a fixed seed for reproducible fixtures.** Same seed, same generated data, every run — feed it to the contract's `generate` method or to `compileGenerator()`.
- **Compose contracts; don't call the internals.** `deepEqual()`, `isShapeAdditional()`, `guardPermitsAbsence()`, `flattenIntersectionObjects()`, `assertAcyclicShape()`, and `attempt()` back the compilers and validators — reach for `constShape` / a contract's `is` / the validators-module guards instead.

---

## Tests

- [`tests/guides/compilers.test.ts`](../tests/guides/compilers.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real export in `src/core/compilers.ts` or `src/core/helpers.ts` (excluding `validateBounds`, documented in shapers.md), and every such export is documented here.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — `compileSchema` / `compileGuard` / `compileParser` / `compileGenerator` / `compileContract` behaviour, including `additionalProperties`, `oneOf`, raw passthrough, nullable, and object-root schema typing.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder produces the documented shape value the compilers consume.

---

## See also

- [shapers.md](shapers.md) — the shape DSL these compilers consume; documents the `*Shape` builders and `validateBounds`.
- [parsers.md](parsers.md) — the flat value / field / format parsers the contract compilers reuse for primitive coercion.
- [validators.md](validators.md) — the runtime type-guard library; the validators-module guards `isEmptyObject` / `isNonEmptyObject` / `instanceOf` are the public faces of the shared reflection helpers documented here.
- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
