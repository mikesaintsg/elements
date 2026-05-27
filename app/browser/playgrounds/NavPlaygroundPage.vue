<script lang="ts" setup>
/**
 * Nav playground — drives the createNav scrollspy state. `active`
 * mirrors which target id is currently in the IntersectionObserver
 * intersection. The unit tests cover the IntersectionObserver glue;
 * this playground drives the visible "active section" state via DOM
 * scroll + the factory's `refresh()` so the reactive `active.value`
 * + `NAV_EVENTS.activate` event surface are observable.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createNav, NAV_EVENTS } from '@elements/browser'
import type { CreateNavInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const navRef = useTemplateRef<HTMLElement>('navRef')
const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef')
const factory = shallowRef<CreateNavInstance | null>(null)
const state = ref<string>('none')
const { entries: events, push } = useLog<{ name: string; time: number }>(12)

function sync(): void {
	state.value = factory.value?.active.value ?? 'none'
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const nav = navRef.value
	const scroll = scrollRef.value
	if (!nav || !scroll) return
	const instance = createNav({ nav, container: scroll })
	factory.value = instance
	const onActivate = (event: Event): void => {
		if (event instanceof CustomEvent) {
			const id = typeof event.detail?.id === 'string' ? event.detail.id : ''
			push({ name: `${NAV_EVENTS.activate} (${id})`, time: performance.now() })
		}
		sync()
	}
	nav.addEventListener(NAV_EVENTS.activate, onActivate)
	cleanup = () => {
		nav.removeEventListener(NAV_EVENTS.activate, onActivate)
		instance.destroy()
		factory.value = null
	}
})

async function reset(): Promise<void> {
	const scroll = scrollRef.value
	if (scroll) {
		scroll.scrollTop = 0
		await waitForDelay(150)
	}
	factory.value?.refresh()
	await waitForDelay(150)
	sync()
}

async function scrollToSection(id: string): Promise<void> {
	const scroll = scrollRef.value
	const target = document.getElementById(id)
	if (!scroll || !target) return
	const top = target.offsetTop - scroll.offsetTop
	scroll.scrollTop = top
	// IntersectionObserver fires asynchronously; the framework's
	// rIO-based scrollspy needs a couple of animation frames to settle.
	await waitForDelay(400)
	sync()
}

const scenarios = [
	{
		name: 'scroll into section A activates A',
		from: 'none',
		event: 'scroll',
		to: 'section-a',
		run: async () => {
			await reset()
			await scrollToSection('section-a')
		},
	},
	{
		name: 'scroll into section B activates B',
		from: 'section-a',
		event: 'scroll',
		to: 'section-b',
		run: async () => {
			await reset()
			await scrollToSection('section-a')
			await scrollToSection('section-b')
		},
	},
	{
		name: 'scroll into section C activates C',
		from: 'section-b',
		event: 'scroll',
		to: 'section-c',
		run: async () => {
			await reset()
			await scrollToSection('section-b')
			await scrollToSection('section-c')
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createNav"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<div>
			<nav ref="navRef" aria-label="Section nav">
				<menu>
					<li><a href="#section-a">Section A</a></li>
					<li><a href="#section-b">Section B</a></li>
					<li><a href="#section-c">Section C</a></li>
				</menu>
			</nav>
			<div ref="scrollRef" class="showcase-nav-playground-scroll">
				<section id="section-a">
					<h3>Section A</h3>
					<p>First section content. Scroll the panel to advance.</p>
				</section>
				<section id="section-b">
					<h3>Section B</h3>
					<p>Second section.</p>
				</section>
				<section id="section-c">
					<h3>Section C</h3>
					<p>Third and final section.</p>
				</section>
			</div>
		</div>
	</StatechartHarness>
</template>

<style scoped>
.showcase-nav-playground-scroll {
	max-block-size: 14rem;
	overflow-y: auto;
	border: 1px solid var(--set-border-color);
	border-radius: var(--radius-md);
	padding: calc(var(--spacing) * 2);
}
.showcase-nav-playground-scroll > section {
	min-block-size: 16rem;
}
</style>
