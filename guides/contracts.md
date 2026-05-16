# Contracts

> Define a shape once — get JSON Schema, a runtime guard, an input parser, and a seeded generator for free. Package: `@elements/core`. Source: [src/core/](../src/core/).

## Surface

A **contract** is a single data shape compiled into four cohesive operations. You describe the shape once with the builder DSL; the compilers derive everything else at construction time. Subsequent calls are pure lookups against pre-compiled closures.

| Operation  | Purpose                                     | Output            |
| ---------- | ------------------------------------------- | ----------------- |
| `schema`   | JSON Schema for tool / agent integration    | `JsonSchema`      |
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
| `arrayShape()`    | `{ type: 'array', items: {...} }`      | `readonly T[]`          |
| `objectShape()`   | `{ type: 'object', properties: {...} }`| `{ key: T; opt?: U }`   |
| `unionShape()`    | `{ anyOf: [...] }`                     | `A \| B`                |
| `oneOfShape()`    | `{ oneOf: [...] }`                     | `A \| B`                |
| `optionalShape()` | delegates to inner shape               | `T \| undefined`        |
| `nullableShape()` | `{ anyOf: [inner, { type: 'null' }] }` | `T \| null`             |
| `recordShape()`   | `{ type: 'object', additionalProperties: {...} }` | `Record<string, T>` |
| `rawShape()`      | pass-through fragment                  | `unknown`               |

Builder option bags are typed in [src/core/types.ts](../src/core/types.ts): `StringShapeOptions` (`min`, `max`, `pattern`, `description`), `NumberShapeOptions` (`min`, `max`, `integer`, `description`), `BooleanShapeOptions` (`description`), `ArrayShapeOptions` (`min`, `max`, `description`), and `ObjectShapeOptions` (`additionalProperties`, `description`).

### The compile pipeline

The compilers in [src/core/compilers.ts](../src/core/compilers.ts) are the low-level functions that turn a shape into a single operation. Use them directly for custom pipelines, or let a factory wire them together.

| Compiler              | Produces                                                         |
| --------------------- | ---------------------------------------------------------------- |
| `compileSchema()`     | a JSON Schema document (`JsonSchemaObject` for an object root)    |
| `compileGuard()`      | `(value: unknown) => boolean` runtime predicate                  |
| `compileParser()`     | `(value: unknown) => unknown` coercing parser                    |
| `compileGenerator()`  | a deterministic value from a `RandomFunction` seed               |
| `compileContract()`   | a `ContractInterface<T>` bundling all four                       |

### Factories

The factories in [src/core/factories.ts](../src/core/factories.ts) are the ergonomic entry points:

- `createContract(shape)` — the full `ContractInterface<Infer<S>>`: `schema`, `is`, `parse`, `generate`. Delegates to `compileContract()`.
- `createSchema(shape)` — JSON Schema only, via `compileSchema()` directly — produces the same JSON Schema value as `createContract(shape).schema` but without constructing the guard, parser, or generator. An `ObjectShape` argument narrows the return to `JsonSchemaObject`.

### Seeded generation

`createRandom(seed)` (in [src/core/helpers.ts](../src/core/helpers.ts)) returns a deterministic Mulberry32 PRNG: a pure `() => number` yielding the same `[0, 1)` sequence for the same 32-bit seed. Feed it to the contract's `generate` method (or directly to `compileGenerator()`) for reproducible seed data across test runs.

### Tool / agent schemas

A tool input schema is just an object-root JSON Schema, so it uses the same compiler path as every other contract: `compileSchema(objectShape(...))` (or `createSchema(objectShape(...))`). The `ObjectShape` overload narrows the result to `JsonSchemaObject`, and the `ToolDefinition` / `ToolOptions` interfaces in [src/core/types.ts](../src/core/types.ts) type a `parameters` field as exactly that. There is no separate tool-schema builder — tool inputs are object-root contracts.

> The flat value parsers (`parseString`, `parseNumber`, field extractors, env / JSON helpers) live in a sibling module and are documented in [parsers.md](parsers.md). The contract compilers reuse them internally for primitive coercion, but they are a standalone surface — not part of the contract DSL.

---

## Contract

