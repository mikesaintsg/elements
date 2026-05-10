<script lang="ts" setup>
import { ref } from 'vue'
import { useDrop } from '@src/browser'

const zoneRef = ref<HTMLElement | null>(null)
const dropped = ref<string[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const zone = useDrop(zoneRef, {
	on: {
		drop: (event) => {
			event.preventDefault()
			const text = event.dataTransfer?.getData('text/plain')
			if (text) dropped.value.unshift(`${stamp()} · ${text}`)
		},
	},
})

const filteredRef = ref<HTMLElement | null>(null)
const filtered = useDrop(filteredRef, { accept: ['text/plain'] })

// Drag-source helpers — start a drag with a given text payload. The
// composable only handles the drop side; the page wires `dragstart`
// directly on the badge nodes to keep the demo self-contained.
const onBadgeDragStart = (event: DragEvent, label: string): void => {
	event.dataTransfer?.setData('text/plain', label)
	event.dataTransfer?.setData('application/x-elements-badge', label)
	if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
	;(event.target as HTMLElement).classList.add('dragging')
}
const onBadgeDragEnd = (event: DragEvent): void => {
	;(event.target as HTMLElement).classList.remove('dragging')
}
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
				Drag any badge below onto the zone. The composable's reactive <code>over</code> ref drives
				the host's <code>data-over</code> attribute (currently: <code>{{ zone.over.value }}</code
				>).
			</p>

			<div class="showcase-drag-badges">
				<span
					class="primary"
					draggable="true"
					@dragstart="(e) => onBadgeDragStart(e, 'Primary')"
					@dragend="onBadgeDragEnd"
					>Primary</span
				>
				<span
					class="success"
					draggable="true"
					@dragstart="(e) => onBadgeDragStart(e, 'Success')"
					@dragend="onBadgeDragEnd"
					>Success</span
				>
				<span
					class="warning"
					draggable="true"
					@dragstart="(e) => onBadgeDragStart(e, 'Warning')"
					@dragend="onBadgeDragEnd"
					>Warning</span
				>
				<span
					class="danger"
					draggable="true"
					@dragstart="(e) => onBadgeDragStart(e, 'Danger')"
					@dragend="onBadgeDragEnd"
					>Danger</span
				>
			</div>

			<div ref="zoneRef" class="showcase-drop-zone" :data-over="zone.over.value">
				Drop a badge here.
			</div>
			<small v-if="dropped.length === 0">No drops yet.</small>
			<ul v-else>
				<li v-for="(d, i) in dropped" :key="i">{{ d }}</li>
			</ul>
		</section>

		<section id="filter">
			<h2>Type filter</h2>
			<p class="showcase-caption">
				<code>accept</code> restricts which payloads light up the zone. Hovered:
				<code>{{ filtered.over.value }}</code
				>.
			</p>
			<div ref="filteredRef" class="showcase-drop-zone" :data-over="filtered.over.value">
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
