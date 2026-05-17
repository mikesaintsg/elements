import { describe, expect, it } from 'vitest'
import type { ContractShape, JsonSchemaObject } from '@elements/core'
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
import {
	POLLUTION_KEYS,
	assertGeneratorSatisfiesGuard,
	assertNoPrototypePollution,
	assertParseGuardSymmetry,
	createNestedShape,
	createOneOfShape,
	createPersonShape,
	createRecordDictShape,
	createUnionShape,
	makeCyclicShape,
} from './_helpers.js'

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
	it('string — trims, accepts guard-valid empties, coerces numbers', () => {
		// Corrected from the prior unsound expectations (parse('') →
		// undefined, parse('   ') → undefined, parse(42) → undefined). Those
		// asserted the OLD behaviour where the COMPILED string parser
		// delegated to the opinionated standalone `parseString` (trims,
		// rejects ''), which VIOLATED parse↔guard soundness:
		// `compileGuard(stringShape())('')` is true, so by clause (A) the
		// parser MUST accept '' (and '   ' normalizes to the guard-valid '').
		// Number coercion (42 → '42') preserves the documented coerce-string
		// intent and '42' passes the unconstrained string guard, so (C)
		// holds. The standalone `parseString` export is unchanged.
		const parse = compileParser(stringShape())
		expect(parse('  hello  ')).toBe('hello')
		expect(parse('')).toBe('')
		expect(parse('   ')).toBe('')
		expect(parse(42)).toBe('42')
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

// === parse↔guard symmetry

describe('parse↔guard symmetry', () => {
	it('stringShape() — unconstrained, including empty + whitespace-padded', () => {
		assertParseGuardSymmetry(stringShape(), ['', '  hi  ', 'abc', 'a'.repeat(1000)])
	})

	it('stringShape({ min: 4 })', () => {
		assertParseGuardSymmetry(stringShape({ min: 4 }), ['  hi  ', 'abcd', 'abcdef', ''])
	})

	it('stringShape({ min: 5 })', () => {
		assertParseGuardSymmetry(stringShape({ min: 5 }), ['ab', 'abcde'])
	})

	it('stringShape({ max: 3 })', () => {
		assertParseGuardSymmetry(stringShape({ max: 3 }), ['abcd', 'abc'])
	})

	it('stringShape({ pattern })', () => {
		assertParseGuardSymmetry(stringShape({ pattern: /^[a-z]+$/ }), ['abc', 'AB', '  ab  '])
	})

	it('literalShape(a, b)', () => {
		assertParseGuardSymmetry(literalShape('a', 'b'), ['a', '  a  ', 'b', 'c'])
	})

	it('numberShape()', () => {
		assertParseGuardSymmetry(numberShape(), [5, '5', -1, 'x', 5.5])
	})

	it('numberShape({ min: 0, max: 10 })', () => {
		assertParseGuardSymmetry(numberShape({ min: 0, max: 10 }), [5, '5', -1, 'x', 5.5])
	})

	it('integerShape()', () => {
		assertParseGuardSymmetry(integerShape(), [3, '3', 3.5, '3.0'])
	})

	it('booleanShape()', () => {
		assertParseGuardSymmetry(booleanShape(), [true, false, 'true', '0', 1, 'yes'])
	})

	it('objectShape({ s: stringShape() }) — empty-string field survives', () => {
		assertParseGuardSymmetry(objectShape({ s: stringShape() }), [{ s: '' }, { s: 'x' }])
	})

	it('objectShape with additionalProperties — open object passthrough', () => {
		assertParseGuardSymmetry(
			objectShape({ name: stringShape({ min: 1 }) }, { additionalProperties: true }),
			[{ name: 'ok', extra: 'kept' }, { name: '' }],
		)
	})

	it('arrayShape(stringShape()) — empty-string elements survive', () => {
		assertParseGuardSymmetry(arrayShape(stringShape()), [['', 'a'], [], 'not array'])
	})

	it('optionalShape(stringShape()) at object level', () => {
		assertParseGuardSymmetry(
			objectShape({ s: optionalShape(stringShape()) }),
			[{ s: '' }, { s: 'x' }, {}],
		)
	})

	it('nullableShape(numberShape()) at object level', () => {
		assertParseGuardSymmetry(
			objectShape({ n: nullableShape(numberShape()) }),
			[{ n: null }, { n: 5 }, { n: '5' }, { n: 'x' }],
		)
	})

	it('unionShape(stringShape({min:1}), integerShape())', () => {
		assertParseGuardSymmetry(unionShape(stringShape({ min: 1 }), integerShape()), [
			'',
			'hello',
			5,
			'5',
			5.5,
			true,
		])
	})

	it('rawShape — identity', () => {
		assertParseGuardSymmetry(rawShape({}), ['x', 42, null, { a: 1 }])
	})
})

// === compileGenerator

describe('compileGenerator', () => {
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

	// B4 fix 4 — corrected. The OLD test asserted the empty-literal guard
	// lived in `compileGenerator`. Per §13 (programmer error throws at the
	// boundary where the shape is BUILT) + §20 (no dead code), that throw is
	// deleted from the generator and the contract is enforced in
	// `literalShape()` itself. An empty `{ type: 'literal', values: [] }` is
	// only constructible by hand-bypassing the builder — itself programmer
	// error — so the generator no longer special-cases it; the boundary is
	// the builder, asserted here.
	it('literalShape() throws at build for empty values (boundary moved from generator)', () => {
		expect(() => literalShape()).toThrow('literalShape requires at least one value')
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

// B4 fix 1 — `oneOf` is JSON-Schema EXACTLY-ONE, not anyOf first-match.
// These describe blocks were renamed + their bodies corrected from the OLD
// "runtime behavior same as anyOf" contract. Old assertions that happened to
// only ever match one variant still hold; the new tests pin the exclusivity
// behaviour the old contract silently violated.
describe('compileGuard — oneOf (exactly one variant must match)', () => {
	it('accepts a value matching the first variant only', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard('hello')).toBe(true)
	})

	it('accepts a value matching the second variant only', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard(true)).toBe(true)
	})

	it('rejects a value matching no variant', () => {
		const guard = compileGuard(oneOfShape(stringShape(), booleanShape()))
		expect(guard(42)).toBe(false)
	})

	it('rejects a value matching MORE THAN ONE variant (exclusivity)', () => {
		// '' satisfies BOTH an unconstrained string AND a literal('') —
		// exactly-two matches → oneOf guard is false.
		const guard = compileGuard(oneOfShape(stringShape(), literalShape('')))
		expect(guard('')).toBe(false)
		// 5 satisfies BOTH numberShape and integerShape → two matches.
		const numGuard = compileGuard(oneOfShape(numberShape(), integerShape()))
		expect(numGuard(5)).toBe(false)
		// A value matching exactly one of the two still passes.
		expect(numGuard(5.5)).toBe(true)
	})

	it('diverges from anyOf: same multi-match value — anyOf true, oneOf false', () => {
		// The single most important contrast: identical variants, identical
		// value; anyOf (unionShape) accepts (≥1), oneOf rejects (not ==1).
		const value = ''
		expect(compileGuard(unionShape(stringShape(), literalShape('')))(value)).toBe(true)
		expect(compileGuard(oneOfShape(stringShape(), literalShape('')))(value)).toBe(false)
		// And a single-match value agrees across both modes.
		expect(compileGuard(unionShape(stringShape(), literalShape('')))('x')).toBe(true)
		expect(compileGuard(oneOfShape(stringShape(), literalShape('')))('x')).toBe(true)
		// A no-match value: both false.
		expect(compileGuard(unionShape(stringShape(), literalShape('')))(42)).toBe(false)
		expect(compileGuard(oneOfShape(stringShape(), literalShape('')))(42)).toBe(false)
	})
})

describe('compileParser — oneOf (parse succeeds only if exactly one variant matches)', () => {
	it('parses a value matching exactly one variant', () => {
		// Variant order: integerShape() first so the numeric input resolves
		// to the integer variant. (Corrected from `oneOfShape(stringShape(),
		// integerShape())` expecting `parser(42) === 42`: the sound compiled
		// string parser now coerces 42 → '42' — '42' passes the string guard.
		// Ordering the integer variant first preserves the test's intent.)
		const parser = compileParser(oneOfShape(integerShape(), stringShape()))
		expect(parser('hello')).toBe('hello')
		expect(parser(42)).toBe(42)
	})

	it('returns undefined for non-matching value', () => {
		// A plain object is neither boolean-coercible nor string-coercible by
		// any primitive parser → no variant produces a guard-valid result.
		const parser = compileParser(oneOfShape(stringShape(), booleanShape()))
		expect(parser({ not: 'a primitive' })).toBeUndefined()
	})

	it('returns undefined when MORE THAN ONE variant parses to a guard-valid result (tie → exclusivity violated)', () => {
		// Documented tie behaviour: if the parsed-and-revalidated result is
		// guard-valid under ≥2 variants, exclusivity is violated, so the
		// oneOf parser returns `undefined` (it never silently picks one).
		// 5 parses to a guard-valid value under BOTH numberShape and
		// integerShape → tie → undefined.
		const parser = compileParser(oneOfShape(numberShape(), integerShape()))
		expect(parser(5)).toBeUndefined()
		// 5.5 parses guard-valid under numberShape only (integer rejects) →
		// exactly one → parses successfully.
		expect(parser(5.5)).toBe(5.5)
	})
})

describe('parse↔guard symmetry — oneOf exclusivity (B4)', () => {
	it('createOneOfShape() stays sound under exactly-one semantics', () => {
		// createOneOfShape() = oneOf(stringShape({min:1}), integerShape({min:0})).
		// No value matches both a non-empty string and a non-negative integer,
		// so exactly-one == any-match here; symmetry must still hold.
		assertParseGuardSymmetry(createOneOfShape(), ['', 'hello', 5, '5', -1, 5.5, true])
	})

	it('multi-match oneOf — guard accepts iff exactly one, parser returns iff guard accepts', () => {
		// numberShape | integerShape: integers match BOTH (tie → reject),
		// non-integer finite numbers match exactly one (accept).
		assertParseGuardSymmetry(oneOfShape(numberShape(), integerShape()), [
			5, // both → guard false, parser undefined
			5.5, // number only → guard true, parser 5.5
			-3, // both (integer) → guard false
			-3.25, // number only → guard true
			'x', // none
			true, // none
		])
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
	// B4 fix 2 — corrected from `expect(result).toBeUndefined()`. That OLD
	// expectation asserted unsound behaviour: a required `rawShape` object
	// property generating `undefined` collapses to `{}` structurally, which
	// violates the object's `required` contract AND the (always-true) raw
	// guard contract under assertGeneratorSatisfiesGuard. The raw generator
	// now emits a deterministic, JSON-valid placeholder (`null`).
	it('returns a deterministic JSON-valid placeholder (null), never undefined', () => {
		const result = compileGenerator(rawShape({}), createRandom(1))
		expect(result).not.toBeUndefined()
		expect(result).toBeNull()
		// Determinism: same seed → same output.
		expect(compileGenerator(rawShape({}), createRandom(1))).toBe(result)
	})

	it('bare rawShape() generator output is guard-valid', () => {
		// The raw guard is always true, so any DEFINED JSON value satisfies
		// it. Pinning the generator∘guard contract for the bare shape.
		assertGeneratorSatisfiesGuard(rawShape({}), [1, 2, 3])
	})

	it('a required rawShape object property generates a present, guard-valid value', () => {
		// The headline regression: `{ r: rawShape() }` previously generated
		// `{ r: undefined }` ≡ `{}` — failing the object guard's `required`.
		assertGeneratorSatisfiesGuard(objectShape({ r: rawShape({}) }), [1, 2, 3])
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

// === B4 broad soundness matrix
//
// After all four B4 fixes, every shape kind's generator output must satisfy
// its own guard, and parse↔guard symmetry must hold for oneOf + raw. This
// matrix is the regression net the task requires.

describe('B4 — assertGeneratorSatisfiesGuard across the full shape matrix', () => {
	const seeds = [1, 2, 3, 7, 42, 99]

	it('primitives + bounded primitives', () => {
		assertGeneratorSatisfiesGuard(stringShape(), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ min: 5 }), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ min: 3, max: 8 }), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ min: 4, max: 4 }), seeds)
		// Short windows that are <= the `str_` (4-char) prefix: the generator
		// must count the prefix toward total length or `max` is violated.
		assertGeneratorSatisfiesGuard(stringShape({ max: 2 }), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ min: 2, max: 2 }), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ max: 4 }), seeds)
		assertGeneratorSatisfiesGuard(stringShape({ min: 1, max: 3 }), seeds)
		assertGeneratorSatisfiesGuard(numberShape({ min: 10, max: 20 }), seeds)
		assertGeneratorSatisfiesGuard(numberShape({ min: -10, max: -5 }), seeds)
		assertGeneratorSatisfiesGuard(integerShape({ min: 1, max: 10 }), seeds)
		assertGeneratorSatisfiesGuard(booleanShape(), seeds)
		assertGeneratorSatisfiesGuard(literalShape('a', 'b', 'c'), seeds)
	})

	it('arrays incl. min === max and bounded', () => {
		assertGeneratorSatisfiesGuard(arrayShape(stringShape({ min: 1 })), seeds)
		assertGeneratorSatisfiesGuard(arrayShape(integerShape(), { min: 2, max: 2 }), seeds)
		assertGeneratorSatisfiesGuard(arrayShape(stringShape(), { min: 0, max: 0 }), seeds)
		assertGeneratorSatisfiesGuard(arrayShape(numberShape(), { min: 1, max: 4 }), seeds)
	})

	it('optional / nullable wrappers', () => {
		assertGeneratorSatisfiesGuard(objectShape({ s: optionalShape(stringShape({ min: 1 })) }), seeds)
		assertGeneratorSatisfiesGuard(nullableShape(integerShape({ min: 0 })), seeds)
		assertGeneratorSatisfiesGuard(objectShape({ n: nullableShape(numberShape()) }), seeds)
	})

	it('objects, nested, record-dict, person/nested fixtures', () => {
		assertGeneratorSatisfiesGuard(createPersonShape(), seeds)
		assertGeneratorSatisfiesGuard(createNestedShape(), seeds)
		assertGeneratorSatisfiesGuard(createRecordDictShape(), seeds)
	})

	it('object containing a required rawShape (B4 fix 2 regression)', () => {
		assertGeneratorSatisfiesGuard(
			objectShape({
				r: rawShape({}),
				name: stringShape({ min: 1 }),
				tags: arrayShape(stringShape({ min: 1 }), { min: 1, max: 3 }),
			}),
			seeds,
		)
	})

	it('unions and oneOf (B4 fix 1: generator output is exactly-one-valid)', () => {
		assertGeneratorSatisfiesGuard(createUnionShape(), seeds)
		// createOneOfShape() = oneOf(string{min:1}, integer{min:0}) — disjoint
		// variants, so any generated variant value matches exactly one.
		assertGeneratorSatisfiesGuard(createOneOfShape(), seeds)
	})
})

