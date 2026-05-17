import { describe, expect, it } from 'vitest'
import type { ContractShape, JsonSchemaObject, LiteralShape } from '@elements/core'
import {
	arrayShape,
	booleanShape,
	compileGenerator,
	compileGuard,
	compileParser,
	compileSchema,
	createRandom,
	integerShape,
	isRecord,
	literalShape,
	nullableShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	rawShape,
	recordShape,
	stringShape,
	unionShape,
} from '@elements/core'
import { POLLUTION_KEYS, assertNoPrototypePollution } from './_helpers.js'

// === compileSchema

describe('compileSchema', () => {
	it('string — basic', () => {
		expect(compileSchema(stringShape())).toEqual({ type: 'string' })
	})

	it('string — with constraints', () => {
		expect(
			compileSchema(stringShape({ min: 1, max: 10, pattern: /^[a-z]+$/, description: 'd' })),
		).toEqual({
			type: 'string',
			minLength: 1,
			maxLength: 10,
			pattern: '^[a-z]+$',
			description: 'd',
		})
	})

	it('number — float', () => {
		expect(compileSchema(numberShape({ min: 0, max: 1 }))).toEqual({
			type: 'number',
			minimum: 0,
			maximum: 1,
		})
	})

	it('number — integer', () => {
		expect(compileSchema(integerShape({ min: 0, max: 100 }))).toEqual({
			type: 'integer',
			minimum: 0,
			maximum: 100,
		})
	})

	it('boolean', () => {
		expect(compileSchema(booleanShape())).toEqual({ type: 'boolean' })
	})

	it('literal', () => {
		expect(compileSchema(literalShape('a', 'b'))).toEqual({ enum: ['a', 'b'] })
	})

	it('array', () => {
		expect(compileSchema(arrayShape(stringShape(), { min: 1, max: 3 }))).toEqual({
			type: 'array',
			items: { type: 'string' },
			minItems: 1,
			maxItems: 3,
		})
	})

	it('object — marks required and optional', () => {
		const schema = compileSchema(
			objectShape({
				name: stringShape(),
				bio: optionalShape(stringShape()),
			}),
		)
		expect(schema).toMatchObject({
			type: 'object',
			required: ['name'],
			additionalProperties: false,
		})
	})

	it('union', () => {
		const schema = compileSchema(unionShape(stringShape(), integerShape()))
		expect(schema).toMatchObject({ anyOf: [{ type: 'string' }, { type: 'integer' }] })
	})

	it('optional — delegates to inner', () => {
		expect(compileSchema(optionalShape(stringShape()))).toEqual({ type: 'string' })
	})

	it('nullable — emits anyOf with null', () => {
		expect(compileSchema(nullableShape(stringShape()))).toEqual({
			anyOf: [{ type: 'string' }, { type: 'null' }],
		})
	})
})

// === compileGuard

