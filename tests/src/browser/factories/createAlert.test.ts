import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALERT_EVENTS, createAlert, TRANSITION_FALLBACK_MS } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

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
