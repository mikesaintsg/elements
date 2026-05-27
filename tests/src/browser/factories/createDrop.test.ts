import { describe, expect, it } from 'vitest'
import type { CreateDropInstance, CreateDropOptions } from '@elements/browser'
import { createDrop } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createDragEvent,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createDrop', () => {
	it('starts not over', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el))
		expect(api.over.value).toBe(false)
	})

	it('dragenter sets over=true; drop clears it', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el))
		el.dispatchEvent(createDragEvent('dragenter'))
		expect(api.over.value).toBe(true)
		el.dispatchEvent(createDragEvent('drop'))
		expect(api.over.value).toBe(false)
	})

	it('accept type-list filters; non-matching dragenter is ignored', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el, { accept: ['text/uri-list'] }))
		const transfer = new DataTransfer()
		transfer.setData('text/plain', 'reject me')
		el.dispatchEvent(createDragEvent('dragenter', { data: transfer }))
		expect(api.over.value).toBe(false)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createDrop(buildElement('div')))
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Drop is a binary `over` state — the pointer is either inside the zone
// with a valid payload, or it isn't. `accept` (type-list) acts as a guard
// on the `dragenter` event: a non-matching payload leaves `over=false`.
//
//   States   : 'idle' | 'over'
//   Events   : 'dragenter' | 'dragleave' | 'drop' | 'dragenter-rejected' | 'destroy'

type DropState = 'idle' | 'over'
type DropEvent = 'dragenter' | 'dragleave' | 'drop' | 'dragenter-rejected' | 'destroy'

interface DropContext {
	readonly api: CreateDropInstance
	readonly element: HTMLDivElement
}

function buildDropContext(options: CreateDropOptions = {}): DropContext {
	const element = buildElement('div')
	const [api] = createFactoryFixture(() => createDrop(element, options))
	return { api, element }
}

function driveToDropState(context: DropContext, state: DropState): void {
	if (state === 'over') context.element.dispatchEvent(createDragEvent('dragenter'))
}

function fireDropEvent(context: DropContext, event: DropEvent): void {
	if (event === 'dragenter') {
		context.element.dispatchEvent(createDragEvent('dragenter'))
		return
	}
	if (event === 'dragleave') {
		context.element.dispatchEvent(createDragEvent('dragleave'))
		return
	}
	if (event === 'drop') {
		context.element.dispatchEvent(createDragEvent('drop'))
		return
	}
	if (event === 'dragenter-rejected') {
		const transfer = new DataTransfer()
		transfer.setData('text/plain', 'reject me')
		context.element.dispatchEvent(createDragEvent('dragenter', { data: transfer }))
		return
	}
	context.api.destroy()
}

function assertDropState(context: DropContext, state: DropState): void {
	expect(context.api.over.value).toBe(state === 'over')
}

const DROP_SCENARIOS: readonly StateScenario<DropState, DropEvent, DropContext>[] = [
	{
		transition: {
			name: 'idle × dragenter → over',
			from: 'idle',
			event: 'dragenter',
			to: 'over',
		},
		arrange: driveToDropState,
		act: fireDropEvent,
		assert: assertDropState,
	},
	{
		transition: { name: 'over × drop → idle', from: 'over', event: 'drop', to: 'idle' },
		arrange: driveToDropState,
		act: fireDropEvent,
		assert: assertDropState,
	},
	{
		transition: {
			name: 'over × dragleave → idle',
			from: 'over',
			event: 'dragleave',
			to: 'idle',
		},
		arrange: driveToDropState,
		act: fireDropEvent,
		assert: assertDropState,
	},
]

describe('createDrop (statechart)', () => {
	it.each(DROP_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildDropContext()
		expect(context.api.over.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('guard: accept type-list keeps state at idle when payload mismatches', () => {
		const context = buildDropContext({ accept: ['text/uri-list'] })
		fireDropEvent(context, 'dragenter-rejected')
		assertDropState(context, 'idle')
	})
})
