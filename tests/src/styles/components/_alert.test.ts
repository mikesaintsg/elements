// ============================================================================
//  Alert chrome — `<aside role="alert">` banner.
//
//  Aside lives in the components layer with two contexts: body-shell
//  sidebar vs. article callout. The alert role adds a third shape: a
//  flex-row banner with leading variant bar and trailing dismiss button.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { mount, pixels, render, rootToken, style } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'ASIDE') child.remove()
	}
})

describe('alert — token surface', () => {
	it('exposes --set-alert-* on :root', () => {
		expect(rootToken('--set-alert-color').trim()).not.toBe('')
		expect(rootToken('--set-alert-border-color').trim()).not.toBe('')
		expect(rootToken('--set-alert-bar-width').trim()).not.toBe('')
	})
})

describe('alert — `<aside role="alert">` banner shape', () => {
	it('paints a flex row with a leading variant bar', () => {
		const aside = render('aside', 'danger')
		aside.setAttribute('role', 'alert')
		// `useAlert` toggles `[data-alert-open]` to drive open/closed
		// chrome. Static markup that wants the alert visible from the
		// start sets the attribute up front; the framework treats its
		// absence as the dismissed state (zero height + opacity).
		aside.setAttribute('data-alert-open', '')
		mount(aside)
		expect(style(aside, 'display')).toBe('flex')
		// Leading bar: thicker inline-start border (not the regular
		// container border).
		expect(pixels(aside, 'border-inline-start-width')).toBeGreaterThan(2)
	})

	it('a trailing dismiss `<button>` is pushed to the inline-end edge', () => {
		const aside = render('aside', '')
		aside.setAttribute('role', 'alert')
		aside.setAttribute('data-alert-open', '')
		const text = document.createElement('span')
		text.textContent = 'Heads up.'
		const close = document.createElement('button')
		close.setAttribute('aria-label', 'Dismiss')
		close.textContent = '×'
		aside.append(text, close)
		mount(aside)
		// `margin-inline-start: auto` is the convention for "push to end".
		// The computed value resolves to a pixel measurement that's
		// non-zero (the auto-distance the button gets pushed).
		expect(style(close, 'margin-inline-start')).not.toBe('0px')
	})
})
