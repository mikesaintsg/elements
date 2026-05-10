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

// Upload zone — accepts files dragged from outside the browser.
const uploadRef = ref<HTMLElement | null>(null)
const files = ref<{ name: string; size: number; type: string }[]>([])
const upload = useDrop(uploadRef, {
	on: {
		drop: (event) => {
			event.preventDefault()
			const list = event.dataTransfer?.files
			if (!list) return
			for (const file of Array.from(list)) {
				files.value.unshift({ name: file.name, size: file.size, type: file.type })
			}
		},
	},
})
const formatBytes = (n: number): string => {
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
	return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Event callbacks — log every drag lifecycle event so the consumer can
// see when each fires.
const callbackRef = ref<HTMLElement | null>(null)
const events = ref<{ at: string; kind: string }[]>([])
useDrop(callbackRef, {
	on: {
		dragenter: () => events.value.unshift({ at: stamp(), kind: 'dragenter' }),
		dragover: () => {
			// dragover fires very rapidly; throttle by only logging the first
			// after each enter / leave cycle.
			if (events.value[0]?.kind !== 'dragover') {
				events.value.unshift({ at: stamp(), kind: 'dragover' })
			}
		},
		dragleave: () => events.value.unshift({ at: stamp(), kind: 'dragleave' }),
		drop: (event) => {
			event.preventDefault()
			events.value.unshift({ at: stamp(), kind: 'drop' })
		},
	},
})
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

		<section id="upload">
			<h2>Upload zone</h2>
			<p class="showcase-caption">
				Drag a file (or several) from your OS onto the zone below. Files appear in the list with
				name, size, and MIME type.
			</p>
			<div ref="uploadRef" class="showcase-drop-zone" :data-over="upload.over.value">
				Drag files here.
			</div>
			<small v-if="files.length === 0">No files dropped yet.</small>
			<ul v-else>
				<li v-for="(f, i) in files" :key="i">
					<code>{{ f.name }}</code> — {{ formatBytes(f.size) }} · {{ f.type || '(unknown type)' }}
				</li>
			</ul>
		</section>

		<section id="callbacks">
			<h2>Event callbacks</h2>
			<p class="showcase-caption">
				The drag lifecycle fires <code>dragenter → dragover* → dragleave</code> / <code>drop</code>.
				The composable forwards each as a same-named event so consumers can hook into them.
			</p>
			<div ref="callbackRef" class="showcase-drop-zone">Drag a badge from above.</div>
			<button type="button" class="ghost small" @click="events = []">clear log</button>
			<small v-if="events.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in events" :key="i">
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
