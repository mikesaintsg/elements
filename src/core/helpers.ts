import type {
	AnyConstructor,
	ContractShape,
	IntersectionShape,
	ObjectShape,
	RandomFunction,
	Result,
} from './types.js'
import { CYCLIC_SHAPE_MESSAGE } from './constants.js'

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
 * Assert that a {@link ContractShape} tree contains no non-lazy structural
 * cycle, throwing the precise {@link CYCLIC_SHAPE_MESSAGE} on a back-edge.
 *
 * @remarks
 * This is a BUILD-TIME programmer-error throw per AGENTS.md §13 — NOT a
 * runtime guard. A cyclic shape built WITHOUT a lazy/deferred wrapper is a
 * programmer error (a property whose shape IS an ancestor object, no lazy
 * boundary), so every public compiler validates the tree is acyclic ONCE, up
 * front, and fails fast with this precise message that names the defect and
 * points at the fix — never a bare `RangeError` from V8, and never a
 * silently-broken compiled function.
 *
 * `seen` tracks the ANCESTOR path (added on entry, removed on exit), so it is
 * a true back-edge detector: a shared-but-acyclic sub-shape (the same child
 * shape object referenced under two sibling keys — a DAG, perfectly valid) is
 * fully walked and removed before its second occurrence is visited, so it is
 * never misreported as a cycle. The `'lazy'` arm is a TERMINAL — the thunk is
 * deliberately NOT invoked, since the deferral is the only sanctioned
 * recursion mechanism that legitimately breaks a static shape cycle. `const`
 * and `raw` are likewise terminals (their `value` is DATA, never a child
 * shape). The wrapper kinds (`optional`/`nullable`/`default`) recurse into
 * `inner` exactly like array/tuple/object/union/intersection do, so a cycle
 * threaded through a wrapper still throws.
 *
 * @param shape - The root shape to walk
 * @param seen - The mutable ancestor-path set (callers pass a fresh
 *        `new WeakSet<ContractShape>()`)
 * @returns Nothing — completes silently when the tree is acyclic.
 * @throws Error with {@link CYCLIC_SHAPE_MESSAGE} on a non-lazy structural
 *         shape cycle.
 *
 * @example
 * ```ts
 * assertAcyclicShape(objectShape({ a: stringShape() }), new WeakSet()) // ok
 * ```
 */
export function assertAcyclicShape(shape: ContractShape, seen: WeakSet<ContractShape>): void {
	if (seen.has(shape)) {
		throw new Error(CYCLIC_SHAPE_MESSAGE)
	}
	switch (shape.type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'literal':
		case 'const':
		// `const` is a TERMINAL like `literal`/`raw`/primitives: its `value`
		// is a DATA value, never a child SHAPE, so there is no edge to
		// traverse and it can never participate in a structural shape cycle.
		case 'raw':
			return
		case 'lazy':
			// B5 RECONCILIATION — `lazy` is the cycle-BREAKER, so it is a
			// TERMINAL here: the thunk is DELIBERATELY NOT invoked during
			// acyclicity checking. The thunk is the deferral that legitimately
			// breaks a static shape cycle, so a shape recursive THROUGH a
			// `lazyShape` (e.g. a tree whose `children` is
			// `arrayShape(lazyShape(() => treeShape))`) has NO structural
			// back-edge for `seen` to catch and therefore compiles. A NON-lazy
			// structural cycle (`makeCyclicShape`-style: a property whose
			// shape IS an ancestor object, no lazy wrapper) still hits the
			// `seen.has(shape)` throw at the top of this function, so the
			// precise §13/B5 Error is preserved for every unsanctioned cycle.
			// Returning WITHOUT recursing into `thunk()` is exactly what makes
			// the lazy boundary the only sanctioned recursion mechanism.
			return
		case 'array': {
			seen.add(shape)
			assertAcyclicShape(shape.items, seen)
			seen.delete(shape)
			return
		}
		case 'tuple': {
			seen.add(shape)
			for (const item of shape.items) {
				assertAcyclicShape(item, seen)
			}
			seen.delete(shape)
			return
		}
		case 'object': {
			seen.add(shape)
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child !== undefined) {
					assertAcyclicShape(child, seen)
				}
			}
			if (isShapeAdditional(shape.additionalProperties)) {
				assertAcyclicShape(shape.additionalProperties, seen)
			}
			seen.delete(shape)
			return
		}
		case 'union': {
			seen.add(shape)
			for (const variant of shape.variants) {
				assertAcyclicShape(variant, seen)
			}
			seen.delete(shape)
			return
		}
		case 'intersection': {
			seen.add(shape)
			for (const member of shape.members) {
				assertAcyclicShape(member, seen)
			}
			seen.delete(shape)
			return
		}
		case 'optional':
		case 'nullable':
		case 'default': {
			// `default` RECURSES into `inner` exactly like the other wrapper
			// kinds (optional/nullable): a non-lazy structural cycle THROUGH a
			// defaultShape (an object whose property's shape IS the object,
			// wrapped in `default`) is a genuine back-edge and MUST still
			// throw the precise B5 §13 Error. A lazy boundary nested in
			// `inner` is the only thing that legitimately breaks such a cycle
			// (it is a terminal in the `'lazy'` arm above), exactly as for
			// optional/nullable.
			seen.add(shape)
			assertAcyclicShape(shape.inner, seen)
			seen.delete(shape)
			return
		}
	}
}

