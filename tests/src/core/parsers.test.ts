import { describe, expect, it } from 'vitest'
import {
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
	parsePositiveInt,
	parseRecord,
	parseRecordField,
	parseShape,
	parseString,
	parseStringField,
	parseStringFields,
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

// === parseStringFields

describe('parseStringFields', () => {
	it('extracts specified string fields', () => {
		const body = { name: '  Alice  ', email: 'a@b.com', age: 30 }
		expect(parseStringFields(body, ['name', 'email'])).toEqual({
			name: 'Alice',
			email: 'a@b.com',
		})
	})

	it('skips fields that are not present', () => {
		const body = { name: 'Alice' }
		expect(parseStringFields(body, ['name', 'email'])).toEqual({ name: 'Alice' })
	})

	it('skips fields that fail string parsing', () => {
		const body = { name: 'Alice', count: 42 }
		expect(parseStringFields(body, ['name', 'count'])).toEqual({ name: 'Alice' })
	})

	it('returns empty object when no fields match', () => {
		expect(parseStringFields({ count: 42 }, ['name'])).toEqual({})
	})

	it('returns undefined for non-record body', () => {
		expect(parseStringFields('not object', ['name'])).toBeUndefined()
		expect(parseStringFields(null, ['name'])).toBeUndefined()
		expect(parseStringFields(42, ['name'])).toBeUndefined()
	})

	it('handles empty field list', () => {
		expect(parseStringFields({ name: 'Alice' }, [])).toEqual({})
	})
})

// === parsePositiveInt

describe('parsePositiveInt', () => {
	it('parses valid positive integers', () => {
		expect(parsePositiveInt('5', 0)).toBe(5)
		expect(parsePositiveInt('0', 10)).toBe(0)
		expect(parsePositiveInt('100', 0)).toBe(100)
	})

	it('returns fallback for undefined', () => {
		expect(parsePositiveInt(undefined, 25)).toBe(25)
	})

	it('returns fallback for invalid strings', () => {
		expect(parsePositiveInt('abc', 10)).toBe(10)
		expect(parsePositiveInt('', 10)).toBe(10)
	})

	it('returns fallback for negative values', () => {
		expect(parsePositiveInt('-1', 10)).toBe(10)
		expect(parsePositiveInt('-100', 5)).toBe(5)
	})

	it('returns fallback for floats', () => {
		expect(parsePositiveInt('3.14', 10)).toBe(10)
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
