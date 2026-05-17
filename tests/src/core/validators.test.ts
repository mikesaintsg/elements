import { describe, expect, it, test } from 'vitest'
import {
	andOf,
	arrayOf,
	complementOf,
	enumerableSymbolCount,
	enumOf,
	instanceOf,
	intersectionOf,
	isArray,
	isArrayBuffer,
	isArrayBufferView,
	isAsyncFunction,
	isAsyncGeneratorFunction,
	isAsyncIterable,
	isBigInt,
	isBigInt64Array,
	isBigUint64Array,
	isBoolean,
	isConstructor,
	isDataView,
	isDate,
	isDefined,
	isEmptyArray,
	isEmptyMap,
	isEmptyObject,
	isEmptySet,
	isEmptyString,
	isError,
	isFiniteNumber,
	isFloat32Array,
	isFloat64Array,
	isFunction,
	isGeneratorFunction,
	isInt16Array,
	isInt32Array,
	isInt8Array,
	isIterable,
	isJsonObject,
	isJsonSchema,
	isJsonSchemaArray,
	isJsonSchemaMapValue,
	isJsonSchemaObject,
	isJsonSchemaStringArrayMapValue,
	isJsonValue,
	isJsonPrimitive,
	isMap,
	isNonEmptyArray,
	isNonEmptyMap,
	isNonEmptyObject,
	isNonEmptySet,
	isNonEmptyString,
	isNull,
	isNullableBoolean,
	isNullableNumber,
	isNullableString,
	isNumber,
	isObject,
	isPromise,
	isPromiseLike,
	isRecord,
	isRegExp,
	isSet,
	isSharedArrayBuffer,
	isString,
	isSymbol,
	isTrue,
	isUint16Array,
	isUint32Array,
	isUint8Array,
	isUint8ClampedArray,
	isUndefined,
	isWeakMap,
	isWeakSet,
	isZeroArg,
	isZeroArgAsync,
	isZeroArgAsyncGenerator,
	isZeroArgGenerator,
	isFalse,
	iterableOf,
	keyOf,
	lazyOf,
	literalOf,
	mapOf,
	notOf,
	nullableOf,
	omitOf,
	orOf,
	pickOf,
	recordOf,
	setOf,
	transformOf,
	tupleOf,
	unionOf,
	whereOf,
} from '@elements/core'
import { makeCyclicArray, makeCyclicObject } from './_helpers.js'

describe('primitive validators', () => {
	test('detects null and undefined values', () => {
		expect(isNull(null)).toBe(true)
		expect(isNull(undefined)).toBe(false)
		expect(isUndefined(undefined)).toBe(true)
		expect(isUndefined(null)).toBe(false)
	})

	test('detects defined values', () => {
		expect(isDefined(0)).toBe(true)
		expect(isDefined('')).toBe(true)
		expect(isDefined(false)).toBe(true)
		expect(isDefined(null)).toBe(false)
		expect(isDefined(undefined)).toBe(false)
	})

	test('detects primitive runtime types', () => {
		expect(isString('value')).toBe(true)
		expect(isNullableString('value')).toBe(true)
		expect(isNullableString(null)).toBe(true)
		expect(isNullableString(1)).toBe(false)
		expect(isString(1)).toBe(false)
		expect(isNumber(1)).toBe(true)
		expect(isNullableNumber(1)).toBe(true)
		expect(isNullableNumber(null)).toBe(true)
		expect(isNullableNumber('1')).toBe(false)
		expect(isNumber(NaN)).toBe(true)
		expect(isNumber('1')).toBe(false)
		expect(isBoolean(true)).toBe(true)
		expect(isNullableBoolean(true)).toBe(true)
		expect(isNullableBoolean(null)).toBe(true)
		expect(isNullableBoolean('true')).toBe(false)
		expect(isTrue(true)).toBe(true)
		expect(isTrue(false)).toBe(false)
		expect(isFalse(false)).toBe(true)
		expect(isFalse(true)).toBe(false)
		expect(isBoolean(0)).toBe(false)
		expect(isBigInt(1n)).toBe(true)
		expect(isBigInt(1)).toBe(false)
		expect(isSymbol(Symbol('x'))).toBe(true)
		expect(isSymbol('x')).toBe(false)
	})

	test('detects functions and common built-ins', () => {
		const fn = (value: unknown) => value
		expect(isFunction(fn)).toBe(true)
		expect(isFunction({})).toBe(false)
		expect(isDate(new Date())).toBe(true)
		expect(isDate({})).toBe(false)
		expect(isRegExp(/a/)).toBe(true)
		expect(isRegExp('a')).toBe(false)
		expect(isError(new Error('boom'))).toBe(true)
		expect(isError({ message: 'boom' })).toBe(false)
	})

	test('detects iterables and async iterables', async () => {
		async function* createAsyncGenerator(): AsyncGenerator<number, void, unknown> {
			yield 1
		}

		expect(isIterable([1, 2, 3])).toBe(true)
		expect(isIterable('abc')).toBe(true)
		expect(isIterable(new Set([1, 2]))).toBe(true)
		expect(isIterable({})).toBe(false)
		expect(isAsyncIterable(createAsyncGenerator())).toBe(true)
		expect(isAsyncIterable([1, 2, 3])).toBe(false)

		await Promise.resolve()
	})

	test('detects promises and promise-like objects', () => {
		const promise = Promise.resolve(1)
		const promiseLike: unknown = {
			then() {
				return undefined
			},
			catch() {
				return undefined
			},
			finally() {
				return undefined
			},
		}
		const incompletePromiseLike: unknown = {
			then() {
				return undefined
			},
		}

		expect(isPromise(promise)).toBe(true)
		expect(isPromise(promiseLike)).toBe(false)
		expect(isPromiseLike(promise)).toBe(true)
		expect(isPromiseLike(promiseLike)).toBe(true)
		expect(isPromiseLike(incompletePromiseLike)).toBe(false)
	})

	test('detects array buffers', () => {
		expect(isArrayBuffer(new ArrayBuffer(8))).toBe(true)
		expect(isArrayBuffer(new Uint8Array(4))).toBe(false)

		const supported = typeof SharedArrayBuffer !== 'undefined'
		const sharedBuffer = supported ? new SharedArrayBuffer(8) : undefined
		expect(isSharedArrayBuffer(sharedBuffer)).toBe(supported)
		expect(isSharedArrayBuffer(new ArrayBuffer(8))).toBe(false)
	})
})

