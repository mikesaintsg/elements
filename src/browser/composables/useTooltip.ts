import type {
	CreateTooltipInstance,
	Placement,
	UseTooltipOptions,
	UseTooltipReturn,
} from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createTooltip } from '../factories/createTooltip.js'

/**
 * Tooltip composable. Vue adapter over `createTooltip`. Hover + focus
 * triggers attach automatically; programmatic show/hide/toggle remain
 * available alongside.
 *
 * The factory tags the panel with `role="tooltip"` and `popover="manual"`
 * so consumers can style it via the surface-layer `[popover]` rules.
 *
 * @see src/browser/factories/createTooltip.ts
 */
export function useTooltip(options: UseTooltipOptions): UseTooltipReturn {
	const { anchor: anchorRef, panel: panelRef, arrow: arrowRef } = options

	const placementOpt = computed<false | Placement>(() => {
		const value = options.placement
		if (value === false) return false
		if (value === undefined) return 'bottom'
		return typeof value === 'string' ? value : value.value
	})

	const factory = shallowRef<CreateTooltipInstance | null>(null)
	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)
	const placement = computed<Placement>(() => factory.value?.placement.value ?? 'bottom')

	watch(
		() => [anchorRef.value, panelRef.value, arrowRef?.value] as const,
		([anchor, panel, arrow], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !anchor || !panel) return
			const instance = createTooltip(
				{ anchor, panel, arrow: arrow ?? null },
				{
					placement: placementOpt.value,
					strategy: options.strategy,
					offset: options.offset,
					delay: options.delay,
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
		placement,
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		toggle: () => factory.value?.toggle(),
		update: () => factory.value?.update(),
		destroy: () => factory.value?.destroy(),
	}
}