describe('compileGuard', () => {
	it('string — accepts strings', () => {
		const guard = compileGuard(stringShape())
		expect(guard('hello')).toBe(true)
		expect(guard('')).toBe(true)
		expect(guard(42)).toBe(false)
		expect(guard(null)).toBe(false)
	})

	it('string — enforces min/max length', () => {
		const guard = compileGuard(stringShape({ min: 2, max: 4 }))
		expect(guard('ab')).toBe(true)
		expect(guard('abcd')).toBe(true)
		expect(guard('a')).toBe(false)
		expect(guard('abcde')).toBe(false)
	})

	it('string — enforces pattern', () => {
		const guard = compileGuard(stringShape({ pattern: /^\d+$/ }))
		expect(guard('123')).toBe(true)
		expect(guard('abc')).toBe(false)
	})

	it('number — accepts finite numbers', () => {
		const guard = compileGuard(numberShape())
		expect(guard(3.14)).toBe(true)
		expect(guard(0)).toBe(true)
		expect(guard(Infinity)).toBe(false)
		expect(guard('3')).toBe(false)
	})

	it('number — enforces integer', () => {
		const guard = compileGuard(integerShape())
		expect(guard(5)).toBe(true)
		expect(guard(5.5)).toBe(false)
	})

	it('number — enforces min/max', () => {
		const guard = compileGuard(numberShape({ min: 0, max: 10 }))
		expect(guard(5)).toBe(true)
		expect(guard(-1)).toBe(false)
		expect(guard(11)).toBe(false)
	})

	it('boolean', () => {
		const guard = compileGuard(booleanShape())
		expect(guard(true)).toBe(true)
		expect(guard(false)).toBe(true)
		expect(guard(1)).toBe(false)
		expect(guard('true')).toBe(false)
	})

	it('literal', () => {
		const guard = compileGuard(literalShape('a', 'b', 'c'))
		expect(guard('a')).toBe(true)
		expect(guard('d')).toBe(false)
		expect(guard(1)).toBe(false)
	})

	it('array — accepts matching arrays', () => {
		const guard = compileGuard(arrayShape(integerShape()))
		expect(guard([1, 2, 3])).toBe(true)
		expect(guard([])).toBe(true)
		expect(guard([1, 'two'])).toBe(false)
		expect(guard('not an array')).toBe(false)
	})

	it('array — enforces min/max length', () => {
		const guard = compileGuard(arrayShape(stringShape(), { min: 1, max: 2 }))
		expect(guard(['a'])).toBe(true)
		expect(guard([])).toBe(false)
		expect(guard(['a', 'b', 'c'])).toBe(false)
	})

	it('object — accepts exact key sets', () => {
		const shape: ContractShape = objectShape({
			name: stringShape(),
			age: integerShape(),
		})
		const guard = compileGuard(shape)
		expect(guard({ name: 'Alice', age: 30 })).toBe(true)
		expect(guard({ name: 'Alice' })).toBe(false)
		expect(guard({ name: 'Alice', age: 30, extra: true })).toBe(false)
	})

	it('object — allows optional keys to be absent', () => {
		const guard = compileGuard(
			objectShape({
				name: stringShape(),
				bio: optionalShape(stringShape()),
			}),
		)
		expect(guard({ name: 'Alice' })).toBe(true)
		expect(guard({ name: 'Alice', bio: 'hello' })).toBe(true)
	})

	it('union — matches any variant', () => {
		const guard = compileGuard(unionShape(stringShape(), integerShape()))
		expect(guard('hello')).toBe(true)
		expect(guard(5)).toBe(true)
		expect(guard(3.14)).toBe(false)
		expect(guard(true)).toBe(false)
	})

	it('optional — accepts undefined and inner type', () => {
		const guard = compileGuard(optionalShape(stringShape()))
		expect(guard(undefined)).toBe(true)
		expect(guard('hello')).toBe(true)
		expect(guard(null)).toBe(false)
	})

	it('nullable — accepts null and inner type', () => {
		const guard = compileGuard(nullableShape(stringShape()))
		expect(guard(null)).toBe(true)
		expect(guard('hello')).toBe(true)
		expect(guard(undefined)).toBe(false)
	})
})

// === compileParser

describe('compileParser', () => {
	it('string — trims and normalizes', () => {
		const parse = compileParser(stringShape())
		expect(parse('  hello  ')).toBe('hello')
		expect(parse('')).toBeUndefined()
		expect(parse('   ')).toBeUndefined()
		expect(parse(42)).toBeUndefined()
	})

	it('number — coerces numeric strings', () => {
		const parse = compileParser(numberShape())
		expect(parse(3.14)).toBe(3.14)
		expect(parse('3.14')).toBe(3.14)
		expect(parse('abc')).toBeUndefined()
		expect(parse(Infinity)).toBeUndefined()
	})

	it('integer — rejects non-integer floats', () => {
		const parse = compileParser(integerShape())
		expect(parse(5)).toBe(5)
		expect(parse('5')).toBe(5)
		expect(parse(5.5)).toBeUndefined()
	})

	it('boolean — coerces strings and numbers', () => {
		const parse = compileParser(booleanShape())
		expect(parse(true)).toBe(true)
		expect(parse('true')).toBe(true)
		expect(parse(1)).toBe(true)
		expect(parse(false)).toBe(false)
		expect(parse('false')).toBe(false)
		expect(parse(0)).toBe(false)
		expect(parse('yes')).toBeUndefined()
	})

	it('literal — accepts matching values', () => {
		const parse = compileParser(literalShape('a', 'b'))
		expect(parse('a')).toBe('a')
		expect(parse('  b  ')).toBe('b')
		expect(parse('c')).toBeUndefined()
	})

	it('array — parses each element', () => {
		const parse = compileParser(arrayShape(integerShape()))
		expect(parse([1, '2', 3])).toEqual([1, 2, 3])
		expect(parse([1, 'abc'])).toBeUndefined()
		expect(parse('not array')).toBeUndefined()
	})

	it('object — parses known fields and ignores optional missing', () => {
		const shape: ContractShape = objectShape({
			name: stringShape(),
			age: integerShape(),
			bio: optionalShape(stringShape()),
		})
		const parse = compileParser(shape)
		expect(parse({ name: '  Alice  ', age: '30' })).toEqual({ name: 'Alice', age: 30 })
		expect(parse({ name: 'Alice', age: '30', bio: 'hi' })).toEqual({
			name: 'Alice',
			age: 30,
			bio: 'hi',
		})
		expect(parse({ name: 'Alice' })).toBeUndefined()
		expect(parse('not object')).toBeUndefined()
	})

	it('union — uses first matching parser', () => {
		const parse = compileParser(unionShape(integerShape(), stringShape()))
		expect(parse(5)).toBe(5)
		expect(parse('hello')).toBe('hello')
		expect(parse(true)).toBeUndefined()
	})

	it('optional — passes through undefined', () => {
		const parse = compileParser(optionalShape(stringShape()))
		expect(parse(undefined)).toBeUndefined()
		expect(parse('hello')).toBe('hello')
	})

	it('nullable — passes through null', () => {
		const parse = compileParser(nullableShape(stringShape()))
		expect(parse(null)).toBeNull()
		expect(parse('hello')).toBe('hello')
	})

	it('parses typed values through the compiled parser', () => {
		const parse = compileParser(integerShape())

		expect(parse('30')).toBe(30)
		expect(parse(30)).toBe(30)
		expect(parse('30.5')).toBeUndefined()
	})
})

