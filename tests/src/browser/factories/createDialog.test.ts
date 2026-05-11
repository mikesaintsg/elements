import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDialog, DIALOG_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
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
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		api.hide()
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
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
