import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { resetTheme, STORAGE_KEY_THEME, THEME_EVENTS, useTheme } from '@elements/browser'
import { createRecorder, extractProperty } from '../../../setup'
import { mountSetup, waitForBootstrap } from '../../../setupBrowser'

beforeEach(() => {
	resetTheme()
	document.documentElement.removeAttribute('data-mode')
	window.localStorage.removeItem(STORAGE_KEY_THEME)
})

describe('useTheme', () => {
	it('accepts no arguments — every option defaults', async () => {
		const [api, unmount] = mountSetup(() => useTheme())
		await waitForBootstrap()

		// `initial` defaults to `'system'`. Under jsdom there is no
		// `matchMedia`, so `systemDark` stays `false` and the resolved
		// mode reads `'light'`. With `'system'` the factory removes
		// `data-mode` from `<html>` so CSS owns the flip.
		expect(api.setting.value).toBe('system')
		expect(api.mode.value).toBe('light')
		expect(document.documentElement.hasAttribute('data-mode')).toBe(false)
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
		expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
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

		// Storage round-trips a `setting:name` pair.
		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBe('dark:default')
		unmount()
	})

	it('writes the system value back as a remove on the data-mode attribute', async () => {
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'dark' }))
		await waitForBootstrap()

		expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
		api.set('system')
		await nextTick()
		expect(document.documentElement.hasAttribute('data-mode')).toBe(false)
		// Persistence still records the choice so reload restores it.
		expect(window.localStorage.getItem(STORAGE_KEY_THEME)).toBe('system:default')
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
		const root = document.documentElement
		root.addEventListener(THEME_EVENTS.light, change.handler)
		root.addEventListener(THEME_EVENTS.dark, change.handler)
		root.addEventListener(THEME_EVENTS.system, change.handler)

		api.set('light')
		await nextTick()

		expect(change.count).toBe(0)
		root.removeEventListener(THEME_EVENTS.light, change.handler)
		root.removeEventListener(THEME_EVENTS.dark, change.handler)
		root.removeEventListener(THEME_EVENTS.system, change.handler)
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

	it('emits per-setting events with the resolved mode and setting on every transition', async () => {
		const events: string[] = []
		const record = (event: Event): void => {
			const detail = event instanceof CustomEvent ? event.detail : undefined
			const mode = detail ? extractProperty(detail, 'mode') : undefined
			const setting = detail ? extractProperty(detail, 'setting') : undefined
			if (typeof mode === 'string' && typeof setting === 'string') {
				events.push(`${setting}→${mode}`)
			}
		}
		const root = document.documentElement
		root.addEventListener(THEME_EVENTS.light, record)
		root.addEventListener(THEME_EVENTS.dark, record)
		root.addEventListener(THEME_EVENTS.system, record)
		const [api, unmount] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()

		api.set('dark')
		await nextTick()
		api.set('system')
		await nextTick()

		// `initial: 'light'` matches the singleton's default seed when the
		// test harness boots, so the first transition observed is dark.
		expect(events).toEqual(['dark→dark', 'system→light'])
		root.removeEventListener(THEME_EVENTS.light, record)
		root.removeEventListener(THEME_EVENTS.dark, record)
		root.removeEventListener(THEME_EVENTS.system, record)
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

		expect(window.localStorage.getItem(custom)).toBe('dark:default')
		api.set('light')
		await nextTick()
		expect(window.localStorage.getItem(custom)).toBe('light:default')

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

	it('on.dark handler receives the latest detail', async () => {
		const dark = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			useTheme({ initial: 'light', on: { dark: dark.handler } }),
		)
		await waitForBootstrap()

		api.set('dark')
		await nextTick()

		const last = dark.calls.at(-1)?.[0]
		if (!last) throw new Error('Expected dark event')
		expect(extractProperty(last.detail, 'mode')).toBe('dark')
		expect(extractProperty(last.detail, 'setting')).toBe('dark')
		unmount()
	})

	it('on.dark is removed on unmount', async () => {
		const dark = createRecorder<[CustomEvent]>()
		const [, unmount] = mountSetup(() => useTheme({ initial: 'light', on: { dark: dark.handler } }))
		await waitForBootstrap()
		dark.clear()
		unmount()

		const [api2, unmount2] = mountSetup(() => useTheme({ initial: 'light' }))
		await waitForBootstrap()
		api2.set('dark')
		await nextTick()

		expect(dark.count).toBe(0)
		unmount2()
	})
})