// === compileGenerator

describe('compileGenerator', () => {
	const random = createRandom(99)

	it('string — returns a string prefixed with str_', () => {
		const value = compileGenerator(stringShape(), createRandom(1))
		expect(typeof value).toBe('string')
		expect(String(value).startsWith('str_')).toBe(true)
	})

	it('number — returns a finite number in range', () => {
		const value = compileGenerator(numberShape({ min: 10, max: 20 }), createRandom(1))
		expect(typeof value).toBe('number')
		if (typeof value !== 'number') {
			throw new Error('Expected a generated number')
		}
		expect(value).toBeGreaterThanOrEqual(10)
		expect(value).toBeLessThanOrEqual(20)
	})

	it('integer — returns a whole number', () => {
		const value = compileGenerator(integerShape({ min: 1, max: 10 }), createRandom(1))
		expect(Number.isInteger(value)).toBe(true)
	})

	it('boolean — returns a boolean', () => {
		expect(typeof compileGenerator(booleanShape(), createRandom(0))).toBe('boolean')
	})

	it('literal — returns one of the values', () => {
		const values = ['a', 'b', 'c']
		const value = compileGenerator(literalShape(...values), createRandom(1))
		expect(values).toContain(value)
	})

	it('literal — throws when values is empty', () => {
		const shape: LiteralShape = { type: 'literal', values: [] }
		expect(() => compileGenerator(shape, random)).toThrow(
			'literalShape requires at least one value',
		)
	})

	it('array — returns an array with items matching shape', () => {
		const value = compileGenerator(arrayShape(integerShape(), { min: 2, max: 2 }), createRandom(1))
		expect(Array.isArray(value)).toBe(true)
		if (!Array.isArray(value)) {
			throw new Error('Expected a generated array')
		}
		expect(value).toHaveLength(2)
		for (const item of value) {
			expect(Number.isInteger(item)).toBe(true)
		}
	})

	it('object — returns a record with required keys', () => {
		const value = compileGenerator(
			objectShape({ name: stringShape(), age: integerShape() }),
			createRandom(1),
		)
		expect(isRecord(value)).toBe(true)
		if (!isRecord(value)) {
			throw new Error('Expected a generated record')
		}
		expect(typeof value['name']).toBe('string')
		expect(Number.isInteger(value['age'])).toBe(true)
	})

	it('union — returns a value from one of the variants', () => {
		const guard = compileGuard(unionShape(stringShape(), integerShape()))
		const value = compileGenerator(unionShape(stringShape(), integerShape()), createRandom(7))
		expect(guard(value)).toBe(true)
	})

	it('optional — returns the inner value', () => {
		const value = compileGenerator(optionalShape(integerShape()), createRandom(1))
		expect(Number.isInteger(value)).toBe(true)
	})

	it('nullable — returns null or inner value', () => {
		let seenNull = false
		let seenValue = false
		for (let seed = 0; seed < 50; seed += 1) {
			const value = compileGenerator(nullableShape(integerShape()), createRandom(seed))
			if (value === null) {
				seenNull = true
			} else {
				seenValue = true
			}
		}
		expect(seenNull).toBe(true)
		expect(seenValue).toBe(true)
	})

	it('produces the same output for the same seed', () => {
		const shape: ContractShape = objectShape({ x: integerShape({ min: 0, max: 100 }) })
		const a = compileGenerator(shape, createRandom(42))
		const b = compileGenerator(shape, createRandom(42))
		expect(a).toEqual(b)
	})

	it('returns values accepted by the compiled guard', () => {
		const shape = integerShape({ min: 1, max: 10 })
		const guard = compileGuard(shape)
		const value = compileGenerator(shape, createRandom(12))

		expect(guard(value)).toBe(true)
	})
})

