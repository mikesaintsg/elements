import type {
	ContractInterface,
	ContractShape,
	Infer,
	IntersectionShape,
	JsonSchema,
	JsonSchemaMap,
	JsonSchemaObject,
	ObjectShape,
	RandomFunction,
} from './types.js'
import { isShapeAdditional } from './helpers.js'
import { parseBoolean, parseInteger, parseNumber } from './parsers.js'
import { isRecord } from './validators.js'

// === Cyclic-shape guard (§13 — programmer error, fail fast)
//
// Every `compile*` walks the shape tree recursively. A self-referential
// `ContractShape` (e.g. `objectShape(props)` then `props.self = shape` — see
// tests/src/core/_helpers.ts `makeCyclicShape`) made that descent recurse
// until V8 threw a bare `RangeError: Maximum call stack size exceeded`.
//
// Contract: a cyclic shape built WITHOUT a lazy/deferred wrapper is a
// PROGRAMMER ERROR (AGENTS.md §13 row 1 — "invalid arguments → throw Error"),
// NOT an external/optional condition. (`lazyShape` — the future deferred
// wrapper that will make recursion legitimate — does not exist until Phase D,
// so for now any structural cycle is malformed input.) Each public compiler
// therefore validates the tree is acyclic ONCE, up front, and FAILS FAST with
// a precise `Error` that names the defect and points at the fix — never a
// `RangeError`, and never a silently-broken compiled function.
//
// `seen` tracks the ANCESTOR path (added on entry, removed on exit), so it is
// a true back-edge detector: a shared-but-acyclic sub-shape (the same child
// shape object referenced under two sibling keys — a DAG, perfectly valid) is
// fully walked and removed before its second occurrence is visited, so it is
// never misreported as a cycle.
const CYCLIC_SHAPE_MESSAGE = 'cyclic ContractShape: use a lazy/deferred shape for recursion'

function assertAcyclicShape(shape: ContractShape, seen: WeakSet<ContractShape>): void {
	if (seen.has(shape)) {
		throw new Error(CYCLIC_SHAPE_MESSAGE)
	}
	switch (shape.type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'literal':
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
		case 'nullable': {
			seen.add(shape)
			assertAcyclicShape(shape.inner, seen)
			seen.delete(shape)
			return
		}
	}
}

