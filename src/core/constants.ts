// ============================================================================
//  @elements/core — centralized constants (§5).
//
//  The leaf module of the package: it imports NOTHING from its siblings, so
//  it can never participate in an import cycle. Every value here is a static
//  UPPER_SNAKE_CASE literal extracted verbatim from its former module-local
//  home; the rationale that used to live as a prose comment beside each
//  declaration now lives as TSDoc on the exported binding.
//
//  The four recursion-depth ceilings (`MAX_JSON_DEPTH`, `MAX_LAZY_DATA_DEPTH`,
//  `MAX_REF_DEPTH`, `MAX_DATA_DEPTH`) are INTENTIONALLY four separate exports
//  even though they share the value `1_000`: each is an independently-measured
//  stack-safety ceiling for a DIFFERENT recursion (JSON-value walk, lazy-data
//  walk, `$ref`-chain resolution, compiled-schema data walk). Their equality
//  today is incidental — unifying them is a deliberate, separate decision, not
//  a deduplication this file makes.
// ============================================================================

// === Recursion-depth ceilings ===============================================

/**
 * Stack-safety ceiling for the recursive JSON-value walk in
 * {@link isJsonValueInner} (`validators.ts`).
 *
 * @remarks
 * Precise cycle detection (the per-call `WeakSet` ancestor path) already
 * terminates every TRUE cycle; this cap is the secondary stack-overflow
 * backstop that defends a pathologically deep BUT acyclic graph the WeakSet
 * cannot catch (no repeated reference) yet would still overflow the native
 * stack. Chosen empirically: the worker's real stack frame overflows the Node
 * stack at a measured depth of ~4,650, and a caller/test-runner has already
 * consumed part of the stack before the guard is entered, so the true safe
 * ceiling is lower still. `1_000` sits ~4.6x below the bare overflow point
 * (ample margin even with a pre-consumed stack) while remaining far above any
 * legitimate JSON (real schemas/documents nest a handful to low-tens of
 * levels), so it never false-rejects genuine input — it only converts a
 * pathological depth into a `false` return instead of a thrown `RangeError`
 * (§13).
 */
export const MAX_JSON_DEPTH = 1_000

/**
 * Stack-safety ceiling for the lazy-recursion DATA walk in the compiled
 * `'lazy'` arm (`compilers.ts`).
 *
 * @remarks
 * The per-compilation `ancestors` `WeakSet` already terminates every TRUE data
 * cycle; this cap only defends a pathologically deep BUT acyclic recursive
 * value (no repeated reference) that would still overflow the native stack —
 * exceeding it converts that into a `false`/`undefined` return (§13) instead
 * of a thrown `RangeError`. It bounds ONLY lazy-recursion depth (each lazy
 * re-entry increments it). Measured the same way as {@link MAX_JSON_DEPTH}: a
 * deep acyclic recursive-lazy linked list overflows V8's native stack at a
 * measured lazy-recursion depth of ~2,900 in the test runner (each lazy level
 * costs several real frames), and a caller/runner has already consumed part of
 * the stack first. `1_000` sits ~2.9x below that bare overflow (ample margin)
 * while remaining far above any legitimate recursive document (a handful to
 * low-hundreds of lazy levels), so it never false-rejects genuine input. A
 * true cycle is caught by the ancestor `WeakSet` long before this bound.
 */
export const MAX_LAZY_DATA_DEPTH = 1_000

/**
 * Stack-safety ceiling for a single `$ref`-chain resolution in the inverse
 * (schema → guard) subsystem (`schema.ts`) — the analogue of
 * {@link MAX_JSON_DEPTH}.
 *
 * @remarks
 * True cycles are caught precisely by the ancestor-pointer set; this cap only
 * converts a pathologically long ACYCLIC chain into a precise §13 `Error`
 * (naming the chain) instead of a native stack overflow. `1_000` sits far
 * below any stack-overflow point while remaining orders of magnitude above any
 * legitimate schema's `$ref` indirection depth (real schemas chain a handful
 * of refs), so it never false-rejects genuine input. The value is interpolated
 * into the thrown error message at its consumer site.
 */
export const MAX_REF_DEPTH = 1_000

/**
 * Stack-safety ceiling for the recursive DATA walk a compiled schema guard
 * performs (`schema.ts`) — the inverse-subsystem analogue of
 * {@link MAX_JSON_DEPTH}.
 *
 * @remarks
 * The ancestor set catches every true cycle precisely; this cap only converts
 * a pathologically deep but ACYCLIC input into a `false` return instead of a
 * native stack overflow (§13 — the produced guard must never throw). `1_000`
 * sits far below any stack-overflow point yet orders of magnitude above any
 * legitimate JSON document's nesting.
 */
export const MAX_DATA_DEPTH = 1_000

