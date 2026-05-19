import type {
	ContractInterface,
	ContractShape,
	JsonSchema,
	JsonSchemaMap,
	JsonSchemaObject,
	JsonValue,
	ObjectShape,
	RandomFunction,
} from './types.js'
import { MAX_LAZY_DEPTH, MAX_ONEOF_ATTEMPTS, MAX_RECURSION_DEPTH } from './constants.js'
import {
	assertAcyclicShape,
	flattenIntersectionObjects,
	guardPermitsAbsence,
	isShapeAdditional,
} from './helpers.js'
import { parseBoolean, parseInteger, parseNumber } from './parsers.js'
import { isObject, isRecord } from './validators.js'

// === D4 const equality + JSON deep copy
//
// JSON-Schema `const` is a STRUCTURAL value match (documented in
// `constShape` / `ConstShape`): primitive leaves compared by `Object.is` (so
// `NaN` matches `NaN` and `+0` ≠ `-0` — the SAME equality validators'
// `literalOf` uses; consistency across the codebase is deliberate), and
// arrays / plain objects compared by recursive structural deep-equality. The
// const `value` came through `constShape` typed as `JsonValue`, so it is a
// finite acyclic JSON tree (no functions, no cycles) — a plain recursive
// walk terminates without the WeakSet/depth guards the public JSON guards
// need for untrusted input. The `deepEqual` defined in this file IS that
// walk (it narrows objects via validators' `isRecord`):
// the const value is the trusted left operand `a` (bounding the recursion),
// the guard argument is the untrusted right operand `b`. The default
// property-read strategy is a direct `Reflect.get` — the trusted-input
// regime where a throwing accessor SHOULD propagate.
//
// A fresh deep copy of a (finite, acyclic) `JsonValue`. The const/default
// parser and the const generator hand this out so a non-primitive canonical
// value is NEVER a shared mutable reference into the shape (the codebase's
// C3 alias-free copy policy). A primitive returns as-is (immutable). Input is
// always a builder-supplied `JsonValue` (finite acyclic JSON), so the plain
// recursion terminates without cycle/depth guards.
// Parameter typed `JsonValue` for the call sites' clarity; narrowed
// internally via `Array.isArray`/`isRecord` and recursed through `unknown`
// children (same reason `deepEqual` takes `unknown` — `Array.isArray` cannot
// subtract the `JsonArray` interface from the union without an `as`). The return is
// re-typed `JsonValue` (a deep copy of a JSON tree is itself a JSON tree).
function cloneJsonValue(value: JsonValue): JsonValue {
	return cloneJsonInner(value)
}

function cloneJsonInner(value: unknown): JsonValue {
	if (Array.isArray(value)) {
		const valueArray: readonly unknown[] = value
		return valueArray.map((item) => cloneJsonInner(item))
	}
	if (!isRecord(value)) {
		// Primitive leaf — immutable, returned as-is. The input is a
		// `JsonValue` subtree, so a non-record non-array is a JSON primitive.
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return value
		}
		return null
	}
	const result: Record<string, JsonValue> = {}
	for (const key of Object.keys(value)) {
		const child = value[key]
		if (child !== undefined) {
			result[key] = cloneJsonInner(child)
		}
	}
	return result
}

/**
 * Structural deep-equality for the JSON-Schema `const` arm.
 *
 * @remarks
 * The single structural equality behind the `const` keyword in both
 * {@link compileGuard} and {@link compileParser}. The rules:
 *
 * - **Array** — when `a` is an array, `b` must be an array of the SAME length
 *   whose elements are positionally deep-equal.
 * - **Primitive leaf** — when `a` is neither an array nor a plain object the
 *   result is `Object.is(a, b)`. `Object.is` (not `===`) is deliberate and
 *   project-wide: `NaN` equals `NaN`, and `+0` is DISTINCT from `-0`.
 * - **Plain object** — when `a` is a plain object (a `null`-prototype or
 *   `Object.prototype`-prototype non-array, per validators' {@link isRecord}),
 *   `b` must also be a plain object with an own-key set of the SAME size,
 *   every `a` key must be an own key of `b` (`Object.hasOwn`, so an inherited
 *   key is never mistaken for a present own property — B2 prototype-pollution
 *   discipline), and the values must be deep-equal.
 *
 * `a` is the trusted SCHEMA-supplied operand — a finite acyclic `JsonValue`
 * — so the recursion is bounded by `a`'s finite shape regardless of `b`
 * (the untrusted input); no cycle/depth guard is needed.
 *
 * @param a - The trusted left operand (a finite acyclic JSON value)
 * @param b - The untrusted right operand to compare structurally against `a`
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
export function deepEqual(a: unknown, b: unknown): boolean {
	if (Array.isArray(a)) {
		// `a` is an array: `b` must be an array of equal length whose elements
		// are positionally deep-equal.
		const aArray: readonly unknown[] = a
		if (!Array.isArray(b) || aArray.length !== b.length) {
			return false
		}
		const bArray: readonly unknown[] = b
		for (let index = 0; index < aArray.length; index += 1) {
			if (!deepEqual(aArray[index], bArray[index])) {
				return false
			}
		}
		return true
	}
	if (!isRecord(a)) {
		// Primitive / non-plain leaf: `Object.is` so `NaN` === `NaN` and
		// `+0` ≠ `-0` (aligned with validators' `literalOf`).
		return Object.is(a, b)
	}
	// `a` is a plain object: `b` must be a plain object with the IDENTICAL
	// own-key set and every value deep-equal. Presence is tested via
	// `Object.hasOwn` so an inherited key is never mistaken for an own one.
	if (!isRecord(b)) {
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
		if (!deepEqual(Reflect.get(a, key), Reflect.get(b, key))) {
			return false
		}
	}
	return true
}

// === FU5 — intersection-of-objects schema MERGE (emission fidelity)
//
// A naive `allOf: [<member schema>, …]` is UNSOUND for an intersection of
// CLOSED objects: JSON-Schema `allOf` applies each sub-schema INDEPENDENTLY
// to the whole instance, so a value carrying the union of every member's
// keys is rejected by EVERY closed sub-schema (each treats a sibling
// member's key as an "additional" property) — the emitted schema is
// UNSATISFIABLE even though `compileGuard` for the same `intersectionShape`
// accepts the merged object. `intersectionShape` (§13) guarantees every
// effective leaf member is an OBJECT shape, so the conjunction is
// well-defined as ONE merged object: union the `properties`, union
// `required`, and reconcile `additionalProperties` with EXACTLY the guard
// arm's `allClosed` policy (every leaf closed ⇒ the merged object is closed
// over the UNION of known keys; any leaf open/typed-open ⇒ the merged object
// keeps that open policy). This is the schema MIRROR of the `intersection`
// guard arm (opened-member checks + closed-universe sweep over the union of
// declared keys), so the emitted schema's accept-set equals the guard's.
//
// PER-KEY CONJUNCTION (FU5 defect #1). A property key declared by MORE THAN
// ONE member must require the value at that key to satisfy ALL of those
// members' per-key schemas — this exactly mirrors the guard arm, where each
// member's (opened) guard checks its OWN declared key conjunctively, so the
// effective per-key constraint is the INTERSECTION of every member's per-key
// accept-set. The previous code did `properties[key] = …` which OVERWROTE on
// collision and kept only the LAST member's schema: for `{a:string} ∩
// {a:integer}` it emitted `{a:{type:'integer'}}` and wrongly accepted
// `{a:5}` (a false positive — the guard's accept-set for `a` is empty); for
// `{a:string,minLength:1} ∩ {a:string,maxLength:5}` it dropped one keyword.
// The fix accumulates a LIST of schemas per key and combines >1 with
// `allOf` (a single declarer keeps its bare schema — no needless wrapper),
// whose JSON-Schema 2020-12 accept-set is precisely the intersection of the
// members' per-key accept-sets, matching the guard. `required` stays the
// UNION (a key required by ANY member is required, since that member's guard
// demands it present — the conjunction does too).
//
// A typed-open member (`additionalProperties` is a `ContractShape`) keeps an
// `allOf` over the per-member schemas as a fallback: there is no single
// sound merged `additionalProperties` when distinct members constrain
// unknown keys with DIFFERENT sub-schemas, and that case is rare; the guard
// arm likewise defers to each member's own additional-key policy there. The
// merge only short-circuits the unsatisfiable closed/closed (and
// closed/plain-open) case, which is the actual FU5 defect.
function mergeIntersectionObjectSchema(
	objectMembers: readonly ObjectShape[],
	lazyContext: LazySchemaContext | undefined,
): JsonSchema {
	// One LIST of compiled schemas per key (one entry per member that
	// declares it) — combined into a per-key `allOf` below so an
	// overlapping key requires EVERY declaring member's schema (the schema
	// mirror of the guard's per-member conjunction on that key).
	const propertySchemas = new Map<string, JsonSchema[]>()
	const required = new Set<string>()
	// `allClosed`: every leaf member rejects unknown keys (the default /
	// `false`). `anyTypedOpen`: a leaf constrains unknown keys with a shape —
	// no single merged `additionalProperties` is sound, fall back to `allOf`.
	let allClosed = true
	let anyTypedOpen = false
	for (const member of objectMembers) {
		for (const key of Object.keys(member.properties)) {
			const child = member.properties[key]
			if (child === undefined) {
				continue
			}
			const schemas = propertySchemas.get(key)
			if (schemas === undefined) {
				propertySchemas.set(key, [compileSchemaInner(child, lazyContext)])
			} else {
				schemas.push(compileSchemaInner(child, lazyContext))
			}
			if (!guardPermitsAbsence(child)) {
				required.add(key)
			}
		}
		if (member.additionalProperties === true) {
			allClosed = false
		} else if (isShapeAdditional(member.additionalProperties)) {
			allClosed = false
			anyTypedOpen = true
		}
	}
	if (anyTypedOpen) {
		// Distinct typed-open members have no single sound merged
		// unknown-key schema — keep the per-member conjunction (the guard
		// arm likewise honours each member's own additional-key policy).
		return {
			allOf: objectMembers.map((member) => compileSchemaInner(member, lazyContext)),
		}
	}
	const properties: { [key: string]: JsonSchema } = {}
	for (const [key, schemas] of propertySchemas) {
		// A single declaring member keeps its bare schema; a key declared by
		// >1 member becomes the conjunction of every declarer's schema
		// (`allOf` accept-set = ∩ of the members' per-key accept-sets — the
		// guard's exact semantics for that key).
		const single = schemas.length === 1 ? schemas[0] : undefined
		properties[key] = single === undefined ? { allOf: schemas } : single
	}
	const result: {
		type: 'object'
		properties?: JsonSchemaMap
		required?: readonly string[]
		additionalProperties: boolean
	} = { type: 'object', additionalProperties: !allClosed }
	if (Object.keys(properties).length > 0) {
		result.properties = properties
	}
	if (required.size > 0) {
		result.required = [...required]
	}
	return result
}

// === FU1 — recursive-lazy DATA cycle/depth safety (§13: a guard NEVER throws)
//
// D3's `'lazy'` arm makes a recursive shape COMPILE (the static cycle-breaker)
// and terminates over genuinely FINITE recursive data. It did NOT, however,
// defend the compiled GUARD/PARSER against adversarial *DATA*: feeding a
// self-cyclic value (`const n = { value: 1 }; n.next = n`) — or a
// pathologically deep acyclic one — to a recursive `lazyShape`-based guard
// re-entered the resolved inner forever and V8 threw a bare
// `RangeError: Maximum call stack size exceeded` OUT of the guard. AGENTS.md
// §13: inside a type guard a cyclic/deep input must yield `false` (guard) /
// `undefined` (parser) — NEVER a thrown `RangeError`.
//
// The fix mirrors B5's exact discipline (validators' `isJsonValueInner` /
// `isJsonSchemaInner`) and E2's `compileRef` ancestor-pointer set, threaded
// through the `'lazy'` recursion at GUARD-EVAL and PARSE time:
//
//  1. `ancestors` — a per-compilation `WeakSet<object>` of the object values
//     currently ON the lazy-recursion path. Each `'lazy'` arm invocation that
//     receives an `object` value adds it on ENTER and removes it on EXIT, so
//     the set is the active root→node DATA path, NOT an all-visited set.
//     Re-encountering a value already on that path is a genuine back-edge (a
//     true data cycle) → the lazy guard returns `false` / parser `undefined`
//     WITHOUT recursing. Because entries are removed on exit, a
//     shared-but-ACYCLIC substructure — the SAME finite child object reached
//     under two distinct keys/positions (a DAG, perfectly valid finite data)
//     — is fully validated and removed before its second occurrence is
//     reached, so it is never mis-flagged as a cycle.
//  2. `MAX_RECURSION_DEPTH` — a secondary stack-safety backstop. Precise
//     cycle detection already terminates every TRUE cycle; this cap only
//     defends a pathologically deep BUT ACYCLIC recursive value (no repeated
//     reference for the ancestor set to catch) that would still overflow the
//     native stack. Exceeding it converts that into a `false`/`undefined`
//     return (§13) instead of a thrown `RangeError`. It bounds ONLY the
//     `lazy`-recursion depth (each lazy re-entry increments it); a true cycle
//     is caught by the ancestor `WeakSet` independent of this bound. The bound
//     itself and its empirical rationale are centralized in `constants.ts`.

/**
 * Per-compilation lazy-recursion DATA cycle/depth state (FU1). Threaded into
 * every `'lazy'` arm so the resolved inner guard/parser detects a DATA
 * back-edge or pathological depth and returns `false`/`undefined` rather than
 * throwing a `RangeError` (§13). `ancestors` is the active root→node path
 * (add-on-enter / delete-on-exit — NOT a visited-set, so DAGs are not
 * mis-flagged); `depth` is the lazy-recursion depth for the backstop.
 */
