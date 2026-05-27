// ============================================================================
//  _toast.scss — composable state gates for the toast surface.
//
//  Multiple state selectors gate toast chrome:
//
//    - `:popover-open` on `[popover][role="status"]` — visible state.
//    - `[data-toast-swiping]` — pointer-drag pause (disables transitions).
//    - `[data-toast-stack-hidden]` — overflow card in deck mode (opacity 0,
//      pointer-events none).
//
//  These tests render real toast nodes, toggle the markers, and assert
//  the computed-style flip — proving the cascade observes the JS-side
//  attribute writes the toast factory makes.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { findRule, mount, style } from '../../../setupStyles'

function renderToast(): HTMLDivElement {
	const toast = document.createElement('div')
	toast.setAttribute('popover', '')
	toast.setAttribute('role', 'status')
	toast.textContent = 'Hello'
	return mount(toast)
}

describe('toast — :popover-open transition discipline', () => {
	it('rule for [popover][role="status"] transition is declared', () => {
		expect(findRule(`[popover][role="status"]`)).toBe(true)
	})

	it('toast not under [data-toast-swiping] declares a non-zero transition-duration', () => {
		const toast = renderToast()
		// Even in the closed state, the `@include transition(...)` on
		// the bare `[popover][role="status"]:not([data-toast-swiping])`
		// selector resolves a transition-duration so the close
		// animation has motion to ride.
		const duration = style(toast, 'transition-duration')
		expect(duration).not.toBe('0s')
		expect(duration).not.toBe('')
	})

	it('[data-toast-swiping] flip suppresses the transition', () => {
		const toast = renderToast()
		toast.setAttribute('data-toast-swiping', '')
		// `[popover][role="status"][data-toast-swiping]` overrides with
		// `transition: none`, so the per-pointer-frame translate runs
		// instantly.
		expect(style(toast, 'transition-property')).toBe('none')
	})
})

describe('toast.deck — [data-toast-stack-hidden] overflow gate', () => {
	it('rule for [data-toast-stack-hidden] is declared', () => {
		expect(findRule('[data-toast-stack-hidden]')).toBe(true)
	})

	it('overflow toast paints opacity: 0 and pointer-events: none', () => {
		const stack = document.createElement('div')
		stack.setAttribute('data-toast-stack', '')
		const front = document.createElement('div')
		front.setAttribute('popover', '')
		front.setAttribute('role', 'status')
		const overflow = document.createElement('div')
		overflow.setAttribute('popover', '')
		overflow.setAttribute('role', 'status')
		overflow.setAttribute('data-toast-stack-hidden', '')
		stack.append(front, overflow)
		mount(stack)

		expect(style(overflow, 'opacity')).toBe('0')
		expect(style(overflow, 'pointer-events')).toBe('none')
	})
})

describe('toast — touch-action gate prevents OS swipe-back', () => {
	it('toast root sets touch-action: pan-y so horizontal swipe-to-dismiss is the framework gesture', () => {
		const toast = renderToast()
		// The composable layer pins `touch-action: pan-y` on toast roots
		// so a horizontal swipe inside the toast doesn't trigger the
		// browser's history-navigation gesture and the JS drag listener
		// gets the events.
		expect(style(toast, 'touch-action')).toBe('pan-y')
	})
})
