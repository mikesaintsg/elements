import type { Ref } from 'vue'
import type { CreateAlertInstance, UseAlertOptions, UseAlertReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createAlert } from '../factories/createAlert.js'

/**
 * Dismissible alert composable. Vue adapter over `createAlert` — resolves
 * the host ref and delegates the lifecycle / dismiss / event pipeline.
 *
 * Element gating: any element carrying `[role="alert"]` or
 * `[role="status"]` works. The factory adds `role="alert"` automatically
 * when the host has no role attribute, so authors who use `<aside>` or
 * `<div>` get the semantic upgrade for free.
 *
 * @see src/browser/factories/createAlert.ts
 */
export function useAlert(
	elementRef: Ref<HTMLElement | null>,
	options: UseAlertOptions = {},
): UseAlertReturn {
	const factory = shallowRef<CreateAlertInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createAlert(el, options)
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
		toggle: () => factory.value?.toggle(),
	}
}
