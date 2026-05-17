import type { ContractShape, Guard, JsonSchema, JsonSchemaObject } from './types.js'
import { compileGuard, compileParser } from './compilers.js'
import { isJsonSchema, isJsonSchemaObject, isNumber, isRecord, isString } from './validators.js'

// === Primitive Parsers

/**
 * Parse an unknown value to a trimmed non-empty string, or `undefined`.
 *
 * @param value - The value to parse
 * @returns Trimmed string when valid, `undefined` otherwise
 */
export function parseString(value: unknown): string | undefined {
	if (!isString(value)) return undefined
	const trimmed = value.trim()
	if (trimmed === '') return undefined
	return trimmed
}

/**
 * Parse an unknown value to a finite number, or `undefined`.
 *
 * Accepts numbers directly or numeric strings. Returns `undefined`
 * for NaN, ±Infinity, or non-numeric types.
 *
 * @param value - The value to parse
 * @returns Finite number when valid, `undefined` otherwise
 */
export function parseNumber(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined
	}
	if (typeof value === 'string') {
		if (value.trim() === '') return undefined
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : undefined
	}
	return undefined
}

/**
 * Parse an unknown value to a finite integer, or `undefined`.
 *
 * @param value - The value to parse
 * @returns Integer when valid, `undefined` otherwise
 */
export function parseInteger(value: unknown): number | undefined {
	const num = parseNumber(value)
	if (num === undefined) return undefined
	return Number.isInteger(num) ? num : undefined
}

/**
 * Parse an unknown value to a boolean, or `undefined`.
 *
 * Accepts actual booleans, the strings `"true"` / `"false"`,
 * and the numbers `1` / `0`.
 *
 * @param value - The value to parse
 * @returns Boolean when valid, `undefined` otherwise
 */
export function parseBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value
	if (value === 'true' || value === '1' || value === 1) return true
	if (value === 'false' || value === '0' || value === 0) return false
	return undefined
}

// === Structural Parsers

/**
 * Parse an unknown value as a plain record with string keys.
 *
 * @remarks
 * Alias-vs-copy policy (§15/§22): on success this returns the INPUT object BY
 * REFERENCE, never a clone. This is a pure type-narrowing parser — it asserts
 * shape, it does not normalise — so callers observe the same identity (and any
 * later mutation of the source is visible). Mirrors {@link coerceRecord}'s
 * valid-input path; contrast {@link parseArray}'s no-guard branch, which
 * deliberately returns a fresh shallow copy.
 *
 * @param value - The value to parse
 * @returns The record (the input reference) when valid, `undefined` otherwise
 */
export function parseRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined
}

/**
 * Parse an unknown value as a JSON Schema node.
 *
 * @param value - The value to parse
 * @returns The JSON Schema when valid, `undefined` otherwise
 */
export function parseJsonSchema(value: unknown): JsonSchema | undefined {
	return isJsonSchema(value) ? value : undefined
}

/**
 * Parse an unknown value as an object-root JSON Schema.
 *
 * @param value - The value to parse
 * @returns The object schema when valid, `undefined` otherwise
 */
export function parseJsonSchemaObject(value: unknown): JsonSchemaObject | undefined {
	return isJsonSchemaObject(value) ? value : undefined
}

/**
 * Narrow an unknown value against a compiled shape guard.
 *
 * Compiles `shape` on every call. If you need to guard the same shape
 * repeatedly, compile once with {@link compileGuard} and reuse the result.
 *
 * @param value - The value to narrow
 * @param shape - The contract shape to compile and check against
 * @returns `true` when `value` satisfies the shape; narrows to `T`
 *
 * @example
 * ```ts
 * const userShape = objectShape({ name: stringShape({ min: 1 }), age: integerShape() })
 * if (matchesShape<{ name: string; age: number }>(input, userShape)) {
 *     console.log(input.name)
 * }
 * ```
 */
export function matchesShape<T>(value: unknown, shape: ContractShape): value is T {
	return compileGuard(shape)(value)
}

/**
 * Parse and coerce an unknown value, then narrow it against a compiled shape.
 *
 * @remarks
 * Compiles `shape` on every call; prefer {@link compileParser} + {@link matchesShape}
 * (or {@link compileContract}) when calling repeatedly. The compiled parser
 * coerces and normalises input (e.g. numeric strings → numbers); the shape
 * guard then validates the normalised result. Returns `undefined` if parsing
 * or guard validation fails.
 *
 * @param body - The raw value to parse and validate
 * @param shape - The contract shape defining parsing rules and the guard
 * @returns The narrowed, parsed value or `undefined`
 *
 * @example
 * ```ts
 * const userShape = objectShape({ name: stringShape({ min: 1 }), age: integerShape() })
 * const user = parseShape<{ name: string; age: number }>(rawInput, userShape)
 * // user is typed or undefined
 * ```
 */
export function parseShape<T>(body: unknown, shape: ContractShape): T | undefined {
	const parsed = compileParser(shape)(body)
	return matchesShape<T>(parsed, shape) ? parsed : undefined
}

/**
 * Parse an unknown value as an array, optionally guarding each element.
 *
 * @remarks
 * Alias-vs-copy policy (§15/§22) — the two branches deliberately differ:
 * - **No guard:** returns a fresh shallow copy (`[...value]`). With no element
 *   contract there is nothing to assert, so this behaves as a defensive
 *   "snapshot" parser — the caller gets an array decoupled from later mutation
 *   of the source.
 * - **Guarded:** returns the INPUT array BY REFERENCE iff every element passes
 *   the guard (otherwise `undefined`). This identity-preserving result is
 *   intentional and asserted by tests — the guard makes the call a pure
 *   narrowing check, so cloning would be wasted work and would break callers
 *   relying on referential identity.
 *
 * @param value - The value to parse
 * @param guard - Optional element guard
 * @returns A fresh copy (no guard) or the input array by reference (guarded &
 *          all elements pass); `undefined` when not an array or a guard fails
 */
