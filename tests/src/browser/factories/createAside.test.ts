import { describe, expect, it } from 'vitest'
import type { CreateAsideInstance, CreateAsideOptions } from '@elements/browser'
import { ASIDE_EVENTS, createAside } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder, waitForDelay } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createAside', () => {
	it('rejects non-<aside> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createAside(wrong)).toThrowError(/aside/i)
	})

	it('defaults popover to "auto" so native light-dismiss kicks in', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		expect(api.visible.value).toBe(false)
		expect(aside.popover).toBe('auto')
	})

	it('respects options.popover: "manual" for sticky panels', () => {
		const aside = buildElement('aside')
		const [_api] = createFactoryFixture(() => createAside(aside, { popover: 'manual' }))
		expect(aside.popover).toBe('manual')
		void _api
	})

	it('options.popover: false leaves the author-declared attribute untouched', () => {
		const aside = buildElement('aside')
		aside.setAttribute('popover', 'manual')
		const [_api] = createFactoryFixture(() => createAside(aside, { popover: false }))
		expect(aside.popover).toBe('manual')
		void _api
	})

	it('show opens the popover and flips visible via the native toggle event', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		expect(aside.matches(':popover-open')).toBe(true)
		expect(api.visible.value).toBe(true)
	})

	it('hide closes the popover and flips visible back', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		api.hide()
		expect(aside.matches(':popover-open')).toBe(false)
		expect(api.visible.value).toBe(false)
	})

	it('emits namespaced show / open / hide / close events bridged from beforetoggle + toggle', () => {
		const aside = buildElement('aside')
		const show = createRecorder<[Event]>()
		const open = createRecorder<[Event]>()
		const hide = createRecorder<[Event]>()
		const close = createRecorder<[Event]>()
		aside.addEventListener(ASIDE_EVENTS.show, show.handler)
		aside.addEventListener(ASIDE_EVENTS.open, open.handler)
		aside.addEventListener(ASIDE_EVENTS.hide, hide.handler)
		aside.addEventListener(ASIDE_EVENTS.close, close.handler)
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		expect(show.count).toBe(1)
		expect(open.count).toBe(1)
		api.hide()
		expect(hide.count).toBe(1)
		expect(close.count).toBe(1)
	})

	it('destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createAside(buildElement('aside')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Aside is a native-`popover` drawer. The factory bridges
// `beforetoggle` / `toggle` into `elements:aside:show / open / hide /
// close` and forwards programmatic `show()` / `hide()` / `toggle()` onto
// `showPopover()` / `hidePopover()` / `togglePopover()`. Observable
// state is the panel's `:popover-open` flag plus the reactive `visible`
// mirror.
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'toggle' | 'hidepopover' | 'destroy'
//
// The `hidepopover` event exercises the platform-native close path that
// `popover='auto'` light-dismiss takes (Escape / outside click in the
// real browser); calling `element.hidePopover()` directly is the
// deterministic synthetic equivalent.

type AsideState = 'closed' | 'open'
type AsideEvent = 'show' | 'hide' | 'toggle' | 'hidepopover' | 'destroy'

interface AsideEventRecorder {
	readonly count: number
	clear(): void
}

interface AsideContext {
	readonly api: CreateAsideInstance
	readonly element: HTMLElement
	readonly opens: AsideEventRecorder
	readonly closes: AsideEventRecorder
}

function buildAsideContext(options: CreateAsideOptions = {}): AsideContext {
	const element = buildElement('aside')
	const opens = createRecorder<[Event]>()
	const closes = createRecorder<[Event]>()
	element.addEventListener(ASIDE_EVENTS.open, opens.handler)
	element.addEventListener(ASIDE_EVENTS.close, closes.handler)
	const [api] = createFactoryFixture(() => createAside(element, options))
	return { api, element, opens, closes }
}

async function driveToAsideState(context: AsideContext, state: AsideState): Promise<void> {
	if (state === 'open') {
		context.api.show()
		// Drain the platform's queued `toggle` element task so the
		// suppress counter inside the factory returns to 0 before any
		// downstream native event (e.g. `hidePopover()`) runs.
		await waitForDelay()
		context.opens.clear()
	}
}

async function fireAsideEvent(context: AsideContext, event: AsideEvent): Promise<void> {
	if (event === 'show') {
		context.api.show()
		return
	}
	if (event === 'hide') {
		context.api.hide()
		return
	}
	if (event === 'toggle') {
		context.api.toggle()
		return
	}
	if (event === 'hidepopover') {
		// Native close path — what platform-level light-dismiss (Escape /
		// outside click under popover='auto') eventually calls. The native
		// `toggle` event is queued as an element task per spec; wait one
		// macrotask so the bridge to ASIDE_EVENTS.close lands before
		// assertions.
		context.element.hidePopover()
		await waitForDelay()
		return
	}
	context.api.destroy()
}

function assertAsideState(context: AsideContext, state: AsideState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.element.matches(':popover-open')).toBe(expectedOpen)
}

const ASIDE_SCENARIOS: readonly StateScenario<AsideState, AsideEvent, AsideContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: (context, state) => {
			assertAsideState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: (context, state) => {
			assertAsideState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: { name: 'closed × toggle → open', from: 'closed', event: 'toggle', to: 'open' },
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: assertAsideState,
	},
	{
		transition: { name: 'open × toggle → closed', from: 'open', event: 'toggle', to: 'closed' },
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: assertAsideState,
	},
	{
		transition: {
			name: 'open × hidepopover → closed (platform light-dismiss bridges to close)',
			from: 'open',
			event: 'hidepopover',
			to: 'closed',
		},
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: (context, state) => {
			assertAsideState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: (context, state) => {
			assertAsideState(context, state)
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
		arrange: driveToAsideState,
		act: fireAsideEvent,
		assert: (context, state) => {
			assertAsideState(context, state)
			expect(context.opens.count).toBe(0)
		},
	},
]

describe('createAside (statechart)', () => {
	it.each(ASIDE_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildAsideContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})
})