// === additionalProperties

describe('compileSchema — additionalProperties', () => {
	it('emits additionalProperties: false by default', () => {
		const schema = compileSchema(objectShape({ id: stringShape() }))
		expect(schema).toHaveProperty('additionalProperties', false)
	})

	it('emits additionalProperties: true when set', () => {
		const schema = compileSchema(objectShape({}, { additionalProperties: true }))
		expect(schema).toEqual({ type: 'object', additionalProperties: true })
	})

	it('omits empty properties and required for open objects without fixed fields', () => {
		const schema = compileSchema(objectShape({}, { additionalProperties: true }))
		expect(schema).not.toHaveProperty('properties')
		expect(schema).not.toHaveProperty('required')
	})

	it('emits additionalProperties as compiled shape', () => {
		const schema = compileSchema(recordShape(numberShape()))
		expect(schema).toHaveProperty('additionalProperties')
		expect(schema.additionalProperties).toEqual({ type: 'number' })
	})

	it('emits additionalProperties: { type: string } for string records', () => {
		const schema = compileSchema(recordShape(stringShape()))
		expect(schema.additionalProperties).toEqual({ type: 'string' })
	})
})

describe('compileGuard — additionalProperties', () => {
	it('rejects unknown keys on closed objects (default)', () => {
		const guard = compileGuard(objectShape({ id: stringShape() }))
		expect(guard({ id: 'ok', extra: 'nope' })).toBe(false)
	})

	it('accepts unknown keys on open objects', () => {
		const guard = compileGuard(objectShape({ id: stringShape() }, { additionalProperties: true }))
		expect(guard({ id: 'ok', extra: 'allowed' })).toBe(true)
	})

	it('validates additional properties against shape constraint', () => {
		const guard = compileGuard(recordShape(numberShape()))
		expect(guard({ x: 1, y: 2 })).toBe(true)
		expect(guard({ x: 1, y: 'not a number' })).toBe(false)
	})

	it('validates mixed known + additional properties', () => {
		const guard = compileGuard(
			objectShape({ name: stringShape() }, { additionalProperties: numberShape() }),
		)
		expect(guard({ name: 'test', score: 42 })).toBe(true)
		expect(guard({ name: 'test', score: 'nope' })).toBe(false)
		expect(guard({ name: 'test' })).toBe(true)
	})
})

