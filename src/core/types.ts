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
	| ConstShape
	| ArrayShape
	| TupleShape
	| ObjectShape
	| UnionShape
	| IntersectionShape
	| OptionalShape
	| NullableShape
	| DefaultShape
	| LazyShape
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

/**
 * Const shape — accepts exactly ONE fixed JSON value.
 *
 * @remarks
 * `value` is a single JSON-serializable value (a valid JSON-Schema `const`).
 * Compiles to the standard `{ const: <value> }` JSON-Schema keyword.
 *
 * WHY it is distinct from a single-element {@link LiteralShape}: `literalShape`
 * is an enum of PRIMITIVES (`string | number | boolean`) and its guard is a
 * `Set` membership test (`Object.is` semantics, primitives only). `constShape`
 * is the JSON-Schema `const` — a single value that may be a STRUCTURED JSON
 * value (object/array), so its guard is a structural value match (deep-equal),
 * not a `Set.has`. The two are intentionally separate kinds: a const object
 * cannot be expressed as a literal, and conflating them would either weaken
 * the literal guard or mistype the const value.
 *
 * Equality rule (documented, enforced by the compiled guard): JSON-Schema
 * `const` is a STRUCTURAL value match — primitive leaves compared by
 * `Object.is` (so `NaN` matches `NaN` and `+0` ≠ `-0`, consistent with
 * validators' `literalOf`), arrays/plain objects compared by recursive
 * structural deep-equality. The matched value is canonical; the parser hands
 * out a fresh deep copy for non-primitive consts (never a shared mutable
 * reference).
 */
export interface ConstShape {
	readonly type: 'const'
	readonly value: JsonValue
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
 * Tuple shape — a fixed-length heterogeneous array whose elements are
 * positionally typed.
 *
 * @remarks
 * `items` holds one child shape per tuple position, in order. A value is
 * valid iff it is an array of EXACTLY `items.length` elements and each
 * element satisfies the shape at its position. Compiles to the standard
 * closed-tuple JSON Schema (`prefixItems` + `items: false` +
 * `minItems === maxItems === items.length`). The runtime mirror of
 * `tupleOf` in the validators module.
 *
 * An empty tuple (`items` length 0) is the inhabited `[]` type — valid and
 * useful — not a programmer error (unlike an empty literal / union).
 */
export interface TupleShape {
	readonly type: 'tuple'
	readonly items: readonly ContractShape[]
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
 * `mode` controls both the emitted JSON Schema keyword and match semantics:
 * - `'anyOf'` (default) — short-circuits on the first matching variant;
 *   any match wins
 * - `'oneOf'` — all variants are checked; exactly one must match
 *   (zero or ≥2 matches ⇒ no match)
 */
export interface UnionShape {
	readonly type: 'union'
	readonly variants: readonly ContractShape[]
	readonly mode?: 'anyOf' | 'oneOf'
	readonly description?: string
}

/**
 * Intersection shape — a value satisfying ALL member shapes simultaneously.
 *
 * @remarks
 * `members` holds the shapes the value must conjointly satisfy. The runtime
 * mirror of `intersectionOf` in the validators module (value valid iff EVERY
 * member's guard passes). Compiles to the standard JSON-Schema conjunction
 * `{ allOf: [...] }`.
 *
 * WHY object-only (a §13 build-time constraint enforced by
 * {@link intersectionShape}, not modelled in this type): intersecting
 * non-object shapes is degenerate — `string & number` is `never`, and there
 * is no sound, generic parser/generator merge for primitive/array
 * intersections (a merged generator could not satisfy `generator∘guard`).
 * Object intersection, by contrast, is well-defined: the value carries the
 * union of every member's keys, each key validated by its owning member, and
 * a merge of generated/parsed member objects is sound. So every member MUST
 * be an object shape; a non-object member is a programmer error caught at
 * the build boundary (AGENTS.md §13). `members` stays typed as
 * `ContractShape` (the structural type cannot express "object-kind only"
 * without weakening inference); the invariant is enforced at build time.
 */
export interface IntersectionShape {
	readonly type: 'intersection'
	readonly members: readonly ContractShape[]
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
 * Default wrapper — `inner` plus an advisory default applied on ABSENCE.
 *
 * @remarks
 * `value` SHOULD be a valid instance of `inner`; {@link defaultShape} enforces
 * this at build time (AGENTS.md §13 — a default that fails its own inner is
 * programmer error, and validating it keeps `generator∘guard` /
 * `parse↔guard` sound by construction). Compiles to `inner`'s schema with the
 * JSON-Schema `default` keyword added.
 *
 * Behavioural contract (a DELIBERATE, useful asymmetry — call it out exactly
 * like {@link OptionalShape}'s `undefined` handling):
 *
 * - **guard** delegates VERBATIM to `inner`'s guard. The default is advisory
 *   metadata; the guard does NOT accept `undefined` just because a default
 *   exists (guard semantics = inner's, period).
 * - **parser** applies the default on ABSENCE: `parse(undefined)` returns the
 *   default (a fresh deep copy for a non-primitive default — same alias-free
 *   policy as {@link ConstShape}); any other input parses through `inner`.
 * - This means `guard(undefined)` is `inner.guard(undefined)` (false unless
 *   `inner` is itself optional) while `parser(undefined)` = the default. The
 *   parse↔guard A/B/C invariants still hold: the default is build-validated
 *   to pass `inner`'s guard, so EVERY parser output (the default OR a
 *   parsed-inner value) is guard-valid (clause C); clauses A/B are inherited
 *   from `inner`'s own sound parser for every non-`undefined` input.
 * - **generate** generates from `inner` (the default is just ONE valid
 *   instance — generating from inner preserves variability;
 *   `assertGeneratorSatisfiesGuard` still holds because inner's generator is
 *   sound).
 * - **static type** — a `DefaultShape` carries the SAME static type as its
 *   `inner`: the advisory default does not change it (the value is still
 *   required at the type level; the parser fills it on absence at runtime).
 */
export interface DefaultShape {
	readonly type: 'default'
	readonly inner: ContractShape
	readonly value: JsonValue
}

/**
 * Lazy wrapper — the LEGITIMATE recursion / self-reference boundary.
 *
 * @remarks
 * `thunk` returns the actual inner shape and is invoked LAZILY, never at
 * build time. This is the runtime mirror of `lazyOf` in the validators
 * module: deferring resolution lets the thunk close over a binding assigned
 * AFTER the shape is declared, which is the only way to express a genuinely
 * self-referential (recursive) shape (a tree, a JSON value, …).
 *
 * WHY lazy is the cycle-BREAKER (B5 reconciliation): every `compile*`
 * up-front runs `assertAcyclicShape`, which THROWS the precise §13 Error on
 * any STRUCTURAL shape cycle (a back-edge with no deferral). A `lazy` node
 * is treated as a TERMINAL by that walk — its thunk is NOT invoked during
 * acyclicity checking — so a shape that is recursive THROUGH a `lazyShape`
 * has no static back-edge and compiles, while a NON-lazy structural cycle
 * still throws (preserving B5). The thunk is the deferral that legitimately
 * breaks the static cycle; the recursion is realised only at
 * guard/parse/generate time over the (finite) DATA.
 *
 * Maps to JSON-Schema `$ref` / `$defs` (a recursive schema is a named
 * definition referenced by `$ref`).
 */
export interface LazyShape {
	readonly type: 'lazy'
	readonly thunk: () => ContractShape
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
