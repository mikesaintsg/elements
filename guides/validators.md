# Validators

> Runtime type guards and guard compositors — narrow `unknown` safely, then build new guards from existing ones. Package: `@elements/core`. Source: [src/core/validators.ts](../src/core/validators.ts).

## Surface

The validators module is a flat library of pure runtime **guards** plus a set of **compositors** that build new guards out of old ones. A guard is the `Guard<T>` type declared in [src/core/types.ts](../src/core/types.ts):

```ts
type Guard<T> = (x: unknown) => x is T
```

Every guard takes one `unknown`, returns a `boolean` that TypeScript reads as a type predicate, and never throws — a value that doesn't fit is simply `false`. There is no state and no lifecycle: each call is a total function of its argument. The overloads (`isString(value: string): boolean` plus `isString(value: unknown): value is string`) exist so a guard can also be used as a same-type assertion without a cast; the runtime body is the single `value is T` predicate.

**Guards vs. the contract DSL vs. flat parsers.** Three sibling surfaces, three jobs:

- These **guards** answer "*is* this value a `T`?" — a boolean predicate that narrows in place. They neither coerce nor transform; a `string` field that arrived as a number stays rejected.
- The **contract DSL** ([contracts.md](contracts.md)) is shape-driven: declare a `ContractShape` once and the compilers derive a JSON Schema, a guard, a parser, and a generator from it. Reach for it when one shape feeds schema + guard + parser + generator.
- The **flat parsers** ([parsers.md](parsers.md)) answer "give me a `T` *or* `undefined`" — they coerce (`"36"` → `36`) and return the typed value or `undefined`. Reach for those when you want extraction with coercion rather than a yes/no narrowing.

Guards pair naturally with the parsers: `parseJsonAs` and `parseArray` (in [parsers.md](parsers.md)) take a `Guard<T>` to validate after parsing, and a contract's `is` is itself a `Guard<T>`.

### Primitive & null-ish guards

`unknown` in, narrowed primitive (or null-ish) out.

| Guard                  | Narrows to            | Behavior                                                                       |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `isNull()`             | `null`                | Strict `value === null`.                                                        |
| `isUndefined()`        | `undefined`           | Strict `value === undefined`.                                                   |
| `isDefined()`          | `T` (non-null)        | True unless `null` *or* `undefined`; `0`, `''`, `false` are defined.            |
| `isString()`           | `string`              | `typeof === 'string'`.                                                          |
| `isNumber()`           | `number`              | `typeof === 'number'` — **`NaN` passes** (it is a number).                       |
| `isFiniteNumber()`     | `number`              | `isNumber` refined by `Number.isFinite` — rejects `NaN` / `±Infinity`. A `whereOf(isNumber, …)` `const`. |
| `isBoolean()`          | `boolean`             | `typeof === 'boolean'`; `0` / `1` do **not** pass.                              |
| `isTrue()`             | `true`                | Strict `value === true`.                                                         |
| `isFalse()`            | `false`               | Strict `value === false`.                                                        |
| `isBigInt()`           | `bigint`              | `typeof === 'bigint'`.                                                           |
| `isSymbol()`           | `symbol`              | `typeof === 'symbol'`.                                                           |
| `isNullableString()`   | `string \| null`      | `nullableOf(isString)`.                                                          |
| `isNullableNumber()`   | `number \| null`      | `nullableOf(isNumber)`.                                                          |
| `isNullableBoolean()`  | `boolean \| null`     | `nullableOf(isBoolean)`.                                                         |

### Structural & JSON guards