// === Intersection member flattening
//
// `intersectionShape` (§13) guarantees every member is an OBJECT shape or a
// nested `intersection`. The guard and parser arms need the EFFECTIVE leaf
// object members (a nested intersection contributes its own object members,
// transitively) so the merged-key universe and closed/open policy are
// computed over every real object member, not just the direct ones. The
// shape is already proven acyclic by `assertAcyclicShape` before any
// compile, so this recursion terminates.
function flattenIntersectionObjects(shape: IntersectionShape): readonly ObjectShape[] {
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

// === D3 lazy memoization caches
//
// A recursive lazy shape's self-reference must reuse ONE compiled function
// per compilation rather than recompiling forever. Each public compiler
// threads a fresh cache keyed by the lazy THUNK; the `'lazy'` arm installs a
// deferred closure into the cache BEFORE compiling the inner, so the
// self-referential descent gets a cache hit and the recursion terminates.
// Named aliases + typed factories keep call sites `any`-free (a bare
// `new Map()` would infer `Map<any, any>`).

/** Per-compilation lazy-thunk → compiled-guard cache. */
type LazyGuardCache = Map<() => ContractShape, (value: unknown) => boolean>
/** Per-compilation lazy-thunk → compiled-parser cache. */
type LazyParserCache = Map<() => ContractShape, (value: unknown) => unknown>

/** Fresh, typed lazy-guard cache (avoids an untyped `new Map()`). */
function newLazyGuardCache(): LazyGuardCache {
	return new Map<() => ContractShape, (value: unknown) => boolean>()
}

/** Fresh, typed lazy-parser cache (avoids an untyped `new Map()`). */
function newLazyParserCache(): LazyParserCache {
	return new Map<() => ContractShape, (value: unknown) => unknown>()
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
				if (child.type !== 'optional') {
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
			// Standard JSON-Schema conjunction: a value must validate against
			// EVERY member sub-schema. `allOf` is the schema mirror of
			// validators' `intersectionOf` (value valid iff every member guard
			// passes) and of this arm's guard below.
			return {
				allOf: shape.members.map((member) => compileSchemaInner(member, lazyContext)),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'optional':
			return compileSchemaInner(shape.inner, lazyContext)
		case 'nullable':
			return { anyOf: [compileSchemaInner(shape.inner, lazyContext), { type: 'null' }] }
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
			const context: LazySchemaContext =
				lazyContext ?? { defs: {}, names: new Map(), counter: { value: 0 } }
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
			const { min, max, pattern } = shape
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
					optional: child.type === 'optional',
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
		case 'optional': {
			const guard = compileGuardInner(shape.inner, lazyCache)
			return (value) => value === undefined || guard(value)
		}
		case 'nullable': {
			const guard = compileGuardInner(shape.inner, lazyCache)
			return (value) => value === null || guard(value)
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
			// sub-value).
			const cached = lazyCache.get(shape.thunk)
			if (cached !== undefined) {
				return cached
			}
			let resolved: ((value: unknown) => boolean) | undefined
			const guard = (value: unknown): boolean => {
				if (resolved === undefined) {
					resolved = compileGuardInner(shape.thunk(), lazyCache)
				}
				return resolved(value)
			}
			lazyCache.set(shape.thunk, guard)
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
					optional: child.type === 'optional',
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
		case 'optional': {
			const parser = compileParserInner(shape.inner, lazyCache)
			return (value) => (value === undefined ? undefined : parser(value))
		}
		case 'nullable': {
			const parser = compileParserInner(shape.inner, lazyCache)
			return (value) => (value === null ? null : parser(value))
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
			const cached = lazyCache.get(shape.thunk)
			if (cached !== undefined) {
				return cached
			}
			let resolved: ((value: unknown) => unknown) | undefined
			const parser = (value: unknown): unknown => {
				if (resolved === undefined) {
					resolved = compileParserInner(shape.thunk(), lazyCache)
				}
				return resolved(value)
			}
			lazyCache.set(shape.thunk, parser)
			return parser
		}
		case 'raw':
			return (value) => value
	}
}

// === Generators

// D3 generator termination contract (documented — analogous to B5's
// `MAX_JSON_DEPTH`):
//
// A recursive lazy shape's generator can recurse FOREVER (an infinite tree:
// every node spawns children that spawn children …). The generator therefore
// bounds lazy-node recursion at `MAX_LAZY_DEPTH`. Below the bound a lazy node
// resolves and generates its inner normally (so the output VARIES and is deep
// enough to exercise the recursion — `assertGeneratorSatisfiesGuard`'s
// variability clause is satisfied). At/past the bound the lazy node collapses
// to the resolved shape's MINIMAL INHABITANT (see `minimalInhabitant`): the
// smallest guard-valid value of that shape with every recursive child
// collapsed to its own minimal form (array → `[]`, optional → absent,
// nullable → `null`, object → required keys only, each minimal). That value
// still satisfies the guard, so `generator∘guard` holds, and it is a constant
// for a given shape so determinism is preserved.
//
// `MAX_LAZY_DEPTH` is small and deterministic: a depth of 3 produces a
// pleasantly-nested-but-finite recursive value (e.g. a 3-level tree), enough
// for the generated data to be a realistic, varied fixture while keeping the
// value (and generation time) bounded. It is the lazy-RECURSION depth, not
// total shape depth — only `lazy` nodes increment it, so non-recursive nested
// shapes are unaffected.
const MAX_LAZY_DEPTH = 3

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
			// Only REQUIRED (non-optional) keys — an optional key absent is
			// the minimal object. Each required key gets its child's minimal.
			const result: Record<string, unknown> = {}
			for (const key of Object.keys(shape.properties)) {
				const child = shape.properties[key]
				if (child === undefined || child.type === 'optional') {
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
		case 'optional':
			// The minimal optional value is ABSENT; as a bare value that is
			// `undefined` (the guard accepts it, and at object level the key
			// is dropped — both guard-valid).
			return undefined
		case 'nullable':
			// `null` is the minimal nullable inhabitant (guard accepts it
			// without instantiating the inner — terminates the recursion).
			return null
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
 * generated data reproducible across test runs. For `oneOf` union shapes,
 * generation picks a random variant and does not verify exclusivity — see
 * the inline note in the implementation for the known limitation with
 * overlapping variants.
 *
 * @param shape - The shape to generate a value from
 * @param random - Seeded deterministic random source (see {@link createRandom})
 * @returns A value that matches the shape
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
				if (child.type === 'optional' && random() < 0.3) {
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
			//
			// §15 limitation — overlapping oneOf variants: generation picks a
			// random variant and generates from it without checking exclusivity.
			// For `mode:'oneOf'`, a value generated from variant A may also
			// satisfy variant B (e.g. `number` ∩ `integer`), causing the
			// oneOf guard to see ≥2 matches and reject. This is acceptable:
			// JSON-Schema `oneOf` requires mutually-exclusive (disjoint)
			// subschemas by contract — overlapping variants are an ill-posed
			// user modelling error. Generation is sound for disjoint variants
			// (the supported/expected case).
			const index = Math.floor(random() * shape.variants.length)
			const variant = shape.variants[index]
			if (variant === undefined) {
				return undefined
			}
			return compileGeneratorInner(variant, random, lazyDepth)
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
		case 'optional':
			return compileGeneratorInner(shape.inner, random, lazyDepth)
		case 'nullable':
			return random() < 0.2 ? null : compileGeneratorInner(shape.inner, random, lazyDepth)
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
export function compileContract<S extends ContractShape>(shape: S): ContractInterface<Infer<S>>
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
