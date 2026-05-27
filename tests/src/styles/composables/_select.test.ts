// ============================================================================
//  _select.scss — composable state gates for the dropdown surface.
//
//  Two state-gated rules under coverage:
//
//    1. `.select-toggle[aria-expanded="true"]::after` rotates the chevron
//       180° — visible via `transform: rotate(180deg)` on the pseudo.
//       Tested by `findRule` (computed-style of a pseudo isn't reliable
//       across browsers; declaration presence is the contract under test).
//
//    2. `.select .select-menu > li > [data-hidden]` (and the wrapping
//       `<li>` form) gets `display: none` — the typeahead filter marker
//       that removes non-matching options from the dropdown's layout.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, style } from '../../../setupStyles'

describe('select.select-toggle — [aria-expanded] chevron rotation', () => {
	it('rule for [aria-expanded="true"] chevron rotation is declared', () => {
		// `:popover-open` is the JS-side gate; the SCSS gate is the
		// ARIA mirror. The `::after` pseudo is what carries the chevron
		// mask + rotation transition.
		expect(findRule(`[aria-expanded="true"]`)).toBe(true)
	})
})

describe('select.select-menu — [data-hidden] filter gate', () => {
	it('rule for [data-hidden] display: none is declared', () => {
		expect(findRule('[data-hidden]')).toBe(true)
	})

	it('[data-hidden] option removes itself from layout', () => {
		const wrapper = document.createElement('div')
		wrapper.className = 'select'
		const menu = document.createElement('menu')
		menu.className = 'select-menu'
		menu.setAttribute('popover', '')
		const liVisible = document.createElement('li')
		const optionVisible = document.createElement('button')
		optionVisible.type = 'button'
		optionVisible.dataset.value = 'apple'
		optionVisible.textContent = 'Apple'
		liVisible.appendChild(optionVisible)
		const liHidden = document.createElement('li')
		const optionHidden = document.createElement('button')
		optionHidden.type = 'button'
		optionHidden.dataset.value = 'banana'
		optionHidden.dataset.hidden = ''
		optionHidden.textContent = 'Banana'
		liHidden.appendChild(optionHidden)
		menu.append(liVisible, liHidden)
		wrapper.appendChild(menu)
		mount(wrapper)

		expect(style(optionVisible, 'display')).not.toBe('none')
		expect(style(optionHidden, 'display')).toBe('none')
	})

	it('flipping [data-hidden] off restores the option to layout', () => {
		const wrapper = document.createElement('div')
		wrapper.className = 'select'
		const menu = document.createElement('menu')
		menu.className = 'select-menu'
		menu.setAttribute('popover', '')
		const li = document.createElement('li')
		const option = document.createElement('button')
		option.type = 'button'
		option.dataset.value = 'apple'
		option.dataset.hidden = ''
		option.textContent = 'Apple'
		li.appendChild(option)
		menu.appendChild(li)
		wrapper.appendChild(menu)
		mount(wrapper)

		expect(style(option, 'display')).toBe('none')
		option.removeAttribute('data-hidden')
		expect(style(option, 'display')).not.toBe('none')
	})
})
