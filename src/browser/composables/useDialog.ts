import type { Ref } from 'vue'
import type { CreateDialogInstance, UseDialogOptions, UseDialogReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createDialog } from '../factories/createDialog.js'

/**
 * Native `<dialog>` adapter. Vue wrapper over `createDialog` — resolves
 * the `Ref<HTMLDialogElement | null>`, instantiates the framework-agnostic
 * factory, and tears it down on cleanup.
 *
 * Element gating: the host MUST be `<dialog>` (`HTMLDialogElement`). The
 * factory throws otherwise so the consumer can't accidentally route a
 * `<div>` through this composable and miss the native top-layer + focus
 * trap + `::backdrop` chrome.
 *
 * @see src/browser/factories/createDialog.ts
 */
export function useDialog(
	elementRef: Ref<HTMLDialogElement | null>,
	options: UseDialogOptions = {},
): UseDialogReturn {
	const factory = shallowRef<CreateDialogInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createDialog(el, {
				modal: options.modal,
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
