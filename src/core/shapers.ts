import type {
	ArrayShape,
	ArrayShapeOptions,
	BooleanShape,
	BooleanShapeOptions,
	ContractShape,
	DefaultShape,
	IntersectionShape,
	JsonValue,
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
	TupleShape,
	UnionShape,
} from './types.js'
import { compileGuard } from './compilers.js'

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
 * @param options - Optional constraints: `min`/`max` length, `pattern`, `description`
 * @returns A {@link StringShape} node
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
 * value bound is allowed (unlike string/array length bounds) — programmer
 * error per AGENTS.md §13.
 *
 * @param options - Optional constraints: `min`, `max`, `integer`, `description`
 * @returns A {@link NumberShape} node
 *
 * @example
 * ```ts
 * const score = numberShape({ min: 0, max: 1 })
 * ```
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
 * Convenience wrapper around {@link numberShape} that forces `integer: true`.
 * The emitted JSON Schema uses `"type": "integer"`. Throws on invalid bounds.
 *
 * @param options - Optional constraints: `min`, `max`, `description` (no `integer`)
 * @returns A {@link NumberShape} node with `integer: true`
 *
 * @example
 * ```ts
 * const age = integerShape({ min: 0, max: 120 })
 * ```
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

/**
 * Build a {@link BooleanShape}.
 *
 * @param options - Optional `description` annotation
 * @returns A {@link BooleanShape} node
 *
 * @example
 * ```ts
 * const flag = booleanShape({ description: 'Feature enabled' })
 * ```
 */
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
 * Throws at build time when called with no arguments (an empty literal is
 * uninhabited — programmer error per AGENTS.md §13).
 *
 * @param values - One or more string, number, or boolean literals (rest-spread)
 * @returns A shape whose compiled guard accepts exactly those values
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

// === Const

/**
 * Build a {@link ConstShape} — a single fixed JSON value (JSON-Schema
 * `const`).
 *
 * @remarks
 * The compiled guard accepts EXACTLY `value` by a structural value match:
 * primitive leaves compared with `Object.is` (so `NaN` matches `NaN` and
 * `+0` ≠ `-0` — the SAME equality validators' `literalOf` uses, kept
 * consistent across the codebase), arrays/plain objects compared by recursive
 * structural deep-equality. The parser returns the canonical `value` (a fresh
 * deep copy for a non-primitive `value`, so a shared mutable reference is
 * never handed out — the codebase's C3 parser copy policy); the generator
 * deterministically emits that same canonical value.
 *
 * Unlike {@link literalShape} (an enum of PRIMITIVES, `Set`-membership guard),
 * `constShape` is the JSON-Schema `const` of a SINGLE value that may be
 * structured (object/array). It is always inhabited (its sole value is
 * `value`), so — unlike an empty `literalShape()` / `unionShape()` — it never
 * throws at build. The const generic preserves the literal type so
 * `Infer<typeof shape>` is the exact type of `value` (like `literalShape`).
 *
 * @param value - The single JSON value the shape accepts (const-generic preserved)
 * @returns A {@link ConstShape} node
 *
 * @example
 * ```ts
 * const kind = constShape('user')
 * // Infer<typeof kind> = 'user'   JSON Schema: { const: 'user' }
 * const origin = constShape({ x: 0, y: 0 })
 * // Infer<typeof origin> = { x: number; y: number }
 * ```
 */
export function constShape<const V extends JsonValue>(
	value: V,
): { readonly type: 'const'; readonly value: V } {
	// No empty/invalid throw (cf. literalShape / unionShape): a const is
	// ALWAYS inhabited — its sole value is `value` — so it is a valid,
	// useful shape, never a §13 programmer error. The builder stores the
	// supplied reference verbatim; handing out alias-free fresh copies is
	// the parser's/generator's job (C3 copy policy), not the builder's.
	//
	// WHY the return type is the precise const-generic literal ALONE — NOT
	// `… & ConstShape` like most builders (this mirrors `lazyShape`'s
	// D2.5-driven decision): `ConstShape.value` is the WIDE `JsonValue`.
	// Intersecting the precise `{ value: V }` with `ConstShape` makes
	// `value`'s type `V & JsonValue`, and `InferConst` would then extract
	// `V & JsonValue` instead of the precise `V` — collapsing
	// `Infer<constShape('x')>` to `'x' & JsonValue` rather than `'x'` (the
	// exact wide-interface pollution D2.5 eliminated). The precise literal
	// `{ type:'const'; value: V }` with `V extends JsonValue` is ALREADY
	// structurally assignable to `ConstShape` (and hence `ContractShape`):
	// `V extends JsonValue` so `value: V` is assignable to `value:
	// JsonValue`. Dropping the redundant `& ConstShape` keeps `value` the
	// precise `V`, so `Infer` recovers the exact literal/structural type.
	return { type: 'const', value }
}

