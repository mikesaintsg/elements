import type { CreateThemeInstance, UseThemeOptions, UseThemeReturn } from '../types.js'
import { onScopeDispose } from 'vue'
import { createTheme } from '../factories/createTheme.js'

/**
 * Singleton theme controller. Vue adapter over `createTheme` — registers
 * the per-call `on.change` listener for the lifetime of the calling
 * component scope and delegates state to the framework-agnostic factory
 * singleton.
 *
 * Every call returns the same reactive refs — one theme per page, not one
 * per component. Mutations from any caller propagate to every other caller.
 *
 * Every option is optional, so the no-arg form works:
 *
 * ```ts
 * const theme = useTheme()                                // OS-follow, default core
 * const theme = useTheme({ initial: 'dark' })             // explicit dark start
 * const theme = useTheme({ initial: 'light', core: 'aurora' })
 * const theme = useTheme({ storage: false })              // skip persistence
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
		theme: factory.theme,
		setting: factory.setting,
		core: factory.core,
		dark: factory.dark,
		toggle: factory.toggle,
		apply: factory.apply,
		select: factory.select,
	}
}
