<script lang="ts" setup>
/**
 * Focus playground — drives the createFocus statechart from
 * `tests/src/browser/factories/createFocus.test.ts`. States:
 * `'inactive' | 'active'`. Events: `activate` / `deactivate` /
 * `destroy`. Observable: `active.value`, `FOCUS_EVENTS.activate` /
 * `FOCUS_EVENTS.deactivate`, the document's `activeElement` shift.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createFocus, FOCUS_EVENTS } from '@elements/browser'
import type { CreateFocusInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const trapRef = useTemplateRef<HTMLDivElement>('trapRef')
const factory = shallowRef<CreateFocusInstance | null>(null)
const state = ref<'inactive' | 'active'>('inactive')
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	state.value = factory.value?.active.value === true ? 'active' : 'inactive'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = trapRef.value
	if (!element) return
	const instance = createFocus(element)
	factory.value = instance
	const onActivate = (): void => {
		push({ name: FOCUS_EVENTS.activate, time: performance.now() })
		sync()
	}
	const onDeactivate = (): void => {
		push({ name: FOCUS_EVENTS.deactivate, time: performance.now() })
		sync()
	}
	element.addEventListener(FOCUS_EVENTS.activate, onActivate)
	element.addEventListener(FOCUS_EVENTS.deactivate, onDeactivate)
	cleanup = () => {
		element.removeEventListener(FOCUS_EVENTS.activate, onActivate)
		element.removeEventListener(FOCUS_EVENTS.deactivate, onDeactivate)
		instance.destroy()
		factory.value = null
	}
})

async function reset(): Promise<void> {
	if (factory.value?.active.value === true) {
		factory.value.deactivate()
		await waitForDelay(150)
	}
	sync()
}

const scenarios = [
	{
		name: 'activate engages the focus trap',
		from: 'inactive',
		event: 'activate',
		to: 'active',
		run: async () => {
			await reset()
			factory.value?.activate()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'deactivate releases the trap',
		from: 'active',
		event: 'deactivate',
		to: 'inactive',
		run: async () => {
			await reset()
			factory.value?.activate()
			await waitForDelay(200)
			factory.value?.deactivate()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'activate is idempotent when already active',
		from: 'active',
		event: 'activate',
		to: 'active',
		run: async () => {
			await reset()
			factory.value?.activate()
			await waitForDelay(150)
			factory.value?.activate()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'deactivate is idempotent when already inactive',
		from: 'inactive',
		event: 'deactivate',
		to: 'inactive',
		run: async () => {
			await reset()
			factory.value?.deactivate()
			await waitForDelay(200)
			sync()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createFocus"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div ref="trapRef">
			<header>
				<h3>Focus trap</h3>
				<p>Tab cycles between these controls while the trap is engaged.</p>
			</header>
			<menu>
				<li><button type="button">First</button></li>
				<li><button type="button">Second</button></li>
				<li><button type="button">Third</button></li>
			</menu>
		</div>
	</StatechartHarness>
</template>
