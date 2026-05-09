import type { Ref } from 'vue'
import type { CreateToastInstance, UseToastOptions, UseToastReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createToast } from '../factories/createToast.js'

/**
 * Toast composable. Vue adapter over `createToast` — resolves the
 * `Ref<HTMLOutputElement | null>` and delegates the autohide pipeline,
 * stack-deck layout, and event lifecycle to the framework-agnostic
 * factory.
 *
 * Element gating: the host MUST be `<output>` (HTMLOutputElement). The
 * toast surface in `_anchor-position.scss` exclusively scopes itself
 * around `output[popover]` so this gate is non-negotiable.
 *
 * @see src/browser/factories/createToast.ts
 */
export function useToast(
	elementRef: Ref<HTMLOutputElement | null>,
	options: UseToastOptions = {},
): UseToastReturn {
	const factory = shallowRef<CreateToastInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createToast(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		visible,
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		pause: () => factory.value?.pause(),
		resume: () => factory.value?.resume(),
	}
}
