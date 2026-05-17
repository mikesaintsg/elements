import { attempt, enumerableSymbolCount, isConstructor } from './helpers.js'
import type {
	AnyAsyncFunction,
	AnyConstructor,
	AnyFunction,
	FromGuards,
	Guard,
	GuardsShape,
	GuardType,
	IntersectionFromGuards,
	JsonObject,
	JsonPrimitive,
	JsonSchema,
	JsonSchemaMap,
	JsonSchemaObject,
	JsonSchemaStringArrayMap,
	JsonSchemaType,
	JsonValue,
	OptionalFromGuards,
	TupleFromGuards,
	ZeroArgAsyncFunction,
	ZeroArgFunction,
} from './types.js'

// === Primitive Guards

/**
 * Determine whether a value is `null`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is strictly `null`
 *
 * @example
 * ```ts
 * isNull(null)      // true
 * isNull(undefined) // false
 * ```
 */
export function isNull(value: null): boolean
export function isNull(value: unknown): value is null
export function isNull(value: unknown): boolean {
	return value === null
}

/**
 * Determine whether a value is `undefined`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is strictly `undefined`
 *
 * @example
 * ```ts
 * isUndefined(undefined) // true
 * isUndefined(null)      // false
 * ```
 */
export function isUndefined(value: undefined): boolean
export function isUndefined(value: unknown): value is undefined
export function isUndefined(value: unknown): boolean {
	return value === undefined
}

/**
 * Determine whether a value is defined (neither `null` nor `undefined`).
 *
 * @param value - The value to test
 * @returns `true` when `value` is not `null` and not `undefined`
 *
 * @example
 * ```ts
 * isDefined('hello') // true
 * isDefined(null)    // false
 * isDefined(0)       // true
 * ```
 */
export function isDefined<T>(value: T): boolean
export function isDefined<T>(value: T | null | undefined): value is T
export function isDefined<T>(value: T | null | undefined): boolean {
	return value !== null && value !== undefined
}

/**
 * Determine whether a value is a string.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'string'`
 *
 * @example
 * ```ts
 * isString('hello') // true
 * isString(42)      // false
 * ```
 */
export function isString(value: string): boolean
export function isString(value: unknown): value is string
export function isString(value: unknown): boolean {
	return typeof value === 'string'
}

/**
 * Determine whether a value is a string or `null`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a string or `null`
 *
 * @example
 * ```ts
 * isNullableString('hi') // true
 * isNullableString(null) // true
 * isNullableString(42)   // false
 * ```
 */
export function isNullableString(value: string | null): boolean
export function isNullableString(value: unknown): value is string | null
export function isNullableString(value: unknown): boolean {
	return nullableOf(isString)(value)
}

/**
 * Determine whether a value is a number.
 *
 * Includes `NaN` and `±Infinity` — use {@link isFiniteNumber} to exclude them.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'number'`
 *
 * @example
 * ```ts
 * isNumber(42)       // true
 * isNumber(NaN)      // true
 * isNumber('42')     // false
 * ```
 */
export function isNumber(value: number): boolean
export function isNumber(value: unknown): value is number
export function isNumber(value: unknown): boolean {
	return typeof value === 'number'
}

/**
 * Determine whether a value is a finite number.
 *
 * Excludes `NaN` and `±Infinity`; use {@link isNumber} when you want all
 * IEEE 754 number values.
 *
 * @example
 * ```ts
 * isFiniteNumber(42)       // true
 * isFiniteNumber(Infinity) // false
 * isFiniteNumber(NaN)      // false
 * ```
 */
export const isFiniteNumber = whereOf(isNumber, (value) => Number.isFinite(value))

/**
 * Determine whether a value is a number or `null`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a number or `null`
 *
 * @example
 * ```ts
 * isNullableNumber(7)    // true
 * isNullableNumber(null) // true
 * isNullableNumber('7')  // false
 * ```
 */
export function isNullableNumber(value: number | null): boolean
export function isNullableNumber(value: unknown): value is number | null
export function isNullableNumber(value: unknown): boolean {
	return nullableOf(isNumber)(value)
}

/**
 * Determine whether a value is a boolean.
 *
 * @param value - The value to test
 * @returns `true` when `value` is strictly `true` or `false`
 *
 * @example
 * ```ts
 * isBoolean(false) // true
 * isBoolean(0)     // false
 * ```
 */
export function isBoolean(value: boolean): boolean
export function isBoolean(value: unknown): value is boolean
export function isBoolean(value: unknown): boolean {
	return typeof value === 'boolean'
}

/**
 * Determine whether a value is a boolean or `null`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is `true`, `false`, or `null`
 *
 * @example
 * ```ts
 * isNullableBoolean(true) // true
 * isNullableBoolean(null) // true
 * isNullableBoolean(1)    // false
 * ```
 */
export function isNullableBoolean(value: boolean | null): boolean
export function isNullableBoolean(value: unknown): value is boolean | null
export function isNullableBoolean(value: unknown): boolean {
	return nullableOf(isBoolean)(value)
}

/**
 * Determine whether a value is exactly `true`.
 *
 * @param value - The value to test
 * @returns `true` only when `value === true`
 *
 * @example
 * ```ts
 * isTrue(true)  // true
 * isTrue(1)     // false
 * ```
 */
export function isTrue(value: true): boolean
export function isTrue(value: unknown): value is true
export function isTrue(value: unknown): boolean {
	return value === true
}

/**
 * Determine whether a value is exactly `false`.
 *
 * @param value - The value to test
 * @returns `true` only when `value === false`
 *
 * @example
 * ```ts
 * isFalse(false) // true
 * isFalse(0)     // false
 * ```
 */
export function isFalse(value: false): boolean
export function isFalse(value: unknown): value is false
export function isFalse(value: unknown): boolean {
	return value === false
}

/**
 * Determine whether a value is a bigint.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'bigint'`
 *
 * @example
 * ```ts
 * isBigInt(42n) // true
 * isBigInt(42)  // false
 * ```
 */
export function isBigInt(value: bigint): boolean
export function isBigInt(value: unknown): value is bigint
export function isBigInt(value: unknown): boolean {
	return typeof value === 'bigint'
}

/**
 * Determine whether a value is a symbol.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'symbol'`
 *
 * @example
 * ```ts
 * isSymbol(Symbol('tag')) // true
 * isSymbol('tag')         // false
 * ```
 */
export function isSymbol(value: symbol): boolean
export function isSymbol(value: unknown): value is symbol
export function isSymbol(value: unknown): boolean {
	return typeof value === 'symbol'
}

/**
 * Determine whether a value is callable.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'function'`
 *
 * @example
 * ```ts
 * isFunction(() => 1)   // true
 * isFunction('hello')   // false
 * ```
 */
export function isFunction(value: AnyFunction): boolean
export function isFunction(value: unknown): value is AnyFunction
export function isFunction(value: unknown): boolean {
	return typeof value === 'function'
}

// === Built-in Guards

/**
 * Determine whether a value is a `Date`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Date`
 *
 * @example
 * ```ts
 * isDate(new Date()) // true
 * isDate('2024-01-01') // false
 * ```
 */
export function isDate(value: Date): boolean
export function isDate(value: unknown): value is Date
export function isDate(value: unknown): boolean {
	return value instanceof Date
}

/**
 * Determine whether a value is a `RegExp`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof RegExp`
 *
 * @example
 * ```ts
 * isRegExp(/foo/)    // true
 * isRegExp('foo')    // false
 * ```
 */
export function isRegExp(value: RegExp): boolean
export function isRegExp(value: unknown): value is RegExp
export function isRegExp(value: unknown): boolean {
	return value instanceof RegExp
}

/**
 * Determine whether a value is an `Error`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Error`
 *
 * @example
 * ```ts
 * isError(new TypeError('oops')) // true
 * isError({ message: 'oops' })   // false
 * ```
 */
export function isError(value: Error): boolean
export function isError(value: unknown): value is Error
export function isError(value: unknown): boolean {
	return value instanceof Error
}

/**
 * Determine whether a value is a native `Promise`.
 *
 * Use {@link isPromiseLike} when you need to accept any thenable.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Promise`
 *
 * @example
 * ```ts
 * isPromise(Promise.resolve(1)) // true
 * isPromise({ then: () => {} }) // false
 * ```
 */
export function isPromise<T = unknown>(value: Promise<T>): boolean
export function isPromise<T = unknown>(value: unknown): value is Promise<T>
export function isPromise(value: unknown): boolean {
	return value instanceof Promise
}

/**
 * Determine whether a value is promise-like with `then`, `catch`, and `finally`.
 *
 * Accepts any object exposing all three methods, not only native `Promise`
 * instances. Use {@link isPromise} when you specifically need `instanceof Promise`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is an object with callable `then`, `catch`, and
 *   `finally` methods; narrows to `Promise<T> | (PromiseLike<T> & { catch: unknown; finally: unknown })`
 *
 * @example
 * ```ts
 * import { isPromiseLike } from '@elements/core'
 *
 * function handle(value: unknown): void {
 *   if (isPromiseLike(value)) {
 *     value.then((v) => console.log(v)).catch((e) => console.error(e))
 *   }
 * }
 *
 * handle(Promise.resolve(42))         // logs 42
 * handle({ then: 'not a function' })  // no-op
 * ```
 */
