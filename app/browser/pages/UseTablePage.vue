<script lang="ts" setup>
import { ref } from 'vue'
import { useTable } from '@src/browser'

// === Read-only seed ===
const tableRef = ref<HTMLTableElement | null>(null)
const table = useTable(tableRef, {
	caption: 'Team roster',
	columns: [
		{ key: 'name', title: 'Name' },
		{ key: 'role', title: 'Role' },
		{ key: 'team', title: 'Team' },
	],
	headers: ['Name', 'Role', 'Team'],
	rows: [
		['Ada Lovelace', 'Engineer', 'Core'],
		['Grace Hopper', 'Director', 'Compilers'],
		['Alan Turing', 'Researcher', 'Theory'],
		['Margaret Hamilton', 'Engineer', 'Apollo'],
	],
	selection: { strategy: 'page' },
})

// === Sortable columns ===
const sortableRef = ref<HTMLTableElement | null>(null)
const sortable = useTable(sortableRef, {
	columns: [
		{ key: 'fruit', title: 'Fruit', sortable: true },
		{ key: 'qty', title: 'Quantity', sortable: true },
	],
	headers: ['Fruit', 'Quantity'],
	rows: [
		['Apple', '12'],
		['Banana', '5'],
		['Cherry', '20'],
	],
})

// === Selection (page strategy) ===
const selectionRef = ref<HTMLTableElement | null>(null)
const selection = useTable(selectionRef, {
	caption: 'Pick the rows you want to act on',
	columns: [
		{ key: 'name', title: 'Name' },
		{ key: 'priority', title: 'Priority' },
	],
	headers: ['Name', 'Priority'],
	rows: [
		['Backup database', 'High'],
		['Refresh certificate', 'High'],
		['Rotate API keys', 'Medium'],
		['Vacuum logs', 'Low'],
		['Audit dependencies', 'Medium'],
	],
	selection: { strategy: 'page', click: true },
})

// === Multi-sort + mandate ===
const multiSortRef = ref<HTMLTableElement | null>(null)
const multiSort = useTable(multiSortRef, {
	columns: [
		{ key: 'team', title: 'Team', sortable: true },
		{ key: 'name', title: 'Name', sortable: true },
		{ key: 'tickets', title: 'Open tickets', sortable: true },
	],
	headers: ['Team', 'Name', 'Open tickets'],
	rows: [
		['Core', 'Ada', '3'],
		['Apollo', 'Margaret', '7'],
		['Theory', 'Alan', '5'],
		['Core', 'Linus', '1'],
		['Apollo', 'Buzz', '4'],
		['Theory', 'Kurt', '8'],
	],
	sort: { multiple: true, mandate: true },
})

// === Expansion ===
const expansionRef = ref<HTMLTableElement | null>(null)
const expansion = useTable(expansionRef, {
	columns: [
		{ key: 'order', title: 'Order' },
		{ key: 'customer', title: 'Customer' },
		{ key: 'total', title: 'Total' },
	],
	headers: ['Order', 'Customer', 'Total'],
	rows: [
		['#1042', 'Ada Lovelace', '$1,289'],
		['#1043', 'Grace Hopper', '$987'],
		['#1044', 'Alan Turing', '$2,114'],
		['#1045', 'Margaret Hamilton', '$556'],
	],
	expansion: { multiple: true },
})

// === Single-expansion ===
const singleExpansionRef = ref<HTMLTableElement | null>(null)
const singleExpansion = useTable(singleExpansionRef, {
	columns: [
		{ key: 'feature', title: 'Feature' },
		{ key: 'status', title: 'Status' },
	],
	headers: ['Feature', 'Status'],
	rows: [
		['Theme switcher', 'Live'],
		['Composable audit', 'In review'],
		['Carousel chrome', 'Shipped'],
	],
	expansion: { multiple: false },
})

// === Pagination ===
const paginationRef = ref<HTMLTableElement | null>(null)
const allOrders = Array.from({ length: 47 }, (_, i) => [
	`Order #${1000 + i}`,
	['Pending', 'Shipped', 'Delivered'][i % 3] ?? 'Pending',
	`$${(Math.random() * 5000 + 100).toFixed(0)}`,
])
const pagination = useTable(paginationRef, {
	columns: [
		{ key: 'order', title: 'Order' },
		{ key: 'status', title: 'Status' },
		{ key: 'total', title: 'Total' },
	],
	headers: ['Order', 'Status', 'Total'],
	rows: allOrders,
	size: 10,
	total: allOrders.length,
})

