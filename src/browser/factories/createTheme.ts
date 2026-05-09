import type {
	CreateThemeInstance,
	CreateThemeOptions,
	ThemeCore,
	ThemeMode,
	ThemeModeSetting,
} from '../types.js'
import {
	computed,
	effect,
	effectScope,
	readonly,
	ref,
	type ComputedRef,
	type Ref,
} from '@vue/reactivity'
import { STORAGE_KEY_THEME, THEME_EVENTS } from '../constants.js'
import { emit, listen } from '../helpers.js'

// ── Singleton state ───────────────────────────────────────────────────────
//  Two refs drive the system:
//    - `setting`: user's choice (`'light' | 'dark' | 'system'`). Persisted.
//    - `systemPref`: live result of `prefers-color-scheme` (`'light' |
//      'dark'`). Updated by a media-query listener so changing the OS
//      preference at runtime propagates to every consumer with no manual
//      glue. When the OS / browser doesn't expose the preference (or runs
//      in a non-`window` environment), it stays at `'light'`.
//  The DOM-applied mode is computed: `setting === 'system' ? systemPref :
//  setting`. Consumers read the resolved `mode` ref; UI that lets the user
//  pick between the three semantic settings reads `setting`.

const themeSetting = ref<ThemeModeSetting>('system')
const themeCore = ref<ThemeCore>('default')
const systemPref = ref<ThemeMode>('light')

const themeMode: ComputedRef<ThemeMode> = computed(() =>
	themeSetting.value === 'system' ? systemPref.value : themeSetting.value,
)
const themeDark: ComputedRef<boolean> = computed(() => themeMode.value === 'dark')

let syncScope = effectScope(true)
let initialized = false
let syncStarted = false
let mediaListenerAttached = false
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null

// ── Private helpers ───────────────────────────────────────────────────────

const isSetting = (value: string | null): value is ThemeModeSetting =>
	value === 'dark' || value === 'light' || value === 'system'

const isCore = (value: string | null): value is ThemeCore =>
	typeof value === 'string' && value !== ''

const settingOf = (value: string | undefined): ThemeModeSetting | null => {
	const next = value ?? null
	return isSetting(next) ? next : null
}

const coreOf = (value: string | undefined): ThemeCore | null => {
	const next = value ?? null
	return isCore(next) ? next : null
}

const parseStored = (
	value: string | null,
): { readonly setting: ThemeModeSetting; readonly core: ThemeCore } | null => {
	if (!value) return null
	const [setting, core] = value.split(':')
	const nextSetting = settingOf(setting)
	if (!nextSetting) return null
	return { setting: nextSetting, core: coreOf(core) ?? 'default' }
}

const serializeStored = (setting: ThemeModeSetting, core: ThemeCore): string => `${setting}:${core}`

const resolveKey = (options: CreateThemeOptions = {}): string | null => {
	const { storage } = options
	return storage === false ? null : (storage?.key ?? STORAGE_KEY_THEME)
}

const resolveSetting = (initial: ThemeModeSetting, key: string | null): ThemeModeSetting => {
	if (typeof window === 'undefined') return initial
	const stored = key ? localStorage.getItem(key) : null
	const parsed = parseStored(stored)
	if (parsed) return parsed.setting
	if (isSetting(stored)) return stored
	return initial
}

const resolveCore = (options: CreateThemeOptions = {}, key: string | null): ThemeCore => {
	const fallback = coreOf(options.core) ?? 'default'
	if (typeof window === 'undefined') return fallback
	const stored = key ? localStorage.getItem(key) : null
	const parsed = parseStored(stored)
	if (parsed) return parsed.core
	return fallback
}

/**
 * Bind to `prefers-color-scheme` and keep `systemPref` in sync. Called once
 * on first `ensureTheme()` — subsequent calls are no-ops. The listener is
 * never torn down at runtime; `resetTheme()` (test-only) clears it.
 */
