<script lang="ts" setup>
/**
 * Pointer playground — drives the createPointer statechart from
 * `tests/src/browser/factories/createPointer.test.ts`. States: `'idle'
 * | 'dragging'`. Events: `pointerdown` / `pointerup` / `clear` /
 * `pointerdown-rejected` / `destroy`. Observable: `dragging.value`,
 * `POINTER_EVENTS.start` / `move` / `end`.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createPointer, POINTER_EVENTS } from '@elements/browser'
import type { CreatePointerInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const padRef = useTemplateRef<HTMLDivElement>('padRef')
const factory = shallowRef<CreatePointerInstance | null>(null)
const state = ref<'idle' | 'dragging'>('idle')
const moveCount = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	state.value = factory.value?.dragging.value === true ? 'dragging' : 'idle'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = padRef.value
	if (!element) return
	const instance = createPointer(element, {
		// Reject buttons-less synthetic events so the rejected scenario
		// has a clean veto path.
		accept: (event) => event.button === 0,
	})
	factory.value = instance
	const onStart = (): void => {
		push({ name: POINTER_EVENTS.start, time: performance.now() })
		sync()
	}
	const onMove = (): void => {
		moveCount.value += 1
		// Suppress per-move log spam; only sample first + every 10th.
		if (moveCount.value === 1 || moveCount.value % 10 === 0) {
			push({ name: `${POINTER_EVENTS.move} (#${moveCount.value})`, time: performance.now() })
		}
	}
	const onEnd = (): void => {
		push({ name: POINTER_EVENTS.end, time: performance.now() })
		sync()
	}
	element.addEventListener(POINTER_EVENTS.start, onStart)
	element.addEventListener(POINTER_EVENTS.move, onMove)
	element.addEventListener(POINTER_EVENTS.end, onEnd)
	cleanup = () => {
		element.removeEventListener(POINTER_EVENTS.start, onStart)
		element.removeEventListener(POINTER_EVENTS.move, onMove)
		element.removeEventListener(POINTER_EVENTS.end, onEnd)
		instance.destroy()
		factory.value = null
	}
})

function makePointerEvent(type: string, options: PointerEventInit = {}) {
	return new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerId: 1,
		pointerType: 'mouse',
		button: 0,
		buttons: 1,
		...options,
	})
}

async function reset(): Promise<void> {
	factory.value?.clear()
	moveCount.value = 0
	await waitForDelay(150)
	sync()
}

const scenarios = [
	{
		name: 'pointerdown enters dragging',
		from: 'idle',
		event: 'pointerdown',
		to: 'dragging',
		run: async () => {
			await reset()
			padRef.value?.dispatchEvent(makePointerEvent('pointerdown'))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'pointerup ends drag',
		from: 'dragging',
		event: 'pointerup',
		to: 'idle',
		run: async () => {
			await reset()
			padRef.value?.dispatchEvent(makePointerEvent('pointerdown'))
			await waitForDelay(150)
			padRef.value?.dispatchEvent(makePointerEvent('pointerup'))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'clear() interrupts active capture',
		from: 'dragging',
		event: 'clear',
		to: 'idle',
		run: async () => {
			await reset()
			padRef.value?.dispatchEvent(makePointerEvent('pointerdown'))
			await waitForDelay(150)
			factory.value?.clear()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'rejected pointerdown stays idle',
		from: 'idle',
		event: 'pointerdown-rejected',
		to: 'idle',
		run: async () => {
			await reset()
			// button: 2 (right-click) — accept callback returns false.
			padRef.value?.dispatchEvent(makePointerEvent('pointerdown', { button: 2 }))
			await waitForDelay(200)
			sync()
		},
	},
] as const

async function demo(): Promise<void> {
	// Leave the widget in its showcase-friendly state so visual
	// reviewers see the entity mid-life instead of reset to baseline.
	padRef.value?.dispatchEvent(
		new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
			buttons: 1,
		}),
	)
	await waitForDelay(200)
	sync()
}

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createPointer"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
		:demo="demo"
	>
		<div ref="padRef" class="showcase-pointer-playground-pad" tabindex="0">
			<p>Pointer capture pad</p>
			<small>moves logged: {{ moveCount }}</small>
		</div>
	</StatechartHarness>
</template>

<style scoped>
.showcase-pointer-playground-pad {
	min-block-size: 8rem;
	min-inline-size: 16rem;
	padding: calc(var(--spacing) * 4);
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: calc(var(--spacing) * 2);
	user-select: none;
	cursor: grab;
}
.showcase-pointer-playground-pad:active {
	cursor: grabbing;
	background-color: color-mix(in oklab, var(--color-primary) 15%, var(--color-canvas));
}
</style>