// === Row mutations ===
const rowMutateRef = ref<HTMLTableElement | null>(null)
const rowMutate = useTable(rowMutateRef, {
	columns: [
		{ key: 'name', title: 'Name' },
		{ key: 'role', title: 'Role' },
	],
	headers: ['Name', 'Role'],
	rows: [
		['Ada', 'Engineer'],
		['Grace', 'Director'],
	],
})
const newName = ref('')
const newRole = ref('')
const appendRow = (): void => {
	if (!newName.value) return
	rowMutate.rows.append([newName.value, newRole.value || 'Engineer'])
	newName.value = ''
	newRole.value = ''
}
const popRow = (): void => {
	const count = rowMutate.rows.count.value
	if (count > 0) rowMutate.rows.remove(count - 1)
}

// === Cell mutations ===
const cellMutateRef = ref<HTMLTableElement | null>(null)
const cellMutate = useTable(cellMutateRef, {
	columns: [
		{ key: 'metric', title: 'Metric' },
		{ key: 'value', title: 'Value' },
	],
	headers: ['Metric', 'Value'],
	rows: [
		['Active users', '12,400'],
		['Free plan', '8,200'],
		['Pro plan', '4,200'],
	],
})
const bumpFirstValue = (): void => {
	const cur = cellMutate.cells.read({ row: 0, column: 1 })
	const next = (Number(cur.replace(/,/g, '')) + 100).toLocaleString()
	cellMutate.cells.write({ row: 0, column: 1 }, next)
}

