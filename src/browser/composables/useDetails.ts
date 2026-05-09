import type { Ref } from 'vue'
import type { CreateDetailsInstance, UseDetailsOptions, UseDetailsReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createDetails } from '../factories/createDetails.js'

/**
 * Native `<details>` adapter. Vue wrapper over `createDetails` — resolves
 * the `Ref<HTMLDetailsElement | null>` (and optional accordion ref) and
 * delegates the lifecycle pipeline + accordion sibling coordination to the
 * framework-agnostic factory.
 *
 * Element gating: the host MUST be `<details>`. The factory throws on a
 * mismatch so consumers can't bypass the disclosure widget's native
 * `[open]` / `toggle` semantics.
 *
 * @see src/browser/factories/createDetails.ts
 */
export function useDetails(
	elementRef: Ref<HTMLDetailsElement | null>,
	options: UseDetailsOptions = {},
): UseDetailsReturn {
	const factory = shallowRef<CreateDetailsInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => [elementRef.value, options.accordion?.value] as const,
		([el, accordion], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createDetails(el, {
				initial: options.initial,
				accordion: accordion ?? null,
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
