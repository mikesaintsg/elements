import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateSelectInstance, CreateSelectOptions } from '@elements/browser'
import { createSelect, SELECT_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture, runScenario } from '../../../setupBrowser'

function createSelectFixture(values: readonly string[]): {
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
} {
	const toggle = buildElement('button')
	toggle.type = 'button'
	const menu = buildElement('menu', { attrs: { popover: '' } })
	for (const value of values) {
		const li = document.createElement('li')
		const item = document.createElement('button')
		item.type = 'button'
		item.dataset.value = value
		item.textContent = value.charAt(0).toUpperCase() + value.slice(1)
		li.appendChild(item)
		menu.appendChild(li)
	}
	return { toggle, menu }
}

describe('createSelect', () => {
	it('rejects non-<menu> panels', () => {
		const toggle = buildElement('button')
		const wrong = buildElement('ul')
		expect(() => createSelect({ toggle, menu: wrong as unknown as HTMLMenuElement })).toThrowError(
			/menu/i,
		)
	})

	it('writes role="listbox" + aria-controls on the toggle', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		createFactoryFixture(() => createSelect({ toggle, menu }))
		expect(menu.getAttribute('role')).toBe('listbox')
		expect(toggle.getAttribute('aria-haspopup')).toBe('listbox')
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
		expect(toggle.getAttribute('aria-controls')).toBe(menu.id)
	})

	it('select replaces single-mode value and emits select', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b', 'c'])
		const select = createRecorder<[Event]>()
		toggle.addEventListener(SELECT_EVENTS.select, select.handler)
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }))
		api.select('b')
		expect(api.value.value).toBe('b')
		expect(api.values.value).toEqual(['b'])
		expect(select.count).toBe(1)
	})

	it('multiple mode toggles values', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b', 'c'])
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }, { multiple: true }))
		api.select('a')
		api.select('b')
		expect(api.values.value).toContain('a')
		expect(api.values.value).toContain('b')
		api.select('a') // toggle off
		expect(api.values.value).not.toContain('a')
	})

	it('clear empties the selection', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }, { value: 'a' }))
		expect(api.values.value).toEqual(['a'])
		api.clear()
		expect(api.values.value).toEqual([])
		expect(api.value.value).toBeNull()
	})

	it('mirrors selection into native <select>', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		const native = buildElement('select')
		for (const v of ['a', 'b']) {
			const opt = document.createElement('option')
			opt.value = v
			native.appendChild(opt)
		}
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu, native }))
		api.select('b')
		expect(native.value).toBe('b')
	})

	it('autocomplete: input filters items via [data-hidden]', () => {
		const { toggle, menu } = createSelectFixture(['apple', 'banana', 'cherry'])
		const input = buildElement('input', { attrs: { type: 'text' } })
		const [api] = createFactoryFixture(() =>
			createSelect({ toggle, menu, input }, { autocomplete: true }),
		)
		input.value = 'an'
		input.dispatchEvent(new Event('input', { bubbles: true }))
		// Apple has 'an'? no. Banana yes. Cherry no.
		const items = menu.querySelectorAll('button')
		const hidden = Array.from(items).map((el) => el.hasAttribute('data-hidden'))
		expect(hidden).toEqual([true, false, true])
		void api
	})

	it('destroy reverses every listener and ARIA', () => {
		assertCleanDispose(() => {
			const { toggle, menu } = createSelectFixture(['a', 'b'])
			return createSelect({ toggle, menu })
		})
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Select has two orthogonal regions:
//   - Open/closed listbox: 'closed' | 'open'  (mirrors :popover-open)
//   - Selection: 'empty' | 'single'           (which value(s) are picked)
//
// Composite states under coverage: 'closed-empty', 'open-empty',
// 'closed-single', 'open-single'. The `select(value)`, `clear()`, `show()`,
// and `hide()` verbs drive transitions. Filtering / cursor state are
// pipeline-driven and tested separately above.
//
//   Events   : 'show' | 'hide' | 'select-a' | 'select-b' | 'clear' | 'destroy'

type SelectState = 'closed-empty' | 'open-empty' | 'closed-single' | 'open-single'
type SelectEvent = 'show' | 'hide' | 'select-a' | 'select-b' | 'clear' | 'destroy'

interface SelectContext {
	readonly api: CreateSelectInstance
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
	readonly selects: EventRecorder
	readonly clears: EventRecorder
}

function buildSelectContext(options: CreateSelectOptions = {}): SelectContext {
	const { toggle, menu } = createSelectFixture(['a', 'b', 'c'])
	const selects = createRecorder<[Event]>()
	const clears = createRecorder<[Event]>()
	toggle.addEventListener(SELECT_EVENTS.select, selects.handler)
	toggle.addEventListener(SELECT_EVENTS.clear, clears.handler)
	const [api] = createFactoryFixture(() => createSelect({ toggle, menu }, options))
	return { api, toggle, menu, selects, clears }
}

function driveToSelectState(context: SelectContext, state: SelectState): void {
	if (state === 'open-empty') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (state === 'closed-single') {
		context.api.select('a')
		context.selects.clear()
		return
	}
	if (state === 'open-single') {
		context.api.select('a')
		context.selects.clear()
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
	}
}

function fireSelectEvent(context: SelectContext, event: SelectEvent): void {
	if (event === 'show') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'hide') {
		context.api.hide()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'select-a') {
		context.api.select('a')
		return
	}
	if (event === 'select-b') {
		context.api.select('b')
		return
	}
	if (event === 'clear') {
		context.api.clear()
		return
	}
	context.api.destroy()
}

interface SelectObservables {
	readonly visible: boolean
	readonly value: string | null
	readonly ariaExpanded: 'true' | 'false'
}

const SELECT_OBSERVABLES: Readonly<Record<SelectState, SelectObservables>> = {
	'closed-empty': { visible: false, value: null, ariaExpanded: 'false' },
	'open-empty': { visible: true, value: null, ariaExpanded: 'true' },
	'closed-single': { visible: false, value: 'a', ariaExpanded: 'false' },
	'open-single': { visible: true, value: 'a', ariaExpanded: 'true' },
}

function assertSelectState(context: SelectContext, state: SelectState): void {
	const expected = SELECT_OBSERVABLES[state]
	expect(context.api.visible.value).toBe(expected.visible)
	expect(context.api.value.value).toBe(expected.value)
	expect(context.toggle.getAttribute('aria-expanded')).toBe(expected.ariaExpanded)
}

const SELECT_SCENARIOS: readonly StateScenario<SelectState, SelectEvent, SelectContext>[] = [
	{
		transition: {
			name: 'closed-empty × show → open-empty',
			from: 'closed-empty',
			event: 'show',
			to: 'open-empty',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: assertSelectState,
	},
	{
		transition: {
			name: 'open-empty × hide → closed-empty',
			from: 'open-empty',
			event: 'hide',
			to: 'closed-empty',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: assertSelectState,
	},
	{
		transition: {
			name: 'closed-empty × select-a → closed-single',
			from: 'closed-empty',
			event: 'select-a',
			to: 'closed-single',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: (context, state) => {
			assertSelectState(context, state)
			expect(context.selects.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed-single × clear → closed-empty',
			from: 'closed-single',
			event: 'clear',
			to: 'closed-empty',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: (context, state) => {
			assertSelectState(context, state)
			expect(context.clears.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed-single × select-b → closed-single (single-mode replaces value)',
			from: 'closed-single',
			event: 'select-b',
			to: 'closed-single',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: (context) => {
			expect(context.api.value.value).toBe('b')
			expect(context.api.values.value).toEqual(['b'])
		},
	},
	{
		transition: {
			name: 'open-single × hide → closed-single (selection preserved)',
			from: 'open-single',
			event: 'hide',
			to: 'closed-single',
		},
		arrange: driveToSelectState,
		act: fireSelectEvent,
		assert: assertSelectState,
	},
]

describe('createSelect (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(SELECT_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildSelectContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})
})
