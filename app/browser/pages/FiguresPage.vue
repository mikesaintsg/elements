<script lang="ts" setup>
/**
 * FiguresPage — the canonical reference for `<figure>` + `<figcaption>`.
 *
 * API surface coverage (Phase 1 audit):
 *   `<figure>` — flex-column layout with `--set-figure-gap` so the
 *     caption sits cleanly below the figure's payload. No
 *     box-shadow or border by default — the figure is a SEMANTIC
 *     grouping, not a card. Use `<article>` (or compose with one)
 *     when card chrome is wanted.
 *   `<figcaption>` — smaller font (`--set-figcaption-font-size:
 *     0.875em`) and muted color (`--color-text-muted`) so the caption
 *     reads as secondary metadata under the payload.
 *
 * Variants this page demonstrates:
 *   - Image figure (the canonical example)
 *   - Block-quote figure (`<blockquote>` payload + `<figcaption>`
 *     attribution — the HTML5-recommended pull-quote pattern)
 *   - Code listing figure (preformatted code + caption attributing
 *     the source / language)
 *   - Tabular figure (`<table>` payload + caption supplementing the
 *     table's own `<caption>` with figure metadata)
 *   - SVG diagram figure (inline `<svg>` + caption attribution)
 *
 * Cross-references:
 *   - `<figure>` is a SEMANTIC grouping, not a presentational card.
 *     For card chrome (shadow, padding, radius), reach for `<article>`
 *     or compose a `<figure>` inside an `<article>`.
 *   - The `<picture>` element (for responsive image sources) lives
 *     in MediaPage; a `<figure>` typically wraps a `<picture>` or
 *     `<img>` (not both — `<picture>` already wraps an `<img>`).
 */

import { FIGURES_GRADIENT_THUMB_URI as gradientThumbDataUri } from '../constants.js'
</script>

