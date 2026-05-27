// ============================================================================
//  createDetails — statechart-driven transition coverage.
//
//  Companion to `createDetails.test.ts`. Models the factory's lifecycle as a
//  finite-state machine and iterates the state × event table. Native
//  `[open]` is the source of truth — every transition asserts both the
//  reactive `visible.value` mirror and the underlying DOM state.
//
//  States   : 'closed' | 'open'
//  Events   : 'show' | 'hide' | 'summaryclick' | 'deactivate' | 'destroy'
//
//  Notable divergence from createDialog: `destroy()` deliberately does NOT
//  force-close (createDetails.ts:149 — "let the consumer keep the
//  disclosure state"). The `open × destroy → open` row encodes that
//  contract; the only thing destroy reverses is listener / scope cleanup.
// ============================================================================

import { describe, expect, it } from 'vitest'
import type { CreateDetailsInstance, CreateDetailsOptions } from '@elements/browser'
import { createDetails, DETAILS_EVENTS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

type DetailsState = 'closed' | 'open'
type DetailsEvent = 'show' | 'hide' | 'nativetoggle' | 'deactivate' | 'destroy'

interface EventRecorder {
	readonly count: number
	clear(): void
}

interface DetailsContext {
	readonly api: CreateDetailsInstance
	readonly element: HTMLDetailsElement
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildDetailsContext(options: CreateDetailsOptions = {}): DetailsContext {
	const element = buildElement('details')
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const [api] = createFactoryFixture(() =>
		createDetails(element, {
			...options,
			on: {
				...options.on,
				open: (event) => {
					opens.handler(event)
					options.on?.open?.(event)
				},
				close: (event) => {
					closes.handler(event)
					options.on?.close?.(event)
				},
			},
		}),
	)
	return { api, element, opens, closes }
}

function driveToState(context: DetailsContext, state: DetailsState): void {
	if (state === 'open') {
		context.api.show()
		context.opens.clear()
	}
}

function fireEvent(context: DetailsContext, event: DetailsEvent): void {
	if (event === 'show') {
		context.api.show()
		return
	}
	if (event === 'hide') {
		context.api.hide()
		return
	}
	if (event === 'nativetoggle') {
		// Simulate any external `[open]` flip — summary click activation
		// behavior, third-party scripts setting `details.open = true`,
		// declarative form-submission disclosure, etc. The platform sets
		// `[open]` then queues a `toggle` event; the factory's
		// `onNativeToggle` listener picks up the divergence between
		// `visible.value` and `element.open` and updates accordingly.
		context.element.open = !context.element.open
		context.element.dispatchEvent(new Event('toggle'))
		return
	}
	if (event === 'deactivate') {
		context.element.dispatchEvent(
			new CustomEvent(DETAILS_EVENTS.deactivate, { bubbles: true, cancelable: false }),
		)
		return
	}
	context.api.destroy()
}

function assertState(context: DetailsContext, state: DetailsState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.element.open).toBe(expectedOpen)
}

const scenarios: readonly StateScenario<DetailsState, DetailsEvent, DetailsContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed × nativetoggle → open (external [open] flip bridges to visible)',
			from: 'closed',
			event: 'nativetoggle',
			to: 'open',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open × nativetoggle → closed (external [open] flip bridges to visible)',
			from: 'open',
			event: 'nativetoggle',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open × deactivate → closed (accordion sibling-close path)',
			from: 'open',
			event: 'deactivate',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open × destroy → open (factory preserves disclosure state)',
			from: 'open',
			event: 'destroy',
			to: 'open',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(0)
			expect(context.closes.count).toBe(0)
		},
	},
	{
		transition: {
			name: 'open × show → open (idempotent, no double emit)',
			from: 'open',
			event: 'show',
			to: 'open',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(0)
		},
	},
]

describe('createDetails (statechart)', () => {
	it.each(scenarios)('$transition.name', async (scenario) => {
		const context = buildDetailsContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('cancelled show (preventDefault) keeps state at closed', () => {
		const context = buildDetailsContext({
			on: { show: (event) => event.preventDefault() },
		})
		context.api.show()
		expect(context.api.visible.value).toBe(false)
		expect(context.element.open).toBe(false)
		expect(context.opens.count).toBe(0)
	})

	it('accordion guard: opening sibling B drives sibling A from open to closed', () => {
		const root = buildElement('div')
		const a = document.createElement('details')
		const b = document.createElement('details')
		root.append(a, b)
		const [apiA] = createFactoryFixture(() => createDetails(a, { accordion: root }))
		const [apiB] = createFactoryFixture(() => createDetails(b, { accordion: root }))
		apiA.show()
		expect(apiA.visible.value).toBe(true)
		apiB.show()
		expect(apiB.visible.value).toBe(true)
		expect(apiA.visible.value).toBe(false)
		expect(a.open).toBe(false)
	})

	it('cleanup: destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createDetails(buildElement('details')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
