<script lang="ts" setup>
/**
 * Menu playground — drives the createMenu statechart from
 * `tests/src/browser/factories/createMenu.test.ts` against a live
 * `<button>` + `<menu popover>`. States: `'closed' | 'open'`. Events:
 * `show` / `hide` / `toggleclick` / `itemclick` / `escape` / `outside`
 * / `destroy`. Observable: `:popover-open` on menu, `[aria-expanded]` on
 * toggle, `MENU_EVENTS.open` / `close`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { createMenu, MENU_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateMenuInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const toggleRef = useTemplateRef<HTMLButtonElement>('toggleRef')
const menuRef = useTemplateRef<HTMLMenuElement>('menuRef')
const factory = shallowRef<CreateMenuInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const toggle = toggleRef.value
	const menu = menuRef.value
	if (!toggle || !menu) return
	const instance = createMenu({ toggle, menu })
	factory.value = instance
	const onOpen = (): void => {
		push({ name: MENU_EVENTS.open, time: performance.now() })
		tick.value += 1
	}
	const onClose = (): void => {
		push({ name: MENU_EVENTS.close, time: performance.now() })
		tick.value += 1
	}
	toggle.addEventListener(MENU_EVENTS.open, onOpen)
	toggle.addEventListener(MENU_EVENTS.close, onClose)
	cleanup = () => {
		toggle.removeEventListener(MENU_EVENTS.open, onOpen)
		toggle.removeEventListener(MENU_EVENTS.close, onClose)
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

async function fireToggleClick(): Promise<void> {
	toggleRef.value?.click()
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

async function fireItemClick(): Promise<void> {
	menuRef.value?.querySelector('a')?.click()
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
		name: 'show opens the menu',
		from: 'closed',
		event: 'show',
		to: 'open',
		run: async () => {
			await reset()
			await fireShow()
		},
	},
	{
		name: 'hide closes the menu',
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
		name: 'toggle click opens',
		from: 'closed',
		event: 'toggleclick',
		to: 'open',
		run: async () => {
			await reset()
			await fireToggleClick()
		},
	},
	{
		name: 'item click dismisses (dismiss.inside default)',
		from: 'open',
		event: 'itemclick',
		to: 'closed',
		run: async () => {
			await reset()
			await fireShow()
			await fireItemClick()
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
		title="createMenu"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div>
			<button ref="toggleRef" type="button" class="primary">Open menu</button>
			<menu ref="menuRef" popover>
				<li><a href="#">First</a></li>
				<li><a href="#">Second</a></li>
				<li><a href="#">Third</a></li>
			</menu>
		</div>
	</StatechartHarness>
</template>
