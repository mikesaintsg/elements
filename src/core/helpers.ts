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
 * Two regimes:
 *
 * - **Exact integer fast-path**: when both operands are integers,
 *   `value % divisor === 0` is exact (integer arithmetic on safe doubles
 *   carries no rounding slop). This is what makes a large odd integer
 *   divided by a small integer SOUND with no tolerance argument at all —
 *   `9007199254740991 % 2 === 1`, so it rejects (returns `false`).
 *
 * - **Value-space band, double-bounded** for non-integer operands:
 *   reconstruct `rounded * divisor` and compare the residual in VALUE space
 *   (`|value - rounded*divisor|`) against a tolerance that is the MINIMUM of
 *   two bounds: a magnitude band (`8 * Number.EPSILON * max(|value|,
 *   |reconstructed|)`) and a divisor cap (`|divisor| / 16`). The magnitude
 *   band tracks the operands' own ULP so legitimate IEEE-754 division error
 *   for normal-magnitude decimals is absorbed (`0.28 / 0.01`, quotient
 *   `27.999999999999996`, through large money `1234567890.12 / 0.01` all
 *   accept). The divisor cap is the soundness floor: a genuine non-multiple's
 *   value-space residual is at least a fraction of `|divisor|`, so capping
 *   the tolerance at `|divisor| / 16` means the band can NEVER reach a
 *   genuine miss whose residual is `≥ |divisor| / 16` — soundness no longer
 *   degrades as `|value|` grows (the magnitude-only band of earlier
 *   revisions grew unbounded and falsely accepted distinct-representable
 *   non-multiples once `|value| ≳ 2.8e12`; the cap removes that).
 *
 * - **Inherent IEEE-754 precision wall (bounded limitation)**: this is NOT
 *   complete at every magnitude. The cap removes the tolerance-driven
 *   false-accept, but it cannot help the early `quotient === rounded`
 *   exact-integer return: once `|value|` is large enough that `value /
 *   divisor` has no fractional bits left (empirically `|value| ≳ ~1e13` for
 *   `divisor = 0.01`, `~1e14` for `divisor = 0.1`, `~4.4e12` for
 *   `divisor = 0.001`), a genuine non-multiple's quotient collapses to
 *   an exact integer double and is indistinguishable from a true multiple by
 *   ANY tolerance scheme — so it is (wrongly) accepted there. This is
 *   unavoidable with doubles. Conversely, beyond `|value| ≳ |divisor| ·
 *   8.8e12` a genuinely-representable decimal multiple may be (wrongly)
 *   rejected. The predicate deliberately biases toward SOUNDNESS at realistic
 *   JSON-Schema magnitudes (cents/money ≤ ~1e11–1e12, where it is both sound
 *   and complete) and accepts the structural exotic-magnitude wall above that
 *   as a known, bounded cost. It does NOT claim correctness at every
 *   magnitude.
 *
 * @param value - The dividend
 * @param divisor - The divisor (a zero divisor yields `false`)
 * @returns `true` when `value` is a multiple of `divisor` within tolerance;
 *   sound and complete for realistic magnitudes (≤ ~1e11–1e12), subject to
 *   the documented inherent IEEE-754 precision wall above that
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
	// Exact integer fast-path: integer % integer on safe doubles is exact,
	// so a large odd integer ÷ small integer is SOUND with no tolerance
	// (`9007199254740991 % 2 === 1` → false). FU10 §13.
	if (Number.isInteger(value) && Number.isInteger(divisor)) {
		return value % divisor === 0
	}
	const quotient = value / divisor
	const rounded = Math.round(quotient)
	if (rounded === quotient) {
		return true
	}
	// Non-integer operands: compare the VALUE-space residual against the
	// MIN of a magnitude band and a divisor cap. The magnitude band absorbs
	// legitimate IEEE-754 division error for normal-magnitude decimals
	// (cents → large money); the `|divisor| / 16` cap is the soundness
	// floor — a genuine non-multiple's residual is at least a fraction of
	// `|divisor|`, so the band can never reach a miss `≥ |divisor| / 16`,
	// which stops the magnitude-only false-accept that grew with `|value|`.
	// Above the documented IEEE-754 precision wall (`|value| ≳ ~1e13` for
	// `divisor` `0.01`) the upstream `quotient === rounded` return still
	// (wrongly) accepts some exotic-magnitude non-multiples — unavoidable
	// with doubles; soundness-biased at realistic magnitudes (FU10 follow-up).
	const reconstructed = rounded * divisor
	const magnitudeBand =
		Number.EPSILON * 8 * Math.max(Math.abs(value), Math.abs(reconstructed))
	const divisorCap = Math.abs(divisor) / 16
	const tolerance = Math.min(magnitudeBand, divisorCap)
	return Math.abs(value - reconstructed) <= tolerance
}

