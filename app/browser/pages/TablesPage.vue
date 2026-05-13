<script lang="ts" setup>
import { ref } from 'vue'
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
 *     behavior — no opt-in class needed (the Bootstrap `.hover`
 *     alias was dropped because it carried no rule of its own).
 *   `.striped` / `.striped-columns` — alternating-row / -column
 *     tints at 12% mix. Specificity bumped past the bare-cell rule
 *     so the stripe wins, then the hover override at the bottom of
 *     the layer re-bumps so hover still wins over stripes.
 *   `.bordered` / `.borderless` — full grid lines (every cell edge
 *     + perimeter) or zero dividers (drop the row seam for tables
 *     inside an already-bordered surface).
 *   `.small` — halved cell padding for dense data grids.
 *   `.nowrap` — prevent cell text from wrapping; pair with
 *     `<div class="scrollable">` so the row stays on one line and
 *     the wrapper scrolls instead.
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
 *   `<tbody class="divided">` — heavier 2px divider above the
 *     `<tbody>` block; useful for splitting datasets by category.
 *     (Bootstrap's `.table-group-divider` analogue. "group" was rejected
 *     because the framework already uses `.group` for list-group chrome
 *     — past-participle `divided` matches the `.bordered`/`.borderless`
 *     pattern.)
 *   `<th data-key="…">` with `[aria-sort]` — sort indicator chrome
 *     (caret glyph via `--set-icon-*` mask). Interactive sort logic
 *     belongs on `UseTablePage`; this page demonstrates the static
 *     rendering only.
 *   Row expansion — accordion-in-table, ARIA disclosure pattern:
 *     The host row carries `data-table-expanded` while open. The
 *     immediately-following sibling `<tr>` holds a colspan `<td>`
 *     containing `<div data-table-expansion-panel>` — the chrome
 *     target. CSS in `_table.scss` hooks
 *     `tr[data-table-expanded] + tr > td > [data-table-expansion-panel]`
 *     and animates `block-size: 0 → auto` via the framework's global
 *     `interpolate-size: allow-keywords` declaration on `<html>` (the
 *     same CSS feature that lets any height transition resolve, the
 *     framework simply opts in once for everyone). The toggle button
 *     is a real `<button aria-expanded aria-controls>` — the ARIA
 *     disclosure pattern. The button's `aria-controls` points at the
 *     expansion row's `id`, so screen readers resolve the
 *     relationship and the disclosure state is announced correctly.
 *     Markup is a plain pair of sibling `<tr>`s; no `<details>` shell,
 *     no `<summary>` button surrogate — the row IS the disclosed
 *     surface, opened by the framework's CSS sibling hook.
 *     Multi-open vs exclusive: a multi-open section stores its open
 *     rows in a `Set<string>`; the exclusive variant stores one
 *     nullable ID. Same chrome contract, just a different toggle
 *     handler. Composable parity: `useTable` writes
 *     `data-table-expanded` on the host row from JS, so the same
 *     CSS opens the same panel regardless of whether state is page-
 *     local or composable-driven.
 *   `<div class="scrollable">` wrapper — bounds horizontal overflow
 *     to the wrapper so a wide table doesn't push the viewport wider
 *     than the page. Element-agnostic (works around any wide content,
 *     not just tables); matches `dialog.scrollable` already in the
 *     framework. Bootstrap's `.table-responsive` was renamed to drop
 *     the element-name prefix.
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

// Row-expansion demo state. Each section owns its own state ref so
// the three demos (multi-open, multi-open with rich content,
// exclusive) stay independent.
//
// The framework's expansion chrome is driven by two attributes on
// canonical markup:
//   • host row carries `[data-table-expanded]` while open
//   • the immediately-following sibling `<tr>` holds a
//     `<div data-table-expansion-panel>` inside its colspan `<td>`
// CSS in `_table.scss` hooks the open/close transition off
// `tr[data-table-expanded] + tr > td > [data-table-expansion-panel]`,
// and `tbody tr:has(> td > [data-table-expansion-panel]) > td`
// strips the expansion row's chrome so the panel sits flush.
//
// The toggle is a real `<button aria-expanded aria-controls>` — proper
// ARIA disclosure pattern, point-to-the-controlled-region semantics,
// and no abuse of `<details>` as a hollow shell wrapping nothing. The
// expansion `<tr>` carries the controlled `id` so screen readers
// resolve `aria-controls` correctly.
// One shared set for every multi-open expansion section. Each row's
// toggle key is the namespaced row ID (e.g. `basic-AL-04`,
// `variants-1042`, `striped-line-3`) so the sets stay collision-free
// even when the same business ID appears across demos. Seed values
// pre-open one row per section so the page lands with visible chrome.
const expandedRows = ref<ReadonlySet<string>>(
	new Set([
		'basic-GH-12',
		'multi-AL-04',
		'multi-AT-21',
		'variants-1043',
		'variants-1045',
		'bordered-canvas',
		'striped-warn-1',
		'compact-yesterday',
	]),
)
const toggleRow = (id: string): void => {
	const next = new Set(expandedRows.value)
	if (next.has(id)) next.delete(id)
	else next.add(id)
	expandedRows.value = next
}

