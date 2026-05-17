// ============================================================================
//  Shared core invariant helpers — the canonical soundness contracts for
//  `@elements/core`'s shape compilers.
//
//  This module is NOT a test suite. The `src:core` Vitest project collects
//  only `tests/src/core/**/*.test.ts` (see `vite.config.ts` → `srcCore`),
//  so this `_helpers.ts` file is never run as a suite — it is imported by
//  the sibling `*.test.ts` files for shared fixtures and invariant
//  assertions.
//
//  House style (AGENTS.md §16.1): real implementations, never mocks.
//  Every fixture factory returns a FRESH shape per call so a test that
//  mutates a shape cannot leak into another test.
//
//  The parse↔guard (§4) and generator∘guard (§5) statements below are the
//  single source of truth for what "sound" means across the codebase. The
//  Phase B soundness fixes (B2–B5) regress against exactly these contracts.
// ============================================================================

import type { ContractShape } from '@elements/core'
import { expect } from 'vitest'
import {
	arrayShape,
	compileGenerator,
	compileGuard,
	compileParser,
	createRandom,
	integerShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	recordShape,
	stringShape,
	unionShape,
} from '@elements/core'

// === Canonical shape fixtures

/**
 * A representative closed object shape: required `name` (non-empty string),
 * required `age` (non-negative integer), optional `bio` (string).
 *
 * @returns A fresh {@link ContractShape} every call so per-test mutation
 *          cannot leak across suites.
 */
export function createPersonShape(): ContractShape {
	return objectShape({
		name: stringShape({ min: 1 }),
		age: integerShape({ min: 0 }),
		bio: optionalShape(stringShape()),
	})
}

/**
 * A nested shape exercising object-in-object and array-of-object: an outer
 * object with an `address` sub-object and a `tags` string array.
 *
 * @returns A fresh nested {@link ContractShape} every call.
 */
export function createNestedShape(): ContractShape {
	return objectShape({
		id: stringShape({ min: 1 }),
		address: objectShape({
			city: stringShape({ min: 1 }),
			zip: stringShape({ min: 1 }),
		}),
		tags: arrayShape(stringShape({ min: 1 })),
	})
}

/**
 * A union shape (`anyOf` JSON Schema) of string | integer.
 *
 * @returns A fresh union {@link ContractShape} every call.
 */
export function createUnionShape(): ContractShape {
	return unionShape(stringShape({ min: 1 }), integerShape({ min: 0 }))
}

/**
 * A one-of shape (`oneOf` JSON Schema) of string | boolean — runtime
 * behaviour matches {@link createUnionShape}; only the emitted keyword
 * differs.
 *
 * @returns A fresh one-of {@link ContractShape} every call.
 */
export function createOneOfShape(): ContractShape {
	return oneOfShape(stringShape({ min: 1 }), integerShape({ min: 0 }))
}

/**
 * A dictionary shape — an open object with no fixed keys whose every value
 * is a number (`recordShape(numberShape())`).
 *
 * @returns A fresh record-dictionary {@link ContractShape} every call.
 */
export function createRecordDictShape(): ContractShape {
	return recordShape(numberShape())
}

// === Prototype pollution

/**
 * The attacker-controlled keys a parser or builder must never let reach
 * `Object.prototype`. Used to construct hostile inputs for
 * {@link assertNoPrototypePollution}.
 */
export const POLLUTION_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype']

