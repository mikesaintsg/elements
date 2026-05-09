import type { Ref } from 'vue'
import type { CreatePointerInstance, UsePointerOptions, UsePointerReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createPointer } from '../factories/createPointer.js'

/**
 * Wraps the `pointerdown → pointermove* → pointerup` lifecycle. Vue adapter
 * over `createPointer` — resolves the element ref and delegates pointer
 * capture, body-cursor lock, and event lifecycle to the framework-agnostic
 * factory.
 *
 * Element-agnostic: `usePointer` accepts any `HTMLElement`. Composables
 * built on top of it (sliders, splitters, range inputs) impose their own
 * tag-specific gating via `assertElement`.
 *
 * @see src/browser/factories/createPointer.ts — the underlying factory.
 */
export function usePointer(
	elementRef: Ref<HTMLElement | null>,
	options: UsePointerOptions = {},
): UsePointerReturn {
	const factory = shallowRef<CreatePointerInstance | null>(null)
	const dragging = computed<boolean>(() => factory.value?.dragging.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createPointer(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		dragging,
		clear: () => factory.value?.clear(),
	}
}
