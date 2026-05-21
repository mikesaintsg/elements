<script lang="ts" setup>
 /**
 * TypographyPage — the canonical reference for the framework's inline
 * + block typography elements. Twenty-three semantic elements in
 * body-copy context, each demonstrating the framework's chrome
 * contract against UA defaults + Tailwind preflight.
 *
 * API surface coverage (Phase 1 audit):
 *   Block — `<p>`, `<blockquote>`, `<pre>`, `<address>`, `<hr>`
 *   Inline emphasis — `<strong>`, `<em>`, `<small>`, `<mark>`, `<u>`,
 *     `<s>`
 *   Edits — `<ins>`, `<del>` (in addition to `<s>` for strike-through)
 *   Computer text — `<code>`, `<kbd>`, `<samp>`, `<var>`
 *   Quotations — `<q>` (inline), `<blockquote>` (block, also in §Block)
 *   Abbreviations + machine-readable — `<abbr>`, `<time>`, `<data>`
 *   Position adjustment — `<sub>`, `<sup>`
 *
 * Each section demonstrates the element in flowing prose so the
 * framework's chrome (border-bar on blockquote, monospace on code,
 * tinted background on mark, dotted underline on abbr, etc.) shows up
 * IN CONTEXT — not as a standalone glyph in isolation. The page itself
 * is real body copy that exercises every element.
 *
 * Cross-references:
 *   - `<code>` chrome rationale (`color-mix(currentColor 12%,
 *     transparent)` for context-aware bg) is documented on
 *     `_code.scss`. Filled-context demos appear on DialogElementPage.
 *   - `<blockquote>` leading-bar uses the saturated `-600` step (NOT
 *     the on-canvas tier) because the bar is a 4px decoration, not
 *     text — see `plan.md §9.7` skip-list.
 */
</script>

