<script lang="ts" setup>
import { ref } from 'vue'
import { useAlert } from '@src/browser'

const dismissibleRef = ref<HTMLElement | null>(null)
const dismissible = useAlert(dismissibleRef)

const stateRef = ref<HTMLElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const state = useAlert(stateRef, {
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
	},
})

const cancelRef = ref<HTMLElement | null>(null)
const allowHide = ref(false)
const cancelable = useAlert(cancelRef, {
	on: {
		hide: (event) => {
			if (!allowHide.value) event.preventDefault()
		},
	},
})

const placementRef = ref<HTMLElement | null>(null)
const placement = useAlert(placementRef)
</script>

<template>
	<section>
		<header>
			<h1>useAlert</h1>
			<p>
				Reactive show / hide for any element carrying <code>role="alert"</code> or
				<code>role="status"</code>. Owns the <code>.show</code> class, fade transition, and a
				<code>[data-alert-dismiss]</code> click delegate.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useAlert(elementRef, options?): { visible, show(), hide(), toggle() }</code></pre>
		</section>

		<section id="dismissible">
			<h2>Dismissible</h2>
			<p class="showcase-caption">
				Click the close button to fade out. The composable's
				<code>[data-alert-dismiss]</code> delegate calls <code>hide()</code> automatically. The
				button below brings the same node back without unmounting it.
			</p>
			<aside ref="dismissibleRef" role="alert" class="primary">
				<span><strong>Heads up.</strong> This alert can be dismissed at any time.</span>
				<button type="button" data-alert-dismiss aria-label="Close">×</button>
			</aside>
			<button type="button" class="primary outline small" @click="dismissible.show()">
				Show again
			</button>
		</section>

		<section id="variants">
			<h2>Variants</h2>
			<p class="showcase-caption">
				Same composable across every variant — only the modifier class changes.
			</p>
			<div class="showcase-stack">
				<aside role="alert" class="primary"><strong>Primary.</strong> Headline notice.</aside>
				<aside role="alert" class="success"><strong>Saved.</strong> Your changes are live.</aside>
				<aside role="alert" class="warning"><strong>Heads up.</strong> Unsaved sections.</aside>
				<aside role="alert" class="danger"><strong>Connection lost.</strong> Retry shortly.</aside>
			</div>
		</section>

		<section id="cancelable">
			<h2>Cancelable hide</h2>
			<p class="showcase-caption">
				<code>show</code> and <code>hide</code> are cancelable. Calling
				<code>event.preventDefault()</code> bails the transition before it starts.
			</p>
			<label>
				<input v-model="allowHide" type="checkbox" />
				Allow hide (otherwise <code>event.preventDefault()</code>)
			</label>
			<aside ref="cancelRef" role="alert" class="warning">
				<span>I refuse to close until you flip the checkbox above.</span>
				<button type="button" data-alert-dismiss aria-label="Close">×</button>
			</aside>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				Programmatic <code>show()</code> / <code>hide()</code> / <code>toggle()</code> emit the same
				events as the dismiss delegate.
			</p>
			<aside ref="stateRef" role="alert" class="information">
				<span>Watching transitions…</span>
			</aside>
			<div class="showcase-row">
				<button type="button" class="primary outline small" @click="state.show()">show()</button>
				<button type="button" class="small" @click="state.hide()">hide()</button>
				<button type="button" class="small" @click="state.toggle()">toggle()</button>
				<button type="button" class="ghost small" @click="log = []">clear</button>
			</div>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> — {{ e.at }}
				</li>
			</ul>
		</section>

		<section id="in-flow">
			<h2>In-flow guarantee</h2>
			<p class="showcase-caption">
				Alert is <strong>not</strong> a floating component — <code>useAlert</code> never sets the
				<code>popover</code> attribute, never elevates the alert to the browser top layer, and never
				assigns a placement class. Inspect the alert below at any point in its lifecycle to confirm:
				it remains a regular flow-positioned <code>&lt;aside role="alert"&gt;</code>
				inside this section.
			</p>
			<aside ref="placementRef" role="alert" class="information">
				<span>This alert lives in the document flow — no popover, no top layer.</span>
			</aside>
			<div class="showcase-row">
				<button type="button" @click="placement.show()">show()</button>
				<button type="button" @click="placement.hide()">hide()</button>
				<button type="button" @click="placement.toggle()">toggle()</button>
			</div>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Member</th>
						<th>Type</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>visible</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>Mirrors <code>.show</code>.</td>
					</tr>
					<tr>
						<td><code>show()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Cancelable via <code>on.show</code>.</td>
					</tr>
					<tr>
						<td><code>hide()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Cancelable via <code>on.hide</code>.</td>
					</tr>
					<tr>
						<td><code>toggle()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Convenience flip.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Cancelable</th>
						<th>When</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:alert:show</code></td>
						<td>yes</td>
						<td>Before adding <code>.show</code>.</td>
					</tr>
					<tr>
						<td><code>elements:alert:open</code></td>
						<td>no</td>
						<td>After entry transition.</td>
					</tr>
					<tr>
						<td><code>elements:alert:hide</code></td>
						<td>yes</td>
						<td>Before removing <code>.show</code>.</td>
					</tr>
					<tr>
						<td><code>elements:alert:close</code></td>
						<td>no</td>
						<td>After exit transition.</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
