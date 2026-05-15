import { describe, expect, it } from 'vitest'
import { createMenu, MENU_EVENTS } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

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

	it('keyboard navigation: ArrowDown opens + roves; Home/End jump to ends', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		const items = menu.querySelectorAll('a')

		// First ArrowDown on the closed toggle: opens the menu AND focuses the
		// first item (rove-from-nothing → index 0).
		toggle.focus()
		toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		expect(api.visible.value).toBe(true)
		expect(document.activeElement).toBe(items[0])

		// Next ArrowDown moves to the second item.
		items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		expect(document.activeElement).toBe(items[1])

		// End jumps to the last item.
		items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
		expect(document.activeElement).toBe(items[items.length - 1])

		// Home jumps back to the first.
		items[items.length - 1]?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
		)
		expect(document.activeElement).toBe(items[0])
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