export function isPromiseLike<T = unknown>(
	value: unknown,
): value is Promise<T> | (PromiseLike<T> & { catch: unknown; finally: unknown }) {
	if (!isObject(value)) {
		return false
	}

	const thenValue = Reflect.get(value, 'then')
	const catchValue = Reflect.get(value, 'catch')
	const finallyValue = Reflect.get(value, 'finally')
	return isFunction(thenValue) && isFunction(catchValue) && isFunction(finallyValue)
}

/**
 * Determine whether a value is an `ArrayBuffer`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof ArrayBuffer`
 *
 * @example
 * ```ts
 * isArrayBuffer(new ArrayBuffer(8)) // true
 * isArrayBuffer(new Uint8Array(8))  // false
 * ```
 */
export function isArrayBuffer(value: ArrayBuffer): boolean
export function isArrayBuffer(value: unknown): value is ArrayBuffer
export function isArrayBuffer(value: unknown): boolean {
	return value instanceof ArrayBuffer
}

/**
 * Determine whether a value is a `SharedArrayBuffer`.
 *
 * Guards the global existence of `SharedArrayBuffer` first — safe in
 * environments where it is absent or disabled (e.g. cross-origin isolated
 * context not enabled).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a `SharedArrayBuffer`
 *
 * @example
 * ```ts
 * isSharedArrayBuffer(new SharedArrayBuffer(8)) // true (when available)
 * isSharedArrayBuffer(new ArrayBuffer(8))        // false
 * ```
 */
export function isSharedArrayBuffer(value: SharedArrayBuffer): boolean
export function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer
export function isSharedArrayBuffer(value: unknown): boolean {
	return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
}

// === Protocol Guards

/**
 * Determine whether a value implements the iterable protocol (`Symbol.iterator`).
 *
 * Strings are explicitly included because `typeof 'x'[Symbol.iterator]` is a
 * function but strings are not objects, so the generic object-path alone would
 * miss them.
 *
 * @param value - The value to test
 * @returns `true` when `value` has a callable `Symbol.iterator`
 *
 * @example
 * ```ts
 * isIterable([1, 2, 3])      // true
 * isIterable('abc')          // true
 * isIterable(new Set([1]))   // true
 * isIterable(42)             // false
 * ```
 */
export function isIterable<T = unknown>(value: Iterable<T>): boolean
export function isIterable<T = unknown>(value: unknown): value is Iterable<T>
export function isIterable(value: unknown): boolean {
	if (isString(value)) {
		return true
	}
	if (!isObject(value)) {
		return false
	}
	return isFunction(Reflect.get(value, Symbol.iterator))
}

/**
 * Determine whether a value implements the async iterable protocol
 * (`Symbol.asyncIterator`).
 *
 * @param value - The value to test
 * @returns `true` when `value` has a callable `Symbol.asyncIterator`
 *
 * @example
 * ```ts
 * async function* gen() { yield 1 }
 * isAsyncIterable(gen()) // true
 * isAsyncIterable([1])   // false
 * ```
 */
export function isAsyncIterable<T = unknown>(value: AsyncIterable<T>): boolean
export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T>
export function isAsyncIterable(value: unknown): boolean {
	if (!isObject(value)) {
		return false
	}
	return isFunction(Reflect.get(value, Symbol.asyncIterator))
}

// === Object & Collection Guards

/**
 * Determine whether a value is a non-null object.
 *
 * Returns `true` for arrays, class instances, plain objects, `Map`, `Set`,
 * etc. — anything where `typeof value === 'object'` and `value !== null`.
 * Use {@link isRecord} when you need a plain-record check.
 *
 * @param value - The value to test
 * @returns `true` when `typeof value === 'object' && value !== null`
 *
 * @example
 * ```ts
 * isObject({})       // true
 * isObject([])       // true
 * isObject(null)     // false
 * isObject('hello')  // false
 * ```
 */
export function isObject(value: object): boolean
export function isObject(value: unknown): value is object
export function isObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null
}

/**
 * Determine whether a value is a plain record (null-prototype or
 * `Object.prototype` prototype, not an array or class instance).
 *
 * Use this instead of {@link isObject} when you need to distinguish a plain
 * `{}` / `Object.create(null)` from arrays, `Date`, `Map`, etc.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain object literal or `Object.create(null)`
 *
 * @example
 * ```ts
 * isRecord({ a: 1 })         // true
 * isRecord(Object.create(null)) // true
 * isRecord([1, 2])           // false
 * isRecord(new Date())       // false
 * ```
 */
