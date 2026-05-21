<script lang="ts" setup>
/**
 * EditorialExample — the framework's content & typography pillar.
 *
 * A long-form article in a width-filling two-column reading layout: the
 * post (bare content elements, ZERO custom CSS) beside a sticky rail of
 * <article> cards (author, table of contents, tags, related, signup).
 * The grid collapses to a single column on mobile. Everything — heading
 * scale, prose rhythm, <figure>, <blockquote>, <table>, <dl>, <details>,
 * <hr>, callouts, inline chips, the .tag/.avatar/.dot atoms — ships its
 * own baseline; the only layout choices are the grid + sticky rail.
 */
import { ARTICLE_CARD_HERO_URI as heroImage } from '../constants.js'

// <main> is the scroll container in the app shell, so native `#id`
// hash-scrolling (which targets the document) doesn't move an in-main
// section into view. Scroll within the scroll ancestor explicitly.
const scrollToSection = (id: string): void => {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const toc = [
	{ id: 'editorial-grain', label: 'Designing with the grain' },
	{ id: 'editorial-rule', label: 'The shape of a rule' },
	{ id: 'editorial-cascade', label: 'What the cascade buys you' },
	{ id: 'editorial-restraint', label: 'A note on restraint' },
	{ id: 'editorial-faq', label: 'Frequently asked' },
]
const related = [
	'Theming in one knob',
	'Why we deleted the grid system',
	'Anatomy of the modifier cascade',
]
</script>

<template>
	<main>
		<div class="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-x-12 gap-y-10 w-full">
			<!-- ── Article column ──────────────────────────────────────────── -->
			<article class="flush">
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

				<div class="cluster items-center justify-between">
					<div class="cluster items-center">
						<span class="avatar" aria-hidden="true">AL</span>
						<span class="flex flex-col leading-tight">
							<strong>Ada Lovelace</strong>
							<small style="color: var(--color-text-subtle)">
								Published <time datetime="2026-05-21">May 21, 2026</time>
							</small>
						</span>
					</div>
					<div class="cluster">
						<span class="tag">framework</span>
						<span class="tag">css</span>
					</div>
				</div>

				<figure>
					<img
						:src="heroImage"
						alt="Abstract teal-to-cyan gradient with layered circles"
						width="1200"
						height="500"
					/>
					<figcaption>
						Surfaces composed from the same small vocabulary, tuned by tokens.
					</figcaption>
				</figure>

				<section id="editorial-grain">
					<p>
						Every design system eventually faces the same question: how many components is too many?
						The honest answer is that the count was never the problem — <em>duplication</em>
						was. When a card, a panel, and a tile are three different files that drift apart over a
						year, the cost is paid in every review that follows.
					</p>
					<p>
						The framework's wager is simple. The HTML element <strong>is</strong> the component. An
						<code>&lt;article&gt;</code> is a card; an <code>&lt;aside&gt;</code> is a sidebar; a
						<code>&lt;dialog&gt;</code> is a modal. Variation rides on a tiny modifier vocabulary
						rather than a sprawl of bespoke classes.
					</p>
				</section>

				<section id="editorial-rule">
					<h2>The shape of a rule</h2>
					<p>
						A framework rule only ships when neither the browser default nor the reset already
						supplies what's needed. Three tests decide it: a UA quirk that breaks layout, an
						affordance the reset strips, or an element that earns the full modifier cascade.
						Everything else stays untouched — which is why a bare <code>&lt;p&gt;</code> still reads
						like prose.
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
						chain. Press <kbd>⌘</kbd><kbd>K</kbd> in most editors and you'll find the whole
						vocabulary in one file — seven variants, two sizes, two fills.
					</p>

					<pre><code>&lt;button class="primary"&gt;Save&lt;/button&gt;
&lt;button class="primary large filled"&gt;Save&lt;/button&gt;
&lt;article class="success subtle"&gt;Build passed&lt;/article&gt;</code></pre>
				</section>

				<section id="editorial-cascade">
					<h2>What the cascade buys you</h2>
					<p>
						Because every styled element consumes the same context tokens, adding a new element adds
						<em>no</em> new modifier code. The dimension that wrote the token doesn't know — or care
						— which element reads it.
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
				</section>

				<section id="editorial-restraint">
					<h2>A note on restraint</h2>
					<blockquote>
						<p>
							The Analytical Engine has no pretensions whatever to originate anything. It can do
							whatever we know how to order it to perform.
						</p>
						<cite>Ada Lovelace, 1843</cite>
					</blockquote>
					<p>
						Restraint is the same instinct applied to CSS. The framework would rather delete a rule
						than add an exception. <mark>Less surface, fewer seams.</mark>
					</p>
				</section>

				<hr />

				<section id="editorial-faq">
					<h2>Frequently asked</h2>
					<details>
						<summary>Do I still need a <code>&lt;div&gt;</code> ever?</summary>
						<p>
							Yes — for purely presentational grouping (<code>.stack</code>, <code>.cluster</code>,
							<code>.frame</code>). The point isn't to ban <code>&lt;div&gt;</code>; it's to reach
							for the semantic element first when one fits.
						</p>
					</details>
					<details>
						<summary>How do I theme the whole UI at once?</summary>
						<p>
							Override the <code>--color-*</code> tokens at <code>:root</code>. Every variant,
							surface, and band re-tunes in lockstep because they all resolve through the same theme
							layer.
						</p>
					</details>
					<details>
						<summary>What about dark mode?</summary>
						<p>
							It follows
							<abbr title="the prefers-color-scheme media feature">the OS preference</abbr> by
							default and can be pinned per-document via <code>data-theme</code>.
						</p>
					</details>
				</section>

				<footer class="flex flex-wrap items-center gap-4">
					<a href="#" class="primary filled">Read the next post</a>
					<a href="#">Back to blog</a>
				</footer>
			</article>

			<!-- ── Sticky sidebar rail ─────────────────────────────────────── -->
			<!-- `lg:max-h-[calc(100dvh-4rem)]` + `overflow-y-auto` give the rail
			     its OWN scroll: it pins to the top and, when its cards are taller
			     than the viewport, scrolls independently of the article instead
			     of only revealing its tail at the bottom of the page. The 4rem
			     subtracts <main>'s 2rem top + 2rem bottom padding so the pinned
			     rail sits flush within the viewport rather than bleeding past
			     its bottom edge. -->
			<aside
				class="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto"
			>
				<article class="small">
					<div class="cluster items-center">
						<span class="avatar large" aria-hidden="true">AL</span>
						<span class="flex flex-col leading-tight">
							<strong>Ada Lovelace</strong>
							<small style="color: var(--color-text-subtle)">Compiler poet</small>
						</span>
					</div>
					<p class="text-sm">
						Writes about language design, type systems, and the craft of restraint.
					</p>
					<a href="#" class="primary subtle small w-full">Follow</a>
				</article>

				<article class="small">
					<header><h3 class="text-sm">In this article</h3></header>
					<nav aria-label="On this page">
						<menu class="flex flex-col">
							<li v-for="item in toc" :key="item.id">
								<a :href="`#${item.id}`" @click.prevent="scrollToSection(item.id)">{{
									item.label
								}}</a>
							</li>
						</menu>
					</nav>
				</article>

				<article class="small">
					<header><h3 class="text-sm">Topics</h3></header>
					<div class="cluster">
						<span class="tag">semantics</span>
						<span class="tag">tokens</span>
						<span class="tag">cascade</span>
						<span class="tag">accessibility</span>
						<span class="tag">theming</span>
					</div>
				</article>

				<article class="small">
					<header><h3 class="text-sm">Related</h3></header>
					<ul class="flex flex-col gap-2 list-none">
						<li v-for="post in related" :key="post" class="flex items-center gap-2">
							<span class="dot information" aria-hidden="true"></span>
							<a href="#">{{ post }}</a>
						</li>
					</ul>
				</article>

				<article class="small information subtle">
					<h3 class="text-sm m-0">Get the newsletter</h3>
					<p class="text-sm">One considered essay every other week. No spam.</p>
					<form class="stack" @submit.prevent>
						<label>
							<span class="sr-only">Email</span>
							<input type="email" placeholder="you@example.com" required />
						</label>
						<button type="submit" class="primary small w-full">Subscribe</button>
					</form>
				</article>
			</aside>
		</div>
	</main>
</template>
