// === Result

/**
 * Discriminated success branch of a Result.
 *
 * @remarks
 * Used for operations that can succeed or fail without throwing.
 */
export interface Success<T> {
	readonly success: true
	readonly value: T
}

/**
 * Discriminated failure branch of a Result.
 *
 * @remarks
 * Carries the error value when an operation does not succeed.
 */
export interface Failure<E> {
	readonly success: false
	readonly error: E
}

/** Discriminated union for operations that can succeed or fail */
export type Result<T, E = Error> = Success<T> | Failure<E>

// === Guards

/**
 * A runtime type guard that returns true when `x` satisfies `T` and narrows the type.
 *
 * @typeParam T - The type the guard narrows to
 */
export type Guard<T> = (x: unknown) => x is T

/**
 * Extract the guarded type `T` from a `Guard<T>`.
 *
 * @typeParam G - A Guard type to extract from
 */
export type GuardType<G> = G extends Guard<infer T> ? T : never

/**
 * Mapping from string keys to guard functions for object shapes.
 *
 * @remarks
 * Used as the shape parameter for `recordOf` compositors.
 */
export type GuardsShape = Readonly<Record<string, Guard<unknown>>>

/**
 * Resolve a GuardsShape to a readonly object type with guarded property types.
 *
 * @typeParam G - A GuardsShape to resolve
 */
export type FromGuards<G extends GuardsShape> = Readonly<{ [K in keyof G]: GuardType<G[K]> }>

/**
 * Create a readonly object type from a GuardsShape where keys in K are optional.
 *
 * @typeParam S - The full shape
 * @typeParam K - Tuple of keys to make optional
 */
export type OptionalFromGuards<S extends GuardsShape, K extends ReadonlyArray<keyof S>> = Readonly<{
	[P in keyof S]: P extends K[number] ? FromGuards<S>[P] | undefined : FromGuards<S>[P]
}>

/**
 * Map a tuple of element guards to a readonly tuple of their guarded types.
 *
 * @typeParam Ts - Tuple of Guard types
 */
export type TupleFromGuards<Ts extends ReadonlyArray<Guard<unknown>>> = Readonly<{
	[K in keyof Ts]: GuardType<Ts[K]>
}>

/**
 * Convert a union type to an intersection type.
 *
 * @typeParam U - Union type to intersect
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
		k: infer I,
	) => void
	? I
	: never

/**
 * Intersection of the types guarded by a tuple of guards.
 *
 * @remarks
 * Useful for `intersectionOf` combinators to express precise output.
 *
 * @typeParam Gs - Tuple of Guard types
 */
export type IntersectionFromGuards<Gs extends ReadonlyArray<Guard<unknown>>> = UnionToIntersection<
	GuardType<Gs[number]>
>

// === Constructors

/**
 * Any constructor signature that produces instances of T.
 *
 * @remarks
 * Uses `unknown[]` parameters to be maximally assignable from specific constructors
 * without resorting to `any`.
 *
 * @typeParam T - Instance type the constructor produces
 */
export type AnyConstructor<T = unknown> = new (...args: unknown[]) => T

// === Functions

/** A function accepting any arguments and returning unknown. */
export type AnyFunction = (...args: unknown[]) => unknown

/** An async function accepting any arguments and returning a Promise. */
export type AnyAsyncFunction = (...args: unknown[]) => Promise<unknown>

/** A function accepting zero arguments and returning unknown. */
export type ZeroArgFunction = () => unknown

/** An async function accepting zero arguments and returning a Promise. */
export type ZeroArgAsyncFunction = () => Promise<unknown>

// === JSON Schema

/** Primitive JSON values. */
export type JsonPrimitive = string | number | boolean | null

/** JSON array value. */
export interface JsonArray extends ReadonlyArray<JsonValue> {}

/** JSON object value. */
export interface JsonObject {
	readonly [key: string]: JsonValue
}

/** Any valid JSON value. */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject

/** Standard JSON Schema type names. */
export type JsonSchemaType =
	| 'null'
	| 'boolean'
	| 'object'
	| 'array'
	| 'number'
	| 'integer'
	| 'string'

/** Map of schema names to schema nodes. */
export interface JsonSchemaMap {
	readonly [key: string]: JsonSchema
}

/** Map of names to required-property lists. */
export interface JsonSchemaStringArrayMap {
	readonly [key: string]: readonly string[]
}

/**
 * Generic JSON Schema object node.
 *
 * @remarks
 * Covers the schema keywords used by the contract compiler and MCP tools,
 * while remaining general enough for `rawShape()` and provider structured-output
 * formats.
 */
