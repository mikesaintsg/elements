<script lang="ts" setup>
/**
 * HeadingsPage — the canonical reference for `<h1>` – `<h6>` and `<hgroup>`.
 *
 * API surface coverage (Phase 1 audit):
 *   - `<h1>` – `<h6>` baseline — UA per-level font-sizes re-asserted
 *     (Tailwind preflight zeroes them); `text-wrap: balance`; framework's
 *     `--set-heading-color` cascade through style → variant → body text;
 *     `font-weight: 600`, `line-height: 1.2`, `letter-spacing: -0.01em`.
 *   - 7 variant cascade — `--set-heading-color` reads
 *     `--set-variant-background-color`, so a `.primary` heading paints in
 *     primary blue. Falls back to `--color-text` when no variant is set
 *     (NOT `currentColor` — see partial header for the Chromium quirk
 *     that drove the choice).
 *   - 2 size modifiers (`.small` / `.large`) — both shift the heading's
 *     font-size via `--set-size-font-size`. The framework keeps the
 *     per-level scale intact when no size class is set, but a `.small`
 *     `<h2>` reads at the size cascade's smaller font.
 *   - `<hgroup>` heading + tagline pattern — flex-column stack, tight
 *     `--set-hgroup-gap` between heading and `<p>` tagline, the tagline
 *     drops to `--color-text-muted` so it reads as metadata not body
 *     content.
 *   - Document outline best practices — one `<h1>` per page, sequential
 *     ranks, no skipping, `<section>` does NOT reset rank (per W3C).
 *   - `text-wrap: balance` — headings wrap evenly without manual line
 *     breaks (Chromium 114+, Safari 17.5+).
 *   - Reduced-motion respect — color transition paired via
 *     `@include transition()` mixin.
 *
 * Cross-references:
 *   - `<header>` element baseline lives in `_header.scss` (sticky drawer
 *     band, body-shell app bar). The headings inside a header pick up
 *     this page's `--set-heading-*` cascade like any other heading.
 *   - `<dialog> > <header>` zeroes heading margins (the band's own
 *     padding owns the rhythm) — see `_dialog.scss`'s section chrome.
 */
import { VARIANTS as variants } from '../constants.js'

const snippetCascade = `<h1>The framework's primary headline</h1>
<h2>A second-level section heading</h2>
<h3>Third-level subsection</h3>
<h4>Fourth-level grouping</h4>
<h5>Fifth-level title</h5>
<h6>Sixth-level smallest heading</h6>`

const snippetHgroup = `<hgroup>
  <h1>Page title goes here</h1>
  <p>A short tagline that reads as metadata under the heading.</p>
</hgroup>`

const snippetVariants = `<h2 class="primary">Primary heading</h2>
<h2 class="danger">Danger heading</h2>
<h2 class="success">Success heading</h2>`

const snippetSizes = `<h3 class="small">Small h3</h3>
<h3>Default h3</h3>
<h3 class="large">Large h3</h3>`

const snippetOutline = `<!-- Good — sequential ranks, one h1 per page, sections nest in document order -->
<h1>Page title</h1>
<section>
  <h2>Section heading</h2>
  <p>Body…</p>
  <section>
    <h3>Subsection heading</h3>
    <p>Body…</p>
  </section>
</section>

<!-- Bad — skipping ranks, multiple h1, section resetting rank -->
<h1>Title</h1>
<h3>Subsection</h3> <!-- skipped h2 -->
<h1>Another title</h1> <!-- second h1 on the page -->`
</script>

