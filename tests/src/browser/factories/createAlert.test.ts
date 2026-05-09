import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALERT_EVENTS, createAlert, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

describe('createAlert', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('assigns role="alert" when missing', () => {
		const el = buildElement('aside')
		const [api] = createFactoryFixture(() => createAlert(el))
		expect(el.getAttribute('role')).toBe('alert')
		expect(api.visible.value).toBe(false)
	})

	it('show sets data-alert-open and clears aria-hidden', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const [api] = createFactoryFixture(() => createAlert(el))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(el.hasAttribute('data-alert-open')).toBe(true)
		expect(el.hasAttribute('aria-hidden')).toBe(false)
	})

	it('hide clears data-alert-open and emits close', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createAlert(el, { on: { close: close.handler } }))
		api.show()
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
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		close.click()
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const el = buildElement('aside', { attrs: { role: 'alert' } })
		const show = createRecorder<[Event]>()
		el.addEventListener(ALERT_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createAlert(el))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createAlert(buildElement('aside', { attrs: { role: 'alert' } })))
	})
})
