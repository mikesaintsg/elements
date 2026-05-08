// ============================================================================
//  _fieldset.scss + _legend.scss — full cascade chrome on the group, light
//  cascade typography on the legend.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

function buildFieldset(classes = ''): { fieldset: HTMLFieldSetElement; legend: HTMLLegendElement } {
	const fieldset = build('fieldset', classes)
	const legend = build('legend', '', 'Group')
	fieldset.appendChild(legend)
	mount(fieldset)
	return { fieldset, legend }
}

describe('fieldset — baseline', () => {
	it('renders padding from --set-size-padding-* fallback', () => {
		const { fieldset } = buildFieldset()
		expect(pixels(fieldset, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(fieldset, 'padding-left')).toBeGreaterThan(0)
	})

	it('renders a border', () => {
		const { fieldset } = buildFieldset()
		expect(pixels(fieldset, 'border-top-width')).toBeGreaterThanOrEqual(1)
	})

	it('renders a non-zero border-radius', () => {
		const { fieldset } = buildFieldset()
		expect(pixels(fieldset, 'border-top-left-radius')).toBeGreaterThan(0)
	})

	it('keeps `min-inline-size: 0` so flex/grid shrink works', () => {
		const { fieldset } = buildFieldset()
		expect(style(fieldset, 'min-inline-size')).toBe('0px')
	})
})

describe('fieldset — variant cascade', () => {
	it('.primary moves the border to the primary color', () => {
		const { fieldset } = buildFieldset('primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(fieldset, '--set-fieldset-border-color').trim()).toBe(expected)
	})
})

describe('fieldset — disabled', () => {
	it('dims when `disabled` is set', () => {
		const { fieldset } = buildFieldset()
		fieldset.disabled = true
		expect(parseFloat(style(fieldset, 'opacity'))).toBeLessThan(1)
	})
})

describe('legend — typography', () => {
	it('reads font-weight 600', () => {
		const { legend } = buildFieldset()
		expect(parseInt(style(legend, 'font-weight'), 10)).toBe(600)
	})

	it('legend color tracks fieldset color', () => {
		const { fieldset, legend } = buildFieldset('primary')
		expect(token(legend, '--set-legend-color').trim()).toBe(
			token(fieldset, '--set-fieldset-color').trim(),
		)
	})
})