describe('B4 — assertParseGuardSymmetry on oneOf + raw', () => {
	it('createOneOfShape() — disjoint exactly-one stays sound', () => {
		assertParseGuardSymmetry(createOneOfShape(), ['', 'hello', 0, 5, '5', -1, 5.5, true, null])
	})

	it('multi-match oneOf — symmetry under tie→undefined', () => {
		assertParseGuardSymmetry(oneOfShape(numberShape(), integerShape()), [5, 5.5, -3, -3.25, 'x'])
	})

	it('rawShape — identity stays sound', () => {
		assertParseGuardSymmetry(rawShape({}), ['x', 42, null, { a: 1 }, [1, 2], true])
	})
})

// === §13 — cyclic ContractShape compile guard
//
// `compile*` recurse over the shape tree at COMPILE time. A self-referential
// `ContractShape` (constructible via makeCyclicShape — `shape.properties.self
// === shape`) infinitely recursed → `RangeError`. Contract chosen: a cyclic
// shape built WITHOUT a lazy/deferred wrapper is PROGRAMMER ERROR (§13 row 1 —
// invalid argument). `lazyShape` does not exist until Phase D, so for now a
// cyclic shape is malformed input and the compiler must FAIL FAST with a
// precise `Error` that names the problem and points at the fix — NOT recurse
// to a `RangeError`, and NOT silently emit a broken compiled function.

