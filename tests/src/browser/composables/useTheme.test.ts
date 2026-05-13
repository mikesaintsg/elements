import { beforeEach, describe, expect, it } from 'vitest'
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
	window.localStorage.removeItem(STORAGE_KEY_THEME)
})

describe('useTheme', () => {
	it('accepts no arguments — every option defaults', async () => {
		const [api, unmount] = mountSetup(() => useTheme())
		await waitForBootstrap()

		// `initial` defaults to `'system'`. Under jsdom there is no
		// `matchMedia`, so `systemDark` stays `false` and the resolved
		// mode reads `'light'`. With `'system'` the factory removes
		// `data-theme` from `<html>` so CSS owns the flip.
		expect(api.setting.value).toBe('system')
		expect(api.mode.value).toBe('light')
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
		unmount()
	})

	it('accepts an empty options bag', async () => {
		const [api, unmount] = mountSetup(() => useTheme({}))
		await waitForBootstrap()

		expect(api.setting.value).toBe('system')
		expect(api.mode.value).toBe('light')
		unmount()
	})

	it('seeds from the supplied initial setting', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		expect(api.setting.value).toBe('dark')
		expect(api.mode.value).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		unmount()
	})

	it('seeds from localStorage when present', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'dark')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		expect(api.setting.value).toBe('dark')
		expect(api.mode.value).toBe('dark')
		unmount()
	})

	it('tolerates the legacy mode:core storage format', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'dark:custom')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		expect(api.setting.value).toBe('dark')
		unmount()
	})

	it('persists setting changes to localStorage', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.set('dark')
		await nextTick()

		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBe('dark')
		unmount()
	})

	it('writes the system value back as a remove on the data-theme attribute', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		api.set('system')
		await nextTick()
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
		// Persistence still records the choice so reload restores it.
		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBe('system')
		unmount()
	})

	it('toggle alternates between dark and light', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.toggle()
		await nextTick()
		expect(api.setting.value).toBe('dark')
		api.toggle()
		await nextTick()
		expect(api.setting.value).toBe('light')
		unmount()
	})

	it('set is a no-op when the value matches the current setting', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		const change = createRecorder<[Event]>()
		document.documentElement.addEventListener(THEME_EVENTS.change, change.handler)

		api.set('light')
		await nextTick()

		expect(change.count).toBe(0)
		document.documentElement.removeEventListener(THEME_EVENTS.change, change.handler)
		unmount()
	})

	it('set rejects values outside the known set', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		// @ts-expect-error — runtime guard against invalid string values.
		api.set('banana')
		expect(api.setting.value).toBe('light')
		unmount()
	})

	it('emits change event with the resolved mode and setting on every transition', async () => {
		const events: string[] = []
		document.documentElement.addEventListener(THEME_EVENTS.change, (event) => {
			const detail = event instanceof CustomEvent ? event.detail : undefined
			const mode = detail ? extractProperty(detail, 'mode') : undefined
			const setting = detail ? extractProperty(detail, 'setting') : undefined
			if (typeof mode === 'string' && typeof setting === 'string') {
				events.push(`${setting}→${mode}`)
			}
		})
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.set('dark')
		await nextTick()
		api.set('system')
		await nextTick()

		expect(events).toEqual(['light→light', 'dark→dark', 'system→light'])
		unmount()
	})

	it('storage:false skips localStorage entirely', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark', storage: false }))
		await waitForBootstrap()

		api.set('light')
		await nextTick()

		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBeNull()
		unmount()
	})

	it('honors a custom storage key', async () => {
		const custom = 'my-theme'
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark', storage: { key: custom } }))
		await waitForBootstrap()

		expect(window.localStorage.getItem(custom)).toBe('dark')
		api.set('light')
		await nextTick()
		expect(window.localStorage.getItem(custom)).toBe('light')

		window.localStorage.removeItem(custom)
		unmount()
	})

	it('two callers share the same singleton', async () => {
		const [api1, unmount1] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		const [api2, unmount2] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		api1.set('dark')
		await nextTick()

		expect(api2.setting.value).toBe('dark')
		expect(api2.mode.value).toBe('dark')
		unmount1()
		unmount2()
	})

	it('handles invalid stored values by falling back to options.initial', async () => {
		window.localStorage.setItem(STORAGE_KEY_THEME, 'banana')
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		expect(api.setting.value).toBe('light')
		unmount()
	})

	it('on.change handler receives the latest detail', async () => {
		const change = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			useTheme({ initial: 'light', on: { change: change.handler } }),
		)
		await waitForBootstrap()

		api.set('dark')
		await nextTick()

		const last = change.calls.at(-1)?.[0]
		if (!last) throw new Error('Expected change event')
		expect(extractProperty(last.detail, 'mode')).toBe('dark')
		expect(extractProperty(last.detail, 'setting')).toBe('dark')
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
		api2.set('dark')
		await nextTick()

		expect(change.count).toBe(0)
		unmount2()
	})
})
