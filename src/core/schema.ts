import type {
	ContractShape,
	Guard,
	JsonSchema,
	JsonSchemaDefinition,
	JsonSchemaType,
	JsonValue,
	LazyRef,
	RefResolver,
} from './types.js'
import {
	arrayShape,
	booleanShape,
	constShape,
	integerShape,
	intersectionShape,
	lazyShape,
	literalShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	rawShape,
	stringShape,
	tupleShape,
	unionShape,
} from './shapers.js'
import { isJsonSchema, isRecord } from './validators.js'

// ============================================================================
//  @elements/core — INVERSE subsystem ("from JSON Schema").
//
//  `@elements/core` already goes shape → JSON-Schema (`compileSchema`,
//  emitting `$ref`/`$defs` for `lazyShape` recursion — see the D3 `'lazy'`
//  arm in compilers.ts). This module is the INVERSE foundation: resolving a
//  JSON-Schema document's internal `$ref`/`$defs` so E2 (schema→`Guard`),
//  E3 (schema→`ContractShape`), E4 (schema→parser) can walk a schema —
//  including a RECURSIVE one — cycle-safely.
//
//  This is the home of the whole inverse subsystem; E2–E4 add their
//  compilers here against the resolver below. E5 wires the guide.
//
//  ── Design notes (decisions, with the WHY) ────────────────────────────
//
//  1. ERROR MODEL — an unresolvable internal `$ref` is a §13 PROGRAMMER
//     ERROR → a precise `throw`, NOT a `Result`/`undefined`.
//
//     AGENTS.md §13 row 1: "Programmer error / invalid arguments → throw
//     Error". A schema document is a BUILD-TIME artifact the programmer
//     authors/controls (the same status as a `ContractShape` fed to
//     `compileGuard`), not untrusted runtime input. E2–E4 are COMPILERS:
//     they mirror `compileSchema`/`compileGuard`, which already fail fast
//     with a precise §13 `Error` on a malformed shape (`assertAcyclicShape`
//     throws `CYCLIC_SHAPE_MESSAGE`). A `$ref` that points at nothing is a
//     malformed schema exactly as a structural shape cycle is a malformed
//     shape — detected once, thrown precisely, naming the defect and the
//     offending pointer so the author can fix it. Returning `undefined`
//     here would force every E2–E4 call site to thread a failure channel
//     for a defect that can only be a programming mistake, diverging from
//     the rest of the subsystem's compile-time error model. (If a future
//     phase must resolve UNTRUSTED external schema documents, that is a
//     distinct seam — see note 2 — and would carry its own `Result` API;
//     it does not change the internal-`$ref` policy here.)
//
//  2. EXTERNAL / NON-LOCAL `$ref` — UNSUPPORTED in E1 → precise throw.
//
//     Any pointer that is not the local document fragment form
//     (`#`, `#/...`, or the bare RFC-6901 `/...`/`` empty form) — i.e. a
//     URI with a scheme (`https://x/y#/z`), or a relative document
//     reference (`other.json#/A`) — names a DIFFERENT document this
//     resolver was not given. Silently treating it as opaque/unknown would
//     let a downstream compiler build a guard that is WRONG (it would
//     accept anything for a position the author meant to constrain). Fail
//     fast with `external $ref unsupported: <ref>` (the ref named in the
//     message). The seam for future external resolution: a resolver
//     constructed with a document-loader callback would intercept exactly
//     this branch (`isExternalRef`) and load+resolve the other document;
//     until then it is a hard, precise error.
//
//  3. CYCLE / RECURSIVE `$ref` — broken via a lazy indirection
//     (`RefResolver.lazy` → `LazyRef`), the JSON-Schema mirror of D3's
//     `lazyShape` thunk memoization.
//
//     A recursive schema (`#/$defs/Node` whose `properties.next.$ref` is
//     `#/$defs/Node`) makes a naive eager resolver recurse forever. The
//     resolver tracks the ANCESTOR set of canonical pointers currently on
//     the active resolution path (added on entry, removed on exit — a true
//     back-edge detector, exactly like B5's ancestor-WeakSet in
//     `isJsonValueInner` and `assertAcyclicShape`'s `seen`). `lazy(ptr)`:
//
//       * resolves `ptr` to its CANONICAL pointer (following any `$ref`
//         chain by pointer, NOT by recursing into bodies),
//       * returns a `LazyRef` whose `thunk()` is a memoized, deferred
//         resolution of the canonical target,
//       * sets `cyclic = true` iff the canonical pointer is already on the
//         active path (a genuine recursive back-edge).
//
//     A consumer (E2) builds a recursive guard the D3 way: keep a
//     `Map<pointer, compiledGuard>`; on FIRST visit to a pointer install a
//     deferred closure into the map BEFORE compiling the body, recurse into
//     the body, and when the recursive child's `lazy()` returns
//     `cyclic: true` the consumer reuses the in-progress deferred closure
//     for that `pointer` instead of recursing — the self-reference resolves
//     to ONE compiled guard and the recursion is realised only over the
//     finite DATA at guard time. The `thunk()` itself is idempotent and
//     always terminates (it follows pointers, never re-enters a body).
//
//  4. DEPTH BACKSTOP — `MAX_REF_DEPTH`, the B5 `MAX_JSON_DEPTH` analogue.
//
//     Cycle detection terminates every TRUE cycle. The depth cap only
//     defends a pathologically long but ACYCLIC `$ref` chain
//     (`Rn → R(n-1) → … → R0`, no repeated pointer) that the ancestor set
//     cannot catch yet would still overflow the native stack. Exceeding it
//     converts that into a precise §13 `Error` (naming the chain) instead
//     of a bare `RangeError`. `src/core` has no `constants.ts` (AGENTS.md
//     §5: a module-local UPPER_SNAKE `const` is acceptable when no
//     constants module exists), so it lives here next to its sole consumer,
//     documented like `MAX_JSON_DEPTH`.
//
//  5. `$defs` AND legacy `definitions` — BOTH resolve.
//
//     Resolution is purely RFC-6901 token-walking: `#/$defs/X` and
//     `#/definitions/X` resolve by descending the literal `$defs` /
//     `definitions` key. JSON-Schema 2020-12 standardised `$defs`, but a
//     large body of real-world schemas (and every draft-07 document) use
//     `definitions`. Supporting both is FREE (the walker reads whatever key
//     the pointer names) and strictly more useful — there is no downside,
//     so both are first-class. Boolean schemas (`true`/`false`) and the
//     root `#`/empty self-pointer resolve correctly (a boolean root is a
//     terminal; `#` is the zero-token pointer that yields `root` itself).
//
//  ── JSON-Pointer escaping (RFC 6901 §3, §4) ─────────────────────────────
//
//  A reference token is unescaped by replacing `~1` with `/` and THEN `~0`
//  with `~`. ORDER IS LOAD-BEARING: `~01` must decode to `~1` (escape `~1`
//  is `~01`), NOT to `/`. Doing `~0`→`~` first would turn `~01` into `~1`
//  and then `~1`→`/` would corrupt it to `/`. We additionally percent-decode
//  the fragment when the pointer is given in URI-fragment form (`#/a%20b`),
//  scoped to the common single-document `#/...` shape (note 2 bounds the
//  rest). Per RFC 6901: `%`-decode the fragment FIRST (it is URI-layer),
//  split on `/`, THEN `~1`/`~0`-unescape each token (it is pointer-layer).
// ============================================================================

/**
 * Depth bound for a single `$ref`-chain resolution — the inverse
 * subsystem's analogue of validators' `MAX_JSON_DEPTH`.
 *
 * @remarks
 * True cycles are caught precisely by the ancestor-pointer set; this cap
 * only converts a pathologically long ACYCLIC chain into a precise §13
 * `Error` instead of a native stack overflow. 1,000 sits far below any
 * stack-overflow point while remaining orders of magnitude above any
 * legitimate schema's `$ref` indirection depth (real schemas chain a
 * handful of refs), so it never false-rejects genuine input.
 */
const MAX_REF_DEPTH = 1_000

/**
 * Determine whether a `$ref` string is an EXTERNAL / non-local reference
 * (a different document this resolver was not given).
 *
 * @remarks
 * Local (supported) forms: `#`, `#/...` (URI fragment), `` (empty), and
 * the bare RFC-6901 `/...` form — all of which resolve against the single
 * document `root`. Anything with a scheme (`https:`, `urn:`) or any
 * non-`#` prefix before a `#` (e.g. `other.json#/A`, `defs.json`) names a
 * separate document → external. See design note 2 for the future seam.
 */
