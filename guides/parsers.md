# Parsers

> Standalone value, field, and format parsers — `unknown` → typed extraction with coercion, returning `undefined` on failure. Package: `@elements/core`. Source: [src/core/parsers.ts](../src/core/parsers.ts).

## Surface

The parsers module is a flat library of pure, single-purpose functions that take an `unknown` (or a `Record`, or a raw `string`) and return a typed value — or `undefined` when the input doesn't fit. There is no state, no buffering, no lifecycle: every call is a fresh, total function of its argument.

**Parsers vs. the contract DSL.** [contracts.md](contracts.md) documents the *shape-driven* pipeline — declare a `ContractShape` once and get a JSON Schema, a guard, a parser, and a generator compiled from it. This module is the *flat* counterpart: hand-reachable primitives for the everyday "I have an `unknown` field, give me a `string` or `undefined`" job, with no shape declaration. The contract compilers reuse these primitives internally for coercion, but they are an independent, directly-importable surface. Reach for a contract when one shape feeds schema + guard + parser + generator; reach for these when you just need to pull a typed value out of request bodies, query strings, JSON blobs, or `.env` content.

### Primitive parsers

`unknown` in, narrowed primitive (or `undefined`) out.

| Parser            | Input → Output         | Behavior                                                                                                  |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `parseString()`   | `unknown` → `string?`  | Strings only; trims; an empty / whitespace-only result is `undefined`.                                     |
| `parseNumber()`   | `unknown` → `number?`  | Numbers or numeric strings; rejects `NaN` / `±Infinity` and empty / whitespace strings.                    |
| `parseInteger()`  | `unknown` → `number?`  | `parseNumber()` then `Number.isInteger`; floats and non-finite values are `undefined`.                     |
| `parseBoolean()`  | `unknown` → `boolean?` | Actual booleans, the strings `"true"` / `"false"`, the strings `"1"` / `"0"`, or the numbers `1` / `0`.    |

### Structural parsers

| Parser                    | Input → Output                          | Behavior                                                                                              |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `parseRecord()`           | `unknown` → `Record<string, unknown>?`  | Plain objects only (arrays / `null` / primitives → `undefined`); returns the same reference.           |
| `parseArray()`            | `unknown`, `Guard<T>?` → `readonly T[]?` | Non-arrays → `undefined`. No guard: shallow copy. With a guard: returns the input array iff every element passes, else `undefined`. |
| `parseJsonSchema()`       | `unknown` → `JsonSchema?`               | Validates an arbitrary JSON Schema node; invalid → `undefined`.                                        |
| `parseJsonSchemaObject()` | `unknown` → `JsonSchemaObject?`         | Validates an object-root JSON Schema; non-object schemas → `undefined`.                                |
| `matchesShape()`          | `unknown`, `ContractShape` → type guard | Narrows a value against a compiled shape guard (`value is T`).                                         |
| `parseShape()`            | `unknown`, `ContractShape` → `T?`       | Runs the shape's compiled parser, then re-validates; returns the parsed value or `undefined`.          |

### Record field parsers

Each reads `record[key]` and delegates to the matching primitive/structural parser — same coercion, same `undefined`-on-miss-or-mismatch semantics.

| Parser                | Input → Output                                   | Delegates to                                |
| --------------------- | ------------------------------------------------ | ------------------------------------------- |
| `parseStringField()`  | `Record`, `key` → `string?`                      | `parseString(record[key])`                  |
| `parseNumberField()`  | `Record`, `key` → `number?`                      | `parseNumber(record[key])`                  |
| `parseIntegerField()` | `Record`, `key` → `number?`                      | `parseInteger(record[key])`                 |
| `parseBooleanField()` | `Record`, `key` → `boolean?`                     | `parseBoolean(record[key])`                 |
| `parseRecordField()`  | `Record`, `key` → `Record<string, unknown>?`     | `parseRecord(record[key])`                  |
| `parseArrayField()`   | `Record`, `key`, `Guard<T>?` → `readonly T[]?`   | `parseArray(record[key], guard)`            |

### Enum parsers

| Parser              | Input → Output                                   | Behavior                                                                          |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `parseEnum()`       | `unknown`, `readonly T[]` → `T?`                 | String only; **trims** then matches exactly. **Case-sensitive** — `"Admin"` ≠ `"admin"`. Non-match / non-string → `undefined`. |
| `parseEnumField()`  | `Record`, `key`, `readonly T[]` → `T?`           | `parseEnum(record[key], allowed)`.                                                |

### JSON parsers

| Parser           | Input → Output                       | Behavior                                                                              |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `parseJson()`    | `string` → `unknown`                 | `JSON.parse` wrapped in try/catch; any parse error → `undefined` (never throws).       |
| `parseJsonAs()`  | `string`, `Guard<T>` → `T?`          | `parseJson()` then applies the guard; invalid JSON or failed guard → `undefined`.      |