export function isRecord(value: Record<string, unknown>): boolean
export function isRecord(value: unknown): value is Record<string, unknown>
export function isRecord(value: unknown): boolean {
	if (!isObject(value) || isArray(value)) return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * Determine whether a value is a primitive JSON value (`null`, string, number,
 * or boolean).
 *
 * @param value - The value to test
 * @returns `true` when `value` is `null`, a string, a number, or a boolean
 *
 * @example
 * ```ts
 * isJsonPrimitive(null)    // true
 * isJsonPrimitive('hi')    // true
 * isJsonPrimitive(42)      // true
 * isJsonPrimitive(false)   // true
 * isJsonPrimitive({})      // false
 * ```
 */
export function isJsonPrimitive(value: JsonPrimitive): boolean
export function isJsonPrimitive(value: unknown): value is JsonPrimitive
export function isJsonPrimitive(value: unknown): boolean {
	return value === null || isString(value) || isNumber(value) || isBoolean(value)
}

// §13: a PUBLIC type guard must NEVER throw. `isJsonValue` / `isJsonObject` /
// `isJsonSchema` recurse over arbitrary object graphs, so a cyclic input
// (`const a={}; a.self=a`) or a pathologically deep input would otherwise
// recurse until V8 throws a `RangeError` out of the guard. The internal
// workers below thread two pieces of recursion state — never exposed in the
// public signatures:
//
//  1. `seen` — a WeakSet of the ANCESTOR objects currently on the recursion
//     stack. An object is added on entry and REMOVED on exit, so the set is
//     the current root→node path, not an all-visited set. Re-encountering a
//     member of that path is a genuine back-edge (a cycle) → the guard
//     returns `false`. Crucially this does NOT false-positive on
//     shared-but-acyclic substructure: a child reused under two sibling keys
//     (a DAG, valid JSON) is fully validated and removed before the second
//     sibling is visited, so it is never seen as a cycle.
//  2. `depth` — a secondary stack-safety backstop. Precise cycle detection
//     already terminates true cycles; the depth cap only defends against a
//     pathologically deep BUT acyclic graph that the WeakSet cannot catch
//     (no repeated reference) yet would still overflow the native stack.
//     `MAX_JSON_DEPTH` is chosen empirically: this recursive worker's real
//     stack frame (the `Object.values` allocation, the for-of iterator, the
//     WeakSet add/delete, the recursion args) overflows the Node stack at a
//     measured depth of ~4,650 — and a test runner / caller has already
//     consumed part of the stack before the guard is even entered, so the
//     true safe ceiling is lower still. 1,000 sits ~4.6x below the bare
//     overflow point (ample margin even with a pre-consumed stack) while
//     remaining far above any legitimate JSON: real schemas / documents nest
//     a handful to low-tens of levels, so this never false-rejects genuine
//     input — it only converts a pathological depth into a `false` return
//     instead of a thrown `RangeError` (§13). `src/core` has no
//     `constants.ts` (per AGENTS.md §5 a module-local UPPER_SNAKE `const` is
//     acceptable when no constants module exists), so it lives here next to
//     its sole consumers.
const MAX_JSON_DEPTH = 1_000

function isJsonValueInner(value: unknown, seen: WeakSet<object>, depth: number): boolean {
	if (isJsonPrimitive(value)) return true
	if (depth > MAX_JSON_DEPTH) return false
	if (Array.isArray(value)) {
		if (seen.has(value)) return false
		seen.add(value)
		for (const entry of value) {
			if (!isJsonValueInner(entry, seen, depth + 1)) {
				seen.delete(value)
				return false
			}
		}
		seen.delete(value)
		return true
	}
	if (!isRecord(value)) return false
	if (seen.has(value)) return false
	seen.add(value)
	for (const entry of Object.values(value)) {
		if (!isJsonValueInner(entry, seen, depth + 1)) {
			seen.delete(value)
			return false
		}
	}
	seen.delete(value)
	return true
}

/**
 * Determine whether a value is any valid JSON value (primitive, array, or
 * plain-object tree).
 *
 * @remarks
 * Never throws — cycle-safe (back-edge detection via ancestor WeakSet) and
 * depth-capped at 1,000 levels to prevent stack overflow on pathologically
 * deep but acyclic inputs. Shared-but-acyclic sub-trees (DAGs) are fully
 * validated without false positives.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a recursively valid JSON value
 *
 * @example
 * ```ts
 * isJsonValue({ a: [1, null, true] }) // true
 * isJsonValue(undefined)              // false
 * isJsonValue(() => 0)                // false
 * ```
 */
export function isJsonValue(value: JsonValue): boolean
export function isJsonValue(value: unknown): value is JsonValue
export function isJsonValue(value: unknown): boolean {
	return isJsonValueInner(value, new WeakSet<object>(), 0)
}

/**
 * Determine whether a value is a JSON object (plain record whose values are
 * all valid JSON values).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain object with all JSON-valid values
 *
 * @example
 * ```ts
 * isJsonObject({ x: 1, y: [null] }) // true
 * isJsonObject([1, 2])               // false
 * isJsonObject({ fn: () => 0 })      // false
 * ```
 */
export function isJsonObject(value: JsonObject): boolean
export function isJsonObject(value: unknown): value is JsonObject
export function isJsonObject(value: unknown): boolean {
	if (!isRecord(value)) return false
	const seen = new WeakSet<object>()
	for (const entry of Object.values(value)) {
		if (!isJsonValueInner(entry, seen, 1)) return false
	}
	return true
}

/**
 * Determine whether a string is a valid JSON Schema type name.
 *
 * Valid names: `'null'`, `'boolean'`, `'object'`, `'array'`, `'number'`,
 * `'integer'`, `'string'`.
 *
 * @param value - The string to test
 * @returns `true` when `value` is one of the seven JSON Schema type names
 *
 * @example
 * ```ts
 * isJsonSchemaType('string')  // true
 * isJsonSchemaType('integer') // true
 * isJsonSchemaType('Date')    // false
 * ```
 */
export function isJsonSchemaType(value: JsonSchemaType): boolean
export function isJsonSchemaType(value: string): value is JsonSchemaType
export function isJsonSchemaType(value: string): boolean {
	switch (value) {
		case 'null':
		case 'boolean':
		case 'object':
		case 'array':
		case 'number':
		case 'integer':
		case 'string':
			return true
		default:
			return false
	}
}

function isJsonSchemaArrayInner(
	value: unknown,
	seen: WeakSet<object>,
	depth: number,
): value is readonly JsonSchema[] {
	if (!Array.isArray(value)) return false
	for (const entry of value) {
		if (!isJsonSchemaInner(entry, seen, depth)) return false
	}
	return true
}

/**
 * Determine whether a value is an array of valid JSON Schema nodes.
 *
 * Used internally and by compilers to validate keyword values such as
 * `anyOf`, `oneOf`, `allOf`, and `prefixItems`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is an array where every element is a valid
 *          JSON Schema node
 *
 * @example
 * ```ts
 * isJsonSchemaArray([{ type: 'string' }, { type: 'number' }]) // true
 * isJsonSchemaArray({ type: 'string' })                       // false
 * ```
 */
export function isJsonSchemaArray(value: unknown): value is readonly JsonSchema[] {
	return isJsonSchemaArrayInner(value, new WeakSet<object>(), 0)
}

function isJsonSchemaMapValueInner(
	value: unknown,
	seen: WeakSet<object>,
	depth: number,
): value is JsonSchemaMap {
	if (!isRecord(value)) return false
	for (const entry of Object.values(value)) {
		if (!isJsonSchemaInner(entry, seen, depth)) return false
	}
	return true
}

/**
 * Determine whether a value is a map of valid JSON Schema nodes (a plain
 * object whose every value is a valid JSON Schema node).
 *
 * Used to validate JSON Schema keywords such as `properties`,
 * `patternProperties`, `$defs`, and `dependentSchemas`.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain object mapping strings to JSON Schema nodes
 *
 * @example
 * ```ts
 * isJsonSchemaMapValue({ name: { type: 'string' } }) // true
 * isJsonSchemaMapValue({ name: 'string' })            // false
 * ```
 */
export function isJsonSchemaMapValue(value: unknown): value is JsonSchemaMap {
	return isJsonSchemaMapValueInner(value, new WeakSet<object>(), 0)
}

/**
 * Determine whether a value is a map of string arrays (a plain object whose
 * every value is an array of strings).
 *
 * Used to validate the JSON Schema `dependentRequired` keyword, which maps
 * property names to arrays of required-co-property names.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain object mapping strings to `string[]`
 *
 * @example
 * ```ts
 * isJsonSchemaStringArrayMapValue({ credit: ['billing'] }) // true
 * isJsonSchemaStringArrayMapValue({ credit: [42] })        // false
 * ```
 */
export function isJsonSchemaStringArrayMapValue(value: unknown): value is JsonSchemaStringArrayMap {
	if (!isRecord(value)) return false
	for (const entry of Object.values(value)) {
		if (!Array.isArray(entry)) return false
		for (const item of entry) {
			if (!isString(item)) return false
		}
	}
	return true
}

// Keywords whose value is STRUCTURALLY validated by the per-keyword checks in
// `isJsonSchemaInner` below (as a sub-schema, sub-schema array, schema map,
// string array, etc.). The trailing "unrecognized keys" sweep skips exactly
// these so it never RE-WALKS an already-validated keyword — the redundant
// blanket `Object.values → isJsonValue` pass that used to live at the end of
// this guard doubled recursion cost (§5/§20) by re-validating every keyword a
// second time as a plain JSON value. Correctness is preserved: the structured
// checks fully validate these keywords (more strictly than `isJsonValue`
// would — e.g. a sub-schema must be a schema, not merely any JSON value), and
// the scoped sweep still JSON-validates every OTHER (unrecognized / annotation
// / custom `x-*`) key so a non-JSON value at an unknown key (e.g. a function)
// is still rejected.
const STRUCTURED_SCHEMA_KEYWORDS: ReadonlySet<string> = new Set([
	'type',
	'properties',
	'patternProperties',
	'dependentSchemas',
	'$defs',
	'required',
	'dependentRequired',
	'additionalProperties',
	'unevaluatedProperties',
	'propertyNames',
	'items',
	'prefixItems',
	'contains',
	'anyOf',
	'oneOf',
	'allOf',
	'not',
	'if',
	'then',
	'else',
	'enum',
	'const',
	'default',
	'examples',
])

function isJsonSchemaInner(value: unknown, seen: WeakSet<object>, depth: number): boolean {
	if (isBoolean(value)) return true
	if (depth > MAX_JSON_DEPTH) return false
	if (!isRecord(value)) return false
	if (seen.has(value)) return false
	seen.add(value)
	const next = depth + 1
	const ok = isJsonSchemaBody(value, seen, next)
	seen.delete(value)
	return ok
}

function isJsonSchemaBody(
	value: Record<string, unknown>,
	seen: WeakSet<object>,
	depth: number,
): boolean {
	const typeValue = value['type']
	if (typeValue !== undefined) {
		if (isString(typeValue)) {
			if (!isJsonSchemaType(typeValue)) return false
		} else if (Array.isArray(typeValue)) {
			for (const entry of typeValue) {
				if (!isString(entry) || !isJsonSchemaType(entry)) return false
			}
		} else {
			return false
		}
	}

	if (value['properties'] !== undefined && !isJsonSchemaMapValueInner(value['properties'], seen, depth))
		return false
	if (
		value['patternProperties'] !== undefined &&
		!isJsonSchemaMapValueInner(value['patternProperties'], seen, depth)
	)
		return false
	if (
		value['dependentSchemas'] !== undefined &&
		!isJsonSchemaMapValueInner(value['dependentSchemas'], seen, depth)
	)
		return false
	if (value['$defs'] !== undefined && !isJsonSchemaMapValueInner(value['$defs'], seen, depth))
		return false
	if (value['required'] !== undefined) {
		if (!Array.isArray(value['required'])) return false
		for (const entry of value['required']) {
			if (!isString(entry)) return false
		}
	}
	if (value['dependentRequired'] !== undefined) {
		if (!isJsonSchemaStringArrayMapValue(value['dependentRequired'])) return false
	}
	if (value['additionalProperties'] !== undefined) {
		const additionalProperties = value['additionalProperties']
		if (!isBoolean(additionalProperties) && !isJsonSchemaInner(additionalProperties, seen, depth))
			return false
	}
	if (value['unevaluatedProperties'] !== undefined) {
		const unevaluatedProperties = value['unevaluatedProperties']
		if (!isBoolean(unevaluatedProperties) && !isJsonSchemaInner(unevaluatedProperties, seen, depth))
			return false
	}
	if (value['propertyNames'] !== undefined && !isJsonSchemaInner(value['propertyNames'], seen, depth))
		return false
	if (value['items'] !== undefined) {
		const items = value['items']
		if (!isJsonSchemaInner(items, seen, depth) && !isJsonSchemaArrayInner(items, seen, depth))
			return false
	}
	if (value['prefixItems'] !== undefined && !isJsonSchemaArrayInner(value['prefixItems'], seen, depth))
		return false
	if (value['contains'] !== undefined && !isJsonSchemaInner(value['contains'], seen, depth))
		return false
	if (value['anyOf'] !== undefined && !isJsonSchemaArrayInner(value['anyOf'], seen, depth))
		return false
	if (value['oneOf'] !== undefined && !isJsonSchemaArrayInner(value['oneOf'], seen, depth))
		return false
	if (value['allOf'] !== undefined && !isJsonSchemaArrayInner(value['allOf'], seen, depth))
		return false
	if (value['not'] !== undefined && !isJsonSchemaInner(value['not'], seen, depth)) return false
	if (value['if'] !== undefined && !isJsonSchemaInner(value['if'], seen, depth)) return false
	if (value['then'] !== undefined && !isJsonSchemaInner(value['then'], seen, depth)) return false
	if (value['else'] !== undefined && !isJsonSchemaInner(value['else'], seen, depth)) return false
	if (value['enum'] !== undefined) {
		if (!Array.isArray(value['enum'])) return false
		for (const entry of value['enum']) {
			if (!isJsonValueInner(entry, seen, depth)) return false
		}
	}
	if (value['const'] !== undefined && !isJsonValueInner(value['const'], seen, depth)) return false
	if (value['default'] !== undefined && !isJsonValueInner(value['default'], seen, depth)) return false
	if (value['examples'] !== undefined) {
		if (!Array.isArray(value['examples'])) return false
		for (const entry of value['examples']) {
			if (!isJsonValueInner(entry, seen, depth)) return false
		}
	}

	// Scoped replacement for the old blanket sweep: only UNRECOGNIZED keys are
	// JSON-validated here; structurally-validated keywords are skipped so they
	// are not re-walked a second time (the doubled-recursion §5/§20 defect).
	for (const key of Object.keys(value)) {
		if (STRUCTURED_SCHEMA_KEYWORDS.has(key)) continue
		if (!isJsonValueInner(value[key], seen, depth)) return false
	}

	return true
}

/**
 * Determine whether a value is a valid JSON Schema node.
 *
 * Accepts a boolean schema (`true` / `false`) or a plain object satisfying
 * the JSON Schema vocabulary. Never throws — cycle-safe and depth-capped at
 * 1,000 levels.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a structurally valid JSON Schema node
 *
 * @example
 * ```ts
 * isJsonSchema({ type: 'string', minLength: 1 }) // true
 * isJsonSchema(true)                             // true
 * isJsonSchema({ type: 'widget' })               // false — unrecognised type
 * ```
 */
export function isJsonSchema(value: JsonSchema): boolean
export function isJsonSchema(value: unknown): value is JsonSchema
export function isJsonSchema(value: unknown): boolean {
	return isJsonSchemaInner(value, new WeakSet<object>(), 0)
}

/**
 * Determine whether a value is an object-root JSON Schema (a schema where
 * `type === 'object'`).
 *
 * Use when you need to register a schema as a tool parameter object — most
 * agent/tool providers require `"type": "object"` at the root.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a valid JSON Schema with `type: 'object'`
 *
 * @example
 * ```ts
 * isJsonSchemaObject({ type: 'object', properties: {} }) // true
 * isJsonSchemaObject({ type: 'string' })                 // false
 * ```
 */
export function isJsonSchemaObject(value: JsonSchemaObject): boolean
export function isJsonSchemaObject(value: unknown): value is JsonSchemaObject
export function isJsonSchemaObject(value: unknown): boolean {
	return isJsonSchema(value) && isRecord(value) && value['type'] === 'object'
}

/**
 * Determine whether a value is a `Map`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Map`
 *
 * @example
 * ```ts
 * isMap(new Map([['a', 1]])) // true
 * isMap({ a: 1 })            // false
 * ```
 */
export function isMap<K = unknown, V = unknown>(value: ReadonlyMap<K, V>): boolean
export function isMap<K = unknown, V = unknown>(value: unknown): value is ReadonlyMap<K, V>
export function isMap(value: unknown): boolean {
	return value instanceof Map
}

/**
 * Determine whether a value is a `Set`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Set`
 *
 * @example
 * ```ts
 * isSet(new Set([1, 2])) // true
 * isSet([1, 2])          // false
 * ```
 */
export function isSet<T = unknown>(value: ReadonlySet<T>): boolean
export function isSet<T = unknown>(value: unknown): value is ReadonlySet<T>
export function isSet(value: unknown): boolean {
	return value instanceof Set
}

/**
 * Determine whether a value is a `WeakMap`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof WeakMap`
 *
 * @example
 * ```ts
 * isWeakMap(new WeakMap()) // true
 * isWeakMap(new Map())     // false
 * ```
 */
export function isWeakMap(value: WeakMap<object, unknown>): boolean
export function isWeakMap(value: unknown): value is WeakMap<object, unknown>
export function isWeakMap(value: unknown): boolean {
	return value instanceof WeakMap
}

/**
 * Determine whether a value is a `WeakSet`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof WeakSet`
 *
 * @example
 * ```ts
 * isWeakSet(new WeakSet()) // true
 * isWeakSet(new Set())     // false
 * ```
 */
export function isWeakSet(value: WeakSet<object>): boolean
export function isWeakSet(value: unknown): value is WeakSet<object>
export function isWeakSet(value: unknown): boolean {
	return value instanceof WeakSet
}

// === Array & TypedArray Guards

/**
 * Determine whether a value is an array.
 *
 * @param value - The value to test
 * @returns `true` when `Array.isArray(value)`
 *
 * @example
 * ```ts
 * isArray([1, 2, 3]) // true
 * isArray('abc')     // false
 * ```
 */
export function isArray<T = unknown>(value: readonly T[]): boolean
export function isArray<T = unknown>(value: unknown): value is readonly T[]
export function isArray(value: unknown): boolean {
	return Array.isArray(value)
}

/**
 * Determine whether a value is a `DataView`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof DataView`
 *
 * @example
 * ```ts
 * isDataView(new DataView(new ArrayBuffer(8))) // true
 * isDataView(new Uint8Array(8))                // false
 * ```
 */
export function isDataView(value: DataView<ArrayBufferLike>): boolean
export function isDataView(value: unknown): value is DataView<ArrayBufferLike>
export function isDataView(value: unknown): boolean {
	return value instanceof DataView
}

/**
 * Determine whether a value is an `ArrayBufferView` (any typed array or
 * `DataView`).
 *
 * @param value - The value to test
 * @returns `true` when `ArrayBuffer.isView(value)`
 *
 * @example
 * ```ts
 * isArrayBufferView(new Uint8Array(4)) // true
 * isArrayBufferView(new ArrayBuffer(4)) // false
 * ```
 */
export function isArrayBufferView(value: ArrayBufferView): boolean
export function isArrayBufferView(value: unknown): value is ArrayBufferView
export function isArrayBufferView(value: unknown): boolean {
	return ArrayBuffer.isView(value)
}

/**
 * Determine whether a value is an `Int8Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Int8Array`
 *
 * @example
 * ```ts
 * isInt8Array(new Int8Array(4)) // true
 * ```
 */
export function isInt8Array(value: Int8Array): boolean
export function isInt8Array(value: unknown): value is Int8Array
export function isInt8Array(value: unknown): boolean {
	return value instanceof Int8Array
}

/**
 * Determine whether a value is a `Uint8Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Uint8Array`
 *
 * @example
 * ```ts
 * isUint8Array(new Uint8Array(4)) // true
 * ```
 */
export function isUint8Array(value: Uint8Array): boolean
export function isUint8Array(value: unknown): value is Uint8Array
export function isUint8Array(value: unknown): boolean {
	return value instanceof Uint8Array
}

/**
 * Determine whether a value is a `Uint8ClampedArray`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Uint8ClampedArray`
 *
 * @example
 * ```ts
 * isUint8ClampedArray(new Uint8ClampedArray(4)) // true
 * ```
 */
export function isUint8ClampedArray(value: Uint8ClampedArray): boolean
export function isUint8ClampedArray(value: unknown): value is Uint8ClampedArray
export function isUint8ClampedArray(value: unknown): boolean {
	return value instanceof Uint8ClampedArray
}

/**
 * Determine whether a value is an `Int16Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Int16Array`
 *
 * @example
 * ```ts
 * isInt16Array(new Int16Array(4)) // true
 * ```
 */
export function isInt16Array(value: Int16Array): boolean
export function isInt16Array(value: unknown): value is Int16Array
export function isInt16Array(value: unknown): boolean {
	return value instanceof Int16Array
}

/**
 * Determine whether a value is a `Uint16Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Uint16Array`
 *
 * @example
 * ```ts
 * isUint16Array(new Uint16Array(4)) // true
 * ```
 */
export function isUint16Array(value: Uint16Array): boolean
export function isUint16Array(value: unknown): value is Uint16Array
export function isUint16Array(value: unknown): boolean {
	return value instanceof Uint16Array
}

/**
 * Determine whether a value is an `Int32Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Int32Array`
 *
 * @example
 * ```ts
 * isInt32Array(new Int32Array(4)) // true
 * ```
 */
export function isInt32Array(value: Int32Array): boolean
export function isInt32Array(value: unknown): value is Int32Array
export function isInt32Array(value: unknown): boolean {
	return value instanceof Int32Array
}

/**
 * Determine whether a value is a `Uint32Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Uint32Array`
 *
 * @example
 * ```ts
 * isUint32Array(new Uint32Array(4)) // true
 * ```
 */
export function isUint32Array(value: Uint32Array): boolean
export function isUint32Array(value: unknown): value is Uint32Array
export function isUint32Array(value: unknown): boolean {
	return value instanceof Uint32Array
}

/**
 * Determine whether a value is a `Float32Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Float32Array`
 *
 * @example
 * ```ts
 * isFloat32Array(new Float32Array(4)) // true
 * ```
 */
export function isFloat32Array(value: Float32Array): boolean
export function isFloat32Array(value: unknown): value is Float32Array
export function isFloat32Array(value: unknown): boolean {
	return value instanceof Float32Array
}

/**
 * Determine whether a value is a `Float64Array`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Float64Array`
 *
 * @example
 * ```ts
 * isFloat64Array(new Float64Array(4)) // true
 * ```
 */
export function isFloat64Array(value: Float64Array): boolean
export function isFloat64Array(value: unknown): value is Float64Array
export function isFloat64Array(value: unknown): boolean {
	return value instanceof Float64Array
}

/**
 * Determine whether a value is a `BigInt64Array`.
 *
 * Guards the global existence of `BigInt64Array` first — safe in environments
 * that pre-date the BigInt typed-array additions.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof BigInt64Array`
 *
 * @example
 * ```ts
 * isBigInt64Array(new BigInt64Array(4)) // true (when available)
 * ```
 */
export function isBigInt64Array(value: BigInt64Array): boolean
export function isBigInt64Array(value: unknown): value is BigInt64Array
export function isBigInt64Array(value: unknown): boolean {
	return typeof BigInt64Array !== 'undefined' && value instanceof BigInt64Array
}

/**
 * Determine whether a value is a `BigUint64Array`.
 *
 * Guards the global existence of `BigUint64Array` first — safe in environments
 * that pre-date the BigInt typed-array additions.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof BigUint64Array`
 *
 * @example
 * ```ts
 * isBigUint64Array(new BigUint64Array(4)) // true (when available)
 * ```
 */
export function isBigUint64Array(value: BigUint64Array): boolean
export function isBigUint64Array(value: unknown): value is BigUint64Array
export function isBigUint64Array(value: unknown): boolean {
	return typeof BigUint64Array !== 'undefined' && value instanceof BigUint64Array
}

// === Emptiness Guards

/**
 * Determine whether a value is the empty string `''`.
 *
 * @param value - The value to test
 * @returns `true` when `value === ''`
 *
 * @example
 * ```ts
 * isEmptyString('')    // true
 * isEmptyString(' ')   // false
 * ```
 */
export function isEmptyString(value: unknown): value is '' {
	return value === ''
}

/**
 * Determine whether a value is an empty array.
 *
 * @param value - The value to test
 * @returns `true` when `value` is an array with length 0
 *
 * @example
 * ```ts
 * isEmptyArray([])    // true
 * isEmptyArray([1])   // false
 * ```
 */
export function isEmptyArray(value: readonly []): boolean
export function isEmptyArray(value: unknown): value is readonly []
export function isEmptyArray(value: unknown): boolean {
	return isArray(value) && value.length === 0
}

/**
 * Determine whether a value is an empty plain object (no own string or
 * enumerable symbol keys).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain record with no own enumerable keys
 *
 * @example
 * ```ts
 * isEmptyObject({})         // true
 * isEmptyObject({ a: 1 })   // false
 * ```
 */
export function isEmptyObject(value: Record<string | symbol, never>): boolean
export function isEmptyObject(value: unknown): value is Record<string | symbol, never>
export function isEmptyObject(value: unknown): boolean {
	if (!isRecord(value)) {
		return false
	}
	return Object.keys(value).length === 0 && enumerableSymbolCount(value) === 0
}

/**
 * Determine whether a value is an empty `Map`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Map && value.size === 0`
 *
 * @example
 * ```ts
 * isEmptyMap(new Map())           // true
 * isEmptyMap(new Map([['a', 1]])) // false
 * ```
 */
export function isEmptyMap(value: ReadonlyMap<never, never>): boolean
export function isEmptyMap(value: unknown): value is ReadonlyMap<never, never>
export function isEmptyMap(value: unknown): boolean {
	return value instanceof Map && value.size === 0
}

/**
 * Determine whether a value is an empty `Set`.
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Set && value.size === 0`
 *
 * @example
 * ```ts
 * isEmptySet(new Set())      // true
 * isEmptySet(new Set([1]))   // false
 * ```
 */
export function isEmptySet(value: ReadonlySet<never>): boolean
export function isEmptySet(value: unknown): value is ReadonlySet<never>
export function isEmptySet(value: unknown): boolean {
	return value instanceof Set && value.size === 0
}

/**
 * Determine whether a value is a non-empty string (at least one character).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a string with `length > 0`
 *
 * @example
 * ```ts
 * isNonEmptyString('hi') // true
 * isNonEmptyString('')   // false
 * ```
 */
export function isNonEmptyString(value: string): boolean
export function isNonEmptyString(value: unknown): value is string
export function isNonEmptyString(value: unknown): boolean {
	return isString(value) && value.length > 0
}

/**
 * Determine whether a value is a non-empty array (at least one element).
 *
 * @param value - The value to test
 * @returns `true` when `value` is an array with `length > 0`
 *
 * @example
 * ```ts
 * isNonEmptyArray([1])  // true
 * isNonEmptyArray([])   // false
 * ```
 */
export function isNonEmptyArray<T = unknown>(value: readonly [T, ...T[]]): boolean
export function isNonEmptyArray<T = unknown>(value: unknown): value is readonly [T, ...T[]]
export function isNonEmptyArray(value: unknown): boolean {
	return isArray(value) && value.length > 0
}

/**
 * Determine whether a value is a non-empty plain object (at least one own
 * string or enumerable symbol key).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a plain record with at least one own key
 *
 * @example
 * ```ts
 * isNonEmptyObject({ a: 1 }) // true
 * isNonEmptyObject({})       // false
 * ```
 */
export function isNonEmptyObject(value: Record<string | symbol, unknown>): boolean
export function isNonEmptyObject(value: unknown): value is Record<string | symbol, unknown>
export function isNonEmptyObject(value: unknown): boolean {
	if (!isRecord(value)) {
		return false
	}
	return Object.keys(value).length > 0 || enumerableSymbolCount(value) > 0
}

/**
 * Determine whether a value is a non-empty `Map` (at least one entry).
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Map && value.size > 0`
 *
 * @example
 * ```ts
 * isNonEmptyMap(new Map([['a', 1]])) // true
 * isNonEmptyMap(new Map())           // false
 * ```
 */
export function isNonEmptyMap<K = unknown, V = unknown>(value: ReadonlyMap<K, V>): boolean
export function isNonEmptyMap<K = unknown, V = unknown>(value: unknown): value is ReadonlyMap<K, V>
export function isNonEmptyMap(value: unknown): boolean {
	return value instanceof Map && value.size > 0
}

/**
 * Determine whether a value is a non-empty `Set` (at least one element).
 *
 * @param value - The value to test
 * @returns `true` when `value instanceof Set && value.size > 0`
 *
 * @example
 * ```ts
 * isNonEmptySet(new Set([1])) // true
 * isNonEmptySet(new Set())    // false
 * ```
 */
export function isNonEmptySet<T = unknown>(value: ReadonlySet<T>): boolean
export function isNonEmptySet<T = unknown>(value: unknown): value is ReadonlySet<T>
export function isNonEmptySet(value: unknown): boolean {
	return value instanceof Set && value.size > 0
}

// === Function Guards

/**
 * Determine whether a function declares zero parameters (`Function.length === 0`).
 *
 * @param value - The function to test
 * @returns `true` when `value.length === 0`
 *
 * @example
 * ```ts
 * isZeroArg(() => 1)        // true
 * isZeroArg((x: number) => x) // false
 * ```
 */
export function isZeroArg<F extends ZeroArgFunction>(value: F): value is F
export function isZeroArg(value: AnyFunction): value is ZeroArgFunction
export function isZeroArg(value: AnyFunction): boolean {
	return value.length === 0
}

/**
 * Determine whether a function is a native async function (`async function`).
 *
 * Uses `constructor.name === 'AsyncFunction'` — not `instanceof`, which is
 * unreliable across realms.
 *
 * @param value - The value to test
 * @returns `true` when `value` is an `async function`
 *
 * @example
 * ```ts
 * isAsyncFunction(async () => 1)  // true
 * isAsyncFunction(() => 1)        // false
 * ```
 */
export function isAsyncFunction<F extends AnyAsyncFunction>(value: F): value is F
export function isAsyncFunction(value: unknown): value is AnyAsyncFunction
export function isAsyncFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'AsyncFunction'
}

