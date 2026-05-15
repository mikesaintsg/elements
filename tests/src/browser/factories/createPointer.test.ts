import { describe, expect, it } from 'vitest'
import { createPointer } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture, createPointerEvent } from '../../../setupBrowser'

describe('createPointer', () => {
	it('initial dragging is false', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		expect(api.dragging.value).toBe(false)
	})

	it('pointerdown → pointerup fires start + end', () => {
		const el = buildElement('div')
		const start = createRecorder<[PointerEvent]>()
		const end = createRecorder<[PointerEvent]>()
		const [api] = createFactoryFixture(() =>
			createPointer(el, { on: { start: start.handler, end: end.handler } }),
		)
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		expect(start.count).toBe(1)
		el.dispatchEvent(createPointerEvent('pointerup'))
		expect(api.dragging.value).toBe(false)
		expect(end.count).toBe(1)
	})

	it('accept can veto pointerdown', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el, { accept: () => false }))
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(false)
	})

	it('clear cancels in-flight drag', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		api.clear()
		expect(api.dragging.value).toBe(false)
	})

	it('destroy is idempotent', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createPointer(el))
		api.destroy()
		expect(() => api.destroy()).not.toThrow()
	})

	it('destroy reverses every listener it installed', () => {
		assertCleanDispose(() => createPointer(buildElement('div')))
	})
})
