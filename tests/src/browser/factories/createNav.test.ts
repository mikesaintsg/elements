import { describe, expect, it } from 'vitest'
import { createNav } from '@elements/browser'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

describe('createNav', () => {
	it('rejects non-<nav> nav elements', () => {
		const container = buildElement('div')
		const wrong = buildElement('div')
		expect(() => createNav({ container, nav: wrong })).toThrowError(/nav/i)
	})

	it('accepts a `<nav>` element as the optional nav', () => {
		const container = buildElement('div')
		const nav = buildElement('nav')
		const [api] = createFactoryFixture(() => createNav({ container, nav }))
		expect(api.active.value).toBeNull()
	})

	it('refresh() rebuilds the IntersectionObserver', () => {
		const container = buildElement('div')
		// Add a section so the observer has something to observe.
		const section = document.createElement('section')
		section.id = 'one'
		container.appendChild(section)
		const [api] = createFactoryFixture(() => createNav({ container }))
		expect(() => api.refresh()).not.toThrow()
	})

	it('destroy reverses every listener and observer', () => {
		assertCleanDispose(() => createNav({ container: buildElement('div') }))
	})
})
