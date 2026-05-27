<script lang="ts" setup>
/**
 * Toast playground — drives the createToast statechart from
 * `tests/src/browser/factories/createToast.test.ts` against a live
 * `<div role="status" popover>`. States: `'closed' | 'open-playing' |
 * 'open-paused'`. Events: `show` / `hide` / `pause` / `resume` /
 * `autohide` / `destroy`. Observable: `:popover-open`,
 * `TOAST_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createToast, TOAST_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateToastInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const toastRef = useTemplateRef<HTMLDivElement>('toastRef')
const factory = shallowRef<CreateToastInstance | null>(null)
const tick = ref(0)
const paused = ref(false)
const TOAST_DELAY_MS = 2000
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = toastRef.value
	if (!element) return
	const instance = createToast(element, { autohide: { delay: TOAST_DELAY_MS } })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: TOAST_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: TOAST_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	element.addEventListener(TOAST_EVENTS.open, onOpen)
	element.addEventListener(TOAST_EVENTS.close, onClose)
	cleanup = () => {
		element.removeEventListener(TOAST_EVENTS.open, onOpen)
		element.removeEventListener(TOAST_EVENTS.close, onClose)
		instance.destroy()
		factory.value = null
	}
})

const state = computed(() => {
	void tick.value
	if (factory.value?.visible.value !== true) return 'closed'
	return paused.value ? 'open-paused' : 'open-playing'
})

async function reset(): Promise<void> {
	paused.value = false
	if (factory.value?.visible.value === true) {
		factory.value.hide()
		await waitForDelay(TRANSITION_FALLBACK_MS + 100)
	}
}

async function fireShow(): Promise<void> {
	factory.value?.show()
	paused.value = false
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireHide(): Promise<void> {
	factory.value?.hide()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function firePause(): Promise<void> {
	factory.value?.pause()
	paused.value = true
	await waitForDelay(300)
}

async function fireResume(): Promise<void> {
	factory.value?.resume()
	paused.value = false
	await waitForDelay(300)
}

async function fireAutohide(): Promise<void> {
	// Wait for the autohide delay + transition fallback to elapse with
	// real wall-time so the user can watch the toast self-dismiss.
	await waitForDelay(TOAST_DELAY_MS + TRANSITION_FALLBACK_MS + 200)
}

const scenarios = [
	{
		name: 'show opens the toast',
		from: 'closed',
		event: 'show',
		to: 'open-playing',
		run: async () => {
			await reset()
			factory.value?.show()
			paused.value = false
			// Pause briefly to keep the toast visible for inspection
			// without auto-dismissing during the scenario.
			factory.value?.pause()
			paused.value = true
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
			factory.value?.resume()
			paused.value = false
		},
	},
	{
		name: 'pause suspends the autohide timer',
		from: 'open-playing',
		event: 'pause',
		to: 'open-paused',
		run: async () => {
			await reset()
			await fireShow()
			await firePause()
		},
	},
	{
		name: 'resume restarts the timer',
		from: 'open-paused',
		event: 'resume',
		to: 'open-playing',
		run: async () => {
			await reset()
			await fireShow()
			await firePause()
			await fireResume()
		},
	},
	{
		name: 'hide closes the toast',
		from: 'open-playing',
		event: 'hide',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await firePause()
			factory.value?.resume()
			paused.value = false
			await fireHide()
		},
	},
	{
		name: 'autohide elapses, toast self-dismisses',
		from: 'open-playing',
		event: 'autohide',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireAutohide()
		},
	},
] as const

async function demo(): Promise<void> {
	// Leave the widget in its showcase-friendly state so visual
	// reviewers see toast mid-life instead of reset to baseline.
	factory.value?.show()
	factory.value?.pause()
	await waitForDelay(300)
}

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createToast"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
		:demo="demo"
	>
		<div ref="toastRef" popover role="status">
			<header>
				<strong>Saved</strong>
			</header>
			<p>Toast notification body.</p>
		</div>
	</StatechartHarness>
</template>
