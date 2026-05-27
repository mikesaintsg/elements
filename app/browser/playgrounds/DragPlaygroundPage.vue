<script lang="ts" setup>
/**
 * Drag playground — drives the createDrag SELECTION sub-machine from
 * `tests/src/browser/factories/createDrag.test.ts`. States:
 * `'empty' | 'single' | 'range'`. Events: `select-1` / `shift-3` /
 * `ctrl-2` / `clear` / `destroy`. The drag/drop sub-machine itself
 * requires real DragEvent + a host browser; the selection regions are
 * fully mouse-driven via the factory's `select()` API.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createDrag, DRAG_EVENTS } from '@elements/browser'
import type { CreateDragInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const listRef = useTemplateRef<HTMLOListElement>('listRef')
const factory = shallowRef<CreateDragInstance | null>(null)
const state = ref<'empty' | 'single' | 'range'>('empty')
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	const size = factory.value?.selected.value.size ?? 0
	state.value = size === 0 ? 'empty' : size === 1 ? 'single' : 'range'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = listRef.value
	if (!element) return
	const instance = createDrag(element, { select: true, source: false, target: false })
	factory.value = instance
	const onSelect = (): void => {
		push({ name: DRAG_EVENTS.select, time: performance.now() })
		sync()
	}
	const onClear = (): void => {
		push({ name: DRAG_EVENTS.clear, time: performance.now() })
		sync()
	}
	element.addEventListener(DRAG_EVENTS.select, onSelect)
	element.addEventListener(DRAG_EVENTS.clear, onClear)
	cleanup = () => {
		element.removeEventListener(DRAG_EVENTS.select, onSelect)
		element.removeEventListener(DRAG_EVENTS.clear, onClear)
		instance.destroy()
		factory.value = null
	}
})

async function reset(): Promise<void> {
	factory.value?.clear()
	await waitForDelay(150)
	sync()
}

const scenarios = [
	{
		name: 'select index 1 from empty',
		from: 'empty',
		event: 'select-1',
		to: 'single',
		run: async () => {
			await reset()
			factory.value?.select(1)
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'shift-select extends single → range',
		from: 'single',
		event: 'shift-3',
		to: 'range',
		run: async () => {
			await reset()
			factory.value?.select(1)
			await waitForDelay(150)
			factory.value?.select(3, new MouseEvent('mousedown', { shiftKey: true }))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'clear empties the selection',
		from: 'range',
		event: 'clear',
		to: 'empty',
		run: async () => {
			await reset()
			factory.value?.select(1)
			factory.value?.select(3, new MouseEvent('mousedown', { shiftKey: true }))
			await waitForDelay(200)
			factory.value?.clear()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'ctrl-click toggles into multi-select range',
		from: 'single',
		event: 'ctrl-2',
		to: 'range',
		run: async () => {
			await reset()
			factory.value?.select(1)
			await waitForDelay(150)
			factory.value?.select(2, new MouseEvent('mousedown', { ctrlKey: true }))
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
		title="createDrag"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<ol ref="listRef" role="list" class="showcase-drag-playground-list">
			<li data-index="0">Item one</li>
			<li data-index="1">Item two</li>
			<li data-index="2">Item three</li>
			<li data-index="3">Item four</li>
		</ol>
	</StatechartHarness>
</template>

<style scoped>
.showcase-drag-playground-list {
	display: flex;
	flex-direction: column;
	gap: calc(var(--spacing) * 1);
	padding: 0;
	margin: 0;
	list-style: none;
}
.showcase-drag-playground-list > li {
	padding: calc(var(--spacing) * 2) calc(var(--spacing) * 3);
	border-radius: var(--radius-md);
	background-color: color-mix(in oklab, var(--color-canvas) 92%, var(--color-text));
}
.showcase-drag-playground-list > li.selected {
	background-color: color-mix(in oklab, var(--color-primary) 25%, var(--color-canvas));
}
</style>