// Exclusive section uses a single nullable ID instead of a set so only
// one row can be open at a time. Same handler reassigns the ref.
const expandedExclusive = ref<string | null>('step-1')
const toggleExclusive = (id: string): void => {
	expandedExclusive.value = expandedExclusive.value === id ? null : id
}

interface BasicRow {
	readonly id: string
	readonly name: string
	readonly role: string
	readonly team: string
	readonly commits: number
	readonly last: string
}
const basicRows: readonly BasicRow[] = [
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
]

interface OrderRow {
	readonly id: string
	readonly customer: string
	readonly status: string
	readonly total: string
	readonly variant: 'success' | 'information' | 'warning' | 'danger'
	readonly address: string
	readonly contact: string
	readonly notes: string
}
const variantOrders: readonly OrderRow[] = [
	{
		id: '1042',
		customer: 'Acme Corp.',
		status: 'Shipped',
		total: '$2,340.00',
		variant: 'success',
		address: '742 Evergreen Terrace · Springfield · OR 97477',
		contact: 'logistics@acme.example · +1 555-0142',
		notes: 'Tracking number FX-8821-991. Signature on delivery requested.',
	},
	{
		id: '1043',
		customer: 'Globex Inc.',
		status: 'Processing',
		total: '$890.50',
		variant: 'information',
		address: '120 Globex Plaza · Springfield · IL 62704',
		contact: 'accounts@globex.example · +1 555-0188',
		notes: 'Awaiting line-2 confirmation. Estimated dispatch in 2 business days.',
	},
	{
		id: '1044',
		customer: 'Initech LLC',
		status: 'Returned',
		total: '$4,120.75',
		variant: 'warning',
		address: '4120 Veronica Way · Austin · TX 78701',
		contact: 'returns@initech.example · +1 555-0166',
		notes: 'RMA-2024-0488 received. Refund pending QA inspection of returned units.',
	},
	{
		id: '1045',
		customer: 'Soylent Corp.',
		status: 'Cancelled',
		total: '$650.00',
		variant: 'danger',
		address: '1 Soylent Boulevard · New Brooklyn · NY 11234',
		contact: 'support@soylent.example',
		notes: 'Cancelled by customer prior to fulfillment. No funds captured.',
	},
]

interface ThemeTokenRow {
	readonly id: string
	readonly token: string
	readonly light: string
	readonly dark: string
	readonly notes: string
}
const themeTokenRows: readonly ThemeTokenRow[] = [
	{
		id: 'canvas',
		token: '--color-canvas',
		light: '#fff',
		dark: 'slate-950',
		notes: 'The base surface color — every other tier mixes against it.',
	},
	{
		id: 'text',
		token: '--color-text',
		light: 'slate-900',
		dark: 'slate-100',
		notes: 'Body text. Inverts polarity per theme; everything else derives from it via color-mix.',
	},
	{
		id: 'border',
		token: '--color-border',
		light: 'slate-200',
		dark: 'slate-800',
		notes:
			'Default divider color. Consumed by --set-table-border-color, --set-input-border-color, and the bare list-group chrome.',
	},
]

