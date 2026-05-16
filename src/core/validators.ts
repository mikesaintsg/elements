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

export function enumerableSymbolCount(value: object): number {
	let count = 0
	for (const symbol of Object.getOwnPropertySymbols(value)) {
		if (Object.getOwnPropertyDescriptor(value, symbol)?.enumerable) {
			count += 1
		}
	}
	return count
}

export function isConstructor(value: unknown): value is AnyConstructor<object> {
	if (!isFunction(value)) {
		return false
	}

	try {
		Reflect.construct(String, [], value)
		return true
	} catch {
		return false
	}
}

// === Primitive Guards

/** Determine whether a value is `null`. */
export function isNull(value: null): boolean
export function isNull(value: unknown): value is null
export function isNull(value: unknown): boolean {
	return value === null
}

/** Determine whether a value is `undefined`. */
export function isUndefined(value: undefined): boolean
export function isUndefined(value: unknown): value is undefined
export function isUndefined(value: unknown): boolean {
	return value === undefined
}

/** Determine whether a value is defined. */
export function isDefined<T>(value: T): boolean
export function isDefined<T>(value: T | null | undefined): value is T
export function isDefined<T>(value: T | null | undefined): boolean {
	return value !== null && value !== undefined
}

/** Determine whether a value is a string. */
export function isString(value: string): boolean
export function isString(value: unknown): value is string
export function isString(value: unknown): boolean {
	return typeof value === 'string'
}

/** Determine whether a value is a string or `null`. */
export function isNullableString(value: string | null): boolean
export function isNullableString(value: unknown): value is string | null
export function isNullableString(value: unknown): boolean {
	return nullableOf(isString)(value)
}

/** Determine whether a value is a number. */
export function isNumber(value: number): boolean
export function isNumber(value: unknown): value is number
export function isNumber(value: unknown): boolean {
	return typeof value === 'number'
}

/** Determine whether a value is a finite number. */
export const isFiniteNumber = whereOf(isNumber, (value) => Number.isFinite(value))

/** Determine whether a value is a number or `null`. */
export function isNullableNumber(value: number | null): boolean
export function isNullableNumber(value: unknown): value is number | null
export function isNullableNumber(value: unknown): boolean {
	return nullableOf(isNumber)(value)
}

/** Determine whether a value is a boolean. */
export function isBoolean(value: boolean): boolean
export function isBoolean(value: unknown): value is boolean
export function isBoolean(value: unknown): boolean {
	return typeof value === 'boolean'
}

/** Determine whether a value is a boolean or `null`. */
export function isNullableBoolean(value: boolean | null): boolean
export function isNullableBoolean(value: unknown): value is boolean | null
export function isNullableBoolean(value: unknown): boolean {
	return nullableOf(isBoolean)(value)
}

/** Determine whether a value is exactly `true`. */
export function isTrue(value: true): boolean
export function isTrue(value: unknown): value is true
export function isTrue(value: unknown): boolean {
	return value === true
}

/** Determine whether a value is exactly `false`. */
export function isFalse(value: false): boolean
export function isFalse(value: unknown): value is false
export function isFalse(value: unknown): boolean {
	return value === false
}

/** Determine whether a value is a bigint. */
export function isBigInt(value: bigint): boolean
export function isBigInt(value: unknown): value is bigint
export function isBigInt(value: unknown): boolean {
	return typeof value === 'bigint'
}

/** Determine whether a value is a symbol. */
export function isSymbol(value: symbol): boolean
export function isSymbol(value: unknown): value is symbol
export function isSymbol(value: unknown): boolean {
	return typeof value === 'symbol'
}

/** Determine whether a value is callable. */
export function isFunction(value: AnyFunction): boolean
export function isFunction(value: unknown): value is AnyFunction
export function isFunction(value: unknown): boolean {
	return typeof value === 'function'
}

// === Built-in Guards

/** Determine whether a value is a `Date`. */
export function isDate(value: Date): boolean
export function isDate(value: unknown): value is Date
export function isDate(value: unknown): boolean {
	return value instanceof Date
}

/** Determine whether a value is a `RegExp`. */
export function isRegExp(value: RegExp): boolean
export function isRegExp(value: unknown): value is RegExp
export function isRegExp(value: unknown): boolean {
	return value instanceof RegExp
}

/** Determine whether a value is an `Error`. */
export function isError(value: Error): boolean
export function isError(value: unknown): value is Error
export function isError(value: unknown): boolean {
	return value instanceof Error
}

