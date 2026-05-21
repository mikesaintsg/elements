import type { CreateThemeInstance, CreateThemeOptions, ThemeName, ThemeSetting } from '../types.js'
import { readonly } from '@vue/reactivity'
import { THEME_EVENTS } from '../constants.js'
import { isSetting, listen } from '../helpers.js'
import { bootstrapTheme, themeState } from '../theme.js'

/**
 * Framework-agnostic theme controller. Singleton — every call returns refs
 * pointing at the same shared state, so multiple consumers stay in sync
 * with no plumbing.
 *
 * **CSS owns OS follow.** When `setting === 'system'` (the default), the
 * theme service removes `data-theme` from `<html>` and lets the stylesheet's
 * `@media (prefers-color-scheme: dark)` rule do its job. When the user
 * picks an explicit `'light'` or `'dark'`, the theme service pins it via
 * `data-theme=<setting>`. There is exactly one matchMedia listener for the
 * entire page; it feeds `systemDark` so the `mode` ref can report what's
 * being rendered (for sun/moon icon swaps), but it does NOT rewrite the
 * DOM on OS-preference changes — CSS handles that for free.
 *
 * `destroy()` removes the per-instance `on.change` listener. The singleton
 * matchMedia listener and DOM-apply watcher survive — they're owned by the
 * page, not by any one caller. Use `resetTheme()` (test-only) to nuke them.
 */
export function createTheme(options: CreateThemeOptions = {}): CreateThemeInstance {
	bootstrapTheme(options)
	const { setting, mode, name } = themeState()

	let offChange: (() => void) | null = null
	if (typeof document !== 'undefined' && options.on?.change) {
		offChange = listen(document.documentElement, THEME_EVENTS.change, options.on.change)
	}

	const set = (next: ThemeSetting): void => {
		if (!isSetting(next)) return
		if (setting.value === next) return
		setting.value = next
	}

	const toggle = (): void => {
		// Binary flip on the resolved mode — a `'system'` user on a dark OS
		// toggles to explicit `'light'`. To opt back into system follow,
		// call `set('system')`.
		set(mode.value === 'dark' ? 'light' : 'dark')
	}

	const select = (next: ThemeName): void => {
		// Lenient — any non-empty string can name a consumer-registered core;
		// the built-in cores are the typed `ThemeName` union. The runtime
		// guard catches untyped JS callers passing `''`/non-strings.
		if (typeof next !== 'string' || (next as string) === '') return
		if (name.value === next) return
		name.value = next
	}

	let destroyed = false
	const destroy = (): void => {
		if (destroyed) return
		destroyed = true
		offChange?.()
		offChange = null
	}

	return {
		setting: readonly(setting),
		mode: readonly(mode),
		name: readonly(name),
		set,
		toggle,
		select,
		destroy,
	}
}
