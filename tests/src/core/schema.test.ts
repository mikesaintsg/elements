// ============================================================================
//  @elements/core — INVERSE subsystem (E1): JSON-Schema `$ref`/`$defs`
//  resolver. This is the inverse-subsystem test file; the `src:core` Vitest
//  project collects `tests/src/core/**/*.test.ts` (see `vite.config.ts` →
//  `srcCore`). E2 (schema→guard), E3 (schema→shape), E4 (schema→parser) will
//  add their own `describe` blocks here against the SAME resolver.
//
//  Documented contract under test (mirrors the resolver's TSDoc):
//
//   * `resolveRef(root, pointer)` — resolve ONE RFC-6901 JSON Pointer
//     (`#`, `#/$defs/X`, `#/properties/a/items`, …) against `root`.
//     Unescaping order is `~1`→`/` then `~0`→`~` (so `~01` → `~1`, never
//     `/`). A missing pointer is a §13 PROGRAMMER ERROR → precise `throw`.
//     A non-`#`-local (external) `$ref` is UNSUPPORTED → precise `throw`.
//   * `createRefResolver(root)` — a cycle-safe resolver closure E2–E4
//     consume. `.resolve(ref)` follows a `$ref` chain to a non-`$ref`
//     target. `.lazy(ref)` returns a `{ resolved, thunk }` indirection so a
//     RECURSIVE `$ref` (`#/$defs/Node` → itself) yields a recursive — not
//     infinite — resolution a downstream compiler turns into a recursive
//     guard, exactly like D3 `lazyShape`. A pointer chain longer than
//     `MAX_RECURSION_DEPTH` (the shared package-wide stack-safety ceiling)
//     throws precisely.
// ============================================================================

import { describe, expect, it } from 'vitest'
import type { ContractShape, JsonSchema } from '@elements/core'
import {
	arrayShape,
	booleanShape,
	compileGuard,
	compileParser,
	compileSchema,
	compileSchemaGuard,
	compileSchemaParser,
	compileSchemaShape,
	constShape,
	createRefResolver,
	integerShape,
	defaultShape,
	isJsonSchema,
	isRecord,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	resolveRef,
	stringShape,
	tupleShape,
	unionShape,
} from '@elements/core'
import {
	POLLUTION_KEYS,
	assertNoPrototypePollution,
	assertParseGuardSymmetry,
	assertGeneratorSatisfiesGuard,
	makeCyclicArray,
	makeCyclicObject,
	makeCyclicShape,
} from './_helpers.js'

// === resolveRef — single-pointer RFC-6901 resolution

describe('resolveRef — single JSON Pointer', () => {
	it('root `#` returns the document itself', () => {
		const root: JsonSchema = { type: 'object', properties: { a: { type: 'string' } } }
		expect(resolveRef(root, '#')).toBe(root)
	})

	it('empty pointer `` (no leading #) also resolves the root', () => {
		const root: JsonSchema = { type: 'string' }
		expect(resolveRef(root, '')).toBe(root)
	})

	it('simple `#/$defs/X`', () => {
		const node: JsonSchema = { type: 'string' }
		const root: JsonSchema = { $defs: { X: node } }
		expect(resolveRef(root, '#/$defs/X')).toBe(node)
	})

	it('legacy `#/definitions/X` resolves identically', () => {
		const node: JsonSchema = { type: 'integer' }
		const root: JsonSchema = { definitions: { X: node } } as JsonSchema
		expect(resolveRef(root, '#/definitions/X')).toBe(node)
	})

	it('nested `#/properties/a/items`', () => {
		const items: JsonSchema = { type: 'number' }
		const root: JsonSchema = {
			type: 'object',
			properties: { a: { type: 'array', items } },
		}
		expect(resolveRef(root, '#/properties/a/items')).toBe(items)
	})

	it('deeply-nested pointer', () => {
		const leaf: JsonSchema = { type: 'boolean' }
		const root: JsonSchema = {
			type: 'object',
			properties: {
				a: {
					type: 'object',
					properties: {
						b: { type: 'array', items: { type: 'object', properties: { c: leaf } } },
					},
				},
			},
		}
		expect(resolveRef(root, '#/properties/a/properties/b/items/properties/c')).toBe(leaf)
	})

	it('boolean schema TARGET resolves (a `true` sub-schema)', () => {
		const root: JsonSchema = { type: 'object', properties: { open: true } }
		expect(resolveRef(root, '#/properties/open')).toBe(true)
	})

	it('boolean schema ROOT — `#` resolves to the boolean', () => {
		expect(resolveRef(false, '#')).toBe(false)
		expect(resolveRef(true, '#')).toBe(true)
	})

	it('numeric token indexes into an array (`prefixItems/0`)', () => {
		const first: JsonSchema = { type: 'string' }
		const root: JsonSchema = { type: 'array', prefixItems: [first, { type: 'number' }] }
		expect(resolveRef(root, '#/prefixItems/0')).toBe(first)
		expect(resolveRef(root, '#/prefixItems/1')).toEqual({ type: 'number' })
	})
})

// === RFC-6901 escaping — order matters

describe('resolveRef — `~0`/`~1` token unescaping', () => {
	it('`~1` decodes to `/` (a key literally containing a slash)', () => {
		const target: JsonSchema = { type: 'string' }
		const root: JsonSchema = { $defs: { 'a/b': target } }
		expect(resolveRef(root, '#/$defs/a~1b')).toBe(target)
	})

	it('`~0` decodes to `~` (a key literally containing a tilde)', () => {
		const target: JsonSchema = { type: 'number' }
		const root: JsonSchema = { $defs: { 'a~b': target } }
		expect(resolveRef(root, '#/$defs/a~0b')).toBe(target)
	})

	it('`~01` decodes to `~1` (NOT `/`) — unescape order is ~1 then ~0', () => {
		// If order were wrong (~0 first → `~1`, then ~1 → `/`) this key would
		// be `a/1`; the correct order (~1 first, then ~0) yields `a~1`.
		const correct: JsonSchema = { type: 'boolean' }
		const root: JsonSchema = { $defs: { 'a~1': correct, 'a/1': { type: 'string' } } }
		expect(resolveRef(root, '#/$defs/a~01')).toBe(correct)
	})

	it('percent-decodes a URI-fragment token (`%20` → space)', () => {
		const target: JsonSchema = { type: 'string' }
		const root: JsonSchema = { $defs: { 'a b': target } }
		expect(resolveRef(root, '#/$defs/a%20b')).toBe(target)
	})
})

// === §13 — missing pointer is a PROGRAMMER ERROR (precise throw)