/** Determine whether a value is a native `Promise`. */
export function isPromise<T = unknown>(value: Promise<T>): boolean
export function isPromise<T = unknown>(value: unknown): value is Promise<T>
export function isPromise(value: unknown): boolean {
	return value instanceof Promise
}

/** Determine whether a value is promise-like with `then`, `catch`, and `finally`. */
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

/** Determine whether a value is an `ArrayBuffer`. */
export function isArrayBuffer(value: ArrayBuffer): boolean
export function isArrayBuffer(value: unknown): value is ArrayBuffer
export function isArrayBuffer(value: unknown): boolean {
	return value instanceof ArrayBuffer
}

/** Determine whether a value is a `SharedArrayBuffer`. */
export function isSharedArrayBuffer(value: SharedArrayBuffer): boolean
export function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer
export function isSharedArrayBuffer(value: unknown): boolean {
	return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
}

// === Protocol Guards

/** Determine whether a value implements the iterable protocol. */
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

/** Determine whether a value implements the async iterable protocol. */
export function isAsyncIterable<T = unknown>(value: AsyncIterable<T>): boolean
export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T>
export function isAsyncIterable(value: unknown): boolean {
	if (!isObject(value)) {
		return false
	}
	return isFunction(Reflect.get(value, Symbol.asyncIterator))
}

// === Object & Collection Guards

/** Determine whether a value is a non-null object. */
export function isObject(value: object): boolean
export function isObject(value: unknown): value is object
export function isObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null
}

/** Determine whether a value is a plain record. */
export function isRecord(value: Record<string, unknown>): boolean
export function isRecord(value: unknown): value is Record<string, unknown>
export function isRecord(value: unknown): boolean {
	if (!isObject(value) || isArray(value)) return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/** Determine whether a value is a primitive JSON value. */
export function isJsonPrimitive(value: JsonPrimitive): boolean
export function isJsonPrimitive(value: unknown): value is JsonPrimitive
export function isJsonPrimitive(value: unknown): boolean {
	return value === null || isString(value) || isNumber(value) || isBoolean(value)
}

/** Determine whether a value is any valid JSON value. */
export function isJsonValue(value: JsonValue): boolean
export function isJsonValue(value: unknown): value is JsonValue
export function isJsonValue(value: unknown): boolean {
	if (isJsonPrimitive(value)) return true
	if (Array.isArray(value)) {
		for (const entry of value) {
			if (!isJsonValue(entry)) return false
		}
		return true
	}
	if (!isRecord(value)) return false
	for (const entry of Object.values(value)) {
		if (!isJsonValue(entry)) return false
	}
	return true
}

/** Determine whether a value is a JSON object. */
export function isJsonObject(value: JsonObject): boolean
export function isJsonObject(value: unknown): value is JsonObject
export function isJsonObject(value: unknown): boolean {
	if (!isRecord(value)) return false
	for (const entry of Object.values(value)) {
		if (!isJsonValue(entry)) return false
	}
	return true
}

/** Determine whether a string is a valid JSON Schema type name. */
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

export function isJsonSchemaArray(value: unknown): value is readonly JsonSchema[] {
	if (!Array.isArray(value)) return false
	for (const entry of value) {
		if (!isJsonSchema(entry)) return false
	}
	return true
}

export function isJsonSchemaMapValue(value: unknown): value is JsonSchemaMap {
	if (!isRecord(value)) return false
	for (const entry of Object.values(value)) {
		if (!isJsonSchema(entry)) return false
	}
	return true
}

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

/** Determine whether a value is a valid JSON Schema node. */
export function isJsonSchema(value: JsonSchema): boolean
export function isJsonSchema(value: unknown): value is JsonSchema
export function isJsonSchema(value: unknown): boolean {
	if (isBoolean(value)) return true
	if (!isRecord(value)) return false

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

	if (value['properties'] !== undefined && !isJsonSchemaMapValue(value['properties'])) return false
	if (value['patternProperties'] !== undefined && !isJsonSchemaMapValue(value['patternProperties']))
		return false
	if (value['dependentSchemas'] !== undefined && !isJsonSchemaMapValue(value['dependentSchemas']))
		return false
	if (value['$defs'] !== undefined && !isJsonSchemaMapValue(value['$defs'])) return false
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
		if (!isBoolean(additionalProperties) && !isJsonSchema(additionalProperties)) return false
	}
	if (value['unevaluatedProperties'] !== undefined) {
		const unevaluatedProperties = value['unevaluatedProperties']
		if (!isBoolean(unevaluatedProperties) && !isJsonSchema(unevaluatedProperties)) return false
	}
	if (value['propertyNames'] !== undefined && !isJsonSchema(value['propertyNames'])) return false
	if (value['items'] !== undefined) {
		const items = value['items']
		if (!isJsonSchema(items) && !isJsonSchemaArray(items)) return false
	}
	if (value['prefixItems'] !== undefined && !isJsonSchemaArray(value['prefixItems'])) return false
	if (value['contains'] !== undefined && !isJsonSchema(value['contains'])) return false
	if (value['anyOf'] !== undefined && !isJsonSchemaArray(value['anyOf'])) return false
	if (value['oneOf'] !== undefined && !isJsonSchemaArray(value['oneOf'])) return false
	if (value['allOf'] !== undefined && !isJsonSchemaArray(value['allOf'])) return false
	if (value['not'] !== undefined && !isJsonSchema(value['not'])) return false
	if (value['if'] !== undefined && !isJsonSchema(value['if'])) return false
	if (value['then'] !== undefined && !isJsonSchema(value['then'])) return false
	if (value['else'] !== undefined && !isJsonSchema(value['else'])) return false
	if (value['enum'] !== undefined) {
		if (!Array.isArray(value['enum'])) return false
		for (const entry of value['enum']) {
			if (!isJsonValue(entry)) return false
		}
	}
	if (value['const'] !== undefined && !isJsonValue(value['const'])) return false
	if (value['default'] !== undefined && !isJsonValue(value['default'])) return false
	if (value['examples'] !== undefined) {
		if (!Array.isArray(value['examples'])) return false
		for (const entry of value['examples']) {
			if (!isJsonValue(entry)) return false
		}
	}

	for (const entry of Object.values(value)) {
		if (!isJsonValue(entry)) return false
	}

	return true
}