function isExternalRef(ref: string): boolean {
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
 * Order is mandatory (see the escaping note in the module header): `~1`
 * MUST be replaced before `~0` so the escape sequence `~01` decodes to the
 * literal `~1` rather than being corrupted to `/`.
 */
function unescapeToken(token: string): string {
	return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

/**
 * Split a JSON Pointer into its already-unescaped reference tokens.
 *
 * @remarks
 * Accepts the URI-fragment form (`#/a/b`), the bare RFC-6901 form (`/a/b`),
 * and the empty/`#` whole-document form (zero tokens → the root). The
 * fragment is percent-decoded FIRST (URI layer) before `/`-splitting and
 * per-token `~`-unescaping (pointer layer), per RFC 6901 §6.
 */
function pointerTokens(pointer: string): readonly string[] {
	let body = pointer
	if (body.startsWith('#')) {
		body = body.slice(1)
		// URI-fragment form: percent-decode the whole fragment before
		// splitting. `decodeURIComponent` is the standard fragment decoder;
		// a malformed `%` sequence is itself a malformed pointer (§13).
		try {
			body = decodeURIComponent(body)
		} catch {
			throw new Error(`malformed JSON Pointer (bad percent-encoding): ${pointer}`)
		}
	}
	if (body === '') {
		return []
	}
	if (!body.startsWith('/')) {
		// A non-empty pointer that is neither `#`, `#/...`, nor `/...` is not
		// a valid same-document pointer (RFC 6901 §3 requires the leading
		// `/`). External refs are filtered earlier; reaching here is a
		// malformed local pointer → §13.
		throw new Error(`malformed JSON Pointer (missing leading "/"): ${pointer}`)
	}
	return body
		.slice(1)
		.split('/')
		.map(unescapeToken)
}

/**
 * Descend ONE RFC-6901 reference token into a JSON node.
 *
 * @remarks
 * Operates over a generic JSON value, NOT only schema nodes: a JSON
 * Pointer threads through CONTAINERS that are not themselves schemas — a
 * schema's `prefixItems`/`anyOf` is a JSON ARRAY of sub-schemas, a `$defs`
 * value is a MAP of sub-schemas. Validating "is this a schema?" at every
 * hop would reject `#/prefixItems/0` (the intermediate array is not a
 * schema). So the walk is structural over JSON; {@link resolveRef}
 * validates ONLY the FINAL resolved node is a schema (RFC 6901 §4: a
 * pointer evaluates against the document as a generic JSON structure). A
 * boolean is a leaf — descending into it is unresolvable (§13).
 */
function descend(node: unknown, token: string, pointer: string): unknown {
	if (Array.isArray(node)) {
		const index = Number(token)
		if (!Number.isInteger(index) || index < 0 || index >= node.length) {
			throw new Error(`unresolvable JSON Pointer (array index out of range): ${pointer}`)
		}
		return node[index]
	}
	if (!isRecord(node) || !Object.prototype.hasOwnProperty.call(node, token)) {
		throw new Error(`unresolvable JSON Pointer (no such key "${token}"): ${pointer}`)
	}
	return node[token]
}

/**
 * Resolve a single RFC-6901 JSON Pointer `$ref` against a document root.
 *
 * @remarks
 * Resolves the COMMON single-document forms fully: `#` / `` (whole
 * document), `#/...` (URI-fragment pointer, percent-decoded), and the bare
 * RFC-6901 `/...` form. Per-token unescaping is `~1`→`/` then `~0`→`~` (so
 * `~01` decodes to the literal `~1`, never `/`). `$defs` AND legacy
 * `definitions` are addressable (the walker descends whatever key the
 * pointer names). Boolean schemas and a boolean root resolve correctly.
 *
 * This is the SINGLE-HOP primitive: it does NOT follow a `$ref` found AT
 * the resolved target (use {@link createRefResolver} for chain-following
 * and cycle-safety).
 *
 * Error model (AGENTS.md §13 — a supplied schema is a build-time artifact
 * the programmer controls, so a malformed `$ref` is a PROGRAMMER ERROR):
 *
 * - An unresolvable pointer (missing key, out-of-range index, descent into
 *   a boolean/non-schema) → a precise `Error` NAMING the pointer.
 * - An EXTERNAL / non-local `$ref` (`https://…`, `other.json#/…`) →
 *   `Error` `external $ref unsupported: <ref>` (unsupported in E1 by
 *   design — see the module header note 2 for the future seam).
 *
 * @param root - The JSON-Schema document every token is resolved against
 * @param pointer - The `$ref` JSON Pointer (`#`, `#/$defs/Node`, `/a/b`, …)
 * @returns The resolved schema node (an object schema or a boolean schema)
 * @throws Error If the pointer is external, malformed, or unresolvable
 *
 * @example
 * ```ts
 * const root = { $defs: { Id: { type: 'string' } }, $ref: '#/$defs/Id' }
 * resolveRef(root, '#/$defs/Id') // { type: 'string' }
 * resolveRef(root, '#')          // the whole `root` document
 * resolveRef({ $defs: { 'a/b': { type: 'number' } } }, '#/$defs/a~1b')
 * //                                                  → { type: 'number' }
 * ```
 */
export function resolveRef(root: JsonSchema, pointer: string): JsonSchemaDefinition | boolean {
	if (isExternalRef(pointer)) {
		throw new Error(`external $ref unsupported: ${pointer}`)
	}
	let node: unknown = root
	for (const token of pointerTokens(pointer)) {
		node = descend(node, token, pointer)
	}
	// RFC 6901 §4: the pointer walks the document as generic JSON; only the
	// FINAL resolved value must be a schema for this to be a usable `$ref`
	// target. A non-schema final node (a bare string/number, a raw array)
	// is a malformed `$ref` → §13 precise throw.
	if (!isJsonSchema(node)) {
		throw new Error(`unresolvable JSON Pointer (target is not a schema): ${pointer}`)
	}
	return node
}

// === createRefResolver — cycle-safe resolver closure for E2–E4

/**
 * Resolve a pointer to its CANONICAL form by following any `$ref` chain at
 * the resolved node, BY POINTER (never by recursing into a body).
 *
 * @remarks
 * `pointer` is normalised to the canonical pointer the value ultimately
 * lives at. A non-`$ref` node is its own canonical pointer. The
 * `seenChain` array is the per-CALL ordered list of pointers visited while
 * following THIS chain (distinct from the ancestor set used for recursion
 * detection): a `$ref` chain that loops purely through `$ref`s with no
 * concrete body ANYWHERE in the loop is detected here by pointer-revisit
 * and converted into a precise §13 `Error` (consistent with the
 * `external $ref unsupported` / missing-pointer / `MAX_REF_DEPTH` throws).
 * `depth` is the `MAX_REF_DEPTH` backstop for a long ACYCLIC chain; a
 * pure-ref CYCLE shorter than the bound throws the cycle error first
 * (pointer-revisit fires before the depth cap).
 */
function canonicalize(root: JsonSchema, pointer: string): { pointer: string; node: JsonSchema } {
	let currentPointer = pointer === '' ? '#' : pointer
	let node = resolveRef(root, currentPointer)
	const seenChain: string[] = [currentPointer]
	const seenSet = new Set<string>([currentPointer])
	let depth = 0
	while (typeof node !== 'boolean' && typeof node.$ref === 'string') {
		depth += 1
		if (depth > MAX_REF_DEPTH) {
			throw new Error(
				`$ref chain exceeded MAX_REF_DEPTH (${MAX_REF_DEPTH}) starting at: ${pointer}`,
			)
		}
		const nextRef = node.$ref
		if (isExternalRef(nextRef)) {
			throw new Error(`external $ref unsupported: ${nextRef}`)
		}
		if (seenSet.has(nextRef)) {
			// Pure `$ref`-only loop — the chain revisits a pointer it has
			// already visited and has NEVER reached a concrete (non-`$ref`,
			// non-boolean) body. This chain can never yield a usable schema
			// node; returning here would give the caller a `$ref`-containing
			// node and silently violate the `resolve`/`thunk` contract
			// (both guarantee a concrete node or boolean). Throw a precise
			// §13 Error that names the full cycle path so the author can fix
			// the schema. The cycle starts at `nextRef` (the revisited pointer)
			// and ends with the current `currentPointer` hop back to it.
			const cycleStart = seenChain.indexOf(nextRef)
			const cyclePath = [...seenChain.slice(cycleStart), nextRef].join(' -> ')
			throw new Error(`circular $ref with no concrete schema: ${cyclePath}`)
		}
		seenSet.add(nextRef)
		seenChain.push(nextRef)
		currentPointer = nextRef
		node = resolveRef(root, nextRef)
	}
	return { pointer: currentPointer, node }
}

/**
 * Build a cycle-safe `$ref`/`$defs` resolver bound to one JSON-Schema
 * document — the foundation E2 (schema→`Guard`), E3 (schema→shape), E4
 * (schema→parser) walk a schema with.
 *
 * @remarks
 * Returns a {@link RefResolver}:
 *
 * - `root` — the document every pointer resolves against.
 * - `resolve(pointer)` — the EAGER form: follow a `$ref` chain to a
 *   concrete (non-`$ref`) node or boolean. Always returns a concrete node or
 *   boolean, ELSE throws a precise §13 `Error`. Use for finite,
 *   non-recursive positions. Throws on an unresolvable/external pointer, a
 *   non-cyclic chain exceeding `MAX_REF_DEPTH`, or a pure-`$ref`-only cycle
 *   (message: `circular $ref with no concrete schema: …`).
 * - `lazy(pointer)` — the CYCLE-BROKEN form: returns a {@link LazyRef}
 *   indirection. This is the JSON-Schema mirror of D3's `lazyShape` thunk
 *   memoization and the EXACT contract E2–E4 build a RECURSIVE compiled
 *   function on:
 *
 *     1. Keep a `Map<pointer, compiledArtifact>`.
 *     2. For a position, call `lazy(ref)`. If `indirection.cyclic` is
 *        `true`, the pointer is already being compiled higher on the
 *        stack — reuse the in-progress (deferred) artifact for
 *        `indirection.pointer` instead of recursing (this is what makes a
 *        recursive `#/$defs/Node` a RECURSIVE guard, not an infinite one).
 *     3. Otherwise install a deferred closure into the map keyed by
 *        `indirection.pointer` BEFORE calling `indirection.thunk()` and
 *        compiling its body — so the self-reference inside the body gets
 *        the cyclic hit at step 2.
 *
 *   `thunk()` is idempotent and always either returns a concrete non-`$ref`
 *   node/boolean OR throws a precise §13 `Error`: it never returns a
 *   still-unresolved `$ref` node. For a legitimately self-referential target
 *   it resolves by pointer, not by re-entering a body, so it terminates. A
 *   pure-`$ref`-only cycle (no concrete body anywhere in the loop) throws
 *   `circular $ref with no concrete schema: …`. Recursion is realised only
 *   over the finite DATA at guard/parse time, exactly like the D3 `'lazy'`
 *   compiler arm.
 *
 * Cycle detection mirrors D3's per-compilation `lazyCache` (compilers.ts
 * `'lazy'` arm): the resolver keeps a set of canonical pointers whose
 * `lazy()` has ALREADY been requested during this resolver's walk. The
 * FIRST `lazy(ptr)` registers `ptr` and reports `cyclic: false`; any later
 * `lazy(ptr)` for the same canonical pointer (the recursive back-edge a
 * RECURSIVE schema produces when the walk re-reaches the named def through
 * its own body) reports `cyclic: true`. A resolver is built ONCE per
 * schema compile and walked once, so this lifetime-scoped set is precisely
 * the D3 thunk-keyed memo, keyed here by canonical pointer — exactly what
 * E2 needs to bind a recursive guard to ONE compiled function per def.
 *
 * @param root - The JSON-Schema document to resolve `$ref`s within
 * @returns A cycle-safe {@link RefResolver}
 *
 * @example
 * ```ts
 * const root = {
 *   $defs: {
 *     Node: {
 *       type: 'object',
 *       properties: { value: { type: 'string' }, next: { $ref: '#/$defs/Node' } },
 *     },
 *   },
 *   $ref: '#/$defs/Node',
 * }
 * const resolver = createRefResolver(root)
 * const node = resolver.resolve('#/$defs/Node') // the concrete Node schema
 * const back = resolver.lazy('#/$defs/Node')    // cycle-broken indirection
 * back.thunk() // terminates — returns Node again (no stack overflow)
 * ```
 */
export function createRefResolver(root: JsonSchema): RefResolver {
	// Canonical pointers whose `lazy()` has already been requested during
	// this resolver's walk — the D3 `lazyCache` analogue keyed by pointer.
	// The FIRST request registers the pointer (cyclic:false); a later
	// request for the SAME canonical pointer is the recursive back-edge
	// (cyclic:true) E2 compiles into a recursive guard. A resolver is built
	// once per schema compile and walked once, so lifetime scope == walk
	// scope, exactly like D3's per-compilation cache.
	const requested = new Set<string>()

	function resolve(pointer: string): JsonSchemaDefinition | boolean {
		return canonicalize(root, pointer).node
	}

	function lazy(pointer: string): LazyRef {
		const { pointer: canonical } = canonicalize(root, pointer)
		const cyclic = requested.has(canonical)
		requested.add(canonical)
		// `thunk()` resolves BY POINTER (never re-enters a body), so it is
		// idempotent and always terminates even for a self-referential
		// target — the deferral is exactly what breaks the static cycle so
		// E2 can compile a recursive (not infinite) guard. Memoized so
		// repeated calls return the identical resolved node.
		let resolved: JsonSchema | undefined
		const thunk = (): JsonSchema => {
			if (resolved === undefined) {
				resolved = canonicalize(root, canonical).node
			}
			return resolved
		}
		return { pointer: canonical, cyclic, thunk }
	}

	return { root, resolve, lazy }
}

// ============================================================================
//  E2 — compileSchemaGuard: JSON Schema -> a runtime Guard<unknown>
//
//  The heart of the inverse subsystem: given a JSON-Schema document, build a
//  runtime predicate that accepts exactly the values the schema describes.
//  Built ON E1's resolver (one `createRefResolver(root)` per compile call;
//  $ref recursion broken via the D3 lazy/memo-by-pointer contract).
//
//  ── Design notes (decisions, with the WHY) ────────────────────────────
//
//  1. A SCHEMA IS A CONJUNCTION. Every present keyword is an independent
//     constraint; a value is valid iff ALL of them hold (and an absent
//     keyword imposes nothing). This mirrors JSON-Schema 2020-12 and the
//     forward `compileGuard` arm semantics (parity anchor).
//
//  2. ERROR SPLIT (§13). A malformed SCHEMA (unresolvable / external /
//     pure-`$ref`-only-cycle / `MAX_REF_DEPTH`) is a PROGRAMMER ERROR caught
//     at COMPILE time — E1's precise `Error`s propagate (fail-fast, exactly
//     like `compileGuard`/`compileSchema` on a malformed shape). The
//     PRODUCED guard, by contrast, NEVER throws on ANY runtime input
//     (cyclic data, throwing getters, pathological depth): it returns
//     `false`. Strategy: every property read goes through `safeGet` (a
//     `try`-wrapped `Reflect.get`, so a throwing getter is `false` not a
//     thrown error), and the recursive evaluator threads an ANCESTOR set +
//     a `MAX_DATA_DEPTH` cap (the B5 `MAX_JSON_DEPTH` analogue) so cyclic
//     or pathologically deep DATA terminates with `false` rather than a
//     native stack overflow.
//
//  3. RECURSIVE `$ref` (D3 mirror). A `Map<pointer, Matcher>` memoizes the
//     compiled matcher per canonical pointer. On the FIRST visit to a
//     pointer a DEFERRED closure is installed into the map BEFORE the
//     referenced body is compiled; a recursive child whose `lazy()` reports
//     `cyclic: true` reuses that in-progress deferred closure instead of
//     recursing — the self-reference resolves to ONE compiled matcher and
//     the recursion is realised only over the finite DATA at guard time.
//     `resolve()`/`thunk()` always return a concrete non-`$ref` node OR
//     throw a precise §13 `Error` (let it propagate).
//
//  4. STRUCTURAL EQUALITY (D4 parity). `enum`, `const`, and `uniqueItems`
//     all use ONE equality (`schemaValueEquals`): primitive leaves by
//     `Object.is` (so `NaN` === `NaN`, `+0` ≠ `-0` — the SAME equality
//     validators' `literalOf` and compilers' `constEquals` use), arrays /
//     plain objects by recursive structural deep-equality. Consistency
//     across enum/const/uniqueItems/literal is deliberate and project-wide.
//
//  5. `format` IS ANNOTATION-FIRST (JSON-Schema spec: `format` is an
//     annotation, not by default an assertion). A DOCUMENTED known set
//     ASSERTS best-effort: `email`/`uuid` (syntactic regex), `date-time`
//     (`Date.parse`-parseable), `uri` (RFC-3986 absolute-URI shape:
//     `scheme:` + non-empty no-whitespace remainder — a conservative
//     SYNTACTIC check; the core build's lib is `ESNext` only, no DOM/Node
//     `URL`). ANY OTHER `format` value PASSES (annotation only — never
//     false-rejects an unknown format). The asserting set is intentionally
//     small and conservative (a best-effort, not a full RFC validator).
//
//  6. `exclusiveMinimum`/`exclusiveMaximum` — the 2020-12 NUMERIC form only
//     (`exclusiveMinimum: 0` means `value > 0`). The draft-04 boolean form
//     (`exclusiveMinimum: true` paired with `minimum`) is NOT supported:
//     `JsonSchemaDefinition` types these as `number`, the forward
//     `compileSchema` emits the numeric form, and 2020-12 is the project
//     baseline. Documented limitation.
//
//  7. `multipleOf` — `value / divisor` must be an integer, with a FEW-ULP
//     relative epsilon (`Number.EPSILON * 8 * |quotient|`) so common
//     decimal divisors (`0.1`) are not false-rejected by genuine IEEE-754
//     division error (~6.7e-16 for `0.3/0.1`), while a clearly non-multiple
//     (`0.30000000000001` for `multipleOf: 0.1`, ~1e-13 off — ~150x the
//     representation error) still FAILS. Documented float-precision band.
//
//  8. STRING LENGTH is `String.prototype.length` — UTF-16 CODE UNITS, the
//     JSON-Schema convention for `minLength`/`maxLength`. Documented.
//
//  9. STATEFUL-REGEX HAZARD. A `pattern` string compiles to ONE `RegExp`
//     WITHOUT the `g`/`y` flags and is matched with `.test()`; a flagless
//     RegExp's `.test()` is stateless, so repeated guard calls are
//     consistent (no `lastIndex` carry-over). A malformed pattern string is
//     a §13 COMPILE-time throw (a defect in the schema the author controls).
//
//  The returned `Guard<unknown>` narrows only to `unknown` — a JSON
//  Schema's static TS type is not known here (E3 will add
//  schema→ContractShape→Infer for static types). It is an honest RUNTIME
//  narrow: the predicate is sound, the static type is `unknown`.
// ============================================================================

/**
 * Depth bound for the recursive DATA walk a compiled schema guard performs —
 * the inverse-subsystem analogue of validators' `MAX_JSON_DEPTH`.
 *
 * @remarks
 * The ancestor set catches every true cycle precisely; this cap only converts
 * a pathologically deep but ACYCLIC input into a `false` return instead of a
 * native stack overflow (§13 — the produced guard must never throw). 1,000
 * sits far below any stack-overflow point yet orders of magnitude above any
 * legitimate JSON document's nesting.
 */
const MAX_DATA_DEPTH = 1_000

/**
 * A compiled, depth/cycle-aware matcher for one schema node.
 *
 * @remarks
 * `seen` is the ANCESTOR set of object/array values on the active evaluation
 * path (added on entry, removed on exit — a true back-edge detector, exactly
 * like validators' `isJsonValueInner`). `depth` is the `MAX_DATA_DEPTH`
 * backstop. A matcher NEVER throws (§13): a defect in the input yields
 * `false`.
 */
type SchemaMatcher = (value: unknown, seen: Set<object>, depth: number) => boolean

/**
 * Read a property without ever throwing (§13).
 *
 * @remarks
 * The compiled guard reads UNTRUSTED input; an attacker-supplied throwing
 * getter must make the guard return `false`, never propagate. `Reflect.get`
 * (not `value[key]`) keeps the read explicit; the `try` makes a throwing
 * accessor a benign sentinel. Presence is tested separately via
 * `Object.hasOwn` so an inherited key is never mistaken for an own property
 * (B2 prototype-pollution discipline).
 */
function safeGet(value: object, key: string): unknown {
	try {
		return Reflect.get(value, key)
	} catch {
		return SAFE_GET_THREW
	}
}

/** Unique sentinel returned by {@link safeGet} when an accessor throws. */
const SAFE_GET_THREW: unique symbol = Symbol('safe-get-threw')

/**
 * Structural value equality shared by `enum`, `const`, and `uniqueItems`.
 *
 * @remarks
 * Primitive leaves by `Object.is` (so `NaN` === `NaN`, `+0` ≠ `-0` — the
 * SAME equality validators' `literalOf` and compilers' `constEquals` use);
 * arrays / plain records by recursive structural deep-equality. `a` is the
 * trusted SCHEMA-supplied value (a finite acyclic `JsonValue`), so the
 * recursion is bounded by `a`'s finite shape regardless of `b` (the
 * untrusted input). Own keys are read via `Object.hasOwn` (B2). Never
 * throws (§13) — a throwing getter on `b` surfaces as inequality.
 */
function schemaValueEquals(a: unknown, b: unknown): boolean {
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) {
			return false
		}
		for (let index = 0; index < a.length; index += 1) {
			if (!schemaValueEquals(a[index], b[index])) {
				return false
			}
		}
		return true
	}
	if (!isRecord(a)) {
		return Object.is(a, b)
	}
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
		const bChild = safeGet(b, key)
		if (bChild === SAFE_GET_THREW || !schemaValueEquals(a[key], bChild)) {
			return false
		}
	}
	return true
}