// === Live events ===
const liveRef = ref<HTMLTableElement | null>(null)
const log = ref<{ at: string; kind: string; info?: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const live = useTable(liveRef, {
	columns: [
		{ key: 'name', title: 'Name', sortable: true },
		{ key: 'tickets', title: 'Tickets', sortable: true },
	],
	headers: ['Name', 'Tickets'],
	rows: [
		['Ada', '3'],
		['Grace', '7'],
		['Alan', '5'],
	],
	selection: { strategy: 'page', click: true },
	on: {
		sort: (event) =>
			log.value.unshift({
				at: stamp(),
				kind: 'sort',
				info: JSON.stringify(event.detail.columns),
			}),
		select: (event) =>
			log.value.unshift({
				at: stamp(),
				kind: 'select',
				info: `${event.detail.ids.length} selected`,
			}),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useTable</h1>
			<p>
				Native <code>&lt;table&gt;</code> controller. Mirrors the platform's structure
				(<code>caption</code>, <code>thead</code>, <code>tbody</code>, <code>tfoot</code>) and adds
				reactive sub-domains for headers, rows, cells, sort, expansion, selection, focus, and
				pagination — all driven by the host table's existing markup.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useTable(elementRef, options?): { caption, headers, rows, cells, footer, sort, expansion, selection, resize, focus, pagination }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic table</h2>
			<p class="showcase-caption">
				Bare seed — caption, headers, rows. The composable mirrors them onto the host
				<code>&lt;table&gt;</code> markup so screen readers see a real accessible table.
			</p>
			<table ref="tableRef"></table>
			<small>
				Rows: <code>{{ table.rows.count.value }}</code> · columns:
				<code>{{ table.columns.length }}</code>
			</small>
		</section>

		<section id="sort">
			<h2>Sortable columns</h2>
			<p class="showcase-caption">
				Click any header to cycle <code>none → asc → desc → none</code>; the composable rewrites row
				order in place (<code>sort.auto: true</code> by default) and mirrors <code>aria-sort</code>.
			</p>
			<table ref="sortableRef"></table>
		</section>

		<section id="selection">
			<h2>Selection (page strategy)</h2>
			<p class="showcase-caption">
				Click rows to toggle, <kbd>Ctrl</kbd>-click to multi-select, <kbd>Shift</kbd>-click to
				range-select. With <code>selection.strategy: 'page'</code>, the selection lives on the
				visible page only.
			</p>
			<table ref="selectionRef"></table>
			<small>
				Selected: <code>{{ selection.selection.ids.size }}</code> rows.
				<button type="button" class="ghost small" @click="selection.selection.clear()">
					Clear
				</button>
			</small>
		</section>

		<section id="multi-sort">
			<h2>Multi-sort + mandate</h2>
			<p class="showcase-caption">
				With <code>sort.multiple: true</code>, holding <kbd>Shift</kbd> while clicking a header adds
				it to the existing sort stack (instead of replacing). <code>sort.mandate: true</code> drops
				the "none" step from the cycle so you cycle <code>asc → desc → asc</code>.
			</p>
			<table ref="multiSortRef"></table>
			<small>
				Sort stack:
				<code>{{
					multiSort.sort.columns.value.map((c) => `${c.key}:${c.direction}`).join(', ') || 'none'
				}}</code>
			</small>
		</section>

		<section id="expansion">
			<h2>Expansion</h2>
			<p class="showcase-caption">
				Each row gets a click-to-expand affordance.
				<code>expansion.multiple: true</code> lets several rows be open at once.
			</p>
			<table ref="expansionRef"></table>
			<small>
				Expanded rows: <code>{{ expansion.expansion.expanded.size }}</code>
				<button type="button" class="ghost small" @click="expansion.expansion.clear()">
					Collapse all
				</button>
			</small>
		</section>

		<section id="single-expansion">
			<h2>Single-expansion mode</h2>
			<p class="showcase-caption">
				<code>expansion.multiple: false</code> — opening a row collapses any other open row. Useful
				for accordion-style detail panels in compact tables.
			</p>
			<table ref="singleExpansionRef"></table>
		</section>

		<section id="pagination">
			<h2>Pagination</h2>
			<p class="showcase-caption">
				Paginate large data sets via <code>size</code> + <code>total</code>. The composable's
				<code>pagination</code> sub-domain owns next / prev / jump.
			</p>
			<table ref="paginationRef"></table>
			<div class="showcase-row">
				<button type="button" @click="pagination.pagination.prev()">‹ prev</button>
				<small>
					page <code>{{ pagination.pagination.page.value }}</code> /
					<code>{{ pagination.pagination.count.value }}</code>
					({{ pagination.pagination.size.value }} per page)
				</small>
				<button type="button" @click="pagination.pagination.next()">next ›</button>
			</div>
		</section>

		<section id="row-mutations">
			<h2>Row mutations</h2>
			<p class="showcase-caption">
				<code>rows.append() / prepend() / insert() / remove() / move()</code> all live on the DOM
				<code>&lt;tbody&gt;</code> directly — no virtual list, no diff. Add a row, remove the last,
				see the table react.
			</p>
			<table ref="rowMutateRef"></table>
			<form @submit.prevent="appendRow">
				<label>Name <input v-model="newName" required /></label>
				<label>Role <input v-model="newRole" placeholder="Engineer" /></label>
				<div class="showcase-row">
					<button type="submit" class="primary">Append row</button>
					<button type="button" @click="popRow">Remove last</button>
					<small>{{ rowMutate.rows.count.value }} rows</small>
				</div>
			</form>
		</section>

		<section id="cell-mutations">
			<h2>Cell mutations</h2>
			<p class="showcase-caption">
				<code>cells.read() / write()</code> address individual cells by row / column index.
				Mutations land in the DOM directly so any consumer reading via the cell selector picks up
				the new value.
			</p>
			<table ref="cellMutateRef"></table>
			<button type="button" class="primary" @click="bumpFirstValue">+100 to row 0</button>
		</section>

		<section id="events">
			<h2>Live events</h2>
			<p class="showcase-caption">
				The composable forwards user-driven changes via namespaced events — the demo logs
				<code>sort</code> and <code>select</code>.
			</p>
			<table ref="liveRef"></table>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet — sort a column or click a row.</small>
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
						<th>Sub-domain</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>caption</code></td>
						<td>Set / clear the table caption.</td>
					</tr>
					<tr>
						<td><code>headers</code></td>
						<td>Read / mutate header cells.</td>
					</tr>
					<tr>
						<td><code>rows</code></td>
						<td>Append / insert / remove / move rows.</td>
					</tr>
					<tr>
						<td><code>cells</code></td>
						<td>Read / write individual cells by row/column.</td>
					</tr>
					<tr>
						<td><code>sort</code></td>
						<td>
							Cycle direction; <code>sort.auto</code> (default true) reorders the DOM rows in place
							using a stable, locale-aware comparator.
						</td>
					</tr>
					<tr>
						<td><code>expansion</code></td>
						<td>Per-row expand / collapse with optional single-open mode.</td>
					</tr>
					<tr>
						<td><code>selection</code></td>
						<td>Page / pool strategies, click + keyboard, range-select.</td>
					</tr>
					<tr>
						<td><code>resize</code></td>
						<td>Pointer-driven column-width resize handles.</td>
					</tr>
					<tr>
						<td><code>focus</code></td>
						<td>Arrow-key cell navigation.</td>
					</tr>
					<tr>
						<td><code>pagination</code></td>
						<td>
							<code>page</code>, <code>size</code>, <code>pages</code>, <code>next()</code>,
							<code>prev()</code>, <code>to(page)</code>.
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
