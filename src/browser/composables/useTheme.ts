import type { CreateThemeInstance, UseThemeOptions, UseThemeReturn } from '../types.js'
import { onScopeDispose } from 'vue'
import { createTheme } from '../factories/createTheme.js'

/**
 * Singleton theme controller. Vue adapter over `createTheme` — registers
 * the per-call `on.change` listener for the lifetime of the calling
 * component scope and delegates state to the framework-agnostic factory
 * singleton.
 *
 * The composable's design leans heavily on CSS: when the user has not
 * picked an explicit theme (`setting === 'system'`, the default),
 * `<html>` carries no `data-theme` attribute and the framework
 * stylesheet's `@media (prefers-color-scheme: dark)` rule handles the OS-
 * follow on its own. When the user picks `'light'` or `'dark'` the
 * factory pins it via `data-theme=<setting>`. JS reactivity is reserved
 * for the consumer-facing `mode` ref so a sun/moon icon can swap on OS-
 * preference changes; the DOM `data-theme` attribute is intentionally
 * NOT rewritten when the OS preference flips.
 *
 * Returns:
 *   `setting`  — user choice (`'light' | 'dark' | 'system'`), reactive.
 *   `mode`     — resolved mode (`'light' | 'dark'`) currently rendered.
 *   `set(next)` — pick light, dark, or system.
 *   `toggle()` — binary flip between light and dark (anchors the choice).
 *
 * Every option is optional, so the no-arg form works:
 *
 * ```ts
 * const theme = useTheme()                                  // OS-follow
 * const theme = useTheme({ initial: 'dark' })               // explicit dark
 * const theme = useTheme({ storage: false })                // skip persistence
 * const theme = useTheme({ on: { change: handler } })       // observe transitions
 * ```
 *
 * @see src/browser/factories/createTheme.ts — the underlying factory.
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
	const factory: CreateThemeInstance = createTheme(options)

	// `failSilently: true` — useTheme can be called outside a component
	// scope (tests, app bootstrap). The factory's `destroy()` is the
	// explicit teardown path in that case.
	onScopeDispose(() => factory.destroy(), true)

	return {
		setting: factory.setting,
		mode: factory.mode,
		set: factory.set,
		toggle: factory.toggle,
	}
}
