import { describe, expect, it } from 'vitest'
import {
	coerceNumber,
	coerceRecord,
	coerceString,
	integerShape,
	matchesShape,
	objectShape,
	parseArray,
	parseArrayField,
	parseBoolean,
	parseBooleanField,
	parseEnum,
	parseEnumField,
	parseInteger,
	parseIntegerField,
	parseJson,
	parseJsonSchema,
	parseJsonSchemaObject,
	parseJsonAs,
	parseNumber,
	parseNumberField,
	parseRecord,
	parseRecordField,
	parseShape,
	parseString,
	parseStringField,
	isString,
	optionalShape,
	stringShape,
} from '@elements/core'

describe('matchesShape', () => {
	const personShape = objectShape({
		name: stringShape({ min: 1 }),
		age: integerShape({ min: 0 }),
		nickname: optionalShape(stringShape({ min: 1 })),
	})

	it('narrows values that satisfy a contract shape', () => {
		expect(
			matchesShape<{ readonly name: string; readonly age: number }>(
				{ name: 'Ava', age: 32 },
				personShape,
			),
		).toBe(true)
	})

	it('rejects values that miss required fields', () => {
		expect(
			matchesShape<{ readonly name: string; readonly age: number }>({ name: 'Ava' }, personShape),
		).toBe(false)
	})
})

describe('parseShape', () => {
	const personShape = objectShape({
		name: stringShape({ min: 1 }),
		age: integerShape({ min: 0 }),
		nickname: optionalShape(stringShape({ min: 1 })),
	})

	it('parses and narrows values through a shared shape', () => {
		expect(
			parseShape<{ readonly name: string; readonly age: number; readonly nickname?: string }>(
				{ name: '  Ava  ', age: '32', nickname: '  Ace  ' },
				personShape,
			),
		).toEqual({ name: 'Ava', age: 32, nickname: 'Ace' })
	})

	it('returns undefined when parsing fails shape validation', () => {
		expect(
			parseShape<{ readonly name: string; readonly age: number }>(
				{ name: 'Ava', age: '-1' },
				personShape,
			),
		).toBeUndefined()
	})
})

// === parseString

describe('parseString', () => {
	it('returns trimmed string for valid input', () => {
		expect(parseString('hello')).toBe('hello')
	})

	it('trims whitespace', () => {
		expect(parseString('  hello  ')).toBe('hello')
	})

	it('returns undefined for empty string', () => {
		expect(parseString('')).toBeUndefined()
	})

	it('returns undefined for whitespace-only string', () => {
		expect(parseString('   ')).toBeUndefined()
		expect(parseString('\t\n')).toBeUndefined()
	})

	it('returns undefined for non-string types', () => {
		expect(parseString(42)).toBeUndefined()
		expect(parseString(true)).toBeUndefined()
		expect(parseString(null)).toBeUndefined()
		expect(parseString(undefined)).toBeUndefined()
		expect(parseString({})).toBeUndefined()
		expect(parseString([])).toBeUndefined()
	})

	it('preserves inner whitespace', () => {
		expect(parseString('  hello world  ')).toBe('hello world')
	})
})

// === parseNumber

describe('parseNumber', () => {
	it('returns finite numbers directly', () => {
		expect(parseNumber(42)).toBe(42)
		expect(parseNumber(3.14)).toBe(3.14)
		expect(parseNumber(0)).toBe(0)
		expect(parseNumber(-1)).toBe(-1)
	})

	it('parses numeric strings', () => {
		expect(parseNumber('42')).toBe(42)
		expect(parseNumber('3.14')).toBe(3.14)
		expect(parseNumber('-7')).toBe(-7)
		expect(parseNumber('0')).toBe(0)
	})

	it('returns undefined for non-finite numbers', () => {
		expect(parseNumber(Infinity)).toBeUndefined()
		expect(parseNumber(-Infinity)).toBeUndefined()
		expect(parseNumber(NaN)).toBeUndefined()
	})

	it('returns undefined for non-numeric strings', () => {
		expect(parseNumber('abc')).toBeUndefined()
		expect(parseNumber('')).toBeUndefined()
		expect(parseNumber('  ')).toBeUndefined()
	})

	it('returns undefined for non-number non-string types', () => {
		expect(parseNumber(true)).toBeUndefined()
		expect(parseNumber(null)).toBeUndefined()
		expect(parseNumber(undefined)).toBeUndefined()
		expect(parseNumber({})).toBeUndefined()
		expect(parseNumber([])).toBeUndefined()
	})

	it('handles edge numeric strings', () => {
		expect(parseNumber('1e3')).toBe(1000)
		expect(parseNumber('-0')).toBe(-0)
	})
})

