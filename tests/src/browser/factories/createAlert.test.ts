import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateAlertInstance, CreateAlertOptions } from '@elements/browser'
import { ALERT_EVENTS, createAlert, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createAlert', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('assigns role="alert" when missing and defaults to visible', () => {
		const el = buildElement('aside')
		const [api] = createFactoryFixture(() => createAlert(el))
		expect(el.getAttribute('role')).toBe('alert')
		// Alerts default to visible — `<aside role="alert">` is meaningless
		// when hidden, so the framework opens by default. Authors who want
		// to mount in the dismissed state pass `{ initial: false }`.
		expect(api.visible.value).toBe(true)
		expect(el.hasAttribute('data-alert-open')).toBe(true)
	})

	it('respects `initial: false` to mount in the dismissed state', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const [api] = createFactoryFixture(() => createAlert(el, { initial: false }))
		expect(api.visible.value).toBe(false)
		expect(el.hasAttribute('data-alert-open')).toBe(false)
		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('show after hide sets data-alert-open and clears aria-hidden', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const [api] = createFactoryFixture(() => createAlert(el, { initial: false }))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(el.hasAttribute('data-alert-open')).toBe(true)
		expect(el.hasAttribute('aria-hidden')).toBe(false)
	})

	it('hide clears data-alert-open and emits close', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createAlert(el, { on: { close: close.handler } }))
		// Default-open: the alert is already visible after construction.
		expect(api.visible.value).toBe(true)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(el.hasAttribute('data-alert-open')).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('clicking [data-alert-dismiss] descendant hides the alert', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const close = document.createElement('button')
		close.type = 'button'
		close.dataset.alertDismiss = ''
		el.appendChild(close)
		const [api] = createFactoryFixture(() => createAlert(el))
		// Default-open — the click hides it.
		expect(api.visible.value).toBe(true)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		close.click()
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const show = createRecorder<[Event]>()
		el.addEventListener(ALERT_EVENTS.show, show.handler)
		// Mount dismissed so `show()` actually transitions through and
		// dispatches the `show` event (vs. early-returning because the
		// alert is already visible).
		const [api] = createFactoryFixture(() => createAlert(el, { initial: false }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createAlert(buildElement('aside', { attrs: { role: 'alert' } })))
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Alert is a binary open / closed lifecycle. The host is `<aside
// role="alert">` (the factory assigns the role if missing). `[data-
// alert-open]` mirrors `visible.value`; `[aria-hidden]` is set when the
// alert is dismissed. The `initial: false` option mounts dismissed
// (otherwise alerts default to open per createAlert.ts:14–23 rationale).
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'dismissclick' | 'destroy'

type AlertState = 'closed' | 'open'
type AlertEvent = 'show' | 'hide' | 'dismissclick' | 'destroy'

interface AlertContext {
	readonly api: CreateAlertInstance
	readonly element: HTMLElement
	readonly dismiss: HTMLButtonElement
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildAlertContext(options: CreateAlertOptions = {}): AlertContext {
	const element = buildElement('aside', { attrs: { role: 'alert' } })
	const dismiss = document.createElement('button')
	dismiss.type = 'button'
	dismiss.dataset.alertDismiss = ''
	element.appendChild(dismiss)
	const opens = createRecorder<[Event]>()
	const closes = createRecorder<[Event]>()
	element.addEventListener(ALERT_EVENTS.open, opens.handler)
	element.addEventListener(ALERT_EVENTS.close, closes.handler)
	// Default `initial: false` so the statechart starts in `closed`. Tests
	// that need the default-open behavior pass `{ initial: true }` explicitly.
	const [api] = createFactoryFixture(() => createAlert(element, { initial: false, ...options }))
	return { api, element, dismiss, opens, closes }
}

function driveToAlertState(context: AlertContext, state: AlertState): void {
	if (state === 'open') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		context.opens.clear()
	}
}

function fireAlertEvent(context: AlertContext, event: AlertEvent): void {
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
	if (event === 'dismissclick') {
		context.dismiss.click()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	context.api.destroy()
}

function assertAlertState(context: AlertContext, state: AlertState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.element.hasAttribute('data-alert-open')).toBe(expectedOpen)
}

const ALERT_SCENARIOS: readonly StateScenario<AlertState, AlertEvent, AlertContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToAlertState,
		act: fireAlertEvent,
		assert: (context, state) => {
			assertAlertState(context, state)
			expect(context.opens.count).toBe(1)
			expect(context.element.hasAttribute('aria-hidden')).toBe(false)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToAlertState,
		act: fireAlertEvent,
		assert: (context, state) => {
			assertAlertState(context, state)
			expect(context.closes.count).toBe(1)
			expect(context.element.getAttribute('aria-hidden')).toBe('true')
		},
	},
	{
		transition: {
			name: 'open × dismissclick → closed (clicks on [data-alert-dismiss] hide)',
			from: 'open',
			event: 'dismissclick',
			to: 'closed',
		},
		arrange: driveToAlertState,
		act: fireAlertEvent,
		assert: (context, state) => {
			assertAlertState(context, state)
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
		arrange: driveToAlertState,
		act: fireAlertEvent,
		assert: (context, state) => {
			assertAlertState(context, state)
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
		arrange: driveToAlertState,
		act: fireAlertEvent,
		assert: (context, state) => {
			assertAlertState(context, state)
			expect(context.opens.count).toBe(0)
		},
	},
]

describe('createAlert (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(ALERT_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildAlertContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})
})
