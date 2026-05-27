<script lang="ts" setup>
/**
 * Tabs playground — drives the createTabs statechart from
 * `tests/src/browser/factories/createTabs.test.ts` against a live
 * tablist. States: `'inactive' | 'active'` per trigger. Events: `show`
 * / `hide` / `toggle` / `click` / `destroy`. Observable:
 * `[aria-selected]` on trigger, `[hidden]` on pane, `TABS_EVENTS.open`
 * / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createTabs, TABS_EVENTS } from '@elements/browser'
import type { CreateTabsInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const groupRef = useTemplateRef<HTMLDivElement>('groupRef')
const triggerARef = useTemplateRef<HTMLButtonElement>('triggerARef')
const paneARef = useTemplateRef<HTMLDivElement>('paneARef')
const triggerBRef = useTemplateRef<HTMLButtonElement>('triggerBRef')
const paneBRef = useTemplateRef<HTMLDivElement>('paneBRef')

const factoryA = shallowRef<CreateTabsInstance | null>(null)
const factoryB = shallowRef<CreateTabsInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const group = groupRef.value
	const triggerA = triggerARef.value
	const paneA = paneARef.value
	const triggerB = triggerBRef.value
	const paneB = paneBRef.value
	if (!group || !triggerA || !paneA || !triggerB || !paneB) return
	const a = createTabs({ trigger: triggerA, pane: paneA, group })
	const b = createTabs({ trigger: triggerB, pane: paneB, group }, { initial: true })
	factoryA.value = a
	factoryB.value = b
	const log = (name: string) => (): void => {
		push({ name, time: performance.now() })
		tick.value += 1
	}
	const onAOpen = log(`${TABS_EVENTS.open} (A)`)
	const onAClose = log(`${TABS_EVENTS.close} (A)`)
	const onBOpen = log(`${TABS_EVENTS.open} (B)`)
	const onBClose = log(`${TABS_EVENTS.close} (B)`)
	triggerA.addEventListener(TABS_EVENTS.open, onAOpen)
	triggerA.addEventListener(TABS_EVENTS.close, onAClose)
	triggerB.addEventListener(TABS_EVENTS.open, onBOpen)
	triggerB.addEventListener(TABS_EVENTS.close, onBClose)
	cleanup = () => {
		triggerA.removeEventListener(TABS_EVENTS.open, onAOpen)
		triggerA.removeEventListener(TABS_EVENTS.close, onAClose)
		triggerB.removeEventListener(TABS_EVENTS.open, onBOpen)
		triggerB.removeEventListener(TABS_EVENTS.close, onBClose)
		a.destroy()
		b.destroy()
		factoryA.value = null
		factoryB.value = null
	}
})

const state = computed(() => {
	void tick.value
	if (factoryA.value?.active.value === true) return 'A active'
	if (factoryB.value?.active.value === true) return 'B active'
	return 'inactive'
})

async function reset(): Promise<void> {
	factoryB.value?.show()
	await waitForDelay(200)
}

const scenarios = [
	{
		name: 'show A activates A, hides B',
		from: 'B active',
		event: 'show',
		to: 'A active',
		run: async () => {
			await reset()
			factoryA.value?.show()
			await waitForDelay(300)
		},
	},
	{
		name: 'show B activates B, hides A',
		from: 'A active',
		event: 'show',
		to: 'B active',
		run: async () => {
			await reset()
			factoryA.value?.show()
			await waitForDelay(200)
			factoryB.value?.show()
			await waitForDelay(300)
		},
	},
	{
		name: 'click trigger A activates',
		from: 'B active',
		event: 'click',
		to: 'A active',
		run: async () => {
			await reset()
			triggerARef.value?.click()
			await waitForDelay(300)
		},
	},
	{
		name: 'toggle A while inactive activates',
		from: 'B active',
		event: 'toggle',
		to: 'A active',
		run: async () => {
			await reset()
			factoryA.value?.toggle()
			await waitForDelay(300)
		},
	},
] as const

async function demo(): Promise<void> {
	// Leave the widget in its showcase-friendly state so visual
	// reviewers see the entity mid-life instead of reset to baseline.
	factoryA.value?.show()
	await waitForDelay(300)
}

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createTabs"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
		:demo="demo"
	>
		<div ref="groupRef" role="tablist">
			<button ref="triggerARef" type="button" role="tab" aria-controls="playground-tabs-pane-a">
				A
			</button>
			<button
				ref="triggerBRef"
				type="button"
				role="tab"
				aria-controls="playground-tabs-pane-b"
				aria-selected="true"
			>
				B
			</button>
			<div ref="paneARef" id="playground-tabs-pane-a" role="tabpanel">
				<p>Pane A content.</p>
			</div>
			<div ref="paneBRef" id="playground-tabs-pane-b" role="tabpanel">
				<p>Pane B content.</p>
			</div>
		</div>
	</StatechartHarness>
</template>
