import { describe, expect, it } from 'vitest'
import { createDrop } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createDragEvent,
	createFactoryFixture,
} from '../../../setupBrowser'

describe('createDrop', () => {
	it('starts not over', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el))
		expect(api.over.value).toBe(false)
	})

	it('dragenter sets over=true; drop clears it', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el))
		el.dispatchEvent(createDragEvent('dragenter'))
		expect(api.over.value).toBe(true)
		el.dispatchEvent(createDragEvent('drop'))
		expect(api.over.value).toBe(false)
	})

	it('accept type-list filters; non-matching dragenter is ignored', () => {
		const el = buildElement('div')
		const [api] = createFactoryFixture(() => createDrop(el, { accept: ['text/uri-list'] }))
		const transfer = new DataTransfer()
		transfer.setData('text/plain', 'reject me')
		el.dispatchEvent(createDragEvent('dragenter', { data: transfer }))
		expect(api.over.value).toBe(false)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createDrop(buildElement('div')))
	})
})