### Coercion parsers

Looser than the strict primitive parsers — they accept cross-type input where it's unambiguous.

| Parser            | Input → Output                          | Behavior                                                                                            |
| ----------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `coerceString()`  | `unknown` → `string?`                   | Strings pass through; **finite** numbers become `String(value)`; everything else → `undefined`.     |
| `coerceNumber()`  | `unknown` → `number?`                   | Numbers pass through **including `±Infinity`**; strings go through `parseFloat` (leading-numeric ok); only `NaN` → `undefined`. Stricter `parseNumber()` rejects `±Infinity` and trailing junk — `coerceNumber()` is the lenient sibling. |
| `coerceRecord()`  | `unknown` → `Record<string, unknown>`   | Plain objects pass through; **anything else returns `{}`** (never `undefined` — the one always-defined parser). |

### Batch & format parsers

| Parser               | Input → Output                                              | Behavior                                                                                                                   |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `parseStringFields()`| `unknown`, `readonly string[]` → `Record<string,string>?`   | Non-record body → `undefined`. Otherwise builds a record of only the listed fields that `parseString()`-parse successfully; a valid record with no matching fields → `{}` (not `undefined`). |
| `parsePositiveInt()` | `string?`, `fallback: number` → `number`                    | **`0` is accepted** (despite the name); negative / non-integer / missing → `fallback`. Always returns a number. |
| `parseEnv()`         | `string` → `Record<string, string>`                         | Parses `.env` content: skips blank / `#`-comment lines and lines without `=`; trims key/value; strips one matching `"`/`'` pair; strips an unquoted ` #` inline comment. |

---

## Contract

These invariants hold across `src/core/parsers.ts` ↔ `parsers.md`:

1. **DOC → SOURCE.** Every backticked call-form API named in this guide is a real `export function` in [src/core/parsers.ts](../src/core/parsers.ts). A renamed or removed export breaks the parity gate until the doc is reconciled.
2. **SOURCE → DOC.** Every public parser exported from `src/core/parsers.ts` is documented in a `## Surface` table above — the surface is exhaustive, not a sample.
3. **TYPES ARE THE SOURCE OF TRUTH.** `Guard<T>`, `ContractShape`, `JsonSchema`, and `JsonSchemaObject` are declared first in [src/core/types.ts](../src/core/types.ts); the parsers conform to those types, never the reverse.
4. **UNDEFINED ON FAILURE.** Every parser is total and pure: it never throws. A value that doesn't fit yields `undefined` — except `coerceRecord()` (always a record, `{}` on failure) and `parsePositiveInt()` (always a number, the fallback on failure). Coercion parsers are deliberately more permissive than the strict primitives; the tables above call out each leniency.

Enforced by:

- [`tests/guides/parsers.test.ts`](../tests/guides/parsers.test.ts) — every documented call-form API resolves to a real `src/core/parsers.ts` export.
- [`tests/src/core/parsers.test.ts`](../tests/src/core/parsers.test.ts) — per-parser behavior: trimming, coercion, element-guard semantics, case sensitivity, JSON failure handling, `.env` parsing, and the `undefined`-on-failure contract.

---

## Patterns

### Primitive parse

```ts
import { parseBoolean, parseInteger, parseNumber, parseString } from '@elements/core'

parseString('  hello  ') // 'hello'
parseString('   ') // undefined  (whitespace-only)
parseNumber('3.14') // 3.14
parseNumber('abc') // undefined
parseInteger('25') // 25
parseInteger('3.5') // undefined  (not an integer)
parseBoolean('true') // true
parseBoolean(1) // true
parseBoolean('yes') // undefined
```

### Field extraction from a `Record`

```ts
import {
	parseBooleanField,
	parseEnumField,
	parseIntegerField,
	parseRecord,
	parseStringField,
} from '@elements/core'

const body: unknown = { name: '  Ada  ', age: '36', active: 'true', role: 'admin' }

const record = parseRecord(body)
if (record) {
	parseStringField(record, 'name') // 'Ada'   (trimmed)
	parseIntegerField(record, 'age') // 36       (coerced from string)
	parseBooleanField(record, 'active') // true
	parseEnumField(record, 'role', ['admin', 'member', 'guest'] as const) // 'admin'
	parseStringField(record, 'missing') // undefined
}
```

### Arrays with an element guard

```ts
import { parseArray, parseArrayField } from '@elements/core'

const isString = (v: unknown): v is string => typeof v === 'string'

parseArray(['a', 'b', 'c'], isString) // ['a', 'b', 'c'] — the same input reference (all pass)
parseArray(['a', 42, 'c'], isString) // undefined  (one element fails the guard)
parseArray('not an array') // undefined
parseArray([1, 2, 3]) // [1, 2, 3] — a new array (shallow copy, no guard)

parseArrayField({ tags: ['x', 'y'] }, 'tags', isString) // ['x', 'y']
```