/**
 * Determine whether an object PROPERTY whose shape is `shape` may be absent
 * at the GUARD / SCHEMA / GENERATOR level.
 *
 * @remarks
 * Before `defaultShape` this was exactly `shape.type === 'optional'`.
 * `defaultShape` introduces a DELIBERATE asymmetry the spec calls out: a
 * `default` is advisory metadata, NOT optionality — the guard is INNER's
 * guard and does NOT auto-apply the default. So a `default` property permits
 * absence ONLY when its (possibly nested-`default`) inner is itself
 * `optional` — i.e. the inner guard already accepts `undefined`. A
 * `defaultShape(integerShape(), 3)` property is REQUIRED by the guard; a
 * `defaultShape(optionalShape(x), …)` property may be absent. This recurses
 * through nested `default` wrappers to that decision and is a no-op for every
 * other kind (`optional` → `true`, everything else → `false`; `nullable`
 * accepts `null`, not absence, so it stays required). The separate
 * parser-only rule (an absent `default` key applies the default rather than
 * failing) lives inline in the object parser arm, not here.
 *
 * @param shape - The property's shape
 * @returns `true` when a property of this shape may be absent at the
 *          guard/schema/generator level; `false` otherwise.
 *
 * @example
 * ```ts
 * guardPermitsAbsence(optionalShape(stringShape()))      // true
 * guardPermitsAbsence(defaultShape(integerShape(), 3))   // false (required)
 * ```
 */
export function guardPermitsAbsence(shape: ContractShape): boolean {
	if (shape.type === 'optional') {
		return true
	}
	if (shape.type === 'default') {
		// Guard == inner's guard, so absence is permitted at the guard/schema
		// level ONLY if the inner itself permits absence (its guard accepts
		// `undefined`). Recurses through nested `default` wrappers.
		return guardPermitsAbsence(shape.inner)
	}
	return false
}

/**
 * Flatten an {@link IntersectionShape} to its effective leaf
 * {@link ObjectShape} members, recursing through nested intersections.
 *
 * @remarks
 * `intersectionShape` (§13) guarantees every member is an OBJECT shape or a
 * nested `intersection`. The guard and parser arms need the EFFECTIVE leaf
 * object members (a nested intersection contributes its own object members,
 * transitively) so the merged-key universe and closed/open policy are
 * computed over every real object member, not just the direct ones. The shape
 * is already proven acyclic by {@link assertAcyclicShape} before any compile,
 * so this recursion terminates.
 *
 * @param shape - The intersection shape to flatten
 * @returns The transitively-collected leaf object members, in member order.
 *
 * @example
 * ```ts
 * flattenIntersectionObjects(
 *   intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: numberShape() })),
 * ) // [ObjectShape<{a}>, ObjectShape<{b}>]
 * ```
 */
export function flattenIntersectionObjects(shape: IntersectionShape): readonly ObjectShape[] {
	const out: ObjectShape[] = []
	for (const member of shape.members) {
		if (member.type === 'object') {
			out.push(member)
		} else if (member.type === 'intersection') {
			for (const nested of flattenIntersectionObjects(member)) {
				out.push(nested)
			}
		}
	}
	return out
}

/**
 * Type-guard predicate: `value` is a non-null object.
 *
 * @remarks
 * The only kind of value that can form a DATA cycle / be tracked on a
 * per-compilation ancestor `WeakSet`. Mirrors the `isRecord`/array
 * discrimination the B5 cycle detection uses — arrays AND plain objects both
 * qualify (`typeof value === 'object' && value !== null`).
 *
 * @param value - The value to test
 * @returns `true` (narrowing to `object`) when `value` is a non-null object.
 *
 * @example
 * ```ts
 * isTrackableObject({})    // true
 * isTrackableObject([])    // true
 * isTrackableObject(null)  // false
 * ```
 */
export function isTrackableObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null
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
 * `value / divisor` must be (near) an integer. A small ABSOLUTE epsilon on
 * the quotient (`Number.EPSILON * 8`, ~1.8e-15) tolerates the genuine
 * IEEE-754 rounding error of the division for common decimal divisors —
 * `0.3 / 0.1` lands ~4.4e-16 off 3, `0.6 / 0.1` ~8.9e-16 off 6 — while
 * still rejecting a clearly non-multiple (`0.30000000000001 / 0.1` is
 * ~1e-13 off, ~50x the band). The band is deliberately NOT scaled by
 * `|quotient|`: a quotient-proportional band grows without bound at large
 * magnitude (for `MAX_SAFE_INTEGER / 2` it reached ~8, swallowing the 0.5
 * residual of an odd/2 division and falsely accepting odd integers). A
 * fixed band is sound because an exact large-magnitude integer division
 * has zero rounding error (it stays accepted), whereas a non-multiple's
 * residual is a meaningful fraction that always dwarfs ~1.8e-15.
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
	// (`0.3 / 0.1` lands ~4.4e-16 off 3) with a FIXED absolute band — NOT
	// scaled by |quotient|, which would grow unbounded and falsely accept
	// large odd integers as multiples of 2 (FU10 §13). An exact large
	// division rounds to zero error so it still passes; a non-multiple's
	// residual always exceeds ~1.8e-15.
	const epsilon = Number.EPSILON * 8
	return Math.abs(quotient - rounded) <= epsilon
}
