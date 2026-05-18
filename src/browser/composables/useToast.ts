import type { Ref } from 'vue'
import type { CreateToastInstance, UseToastOptions, UseToastReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createToast } from '../factories/createToast.js'

/**
 * Toast composable. Vue adapter over `createToast` — resolves the
 * `Ref<HTMLDivElement | null>` and delegates the autohide pipeline,
 * stack-deck layout, and event lifecycle to the framework-agnostic
 * factory.
 *
 * Element gating: the host MUST be a `<div>` (HTMLDivElement). A toast
 * renders flow content (`<header>` + `<p>` bands) that `<output>`'s
 * phrasing-only content model forbids; the factory sets `role="status"`
 * (`<output>`'s implicit role — an atomic polite live region) so the
 * announcement semantic is preserved while the element accepts flow
 * content. The toast surface in `_anchor-position.scss` /
 * `components/_output.scss` scopes itself around `[popover][role="status"]`.
 *
 * @see src/browser/factories/createToast.ts
 */
export function useToast(
	elementRef: Ref<HTMLDivElement | null>,
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
