import { describe, expect, it } from 'vitest'
import { createSelect, SELECT_EVENTS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

function createSelectFixture(values: readonly string[]): {
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
} {
	const toggle = buildElement('button')
	toggle.type = 'button'
	const menu = buildElement('menu', { attrs: { popover: '' } })
	for (const value of values) {
		const li = document.createElement('li')
		const item = document.createElement('button')
		item.type = 'button'
		item.dataset.value = value
		item.textContent = value.charAt(0).toUpperCase() + value.slice(1)
		li.appendChild(item)
		menu.appendChild(li)
	}
	return { toggle, menu }
}

describe('createSelect', () => {
	it('rejects non-<menu> panels', () => {
		const toggle = buildElement('button')
		const wrong = buildElement('ul')
		expect(() => createSelect({ toggle, menu: wrong as unknown as HTMLMenuElement })).toThrowError(
			/menu/i,
		)
	})

	it('writes role="listbox" + aria-controls on the toggle', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		createFactoryFixture(() => createSelect({ toggle, menu }))
		expect(menu.getAttribute('role')).toBe('listbox')
		expect(toggle.getAttribute('aria-haspopup')).toBe('listbox')
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
		expect(toggle.getAttribute('aria-controls')).toBe(menu.id)
	})

	it('select replaces single-mode value and emits select', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b', 'c'])
		const select = createRecorder<[CustomEvent]>()
		toggle.addEventListener(SELECT_EVENTS.select, select.handler)
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }))
		api.select('b')
		expect(api.value.value).toBe('b')
		expect(api.values.value).toEqual(['b'])
		expect(select.count).toBe(1)
	})

	it('multiple mode toggles values', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b', 'c'])
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }, { multiple: true }))
		api.select('a')
		api.select('b')
		expect(api.values.value).toContain('a')
		expect(api.values.value).toContain('b')
		api.select('a') // toggle off
		expect(api.values.value).not.toContain('a')
	})

	it('clear empties the selection', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu }, { value: 'a' }))
		expect(api.values.value).toEqual(['a'])
		api.clear()
		expect(api.values.value).toEqual([])
		expect(api.value.value).toBeNull()
	})

	it('mirrors selection into native <select>', () => {
		const { toggle, menu } = createSelectFixture(['a', 'b'])
		const native = buildElement('select')
		for (const v of ['a', 'b']) {
			const opt = document.createElement('option')
			opt.value = v
			native.appendChild(opt)
		}
		const [api] = createFactoryFixture(() => createSelect({ toggle, menu, native }))
		api.select('b')
		expect(native.value).toBe('b')
	})

	it('autocomplete: input filters items via [data-hidden]', () => {
		const { toggle, menu } = createSelectFixture(['apple', 'banana', 'cherry'])
		const input = buildElement('input', { attrs: { type: 'text' } })
		const [api] = createFactoryFixture(() =>
			createSelect({ toggle, menu, input }, { autocomplete: true }),
		)
		input.value = 'an'
		input.dispatchEvent(new Event('input', { bubbles: true }))
		// Apple has 'an'? no. Banana yes. Cherry no.
		const items = menu.querySelectorAll('button')
		const hidden = Array.from(items).map((el) => el.hasAttribute('data-hidden'))
		expect(hidden).toEqual([true, false, true])
		void api
	})

	it('destroy reverses every listener and ARIA', () => {
		assertCleanDispose(() => {
			const { toggle, menu } = createSelectFixture(['a', 'b'])
			return createSelect({ toggle, menu })
		})
	})
})