describe('resolveRef — missing pointer (§13 throw)', () => {
	it('unresolvable `#/$defs/Nope` throws naming the pointer', () => {
		const root: JsonSchema = { $defs: { X: { type: 'string' } } }
		expect(() => resolveRef(root, '#/$defs/Nope')).toThrow(/#\/\$defs\/Nope/)
	})

	it('descending through a non-object/non-array token throws', () => {
		const root: JsonSchema = { type: 'string' }
		expect(() => resolveRef(root, '#/properties/a')).toThrow(/#\/properties\/a/)
	})

	it('out-of-range array index throws', () => {
		const root: JsonSchema = { type: 'array', prefixItems: [{ type: 'string' }] }
		expect(() => resolveRef(root, '#/prefixItems/5')).toThrow(/#\/prefixItems\/5/)
	})
})

// === §13 — external / non-local `$ref` is UNSUPPORTED (precise throw)

describe('resolveRef — external $ref unsupported (§13 throw)', () => {
	it('`https://x/y#/z` throws "external $ref unsupported"', () => {
		const root: JsonSchema = { type: 'object' }
		expect(() => resolveRef(root, 'https://x/y#/z')).toThrow(/external \$ref unsupported/)
	})

	it('`other.json#/A` (relative external) throws', () => {
		const root: JsonSchema = { type: 'object' }
		expect(() => resolveRef(root, 'other.json#/A')).toThrow(/external \$ref unsupported/)
	})

	it('the unsupported ref string is named in the message', () => {
		const root: JsonSchema = { type: 'object' }
		expect(() => resolveRef(root, 'https://x/y#/z')).toThrow(/https:\/\/x\/y#\/z/)
	})
})

// === createRefResolver — cycle-safe resolver closure for E2–E4

describe('createRefResolver — resolve()', () => {
	it('follows a `$ref` chain to a concrete (non-$ref) target', () => {
		const root: JsonSchema = {
			$defs: {
				A: { $ref: '#/$defs/B' },
				B: { type: 'string', minLength: 1 },
			},
			$ref: '#/$defs/A',
		}
		const resolver = createRefResolver(root)
		expect(resolver.resolve('#/$defs/A')).toEqual({ type: 'string', minLength: 1 })
	})

	it('a non-$ref schema resolves to itself', () => {
		const root: JsonSchema = { $defs: { X: { type: 'number' } } }
		const resolver = createRefResolver(root)
		expect(resolver.resolve('#/$defs/X')).toEqual({ type: 'number' })
	})

	it('the resolver exposes the root it was built from', () => {
		const root: JsonSchema = { type: 'object' }
		expect(createRefResolver(root).root).toBe(root)
	})
})

// === createRefResolver — recursive `$ref` is cycle-safe (the E2 contract)

describe('createRefResolver — recursive $ref (cycle-safe)', () => {
	// A genuinely self-referential schema: `Node.properties.next.$ref`
	// points back at `#/$defs/Node`. A NAIVE recursive resolver that eagerly
	// follows every `$ref` would recurse forever on this and stack-overflow.
	function makeRecursiveRoot(): JsonSchema {
		return {
			$defs: {
				Node: {
					type: 'object',
					properties: {
						value: { type: 'string' },
						next: { $ref: '#/$defs/Node' },
					},
				},
			},
			$ref: '#/$defs/Node',
		}
	}

	it('lazy() on a self-referential `$ref` does NOT stack-overflow', () => {
		const resolver = createRefResolver(makeRecursiveRoot())
		// This call would never return for a naive eager resolver.
		const indirection = resolver.lazy('#/$defs/Node')
		expect(typeof indirection.thunk).toBe('function')
		// The thunk yields the resolved target schema; invoking it again must
		// also terminate (the back-edge is broken by the indirection).
		const once = indirection.thunk()
		const twice = indirection.thunk()
		expect(once).toBe(twice)
		expect(isJsonSchema(once)).toBe(true)
	})

	it('walking the recursive schema via lazy() terminates (finite walk)', () => {
		const resolver = createRefResolver(makeRecursiveRoot())
		// Mirror exactly how E2 builds a recursive guard: resolve the named
		// def, descend into its recursive child, and follow the back-edge
		// through `lazy()` — which MUST return without re-entering forever.
		const node = resolver.resolve('#/$defs/Node')
		expect(typeof node).not.toBe('boolean')
		if (typeof node === 'boolean') throw new Error('unreachable')
		const next = node.properties?.['next']
		expect(next).toBeDefined()
		if (next === undefined || typeof next === 'boolean') throw new Error('unreachable')
		// `next` is a bare `{ $ref: '#/$defs/Node' }` — following it lazily
		// must yield an indirection back to the SAME Node, not recurse.
		const back = resolver.lazy(next.$ref ?? '')
		const resolvedBack = back.thunk()
		expect(resolvedBack).toBe(resolver.resolve('#/$defs/Node'))
	})

	it('lazy() marks whether the target was reached through a cycle', () => {
		const resolver = createRefResolver(makeRecursiveRoot())
		const first = resolver.lazy('#/$defs/Node')
		// First visit: not (yet) a back-edge.
		expect(first.cyclic).toBe(false)
		// Re-entering the SAME pointer while it is still on the resolution
		// path is the recursive back-edge E2 compiles into a recursive guard.
		const again = resolver.lazy('#/$defs/Node')
		expect(again.cyclic).toBe(true)
	})

	it('mutually-recursive `$ref` (A→B→A) is cycle-safe', () => {
		const root: JsonSchema = {
			$defs: {
				A: { type: 'object', properties: { b: { $ref: '#/$defs/B' } } },
				B: { type: 'object', properties: { a: { $ref: '#/$defs/A' } } },
			},
		}
		const resolver = createRefResolver(root)
		const a = resolver.lazy('#/$defs/A')
		const b = resolver.lazy('#/$defs/B')
		expect(isJsonSchema(a.thunk())).toBe(true)
		expect(isJsonSchema(b.thunk())).toBe(true)
		// Following A→B→A through lazy() must terminate.
		const bSchema = b.thunk()
		if (typeof bSchema === 'boolean') throw new Error('unreachable')
		const backToA = resolver.lazy(bSchema.properties?.['a'] !== undefined
			&& typeof bSchema.properties['a'] !== 'boolean'
			? bSchema.properties['a'].$ref ?? ''
			: '')
		expect(backToA.thunk()).toBe(resolver.resolve('#/$defs/A'))
	})
})

// === createRefResolver — pure-$ref-only cycle detection (§13 honest contract)

describe('createRefResolver — pure-$ref-only cycle (no concrete body) throws precisely', () => {
	// A pure-$ref-only 2-cycle: A.$ref→B, B.$ref→A — neither has a concrete
	// (non-$ref) body. The chain can NEVER reach a concrete schema; the
	// resolver MUST throw a precise §13 Error naming the cycle rather than
	// silently returning a still-unresolved `{ $ref: … }` node (which would
	// make the public contract FALSE for that input).
	function makePureRef2Cycle(): JsonSchema {
		return {
			$defs: {
				A: { $ref: '#/$defs/B' },
				B: { $ref: '#/$defs/A' },
			},
		}
	}

	// A pure-$ref-only 3-cycle: A→B→C→A, no concrete bodies anywhere.
	function makePureRef3Cycle(): JsonSchema {
		return {
			$defs: {
				A: { $ref: '#/$defs/B' },
				B: { $ref: '#/$defs/C' },
				C: { $ref: '#/$defs/A' },
			},
		}
	}

	it('2-cycle: resolve() throws a precise Error naming the cycle', () => {
		const resolver = createRefResolver(makePureRef2Cycle())
		expect(() => resolver.resolve('#/$defs/A')).toThrow(/circular \$ref/i)
	})

	it('2-cycle: resolve() does NOT throw a RangeError (not a stack overflow)', () => {
		const resolver = createRefResolver(makePureRef2Cycle())
		expect(() => resolver.resolve('#/$defs/A')).not.toThrow(RangeError)
	})

	it('2-cycle: resolve() message names the offending pointer(s)', () => {
		const resolver = createRefResolver(makePureRef2Cycle())
		expect(() => resolver.resolve('#/$defs/A')).toThrow(/#\/\$defs\/[AB]/)
	})

	it('2-cycle: resolve() throws rather than returning a $ref-containing node', () => {
		// A pure-$ref-only cycle ALWAYS throws — the contract guarantees a
		// concrete node/boolean or an Error, never a still-unresolved $ref node.
		const resolver = createRefResolver(makePureRef2Cycle())
		expect(() => resolver.resolve('#/$defs/A')).toThrow(Error)
	})

	it('3-cycle: resolve() throws a precise Error naming the cycle', () => {
		const resolver = createRefResolver(makePureRef3Cycle())
		expect(() => resolver.resolve('#/$defs/A')).toThrow(/circular \$ref/i)
	})

	it('3-cycle: resolve() message names the offending pointer(s)', () => {
		const resolver = createRefResolver(makePureRef3Cycle())
		expect(() => resolver.resolve('#/$defs/A')).toThrow(/#\/\$defs\/[ABC]/)
	})

	it('2-cycle: lazy().thunk() throws a precise Error naming the cycle', () => {
		const resolver = createRefResolver(makePureRef2Cycle())
		// lazy() itself canonicalizes and thus detects the cycle at thunk-call time
		expect(() => {
			const ref = resolver.lazy('#/$defs/A')
			ref.thunk()
		}).toThrow(/circular \$ref/i)
	})

	it('3-cycle: lazy().thunk() throws a precise Error naming the cycle', () => {
		const resolver = createRefResolver(makePureRef3Cycle())
		expect(() => {
			const ref = resolver.lazy('#/$defs/B')
			ref.thunk()
		}).toThrow(/circular \$ref/i)
	})

	// ── Boundary: a chain that DOES reach a concrete body must NOT throw ───

	it('a $ref chain that reaches a concrete body resolves — no over-throw', () => {
		// A.$ref→B, B = {type:'string'} — concrete reached, must resolve fine
		const root: JsonSchema = {
			$defs: {
				A: { $ref: '#/$defs/B' },
				B: { type: 'string' },
			},
		}
		const resolver = createRefResolver(root)
		expect(() => resolver.resolve('#/$defs/A')).not.toThrow()
		expect(resolver.resolve('#/$defs/A')).toEqual({ type: 'string' })
	})

	it('A→B→C where C is concrete resolves — no over-throw', () => {
		const root: JsonSchema = {
			$defs: {
				A: { $ref: '#/$defs/B' },
				B: { $ref: '#/$defs/C' },
				C: { type: 'number' },
			},
		}
		const resolver = createRefResolver(root)
		expect(() => resolver.resolve('#/$defs/A')).not.toThrow()
		expect(resolver.resolve('#/$defs/A')).toEqual({ type: 'number' })
	})
})

// === createRefResolver — depth backstop (`MAX_RECURSION_DEPTH`)

describe('createRefResolver — pathological non-cyclic ref chain', () => {
	it('a `$ref` chain longer than the depth bound throws precisely', () => {
		// Build a long acyclic chain Rn → R(n-1) → … → R0 (a leaf). No
		// repeated pointer, so cycle detection cannot fire — only the
		// MAX_RECURSION_DEPTH backstop converts this into a precise throw rather
		// than a native stack overflow.
		const defs: Record<string, JsonSchema> = { R0: { type: 'string' } }
		for (let i = 1; i <= 5000; i += 1) {
			defs[`R${i}`] = { $ref: `#/$defs/R${i - 1}` }
		}
		const root: JsonSchema = { $defs: defs }
		const resolver = createRefResolver(root)
		expect(() => resolver.resolve('#/$defs/R5000')).toThrow(/depth|\$ref chain/i)
	})
})

// === Constructed test docs are real JSON-Schema-valid documents

describe('schema.test fixtures are isJsonSchema-valid', () => {
	it('the recursive-Node root is a valid JSON Schema', () => {
		const root: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: { value: { type: 'string' }, next: { $ref: '#/$defs/Node' } },
				},
			},
			$ref: '#/$defs/Node',
		}
		expect(isJsonSchema(root)).toBe(true)
	})
})

// ============================================================================
//  E2 — compileSchemaGuard: JSON Schema -> runtime Guard<unknown>
//
//  Documented contract under test:
//
//   * `compileSchemaGuard(schema)` turns a JSON-Schema document into a
//     runtime predicate. A schema is a CONJUNCTION of its keywords (all
//     present constraints must hold). Absent keyword = no constraint.
//   * The produced guard NEVER throws (§13) — hostile/cyclic/getter-throwing
//     input returns `false`, never a thrown error.
//   * Malformed SCHEMA defects (unresolvable/external/pure-ref-cycle `$ref`)
//     are COMPILE-time precise throws (propagated from E1), not eval-time.
//   * Recursive `$ref` (`#/$defs/Node` -> itself) compiles to a recursive
//     (not infinite) guard via E1's lazy/memo contract.
//   * Forward<->inverse: `compileSchemaGuard(compileSchema(S))` agrees with
//     `compileGuard(S)` for the shapes the forward pipeline produces.
// ============================================================================

describe('compileSchemaGuard — type keyword', () => {
	it('single primitive types', () => {
		expect(compileSchemaGuard({ type: 'string' })('x')).toBe(true)
		expect(compileSchemaGuard({ type: 'string' })(1)).toBe(false)
		expect(compileSchemaGuard({ type: 'number' })(1.5)).toBe(true)
		expect(compileSchemaGuard({ type: 'number' })('1')).toBe(false)
		expect(compileSchemaGuard({ type: 'boolean' })(true)).toBe(true)
		expect(compileSchemaGuard({ type: 'boolean' })(0)).toBe(false)
		expect(compileSchemaGuard({ type: 'null' })(null)).toBe(true)
		expect(compileSchemaGuard({ type: 'null' })(undefined)).toBe(false)
		expect(compileSchemaGuard({ type: 'object' })({})).toBe(true)
		expect(compileSchemaGuard({ type: 'object' })([])).toBe(false)
		expect(compileSchemaGuard({ type: 'object' })(null)).toBe(false)
		expect(compileSchemaGuard({ type: 'array' })([])).toBe(true)
		expect(compileSchemaGuard({ type: 'array' })({})).toBe(false)
	})

	it('`integer` is number + Number.isInteger (rejects NaN/Infinity/float)', () => {
		const g = compileSchemaGuard({ type: 'integer' })
		expect(g(3)).toBe(true)
		expect(g(3.5)).toBe(false)
		expect(g(Number.NaN)).toBe(false)
		expect(g(Number.POSITIVE_INFINITY)).toBe(false)
		expect(g('3')).toBe(false)
	})

	it('`number` accepts integers but excludes NaN/Infinity', () => {
		const g = compileSchemaGuard({ type: 'number' })
		expect(g(3)).toBe(true)
		expect(g(Number.NaN)).toBe(false)
		expect(g(Number.POSITIVE_INFINITY)).toBe(false)
	})

	it('array-of-type is a union of allowed types', () => {
		const g = compileSchemaGuard({ type: ['string', 'null'] })
		expect(g('x')).toBe(true)
		expect(g(null)).toBe(true)
		expect(g(1)).toBe(false)
	})

	it('absent type imposes no type constraint', () => {
		const g = compileSchemaGuard({})
		expect(g('x')).toBe(true)
		expect(g(123)).toBe(true)
		expect(g(null)).toBe(true)
		expect(g({ a: 1 })).toBe(true)
	})

	it('null is distinct from object', () => {
		expect(compileSchemaGuard({ type: 'object' })(null)).toBe(false)
		expect(compileSchemaGuard({ type: ['object', 'null'] })(null)).toBe(true)
	})
})

describe('compileSchemaGuard — enum / const (structural equality, D4)', () => {
	it('enum membership by structural equality', () => {
		const g = compileSchemaGuard({ enum: ['a', 1, true, null] })
		expect(g('a')).toBe(true)
		expect(g(1)).toBe(true)
		expect(g(true)).toBe(true)
		expect(g(null)).toBe(true)
		expect(g('b')).toBe(false)
		expect(g(2)).toBe(false)
	})

	it('enum with object/array members compared deep-structurally', () => {
		const g = compileSchemaGuard({ enum: [{ a: 1 }, [1, 2]] })
		expect(g({ a: 1 })).toBe(true)
		expect(g([1, 2])).toBe(true)
		expect(g({ a: 2 })).toBe(false)
		expect(g([1, 2, 3])).toBe(false)
		expect(g({ a: 1, b: 2 })).toBe(false)
	})

	it('const structural-equal to the single value', () => {
		expect(compileSchemaGuard({ const: 'fixed' })('fixed')).toBe(true)
		expect(compileSchemaGuard({ const: 'fixed' })('other')).toBe(false)
		const g = compileSchemaGuard({ const: { x: [1], y: 'z' } })
		expect(g({ x: [1], y: 'z' })).toBe(true)
		expect(g({ x: [2], y: 'z' })).toBe(false)
	})

	it('const NaN matches NaN (Object.is leaf semantics, +0 != -0)', () => {
		expect(compileSchemaGuard({ const: Number.NaN })(Number.NaN)).toBe(true)
		expect(compileSchemaGuard({ const: 0 })(-0)).toBe(false)
		expect(compileSchemaGuard({ const: -0 })(0)).toBe(false)
		expect(compileSchemaGuard({ enum: [Number.NaN] })(Number.NaN)).toBe(true)
	})
})

describe('compileSchemaGuard — string constraints', () => {
	it('minLength / maxLength (code-unit length)', () => {
		const g = compileSchemaGuard({ type: 'string', minLength: 2, maxLength: 4 })
		expect(g('ab')).toBe(true)
		expect(g('abcd')).toBe(true)
		expect(g('a')).toBe(false)
		expect(g('abcde')).toBe(false)
	})

	it('pattern matches a substring (RegExp from the string)', () => {
		const g = compileSchemaGuard({ type: 'string', pattern: 'ab+c' })
		expect(g('xxabbcxx')).toBe(true)
		expect(g('ac')).toBe(false)
	})

	it('stateful-regex hazard: a global-flag-ish pattern is consistent across calls', () => {
		// `pattern` is a plain string; even if the impl uses a shared RegExp it
		// MUST reset lastIndex / build fresh so repeated calls are consistent.
		const g = compileSchemaGuard({ type: 'string', pattern: 'a' })
		const first = g('a')
		const second = g('a')
		const third = g('a')
		expect(first).toBe(true)
		expect(second).toBe(true)
		expect(third).toBe(true)
	})

	it('format: documented asserting set (email/uuid/date-time/uri)', () => {
		expect(compileSchemaGuard({ type: 'string', format: 'email' })('a@b.com')).toBe(true)
		expect(compileSchemaGuard({ type: 'string', format: 'email' })('not-an-email')).toBe(false)
		expect(
			compileSchemaGuard({ type: 'string', format: 'uuid' })(
				'123e4567-e89b-12d3-a456-426614174000',
			),
		).toBe(true)
		expect(compileSchemaGuard({ type: 'string', format: 'uuid' })('not-a-uuid')).toBe(false)
		expect(
			compileSchemaGuard({ type: 'string', format: 'date-time' })('2020-01-01T00:00:00Z'),
		).toBe(true)
		expect(compileSchemaGuard({ type: 'string', format: 'date-time' })('nope')).toBe(false)
		expect(compileSchemaGuard({ type: 'string', format: 'uri' })('https://x.com/y')).toBe(true)
		expect(compileSchemaGuard({ type: 'string', format: 'uri' })('not a uri')).toBe(false)
	})

	it('format: unknown format is annotation-only — passes (does not assert)', () => {
		const g = compileSchemaGuard({ type: 'string', format: 'phone-number' })
		expect(g('literally anything')).toBe(true)
		expect(g('')).toBe(true)
	})
})

describe('compileSchemaGuard — number constraints', () => {
	it('minimum / maximum (inclusive)', () => {
		const g = compileSchemaGuard({ type: 'number', minimum: 0, maximum: 10 })
		expect(g(0)).toBe(true)
		expect(g(10)).toBe(true)
		expect(g(-1)).toBe(false)
		expect(g(11)).toBe(false)
	})

	it('exclusiveMinimum / exclusiveMaximum (2020-12 numeric form)', () => {
		const g = compileSchemaGuard({ type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 10 })
		expect(g(0)).toBe(false)
		expect(g(10)).toBe(false)
		expect(g(0.0001)).toBe(true)
		expect(g(9.9999)).toBe(true)
	})

	it('multipleOf (float-tolerant)', () => {
		const g = compileSchemaGuard({ type: 'number', multipleOf: 0.1 })
		expect(g(0.3)).toBe(true)
		expect(g(0.30000000000001)).toBe(false)
		const i = compileSchemaGuard({ type: 'integer', multipleOf: 3 })
		expect(i(9)).toBe(true)
		expect(i(10)).toBe(false)
	})
})

describe('compileSchemaGuard — array constraints', () => {
	it('items applied to every element', () => {
		const g = compileSchemaGuard({ type: 'array', items: { type: 'number' } })
		expect(g([1, 2, 3])).toBe(true)
		expect(g([1, 'x'])).toBe(false)
		expect(g([])).toBe(true)
	})

	it('prefixItems (positional) + items:false closed tuple', () => {
		const g = compileSchemaGuard({
			type: 'array',
			prefixItems: [{ type: 'string' }, { type: 'number' }],
			items: false,
		})
		expect(g(['a', 1])).toBe(true)
		expect(g(['a', 1, 2])).toBe(false)
		expect(g(['a'])).toBe(true)
		expect(g([1, 'a'])).toBe(false)
	})

	it('prefixItems with open tail (items schema applies past the prefix)', () => {
		const g = compileSchemaGuard({
			type: 'array',
			prefixItems: [{ type: 'string' }],
			items: { type: 'number' },
		})
		expect(g(['a', 1, 2])).toBe(true)
		expect(g(['a', 'b'])).toBe(false)
	})

	it('minItems / maxItems', () => {
		const g = compileSchemaGuard({ type: 'array', minItems: 1, maxItems: 2 })
		expect(g([1])).toBe(true)
		expect(g([1, 2])).toBe(true)
		expect(g([])).toBe(false)
		expect(g([1, 2, 3])).toBe(false)
	})

	it('uniqueItems (structural-equality dedup, consistent with enum/const)', () => {
		const g = compileSchemaGuard({ type: 'array', uniqueItems: true })
		expect(g([1, 2, 3])).toBe(true)
		expect(g([1, 1])).toBe(false)
		expect(g([{ a: 1 }, { a: 1 }])).toBe(false)
		expect(g([{ a: 1 }, { a: 2 }])).toBe(true)
		expect(g([[1], [1]])).toBe(false)
	})
})

describe('compileSchemaGuard — object constraints (B2 pollution-safe)', () => {
	it('properties + required', () => {
		const g = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' }, b: { type: 'number' } },
			required: ['a'],
		})
		expect(g({ a: 'x' })).toBe(true)
		expect(g({ a: 'x', b: 1 })).toBe(true)
		expect(g({ b: 1 })).toBe(false)
		expect(g({ a: 'x', b: 'oops' })).toBe(false)
	})

	it('additionalProperties false (closed) | true (open) | schema', () => {
		const closed = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			additionalProperties: false,
		})
		expect(closed({ a: 'x' })).toBe(true)
		expect(closed({ a: 'x', extra: 1 })).toBe(false)

		const open = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			additionalProperties: true,
		})
		expect(open({ a: 'x', extra: 1 })).toBe(true)

		const typed = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			additionalProperties: { type: 'number' },
		})
		expect(typed({ a: 'x', extra: 1 })).toBe(true)
		expect(typed({ a: 'x', extra: 'no' })).toBe(false)
	})

	it('B2: __proto__ / constructor hostile input does not pollute and is guarded', () => {
		const g = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			additionalProperties: false,
		})
		const before = Object.getOwnPropertyNames(Object.prototype).slice()
		// Hostile own-key payload. JSON.parse produces an OWN __proto__ key.
		const hostile = JSON.parse('{"a":"x","__proto__":{"polluted":true}}')
		// Closed object: __proto__ is an extra own key -> rejected, no pollution.
		expect(g(hostile)).toBe(false)
		expect(({} as Record<string, unknown>)['polluted']).toBeUndefined()
		expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(before)
		// `constructor` extra own key likewise rejected by a closed object.
		const hostile2 = JSON.parse('{"a":"x","constructor":1}')
		expect(g(hostile2)).toBe(false)
	})

	it('B2: a declared __proto__ property reads via Object.hasOwn (no chain trip)', () => {
		const g = compileSchemaGuard({
			type: 'object',
			// eslint-disable-next-line no-proto
			properties: { ['__proto__']: { type: 'string' } },
			required: ['__proto__'],
			additionalProperties: false,
		})
		const ok = JSON.parse('{"__proto__":"hello"}')
		expect(g(ok)).toBe(true)
		const bad = JSON.parse('{"__proto__":123}')
		expect(g(bad)).toBe(false)
		// A plain object WITHOUT an own __proto__ must fail required.
		expect(g({})).toBe(false)
	})

	it('patternProperties (regex-keyed schemas)', () => {
		const g = compileSchemaGuard({
			type: 'object',
			patternProperties: { '^x-': { type: 'number' } },
			additionalProperties: false,
		})
		expect(g({ 'x-a': 1, 'x-b': 2 })).toBe(true)
		expect(g({ 'x-a': 'no' })).toBe(false)
		expect(g({ other: 1 })).toBe(false)
	})

	it('propertyNames (schema applied to each key string)', () => {
		const g = compileSchemaGuard({
			type: 'object',
			propertyNames: { type: 'string', minLength: 3 },
		})
		expect(g({ abc: 1, defg: 2 })).toBe(true)
		expect(g({ ab: 1 })).toBe(false)
	})

	it('minProperties / maxProperties', () => {
		const g = compileSchemaGuard({ type: 'object', minProperties: 1, maxProperties: 2 })
		expect(g({ a: 1 })).toBe(true)
		expect(g({ a: 1, b: 2 })).toBe(true)
		expect(g({})).toBe(false)
		expect(g({ a: 1, b: 2, c: 3 })).toBe(false)
	})

	it('dependentRequired', () => {
		const g = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
			dependentRequired: { a: ['b', 'c'] },
		})
		expect(g({})).toBe(true)
		expect(g({ a: 'x', b: 'y', c: 'z' })).toBe(true)
		expect(g({ a: 'x', b: 'y' })).toBe(false)
		expect(g({ b: 'y' })).toBe(true)
	})
})

