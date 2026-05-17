import type { AnyConstructor, ContractShape, RandomFunction, Result } from './types.js'

/**
 * Invoke a user-supplied callback and capture the outcome as a {@link Result},
 * never letting a throw escape.
 *
 * @remarks
 * Combinators such as `transformOf`, `whereOf`, and `lazyOf` invoke a
 * caller-supplied projector / predicate / factory *inside the runtime guard
 * body*. Those callbacks are plain user functions with no never-throw
 * contract, yet per AGENTS.md §13 a guard must NEVER throw — it returns a
 * `boolean`. This helper is the single sanctioned boundary that converts a
 * throwing callback into a `Failure` so the surrounding guard can treat it as
 * a non-match instead of propagating the exception. It exists so the
 * containment is written once and shared, not copy-pasted as ad-hoc
 * `try`/`catch` across every combinator (§20). Build-time programmer-error
 * checks must NOT route through this helper — a genuine §13 build-boundary
 * throw is the correct behaviour there.
 *
 * @param callback - The user-supplied callback to invoke with no arguments
 * @returns A `Success` carrying the return value, or a `Failure` carrying the
 *          thrown reason normalised to an `Error`
 *
 * @example
 * ```ts
 * const outcome = attempt(() => project(value))
 * if (!outcome.success) {
 *     return false // contain the throw — the guard reports a non-match
 * }
 * use(outcome.value)
 * ```
 */
export function attempt<T>(callback: () => T): Result<T> {
	try {
		return { success: true, value: callback() }
	} catch (reason) {
		return {
			success: false,
			error: reason instanceof Error ? reason : new Error(String(reason)),
		}
	}
}

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

/**
 * Determine whether an `ObjectShape.additionalProperties` slot carries a nested
 * {@link ContractShape} (a "typed open object") rather than a boolean flag or
 * absence.
 *
 * @remarks
 * `additionalProperties` is `boolean | ContractShape | undefined`:
 * - `undefined` / `false` — closed object (unknown keys rejected)
 * - `true` — open object (unknown keys accepted as-is)
 * - `ContractShape` — open object whose unknown values are validated against the
 *   nested shape
 *
 * Only the last case requires recursively compiling the nested shape. Every
 * `ContractShape` is a discriminated object (`{ readonly type: … }`) and is
 * never `null`, so a single `typeof value === 'object'` test is precisely
 * equivalent to the long-hand `value !== undefined && value !== true &&
 * value !== false && typeof value === 'object'` predicate this guard replaces —
 * `typeof` already yields `'undefined'` / `'boolean'` for the excluded cases,
 * making the extra `!==` comparisons redundant (kept implicitly here, not
 * dropped behaviour). The check reads no properties off `value`, so it cannot
 * trip a `__proto__`/`constructor` accessor and is prototype-pollution-safe.
 *
 * @param value - The `additionalProperties` slot to classify
 * @returns `true` (narrowing to {@link ContractShape}) when the slot is a
 *          nested shape; `false` for `undefined`, `true`, and `false`
 *
 * @example
 * ```ts
 * isShapeAdditional(undefined)            // false (closed)
 * isShapeAdditional(true)                 // false (open passthrough)
 * isShapeAdditional(numberShape())        // true  (typed open object)
 * ```
 */
export function isShapeAdditional(
	value: boolean | ContractShape | undefined,
): value is ContractShape {
	return typeof value === 'object'
}