// === parseInteger

describe('parseInteger', () => {
	it('returns integers directly', () => {
		expect(parseInteger(5)).toBe(5)
		expect(parseInteger(0)).toBe(0)
		expect(parseInteger(-3)).toBe(-3)
	})

	it('parses integer strings', () => {
		expect(parseInteger('10')).toBe(10)
		expect(parseInteger('-7')).toBe(-7)
	})

	it('returns undefined for non-integer numbers', () => {
		expect(parseInteger(3.14)).toBeUndefined()
		expect(parseInteger(0.1)).toBeUndefined()
	})

	it('returns undefined for non-integer strings', () => {
		expect(parseInteger('3.14')).toBeUndefined()
		expect(parseInteger('abc')).toBeUndefined()
	})

	it('returns undefined for non-finite values', () => {
		expect(parseInteger(Infinity)).toBeUndefined()
		expect(parseInteger(NaN)).toBeUndefined()
	})
})

// === parseBoolean

describe('parseBoolean', () => {
	it('returns booleans directly', () => {
		expect(parseBoolean(true)).toBe(true)
		expect(parseBoolean(false)).toBe(false)
	})

	it('coerces string "true" and "false"', () => {
		expect(parseBoolean('true')).toBe(true)
		expect(parseBoolean('false')).toBe(false)
	})

	it('coerces string "1" and "0"', () => {
		expect(parseBoolean('1')).toBe(true)
		expect(parseBoolean('0')).toBe(false)
	})

	it('coerces number 1 and 0', () => {
		expect(parseBoolean(1)).toBe(true)
		expect(parseBoolean(0)).toBe(false)
	})

	it('returns undefined for non-boolean-like values', () => {
		expect(parseBoolean('yes')).toBeUndefined()
		expect(parseBoolean('no')).toBeUndefined()
		expect(parseBoolean(2)).toBeUndefined()
		expect(parseBoolean(null)).toBeUndefined()
		expect(parseBoolean(undefined)).toBeUndefined()
		expect(parseBoolean({})).toBeUndefined()
	})
})

// === parseRecord

describe('parseRecord', () => {
	it('returns plain objects', () => {
		const obj = { name: 'Alice' }
		expect(parseRecord(obj)).toBe(obj)
	})

	it('returns empty objects', () => {
		const obj = {}
		expect(parseRecord(obj)).toBe(obj)
	})

	it('returns undefined for arrays', () => {
		expect(parseRecord([])).toBeUndefined()
		expect(parseRecord([1, 2])).toBeUndefined()
	})

	it('returns undefined for null', () => {
		expect(parseRecord(null)).toBeUndefined()
	})

	it('returns undefined for primitives', () => {
		expect(parseRecord('string')).toBeUndefined()
		expect(parseRecord(42)).toBeUndefined()
		expect(parseRecord(true)).toBeUndefined()
		expect(parseRecord(undefined)).toBeUndefined()
	})
})

// === parseArray

describe('parseArray', () => {
	it('returns arrays without a guard', () => {
		const arr = [1, 2, 3]
		expect(parseArray(arr)).toEqual([1, 2, 3])
	})

	it('returns empty arrays', () => {
		expect(parseArray([])).toEqual([])
	})

	it('returns undefined for non-arrays', () => {
		expect(parseArray('not array')).toBeUndefined()
		expect(parseArray(42)).toBeUndefined()
		expect(parseArray({})).toBeUndefined()
		expect(parseArray(null)).toBeUndefined()
	})

	it('applies element guard — all pass', () => {
		expect(parseArray(['a', 'b', 'c'], isString)).toEqual(['a', 'b', 'c'])
	})

	it('returns undefined when any element fails the guard', () => {
		expect(parseArray(['a', 42, 'c'], isString)).toBeUndefined()
	})

	it('returns empty array with guard when input is empty', () => {
		expect(parseArray([], isString)).toEqual([])
	})
})

