import { describe, expect, it } from 'vitest'
import { ASIDE_EVENTS, createAside } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

describe('createAside', () => {
	it('rejects non-<aside> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createAside(wrong)).toThrowError(/aside/i)
	})

	it('defaults popover to "auto" so native light-dismiss kicks in', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		expect(api.visible.value).toBe(false)
		expect(aside.popover).toBe('auto')
	})

	it('respects options.popover: "manual" for sticky panels', () => {
		const aside = buildElement('aside')
		const [_api] = createFactoryFixture(() => createAside(aside, { popover: 'manual' }))
		expect(aside.popover).toBe('manual')
		void _api
	})

	it('options.popover: false leaves the author-declared attribute untouched', () => {
		const aside = buildElement('aside')
		aside.setAttribute('popover', 'manual')
		const [_api] = createFactoryFixture(() => createAside(aside, { popover: false }))
		expect(aside.popover).toBe('manual')
		void _api
	})

	it('show opens the popover and flips visible via the native toggle event', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		expect(aside.matches(':popover-open')).toBe(true)
		expect(api.visible.value).toBe(true)
	})

	it('hide closes the popover and flips visible back', () => {
		const aside = buildElement('aside')
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		api.hide()
		expect(aside.matches(':popover-open')).toBe(false)
		expect(api.visible.value).toBe(false)
	})

	it('emits namespaced show / open / hide / close events bridged from beforetoggle + toggle', () => {
		const aside = buildElement('aside')
		const show = createRecorder<[Event]>()
		const open = createRecorder<[Event]>()
		const hide = createRecorder<[Event]>()
		const close = createRecorder<[Event]>()
		aside.addEventListener(ASIDE_EVENTS.show, show.handler)
		aside.addEventListener(ASIDE_EVENTS.open, open.handler)
		aside.addEventListener(ASIDE_EVENTS.hide, hide.handler)
		aside.addEventListener(ASIDE_EVENTS.close, close.handler)
		const [api] = createFactoryFixture(() => createAside(aside))
		api.show()
		expect(show.count).toBe(1)
		expect(open.count).toBe(1)
		api.hide()
		expect(hide.count).toBe(1)
		expect(close.count).toBe(1)
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