const startSystemPrefSync = (): void => {
	if (mediaListenerAttached) return
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
	mediaListenerAttached = true
	mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
	systemPref.value = mediaQuery.matches ? 'dark' : 'light'
	mediaListener = (event) => {
		systemPref.value = event.matches ? 'dark' : 'light'
	}
	mediaQuery.addEventListener('change', mediaListener)
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Internal helper used by both `createTheme` and the Vue adapter to obtain
 * the singleton state lazily. Subscribes to `prefers-color-scheme` on first
 * call so the resolved `mode` follows the OS preference reactively.
 */
export const ensureTheme = (
	options: CreateThemeOptions = {},
): {
	readonly mode: ComputedRef<ThemeMode>
	readonly setting: Ref<ThemeModeSetting>
	readonly core: Ref<ThemeCore>
	readonly dark: ComputedRef<boolean>
	readonly key: string | null
} => {
	const key = resolveKey(options)
	if (!initialized) {
		initialized = true
		startSystemPrefSync()
		themeSetting.value = resolveSetting(options.initial ?? 'system', key)
		themeCore.value = resolveCore(options, key)
	}
	return { mode: themeMode, setting: themeSetting, core: themeCore, dark: themeDark, key }
}

/**
 * Start the singleton DOM-sync watcher. Idempotent — safe to call on every
 * `createTheme()` invocation; only the first call takes effect.
 *
 * The watcher reads the *resolved* `themeMode` (computed), so any change to
 * the user's `themeSetting` *or* the OS `systemPref` (when setting is
 * `'system'`) automatically retunes the DOM, persists the user-facing
 * setting, and emits the change event.
 */
export const startSync = (key: string | null): void => {
	if (syncStarted) return
	syncStarted = true
	syncScope.run(() => {
		effect(() => {
			if (typeof document === 'undefined') return
			const root = document.documentElement
			root.setAttribute('data-theme', themeMode.value)
			root.setAttribute('data-core', themeCore.value)
			if (key) localStorage.setItem(key, serializeStored(themeSetting.value, themeCore.value))
			emit(root, THEME_EVENTS.change, {
				mode: themeMode.value,
				setting: themeSetting.value,
				core: themeCore.value,
			})
		})
	})
}

/** Reset all singleton state. Intended for use in tests only. */
export const resetTheme = (): void => {
	syncScope.stop()
	syncScope = effectScope(true)
	if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener)
	mediaQuery = null
	mediaListener = null
	mediaListenerAttached = false
	initialized = false
	syncStarted = false
	themeSetting.value = 'system'
	themeCore.value = 'default'
	systemPref.value = 'light'
}

/**
 * Framework-agnostic singleton theme controller. Every call returns the
 * same reactive refs — one theme per page, not one per call. Mutations
 * propagate to every other caller and fire `elements:theme:change` on
 * `document.documentElement`.
 *
 * The default `initial: 'system'` makes the resolved mode follow the OS
 * `prefers-color-scheme` preference reactively. `toggle()` switches between
 * explicit `'light'` and `'dark'` (anchoring to the user's choice and
 * stopping the system-follow); `apply('system')` opts back into reactive
 * follow.
 *
 * `destroy()` removes the per-instance `on.change` listener (when supplied)
 * but does NOT tear down the singleton DOM-sync watcher or the
 * `prefers-color-scheme` listener — other callers may still rely on them.
 * Use `resetTheme()` (test-only) to nuke the singleton entirely.
 */
export function createTheme(options: CreateThemeOptions = {}): CreateThemeInstance {
	const { mode, setting, core, dark, key } = ensureTheme(options)

	let offChange: (() => void) | null = null
	if (typeof document !== 'undefined' && options.on?.change) {
		offChange = listen(document.documentElement, THEME_EVENTS.change, options.on.change)
	}

	startSync(key)

	const toggle = (): void => {
		// Toggle reads the *resolved* mode so a `'system'` user who is
		// currently dark gets toggled to explicit `'light'` (and vice versa).
		// This is what users expect from a binary toggle: flip what's on
		// screen, anchor the choice. To opt back into system follow, call
		// `apply('system')` explicitly.
		setting.value = mode.value === 'dark' ? 'light' : 'dark'
	}

	const apply = (next: ThemeModeSetting): void => {
		if (setting.value === next) return
		setting.value = next
	}

	const select = (next: ThemeCore): void => {
		if (next === '') return
		if (core.value === next) return
		core.value = next
	}

	let destroyed = false
	const destroy = (): void => {
		if (destroyed) return
		destroyed = true
		offChange?.()
		offChange = null
	}

	return {
		theme: readonly(mode),
		setting: readonly(setting),
		core: readonly(core),
		dark,
		toggle,
		apply,
		select,
		destroy,
	}
}