interface LogRow {
	readonly id: string
	readonly time: string
	readonly level: string
	readonly source: string
	readonly message: string
	readonly context: string
}
const logRows: readonly LogRow[] = [
	{
		id: 'info-1',
		time: '14:02:11.842',
		level: 'info',
		source: 'auth',
		message: 'Session refreshed for user 42',
		context: 'jti=e7a1, ttl=900s, scope=read:profile read:billing',
	},
	{
		id: 'info-2',
		time: '14:02:11.901',
		level: 'info',
		source: 'db',
		message: 'Query took 4.3ms (cache hit)',
		context: 'SELECT id, name, plan FROM accounts WHERE org_id = $1 LIMIT 50',
	},
	{
		id: 'warn-1',
		time: '14:02:12.118',
		level: 'warn',
		source: 'billing',
		message: 'Retrying webhook delivery (attempt 3 of 5)',
		context:
			'POST https://hooks.example.com/billing — last response: 503 Service Unavailable. Next retry in 4s with jitter.',
	},
	{
		id: 'error-1',
		time: '14:02:12.404',
		level: 'error',
		source: 'payments',
		message: 'Provider returned 503 — falling back to queue',
		context:
			'POST /v1/charges → upstream 503. Idempotency key idem_8821 preserved; charge will retry from the durable queue.',
	},
]

interface AuditRow {
	readonly id: string
	readonly when: string
	readonly who: string
	readonly what: string
	readonly diff: string
}
const auditRows: readonly AuditRow[] = [
	{
		id: '2h',
		when: '2 hours ago',
		who: 'ada@example.com',
		what: 'Updated billing address',
		diff: 'Old: 50 Babbage Lane → New: 742 Evergreen Terrace · Springfield · OR 97477',
	},
	{
		id: 'yesterday',
		when: 'Yesterday',
		who: 'grace@example.com',
		what: 'Rotated API token',
		diff: 'Token sk_live_…ce91 revoked; sk_live_…b4f7 issued. Scope unchanged.',
	},
	{
		id: 'lastweek',
		when: 'Last week',
		who: 'katherine@example.com',
		what: 'Added team member',
		diff: 'margaret@example.com invited as Editor; invite pending acceptance.',
	},
]

