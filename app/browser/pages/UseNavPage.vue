<script lang="ts" setup>
import { ref } from 'vue'
import { useNav } from '@src/browser'

const scrollerRef = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)
const log = ref<{ at: string; id: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()

const nav = useNav(scrollerRef, {
	nav: navRef,
	intersection: { offset: 16 },
	on: {
		activate: (event) => {
			log.value.unshift({ at: stamp(), id: event.detail.id })
			if (log.value.length > 20) log.value.length = 20
		},
	},
})

const sections = [
	{ id: 'intro', title: 'Introduction' },
	{ id: 'install', title: 'Installation' },
	{ id: 'config', title: 'Configuration' },
	{ id: 'examples', title: 'Examples' },
	{ id: 'faq', title: 'FAQ' },
] as const

const scrollTo = (id: string): void => {
	scrollerRef.value?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
	<section>
		<header>
			<h1>useNav</h1>
			<p>
				<code>IntersectionObserver</code>-driven scroll spy. Watches <code>[id]</code> sections in
				the bound scroller; the matching <code>&lt;a href="#id"&gt;</code> in the
				<code>&lt;nav&gt;</code> gets <code>aria-current="location"</code>.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useNav(containerRef, { nav?, intersection?, on? }): { active, refresh() }</code></pre>
		</section>

		<section id="basic">
			<h2>Scroll spy</h2>
			<p class="showcase-caption">
				Scroll the container; the active link in the nav updates as each section enters view. Active
				id: <code>{{ nav.active.value ?? '—' }}</code
				>.
			</p>
			<div class="showcase-grid">
				<nav ref="navRef">
					<ul>
						<li v-for="s in sections" :key="s.id">
							<a :href="`#${s.id}`" @click.prevent="scrollTo(s.id)">{{ s.title }}</a>
						</li>
					</ul>
				</nav>
				<div
					ref="scrollerRef"
					style="
						max-block-size: 18rem;
						overflow-y: auto;
						border: 1px solid var(--color-border, #ddd);
						padding: 1rem;
					"
				>
					<section v-for="s in sections" :id="s.id" :key="s.id">
						<h3>{{ s.title }}</h3>
						<p v-for="i in 5" :key="i">Lorem ipsum paragraph {{ i }} for {{ s.title }}.</p>
					</section>
				</div>
			</div>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>activate</code> fires when a new section becomes the active candidate. The detail
				carries the section <code>id</code>.
			</p>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet — scroll the panel above.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i"><code>activate</code> {{ e.id }} — {{ e.at }}</li>
			</ul>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Option</th>
						<th>Type</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>nav</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>Optional <code>&lt;nav&gt;</code> with the link list.</td>
					</tr>
					<tr>
						<td><code>intersection.offset</code></td>
						<td><code>number</code></td>
						<td>Pixels above the section before activation (default 0).</td>
					</tr>
					<tr>
						<td><code>intersection.threshold</code></td>
						<td><code>number | number[]</code></td>
						<td>Forwarded to <code>IntersectionObserver</code>.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:nav:activate</code></td>
						<td><code>{ id }</code></td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
