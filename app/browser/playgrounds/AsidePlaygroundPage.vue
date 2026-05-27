<script lang="ts" setup>
/**
 * Aside playground — drives the createAside statechart from
 * `tests/src/browser/factories/createAside.test.ts` against a live
 * `<aside popover>` drawer. States: `'closed' | 'open'`. Events:
 * `show` / `hide` / `toggle` / `hidepopover` / `destroy`. Observable:
 * `:popover-open`, `ASIDE_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { ASIDE_EVENTS, createAside } from '@elements/browser'
import type { CreateAsideInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const asideRef = useTemplateRef<HTMLElement>('asideRef')
const factory = shallowRef<CreateAsideInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = asideRef.value
	if (!element) return
	const instance = createAside(element)
	factory.value = instance
	const onOpen = (): void => {
		push({ name: ASIDE_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: ASIDE_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	element.addEventListener(ASIDE_EVENTS.open, onOpen)
	element.addEventListener(ASIDE_EVENTS.close, onClose)
	cleanup = () => {
		element.removeEventListener(ASIDE_EVENTS.open, onOpen)
		element.removeEventListener(ASIDE_EVENTS.close, onClose)
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
		await waitForDelay(300)
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

async function fireToggle(): Promise<void> {
	factory.value?.toggle()
	await waitForDelay(300)
}

async function fireHidePopover(): Promise<void> {
	asideRef.value?.hidePopover()
	await waitForDelay(300)
}

const scenarios = [
	{
		name: 'show opens the drawer',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the drawer',
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
		name: 'toggle opens from closed',
		from: 'closed',
		event: 'toggle',
		to: 'open',
		run: async () => {
			await reset()
			await fireToggle()
		},
	},
	{
		name: 'platform hidePopover bridges to close',
		from: 'open',
		event: 'hidepopover',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireHidePopover()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createAside"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<aside ref="asideRef" popover>
			<header>
				<h3>Drawer</h3>
			</header>
			<p>Native popover drawer.</p>
		</aside>
	</StatechartHarness>
</template>