// === Array

/**
 * Build an {@link ArrayShape}.
 *
 * @remarks
 * Throws if the length `min`/`max` are not finite, are negative, or
 * `min > max` (programmer error per AGENTS.md §13).
 *
 * @param items - Shape for each array element
 * @param options - Optional constraints: `min`/`max` length, `description`
 * @returns An {@link ArrayShape} node
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

// === Tuple

/**
 * Build a {@link TupleShape} — a fixed-length heterogeneous array whose
 * elements are typed positionally.
 *
 * @remarks
 * Each argument is the shape for the tuple element at that position; the
 * compiled guard accepts an array of EXACTLY that many elements where every
 * element satisfies its positional shape (the runtime mirror of `tupleOf`
 * in the validators module). Compiles to the standard closed-tuple JSON
 * Schema: `prefixItems` (one schema per position) + `items: false` +
 * `minItems === maxItems === arity`.
 *
 * Unlike {@link literalShape} / {@link unionShape}, an empty call is NOT a
 * programmer error: `tupleShape()` is the inhabited empty-tuple type whose
 * only value is `[]` (a valid, useful JSON-Schema closed tuple), so it is
 * allowed and does not throw. The rest-spread preserves the const tuple of
 * element shapes so `Infer` recovers `readonly [Infer<I0>, Infer<I1>, …]`.
 *
 * @param shapes - One shape per tuple position, in order (rest-spread)
 * @returns A {@link TupleShape} node
 *
 * @example
 * ```ts
 * const pair = tupleShape(stringShape(), integerShape())
 * // Infer<typeof pair> = readonly [string, number]
 * // JSON Schema: { type: 'array', prefixItems: [{type:'string'},{type:'integer'}],
 * //               items: false, minItems: 2, maxItems: 2 }
 * ```
 */
export function tupleShape<S extends readonly ContractShape[]>(
	...shapes: S
): { readonly type: 'tuple'; readonly items: S } & TupleShape {
	// No empty-arguments throw (cf. literalShape / unionShape): an empty
	// tuple is INHABITED — its sole value is `[]` — so it is a valid,
	// useful shape, not a §13 programmer error.
	return { type: 'tuple', items: shapes }
}

// === Object

/**
 * Build an {@link ObjectShape} from a property map.
 *
 * @remarks
 * Wrap any property in {@link optionalShape} to mark it absent-allowed.
 * The compiled guard rejects unknown keys unless `additionalProperties` is
 * set on the options.
 *
 * @param properties - Map from property name to child shape
 * @param options - Optional `additionalProperties` constraint and `description`
 * @returns An {@link ObjectShape} node
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
 * Build a {@link UnionShape} (`anyOf`) from a list of variant shapes.
 *
 * The compiled guard accepts a value matching at least one variant. Throws
 * at build time when called with no arguments. For exactly-one semantics,
 * use {@link oneOfShape}.
 *
 * @param variants - Two or more variant shapes (rest-spread)
 * @returns A {@link UnionShape} node with `anyOf` semantics
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
 * Wrap a shape so it may be absent (`undefined`).
 *
 * @remarks
 * Inside an {@link objectShape}, optional properties become true optional
 * fields in the inferred type (`T | undefined`). The compiled guard accepts
 * `undefined` or any value satisfying the inner shape.
 *
 * @param inner - The shape to make optional
 * @returns An {@link OptionalShape} wrapping `inner`
 *
 * @example
 * ```ts
 * const form = objectShape({
 *     name: stringShape({ min: 1 }),
 *     bio:  optionalShape(stringShape()),
 * })
 * // Infer<typeof form> = { name: string; bio?: string }
 * ```
 */