type LazyDataCycleState = { readonly ancestors: WeakSet<object>; depth: number }

/** Fresh per-compilation lazy-recursion DATA cycle/depth tracker (FU1). */
function newLazyDataCycleState(): LazyDataCycleState {
	return { ancestors: new WeakSet<object>(), depth: 0 }
}

// === D3 lazy memoization caches
//
// A recursive lazy shape's self-reference must reuse ONE compiled function
// per compilation rather than recompiling forever. Each public compiler
// threads a fresh cache keyed by the lazy THUNK; the `'lazy'` arm installs a
// deferred closure into the cache BEFORE compiling the inner, so the
// self-referential descent gets a cache hit and the recursion terminates.
// Named aliases + typed factories keep call sites `any`-free (a bare
// `new Map()` would infer `Map<any, any>`).

// Per-compilation lazy context: the thunk→compiled-fn memo `map` (D3) PLUS
// the FU1 runtime DATA cycle/depth `cycle` tracker. Both have exactly the
// per-compilation lifetime and are shared across the whole shape tree and
// every mutually-recursive lazy thunk, so they travel together as one object
// threaded through every recursive `compile*Inner` call (no per-call-site
// signature churn — only the `'lazy'` arm reads `.cycle`).

/** Per-compilation lazy-thunk → compiled-guard cache + DATA cycle tracker. */
type LazyGuardCache = {
	readonly map: Map<() => ContractShape, (value: unknown) => boolean>
	readonly cycle: LazyDataCycleState
}
/** Per-compilation lazy-thunk → compiled-parser cache + DATA cycle tracker. */
type LazyParserCache = {
	readonly map: Map<() => ContractShape, (value: unknown) => unknown>
	readonly cycle: LazyDataCycleState
}

/** Fresh, typed lazy-guard cache (avoids an untyped `new Map()`). */
function newLazyGuardCache(): LazyGuardCache {
	return {
		map: new Map<() => ContractShape, (value: unknown) => boolean>(),
		cycle: newLazyDataCycleState(),
	}
}

/** Fresh, typed lazy-parser cache (avoids an untyped `new Map()`). */
function newLazyParserCache(): LazyParserCache {
	return {
		map: new Map<() => ContractShape, (value: unknown) => unknown>(),
		cycle: newLazyDataCycleState(),
	}
}

// === Schema

/**
 * Compile a {@link ContractShape} into a JSON Schema document.
 *
 * @remarks
 * Emits standard JSON Schema. Object shapes use
 * `additionalProperties: false` and only list non-optional keys
 * in `required`. Nullable shapes emit an `anyOf` with `{ type: 'null' }`.
 * Convenience helper for callers that only need the schema (e.g.
 * registering a tool with an agent provider) without paying for the
 * guard, parser, and generator. Equivalent to
 * `compileContract(shape).schema` but skips constructing the full contract.
 *
 * EMISSION FIDELITY. For everything JSON Schema can represent, the emitted
 * schema and {@link compileGuard} describe the EXACT SAME value set — a
 * value satisfies the emitted schema iff it satisfies the compiled guard
 * ({@link compileGuard}). There is exactly ONE known STRICTER divergence,
 * enumerated last.
 *
 * - **Intersection of object shapes** — `intersectionShape` does NOT emit a
 *   naive `allOf: [<member>, …]`. JSON-Schema `allOf` applies every
 *   sub-schema INDEPENDENTLY to the whole instance, so an `allOf` of CLOSED
 *   objects (the default) is UNSATISFIABLE (each closed member rejects a
 *   sibling member's keys as "additional") even though the guard accepts
 *   the merged object. The effective leaf object members are instead MERGED
 *   into one object schema: union of `properties`, union of `required`, and
 *   `additionalProperties` reconciled exactly as the guard does — closed iff
 *   EVERY leaf member is closed (then closed over the UNION of known keys),
 *   open if any leaf is open. A property key declared by MORE THAN ONE
 *   member is emitted as the per-key conjunction `{ allOf: [<member-A's
 *   value schema>, <member-B's value schema>, …] }` (a single declarer
 *   keeps its bare value schema — no needless wrapper), whose accept-set
 *   for that key is precisely the INTERSECTION of the members' per-key
 *   accept-sets — exactly what the guard arm enforces (each member's guard
 *   checks its own declared key conjunctively). (Distinct typed-open
 *   members — each constraining unknown keys with a different sub-schema —
 *   have no single sound merged unknown-key schema and keep the per-member
 *   `allOf`, the same way the guard arm defers to each member's own
 *   additional-key policy there.) Round-trips EXACTLY, including
 *   guard-uninhabited overlapping keys (`{a:string} ∩ {a:integer}`) and
 *   compatible-but-distinct overlapping constraints (`{a:string,minLength:1}
 *   ∩ {a:string,maxLength:5}`).
 * - **Optionality (nested)** — a NESTED/property `optionalShape` emits the
 *   BARE inner schema; absence is carried structurally by the enclosing
 *   object OMITTING the key from `required` (JSON-Schema object validation
 *   checks a property's schema ONLY when the key is PRESENT, so an absent
 *   optional key is never checked and a present one is checked against
 *   `inner`). This round-trips EXACTLY.
 * - **THE ONE STRICTER KNOWN-DIVERGENCE — a bare top-level optional.** A
 *   bare `optionalShape` ROOT has no enclosing `required` to carry absence
 *   and JSON Schema has no value-level `undefined`, so the emitted bare
 *   inner schema REJECTS exactly the single value `undefined` that the
 *   guard ACCEPTS — and NOTHING WIDER (every other value round-trips
 *   exactly). The emitted schema is therefore strictly TIGHTER than the
 *   guard by exactly `{undefined}` at a bare document root. This is a
 *   deliberate, documented STRICTER divergence (NOT the previous degenerate
 *   `anyOf:[<inner>,{}]`, which — since JSON-Schema 2020-12 `{}` accepts
 *   EVERY instance — collapsed to a universally-true root that erased ALL
 *   of `inner`'s structure: strictly worse). A NESTED optional has no such
 *   gap (its absence is representable via `required` omission, above).
 *
 * @param shape - The shape to compile
 * @returns A JSON Schema object suitable for tool and agent integration
 *
 * @example
 * ```ts
 * const schema = compileSchema(
 *     objectShape({
 *         query:  stringShape({ description: 'Search query' }),
 *         limit:  optionalShape(integerShape({ min: 1, max: 100 })),
 *     }),
 * )
 * ```
 */
