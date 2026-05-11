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

	it('ships a default chip padding so the result reads as a discrete value', () => {
		// Bare <output> ships chrome unlike most inline phrasing: a tinted
		// surface with a thin border and small padding so a calculation
		// result doesn't blend into surrounding prose. See `_output.scss`
		// rationale.
		const o = buildOutput()
		expect(pixels(o, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(o, 'padding-left')).toBeGreaterThan(0)
	})

	it('paints a thin border so the chip shape reads', () => {
		const o = buildOutput()
		expect(pixels(o, 'border-top-width')).toBe(1)
	})
})

describe('output — variant cascade', () => {
	it('.danger paints text via --set-output-color (text-emphasis tier)', () => {
		// Bare output reads the SUBTLE tier — variant text-emphasis on
		// variant bg-subtle — so a `<output class="danger">` chip looks
		// like a danger-tinted code chip without `.filled`. See the new
		// `_output.scss` cascade.
		const o = buildOutput('danger')
		const expected = style(document.documentElement, '--color-danger-text-emphasis').trim()
		expect(token(o, '--set-output-color').trim()).toBe(expected)
	})
})

describe('output — filled style', () => {
	it('.filled fills with the variant background color', () => {
		const o = buildOutput('primary filled')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(o, '--set-output-background-color').trim()).toBe(expected)
	})

	it('.filled paints white text (variant-fill contrast)', () => {
		const o = buildOutput('primary filled')
		expect(token(o, '--set-output-color').trim()).toBe('white')
	})
})