export function parseArray<T>(value: unknown, guard?: Guard<T>): readonly T[] | undefined {
	if (!Array.isArray(value)) return undefined
	if (guard === undefined) {
		return [...value]
	}
	if (value.every(guard)) return value
	return undefined
}

// === Record Field Parsers

/**
 * Read a string field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @returns Trimmed non-empty string or `undefined`
 */
export function parseStringField(record: Record<string, unknown>, key: string): string | undefined {
	return parseString(record[key])
}

/**
 * Read a number field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @returns Finite number or `undefined`
 */
export function parseNumberField(record: Record<string, unknown>, key: string): number | undefined {
	return parseNumber(record[key])
}

/**
 * Read an integer field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @returns Integer or `undefined`
 */
export function parseIntegerField(
	record: Record<string, unknown>,
	key: string,
): number | undefined {
	return parseInteger(record[key])
}

/**
 * Read a boolean field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @returns Boolean or `undefined`
 */
export function parseBooleanField(
	record: Record<string, unknown>,
	key: string,
): boolean | undefined {
	return parseBoolean(record[key])
}

// === Record Field Parsers (structural)

/**
 * Read a nested record field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @returns Plain record or `undefined`
 */
export function parseRecordField(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	return parseRecord(record[key])
}

/**
 * Read an array field from a record by key, optionally guarding elements.
 *
 * @param record - The source record
 * @param key - Property name
 * @param guard - Optional element guard
 * @returns Typed array or `undefined`
 */
export function parseArrayField<T>(
	record: Record<string, unknown>,
	key: string,
	guard?: Guard<T>,
): readonly T[] | undefined {
	return parseArray(record[key], guard)
}

// === Enum Parser

/**
 * Parse an unknown value as one of the allowed literal strings.
 *
 * @param value - The value to parse
 * @param allowed - Array of valid literal values
 * @returns The matched literal or `undefined`
 */
export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	if (!isString(value)) return undefined
	const trimmed = value.trim()
	for (const option of allowed) {
		if (trimmed === option) return option
	}
	return undefined
}

/**
 * Read an enum field from a record by key.
 *
 * @param record - The source record
 * @param key - Property name
 * @param allowed - Array of valid literal values
 * @returns The matched literal or `undefined`
 */
export function parseEnumField<T extends string>(
	record: Record<string, unknown>,
	key: string,
	allowed: readonly T[],
): T | undefined {
	return parseEnum(record[key], allowed)
}

// === JSON Parser

/**
 * Parse a JSON string into an unknown value.
 *
 * @param value - The JSON string to parse
 * @returns The parsed value, or `undefined` on failure
 */
export function parseJson(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return undefined
	}
}

/**
 * Parse a JSON string and validate the result with a guard.
 *
 * @param value - The JSON string to parse
 * @param guard - Type guard for the expected shape
 * @returns The parsed and validated value, or `undefined`
 */
export function parseJsonAs<T>(value: string, guard: Guard<T>): T | undefined {
	const parsed = parseJson(value)
	if (parsed === undefined) return undefined
	return guard(parsed) ? parsed : undefined
}

// === Coercion

/**
 * Read a string value from an unknown that might be a number.
 *
 * Useful when a field might arrive as a number in JSON but you
 * need it as a string.
 *
 * @param value - The value to coerce
 * @returns String representation or `undefined`
 */
export function coerceString(value: unknown): string | undefined {
	if (isString(value)) return value
	if (isNumber(value) && Number.isFinite(value)) return String(value)
	return undefined
}

/**
 * Coerce an unknown value to a number.
 *
 * Numeric inputs (including `NaN` and `±Infinity`) are returned as-is.
 * Strings are parsed via `parseFloat` — leading-numeric strings are accepted
 * (`'12px'` → 12, `'Infinity'` → Infinity); `undefined` is returned only when
 * `parseFloat` itself yields `NaN` (e.g. `''`, `'abc'`). Non-string,
 * non-number inputs → `undefined`.
 *
 * @param value - The value to coerce
 * @returns The number as-is (numbers), leading-numeric parse (strings), or `undefined`
 */
export function coerceNumber(value: unknown): number | undefined {
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const parsed = parseFloat(value)
		if (!Number.isNaN(parsed)) return parsed
	}
	return undefined
}

/**
 * Coerce an unknown value to a `Record<string, unknown>`.
 *
 * @remarks
 * Total by design: unlike its `coerceString`/`coerceNumber` siblings (which
 * return `… | undefined` on failure), this coercion NEVER returns `undefined` —
 * an invalid input falls back to `{}`, so it is safe to use without a guard.
 * The verb-shape asymmetry (§4.4) is a deliberate, documented exception, not an
 * oversight: a "record or nothing" call site can branch on `isRecord` directly.
 *
 * Alias-vs-copy policy (§15/§22): a valid record is returned BY REFERENCE (same
 * identity as the input — like {@link parseRecord}); only an invalid input is
 * replaced, and then with a FRESH empty object (never a shared singleton, so
 * callers can safely mutate the fallback without cross-talk). It never clones a
 * valid input.
 *
 * @param value - The value to coerce
 * @returns The input record by reference when valid, otherwise a fresh `{}`
 */
export function coerceRecord(value: unknown): Record<string, unknown> {
	if (isRecord(value)) return value
	return {}
}
