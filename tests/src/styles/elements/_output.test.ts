// ============================================================================
//  _output.scss — light cascade chip for calculation results.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, style, token } from '../../../setupStyles'

function buildOutput(classes = ''): HTMLOutputElement {
	const o = document.createElement('output')
	if (classes) o.className = classes
	o.textContent = '42'
	mount(o)
	return o
}

describe('output — baseline', () => {
	it('renders monospace font-family', () => {
		const o = buildOutput()
		expect(style(o, 'font-family')).toContain('mono')
	})

	it('renders zero padding by default', () => {
		const o = buildOutput()
		expect(pixels(o, 'padding-top')).toBe(0)
		expect(pixels(o, 'padding-left')).toBe(0)
	})
})

describe('output — variant cascade', () => {
	it('.danger paints text via --set-output-color', () => {
		const o = buildOutput('danger')
		const expected = style(document.documentElement, '--color-danger').trim()
		expect(token(o, '--set-output-color').trim()).toBe(expected)
	})
})

describe('output — filled style', () => {
	it('.filled adds inline padding', () => {
		const o = buildOutput('filled')
		expect(pixels(o, 'padding-left')).toBeGreaterThan(0)
	})
})

