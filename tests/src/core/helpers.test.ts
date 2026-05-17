import { describe, expect, it } from 'vitest'
import type { ContractShape, Result } from '@elements/core'
import {
	arrayShape,
	assertAcyclicShape,
	attempt,
	booleanShape,
	compileSchemaGuard,
	constShape,
	createRandom,
	CYCLIC_SHAPE_MESSAGE,
	deepEqual,
	defaultShape,
	enumerableSymbolCount,
	flattenIntersectionObjects,
	guardPermitsAbsence,
	integerShape,
	intersectionShape,
	isConstructor,
	isExternalRef,
	isMultipleOf,
	isShapeAdditional,
	lazyShape,
	literalShape,
	nullableShape,
	numberShape,
	objectShape,
	optionalShape,
	rawShape,
	stringShape,
	tupleShape,
	unescapeToken,
	unionShape,
	validateBounds,
} from '@elements/core'
import { makeCyclicShape } from './_helpers.js'

// ============================================================================
//  src/core/helpers.ts — exhaustive characterization of every exported helper.
//
//  Export surface covered (13 symbols, none omitted):
//    attempt · createRandom · enumerableSymbolCount · isConstructor ·
//    isShapeAdditional · assertAcyclicShape · guardPermitsAbsence ·
//    flattenIntersectionObjects · validateBounds ·
//    isExternalRef · unescapeToken · isMultipleOf · deepEqual
//
//  House style (AGENTS.md §16): deterministic (all randomness seeded via
//  `createRandom`; no wall-clock, no `Math.random`, no network, no mocks);
//  §1 (no `any`/`as`/`!`/`@ts-*`). ContractShape inputs are built with the
//  real `shapers.ts` builders (objectShape/intersectionShape/lazyShape/…),
//  never hand-rolled literals.
// ============================================================================

// Straight-line Result unwrappers — the `expect` is unconditional (no
// `vitest/no-conditional-expect`), and the post-assertion `throw` lets TS
// control-flow-narrow the return without `as`/`!` (AGENTS.md §1).
function expectSuccess<T>(result: Result<T>): T {
	expect(result.success).toBe(true)
	if (!result.success) {
		throw new Error('expected a Success result')
	}
	return result.value
}

function expectFailure<T>(result: Result<T>): Error {
	expect(result.success).toBe(false)
	if (result.success) {
		throw new Error('expected a Failure result')
	}
	return result.error
}

// Run `run`, assert it threw an `Error`, and return that Error for further
// straight-line assertions (no conditional `expect`, no `as`/`!`).
function captureThrow(run: () => void): Error {
	let thrown: unknown
	let didThrow = false
	try {
		run()
	} catch (error) {
		didThrow = true
		thrown = error
	}
	expect(didThrow).toBe(true)
	expect(thrown instanceof Error).toBe(true)
	if (!(thrown instanceof Error)) {
		throw new Error('expected the run to throw an Error')
	}
	return thrown
}

// === attempt