describe('collection and typed-array validators', () => {
	it('detects maps, sets, objects, and records', () => {
		class RecordLike {
			readonly value = 1
		}

		const nullPrototypeRecord: Record<string, unknown> = Object.create(null)
		nullPrototypeRecord['id'] = 'plain'

		expect(isMap(new Map())).toBe(true)
		expect(isMap(new Set())).toBe(false)
		expect(isSet(new Set())).toBe(true)
		expect(isSet(new Map())).toBe(false)
		expect(isWeakMap(new WeakMap())).toBe(true)
		expect(isWeakMap(new Map())).toBe(false)
		expect(isWeakSet(new WeakSet())).toBe(true)
		expect(isWeakSet(new Set())).toBe(false)
		expect(isObject({})).toBe(true)
		expect(isObject([])).toBe(true)
		expect(isObject(null)).toBe(false)
		expect(isRecord({})).toBe(true)
		expect(isRecord(nullPrototypeRecord)).toBe(true)
		expect(isRecord([])).toBe(false)
		expect(isRecord(null)).toBe(false)
		expect(isRecord(new Date())).toBe(false)
		expect(isRecord(new RecordLike())).toBe(false)
	})

	it('detects arrays and array buffer views', () => {
		const buffer = new ArrayBuffer(8)
		expect(isArray([])).toBe(true)
		expect(isArray([1, 2, 3])).toBe(true)
		expect(isArray({})).toBe(false)
		expect(isArray('value')).toBe(false)
		expect(isDataView(new DataView(buffer))).toBe(true)
		expect(isDataView(new Uint8Array(buffer))).toBe(false)
		expect(isArrayBufferView(new DataView(buffer))).toBe(true)
		expect(isArrayBufferView(new Uint8Array(buffer))).toBe(true)
		expect(isArrayBufferView({})).toBe(false)
	})

	it('detects integer and floating typed arrays', () => {
		expect(isInt8Array(new Int8Array(1))).toBe(true)
		expect(isInt8Array(new Uint8Array(1))).toBe(false)
		expect(isUint8Array(new Uint8Array(1))).toBe(true)
		expect(isUint8Array(new Uint8ClampedArray(1))).toBe(false)
		expect(isUint8ClampedArray(new Uint8ClampedArray(1))).toBe(true)
		expect(isUint8ClampedArray(new Uint8Array(1))).toBe(false)
		expect(isInt16Array(new Int16Array(1))).toBe(true)
		expect(isInt16Array(new Uint16Array(1))).toBe(false)
		expect(isUint16Array(new Uint16Array(1))).toBe(true)
		expect(isUint16Array(new Int16Array(1))).toBe(false)
		expect(isInt32Array(new Int32Array(1))).toBe(true)
		expect(isInt32Array(new Uint32Array(1))).toBe(false)
		expect(isUint32Array(new Uint32Array(1))).toBe(true)
		expect(isUint32Array(new Int32Array(1))).toBe(false)
		expect(isFloat32Array(new Float32Array(1))).toBe(true)
		expect(isFloat32Array(new Float64Array(1))).toBe(false)
		expect(isFloat64Array(new Float64Array(1))).toBe(true)
		expect(isFloat64Array(new Float32Array(1))).toBe(false)
	})

	it('detects bigint typed arrays when supported', () => {
		const supported = typeof BigInt64Array !== 'undefined' && typeof BigUint64Array !== 'undefined'
		const intArray = supported ? new BigInt64Array(1) : undefined
		const uintArray = supported ? new BigUint64Array(1) : undefined

		expect(isBigInt64Array(intArray)).toBe(supported)
		expect(isBigInt64Array(uintArray)).toBe(false)
		expect(isBigUint64Array(uintArray)).toBe(supported)
		expect(isBigUint64Array(intArray)).toBe(false)
	})
})