/** Determine whether a value is an object-root JSON Schema. */
export function isJsonSchemaObject(value: JsonSchemaObject): boolean
export function isJsonSchemaObject(value: unknown): value is JsonSchemaObject
export function isJsonSchemaObject(value: unknown): boolean {
	return isJsonSchema(value) && isRecord(value) && value['type'] === 'object'
}

/** Determine whether a value is a `Map`. */
export function isMap<K = unknown, V = unknown>(value: ReadonlyMap<K, V>): boolean
export function isMap<K = unknown, V = unknown>(value: unknown): value is ReadonlyMap<K, V>
export function isMap(value: unknown): boolean {
	return value instanceof Map
}

/** Determine whether a value is a `Set`. */
export function isSet<T = unknown>(value: ReadonlySet<T>): boolean
export function isSet<T = unknown>(value: unknown): value is ReadonlySet<T>
export function isSet(value: unknown): boolean {
	return value instanceof Set
}

/** Determine whether a value is a `WeakMap`. */
export function isWeakMap(value: WeakMap<object, unknown>): boolean
export function isWeakMap(value: unknown): value is WeakMap<object, unknown>
export function isWeakMap(value: unknown): boolean {
	return value instanceof WeakMap
}

/** Determine whether a value is a `WeakSet`. */
export function isWeakSet(value: WeakSet<object>): boolean
export function isWeakSet(value: unknown): value is WeakSet<object>
export function isWeakSet(value: unknown): boolean {
	return value instanceof WeakSet
}

// === Array & TypedArray Guards

/** Determine whether a value is an array. */
export function isArray<T = unknown>(value: readonly T[]): boolean
export function isArray<T = unknown>(value: unknown): value is readonly T[]
export function isArray(value: unknown): boolean {
	return Array.isArray(value)
}

/** Determine whether a value is a `DataView`. */
export function isDataView(value: DataView<ArrayBufferLike>): boolean
export function isDataView(value: unknown): value is DataView<ArrayBufferLike>
export function isDataView(value: unknown): boolean {
	return value instanceof DataView
}

/** Determine whether a value is an `ArrayBufferView`. */
export function isArrayBufferView(value: ArrayBufferView): boolean
export function isArrayBufferView(value: unknown): value is ArrayBufferView
export function isArrayBufferView(value: unknown): boolean {
	return ArrayBuffer.isView(value)
}

/** Determine whether a value is an `Int8Array`. */
export function isInt8Array(value: Int8Array): boolean
export function isInt8Array(value: unknown): value is Int8Array
export function isInt8Array(value: unknown): boolean {
	return value instanceof Int8Array
}

