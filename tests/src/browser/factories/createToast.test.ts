import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToast, TOAST_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

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