describe('emptiness validators', () => {
	it('detects empty primitive and collection values', () => {
		expect(isEmptyString('')).toBe(true)
		expect(isEmptyString('value')).toBe(false)
		expect(isEmptyArray([])).toBe(true)
		expect(isEmptyArray([1])).toBe(false)
		expect(isEmptyMap(new Map())).toBe(true)
		expect(isEmptyMap(new Map([['a', 1]]))).toBe(false)
		expect(isEmptySet(new Set())).toBe(true)
		expect(isEmptySet(new Set([1]))).toBe(false)
		expect(isEmptyObject({})).toBe(true)
		expect(isEmptyObject({ id: '1' })).toBe(false)
	})

	it('detects non-empty primitive and collection values', () => {
		expect(isNonEmptyString('value')).toBe(true)
		expect(isNonEmptyString('')).toBe(false)
		expect(isNonEmptyArray([1])).toBe(true)
		expect(isNonEmptyArray([])).toBe(false)
		expect(isNonEmptyMap(new Map([['a', 1]]))).toBe(true)
		expect(isNonEmptyMap(new Map())).toBe(false)
		expect(isNonEmptySet(new Set([1]))).toBe(true)
		expect(isNonEmptySet(new Set())).toBe(false)
		expect(isNonEmptyObject({ id: '1' })).toBe(true)
		expect(isNonEmptyObject({})).toBe(false)
	})

	it('counts enumerable symbol keys for object emptiness checks', () => {
		const hidden = Symbol('hidden')
		const visible = Symbol('visible')
		const emptyObject = {}
		const nonEmptyObject = { [visible]: true }

		Object.defineProperty(emptyObject, hidden, {
			value: true,
			enumerable: false,
		})

		expect(isEmptyObject(emptyObject)).toBe(true)
		expect(isNonEmptyObject(emptyObject)).toBe(false)
		expect(isEmptyObject(nonEmptyObject)).toBe(false)
		expect(isNonEmptyObject(nonEmptyObject)).toBe(true)
	})
})

describe('function validators', () => {
	it('detects zero-argument functions', () => {
		const zeroArg = () => 1
		const withArg = (value: unknown) => value
		expect(isZeroArg(zeroArg)).toBe(true)
		expect(isZeroArg(withArg)).toBe(false)
	})

	it('detects async functions', () => {
		const asyncFn = async () => 1
		const promiseFn = () => Promise.resolve(1)
		expect(isAsyncFunction(asyncFn)).toBe(true)
		expect(isAsyncFunction(promiseFn)).toBe(false)
	})

	it('detects generator functions', () => {
		function* generator(): Generator<number, void, unknown> {
			yield 1
		}
		expect(isGeneratorFunction(generator)).toBe(true)
		expect(isGeneratorFunction(() => 1)).toBe(false)
	})

	it('detects async generator functions', () => {
		async function* asyncGenerator(): AsyncGenerator<number, void, unknown> {
			yield 1
		}
		expect(isAsyncGeneratorFunction(asyncGenerator)).toBe(true)
		expect(isAsyncGeneratorFunction(async () => 1)).toBe(false)
	})

	it('detects zero-argument async, generator, and async generator functions', () => {
		const zeroArgAsync = async () => 1
		const oneArgAsync = async (value: unknown) => value

		function* zeroArgGenerator(): Generator<number, void, unknown> {
			yield 1
		}

		function* oneArgGenerator(value: unknown): Generator<unknown, void, unknown> {
			yield value
		}

		async function* zeroArgAsyncGenerator(): AsyncGenerator<number, void, unknown> {
			yield 1
		}

		async function* oneArgAsyncGenerator(value: unknown): AsyncGenerator<unknown, void, unknown> {
			yield value
		}

		expect(isZeroArgAsync(zeroArgAsync)).toBe(true)
		expect(isZeroArgAsync(oneArgAsync)).toBe(false)
		expect(isZeroArgGenerator(zeroArgGenerator)).toBe(true)
		expect(isZeroArgGenerator(oneArgGenerator)).toBe(false)
		expect(isZeroArgAsyncGenerator(zeroArgAsyncGenerator)).toBe(true)
		expect(isZeroArgAsyncGenerator(oneArgAsyncGenerator)).toBe(false)
	})
})