describe('compileSchemaGuard — composition', () => {
	it('allOf — every subschema passes', () => {
		const g = compileSchemaGuard({
			allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
				{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
			],
		})
		expect(g({ a: 'x', b: 1 })).toBe(true)
		expect(g({ a: 'x' })).toBe(false)
	})

	it('anyOf — at least one passes', () => {
		const g = compileSchemaGuard({ anyOf: [{ type: 'string' }, { type: 'number' }] })
		expect(g('x')).toBe(true)
		expect(g(1)).toBe(true)
		expect(g(true)).toBe(false)
	})

	it('oneOf — EXACTLY one passes (B4)', () => {
		const g = compileSchemaGuard({
			oneOf: [
				{ type: 'number', minimum: 0 },
				{ type: 'number', maximum: 100 },
			],
		})
		// 50 matches BOTH -> exactly-one fails.
		expect(g(50)).toBe(false)
		// -5 matches only the second (maximum:100).
		expect(g(-5)).toBe(true)
		// 150 matches only the first (minimum:0).
		expect(g(150)).toBe(true)
		// 'x' matches neither.
		expect(g('x')).toBe(false)
	})

	it('not — subschema must fail', () => {
		const g = compileSchemaGuard({ not: { type: 'string' } })
		expect(g(1)).toBe(true)
		expect(g('x')).toBe(false)
	})

	it('if/then/else — all branches incl. absent then/else', () => {
		const g = compileSchemaGuard({
			if: { type: 'string' },
			then: { minLength: 3 },
			else: { type: 'number' },
		})
		expect(g('abc')).toBe(true)
		expect(g('ab')).toBe(false)
		expect(g(42)).toBe(true)
		expect(g(true)).toBe(false)

		// Absent `then` = pass when `if` matches.
		const noThen = compileSchemaGuard({ if: { type: 'string' }, else: { type: 'number' } })
		expect(noThen('anything')).toBe(true)
		expect(noThen(1)).toBe(true)
		expect(noThen(true)).toBe(false)

		// Absent `else` = pass when `if` fails.
		const noElse = compileSchemaGuard({ if: { type: 'string' }, then: { minLength: 2 } })
		expect(noElse('ab')).toBe(true)
		expect(noElse('a')).toBe(false)
		expect(noElse(123)).toBe(true)

		// No `if` -> if/then/else inert.
		expect(compileSchemaGuard({ then: { type: 'string' } })(123)).toBe(true)
	})
})

describe('compileSchemaGuard — boolean schemas', () => {
	it('true accepts everything, false rejects everything', () => {
		expect(compileSchemaGuard(true)(123)).toBe(true)
		expect(compileSchemaGuard(true)(null)).toBe(true)
		expect(compileSchemaGuard(false)(123)).toBe(false)
		expect(compileSchemaGuard(false)(undefined)).toBe(false)
	})

	it('boolean sub-schemas inside properties', () => {
		const g = compileSchemaGuard({
			type: 'object',
			properties: { open: true, closed: false },
			required: ['open'],
		})
		expect(g({ open: 'anything' })).toBe(true)
		expect(g({ open: 1, closed: 'x' })).toBe(false)
	})
})