<template>
	<section id="headings-intro">
		<hgroup>
			<h1>Headings</h1>
			<p>
				The document outline. The framework hydrates <code>&lt;h1&gt;</code> through
				<code>&lt;h6&gt;</code> with a per-level font scale (Tailwind preflight zeroes them; the
				framework re-establishes), <code>text-wrap: balance</code> for even line wrapping, a
				`--set-heading-color` cascade that flows through the variant + style modifiers, and a
				<code>letter-spacing: -0.01em</code> tightening that mirrors the Inter-style heading rhythm
				without coupling to a specific font.
			</p>
		</hgroup>
		<p>
			Headings drive document outlines, screen-reader navigation, and visual hierarchy at the same
			time. The framework keeps semantics and presentation aligned: an
			<code>&lt;h2&gt;</code> always renders as a level-2 heading in BOTH the accessibility tree AND
			the visual scale; size modifiers (<code>.small</code> / <code>.large</code>) shift only the
			font-size, never the rank.
		</p>
	</section>

	<section id="headings-cascade">
		<h2>Per-level scale</h2>
		<p>
			The framework's default scale, re-asserting the UA defaults that Tailwind preflight zeroes:
		</p>
		<dl>
			<dt><code>&lt;h1&gt;</code></dt>
			<dd><code>2.25rem</code> (36px) — page title.</dd>
			<dt><code>&lt;h2&gt;</code></dt>
			<dd><code>1.875rem</code> (30px) — top-level section heading.</dd>
			<dt><code>&lt;h3&gt;</code></dt>
			<dd><code>1.5rem</code> (24px) — subsection heading.</dd>
			<dt><code>&lt;h4&gt;</code></dt>
			<dd><code>1.25rem</code> (20px) — sub-subsection grouping.</dd>
			<dt><code>&lt;h5&gt;</code></dt>
			<dd><code>1.125rem</code> (18px) — small group title.</dd>
			<dt><code>&lt;h6&gt;</code></dt>
			<dd><code>1rem</code> (16px) — body-sized smallest heading; useful for sidebar labels.</dd>
		</dl>
		<div class="stack">
			<h1>Heading level 1 — page title</h1>
			<h2>Heading level 2 — section heading</h2>
			<h3>Heading level 3 — subsection</h3>
			<h4>Heading level 4 — grouping</h4>
			<h5>Heading level 5 — small group</h5>
			<h6>Heading level 6 — sidebar label</h6>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetCascade }}</code></pre>
		</details>
	</section>

	<section id="headings-hgroup">
		<h2>Heading + tagline (<code>&lt;hgroup&gt;</code>)</h2>
		<p>
			<code>&lt;hgroup&gt;</code> groups a primary heading with adjacent metadata
			<code>&lt;p&gt;</code> elements (taglines, subtitles, alternative titles). The heading drives
			the document outline; the surrounding paragraphs are subordinate metadata that should read
			tighter and quieter than the heading.
		</p>
		<p>
			The framework's hgroup baseline is intentionally minimal: a flex-column stack with a small
			<code>--set-hgroup-gap</code> between the heading and the tagline so they hug vertically (no
			UA paragraph margin to fight), the tagline color drops to
			<code>--color-text-muted</code> (slate-600 light / slate-400 dark) so it reads as metadata not
			body copy, and the tagline font drops to <code>--text-sm</code> so the heading still owns the
			visual weight.
		</p>
		<div class="stack">
			<hgroup>
				<h1>Page title goes here</h1>
				<p>A short tagline that reads as metadata under the heading.</p>
			</hgroup>
			<hgroup>
				<h2>Section title</h2>
				<p>Subordinate description, dropping to muted text and small font.</p>
			</hgroup>
			<hgroup>
				<h3>Card title</h3>
				<p>Tagline below the card heading.</p>
			</hgroup>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetHgroup }}</code></pre>
		</details>
	</section>

	<section id="headings-variants">
		<h2>Variant cascade</h2>
		<p>
			Adding a variant class tints the heading via <code>--set-heading-color</code> →
			<code>--set-variant-background-color</code>. The cascade falls through to
			<code>--color-text</code> when no variant is set, so a bare heading reads at the body's tone
			(Bootstrap / mailbox convention — headings INHERIT the body's tone for a coherent text mass;
			an <code>.text-emphasis</code> utility or a wrapped <code>&lt;strong&gt;</code>
			is the opt-in for "shouty" headings).
		</p>
		<div class="stack">
			<h2 v-for="v in variants" :key="v" :class="v">
				{{ v[0]?.toUpperCase() + v.slice(1) }} — heading-level-2 in the {{ v }} variant
			</h2>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="headings-sizes">
		<h2>Size modifiers</h2>
		<p>
			<code>.small</code> and <code>.large</code> shift the heading's font-size via the size cascade
			(<code>--set-size-font-size</code>) without changing the rank. The framework's per-level scale
			stays intact when no size modifier is set; a <code>.small</code> <code>&lt;h2&gt;</code> reads
			at the size cascade's smaller font but is still an h2 in the document outline.
		</p>
		<div class="stack">
			<h3 class="small">Small h3 — for tight contexts</h3>
			<h3>Default h3 — the framework's per-level scale</h3>
			<h3 class="large">Large h3 — for emphasis without rank-skipping</h3>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="headings-balance">
		<h2>Balanced wrapping (<code>text-wrap: balance</code>)</h2>
		<p>
			The framework ships <code>text-wrap: balance</code> on every heading. The browser distributes
			the heading's text evenly across lines so a long title doesn't end with a single orphan word
			on the last line. Chromium 114+, Safari 17.5+, Firefox 121+ — the feature gracefully degrades
			to default wrapping in older engines.
		</p>
		<div class="stack">
			<h2>
				This is a relatively long heading that demonstrates how text-wrap balance keeps lines
				visually even instead of leaving an orphan word on the last line
			</h2>
		</div>
	</section>

	<section id="headings-outline">
		<h2>Document outline best practices</h2>
		<p>The W3C / WHATWG outline rules the framework expects pages to follow:</p>
		<ul>
			<li>
				<strong>One <code>&lt;h1&gt;</code> per page.</strong> Use it for the page title. Section
				headings start at <code>&lt;h2&gt;</code>.
			</li>
			<li>
				<strong>Sequential ranks — no skipping.</strong> Don't jump from <code>&lt;h2&gt;</code> to
				<code>&lt;h4&gt;</code>. Screen readers expose the outline as a list and gaps confuse
				navigation.
			</li>
			<li>
				<strong><code>&lt;section&gt;</code> does NOT reset rank.</strong> Despite an early HTML5
				draft proposing implicit-outline algorithms, every browser shipped flat-rank only — an
				<code>&lt;h1&gt;</code> inside a nested <code>&lt;section&gt;</code> is still a
				document-level h1.
			</li>
			<li>
				<strong>Keep the visual scale aligned with rank.</strong> If you need a smaller visually-h2
				element, use <code>&lt;h2 class="small"&gt;</code> — keep the rank, shift the font-size.
				Don't downgrade to <code>&lt;h3&gt;</code> just to get smaller text.
			</li>
		</ul>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetOutline }}</code></pre>
		</details>
	</section>

	<section id="headings-color-cascade">
		<h2>Color cascade rationale</h2>
		<p>
			The framework's <code>--set-heading-color</code> chain reads
			<code>--set-style-color</code> first (so a <code>.filled</code> card's heading inherits the
			white-on-fill contrast color), then <code>--set-variant-background-color</code> (so a
			<code>.primary</code> heading paints primary blue), then <code>--color-text</code> (so bare
			headings inherit the body's tone).
		</p>
		<p>
			The final fallback is deliberately <code>--color-text</code> rather than
			<code>currentColor</code> — Chromium has a long-standing resolution quirk where
			<code>currentColor</code> inside a nested <code>var()</code> chain on the
			<code>color</code> property resolves against the cascaded value's origin element, not the
			consuming element, which breaks scoped theme switching. <code>--color-text</code> always
			resolves to a concrete oklch (set on <code>:root</code> for light, overridden under
			<code>[data-theme="dark"]</code>), so the chain has no circular issue.
		</p>
	</section>

	<section id="headings-balance-rationale">
		<h2>Why the framework re-asserts the per-level scale</h2>
		<p>
			Tailwind v4's preflight collapses every heading to
			<code>font-size: inherit; font-weight: inherit</code> — the page-author opt-in for "headings
			are styled by utilities, not the browser." The framework's element-baseline philosophy is the
			opposite: drop a bare <code>&lt;h2&gt;</code> in and it should already look like a heading, no
			utilities required. The framework re-establishes the per-level scale (<code>2.25</code> /
			<code>1.875</code> / <code>1.5</code> / <code>1.25</code> / <code>1.125</code> /
			<code>1rem</code>) inside <code>:where()</code> so utilities still beat the baseline if the
			consumer wants to override.
		</p>
	</section>
</template>
