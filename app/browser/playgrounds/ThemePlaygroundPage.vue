<script lang="ts" setup>
/**
 * Theme playground — drives the createTheme statechart from
 * `tests/src/browser/factories/createTheme.test.ts`. States: `'light' |
 * 'dark' | 'system'`. Events: `set-light` / `set-dark` / `set-system` /
 * `toggle`. Observable: `setting.value`, `[data-mode]` on `<html>`,
 * `THEME_EVENTS.{light,dark,system,name}` (post breaking change — the
 * old `change` verb was retired per AGENTS.md §14).
 */
import { computed, onUnmounted, ref, shallowRef, onMounted } from 'vue'
import { createTheme, resetTheme, THEME_EVENTS } from '@elements/browser'
import type { CreateThemeInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const factory = shallowRef<CreateThemeInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const instance = createTheme({ initial: 'system' })
	factory.value = instance
	const root = document.documentElement
	const log = (name: string) => (): void => {
		push({ name, time: performance.now() })
		tick.value += 1
	}
	const handlers: Array<[string, () => void]> = [
		[THEME_EVENTS.light, log(THEME_EVENTS.light)],
		[THEME_EVENTS.dark, log(THEME_EVENTS.dark)],
		[THEME_EVENTS.system, log(THEME_EVENTS.system)],
		[THEME_EVENTS.name, log(THEME_EVENTS.name)],
	]
	for (const [name, handler] of handlers) root.addEventListener(name, handler)
	cleanup = () => {
		for (const [name, handler] of handlers) root.removeEventListener(name, handler)
		instance.destroy()
		factory.value = null
		// Singleton resources persist beyond per-instance destroy; reset
		// the test-only singleton between scenarios so each run starts
		// from a clean baseline.
		resetTheme()
	}
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
	cleanup?.()
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
	</StatechartHarness>
</template>

<script lang="ts">
function documentMode(): string {
	if (typeof document === 'undefined') return ''
	return document.documentElement.getAttribute('data-mode') ?? '(none)'
}
</script>
