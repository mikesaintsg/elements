import type { Ref } from 'vue'
import { computed, shallowRef, watch } from 'vue'
import type { CreateDragInstance, CreateDragList, UseDragOptions, UseDragReturn } from '../types.js'
import { EMPTY_SET } from '../constants.js'
import { createDrag } from '../factories/createDrag.js'

/**
 * Native drag-source / drop-target composable. Vue adapter over
 * `createDrag` — resolves the root element ref, wraps the reactive `list`
 * ref into a mutator the factory consumes, and propagates events.
 *
 * The factory operates on direct `[data-index]` children of the host —
 * any element type works (`<ul>`, `<ol>`, `<menu>`, `<div>`, `<tbody>`),
 * so this composable is element-agnostic by design.
 *
 * @see src/browser/factories/createDrag.ts
 */
export function useDrag<T = unknown>(
	elementRef: Ref<HTMLElement | null>,
	options: UseDragOptions<T> = {},
): UseDragReturn {
	const factory = shallowRef<CreateDragInstance | null>(null)

	const dragging = computed<boolean>(() => factory.value?.dragging.value ?? false)
	const indices = computed<ReadonlySet<number>>(() => factory.value?.indices.value ?? EMPTY_SET)
	const selected = computed<ReadonlySet<number>>(() => factory.value?.selected.value ?? EMPTY_SET)
	const target = computed<number | null>(() => factory.value?.target.value ?? null)
	const position = computed(() => factory.value?.position.value ?? null)

	const list: CreateDragList<T> | undefined = options.list
		? {
				read: () => options.list?.value ?? [],
				splice: (start, deleteCount, ...items) => {
					const arr = options.list?.value
					if (!arr) return []
					return arr.splice(start, deleteCount, ...items)
				},
			}
		: undefined

	const items: (() => readonly T[]) | undefined = options.items
		? () => options.items?.value ?? []
		: undefined

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createDrag<T>(el, {
				source: options.source,
				target: options.target,
				list,
				items,
				axis: options.axis,
				auto: options.auto,
				effect: options.effect,
				select: options.select,
				types: options.types,
				resolve: options.resolve,
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
		dragging,
		indices,
		selected,
		target,
		position,
		select: (index, event) => factory.value?.select(index, event),
		tap: (index, event) => factory.value?.tap(index, event),
		clear: () => factory.value?.clear(),
		destroy: () => factory.value?.destroy(),
	}
}