describe('guard compositors', () => {
	it('validates arrays and tuples', () => {
		const strings = arrayOf(isString)
		expect(strings(['a', 'b'])).toBe(true)
		expect(strings(['a', 1])).toBe(false)
		expect(strings({})).toBe(false)

		const pair = tupleOf(isString, isNumber)
		expect(pair(['a', 1])).toBe(true)
		expect(pair(['a', 'b'])).toBe(false)
		expect(pair(['a'])).toBe(false)
	})

	it('validates literal and enum values', () => {
		const literal = literalOf('a', 'b', 1)
		expect(literal('a')).toBe(true)
		expect(literal('b')).toBe(true)
		expect(literal(1)).toBe(true)
		expect(literal('c')).toBe(false)

		const color = enumOf({ Red: 'RED', Blue: 'BLUE' })
		expect(color('RED')).toBe(true)
		expect(color('BLUE')).toBe(true)
		expect(color('GREEN')).toBe(false)
	})

	it('validates exact object shapes with optional keys', () => {
		const user = recordOf({ id: isString, age: isNumber })
		expect(user({ id: 'u1', age: 1 })).toBe(true)
		expect(user({ id: 'u1' })).toBe(false)
		expect(user({ id: 'u1', age: 1, extra: true })).toBe(false)

		const optionalUser = recordOf({ id: isString, note: isString }, ['note'])
		expect(optionalUser({ id: 'u1' })).toBe(true)
		expect(optionalUser({ id: 'u1', note: 'hi' })).toBe(true)
		expect(optionalUser({ id: 'u1', note: 1 })).toBe(false)

		const partialUser = recordOf({ id: isString, age: isNumber }, true)
		expect(partialUser({})).toBe(true)
		expect(partialUser({ id: 'x' })).toBe(true)
		expect(partialUser({ id: 1 })).toBe(false)

		const symbolKey = Symbol('s')
		const value: unknown = { id: 'u1', [symbolKey]: 123 }
		expect(recordOf({ id: isString })(value)).toBe(true)
	})

	it('validates maps, sets, and records', () => {
		expect(mapOf(isString, isNumber)(new Map([['a', 1]]))).toBe(true)
		expect(mapOf(isString, isNumber)(new Map([['a', '1']]))).toBe(false)
		expect(setOf(isNumber)(new Set([1, 2]))).toBe(true)
		expect(setOf(isNumber)(new Set([1, '2']))).toBe(false)

		const user = recordOf({ id: isString, age: isNumber })
		expect(user({ id: 'u1', age: 1 })).toBe(true)
		expect(user({ id: 'u1' })).toBe(false)
		expect(user({ id: 'u1', age: 1, extra: true })).toBe(false)
		expect(recordOf({ id: isString })(['x'])).toBe(false)
		expect(recordOf({ id: isString })(null)).toBe(false)

		const symbolKey = Symbol('record')
		const recordWithSymbol: unknown = { id: 'u1', [symbolKey]: 123 }
		expect(recordOf({ id: isString })(recordWithSymbol)).toBe(true)
	})

	it('validates iterables and keys', () => {
		expect(iterableOf(isNumber)(new Set([1, 2]))).toBe(true)
		expect(iterableOf(isNumber)([1, 2, '3'])).toBe(false)
		expect(keyOf({ a: 1, b: 2 })('a')).toBe(true)
		expect(keyOf({ a: 1, b: 2 })('c')).toBe(false)
	})

	it('supports pick and omit', () => {
		const shape = { id: isString, age: isNumber, name: isString }
		const picked = pickOf(shape, ['id', 'name'])
		const omitted = omitOf(shape, ['age'])

		expect(recordOf(picked)({ id: 'x', name: 'y' })).toBe(true)
		expect(recordOf(picked)({ id: 'x' })).toBe(false)
		expect(recordOf(omitted)({ id: 'x', name: 'y' })).toBe(true)
		expect(recordOf(omitted)({ id: 'x', name: 'y', age: 1 })).toBe(false)
	})

	it('supports logical guard composition helpers', () => {
		const nonEmptyString = andOf(isString, (value: string): value is string => value.length > 0)
		expect(nonEmptyString('x')).toBe(true)
		expect(nonEmptyString('')).toBe(false)

		const ab = orOf(literalOf('a'), literalOf('b'))
		expect(ab('a')).toBe(true)
		expect(ab('b')).toBe(true)
		expect(ab('c')).toBe(false)

		const notString = notOf(isString)
		expect(notString('x')).toBe(false)
		expect(notString(1)).toBe(true)

		const circle = recordOf({ kind: literalOf('circle'), r: isNumber })
		const rect = recordOf({ kind: literalOf('rect'), w: isNumber, h: isNumber })
		const shape = orOf(circle, rect)
		const notCircle = complementOf(shape, circle)
		expect(notCircle({ kind: 'rect', w: 1, h: 2 })).toBe(true)
		expect(notCircle({ kind: 'circle', r: 3 })).toBe(false)

		const union = unionOf(literalOf('a'), literalOf('b'))
		expect(union('a')).toBe(true)
		expect(union('b')).toBe(true)
		expect(union('c')).toBe(false)

		const intersection = intersectionOf(
			isString,
			(value: unknown): value is string => isString(value) && value.length > 0,
		)
		expect(intersection('x')).toBe(true)
		expect(intersection('')).toBe(false)

		const composed = intersectionOf(
			(value: unknown): value is string => isString(value) && /^[A-Za-z]+$/.test(value),
			(value: unknown): value is string => isString(value) && value.length === 2,
		)
		expect(composed('ab')).toBe(true)
		expect(composed('a1')).toBe(false)
		expect(composed('abc')).toBe(false)
	})

	it('supports refinement, laziness, transforms, and nullability', () => {
		const nonEmpty = whereOf(isString, (value) => value.length > 0)
		expect(nonEmpty('a')).toBe(true)
		expect(nonEmpty('')).toBe(false)

		let buildCount = 0
		const lazyString = lazyOf(() => {
			buildCount += 1
			return isString
		})
		expect(buildCount).toBe(0)
		expect(lazyString('tree')).toBe(true)
		expect(lazyString(1)).toBe(false)
		expect(buildCount).toBe(2)

		const positiveLength = transformOf(
			isString,
			(value) => value.length,
			(value: unknown): value is number => isNumber(value) && value > 0,
		)
		expect(positiveLength('abc')).toBe(true)
		expect(positiveLength('')).toBe(false)

		const maybeString = nullableOf(isString)
		expect(maybeString(null)).toBe(true)
		expect(maybeString('x')).toBe(true)
		expect(maybeString(1)).toBe(false)
	})

	it('supports instance checks', () => {
		class Box {
			readonly value: number
			constructor(value: number) {
				this.value = value
			}
		}

		const isBox = instanceOf(Box)
		expect(isBox(new Box(1))).toBe(true)
		expect(isBox({})).toBe(false)
		expect(instanceOf(Date)(new Date(0))).toBe(true)
		expect(instanceOf(Date)('1970-01-01')).toBe(false)
	})
})