describe('compileSchemaGuard — $ref / recursive $ref', () => {
	it('resolves a local $ref', () => {
		const g = compileSchemaGuard({
			$defs: { Id: { type: 'string', minLength: 1 } },
			$ref: '#/$defs/Id',
		})
		expect(g('x')).toBe(true)
		expect(g('')).toBe(false)
		expect(g(1)).toBe(false)
	})

	it('recursive $ref guards a finite recursive value (no stack overflow)', () => {
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: {
						value: { type: 'string' },
						next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
					},
					required: ['value', 'next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		const g = compileSchemaGuard(schema)
		const good = { value: 'a', next: { value: 'b', next: { value: 'c', next: null } } }
		expect(g(good)).toBe(true)
		const bad = { value: 'a', next: { value: 42, next: null } }
		expect(g(bad)).toBe(false)
		const malformed = { value: 'a' } // missing required `next`
		expect(g(malformed)).toBe(false)
	})

	it('recursive $ref guard does NOT explode on a deep finite value', () => {
		const schema: JsonSchema = {
			$defs: {
				List: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/List' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/List',
		}
		const g = compileSchemaGuard(schema)
		let deep: { next: unknown } = { next: null }
		for (let i = 0; i < 500; i += 1) {
			deep = { next: deep }
		}
		expect(g(deep)).toBe(true)
	})

	it('mutually-recursive $ref (A<->B) compiles and guards', () => {
		const schema: JsonSchema = {
			$defs: {
				A: {
					type: 'object',
					properties: { b: { anyOf: [{ $ref: '#/$defs/B' }, { type: 'null' }] } },
					required: ['b'],
					additionalProperties: false,
				},
				B: {
					type: 'object',
					properties: { a: { anyOf: [{ $ref: '#/$defs/A' }, { type: 'null' }] } },
					required: ['a'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/A',
		}
		const g = compileSchemaGuard(schema)
		expect(g({ b: { a: { b: null } } })).toBe(true)
		expect(g({ b: { a: { b: 1 } } })).toBe(false)
	})
})

describe('compileSchemaGuard — §13: guard NEVER throws on hostile input', () => {
	it('cyclic data returns false, never RangeError', () => {
		const g = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			required: ['a'],
			additionalProperties: false,
		})
		const cyclic: Record<string, unknown> = {}
		cyclic['self'] = cyclic
		expect(() => g(cyclic)).not.toThrow()
		expect(g(cyclic)).toBe(false)
	})

	it('a getter that throws is caught — guard returns false', () => {
		const hostile = {}
		Object.defineProperty(hostile, 'a', {
			enumerable: true,
			get() {
				throw new Error('boom')
			},
		})
		const g = compileSchemaGuard({
			type: 'object',
			properties: { a: { type: 'string' } },
			required: ['a'],
		})
		expect(() => g(hostile)).not.toThrow()
		expect(g(hostile)).toBe(false)
	})

	it('recursive-$ref guard does not throw on cyclic data', () => {
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		const g = compileSchemaGuard(schema)
		const cyclic: Record<string, unknown> = {}
		cyclic['next'] = cyclic
		expect(() => g(cyclic)).not.toThrow()
		expect(g(cyclic)).toBe(false)
	})

	it('deeply pathological non-cyclic data returns false, not RangeError', () => {
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		const g = compileSchemaGuard(schema)
		// Build a chain too deep for the native stack but with a non-conforming
		// leaf — must terminate with `false`, never a RangeError.
		let deep: Record<string, unknown> = { next: 'not-a-node-and-not-null' }
		for (let i = 0; i < 20000; i += 1) {
			deep = { next: deep }
		}
		expect(() => g(deep)).not.toThrow()
		expect(g(deep)).toBe(false)
	})
})

describe('compileSchemaGuard — §13: malformed SCHEMA throws at COMPILE time', () => {
	it('unresolvable $ref throws at compile (not eval)', () => {
		expect(() => compileSchemaGuard({ $ref: '#/$defs/Nope' })).toThrow(/#\/\$defs\/Nope/)
	})

	it('external $ref throws at compile', () => {
		expect(() => compileSchemaGuard({ $ref: 'https://x/y#/z' })).toThrow(
			/external \$ref unsupported/,
		)
	})

	it('pure-$ref-only cycle throws a precise compile-time Error', () => {
		expect(() =>
			compileSchemaGuard({
				$defs: { A: { $ref: '#/$defs/B' }, B: { $ref: '#/$defs/A' } },
				$ref: '#/$defs/A',
			}),
		).toThrow(/circular \$ref/i)
	})
})

// === Forward <-> inverse cross-consistency anchor
//
// For several ContractShapes S, `compileSchemaGuard(compileSchema(S))(x)` must
// agree with `compileGuard(S)(x)` for a sample of x. This is the round-trip
// soundness anchor between the forward (shape->schema) and inverse
// (schema->guard) pipelines.

describe('compileSchemaGuard — forward<->inverse cross-consistency', () => {
	const cases: { name: string; shape: ContractShape; samples: readonly unknown[] }[] = [
		{
			name: 'string min/max',
			shape: stringShape({ min: 2, max: 5 }),
			samples: ['ab', 'a', 'abcdef', 1, null, ''],
		},
		{
			name: 'integer min',
			shape: integerShape({ min: 0 }),
			samples: [0, -1, 3.5, 'x', Number.NaN],
		},
		{
			name: 'number bounds',
			shape: numberShape({ min: -1, max: 1 }),
			samples: [0, -1, 1, 2, Number.POSITIVE_INFINITY],
		},
		{ name: 'boolean', shape: booleanShape(), samples: [true, false, 0, 'true'] },
		{
			name: 'array<string>',
			shape: arrayShape(stringShape({ min: 1 })),
			samples: [['a'], [], ['a', ''], [1], 'x'],
		},
		{
			name: 'tuple [string, number]',
			shape: tupleShape(stringShape(), numberShape()),
			samples: [['a', 1], ['a'], ['a', 1, 2], [1, 'a'], []],
		},
		{
			name: 'object person',
			shape: objectShape({
				name: stringShape({ min: 1 }),
				age: integerShape({ min: 0 }),
				bio: optionalShape(stringShape()),
			}),
			samples: [
				{ name: 'Ada', age: 30 },
				{ name: 'Ada', age: 30, bio: 'x' },
				{ name: '', age: 30 },
				{ name: 'Ada', age: -1 },
				{ name: 'Ada', age: 30, extra: 1 },
				{ name: 'Ada' },
				'not-an-object',
			],
		},
		{
			name: 'union string|integer',
			shape: unionShape(stringShape({ min: 1 }), integerShape({ min: 0 })),
			samples: ['x', 3, '', -1, true],
		},
		{
			name: 'oneOf string|integer',
			shape: oneOfShape(stringShape({ min: 1 }), integerShape({ min: 0 })),
			samples: ['x', 3, '', -1, true, null],
		},
		{
			name: 'const object',
			shape: constShape({ kind: 'a', n: 1 }),
			samples: [{ kind: 'a', n: 1 }, { kind: 'a', n: 2 }, { kind: 'a' }, 'x'],
		},
	]

	for (const { name, shape, samples } of cases) {
		it(`agrees for ${name}`, () => {
			const schema = compileSchema(shape)
			const fromShape = compileGuard(shape)
			const fromSchema = compileSchemaGuard(schema)
			for (const sample of samples) {
				expect(
					fromSchema(sample),
					`mismatch for ${name} sample ${JSON.stringify(sample)}`,
				).toBe(fromShape(sample))
			}
		})
	}

	it('recursive shape round-trips (compileSchema lazy -> $defs -> guard)', () => {
		// A recursive contract shape: list with a `next` that is the shape itself.
		const properties: Record<string, ContractShape> = {
			value: stringShape({ min: 1 }),
		}
		const listShape = objectShape(properties, { additionalProperties: false })
		properties['next'] = optionalShape({
			type: 'lazy',
			thunk: () => listShape,
		})
		const schema = compileSchema(listShape)
		const fromSchema = compileSchemaGuard(schema)
		const fromShape = compileGuard(listShape)
		const samples: readonly unknown[] = [
			{ value: 'a' },
			{ value: 'a', next: { value: 'b' } },
			{ value: 'a', next: { value: 'b', next: { value: 'c' } } },
			{ value: '' },
			{ value: 'a', next: { value: 1 } },
		]
		for (const sample of samples) {
			expect(fromSchema(sample)).toBe(fromShape(sample))
		}
	})
})

// ============================================================================
//  E3 — compileSchemaShape: JSON Schema -> a ContractShape (round-trip bridge)
//
//  Documented contract under test (mirrors the compiler's TSDoc):
//
//   * `compileSchemaShape(schema)` maps a JSON-Schema document BACK to a
//     `ContractShape`, so an external schema flows into the FORWARD pipeline
//     (`compileGuard`/`compileSchema`/`compileContract`/`Infer`). It is the
//     round-trip bridge that closes E1+E2's inverse subsystem.
//   * It is a BEST-EFFORT structural mapping. For the SUPPORTED keyword
//     subset the invariant `compileGuard(compileSchemaShape(s))` agrees with
//     `compileSchemaGuard(s)` holds. For UNSUPPORTED keywords (`format`
//     semantics, `exclusive*`, `multipleOf`, `uniqueItems`,
//     `patternProperties`, `propertyNames`, `min|maxProperties`, `not`,
//     `if/then/else`, open-tail `prefixItems`) the produced shape is LOOSER
//     (it omits that constraint) — these are documented, intentional, and
//     tested as KNOWN divergences, not silent bugs.
//   * Recursive `$ref` -> a `lazyShape` whose thunk resolves the target,
//     memoized by canonical pointer, so a recursive schema yields a finite
//     recursive `ContractShape` the forward pipeline handles WITHOUT stack
//     overflow.
//   * §13: a malformed/external/pure-ref-cycle `$ref` is a COMPILE-time
//     precise throw (propagated from E1); a `false` boolean schema is
//     unsupported (no "never" shape in the DSL) -> precise compile throw.
// ============================================================================

describe('compileSchemaShape — type keyword -> primitive shapers', () => {
	it('single primitive types map to the matching primitive shaper', () => {
		expect(compileSchemaShape({ type: 'string' }).type).toBe('string')
		expect(compileSchemaShape({ type: 'number' }).type).toBe('number')
		const integer = compileSchemaShape({ type: 'integer' })
		expect(integer.type).toBe('number')
		expect(integer.type === 'number' && integer.integer).toBe(true)
		expect(compileSchemaShape({ type: 'boolean' }).type).toBe('boolean')
		expect(compileSchemaShape({ type: 'object' }).type).toBe('object')
		expect(compileSchemaShape({ type: 'array' }).type).toBe('array')
	})

	it('`type: "null"` -> constShape(null) (DECISION: no nullShape exists)', () => {
		const shape = compileSchemaShape({ type: 'null' })
		expect(shape.type).toBe('const')
		expect(shape.type === 'const' && shape.value).toBe(null)
		const g = compileGuard(shape)
		expect(g(null)).toBe(true)
		expect(g(0)).toBe(false)
		expect(g(undefined)).toBe(false)
	})

	it('`type` array -> unionShape of the per-type shapes (DECISION)', () => {
		const shape = compileSchemaShape({ type: ['string', 'null'] })
		expect(shape.type).toBe('union')
		const g = compileGuard(shape)
		expect(g('x')).toBe(true)
		expect(g(null)).toBe(true)
		expect(g(1)).toBe(false)
	})

	it('a schema with no `type` and no constraints -> rawShape (accept anything)', () => {
		const shape = compileSchemaShape({})
		expect(shape.type).toBe('raw')
		const g = compileGuard(shape)
		expect(g('x')).toBe(true)
		expect(g(123)).toBe(true)
		expect(g(null)).toBe(true)
		expect(g({ a: 1 })).toBe(true)
	})
})

describe('compileSchemaShape — enum / const', () => {
	it('enum of primitives -> literalShape(...values)', () => {
		const shape = compileSchemaShape({ enum: ['a', 1, true] })
		expect(shape.type).toBe('literal')
		const g = compileGuard(shape)
		expect(g('a')).toBe(true)
		expect(g(1)).toBe(true)
		expect(g(true)).toBe(true)
		expect(g('b')).toBe(false)
	})

	it('enum containing structural members -> unionShape of constShapes (DECISION)', () => {
		const shape = compileSchemaShape({ enum: [{ a: 1 }, [1, 2], 'p'] })
		expect(shape.type).toBe('union')
		const g = compileGuard(shape)
		expect(g({ a: 1 })).toBe(true)
		expect(g([1, 2])).toBe(true)
		expect(g('p')).toBe(true)
		expect(g({ a: 2 })).toBe(false)
	})

	it('const -> constShape(value)', () => {
		const shape = compileSchemaShape({ const: { x: [1], y: 'z' } })
		expect(shape.type).toBe('const')
		const g = compileGuard(shape)
		expect(g({ x: [1], y: 'z' })).toBe(true)
		expect(g({ x: [2], y: 'z' })).toBe(false)
	})
})

describe('compileSchemaShape — string constraints', () => {
	it('minLength/maxLength/pattern -> stringShape({min,max,pattern})', () => {
		const shape = compileSchemaShape({
			type: 'string',
			minLength: 2,
			maxLength: 4,
			pattern: 'ab',
		})
		expect(shape.type).toBe('string')
		if (shape.type !== 'string') throw new Error('unreachable')
		expect(shape.min).toBe(2)
		expect(shape.max).toBe(4)
		expect(shape.pattern instanceof RegExp).toBe(true)
		const g = compileGuard(shape)
		expect(g('abc')).toBe(true)
		expect(g('a')).toBe(false)
		expect(g('xxxxx')).toBe(false)
	})
})

describe('compileSchemaShape — number constraints', () => {
	it('minimum/maximum -> numberShape({min,max})', () => {
		const shape = compileSchemaShape({ type: 'number', minimum: 0, maximum: 10 })
		expect(shape.type).toBe('number')
		const g = compileGuard(shape)
		expect(g(0)).toBe(true)
		expect(g(10)).toBe(true)
		expect(g(-1)).toBe(false)
		expect(g(11)).toBe(false)
	})

	it('integer + bounds -> integerShape({min,max})', () => {
		const shape = compileSchemaShape({ type: 'integer', minimum: 1, maximum: 3 })
		expect(shape.type === 'number' && shape.integer).toBe(true)
		const g = compileGuard(shape)
		expect(g(2)).toBe(true)
		expect(g(2.5)).toBe(false)
		expect(g(5)).toBe(false)
	})
})

describe('compileSchemaShape — array', () => {
	it('items + min/maxItems -> arrayShape(itemShape, {min,max})', () => {
		const shape = compileSchemaShape({
			type: 'array',
			items: { type: 'number' },
			minItems: 1,
			maxItems: 3,
		})
		expect(shape.type).toBe('array')
		const g = compileGuard(shape)
		expect(g([1, 2])).toBe(true)
		expect(g([])).toBe(false)
		expect(g([1, 2, 3, 4])).toBe(false)
		expect(g([1, 'x'])).toBe(false)
	})

	it('prefixItems + items:false -> tupleShape(...prefixShapes) (closed)', () => {
		const shape = compileSchemaShape({
			type: 'array',
			prefixItems: [{ type: 'string' }, { type: 'number' }],
			items: false,
		})
		expect(shape.type).toBe('tuple')
		const g = compileGuard(shape)
		expect(g(['a', 1])).toBe(true)
		expect(g(['a'])).toBe(false)
		expect(g(['a', 1, 2])).toBe(false)
		expect(g([1, 'a'])).toBe(false)
	})

	it('an untyped array (no items) -> arrayShape(rawShape) (accept any element)', () => {
		const shape = compileSchemaShape({ type: 'array' })
		expect(shape.type).toBe('array')
		const g = compileGuard(shape)
		expect(g([1, 'x', null, {}])).toBe(true)
		expect(g('x')).toBe(false)
	})
})

describe('compileSchemaShape — object', () => {
	it('properties/required -> objectShape with optionalShape for non-required', () => {
		const shape = compileSchemaShape({
			type: 'object',
			properties: { a: { type: 'string' }, b: { type: 'number' } },
			required: ['a'],
			additionalProperties: false,
		})
		expect(shape.type).toBe('object')
		if (shape.type !== 'object') throw new Error('unreachable')
		expect(shape.properties['b']?.type).toBe('optional')
		const g = compileGuard(shape)
		expect(g({ a: 'x' })).toBe(true)
		expect(g({ a: 'x', b: 1 })).toBe(true)
		expect(g({ b: 1 })).toBe(false)
		expect(g({ a: 'x', extra: 1 })).toBe(false)
	})

	it('additionalProperties true -> open; schema -> typed-open', () => {
		const open = compileGuard(
			compileSchemaShape({
				type: 'object',
				properties: { a: { type: 'string' } },
				additionalProperties: true,
			}),
		)
		expect(open({ a: 'x', extra: 1 })).toBe(true)
		const typed = compileGuard(
			compileSchemaShape({
				type: 'object',
				properties: { a: { type: 'string' } },
				additionalProperties: { type: 'number' },
			}),
		)
		expect(typed({ a: 'x', extra: 1 })).toBe(true)
		expect(typed({ a: 'x', extra: 'no' })).toBe(false)
	})
})

describe('compileSchemaShape — composition', () => {
	it('allOf of object members -> intersectionShape (D2)', () => {
		const shape = compileSchemaShape({
			allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
				{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
			],
		})
		expect(shape.type).toBe('intersection')
		const g = compileGuard(shape)
		expect(g({ a: 'x', b: 1 })).toBe(true)
		expect(g({ a: 'x' })).toBe(false)
	})

	it('anyOf -> unionShape (anyOf)', () => {
		const shape = compileSchemaShape({ anyOf: [{ type: 'string' }, { type: 'number' }] })
		expect(shape.type).toBe('union')
		const g = compileGuard(shape)
		expect(g('x')).toBe(true)
		expect(g(1)).toBe(true)
		expect(g(true)).toBe(false)
	})

	it('oneOf -> oneOfShape (exactly-one, B4)', () => {
		const shape = compileSchemaShape({
			oneOf: [
				{ type: 'number', minimum: 0 },
				{ type: 'number', maximum: 100 },
			],
		})
		expect(shape.type === 'union' && shape.mode).toBe('oneOf')
		const g = compileGuard(shape)
		expect(g(50)).toBe(false)
		expect(g(-5)).toBe(true)
		expect(g(150)).toBe(true)
	})
})

describe('compileSchemaShape — boolean schema', () => {
	it('true -> rawShape (accepts anything)', () => {
		const shape = compileSchemaShape(true)
		expect(shape.type).toBe('raw')
		const g = compileGuard(shape)
		expect(g(123)).toBe(true)
		expect(g(null)).toBe(true)
	})

	it('false schema is UNSUPPORTED -> precise compile throw (§13, no "never" shape)', () => {
		expect(() => compileSchemaShape(false)).toThrow(/false.*schema|no.*never|unsupported/i)
	})
})

describe('compileSchemaShape — $ref / recursive $ref -> lazyShape', () => {
	it('resolves a local $ref', () => {
		const shape = compileSchemaShape({
			$defs: { Id: { type: 'string', minLength: 1 } },
			$ref: '#/$defs/Id',
		})
		const g = compileGuard(shape)
		expect(g('x')).toBe(true)
		expect(g('')).toBe(false)
		expect(g(1)).toBe(false)
	})

	it('recursive $ref -> a lazyShape-based recursive ContractShape', () => {
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: {
						value: { type: 'string' },
						next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
					},
					required: ['value', 'next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		const shape = compileSchemaShape(schema)
		const g = compileGuard(shape)
		const good = { value: 'a', next: { value: 'b', next: { value: 'c', next: null } } }
		expect(g(good)).toBe(true)
		const bad = { value: 'a', next: { value: 42, next: null } }
		expect(g(bad)).toBe(false)
		const malformed = { value: 'a' }
		expect(g(malformed)).toBe(false)
	})

	it('recursive $ref shape is non-explosive at compile AND eval (deep finite value)', () => {
		const schema: JsonSchema = {
			$defs: {
				List: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/List' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/List',
		}
		// Compile must not stack-overflow on the recursive schema.
		const shape = compileSchemaShape(schema)
		const g = compileGuard(shape)
		let deep: { next: unknown } = { next: null }
		for (let i = 0; i < 500; i += 1) {
			deep = { next: deep }
		}
		expect(g(deep)).toBe(true)
	})

	it('recursive $ref shape is the canonical lazyShape pattern; cyclic DATA is now guard-false (FU1), still equal to canonical', () => {
		// FU1: the forward `compileGuard` D3 `'lazy'` arm is now
		// cyclic-DATA-safe at the lazy boundary (ancestor-WeakSet +
		// MAX_RECURSION_DEPTH backstop, the §13 fix). E3's
		// produced shape has the IDENTICAL recursion profile (one stable
		// `lazyShape` thunk per `$ref` pointer) as the canonical sanctioned
		// pattern, so BOTH now return `false` on self-cyclic data, NEVER
		// RangeError (§13). The equality-to-canonical relationship still holds
		// AND the absolute correct value (false) is asserted directly.
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		// Compile (schema -> shape -> forward guard) must NOT explode.
		const g = compileGuard(compileSchemaShape(schema))
		// Finite recursive data: handled correctly (the E3 guarantee).
		expect(g({ next: { next: null } })).toBe(true)
		expect(g({ next: { next: 1 } })).toBe(false)
		// The canonical sanctioned single-stable-thunk recursive pattern.
		const canonical: ContractShape = {
			type: 'object',
			properties: {
				next: {
					type: 'union',
					variants: [
						{ type: 'lazy', thunk: () => canonical },
						{ type: 'const', value: null },
					],
				},
			},
		}
		const canonicalGuard = compileGuard(canonical)
		const cyclic: Record<string, unknown> = {}
		cyclic['next'] = cyclic
		// FU1: self-cyclic data is now guard-false, never RangeError (§13);
		// E3's shape and the canonical pattern agree on the absolute value.
		expect(() => g(cyclic)).not.toThrow()
		expect(g(cyclic)).toBe(false)
		expect(() => canonicalGuard(cyclic)).not.toThrow()
		expect(canonicalGuard(cyclic)).toBe(false)
		expect(g(cyclic)).toBe(canonicalGuard(cyclic))
	})

	it('mutually-recursive $ref (A<->B) -> recursive shape compiles and guards', () => {
		const schema: JsonSchema = {
			$defs: {
				A: {
					type: 'object',
					properties: { b: { anyOf: [{ $ref: '#/$defs/B' }, { type: 'null' }] } },
					required: ['b'],
					additionalProperties: false,
				},
				B: {
					type: 'object',
					properties: { a: { anyOf: [{ $ref: '#/$defs/A' }, { type: 'null' }] } },
					required: ['a'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/A',
		}
		const g = compileGuard(compileSchemaShape(schema))
		expect(g({ b: { a: { b: null } } })).toBe(true)
		expect(g({ b: { a: { b: 1 } } })).toBe(false)
	})
})

describe('compileSchemaShape — §13: malformed SCHEMA throws at COMPILE time', () => {
	it('unresolvable $ref throws at compile (propagated from E1)', () => {
		expect(() => compileSchemaShape({ $ref: '#/$defs/Nope' })).toThrow(/#\/\$defs\/Nope/)
	})

	it('external $ref throws at compile', () => {
		expect(() => compileSchemaShape({ $ref: 'https://x/y#/z' })).toThrow(
			/external \$ref unsupported/,
		)
	})

	it('pure-$ref-only cycle throws a precise compile-time Error', () => {
		expect(() =>
			compileSchemaShape({
				$defs: { A: { $ref: '#/$defs/B' }, B: { $ref: '#/$defs/A' } },
				$ref: '#/$defs/A',
			}),
		).toThrow(/circular \$ref/i)
	})
})

// === The supported-subset invariant
//
// For the SUPPORTED keyword subset, `compileGuard(compileSchemaShape(s))`
// MUST agree with `compileSchemaGuard(s)` (E2) on a sample of inputs. This is
// the round-trip soundness anchor: the schema->shape->forward-guard path and
// the schema->guard path coincide where the shape DSL can represent the
// schema.

describe('compileSchemaShape — supported-subset invariant (compileGuard∘compileSchemaShape === compileSchemaGuard)', () => {
	const cases: { name: string; schema: JsonSchema; samples: readonly unknown[] }[] = [
		{
			name: 'string min/max/pattern',
			schema: { type: 'string', minLength: 2, maxLength: 5, pattern: 'a' },
			samples: ['ab', 'a', 'abcdef', 'xax', 'bb', 1, null],
		},
		{
			name: 'integer min/max',
			schema: { type: 'integer', minimum: 0, maximum: 10 },
			samples: [0, 10, -1, 11, 3.5, 'x', Number.NaN],
		},
		{
			name: 'number bounds',
			schema: { type: 'number', minimum: -1, maximum: 1 },
			samples: [0, -1, 1, 2, Number.POSITIVE_INFINITY, 'x'],
		},
		{ name: 'boolean', schema: { type: 'boolean' }, samples: [true, false, 0, 'true'] },
		{ name: 'null', schema: { type: 'null' }, samples: [null, undefined, 0, ''] },
		{
			name: 'type union [string,null]',
			schema: { type: ['string', 'null'] },
			samples: ['x', null, 1, undefined],
		},
		{
			name: 'enum primitives',
			schema: { enum: ['a', 1, true] },
			samples: ['a', 1, true, 'b', 2, false],
		},
		{
			name: 'const object',
			schema: { const: { kind: 'a', n: 1 } },
			samples: [{ kind: 'a', n: 1 }, { kind: 'a', n: 2 }, { kind: 'a' }, 'x'],
		},
		{
			name: 'array<number> min/max',
			schema: { type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 3 },
			samples: [[1], [1, 2, 3], [], [1, 2, 3, 4], [1, 'x'], 'no'],
		},
		{
			// FULL-length samples only: E2's prefixItems+items:false closed
			// tuple does NOT enforce a LOWER length bound (no minItems), so a
			// SHORT array (`['a']`) passes E2 but fails the exact-length
			// `tupleShape`. That short-tuple divergence is asserted explicitly
			// in the "documented fidelity gaps" block below; the invariant here
			// uses full/over-length samples where E2 and the shape agree.
			name: 'closed tuple [string,number] (length >= arity)',
			schema: {
				type: 'array',
				prefixItems: [{ type: 'string' }, { type: 'number' }],
				items: false,
			},
			samples: [['a', 1], ['a', 1, 2], [1, 'a'], ['a', 'b'], 'no'],
		},
		{
			name: 'object person (required + optional + closed)',
			schema: {
				type: 'object',
				properties: {
					name: { type: 'string', minLength: 1 },
					age: { type: 'integer', minimum: 0 },
					bio: { type: 'string' },
				},
				required: ['name', 'age'],
				additionalProperties: false,
			},
			samples: [
				{ name: 'Ada', age: 30 },
				{ name: 'Ada', age: 30, bio: 'x' },
				{ name: '', age: 30 },
				{ name: 'Ada', age: -1 },
				{ name: 'Ada', age: 30, extra: 1 },
				{ name: 'Ada' },
				'not-an-object',
			],
		},
		{
			name: 'object open typed additionalProperties',
			schema: {
				type: 'object',
				properties: { a: { type: 'string' } },
				required: ['a'],
				additionalProperties: { type: 'number' },
			},
			samples: [{ a: 'x' }, { a: 'x', extra: 1 }, { a: 'x', extra: 'no' }, {}],
		},
		{
			name: 'anyOf string|integer',
			schema: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer', minimum: 0 }] },
			samples: ['x', 3, '', -1, true],
		},
		{
			name: 'oneOf string|boolean',
			schema: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
			samples: ['x', true, 1, null],
		},
		{
			name: 'allOf object conjunction',
			schema: {
				allOf: [
					{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
					{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
				],
			},
			samples: [{ a: 'x', b: 1 }, { a: 'x' }, { b: 1 }, {}],
		},
		{
			name: 'local $ref',
			schema: { $defs: { Id: { type: 'string', minLength: 1 } }, $ref: '#/$defs/Id' },
			samples: ['x', '', 1],
		},
		{
			name: 'recursive $ref',
			schema: {
				$defs: {
					Node: {
						type: 'object',
						properties: {
							value: { type: 'string' },
							next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
						},
						required: ['value', 'next'],
						additionalProperties: false,
					},
				},
				$ref: '#/$defs/Node',
			},
			samples: [
				{ value: 'a', next: null },
				{ value: 'a', next: { value: 'b', next: null } },
				{ value: 'a', next: { value: 1, next: null } },
				{ value: 'a' },
				'no',
			],
		},
	]

	for (const { name, schema, samples } of cases) {
		it(`agrees with compileSchemaGuard for ${name}`, () => {
			const fromShape = compileGuard(compileSchemaShape(schema))
			const fromSchema = compileSchemaGuard(schema)
			for (const sample of samples) {
				expect(
					fromShape(sample),
					`mismatch for ${name} sample ${JSON.stringify(sample)}`,
				).toBe(fromSchema(sample))
			}
		})
	}
})

// === Documented fidelity gaps (KNOWN looser behavior — tested, not silent)
//
// Where the shaper DSL cannot express a keyword the produced shape OMITS that
// constraint, so `compileGuard(compileSchemaShape(s))` is strictly LOOSER
// than `compileSchemaGuard(s)`. Each gap below asserts the EXACT looser
// behavior with an explicit "documented fidelity gap" comment.

describe('compileSchemaShape — documented fidelity gaps (looser than compileSchemaGuard, by design)', () => {
	it('format: assertion is DROPPED — shape accepts a value E2 would reject', () => {
		// documented fidelity gap: the shape DSL cannot represent arbitrary
		// `format` semantics; E2 asserts email syntax, the round-tripped shape
		// does not.
		const schema: JsonSchema = { type: 'string', format: 'email' }
		expect(compileSchemaGuard(schema)('not-an-email')).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))('not-an-email')).toBe(true)
	})

	it('exclusiveMinimum/Maximum: DROPPED — boundary value accepted', () => {
		// documented fidelity gap: stringShape/numberShape DSL has no exclusive
		// bound option, so the exclusive bound degrades to "unconstrained".
		const schema: JsonSchema = { type: 'number', exclusiveMinimum: 0 }
		expect(compileSchemaGuard(schema)(0)).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))(0)).toBe(true)
	})

	it('multipleOf: DROPPED — a non-multiple is accepted', () => {
		// documented fidelity gap: numberShape has no multipleOf option.
		const schema: JsonSchema = { type: 'integer', multipleOf: 3 }
		expect(compileSchemaGuard(schema)(10)).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))(10)).toBe(true)
	})

	it('uniqueItems: DROPPED — duplicate elements accepted', () => {
		// documented fidelity gap: arrayShape has no uniqueItems option.
		const schema: JsonSchema = { type: 'array', items: { type: 'number' }, uniqueItems: true }
		expect(compileSchemaGuard(schema)([1, 1])).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))([1, 1])).toBe(true)
	})

	it('patternProperties: DROPPED — a value violating the pattern schema accepted', () => {
		// documented fidelity gap: objectShape has no patternProperties option.
		// The object's OWN additionalProperties policy is preserved; with the
		// JSON-Schema-default OPEN object, dropping `patternProperties` makes
		// the round-tripped guard strictly LOOSER (it no longer type-checks the
		// pattern-matched value). (With `additionalProperties:false` the dropped
		// pattern would instead make a CLOSED object — a DIFFERENT divergence;
		// the open case isolates the genuine "looser" gap.)
		const schema: JsonSchema = {
			type: 'object',
			patternProperties: { '^x-': { type: 'number' } },
		}
		expect(compileSchemaGuard(schema)({ 'x-a': 'no' })).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))({ 'x-a': 'no' })).toBe(true)
	})

	it('propertyNames: DROPPED — a key violating the name schema accepted', () => {
		// documented fidelity gap: objectShape has no propertyNames option.
		// Open object so the gap is the genuine "looser" case (a bad KEY is
		// accepted because the key-name constraint cannot be represented).
		const schema: JsonSchema = {
			type: 'object',
			propertyNames: { type: 'string', minLength: 3 },
			additionalProperties: true,
		}
		expect(compileSchemaGuard(schema)({ ab: 1 })).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))({ ab: 1 })).toBe(true)
	})

	it('min/maxProperties: DROPPED — out-of-range property count accepted', () => {
		// documented fidelity gap: objectShape has no min/maxProperties option.
		const schema: JsonSchema = { type: 'object', minProperties: 1 }
		expect(compileSchemaGuard(schema)({})).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))({})).toBe(true)
	})

	it('not: DROPPED — a value the negation forbids is accepted', () => {
		// documented fidelity gap: the shape DSL cannot express negation.
		const schema: JsonSchema = { not: { type: 'string' } }
		expect(compileSchemaGuard(schema)('x')).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))('x')).toBe(true)
	})

	it('if/then/else: DROPPED — a value failing the conditional is accepted', () => {
		// documented fidelity gap: the shape DSL cannot express conditional
		// application.
		const schema: JsonSchema = {
			if: { type: 'string' },
			then: { minLength: 3 },
		}
		expect(compileSchemaGuard(schema)('ab')).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))('ab')).toBe(true)
	})

	it('open-tail prefixItems: tail constraint DROPPED (tuple is closed -> prefix only)', () => {
		// documented fidelity gap: tupleShape is a CLOSED tuple; an open-tail
		// `prefixItems` + scalar `items` cannot be represented, so the tail
		// schema is dropped and only the prefix positions are constrained.
		const schema: JsonSchema = {
			type: 'array',
			prefixItems: [{ type: 'string' }],
			items: { type: 'number' },
		}
		// E2 rejects a bad tail element; the round-tripped shape (closed tuple
		// on the prefix) rejects it for a DIFFERENT reason (length), so pick a
		// case isolating the dropped tail: a single-element array passes E2
		// only if the prefix matches; a non-prefix tail mismatch is what E2
		// catches and the shape cannot.
		expect(compileSchemaGuard(schema)(['a', 'bad-tail'])).toBe(false)
		// The shape is a closed 1-tuple: it rejects ['a','bad-tail'] too (by
		// length), but ACCEPTS the lone prefix while E2 also accepts it — the
		// gap is the LOST tail typing, demonstrated by a value E2 rejects on
		// tail type that the shape would accept were the tuple open. The
		// closed-tuple mapping is the documented least-wrong representation.
		expect(compileGuard(compileSchemaShape(schema))(['a'])).toBe(true)
		expect(compileSchemaGuard(schema)(['a'])).toBe(true)
	})

	it('closed tuple SHORT array: shape is STRICTER than E2 (exact-length tuple vs no lower bound)', () => {
		// documented divergence (the one gap where the shape is STRICTER, not
		// looser): E2's `prefixItems` + `items:false` closed tuple imposes NO
		// lower length bound (it only constrains the elements PRESENT and
		// forbids elements past the prefix), so a SHORT array passes E2. The
		// `compileSchemaShape` mapping is the exact-length D1 `tupleShape`
		// (`prefixItems` + `items:false` + `minItems==maxItems==arity` is the
		// CANONICAL closed-tuple encoding `compileSchema` itself emits), which
		// rejects a short array. This is the least-wrong, round-trip-stable
		// representation (it is exactly what the forward `compileSchema`
		// produces for a `tupleShape`), tested here as a KNOWN, intended
		// divergence rather than a silent one.
		const schema: JsonSchema = {
			type: 'array',
			prefixItems: [{ type: 'string' }, { type: 'number' }],
			items: false,
		}
		expect(compileSchemaGuard(schema)(['a'])).toBe(true)
		expect(compileSchemaGuard(schema)([])).toBe(true)
		expect(compileGuard(compileSchemaShape(schema))(['a'])).toBe(false)
		expect(compileGuard(compileSchemaShape(schema))([])).toBe(false)
	})
})