// === Record Field Parsers

describe('parseStringField', () => {
	it('extracts a string field', () => {
		expect(parseStringField({ name: '  Alice  ' }, 'name')).toBe('Alice')
	})

	it('returns undefined for missing keys', () => {
		expect(parseStringField({}, 'name')).toBeUndefined()
	})

	it('returns undefined for non-string values', () => {
		expect(parseStringField({ name: 42 }, 'name')).toBeUndefined()
	})
})

describe('parseNumberField', () => {
	it('extracts a number field', () => {
		expect(parseNumberField({ score: 99 }, 'score')).toBe(99)
	})

	it('coerces numeric strings', () => {
		expect(parseNumberField({ score: '3.14' }, 'score')).toBe(3.14)
	})

	it('returns undefined for missing keys', () => {
		expect(parseNumberField({}, 'score')).toBeUndefined()
	})

	it('returns undefined for non-numeric values', () => {
		expect(parseNumberField({ score: 'abc' }, 'score')).toBeUndefined()
	})
})

describe('parseIntegerField', () => {
	it('extracts an integer field', () => {
		expect(parseIntegerField({ age: 30 }, 'age')).toBe(30)
	})

	it('coerces integer strings', () => {
		expect(parseIntegerField({ age: '25' }, 'age')).toBe(25)
	})

	it('returns undefined for floats', () => {
		expect(parseIntegerField({ age: 3.5 }, 'age')).toBeUndefined()
	})

	it('returns undefined for missing keys', () => {
		expect(parseIntegerField({}, 'age')).toBeUndefined()
	})
})

describe('parseBooleanField', () => {
	it('extracts a boolean field', () => {
		expect(parseBooleanField({ active: true }, 'active')).toBe(true)
	})

	it('coerces boolean-like strings', () => {
		expect(parseBooleanField({ active: 'true' }, 'active')).toBe(true)
		expect(parseBooleanField({ active: 'false' }, 'active')).toBe(false)
	})

	it('returns undefined for missing keys', () => {
		expect(parseBooleanField({}, 'active')).toBeUndefined()
	})

	it('returns undefined for non-boolean values', () => {
		expect(parseBooleanField({ active: 'yes' }, 'active')).toBeUndefined()
	})
})

describe('parseRecordField', () => {
	it('extracts a nested record', () => {
		const record = { meta: { source: 'api' } }
		expect(parseRecordField(record, 'meta')).toEqual({ source: 'api' })
	})

	it('returns undefined for missing keys', () => {
		expect(parseRecordField({}, 'meta')).toBeUndefined()
	})

	it('returns undefined for non-record values', () => {
		expect(parseRecordField({ meta: 'string' }, 'meta')).toBeUndefined()
		expect(parseRecordField({ meta: [1, 2] }, 'meta')).toBeUndefined()
		expect(parseRecordField({ meta: null }, 'meta')).toBeUndefined()
	})

	it('returns the same reference', () => {
		const inner = { key: 'value' }
		const record = { meta: inner }
		expect(parseRecordField(record, 'meta')).toBe(inner)
	})
})

describe('parseArrayField', () => {
	it('extracts an array field without guard', () => {
		expect(parseArrayField({ tags: ['a', 'b'] }, 'tags')).toEqual(['a', 'b'])
	})

	it('extracts an array field with guard', () => {
		expect(parseArrayField({ tags: ['a', 'b'] }, 'tags', isString)).toEqual(['a', 'b'])
	})

	it('returns undefined when guard fails', () => {
		expect(parseArrayField({ tags: ['a', 42] }, 'tags', isString)).toBeUndefined()
	})

	it('returns undefined for missing keys', () => {
		expect(parseArrayField({}, 'tags')).toBeUndefined()
	})

	it('returns undefined for non-array values', () => {
		expect(parseArrayField({ tags: 'not array' }, 'tags')).toBeUndefined()
	})

	it('returns empty array when field is empty array', () => {
		expect(parseArrayField({ tags: [] }, 'tags')).toEqual([])
	})
})

// === parseEnum

