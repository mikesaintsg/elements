import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { resetTheme, STORAGE_KEY_THEME, THEME_EVENTS, useTheme } from '@elements/browser'
import {
	createRecorder,
	extractProperty,
	mountSetup,
	waitForBootstrap,
} from '../../../setupBrowser'

beforeEach(() => {
	resetTheme()
	document.documentElement.removeAttribute('data-theme')
	document.documentElement.removeAttribute('data-core')
	window.localStorage.removeItem(STORAGE_KEY_THEME)
})

describe('useTheme', () => {
	it('accepts no arguments — every option defaults', async () => {
		const [api, unmount] = mountSetup(() => useTheme())
		await waitForBootstrap()

		// `initial` defaults to `'system'`. Under jsdom there is no
		// `matchMedia`, so `systemPref` stays at its `'light'` default and
		// the resolved theme reads `'light'`.
		expect(api.theme.value).toBe('light')
		expect(api.setting.value).toBe('system')
		expect(api.core.value).toBe('default')
		unmount()
	})

	it('accepts an empty options bag', async () => {
		const [api, unmount] = mountSetup(() => useTheme({}))
		await waitForBootstrap()

		expect(api.theme.value).toBe('light')
		expect(api.setting.value).toBe('system')
		expect(api.core.value).toBe('default')
		unmount()
	})

	it('seeds from the supplied initial mode and default core', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('dark')
		expect(api.core.value).toBe('default')
		expect(api.dark.value).toBe(true)
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		expect(document.documentElement.getAttribute('data-core')).toBe('default')
		unmount()
	})

	it('seeds an alternate core from options', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: 'aurora' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('light')
		expect(api.core.value).toBe('aurora')
		expect(document.documentElement.getAttribute('data-core')).toBe('aurora')
		unmount()
	})

	it('seeds a caller-defined core from options', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: 'custom' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('light')
		expect(api.core.value).toBe('custom')
		expect(document.documentElement.getAttribute('data-core')).toBe('custom')
		unmount()
	})

	it('seeds from localStorage when present', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'dark:custom')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('dark')
		expect(api.core.value).toBe('custom')
		unmount()
	})

	it('supports legacy stored mode values', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'dark')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: 'aurora' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('dark')
		expect(api.core.value).toBe('default')
		unmount()
	})

	it('persists mode and core changes to localStorage', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.apply('dark')
		api.select('aurora')
		await nextTick()

		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBe('dark:aurora')
		unmount()
	})

	it('toggle alternates between dark and light without changing core', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: 'aurora' }))
		await waitForBootstrap()

		api.toggle()
		await nextTick()
		expect(api.theme.value).toBe('dark')
		expect(api.core.value).toBe('aurora')
		api.toggle()
		await nextTick()
		expect(api.theme.value).toBe('light')
		unmount()
	})

	it('select changes core without changing mode', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		api.select('aurora')
		await nextTick()
		expect(api.theme.value).toBe('dark')
		expect(api.core.value).toBe('aurora')
		api.select('default')
		await nextTick()
		expect(api.core.value).toBe('default')
		unmount()
	})

	it('apply and select are no-ops when values match current state', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		const change = createRecorder<[Event]>()
		document.documentElement.addEventListener(THEME_EVENTS.change, change.handler)

		api.apply('light')
		api.select('default')
		await nextTick()

		expect(change.count).toBe(0)
		document.documentElement.removeEventListener(THEME_EVENTS.change, change.handler)
		unmount()
	})

	it('ignores empty core values', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: '' }))
		await waitForBootstrap()

		expect(api.core.value).toBe('default')
		api.select('')
		await nextTick()
		expect(api.core.value).toBe('default')
		unmount()
	})

	it('emits change event with mode and core on every transition', async () => {
		const events: string[] = []
		document.documentElement.addEventListener(THEME_EVENTS.change, (event) => {
			const mode = event instanceof CustomEvent ? extractProperty(event.detail, 'mode') : undefined
			const core = event instanceof CustomEvent ? extractProperty(event.detail, 'core') : undefined
			if (typeof mode === 'string' && typeof core === 'string') events.push(`${mode}:${core}`)
		})
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.apply('dark')
		await nextTick()
		api.select('aurora')
		await nextTick()

		expect(events).toEqual(['light:default', 'dark:default', 'dark:aurora'])
		unmount()
	})

	it('storage:false skips localStorage entirely', async () => {
		const [api, unmount] = mountSetup(() =>
			useTheme({ initial: 'dark', core: 'aurora', storage: false }),
		)
		await waitForBootstrap()

		api.apply('light')
		api.select('default')
		await nextTick()

		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBeNull()
		unmount()
	})

	it('honors a custom storage key', async () => {
		const custom = 'my-theme'
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark', storage: { key: custom } }))
		await waitForBootstrap()

		expect(window.localStorage.getItem(custom)).toBe('dark:default')
		api.select('aurora')
		await nextTick()
		expect(window.localStorage.getItem(custom)).toBe('dark:aurora')

		window.localStorage.removeItem(custom)
		unmount()
	})

	it('two callers share the same singleton', async () => {
		const [api1, unmount1] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		const [api2, unmount2] = mountSetup(() => useTheme({ initial: 'dark', core: 'aurora' }))
		await waitForBootstrap()

		api1.apply('dark')
		api1.select('aurora')
		await nextTick()

		expect(api2.theme.value).toBe('dark')
		expect(api2.core.value).toBe('aurora')
		unmount1()
		unmount2()
	})

	it('handles invalid stored values by falling back', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'banana')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light', core: 'aurora' }))
		await waitForBootstrap()

		expect(api.theme.value).toBe('light')
		expect(api.core.value).toBe('aurora')
		unmount()
	})

	it('on.change handler receives the latest detail', async () => {
		const change = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			useTheme({ initial: 'light', on: { change: change.handler } }),
		)
		await waitForBootstrap()

		api.select('aurora')
		await nextTick()

		const last = change.calls.at(-1)?.[0]
		if (!last) throw new Error('Expected change event')
		expect(extractProperty(last.detail, 'mode')).toBe('light')
		expect(extractProperty(last.detail, 'core')).toBe('aurora')
		unmount()
	})

	it('on.change is removed on unmount', async () => {
		const change = createRecorder<[CustomEvent]>()
		const [, unmount] = mountSetup(() =>
			useTheme({ initial: 'light', on: { change: change.handler } }),
		)
		await waitForBootstrap()
		change.clear()
		unmount()

		const [api2, unmount2] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		api2.apply('dark')
		await nextTick()

		expect(change.count).toBe(0)
		unmount2()
	})
})
