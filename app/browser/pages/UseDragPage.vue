<script lang="ts" setup>
import { ref } from 'vue'
import { useDrag } from '@src/browser'

const initial = ['Inbox', 'Projects', 'Reports', 'Archive', 'Trash']
const items = ref<string[]>([...initial])
const listRef = ref<HTMLElement | null>(null)
const drag = useDrag<string>(listRef, { list: items })

const resetItems = (): void => {
	items.value = [...initial]
	drag.clear()
}

const tasks = ref(['Step 1 — research', 'Step 2 — design', 'Step 3 — implement', 'Step 4 — review'])
const tasksRef = ref<HTMLElement | null>(null)
useDrag<string>(tasksRef, { list: tasks })

const log = ref<{ at: string; kind: string; info?: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const loggedItems = ref(['Alpha', 'Bravo', 'Charlie', 'Delta'])
const loggedRef = ref<HTMLElement | null>(null)
useDrag<string>(loggedRef, {
	list: loggedItems,
	on: {
		tap: (event) =>
			log.value.unshift({ at: stamp(), kind: 'tap', info: `index ${event.detail.index}` }),
		start: (event) =>
			log.value.unshift({
				at: stamp(),
				kind: 'start',
				info: `[${[...event.detail.indices].join(',')}]`,
			}),
		over: (event) =>
			log.value.unshift({
				at: stamp(),
				kind: 'over',
				info: `${event.detail.position}@${event.detail.index}`,
			}),
		drop: () => log.value.unshift({ at: stamp(), kind: 'drop' }),
		end: () => log.value.unshift({ at: stamp(), kind: 'end' }),
		reorder: (event) =>
			log.value.unshift({ at: stamp(), kind: 'reorder', info: `→ ${event.detail.toIndex}` }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useDrag</h1>
			<p>
				Native HTML5 drag-and-drop on a container. Direct <code>[data-index]</code> children become
				drag sources <em>and</em> drop targets. Owns <code>.dragging</code>, <code>.selected</code>,
				<code>.drop-target</code>, and the insertion-line indicators.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useDrag&lt;T&gt;(elementRef, options?): { dragging, indices, selected, target, position, select(), tap(), clear() }</code></pre>
		</section>

		<section id="sortable">
			<h2>Sortable list</h2>
			<p class="showcase-caption">
				Click to select; <kbd>Ctrl</kbd>-click multi-selects; <kbd>Shift</kbd>-click range-selects.
				Drag a row to reorder — <code>list</code> is spliced for you.
			</p>
			<div class="showcase-row">
				<small
					>{{ items.length }} item{{ items.length !== 1 ? 's' : '' }} ·
					{{ drag.selected.value.size }} selected</small
				>
				<button type="button" class="ghost small" @click="resetItems">Reset</button>
			</div>
			<ul ref="listRef">
				<li v-for="(item, i) in items" :key="item" class="draggable" :data-index="i">
					<span>{{ item }}</span>
					<small>#{{ i + 1 }}</small>
				</li>
			</ul>
		</section>

		<section id="handles">
			<h2>Drag handles &amp; <code>.no-drag</code></h2>
			<p class="showcase-caption">
				<code>.drag-handle</code> scopes the grab cursor; <code>.no-drag</code> on a child cancels
				dragstart and tap-select so action buttons inside a row never start a drag.
			</p>
			<ul ref="tasksRef">
				<li v-for="(item, i) in tasks" :key="item" class="draggable" :data-index="i">
					<span class="drag-handle" aria-label="Drag to reorder">≡</span>
					<span>{{ item }}</span>
					<button type="button" class="small no-drag" @click.stop>…</button>
				</li>
			</ul>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>start → over* → drop/reorder → end</code> for drags; plain click fires
				<code>tap</code>.
			</p>
			<ul ref="loggedRef">
				<li v-for="(item, i) in loggedItems" :key="item" class="draggable" :data-index="i">
					<span>{{ item }}</span>
				</li>
			</ul>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> {{ e.info ?? '' }} — {{ e.at }}
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
						<td><code>list</code></td>
						<td><code>Ref&lt;T[]&gt;</code></td>
						<td>Mutable — spliced on in-list reorder.</td>
					</tr>
					<tr>
						<td><code>items</code></td>
						<td><code>Ref&lt;readonly T[]&gt;</code></td>
						<td>Readonly source for tracking only.</td>
					</tr>
					<tr>
						<td><code>axis</code></td>
						<td><code>'vertical' | 'horizontal'</code></td>
						<td>Selects hit-zone math.</td>
					</tr>
					<tr>
						<td><code>auto</code></td>
						<td><code>boolean</code></td>
						<td>Sets <code>row.draggable = true</code>. Default <code>true</code>.</td>
					</tr>
					<tr>
						<td><code>select</code></td>
						<td><code>boolean</code></td>
						<td>Tap-select on click. Default <code>true</code>.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:drag:tap</code></td>
						<td><code>DragTapDetail</code></td>
					</tr>
					<tr>
						<td><code>elements:drag:start</code></td>
						<td><code>DragStartDetail</code></td>
					</tr>
					<tr>
						<td><code>elements:drag:over</code></td>
						<td><code>DragOverDetail</code></td>
					</tr>
					<tr>
						<td><code>elements:drag:drop</code></td>
						<td><code>DragDropDetail</code></td>
					</tr>
					<tr>
						<td><code>elements:drag:end</code></td>
						<td><code>DragEndDetail</code></td>
					</tr>
					<tr>
						<td><code>elements:drag:reorder</code></td>
						<td><code>DragReorderDetail</code></td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
