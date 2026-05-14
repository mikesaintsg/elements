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

// ─────────────────────────────────────────────────────────────────────
// Shared dataset for the §1 comprehensive integrated demo.
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
	expansion: { multiple: true, initial: ['i1'] },
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
const fruits = [
	'Apple',
	'Banana',
	'Cherry',
	'Date',
	'Elderberry',
	'Fig',
	'Grape',
	'Honeydew',
	'Imbe',
	'Jackfruit',
	'Kiwi',
	'Lemon',
]
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

// Windowed page-list for the `<nav aria-label="Pagination">` chrome.
// Renders at most 5 numbered tiles plus first / last + leading / trailing
// ellipses. `null` slots paint as disabled `<a>` so the chrome's tile
// stride stays even regardless of where the active page lands.
function pageList(page: number, count: number): readonly (number | null)[] {
	if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
	const window = new Set<number>([1, count, page - 1, page, page + 1])
	const sorted = [...window].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b)
	const out: (number | null)[] = []
	for (let i = 0; i < sorted.length; i++) {
		const current = sorted[i]
		const previous = sorted[i - 1]
		if (i > 0 && current !== undefined && previous !== undefined && current - previous > 1) {
			out.push(null)
		}
		if (current !== undefined) out.push(current)
	}
	return out
}
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
const actionLog = ref<string[]>([])
const note = (line: string): void => {
	actionLog.value = [...actionLog.value.slice(-3), line]
}

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — Inline editing via flush form controls. The `input.flush` /
// `select.flush` modifiers (modifiers/_local.scss) make a real `<input>`
// / `<select>` read as plain table text until the user engages — no
// `contenteditable` on random elements, so the validation contract +
// type-specific UI + screen-reader affordances stay intact.
// ─────────────────────────────────────────────────────────────────────
type EditRow = {
	id: string
	sku: string
	name: string
	stock: number
	bucket: 'in' | 'low' | 'out'
}
const editRows = ref<EditRow[]>([
	{ id: 'e1', sku: 'SKU-001', name: 'Lacquer pen', stock: 18, bucket: 'in' },
	{ id: 'e2', sku: 'SKU-002', name: 'Carbon ribbon', stock: 4, bucket: 'low' },
	{ id: 'e3', sku: 'SKU-003', name: 'Press plate', stock: 0, bucket: 'out' },
])
const editRef = useTemplateRef<HTMLTableElement>('editRef')
const edit = useTable(editRef, {
	headers: ['SKU', 'Name', 'Stock', 'Bucket'],
})

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — Expansion isolation. 3 rows; one always-open; the SCSS rule
// shown inline. Visual proof of the `interpolate-size` tween.
// ─────────────────────────────────────────────────────────────────────
const expRef = useTemplateRef<HTMLTableElement>('expRef')
const exp = useTable(expRef, {
	headers: ['ID', 'Topic'],
	expansion: { multiple: true, initial: ['t1'] },
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
const dictionary = [
	['1', 'caret', 'A horizontal-wedge symbol used to indicate insertion or selection.'],
	['2', 'kerning', 'Per-pair letter spacing adjustment to improve typographical rhythm.'],
	['3', 'leading', 'Vertical space between baselines of consecutive lines of text.'],
	['4', 'tracking', 'Uniform letter spacing applied across a run of characters.'],
	['5', 'baseline', 'Imaginary line on which most letters sit.'],
	['6', 'x-height', 'Height of the lowercase letter "x" within a typeface.'],
	['7', 'ascender', 'Stroke of a lowercase letter extending above the x-height.'],
	['8', 'descender', 'Stroke of a lowercase letter extending below the baseline.'],
	['9', 'cap height', 'Height of an uppercase letter.'],
	['10', 'em', 'Relative unit equal to the type-size of the current font.'],
	['11', 'em-dash', 'A long dash used to set off parenthetical text.'],
	['12', 'em-space', 'A space the width of an em.'],
]

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
				<code>modifiers/_local.scss</code> adds <code>input.flush</code> /
				<code>select.flush</code> / <code>textarea.flush</code> for in-cell editing. Transparent at
				rest, subtle backdrop on hover, full bordered focus chrome — §5 demonstrates. The flush
				modifier preserves the validation contract + type-specific UI that
				<code>contenteditable</code> on random elements throws away.
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
		<menu>
			<li>
				<button type="button" class="subtle small" @click="main.selection.select()">
					Select all on page
				</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="main.selection.clear()">
					Clear selection
				</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="main.expansion.expand(issues[0].id)">
					Expand first
				</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="main.expansion.collapse()">
					Collapse all
				</button>
			</li>
			<li>
				<button type="button" class="subtle small" @click="main.sort.clear()">Clear sort</button>
			</li>
			<li><button type="button" class="subtle small" @click="reset">Reset</button></li>
		</menu>
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
		<table ref="sortRef" class="striped" style="max-inline-size: 36rem">
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
		<table ref="pgRef" class="striped" style="max-inline-size: 36rem">
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
		<table ref="selRef" class="striped" style="max-inline-size: 48rem">
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
		<h2>5. Inline editing — <code>input.flush</code> / <code>select.flush</code></h2>
		<p>
			Inline editing in table cells uses real <code>&lt;input&gt;</code> /
			<code>&lt;select&gt;</code> form controls modified by <code>.flush</code> — declared in
			<code>modifiers/_local.scss</code>. The control reads as plain table text at rest (transparent
			background + transparent border); hover reveals a subtle backdrop tint so the affordance
			announces itself; focus promotes to the full bordered baseline with the variant focus ring;
			<code>:user-invalid</code> still paints the danger border after the user touches the field.
			Using the right element preserves the validation contract, <code>type</code>-specific UI, IME
			composition, and screen-reader affordances — <code>contenteditable</code> on random elements
			throws all of that away.
		</p>
		<table ref="editRef" class="striped" style="max-inline-size: 48rem">
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
							class="flush"
							type="text"
							:aria-label="`Name for ${row.sku}`"
						/>
					</td>
					<td>
						<input
							v-model.number="row.stock"
							class="flush"
							type="number"
							min="0"
							:aria-label="`Stock for ${row.sku}`"
						/>
					</td>
					<td>
						<select v-model="row.bucket" class="flush" :aria-label="`Bucket for ${row.sku}`">
							<option value="in">In stock</option>
							<option value="low">Low</option>
							<option value="out">Out</option>
						</select>
					</td>
				</tr>
			</tbody>
		</table>
		<p>
			<small>
				Live row state:
				<code>{{ editRows.map((r) => `${r.sku}:${r.stock}:${r.bucket}`).join(' · ') }}</code> ·
				factory ready: <code>{{ edit.ready.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-table-expand">
		<h2>6. Expansion — CSS-driven via <code>interpolate-size</code></h2>
		<p>
			Click a row's leading <code>id</code> cell to disclose the detail row.
			<code>elements/_table.scss</code> drives the visual tween — the factory's only writes are
			<code>[data-table-expanded]</code> on the data row + <code>[inert]</code> on the panel.
			<code>[inert]</code> rather than <code>[hidden]</code> is what allows the
			<code>block-size: 0 → auto</code> animation: <code>display: none</code> would freeze the
			transition.
		</p>
		<table ref="expRef" class="striped" style="max-inline-size: 48rem">
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
				>Expanded: <code>[{{ Array.from(exp.expansion.expanded).join(', ') }}]</code></small
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
		<table ref="fcRef" class="striped" style="max-inline-size: 24rem">
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