/**
 * Assert that running `run()` does not pollute `Object.prototype`.
 *
 * Invariant encoded:
 *
 *   No code path reachable from `run()` may add, change, or remove an own
 *   property of `Object.prototype`. Concretely, after `run()`:
 *     1. `Object.prototype` has the exact same set of own property keys it
 *        had before (no key from {@link POLLUTION_KEYS} — or any other —
 *        was grafted on);
 *     2. a freshly created `{}` exposes no inherited sentinel value (the
 *        `({}).polluted === undefined` style check), proving the prototype
 *        chain was not tainted.
 *
 * The function is pure and deterministic: it snapshots `Object.prototype`'s
 * own keys, plants a uniquely-named sentinel probe to detect chain taint,
 * invokes `run()` (which should feed pollution-keyed input to a parser /
 * builder), asserts the invariant via `expect`, then removes any sentinel
 * it introduced and any own key `run()` grafted on so no global state
 * leaks between tests.
 *
 * @param run - Exercises a parser/builder with pollution-keyed input.
 */
export function assertNoPrototypePollution(run: () => void): void {
	const sentinelKey = `__pollution_sentinel_${Math.random().toString(36).slice(2)}__`
	const before = new Set(Object.getOwnPropertyNames(Object.prototype))

	try {
		run()

		const after = Object.getOwnPropertyNames(Object.prototype)
		const grafted = after.filter((key) => !before.has(key))
		expect(grafted, `run() grafted own keys onto Object.prototype: ${grafted.join(', ')}`).toEqual(
			[],
		)

		// A clean `{}` must not inherit a value at the sentinel key nor at
		// any pollution key — proves the prototype chain stayed untainted.
		const probe: Record<string, unknown> = {}
		expect(
			Reflect.get(probe, sentinelKey),
			'a fresh object inherited a sentinel value — Object.prototype is polluted',
		).toBeUndefined()
		for (const key of POLLUTION_KEYS) {
			if (key === 'constructor') {
				// `constructor` legitimately resolves up the chain to
				// `Object` — assert it is still the native constructor,
				// not an attacker-supplied replacement.
				expect(
					Reflect.get(probe, key),
					'Object.prototype.constructor was replaced',
				).toBe(Object)
				continue
			}
			expect(
				Object.prototype.hasOwnProperty.call(probe, key),
				`a fresh object gained own key "${key}" via prototype pollution`,
			).toBe(false)
		}
	} finally {
		// Clean every own key that wasn't there before (defensive — a
		// failing invariant must not contaminate later tests).
		for (const key of Object.getOwnPropertyNames(Object.prototype)) {
			if (!before.has(key)) {
				Reflect.deleteProperty(Object.prototype, key)
			}
		}
		Reflect.deleteProperty(Object.prototype, sentinelKey)
	}
}

// === Parse ↔ guard symmetry

/**
 * Assert the parse↔guard soundness contract for `shape` over `samples`.
 *
 * Canonical contract (the definition of parse↔guard soundness for the
 * whole codebase):
 *
 *   Let `g = compileGuard(shape)` and `p = compileParser(shape)`. For
 *   every input `x`:
 *
 *     (A) Acceptance preservation — if `g(x)` is true then `p(x)` is not
 *         `undefined`: the parser must accept everything the guard
 *         already deems valid (a value that passes the type test must
 *         survive normalization).
 *
 *     (B) Round-trip validity — if `g(x)` is true then `g(p(x))` is also
 *         true: parsing an already-valid value yields a value that still
 *         satisfies the guard (normalization is guard-stable on accepted
 *         input).
 *
 *     (C) Output soundness — whenever `p(x)` returns a defined value `y`,
 *         `g(y)` is true: the parser never emits a value the guard would
 *         reject (no path produces guard-invalid output, even from input
 *         the guard rejected).
 *
 * `undefined` is the parser's sole failure sentinel, so a shape that
 * legitimately produces `undefined` (e.g. an `optional` whose value is
 * absent) is exercised at the object level, not as a bare sample here.
 *
 * @param shape   - The shape whose parser/guard pair is under test.
 * @param samples - Inputs to check the contract against (mix accepted and
 *                   rejected values for full coverage).
 */