/** Determine whether a value is a `Uint8Array`. */
export function isUint8Array(value: Uint8Array): boolean
export function isUint8Array(value: unknown): value is Uint8Array
export function isUint8Array(value: unknown): boolean {
	return value instanceof Uint8Array
}

/** Determine whether a value is a `Uint8ClampedArray`. */
export function isUint8ClampedArray(value: Uint8ClampedArray): boolean
export function isUint8ClampedArray(value: unknown): value is Uint8ClampedArray
export function isUint8ClampedArray(value: unknown): boolean {
	return value instanceof Uint8ClampedArray
}

/** Determine whether a value is an `Int16Array`. */
export function isInt16Array(value: Int16Array): boolean
export function isInt16Array(value: unknown): value is Int16Array
export function isInt16Array(value: unknown): boolean {
	return value instanceof Int16Array
}

/** Determine whether a value is a `Uint16Array`. */
export function isUint16Array(value: Uint16Array): boolean
export function isUint16Array(value: unknown): value is Uint16Array
export function isUint16Array(value: unknown): boolean {
	return value instanceof Uint16Array
}

/** Determine whether a value is an `Int32Array`. */
export function isInt32Array(value: Int32Array): boolean
export function isInt32Array(value: unknown): value is Int32Array
export function isInt32Array(value: unknown): boolean {
	return value instanceof Int32Array
}

/** Determine whether a value is a `Uint32Array`. */
export function isUint32Array(value: Uint32Array): boolean
export function isUint32Array(value: unknown): value is Uint32Array
export function isUint32Array(value: unknown): boolean {
	return value instanceof Uint32Array
}

/** Determine whether a value is a `Float32Array`. */
export function isFloat32Array(value: Float32Array): boolean
export function isFloat32Array(value: unknown): value is Float32Array
export function isFloat32Array(value: unknown): boolean {
	return value instanceof Float32Array
}

/** Determine whether a value is a `Float64Array`. */
export function isFloat64Array(value: Float64Array): boolean
export function isFloat64Array(value: unknown): value is Float64Array
export function isFloat64Array(value: unknown): boolean {
	return value instanceof Float64Array
}

/** Determine whether a value is a `BigInt64Array`. */
export function isBigInt64Array(value: BigInt64Array): boolean
export function isBigInt64Array(value: unknown): value is BigInt64Array
export function isBigInt64Array(value: unknown): boolean {
	return typeof BigInt64Array !== 'undefined' && value instanceof BigInt64Array
}

/** Determine whether a value is a `BigUint64Array`. */
export function isBigUint64Array(value: BigUint64Array): boolean
export function isBigUint64Array(value: unknown): value is BigUint64Array
export function isBigUint64Array(value: unknown): boolean {
	return typeof BigUint64Array !== 'undefined' && value instanceof BigUint64Array
}

// === Emptiness Guards

/** Determine whether a value is the empty string. */
export function isEmptyString(value: unknown): value is '' {
	return value === ''
}

/** Determine whether a value is an empty array. */
export function isEmptyArray(value: readonly []): boolean
export function isEmptyArray(value: unknown): value is readonly []
export function isEmptyArray(value: unknown): boolean {
	return isArray(value) && value.length === 0
}

/** Determine whether a value is an empty object. */
export function isEmptyObject(value: Record<string | symbol, never>): boolean
export function isEmptyObject(value: unknown): value is Record<string | symbol, never>
export function isEmptyObject(value: unknown): boolean {
	if (!isRecord(value)) {
		return false
	}
	return Object.keys(value).length === 0 && enumerableSymbolCount(value) === 0
}

/** Determine whether a value is an empty map. */
export function isEmptyMap(value: ReadonlyMap<never, never>): boolean
export function isEmptyMap(value: unknown): value is ReadonlyMap<never, never>
export function isEmptyMap(value: unknown): boolean {
	return value instanceof Map && value.size === 0
}

/** Determine whether a value is an empty set. */
export function isEmptySet(value: ReadonlySet<never>): boolean
export function isEmptySet(value: unknown): value is ReadonlySet<never>
export function isEmptySet(value: unknown): boolean {
	return value instanceof Set && value.size === 0
}

/** Determine whether a value is a non-empty string. */
export function isNonEmptyString(value: string): boolean
export function isNonEmptyString(value: unknown): value is string
export function isNonEmptyString(value: unknown): boolean {
	return isString(value) && value.length > 0
}