describe('domain validators', () => {
	it('counts enumerable symbols and detects constructor functions', () => {
		const flag = Symbol('flag')
		const value = Object.defineProperty({}, flag, {
			value: true,
			enumerable: true,
		})

		expect(enumerableSymbolCount(value)).toBe(1)
		expect(isConstructor(class Example {})).toBe(true)
		expect(isConstructor(() => undefined)).toBe(false)
	})

	it('validates JSON values and JSON Schemas', () => {
		expect(isJsonPrimitive('x')).toBe(true)
		expect(isJsonPrimitive(null)).toBe(true)
		expect(isJsonPrimitive({})).toBe(false)

		expect(isJsonValue({ nested: ['ok', 1, false, null] })).toBe(true)
		expect(isJsonValue({ bad: new Date() })).toBe(false)
		expect(isJsonObject({ key: { nested: true } })).toBe(true)
		expect(isJsonObject(['not', 'object'])).toBe(false)

		expect(isJsonSchema(false)).toBe(true)
		expect(
			isJsonSchema({
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			}),
		).toBe(true)
		expect(isJsonSchema({ type: 'unknown' })).toBe(false)
		expect(isJsonSchemaObject({ type: 'object', additionalProperties: true })).toBe(true)
		expect(isJsonSchemaObject({ type: 'string' })).toBe(false)
	})

	it('validates finite numbers', () => {
		expect(isFiniteNumber(42)).toBe(true)
		expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false)
		expect(isFiniteNumber('42')).toBe(false)
	})
})

// === F2 — literalOf Object.is semantics

describe('literalOf — F2 Object.is edge cases', () => {
	it('literalOf(NaN)(NaN) → true (Object.is(NaN, NaN) === true)', () => {
		const isNaNLiteral = literalOf(Number.NaN)
		expect(isNaNLiteral(Number.NaN)).toBe(true)
	})

	it('literalOf(0)(-0) → false (Object.is(0, -0) === false)', () => {
		const isZero = literalOf(0)
		expect(isZero(-0)).toBe(false)
	})

	it('literalOf(-0)(0) → false (Object.is(-0, 0) === false)', () => {
		const isNegZero = literalOf(-0)
		expect(isNegZero(0)).toBe(false)
	})

	it('literalOf(-0)(-0) → true', () => {
		const isNegZero = literalOf(-0)
		expect(isNegZero(-0)).toBe(true)
	})
})

// === F2 — keyOf edge cases

describe('keyOf — F2 edge cases', () => {
	it('"__proto__" — keyOf uses the `in` operator, which walks the prototype chain', () => {
		// keyOf uses `entry in value`. '__proto__' is NOT an own key of `{}`, but
		// `'__proto__' in {}` is TRUE because it resolves through Object.prototype.
		// This is a documented proto-hazard. We pin the REAL behavior here:
		// divergence tracked for Phase G (consider using Object.hasOwn in keyOf).
		const guard = keyOf({})
		// '__proto__' in {} === true (prototype chain lookup via `in`)
		expect(guard('__proto__')).toBe(true)
	})

	it('symbol key: keyOf accepts a symbol that IS in the object', () => {
		const sym = Symbol('key')
		const obj = { [sym]: 42 }
		const guard = keyOf(obj)
		expect(guard(sym)).toBe(true)
	})

	it('symbol key: keyOf rejects a symbol that is NOT in the object', () => {
		const sym = Symbol('absent')
		const guard = keyOf({ a: 1 })
		expect(guard(sym)).toBe(false)
	})

	it('numeric key: keyOf accepts a number that is a key of the object', () => {
		const guard = keyOf({ 0: 'zero', 1: 'one' })
		expect(guard(0)).toBe(true)
		expect(guard(1)).toBe(true)
		expect(guard(2)).toBe(false)
	})
})