/** Known `format` keywords that ASSERT (best-effort). See design note 5. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// RFC 3986 absolute-URI shape: `scheme:` then a non-empty, no-whitespace
// remainder. A deliberately conservative SYNTACTIC best-effort (the core
// build's lib is `ESNext` only — no DOM/Node `URL` constructor — and
// `format` is annotation-first anyway, design note 5). `scheme` is
// `ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )`.
const URI_FORMAT = /^[a-z][a-z0-9+.-]*:\S+$/i

/**
 * Best-effort assertion for the documented known `format` set.
 *
 * @remarks
 * Returns `true` for any format NOT in the asserting set (annotation-only —
 * never false-rejects an unknown format, per JSON-Schema spec and design
 * note 5). `email`/`uuid` are syntactic; `date-time` defers to
 * `Date.parse`; `uri` defers to the `URL` constructor (absolute URIs).
 */
function matchesFormat(format: string, value: string): boolean {
	switch (format) {
		case 'email':
			return EMAIL_FORMAT.test(value)
		case 'uuid':
			return UUID_FORMAT.test(value)
		case 'date-time':
			return !Number.isNaN(Date.parse(value))
		case 'uri':
			return URI_FORMAT.test(value)
		default:
			return true
	}
}

/**
 * `value` is a multiple of `divisor` within IEEE-754 tolerance.
 *
 * @remarks
 * `value / divisor` must be (near) an integer. A small relative epsilon
 * tolerates representation error for common decimal divisors (`0.1`) while
 * still rejecting a clearly non-multiple. See design note 7.
 */
function isMultipleOf(value: number, divisor: number): boolean {
	if (divisor === 0) {
		return false
	}
	const quotient = value / divisor
	const rounded = Math.round(quotient)
	if (rounded === quotient) {
		return true
	}
	// Tolerate ONLY genuine IEEE-754 representation error of the division
	// (a few ULPs of the quotient — `0.3 / 0.1` lands ~6.7e-16 off 3),
	// while still rejecting a clearly non-multiple (`0.30000000000001 / 0.1`
	// is ~1e-13 off, ~150x larger). `Number.EPSILON * 8 * |quotient|` is a
	// few-ULP relative band that cleanly separates the two (design note 7).
	const epsilon = Number.EPSILON * 8 * Math.max(1, Math.abs(quotient))
	return Math.abs(quotient - rounded) <= epsilon
}