These invariants hold across `src/core/{types,shapers,compilers,factories,helpers}.ts` ↔ `contracts.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide — every builder, compiler, factory, and helper written in call form — is a real `export function` / `export const` in one of [src/core/shapers.ts](../src/core/shapers.ts), [src/core/compilers.ts](../src/core/compilers.ts), [src/core/factories.ts](../src/core/factories.ts), or [src/core/helpers.ts](../src/core/helpers.ts). A renamed or removed export breaks the gate until the doc is reconciled.
2. **TYPES ARE THE SOURCE OF TRUTH.** `ContractShape`, `Infer<S>`, `ContractInterface<T>`, the JSON Schema family (`JsonSchema`, `JsonSchemaObject`, `JsonSchemaDefinition`), the Tool family (`ToolDefinition`, `ToolCall`, `ToolResult`, `ToolOptions`), and every `*ShapeOptions` bag are declared first in [src/core/types.ts](../src/core/types.ts). Builders and compilers conform to those types, never the reverse.
3. **DERIVED, NOT DUPLICATED.** Schema, guard, parser, and generator are all compiled from the one shape. No operation is hand-written per shape — adding a shape variant means extending the discriminated `ContractShape` union and every compiler `switch`, never patching call sites.

Enforced by:

- [`tests/guides/contracts.test.ts`](../tests/guides/contracts.test.ts) — every documented call-form API resolves to a real `src/core` export.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — schema / guard / parser / generator behaviour, including `additionalProperties`, `oneOf`, raw passthrough, and object-root schema typing.

---

## Patterns

### Quick start

```ts
import {
	createContract,
	createRandom,
	createSchema,
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
const userContract = createContract(userShape)

// 3. JSON Schema (e.g. for tool registration).
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
const schema = createSchema(userShape)
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

Both behave identically at runtime — variants are checked in order, first match wins. The only difference is the emitted JSON Schema keyword (`anyOf` vs `oneOf`), which matters for tool parameter schemas that must express exclusivity.

### `recordShape()` — open dictionaries

```ts
import { numberShape, recordShape } from '@elements/core'

const bindings = recordShape(numberShape(), { description: 'Variable bindings' })
// JSON Schema: { type: 'object', additionalProperties: { type: 'number' } }
```

`recordShape(values)` is the convenience form of `objectShape({}, { additionalProperties: values })` — cleaner for `Record<string, T>`-style structures with no fixed keys.

### `rawShape()` — JSON Schema escape hatch

```ts
import { rawShape } from '@elements/core'

const anyValue = rawShape({ description: 'Default value' })
```

Embeds an arbitrary JSON Schema fragment for properties that accept any value or need keywords beyond the shape DSL. The compiled guard always returns `true`, the parser passes the value through unchanged, and `Infer` resolves it to `unknown` (the runtime type can't be recovered from the DSL). Use sparingly.

### Tool input schema

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

The `ObjectShape` overload of `compileSchema()` (and `createSchema()`) narrows the return to `JsonSchemaObject`, which is exactly the type a `ToolDefinition.parameters` field expects — no separate tool-schema builder needed.

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

### Practices

- **Define shapes as named constants.** One shape reused across schema, guard, parser, and generator is the whole point — never re-declare the same structure per operation.
- **`createContract()` for the full pipeline; `createSchema()` for schema-only.** Skip the wrapping when you only need the JSON Schema (tool registration).
- **`compileSchema(objectShape(...))` for tool inputs.** Tool parameters are just object-root contracts.
- **`createRandom()` with a fixed seed for reproducible fixtures.** Same seed, same generated data, every run.
- **Wrap optional object fields in `optionalShape()`.** It is what makes a property truly optional in both the inferred type and the schema `required` set.
- **`oneOfShape()` for exclusive unions, `recordShape()` for dictionaries, `rawShape()` only as a last resort.**

---

## Tests

- [`tests/guides/contracts.test.ts`](../tests/guides/contracts.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real export in `src/core/{shapers,compilers,factories,helpers}.ts`.
- [`tests/src/core/shapers.test.ts`](../tests/src/core/shapers.test.ts) — every builder (including `oneOfShape`, `recordShape`, `rawShape`, `additionalProperties`) produces the documented shape value and inferred type.
- [`tests/src/core/compilers.test.ts`](../tests/src/core/compilers.test.ts) — `compileSchema` / `compileGuard` / `compileParser` / `compileGenerator` / `compileContract` behaviour, including `additionalProperties`, `oneOf`, raw passthrough, nullable, and object-root schema typing.

---

## See also

- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
- [parsers.md](parsers.md) — the flat value / field / env parsers the contract compilers reuse for primitive coercion.
- [elements.md](elements.md) — sibling spec for the TS public API surface and its bidirectional parity contract.