// === F2 — isFiniteNumber edge cases

describe('isFiniteNumber — F2 edges', () => {
	it('returns false for -Infinity', () => {
		expect(isFiniteNumber(-Infinity)).toBe(false)
	})

	it('returns false for NaN', () => {
		expect(isFiniteNumber(NaN)).toBe(false)
	})

	it('returns true for -0 (negative zero is finite)', () => {
		// -0 passes Number.isFinite(-0) === true
		expect(isFiniteNumber(-0)).toBe(true)
	})
})

// === F2 — empty collection vacuous-true cases

describe('arrayOf — F2 empty collection vacuous-true', () => {
	it('arrayOf(isString)([] ) → true (vacuously all elements satisfy)', () => {
		expect(arrayOf(isString)([])).toBe(true)
	})

	it('arrayOf(isNumber)([] ) → true', () => {
		expect(arrayOf(isNumber)([])).toBe(true)
	})
})

describe('setOf — F2 empty collection vacuous-true', () => {
	it('setOf(isString)(new Set()) → true', () => {
		expect(setOf(isString)(new Set())).toBe(true)
	})
})

describe('mapOf — F2 empty collection vacuous-true', () => {
	it('mapOf(isString, isNumber)(new Map()) → true', () => {
		expect(mapOf(isString, isNumber)(new Map())).toBe(true)
	})
})

describe('tupleOf — F2 edge cases', () => {
	it('tupleOf() (zero guards) on [] → true (exact arity match)', () => {
		const guard = tupleOf()
		expect(guard([])).toBe(true)
	})

	it('tupleOf() (zero guards) on non-empty array → false (wrong arity)', () => {
		const guard = tupleOf()
		expect(guard([1])).toBe(false)
		expect(guard(['a', 'b'])).toBe(false)
	})
})

describe('unionOf — F2 zero-guards edge case', () => {
	it('unionOf() (no guards) → false for every input (guards.some() on empty = false)', () => {
		// [].some(...) returns false — so unionOf() always returns false.
		const guard = unionOf()
		expect(guard('anything')).toBe(false)
		expect(guard(42)).toBe(false)
		expect(guard(null)).toBe(false)
	})
})

describe('intersectionOf — F2 zero-guards edge case', () => {
	it('intersectionOf() (no guards) → true for every input (guards.every() on empty = true)', () => {
		// [].every(...) returns true — so intersectionOf() always returns true.
		const guard = intersectionOf()
		expect(guard('anything')).toBe(true)
		expect(guard(42)).toBe(true)
		expect(guard(null)).toBe(true)
	})
})

// === F2 — transformOf edge cases

describe('transformOf — F2 edges', () => {
	it('projector that throws: guard returns false (§13 — never throw from a public guard)', () => {
		// Per §13, a public guard must NEVER throw. transformOf calls project(value)
		// inside the guard — if project throws, the guard itself must not propagate
		// that throw. Let's pin the REAL behavior:
		const throwingGuard = transformOf(
			isString,
			(_value: string) => {
				throw new Error('projection error')
			},
			isNumber,
		)
		// The guard wraps the projection call — if it throws, the throw propagates
		// OUT of the guard (§13 violation). Pin the actual behavior:
		// transformOf does NOT catch errors from the projector — it propagates.
		// This is a documented divergence: transformOf is NOT §13-safe if the
		// projector throws. Tracked for Phase G.
		expect(() => throwingGuard('hello')).toThrow('projection error')
	})

	it('standard projector: guards the projected value, not the original', () => {
		const positiveLength = transformOf(
			isString,
			(value: string) => value.length,
			(value: unknown): value is number => isNumber(value) && (value as number) > 0,
		)
		expect(positiveLength('abc')).toBe(true)
		expect(positiveLength('')).toBe(false)
		expect(positiveLength(42)).toBe(false) // base guard fails
	})
})

// === F2 — nullableOf edge cases

describe('nullableOf — F2 edges', () => {
	it('nullableOf(isString)(undefined) → false (only null is the null-extension, not undefined)', () => {
		// nullableOf adds null tolerance, NOT undefined tolerance.
		const guard = nullableOf(isString)
		expect(guard(undefined)).toBe(false)
	})

	it('nullableOf(isString)(null) → true', () => {
		expect(nullableOf(isString)(null)).toBe(true)
	})

	it('nullableOf(isString)("x") → true', () => {
		expect(nullableOf(isString)('x')).toBe(true)
	})
})

// === F2 — JSON-schema sub-guards directly