export function assertParseGuardSymmetry(
	shape: ContractShape,
	samples: readonly unknown[],
): void {
	const guard = compileGuard(shape)
	const parser = compileParser(shape)
	const label = describeShape(shape)

	for (const sample of samples) {
		const printed = printValue(sample)
		const accepted = guard(sample)

		if (accepted) {
			const parsed = parser(sample)
			expect(
				parsed,
				`(A) ${label}: guard accepts ${printed} but parser rejected it (returned undefined)`,
			).not.toBeUndefined()
			expect(
				guard(parsed),
				`(B) ${label}: parsed result of accepted ${printed} no longer satisfies the guard`,
			).toBe(true)
		}

		const parsed = parser(sample)
		if (parsed !== undefined) {
			expect(
				guard(parsed),
				`(C) ${label}: parser produced a guard-invalid value from ${printed}`,
			).toBe(true)
		}
	}
}

// === Generator ∘ guard

/**
 * Assert the generator∘guard soundness contract for `shape` over `seeds`.
 *
 * Canonical contract (the definition of generator∘guard soundness for the
 * whole codebase):
 *
 *   Let `gen(seed) = compileGenerator(shape, createRandom(seed))` and
 *   `g = compileGuard(shape)`. Then:
 *
 *     (A) Validity — for every `seed`, `g(gen(seed))` is true: every
 *         generated value satisfies its own shape's guard (the generator
 *         only ever produces in-contract data).
 *
 *     (B) Determinism — for every `seed`, two independent calls with a
 *         freshly seeded `createRandom(seed)` are structurally deep-equal:
 *         a seed fully determines the output.
 *
 *     (C) Variability — across the provided `seeds`, at least two
 *         structurally distinct outputs are produced, PROVIDED the shape
 *         admits variation. The heuristic: if every seed yields a
 *         deep-equal value the shape is treated as constant-output (e.g.
 *         a single-value literal, an empty-properties object) and the
 *         variability clause is skipped rather than false-failing.
 *
 * @param shape - The shape whose generator is under test.
 * @param seeds - Distinct PRNG seeds (at least two recommended for the
 *                variability clause to be meaningful).
 */
export function assertGeneratorSatisfiesGuard(
	shape: ContractShape,
	seeds: readonly number[],
): void {
	const guard = compileGuard(shape)
	const label = describeShape(shape)
	const outputs: unknown[] = []

	for (const seed of seeds) {
		const first = compileGenerator(shape, createRandom(seed))
		expect(
			guard(first),
			`(A) ${label}: generated value for seed ${seed} fails the shape's own guard`,
		).toBe(true)

		const second = compileGenerator(shape, createRandom(seed))
		expect(
			deepEquals(first, second),
			`(B) ${label}: generator is non-deterministic for seed ${seed}`,
		).toBe(true)

		outputs.push(first)
	}

	// (C) Variability — only assert when the shape actually varied across
	// seeds. A shape every seed collapses to one value (single-value
	// literal, empty object) is constant-output by construction; demanding
	// distinct outputs there would be a false failure.
	const varied = outputs.some(
		(value, index) => index > 0 && !deepEquals(value, outputs[0]),
	)
	if (varied) {
		const distinct = countDistinct(outputs)
		expect(
			distinct,
			`(C) ${label}: generator varied but produced fewer than 2 distinct outputs across ${seeds.length} seeds`,
		).toBeGreaterThanOrEqual(2)
	}
}

// === Cyclic builders

/**
 * Build a self-referential array (`a[0] === a`).
 *
 * Consumers feed this to guards/parsers to assert recursion-safe
 * termination — the compiled function must return `false` / cap depth,
 * never blow the stack with a `RangeError`.
 *
 * @returns An array whose first element is the array itself.
 */
export function makeCyclicArray(): readonly unknown[] {
	const array: unknown[] = []
	array.push(array)
	return array
}

/**
 * Build a self-referential object (`o.self === o`).
 *
 * Consumers feed this to guards/parsers to assert recursion-safe
 * termination — the compiled function must return `false` / cap depth,
 * never blow the stack with a `RangeError`.
 *
 * @returns An object with a `self` key pointing back at the object.
 */
