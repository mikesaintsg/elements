<script lang="ts" setup>
/**
 * Dialog playground — drives the createDialog statechart from
 * `tests/src/browser/factories/createDialog.test.ts` against a live
 * `<dialog>`. States: `'closed' | 'open' | 'open-nonmodal'`. Events:
 * `show` / `hide` / `nativeclose` / `destroy`. Observable: native
 * `[open]`, `:modal`, body `[data-elements-scroll-locked]`, plus
 * `DIALOG_EVENTS.open` / `close` post-transition emissions.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { createDialog, DIALOG_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateDialogInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const dialogRef = useTemplateRef<HTMLDialogElement>('dialogRef')
const factory = shallowRef<CreateDialogInstance | null>(null)
const tick = ref(0)
const modal = ref(true)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

watchEffect((onCleanup) => {
	const element = dialogRef.value
	if (!element) return
	const instance = createDialog(element, { modal: modal.value })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: DIALOG_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: DIALOG_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	element.addEventListener(DIALOG_EVENTS.open, onOpen)
	element.addEventListener(DIALOG_EVENTS.close, onClose)
	onCleanup(() => {
		element.removeEventListener(DIALOG_EVENTS.open, onOpen)
		element.removeEventListener(DIALOG_EVENTS.close, onClose)
		instance.destroy()
		factory.value = null
	})
})

const state = computed(() => {
	void tick.value
	const element = dialogRef.value
	if (!element || factory.value?.visible.value !== true) return 'closed'
	return element.matches(':modal') ? 'open' : 'open-nonmodal'
})

async function reset(): Promise<void> {
	if (factory.value?.visible.value === true) {
		factory.value.hide()
		await waitForDelay(TRANSITION_FALLBACK_MS + 100)
	}
}

async function fireShow(): Promise<void> {
	factory.value?.show()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireHide(): Promise<void> {
	factory.value?.hide()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireNativeClose(): Promise<void> {
	dialogRef.value?.dispatchEvent(new Event('close'))
	await waitForDelay(200)
}

const scenarios = [
	{
		name: 'show opens the modal dialog',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			modal.value = true
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the modal dialog',
		from: 'open',
		event: 'hide',
		to: 'closed',
		run: async () => {
			modal.value = true
			await reset()
			await fireShow()
			await fireHide()
		},
	},
	{
		name: 'native close bridges to reactive visible',
		from: 'open',
		event: 'nativeclose',
		to: 'closed',
		run: async () => {
			modal.value = true
			await reset()
			await fireShow()
			await fireNativeClose()
		},
	},
	{
		name: 'show non-modal dialog',
		from: 'closed',
		event: 'show',
		to: 'open-nonmodal',
		run: async () => {
			modal.value = false
			await reset()
			// Re-mount with modal=false via the watchEffect rebuild.
			await waitForDelay(150)
			await fireShow()
		},
	},
	{
		name: 'hide non-modal returns to closed',
		from: 'open-nonmodal',
		event: 'hide',
		to: 'closed',
		run: async () => {
			modal.value = false
			await reset()
			await waitForDelay(150)
			await fireShow()
			await fireHide()
		},
	},
] as const

onUnmounted(() => {
	factory.value?.destroy()
})
</script>

<template>
	<StatechartHarness
		title="createDialog"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<dialog ref="dialogRef">
			<header>
				<h3>Demo dialog</h3>
			</header>
			<p>Drive the statechart with the controls below.</p>
			<footer>
				<menu>
					<li>
						<button type="button" class="subtle" @click="factory?.hide()">Close</button>
					</li>
				</menu>
			</footer>
		</dialog>
	</StatechartHarness>
</template>