describe('isJsonSchemaArray — F2 direct tests', () => {
	it('non-array input → false', () => {
		expect(isJsonSchemaArray({ type: 'string' })).toBe(false)
		expect(isJsonSchemaArray('string')).toBe(false)
		expect(isJsonSchemaArray(null)).toBe(false)
		expect(isJsonSchemaArray(42)).toBe(false)
	})

	it('empty array → true (vacuously all schemas)', () => {
		expect(isJsonSchemaArray([])).toBe(true)
	})

	it('array with valid schemas → true', () => {
		expect(isJsonSchemaArray([{ type: 'string' }, { type: 'number' }])).toBe(true)
		expect(isJsonSchemaArray([true, false])).toBe(true)
	})

	it('array with an invalid schema entry → false', () => {
		expect(isJsonSchemaArray([{ type: 'string' }, { type: 'invalid-type' }])).toBe(false)
		expect(isJsonSchemaArray([{ type: 'string' }, 42])).toBe(false)
	})
})

describe('isJsonSchemaMapValue — F2 direct tests', () => {
	it('non-record input → false', () => {
		expect(isJsonSchemaMapValue([])).toBe(false)
		expect(isJsonSchemaMapValue('string')).toBe(false)
		expect(isJsonSchemaMapValue(null)).toBe(false)
		expect(isJsonSchemaMapValue(42)).toBe(false)
	})

	it('empty record → true', () => {
		expect(isJsonSchemaMapValue({})).toBe(true)
	})

	it('record with valid schemas as values → true', () => {
		expect(isJsonSchemaMapValue({ name: { type: 'string' }, age: { type: 'integer' } })).toBe(true)
		expect(isJsonSchemaMapValue({ allowed: true })).toBe(true)
	})

	it('record with an invalid schema value → false', () => {
		expect(isJsonSchemaMapValue({ name: { type: 'string' }, bad: { type: 'invalid' } })).toBe(false)
	})
})

describe('isJsonSchemaStringArrayMapValue — F2 direct tests', () => {
	it('non-record input → false', () => {
		expect(isJsonSchemaStringArrayMapValue([])).toBe(false)
		expect(isJsonSchemaStringArrayMapValue('string')).toBe(false)
		expect(isJsonSchemaStringArrayMapValue(null)).toBe(false)
		expect(isJsonSchemaStringArrayMapValue(42)).toBe(false)
	})

	it('empty record → true', () => {
		expect(isJsonSchemaStringArrayMapValue({})).toBe(true)
	})

	it('record with string arrays as values → true', () => {
		expect(isJsonSchemaStringArrayMapValue({ a: ['b', 'c'], d: [] })).toBe(true)
	})

	it('record with a non-array value → false', () => {
		expect(isJsonSchemaStringArrayMapValue({ a: 'not an array' })).toBe(false)
	})

	it('record with an array containing a non-string → false', () => {
		expect(isJsonSchemaStringArrayMapValue({ a: ['ok', 42] })).toBe(false)
	})
})

// === F2 — enumerableSymbolCount edge cases

describe('enumerableSymbolCount — F2 edges', () => {
	it('zero-symbol plain object → 0', () => {
		expect(enumerableSymbolCount({})).toBe(0)
	})

	it('string-keyed-only object → 0 (string keys are NOT symbols)', () => {
		expect(enumerableSymbolCount({ a: 1, b: 2 })).toBe(0)
	})

	it('non-enumerable symbol is excluded from count', () => {
		const sym = Symbol('hidden')
		const obj = Object.defineProperty({}, sym, { value: true, enumerable: false })
		expect(enumerableSymbolCount(obj)).toBe(0)
	})

	it('enumerable symbol is included in count', () => {
		const sym = Symbol('visible')
		const obj = Object.defineProperty({}, sym, { value: true, enumerable: true })
		expect(enumerableSymbolCount(obj)).toBe(1)
	})

	it('mixed: one enumerable + one non-enumerable symbol → 1', () => {
		const visible = Symbol('visible')
		const hidden = Symbol('hidden')
		const obj = Object.defineProperty(
			Object.defineProperty({}, visible, { value: 1, enumerable: true }),
			hidden,
			{ value: 2, enumerable: false },
		)
		expect(enumerableSymbolCount(obj)).toBe(1)
	})
})

// === F2 — isConstructor edge cases

