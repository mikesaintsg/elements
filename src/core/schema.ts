import type { JsonSchema, JsonSchemaDefinition, LazyRef, RefResolver } from './types.js'
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
 * `seenChain` set is the per-CALL set of pointers visited while following
 * THIS chain (distinct from the ancestor set used for recursion detection):
 * a `$ref` chain that loops purely through `$ref`s (`A.$ref=#/$defs/B`,
 * `B.$ref=#/$defs/A`, no body between) is itself a cycle and is broken
 * here (returning the first repeated pointer as canonical). `depth` is the
 * `MAX_REF_DEPTH` backstop for a long ACYCLIC chain.
 */
function canonicalize(root: JsonSchema, pointer: string): { pointer: string; node: JsonSchema } {
	let currentPointer = pointer === '' ? '#' : pointer
	let node = resolveRef(root, currentPointer)
	const seenChain = new Set<string>([currentPointer])
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
		if (seenChain.has(nextRef)) {
			// Pure `$ref`-only loop (no body between hops). The chain has no
			// concrete target; the canonical pointer is the repeated node —
			// the consumer's cycle handling (via `lazy`) takes over from here.
			return { pointer: nextRef, node: resolveRef(root, nextRef) }
		}
		seenChain.add(nextRef)
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
 *   concrete (non-`$ref`) target. Use for finite, non-recursive positions.
 *   Throws (§13) on an unresolvable/external pointer or a non-cyclic chain
 *   exceeding `MAX_REF_DEPTH`.
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
 *   `thunk()` is idempotent and always terminates: it returns the resolved
 *   target by pointer, never by re-entering a body. Recursion is realised
 *   only over the finite DATA at guard/parse time, exactly like the D3
 *   `'lazy'` compiler arm.
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
