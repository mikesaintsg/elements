// ============================================================================
//  _meter.scss — three fill colors for optimum / suboptimum / even-less-good.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, rootToken, style, token } from '../../../setupStyles'

function buildMeter(): HTMLMeterElement {
	const m = document.createElement('meter')
	m.min = 0
	m.max = 1
	m.value = 0.5
	mount(m)
	return m
}

describe('meter — baseline', () => {
	it('strips UA appearance', () => {
		const m = buildMeter()
		expect(style(m, 'appearance')).toBe('none')
	})

	it('renders the configured block-size', () => {
		const m = buildMeter()
		expect(pixels(m, 'block-size')).toBeGreaterThan(0)
	})
})

describe('meter — semantic colors', () => {
	it('exposes optimum, suboptimum, even-less-good color tokens', () => {
		const m = buildMeter()
		expect(token(m, '--set-meter-optimum-color').trim()).not.toBe('')
		expect(token(m, '--set-meter-suboptimum-color').trim()).not.toBe('')
		expect(token(m, '--set-meter-even-less-good-color').trim()).not.toBe('')
	})

	it('semantic colors track --color-success / --color-warning / --color-danger', () => {
		const m = buildMeter()
		expect(token(m, '--set-meter-optimum-color').trim()).toBe(rootToken('--color-success').trim())
		expect(token(m, '--set-meter-suboptimum-color').trim()).toBe(
			rootToken('--color-warning').trim(),
		)
		expect(token(m, '--set-meter-even-less-good-color').trim()).toBe(
			rootToken('--color-danger').trim(),
		)
	})
})
