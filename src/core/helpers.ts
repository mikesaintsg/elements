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

/**
 * Validate optional numeric `min`/`max` bounds for a shape builder.
 *
 * @remarks
 * This is a BUILD-TIME programmer-error guard per AGENTS.md §13 — NOT a
 * runtime guard. An inverted / non-finite / nonsensically-negative bound is a
 * programmer error, so it throws at the boundary where the shape is BUILT,
 * not deep in a compiler where the symptom (guard-failing generator output,
 * parser/guard disagreement) would surface far from the cause. Compilers
 * deliberately do NOT re-validate: the shape is already well-formed by the
 * time it reaches them.
 *
 * @param label - Builder name, used verbatim in the thrown message.
 * @param min - The `min` option (length or value lower bound) if supplied.
 * @param max - The `max` option (length or value upper bound) if supplied.
 * @param lengthBound - When true, a negative `min`/`max` is rejected too
 *        (string/array LENGTH can never be negative). Numeric VALUE bounds
 *        may legitimately be negative, so callers pass `false` there.
 * @returns Nothing — completes silently when every bound is well-formed.
 * @throws Error when a bound is non-finite, negative where nonsensical, or
 *         `min` exceeds `max`.
 *
 * @example
 * ```ts
 * validateBounds('stringShape', 1, 80, true) // ok
 * validateBounds('stringShape', 5, 2, true)  // throws: min (5) must not exceed max (2)
 * ```
 */
export function validateBounds(
	label: string,
	min: number | undefined,
	max: number | undefined,
	lengthBound: boolean,
): void {
	if (min !== undefined && !Number.isFinite(min)) {
		throw new Error(`${label}: min must be a finite number`)
	}
	if (max !== undefined && !Number.isFinite(max)) {
		throw new Error(`${label}: max must be a finite number`)
	}
	if (lengthBound && min !== undefined && min < 0) {
		throw new Error(`${label}: min (${min}) must not be negative`)
	}
	if (lengthBound && max !== undefined && max < 0) {
		throw new Error(`${label}: max (${max}) must not be negative`)
	}
	if (min !== undefined && max !== undefined && min > max) {
		throw new Error(`${label}: min (${min}) must not exceed max (${max})`)
	}
}

/**
 * Determine whether a `$ref` string is an EXTERNAL / non-local reference
 * (a different document this resolver was not given).
 *
 * @remarks
 * Local (supported) forms: `#`, `#/...` (URI fragment), `` (empty), and
 * the bare RFC-6901 `/...` form — all of which resolve against the single
 * document `root`. Anything with a scheme (`https:`, `urn:`) or any
 * non-`#` prefix before a `#` (e.g. `other.json#/A`, `defs.json`) names a
 * separate document → external.
 *
 * @param ref - The `$ref` string to classify
 * @returns `true` when `ref` names a separate document; `false` for the
 *          local single-document forms
 *
 * @example
 * ```ts
 * isExternalRef('#/$defs/Id')   // false (local fragment)
 * isExternalRef('/a/b')         // false (bare RFC-6901)
 * isExternalRef('other.json#/A') // true  (external document)
 * ```
 */
export function isExternalRef(ref: string): boolean {
	if (ref === '' || ref === '#' || ref.startsWith('#/') || ref.startsWith('/')) {
		return false
	}
	// A bare `#fragment` with no path is still local; anything else
	// (scheme-prefixed URI, relative document path, doc#fragment) is external.
	return ref !== '#'
}

/**
 * Unescape ONE RFC-6901 reference token: `~1` → `/` then `~0` → `~`.
 *
 * @remarks
 * Order is mandatory: `~1` MUST be replaced before `~0` so the escape
 * sequence `~01` decodes to the literal `~1` rather than being corrupted to
 * `/`. Doing `~0`→`~` first would turn `~01` into `~1` and then `~1`→`/`
 * would corrupt it to `/`.
 *
 * @param token - A single RFC-6901-escaped reference token
 * @returns The unescaped token
 *
 * @example
 * ```ts
 * unescapeToken('a~1b') // 'a/b'
 * unescapeToken('~01')  // '~1' (NOT '/')
 * ```
 */
export function unescapeToken(token: string): string {
	return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

/**
 * `value` is a multiple of `divisor` within IEEE-754 tolerance.
 *
 * @remarks
 * `value / divisor` must be (near) an integer. A small relative epsilon
 * tolerates representation error for common decimal divisors (`0.1`) while
 * still rejecting a clearly non-multiple. `Number.EPSILON * 8 * |quotient|`
 * is a few-ULP relative band that cleanly separates a genuine division
 * rounding error (`0.3 / 0.1` lands ~6.7e-16 off 3) from a clearly
 * non-multiple (`0.30000000000001 / 0.1` is ~1e-13 off, ~150x larger).
 *
 * @param value - The dividend
 * @param divisor - The divisor (a zero divisor yields `false`)
 * @returns `true` when `value` is a multiple of `divisor` within tolerance
 *
 * @example
 * ```ts
 * isMultipleOf(0.3, 0.1) // true  (tolerates IEEE-754 error)
 * isMultipleOf(7, 2)     // false
 * isMultipleOf(5, 0)     // false (zero divisor)
 * ```
 */
export function isMultipleOf(value: number, divisor: number): boolean {
	if (divisor === 0) {
		return false
	}
	const quotient = value / divisor
	const rounded = Math.round(quotient)
	if (rounded === quotient) {
		return true
	}
	// Tolerate ONLY genuine IEEE-754 representation error of the division
	// (a few ULPs of the quotient — `0.3 / 0.1` lands ~6.7e-16 off 3),
	// while still rejecting a clearly non-multiple (`0.30000000000001 / 0.1`
	// is ~1e-13 off, ~150x larger). `Number.EPSILON * 8 * |quotient|` is a
	// few-ULP relative band that cleanly separates the two (design note 7).
	const epsilon = Number.EPSILON * 8 * Math.max(1, Math.abs(quotient))
	return Math.abs(quotient - rounded) <= epsilon
}
