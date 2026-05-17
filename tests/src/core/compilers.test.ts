import { describe, expect, it } from 'vitest'
import type { ContractShape, JsonSchemaObject } from '@elements/core'
import {
	arrayShape,
	booleanShape,
	compileContract,
	compileGenerator,
	compileGuard,
	compileParser,
	compileSchema,
	constShape,
	createRandom,
	defaultShape,
	integerShape,
	intersectionShape,
	isJsonSchema,
	isRecord,
	lazyShape,
	literalShape,
	nullableShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	rawShape,
	recordShape,
	stringShape,
	tupleShape,
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

	// Closed-tuple JSON-Schema encoding (documented): a fixed-length
	// heterogeneous array is `prefixItems` (one schema per position) +
	// `items: false` (no extra elements past the prefix) + `minItems` ===
	// `maxItems` === the tuple length (exact arity). This is the standard
	// JSON-Schema (2020-12) closed-tuple form and mirrors validators' `tupleOf`
	// arity check.
	it('tuple — prefixItems + items:false + exact min/maxItems', () => {
		expect(compileSchema(tupleShape(stringShape(), integerShape()))).toEqual({
			type: 'array',
			prefixItems: [{ type: 'string' }, { type: 'integer' }],
			items: false,
			minItems: 2,
			maxItems: 2,
		})
	})

	it('tuple — empty tuple is the closed [] schema', () => {
		expect(compileSchema(tupleShape())).toEqual({
			type: 'array',
			prefixItems: [],
			items: false,
			minItems: 0,
			maxItems: 0,
		})
	})

	it('tuple — nested element shapes compile recursively', () => {
		expect(
			compileSchema(tupleShape(stringShape({ min: 1 }), tupleShape(booleanShape()))),
		).toEqual({
			type: 'array',
			prefixItems: [
				{ type: 'string', minLength: 1 },
				{ type: 'array', prefixItems: [{ type: 'boolean' }], items: false, minItems: 1, maxItems: 1 },
			],
			items: false,
			minItems: 2,
			maxItems: 2,
		})
	})

	// `intersectionShape` compiles to JSON-Schema `allOf`: one sub-schema per
	// member, every one of which the value must satisfy. This is the schema
	// mirror of validators' `intersectionOf` (value passes iff EVERY member
	// guard passes) and the standard JSON-Schema conjunction encoding.
	it('intersection — allOf of every member sub-schema', () => {
		expect(
			compileSchema(
				intersectionShape(
					objectShape({ a: stringShape() }),
					objectShape({ b: integerShape() }),
				),
			),
		).toEqual({
			allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false },
				{ type: 'object', properties: { b: { type: 'integer' } }, required: ['b'], additionalProperties: false },
			],
		})
	})

	it('intersection — nested member shapes compile recursively', () => {
		expect(
			compileSchema(
				intersectionShape(
					intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: booleanShape() })),
					objectShape({ c: integerShape() }),
				),
			),
		).toEqual({
			allOf: [
				{
					allOf: [
						{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false },
						{ type: 'object', properties: { b: { type: 'boolean' } }, required: ['b'], additionalProperties: false },
					],
				},
				{ type: 'object', properties: { c: { type: 'integer' } }, required: ['c'], additionalProperties: false },
			],
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

	it('tuple — exact arity and positional element guards', () => {
		const guard = compileGuard(tupleShape(stringShape(), integerShape()))
		expect(guard(['a', 1])).toBe(true)
		expect(guard(['a'])).toBe(false) // too short
		expect(guard(['a', 1, 2])).toBe(false) // too long
		expect(guard([1, 'a'])).toBe(false) // positions swapped
		expect(guard(['a', 1.5])).toBe(false) // pos 1 not integer
		expect(guard('not an array')).toBe(false)
	})

	it('tuple — empty tuple matches only the empty array', () => {
		const guard = compileGuard(tupleShape())
		expect(guard([])).toBe(true)
		expect(guard([1])).toBe(false)
		expect(guard('x')).toBe(false)
	})

	// Intersection guard mirrors validators' `intersectionOf`: a value is
	// valid iff it satisfies EVERY member. For object members this means it
	// must carry every member's required keys with each key's value passing
	// that member's property guard — i.e. the conjunction of all members,
	// which for disjoint-key object members is the merged object. A closed
	// object member does NOT reject a sibling member's keys (those are part
	// of the intersection contract, not "unknown").
	it('intersection — value must satisfy every member', () => {
		const guard = compileGuard(
			intersectionShape(
				objectShape({ a: stringShape() }),
				objectShape({ b: integerShape() }),
			),
		)
		expect(guard({ a: 'x', b: 1 })).toBe(true) // satisfies both
		expect(guard({ a: 'x' })).toBe(false) // missing b (2nd member)
		expect(guard({ b: 1 })).toBe(false) // missing a (1st member)
		expect(guard({ a: 'x', b: 'no' })).toBe(false) // b not integer
		expect(guard({ a: 1, b: 1 })).toBe(false) // a not string
		expect(guard('notobj')).toBe(false)
		expect(guard({})).toBe(false)
	})

	it('intersection — three members, overlapping-compatible keys', () => {
		const guard = compileGuard(
			intersectionShape(
				objectShape({ a: stringShape() }),
				objectShape({ b: integerShape() }),
				objectShape({ c: booleanShape() }),
			),
		)
		expect(guard({ a: 'x', b: 1, c: true })).toBe(true)
		expect(guard({ a: 'x', b: 1 })).toBe(false) // missing c
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

	it('tuple — parses each position with that position parser', () => {
		const parse = compileParser(tupleShape(stringShape(), integerShape()))
		expect(parse(['a', '2'])).toEqual(['a', 2]) // pos 1 coerced '2' → 2
		expect(parse(['a', 1])).toEqual(['a', 1])
		expect(parse(['a'])).toBeUndefined() // wrong arity
		expect(parse(['a', 1, 2])).toBeUndefined() // wrong arity
		expect(parse(['a', 'xyz'])).toBeUndefined() // pos 1 unparseable
		expect(parse('not array')).toBeUndefined()
	})

	it('tuple — empty tuple parses only []', () => {
		const parse = compileParser(tupleShape())
		expect(parse([])).toEqual([])
		expect(parse([1])).toBeUndefined()
		expect(parse('x')).toBeUndefined()
	})

	// Intersection parser: parse the value through every member, merge the
	// parsed objects (later members win on key collision — sound because each
	// parsed object is independently guard-valid for its member), then the
	// merged result is re-validated against the intersection guard for clause
	// (C). Per-member coercion (e.g. '30' → 30) is preserved.
	it('intersection — parses through every member and merges', () => {
		const parse = compileParser(
			intersectionShape(
				objectShape({ a: stringShape() }),
				objectShape({ b: integerShape() }),
			),
		)
		expect(parse({ a: 'x', b: '2' })).toEqual({ a: 'x', b: 2 }) // b coerced
		expect(parse({ a: 'x', b: 1 })).toEqual({ a: 'x', b: 1 })
		expect(parse({ a: 'x' })).toBeUndefined() // missing b
		expect(parse({ a: 'x', b: 'no' })).toBeUndefined() // b unparseable
		expect(parse('not object')).toBeUndefined()
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

	it('tupleShape(stringShape(), numberShape()) — arity + positional (A)(B)(C)', () => {
		assertParseGuardSymmetry(tupleShape(stringShape(), numberShape()), [
			['a', 1],
			['', 1],
			['a', 'x'],
			['a'],
			['a', 1, 2],
			'notarray',
			[],
		])
	})

	it('tupleShape() — empty tuple symmetry', () => {
		assertParseGuardSymmetry(tupleShape(), [[], [1], 'x'])
	})

	it('tupleShape nested in object + tuple-of-tuple symmetry', () => {
		assertParseGuardSymmetry(
			objectShape({ pair: tupleShape(stringShape({ min: 1 }), integerShape()) }),
			[{ pair: ['a', 1] }, { pair: ['', 1] }, { pair: ['a'] }, {}],
		)
		assertParseGuardSymmetry(
			tupleShape(tupleShape(stringShape(), integerShape()), booleanShape()),
			[
				[['a', 1], true],
				[['a', 'x'], true],
				[['a', 1], 'no'],
				'notarray',
			],
		)
	})

	it('intersectionShape(objectShape, objectShape) — parse↔guard (A)(B)(C)', () => {
		assertParseGuardSymmetry(
			intersectionShape(
				objectShape({ a: stringShape() }),
				objectShape({ b: integerShape() }),
			),
			[{ a: 'x', b: 1 }, { a: 'x' }, { b: 1 }, { a: 'x', b: 'no' }, 'notobj', {}],
		)
	})

	it('intersectionShape nested + intersection-of-intersection symmetry', () => {
		assertParseGuardSymmetry(
			objectShape({
				pair: intersectionShape(
					objectShape({ a: stringShape({ min: 1 }) }),
					objectShape({ b: integerShape() }),
				),
			}),
			[{ pair: { a: 'x', b: 1 } }, { pair: { a: '', b: 1 } }, { pair: { a: 'x' } }, {}],
		)
		assertParseGuardSymmetry(
			intersectionShape(
				intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: integerShape() })),
				objectShape({ c: booleanShape() }),
			),
			[
				{ a: 'x', b: 1, c: true },
				{ a: 'x', b: 1 },
				{ a: 'x', b: 'no', c: true },
				'notobj',
			],
		)
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

	it('tuple — returns a fixed-length tuple, one generated value per position', () => {
		const shape = tupleShape(stringShape({ min: 1 }), integerShape())
		const value = compileGenerator(shape, createRandom(1))
		expect(Array.isArray(value)).toBe(true)
		if (!Array.isArray(value)) {
			throw new Error('Expected a generated tuple')
		}
		expect(value).toHaveLength(2)
		expect(typeof value[0]).toBe('string')
		expect(Number.isInteger(value[1])).toBe(true)
		expect(compileGuard(shape)(value)).toBe(true)
	})

	it('tuple — empty tuple generates the empty array deterministically', () => {
		const value = compileGenerator(tupleShape(), createRandom(7))
		expect(value).toEqual([])
	})

	it('intersection — generates a merged object satisfying every member', () => {
		const shape = intersectionShape(
			objectShape({ a: stringShape({ min: 1 }) }),
			objectShape({ b: integerShape() }),
		)
		const value = compileGenerator(shape, createRandom(1))
		expect(isRecord(value)).toBe(true)
		if (!isRecord(value)) {
			throw new Error('Expected a generated record')
		}
		expect(typeof value['a']).toBe('string')
		expect(Number.isInteger(value['b'])).toBe(true)
		expect(compileGuard(shape)(value)).toBe(true)
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

	it('tuples incl. nested + empty', () => {
		assertGeneratorSatisfiesGuard(tupleShape(stringShape({ min: 1 }), integerShape()), [1, 2, 3])
		assertGeneratorSatisfiesGuard(
			tupleShape(stringShape(), tupleShape(integerShape(), booleanShape())),
			seeds,
		)
		assertGeneratorSatisfiesGuard(tupleShape(), seeds)
	})

	it('intersections incl. nested object members', () => {
		assertGeneratorSatisfiesGuard(
			intersectionShape(
				objectShape({ a: stringShape({ min: 1 }) }),
				objectShape({ b: integerShape() }),
			),
			seeds,
		)
		assertGeneratorSatisfiesGuard(
			intersectionShape(
				objectShape({ a: stringShape({ min: 1 }), nested: objectShape({ x: integerShape() }) }),
				objectShape({ b: arrayShape(integerShape(), { min: 1, max: 3 }) }),
			),
			seeds,
		)
		assertGeneratorSatisfiesGuard(
			intersectionShape(
				intersectionShape(objectShape({ a: stringShape({ min: 1 }) }), objectShape({ b: integerShape() })),
				objectShape({ c: booleanShape() }),
			),
			seeds,
		)
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

// === D3 — lazyShape (recursive / $ref shapes)
//
// `lazyShape(thunk)` is the SANCTIONED recursion boundary (mirrors validators'
// `lazyOf`; maps to JSON-Schema `$ref`/`$defs`). It is the cycle-BREAKER:
// `assertAcyclicShape` treats a 'lazy' node as a TERMINAL (it never invokes
// the thunk), so a shape recursive THROUGH a lazyShape compiles, while a
// NON-lazy structural cycle still throws the precise B5 Error.

describe('D3 — lazyShape non-recursive (behaves exactly like its inner)', () => {
	it('schema — emits an isJsonSchema-valid $ref + $defs of the resolved inner', () => {
		// D3 schema decision (documented): a lazy node emits a self-contained
		// `{ $ref, $defs }` — the resolved inner schema lives under a
		// deterministic `$defs` name and the node is a `$ref` to it. This is
		// `isJsonSchema`-valid (a `$ref` string + a `$defs` schema map). The
		// full cross-document `$ref`/`$defs` flattening/dedup is the Phase-E
		// seam.
		const schema = compileSchema(lazyShape(() => stringShape()))
		expect(isJsonSchema(schema)).toBe(true)
		if (typeof schema === 'boolean') {
			throw new Error('expected an object schema')
		}
		expect(typeof schema.$ref).toBe('string')
		expect(schema.$defs).toBeDefined()
	})

	it('guard — identical acceptance to the resolved inner shape', () => {
		const lazy = compileGuard(lazyShape(() => stringShape({ min: 1 })))
		const direct = compileGuard(stringShape({ min: 1 }))
		for (const v of ['a', '', 1, null, undefined, 'abc']) {
			expect(lazy(v)).toBe(direct(v))
		}
	})

	it('parser — identical normalization to the resolved inner shape', () => {
		const lazy = compileParser(lazyShape(() => integerShape({ min: 0 })))
		expect(lazy('5')).toBe(5)
		expect(lazy(5)).toBe(5)
		expect(lazy(-1)).toBeUndefined()
		expect(lazy('x')).toBeUndefined()
	})

	it('generator — same guard-valid, deterministic output as the inner', () => {
		const shape = lazyShape(() => integerShape({ min: 0, max: 9 }))
		const a = compileGenerator(shape, createRandom(3))
		const b = compileGenerator(shape, createRandom(3))
		expect(a).toEqual(b)
		expect(compileGuard(shape)(a)).toBe(true)
	})

	it('parse↔guard symmetry — non-recursive lazy is sound (A)(B)(C)', () => {
		assertParseGuardSymmetry(lazyShape(() => stringShape({ min: 1 })), [
			'a',
			'',
			1,
			'abc',
			null,
		])
		assertParseGuardSymmetry(
			objectShape({ n: lazyShape(() => integerShape({ min: 0 })) }),
			[{ n: 1 }, { n: -1 }, { n: 'x' }, {}],
		)
	})

	it('generator∘guard — non-recursive lazy holds across seeds', () => {
		assertGeneratorSatisfiesGuard(lazyShape(() => integerShape({ min: 0, max: 50 })), [
			1, 2, 3, 4,
		])
	})
})

// A recursive tree, defined via the documented named-interface + lazyShape
// consumer pattern. `treeShape` is annotated `ContractShape` so the thunk can
// close over a binding assigned in the SAME statement — the lazy thunk is the
// deferral that legitimately breaks the static cycle.
function makeTreeShape(): ContractShape {
	const treeShape: ContractShape = objectShape({
		value: integerShape({ min: 0 }),
		children: arrayShape(lazyShape(() => treeShape), { max: 3 }),
	})
	return treeShape
}

describe('D3 — recursive-via-lazy COMPILES and works (B5 cycle-breaker)', () => {
	it('all four compilers build without throwing or infinitely recursing', () => {
		const shape = makeTreeShape()
		expect(() => compileSchema(shape)).not.toThrow()
		expect(() => compileGuard(shape)).not.toThrow()
		expect(() => compileParser(shape)).not.toThrow()
		expect(() => compileGenerator(shape, createRandom(1))).not.toThrow()
	})

	it('guard accepts genuinely recursive tree DATA and rejects non-trees', () => {
		const guard = compileGuard(makeTreeShape())
		const leaf = { value: 1, children: [] }
		const deep = {
			value: 0,
			children: [
				{ value: 1, children: [{ value: 2, children: [{ value: 3, children: [] }] }] },
				{ value: 4, children: [] },
			],
		}
		expect(guard(leaf)).toBe(true)
		expect(guard(deep)).toBe(true)
		expect(guard({ value: 'x', children: [] })).toBe(false) // bad value type
		expect(guard({ value: 1 })).toBe(false) // missing required children
		expect(guard({ value: 1, children: [{ value: 'no', children: [] }] })).toBe(false)
		expect(guard('not a tree')).toBe(false)
	})

	it('parser round-trips a deep recursive tree (terminates on finite data)', () => {
		const parse = compileParser(makeTreeShape())
		const tree = {
			value: 0,
			children: [
				{ value: 1, children: [{ value: 2, children: [] }] },
				{ value: 3, children: [] },
			],
		}
		expect(parse(tree)).toEqual(tree)
		expect(parse({ value: '5', children: [] })).toEqual({ value: 5, children: [] }) // coerced
		expect(parse({ value: -1, children: [] })).toBeUndefined()
	})

	it('parse↔guard symmetry over real recursive tree values + non-trees (A)(B)(C)', () => {
		assertParseGuardSymmetry(makeTreeShape(), [
			{ value: 1, children: [] },
			{ value: 0, children: [{ value: 1, children: [{ value: 2, children: [] }] }] },
			{ value: 'x', children: [] },
			{ value: 1 },
			{ value: 1, children: [{ value: 'no', children: [] }] },
			'not a tree',
			42,
		])
	})

	it('generator∘guard — recursive tree terminates, valid, deterministic, variable', () => {
		// The generator MUST terminate (an unbounded recursive lazy could
		// recurse forever): past MAX_LAZY_DEPTH the lazy arm emits the
		// resolved shape's MINIMAL inhabitant (here `children: []`), so the
		// output is finite, still guard-valid, and deterministic.
		assertGeneratorSatisfiesGuard(makeTreeShape(), [1, 2, 3, 4, 5, 6])
	})
})

describe('D3 — B5 reconciliation: non-lazy cycle STILL throws the precise Error', () => {
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

	it('a NON-lazy structural cycle (no lazy boundary) still throws B5', () => {
		// makeCyclicShape() is `shape.properties.self === shape` with NO lazy
		// wrapper — B5 must still fire (lazyShape is the ONLY sanctioned
		// recursion boundary).
		expectPreciseCyclicError(() => compileSchema(makeCyclicShape()))
		expectPreciseCyclicError(() => compileGuard(makeCyclicShape()))
		expectPreciseCyclicError(() => compileParser(makeCyclicShape()))
		expectPreciseCyclicError(() => compileGenerator(makeCyclicShape(), createRandom(1)))
	})

	it('a NON-lazy cycle through an array element still throws B5', () => {
		const makeCyclicArrayShape = (): ContractShape => {
			const properties: Record<string, ContractShape> = { name: stringShape({ min: 1 }) }
			const shape = objectShape(properties)
			properties['self'] = arrayShape(shape)
			return shape
		}
		expectPreciseCyclicError(() => compileGuard(makeCyclicArrayShape()))
	})

	it('the SAME structure but with a lazy boundary compiles (cycle broken)', () => {
		// Identical recursive intent, only difference: the back-edge goes
		// through a lazyShape. This is the precise B5-reconciliation proof —
		// the lazy node is the cycle-breaker, the non-lazy variant above
		// throws, this one must NOT.
		expect(() => compileGuard(makeTreeShape())).not.toThrow()
	})
})

describe('D3 — the no-finite-inhabitant case (documented termination contract)', () => {
	it('a required-recursive lazy with NO base case throws a precise §13 Error', () => {
		// `objectShape({ self: lazyShape(() => sameShape) })` — a REQUIRED,
		// non-optional recursive child with no finite inhabitant. The
		// generator must STILL terminate: it throws a precise Error rather
		// than silently violating generator∘guard or recursing forever.
		const makeInfiniteShape = (): ContractShape => {
			const shape: ContractShape = objectShape({
				self: lazyShape(() => shape),
			})
			return shape
		}
		let caught: unknown
		try {
			compileGenerator(makeInfiniteShape(), createRandom(1))
		} catch (error) {
			caught = error
		}
		expect(caught).toBeInstanceOf(Error)
		expect(caught).not.toBeInstanceOf(RangeError)
		if (!(caught instanceof Error)) {
			throw new Error('expected an Error to be thrown')
		}
		expect(caught.message).toContain('no finite inhabitant')
		// Schema / guard / parser do NOT need a finite inhabitant — only the
		// generator does — so they must still compile fine.
		expect(() => compileGuard(makeInfiniteShape())).not.toThrow()
		expect(() => compileSchema(makeInfiniteShape())).not.toThrow()
	})
})

// === D4 — constShape (JSON-Schema `const`)
//
// `constShape(value)` is a single fixed JSON value. Documented equality rule:
// JSON-Schema `const` is a STRUCTURAL value match — primitives compared by
// `Object.is` (so `NaN` === `NaN`, `+0` ≠ `-0`, aligned with validators'
// `literalOf`), arrays/objects compared by recursive structural deep-equality
// with `Object.is` leaf semantics. The parser returns the CANONICAL value (a
// fresh deep copy for non-primitives, so a shared mutable reference is never
// handed out — aligns with the codebase's parser copy policy). The generator
// deterministically emits that same canonical value (also a fresh copy).

describe('D4 — constShape (JSON-Schema const)', () => {
	it('schema — emits { const: value } and is isJsonSchema-valid', () => {
		expect(compileSchema(constShape('x'))).toEqual({ const: 'x' })
		expect(compileSchema(constShape(42))).toEqual({ const: 42 })
		expect(compileSchema(constShape(null))).toEqual({ const: null })
		const objSchema = compileSchema(constShape({ a: 1, b: ['y'] }))
		expect(objSchema).toEqual({ const: { a: 1, b: ['y'] } })
		expect(isJsonSchema(objSchema)).toBe(true)
		expect(isJsonSchema(compileSchema(constShape('x')))).toBe(true)
	})

	it('guard — primitive equality is Object.is (NaN===NaN, +0 ≠ -0)', () => {
		const isFortyTwo = compileGuard(constShape(42))
		expect(isFortyTwo(42)).toBe(true)
		expect(isFortyTwo(43)).toBe(false)
		expect(isFortyTwo('42')).toBe(false)

		// Object.is alignment with literalOf: NaN matches NaN.
		const isNan = compileGuard(constShape(Number.NaN))
		expect(isNan(Number.NaN)).toBe(true)
		expect(isNan(0)).toBe(false)

		// Object.is: +0 and -0 are DISTINCT consts.
		const isNegZero = compileGuard(constShape(-0))
		expect(isNegZero(-0)).toBe(true)
		expect(isNegZero(0)).toBe(false)
		const isPosZero = compileGuard(constShape(0))
		expect(isPosZero(0)).toBe(true)
		expect(isPosZero(-0)).toBe(false)

		const isNull = compileGuard(constShape(null))
		expect(isNull(null)).toBe(true)
		expect(isNull(undefined)).toBe(false)
	})

	it('guard — object / array const is a STRUCTURAL deep-equal match', () => {
		const guard = compileGuard(constShape({ a: 1, b: [2, 3] }))
		expect(guard({ a: 1, b: [2, 3] })).toBe(true) // structurally equal
		expect(guard({ b: [2, 3], a: 1 })).toBe(true) // key order irrelevant
		expect(guard({ a: 1, b: [2, 4] })).toBe(false) // nested element differs
		expect(guard({ a: 1 })).toBe(false) // missing key
		expect(guard({ a: 1, b: [2, 3], c: 9 })).toBe(false) // extra key
		expect(guard([1, 2])).toBe(false)
		expect(guard(null)).toBe(false)

		const arrGuard = compileGuard(constShape([1, { x: true }]))
		expect(arrGuard([1, { x: true }])).toBe(true)
		expect(arrGuard([1, { x: false }])).toBe(false)
		expect(arrGuard([1, { x: true }, 2])).toBe(false) // length differs
	})

	it('parser — returns the canonical value (fresh copy for non-primitives)', () => {
		const original = { a: 1, nested: { b: [2] } }
		const parse = compileParser(constShape(original))
		const out = parse({ a: 1, nested: { b: [2] } })
		expect(out).toEqual(original)
		// Must NOT hand out the builder's own reference (no shared mutable
		// alias) — defensive deep copy, aligns with the C3 copy policy.
		expect(out).not.toBe(original)
		if (!isRecord(out) || !isRecord(out['nested'])) {
			throw new Error('expected a record output with a nested record')
		}
		const outNested: unknown = out['nested']
		expect(outNested).not.toBe(original.nested) // nested copy too (deep)
		// Mutating the parser output must not corrupt a later parse.
		out['a'] = 999
		expect(parse({ a: 1, nested: { b: [2] } })).toEqual(original)
	})

	it('parser — non-matching input → undefined; primitive const aliases', () => {
		const parse = compileParser(constShape('x'))
		expect(parse('x')).toBe('x')
		expect(parse('y')).toBeUndefined()
		expect(parse(1)).toBeUndefined()
	})

	it('generator — deterministically the canonical value (fresh copy)', () => {
		const shape = constShape({ a: 1, list: [1, 2] })
		const a = compileGenerator(shape, createRandom(1))
		const b = compileGenerator(shape, createRandom(2))
		expect(a).toEqual({ a: 1, list: [1, 2] })
		expect(b).toEqual({ a: 1, list: [1, 2] }) // deterministic / constant
		expect(a).not.toBe(b) // distinct fresh copies (no shared alias)
	})

	it('parse↔guard symmetry (A)(B)(C) — primitive + object/array const', () => {
		assertParseGuardSymmetry(constShape(42), [42, 43, '42', null, Number.NaN])
		assertParseGuardSymmetry(constShape(Number.NaN), [Number.NaN, 0, 'NaN', null])
		assertParseGuardSymmetry(constShape(-0), [-0, 0, '0'])
		assertParseGuardSymmetry(constShape({ a: 1, b: [2] }), [
			{ a: 1, b: [2] },
			{ b: [2], a: 1 },
			{ a: 1, b: [3] },
			{ a: 1 },
			null,
			'x',
			42,
		])
		assertParseGuardSymmetry(constShape([1, 'two', true]), [
			[1, 'two', true],
			[1, 'two', false],
			[1, 'two'],
			'nope',
		])
	})

	it('generator∘guard (A)(B)(C) — constant-output const is sound', () => {
		assertGeneratorSatisfiesGuard(constShape('only'), [1, 2, 3])
		assertGeneratorSatisfiesGuard(constShape({ a: 1, b: [2, 3] }), [1, 2, 3, 4])
	})

	it('composes inside an object (a fixed discriminant field)', () => {
		const shape = objectShape({
			kind: constShape('user'),
			name: stringShape({ min: 1 }),
		})
		const guard = compileGuard(shape)
		expect(guard({ kind: 'user', name: 'Ada' })).toBe(true)
		expect(guard({ kind: 'admin', name: 'Ada' })).toBe(false)
		assertParseGuardSymmetry(shape, [
			{ kind: 'user', name: 'Ada' },
			{ kind: 'admin', name: 'Ada' },
			{ kind: 'user', name: '' },
		])
	})
})

// === D4 — defaultShape (JSON-Schema `default`)
//
// `defaultShape(inner, value)` is inner + an advisory `default`. Documented
// contracts:
//  * §13 build-validation — the default MUST satisfy `compileGuard(inner)` or
//    the builder throws (a default that fails its own inner is programmer
//    error; this keeps generator∘guard / parse↔guard sound by construction).
//  * GUARD = inner's guard exactly. The default is advisory metadata; the
//    guard does NOT accept `undefined` just because a default exists.
//  * PARSER applies the default on ABSENCE: parser(undefined) = the default
//    (a fresh deep copy for non-primitives); any other input parses through
//    inner. This is a DELIBERATE, useful asymmetry (like optionalShape's
//    undefined handling): guard(undefined) is inner.guard(undefined) (false
//    unless inner is optional) yet parser(undefined) = default. (A)(B)(C)
//    still hold: the default is build-validated guard-valid, so any parser
//    output (default OR parsed-inner) is guard-valid; the symmetry helper's
//    bare-`undefined` sample is exercised only where inner accepts it.
//  * GENERATOR generates from inner (variability — the default is just one
//    valid instance), not the fixed default.
//  * Infer<DefaultShape> = Infer<inner> (default does not change the type).

describe('D4 — defaultShape (JSON-Schema default)', () => {
	it('schema — inner schema + default keyword, isJsonSchema-valid', () => {
		expect(compileSchema(defaultShape(stringShape(), 'd'))).toEqual({
			type: 'string',
			default: 'd',
		})
		const numSchema = compileSchema(
			defaultShape(integerShape({ min: 0, max: 9 }), 5),
		)
		expect(numSchema).toEqual({ type: 'integer', minimum: 0, maximum: 9, default: 5 })
		expect(isJsonSchema(numSchema)).toBe(true)
		// Inner object schema gains `default` at its root.
		const objSchema = compileSchema(
			defaultShape(objectShape({ a: stringShape() }), { a: 'z' }),
		)
		expect(isJsonSchema(objSchema)).toBe(true)
		if (typeof objSchema === 'boolean') {
			throw new Error('expected object schema')
		}
		expect(objSchema.type).toBe('object')
		expect(objSchema.default).toEqual({ a: 'z' })
	})

	it('guard — delegates verbatim to the inner guard (no undefined accept)', () => {
		const direct = compileGuard(integerShape({ min: 0 }))
		const withDefault = compileGuard(defaultShape(integerShape({ min: 0 }), 7))
		for (const v of [0, 5, -1, '5', undefined, null, Number.NaN]) {
			expect(withDefault(v)).toBe(direct(v))
		}
		// Explicitly: the guard does NOT accept undefined just because a
		// default exists (default is advisory metadata, not optionality).
		expect(withDefault(undefined)).toBe(false)
	})

	it('parser — applies the default on absence (undefined → default)', () => {
		const parse = compileParser(defaultShape(integerShape({ min: 0 }), 7))
		expect(parse(undefined)).toBe(7) // default applied
		expect(parse(3)).toBe(3) // parses through inner
		expect(parse('3')).toBe(3) // inner coercion still works
		expect(parse(-1)).toBeUndefined() // inner rejects → undefined
		expect(parse('nope')).toBeUndefined()
	})

	it('parser — default object is a fresh deep copy (no shared alias)', () => {
		const dflt = { a: 1, nested: { b: [2] } }
		const parse = compileParser(defaultShape(objectShape({ a: integerShape() }, {
			additionalProperties: true,
		}), dflt))
		const out = parse(undefined)
		expect(out).toEqual(dflt)
		expect(out).not.toBe(dflt) // defensive copy
		if (isRecord(out)) {
			out['a'] = 999
		}
		expect(parse(undefined)).toEqual(dflt) // later parse uncorrupted
	})

	it('generator — generates from INNER (varies; not the fixed default)', () => {
		const shape = defaultShape(integerShape({ min: 0, max: 1_000_000 }), 7)
		const guard = compileGuard(shape)
		const a = compileGenerator(shape, createRandom(1))
		const b = compileGenerator(shape, createRandom(2))
		expect(guard(a)).toBe(true)
		expect(guard(b)).toBe(true)
		// Deterministic per seed.
		expect(compileGenerator(shape, createRandom(1))).toEqual(a)
	})

	it('parse↔guard symmetry (A)(B)(C) over non-undefined samples', () => {
		// The bare-`undefined` sample is intentionally NOT included here: it is
		// the documented parse-applies-default / guard-is-inner asymmetry
		// (guard(undefined)=false, parser(undefined)=default). The helper's
		// (A)(B)(C) clauses still hold for every OTHER input, and (C) holds for
		// the default too because it is §13 build-validated guard-valid.
		assertParseGuardSymmetry(defaultShape(integerShape({ min: 0 }), 7), [
			0,
			5,
			-1,
			'5',
			'nope',
			null,
		])
		assertParseGuardSymmetry(
			defaultShape(stringShape({ min: 1 }), 'fallback'),
			['a', '', 1, 'abc', null],
		)
		// (C) explicitly: parser(undefined) = default, and the default passes
		// the (inner == this) guard.
		const shape = defaultShape(integerShape({ min: 0 }), 7)
		const parsedDefault = compileParser(shape)(undefined)
		expect(compileGuard(shape)(parsedDefault)).toBe(true)
	})

	it('generator∘guard (A)(B)(C) — inner-driven generation is sound', () => {
		assertGeneratorSatisfiesGuard(
			defaultShape(integerShape({ min: 0, max: 50 }), 7),
			[1, 2, 3, 4],
		)
		assertGeneratorSatisfiesGuard(
			defaultShape(objectShape({ n: integerShape({ min: 0, max: 9 }) }), { n: 0 }),
			[1, 2, 3, 4],
		)
	})

	it('composes inside an object (optional-like default field at parse)', () => {
		// At the object level a defaultShape property is REQUIRED by the guard
		// (Infer = Infer<inner>, not optional) but the parser fills it from the
		// default when the key is absent.
		const shape = objectShape({
			name: stringShape({ min: 1 }),
			retries: defaultShape(integerShape({ min: 0 }), 3),
		})
		const guard = compileGuard(shape)
		expect(guard({ name: 'Ada', retries: 5 })).toBe(true)
		expect(guard({ name: 'Ada' })).toBe(false) // guard does NOT auto-default
		const parse = compileParser(shape)
		expect(parse({ name: 'Ada' })).toEqual({ name: 'Ada', retries: 3 })
		expect(parse({ name: 'Ada', retries: 9 })).toEqual({ name: 'Ada', retries: 9 })
	})
})

// === D4 — const/default interaction with B5 acyclicity (assertAcyclicShape)
//
// `const` is a TERMINAL for the acyclicity walk (like literal/raw — no child
// shape). `default` RECURSES into its `inner` (like optional/nullable), so a
// NON-lazy structural cycle THROUGH a defaultShape still throws the precise
// B5 §13 Error, while a lazy boundary inside the default's inner still breaks
// the cycle and compiles.

describe('D4 — const/default × assertAcyclicShape (B5)', () => {
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

	it('const is a terminal — compiles fine, no spurious cycle', () => {
		expect(() => compileSchema(constShape({ a: 1 }))).not.toThrow()
		expect(() => compileGuard(constShape({ a: 1 }))).not.toThrow()
	})

	it('a NON-lazy structural cycle THROUGH a defaultShape still throws B5', () => {
		// `default`'s `inner` is traversed for cycle detection like other
		// wrapper kinds: an object whose `self` property is a defaultShape
		// wrapping the object itself is a genuine non-lazy back-edge.
		const makeCyclicDefaultShape = (): ContractShape => {
			const properties: Record<string, ContractShape> = {
				name: stringShape({ min: 1 }),
			}
			const shape = objectShape(properties)
			properties['self'] = defaultShape(shape, { name: 'x' })
			return shape
		}
		expectPreciseCyclicError(() => compileSchema(makeCyclicDefaultShape()))
		expectPreciseCyclicError(() => compileGuard(makeCyclicDefaultShape()))
		expectPreciseCyclicError(() => compileParser(makeCyclicDefaultShape()))
		expectPreciseCyclicError(() =>
			compileGenerator(makeCyclicDefaultShape(), createRandom(1)),
		)
	})

	it('the SAME recursion but with a lazy boundary inside default compiles', () => {
		// Identical recursive intent, only difference: the back-edge goes
		// through a lazyShape nested in the default's inner. The lazy node is
		// the cycle-breaker, so this compiles where the non-lazy variant
		// throws. The default `[]` validates against `arrayShape(lazy)`
		// WITHOUT resolving the recursion (an empty array never iterates the
		// element shape), so §13 build-validation succeeds and does not force
		// premature lazy resolution of the not-yet-assigned binding.
		const makeLazyDefaultTree = (): ContractShape => {
			const treeShape: ContractShape = objectShape({
				value: integerShape({ min: 0 }),
				children: defaultShape(arrayShape(lazyShape(() => treeShape)), []),
			})
			return treeShape
		}
		expect(() => compileGuard(makeLazyDefaultTree())).not.toThrow()
		expect(() => compileSchema(makeLazyDefaultTree())).not.toThrow()
		const guard = compileGuard(makeLazyDefaultTree())
		// `children` is a required `default(array(...))` (inner not optional),
		// so the guard requires it; absence is NOT auto-defaulted (guard ==
		// inner's). The parser, by contrast, applies the `[]` default.
		expect(guard({ value: 1, children: [{ value: 2, children: [] }] })).toBe(true)
		expect(guard({ value: 1, children: [] })).toBe(true)
		expect(guard({ value: 1 })).toBe(false) // guard does NOT auto-default
		const parse = compileParser(makeLazyDefaultTree())
		expect(parse({ value: 1 })).toEqual({ value: 1, children: [] }) // default applied
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

	it('a tuple of a self-referential shape throws the precise cyclic Error', () => {
		// Build a structural cycle through a tuple position: an object whose
		// `self` property is a tuple containing the object itself. Each
		// compiler must detect the back-edge through the tuple arm of
		// assertAcyclicShape and fail fast with the precise Error, never a
		// RangeError.
		const makeCyclicTupleShape = (): ContractShape => {
			const properties: Record<string, ContractShape> = {
				name: stringShape({ min: 1 }),
			}
			const shape = objectShape(properties)
			properties['self'] = tupleShape(shape)
			return shape
		}
		expectPreciseCyclicError(() => compileSchema(makeCyclicTupleShape()))
		expectPreciseCyclicError(() => compileGuard(makeCyclicTupleShape()))
		expectPreciseCyclicError(() => compileParser(makeCyclicTupleShape()))
		expectPreciseCyclicError(() => compileGenerator(makeCyclicTupleShape(), createRandom(1)))
	})

	it('an intersection of a self-referential shape throws the precise cyclic Error', () => {
		// Build a structural cycle through an intersection member: an object
		// whose `self` property is an intersection containing the object
		// itself. Each compiler must detect the back-edge through the
		// intersection arm of assertAcyclicShape and fail fast with the
		// precise Error, never a RangeError.
		const makeCyclicIntersectionShape = (): ContractShape => {
			const properties: Record<string, ContractShape> = {
				name: stringShape({ min: 1 }),
			}
			const shape = objectShape(properties)
			properties['self'] = intersectionShape(shape)
			return shape
		}
		expectPreciseCyclicError(() => compileSchema(makeCyclicIntersectionShape()))
		expectPreciseCyclicError(() => compileGuard(makeCyclicIntersectionShape()))
		expectPreciseCyclicError(() => compileParser(makeCyclicIntersectionShape()))
		expectPreciseCyclicError(() =>
			compileGenerator(makeCyclicIntersectionShape(), createRandom(1)),
		)
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

// === createRandom (F1) — Mulberry32 PRNG
//
// Implementation (helpers.ts): `let state = seed >>> 0` — the seed is coerced
// to an unsigned 32-bit integer via `>>> 0` before use. Returns a closure that
// advances the Mulberry32 state on every call and yields a float in [0, 1).

describe('createRandom — Mulberry32 PRNG', () => {
	it('same seed produces an identical sequence (determinism)', () => {
		const n = 20
		const a = createRandom(42)
		const b = createRandom(42)
		const seqA = Array.from({ length: n }, () => a())
		const seqB = Array.from({ length: n }, () => b())
		expect(seqA).toEqual(seqB)
	})

	it('different seeds produce different sequences', () => {
		const n = 10
		const a = createRandom(1)
		const b = createRandom(2)
		const seqA = Array.from({ length: n }, () => a())
		const seqB = Array.from({ length: n }, () => b())
		expect(seqA).not.toEqual(seqB)
	})

	it('every draw is in [0, 1)', () => {
		const rng = createRandom(7)
		for (let i = 0; i < 10000; i += 1) {
			const v = rng()
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(1)
		}
	})

	it('seed 0 — deterministic and in [0, 1)', () => {
		const rng = createRandom(0)
		const v = rng()
		expect(v).toBeGreaterThanOrEqual(0)
		expect(v).toBeLessThan(1)
		// Second seeded instance yields the same first draw.
		expect(createRandom(0)()).toBe(v)
	})

	it('negative seed — coerced via >>>0 (e.g. -1 → 4294967295), still deterministic', () => {
		// -1 >>> 0 === 4294967295: a valid unsigned 32-bit seed.
		const rng1 = createRandom(-1)
		const rng2 = createRandom(-1)
		const v = rng1()
		expect(v).toBeGreaterThanOrEqual(0)
		expect(v).toBeLessThan(1)
		expect(rng2()).toBe(v)
		// Different from seed 4294967295 explicitly — same bit pattern.
		expect(createRandom(4294967295)()).toBe(v)
	})

	it('float seed — coerced via >>>0 (e.g. 1.5 → 1), matches integer seed 1', () => {
		// 1.5 >>> 0 === 1: the fractional part is discarded.
		const floatDraw = createRandom(1.5)()
		const intDraw = createRandom(1)()
		expect(floatDraw).toBe(intDraw)
	})

	it('seed 2**32 — wraps to 0 via >>>0 (same as seed 0)', () => {
		// 2**32 >>> 0 === 0 (overflows the 32-bit range).
		expect(createRandom(2 ** 32)()).toBe(createRandom(0)())
	})

	it('seed 2**32 + 1 — wraps to 1 via >>>0 (same as seed 1)', () => {
		// (2**32 + 1) >>> 0 === 1.
		expect(createRandom(2 ** 32 + 1)()).toBe(createRandom(1)())
	})

	it('two independent instances from the same seed advance independently', () => {
		// Advancing instance A must not affect instance B's sequence.
		const a = createRandom(7)
		const b = createRandom(7)
		const a0 = a()
		const b0 = b()
		expect(a0).toBe(b0) // same first draw
		// Advance A two more steps.
		a()
		a()
		// B's next draw should equal fresh-seeded step 2 (not A's step 4).
		const b1 = b()
		const ref = createRandom(7)
		ref() // skip step 1
		expect(b1).toBe(ref()) // B at step 2 == fresh step 2
	})

	it('no global state leakage between instances with different seeds', () => {
		// Drawing from one instance must not alter another instance's sequence.
		const a = createRandom(100)
		const b = createRandom(200)
		// Exhaust A.
		for (let i = 0; i < 50; i += 1) {
			a()
		}
		// B should still produce its normal seed-200 sequence.
		const bDraw = b()
		const bFresh = createRandom(200)()
		expect(bDraw).toBe(bFresh)
	})

	it('sequence length stability — 1000 draws stay in [0, 1)', () => {
		const rng = createRandom(42)
		const draws = Array.from({ length: 1000 }, () => rng())
		for (const v of draws) {
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(1)
		}
	})
})

// === compileContract (F1) — the four-operation bundle
//
// Implementation (compilers.ts): `compileContract(shape)` eagerly computes
// `schema` (via `compileSchema`), a guard (via `compileGuard`), and a parser
// (via `compileParser`) once at call time and stores them on the returned
// object. `generate` calls `compileGenerator(shape, random)` on each
// invocation. `.schema` is a plain property — the same reference on every
// access.

describe('compileContract — four-operation bundle', () => {
	// Representative composite shape used across most sub-tests.
	const makeShape = () =>
		objectShape({
			name: stringShape({ min: 1 }),
			age: integerShape({ min: 0 }),
			role: literalShape('a', 'b'),
			bio: optionalShape(stringShape()),
		})

	it('.schema deep-equals compileSchema(shape)', () => {
		const shape = makeShape()
		const contract = compileContract(shape)
		expect(contract.schema).toEqual(compileSchema(shape))
	})

	it('.schema is a stable reference — same object on every access', () => {
		const contract = compileContract(makeShape())
		// schema is stored as a plain property — accesses return the same ref.
		expect(contract.schema).toBe(contract.schema)
	})

	it('.is(x) agrees with compileGuard(shape) on a valid input', () => {
		const shape = makeShape()
		const contract = compileContract(shape)
		const guard = compileGuard(shape)
		const valid = { name: 'Ada', age: 30, role: 'a' }
		expect(contract.is(valid)).toBe(true)
		expect(contract.is(valid)).toBe(guard(valid))
	})

	it('.is(x) agrees with compileGuard(shape) on invalid inputs', () => {
		const shape = makeShape()
		const contract = compileContract(shape)
		const guard = compileGuard(shape)
		for (const invalid of [
			{ name: '', age: 30, role: 'a' },
			{ name: 'Ada', age: -1, role: 'a' },
			{ name: 'Ada', age: 30, role: 'c' },
			{ name: 'Ada', age: 30 },
			null,
			42,
			'string',
		]) {
			expect(contract.is(invalid)).toBe(guard(invalid))
		}
	})

	it('.parse(x) agrees with compileParser(shape) on coercible input', () => {
		const shape = makeShape()
		const contract = compileContract(shape)
		const parser = compileParser(shape)
		const raw = { name: '  Ada  ', age: '30', role: 'b' }
		expect(contract.parse(raw)).toEqual(parser(raw))
		expect(contract.parse(raw)).toEqual({ name: 'Ada', age: 30, role: 'b' })
	})

	it('.parse(x) returns undefined when parsing fails', () => {
		const contract = compileContract(makeShape())
		expect(contract.parse({ name: '', age: 30, role: 'a' })).toBeUndefined()
		expect(contract.parse(null)).toBeUndefined()
	})

	it('.parse↔.is soundness — every non-undefined parse result satisfies .is', () => {
		// Use assertParseGuardSymmetry (A)(B)(C): clause (C) is exactly that whenever
		// parse(x) is defined the guard accepts it. Avoids a conditional expect.
		assertParseGuardSymmetry(makeShape(), [
			{ name: 'Ada', age: 30, role: 'a' },
			{ name: '  Bob  ', age: '25', role: 'b', bio: '  hi  ' },
			{ name: '', age: 30, role: 'a' },
			{ name: 'Ada', age: -1, role: 'a' },
			null,
		])
	})

	it('.generate(createRandom(n)) is deterministic for the same seed', () => {
		const contract = compileContract(makeShape())
		const a = contract.generate(createRandom(42))
		const b = contract.generate(createRandom(42))
		expect(a).toEqual(b)
	})

	it('.generate output satisfies .is (generator∘guard)', () => {
		const contract = compileContract(makeShape())
		for (const seed of [1, 2, 3, 7, 42, 99]) {
			const value = contract.generate(createRandom(seed))
			expect(contract.is(value)).toBe(true)
		}
	})

	it('.generate with two different seeds produces different values (variability)', () => {
		const contract = compileContract(makeShape())
		const a = contract.generate(createRandom(1))
		const b = contract.generate(createRandom(999))
		expect(a).not.toEqual(b)
	})

	it('four-operation coherence — schema/is/parse/generate all agree on the same shape', () => {
		const shape = makeShape()
		const contract = compileContract(shape)
		const standaloneGuard = compileGuard(shape)

		const generated = contract.generate(createRandom(7))
		expect(contract.is(generated)).toBe(true)
		expect(standaloneGuard(generated)).toBe(true)
		expect(contract.schema).toEqual(compileSchema(shape))

		const parsed = contract.parse({ name: 'Ada', age: '5', role: 'a' })
		expect(parsed).toEqual({ name: 'Ada', age: 5, role: 'a' })
		expect(contract.is({ name: 'Ada', age: 5, role: 'a' })).toBe(true)
	})

	it('primitive-root shape — compileContract(stringShape())', () => {
		const contract = compileContract(stringShape())
		expect(contract.schema).toEqual({ type: 'string' })
		expect(contract.is('hello')).toBe(true)
		expect(contract.is(42)).toBe(false)
		const parsed = contract.parse('  hi  ')
		expect(parsed).toBe('hi')
		expect(contract.is('hi')).toBe(true)
		const gen = contract.generate(createRandom(1))
		expect(contract.is(gen)).toBe(true)
	})

	it('recursive lazyShape-based shape — compiles, four operations work, generate is finite', () => {
		// A recursive tree shape via lazyShape (the documented recursion mechanism).
		const treeShape: ContractShape = objectShape({
			value: integerShape({ min: 0 }),
			children: arrayShape(lazyShape(() => treeShape), { max: 3 }),
		})
		const contract = compileContract(treeShape)

		// Schema is valid JSON Schema.
		expect(isJsonSchema(contract.schema)).toBe(true)

		// Guard accepts a finite tree, rejects invalid.
		const leaf = { value: 1, children: [] }
		expect(contract.is(leaf)).toBe(true)
		expect(contract.is({ value: 0, children: [leaf] })).toBe(true)
		expect(contract.is({ value: -1, children: [] })).toBe(false)

		// Parse round-trips a valid tree.
		expect(contract.parse({ value: '3', children: [] })).toEqual({ value: 3, children: [] })

		// Generate terminates, output satisfies the guard, and is deterministic.
		const gen = contract.generate(createRandom(5))
		expect(contract.is(gen)).toBe(true)
		expect(contract.generate(createRandom(5))).toEqual(gen)
	})

	it('assertParseGuardSymmetry holds via compileGuard/compileParser for representative shape', () => {
		// The canonical (A)(B)(C) soundness helper exercises the same
		// contracts that .is and .parse must satisfy internally.
		assertParseGuardSymmetry(makeShape(), [
			{ name: 'Ada', age: 30, role: 'a' },
			{ name: '  Ada  ', age: '30', role: 'b' },
			{ name: '', age: 30, role: 'a' },
			{ name: 'Ada', age: -1, role: 'a' },
			{ name: 'Ada', age: 30, role: 'c' },
			null,
			42,
		])
	})

	it('assertGeneratorSatisfiesGuard holds for the representative shape', () => {
		assertGeneratorSatisfiesGuard(makeShape(), [1, 2, 3, 7, 42])
	})
})

// === F2 — compileSchema edge cases

describe('compileSchema — F2 string min-only / max-only edges', () => {
	it('string — min-only emits minLength, no maxLength', () => {
		const schema = compileSchema(stringShape({ min: 3 }))
		expect(schema).toEqual({ type: 'string', minLength: 3 })
		expect(schema).not.toHaveProperty('maxLength')
	})

	it('string — max-only emits maxLength, no minLength', () => {
		const schema = compileSchema(stringShape({ max: 20 }))
		expect(schema).toEqual({ type: 'string', maxLength: 20 })
		expect(schema).not.toHaveProperty('minLength')
	})

	it('object — explicit additionalProperties:false emits additionalProperties:false', () => {
		// Explicit false behaves the same as the default (omitted), but the
		// compiled schema must emit the key in either case (the existing tests
		// confirm the default emits it; here we confirm explicit false does too).
		const schema = compileSchema(objectShape({ id: stringShape() }, { additionalProperties: false }))
		expect(schema).toHaveProperty('additionalProperties', false)
	})
})

// === F2 — compileGuard numeric edge cases

describe('compileGuard — F2 number NaN / ±0 edges', () => {
	it('number guard rejects NaN (NaN is not finite)', () => {
		const guard = compileGuard(numberShape())
		expect(guard(NaN)).toBe(false)
	})

	it('number guard accepts +0', () => {
		const guard = compileGuard(numberShape())
		expect(guard(+0)).toBe(true)
	})

	it('number guard accepts -0 (negative zero is finite)', () => {
		const guard = compileGuard(numberShape())
		expect(guard(-0)).toBe(true)
	})

	it('number guard with min:0 accepts -0 (Object.is(-0, -0) and -0 >= 0 is false — pin real)', () => {
		// -0 >= 0 is true in JS (same as +0 >= 0). So the min:0 constraint passes
		// for -0. Pin this behavior.
		const guard = compileGuard(numberShape({ min: 0 }))
		// -0 >= 0 is true in IEEE 754 JS comparison
		expect(guard(-0)).toBe(true)
	})
})

// === F2 — compileGuard global-flag regex statelessness

describe('compileGuard — F2 global-flag regex pattern statelessness', () => {
	it('string guard with /a/g pattern does not accumulate regex lastIndex across calls', () => {
		// A global-flag regex (/g) maintains `lastIndex` state between exec() / test()
		// calls on the SAME regex instance. If the compiled guard shares the pattern
		// object reference and calls `.test()` directly, a second call on a matching
		// string would start from the updated lastIndex and may falsely return false.
		// compileSchema converts RegExp to string source; compileGuard creates its
		// own new RegExp from the source, so the original pattern's lastIndex is
		// irrelevant. Pin: calling the guard twice on the same matching string
		// must return true both times (no stale lastIndex).
		const guard = compileGuard(stringShape({ pattern: /a/g }))
		expect(guard('ba')).toBe(true)
		expect(guard('ba')).toBe(true) // must not be affected by prior call
		expect(guard('ba')).toBe(true)
	})
})