/**
 * Compile a JSON Schema document into a runtime {@link Guard}.
 *
 * @remarks
 * The heart of the inverse subsystem. A schema is a CONJUNCTION of its
 * keywords (every present constraint must hold; an absent keyword imposes
 * nothing). The returned predicate narrows only to `unknown` — a JSON
 * Schema's static TS type is not statically known here (E3 will add
 * schema→shape→`Infer`); it is an honest runtime narrow.
 *
 * Error model (AGENTS.md §13, two halves):
 *
 * - A malformed SCHEMA (unresolvable / external / pure-`$ref`-only-cycle /
 *   `MAX_REF_DEPTH`) is a PROGRAMMER ERROR thrown at COMPILE time — E1's
 *   precise `Error`s propagate (fail-fast, mirroring `compileGuard`).
 * - The PRODUCED guard NEVER throws on ANY runtime input: cyclic data,
 *   throwing getters, and pathological depth all return `false`.
 *
 * Keyword coverage: `type` (single + array union; `integer`), `enum`,
 * `const`, `minLength`/`maxLength`, `pattern`, `format` (documented
 * asserting set: `email`/`uuid`/`date-time`/`uri`; unknown formats pass),
 * `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum` (2020-12 numeric
 * form), `multipleOf`, `items`/`prefixItems`/`minItems`/`maxItems`/
 * `uniqueItems`, `properties`/`required`/`additionalProperties`/
 * `patternProperties`/`propertyNames`/`minProperties`/`maxProperties`/
 * `dependentRequired`, `allOf`/`anyOf`/`oneOf` (exactly-one)/`not`,
 * `if`/`then`/`else`, boolean schemas, and `$ref`/`$defs` (recursive-safe).
 *
 * @param schema - The JSON Schema document to compile
 * @returns A runtime {@link Guard} that narrows accepted values to `unknown`
 * @throws Error If the schema contains a malformed `$ref` (compile time)
 *
 * @example
 * ```ts
 * const isUser = compileSchemaGuard({
 *   type: 'object',
 *   properties: { name: { type: 'string', minLength: 1 } },
 *   required: ['name'],
 *   additionalProperties: false,
 * })
 * isUser({ name: 'Ada' }) // true
 * isUser({ name: '' })    // false — fails minLength: 1
 * isUser({ name: 'Ada', x: 1 }) // false — closed object
 * ```
 */
export function compileSchemaGuard(schema: JsonSchema): Guard<unknown> {
	// ONE resolver per compile call (E1 contract). The root is the schema
	// itself — every internal `$ref`/`#`/`$defs` pointer resolves against it.
	const resolver = createRefResolver(schema)
	// D3 memo-by-pointer: a recursive `$ref` reuses ONE compiled matcher.
	const pointerCache = new Map<string, SchemaMatcher>()
	const root = compileNode(schema, resolver, pointerCache)
	// The narrow target is `unknown` (see remarks — a JSON Schema's static TS
	// type is not known here; E3 adds schema→shape→`Infer`). The predicate
	// return type is declared on the signature (the cast-free `matchesShape`
	// idiom: a `boolean`-bodied function annotated `value is unknown` — no
	// `as`). §13: NEVER throws — the recursive matcher is already total
	// (every read via `safeGet`, depth/cycle capped); the outer `try` is a
	// defensive backstop for any unforeseen host exception.
	function guard(value: unknown): value is unknown {
		try {
			return root(value, new Set<object>(), 0)
		} catch {
			return false
		}
	}
	return guard
}

/**
 * Compile one schema node into a {@link SchemaMatcher}.
 *
 * @remarks
 * A boolean schema is a terminal (`true` ⇒ always match, `false` ⇒ never).
 * A `$ref` node is resolved via the D3 lazy/memo-by-pointer contract: a
 * deferred closure is installed into `pointerCache` BEFORE the referenced
 * body is compiled, so a recursive self-reference reuses ONE matcher rather
 * than recursing forever at compile time. Every non-`$ref` object node is a
 * CONJUNCTION of its keyword matchers (design note 1).
 */
function compileNode(
	node: JsonSchema,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
): SchemaMatcher {
	if (typeof node === 'boolean') {
		return node ? () => true : () => false
	}
	if (typeof node.$ref === 'string') {
		return compileRef(node.$ref, resolver, pointerCache)
	}
	return compileKeywords(node, resolver, pointerCache)
}

/**
 * Compile a `$ref` position into a recursion-safe matcher (D3 contract).
 *
 * @remarks
 * `resolver.lazy(ref)` canonicalises the pointer and reports `cyclic`. If a
 * matcher for the canonical pointer is already in `pointerCache` (the
 * in-progress deferred closure installed on FIRST visit), it is reused — the
 * self-reference resolves to ONE compiled matcher and the recursion is
 * realised only over the finite DATA at guard time. Otherwise a deferred
 * closure is installed BEFORE the referenced body is compiled, so the
 * recursive descent that re-enters this `$ref` gets the cache hit. `thunk()`
 * always returns a concrete non-`$ref` node OR throws a precise §13 `Error`
 * (pure-`$ref`-only cycle / external / missing / `MAX_REF_DEPTH`) — that
 * propagates at COMPILE time (fail-fast).
 */
function compileRef(
	ref: string,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
): SchemaMatcher {
	const indirection = resolver.lazy(ref)
	const cached = pointerCache.get(indirection.pointer)
	if (cached !== undefined) {
		return cached
	}
	let resolved: SchemaMatcher | undefined
	// §13 cycle/depth safety is enforced HERE — the `$ref` boundary is the
	// ONLY place DATA recursion can be unbounded for a finite schema (every
	// non-`$ref` keyword recurses into strictly-smaller sub-values). This
	// mirrors validators' `isJsonValueInner`: an object/array value already
	// on the active path is a genuine back-edge → `false` (NOT a thrown
	// `RangeError`); the `MAX_DATA_DEPTH` cap defends a pathologically deep
	// but ACYCLIC input the ancestor set cannot catch.
	const deferred: SchemaMatcher = (value, seen, depth) => {
		if (resolved === undefined) {
			// `thunk()` returns a concrete node or throws a precise §13 Error
			// (pure-ref cycle / external / missing) — propagate (fail-fast,
			// mirrors compileGuard). Reached lazily on first DATA use.
			resolved = compileNode(indirection.thunk(), resolver, pointerCache)
		}
		if (depth > MAX_DATA_DEPTH) {
			return false
		}
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) {
				return false
			}
			seen.add(value)
			const ok = resolved(value, seen, depth + 1)
			seen.delete(value)
			return ok
		}
		return resolved(value, seen, depth + 1)
	}
	// Install BEFORE compiling the body so a recursive self-`$ref` hits the
	// cache above instead of recursing forever (D3 lazyShape memo pattern).
	pointerCache.set(indirection.pointer, deferred)
	// Eagerly resolve the body now (non-recursive positions compile fully;
	// a recursive child re-enters `compileRef` and gets the deferred hit).
	resolved = compileNode(indirection.thunk(), resolver, pointerCache)
	return deferred
}

/**
 * Compile the keyword conjunction of a non-`$ref` object schema node.
 *
 * @remarks
 * Each present keyword group contributes one matcher; a value is valid iff
 * EVERY contributed matcher accepts it (design note 1). Sub-schema positions
 * recurse through {@link compileNode} so nested `$ref`s share the D3 memo.
 */
function compileKeywords(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
): SchemaMatcher {
	const matchers: SchemaMatcher[] = []

	// --- type (single or array union; `integer` = number + isInteger) ---
	if (node.type !== undefined) {
		const types = Array.isArray(node.type) ? node.type : [node.type]
		matchers.push((value) => types.some((name) => matchesJsonType(name, value)))
	}

	// --- enum / const (D4 structural equality) ---
	if (node.enum !== undefined) {
		const members = node.enum
		matchers.push((value) => members.some((member) => schemaValueEquals(member, value)))
	}
	if (node.const !== undefined) {
		const constValue = node.const
		matchers.push((value) => schemaValueEquals(constValue, value))
	}

	// --- string: minLength / maxLength / pattern / format ---
	if (node.minLength !== undefined) {
		const min = node.minLength
		// JSON-Schema length is UTF-16 code units (design note 8).
		matchers.push((value) => typeof value !== 'string' || value.length >= min)
	}
	if (node.maxLength !== undefined) {
		const max = node.maxLength
		matchers.push((value) => typeof value !== 'string' || value.length <= max)
	}
	if (node.pattern !== undefined) {
		// One flagless RegExp (no `g`/`y` → `.test()` is stateless, so
		// repeated guard calls are consistent — design note 9). A malformed
		// pattern is a §13 COMPILE-time defect in the author-controlled schema.
		const regExp = new RegExp(node.pattern)
		matchers.push((value) => typeof value !== 'string' || regExp.test(value))
	}
	if (node.format !== undefined) {
		const format = node.format
		matchers.push((value) => typeof value !== 'string' || matchesFormat(format, value))
	}

	// --- number: minimum / maximum / exclusive* / multipleOf ---
	if (node.minimum !== undefined) {
		const min = node.minimum
		matchers.push((value) => typeof value !== 'number' || value >= min)
	}
	if (node.maximum !== undefined) {
		const max = node.maximum
		matchers.push((value) => typeof value !== 'number' || value <= max)
	}
	if (node.exclusiveMinimum !== undefined) {
		// 2020-12 numeric form only (design note 6).
		const bound = node.exclusiveMinimum
		matchers.push((value) => typeof value !== 'number' || value > bound)
	}
	if (node.exclusiveMaximum !== undefined) {
		const bound = node.exclusiveMaximum
		matchers.push((value) => typeof value !== 'number' || value < bound)
	}
	if (node.multipleOf !== undefined) {
		const divisor = node.multipleOf
		matchers.push((value) => typeof value !== 'number' || isMultipleOf(value, divisor))
	}

	// --- array: items / prefixItems / min/maxItems / uniqueItems ---
	compileArrayKeywords(node, resolver, pointerCache, matchers)

	// --- object: properties / required / additional / pattern / names ... ---
	compileObjectKeywords(node, resolver, pointerCache, matchers)

	// --- composition: allOf / anyOf / oneOf / not / if-then-else ---
	compileCompositionKeywords(node, resolver, pointerCache, matchers)

	if (matchers.length === 0) {
		// No constraints (e.g. `{}`, `{ description }`) — accept anything.
		return () => true
	}
	return (value, seen, depth) => {
		for (const matcher of matchers) {
			if (!matcher(value, seen, depth)) {
				return false
			}
		}
		return true
	}
}

/** `value` satisfies a single JSON-Schema `type` name. */
function matchesJsonType(name: JsonSchemaType, value: unknown): boolean {
	switch (name) {
		case 'string':
			return typeof value === 'string'
		case 'number':
			return typeof value === 'number' && Number.isFinite(value)
		case 'integer':
			return typeof value === 'number' && Number.isInteger(value)
		case 'boolean':
			return typeof value === 'boolean'
		case 'null':
			return value === null
		case 'array':
			return Array.isArray(value)
		case 'object':
			return isRecord(value)
	}
}