export function optionalShape<S extends ContractShape>(
	inner: S,
): { readonly type: 'optional'; readonly inner: S } & OptionalShape {
	return { type: 'optional', inner }
}

/**
 * Wrap a shape so it may be `null`.
 *
 * The compiled guard accepts `null` or any value satisfying the inner shape.
 * The emitted JSON Schema uses `anyOf: [inner, { type: 'null' }]`.
 *
 * @param inner - The shape to make nullable
 * @returns A {@link NullableShape} wrapping `inner`
 *
 * @example
 * ```ts
 * const maybeString = nullableShape(stringShape())
 * // Infer<typeof maybeString> = string | null
 * ```
 */
export function nullableShape<S extends ContractShape>(
	inner: S,
): { readonly type: 'nullable'; readonly inner: S } & NullableShape {
	return { type: 'nullable', inner }
}

// === Default

/**
 * Wrap a shape with an advisory default applied on ABSENCE.
 *
 * @remarks
 * `defaultShape(inner, value)` is `inner` plus a JSON-Schema `default`. The
 * behavioural contract is a DELIBERATE, useful asymmetry (mirrors
 * {@link optionalShape}'s `undefined` handling — call it out, do not
 * "fix" it):
 *
 * - **guard** delegates VERBATIM to `inner`'s guard — a default is advisory
 *   metadata, NOT optionality, so the guard does not accept `undefined` just
 *   because a default exists.
 * - **parser** applies the default on ABSENCE: `parse(undefined)` returns the
 *   default (a fresh deep copy for a non-primitive default, so no shared
 *   mutable reference leaks — same C3 copy policy as {@link constShape}); any
 *   other input parses through `inner`.
 * - So `guard(undefined)` is `inner.guard(undefined)` (false unless `inner`
 *   is itself optional) while `parser(undefined)` = the default. parse↔guard
 *   A/B/C still hold: `value` is build-validated below to satisfy `inner`'s
 *   guard, so every parser output (the default OR a parsed-inner value) is
 *   guard-valid (C); A/B are inherited from `inner`'s sound parser for every
 *   non-`undefined` input.
 * - **generate** generates from `inner` (the default is just ONE valid
 *   instance — generating from inner keeps variability;
 *   `assertGeneratorSatisfiesGuard` holds because inner's generator is sound).
 * - `Infer<typeof shape>` is `Infer<inner>` — the default does not change the
 *   static type.
 *
 * Throws at build time (AGENTS.md §13 — programmer error caught at the
 * boundary) when `value` does NOT satisfy `compileGuard(inner)`: a default
 * that fails its own inner would silently break `generator∘guard` /
 * `parse↔guard` downstream, so it is rejected here where the cause is
 * obvious. (`compileGuard(inner)` also runs the standard acyclicity check, so
 * a non-lazy structural cycle in `inner` is caught here too, consistent with
 * every other compiler boundary.)
 *
 * @param inner - The shape to wrap
 * @param value - The default, applied by the parser when input is `undefined`;
 *        MUST be a valid instance of `inner` (validated at build, §13)
 * @returns A {@link DefaultShape} wrapping `inner`
 *
 * @example
 * ```ts
 * const retries = defaultShape(integerShape({ min: 0 }), 3)
 * // Infer<typeof retries> = number   JSON Schema: { type:'integer', minimum:0, default:3 }
 * // parse(undefined) === 3 ; guard(undefined) === false (default is advisory)
 * ```
 */
export function defaultShape<S extends ContractShape>(
	inner: S,
	value: JsonValue,
): { readonly type: 'default'; readonly inner: S; readonly value: JsonValue } & DefaultShape {
	// §13 — a default that does not satisfy its own inner is programmer
	// error. Validate at the build boundary (NOT advisory/unchecked) so the
	// generator∘guard and parse↔guard contracts stay sound by construction:
	// the parser's `undefined → default` path can only ever emit a
	// guard-valid value if the default itself is guard-valid. `compileGuard`
	// also asserts `inner` acyclic up front (same as every compiler), so a
	// non-lazy structural cycle is caught here too.
	if (!compileGuard(inner)(value)) {
		throw new Error(
			'defaultShape: the default value must satisfy the inner shape (a default that fails its own inner is a programmer error)',
		)
	}
	return { type: 'default', inner, value }
}