export interface JsonSchemaDefinition {
	readonly $schema?: string
	readonly $id?: string
	readonly $ref?: string
	readonly title?: string
	readonly description?: string
	readonly type?: JsonSchemaType | readonly JsonSchemaType[]
	readonly const?: JsonValue
	readonly enum?: readonly JsonValue[]
	readonly default?: JsonValue
	readonly examples?: readonly JsonValue[]
	readonly properties?: JsonSchemaMap
	readonly required?: readonly string[]
	readonly additionalProperties?: boolean | JsonSchema
	readonly unevaluatedProperties?: boolean | JsonSchema
	readonly patternProperties?: JsonSchemaMap
	readonly propertyNames?: JsonSchema
	readonly minProperties?: number
	readonly maxProperties?: number
	readonly items?: JsonSchema | readonly JsonSchema[]
	readonly prefixItems?: readonly JsonSchema[]
	readonly contains?: JsonSchema
	readonly minItems?: number
	readonly maxItems?: number
	readonly uniqueItems?: boolean
	readonly minimum?: number
	readonly maximum?: number
	readonly exclusiveMinimum?: number
	readonly exclusiveMaximum?: number
	readonly multipleOf?: number
	readonly minLength?: number
	readonly maxLength?: number
	readonly pattern?: string
	readonly format?: string
	readonly anyOf?: readonly JsonSchema[]
	readonly oneOf?: readonly JsonSchema[]
	readonly allOf?: readonly JsonSchema[]
	readonly not?: JsonSchema
	readonly if?: JsonSchema
	readonly then?: JsonSchema
	readonly else?: JsonSchema
	readonly dependentRequired?: JsonSchemaStringArrayMap
	readonly dependentSchemas?: JsonSchemaMap
	readonly $defs?: JsonSchemaMap
}

/** Any valid JSON Schema node, including boolean schemas. */
export type JsonSchema = boolean | JsonSchemaDefinition

/**
 * JSON Schema object root — constrains a schema node to `type: 'object'`.
 *
 * @remarks
 * The `ObjectShape` overload of `compileSchema()` narrows the return to this
 * type, ensuring callers receive an object-rooted schema without casting.
 */
export interface JsonSchemaObject extends JsonSchemaDefinition {
	readonly type: 'object'
	readonly properties?: JsonSchemaMap
	readonly required?: readonly string[]
	readonly additionalProperties?: boolean | JsonSchema
	readonly unevaluatedProperties?: boolean | JsonSchema
	readonly patternProperties?: JsonSchemaMap
	readonly propertyNames?: JsonSchema
	readonly minProperties?: number
	readonly maxProperties?: number
	readonly dependentRequired?: JsonSchemaStringArrayMap
	readonly dependentSchemas?: JsonSchemaMap
}

// === Contract Shape

/**
 * Recursive shape DSL — the source of truth for a compiled contract.
 *
 * @remarks
 * Every member is discriminated by `type`. `optional` and `nullable`
 * compose around any other shape to express absence or null without
 * complicating the inner shapes themselves.
 */
export type ContractShape =
	| StringShape
	| NumberShape
	| BooleanShape
	| LiteralShape
	| ArrayShape
	| ObjectShape
	| UnionShape
	| OptionalShape
	| NullableShape
	| RawShape

/**
 * String shape with optional length and pattern constraints.
 *
 * @remarks
 * `min` / `max` bound the character length. `pattern` is matched against
 * the value during validation. `description` flows through to the emitted
 * JSON Schema.
 */
export interface StringShape {
	readonly type: 'string'
	readonly min?: number
	readonly max?: number
	readonly pattern?: RegExp
	readonly description?: string
}

/**
 * Numeric shape with optional bounds and integer enforcement.
 *
 * @remarks
 * When `integer` is true, only finite whole numbers are accepted and
 * the emitted JSON Schema uses `"type": "integer"`.
 */
export interface NumberShape {
	readonly type: 'number'
	readonly min?: number
	readonly max?: number
	readonly integer?: boolean
	readonly description?: string
}

/** Boolean shape — accepts only `true` or `false`. */
export interface BooleanShape {
	readonly type: 'boolean'
	readonly description?: string
}

/**
 * Literal shape — accepts exactly one of a fixed set of primitive values.
 *
 * @remarks
 * Use for enum-like constraints. The matched literal is returned verbatim.
 */
export interface LiteralShape {
	readonly type: 'literal'
	readonly values: readonly (string | number | boolean)[]
	readonly description?: string
}

/** Array shape with element shape and optional length bounds. */
export interface ArrayShape {
	readonly type: 'array'
	readonly items: ContractShape
	readonly min?: number
	readonly max?: number
	readonly description?: string
}

/**
 * Object shape — a map of property names to child shapes.
 *
 * @remarks
 * Properties whose value is an {@link OptionalShape} may be absent.
 * All other properties are required.
 *
 * `additionalProperties` controls unknown-key handling:
 * - `undefined` or `false` — unknown keys are rejected (closed object)
 * - `true` — unknown keys are accepted as-is (open object)
 * - `ContractShape` — unknown keys are validated against the shape
 */
