<script lang="ts" setup>
import { ref } from 'vue'
import { useCarousel } from '@src/browser'

interface Slide {
	readonly title: string
	readonly text: string
	readonly variant: string
}

const slides: readonly Slide[] = [
	{ title: 'Onboarding', text: 'Walk new users through the basics.', variant: 'primary' },
	{ title: 'Conversion', text: 'Drive sign-ups with focused content.', variant: 'success' },
	{ title: 'Retention', text: 'Keep your audience engaged over time.', variant: 'warning' },
	{ title: 'Insights', text: 'Surface analytics that drive decisions.', variant: 'information' },
]

const carouselRef = ref<HTMLElement | null>(null)
const car = useCarousel(carouselRef, {
	autoplay: { interval: 4000, pause: 'hover', ride: 'mount' },
	keyboard: true,
	touch: true,
	wrap: true,
})

const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const logRef = ref<HTMLElement | null>(null)
const logged = useCarousel(logRef, {
	autoplay: { interval: 5000, pause: 'hover', ride: false },
	wrap: true,
	on: {
		slide: () => log.value.unshift({ at: stamp(), kind: 'slide' }),
		change: () => log.value.unshift({ at: stamp(), kind: 'change' }),
		pause: () => log.value.unshift({ at: stamp(), kind: 'pause' }),
		resume: () => log.value.unshift({ at: stamp(), kind: 'resume' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useCarousel</h1>
			<p>
				Slide-deck composable with autoplay, hover-pause, keyboard arrows, and touch swipe. Owns
				indices, the timer, and per-slide active class — renders no DOM.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useCarousel(elementRef, options?): { index, cycling, next(), prev(), to(i), start(), stop(), pause(), resume() }</code></pre>
		</section>

		<section id="autoplay">
			<h2>Auto-cycling carousel</h2>
			<p class="showcase-caption">
				Hover to pause, leave to resume. Arrow keys (when focused) and touch swipes also navigate.
			</p>
			<div
				ref="carouselRef"
				class="carousel"
				tabindex="0"
				style="border: 1px solid var(--color-border, #ddd); border-radius: 0.5rem; overflow: hidden"
			>
				<div class="carousel-inner" style="block-size: 12rem">
					<article
						v-for="(s, i) in slides"
						:key="s.title"
						class="carousel-item"
						:class="[s.variant, { active: i === car.index.value }]"
						:style="{
							display: i === car.index.value ? 'flex' : 'none',
							alignItems: 'center',
							justifyContent: 'center',
							blockSize: '100%',
							padding: '2rem',
						}"
					>
						<div>
							<h3>{{ s.title }}</h3>
							<p>{{ s.text }}</p>
						</div>
					</article>
				</div>
			</div>
			<div class="showcase-row">
				<button type="button" class="primary outline small" @click="car.prev()">prev</button>
				<button type="button" class="primary outline small" @click="car.next()">next</button>
				<button type="button" class="success outline small" @click="car.start()">start()</button>
				<button type="button" class="warning outline small" @click="car.stop()">stop()</button>
				<small>
					slide <code>{{ car.index.value + 1 }}/{{ slides.length }}</code> ·
					<code>{{ car.cycling.value ? 'cycling' : 'paused' }}</code>
				</small>
			</div>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>slide</code> fires before the transition (cancelable). <code>change</code> fires
				after. <code>pause</code> / <code>resume</code> fire only via their named methods.
			</p>
			<div
				ref="logRef"
				class="carousel"
				tabindex="0"
				style="border: 1px solid var(--color-border, #ddd); border-radius: 0.5rem; overflow: hidden"
			>
				<div class="carousel-inner" style="block-size: 8rem">
					<article
						v-for="(s, i) in slides"
						:key="s.title"
						class="carousel-item"
						:class="[s.variant, { active: i === logged.index.value }]"
						:style="{
							display: i === logged.index.value ? 'flex' : 'none',
							alignItems: 'center',
							justifyContent: 'center',
							blockSize: '100%',
						}"
					>
						<strong>{{ s.title }}</strong>
					</article>
				</div>
			</div>
			<div class="showcase-row">
				<button type="button" class="small" @click="logged.prev()">prev()</button>
				<button type="button" class="small" @click="logged.next()">next()</button>
				<button type="button" class="small" @click="logged.pause()">pause()</button>
				<button type="button" class="small" @click="logged.resume()">resume()</button>
				<button type="button" class="ghost small" @click="log = []">clear</button>
			</div>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> — {{ e.at }}
				</li>
			</ul>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Option</th>
						<th>Type</th>
						<th>Default</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>autoplay.interval</code></td>
						<td><code>number</code></td>
						<td><code>5000</code></td>
					</tr>
					<tr>
						<td><code>autoplay.pause</code></td>
						<td><code>'hover' | false</code></td>
						<td><code>'hover'</code></td>
					</tr>
					<tr>
						<td><code>autoplay.ride</code></td>
						<td><code>'mount' | 'interaction' | false</code></td>
						<td><code>false</code></td>
					</tr>
					<tr>
						<td><code>keyboard</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>wrap</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>touch</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Cancelable</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:carousel:slide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:carousel:change</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:carousel:pause</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:carousel:resume</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