// === Structural round-trip: compileSchema(compileSchemaShape(s))
//
// For the supported subset the produced shape is structurally faithful: its
// re-emitted schema, fed back through E2, agrees with the ORIGINAL schema's
// guard. Samples are chosen to avoid the separately-tracked forward
// `compileSchema` intersection/optional emit lossiness (no intersection /
// no nested-optional re-emit edge cases here).

describe('compileSchemaShape — structural round-trip compileSchema∘compileSchemaShape', () => {
	const schemas: { name: string; schema: JsonSchema; samples: readonly unknown[] }[] = [
		{
			name: 'string',
			schema: { type: 'string', minLength: 1 },
			samples: ['x', '', 1],
		},
		{
			name: 'integer bounds',
			schema: { type: 'integer', minimum: 0, maximum: 9 },
			samples: [0, 9, -1, 10, 1.5],
		},
		{
			name: 'array<string>',
			schema: { type: 'array', items: { type: 'string' } },
			samples: [['a'], [], [1], 'x'],
		},
		{
			name: 'object closed',
			schema: {
				type: 'object',
				properties: { a: { type: 'string' }, b: { type: 'number' } },
				required: ['a'],
				additionalProperties: false,
			},
			samples: [{ a: 'x' }, { a: 'x', b: 1 }, { b: 1 }, { a: 'x', extra: 1 }],
		},
		{
			// length >= arity only — the SHORT-tuple divergence (E2's
			// prefixItems closed tuple has no lower length bound, the
			// exact-length `tupleShape` does) is asserted in the documented
			// fidelity-gap block, not here.
			name: 'closed tuple (length >= arity)',
			schema: {
				type: 'array',
				prefixItems: [{ type: 'string' }, { type: 'number' }],
				items: false,
			},
			samples: [['a', 1], ['a', 1, 2], ['a', 'b']],
		},
		{
			name: 'anyOf',
			schema: { anyOf: [{ type: 'string' }, { type: 'number' }] },
			samples: ['x', 1, true],
		},
	]

	for (const { name, schema, samples } of schemas) {
		it(`re-emitted schema agrees with the original for ${name}`, () => {
			const reEmitted = compileSchema(compileSchemaShape(schema))
			expect(isJsonSchema(reEmitted)).toBe(true)
			const original = compileSchemaGuard(schema)
			const roundTrip = compileSchemaGuard(reEmitted)
			for (const sample of samples) {
				expect(
					roundTrip(sample),
					`round-trip mismatch for ${name} sample ${JSON.stringify(sample)}`,
				).toBe(original(sample))
			}
		})
	}
})

