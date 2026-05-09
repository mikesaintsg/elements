import type { Ref } from 'vue'
import type { CreateAsideInstance, UseAsideOptions, UseAsideReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createAside } from '../factories/createAside.js'

/**
 * `<aside>` slide-in drawer adapter. Vue wrapper over `createAside` —
 * resolves the host ref and delegates the show/hide pipeline (popover-API
 * top-layer rendering, scroll lock, Escape dismiss, backdrop click) to
 * the framework-agnostic factory.
 *
 * Element gating: the host MUST be `<aside>`. The factory throws on a
 * mismatch so consumers don't shadow the semantic landmark with a `<div>`.
 *
 * @see src/browser/factories/createAside.ts
 */
export function useAside(
	elementRef: Ref<HTMLElement | null>,
	options: UseAsideOptions = {},
): UseAsideReturn {
	const factory = shallowRef<CreateAsideInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createAside(el, {
				dismiss: options.dismiss,
				scroll: options.scroll,
				on: options.on,
			})
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
