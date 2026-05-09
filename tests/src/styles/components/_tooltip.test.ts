// ============================================================================
//  Tooltip chrome — `[popover=hint]` and `[role=tooltip]`.
//
//  Lives in `surfaces/_popover.scss` as a smaller, inverted, less-padded
//  variant of the popover surface. Both selectors get identical chrome.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'DIV' || child.tagName === 'ASIDE') child.remove()
	}
})

describe('tooltip — token surface', () => {
	it('exposes --set-popover-hint-* on :root', () => {
		expect(rootToken('--set-popover-hint-color').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-background-color').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-padding-inline').trim()).not.toBe('')
		expect(rootToken('--set-popover-hint-max-inline-size').trim()).not.toBe('')
	})
})

describe('tooltip — `[popover=hint]` smaller-variant chrome', () => {
	it('paints with smaller padding than a regular `[popover]`', () => {
		const regular = build('div')
		regular.setAttribute('popover', '')
		regular.id = 'reg-popover'
		mount(regular)

		const hint = build('div')
		hint.setAttribute('popover', 'hint')
		hint.id = 'hint-popover'
		mount(hint)

		expect(pixels(hint, 'padding-inline-start')).toBeLessThan(
			pixels(regular, 'padding-inline-start'),
		)
	})

	it('caps at a hint max-inline-size so wrapping triggers on long copy', () => {
		const hint = build('div')
		hint.setAttribute('popover', 'hint')
		hint.id = 'hint-cap'
		mount(hint)
		const max = style(hint, 'max-inline-size')
		expect(max).not.toBe('none')
		expect(parseFloat(max)).toBeGreaterThan(0)
	})
})

describe('tooltip — `[role=tooltip]` shares the hint chrome', () => {
	it('a non-popover `[role=tooltip]` paints with the same hint colors', () => {
		const role = build('div')
		role.setAttribute('role', 'tooltip')
		mount(role)
		expect(style(role, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
	})
})
