import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ASIDE_EVENTS, createAside, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

describe('createAside', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<aside> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createAside(wrong)).toThrowError(/aside/i)
	})

	it('starts hidden, sets popover=manual, marks the panel inert', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		expect(api.visible.value).toBe(false)
		expect(aside.popover).toBe('manual')
		// `inert` (instead of `aria-hidden`) — `aria-hidden` triggers a
		// browser console warning if a descendant retains focus when the
		// attribute is set; `inert` blurs descendants automatically and is
		// the W3C-recommended alternative for the closed-state contract.
		expect(aside.hasAttribute('inert')).toBe(true)
	})

	it('show opens the popover, sets data-aside-open + ARIA, locks scroll', () => {
		const aside = buildElement('aside')
		const open = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createAside(aside, { on: { open: open.handler } }))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(aside.matches(':popover-open')).toBe(true)
		expect(aside.hasAttribute('data-aside-open')).toBe(true)
		expect(aside.getAttribute('aria-modal')).toBe('true')
		expect(aside.getAttribute('role')).toBe('dialog')
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(open.count).toBe(1)
	})

	it('hide closes the popover and emits close after transition', () => {
		const aside = buildElement('aside')
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createAside(aside, { on: { close: close.handler } }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(aside.hasAttribute('data-aside-open')).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
		expect(aside.matches(':popover-open')).toBe(false)
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
	})

	it('Escape dismisses by default; dismiss.escape:false fires prevent on static backdrop', () => {
		const aside = buildElement('aside')
		const prevent = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createAside(aside, {
				dismiss: { escape: false, backdrop: 'static' },
				on: { prevent: prevent.handler },
			}),
		)
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(true)
		expect(prevent.count).toBe(1)
	})

	it('uses namespaced event names', () => {
		const aside = buildElement('aside')
		const show = createRecorder<[Event]>()
		aside.addEventListener(ASIDE_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createAside(buildElement('aside')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
