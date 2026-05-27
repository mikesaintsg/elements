import { describe, expect, it } from 'vitest'
import type { CreateFormInstance, CreateFormOptions } from '@elements/browser'
import { createForm, FORM_EVENTS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createFormElements,
	inputField,
	runScenario,
} from '../../../setupBrowser'

describe('createForm', () => {
	it('rejects non-<form> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createForm(wrong as unknown as HTMLFormElement)).toThrowError(/form/i)
	})

	it('snapshots field names + data + initial validity', () => {
		const { form, username, email } = createFormElements()
		username.value = 'alice'
		email.value = 'alice@example.com'
		const [api] = createFactoryFixture(() => createForm(form))
		expect(api.fields.names.value).toEqual(['username', 'email'])
		expect(api.data.value.map((entry) => entry.name)).toEqual(['username', 'email'])
		expect(api.valid.value).toBe(true)
	})

	it('check() sets data-form-validated and emits validate', () => {
		const { form } = createFormElements()
		const validate = createRecorder<[Event]>()
		form.addEventListener(FORM_EVENTS.validate, validate.handler)
		const [api] = createFactoryFixture(() => createForm(form))
		api.check()
		expect(form.hasAttribute('data-form-validated')).toBe(true)
		expect(validate.count).toBe(1)
	})

	it('reports invalid fields with aria-invalid', () => {
		const { form, username } = createFormElements()
		username.value = ''
		const [api] = createFactoryFixture(() => createForm(form))
		api.check()
		expect(api.valid.value).toBe(false)
		expect(username.getAttribute('aria-invalid')).toBe('true')
		expect(api.validity.errors.value.map((e) => e.name)).toEqual(['username'])
	})

	it('clear() resets dirty / touched / validated state', () => {
		const { form, username } = createFormElements()
		const [api] = createFactoryFixture(() => createForm(form))
		username.value = 'alice'
		username.dispatchEvent(new Event('input', { bubbles: true }))
		api.check()
		expect(api.dirty.value).toBe(true)
		expect(api.validated.value).toBe(true)
		api.clear()
		expect(api.dirty.value).toBe(false)
		expect(api.validated.value).toBe(false)
		expect(form.hasAttribute('data-form-validated')).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { form, username } = createFormElements()
		const input = createRecorder<[Event]>()
		form.addEventListener(FORM_EVENTS.input, input.handler)
		createFactoryFixture(() => createForm(form))
		username.dispatchEvent(new Event('input', { bubbles: true }))
		expect(input.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => {
			const { form } = createFormElements()
			return createForm(form)
		})
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Form has orthogonal state regions: validated (vs. unvalidated) and
// valid (vs. invalid). The factory exposes both as readonly refs and
// drives them via `check()`, `clear()`, and field `input` events.
//
// Composite states under coverage:
//   - 'pristine'         : initial, no field has emitted input, no check ran
//   - 'dirty'            : at least one field emitted input, no check ran
//   - 'validated-valid'  : check ran, every required field passed
//   - 'validated-invalid': check ran, at least one required field failed
//
//   Events   : 'input-valid' | 'input-invalid' | 'check' | 'clear'
//              | 'reset' | 'destroy'

type FormState = 'pristine' | 'dirty' | 'validated-valid' | 'validated-invalid'
type FormEvent = 'input-valid' | 'input-invalid' | 'check' | 'clear' | 'reset' | 'destroy'

interface FormContext {
	readonly api: CreateFormInstance
	readonly form: HTMLFormElement
	readonly username: HTMLInputElement
	readonly email: HTMLInputElement
}

function buildFormContext(options: CreateFormOptions = {}): FormContext {
	const { form, username, email } = createFormElements()
	// Pre-fill the required `username` field so the initial native
	// validity is `valid: true` — the statechart's `pristine` state
	// models "form satisfies constraints, no user input has fired yet".
	username.value = 'alice'
	const [api] = createFactoryFixture(() => createForm(form, options))
	return { api, form, username, email }
}

function driveToFormState(context: FormContext, state: FormState): void {
	if (state === 'pristine') return
	if (state === 'dirty') {
		inputField(context.username, 'bob')
		return
	}
	if (state === 'validated-valid') {
		context.api.check()
		return
	}
	// validated-invalid
	inputField(context.username, '')
	context.api.check()
}

function fireFormEvent(context: FormContext, event: FormEvent): void {
	if (event === 'input-valid') {
		inputField(context.username, 'alice')
		return
	}
	if (event === 'input-invalid') {
		inputField(context.username, '')
		return
	}
	if (event === 'check') {
		context.api.check()
		return
	}
	if (event === 'clear') {
		context.api.clear()
		return
	}
	if (event === 'reset') {
		context.api.reset()
		return
	}
	context.api.destroy()
}

interface FormObservables {
	readonly dirty: boolean
	readonly validated: boolean
	readonly valid: boolean
	readonly dataFormValidated: boolean
}

// `dirty` flips on the first user input event after construction / clear()
// and stays true through subsequent checks (check() does not reset dirty —
// it only flips `validated` to true and sets `[data-form-validated]`).
// `clear()` is the only path that drops dirty back to false.
const FORM_OBSERVABLES: Readonly<Record<FormState, FormObservables>> = {
	pristine: { dirty: false, validated: false, valid: true, dataFormValidated: false },
	dirty: { dirty: true, validated: false, valid: true, dataFormValidated: false },
	'validated-valid': { dirty: true, validated: true, valid: true, dataFormValidated: true },
	'validated-invalid': { dirty: true, validated: true, valid: false, dataFormValidated: true },
}

function assertFormState(context: FormContext, state: FormState): void {
	const expected = FORM_OBSERVABLES[state]
	expect(context.api.dirty.value).toBe(expected.dirty)
	expect(context.api.validated.value).toBe(expected.validated)
	expect(context.api.valid.value).toBe(expected.valid)
	expect(context.form.hasAttribute('data-form-validated')).toBe(expected.dataFormValidated)
}

const FORM_SCENARIOS: readonly StateScenario<FormState, FormEvent, FormContext>[] = [
	{
		transition: {
			name: 'pristine × input-valid → dirty',
			from: 'pristine',
			event: 'input-valid',
			to: 'dirty',
		},
		arrange: driveToFormState,
		act: fireFormEvent,
		assert: assertFormState,
	},
	{
		transition: {
			name: 'dirty × check → validated-valid (every required field passes)',
			from: 'dirty',
			event: 'check',
			to: 'validated-valid',
		},
		arrange: driveToFormState,
		act: fireFormEvent,
		assert: (context, state) => {
			assertFormState(context, state)
			expect(context.username.getAttribute('aria-invalid')).toBe('false')
		},
	},
	{
		transition: {
			name: 'dirty × input-invalid → dirty (state stable, validity flips)',
			from: 'dirty',
			event: 'input-invalid',
			to: 'dirty',
		},
		arrange: driveToFormState,
		act: fireFormEvent,
		assert: (context) => {
			// `dirty` → `dirty` after clearing the required field: state
			// stays dirty (no check has run, no `validated` flip), but the
			// underlying native validity is now false. This is the "guard
			// fails but state holds" branch the prompt asks us to cover.
			expect(context.api.dirty.value).toBe(true)
			expect(context.api.validated.value).toBe(false)
			expect(context.api.valid.value).toBe(false)
			expect(context.form.hasAttribute('data-form-validated')).toBe(false)
		},
	},
	{
		transition: {
			name: 'dirty × check → validated-invalid (required field empty)',
			from: 'dirty',
			event: 'check',
			to: 'validated-invalid',
		},
		arrange: (context, state) => {
			// Override the `dirty` arrange path: clear the required field
			// so `check()` produces an invalid validation snapshot.
			if (state === 'dirty') {
				inputField(context.username, '')
				return
			}
			driveToFormState(context, state)
		},
		act: fireFormEvent,
		assert: (context, state) => {
			assertFormState(context, state)
			expect(context.username.getAttribute('aria-invalid')).toBe('true')
			expect(context.api.validity.errors.value.map((entry) => entry.name)).toEqual(['username'])
		},
	},
	{
		transition: {
			name: 'validated-valid × clear → pristine (state resets entirely)',
			from: 'validated-valid',
			event: 'clear',
			to: 'pristine',
		},
		arrange: driveToFormState,
		act: fireFormEvent,
		assert: assertFormState,
	},
	{
		transition: {
			name: 'validated-invalid × clear → unvalidated invalid (dirty + validated reset; field value stays empty)',
			from: 'validated-invalid',
			event: 'clear',
			to: 'pristine',
		},
		arrange: driveToFormState,
		act: fireFormEvent,
		assert: (context) => {
			// `clear()` resets factory bookkeeping (dirty=false, validated
			// =false, [data-form-validated] removed, errors emptied) but
			// does NOT clear field values. The required `username` was
			// emptied to reach validated-invalid, so native validity is
			// still false after clear — this scenario is the "clean
			// bookkeeping with invalid form" branch, not a flip to
			// `pristine`'s `valid: true`.
			expect(context.api.dirty.value).toBe(false)
			expect(context.api.validated.value).toBe(false)
			expect(context.api.valid.value).toBe(false)
			expect(context.form.hasAttribute('data-form-validated')).toBe(false)
		},
	},
]

describe('createForm (statechart)', () => {
	it.each(FORM_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildFormContext()
		// Pre-filled `username` makes the initial form valid + unvalidated.
		expect(context.api.dirty.value).toBe(false)
		expect(context.api.validated.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('check fires FORM_EVENTS.validate exactly once', () => {
		const context = buildFormContext()
		const validate = createRecorder<[Event]>()
		context.form.addEventListener(FORM_EVENTS.validate, validate.handler)
		context.api.check()
		expect(validate.count).toBe(1)
	})

	it('input fires FORM_EVENTS.input on every keystroke', () => {
		const context = buildFormContext()
		const input = createRecorder<[Event]>()
		context.form.addEventListener(FORM_EVENTS.input, input.handler)
		inputField(context.username, 'a')
		inputField(context.username, 'ab')
		expect(input.count).toBe(2)
	})
})