/**
 * Determine whether a function is a generator function (`function*`).
 *
 * @param value - The value to test
 * @returns `true` when `value` is a `function*`
 *
 * @example
 * ```ts
 * function* gen() { yield 1 }
 * isGeneratorFunction(gen) // true
 * isGeneratorFunction(() => 1) // false
 * ```
 */
export function isGeneratorFunction<
	F extends (...args: unknown[]) => Generator<unknown, unknown, unknown>,
>(value: F): value is F
export function isGeneratorFunction(
	value: unknown,
): value is (...args: unknown[]) => Generator<unknown, unknown, unknown>
export function isGeneratorFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'GeneratorFunction'
}

/**
 * Determine whether a function is an async generator function (`async function*`).
 *
 * @param value - The value to test
 * @returns `true` when `value` is an `async function*`
 *
 * @example
 * ```ts
 * async function* agen() { yield 1 }
 * isAsyncGeneratorFunction(agen) // true
 * ```
 */
export function isAsyncGeneratorFunction<
	F extends (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>,
>(value: F): value is F
export function isAsyncGeneratorFunction(
	value: unknown,
): value is (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>
export function isAsyncGeneratorFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'AsyncGeneratorFunction'
}

/**
 * Determine whether a value is a zero-argument async function.
 *
 * @param value - The value to test
 * @returns `true` when `value` is `async` and accepts no parameters
 *
 * @example
 * ```ts
 * isZeroArgAsync(async () => 1)       // true
 * isZeroArgAsync(async (x: number) => x) // false
 * ```
 */
export function isZeroArgAsync<F extends ZeroArgAsyncFunction>(value: F): value is F
export function isZeroArgAsync(value: unknown): value is ZeroArgAsyncFunction
export function isZeroArgAsync(value: unknown): boolean {
	return isFunction(value) && isZeroArg(value) && isAsyncFunction(value)
}

/**
 * Determine whether a value is a zero-argument generator function.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a `function*` with no parameters
 *
 * @example
 * ```ts
 * function* gen() { yield 1 }
 * isZeroArgGenerator(gen) // true
 * ```
 */
export function isZeroArgGenerator<
	F extends (...args: unknown[]) => Generator<unknown, unknown, unknown>,
>(value: F): value is F
export function isZeroArgGenerator(
	value: unknown,
): value is () => Generator<unknown, unknown, unknown>
export function isZeroArgGenerator(value: unknown): boolean {
	return isFunction(value) && isZeroArg(value) && isGeneratorFunction(value)
}

/**
 * Determine whether a value is a zero-argument async generator function.
 *
 * @param value - The value to test
 * @returns `true` when `value` is an `async function*` with no parameters
 *
 * @example
 * ```ts
 * async function* agen() { yield 1 }
 * isZeroArgAsyncGenerator(agen) // true
 * ```
 */
export function isZeroArgAsyncGenerator<
	F extends (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>,
>(value: F): value is F
export function isZeroArgAsyncGenerator(
	value: unknown,
): value is () => AsyncGenerator<unknown, unknown, unknown>
export function isZeroArgAsyncGenerator(value: unknown): boolean {
	return isFunction(value) && isZeroArg(value) && isAsyncGeneratorFunction(value)
}

// === Guard Compositors

/**
 * Build a guard that accepts arrays whose every element satisfies
 * `elementGuard`.
 *
 * @param elementGuard - Guard or predicate for each element
 * @returns A guard for `readonly T[]`
 *
 * @example
 * ```ts
 * const isStringArray = arrayOf(isString)
 * isStringArray(['a', 'b']) // true
 * isStringArray(['a', 1])   // false
 * ```
 */
export function arrayOf<T>(elementGuard: Guard<T>): Guard<readonly T[]>
export function arrayOf(elementGuard: (value: unknown) => boolean): Guard<readonly unknown[]>
export function arrayOf(elementGuard: (value: unknown) => boolean): Guard<readonly unknown[]> {
	return (value: unknown): value is readonly unknown[] =>
		isArray(value) && value.every(elementGuard)
}

/**
 * Build a guard that accepts tuples of a fixed arity, where each index is
 * tested by the corresponding guard.
 *
 * @param guards - One guard per tuple position (rest-spread)
 * @returns A guard for the inferred tuple type
 *
 * @example
 * ```ts
 * const isPair = tupleOf(isString, isNumber)
 * isPair(['hello', 42]) // true
 * isPair(['hello'])     // false — wrong arity
 * ```
 */
export function tupleOf<const Gs extends ReadonlyArray<Guard<unknown>>>(
	...guards: Gs
): Guard<TupleFromGuards<Gs>>
export function tupleOf(
	...predicates: ReadonlyArray<(value: unknown) => boolean>
): Guard<readonly unknown[]>
export function tupleOf(
	...guards: ReadonlyArray<(value: unknown) => boolean>
): Guard<readonly unknown[]> {
	return (value: unknown): value is readonly unknown[] => {
		if (!isArray(value) || value.length !== guards.length) {
			return false
		}

		for (let index = 0; index < guards.length; index += 1) {
			const guard = guards[index]
			if (!guard?.(value[index])) {
				return false
			}
		}

		return true
	}
}

/**
 * Build a guard that accepts values identical (via `Object.is`) to one of the
 * provided literal primitives.
 *
 * @param literals - The allowed literal values (rest-spread)
 * @returns A guard narrowed to the union of those literals
 *
 * @example
 * ```ts
 * const isRole = literalOf('admin', 'member', 'guest')
 * isRole('admin') // true
 * isRole('owner') // false
 * ```
 */
export function literalOf<const Literals extends ReadonlyArray<string | number | boolean>>(
	...literals: Literals
): Guard<Literals[number]> {
	return (value: unknown): value is Literals[number] =>
		literals.some((literal) => Object.is(literal, value))
}

/**
 * Build a guard that accepts instances of the provided constructor.
 *
 * First verifies that `ctor` is a real constructor (via {@link isConstructor})
 * so passing an arrow function does not silently produce a broken guard.
 *
 * @param ctor - A constructable class or function
 * @returns A guard for `InstanceType<C>`
 *
 * @example
 * ```ts
 * const isDate = instanceOf(Date)
 * isDate(new Date()) // true
 * isDate({})         // false
 * ```
 */
export function instanceOf<C>(ctor: C): Guard<InstanceType<C & AnyConstructor<object>>> {
	return (value: unknown): value is InstanceType<C & AnyConstructor<object>> =>
		isConstructor(ctor) && isObject(value) && value instanceof ctor
}

/**
 * Build a guard from a native TypeScript `enum` or any object whose values
 * are strings or numbers.
 *
 * Collects `Object.values(enumeration)` into a `Set` at creation time for O(1)
 * lookups.
 *
 * @param enumeration - The enum or enum-like object
 * @returns A guard for the value union `E[keyof E]`
 *
 * @example
 * ```ts
 * enum Direction { Up = 'up', Down = 'down' }
 * const isDirection = enumOf(Direction)
 * isDirection('up')   // true
 * isDirection('left') // false
 * ```
 */
export function enumOf<E extends Record<string, string | number>>(
	enumeration: E,
): Guard<E[keyof E]> {
	const values = new Set(Object.values(enumeration))
	return (value: unknown): value is E[keyof E] =>
		(isString(value) || isNumber(value)) && values.has(value)
}

/**
 * Build a guard that accepts `Set` instances whose every element satisfies
 * `elementGuard`.
 *
 * @param elementGuard - Guard or predicate for each element
 * @returns A guard for `ReadonlySet<T>`
 *
 * @example
 * ```ts
 * const isStringSet = setOf(isString)
 * isStringSet(new Set(['a', 'b'])) // true
 * isStringSet(new Set(['a', 1]))   // false
 * ```
 */
export function setOf<T>(elementGuard: Guard<T>): Guard<ReadonlySet<T>>
export function setOf(elementGuard: (value: unknown) => boolean): Guard<ReadonlySet<unknown>>
export function setOf(elementGuard: (value: unknown) => boolean): Guard<ReadonlySet<unknown>> {
	return (value: unknown): value is ReadonlySet<unknown> => {
		if (!isSet(value)) {
			return false
		}
		for (const entry of value) {
			if (!elementGuard(entry)) {
				return false
			}
		}
		return true
	}
}

/**
 * Build a guard that accepts `Map` instances where every key satisfies
 * `keyGuard` and every value satisfies `valueGuard`.
 *
 * @param keyGuard - Guard or predicate for map keys
 * @param valueGuard - Guard or predicate for map values
 * @returns A guard for `ReadonlyMap<K, V>`
 *
 * @example
 * ```ts
 * const isStringNumberMap = mapOf(isString, isNumber)
 * isStringNumberMap(new Map([['a', 1]])) // true
 * isStringNumberMap(new Map([[1, 'a']]))  // false
 * ```
 */
export function mapOf<K, V>(keyGuard: Guard<K>, valueGuard: Guard<V>): Guard<ReadonlyMap<K, V>>
export function mapOf(
	keyPredicate: (value: unknown) => boolean,
	valuePredicate: (value: unknown) => boolean,
): Guard<ReadonlyMap<unknown, unknown>>
export function mapOf(
	keyGuard: (value: unknown) => boolean,
	valueGuard: (value: unknown) => boolean,
): Guard<ReadonlyMap<unknown, unknown>> {
	return (value: unknown): value is ReadonlyMap<unknown, unknown> => {
		if (!isMap(value)) {
			return false
		}
		for (const [key, entryValue] of value) {
			if (!keyGuard(key) || !valueGuard(entryValue)) {
				return false
			}
		}
		return true
	}
}

export function recordOf<S extends GuardsShape>(shape: S): Guard<FromGuards<S>>
export function recordOf<S extends GuardsShape, K extends ReadonlyArray<keyof S & string>>(
	shape: S,
	optional: K,
): Guard<OptionalFromGuards<S, K>>
export function recordOf<S extends GuardsShape>(
	shape: S,
	optional: true,
): Guard<Readonly<{ [P in keyof S]: FromGuards<S>[P] | undefined }>>

/**
 * Build a guard that accepts plain records matching a guard shape.
 *
 * @remarks
 * Three calling modes depending on the `optional` argument:
 * - **No `optional`** — all shape keys are required; extra keys are rejected.
 * - **`optional: K[]`** — the listed keys are optional; all others required.
 * - **`optional: true`** — every key in the shape is optional.
 *
 * @param shape - An object mapping property names to guards
 * @param optional - A key list, `true` (all optional), or omitted (all required)
 * @returns A guard for the inferred record type
 *
 * @example
 * ```ts
 * const isUser = recordOf({ name: isString, age: isNumber })
 * isUser({ name: 'Ada', age: 36 }) // true
 * isUser({ name: 'Ada' })          // false — age missing
 *
 * const isPartial = recordOf({ name: isString, age: isNumber }, ['age'])
 * isPartial({ name: 'Ada' }) // true
 * ```
 */
export function recordOf<
	S extends GuardsShape,
	K extends ReadonlyArray<keyof S & string> | true | undefined,
>(
	shape: S,
	optional?: K,
): Guard<
	K extends true
		? Readonly<{ [P in keyof S]: FromGuards<S>[P] | undefined }>
		: K extends ReadonlyArray<keyof S & string>
			? OptionalFromGuards<S, K>
			: FromGuards<S>
> {
	const allowed = new Set<string>()
	for (const key in shape) {
		if (Object.prototype.hasOwnProperty.call(shape, key)) {
			allowed.add(key)
		}
	}
	const optionalSet = new Set<string>(
		optional === true ? [...allowed] : isArray(optional) ? optional.map((key) => String(key)) : [],
	)

	return (
		value: unknown,
	): value is K extends true
		? Readonly<{ [P in keyof S]: FromGuards<S>[P] | undefined }>
		: K extends ReadonlyArray<keyof S & string>
			? OptionalFromGuards<S, K>
			: FromGuards<S> => {
		if (!isRecord(value)) {
			return false
		}

		for (const key of Object.keys(value)) {
			if (!allowed.has(key)) {
				return false
			}
		}

		for (const key in shape) {
			if (!Object.prototype.hasOwnProperty.call(shape, key)) {
				continue
			}
			const present = key in value
			if (!optionalSet.has(key) && !present) {
				return false
			}
			if (present) {
				const guard = shape[key]
				if (!guard(value[key])) {
					return false
				}
			}
		}

		return true
	}
}

/**
 * Build a guard that accepts any iterable whose every element satisfies
 * `elementGuard`.
 *
 * Consumes the iterable lazily; works with arrays, sets, generators, and any
 * other `Iterable<T>`.
 *
 * @param elementGuard - Guard or predicate for each element
 * @returns A guard for `Iterable<T>`
 *
 * @example
 * ```ts
 * const isNumberIterable = iterableOf(isNumber)
 * isNumberIterable([1, 2, 3])         // true
 * isNumberIterable(new Set([1, 2]))   // true
 * isNumberIterable([1, 'two'])        // false
 * ```
 */
export function iterableOf<T>(elementGuard: Guard<T>): Guard<Iterable<T>>
export function iterableOf(elementGuard: (value: unknown) => boolean): Guard<Iterable<unknown>>
export function iterableOf(elementGuard: (value: unknown) => boolean): Guard<Iterable<unknown>> {
	return (value: unknown): value is Iterable<unknown> => {
		if (!isIterable(value)) {
			return false
		}
		for (const entry of value) {
			if (!elementGuard(entry)) {
				return false
			}
		}
		return true
	}
}

/**
 * Build a guard that accepts values that are own keys of the provided object.
 *
 * Useful for discriminating on the key set of a constant lookup table or
 * enum-like object without duplicating the key list.
 *
 * @param value - The object whose own keys define the allowed values
 * @returns A guard for `keyof O`
 *
 * @example
 * ```ts
 * const COLORS = { red: '#f00', green: '#0f0', blue: '#00f' } as const
 * const isColorKey = keyOf(COLORS)
 * isColorKey('red')    // true
 * isColorKey('purple') // false
 * ```
 */
export function keyOf<const O extends Readonly<Record<PropertyKey, unknown>>>(
	value: O,
): Guard<keyof O> {
	return (entry: unknown): entry is keyof O =>
		(isString(entry) || isSymbol(entry) || isNumber(entry)) && entry in value
}

/**
 * Build a new guard shape by keeping only the listed keys from an existing
 * shape — the structural equivalent of TypeScript's `Pick<T, K>`.
 *
 * Does NOT produce a guard; produces a shape suitable for passing to
 * {@link recordOf} or {@link compileGuard}.
 *
 * @param shape - The source guard shape
 * @param keys - The keys to keep
 * @returns A new guard shape containing only the picked keys
 *
 * @example
 * ```ts
 * const fullShape = { name: isString, age: isNumber, role: isString }
 * const nameShape = pickOf(fullShape, ['name'])
 * const isName = recordOf(nameShape)
 * isName({ name: 'Ada' }) // true
 * ```
 */
export function pickOf<S extends GuardsShape, K extends ReadonlyArray<keyof S & string>>(
	shape: S,
	keys: K,
): Pick<S, K[number]> {
	// Honest typing: the accumulator IS the picked-shape type, so every
	// `result[key] = shape[key]` write is checked against `S[P]` for that key —
	// no `asserts`-laundering of a completeness the runtime never verifies, and
	// no `as`/`!`. A precise generic mapped type has no `as`-free empty literal
	// (TS won't seed `{ [P in K]: S[P] }` from `{}` or a string index sig), so
	// the seed is a genuine null-prototype empty object; the binding annotation
	// fixes its type immediately and it is filled before any read.
	const result: { [P in K[number]]: S[P] } = Object.create(null)
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(shape, key)) {
			result[key] = shape[key]
		}
	}
	return result
}

