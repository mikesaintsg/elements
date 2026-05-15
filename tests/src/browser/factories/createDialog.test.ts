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
