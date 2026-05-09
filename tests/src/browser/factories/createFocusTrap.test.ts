import { describe, expect, it } from 'vitest'
import { createFocusTrap } from '@src/browser'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

function createTrapHost(): {
	readonly host: HTMLDivElement
	readonly buttons: readonly HTMLButtonElement[]
} {
	const host = buildElement('div')
	const buttons: HTMLButtonElement[] = []
	for (let i = 0; i < 3; i++) {
		const button = document.createElement('button')
		button.type = 'button'
		button.textContent = `Button ${i}`
		host.appendChild(button)
		buttons.push(button)
	}
	return { host, buttons }
}

describe('createFocusTrap', () => {
	it('starts inactive', () => {
		const { host } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host))
		expect(api.active.value).toBe(false)
	})

	it('activate focuses the first focusable descendant', () => {
		const { host, buttons } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host))
		api.activate()
		expect(api.active.value).toBe(true)
		expect(document.activeElement).toBe(buttons[0])
	})

	it('Tab on the last focusable wraps back to the first', () => {
		const { host, buttons } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host))
		api.activate()
		buttons[buttons.length - 1]?.focus()
		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
		document.dispatchEvent(event)
		expect(document.activeElement).toBe(buttons[0])
	})

	it('Shift+Tab on the first wraps to the last', () => {
		const { host, buttons } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host))
		api.activate()
		buttons[0]?.focus()
		const event = new KeyboardEvent('keydown', {
			key: 'Tab',
			shiftKey: true,
			bubbles: true,
			cancelable: true,
		})
		document.dispatchEvent(event)
		expect(document.activeElement).toBe(buttons[buttons.length - 1])
	})

	it('deactivate restores focus to the previously focused element', () => {
		const previous = buildElement('button')
		previous.type = 'button'
		previous.focus()
		const { host } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host))
		api.activate()
		api.deactivate()
		expect(api.active.value).toBe(false)
		expect(document.activeElement).toBe(previous)
	})

	it('initial accepts an explicit element to focus first', () => {
		const { host, buttons } = createTrapHost()
		const [api] = createFactoryFixture(() => createFocusTrap(host, { initial: buttons[2] }))
		api.activate()
		expect(document.activeElement).toBe(buttons[2])
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createFocusTrap(buildElement('div')))
	})
})