/**
 * Read one own property value off the right-hand operand of {@link deepEqual}.
 *
 * @remarks
 * `deepEqual` reads the LEFT operand's property values directly (the trusted
 * finite side) but routes every RIGHT-operand plain-object property value
 * through this strategy so the caller chooses the read discipline:
 *
 * - The default (`compilers.ts` `const`) is a direct `Reflect.get` — the
 *   trusted-input regime where a throwing accessor SHOULD propagate.
 * - The hardened variant (`schema.ts` `enum`/`const`/`uniqueItems`) closes
 *   over a `try`-wrapped read that returns a module-private sentinel on a
 *   throwing getter; `deepEqual` then compares that opaque sentinel against
 *   the trusted left value and reports inequality. The sentinel and its
 *   throw-containment stay entirely inside `schema.ts` — this module never
 *   imports it.
 *
 * Array elements are NOT routed through this strategy (both original
 * implementations indexed array elements directly); only RIGHT-operand
 * plain-object own-property values are.
 *
 * @param object - The right-hand operand (a plain object)
 * @param key - The own enumerable string key to read
 * @returns The opaque property value, however the strategy chooses to obtain
 *          it
 */
export type PropertyReader = (object: object, key: string) => unknown

/**
 * Recursive structural deep-equality over finite JSON-shaped values.
 *
 * @remarks
 * One shared implementation behind JSON-Schema `const` (compilers) and
 * `enum`/`const`/`uniqueItems` (the inverse subsystem). The algorithm:
 *
 * - **Array** — when `a` is an array, `b` must be an array of the SAME
 *   `length` and every element must be positionally deep-equal. Array
 *   elements are read by direct index on both sides (never via `read`).
 * - **Primitive leaf** — when `a` is neither an array nor a plain object the
 *   result is `Object.is(a, b)`. `Object.is` (not `===`) is deliberate and
 *   project-wide: `NaN` equals `NaN`, and `+0` is DISTINCT from `-0`.
 * - **Plain object** — when `a` is a plain object (a `null`-prototype or
 *   `Object.prototype`-prototype non-array — the inline discrimination is
 *   behaviourally identical to validators' `isRecord` as used by the two
 *   originals: array-excluded, prototype pinned to `Object.prototype` or
 *   `null`), `b` must also be a plain object with an own-key set of the SAME
 *   size, every `a` key must be an own key of `b` (`Object.hasOwn`, so an
 *   inherited key is never mistaken for a present own property — B2
 *   prototype-pollution discipline), and the values must be deep-equal.
 *   `a`'s property values are read directly (`a` is the trusted finite side);
 *   `b`'s property values flow through {@link PropertyReader} so the caller
 *   owns the untrusted-input read discipline.
 *
 * `a` is the trusted SCHEMA-supplied operand — a finite acyclic `JsonValue`
 * — so the recursion is bounded by `a`'s finite shape regardless of `b`
 * (the untrusted input); no cycle/depth guard is needed. Total per AGENTS.md
 * §13 when `read` is total (the default `Reflect.get` propagates a throwing
 * accessor by design — that is the trusted-input contract; the hardened
 * `schema.ts` variant supplies a non-throwing `read`).
 *
 * @param a - The trusted left operand (a finite acyclic JSON value)
 * @param b - The untrusted right operand to compare structurally against `a`
 * @param read - Strategy for reading `b`'s plain-object own-property values;
 *        defaults to a direct `Reflect.get` (trusted-input regime)
 * @returns `true` when `a` and `b` are structurally deep-equal under the
 *          above rules
 *
 * @example
 * ```ts
 * deepEqual({ a: [1, 2] }, { a: [1, 2] })          // true
 * deepEqual(Number.NaN, Number.NaN)                // true  (Object.is)
 * deepEqual(0, -0)                                 // false (Object.is)
 * deepEqual({ a: 1 }, { a: 1, b: 2 })              // false (key-set differs)
 * ```
 */
