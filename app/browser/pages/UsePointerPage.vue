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
// Demo 2 — accept predicate gated by reactive state.
// An "edit mode" toggle controls whether the box accepts drags.
// Works on touch + mouse equally (no modifier key required — those
// are unavailable on touch keyboards, which would make the demo
// desktop-only otherwise).
// ─────────────────────────────────────────────────────────────────────
const gatedBox = useTemplateRef<HTMLDivElement>('gatedBox')
const gatedOffset = ref({ x: 0, y: 0 })
const editMode = ref(false)
let gatedStart = { x: 0, y: 0 }
const gated = usePointer(gatedBox, {
	cursor: 'move',
	// Reject every pointerdown while edit mode is off. The predicate is
	// pure — it reads reactive state at the moment of the down event, so
	// flipping the toggle takes effect on the NEXT pointerdown without
	// re-instantiating the pointer factory.
	accept: () => editMode.value,
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
// Demo 3 — `clear()` triggered from within `on.move`.
// A boundary check inside the move handler auto-cancels the drag when
// the user moves past a threshold (here: 120 px from origin in any
// direction). Demonstrates clear() being called from external logic
// instead of a sibling button (which would require a second
// simultaneous touch on mobile — impossible on single-touch devices).
// ─────────────────────────────────────────────────────────────────────
const cancelBox = useTemplateRef<HTMLDivElement>('cancelBox')
const cancelOffset = ref({ x: 0, y: 0 })
const cancelled = ref(false)
const CANCEL_BOUNDARY = 120
let cancelStart = { x: 0, y: 0 }
const cancel = usePointer(cancelBox, {
	cursor: 'grabbing',
	on: {
		start: (event) => {
			cancelStart = {
				x: event.clientX - cancelOffset.value.x,
				y: event.clientY - cancelOffset.value.y,
			}
			cancelled.value = false
		},
		move: (event) => {
			const dx = event.clientX - cancelStart.x
			const dy = event.clientY - cancelStart.y
			// Boundary check — if the drag exceeds the threshold, snap
			// back and force-end the drag via clear(). This is the
			// canonical "external condition cancels the drag" pattern:
			// route change, max-extent reached, network error, etc.
			if (Math.hypot(dx, dy) > CANCEL_BOUNDARY) {
				cancelOffset.value = { x: 0, y: 0 }
				cancelled.value = true
				cancel.clear()
				return
			}
			cancelOffset.value = { x: dx, y: dy }
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
			Common patterns: primary-button-only drags, role-gated handles ("only draggable in edit
			mode"), rejecting specific pointer types.
		</p>
		<p>
			Toggle <strong>Edit mode</strong> below. When off, dragging the box does nothing — the
			predicate rejects every pointerdown. When on, the box becomes draggable. The predicate reads
			reactive state at the moment of the down event, so flipping the toggle takes effect on the
			NEXT pointerdown without re-instantiating the factory. Touch-friendly: no modifier keys, no
			two-finger interactions.
		</p>
		<menu style="margin-block: 0 1rem">
			<li>
				<button
					type="button"
					:class="['small', editMode ? 'primary' : 'subtle']"
					:aria-pressed="editMode"
					@click="editMode = !editMode"
				>
					{{ editMode ? '✓ Edit mode on' : 'Edit mode off' }}
				</button>
			</li>
		</menu>
		<div
			style="
				overflow: hidden;
				padding: 1.5rem;
				border: 1px dashed var(--color-border);
				border-radius: 0.5rem;
				min-block-size: 9rem;
			"
		>
			<div
				ref="gatedBox"
				:style="{
					inlineSize: '7rem',
					blockSize: '5rem',
					padding: '0.75rem',
					background: gated.dragging.value
						? 'var(--color-primary-bg-subtle)'
						: editMode
							? 'var(--color-surface-raised)'
							: 'var(--color-canvas)',
					border: `2px ${editMode ? 'solid' : 'dashed'} var(--color-${editMode ? 'primary' : 'border'})`,
					borderRadius: '0.5rem',
					transform: `translate(${gatedOffset.x}px, ${gatedOffset.y}px)`,
					cursor: editMode ? 'move' : 'not-allowed',
					userSelect: 'none',
					touchAction: 'none',
					transition: 'background-color 150ms ease, border-color 150ms ease',
				}"
			>
				<small>{{ editMode ? 'Drag me' : 'Locked' }}</small>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const editMode = ref(false)
usePointer(box, {
  cursor: 'move',
  // Predicate reads reactive state at pointerdown time —
  // flipping the toggle is reflected on the next down event.
  accept: () =&gt; editMode.value,
  on: { start, move },
})</code></pre>
		</details>
	</section>

	<section id="use-pointer-clear">
		<h2>3. <code>clear()</code> — programmatic drag cancellation</h2>
		<p>
			<code>clear()</code> forcibly releases pointer capture, restores body styles, and flips
			<code>dragging</code> to <code>false</code> — without waiting for the user to lift. Useful
			when an external condition needs to end the drag: route change, modal opening, network error,
			max-extent reached, idle timeout.
		</p>
		<p>
			The box below has a <strong>{{ CANCEL_BOUNDARY }} px boundary</strong> from its origin. Drag
			in any direction; once you exceed the boundary, the move handler calls
			<code>clear()</code> from inside <code>on.move</code> — the drag snaps back and ends
			automatically. Demonstrates the external-trigger pattern without requiring a second
			simultaneous touch (which would be impossible on single-touch devices).
		</p>
		<div
			style="
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 1rem;
				padding: 2rem;
				border: 1px dashed var(--color-border);
				border-radius: 0.5rem;
			"
		>
			<div
				ref="cancelBox"
				:style="{
					inlineSize: '4rem',
					blockSize: '4rem',
					transform: `translate(${cancelOffset.x}px, ${cancelOffset.y}px)`,
					background: cancel.dragging.value
						? 'var(--color-warning-bg-subtle)'
						: cancelled
							? 'var(--color-danger-bg-subtle)'
							: 'var(--color-surface-raised)',
					border: `2px solid var(--color-${cancelled ? 'danger' : 'warning'})`,
					borderRadius: '0.5rem',
					cursor: 'grab',
					userSelect: 'none',
					touchAction: 'none',
					transition: cancel.dragging.value
						? 'background-color 150ms ease, border-color 150ms ease'
						: 'transform 200ms ease, background-color 150ms ease, border-color 150ms ease',
				}"
			></div>
			<small style="font-variant-numeric: tabular-nums">
				dragging: <strong>{{ cancel.dragging.value ? 'yes' : 'no' }}</strong> · distance:
				<strong>{{ Math.round(Math.hypot(cancelOffset.x, cancelOffset.y)) }}</strong> /
				{{ CANCEL_BOUNDARY }}
				<span v-if="cancelled" style="color: var(--color-danger-text-emphasis)">
					· auto-cancelled at boundary
				</span>
			</small>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const { dragging, clear } = usePointer(box, {
  cursor: 'grabbing',
  on: {
    start: (event) =&gt; { ... },
    move: (event) =&gt; {
      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      if (Math.hypot(dx, dy) &gt; BOUNDARY) {
        offset.value = { x: 0, y: 0 }
        clear() // auto-end the drag
        return
      }
      offset.value = { x: dx, y: dy }
    },
  },
})</code></pre>
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
