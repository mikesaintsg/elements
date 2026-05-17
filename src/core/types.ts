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

// === JSON Schema — INVERSE subsystem ($ref/$defs resolution, E1)

/**
 * A lazily-resolvable, cycle-broken view of one `$ref` target — the recursion
 * boundary the inverse subsystem (E2 schema→guard, E3 schema→shape, E4
 * schema→parser) builds recursive compiled functions on.
 *
 * @remarks
 * This is the JSON-Schema `$ref` analogue of {@link LazyShape}: it is the
 * single sanctioned mechanism for a self-referential schema to be walked
 * WITHOUT infinite recursion. A naive resolver that eagerly follows every
 * `$ref` stack-overflows on a recursive schema (`#/$defs/Node` whose child is
 * `{ $ref: '#/$defs/Node' }`); {@link RefResolver.lazy} instead returns this
 * indirection so a consumer can build a recursive guard/shape/parser exactly
 * the way D3's `compileGuard` memoizes a {@link LazyShape}'s thunk (install a
 * deferred closure BEFORE compiling the inner; the self-reference reuses the
 * one compiled function instead of recursing).
 *
 * Contract E2–E4 rely on:
 *
 * - `pointer` — the CANONICAL (fully-unescaped, ref-followed) JSON Pointer the
 *   target lives at. Two `$ref`s reaching the same node yield the same
 *   `pointer`, so a consumer can memoize compiled artifacts by it (the
 *   `Map`-keyed-by-thunk strategy from D3, keyed here by `pointer`).
 * - `thunk()` — returns the resolved target {@link JsonSchema} (a concrete
 *   non-`$ref` node, or a boolean schema). Invoking it is idempotent and
 *   ALWAYS either returns a concrete node/boolean OR throws a precise §13
 *   `Error` — it never returns a still-unresolved `$ref`-containing node.
 *   Throws `circular $ref with no concrete schema: …` if the `$ref` chain
 *   forms a pure-`$ref`-only cycle (no concrete body anywhere in the loop).
 *   For a legitimately self-referential target the back-edge is broken here,
 *   not followed, so `thunk()` terminates. A consumer calls `thunk()` lazily
 *   (on first use of the recursive position) so the deferral closes the static
 *   cycle.
 * - `cyclic` — `true` iff this indirection was produced for a pointer ALREADY
 *   on the active resolution path (a genuine recursive back-edge). `false` on
 *   the first visit. A consumer that sees `cyclic === true` knows it must
 *   reuse the in-progress compiled artifact for `pointer` (build a recursive
 *   guard) rather than recurse into the body again.
 */
export interface LazyRef {
	readonly pointer: string
	readonly cyclic: boolean
	thunk(): JsonSchema
}

/**
 * A cycle-safe `$ref`/`$defs` resolver bound to one JSON-Schema document — the
 * foundation the inverse subsystem (E2–E4) walks a schema with.
 *
 * @remarks
 * Built by {@link createRefResolver}. `root` is the document every pointer is
 * resolved against (the only sanctioned base — see {@link resolveRef} for the
 * external-`$ref` policy). `resolve()` is the eager form (follow a `$ref`
 * chain to a concrete non-`$ref` node or boolean — used for finite,
 * non-recursive positions); `lazy()` is the cycle-broken form (return a
 * {@link LazyRef} indirection — used for any position that may be
 * self-referential, so the recursion is realised over finite DATA at
 * guard/parse time, never at resolve time). Both ALWAYS either return a
 * concrete non-`$ref` node / boolean OR throw a precise §13 `Error` —
 * never a native stack overflow and never a still-unresolved `$ref` node.
 *
 * Precise §13 `Error` cases: unresolvable or external pointer; a non-cyclic
 * chain exceeding `MAX_RECURSION_DEPTH` (the shared package-wide stack-safety
 * ceiling); and a `$ref` chain forming a pure-`$ref`-only cycle (no concrete
 * body anywhere in the loop, e.g. `A.$ref→B`, `B.$ref→A`) — message:
 * `circular $ref with no concrete schema: #/$defs/A -> #/$defs/B -> #/$defs/A`.
 */