/**
 * Lazy-RECURSION depth bound for the FU4 value generator's `'lazy'` arm
 * (`compilers.ts`).
 *
 * @remarks
 * A recursive lazy shape's generator can recurse forever (an infinite tree).
 * Below this bound a lazy node resolves and generates its inner normally (so
 * the output varies and is deep enough to exercise the recursion); at/past the
 * bound the lazy node collapses to the resolved shape's MINIMAL INHABITANT,
 * which still satisfies the guard and is constant for a given shape (so
 * `generator∘guard` holds and determinism is preserved). A depth of `3`
 * produces a pleasantly-nested-but-finite recursive value — a realistic,
 * varied fixture while keeping the value and generation time bounded. It is
 * the lazy-recursion depth, not total shape depth: only `lazy` nodes increment
 * it, so non-recursive nested shapes are unaffected.
 */
export const MAX_LAZY_DEPTH = 3

/**
 * Retry bound for the FU4 value generator's `oneOf` arm (`compilers.ts`).
 *
 * @remarks
 * A JSON-Schema `oneOf` is valid iff a value matches EXACTLY ONE variant. When
 * variants are disjoint, a value generated from any single variant matches
 * only that one (one attempt always succeeds); when they overlap, a generated
 * candidate may satisfy ≥2 variants and the `oneOf` guard correctly rejects
 * it. The generator generates a candidate, tests it against the compiled
 * `oneOf` guard, and — driven by the same seeded PRNG so the retry stays
 * reproducible per seed — retries up to this bound. For any `oneOf` with a
 * non-empty exactly-one region this makes a miss astronomically unlikely (a
 * region covering 10% of draws fails all 64 attempts with probability
 * 0.9^64 ≈ 1.2e-3; 25% ≈ 1e-8; the realistic disjoint case is ≈100%,
 * succeeding on attempt 1). `64` is the smallest power of two that comfortably
 * clears realistic overlap regimes while keeping the worst case (a
 * deliberately unsatisfiable `oneOf`) bounded so it fails fast into a precise
 * §13 `Error` rather than spinning.
 */
export const MAX_ONEOF_ATTEMPTS = 64

// === Cyclic-shape guard message =============================================

/**
 * Error message thrown by `assertAcyclicShape` (`compilers.ts`) when a
 * `ContractShape` tree contains a structural back-edge.
 *
 * @remarks
 * A cyclic shape built WITHOUT a lazy/deferred wrapper is a PROGRAMMER ERROR
 * (§13 — invalid arguments → throw `Error`), not an external/optional
 * condition. Each public compiler validates the tree is acyclic once, up
 * front, and fails fast with this precise message that names the defect and
 * points at the fix — never a bare `RangeError`.
 */
export const CYCLIC_SHAPE_MESSAGE = 'cyclic ContractShape: use a lazy/deferred shape for recursion'

// === Structured JSON-Schema keyword set =====================================

/**
 * JSON-Schema keywords whose value is STRUCTURALLY validated by the
 * per-keyword checks in `isJsonSchemaInner` (`validators.ts`).
 *
 * @remarks
 * The trailing "unrecognized keys" sweep skips exactly these so it never
 * re-walks an already-validated keyword. Correctness is preserved: the
 * structured checks fully validate these keywords (more strictly than a plain
 * JSON-value pass would — a sub-schema must be a schema, not merely any JSON
 * value), and the scoped sweep still JSON-validates every OTHER (unrecognized
 * / annotation / custom `x-*`) key so a non-JSON value at an unknown key is
 * still rejected.
 */
export const STRUCTURED_SCHEMA_KEYWORDS: ReadonlySet<string> = new Set([
	'type',
	'properties',
	'patternProperties',
	'dependentSchemas',
	'$defs',
	'required',
	'dependentRequired',
	'additionalProperties',
	'unevaluatedProperties',
	'propertyNames',
	'items',
	'prefixItems',
	'contains',
	'anyOf',
	'oneOf',
	'allOf',
	'not',
	'if',
	'then',
	'else',
	'enum',
	'const',
	'default',
	'examples',
])

// === Known `format` keyword matchers ========================================

/**
 * Syntactic best-effort matcher for the `email` `format` keyword
 * (`schema.ts`). See schema.ts design note 5.
 */
export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Syntactic best-effort matcher for the `uuid` `format` keyword
 * (`schema.ts`). The `i` flag accepts upper-case hex. See schema.ts design
 * note 5.
 */
export const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Syntactic best-effort matcher for the `uri` `format` keyword (`schema.ts`).
 *
 * @remarks
 * RFC 3986 absolute-URI shape: `scheme:` then a non-empty, no-whitespace
 * remainder. Deliberately conservative — the core build's lib is `ESNext`
 * only (no DOM/Node `URL` constructor) and `format` is annotation-first
 * anyway (schema.ts design note 5). `scheme` is
 * `ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )`; the `i` flag makes it
 * case-insensitive.
 */
export const URI_FORMAT = /^[a-z][a-z0-9+.-]*:\S+$/i
