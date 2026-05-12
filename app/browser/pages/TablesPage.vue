<script lang="ts" setup>
/**
 * TablesPage — the canonical reference for `<table>`, `<caption>`,
 * `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`.
 *
 * API surface coverage (Phase 1 audit):
 *   Bare `<table>` — Tailwind preflight zeroes `border-collapse` +
 *     spacing; the framework re-asserts `border-collapse: collapse`,
 *     a `--set-table-*` token chain, cell padding, and per-row
 *     `border-block-end` dividers. `<caption>` reads as a label
 *     above the grid (`caption-side: top` UA default).
 *   `<thead>` cell chrome — `<th>` carries `--set-table-header-
 *     background-color` (12% mix of the divider color over canvas)
 *     so the header band reads as a separate visual register.
 *   `tbody tr:hover` — every body row tints on hover via
 *     `--set-table-row-hover-background-color` (25% mix). Default
 *     behavior; `.hover` is a no-op alias for consumers who prefer
 *     the explicit class.
 *   `.striped` / `.striped-columns` — alternating-row / -column
 *     tints at 12% mix. Specificity bumped past the bare-cell rule
 *     so the stripe wins, then the hover override at the bottom of
 *     the layer re-bumps so hover still wins over stripes.
 *   `.bordered` / `.borderless` — full grid lines (every cell edge
 *     + perimeter) or zero dividers (drop the row seam for tables
 *     inside an already-bordered surface).
 *   `.small` — halved cell padding for dense data grids.
 *   `.nowrap` — prevent cell text from wrapping; pair with
 *     `.table-responsive` so the row stays on one line and the
 *     wrapper scrolls instead.
 *   `.caption-top` / `.caption-bottom` — flip the caption visually
 *     without changing source order.
 *   `<tr class="{variant}">` — washes a single row with the
 *     variant's `bg-subtle` token. Same theme-aware triplet alerts /
 *     callouts / list-group variant rows consume.
 *   `<tr class="active">` — manual highlight tier between hover and
 *     selected (35% mix, reads as "current page" emphasis).
 *   `<tr aria-selected="true">` — selection tier (18% mix of
 *     `--color-primary`). Wins over hover + variant tints via
 *     source-order override.
 *   `<tbody class="group-divider">` — heavier 2px divider above the
 *     `<tbody>` block; useful for splitting datasets by category.
 *   `<th data-key="…">` with `[aria-sort]` — sort indicator chrome
 *     (caret glyph via `--set-icon-*` mask). Interactive sort logic
 *     belongs on `UseTablePage`; this page demonstrates the static
 *     rendering only.
 *   `<div class="table-responsive">` wrapper — bounds horizontal
 *     overflow to the wrapper so a wide table doesn't push the
 *     viewport wider than the page.
 *
 * Cross-references:
 *   - Interactive sort / paginate / row-expand / column-resize live
 *     on `UseTablePage` (composables roster). The chrome (sort
 *     indicator + resize handle hook + expansion seam) is rendered
 *     by this page, but the wiring sits in `useTable`.
 *   - The framework's `<aside>` callout and `<article>` card share
 *     the `--color-{variant}-bg-subtle` triplet that powers per-row
 *     tints, so a `<tr class="danger">` and a `<div class="aside
 *     danger">` paint the same palette.
 */
const variants = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

interface Member {
	id: string
	name: string
	role: string
	team: string
	commits: number
	last: string
}

const members: readonly Member[] = [
	{
		id: 'AL-04',
		name: 'Ada Lovelace',
		role: 'Mathematician',
		team: 'Analytical',
		commits: 342,
		last: '2 hours ago',
	},
	{
		id: 'GH-12',
		name: 'Grace Hopper',
		role: 'Compiler theorist',
		team: 'Mark I',
		commits: 287,
		last: 'Yesterday',
	},
	{
		id: 'AT-21',
		name: 'Alan Turing',
		role: 'Cryptographer',
		team: 'Hut 8',
		commits: 256,
		last: '3 days ago',
	},
	{
		id: 'KR-08',
		name: 'Katherine Johnson',
		role: 'Mathematician',
		team: 'Orbital',
		commits: 198,
		last: 'Last week',
	},
	{
		id: 'MH-15',
		name: 'Margaret Hamilton',
		role: 'Software engineer',
		team: 'Apollo',
		commits: 412,
		last: '5 minutes ago',
	},
]
</script>

