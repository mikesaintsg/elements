import type { Ref } from 'vue'
import type { CreateAsideInstance, UseAsideOptions, UseAsideReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createAside } from '../factories/createAside.js'

/**
 * `<aside>` drawer adapter. Thin Vue wrapper over `createAside` — a
 * programmatic shim around the native Popover API. The framework's CSS
 * already drives the slide animation via `:popover-open` +
 * `@starting-style` + `transition-behavior: allow-discrete`; this
 * composable just resolves the host ref, sets `popover="auto"` (default)
 * or `"manual"` per options, and exposes `show()` / `hide()` / `toggle()`
 * + a reactive `visible` ref + native-popover-event bridges.
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
				popover: options.popover,
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