describe('attempt', () => {
	it('returns a Success carrying a returned object value', () => {
		const value = { ok: true }
		expect(expectSuccess(attempt(() => value))).toBe(value)
	})

	it('returns a Success carrying a returned primitive', () => {
		expect(expectSuccess(attempt(() => 42))).toBe(42)
	})

	it('returns a Success carrying undefined (falsy return is still success)', () => {
		expect(expectSuccess(attempt(() => undefined))).toBeUndefined()
	})

	it('returns a Success carrying null', () => {
		expect(expectSuccess(attempt(() => null))).toBeNull()
	})

	it('returns a Success carrying the falsy values 0, "", false, NaN', () => {
		for (const falsy of [0, '', false, Number.NaN]) {
			expect(Object.is(expectSuccess(attempt(() => falsy)), falsy)).toBe(true)
		}
	})

	it('returns a Failure carrying the original Error instance when one is thrown', () => {
		const error = new Error('boom')
		const captured = expectFailure(
			attempt(() => {
				throw error
			}),
		)
		expect(captured).toBe(error)
		expect(captured.message).toBe('boom')
	})

	it('preserves an Error SUBCLASS instance unchanged (instanceof Error short-circuits)', () => {
		class CustomError extends Error {}
		const error = new CustomError('typed')
		const captured = expectFailure(
			attempt(() => {
				throw error
			}),
		)
		expect(captured).toBe(error)
		expect(captured instanceof CustomError).toBe(true)
	})

	it('normalizes a thrown string to an Error whose message is String(value)', () => {
		const captured = expectFailure(
			attempt(() => {
				throw 'plain string failure'
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('plain string failure')
	})

	it('normalizes a thrown number to an Error', () => {
		const captured = expectFailure(
			attempt(() => {
				throw 404
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('404')
	})

	it('normalizes a thrown undefined to an Error with message "undefined"', () => {
		const captured = expectFailure(
			attempt(() => {
				throw undefined
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('undefined')
	})

	it('normalizes a thrown null to an Error with message "null"', () => {
		const captured = expectFailure(
			attempt(() => {
				throw null
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('null')
	})

	it('normalizes a thrown plain object to an Error via String() (→ "[object Object]")', () => {
		const captured = expectFailure(
			attempt(() => {
				throw { code: 1 }
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('[object Object]')
	})

	it('normalizes a thrown object with a custom toString faithfully', () => {
		const captured = expectFailure(
			attempt(() => {
				throw { toString: () => 'custom reason' }
			}),
		)
		expect(captured.message).toBe('custom reason')
	})

	it('normalizes a thrown Symbol to an Error (String(symbol) does not throw)', () => {
		const captured = expectFailure(
			attempt(() => {
				throw Symbol('sigil')
			}),
		)
		expect(captured instanceof Error).toBe(true)
		expect(captured.message).toBe('Symbol(sigil)')
	})

	it('never itself throws — even when the callback throws a non-Error', () => {
		expect(() =>
			attempt(() => {
				throw 'x'
			}),
		).not.toThrow()
		expect(() =>
			attempt(() => {
				throw undefined
			}),
		).not.toThrow()
	})

	it('is deterministic: identical callback → identical Result shape', () => {
		const callback = (): number => 7
		const a = attempt(callback)
		const b = attempt(callback)
		expect(a).toEqual(b)
		expect(a.success).toBe(true)
	})
})

// === createRandom

describe('createRandom', () => {
	it('is deterministic: same seed yields the identical sequence', () => {
		const a = createRandom(42)
		const b = createRandom(42)
		for (let i = 0; i < 50; i += 1) {
			expect(a()).toBe(b())
		}
	})

	it('two independent instances with the same seed produce equal sequences', () => {
		const seed = 123456
		const first = createRandom(seed)
		const second = createRandom(seed)
		const firstSequence = Array.from({ length: 20 }, () => first())
		const secondSequence = Array.from({ length: 20 }, () => second())
		expect(firstSequence).toEqual(secondSequence)
	})

	it('successive draws from one instance are not all identical (it advances)', () => {
		const random = createRandom(7)
		const draws = new Set(Array.from({ length: 20 }, () => random()))
		expect(draws.size).toBeGreaterThan(1)
	})

	it('different seeds diverge', () => {
		const a = createRandom(1)
		const b = createRandom(2)
		const aSequence = Array.from({ length: 10 }, () => a())
		const bSequence = Array.from({ length: 10 }, () => b())
		expect(aSequence).not.toEqual(bSequence)
	})

	it('every draw is in [0, 1) over a large sample', () => {
		const random = createRandom(99)
		for (let i = 0; i < 100_000; i += 1) {
			const value = random()
			expect(value).toBeGreaterThanOrEqual(0)
			expect(value).toBeLessThan(1)
			expect(Number.isFinite(value)).toBe(true)
		}
	})

	it('seed 0 is a valid seed producing a deterministic in-range sequence', () => {
		const a = createRandom(0)
		const b = createRandom(0)
		for (let i = 0; i < 10; i += 1) {
			const value = a()
			expect(value).toBe(b())
			expect(value).toBeGreaterThanOrEqual(0)
			expect(value).toBeLessThan(1)
		}
	})

	it('negative seed is coerced via >>> 0 and stays deterministic & in-range', () => {
		const a = createRandom(-1)
		const b = createRandom(-1)
		for (let i = 0; i < 10; i += 1) {
			const value = a()
			expect(value).toBe(b())
			expect(value).toBeGreaterThanOrEqual(0)
			expect(value).toBeLessThan(1)
		}
		// -1 >>> 0 === 0xFFFFFFFF, distinct from seed 0's stream.
		expect(createRandom(-1)()).not.toBe(createRandom(0)())
	})

	it('a very large seed beyond 2^32 is coerced via >>> 0 (wraps deterministically)', () => {
		const huge = createRandom(2 ** 53)
		const wrapped = createRandom(2 ** 53 >>> 0)
		for (let i = 0; i < 10; i += 1) {
			expect(huge()).toBe(wrapped())
		}
	})

	it('a non-integer seed is truncated by >>> 0 (same stream as its floor)', () => {
		const fractional = createRandom(42.9)
		const floored = createRandom(42)
		for (let i = 0; i < 10; i += 1) {
			expect(fractional()).toBe(floored())
		}
	})

	it('large sample is reasonably spread across [0,1) (not a degenerate constant)', () => {
		const random = createRandom(2024)
		let low = 0
		let high = 0
		for (let i = 0; i < 10_000; i += 1) {
			if (random() < 0.5) {
				low += 1
			} else {
				high += 1
			}
		}
		expect(low).toBeGreaterThan(0)
		expect(high).toBeGreaterThan(0)
	})
})

// === enumerableSymbolCount

describe('enumerableSymbolCount', () => {
	it('zero enumerable-symbol object → 0', () => {
		expect(enumerableSymbolCount({})).toBe(0)
	})

	it('one enumerable symbol → 1', () => {
		const flag = Symbol('flag')
		const value = Object.defineProperty({}, flag, { value: 1, enumerable: true })
		expect(enumerableSymbolCount(value)).toBe(1)
	})

	it('many enumerable symbols → exact count', () => {
		const a = Symbol('a')
		const b = Symbol('b')
		const c = Symbol('c')
		const value = { [a]: 1, [b]: 2, [c]: 3 }
		expect(enumerableSymbolCount(value)).toBe(3)
	})

	it('non-enumerable symbol keys are excluded', () => {
		const hidden = Symbol('hidden')
		const value = Object.defineProperty({}, hidden, { value: true, enumerable: false })
		expect(enumerableSymbolCount(value)).toBe(0)
	})

	it('mixed enumerable + non-enumerable symbols → only enumerable counted', () => {
		const visible = Symbol('visible')
		const hidden = Symbol('hidden')
		const value = Object.defineProperty(
			Object.defineProperty({}, visible, { value: 1, enumerable: true }),
			hidden,
			{ value: 2, enumerable: false },
		)
		expect(enumerableSymbolCount(value)).toBe(1)
	})

	it('string keys are ignored entirely', () => {
		expect(enumerableSymbolCount({ a: 1, b: 2, c: 3 })).toBe(0)
	})

	it('object with both string and symbol keys counts only symbols', () => {
		const s = Symbol('s')
		const value = { plain: 1, [s]: 2 }
		expect(enumerableSymbolCount(value)).toBe(1)
	})

	it('arrays have zero enumerable symbol keys', () => {
		expect(enumerableSymbolCount([1, 2, 3])).toBe(0)
	})

	it('array carrying an enumerable symbol key counts it', () => {
		const tag = Symbol('tag')
		const value: number[] = [1, 2]
		Object.defineProperty(value, tag, { value: 'x', enumerable: true })
		expect(enumerableSymbolCount(value)).toBe(1)
	})

	it('only OWN symbols are counted — inherited enumerable symbols are excluded', () => {
		const inherited = Symbol('inherited')
		const proto = Object.defineProperty({}, inherited, { value: 1, enumerable: true })
		const child = Object.create(proto)
		// `Object.getOwnPropertySymbols` is own-only, so the inherited symbol
		// does not contribute.
		expect(enumerableSymbolCount(child)).toBe(0)
		const own = Symbol('own')
		Object.defineProperty(child, own, { value: 2, enumerable: true })
		expect(enumerableSymbolCount(child)).toBe(1)
	})

	it('a function object with an enumerable symbol key is counted', () => {
		const marker = Symbol('marker')
		const fn = (): void => undefined
		Object.defineProperty(fn, marker, { value: 1, enumerable: true })
		expect(enumerableSymbolCount(fn)).toBe(1)
	})

	it('well-known symbols like Symbol.iterator count when own & enumerable', () => {
		const value = Object.defineProperty({}, Symbol.iterator, {
			value: function* () {
				yield 1
			},
			enumerable: true,
		})
		expect(enumerableSymbolCount(value)).toBe(1)
	})
})

// === isConstructor

describe('isConstructor', () => {
	it('a class declaration is a constructor', () => {
		class Example {}
		expect(isConstructor(Example)).toBe(true)
	})

	it('a regular function declaration is a constructor', () => {
		function regular(): void {
			return undefined
		}
		expect(isConstructor(regular)).toBe(true)
	})

	it('an arrow function is NOT a constructor', () => {
		const arrow = (): undefined => undefined
		expect(isConstructor(arrow)).toBe(false)
	})

	it('an async function is NOT a constructor', () => {
		const asyncFn = async (): Promise<void> => undefined
		expect(isConstructor(asyncFn)).toBe(false)
	})

	it('a generator function is NOT a constructor', () => {
		function* gen(): Generator<number> {
			yield 1
		}
		expect(isConstructor(gen)).toBe(false)
	})

	it('an async generator function is NOT a constructor', () => {
		async function* asyncGen(): AsyncGenerator<number> {
			yield 1
		}
		expect(isConstructor(asyncGen)).toBe(false)
	})

	it('a bound class is still a constructor', () => {
		class Foo {
			#x: number
			constructor(x: number) {
				this.#x = x
			}
			get x(): number {
				return this.#x
			}
		}
		const BoundFoo = Foo.bind(null)
		expect(isConstructor(BoundFoo)).toBe(true)
	})

	it('a bound arrow function is NOT a constructor', () => {
		const arrow = (): undefined => undefined
		expect(isConstructor(arrow.bind(null))).toBe(false)
	})

	it('built-in constructors Array, Object, Map are constructors', () => {
		expect(isConstructor(Array)).toBe(true)
		expect(isConstructor(Object)).toBe(true)
		expect(isConstructor(Map)).toBe(true)
	})

	it('a Proxy wrapping a constructor that traps construct is a constructor', () => {
		class Wrapped {}
		const proxied = new Proxy(Wrapped, {})
		expect(isConstructor(proxied)).toBe(true)
	})

	it('non-callable values are not constructors', () => {
		expect(isConstructor({})).toBe(false)
		expect(isConstructor([])).toBe(false)
		expect(isConstructor(42)).toBe(false)
		expect(isConstructor('class')).toBe(false)
		expect(isConstructor(true)).toBe(false)
		expect(isConstructor(Symbol('s'))).toBe(false)
		expect(isConstructor(10n)).toBe(false)
	})

	it('null and undefined are not constructors', () => {
		expect(isConstructor(null)).toBe(false)
		expect(isConstructor(undefined)).toBe(false)
	})

	it('never throws for any input', () => {
		expect(() => isConstructor(null)).not.toThrow()
		expect(() => isConstructor(() => undefined)).not.toThrow()
		expect(() => isConstructor(Object.create(null))).not.toThrow()
	})
})

// === isShapeAdditional

describe('isShapeAdditional', () => {
	it('undefined → false (closed object)', () => {
		expect(isShapeAdditional(undefined)).toBe(false)
	})

	it('false → false (closed object)', () => {
		expect(isShapeAdditional(false)).toBe(false)
	})

	it('true → false (open passthrough, not a typed shape)', () => {
		expect(isShapeAdditional(true)).toBe(false)
	})

	it('a ContractShape → true (typed open object), narrowing to ContractShape', () => {
		const shape: boolean | ContractShape | undefined = numberShape()
		expect(isShapeAdditional(shape)).toBe(true)
		// The guard narrows `boolean | ContractShape | undefined` to
		// `ContractShape`; expose that by reading `.type` after the guard.
		const narrowed: ContractShape | undefined = isShapeAdditional(shape) ? shape : undefined
		expect(narrowed?.type).toBe('number')
	})

	it('various ContractShape kinds all classify as true', () => {
		const shapes: ContractShape[] = [
			stringShape(),
			objectShape({ a: stringShape() }),
			arrayShape(numberShape()),
			unionShape(stringShape(), numberShape()),
			lazyShape(() => stringShape()),
		]
		for (const shape of shapes) {
			expect(isShapeAdditional(shape)).toBe(true)
		}
	})
})

// === assertAcyclicShape

describe('assertAcyclicShape', () => {
	it('does not throw for a primitive shape', () => {
		expect(() => assertAcyclicShape(stringShape(), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(numberShape(), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(booleanShape(), new WeakSet())).not.toThrow()
	})

	it('does not throw for literal / const / raw terminals', () => {
		expect(() => assertAcyclicShape(literalShape('x'), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(constShape(42), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(rawShape(true), new WeakSet())).not.toThrow()
	})

	it('does not throw for nested object / array / tuple / union / intersection', () => {
		const shape = objectShape({
			id: stringShape(),
			tags: arrayShape(stringShape()),
			pair: tupleShape(stringShape(), numberShape()),
			either: unionShape(stringShape(), numberShape()),
			both: intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: numberShape() })),
		})
		expect(() => assertAcyclicShape(shape, new WeakSet())).not.toThrow()
	})

	it('does not throw for wrapper kinds optional / nullable / default', () => {
		expect(() => assertAcyclicShape(optionalShape(stringShape()), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(nullableShape(numberShape()), new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(defaultShape(integerShape(), 3), new WeakSet())).not.toThrow()
	})

	it('does not throw for a typed open object (additionalProperties as a shape)', () => {
		const shape = objectShape({ id: stringShape() }, { additionalProperties: numberShape() })
		expect(() => assertAcyclicShape(shape, new WeakSet())).not.toThrow()
	})

	it('does not throw for a shared-but-acyclic sub-shape referenced under two sibling keys (a DAG)', () => {
		const shared = objectShape({ a: stringShape() })
		const root = objectShape({ left: shared, right: shared })
		expect(() => assertAcyclicShape(root, new WeakSet())).not.toThrow()
	})

	it('does not throw for a deep-but-acyclic nested object (no false positive)', () => {
		let shape: ContractShape = objectShape({ leaf: stringShape() })
		for (let i = 0; i < 60; i += 1) {
			shape = objectShape({ child: shape })
		}
		expect(() => assertAcyclicShape(shape, new WeakSet())).not.toThrow()
	})

	it('does not throw for a recursive shape whose recursion is broken by a lazyShape', () => {
		// A tree whose `children` is `arrayShape(lazyShape(() => treeShape))`:
		// the lazy thunk is the deferral, so there is NO structural back-edge.
		const properties: Record<string, ContractShape> = { value: stringShape() }
		const treeShape = objectShape(properties)
		properties['children'] = arrayShape(lazyShape(() => treeShape))
		expect(() => assertAcyclicShape(treeShape, new WeakSet())).not.toThrow()
	})

	it('does not throw for a self-referential lazy thunk (lazy arm is a terminal — thunk not invoked)', () => {
		// `lazyShape(() => self)` — if the thunk were invoked this would recurse
		// forever; the lazy arm returns WITHOUT invoking it.
		let self: ContractShape = stringShape()
		const lazy = lazyShape(() => self)
		self = lazy
		expect(() => assertAcyclicShape(lazy, new WeakSet())).not.toThrow()
	})

	it('throws the exact CYCLIC_SHAPE_MESSAGE for a genuine non-lazy structural cycle', () => {
		const cyclic = makeCyclicShape()
		expect(() => assertAcyclicShape(cyclic, new WeakSet())).toThrow(CYCLIC_SHAPE_MESSAGE)
	})

	it('throws an Error (not a bare RangeError) for the structural cycle', () => {
		const cyclic = makeCyclicShape()
		const thrown = captureThrow(() => assertAcyclicShape(cyclic, new WeakSet()))
		expect(thrown.message).toBe(CYCLIC_SHAPE_MESSAGE)
		expect(thrown instanceof RangeError).toBe(false)
	})

	it('throws for a non-lazy cycle threaded through an array shape', () => {
		const properties: Record<string, ContractShape> = { name: stringShape() }
		const shape = objectShape(properties)
		properties['items'] = arrayShape(shape)
		expect(() => assertAcyclicShape(shape, new WeakSet())).toThrow(CYCLIC_SHAPE_MESSAGE)
	})

	it('throws for a non-lazy cycle threaded through a wrapper (optional → inner recursion arm)', () => {
		// `optional`/`nullable`/`default` share the wrapper-recursion arm in
		// `assertAcyclicShape`; a cycle through the wrapper still throws.
		// `optionalShape` is used (vs `defaultShape`) because `defaultShape`
		// build-validates its default against the inner guard, which would
		// throw a *different* (defaultShape) error before acyclicity runs.
		const properties: Record<string, ContractShape> = { name: stringShape() }
		const shape = objectShape(properties)
		properties['next'] = optionalShape(shape)
		expect(() => assertAcyclicShape(shape, new WeakSet())).toThrow(CYCLIC_SHAPE_MESSAGE)
	})

	it('throws for a non-lazy cycle threaded through a union variant', () => {
		const properties: Record<string, ContractShape> = { name: stringShape() }
		const shape = objectShape(properties)
		properties['alt'] = unionShape(stringShape(), shape)
		expect(() => assertAcyclicShape(shape, new WeakSet())).toThrow(CYCLIC_SHAPE_MESSAGE)
	})

	it('a fresh WeakSet per call means a DAG sub-shape walked twice across calls is fine', () => {
		const shared = objectShape({ a: stringShape() })
		expect(() => assertAcyclicShape(shared, new WeakSet())).not.toThrow()
		expect(() => assertAcyclicShape(shared, new WeakSet())).not.toThrow()
	})

	it('detects the cycle even when the seen set already contains unrelated shapes', () => {
		const cyclic = makeCyclicShape()
		const seen = new WeakSet<ContractShape>()
		seen.add(stringShape())
		expect(() => assertAcyclicShape(cyclic, seen)).toThrow(CYCLIC_SHAPE_MESSAGE)
	})
})

// === guardPermitsAbsence

describe('guardPermitsAbsence', () => {
	it('optionalShape → true', () => {
		expect(guardPermitsAbsence(optionalShape(stringShape()))).toBe(true)
	})

	it('a plain required shape → false', () => {
		expect(guardPermitsAbsence(stringShape())).toBe(false)
		expect(guardPermitsAbsence(numberShape())).toBe(false)
		expect(guardPermitsAbsence(objectShape({ a: stringShape() }))).toBe(false)
	})

	it('defaultShape over a non-optional inner → false (required by the guard)', () => {
		expect(guardPermitsAbsence(defaultShape(integerShape(), 3))).toBe(false)
	})

	it('defaultShape over an optional inner → true (recurses to inner decision)', () => {
		expect(guardPermitsAbsence(defaultShape(optionalShape(stringShape()), 'x'))).toBe(true)
	})

	it('nested defaultShape wrappers recurse to the innermost decision (optional → true)', () => {
		const shape = defaultShape(defaultShape(optionalShape(numberShape()), 1), 2)
		expect(guardPermitsAbsence(shape)).toBe(true)
	})

	it('nested defaultShape wrappers over a non-optional inner → false', () => {
		const shape = defaultShape(defaultShape(integerShape(), 1), 2)
		expect(guardPermitsAbsence(shape)).toBe(false)
	})

	it('nullableShape → false (accepts null, not absence)', () => {
		expect(guardPermitsAbsence(nullableShape(stringShape()))).toBe(false)
	})

	it('defaultShape over a nullable inner → false (nullable does not permit absence)', () => {
		expect(guardPermitsAbsence(defaultShape(nullableShape(stringShape()), null))).toBe(false)
	})

	it('every non-optional/non-default kind → false', () => {
		const shapes: ContractShape[] = [
			arrayShape(stringShape()),
			tupleShape(stringShape()),
			unionShape(stringShape(), numberShape()),
			intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: numberShape() })),
			literalShape('x'),
			constShape(1),
			rawShape(true),
			lazyShape(() => stringShape()),
			booleanShape(),
		]
		for (const shape of shapes) {
			expect(guardPermitsAbsence(shape)).toBe(false)
		}
	})
})

// === flattenIntersectionObjects

describe('flattenIntersectionObjects', () => {
	it('single-level intersection of object shapes → all members in order', () => {
		const a = objectShape({ a: stringShape() })
		const b = objectShape({ b: numberShape() })
		const result = flattenIntersectionObjects(intersectionShape(a, b))
		expect(result).toEqual([a, b])
		expect(result[0]).toBe(a)
		expect(result[1]).toBe(b)
	})

	it('nested intersections are flattened transitively to leaf object shapes', () => {
		const a = objectShape({ a: stringShape() })
		const b = objectShape({ b: numberShape() })
		const c = objectShape({ c: booleanShape() })
		const nested = intersectionShape(b, c)
		const result = flattenIntersectionObjects(intersectionShape(a, nested))
		expect(result).toEqual([a, b, c])
	})

	it('deeply nested intersections collapse to the full leaf-object list, in member order', () => {
		const a = objectShape({ a: stringShape() })
		const b = objectShape({ b: numberShape() })
		const c = objectShape({ c: booleanShape() })
		const d = objectShape({ d: stringShape() })
		const deep = intersectionShape(a, intersectionShape(b, intersectionShape(c, d)))
		expect(flattenIntersectionObjects(deep)).toEqual([a, b, c, d])
	})

	it('preserves member order across a mix of direct and nested object members', () => {
		const first = objectShape({ first: stringShape() })
		const second = objectShape({ second: numberShape() })
		const third = objectShape({ third: booleanShape() })
		const result = flattenIntersectionObjects(
			intersectionShape(first, intersectionShape(second, third)),
		)
		expect(result.map((member) => Object.keys(member.properties)[0])).toEqual([
			'first',
			'second',
			'third',
		])
	})

	it('returns each member ObjectShape by reference (no copying)', () => {
		const a = objectShape({ a: stringShape() })
		const b = objectShape({ b: numberShape() })
		const result = flattenIntersectionObjects(intersectionShape(a, b))
		expect(result[0]).toBe(a)
		expect(result[1]).toBe(b)
	})
})

// === validateBounds

describe('validateBounds', () => {
	it('does not throw when both bounds are undefined', () => {
		expect(() => validateBounds('shape', undefined, undefined, true)).not.toThrow()
		expect(() => validateBounds('shape', undefined, undefined, false)).not.toThrow()
	})

	it('does not throw for assorted valid length bounds', () => {
		expect(() => validateBounds('stringShape', 1, 80, true)).not.toThrow()
		expect(() => validateBounds('stringShape', 0, 0, true)).not.toThrow()
		expect(() => validateBounds('stringShape', 0, undefined, true)).not.toThrow()
		expect(() => validateBounds('stringShape', undefined, 10, true)).not.toThrow()
	})

	it('does not throw for assorted valid value bounds (negatives allowed when lengthBound=false)', () => {
		expect(() => validateBounds('numberShape', -100, 100, false)).not.toThrow()
		expect(() => validateBounds('numberShape', -10, -5, false)).not.toThrow()
		expect(() => validateBounds('numberShape', -1, undefined, false)).not.toThrow()
	})

	it('boundary equality min === max does NOT throw', () => {
		expect(() => validateBounds('shape', 5, 5, true)).not.toThrow()
		expect(() => validateBounds('shape', -3, -3, false)).not.toThrow()
		expect(() => validateBounds('shape', 0, 0, true)).not.toThrow()
	})

	it('throws when min is non-finite (NaN)', () => {
		expect(() => validateBounds('s', Number.NaN, undefined, true)).toThrow(
			's: min must be a finite number',
		)
	})

	it('throws when min is non-finite (Infinity)', () => {
		expect(() => validateBounds('s', Number.POSITIVE_INFINITY, undefined, false)).toThrow(
			's: min must be a finite number',
		)
	})

	it('throws when max is non-finite (NaN)', () => {
		expect(() => validateBounds('s', undefined, Number.NaN, true)).toThrow(
			's: max must be a finite number',
		)
	})

	it('throws when max is non-finite (-Infinity)', () => {
		expect(() => validateBounds('s', undefined, Number.NEGATIVE_INFINITY, false)).toThrow(
			's: max must be a finite number',
		)
	})

	it('throws when lengthBound && min < 0', () => {
		expect(() => validateBounds('arrayShape', -1, undefined, true)).toThrow(
			'arrayShape: min (-1) must not be negative',
		)
	})

	it('throws when lengthBound && max < 0', () => {
		expect(() => validateBounds('arrayShape', undefined, -2, true)).toThrow(
			'arrayShape: max (-2) must not be negative',
		)
	})

	it('does NOT throw for a negative min/max when lengthBound is false', () => {
		expect(() => validateBounds('numberShape', -5, undefined, false)).not.toThrow()
		expect(() => validateBounds('numberShape', undefined, -5, false)).not.toThrow()
	})

	it('throws when min > max', () => {
		expect(() => validateBounds('stringShape', 5, 2, true)).toThrow(
			'stringShape: min (5) must not exceed max (2)',
		)
	})

	it('throws when min > max even for negative value bounds (lengthBound=false)', () => {
		expect(() => validateBounds('numberShape', -2, -10, false)).toThrow(
			'numberShape: min (-2) must not exceed max (-10)',
		)
	})

	it('non-finite check precedes the min>max check (NaN min reported as non-finite)', () => {
		expect(() => validateBounds('s', Number.NaN, 1, true)).toThrow(
			's: min must be a finite number',
		)
	})

	it('the negative-length check precedes the min>max check', () => {
		// min=-1, max=-2, lengthBound=true: the negative-min branch fires first.
		expect(() => validateBounds('s', -1, -2, true)).toThrow('s: min (-1) must not be negative')
	})

	it('uses the label verbatim in the message', () => {
		expect(() => validateBounds('myCustomBuilder', 9, 1, true)).toThrow(
			'myCustomBuilder: min (9) must not exceed max (1)',
		)
	})

	it('throws an Error instance for every throw branch', () => {
		const cases: Array<() => void> = [
			() => validateBounds('s', Number.NaN, undefined, true),
			() => validateBounds('s', undefined, Number.NaN, true),
			() => validateBounds('s', -1, undefined, true),
			() => validateBounds('s', undefined, -1, true),
			() => validateBounds('s', 5, 2, true),
		]
		for (const run of cases) {
			// `captureThrow` asserts (unconditionally) that an Error was thrown.
			expect(captureThrow(run) instanceof Error).toBe(true)
		}
	})

	it('-0 is finite and non-negative — does not throw', () => {
		expect(() => validateBounds('s', -0, 0, true)).not.toThrow()
	})
})

// === isExternalRef

describe('isExternalRef', () => {
	it('empty string → false (local — resolves against root)', () => {
		expect(isExternalRef('')).toBe(false)
	})

	it('bare "#" → false (local whole-document fragment)', () => {
		expect(isExternalRef('#')).toBe(false)
	})

	it('"#/..." JSON-Pointer fragment → false (local)', () => {
		expect(isExternalRef('#/$defs/Id')).toBe(false)
		expect(isExternalRef('#/properties/name')).toBe(false)
	})

	it('bare RFC-6901 "/..." form → false (local)', () => {
		expect(isExternalRef('/a/b')).toBe(false)
		expect(isExternalRef('/')).toBe(false)
	})

	it('a relative document path → true (external)', () => {
		expect(isExternalRef('other.json')).toBe(true)
		expect(isExternalRef('defs.json')).toBe(true)
	})

	it('a relative document path with a fragment → true (external)', () => {
		expect(isExternalRef('other.json#/A')).toBe(true)
	})

	it('an http(s):// URL → true (external)', () => {
		expect(isExternalRef('https://example.com/schema.json')).toBe(true)
		expect(isExternalRef('http://example.com/s#/A')).toBe(true)
	})

	it('a scheme-prefixed URI (urn:) → true (external)', () => {
		expect(isExternalRef('urn:uuid:1234')).toBe(true)
	})

	it('a bare "#fragment" (no leading "#/" and not exactly "#") → true (external per impl)', () => {
		// Source contract: only '', '#', '#/...', '/...' are local. A bare
		// `#fragment` does not start with `#/`, is not exactly `#`, so the
		// final `ref !== '#'` returns true. Pin the ACTUAL behavior.
		expect(isExternalRef('#fragment')).toBe(true)
		expect(isExternalRef('#$defs')).toBe(true)
	})

	it('a name not starting with # or / → true (external)', () => {
		expect(isExternalRef('Id')).toBe(true)
		expect(isExternalRef('a/b')).toBe(true)
	})
})

// === unescapeToken

describe('unescapeToken', () => {
	it('a token with no escapes is returned unchanged', () => {
		expect(unescapeToken('plain')).toBe('plain')
		expect(unescapeToken('a-b_c.d')).toBe('a-b_c.d')
	})

	it('the empty string maps to the empty string', () => {
		expect(unescapeToken('')).toBe('')
	})

	it('~1 → /', () => {
		expect(unescapeToken('a~1b')).toBe('a/b')
		expect(unescapeToken('~1')).toBe('/')
	})

	it('~0 → ~', () => {
		expect(unescapeToken('a~0b')).toBe('a~b')
		expect(unescapeToken('~0')).toBe('~')
	})

	it('multiple escapes of each kind are all replaced', () => {
		expect(unescapeToken('~1~1~1')).toBe('///')
		expect(unescapeToken('~0~0')).toBe('~~')
		expect(unescapeToken('a~1b~0c~1d')).toBe('a/b~c/d')
	})

	it('RFC-6901 order: ~01 decodes to the literal ~1 (NOT /)', () => {
		// ~1 is replaced before ~0: '~01' → '~0' + '1' (the ~1 sub-match is
		// '0','1'? no — '~01' has no '~1'), then '~0' → '~' giving '~1'.
		expect(unescapeToken('~01')).toBe('~1')
	})

	it('RFC-6901 order: ~10 decodes to /0', () => {
		// '~10' contains '~1' → '/', leaving '/0'. No '~0' remains.
		expect(unescapeToken('~10')).toBe('/0')
	})

	it('a literal ~ not followed by 0 or 1 is left as-is', () => {
		expect(unescapeToken('~')).toBe('~')
		expect(unescapeToken('~2')).toBe('~2')
		expect(unescapeToken('a~z')).toBe('a~z')
	})

	it('mixed escaped and literal tilde sequences', () => {
		expect(unescapeToken('~0~')).toBe('~~')
		expect(unescapeToken('foo~1bar~0baz')).toBe('foo/bar~baz')
	})

	it('a slash that is already literal is untouched', () => {
		expect(unescapeToken('a/b')).toBe('a/b')
	})

	it('is idempotent on already-unescaped output for escape-free tokens', () => {
		const once = unescapeToken('plain/token')
		expect(unescapeToken(once)).toBe('plain/token')
	})
})

// === isMultipleOf

describe('isMultipleOf', () => {
	it('exact integer multiples → true', () => {
		expect(isMultipleOf(10, 5)).toBe(true)
		expect(isMultipleOf(9, 3)).toBe(true)
		expect(isMultipleOf(100, 25)).toBe(true)
	})

	it('non-multiples → false', () => {
		expect(isMultipleOf(7, 2)).toBe(false)
		expect(isMultipleOf(10, 3)).toBe(false)
	})

	it('divisor === 0 → false (zero divisor short-circuit)', () => {
		expect(isMultipleOf(0, 0)).toBe(false)
		expect(isMultipleOf(5, 0)).toBe(false)
		expect(isMultipleOf(-5, 0)).toBe(false)
	})

	it('value === 0 with a non-zero divisor → true (0 is a multiple of everything)', () => {
		expect(isMultipleOf(0, 5)).toBe(true)
		expect(isMultipleOf(0, -3)).toBe(true)
		expect(isMultipleOf(0, 0.1)).toBe(true)
	})

	it('negative values and divisors', () => {
		expect(isMultipleOf(-10, 5)).toBe(true)
		expect(isMultipleOf(10, -5)).toBe(true)
		expect(isMultipleOf(-10, -5)).toBe(true)
		expect(isMultipleOf(-7, 2)).toBe(false)
	})

	it('tolerates genuine IEEE-754 representation error (0.3 / 0.1 → true)', () => {
		// 0.3 / 0.1 lands ~6.7e-16 off 3 — within the few-ULP relative band.
		expect(isMultipleOf(0.3, 0.1)).toBe(true)
		expect(isMultipleOf(0.6, 0.1)).toBe(true)
		expect(isMultipleOf(0.9, 0.3)).toBe(true)
	})

	it('rejects a clearly non-multiple just outside the epsilon band', () => {
		// ~1e-13 off, ~150x the tolerance band — must be rejected.
		expect(isMultipleOf(0.30000000000001, 0.1)).toBe(false)
	})

	it('money / moderate-quotient decimals stay complete (FU10 follow-up)', () => {
		// These quotients are NOT exactly representable — e.g.
		// 0.28 / 0.01 === 27.999999999999996 (qErr ~2.8e-14). A fixed
		// quotient-space band rejected them (~13.6% of dollar-and-cent
		// values); the value-space magnitude-scaled band must accept them.
		expect(isMultipleOf(0.28, 0.01)).toBe(true)
		expect(isMultipleOf(0.29, 0.01)).toBe(true)
		expect(isMultipleOf(0.58, 0.01)).toBe(true)
		expect(isMultipleOf(1.15, 0.01)).toBe(true)
		expect(isMultipleOf(1234567890.12, 0.01)).toBe(true)
		expect(isMultipleOf(999999999999.99, 0.01)).toBe(true)
	})

	it('large-magnitude decimal multiples stay complete (FU10 follow-up)', () => {
		expect(isMultipleOf(1e14, 0.1)).toBe(true)
		expect(isMultipleOf(100000000 * 0.01, 0.01)).toBe(true)
		expect(isMultipleOf(123456789 * 0.01, 0.01)).toBe(true)
		expect(isMultipleOf(987654321 * 0.01, 0.01)).toBe(true)
	})

	it('non-integer divisor with an exact multiple → true', () => {
		expect(isMultipleOf(1, 0.25)).toBe(true)
		expect(isMultipleOf(2.5, 0.5)).toBe(true)
	})

	it('non-integer divisor with a non-multiple → false', () => {
		expect(isMultipleOf(1, 0.3)).toBe(false)
	})

	it('very large exact multiples → true', () => {
		expect(isMultipleOf(1e15, 1e5)).toBe(true)
		expect(isMultipleOf(Number.MAX_SAFE_INTEGER - 1, 2)).toBe(true)
	})

	it('large odd integer is NOT a multiple of 2 (FU10 soundness)', () => {
		// MAX_SAFE_INTEGER is odd; the tolerance must not grow wide enough at
		// huge magnitude to swallow the 0.5 residual of an odd/2 division.
		expect(isMultipleOf(Number.MAX_SAFE_INTEGER, 2)).toBe(false)
		expect(isMultipleOf(9007199254740990, 2)).toBe(true)
		expect(isMultipleOf(Number.MAX_SAFE_INTEGER, 1)).toBe(true)
	})

	it('large-magnitude integer ÷ small divisor stays sound (FU10)', () => {
		// 9007199254740991 (MAX_SAFE_INTEGER) is odd, ≢ 0 mod 3.
		expect(isMultipleOf(9007199254740991, 1)).toBe(true)
		expect(isMultipleOf(9007199254740991, 2)).toBe(false)
		expect(isMultipleOf(9007199254740991, 3)).toBe(false)
		// 9007199254740990 is even AND exactly divisible by 3
		// (9007199254740990 / 3 = 3002399751580330).
		expect(isMultipleOf(9007199254740990, 1)).toBe(true)
		expect(isMultipleOf(9007199254740990, 2)).toBe(true)
		expect(isMultipleOf(9007199254740990, 3)).toBe(true)
		// 9007199254740989 ≡ 2 mod 3 → not a multiple of 3.
		expect(isMultipleOf(9007199254740989, 3)).toBe(false)
		// 9000000000000000 = 3 · 3000000000000000 (exact); +1 breaks it.
		expect(isMultipleOf(9000000000000000, 3)).toBe(true)
		expect(isMultipleOf(9000000000000001, 3)).toBe(false)
	})

	it('large-magnitude decimal NON-multiples are rejected (FU10 follow-up)', () => {
		// Round-3 regression set. The magnitude-only value-space band of
		// 410e1a6 grew without bound and (wrongly) accepted these distinct-
		// representable genuine non-multiples once |value| ≳ 2.8e12. The
		// divisor cap (`|divisor| / 16`) is the soundness floor: a genuine
		// miss's residual is at least a fraction of |divisor|, so the band
		// can never reach it. These are RED against 410e1a6 (each returns
		// `true` there) and must be `false` now. Each value is built from a
		// safe-integer base multiple plus a sub-step offset that is itself
		// NOT a multiple of the divisor (so the literals stay precision-safe
		// AND the genuine-non-multiple property is explicit). All sit below
		// the inherent IEEE-754 precision wall, so soundness is recoverable.
		expect(isMultipleOf(1000000000000000 * 0.01 + 0.006, 0.01)).toBe(false)
		expect(isMultipleOf(1000000000000000 * 0.1 + 0.05, 0.1)).toBe(false)
		expect(isMultipleOf(2000000000000000 * 0.01 + 0.003, 0.01)).toBe(false)
		expect(isMultipleOf(1000000000000000 * 0.001 + 0.0003, 0.001)).toBe(
			false,
		)
	})

	it('pins the documented inherent IEEE-754 precision wall (FU10 follow-up)', () => {
		// This is the explicit, honest boundary pin — NOT a bug
		// characterization. `wallValue` (= 56597500000000.016) is a genuine
		// non-multiple of `0.01`: its nearest representable multiple is
		// ~7.8e-3 away in value space (> 0). Yet `wallValue / 0.01`
		// evaluates to the exact integer double `5659750000000001` (no
		// fractional bits survive at this magnitude), so the upstream
		// `quotient === rounded` return fires BEFORE any tolerance is
		// considered. No tolerance scheme — magnitude band or divisor cap —
		// can change this; it is the documented, soundness-biased inherent
		// precision wall (begins ~1e13 for divisor 0.01, ~1e14 for 0.1).
		// The predicate accepts here as a known, bounded cost above realistic
		// JSON-Schema magnitudes (cents/money ≤ ~1e11–1e12, where it is both
		// sound and complete). `5659750000000001` is < MAX_SAFE_INTEGER, so
		// the construction is precision-safe.
		const wallValue = 5659750000000001 * 0.01 + 0.006
		expect(wallValue / 0.01).toBe(5659750000000001)
		expect(isMultipleOf(wallValue, 0.01)).toBe(true)
	})

	it('decimal-tolerance preserved at small magnitude (FU10)', () => {
		expect(isMultipleOf(0.3, 0.1)).toBe(true)
		expect(isMultipleOf(0.0003, 0.0001)).toBe(true)
	})

	it('very small values', () => {
		expect(isMultipleOf(1e-9, 1e-9)).toBe(true)
		expect(isMultipleOf(2e-9, 1e-9)).toBe(true)
	})

	it('a value equal to its divisor → true (quotient 1)', () => {
		expect(isMultipleOf(5, 5)).toBe(true)
		expect(isMultipleOf(0.1, 0.1)).toBe(true)
		expect(isMultipleOf(-4, -4)).toBe(true)
	})

	it('divisor of 1 → every finite integer is a multiple', () => {
		expect(isMultipleOf(0, 1)).toBe(true)
		expect(isMultipleOf(123456, 1)).toBe(true)
		expect(isMultipleOf(-99, 1)).toBe(true)
	})

	it('is deterministic for the same arguments', () => {
		expect(isMultipleOf(0.3, 0.1)).toBe(isMultipleOf(0.3, 0.1))
		expect(isMultipleOf(7, 2)).toBe(isMultipleOf(7, 2))
	})
})

// === deepEqual — differential equivalence vs the two pre-merge originals
//
// FU9-E unified compilers' private `constEquals` and schema's private
// `schemaValueEquals` into ONE shared `deepEqual(a, b, read?)`. This suite
// LOCKS that the merge is byte-for-byte behaviour-preserving by re-deriving
// the EXACT pre-merge bodies of BOTH originals here (verbatim, including the
// throwing-getter `safeGet`/sentinel interaction) and asserting `deepEqual`
// returns the IDENTICAL boolean across an exhaustive corpus. A divergence at
// ANY corpus row (primitive, NaN, ±0, nested, array-vs-array-like, key-set,
// throwing getter one-side / both-sides) FAILS — that is the regression net.

// Verbatim copy of the inline plain-object discrimination both originals
// used (`isRecord` AS USED): non-null object, not an array, prototype pinned
// to `Object.prototype` or `null`. Replicated here so the differential proof
// that `deepEqual`'s inline check === `isRecord`-as-used is self-contained.
function refIsRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false
	}
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

// Verbatim pre-merge body of compilers.ts' private `constEquals` (direct
// `b[key]` read — a throwing accessor PROPAGATES, the trusted-input regime).
function oldConstEquals(a: unknown, b: unknown): boolean {
	if (Array.isArray(a)) {
		const aArray: readonly unknown[] = a
		if (!Array.isArray(b) || aArray.length !== b.length) {
			return false
		}
		const bArray: readonly unknown[] = b
		for (let index = 0; index < aArray.length; index += 1) {
			if (!oldConstEquals(aArray[index], bArray[index])) {
				return false
			}
		}
		return true
	}
	if (!refIsRecord(a)) {
		return Object.is(a, b)
	}
	if (!refIsRecord(b)) {
		return false
	}
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) {
		return false
	}
	for (const key of aKeys) {
		if (!Object.hasOwn(b, key) || !oldConstEquals(a[key], b[key])) {
			return false
		}
	}
	return true
}

// Verbatim pre-merge body of schema.ts' private `schemaValueEquals`,
// including its module-private `safeGet`/`SAFE_GET_THREW` interaction (a
// throwing right-operand getter ⇒ sentinel ⇒ that key is unequal ⇒ false;
// never propagates — the untrusted-input regime).
const REF_SAFE_GET_THREW: unique symbol = Symbol('ref-safe-get-threw')
function refSafeGet(value: object, key: string): unknown {
	try {
		return Reflect.get(value, key)
	} catch {
		return REF_SAFE_GET_THREW
	}
}
function oldSchemaValueEquals(a: unknown, b: unknown): boolean {
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) {
			return false
		}
		for (let index = 0; index < a.length; index += 1) {
			if (!oldSchemaValueEquals(a[index], b[index])) {
				return false
			}
		}
		return true
	}
	if (!refIsRecord(a)) {
		return Object.is(a, b)
	}
	if (!refIsRecord(b)) {
		return false
	}
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) {
		return false
	}
	for (const key of aKeys) {
		if (!Object.hasOwn(b, key)) {
			return false
		}
		const bChild = refSafeGet(b, key)
		if (bChild === REF_SAFE_GET_THREW || !oldSchemaValueEquals(a[key], bChild)) {
			return false
		}
	}
	return true
}

// The schema variant injects its own `safeGet`. Mirror that wiring here with
// the test's `refSafeGet` so the merged path is exercised exactly as
// schema.ts wires it (sentinel stays local to the reader, never leaks into
// `deepEqual`'s leaf comparison except as an opaque value).
function mergedSchemaEquals(a: unknown, b: unknown): boolean {
	return deepEqual(a, b, refSafeGet)
}

// Build a fresh object whose `boom` getter throws — exercises the
// one-side / both-sides throwing-getter cases.
function throwingGetter(): Record<string, unknown> {
	return Object.defineProperty({}, 'boom', {
		enumerable: true,
		configurable: true,
		get() {
			throw new Error('getter exploded')
		},
	})
}

// A single shared reference for the same-reference Object.is leaf row, and a
// stable function reference for the non-plain-object leaf row.
const SHARED_DATE = new Date(0)
const NOOP = (): void => undefined

describe('deepEqual — differential equivalence vs pre-merge originals', () => {
	// Each row: a label + the two operands. The corpus is exhaustive over the
	// behaviour-spec axes the merge had to preserve.
	const corpus: ReadonlyArray<readonly [string, unknown, unknown]> = [
		['identical primitives (number)', 1, 1],
		['differing primitives (number)', 1, 2],
		['string equality', 'x', 'x'],
		['string inequality', 'x', 'y'],
		['boolean equality', true, true],
		['null === null', null, null],
		['null vs undefined', null, undefined],
		['undefined === undefined', undefined, undefined],
		['NaN === NaN (Object.is)', Number.NaN, Number.NaN],
		['NaN vs 0', Number.NaN, 0],
		['+0 vs -0 (Object.is distinguishes)', 0, -0],
		['-0 vs -0', -0, -0],
		['number vs string', 1, '1'],
		['empty arrays', [], []],
		['equal flat arrays', [1, 2, 3], [1, 2, 3]],
		['array length mismatch', [1, 2], [1, 2, 3]],
		['array element mismatch', [1, 2, 3], [1, 9, 3]],
		['array vs non-array', [1], 1],
		['nested arrays equal', [[1], [2, [3]]], [[1], [2, [3]]]],
		['nested arrays differ deep', [[1], [2, [3]]], [[1], [2, [4]]]],
		['array with NaN element', [Number.NaN], [Number.NaN]],
		['array vs array-like object', [1, 2], { 0: 1, 1: 2, length: 2 }],
		['empty objects', {}, {}],
		['equal flat objects', { a: 1, b: 2 }, { a: 1, b: 2 }],
		['object key order independent', { a: 1, b: 2 }, { b: 2, a: 1 }],
		['same keys different value', { a: 1 }, { a: 2 }],
		['extra key on b', { a: 1 }, { a: 1, b: 2 }],
		['missing key on b', { a: 1, b: 2 }, { a: 1 }],
		['disjoint key sets same size', { a: 1 }, { b: 1 }],
		['object vs array', { 0: 1 }, [1]],
		['object vs primitive', { a: 1 }, 5],
		['deeply nested equal', { a: { b: { c: [1, { d: 2 }] } } }, { a: { b: { c: [1, { d: 2 }] } } }],
		['deeply nested differ', { a: { b: { c: [1, { d: 2 }] } } }, { a: { b: { c: [1, { d: 3 }] } } }],
		['object with NaN value', { a: Number.NaN }, { a: Number.NaN }],
		['object with -0 vs +0 value', { a: -0 }, { a: 0 }],
		['null-prototype object equal', Object.assign(Object.create(null), { a: 1 }), { a: 1 }],
		['date is not a plain record (Object.is leaf, distinct refs)', new Date(0), new Date(0)],
		['same date reference (Object.is leaf, same ref)', SHARED_DATE, SHARED_DATE],
		['regexp is not a plain record (Object.is leaf)', /x/, /x/],
		['function is not a plain record (Object.is leaf)', NOOP, NOOP],
	]

	for (const [label, a, b] of corpus) {
		it(`const-variant matches old constEquals: ${label}`, () => {
			expect(deepEqual(a, b)).toBe(oldConstEquals(a, b))
		})
		it(`schema-variant matches old schemaValueEquals: ${label}`, () => {
			expect(mergedSchemaEquals(a, b)).toBe(oldSchemaValueEquals(a, b))
		})
	}

	// --- Object.is leaf semantics, asserted directly (not just differentially)
	it('NaN equals NaN at a primitive leaf (Object.is, not ===)', () => {
		expect(deepEqual(Number.NaN, Number.NaN)).toBe(true)
		expect(oldConstEquals(Number.NaN, Number.NaN)).toBe(true)
		expect(oldSchemaValueEquals(Number.NaN, Number.NaN)).toBe(true)
	})

	it('+0 is NOT equal to -0 at a primitive leaf (Object.is distinguishes)', () => {
		expect(deepEqual(0, -0)).toBe(false)
		expect(oldConstEquals(0, -0)).toBe(false)
		expect(oldSchemaValueEquals(0, -0)).toBe(false)
	})

	it('NaN/±0 leaf semantics survive through nested object/array recursion', () => {
		expect(deepEqual({ a: [Number.NaN] }, { a: [Number.NaN] })).toBe(true)
		expect(deepEqual({ a: [-0] }, { a: [0] })).toBe(false)
	})

	// --- the throwing-getter axis: the ONE behavioural difference the
	// injected read-strategy parameter exists to preserve.
	it('schema variant: throwing getter on b ONLY ⇒ false, never throws (matches old schemaValueEquals)', () => {
		const a = { boom: 1 }
		const b = throwingGetter()
		// Old behaviour: safeGet(b,'boom') → sentinel → key unequal → false.
		expect(oldSchemaValueEquals(a, b)).toBe(false)
		// Merged schema-variant (refSafeGet injected): identical, no throw.
		expect(mergedSchemaEquals(a, b)).toBe(false)
	})

	it('schema variant: throwing getter on a ONLY ⇒ propagates (a-side is read directly in BOTH old and merged)', () => {
		const a = throwingGetter()
		const b = { boom: 1 }
		// The originals read `a[key]` directly, so an a-side getter throws.
		// The merged helper preserves that (a is the trusted side, read
		// directly) — the schema guard's outer try/catch is what neutralises
		// it observably, NOT the equality function.
		expect(() => oldSchemaValueEquals(a, b)).toThrow('getter exploded')
		expect(() => mergedSchemaEquals(a, b)).toThrow('getter exploded')
	})

	it('schema variant: throwing getter on BOTH sides — old returns false (sentinel short-circuit), merged throws, but the guard-observable outcome is IDENTICAL false', () => {
		const a = throwingGetter()
		const b = throwingGetter()
		// PRE-MERGE FACT: old `schemaValueEquals` evaluates
		// `bChild = safeGet(b,'boom')` → sentinel → `bChild === SENTINEL` is
		// true → `return false` WITHOUT ever reading `a['boom']`. So the old
		// function returns `false` and does NOT throw on both-sides-throw.
		expect(oldSchemaValueEquals(a, b)).toBe(false)
		// MERGED FACT: `deepEqual` reads `bValue = read(b,'boom')` (sentinel,
		// no throw) FIRST, then `Reflect.get(a,'boom')` — a's getter throws
		// and propagates. The equality function itself diverges here (throw
		// vs `false`) ONLY for this both-sides-throw shape, which is reachable
		// ONLY at the `uniqueItems` call site (`enum`/`const` pass a trusted
		// throw-free `a`). It is fully contained: see the guard-level
		// equivalence test below — `compileSchemaGuard`'s documented outer
		// try/catch backstop turns the throw into the SAME `false` the old
		// path returned, so the OBSERVABLE call-site behaviour is identical.
		expect(() => mergedSchemaEquals(a, b)).toThrow('getter exploded')
	})

	it('GUARD-LEVEL equivalence: uniqueItems over an array of two both-throwing objects yields false (the throw is masked by the documented outer backstop, identical to the pre-merge guard)', () => {
		// This is the real observable boundary: the public compiled guard.
		// Pre-merge, `schemaValueEquals(value[i], value[j])` returned `false`
		// for two throwing-getter objects → `uniqueItems` matcher `false` →
		// guard `false`. Post-merge, `deepEqual` throws internally, but
		// `compileSchemaGuard`'s `try { … } catch { return false }` backstop
		// (an intentional §13 defensive catch for any host exception) yields
		// the SAME `false`. Either way the guard's boolean is `false`.
		const guard = compileSchemaGuard({ type: 'array', uniqueItems: true })
		const arrayOfThrowers = [throwingGetter(), throwingGetter()]
		expect(guard(arrayOfThrowers)).toBe(false)
		// And a genuinely-unique array still passes (no false negative).
		expect(guard([{ a: 1 }, { a: 2 }])).toBe(true)
		// A duplicate pair (no throwing getters) is correctly rejected.
		expect(guard([{ a: 1 }, { a: 1 }])).toBe(false)
	})

	it('const variant: throwing getter on b ⇒ propagates (direct read, trusted-input regime, matches old constEquals)', () => {
		const a = { boom: 1 }
		const b = throwingGetter()
		// constEquals never had safeGet — a throwing b-side getter propagates.
		// The default `deepEqual` read (Reflect.get) preserves that exactly.
		expect(() => oldConstEquals(a, b)).toThrow('getter exploded')
		expect(() => deepEqual(a, b)).toThrow('getter exploded')
	})

	it('the merged inline plain-object check equals isRecord-as-used across the corpus', () => {
		// Differential equivalence across the whole corpus already proves the
		// inline discrimination matches `refIsRecord` (the verbatim
		// `isRecord`-as-used). This row makes the claim explicit for the
		// boundary inputs: null-proto record, Date, array-like.
		expect(deepEqual(Object.create(null), {})).toBe(true)
		expect(deepEqual(new Date(0), new Date(0))).toBe(
			Object.is(new Date(0), new Date(0)),
		)
		expect(deepEqual([1], { 0: 1, length: 1 })).toBe(false)
	})

	it('is deterministic — twice with the same operands yields the same boolean', () => {
		const a = { a: [1, { b: Number.NaN }], c: 'x' }
		const b = { a: [1, { b: Number.NaN }], c: 'x' }
		expect(deepEqual(a, b)).toBe(deepEqual(a, b))
		expect(mergedSchemaEquals(a, b)).toBe(mergedSchemaEquals(a, b))
	})
})