<template>
	<section id="tables-intro">
		<hgroup>
			<h1>Tables</h1>
			<p>
				<code>&lt;table&gt;</code> with <code>&lt;caption&gt;</code>, <code>&lt;thead&gt;</code> /
				<code>&lt;tbody&gt;</code> / <code>&lt;tfoot&gt;</code>, <code>&lt;tr&gt;</code>,
				<code>&lt;th&gt;</code>, <code>&lt;td&gt;</code>. The framework ships a Bootstrap-style
				chrome (collapsed borders, header band, hover tint) plus the modifier vocabulary every other
				element uses — striped, bordered, compact, variant tints, selection state.
			</p>
		</hgroup>
		<p>
			Tailwind v4 preflight zeroes <code>border-collapse</code> and cell spacing. The framework
			re-asserts <code>collapse</code>, runs every visual value through a
			<code>--set-table-*</code> token chain, and paints per-row dividers as
			<code>border-block-end</code> on cells (the only way to draw a row line in collapsed mode).
			Hover, selection, active, and variant tints layer cleanly because the override at the bottom
			of <code>_table.scss</code> re-declares the source-order tie-breakers.
		</p>
	</section>

	<section id="tables-bare">
		<h2>Bare <code>&lt;table&gt;</code></h2>
		<p>
			Caption above, header band, body rows that tint on hover, dividers between every row. No
			modifier needed.
		</p>
		<table>
			<caption>
				Recent contributors — bare table
			</caption>
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Role</th>
					<th>Commits</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="m in members" :key="m.id">
					<td>
						<code>{{ m.id }}</code>
					</td>
					<td>{{ m.name }}</td>
					<td>{{ m.role }}</td>
					<td>{{ m.commits }}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-striped">
		<h2>Striped rows — <code>.striped</code></h2>
		<p>
			Alternates odd-row backgrounds with the framework's neutral 12% divider tint so the eye can
			track horizontally across long rows. Hover still wins (source-order override at the bottom of
			the layer).
		</p>
		<table class="striped">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Team</th>
					<th>Last activity</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="m in members" :key="m.id">
					<td>
						<code>{{ m.id }}</code>
					</td>
					<td>{{ m.name }}</td>
					<td>{{ m.team }}</td>
					<td>{{ m.last }}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-striped-columns">
		<h2>Striped columns — <code>.striped-columns</code></h2>
		<p>
			Same neutral tint applied to every even column instead of every odd row. Useful when the
			visual scan is column-major (per-metric comparison rather than per-row inspection).
		</p>
		<table class="striped-columns">
			<thead>
				<tr>
					<th>Metric</th>
					<th>Q1</th>
					<th>Q2</th>
					<th>Q3</th>
					<th>Q4</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Revenue</td>
					<td>$1.2M</td>
					<td>$1.4M</td>
					<td>$1.7M</td>
					<td>$2.1M</td>
				</tr>
				<tr>
					<td>Active users</td>
					<td>12,400</td>
					<td>14,800</td>
					<td>17,200</td>
					<td>21,100</td>
				</tr>
				<tr>
					<td>NPS</td>
					<td>54</td>
					<td>58</td>
					<td>62</td>
					<td>67</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-bordered">
		<h2>Bordered — <code>.bordered</code></h2>
		<p>
			Hairline on every cell edge plus a perimeter border. Use when the table sits on a flat canvas
			and needs its own framing; skip it inside a card or panel where the parent's chrome already
			provides the perimeter. <code>&lt;caption&gt;</code> renders inside the perimeter (per the CSS
			spec — the caption box is part of the table-wrapper layout), so the framework gives it the
			same <code>padding-inline</code> as a cell and aligns the caption text with the header row
			below it.
		</p>
		<table class="bordered">
			<caption>
				Theme color tokens — light vs dark
			</caption>
			<thead>
				<tr>
					<th>Token</th>
					<th>Light value</th>
					<th>Dark value</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>--color-canvas</code></td>
					<td><code>#fff</code></td>
					<td><code>slate-950</code></td>
				</tr>
				<tr>
					<td><code>--color-text</code></td>
					<td><code>slate-900</code></td>
					<td><code>slate-100</code></td>
				</tr>
				<tr>
					<td><code>--color-border</code></td>
					<td><code>slate-200</code></td>
					<td><code>slate-800</code></td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-borderless">
		<h2>Borderless — <code>.borderless</code></h2>
		<p>
			Drops every cell divider so the table reads as plain rows of text. Use inside an already-
			bordered surface (a card, a flush list-group panel) where the inherited edge becomes the
			table's edge.
		</p>
		<table class="borderless">
			<thead>
				<tr>
					<th>Step</th>
					<th>Status</th>
					<th>Owner</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Spec draft</td>
					<td>Done</td>
					<td>Ada</td>
				</tr>
				<tr>
					<td>Implementation</td>
					<td>In review</td>
					<td>Grace</td>
				</tr>
				<tr>
					<td>Visual QA</td>
					<td>Pending</td>
					<td>Margaret</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-small">
		<h2>Compact — <code>.small</code></h2>
		<p>
			Halves the cell padding for dense data grids (financial figures, log lines). Drives through
			<code>--set-table-cell-padding-*</code> so consumers who retune the base padding still get a
			proportional compact mode.
		</p>
		<table class="small striped">
			<thead>
				<tr>
					<th>Timestamp</th>
					<th>Level</th>
					<th>Source</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>14:02:11.842</code></td>
					<td>info</td>
					<td>auth</td>
					<td>Session refreshed for user 42</td>
				</tr>
				<tr>
					<td><code>14:02:11.901</code></td>
					<td>debug</td>
					<td>db</td>
					<td>Query took 4.3ms (cache hit)</td>
				</tr>
				<tr>
					<td><code>14:02:12.118</code></td>
					<td>warn</td>
					<td>billing</td>
					<td>Retrying webhook delivery (attempt 3 of 5)</td>
				</tr>
				<tr>
					<td><code>14:02:12.404</code></td>
					<td>error</td>
					<td>payments</td>
					<td>Provider returned 503 — falling back to queue</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-variant-rows">
		<h2>Per-row variant tint</h2>
		<p>
			Applying a variant class to a <code>&lt;tr&gt;</code> washes the row with the variant's
			<code>--color-{variant}-bg-subtle</code> token — the same triplet alerts / toasts / callouts
			use. Each row stays AA-readable in both light and dark modes.
		</p>
		<table>
			<thead>
				<tr>
					<th>Variant</th>
					<th>Use case</th>
					<th>Token chain</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="v in variants" :key="v" :class="v">
					<td>
						<code>.{{ v }}</code>
					</td>
					<td>
						{{
							v === 'primary'
								? 'Identity surface — neutral highlight'
								: v === 'secondary'
									? 'Slate neutral — supporting metadata'
									: v === 'tertiary'
										? 'Alternative action — call out an option'
										: v === 'success'
											? 'Confirmation — passing tests, healthy state'
											: v === 'warning'
												? 'Caution — deprecation, near-limit usage'
												: v === 'danger'
													? 'Critical — failures, destructive actions'
													: 'Information — neutral context, footnotes'
						}}
					</td>
					<td>
						<code>--color-{{ v }}-bg-subtle</code>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-states">
		<h2>Row state — <code>.active</code> and <code>aria-selected</code></h2>
		<p>
			<code>.active</code> is a manual emphasis tier sitting between hover and selected — use it to
			mark a row the user hasn't selected but the page wants to point at (e.g. "current page" in a
			paginator). <code>aria-selected="true"</code> is the canonical selection state and wins over
			hover so a hovered selected row still reads as selected.
		</p>
		<table>
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>State</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>
						<code>AL-04</code>
					</td>
					<td>Ada Lovelace</td>
					<td>resting</td>
				</tr>
				<tr class="active">
					<td>
						<code>GH-12</code>
					</td>
					<td>Grace Hopper</td>
					<td><code>.active</code> — manual emphasis</td>
				</tr>
				<tr aria-selected="true">
					<td>
						<code>AT-21</code>
					</td>
					<td>Alan Turing</td>
					<td><code>aria-selected="true"</code> — current selection</td>
				</tr>
				<tr>
					<td>
						<code>KR-08</code>
					</td>
					<td>Katherine Johnson</td>
					<td>resting</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-sort">
		<h2>Sort indicator — <code>[data-key]</code> + <code>aria-sort</code></h2>
		<p>
			A header cell with <code>data-key</code> renders a sort indicator caret —
			<code>aria-sort="ascending"</code> or <code>"descending"</code> pins the matching glyph at
			full opacity. This page demonstrates the static rendering; click handlers, key cycling, and
			multi-column sort wiring live on the <code>UseTablePage</code> composable demo.
		</p>
		<table class="striped">
			<thead>
				<tr>
					<th data-key="id">ID</th>
					<th data-key="name" aria-sort="ascending">Name</th>
					<th data-key="commits" aria-sort="descending">Commits</th>
					<th data-key="last">Last activity</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="m in members" :key="m.id">
					<td>
						<code>{{ m.id }}</code>
					</td>
					<td>{{ m.name }}</td>
					<td>{{ m.commits }}</td>
					<td>{{ m.last }}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-group-divider">
		<h2>Group divider — <code>&lt;tbody class="group-divider"&gt;</code></h2>
		<p>
			A heavier 2px divider above a <code>&lt;tbody&gt;</code> block — useful for visually grouping
			rows by category, region, or time period without leaving the same table. Mirrors Bootstrap's
			<code>.table-group-divider</code>.
		</p>
		<table class="bordered">
			<thead>
				<tr>
					<th>Channel</th>
					<th>Region</th>
					<th>Revenue</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Direct</td>
					<td>NA</td>
					<td>$420k</td>
				</tr>
				<tr>
					<td>Direct</td>
					<td>EU</td>
					<td>$315k</td>
				</tr>
			</tbody>
			<tbody class="group-divider">
				<tr>
					<td>Partner</td>
					<td>NA</td>
					<td>$210k</td>
				</tr>
				<tr>
					<td>Partner</td>
					<td>APAC</td>
					<td>$145k</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-caption-position">
		<h2>Caption position — <code>.caption-bottom</code></h2>
		<p>
			<code>&lt;caption&gt;</code> sits above the grid by default (UA convention). Add
			<code>.caption-bottom</code> on the <code>&lt;table&gt;</code> to flip it below — the source
			order stays the same so screen-readers still announce the caption first.
		</p>
		<table class="caption-bottom striped">
			<caption>
				Table 1 — quarterly metrics, rounded to nearest unit
			</caption>
			<thead>
				<tr>
					<th>Quarter</th>
					<th>Revenue</th>
					<th>Customers</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Q1</td>
					<td>$1.2M</td>
					<td>12,400</td>
				</tr>
				<tr>
					<td>Q2</td>
					<td>$1.4M</td>
					<td>14,800</td>
				</tr>
				<tr>
					<td>Q3</td>
					<td>$1.7M</td>
					<td>17,200</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-responsive">
		<h2>Responsive wrapper — <code>.table-responsive</code></h2>
		<p>
			Wrap a wide table in <code>&lt;div class="table-responsive"&gt;</code> to bound horizontal
			overflow inside the wrapper rather than the page. Combine with <code>.nowrap</code> if you
			want long rows to scroll instead of wrapping.
		</p>
		<div class="table-responsive">
			<table class="striped nowrap">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Role</th>
						<th>Team</th>
						<th>Commits</th>
						<th>Last activity</th>
						<th>Status</th>
						<th>Email</th>
						<th>Region</th>
						<th>Tier</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="m in members" :key="m.id">
						<td>
							<code>{{ m.id }}</code>
						</td>
						<td>{{ m.name }}</td>
						<td>{{ m.role }}</td>
						<td>{{ m.team }}</td>
						<td>{{ m.commits }}</td>
						<td>{{ m.last }}</td>
						<td>active</td>
						<td>
							<code>{{ m.id.toLowerCase() }}@example.com</code>
						</td>
						<td>NA</td>
						<td>1</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section id="tables-tfoot">
		<h2><code>&lt;tfoot&gt;</code> — totals row</h2>
		<p>
			A <code>&lt;tfoot&gt;</code> after <code>&lt;tbody&gt;</code> renders below the body but (per
			HTML spec) is announced as a summary, not as more data. Use for totals, averages, or running
			sums. The framework's header-band tint applies to <code>&lt;th&gt;</code> in
			<code>tfoot</code> too — the cell selector doesn't scope to <code>thead</code>.
		</p>
		<table class="bordered">
			<thead>
				<tr>
					<th>Item</th>
					<th>Unit cost</th>
					<th>Qty</th>
					<th>Subtotal</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Server time (h)</td>
					<td>$0.42</td>
					<td>720</td>
					<td>$302.40</td>
				</tr>
				<tr>
					<td>Storage (GB)</td>
					<td>$0.024</td>
					<td>4,800</td>
					<td>$115.20</td>
				</tr>
				<tr>
					<td>Egress (GB)</td>
					<td>$0.085</td>
					<td>1,200</td>
					<td>$102.00</td>
				</tr>
			</tbody>
			<tfoot>
				<tr>
					<th colspan="3">Total</th>
					<th>$519.60</th>
				</tr>
			</tfoot>
		</table>
	</section>

	<section id="tables-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				Use <code>&lt;th scope="col"&gt;</code> for column headers and <code>scope="row"</code>
				for row headers — screen readers tie data cells to the right axis. The framework styles both
				identically so adding the attribute is a free accessibility win.
			</li>
			<li>
				<code>&lt;caption&gt;</code> describes the table's purpose for assistive tech. Skip only
				when an adjacent heading already serves that role (e.g. an <code>&lt;h2&gt;</code>
				immediately above).
			</li>
			<li>
				<code>aria-selected="true"</code> belongs on the <code>&lt;tr&gt;</code>, not on a
				descendant cell. Multi-select tables should also set
				<code>aria-multiselectable="true"</code> on the table itself.
			</li>
			<li>
				Don't rely on variant tint alone to signal status — pair
				<code>&lt;tr class="danger"&gt; </code> with a status cell ("Failed", an icon, a badge) so
				the meaning survives color-blind and forced-colors readers (WCAG 1.4.1).
			</li>
			<li>
				Wide tables (more columns than the viewport fits) belong inside
				<code>&lt;div class="table-responsive"&gt;</code> so the wrapper scrolls, not the page.
				Combine with <code>.nowrap</code> when readability depends on each row staying on one line.
			</li>
		</ul>
	</section>
</template>
