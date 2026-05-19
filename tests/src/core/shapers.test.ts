import { describe, expect, it } from 'vitest'
import {
	arrayShape,
	booleanShape,
	constShape,
	defaultShape,
	integerShape,
	intersectionShape,
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
import type { ContractShape } from '@elements/core'

// === stringShape

describe('stringShape', () => {
	it('produces a shape with type string', () => {
		const shape = stringShape()
		expect(shape.type).toBe('string')
	})

	it('leaves all options undefined when omitted', () => {
		const shape = stringShape()
		expect(shape.min).toBeUndefined()
		expect(shape.max).toBeUndefined()
		expect(shape.pattern).toBeUndefined()
		expect(shape.description).toBeUndefined()
	})

	it('forwards min and max', () => {
		const shape = stringShape({ min: 1, max: 100 })
		expect(shape.min).toBe(1)
		expect(shape.max).toBe(100)
	})

	it('forwards pattern as a RegExp', () => {
		const pattern = /^[a-z]+$/
		const shape = stringShape({ pattern })
		expect(shape.pattern).toBe(pattern)
	})

	it('forwards description', () => {
		const shape = stringShape({ description: 'Full name' })
		expect(shape.description).toBe('Full name')
	})

	it('forwards all options together', () => {
		const pattern = /^\S+$/
		const shape = stringShape({ min: 2, max: 50, pattern, description: 'Username' })
		expect(shape).toEqual({
			type: 'string',
			min: 2,
			max: 50,
			pattern,
			description: 'Username',
		})
	})

	// B4 fix 3 — shape-build bounds validation (AGENTS.md §13: a programmer
	// error throws at the boundary where the shape is built, not deep in a
	// compiler). Inverted/non-finite/negative-length bounds previously slipped
	// through and produced guard-failing generator output + parser/guard
	// disagreement.
	it('throws when min > max (inverted bounds)', () => {
		expect(() => stringShape({ min: 5, max: 2 })).toThrow(
			'stringShape: min (5) must not exceed max (2)',
		)
	})

	it('throws when min is non-finite', () => {
		expect(() => stringShape({ min: Infinity })).toThrow('stringShape: min must be a finite number')
	})

	it('throws when max is non-finite (NaN)', () => {
		expect(() => stringShape({ max: NaN })).toThrow('stringShape: max must be a finite number')
	})

	it('throws when length min is negative', () => {
		// String length can never be negative — a negative `min` is a
		// programmer error, not a satisfiable-but-vacuous constraint.
		expect(() => stringShape({ min: -1 })).toThrow('stringShape: min (-1) must not be negative')
	})

	it('does not throw for valid bounds (min <= max, min === max allowed)', () => {
		expect(() => stringShape({ min: 2, max: 5 })).not.toThrow()
		expect(() => stringShape({ min: 3, max: 3 })).not.toThrow()
		expect(() => stringShape({ min: 0 })).not.toThrow()
		expect(() => stringShape()).not.toThrow()
	})
})

// === numberShape

describe('numberShape', () => {
	it('produces a shape with type number', () => {
		expect(numberShape().type).toBe('number')
	})

	it('leaves all options undefined when omitted', () => {
		const shape = numberShape()
		expect(shape.min).toBeUndefined()
		expect(shape.max).toBeUndefined()
		expect(shape.integer).toBeUndefined()
		expect(shape.description).toBeUndefined()
	})

	it('forwards min, max, integer, description', () => {
		const shape = numberShape({ min: -10, max: 10, integer: false, description: 'Score' })
		expect(shape.min).toBe(-10)
		expect(shape.max).toBe(10)
		expect(shape.integer).toBe(false)
		expect(shape.description).toBe('Score')
	})

	it('allows integer: true', () => {
		const shape = numberShape({ integer: true })
		expect(shape.integer).toBe(true)
	})

	// B4 fix 3 — bounds validation at build (§13).
	it('throws when min > max (inverted bounds)', () => {
		expect(() => numberShape({ min: 10, max: 0 })).toThrow(
			'numberShape: min (10) must not exceed max (0)',
		)
	})

	it('throws when min is non-finite', () => {
		expect(() => numberShape({ min: Infinity })).toThrow('numberShape: min must be a finite number')
	})

	it('throws when max is non-finite (NaN)', () => {
		expect(() => numberShape({ max: NaN })).toThrow('numberShape: max must be a finite number')
	})

	it('does not throw for valid numeric bounds incl. negative (numbers may be negative)', () => {
		// Unlike string/array LENGTH, a numeric VALUE bound may legitimately
		// be negative — only inverted/non-finite is a programmer error.
		expect(() => numberShape({ min: -10, max: 10 })).not.toThrow()
		expect(() => numberShape({ min: 5, max: 5 })).not.toThrow()
		expect(() => numberShape()).not.toThrow()
	})
})

// === integerShape

describe('integerShape', () => {
	it('produces a number shape with integer forced true', () => {
		const shape = integerShape()
		expect(shape.type).toBe('number')
		expect(shape.integer).toBe(true)
	})

	it('forwards min and max', () => {
		const shape = integerShape({ min: 0, max: 255 })
		expect(shape.min).toBe(0)
		expect(shape.max).toBe(255)
	})

	it('forwards description', () => {
		const shape = integerShape({ description: 'Age' })
		expect(shape.description).toBe('Age')
	})

	it('does not accept an integer option (compile-time only)', () => {
		// integerShape signature uses Omit<NumberShapeOptions, 'integer'>
		// so the integer field is always true
		const shape = integerShape()
		expect(shape.integer).toBe(true)
	})

	// B4 fix 3 — bounds validation at build (§13).
	it('throws when min > max (inverted bounds)', () => {
		expect(() => integerShape({ min: 10, max: 0 })).toThrow(
			'integerShape: min (10) must not exceed max (0)',
		)
	})

	it('throws when a bound is non-finite', () => {
		expect(() => integerShape({ min: Infinity })).toThrow(
			'integerShape: min must be a finite number',
		)
		expect(() => integerShape({ max: NaN })).toThrow('integerShape: max must be a finite number')
	})

	it('does not throw for valid bounds incl. negative', () => {
		expect(() => integerShape({ min: -5, max: 5 })).not.toThrow()
		expect(() => integerShape({ min: 3, max: 3 })).not.toThrow()
	})
})

// === booleanShape

describe('booleanShape', () => {
	it('produces a shape with type boolean', () => {
		expect(booleanShape().type).toBe('boolean')
	})

	it('leaves description undefined when omitted', () => {
		expect(booleanShape().description).toBeUndefined()
	})

	it('forwards description', () => {
		expect(booleanShape({ description: 'Active flag' }).description).toBe('Active flag')
	})
})

// === literalShape

describe('literalShape', () => {
	it('produces a shape with type literal', () => {
		const shape = literalShape('a')
		expect(shape.type).toBe('literal')
	})

	it('captures string values', () => {
		const shape = literalShape('admin', 'member', 'guest')
		expect(shape.values).toEqual(['admin', 'member', 'guest'])
	})

	it('captures number values', () => {
		const shape = literalShape(0, 1, 2)
		expect(shape.values).toEqual([0, 1, 2])
	})

	it('captures boolean values', () => {
		const shape = literalShape(true, false)
		expect(shape.values).toEqual([true, false])
	})

	it('captures mixed primitive values', () => {
		const shape = literalShape('on', 1, true)
		expect(shape.values).toEqual(['on', 1, true])
	})

	it('preserves const tuple for type inference', () => {
		const shape = literalShape('x', 'y', 'z')
		// The values array should be the exact readonly tuple
		expect(shape.values.length).toBe(3)
		expect(shape.values[0]).toBe('x')
		expect(shape.values[1]).toBe('y')
		expect(shape.values[2]).toBe('z')
	})

	// B4 fix 4 — an empty literal is uninhabited (no value can ever satisfy
	// it): a programmer error caught at build (§13), not deep in the
	// generator.
	it('throws when called with zero values', () => {
		expect(() => literalShape()).toThrow('literalShape requires at least one value')
	})

	it('does not throw with at least one value', () => {
		expect(() => literalShape('only')).not.toThrow()
	})
})

// === arrayShape

describe('arrayShape', () => {
	it('produces a shape with type array', () => {
		const shape = arrayShape(stringShape())
		expect(shape.type).toBe('array')
	})

	it('stores the items shape', () => {
		const items = integerShape()
		const shape = arrayShape(items)
		expect(shape.items).toBe(items)
	})

	it('leaves options undefined when omitted', () => {
		const shape = arrayShape(stringShape())
		expect(shape.min).toBeUndefined()
		expect(shape.max).toBeUndefined()
		expect(shape.description).toBeUndefined()
	})

	it('forwards min, max, description', () => {
		const shape = arrayShape(stringShape(), { min: 1, max: 10, description: 'Tags' })
		expect(shape.min).toBe(1)
		expect(shape.max).toBe(10)
		expect(shape.description).toBe('Tags')
	})

	it('accepts nested array shapes', () => {
		const inner = arrayShape(integerShape())
		const outer = arrayShape(inner)
		expect(outer.items.type).toBe('array')
	})

	// B4 fix 3 — bounds validation at build (§13).
	it('throws when min > max (inverted bounds)', () => {
		expect(() => arrayShape(stringShape(), { min: 3, max: 1 })).toThrow(
			'arrayShape: min (3) must not exceed max (1)',
		)
	})

	it('throws when a length bound is non-finite', () => {
		expect(() => arrayShape(stringShape(), { min: Infinity })).toThrow(
			'arrayShape: min must be a finite number',
		)
		expect(() => arrayShape(stringShape(), { max: NaN })).toThrow(
			'arrayShape: max must be a finite number',
		)
	})

	it('throws when length min is negative', () => {
		// Array length can never be negative — programmer error.
		expect(() => arrayShape(stringShape(), { min: -1 })).toThrow(
			'arrayShape: min (-1) must not be negative',
		)
	})

	it('does not throw for valid bounds (min === max allowed)', () => {
		expect(() => arrayShape(stringShape(), { min: 1, max: 3 })).not.toThrow()
		expect(() => arrayShape(stringShape(), { min: 2, max: 2 })).not.toThrow()
		expect(() => arrayShape(stringShape())).not.toThrow()
	})
})

// === tupleShape

describe('tupleShape', () => {
	it('produces a shape with type tuple', () => {
		const shape = tupleShape(stringShape(), integerShape())
		expect(shape.type).toBe('tuple')
	})

	it('stores the positional item shapes in order', () => {
		const s = stringShape()
		const n = integerShape()
		const shape = tupleShape(s, n)
		expect(shape.items).toHaveLength(2)
		expect(shape.items[0]).toBe(s)
		expect(shape.items[1]).toBe(n)
	})

	it('captures heterogeneous element types', () => {
		const shape = tupleShape(stringShape(), integerShape(), booleanShape())
		expect(shape.items).toHaveLength(3)
		expect(shape.items[0]?.type).toBe('string')
		expect(shape.items[1]?.type).toBe('number')
		expect(shape.items[2]?.type).toBe('boolean')
	})

	it('leaves description undefined when omitted', () => {
		const shape = tupleShape(stringShape())
		expect(shape.description).toBeUndefined()
	})

	it('accepts nested tuple shapes', () => {
		const inner = tupleShape(integerShape(), integerShape())
		const outer = tupleShape(stringShape(), inner)
		expect(outer.items[1]?.type).toBe('tuple')
	})

	// Empty-tuple decision (documented): an empty `tupleShape()` is the valid,
	// useful JSON-Schema closed tuple matching ONLY `[]` (`prefixItems: []`,
	// `items: false`, `minItems: 0`, `maxItems: 0`). Unlike an empty literal /
	// union (uninhabited → throw at build per §13), the empty tuple IS
	// inhabited (by `[]`), so it is allowed, not a programmer error.
	it('allows an empty tuple (the [] type) — does not throw', () => {
		expect(() => tupleShape()).not.toThrow()
		const shape = tupleShape()
		expect(shape.type).toBe('tuple')
		expect(shape.items).toHaveLength(0)
	})
})

// === intersectionShape

describe('intersectionShape', () => {
	it('produces a shape with type intersection', () => {
		const shape = intersectionShape(
			objectShape({ a: stringShape() }),
			objectShape({ b: integerShape() }),
		)
		expect(shape.type).toBe('intersection')
	})

	it('stores the member shapes in order', () => {
		const a = objectShape({ a: stringShape() })
		const b = objectShape({ b: integerShape() })
		const shape = intersectionShape(a, b)
		expect(shape.members).toHaveLength(2)
		expect(shape.members[0]).toBe(a)
		expect(shape.members[1]).toBe(b)
	})

	it('accepts more than two object members', () => {
		const shape = intersectionShape(
			objectShape({ a: stringShape() }),
			objectShape({ b: integerShape() }),
			objectShape({ c: booleanShape() }),
		)
		expect(shape.members).toHaveLength(3)
		expect(shape.members[0]?.type).toBe('object')
		expect(shape.members[2]?.type).toBe('object')
	})

	it('leaves description undefined when omitted', () => {
		const shape = intersectionShape(objectShape({ a: stringShape() }))
		expect(shape.description).toBeUndefined()
	})

	it('accepts nested object intersections', () => {
		const inner = intersectionShape(
			objectShape({ a: stringShape() }),
			objectShape({ b: integerShape() }),
		)
		const outer = intersectionShape(inner, objectShape({ c: booleanShape() }))
		expect(outer.members[0]?.type).toBe('intersection')
	})

	// §13 build-time constraint (documented): `intersectionShape` is only
	// well-defined for OBJECT shapes. Intersecting primitives/arrays is
	// degenerate (`string & number` = never; `[] & [string]` uninhabited) and
	// has no sound generator/parser merge. So every member MUST be an object
	// shape (objectShape / recordShape) — a non-object member is a programmer
	// error caught at the build boundary (§13), mirroring B4-style boundary
	// validation, never a silent unsoundness downstream.
	it('throws when called with no members (§13 — uninhabited)', () => {
		expect(() => intersectionShape()).toThrow('intersectionShape requires at least one member')
	})

	it('throws when a member is a non-object shape (§13)', () => {
		expect(() => intersectionShape(stringShape())).toThrow(
			'intersectionShape members must be object shapes',
		)
		expect(() => intersectionShape(objectShape({ a: stringShape() }), stringShape())).toThrow(
			'intersectionShape members must be object shapes',
		)
		expect(() => intersectionShape(tupleShape(stringShape()))).toThrow(
			'intersectionShape members must be object shapes',
		)
		expect(() => intersectionShape(unionShape(objectShape({ a: stringShape() })))).toThrow(
			'intersectionShape members must be object shapes',
		)
	})

	it('accepts recordShape members (open objects are object shapes)', () => {
		expect(() =>
			intersectionShape(objectShape({ a: stringShape() }), recordShape(integerShape())),
		).not.toThrow()
	})
})

// === lazyShape

describe('lazyShape', () => {
	it('produces a shape with type lazy', () => {
		const shape = lazyShape(() => stringShape())
		expect(shape.type).toBe('lazy')
	})

	it('stores the thunk and does NOT invoke it at build time', () => {
		// The thunk is the deferral boundary: a self-referential consumer
		// assigns the target AFTER the lazyShape call (mirrors validators'
		// lazyOf), so the builder must NOT call the thunk eagerly or a
		// recursive shape would be unconstructible.
		let calls = 0
		const shape = lazyShape(() => {
			calls += 1
			return stringShape()
		})
		expect(calls).toBe(0)
		expect(typeof shape.thunk).toBe('function')
		// Invoking it manually resolves the inner shape.
		expect(shape.thunk().type).toBe('string')
		expect(calls).toBe(1)
	})

	it('invokes the thunk per call (not cached at the builder) — mirrors lazyOf', () => {
		let calls = 0
		const shape = lazyShape(() => {
			calls += 1
			return integerShape()
		})
		shape.thunk()
		shape.thunk()
		expect(calls).toBe(2)
	})

	it('supports the recommended self-referential consumer pattern', () => {
		// The documented named-interface + lazyShape pattern: a tree whose
		// children are an array of the tree itself. The cycle is broken by
		// the lazy thunk, so the builder call itself must not throw or recurse.
		expect(() => {
			const treeShape: ContractShape = objectShape({
				value: numberShape(),
				children: arrayShape(lazyShape(() => treeShape)),
			})
			return treeShape
		}).not.toThrow()
	})

	it('leaves the lazy node free of a description (deferral-only node)', () => {
		const shape = lazyShape(() => stringShape())
		// A lazy node carries only its thunk — annotations belong on the
		// resolved inner shape, not the deferral wrapper.
		expect('description' in shape).toBe(false)
	})
})

// === constShape

describe('constShape', () => {
	it('produces a shape with type const and stores the value', () => {
		const shape = constShape('x')
		expect(shape.type).toBe('const')
		expect(shape.value).toBe('x')
	})

	it('accepts every JSON primitive value verbatim (incl. null, NaN, -0)', () => {
		expect(constShape(42).value).toBe(42)
		expect(constShape(true).value).toBe(true)
		expect(constShape(null).value).toBeNull()
		expect(Number.isNaN(constShape(Number.NaN).value)).toBe(true)
		expect(Object.is(constShape(-0).value, -0)).toBe(true)
	})

	it('stores an object / array const value (structural const)', () => {
		const obj = { a: 1, b: ['x'] }
		const shape = constShape(obj)
		// The builder preserves the supplied value reference (the parser/
		// generator are responsible for handing out fresh copies, not the
		// builder — alias-vs-copy policy is a compile-time concern).
		expect(shape.value).toBe(obj)
	})

	it('does not throw for any JSON value (a const is always inhabited)', () => {
		expect(() => constShape('')).not.toThrow()
		expect(() => constShape(0)).not.toThrow()
		expect(() => constShape(false)).not.toThrow()
		expect(() => constShape([])).not.toThrow()
		expect(() => constShape({})).not.toThrow()
	})
})

// === defaultShape

describe('defaultShape', () => {
	it('produces a shape with type default wrapping the inner + value', () => {
		const inner = stringShape()
		const shape = defaultShape(inner, 'd')
		expect(shape.type).toBe('default')
		expect(shape.inner).toBe(inner)
		expect(shape.value).toBe('d')
	})

	it('§13 — throws at build when the default fails the inner guard', () => {
		// A default that does not satisfy its own inner is programmer error
		// caught at the build boundary (AGENTS.md §13), so the
		// generator∘guard / parse↔guard contracts stay sound by construction.
		expect(() => defaultShape(integerShape({ min: 0 }), -1)).toThrow(/default/i)
		expect(() => defaultShape(stringShape({ min: 1 }), '')).toThrow(/default/i)
		expect(() => defaultShape(booleanShape(), 'nope')).toThrow(/default/i)
	})

	it('§13 — accepts a default that DOES satisfy the inner guard', () => {
		expect(() => defaultShape(integerShape({ min: 0 }), 5)).not.toThrow()
		expect(() => defaultShape(stringShape({ min: 1 }), 'ok')).not.toThrow()
		expect(() => defaultShape(objectShape({ a: stringShape() }), { a: 'x' })).not.toThrow()
	})

	it('wraps any inner shape kind (composes like optional/nullable)', () => {
		const shape = defaultShape(arrayShape(integerShape({ min: 0 })), [1, 2])
		expect(shape.type).toBe('default')
		expect(shape.inner.type).toBe('array')
		expect(shape.value).toEqual([1, 2])
	})
})

// === objectShape

describe('objectShape', () => {
	it('produces a shape with type object', () => {
		const shape = objectShape({ id: stringShape() })
		expect(shape.type).toBe('object')
	})

	it('stores the properties map', () => {
		const properties = {
			name: stringShape(),
			age: integerShape(),
		}
		const shape = objectShape(properties)
		expect(shape.properties).toBe(properties)
	})

	it('leaves description undefined when omitted', () => {
		const shape = objectShape({ id: stringShape() })
		expect(shape.description).toBeUndefined()
	})

	it('forwards description', () => {
		const shape = objectShape({ id: stringShape() }, { description: 'User entity' })
		expect(shape.description).toBe('User entity')
	})

	it('handles empty properties', () => {
		const shape = objectShape({})
		expect(shape.type).toBe('object')
		expect(Object.keys(shape.properties)).toHaveLength(0)
	})

	it('accepts optional properties', () => {
		const shape = objectShape({
			name: stringShape(),
			bio: optionalShape(stringShape()),
		})
		expect(shape.properties['name']?.type).toBe('string')
		expect(shape.properties['bio']?.type).toBe('optional')
	})

	it('accepts nullable properties', () => {
		const shape = objectShape({
			label: nullableShape(stringShape()),
		})
		expect(shape.properties['label']?.type).toBe('nullable')
	})

	it('accepts nested objects', () => {
		const shape = objectShape({
			address: objectShape({
				street: stringShape(),
				city: stringShape(),
			}),
		})
		expect(shape.properties['address']?.type).toBe('object')
	})

	it('defaults additionalProperties to undefined', () => {
		const shape = objectShape({ id: stringShape() })
		expect(shape.additionalProperties).toBeUndefined()
	})

	it('forwards additionalProperties: true', () => {
		const shape = objectShape({ id: stringShape() }, { additionalProperties: true })
		expect(shape.additionalProperties).toBe(true)
	})

	it('forwards additionalProperties as a shape', () => {
		const valShape = numberShape()
		const shape = objectShape({}, { additionalProperties: valShape })
		expect(shape.additionalProperties).toBe(valShape)
	})
})

// === unionShape

describe('unionShape', () => {
	it('produces a shape with type union', () => {
		const shape = unionShape(stringShape(), integerShape())
		expect(shape.type).toBe('union')
	})

	it('captures all variants', () => {
		const shape = unionShape(stringShape(), integerShape(), booleanShape())
		expect(shape.variants).toHaveLength(3)
		expect(shape.variants[0]?.type).toBe('string')
		expect(shape.variants[1]?.type).toBe('number')
		expect(shape.variants[2]?.type).toBe('boolean')
	})

	it('accepts a single variant', () => {
		const shape = unionShape(stringShape())
		expect(shape.variants).toHaveLength(1)
	})

	it('accepts nested unions', () => {
		const inner = unionShape(stringShape(), integerShape())
		const outer = unionShape(inner, booleanShape())
		expect(outer.variants).toHaveLength(2)
		expect(outer.variants[0]?.type).toBe('union')
	})

	it('accepts object variants (discriminated union pattern)', () => {
		const shape = unionShape(
			objectShape({ type: literalShape('text'), content: stringShape() }),
			objectShape({ type: literalShape('image'), url: stringShape() }),
		)
		expect(shape.variants).toHaveLength(2)
	})

	it('defaults mode to undefined (emits anyOf)', () => {
		const shape = unionShape(stringShape(), numberShape())
		expect(shape.mode).toBeUndefined()
	})

	// B4 fix 4 — an empty union is uninhabited: programmer error at build (§13).
	it('throws when called with zero variants', () => {
		expect(() => unionShape()).toThrow('unionShape requires at least one variant')
	})
})

// === optionalShape

describe('optionalShape', () => {
	it('produces a shape with type optional', () => {
		const shape = optionalShape(stringShape())
		expect(shape.type).toBe('optional')
	})

	it('stores the inner shape', () => {
		const inner = integerShape()
		const shape = optionalShape(inner)
		expect(shape.inner).toBe(inner)
	})

	it('wraps any shape type', () => {
		expect(optionalShape(stringShape()).inner.type).toBe('string')
		expect(optionalShape(numberShape()).inner.type).toBe('number')
		expect(optionalShape(booleanShape()).inner.type).toBe('boolean')
		expect(optionalShape(arrayShape(stringShape())).inner.type).toBe('array')
		expect(optionalShape(objectShape({ id: stringShape() })).inner.type).toBe('object')
	})

	it('wraps nullable shapes (optional + nullable)', () => {
		const shape = optionalShape(nullableShape(stringShape()))
		expect(shape.type).toBe('optional')
		expect(shape.inner.type).toBe('nullable')
	})
})

// === nullableShape

describe('nullableShape', () => {
	it('produces a shape with type nullable', () => {
		const shape = nullableShape(stringShape())
		expect(shape.type).toBe('nullable')
	})

	it('stores the inner shape', () => {
		const inner = numberShape()
		const shape = nullableShape(inner)
		expect(shape.inner).toBe(inner)
	})

	it('wraps any shape type', () => {
		expect(nullableShape(stringShape()).inner.type).toBe('string')
		expect(nullableShape(numberShape()).inner.type).toBe('number')
		expect(nullableShape(booleanShape()).inner.type).toBe('boolean')
		expect(nullableShape(arrayShape(stringShape())).inner.type).toBe('array')
		expect(nullableShape(objectShape({ id: stringShape() })).inner.type).toBe('object')
	})

	it('wraps optional shapes (nullable + optional)', () => {
		const shape = nullableShape(optionalShape(integerShape()))
		expect(shape.type).toBe('nullable')
		expect(shape.inner.type).toBe('optional')
	})
})

// === Complex Composition

describe('complex shape composition', () => {
	it('builds a realistic user shape', () => {
		const shape = objectShape({
			id: stringShape({ min: 1 }),
			name: stringShape({ min: 1, max: 80 }),
			age: integerShape({ min: 0, max: 150 }),
			email: optionalShape(stringShape({ pattern: /^[^@]+@[^@]+$/ })),
			role: literalShape('admin', 'member', 'guest'),
			tags: arrayShape(stringShape(), { max: 10 }),
			metadata: optionalShape(
				objectShape({
					source: stringShape(),
					score: nullableShape(numberShape({ min: 0, max: 1 })),
				}),
			),
		})

		expect(shape.type).toBe('object')
		expect(Object.keys(shape.properties)).toHaveLength(7)
		expect(shape.properties['email']?.type).toBe('optional')
		expect(shape.properties['role']?.type).toBe('literal')
		expect(shape.properties['tags']?.type).toBe('array')
		expect(shape.properties['metadata']?.type).toBe('optional')
	})

	it('builds a discriminated union shape', () => {
		const shape = unionShape(
			objectShape({
				kind: literalShape('text'),
				content: stringShape(),
			}),
			objectShape({
				kind: literalShape('image'),
				url: stringShape(),
				width: integerShape({ min: 1 }),
				height: integerShape({ min: 1 }),
			}),
			objectShape({
				kind: literalShape('file'),
				path: stringShape(),
				size: integerShape({ min: 0 }),
			}),
		)

		expect(shape.type).toBe('union')
		expect(shape.variants).toHaveLength(3)
	})

	it('builds a deeply nested shape', () => {
		const shape = objectShape({
			level1: objectShape({
				level2: objectShape({
					level3: arrayShape(
						objectShape({
							value: nullableShape(stringShape()),
						}),
					),
				}),
			}),
		})

		const l1 = shape.properties['level1']
		expect(l1?.type).toBe('object')
	})
})

// === oneOfShape

describe('oneOfShape', () => {
	it('produces a union shape with mode oneOf', () => {
		const shape = oneOfShape(stringShape(), booleanShape())
		expect(shape.type).toBe('union')
		expect(shape.mode).toBe('oneOf')
	})

	it('captures all variants', () => {
		const shape = oneOfShape(stringShape(), integerShape(), booleanShape())
		expect(shape.variants).toHaveLength(3)
		expect(shape.variants[0]?.type).toBe('string')
		expect(shape.variants[1]?.type).toBe('number')
		expect(shape.variants[2]?.type).toBe('boolean')
	})

	it('accepts a single variant', () => {
		const shape = oneOfShape(stringShape())
		expect(shape.variants).toHaveLength(1)
	})

	// B4 fix 4 — an empty oneOf is uninhabited: programmer error at build (§13).
	it('throws when called with zero variants', () => {
		expect(() => oneOfShape()).toThrow('oneOfShape requires at least one variant')
	})
})

// === recordShape

describe('recordShape', () => {
	it('produces an object shape with additionalProperties', () => {
		const shape = recordShape(numberShape())
		expect(shape.type).toBe('object')
		expect(shape.additionalProperties).toEqual(numberShape())
	})

	it('has empty properties map', () => {
		const shape = recordShape(stringShape())
		expect(Object.keys(shape.properties)).toHaveLength(0)
	})

	it('forwards description', () => {
		const shape = recordShape(stringShape(), { description: 'Variable bindings' })
		expect(shape.description).toBe('Variable bindings')
	})

	it('stores the value shape as additionalProperties', () => {
		const valShape = integerShape({ min: 0, max: 100 })
		const shape = recordShape(valShape)
		expect(shape.additionalProperties).toBe(valShape)
	})
})

// === rawShape

describe('rawShape', () => {
	it('produces a shape with type raw', () => {
		const shape = rawShape({ description: 'Any value' })
		expect(shape.type).toBe('raw')
	})

	it('stores the schema as-is', () => {
		const schema: { readonly description: string; readonly type: 'string' } = {
			description: 'Default value',
			type: 'string',
		}
		const shape = rawShape(schema)
		expect(shape.schema).toBe(schema)
	})

	it('accepts empty schema', () => {
		const shape = rawShape({})
		expect(shape.type).toBe('raw')
		expect(shape.schema).toEqual({})
	})
})
