<script lang="ts" setup>
/**
 * Theme playground — drives the createTheme statechart from
 * `tests/src/browser/factories/createTheme.test.ts`. States: `'light' |
 * 'dark' | 'system'`. Events: `set-light` / `set-dark` / `set-system` /
 * `toggle`. Observable: `setting.value`, `[data-mode]` on `<html>`,
 * `THEME_EVENTS.change`.
 */
import { computed, onUnmounted, ref, shallowRef, watchEffect } from 'vue'
import { createTheme, resetTheme, THEME_EVENTS } from '@elements/browser'
import type { CreateThemeInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const factory = shallowRef<CreateThemeInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

watchEffect((onCleanup) => {
	const instance = createTheme({ initial: 'system' })
	factory.value = instance
	const onChange = (): void => {
		push({ name: THEME_EVENTS.change, time: performance.now() })
		tick.value += 1
	}
	document.documentElement.addEventListener(THEME_EVENTS.change, onChange)
	onCleanup(() => {
		document.documentElement.removeEventListener(THEME_EVENTS.change, onChange)
		instance.destroy()
		factory.value = null
		// Singleton resources persist beyond per-instance destroy; reset
		// the test-only singleton between scenarios so each run starts
		// from a clean baseline.
		resetTheme()
	})
})

const state = computed(() => {
	void tick.value
	return factory.value?.setting.value ?? 'system'
})

async function reset(): Promise<void> {
	factory.value?.set('system')
	await waitForDelay(200)
}

const scenarios = [
	{
		name: 'set-light from system',
		from: 'system',
		event: 'set-light',
		to: 'light',
		run: async () => {
			await reset()
			factory.value?.set('light')
			await waitForDelay(300)
		},
	},
	{
		name: 'set-dark from system',
		from: 'system',
		event: 'set-dark',
		to: 'dark',
		run: async () => {
			await reset()
			factory.value?.set('dark')
			await waitForDelay(300)
		},
	},
	{
		name: 'toggle light → dark',
		from: 'light',
		event: 'toggle',
		to: 'dark',
		run: async () => {
			factory.value?.set('light')
			await waitForDelay(200)
			factory.value?.toggle()
			await waitForDelay(300)
		},
	},
	{
		name: 'toggle dark → light',
		from: 'dark',
		event: 'toggle',
		to: 'light',
		run: async () => {
			factory.value?.set('dark')
			await waitForDelay(200)
			factory.value?.toggle()
			await waitForDelay(300)
		},
	},
	{
		name: 'set-system removes [data-mode]',
		from: 'dark',
		event: 'set-system',
		to: 'system',
		run: async () => {
			factory.value?.set('dark')
			await waitForDelay(200)
			factory.value?.set('system')
			await waitForDelay(300)
		},
	},
] as const

onUnmounted(() => {
	factory.value?.destroy()
	resetTheme()
})
</script>

<template>
	<StatechartHarness
		title="createTheme"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<output>
			<dl>
				<dt>Setting</dt>
				<dd>
					<code>{{ factory?.setting?.value ?? '…' }}</code>
				</dd>
				<dt>Mode</dt>
				<dd>
					<code>{{ factory?.mode?.value ?? '…' }}</code>
				</dd>
				<dt>data-mode</dt>
				<dd>
					<code>{{ documentMode() }}</code>
				</dd>
			</dl>
		</output>
	</StatechartHarness>
</template>

<script lang="ts">
function documentMode(): string {
	if (typeof document === 'undefined') return ''
	return document.documentElement.getAttribute('data-mode') ?? '(none)'
}
</script>