describe('compileParser — additionalProperties', () => {
	it('ignores unknown keys on closed objects', () => {
		const parser = compileParser(objectShape({ id: stringShape() }))
		const result = parser({ id: 'ok', extra: 'ignored' })
		expect(result).toEqual({ id: 'ok' })
	})

	it('passes through unknown keys on open objects', () => {
		const parser = compileParser(objectShape({ id: stringShape() }, { additionalProperties: true }))
		const result = parser({ id: 'ok', extra: 'kept' })
		expect(result).toEqual({ id: 'ok', extra: 'kept' })
	})

	it('parses additional properties through shape constraint', () => {
		const parser = compileParser(recordShape(numberShape()))
		expect(parser({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
		expect(parser({ x: 1, y: 'bad' })).toBeUndefined()
	})

	it('parses mixed known + additional properties', () => {
		const parser = compileParser(
			objectShape({ name: stringShape() }, { additionalProperties: numberShape() }),
		)
		expect(parser({ name: 'test', a: 1, b: 2 })).toEqual({ name: 'test', a: 1, b: 2 })
	})
})

// === prototype pollution (security)

describe('compileParser — prototype pollution', () => {
	// A JSON.parse'd body where `__proto__` is an OWN enumerable key (not the
	// accessor): JSON.parse defeats the `__proto__` setter, so this object
	// genuinely carries dangerous keys that flow through isRecord +
	// Object.keys into the object parser's accumulator.
	const hostilePayload = () =>
		JSON.parse(
			'{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1},"safe":"ok"}',
		) as unknown

	function assertCleanResult(parsed: unknown): void {
		// (a) Object.prototype itself is untouched.
		expect(({} as Record<string, unknown>)['polluted']).toBeUndefined()
		// Sanity: the parsed result's prototype is a normal plain-object
		// prototype (or null), never an attacker-grafted one.
		const proto = parsed === undefined ? null : Object.getPrototypeOf(parsed)
		expect(proto === Object.prototype || proto === null).toBe(true)
		if (parsed === undefined || typeof parsed !== 'object') {
			return
		}
		// (b) The dangerous keys are DROPPED — never present as own keys
		// carrying the malicious nested value.
		for (const key of POLLUTION_KEYS) {
			expect(Object.prototype.hasOwnProperty.call(parsed, key)).toBe(false)
		}
	}

	it('closed object shape drops dangerous keys and keeps safe ones', () => {
		assertNoPrototypePollution(() => {
			const parser = compileParser(objectShape({ safe: stringShape() }))
			const parsed = parser(hostilePayload())
			// (c) Legitimate keys still parse; result is exactly the safe subset.
			expect(parsed).toEqual({ safe: 'ok' })
			assertCleanResult(parsed)
		})
	})

	it('open object (additionalProperties: true) drops dangerous keys, keeps safe passthrough', () => {
		assertNoPrototypePollution(() => {
			const parser = compileParser(
				objectShape({ safe: stringShape() }, { additionalProperties: true }),
			)
			const parsed = parser(hostilePayload())
			expect(parsed).toEqual({ safe: 'ok' })
			assertCleanResult(parsed)
		})
	})

	it('additionalProperties: shape drops dangerous keys and validates safe extras', () => {
		assertNoPrototypePollution(() => {
			const parser = compileParser(
				objectShape({ safe: stringShape() }, { additionalProperties: numberShape() }),
			)
			const parsed = parser(
				JSON.parse(
					'{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1},"safe":"ok","extra":7}',
				) as unknown,
			)
			expect(parsed).toEqual({ safe: 'ok', extra: 7 })
			assertCleanResult(parsed)
		})
	})

	it('recordShape dictionary drops dangerous keys and keeps safe entries', () => {
		assertNoPrototypePollution(() => {
			const parser = compileParser(recordShape(numberShape()))
			const parsed = parser(
				JSON.parse('{"__proto__":{"polluted":true},"constructor":{"x":1},"a":1,"b":2}') as unknown,
			)
			expect(parsed).toEqual({ a: 1, b: 2 })
			assertCleanResult(parsed)
		})
	})
})

// === oneOf mode

describe('compileSchema — oneOf mode', () => {
	it('emits anyOf by default', () => {
		const schema = compileSchema(unionShape(stringShape(), numberShape()))
		expect(schema).toHaveProperty('anyOf')
		expect(schema).not.toHaveProperty('oneOf')
	})

	it('emits oneOf when mode is set', () => {
		const schema = compileSchema(oneOfShape(stringShape(), booleanShape()))
		expect(schema).toHaveProperty('oneOf')
		expect(schema).not.toHaveProperty('anyOf')
	})

	it('oneOf contains compiled variant schemas', () => {
		const schema = compileSchema(oneOfShape(stringShape(), booleanShape()))
		expect(schema).toEqual({ oneOf: [{ type: 'string' }, { type: 'boolean' }] })
	})
})

describe('compileGuard — oneOf (runtime behavior same as anyOf)', () => {
	it('accepts a value matching the first variant', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard('hello')).toBe(true)
	})

	it('accepts a value matching the second variant', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard(true)).toBe(true)
	})

	it('rejects a value matching no variant', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard(42)).toBe(false)
	})
})

describe('compileParser — oneOf (runtime behavior same as anyOf)', () => {
	it('parses a value matching a variant', () => {
		const parser = compileParser(oneOfShape(stringShape(), integerShape()))
		expect(parser('hello')).toBe('hello')
		expect(parser(42)).toBe(42)
	})

	it('returns undefined for non-matching value', () => {
		const parser = compileParser(oneOfShape(stringShape(), booleanShape()))
		expect(parser(42)).toBeUndefined()
	})
})