export interface RefResolver {
	readonly root: JsonSchema
	resolve(pointer: string): JsonSchemaDefinition | boolean
	lazy(pointer: string): LazyRef
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
 * - `Infer<DefaultShape>` is `Infer<inner>` — the advisory default does not
 *   change the static type (the value is still required at the type level;
 *   the parser fills it on absence at runtime).
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

// === Type Inference

/**
 * Infer the static TypeScript type produced by a {@link ContractShape}.
 *
 * @remarks
 * Mapping is structural and recursive. Optional fields surface as
 * proper optional properties on object types; nullable wrappers
 * add `| null`. Literal tuples become string-literal unions; an
 * `intersection` shape resolves to the `&`-intersection of its members'
 * inferred types.
 *
 * WHY a single indexed-access dispatch on `S['type']` to NAMED per-kind
 * helpers (not a chain of structural `S extends StringShape ? … : S extends
 * NumberShape ? …` tests, and not an eagerly-materialized lookup interface):
 *
 * The public builders (`objectShape`/`tupleShape`/…) return a CONST-GENERIC
 * precise literal INTERSECTED with the wide member interface — e.g.
 * `objectShape({a})` is `{ readonly type:'object'; readonly properties:{a} }
 * & ObjectShape`. Two failure modes followed from feeding that intersection
 * through a structural `extends`-chain `Infer`:
 *
 * 1. EXPLOSION (TS2589). Every `S extends StringShape ? … : S extends
 *    NumberShape ? …` step structurally compares the WHOLE
 *    `{literal} & WideInterface` intersection against each interface, and the
 *    children extracted with `infer` carried `& ContractShape` (the full
 *    12-member union) into the next recursion, so each level re-instantiated
 *    the entire chain against an ever-growing intersection — multiplicative
 *    depth that tripped "Type instantiation is excessively deep" once
 *    `compileContract<S>(): ContractInterface<Infer<S>>` materialized
 *    `Infer<S>` at the call site for a const-generic combinator builder.
 * 2. POLLUTION. `& ObjectShape` contributes `properties:
 *    Readonly<Record<string, ContractShape>>`; `S extends { properties:
 *    infer P }` then captured `{a} & Record<string, ContractShape>`, so
 *    `InferObject` mapped the leaked string index signature and produced
 *    `{ readonly [x:string]: unknown; a: … }` instead of `{ a: … }`.
 *
 * Fix (three cooperating mechanisms, all in this file):
 *
 * a. `Infer` is a single distributive shell that dispatches ONCE on the
 *    discriminant via the indexed access `S['type']` (a literal string
 *    lookup — O(1)) instead of a chain of structural `S extends StringShape`
 *    comparisons against the whole wide intersection. The residual
 *    `& WideInterface` keeps `S['type']` a single literal
 *    (`'object' & 'object'` = `'object'`), so the dispatch resolves without
 *    re-comparing the pile.
 * b. Every recursive child is funnelled through {@link InferChild}, whose
 *    `C extends ContractShape ? Infer<C> : never` lets the indexed dispatch
 *    absorb the residual `& WideInterface` on a child
 *    (`('string' & ('string' | … )) = 'string'`) without amplifying.
 * c. The list-bearing kinds (`tuple`/`union`/`intersection`) first rebuild a
 *    PRISTINE fixed tuple from the `[A,B] & readonly ContractShape[]` the
 *    builder intersection produces, via {@link ShapeList} — a length-driven
 *    positional reconstruction that neither rest-spread-peels nor `keyof`s
 *    the tuple-intersected-array (both of which collapse the precise element
 *    literals to the array element type and re-trigger the explosion).
 *    Object `properties` similarly drop the leaked `string` index signature
 *    via `as string extends K ? never : K` in {@link InferObject}.
 *
 * Instantiation is then linear in the shape's node count (each node: one
 * indexed dispatch + one helper + bounded child recursion), independent of
 * the union arity, so a deep realistic combinator shape stays well under the
 * instantiation limit while every kind's inferred type stays precise (and
 * STRICTLY more precise than before: the old structural-chain `Infer` leaked
 * `{ readonly [x:string]: any; … }` into every object and widened
 * tuple/union/intersection to `any`). The leading `S extends unknown` keeps
 * `Infer` distributing over a `ContractShape` union exactly as before.
 */
export type Infer<S extends ContractShape> = S extends unknown
	? S['type'] extends 'string'
		? string
		: S['type'] extends 'number'
			? number
			: S['type'] extends 'boolean'
				? boolean
				: S['type'] extends 'raw'
					? unknown
					: S['type'] extends 'literal'
						? InferLiteral<S>
						: S['type'] extends 'const'
							? InferConst<S>
							: S['type'] extends 'optional'
								? InferOptional<S>
								: S['type'] extends 'nullable'
									? InferNullable<S>
									: S['type'] extends 'default'
										? InferDefault<S>
										: S['type'] extends 'array'
											? InferArray<S>
											: S['type'] extends 'tuple'
												? InferTupleShape<S>
												: S['type'] extends 'union'
													? InferUnionShape<S>
													: S['type'] extends 'intersection'
														? InferIntersectionShape<S>
														: S['type'] extends 'lazy'
															? InferLazyShape<S>
															: S['type'] extends 'object'
																? InferObjectShape<S>
																: never
	: never

// === Recursive-child constraint
//
// The public builders return a precise const-generic literal INTERSECTED with
// the wide member interface (`{ readonly type:'object'; readonly properties:P }
// & ObjectShape`, etc.). A child shape extracted with `infer` therefore carries
// `& <WideInterface>` (and, for object properties, the wide interface's
// `Readonly<Record<string, ContractShape>>` index signature). The recursive
// `Infer` MUST tolerate that intersection WITHOUT either (a) re-comparing the
// whole pile against a structural `extends`-chain (the old TS2589 amplifier) or
// (b) requiring a clean `ContractShape` bound the polluted child no longer
// satisfies cleanly.
//
// `InferChild<C>` is the single recursive entrypoint for any extracted child.
// It guards on the discriminant being present (always true for a real shape;
// the residual `& WideInterface` keeps `C`'s `type` a string literal, so the
// indexed dispatch in `Infer` resolves in O(1) — `('string' & ('string' |
// 'number' | …))` collapses to `'string'`), then recurses. Centralizing the
// child step here keeps every helper's recursion flat and the WHY in one place.
type InferChild<C> = C extends ContractShape ? Infer<C> : never

// === Clean-list reconstruction
//
// The list-bearing combinator builders (`tupleShape`/`unionShape`/`oneOfShape`/
// `intersectionShape`) return `{ … readonly items:[A,B] } & TupleShape` (and
// the `variants`/`members` analogues). The wide interface's field is
// `readonly ContractShape[]`, so the EXTRACTED list is
// `[A,B] & readonly ContractShape[]` — a tuple INTERSECTED with an unbounded
// array.
//
// That intersection is the real TS2589 trigger AND a precision sink:
//
//   * A rest-spread peel `L extends readonly [infer Head, ...infer Tail]`
//     over `[A,B] & readonly ContractShape[]` does NOT yield `Head=A`,
//     `Tail=[B]`; TS resolves the tuple∩array by collapsing positions to the
//     ARRAY ELEMENT type, so `Head` widens to the whole `ContractShape` union
//     and `Tail` to `unknown[]` — the precise element literals are lost AND
//     the union-typed `Head` re-amplifies the dispatch (the explosion).
//   * Mapping `[K in keyof L]` over the same intersection ALSO iterates the
//     array's `number`/prototype keys, not just `0|1`.
//
// `ShapeList<L>` rebuilds the clean fixed tuple `[A,B]` from
// `[A,B] & readonly ContractShape[]` WITHOUT rest-spread or `keyof`: it is
// length-driven and uses ONLY positional indexed access `L[Acc['length']]`
// (probed: indexed access at a literal position survives the intersection
// precisely, and `L['length']` is the literal arity `2`, also precise). The
// recursion is bounded by the (small, build-fixed) combinator arity and yields
// a pristine tuple every downstream mapper/fold can walk position-for-position
// with full precision and zero amplification.
type ShapeList<L extends readonly unknown[], Acc extends readonly unknown[] = []> = Acc['length'] extends L['length']
	? Acc
	: ShapeList<L, readonly [...Acc, L[Acc['length']]]>

// === Per-kind named inference helpers
//
// One helper per recursive/structured kind. Keeping these named (rather than
// inlined into one nested ternary) is what bounds `Infer`'s instantiation
// depth: each is a single, independently-bounded conditional instantiated
// ONLY when its kind matches. Each reads its structural child DIRECTLY (the
// literal portion of the builder intersection wins for the precise keys) and
// recurses via {@link InferChild}; the indexed-access dispatch in `Infer`
// absorbs the residual `& WideInterface` without re-amplifying.

type InferLiteral<S> = S extends { readonly values: infer V }
	? V extends readonly (infer L)[]
		? L
		: never
	: never

// `Infer<ConstShape>` is the const-generic-preserved literal type of `value`
// (the same technique `InferLiteral` uses for the literal element). The public
// `constShape` builder returns `{ readonly type:'const'; readonly value:V } &
// ConstShape`; the precise literal portion wins for `value`, so a single
// string const infers the exact string-literal type and an object const
// infers its structural type. No `InferChild` recursion: a const `value` is a
// DATA value, not a child SHAPE.
type InferConst<S> = S extends { readonly value: infer V } ? V : never

type InferOptional<S> = S extends { readonly inner: infer I }
	? InferChild<I> | undefined
	: never

type InferNullable<S> = S extends { readonly inner: infer I }
	? InferChild<I> | null
	: never

// `Infer<DefaultShape>` is EXACTLY `Infer<inner>` — the advisory default does
// not widen or optionalise the static type (the value is required at the type
// level; the parser fills it from the default on absence at runtime). Mirrors
// `InferOptional`/`InferNullable`'s child extraction WITHOUT adding a
// `| undefined`/`| null` arm.
type InferDefault<S> = S extends { readonly inner: infer I } ? InferChild<I> : never

// === Lazy (recursive / $ref) inference
//
// `Infer<LazyShape>` resolves ONE level through the thunk's return type:
//
//   * NON-recursive — `lazyShape(() => <concreteShape>)`. The thunk's static
//     return type is the precise const-generic literal the inner builder
//     produced (e.g. `{ readonly type:'string' } & StringShape`). `R` is
//     that literal, `ContractShape` does NOT extend it (a single concrete
//     kind is narrower than the 14-member union), so the precise branch runs
//     and `Infer<LazyShape>` is exactly `InferChild<R>` — the inner's
//     inferred type. This is the precise, desirable case.
//
//   * SELF-recursive — the recommended consumer pattern is
//     `const treeShape: ContractShape = objectShape({ …,
//     children: arrayShape(lazyShape(() => treeShape)) })`. The binding is
//     annotated `ContractShape` so the thunk can close over it, so the
//     thunk's STATIC return type is the wide `ContractShape` union itself.
//     Naively resolving `Infer<ContractShape>` there distributes over every
//     kind INCLUDING `lazy`, whose helper would resolve `Infer<ContractShape>`
//     again — unbounded type instantiation → TS2589, the exact regression
//     D2.5 eliminated and this arm must NOT reintroduce.
//
// DOCUMENTED rule (pinned in tests/src/core/types.test-d.ts): when the
// thunk's return type is the wide `ContractShape` union (i.e.
// `ContractShape extends R` — no narrower literal survived the annotation),
// `Infer<LazyShape>` is `unknown`. The check `[ContractShape] extends [R]`
// (wrapped in 1-tuples to compare invariantly, NOT distributively) is true
// ONLY for the bare-union return; a concrete literal return fails it and
// takes the precise branch. This is a deliberate, bounded fallback: a
// genuinely self-recursive TS type needs a NAMED interface boundary (TS
// forbids `type X = … X …` direct circularity), so the consumer supplies
// `interface Tree { … }` for the precise static type while the runtime
// contract stays fully recursive. The fallback caps the type-level recursion
// at one indirection, keeping `Infer` linear and `npm run check` TS2589-free.
type InferLazyShape<S> = S extends { readonly thunk: () => infer R }
	? [ContractShape] extends [R]
		? unknown
		: InferChild<R>
	: never

type InferArray<S> = S extends { readonly items: infer I }
	? readonly InferChild<I>[]
	: never

type InferTupleShape<S> = S extends { readonly items: infer I }
	? I extends readonly unknown[]
		? InferTuple<ShapeList<I>>
		: never
	: never

type InferUnionShape<S> = S extends { readonly variants: infer V }
	? V extends readonly unknown[]
		? InferUnion<ShapeList<V>>
		: never
	: never

type InferIntersectionShape<S> = S extends { readonly members: infer M }
	? M extends readonly unknown[]
		? InferIntersection<ShapeList<M>>
		: never
	: never

// The builder return `{ readonly properties:{a:…} } & ObjectShape` makes the
// extracted `P` equal to `{a:…} & Readonly<Record<string, ContractShape>>` —
// the `& ObjectShape` leaks a `string` index signature. `keyof P` would then
// include that index key, so `InferObject` would emit a spurious
// `[x:string]: …` member. `as string extends K ? never : K` removes EXACTLY
// the index-signature key: a literal property key (e.g. `'a'`) is not a
// supertype of `string`, so real keys survive; the synthetic `string` index
// key is the only `K` with `string extends K`, so it (and only it) is dropped.
type InferObjectShape<S> = S extends { readonly properties: infer P }
	? InferObject<P>
	: never

type InferObject<P> = Readonly<
	{
		[K in keyof P as string extends K
			? never
			: P[K] extends { readonly type: 'optional' }
				? never
				: K]: InferChild<P[K]>
	} & {
	[K in keyof P as string extends K
		? never
		: P[K] extends { readonly type: 'optional' }
			? K
			: never]?: P[K] extends { readonly inner: infer I } ? InferChild<I> : never
}
>

type InferUnion<V extends readonly unknown[]> = V extends readonly (infer U)[]
	? InferChild<U>
	: never

// Map a readonly tuple of element shapes to a readonly tuple of their
// inferred types, position-for-position. The homomorphic mapped type over
// the tuple's own keys preserves both arity and `readonly`-ness (the same
// technique `TupleFromGuards` uses for guard tuples), so
// `Infer<TupleShape>` recovers `readonly [Infer<I0>, Infer<I1>, …]`.
type InferTuple<I extends readonly unknown[]> = Readonly<{
	[K in keyof I]: InferChild<I[K]>
}>

// Map a readonly list of member shapes to the `&`-intersection of their
// inferred types. Each member is object-kind (enforced at build time by
// `intersectionShape` per §13), so the inferred types are object types and
// their intersection is the value that satisfies EVERY member — the
// type-level mirror of validators' `IntersectionFromGuards`.
//
// WHY a tail-recursive pairwise FOLD (not `UnionToIntersection<Infer<U>>`):
// `UnionToIntersection` materializes a function-union and infers from it,
// and feeding the deferred `Infer` dispatch through that machinery compounds
// instantiation depth — it tripped TS2589 once `Infer` was materialized on a
// deep const-generic intersection-of-objectShapes. A left fold that peels
// one member off the head per step and accumulates `Acc & InferChild<Head>`
// keeps each step FLAT (one `Infer` of one member + one `&`), with total
// depth linear in the member COUNT (small — an intersection has a handful of
// members) rather than the recursive blow-up of distributing `Infer` inside
// `UnionToIntersection`. `unknown` is the identity for `&` (`unknown & X` =
// `X`), so the empty-tail base case contributes nothing; `intersectionShape`
// guarantees ≥1 member at build (§13) so the result is never bare `unknown`.
type InferIntersection<M extends readonly unknown[]> = InferIntersectionFold<M, unknown>

type InferIntersectionFold<M extends readonly unknown[], Acc> = M extends readonly [
	infer Head,
	...infer Tail,
]
	? InferIntersectionFold<Tail, Acc & InferChild<Head>>
	: Acc

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
