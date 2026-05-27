import type { CreateDropInstance, CreateDropOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DROP_EVENTS } from '../constants.js'
import { emit, extractTypes } from '../helpers.js'

/**
 * Framework-agnostic drop-target factory supporting native HTML5 drag-and-drop.
 *
 * Element-agnostic — accepts any `HTMLElement`. Composables that need a
 * specific tag (e.g. `<input type="file">` upload zones) impose their own
 * gate at the composable layer.
 *
 * @remarks Tracks `over` correctly across nested children through the
 * native `relatedTarget` field.
 */
export function createDrop(
	element: HTMLElement,
	options: CreateDropOptions = {},
): CreateDropInstance {
	const { effect, accept, on } = options
	const dropEffect: DataTransfer['dropEffect'] | undefined = effect?.drop
	const allowed: DataTransfer['effectAllowed'] | undefined =
		dropEffect === undefined ? undefined : dropEffect === 'none' ? 'none' : dropEffect
	const effectAllowed: DataTransfer['effectAllowed'] | undefined = effect?.allowed ?? allowed

	const scope = effectScope()
	const over = scope.run(() => ref(false))
	if (!over) throw new Error('createDrop: failed to initialize reactive scope')

	const accepts = (event: DragEvent): boolean => {
		if (!accept || accept.length === 0) return true
		const types = extractTypes(event)
		if (types.length === 0) return true
		return accept.some((type) => types.includes(type))
	}

	const write = (event: DragEvent): void => {
		if (!event.dataTransfer) return
		if (effectAllowed) event.dataTransfer.effectAllowed = effectAllowed
		if (dropEffect) event.dataTransfer.dropEffect = dropEffect
	}

	const onDragEnter = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (!accepts(event)) return
		event.preventDefault()
		write(event)
		const wasOver = over.value
		over.value = true
		on?.dragenter?.(event)
		if (!wasOver) emit(element, DROP_EVENTS.enter, { originalEvent: event })
	}

	const onDragOver = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		if (!accepts(event)) return
		event.preventDefault()
		write(event)
		on?.dragover?.(event)
	}

	const onDragLeave = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		const target = event.relatedTarget
		const wasOver = over.value
		if (!element.contains(target instanceof Node ? target : null)) {
			over.value = false
		}
		on?.dragleave?.(event)
		if (wasOver && !over.value) emit(element, DROP_EVENTS.leave, { originalEvent: event })
	}

	const onDrop = (event: Event): void => {
		if (!(event instanceof DragEvent)) return
		over.value = false
		if (!accepts(event)) return
		event.preventDefault()
		on?.drop?.(event)
		emit(element, DROP_EVENTS.drop, { originalEvent: event })
	}

	element.addEventListener('dragenter', onDragEnter)
	element.addEventListener('dragover', onDragOver)
	element.addEventListener('dragleave', onDragLeave)
	element.addEventListener('drop', onDrop)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			element.removeEventListener('dragenter', onDragEnter)
			element.removeEventListener('dragover', onDragOver)
			element.removeEventListener('dragleave', onDragLeave)
			element.removeEventListener('drop', onDrop)
			scope.stop()
		}
		over.value = false
	}

	return { over: readonly(over), destroy }
}
