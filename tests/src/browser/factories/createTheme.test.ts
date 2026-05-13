import { afterEach, describe, expect, it } from 'vitest'
import { createTheme, resetTheme, THEME_EVENTS } from '@elements/browser'
import { assertCleanDispose, createRecorder } from '../../../setupBrowser'

afterEach(() => resetTheme())

describe('createTheme', () => {
	it('accepts no arguments — every option defaults', () => {
		const theme = createTheme()
		// `initial` defaults to `'system'`. Under jsdom there is no
		// `matchMedia` implementation, so `systemDark` stays `false` and the
		// resolved mode reads `'light'`. With `'system'` the factory
		// removes `data-theme` from `<html>` so the CSS media query owns
		// the OS-follow.
		expect(theme.setting.value).toBe('system')
		expect(theme.mode.value).toBe('light')
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
		theme.destroy()
	})

	it('accepts an empty options bag', () => {
		const theme = createTheme({})
		expect(theme.setting.value).toBe('system')
		expect(theme.mode.value).toBe('light')
		theme.destroy()
	})

	it('initialises with the provided initial setting', () => {
		const theme = createTheme({ initial: 'dark' })
		expect(theme.setting.value).toBe('dark')
		expect(theme.mode.value).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		theme.destroy()
	})

	it('removes data-theme when setting reverts to system', () => {
		const theme = createTheme({ initial: 'dark' })
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
		theme.set('system')
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
		theme.destroy()
	})

	it('toggle flips dark / light', () => {
		const theme = createTheme({ initial: 'light' })
		theme.toggle()
		expect(theme.setting.value).toBe('dark')
		expect(theme.mode.value).toBe('dark')
		theme.toggle()
		expect(theme.setting.value).toBe('light')
		theme.destroy()
	})

	it('set is a no-op when value matches current setting', () => {
		const theme = createTheme({ initial: 'light' })
		const change = createRecorder<[Event]>()
		document.documentElement.addEventListener(THEME_EVENTS.change, change.handler)
		theme.set('light')
		expect(change.count).toBe(0)
		document.documentElement.removeEventListener(THEME_EVENTS.change, change.handler)
		theme.destroy()
	})

	it('set rejects values outside the known set', () => {
		const theme = createTheme({ initial: 'light' })
		// @ts-expect-error — runtime guard against invalid string values.
		theme.set('banana')
		expect(theme.setting.value).toBe('light')
		theme.destroy()
	})

	it('two callers share the singleton', () => {
		const a = createTheme({ initial: 'light' })
		const b = createTheme({})
		a.toggle()
		expect(b.setting.value).toBe('dark')
		expect(b.mode.value).toBe('dark')
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
		// media-query listener and the DOM-sync `watch`) before the harness
		// captures its baseline. The factory documents these as singleton
		// resources that survive `destroy()` — they're torn down by
		// `resetTheme()` (test-only), not by per-instance disposal — so they
		// must be installed *outside* the window `assertCleanDispose` measures.
		createTheme({}).destroy()
		assertCleanDispose(() => createTheme({ initial: 'light', on: { change: () => {} } }))
	})
})
