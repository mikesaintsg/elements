<script lang="ts" setup>
import { ref } from 'vue'
import { useAside } from '@src/browser'

const startRef = ref<HTMLElement | null>(null)
const start = useAside(startRef)

const endRef = ref<HTMLElement | null>(null)
const end = useAside(endRef)

const topRef = ref<HTMLElement | null>(null)
const top = useAside(topRef)

const bottomRef = ref<HTMLElement | null>(null)
const bottom = useAside(bottomRef)

const noLockRef = ref<HTMLElement | null>(null)
const noLock = useAside(noLockRef, { scroll: { lock: false } })

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

		<section id="placements">
			<h2>All four placements</h2>
			<p class="showcase-caption">
				The <code>.start</code>, <code>.end</code>, <code>.top</code>, and
				<code>.bottom</code> modifier classes pin the drawer to the corresponding viewport edge.
				Side drawers default to <code>min(21.875rem, 100dvw)</code> wide and full viewport height;
				top / bottom drawers stretch the full viewport width and use a <code>30dvh</code> band.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="start.show()">Start</button>
				<button type="button" class="primary" @click="end.show()">End</button>
				<button type="button" class="primary" @click="top.show()">Top</button>
				<button type="button" class="primary" @click="bottom.show()">Bottom</button>
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
			<aside ref="topRef" popover="manual" class="top">
				<header><h3>Top panel</h3></header>
				<p>Slides down from the top edge — handy for site-wide announcement bars.</p>
				<button type="button" @click="top.hide()">Close</button>
			</aside>
			<aside ref="bottomRef" popover="manual" class="bottom">
				<header><h3>Bottom panel</h3></header>
				<p>Slides up from the bottom edge — common for mobile filter sheets.</p>
				<button type="button" @click="bottom.hide()">Close</button>
			</aside>
		</section>

		<section id="scroll-lock">
			<h2>Body scroll lock</h2>
			<p class="showcase-caption">
				By default <code>useAside</code> locks body scroll while the drawer is open. Pass
				<code>scroll: { lock: false }</code> to disable — useful for non-modal drawers that
				shouldn't trap the viewport.
			</p>
			<div class="showcase-row">
				<button type="button" @click="noLock.show()">Open without scroll lock</button>
			</div>
			<aside ref="noLockRef" popover="manual" class="end">
				<header><h3>Scroll-friendly drawer</h3></header>
				<p>Try scrolling the page while this drawer is open — the body still moves.</p>
				<button type="button" @click="noLock.hide()">Close</button>
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
			<aside ref="staticRef" popover="manual" class="end">
				<header><h3>Static aside</h3></header>
				<p>Click the backdrop — the counter increments instead of dismissing.</p>
				<button type="button" @click="staticAside.hide()">Close</button>
			</aside>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<button type="button" @click="eventAside.show()">Open me</button>
			<aside ref="eventRef" popover="manual" class="end">
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
