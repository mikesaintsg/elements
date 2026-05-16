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
 * @param value - The value to parse
 * @returns The record when valid, `undefined` otherwise
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

/** Narrow an unknown value against a compiled shape guard. */
export function matchesShape<T>(value: unknown, shape: ContractShape): value is T {
	return compileGuard(shape)(value)
}

/** Parse and narrow an unknown value against a compiled shape. */
export function parseShape<T>(body: unknown, shape: ContractShape): T | undefined {
	const parsed = compileParser(shape)(body)
	return matchesShape<T>(parsed, shape) ? parsed : undefined
}

/**
 * Parse an unknown value as an array, optionally guarding each element.
 *
 * @param value - The value to parse
 * @param guard - Optional element guard
 * @returns The typed array when valid, `undefined` otherwise
 */
export function parseArray<T>(value: unknown, guard?: Guard<T>): readonly T[] | undefined {
	if (!Array.isArray(value)) return undefined
	if (guard === undefined) {
		const result: T[] = []
		for (const element of value) result.push(element)
		return result
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
 * Accepts numbers directly (including ±Infinity) or numeric strings.
 * Returns `undefined` only for `NaN`.
 *
 * @param value - The value to coerce
 * @returns Number when coercible, `undefined` otherwise
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
 * @param value - The value to coerce
 * @returns The record when valid, an empty object otherwise
 */
export function coerceRecord(value: unknown): Record<string, unknown> {
	if (isRecord(value)) return value
	return {}
}

// === Batch Parsers

/**
 * Parse a record body into a partial update object, extracting only
 * the specified string fields that are present.
 *
 * @param body - The raw request body
 * @param fields - List of field names to extract
 * @returns Partial record with only present fields, or `undefined` if body is not a record
 */
export function parseStringFields(
	body: unknown,
	fields: readonly string[],
): Record<string, string> | undefined {
	if (!isRecord(body)) return undefined
	const result: Record<string, string> = {}
	for (const field of fields) {
		const val = parseString(body[field])
		if (val !== undefined) result[field] = val
	}
	return result
}

/**
 * Parse a positive integer from a query-string value with a fallback.
 *
 * @param value - Raw query parameter value
 * @param fallback - Default when value is missing or invalid
 * @returns Parsed positive integer or fallback
 */
export function parsePositiveInt(value: string | undefined, fallback: number): number {
	if (value === undefined) return fallback
	const parsed = parseInteger(value)
	if (parsed === undefined || parsed < 0) return fallback
	return parsed
}

// === Format Parsers

/**
 * Parse environment variable content (.env format) into a record.
 *
 * Supports:
 * - Comments (`#` prefix)
 * - Quoted values (`"..."` or `'...'`)
 * - Inline comments for unquoted values (`VAR=value # comment`)
 *
 * @param content - The .env file content
 * @returns Parsed environment variables as key-value pairs
 * @example
 * ```ts
 * const vars = parseEnv('HOST=localhost\nPORT=3000')
 * // { HOST: 'localhost', PORT: '3000' }
 * ```
 */
export function parseEnv(content: string): Record<string, string> {
	const result: Record<string, string> = {}
	const lines = content.split(/\r?\n/)

	for (const raw of lines) {
		const line = raw.trim()
		if (line === '' || line.startsWith('#')) continue

		const equalsIndex = line.indexOf('=')
		if (equalsIndex === -1) continue

		const key = line.slice(0, equalsIndex).trim()
		if (key === '') continue

		let value = line.slice(equalsIndex + 1).trim()

		// Strip matching quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		} else {
			// Strip inline comment (only for unquoted values)
			const commentIndex = value.indexOf(' #')
			if (commentIndex !== -1) {
				value = value.slice(0, commentIndex).trim()
			}
		}

		result[key] = value
	}

	return result
}
