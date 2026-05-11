import { describe, expect, it } from 'vitest'
import { BUTTON_EVENTS, createButton } from '@elements/browser'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

describe('createButton', () => {
	it('rejects non-<button> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createButton(wrong as unknown as HTMLButtonElement)).toThrowError(/button/i)
	})

	it('seeds aria-pressed from initial active state', () => {
		const button = buildElement('button')
		button.classList.add('active')
		const [api] = createFactoryFixture(() => createButton(button))
		expect(api.active.value).toBe(true)
		expect(button.getAttribute('aria-pressed')).toBe('true')
	})

	it('toggle flips active class + aria-pressed', () => {
		const button = buildElement('button')
		const [api] = createFactoryFixture(() => createButton(button))
		api.toggle()
		expect(api.active.value).toBe(true)
		expect(button.classList.contains('active')).toBe(true)
		expect(button.getAttribute('aria-pressed')).toBe('true')
		api.toggle()
		expect(api.active.value).toBe(false)
		expect(button.classList.contains('active')).toBe(false)
	})

	it('emits namespaced toggle event with detail.active', () => {
		const button = buildElement('button')
		const calls: boolean[] = []
		button.addEventListener(BUTTON_EVENTS.toggle, (event) => {
			if (event instanceof CustomEvent) calls.push(event.detail.active)
		})
		const [api] = createFactoryFixture(() => createButton(button))
		api.toggle()
		api.toggle()
		expect(calls).toEqual([true, false])
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createButton(buildElement('button')))
	})
})