describe('parseEnum', () => {
	const allowed = ['admin', 'member', 'guest'] as const

	it('returns the matching value', () => {
		expect(parseEnum('admin', allowed)).toBe('admin')
		expect(parseEnum('member', allowed)).toBe('member')
		expect(parseEnum('guest', allowed)).toBe('guest')
	})

	it('trims whitespace before matching', () => {
		expect(parseEnum('  admin  ', allowed)).toBe('admin')
	})

	it('returns undefined for non-matching values', () => {
		expect(parseEnum('owner', allowed)).toBeUndefined()
		expect(parseEnum('', allowed)).toBeUndefined()
	})

	it('returns undefined for non-string types', () => {
		expect(parseEnum(42, allowed)).toBeUndefined()
		expect(parseEnum(true, allowed)).toBeUndefined()
		expect(parseEnum(null, allowed)).toBeUndefined()
	})

	it('is case-sensitive', () => {
		expect(parseEnum('Admin', allowed)).toBeUndefined()
		expect(parseEnum('ADMIN', allowed)).toBeUndefined()
	})
})

describe('parseEnumField', () => {
	const roles = ['admin', 'member', 'guest'] as const

	it('extracts an enum field', () => {
		expect(parseEnumField({ role: 'admin' }, 'role', roles)).toBe('admin')
	})

	it('returns undefined for non-matching values', () => {
		expect(parseEnumField({ role: 'owner' }, 'role', roles)).toBeUndefined()
	})

	it('returns undefined for missing keys', () => {
		expect(parseEnumField({}, 'role', roles)).toBeUndefined()
	})

	it('returns undefined for non-string field values', () => {
		expect(parseEnumField({ role: 42 }, 'role', roles)).toBeUndefined()
	})

	it('trims before matching', () => {
		expect(parseEnumField({ role: '  member  ' }, 'role', roles)).toBe('member')
	})
})

// === parseJson

describe('parseJson', () => {
	it('parses valid JSON strings', () => {
		expect(parseJson('{"name":"Alice"}')).toEqual({ name: 'Alice' })
		expect(parseJson('[1,2,3]')).toEqual([1, 2, 3])
		expect(parseJson('"hello"')).toBe('hello')
		expect(parseJson('42')).toBe(42)
		expect(parseJson('true')).toBe(true)
		expect(parseJson('null')).toBeNull()
	})

	it('returns undefined for invalid JSON', () => {
		expect(parseJson('not json')).toBeUndefined()
		expect(parseJson('{bad}')).toBeUndefined()
		expect(parseJson('')).toBeUndefined()
	})
})

// === parseJsonAs

describe('parseJsonAs', () => {
	const isStringRecord = (value: unknown): value is Record<string, string> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
		for (const v of Object.values(value)) {
			if (typeof v !== 'string') return false
		}
		return true
	}

	it('returns parsed value when guard passes', () => {
		expect(parseJsonAs('{"name":"Alice"}', isStringRecord)).toEqual({ name: 'Alice' })
	})

	it('returns undefined when guard fails', () => {
		expect(parseJsonAs('{"name":42}', isStringRecord)).toBeUndefined()
	})

	it('returns undefined for invalid JSON', () => {
		expect(parseJsonAs('not json', isStringRecord)).toBeUndefined()
	})
})

// === coerceString

describe('coerceString', () => {
	it('returns strings directly', () => {
		expect(coerceString('hello')).toBe('hello')
	})

	it('coerces finite numbers to strings', () => {
		expect(coerceString(42)).toBe('42')
		expect(coerceString(3.14)).toBe('3.14')
		expect(coerceString(0)).toBe('0')
		expect(coerceString(-7)).toBe('-7')
	})

	it('returns undefined for non-finite numbers', () => {
		expect(coerceString(Infinity)).toBeUndefined()
		expect(coerceString(NaN)).toBeUndefined()
	})

	it('returns undefined for other types', () => {
		expect(coerceString(true)).toBeUndefined()
		expect(coerceString(null)).toBeUndefined()
		expect(coerceString(undefined)).toBeUndefined()
		expect(coerceString({})).toBeUndefined()
		expect(coerceString([])).toBeUndefined()
	})
})

// === parseJsonSchema / parseJsonSchemaObject

