# Shapers

> The shape DSL — declare a data shape once with const-generic builders; the compilers derive JSON Schema, a guard, a parser, and a generator from it. Package: `@elements/core`. Source: [src/core/shapers.ts](../src/core/shapers.ts).

## Surface

A **shape** is a single declarative description of a data structure. You build one with the shaper DSL — a flat family of `*Shape` builder functions — and then hand it to the forward compilers ([compilers.md](compilers.md)) to derive a JSON Schema document, a runtime type guard, an input parser, and a seeded generator. The shape is the **single source of truth**: schema, guard, parser, and generator are all derived from one declaration and cannot drift from one another.

Each builder returns a `ContractShape` value. Builders preserve const-generic types, so a consumer reading `typeof shape` keeps the precise shape literal (the exact `'admin' | 'member'` union, the exact tuple arity, the exact const value). No builder mutates or compiles anything — construction is pure data assembly, with the single exception of the build-time programmer-error throws documented below (§13).

### Shape builders

Each builder produces a `ContractShape` node. The "JSON Schema (compiled)" column shows what the compilers ([compilers.md](compilers.md)) emit for that node; the inferred type is what `typeof shape`-driven inference preserves.

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
| `defaultShape()`  | inner schema + `default: <value>`      | inner's type (default is advisory; type unchanged) |
| `lazyShape()`     | `{ $ref: '#/$defs/Lazyn' }` + root `$defs` | inner's type (recursive: supply a named `interface`) |
| `recordShape()`   | `{ type: 'object', additionalProperties: {...} }` | `Record<string, T>` |
| `rawShape()`      | pass-through fragment                  | `unknown`               |

Builder option bags are typed in [src/core/types.ts](../src/core/types.ts): `StringShapeOptions` (`min`, `max`, `pattern`, `description`), `NumberShapeOptions` (`min`, `max`, `integer`, `description`), `BooleanShapeOptions` (`description`), `ArrayShapeOptions` (`min`, `max`, `description`), and `ObjectShapeOptions` (`additionalProperties`, `description`).

### The shared bounds guard

`validateBounds(label, min, max, lengthBound)` (in [src/core/helpers.ts](../src/core/helpers.ts)) is the build-time bounds check shared by the length/value-bounded shape builders. It is a §13 build-time programmer-error guard — **NOT** a runtime guard: it throws when a `min`/`max` is non-finite, negative where nonsensical (`lengthBound` is `true` for string/array length), or `min > max`. `stringShape()`, `numberShape()`, `integerShape()`, and `arrayShape()` invoke it at their build boundary so an inverted or malformed bound surfaces at the cause — the builder call — rather than deep inside a compiler where the symptom (guard-failing generated output, parser/guard disagreement) would appear far from its origin. It is documented here, alongside the builders it serves, because it is the shape-builders' bounds check; every other `helpers.ts` export is documented in [compilers.md](compilers.md).

### Object-root shapes

There is no separate object-schema builder. An object-root shape is an ordinary `objectShape(...)`; the `ObjectShape` overload of the schema compiler narrows the emitted document to `JsonSchemaObject` (see [compilers.md](compilers.md)). `recordShape(values)` is the convenience form of `objectShape({}, { additionalProperties: values })` for `Record<string, T>`-style structures with no fixed keys.

> Guards narrow, parsers coerce, contracts derive — see [validators.md](validators.md) for the full three-surface framing. The flat value parsers ([parsers.md](parsers.md)) are a standalone surface the contract compilers reuse internally for primitive coercion, but they are not part of the shape DSL.

---

## Contract

