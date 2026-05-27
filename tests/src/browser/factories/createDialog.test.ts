import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateDialogInstance, CreateDialogOptions } from '@elements/browser'
import { createDialog, DIALOG_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createDialog', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<dialog> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createDialog(wrong as unknown as HTMLDialogElement)).toThrowError(/dialog/i)
	})

	it('starts hidden and tracks the native open state', () => {
		const dialog = buildElement('dialog')
		const [api] = createFactoryFixture(() => createDialog(dialog))
		expect(api.visible.value).toBe(false)
		expect(dialog.open).toBe(false)
	})

	it('show opens the native dialog and emits open after transition', () => {
		const dialog = buildElement('dialog')
		const open = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createDialog(dialog, { on: { open: open.handler } }))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(dialog.open).toBe(true)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(open.count).toBe(1)
	})

	it('hide closes the native dialog and emits close once', () => {
		const dialog = buildElement('dialog')
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createDialog(dialog, { on: { close: close.handler } }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(dialog.open).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
	})

	it('cancellable show is honored', () => {
		const dialog = buildElement('dialog')
		const [api] = createFactoryFixture(() =>
			createDialog(dialog, { on: { show: (event) => event.preventDefault() } }),
		)
		api.show()
		expect(api.visible.value).toBe(false)
		expect(dialog.open).toBe(false)
	})

	it('uses namespaced event names', () => {
		const dialog = buildElement('dialog')
		const show = createRecorder<[Event]>()
		dialog.addEventListener(DIALOG_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createDialog(dialog))
		api.show()
		expect(show.count).toBe(1)
	})

	it('non-modal mode opts out of native focus trap and locks scroll on demand', () => {
		const dialog = buildElement('dialog')
		const [api] = createFactoryFixture(() =>
			createDialog(dialog, { modal: false, scroll: { lock: true } }),
		)
		api.show()
		expect(dialog.open).toBe(true)
		// Non-modal `dialog.show()` doesn't lock natively, so we set the
		// shared scroll-lock attribute on body when the option asks for it.
		// The matching CSS rule in `components/_body.scss` reads the
		// attribute and pins `overflow: hidden` — verify both the JS-side
		// attribute write AND that the cascade resolves the pin.
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		expect(globalThis.getComputedStyle(document.body).overflow).toBe('hidden')
		api.hide()
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
		// Default body overflow is `visible` in a clean document.
		expect(globalThis.getComputedStyle(document.body).overflow).not.toBe('hidden')
	})

	it('dismiss.escape: false preventDefaults the native cancel event', () => {
		// On modal dialogs, Escape fires `cancel` and then the platform calls
		// `dialog.close()` as the default action. The factory's job when
		// `dismiss.escape === false` is to `preventDefault()` the cancel event
		// so the platform skips the close — leaving the dialog open.
		const dialog = buildElement('dialog')
		const [api] = createFactoryFixture(() =>
			createDialog(dialog, { modal: true, dismiss: { escape: false } }),
		)
		api.show()
		const cancel = new Event('cancel', { cancelable: true })
		dialog.dispatchEvent(cancel)
		expect(cancel.defaultPrevented).toBe(true)
		expect(api.visible.value).toBe(true)
	})

	it('the native close event flips visible back to false', () => {
		// Simulates the post-Escape platform path: after `cancel` (which
		// createDialog only blocks when `dismiss.escape: false`), the
		// platform fires `close`; the factory's `onNativeClose` mirrors
		// `visible` and emits the namespaced close event.
		const dialog = buildElement('dialog')
		const [api] = createFactoryFixture(() => createDialog(dialog, { modal: true }))
		api.show()
		dialog.dispatchEvent(new Event('close'))
		expect(api.visible.value).toBe(false)
	})

	it('destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createDialog(buildElement('dialog')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Models the factory as a finite-state machine and iterates the state ×
// event table — source state → event → target state + observable result
// per row. Invalid transitions (e.g. `hide` from `closed`) are exercised
// too; they MUST leave the state stable and emit nothing.
//
//   States   : 'closed' | 'open' (modal) | 'open-nonmodal'
//   Events   : 'show' | 'hide' | 'nativeclose' | 'destroy'
//
// Observables checked per transition:
//   - `api.visible.value`              (reactive state)
//   - `dialog.open`                    (native attribute)
//   - `dialog.matches(':modal')`       (top-layer modal flag)
//   - emitted DIALOG_EVENTS.{open,close} via recorder counts
//   - `document.body[data-elements-scroll-locked]` for non-modal+lock

type DialogState = 'closed' | 'open' | 'open-nonmodal'
type DialogEvent = 'show' | 'hide' | 'nativeclose' | 'destroy'

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

function driveToDialogState(context: DialogContext, state: DialogState): void {
	if (state === 'closed') return
	context.api.show()
	vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
	context.opens.clear()
}

function fireDialogEvent(context: DialogContext, event: DialogEvent): void {
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
	if (event === 'nativeclose') {
		// Synthetic dispatch of the native `close` event — exercises the
		// factory's `onNativeClose` bridge. Per HTML spec the platform
		// queues this event as an element task; calling `dialog.close()`
		// here would defer the listener until after this synchronous test
		// scope. The DOM `[open]` flag stays set because the platform
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

function assertDialogState(context: DialogContext, state: DialogState): void {
	const expected = DIALOG_OBSERVABLES[state]
	expect(context.api.visible.value).toBe(expected.visible)
	expect(context.element.open).toBe(expected.open)
	expect(context.element.matches(':modal')).toBe(expected.modal)
}

const DIALOG_MODAL_SCENARIOS: readonly StateScenario<DialogState, DialogEvent, DialogContext>[] = [
	{
		transition: { name: 'closed × show → open (modal)', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToDialogState,
		act: fireDialogEvent,
		assert: (context, state) => {
			assertDialogState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToDialogState,
		act: fireDialogEvent,
		assert: (context, state) => {
			assertDialogState(context, state)
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
		arrange: driveToDialogState,
		act: fireDialogEvent,
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
		arrange: driveToDialogState,
		act: fireDialogEvent,
		assert: assertDialogState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToDialogState,
		act: fireDialogEvent,
		assert: (context, state) => {
			assertDialogState(context, state)
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

	it.each(DIALOG_MODAL_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildDialogContext(true)
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
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
		fireDialogEvent(context, 'show')
		assertDialogState(context, 'open-nonmodal')
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		expect(globalThis.getComputedStyle(document.body).overflow).toBe('hidden')
	})

	it('open-nonmodal × hide → closed releases the scroll-lock attribute', () => {
		const context = buildDialogContext(false, { scroll: { lock: true } })
		fireDialogEvent(context, 'show')
		fireDialogEvent(context, 'hide')
		assertDialogState(context, 'closed')
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
	})
})