// === Lazy

/**
 * Build a {@link LazyShape} — the LEGITIMATE recursion / self-reference
 * boundary (the runtime mirror of `lazyOf` in the validators module; maps to
 * JSON-Schema `$ref` / `$defs`).
 *
 * @remarks
 * `thunk` returns the actual inner shape and is invoked LAZILY — never at
 * build time, and once per resolution at compile time (memoized per
 * compilation; see {@link compileContract}). Deferring resolution is what
 * lets the thunk close over a binding assigned AFTER this call, the only way
 * to express a genuinely self-referential (recursive) shape:
 *
 * ```ts
 * interface Tree { value: number; children: readonly Tree[] }
 * const treeShape: ContractShape = objectShape({
 *     value: numberShape(),
 *     children: arrayShape(lazyShape(() => treeShape)),
 * })
 * ```
 *
 * WHY this is the cycle-BREAKER, not a §13 error (B5 reconciliation): every
 * compiler runs `assertAcyclicShape` first, which throws the precise §13
 * Error on any STRUCTURAL shape cycle. A `lazy` node is a TERMINAL for that
 * walk (its thunk is NOT invoked during acyclicity checking), so a shape
 * recursive THROUGH a `lazyShape` has no static back-edge and compiles,
 * while a NON-lazy structural cycle (`makeCyclicShape`-style) still throws —
 * `lazyShape` is the ONLY sanctioned recursion boundary.
 *
 * Generator termination: a recursive lazy shape's generator is bounded by a
 * deterministic max lazy-recursion depth; past it the generator emits the
 * resolved shape's MINIMAL inhabitant (see {@link compileGenerator}). A
 * required-recursive shape with NO finite inhabitant makes the generator
 * throw a precise §13 Error rather than silently violate `generator∘guard`.
 *
 * `Infer<lazyShape(() => X)>` resolves one level to `Infer<X>` for a
 * concrete `X`; for the self-recursive consumer pattern (thunk annotated
 * `() => ContractShape`) it is `unknown` — supply a named `interface` for
 * the precise static type (see the `Infer` docs in
 * [src/core/types.ts](./types.ts)).
 *
 * @param thunk - Zero-argument function returning the deferred inner shape
 * @returns A {@link LazyShape} node
 *
 * @example
 * ```ts
 * const node = lazyShape(() => treeShape) // deferred self-reference
 * ```
 */
