<script lang="ts" setup>
import { ref } from 'vue'
import { useDetails } from '@src/browser'

const panelRef = ref<HTMLDetailsElement | null>(null)
const panel = useDetails(panelRef)

const accordionRef = ref<HTMLElement | null>(null)
const aRef = ref<HTMLDetailsElement | null>(null)
const bRef = ref<HTMLDetailsElement | null>(null)
const cRef = ref<HTMLDetailsElement | null>(null)
const a = useDetails(aRef, { accordion: accordionRef, initial: true })
const b = useDetails(bRef, { accordion: accordionRef })
const c = useDetails(cRef, { accordion: accordionRef })

const eventRef = ref<HTMLDetailsElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const eventPanel = useDetails(eventRef, {
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
			<h1>useDetails</h1>
			<p>
				Native <code>&lt;details&gt;</code> adapter. Drives the <code>[open]</code> attribute, emits
				cancellable lifecycle events, and coordinates accordion siblings via DOM events.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useDetails(elementRef, options?): { visible, show(), hide(), toggle() }</code></pre>
		</section>

		<section id="basic">
			<h2>Single panel</h2>
			<p class="showcase-caption">
				The composable mirrors the <code>[open]</code> attribute and exposes <code>visible</code> as
				a reactive ref.
			</p>
			<details ref="panelRef">
				<summary>Show details</summary>
				<p>
					This is collapsible content. Reactive state:
					<code>visible = {{ panel.visible.value }}</code
					>.
				</p>
			</details>
			<div class="showcase-row">
				<button type="button" class="primary outline small" @click="panel.show()">show()</button>
				<button type="button" class="small" @click="panel.hide()">hide()</button>
				<button type="button" class="small" @click="panel.toggle()">toggle()</button>
			</div>
		</section>

		<section id="accordion">
			<h2>Accordion</h2>
			<p class="showcase-caption">
				Pass the same <code>accordion</code> ref to every panel — opening one closes its open
				siblings via a DOM <code>deactivate</code> event. No store, no coordinator.
			</p>
			<div ref="accordionRef">
				<details ref="aRef">
					<summary>Account</summary>
					<p>Identity, password, and primary email.</p>
				</details>
				<details ref="bRef">
					<summary>Notifications</summary>
					<p>Choose which events trigger emails and in-app banners.</p>
				</details>
				<details ref="cRef">
					<summary>Security</summary>
					<p>Two-factor authentication, active sessions, connected devices.</p>
				</details>
			</div>
			<small>
				open:
				<code>{{
					a.visible.value
						? 'Account'
						: b.visible.value
							? 'Notifications'
							: c.visible.value
								? 'Security'
								: '—'
				}}</code>
			</small>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>show</code> / <code>hide</code> fire before the transition (cancelable);
				<code>open</code> / <code>close</code> fire after.
			</p>
			<details ref="eventRef">
				<summary>toggle()</summary>
				<p>Watch the log below for <code>show → open</code> and <code>hide → close</code> pairs.</p>
			</details>
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
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>initial</code></td>
						<td><code>boolean</code></td>
						<td>Open on mount.</td>
					</tr>
					<tr>
						<td><code>accordion</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>Sibling-coordination container.</td>
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
						<td><code>elements:details:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:details:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:details:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:details:close</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
