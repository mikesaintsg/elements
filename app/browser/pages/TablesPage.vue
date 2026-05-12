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
 *   Row expansion — accordion-in-table, pure CSS:
 *     A sibling `<tr class="expansion">` after each data row holds
 *     a `<td colspan>` containing `<div class="expansion-panel">`.
 *     Toggle state lives in a bare `<details>` inside the host row's
 *     last cell — the framework already styles `<details>` with
 *     accordion semantics + a `<summary>` chevron marker + the
 *     `[open]` attribute. CSS hooks `tr:has(> td > details[open]) +
 *     tr.expansion .expansion-panel` to open the sibling via the
 *     same `block-size: 0 → auto` transition that powers
 *     `<details>::details-content` (declared globally on `<html>`
 *     via `interpolate-size: allow-keywords` in `_html.scss`). Zero
 *     JavaScript — pure CSS, tightly coupled to the bare-details
 *     accordion so a host-page retune of the accordion timing flows
 *     through to the table expansion automatically. No accent bar
 *     and no host-row emphasis — the panel's tinted background plus
 *     its expanded padding is enough signal that "this row is open."
 *     Exclusive accordion: sharing `name="…"` across every host
 *     row's `<details>` makes opening one auto-close the others
 *     (HTML5 exclusive-disclosure semantics, same mechanism the
 *     standalone accordion on `DetailsPage` uses). Multiple-open
 *     vs exclusive is purely a markup choice — drop the `name`
 *     attribute and every toggle becomes independent.
 *     Composable parity: `useTable` writes `data-table-expanded` on
 *     the host row instead of using inline `<details>`; both
 *     selectors are unioned in `_table.scss` so the chrome is
 *     single-sourced.
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

