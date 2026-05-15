<script lang="ts" setup>
/**
 * UseTablePage — native `<table>` controller.
 *
 * `useTable(tableRef, options)` is the framework's adapter over
 * `createTable`. Each section below is a SELF-CONTAINED demo of one
 * sub-domain so the feature lives next to its description; the §1
 * comprehensive integrated demo at the top weaves every feature
 * together at production scale.
 *
 * API surface coverage (from Phase 1 audit):
 *   1. Headers + rows + cells + footer + caption — read / append /
 *      insert / update / remove on each sub-domain.
 *   2. Sort (single + shift-multi-column, `mandate`, `auto`).
 *   3. Pagination (state model — emits paginate; consumer drives row
 *      visibility via the `offset` / `total` parity options + a
 *      computed row slice).
 *   4. Selection (shift / ctrl / cmd / outside-click clear;
 *      `[data-no-select]` opt-out target).
 *   5. Expansion (CSS-driven via `[data-table-expanded]` + the
 *      sibling `<tr data-table-expansion>`'s `<div data-table-
 *      expansion-panel>` — `interpolate-size: allow-keywords` tweens
 *      `block-size: 0 → auto`; `[inert]` on the closed panel).
 *   6. Resize (per-column min/max, pointer-capture handles).
 *   7. Focus (APG roving-tabindex; optional wrap).
 *   8. Sticky header — `table.sticky` modifier (NEW in this PR) pins
 *      `<thead> > <th>` to the scroll container's top via
 *      `position: sticky`.
 *
 * Framework fixes shipped alongside this page:
 *   - `surfaces/_focus.scss` — excludes `table[role='grid']` from the
 *     universal `:focus-visible` ring. The grid-pattern table is a
 *     focus ANCHOR (tab into it lands on the table; arrow keys move
 *     to a cell); the visible focus belongs on the cell, not the
 *     whole table. Without this exclusion, modifier-clicks (shift /
 *     ctrl) on body rows flashed a 4-px ring around the table's
 *     border-box.
 *   - `elements/_table.scss` — new `table.sticky` opt-in. Pins
 *     `<thead> > <th>` to the nearest scroll-container's top with
 *     `inset-block-start: var(--set-sticky-offset, 0)`. Earlier
 *     versions of this page claimed sticky-header chrome existed at
 *     the element layer — it didn't. Now it does.
 *
 * Cross-references:
 *   - `<table>` element baseline (`elements/_table.scss`) — striped
 *     rows, hover wash, selected-row tint, expansion-panel chrome,
 *     `.nowrap` + `.sticky` modifiers.
 *   - `usePointer` — the column-resize handles consume it indirectly
 *     via `createTable`'s pointer wiring.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useTable } from '@elements/browser'
import { useLog } from '../composables.js'
import type { TableEditRow } from '../types.js'
import { pageList } from '../helpers.js'
import {
	TABLE_DICTIONARY as dictionary,
	TABLE_FRUITS as fruits,
	TABLE_ISSUES as issues,
} from '../constants.js'

// ─────────────────────────────────────────────────────────────────────
// Shared dataset for the §1 comprehensive integrated demo.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — comprehensive integrated table. Every feature, one surface.
// Wrapped in a custom y-scroll container (overflow-y: auto so the
// sticky header sticks; `.scrollable` is x-only by framework convention).
// ─────────────────────────────────────────────────────────────────────
const pageSize = ref(8)
const currentPage = ref(1)
const mainRef = useTemplateRef<HTMLTableElement>('mainRef')
const offsetForPage = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const visibleIssues = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	return issues.slice(start, start + pageSize.value)
})
const main = useTable(mainRef, {
	caption: '24 framework issues — sortable, paginated, selectable, expandable',
	headers: ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Updated'],
	columns: [
		{ key: 'id', sortable: true },
		{ key: 'title', sortable: true },
		{ key: 'status', sortable: true },
		{ key: 'priority', sortable: true },
		{ key: 'assignee', sortable: true },
		{ key: 'updated', sortable: true },
	],
	sort: { multiple: true, mandate: false, auto: true },
	pagination: { size: pageSize },
	offset: offsetForPage,
	total: issues.length,
	expansion: { multiple: false, initial: ['i1'] },
	selection: { strategy: 'page', click: true },
	resize: { min: 64, max: 480 },
	focus: { keyboard: true, wrap: true },
	on: {
		paginate: (event: CustomEvent) => {
			currentPage.value = (event.detail as { page: number }).page
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — Sort isolation. 4-row tiny table demonstrates single-click
// + shift-click multi-column with explicit priority numbers visible
// next to each sorted header.
// ─────────────────────────────────────────────────────────────────────
const sortRef = useTemplateRef<HTMLTableElement>('sortRef')
const sortTable = useTable(sortRef, {
	headers: ['ID', 'Name', 'Region', 'Tier'],
	columns: [
		{ key: 'id', sortable: true },
		{ key: 'name', sortable: true },
		{ key: 'region', sortable: true },
		{ key: 'tier', sortable: true },
	],
	sort: { multiple: true },
})
const sortLine = computed(() =>
	sortTable.sort.columns.value.length === 0
		? '(none — click a column header)'
		: sortTable.sort.columns.value.map((c, i) => `${i + 1}. ${c.key} ${c.direction}`).join(' · '),
)

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Pagination isolation. Tiny 12-row dataset; pagination is a
// STATE MODEL — emits `elements:table:paginate { page, offset, size }`
// and the consumer drives row visibility via the `offset` / `total`
// options plus a computed slice. This demo wires the contract end-to-
// end so it's obvious what's automatic and what's consumer-driven.
// ─────────────────────────────────────────────────────────────────────
const pgSize = ref(4)
const pgPage = ref(1)
const pgRef = useTemplateRef<HTMLTableElement>('pgRef')
const pgOffset = computed(() => (pgPage.value - 1) * pgSize.value + 1)
const pgVisible = computed(() => {
	const start = (pgPage.value - 1) * pgSize.value
	return fruits.slice(start, start + pgSize.value)
})
const pg = useTable(pgRef, {
	headers: ['#', 'Fruit'],
	pagination: { size: pgSize },
	offset: pgOffset,
	total: fruits.length,
	on: {
		paginate: (event: CustomEvent) => {
			pgPage.value = (event.detail as { page: number }).page
		},
	},
})

const mainPages = computed(() => pageList(main.pagination.page.value, main.pagination.count.value))
const pgPages = computed(() => pageList(pg.pagination.page.value, pg.pagination.count.value))

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — Selection isolation. Includes interactive descendants
// (`<button>`, `<input>`, `<a>`, plus `[data-no-select]` opt-out)
// inside cells so the page proves clicks on them survive.
// ─────────────────────────────────────────────────────────────────────
const selRef = useTemplateRef<HTMLTableElement>('selRef')
const sel = useTable(selRef, {
	headers: ['ID', 'Name', 'Note', 'Action'],
	selection: { strategy: 'page', click: true },
})
const { entries: actionLog, push: note } = useLog(4)

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — Inline editing via .flat / .flush form controls. The
// `input.flat` / `select.flat` modifiers (modifiers/_local.scss) make a real `<input>`
// / `<select>` read as plain table text until the user engages — no
// `contenteditable` on random elements, so the validation contract +
// type-specific UI + screen-reader affordances stay intact.
// ─────────────────────────────────────────────────────────────────────
const editRows = ref<TableEditRow[]>([
	{ id: 'e1', sku: 'SKU-001', name: 'Lacquer pen', stock: 18, bucket: 'in' },
	{ id: 'e2', sku: 'SKU-002', name: 'Carbon ribbon', stock: 4, bucket: 'low' },
	{ id: 'e3', sku: 'SKU-003', name: 'Press plate', stock: 0, bucket: 'out' },
])
const editRef = useTemplateRef<HTMLTableElement>('editRef')
const edit = useTable(editRef, {
	headers: ['SKU', 'Name', 'Stock', 'Bucket'],
})
const editFlushRef = useTemplateRef<HTMLTableElement>('editFlushRef')
const editFlush = useTable(editFlushRef, {
	headers: ['SKU', 'Name', 'Quick action'],
})

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — Expansion isolation. Two tables side-by-side: `multiple:
// true` (default, accordion-multi) and `multiple: false` (exclusive
// — opening one row closes any other open row, same shape as the
// `<details accordion="…">` group). Both share the same dataset to
// make the behavioral difference legible at a glance.
// ─────────────────────────────────────────────────────────────────────
const expRef = useTemplateRef<HTMLTableElement>('expRef')
const exp = useTable(expRef, {
	headers: ['ID', 'Topic'],
	expansion: { multiple: true, initial: ['t1'] },
})
const expExclusiveRef = useTemplateRef<HTMLTableElement>('expExclusiveRef')
const expExclusive = useTable(expExclusiveRef, {
	headers: ['ID', 'Topic'],
	expansion: { multiple: false, initial: ['t1'] },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 7 — Resize isolation. 3 columns with bounds + a label that
// updates as the user drags.
// ─────────────────────────────────────────────────────────────────────
const rzRef = useTemplateRef<HTMLTableElement>('rzRef')
const rz = useTable(rzRef, {
	headers: ['Column A', 'Column B', 'Column C'],
	resize: { min: 80, max: 320 },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 8 — Focus isolation. Small 3×3 grid + on-screen reference of
// the active key. Roving-tabindex with wrap.
// ─────────────────────────────────────────────────────────────────────
const fcRef = useTemplateRef<HTMLTableElement>('fcRef')
const fc = useTable(fcRef, {
	headers: ['A', 'B', 'C'],
	focus: { keyboard: true, wrap: true },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 9 — Sticky header isolation. The new `table.sticky` modifier
// alongside a y-scrolling wrapper so the column labels stay visible as
// the user scrolls.
// ─────────────────────────────────────────────────────────────────────
const stRef = useTemplateRef<HTMLTableElement>('stRef')
const st = useTable(stRef, {
	headers: ['#', 'Term', 'Definition'],
})

// ─────────────────────────────────────────────────────────────────────
// Page-wide state readout.
// ─────────────────────────────────────────────────────────────────────
const mainStates = computed(() => ({
	page: main.pagination.page.value,
	count: main.pagination.count.value,
	selected: main.selection.ids.size,
	expanded: main.expansion.expanded.size,
	sort: main.sort.columns.value.length,
}))
const reset = (): void => {
	main.selection.clear()
	main.expansion.collapse()
	main.sort.clear()
	main.pagination.to(1)
}
</script>

<template>
	<section id="use-table-intro">
		<hgroup>
			<h1>useTable</h1>
			<p>
				Native <code>&lt;table&gt;</code> controller. Sort, paginate, select, expand, resize, focus
				— every sub-domain is a thin reactive facade over real DOM. <code>&lt;table&gt;</code> is
				the source of truth; <code>useTable</code> wires keyboard nav, ARIA, sort cycles, selection
				ranges, expansion panels, and column resize on top.
			</p>
		</hgroup>
		<p>
			§1 weaves every feature into a production-shape integrated table. Each subsequent section
			(§2–§9) demonstrates one sub-domain in isolation, with its own tiny dataset, so the feature
			lives next to its description.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Integrated demo state:</strong>
				page <code>{{ mainStates.page }}</code> / <code>{{ mainStates.count }}</code> · selected
				<code>{{ mainStates.selected }}</code> · expanded <code>{{ mainStates.expanded }}</code> ·
				sort cols <code>{{ mainStates.sort }}</code>
			</p>
		</aside>
		<p>
			<strong>Framework changes shipped alongside this page</strong> (callouts in §5.4.1
			native-platform redundancy walk + author dogfooding):
		</p>
		<ul>
			<li>
				<code>surfaces/_focus.scss</code> now excludes <code>table[role='grid']</code> from the
				universal <code>:focus-visible</code> ring. The grid-pattern table is a focus
				<em>anchor</em>, not the visible focus target — modifier-clicks no longer flash a 4-px ring
				around the table's border-box.
			</li>
			<li>
				<code>table.sticky</code> opt-in pins <code>&lt;thead&gt; &gt; &lt;th&gt;</code> to the
				scroll container's top via <code>position: sticky</code>. Earlier copy of this page claimed
				sticky-header chrome was already element-layer; it wasn't. Now it is — §9 demonstrates.
			</li>
			<li>
				<code>elements/_table.scss</code> paints a token-driven row-expansion chevron via
				<code>::before</code> on expandable rows. <code>--set-table-expansion-icon</code> +
				<code>--set-table-expansion-icon-size</code> +
				<code>--set-table-expansion-icon-gap</code> keep the disclosure glyph consistent with
				<code>&lt;details&gt;</code> + the accordion family. The glyph rotates 90° on
				<code>[data-table-expanded]</code> — §6 demonstrates.
			</li>
			<li>
				<code>modifiers/_local.scss</code> adds a paired modifier set for in-host elements:
				<strong><code>.flat</code></strong> (transparent rest, hover reveal, focus promotes to
				bordered baseline — applies to <code>input</code> / <code>select</code> /
				<code>textarea</code>) and <strong><code>.flush</code></strong> (no margin / border / radius
				/ ring; inherits the parent's radius; fills the host on both axes — applies to
				<code>input</code> / <code>select</code> / <code>textarea</code> / <code>button</code>). §5
				demonstrates both side-by-side; the underlying real form controls preserve the validation
				contract + type-specific UI that <code>contenteditable</code> on random elements throws
				away.
			</li>
			<li>
				<code>createTable</code> now wires row-click → expansion toggle. Default
				<code>expansion.click: true</code> (synonym <code>'row'</code>) toggles on any
				non-interactive click inside an expandable row; <code>'caret'</code> narrows the trigger to
				descendants of <code>[data-table-expansion-trigger]</code>; <code>false</code> disables.
				Same interactive-descendant opt-out shape as <code>selection.click</code>. The bare
				<code>&lt;table tabindex="0"&gt;</code> also now seeds the first cell on focus so the APG
				roving keyboard model has a starting cursor — Tab into the table, then ArrowKeys.
			</li>
			<li>
				<code>components/_nav.scss</code> pagination chrome now reads
				<code>--set-nav-pagination-font-size</code> (default <code>var(--text-sm)</code>) so the
				bare <code>&lt;nav aria-label="Pagination"&gt;</code> aligns with table density without a
				per-consumer override. <code>.small</code> / <code>.large</code> size modifiers still retune
				via the size cascade.
			</li>
		</ul>
	</section>

	<section id="use-table-comprehensive">
		<h2>1. Comprehensive integrated table</h2>
		<p>
			Every feature, one surface, 24 rows. Vertical scroll via a custom
			<code>overflow-y: auto</code> wrapper (the framework's <code>.scrollable</code> is x-axis only
			by contract — see TablesPage §"Scrollable wrapper"); horizontal scroll via
			<code>.scrollable</code> on the same wrapper, so wide content scrolls inside the container
			rather than the page. <code>table.sticky</code> keeps the header visible during vertical
			scroll. Cell content wraps by default; <code>table.nowrap</code> + horizontal scroll is the
			alternative idiom (see TablesPage).
		</p>
		<p>
			<small>Actions:</small>
		</p>
		<div role="toolbar" aria-label="Table actions">
			<button type="button" class="subtle small" @click="main.selection.select()">
				Select all on page
			</button>
			<button type="button" class="subtle small" @click="main.selection.clear()">
				Clear selection
			</button>
			<button type="button" class="subtle small" @click="main.expansion.expand(issues[0].id)">
				Expand first
			</button>
			<button type="button" class="subtle small" @click="main.expansion.collapse()">
				Collapse all
			</button>
			<button type="button" class="subtle small" @click="main.sort.clear()">Clear sort</button>
			<button type="button" class="subtle small" @click="reset">Reset</button>
		</div>
		<div
			class="scrollable"
			style="
				overflow-y: auto;
				max-block-size: 28rem;
				border: 1px solid var(--color-border);
				border-radius: var(--radius-md);
			"
		>
			<table ref="mainRef" class="striped sticky">
				<tbody>
					<template v-for="issue in visibleIssues" :key="issue.id">
						<tr :data-id="issue.id">
							<td>
								<code>{{ issue.id }}</code>
							</td>
							<td>{{ issue.title }}</td>
							<td>{{ issue.status }}</td>
							<td>{{ issue.priority }}</td>
							<td>{{ issue.assignee }}</td>
							<td>{{ issue.updated }}</td>
						</tr>
						<tr data-table-expansion>
							<td colspan="6">
								<div data-table-expansion-panel inert>
									<p>
										<strong>{{ issue.title }}</strong>
									</p>
									<p>{{ issue.detail }}</p>
									<small>Filed by {{ issue.assignee }} · last touched {{ issue.updated }}</small>
								</div>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</div>
		<nav aria-label="Pagination">
			<ol>
				<li>
					<a
						href="#"
						:aria-disabled="main.pagination.page.value <= 1 ? 'true' : undefined"
						@click.prevent="main.pagination.prev()"
					>
						‹ Prev
					</a>
				</li>
				<li v-for="(p, i) in mainPages" :key="i">
					<a
						v-if="p !== null"
						href="#"
						:aria-current="p === main.pagination.page.value ? 'page' : undefined"
						@click.prevent="main.pagination.to(p)"
					>
						{{ p }}
					</a>
					<a v-else aria-disabled="true" aria-hidden="true">…</a>
				</li>
				<li>
					<a
						href="#"
						:aria-disabled="
							main.pagination.page.value >= main.pagination.count.value ? 'true' : undefined
						"
						@click.prevent="main.pagination.next()"
					>
						Next ›
					</a>
				</li>
			</ol>
		</nav>
	</section>

	<section id="use-table-sort">
		<h2>2. Sort — single + shift-multi-column</h2>
		<p>
			Click a header to cycle <code>asc → desc → none</code>. Hold <kbd>Shift</kbd> and click
			another header to add it to the sort stack (lower priority); the factory's
			<code>sort.columns</code> snapshot exposes the live stack in priority order. Headers carry
			<code>aria-sort</code> mirroring the live state. Pass <code>sort.mandate: true</code> to block
			the unsorted state (cycle stays at <code>asc → desc → asc</code>); pass
			<code>sort.auto: false</code> when the consumer is driving a server-paged refetch on the
			<code>elements:table:sort</code> event.
		</p>
		<table ref="sortRef" class="striped max-w-xl">
			<tbody>
				<tr data-id="s1">
					<td>S-001</td>
					<td>Aria</td>
					<td>EU</td>
					<td>Gold</td>
				</tr>
				<tr data-id="s2">
					<td>S-002</td>
					<td>Bee</td>
					<td>NA</td>
					<td>Silver</td>
				</tr>
				<tr data-id="s3">
					<td>S-003</td>
					<td>Cass</td>
					<td>EU</td>
					<td>Bronze</td>
				</tr>
				<tr data-id="s4">
					<td>S-004</td>
					<td>Dax</td>
					<td>APAC</td>
					<td>Gold</td>
				</tr>
			</tbody>
		</table>
		<p>
			<small
				>Active stack: <code>{{ sortLine }}</code></small
			>
		</p>
	</section>

	<section id="use-table-paginate">
		<h2>3. Pagination — state model + consumer-driven slice</h2>
		<p>
			<code>pagination.size</code> takes a <code>number</code> or <code>Ref&lt;number&gt;</code>;
			the live <code>page</code> + <code>count</code> derivations recompute when either flips.
			Pagination is a STATE MODEL — the factory emits
			<code>elements:table:paginate { page, offset, size }</code> and writes
			<code>aria-rowindex</code> / <code>aria-rowcount</code> via the <code>offset</code> /
			<code>total</code> options, but it does NOT hide rows. The consumer drives row visibility
			(here: a Vue computed slice over the source array).
		</p>
		<table ref="pgRef" class="striped max-w-xl">
			<tbody>
				<tr v-for="(name, i) in pgVisible" :key="`${pgPage}-${name}`" :data-id="name">
					<td>
						<code>{{ pgOffset + i }}</code>
					</td>
					<td>{{ name }}</td>
				</tr>
			</tbody>
		</table>
		<nav aria-label="Pagination">
			<ol>
				<li>
					<a
						href="#"
						:aria-disabled="pg.pagination.page.value <= 1 ? 'true' : undefined"
						@click.prevent="pg.pagination.prev()"
					>
						‹ Prev
					</a>
				</li>
				<li v-for="(p, i) in pgPages" :key="i">
					<a
						v-if="p !== null"
						href="#"
						:aria-current="p === pg.pagination.page.value ? 'page' : undefined"
						@click.prevent="pg.pagination.to(p)"
					>
						{{ p }}
					</a>
					<a v-else aria-disabled="true" aria-hidden="true">…</a>
				</li>
				<li>
					<a
						href="#"
						:aria-disabled="
							pg.pagination.page.value >= pg.pagination.count.value ? 'true' : undefined
						"
						@click.prevent="pg.pagination.next()"
					>
						Next ›
					</a>
				</li>
			</ol>
		</nav>
		<p>
			<small>
				Rows <code>{{ pgOffset }}</code
				>–<code>{{ Math.min(pgOffset + pgSize - 1, fruits.length) }}</code> of
				<code>{{ fruits.length }}</code> ·
			</small>
			<label>
				<small>Page size&nbsp;</small>
				<select v-model.number="pgSize" style="display: inline-block; inline-size: auto">
					<option :value="3">3</option>
					<option :value="4">4</option>
					<option :value="6">6</option>
					<option :value="12">12</option>
				</select>
			</label>
		</p>
	</section>

	<section id="use-table-select">
		<h2>4. Selection — shift / ctrl / cmd + interactive opt-out</h2>
		<p>
			Plain click <strong>replaces</strong> the selection; <kbd>Ctrl</kbd> / <kbd>⌘</kbd> click
			<strong>toggles</strong>; <kbd>Shift</kbd> click <strong>extends</strong> from the anchor row;
			clicking outside the table clears. Clicks on interactive descendants (<code>input</code>,
			<code>button</code>, <code>a</code>, <code>select</code>, <code>textarea</code>,
			<code>label</code>, anything inside <code>[data-no-select]</code>) are skipped so row actions
			survive. The action log below records button clicks; if a button click SELECTED the row by
			mistake, the row tint would flash.
		</p>
		<table ref="selRef" class="striped max-w-3xl">
			<tbody>
				<tr data-id="u1">
					<td>U-001</td>
					<td>Aria</td>
					<td><input type="text" placeholder="Editable note" /></td>
					<td>
						<button type="button" class="subtle small" @click="note('clicked Action for U-001')">
							Action
						</button>
					</td>
				</tr>
				<tr data-id="u2">
					<td>U-002</td>
					<td>Bee</td>
					<td>
						<a href="#use-table-select" @click="note('clicked link in U-002')">Open profile</a>
					</td>
					<td>
						<button type="button" class="subtle small" @click="note('clicked Action for U-002')">
							Action
						</button>
					</td>
				</tr>
				<tr data-id="u3">
					<td>U-003</td>
					<td>Cass</td>
					<td>
						<span data-no-select>
							<button
								type="button"
								class="subtle small"
								@click="note('clicked opted-out region in U-003')"
							>
								Opted out
							</button>
						</span>
					</td>
					<td>
						<button type="button" class="subtle small" @click="note('clicked Action for U-003')">
							Action
						</button>
					</td>
				</tr>
				<tr data-id="u4">
					<td>U-004</td>
					<td>Dax</td>
					<td>Plain text</td>
					<td>
						<button type="button" class="subtle small" @click="note('clicked Action for U-004')">
							Action
						</button>
					</td>
				</tr>
			</tbody>
		</table>
		<p>
			<small>
				Selected: <code>[{{ Array.from(sel.selection.ids).join(', ') }}]</code> · Action log:
				{{ actionLog.length === 0 ? '(empty — click an Action button)' : actionLog.join(' → ') }}
			</small>
		</p>
	</section>

	<section id="use-table-edit">
		<h2>
			5. Inline editing — <code>.flat</code> (with chrome on focus) vs <code>.flush</code> (fills
			cell)
		</h2>
		<p>
			Inline editing uses real <code>&lt;input&gt;</code> / <code>&lt;select&gt;</code> form
			controls. <strong><code>.flat</code></strong> keeps the element's own padding + intrinsic size
			and dissolves only the chrome: transparent rest, subtle backdrop on hover, full bordered
			baseline + variant focus ring on focus, <code>:user-invalid</code> danger border still paints.
			<strong><code>.flush</code></strong> fuses the control INTO the cell — no margin, no border,
			no radius, no focus ring; the control inherits the cell's radius and inflates to
			<code>100% × 100%</code> of the parent. Use <code>.flat</code> when the control should signal
			"editable text" at rest with a clear focus state; use <code>.flush</code> when the cell IS the
			surface and the control should occupy every pixel inside it. Both are declared in
			<code>modifiers/_local.scss</code> and bound to <code>input</code> / <code>select</code> /
			<code>textarea</code>; <code>.flush</code> additionally binds to <code>button</code> for
			full-area CTAs in cards / tiles / table cells.
		</p>
		<h3>5a — <code>.flat</code> (transparent rest, full chrome on focus)</h3>
		<table ref="editRef" class="striped max-w-3xl">
			<thead>
				<tr>
					<th>SKU</th>
					<th>Name</th>
					<th>Stock</th>
					<th>Bucket</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in editRows" :key="row.id" :data-id="row.id">
					<td>
						<code>{{ row.sku }}</code>
					</td>
					<td>
						<input
							v-model="row.name"
							class="flat"
							type="text"
							:aria-label="`Name for ${row.sku}`"
						/>
					</td>
					<td>
						<input
							v-model.number="row.stock"
							class="flat"
							type="number"
							min="0"
							:aria-label="`Stock for ${row.sku}`"
						/>
					</td>
					<td>
						<select v-model="row.bucket" class="flat" :aria-label="`Bucket for ${row.sku}`">
							<option value="in">In stock</option>
							<option value="low">Low</option>
							<option value="out">Out</option>
						</select>
					</td>
				</tr>
			</tbody>
		</table>
		<h3>5b — <code>.flush</code> (fills the cell; cell owns the boundary)</h3>
		<p>
			The cell is the surface; the control inherits the cell's radius and fills the cell's content
			box on both axes. Useful when the host cell carries variant tint / radius and the input should
			read as the cell's surface.
		</p>
		<table ref="editFlushRef" class="striped max-w-3xl">
			<thead>
				<tr>
					<th>SKU</th>
					<th>Name</th>
					<th>Quick action</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in editRows" :key="`flush-${row.id}`" :data-id="`flush-${row.id}`">
					<td>
						<code>{{ row.sku }}</code>
					</td>
					<td class="frame">
						<input
							v-model="row.name"
							class="flush"
							type="text"
							:aria-label="`Flush name for ${row.sku}`"
						/>
					</td>
					<td class="frame">
						<button type="button" class="subtle flush" @click="note(`flush action ${row.sku}`)">
							Run
						</button>
					</td>
				</tr>
			</tbody>
		</table>
		<p>
			<small>
				The cells in the flush demo declare <code>block-size: 1px</code> — the legacy
				<code>&lt;td height="1px"&gt;</code> trick that coerces the cell to its row's intrinsic
				height, so the percentage-height flush child resolves cleanly to the row height. Without it,
				percentage block-size on a child of <code>&lt;td&gt;</code> falls back to
				<code>auto</code> on every engine.
			</small>
		</p>
		<p>
			<small>
				Live row state:
				<code>{{ editRows.map((r) => `${r.sku}:${r.stock}:${r.bucket}`).join(' · ') }}</code> · flat
				factory ready: <code>{{ edit.ready.value }}</code> · flush factory ready:
				<code>{{ editFlush.ready.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-table-expand">
		<h2>6. Expansion — CSS-driven via <code>interpolate-size</code></h2>
		<p>
			Click anywhere on a row to disclose its detail row.
			<code>createTable</code> wires the click handler when <code>expansion.click</code> is
			<code>true</code> (default) or <code>'row'</code>; clicks on interactive descendants (<code
				>a</code
			>
			/ <code>button</code> / <code>input</code> / <code>select</code> / <code>textarea</code> /
			<code>label</code> / <code>[data-no-select]</code>) are skipped so row-internal action chrome
			survives. Pass <code>expansion.click: 'caret'</code> to scope the trigger to descendants of
			<code>[data-table-expansion-trigger]</code> only; <code>false</code> disables the auto-handler
			so consumers can drive <code>expansion.toggle(id)</code> themselves.
			<code>elements/_table.scss</code> drives the visual tween — the factory's only DOM writes are
			<code>[data-table-expanded]</code> on the data row + <code>[inert]</code> on the panel.
			<code>[inert]</code> rather than <code>[hidden]</code> is what allows the
			<code>block-size: 0 → auto</code> animation: <code>display: none</code> would freeze the
			transition.
		</p>
		<p>
			<code>expansion.multiple</code> controls whether multiple rows can stay open at once. Default
			<code>true</code> behaves like an accordion-multi (every clicked row toggles independently);
			<code>false</code> is the exclusive mode (opening one row closes any other open row — same
			shape as the platform's <code>&lt;details accordion="…"&gt;</code> group). The two tables
			below share the same dataset so the behavioural difference is legible at a glance.
		</p>
		<h3>6a — <code>multiple: true</code> (independent toggles, default)</h3>
		<table ref="expRef" class="striped max-w-3xl">
			<tbody>
				<template
					v-for="t in [
						{
							id: 't1',
							topic: 'Why `[inert]` not `[hidden]`',
							body: '`[hidden]` forces display:none, which disables CSS transitions. `[inert]` blocks focus + pointer + a11y without affecting the display value, so `block-size: 0 → auto` still animates.',
						},
						{
							id: 't2',
							topic: '`interpolate-size: allow-keywords`',
							body: 'Declared globally on `<html>` in `_html.scss`. Without it, browsers refuse to tween between an intrinsic size keyword (`auto`) and a length (`0`).',
						},
						{
							id: 't3',
							topic: 'Motion-contract tokens',
							body: '`--set-motion-duration` + `--set-motion-timing-function` drive every framework disclosure — `<details>::details-content`, `<dialog>`, drawer animations, this panel — so the page feels rhythmically uniform.',
						},
					]"
					:key="t.id"
				>
					<tr :data-id="t.id">
						<td>
							<code>{{ t.id }}</code>
						</td>
						<td>{{ t.topic }}</td>
					</tr>
					<tr data-table-expansion>
						<td colspan="2">
							<div data-table-expansion-panel inert>{{ t.body }}</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
		<p>
			<small
				>Multi-mode expanded:
				<code>[{{ Array.from(exp.expansion.expanded).join(', ') }}]</code></small
			>
		</p>
		<h3>6b — <code>multiple: false</code> (exclusive — accordion shape)</h3>
		<table ref="expExclusiveRef" class="striped max-w-3xl">
			<tbody>
				<template
					v-for="t in [
						{
							id: 't1',
							topic: 'Why `[inert]` not `[hidden]`',
							body: '`[hidden]` forces display:none, which disables CSS transitions. `[inert]` blocks focus + pointer + a11y without affecting the display value, so `block-size: 0 → auto` still animates.',
						},
						{
							id: 't2',
							topic: '`interpolate-size: allow-keywords`',
							body: 'Declared globally on `<html>` in `_html.scss`. Without it, browsers refuse to tween between an intrinsic size keyword (`auto`) and a length (`0`).',
						},
						{
							id: 't3',
							topic: 'Motion-contract tokens',
							body: '`--set-motion-duration` + `--set-motion-timing-function` drive every framework disclosure — `<details>::details-content`, `<dialog>`, drawer animations, this panel — so the page feels rhythmically uniform.',
						},
					]"
					:key="`ex-${t.id}`"
				>
					<tr :data-id="t.id">
						<td>
							<code>{{ t.id }}</code>
						</td>
						<td>{{ t.topic }}</td>
					</tr>
					<tr data-table-expansion>
						<td colspan="2">
							<div data-table-expansion-panel inert>{{ t.body }}</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
		<p>
			<small
				>Exclusive-mode expanded:
				<code>[{{ Array.from(expExclusive.expansion.expanded).join(', ') }}]</code></small
			>
		</p>
	</section>

	<section id="use-table-resize">
		<h2>7. Column resize — pointer-capture handles</h2>
		<p>
			With <code>resize: { min, max }</code> set, the factory mounts a drag handle on each header's
			trailing edge. Pointer-down on a handle starts a column-width drag (cursor
			<code>col-resize</code>); pointer-capture means the drag persists when the cursor leaves the
			narrow 4-px handle area. <code>[data-table-resizing]</code> on the table marks the active drag
			(consumer can paint a scrim).
		</p>
		<div class="scrollable">
			<table ref="rzRef" class="striped">
				<tbody>
					<tr data-id="r1">
						<td>Drag the right edge of any column header</td>
						<td>Try column B</td>
						<td>Or column C</td>
					</tr>
					<tr data-id="r2">
						<td>Min 80 px · max 320 px</td>
						<td>Bounds enforced by `resize: { min, max }`</td>
						<td>—</td>
					</tr>
					<tr data-id="r3">
						<td>Pointer capture keeps the drag alive</td>
						<td>even if the cursor leaves the handle</td>
						<td>—</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p>
			<small
				>Resize active: <code>{{ rz.resize?.active.value ?? false }}</code></small
			>
		</p>
	</section>

	<section id="use-table-focus">
		<h2>8. Keyboard focus — roving-tabindex (APG)</h2>
		<p>
			Tab into the table — focus lands on the table itself, then the first cell. ArrowDown / ArrowUp
			/ ArrowLeft / ArrowRight move the active cell; Home / End jump to row edges;
			<code>focus.wrap: true</code> wraps at table edges (without it, edges clamp).
			<code>tabindex="0"</code> lives on the focused cell; siblings <code>tabindex="-1"</code> —
			canonical APG roving pattern.
		</p>
		<table ref="fcRef" class="striped max-w-sm">
			<tbody>
				<tr data-id="g1">
					<td>A1</td>
					<td>B1</td>
					<td>C1</td>
				</tr>
				<tr data-id="g2">
					<td>A2</td>
					<td>B2</td>
					<td>C2</td>
				</tr>
				<tr data-id="g3">
					<td>A3</td>
					<td>B3</td>
					<td>C3</td>
				</tr>
			</tbody>
		</table>
		<p>
			<small>
				Focused cell:
				<code>{{
					fc.focus.cell.value
						? `row ${fc.focus.cell.value.row}, column ${fc.focus.cell.value.column}`
						: 'none'
				}}</code>
			</small>
		</p>
	</section>

	<section id="use-table-sticky">
		<h2>9. Sticky header — <code>table.sticky</code></h2>
		<p>
			Opt in via <code>class="sticky"</code> on the <code>&lt;table&gt;</code>. Element-layer rule
			in <code>elements/_table.scss</code>:
		</p>
		<pre v-pre><code>table.sticky &gt; thead &gt; tr &gt; th {
  position: sticky;
  inset-block-start: var(--set-sticky-offset, 0);
  z-index: 1;
}</code></pre>
		<p>
			Requires a scrolling ancestor — wrap in <code>&lt;div class="scrollable"&gt;</code> for
			horizontal scroll, or an <code>overflow-y: auto</code> custom wrapper for vertical scroll (as
			the comprehensive demo does). Scroll the table below to see the column headers stay pinned.
		</p>
		<div
			style="
				overflow-y: auto;
				max-block-size: 16rem;
				border: 1px solid var(--color-border);
				border-radius: var(--radius-md);
			"
		>
			<table ref="stRef" class="striped sticky">
				<tbody>
					<tr v-for="row in dictionary" :key="row[0]" :data-id="row[0]">
						<td>{{ row[0] }}</td>
						<td>
							<code>{{ row[1] }}</code>
						</td>
						<td>{{ row[2] }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section id="use-table-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useTable(tableRef, options): UseTableReturn</code></dt>
			<dd>
				Composable. <code>tableRef</code> MUST point at a <code>&lt;table&gt;</code> — the factory
				throws on mismatch via <code>assertElement</code>.
			</dd>
			<dt>
				<code>options.headers</code> / <code>.rows</code> / <code>.footer</code> /
				<code>.caption</code>
			</dt>
			<dd>
				Initial data. Each sub-domain exposes <code>set</code> / <code>append</code> /
				<code>insert</code> / <code>update</code> / <code>remove</code> / <code>clear</code> on the
				returned controller.
			</dd>
			<dt><code>options.columns</code></dt>
			<dd>
				<code>readonly TableColumn[]</code>. Per-column schema —
				<code>{ key, title?, sortable?, filterable?, sort?, filter? }</code>. Drives the sort cycle.
			</dd>
			<dt><code>options.sort</code></dt>
			<dd>
				<code>{ multiple?, mandate?, order?, auto? }</code>. <code>multiple</code> enables the
				shift-click stack; <code>mandate</code> blocks the unsorted state; <code>order</code> sets
				the first-click direction; <code>auto</code> reorders <code>&lt;tbody&gt;</code> rows in
				place (<code>true</code> default — pass <code>false</code> for server-paged refetch).
			</dd>
			<dt><code>options.pagination</code> · <code>.offset</code> · <code>.total</code></dt>
			<dd>
				<code>pagination: { size?: number | Ref&lt;number&gt; }</code>. <code>offset</code> +
				<code>total</code> (also accept <code>Ref</code>) keep <code>aria-rowindex</code> /
				<code>aria-rowcount</code> aligned with the full dataset. The factory emits
				<code>paginate</code>; the consumer drives the row slice.
			</dd>
			<dt><code>options.expansion</code></dt>
			<dd>
				<code>{ multiple?, initial? }</code>. <code>multiple</code> allows simultaneously expanded
				rows; <code>initial</code> seeds the expanded set at construction.
			</dd>
			<dt><code>options.selection</code></dt>
			<dd>
				<code>{ strategy?, selectable?, click? }</code>. <code>strategy</code> is
				<code>'page'</code> / <code>'all'</code> / <code>'single'</code>; <code>selectable</code> is
				a per-row predicate; <code>click</code> opts in / out of the shift / ctrl / cmd model.
			</dd>
			<dt><code>options.resize</code></dt>
			<dd>
				<code>{ min?, max? }</code>. Enables column-resize handles with bounds in pixels. Absent =
				no handles.
			</dd>
			<dt><code>options.focus</code></dt>
			<dd>
				<code>{ keyboard?, wrap? }</code>. <code>keyboard</code> enables the arrow / Home / End
				rove; <code>wrap</code> wraps at row / column edges.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ change?, focus?, select?, sort?, expand?, collapse?, paginate? }</code>. Post-state
				info hooks. Also dispatch as DOM events
				(<code>elements:table:{change,focus,select,sort,expand,collapse,paginate}</code>).
			</dd>
			<dt>
				Element-layer modifiers (composes via <code>class</code> on the <code>&lt;table&gt;</code>)
			</dt>
			<dd>
				<code>.striped</code> — odd-row tint · <code>.nowrap</code> — prevent cell wrap (pair with
				<code>.scrollable</code> wrapper for x-scroll) · <code>.sticky</code> — pin
				<code>&lt;thead&gt;</code> headers (requires a scrolling ancestor).
			</dd>
			<dt>
				<code
					>UseTableReturn.{caption, headers, rows, cells, footer, sort, expansion, selection,
					resize, focus, pagination, columns, total, data}</code
				>
			</dt>
			<dd>
				Reactive read + write sub-domains. <code>.resize</code> is <code>null</code> when
				<code>options.resize</code> isn't passed.
			</dd>
		</dl>
	</section>
</template>
