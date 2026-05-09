import { describe, expect, it } from 'vitest'
import { createMenu, MENU_EVENTS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

function createMenuElements(): {
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
} {
	const toggle = buildElement('button')
	toggle.type = 'button'
	const menu = buildElement('menu', { attrs: { popover: '' } })
	for (let i = 0; i < 3; i++) {
		const li = document.createElement('li')
		const item = document.createElement('a')
		item.href = '#'
		item.textContent = `Item ${i + 1}`
		li.appendChild(item)
		menu.appendChild(li)
	}
	return { toggle, menu }
}

describe('createMenu', () => {
	it('rejects non-<menu> panels', () => {
		const toggle = buildElement('button')
		const wrong = buildElement('ul')
		expect(() => createMenu({ toggle, menu: wrong as unknown as HTMLMenuElement })).toThrowError(
			/menu/i,
		)
	})

	it('starts hidden with aria-expanded="false" and aria-haspopup="menu"', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		expect(api.visible.value).toBe(false)
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
		expect(toggle.getAttribute('aria-haspopup')).toBe('menu')
	})

	it('toggle click opens / closes; aria-expanded mirrors', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		toggle.click()
		expect(api.visible.value).toBe(true)
		expect(toggle.getAttribute('aria-expanded')).toBe('true')
		toggle.click()
		expect(api.visible.value).toBe(false)
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
	})

	it('clicking an item dismisses by default', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		api.show()
		const firstItem = menu.querySelector('a')!
		firstItem.click()
		expect(api.visible.value).toBe(false)
	})

	it('forwards flip threshold as --set-menu-flip; flip:0 drops the cap', () => {
		const a = createMenuElements()
		const [, ,] = createFactoryFixture(() => createMenu(a, { flip: 7 }))
		expect(a.menu.style.getPropertyValue('--set-menu-flip')).toBe('7')

		const b = createMenuElements()
		const [, ,] = createFactoryFixture(() => createMenu(b, { flip: 0 }))
		expect(b.menu.style.maxBlockSize).toBe('none')
		expect(b.menu.style.positionTryFallbacks).toBe('flip-inline')
	})

	it('uses namespaced event names', () => {
		const { toggle, menu } = createMenuElements()
		const show = createRecorder<[Event]>()
		toggle.addEventListener(MENU_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener and clears ARIA', () => {
		assertCleanDispose(
			() => {
				const { toggle, menu } = createMenuElements()
				return createMenu({ toggle, menu })
			},
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
