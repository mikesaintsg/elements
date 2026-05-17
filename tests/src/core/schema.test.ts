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
//     `MAX_REF_DEPTH` (the B5-`MAX_JSON_DEPTH` analogue) throws precisely.
// ============================================================================

import { describe, expect, it } from 'vitest'
import type { JsonSchema } from '@elements/core'
import { createRefResolver, isJsonSchema, resolveRef } from '@elements/core'

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

// === createRefResolver — depth backstop (B5 `MAX_JSON_DEPTH` analogue)

describe('createRefResolver — pathological non-cyclic ref chain', () => {
	it('a `$ref` chain longer than the depth bound throws precisely', () => {
		// Build a long acyclic chain Rn → R(n-1) → … → R0 (a leaf). No
		// repeated pointer, so cycle detection cannot fire — only the
		// MAX_REF_DEPTH backstop converts this into a precise throw rather
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