export function makeCyclicObject(): Record<string, unknown> {
	const object: Record<string, unknown> = {}
	object['self'] = object
	return object
}

/**
 * Build a structurally cyclic {@link ContractShape}: an object shape whose
 * `self` property's shape is the object shape itself.
 *
 * The shape is constructed by handing {@link objectShape} a mutable
 * property record, then grafting the returned shape back into that same
 * record — `objectShape` passes the record through by reference, so the
 * cycle is genuine (`shape.properties.self === shape`).
 *
 * Consumers feed this to `compileGuard` / `compileParser` /
 * `compileGenerator` to assert they terminate (return false / cap depth)
 * on a cyclic shape rather than recursing until a `RangeError`.
 *
 * @returns A {@link ContractShape} that references itself.
 */
export function makeCyclicShape(): ContractShape {
	const properties: Record<string, ContractShape> = {
		name: stringShape({ min: 1 }),
	}
	const shape = objectShape(properties)
	properties['self'] = shape
	return shape
}

// === Internal structural utilities (no external deps)

/**
 * Structural deep-equality with `Object.is` leaf semantics (so `NaN`
 * equals `NaN` and `+0` differs from `-0`). Handles nested arrays and
 * plain objects; treats cyclic inputs as unequal-safe by tracking a
 * visited pair set so it cannot itself recurse forever.
 */
function deepEquals(a: unknown, b: unknown, seen: Set<unknown> = new Set()): boolean {
	if (Object.is(a, b)) {
		return true
	}
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false
	}
	if (seen.has(a)) {
		// Re-entered a cycle — defer to reference identity already
		// covered by the Object.is check above; treat as equal here so a
		// shared cyclic structure does not loop forever.
		return true
	}
	seen.add(a)

	const aArray = Array.isArray(a)
	const bArray = Array.isArray(b)
	if (aArray !== bArray) {
		return false
	}
	if (aArray && bArray) {
		if (a.length !== b.length) {
			return false
		}
		for (let index = 0; index < a.length; index += 1) {
			if (!deepEquals(a[index], b[index], seen)) {
				return false
			}
		}
		return true
	}

	const aKeys = Object.keys(a).sort()
	const bKeys = Object.keys(b).sort()
	if (aKeys.length !== bKeys.length) {
		return false
	}
	for (let index = 0; index < aKeys.length; index += 1) {
		if (aKeys[index] !== bKeys[index]) {
			return false
		}
	}
	for (const key of aKeys) {
		if (!deepEquals(Reflect.get(a, key), Reflect.get(b, key), seen)) {
			return false
		}
	}
	return true
}

/** Count structurally distinct values in a list via {@link deepEquals}. */
function countDistinct(values: readonly unknown[]): number {
	const distinct: unknown[] = []
	for (const value of values) {
		if (!distinct.some((existing) => deepEquals(existing, value))) {
			distinct.push(value)
		}
	}
	return distinct.length
}

/** A short human-readable tag for a shape, used in failure messages. */
function describeShape(shape: ContractShape): string {
	if (shape.type === 'object') {
		const keys = Object.keys(shape.properties).join(', ')
		return `object{${keys}}`
	}
	if (shape.type === 'array') {
		return `array<${shape.items.type}>`
	}
	if (shape.type === 'union') {
		return `union(${shape.variants.map((variant) => variant.type).join(' | ')})`
	}
	return shape.type
}

/** Compact, recursion-safe rendering of an arbitrary value for messages. */
function printValue(value: unknown): string {
	try {
		const seen = new WeakSet<object>()
		return JSON.stringify(value, (_key, current) => {
			if (typeof current === 'object' && current !== null) {
				if (seen.has(current)) {
					return '[Circular]'
				}
				seen.add(current)
			}
			return current
		}) ?? String(value)
	} catch {
		return String(value)
	}
}
