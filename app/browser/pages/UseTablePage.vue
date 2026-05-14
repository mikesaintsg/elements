<script lang="ts" setup>
/**
 * UseTablePage — native `<table>` controller.
 *
 * `useTable(tableRef, options)` is the framework's adapter over
 * `createTable`. Owns: header / row / cell / footer / caption read+write,
 * single + multi-column sort, pagination (rows-per-page or rendered-page
 * baseline), keyboard focus rove (with optional wrap), row-expansion
 * (CSS-driven via `[data-table-expanded]` + `interpolate-size`), shift /
 * ctrl / cmd row selection, column resize via pointer-capture handles,
 * sticky header chrome.
 *
 * API surface coverage (from Phase 1 audit):
 *   1. Headers + rows + footer — read / append / insert / update / remove.
 *   2. Sort (single + multi-column, `mandate`, `auto`).
 *   3. Pagination (`pagination.size`, reactive `page` / `count`).
 *   4. Selection (shift-range, ctrl / cmd toggle, plain replace,
 *      outside-click clear, `[data-no-select]` opt-out target).
 *   5. Expansion (`[data-table-expanded]` row + `[data-table-expansion-
 *      panel]` panel; CSS-driven block-size tween via `interpolate-size:
 *      allow-keywords`).
 *   6. Resize (per-column min/max, drag handles, `[data-table-resizing]`
 *      while dragging).
 *   7. Focus (keyboard rove with optional wrap, programmatic `.focus()` /
 *      `.move(direction)`).
 *   8. Sticky header chrome (CSS-only; `_table.scss` paints it when the
 *      ancestor scrolls).
 *
 * Phase 1 audit pass (§5.4.1 native-platform redundancy walk) stripped:
 *   - `[data-collapsing]` writes — the JS height tween was redundant
 *     with the CSS-driven animation in `elements/_table.scss`
 *     § "Row expansion panel" (block-size: 0 → auto via `interpolate-
 *     size: allow-keywords`, motion-contract tokens).
 *   - `expansion.animate` option — uniform with framework motion
 *     contract; consumers honour `prefers-reduced-motion` via the
 *     mixin or retune `--set-motion-duration` directly.
 *   - `[hidden]` toggle on the panel — `[hidden]` forces `display: none`
 *     which freezes the CSS `block-size` tween. Replaced with
 *     `[inert]` which suppresses focus / pointer / a11y on the closed
 *     panel without disabling the transition.
 *   - `runTransition` import — no longer needed for expansion (the
 *     CSS owns the visual timing).
 *
 * Cross-references:
 *   - `<table>` element baseline (`elements/_table.scss`) — sticky
 *     header, row striping, expansion panel chrome.
 *   - `usePointer` — the column-resize handles consume it indirectly
 *     via `createTable`'s pointer wiring.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useTable } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo dataset — 24 rows so pagination + expand + sort are meaningful.
// ─────────────────────────────────────────────────────────────────────
interface Issue {
	id: string
	title: string
	status: 'open' | 'in-progress' | 'resolved'
	priority: 'low' | 'medium' | 'high' | 'critical'
	assignee: string
	updated: string
	detail: string
}
const issues: readonly Issue[] = [
	{
		id: 'i1',
		title: 'Scroll-spy active threshold',
		status: 'open',
		priority: 'medium',
		assignee: 'Aria',
		updated: '2026-05-12',
		detail: 'Spy lands the wrong section at the body grid edge.',
	},
	{
		id: 'i2',
		title: 'Popover anchor flip',
		status: 'resolved',
		priority: 'low',
		assignee: 'Cass',
		updated: '2026-05-10',
		detail: 'Anchor-positioned popovers flipped on a 1-row threshold.',
	},
	{
		id: 'i3',
		title: 'Reduced-motion tab fade',
		status: 'in-progress',
		priority: 'high',
		assignee: 'Dax',
		updated: '2026-05-13',
		detail: 'Tab panel still fades when reduced-motion is on.',
	},
	{
		id: 'i4',
		title: 'Drawer focus return',
		status: 'open',
		priority: 'high',
		assignee: 'Aria',
		updated: '2026-05-11',
		detail: 'Closing a drawer leaves focus on <body>.',
	},
	{
		id: 'i5',
		title: 'Toast deck overflow clip',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-09',
		detail: 'Deck cards clipped their hit-area pseudos.',
	},
	{
		id: 'i6',
		title: 'Combobox no-match dismiss',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Cass',
		updated: '2026-05-14',
		detail: 'Auto-hide on filter no-match removed.',
	},
	{
		id: 'i7',
		title: 'Select keyboard rove wrap',
		status: 'open',
		priority: 'low',
		assignee: 'Dax',
		updated: '2026-05-08',
		detail: 'End / Home wrap inverted.',
	},
	{
		id: 'i8',
		title: 'Aside drawer scrim opacity',
		status: 'in-progress',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-13',
		detail: 'Scrim reads too transparent in dark mode.',
	},
	{
		id: 'i9',
		title: 'Details accordion sync',
		status: 'resolved',
		priority: 'critical',
		assignee: 'Aria',
		updated: '2026-05-05',
		detail: "Accordion didn't close siblings on programmatic open.",
	},
	{
		id: 'i10',
		title: 'Form scroll-into-view',
		status: 'open',
		priority: 'low',
		assignee: 'Cass',
		updated: '2026-05-07',
		detail: "Validation error doesn't scroll to first invalid field.",
	},
	{
		id: 'i11',
		title: 'Nav rail filter focus',
		status: 'open',
		priority: 'medium',
		assignee: 'Dax',
		updated: '2026-05-12',
		detail: 'Press "/" focuses the filter even with inputs focused elsewhere.',
	},
	{
		id: 'i12',
		title: 'Carousel touch slide',
		status: 'in-progress',
		priority: 'high',
		assignee: 'Bee',
		updated: '2026-05-13',
		detail: 'Touch swipe locks the deck mid-slide.',
	},
	{
		id: 'i13',
		title: 'Tooltip placement reflow',
		status: 'resolved',
		priority: 'low',
		assignee: 'Aria',
		updated: '2026-05-06',
		detail: 'Tooltips repositioned on every scroll frame.',
	},
	{
		id: 'i14',
		title: 'Dialog modal stack',
		status: 'open',
		priority: 'critical',
		assignee: 'Cass',
		updated: '2026-05-14',
		detail: 'Stacked modals share one backdrop.',
	},
	{
		id: 'i15',
		title: 'Menu separator rule',
		status: 'resolved',
		priority: 'low',
		assignee: 'Dax',
		updated: '2026-05-04',
		detail: 'Separators rendered ABOVE the section eyebrow.',
	},
	{
		id: 'i16',
		title: 'Toast swipe rubber-band',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Bee',
		updated: '2026-05-14',
		detail: 'Swipe cap at threshold; auto-dismiss at bound.',
	},
	{
		id: 'i17',
		title: 'Sidebar gutter flex',
		status: 'resolved',
		priority: 'medium',
		assignee: 'Aria',
		updated: '2026-05-14',
		detail: 'Pinned region ballooned via flex-grow inheritance.',
	},
	{
		id: 'i18',
		title: 'Drag-drop file overlay',
		status: 'open',
		priority: 'high',
		assignee: 'Cass',
		updated: '2026-05-13',
		detail: 'Drop overlay flickers on dragenter / dragleave race.',
	},
	{
		id: 'i19',
		title: 'Table expansion strip',
		status: 'resolved',
		priority: 'high',
		assignee: 'Dax',
		updated: '2026-05-14',
		detail: 'JS height tween replaced by CSS interpolate-size.',
	},
	{
		id: 'i20',
		title: 'Pointer cursor lock',
		status: 'in-progress',
		priority: 'low',
		assignee: 'Bee',
		updated: '2026-05-12',
		detail: 'Body cursor stays grabbing after pointercancel.',
	},
	{
		id: 'i21',
		title: 'Theme cycle reduced-motion',
		status: 'open',
		priority: 'low',
		assignee: 'Aria',
		updated: '2026-05-08',
		detail: 'View-transition runs even with prefers-reduced-motion.',
	},
	{
		id: 'i22',
		title: 'Tabs lazy panel mount',
		status: 'open',
		priority: 'medium',
		assignee: 'Cass',
		updated: '2026-05-11',
		detail: 'Inactive tab panel keeps its DOM tree alive.',
	},
	{
		id: 'i23',
		title: 'Alert auto-dismiss timer',
		status: 'in-progress',
		priority: 'medium',
		assignee: 'Dax',
		updated: '2026-05-13',
		detail: 'Timer keeps running across remounts.',
	},
	{
		id: 'i24',
		title: 'Output status announcement',
		status: 'resolved',
		priority: 'low',
		assignee: 'Bee',
		updated: '2026-05-09',
		detail: 'Live region announced on every value change.',
	},
]

// ─────────────────────────────────────────────────────────────────────
// Reactive page state — same dataset feeds every demo so the user can
// see one model reflected across sort, select, expand, paginate.
//
// `useTable`'s pagination sub-domain is a STATE MODEL — `table.pagination
// .to(n)` emits `elements:table:paginate { page, offset, size }`; the
// consumer is responsible for surfacing only the matching row slice. We
// drive that here via a `visibleIssues` computed: Vue renders just the
// active page's rows; `options.offset` (reactive) keeps `aria-rowindex`
// matched to the FULL dataset position, and `options.total` keeps
// `aria-rowcount` honest.
// ─────────────────────────────────────────────────────────────────────
const pageSize = ref(8)
const currentPage = ref(1)
const tableRef = useTemplateRef<HTMLTableElement>('tableRef')

const offsetForPage = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const visibleIssues = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	return issues.slice(start, start + pageSize.value)
})

// Body rows are rendered by Vue in the template (one `<tr data-id>` per
// issue with an interleaved `<tr data-table-expansion>` detail row). The
// factory operates on the existing DOM — we omit `options.rows` so the
// factory doesn't seed its own body content. Headers + caption come
// through options for the structural chrome.
const table = useTable(tableRef, {
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
	expansion: { multiple: true, initial: ['i1'] },
	selection: { strategy: 'page', click: true },
	resize: { min: 64, max: 480 },
	focus: { keyboard: true, wrap: true },
	on: {
		paginate: (event: CustomEvent) => {
			const detail = event.detail as { page: number; offset: number; size: number }
			currentPage.value = detail.page
		},
	},
})

const detailFor = (id: string): Issue | undefined => issues.find((i) => i.id === id)

const sortLine = computed(() =>
	table.sort.columns.value.length === 0
		? '(none)'
		: table.sort.columns.value.map((c, i) => `${i + 1}. ${c.key} ${c.direction}`).join(' · '),
)

const expandFirst = (): void => table.expansion.expand(issues[0]!.id)
const collapseAll = (): void => table.expansion.collapse()
const selectAll = (): void => table.selection.select()
const clearSelection = (): void => table.selection.clear()
const reset = (): void => {
	table.selection.clear()
	table.expansion.collapse()
	table.sort.clear()
	table.pagination.to(1)
}
</script>

<template>
	<section id="use-table-intro">
		<hgroup>
			<h1>useTable</h1>
			<p>
				Native <code>&lt;table&gt;</code> controller. Wraps the element with sort, pagination,
				selection, row expansion, column resize, keyboard focus, and the sticky-header chrome the
				element baseline supplies. Composes nothing — `createTable` is a standalone factory; the
				table is the source of truth and every sub-domain (caption / headers / rows / cells / footer
				/ sort / pagination / selection / expansion / resize / focus) is a thin reactive facade over
				real DOM.
			</p>
		</hgroup>
		<p>
			Phase 1 audit stripped two pieces of dead machinery from <code>createTable</code> ahead of
			this page:
		</p>
		<ul>
			<li>
				<strong><code>[data-collapsing]</code> + JS height tween</strong> — the factory previously
				animated row-expansion via <code>style.height = '0' → scrollHeight</code> with a
				<code>runTransition</code> wait. The CSS in <code>elements/_table.scss</code> already
				animates the panel via
				<code>tr[data-table-expanded] + tr &gt; td &gt; [data-table- expansion-panel]</code> using
				<code>interpolate-size: allow-keywords</code> + motion-contract tokens. The JS was pure
				overhead.
			</li>
			<li>
				<strong><code>expansion.animate</code> option</strong> — uniform with the framework motion
				contract. Reduced-motion handled by the <code>@include transition()</code> mixin; per-table
				opt-out (rare) lands via <code>--set-motion-duration: 0s</code> on a class.
			</li>
			<li>
				<strong><code>[hidden]</code> panel toggle → <code>[inert]</code></strong> —
				<code>[hidden]</code> forces <code>display: none</code> which freezes the CSS
				<code>block-size</code> tween. <code>[inert]</code> blocks focus / pointer / a11y on the
				closed panel without disabling the animation. Baseline 2022.
			</li>
		</ul>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				rows <code>{{ table.rows.count.value }}</code> · total
				<code>{{ table.total.value }}</code> · page <code>{{ table.pagination.page.value }}</code> /
				<code>{{ table.pagination.count.value }}</code> · selected
				<code>{{ table.selection.ids.size }}</code> · expanded
				<code>{{ table.expansion.expanded.size }}</code> · sort <code>{{ sortLine }}</code> ·
				focused
				<code>{{
					table.focus.cell.value
						? `(${table.focus.cell.value.row},${table.focus.cell.value.column})`
						: 'none'
				}}</code>
			</p>
		</aside>
		<menu>
			<li><button type="button" class="subtle small" @click="expandFirst">Expand first</button></li>
			<li><button type="button" class="subtle small" @click="collapseAll">Collapse all</button></li>
			<li>
				<button type="button" class="subtle small" @click="selectAll">Select all on page</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="clearSelection">Clear selection</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="() => table.sort.clear()">
					Clear sort
				</button>
			</li>
			<li><button type="button" class="subtle small" @click="reset">Reset</button></li>
		</menu>
	</section>

	<section id="use-table-live">
		<h2>1. Live table — every feature on one surface</h2>
		<p>
			The same dataset feeds every sub-domain. Click a column header to sort (shift-click for
			multi-column); click row headers to select (shift / ctrl / cmd modifiers honoured); click the
			expansion chevron to disclose the detail row; drag the right edge of any column header to
			resize; press Tab to enter the keyboard rove, then arrow keys to move (wraps at edges).
		</p>
		<div class="scrollable" style="max-block-size: 32rem">
			<table ref="tableRef" class="striped">
				<colgroup>
					<col v-for="(_, i) in 6" :key="i" />
				</colgroup>
				<!--
				  Headers + caption injected by the factory from the
				  `headers` + `caption` options. Body rows rendered by
				  Vue: each issue becomes a data row (`<tr :data-id>`)
				  followed by an expansion detail row (`<tr data-table-
				  expansion>`) whose `<div data-table-expansion-panel>`
				  holds the disclosure content. The factory finds the
				  detail-row pair via `nextElementSibling` matching the
				  `data-table-expansion` marker; expanding the data row
				  flips `[data-table-expanded]` on it, which the SCSS
				  selector `tr[data-table-expanded] + tr > td > [data-
				  table-expansion-panel]` consumes to tween the panel's
				  `block-size: 0 → auto` via `interpolate-size`.
				-->
				<tbody>
					<template v-for="issue in visibleIssues" :key="issue.id">
						<tr :data-id="issue.id">
							<td>{{ issue.id }}</td>
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
									<small> Filed by {{ issue.assignee }} · last touched {{ issue.updated }} </small>
								</div>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const tableRef = useTemplateRef('tableRef')
const table = useTable(tableRef, {
  caption: '…',
  headers: ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Updated'],
  rows: issues.map(i =&gt; [i.id, i.title, i.status, i.priority, i.assignee, i.updated]),
  value: 'id',                                          // row identity from data
  columns: [{ key: 'id', sortable: true }, …],
  sort: { multiple: true, mandate: false, auto: true }, // shift-click stacks
  pagination: { size: pageSize },                       // Ref&lt;number&gt; OK
  expansion: { multiple: true, initial: ['i1'] },
  selection: { strategy: 'page', click: true },
  resize: { min: 64, max: 480 },
  focus: { keyboard: true, wrap: true },
})

&lt;table ref="tableRef" class="striped"&gt;
  &lt;!-- Expansion detail rows interleaved with data rows.
       The factory pairs them via the data-row's `data-id`
       and the detail row's `data-table-expansion` marker. --&gt;
  &lt;tr :data-id="issue.id" data-table-expansion&gt;
    &lt;td colspan="6"&gt;
      &lt;div data-table-expansion-panel inert&gt;…&lt;/div&gt;
    &lt;/td&gt;
  &lt;/tr&gt;
&lt;/table&gt;</code></pre>
		</details>
	</section>

	<section id="use-table-sort">
		<h2>2. Sort — single + multi-column</h2>
		<p>
			Headers carry <code>aria-sort</code> mirroring the live sort state (<code
				>'ascending' | 'descending' | 'none'</code
			>) so the chrome's chevron + a11y label flow from the same source. Click a header to toggle;
			with <code>sort.multiple: true</code>, shift-click adds a column to the sort stack (next
			priority). <code>sort.auto: true</code> (default) re-orders the
			<code>&lt;tbody&gt;</code> rows in place; pass <code>auto: false</code> when the consumer
			fetches a server-paged dataset in response to the <code>elements:table:sort</code> event.
			<code>sort.mandate: true</code> prevents the "unsorted" state (cycle stays at asc → desc →
			asc).
		</p>
		<p>
			<small
				>Current stack: <code>{{ sortLine }}</code></small
			>
		</p>
	</section>

	<section id="use-table-paginate">
		<h2>3. Pagination — rows per page, reactive size</h2>
		<p>
			<code>pagination.size</code> accepts a <code>number</code> or <code>Ref&lt;number&gt;</code>;
			the live <code>page</code> + <code>count</code> derivations recompute when either flips. Omit
			<code>size</code> entirely and the factory treats the rendered <code>&lt;tbody&gt;</code> row
			count as the page (the "rendered page IS the page" idiom — useful for server-paged datasets
			where the consumer renders one page at a time and asks the factory to manage just navigation
			chrome). Use <code>table.pagination.to(n)</code> / <code>.next()</code> /
			<code>.prev()</code> to drive the page; the factory emits
			<code>elements:table:paginate</code> with <code>{ page, offset, size }</code>.
		</p>
		<menu>
			<li>
				<button type="button" class="subtle small" @click="table.pagination.prev()">Prev</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="table.pagination.next()">Next</button>
			</li>
			<li>
				<label>
					Page size
					<select v-model.number="pageSize">
						<option :value="4">4</option>
						<option :value="8">8</option>
						<option :value="12">12</option>
						<option :value="24">24</option>
					</select>
				</label>
			</li>
		</menu>
		<p>
			<small>
				Page <code>{{ table.pagination.page.value }}</code> of
				<code>{{ table.pagination.count.value }}</code> · size
				<code>{{ table.pagination.size.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-table-select">
		<h2>4. Selection — shift / ctrl / cmd model</h2>
		<p>
			The factory wires the canonical desktop selection model on <code>&lt;tr&gt;</code> clicks:
			plain click <strong>replaces</strong> the selection with that row; <kbd>Ctrl</kbd> /
			<kbd>⌘</kbd> click <strong>toggles</strong> membership; <kbd>Shift</kbd> click
			<strong>extends</strong> the range from the anchor row; clicking outside the table clears.
			Clicks on interactive descendants (<code>input</code>, <code>button</code>, <code>a</code>,
			<code>select</code>, <code>textarea</code>, <code>label</code>, anything under
			<code>[data-no-select]</code>) are skipped so checkboxes / row actions survive.
			<code>selection.strategy</code> controls the scope of <code>select-all</code>:
			<code>'page'</code> (default), <code>'all'</code>, or <code>'single'</code>.
		</p>
		<p>
			<small>
				Selected ids:
				<code>[{{ Array.from(table.selection.ids).join(', ') }}]</code> · select-all =
				<code>{{ table.selection.all.value }}</code> · mixed =
				<code>{{ table.selection.mixed.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-table-expand">
		<h2>5. Row expansion — CSS-driven via <code>interpolate-size</code></h2>
		<p>
			Click the chevron in the leading cell to disclose the detail row. The visual tween is owned by
			the SCSS rule in <code>elements/_table.scss</code>:
		</p>
		<pre v-pre><code>table &gt; tbody &gt; tr &gt; td &gt; [data-table-expansion-panel] {
  block-size: 0;
  opacity: 0;
  overflow: clip;
  padding-block: 0;
  @include transition((
    block-size var(--set-motion-duration) var(--set-motion-timing-function),
    padding-block var(--set-motion-duration) var(--set-motion-timing-function),
    opacity var(--set-motion-duration) ease-out,
  ));
}
table &gt; tbody &gt; tr[data-table-expanded] + tr &gt; td &gt; [data-table-expansion-panel] {
  block-size: auto;
  opacity: 1;
  padding-block: calc(var(--spacing) * 3);
}</code></pre>
		<p>
			<code>interpolate-size: allow-keywords</code> (declared globally on
			<code>&lt;html&gt;</code> in <code>_html.scss</code>) makes the
			<code>block-size: 0 → auto</code> tween animate — same contract
			<code>::details-content</code> uses for the <code>&lt;details&gt;</code> disclosure. The
			factory's only writes are <code>[data-table-expanded]</code> on the data row +
			<code>[inert]</code> on the panel (which suppresses focus / pointer / a11y on the visually
			clipped closed state without freezing the tween — <code>[hidden]</code> would have).
		</p>
		<p>
			<small
				>Expanded ids: <code>[{{ Array.from(table.expansion.expanded).join(', ') }}]</code></small
			>
		</p>
	</section>

	<section id="use-table-resize">
		<h2>6. Column resize — pointer-capture handles</h2>
		<p>
			With <code>resize: { min, max }</code> in the options, the factory mounts a drag handle on
			each header's trailing edge. Pointer-down + drag changes the column's inline-size in real
			time; <code>[data-table-resizing]</code> on the table marks the active drag (consumer can
			paint a different cursor / scrim during the gesture). The handle uses
			<code>createPointer</code> under the hood — pointer-capture means the drag persists when the
			cursor leaves the narrow handle bounds.
		</p>
		<p>
			<small>
				Resize active: <code>{{ table.resize?.active.value }}</code
				>. Try dragging the right edge of any header above (cursor goes to <code>col-resize</code>).
			</small>
		</p>
	</section>

	<section id="use-table-focus">
		<h2>7. Keyboard focus + sticky header</h2>
		<p>
			With <code>focus: { keyboard: true, wrap: true }</code>, the factory wires ArrowLeft /
			ArrowRight / ArrowUp / ArrowDown / Home / End / Tab on the table. The focused cell carries
			<code>tabindex="0"</code>; siblings <code>tabindex="-1"</code> — APG roving-tabindex pattern.
			<code>wrap: true</code> wraps focus at row / column edges; default (<code>false</code>)
			clamps. Use <code>table.focus.move('right' | 'left' | …)</code> for programmatic motion.
		</p>
		<p>
			The sticky header chrome is element-layer — <code>elements/_table.scss</code> paints
			<code>thead th { position: sticky; inset-block-start: 0 }</code> when the table is inside a
			scrolling ancestor (the <code>.scrollable</code> wrapper above). No composable wiring needed.
		</p>
		<p>
			<small>
				Focused cell:
				<code>{{
					table.focus.cell.value
						? `row ${table.focus.cell.value.row}, column ${table.focus.cell.value.column}`
						: 'none'
				}}</code>
			</small>
		</p>
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
			<dt><code>options.value</code></dt>
			<dd>
				<code>string</code>. Property name read from row data for stable identity (written to
				<code>data-id</code> on each <code>&lt;tr&gt;</code>). When omitted, the factory falls back
				to the row's position.
			</dd>
			<dt><code>options.columns</code></dt>
			<dd>
				<code>readonly TableColumn[]</code>. Per-column schema —
				<code>{ key, title?, sortable?, filterable?, sort?, filter? }</code>. Drives the sort cycle
				+ filter predicate.
			</dd>
			<dt><code>options.sort</code></dt>
			<dd>
				<code>{ multiple?, mandate?, order?, auto? }</code>. <code>multiple</code> enables the
				multi-column stack (shift-click adds); <code>mandate</code> blocks the "unsorted" state;
				<code>order</code> sets the first-click direction (<code>'asc'</code> default);
				<code>auto</code> reorders <code>&lt;tbody&gt;</code> rows in place (<code>true</code>
				default — pass <code>false</code> when the consumer drives a server-paged refetch on the
				<code>elements:table:sort</code> event).
			</dd>
			<dt><code>options.pagination</code></dt>
			<dd>
				<code>{ size? }</code>. <code>size</code> is <code>number | Ref&lt;number&gt;</code>; when
				omitted, the rendered body row count IS the page.
			</dd>
			<dt><code>options.expansion</code></dt>
			<dd>
				<code>{ multiple?, initial? }</code>. <code>multiple</code> allows multiple rows expanded
				simultaneously (<code>true</code> default); <code>initial</code> seeds the expanded set at
				construction.
			</dd>
			<dt><code>options.selection</code></dt>
			<dd>
				<code>{ strategy?, selectable?, click? }</code>. <code>strategy</code> is
				<code>'page'</code> / <code>'all'</code> / <code>'single'</code>; <code>selectable</code> is
				a predicate that vetoes per-row; <code>click</code> opts in / out of the desktop selection
				model on row clicks.
			</dd>
			<dt><code>options.resize</code></dt>
			<dd>
				<code>{ min?, max? }</code>. Enables column-resize handles with the bounds in pixels. Absent
				option = no resize handles mount.
			</dd>
			<dt><code>options.focus</code></dt>
			<dd>
				<code>{ keyboard?, wrap? }</code>. <code>keyboard</code> enables the arrow / Home / End rove
				(<code>false</code> default); <code>wrap</code> wraps at row / column edges (<code
					>false</code
				>
				default).
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ change?, focus?, select?, sort?, expand?, collapse?, paginate? }</code>. All
				informational (post-state). Also dispatch as DOM events
				(<code>elements:table:{change,focus,select,sort,expand,collapse,paginate}</code>).
			</dd>
			<dt>
				<code>UseTableReturn.{caption, headers, rows, cells, footer}</code>
			</dt>
			<dd>Reactive read + write sub-domains over the table's structural cells.</dd>
			<dt>
				<code>.{sort, expansion, selection, resize, focus, pagination}</code>
			</dt>
			<dd>
				Behaviour sub-domains, each with its own <code>.expand()</code> / <code>.toggle()</code> /
				<code>.clear()</code> shape. <code>.resize</code> is <code>null</code> when
				<code>options.resize</code> isn't passed.
			</dd>
			<dt><code>.data</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;readonly TableRow[]&gt;&gt;</code>. The current body rows as a
				reactive snapshot (each row is <code>readonly string[]</code>).
			</dd>
			<dt><code>.total</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;number&gt;&gt;</code>. Mirrors <code>aria-rowcount</code> on the
				<code>&lt;table&gt;</code>; defaults to the body row count when
				<code>options.total</code> isn't passed.
			</dd>
		</dl>
	</section>
</template>
