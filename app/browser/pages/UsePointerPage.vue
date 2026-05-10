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

// Pointer tracker — paint X / Y as the pointer moves over a surface.
const trackerRef = ref<HTMLElement | null>(null)
const trackerXY = ref({ x: 0, y: 0, active: false })
usePointer(trackerRef, {
	on: {
		start: (event) => {
			trackerXY.value.active = true
			const rect = (trackerRef.value as HTMLElement).getBoundingClientRect()
			trackerXY.value.x = Math.round(event.clientX - rect.left)
			trackerXY.value.y = Math.round(event.clientY - rect.top)
		},
		move: (event) => {
			const rect = (trackerRef.value as HTMLElement).getBoundingClientRect()
			trackerXY.value.x = Math.round(event.clientX - rect.left)
			trackerXY.value.y = Math.round(event.clientY - rect.top)
		},
		end: () => {
			trackerXY.value.active = false
		},
	},
})

// Splitter — drag a divider between two columns.
const splitterRef = ref<HTMLElement | null>(null)
const splitContainerRef = ref<HTMLElement | null>(null)
const splitPercent = ref(50)
usePointer(splitterRef, {
	cursor: 'col-resize',
	on: {
		move: (event) => {
			const container = splitContainerRef.value
			if (!container) return
			const rect = container.getBoundingClientRect()
			const pct = ((event.clientX - rect.left) / rect.width) * 100
			splitPercent.value = Math.max(15, Math.min(85, pct))
		},
	},
})

// Two-thumb range slider — both thumbs share the same track; their
// values are clamped so the lower thumb never crosses the upper one.
const rangeTrackRef = ref<HTMLElement | null>(null)
const lowKnobRef = ref<HTMLElement | null>(null)
const highKnobRef = ref<HTMLElement | null>(null)
const range = ref({ low: 25, high: 75 })
const computePct = (clientX: number): number => {
	const track = rangeTrackRef.value
	if (!track) return 0
	const rect = track.getBoundingClientRect()
	return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)))
}
usePointer(lowKnobRef, {
	cursor: 'ew-resize',
	on: {
		move: (event) => {
			const pct = computePct(event.clientX)
			range.value.low = Math.min(pct, range.value.high - 1)
		},
	},
})
usePointer(highKnobRef, {
	cursor: 'ew-resize',
	on: {
		move: (event) => {
			const pct = computePct(event.clientX)
			range.value.high = Math.max(pct, range.value.low + 1)
		},
	},
})

// Vetoing — `start` is cancelable. preventDefault on the event blocks
// the drag from starting (but click handlers still fire).
const vetoRef = ref<HTMLElement | null>(null)
const dragsBlocked = ref(0)
usePointer(vetoRef, {
	on: {
		start: (event) => {
			event.preventDefault()
			dragsBlocked.value++
		},
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
					background: 'var(--color-border)',
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

		<section id="tracker">
			<h2>Pointer tracker</h2>
			<p class="showcase-caption">
				The composable's <code>start / move / end</code> events fire on press / drag / release.
				Press and drag inside the panel below to read the live X / Y in panel-local pixels.
			</p>
			<div
				ref="trackerRef"
				:style="{
					inlineSize: '100%',
					blockSize: '10rem',
					border: '1px solid var(--color-border)',
					borderRadius: '0.5rem',
					background: trackerXY.active
						? 'color-mix(in oklab, var(--color-primary) 6%, var(--color-canvas))'
						: 'var(--color-canvas)',
					cursor: 'crosshair',
					padding: '1rem',
					fontFamily: 'monospace',
					fontSize: '0.85em',
				}"
			>
				x: {{ trackerXY.x }} · y: {{ trackerXY.y }} · active:
				{{ trackerXY.active }}
			</div>
		</section>

		<section id="splitter">
			<h2>Splitter</h2>
			<p class="showcase-caption">
				Drag the divider between two columns to resize them. The composable owns the pointer
				capture; the page maps `clientX` to a percentage.
			</p>
			<div
				ref="splitContainerRef"
				:style="{
					display: 'flex',
					inlineSize: '100%',
					blockSize: '8rem',
					border: '1px solid var(--color-border)',
					borderRadius: '0.5rem',
					overflow: 'hidden',
				}"
			>
				<div
					:style="{
						inlineSize: `${splitPercent}%`,
						background: 'color-mix(in oklab, var(--color-primary) 8%, var(--color-canvas))',
						padding: '0.75rem',
					}"
				>
					{{ Math.round(splitPercent) }}% wide
				</div>
				<div
					ref="splitterRef"
					:style="{
						position: 'relative',
						flex: '0 0 0.5rem',
						background: 'var(--color-border)',
						cursor: 'col-resize',
						touchAction: 'none',
						userSelect: 'none',
					}"
				>
					<!-- Widen touch hit-area beyond the visible handle. -->
					<span
						aria-hidden="true"
						:style="{
							position: 'absolute',
							insetBlock: 0,
							insetInline: '-0.375rem',
						}"
					></span>
				</div>
				<div :style="{ flex: 1, padding: '0.75rem' }">{{ Math.round(100 - splitPercent) }}%</div>
			</div>
		</section>

		<section id="range">
			<h2>Two-thumb range slider</h2>
			<p class="showcase-caption">
				Two pointer instances share one track, each clamped so it can't cross the other. Useful for
				range filters / price sliders.
			</p>
			<div
				ref="rangeTrackRef"
				:style="{
					position: 'relative',
					blockSize: '0.5rem',
					background: 'var(--color-border)',
					borderRadius: '0.25rem',
					maxInlineSize: '24rem',
				}"
			>
				<!-- Highlight between the two thumbs. -->
				<div
					:style="{
						position: 'absolute',
						insetBlock: 0,
						insetInlineStart: `${range.low}%`,
						inlineSize: `${range.high - range.low}%`,
						background: 'var(--color-primary)',
						borderRadius: '0.25rem',
					}"
				></div>
				<div
					ref="lowKnobRef"
					:style="{
						position: 'absolute',
						insetBlockStart: '-0.5rem',
						insetInlineStart: `calc(${range.low}% - 0.75rem)`,
						inlineSize: '1.5rem',
						blockSize: '1.5rem',
						borderRadius: '50%',
						background: 'var(--color-primary)',
						cursor: 'ew-resize',
						touchAction: 'none',
					}"
				></div>
				<div
					ref="highKnobRef"
					:style="{
						position: 'absolute',
						insetBlockStart: '-0.5rem',
						insetInlineStart: `calc(${range.high}% - 0.75rem)`,
						inlineSize: '1.5rem',
						blockSize: '1.5rem',
						borderRadius: '50%',
						background: 'var(--color-primary)',
						cursor: 'ew-resize',
						touchAction: 'none',
					}"
				></div>
			</div>
			<small>low: {{ range.low }} · high: {{ range.high }}</small>
		</section>

		<section id="veto">
			<h2>Vetoing pointerdown</h2>
			<p class="showcase-caption">
				The <code>start</code> event is cancelable — calling
				<code>event.preventDefault()</code> blocks the drag from starting (but the click event still
				fires). Each blocked attempt increments the counter.
			</p>
			<button ref="vetoRef" type="button">Try to drag me</button>
			<small>blocked: {{ dragsBlocked }}</small>
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
