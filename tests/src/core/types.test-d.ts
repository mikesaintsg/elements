// === @elements/core — compile-time type regression suite (D2.5)
//
// PURPOSE — make `npm run check` (`vue-tsc --noEmit --project tsconfig.json`)
// go RED if the public-API typing of `compileContract`/`compileGuard`/
// `compileParser`/`compileSchema` over the const-generic combinator builders
// regresses. Two distinct regressions are guarded:
//
//   1. TS2589 — "Type instantiation is excessively deep and possibly
//      infinite". The realistic consumer pattern
//      `const c = compileContract(<combinatorShape>); c.parse(x)` made
//      `compileContract<S>(): ContractInterface<Infer<S>>` eagerly
//      materialize the recursive `Infer<S>` over a builder return type that
//      is a precise const-generic literal INTERSECTED with the wide member
//      interface; the structural dispatch + the tuple-intersected-array list
//      pollution exploded past TS's instantiation limit.
//   2. PRECISION COLLAPSE — even where it did not error, the old `Infer`
//      leaked the wide interface's `Readonly<Record<string, ContractShape>>`
//      index signature into every object (`{ readonly [x: string]: any; … }`)
//      and widened `tuple`/`union`/`intersection`/deep shapes to `any`.
//
// HOW IT IS EXERCISED — the project root `tsconfig.json` declares no
// `include`, so `vue-tsc --project tsconfig.json` (what `npm run check` runs)
// typechecks EVERY `.ts` under the repo, this file included. It is NOT a
// `*.test.ts`, so the vitest `src:core` project (glob
// `tests/src/core/**/*.test.ts`) does NOT collect it — the runtime test
// count is unchanged; this is a pure compile-time gate.
//
// HOW IT ASSERTS — no test framework. Every assertion is a type-level
// `export type … = AssertExact<Actual, Expected>` (each resolves to the
// literal `true` ONLY when the two types are mutually assignable as written;
// any `any`/`unknown`/index-signature widening or a lost
// optional/readonly/null modifier resolves it to `never`, and the trailing
// `extends true` constraint then fails the build). The realistic VALUE-LEVEL
// consumer pattern (`compileContract(...).parse(x)`, `.is`, `.generate`, and
// the single-purpose compilers) lives in exported functions whose return
// types are pinned the same way, so a TS2589 at those call sites also fails
// `npm run check`. No leading-underscore identifiers, no unused bindings
// (AGENTS / oxlint clean).

import {
	type Infer,
	arrayShape,
	booleanShape,
	compileContract,
	compileGuard,
	compileParser,
	compileSchema,
	createRandom,
	integerShape,
	intersectionShape,
	literalShape,
	nullableShape,
	numberShape,
	objectShape,
	oneOfShape,
	optionalShape,
	rawShape,
	stringShape,
	tupleShape,
	unionShape,
} from '@elements/core'
import type { JsonSchema } from '@elements/core'

// Bidirectional (exact) type equality. Resolves to `true` only when `A` and
// `B` are mutually assignable AS WRITTEN — the `(<T>() => T extends X ? 1 :
// 2)` trick compares invariantly, so a stray `any`/`unknown`/leaked index
// signature makes it resolve to `never`. `Assert<C>` then constrains `C` to
// `true`; a `never` (regression) violates the constraint and fails the build,
// turning a precision COLLAPSE — not only a TS2589 — into a hard typecheck
// failure that `npm run check` reports.
type Exact<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
	? true
	: never
type Assert<Condition extends true> = Condition

// === 1. Tuple — the canonical TS2589 reproduction (D1 `tupleShape`)
//
// `compileContract(tupleShape(...))` is the exact pattern that tripped
// TS2589; pinning the four contract operations' types here makes the
// instantiation explosion a build failure.

export function tupleConsumer(x: unknown): {
	parsed: readonly [string, number] | undefined
	guarded: readonly [string, number] | 'no'
	generated: readonly [string, number]
	schema: JsonSchema
} {
	const contract = compileContract(tupleShape(stringShape(), integerShape()))
	const parsed = contract.parse(x)
	const guarded = contract.is(x) ? x : 'no'
	const generated = contract.generate(createRandom(1))
	return { parsed, guarded, generated, schema: contract.schema }
}

export type TupleParseExact = Assert<
	Exact<ReturnType<typeof tupleConsumer>['parsed'], readonly [string, number] | undefined>
>
export type TupleGuardFnExact = Assert<
	Exact<ReturnType<typeof compileGuard>, (value: unknown) => boolean>
>
export type TupleParseFnExact = Assert<
	Exact<ReturnType<typeof compileParser>, (value: unknown) => unknown>
>
export function tupleSingleCompilers(): {
	guard: (value: unknown) => boolean
	parse: (value: unknown) => unknown
	schema: JsonSchema
} {
	return {
		guard: compileGuard(tupleShape(stringShape(), integerShape())),
		parse: compileParser(tupleShape(stringShape(), integerShape())),
		schema: compileSchema(tupleShape(stringShape(), integerShape())),
	}
}

// === 2. Intersection — the D2 `intersectionShape` symmetric reproduction

export function interConsumer(x: unknown): {
	parsed: ({ readonly a: string } & { readonly b: number }) | undefined
	guarded: ({ readonly a: string } & { readonly b: number }) | 'no'
	generated: { readonly a: string } & { readonly b: number }
	schema: JsonSchema
} {
	const contract = compileContract(
		intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: integerShape() })),
	)
	const parsed = contract.parse(x)
	const guarded = contract.is(x) ? x : 'no'
	const generated = contract.generate(createRandom(2))
	return { parsed, guarded, generated, schema: contract.schema }
}

