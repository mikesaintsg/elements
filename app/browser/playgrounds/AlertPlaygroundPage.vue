<script lang="ts" setup>
/**
 * Alert playground — drives the createAlert statechart from
 * `tests/src/browser/factories/createAlert.test.ts`. States: `'closed'
 * | 'open'`. Events: `show` / `hide` / `dismissclick` / `destroy`.
 * Observable: `[data-alert-open]`, `[aria-hidden]`,
 * `ALERT_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { ALERT_EVENTS, createAlert, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateAlertInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const alertRef = useTemplateRef<HTMLElement>('alertRef')
const dismissRef = useTemplateRef<HTMLButtonElement>('dismissRef')
const factory = shallowRef<CreateAlertInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

watchEffect((onCleanup) => {
	const element = alertRef.value
	if (!element) return
	const instance = createAlert(element, { initial: false })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: ALERT_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: ALERT_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	element.addEventListener(ALERT_EVENTS.open, onOpen)
	element.addEventListener(ALERT_EVENTS.close, onClose)
	onCleanup(() => {
		element.removeEventListener(ALERT_EVENTS.open, onOpen)
		element.removeEventListener(ALERT_EVENTS.close, onClose)
		instance.destroy()
		factory.value = null
	})
})

const state = computed(() => {
	void tick.value
	return factory.value?.visible.value === true ? 'open' : 'closed'
})

async function reset(): Promise<void> {
	if (factory.value?.visible.value === true) {
		factory.value.hide()
		await waitForDelay(TRANSITION_FALLBACK_MS + 100)
	}
}

const scenarios = [
	{
		name: 'show opens the alert',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			factory.value?.show()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
		},
	},
	{
		name: 'hide closes the alert',
		from: 'open',
		event: 'hide',
		to: 'closed',
		run: async () => {
			await reset()
			factory.value?.show()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
			factory.value?.hide()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
		},
	},
	{
		name: 'click [data-alert-dismiss] hides',
		from: 'open',
		event: 'dismissclick',
		to: 'closed',
		run: async () => {
			await reset()
			factory.value?.show()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
			dismissRef.value?.click()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
		},
	},
] as const

onUnmounted(() => {
	factory.value?.destroy()
})
</script>

<template>
	<StatechartHarness
		title="createAlert"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<aside ref="alertRef" role="alert" class="warning">
			<p>Heads up — this is the alert body.</p>
			<button ref="dismissRef" type="button" class="subtle small" data-alert-dismiss>
				Dismiss
			</button>
		</aside>
	</StatechartHarness>
</template>