/** Determine whether a value is a non-empty array. */
export function isNonEmptyArray<T = unknown>(value: readonly [T, ...T[]]): boolean
export function isNonEmptyArray<T = unknown>(value: unknown): value is readonly [T, ...T[]]
export function isNonEmptyArray(value: unknown): boolean {
	return isArray(value) && value.length > 0
}

/** Determine whether a value is a non-empty object. */
export function isNonEmptyObject(value: Record<string | symbol, unknown>): boolean
export function isNonEmptyObject(value: unknown): value is Record<string | symbol, unknown>
export function isNonEmptyObject(value: unknown): boolean {
	if (!isRecord(value)) {
		return false
	}
	return Object.keys(value).length > 0 || enumerableSymbolCount(value) > 0
}

/** Determine whether a value is a non-empty map. */
export function isNonEmptyMap<K = unknown, V = unknown>(value: ReadonlyMap<K, V>): boolean
export function isNonEmptyMap<K = unknown, V = unknown>(value: unknown): value is ReadonlyMap<K, V>
export function isNonEmptyMap(value: unknown): boolean {
	return value instanceof Map && value.size > 0
}

/** Determine whether a value is a non-empty set. */
export function isNonEmptySet<T = unknown>(value: ReadonlySet<T>): boolean
export function isNonEmptySet<T = unknown>(value: unknown): value is ReadonlySet<T>
export function isNonEmptySet(value: unknown): boolean {
	return value instanceof Set && value.size > 0
}

// === Function Guards

/** Determine whether a function declares zero parameters. */
export function isZeroArg<F extends ZeroArgFunction>(value: F): value is F
export function isZeroArg(value: AnyFunction): value is ZeroArgFunction
export function isZeroArg(value: AnyFunction): boolean {
	return value.length === 0
}

/** Determine whether a function is a native async function. */
export function isAsyncFunction<F extends AnyAsyncFunction>(value: F): value is F
export function isAsyncFunction(value: unknown): value is AnyAsyncFunction
export function isAsyncFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'AsyncFunction'
}

/** Determine whether a function is a generator function. */
export function isGeneratorFunction<
	F extends (...args: unknown[]) => Generator<unknown, unknown, unknown>,
>(value: F): value is F
export function isGeneratorFunction(
	value: unknown,
): value is (...args: unknown[]) => Generator<unknown, unknown, unknown>
export function isGeneratorFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'GeneratorFunction'
}

/** Determine whether a function is an async generator function. */
export function isAsyncGeneratorFunction<
	F extends (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>,
>(value: F): value is F
export function isAsyncGeneratorFunction(
	value: unknown,
): value is (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>
export function isAsyncGeneratorFunction(value: unknown): boolean {
	return isFunction(value) && value.constructor.name === 'AsyncGeneratorFunction'
}

/** Determine whether a function is a zero-argument async function. */
export function isZeroArgAsync<F extends ZeroArgAsyncFunction>(value: F): value is F
export function isZeroArgAsync(value: unknown): value is ZeroArgAsyncFunction
export function isZeroArgAsync(value: unknown): boolean {
	return isFunction(value) && isZeroArg(value) && isAsyncFunction(value)
}

/** Determine whether a function is a zero-argument generator function. */
export function isZeroArgGenerator<
	F extends (...args: unknown[]) => Generator<unknown, unknown, unknown>,
>(value: F): value is F
export function isZeroArgGenerator(
	value: unknown,
): value is () => Generator<unknown, unknown, unknown>
export function isZeroArgGenerator(value: unknown): boolean {
	return isFunction(value) && isZeroArg(value) && isGeneratorFunction(value)
}

/** Determine whether a function is a zero-argument async generator function. */
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

/** Build an array guard from an element guard or predicate. */
export function arrayOf<T>(elementGuard: Guard<T>): Guard<readonly T[]>
export function arrayOf(elementGuard: (value: unknown) => boolean): Guard<readonly unknown[]>
export function arrayOf(elementGuard: (value: unknown) => boolean): Guard<readonly unknown[]> {
	return (value: unknown): value is readonly unknown[] =>
		isArray(value) && value.every(elementGuard)
}

/** Build a tuple guard from per-index guards or predicates. */
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

/** Create a guard that accepts one of the provided literals. */
export function literalOf<const Literals extends ReadonlyArray<string | number | boolean>>(
	...literals: Literals
): Guard<Literals[number]> {
	return (value: unknown): value is Literals[number] =>
		literals.some((literal) => Object.is(literal, value))
}

/** Create a guard using `instanceof`. */
export function instanceOf<C>(ctor: C): Guard<InstanceType<C & AnyConstructor<object>>> {
	return (value: unknown): value is InstanceType<C & AnyConstructor<object>> =>
		isConstructor(ctor) && isObject(value) && value instanceof ctor
}

/** Create a guard from a native enum or enum-like object. */
export function enumOf<E extends Record<string, string | number>>(
	enumeration: E,
): Guard<E[keyof E]> {
	const values = new Set(Object.values(enumeration))
	return (value: unknown): value is E[keyof E] =>
		(isString(value) || isNumber(value)) && values.has(value)
}

/** Build a set guard from an element guard or predicate. */
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

/** Build a map guard from key and value guards or predicates. */
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

/** Build an exact record guard from a guard shape. */
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

/** Build an iterable guard from an element guard or predicate. */
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

/** Create a guard for keys of the provided object. */
export function keyOf<const O extends Readonly<Record<PropertyKey, unknown>>>(
	value: O,
): Guard<keyof O> {
	return (entry: unknown): entry is keyof O =>
		(isString(entry) || isSymbol(entry) || isNumber(entry)) && entry in value
}

/** Build a new guard shape by picking keys. */
export function pickOf<S extends GuardsShape, K extends ReadonlyArray<keyof S & string>>(
	shape: S,
	keys: K,
): Pick<S, K[number]> {
	const result: Partial<Record<keyof S & string, Guard<unknown>>> = {}
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(shape, key)) {
			result[key] = shape[key]
		}
	}
	function ensureComplete(
		value: unknown,
		currentShape: S,
		pickedKeys: K,
	): asserts value is Pick<S, K[number]> {
		void value
		void currentShape
		void pickedKeys
	}
	ensureComplete(result, shape, keys)
	return result
}

