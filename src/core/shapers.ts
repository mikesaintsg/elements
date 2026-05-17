import type {
	ArrayShape,
	ArrayShapeOptions,
	BooleanShape,
	BooleanShapeOptions,
	ContractShape,
	NullableShape,
	NumberShape,
	NumberShapeOptions,
	ObjectShape,
	ObjectShapeOptions,
	OptionalShape,
	JsonSchema,
	RawShape,
	StringShape,
	StringShapeOptions,
	UnionShape,
} from './types.js'

// === Build-time bounds validation
//
// AGENTS.md §13: an inverted / non-finite / nonsensically-negative bound is a
// PROGRAMMER ERROR, so it throws at the boundary where the shape is BUILT —
// not deep in a compiler where the symptom (guard-failing generator output,
// parser/guard disagreement) would surface far from the cause. Compilers
// deliberately do NOT re-validate: the shape is already well-formed by the
// time it reaches them.

/**
 * Validate optional numeric `min`/`max` bounds for a shape builder.
 *
 * @param label - Builder name, used verbatim in the thrown message.
 * @param min - The `min` option (length or value lower bound) if supplied.
 * @param max - The `max` option (length or value upper bound) if supplied.
 * @param lengthBound - When true, a negative `min`/`max` is rejected too
 *        (string/array LENGTH can never be negative). Numeric VALUE bounds
 *        may legitimately be negative, so callers pass `false` there.
 * @throws Error when a bound is non-finite, negative where nonsensical, or
 *         `min` exceeds `max`.
 */
