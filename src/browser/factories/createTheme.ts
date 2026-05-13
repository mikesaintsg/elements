import type { CreateThemeInstance, CreateThemeOptions, ThemeMode, ThemeSetting } from '../types.js'
import { computed, readonly, ref, watch, type ComputedRef, type WatchHandle } from '@vue/reactivity'
import { STORAGE_KEY_THEME, THEME_EVENTS } from '../constants.js'
import { emit, listen } from '../helpers.js'

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

const isSetting = (value: unknown): value is ThemeSetting =>
	value === 'light' || value === 'dark' || value === 'system'

const loadStored = (key: string): ThemeSetting | null => {
	try {
		const raw = localStorage.getItem(key)
		if (!raw) return null
		// Tolerate the legacy `'mode:core'` storage format from the earlier
		// API — take the first segment, validate it. Anything else returns
		// null so the caller can fall back to options / 'system'.
		const head = raw.split(':')[0] ?? ''
		return isSetting(head) ? head : null
	} catch {
		return null
	}
}

const writeAttribute = (next: ThemeSetting): void => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (next === 'system') root.removeAttribute('data-theme')
	else root.setAttribute('data-theme', next)
}

const writeStorage = (key: string | null, next: ThemeSetting): void => {
	if (!key) return
	try {
		localStorage.setItem(key, next)
	} catch {
		// Storage unavailable (quota, privacy mode, file:// origin) — silent no-op.
	}
}

const fireChange = (): void => {
	if (typeof document === 'undefined') return
	emit(document.documentElement, THEME_EVENTS.change, {
		mode: mode.value,
		setting: setting.value,
	})
}

const bootstrap = (options: CreateThemeOptions): void => {
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

/** Reset all singleton state. Intended for tests only. */
export const resetTheme = (): void => {
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

/**
 * Framework-agnostic theme controller. Singleton — every call returns refs
 * pointing at the same shared state, so multiple consumers stay in sync
 * with no plumbing.
 *
 * **CSS owns OS follow.** When `setting === 'system'` (the default), the
 * factory removes `data-theme` from `<html>` and lets the stylesheet's
 * `@media (prefers-color-scheme: dark)` rule do its job. When the user
 * picks an explicit `'light'` or `'dark'`, the factory pins it via
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
	bootstrap(options)

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
		set,
		toggle,
		destroy,
	}
}
