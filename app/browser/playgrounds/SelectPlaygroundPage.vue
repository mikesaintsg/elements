<script lang="ts" setup>
/**
 * Select playground — drives the createSelect statechart from
 * `tests/src/browser/factories/createSelect.test.ts`. Composite states:
 * `'closed-empty' | 'open-empty' | 'closed-single' | 'open-single'`.
 * Events: `show` / `hide` / `select` / `clear` / `destroy`. Observable:
 * `[aria-expanded]`, `[aria-selected]`, `value.value`,
 * `SELECT_EVENTS.select` / `clear`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { createSelect, SELECT_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateSelectInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const toggleRef = useTemplateRef<HTMLButtonElement>('toggleRef')
const menuRef = useTemplateRef<HTMLMenuElement>('menuRef')
const factory = shallowRef<CreateSelectInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

watchEffect((onCleanup) => {
	const toggle = toggleRef.value
	const menu = menuRef.value
	if (!toggle || !menu) return
	const instance = createSelect({ toggle, menu })
	factory.value = instance
	const onSelect = (): void => {
		push({ name: SELECT_EVENTS.select, time: performance.now() })
		tick.value += 1
	}
	const onClear = (): void => {
		push({ name: SELECT_EVENTS.clear, time: performance.now() })
		tick.value += 1
	}
	const onOpen = (): void => {
		push({ name: SELECT_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: SELECT_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	toggle.addEventListener(SELECT_EVENTS.select, onSelect)
	toggle.addEventListener(SELECT_EVENTS.clear, onClear)
	toggle.addEventListener(SELECT_EVENTS.open, onOpen)
	toggle.addEventListener(SELECT_EVENTS.close, onClose)
	onCleanup(() => {
		toggle.removeEventListener(SELECT_EVENTS.select, onSelect)
		toggle.removeEventListener(SELECT_EVENTS.clear, onClear)
		toggle.removeEventListener(SELECT_EVENTS.open, onOpen)
		toggle.removeEventListener(SELECT_EVENTS.close, onClose)
		instance.destroy()
		factory.value = null
	})
})

const state = computed(() => {
	void tick.value
	const open = factory.value?.visible.value === true
	const single = factory.value?.value.value !== null && factory.value?.value.value !== undefined
	if (open && single) return 'open-single'
	if (open) return 'open-empty'
	if (single) return 'closed-single'
	return 'closed-empty'
})

async function reset(): Promise<void> {
	if (factory.value?.visible.value === true) {
		factory.value.hide()
		await waitForDelay(TRANSITION_FALLBACK_MS + 100)
	}
	factory.value?.clear()
	await waitForDelay(200)
}

const scenarios = [
	{
		name: 'show opens the listbox',
		from: 'closed-empty',
		event: 'show',
		to: 'open-empty',
		run: async () => {
			await reset()
			factory.value?.show()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
		},
	},
	{
		name: 'select a value while closed',
		from: 'closed-empty',
		event: 'select',
		to: 'closed-single',
		run: async () => {
			await reset()
			factory.value?.select('apple')
			await waitForDelay(300)
		},
	},
	{
		name: 'clear empties the selection',
		from: 'closed-single',
		event: 'clear',
		to: 'closed-empty',
		run: async () => {
			await reset()
			factory.value?.select('apple')
			await waitForDelay(300)
			factory.value?.clear()
			await waitForDelay(300)
		},
	},
	{
		name: 'select replaces single-mode value',
		from: 'closed-single',
		event: 'select',
		to: 'closed-single',
		run: async () => {
			await reset()
			factory.value?.select('apple')
			await waitForDelay(300)
			factory.value?.select('banana')
			await waitForDelay(300)
		},
	},
	{
		name: 'hide preserves selection',
		from: 'open-single',
		event: 'hide',
		to: 'closed-single',
		run: async () => {
			await reset()
			factory.value?.select('apple')
			factory.value?.show()
			await waitForDelay(TRANSITION_FALLBACK_MS + 100)
			factory.value?.hide()
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
		title="createSelect"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div class="select">
			<button ref="toggleRef" type="button" class="select-toggle">
				<span class="select-value">{{ factory?.value?.value ?? 'Select fruit' }}</span>
			</button>
			<menu ref="menuRef" popover class="select-menu">
				<li>
					<button type="button" data-value="apple">Apple</button>
				</li>
				<li>
					<button type="button" data-value="banana">Banana</button>
				</li>
				<li>
					<button type="button" data-value="cherry">Cherry</button>
				</li>
			</menu>
		</div>
	</StatechartHarness>
</template>