export type InterParseExact = Assert<
	Exact<
		ReturnType<typeof interConsumer>['parsed'],
		({ readonly a: string } & { readonly b: number }) | undefined
	>
>
export function interSingleCompilers(): {
	guard: (value: unknown) => boolean
	parse: (value: unknown) => unknown
	schema: JsonSchema
} {
	return {
		guard: compileGuard(
			intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: integerShape() })),
		),
		parse: compileParser(
			intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: integerShape() })),
		),
		schema: compileSchema(
			intersectionShape(objectShape({ a: stringShape() }), objectShape({ b: integerShape() })),
		),
	}
}

// === 3. Every primitive / wrapper / combinator kind stays PRECISE
//
// A regression to `any`, a leaked `[x: string]` index signature, or a lost
// optional/readonly/null modifier makes `Exact<…>` resolve to `never` and
// the `Assert<…>` constraint fails the build.

export type KindString = Assert<Exact<Infer<ReturnType<typeof stringShape>>, string>>
export type KindNumber = Assert<Exact<Infer<ReturnType<typeof numberShape>>, number>>
export type KindInteger = Assert<Exact<Infer<ReturnType<typeof integerShape>>, number>>
export type KindBoolean = Assert<Exact<Infer<ReturnType<typeof booleanShape>>, boolean>>
export type KindLiteral = Assert<
	Exact<Infer<ReturnType<typeof literalShape<['a', 'b', 3, true]>>>, 'a' | 'b' | 3 | true>
>
export type KindArray = Assert<
	Exact<Infer<ReturnType<typeof arrayShape<ReturnType<typeof stringShape>>>>, readonly string[]>
>
export type KindTuple = Assert<
	Exact<
		Infer<
			ReturnType<
				typeof tupleShape<[ReturnType<typeof stringShape>, ReturnType<typeof integerShape>]>
			>
		>,
		readonly [string, number]
	>
>
export type KindObject = Assert<
	Exact<
		Infer<
			ReturnType<
				typeof objectShape<{
					a: ReturnType<typeof stringShape>
					b: ReturnType<typeof optionalShape<ReturnType<typeof integerShape>>>
					c: ReturnType<typeof nullableShape<ReturnType<typeof booleanShape>>>
				}>
			>
		>,
		Readonly<{ a: string; c: boolean | null } & { b?: number }>
	>
>
export type KindUnion = Assert<
	Exact<
		Infer<
			ReturnType<
				typeof unionShape<[ReturnType<typeof stringShape>, ReturnType<typeof integerShape>]>
			>
		>,
		string | number
	>
>
export type KindOneOf = Assert<
	Exact<
		Infer<
			ReturnType<
				typeof oneOfShape<[ReturnType<typeof stringShape>, ReturnType<typeof booleanShape>]>
			>
		>,
		string | boolean
	>
>
export type KindIntersection = Assert<
	Exact<
		Infer<
			ReturnType<
				typeof intersectionShape<
					[
						ReturnType<typeof objectShape<{ a: ReturnType<typeof stringShape> }>>,
						ReturnType<typeof objectShape<{ b: ReturnType<typeof integerShape> }>>,
					]
				>
			>
		>,
		Readonly<{ a: string } & Record<never, never>> &
			Readonly<{ b: number } & Record<never, never>>
	>
>
export type KindOptional = Assert<
	Exact<Infer<ReturnType<typeof optionalShape<ReturnType<typeof stringShape>>>>, string | undefined>
>
export type KindNullable = Assert<
	Exact<Infer<ReturnType<typeof nullableShape<ReturnType<typeof numberShape>>>>, number | null>
>
export type KindRaw = Assert<Exact<Infer<ReturnType<typeof rawShape>>, unknown>>

// === 4. A deep-but-realistic nested shape (≥5 levels) stays precise
//
// object > array > tuple > object > array > union  (plus an optional ▸
// nullable ▸ object ▸ literal branch). No `any`/`unknown` collapse, no
// leaked index signature; optional/readonly/null modifiers all intact.

const deepShape = objectShape({
	id: stringShape(),
	rows: arrayShape(
		tupleShape(
			stringShape(),
			objectShape({
				n: optionalShape(integerShape()),
				tags: arrayShape(unionShape(stringShape(), booleanShape())),
			}),
		),
	),
	meta: optionalShape(nullableShape(objectShape({ k: literalShape('x', 'y') }))),
})

export type DeepExpected = Readonly<
	{
		id: string
		rows: readonly (readonly [
			string,
			Readonly<{ tags: readonly (string | boolean)[] } & { n?: number }>,
		])[]
	} & { meta?: Readonly<{ k: 'x' | 'y' } & Record<never, never>> | null }
>

export function deepConsumer(x: unknown): {
	parsed: DeepExpected | undefined
	guarded: DeepExpected | 'no'
	generated: DeepExpected
} {
	const contract = compileContract(deepShape)
	const parsed = contract.parse(x)
	const guarded = contract.is(x) ? x : 'no'
	const generated = contract.generate(createRandom(3))
	return { parsed, guarded, generated }
}

export type DeepParseExact = Assert<
	Exact<ReturnType<typeof deepConsumer>['parsed'], DeepExpected | undefined>
>
export type DeepInferExact = Assert<Exact<Infer<typeof deepShape>, DeepExpected>>
