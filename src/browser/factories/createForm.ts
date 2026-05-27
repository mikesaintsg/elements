import type {
	CreateFormInstance,
	CreateFormOptions,
	FormEntry,
	FormError,
	FormFieldElement,
	FormFieldsInterface,
	FormInputDetail,
	FormValidityInterface,
} from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { FORM_EVENTS, FORM_VALIDATED_ATTR } from '../constants.js'
import {
	assertElement,
	bindEventMap,
	dispatch,
	emit,
	fieldName,
	isValidityElement,
	readFormData,
	readFormErrors,
	readFormFields,
	readFormNames,
} from '../helpers.js'

/**
 * Framework-agnostic native form controller. Tracks form data, field
 * lookup, constraint validation, submit / reset flow, and a
 * `[data-form-validated]` mirror that author CSS can hook for invalid /
 * valid state styling.
 *
 * Element gating: the host MUST be `<form>` (`HTMLFormElement`). The
 * factory throws on a mismatch — every API surface key (`form.elements`,
 * `form.checkValidity()`, the submit/reset/formdata events) is form-only.
 */
export function createForm(
	element: HTMLFormElement,
	options: CreateFormOptions = {},
): CreateFormInstance {
	assertElement<HTMLFormElement>(element, 'form', 'createForm')

	const invalid = options.submit?.invalid ?? false
	const validateInput = options.validate?.input ?? false
	const validateMount = options.validate?.mount ?? false
	const validateSubmit = options.validate?.submit ?? true

	const scope = effectScope()
	const refs = scope.run(() => ({
		data: ref<readonly FormEntry[]>([]),
		dirty: ref(false),
		touched: ref<ReadonlySet<string>>(new Set()),
		valid: ref(true),
		validated: ref(false),
		items: ref<readonly FormFieldElement[]>([]),
		names: ref<readonly string[]>([]),
		errors: ref<readonly FormError[]>([]),
	}))
	if (!refs) throw new Error('createForm: failed to initialize reactive scope')
	const { data, dirty, touched, valid, validated, items, names, errors } = refs

	let destroyed = false
	const aria = new Set<FormFieldElement>()

	const clearAria = (): void => {
		for (const field of aria) field.removeAttribute('aria-invalid')
		aria.clear()
	}

	const current = (): HTMLFormElement | null => (destroyed ? null : element)

	const fieldsByName = (name?: string): readonly FormFieldElement[] => {
		if (name === undefined) return items.value
		return items.value.filter((field) => field.name === name)
	}

	const apply = (el: HTMLFormElement): void => {
		clearAria()
		if (validated.value) {
			el.setAttribute(FORM_VALIDATED_ATTR, '')
			for (const field of items.value) {
				if (!isValidityElement(field) || !field.willValidate) continue
				// Set `aria-invalid` on every validatable field — `false` for
				// valid fields is as important as `true` for invalid ones:
				// screen readers use the explicit `false` to confirm a field
				// passed validation.
				field.setAttribute('aria-invalid', field.validity.valid ? 'false' : 'true')
				aria.add(field)
			}
			return
		}
		el.removeAttribute(FORM_VALIDATED_ATTR)
	}

	const snapshot = (el: HTMLFormElement | null): void => {
		if (!el) {
			data.value = []
			items.value = []
			names.value = []
			errors.value = []
			valid.value = true
			return
		}
		const next = readFormFields(el)
		items.value = next
		names.value = readFormNames(next)
		data.value = readFormData(el)
		errors.value = readFormErrors(next)
		valid.value = errors.value.length === 0
		apply(el)
	}

	const touch = (name: string | null): void => {
		// Fire `dirty` exactly once per pristine → dirty transition. The
		// statechart's `dirty` region is binary; consumers tracking
		// unsaved-changes guards only care about the first edge.
		const wasPristine = !dirty.value
		dirty.value = true
		if (wasPristine) {
			const el = current()
			if (el) emit(el, FORM_EVENTS.dirty, detail(name))
		}
		if (!name) return
		const next = new Set(touched.value)
		next.add(name)
		touched.value = next
	}

	const detail = (field: string | null): FormInputDetail => ({
		field,
		data: data.value,
		valid: valid.value,
	})

	const refresh = (): void => snapshot(current())

	const check = (): boolean => {
		const el = current()
		if (!el) return false
		validated.value = true
		const result = el.checkValidity()
		refresh()
		emit(el, FORM_EVENTS.validate, { errors: errors.value, valid: result })
		return result
	}

	const report = (): boolean => {
		const el = current()
		if (!el) return false
		validated.value = true
		const result = el.reportValidity()
		refresh()
		emit(el, FORM_EVENTS.validate, { errors: errors.value, valid: result })
		return result
	}

	const submit = (): void => {
		current()?.requestSubmit()
	}

	const reset = (): void => {
		current()?.reset()
	}

	const clear = (): void => {
		dirty.value = false
		touched.value = new Set()
		validated.value = false
		const el = current()
		if (el) {
			el.removeAttribute(FORM_VALIDATED_ATTR)
			clearAria()
		}
		refresh()
		if (el) emit(el, FORM_EVENTS.clear, detail(null))
	}

	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			element.removeEventListener('focusout', onFocusout)
			element.removeEventListener('input', onInput)
			element.removeEventListener('change', onChange)
			element.removeEventListener('invalid', onInvalid, true)
			element.removeEventListener('submit', onSubmit)
			element.removeEventListener('reset', onReset)
			element.removeEventListener('formdata', onFormData)
			scope.stop()
		}
		element.removeAttribute(FORM_VALIDATED_ATTR)
		clearAria()
		data.value = []
		items.value = []
		names.value = []
		errors.value = []
		dirty.value = false
		touched.value = new Set()
		valid.value = true
		validated.value = false
	}

	const fields: FormFieldsInterface = {
		items,
		names: readonly(names),
		field: (name) => fieldsByName(name)[0] ?? null,
		fields: fieldsByName,
		has: (name) => fieldsByName(name).length > 0,
		focus: (name) => {
			const field = fieldsByName(name)[0]
			if (!field) return false
			field.focus()
			return true
		},
		enable: (name) => {
			for (const field of fieldsByName(name)) {
				if ('disabled' in field) field.disabled = false
			}
			refresh()
		},
		disable: (name) => {
			for (const field of fieldsByName(name)) {
				if ('disabled' in field) field.disabled = true
			}
			refresh()
		},
	}

	const validity: FormValidityInterface = {
		errors: readonly(errors),
		field: (name) => {
			const field = fieldsByName(name).find(isValidityElement)
			if (!field || !field.willValidate) return null
			return field.validity
		},
		message: (name) => {
			const field = fieldsByName(name).find(isValidityElement)
			return field?.validationMessage ?? null
		},
		mark: (name, message) => {
			const targets = fieldsByName(name).filter(isValidityElement)
			if (targets.length === 0) return false
			for (const field of targets) field.setCustomValidity(message)
			refresh()
			return true
		},
		clear: (name) => {
			const targets = fieldsByName(name).filter(isValidityElement)
			for (const field of targets) field.setCustomValidity('')
			refresh()
		},
	}

	// Mark a field as touched when the user leaves it without triggering
	// input/change — e.g. tabbing through a required field without typing.
	// Only updates `touched`; does NOT set `dirty` because no value changed.
	const onFocusout = (event: FocusEvent): void => {
		const name = event.target instanceof Element ? fieldName(event.target) : null
		if (!name) return
		if (touched.value.has(name)) return
		const next = new Set(touched.value)
		next.add(name)
		touched.value = next
	}

	const onInput = (event: Event): void => {
		const name = event.target instanceof Element ? fieldName(event.target) : null
		touch(name)
		if (validateInput) validated.value = true
		refresh()
		const el = current()
		if (el) emit(el, FORM_EVENTS.input, detail(name))
	}

	const onChange = (event: Event): void => {
		const name = event.target instanceof Element ? fieldName(event.target) : null
		touch(name)
		if (validateInput) validated.value = true
		refresh()
		const el = current()
		if (el) emit(el, FORM_EVENTS.change, detail(name))
	}

	let invalidPending = false
	const scheduleInvalidRefresh = (): void => {
		if (invalidPending) return
		invalidPending = true
		queueMicrotask(() => {
			invalidPending = false
			refresh()
		})
	}

	const onInvalid = (event: Event): void => {
		const target = event.target instanceof Element ? event.target : null
		const name = target ? fieldName(target) : null
		// An `invalid` event from a user-gesture submit means the browser ran
		// constraint validation. Mark the form as `validated` so the
		// `[data-form-validated]` attribute (and any author CSS hooked to it)
		// reflects the post-attempt state — even when the native `submit`
		// event never fires because validation aborted it.
		if (validateSubmit) validated.value = true
		scheduleInvalidRefresh()
		const el = current()
		if (!el) return
		const state = target && isValidityElement(target) ? target.validity : null
		const message = target && isValidityElement(target) ? target.validationMessage : ''
		emit(el, FORM_EVENTS.invalid, { field: name, message, validity: state })
	}

	const onFormData = (event: FormDataEvent): void => {
		const el = current()
		if (!el) return
		emit(el, FORM_EVENTS.formdata, { data: event.formData })
	}

	const onSubmit = (event: Event): void => {
		const el = current()
		if (!el) return
		if (validateSubmit) validated.value = true
		refresh()
		const payload = { data: data.value, errors: errors.value, valid: valid.value }
		const proceed = dispatch(el, FORM_EVENTS.submit, payload)
		if (!proceed || (!valid.value && !invalid)) event.preventDefault()
	}

	const onReset = (event: Event): void => {
		const el = current()
		if (!el) return
		const proceed = dispatch(el, FORM_EVENTS.reset, { data: data.value })
		if (!proceed) {
			event.preventDefault()
			return
		}
		dirty.value = false
		touched.value = new Set()
		validated.value = false
		queueMicrotask(refresh)
	}

	const offBound = bindEventMap(element, FORM_EVENTS, options.on)
	element.addEventListener('focusout', onFocusout)
	element.addEventListener('input', onInput)
	element.addEventListener('change', onChange)
	element.addEventListener('invalid', onInvalid, true)
	element.addEventListener('submit', onSubmit)
	element.addEventListener('reset', onReset)
	element.addEventListener('formdata', onFormData)
	if (validateMount) validated.value = true
	refresh()

	return {
		element,
		data: readonly(data),
		dirty: readonly(dirty),
		touched: readonly(touched),
		valid: readonly(valid),
		validated: readonly(validated),
		fields,
		validity,
		refresh,
		check,
		report,
		submit,
		reset,
		clear,
		destroy,
	}
}