export function compileSchema(shape: ObjectShape): JsonSchemaObject
export function compileSchema(shape: ContractShape): JsonSchema
export function compileSchema(shape: ContractShape): JsonSchema {
	assertAcyclicShape(shape, new WeakSet<ContractShape>())
	// D3 lazy/$ref decision (documented + Phase-E seam): a `lazy` node emits
	// a `$ref` into a shared `$defs` map. The map is collected during the
	// recursive walk (one named definition per distinct thunk, memoized so a
	// recursive self-reference reuses the SAME `$ref` and the definition is
	// emitted ONCE — this is also what makes the recursive schema FINITE
	// rather than infinitely nested). At the public boundary the collected
	// `$defs` are hoisted onto the root schema (standard JSON-Schema 2020-12:
	// `$defs` lives at the document root, referenced by
	// `#/$defs/<name>` JSON-Pointer `$ref`s). For an OBJECT root the
	// `$defs`-augmented result is still a `type:'object'` schema, preserving
	// the `JsonSchemaObject` overload. SCOPE / LIMITATION (Phase E owns the
	// rest): this emits a single self-contained `$defs` block keyed by a
	// deterministic per-compile name (`Lazy0`, `Lazy1`, …); it does NOT yet
	// do cross-document `$id` resolution, `$ref` deduplication across
	// SEPARATE `compileSchema` calls, or canonical-name stability across
	// runs/processes. The emitted schema IS `isJsonSchema`-valid (a `$ref`
	// string + a `$defs` schema map are both modelled and recognised by
	// `isJsonSchema`). Phase E builds the full `$ref`/`$defs` resolver on
	// this seam.
	const context: LazySchemaContext = { defs: {}, names: new Map(), counter: { value: 0 } }
	// FU5 defect #2 — TOP-LEVEL optionality is the package's ONE known
	// STRICTER divergence (no root special-casing — the `'optional'` arm
	// emits the bare inner everywhere). `compileGuard(optionalShape(x))`
	// accepts `undefined` AS WELL AS every value `inner` accepts. A NESTED
	// optional carries "may be absent" structurally (the enclosing
	// `objectShape` omits the key from `required` and JSON-Schema object
	// validation only checks PRESENT keys), so the bare inner is EXACT
	// there. A bare top-level optional ROOT has NO enclosing `required` to
	// carry absence and JSON Schema has no value-level `undefined`, so the
	// emitted bare inner REJECTS exactly the one value (`undefined`) the
	// guard accepts — and NOTHING WIDER. The prior `anyOf:[<inner>,{}]`
	// "widening" was DEGENERATE: JSON-Schema 2020-12 `{}` accepts EVERY
	// instance, so `anyOf:[inner,{}]` ≡ `{}`, a universally-true root that
	// erased ALL of `inner`'s structure (it accepted `42`, `[]`, `null`,
	// anything) — strictly worse than the honest bare inner. Emitting the
	// bare inner makes this the SINGLE documented STRICTER known-divergence
	// (the schema is tighter than the guard by exactly `{undefined}` at a
	// bare root). This function's TSDoc documents the single stricter
	// divergence; nothing wider than that single value diverges. No
	// boundary branch is needed:
	// the `'optional'` arm already returns `compileSchemaInner(shape.inner)`,
	// so a top-level optional flows through it to the bare inner.
	const root = compileSchemaInner(shape, context)
	if (Object.keys(context.defs).length === 0) {
		return root
	}
	// Hoist the collected definitions onto the document root. A boolean root
	// (only `rawShape(true/false)`) cannot carry `$defs`; wrap it in the
	// equivalent object form so the definitions are not lost.
	if (typeof root === 'boolean') {
		return root ? { $defs: context.defs } : { not: {}, $defs: context.defs }
	}
	return { ...root, $defs: context.defs }
}

// Per-compilation context for `lazy` → `$ref`/`$defs` emission. `names`
// memoizes thunk → definition name so a recursive self-reference resolves to
// the SAME `$ref` (and the definition body is built exactly once — the
// guard against infinite schema nesting). `counter` yields deterministic
// per-compile names (`Lazy0`, `Lazy1`, …).
interface LazySchemaContext {
	readonly defs: Record<string, JsonSchema>
	readonly names: Map<() => ContractShape, string>
	readonly counter: { value: number }
}

