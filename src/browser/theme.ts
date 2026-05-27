// ============================================================================
//  Page-global theme singleton service. One theme per page: `bootstrapTheme`
//  wires the `prefers-color-scheme` listener + DOM-apply watcher exactly once
//  and owns the `<html data-theme>` write; `themeState` hands the shared live
//  refs to each per-caller `createTheme` wrapper; `resetTheme` tears the
//  singleton down and is intended for tests only.
// ============================================================================

import type { ComputedRef, WatchHandle } from '@vue/reactivity'
import type {
	CreateThemeOptions,
	ThemeMode,
	ThemeName,
	ThemeSetting,
	ThemeStateRefs,
} from './types.js'
import { attempt } from '@elements/core'
import { computed, ref, watch } from '@vue/reactivity'
import { STORAGE_KEY_THEME, THEME_EVENTS } from './constants.js'
import { emit, isSetting } from './helpers.js'

// ── Singleton state ───────────────────────────────────────────────────────
// One theme per page. Multiple `createTheme()` callers share these refs;
// mutations propagate to every caller without per-instance fan-out.
//
// Reactivity surface is intentionally minimal — CSS does the heavy lifting:
//   • When `setting === 'system'`, we REMOVE `data-theme` from `<html>` and
//     the stylesheet's `@media (prefers-color-scheme: dark)` block handles
//     the OS-follow automatically. No JS rewrite on OS-preference changes.
//   • When `setting === 'light' | 'dark'`, we WRITE `data-theme=<setting>`
//     so the explicit pin overrides the media query.
//
// The `matchMedia` listener exists ONLY so `mode` (the resolved ref) can
// reflect what CSS is currently rendering — useful for UI affordances like
// a sun/moon icon swap. No DOM mutation hangs off `systemDark`.

const setting = ref<ThemeSetting>('system')
const systemDark = ref<boolean>(false)
const mode: ComputedRef<ThemeMode> = computed(() =>
	setting.value === 'system' ? (systemDark.value ? 'dark' : 'light') : setting.value,
)

// Theme NAME (palette/core) axis — orthogonal to the light/dark MODE axis.
// `'default'` is the base `_theme.scss` (no attribute); any other value pulls
// in a named core via `<html data-theme="…">`. Persisted alongside `setting`
// as `setting:name`.
const name = ref<ThemeName>('default')

let bootstrapped = false
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null
let stopApply: WatchHandle | null = null
let storageKey: string | null = STORAGE_KEY_THEME

// Storage round-trips a `setting:name` pair (e.g. `dark:auroramoon`,
// `system:default`). A bare legacy `setting` (no colon) is tolerated — the
// name falls back to `'default'`.
const isThemeName = (value: string): value is ThemeName => value !== ''

const loadStored = (key: string): { setting: ThemeSetting; name: ThemeName } | null => {
	const result = attempt(() => {
		const raw = localStorage.getItem(key)
		if (!raw) return null
		const [head = '', tail = ''] = raw.split(':')
		if (!isSetting(head)) return null
		return { setting: head, name: isThemeName(tail) ? tail : 'default' }
	})
	return result.success ? result.value : null
}

// MODE → `data-mode` (light/dark). `'system'` removes the attribute so the
// stylesheet's `@media (prefers-color-scheme: dark)` owns the flip.
const writeMode = (next: ThemeSetting): void => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (next === 'system') root.removeAttribute('data-mode')
	else root.setAttribute('data-mode', next)
}

// NAME → `data-theme` (palette core). `'default'` removes the attribute so the
// base `_theme.scss` applies; any other value pulls in a named core.
const writeName = (next: ThemeName): void => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (next === 'default') root.removeAttribute('data-theme')
	else root.setAttribute('data-theme', next)
}

const writeStorage = (key: string | null): void => {
	if (!key) return
	// Storage unavailable (quota, privacy mode, file:// origin) — silent no-op.
	attempt(() => localStorage.setItem(key, `${setting.value}:${name.value}`))
}

// Per AGENTS.md §14 ("never use a generic status event") the theme
// service fires a SETTING-specific verb each time `setting` flips, plus
// a separate `name` verb when the palette name changes. Consumers can
// subscribe to just the transition they care about
// (`addEventListener('elements:theme:dark', …)`) without inspecting
// detail. The detail keeps `mode` so consumers know what's rendered
// when `setting === 'system'`.
const fireSettingChange = (next: ThemeSetting, previous: ThemeSetting): void => {
	if (typeof document === 'undefined') return
	if (next === previous) return
	const verb =
		next === 'light'
			? THEME_EVENTS.light
			: next === 'dark'
				? THEME_EVENTS.dark
				: THEME_EVENTS.system
	emit(document.documentElement, verb, {
		mode: mode.value,
		setting: next,
		name: name.value,
	})
}

const fireNameChange = (next: ThemeName, previous: ThemeName): void => {
	if (typeof document === 'undefined') return
	if (next === previous) return
	emit(document.documentElement, THEME_EVENTS.name, {
		mode: mode.value,
		setting: setting.value,
		name: next,
	})
}

/** Bootstrap the page-global theme singleton (idempotent). */
export function bootstrapTheme(options: CreateThemeOptions): void {
	if (bootstrapped) return
	bootstrapped = true

	const key = options.storage === false ? null : (options.storage?.key ?? STORAGE_KEY_THEME)
	storageKey = key

	// Resolve initial: stored > options > defaults. `setting` and `name`
	// round-trip together in storage; options provide the first-run defaults.
	const stored = key && typeof window !== 'undefined' ? loadStored(key) : null
	setting.value = stored?.setting ?? options.initial ?? 'system'
	name.value = stored?.name ?? options.name ?? 'default'

	// Wire `prefers-color-scheme` ONCE. Updates feed only `systemDark` —
	// the DOM `data-mode` attribute is intentionally NOT rewritten on
	// OS-preference changes because we WANT the CSS media query to handle
	// that automatically (no `data-mode` attribute = CSS owns the flip).
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		systemDark.value = mediaQuery.matches
		mediaListener = (event) => {
			systemDark.value = event.matches
		}
		mediaQuery.addEventListener('change', mediaListener)
	}

	// Apply current setting + name to the DOM + persist + emit. One watcher
	// over both refs. The initial bootstrap pass writes the DOM + persists
	// without firing events (there is no "previous" state to transition
	// FROM); subsequent flips emit setting- and name-specific events.
	let previousSetting: ThemeSetting = setting.value
	let previousName: ThemeName = name.value
	writeMode(previousSetting)
	writeName(previousName)
	writeStorage(storageKey)
	stopApply = watch(
		() => [setting.value, name.value] as const,
		([nextSetting, nextName]) => {
			writeMode(nextSetting)
			writeName(nextName)
			writeStorage(storageKey)
			fireSettingChange(nextSetting, previousSetting)
			fireNameChange(nextName, previousName)
			previousSetting = nextSetting
			previousName = nextName
		},
	)
}

/** Shared reactive theme state for `createTheme` wrappers. */
export function themeState(): ThemeStateRefs {
	return { setting, mode, name }
}

/** Reset all singleton state. Intended for tests only. */
export function resetTheme(): void {
	if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener)
	mediaQuery = null
	mediaListener = null
	stopApply?.()
	stopApply = null
	storageKey = STORAGE_KEY_THEME
	bootstrapped = false
	setting.value = 'system'
	systemDark.value = false
	name.value = 'default'
}
