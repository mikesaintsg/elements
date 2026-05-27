<script lang="ts" setup>
/**
 * UseDragDropPage — useDrag + useDrop demo.
 *
 * `useDrag(elementRef, { list })` wraps the HTML5 Drag and Drop API on a
 * container's direct `[data-index]` children. It owns four cross-cutting
 * concerns native DnD leaves to the consumer:
 *
 *   1. **Selection model** — Ctrl/Cmd toggle, Shift extend, plain click
 *      replace. Selected rows get `.selected`; the dragged set
 *      gets `.dragging` once a drag begins.
 *   2. **Hit-test classes** — the row under the cursor gets
 *      `.drop-target`, `.drop-indicator-before`, or
 *      `.drop-indicator-after` so visual feedback is a CSS concern, not
 *      a JS concern.
 *   3. **List splice on drop** — if a reactive `list` ref is supplied,
 *      successful drops reorder it in place (multi-row aware,
 *      contiguous or sparse).
 *   4. **Drag handle / opt-out** — `.drag-handle` inside a row narrows
 *      the grabbable area to one descendant; `.no-drag` inside a row
 *      opts a region out entirely (buttons, links, text inputs).
 *
 * `useDrop(elementRef, { accept, on })` is the standalone drop-target
 * — for cases that aren't list reordering. Compose with a `useDrag`
 * source on another container to move items across zones (mock-
 * attachment tray → outbox, message row → folder), or use it alone for
 * OS-file drops + app-to-app drops. `over` flips while a compatible
 * drag hovers; `accept` filters on data-transfer types (`['Files']`,
 * `['text/plain']`, MIME types).
 *
 * When you'd reach for these:
 *   - List/table reorder with the platform-default ghost.
 *   - Cross-zone drag — tray into basket, message into folder,
 *     attachment into outbox. Coordinate `useDrag` source + `useDrop`
 *     target by reading `source.indices.value` on drop; no custom MIME
 *     data needed for in-app payloads.
 *   - OS-file drop zones (`accept: ['Files']`) + app-to-app drops
 *     crossing tab/window boundaries (browser-issued drag image, OS-
 *     controlled cursor — those are features here).
 *
 * Not the right tool when the gesture is **continuous manipulation**
 * (splitters, sliders, 2D pads, scrub bars). HTML5 DnD ships an OS-
 * painted ghost you can't suppress and event cadence of ~50–100 ms.
 * Reach for [`usePointer`](#/use-pointer) there.
 *
 * API surface coverage:
 *   1. Reorderable list — `list` ref + `[data-index]` rows.
 *   2. `.drag-handle` opt-in — only the handle starts the drag.
 *   3. Multi-select drag — Ctrl/Cmd + Shift selection, drag the set.
 *   4. Cross-zone drag — `useDrag` source on a mock-attachment tray +
 *      `useDrop` target on an outbox; drop handler reads
 *      `source.indices.value` to resolve the payload.
 *   5. `on.reorder` callback — observe the in-list mutation.
 *
 * Cross-references:
 *   - [UsePointerPage](#/use-pointer) — continuous-manipulation
 *     primitives belong there; the two composables are complementary,
 *     not redundant.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useDrag, useDrop } from '@elements/browser'
import { useLog } from '../composables.js'
import type { DragAttachment, DragTrack } from '../types.js'
import { formatSize } from '../helpers.js'

// ─────────────────────────────────────────────────────────────────────
// Shared row shape.
// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
// Demo 1 — reorderable list, default contract.
// `list` ref + auto `[data-index]` reads. Every row is fully draggable.
// ─────────────────────────────────────────────────────────────────────
const reorderList = ref<DragTrack[]>([
	{ id: 't1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 't2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 't3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 't4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
	{ id: 't5', title: 'Weightless', artist: 'Marconi Union', duration: '8:10' },
])
const reorderHost = useTemplateRef<HTMLElement>('reorderHost')
const { entries: reorderLog, push: pushReorder } = useLog(4)
const reorder = useDrag<DragTrack>(reorderHost, {
	list: reorderList,
	on: {
		reorder: (event) => {
			const detail = event.detail as { from: number[]; to: number }
			const moved = detail.from.length
			pushReorder(`Moved ${moved} item${moved === 1 ? '' : 's'} → index ${detail.to}`)
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — `.drag-handle` opt-in.
// Only the grip column starts a drag. The rest of the row stays
// interactive (buttons click, text selects, links navigate) — useful
// when rows host their own affordances.
// ─────────────────────────────────────────────────────────────────────
const handleList = ref<DragTrack[]>([
	{ id: 'h1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 'h2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 'h3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 'h4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
])
const handleHost = useTemplateRef<HTMLElement>('handleHost')
const handlePlayed = ref<string | null>(null)
useDrag<DragTrack>(handleHost, { list: handleList })

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — multi-select drag.
// Click rows with Ctrl/Cmd to toggle, Shift to extend the range. Then
// drag any selected row — the entire selection moves together. `tap()`
// from the composable is exposed if you want to drive selection from
// keyboard handlers or external buttons; here the factory's built-in
// click handler does it for us.
// ─────────────────────────────────────────────────────────────────────
const selectionList = ref<DragTrack[]>([
	{ id: 's1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 's2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 's3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 's4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
	{ id: 's5', title: 'Weightless', artist: 'Marconi Union', duration: '8:10' },
	{ id: 's6', title: 'Svefn-g-englar', artist: 'Sigur Rós', duration: '10:04' },
])
const selectionHost = useTemplateRef<HTMLElement>('selectionHost')
const selection = useDrag<DragTrack>(selectionHost, { list: selectionList })
const selectionCount = computed(() => selection.selected.value.size)

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — cross-zone drag: `useDrag` source + `useDrop` target.
// A "library" tray of mock attachments on the left + an outbox drop
// zone on the right. Drag any attachment over → it appears in the
// outbox. The tray itself is not reordered; `items` (read-only) is
// the right contract for a stable source library. The drop handler
// reads from `tray.indices.value` (the currently-dragged set) to know
// what landed — this is how a `useDrag` source and a `useDrop` target
// coordinate without writing custom MIME data.
// ─────────────────────────────────────────────────────────────────────
const tray = ref<readonly DragAttachment[]>([
	{ id: 'a1', name: 'kickoff-notes.md', size: 4_211, type: 'text/markdown', icon: '📝' },
	{ id: 'a2', name: 'wireframe.png', size: 312_488, type: 'image/png', icon: '🖼️' },
	{ id: 'a3', name: 'budget.csv', size: 18_046, type: 'text/csv', icon: '📊' },
	{ id: 'a4', name: 'logo.svg', size: 6_104, type: 'image/svg+xml', icon: '🎨' },
	{ id: 'a5', name: 'brief.pdf', size: 1_204_822, type: 'application/pdf', icon: '📄' },
	{ id: 'a6', name: 'demo-reel.mp4', size: 24_512_000, type: 'video/mp4', icon: '🎬' },
])
const trayHost = useTemplateRef<HTMLElement>('trayHost')
const traySource = useDrag<DragAttachment>(trayHost, {
	items: tray,
	// The tray is a source, never a drop target. We don't want a drop
	// onto a tray row to be interpreted as a reorder — that's not what
	// a "library" surface means.
	target: false,
	// Plain-click selection isn't needed here; the gesture is "grab and
	// move" only.
	select: false,
})
const dropZone = useTemplateRef<HTMLElement>('dropZone')
const outbox = ref<readonly DragAttachment[]>([])
const outboxIds = computed(() => new Set(outbox.value.map((a) => a.id)))
const drop = useDrop(dropZone, {
	on: {
		drop: () => {
			const indices = [...traySource.indices.value]
			if (indices.length === 0) return // drop came from outside the tray
			const next: DragAttachment[] = []
			for (const i of indices) {
				const item = tray.value[i]
				if (item && !outboxIds.value.has(item.id)) next.push(item)
			}
			if (next.length === 0) return
			outbox.value = [...outbox.value, ...next]
		},
	},
})
const removeFromOutbox = (id: string): void => {
	outbox.value = outbox.value.filter((a) => a.id !== id)
}
const clearOutbox = (): void => {
	outbox.value = []
}
</script>

<template>
	<section id="use-drag-intro">
		<hgroup>
			<h1>useDrag / useDrop</h1>
			<p>
				HTML5 Drag-and-Drop composables. <code>useDrag</code> turns a container's direct
				<code>[data-index]</code> children into a draggable, selectable, reorderable set;
				<code>useDrop</code> is the standalone drop-target. Compose them when a drag needs to cross
				a zone boundary — a tray into a basket, a message into a folder, an attachment into an
				outbox.
			</p>
		</hgroup>
		<p>
			These wrap the platform DnD contract — OS-painted drag image, OS-controlled cursor, browser-
			issued <code>dataTransfer</code> — and add the four concerns native DnD leaves to the
			consumer: a selection model (Ctrl / Shift), hit-test class painting (<code>.drop-target</code>
			/ <code>.drop-indicator-before</code> / <code>.drop-indicator-after</code>), in-place list
			splicing on drop, and a <code>.drag-handle</code> opt-in so the grab area can be narrowed
			without losing the rest of the row's interactivity.
		</p>
		<p>
			Not the right tool for <strong>continuous manipulation</strong> — splitters, sliders, 2D pads,
			scrub bars. HTML5 DnD's event cadence is ~50–100 ms (animation-frame manipulation needs every
			frame), the drag ghost is OS-painted (can't be suppressed), and the cursor is browser-
			controlled. Reach for <a href="#/use-pointer"><code>usePointer</code></a> there.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong> reorder dragging
				<code>{{ reorder.dragging.value ? 'yes' : 'no' }}</code> · selection
				<code>{{ selectionCount }}</code> · tray dragging
				<code>{{ traySource.dragging.value ? 'yes' : 'no' }}</code> · outbox over
				<code>{{ drop.over.value ? 'yes' : 'no' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-drag-reorder">
		<h2>1. Reorderable list — default contract</h2>
		<p>
			Drag any row up or down. The hit-test class painting is doing the work: the row under the
			cursor gets <code>.drop-target</code> plus either <code>.drop-indicator-before</code> or
			<code>.drop-indicator-after</code> based on which half of the target row your pointer is over.
			On drop, <code>useDrag</code> splices <code>reorderList</code> in place — Vue's reactivity
			carries the new order to the template.
		</p>
		<p>
			Every row is fully draggable (no <code>.drag-handle</code>), and clicking a row also selects
			it (the framework's default for list rows that double as selectable items). Try dragging a
			single row, then Ctrl/Cmd-click to multi-select and drag the set.
		</p>
		<ol ref="reorderHost" class="showcase-track-list">
			<li
				v-for="(track, index) in reorderList"
				:key="track.id"
				:data-index="index"
				class="showcase-track-row"
			>
				<span class="showcase-track-index">{{ index + 1 }}</span>
				<span class="showcase-track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="showcase-track-duration">
					<small>{{ track.duration }}</small>
				</span>
			</li>
		</ol>
		<small v-if="reorderLog.length > 0" class="block mt-2">
			Log: {{ reorderLog.join(' · ') }}
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const list = ref&lt;Track[]&gt;([...])
const host = useTemplateRef&lt;HTMLElement&gt;('host')
useDrag&lt;Track&gt;(host, {
  list,
  on: {
    reorder: (event) =&gt; {
      const { from, to } = event.detail
      // list is already spliced in place; this is observation-only.
    },
  },
})

// &lt;ol ref="host"&gt;
//   &lt;li v-for="(t, i) in list" :key="t.id" :data-index="i"&gt;…&lt;/li&gt;
// &lt;/ol&gt;</code></pre>
		</details>
	</section>

	<section id="use-drag-handle">
		<h2>2. <code>.drag-handle</code> — narrow the grab area</h2>
		<p>
			Add <code>.drag-handle</code> to a descendant of a row and <code>useDrag</code> flips the row
			itself to <code>draggable="false"</code>, hoisting <code>draggable="true"</code> onto the
			handle only. The rest of the row stays clickable, focusable, selectable — useful when rows
			carry buttons, links, or inputs that shouldn't compete with the drag gesture.
		</p>
		<p>
			Try it: the grip column on the left starts a drag; the play button on the right (wrapped in
			<code>.no-drag</code> for belt-and-suspenders) still clicks without ever beginning a drag.
		</p>
		<menu ref="handleHost" class="showcase-track-list">
			<li
				v-for="(track, index) in handleList"
				:key="track.id"
				:data-index="index"
				class="showcase-track-row"
			>
				<span class="showcase-drag-handle" aria-label="Reorder track" title="Drag to reorder"
					>⋮⋮</span
				>
				<span class="showcase-track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="showcase-track-duration">
					<small>{{ track.duration }}</small>
				</span>
				<button
					type="button"
					class="subtle no-drag"
					:aria-pressed="handlePlayed === track.id"
					@click="handlePlayed = handlePlayed === track.id ? null : track.id"
				>
					{{ handlePlayed === track.id ? 'Pause' : 'Play' }}
				</button>
			</li>
		</menu>
		<small v-if="handlePlayed" class="block mt-2">
			Playing:
			<strong>{{ handleList.find((t) => t.id === handlePlayed)?.title }}</strong>
			— click never started a drag.
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// useDrag(host, { list })
// &lt;li :data-index="i"&gt;
//   &lt;span class="showcase-drag-handle"&gt;⋮⋮&lt;/span&gt;
//   &lt;span&gt;...content...&lt;/span&gt;
//   &lt;button class="no-drag" @click="..."&gt;Play&lt;/button&gt;
// &lt;/li&gt;</code></pre>
		</details>
	</section>

	<section id="use-drag-multiselect">
		<h2>3. Multi-select drag — drag the entire selection</h2>
		<p>
			Plain click replaces the selection; Ctrl/Cmd-click toggles a row in or out; Shift-click
			extends the range from the anchor. Once you have a selection, dragging any row in it carries
			the whole set — the factory ships the multi-row contract for free, including non-contiguous
			selections (try Ctrl/Cmd-clicking rows 1, 3, and 5 then dragging row 3).
		</p>
		<p>
			Rows get <code>.selected</code> while selected (independent of <code>.dragging</code>), so the
			visual states are stylable separately.
		</p>
		<ol ref="selectionHost" class="showcase-track-list">
			<li
				v-for="(track, index) in selectionList"
				:key="track.id"
				:data-index="index"
				class="showcase-track-row"
				:aria-selected="selection.selected.value.has(index) ? 'true' : 'false'"
			>
				<span class="showcase-track-index">{{ index + 1 }}</span>
				<span class="showcase-track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="showcase-track-duration">
					<small>{{ track.duration }}</small>
				</span>
			</li>
		</ol>
		<small class="block mt-2">
			<strong>{{ selectionCount }}</strong> selected
			<span v-if="selectionCount > 0">
				— indices [{{ [...selection.selected.value].sort((a, b) => a - b).join(', ') }}]
			</span>
			<span v-if="selection.dragging.value">· dragging</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const { selected, indices, dragging } = useDrag(host, { list })

// selected   — Set&lt;number&gt; of rows the user has selected (click model)
// indices    — Set&lt;number&gt; of rows currently being dragged (drag model)
// dragging   — Ref&lt;boolean&gt; true between dragstart and dragend

// Click handler is wired automatically; Ctrl + Shift behavior is built in.
// Rows get .selected and (during drag) .dragging classes written for you.</code></pre>
		</details>
	</section>

	<section id="use-drag-zone">
		<h2>4. Cross-zone drag — <code>useDrag</code> source + <code>useDrop</code> target</h2>
		<p>
			The two composables compose: a <code>useDrag</code> source on one container and a
			<code>useDrop</code> target on another. Drag an item from the
			<strong>attachment library</strong> below into the <strong>outbox</strong> on the right; the
			item is appended to the outbox without leaving the library (the library uses
			<code>items</code> — a read-only source contract — so the original collection is stable).
		</p>
		<p>
			There's no need for a custom <code>dataTransfer</code> MIME type for in-app coordination — the
			drop handler reads <code>traySource.indices.value</code> (the currently-dragged set from the
			source's <code>useDrag</code>) and resolves the items locally. External drags (OS files, page
			text) leave that ref empty so the handler short-circuits. The <code>over</code> ref on the
			drop zone still flips for any compatible hover, which the <code>relatedTarget</code>-aware
			factory tracks correctly across nested children.
		</p>
		<div class="showcase-cross-zone">
			<section ref="trayHost" class="showcase-tray" aria-label="Attachment library">
				<h6>Attachment library</h6>
				<article
					v-for="(item, index) in tray"
					:key="item.id"
					:data-index="index"
					class="showcase-tray-item"
					:aria-disabled="outboxIds.has(item.id) ? 'true' : 'false'"
				>
					<span class="showcase-tray-icon" aria-hidden="true">{{ item.icon }}</span>
					<span class="showcase-tray-meta">
						<strong>{{ item.name }}</strong>
						<small>{{ item.type }} · {{ formatSize(item.size) }}</small>
					</span>
					<small v-if="outboxIds.has(item.id)" class="showcase-tray-status">in outbox</small>
				</article>
			</section>
			<section
				ref="dropZone"
				class="showcase-drop-zone"
				:class="{ active: drop.over.value, busy: traySource.dragging.value }"
				aria-label="Outbox"
			>
				<header class="showcase-drop-zone-prompt">
					<strong v-if="drop.over.value">Release to attach</strong>
					<strong v-else-if="traySource.dragging.value">Drop here to attach</strong>
					<strong v-else>Outbox</strong>
					<small> drag from the library — already-attached items are ignored on re-drop </small>
				</header>
				<ul v-if="outbox.length > 0" class="showcase-drop-zone-files">
					<li v-for="item in outbox" :key="item.id">
						<span aria-hidden="true">{{ item.icon }}</span>
						<span class="showcase-tray-meta">
							<strong>{{ item.name }}</strong>
							<small>{{ item.type }} · {{ formatSize(item.size) }}</small>
						</span>
						<button
							type="button"
							class="subtle"
							aria-label="Remove attachment"
							@click="removeFromOutbox(item.id)"
						>
							×
						</button>
					</li>
				</ul>
				<p v-else class="showcase-drop-zone-empty">
					<small>No attachments yet.</small>
				</p>
			</section>
		</div>
		<menu v-if="outbox.length > 0" class="mt-3">
			<li>
				<button type="button" class="subtle" @click="clearOutbox">Clear outbox</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const tray = ref&lt;readonly Attachment[]&gt;([...])
const outbox = ref&lt;readonly Attachment[]&gt;([])

const source = useDrag&lt;Attachment&gt;(trayRef, {
  items: tray,
  target: false, // tray accepts no drops itself
  select: false, // grab-and-move only, no click selection
})

useDrop(zoneRef, {
  on: {
    drop: () =&gt; {
      const indices = [...source.indices.value]
      if (indices.length === 0) return // external drag — ignore
      outbox.value = [...outbox.value, ...indices.map((i) =&gt; tray.value[i])]
    },
  },
})</code></pre>
		</details>
	</section>

	<section id="use-drag-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useDrag&lt;T&gt;(elementRef, options?): UseDragReturn</code></dt>
			<dd>
				Vue composable. <code>elementRef</code> is a
				<code>Ref&lt;HTMLElement | null&gt;</code> pointing at a container whose direct children
				carry <code>data-index</code> attributes. Element-agnostic — works on
				<code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;menu&gt;</code>,
				<code>&lt;tbody&gt;</code>, or a generic <code>&lt;div&gt;</code>.
			</dd>
			<dt><code>options.list</code></dt>
			<dd>
				<code>Ref&lt;T[]&gt;</code>. Reactive list the factory splices on a successful drop. Mutated
				in place — Vue's reactivity does the rest. When omitted, <code>useDrag</code> still wires
				the drag-source / drop-target events but skips the splice; consume <code>on.drop</code> or
				<code>on.reorder</code> yourself.
			</dd>
			<dt><code>options.items</code></dt>
			<dd>
				<code>Ref&lt;readonly T[]&gt;</code>. Read-only source contract. Use when the container is a
				stable library / palette that emits items into other zones via cross-zone drag, without
				being mutated itself. Mutually exclusive with <code>list</code> in practice — pick one.
			</dd>
			<dt><code>options.source</code> / <code>options.target</code></dt>
			<dd>
				<code>boolean</code>. Explicit overrides for the auto-derived source / target roles. Set
				<code>target: false</code> on a library-style source to prevent its rows from also accepting
				drops (otherwise the factory would let you drop a tray row onto itself).
			</dd>
			<dt><code>options.axis</code></dt>
			<dd>
				<code>'vertical' | 'horizontal'</code> (default <code>'vertical'</code>). Picks the axis
				used to decide <code>before</code> vs <code>after</code> hit-test within a target row.
			</dd>
			<dt><code>options.select</code></dt>
			<dd>
				<code>boolean</code> (default <code>true</code>). When false, click-to-select is disabled —
				rows still drag, but only via the multi-row API (<code>useDrag(...).select(index)</code>).
			</dd>
			<dt><code>options.effect</code></dt>
			<dd>
				<code>{ allowed?, drop? }</code>. Pass-through to the platform
				<code>dataTransfer.effectAllowed</code> + <code>dropEffect</code> tokens. Use
				<code>{ drop: 'copy' }</code> for upload zones, <code>{ drop: 'move' }</code> for cross-
				container reorder.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>Partial&lt;UseDragEventMap&gt;</code>: <code>tap</code>, <code>start</code>,
				<code>over</code>, <code>drop</code>, <code>end</code>, <code>reorder</code>. Each fires as
				a <code>CustomEvent</code> carrying the matching detail type.
			</dd>
			<dt><code>UseDragReturn.dragging</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code> — true between <code>dragstart</code> and
				<code>dragend</code> for any row in the container.
			</dd>
			<dt><code>UseDragReturn.indices</code> / <code>.selected</code></dt>
			<dd>
				Both <code>Readonly&lt;Ref&lt;ReadonlySet&lt;number&gt;&gt;&gt;</code>.
				<code>indices</code> reflects the dragged set (only populated mid-drag);
				<code>selected</code> reflects the click selection (persists across drags).
			</dd>
			<dt><code>UseDragReturn.target</code> / <code>.position</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;number | null&gt;&gt;</code> +
				<code>Readonly&lt;Ref&lt;DropPosition | null&gt;&gt;</code>. The row index under the cursor
				+ whether the drop would land <code>before</code>, <code>after</code>, or
				<code>into</code> it.
			</dd>
			<dt><code>UseDragReturn.select(index, event?)</code> / <code>.tap(index, event?)</code></dt>
			<dd>
				Programmatic selection drivers (the click handler delegates to <code>select</code>
				internally). Pass an event to honor Ctrl/Shift modifiers; omit it for replace-selection
				semantics.
			</dd>
			<dt><code>UseDragReturn.clear()</code></dt>
			<dd>
				Clears the selection and resets in-flight drag state. Safe to call from inside
				<code>on.drop</code> or any handler.
			</dd>
			<dt>Written-back row classes</dt>
			<dd>
				<code>.dragging</code> · <code>.selected</code> · <code>.drop-target</code> ·
				<code>.drop-indicator-before</code> · <code>.drop-indicator-after</code>. Style these
				yourself — the framework deliberately does not theme drag affordances, since the surface
				varies wildly (table rows, menu items, kanban cards, file thumbnails).
			</dd>
			<dt>Per-row opt-in / opt-out classes</dt>
			<dd>
				<code>.drag-handle</code> on a descendant narrows the drag-start hit area to that descendant
				only. <code>.no-drag</code> on a descendant marks a region the row will not start a drag
				from (use on buttons, links, inputs inside a row).
			</dd>
			<dt><code>useDrop(elementRef, options?): UseDropReturn</code></dt>
			<dd>
				Standalone drop target. <code>options.accept</code> filters on
				<code>dataTransfer.types</code> — pass <code>['text/plain']</code> for in-app drags from
				<code>useDrag</code>, <code>['Files']</code> for OS file drops, or specific MIME types. When
				the source is another <code>useDrag</code> on the same page, the simplest pattern is to
				leave <code>accept</code> off and gate the handler on
				<code>source.indices.value.size &gt; 0</code> — that ref reads non-empty only while the
				source has a drag in flight, so external drags (OS files, text, other apps) short- circuit
				cleanly.
			</dd>
			<dt><code>UseDropReturn.over</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. True while a compatible drag is over the
				zone. Tracked via <code>relatedTarget</code>, so nested children do not cause it to flicker.
			</dd>
		</dl>
	</section>
</template>

<style scoped>
.showcase-track-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 0.25rem;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	padding: 0.5rem;
	background: var(--color-canvas);
}

.showcase-track-row {
	display: grid;
	grid-template-columns: 2rem 1fr auto auto;
	align-items: center;
	gap: 0.75rem;
	padding: 0.5rem 0.75rem;
	border-radius: 0.375rem;
	cursor: grab;
	user-select: none;
	transition:
		background-color 150ms ease,
		box-shadow 150ms ease,
		transform 150ms ease;
	position: relative;
}

.showcase-track-row:hover {
	background: color-mix(in oklch, var(--color-canvas-strong) 60%, transparent);
}

.showcase-track-row.selected {
	background: color-mix(in oklch, var(--color-primary) 12%, transparent);
	box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent);
}

.showcase-track-row.dragging {
	opacity: 0.4;
}

.showcase-track-row.drop-target.drop-indicator-before::before,
.showcase-track-row.drop-target.drop-indicator-after::after {
	content: '';
	position: absolute;
	inset-inline: 0.5rem;
	block-size: 2px;
	background: var(--color-primary);
	border-radius: 2px;
	pointer-events: none;
}

.showcase-track-row.drop-indicator-before::before {
	inset-block-start: -2px;
}

.showcase-track-row.drop-indicator-after::after {
	inset-block-end: -2px;
}

.showcase-track-row .showcase-drag-handle {
	cursor: grab;
	font-family: monospace;
	letter-spacing: -0.1em;
	color: var(--color-text-subtle);
	user-select: none;
	padding-inline: 0.25rem;
}

.showcase-track-row .showcase-drag-handle:hover {
	color: var(--color-text);
}

.showcase-track-row .showcase-track-index {
	font-variant-numeric: tabular-nums;
	color: var(--color-text-subtle);
	font-size: 0.875rem;
	text-align: center;
}

.showcase-track-row .showcase-track-meta {
	display: flex;
	flex-direction: column;
	min-inline-size: 0;
}

.showcase-track-row .showcase-track-meta strong {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.showcase-track-row .showcase-track-duration {
	font-variant-numeric: tabular-nums;
	color: var(--color-text-subtle);
}

.showcase-cross-zone {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 1rem;
	align-items: stretch;
}

@media (max-width: 36rem) {
	.showcase-cross-zone {
		grid-template-columns: minmax(0, 1fr);
	}
}

.showcase-tray {
	display: grid;
	gap: 0.25rem;
	align-content: start;
	padding: 0.75rem;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	background: var(--color-canvas);
}

.showcase-tray h6 {
	margin: 0 0 0.25rem;
	color: var(--color-text-subtle);
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.showcase-tray-item {
	display: grid;
	grid-template-columns: 1.75rem minmax(0, 1fr) auto;
	gap: 0.5rem;
	align-items: center;
	padding: 0.5rem 0.625rem;
	border-radius: 0.375rem;
	background: var(--color-canvas-strong);
	cursor: grab;
	user-select: none;
	transition:
		background-color 150ms ease,
		opacity 150ms ease;
}

.showcase-tray-item:hover {
	background: color-mix(in oklch, var(--color-primary) 8%, var(--color-canvas-strong));
}

.showcase-tray-item.dragging {
	opacity: 0.45;
	cursor: grabbing;
}

.showcase-tray-item[aria-disabled='true'] {
	opacity: 0.6;
}

.showcase-tray-icon {
	font-size: 1.25rem;
	line-height: 1;
	text-align: center;
}

.showcase-tray-meta {
	display: flex;
	flex-direction: column;
	min-inline-size: 0;
}

.showcase-tray-meta strong {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.showcase-tray-meta small {
	color: var(--color-text-subtle);
	font-variant-numeric: tabular-nums;
}

.showcase-tray-status {
	color: var(--color-text-subtle);
	font-style: italic;
	white-space: nowrap;
}

.showcase-drop-zone {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	min-block-size: 12rem;
	padding: 1rem;
	border: 2px dashed var(--color-border);
	border-radius: 0.5rem;
	background: var(--color-canvas);
	transition:
		border-color 150ms ease,
		background-color 150ms ease;
}

.showcase-drop-zone.busy {
	border-color: color-mix(in oklch, var(--color-primary) 60%, var(--color-border));
}

.showcase-drop-zone.active {
	border-color: var(--color-primary);
	border-style: solid;
	background: color-mix(in oklch, var(--color-primary) 8%, var(--color-canvas));
}

.showcase-drop-zone-prompt {
	display: grid;
	gap: 0.125rem;
	text-align: start;
	padding-block-end: 0.25rem;
	border-block-end: 1px dashed var(--color-border);
}

.showcase-drop-zone-prompt small {
	color: var(--color-text-subtle);
}

.showcase-drop-zone-empty {
	margin: 0;
	color: var(--color-text-subtle);
}

.showcase-drop-zone-files {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 0.25rem;
}

.showcase-drop-zone-files li {
	display: grid;
	grid-template-columns: 1.75rem minmax(0, 1fr) auto;
	gap: 0.5rem;
	align-items: center;
	padding: 0.375rem 0.625rem;
	background: var(--color-canvas-strong);
	border-radius: 0.375rem;
}

.showcase-drop-zone-files li > span[aria-hidden='true'] {
	font-size: 1.25rem;
	line-height: 1;
	text-align: center;
}

.showcase-drop-zone-files li button {
	padding-inline: 0.5rem;
	font-size: 1rem;
	line-height: 1;
}
</style>