<template>
	<section id="typography-intro">
		<hgroup>
			<h1>Typography</h1>
			<p>
				Twenty-three semantic typography elements demonstrated in body-copy context. The framework
				hydrates each one with the chrome it's missing after Tailwind preflight zeroes the UA
				defaults — paragraph rhythm, blockquote bars, code tints, mark highlights, kbd badges, abbr
				dotted underlines, ins / del color tints, and so on. Every element below paints from a
				<code>--set-{tag}-*</code> token chain so consumers retune surface-wide via
				<code>:root</code> without forking partials.
			</p>
		</hgroup>
		<p>
			This page is itself a typography spec. Every element appears inline within real paragraphs
			(not isolated samples) so the reader can see how the chrome reads against body copy at the
			framework's default size + line-height. Drop any of these elements into a fresh document and
			they'll render with the same rhythm — that's the baseline hydration contract.
		</p>
		<p>
			<strong>Base size.</strong> The framework ships a <code>0.875rem</code> (14px) body size — the
			dense SaaS-desktop default — via <code>--set-font-size-base</code> (with
			<code>--set-line-height-base</code> 1.5 and <code>--set-font-family-base</code>, applied on
			<code>&lt;body&gt;</code>). Crucially this is a <em>body</em> size:
			<code>&lt;html&gt;</code> stays at the UA 16px, so <code>rem</code>-based spacing, radius, and
			the heading scale keep their absolute sizes — only inherited text drops to 14px. Set
			<code>:root {{ '{' }} --set-font-size-base: 1rem {{ '}' }}</code> for the looser 16px feel.
		</p>
	</section>

	<section id="typography-paragraph">
		<h2>Paragraph and block flow</h2>
		<p>
			The bare <code>&lt;p&gt;</code> element ships at the body's default font size and line-height
			with zero margin (Tailwind preflight strips margin universally; the framework keeps it zeroed
			and lets layout — flex / grid <code>gap</code>, <code>&lt;section&gt;</code>'s
			<code>--set-section-gap</code>, or a wrapping <code>.stack</code> — own the vertical rhythm).
		</p>
		<p>
			Stacking paragraphs inside a <code>&lt;section&gt;</code> picks up
			<code>--set-section-gap</code> (16px by default) so successive paragraphs breathe without the
			legacy <code>margin-block: 1em</code> stack. Authors who need tighter or looser rhythm tune
			the section gap once at <code>:root</code>; every section on the page follows.
		</p>
		<p>
			This is a third paragraph to make the rhythm visible. Notice how the gap between paragraphs is
			consistent without any margin on the paragraph itself — the framework's layout container owns
			the spacing.
		</p>
	</section>

	<section id="typography-emphasis">
		<h2>Inline emphasis</h2>
		<p>
			Use <strong>&lt;strong&gt;</strong> for strong importance, seriousness, or urgency — the
			framework paints it at <strong>font-weight 700</strong> which reads visibly heavier than body
			copy. Use <em>&lt;em&gt;</em> for stress emphasis on a word the reader should mentally inflect
			— the framework keeps the UA <em>italic</em> tradition. Combine when needed: a phrase like
			<strong><em>strongly emphasized</em></strong>
			reads as both important AND inflected.
		</p>
		<p>
			<small>&lt;small&gt;</small> drops the font-size for fine print, legal disclaimers, and
			metadata adjacent to body copy. <mark>&lt;mark&gt;</mark> highlights text the reader's
			attention is being drawn to — search-result hits, document annotations, or "new" indicators in
			a feed. The framework's mark chrome uses a warm tinted background that survives both light and
			dark mode without inverting.
		</p>
		<p>
			Two non-semantic decorations: <u>&lt;u&gt;</u> renders an underline (useful for misspellings,
			proper names in CJK text, or annotation rendering) — the framework distinguishes it from
			<code>&lt;a&gt;</code> via a <em>dashed</em> underline so a reader doesn't mistake a
			misspelling marker for a link. <s>&lt;s&gt;</s> renders strike-through text for content that
			is no longer accurate or relevant (NOT for edits — use <code>&lt;del&gt;</code> for those,
			§Edits).
		</p>
	</section>

	<section id="typography-edits">
		<h2>Edits — <code>&lt;ins&gt;</code> and <code>&lt;del&gt;</code></h2>
		<p>
			<code>&lt;ins&gt;</code> marks <ins>inserted text</ins> in a document revision;
			<code>&lt;del&gt;</code> marks <del>deleted text</del>. The framework tints insertions with a
			success-leaning hue (so they read as "added") and deletions with a danger- leaning hue +
			strike-through (so they read as "removed"). Both elements ship a <code>cite</code> attribute
			and a <code>datetime</code> attribute for machine-readable metadata — neither has a visual
			treatment by default (visualizing them is a consumer responsibility).
		</p>
		<p>
			A typical revision sentence reads like this:
			<del>The framework used to default to amber-500 with black text;</del>
			<ins
				>the framework now defaults to amber-700 with white text so every variant clears WCAG AA
				white-on-fill</ins
			>. Both edits live in the same paragraph; the visual tints make the change immediately
			visible.
		</p>
	</section>

	<section id="typography-code">
		<h2>
			Computer text — <code>&lt;code&gt;</code>, <code>&lt;kbd&gt;</code>,
			<code>&lt;samp&gt;</code>, <code>&lt;var&gt;</code>
		</h2>
		<p>
			Four elements for code, keyboard input, sample output, and variable placeholders. Each renders
			in a monospace face but with distinct chrome:
		</p>
		<ul>
			<li>
				<code>&lt;code&gt;</code> — inline source, e.g.
				<code>const value = useTemplateRef('dialog')</code>. The framework's tinted bg uses
				<code>color-mix(currentColor 12%, transparent)</code> so the chip adapts to any surface
				(light canvas, dark canvas, variant fill).
			</li>
			<li>
				<code>&lt;kbd&gt;</code> — keyboard input, e.g. <kbd>Ctrl</kbd> + <kbd>K</kbd>. The
				framework paints kbd as a small badge with a border + tighter line-height so it reads as
				"press this key" rather than "this is code."
			</li>
			<li>
				<code>&lt;samp&gt;</code> — sample output from a program, e.g. <samp>npm run dev</samp>.
				Same monospace as code but without the bg chip so it reads as "the program's response"
				rather than "source you'd type."
			</li>
			<li>
				<code>&lt;var&gt;</code> — a variable in a mathematical / programming expression, e.g. let
				<var>x</var> = 42. The framework keeps the UA italic styling so the variable visually
				distinguishes from constants and operators.
			</li>
		</ul>
		<p>
			A block-level code listing uses <code>&lt;pre&gt;</code> + <code>&lt;code&gt;</code> together.
			The bg + padding come from <code>&lt;pre&gt;</code>; the <code>&lt;code&gt;</code> inside
			loses its own chip chrome because the block owns the surface:
		</p>
		<pre><code>// Pseudocode — useDialog wiring
