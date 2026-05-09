import type { Ref } from 'vue'
import type { CreateMenuInstance, Placement, UseMenuOptions, UseMenuReturn } from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createMenu } from '../factories/createMenu.js'

/**
 * Dropdown / nav menu composable (renamed from `useDropdown`). Vue adapter
 * over `createMenu` — resolves the toggle anchor + the `<menu>` panel and
 * delegates the popover lifecycle, ARIA, and roving-focus pipeline to the
 * framework-agnostic factory.
 *
 * Element gating: the panel ref MUST point at a `<menu>` element. The
 * factory throws on mismatch so consumers don't shadow the semantic
 * landmark with a `<ul>` or `<div>`.
 *
 * @see src/browser/factories/createMenu.ts
 */
export function useMenu(
	toggleRef: Ref<HTMLElement | null>,
	menuRef: Ref<HTMLMenuElement | null>,
	options: UseMenuOptions = {},
): UseMenuReturn {
	const placementOpt = computed<Placement>(() => {
		const value = options.placement
		if (value === undefined) return 'bottom-start'
		return typeof value === 'string' ? value : value.value
	})

	const factory = shallowRef<CreateMenuInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)

	watch(
		() => [toggleRef.value, menuRef.value] as const,
		([toggle, menu], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !toggle || !menu) return
			const instance = createMenu(
				{ toggle, menu },
				{
					placement: placementOpt.value,
					strategy: options.strategy,
					offset: options.offset,
					flip: options.flip,
					dismiss: options.dismiss,
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

	watch(placementOpt, (next) => {
		factory.value?.update({ placement: next })
	})

	return {
		visible,
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		toggle: () => factory.value?.toggle(),
		update: () => factory.value?.update(),
	}
}
