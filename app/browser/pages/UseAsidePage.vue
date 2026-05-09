<script lang="ts" setup>
import { ref } from 'vue'
import { useAside } from '@src/browser'

const startRef = ref<HTMLElement | null>(null)
const start = useAside(startRef)

const endRef = ref<HTMLElement | null>(null)
const end = useAside(endRef)

const staticRef = ref<HTMLElement | null>(null)
const blocks = ref(0)
const staticAside = useAside(staticRef, {
	dismiss: { backdrop: 'static' },
	on: {
		prevent: () => {
			blocks.value++
		},
	},
})

const eventRef = ref<HTMLElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const eventAside = useAside(eventRef, {
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useAside</h1>
			<p>
				Off-canvas panel adapter. Bound to <code>&lt;aside popover="manual"&gt;</code>; owns the
				slide transition, body scroll lock, Escape dismiss, and outside-click dismissal.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useAside(elementRef, options?): { visible, show(), hide(), toggle() }</code></pre>
		</section>

		<section id="basic">
			<h2>Slide-in panel</h2>
			<p class="showcase-caption">Click outside or press <kbd>Esc</kbd> to dismiss.</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="start.show()">Open from start</button>
				<button type="button" class="primary" @click="end.show()">Open from end</button>
			</div>
			<aside ref="startRef" popover="manual" class="start">
				<header><h3>Start panel</h3></header>
				<p>Slides in from the inline-start edge. Press <kbd>Esc</kbd> to close.</p>
				<button type="button" @click="start.hide()">Close</button>
			</aside>
			<aside ref="endRef" popover="manual" class="end">
				<header><h3>End panel</h3></header>
				<p>Slides in from the inline-end edge.</p>
				<button type="button" @click="end.hide()">Close</button>
			</aside>
		</section>

		<section id="static">
			<h2>Static backdrop</h2>
			<p class="showcase-caption">
				<code>dismiss.backdrop: 'static'</code> swallows backdrop clicks and emits
				<code>prevent</code> instead.
			</p>
			<div class="showcase-row">
				<button type="button" class="warning" @click="staticAside.show()">Open static</button>
				<small>{{ blocks }} block{{ blocks !== 1 ? 's' : '' }}</small>
			</div>
			<aside ref="staticRef" popover="manual">
				<header><h3>Static aside</h3></header>
				<p>Click the backdrop — the counter increments instead of dismissing.</p>
				<button type="button" @click="staticAside.hide()">Close</button>
			</aside>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<button type="button" @click="eventAside.show()">Open me</button>
			<aside ref="eventRef" popover="manual">
				<header><h3>Watching transitions</h3></header>
				<p>Open and close to watch the event sequence.</p>
				<button type="button" @click="eventAside.hide()">Close</button>
			</aside>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
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
						<td><code>dismiss.backdrop</code></td>
						<td><code>boolean | 'static'</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>dismiss.escape</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>scroll.lock</code></td>
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
						<td><code>elements:aside:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:aside:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:aside:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:aside:close</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:aside:prevent</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
