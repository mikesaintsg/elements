import type { AnyConstructor, RandomFunction } from './types.js'

/**
 * Deterministic Mulberry32 PRNG. Same seed → same `[0, 1)` sequence.
 *
 * @param seed - Unsigned 32-bit seed
 * @returns A pure function yielding the next value in the sequence
 *
 * @example
 * ```ts
 * const random = createRandom(42)
 * random() // 0.xxx — deterministic
 * ```
 */
export function createRandom(seed: number): RandomFunction {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * Count the enumerable own-symbol keys on a value.
 *
 * String keys are ignored — only `Object.getOwnPropertySymbols` entries whose
 * descriptor is `enumerable` are counted. Used by the object-emptiness guards
 * (`isEmptyObject` / `isNonEmptyObject`) so a record keyed only by an
 * enumerable symbol is not mistaken for empty.
 *
 * @param value - The object to inspect
 * @returns The number of enumerable own-symbol keys
 *
 * @example
 * ```ts
 * const flag = Symbol('flag')
 * enumerableSymbolCount(Object.defineProperty({}, flag, { value: 1, enumerable: true })) // 1
 * enumerableSymbolCount({}) // 0
 * ```
 */
export function enumerableSymbolCount(value: object): number {
	let count = 0
	for (const symbol of Object.getOwnPropertySymbols(value)) {
		if (Object.getOwnPropertyDescriptor(value, symbol)?.enumerable) {
			count += 1
		}
	}
	return count
}

/**
 * Determine whether a value can be used as a `newTarget` constructor.
 *
 * Probes with `Reflect.construct(String, [], value)`: a real constructor
 * succeeds, while arrow functions, plain functions, and non-functions throw and
 * yield `false`. Never throws. Backs the `instanceOf` compositor.
 *
 * @param value - The value to test
 * @returns `true` when `value` is a constructable function
 *
 * @example
 * ```ts
 * isConstructor(class Example {}) // true
 * isConstructor(() => undefined) // false
 * ```
 */
export function isConstructor(value: unknown): value is AnyConstructor<object> {
	if (typeof value !== 'function') {
		return false
	}

	try {
		Reflect.construct(String, [], value)
		return true
	} catch {
		return false
	}
}