// No reactive state — the row-expansion demo drives entirely off
// `<details>` toggles inside each host row. CSS hooks the `[open]`
// attribute via `:has()` and animates the sibling row's panel. Initial
// open / closed state is set by adding `open` to the `<details>` in
// markup, exactly like a static `<details open>` block.
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
			A sibling <code>&lt;tr class="expansion"&gt;</code> right after a data row holds the inline
			detail panel. Toggle state lives in a bare <code>&lt;details&gt;</code> inside the host row's
			last cell — the framework's accordion element already ships the disclosure semantics, the
			chevron marker, and the <code>[open]</code> attribute. CSS
			<code>tr:has(&gt; td &gt; details[open]) + tr.expansion .expansion-panel</code> opens the
			sibling panel via the same <code>block-size: 0 → auto</code> transition
			<code>&lt;details&gt;::details-content</code> uses (declared globally via
			<code>interpolate-size: allow-keywords</code> on <code>&lt;html&gt;</code>). Zero JavaScript —
			pure CSS coupled tightly to the bare-details accordion. Click any toggle.
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
				<tr>
					<td>
						<code>AL-04</code>
					</td>
					<td>Ada Lovelace</td>
					<td>Mathematician</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<dl>
								<dt>Team</dt>
								<dd>Analytical</dd>
								<dt>Commits</dt>
								<dd>342</dd>
								<dt>Last activity</dt>
								<dd>2 hours ago</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>GH-12</code>
					</td>
					<td>Grace Hopper</td>
					<td>Compiler theorist</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<dl>
								<dt>Team</dt>
								<dd>Mark I</dd>
								<dt>Commits</dt>
								<dd>287</dd>
								<dt>Last activity</dt>
								<dd>Yesterday</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>AT-21</code>
					</td>
					<td>Alan Turing</td>
					<td>Cryptographer</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<dl>
								<dt>Team</dt>
								<dd>Hut 8</dd>
								<dt>Commits</dt>
								<dd>256</dd>
								<dt>Last activity</dt>
								<dd>3 days ago</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>KR-08</code>
					</td>
					<td>Katherine Johnson</td>
					<td>Mathematician</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<dl>
								<dt>Team</dt>
								<dd>Orbital</dd>
								<dt>Commits</dt>
								<dd>198</dd>
								<dt>Last activity</dt>
								<dd>Last week</dd>
							</dl>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-multi">
		<h2>Multiple open at once</h2>
		<p>
			Each host row's <code>&lt;details&gt;</code> toggle is independent — multiple panels can be
			open simultaneously without coordination. The selector
			<code>tr:has(&gt; td &gt; details[open]) + tr.expansion .expansion-panel</code> uses
			adjacent-sibling matching, so each pair animates on its own. No JS scope to manage; the DOM is
			the state.
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
				<tr>
					<td>
						<code>AL-04</code>
					</td>
					<td>Ada Lovelace</td>
					<td>Analytical</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Ada Lovelace works on the <strong>Analytical</strong> team as a mathematician. She's
								logged <strong>342</strong> commits over the project's lifetime; her latest activity
								was <em>2 hours ago</em>.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>GH-12</code>
					</td>
					<td>Grace Hopper</td>
					<td>Mark I</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Grace Hopper works on the <strong>Mark I</strong> team as a compiler theorist.
								<strong>287</strong> commits logged; latest activity <em>Yesterday</em>.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>AT-21</code>
					</td>
					<td>Alan Turing</td>
					<td>Hut 8</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Alan Turing works on the <strong>Hut 8</strong> team as a cryptographer.
								<strong>256</strong> commits logged; latest activity <em>3 days ago</em>.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>KR-08</code>
					</td>
					<td>Katherine Johnson</td>
					<td>Orbital</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Katherine Johnson works on the <strong>Orbital</strong> team as a mathematician.
								<strong>198</strong> commits logged; latest activity <em>Last week</em>.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>MH-15</code>
					</td>
					<td>Margaret Hamilton</td>
					<td>Apollo</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Margaret Hamilton works on the <strong>Apollo</strong> team as a software engineer.
								<strong>412</strong> commits logged; latest activity <em>5 minutes ago</em>.
							</p>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tables-expansion-exclusive">
		<h2>Exclusive expansion — <code>&lt;details name="…"&gt;</code></h2>
		<p>
			Sharing a <code>name</code> across every host row's <code>&lt;details&gt;</code> turns the set
			into an exclusive accordion — opening one row's toggle auto-closes the others, no JS required.
			Same HTML5 mechanism the framework's standalone accordion in
			<a href="#/details">DetailsPage</a> uses (<code>&lt;details name="faq-group"&gt;</code>), just
			composed inside a table. Useful when only one detail panel should be open at a time to keep
			the row count predictable.
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
				<tr>
					<td>1. Specification</td>
					<td>Done</td>
					<td>Ada</td>
					<td>
						<details name="release-steps" open>
							<summary>Notes</summary>
						</details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Spec reviewed by the API council on 2026-04-30; signed off with two minor editorial
								revisions on §3.2 (status code table) and §7 (response examples).
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>2. Implementation</td>
					<td>In review</td>
					<td>Grace</td>
					<td>
						<details name="release-steps">
							<summary>Notes</summary>
						</details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								PR #2918 open; 4 of 5 review threads resolved. Outstanding: telemetry sampling
								strategy in the new <code>/v2/jobs</code> handler.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>3. Visual QA</td>
					<td>Pending</td>
					<td>Margaret</td>
					<td>
						<details name="release-steps">
							<summary>Notes</summary>
						</details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Visual QA blocked on the implementation PR landing. Test plan drafted in
								<code>docs/test-plans/2026-Q2-release.md</code>; ~20 minutes of screenshot
								regression once unblocked.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>4. Documentation</td>
					<td>Not started</td>
					<td>Alan</td>
					<td>
						<details name="release-steps">
							<summary>Notes</summary>
						</details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Will start after spec sign-off propagates through to the SDKs. Estimated 1 day of
								writing, half a day of review.
							</p>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
		<p>
			Try it: open one row's <em>Notes</em>, then click another — the first auto-closes as the
			second opens, both animating together. The closing-row's panel ramps `block-size: auto → 0` at
			the same time the opening-row's panel ramps `0 → auto`. Pure HTML5 disclosure semantics + the
			framework's `interpolate-size` transition.
		</p>
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
				<tr class="success">
					<td>
						<code>#1042</code>
					</td>
					<td>Acme Corp.</td>
					<td>Shipped</td>
					<td>$2,340.00</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<dl>
								<dt>Shipping address</dt>
								<dd>742 Evergreen Terrace · Springfield · OR 97477</dd>
								<dt>Contact</dt>
								<dd>logistics@acme.example · +1 555-0142</dd>
								<dt>Notes</dt>
								<dd>Tracking number FX-8821-991. Signature on delivery requested.</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr class="information">
					<td>
						<code>#1043</code>
					</td>
					<td>Globex Inc.</td>
					<td>Processing</td>
					<td>$890.50</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<dl>
								<dt>Shipping address</dt>
								<dd>120 Globex Plaza · Springfield · IL 62704</dd>
								<dt>Contact</dt>
								<dd>accounts@globex.example · +1 555-0188</dd>
								<dt>Notes</dt>
								<dd>Awaiting line-2 confirmation. Estimated dispatch in 2 business days.</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr class="warning">
					<td>
						<code>#1044</code>
					</td>
					<td>Initech LLC</td>
					<td>Returned</td>
					<td>$4,120.75</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<dl>
								<dt>Shipping address</dt>
								<dd>4120 Veronica Way · Austin · TX 78701</dd>
								<dt>Contact</dt>
								<dd>returns@initech.example · +1 555-0166</dd>
								<dt>Notes</dt>
								<dd>RMA-2024-0488 received. Refund pending QA inspection of returned units.</dd>
							</dl>
						</div>
					</td>
				</tr>
				<tr class="danger">
					<td>
						<code>#1045</code>
					</td>
					<td>Soylent Corp.</td>
					<td>Cancelled</td>
					<td>$650.00</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<dl>
								<dt>Shipping address</dt>
								<dd>1 Soylent Boulevard · New Brooklyn · NY 11234</dd>
								<dt>Contact</dt>
								<dd>support@soylent.example</dd>
								<dt>Notes</dt>
								<dd>Cancelled by customer prior to fulfillment. No funds captured.</dd>
							</dl>
						</div>
					</td>
				</tr>
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
				<tr>
					<td>
						<code>--color-canvas</code>
					</td>
					<td>
						<code>#fff</code>
					</td>
					<td>
						<code>slate-950</code>
					</td>
					<td>
						<details open><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								The base surface color — every other tier mixes against it.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>--color-text</code>
					</td>
					<td>
						<code>slate-900</code>
					</td>
					<td>
						<code>slate-100</code>
					</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Body text. Inverts polarity per theme; everything else derives from it via
								<code>color-mix</code>.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>--color-border</code>
					</td>
					<td>
						<code>slate-200</code>
					</td>
					<td>
						<code>slate-800</code>
					</td>
					<td>
						<details><summary>Details</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Default divider color. Consumed by <code>--set-table-border-color</code>,
								<code>--set-input-border-color</code>, and the bare list-group chrome.
							</p>
						</div>
					</td>
				</tr>
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
				<tr>
					<td>
						<code>14:02:11.842</code>
					</td>
					<td>info</td>
					<td>auth</td>
					<td>Session refreshed for user 42</td>
					<td>
						<details><summary>Context</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<pre
								style="margin: 0; white-space: pre-wrap; word-break: break-word"
							><code>jti=e7a1, ttl=900s, scope=read:profile read:billing</code></pre>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>14:02:11.901</code>
					</td>
					<td>info</td>
					<td>db</td>
					<td>Query took 4.3ms (cache hit)</td>
					<td>
						<details><summary>Context</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<pre
								style="margin: 0; white-space: pre-wrap; word-break: break-word"
							><code>SELECT id, name, plan FROM accounts WHERE org_id = $1 LIMIT 50</code></pre>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>14:02:12.118</code>
					</td>
					<td>warn</td>
					<td>billing</td>
					<td>Retrying webhook delivery (attempt 3 of 5)</td>
					<td>
						<details open><summary>Context</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<pre
								style="margin: 0; white-space: pre-wrap; word-break: break-word"
							><code>POST https://hooks.example.com/billing — last response: 503 Service Unavailable. Next retry in 4s with jitter.</code></pre>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<code>14:02:12.404</code>
					</td>
					<td>error</td>
					<td>payments</td>
					<td>Provider returned 503 — falling back to queue</td>
					<td>
						<details><summary>Context</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="5">
						<div class="expansion-panel">
							<pre
								style="margin: 0; white-space: pre-wrap; word-break: break-word"
							><code>POST /v1/charges → upstream 503. Idempotency key idem_8821 preserved; charge will retry from the durable queue.</code></pre>
						</div>
					</td>
				</tr>
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
				<tr>
					<td>2 hours ago</td>
					<td>
						<code>ada@example.com</code>
					</td>
					<td>Updated billing address</td>
					<td>
						<details><summary>Diff</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Old: 50 Babbage Lane → New: 742 Evergreen Terrace · Springfield · OR 97477
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>Yesterday</td>
					<td>
						<code>grace@example.com</code>
					</td>
					<td>Rotated API token</td>
					<td>
						<details open><summary>Diff</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								Token <code>sk_live_…ce91</code> revoked; <code>sk_live_…b4f7</code> issued. Scope
								unchanged.
							</p>
						</div>
					</td>
				</tr>
				<tr>
					<td>Last week</td>
					<td>
						<code>katherine@example.com</code>
					</td>
					<td>Added team member</td>
					<td>
						<details><summary>Diff</summary></details>
					</td>
				</tr>
				<tr class="expansion">
					<td colspan="4">
						<div class="expansion-panel">
							<p style="margin-block: 0">
								<code>margaret@example.com</code> invited as Editor; invite pending acceptance.
							</p>
						</div>
					</td>
				</tr>
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
