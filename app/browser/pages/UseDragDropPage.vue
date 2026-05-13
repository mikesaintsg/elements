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
 * — for cases that aren't list reordering (file uploads, app-to-app
 * drops). `over` flips while a compatible drag hovers; `accept` filters
 * on data-transfer types (`['Files']`, `['text/plain']`, MIME types).
 *
 * When you'd reach for these:
 *   - List/table reorder with the platform-default ghost.
 *   - File-drop upload zones.
 *   - App-to-app drops crossing tab/window boundaries (browser-issued
 *     drag image, OS-controlled cursor — those are features here).
 *   - Anything where "data crosses a zone boundary" is the semantic.
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
 *   4. File drop zone via `useDrop` — `accept: ['Files']` filter.
 *   5. `on.reorder` callback — observe the in-list mutation.
 *
 * Cross-references:
 *   - [UsePointerPage](#/use-pointer) — continuous-manipulation
 *     primitives belong there; the two composables are complementary,
 *     not redundant.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useDrag, useDrop } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Shared row shape.
// ─────────────────────────────────────────────────────────────────────
interface Track {
	readonly id: string
	readonly title: string
	readonly artist: string
	readonly duration: string
}

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — reorderable list, default contract.
// `list` ref + auto `[data-index]` reads. Every row is fully draggable.
// ─────────────────────────────────────────────────────────────────────
const reorderList = ref<Track[]>([
	{ id: 't1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 't2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 't3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 't4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
	{ id: 't5', title: 'Weightless', artist: 'Marconi Union', duration: '8:10' },
])
const reorderHost = useTemplateRef<HTMLElement>('reorderHost')
const reorderLog = ref<string[]>([])
const reorder = useDrag<Track>(reorderHost, {
	list: reorderList,
	on: {
		reorder: (event) => {
			const detail = event.detail as { fromIndices: number[]; toIndex: number }
			const moved = detail.fromIndices.length
			reorderLog.value = [
				...reorderLog.value.slice(-3),
				`Moved ${moved} item${moved === 1 ? '' : 's'} → index ${detail.toIndex}`,
			]
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — `.drag-handle` opt-in.
// Only the grip column starts a drag. The rest of the row stays
// interactive (buttons click, text selects, links navigate) — useful
// when rows host their own affordances.
// ─────────────────────────────────────────────────────────────────────
const handleList = ref<Track[]>([
	{ id: 'h1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 'h2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 'h3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 'h4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
])
const handleHost = useTemplateRef<HTMLElement>('handleHost')
const handlePlayed = ref<string | null>(null)
useDrag<Track>(handleHost, { list: handleList })

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — multi-select drag.
// Click rows with Ctrl/Cmd to toggle, Shift to extend the range. Then
// drag any selected row — the entire selection moves together. `tap()`
// from the composable is exposed if you want to drive selection from
// keyboard handlers or external buttons; here the factory's built-in
// click handler does it for us.
// ─────────────────────────────────────────────────────────────────────
const selectionList = ref<Track[]>([
	{ id: 's1', title: 'Strobe', artist: 'deadmau5', duration: '10:34' },
	{ id: 's2', title: 'Midnight City', artist: 'M83', duration: '4:03' },
	{ id: 's3', title: 'Teardrop', artist: 'Massive Attack', duration: '5:30' },
	{ id: 's4', title: 'Porcelain', artist: 'Moby', duration: '4:01' },
	{ id: 's5', title: 'Weightless', artist: 'Marconi Union', duration: '8:10' },
	{ id: 's6', title: 'Svefn-g-englar', artist: 'Sigur Rós', duration: '10:04' },
])
const selectionHost = useTemplateRef<HTMLElement>('selectionHost')
const selection = useDrag<Track>(selectionHost, { list: selectionList })
const selectionCount = computed(() => selection.selected.value.size)

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — file drop zone via `useDrop`.
// `accept: ['Files']` filters to OS file drags. The `over` ref flips
// while a compatible drag is overhead so the zone can paint its
// "release to drop" state without manually tracking dragenter/leave +
// nested-children edge cases (the factory uses relatedTarget for
// that).
// ─────────────────────────────────────────────────────────────────────
interface DroppedFile {
	readonly name: string
	readonly size: number
	readonly type: string
}
const dropZone = useTemplateRef<HTMLElement>('dropZone')
const droppedFiles = ref<DroppedFile[]>([])
const drop = useDrop(dropZone, {
	accept: ['Files'],
	on: {
		drop: (event) => {
			const files = event.dataTransfer?.files
			if (!files) return
			const next: DroppedFile[] = []
			for (let i = 0; i < files.length; i++) {
				const f = files.item(i)
				if (f) next.push({ name: f.name, size: f.size, type: f.type || 'unknown' })
			}
			droppedFiles.value = [...droppedFiles.value, ...next].slice(-8)
		},
	},
})
const formatSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
const clearFiles = (): void => {
	droppedFiles.value = []
}
</script>

<template>
	<section id="use-drag-drop-intro">
		<hgroup>
			<h1>useDrag / useDrop</h1>
			<p>
				HTML5 Drag-and-Drop composables. <code>useDrag</code> turns a container's direct
				<code>[data-index]</code> children into a draggable, selectable, reorderable set;
				<code>useDrop</code> is the standalone drop-target for everything that isn't list reorder —
				file uploads, app-to-app drops.
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
				<code>{{ selectionCount }}</code> · drop zone over
				<code>{{ drop.over.value ? 'yes' : 'no' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-drag-drop-reorder">
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
		<ol ref="reorderHost" class="track-list">
			<li
				v-for="(track, index) in reorderList"
				:key="track.id"
				:data-index="index"
				class="track-row"
			>
				<span class="track-index">{{ index + 1 }}</span>
				<span class="track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="track-duration">
					<small>{{ track.duration }}</small>
				</span>
			</li>
		</ol>
		<small v-if="reorderLog.length > 0" style="margin-block-start: 0.5rem; display: block">
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
      const { fromIndices, toIndex } = event.detail
      // list is already spliced in place; this is observation-only.
    },
  },
})

// &lt;ol ref="host"&gt;
//   &lt;li v-for="(t, i) in list" :key="t.id" :data-index="i"&gt;…&lt;/li&gt;
// &lt;/ol&gt;</code></pre>
		</details>
	</section>

	<section id="use-drag-drop-handle">
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
		<menu ref="handleHost" class="track-list">
			<li
				v-for="(track, index) in handleList"
				:key="track.id"
				:data-index="index"
				class="track-row"
			>
				<span class="drag-handle" aria-label="Reorder track" title="Drag to reorder">⋮⋮</span>
				<span class="track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="track-duration">
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
		<small v-if="handlePlayed" style="margin-block-start: 0.5rem; display: block">
			Playing:
			<strong>{{ handleList.find((t) => t.id === handlePlayed)?.title }}</strong>
			— click never started a drag.
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// useDrag(host, { list })
// &lt;li :data-index="i"&gt;
//   &lt;span class="drag-handle"&gt;⋮⋮&lt;/span&gt;
//   &lt;span&gt;...content...&lt;/span&gt;
//   &lt;button class="no-drag" @click="..."&gt;Play&lt;/button&gt;
// &lt;/li&gt;</code></pre>
		</details>
	</section>

	<section id="use-drag-drop-multiselect">
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
		<ol ref="selectionHost" class="track-list">
			<li
				v-for="(track, index) in selectionList"
				:key="track.id"
				:data-index="index"
				class="track-row"
				:aria-selected="selection.selected.value.has(index) ? 'true' : 'false'"
			>
				<span class="track-index">{{ index + 1 }}</span>
				<span class="track-meta">
					<strong>{{ track.title }}</strong>
					<small>{{ track.artist }}</small>
				</span>
				<span class="track-duration">
					<small>{{ track.duration }}</small>
				</span>
			</li>
		</ol>
		<small style="margin-block-start: 0.5rem; display: block">
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

	<section id="use-drag-drop-zone">
		<h2>4. File drop zone — <code>useDrop</code> with type filter</h2>
		<p>
			Drag files from your OS file manager into the zone below.
			<code>useDrop(host, { accept: ['Files'] })</code> filters the drag to OS file drags via the
			<code>dataTransfer.types</code> contract — text drags, app drags, list-row drags all fail the
			predicate and never engage. The <code>over</code> ref flips while a compatible drag is
			overhead; the factory tracks it correctly across nested children via the platform
			<code>relatedTarget</code> field, so the zone doesn't flicker when the cursor crosses an
			internal element.
		</p>
		<div
			ref="dropZone"
			class="drop-zone"
			:class="{ active: drop.over.value }"
			role="region"
			aria-label="Drop files here"
		>
			<div class="drop-zone-prompt">
				<strong v-if="drop.over.value">Release to drop</strong>
				<strong v-else>Drag files here</strong>
				<small>
					or any number of files — the most recent
					<code>8</code> are kept
				</small>
			</div>
			<ul v-if="droppedFiles.length > 0" class="drop-zone-files">
				<li v-for="file in droppedFiles" :key="file.name + file.size">
					<strong>{{ file.name }}</strong>
					<small>{{ file.type }} · {{ formatSize(file.size) }}</small>
				</li>
			</ul>
		</div>
		<menu v-if="droppedFiles.length > 0" style="margin-block-start: 0.75rem">
			<li>
				<button type="button" class="subtle" @click="clearFiles">Clear list</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const { over } = useDrop(zone, {
  accept: ['Files'],
  on: {
    drop: (event) =&gt; {
      const files = event.dataTransfer?.files
      // ...read files, upload, etc.
    },
  },
})</code></pre>
		</details>
	</section>

	<section id="use-drag-drop-api">
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
				<code>dataTransfer.types</code> — pass <code>['Files']</code> for OS file drags,
				<code>['text/plain']</code> for text, or specific MIME types. <code>on.drop</code> receives
				the raw <code>DragEvent</code>; read <code>event.dataTransfer.files</code> or
				<code>event.dataTransfer.getData(type)</code> from there.
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
.track-list {
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

.track-row {
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

.track-row:hover {
	background: color-mix(in oklch, var(--color-canvas-strong) 60%, transparent);
}

.track-row.selected {
	background: color-mix(in oklch, var(--color-primary) 12%, transparent);
	box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 35%, transparent);
}

.track-row.dragging {
	opacity: 0.4;
}

.track-row.drop-target.drop-indicator-before::before,
.track-row.drop-target.drop-indicator-after::after {
	content: '';
	position: absolute;
	inset-inline: 0.5rem;
	block-size: 2px;
	background: var(--color-primary);
	border-radius: 2px;
	pointer-events: none;
}

.track-row.drop-indicator-before::before {
	inset-block-start: -2px;
}

.track-row.drop-indicator-after::after {
	inset-block-end: -2px;
}

.track-row .drag-handle {
	cursor: grab;
	font-family: monospace;
	letter-spacing: -0.1em;
	color: var(--color-text-subtle);
	user-select: none;
	padding-inline: 0.25rem;
}

.track-row .drag-handle:hover {
	color: var(--color-text);
}

.track-row .track-index {
	font-variant-numeric: tabular-nums;
	color: var(--color-text-subtle);
	font-size: 0.875rem;
	text-align: center;
}

.track-row .track-meta {
	display: flex;
	flex-direction: column;
	min-inline-size: 0;
}

.track-row .track-meta strong {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.track-row .track-duration {
	font-variant-numeric: tabular-nums;
	color: var(--color-text-subtle);
}

.drop-zone {
	display: grid;
	place-items: center;
	min-block-size: 9rem;
	padding: 1.5rem;
	border: 2px dashed var(--color-border);
	border-radius: 0.75rem;
	background: var(--color-canvas);
	transition:
		border-color 150ms ease,
		background-color 150ms ease;
	text-align: center;
}

.drop-zone.active {
	border-color: var(--color-primary);
	border-style: solid;
	background: color-mix(in oklch, var(--color-primary) 8%, var(--color-canvas));
}

.drop-zone-prompt {
	display: grid;
	gap: 0.25rem;
}

.drop-zone-files {
	list-style: none;
	margin: 1rem 0 0;
	padding: 0;
	display: grid;
	gap: 0.25rem;
	inline-size: 100%;
	max-inline-size: 32rem;
	text-align: start;
}

.drop-zone-files li {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.375rem 0.75rem;
	background: var(--color-canvas-strong);
	border-radius: 0.375rem;
}

.drop-zone-files li small {
	color: var(--color-text-subtle);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
</style>
