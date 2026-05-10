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

// Manual variant — no autoplay timer, no keyboard handler, no touch
// swipe. The composable still manages the index + slide animation, but
// every transition is consumer-driven via `next()` / `prev()` / `to()`.
const minimalRef = ref<HTMLElement | null>(null)
const minimal = useCarousel(minimalRef, {
	keyboard: false,
	touch: false,
	wrap: true,
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
			<section
				ref="carouselRef"
				role="region"
				aria-roledescription="carousel"
				tabindex="0"
				class="carousel"
			>
				<ol role="list">
					<li
						v-for="(s, i) in slides"
						:key="s.title"
						role="listitem"
						:class="[s.variant, { active: i === car.index.value }]"
						:aria-hidden="i === car.index.value ? 'false' : 'true'"
					>
						<h3>{{ s.title }}</h3>
						<p>{{ s.text }}</p>
					</li>
				</ol>

				<!-- Side carets — vertical bars whose ::before paints a circular
				     button + arrow icon. Hidden visually until hover so the slide
				     content stays uncluttered, but still keyboard-reachable. -->
				<button
					type="button"
					class="carousel-control prev"
					aria-label="Previous slide"
					@click="car.prev()"
				></button>
				<button
					type="button"
					class="carousel-control next"
					aria-label="Next slide"
					@click="car.next()"
				></button>

				<!-- Indicator dots at the bottom — one per slide; click jumps
				     directly to that slide. The active dot expands; resting
				     dots are translucent. -->
				<menu class="carousel-indicators" role="tablist">
					<li v-for="(s, i) in slides" :key="`dot-${s.title}`">
						<button
							type="button"
							role="tab"
							:aria-selected="i === car.index.value"
							:aria-label="`Go to slide ${i + 1}: ${s.title}`"
							@click="car.to(i)"
						></button>
					</li>
				</menu>
			</section>
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

		<section id="manual">
			<h2>Manual carousel (no autoplay, no keyboard)</h2>
			<p class="showcase-caption">
				When <code>autoplay</code> is omitted, the timer never starts.
				<code>keyboard: false</code> and <code>touch: false</code> reduce the carousel to plain
				index management — every transition is consumer-driven.
			</p>
			<section
				ref="minimalRef"
				role="region"
				aria-roledescription="carousel"
				tabindex="0"
				class="carousel carousel-compact"
			>
				<ol role="list">
					<li
						v-for="(s, i) in slides.slice(0, 3)"
						:key="s.title"
						role="listitem"
						:class="[s.variant, { active: i === minimal.index.value }]"
					>
						<strong>{{ s.title }}</strong>
					</li>
				</ol>
			</section>
			<div class="showcase-row">
				<button type="button" class="primary outline small" @click="minimal.prev()">prev</button>
				<button type="button" class="primary outline small" @click="minimal.next()">next</button>
				<small>
					slide <code>{{ minimal.index.value + 1 }}/3</code>
				</small>
			</div>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>slide</code> fires before the transition (cancelable). <code>change</code> fires
				after. <code>pause</code> / <code>resume</code> fire only via their named methods.
			</p>
			<section
				ref="logRef"
				role="region"
				aria-roledescription="carousel"
				tabindex="0"
				class="carousel carousel-compact"
			>
				<ol role="list">
					<li
						v-for="(s, i) in slides"
						:key="s.title"
						role="listitem"
						:class="[s.variant, { active: i === logged.index.value }]"
						:aria-hidden="i === logged.index.value ? 'false' : 'true'"
					>
						<strong>{{ s.title }}</strong>
					</li>
				</ol>
			</section>
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