<template>
	<section id="figures-intro">
		<hgroup>
			<h1>Figures</h1>
			<p>
				<code>&lt;figure&gt;</code> + <code>&lt;figcaption&gt;</code> for self-contained referenced
				content. The figure is a <em>semantic grouping</em>, not a presentational card — it tells
				the document that "this content (image, code, quote, table) stands on its own with an
				attribution," nothing more. Card chrome (shadow, padding, radius) lives on
				<code>&lt;article&gt;</code>; compose a <code>&lt;figure&gt;</code> inside one when both
				behaviors are wanted.
			</p>
		</hgroup>
		<p>
			Framework contribution: a flex-column layout with
			<code>--set-figure-gap</code> rhythm between the figure's payload and its caption, plus
			<code>&lt;figcaption&gt;</code> chrome that reads as metadata (<code>0.875em</code> font-size,
			<code>--color-text-muted</code> color) so the caption doesn't compete with the payload for the
			reader's attention.
		</p>
	</section>

	<section id="figures-image">
		<h2>Image figure</h2>
		<p>
			The canonical use — an image with an attribution caption beneath. Pair
			<code>&lt;img&gt;</code> with a descriptive <code>alt</code> (image essence) and put any
			SOURCE / CREDIT / DATE in the <code>&lt;figcaption&gt;</code>.
		</p>
		<figure>
			<img
				:src="gradientThumbDataUri"
				alt="A green-to-violet gradient with abstract circles and a low horizon line"
				width="640"
				height="360"
			/>
			<figcaption>
				Fig 1 — Abstract gradient composition, generated for the framework showcase. Released into
				the public domain.
			</figcaption>
		</figure>
	</section>

	<section id="figures-quote">
		<h2>Block-quote figure — pull-quote pattern</h2>
		<p>
			HTML5 recommends pairing <code>&lt;blockquote&gt;</code> with
			<code>&lt;figcaption&gt;</code> inside a <code>&lt;figure&gt;</code> when the quote needs
			attribution. The <code>cite</code> attribute on <code>&lt;blockquote&gt;</code> carries the
			URL of the source; the <code>&lt;figcaption&gt;</code> displays the human-readable byline.
		</p>
		<figure>
			<blockquote cite="https://en.wikiquote.org/wiki/Ada_Lovelace">
				<p>
					The Analytical Engine has no pretensions whatever to <em>originate</em> anything. It can
					do <em>whatever we know how to order it</em> to perform. It can follow analysis; but it
					has no power of <em>anticipating</em> any analytical relations or truths.
				</p>
			</blockquote>
			<figcaption>
				— Ada Lovelace,
				<cite>Notes on the Analytical Engine</cite>, Note G (1843)
			</figcaption>
		</figure>
	</section>

	<section id="figures-code">
		<h2>Code listing figure</h2>
		<p>
			A preformatted code block with a caption attributing the source file, language, or author. The
			<code>&lt;pre&gt;&lt;code&gt;</code> payload gets the framework's block-code chrome (tinted
			bg, monospace, padding, scrollable); the caption reads as the byline.
		</p>
		<figure>
			<pre><code>function fibonacci(n) {
  if (n &lt; 2) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10)) // 55</code></pre>
			<figcaption>
				Listing 1 — Naive recursive Fibonacci. JavaScript. Time complexity O(2<sup>n</sup>); use
				memoization for inputs above ~30.
			</figcaption>
		</figure>
	</section>

	<section id="figures-table">
		<h2>Tabular figure</h2>
		<p>
			A <code>&lt;table&gt;</code> already has its own <code>&lt;caption&gt;</code> (rendered inside
			the table's principal box, reads as the table's label). Wrapping it in a
			<code>&lt;figure&gt;</code> + <code>&lt;figcaption&gt;</code> adds a SECONDARY layer of
			attribution — useful when the table is referenced elsewhere in the document ("see Fig 3") or
			when the caption needs more body than the in-table caption should carry.
		</p>
		<figure>
			<table class="bordered">
				<caption>
					Theme palette tokens
				</caption>
				<thead>
					<tr>
						<th>Token</th>
						<th>Light</th>
						<th>Dark</th>
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
					</tr>
				</tbody>
			</table>
			<figcaption>
				Fig 2 — Core theme tokens that drive every other tier via
				<code>color-mix</code>. See <a href="#/typography">TypographyPage</a> for the per-tier
				breakdown.
			</figcaption>
		</figure>
	</section>

	<section id="figures-svg">
		<h2>SVG diagram figure</h2>
		<p>
			Inline <code>&lt;svg&gt;</code> illustrations follow the same pattern — figure groups the
			diagram with its caption. Using <code>fill="currentColor"</code> on the SVG paths lets the
			diagram retint to match the page's text color cascade automatically.
		</p>
		<figure>
			<svg
				viewBox="0 0 480 240"
				style="max-inline-size: 480px; color: var(--color-primary)"
				aria-hidden="true"
			>
				<line
					x1="20"
					y1="200"
					x2="460"
					y2="200"
					stroke="currentColor"
					stroke-width="2"
					opacity="0.4"
				/>
				<line
					x1="20"
					y1="40"
					x2="20"
					y2="200"
					stroke="currentColor"
					stroke-width="2"
					opacity="0.4"
				/>
				<polyline
					points="20,180 80,160 140,130 200,150 260,90 320,70 380,55 440,40"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
				/>
				<circle cx="80" cy="160" r="4" fill="currentColor" />
				<circle cx="140" cy="130" r="4" fill="currentColor" />
				<circle cx="200" cy="150" r="4" fill="currentColor" />
				<circle cx="260" cy="90" r="4" fill="currentColor" />
				<circle cx="320" cy="70" r="4" fill="currentColor" />
				<circle cx="380" cy="55" r="4" fill="currentColor" />
				<circle cx="440" cy="40" r="4" fill="currentColor" />
			</svg>
			<figcaption>
				Fig 3 — Cumulative commit count over the project's lifetime. Inline
				<code>&lt;svg&gt;</code> with <code>fill="currentColor"</code> +
				<code>stroke="currentColor"</code>
				so the diagram retints automatically per host context.
			</figcaption>
		</figure>
	</section>

	<section id="figures-card">
		<h2>Figure inside an <code>&lt;article&gt;</code> card</h2>
		<p>
			When card chrome is wanted (padding, border, shadow, radius), compose the figure inside an
			<code>&lt;article&gt;</code>. The article provides the surface; the figure provides the
			semantic grouping. Two complementary contracts.
		</p>
		<article>
			<figure>
				<img
					:src="gradientThumbDataUri"
					alt="The same gradient, rendered inside a card"
					width="640"
					height="360"
				/>
				<figcaption>
					Fig 4 — The figure pattern composed inside an <code>&lt;article&gt;</code> card. Card
					chrome (padding, border, shadow, radius) comes from the article; figure / caption semantic
					grouping comes from the figure.
				</figcaption>
			</figure>
		</article>
	</section>

	<section id="figures-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				<code>&lt;figcaption&gt;</code> describes the figure for the document reader.
				<code>alt</code> on an inner <code>&lt;img&gt;</code> describes the image for screen
				readers. They're <em>complementary</em> — write both. Empty <code>alt=""</code> is the right
				choice when the figcaption already conveys the image's purpose.
			</li>
			<li>
				A <code>&lt;figure&gt;</code> can hold any self-contained payload: images, video, audio,
				code, quotes, tables, diagrams. The shared trait is "can be moved away from the main flow
				without breaking comprehension" — that's what makes it figure-worthy.
			</li>
			<li>
				The <code>&lt;figcaption&gt;</code> must be the FIRST or LAST child of the
				<code>&lt;figure&gt;</code> (per HTML5 spec). The framework's flex-column layout handles
				either order — caption-first reads as a label / title, caption-last reads as attribution.
			</li>
			<li>
				Don't reach for <code>&lt;figure&gt;</code> as a generic image wrapper. If there's no
				caption / attribution / cross-reference, the bare <code>&lt;img&gt;</code> is enough. The
				figure carries semantic weight — use it where that weight is meaningful.
			</li>
			<li>
				For card chrome (shadow, padding, radius), compose with <code>&lt;article&gt;</code>. A bare
				<code>&lt;figure&gt;</code> never gets card chrome by default — the framework treats it as a
				semantic grouping element, not a presentational box.
			</li>
		</ul>
	</section>
</template>
