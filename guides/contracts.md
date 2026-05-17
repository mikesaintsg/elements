# Contracts

> Define a shape once — get JSON Schema, a runtime guard, an input parser, and a seeded generator for free. Package: `@elements/core`. Source: [src/core/](../src/core/).

## Surface

A **contract** is a single data shape compiled into four cohesive operations. You describe the shape once with the builder DSL; the compilers derive everything else at construction time. Subsequent calls are pure lookups against pre-compiled closures.

| Operation  | Purpose                                     | Output            |
| ---------- | ------------------------------------------- | ----------------- |
| `schema`   | JSON Schema document (for external validators / interop) | `JsonSchema`      |
| `is`       | Runtime type guard with full narrowing      | `Guard<T>`        |
| `parse`    | Input normalization and coercion            | `T \| undefined`  |
| `generate` | Deterministic seed data from a seeded PRNG  | `T`               |

The shape is the **single source of truth**. The same shape feeds the schema, the guard, the parser, and the generator — they cannot drift from one another because they are all derived from one declaration.

### Shape builders

Each builder produces a `ContractShape` value. Builders preserve const-generic types so `Infer<S>` recovers the exact static type from the shape.

| Builder           | JSON Schema (compiled)                 | Inferred type           |
| ----------------- | -------------------------------------- | ----------------------- |
| `stringShape()`   | `{ type: 'string' }` + length/pattern  | `string`                |
| `numberShape()`   | `{ type: 'number' }` + bounds          | `number`                |
| `integerShape()`  | `{ type: 'integer' }` + bounds         | `number`                |
| `booleanShape()`  | `{ type: 'boolean' }`                  | `boolean`               |
| `literalShape()`  | `{ enum: [...] }`                      | literal union           |
| `constShape()`    | `{ const: <value> }`                   | the value's literal/structural type |
| `arrayShape()`    | `{ type: 'array', items: {...} }`      | `readonly T[]`          |
| `tupleShape()`    | `{ type: 'array', prefixItems: [...], items: false, minItems: n, maxItems: n }` | `readonly [A, B]` |
| `objectShape()`   | `{ type: 'object', properties: {...} }`| `{ key: T; opt?: U }`   |
| `unionShape()`    | `{ anyOf: [...] }`                     | `A \| B`                |
| `oneOfShape()`    | `{ oneOf: [...] }`                     | `A \| B`                |
| `intersectionShape()` | merged object schema (union of `properties`/`required`, overlapping key → per-key `allOf`, `additionalProperties` reconciled) | `A & B` |
| `optionalShape()` | bare inner (nested: absence via `required` omission; bare top-level root: the one stricter known-divergence — `undefined` unrepresentable) | `T \| undefined` |
| `nullableShape()` | `{ anyOf: [inner, { type: 'null' }] }` | `T \| null`             |
| `defaultShape()`  | inner schema + `default: <value>`      | `Infer<inner>` (default is advisory; type unchanged) |
| `lazyShape()`     | `{ $ref: '#/$defs/Lazyn' }` + root `$defs` | `Infer<inner>` (recursive: `unknown` — supply a named `interface`) |
| `recordShape()`   | `{ type: 'object', additionalProperties: {...} }` | `Record<string, T>` |
| `rawShape()`      | pass-through fragment                  | `unknown`               |

Builder option bags are typed in [src/core/types.ts](../src/core/types.ts): `StringShapeOptions` (`min`, `max`, `pattern`, `description`), `NumberShapeOptions` (`min`, `max`, `integer`, `description`), `BooleanShapeOptions` (`description`), `ArrayShapeOptions` (`min`, `max`, `description`), and `ObjectShapeOptions` (`additionalProperties`, `description`).

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

The compilers in [src/core/compilers.ts](../src/core/compilers.ts) are also the public entry points:

- `compileContract(shape)` — the full `ContractInterface<Infer<S>>`: `schema`, `is`, `parse`, `generate`.
- `compileSchema(shape)` — JSON Schema only — produces the same JSON Schema value as `compileContract(shape).schema` but without constructing the guard, parser, or generator. An `ObjectShape` argument narrows the return to `JsonSchemaObject`.

### Seeded generation

`createRandom(seed)` (in [src/core/helpers.ts](../src/core/helpers.ts)) returns a deterministic Mulberry32 PRNG: a pure `() => number` yielding the same `[0, 1)` sequence for the same 32-bit seed. Feed it to the contract's `generate` method (or directly to `compileGenerator()`) for reproducible seed data across test runs.

### Shared helpers

