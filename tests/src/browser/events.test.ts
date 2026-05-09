// ============================================================================
// Event surface — TS-side shape validation.
//
// Validates that every event name in the populated events tree follows
//   elements:{source}:{verb}
// where {verb} is in the lifecycle vocabulary, and {source} matches the
// outer key of the tree.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { events } from '@src/browser'

/** Lifecycle verb vocabulary — every third segment of every event name
 *  must appear here. Adding a verb is a deliberate framework-wide
 *  decision; bump this list and document it in events.ts. */
const LIFECYCLE_VERBS = new Set([
	// Visible-state pre/post pairs
	'show',
	'open',
	'hide',
	'close',
	'prevent',
	// Long-running operations
	'start',
	'stop',
	'pause',
	'resume',
	'abort',
	'destroy',
	// Two-state flips
	'toggle',
	// Selection
	'select',
	'deselect',
	'clear',
	// Focus / activation
	'focus',
	'blur',
	'activate',
	'deactivate',
	// Reactive data changes
	'change',
	'input',
	'create',
	'formdata',
	'invalid',
	'reset',
	'submit',
	'validate',
	// Positional / animated
	'slide',
	'place',
	// Drag pipeline
	'tap',
	'over',
	'drop',
	'end',
	'reorder',
	// Hierarchical / table actions
	'expand',
	'collapse',
	'move',
	'sort',
	'paginate',
])

const EVENT_PATTERN = /^elements:[a-z][a-z-]*:[a-z]+$/

function eventValues(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(eventValues)
}

describe('events — shape', () => {
	it('exposes one entry per composable source', () => {
		expect(Object.keys(events).length).toBeGreaterThan(0)
	})

	it('every event matches elements:{source}:{verb}', () => {
		for (const value of eventValues(events)) {
			expect(value).toMatch(EVENT_PATTERN)
		}
	})

	it('every verb is in the lifecycle vocabulary', () => {
		for (const value of eventValues(events)) {
			const verb = value.split(':')[2]!
			expect(LIFECYCLE_VERBS.has(verb), `unknown verb \"${verb}\" in ${value}`).toBe(true)
		}
	})

	it("every event's source segment matches its tree key", () => {
		for (const [source, group] of Object.entries(events)) {
			for (const value of Object.values(group as Record<string, string>)) {
				const segment = value.split(':')[1]
				expect(segment, `${value} should be under \"${source}\"`).toBe(source)
			}
		}
	})

	it('event names are unique across the tree', () => {
		const all = eventValues(events)
		const set = new Set(all)
		expect(set.size).toBe(all.length)
	})
})