| Guard                  | Narrows to                     | Behavior                                                                                      |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `isObject()`           | `object`                       | `typeof === 'object' && !== null` — **arrays and class instances pass**, `null` does not.      |
| `isRecord()`           | `Record<string, unknown>`      | Plain objects only: rejects arrays / `null`; prototype must be `Object.prototype` or `null` (so `new Date()` / class instances fail). |
| `isJsonPrimitive()`    | `JsonPrimitive`                | `null`, `string`, `number`, or `boolean`.                                                      |
| `isJsonValue()`        | `JsonValue`                    | Recursive: a JSON primitive, or an array / plain record whose every entry is itself a `JsonValue` (a `Date` value fails). |
| `isJsonObject()`       | `JsonObject`                   | A plain record whose every value is a `JsonValue`.                                              |
| `isJsonSchemaType()`   | `JsonSchemaType`               | A `string` equal to one of `null`/`boolean`/`object`/`array`/`number`/`integer`/`string`.       |
| `isJsonSchema()`       | `JsonSchema`                   | `true`/`false` boolean schema, or a record whose schema keywords (`type`, `properties`, `items`, `anyOf`, `enum`, …) recursively validate. |
| `isJsonSchemaObject()` | `JsonSchemaObject`             | `isJsonSchema` plus a record with `type === 'object'`.                                          |
| `isMap()`              | `ReadonlyMap<K, V>`            | `instanceof Map`.                                                                              |
| `isSet()`              | `ReadonlySet<T>`               | `instanceof Set`.                                                                              |
| `isWeakMap()`          | `WeakMap<object, unknown>`     | `instanceof WeakMap`.                                                                          |
| `isWeakSet()`          | `WeakSet<object>`              | `instanceof WeakSet`.                                                                          |
| `isDate()`             | `Date`                         | `instanceof Date`.                                                                             |
| `isRegExp()`           | `RegExp`                       | `instanceof RegExp`.                                                                           |
| `isError()`            | `Error`                        | `instanceof Error`.                                                                            |
| `isPromise()`          | `Promise<T>`                   | `instanceof Promise` (native promise only).                                                    |
| `isPromiseLike()`      | promise-like                   | An object with callable `then`, `catch`, *and* `finally` — a bare `{ then }` thenable fails.    |
| `isIterable()`         | `Iterable<T>`                  | A `string`, or an object with a callable `Symbol.iterator`.                                     |
| `isAsyncIterable()`    | `AsyncIterable<T>`             | An object with a callable `Symbol.asyncIterator`.                                               |
| `isArrayBuffer()`      | `ArrayBuffer`                  | `instanceof ArrayBuffer`.                                                                       |
| `isSharedArrayBuffer()`| `SharedArrayBuffer`            | `instanceof SharedArrayBuffer` when the global exists.                                          |

### Array & typed-array guards

| Guard                   | Narrows to            | Behavior                                                              |
| ----------------------- | --------------------- | -------------------------------------------------------------------- |
| `isArray()`             | `readonly T[]`        | `Array.isArray` (no element check — see `arrayOf()` for that).         |
| `isDataView()`          | `DataView`            | `instanceof DataView`.                                                |
| `isArrayBufferView()`   | `ArrayBufferView`     | `ArrayBuffer.isView` — true for any typed array *or* `DataView`.       |
| `isInt8Array()`         | `Int8Array`           | `instanceof Int8Array`.                                               |
| `isUint8Array()`        | `Uint8Array`          | `instanceof Uint8Array`.                                              |
| `isUint8ClampedArray()` | `Uint8ClampedArray`   | `instanceof Uint8ClampedArray`.                                       |
| `isInt16Array()`        | `Int16Array`          | `instanceof Int16Array`.                                              |
| `isUint16Array()`       | `Uint16Array`         | `instanceof Uint16Array`.                                             |
| `isInt32Array()`        | `Int32Array`          | `instanceof Int32Array`.                                              |
| `isUint32Array()`       | `Uint32Array`         | `instanceof Uint32Array`.                                             |
| `isFloat32Array()`      | `Float32Array`        | `instanceof Float32Array`.                                            |
| `isFloat64Array()`      | `Float64Array`        | `instanceof Float64Array`.                                            |
| `isBigInt64Array()`     | `BigInt64Array`       | `instanceof BigInt64Array` when the global exists.                    |
| `isBigUint64Array()`    | `BigUint64Array`      | `instanceof BigUint64Array` when the global exists.                   |

