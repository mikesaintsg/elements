<script lang="ts" setup>
 /**
 * SectioningPage — the canonical reference for the sectioning content
 * family: `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`,
 * `<footer>`, `<nav>`, `<search>`, `<hgroup>`.
 *
 * API surface coverage (Phase 1 audit):
 *   `<main>` — primary content landmark. Framework hydrates as a
 *     flex-column container with fluid `--set-main-padding-inline`
 *     gutter and `--set-main-gap` rhythm between top-level children.
 *     One visible `<main>` per page (others must carry `hidden`).
 *   `<section>` — thematic grouping. Framework hydrates with
 *     `--set-section-padding-block` + `--set-section-gap` so a bare
 *     `<section>` already has vertical rhythm. Nesting collapse: a
 *     `<section>` inside `<main>` / `<section>` / `<article>` /
 *     `<dialog>` / `<dialog>` form opts out of its own padding-block
 *     (parent owns the gutter) so successive sections don't stack
 *     whitespace budgets.
 *   `<article>` — self-contained composition. Card chrome via
 *     `components/_article.scss` (border, padding, radius, shadow).
 *   `<aside>` — tangential / supplementary content. Inside `<main>`
 *     reads as a callout; inside `<body>` shell reads as a side rail.
 *   `<header>` — introductory content / banner. Inside `<body>` reads
 *     as the page app bar (flex row with bottom border); inside an
 *     `<article>` or `<dialog>` reads as a card / modal header band.
 *   `<footer>` — closing content / contentinfo. Same context-aware
 *     shape as `<header>`.
 *   `<nav>` — navigation landmark. Inside `<body>` shell reads as a
 *     side rail; bare `<nav>` is a flex row.
 *   `<search>` — search / filter landmark. Flex row hosting an
 *     `<input>` + optional submit button.
 *   `<hgroup>` — heading + tagline group. Flex-column stack with the
 *     tagline reading at `--color-text-muted`.
 *
 * Cross-references:
 *   - The body-grid layout shell that places `<header>` / `<nav>` /
 *     `<main>` / `<aside>` / `<footer>` into named grid areas lives
 *     in `components/_body.scss`. This page is ITSELF inside such a
 *     shell (the showcase app), so most demos here use scoped
 *     `<article>` containers to avoid recursive nesting confusion.
 *   - `<dialog>` (the floating-surface peer of `<section>`) lives on
 *     DialogElementPage. Its direct-child `<header>` / `<footer>`
 *     auto-hydrate as modal-header / modal-footer bands.
 */
</script>