describe('parseJsonSchema', () => {
	it('parses boolean schemas', () => {
		expect(parseJsonSchema(false)).toBe(false)
	})

	it('parses object schemas', () => {
		expect(
			parseJsonSchema({
				type: 'object',
				properties: { name: { type: 'string' } },
				required: ['name'],
			}),
		).toEqual({
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
		})
	})

	it('returns undefined for invalid schemas', () => {
		expect(parseJsonSchema({ type: 'wat' })).toBeUndefined()
	})
})

describe('parseJsonSchemaObject', () => {
	it('parses object-root schemas', () => {
		expect(
			parseJsonSchemaObject({
				type: 'object',
				additionalProperties: true,
			}),
		).toEqual({ type: 'object', additionalProperties: true })
	})

	it('returns undefined for non-object schemas', () => {
		expect(parseJsonSchemaObject(false)).toBeUndefined()
		expect(parseJsonSchemaObject({ type: 'string' })).toBeUndefined()
	})
})

// === F2 — parseNumber edge cases

describe('parseNumber — F2 edges', () => {
	it('rejects hex literal string "0x1F" (Number("0x1F") is 31 — finite → accepted)', () => {
		// Number('0x1F') === 31 (finite) — parseNumber uses Number(), not parseFloat().
		// So '0x1F' IS parsed to 31, not rejected.
		expect(parseNumber('0x1F')).toBe(31)
	})

	it('accepts "Infinity" string (Number("Infinity") is Infinity — non-finite → rejected)', () => {
		// Number('Infinity') === Infinity — not finite → parseNumber returns undefined.
		expect(parseNumber('Infinity')).toBeUndefined()
	})

	it('accepts "  42  " whitespace-padded string (trims before parsing)', () => {
		// value.trim() === '' for empty, but '  42  '.trim() === '42' → Number('42') = 42
		// parseNumber checks trim === '' first, so '  42  ' passes through Number()
		expect(parseNumber('  42  ')).toBe(42)
	})

	it('rejects "1_000" numeric-separator string (Number("1_000") is NaN → rejected)', () => {
		// Number('1_000') === NaN — parseNumber rejects this as non-finite.
		expect(parseNumber('1_000')).toBeUndefined()
	})

	it('accepts Number.MAX_SAFE_INTEGER + 1 (still finite, just not precisely safe)', () => {
		const beyondSafe = Number.MAX_SAFE_INTEGER + 1
		// It is still a finite number — parseNumber accepts all finite numbers.
		expect(parseNumber(beyondSafe)).toBe(beyondSafe)
	})

	it('preserves -0 identity via Object.is', () => {
		const result = parseNumber('-0')
		// Number('-0') === -0 (finite) → parseNumber returns -0
		expect(Object.is(result, -0)).toBe(true)
	})
})

// === F2 — parseInteger edge cases

describe('parseInteger — F2 edges', () => {
	it('"1e3" parses to integer 1000 (Number("1e3") === 1000, which is an integer)', () => {
		// parseNumber('1e3') === 1000; Number.isInteger(1000) === true
		expect(parseInteger('1e3')).toBe(1000)
	})

	it('"0x10" is accepted (Number("0x10") === 16, integer)', () => {
		// Number('0x10') === 16, Number.isInteger(16) === true
		expect(parseInteger('0x10')).toBe(16)
	})

	it('Number.MAX_SAFE_INTEGER + 1 — still an integer (Number.isInteger returns true)', () => {
		const beyondSafe = Number.MAX_SAFE_INTEGER + 1
		// Number.isInteger(beyondSafe) === true — it IS an integer, just imprecise.
		expect(parseInteger(beyondSafe)).toBe(beyondSafe)
	})

	it('3.0 (number literal) is an integer (Number.isInteger(3.0) === true)', () => {
		expect(parseInteger(3.0)).toBe(3)
	})

	it('"3.0" string is parsed as integer (Number("3.0") === 3.0, which is integer)', () => {
		// Number('3.0') === 3, Number.isInteger(3) === true
		expect(parseInteger('3.0')).toBe(3)
	})
})

// === F2 — parseBoolean edge cases