// === rawShape

describe('compileSchema — rawShape', () => {
	it('returns the raw schema as-is', () => {
		const schema = compileSchema(rawShape({ description: 'Any value' }))
		expect(schema).toEqual({ description: 'Any value' })
	})

	it('returns empty object for empty schema', () => {
		const schema = compileSchema(rawShape({}))
		expect(schema).toEqual({})
	})
})

describe('compileGuard — rawShape', () => {
	it('accepts any value', () => {
		const guard = compileGuard(rawShape({}))
		expect(guard('hello')).toBe(true)
		expect(guard(42)).toBe(true)
		expect(guard(null)).toBe(true)
		expect(guard(undefined)).toBe(true)
		expect(guard({ nested: true })).toBe(true)
	})
})

describe('compileParser — rawShape', () => {
	it('passes through any value unchanged', () => {
		const parser = compileParser(rawShape({}))
		const objectValue = { nested: true }
		expect(parser('hello')).toBe('hello')
		expect(parser(42)).toBe(42)
		expect(parser(null)).toBeNull()
		expect(parser(objectValue)).toBe(objectValue)
	})
})

describe('compileGenerator — rawShape', () => {
	it('returns undefined', () => {
		const result = compileGenerator(rawShape({}), createRandom(1))
		expect(result).toBeUndefined()
	})
})

// === object root compatibility

describe('compileSchema — object root compatibility', () => {
	it('returns an object schema with type "object"', () => {
		const schema = compileSchema(objectShape({ id: stringShape() }))
		expect(schema.type).toBe('object')
	})

	it('compiles properties to JSON Schema', () => {
		const schema = compileSchema(
			objectShape({
				name: stringShape({ description: 'User name' }),
				age: optionalShape(integerShape({ min: 0 })),
			}),
		)
		expect(schema.properties?.['name']).toEqual({ type: 'string', description: 'User name' })
		expect(schema.properties?.['age']).toEqual({ type: 'integer', minimum: 0 })
	})

	it('computes required from non-optional properties', () => {
		const schema = compileSchema(
			objectShape({
				name: stringShape(),
				bio: optionalShape(stringShape()),
				age: integerShape(),
			}),
		)
		expect(schema.required).toEqual(['name', 'age'])
	})

	it('omits required for all-optional shapes', () => {
		const schema = compileSchema(
			objectShape({
				a: optionalShape(stringShape()),
				b: optionalShape(numberShape()),
			}),
		)
		expect(schema.required).toBeUndefined()
	})

	it('handles nested object shapes with required fields', () => {
		const schema = compileSchema(
			objectShape({
				budget: optionalShape(
					objectShape({
						max: numberShape(),
						scope: optionalShape(literalShape('completion', 'total')),
					}),
				),
			}),
		)
		expect(schema.properties?.['budget']).toEqual({
			type: 'object',
			properties: {
				max: { type: 'number' },
				scope: { enum: ['completion', 'total'] },
			},
			required: ['max'],
			additionalProperties: false,
		})
	})

	it('handles oneOf unions in properties', () => {
		const schema = compileSchema(
			objectShape({
				forget: optionalShape(oneOfShape(stringShape(), booleanShape())),
			}),
		)
		expect(schema.properties?.['forget']).toEqual({
			oneOf: [{ type: 'string' }, { type: 'boolean' }],
		})
	})

	it('handles recordShape in properties', () => {
		const schema = compileSchema(
			objectShape({
				env: optionalShape(recordShape(stringShape())),
			}),
		)
		expect(schema.properties?.['env']).toEqual({
			type: 'object',
			additionalProperties: { type: 'string' },
		})
	})

	it('handles rawShape in properties', () => {
		const schema = compileSchema(
			objectShape({
				value: optionalShape(rawShape({ description: 'Any value' })),
			}),
		)
		expect(schema.properties?.['value']).toEqual({ description: 'Any value' })
	})

	it('allows compileSchema object results to be used as JsonSchemaObject', () => {
		const schema: JsonSchemaObject = compileSchema(
			objectShape({
				task: stringShape(),
				model: optionalShape(stringShape()),
			}),
		)
		expect(schema.type).toBe('object')
	})
})

