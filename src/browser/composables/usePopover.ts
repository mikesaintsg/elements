import type { CSSProperties } from 'vue'
import type {
	CreatePopoverInstance,
	Placement,
	UsePopoverOptions,
	UsePopoverReturn,
} from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createPopover } from '../factories/createPopover.js'

/**
 * Native popover composable. Vue adapter over `createPopover` — resolves
 * the anchor / panel / arrow refs, instantiates the framework-agnostic
 * factory once they're available, and tears it down on cleanup.
 *
 * Element gating: the panel ref must point at an element that supports the
 * native popover API (every `HTMLElement` does, post-Chromium 114). The
 * factory sets `popover="manual"` itself; the surface-layer rule
 * `[popover]:not(output)` then provides the anchor-positioning chrome.
 *
 * Composables built on top of `usePopover` (`useTooltip`, `useMenu`)
 * impose narrower semantic gates on the panel — e.g. `useMenu` requires
 * `<menu>`, `useTooltip` requires the tooltip role.
 *
 * @see src/browser/factories/createPopover.ts — the underlying factory.
 * @see src/styles/surfaces/_anchor-position.scss — the placement chrome.
 */
export function usePopover(options: UsePopoverOptions): UsePopoverReturn {
	const { anchor: anchorRef, panel: panelRef, arrow: arrowRef } = options

	const placementOpt = computed<false | Placement>(() => {
		const value = options.placement
		if (value === false) return false
		if (value === undefined) return 'bottom'
		return typeof value === 'string' ? value : value.value
	})

	const factory = shallowRef<CreatePopoverInstance | null>(null)

	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)
	const placement = computed<Placement>(() => factory.value?.placement.value ?? 'bottom')
	const styles = computed<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>(
		() => factory.value?.styles.value ?? { panel: {}, arrow: {} },
	)

	watch(
		() => [anchorRef.value, panelRef.value, arrowRef?.value] as const,
		([anchor, panel, arrow], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !anchor || !panel) return
			const instance = createPopover(
				{ anchor, panel, arrow: arrow ?? null },
				{
					placement: placementOpt.value,
					strategy: options.strategy,
					offset: options.offset,
					trigger: options.trigger,
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
		styles,
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		toggle: () => factory.value?.toggle(),
		update: () => factory.value?.update(),
		destroy: () => factory.value?.destroy(),
	}
}