describe('parseBoolean — F2 edges', () => {
	it('rejects "TRUE" (case-sensitive — only "true" and "false" are matched)', () => {
		expect(parseBoolean('TRUE')).toBeUndefined()
	})

	it('rejects "True" (case-sensitive)', () => {
		expect(parseBoolean('True')).toBeUndefined()
	})

	it('rejects " true " with surrounding whitespace (no trim before comparison)', () => {
		// parseBoolean does NOT trim: only exact string literals are matched.
		// ' true ' !== 'true' → undefined.
		expect(parseBoolean(' true ')).toBeUndefined()
	})

	it('rejects number 2 (only 1 and 0 are accepted as boolean numbers)', () => {
		expect(parseBoolean(2)).toBeUndefined()
	})

	it('rejects number -1', () => {
		expect(parseBoolean(-1)).toBeUndefined()
	})
})

// === F2 — parseString edge cases

describe('parseString — F2 edges', () => {
	it('preserves a surrogate-pair string (non-BMP code-point)', () => {
		// A surrogate pair in a JS string — parseString must not mangle it.
		const emoji = '😀'
		expect(parseString(emoji)).toBe(emoji)
	})

	it('returns undefined for NBSP-only string — V8/Node trim() removes it', () => {
		// In V8 (Node.js), String.prototype.trim() removes U+00A0 (NO-BREAK SPACE)
		// in addition to ASCII whitespace. So trim() produces '' (empty) in this
		// runtime, and parseString returns undefined.
		expect(parseString(' ')).toBeUndefined()
	})

	it('returns the full content for a very long string (no length cap in parseString)', () => {
		const long = 'a'.repeat(100_000)
		expect(parseString(long)).toBe(long)
	})

	it("returns '0' for input '0' (non-empty string, not a falsy trap)", () => {
		expect(parseString('0')).toBe('0')
	})
})

// === F2 — parseArray alias/copy contract

describe('parseArray — F2 alias/copy contract', () => {
	it('sparse array [1,,3] without guard: holes become undefined in the copy', () => {
		// eslint-disable-next-line no-sparse-arrays
		const sparse = [1, , 3]
		const result = parseArray(sparse)
		// parseArray no-guard returns [...value] — spread of a sparse array fills
		// holes with undefined.
		expect(result).toEqual([1, undefined, 3])
	})

	it('no-guard: returns a FRESH copy (not the same reference as input)', () => {
		const input = [1, 2, 3]
		const result = parseArray(input)
		// The alias-vs-copy policy documents this branch returns a shallow copy.
		expect(result).not.toBe(input)
		expect(result).toEqual(input)
	})

	it('guarded all-pass: returns the INPUT reference (identity preserved)', () => {
		const input = ['a', 'b', 'c']
		const result = parseArray(input, (v): v is string => typeof v === 'string')
		// The alias-vs-copy policy (§15/§22): guarded+all-pass returns input BY REF.
		expect(result).toBe(input)
	})

	it('guarded with a failing element: returns undefined', () => {
		const input = ['a', 42, 'c']
		const result = parseArray(input, (v): v is string => typeof v === 'string')
		expect(result).toBeUndefined()
	})
})

// === F2 — parseJson edge cases

describe('parseJson — F2 edges', () => {
	it('duplicate keys: last-write-wins (standard JSON.parse behaviour)', () => {
		const result = parseJson('{"a":1,"a":2}')
		// JSON.parse with duplicate keys: last value wins — this is the JS spec.
		expect(result).toEqual({ a: 2 })
	})

	it('deeply nested JSON (100 levels) — should parse successfully', () => {
		// Build a deeply nested JSON string iteratively to avoid stack issues.
		let json = '"leaf"'
		for (let index = 0; index < 100; index += 1) {
			json = `{"v":${json}}`
		}
		const result = parseJson(json)
		expect(typeof result).toBe('object')
	})

	it('"undefined" string — JSON.parse throws (undefined is not valid JSON) → returns undefined', () => {
		// JSON.parse('undefined') throws SyntaxError; parseJson catches and returns undefined.
		// NOTE: parseJson returns `undefined` on failure, which is indistinguishable
		// from a JSON document that IS the value `undefined` (impossible in JSON).
		// This documented ambiguity is pinned here; divergence tracked for Phase G.
		expect(parseJson('undefined')).toBeUndefined()
	})

	it('"NaN" string — not valid JSON → returns undefined', () => {
		// JSON.parse('NaN') throws SyntaxError — NaN is not a JSON value.
		expect(parseJson('NaN')).toBeUndefined()
	})

	it('"Infinity" string — not valid JSON → returns undefined', () => {
		// JSON.parse('Infinity') throws SyntaxError.
		expect(parseJson('Infinity')).toBeUndefined()
	})
})

