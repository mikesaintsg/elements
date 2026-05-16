<script lang="ts" setup>
/**
 * ListsPage — the canonical reference for `<ul>`, `<ol>`, `<li>`,
 * `<dl>`, `<dt>`, `<dd>`.
 *
 * API surface coverage (Phase 1 audit):
 *   Bare `<ul>` / `<ol>` — Tailwind preflight zeroes the UA's
 *     `padding-inline-start: 40px` + `list-style`; the framework
 *     restores 2rem inline indent + disc/decimal so a bare list still
 *     reads as a list. Nested `<ul>` cascades disc → circle → square.
 *   `<ul class="group">` / `<ol class="group">` — bordered vertical
 *     stack of `<li>` rows with shared radius + collapsed inter-item
 *     borders. Bootstrap `.list-group` pattern. `<ol class="group">`
 *     keeps numeric markers via CSS counters.
 *   `.flush` — drops outer border + radius (use when the group sits
 *     inside a bordered surface and inherits its edge).
 *   `.horizontal` — rows become columns. Inter-item border collapses
 *     on the inline-start edge; corner radii flip from block-axis to
 *     inline-axis.
 *   `<li class="primary">` (and other variants) — tints the row with
 *     the variant's `bg-subtle / text-emphasis / border-subtle`
 *     triplet. Mirrors mailbox's `.list-group-item-{color}` without a
 *     separate class.
 *   Actionable row — `<li><a>…</a></li>` or `<li><button>…</button>`
 *     auto-promotes via `:has()` — cursor, hover bg, active bg, full-
 *     row click target.
 *   `<dl>` / `<dt>` / `<dd>` — responsive grid description list:
 *     single-column stack `<640px`, 2-column `minmax(0, max-content)
 *     minmax(0, 1fr)` at wider widths. `<dt>` ships medium font-weight,
 *     `<dd>` muted color, `overflow-wrap: anywhere` so long tokens /
 *     URLs wrap inside their column.
 *
 * Cross-references:
 *   - `<menu>` (action / dropdown / nav-rail row container) lives on
 *     the MenuPage in `Components`. Its chrome contract differs from
 *     `<ul class="group">` — menus are action surfaces, list-groups
 *     are content displays.
 *   - The framework's `<dl>` adds `dialog > section` to its nesting-
 *     collapse list (see plan.md §9.7) — definition lists inside a
 *     scrollable dialog don't double-pad.
 */
import { VARIANTS as variants } from '../constants.js'
</script>

