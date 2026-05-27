<script lang="ts" setup>
/**
 * Drop playground — drives the createDrop statechart from
 * `tests/src/browser/factories/createDrop.test.ts`. States: `'idle' |
 * 'over'`. Events: `dragenter` / `dragleave` / `drop` /
 * `dragenter-rejected` / `destroy`. Observable: `over.value`,
 * `DROP_EVENTS.enter` / `leave` / `drop`. Scenarios dispatch real
 * `DragEvent`s on the host (the factory inspects `event.dataTransfer`
 * to gate accept/reject).
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createDrop, DROP_EVENTS } from '@elements/browser'
import type { CreateDropInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const zoneRef = useTemplateRef<HTMLDivElement>('zoneRef')
const factory = shallowRef<CreateDropInstance | null>(null)
const state = ref<'idle' | 'over'>('idle')
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	state.value = factory.value?.over.value === true ? 'over' : 'idle'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = zoneRef.value
	if (!element) return
	const instance = createDrop(element, { accept: ['text/plain'] })
	factory.value = instance
	const onEnter = (): void => {
		push({ name: DROP_EVENTS.enter, time: performance.now() })
		sync()
	}
	const onLeave = (): void => {
		push({ name: DROP_EVENTS.leave, time: performance.now() })
		sync()
	}
	const onDrop = (): void => {
		push({ name: DROP_EVENTS.drop, time: performance.now() })
		sync()
	}
	element.addEventListener(DROP_EVENTS.enter, onEnter)
	element.addEventListener(DROP_EVENTS.leave, onLeave)
	element.addEventListener(DROP_EVENTS.drop, onDrop)
	cleanup = () => {
		element.removeEventListener(DROP_EVENTS.enter, onEnter)
		element.removeEventListener(DROP_EVENTS.leave, onLeave)
		element.removeEventListener(DROP_EVENTS.drop, onDrop)
		instance.destroy()
		factory.value = null
	}
})

function makeDragEvent(type: 'dragenter' | 'dragleave' | 'drop', payload: string | null) {
	const transfer = new DataTransfer()
	if (payload !== null) transfer.setData('text/plain', payload)
	const event = new DragEvent(type, {
		bubbles: true,
		cancelable: true,
		dataTransfer: transfer,
	})
	return event
}

async function reset(): Promise<void> {
	const zone = zoneRef.value
	if (!zone) return
	// Synthetic dragleave with relatedTarget outside the zone so the
	// factory's "still inside?" check returns false and `over` clears.
	const event = makeDragEvent('dragleave', null)
	Object.defineProperty(event, 'relatedTarget', { value: document.body })
	zone.dispatchEvent(event)
	await waitForDelay(150)
	sync()
}

const scenarios = [
	{
		name: 'dragenter with accepted payload → over',
		from: 'idle',
		event: 'dragenter',
		to: 'over',
		run: async () => {
			await reset()
			zoneRef.value?.dispatchEvent(makeDragEvent('dragenter', 'hello'))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'dragleave returns to idle',
		from: 'over',
		event: 'dragleave',
		to: 'idle',
		run: async () => {
			await reset()
			zoneRef.value?.dispatchEvent(makeDragEvent('dragenter', 'hello'))
			await waitForDelay(150)
			await reset()
		},
	},
	{
		name: 'drop returns to idle',
		from: 'over',
		event: 'drop',
		to: 'idle',
		run: async () => {
			await reset()
			zoneRef.value?.dispatchEvent(makeDragEvent('dragenter', 'hello'))
			await waitForDelay(150)
			zoneRef.value?.dispatchEvent(makeDragEvent('drop', 'hello'))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'dragenter with rejected payload stays idle',
		from: 'idle',
		event: 'dragenter-rejected',
		to: 'idle',
		run: async () => {
			await reset()
			const transfer = new DataTransfer()
			transfer.setData('image/png', 'binary')
			const event = new DragEvent('dragenter', {
				bubbles: true,
				cancelable: true,
				dataTransfer: transfer,
			})
			zoneRef.value?.dispatchEvent(event)
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
		title="createDrop"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div ref="zoneRef" class="showcase-drop-playground-zone">
			<p>Drop zone — accepts <code>text/plain</code>.</p>
			<p v-if="state === 'over'">Pointer is over the zone.</p>
		</div>
	</StatechartHarness>
</template>

<style scoped>
.showcase-drop-playground-zone {
	min-block-size: 8rem;
	padding: calc(var(--spacing) * 4);
	border: 2px dashed var(--set-border-color);
	border-radius: var(--radius-md);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: calc(var(--spacing) * 2);
}
</style>
