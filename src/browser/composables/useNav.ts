import type { Ref } from 'vue'
import type { CreateNavInstance, UseNavOptions, UseNavReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createNav } from '../factories/createNav.js'

/**
 * Scroll-spy / nav composable (renamed from `useScrollSpy`, folded under
 * the `<nav>` semantic). Vue adapter over `createNav` — observes `[id]`
 * sections inside the scrollable container and toggles
 * `aria-current="location"` on the matching nav link.
 *
 * Element gating: the optional `nav` ref MUST point at a `<nav>` element
 * when supplied. The factory throws on a mismatch.
 *
 * @see src/browser/factories/createNav.ts
 */
export function useNav(
	elementRef: Ref<HTMLElement | null>,
	options: UseNavOptions = {},
): UseNavReturn {
	const factory = shallowRef<CreateNavInstance | null>(null)
	const active = computed<string | null>(() => factory.value?.active.value ?? null)

	watch(
		() => [elementRef.value, options.nav?.value] as const,
		([container, nav], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !container) return
			const instance = createNav(
				{ container, nav: nav ?? null },
				{
					intersection: options.intersection,
					on: options.on,
				},
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
		refresh: () => factory.value?.refresh(),
	}
}
