import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateTooltipInstance, CreateTooltipOptions } from '@elements/browser'
import { createTooltip, TOOLTIP_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	createFactoryFixture,
	createTooltipElements,
	runScenario,
} from '../../../setupBrowser'

describe('createTooltip', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts hidden, sets manual popover + role="tooltip"', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		expect(api.visible.value).toBe(false)
		expect(panel.popover).toBe('manual')
		expect(panel.getAttribute('role')).toBe('tooltip')
	})

	it('hover anchor shows tooltip; mouseleave hides', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		anchor.dispatchEvent(new Event('mouseenter'))
		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		anchor.dispatchEvent(new Event('mouseleave'))
		expect(api.visible.value).toBe(false)
	})

	it('focus anchor shows tooltip; blur hides', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		anchor.dispatchEvent(new Event('focusin'))
		expect(api.visible.value).toBe(true)
		anchor.dispatchEvent(new Event('focusout'))
		expect(api.visible.value).toBe(false)
	})

	it('show writes data-tooltip-side + position-area', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }, { placement: 'top' }))
		api.show()
		expect(panel.dataset.tooltipSide).toBe('top')
		expect(panel.style.positionArea).toBe('top')
	})

	it('show writes align-self + justify-self per placement (regression)', () => {
		// Regression: createTooltip used to write only `position-area`,
		// missing the `align-self` / `justify-self` pair that the surface
		// default (`align-self: start; justify-self: anchor-center`) only
		// resolves correctly for the `'bottom'` placement. With
		// `position-area: top` + the surface default `align-self: start`,
		// the tooltip pinned to the TOP of the available area
		// (viewport-top) instead of hugging the anchor's top edge. The
		// fix mirrors `createPopover`'s same step — both factories now
		// write the placement-specific self values.
		const { anchor: a1, panel: p1 } = createTooltipElements()
		const [api1] = createFactoryFixture(() =>
			createTooltip({ anchor: a1, panel: p1 }, { placement: 'top' }),
		)
		api1.show()
		expect(p1.style.alignSelf).toBe('end')
		expect(p1.style.justifySelf).toBe('anchor-center')

		const { anchor: a2, panel: p2 } = createTooltipElements()
		const [api2] = createFactoryFixture(() =>
			createTooltip({ anchor: a2, panel: p2 }, { placement: 'end' }),
		)
		api2.show()
		expect(p2.style.alignSelf).toBe('anchor-center')
		expect(p2.style.justifySelf).toBe('start')

		const { anchor: a3, panel: p3 } = createTooltipElements()
		const [api3] = createFactoryFixture(() =>
			createTooltip({ anchor: a3, panel: p3 }, { placement: 'start' }),
		)
		api3.show()
		expect(p3.style.alignSelf).toBe('anchor-center')
		expect(p3.style.justifySelf).toBe('end')
	})

	it('Escape dismisses by default', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { anchor, panel } = createTooltipElements()
		const show = createRecorder<[Event]>()
		anchor.addEventListener(TOOLTIP_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(
			() => {
				const { anchor, panel } = createTooltipElements()
				return createTooltip({ anchor, panel })
			},
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Tooltip is a hover/focus-triggered popover. Observable state is the
// panel's `:popover-open` flag plus the reactive `visible` ref. Hover
// (`mouseenter`/`mouseleave`) and focus (`focusin`/`focusout`) are
// trigger bridges; Escape is the dismiss path. Post-transition events
// fire via the popover pipeline's `runTransition`.
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'mouseenter' | 'mouseleave' | 'focusin'
//              | 'focusout' | 'escape' | 'destroy'

type TooltipState = 'closed' | 'open'
type TooltipEvent =
	| 'show'
	| 'hide'
	| 'mouseenter'
	| 'mouseleave'
	| 'focusin'
	| 'focusout'
	| 'escape'
	| 'destroy'

interface TooltipContext {
	readonly api: CreateTooltipInstance
	readonly anchor: HTMLButtonElement
	readonly panel: HTMLDivElement
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildTooltipContext(options: CreateTooltipOptions = {}): TooltipContext {
	const { anchor, panel } = createTooltipElements()
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const [api] = createFactoryFixture(() =>
		createTooltip(
			{ anchor, panel },
			{
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
			},
		),
	)
	return { api, anchor, panel, opens, closes }
}

function driveToTooltipState(context: TooltipContext, state: TooltipState): void {
	if (state === 'open') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		context.opens.clear()
	}
}

function fireTooltipEvent(context: TooltipContext, event: TooltipEvent): void {
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
	if (event === 'mouseenter') {
		context.anchor.dispatchEvent(new Event('mouseenter'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'mouseleave') {
		context.anchor.dispatchEvent(new Event('mouseleave'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'focusin') {
		context.anchor.dispatchEvent(new Event('focusin'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'focusout') {
		context.anchor.dispatchEvent(new Event('focusout'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'escape') {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	context.api.destroy()
}

function assertTooltipState(context: TooltipContext, state: TooltipState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.panel.matches(':popover-open')).toBe(expectedOpen)
}

const TOOLTIP_SCENARIOS: readonly StateScenario<TooltipState, TooltipEvent, TooltipContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: (context, state) => {
			assertTooltipState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: (context, state) => {
			assertTooltipState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed × mouseenter → open (hover trigger)',
			from: 'closed',
			event: 'mouseenter',
			to: 'open',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: assertTooltipState,
	},
	{
		transition: {
			name: 'open × mouseleave → closed (hover trigger)',
			from: 'open',
			event: 'mouseleave',
			to: 'closed',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: assertTooltipState,
	},
	{
		transition: {
			name: 'closed × focusin → open (focus trigger)',
			from: 'closed',
			event: 'focusin',
			to: 'open',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: assertTooltipState,
	},
	{
		transition: {
			name: 'open × focusout → closed (focus trigger)',
			from: 'open',
			event: 'focusout',
			to: 'closed',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: assertTooltipState,
	},
	{
		transition: {
			name: 'open × escape → closed (dismiss.escape default)',
			from: 'open',
			event: 'escape',
			to: 'closed',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: assertTooltipState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToTooltipState,
		act: fireTooltipEvent,
		assert: (context, state) => {
			assertTooltipState(context, state)
			expect(context.opens.count).toBe(0)
			expect(context.closes.count).toBe(0)
		},
	},
]

describe('createTooltip (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(TOOLTIP_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildTooltipContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})
})