These invariants hold across `src/core/shapers.ts` (plus `validateBounds` from `src/core/helpers.ts`) ↔ `shapers.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide — every builder written in call form, plus `validateBounds()` — is a real `export function` in [src/core/shapers.ts](../src/core/shapers.ts), or is `validateBounds` from [src/core/helpers.ts](../src/core/helpers.ts) (the shape-builders' bounds check, documented here by user decision). A renamed or removed export breaks the gate until the doc is reconciled.
2. **SOURCE → DOC.** Every `export function` in `src/core/shapers.ts`, plus `validateBounds`, is documented (backticked) in this guide — the builder surface is exhaustive, not a sample. The remaining `src/core/helpers.ts` exports are documented in [compilers.md](compilers.md); the forward compilers in [src/core/compilers.ts](../src/core/compilers.ts) are documented there too.
3. **TYPES ARE THE SOURCE OF TRUTH.** `ContractShape`, and every `*ShapeOptions` bag, are declared first in [src/core/types.ts](../src/core/types.ts). Builders conform to those types, never the reverse.
4. **DERIVED, NOT DUPLICATED.** A shape is plain data. Schema, guard, parser, and generator are all compiled from the one shape by the forward compilers — no operation is hand-written per shape. Adding a shape variant means extending the discriminated `ContractShape` union (and every compiler `switch`), never patching call sites.
5. **FAIL-FAST AT THE BUILD BOUNDARY (§13).** Certain mistakes are programmer errors that would silently corrupt compiled output if undetected. The builders throw at construction time — the boundary where the cause is obvious — rather than letting the error surface inside a compiler. The full table is in [Fail-fast build throws](#fail-fast-build-throws-13) below.

Enforced by:

- [`tests/guides/shapers.test.ts`](../tests/guides/shapers.test.ts) — every documented call-form API resolves to a real `src/core/shapers.ts` export (or `validateBounds`), and every such export is documented here.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — schema / guard / parser / generator behaviour for every shape, including `additionalProperties`, `oneOf`, raw passthrough, and object-root schema typing.

---

## Patterns

### Quick start

```ts
import {
	integerShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@elements/core'

// Define a shape — the single source of truth. Compile it with the
// forward pipeline (see compilers.md): compileContract / compileSchema.
const userShape = objectShape({
	name: stringShape({ min: 1, max: 80, description: 'Display name' }),
	age: integerShape({ min: 0, max: 120 }),
	role: literalShape('admin', 'member', 'guest'),
	bio: optionalShape(stringShape({ max: 500 })),
})

// typeof userShape preserves the precise literal union for `role`
// ('admin' | 'member' | 'guest') and the optional `bio`.
```

One shape reused across schema, guard, parser, and generator is the whole point — define shapes as named constants, never re-declare the same structure per operation.

### `unionShape()` vs `oneOfShape()`

```ts
import { booleanShape, integerShape, oneOfShape, stringShape, unionShape } from '@elements/core'

const id = unionShape(stringShape(), integerShape())
// JSON Schema: { anyOf: [{ type: 'string' }, { type: 'integer' }] }

const idOrFlag = oneOfShape(stringShape(), booleanShape())
// JSON Schema: { oneOf: [{ type: 'string' }, { type: 'boolean' }] }
```

These two differ in both the emitted JSON Schema keyword **and** the runtime semantics the compilers give them:

- **`unionShape()` (`anyOf`)** — variants checked in order; the first variant whose guard accepts the raw input wins. One or more matches is fine.
- **`oneOfShape()` (`oneOf`)** — ALL variant guards are checked on the raw input; the result is valid iff **exactly one** guard accepts it (zero or ≥2 matches → guard rejects, parser yields nothing). The parser never silently picks a winner when two variants overlap.

Both throw at build time when called with no arguments (an empty union is uninhabited — §13). The deeper generation semantics for an overlapping `oneOf` (the seeded retry, and the ill-posed-`oneOf` throw) live with the generator in [compilers.md](compilers.md), since they are a property of compilation, not of the builder.

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
// JSON Schema: { type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }],
//               items: false, minItems: 2, maxItems: 2 }

const empty = tupleShape() // the inhabited `readonly []` type — only `[]` is valid
```

Each argument is the shape for that position. The compiled guard accepts an array of **exactly** that arity where every element satisfies its positional shape (the runtime mirror of `tupleOf` in [validators.md](validators.md)); the parser parses each position with that position's parser and fails on any arity or positional mismatch. The closed-tuple JSON Schema is the standard `prefixItems` + `items: false` + `minItems === maxItems === arity` encoding. Unlike an empty `literalShape()` / `unionShape()` (uninhabited → throws at build), an empty `tupleShape()` is the valid, inhabited `[]` type and does **not** throw.

### `constShape()` — a single fixed JSON value (`const`)

```ts
import { constShape, objectShape, stringShape } from '@elements/core'

const kind = constShape('user')
// JSON Schema: { const: 'user' }

const origin = constShape({ x: 0, y: 0 })
// JSON Schema: { const: { x: 0, y: 0 } }

// A fixed discriminant field inside an object:
const userEvent = objectShape({ kind: constShape('user'), name: stringShape({ min: 1 }) })
```

`constShape(value)` is the JSON-Schema `const` — a value valid iff it **equals** `value`. The **equality rule** (documented and consistent across the codebase): `const` is a *structural* value match — primitive leaves are compared with `Object.is` (so `NaN` matches `NaN`, and `+0` ≠ `-0` — exactly the equality `literalOf` in [validators.md](validators.md) uses), while arrays and plain objects are compared by recursive structural deep-equality (identical own-key sets, every value deep-equal; key order irrelevant — this is the `deepEqual` walk documented in [compilers.md](compilers.md)). The parser returns the **canonical** value (a *fresh deep copy* for a non-primitive `value`, so a shared mutable reference is never handed out — the same alias-free policy the object parser follows); the generator deterministically emits that same canonical value (also a fresh copy). Unlike `literalShape()` (an enum of *primitives*, `Set`-membership guard), `constShape()` accepts a single value that may be *structured* (object/array) and is always inhabited, so — unlike an empty `literalShape()` / `unionShape()` — it never throws at build. The const generic preserves the literal type, so a consumer reading `typeof shape` keeps the exact type of `value`.

### `intersectionShape()` — values satisfying all members (merged object schema)

```ts
import { integerShape, intersectionShape, objectShape, stringShape } from '@elements/core'

const named = objectShape({ name: stringShape({ min: 1 }) })
const aged = objectShape({ age: integerShape({ min: 0 }) })

const person = intersectionShape(named, aged)
// JSON Schema (members MERGED — NOT a naive allOf):
// { type: 'object', properties: { name: …, age: … }, required: ['name','age'],
//   additionalProperties: false }
```

A value satisfies an `intersectionShape` iff it satisfies **every** member — the runtime mirror of `intersectionOf` in [validators.md](validators.md). The accepted value is the `&`-intersection of the members' value types. The compiled value carries the union of all members' keys (each key validated/parsed/generated by its owning member); a closed-object member does not reject keys contributed by sibling members.

**Members must be object shapes — `objectShape`, `recordShape`, or a nested `intersectionShape`** (transitively object-only: a nested `intersectionShape` was itself validated object-only by its own builder call, so the merge stays sound). Intersecting non-object shapes is degenerate (`string & number` is `never`; primitive/array intersections have no sound, generic parser/generator merge), so — like an empty `literalShape()` / `unionShape()` (uninhabited → throws at build) — calling `intersectionShape()` with no members, or with any member that is neither an object shape nor a nested `intersectionShape`, throws at build time (§13 — a programmer error caught at the boundary). The full schema-emission MERGE behaviour (per-key conjunction, `additionalProperties` reconciliation, round-trip parity) is a property of the compiler and is documented in [compilers.md](compilers.md).

### `lazyShape()` — recursive / self-referential shapes (`$ref`)

`lazyShape(thunk)` is the **legitimate recursion boundary** — the runtime mirror of `lazyOf` in [validators.md](validators.md), compiled to JSON-Schema `$ref` / `$defs`. The `thunk` is invoked lazily (never at build time), so it can close over a binding assigned *after* the shape is declared — the only way to express a genuinely self-referential shape:

```ts
import { arrayShape, lazyShape, numberShape, objectShape } from '@elements/core'
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
```

Why a `lazyShape` compiles where a raw structural cycle throws: every compiler first runs an acyclicity check that throws a precise `Error` (`cyclic ContractShape: use a lazy/deferred shape for recursion`) on any **structural** shape cycle. A `lazy` node is a **terminal** for that check — its thunk is *not* invoked while checking — so a shape recursive *through* a `lazyShape` has no static back-edge and compiles, while a non-lazy self-reference (a property whose shape *is* an ancestor object) still throws. `lazyShape` is the **only** sanctioned recursion mechanism.

- **static type** — a genuinely self-recursive shape (annotate the binding `ContractShape` so the thunk can close over it) has no precise structural TypeScript type, so **supply the `interface Tree { … }`** for the static type while the runtime contract stays fully recursive.
- The compiled schema/guard/parser/generator behaviour for a recursive `lazyShape` — the `$ref`/`$defs` emission, the runtime cycle/depth safety, the bounded minimal-inhabitant generation, and the "no finite inhabitant" §13 generation throw — are properties of compilation and are documented in full in [compilers.md](compilers.md).

### `defaultShape()` — inner shape + an advisory default

```ts
import { defaultShape, integerShape, objectShape, stringShape } from '@elements/core'

const retries = defaultShape(integerShape({ min: 0 }), 3)
// JSON Schema: { type: 'integer', minimum: 0, default: 3 }

const config = objectShape({
	name: stringShape({ min: 1 }),
	retries: defaultShape(integerShape({ min: 0 }), 3),
})
// parse({ name: 'job' })             → { name: 'job', retries: 3 }  (default applied on absence)
// parse({ name: 'job', retries: 5 }) → { name: 'job', retries: 5 }  (present value parsed through inner)
```

`defaultShape(inner, value)` is `inner` plus a JSON-Schema `default`. The `value` **must be a valid instance of `inner`** — `defaultShape()` validates it at build time and **throws** if it fails `inner`'s guard (a default that fails its own inner is a programmer error; validating it keeps the generator∘guard / parse↔guard contracts sound by construction). Building the shape therefore runs `inner`'s guard once at construction time, which also runs the standard acyclicity check on `inner` (so a non-lazy structural cycle in `inner` is caught here too, consistent with every other compiler boundary).

The behavioural contract is a **deliberate, useful asymmetry** (it mirrors `optionalShape()`'s `undefined` handling — it is intended, not a bug):

- **guard** delegates **verbatim** to `inner`'s guard. A default is *advisory metadata, not optionality*: the guard does **not** accept `undefined` (nor auto-apply the default) just because a default exists. So at the object level a `defaultShape(integerShape(), 3)` property is **required** by the guard, while a `defaultShape(optionalShape(x), …)` property may be absent (its *inner* is optional).
- **parse** applies the default on **absence**: parsing `undefined` returns the default (a *fresh deep copy* for a non-primitive default — the same alias-free policy as `constShape()`); any other input parses through `inner`.
- **generate** generates from `inner` (the default is just *one* valid instance — generating from inner preserves variability).
- **static type** — a `defaultShape` carries the SAME static type as its `inner`; the advisory default does not change it.

The exact parse↔guard A/B/C reasoning for this asymmetry, and the schema-emission detail, are documented with the compilers in [compilers.md](compilers.md).

### `rawShape()` — JSON Schema escape hatch

```ts
import { rawShape } from '@elements/core'

const anyValue = rawShape({ description: 'Default value' })
```

Embeds an arbitrary JSON Schema fragment for properties that accept any value or need keywords beyond the shape DSL. The compiled guard always returns `true`, the parser passes the value through unchanged, the generator emits `null` (the smallest valid JSON value — a placeholder, since no constraints exist to vary over), and its static type is `unknown` (the runtime type can't be recovered from the DSL). Use sparingly.

### Fail-fast build throws (§13)

Certain mistakes are programmer errors that would silently corrupt compiled output if undetected. The shape builders throw at construction time — the boundary where the cause is obvious — rather than letting the error surface inside a compiler:

| Cause | Throws at |
| ----- | --------- |
| `literalShape()` with no arguments | `literalShape()` call |
| `unionShape()` / `oneOfShape()` with no arguments | `unionShape()` / `oneOfShape()` call |
| `intersectionShape()` with no members, or with a member that is neither an object shape nor a nested `intersectionShape` | `intersectionShape()` call |
| `stringShape` / `arrayShape` bounds: non-finite, negative, or `min > max` | `stringShape()` / `arrayShape()` call (via `validateBounds()`) |
| `numberShape` / `integerShape` bounds: non-finite, or `min > max` | `numberShape()` / `integerShape()` call (via `validateBounds()`) |
| `defaultShape(inner, value)` where `value` does not satisfy `inner`'s guard | `defaultShape()` call |

`validateBounds()` is the single shared check behind the four bounded-builder rows: it normalizes the message and centralizes the "non-finite / negative / inverted" policy so every bounded builder fails identically. The cycle-detection and recursive-generation §13 throws are *compile/generate*-time boundaries (not builder calls) and are tabulated in [compilers.md](compilers.md). `lazyShape()` itself (the builder) never throws — deferral is its purpose.

### Practices

- **Define shapes as named constants.** One shape reused across schema, guard, parser, and generator is the whole point — never re-declare the same structure per operation.
- **Wrap optional object fields in `optionalShape()`.** It is what makes a property truly optional in both the inferred type and the schema `required` set.
- **`oneOfShape()` for exclusive unions, `recordShape()` for dictionaries, `rawShape()` only as a last resort.**
- **`lazyShape()` is the only recursion mechanism.** A raw structural cycle throws at the first compile; wrap the back-edge in `lazyShape()` and supply a named `interface` for the static type.
- **Let bounds fail loud.** Pass `min`/`max` honestly — `validateBounds()` rejects an inverted or non-finite bound at the builder call, not deep in a compiler.

---

## Tests

- [`tests/guides/shapers.test.ts`](../tests/guides/shapers.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real export in `src/core/shapers.ts` (or `validateBounds` from `src/core/helpers.ts`), and every such export is documented here.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder (including `oneOfShape`, `recordShape`, `rawShape`) produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — `compileSchema` / `compileGuard` / `compileParser` / `compileGenerator` / `compileContract` behaviour over these shapes, including `additionalProperties`, `oneOf`, raw passthrough, nullable, and object-root schema typing.

---

## See also

- [compilers.md](compilers.md) — the forward pipeline that turns these shapes into JSON Schema / guard / parser / generator; documents the remaining `src/core/helpers.ts` exports.
- [parsers.md](parsers.md) — the flat value / field / format parsers the contract compilers reuse for primitive coercion.
- [validators.md](validators.md) — the runtime type-guard library; `tupleOf` / `intersectionOf` / `lazyOf` are the guard mirrors of the like-named shape builders.
- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
