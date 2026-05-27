<script lang="ts" setup>
/**
 * Tooltip playground — drives the createTooltip statechart from
 * `tests/src/browser/factories/createTooltip.test.ts` against a live
 * anchor + panel. States: `'closed' | 'open'`. Events: `show` / `hide`
 * / `mouseenter` / `mouseleave` / `focusin` / `focusout` / `escape` /
 * `destroy`. Observable: `:popover-open`, `TOOLTIP_EVENTS.open` /
 * `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { createTooltip, TOOLTIP_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateTooltipInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const anchorRef = useTemplateRef<HTMLButtonElement>('anchorRef')
const panelRef = useTemplateRef<HTMLDivElement>('panelRef')
const factory = shallowRef<CreateTooltipInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

watchEffect((onCleanup) => {
	const anchor = anchorRef.value
	const panel = panelRef.value
	if (!anchor || !panel) return
	const instance = createTooltip({ anchor, panel })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: TOOLTIP_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: TOOLTIP_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	anchor.addEventListener(TOOLTIP_EVENTS.open, onOpen)
	anchor.addEventListener(TOOLTIP_EVENTS.close, onClose)
	onCleanup(() => {
		anchor.removeEventListener(TOOLTIP_EVENTS.open, onOpen)
		anchor.removeEventListener(TOOLTIP_EVENTS.close, onClose)
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

async function fireShow(): Promise<void> {
	factory.value?.show()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireHide(): Promise<void> {
	factory.value?.hide()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fire(target: HTMLElement, name: string): Promise<void> {
	target.dispatchEvent(new Event(name))
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

const scenarios = [
	{
		name: 'show opens the tooltip',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the tooltip',
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
		name: 'hover anchor opens',
		from: 'closed',
		event: 'mouseenter',
		to: 'open',
		run: async () => {
			await reset()
			if (anchorRef.value) await fire(anchorRef.value, 'mouseenter')
		},
	},
	{
		name: 'mouseleave anchor closes',
		from: 'open',
		event: 'mouseleave',
		to: 'closed',
		run: async () => {
			await reset()
			if (anchorRef.value) {
				await fire(anchorRef.value, 'mouseenter')
				await fire(anchorRef.value, 'mouseleave')
			}
		},
	},
	{
		name: 'focus anchor opens',
		from: 'closed',
		event: 'focusin',
		to: 'open',
		run: async () => {
			await reset()
			if (anchorRef.value) await fire(anchorRef.value, 'focusin')
		},
	},
	{
		name: 'blur anchor closes',
		from: 'open',
		event: 'focusout',
		to: 'closed',
		run: async () => {
			await reset()
			if (anchorRef.value) {
				await fire(anchorRef.value, 'focusin')
				await fire(anchorRef.value, 'focusout')
			}
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
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
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
		title="createTooltip"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div>
			<button ref="anchorRef" type="button" class="primary">Hover or focus me</button>
			<div ref="panelRef" popover role="tooltip">
				<p>Tooltip body.</p>
			</div>
		</div>
	</StatechartHarness>
</template>