const dialog = useTemplateRef('dialog')
const open = () => dialog.value?.showModal()
const close = () => dialog.value?.close()</code></pre>
	</section>

	<section id="typography-quotations">
		<h2>Quotations</h2>
		<p>
			The inline <code>&lt;q&gt;</code> element wraps short quotations and auto-renders
			locale-appropriate quotation marks via the UA's <code>::before</code> /
			<code>::after</code> generated content. As Tim Berners-Lee said,
			<q>The Web does not just connect machines, it connects people.</q> Notice the curly quotes
			appear without markup — the framework keeps the UA behavior and adds no chrome of its own.
		</p>
		<p>A longer quotation uses the block-level <code>&lt;blockquote&gt;</code> element:</p>
		<blockquote>
			Adding manpower to a late software project makes it later. The same principle applies to
			frameworks — adding a new variant without auditing the cascade adds debt to every page that
			uses it.
		</blockquote>
		<p>
			The framework paints <code>&lt;blockquote&gt;</code> as a leading vertical bar in the variant
			color with italic body + inline-start padding. Same shape as the
			<code>article aside</code> callout (a tangential annotation inside a card) but with a
			different semantic intent: a blockquote QUOTES from another source; an inline aside is
			tangentially related.
		</p>
	</section>

	<section id="typography-meta">
		<h2>Abbreviations + machine-readable values</h2>
		<p>
			<code>&lt;abbr&gt;</code> wraps an abbreviation with an optional <code>title</code> attribute
			exposing the full term. Hover the next abbreviation:
			<abbr title="World Wide Web Consortium">W3C</abbr> publishes the HTML and CSS specifications.
			The framework adds a dotted underline so readers can see the term has an expanded meaning
			available; UA tooltips show on hover (`title=` does the work).
		</p>
		<p>
			<code>&lt;time&gt;</code> wraps a date / time with an optional machine-readable
			<code>datetime</code> attribute. Conventionally used for posts (<time datetime="2024-01-15"
				>January 15, 2024</time
			>), schedules (the meeting starts at <time datetime="14:30">2:30 PM</time>), and durations
			(the build took <time datetime="PT3M12S">3 minutes 12 seconds</time>). The framework adds
			tabular- numbers font-variant so a column of times aligns vertically.
		</p>
		<p>
			<code>&lt;data&gt;</code> wraps any value with a machine-readable <code>value</code> attribute
			— useful for product SKUs (<data value="SKU-31415">Wireless keyboard</data>), version numbers
			(<data value="2.4.0">v2.4</data>), or any other user-readable / machine-readable pair. Like
			<code>&lt;time&gt;</code>, the framework adds tabular numbers so number columns align.
		</p>
	</section>

	<section id="typography-position">
		<h2>Position adjustment — <code>&lt;sub&gt;</code> and <code>&lt;sup&gt;</code></h2>
		<p>
			<code>&lt;sub&gt;</code> renders subscript text — chemical formulas (H<sub>2</sub>O,
			CO<sub>2</sub>), mathematical indexing (<var>a</var><sub>1</sub>, <var>a</var><sub>2</sub>, …
			<var>a</var><sub>n</sub>), and the like. The framework keeps the UA position- adjustment and
			tunes the font-size so the subscript doesn't disrupt the body line- height.
		</p>
		<p>
			<code>&lt;sup&gt;</code> renders superscript text — exponents (E = mc<sup>2</sup>), ordinal
			markers (the 21<sup>st</sup> century), and footnote callouts (some claim<sup>1</sup>). Same
			line-height treatment as <code>&lt;sub&gt;</code>.
		</p>
	</section>

	<section id="typography-address">
		<h2>Address — <code>&lt;address&gt;</code></h2>
		<p>
			<code>&lt;address&gt;</code> wraps contact information for the nearest article or document
			ancestor. NOT for arbitrary postal addresses (HTML5 limits the element's meaning — a generic
			postal address in body copy is just a paragraph). The framework paints it at
			<code>--color-text-muted</code> with a small font so it reads as secondary metadata, mirroring
			the <code>&lt;hgroup&gt;</code> tagline convention.
		</p>
		<address>
			Written by Ada Lovelace.<br />
			Reach out at <a href="mailto:ada@example.com">ada@example.com</a>.<br />
			Repo at <a href="#">github.com/example/repo</a>.
		</address>
	</section>

	<section id="typography-hr">
		<h2>Thematic break — <code>&lt;hr&gt;</code></h2>
		<p>
			<code>&lt;hr&gt;</code> represents a thematic break between paragraph-level pieces of content
			— a scene change in a narrative, a transition from one topic to another in a reference
			document. The framework paints a 1px divider line that follows the
			<code>--color-border</code> token so theme switching retunes it automatically.
		</p>
		<hr />
		<p>
			Notice how the rule above sits in the document flow with consistent vertical air above and
			below. Reach for <code>&lt;hr&gt;</code> when the change in topic is significant enough to
			warrant a horizontal break; for tighter visual separation between adjacent paragraphs, the
			section gap rhythm is usually sufficient.
		</p>
	</section>
</template>
