import { describe, expect, it } from 'vitest'
import type { CreateDetailsInstance, CreateDetailsOptions } from '@elements/browser'
import { createDetails, DETAILS_EVENTS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createDetails', () => {
	it('rejects non-<details> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createDetails(wrong as unknown as HTMLDetailsElement)).toThrowError(/details/i)
	})

	it('mirrors the native [open] state into the reactive ref', () => {
		const details = buildElement('details')
		const [api] = createFactoryFixture(() => createDetails(details))
		expect(api.visible.value).toBe(false)
		api.show()
		expect(details.open).toBe(true)
		expect(api.visible.value).toBe(true)
		api.hide()
		expect(details.open).toBe(false)
		expect(api.visible.value).toBe(false)
	})

	it('emits open after a native [open] flip', () => {
		const details = buildElement('details')
		const open = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createDetails(details, { on: { open: open.handler } }))
		api.show()
		expect(open.count).toBe(1)
	})

	it('cancellable show is honored', () => {
		const details = buildElement('details')
		const [api] = createFactoryFixture(() =>
			createDetails(details, { on: { show: (event) => event.preventDefault() } }),
		)
		api.show()
		expect(details.open).toBe(false)
	})

	it('accordion mode closes open siblings', () => {
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
	})

	it('uses namespaced event names', () => {
		const details = buildElement('details')
		const show = createRecorder<[Event]>()
		details.addEventListener(DETAILS_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createDetails(details))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createDetails(buildElement('details')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Models the factory's lifecycle as a finite-state machine and iterates the
// state × event table. Native `[open]` is the source of truth — every
// transition asserts both the reactive `visible.value` mirror and the
// underlying DOM state.
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'nativetoggle' | 'deactivate' | 'destroy'
//
// Notable divergence from createDialog: `destroy()` deliberately does NOT
// force-close (createDetails.ts:149 — "let the consumer keep the disclosure
// state"). The `open × destroy → open` row encodes that contract; the only
// thing destroy reverses is listener / scope cleanup.

type DetailsState = 'closed' | 'open'
type DetailsEvent = 'show' | 'hide' | 'nativetoggle' | 'deactivate' | 'destroy'

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

function driveToDetailsState(context: DetailsContext, state: DetailsState): void {
	if (state === 'open') {
		context.api.show()
		context.opens.clear()
	}
}

function fireDetailsEvent(context: DetailsContext, event: DetailsEvent): void {
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

function assertDetailsState(context: DetailsContext, state: DetailsState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.element.open).toBe(expectedOpen)
}

const DETAILS_SCENARIOS: readonly StateScenario<DetailsState, DetailsEvent, DetailsContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
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
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
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
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
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
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
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
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: assertDetailsState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
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
		arrange: driveToDetailsState,
		act: fireDetailsEvent,
		assert: (context, state) => {
			assertDetailsState(context, state)
			expect(context.opens.count).toBe(0)
		},
	},
]

describe('createDetails (statechart)', () => {
	it.each(DETAILS_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildDetailsContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})
})
