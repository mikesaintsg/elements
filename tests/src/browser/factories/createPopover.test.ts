import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreatePopoverInstance, CreatePopoverOptions } from '@elements/browser'
import { createPopover, POPOVER_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	createFactoryFixture,
	createPopoverElements,
	runScenario,
} from '../../../setupBrowser'

describe('createPopover', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts hidden and configures native manual popover mode', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		expect(api.visible.value).toBe(false)
		expect(panel.popover).toBe('manual')
		expect(panel.matches(':popover-open')).toBe(false)
	})

	it('show opens the native popover and tags the panel with the resolved side', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }, { placement: 'end' }))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBe('end')
		// `position-area` is the inline override that drives the actual
		// placement; surface CSS reads either this or the fallback token.
		expect(panel.style.positionArea).toBe('right')
	})

	it('hide closes the native popover and emits close after transition', () => {
		const { anchor, panel } = createPopoverElements()
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { on: { close: close.handler } }),
		)
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(panel.matches(':popover-open')).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
	})

	it('cancelable show is honored', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { on: { show: (event) => event.preventDefault() } }),
		)
		api.show()
		expect(api.visible.value).toBe(false)
	})

	it('outside pointerdown and Escape dismiss by default', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		expect(api.visible.value).toBe(false)

		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(false)
	})

	it('update with new placement refreshes the side attribute', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }, { placement: 'top' }))
		api.show()
		api.update({ placement: 'bottom' })
		expect(api.placement.value).toBe('bottom')
		expect(panel.dataset.popoverSide).toBe('bottom')
		expect(panel.style.positionArea).toBe('bottom')
	})

	it('placement:false skips placement attributes', () => {
		const { anchor, panel } = createPopoverElements()
		const place = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { placement: false, on: { place: place.handler } }),
		)
		api.show()
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.style.positionArea).toBe('')
		expect(place.count).toBe(0)
	})

	it('hover trigger toggles visibility', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { trigger: { hover: true } }),
		)
		anchor.dispatchEvent(new Event('mouseenter'))
		expect(api.visible.value).toBe(true)
		anchor.dispatchEvent(new Event('mouseleave'))
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { anchor, panel } = createPopoverElements()
		const show = createRecorder<[Event]>()
		anchor.addEventListener(POPOVER_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy clears placement attributes and removes listeners', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		expect(api.visible.value).toBe(false)
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.style.positionArea).toBe('')
		expect(panel.matches(':popover-open')).toBe(false)
	})

	it('destroy is idempotent', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		expect(() => api.destroy()).not.toThrow()
		expect(panel.dataset.popoverSide).toBeUndefined()
	})

	it('show after destroy still applies attributes (state methods stay callable)', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		api.show()
		expect(panel.dataset.popoverSide).toBe('bottom')
	})

	it('destroy reverses every listener and timer it installed', () => {
		assertCleanDispose(
			() => {
				const { anchor, panel } = createPopoverElements()
				return createPopover({ anchor, panel })
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
// Popover is the base every other floating-surface factory composes
// (Menu, Tooltip, Aside drawer mode). The statechart asserts the native
// `:popover-open` flag, the panel's `aria-expanded` mirror on the anchor,
// the placement attributes (`[data-popover-side]`, inline
// `style.position-area`), and the post-transition `POPOVER_EVENTS.open` /
// `close` emissions.
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'toggle' | 'escape' | 'outside'
//              | 'hoverin' | 'hoverout' | 'destroy'

type PopoverState = 'closed' | 'open'
type PopoverEvent =
	| 'show'
	| 'hide'
	| 'toggle'
	| 'escape'
	| 'outside'
	| 'hoverin'
	| 'hoverout'
	| 'destroy'

interface PopoverContext {
	readonly api: CreatePopoverInstance
	readonly anchor: HTMLButtonElement
	readonly panel: HTMLDivElement
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildPopoverContext(options: CreatePopoverOptions = {}): PopoverContext {
	const { anchor, panel } = createPopoverElements()
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const [api] = createFactoryFixture(() =>
		createPopover(
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

function driveToPopoverState(context: PopoverContext, state: PopoverState): void {
	if (state === 'open') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		context.opens.clear()
	}
}

function firePopoverEvent(context: PopoverContext, event: PopoverEvent): void {
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
	if (event === 'toggle') {
		context.api.toggle()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'escape') {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'outside') {
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'hoverin') {
		context.anchor.dispatchEvent(new Event('mouseenter'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'hoverout') {
		context.anchor.dispatchEvent(new Event('mouseleave'))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	context.api.destroy()
}

function assertPopoverState(context: PopoverContext, state: PopoverState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.panel.matches(':popover-open')).toBe(expectedOpen)
	expect(context.anchor.getAttribute('aria-expanded')).toBe(expectedOpen ? 'true' : 'false')
}

const POPOVER_SCENARIOS: readonly StateScenario<PopoverState, PopoverEvent, PopoverContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: (context, state) => {
			assertPopoverState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: (context, state) => {
			assertPopoverState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: { name: 'closed × toggle → open', from: 'closed', event: 'toggle', to: 'open' },
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: assertPopoverState,
	},
	{
		transition: { name: 'open × toggle → closed', from: 'open', event: 'toggle', to: 'closed' },
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: assertPopoverState,
	},
	{
		transition: {
			name: 'open × escape → closed (dismiss.escape default)',
			from: 'open',
			event: 'escape',
			to: 'closed',
		},
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: assertPopoverState,
	},
	{
		transition: {
			name: 'open × outside pointerdown → closed (dismiss.outside default)',
			from: 'open',
			event: 'outside',
			to: 'closed',
		},
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: assertPopoverState,
	},
	{
		transition: {
			name: 'open × destroy → closed (factory releases popover on destroy)',
			from: 'open',
			event: 'destroy',
			to: 'closed',
		},
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: (context, state) => {
			expect(context.api.visible.value).toBe(state === 'open')
			expect(context.panel.matches(':popover-open')).toBe(false)
		},
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToPopoverState,
		act: firePopoverEvent,
		assert: (context, state) => {
			assertPopoverState(context, state)
			expect(context.opens.count).toBe(0)
			expect(context.closes.count).toBe(0)
		},
	},
]

describe('createPopover (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(POPOVER_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildPopoverContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('trigger.hover: closed × hoverin → open, open × hoverout → closed', () => {
		const context = buildPopoverContext({ trigger: { hover: true } })
		firePopoverEvent(context, 'hoverin')
		assertPopoverState(context, 'open')
		firePopoverEvent(context, 'hoverout')
		assertPopoverState(context, 'closed')
	})

	it('guard: dismiss.escape=false keeps state at open after Escape', () => {
		const context = buildPopoverContext({ dismiss: { escape: false } })
		driveToPopoverState(context, 'open')
		firePopoverEvent(context, 'escape')
		assertPopoverState(context, 'open')
	})

	it('guard: dismiss.outside=false keeps state at open after outside pointerdown', () => {
		const context = buildPopoverContext({ dismiss: { outside: false } })
		driveToPopoverState(context, 'open')
		firePopoverEvent(context, 'outside')
		assertPopoverState(context, 'open')
	})
})
