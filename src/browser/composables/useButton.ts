import type { Ref } from 'vue'
import type { CreateButtonInstance, UseButtonOptions, UseButtonReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createButton } from '../factories/createButton.js'

/**
 * Toggle-button composable. Vue adapter over `createButton`.
 *
 * Element gating: the host MUST be `<button>` (`HTMLButtonElement`). The
 * factory throws on a mismatch so consumers can't apply toggle semantics
 * (which key off `aria-pressed`) to a non-button element.
 *
 * @see src/browser/factories/createButton.ts
 */
export function useButton(
	elementRef: Ref<HTMLButtonElement | null>,
	options: UseButtonOptions = {},
): UseButtonReturn {
	const factory = shallowRef<CreateButtonInstance | null>(null)
	const active = computed<boolean>(() => factory.value?.active.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createButton(el, options)
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
		toggle: () => factory.value?.toggle(),
	}
}
