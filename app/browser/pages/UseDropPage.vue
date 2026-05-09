<script lang="ts" setup>
import { ref } from 'vue'
import { useDrop } from '@src/browser'

const zoneRef = ref<HTMLElement | null>(null)
const drops = ref<{ at: string; types: readonly string[] }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const zone = useDrop(zoneRef, {
	on: {
		drop: (event) => {
			event.preventDefault()
			const types = Array.from(event.dataTransfer?.types ?? [])
			drops.value.unshift({ at: stamp(), types })
		},
	},
})

const filtered = ref<HTMLElement | null>(null)
const filteredOver = useDrop(filtered, { accept: ['text/plain'] })
</script>

<template>
	<section>
		<header>
			<h1>useDrop</h1>
			<p>
				Wires <code>dragenter</code> / <code>dragover</code> / <code>dragleave</code> /
				<code>drop</code> on any element. Owns the <code>.over</code> reactive ref while a valid
				payload is hovering.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useDrop(elementRef, options?): { over }</code></pre>
		</section>

		<section id="basic">
			<h2>Drop zone</h2>
			<p class="showcase-caption">
				Drag a file or text from outside the page onto the zone. Hovered:
				<code>{{ zone.over.value }}</code
				>.
			</p>
			<div
				ref="zoneRef"
				:style="{
					padding: '2rem',
					border: '2px dashed var(--color-border, #ccc)',
					borderRadius: '0.5rem',
					background: zone.over.value
						? 'color-mix(in oklab, var(--color-primary) 10%, transparent)'
						: 'transparent',
					textAlign: 'center',
				}"
			>
				Drop something here.
			</div>
			<small v-if="drops.length === 0">No drops yet.</small>
			<ul v-else>
				<li v-for="(d, i) in drops" :key="i">
					<code>{{ d.types.join(', ') || '(no types)' }}</code> — {{ d.at }}
				</li>
			</ul>
		</section>

		<section id="filter">
			<h2>Type filter</h2>
			<p class="showcase-caption">
				<code>accept</code> restricts which payloads light up the zone. Hovered:
				<code>{{ filteredOver.over.value }}</code
				>.
			</p>
			<div
				ref="filtered"
				:style="{
					padding: '1.5rem',
					border: '2px dashed var(--color-border, #ccc)',
					borderRadius: '0.5rem',
				}"
			>
				Drop <code>text/plain</code> only.
			</div>
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
						<td><code>accept</code></td>
						<td><code>readonly string[]</code></td>
						<td>MIME types to whitelist.</td>
					</tr>
					<tr>
						<td><code>effect.allowed</code></td>
						<td><code>DataTransfer['effectAllowed']</code></td>
						<td>Advertised on dragstart.</td>
					</tr>
					<tr>
						<td><code>effect.drop</code></td>
						<td><code>DataTransfer['dropEffect']</code></td>
						<td>Cursor + drop semantics.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<p class="showcase-caption">
				<code>on.dragenter</code>, <code>on.dragover</code>, <code>on.dragleave</code>,
				<code>on.drop</code> — native <code>DragEvent</code>s, not custom events.
			</p>
		</section>
	</section>
</template>