<template>
	<section id="sectioning-intro">
		<hgroup>
			<h1>Sectioning content</h1>
			<p>
				The HTML5 sectioning family. Each element creates a landmark for assistive tech and gives
				the page a structural backbone — heading rank, document outline, sticky-offset anchor
				landings, and the framework's body-grid app-shell layout all derive from these elements.
			</p>
		</hgroup>
		<p>
			Framework contribution: every sectioning element gets hydrated chrome so dropping it into a
			page makes the page <em>feel alive</em> without any extra wrapper divs. Nesting collapse means
			descendant sections don't double-pad; sticky-offset means deep links land their target heading
			clear of any pinned app bar.
		</p>
	</section>

	<section id="sectioning-main">
		<h2><code>&lt;main&gt;</code></h2>
		<p>
			Primary content landmark. ONE per page (others must carry <code>hidden</code>). Framework
			hydrates as a flex-column container with a fluid inline padding gutter (<code
				>--set-main-padding-inline</code
			>
			= <code>clamp(1rem, 5vw, …)</code>) that narrows on mobile and widens on desktop, plus
			<code>--set-main-gap</code> rhythm between top-level children — no manual
			<code>&lt;div class="stack"&gt;</code> needed.
		</p>
		<p>
			This page is itself inside a <code>&lt;main&gt;</code> (the body-grid layout shell). The fluid
			gutter you see between the sidebar and this text is the framework's
			<code>--set-main-padding-inline</code> in action.
		</p>
	</section>

	<section id="sectioning-section">
		<h2><code>&lt;section&gt;</code></h2>
		<p>
			A thematic grouping of content, typically with its own heading. Maps to the
			<code>region</code> ARIA landmark when given an accessible name (<code>aria-label</code> /
			<code>aria-labelledby</code>). NOT a generic layout box — use <code>&lt;div&gt;</code> for
			that.
		</p>
		<p>
			Framework hydrates with <code>padding-block</code> and <code>gap</code> rhythm. Each section
			on this page (including this one) ships those defaults without any class.
			<strong>Nesting collapse:</strong> a <code>&lt;section&gt;</code> inside
			<code>&lt;main&gt;</code> / <code>&lt;section&gt;</code> / <code>&lt;article&gt;</code> /
			<code>&lt;dialog&gt;</code> opts out of its own <code>padding-block</code> — the parent
			already supplies the gutter, so successive sections don't stack two budgets of whitespace.
		</p>
		<article>
			<header>
				<h3>Nested section demo</h3>
			</header>
			<p>
				Two sections inside this <code>&lt;article&gt;</code> — note that they don't double-pad. The
				article's own padding-block owns the outer rhythm; each section's
				<code>padding-block: 0</code> kicks in via the nesting-collapse rule.
			</p>
			<section class="showcase-bordered-dashed-bottom">
				<h4>First nested section</h4>
				<p>Children here flow with the section's <code>gap</code> rhythm.</p>
			</section>
			<section>
				<h4>Second nested section</h4>
				<p>No extra whitespace stack between this section and the one above.</p>
			</section>
		</article>
		<p>
			Also: <code>scroll-margin-block-start</code> consumes <code>--set-sticky-offset</code> so
			anchor navigation (<code>#section-id</code>) lands the heading clear of any sticky app bar.
		</p>
		<h3><code>section.flush</code> — explicit gutter strip</h3>
		<p>
			The nesting-collapse rule covers the most common case automatically:
			<code>&lt;section&gt;</code> inside <code>&lt;main&gt;</code> / <code>&lt;section&gt;</code> /
			<code>&lt;article&gt;</code> / <code>&lt;dialog&gt;</code> drops its own
			<code>padding-block</code> so siblings don't double-pad. But when a
			<code>&lt;section&gt;</code> lives inside a non-section parent (a tab panel, a card body, a
			custom layout), the collapse doesn't fire and the section keeps its block gutter.
			<code>.flush</code> is the explicit opt-out: zeroes both <code>margin</code> and
			<code>padding</code> so the section butts against the host's edges.
		</p>
		<article class="showcase-flush-host" style="max-width: 32rem">
			<header>
				<h3>Tabbed status panel</h3>
			</header>
			<section class="flush p-4">
				<h4 class="mt-0 mb-1">Active session</h4>
				<p class="m-0">
					<small>
						Section butts against the host's header and the next sibling — no gutter, no margin. The
						host (<code>&lt;article&gt;</code>) owns vertical rhythm.
					</small>
				</p>
			</section>
			<hr class="m-0" />
			<section class="flush p-4">
				<h4 class="mt-0 mb-1">Recent activity</h4>
				<p class="m-0">
					<small>
						Two flush sections separated by a <code>&lt;hr&gt;</code>; both share the host's
						perimeter without any extra block space.
					</small>
				</p>
			</section>
			<footer>
				<small>Refreshes every 30 seconds.</small>
			</footer>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;section class="flush"&gt;…&lt;/section&gt;
  &lt;hr /&gt;
  &lt;section class="flush"&gt;…&lt;/section&gt;
  &lt;footer&gt;…&lt;/footer&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="sectioning-article">
		<h2><code>&lt;article&gt;</code></h2>
		<p>
			Self-contained content that could stand alone — a card, a blog post, a comment, a product
			summary. Where <code>&lt;section&gt;</code> is a semantic grouping inside a larger document,
			<code>&lt;article&gt;</code> is the document itself (or a piece of one extractable in full).
			Framework ships card chrome by default — border, padding, radius, background — via
			<code>components/_article.scss</code>.
		</p>
		<article>
			<header>
				<h3>Article title</h3>
				<p class="showcase-card-subtitle">
					Published 2026-04-30 · 3 min read
				</p>
			</header>
			<p>
				Article body. The card's chrome (border, radius, padding) comes from the framework's article
				component partial; the heading band on top and the optional footer band below pick up
				matching dividers without any extra classes.
			</p>
			<footer>
				<p class="showcase-card-subtitle">
					Filed under <a href="#sectioning-article">architecture</a>,
					<a href="#sectioning-article">tokens</a>.
				</p>
			</footer>
		</article>
	</section>

	<section id="sectioning-aside">
		<h2><code>&lt;aside&gt;</code></h2>
		<p>Tangential or supplementary content. Context-aware chrome:</p>
		<ul>
			<li>
				<strong>Inside <code>&lt;body&gt;</code></strong> — paints as a side rail (the right-hand
				TOC on this very page is a <code>&lt;body&gt; &gt; &lt;aside&gt;</code>).
			</li>
			<li>
				<strong>Inside <code>&lt;main&gt;</code> / <code>&lt;article&gt;</code></strong> — paints as
				an inline callout (tinted bg, rounded, padded).
			</li>
		</ul>
		<aside>
			<p class="m-0">
				<strong>Callout:</strong> this <code>&lt;aside&gt;</code> sits inside a
				<code>&lt;section&gt;</code> which sits inside <code>&lt;main&gt;</code>, so it paints as a
				tinted inline callout — not a rail. Variant classes (<code>.primary</code>,
				<code>.success</code>, <code>.warning</code>, <code>.danger</code>, …) retint the callout
				via the <code>--color-{variant}-bg-subtle</code> cascade.
			</p>
		</aside>
		<aside class="success">
			<p class="m-0">
				<strong>Success callout</strong> — same element, <code>.success</code> variant class. The
				whole framework's variant cascade applies.
			</p>
		</aside>
		<aside class="warning">
			<p class="m-0">
				<strong>Warning callout</strong> — pair the color with a text cue so the meaning survives
				color-blind and forced-colors readers.
			</p>
		</aside>
	</section>

	<section id="sectioning-header-footer">
		<h2><code>&lt;header&gt;</code> + <code>&lt;footer&gt;</code></h2>
		<p>Introductory and closing content. Both are context-aware:</p>
		<ul>
			<li>
				Inside <code>&lt;body&gt;</code> — page app bar / page footer band (the showcase's top bar
				and bottom <em>"Elements framework"</em> strip are these).
			</li>
			<li>Inside <code>&lt;article&gt;</code> — card header / card footer band.</li>
			<li>
				Inside <code>&lt;dialog&gt;</code> — modal header / modal footer band (see
				<a href="#/dialog-element">DialogElementPage</a>).
			</li>
			<li>
				Inside <code>&lt;section&gt;</code> — section header / section footer (subtle, no band
				chrome — just semantic grouping).
			</li>
		</ul>
		<article>
			<header>
				<hgroup>
					<h3>Card header demo</h3>
					<p>Heading + tagline pattern using <code>&lt;hgroup&gt;</code></p>
				</hgroup>
			</header>
			<p>
				Card body. The header above paints with a divider line; the footer below paints with one
				too. Both bands extend edge-to-edge of the card via the framework's article-header /
				article-footer chrome rules.
			</p>
			<footer class="flex gap-2">
				<button type="button" class="primary">Save</button>
				<button type="button" class="subtle">Cancel</button>
			</footer>
		</article>
	</section>

	<section id="sectioning-nav-search">
		<h2><code>&lt;nav&gt;</code> + <code>&lt;search&gt;</code></h2>
		<p>
			Navigation and search landmarks. Like <code>&lt;aside&gt;</code>, they're context-aware: a
			top-level <code>&lt;nav&gt;</code> reads as the body-grid side rail (the sidebar on this
			page), an inline <code>&lt;nav&gt;</code> inside an article reads as an action row, and a bare
			<code>&lt;nav&gt; &gt; &lt;ol&gt;</code> is the breadcrumb pattern.
		</p>
		<nav aria-label="Breadcrumb example">
			<ol>
				<li><a href="#sectioning-intro">Home</a></li>
				<li><a href="#sectioning-intro">Components</a></li>
				<li><a href="#sectioning-intro">Sectioning</a></li>
				<li aria-current="page">Nav + Search demo</li>
			</ol>
		</nav>
		<p>
			<code>&lt;search&gt;</code> is the HTML Living Standard's landmark for search / filter UI
			(Baseline 2023+). The framework treats bare <code>&lt;search&gt;</code> as a flex row hosting
			an <code>&lt;input&gt;</code> + optional submit button. The framework provides the row chrome;
			positioning inside a body-shell rail (pinned, scrolling, in-flow) is a consumer composition.
			The showcase sidebar wraps its <code>&lt;search&gt;</code> in a
			<code>.showcase-sidebar-region</code> wrapper that pins as a card above a separately-scrolling
			link list — see <code>app/browser/styles/showcase.css</code> for the composed-rail pattern.
		</p>
		<search>
			<label>
				<span class="sr-only">Site search</span>
				<input type="search" placeholder="Search the docs…" />
			</label>
			<button type="button" class="primary">Search</button>
		</search>
	</section>

	<section id="sectioning-hgroup">
		<h2><code>&lt;hgroup&gt;</code></h2>
		<p>
			Heading + tagline grouping. A flex-column stack: a single heading (any level h1–h6) on top,
			one or more <code>&lt;p&gt;</code> taglines below at <code>--color-text-muted</code>. The
			pattern reads as "headline + dek" — common in articles, page intros, dialog headers.
		</p>
		<hgroup>
			<h3>Headline goes here</h3>
			<p>
				And a tagline below in muted color, smaller weight — reads as metadata under the heading.
			</p>
		</hgroup>
		<p>
			See <a href="#/headings">HeadingsPage</a> for the full heading rank cascade and the
			<code>&lt;hgroup&gt;</code> chrome contract.
		</p>
	</section>

	<section id="sectioning-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				<strong>One <code>&lt;main&gt;</code> per page</strong> — others must carry
				<code>hidden</code>. Maps to the <code>main</code> ARIA landmark; screen-reader users press
				a key to skip directly to its first child.
			</li>
			<li>
				<strong
					>Use <code>&lt;section&gt;</code> for thematic groupings with their own heading, not as a
					generic layout box.</strong
				>
				If there's no heading and no theme, <code>&lt;div&gt;</code> is the right element.
			</li>
			<li>
				<strong
					>Give <code>&lt;section&gt;</code> and <code>&lt;article&gt;</code> an accessible
					name</strong
				>
				(<code>aria-label</code> or <code>aria-labelledby</code>) so they register as discoverable
				regions in the assistive-tech landmark tree.
			</li>
			<li>
				<strong
					>Don't nest <code>&lt;main&gt;</code> inside <code>&lt;main&gt;</code>,
					<code>&lt;article&gt;</code>, <code>&lt;aside&gt;</code>, <code>&lt;nav&gt;</code>, or
					<code>&lt;header&gt;</code></strong
				>
				(per HTML5 — content model violation). Sections nest fine; <code>&lt;main&gt;</code> is the
				document root for primary content.
			</li>
			<li>
				<strong>Sectioning elements DON'T reset heading rank</strong> — an
				<code>&lt;h1&gt;</code> inside a nested <code>&lt;section&gt;</code> is still document-level
				h1. Use rank consistent with the document outline; don't decorate ranks based on nesting
				depth.
			</li>
		</ul>
	</section>
</template>
