<script lang="ts" setup>
import { ref } from 'vue'
import { useTable } from '@src/browser'

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
</script>

<template>
	<section>
		<header>
			<h1>useTable</h1>
			<p>
				Native <code>&lt;table&gt;</code> controller. Owns rows, headers, footers, sort, selection,
				expansion, pagination, focus navigation, and column resize — all as sub-domain interfaces.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useTable(elementRef, options?): { data, caption, headers, rows, cells, footer, sort, expansion, selection, focus, pagination, ... }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic table</h2>
			<p class="showcase-caption">
				Click a row to select; <kbd>Shift</kbd>-click for ranges. Click headers to sort.
			</p>
			<table ref="tableRef"></table>
			<small>{{ table.selection.ids.size }} selected</small>
		</section>

		<section id="sort">
			<h2>Sortable columns</h2>
			<p class="showcase-caption">Click a sortable header to cycle through asc → desc → none.</p>
			<table ref="sortableRef"></table>
		</section>

		<section id="api">
			<h2>API</h2>
			<p class="showcase-caption">
				The composable returns sub-domain interfaces — each owns one concern. See the relevant
				factory file for the full surface.
			</p>
			<table>
				<thead>
					<tr>
						<th>Member</th>
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
						<td>Read / write individual cell values.</td>
					</tr>
					<tr>
						<td><code>sort</code></td>
						<td>Toggle / clear sort directions.</td>
					</tr>
					<tr>
						<td><code>selection</code></td>
						<td>Select / clear / toggle row ids.</td>
					</tr>
					<tr>
						<td><code>expansion</code></td>
						<td>Expand / collapse row detail.</td>
					</tr>
					<tr>
						<td><code>pagination</code></td>
						<td>Navigate pages, change size.</td>
					</tr>
					<tr>
						<td><code>focus</code></td>
						<td>Move the focused cell.</td>
					</tr>
					<tr>
						<td><code>resize</code></td>
						<td>Set / clear column widths (when enabled).</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<p class="showcase-caption">
				<code>elements:table:sort</code>, <code>:select</code>, <code>:expand</code>,
				<code>:collapse</code>, <code>:focus</code>, <code>:change</code>, <code>:resize</code>,
				<code>:paginate</code>.
			</p>
		</section>
	</section>
</template>