function validateBounds(
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

// === String

/**
 * Build a {@link StringShape}.
 *
 * @remarks
 * Throws if `min`/`max` are not finite, are negative, or `min > max`
 * (programmer error per AGENTS.md §13 — caught at build, not in a compiler).
 *
 * @example
 * ```ts
 * const name = stringShape({ min: 1, max: 80, description: 'Display name' })
 * ```
 */
export function stringShape(options?: StringShapeOptions): StringShape {
	validateBounds('stringShape', options?.min, options?.max, true)
	return {
		type: 'string',
		min: options?.min,
		max: options?.max,
		pattern: options?.pattern,
		description: options?.description,
	}
}

// === Number

/**
 * Build a {@link NumberShape}.
 *
 * @remarks
 * Throws if `min`/`max` are not finite or `min > max`. A negative numeric
 * VALUE bound is allowed (unlike string/array length) — programmer error per
 * AGENTS.md §13.
 */
export function numberShape(options?: NumberShapeOptions): NumberShape {
	validateBounds('numberShape', options?.min, options?.max, false)
	return {
		type: 'number',
		min: options?.min,
		max: options?.max,
		integer: options?.integer,
		description: options?.description,
	}
}

/**
 * Build an integer {@link NumberShape}.
 *
 * @remarks
 * Convenience wrapper that forces `integer: true`. The emitted JSON
 * Schema uses `"type": "integer"`.
 */
export function integerShape(options?: Omit<NumberShapeOptions, 'integer'>): NumberShape {
	validateBounds('integerShape', options?.min, options?.max, false)
	return {
		type: 'number',
		integer: true,
		min: options?.min,
		max: options?.max,
		description: options?.description,
	}
}

// === Boolean

/** Build a {@link BooleanShape}. */
export function booleanShape(options?: BooleanShapeOptions): BooleanShape {
	return {
		type: 'boolean',
		description: options?.description,
	}
}

// === Literal

/**
 * Build a {@link LiteralShape} from a fixed set of primitive values.
 *
 * @example
 * ```ts
 * const role = literalShape('admin', 'member', 'guest')
 * // Infer<typeof role> = 'admin' | 'member' | 'guest'
 * ```
 */
export function literalShape<const T extends readonly (string | number | boolean)[]>(
	...values: T
): { readonly type: 'literal'; readonly values: T } {
	// An empty literal is uninhabited — no value can ever satisfy it.
	// Programmer error caught at the build boundary (§13), so no compiler
	// has to special-case a values-less literal.
	if (values.length === 0) {
		throw new Error('literalShape requires at least one value')
	}
	return { type: 'literal', values }
}

// === Array

/**
 * Build an {@link ArrayShape}.
 *
 * @remarks
 * Throws if the length `min`/`max` are not finite, are negative, or
 * `min > max` (programmer error per AGENTS.md §13).
 *
 * @example
 * ```ts
 * const tags = arrayShape(stringShape(), { max: 10 })
 * ```
 */
export function arrayShape<S extends ContractShape>(
	items: S,
	options?: ArrayShapeOptions,
): { readonly type: 'array'; readonly items: S } & ArrayShape {
	validateBounds('arrayShape', options?.min, options?.max, true)
	return {
		type: 'array',
		items,
		min: options?.min,
		max: options?.max,
		description: options?.description,
	}
}

// === Object

/**
 * Build an {@link ObjectShape} from a property map.
 *
 * @remarks
 * Wrap any property in {@link optionalShape} to mark it absent-allowed.
 * The compiled guard rejects unknown keys.
 *
 * @example
 * ```ts
 * const user = objectShape({
 *     name: stringShape({ min: 1 }),
 *     age:  integerShape({ min: 0, max: 120 }),
 *     bio:  optionalShape(stringShape()),
 * })
 * ```
 */
export function objectShape<P extends Readonly<Record<string, ContractShape>>>(
	properties: P,
	options?: ObjectShapeOptions,
): { readonly type: 'object'; readonly properties: P } & ObjectShape {
	return {
		type: 'object',
		properties,
		additionalProperties: options?.additionalProperties,
		description: options?.description,
	}
}

// === Union

/**
 * Build a {@link UnionShape} from a list of variant shapes.
 *
 * @example
 * ```ts
 * const id = unionShape(stringShape(), integerShape())
 * // Infer<typeof id> = string | number
 * ```
 */
export function unionShape<V extends readonly ContractShape[]>(
	...variants: V
): { readonly type: 'union'; readonly variants: V } & UnionShape {
	// An empty union is uninhabited — programmer error at the build boundary
	// (§13), so the generator no longer needs an empty-variants guard.
	if (variants.length === 0) {
		throw new Error('unionShape requires at least one variant')
	}
	return { type: 'union', variants }
}

// === Optional / Nullable

/**
 * Wrap a shape so it may be absent.
 *
 * @remarks
 * Inside an {@link objectShape}, optional properties become true
 * optional fields in the inferred type.
 */
export function optionalShape<S extends ContractShape>(
	inner: S,
): { readonly type: 'optional'; readonly inner: S } & OptionalShape {
	return { type: 'optional', inner }
}

/** Wrap a shape so it may be `null`. */
export function nullableShape<S extends ContractShape>(
	inner: S,
): { readonly type: 'nullable'; readonly inner: S } & NullableShape {
	return { type: 'nullable', inner }
}

// === OneOf

/**
 * Build a {@link UnionShape} that emits `oneOf` in JSON Schema.
 *
 * @remarks
 * Enforces JSON-Schema `oneOf` semantics at runtime: a value is valid iff
 * it matches EXACTLY ONE variant. This differs from {@link unionShape}
 * (`anyOf`), which accepts a value matching one OR MORE variants. The
 * emitted JSON Schema keyword (`oneOf` vs `anyOf`) matches the runtime rule.
 *
 * The compiled parser succeeds only when exactly one variant parses to a
 * guard-valid result; if two or more variants would each yield a guard-valid
 * result the exclusivity contract is violated and the parser returns
 * `undefined` (it never silently picks a winner).
 *
 * @example
 * ```ts
 * const idOrFlag = oneOfShape(stringShape(), booleanShape())
 * // JSON Schema: { oneOf: [{ type: 'string' }, { type: 'boolean' }] }
 * ```
 */
export function oneOfShape<V extends readonly ContractShape[]>(
	...variants: V
): { readonly type: 'union'; readonly variants: V; readonly mode: 'oneOf' } & UnionShape {
	// An empty oneOf is uninhabited — programmer error at the build boundary
	// (§13).
	if (variants.length === 0) {
		throw new Error('oneOfShape requires at least one variant')
	}
	return { type: 'union', variants, mode: 'oneOf' }
}

// === Record

/**
 * Build an open {@link ObjectShape} with no fixed properties.
 *
 * @remarks
 * Convenience wrapper for `objectShape({}, { additionalProperties: values })`.
 * Useful for dictionary-like structures such as `Record<string, number>`.
 *
 * @example
 * ```ts
 * const bindings = recordShape(numberShape(), { description: 'Variable bindings' })
 * // JSON Schema: { type: 'object', additionalProperties: { type: 'number' } }
 * ```
 */
export function recordShape<S extends ContractShape>(
	values: S,
	options?: { readonly description?: string },
): {
	readonly type: 'object'
	readonly properties: Record<string, never>
	readonly additionalProperties: S
} & ObjectShape {
	return {
		type: 'object',
		properties: {},
		additionalProperties: values,
		description: options?.description,
	}
}

// === Raw

/**
 * Build a {@link RawShape} from an arbitrary JSON Schema fragment.
 *
 * @remarks
 * Use for properties that accept any value or require JSON Schema
 * features beyond the shape DSL. The compiled guard always returns
 * `true`; the parser passes the value through unchanged.
 *
 * @example
 * ```ts
 * const anyValue = rawShape({ description: 'Default value' })
 * ```
 */
export function rawShape(schema: JsonSchema): RawShape {
	return { type: 'raw', schema }
}