/**
 * Build a new guard shape by removing the listed keys from an existing shape
 * — the structural equivalent of TypeScript's `Omit<T, K>`.
 *
 * Does NOT produce a guard; produces a shape suitable for passing to
 * {@link recordOf} or {@link compileGuard}.
 *
 * @param shape - The source guard shape
 * @param keys - The keys to remove
 * @returns A new guard shape without the omitted keys
 *
 * @example
 * ```ts
 * const fullShape = { name: isString, age: isNumber, role: isString }
 * const publicShape = omitOf(fullShape, ['role'])
 * const isPublicUser = recordOf(publicShape)
 * isPublicUser({ name: 'Ada', age: 36 }) // true
 * ```
 */
export function omitOf<S extends GuardsShape, K extends ReadonlyArray<keyof S & string>>(
	shape: S,
	keys: K,
): Omit<S, K[number]> {
	const skipped = new Set<PropertyKey>()
	for (const key of keys) {
		skipped.add(key)
	}
	// Build into the full-shape type (sound over-approximation: only kept keys
	// are written, so the value structurally satisfies `Omit<S, K[number]>` —
	// every Omit-required key is copied, never skipped). Same honest typing as
	// `pickOf`: no `as`/`!`/`asserts`; seed is a genuine empty object.
	const result: { [P in keyof S]: S[P] } = Object.create(null)
	for (const key in shape) {
		if (!Object.prototype.hasOwnProperty.call(shape, key)) {
			continue
		}
		if (!skipped.has(key)) {
			result[key] = shape[key]
		}
	}
	return result
}

