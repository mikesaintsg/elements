import type { Ref } from 'vue'
import type {
	CreateSelectInstance,
	Placement,
	UseSelectOptions,
	UseSelectReturn,
} from '../types.js'
import { computed, shallowRef, watch } from 'vue'
import { createSelect } from '../factories/createSelect.js'

/**
 * Select composable. Vue adapter over `createSelect` — wires the toggle,
 * `<menu>` listbox, and optional native `<select>` mirror / combobox
 * input refs together, instantiates the framework-agnostic factory, and
 * propagates reactive placement updates.
 *
 * Element gating: the menu MUST be `<menu>` (the factory throws on a
 * mismatch via the wrapped `createMenu`). The toggle and input are
 * unconstrained at the tag level — the ARIA combobox / button role is
 * what makes them work.
 *
 * @see src/browser/factories/createSelect.ts
 */
export function useSelect(
	elementRef: Ref<HTMLElement | null>,
	options: UseSelectOptions,
): UseSelectReturn {
	const factory = shallowRef<CreateSelectInstance | null>(null)

	const visible = computed<boolean>(() => factory.value?.visible.value ?? false)
	const value = computed<string | null>(() => factory.value?.value.value ?? null)
	const values = computed<readonly string[]>(() => factory.value?.values.value ?? [])
	const query = computed<string>(() => factory.value?.query.value ?? '')

	const placementOpt = computed<Placement | undefined>(() => {
		const v = options.placement
		if (v === undefined) return undefined
		return typeof v === 'string' ? v : v.value
	})

	watch(
		() =>
			[elementRef.value, options.menu.value, options.native?.value, options.input?.value] as const,
		([toggle, menuOption, nativeOption, inputOption], _previous, onCleanup) => {
			if (typeof window === 'undefined' || !toggle || !menuOption) return
			const instance = createSelect(
				{
					toggle,
					menu: menuOption as HTMLMenuElement,
					native: nativeOption ?? null,
					input: inputOption ?? null,
				},
				{
					multiple: options.multiple,
					autocomplete: options.autocomplete,
					value: options.value,
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
		if (next) factory.value?.update({ placement: next })
	})

	return {
		visible,
		value,
		values,
		query,
		show: () => factory.value?.show(),
		hide: () => factory.value?.hide(),
		toggle: () => factory.value?.toggle(),
		select: (next: string) => factory.value?.select(next),
		clear: () => factory.value?.clear(),
		update: () => factory.value?.update(),
	}
}
