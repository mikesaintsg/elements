// ============================================================================
//  _popover.scss — `[popover]` top-layer surface tokens + open-state chrome.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, rootToken, style, token } from '../../../setupStyles'

describe('popover — surface tokens', () => {
	it('every --set-popover-* token resolves on :root', () => {
		expect(rootToken('--set-popover-background-color')).not.toBe('')
		expect(rootToken('--set-popover-border-color')).not.toBe('')
		expect(rootToken('--set-popover-border-radius')).not.toBe('')
		expect(rootToken('--set-popover-padding-inline')).not.toBe('')
		expect(rootToken('--set-popover-padding-block')).not.toBe('')
		expect(rootToken('--set-popover-box-shadow')).not.toBe('')
		expect(rootToken('--set-popover-transition-duration')).not.toBe('')
	})
})

describe('popover — open chrome', () => {
	function buildPopover(): HTMLElement {
		const el = document.createElement('div')
		el.setAttribute('popover', '')
		el.textContent = 'panel'
		mount(el)
		return el
	}

	it('renders padding from --set-popover-padding-* when shown', () => {
		const el = buildPopover()
		el.showPopover()
		expect(pixels(el, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(el, 'padding-left')).toBeGreaterThan(0)
		el.hidePopover()
	})

	it('renders a non-zero border-radius', () => {
		const el = buildPopover()
		el.showPopover()
		expect(pixels(el, 'border-top-left-radius')).toBeGreaterThan(0)
		el.hidePopover()
	})

	it('renders a non-empty box-shadow', () => {
		const el = buildPopover()
		el.showPopover()
		expect(style(el, 'box-shadow')).not.toBe('none')
		el.hidePopover()
	})

	it('exposes the popover-background-color token on the element', () => {
		const el = buildPopover()
		el.showPopover()
		expect(token(el, '--set-popover-background-color').trim()).not.toBe('')
		el.hidePopover()
	})
})
