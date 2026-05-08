// ============================================================================
//  _dialog.scss — chrome on the open dialog + ::backdrop surface tokens.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, rootToken, style, token } from '../../../setupStyles'

describe('dialog — open chrome', () => {
	it('renders padding when open', () => {
		const dialog = document.createElement('dialog')
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(pixels(dialog, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(dialog, 'padding-left')).toBeGreaterThan(0)
	})

	it('renders a 1px border', () => {
		const dialog = document.createElement('dialog')
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(pixels(dialog, 'border-top-width')).toBe(1)
	})

	it('renders a non-empty box-shadow', () => {
		const dialog = document.createElement('dialog')
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(style(dialog, 'box-shadow')).not.toBe('none')
	})

	it('renders a non-zero border-radius', () => {
		const dialog = document.createElement('dialog')
		mount(dialog)
		dialog.setAttribute('open', '')
		expect(pixels(dialog, 'border-top-left-radius')).toBeGreaterThan(0)
	})
})

describe('dialog — variant cascade', () => {
	it('.primary moves the border to the primary color', () => {
		const dialog = document.createElement('dialog')
		dialog.className = 'primary'
		mount(dialog)
		dialog.setAttribute('open', '')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(dialog, '--set-dialog-border-color').trim()).toBe(expected)
	})
})

describe('::backdrop — surface tokens', () => {
	it('--set-backdrop-background-color resolves on :root', () => {
		expect(rootToken('--set-backdrop-background-color')).not.toBe('')
	})

	it('--set-backdrop-backdrop-filter resolves on :root', () => {
		expect(rootToken('--set-backdrop-backdrop-filter')).not.toBe('')
	})
})
