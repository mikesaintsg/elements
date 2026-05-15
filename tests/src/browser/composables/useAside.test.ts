import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useAside } from '@elements/browser'
import { buildElement, mountSetup, waitForBootstrap } from '../../../setupBrowser'

describe('useAside', () => {
	it('rejects non-<aside> hosts at watch flush', () => {
		const wrong = buildElement('div')
		expect(() => mountSetup(() => useAside(ref(wrong)), { silent: true })).toThrowError(/aside/i)
	})

	it('show opens the popover and flips visible synchronously', async () => {
		const aside = buildElement('aside')
		const [api, unmount] = mountSetup(() => useAside(ref(aside)))
		await waitForBootstrap()

		api.show()
		expect(aside.matches(':popover-open')).toBe(true)
		expect(api.visible.value).toBe(true)
		expect(aside.popover).toBe('auto')
		unmount()
	})

	it('hide closes the popover immediately (no JS-side transition wait)', async () => {
		const aside = buildElement('aside')
		const [api, unmount] = mountSetup(() => useAside(ref(aside)))
		await waitForBootstrap()

		api.show()
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(aside.matches(':popover-open')).toBe(false)
		unmount()
	})

	it('options.popover: "manual" opts out of native light-dismiss', async () => {
		const aside = buildElement('aside')
		const [_api, unmount] = mountSetup(() => useAside(ref(aside), { popover: 'manual' }))
		await waitForBootstrap()

		expect(aside.popover).toBe('manual')
		unmount()
		void _api
	})
})