/**
 * Combine two guards with logical AND — the result passes only when both
 * `left` and `right` pass.
 *
 * Use {@link whereOf} when the right predicate is a refinement of an already
 * narrowed type. Use `andOf` for combining two independent guards.
 *
 * @param left - The first guard
 * @param right - The second guard
 * @returns A guard for `A & B`
 *
 * @example
 * ```ts
 * const isNonEmptyStr = andOf(isString, isNonEmptyString)
 * isNonEmptyStr('hi') // true
 * isNonEmptyStr('')   // false
 * ```
 */
export function andOf<A, B>(left: Guard<A>, right: Guard<B>): Guard<A & B>
export function andOf<T, U extends T>(left: Guard<T>, right: (value: T) => value is U): Guard<U>
export function andOf<T>(left: Guard<T>, right: (value: T) => boolean): Guard<T>
export function andOf(
	left: (value: unknown) => boolean,
	right: (value: unknown) => boolean,
): Guard<unknown>
export function andOf(
	left: (value: unknown) => boolean,
	right: (value: unknown) => boolean,
): Guard<unknown> {
	return (value: unknown): value is unknown => left(value) && right(value)
}

/**
 * Combine two guards with logical OR — the result passes when at least one of
 * `left` or `right` passes.
 *
 * For more than two variants prefer {@link unionOf}.
 *
 * @param left - The first guard
 * @param right - The second guard
 * @returns A guard for `A | B`
 *
 * @example
 * ```ts
 * const isStringOrNumber = orOf(isString, isNumber)
 * isStringOrNumber('hi') // true
 * isStringOrNumber(42)   // true
 * isStringOrNumber(true) // false
 * ```
 */
