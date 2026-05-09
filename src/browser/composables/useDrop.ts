import type { Ref } from 'vue'
import type { CreateDropInstance, UseDropOptions, UseDropReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createDrop } from '../factories/createDrop.js'

/**
 * Drop-target composable supporting native HTML5 drag-and-drop. Vue adapter
 * over `createDrop` — resolves the element ref and delegates the
 * `dragenter` / `dragover` / `dragleave` / `drop` wiring to the
 * framework-agnostic factory.
 *
 * Element-agnostic by design — drop zones can target any `HTMLElement`.
 *
 * @see src/browser/factories/createDrop.ts
 */
export function useDrop(
	elementRef: Ref<HTMLElement | null>,
	options: UseDropOptions = {},
): UseDropReturn {
	const factory = shallowRef<CreateDropInstance | null>(null)
	const over = computed<boolean>(() => factory.value?.over.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createDrop(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return { over }
}
