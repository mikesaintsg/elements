import type {
	ContractInterface,
	ContractShape,
	Infer,
	JsonSchema,
	JsonSchemaMap,
	JsonSchemaObject,
	ObjectShape,
	RandomFunction,
} from './types.js'
import { parseBoolean, parseInteger, parseNumber, parseString } from './parsers.js'
import { isRecord } from './validators.js'

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
				items: compileSchema(shape.items),
				...(shape.min !== undefined ? { minItems: shape.min } : {}),
				...(shape.max !== undefined ? { maxItems: shape.max } : {}),
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
				properties[key] = compileSchema(child)
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
			} else if (
				shape.additionalProperties !== undefined &&
				shape.additionalProperties !== false &&
				typeof shape.additionalProperties === 'object'
			) {
				result.additionalProperties = compileSchema(shape.additionalProperties)
			} else {
				result.additionalProperties = false
			}
			if (shape.description !== undefined) {
				result.description = shape.description
			}
			return result
		}
		case 'union': {
			const compiled = shape.variants.map((variant) => compileSchema(variant))
			return {
				...(shape.mode === 'oneOf' ? { oneOf: compiled } : { anyOf: compiled }),
				...(shape.description !== undefined ? { description: shape.description } : {}),
			}
		}
		case 'optional':
			return compileSchema(shape.inner)
		case 'nullable':
			return { anyOf: [compileSchema(shape.inner), { type: 'null' }] }
		case 'raw':
			return shape.schema
	}
}

// === Guards

/**
 * Compile a {@link ContractShape} into a runtime predicate.
 *
 * @remarks
 * The returned function is `(value: unknown) => boolean`. The
 * {@link ContractInterface} wraps it in a typed `Guard<T>` predicate
 * so consumers get full narrowing.
 *
 * @param shape - The shape to compile
 * @returns A runtime predicate for the shape
 */
export function compileGuard(shape: ContractShape): (value: unknown) => boolean {
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
			const itemGuard = compileGuard(shape.items)
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
					guard: compileGuard(child),
					optional: child.type === 'optional',
				})
			}
			const allowed = new Set(entries.map((entry) => entry.key))
			const additionalGuard =
				shape.additionalProperties !== undefined &&
				shape.additionalProperties !== true &&
				shape.additionalProperties !== false &&
				typeof shape.additionalProperties === 'object'
					? compileGuard(shape.additionalProperties)
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
			const guards = shape.variants.map((variant) => compileGuard(variant))
			return (value) => guards.some((guard) => guard(value))
		}
		case 'optional': {
			const guard = compileGuard(shape.inner)
			return (value) => value === undefined || guard(value)
		}
		case 'nullable': {
			const guard = compileGuard(shape.inner)
			return (value) => value === null || guard(value)
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
 * The returned parser coerces and normalizes input. It returns the
 * parsed value on success or `undefined` on failure. Object parsers
 * fail the whole record on any required-field failure.
 *
 * @param shape - The shape to compile
 * @returns A runtime parser for the shape
 */
export function compileParser(shape: ContractShape): (value: unknown) => unknown {
	switch (shape.type) {
		case 'string':
			return parseString
		case 'number':
			return shape.integer === true ? parseInteger : parseNumber
		case 'boolean':
			return parseBoolean
		case 'literal': {
			const allowed = new Set<unknown>(shape.values)
			return (value) => {
				if (allowed.has(value)) {
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
			const itemParser = compileParser(shape.items)
			return (value) => {
				if (!Array.isArray(value)) {
					return undefined
				}
				const result: unknown[] = []
				for (const item of value) {
					const parsed = itemParser(item)
					if (parsed === undefined) {
						return undefined
					}
					result.push(parsed)
				}
				return result
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
					parse: compileParser(child),
					optional: child.type === 'optional',
				})
			}
			const known = new Set(entries.map((entry) => entry.key))
			const additionalParser =
				shape.additionalProperties !== undefined &&
				shape.additionalProperties !== true &&
				shape.additionalProperties !== false &&
				typeof shape.additionalProperties === 'object'
					? compileParser(shape.additionalProperties)
					: undefined
			const open = shape.additionalProperties === true || additionalParser !== undefined
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
				return result
			}
		}
		case 'union': {
			const parsers = shape.variants.map((variant) => compileParser(variant))
			const guards = shape.variants.map((variant) => compileGuard(variant))
			return (value) => {
				for (let index = 0; index < parsers.length; index += 1) {
					const parser = parsers[index]
					const guard = guards[index]
					if (parser === undefined || guard === undefined) {
						continue
					}
					const parsed = parser(value)
					if (parsed !== undefined && guard(parsed)) {
						return parsed
					}
				}
				return undefined
			}
		}
		case 'optional': {
			const parser = compileParser(shape.inner)
			return (value) => (value === undefined ? undefined : parser(value))
		}
		case 'nullable': {
			const parser = compileParser(shape.inner)
			return (value) => (value === null ? null : parser(value))
		}
		case 'raw':
			return (value) => value
	}
}

// === Generators

/**
 * Compile a {@link ContractShape} into a deterministic seed value.
 *
 * @remarks
 * Walks the shape tree producing a value of the inferred type. The
 * same shape and the same `random` seed always produce the same value,
 * which makes seed data reproducible across test runs.
 *
 * @param shape - The shape to generate from
 * @param random - Seeded random source
 * @returns A value matching the shape
 */
export function compileGenerator(shape: ContractShape, random: RandomFunction): unknown {
	switch (shape.type) {
		case 'string': {
			const min = shape.min ?? 0
			const max = shape.max ?? Math.max(min, 12)
			const length = Math.max(min, Math.min(max, 8))
			const suffix = Math.floor(random() * 1_000_000)
				.toString()
				.padStart(length, '0')
			return `str_${suffix}`
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
			if (shape.values.length === 0) {
				throw new Error('literalShape requires at least one value')
			}
			const index = Math.floor(random() * shape.values.length)
			return shape.values[index]
		}
		case 'array': {
			const min = shape.min ?? 1
			const max = shape.max ?? Math.max(min, 3)
			const length = Math.floor(random() * (max - min + 1)) + min
			const result: unknown[] = []
			for (let index = 0; index < length; index += 1) {
				result.push(compileGenerator(shape.items, random))
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
				result[key] = compileGenerator(child, random)
			}
			return result
		}
		case 'union': {
			if (shape.variants.length === 0) {
				throw new Error('unionShape requires at least one variant')
			}
			const index = Math.floor(random() * shape.variants.length)
			const variant = shape.variants[index]
			if (variant === undefined) {
				return undefined
			}
			return compileGenerator(variant, random)
		}
		case 'optional':
			return compileGenerator(shape.inner, random)
		case 'nullable':
			return random() < 0.2 ? null : compileGenerator(shape.inner, random)
		case 'raw':
			return undefined
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