### Emptiness guards

| Guard                | Narrows to                          | Behavior                                                                  |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `isEmptyString()`    | `''`                                | Strict `value === ''`.                                                     |
| `isEmptyArray()`     | `readonly []`                       | `isArray` with `length === 0`.                                             |
| `isEmptyObject()`    | `Record<string \| symbol, never>`   | A record with zero string keys *and* zero enumerable symbol keys.          |
| `isEmptyMap()`       | `ReadonlyMap<never, never>`         | `Map` with `size === 0`.                                                    |
| `isEmptySet()`       | `ReadonlySet<never>`                | `Set` with `size === 0`.                                                    |
| `isNonEmptyString()` | `string`                            | `isString` with `length > 0`.                                              |
| `isNonEmptyArray()`  | `readonly [T, ...T[]]`              | `isArray` with `length > 0`.                                               |
| `isNonEmptyObject()` | `Record<string \| symbol, unknown>` | A record with at least one string key *or* one enumerable symbol key.       |
| `isNonEmptyMap()`    | `ReadonlyMap<K, V>`                 | `Map` with `size > 0`.                                                      |
| `isNonEmptySet()`    | `ReadonlySet<T>`                    | `Set` with `size > 0`.                                                      |

### Function & constructor guards

| Guard                       | Narrows to                          | Behavior                                                                            |
| --------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `isFunction()`              | `AnyFunction`                       | `typeof === 'function'`.                                                              |
| `isConstructor()`           | `AnyConstructor<object>`            | A function that `Reflect.construct` can use as a `newTarget` (arrow / plain functions fail). |
| `isZeroArg()`               | `ZeroArgFunction`                   | A function whose declared `.length` is `0`.                                           |
| `isAsyncFunction()`         | `AnyAsyncFunction`                  | `constructor.name === 'AsyncFunction'` — a non-async fn returning a promise fails.    |
| `isGeneratorFunction()`     | generator function                  | `constructor.name === 'GeneratorFunction'`.                                           |
| `isAsyncGeneratorFunction()`| async generator function           | `constructor.name === 'AsyncGeneratorFunction'`.                                      |
| `isZeroArgAsync()`          | `ZeroArgAsyncFunction`             | `isFunction` + `isZeroArg` + `isAsyncFunction`.                                       |
| `isZeroArgGenerator()`      | zero-arg generator function         | `isFunction` + `isZeroArg` + `isGeneratorFunction`.                                   |
| `isZeroArgAsyncGenerator()` | zero-arg async generator function   | `isFunction` + `isZeroArg` + `isAsyncGeneratorFunction`.                              |
| `enumerableSymbolCount()`   | `number`                            | Helper: counts a value's enumerable own-symbol keys (used by the object-emptiness guards). |

### Compositors

Each compositor returns a fresh `Guard<…>`. They accept any predicate `(value: unknown) => boolean`; passing a typed `Guard<T>` carries the narrowed type through (see the types in [src/core/types.ts](../src/core/types.ts): `GuardType`, `FromGuards`, `OptionalFromGuards`, `TupleFromGuards`, `IntersectionFromGuards`).