export interface ObjectShape {
	readonly type: 'object'
	readonly properties: Readonly<Record<string, ContractShape>>
	readonly additionalProperties?: boolean | ContractShape
	readonly description?: string
}

/**
 * Union shape — accepts a value matching any one variant.
 *
 * @remarks
 * Variants are checked in order; the first match wins.
 * `mode` controls the emitted JSON Schema keyword:
 * - `'anyOf'` (default) — at least one variant must match
 * - `'oneOf'` — exactly one variant must match
 */
export interface UnionShape {
	readonly type: 'union'
	readonly variants: readonly ContractShape[]
	readonly mode?: 'anyOf' | 'oneOf'
	readonly description?: string
}

/** Optional wrapper — the inner shape may be absent (`undefined`). */
export interface OptionalShape {
	readonly type: 'optional'
	readonly inner: ContractShape
}

/** Nullable wrapper — the inner shape may be `null`. */
export interface NullableShape {
	readonly type: 'nullable'
	readonly inner: ContractShape
}

/**
 * Raw JSON Schema passthrough — embeds an arbitrary schema fragment.
 *
 * @remarks
 * Use for properties that accept any value or require JSON Schema
 * features not expressible in the shape DSL. The compiled guard
 * accepts any value; the parser passes through unchanged.
 */
export interface RawShape {
	readonly type: 'raw'
	readonly schema: JsonSchema
}

// === Type Inference

/**
 * Infer the static TypeScript type produced by a {@link ContractShape}.
 *
 * @remarks
 * Mapping is structural and recursive. Optional fields surface as
 * proper optional properties on object types; nullable wrappers
 * add `| null`. Literal tuples become string-literal unions.
 */
export type Infer<S extends ContractShape> = S extends StringShape
	? string
	: S extends NumberShape
		? number
		: S extends BooleanShape
			? boolean
			: S extends { readonly type: 'literal'; readonly values: infer V }
				? V extends readonly (infer L)[]
					? L
					: never
				: S extends { readonly type: 'array'; readonly items: infer I }
					? I extends ContractShape
						? readonly Infer<I>[]
						: never
					: S extends { readonly type: 'object'; readonly properties: infer P }
						? P extends Readonly<Record<string, ContractShape>>
							? InferObject<P>
							: never
						: S extends { readonly type: 'union'; readonly variants: infer V }
							? V extends readonly ContractShape[]
								? InferUnion<V>
								: never
							: S extends { readonly type: 'optional'; readonly inner: infer I }
								? I extends ContractShape
									? Infer<I> | undefined
									: never
								: S extends { readonly type: 'nullable'; readonly inner: infer I }
									? I extends ContractShape
										? Infer<I> | null
										: never
									: S extends { readonly type: 'raw' }
										? unknown
										: never

type InferObject<P extends Readonly<Record<string, ContractShape>>> = Readonly<
	{
		[K in keyof P as P[K] extends { readonly type: 'optional' } ? never : K]: Infer<P[K]>
	} & {
	[K in keyof P as P[K] extends { readonly type: 'optional' } ? K : never]?: P[K] extends {
			readonly type: 'optional'
			readonly inner: infer I
		}
		? I extends ContractShape
			? Infer<I>
			: never
		: never
}
>

type InferUnion<V extends readonly ContractShape[]> = V extends readonly (infer U)[]
	? U extends ContractShape
		? Infer<U>
		: never
	: never

// === Random

/** Deterministic random source returning values in `[0, 1)`. */
export type RandomFunction = () => number

// === Contract Interface

/**
 * Behavioral contract for a compiled schema definition.
 *
 * @remarks
 * A contract bundles four operations derived from the same shape:
 *
 * - `schema`   — JSON Schema for tool/agent integration
 * - `is`       — runtime type guard
 * - `parse`    — input normalization returning the value or `undefined`
 * - `generate` — deterministic seed data generator
 */
export interface ContractInterface<T> {
	readonly schema: JsonSchema
	readonly is: Guard<T>
	parse(value: unknown): T | undefined
	generate(random: RandomFunction): T
}

// === Builder Options

/** Options accepted by {@link stringShape}. */
export interface StringShapeOptions {
	readonly min?: number
	readonly max?: number
	readonly pattern?: RegExp
	readonly description?: string
}

/** Options accepted by {@link numberShape} and {@link integerShape}. */
export interface NumberShapeOptions {
	readonly min?: number
	readonly max?: number
	readonly integer?: boolean
	readonly description?: string
}

/** Options accepted by {@link booleanShape}. */
export interface BooleanShapeOptions {
	readonly description?: string
}

/** Options accepted by {@link arrayShape}. */
export interface ArrayShapeOptions {
	readonly min?: number
	readonly max?: number
	readonly description?: string
}

/** Options accepted by {@link objectShape}. */
export interface ObjectShapeOptions {
	readonly additionalProperties?: boolean | ContractShape
	readonly description?: string
}
