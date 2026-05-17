import type { Ref } from 'vue'
import type {
	CreateFormInstance,
	FormEntry,
	FormFieldElement,
	FormFieldsInterface,
	FormValidityInterface,
	UseFormOptions,
	UseFormReturn,
} from '../types.js'
import { computed, ref, shallowRef, watch } from 'vue'
import { EMPTY_ARRAY, EMPTY_SET } from '../constants.js'
import { createForm } from '../factories/createForm.js'

/**
 * Native form controller. Vue adapter over `createForm` — resolves the
 * `<form>` ref and delegates the constraint validation pipeline, field
 * lookup, submit / reset flow, and ARIA management to the
 * framework-agnostic factory.
 *
 * Element gating: the host MUST be `<form>` (`HTMLFormElement`). The
 * factory throws on a mismatch.
 *
 * @see src/browser/factories/createForm.ts
 */
export function useForm(
	elementRef: Ref<HTMLFormElement | null>,
	options: UseFormOptions = {},
): UseFormReturn {
	const factory = shallowRef<CreateFormInstance | null>(null)

	const data = computed<readonly FormEntry[]>(() => factory.value?.data.value ?? EMPTY_ARRAY)
	const dirty = computed<boolean>(() => factory.value?.dirty.value ?? false)
	const touched = computed<ReadonlySet<string>>(() => factory.value?.touched.value ?? EMPTY_SET)
	const valid = computed<boolean>(() => factory.value?.valid.value ?? true)
	const validated = computed<boolean>(() => factory.value?.validated.value ?? false)

	const itemsFallback = ref<readonly FormFieldElement[]>(EMPTY_ARRAY)

	// fields/validity sub-domain shapes are constructed ONCE at composable
	// level and forward to the active factory. They keep stable identity
	// for callers that destructure once.
	const fields: FormFieldsInterface = {
		items: computed(() => factory.value?.fields.items.value ?? itemsFallback.value),
		names: computed(() => factory.value?.fields.names.value ?? EMPTY_ARRAY),
		field: (name) => factory.value?.fields.field(name) ?? null,
		fields: (name) => factory.value?.fields.fields(name) ?? EMPTY_ARRAY,
		has: (name) => factory.value?.fields.has(name) ?? false,
		focus: (name) => factory.value?.fields.focus(name) ?? false,
		enable: (name) => factory.value?.fields.enable(name),
		disable: (name) => factory.value?.fields.disable(name),
	}

	const validity: FormValidityInterface = {
		errors: computed(() => factory.value?.validity.errors.value ?? EMPTY_ARRAY),
		field: (name) => factory.value?.validity.field(name) ?? null,
		message: (name) => factory.value?.validity.message(name) ?? null,
		mark: (name, message) => factory.value?.validity.mark(name, message) ?? false,
		clear: (name) => factory.value?.validity.clear(name),
	}

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createForm(el, options)
			factory.value = instance
			onCleanup(() => {
				instance.destroy()
				if (factory.value === instance) factory.value = null
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		element: elementRef,
		data,
		dirty,
		touched,
		valid,
		validated,
		fields,
		validity,
		refresh: () => factory.value?.refresh(),
		check: () => factory.value?.check() ?? false,
		report: () => factory.value?.report() ?? false,
		submit: () => factory.value?.submit(),
		reset: () => factory.value?.reset(),
		clear: () => factory.value?.clear(),
		destroy: () => factory.value?.destroy(),
	}
}