function compileSchemaInner(shape: ContractShape, lazyContext?: LazySchemaContext): JsonSchema {
	switch (shape.type) {
		case 'string': {
			return {
				type: 'string',
				...(shape.min !== undefined ? { minLength: shape.min } : {}),
				...(shape.max !== undefined ? { maxLength: shape.max } : {}),
				...(shape.pattern !== undefined ? { pattern: shape.pattern.source } : {}),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'number': {
			return {
				type: shape.integer === true ? 'integer' : 'number',
				...(shape.min !== undefined ? { minimum: shape.min } : {}),
				...(shape.max !== undefined ? { maximum: shape.max } : {}),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'boolean': {
			return {
				type: 'boolean',
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'literal': {
			return {
				enum: [...shape.values],
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'array': {
			return {
				type: 'array',
				items: compileSchemaInner(shape.items, lazyContext),
				...(shape.min !== undefined ? { minItems: shape.min } : {}),
				...(shape.max !== undefined ? { maxItems: shape.max } : {}),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'tuple': {
			// Standard JSON-Schema (2020-12) closed-tuple encoding: one schema
			// per position in `prefixItems`, `items: false` to forbid any
			// element past the prefix, and `minItems === maxItems === arity`
			// to pin the EXACT length. This mirrors validators' `tupleOf`
			// (array + exact-length + positional). An empty tuple yields
			// `prefixItems: []`, `minItems: 0`, `maxItems: 0` — the closed `[]`
			// schema.
			const length = shape.items.length
			return {
				type: 'array',
				prefixItems: shape.items.map((item) => compileSchemaInner(item, lazyContext)),
				items: false,
				minItems: length,
				maxItems: length,
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'object': {
			const properties: { [key: string]: JsonSchema } = {}
			const required: string[] = []
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child === undefined) {
					continue
				}
				properties[key] = compileSchemaInner(child, lazyContext)
				// A property is `required` unless it permits absence. D4: a
				// `default` property is required iff its inner is NOT optional
				// (the default is advisory; a `DefaultShape` carries the
				// SAME static type as its inner, so a `default(optional(x))` is type-optional
				// and not required, while `default(integer())` IS required —
				// the guard does not auto-apply the default). `nullable`/
				// primitive stay required exactly as before.
				if (!guardPermitsAbsence(child)) {
					required.push(key)
				}
			}
			const result: {
				type: 'object'
				properties?: JsonSchemaMap
				required?: readonly string[]
				additionalProperties?: boolean | JsonSchema
				description?: string
			} = { type: 'object' }
			if (Object.keys(properties).length > 0) {
				result.properties = properties
			}
			if (required.length > 0) {
				result.required = required
			}
			if (shape.additionalProperties === true) {
				result.additionalProperties = true
			} else if (isShapeAdditional(shape.additionalProperties)) {
				result.additionalProperties = compileSchemaInner(shape.additionalProperties, lazyContext)
			} else {
				result.additionalProperties = false
			}
			if (shape.description !== undefined) {
				result.description = shape.description
			}
			return result
		}
		case 'union': {
			const compiled = shape.variants.map((variant) => compileSchemaInner(variant, lazyContext))
			return {
				...(shape.mode === 'oneOf' ? { oneOf: compiled } : { anyOf: compiled }),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'intersection': {
			// FU5 — emission fidelity. `intersectionShape` (§13) guarantees
			// every effective leaf member is an OBJECT shape, so the
			// conjunction is ONE merged object — NOT a naive
			// `allOf: [<closed A>, <closed B>]`, which JSON Schema applies
			// independently and which is therefore UNSATISFIABLE for closed
			// members (each rejects the other's keys), disagreeing with the
			// `compileGuard` accept-set. `mergeIntersectionObjectSchema`
			// unions `properties`/`required` and reconciles
			// `additionalProperties` with EXACTLY the guard arm's `allClosed`
			// policy, so the emitted schema accepts precisely the guard's set
			// (round-trip parity oracle). The nested-intersection case is
			// flattened to its effective leaf objects first, mirroring the
			// guard's `flattenIntersectionObjects`.
			const merged = mergeIntersectionObjectSchema(flattenIntersectionObjects(shape), lazyContext)
			if (shape.description !== undefined && typeof merged !== 'boolean') {
				return { ...merged, description: shape.description }
			}
			return merged
		}
		case 'const': {
			// Standard JSON-Schema `const`: the value must equal exactly
			// `shape.value`. A fresh deep copy is embedded so the emitted
			// schema can never alias (and be mutated through) the shape's own
			// stored value (C3 alias-free policy; `isJsonSchema` validates a
			// `const` keyword as any JSON value, so this is schema-valid).
			return {
				const: cloneJsonValue(shape.value),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'optional':
			// An `optionalShape` ALWAYS emits the BARE inner schema (nested
			// AND top-level — no root special-casing). NESTED: an
			// `objectShape` makes an optional property absent-tolerant by
			// OMITTING it from `required` (NOT by changing the property's own
			// schema), and JSON-Schema object validation checks a
			// property's schema ONLY when the key is PRESENT — so an absent
			// optional key is never checked and a present one is checked
			// against `inner`: the bare inner is EXACT for a nested optional.
			// Wrapping the inner here (e.g. `anyOf:[inner,{}]`) would
			// OVER-APPROXIMATE every optional property (the always-true `{}`
			// branch ≡ `{}` swallows the inner constraint entirely) and break
			// round-trip parity for present-but-invalid values. TOP-LEVEL: a
			// bare optional root has no enclosing `required` to carry absence
			// and JSON Schema has no value-level `undefined`, so the bare
			// inner REJECTS exactly the one `undefined` the guard accepts —
			// the package's SINGLE documented STRICTER known-divergence (the
			// schema is tighter than the guard by exactly `{undefined}` at a
			// bare root; nothing wider — every other value round-trips
			// exactly; see `compileSchema`'s TSDoc for the full
			// emission-fidelity contract).
			return compileSchemaInner(shape.inner, lazyContext)
		case 'nullable':
			return { anyOf: [compileSchemaInner(shape.inner, lazyContext), { type: 'null' }] }
		case 'default': {
			// Inner's schema with the JSON-Schema `default` keyword added. A
			// boolean inner schema (only `rawShape(true/false)`) cannot carry
			// a `default` keyword; wrap it in the equivalent object form so
			// the annotation is not lost (mirrors the `$defs` boolean-root
			// handling in `compileSchema`). A fresh deep copy of the default
			// is embedded (no shared alias into the shape; `isJsonSchema`
			// accepts a `default` of any JSON value).
			const innerSchema = compileSchemaInner(shape.inner, lazyContext)
			const defaultValue = cloneJsonValue(shape.value)
			if (typeof innerSchema === 'boolean') {
				return innerSchema ? { default: defaultValue } : { not: {}, default: defaultValue }
			}
			return { ...innerSchema, default: defaultValue }
		}
		case 'lazy': {
			// D3 lazy → JSON-Schema `$ref` / `$defs` (documented + Phase-E
			// seam — see the `compileSchema` boundary comment). Memoize
			// thunk → definition name so a RECURSIVE self-reference resolves
			// to the SAME `$ref` and the definition body is materialized
			// exactly ONCE: this is precisely what keeps a recursive shape's
			// schema FINITE instead of infinitely nested. The name is
			// reserved (added to `names`) BEFORE the body is compiled, so the
			// recursive descent that re-enters this arm hits the memo and
			// emits a bare `$ref` (no re-recursion). `lazyContext` is always
			// present when reached via the public `compileSchema` boundary;
			// the `?? new` fallback keeps this arm total for any direct inner
			// call and still yields a valid self-contained ref+defs.
			const context: LazySchemaContext = lazyContext ?? {
				defs: {},
				names: new Map(),
				counter: { value: 0 },
			}
			const existing = context.names.get(shape.thunk)
			if (existing !== undefined) {
				return { $ref: `#/$defs/${existing}` }
			}
			const name = `Lazy${context.counter.value}`
			context.counter.value += 1
			context.names.set(shape.thunk, name)
			// Compile the resolved inner shape into the shared `$defs`. A
			// recursive thunk re-enters this arm with the SAME thunk → memo
			// hit above → bare `$ref`, so this terminates.
			context.defs[name] = compileSchemaInner(shape.thunk(), context)
			return { $ref: `#/$defs/${name}` }
		}
		case 'raw':
			return shape.schema
	}
}

// === Guards

/**
 * Compile a {@link ContractShape} into a runtime type-guard predicate.
 *
 * @remarks
 * The returned function is `(value: unknown) => boolean`. The
 * {@link ContractInterface} wraps it in a typed `Guard<T>` predicate so
 * consumers get full narrowing. Never throws on guard invocation — guards
 * are cycle-safe when built from the public shape builders (a cyclic shape
 * built without a lazy wrapper is detected up front and throws at compile
 * time with a precise message, not a `RangeError` deep in the call stack).
 *
 * @param shape - The shape to compile
 * @returns A runtime predicate `(value: unknown) => boolean` for the shape
 *
 * @example
 * ```ts
 * const isUser = compileGuard(objectShape({ name: stringShape({ min: 1 }) }))
 * isUser({ name: 'Ada' }) // true
 * isUser({ name: '' })    // false — fails minLength: 1
 * ```
 */
export function compileGuard(shape: ContractShape): (value: unknown) => boolean {
	assertAcyclicShape(shape, new WeakSet<ContractShape>())
	// D3 lazy memoization: a per-compilation cache keyed by the lazy thunk.
	// A recursive shape's self-reference resolves to the SAME compiled guard
	// rather than recompiling forever — the standard fix for compile-time
	// non-termination on a recursive lazy shape. Threaded through every
	// recursive `compileGuardInner` call so a nested lazy anywhere in the
	// tree shares one cache.
	return compileGuardInner(shape, newLazyGuardCache())
}

function compileGuardInner(
	shape: ContractShape,
	lazyCache: LazyGuardCache,
): (value: unknown) => boolean {
	switch (shape.type) {
		case 'string': {
			const { min, max } = shape
			// Strip the `g` (global) and `y` (sticky) flags from the pattern at
			// compile time. Both flags make `RegExp.prototype.test` stateful
			// (they advance `lastIndex` on a match), which would cause a compiled
			// guard to return different results on identical inputs depending on
			// prior call history — a direct violation of §13 ("a public type guard
			// must never throw AND must be deterministic"). The guard tests
			// presence-or-absence (boolean), not position, so neither flag is
			// meaningful; stripping them produces the intended semantics. A new
			// RegExp is created at compile time, not per-call, so the cost is
			// paid once and the returned guard function captures a stable,
			// stateless regex reference.
			const pattern =
				shape.pattern !== undefined
					? new RegExp(shape.pattern.source, shape.pattern.flags.replace(/[gy]/g, ''))
					: undefined
			return (value) => {
				if (typeof value !== 'string') {
					return false
				}
				if (min !== undefined && value.length < min) {
					return false
				}
				if (max !== undefined && value.length > max) {
					return false
				}
				return !(pattern !== undefined && !pattern.test(value))
			}
		}
		case 'number': {
			const { min, max, integer } = shape
			return (value) => {
				if (typeof value !== 'number' || !Number.isFinite(value)) {
					return false
				}
				if (integer === true && !Number.isInteger(value)) {
					return false
				}
				if (min !== undefined && value < min) {
					return false
				}
				return !(max !== undefined && value > max)
			}
		}
		case 'boolean':
			return (value) => typeof value === 'boolean'
		case 'literal': {
			const allowed = new Set<unknown>(shape.values)
			return (value) => allowed.has(value)
		}
		case 'array': {
			const itemGuard = compileGuardInner(shape.items, lazyCache)
			const { min, max } = shape
			return (value) => {
				if (!Array.isArray(value)) {
					return false
				}
				if (min !== undefined && value.length < min) {
					return false
				}
				if (max !== undefined && value.length > max) {
					return false
				}
				for (const item of value) {
					if (!itemGuard(item)) {
						return false
					}
				}
				return true
			}
		}
		case 'tuple': {
			// Mirror validators' `tupleOf`: valid iff an array of EXACTLY the
			// tuple arity where each element passes its POSITIONAL guard.
			const itemGuards = shape.items.map((item) => compileGuardInner(item, lazyCache))
			return (value) => {
				if (!Array.isArray(value) || value.length !== itemGuards.length) {
					return false
				}
				for (let index = 0; index < itemGuards.length; index += 1) {
					const guard = itemGuards[index]
					if (guard === undefined || !guard(value[index])) {
						return false
					}
				}
				return true
			}
		}
		case 'object': {
			const entries: {
				key: string
				guard: (value: unknown) => boolean
				optional: boolean
			}[] = []
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child === undefined) {
					continue
				}
				entries.push({
					key,
					guard: compileGuardInner(child, lazyCache),
					// D4: absence is permitted iff the property permits absence
					// at the guard level — `optional`, or a `default` whose
					// inner is optional (guard == inner's, so a default does
					// NOT make a required inner absent-tolerant). No-op for
					// every pre-D4 kind.
					optional: guardPermitsAbsence(child),
				})
			}
			const allowed = new Set(entries.map((entry) => entry.key))
			const additionalGuard = isShapeAdditional(shape.additionalProperties)
				? compileGuardInner(shape.additionalProperties, lazyCache)
				: undefined
			const open = shape.additionalProperties === true || additionalGuard !== undefined
			return (value) => {
				if (!isRecord(value)) {
					return false
				}
				for (const key of Object.keys(value)) {
					if (!allowed.has(key)) {
						if (!open) {
							return false
						}
						if (additionalGuard !== undefined && !additionalGuard(value[key])) {
							return false
						}
					}
				}
				for (const entry of entries) {
					const present = entry.key in value
					if (!present) {
						if (entry.optional) {
							continue
						}
						return false
					}
					if (!entry.guard(value[entry.key])) {
						return false
					}
				}
				return true
			}
		}
		case 'union': {
			const guards = shape.variants.map((variant) => compileGuardInner(variant, lazyCache))
			if (shape.mode === 'oneOf') {
				// JSON-Schema `oneOf`: a value is valid iff it matches
				// EXACTLY ONE variant. `anyOf` (the default below) is
				// at-least-one. We must count matches, not short-circuit on
				// the first, so a value matching ≥2 variants is rejected.
				return (value) => {
					let matches = 0
					for (const guard of guards) {
						if (guard(value)) {
							matches += 1
							if (matches > 1) {
								return false
							}
						}
					}
					return matches === 1
				}
			}
			return (value) => guards.some((guard) => guard(value))
		}
		case 'intersection': {
			// Runtime mirror of validators' `intersectionOf`: valid iff the
			// value satisfies EVERY member. All members are object shapes
			// (enforced at build by `intersectionShape` §13). Compiling each
			// member guard as-is would be UNSOUND for the intersection: a
			// CLOSED object member (`additionalProperties: false`, the default)
			// rejects any key it does not itself declare — but a sibling
			// member's key is part of the intersection contract, NOT an
			// "unknown" key. So a member's unknown-key rejection must be
			// relaxed to the set of ALL members' declared keys.
			//
			// Implementation: each member is guarded by a CLONE opened with
			// `additionalProperties: true` (so it stops rejecting/over-checking
			// keys it does not own — its required/typed checks for its OWN keys
			// are unchanged), AND a final "closed-universe" check rejects any
			// key declared by NO member WHEN every member was originally closed
			// (preserving closed-object strictness for the merged shape). A
			// member that is open (`true`) or constrained (a shape) keeps its
			// own additional-key policy via its original guard.
			// The EFFECTIVE leaf object members (nested intersections flattened
			// in) define the merged key universe and the closed/open policy.
			const objectMembers = flattenIntersectionObjects(shape)
			const declaredKeys = new Set<string>()
			let allClosed = true
			for (const member of objectMembers) {
				for (const key of Object.keys(member.properties)) {
					declaredKeys.add(key)
				}
				if (member.additionalProperties !== undefined && member.additionalProperties !== false) {
					allClosed = false
				}
			}
			// One guard per LEAF object member: a closed member is opened to
			// sibling keys (`additionalProperties: true`) so it still enforces
			// its OWN declared keys' presence/type but no longer rejects a
			// sibling member's key; the closed-universe check below restores
			// closed-object strictness across the merged key set. An
			// open/constrained member keeps its own additional-key policy.
			const memberGuards = objectMembers.map((member) => {
				if (member.additionalProperties === undefined || member.additionalProperties === false) {
					const opened: ObjectShape = {
						type: 'object',
						properties: member.properties,
						additionalProperties: true,
						...(member.description !== undefined ? { description: member.description } : {}),
					}
					return compileGuardInner(opened, lazyCache)
				}
				return compileGuardInner(member, lazyCache)
			})
			return (value) => {
				if (!isRecord(value)) {
					return false
				}
				for (const guard of memberGuards) {
					if (!guard(value)) {
						return false
					}
				}
				if (allClosed) {
					for (const key of Object.keys(value)) {
						if (!declaredKeys.has(key)) {
							return false
						}
					}
				}
				return true
			}
		}
		case 'const': {
			// JSON-Schema `const`: valid iff the input STRUCTURALLY equals
			// `shape.value` — `Object.is` at primitive leaves (so `NaN`
			// matches `NaN`, `+0` ≠ `-0`, consistent with validators'
			// `literalOf`), recursive deep-equal for arrays/objects. The
			// trusted const value bounds the recursion (it is a finite
			// acyclic `JsonValue`).
			const constValue = shape.value
			return (value) => deepEqual(constValue, value)
		}
		case 'optional': {
			const guard = compileGuardInner(shape.inner, lazyCache)
			return (value) => value === undefined || guard(value)
		}
		case 'nullable': {
			const guard = compileGuardInner(shape.inner, lazyCache)
			return (value) => value === null || guard(value)
		}
		case 'default': {
			// Guard delegates VERBATIM to the inner guard — a default is
			// advisory metadata, NOT optionality, so the guard does NOT
			// accept `undefined` just because a default exists (documented
			// parse-applies-default / guard-is-inner asymmetry). The
			// `undefined → default` behaviour lives ONLY in the parser arm.
			return compileGuardInner(shape.inner, lazyCache)
		}
		case 'lazy': {
			// D3 recursion: a recursive lazy shape's guard must NOT recompile
			// forever. Memoization strategy (documented): a per-compilation
			// `Map` keyed by the lazy THUNK, threaded through every recursive
			// `compileGuardInner`. The deferred closure is installed in the
			// cache BEFORE the inner is compiled, so when compiling the inner
			// re-enters this arm with the SAME thunk it gets the cache hit and
			// returns the SAME deferred closure — the self-reference reuses
			// one compiled guard instead of recursing. The compiled inner is
			// itself memoized in a closure variable (`resolved`), built once
			// on FIRST INVOCATION; recursion over genuinely recursive DATA
			// terminates naturally because the data is finite (each level
			// calls the one shared compiled guard on a strictly smaller
			// sub-value). FU1 adds the runtime DATA cycle/depth wrapper
			// below (see the `MAX_RECURSION_DEPTH` block) so an ADVERSARIAL
			// cyclic / pathologically-deep value yields `false` (§13 NEVER
			// throw) instead of a `RangeError` out of the guard.
			const cached = lazyCache.map.get(shape.thunk)
			if (cached !== undefined) {
				return cached
			}
			let resolved: ((value: unknown) => boolean) | undefined
			const cycle = lazyCache.cycle
			const guard = (value: unknown): boolean => {
				if (resolved === undefined) {
					resolved = compileGuardInner(shape.thunk(), lazyCache)
				}
				// FU1: §13 NEVER-throw. Only objects can form a DATA cycle /
				// be tracked. A primitive bypasses tracking (no edge). An
				// ancestor-path member is a true back-edge -> false; the
				// depth cap is the acyclic-but-deep stack backstop. Entries
				// are removed on exit so a DAG is not mis-flagged.
				if (!isObject(value)) {
					return resolved(value)
				}
				if (cycle.ancestors.has(value) || cycle.depth >= MAX_RECURSION_DEPTH) {
					return false
				}
				cycle.ancestors.add(value)
				cycle.depth += 1
				try {
					return resolved(value)
				} finally {
					cycle.depth -= 1
					cycle.ancestors.delete(value)
				}
			}
			lazyCache.map.set(shape.thunk, guard)
			return guard
		}
		case 'raw':
			return () => true
	}
}

// === Parsers

/**
 * Compile a {@link ContractShape} into an input parser.
 *
 * @remarks
 * The returned parser coerces and normalises input (e.g. numeric strings to
 * numbers, trimming strings) and returns the parsed value on success or
 * `undefined` on failure. Parse↔guard soundness contract: the parser never
 * emits a value that the same shape's compiled guard would reject, and it
 * never rejects a value the guard already accepts (A/B/C invariants). Object
 * parsers fail the whole record when any required field is absent or fails to
 * parse. `oneOf` union parsers enforce exclusivity: if two or more variant
 * guards match the raw input, the parser returns `undefined` rather than
 * silently picking a winner.
 *
 * @param shape - The shape to compile
 * @returns A parser `(value: unknown) => unknown` that returns the normalised
 *          value or `undefined`
 *
 * @example
 * ```ts
 * const parseAge = compileParser(integerShape({ min: 0, max: 120 }))
 * parseAge('36')  // 36 (numeric string coerced)
 * parseAge(-1)    // undefined — below min
 * parseAge('abc') // undefined
 * ```
 */
export function compileParser(shape: ContractShape): (value: unknown) => unknown {
	assertAcyclicShape(shape, new WeakSet<ContractShape>())
	// D3 lazy memoization: a per-compilation cache keyed by the lazy thunk,
	// threaded through every recursive `compileParserInner` so a recursive
	// shape's self-reference reuses ONE compiled parser instead of
	// recompiling forever (same strategy as the guard compiler).
	return compileParserInner(shape, newLazyParserCache())
}

function compileParserInner(
	shape: ContractShape,
	lazyCache: LazyParserCache,
): (value: unknown) => unknown {
	switch (shape.type) {
		case 'string': {
			// Parse↔guard soundness (the canonical contract in
			// tests/src/core/_helpers.ts): the COMPILED parser must accept
			// exactly what THIS shape's guard accepts and never emit a value
			// the guard rejects. The standalone `parseString` is the
			// opinionated primitive (trims, rejects '') and DIVERGES from
			// guard semantics — delegating to it broke (A) (it rejected the
			// guard-valid '') and (B)/(C) (its trim could shrink a value
			// below `min` or its trim/`''`-rejection could yield a value the
			// `min`/`max`/`pattern` guard would reject). Discipline:
			//   1. coerce a numeric input to its string form (preserves the
			//      "JSON number arriving where a string is wanted" intent);
			//   2. produce a normalized candidate (the trimmed string);
			//   3. if the candidate passes THIS shape's guard, return it;
			//   4. else if the RAW string passes the guard, return it
			//      untrimmed (never reject input the guard already accepts);
			//   5. else undefined.
			// This makes (A)(B)(C) hold for every string constraint without
			// per-call-site special-casing — it is shape-guard-driven.
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				let raw: string | undefined
				if (typeof value === 'string') {
					raw = value
				} else if (typeof value === 'number' && Number.isFinite(value)) {
					raw = String(value)
				} else {
					return undefined
				}
				const trimmed = raw.trim()
				if (guard(trimmed)) {
					return trimmed
				}
				if (guard(raw)) {
					return raw
				}
				return undefined
			}
		}
		case 'number': {
			// Parse↔guard soundness: keep the `parseNumber`/`parseInteger`
			// coercion intent (numeric strings like '5' → 5) but re-validate
			// the coerced value against THIS shape's guard so a coercion
			// outcome can never violate min/max/integer (C). If the coerced
			// value fails the shape guard we do NOT fall back to the raw
			// input — the raw is a non-number (string/etc.) the number guard
			// would reject anyway, so undefined is correct.
			const primitive = shape.integer === true ? parseInteger : parseNumber
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				const parsed = primitive(value)
				if (parsed !== undefined && guard(parsed)) {
					return parsed
				}
				if (guard(value)) {
					return value
				}
				return undefined
			}
		}
		case 'boolean':
			// `parseBoolean` only ever returns a boolean or undefined, and
			// the boolean guard accepts every boolean — so its output is
			// already guard-sound (A)(B)(C). No re-validation needed.
			return parseBoolean
		case 'literal': {
			// Parse↔guard soundness: the literal guard does NOT trim, so a
			// trimmed candidate is only sound if it is itself an allowed
			// literal. Re-validate every produced candidate against the
			// shape's own guard; never emit a trimmed value the literal
			// guard would reject (C).
			const allowed = new Set<unknown>(shape.values)
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				if (guard(value)) {
					return value
				}
				if (typeof value === 'string') {
					const trimmed = value.trim()
					if (allowed.has(trimmed)) {
						return trimmed
					}
				}
				return undefined
			}
		}
		case 'array': {
			// Parse↔guard soundness: the per-item parser is itself sound
			// (recursively), so a guard-valid array maps to an array of
			// guard-valid items (A)(B). But the array's OWN min/max length
			// constraint is enforced only by the array guard — without a
			// final re-validation a length-violating input would still
			// produce a populated array, breaking (C). So: build the parsed
			// array, then if it passes THIS shape's guard return it; else if
			// the RAW array already passes the guard return it untouched
			// (never reject a guard-valid input); else undefined.
			const itemParser = compileParserInner(shape.items, lazyCache)
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				if (!Array.isArray(value)) {
					return undefined
				}
				const result: unknown[] = []
				let allParsed = true
				for (const item of value) {
					const parsed = itemParser(item)
					if (parsed === undefined) {
						allParsed = false
						break
					}
					result.push(parsed)
				}
				if (allParsed && guard(result)) {
					return result
				}
				if (guard(value)) {
					return value
				}
				return undefined
			}
		}
		case 'tuple': {
			// Parse↔guard soundness, mirroring the `array` arm but
			// positionally: each position parser is itself sound recursively,
			// so a guard-valid tuple maps to a tuple of guard-valid elements
			// (A)(B). Arity is enforced by THIS shape's guard, so we re-validate
			// the freshly built tuple for (C); if it fails we fall back to the
			// RAW array only when the guard already accepts it (never reject a
			// guard-valid input), else undefined. Tuples are positional arrays
			// (no string keys written to a fresh object) so the
			// prototype-pollution concern of the object arm does not apply.
			const itemParsers = shape.items.map((item) => compileParserInner(item, lazyCache))
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				if (!Array.isArray(value) || value.length !== itemParsers.length) {
					return undefined
				}
				const result: unknown[] = []
				let allParsed = true
				for (let index = 0; index < itemParsers.length; index += 1) {
					const parser = itemParsers[index]
					if (parser === undefined) {
						allParsed = false
						break
					}
					const parsed = parser(value[index])
					if (parsed === undefined) {
						allParsed = false
						break
					}
					result.push(parsed)
				}
				if (allParsed && guard(result)) {
					return result
				}
				if (guard(value)) {
					return value
				}
				return undefined
			}
		}
		case 'object': {
			// Prototype-pollution policy (security): this is the only parser
			// arm that BUILDS a fresh `{}` accumulator and writes
			// externally-derived keys into it. A `JSON.parse` body can carry
			// `__proto__` / `constructor` / `prototype` as OWN enumerable
			// keys (JSON.parse bypasses the `__proto__` setter), and those
			// keys then flow through `isRecord` (which accepts an
			// Object.prototype-proto object) + `Object.keys`. Writing them
			// onto a plain `{}` via `result[key] = …` would invoke the
			// `__proto__` accessor / graft `constructor`/`prototype` and
			// pollute the prototype chain. Policy: such keys are DROPPED
			// (never written, not even as own props) — "normalize untrusted
			// input safely" means a hostile key is absent from the output,
			// not silently preserved. Source keys are read with
			// `Object.hasOwn` (never a bare `value[key]` over `Object.keys`
			// without an own-check, and never `key in value` which would
			// also see inherited keys). The same DROP policy is applied
			// uniformly to the closed-properties arm below for consistency,
			// even though shape keys are fixed (it only matters if a shape
			// literally declares one of these names as a property).
			const isDangerousKey = (key: string): boolean =>
				key === '__proto__' || key === 'constructor' || key === 'prototype'
			const entries: {
				key: string
				parse: (value: unknown) => unknown
				optional: boolean
				appliesDefault: boolean
			}[] = []
			for (const key of Object.keys(shape.properties)) {
				if (isDangerousKey(key)) {
					continue
				}
				const child = shape.properties[key]
				if (child === undefined) {
					continue
				}
				entries.push({
					key,
					parse: compileParserInner(child, lazyCache),
					// `optional` = "skip on absence" — true for `optional` and
					// for a `default` whose inner is itself optional (its
					// parser would yield `undefined` for the default, which at
					// the object level means the key is legitimately absent).
					optional: guardPermitsAbsence(child),
					// D4: a `default` property APPLIES its default on absence —
					// an absent key is NOT a parse failure; route `undefined`
					// through the child parser (which yields the default).
					// This is the documented parse-applies-default-on-absence
					// contract (the canonical use of a default), distinct from
					// the guard (which does NOT auto-apply it).
					appliesDefault: child.type === 'default',
				})
			}
			const known = new Set(entries.map((entry) => entry.key))
			const additionalParser = isShapeAdditional(shape.additionalProperties)
				? compileParserInner(shape.additionalProperties, lazyCache)
				: undefined
			const open = shape.additionalProperties === true || additionalParser !== undefined
			// Parse↔guard soundness: re-validate the FRESHLY BUILT result
			// against THIS shape's guard. The per-field parsers are sound
			// recursively, so a guard-valid input yields a guard-valid built
			// object (A)(B); the final check additionally guarantees (C) for
			// any path that could otherwise produce a guard-invalid object
			// (e.g. an `additionalProperties` constraint, or a required key
			// whose normalized form drifts). We deliberately DO NOT fall back
			// to the raw input here (unlike string/number/array): the raw
			// object may carry `__proto__`/`constructor`/`prototype` own keys
			// that the B2 prototype-pollution hardening drops — returning raw
			// would re-expose them. The built accumulator is the only safe
			// output, and it is guard-equivalent to a guard-valid input.
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				if (!isRecord(value)) {
					return undefined
				}
				const result: Record<string, unknown> = {}
				for (const entry of entries) {
					// entry.key is already dangerous-key-filtered above; read
					// via Object.hasOwn so an inherited value can never be
					// mistaken for a present own property.
					const raw = Object.hasOwn(value, entry.key) ? value[entry.key] : undefined
					if (raw === undefined) {
						if (entry.appliesDefault) {
							// D4: an absent `default` property APPLIES its
							// default (parse-applies-default-on-absence) — route
							// `undefined` through the child's `default` parser,
							// which returns a fresh deep copy of the default.
							// Checked BEFORE the optional skip so a
							// `default(optional(x))` still materializes its
							// default value rather than dropping the key.
							const applied = entry.parse(undefined)
							if (applied !== undefined) {
								result[entry.key] = applied
							}
							continue
						}
						if (entry.optional) {
							continue
						}
						return undefined
					}
					const parsed = entry.parse(raw)
					if (parsed === undefined) {
						return undefined
					}
					result[entry.key] = parsed
				}
				if (open) {
					for (const key of Object.keys(value)) {
						if (known.has(key)) {
							continue
						}
						// DROP prototype-pollution keys: never write
						// __proto__/constructor/prototype onto the plain
						// accumulator (would taint the prototype chain) and
						// do not let them fail the whole record either.
						if (isDangerousKey(key)) {
							continue
						}
						if (!Object.hasOwn(value, key)) {
							continue
						}
						if (additionalParser !== undefined) {
							const parsed = additionalParser(value[key])
							if (parsed === undefined) {
								return undefined
							}
							result[key] = parsed
						} else {
							result[key] = value[key]
						}
					}
				}
				// Final (C) gate: never emit an object the shape's own guard
				// would reject (no raw fallback — see arm header comment).
				return guard(result) ? result : undefined
			}
		}
		case 'union': {
			// One dense parser+guard pair per variant. `shape.variants` is a
			// readonly array and `.map` yields a same-length dense array, so
			// every entry is defined — the old `for (let index …)` loops'
			// `if (x === undefined) continue` branches were provably dead and
			// are removed here; iterating the pairs preserves variant order
			// exactly (anyOf first-match, oneOf exactly-one count).
			const variantPairs = shape.variants.map((variant) => ({
				parser: compileParserInner(variant, lazyCache),
				guard: compileGuardInner(variant, newLazyGuardCache()),
			}))
			if (shape.mode === 'oneOf') {
				// JSON-Schema `oneOf` exclusivity, kept parse↔guard
				// SYMMETRIC with the oneOf guard above. The guard's notion of
				// a "match" is: a variant's guard accepts the RAW value. The
				// parser must count matches the SAME way — counting
				// parsed-and-revalidated results instead would diverge,
				// because a variant parser may COERCE the input (e.g. the
				// string parser turns the number 5 into the guard-valid '5'),
				// inflating the match count past what the guard saw and
				// breaking symmetry clause (A): `g(5)` is true (only the
				// integer variant's guard matches) yet a coercion-based count
				// would see two matches and reject.
				//
				// So: count variants whose GUARD accepts the raw value
				// (mirrors the oneOf guard exactly). Tie policy (documented):
				// if zero or ≥2 variant guards accept, the exclusive-one
				// contract is unsatisfiable → `undefined` (never silently
				// picks a winner). On exactly one, parse with THAT variant
				// and re-validate the oneOf guard on the result for clause
				// (C) soundness.
				const guardThis = compileGuardInner(shape, newLazyGuardCache())
				return (value) => {
					let matched: { parser: (value: unknown) => unknown } | undefined
					let matches = 0
					for (const pair of variantPairs) {
						if (pair.guard(value)) {
							matches += 1
							if (matches > 1) {
								return undefined
							}
							matched = pair
						}
					}
					if (matches !== 1 || matched === undefined) {
						return undefined
					}
					const parsed = matched.parser(value)
					if (parsed === undefined) {
						return undefined
					}
					return guardThis(parsed) ? parsed : undefined
				}
			}
			return (value) => {
				for (const pair of variantPairs) {
					const parsed = pair.parser(value)
					if (parsed !== undefined && pair.guard(parsed)) {
						return parsed
					}
				}
				return undefined
			}
		}
		case 'intersection': {
			// Parse↔guard soundness for the conjunction. All members are
			// object shapes (§13 build constraint). Strategy: parse the value
			// through EVERY member's parser, then MERGE the parsed member
			// objects into one result; a key-collision is resolved
			// last-member-wins (sound: each parsed member object is
			// independently guard-valid for its member, and the documented
			// contract scopes intersection to object members with
			// disjoint/compatible keys, so the merge never invents a
			// guard-invalid value). The merged object is then re-validated
			// against THIS shape's guard for clause (C). Like the `object`
			// arm we DO NOT fall back to the raw value (it could carry
			// `__proto__`/`constructor`/`prototype` own keys the per-member
			// object parsers' B2 hardening drops — returning raw would
			// re-expose them); the merged accumulator is the only safe output
			// and is guard-equivalent to a guard-valid input (clause A/B hold
			// because each member parser is itself sound and accepts
			// everything its member guard accepts).
			//
			// Each closed member is parsed via a clone opened to sibling keys
			// (`additionalProperties: true`) so a sibling member's key is not
			// rejected as "unknown" — exactly mirroring the guard arm. Opening
			// to `true` makes that member parser PASS THROUGH unknown (sibling)
			// keys; we then keep only the keys the member declares from each
			// member's parsed output so a sibling's raw (unparsed) value never
			// leaks in — every key in the final result was parsed by the
			// member that declares it.
			// Operate on the EFFECTIVE leaf object members (nested
			// intersections flattened in) so a nested intersection's keys are
			// each parsed by their own declaring object member.
			const memberParsers = flattenIntersectionObjects(shape).map((member) => {
				if (member.additionalProperties === undefined || member.additionalProperties === false) {
					const opened: ObjectShape = {
						type: 'object',
						properties: member.properties,
						additionalProperties: true,
						...(member.description !== undefined ? { description: member.description } : {}),
					}
					return {
						parse: compileParserInner(opened, lazyCache),
						ownKeys: new Set(Object.keys(member.properties)),
						scoped: true,
					}
				}
				return {
					parse: compileParserInner(member, lazyCache),
					ownKeys: new Set(Object.keys(member.properties)),
					scoped: false,
				}
			})
			const guard = compileGuardInner(shape, newLazyGuardCache())
			return (value) => {
				if (!isRecord(value)) {
					return undefined
				}
				const result: Record<string, unknown> = {}
				for (const member of memberParsers) {
					const parsed = member.parse(value)
					if (parsed === undefined || !isRecord(parsed)) {
						return undefined
					}
					if (member.scoped) {
						// Keep only keys this member declares (its parsed,
						// normalized values); sibling keys it passed through
						// untouched are owned/parsed by their own member.
						for (const key of member.ownKeys) {
							if (Object.hasOwn(parsed, key)) {
								result[key] = parsed[key]
							}
						}
					} else {
						// Open/constrained member: it owns its full parsed
						// output (declared keys + its additionalProperties
						// policy applied to the rest).
						for (const key of Object.keys(parsed)) {
							if (Object.hasOwn(parsed, key)) {
								result[key] = parsed[key]
							}
						}
					}
				}
				return guard(result) ? result : undefined
			}
		}
		case 'const': {
			// Parse↔guard soundness: the parser returns the CANONICAL value
			// iff the input matches the const's structural-equality guard,
			// else `undefined`. A non-primitive canonical value is handed out
			// as a FRESH DEEP COPY (C3 alias-free policy) so a caller mutating
			// the result cannot corrupt the shape's stored value or a later
			// parse. Clauses (A)(B)(C): (A) input the guard accepts ⇒ it
			// equals `value` ⇒ the returned canonical copy is itself
			// guard-valid (deep-equal to `value`); (B)/(C) every defined
			// output IS a copy of `value`, which the guard accepts by
			// definition; a non-matching input ⇒ `undefined`.
			const constValue = shape.value
			return (value) => (deepEqual(constValue, value) ? cloneJsonValue(constValue) : undefined)
		}
		case 'optional': {
			const parser = compileParserInner(shape.inner, lazyCache)
			return (value) => (value === undefined ? undefined : parser(value))
		}
		case 'nullable': {
			const parser = compileParserInner(shape.inner, lazyCache)
			return (value) => (value === null ? null : parser(value))
		}
		case 'default': {
			// DELIBERATE, useful asymmetry (documented; mirrors the
			// `optional` arm's `undefined` handling): on ABSENCE
			// (`value === undefined`) the parser APPLIES the default — a
			// fresh deep copy of `shape.value` for a non-primitive default
			// (C3 alias-free policy, identical to the `const` arm) so no
			// shared mutable reference leaks. Any OTHER input parses through
			// `inner`. Parse↔guard A/B/C: `shape.value` was §13
			// build-validated by `defaultShape` to satisfy `inner`'s guard
			// (== this shape's guard), so the `undefined → default` path
			// emits a guard-valid value (C); the non-`undefined` path is
			// `inner`'s own sound parser, so A/B/C are inherited. Note:
			// `guard(undefined)` is `inner.guard(undefined)` (false unless
			// `inner` is optional) yet `parser(undefined)` = default — the
			// intended "apply default on absence" contract, distinct from
			// B3's general rule and called out here exactly.
			const parser = compileParserInner(shape.inner, lazyCache)
			const defaultValue = shape.value
			return (value) => (value === undefined ? cloneJsonValue(defaultValue) : parser(value))
		}
		case 'lazy': {
			// D3 recursion — same memoization strategy as the guard arm: a
			// per-compilation `Map` keyed by the lazy THUNK, threaded through
			// every recursive `compileParserInner`. The deferred parser is
			// installed in the cache BEFORE compiling the inner, so the
			// self-referential descent gets a cache hit and reuses ONE
			// compiled parser instead of recompiling forever. The inner is
			// compiled once on FIRST INVOCATION (`resolved`); over genuinely
			// recursive DATA the recursion terminates because the data is
			// finite. Parse↔guard soundness is inherited: this arm delegates
			// verbatim to the resolved inner shape's parser (the lazy node
			// adds no normalization of its own), so clauses (A)(B)(C) hold
			// for the lazy shape exactly as they hold for its inner.
			const cached = lazyCache.map.get(shape.thunk)
			if (cached !== undefined) {
				return cached
			}
			let resolved: ((value: unknown) => unknown) | undefined
			const cycle = lazyCache.cycle
			const parser = (value: unknown): unknown => {
				if (resolved === undefined) {
					resolved = compileParserInner(shape.thunk(), lazyCache)
				}
				// FU1: §13 NEVER-throw, parser analogue of the guard arm. A
				// DATA back-edge (an ancestor-path member) or a
				// pathologically-deep ACYCLIC value yields `undefined`
				// (parse failure) instead of a `RangeError`. Add-on-enter /
				// delete-on-exit keeps `ancestors` the active path so a
				// shared finite subtree (DAG) still parses; the depth cap is
				// the acyclic-but-deep stack backstop. Parse<->guard
				// soundness holds: `undefined` is the canonical
				// parse-failure value the guard also rejects (cycle/deep
				// data fails the FU1 guard too), so (A)(B)(C) are preserved.
				if (!isObject(value)) {
					return resolved(value)
				}
				if (cycle.ancestors.has(value) || cycle.depth >= MAX_RECURSION_DEPTH) {
					return undefined
				}
				cycle.ancestors.add(value)
				cycle.depth += 1
				try {
					return resolved(value)
				} finally {
					cycle.depth -= 1
					cycle.ancestors.delete(value)
				}
			}
			lazyCache.map.set(shape.thunk, parser)
			return parser
		}
		case 'raw':
			return (value) => value
	}
}

// === Generators

// D3 generator termination contract: a recursive lazy shape's generator can
// recurse FOREVER (an infinite tree). The generator bounds lazy-node recursion
// at `MAX_LAZY_DEPTH` (centralized in `constants.ts`). Below the bound a lazy
// node resolves and generates its inner normally (so the output VARIES and is
// deep enough to exercise the recursion — `assertGeneratorSatisfiesGuard`'s
// variability clause is satisfied). At/past the bound the lazy node collapses
// to the resolved shape's MINIMAL INHABITANT (see `minimalInhabitant`): the
// smallest guard-valid value of that shape with every recursive child
// collapsed to its own minimal form (array → `[]`, optional → absent,
// nullable → `null`, object → required keys only, each minimal). That value
// still satisfies the guard, so `generator∘guard` holds, and it is a constant
// for a given shape so determinism is preserved.

// FU4 generator `oneOf` retry bound: a JSON-Schema `oneOf` is valid iff a
// value matches EXACTLY ONE variant. When the variants OVERLAP
// (`oneOf(number, integer)` — every integer matches both), a value generated
// from a randomly-picked variant may satisfy ≥2 variants and the `oneOf` guard
// (correctly) rejects it. The generator therefore generates a candidate, tests
// it against the compiled `oneOf` guard, and — driven by the SAME seeded PRNG
// so the retry stays reproducible per seed — retries up to `MAX_ONEOF_ATTEMPTS`
// (centralized in `constants.ts`). The bound is small enough that an
// unsatisfiable `oneOf` (variants whose value sets are identical) fails fast
// into a precise generation-time §13 `Error` rather than spinning.

// The smallest guard-valid value for `shape`, with every recursive (lazy)
// child collapsed to ITS minimal form. Used by the generator's `lazy` arm
// once `MAX_LAZY_DEPTH` is hit so generation always terminates with a
// still-guard-valid value.
//
// `seenThunks` is the ANCESTOR PATH of lazy thunks currently being resolved
// (added on entry, deleted on exit — a true back-edge detector). If resolving
// a lazy node requires re-entering a thunk already on that path AND no
// terminating container (an array that can be empty, an optional, a nullable)
// broke the chain first, the shape has NO finite inhabitant (e.g.
// `objectShape({ self: lazyShape(() => sameShape) })` — a REQUIRED,
// non-optional, infinitely-deep recursive child). The minimal value cannot be
// constructed, so a precise §13 Error is thrown rather than silently
// recursing forever or emitting a guard-violating value — `generator∘guard`
// is never silently broken. Schema/guard/parser do NOT need a finite
// inhabitant, so only the generator enforces this.
function minimalInhabitant(
	shape: ContractShape,
	random: RandomFunction,
	seenThunks: Set<() => ContractShape>,
): unknown {
	switch (shape.type) {
		case 'string': {
			// Smallest string of the required length (the guard measures the
			// whole string, so a `min` must be met exactly; default is `''`).
			const min = shape.min ?? 0
			if (shape.pattern !== undefined) {
				// A pattern has no generic smallest match — defer to the
				// regular generator (bounded: a string is a leaf, no
				// recursion). Length still honoured by that generator.
				return compileGeneratorInner(shape, random, 0)
			}
			return '0'.repeat(min)
		}
		case 'number':
			return shape.min ?? 0
		case 'boolean':
			return false
		case 'literal':
			// `literalShape` guarantees ≥1 value at build (§13); the first is
			// the deterministic minimal choice.
			return shape.values[0]
		case 'array': {
			// The minimal array is the shortest the guard accepts. If a
			// `min ≥ 1` is required, generate exactly `min` minimal elements
			// (recursing — a lazy element continues the chain). With no `min`
			// the empty array is minimal and the element shape is NEVER
			// instantiated, which is exactly what TERMINATES the recursion for
			// the common `arrayShape(lazyShape(...))` recursive pattern.
			const min = shape.min ?? 0
			const result: unknown[] = []
			for (let index = 0; index < min; index += 1) {
				result.push(minimalInhabitant(shape.items, random, seenThunks))
			}
			return result
		}
		case 'tuple': {
			// Exactly one minimal element per position (arity is fixed).
			const result: unknown[] = []
			for (const item of shape.items) {
				result.push(minimalInhabitant(item, random, seenThunks))
			}
			return result
		}
		case 'object': {
			// Only REQUIRED keys — an absence-permitting key absent is the
			// minimal object. D4: a `default(optional(x))` permits absence
			// (so it is omitted from the minimal object), while a required
			// `default(integer())` is included with its inner's minimal (the
			// `default` arm of `minimalInhabitant` recurses to `inner`). Each
			// required key gets its child's minimal.
			const result: Record<string, unknown> = {}
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child === undefined || guardPermitsAbsence(child)) {
					continue
				}
				result[key] = minimalInhabitant(child, random, seenThunks)
			}
			return result
		}
		case 'union': {
			// Any variant works; the first is the deterministic minimal
			// choice. `unionShape`/`oneOfShape` guarantee ≥1 variant (§13),
			// so `variants[0]` is defined; the explicit narrow keeps this
			// arm total without an `!` non-null assertion.
			const first = shape.variants[0]
			if (first === undefined) {
				return undefined
			}
			return minimalInhabitant(first, random, seenThunks)
		}
		case 'intersection': {
			// Merge every member's minimal object (all members are object
			// shapes per §13) so the result satisfies every member.
			const result: Record<string, unknown> = {}
			for (const member of shape.members) {
				const generated = minimalInhabitant(member, random, seenThunks)
				if (isRecord(generated)) {
					for (const key of Object.keys(generated)) {
						result[key] = generated[key]
					}
				}
			}
			return result
		}
		case 'const':
			// A const has EXACTLY one inhabitant — its value (a fresh copy so
			// the minimal value is never a shared alias into the shape).
			return cloneJsonValue(shape.value)
		case 'optional':
			// The minimal optional value is ABSENT; as a bare value that is
			// `undefined` (the guard accepts it, and at object level the key
			// is dropped — both guard-valid).
			return undefined
		case 'nullable':
			// `null` is the minimal nullable inhabitant (guard accepts it
			// without instantiating the inner — terminates the recursion).
			return null
		case 'default':
			// The default does not change the guard (guard == inner's), so
			// the minimal inhabitant is the inner's minimal inhabitant — NOT
			// the default value (the default is just one valid instance; the
			// inner may have a strictly smaller one). Recursing `inner` also
			// keeps the lazy-recursion termination chain intact (a `default`
			// wrapping a recursive lazy continues the descent like
			// optional/nullable).
			return minimalInhabitant(shape.inner, random, seenThunks)
		case 'lazy': {
			if (seenThunks.has(shape.thunk)) {
				throw new Error(
					`recursive shape has no finite inhabitant within depth ${MAX_LAZY_DEPTH}: a required, non-optional lazy child references itself with no terminating container (array/optional/nullable). Wrap the recursive child in optionalShape/nullableShape or make the recursive container an array.`,
				)
			}
			seenThunks.add(shape.thunk)
			const resolved = minimalInhabitant(shape.thunk(), random, seenThunks)
			seenThunks.delete(shape.thunk)
			return resolved
		}
		case 'raw':
			// `rawShape`'s guard is always true; `null` is the smallest valid
			// JSON value (mirrors the generator's own `raw` arm).
			return null
	}
}

/**
 * Compile a {@link ContractShape} and immediately generate a seed value from
 * it using the provided random source.
 *
 * @remarks
 * Walks the shape tree producing a value of the inferred type. The same
 * shape and the same `random` seed always yield the same value, making
 * generated data reproducible across test runs. The output always satisfies
 * `compileGuard(shape)`.
 *
 * For `oneOf` union shapes (JSON-Schema exactly-one), a candidate is
 * generated from a PRNG-picked variant and tested against the compiled
 * `oneOf` guard; if it matches more than one variant (the variants overlap —
 * e.g. `oneOf(numberShape(), integerShape())`, where every integer matches
 * both) the generator retries, driven by the same seeded `random`, up to a
 * bounded number of attempts. Disjoint variants succeed on the first attempt,
 * so the common case is unaffected and stays exactly-one valid. If no
 * exactly-one-matching value exists within the bound (the variants overlap so
 * heavily that every value matches ≥2 of them — an ill-posed `oneOf`), a
 * precise generation-time {@link Error} is thrown naming the overlapping
 * variants and suggesting disjoint branches or `anyOf`/`unionShape`. The
 * throw is deterministic for a given seed.
 *
 * @param shape - The shape to generate a value from
 * @param random - Seeded deterministic random source (see {@link createRandom})
 * @returns A value that matches the shape
 * @throws {Error} When `shape` is a `oneOf` whose variants overlap so
 *         heavily that no exactly-one-matching value can be generated within
 *         the retry bound.
 *
 * @example
 * ```ts
 * import { createRandom } from '@elements/core'
 * const random = createRandom(42)
 * const user = compileGenerator(
 *     objectShape({ name: stringShape({ min: 1, max: 20 }), age: integerShape({ min: 0, max: 120 }) }),
 *     random,
 * )
 * // user: { name: 'str_xxx', age: 42 } — deterministic for seed 42
 * ```
 */
export function compileGenerator(shape: ContractShape, random: RandomFunction): unknown {
	assertAcyclicShape(shape, new WeakSet<ContractShape>())
	// D3: `lazyDepth` starts at 0 and is incremented ONLY by `lazy` nodes; at
	// `MAX_LAZY_DEPTH` the lazy arm collapses to the minimal inhabitant so a
	// recursive lazy shape's generation always terminates (see the
	// termination-contract comment above `MAX_LAZY_DEPTH`).
	return compileGeneratorInner(shape, random, 0)
}

function compileGeneratorInner(
	shape: ContractShape,
	random: RandomFunction,
	lazyDepth: number,
): unknown {
	switch (shape.type) {
		case 'string': {
			// The generated value's TOTAL length (including the `str_`
			// prefix) must satisfy the guard's [min, max] window — the prefix
			// is part of the string the guard measures, so it must be counted
			// here or a `max` (or a `min < 4`) constraint is silently
			// violated under `assertGeneratorSatisfiesGuard`.
			const prefix = 'str_'
			const min = shape.min ?? 0
			const max = shape.max ?? Math.max(min, 12)
			// Target total length: clamp a pleasant default (8) into the
			// [min, max] window. `validateBounds` already guarantees
			// `min <= max` and both finite/non-negative, so the window is
			// non-empty.
			const total = Math.max(min, Math.min(max, 8))
			const random6 = Math.floor(random() * 1_000_000).toString()
			let value: string
			if (total <= prefix.length) {
				// Window is shorter than the prefix — derive the whole string
				// from a deterministic digit fill so the length is exact.
				value = random6.padStart(total, '0').slice(0, total)
			} else {
				const suffix = random6.padStart(total - prefix.length, '0').slice(0, total - prefix.length)
				value = `${prefix}${suffix}`
			}
			return value
		}
		case 'number': {
			const min = shape.min ?? 0
			const max = shape.max ?? 100
			const value = random() * (max - min) + min
			return shape.integer === true ? Math.floor(value) : value
		}
		case 'boolean':
			return random() >= 0.5
		case 'literal': {
			// No empty-values guard here: `literalShape()` throws at build
			// for an empty list (§13), so a values-less literal is
			// unreachable through the public API. The dead defensive throw
			// that used to live here was removed per §20 (no dead code) — a
			// hand-built `{ type:'literal', values:[] }` that bypasses the
			// builder is itself programmer error, out of contract.
			const index = Math.floor(random() * shape.values.length)
			return shape.values[index]
		}
		case 'array': {
			const min = shape.min ?? 1
			const max = shape.max ?? Math.max(min, 3)
			const length = Math.floor(random() * (max - min + 1)) + min
			const result: unknown[] = []
			for (let index = 0; index < length; index += 1) {
				result.push(compileGeneratorInner(shape.items, random, lazyDepth))
			}
			return result
		}
		case 'tuple': {
			// One generated value per position, in order — exact arity by
			// construction, so the result always satisfies the tuple guard.
			// Determinism follows from each positional generator consuming the
			// shared `random` source in a fixed order. An empty tuple yields
			// `[]` (constant — trivially deterministic; the variability clause
			// of assertGeneratorSatisfiesGuard skips constant-output shapes).
			const result: unknown[] = []
			for (const item of shape.items) {
				result.push(compileGeneratorInner(item, random, lazyDepth))
			}
			return result
		}
		case 'object': {
			const result: Record<string, unknown> = {}
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child === undefined) {
					continue
				}
				// D4: an absence-permitting property (`optional`, or a
				// `default` whose inner is optional) is randomly omitted, like
				// `optional` before. A required `default(x)` is ALWAYS
				// generated (the guard requires it) from its inner (the
				// `default` arm of the generator delegates to `inner` for
				// variability). `guardPermitsAbsence` is the no-op-for-pre-D4
				// absence predicate.
				if (guardPermitsAbsence(child) && random() < 0.3) {
					continue
				}
				result[key] = compileGeneratorInner(child, random, lazyDepth)
			}
			return result
		}
		case 'union': {
			// No empty-variants guard here: `unionShape()` / `oneOfShape()`
			// throw at build for an empty variant list (§13), so this is
			// unreachable through the public API. The dead defensive throw
			// was removed per §20 — a hand-built variants-less union that
			// bypasses the builder is itself programmer error.
			if (shape.mode !== 'oneOf') {
				// `anyOf`: a value matching ≥1 variant is valid, so a value
				// generated from any single PRNG-picked variant always
				// satisfies the union guard — one draw suffices.
				const index = Math.floor(random() * shape.variants.length)
				const variant = shape.variants[index]
				if (variant === undefined) {
					return undefined
				}
				return compileGeneratorInner(variant, random, lazyDepth)
			}
			// FU4 — `oneOf` is exactly-one. A value generated from a single
			// PRNG-picked variant can ALSO satisfy a sibling variant when the
			// variants OVERLAP (`oneOf(number, integer)` — every integer
			// matches both), which the `oneOf` guard (correctly) rejects.
			// Strategy A: generate a candidate, test it against the compiled
			// `oneOf` guard, and — driven by the SAME threaded `random` so
			// generation stays reproducible per seed — retry up to
			// `MAX_ONEOF_ATTEMPTS`. The first exactly-one-matching candidate
			// is returned (disjoint variants succeed on attempt 1, so the
			// already-sound disjoint case is unperturbed). If the bound is
			// exhausted the `oneOf` has no (reachable) exactly-one region — an
			// ill-posed shape (e.g. two variants with identical value sets) —
			// so a precise generation-time §13 Error is thrown rather than
			// silently emitting a guard-invalid value. This is a build/
			// generation-boundary throw, NOT a guard, so §13 permits it (cf.
			// `minimalInhabitant`'s "no finite inhabitant" throw).
			const oneOfGuard = compileGuard(shape)
			for (let attempt = 0; attempt < MAX_ONEOF_ATTEMPTS; attempt += 1) {
				const index = Math.floor(random() * shape.variants.length)
				const variant = shape.variants[index]
				if (variant === undefined) {
					return undefined
				}
				const candidate = compileGeneratorInner(variant, random, lazyDepth)
				if (oneOfGuard(candidate)) {
					return candidate
				}
			}
			throw new Error(
				`oneOf has no exactly-one-matching value within ${MAX_ONEOF_ATTEMPTS} generation attempts: its variants (${shape.variants
					.map((variant) => variant.type)
					.join(
						', ',
					)}) overlap so heavily that every generated value satisfies two or more of them, which the JSON-Schema oneOf contract (exactly one) rejects. Make the variants disjoint (mutually exclusive) or use anyOf/unionShape if a value is allowed to match more than one.`,
			)
		}
		case 'intersection': {
			// All members are object shapes (§13 build constraint). Generate
			// each member object in order and MERGE them: the result carries
			// the UNION of every member's generated keys, so it satisfies
			// EVERY member's guard (each member's required keys are all present
			// with member-valid values) — hence the intersection guard. On a
			// key shared by ≥2 members the last member's value wins; the
			// documented contract scopes intersection to object members with
			// disjoint/compatible keys, so this never produces a member-invalid
			// value. Determinism follows from each member generator consuming
			// the shared `random` source in a fixed order. `intersectionShape`
			// guarantees ≥1 member at build (§13), so the merge is never empty.
			const result: Record<string, unknown> = {}
			for (const member of shape.members) {
				const generated = compileGeneratorInner(member, random, lazyDepth)
				if (isRecord(generated)) {
					for (const key of Object.keys(generated)) {
						result[key] = generated[key]
					}
				}
			}
			return result
		}
		case 'const':
			// A const has EXACTLY one inhabitant — the value. Emit a FRESH
			// DEEP COPY (C3 alias-free policy — two generations must never
			// share a mutable reference). Constant output is trivially
			// deterministic for any seed, so the `random` source is
			// intentionally not consumed; `assertGeneratorSatisfiesGuard`
			// skips its variability clause for constant-output shapes.
			return cloneJsonValue(shape.value)
		case 'optional':
			return compileGeneratorInner(shape.inner, random, lazyDepth)
		case 'nullable':
			return random() < 0.2 ? null : compileGeneratorInner(shape.inner, random, lazyDepth)
		case 'default':
			// Generate from INNER, not the fixed default: the default is just
			// ONE valid instance, so generating from inner preserves
			// variability (the generator∘guard variability clause). Sound
			// because inner's generator is sound and the default never
			// constrains the guard (guard == inner's). The `random` source is
			// threaded into inner so output varies and stays deterministic
			// per seed.
			return compileGeneratorInner(shape.inner, random, lazyDepth)
		case 'lazy': {
			// D3 generator termination (the subtle case). A recursive lazy
			// shape's generator could recurse forever; `lazyDepth` bounds it.
			// BELOW the bound: resolve the thunk and generate its inner with
			// `lazyDepth + 1` — output is varied and deep enough to exercise
			// the recursion (satisfies `assertGeneratorSatisfiesGuard`'s
			// variability clause). AT/PAST the bound: collapse to the resolved
			// shape's MINIMAL INHABITANT — still guard-valid (so
			// `generator∘guard` holds), finite, and constant (so determinism
			// holds). If that minimal value cannot exist (a required,
			// non-optional, infinitely-deep recursive child),
			// `minimalInhabitant` throws the precise §13 "no finite
			// inhabitant" Error rather than recurse forever or silently emit a
			// guard-violating value. The thunk is invoked here (NOT at
			// acyclicity-check time) — generation is the point at which the
			// deferred recursion is realised over a bounded depth.
			if (lazyDepth >= MAX_LAZY_DEPTH) {
				return minimalInhabitant(shape.thunk(), random, new Set<() => ContractShape>())
			}
			return compileGeneratorInner(shape.thunk(), random, lazyDepth + 1)
		}
		case 'raw':
			// Must emit a DEFINED, JSON-valid value: a required `rawShape`
			// object property generating `undefined` collapses the key out
			// of the object structurally (`{ r: undefined }` ≡ `{}`),
			// breaking the object guard's `required` contract AND the raw
			// guard's own always-true contract under
			// `assertGeneratorSatisfiesGuard`. `null` is chosen as the
			// placeholder: it is the smallest valid JSON value, the raw
			// guard accepts it (always true), it keeps the property present
			// so `required` holds, JSON-Schema consumers accept it, and it
			// is constant — `rawShape` carries no constraints to vary over,
			// so a constant is trivially deterministic for any seed (the
			// `random` source is intentionally not consumed here).
			return null
	}
}

/**
 * Compile a {@link ContractShape} into a closure-backed contract object.
 *
 * @remarks
 * Precompiles schema, guard, and parser once, then exposes them through a plain
 * object with a deterministic `generate()` method. This is the single public
 * entry point for creating a full contract — schema, guard, parser, and generator
 * all derived from one shape.
 *
 * @param shape - The shape to compile
 * @returns A {@link ContractInterface} with schema, guard, parser, and generator
 *
 * @example
 * ```ts
 * const userContract = compileContract(
 *     objectShape({
 *         name: stringShape({ min: 1 }),
 *         age:  integerShape({ min: 0, max: 120 }),
 *         role: literalShape('admin', 'member', 'guest'),
 *         bio:  optionalShape(stringShape()),
 *     }),
 * )
 *
 * userContract.schema                  // JSON Schema for tools/agents
 * userContract.is(input)               // type guard
 * const user = userContract.parse(raw) // typed user or undefined
 * const seed = userContract.generate(createRandom(42))
 * ```
 */
export function compileContract(shape: ContractShape): ContractInterface<unknown>
export function compileContract(shape: ContractShape): ContractInterface<unknown> {
	const schema: JsonSchema = compileSchema(shape)
	const predicate = compileGuard(shape)
	const parser = compileParser(shape)

	return {
		schema,
		is(value: unknown): value is unknown {
			return predicate(value)
		},
		parse(value: unknown): unknown {
			return parser(value)
		},
		generate(random: RandomFunction): unknown {
			return compileGenerator(shape, random)
		},
	}
}