describe('§13 — cyclic ContractShape fails fast at compile (precise Error, not RangeError)', () => {
	const expectedMessage = 'cyclic ContractShape: use a lazy/deferred shape for recursion'

	function expectPreciseCyclicError(run: () => void): void {
		let caught: unknown
		try {
			run()
		} catch (error) {
			caught = error
		}
		expect(caught).toBeInstanceOf(Error)
		expect(caught).not.toBeInstanceOf(RangeError)
		if (!(caught instanceof Error)) {
			throw new Error('expected an Error to be thrown')
		}
		expect(caught.message).toContain(expectedMessage)
	}

	it('compileSchema throws a precise Error (not RangeError) on a cyclic shape', () => {
		expectPreciseCyclicError(() => compileSchema(makeCyclicShape()))
	})

	it('compileGuard throws a precise Error (not RangeError) on a cyclic shape', () => {
		expectPreciseCyclicError(() => compileGuard(makeCyclicShape()))
	})

	it('compileParser throws a precise Error (not RangeError) on a cyclic shape', () => {
		expectPreciseCyclicError(() => compileParser(makeCyclicShape()))
	})

	it('compileGenerator throws a precise Error (not RangeError) on a cyclic shape', () => {
		expectPreciseCyclicError(() => compileGenerator(makeCyclicShape(), createRandom(1)))
	})

	it('a shared-but-acyclic sub-shape reused in two object keys is NOT a cycle', () => {
		// The same child shape object referenced from two sibling properties is
		// a DAG, not a cycle — compilation must succeed and the guard work.
		const child = stringShape({ min: 1 })
		const shape = objectShape({ a: child, b: child })
		const guard = compileGuard(shape)
		expect(guard({ a: 'x', b: 'y' })).toBe(true)
		expect(guard({ a: '', b: 'y' })).toBe(false)
		expect(() => compileSchema(shape)).not.toThrow()
	})
})