export function deepEqual(
	a: unknown,
	b: unknown,
	read: PropertyReader = Reflect.get,
): boolean {
	if (Array.isArray(a)) {
		// `a` is an array: `b` must be an array of equal length whose elements
		// are positionally deep-equal. Both sides indexed directly (the two
		// originals never routed array elements through the read strategy).
		const aArray: readonly unknown[] = a
		if (!Array.isArray(b) || aArray.length !== b.length) {
			return false
		}
		const bArray: readonly unknown[] = b
		for (let index = 0; index < aArray.length; index += 1) {
			if (!deepEqual(aArray[index], bArray[index], read)) {
				return false
			}
		}
		return true
	}
	if (!isPlainObject(a)) {
		// Primitive / non-plain leaf: `Object.is` so `NaN` === `NaN` and
		// `+0` ≠ `-0` (aligned with validators' `literalOf`).
		return Object.is(a, b)
	}
	// `a` is a plain object: `b` must be a plain object with the IDENTICAL
	// own-key set and every value deep-equal. Presence is tested via
	// `Object.hasOwn` so an inherited key is never mistaken for an own one.
	if (!isPlainObject(b)) {
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
		// Read `b`'s value through the injected strategy FIRST, then `a`'s
		// (read directly — `a` is the trusted finite side). This evaluation
		// order is load-bearing: it matches the original `schemaValueEquals`
		// exactly, where `bChild = safeGet(b, key)` is evaluated and its
		// throwing-getter sentinel checked BEFORE `a[key]` is ever touched.
		// The hardened `schema.ts` variant's `read` returns a module-private
		// sentinel on a throwing `b` getter; that sentinel is an opaque
		// `unique symbol` that can never structurally equal a finite JSON `a`
		// value, so the comparison below yields `false` — the exact
		// `bChild === SAFE_GET_THREW ⇒ false` outcome. (For the `const`
		// variant `read` is a direct `Reflect.get`; reordering vs the old
		// `constEquals(a[key], b[key])` is unobservable there because `a` —
		// the trusted const — never carries a throwing accessor, so the only
		// order-sensitive case, BOTH sides throwing, is unreachable.)
		const bValue = read(b, key)
		if (!deepEqual(Reflect.get(a, key), bValue, read)) {
			return false
		}
	}
	return true
}

/**
 * Inline plain-object discrimination for {@link deepEqual}.
 *
 * @remarks
 * `helpers.ts` is a low-level leaf module: it must import ONLY `./types.js`
 * and `./constants.js` (importing validators' `isRecord` would create an
 * import cycle, since validators/compilers/schema import FROM here). This is
 * a verbatim inline of `isRecord` AS USED by the two original equality
 * functions: a non-`null` `object` that is not an array and whose prototype
 * is exactly `Object.prototype` or `null`. (`isRecord` is
 * `isObject(v) && !isArray(v) && (proto === Object.prototype || proto ===
 * null)`; `isObject` is `typeof v === 'object' && v !== null`, `isArray` is
 * `Array.isArray` — replicated exactly here.)
 *
 * @param value - The value to classify
 * @returns `true` when `value` is a plain record (literal or
 *          `Object.create(null)`), `false` otherwise
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false
	}
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}
