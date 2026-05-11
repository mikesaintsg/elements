import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { TRANSITION_FALLBACK_MS, useAside } from '@elements/browser'
import { buildElement, mountSetup, waitForBootstrap } from '../../../setupBrowser'

describe('useAside', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<aside> hosts at watch flush', () => {
		const wrong = buildElement('div')
		expect(() => mountSetup(() => useAside(ref(wrong)))).toThrowError(/aside/i)
	})

	it('show opens the popover with data-aside-open + ARIA modal', async () => {
		const aside = buildElement('aside')
		const [api, unmount] = mountSetup(() => useAside(ref(aside)))
		await waitForBootstrap()

		api.show()
		expect(api.visible.value).toBe(true)
		expect(aside.matches(':popover-open')).toBe(true)
		expect(aside.hasAttribute('data-aside-open')).toBe(true)
		expect(aside.getAttribute('aria-modal')).toBe('true')
		unmount()
	})

	it('hide closes the popover and clears data-aside-open', async () => {
		const aside = buildElement('aside')
		const [api, unmount] = mountSetup(() => useAside(ref(aside)))
		await waitForBootstrap()

		api.show()
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(aside.hasAttribute('data-aside-open')).toBe(false)
		// Popover close happens at the end of the transition.
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(aside.matches(':popover-open')).toBe(false)
		unmount()
	})

	it('locks body scroll while open and releases on hide', async () => {
		const aside = buildElement('aside')
		const [api, unmount] = mountSetup(() => useAside(ref(aside)))
		await waitForBootstrap()

		api.show()
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(true)
		api.hide()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(document.body.hasAttribute('data-elements-scroll-locked')).toBe(false)
		unmount()
	})
})