export function orOf<A, B>(left: Guard<A>, right: Guard<B>): Guard<A | B>
export function orOf(
	left: (value: unknown) => boolean,
	right: (value: unknown) => boolean,
): Guard<unknown>
export function orOf(
	left: (value: unknown) => boolean,
	right: (value: unknown) => boolean,
): Guard<unknown> {
	return (value: unknown): value is unknown => left(value) || right(value)
}

/**
 * Negate a guard or predicate — the result passes when `guard` returns
 * `false`.
 *
 * The returned guard is typed as `Guard<unknown>` because TypeScript cannot
 * express `Exclude<unknown, T>` usefully; use {@link complementOf} when you
 * need the narrowed `Exclude<TBase, TExcluded>` type.
 *
 * @param guard - The guard to negate
 * @returns A guard that accepts whatever `guard` rejects
 *
 * @example
 * ```ts
 * const isNotNull = notOf(isNull)
 * isNotNull('hello') // true
 * isNotNull(null)    // false
 * ```
 */
export function notOf(guard: (value: unknown) => boolean): Guard<unknown> {
	return (value: unknown): value is unknown => !guard(value)
}

/**
 * Build a guard for the type `Exclude<TBase, TExcluded>` — accepts values
 * that pass `base` but not `excluded`.
 *
 * Use when you have a base type and want to subtract a well-typed subset.
 * For a simple negation without a base type, use {@link notOf}.
 *
 * @param base - The base guard defining the accepted superset
 * @param excluded - A guard for the subset to exclude
 * @returns A guard for `Exclude<TBase, TExcluded>`
 *
 * @example
 * ```ts
 * const isNonNullString = complementOf(isString, isEmptyString)
 * isNonNullString('hi') // true
 * isNonNullString('')   // false
 * ```
 */