/** Append the array-keyword matchers (`items`/`prefixItems`/…). */
function compileArrayKeywords(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
	matchers: SchemaMatcher[],
): void {
	const { items, prefixItems } = node
	// `prefixItems` (2020-12) AND the legacy draft-04 ARRAY form of `items`
	// are the SAME positional-tuple notion; support both (free — strictly
	// more useful, mirrors the E1 `$defs`/`definitions` both-forms decision).
	// `Array.isArray` narrows to `any[]` which does not subtract the
	// `readonly JsonSchema[]` interface from `JsonSchema | readonly
	// JsonSchema[]` without an `as` (the same union-narrowing limitation
	// documented in compilers' `constEquals`); so the array form is
	// re-derived structurally here via its own `Array.isArray` guard and the
	// scalar/`false` forms handled in the `else`.
	const itemsArray: readonly JsonSchema[] | undefined = Array.isArray(items)
		? items
		: prefixItems
	const prefixMatchers =
		itemsArray !== undefined
			? itemsArray.map((sub) => compileNode(sub, resolver, pointerCache))
			: undefined
	// The scalar `items` (2020-12 tail schema) OR a closed-tuple `false`. A
	// boolean `items` only constrains positions PAST `prefixItems` (mirrors
	// D1 `tupleShape` / forward closed-tuple semantics).
	// `items: true` ("any tail element") is equivalent to no tail constraint,
	// so only a non-boolean schema object contributes a tail matcher.
	const itemsMatcher =
		items !== undefined && items !== true && items !== false && isJsonSchema(items)
			? compileNode(items, resolver, pointerCache)
			: undefined
	const closedTail = items === false
	if (prefixMatchers !== undefined || itemsMatcher !== undefined || closedTail) {
		matchers.push((value, seen, depth) => {
			if (!Array.isArray(value)) {
				return true
			}
			for (let index = 0; index < value.length; index += 1) {
				const prefix = prefixMatchers?.[index]
				if (prefix !== undefined) {
					if (!prefix(value[index], seen, depth)) {
						return false
					}
					continue
				}
				if (closedTail) {
					return false
				}
				if (itemsMatcher !== undefined && !itemsMatcher(value[index], seen, depth)) {
					return false
				}
			}
			return true
		})
	}
	if (node.minItems !== undefined) {
		const min = node.minItems
		matchers.push((value) => !Array.isArray(value) || value.length >= min)
	}
	if (node.maxItems !== undefined) {
		const max = node.maxItems
		matchers.push((value) => !Array.isArray(value) || value.length <= max)
	}
	if (node.uniqueItems === true) {
		matchers.push((value) => {
			if (!Array.isArray(value)) {
				return true
			}
			for (let i = 0; i < value.length; i += 1) {
				for (let j = i + 1; j < value.length; j += 1) {
					if (schemaValueEquals(value[i], value[j])) {
						return false
					}
				}
			}
			return true
		})
	}
}

/**
 * Append the object-keyword matchers.
 *
 * @remarks
 * B2 PROTOTYPE-POLLUTION SAFETY: the guard reads UNTRUSTED input. Presence
 * is tested with `Object.hasOwn` (never `in`, so an inherited `__proto__`
 * cannot satisfy a `required`/property check); enumeration uses
 * `Object.keys` (own enumerable string keys only); every value read goes
 * through {@link safeGet} (a throwing getter ⇒ `false`, never propagate).
 * A JSON-parsed `__proto__`/`constructor` own key is treated as an ordinary
 * own property — validated or rejected by the closed-object policy exactly
 * like any other key, and never written through the prototype chain.
 */
function compileObjectKeywords(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
	matchers: SchemaMatcher[],
): void {
	const propsMatchers = new Map<string, SchemaMatcher>()
	if (node.properties !== undefined) {
		for (const key of Object.keys(node.properties)) {
			const sub = node.properties[key]
			if (sub !== undefined) {
				propsMatchers.set(key, compileNode(sub, resolver, pointerCache))
			}
		}
	}
	const patternMatchers: { regExp: RegExp; matcher: SchemaMatcher }[] = []
	if (node.patternProperties !== undefined) {
		for (const source of Object.keys(node.patternProperties)) {
			const sub = node.patternProperties[source]
			if (sub !== undefined) {
				patternMatchers.push({
					regExp: new RegExp(source),
					matcher: compileNode(sub, resolver, pointerCache),
				})
			}
		}
	}
	const required = node.required
	const additional = node.additionalProperties
	const additionalMatcher =
		additional !== undefined && typeof additional !== 'boolean'
			? compileNode(additional, resolver, pointerCache)
			: undefined
	const propertyNamesMatcher =
		node.propertyNames !== undefined
			? compileNode(node.propertyNames, resolver, pointerCache)
			: undefined
	const hasObjectKeyword =
		node.properties !== undefined ||
		node.patternProperties !== undefined ||
		node.propertyNames !== undefined ||
		required !== undefined ||
		additional !== undefined ||
		node.minProperties !== undefined ||
		node.maxProperties !== undefined ||
		node.dependentRequired !== undefined

	if (!hasObjectKeyword) {
		return
	}

	matchers.push((value, seen, depth) => {
		if (!isRecord(value)) {
			// Non-object: object keywords don't constrain it (a conjunction
			// arm; `type` enforces object-ness when present).
			return true
		}
		const keys = Object.keys(value)
		// required — own-key presence only (B2: never `in`/inherited).
		if (required !== undefined) {
			for (const key of required) {
				if (!Object.hasOwn(value, key)) {
					return false
				}
			}
		}
		// propertyNames — schema applied to each own key string.
		if (propertyNamesMatcher !== undefined) {
			for (const key of keys) {
				if (!propertyNamesMatcher(key, seen, depth)) {
					return false
				}
			}
		}
		// min/maxProperties — own enumerable string-key count.
		if (node.minProperties !== undefined && keys.length < node.minProperties) {
			return false
		}
		if (node.maxProperties !== undefined && keys.length > node.maxProperties) {
			return false
		}
		// dependentRequired — if a trigger key is present, all its
		// dependencies must also be own-present.
		if (node.dependentRequired !== undefined) {
			for (const trigger of Object.keys(node.dependentRequired)) {
				if (Object.hasOwn(value, trigger)) {
					const deps = node.dependentRequired[trigger]
					if (deps !== undefined) {
						for (const dep of deps) {
							if (!Object.hasOwn(value, dep)) {
								return false
							}
						}
					}
				}
			}
		}
		// Per-key validation: `properties` first, then `patternProperties`
		// (a key may match several pattern schemas — all must hold), then
		// `additionalProperties` for any key matched by NEITHER.
		for (const key of keys) {
			const child = safeGet(value, key)
			if (child === SAFE_GET_THREW) {
				return false
			}
			let constrained = false
			const propMatcher = propsMatchers.get(key)
			if (propMatcher !== undefined) {
				constrained = true
				if (!propMatcher(child, seen, depth)) {
					return false
				}
			}
			for (const { regExp, matcher } of patternMatchers) {
				if (regExp.test(key)) {
					constrained = true
					if (!matcher(child, seen, depth)) {
						return false
					}
				}
			}
			if (!constrained) {
				if (additional === false || additional === undefined) {
					// Closed object: an unconstrained extra key is rejected
					// ONLY when additionalProperties is explicitly false. An
					// ABSENT additionalProperties is open by JSON-Schema spec.
					if (additional === false) {
						return false
					}
				} else if (additionalMatcher !== undefined && !additionalMatcher(child, seen, depth)) {
					return false
				}
			}
		}
		return true
	})
}

/** Append the composition matchers (`allOf`/`anyOf`/`oneOf`/`not`/if-then-else). */
function compileCompositionKeywords(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	pointerCache: Map<string, SchemaMatcher>,
	matchers: SchemaMatcher[],
): void {
	if (node.allOf !== undefined) {
		const subs = node.allOf.map((sub) => compileNode(sub, resolver, pointerCache))
		matchers.push((value, seen, depth) => subs.every((sub) => sub(value, seen, depth)))
	}
	if (node.anyOf !== undefined) {
		const subs = node.anyOf.map((sub) => compileNode(sub, resolver, pointerCache))
		matchers.push((value, seen, depth) => subs.some((sub) => sub(value, seen, depth)))
	}
	if (node.oneOf !== undefined) {
		// JSON-Schema `oneOf`: valid iff EXACTLY ONE subschema matches
		// (mirrors B4 oneOf-exactly-one in compileGuard's union arm).
		const subs = node.oneOf.map((sub) => compileNode(sub, resolver, pointerCache))
		matchers.push((value, seen, depth) => {
			let count = 0
			for (const sub of subs) {
				if (sub(value, seen, depth)) {
					count += 1
					if (count > 1) {
						return false
					}
				}
			}
			return count === 1
		})
	}
	if (node.not !== undefined) {
		const sub = compileNode(node.not, resolver, pointerCache)
		matchers.push((value, seen, depth) => !sub(value, seen, depth))
	}
	if (node.if !== undefined) {
		// JSON-Schema if/then/else: if `if` matches, `then` must match;
		// otherwise `else` must match. An absent `then`/`else` = pass for
		// that branch (design: standard 2020-12 semantics, documented).
		const ifMatcher = compileNode(node.if, resolver, pointerCache)
		const thenMatcher =
			node.then !== undefined ? compileNode(node.then, resolver, pointerCache) : undefined
		const elseMatcher =
			node.else !== undefined ? compileNode(node.else, resolver, pointerCache) : undefined
		matchers.push((value, seen, depth) => {
			if (ifMatcher(value, seen, depth)) {
				return thenMatcher === undefined || thenMatcher(value, seen, depth)
			}
			return elseMatcher === undefined || elseMatcher(value, seen, depth)
		})
	}
}

