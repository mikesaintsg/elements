// ============================================================================
//  guides/composables.md ↔ src/browser/{events,composables,factories}/
//                       ↔ src/styles/composables/
//
//  Two contracts the composables guide hardcodes:
//
//    1. EVENT-NAME REGISTRY — every event name in `src/browser/events.ts`
//       follows `elements:{source}:{verb}`, with `{verb}` drawn from a
//       fixed lifecycle vocabulary documented in composables.md §2.1
//       "Event names". Adding a verb means extending the vocabulary in
//       both this test and the doc — never bolting it onto a single
//       composable.
//
//    2. JS ↔ CSS REDUNDANCY — every `setAttribute('data-X-*', …)` written
//       by a factory under `src/browser/factories/` is referenced at
//       least once by a partial in `src/styles/`. If the CSS never reads
//       the attribute, the JS is doing dead work — see composables.md
//       §5.4.1 "Native-platform redundancy checklist".
//
//  Pure node — TS data + readScssPartials/readFactorySources via node:fs.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { events } from '@elements/browser'
import { readAllStyleSources, readFactorySources, readGuide } from '../setupServer'

// ── 1. Event-name registry ─────────────────────────────────────────────────
//
// Lifecycle verb vocabulary — every third segment of every event name MUST
// appear here. Mirrored against composables.md §2.1's documented vocabulary;
// adding a verb is a deliberate framework-wide decision.

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

describe('events.ts — shape', () => {
	it('exposes one entry per composable source', () => {
		expect(Object.keys(events).length).toBeGreaterThan(0)
	})

	it('every event matches elements:{source}:{verb}', () => {
		for (const value of eventValues(events)) {
			expect(value).toMatch(EVENT_PATTERN)
		}
	})

	it('every verb is in the documented lifecycle vocabulary', () => {
		const offenders: string[] = []
		for (const value of eventValues(events)) {
			const verb = value.split(':')[2] ?? ''
			if (!LIFECYCLE_VERBS.has(verb)) offenders.push(value)
		}
		expect(offenders).toEqual([])
	})

	it("every event's source segment matches its tree key", () => {
		const offenders: string[] = []
		for (const [source, group] of Object.entries(events)) {
			for (const value of Object.values(group as Record<string, string>)) {
				const segment = value.split(':')[1]
				if (segment !== source) offenders.push(`${value} should be under "${source}"`)
			}
		}
		expect(offenders).toEqual([])
	})

	it('event names are unique across the tree', () => {
		const all = eventValues(events)
		expect(new Set(all).size).toBe(all.length)
	})
})

// ── 2. JS ↔ CSS attribute parity ───────────────────────────────────────────
//
// Motivated by two real regressions:
//
//   - createAside (fixed in 2b6952a) wrote `[data-aside-open]` /
//     `[data-aside-closing]` on every open/close but neither
//     `components/_aside.scss` nor `composables/_aside.scss` referenced
//     either. The slide animation was driven entirely by `:popover-open` +
//     `@starting-style`. Worse, the JS was also waiting on a
//     `transitionend` that couldn't fire — ~400 ms of dead wait. Strip
//     dropped close latency from ~400 ms to ~73 ms.
//
//   - createTabs wrote `[data-tab-open]` on/off but no SCSS referenced it.
//     Separately, pane-hide chrome keys off `[hidden]` while the JS
//     toggled `[aria-hidden]` — so panels never visually hid.

const factorySources = readFactorySources()
const styleSources = readAllStyleSources()
const stylesCorpus = Object.values(styleSources).join('\n')

const SET_ATTR_RE = /\.setAttribute\(\s*['"](data-[a-z][a-z0-9-]*)['"]/g

interface AttrWrite {
	readonly attr: string
	readonly factory: string
}

function* findAttrWrites(): Iterable<AttrWrite> {
	for (const [path, source] of Object.entries(factorySources)) {
		const factory = path.split(/[\\/]/).pop() ?? path
		const seen = new Set<string>()
		for (const match of source.matchAll(SET_ATTR_RE)) {
			const attr = match[1]
			if (!attr || seen.has(attr)) continue
			seen.add(attr)
			yield { attr, factory }
		}
	}
}

function isReferencedInStyles(attr: string): boolean {
	return stylesCorpus.includes(attr)
}

// Allow-list — attributes legitimately written by JS without a CSS hit.
// Every entry needs a one-line rationale; adding to this list is a
// deliberate exception, not a workaround.
const JS_ONLY: Readonly<Record<string, string>> = {
	// Set on the toggle button (not a styling target on its own — the
	// `<menu popover>` panel is what's styled, gated by `:popover-open`).
	'data-popover-side': 'JS-resolved popover side; consumed by JS arrow-positioning logic.',
	// Set on dragged rows by `useDrag` for selection-set tracking; CSS keys
	// on `.dragging` / `.selected` class names that the factory applies.
	'data-drag-source': 'JS-only drag-source marker; styling reads `.dragging` class.',
	'data-drag-target': 'JS-only drop-target marker; styling reads `.drop-indicator` class.',
}

// Failure rationale (for readers diagnosing a red test below):
//   The factory writes `[attr]` via `setAttribute` but NO partial in
//   `src/styles/` references it. Either:
//     (a) Wire the attribute into the cascade so it actually styles
//         something, OR
//     (b) Drop the attribute and lean on the native platform state
//         (`:popover-open`, `[open]`, `:checked`, `[hidden]`, …), OR
//     (c) Add it to JS_ONLY in this file with a rationale describing why
//         the attribute is JS-only and what CSS DOES style instead.

describe('factories ↔ styles — every setAttribute("data-*") has a CSS reference', () => {
	const writes = [...findAttrWrites()]

	it('discovers at least one data-* setAttribute call to verify', () => {
		expect(writes.length).toBeGreaterThan(0)
	})

	for (const { attr, factory } of writes.filter((w) => !JS_ONLY[w.attr])) {
		it(`[${attr}] (written by ${factory}) is referenced by src/styles/`, () => {
			expect(isReferencedInStyles(attr)).toBe(true)
		})
	}
})

// ── 3. Factories ↔ guide parity — every create{Name}.ts is documented ──────
//
// The composables guide is the public catalog of every composable + factory
// the framework ships. If a factory exists on disk but isn't named in the
// guide, consumers can't discover it. The check matches each factory file
// to a `create{Name}` mention (in backticks) anywhere in composables.md.

const composablesDoc = readGuide('composables')

const shippedFactoryNames: readonly string[] = Object.keys(factorySources)
	.map((p) => {
		const match = p.match(/(create[A-Z][A-Za-z]+)\.ts$/)
		return match?.[1] ?? ''
	})
	.filter((name) => name !== '')

describe('composables — every shipped factory is documented in composables.md', () => {
	for (const factory of shippedFactoryNames) {
		const composable = `use${factory.slice('create'.length)}`
		// On failure: `src/browser/factories/${factory}.ts` exists but neither
		// `${factory}` nor `${composable}` is mentioned in
		// `guides/composables.md`. Add the pair to the per-composable
		// reference table.
		it(`${factory} / ${composable} appears in guides/composables.md`, () => {
			const pattern = new RegExp(`\`(${factory}|${composable})\``)
			expect(pattern.test(composablesDoc)).toBe(true)
		})
	}
})