/** Build a new guard shape by omitting keys. */
export function omitOf<S extends GuardsShape, K extends ReadonlyArray<keyof S & string>>(
	shape: S,
	keys: K,
): Omit<S, K[number]> {
	const skipped = new Set<PropertyKey>()
	for (const key of keys) {
		skipped.add(key)
	}
	const result: Partial<Record<keyof S & string, Guard<unknown>>> = {}
	for (const key in shape) {
		if (!Object.prototype.hasOwnProperty.call(shape, key)) {
			continue
		}
		if (!skipped.has(key)) {
			result[key] = shape[key]
		}
	}
	function ensureOmitted(
		value: unknown,
		currentShape: S,
		omittedKeys: K,
	): asserts value is Omit<S, K[number]> {
		void value
		void currentShape
		void omittedKeys
	}
	ensureOmitted(result, shape, keys)
	return result
}

/** Combine two guards or predicates with logical AND. */
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

/** Combine two guards or predicates with logical OR. */
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

/** Negate a guard or predicate. */
export function notOf(guard: (value: unknown) => boolean): Guard<unknown> {
	return (value: unknown): value is unknown => !guard(value)
}

/** Exclude a subset guard from a base guard. */
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

/** Create a union guard from multiple guards or predicates. */
export function unionOf<const Gs extends ReadonlyArray<Guard<unknown>>>(
	...guards: Gs
): Guard<GuardType<Gs[number]>>
export function unionOf(...predicates: ReadonlyArray<(value: unknown) => boolean>): Guard<unknown>
export function unionOf(...guards: ReadonlyArray<(value: unknown) => boolean>): Guard<unknown> {
	return (value: unknown): value is unknown => guards.some((guard) => guard(value))
}

/** Create an intersection guard from multiple guards or predicates. */
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

/** Refine a base guard with an additional predicate. */
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
		return predicate(value)
	}
}

/** Defer guard creation until first use. */
export function lazyOf<T>(thunk: () => Guard<T>): Guard<T> {
	return (value: unknown): value is T => thunk()(value)
}

/** Validate a projected value after a base guard passes. */
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
		const projected = project(value)
		function isUnary<R>(candidate: unknown): candidate is (input: T) => R {
			return isFunction(candidate)
		}
		const result = isUnary<unknown>(projected) ? projected(value) : projected
		return target(result)
	}
}

/** Extend a guard to also allow `null`. */
export function nullableOf<T>(guard: Guard<T>): Guard<T | null> {
	return (value: unknown): value is T | null => value === null || guard(value)
}
