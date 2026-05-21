<script lang="ts" setup>
/**
 * EditorialExample — the framework's content & typography pillar.
 *
 * A long-form article rendered from bare content elements with ZERO
 * custom CSS: the heading scale, prose rhythm (`p + p`), <figure> +
 * <figcaption>, <blockquote> + <cite>, <code>/<kbd>/<samp> chips,
 * <table>, <dl>, <details> FAQ, <hr>, <aside> callouts, and inline
 * <mark>/<abbr>/<time> all ship their own baselines. The only layout
 * choice is a centered reading column.
 */
import { ARTICLE_CARD_HERO_URI as heroImage } from '../constants.js'
</script>

<template>
	<main>
		<article class="flush w-full max-w-3xl mx-auto">
			<hgroup>
				<p class="text-xs uppercase tracking-wide m-0" style="color: var(--color-text-subtle)">
					Engineering · 6 min read
				</p>
				<h1>Designing with the grain</h1>
				<p>
					Why the most maintainable component is the one you never wrote — and how semantic HTML
					gets you there.
				</p>
			</hgroup>

			<div class="cluster items-center">
				<span class="avatar" aria-hidden="true">AL</span>
				<span class="flex flex-col leading-tight">
					<strong>Ada Lovelace</strong>
					<small style="color: var(--color-text-subtle)">
						Published <time datetime="2026-05-21">May 21, 2026</time>
					</small>
				</span>
			</div>

			<figure>
				<img
					:src="heroImage"
					alt="Abstract teal-to-cyan gradient with layered circles"
					width="1200"
					height="500"
				/>
				<figcaption>Surfaces composed from the same small vocabulary, tuned by tokens.</figcaption>
			</figure>

			<p>
				Every design system eventually faces the same question: how many components is too many? The
				honest answer is that the count was never the problem — <em>duplication</em> was. When a
				card, a panel, and a tile are three different files that drift apart over a year, the cost
				is paid in every review that follows.
			</p>

			<p>
				The framework's wager is simple. The HTML element <strong>is</strong> the component. An
				<code>&lt;article&gt;</code> is a card; an <code>&lt;aside&gt;</code> is a sidebar; a
				<code>&lt;dialog&gt;</code> is a modal. Variation rides on a tiny modifier vocabulary rather
				than a sprawl of bespoke classes.
			</p>

			<h2>The shape of a rule</h2>
			<p>
				A framework rule only ships when neither the browser default nor the reset already supplies
				what's needed. Three tests decide it: a UA quirk that breaks layout, an affordance the reset
				strips, or an element that earns the full modifier cascade. Everything else stays untouched
				— which is why a bare <code>&lt;p&gt;</code> still reads like prose.
			</p>

			<aside class="information">
				<p>
					<strong>Rule of thumb:</strong> if the platform already does it, the framework keeps
					quiet. The smallest surface area is the one that ages best.
				</p>
			</aside>

			<h3>Tokens over toggles</h3>
			<p>
				Modifiers don't paint pixels. <code>.primary</code> sets
				<code>--set-variant-*</code> tokens; the element baseline reads them through a fallback
				chain. Press <kbd>⌘</kbd><kbd>K</kbd> in most editors and you'll find the whole vocabulary
				in one file — seven variants, two sizes, two fills.
			</p>

			<pre><code>&lt;button class="primary"&gt;Save&lt;/button&gt;
&lt;button class="primary large filled"&gt;Save&lt;/button&gt;
&lt;article class="success subtle"&gt;Build passed&lt;/article&gt;</code></pre>

			<h2>What the cascade buys you</h2>
			<p>
				Because every styled element consumes the same context tokens, adding a new element adds
				<em>no</em> new modifier code. The dimension that wrote the token doesn't know — or care —
				which element reads it.
			</p>

			<table>
				<thead>
					<tr>
						<th>Approach</th>
						<th>New classes per component</th>
						<th>Drift risk</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Class-per-pattern</td>
						<td>Many (<samp>.card-body</samp>, <samp>.modal-body</samp>…)</td>
						<td><span class="badge danger">High</span></td>
					</tr>
					<tr>
						<td>Element + modifiers</td>
						<td>Zero</td>
						<td><span class="badge success">Low</span></td>
					</tr>
				</tbody>
			</table>

			<h2>A note on restraint</h2>
			<blockquote>
				<p>
					The Analytical Engine has no pretensions whatever to originate anything. It can do
					whatever we know how to order it to perform.
				</p>
				<cite>Ada Lovelace, 1843</cite>
			</blockquote>

			<p>
				Restraint is the same instinct applied to CSS. The framework would rather delete a rule than
				add an exception. <mark>Less surface, fewer seams.</mark>
			</p>

			<hr />

			<h2>Frequently asked</h2>
			<details>
				<summary>Do I still need a <code>&lt;div&gt;</code> ever?</summary>
				<p>
					Yes — for purely presentational grouping (<code>.stack</code>, <code>.cluster</code>,
					<code>.frame</code>). The point isn't to ban <code>&lt;div&gt;</code>; it's to reach for
					the semantic element first when one fits.
				</p>
			</details>
			<details>
				<summary>How do I theme the whole UI at once?</summary>
				<p>
					Override the <code>--color-*</code> tokens at <code>:root</code>. Every variant, surface,
					and band re-tunes in lockstep because they all resolve through the same theme layer.
				</p>
			</details>
			<details>
				<summary>What about dark mode?</summary>
				<p>
					It follows
					<abbr title="the prefers-color-scheme media feature">the OS preference</abbr> by default
					and can be pinned per-document via <code>data-theme</code>.
				</p>
			</details>

			<hr />

			<dl>
				<dt>Source</dt>
				<dd>The article above uses no <code>&lt;style&gt;</code> block.</dd>
				<dt>Elements demonstrated</dt>
				<dd>
					Headings, prose, figure, blockquote, table, code, kbd, details, dl, hr, mark, abbr, time.
				</dd>
			</dl>

			<footer class="flex flex-wrap items-center gap-4">
				<a href="#" class="primary filled">Read the next post</a>
				<a href="#">Back to blog</a>
			</footer>
		</article>
	</main>
</template>
