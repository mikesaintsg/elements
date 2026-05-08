// ============================================================================
// Event surface — TS-side shape validation.
//
// Initial scope ships an empty events object — composables come later. This
// test pins the shape contract so future additions follow it:
//   elements:{source}:{verb}    where {verb} is in the lifecycle vocabulary.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { events } from '@src/browser'

const LIFECYCLE_VERBS = new Set([
	'open',
	'close',
	'show',
	'hide',
	'start',
	'stop',
	'pause',
	'resume',
	'abort',
	'destroy',
	'select',
	'deselect',
	'focus',
	'blur',
])

const EVENT_PATTERN = /^elements:[a-z][a-z-]*:[a-z]+$/

function eventValues(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(eventValues)
}

describe('events — shape', () => {
	it('initial scope is empty (composables come later)', () => {
		expect(Object.keys(events)).toEqual([])
	})

	it('any future entry follows the elements:{source}:{verb} pattern', () => {
		// When entries get added, the regex + vocabulary checks below catch
		// drift from the convention. Empty for now — these loops are no-ops.
		for (const value of eventValues(events)) {
			expect(value).toMatch(EVENT_PATTERN)
			const verb = value.split(':')[2]
			expect(LIFECYCLE_VERBS.has(verb!)).toBe(true)
		}
	})
})
