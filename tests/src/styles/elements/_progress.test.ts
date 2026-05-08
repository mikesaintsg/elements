// ============================================================================
//  _progress.scss — flat track + variant-tracked fill via vendor pseudos.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { mount, pixels, style, token } from '../../../setupStyles'

function buildProgress(classes = '', value = 0.5): HTMLProgressElement {
	const p = document.createElement('progress')
	if (classes) p.className = classes
	p.max = 1
	p.value = value
	mount(p)
	return p
}

describe('progress — baseline', () => {
	it('strips UA appearance', () => {
		const p = buildProgress()
		expect(style(p, 'appearance')).toBe('none')
	})

	it('renders the configured block-size', () => {
		const p = buildProgress()
		expect(pixels(p, 'block-size')).toBeGreaterThan(0)
	})

	it('renders rounded ends', () => {
		const p = buildProgress()
		expect(pixels(p, 'border-top-left-radius')).toBeGreaterThan(0)
	})
})

describe('progress — variant cascade', () => {
	it('.warning routes the fill color through --set-progress-fill-color', () => {
		const p = buildProgress('warning')
		const expected = style(document.documentElement, '--color-warning').trim()
		expect(token(p, '--set-progress-fill-color').trim()).toBe(expected)
	})
})
