<script lang="ts" setup>
/**
 * Form playground — drives the createForm statechart from
 * `tests/src/browser/factories/createForm.test.ts`. States: `'pristine'
 * | 'dirty' | 'validated-valid' | 'validated-invalid'`. Events:
 * `input-valid` / `input-invalid` / `check` / `clear` / `reset` /
 * `destroy`. Observable: `[data-form-validated]`, `[aria-invalid]` on
 * fields, `FORM_EVENTS.validate` on submit / check.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createForm, FORM_EVENTS } from '@elements/browser'
import type { CreateFormInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const formRef = useTemplateRef<HTMLFormElement>('formRef')
const usernameRef = useTemplateRef<HTMLInputElement>('usernameRef')
const factory = shallowRef<CreateFormInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const form = formRef.value
	const username = usernameRef.value
	if (!form || !username) return
	username.value = 'alice'
	const instance = createForm(form)
	factory.value = instance
	const onValidate = (): void => {
		push({ name: FORM_EVENTS.validate, time: performance.now() })
		tick.value += 1
	}
	const onInput = (): void => {
		push({ name: FORM_EVENTS.input, time: performance.now() })
		tick.value += 1
	}
	form.addEventListener(FORM_EVENTS.validate, onValidate)
	form.addEventListener(FORM_EVENTS.input, onInput)
	cleanup = () => {
		form.removeEventListener(FORM_EVENTS.validate, onValidate)
		form.removeEventListener(FORM_EVENTS.input, onInput)
		instance.destroy()
		factory.value = null
	}
})

const state = computed(() => {
	void tick.value
	const api = factory.value
	if (!api) return 'pristine'
	if (api.validated.value) {
		return api.valid.value ? 'validated-valid' : 'validated-invalid'
	}
	return api.dirty.value ? 'dirty' : 'pristine'
})

async function reset(): Promise<void> {
	factory.value?.clear()
	const username = usernameRef.value
	if (username) username.value = 'alice'
	await waitForDelay(150)
}

function inputField(field: HTMLInputElement, value: string): void {
	field.value = value
	field.dispatchEvent(new Event('input', { bubbles: true }))
}

const scenarios = [
	{
		name: 'input-valid drives pristine → dirty',
		from: 'pristine',
		event: 'input-valid',
		to: 'dirty',
		run: async () => {
			await reset()
			if (usernameRef.value) inputField(usernameRef.value, 'bob')
			await waitForDelay(300)
		},
	},
	{
		name: 'check on dirty (valid) → validated-valid',
		from: 'dirty',
		event: 'check',
		to: 'validated-valid',
		run: async () => {
			await reset()
			if (usernameRef.value) inputField(usernameRef.value, 'bob')
			await waitForDelay(200)
			factory.value?.check()
			await waitForDelay(300)
		},
	},
	{
		name: 'check on empty required field → validated-invalid',
		from: 'dirty',
		event: 'check',
		to: 'validated-invalid',
		run: async () => {
			await reset()
			if (usernameRef.value) inputField(usernameRef.value, '')
			await waitForDelay(200)
			factory.value?.check()
			await waitForDelay(300)
		},
	},
	{
		name: 'clear resets validated-valid → pristine',
		from: 'validated-valid',
		event: 'clear',
		to: 'pristine',
		run: async () => {
			await reset()
			if (usernameRef.value) inputField(usernameRef.value, 'bob')
			factory.value?.check()
			await waitForDelay(200)
			factory.value?.clear()
			await waitForDelay(300)
		},
	},
] as const

async function demo(): Promise<void> {
	// Leave the widget in its showcase-friendly state so visual
	// reviewers see the entity mid-life instead of reset to baseline.
	if (usernameRef.value) {
		usernameRef.value.value = 'bob'
		usernameRef.value.dispatchEvent(new Event('input', { bubbles: true }))
	}
	await waitForDelay(200)
	factory.value?.check()
	await waitForDelay(200)
}

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createForm"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
		:demo="demo"
	>
		<form ref="formRef">
			<label>
				Username
				<input ref="usernameRef" name="username" required type="text" />
			</label>
			<label>
				Email
				<input name="email" type="email" />
			</label>
		</form>
	</StatechartHarness>
</template>