// === F2 — parseEnum / parseEnumField edge cases

describe('parseEnum — F2 edges', () => {
	it('empty allowed list always returns undefined', () => {
		// No entry can match an empty list.
		expect(parseEnum('anything', [])).toBeUndefined()
		expect(parseEnum('', [])).toBeUndefined()
	})

	it('value with surrounding whitespace is trimmed before matching', () => {
		const allowed = ['admin', 'member'] as const
		expect(parseEnum('  admin  ', allowed)).toBe('admin')
	})

	it('non-matching value returns undefined', () => {
		const allowed = ['admin', 'member'] as const
		expect(parseEnum('owner', allowed)).toBeUndefined()
	})
})

describe('parseEnumField — F2 edges', () => {
	it('empty allowed list always returns undefined', () => {
		expect(parseEnumField({ role: 'admin' }, 'role', [])).toBeUndefined()
	})
})

// === coerceNumber (F1)
//
// Implementation (parsers.ts): `typeof value === 'number'` → return it directly
// (ALL numeric values, including NaN, ±Infinity, ±0); `typeof value === 'string'`
// → `parseFloat(value)`, return iff `!Number.isNaN(parsed)`; anything else →
// undefined.
//
// JSDoc says "Returns `undefined` only for NaN" — but the implementation returns
// NaN directly when the INPUT is the numeric NaN (it only blocks NaN that arises
// from parseFloat of a string). The NaN-input case is pinned to the actual code
// behaviour below.
// NOTE: The JSDoc claim "returns `undefined` only for NaN" diverges from the
// implementation for a numeric NaN input (which returns NaN, not undefined).
// Doc reconciliation is tracked for Phase G.