export function complementOf<TBase, TExcluded extends TBase>(
	base: Guard<TBase>,
	excluded: Guard<TExcluded> | ((value: TBase) => value is TExcluded),
): Guard<Exclude<TBase, TExcluded>> {
	return (value: unknown): value is Exclude<TBase, TExcluded> => {
		if (!base(value)) {
			return false
		}
		return !excluded(value)
	}
}

/**
 * Build a guard that accepts values matching at least one of the provided
 * guards — the variadic form of {@link orOf}.
 *
 * @param guards - Two or more guards (rest-spread)
 * @returns A guard for the union of all guarded types
 *
 * @example
 * ```ts
 * const isStringOrBoolean = unionOf(isString, isBoolean)
 * isStringOrBoolean('hi')  // true
 * isStringOrBoolean(false) // true
 * isStringOrBoolean(42)    // false
 * ```
 */
export function unionOf<const Gs extends ReadonlyArray<Guard<unknown>>>(
	...guards: Gs
): Guard<GuardType<Gs[number]>>
export function unionOf(...predicates: ReadonlyArray<(value: unknown) => boolean>): Guard<unknown>
export function unionOf(...guards: ReadonlyArray<(value: unknown) => boolean>): Guard<unknown> {
	return (value: unknown): value is unknown => guards.some((guard) => guard(value))
}

/**
 * Build a guard that accepts values matching ALL of the provided guards —
 * the variadic form of {@link andOf}.
 *
 * @param guards - Two or more guards (rest-spread)
 * @returns A guard for the intersection of all guarded types
 *
 * @example
 * ```ts
 * const isNonEmptyStr = intersectionOf(isString, isNonEmptyString)
 * isNonEmptyStr('hi') // true
 * isNonEmptyStr('')   // false
 * ```
 */
export function intersectionOf<const Gs extends ReadonlyArray<Guard<unknown>>>(
	...guards: Gs
): Guard<IntersectionFromGuards<Gs>>
export function intersectionOf(
	...predicates: ReadonlyArray<(value: unknown) => boolean>
): Guard<unknown>
export function intersectionOf(
	...guards: ReadonlyArray<(value: unknown) => boolean>
): Guard<unknown> {
	return (value: unknown): value is unknown => guards.every((guard) => guard(value))
}

/**
 * Refine a base guard with an additional predicate that runs only when the
 * base passes.
 *
 * The predicate receives a value already narrowed to `T`, so it can use
 * type-safe operations without re-checking. Used internally to build
 * {@link isFiniteNumber}.
 *
 * Per AGENTS.md §13 the returned guard never throws: if `predicate` throws,
 * the throw is contained and the guard reports a non-match (`false`).
 *
 * @param base - The base guard; provides initial narrowing
 * @param predicate - Further refinement predicate; only called when `base`
 *                     passes. A throw from it is treated as a non-match
 * @returns A guard that requires both `base` and `predicate` to return `true`
 *
 * @example
 * ```ts
 * const isPositiveNumber = whereOf(isNumber, (n) => n > 0)
 * isPositiveNumber(5)  // true
 * isPositiveNumber(-1) // false
 * ```
 */
export function whereOf<T>(base: Guard<T>, predicate: (value: T) => boolean): Guard<T>
export function whereOf<T, U extends T>(
	base: Guard<T>,
	predicate: (value: T) => value is U,
): Guard<T>
export function whereOf<T>(base: Guard<T>, predicate: (value: T) => boolean): Guard<T> {
	return (value: unknown): value is T => {
		if (!base(value)) {
			return false
		}
		// `predicate` is a user-supplied refinement with no never-throw
		// contract; §13 forbids the guard from propagating its throw.
		const outcome = attempt(() => predicate(value))
		return outcome.success && outcome.value
	}
}

/**
 * Defer guard creation until first use by calling `thunk()` on every
 * invocation.
 *
 * @remarks
 * `thunk` is called on every guard call, not cached. This is intentional:
 * it lets the thunk close over a binding that will be assigned after
 * `lazyOf` is called, which is the primary use case — self-referential
 * recursive guards. Do not rely on the thunk being called exactly once.
 *
 * Per AGENTS.md §13 the returned guard never throws: if `thunk` (or the
 * guard it resolves to) throws, the throw is contained and the guard
 * reports a non-match (`false`).
 *
 * @param thunk - A zero-argument function that returns the guard. A throw
 *                 from it (or its resolved guard) is treated as a non-match
 * @returns A guard that delegates to `thunk()` on every call
 *
 * @example
 * ```ts
 * // Recursive tree shape — inner must be assigned after lazyOf is declared
 * type Tree = { value: number; children: Tree[] }
 * let isTree: Guard<Tree>
 * isTree = recordOf({
 *     value:    isNumber,
 *     children: arrayOf(lazyOf(() => isTree)),
 * })
 * ```
 */
export function lazyOf<T>(thunk: () => Guard<T>): Guard<T> {
	return (value: unknown): value is T => {
		// `thunk` and the guard it returns are user-supplied and invoked
		// inside the guard body; §13 forbids propagating either throw.
		const outcome = attempt(() => thunk()(value))
		return outcome.success && outcome.value
	}
}

/**
 * Build a guard that passes when the base passes AND the projection of the
 * value satisfies the target guard.
 *
 * The result guard still narrows to `T` (the base type), not `U` — the
 * target check is a validity constraint on a derived view of the value, not
 * a type transformation.
 *
 * Per AGENTS.md §13 the returned guard never throws: if `project` (or the
 * unary function it may return) throws, the throw is contained and the guard
 * reports a non-match (`false`) rather than propagating the exception.
 *
 * @param base - Base guard; provides initial narrowing to `T`
 * @param project - Function that derives `U` from the narrowed `T`. A throw
 *                   from it is treated as a non-match
 * @param target - Guard applied to the projected value
 * @returns A guard for `T` that additionally validates the projection
 *
 * @example
 * ```ts
 * // Accept strings whose trimmed length is between 1 and 50
 * const isBoundedString = transformOf(
 *     isString,
 *     (s) => s.trim().length,
 *     whereOf(isNumber, (n) => n >= 1 && n <= 50),
 * )
 * isBoundedString('hello') // true
 * isBoundedString('')      // false — trim length is 0
 * ```
 */
export function transformOf<T, U>(
	base: Guard<T>,
	project: ((value: T) => U) | ((value: T) => (input: T) => U),
	target: Guard<U>,
): Guard<T>
export function transformOf<T>(
	base: Guard<T>,
	project: (value: T) => unknown,
	target: (value: unknown) => boolean,
): Guard<T>
export function transformOf<T>(
	base: Guard<T>,
	project: (value: T) => unknown,
	target: (value: unknown) => boolean,
): Guard<T> {
	return (value: unknown): value is T => {
		if (!base(value)) {
			return false
		}
		function isUnary<R>(candidate: unknown): candidate is (input: T) => R {
			return isFunction(candidate)
		}
		// `project` (and the unary function it may return) is user-supplied
		// with no never-throw contract; §13 forbids the guard from
		// propagating its throw. `target` is itself a Guard and so is
		// already §13-bound — it stays outside the contained region.
		const outcome = attempt(() => {
			const projected = project(value)
			return isUnary<unknown>(projected) ? projected(value) : projected
		})
		return outcome.success && target(outcome.value)
	}
}

/**
 * Extend a guard to also allow `null`.
 *
 * Use when a value is normally required but can be explicitly absent as
 * `null`. For `undefined` tolerance use an optional wrapper; for both `null`
 * and `undefined` compose `nullableOf` with `orOf(isUndefined, …)`.
 *
 * @param guard - The base guard for the non-null case
 * @returns A guard for `T | null`
 *
 * @example
 * ```ts
 * const isNullableString = nullableOf(isString)
 * isNullableString('hi') // true
 * isNullableString(null) // true
 * isNullableString(42)   // false
 * ```
 */
export function nullableOf<T>(guard: Guard<T>): Guard<T | null> {
	return (value: unknown): value is T | null => value === null || guard(value)
}
