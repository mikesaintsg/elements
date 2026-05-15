import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDetails } from '@elements/browser'
import { buildElement, mountSetup, waitForBootstrap } from '../../../setupBrowser'

describe('useDetails', () => {
	it('rejects non-<details> hosts at watch flush', () => {
		const wrong = buildElement('div')
		expect(() =>
			mountSetup(() => useDetails(ref(wrong as unknown as HTMLDetailsElement)), { silent: true }),
		).toThrowError(/details/i)
	})

	it('show / hide flip the native [open] attribute', async () => {
		const details = buildElement('details')
		const [api, unmount] = mountSetup(() => useDetails(ref(details)))
		await waitForBootstrap()

		api.show()
		expect(details.open).toBe(true)
		expect(api.visible.value).toBe(true)
		api.hide()
		expect(details.open).toBe(false)
		expect(api.visible.value).toBe(false)
		unmount()
	})

	it('initial:true opens after mount', async () => {
		const details = buildElement('details')
		const [api, unmount] = mountSetup(() => useDetails(ref(details), { initial: true }))
		await waitForBootstrap()
		// `initial` schedules a microtask `show()`; flush it.
		await Promise.resolve()
		expect(api.visible.value).toBe(true)
		expect(details.open).toBe(true)
		unmount()
	})

	it('accordion mode: opening one closes its open siblings', async () => {
		const root = buildElement('div')
		const a = document.createElement('details')
		const b = document.createElement('details')
		root.append(a, b)
		const [apiA, unmountA] = mountSetup(() =>
			useDetails(ref(a), { accordion: ref<HTMLElement | null>(root) }),
		)
		const [apiB, unmountB] = mountSetup(() =>
			useDetails(ref(b), { accordion: ref<HTMLElement | null>(root) }),
		)
		await waitForBootstrap()

		apiA.show()
		expect(apiA.visible.value).toBe(true)
		apiB.show()
		expect(apiB.visible.value).toBe(true)
		expect(apiA.visible.value).toBe(false)
		unmountA()
		unmountB()
	})
})
