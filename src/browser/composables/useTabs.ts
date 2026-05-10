import type { Ref } from 'vue'
import type { CreateTabsInstance, UseTabsOptions, UseTabsReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createTabs } from '../factories/createTabs.js'

/**
 * Tabs composable (renamed from `useTab`). Vue adapter over `createTabs`
 * — wires ONE trigger to ONE pane within a `[role="tablist"]` group.
 *
 * Element contract:
 *   - `triggerRef` → `<button>` (or any `[role="tab"]` element)
 *   - `paneRef`    → `[role="tabpanel"]`
 *   - `groupRef`   → `[role="tablist"]` wrapper
 *
 * The factory adds the missing roles automatically; element type is left
 * to the consumer because tab triggers can legitimately be `<a>` or
 * `<button>` depending on the surrounding pattern.
 *
 * @see src/browser/factories/createTabs.ts
 */
export function useTabs(
	elementRef: Ref<HTMLElement | null>,
	options: UseTabsOptions,
): UseTabsReturn {
	const { pane: paneRef, group: groupRef } = options
	const factory = shallowRef<CreateTabsInstance | null>(null)
	const active = computed<boolean>(() => factory.value?.active.value ?? false)

	watch(
		() => [elementRef.value, paneRef.value, groupRef.value] as const,
		([trigger, pane, group], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !trigger || !pane || !group) return
			const instance = createTabs(
				{ trigger, pane, group },
				{ on: options.on, initial: options.initial },
			)
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
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		toggle: () => factory.value?.toggle(),
	}
}
