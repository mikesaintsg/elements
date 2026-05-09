<script lang="ts" setup>
import { ref } from 'vue'
import { usePointer } from '@src/browser'

const trackRef = ref<HTMLElement | null>(null)
const knobRef = ref<HTMLElement | null>(null)
const value = ref(50)

const knob = usePointer(knobRef, {
	cursor: 'ew-resize',
	on: {
		move: (event) => {
			const track = trackRef.value
			if (!track) return
			const rect = track.getBoundingClientRect()
			const pct = ((event.clientX - rect.left) / rect.width) * 100
			value.value = Math.max(0, Math.min(100, Math.round(pct)))
		},
	},
})

const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const evRef = ref<HTMLElement | null>(null)
const ev = usePointer(evRef, {
	on: {
		start: () => log.value.unshift({ at: stamp(), kind: 'start' }),
		move: () => log.value.length < 50 && log.value.unshift({ at: stamp(), kind: 'move' }),
		end: () => log.value.unshift({ at: stamp(), kind: 'end' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>usePointer</h1>
			<p>
				Wraps the <code>pointerdown → pointermove* → pointerup</code> lifecycle. Owns pointer
				capture, body-cursor lock, and explicit start / move / end events.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>usePointer(elementRef, options?): { dragging, clear() }</code></pre>
		</section>

		<section id="slider">
			<h2>Custom slider</h2>
			<p class="showcase-caption">
				Drag the knob to set the value. <code>dragging = {{ knob.dragging.value }}</code
				>; value = <code>{{ value }}</code
				>.
			</p>
			<div
				ref="trackRef"
				:style="{
					position: 'relative',
					blockSize: '0.5rem',
					background: 'color-mix(in oklab, currentColor 12%, transparent)',
					borderRadius: '0.25rem',
					maxInlineSize: '24rem',
				}"
			>
				<div
					ref="knobRef"
					:style="{
						position: 'absolute',
						insetBlockStart: '-0.5rem',
						insetInlineStart: `calc(${value}% - 0.75rem)`,
						inlineSize: '1.5rem',
						blockSize: '1.5rem',
						borderRadius: '50%',
						background: 'var(--color-primary, #3b82f6)',
						cursor: 'ew-resize',
						touchAction: 'none',
					}"
				></div>
			</div>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				Click and drag inside the box. <code>start</code> fires once on press, <code>move</code> on
				each pointer-move, <code>end</code> on release.
			</p>
			<div
				ref="evRef"
				:style="{
					padding: '2rem',
					border: '2px dashed var(--color-border, #ccc)',
					borderRadius: '0.5rem',
					textAlign: 'center',
					cursor: 'crosshair',
					touchAction: 'none',
				}"
			>
				Drag here. dragging = <code>{{ ev.dragging.value }}</code>
			</div>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log.slice(0, 20)" :key="i">
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
						<td><code>cursor</code></td>
						<td><code>string</code></td>
						<td>Body cursor while dragging.</td>
					</tr>
					<tr>
						<td><code>accept</code></td>
						<td><code>(event) =&gt; boolean</code></td>
						<td>Reject a <code>pointerdown</code>.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<p class="showcase-caption">
				<code>on.start</code>, <code>on.move</code>, <code>on.end</code> all receive
				<code>PointerEvent</code> directly (not <code>CustomEvent</code>).
			</p>
		</section>
	</section>
</template>
