import { describe, expect, it } from 'vitest'
import type { CreatePointerInstance, CreatePointerOptions } from '@elements/browser'
import { createPointer } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createPointerEvent,
	runScenario,
} from '../../../setupBrowser'

describe('createPointer', () => {
	it('initial dragging is false', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		expect(api.dragging.value).toBe(false)
	})

	it('pointerdown → pointerup fires start + end', () => {
		const el = buildElement('div')
		const start = createRecorder<[PointerEvent]>()
		const end = createRecorder<[PointerEvent]>()
		const [api] = createFactoryFixture(() =>
			createPointer(el, { on: { start: start.handler, end: end.handler } }),
		)
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		expect(start.count).toBe(1)
		el.dispatchEvent(createPointerEvent('pointerup'))
		expect(api.dragging.value).toBe(false)
		expect(end.count).toBe(1)
	})

	it('accept can veto pointerdown', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el, { accept: () => false }))
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(false)
	})

	it('clear cancels in-flight drag', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		api.clear()
		expect(api.dragging.value).toBe(false)
	})

	it('destroy is idempotent', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		api.destroy()
		expect(() => api.destroy()).not.toThrow()
	})

	it('destroy reverses every listener it installed', () => {
		assertCleanDispose(() => createPointer(buildElement('div')))
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Pointer captures a binary `dragging` state. `pointerdown` enters
// capture (unless `accept` vetoes); `pointerup` releases. `api.clear()`
// is the programmatic abort.
//
//   States   : 'idle' | 'dragging'
//   Events   : 'pointerdown' | 'pointerup' | 'clear' | 'pointerdown-rejected' | 'destroy'

type PointerState = 'idle' | 'dragging'
type PointerEvent_ = 'pointerdown' | 'pointerup' | 'clear' | 'pointerdown-rejected' | 'destroy'

interface PointerContext {
	readonly api: CreatePointerInstance
	readonly element: HTMLDivElement
}

function buildPointerContext(options: CreatePointerOptions = {}): PointerContext {
	const element = buildElement('div')
	const [api] = createFactoryFixture(() => createPointer(element, options))
	return { api, element }
}

function driveToPointerState(context: PointerContext, state: PointerState): void {
	if (state === 'dragging') context.element.dispatchEvent(createPointerEvent('pointerdown'))
}

function firePointerEvent(context: PointerContext, event: PointerEvent_): void {
	if (event === 'pointerdown') {
		context.element.dispatchEvent(createPointerEvent('pointerdown'))
		return
	}
	if (event === 'pointerup') {
		context.element.dispatchEvent(createPointerEvent('pointerup'))
		return
	}
	if (event === 'clear') {
		context.api.clear()
		return
	}
	if (event === 'pointerdown-rejected') {
		context.element.dispatchEvent(createPointerEvent('pointerdown'))
		return
	}
	context.api.destroy()
}

function assertPointerState(context: PointerContext, state: PointerState): void {
	expect(context.api.dragging.value).toBe(state === 'dragging')
}

const POINTER_SCENARIOS: readonly StateScenario<PointerState, PointerEvent_, PointerContext>[] = [
	{
		transition: {
			name: 'idle × pointerdown → dragging',
			from: 'idle',
			event: 'pointerdown',
			to: 'dragging',
		},
		arrange: driveToPointerState,
		act: firePointerEvent,
		assert: assertPointerState,
	},
	{
		transition: {
			name: 'dragging × pointerup → idle',
			from: 'dragging',
			event: 'pointerup',
			to: 'idle',
		},
		arrange: driveToPointerState,
		act: firePointerEvent,
		assert: assertPointerState,
	},
	{
		transition: {
			name: 'dragging × clear → idle (programmatic abort)',
			from: 'dragging',
			event: 'clear',
			to: 'idle',
		},
		arrange: driveToPointerState,
		act: firePointerEvent,
		assert: assertPointerState,
	},
]

describe('createPointer (statechart)', () => {
	it.each(POINTER_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildPointerContext()
		const start = createRecorder<[PointerEvent]>()
		const end = createRecorder<[PointerEvent]>()
		context.element.addEventListener('pointerdown', start.handler)
		context.element.addEventListener('pointerup', end.handler)
		expect(context.api.dragging.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('guard: accept callback rejecting pointerdown keeps state at idle', () => {
		const context = buildPointerContext({ accept: () => false })
		firePointerEvent(context, 'pointerdown-rejected')
		assertPointerState(context, 'idle')
	})
})
