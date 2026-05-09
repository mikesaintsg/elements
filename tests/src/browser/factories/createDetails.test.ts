import { describe, expect, it } from 'vitest'
import { createDetails, DETAILS_EVENTS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

describe('createDetails', () => {
	it('rejects non-<details> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createDetails(wrong as unknown as HTMLDetailsElement)).toThrowError(/details/i)
	})

	it('mirrors the native [open] state into the reactive ref', () => {
		const details = buildElement('details')
		const [api] = createFactoryFixture(() => createDetails(details))
		expect(api.visible.value).toBe(false)
		api.show()
		expect(details.open).toBe(true)
		expect(api.visible.value).toBe(true)
		api.hide()
		expect(details.open).toBe(false)
		expect(api.visible.value).toBe(false)
	})

	it('emits open after a native [open] flip', () => {
		const details = buildElement('details')
		const open = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() => createDetails(details, { on: { open: open.handler } }))
		api.show()
		expect(open.count).toBe(1)
	})

	it('cancellable show is honored', () => {
		const details = buildElement('details')
		const [api] = createFactoryFixture(() =>
			createDetails(details, { on: { show: (event) => event.preventDefault() } }),
		)
		api.show()
		expect(details.open).toBe(false)
	})

	it('accordion mode closes open siblings', () => {
		const root = buildElement('div')
		const a = document.createElement('details')
		const b = document.createElement('details')
		root.append(a, b)
		const [apiA] = createFactoryFixture(() => createDetails(a, { accordion: root }))
		const [apiB] = createFactoryFixture(() => createDetails(b, { accordion: root }))
		apiA.show()
		expect(apiA.visible.value).toBe(true)
		apiB.show()
		expect(apiB.visible.value).toBe(true)
		expect(apiA.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const details = buildElement('details')
		const show = createRecorder<[Event]>()
		details.addEventListener(DETAILS_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createDetails(details))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => createDetails(buildElement('details')),
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
