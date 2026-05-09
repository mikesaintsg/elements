import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToast, TOAST_EVENTS, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

describe('createToast', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<output> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createToast(wrong as unknown as HTMLOutputElement)).toThrowError(/output/i)
	})

	it('starts hidden; show opens the popover', () => {
		const toast = buildElement('output', { attrs: { popover: '' } })
		const [api] = createFactoryFixture(() => createToast(toast))
		expect(api.visible.value).toBe(false)
		api.show()
		expect(api.visible.value).toBe(true)
		expect(toast.matches(':popover-open')).toBe(true)
	})

	it('autohide closes the toast after the delay', () => {
		const toast = buildElement('output', { attrs: { popover: '' } })
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: { delay: 1000 } }))
		api.show()
		// runTransition fallback fires + then autohide timer kicks in.
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		vi.advanceTimersByTime(1000)
		expect(api.visible.value).toBe(false)
	})

	it('autohide:false keeps the toast sticky', () => {
		const toast = buildElement('output', { attrs: { popover: '' } })
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: false }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		vi.advanceTimersByTime(60_000)
		expect(api.visible.value).toBe(true)
	})

	it('pause stops the autohide timer; resume restarts it', () => {
		const toast = buildElement('output', { attrs: { popover: '' } })
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
		const toast = buildElement('output', { attrs: { popover: '' } })
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
		const toast = buildElement('output', { attrs: { popover: '' } })
		const open = createRecorder<[Event]>()
		toast.addEventListener(TOAST_EVENTS.open, open.handler)
		const [api] = createFactoryFixture(() => createToast(toast, { autohide: false }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(open.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() =>
			createToast(buildElement('output', { attrs: { popover: '' } }), { autohide: false }),
		)
	})
})