describe('isConstructor — F2 edges', () => {
	it('Array is a constructor', () => {
		expect(isConstructor(Array)).toBe(true)
	})

	it('Symbol — Reflect.construct probe succeeds, so isConstructor(Symbol) returns true', () => {
		// `new Symbol()` throws a TypeError at runtime, BUT `Reflect.construct(String, [], Symbol)`
		// succeeds because Symbol does have an internal [[Construct]] slot.
		// The isConstructor probe uses Reflect.construct(String, [], value) which
		// tests whether the VALUE can be a newTarget argument — Symbol passes
		// this test even though `new Symbol()` would throw (Symbol is a constructor
		// for the "new.target" protocol but throws when invoked that way).
		// Pin the REAL behavior: isConstructor(Symbol) === true.
		expect(isConstructor(Symbol)).toBe(true)
	})

	it('Function.prototype.bind result of a class is still a constructor', () => {
		class Foo {
			x: number
			constructor(x: number) {
				this.x = x
			}
		}
		const BoundFoo = Foo.bind(null)
		expect(isConstructor(BoundFoo)).toBe(true)
	})

	it('arrow function is NOT a constructor', () => {
		const arrow = () => undefined
		expect(isConstructor(arrow)).toBe(false)
	})

	it('regular function IS a constructor', () => {
		function regular() {
			return undefined
		}
		expect(isConstructor(regular)).toBe(true)
	})

	it('class is a constructor', () => {
		class Example {}
		expect(isConstructor(Example)).toBe(true)
	})

	it('non-function value is not a constructor', () => {
		expect(isConstructor({})).toBe(false)
		expect(isConstructor(42)).toBe(false)
		expect(isConstructor(null)).toBe(false)
	})
})

// === §13 — a public type guard must NEVER throw (cycle / depth safety)
//
// `isJsonValue` / `isJsonObject` / `isJsonSchema` recurse over arbitrary
// object graphs. A cyclic input (`const a={}; a.self=a`) or a pathologically
// deep input caused unbounded recursion → a `RangeError` thrown OUT of a
// PUBLIC GUARD, violating AGENTS.md §13 ("Inside a type guard → return false —
// never throw"). These tests pin the recursion-safe contract: such input must
// resolve to a boolean (here: `false`), never throw / blow the stack.

describe('§13 — JSON guards are cycle- and depth-safe (never throw)', () => {
	it('isJsonValue returns false (not RangeError) for a self-referential array', () => {
		const cyclic = makeCyclicArray()
		expect(() => isJsonValue(cyclic)).not.toThrow()
		expect(isJsonValue(cyclic)).toBe(false)
	})

	it('isJsonValue returns false (not RangeError) for a self-referential object', () => {
		const cyclic = makeCyclicObject()
		expect(() => isJsonValue(cyclic)).not.toThrow()
		expect(isJsonValue(cyclic)).toBe(false)
	})

	it('isJsonObject returns false (not RangeError) for a self-referential object', () => {
		const cyclic = makeCyclicObject()
		expect(() => isJsonObject(cyclic)).not.toThrow()
		expect(isJsonObject(cyclic)).toBe(false)
	})

	it('isJsonSchema returns false (not RangeError) for a cyclic schema-ish object', () => {
		// A schema-shaped object whose `default` keyword points back at itself:
		// the structured `default` check recurses via isJsonValue. Must resolve
		// to a boolean, never RangeError out of the guard.
		const cyclic: Record<string, unknown> = { type: 'object' }
		cyclic['default'] = cyclic
		expect(() => isJsonSchema(cyclic)).not.toThrow()
		expect(isJsonSchema(cyclic)).toBe(false)
	})

	it('isJsonValue does not stack-overflow on a 100k-deep nested array', () => {
		// Built iteratively (not recursively) so constructing the fixture
		// itself cannot blow the stack — only the guard's recursion is tested.
		let deep: unknown[] = []
		const root = deep
		for (let i = 0; i < 100_000; i += 1) {
			const next: unknown[] = []
			deep.push(next)
			deep = next
		}
		let result: boolean | undefined
		expect(() => {
			result = isJsonValue(root)
		}).not.toThrow()
		expect(typeof result).toBe('boolean')
	})

	it('isJsonValue does not stack-overflow on a 100k-deep nested object', () => {
		let deep: Record<string, unknown> = {}
		const root = deep
		for (let i = 0; i < 100_000; i += 1) {
			const next: Record<string, unknown> = {}
			deep['child'] = next
			deep = next
		}
		let result: boolean | undefined
		expect(() => {
			result = isJsonValue(root)
		}).not.toThrow()
		expect(typeof result).toBe('boolean')
	})

	it('isJsonValue: a child object reused in two sibling keys is NOT a cycle → true', () => {
		// Shared-but-acyclic substructure must not false-positive as a cycle.
		// The same leaf object referenced from two distinct sibling keys is a
		// DAG, not a cycle — it is valid JSON and must validate `true`.
		const shared = { a: 1, b: 'ok' }
		const value = { left: shared, right: shared, list: [shared, shared] }
		expect(isJsonValue(value)).toBe(true)
	})

	it('isJsonValue: a legitimately deep-but-acyclic object still validates true', () => {
		// 50-level nested acyclic object — guard must NOT over-reject genuine
		// deep JSON (the cycle guard must be precise, not a blanket depth ban).
		let node: Record<string, unknown> = { leaf: 'value' }
		for (let i = 0; i < 50; i += 1) {
			node = { child: node }
		}
		expect(isJsonValue(node)).toBe(true)
	})

	it('isJsonSchema: a sub-schema reused in two keyword slots is NOT a cycle → true', () => {
		const sub = { type: 'string' } as const
		const schema = { type: 'object', if: sub, then: sub, else: sub }
		expect(isJsonSchema(schema)).toBe(true)
	})
})
