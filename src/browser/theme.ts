// ============================================================================
//  Page-global theme singleton service. One theme per page: `bootstrapTheme`
//  wires the `prefers-color-scheme` listener + DOM-apply watcher exactly once
//  and owns the `<html data-theme>` write; `themeState` hands the shared live
//  refs to each per-caller `createTheme` wrapper; `resetTheme` tears the
//  singleton down and is intended for tests only.
// ============================================================================

import type { ComputedRef, WatchHandle } from '@vue/reactivity'
import type { CreateThemeOptions, ThemeMode, ThemeSetting, ThemeStateRefs } from './types.js'
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

let bootstrapped = false
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null
let stopApply: WatchHandle | null = null
let storageKey: string | null = STORAGE_KEY_THEME

const loadStored = (key: string): ThemeSetting | null => {
	const result = attempt(() => {
		const raw = localStorage.getItem(key)
		if (!raw) return null
		// Tolerate the legacy `'mode:core'` storage format from the earlier
		// API — take the first segment, validate it. Anything else returns
		// null so the caller can fall back to options / 'system'.
		const head = raw.split(':')[0] ?? ''
		return isSetting(head) ? head : null
	})
	return result.success ? result.value : null
}

const writeAttribute = (next: ThemeSetting): void => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (next === 'system') root.removeAttribute('data-theme')
	else root.setAttribute('data-theme', next)
}

const writeStorage = (key: string | null, next: ThemeSetting): void => {
	if (!key) return
	// Storage unavailable (quota, privacy mode, file:// origin) — silent no-op.
	attempt(() => localStorage.setItem(key, next))
}

const fireChange = (): void => {
	if (typeof document === 'undefined') return
	emit(document.documentElement, THEME_EVENTS.change, {
		mode: mode.value,
		setting: setting.value,
	})
}

/** Bootstrap the page-global theme singleton (idempotent). */
export function bootstrapTheme(options: CreateThemeOptions): void {
	if (bootstrapped) return
	bootstrapped = true

	const key = options.storage === false ? null : (options.storage?.key ?? STORAGE_KEY_THEME)
	storageKey = key

	// Resolve initial: stored > options.initial > 'system'.
	const stored = key && typeof window !== 'undefined' ? loadStored(key) : null
	setting.value = stored ?? options.initial ?? 'system'

	// Wire `prefers-color-scheme` ONCE. Updates feed only `systemDark` —
	// the DOM `data-theme` attribute is intentionally NOT rewritten on
	// OS-preference changes because we WANT the CSS media query to handle
	// that automatically (no `data-theme` attribute = CSS owns the flip).
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		systemDark.value = mediaQuery.matches
		mediaListener = (event) => {
			systemDark.value = event.matches
		}
		mediaQuery.addEventListener('change', mediaListener)
	}

	// Apply current setting to the DOM + persist + emit. One watcher,
	// `immediate: true` so the initial setting is applied on first
	// bootstrap. `@vue/reactivity`'s `watch` fires synchronously on signal
	// change by default — no scheduler needed.
	stopApply = watch(
		() => setting.value,
		(next) => {
			writeAttribute(next)
			writeStorage(storageKey, next)
			fireChange()
		},
		{ immediate: true },
	)
}

/** Shared reactive theme state for `createTheme` wrappers. */
export function themeState(): ThemeStateRefs {
	return { setting, mode }
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
}