// ============================================================================
//  E3 — compileSchemaShape: JSON Schema -> a ContractShape (round-trip bridge)
//
//  E2 (`compileSchemaGuard`) produces a runtime `Guard`. E3 produces a
//  `ContractShape` instead — the round-trip bridge: an EXTERNAL JSON-Schema
//  document flows BACK into the FORWARD pipeline
//  (`compileGuard`/`compileParser`/`compileGenerator`/`compileSchema`/`Infer`
//  via `compileContract`). Built on E1's resolver (one
//  `createRefResolver(root)` per compile call; `$ref` recursion broken via the
//  D3 `lazyShape` lazy/memo-by-pointer contract, exactly mirroring E2's
//  `compileRef`).
//
//  ── Design notes (decisions, with the WHY) ────────────────────────────
//
//  1. BEST-EFFORT STRUCTURAL MAPPING — not a 1:1 isomorphism. The shape DSL
//     (`ContractShape`) is INTENTIONALLY smaller than JSON-Schema 2020-12: it
//     models the keyword subset the forward pipeline can soundly
//     guard/parse/generate/`Infer`. Where a schema uses a keyword the DSL
//     CANNOT express, `compileSchemaShape` maps the structural CORE and OMITS
//     the inexpressible constraint, so the produced shape is strictly LOOSER
//     than the schema (it accepts a superset). This is deliberate, documented,
//     and tested as a KNOWN divergence — never a silent bug. See the
//     "Round-trip fidelity" section below for the exhaustive gap list.
//
//  2. SUPPORTED-SUBSET INVARIANT. For the supported keyword subset,
//     `compileGuard(compileSchemaShape(s))` agrees with `compileSchemaGuard(s)`
//     (E2) on every input, and `compileSchema(compileSchemaShape(s))` is
//     structurally faithful (re-emits an equivalent schema). The supported
//     subset is: `type` (single + array union; `integer`; `null`), `enum`,
//     `const`, `minLength`/`maxLength`/`pattern`, `minimum`/`maximum`,
//     `items`/`prefixItems`(+`items:false`)/`minItems`/`maxItems`,
//     `properties`/`required`/`additionalProperties`, `allOf` (object-only),
//     `anyOf`, `oneOf`, boolean `true`, `$ref`/`$defs` (recursive-safe).
//
//  3. KEYWORD -> SHAPER MAPPING (the full table).
//
//     * `$ref` (any, incl. recursive) -> `lazyShape(() => <target shape>)`,
//       memoized by E1 canonical pointer. A recursive `$ref` yields a FINITE
//       recursive `ContractShape` the forward pipeline's D3 lazy-aware
//       `assertAcyclicShape` + memoized compile handle WITHOUT stack overflow
//       — the EXACT E2 `compileRef` wiring, producing a `lazyShape` instead of
//       a deferred matcher. (DECISION: recursive `$ref` -> `lazyShape` memo.)
//     * boolean `true` -> `rawShape(true)` (accepts anything).
//     * boolean `false` -> §13 COMPILE-time throw. There is no "never"
//       `ContractShape`; `constShape` of an impossible sentinel cannot model
//       "no value", and silently mapping `false` to anything reachable would
//       make the round-trip UNSOUND (accept what the schema forbids). The
//       least-wrong, honest choice is a precise §13 error naming the defect.
//       (DECISION: `false` schema unsupported -> throw.)
//     * `const` -> `constShape(value)` (D4 — structural).
//     * `enum`: ALL members primitive (`string`/`number`/`boolean`) ->
//       `literalShape(...values)`; otherwise (any structural member) ->
//       `unionShape(constShape(m0), constShape(m1), …)` — D4 `const` handles
//       structural members, `literalShape` cannot. A `null` enum member is
//       structural for this purpose (`literalShape` is `string|number|
//       boolean` only), so an enum containing `null` takes the const-union
//       path. (DECISION: enum primitive-vs-structural split.)
//     * `type` SINGLE: `'string'`->`stringShape`, `'number'`->`numberShape`,
//       `'integer'`->`integerShape`, `'boolean'`->`booleanShape`,
//       `'object'`->`objectShape`, `'array'`->`arrayShape`, `'null'`->
//       `constShape(null)` (there is no `nullShape`; `const: null` is the
//       cleanest generic, exactly-`null` mapping and round-trips through
//       `compileSchema` as `{ const: null }`). (DECISION: `type:'null'` ->
//       `constShape(null)`.)
//     * `type` ARRAY (`['string','null']`) -> `unionShape(...per-type
//       shapes)` (`['string','null']` -> `unionShape(stringShape(),
//       constShape(null))`). A single-element type array degrades to the lone
//       per-type shape (a `unionShape` of one is pointless). (DECISION:
//       `type` array -> union.)
//     * string: `minLength`->`min`, `maxLength`->`max`, `pattern`->
//       `new RegExp(pattern)` on `stringShape`. A malformed `pattern` is a
//       §13 COMPILE throw (a defect in the author-controlled schema), exactly
//       as E2's `pattern` arm.
//     * number/integer: `minimum`->`min`, `maximum`->`max` on
//       `numberShape`/`integerShape`. Contradictory bounds (`min>max`) are
//       PASSED THROUGH to the builder, which §13-throws at build (DECISION:
//       defer to `numberShape`'s existing §13 bounds validation — do not
//       duplicate the policy here; the throw is the same precise error a
//       hand-built shape would get).
//     * array: `items` (schema) -> `arrayShape(itemsShape, {min,max})`;
//       `prefixItems` (+ `items:false`, or no `items`) -> `tupleShape(...)`
//       (D1 closed tuple); a bare `type:'array'` with no `items` ->
//       `arrayShape(rawShape(true))` (any element).
//     * object -> `objectShape(propShapes, { additionalProperties })`. A
//       property NOT in `required` -> its shape wrapped in `optionalShape`
//       (this is how object-optionality round-trips through the forward
//       pipeline). `additionalProperties:false` -> CLOSED object; `true`
//       OR ABSENT -> OPEN (`{additionalProperties:true}`) — JSON-Schema
//       semantics: an absent `additionalProperties` imposes no extra-key
//       constraint, and mapping absent->closed would be STRICTER than the
//       schema and disagree with E2; schema -> the sub-shape (typed-open).
//     * composition: `allOf` -> `intersectionShape(...subshapes)` (D2).
//       D2 requires every member be an OBJECT shape (or nested intersection)
//       — see note 4. `anyOf` -> `unionShape(...)`. `oneOf` -> `oneOfShape`
//       (B4 exactly-one).
//
//  4. `allOf` -> `intersectionShape` AND D2's object-only §13 constraint.
//     `intersectionShape` (shapers.ts) throws at build if any member is not
//     an object shape (a non-object intersection has no sound generic
//     parser/generator merge). `compileSchemaShape` does NOT pre-filter or
//     silently fall back: it maps `allOf` straight to `intersectionShape(...)`
//     and lets D2's existing §13 boundary throw if a member maps to a
//     non-object shape. This is deliberate and consistent with note 3's
//     "defer to the builder's §13" policy: the inverse subsystem mirrors E2's
//     keyword decisions AND the forward builders' boundary contracts rather
//     than re-implementing or weakening them. A schema whose `allOf` mixes a
//     primitive member is genuinely unrepresentable as a sound contract — the
//     precise §13 throw names it. (DECISION: `allOf` non-object member -> D2
//     §13 throw, not a silent fallback.)
//
//  5. CONJUNCTION COLLAPSE. JSON-Schema is a keyword CONJUNCTION (E2 design
//     note 1); the shape DSL has only ONE general conjunction
//     (`intersectionShape`, object-only). So when a node mixes a structural
//     keyword with an inexpressible sibling (e.g. `{ type:'string',
//     format:'email' }`, `{ type:'array', items:…, uniqueItems:true }`),
//     `compileSchemaShape` maps the EXPRESSIBLE structural core and DROPS the
//     inexpressible sibling (note 1). The dropped keywords are exactly the
//     "Round-trip fidelity" gap list. (`type` + the matching family's own
//     constraints — `string`+`minLength`, `array`+`items`/`minItems`,
//     `object`+`properties` — are NOT dropped; only cross-family /
//     DSL-inexpressible siblings are.)
//
//  ── Round-trip fidelity (the single authoritative gap list) ────────────
//
//  `compileSchemaShape` is BEST-EFFORT. For the supported subset (note 2)
//  `compileGuard∘compileSchemaShape === compileSchemaGuard` and
//  `compileSchema∘compileSchemaShape` is structurally faithful. The following
//  keywords are NOT representable in the shape DSL; the produced shape OMITS
//  them, so it is strictly LOOSER than the schema (and looser than E2's
//  guard). Each is acceptable, intended, and tested as a KNOWN divergence:
//
//   * `format` — the DSL cannot represent arbitrary `format` semantics.
//     E2 asserts a documented set (`email`/`uuid`/`date-time`/`uri`);
//     `compileSchemaShape` drops ALL `format` assertion. The round-tripped
//     guard accepts a string E2 would reject for a bad `format`.
//   * `exclusiveMinimum`/`exclusiveMaximum` — `numberShape` has only
//     inclusive `min`/`max`; the exclusive bound degrades to UNCONSTRAINED
//     (not to the inclusive bound — that would be a DIFFERENT wrong
//     constraint; omission is the honest "looser" choice). Boundary value
//     accepted.
//   * `multipleOf` — `numberShape` has no divisor option. Dropped; a
//     non-multiple is accepted.
//   * `uniqueItems` — `arrayShape` has no uniqueness option. Dropped;
//     duplicate elements accepted.
//   * `patternProperties` — `objectShape` has no regex-keyed-schema option.
//     Dropped; the object degrades to its `properties`/`additionalProperties`
//     policy only.
//   * `propertyNames` — `objectShape` cannot constrain key strings. Dropped.
//   * `minProperties`/`maxProperties` — `objectShape` has no
//     property-count bound. Dropped.
//   * `not` — the DSL cannot express negation. Dropped (accepts what the
//     negation forbids). A fundamental DSL limitation.
//   * `if`/`then`/`else` — the DSL cannot express conditional application.
//     Dropped. A fundamental DSL limitation.
//   * open-tail `prefixItems` (+ a SCHEMA `items` tail) — `tupleShape` is a
//     CLOSED tuple; an open-tail positional array is unrepresentable. Mapped
//     to the CLOSED tuple of the prefix (the least-wrong representation); the
//     open tail's element typing is dropped.
//   * `contains`/`dependentRequired`/`dependentSchemas`/
//     `unevaluatedProperties` — no DSL representation. Dropped.
//
//  This is the inverse subsystem's documented fidelity contract (E5 owns the
//  end-user guide note that points here).
// ============================================================================

/**
 * A per-compilation map from an E1 canonical `$ref` pointer to the
 * already-built (possibly still-being-built) {@link ContractShape} for that
 * pointer — the D3 `lazyShape`-memo analogue keyed by pointer.
 *
 * @remarks
 * Mirrors E2's `pointerCache` (`Map<string, SchemaMatcher>`): a recursive
 * `$ref` reuses ONE shape per canonical pointer so a recursive schema yields
 * a FINITE recursive shape (a `lazyShape` whose thunk returns the memoized
 * shape) instead of an infinitely-expanded one. AGENTS.md types-first allows
 * a module-local NON-exported impl alias here exactly like E2's
 * `SchemaMatcher` / compilers' `LazyGuardCache`.
 */
type ShapeCache = Map<string, ContractShape>