interface ReleaseStep {
	readonly id: string
	readonly step: string
	readonly status: string
	readonly owner: string
	readonly notes: string
}
const releaseSteps: readonly ReleaseStep[] = [
	{
		id: 'step-1',
		step: '1. Specification',
		status: 'Done',
		owner: 'Ada',
		notes:
			'Spec reviewed by the API council on 2026-04-30; signed off with two minor editorial revisions on §3.2 (status code table) and §7 (response examples).',
	},
	{
		id: 'step-2',
		step: '2. Implementation',
		status: 'In review',
		owner: 'Grace',
		notes:
			'PR #2918 open; 4 of 5 review threads resolved. Outstanding: telemetry sampling strategy in the new /v2/jobs handler.',
	},
	{
		id: 'step-3',
		step: '3. Visual QA',
		status: 'Pending',
		owner: 'Margaret',
		notes:
			'Visual QA blocked on the implementation PR landing. Test plan drafted in docs/test-plans/2026-Q2-release.md; ~20 minutes of screenshot regression once unblocked.',
	},
	{
		id: 'step-4',
		step: '4. Documentation',
		status: 'Not started',
		owner: 'Alan',
		notes:
			'Documentation depends on the spec-frozen body of §3.2 + §7 from step 1, plus the final handler signatures from step 2. Drafting will begin after Visual QA signs off.',
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

	<section id="tables-expansion-basic">
		<h2>Row expansion — accordion-in-table</h2>
		<p>
			A second <code>&lt;tr&gt;</code> right after each data row holds the inline detail panel. The
			host row carries <code>data-table-expanded</code> while open; the expansion row contains a
			<code>&lt;div data-table-expansion-panel&gt;</code> wrapper that owns the chrome. CSS
			<code>tr[data-table-expanded] + tr &gt; td &gt; [data-table-expansion-panel]</code> animates
			the sibling panel from <code>block-size: 0 → auto</code> — the height interpolation works
			because the framework declares <code>interpolate-size: allow-keywords</code> on
			<code>&lt;html&gt;</code> once, globally, so any element's <code>block-size</code> can animate
			to or from <code>auto</code>.
		</p>
		<p>
			The toggle is a real <code>&lt;button aria-expanded aria-controls&gt;</code> — the ARIA
			disclosure pattern. The button's <code>aria-controls</code> points at the expansion row's
			<code>id</code>, so screen readers resolve the relationship correctly and the disclosure state
			is announced. The disclosed surface is the second <code>&lt;tr&gt;</code> itself; there's no
			<code>&lt;details&gt;</code> wrapper, no <code>&lt;summary&gt;</code> button surrogate. The
			markup matches the user's intent: a button toggles a sibling row open.
		</p>
		<table>
			<thead>
				<tr>
					<th>Member ID</th>
					<th>Name</th>
					<th>Role</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="row in basicRows" :key="row.id">
					<tr :data-table-expanded="expandedRows.has(`basic-${row.id}`) ? '' : undefined">
						<td>
							<code>{{ row.id }}</code>
						</td>
						<td>{{ row.name }}</td>
						<td>{{ row.role }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`basic-${row.id}`)"
								:aria-controls="`basic-${row.id}-details`"
								@click="toggleRow(`basic-${row.id}`)"
							>
								Details
							</button>
						</td>
					</tr>
					<tr :id="`basic-${row.id}-details`">
						<td colspan="4">
							<div data-table-expansion-panel>
								<dl>
									<dt>Team</dt>
									<dd>{{ row.team }}</dd>
									<dt>Commits</dt>
									<dd>{{ row.commits }}</dd>
									<dt>Last activity</dt>
									<dd>{{ row.last }}</dd>
								</dl>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;!-- Host row: aria-controls points at the expansion row's id --&gt;
&lt;tr :data-table-expanded="expanded.has(id) ? '' : undefined"&gt;
  &lt;td&gt;…&lt;/td&gt;
  &lt;td&gt;
    &lt;button type="button"
            :aria-expanded="expanded.has(id)"
            :aria-controls="`row-${id}-details`"
            @click="toggle(id)"&gt;
      Details
    &lt;/button&gt;
  &lt;/td&gt;
&lt;/tr&gt;

&lt;!-- Expansion row: id matches aria-controls --&gt;
&lt;tr :id="`row-${id}-details`"&gt;
  &lt;td colspan="…"&gt;
    &lt;div data-table-expansion-panel&gt;…&lt;/div&gt;
  &lt;/td&gt;
&lt;/tr&gt;</code></pre>
		</details>
	</section>

	<section id="tables-expansion-multi">
		<h2>Multiple open at once</h2>
		<p>
			Each toggle button owns its own row. The expansion state lives in a single
			<code>Set&lt;string&gt;</code> of open row IDs — clicking a toggle flips presence in the set.
			Multiple panels can be open simultaneously; CSS
			<code>tr[data-table-expanded] + tr &gt; td &gt; [data-table-expansion-panel]</code> uses
			adjacent-sibling matching, so each pair animates on its own.
		</p>
		<table>
			<thead>
				<tr>
					<th>Member ID</th>
					<th>Name</th>
					<th>Team</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="m in members" :key="m.id">
					<tr :data-table-expanded="expandedRows.has(`multi-${m.id}`) ? '' : undefined">
						<td>
							<code>{{ m.id }}</code>
						</td>
						<td>{{ m.name }}</td>
						<td>{{ m.team }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`multi-${m.id}`)"
								:aria-controls="`multi-${m.id}-details`"
								@click="toggleRow(`multi-${m.id}`)"
							>
								Details
							</button>
						</td>
					</tr>
					<tr :id="`multi-${m.id}-details`">
						<td colspan="4">
							<div data-table-expansion-panel>
								<p style="margin-block: 0">
									{{ m.name }} works on the <strong>{{ m.team }}</strong> team as a
									{{ m.role.toLowerCase() }}. <strong>{{ m.commits }}</strong> commits logged;
									latest activity <em>{{ m.last }}</em
									>.
								</p>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-exclusive">
		<h2>Exclusive expansion — one open at a time</h2>
		<p>
			Sometimes the surface should hold ONE open panel at a time so the row count stays predictable.
			Same chrome and same markup contract — only the toggle handler changes: instead of flipping
			presence in a set, it stores a single ID (or
			<code>null</code>) and overwrites on each click. Opening one row auto-closes the
			previously-open one because the previous row no longer carries
			<code>data-table-expanded</code> after the assignment.
		</p>
		<table>
			<thead>
				<tr>
					<th>Step</th>
					<th>Status</th>
					<th>Owner</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="step in releaseSteps" :key="step.id">
					<tr :data-table-expanded="expandedExclusive === step.id ? '' : undefined">
						<td>{{ step.step }}</td>
						<td>{{ step.status }}</td>
						<td>{{ step.owner }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedExclusive === step.id"
								:aria-controls="`step-${step.id}-details`"
								@click="toggleExclusive(step.id)"
							>
								Notes
							</button>
						</td>
					</tr>
					<tr :id="`step-${step.id}-details`">
						<td colspan="4">
							<div data-table-expansion-panel>
								<p style="margin-block: 0">{{ step.notes }}</p>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
		<p>
			Try it: open one row's <em>Notes</em>, then click another — the first auto-closes as the
			second opens, both animating together. The closing-row's panel ramps
			<code>block-size: auto → 0</code> at the same time the opening-row's panel ramps
			<code>0 → auto</code>, both interpolating cleanly because of the framework's global
			<code>interpolate-size: allow-keywords</code> declaration.
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// State: a single ID (or null) instead of a Set.
const expanded = ref&lt;string | null&gt;('step-1')

const toggle = (id: string): void =&gt; {
  expanded.value = expanded.value === id ? null : id
}

// Markup is identical to the multi-open pattern; the handler is the
// only difference. Same `data-table-expanded` + `[data-table-
// expansion-panel]` chrome contract.</code></pre>
		</details>
	</section>

	<section id="tables-expansion-variants">
		<h2>Composes with row variant tints</h2>
		<p>
			A host row with a variant class (<code>&lt;tr class="success"&gt;</code>) keeps its tinted
			background when expanded — the row's variant tint and the panel's neutral tint sit at
			different tiers (subtle <code>bg-subtle</code> vs <code>currentColor 4%</code>), so the
			two-row group reads as a coherent stack: variant-tinted summary on top, neutral detail panel
			below.
		</p>
		<table>
			<thead>
				<tr>
					<th>Order</th>
					<th>Customer</th>
					<th>Status</th>
					<th>Total</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="o in variantOrders" :key="o.id">
					<tr
						:class="o.variant"
						:data-table-expanded="expandedRows.has(`variants-${o.id}`) ? '' : undefined"
					>
						<td>
							<code>#{{ o.id }}</code>
						</td>
						<td>{{ o.customer }}</td>
						<td>{{ o.status }}</td>
						<td>{{ o.total }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`variants-${o.id}`)"
								:aria-controls="`variants-${o.id}-details`"
								@click="toggleRow(`variants-${o.id}`)"
							>
								Details
							</button>
						</td>
					</tr>
					<tr :id="`variants-${o.id}-details`">
						<td colspan="5">
							<div data-table-expansion-panel>
								<dl>
									<dt>Shipping address</dt>
									<dd>{{ o.address }}</dd>
									<dt>Contact</dt>
									<dd>{{ o.contact }}</dd>
									<dt>Notes</dt>
									<dd>{{ o.notes }}</dd>
								</dl>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-bordered">
		<h2>Inside a bordered table</h2>
		<p>
			With <code>.bordered</code>, the expansion sibling's <code>border-block-end</code> zeroes when
			collapsed so the data row above owns the divider; on open, the panel fills the cell and the
			table's grid pattern stays intact around it.
		</p>
		<table class="bordered">
			<caption>
				Theme palette tokens — light vs dark
			</caption>
			<thead>
				<tr>
					<th>Token</th>
					<th>Light</th>
					<th>Dark</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="t in themeTokenRows" :key="t.id">
					<tr :data-table-expanded="expandedRows.has(`bordered-${t.id}`) ? '' : undefined">
						<td>
							<code>{{ t.token }}</code>
						</td>
						<td>
							<code>{{ t.light }}</code>
						</td>
						<td>
							<code>{{ t.dark }}</code>
						</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`bordered-${t.id}`)"
								:aria-controls="`bordered-${t.id}-details`"
								@click="toggleRow(`bordered-${t.id}`)"
							>
								Details
							</button>
						</td>
					</tr>
					<tr :id="`bordered-${t.id}-details`">
						<td colspan="4">
							<div data-table-expansion-panel>
								<p style="margin-block: 0">{{ t.notes }}</p>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-striped">
		<h2>Inside a striped table</h2>
		<p>
			On a <code>.striped</code> table, the panel's neutral <code>currentColor 4%</code> tint sits
			one tier darker than the striped row tint (<code>12%</code> mix) so the open panel still reads
			as a distinct sibling rather than blending into the alternating-row pattern.
		</p>
		<table class="striped">
			<thead>
				<tr>
					<th>Timestamp</th>
					<th>Level</th>
					<th>Source</th>
					<th>Message</th>
					<th style="width: 8rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="r in logRows" :key="r.id">
					<tr :data-table-expanded="expandedRows.has(`striped-${r.id}`) ? '' : undefined">
						<td>
							<code>{{ r.time }}</code>
						</td>
						<td>{{ r.level }}</td>
						<td>{{ r.source }}</td>
						<td>{{ r.message }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`striped-${r.id}`)"
								:aria-controls="`striped-${r.id}-details`"
								@click="toggleRow(`striped-${r.id}`)"
							>
								Context
							</button>
						</td>
					</tr>
					<tr :id="`striped-${r.id}-details`">
						<td colspan="5">
							<div data-table-expansion-panel>
								<pre
									style="margin: 0; white-space: pre-wrap; word-break: break-word"
								><code>{{ r.context }}</code></pre>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-compact">
		<h2>Compact table</h2>
		<p>
			<code>.small</code> scales the cell padding down via the same
			<code>--set-table-cell-padding-*</code> tokens the panel reads, so the panel's horizontal
			padding shrinks proportionally to match. Vertical padding inside the panel stays generous so
			detail content keeps breathing room regardless of the host table's density.
		</p>
		<table class="small bordered">
			<thead>
				<tr>
					<th>When</th>
					<th>Who</th>
					<th>What</th>
					<th style="width: 6rem"></th>
				</tr>
			</thead>
			<tbody>
				<template v-for="a in auditRows" :key="a.id">
					<tr :data-table-expanded="expandedRows.has(`compact-${a.id}`) ? '' : undefined">
						<td>{{ a.when }}</td>
						<td>
							<code>{{ a.who }}</code>
						</td>
						<td>{{ a.what }}</td>
						<td>
							<button
								type="button"
								class="subtle dropdown small"
								:aria-expanded="expandedRows.has(`compact-${a.id}`)"
								:aria-controls="`compact-${a.id}-details`"
								@click="toggleRow(`compact-${a.id}`)"
							>
								Diff
							</button>
						</td>
					</tr>
					<tr :id="`compact-${a.id}-details`">
						<td colspan="4">
							<div data-table-expansion-panel>
								<p style="margin-block: 0">{{ a.diff }}</p>
							</div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</section>

	<section id="tables-divided">
		<h2>Divided tbody — <code>&lt;tbody class="divided"&gt;</code></h2>
		<p>
			A heavier 2px divider above a <code>&lt;tbody&gt;</code> block — separates dataset groups
			(category, region, time period) inside the same table. Past-participle modifier name follows
			the framework's <code>.bordered</code> / <code>.borderless</code> / <code>.filled</code> /
			<code>.subtle</code> pattern (single generic English word describing the visual treatment, no
			element-name prefix). Bootstrap's <code>.table-group-divider</code> was the inspiration;
			"group" was rejected here because the framework already uses it for the list-group chrome
			(<code>&lt;ul class="group"&gt;</code>) and overloading the word would confuse markup readers.
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
			<tbody class="divided">
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
		<h2>Scrollable wrapper — <code>&lt;div class="scrollable"&gt;</code></h2>
		<p>
			Wrap a wide table in <code>&lt;div class="scrollable"&gt;</code> to bound horizontal overflow
			inside the wrapper rather than the page. The same modifier works on any wide content (a
			<code>&lt;pre&gt;</code> block, an inline toolbar, an image strip) — the rule is
			element-agnostic. Combine with <code>.nowrap</code> on the table if you want long rows to
			scroll instead of wrapping. Matches <code>dialog.scrollable</code> already in the framework —
			the unifying semantic is "this surface scrolls when its content overflows." Bootstrap's
			<code>.table-responsive</code> was rejected because the <code>table-</code>
			prefix violates the framework's no-element-name-prefix rule and ties a general wrapper to one
			element family.
		</p>
		<div class="scrollable">
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
				<code>&lt;div class="scrollable"&gt;</code> so the wrapper scrolls, not the page. Combine
				with <code>.nowrap</code> when readability depends on each row staying on one line.
			</li>
		</ul>
	</section>
</template>
