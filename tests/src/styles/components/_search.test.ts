// ============================================================================
//  components/_search.scss — bare <search> as search bar.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

describe('search — token surface', () => {
	it('exposes --set-search-* tokens on a bare <search>', () => {
		const el = render('search', '')
		expect(token(el, '--set-search-color').trim()).not.toBe('')
		expect(token(el, '--set-search-gap').trim()).not.toBe('')
	})
})

describe('search — bare element renders as a flex row', () => {
	it('flex layout with wrap + center alignment + gap', () => {
		const el = render('search', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-wrap')).toBe('wrap')
		expect(style(el, 'align-items')).toBe('center')
		expect(pixels(el, 'gap')).toBeGreaterThan(0)
	})

	it('descendant <input> grows to fill the row', () => {
		const search = build('search')
		const input = build('input')
		const button = build('button', '', 'Go')
		search.append(input, button)
		mount(search)

		expect(style(input, 'flex-grow')).toBe('1')
	})
})
