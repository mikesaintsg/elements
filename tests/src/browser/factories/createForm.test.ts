import { describe, expect, it } from 'vitest'
import { createForm, FORM_EVENTS } from '@elements/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

function createFormFixture(): {
	readonly form: HTMLFormElement
	readonly username: HTMLInputElement
	readonly email: HTMLInputElement
} {
	const form = buildElement('form')
	const username = document.createElement('input')
	username.name = 'username'
	username.required = true
	username.type = 'text'
	const email = document.createElement('input')
	email.name = 'email'
	email.type = 'email'
	form.append(username, email)
	return { form, username, email }
}

describe('createForm', () => {
	it('rejects non-<form> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createForm(wrong as unknown as HTMLFormElement)).toThrowError(/form/i)
	})

	it('snapshots field names + data + initial validity', () => {
		const { form, username, email } = createFormFixture()
		username.value = 'alice'
		email.value = 'alice@example.com'
		const [api] = createFactoryFixture(() => createForm(form))
		expect(api.fields.names.value).toEqual(['username', 'email'])
		expect(api.data.value.map((entry) => entry.name)).toEqual(['username', 'email'])
		expect(api.valid.value).toBe(true)
	})

	it('check() sets data-form-validated and emits validate', () => {
		const { form } = createFormFixture()
		const validate = createRecorder<[Event]>()
		form.addEventListener(FORM_EVENTS.validate, validate.handler)
		const [api] = createFactoryFixture(() => createForm(form))
		api.check()
		expect(form.hasAttribute('data-form-validated')).toBe(true)
		expect(validate.count).toBe(1)
	})

	it('reports invalid fields with aria-invalid', () => {
		const { form, username } = createFormFixture()
		username.value = ''
		const [api] = createFactoryFixture(() => createForm(form))
		api.check()
		expect(api.valid.value).toBe(false)
		expect(username.getAttribute('aria-invalid')).toBe('true')
		expect(api.validity.errors.value.map((e) => e.name)).toEqual(['username'])
	})

	it('clear() resets dirty / touched / validated state', () => {
		const { form, username } = createFormFixture()
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
		const { form, username } = createFormFixture()
		const input = createRecorder<[Event]>()
		form.addEventListener(FORM_EVENTS.input, input.handler)
		createFactoryFixture(() => createForm(form))
		username.dispatchEvent(new Event('input', { bubbles: true }))
		expect(input.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => {
			const { form } = createFormFixture()
			return createForm(form)
		})
	})
})
