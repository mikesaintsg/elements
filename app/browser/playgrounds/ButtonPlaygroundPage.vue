<script lang="ts" setup>
/**
 * Button playground — drives the createButton statechart from
 * `tests/src/browser/factories/createButton.test.ts` against a live
 * `<button>`. State is `'inactive' | 'active'`; events are `toggle` /
 * `click` / `destroy`. Observable: `[aria-pressed]`, `.active` class,
 * emitted `BUTTON_EVENTS.toggle`.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { BUTTON_EVENTS, createButton } from '@elements/browser'
import type { CreateButtonInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const buttonRef = useTemplateRef<HTMLButtonElement>('buttonRef')
const factory = shallowRef<CreateButtonInstance | null>(null)
const state = ref<'inactive' | 'active'>('inactive')
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	state.value = factory.value?.active.value === true ? 'active' : 'inactive'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = buttonRef.value
	if (!element) return
	const instance = createButton(element)
	factory.value = instance
	const onToggle = (event: Event): void => {
		if (event instanceof CustomEvent && typeof event.detail === 'object') {
			const detail = event.detail as { readonly active?: unknown }
			const flag = typeof detail.active === 'boolean' ? detail.active : null
			push({
				name: `${BUTTON_EVENTS.toggle} (active=${String(flag)})`,
				time: performance.now(),
			})
		}
		sync()
	}
	element.addEventListener(BUTTON_EVENTS.toggle, onToggle)
	cleanup = () => {
		element.removeEventListener(BUTTON_EVENTS.toggle, onToggle)
		instance.destroy()
		factory.value = null
	}
})

async function reset(): Promise<void> {
	if (factory.value?.active.value === true) {
		factory.value.toggle()
		await waitForDelay(200)
	}
	sync()
}

async function driveTo(state_: 'inactive' | 'active'): Promise<void> {
	await reset()
	if (state_ === 'active') {
		factory.value?.toggle()
		await waitForDelay(300)
	}
	sync()
}

async function fireToggle(): Promise<void> {
	factory.value?.toggle()
	await waitForDelay(300)
	sync()
}

async function fireClick(): Promise<void> {
	buttonRef.value?.click()
	await waitForDelay(300)
	sync()
}

const scenarios = [
	{
		name: 'toggle from rest',
		from: 'inactive',
		event: 'toggle',
		to: 'active',
		run: async () => {
			await driveTo('inactive')
			await fireToggle()
		},
	},
	{
		name: 'toggle while active',
		from: 'active',
		event: 'toggle',
		to: 'inactive',
		run: async () => {
			await driveTo('active')
			await fireToggle()
		},
	},
	{
		name: 'native click drives toggle',
		from: 'inactive',
		event: 'click',
		to: 'active',
		run: async () => {
			await driveTo('inactive')
			await fireClick()
		},
	},
	{
		name: 'native click while active',
		from: 'active',
		event: 'click',
		to: 'inactive',
		run: async () => {
			await driveTo('active')
			await fireClick()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createButton"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<button ref="buttonRef" type="button" class="primary large">Toggle me</button>
	</StatechartHarness>
</template>