### Coercion (lenient cross-type)

```ts
import { coerceNumber, coerceRecord, coerceString } from '@elements/core'

coerceString(42) // '42'     (finite number → string)
coerceString(Infinity) // undefined  (non-finite)
coerceNumber('12px') // 12        (parseFloat — leading numeric ok)
coerceNumber(Infinity) // Infinity  (looser than parseNumber, which rejects it)
coerceNumber('nope') // undefined  (only NaN fails)
coerceRecord({ a: 1 }) // { a: 1 }
coerceRecord('not a record') // {}        (never undefined)
```

### JSON with a guard

```ts
import { parseJson, parseJsonAs } from '@elements/core'

parseJson('{"ok":true}') // { ok: true }
parseJson('not json') // undefined  (never throws)

interface Config {
	readonly host: string
	readonly port: number
}
const isConfig = (v: unknown): v is Config =>
	typeof v === 'object' &&
	v !== null &&
	typeof (v as Config).host === 'string' &&
	typeof (v as Config).port === 'number'

parseJsonAs('{"host":"localhost","port":3000}', isConfig) // { host: 'localhost', port: 3000 }
parseJsonAs('{"host":"localhost"}', isConfig) // undefined  (guard fails)
parseJsonAs('not json', isConfig) // undefined  (parse fails)
```

### Batch, query string, and `.env`

```ts
import { parseEnv, parsePositiveInt, parseStringFields } from '@elements/core'

// Pull only the named string fields that are present and valid.
parseStringFields({ name: '  Ada  ', email: 'a@b.com', age: 30 }, ['name', 'email'])
// { name: 'Ada', email: 'a@b.com' }   (age skipped — not a string)
parseStringFields('not a record', ['name']) // undefined

// Query-string pagination with a default.
parsePositiveInt(undefined, 25) // 25   (missing → fallback)
parsePositiveInt('50', 25) // 50
parsePositiveInt('-1', 25) // 25   (negative → fallback)

// .env content → key/value record.
parseEnv('HOST=localhost\nPORT=3000 # api port\nTOKEN="ab cd"\n# comment')
// { HOST: 'localhost', PORT: '3000', TOKEN: 'ab cd' }
```

### Shape-bridge parsers

`matchesShape()` and `parseShape()` are the bridge into the contract DSL — pass a `ContractShape` (built with the `contracts.md` builders) to narrow or parse against it without constructing a full contract via `createContract`:

```ts
import { integerShape, objectShape, parseShape, stringShape } from '@elements/core'

const personShape = objectShape({
	name: stringShape({ min: 1 }),
	age: integerShape({ min: 0 }),
})

parseShape({ name: '  Ada  ', age: '36' }, personShape) // { name: 'Ada', age: 36 }
parseShape({ name: 'Ada', age: '-1' }, personShape) // undefined  (fails shape validation)
```

### Practices

- **Prefer the strict primitive (`parseNumber()`) over the coercion sibling (`coerceNumber()`) unless you specifically want the looseness** — `parseNumber()` rejects `±Infinity` and junk; `coerceNumber()` keeps `Infinity` and accepts leading-numeric strings.
- **Use the `*Field` variants for record access** — `parseStringField(record, 'k')` over `parseString(record['k'])`; identical behavior, clearer intent.
- **`coerceRecord()` and `parsePositiveInt()` never return `undefined`** — they fall back (`{}` / the supplied default), so they're safe to use without a guard. `parsePositiveInt()` also accepts `0` (the fallback fires only for negative values, non-integers, and missing input).
- **`parseJson()` / `parseJsonAs()` never throw** — no `try/catch` needed at the call site; check for `undefined`.
- **Reach for the contract DSL when one shape feeds schema + guard + parser + generator** — these flat parsers are for the one-off `unknown` → typed value extraction. See the `createContract` pipeline in [contracts.md](contracts.md).

---

## Tests

- [`tests/src/core/parsers.test.ts`](../tests/src/core/parsers.test.ts) — per-parser behavior: trimming and empty handling, numeric/boolean coercion, integer rejection, `parseArray` element-guard semantics, `parseEnum` case sensitivity and trimming, `parseJson` non-throwing failure, `parseStringFields` / `parsePositiveInt` fallbacks, and the shape-bridge parsers.
- [`tests/guides/parsers.test.ts`](../tests/guides/parsers.test.ts) — doc ↔ source parity: every backticked call-form API in this guide resolves to a real `export` in `src/core/parsers.ts`.

---

## See also

- [contracts.md](contracts.md) — the shape-driven DSL (schema / guard / parser / generator from one declaration); the contract compilers reuse these flat parsers for primitive coercion.
- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