<template>
	<section id="lists-intro">
		<hgroup>
			<h1>Lists</h1>
			<p>
				Three list element families. <code>&lt;ul&gt;</code> + <code>&lt;ol&gt;</code> +
				<code>&lt;li&gt;</code> for ordered / unordered enumerations and bordered list-group chrome.
				<code>&lt;dl&gt;</code> + <code>&lt;dt&gt;</code> + <code>&lt;dd&gt;</code> for term /
				description pairs in a responsive grid.
			</p>
		</hgroup>
		<p>
			Tailwind v4 preflight zeroes every list's <code>padding-inline-start: 40px</code> + UA
			<code>list-style</code>. The framework restores both for bare <code>&lt;ul&gt;</code> /
			<code>&lt;ol&gt;</code> so a list still reads as a list. The <code>.group</code> modifier opts
			into the Bootstrap-style bordered list-group chrome — rows with shared radius, collapsed
			inter-item borders, variant tinting per row, and implicit actionable behavior when a row
			contains an <code>&lt;a&gt;</code> or <code>&lt;button&gt;</code>.
		</p>
	</section>

	<section id="lists-bare">
		<h2>Bare <code>&lt;ul&gt;</code> and <code>&lt;ol&gt;</code></h2>
		<p>
			Bare lists ship 2rem inline indent + UA list-style. Nested <code>&lt;ul&gt;</code> cascades
			disc → circle → square; nested <code>&lt;ol&gt;</code> cascades decimal → lower-alpha →
			lower-roman (UA convention).
		</p>
		<div class="stack">
			<ul>
				<li>First disc marker.</li>
				<li>
					Second disc with nested children:
					<ul>
						<li>Nested circle marker.</li>
						<li>
							Deeper still:
							<ul>
								<li>Square marker (UA default for 3-deep).</li>
								<li>Another square.</li>
							</ul>
						</li>
					</ul>
				</li>
				<li>Third disc marker.</li>
			</ul>
			<ol>
				<li>First ordered item — decimal marker.</li>
				<li>
					Second item with a nested ordered list:
					<ol>
						<li>Nested item — lower-alpha marker.</li>
						<li>
							Deeper still:
							<ol>
								<li>Three-deep — lower-roman marker.</li>
								<li>Another roman.</li>
							</ol>
						</li>
					</ol>
				</li>
				<li>Third ordered item.</li>
			</ol>
		</div>
	</section>

	<section id="lists-group">
		<h2>List group — <code>&lt;ul class="group"&gt;</code></h2>
		<p>
			The bordered list-group chrome — rows with shared radius and collapsed inter-item borders.
			Same Bootstrap <code>.list-group</code> shape; class name is the generic English word "group"
			because the element already says "list" by being <code>&lt;ul&gt;</code>. Same modifier on
			<code>&lt;ol class="group"&gt;</code> keeps numeric markers (numbered list-group "for free").
			Every visual value reads from a <code>--set-group-*</code> token so consumers retune
			surface-wide at <code>:root</code>.
		</p>
		<div class="stack">
			<ul class="group">
				<li>First row — bare text content.</li>
				<li>Second row — another item.</li>
				<li>Third row — and a third.</li>
				<li>Fourth row — closing the group.</li>
			</ul>
			<ol class="group">
				<li>Numbered first row.</li>
				<li>Numbered second row.</li>
				<li>Numbered third row.</li>
			</ol>
		</div>
	</section>

	<section id="lists-group-variants">
		<h2>Per-row variant tint</h2>
		<p>
			Adding a variant class to an individual <code>&lt;li&gt;</code> tints that row using the
			variant's <code>bg-subtle / text-emphasis / border-subtle</code> triplet — the same theme
			tokens alerts / toasts / callouts consume. Each row stays AA-readable in both light and dark
			modes because the triplet is theme-aware. Mirrors mailbox's
			<code>.list-group-item-{color}</code> pattern without a per-variant class.
		</p>
		<ul class="group">
			<li v-for="v in variants" :key="v" :class="v">
				<code>.{{ v }}</code> — {{ v }} row tinted via the subtle triplet.
			</li>
		</ul>
	</section>

	<section id="lists-group-actionable">
		<h2>Actionable rows</h2>
		<p>
			A <code>&lt;li&gt;</code> containing an <code>&lt;a&gt;</code> or
			<code>&lt;button&gt;</code> as its only flow child auto-promotes to an actionable row. The
			framework detects this via <code>:has()</code> so consumers don't add a
			<code>.list-group-item-action</code> class. The anchor stretches to fill the row's padding
			box; the row gains hover / active backgrounds.
		</p>
		<ul class="group">
			<li><a href="#lists-group-actionable">View team members</a></li>
			<li><a href="#lists-group-actionable">Manage billing</a></li>
			<li><a href="#lists-group-actionable">Configure integrations</a></li>
			<li><a href="#lists-group-actionable">Cancel subscription</a></li>
		</ul>
	</section>

	<section id="lists-group-state">
		<h2>State — <code>.active</code> and <code>.disabled</code></h2>
		<p>
			<code>.active</code> (or <code>aria-current="true"</code>) marks the current row — the
			framework paints it with the variant's <code>--set-variant-background-color</code> chain
			(defaults to <code>--color-primary</code>) and switches text to white (the framework
			hardcodes <code>--set-group-active-color: white</code>).
			<code>.disabled</code> (or <code>aria-disabled="true"</code>) drops the row to
			<code>--color-text-subtle</code> and blocks pointer events. Pair the class with the matching
			ARIA attribute so assistive tech announces the state too.
		</p>
		<ul class="group">
			<li aria-current="true"><a href="#lists-group-state">Inbox — current selection</a></li>
			<li><a href="#lists-group-state">Drafts</a></li>
			<li><a href="#lists-group-state">Sent</a></li>
			<li class="disabled" aria-disabled="true">
				<a href="#lists-group-state">Archive — disabled row</a>
			</li>
		</ul>
		<p>
			<code>.active</code> composes with the variant cascade — putting a variant class on the same
			<code>&lt;li&gt;</code> swaps the active fill for that variant's identity color.
		</p>
		<ul class="group">
			<li class="success" aria-current="true">Build passed — success-tinted active row</li>
			<li class="danger" aria-current="true">Build failed — danger-tinted active row</li>
		</ul>
	</section>

	<section id="lists-group-badges">
		<h2>Trailing badges</h2>
		<p>
			Drop a flex utility on the row and the badge naturally pushes to the trailing edge — useful
			for counts, status pills, or timestamps. The framework doesn't ship a dedicated row-flex class
			because <code>flex</code> + <code>justify-between</code> via Tailwind covers the case without
			inventing new chrome.
		</p>
		<ul class="group">
			<li class="flex items-center justify-between">
				<span>Tasks</span>
				<span class="badge primary">14</span>
			</li>
			<li class="flex items-center justify-between">
				<span>Pull requests</span>
				<span class="badge success">2</span>
			</li>
			<li class="flex items-center justify-between">
				<span>Issues</span>
				<span class="badge warning">7</span>
			</li>
			<li class="flex items-center justify-between">
				<span>Blocked</span>
				<span class="badge danger">1</span>
			</li>
		</ul>
	</section>

	<section id="lists-group-flush">
		<h2>Flush modifier</h2>
		<p>
			<code>.flush</code> drops the group's outer border + radius so it inherits the edge of a
			parent bordered surface (typically inside a <code>&lt;article&gt;</code> card). Use when the
			group is part of a card's content and shouldn't paint a second border alongside the card's
			own.
		</p>
		<ul class="group flush">
			<li>Flush row 1 — no outer border or radius.</li>
			<li>Flush row 2 — inter-item borders still collapse.</li>
			<li>Flush row 3 — first / last child also drop their inline-end / -start borders.</li>
		</ul>
	</section>

	<section id="lists-group-horizontal">
		<h2>Horizontal modifier</h2>
		<p>
			<code>.horizontal</code> flips rows to columns. Inter-item border collapses on the
			inline-start edge instead of the block-start; corner radii flip from block-axis to
			inline-axis. Useful for stat panels, top-of-card metric rows, or any breakdown that reads
			better horizontally than as a vertical stack.
		</p>
		<ul class="group horizontal">
			<li>Sales · <strong>$12,400</strong></li>
			<li>Customers · <strong>342</strong></li>
			<li>NPS · <strong>62</strong></li>
			<li>Churn · <strong>1.2%</strong></li>
		</ul>
	</section>

	<section id="lists-definition">
		<h2>
			Definition list — <code>&lt;dl&gt;</code> / <code>&lt;dt&gt;</code> / <code>&lt;dd&gt;</code>
		</h2>
		<p>
			Description lists pair terms with descriptions in a responsive grid. Below 640px the framework
			stacks single-column (a wide term would otherwise starve the description track on phone
			widths). At wider viewports the grid switches to
			<code>minmax(0, max-content) minmax(0, 1fr)</code> so the term column sizes to its content and
			the description fills the rest.
		</p>
		<p>
			<code>&lt;dt&gt;</code> ships medium font-weight (so the term reads as a label);
			<code>&lt;dd&gt;</code> reads at <code>--color-text-muted</code> and gets
			<code>overflow-wrap: anywhere</code> so long tokens, URLs, or identifiers wrap inside the grid
			track instead of widening the page.
		</p>
		<dl>
			<dt>Author</dt>
			<dd>Ada Lovelace</dd>
			<dt>First published</dt>
			<dd>1843 — translator's notes on Menabrea's memoir of Babbage's Analytical Engine</dd>
			<dt>Significance</dt>
			<dd>
				Note G — describes an algorithm for computing Bernoulli numbers, widely cited as the first
				published computer program.
			</dd>
			<dt><code>--color-primary-text-emphasis</code></dt>
			<dd>
				A long framework token that demonstrates the overflow-wrap behavior — wraps inside the cell
				rather than pushing the page wider than the viewport.
			</dd>
		</dl>
	</section>

	<section id="lists-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				Use <code>&lt;ul&gt;</code> for unordered enumerations (the order of items doesn't carry
				meaning) and <code>&lt;ol&gt;</code> when sequence matters (steps, rankings).
			</li>
			<li>
				Reach for <code>&lt;ul class="group"&gt;</code> when the list is a chrome panel (navigation
				rows, settings list, action surface). The bare unordered list is for inline enumerations
				within prose.
			</li>
			<li>
				<code>&lt;dl&gt;</code> is for term / description pairs — glossaries, metadata tables,
				key-value displays. NOT a generic two-column layout substitute. If the semantic isn't "this
				label describes this value," reach for a different element.
			</li>
			<li>
				Variant tints on rows should signal status, not just decoration. A
				<code>.danger</code> row in a task list says "this needs attention" — pair with a clear
				textual cue so the meaning isn't carried by color alone (WCAG 1.4.1 — Use of Color).
			</li>
		</ul>
	</section>
</template>