/**
 * Compile a JSON Schema document into a {@link ContractShape} — the
 * round-trip bridge from an external schema BACK into the forward pipeline
 * (`compileGuard`/`compileParser`/`compileGenerator`/`compileSchema`/`Infer`
 * via `compileContract`).
 *
 * @remarks
 * Best-effort STRUCTURAL mapping. For the supported keyword subset
 * `compileGuard(compileSchemaShape(s))` agrees with `compileSchemaGuard(s)`
 * (E2) and `compileSchema(compileSchemaShape(s))` is structurally faithful;
 * where the shape DSL cannot express a keyword the produced shape is strictly
 * LOOSER (it omits that constraint) — an exhaustive, intended, tested list is
 * in the module's "Round-trip fidelity" section. A recursive `$ref` maps to a
 * `lazyShape` memoized by E1 canonical pointer, so a recursive schema yields
 * a finite recursive shape the forward pipeline handles without stack
 * overflow.
 *
 * Error model (AGENTS.md §13):
 *
 * - A malformed SCHEMA (unresolvable / external / pure-`$ref`-only-cycle /
 *   `MAX_REF_DEPTH`) is a PROGRAMMER ERROR thrown at COMPILE time — E1's
 *   precise `Error`s propagate (fail-fast, mirroring `compileSchemaGuard`).
 * - A boolean `false` schema is UNSUPPORTED (no "never" shape in the DSL) ->
 *   a precise compile-time `Error`.
 * - A keyword whose value the forward builders reject (e.g. contradictory
 *   numeric bounds; a non-object `allOf` member) throws the builder's own
 *   precise §13 `Error` (deferred-to, not duplicated).
 *
 * The produced shape's static `Infer` is `unknown`-ish (a schema's static TS
 * type is not statically known here — pinned in
 * `tests/src/core/types.test-d.ts`).
 *
 * @param schema - The JSON Schema document to map back to a shape
 * @returns A {@link ContractShape} that feeds the forward pipeline
 * @throws Error If the schema contains a malformed `$ref`, is the `false`
 *         boolean schema, or maps to a shape a forward builder §13-rejects
 *
 * @example
 * ```ts
 * const shape = compileSchemaShape({
 *   type: 'object',
 *   properties: { name: { type: 'string', minLength: 1 } },
 *   required: ['name'],
 *   additionalProperties: false,
 * })
 * const contract = compileContract(shape) // schema -> shape -> full contract
 * contract.is({ name: 'Ada' }) // true
 * ```
 */
export function compileSchemaShape(schema: JsonSchema): ContractShape {
	// ONE resolver per compile call (E1 contract). The root is the schema
	// itself — every internal `$ref`/`#`/`$defs` pointer resolves against it.
	const resolver = createRefResolver(schema)
	// D3 memo-by-pointer: a recursive `$ref` reuses ONE built shape.
	const shapeCache: ShapeCache = new Map<string, ContractShape>()
	return shapeFromNode(schema, resolver, shapeCache)
}

/**
 * Map one schema node to a {@link ContractShape}.
 *
 * @remarks
 * A boolean schema is a terminal (`true` -> `rawShape`; `false` -> §13 throw,
 * there is no "never" shape). A `$ref` node is resolved via the D3
 * lazy/memo-by-pointer contract (see {@link shapeFromRef}). Every non-`$ref`
 * object node maps via {@link shapeFromKeywords}.
 */
function shapeFromNode(
	node: JsonSchema,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	if (typeof node === 'boolean') {
		if (node) {
			// `true` schema accepts anything — `rawShape` is the DSL's
			// accept-everything terminal (its guard is always `true`).
			return rawShape(true)
		}
		// `false` schema accepts NOTHING. There is no "never" `ContractShape`;
		// mapping it to any inhabited shape would make the round-trip UNSOUND.
		// Honest §13 throw (module design note 3).
		throw new Error(
			'compileSchemaShape: the `false` boolean schema is unsupported — the shape DSL has no "never" shape to represent a schema that accepts no value',
		)
	}
	if (typeof node.$ref === 'string') {
		return shapeFromRef(node.$ref, resolver, shapeCache)
	}
	return shapeFromKeywords(node, resolver, shapeCache)
}

/**
 * Map a `$ref` position to a recursion-safe {@link ContractShape} (D3
 * `lazyShape` contract — the EXACT mirror of E2's `compileRef`, producing a
 * shape instead of a matcher).
 *
 * @remarks
 * `resolver.lazy(ref)` canonicalises the pointer and reports `cyclic`. A
 * recursive self-reference re-enters this function while the pointer's body
 * is still being built; it then hits the in-progress memo and returns a
 * `lazyShape` whose thunk yields the (eventually-)built shape — the
 * self-reference resolves to ONE shape and the recursion is realised only
 * over finite DATA at guard/parse time (D3). `thunk()` always returns a
 * concrete non-`$ref` node OR throws a precise §13 `Error`
 * (pure-`$ref`-only cycle / external / missing / `MAX_REF_DEPTH`) — that
 * propagates at COMPILE time (fail-fast).
 *
 * EVERY `$ref` is wrapped in a `lazyShape` (recursive or not): a `lazyShape`
 * is the forward pipeline's ONLY sanctioned recursion boundary (D3 —
 * `assertAcyclicShape` treats it as a terminal), so wrapping every `$ref`
 * keeps a recursive schema's shape acyclic-by-construction and never trips
 * the forward §13 cyclic-shape guard. A non-recursive `$ref`'s `lazyShape`
 * resolves one level (the forward pipeline's memoized `'lazy'` arm handles it
 * exactly like the documented non-recursive `lazyShape` case).
 */
function shapeFromRef(
	ref: string,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	const indirection = resolver.lazy(ref)
	const pointer = indirection.pointer
	const cached = shapeCache.get(pointer)
	if (cached !== undefined) {
		// EVERY occurrence of this canonical pointer (the top one AND every
		// recursive back-edge) returns the SAME memoized `lazyShape` node —
		// hence the SAME thunk identity. The forward pipeline's D3 `'lazy'`
		// arm memoizes the compiled artifact BY THUNK IDENTITY, so reusing
		// one stable `lazyShape` per pointer is precisely what makes a
		// recursive `$ref` compile to ONE recursive function (not an infinite
		// one) — the EXACT canonical `lazyShape(() => treeShape)` single-
		// stable-thunk pattern (one thunk, closing over a binding, returning
		// the recursive shape).
		return cached
	}
	// FIRST visit. Build the stable `lazyShape` node and memoize it BEFORE
	// resolving the body, so a recursive self-`$ref` re-entering this function
	// hits the `cached` branch and gets the SAME node back (D3 install-before-
	// compile, mirroring E2's `compileRef`). The body is resolved lazily and
	// memoized in `holder`; the thunk closes over `holder` so its identity is
	// stable across every recursive occurrence and the forward thunk-keyed
	// memo breaks the cycle. `thunk()` returns a concrete node OR throws a
	// precise §13 Error (pure-ref cycle / external / missing) which propagates
	// at compile time (fail-fast, mirrors compileSchemaGuard). It is invoked
	// LAZILY (forward `'lazy'` arm calls the shape thunk on first compile of
	// that boundary), by which point `holder.body` is set.
	const holder: { body: ContractShape | undefined } = { body: undefined }
	const node = lazyShape(() => {
		if (holder.body === undefined) {
			throw new Error(
				`compileSchemaShape: recursive $ref body not resolved for pointer ${pointer}`,
			)
		}
		return holder.body
	})
	shapeCache.set(pointer, node)
	holder.body = shapeFromNode(indirection.thunk(), resolver, shapeCache)
	return node
}

/**
 * Map the keywords of a non-`$ref` object schema node to a
 * {@link ContractShape}.
 *
 * @remarks
 * Dispatch order encodes the keyword PRIORITY when a node mixes keywords (a
 * JSON-Schema conjunction the DSL cannot fully express — module design note
 * 5): `const` -> `enum` -> composition (`allOf`/`oneOf`/`anyOf`) -> `type`.
 * The chosen keyword's family constraints are mapped; cross-family /
 * DSL-inexpressible siblings are dropped per the "Round-trip fidelity" list.
 * An object with no expressible structural keyword maps to `rawShape(true)`
 * (accepts anything — the honest "no constraint we can model" terminal, also
 * exactly E2's behaviour for a constraint-less node).
 */
function shapeFromKeywords(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	// --- const (D4 — a single structural value) -------------------------
	if (node.const !== undefined) {
		return applyDescription(constShape(node.const), node.description)
	}

	// --- enum: all-primitive -> literalShape; else const-union (D4) -----
	if (node.enum !== undefined) {
		return applyDescription(shapeFromEnum(node.enum), node.description)
	}

	// --- composition (object-only intersection / unions) ----------------
	if (node.allOf !== undefined) {
		// `allOf` -> D2 `intersectionShape`. Object-only is enforced by the
		// builder's own §13 (module design note 4) — deferred-to, not
		// duplicated. An empty `allOf` is degenerate -> the builder's §13
		// throw is the precise, correct error.
		const members = node.allOf.map((sub) => shapeFromNode(sub, resolver, shapeCache))
		return applyDescription(intersectionShape(...members), node.description)
	}
	if (node.oneOf !== undefined) {
		// `oneOf` -> B4 exactly-one `oneOfShape`.
		const variants = node.oneOf.map((sub) => shapeFromNode(sub, resolver, shapeCache))
		return applyDescription(oneOfShape(...variants), node.description)
	}
	if (node.anyOf !== undefined) {
		const variants = node.anyOf.map((sub) => shapeFromNode(sub, resolver, shapeCache))
		return applyDescription(unionShape(...variants), node.description)
	}

	// --- type ------------------------------------------------------------
	if (node.type !== undefined) {
		// `Array.isArray` narrows to `any[]`, which does NOT subtract the
		// `readonly JsonSchemaType[]` interface from `JsonSchemaType | readonly
		// JsonSchemaType[]` (the union-narrowing limitation documented in E2's
		// `compileArrayKeywords`). Re-derive the array form into its own
		// explicitly-typed local so the scalar branch stays `as`-free.
		const typeKeyword = node.type
		const typeArray: readonly JsonSchemaType[] | undefined = Array.isArray(typeKeyword)
			? typeKeyword
			: undefined
		if (typeArray !== undefined) {
			return shapeFromTypeArray(typeArray, node, resolver, shapeCache)
		}
		// `typeArray === undefined` ⇒ `typeKeyword` is the scalar form. TS
		// cannot subtract `readonly JsonSchemaType[]` from the union via
		// `Array.isArray` (documented union-narrowing limit), so re-narrow with
		// a `typeof` discriminant: every `JsonSchemaType` is a `string`, an
		// array is `'object'`, so `typeof === 'string'` cleanly isolates the
		// scalar `as`-free.
		if (typeof typeKeyword === 'string') {
			return shapeFromSingleType(typeKeyword, node, resolver, shapeCache)
		}
	}

	// No expressible structural keyword (e.g. `{}`, `{ description }`, or a
	// node carrying ONLY DSL-inexpressible keywords like a bare `not`/`if`).
	// The honest mapping is "accept anything" — `rawShape(true)` — which is
	// also exactly E2's behaviour for a constraint-less node (its conjunction
	// is empty -> `() => true`). Documented fidelity gap for bare
	// `not`/`if` (module "Round-trip fidelity").
	return rawShape(true)
}