export function lazyShape<S extends ContractShape>(
	thunk: () => S,
): { readonly type: 'lazy'; readonly thunk: () => S } {
	// The thunk is NOT invoked here (cf. validators' `lazyOf`): a
	// self-referential consumer assigns the target AFTER this call, so eager
	// resolution would make a recursive shape unconstructible. Deferral is
	// the entire point of this node.
	//
	// WHY the return type is the precise const-generic literal ALONE — NOT
	// `… & LazyShape` like the other builders: `LazyShape.thunk` is
	// `() => ContractShape` (the wide union). Intersecting the precise
	// `{ thunk: () => S }` with that makes `thunk`'s type the function
	// intersection `(() => S) & (() => ContractShape)`, whose `ReturnType`
	// TS resolves to the WIDE `ContractShape` (overload-set last-return) —
	// exactly the D2.5 "wide-interface pollution" failure mode, here it would
	// collapse `Infer<lazyShape(() => stringShape())>` to `unknown` instead
	// of `string`. The precise literal `{ type:'lazy'; thunk:() => S }` is
	// ALREADY structurally assignable to `LazyShape` (and hence
	// `ContractShape`): `S extends ContractShape` so `() => S` is assignable
	// to `() => ContractShape` (covariant return). Dropping the redundant
	// `& LazyShape` keeps `thunk`'s `ReturnType` the precise `S`, so the
	// non-recursive `Infer` resolves one level exactly.
	return { type: 'lazy', thunk }
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
 * The compiled parser succeeds only when exactly one variant guard accepts
 * the raw input; if two or more variant guards match the raw input the
 * exclusivity contract is violated and the parser returns `undefined` — it
 * never silently picks a winner.
 *
 * @param variants - Two or more mutually-exclusive variant shapes (rest-spread)
 * @returns A {@link UnionShape} node with `mode: 'oneOf'`
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

// === Intersection

/**
 * Build an {@link IntersectionShape} — a value satisfying ALL member shapes
 * simultaneously (the runtime mirror of `intersectionOf` in the validators
 * module). Compiles to JSON-Schema `{ allOf: [...] }`.
 *
 * @remarks
 * `Infer<intersectionShape(A, B)>` is `Infer<A> & Infer<B>` (the
 * `&`-intersection of the members' inferred object types).
 *
 * Throws at build time (AGENTS.md §13 — programmer error caught at the
 * boundary, mirroring B4-style boundary validation) when:
 *
 * 1. called with NO members — an empty intersection is degenerate (vacuously
 *    `unknown`, not a useful contract; cf. empty `literalShape` / `unionShape`);
 * 2. any member is NOT an object shape. Object-only is a deliberate
 *    GENERIC-SOUNDNESS decision: intersecting non-object shapes is degenerate
 *    (`string & number` is `never`; an array/primitive intersection has no
 *    sound, generic parser/generator merge that could satisfy
 *    `generator∘guard`). Object intersection IS well-defined — the value
 *    carries the union of every member's keys, each validated by its owning
 *    member, and merging generated/parsed member objects is sound. An object
 *    member is `objectShape(...)` or `recordShape(...)` (both `type:
 *    'object'`); a `union`/`tuple`/primitive member is rejected here rather
 *    than producing a silently-unsound contract downstream.
 *
 * @param members - Two or more object shapes the value must conjointly
 *        satisfy (rest-spread). One member is allowed (it is just that
 *        member) — only an empty list throws.
 * @returns An {@link IntersectionShape} node
 *
 * @example
 * ```ts
 * const named = objectShape({ name: stringShape({ min: 1 }) })
 * const aged = objectShape({ age: integerShape({ min: 0 }) })
 * const person = intersectionShape(named, aged)
 * // Infer<typeof person> = { readonly name: string } & { readonly age: number }
 * // JSON Schema: { allOf: [<named schema>, <aged schema>] }
 * ```
 */
export function intersectionShape<M extends readonly ContractShape[]>(
	...members: M
): { readonly type: 'intersection'; readonly members: M } & IntersectionShape {
	// §13 — empty intersection is degenerate (no members ⇒ vacuously every
	// value; not a useful, well-defined contract). Programmer error at the
	// build boundary, like an empty literal/union.
	if (members.length === 0) {
		throw new Error('intersectionShape requires at least one member')
	}
	// §13 — object-only soundness constraint. A non-object member has no
	// sound, generic parser/generator merge (see the @remarks WHY). Reject
	// at the boundary so a degenerate intersection can never reach a
	// compiler and silently produce guard-failing generator output or a
	// parser↔guard mismatch. A nested `intersectionShape` member is allowed:
	// it was itself validated object-only by its own builder call (this same
	// check runs recursively), so it transitively resolves to object members
	// and the merge stays sound.
	for (const member of members) {
		if (member.type !== 'object' && member.type !== 'intersection') {
			throw new Error(
				`intersectionShape members must be object shapes (objectShape/recordShape) or nested intersections; received a '${member.type}' member`,
			)
		}
	}
	return { type: 'intersection', members }
}

// === Record

/**
 * Build an open {@link ObjectShape} with no fixed properties.
 *
 * @remarks
 * Convenience wrapper for `objectShape({}, { additionalProperties: values })`.
 * Useful for dictionary-like structures such as `Record<string, number>`.
 *
 * @param values - Shape applied to every additional property value
 * @param options - Optional `description` annotation
 * @returns An open {@link ObjectShape} where all values must satisfy `values`
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
 * Use for properties that accept any value or require JSON Schema features
 * beyond the shape DSL. The compiled guard always returns `true`; the parser
 * passes the value through unchanged; the generator emits `null` (the
 * smallest valid JSON value) as a placeholder.
 *
 * @param schema - An arbitrary JSON Schema fragment to embed verbatim
 * @returns A {@link RawShape} node
 *
 * @example
 * ```ts
 * const anyValue = rawShape({ description: 'Default value' })
 * // The compiled guard accepts any value; the schema is embedded as-is.
 * ```
 */
export function rawShape(schema: JsonSchema): RawShape {
	return { type: 'raw', schema }
}
