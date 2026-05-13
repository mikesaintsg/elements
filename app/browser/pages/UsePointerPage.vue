<script lang="ts" setup>
/**
 * UsePointerPage — pointer-capture composable demo.
 *
 * `usePointer(elementRef, options)` wraps the
 * `pointerdown → pointermove* → pointerup` lifecycle. Sets pointer
 * capture so move/up keep firing across siblings, locks the body
 * cursor for the duration of the drag, and disables text selection.
 *
 * Designed for the building blocks of any drag interaction —
 * sliders, splitters, draggable handles, custom range inputs, swipe
 * gestures, color pickers. The framework-level surface is intentionally
 * thin (start / move / end callbacks + a single `accept` predicate);
 * higher-level composables (`useDrag`, `useDrop`, future
 * `useSlider`) compose `usePointer` and add their own semantics.
 *
 * Lifecycle:
 *   - `pointerdown` → `accept?` predicate decides whether to engage.
 *     If accepted: `setPointerCapture()`, body cursor + user-select
 *     lock, `on.start(event)` fires, `dragging.value = true`.
 *   - `pointermove*` (while captured) → `on.move(event)` fires for
 *     every move past the engagement threshold. The host receives
 *     the events even when the pointer leaves the element's bounds
 *     (that's what pointer capture buys you).
 *   - `pointerup` / `pointercancel` → `on.end(event)` fires, capture
 *     releases, body styles restore, `dragging.value = false`.
 *
 * API surface coverage:
 *   1. Basic drag — horizontal slider thumb that tracks pointer X.
 *   2. `cursor` option — body cursor lock for the drag duration.
 *   3. `accept` predicate — gate `pointerdown` events (modifier
 *      keys, primary-button-only, etc.).
 *   4. `dragging` ref — reactive flag, gates visual chrome.
 *   5. `clear()` — programmatic drag cancellation.
 *   6. Pointer capture — `pointermove` keeps firing even when the
 *      pointer leaves the element's bounds.
 *
 * Cross-references:
 *   - [UseDragDropPage](#/use-drag-drop) — `useDrag` + `useDrop`
 *     compose `usePointer` and add HTML drag-and-drop semantics.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { usePointer } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — horizontal slider thumb.
// Drag the thumb along the track; the value updates on every move.
// ─────────────────────────────────────────────────────────────────────
const sliderTrack = useTemplateRef<HTMLDivElement>('sliderTrack')
const sliderThumb = useTemplateRef<HTMLDivElement>('sliderThumb')
const sliderValue = ref(40) // 0–100

const setSliderFromEvent = (event: PointerEvent): void => {
	const track = sliderTrack.value
	if (!track) return
	const rect = track.getBoundingClientRect()
	const ratio = (event.clientX - rect.left) / rect.width
	sliderValue.value = Math.round(Math.max(0, Math.min(1, ratio)) * 100)
}

const slider = usePointer(sliderThumb, {
	cursor: 'grabbing',
	on: {
		start: setSliderFromEvent,
		move: setSliderFromEvent,
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — modifier-gated drag.
// Only engage when the SHIFT key is held; otherwise the pointer down
// passes through and the box behaves like a static panel.
// ─────────────────────────────────────────────────────────────────────
const gatedBox = useTemplateRef<HTMLDivElement>('gatedBox')
const gatedOffset = ref({ x: 0, y: 0 })
let gatedStart = { x: 0, y: 0 }
const gated = usePointer(gatedBox, {
	cursor: 'move',
	// Only accept primary-button + Shift-held pointer downs. Right-click,
	// middle-click, or unmodified pointer downs all reject.
	accept: (event) => event.button === 0 && event.shiftKey,
	on: {
		start: (event) => {
			gatedStart = {
				x: event.clientX - gatedOffset.value.x,
				y: event.clientY - gatedOffset.value.y,
			}
		},
		move: (event) => {
			gatedOffset.value = { x: event.clientX - gatedStart.x, y: event.clientY - gatedStart.y }
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — programmatic clear().
// A button calls `clear()` to forcibly cancel an in-progress drag.
// Useful when an external event (route change, modal open, timeout)
// needs to release the drag without waiting for the user to lift.
// ─────────────────────────────────────────────────────────────────────
const cancelBox = useTemplateRef<HTMLDivElement>('cancelBox')
const cancelDx = ref(0)
let cancelStartX = 0
const cancel = usePointer(cancelBox, {
	cursor: 'ew-resize',
	on: {
		start: (event) => {
			cancelStartX = event.clientX - cancelDx.value
		},
		move: (event) => {
			cancelDx.value = event.clientX - cancelStartX
		},
	},
})

const draggingNow = computed(
	() => slider.dragging.value || gated.dragging.value || cancel.dragging.value,
)
</script>

<template>
	<section id="use-pointer-intro">
		<hgroup>
			<h1>usePointer</h1>
			<p>
				Pointer-capture composable. Wraps the
				<code>pointerdown → pointermove* → pointerup</code> lifecycle, locks the body cursor for the
				duration of the drag, and disables text selection so the user gesture reads cleanly. Returns
				<code>{ dragging, clear }</code>.
			</p>
		</hgroup>
		<p>
			The building block for any drag interaction — sliders, splitters, draggable handles, custom
			range inputs, swipe gestures, color pickers. <code>usePointer</code> is intentionally thin:
			<code>on.start / move / end</code> callbacks fire on the raw <code>PointerEvent</code> (no
			synthetic <code>CustomEvent</code> boxing, because consumers need the raw pointer geometry),
			and a single <code>accept</code> predicate gates which <code>pointerdown</code> events engage.
			Higher-level composables (<code>useDrag</code>, <code>useDrop</code>, future
			<code>useSlider</code>) compose <code>usePointer</code> and add their own semantics on top.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Dragging:</strong>
				<code>{{ draggingNow ? 'yes' : 'no' }}</code> —
				<small>drag any demo below and the indicator flips while pointer is captured.</small>
			</p>
		</aside>
	</section>

	<section id="use-pointer-slider">
		<h2>1. Custom slider thumb — horizontal track</h2>
		<p>
			Click the thumb and drag along the track. The value updates on every
			<code>pointermove</code>. Pointer capture means
			<strong>you can drag past the track edges</strong> — the move events keep firing even when
			your pointer leaves the element's bounds. Try dragging way off to the right; the value caps at
			100 but the drag stays active.
		</p>
		<div style="display: flex; align-items: center; gap: 1rem">
			<div
				ref="sliderTrack"
				:style="{
					position: 'relative',
					flex: 1,
					blockSize: '1rem',
					background: 'var(--color-border)',
					borderRadius: '9999px',
				}"
			>
				<div
					:style="{
						position: 'absolute',
						insetBlock: 0,
						insetInlineStart: 0,
						inlineSize: `${sliderValue}%`,
						background: 'var(--color-primary)',
						borderRadius: '9999px',
					}"
				></div>
				<div
					ref="sliderThumb"
					role="slider"
					tabindex="0"
					:aria-valuenow="sliderValue"
					aria-valuemin="0"
					aria-valuemax="100"
					:style="{
						position: 'absolute',
						insetBlockStart: '50%',
						insetInlineStart: `${sliderValue}%`,
						inlineSize: '1.25rem',
						blockSize: '1.25rem',
						borderRadius: '50%',
						background: 'var(--color-canvas)',
						border: '2px solid var(--color-primary)',
						boxShadow: 'var(--set-box-shadow-sm)',
						transform: 'translate(-50%, -50%)',
						cursor: slider.dragging.value ? 'grabbing' : 'grab',
						touchAction: 'none',
					}"
				></div>
			</div>
			<output style="min-inline-size: 3rem; text-align: end; font-variant-numeric: tabular-nums">
				{{ sliderValue }}
			</output>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const track = useTemplateRef('track')
const thumb = useTemplateRef('thumb')
const value = ref(40)

const setFromEvent = (event: PointerEvent) =&gt; {
  const rect = track.value!.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  value.value = Math.round(Math.max(0, Math.min(1, ratio)) * 100)
}

usePointer(thumb, {
  cursor: 'grabbing',
  on: {
    start: setFromEvent,
    move: setFromEvent,
  },
})</code></pre>
		</details>
	</section>

	<section id="use-pointer-accept">
		<h2>2. <code>accept</code> predicate — gate which pointerdowns engage</h2>
		<p>
			The <code>accept</code> option is a pure decision function — return <code>false</code> to
			reject a <code>pointerdown</code>. The drag never starts, no body cursor change, no capture.
			Useful for primary-button-only drags, modifier-gated handles ("hold Shift to rearrange"), or
			rejecting touch-only / mouse-only paths.
		</p>
		<p>
			<strong>Hold Shift</strong> while dragging the box below — it accepts the drag. Without Shift,
			<code>pointerdown</code> is rejected and the box stays put.
		</p>
		<div
			style="
				overflow: hidden;
				padding: 2rem;
				border: 1px dashed var(--color-border);
				border-radius: 0.5rem;
			"
		>
			<div
				ref="gatedBox"
				:style="{
					inlineSize: '8rem',
					blockSize: '5rem',
					padding: '0.75rem',
					background: gated.dragging.value
						? 'var(--color-primary-bg-subtle)'
						: 'var(--color-surface-raised)',
					border: '1px solid var(--color-border)',
					borderRadius: '0.5rem',
					transform: `translate(${gatedOffset.x}px, ${gatedOffset.y}px)`,
					cursor: 'move',
					userSelect: 'none',
					touchAction: 'none',
					transition: 'background-color 150ms ease',
				}"
			>
				<small>Shift + drag</small>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>usePointer(box, {
  cursor: 'move',
  accept: (event) =&gt; event.button === 0 &amp;&amp; event.shiftKey,
  on: { start, move },
})</code></pre>
		</details>
	</section>

	<section id="use-pointer-clear">
		<h2>3. <code>clear()</code> — programmatic drag cancellation</h2>
		<p>
			Drag the handle horizontally. While dragging, click <strong>Cancel drag</strong> to forcibly
			release the pointer capture and restore body styles. Useful when an external event (route
			change, modal open, timeout, network error) needs to end the drag without waiting for the user
			to lift.
		</p>
		<div style="display: flex; align-items: center; gap: 1rem">
			<div
				ref="cancelBox"
				:style="{
					position: 'relative',
					inlineSize: '3rem',
					blockSize: '3rem',
					transform: `translateX(${cancelDx}px)`,
					background: cancel.dragging.value
						? 'var(--color-warning-bg-subtle)'
						: 'var(--color-surface-raised)',
					border: '2px solid var(--color-warning)',
					borderRadius: '0.5rem',
					cursor: 'ew-resize',
					userSelect: 'none',
					touchAction: 'none',
					transition: 'background-color 150ms ease',
				}"
			></div>
			<button type="button" class="subtle" :disabled="!cancel.dragging.value" @click="cancel.clear">
				Cancel drag
			</button>
			<small>
				dragging: <strong>{{ cancel.dragging.value ? 'yes' : 'no' }}</strong
				>; offset: <strong>{{ cancelDx }}px</strong>
			</small>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const { dragging, clear } = usePointer(box, { ... })

// elsewhere — cancel in response to external state
watch(routeChange, () =&gt; clear())</code></pre>
		</details>
	</section>

	<section id="use-pointer-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>usePointer(elementRef, options?): UsePointerReturn</code></dt>
			<dd>
				Vue composable. <code>elementRef</code> is a
				<code>Ref&lt;HTMLElement | null&gt;</code> pointing at the drag host. Element-agnostic: any
				HTMLElement works.
			</dd>
			<dt><code>options.cursor</code></dt>
			<dd>
				<code>string</code>. CSS cursor keyword applied to <code>document.body</code> for the
				duration of the drag. Restored on <code>pointerup</code> / <code>pointercancel</code> /
				<code>clear()</code>.
			</dd>
			<dt><code>options.accept</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; boolean</code>. Pure decision function. Return
				<code>false</code> to reject a <code>pointerdown</code> — drag never engages.
			</dd>
			<dt><code>options.on.start</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires when a <code>pointerdown</code> is
				accepted and capture is set. The raw <code>PointerEvent</code> is passed (NOT boxed in a
				synthetic <code>CustomEvent</code> — consumers need
				<code>clientX / clientY / button</code> + modifier keys).
			</dd>
			<dt><code>options.on.move</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires for every
				<code>pointermove</code> while captured.
			</dd>
			<dt><code>options.on.end</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires on <code>pointerup</code> /
				<code>pointercancel</code>.
			</dd>
			<dt><code>UsePointerReturn.dragging</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reactive flag — true between
				<code>start</code> and <code>end</code>. Bind to template / class to paint a "while
				dragging" visual state.
			</dd>
			<dt><code>UsePointerReturn.clear()</code></dt>
			<dd>
				Programmatic cancel. Releases pointer capture, restores body cursor + user-select, flips
				<code>dragging</code> to <code>false</code>. No-op if not currently dragging.
			</dd>
		</dl>
	</section>
</template>