// ============================================================================
//  E4 — compileSchemaParser: JSON Schema -> an input parser/coercer
//
//  The inverse trio's third member (E2 guard, E3 shape, E4 parser). E4 is
//  DERIVED: `compileSchemaParser(s) = compileParser(compileSchemaShape(s))`,
//  so it inherits the forward `compileParser`'s B3 parse↔guard discipline,
//  B2 prototype-pollution hardening, and D3 lazy memoization, AND E3's
//  documented best-effort fidelity contract.
//
//  Two-tier parse↔guard contract under test:
//   * SUPPORTED SUBSET — E2's `compileSchemaGuard(s)` and
//     `compileGuard(compileSchemaShape(s))` agree (E3 proved this), so the
//     B3 A/B/C clauses hold for `compileSchemaParser(s)` vs
//     `compileSchemaGuard(s)`.
//   * GAP KEYWORDS — E4 is LOOSER than `compileSchemaGuard(s)` exactly where
//     E3's shape is looser (same documented fidelity gap, no new looseness).
//   * UNIVERSAL — E4 is parse↔guard-consistent with
//     `compileGuard(compileSchemaShape(s))` (its own derived shape's guard)
//     per B3, on EVERY schema.
// ============================================================================

/**
 * Assert the two-tier supported-subset symmetry: `compileSchemaParser(s)`
 * (= the derived parser) is parse↔guard-sound vs `compileSchemaGuard(s)`
 * (E2). This is the schema-pair analogue of `_helpers.ts`'s
 * `assertParseGuardSymmetry` (which is shape-keyed); it is built locally
 * here rather than modifying the shared `_helpers.ts`. Also asserts the
 * UNIVERSAL clause (C) against the parser's own derived-shape guard.
 */
function assertSchemaParseGuardSymmetry(
	schema: JsonSchema,
	samples: readonly unknown[],
): void {
	const guard = compileSchemaGuard(schema)
	const parser = compileSchemaParser(schema)
	const derivedGuard = compileGuard(compileSchemaShape(schema))
	for (const sample of samples) {
		const printed = JSON.stringify(sample) ?? String(sample)
		const accepted = guard(sample)
		const parsed = parser(sample)
		const defined = parsed !== undefined
		// Each clause is the boolean ENCODING of its parse↔guard implication
		// (`p ⇒ q` ≡ `!p || q`) asserted UNCONDITIONALLY — same semantics as
		// `_helpers.ts`'s `assertParseGuardSymmetry`, but no conditional
		// `expect` (oxlint vitest/no-conditional-expect; `_helpers.ts` is not
		// a `*.test.ts` file so the rule does not reach it, and the task
		// forbids modifying it — so the equivalent is inlined here).
		expect(
			!accepted || defined,
			`(A) guard accepts ${printed} but compileSchemaParser rejected it`,
		).toBe(true)
		expect(
			!accepted || guard(parsed),
			`(B) parsed result of accepted ${printed} no longer satisfies compileSchemaGuard`,
		).toBe(true)
		expect(
			!defined || guard(parsed),
			`(C) compileSchemaParser produced a compileSchemaGuard-invalid value from ${printed}`,
		).toBe(true)
		// (C-universal) output soundness vs the parser's OWN derived-shape
		// guard — holds for EVERY schema (gap keywords included) by B3.
		expect(
			!defined || derivedGuard(parsed),
			`(C-universal) compileSchemaParser produced a value the derived-shape guard rejects from ${printed}`,
		).toBe(true)
	}
}

