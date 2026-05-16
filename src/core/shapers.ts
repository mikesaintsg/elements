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

// === String

/**
 * Build a {@link StringShape}.
 *
 * @example
 * ```ts
 * const name = stringShape({ min: 1, max: 80, description: 'Display name' })
 * ```
 */
export function stringShape(options?: StringShapeOptions): StringShape {
	return {
		type: 'string',
		min: options?.min,
		max: options?.max,
		pattern: options?.pattern,
		description: options?.description,
	}
}

// === Number

/** Build a {@link NumberShape}. */
export function numberShape(options?: NumberShapeOptions): NumberShape {
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
	return { type: 'literal', values }
}

// === Array

/**
 * Build an {@link ArrayShape}.
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
 * Semantically identical to {@link unionShape} at runtime — the first
 * matching variant wins. The difference is the emitted JSON Schema
 * keyword: `oneOf` (exactly one match) vs `anyOf` (at least one).
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
