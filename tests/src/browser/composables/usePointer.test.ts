import { describe, it, expect } from 'vitest'
import { usePointer } from '@elements/browser'
import { createRecorder } from '../../../setup'
import {
	buildElement,
	createPointerEvent,
	withElement,
	waitForBootstrap,
} from '../../../setupBrowser'

describe('usePointer', () => {
	it('initial dragging is false', async () => {
		const el = buildElement('div')
		const [api, unmount] = withElement(el, (ref) => usePointer(ref))
		await waitForBootstrap()
		expect(api.dragging.value).toBe(false)
		unmount()
	})

	it('pointerdown starts a drag', async () => {
		const el = buildElement('div')
		const start = createRecorder<[PointerEvent]>()
		const [api, unmount] = withElement(el, (ref) =>
			usePointer(ref, { on: { start: start.handler } }),
		)
		await waitForBootstrap()

		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		expect(start.count).toBe(1)
		unmount()
	})

	it('pointermove fires on.move', async () => {
		const el = buildElement('div')
		const move = createRecorder<[PointerEvent]>()
		const [, unmount] = withElement(el, (ref) => usePointer(ref, { on: { move: move.handler } }))
		await waitForBootstrap()

		el.dispatchEvent(createPointerEvent('pointerdown'))
		el.dispatchEvent(createPointerEvent('pointermove', { clientX: 10 }))
		expect(move.count).toBe(1)
		unmount()
	})

	it('pointerup ends the drag and calls on.end', async () => {
		const el = buildElement('div')
		const end = createRecorder<[PointerEvent]>()
		const [api, unmount] = withElement(el, (ref) => usePointer(ref, { on: { end: end.handler } }))
		await waitForBootstrap()

		el.dispatchEvent(createPointerEvent('pointerdown'))
		el.dispatchEvent(createPointerEvent('pointerup'))
		expect(api.dragging.value).toBe(false)
		expect(end.count).toBe(1)
		unmount()
	})

	it('pointercancel ends the drag', async () => {
		const el = buildElement('div')
		const end = createRecorder<[PointerEvent]>()
		const [api, unmount] = withElement(el, (ref) => usePointer(ref, { on: { end: end.handler } }))
		await waitForBootstrap()

		el.dispatchEvent(createPointerEvent('pointerdown'))
		el.dispatchEvent(createPointerEvent('pointercancel'))
		expect(api.dragging.value).toBe(false)
		expect(end.count).toBe(1)
		unmount()
	})

	it('accept callback can veto pointerdown', async () => {
		const el = buildElement('div')
		const start = createRecorder<[PointerEvent]>()
		const [api, unmount] = withElement(el, (ref) =>
			usePointer(ref, { accept: () => false, on: { start: start.handler } }),
		)
		await waitForBootstrap()
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(false)
		expect(start.count).toBe(0)
		unmount()
	})

	it('cursor option locks document.body cursor for drag', async () => {
		const el = buildElement('div')
		const original = document.body.style.cursor
		const [api, unmount] = withElement(el, (ref) => usePointer(ref, { cursor: 'grabbing' }))
		await waitForBootstrap()

		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(document.body.style.cursor).toBe('grabbing')
		expect(document.body.style.userSelect).toBe('none')
		el.dispatchEvent(createPointerEvent('pointerup'))
		expect(document.body.style.cursor).toBe(original)
		expect(document.body.style.userSelect).toBe('')
		unmount()
		expect(api.dragging.value).toBe(false)
	})

	it('a second pointerdown while a drag is active is ignored', async () => {
		const el = buildElement('div')
		const start = createRecorder<[PointerEvent]>()
		const [, unmount] = withElement(el, (ref) => usePointer(ref, { on: { start: start.handler } }))
		await waitForBootstrap()
		el.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1 }))
		el.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 2 }))
		expect(start.count).toBe(1)
		unmount()
	})

	it('move events for non-active pointer are ignored', async () => {
		const el = buildElement('div')
		const move = createRecorder<[PointerEvent]>()
		const [, unmount] = withElement(el, (ref) => usePointer(ref, { on: { move: move.handler } }))
		await waitForBootstrap()
		el.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1 }))
		el.dispatchEvent(createPointerEvent('pointermove', { pointerId: 2 }))
		expect(move.count).toBe(0)
		unmount()
	})

	it('clear() cancels in-progress drag', async () => {
		const el = buildElement('div')
		const [api, unmount] = withElement(el, (ref) => usePointer(ref))
		await waitForBootstrap()
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		api.clear()
		expect(api.dragging.value).toBe(false)
		unmount()
	})

	it('clear() while not dragging is a no-op', async () => {
		const el = buildElement('div')
		const [api, unmount] = withElement(el, (ref) => usePointer(ref))
		await waitForBootstrap()
		expect(() => api.clear()).not.toThrow()
		unmount()
	})

	it('cleanup on unmount cancels in-progress drag', async () => {
		const el = buildElement('div')
		const move = createRecorder<[PointerEvent]>()
		const [api, unmount] = withElement(el, (ref) => usePointer(ref, { on: { move: move.handler } }))
		await waitForBootstrap()
		el.dispatchEvent(createPointerEvent('pointerdown'))
		expect(api.dragging.value).toBe(true)
		unmount()
		expect(api.dragging.value).toBe(false)
	})
})
