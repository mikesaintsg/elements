import type { Ref } from 'vue'
import type { CreateCarouselInstance, UseCarouselOptions, UseCarouselReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createCarousel } from '../factories/createCarousel.js'

/**
 * Carousel composable. Vue adapter over `createCarousel` — resolves the
 * container element ref and delegates the active-slide index, autoplay
 * timer, keyboard navigation, and touch swipe to the framework-agnostic
 * factory.
 *
 * Element-agnostic by design — typically the host is
 * `<section role="region" aria-roledescription="carousel">`, but the
 * factory operates on whatever scrollable container the consumer
 * provides. The `[role="listitem"]` / `<li>` items inside it carry the
 * slide content.
 *
 * @see src/browser/factories/createCarousel.ts
 */
export function useCarousel(
	elementRef: Ref<HTMLElement | null>,
	options: UseCarouselOptions = {},
): UseCarouselReturn {
	const factory = shallowRef<CreateCarouselInstance | null>(null)
	const index = computed<number>(() => factory.value?.index.value ?? 0)
	const cycling = computed<boolean>(() => factory.value?.cycling.value ?? false)

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createCarousel(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		index,
		cycling,
		next: () => factory.value?.next(),
		prev: () => factory.value?.prev(),
		to: (i: number) => factory.value?.to(i),
		start: () => factory.value?.start(),
		stop: () => factory.value?.stop(),
		pause: () => factory.value?.pause(),
		resume: () => factory.value?.resume(),
	}
}
