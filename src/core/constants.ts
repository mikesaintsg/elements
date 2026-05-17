// ============================================================================
//  @elements/core — centralized constants (§5).
//
//  The leaf module of the package: it imports NOTHING from its siblings, so
//  it can never participate in an import cycle. Every value here is a static
//  UPPER_SNAKE_CASE literal extracted verbatim from its former module-local
//  home; the rationale that used to live as a prose comment beside each
//  declaration now lives as TSDoc on the exported binding.
//
//  The recursion-depth ceiling `MAX_RECURSION_DEPTH` is the single shared
//  stack-safety backstop for both recursions that need one (the recursive
//  JSON-value / JSON-schema walks in `validators.ts` and the lazy-data walk
//  in `compilers.ts`). Each was independently measured to overflow the native
//  stack well above 1000; they collapse to one constant because the
//  conservative safe ceiling is identical for both — see its TSDoc for the
//  per-recursion rationale.
// ============================================================================

// === Recursion-depth ceiling ================================================

/**
 * Single shared stack-safety ceiling for every recursive walk in the package
 * that needs a secondary depth backstop. Two distinct recursions consume it:
 *
 * 1. the recursive JSON-value / JSON-schema walks in `isJsonValueInner` /
 *    `isJsonSchemaInner` (`validators.ts`);
 * 2. the lazy-recursion DATA walk in the compiled `'lazy'` arm
 *    (`compilers.ts`) — only `lazy` re-entries increment depth, so
 *    non-recursive nested shapes are unaffected.
 *
 * @remarks
 * In both of these sites a precise cycle detector — a per-call/-compilation
 * `WeakSet` ancestor path — already terminates every TRUE cycle. This cap is
 * purely the SECONDARY stack-overflow backstop for the residual case those
 * detectors structurally cannot catch: a pathologically deep BUT acyclic
 * structure (no repeated reference). Exceeding the cap converts that
 * pathological depth into a graceful outcome instead of a native `RangeError`:
 * a `false` return for the validator and compiled guard walks (the produced
 * guard/parser must never throw, §13).
 *
 * Both recursions were each measured separately and each empirically
 * overflows the native stack well above 1000 — the JSON-value walk overflows
 * the Node stack at a measured depth of ~4,650; the lazy-recursion data walk
 * overflows V8's stack at a measured lazy-recursion depth of ~2,900 in the
 * test runner (each lazy level costs several real frames). A
 * caller/test-runner has already consumed part of the stack before either of
 * these guards is entered, so the true safe ceiling is lower than the
 * bare-overflow figure in each case. A single shared ceiling of `1_000` is
 * the conservative backstop for both of them: it sits several-fold below the
 * lowest measured bare-overflow point (ample margin even with a pre-consumed
 * stack) while remaining orders of magnitude above any legitimate input —
 * real schemas/documents nest a handful to low-tens of levels, real recursive
 * documents a handful to low-hundreds of lazy levels — so it never
 * false-rejects genuine input.
 */
export const MAX_RECURSION_DEPTH = 1_000

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
