<script lang="ts" setup>
/**
 * Carousel playground — drives the createCarousel statechart from
 * `tests/src/browser/factories/createCarousel.test.ts`. Two orthogonal
 * regions: slide position (`first` / `middle` / `last`) and autoplay
 * (`cycling` / `paused`). Observable: `index.value`, `cycling.value`,
 * `.active` class flip on items, `CAROUSEL_EVENTS.slide` / `change` /
 * `pause` / `resume`.
 */
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, onMounted } from 'vue'
import { CAROUSEL_EVENTS, createCarousel, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { CreateCarouselInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const carouselRef = useTemplateRef<HTMLElement>('carouselRef')
const factory = shallowRef<CreateCarouselInstance | null>(null)
const tick = ref(0)
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = carouselRef.value
	if (!element) return
	const instance = createCarousel(element, { autoplay: { interval: 2000 } })
	factory.value = instance
	const log = (name: string) => (): void => {
		push({ name, time: performance.now() })
		tick.value += 1
	}
	const onSlide = log(CAROUSEL_EVENTS.slide)
	const onChange = log(CAROUSEL_EVENTS.change)
	const onPause = log(CAROUSEL_EVENTS.pause)
	const onResume = log(CAROUSEL_EVENTS.resume)
	element.addEventListener(CAROUSEL_EVENTS.slide, onSlide)
	element.addEventListener(CAROUSEL_EVENTS.change, onChange)
	element.addEventListener(CAROUSEL_EVENTS.pause, onPause)
	element.addEventListener(CAROUSEL_EVENTS.resume, onResume)
	cleanup = () => {
		element.removeEventListener(CAROUSEL_EVENTS.slide, onSlide)
		element.removeEventListener(CAROUSEL_EVENTS.change, onChange)
		element.removeEventListener(CAROUSEL_EVENTS.pause, onPause)
		element.removeEventListener(CAROUSEL_EVENTS.resume, onResume)
		instance.destroy()
		factory.value = null
	}
})

const state = computed(() => {
	void tick.value
	const index = factory.value?.index.value ?? 0
	const cycling = factory.value?.cycling.value === true
	const position = index === 0 ? 'first' : index === 2 ? 'last' : 'middle'
	return cycling ? `${position} · cycling` : position
})

async function reset(): Promise<void> {
	factory.value?.stop()
	factory.value?.to(0)
	await waitForDelay(TRANSITION_FALLBACK_MS + 100)
}

const scenarios = [
	{
		name: 'next moves first → middle',
		from: 'first',
		event: 'next',
		to: 'middle',
		run: async () => {
			await reset()
			factory.value?.next()
			await waitForDelay(TRANSITION_FALLBACK_MS + 200)
		},
	},
	{
		name: 'prev wraps first → last',
		from: 'first',
		event: 'prev',
		to: 'last',
		run: async () => {
			await reset()
			factory.value?.prev()
			await waitForDelay(TRANSITION_FALLBACK_MS + 200)
		},
	},
	{
		name: 'next wraps last → first',
		from: 'last',
		event: 'next',
		to: 'first',
		run: async () => {
			await reset()
			factory.value?.to(2)
			await waitForDelay(TRANSITION_FALLBACK_MS + 200)
			factory.value?.next()
			await waitForDelay(TRANSITION_FALLBACK_MS + 200)
		},
	},
	{
		name: 'start enters cycling',
		from: 'first',
		event: 'start',
		to: 'first · cycling',
		run: async () => {
			await reset()
			factory.value?.start()
			await waitForDelay(300)
		},
	},
	{
		name: 'stop exits cycling',
		from: 'first · cycling',
		event: 'stop',
		to: 'first',
		run: async () => {
			await reset()
			factory.value?.start()
			await waitForDelay(300)
			factory.value?.stop()
			await waitForDelay(300)
		},
	},
] as const

async function demo(): Promise<void> {
	// Leave the widget in its showcase-friendly state so visual
	// reviewers see the entity mid-life instead of reset to baseline.
	factory.value?.start()
	await waitForDelay(300)
}

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createCarousel"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
		:demo="demo"
	>
		<section
			ref="carouselRef"
			class="carousel showcase-carousel-playground"
			role="region"
			aria-roledescription="carousel"
			tabindex="0"
		>
			<ol role="list">
				<li role="listitem" class="active primary">Slide one</li>
				<li role="listitem" class="success">Slide two</li>
				<li role="listitem" class="warning">Slide three</li>
			</ol>
		</section>
	</StatechartHarness>
</template>

<style scoped>
/* The framework's `.carousel` rule sizes by `block-size` but doesn't
 * pin `inline-size`; inside the harness's flex stage the container
 * would otherwise collapse to the absolutely-positioned items' 0-width
 * intrinsic size. Pin a sensible playground width so the slide actually
 * fills the visible track. */
.showcase-carousel-playground {
	inline-size: min(28rem, 100%);
}
</style>
