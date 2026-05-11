import { afterEach, describe, expect, it } from 'vitest'
import { createTheme, resetTheme, THEME_EVENTS } from '@elements/browser'
import { assertCleanDispose, createRecorder } from '../../../setupBrowser'

afterEach(() => resetTheme())

describe('createTheme', () => {
	it('accepts no arguments — every option defaults', () => {
		const theme = createTheme()
		// `initial` defaults to `'system'`. Under jsdom there is no
		// `matchMedia` implementation, so `systemPref` stays at its initial
		// `'light'` value and the resolved theme reads `'light'`.
		expect(theme.theme.value).toBe('light')
		expect(theme.setting.value).toBe('system')
		expect(theme.core.value).toBe('default')
		theme.destroy()
	})

	it('accepts an empty options bag', () => {
		const theme = createTheme({})
		expect(theme.theme.value).toBe('light')
		expect(theme.setting.value).toBe('system')
		expect(theme.core.value).toBe('default')
		theme.destroy()
	})

	it('initialises with the provided initial mode', () => {
		const theme = createTheme({ initial: 'dark' })
		expect(theme.theme.value).toBe('dark')
		expect(theme.dark.value).toBe(true)
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		theme.destroy()
	})

	it('toggle flips dark / light', () => {
		const theme = createTheme({ initial: 'light' })
		theme.toggle()
		expect(theme.theme.value).toBe('dark')
		theme.toggle()
		expect(theme.theme.value).toBe('light')
		theme.destroy()
	})

	it('apply sets the mode imperatively', () => {
		const theme = createTheme({ initial: 'light' })
		theme.apply('dark')
		expect(theme.theme.value).toBe('dark')
		theme.destroy()
	})

	it('select changes the core', () => {
		const theme = createTheme({ initial: 'light' })
		theme.select('aurora')
		expect(theme.core.value).toBe('aurora')
		expect(document.documentElement.getAttribute('data-core')).toBe('aurora')
		theme.destroy()
	})

	it('two callers share the singleton', () => {
		const a = createTheme({ initial: 'light' })
		const b = createTheme({})
		a.toggle()
		expect(b.theme.value).toBe('dark')
		a.destroy()
		b.destroy()
	})

	it('on.change listener fires per instance and is removed by destroy', () => {
		const change = createRecorder<[Event]>()
		const theme = createTheme({ initial: 'light', on: { change: change.handler } })
		theme.toggle()
		const before = change.count
		expect(before).toBeGreaterThan(0)
		theme.destroy()
		document.documentElement.dispatchEvent(new CustomEvent(THEME_EVENTS.change, { detail: {} }))
		expect(change.count).toBe(before)
	})

	it('destroy reverses every listener it installed', () => {
		// Pre-warm the singleton-scope listeners (the `prefers-color-scheme`
		// media-query listener and the DOM-sync `effect`) before the harness
		// captures its baseline. The factory documents these as singleton
		// resources that survive `destroy()` — they're torn down by
		// `resetTheme()` (test-only), not by per-instance disposal — so they
		// must be installed *outside* the window `assertCleanDispose` measures.
		// The assertion that follows then exercises only the listeners a single
		// `createTheme()` / `destroy()` pair owns: the optional `on.change`
		// `elements:theme:change` subscription on `document.documentElement`.
		createTheme({}).destroy()
		assertCleanDispose(() => createTheme({ initial: 'light', on: { change: () => {} } }))
	})
})
