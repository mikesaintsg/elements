<script lang="ts" setup>
/**
 * Popover playground — drives the createPopover statechart from
 * `tests/src/browser/factories/createPopover.test.ts` against a live
 * anchor + panel. States: `'closed' | 'open'`. Events: `show` / `hide`
 * / `toggle` / `escape` / `outside` / `hoverin` / `hoverout` /
 * `destroy`. Observable: `:popover-open` on panel, `[aria-expanded]` on
 * anchor, `POPOVER_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createPopover, POPOVER_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreatePopoverInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const anchorRef = useTemplateRef<HTMLButtonElement>('anchorRef')
const panelRef = useTemplateRef<HTMLDivElement>('panelRef')
const factory = shallowRef<CreatePopoverInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const anchor = anchorRef.value
	const panel = panelRef.value
	if (!anchor || !panel) return
	const instance = createPopover({ anchor, panel })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: POPOVER_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: POPOVER_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	anchor.addEventListener(POPOVER_EVENTS.open, onOpen)
	anchor.addEventListener(POPOVER_EVENTS.close, onClose)
	cleanup = () => {
		anchor.removeEventListener(POPOVER_EVENTS.open, onOpen)
		anchor.removeEventListener(POPOVER_EVENTS.close, onClose)
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

async function fireToggle(): Promise<void> {
	factory.value?.toggle()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireEscape(): Promise<void> {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireOutside(): Promise<void> {
	document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

const scenarios = [
	{
		name: 'show opens the popover',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the popover',
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
		name: 'toggle closes from open',
		from: 'open',
		event: 'toggle',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireToggle()
		},
	},
	{
		name: 'escape dismisses',
		from: 'open',
		event: 'escape',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireEscape()
		},
	},
	{
		name: 'outside pointerdown dismisses',
		from: 'open',
		event: 'outside',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireOutside()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createPopover"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div>
			<button ref="anchorRef" type="button" class="primary">Open popover</button>
			<div ref="panelRef" popover>
				<p>Popover panel content.</p>
			</div>
		</div>
	</StatechartHarness>
</template>
