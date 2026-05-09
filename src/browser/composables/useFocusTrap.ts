import type { Ref } from 'vue'
import type { CreateFocusTrapInstance, UseFocusTrapOptions, UseFocusTrapReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createFocusTrap } from '../factories/createFocusTrap.js'

/**
 * Focus-trap composable. Vue adapter over `createFocusTrap`. Confines
 * `Tab` navigation to focusable descendants of the host element while
 * active and restores the previous focus on deactivation.
 *
 * Designed to be opt-in for layouts that need a focus boundary outside
 * of `<dialog>` (which has its own native trap). Authors compose it
 * with their own visibility pipeline — call `activate()` on open,
 * `deactivate()` on close.
 *
 * Element-agnostic — pair with any container that has at least one
 * focusable descendant.
 *
 * @see src/browser/factories/createFocusTrap.ts
 */
export function useFocusTrap(
	elementRef: Ref<HTMLElement | null>,
	options: UseFocusTrapOptions = {},
): UseFocusTrapReturn {
	const factory = shallowRef<CreateFocusTrapInstance | null>(null)
	const active = computed<boolean>(() => factory.value?.active.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createFocusTrap(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		active,
		activate: () => factory.value?.activate(),
		deactivate: () => factory.value?.deactivate(),
	}
}
