import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useDialog } from '@src/browser'
import { buildElement, mountSetup, waitForBootstrap } from '../../../setupBrowser'

describe('useDialog', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('rejects non-<dialog> hosts at watch flush', async () => {
		const wrong = buildElement('div')
		expect(() =>
			mountSetup(() => useDialog(ref(wrong as unknown as HTMLDialogElement))),
		).toThrowError(/dialog/i)
	})

	it('show / hide drive the native dialog open state', async () => {
		const dialog = buildElement('dialog')
		const [api, unmount] = mountSetup(() => useDialog(ref(dialog)))
		await waitForBootstrap()

		api.show()
		expect(api.visible.value).toBe(true)
		expect(dialog.open).toBe(true)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(dialog.open).toBe(false)
		unmount()
	})

	it('toggle alternates show / hide', async () => {
		const dialog = buildElement('dialog')
		const [api, unmount] = mountSetup(() => useDialog(ref(dialog)))
		await waitForBootstrap()

		api.toggle()
		expect(api.visible.value).toBe(true)
		api.toggle()
		expect(api.visible.value).toBe(false)
		unmount()
	})
})