describe('compileSchemaParser — supported-subset parse↔guard symmetry vs compileSchemaGuard (A/B/C)', () => {
	const cases: { name: string; schema: JsonSchema; samples: readonly unknown[] }[] = [
		{
			name: 'string min/max/pattern',
			schema: { type: 'string', minLength: 2, maxLength: 5, pattern: 'a' },
			samples: ['ab', 'a', 'abcdef', 'xax', 'bb', 1, null],
		},
		{
			name: 'integer min/max',
			schema: { type: 'integer', minimum: 0, maximum: 10 },
			samples: [0, 10, -1, 11, 3.5, 'x', Number.NaN],
		},
		{
			name: 'number bounds',
			schema: { type: 'number', minimum: -1, maximum: 1 },
			samples: [0, -1, 1, 2, Number.POSITIVE_INFINITY, 'x'],
		},
		{ name: 'boolean', schema: { type: 'boolean' }, samples: [true, false, 0, 'true'] },
		{ name: 'null', schema: { type: 'null' }, samples: [null, undefined, 0, ''] },
		{
			name: 'type union [string,null]',
			schema: { type: ['string', 'null'] },
			samples: ['x', null, 1, undefined],
		},
		{
			name: 'enum primitives',
			schema: { enum: ['a', 1, true] },
			samples: ['a', 1, true, 'b', 2, false],
		},
		{
			name: 'enum structural (const-union)',
			schema: { enum: [{ k: 1 }, [1, 2], null] },
			samples: [{ k: 1 }, [1, 2], null, { k: 2 }, [1], 'x'],
		},
		{
			name: 'const object',
			schema: { const: { kind: 'a', n: 1 } },
			samples: [{ kind: 'a', n: 1 }, { kind: 'a', n: 2 }, { kind: 'a' }, 'x'],
		},
		{
			name: 'array<number> minItems',
			schema: { type: 'array', items: { type: 'number' }, minItems: 1 },
			samples: [[1], [1, 2, 3], [], [1, 'x'], 'no'],
		},
		{
			name: 'closed tuple [string,number] (length >= arity)',
			schema: {
				type: 'array',
				prefixItems: [{ type: 'string' }, { type: 'number' }],
				items: false,
			},
			samples: [['a', 1], ['a', 1, 2], [1, 'a'], ['a', 'b'], 'no'],
		},
		{
			name: 'object person (required + optional + closed)',
			schema: {
				type: 'object',
				properties: {
					name: { type: 'string', minLength: 1 },
					age: { type: 'integer', minimum: 0 },
					bio: { type: 'string' },
				},
				required: ['name', 'age'],
				additionalProperties: false,
			},
			samples: [
				{ name: 'Ada', age: 30 },
				{ name: 'Ada', age: 30, bio: 'x' },
				{ name: '', age: 30 },
				{ name: 'Ada', age: -1 },
				{ name: 'Ada', age: 30, extra: 1 },
				{ name: 'Ada' },
				'not-an-object',
			],
		},
		{
			name: 'object open (absent additionalProperties)',
			schema: {
				type: 'object',
				properties: { a: { type: 'string' } },
				required: ['a'],
			},
			samples: [{ a: 'x' }, { a: 'x', extra: 1 }, { a: 1 }, {}],
		},
		{
			name: 'object typed additionalProperties',
			schema: {
				type: 'object',
				properties: { a: { type: 'string' } },
				required: ['a'],
				additionalProperties: { type: 'number' },
			},
			samples: [{ a: 'x' }, { a: 'x', extra: 1 }, { a: 'x', extra: 'no' }, {}],
		},
		{
			name: 'anyOf string|integer',
			schema: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer', minimum: 0 }] },
			samples: ['x', 3, '', -1, true],
		},
		{
			name: 'oneOf string|boolean (exactly-one)',
			schema: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
			samples: ['x', true, 1, null],
		},
		{
			name: 'allOf object conjunction',
			schema: {
				allOf: [
					{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
					{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
				],
			},
			samples: [{ a: 'x', b: 1 }, { a: 'x' }, { b: 1 }, {}],
		},
		{
			name: 'local $ref',
			schema: { $defs: { Id: { type: 'string', minLength: 1 } }, $ref: '#/$defs/Id' },
			samples: ['x', '', 1],
		},
		{
			name: 'recursive $ref (finite data)',
			schema: {
				$defs: {
					Node: {
						type: 'object',
						properties: {
							value: { type: 'string' },
							next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
						},
						required: ['value', 'next'],
						additionalProperties: false,
					},
				},
				$ref: '#/$defs/Node',
			},
			samples: [
				{ value: 'a', next: null },
				{ value: 'a', next: { value: 'b', next: null } },
				{ value: 'a', next: { value: 1, next: null } },
				{ value: 'a' },
				'no',
			],
		},
	]

	for (const { name, schema, samples } of cases) {
		it(`A/B/C holds vs compileSchemaGuard for ${name}`, () => {
			assertSchemaParseGuardSymmetry(schema, samples)
		})
	}
})

describe('compileSchemaParser — coercion (inherits forward compileParser coercion)', () => {
	it('numeric string -> number for {type:number} (forward parser coerces)', () => {
		// The forward `compileParser` number arm coerces a numeric string to a
		// number; the derived schema parser inherits this verbatim.
		const parse = compileSchemaParser({ type: 'number' })
		expect(parse('36')).toBe(36)
		expect(parse(36)).toBe(36)
		expect(parse('abc')).toBeUndefined()
		// Sanity: identical to compileParser(compileSchemaShape(...)).
		expect(parse('36')).toBe(compileParser(compileSchemaShape({ type: 'number' }))('36'))
	})

	it('numeric string -> integer for {type:integer}', () => {
		const parse = compileSchemaParser({ type: 'integer', minimum: 0, maximum: 120 })
		expect(parse('36')).toBe(36)
		expect(parse(-1)).toBeUndefined()
		expect(parse('3.5')).toBeUndefined()
	})

	it('number -> string coercion for {type:string} (forward parser coerces)', () => {
		// Forward string arm coerces a finite number to its string form.
		const parse = compileSchemaParser({ type: 'string' })
		expect(parse(36)).toBe('36')
		expect(parse('  hi  ')).toBe('hi')
	})

	it('parsed object is guard-valid and a fresh accumulator', () => {
		const schema: JsonSchema = {
			type: 'object',
			properties: { n: { type: 'number' } },
			required: ['n'],
			additionalProperties: false,
		}
		const parse = compileSchemaParser(schema)
		const parsed = parse({ n: '5' })
		expect(parsed).toEqual({ n: 5 })
		expect(compileSchemaGuard(schema)(parsed)).toBe(true)
	})
})

describe('compileSchemaParser — B2 prototype-pollution safe (inherited from forward compileParser)', () => {
	it('hostile __proto__/constructor/prototype keys are DROPPED, safe keys parsed', () => {
		const schema: JsonSchema = {
			type: 'object',
			properties: { safe: { type: 'string' } },
			required: ['safe'],
			additionalProperties: true,
		}
		const parse = compileSchemaParser(schema)
		assertNoPrototypePollution(() => {
			// `JSON.parse` carries `__proto__`/`constructor`/`prototype` as OWN
			// enumerable keys (it bypasses the `__proto__` setter). Typed
			// `unknown` (no `as`) — `parse` accepts `unknown`.
			const hostile: unknown = JSON.parse(
				'{"safe":"ok","__proto__":{"polluted":1},"constructor":{"x":1},"prototype":{"y":1}}',
			)
			const parsed = parse(hostile)
			// Safe key survives; the result is a clean record with NONE of the
			// dangerous keys present as an own property (B2 DROP policy).
			expect(parsed).toEqual({ safe: 'ok' })
			const hasAnyDangerousOwnKey =
				isRecord(parsed) && POLLUTION_KEYS.some((key) => Object.hasOwn(parsed, key))
			expect(
				hasAnyDangerousOwnKey,
				'parsed result retained a prototype-pollution own key',
			).toBe(false)
		})
		// Object.prototype stayed clean.
		const probe: Record<string, unknown> = {}
		expect(Reflect.get(probe, 'polluted')).toBeUndefined()
	})
})

describe('compileSchemaParser — §13 error split (compile-throw vs parser-undefined)', () => {
	it('the `false` boolean schema throws at COMPILE time (propagated from E3)', () => {
		expect(() => compileSchemaParser(false)).toThrow(/false.*boolean schema|never/i)
	})

	it('unresolvable $ref throws at COMPILE time (propagated from E1/E3)', () => {
		expect(() => compileSchemaParser({ $ref: '#/$defs/Nope' })).toThrow(/#\/\$defs\/Nope/)
	})

	it('external $ref throws at COMPILE time', () => {
		expect(() => compileSchemaParser({ $ref: 'https://x/y#/z' })).toThrow(
			/external \$ref unsupported/,
		)
	})

	it('pure-$ref-only cycle throws a precise COMPILE-time Error', () => {
		expect(() =>
			compileSchemaParser({
				$defs: { A: { $ref: '#/$defs/B' }, B: { $ref: '#/$defs/A' } },
				$ref: '#/$defs/A',
			}),
		).toThrow(/circular \$ref/i)
	})

	it('the produced parser returns undefined (NEVER throws) on bad NON-cyclic input', () => {
		const parse = compileSchemaParser({
			type: 'object',
			properties: { n: { type: 'number' } },
			required: ['n'],
			additionalProperties: false,
		})
		expect(() => parse('not-an-object')).not.toThrow()
		expect(parse('not-an-object')).toBeUndefined()
		expect(parse({ n: 'x' })).toBeUndefined()
		expect(parse(42)).toBeUndefined()
		expect(parse(null)).toBeUndefined()
	})
})

describe('compileSchemaParser — recursive $ref non-explosive (compile + finite eval)', () => {
	it('compiles and round-trips a FINITE recursive value (non-explosive)', () => {
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: {
						value: { type: 'string' },
						next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] },
					},
					required: ['value', 'next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		// Compile (schema -> shape -> forward parser) must NOT explode.
		const parse = compileSchemaParser(schema)
		const finite = { value: 'a', next: { value: 'b', next: null } }
		expect(parse(finite)).toEqual(finite)
		// Documented forward coercion (design note 3): the string arm coerces a
		// finite number to its string form, so `next.value: 1` parses to '1'
		// and the result is guard-valid (B3-sound). Use a value string
		// coercion CANNOT rescue (an object) to exercise the reject path.
		expect(parse({ value: 'a', next: { value: 1, next: null } })).toEqual({
			value: 'a',
			next: { value: '1', next: null },
		})
		expect(parse({ value: 'a', next: { value: {}, next: null } })).toBeUndefined()
		expect(parse('no')).toBeUndefined()
	})

	it('mutually-recursive $ref (A<->B) compiles and parses finite data', () => {
		const schema: JsonSchema = {
			$defs: {
				A: {
					type: 'object',
					properties: { b: { anyOf: [{ $ref: '#/$defs/B' }, { type: 'null' }] } },
					required: ['b'],
					additionalProperties: false,
				},
				B: {
					type: 'object',
					properties: { a: { anyOf: [{ $ref: '#/$defs/A' }, { type: 'null' }] } },
					required: ['a'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/A',
		}
		const parse = compileSchemaParser(schema)
		const finite = { b: { a: { b: null } } }
		expect(parse(finite)).toEqual(finite)
		expect(parse({ b: { a: { b: 1 } } })).toBeUndefined()
	})

	it('recursive $ref parser on self-cyclic DATA is now undefined (FU1), still equal to the canonical lazyShape pattern', () => {
		// FU1: the forward `compileParser` D3 `'lazy'` arm is now
		// cyclic-DATA-safe at the lazy boundary (ancestor-WeakSet +
		// MAX_RECURSION_DEPTH backstop, the §13 fix).
		// E4's produced shape has the IDENTICAL recursion profile (one stable
		// `lazyShape` thunk per `$ref` pointer) as the canonical sanctioned
		// pattern, so BOTH now return `undefined` (parse failure) on
		// self-cyclic data, NEVER RangeError (§13). Parse<->guard soundness is
		// preserved: `undefined` is the canonical parse-failure value the FU1
		// guard (which also returns false on cyclic data) rejects too. The
		// equality-to-canonical relationship still holds AND the absolute
		// correct value (undefined) is asserted directly.
		const schema: JsonSchema = {
			$defs: {
				Node: {
					type: 'object',
					properties: { next: { anyOf: [{ $ref: '#/$defs/Node' }, { type: 'null' }] } },
					required: ['next'],
					additionalProperties: false,
				},
			},
			$ref: '#/$defs/Node',
		}
		const parse = compileSchemaParser(schema)
		// Finite recursive data: handled correctly (the E4 guarantee).
		expect(parse({ next: { next: null } })).toEqual({ next: { next: null } })
		// The canonical sanctioned single-stable-thunk recursive pattern.
		const canonical: ContractShape = {
			type: 'object',
			properties: {
				next: {
					type: 'union',
					variants: [
						{ type: 'lazy', thunk: () => canonical },
						{ type: 'const', value: null },
					],
				},
			},
		}
		const canonicalParse = compileParser(canonical)
		const cyclic: Record<string, unknown> = {}
		cyclic['next'] = cyclic
		// FU1: self-cyclic data is now parse-undefined, never RangeError (§13);
		// E4's shape and the canonical pattern agree on the absolute value.
		expect(() => parse(cyclic)).not.toThrow()
		expect(parse(cyclic)).toBeUndefined()
		expect(() => canonicalParse(cyclic)).not.toThrow()
		expect(canonicalParse(cyclic)).toBeUndefined()
		expect(parse(cyclic)).toBe(canonicalParse(cyclic))
	})
})

// === Documented fidelity gaps — E4 is KNOWN-looser than compileSchemaGuard
// exactly where E3's shape is looser (same gap, no new/silent looseness).
// Each asserts E4 parses (returns a defined, derived-guard-valid value) a
// value `compileSchemaGuard` would REJECT — and that the parsed result is
// still consistent with the parser's OWN derived-shape guard (B3 universal).

describe('compileSchemaParser — documented fidelity gaps (KNOWN-looser than compileSchemaGuard, by design — same as E3)', () => {
	function assertGapLooser(schema: JsonSchema, value: unknown): void {
		// compileSchemaGuard REJECTS the value (E2 enforces the gap keyword).
		expect(compileSchemaGuard(schema)(value)).toBe(false)
		// E4 ACCEPTS it (parses to a defined value) — the documented fidelity
		// gap inherited verbatim from E3's shape.
		const parsed = compileSchemaParser(schema)(value)
		expect(parsed).not.toBeUndefined()
		// UNIVERSAL B3: the parsed value still satisfies the parser's OWN
		// derived-shape guard (no NEW/silent looseness beyond E3's gap).
		expect(compileGuard(compileSchemaShape(schema))(parsed)).toBe(true)
	}

	it('format: DROPPED — E4 parses a value E2 rejects (documented fidelity gap)', () => {
		assertGapLooser({ type: 'string', format: 'email' }, 'not-an-email')
	})

	it('exclusiveMinimum/Maximum: DROPPED — boundary value parsed (documented fidelity gap)', () => {
		assertGapLooser({ type: 'number', exclusiveMinimum: 0 }, 0)
	})

	it('multipleOf: DROPPED — a non-multiple is parsed (documented fidelity gap)', () => {
		assertGapLooser({ type: 'integer', multipleOf: 3 }, 10)
	})

	it('uniqueItems: DROPPED — duplicate elements parsed (documented fidelity gap)', () => {
		assertGapLooser({ type: 'array', items: { type: 'number' }, uniqueItems: true }, [1, 1])
	})

	it('patternProperties: DROPPED — pattern-violating value parsed (documented fidelity gap)', () => {
		assertGapLooser(
			{ type: 'object', patternProperties: { '^x-': { type: 'number' } } },
			{ 'x-a': 'no' },
		)
	})

	it('propertyNames: DROPPED — name-violating key parsed (documented fidelity gap)', () => {
		assertGapLooser(
			{
				type: 'object',
				propertyNames: { type: 'string', minLength: 3 },
				additionalProperties: true,
			},
			{ ab: 1 },
		)
	})

	it('min/maxProperties: DROPPED — out-of-range count parsed (documented fidelity gap)', () => {
		assertGapLooser({ type: 'object', minProperties: 1 }, {})
	})

	it('not: DROPPED — a value the negation forbids is parsed (documented fidelity gap)', () => {
		assertGapLooser({ not: { type: 'string' } }, 'x')
	})

	it('if/then/else: DROPPED — a value failing the conditional is parsed (documented fidelity gap)', () => {
		assertGapLooser({ if: { type: 'string' }, then: { minLength: 3 } }, 'ab')
	})

	it('open-tail prefixItems: tail constraint DROPPED (closed tuple of prefix — documented fidelity gap)', () => {
		// E3 maps open-tail prefixItems to the CLOSED tuple of the prefix;
		// E4's parser inherits that. The lone prefix is parsed (E2 also
		// accepts it) while the lost tail typing is the documented gap.
		const schema: JsonSchema = {
			type: 'array',
			prefixItems: [{ type: 'string' }],
			items: { type: 'number' },
		}
		const parse = compileSchemaParser(schema)
		expect(parse(['a'])).toEqual(['a'])
		expect(compileGuard(compileSchemaShape(schema))(parse(['a']))).toBe(true)
	})
})

// ============================================================================
//  F3 — SYSTEMATIC INVERSE-SURFACE SWEEPS
//
//  Sweep 3 (inverse) — prototype-pollution through compileSchemaParser for
//  every object-building JSON-Schema kind.
//  Sweep 4 (inverse) — cycle-safety: cyclic DATA through compileSchemaGuard
//  representative schemas; cyclic SHAPE through compile* (covered in
//  compilers.test.ts; this file adds the inverse compileSchemaGuard side).
// ============================================================================

describe('F3 — prototype-pollution sweep — compileSchemaParser (E4) object-building schemas', () => {
	// E4 = compileParser(compileSchemaShape(s)), so B2 pollution hardening must
	// hold for every object-building JSON Schema kind.

	function makeHostile(): unknown {
		return JSON.parse(
			'{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1},"safe":"ok"}',
		)
	}

	function assertInverseClean(parsed: unknown): void {
		expect(
			(({}) as Record<string, unknown>)['polluted'],
			'Object.prototype polluted via compileSchemaParser',
		).toBeUndefined()
		// Unconditional combined check — avoids oxlint vitest/no-conditional-expect.
		const dangerousKeyPresent =
			isRecord(parsed) &&
			POLLUTION_KEYS.some((key) => Object.hasOwn(parsed, key))
		expect(dangerousKeyPresent, 'E4 parsed result retained a dangerous own key').toBe(false)
	}

	it('closed object schema — drops dangerous keys, keeps safe', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				type: 'object',
				properties: { safe: { type: 'string' } },
				required: ['safe'],
				additionalProperties: false,
			})
			const parsed = parse(makeHostile())
			expect(parsed).toEqual({ safe: 'ok' })
			assertInverseClean(parsed)
		})
	})

	it('open object schema (additionalProperties:true) — drops dangerous keys', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				type: 'object',
				properties: { safe: { type: 'string' } },
				required: ['safe'],
				additionalProperties: true,
			})
			const parsed = parse(makeHostile())
			expect(parsed).toEqual({ safe: 'ok' })
			assertInverseClean(parsed)
		})
	})

	it('object with typed additionalProperties — drops dangerous keys, validates extras', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				type: 'object',
				properties: { safe: { type: 'string' } },
				required: ['safe'],
				additionalProperties: { type: 'number' },
			})
			const hostile: unknown = JSON.parse(
				'{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1},"safe":"ok","score":7}',
			)
			const parsed = parse(hostile)
			expect(parsed).toEqual({ safe: 'ok', score: 7 })
			assertInverseClean(parsed)
		})
	})

	it('allOf object conjunction — drops dangerous keys from merged result', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				allOf: [
					{ type: 'object', properties: { safe: { type: 'string' } }, required: ['safe'] },
					{ type: 'object', properties: { n: { type: 'integer' } }, required: ['n'] },
				],
			})
			const hostile: unknown = JSON.parse(
				'{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1},"safe":"ok","n":3}',
			)
			const parsed = parse(hostile)
			assertInverseClean(parsed)
		})
	})

	it('anyOf with object variant — drops dangerous keys from matched object variant', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				anyOf: [
					{ type: 'object', properties: { safe: { type: 'string' } }, required: ['safe'], additionalProperties: false },
					{ type: 'string' },
				],
			})
			const parsed = parse(makeHostile())
			assertInverseClean(parsed)
		})
	})

	it('array of objects — drops dangerous keys from each array element', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				type: 'array',
				items: {
					type: 'object',
					properties: { safe: { type: 'string' } },
					required: ['safe'],
					additionalProperties: false,
				},
			})
			const hostile: unknown = JSON.parse(
				'[{"__proto__":{"polluted":true},"safe":"ok"},{"safe":"also"}]',
			)
			const parsed = parse(hostile)
			if (Array.isArray(parsed)) {
				for (const item of parsed) {
					assertInverseClean(item)
				}
			}
		})
	})

	it('$ref resolving to object — drops dangerous keys', () => {
		assertNoPrototypePollution(() => {
			const parse = compileSchemaParser({
				$defs: {
					SafeObj: {
						type: 'object',
						properties: { safe: { type: 'string' } },
						required: ['safe'],
						additionalProperties: false,
					},
				},
				$ref: '#/$defs/SafeObj',
			})
			const parsed = parse(makeHostile())
			expect(parsed).toEqual({ safe: 'ok' })
			assertInverseClean(parsed)
		})
	})
})