`src/core/helpers.ts` is the home for general-purpose `{verb}{Noun}` utilities shared across the core surface (it has no domain of its own — implementation modules contain only their own domain). Alongside `createRandom()` it exports the reflection helpers used internally by the validators module, the `attempt()` guard-body throw boundary, the `additionalProperties` discriminator shared by the compilers, plus `deepEqual()` — the one structural deep-equality shared by JSON-Schema `const` (compilers) and `enum`/`const`/`uniqueItems` (the inverse subsystem):

| Helper                       | Returns                     | Behavior                                                                                                                  |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `attempt(callback)`            | `Result<T>`               | Invokes `callback` and captures the outcome as a `Result` — `Success` with its return value, or `Failure` with the thrown reason normalised to an `Error`. The single sanctioned boundary the guard compositors (`transformOf` / `whereOf` / `lazyOf`) route their user-supplied projector / predicate / factory through so a throw is contained as a non-match instead of propagating out of the guard (§13). Not for build-time programmer-error checks — those still throw at the boundary. |
| `enumerableSymbolCount(value)` | `number`                  | The count of enumerable own-symbol keys on `value` (string keys ignored). Backs the object-emptiness guards `isEmptyObject` / `isNonEmptyObject` so a symbol-only record is not mistaken for empty. |
| `isConstructor(value)`         | `value is AnyConstructor<object>` | Whether `value` can be a `Reflect.construct` `newTarget` — a real constructor passes; arrow / plain functions and non-functions yield `false` (never throws). Backs the `instanceOf` guard compositor. |
| `isShapeAdditional(value)`     | `value is ContractShape`    | Whether an `ObjectShape.additionalProperties` slot carries a nested `ContractShape` (a typed open object) rather than `undefined` / `false` / `true`. Single source of the discriminator the schema, guard, and parser compilers all branch on; prototype-pollution-safe (reads no properties off `value`). |
| `validateBounds(label, min, max, lengthBound)` | `void` | Build-time bounds guard (§13 — NOT a runtime guard) shared by the shape builders: throws when a `min`/`max` is non-finite, negative where nonsensical (`lengthBound`), or `min > max`. Invoked at the build boundary so an inverted bound surfaces at the cause, not deep in a compiler. |
| `isExternalRef(ref)`           | `boolean`                   | Whether a `$ref` string names a separate document (external) versus a local single-document form (`#`, `#/...`, ``, bare `/...`). Backs the inverse subsystem's `$ref` resolver. |
| `unescapeToken(token)`         | `string`                    | Unescape ONE RFC-6901 reference token: `~1`→`/` then `~0`→`~` (order is load-bearing — `~01` must decode to `~1`, never `/`). Backs the JSON-Pointer walker. |
| `isMultipleOf(value, divisor)` | `boolean`                   | Whether `value` is a multiple of `divisor` within IEEE-754 tolerance. Two regimes: when both operands are integers it uses an **exact** `value % divisor === 0` (integer arithmetic on safe doubles has no slop, so a large odd integer ÷ small integer is correctly rejected with no tolerance — FU10 §13); for non-integer operands it compares the **value-space** residual (`\|value − rounded·divisor\|`) against the **minimum** of a magnitude band (`8·Number.EPSILON·max(\|value\|,\|reconstructed\|)`) and a divisor cap (`\|divisor\|/16`). The magnitude band keeps decimal multiples complete at realistic magnitudes (cents through large money, ≤ ~1e11–1e12); the divisor cap is the soundness floor — a genuine non-multiple's residual is at least a fraction of `\|divisor\|`, so the band can never swallow a miss `≥ \|divisor\|/16`, which removes the unbounded-band false-accept of distinct-representable non-multiples once `\|value\| ≳ 2.8e12` (FU10 follow-up). It is **not** complete at every magnitude: above an inherent IEEE-754 precision wall (empirically `\|value\| ≳ ~1e13` for `divisor` `0.01`, `~1e14` for `0.1`) the upstream exact-integer-quotient return can no longer distinguish a genuine non-multiple from a true one — a documented, soundness-biased, bounded limitation, not eliminable with doubles. A zero divisor yields `false`. Backs the schema `multipleOf` keyword. |
| `assertAcyclicShape(shape, seen)` | `void`                   | Build-time acyclicity throw (§13 — NOT a runtime guard) every public compiler runs once up front: throws the precise `'cyclic ContractShape: use a lazy/deferred shape for recursion'` on a non-lazy structural shape cycle. `seen` is the ancestor path (a DAG of shared acyclic sub-shapes is fine); `lazy`/`const`/`raw` are terminals, wrapper kinds recurse. |
| `guardPermitsAbsence(shape)`   | `boolean`                   | Whether an object property of this shape may be absent at the GUARD/SCHEMA/GENERATOR level: `optional` → `true`, `default` recurses to its inner (a default is advisory, not optionality, so a `defaultShape` is required unless its inner is optional), everything else → `false`. The parser-only "apply default on absence" rule lives elsewhere. |
| `flattenIntersectionObjects(shape)` | `readonly ObjectShape[]` | The effective leaf `ObjectShape` members of an `IntersectionShape`, recursing through nested intersections so the merged-key universe and closed/open policy are computed over every real object member. Terminates because the shape is proven acyclic by `assertAcyclicShape` first. |
| `deepEqual(a, b, read?)`       | `boolean`                   | Recursive structural deep-equality over finite JSON-shaped values — the ONE equality behind JSON-Schema `const` (compilers) and `enum`/`const`/`uniqueItems` (the inverse subsystem). Arrays compare by length + positional recursion (both sides indexed directly); primitive / non-plain leaves by `Object.is` (so `NaN` === `NaN`, `+0` ≠ `-0` — the SAME equality validators' `literalOf` uses); plain objects (an inline `isRecord`-equivalent: non-array, prototype `Object.prototype`/`null`) by same-own-key-set (`Object.hasOwn`, B2) then per-key recursion. `a` is the trusted finite operand bounding the recursion; `b`'s plain-object property values flow through the optional `read` strategy (defaults to a direct `Reflect.get` — the trusted-input regime where a throwing accessor propagates; the inverse subsystem injects a `try`-wrapped `safeGet` whose throwing-getter sentinel stays entirely in `schema.ts`). Total per §13 when `read` is total. |

These are real exports of the same module as `createRandom()`; prefer the validators-module guards they back (`isEmptyObject` / `isNonEmptyObject` / `instanceOf`, see [validators.md](validators.md)) at call sites rather than calling the helpers directly. `isShapeAdditional()` is consumed internally by the contract compilers — callers building shapes never invoke it directly. `attempt()` is the shared guard-body throw boundary used internally by the validators compositors; consumers compose guards, never invoke it directly.

### Object-root schemas

An object-root JSON Schema uses the same compiler path as every other contract: `compileSchema(objectShape(...))`. The `ObjectShape` overload narrows the result to `JsonSchemaObject`. There is no separate object-schema builder — object-root schemas are ordinary contracts compiled from an `objectShape()`.

> Guards narrow, parsers coerce, contracts derive — see [validators.md](validators.md) for the full three-surface framing. The flat value parsers ([parsers.md](parsers.md)) are a standalone surface the contract compilers reuse internally for primitive coercion, but they are not part of the contract DSL.

---

## Contract

These invariants hold across `src/core/{types,shapers,compilers,helpers}.ts` ↔ `contracts.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide — every builder, compiler, and helper written in call form — is a real `export function` / `export const` in one of [src/core/shapers.ts](../src/core/shapers.ts), [src/core/compilers.ts](../src/core/compilers.ts), or [src/core/helpers.ts](../src/core/helpers.ts). A renamed or removed export breaks the gate until the doc is reconciled.
2. **TYPES ARE THE SOURCE OF TRUTH.** `ContractShape`, `Infer<S>`, `ContractInterface<T>`, the JSON Schema family (`JsonSchema`, `JsonSchemaObject`, `JsonSchemaDefinition`), and every `*ShapeOptions` bag are declared first in [src/core/types.ts](../src/core/types.ts). Builders and compilers conform to those types, never the reverse.
3. **DERIVED, NOT DUPLICATED.** Schema, guard, parser, and generator are all compiled from the one shape. No operation is hand-written per shape — adding a shape variant means extending the discriminated `ContractShape` union and every compiler `switch`, never patching call sites.
4. **PARSE↔GUARD SOUNDNESS (B3).** For any compiled contract `{ is, parse }`: *(A) acceptance preservation* — a guard-valid input is never rejected by its own parser (returns non-`undefined`); *(B) round-trip validity* — parsing an already-valid value yields a value that still satisfies the guard; *(C) output soundness* — the parser never emits a value the guard would reject. The standalone flat parsers (`parseString`, `parseNumber`, etc.) in [parsers.md](parsers.md) are a SEPARATE opinionated surface that coerces more aggressively — they are not part of the B3 invariant, but the contract compilers reuse them internally for primitive coercion and then re-validate against the shape guard to keep A/B/C whole.
5. **GENERATE∘GUARD SOUNDNESS.** `compileGenerator(shape, random)` is deterministic (same seed → same value; the `random` source is consumed in a fixed shape-document order) and its output satisfies `compileGuard(shape)` for every well-formed shape. `rawShape` generates `null` (the smallest valid JSON placeholder). Recursive `lazyShape` generation terminates at a bounded lazy-recursion depth via the minimal-inhabitant strategy; a required-recursive shape with no finite inhabitant throws a precise §13 Error rather than recurse forever. For a `oneOfShape` with non-disjoint (overlapping) variants the generator generates a candidate, tests it against the compiled `oneOf` guard, and retries (driven by the same seeded `random`, so generation stays reproducible per seed) until an exactly-one-matching value is found — so the output is exactly-one valid even for resolvable overlapping variants. If the variants overlap so heavily that no exactly-one-matching value exists within the retry bound (an ill-posed `oneOf`), a precise generation-time §13 Error is thrown naming the variants and suggesting disjoint branches or `anyOf`.

Enforced by:

- [`tests/guides/contracts.test.ts`](../tests/guides/contracts.test.ts) — every documented call-form API resolves to a real `src/core` export.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — schema / guard / parser / generator behaviour, including `additionalProperties`, `oneOf`, raw passthrough, and object-root schema typing.

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

// 1. Define a shape — the single source of truth.
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

The `additionalProperties` option on `objectShape()` controls unknown-key handling across the compiled guard, parser, and schema in lockstep:

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

### `unionShape()` vs `oneOfShape()`

```ts
import { booleanShape, integerShape, oneOfShape, stringShape, unionShape } from '@elements/core'

const id = unionShape(stringShape(), integerShape())
// JSON Schema: { anyOf: [{ type: 'string' }, { type: 'integer' }] }

const idOrFlag = oneOfShape(stringShape(), booleanShape())
// JSON Schema: { oneOf: [{ type: 'string' }, { type: 'boolean' }] }
```

These two differ in both the emitted JSON Schema keyword **and** the runtime semantics:

- **`unionShape()` (`anyOf`)** — variants checked in order; the first variant whose guard accepts the raw input wins. One or more matches is fine.
- **`oneOfShape()` (`oneOf`)** — ALL variant guards are checked on the raw input; the result is valid iff **exactly one** guard accepts it (zero or ≥2 matches → guard returns `false`, parser returns `undefined`). The parser never silently picks a winner when two variants overlap.

Generation for a `oneOf` shape: `compileGenerator` generates a candidate from a PRNG-picked variant and verifies it against the compiled `oneOf` guard. Disjoint variants match exactly one branch on the first attempt. When the variants overlap — e.g. `oneOfShape(numberShape(), integerShape())`, where every integer satisfies both — the generator retries, driven by the same seeded `random` (so generation stays deterministic per seed), until it produces an exactly-one-matching value. If the variants overlap so heavily that no exactly-one-matching value exists within the retry bound (e.g. two variants with identical value sets), `compileGenerator` throws a precise generation-time `Error` naming the variants and suggesting disjoint branches or `anyOf`/`unionShape` — it never emits a guard-invalid value.

### `recordShape()` — open dictionaries

```ts
import { numberShape, recordShape } from '@elements/core'

const bindings = recordShape(numberShape(), { description: 'Variable bindings' })
// JSON Schema: { type: 'object', additionalProperties: { type: 'number' } }
```

`recordShape(values)` is the convenience form of `objectShape({}, { additionalProperties: values })` — cleaner for `Record<string, T>`-style structures with no fixed keys.

### `tupleShape()` — fixed-length heterogeneous arrays

```ts
import { integerShape, stringShape, tupleShape } from '@elements/core'

const pair = tupleShape(stringShape(), integerShape())
// Infer<typeof pair> = readonly [string, number]
// JSON Schema: { type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }],
//               items: false, minItems: 2, maxItems: 2 }

const empty = tupleShape() // the inhabited `readonly []` type — only `[]` is valid
```

Each argument is the shape for that position. The compiled guard accepts an array of **exactly** that arity where every element satisfies its positional shape (the runtime mirror of `tupleOf` in [validators.md](validators.md)); the parser parses each position with that position's parser and fails on any arity or positional mismatch. The closed-tuple JSON Schema is the standard `prefixItems` + `items: false` + `minItems === maxItems === arity` encoding. Unlike an empty `literalShape()` / `unionShape()` (uninhabited → throws at build), an empty `tupleShape()` is the valid, inhabited `[]` type and does not throw.

### `constShape()` — a single fixed JSON value (`const`)

```ts
import { constShape, objectShape, stringShape } from '@elements/core'

const kind = constShape('user')
// Infer<typeof kind> = 'user'   JSON Schema: { const: 'user' }

const origin = constShape({ x: 0, y: 0 })
// Infer<typeof origin> = { x: number; y: number }
// JSON Schema: { const: { x: 0, y: 0 } }

// A fixed discriminant field inside an object:
const userEvent = objectShape({ kind: constShape('user'), name: stringShape({ min: 1 }) })
```

`constShape(value)` is the JSON-Schema `const` — a value valid iff it **equals** `value`. The **equality rule** (documented and consistent across the codebase): `const` is a *structural* value match — primitive leaves are compared with `Object.is` (so `NaN` matches `NaN`, and `+0` ≠ `-0` — exactly the equality `literalOf` in [validators.md](validators.md) uses), while arrays and plain objects are compared by recursive structural deep-equality (identical own-key sets, every value deep-equal; key order irrelevant). The parser returns the **canonical** value (a *fresh deep copy* for a non-primitive `value`, so a shared mutable reference is never handed out — the same alias-free policy the object parser follows); the generator deterministically emits that same canonical value (also a fresh copy). Unlike `literalShape()` (an enum of *primitives*, `Set`-membership guard), `constShape()` accepts a single value that may be *structured* (object/array) and is always inhabited, so — unlike an empty `literalShape()` / `unionShape()` — it never throws at build. The const generic preserves the literal type, so `Infer<typeof shape>` is the exact type of `value`.

### `intersectionShape()` — values satisfying all members (merged object schema)

```ts
import { integerShape, intersectionShape, objectShape, stringShape } from '@elements/core'

const named = objectShape({ name: stringShape({ min: 1 }) })
const aged = objectShape({ age: integerShape({ min: 0 }) })

const person = intersectionShape(named, aged)
// Infer<typeof person> = { readonly name: string } & { readonly age: number }
// JSON Schema (members MERGED — NOT a naive allOf):
// { type: 'object', properties: { name: …, age: … }, required: ['name','age'],
//   additionalProperties: false }
```

A value satisfies an `intersectionShape` iff it satisfies **every** member — the runtime mirror of `intersectionOf` in [validators.md](validators.md). `Infer` resolves it to the `&`-intersection of the members' inferred types. The compiled value carries the union of all members' keys (each key validated/parsed/generated by its owning member); a closed-object member does not reject keys contributed by sibling members.

**Schema emission is a MERGE, not a naive `allOf`.** JSON-Schema `allOf` applies every sub-schema *independently* to the whole instance, so an `allOf` of *closed* object members (the default) would be **unsatisfiable** — each closed member would reject the keys contributed by its siblings as "additional" — even though the guard accepts the merged object. `compileSchema` therefore merges the effective leaf object members into one object schema: the **union of their `properties`**, the **union of their `required`**, and `additionalProperties` reconciled exactly as the guard does (closed iff *every* leaf member is closed, then closed over the **union** of known keys; open if any leaf is open). A property key declared by **more than one member** is emitted as the per-key conjunction `{ allOf: [<member-A's value schema>, <member-B's value schema>, …] }` (a single declarer keeps its bare value schema — no needless wrapper); its accept-set for that key is the **intersection** of the members' per-key accept-sets — exactly what the guard enforces (each member's guard checks its own declared key conjunctively). So a guard-uninhabited overlap (`{a:string} ∩ {a:integer}`) and a compatible-but-distinct overlap (`{a:string,minLength:1} ∩ {a:string,maxLength:5}`) both round-trip **exactly** — not the pre-fix overwrite that kept only the last member's per-key schema. This keeps the emitted schema's accept-set equal to the guard's (round-trip parity). **Members must be object shapes — `objectShape`, `recordShape`, or a nested `intersectionShape`** (transitively object-only: a nested `intersectionShape` was itself validated object-only by its own builder call, so the merge stays sound): intersecting non-object shapes is degenerate (`string & number` is `never`; primitive/array intersections have no sound, generic parser/generator merge), so — like an empty `literalShape()` / `unionShape()` (uninhabited → throws at build) — calling `intersectionShape()` with no members, or with any member that is neither an object shape nor a nested `intersectionShape`, throws at build time (§13 — a programmer error caught at the boundary).

### `lazyShape()` — recursive / self-referential shapes (`$ref`)

`lazyShape(thunk)` is the **legitimate recursion boundary** — the runtime mirror of `lazyOf` in [validators.md](validators.md), compiled to JSON-Schema `$ref` / `$defs`. The `thunk` is invoked lazily (never at build time), so it can close over a binding assigned *after* the shape is declared — the only way to express a genuinely self-referential shape:

```ts
import { arrayShape, compileContract, lazyShape, numberShape, objectShape } from '@elements/core'
import type { ContractShape } from '@elements/core'

// Recommended consumer pattern: a NAMED interface + a lazyShape back-edge.
interface Tree {
	readonly value: number
	readonly children: readonly Tree[]
}

const treeShape: ContractShape = objectShape({
	value: numberShape(),
	children: arrayShape(lazyShape(() => treeShape)),
})

const tree = compileContract(treeShape)
tree.is({ value: 0, children: [{ value: 1, children: [] }] }) // true — recurses over finite data
```

Why a `lazyShape` compiles where a raw structural cycle throws: every compiler first runs an acyclicity check that throws a precise `Error` (`cyclic ContractShape: use a lazy/deferred shape for recursion`) on any **structural** shape cycle. A `lazy` node is a **terminal** for that check — its thunk is *not* invoked while checking — so a shape recursive *through* a `lazyShape` has no static back-edge and compiles, while a non-lazy self-reference (a property whose shape *is* an ancestor object) still throws. `lazyShape` is the **only** sanctioned recursion mechanism.

Behavioural contract:

- **schema** — emits `{ $ref: '#/$defs/Lazyn' }` and hoists the resolved definition onto a root `$defs` (one named definition per distinct thunk, so a recursive schema is finite, not infinitely nested). The emitted schema is `isJsonSchema`-valid. *Limitation (Phase E seam):* this is a single self-contained `$defs` block with deterministic per-compile names (`Lazy0`, `Lazy1`, …); cross-document `$id` resolution and `$ref` dedup across separate `compileSchema` calls are completed in Phase E.
- **guard / parse** — delegate verbatim to the resolved inner shape (memoized per compilation so the self-reference reuses one compiled function); recursion over genuinely recursive **data** terminates because the data is finite. **Adversarial data is §13-safe at runtime:** the compiled recursive‑lazy guard/parser thread a per‑compilation ancestor tracker (a `WeakSet` of the objects currently on the recursion path — added on enter, removed on exit) plus a generous depth backstop, so a **cyclic** value (`const n = { value: 1 }; n.next = n`) yields `false` (guard) / `undefined` (parser) and a **pathologically deep acyclic** value is capped the same way — **never a thrown `RangeError`**. A shared‑but‑acyclic substructure (the same finite object referenced under two keys — a DAG) is *not* mis‑flagged as a cycle, and genuinely finite recursive data still validates/parses correctly.
- **generate** — bounded: a recursive lazy shape generates a finite nested value up to a small fixed lazy-recursion depth, then collapses the recursive child to its **minimal inhabitant** (array → `[]`, optional → absent, nullable → `null`, object → required keys only). The generated value still satisfies the guard and is deterministic. A required, non-optional, infinitely-deep recursive child (`objectShape({ self: lazyShape(() => self) })` — no terminating container) has **no finite inhabitant**: `generate` throws a precise `Error` (`recursive shape has no finite inhabitant within depth N`) rather than recurse forever or emit a guard-violating value (schema/guard/parse do not need a finite inhabitant and still compile).
- **`Infer`** — `Infer<lazyShape(() => X)>` resolves one level to `Infer<X>` for a concrete `X`. For the self-recursive consumer pattern above (the thunk's static return type is the wide `ContractShape`), `Infer` is `unknown` — a genuinely self-recursive TS type needs a named interface boundary, so **supply the `interface Tree { … }`** for the precise static type while the runtime contract stays fully recursive.

### `defaultShape()` — inner shape + an advisory default

```ts
import { compileParser, defaultShape, integerShape, objectShape, stringShape } from '@elements/core'

const retries = defaultShape(integerShape({ min: 0 }), 3)
// Infer<typeof retries> = number   JSON Schema: { type: 'integer', minimum: 0, default: 3 }

const config = objectShape({
	name: stringShape({ min: 1 }),
	retries: defaultShape(integerShape({ min: 0 }), 3),
})
const parse = compileParser(config)
parse({ name: 'job' })             // { name: 'job', retries: 3 } — default applied on absence
parse({ name: 'job', retries: 5 }) // { name: 'job', retries: 5 } — present value parsed through inner
```

`defaultShape(inner, value)` is `inner` plus a JSON-Schema `default`. The `value` **must be a valid instance of `inner`** — `defaultShape` validates it at build time and **throws** if it fails `inner`'s guard (a default that fails its own inner is a programmer error; validating it keeps the generator∘guard / parse↔guard contracts sound by construction).

The behavioural contract is a **deliberate, useful asymmetry** (it mirrors `optionalShape`'s `undefined` handling — it is intended, not a bug):

- **guard** delegates **verbatim** to `inner`'s guard. A default is *advisory metadata, not optionality*: the guard does **not** accept `undefined` (nor auto-apply the default) just because a default exists. So at the object level a `defaultShape(integerShape(), 3)` property is **required** by the guard, while a `defaultShape(optionalShape(x), …)` property may be absent (its *inner* is optional).
- **parse** applies the default on **absence**: parsing `undefined` returns the default (a *fresh deep copy* for a non-primitive default — the same alias-free policy as `constShape()`); any other input parses through `inner`. Inside an object, an absent `default` property is filled from the default rather than failing the record.
- This means the **guard** on `undefined` is `inner`'s guard on `undefined` (false unless `inner` is itself optional) yet **parse** on `undefined` is the default. The parse↔guard **A/B/C** invariants still hold: the default is build-validated to satisfy `inner`'s guard, so *every* parser output (the default **or** a parsed-inner value) is guard-valid (clause C); A/B are inherited from `inner`'s own sound parser for every non-`undefined` input.
- **generate** generates from `inner` (the default is just *one* valid instance — generating from inner preserves variability; `generator∘guard` still holds because inner's generator is sound).
- **`Infer`** is `Infer<inner>` — the advisory default does not change the static type (the value is still required at the type level; the parser fills it on absence at runtime).

A non-lazy structural cycle *through* a `defaultShape` (its `inner` is traversed by the acyclicity check, exactly like `optionalShape` / `nullableShape`) still throws the precise cyclic `Error`; a `lazyShape` boundary inside the default's inner still breaks the cycle and compiles.

### `rawShape()` — JSON Schema escape hatch

```ts
import { rawShape } from '@elements/core'

const anyValue = rawShape({ description: 'Default value' })
```

Embeds an arbitrary JSON Schema fragment for properties that accept any value or need keywords beyond the shape DSL. The compiled guard always returns `true`, the parser passes the value through unchanged, the generator emits `null` (the smallest valid JSON value — a placeholder, since no constraints exist to vary over), and `Infer` resolves it to `unknown` (the runtime type can't be recovered from the DSL). Use sparingly.

### Fail-fast build throws (§13)

Certain mistakes are programmer errors that would silently corrupt compiled output if undetected. The shape builders and the `defaultShape` builder throw at construction time — the boundary where the cause is obvious — rather than letting the error surface inside a compiler:

| Cause | Throws at |
| ----- | --------- |
| `literalShape()` with no arguments | `literalShape()` call |
| `unionShape()` / `oneOfShape()` with no arguments | `unionShape()` / `oneOfShape()` call |
| `intersectionShape()` with no members, or with a member that is neither an object shape nor a nested `intersectionShape` | `intersectionShape()` call |
| `stringShape` / `arrayShape` bounds: non-finite, negative, or `min > max` | `stringShape()` / `arrayShape()` call |
| `numberShape` / `integerShape` bounds: non-finite, or `min > max` | `numberShape()` / `integerShape()` call |
| `defaultShape(inner, value)` where `value` does not satisfy `inner`'s guard | `defaultShape()` call |
| A non-lazy structural cycle in the shape tree | first `compile*()` call on that shape — throws `'cyclic ContractShape: use a lazy/deferred shape for recursion'` |
| A required, non-optional recursive `lazyShape` with no finite inhabitant | `compileContract(shape).generate(random)` / `compileGenerator(shape, random)` — throws `'recursive shape has no finite inhabitant within depth N: …'` |
| A `oneOfShape` whose variants overlap so heavily that no exactly-one-matching value can be generated within the retry bound | `compileContract(shape).generate(random)` / `compileGenerator(shape, random)` — throws `'oneOf has no exactly-one-matching value within N generation attempts: …'` |

The compiled guard never throws on invocation; only build/compile-time boundaries do. `lazyShape` itself (the builder) never throws — deferral is its purpose.

### Object-root schema

```ts
import {
	booleanShape,
	compileSchema,
	literalShape,
	objectShape,
	oneOfShape,
	optionalShape,
	rawShape,
	recordShape,
	stringShape,
} from '@elements/core'

const parameters = compileSchema(
	objectShape({
		operation: literalShape('create', 'read', 'update', 'delete'),
		id: optionalShape(stringShape({ description: 'Entity identifier' })),
		data: optionalShape(objectShape({}, { additionalProperties: true })),
		force: optionalShape(oneOfShape(stringShape(), booleanShape())),
		env: optionalShape(recordShape(stringShape())),
		value: optionalShape(rawShape({ description: 'Any value' })),
	}),
)
// Result type: JsonSchemaObject
// { type: 'object', properties: { ... }, required: ['operation'], additionalProperties: false }
```

The `ObjectShape` overload of `compileSchema()` narrows the return to `JsonSchemaObject` — no separate object-schema builder needed.

### Inference with `Infer<S>`

`Infer<S>` maps any `ContractShape` to its static TypeScript type at compile time — structural, recursive, optional-aware:

```ts
import { arrayShape, literalShape, nullableShape, numberShape, objectShape, optionalShape, stringShape } from '@elements/core'
import type { Infer } from '@elements/core'

const shape = objectShape({
	name: stringShape(),
	tags: arrayShape(stringShape()),
	role: literalShape('admin', 'member'),
	bio: optionalShape(stringShape()),
	score: nullableShape(numberShape()),
})

type User = Infer<typeof shape>
// {
//   readonly name: string
//   readonly tags: readonly string[]
//   readonly role: 'admin' | 'member'
//   readonly bio?: string
//   readonly score: number | null
// }
```

Optional properties wrapped in `optionalShape()` surface as true optional fields (and are omitted from the JSON Schema `required` array); `nullableShape()` adds `| null`; literal tuples become string-literal unions.

**Forward-emission fidelity — the one stricter known-divergence.** For everything JSON Schema can represent, `compileSchema(s)` and `compileGuard(s)` describe the **exact same value set** (the round-trip oracle: the inverse subsystem's `compileSchemaGuard` applied to `compileSchema(s)` ≡ `compileGuard(s)`). A **nested** `optionalShape()` property round-trips exactly — absence is carried structurally by the enclosing object omitting the key from `required` (the inverse object matcher validates a property's schema only when the key is present). There is exactly **one** stricter divergence: a **bare top-level `optionalShape()`** has no enclosing `required` to carry absence and JSON Schema has no value-level `undefined`, so the emitted bare-inner schema rejects exactly the single value `undefined` that the guard accepts — **and nothing wider** (the schema is strictly *tighter* than the guard by exactly `{undefined}` at a bare document root). This is the deliberate forward-direction analogue of the inverse subsystem's single stricter divergence (open-tail array → closed tuple — see [schema.md](schema.md) §Contract 7). It is **not** the prior degenerate `{ anyOf: [inner, {}] }`: JSON-Schema 2020-12 `{}` accepts every instance, so that collapsed to a universally-true root that erased all of `inner`'s structure.

### Practices

- **Define shapes as named constants.** One shape reused across schema, guard, parser, and generator is the whole point — never re-declare the same structure per operation.
- **`compileContract()` for the full pipeline; `compileSchema()` for schema-only.** Skip the full contract when you only need the JSON Schema (for external validation or interop).
- **`compileSchema(objectShape(...))` for an object-root schema.** An object-root schema is just a contract compiled from an `objectShape()`.
- **`createRandom()` with a fixed seed for reproducible fixtures.** Same seed, same generated data, every run.
- **Wrap optional object fields in `optionalShape()`.** It is what makes a property truly optional in both the inferred type and the schema `required` set.
- **`oneOfShape()` for exclusive unions, `recordShape()` for dictionaries, `rawShape()` only as a last resort.**

---

## Tests

- [`tests/guides/contracts.test.ts`](../tests/guides/contracts.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real export in `src/core/{shapers,compilers,helpers}.ts`.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder (including `oneOfShape`, `recordShape`, `rawShape`, `additionalProperties`) produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — `compileSchema` / `compileGuard` / `compileParser` / `compileGenerator` / `compileContract` behaviour, including `additionalProperties`, `oneOf`, raw passthrough, nullable, and object-root schema typing.

---

## See also

- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
- [parsers.md](parsers.md) — the flat value / field / env parsers the contract compilers reuse for primitive coercion.
- [schema.md](schema.md) — the inverse subsystem; the round-trip back from a JSON Schema into this forward pipeline.
- [elements.md](elements.md) — sibling spec for the TS public API surface and its bidirectional parity contract.
