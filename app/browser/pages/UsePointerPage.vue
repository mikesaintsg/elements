<script lang="ts" setup>
/**
 * UsePointerPage — pointer-capture composable demo.
 *
 * `usePointer(elementRef, options)` wraps the
 * `pointerdown → pointermove* → pointerup` lifecycle. Sets pointer
 * capture so move/up keep firing across siblings, locks the body
 * cursor for the duration of the drag, and disables text selection.
 *
 * Designed for continuous-manipulation primitives — situations where
 * HTML5 Drag-and-Drop is the wrong tool because it ships an OS-painted
 * ghost, OS-controlled cursor, coarse event cadence, and brittle touch
 * support. Splitters, sliders, 2D pads, resize handles, swipe gestures,
 * draw canvases, color pickers — all want pointermove every frame, a
 * stable token-driven cursor, and the "didn't lose the grab" guarantee
 * that `setPointerCapture()` provides at the platform level.
 *
 * API surface coverage (across the four demos below):
 *   1. Slider — basic start / move lifecycle.
 *   2. Splitter — `cursor` body lock + pointer-capture grab through.
 *   3. 2D color pad — `accept` predicate filters pointer button.
 *   4. Resizable card — `clear()` auto-ends drag at max bounds.
 *
 * Cross-references:
 *   - [UseDragDropPage](#/use-drag-drop) — `useDrag` + `useDrop` wrap
 *     HTML5 DnD for the "pick this up and drop it on something"
 *     semantic (file uploads, list reorder between zones).
 *     Different tools for different intents — not redundant.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { usePointer } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — horizontal slider thumb.
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
	on: { start: setSliderFromEvent, move: setSliderFromEvent },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — splitter / resizable pane divider.
// The headline usePointer use case. Drag the divider between two panes;
// pointer capture guarantees the drag persists even when the pointer
// leaves the divider's narrow bounds — HTML5 DnD's hit-test model would
// drop the grab the instant your cursor wandered off the 6px handle.
// ─────────────────────────────────────────────────────────────────────
const splitterContainer = useTemplateRef<HTMLDivElement>('splitterContainer')
const splitterHandle = useTemplateRef<HTMLDivElement>('splitterHandle')
const splitPercent = ref(50) // 0–100, position of the divider
const splitter = usePointer(splitterHandle, {
	cursor: 'col-resize',
	on: {
		move: (event) => {
			const container = splitterContainer.value
			if (!container) return
			const rect = container.getBoundingClientRect()
			const ratio = (event.clientX - rect.left) / rect.width
			// Clamp 10–90% so neither pane collapses entirely.
			splitPercent.value = Math.round(Math.max(0.1, Math.min(0.9, ratio)) * 100)
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — 2D color picker (saturation × lightness pad).
// Drag inside the pad to set both saturation (x) and lightness (y) for
// the active hue. The `accept` predicate filters to primary-button only
// so right-click still raises the OS context menu without engaging the
// drag — a real-world consideration for canvas-style surfaces.
// ─────────────────────────────────────────────────────────────────────
const colorPad = useTemplateRef<HTMLDivElement>('colorPad')
const hue = ref(220)
const saturation = ref(70) // 0–100
const lightness = ref(50) // 0–100

const setColorFromEvent = (event: PointerEvent): void => {
	const pad = colorPad.value
	if (!pad) return
	const rect = pad.getBoundingClientRect()
	const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
	const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
	saturation.value = Math.round(x * 100)
	// Top of the pad = light (90), bottom = dark (10). Pointer capture
	// means the user can drag below the pad and the value clamps at 10
	// without losing the drag — try it!
	lightness.value = Math.round(90 - y * 80)
}
const colorPicker = usePointer(colorPad, {
	cursor: 'crosshair',
	// Reject non-primary buttons so right-click doesn't trigger the drag
	// (and the user still gets the OS context menu via secondary click).
	accept: (event) => event.button === 0,
	on: { start: setColorFromEvent, move: setColorFromEvent },
})

const swatch = computed(() => `hsl(${hue.value}, ${saturation.value}%, ${lightness.value}%)`)

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — resizable card via a corner handle.
// `accept` (implicit via host scope — usePointer is bound to the handle,
// not the card) keeps the entire card body click-through. `clear()`
// is called from inside `on.move` when either dimension hits a max
// bound — demonstrates the "external condition ends the drag" pattern
// without requiring two-finger interaction on mobile.
// ─────────────────────────────────────────────────────────────────────
const resizeHandle = useTemplateRef<HTMLDivElement>('resizeHandle')
const cardSize = ref({ w: 260, h: 160 })
const cardMax = { w: 480, h: 320 }
const cardMin = { w: 180, h: 120 }
let cardStart = { w: 260, h: 160, x: 0, y: 0 }
const cardLimited = ref(false)
const resizer = usePointer(resizeHandle, {
	cursor: 'nwse-resize',
	on: {
		start: (event) => {
			cardStart = { w: cardSize.value.w, h: cardSize.value.h, x: event.clientX, y: event.clientY }
			cardLimited.value = false
		},
		move: (event) => {
			const w = cardStart.w + (event.clientX - cardStart.x)
			const h = cardStart.h + (event.clientY - cardStart.y)
			const clampedW = Math.max(cardMin.w, Math.min(cardMax.w, w))
			const clampedH = Math.max(cardMin.h, Math.min(cardMax.h, h))
			cardSize.value = { w: clampedW, h: clampedH }
			// If either dimension hit the max, auto-end the drag and
			// flash a "limit reached" indicator. Demonstrates clear()
			// being driven by an external condition (max-extent).
			if (clampedW === cardMax.w || clampedH === cardMax.h) {
				cardLimited.value = true
				resizer.clear()
			}
		},
	},
})

const draggingNow = computed(
	() =>
		slider.dragging.value ||
		splitter.dragging.value ||
		colorPicker.dragging.value ||
		resizer.dragging.value,
)
</script>

<template>
	<section id="use-pointer-intro">
		<hgroup>
			<h1>usePointer</h1>
			<p>
				Pointer-capture composable. Wraps the
				<code>pointerdown → pointermove* → pointerup</code> lifecycle, locks the body cursor for the
				duration of the drag, and disables text selection so the gesture reads cleanly. Returns
				<code>{ dragging, clear }</code>.
			</p>
		</hgroup>
		<p>
			The right tool for <strong>continuous-manipulation primitives</strong> — situations where
			HTML5 Drag-and-Drop ships the wrong contract: an OS-painted ghost you can't suppress, a cursor
			the browser controls, event cadence at roughly 50–100 ms instead of every frame, and a
			hit-test grab model that drops the drag the moment the pointer wanders past the source bounds.
			<code>setPointerCapture()</code> — the load-bearing call inside <code>usePointer</code> —
			explicitly solves the "don't lose the grab" problem at the platform level: your element keeps
			receiving move + up events no matter where the cursor goes until you release.
		</p>
		<p>
			Reach for <code>usePointer</code> for: splitters, sliders, 2D pads, resize handles, swipe
			gestures, draw canvases, color pickers, scrub bars, custom range inputs. Reach for
			<code>useDragDrop</code> (the framework's wrap around HTML5 DnD) for: file drops from the OS,
			app-to-app drops, reorderable lists where data crosses between drop zones.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Dragging:</strong>
				<code>{{ draggingNow ? 'yes' : 'no' }}</code> —
				<small
					>any of the four demos below flip the indicator while their pointer is captured.</small
				>
			</p>
		</aside>
	</section>

	<section id="use-pointer-slider">
		<h2>1. Slider thumb — basic single-axis drag</h2>
		<p>
			Click the thumb and drag along the track. The value updates on every
			<code>pointermove</code>. Pointer capture means
			<strong>you can drag past the track edges</strong> — the move events keep firing even when
			your pointer leaves the element's bounds. Try dragging way off to the right; the value caps at
			100 but the drag stays active until you release.
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
						boxShadow: 'var(--set-box-shadow-small)',
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
	</section>

	<section id="use-pointer-splitter">
		<h2>2. Splitter — resizable pane divider</h2>
		<p>
			The headline <code>usePointer</code> use case. Two panes side-by-side; a draggable divider
			between them. Pointer capture is doing the load-bearing work: the divider is a 6 px-wide
			handle, but the user's cursor will wander wherever during a fast drag —
			<code>setPointerCapture()</code> keeps the pointermove events firing on the handle no matter
			where the cursor goes. The drag holds until the user releases. This is the interaction HTML5
			DnD physically cannot deliver — its hit-test model would drop the grab the moment the cursor
			left the 6 px target.
		</p>
		<p>
			Drag the vertical bar between the two panes. The body cursor locks to
			<code>col-resize</code> for the duration of the drag (an OS-painted "I'm dragging" cursor
			would be wrong here; the consumer owns the affordance).
		</p>
		<div
			ref="splitterContainer"
			:style="{
				display: 'grid',
				gridTemplateColumns: `${splitPercent}fr 6px ${100 - splitPercent}fr`,
				blockSize: '12rem',
				border: '1px solid var(--color-border)',
				borderRadius: '0.5rem',
				overflow: 'hidden',
			}"
		>
			<div style="padding: 1rem; overflow: auto">
				<h6 class="mt-0 mb-2">Left pane</h6>
				<p>
					<small>
						Width: <strong>{{ splitPercent }}%</strong>
					</small>
				</p>
				<p>
					Documentation in this pane scrolls independently. Drag the divider to widen or narrow this
					column.
				</p>
			</div>
			<div
				ref="splitterHandle"
				role="separator"
				aria-orientation="vertical"
				:aria-valuenow="splitPercent"
				aria-valuemin="10"
				aria-valuemax="90"
				:style="{
					background: splitter.dragging.value ? 'var(--color-primary)' : 'var(--color-border)',
					cursor: 'col-resize',
					touchAction: 'none',
					transition: 'background-color 150ms ease',
				}"
			></div>
			<div style="padding: 1rem; overflow: auto">
				<h6 class="mt-0 mb-2">Right pane</h6>
				<p>
					<small>
						Width: <strong>{{ 100 - splitPercent }}%</strong>
					</small>
				</p>
				<p>
					Preview area in this pane. The split persists until you release — even when you drag way
					past either edge, the capture keeps you connected to the handle.
				</p>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const splitPercent = ref(50)
usePointer(handle, {
  cursor: 'col-resize',
  on: {
    move: (event) =&gt; {
      const rect = container.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      splitPercent.value = Math.round(
        Math.max(0.1, Math.min(0.9, ratio)) * 100
      )
    },
  },
})

// &lt;div style="grid-template-columns: {{ '`${split}fr 6px ${100 - split}fr`' }}"&gt;
//   &lt;div&gt;left&lt;/div&gt;&lt;div ref="handle"&gt;&lt;/div&gt;&lt;div&gt;right&lt;/div&gt;
// &lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="use-pointer-color-pad">
		<h2>3. 2D color pad — two-axis drag with overshoot clamp</h2>
		<p>
			Drag inside the pad to pick saturation (horizontal) + lightness (vertical) for the active hue.
			Two axes at once — exactly the case where pointer capture earns its keep: drag past any edge
			and the values clamp at the boundary without losing the drag. Release outside, the drag still
			ends correctly via <code>pointerup</code>.
		</p>
		<p>
			The <code>accept</code> predicate filters to primary-button-only pointer downs, so
			right-clicking the pad still raises the OS context menu (try it) — the drag never engages for
			secondary-button events. This is the canonical "let the OS keep its affordances" pattern for
			canvas-style surfaces.
		</p>
		<div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: stretch">
			<div
				ref="colorPad"
				:style="{
					position: 'relative',
					inlineSize: '14rem',
					blockSize: '14rem',
					borderRadius: '0.5rem',
					background: `
						linear-gradient(to bottom, hsl(${hue}, 100%, 90%), hsl(${hue}, 100%, 10%)),
						linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))
					`,
					backgroundBlendMode: 'multiply',
					cursor: colorPicker.dragging.value ? 'crosshair' : 'crosshair',
					touchAction: 'none',
					boxShadow: 'inset 0 0 0 1px var(--color-border)',
				}"
			>
				<div
					:style="{
						position: 'absolute',
						insetInlineStart: `${saturation}%`,
						insetBlockStart: `${100 - ((lightness - 10) / 80) * 100}%`,
						inlineSize: '0.875rem',
						blockSize: '0.875rem',
						borderRadius: '50%',
						background: swatch,
						border: '2px solid white',
						boxShadow: '0 0 0 1px var(--color-border-strong), var(--set-box-shadow-small)',
						transform: 'translate(-50%, -50%)',
						pointerEvents: 'none',
					}"
				></div>
			</div>
			<div style="display: flex; flex-direction: column; gap: 0.5rem; min-inline-size: 12rem">
				<label style="display: flex; flex-direction: column; gap: 0.25rem">
					<small>Hue (slide to change pad gradient)</small>
					<input
						type="range"
						min="0"
						max="360"
						step="1"
						v-model.number="hue"
						class="w-full"
					/>
				</label>
				<div
					:style="{
						inlineSize: '100%',
						blockSize: '3rem',
						borderRadius: '0.375rem',
						background: swatch,
						border: '1px solid var(--color-border)',
					}"
				></div>
				<small style="font-variant-numeric: tabular-nums">
					hsl({{ hue }}, <strong>{{ saturation }}%</strong>, <strong>{{ lightness }}%</strong>)
				</small>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const saturation = ref(70)
const lightness = ref(50)
usePointer(pad, {
  cursor: 'crosshair',
  accept: (event) =&gt; event.button === 0, // primary button only
  on: {
    start: setFromEvent,
    move: setFromEvent,
  },
})</code></pre>
		</details>
	</section>

	<section id="use-pointer-resize">
		<h2>4. Resizable card — corner handle with <code>clear()</code> auto-end</h2>
		<p>
			The corner handle (bottom-right) hosts <code>usePointer</code>; the card body is
			click-through. <code>on.start</code> captures the initial card dimensions + pointer position;
			<code>on.move</code> applies the delta and clamps to <code>min</code> /
			<code>max</code> bounds. When either dimension hits the max, the move handler calls
			<code>resizer.clear()</code> to force-end the drag and flashes a "limit reached" indicator.
			The user can't keep dragging into a no-op zone — the drag ENDS at the limit, which the body
			styles correctly reflect (cursor restored, capture released).
		</p>
		<p>
			This is the pattern for any drag that has an external stopping condition — max bounds, route
			change, network error, idle timeout. <code>clear()</code> always works during an active drag,
			including from inside <code>on.move</code> on the same instance.
		</p>
		<div
			style="
				padding: 1.5rem;
				border: 1px dashed var(--color-border);
				border-radius: 0.5rem;
				overflow: auto;
			"
		>
			<article
				:class="['filled', cardLimited ? 'warning' : 'primary']"
				:style="{
					position: 'relative',
					inlineSize: `${cardSize.w}px`,
					blockSize: `${cardSize.h}px`,
					overflow: 'hidden',
					transition: resizer.dragging.value
						? 'none'
						: 'inline-size 150ms ease, block-size 150ms ease',
				}"
			>
				<header>
					<h3 style="margin-block: 0">Resizable card</h3>
				</header>
				<p>
					<small>
						{{ cardSize.w }} × {{ cardSize.h }} px
						<span v-if="cardLimited"> · limit reached, drag ended via clear()</span>
					</small>
				</p>
				<p>Drag the corner handle to resize. Limits: 180×120 min, 480×320 max.</p>
				<div
					ref="resizeHandle"
					aria-label="Resize card"
					role="slider"
					:style="{
						position: 'absolute',
						insetBlockEnd: '0.25rem',
						insetInlineEnd: '0.25rem',
						inlineSize: '1.25rem',
						blockSize: '1.25rem',
						cursor: 'nwse-resize',
						touchAction: 'none',
						background: `linear-gradient(135deg, transparent 35%, currentColor 35%, currentColor 45%, transparent 45%, transparent 55%, currentColor 55%, currentColor 65%, transparent 65%)`,
						opacity: 0.7,
					}"
				></div>
			</article>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const cardSize = ref({ w: 260, h: 160 })
const max = { w: 480, h: 320 }
let start = { w: 0, h: 0, x: 0, y: 0 }

const resizer = usePointer(handle, {
  cursor: 'nwse-resize',
  on: {
    start: (event) =&gt; { start = { ...cardSize.value, x: event.clientX, y: event.clientY } },
    move: (event) =&gt; {
      const w = Math.min(max.w, Math.max(180, start.w + event.clientX - start.x))
      const h = Math.min(max.h, Math.max(120, start.h + event.clientY - start.y))
      cardSize.value = { w, h }
      if (w === max.w || h === max.h) resizer.clear() // auto-end at limit
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
				<code>clear()</code>. Use <code>col-resize</code> for splitters,
				<code>nwse-resize</code> for corner handles, <code>crosshair</code> for canvas-style pads,
				<code>grabbing</code> for general-purpose drags.
			</dd>
			<dt><code>options.accept</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; boolean</code>. Pure decision function. Return
				<code>false</code> to reject a <code>pointerdown</code> — drag never engages, no body cursor
				change, no capture. Common patterns: primary-button only (<code>event.button === 0</code>),
				pointer-type filter (<code>event.pointerType === 'mouse'</code>), reactive state gates
				(<code>() =&gt; editMode.value</code>).
			</dd>
			<dt><code>options.on.start</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires when an accepted
				<code>pointerdown</code> sets capture. The raw <code>PointerEvent</code> is passed (NOT
				boxed in a synthetic <code>CustomEvent</code>) because consumers need
				<code>clientX / clientY / button</code> + modifier keys.
			</dd>
			<dt><code>options.on.move</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires for every
				<code>pointermove</code> while captured. Pointer capture is the guarantee that this keeps
				firing when the pointer leaves the element's bounds.
			</dd>
			<dt><code>options.on.end</code></dt>
			<dd>
				<code>(event: PointerEvent) =&gt; void</code>. Fires on <code>pointerup</code> /
				<code>pointercancel</code> / programmatic <code>clear()</code> end paths.
			</dd>
			<dt><code>UsePointerReturn.dragging</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reactive flag — true between
				<code>start</code> and <code>end</code>. Bind to template chrome to paint a "while-dragging"
				visual state.
			</dd>
			<dt><code>UsePointerReturn.clear()</code></dt>
			<dd>
				Programmatic cancel. Releases pointer capture, restores body cursor + user-select, flips
				<code>dragging</code> to <code>false</code>, fires <code>on.end</code>. Safe to call from
				inside <code>on.move</code> on the same instance (the demo 4 pattern).
			</dd>
		</dl>
	</section>
</template>