describe('F3 — cycle-safety sweep — compileSchemaGuard on cyclic data (E2 §13)', () => {
	// E2: compileSchemaGuard must return false on cyclic data, never throw.
	// These are new cross-kind cases beyond the targeted E2 §13 tests above.

	it('cyclic DATA through type:object schema — false, not RangeError', () => {
		const cycArr = makeCyclicArray()
		const cycObj = makeCyclicObject()
		const g = compileSchemaGuard({
			type: 'object',
			properties: { x: { type: 'string' } },
			required: ['x'],
			additionalProperties: false,
		})
		expect(() => g(cycArr)).not.toThrow()
		expect(g(cycArr)).toBe(false)
		expect(() => g(cycObj)).not.toThrow()
		// cycObj has `self` which is an extra key → closed → false
		expect(g(cycObj)).toBe(false)
	})

	it('cyclic DATA through type:array schema — false, not RangeError', () => {
		const cycArr = makeCyclicArray()
		const g = compileSchemaGuard({ type: 'array', items: { type: 'string' } })
		expect(() => g(cycArr)).not.toThrow()
		expect(g(cycArr)).toBe(false)
	})

	it('cyclic DATA through allOf schema — false, not RangeError', () => {
		const cycObj = makeCyclicObject()
		const g = compileSchemaGuard({
			allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
				{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
			],
		})
		expect(() => g(cycObj)).not.toThrow()
		expect(g(cycObj)).toBe(false)
	})

	it('cyclic DATA through anyOf schema — false, not RangeError', () => {
		const cycArr = makeCyclicArray()
		const cycObj = makeCyclicObject()
		const g = compileSchemaGuard({
			anyOf: [{ type: 'string' }, { type: 'integer' }],
		})
		expect(() => g(cycArr)).not.toThrow()
		expect(g(cycArr)).toBe(false)
		expect(() => g(cycObj)).not.toThrow()
		expect(g(cycObj)).toBe(false)
	})

	it('cyclic DATA through oneOf schema — false, not RangeError', () => {
		const cycArr = makeCyclicArray()
		const g = compileSchemaGuard({
			oneOf: [{ type: 'string' }, { type: 'number' }],
		})
		expect(() => g(cycArr)).not.toThrow()
		expect(g(cycArr)).toBe(false)
	})

	it('cyclic DATA through type:null schema — false, not RangeError', () => {
		const cycObj = makeCyclicObject()
		const g = compileSchemaGuard({ type: 'null' })
		expect(() => g(cycObj)).not.toThrow()
		expect(g(cycObj)).toBe(false)
	})
})

describe('F3 — cycle-safety sweep — cyclic SHAPE through forward compile* (forward only; schema.test.ts addendum)', () => {
	// Verifies the B5 precise-cyclic-error contract for cyclic SHAPES fed to
	// compileGuard/compileParser/compileSchema/compileGenerator.
	// (Covered comprehensively in compilers.test.ts; these are representative
	// addendum cases verifying the contract holds from this test module's
	// imports as well.)
	const CYCLIC_MSG = 'cyclic ContractShape: use a lazy/deferred shape for recursion'

	function expectCyclicError(run: () => void): void {
		expect(run).toThrow(Error)
		expect(run).not.toThrow(RangeError)
		expect(run).toThrow(CYCLIC_MSG)
	}

	it('makeCyclicShape() → precise B5 Error from compileGuard and compileParser', () => {
		expectCyclicError(() => compileGuard(makeCyclicShape()))
		expectCyclicError(() => compileParser(makeCyclicShape()))
	})

	it('cyclic shape through defaultShape inner → precise B5 Error', () => {
		// `defaultShape`'s `inner` is recursed by assertAcyclicShape; a cycle
		// through it must also throw B5.
		const makeDefaultCyclic = (): ContractShape => {
			const props: Record<string, ContractShape> = { name: stringShape({ min: 1 }) }
			const shape = objectShape(props)
			props['self'] = defaultShape(shape, { name: 'x' })
			return shape
		}
		expectCyclicError(() => compileGuard(makeDefaultCyclic()))
		expectCyclicError(() => compileParser(makeDefaultCyclic()))
	})
})

describe('F3 — assertParseGuardSymmetry sweep — representative inverse JSON-Schema kinds (E3/E4 cross-check)', () => {
	// assertParseGuardSymmetry uses the FORWARD compileGuard/compileParser.
	// For shapes produced by compileSchemaShape this exercises the same contracts
	// as the E3/E4 per-phase tests but from a cross-surface (compilers↔schema)
	// perspective without duplicating exact cases.

	it('compileSchemaShape of string/number/integer/boolean — symmetry holds', () => {
		assertParseGuardSymmetry(compileSchemaShape({ type: 'string', minLength: 1 }), ['a', '', 0, null])
		assertParseGuardSymmetry(compileSchemaShape({ type: 'number', minimum: 0 }), [0, -1, '3', 'x'])
		assertParseGuardSymmetry(compileSchemaShape({ type: 'integer', minimum: 1, maximum: 9 }), [1, 9, 0, 10, 1.5, 'x'])
		assertParseGuardSymmetry(compileSchemaShape({ type: 'boolean' }), [true, false, 1, 'true', null])
	})

	it('compileSchemaShape of array/closed-tuple — symmetry holds', () => {
		assertParseGuardSymmetry(
			compileSchemaShape({ type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 3 }),
			[[1], [1, 2, 3], [], [1, 2, 3, 4], [1, 'x'], 'no'],
		)
		assertParseGuardSymmetry(
			compileSchemaShape({
				type: 'array',
				prefixItems: [{ type: 'string' }, { type: 'number' }],
				items: false,
			}),
			[['a', 1], ['a', 1, 2], [1, 'a'], ['a', 'b'], 'no'],
		)
	})

	it('compileSchemaShape of object (closed + open + additionalProperties:schema) — symmetry holds', () => {
		assertParseGuardSymmetry(
			compileSchemaShape({
				type: 'object',
				properties: { name: { type: 'string', minLength: 1 }, age: { type: 'integer', minimum: 0 } },
				required: ['name', 'age'],
				additionalProperties: false,
			}),
			[{ name: 'Ada', age: 30 }, { name: '', age: 30 }, { name: 'Ada' }, 'nope', null],
		)
		assertParseGuardSymmetry(
			compileSchemaShape({
				type: 'object',
				properties: { a: { type: 'string' } },
				required: ['a'],
				additionalProperties: { type: 'number' },
			}),
			[{ a: 'x' }, { a: 'x', extra: 1 }, { a: 'x', extra: 'no' }, {}],
		)
	})

	it('compileSchemaShape of anyOf/oneOf/allOf — symmetry holds', () => {
		assertParseGuardSymmetry(
			compileSchemaShape({ anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer', minimum: 0 }] }),
			['', 'hi', -1, 0, 5, true],
		)
		assertParseGuardSymmetry(
			compileSchemaShape({ allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
				{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
			] }),
			[{ a: 'x', b: 1 }, { a: 'x' }, { b: 1 }, {}, 'nope'],
		)
	})
})

describe('F3 — assertGeneratorSatisfiesGuard sweep — shapes produced by compileSchemaShape', () => {
	// Verifies generator∘guard holds on shapes produced by the inverse pipeline.

	it('primitive shapes from compileSchemaShape', () => {
		assertGeneratorSatisfiesGuard(compileSchemaShape({ type: 'string', minLength: 1 }), [1, 2, 3, 7])
		assertGeneratorSatisfiesGuard(compileSchemaShape({ type: 'integer', minimum: 0, maximum: 9 }), [1, 2, 3, 7])
		assertGeneratorSatisfiesGuard(compileSchemaShape({ type: 'boolean' }), [1, 2, 3, 7])
	})

	it('array + closed tuple shapes from compileSchemaShape', () => {
		assertGeneratorSatisfiesGuard(
			compileSchemaShape({ type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 1, maxItems: 3 }),
			[1, 2, 3, 7],
		)
		assertGeneratorSatisfiesGuard(
			compileSchemaShape({
				type: 'array',
				prefixItems: [{ type: 'string' }, { type: 'integer' }],
				items: false,
			}),
			[1, 2, 3, 7],
		)
	})

	it('object shape from compileSchemaShape', () => {
		assertGeneratorSatisfiesGuard(
			compileSchemaShape({
				type: 'object',
				properties: { name: { type: 'string', minLength: 1 }, count: { type: 'integer', minimum: 0 } },
				required: ['name', 'count'],
				additionalProperties: false,
			}),
			[1, 2, 3, 7],
		)
	})

	it('anyOf shape from compileSchemaShape', () => {
		assertGeneratorSatisfiesGuard(
			compileSchemaShape({ anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer', minimum: 0 }] }),
			[1, 2, 3, 7],
		)
	})

	it('recursive $ref shape from compileSchemaShape — terminates when optional wrapper provides base case', () => {
		// The D3 generator terminates when the recursive child is optional or in an array.
		// Here the recursive `next` is optional (not in `required`), giving the generator
		// a finite-inhabitant base case (omit `next`). This mirrors the E3/D3 contract:
		// the `lazyShape` generator terminates when an optional/array wrapper exists.
		assertGeneratorSatisfiesGuard(
			compileSchemaShape({
				$defs: {
					Node: {
						type: 'object',
						properties: {
							value: { type: 'string', minLength: 1 },
							next: { $ref: '#/$defs/Node' },
						},
						required: ['value'],
						additionalProperties: false,
					},
				},
				$ref: '#/$defs/Node',
			}),
			[1, 2, 3],
		)
	})
})