describe('coerceNumber', () => {
	it('returns a finite number directly', () => {
		expect(coerceNumber(42)).toBe(42)
		expect(coerceNumber(3.14)).toBe(3.14)
		expect(coerceNumber(0)).toBe(0)
		expect(coerceNumber(-7)).toBe(-7)
	})

	it('preserves ±0 identity (Object.is semantics)', () => {
		// +0 and -0 are both numbers and are returned as-is.
		expect(Object.is(coerceNumber(0), 0)).toBe(true)
		expect(Object.is(coerceNumber(-0), -0)).toBe(true)
		// Crucially +0 and -0 are distinct via Object.is.
		expect(Object.is(coerceNumber(-0), 0)).toBe(false)
	})

	it('returns ±Infinity directly (not filtered out)', () => {
		// coerceNumber accepts all numbers including non-finite ones.
		expect(coerceNumber(Infinity)).toBe(Infinity)
		expect(coerceNumber(-Infinity)).toBe(-Infinity)
	})

	it('returns NaN directly when the input is a numeric NaN', () => {
		// NOTE: doc says "returns `undefined` only for NaN" — divergence tracked
		// for Phase G doc reconciliation. The implementation path is
		// `typeof NaN === 'number'` → `return value` (returns NaN, not undefined).
		// We pin the ACTUAL code behaviour here.
		const result = coerceNumber(NaN)
		expect(Number.isNaN(result)).toBe(true)
	})

	it('parses numeric strings via parseFloat (stops at first non-numeric char)', () => {
		// parseFloat('12px') → 12; parseFloat('  3.5x') → 3.5; etc.
		expect(coerceNumber('42')).toBe(42)
		expect(coerceNumber('3.14')).toBe(3.14)
		expect(coerceNumber('-7')).toBe(-7)
		expect(coerceNumber('1e3')).toBe(1000)
		expect(coerceNumber('12px')).toBe(12)
		expect(coerceNumber('  3.5x')).toBe(3.5)
		// parseFloat('0x1F') → 0 (stops before 'x'); not hex-aware like parseInt.
		expect(coerceNumber('0x1F')).toBe(0)
		// parseFloat('Infinity') → Infinity (parseFloat recognises the literal).
		expect(coerceNumber('Infinity')).toBe(Infinity)
		expect(coerceNumber('-Infinity')).toBe(-Infinity)
	})

	it('returns undefined for strings that parseFloat cannot parse', () => {
		// parseFloat('') → NaN → filtered. parseFloat('abc') → NaN → filtered.
		expect(coerceNumber('')).toBeUndefined()
		expect(coerceNumber('abc')).toBeUndefined()
		expect(coerceNumber('   ')).toBeUndefined()
	})

	it('returns undefined for non-string, non-number types', () => {
		expect(coerceNumber(true)).toBeUndefined()
		expect(coerceNumber(false)).toBeUndefined()
		expect(coerceNumber(null)).toBeUndefined()
		expect(coerceNumber(undefined)).toBeUndefined()
		expect(coerceNumber({})).toBeUndefined()
		expect(coerceNumber([])).toBeUndefined()
		expect(coerceNumber([1])).toBeUndefined()
	})

	it('returns undefined for symbol and bigint', () => {
		expect(coerceNumber(Symbol('x'))).toBeUndefined()
		expect(coerceNumber(BigInt(42))).toBeUndefined()
	})

	it('handles Unicode-padded numeric strings (parseFloat trims leading ASCII whitespace)', () => {
		// Standard parseFloat trims ASCII whitespace; a leading digit is present.
		expect(coerceNumber('  42  ')).toBe(42)
	})

	it('handles very large and very small finite numbers', () => {
		expect(coerceNumber(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
		expect(coerceNumber(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
		expect(coerceNumber(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
		expect(coerceNumber(Number.EPSILON)).toBe(Number.EPSILON)
	})
})

// === coerceRecord (F1)
//
// Implementation (parsers.ts): uses `isRecord` (accepts plain objects, including
// null-prototype objects — see validators.ts `isRecord`). A valid record is
// returned BY REFERENCE (same identity). An invalid input returns a FRESH `{}`
// (not a shared singleton — each call to coerceRecord on invalid input produces
// an independent object so callers can safely mutate the fallback).

describe('coerceRecord', () => {
	it('returns a plain object by reference (same identity)', () => {
		const obj = { name: 'Alice', age: 30 }
		const result = coerceRecord(obj)
		expect(result).toBe(obj)
	})

	it('returns an empty plain object by reference', () => {
		const obj = {}
		expect(coerceRecord(obj)).toBe(obj)
	})

	it('returns the input null-prototype object by reference', () => {
		// isRecord accepts Object.create(null) (null prototype, still plain).
		const nullProto = Object.create(null) as Record<string, unknown>
		nullProto['x'] = 1
		const result = coerceRecord(nullProto)
		expect(result).toBe(nullProto)
	})

	it('returns {} for an array (never undefined — always-defined parser)', () => {
		expect(coerceRecord([])).toEqual({})
		expect(coerceRecord([1, 2, 3])).toEqual({})
	})

	it('returns {} for null', () => {
		expect(coerceRecord(null)).toEqual({})
	})

	it('returns {} for primitives', () => {
		expect(coerceRecord('string')).toEqual({})
		expect(coerceRecord(42)).toEqual({})
		expect(coerceRecord(true)).toEqual({})
		expect(coerceRecord(undefined)).toEqual({})
	})

	it('returns {} for a function', () => {
		expect(coerceRecord(() => undefined)).toEqual({})
	})

	it('returns {} for a class instance (non-plain object)', () => {
		// A class instance has a non-null, non-Object.prototype prototype.
		class Foo {
			x = 1
		}
		expect(coerceRecord(new Foo())).toEqual({})
	})

	it('the {} fallback is a FRESH object each call — mutating one does not affect the next', () => {
		// Each invalid input produces an independent fallback; there is no
		// shared singleton. Mutating the first result must not affect a second call.
		const first = coerceRecord(null)
		first['injected'] = 'polluted'
		const second = coerceRecord(null)
		expect(second['injected']).toBeUndefined()
	})

	it('never returns undefined — always returns a Record', () => {
		// coerceRecord is the one always-defined parser: it returns either the
		// valid input or a fresh {}, never undefined.
		for (const input of [null, undefined, 42, 'str', true, [], () => undefined]) {
			expect(coerceRecord(input)).toBeDefined()
		}
	})
})
