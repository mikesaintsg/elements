// ============================================================================
//  createDialog — statechart-driven transition coverage.
//
//  The companion to `createDialog.test.ts` (one-off `it(...)` cases for
//  specific edge-case rationale). This file models the factory as a finite-
//  state machine and iterates the state × event table, asserting source
//  state → event → target state + observable result per row. Invalid
//  transitions (e.g. `hide` from `closed`) are exercised too — they MUST
//  leave the state stable and emit nothing.
//
//  States   : 'closed' | 'open' (modal) | 'open-nonmodal'
//  Events   : 'show' | 'hide' | 'cancel' | 'nativeclose' | 'destroy'
//
//  Observables checked per transition:
//    - `api.visible.value`              (reactive state)
//    - `dialog.open`                    (native attribute)
//    - `dialog.matches(':modal')`       (top-layer modal flag)
//    - emitted DIALOG_EVENTS.{open,close,prevent} via recorder counts
//    - `document.body[data-elements-scroll-locked]` for non-modal+lock
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateDialogInstance, CreateDialogOptions } from '@elements/browser'
import { createDialog, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

type DialogState = 'closed' | 'open' | 'open-nonmodal'
type DialogEvent = 'show' | 'hide' | 'cancel' | 'nativeclose' | 'destroy'

interface EventRecorder {
	readonly count: number
	clear(): void
}

interface DialogContext {
	readonly api: CreateDialogInstance
	readonly element: HTMLDialogElement
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildDialogContext(modal: boolean, options: CreateDialogOptions = {}): DialogContext {
	const element = buildElement('dialog')
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const [api] = createFactoryFixture(() =>
		createDialog(element, {
			modal,
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

function driveToState(context: DialogContext, state: DialogState): void {
	if (state === 'closed') return
	context.api.show()
	vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
	context.opens.clear()
}

function fireEvent(context: DialogContext, event: DialogEvent): void {
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
	if (event === 'cancel') {
		context.element.dispatchEvent(new Event('cancel', { cancelable: true }))
		return
	}
	if (event === 'nativeclose') {
		// Synthetic dispatch of the native `close` event — exercises the
		// factory's `onNativeClose` bridge (factory's reactive `visible`
		// must flip to false when ANY external close fires, including
		// form-submit `method="dialog"` and inner-button `dialog.close()`
		// paths). Per HTML spec the platform queues this event as an
		// element task; calling `dialog.close()` here would defer the
		// listener until after this synchronous test scope, so the
		// existing factory tests (and this scenario) dispatch the event
		// directly. The DOM `[open]` flag stays set because the platform
		// close-steps aren't running — that's the bridge under test.
		context.element.dispatchEvent(new Event('close'))
		return
	}
	context.api.destroy()
}

interface DialogObservables {
	readonly visible: boolean
	readonly open: boolean
	readonly modal: boolean
}

const DIALOG_OBSERVABLES: Readonly<Record<DialogState, DialogObservables>> = {
	closed: { visible: false, open: false, modal: false },
	open: { visible: true, open: true, modal: true },
	'open-nonmodal': { visible: true, open: true, modal: false },
}

function assertState(context: DialogContext, state: DialogState): void {
	const expected = DIALOG_OBSERVABLES[state]
	expect(context.api.visible.value).toBe(expected.visible)
	expect(context.element.open).toBe(expected.open)
	expect(context.element.matches(':modal')).toBe(expected.modal)
}

const modalScenarios: readonly StateScenario<DialogState, DialogEvent, DialogContext>[] = [
	{
		transition: { name: 'closed × show → open (modal)', from: 'closed', event: 'show', to: 'open' },
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
			name: 'open × nativeclose → closed (synthetic close bridges to reactive visible)',
			from: 'open',
			event: 'nativeclose',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context) => {
			// Synthetic close-event dispatch doesn't flip native `[open]`
			// (the platform close-steps aren't running) — only `visible.value`
			// and the emitted DIALOG_EVENTS.close. Assert only those.
			expect(context.api.visible.value).toBe(false)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'open × destroy → closed (factory force-closes on destroy)',
			from: 'open',
			event: 'destroy',
			to: 'closed',
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
]

describe('createDialog (statechart) — modal mode', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(modalScenarios)('$transition.name', async (scenario) => {
		const context = buildDialogContext(true)
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('cancelled show (preventDefault) keeps state at closed', () => {
		const element = buildElement('dialog')
		const opens = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createDialog(element, {
				on: {
					show: (event) => event.preventDefault(),
					open: opens.handler,
				},
			}),
		)
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(api.visible.value).toBe(false)
		expect(element.open).toBe(false)
		expect(opens.count).toBe(0)
	})

	it('Escape guard: dismiss.escape=false preventDefaults cancel and keeps state at open', () => {
		const context = buildDialogContext(true, { dismiss: { escape: false } })
		driveToState(context, 'open')
		const cancel = new Event('cancel', { cancelable: true })
		context.element.dispatchEvent(cancel)
		expect(cancel.defaultPrevented).toBe(true)
		assertState(context, 'open')
		expect(context.closes.count).toBe(0)
	})

	it('cleanup: destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createDialog(buildElement('dialog')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

describe('createDialog (statechart) — non-modal scroll-lock', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('closed × show → open-nonmodal with scroll.lock pins body overflow', () => {
		const context = buildDialogContext(false, { scroll: { lock: true } })
		fireEvent(context, 'show')
		assertState(context, 'open-nonmodal')
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		expect(globalThis.getComputedStyle(document.body).overflow).toBe('hidden')
	})

	it('open-nonmodal × hide → closed releases the scroll-lock attribute', () => {
		const context = buildDialogContext(false, { scroll: { lock: true } })
		fireEvent(context, 'show')
		fireEvent(context, 'hide')
		assertState(context, 'closed')
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
	})
})
