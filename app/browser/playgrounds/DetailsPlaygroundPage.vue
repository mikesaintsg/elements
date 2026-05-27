<script lang="ts" setup>
/**
 * Details playground — drives the createDetails statechart from
 * `tests/src/browser/factories/createDetails.test.ts` against a live
 * `<details>`. States: `'closed' | 'open'`. Events: `show` / `hide` /
 * `nativetoggle` / `deactivate` / `destroy`. Observable: native
 * `[open]` + `DETAILS_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createDetails, DETAILS_EVENTS } from '@elements/browser'
import type { CreateDetailsInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const detailsRef = useTemplateRef<HTMLDetailsElement>('detailsRef')
const factory = shallowRef<CreateDetailsInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = detailsRef.value
	if (!element) return
	const instance = createDetails(element)
	factory.value = instance
	const onOpen = (): void => {
		push({ name: DETAILS_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: DETAILS_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	element.addEventListener(DETAILS_EVENTS.open, onOpen)
	element.addEventListener(DETAILS_EVENTS.close, onClose)
	cleanup = () => {
		element.removeEventListener(DETAILS_EVENTS.open, onOpen)
		element.removeEventListener(DETAILS_EVENTS.close, onClose)
		instance.destroy()
		factory.value = null
	}
})

const state = computed(() => {
	void tick.value
	return factory.value?.visible.value === true ? 'open' : 'closed'
})

async function reset(): Promise<void> {
	if (factory.value?.visible.value === true) {
		factory.value.hide()
		await waitForDelay(200)
	}
}

async function fireShow(): Promise<void> {
	factory.value?.show()
	await waitForDelay(300)
}

async function fireHide(): Promise<void> {
	factory.value?.hide()
	await waitForDelay(300)
}

async function fireNativeToggle(): Promise<void> {
	const element = detailsRef.value
	if (!element) return
	element.open = !element.open
	element.dispatchEvent(new Event('toggle'))
	await waitForDelay(300)
}

async function fireDeactivate(): Promise<void> {
	detailsRef.value?.dispatchEvent(
		new CustomEvent(DETAILS_EVENTS.deactivate, { bubbles: true, cancelable: false }),
	)
	await waitForDelay(300)
}

const scenarios = [
	{
		name: 'show opens the disclosure',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the disclosure',
		from: 'open',
		event: 'hide',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireHide()
		},
	},
	{
		name: 'native [open] flip bridges to visible',
		from: 'closed',
		event: 'nativetoggle',
		to: 'open',
		run: async () => {
			await reset()
			await fireNativeToggle()
		},
	},
	{
		name: 'external deactivate event closes',
		from: 'open',
		event: 'deactivate',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireDeactivate()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createDetails"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<details ref="detailsRef">
			<summary>Disclosure summary</summary>
			<p>Hidden until the disclosure is open.</p>
		</details>
	</StatechartHarness>
</template>