/**
 * Map a JSON-Schema `enum` to a {@link ContractShape}.
 *
 * @remarks
 * All members primitive (`string`/`number`/`boolean`) ->
 * `literalShape(...values)` (a `Set`-membership enum). Otherwise (any
 * structural or `null` member) -> `unionShape(constShape(m0), …)` — D4
 * `const` handles structural/`null` members that `literalShape` (typed
 * `string|number|boolean`) cannot. A single-member structural enum still
 * yields a 1-variant `unionShape`; that is harmless (its guard/`Infer` is
 * exactly that one const) and keeps the mapping uniform. Module design note
 * 3.
 */
function shapeFromEnum(members: readonly JsonValue[]): ContractShape {
	const allPrimitive = members.every(
		(m) => typeof m === 'string' || typeof m === 'number' || typeof m === 'boolean',
	)
	if (allPrimitive) {
		// Re-derive the primitive tuple structurally (TS cannot subtract the
		// structural JSON members from `readonly JsonValue[]` without an `as`;
		// the `allPrimitive` check above proves every element is in-bounds, so
		// the filtered copy is sound and `as`-free).
		const primitives: (string | number | boolean)[] = []
		for (const m of members) {
			if (typeof m === 'string' || typeof m === 'number' || typeof m === 'boolean') {
				primitives.push(m)
			}
		}
		// An empty `enum` is a degenerate schema (no value can satisfy it) —
		// `literalShape`'s own §13 throw is the precise, correct error.
		return literalShape(...primitives)
	}
	if (members.length === 0) {
		// Empty enum -> defer to `literalShape`'s §13 (uninhabited).
		return literalShape()
	}
	// Structural / null members -> a union of D4 consts.
	const consts = members.map((m) => constShape(m))
	return unionShape(...consts)
}

/**
 * Map a single JSON-Schema `type` (with its sibling family constraints) to a
 * {@link ContractShape}.
 *
 * @remarks
 * `'null'` -> `constShape(null)` (no `nullShape`; module design note 3).
 * Other primitives carry only their OWN family's expressible constraints;
 * cross-family / DSL-inexpressible siblings are dropped (module "Round-trip
 * fidelity"). `object`/`array` recurse for their children.
 */
function shapeFromSingleType(
	name: JsonSchemaType,
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	switch (name) {
		case 'string':
			// `pattern` -> a flagless RegExp; a malformed pattern is a §13
			// COMPILE-time defect in the author-controlled schema (mirrors E2's
			// `pattern` arm). `format` (a string keyword) is DROPPED (fidelity
			// gap).
			return applyDescription(
				stringShape({
					min: node.minLength,
					max: node.maxLength,
					pattern: node.pattern !== undefined ? new RegExp(node.pattern) : undefined,
				}),
				node.description,
			)
		case 'number':
			// `minimum`/`maximum` -> inclusive `min`/`max`. Contradictory
			// bounds are passed through to `numberShape`'s own §13 validation
			// (deferred-to, module design note 3). `exclusive*`/`multipleOf`
			// DROPPED (fidelity gap).
			return applyDescription(
				numberShape({ min: node.minimum, max: node.maximum }),
				node.description,
			)
		case 'integer':
			return applyDescription(
				integerShape({ min: node.minimum, max: node.maximum }),
				node.description,
			)
		case 'boolean':
			return booleanShape({ description: node.description })
		case 'null':
			// No `nullShape`; `const: null` is the cleanest exactly-`null`
			// generic and round-trips through `compileSchema` as `{const:null}`.
			return constShape(null)
		case 'array':
			return shapeFromArray(node, resolver, shapeCache)
		case 'object':
			return shapeFromObject(node, resolver, shapeCache)
	}
}

/**
 * Map a `type` ARRAY (e.g. `['string','null']`) to a {@link ContractShape}.
 *
 * @remarks
 * Each member type is mapped to its per-type shape (carrying the node's
 * sibling family constraints, same as the single-type path) and the results
 * are combined with `unionShape`. A single-element type array degrades to the
 * lone per-type shape (a 1-variant `unionShape` is pointless). Module design
 * note 3.
 */
function shapeFromTypeArray(
	types: readonly JsonSchemaType[],
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	const variants = types.map((t) => shapeFromSingleType(t, node, resolver, shapeCache))
	const [first, ...rest] = variants
	if (first !== undefined && rest.length === 0) {
		return first
	}
	// `type: []` is degenerate (no type can match) — defer to `unionShape`'s
	// §13 (uninhabited). >=2 variants -> a real union.
	return applyDescription(unionShape(...variants), node.description)
}

/**
 * Map an `array`-typed node to an {@link ArrayShape}/{@link TupleShape}.
 *
 * @remarks
 * `prefixItems` (with `items:false` or no `items`) -> `tupleShape(...)` (D1
 * CLOSED tuple). `prefixItems` + a SCHEMA `items` tail is an OPEN-tail
 * positional array the DSL cannot express -> the CLOSED tuple of the prefix
 * (least-wrong; the tail typing is the documented fidelity gap). A scalar
 * `items` schema -> `arrayShape(itemsShape, {min,max})`. A bare `type:'array'`
 * (no `items`) -> `arrayShape(rawShape(true))` (any element). `items:false`
 * with no prefix -> a max-0 array (only `[]` valid — the faithful
 * closed-empty array). `uniqueItems` DROPPED (fidelity gap).
 */
function shapeFromArray(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	const { items, prefixItems } = node
	// `prefixItems` (2020-12) AND the legacy draft-04 ARRAY form of `items`
	// are the SAME positional-tuple notion; support both (mirrors E2's
	// `compileArrayKeywords` both-forms decision). `Array.isArray` narrows to
	// `any[]` which does not subtract the `readonly JsonSchema[]` interface
	// from the union without an `as` (the documented union-narrowing
	// limitation); re-derive the array form via its own `Array.isArray`.
	const positional: readonly JsonSchema[] | undefined = Array.isArray(items)
		? items
		: prefixItems
	if (positional !== undefined) {
		// CLOSED tuple of the prefix. An open tail (`items` is a SCHEMA, not
		// `false`/absent) cannot be represented — the tail typing is dropped
		// (documented fidelity gap), the closed tuple of the prefix is the
		// least-wrong mapping.
		const elements = positional.map((sub) => shapeFromNode(sub, resolver, shapeCache))
		return applyDescription(tupleShape(...elements), node.description)
	}
	if (items === false) {
		// `items:false` with no prefix forbids ALL elements — only `[]` is
		// valid. A max-0 array is the faithful closed-empty representation.
		return applyDescription(arrayShape(rawShape(true), { max: 0 }), node.description)
	}
	const elementShape: ContractShape =
		items !== undefined && items !== true && isJsonSchema(items)
			? shapeFromNode(items, resolver, shapeCache)
			: rawShape(true)
	return applyDescription(
		arrayShape(elementShape, { min: node.minItems, max: node.maxItems }),
		node.description,
	)
}

/**
 * Map an `object`-typed node to an {@link ObjectShape}.
 *
 * @remarks
 * Each `properties` entry is mapped; a property NOT in `required` is wrapped
 * in `optionalShape` (how object-optionality round-trips the forward
 * pipeline). `additionalProperties`: `false` -> CLOSED object; `true` OR
 * ABSENT -> OPEN object (JSON-Schema semantics: an absent
 * `additionalProperties` imposes NO extra-key constraint — mapping it to
 * closed would be STRICTER than the schema and disagree with E2's
 * `compileSchemaGuard`, whose object arm rejects an unknown key ONLY when
 * `additionalProperties === false`); SCHEMA -> the sub-shape (typed-open).
 * `patternProperties`/`propertyNames`/`min|maxProperties`/`dependentRequired`
 * are DROPPED (fidelity gaps).
 */
function shapeFromObject(
	node: JsonSchemaDefinition,
	resolver: RefResolver,
	shapeCache: ShapeCache,
): ContractShape {
	const required = new Set(node.required ?? [])
	const properties: Record<string, ContractShape> = {}
	if (node.properties !== undefined) {
		for (const key of Object.keys(node.properties)) {
			const sub = node.properties[key]
			if (sub === undefined) {
				continue
			}
			const childShape = shapeFromNode(sub, resolver, shapeCache)
			// A property NOT in `required` -> optional (forward object-optional
			// round-trip semantics: an `optionalShape` property may be absent
			// and `compileSchema` re-emits it as non-`required`).
			properties[key] = required.has(key) ? childShape : optionalShape(childShape)
		}
	}
	const additional = node.additionalProperties
	if (additional === false) {
		// `additionalProperties: false` -> CLOSED object (`objectShape`'s
		// default — reject unknown keys).
		return applyObjectDescription(objectShape(properties), node.description)
	}
	if (additional === undefined || additional === true) {
		// JSON-Schema semantics: an ABSENT `additionalProperties` imposes NO
		// constraint on extra keys (OPEN), exactly like `true`. Mapping absent
		// -> closed would make the round-tripped guard STRICTER than the
		// schema AND disagree with E2's `compileSchemaGuard` (whose object arm
		// rejects an extra key ONLY when `additionalProperties === false`).
		// Both map to an OPEN `objectShape`.
		return applyObjectDescription(
			objectShape(properties, { additionalProperties: true }),
			node.description,
		)
	}
	if (isJsonSchema(additional)) {
		// A SCHEMA `additionalProperties` -> validate every unknown key value
		// against the sub-shape (forward typed-open object).
		const additionalShape = shapeFromNode(additional, resolver, shapeCache)
		return applyObjectDescription(
			objectShape(properties, { additionalProperties: additionalShape }),
			node.description,
		)
	}
	// Unreachable: `additionalProperties` is `boolean | JsonSchema | undefined`
	// and every case is handled above. Closed object is the safe default.
	return applyObjectDescription(objectShape(properties), node.description)
}

/**
 * Re-attach a JSON-Schema `description` annotation onto a built shape that
 * carries an optional `description` field.
 *
 * @remarks
 * The shape DSL kinds that model a `description`
 * (`string`/`number`/`boolean`/`literal`/`const`/`array`/`tuple`/`union`/
 * `intersection`) carry it as a readonly field. The builders called above do
 * not all take a `description` option in the call shape used, so the
 * annotation is merged onto the returned node WITHOUT `as` via a shallow
 * spread copy, set only when present. Kinds with no `description` field
 * (`optional`/`nullable`/`default`/`lazy`/`raw`) pass through unchanged — the
 * annotation has no DSL slot there (documented: a wrapper/raw `description`
 * is dropped, a benign annotation-only loss).
 */
function applyDescription(shape: ContractShape, description: string | undefined): ContractShape {
	if (description === undefined) {
		return shape
	}
	switch (shape.type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'literal':
		case 'const':
		case 'array':
		case 'tuple':
		case 'union':
		case 'intersection':
			return { ...shape, description }
		default:
			// `optional`/`nullable`/`default`/`lazy`/`raw`/`object` handled
			// elsewhere or have no `description` slot — annotation dropped
			// (benign, documented).
			return shape
	}
}

/** {@link applyDescription} specialised for the `object` kind. */
function applyObjectDescription(
	shape: ContractShape,
	description: string | undefined,
): ContractShape {
	if (description === undefined || shape.type !== 'object') {
		return shape
	}
	return { ...shape, description }
}
