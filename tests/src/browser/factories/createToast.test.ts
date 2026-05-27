import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateToastInstance, CreateToastOptions } from '@elements/browser'
import { createToast, TOAST_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

// The toast root is a `<div role="status">`: a toast renders flow content
// (`<header>` bands + paragraphs) that `<output>`'s phrasing-only HTML
// content model forbids. `role="status"` IS `<output>`'s implicit ARIA role
// (an atomic, polite live region), so the screen-reader announcement
// semantic is preserved exactly while the element accepts the flow content
// the toast actually renders. The factory sets `role="status"` if the
// consumer omitted it, so the live-region contract holds regardless of
// markup discipline.
const toastRoot = (role = 'status') =>
	buildElement('div', { attrs: role ? { popover: '', role } : { popover: '' } })

describe('createToast', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<div> hosts', () => {
		const wrong = buildElement('output')
		expect(() => createToast(wrong as unknown as HTMLDivElement)).toThrowError(/div/i)
	})

	it('sets role="status" when the consumer omitted it (preserves the live-region semantic)', () => {
		const toast = toastRoot('') // <div popover> with NO role
		createFactoryFixture(() => createToast(toast))
		expect(toast.getAttribute('role')).toBe('status')
	})

	it('respects a consumer-set role', () => {
		const toast = buildElement('div', { attrs: { popover: '', role: 'alert' } })
		createFactoryFixture(() => createToast(toast))
		expect(toast.getAttribute('role')).toBe('alert')
	})

	it('starts hidden; show opens the popover', () => {
		const toast = toastRoot()
		const [api] = createFactoryFixture(() => createToast(toast))
		expect(api.visible.value).toBe(false)
		api.show()
		expect(api.visible.value).toBe(true)
		expect(toast.matches(':popover-open')).toBe(true)
	})

	it('autohide closes the toast after the delay', () => {
		const toast = toastRoot()
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: { delay: 1000 } }))
		api.show()
		// runTransition fallback fires + then autohide timer kicks in.
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		vi.advanceTimersByTime(1000)
		expect(api.visible.value).toBe(false)
	})

	it('autohide:false keeps the toast sticky', () => {
		const toast = toastRoot()
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: false }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		vi.advanceTimersByTime(60_000)
		expect(api.visible.value).toBe(true)
	})

	it('pause stops the autohide timer; resume restarts it', () => {
		const toast = toastRoot()
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: { delay: 1000 } }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.pause()
		vi.advanceTimersByTime(2000)
		expect(api.visible.value).toBe(true)
		api.resume()
		vi.advanceTimersByTime(1000)
		expect(api.visible.value).toBe(false)
	})

	it('hover pauses, mouseleave resumes', () => {
		const toast = toastRoot()
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: { delay: 500 } }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		toast.dispatchEvent(new Event('mouseenter'))
		vi.advanceTimersByTime(2000)
		expect(api.visible.value).toBe(true)
		toast.dispatchEvent(new Event('mouseleave'))
		vi.advanceTimersByTime(500)
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const toast = toastRoot()
		const open = createRecorder<[Event]>()
		toast.addEventListener(TOAST_EVENTS.open, open.handler)
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: false }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(open.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() =>
			createToast(buildElement('div', { attrs: { popover: '', role: 'status' } }), {
				autohide: false,
			}),
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Toast has two orthogonal regions:
//   - Visibility: 'closed' | 'open'
//   - Autohide timer (only meaningful when open): 'playing' | 'paused'
//
// Composite states are 'closed', 'open-playing', 'open-paused'. Events
// cover the visibility lifecycle plus the autohide pause/resume verbs
// and the hover pause/mouseleave-resume bridge.
//
//   Events   : 'show' | 'hide' | 'pause' | 'resume' | 'mouseenter'
//              | 'mouseleave' | 'autohide' | 'destroy'

type ToastState = 'closed' | 'open-playing' | 'open-paused'
type ToastEvent =
	| 'show'
	| 'hide'
	| 'pause'
	| 'resume'
	| 'mouseenter'
	| 'mouseleave'
	| 'autohide'
	| 'destroy'

const TOAST_DELAY_MS = 1000

interface ToastEventRecorder {
	readonly count: number
	clear(): void
}

interface ToastContext {
	readonly api: CreateToastInstance
	readonly element: HTMLDivElement
	readonly opens: ToastEventRecorder
	readonly closes: ToastEventRecorder
}

function buildToastContext(options: CreateToastOptions = {}): ToastContext {
	const element = buildElement('div', { attrs: { popover: '', role: 'status' } })
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const merged: CreateToastOptions = {
		autohide: { delay: TOAST_DELAY_MS },
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
	}
	const [api] = createFactoryFixture(() => createToast(element, merged))
	return { api, element, opens, closes }
}

function driveToToastState(context: ToastContext, state: ToastState): void {
	if (state === 'closed') return
	context.api.show()
	vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
	context.opens.clear()
	if (state === 'open-paused') context.api.pause()
}

function fireToastEvent(context: ToastContext, event: ToastEvent): void {
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
	if (event === 'pause') {
		context.api.pause()
		return
	}
	if (event === 'resume') {
		context.api.resume()
		return
	}
	if (event === 'mouseenter') {
		context.element.dispatchEvent(new Event('mouseenter'))
		return
	}
	if (event === 'mouseleave') {
		context.element.dispatchEvent(new Event('mouseleave'))
		return
	}
	if (event === 'autohide') {
		vi.advanceTimersByTime(TOAST_DELAY_MS)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	context.api.destroy()
}

function assertToastVisible(context: ToastContext, state: ToastState): void {
	const expectedOpen = state !== 'closed'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.element.matches(':popover-open')).toBe(expectedOpen)
}

const TOAST_SCENARIOS: readonly StateScenario<ToastState, ToastEvent, ToastContext>[] = [
	{
		transition: {
			name: 'closed × show → open-playing',
			from: 'closed',
			event: 'show',
			to: 'open-playing',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open-playing × hide → closed',
			from: 'open-playing',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open-playing × autohide → closed (delay elapses)',
			from: 'open-playing',
			event: 'autohide',
			to: 'closed',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open-playing × pause → open-paused (timer suspended)',
			from: 'open-playing',
			event: 'pause',
			to: 'open-paused',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			// Advance well past the autohide delay — the toast must stay
			// open because the timer is paused.
			vi.advanceTimersByTime(TOAST_DELAY_MS * 2)
			expect(context.api.visible.value).toBe(true)
			expect(context.closes.count).toBe(0)
		},
	},
	{
		transition: {
			name: 'open-paused × resume → open-playing (timer restarts)',
			from: 'open-paused',
			event: 'resume',
			to: 'open-playing',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			vi.advanceTimersByTime(TOAST_DELAY_MS + TRANSITION_FALLBACK_MS)
			expect(context.api.visible.value).toBe(false)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open-playing × mouseenter → open-paused (hover bridge)',
			from: 'open-playing',
			event: 'mouseenter',
			to: 'open-paused',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			vi.advanceTimersByTime(TOAST_DELAY_MS * 2)
			expect(context.api.visible.value).toBe(true)
		},
	},
	{
		transition: {
			name: 'open-paused × mouseleave → open-playing (hover bridge)',
			from: 'open-paused',
			event: 'mouseleave',
			to: 'open-playing',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			vi.advanceTimersByTime(TOAST_DELAY_MS + TRANSITION_FALLBACK_MS)
			expect(context.api.visible.value).toBe(false)
		},
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToToastState,
		act: fireToastEvent,
		assert: (context, state) => {
			assertToastVisible(context, state)
			expect(context.opens.count).toBe(0)
			expect(context.closes.count).toBe(0)
		},
	},
]

describe('createToast (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(TOAST_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildToastContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('autohide:false keeps the toast in open-playing indefinitely', () => {
		const context = buildToastContext({ autohide: false })
		fireToastEvent(context, 'show')
		assertToastVisible(context, 'open-playing')
		vi.advanceTimersByTime(60_000)
		expect(context.api.visible.value).toBe(true)
	})
})
