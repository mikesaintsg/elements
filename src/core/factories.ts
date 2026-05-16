import type {
	ContractShape,
	Infer,
	ContractInterface,
	ObjectShape,
	JsonSchema,
	JsonSchemaObject,
} from './types.js'
import { compileContract, compileSchema } from './compilers.js'

/**
 * Create a compiled contract from a shape definition.
 *
 * @param shape - The shape to compile
 * @returns A {@link ContractInterface} with schema, guard, parser, and generator
 *
 * @example
 * ```ts
 * const userContract = createContract(
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
export function createContract(shape: ContractShape): ContractInterface<unknown>
export function createContract<S extends ContractShape>(shape: S): ContractInterface<Infer<S>>
export function createContract<S extends ContractShape>(
	shape: S,
): ContractInterface<Infer<S>> | ContractInterface<unknown> {
	return compileContract(shape)
}

/**
 * Compile a shape directly to a JSON Schema document.
 *
 * @remarks
 * Convenience helper for callers that only need the schema (e.g.
 * registering a tool with an agent provider) without paying for the
 * guard, parser, and generator. Equivalent to
 * `createContract(shape).schema` but skips the wrapping class.
 *
 * @param shape - The shape to compile
 * @returns A JSON Schema document
 *
 * @example
 * ```ts
 * const schema = createSchema(
 *     objectShape({
 *         query:  stringShape({ description: 'Search query' }),
 *         limit:  optionalShape(integerShape({ min: 1, max: 100 })),
 *     }),
 * )
 * ```
 */
export function createSchema(shape: ObjectShape): JsonSchemaObject
export function createSchema<S extends ContractShape>(shape: S): JsonSchema
export function createSchema<S extends ContractShape>(shape: S): JsonSchema {
	return compileSchema(shape)
}