| Compositor          | Signature (call form)                                  | Builds a guard that…                                                                                  |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `arrayOf()`         | `arrayOf(elementGuard)`                                | accepts an array where **every** element passes `elementGuard`.                                        |
| `tupleOf()`         | `tupleOf(...guards)`                                   | accepts an array of **exactly** `guards.length` whose element *i* passes `guards[i]`.                  |
| `setOf()`           | `setOf(elementGuard)`                                  | accepts a `Set` where every entry passes `elementGuard`.                                               |
| `mapOf()`           | `mapOf(keyGuard, valueGuard)`                          | accepts a `Map` where every key passes `keyGuard` and every value passes `valueGuard`.                 |
| `iterableOf()`      | `iterableOf(elementGuard)`                             | accepts an iterable whose every yielded entry passes `elementGuard` (consumes the iterable to check).  |
| `recordOf()`        | `recordOf(shape)` · `recordOf(shape, ['k'])` · `recordOf(shape, true)` | accepts an **exact** record: every shape key present (unless listed optional / `true` = all optional) and passing its guard, **no extra keys** (enumerable symbol keys are ignored). |
| `literalOf()`       | `literalOf(...literals)`                               | accepts a value `Object.is`-equal to one of the given string/number/boolean literals.                  |
| `instanceOf()`      | `instanceOf(ctor)`                                     | accepts an object that is `instanceof ctor` (returns `false` if `ctor` is not a constructor).          |
| `enumOf()`          | `enumOf(enumeration)`                                  | accepts a `string`/`number` that is one of the enum object's values.                                   |
| `keyOf()`           | `keyOf(object)`                                        | accepts a `string`/`symbol`/`number` key that is `in` the given object.                                |
| `pickOf()`          | `pickOf(shape, keys)`                                  | returns a **new guard shape** keeping only `keys` (for feeding back into `recordOf()`).                |
| `omitOf()`          | `omitOf(shape, keys)`                                  | returns a **new guard shape** dropping `keys`.                                                         |
| `andOf()`           | `andOf(left, right)`                                   | passes iff **both** `left` and `right` pass (type `A & B`).                                            |
| `orOf()`            | `orOf(left, right)`                                    | passes iff **either** passes (type `A \| B`).                                                          |
| `notOf()`           | `notOf(guard)`                                         | passes iff `guard` fails (`Guard<unknown>`).                                                           |
| `complementOf()`    | `complementOf(base, excluded)`                         | passes iff `base` passes **and** `excluded` does **not** (`Exclude<TBase, TExcluded>`).                |
| `unionOf()`         | `unionOf(...guards)`                                   | passes iff **any** guard passes (variadic `orOf`; type is the union of guarded types).                 |
| `intersectionOf()`  | `intersectionOf(...guards)`                            | passes iff **every** guard passes (variadic `andOf`; type is the intersection).                        |
| `whereOf()`         | `whereOf(base, predicate)`                             | passes `base`, then refines with `predicate` (keeps `base`'s type — backs `isFiniteNumber`).           |
| `lazyOf()`          | `lazyOf(thunk)`                                        | defers building the real guard until first call (the thunk runs **per call** — for recursive guards).  |
| `transformOf()`     | `transformOf(base, project, target)`                   | passes `base`, projects the value, then validates the projection with `target` (returns the original's type). |
| `nullableOf()`      | `nullableOf(guard)`                                    | passes iff the value is `null` **or** `guard` passes (`T \| null`).                                    |

> JSON-Schema validation has three exported leaf helpers used internally by `isJsonSchema()` — `isJsonSchemaArray()` (an array of schema nodes), `isJsonSchemaMapValue()` (a record of schema nodes, e.g. `properties`), and `isJsonSchemaStringArrayMapValue()` (a record of string arrays, e.g. `dependentRequired`). They are real exports but are implementation detail of `isJsonSchema()`; prefer `isJsonSchema()` / `isJsonSchemaObject()` at call sites.

---

## Contract

These invariants hold across `src/core/validators.ts` ↔ `validators.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide is a real `export function` / `export const` in [src/core/validators.ts](../src/core/validators.ts). A renamed or removed export breaks the parity gate until the doc is reconciled.
2. **SOURCE → DOC.** Every guard and compositor exported from `src/core/validators.ts` is documented in a `## Surface` table above — the surface is exhaustive, not a sample.
3. **`Guard<T>` SEMANTICS.** Every guard is pure and total: it takes one `unknown`, returns a `boolean` that TypeScript reads as a `value is T` type predicate, and **never throws**. A value that doesn't fit yields `false`. Compositors are equally pure — they return a fresh guard closure and evaluate lazily on call.
4. **TYPES ARE THE SOURCE OF TRUTH.** `Guard<T>`, `GuardType`, `GuardsShape`, `FromGuards`, `OptionalFromGuards`, `TupleFromGuards`, `IntersectionFromGuards`, and the `AnyFunction` / `AnyConstructor` / `ZeroArgFunction` family are declared first in [src/core/types.ts](../src/core/types.ts); the guards conform to those types, never the reverse.

Enforced by:

- [`tests/guides/validators.test.ts`](../tests/guides/validators.test.ts) — every documented call-form API resolves to a real `src/core/validators.ts` export.
- [`tests/src/core/validators.test.ts`](../tests/src/core/validators.test.ts) — per-guard behavior: primitive narrowing, `isRecord` plain-object rules, JSON value / schema recursion, typed-array detection, emptiness (including enumerable-symbol counting), function/constructor detection, and the compositor semantics (`recordOf` exactness + optional/`true`, `tupleOf` length, `complementOf`, `lazyOf` per-call thunk, `transformOf`).

---

## Patterns

### Narrowing `unknown` with a primitive guard

```ts
import { isFiniteNumber, isRecord, isString } from '@elements/core'

function describe(value: unknown): string {
	if (isString(value)) return value.toUpperCase() // value: string
	if (isFiniteNumber(value)) return value.toFixed(2) // value: number (no NaN / Infinity)
	if (isRecord(value)) return Object.keys(value).join(',') // value: Record<string, unknown>
	return 'other'
}
```

### Composing with `arrayOf` / `recordOf` / `unionOf`

```ts
import { arrayOf, isNumber, isString, literalOf, recordOf, unionOf } from '@elements/core'

const isStringArray = arrayOf(isString)
isStringArray(['a', 'b']) // true
isStringArray(['a', 1]) // false  (one element fails)

const isUser = recordOf({
	id: isString,
	age: isNumber,
	role: literalOf('admin', 'member', 'guest'),
})
isUser({ id: 'u1', age: 36, role: 'admin' }) // true
isUser({ id: 'u1', age: 36, role: 'admin', extra: true }) // false  (exact — no extra keys)
isUser({ id: 'u1', role: 'admin' }) // false  (missing required `age`)

// Optional keys: pass a key list, or `true` to make every key optional.
const isUserPatch = recordOf({ id: isString, age: isNumber }, ['age'])
isUserPatch({ id: 'u1' }) // true   (`age` optional)

const isId = unionOf(isString, isNumber) // Guard<string | number>
isId('u1') // true
isId(42) // true
```

### Using a guard with `parseJsonAs` / a contract `is`

A guard *is* the `Guard<T>` the flat parsers and contracts expect — hand it straight to `parseJsonAs` or compare against a contract's `is`:

```ts
import { arrayOf, createContract, isString, objectShape, parseJsonAs, recordOf, stringShape } from '@elements/core'

const isConfig = recordOf({ host: isString, tags: arrayOf(isString) })

parseJsonAs('{"host":"localhost","tags":["a","b"]}', isConfig)
// { host: 'localhost', tags: ['a', 'b'] }
parseJsonAs('{"host":"localhost"}', isConfig) // undefined  (guard fails — tags missing)
parseJsonAs('not json', isConfig) // undefined  (parse fails; never throws)

// A contract's `is` is itself a Guard<T> — interchangeable with these compositors.
const userContract = createContract(objectShape({ name: stringShape() }))
const guard = userContract.is // Guard<{ readonly name: string }>
```

### Refinement, instance, and nullable composition

```ts
import { complementOf, instanceOf, isNumber, isString, nullableOf, orOf, whereOf } from '@elements/core'

// Refine a base guard with an extra predicate (keeps the base's type).
const isPositive = whereOf(isNumber, (n) => n > 0)
isPositive(3) // true
isPositive(-1) // false

// instanceof guard.
const isDateValue = instanceOf(Date)
isDateValue(new Date()) // true
isDateValue('1970-01-01') // false

// null-aware.
const isMaybeName = nullableOf(isString)
isMaybeName(null) // true
isMaybeName('Ada') // true
isMaybeName(1) // false

// Exclude a subset from a base.
const isStringOrNumber = orOf(isString, isNumber)
const isNonStringId = complementOf(isStringOrNumber, isString)
isNonStringId(42) // true
isNonStringId('u1') // false
```

### Building a typed guard set

`recordOf()` plus `pickOf()` / `omitOf()` derive related shapes from one guard map without restating fields:

```ts
import { isNumber, isString, omitOf, pickOf, recordOf } from '@elements/core'

const personShape = { id: isString, name: isString, age: isNumber } as const

const isPerson = recordOf(personShape)
const isPersonSummary = recordOf(pickOf(personShape, ['id', 'name']))
const isPersonWithoutAge = recordOf(omitOf(personShape, ['age']))

isPerson({ id: 'p1', name: 'Ada', age: 36 }) // true
isPersonSummary({ id: 'p1', name: 'Ada' }) // true
isPersonWithoutAge({ id: 'p1', name: 'Ada' }) // true
```

### Recursive guards with `lazyOf`

```ts
import { arrayOf, isNumber, lazyOf, orOf } from '@elements/core'
import type { Guard } from '@elements/core'

// A JSON-number-tree: number, or array of trees.
const isNumberTree: Guard<unknown> = orOf(
	isNumber,
	arrayOf(lazyOf(() => isNumberTree)),
)
isNumberTree(1) // true
isNumberTree([1, [2, 3], 4]) // true
isNumberTree(['x']) // false
```

### Practices

- **Guards narrow, parsers coerce.** `isNumber('36')` is `false` — a guard never converts. Need `"36"` → `36`? Use the `parseNumber` parser from [parsers.md](parsers.md).
- **`isNumber()` accepts `NaN`; reach for `isFiniteNumber()`** when `NaN` / `±Infinity` must be rejected.
- **`isObject()` is broad, `isRecord()` is strict.** Arrays and class instances satisfy `isObject()` but fail `isRecord()` — use `isRecord()` for plain config/JSON-style objects.
- **`recordOf()` is exact.** Extra string keys fail by default; declare optional keys with a key list, or `true` for all-optional. Use `pickOf()` / `omitOf()` to derive related shapes from one map.
- **Use `lazyOf()` for self-referential guards** — the thunk defers construction so recursive definitions don't reference themselves before they exist.
- **A guard is a `Guard<T>`.** Pass it straight to the `parseJsonAs` / `parseArray` parsers, or use a contract's `is` interchangeably — see [parsers.md](parsers.md) and [contracts.md](contracts.md).

---

## Tests

- [`tests/src/core/validators.test.ts`](../tests/src/core/validators.test.ts) — per-guard behavior: primitive / null-ish narrowing, `isRecord` plain-object rules, JSON value & schema recursion, typed-array detection, emptiness with enumerable-symbol counting, function / constructor detection, and compositor semantics (`recordOf` exactness + optional / `true`, `tupleOf` arity, `complementOf`, `lazyOf` per-call thunk, `transformOf`, `nullableOf`).
- [`tests/guides/validators.test.ts`](../tests/guides/validators.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real `export` in `src/core/validators.ts`.

---

## See also

- [contracts.md](contracts.md) — the shape-driven DSL; a contract's `is` is a `Guard<T>` built from one shape.
- [parsers.md](parsers.md) — the flat coercing parsers; `parseJsonAs` / `parseArray` take a `Guard<T>` from this module.
- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
