<script lang="ts" setup>
/**
 * AnchorPage — the canonical reference for the `<a>` element baseline.
 *
 * API surface coverage (Phase 1 audit):
 *   - Bare element baseline (elements/_a.scss) — inline body-copy link,
 *     `--color-primary` text + underline, currentColor on hover-darken
 *   - 7 variants — primary, secondary, tertiary, success, warning, danger, information
 *   - 3 sizes — bare-inline / .small / .large
 *   - 3 styles — bare (inline), .subtle (Bootstrap tinted-bg button), .filled (saturated solid button)
 *   - Modifier-aware padding — `.filled` and `.subtle` opt into button-shaped padding
 *     + border-radius; bare stays inline. Text-decoration cascade: bare + .subtle keep
 *     the underline; .filled drops it (the fill carries the affordance).
 *   - 6 interactive states — :hover (80% color + 20% black), :active / .active
 *     (65% color + 35% black), :focus-visible (ring via --set-a-focus-box-shadow),
 *     [aria-disabled='true'] / .disabled (opacity + not-allowed + pointer-events: none),
 *     :visited (reuses --set-a-color so a primary link doesn't go UA-purple)
 *   - §6.1 anchor-context resets — bare <a> in `body > header` / `> footer` /
 *     `> nav menu > li` / `> aside menu > li` flips to currentColor + no underline
 *     so navigation commands don't read as body-copy hyperlinks. Live-demo via
 *     scoped <article><header>/<footer> + <nav><menu> compositions on this page.
 *   - HTML attribute pass-through — `target="_blank"`, `download`, `rel="…"`
 *     don't carry special framework chrome; documented for completeness.
 *   - Reduced-motion respect (every transition paired via `@include transition()`)
 *   - 13 --set-a-* tokens declared on the bare element
 *
 * Cross-references:
 *   - ButtonPage §button-link demonstrates `<a class="primary filled">` opting into
 *     button chrome. AnchorPage expands that to all 7 variants × all 3 styles.
 *   - HeaderPage / FooterPage / NavPage will cover the §6.1 context resets in their
 *     own host-component contexts.
 */
import { ref, watch } from 'vue'

import {
	ANCHOR_SNIPPET_ATTRIBUTES as snippetAttributes,
	ANCHOR_SNIPPET_BARE as snippetBare,
	ANCHOR_SNIPPET_CONTEXTS as snippetContexts,
	ANCHOR_SNIPPET_FLAT as snippetFlat,
	ANCHOR_SNIPPET_FLUSH as snippetFlush,
	ANCHOR_SNIPPET_REDUCED_MOTION as snippetReducedMotion,
	ANCHOR_SNIPPET_SIZES as snippetSizes,
	ANCHOR_SNIPPET_STATES as snippetStates,
	ANCHOR_SNIPPET_STYLES as snippetStyles,
	ANCHOR_SNIPPET_VARIANTS as snippetVariants,
	ANCHOR_VISITED_COUNTER_KEY as VISITED_COUNTER_KEY,
	VARIANTS as variants,
} from '../constants.js'

// Live :visited demo wires a counter so the reader can see the visited-color
// reset stays the variant color (no UA purple). Anchors with this href become
// "visited" the moment the page loads with the matching hash; the counter
// persists across reloads via localStorage so the visited reload-test is
// observable (without persistence the count would reset to 0 every reload,
// defeating the "reload to see :visited" instruction).
const visitedCounter = ref(
	typeof window === 'undefined' ? 0 : Number(window.localStorage.getItem(VISITED_COUNTER_KEY) ?? 0),
)
watch(visitedCounter, (n) => {
	if (typeof window !== 'undefined') window.localStorage.setItem(VISITED_COUNTER_KEY, String(n))
})

</script>

<template>
	<section id="anchor-intro">
		<hgroup>
			<h1>Anchor</h1>
			<p>
				The hyperlink primitive. Bare <code>&lt;a&gt;</code> reads as an inline body-copy link;
				modifier classes opt into button-shaped chrome; host context (page header, footer, nav rail,
				aside TOC) overrides the bare link affordance so navigation commands stay quiet. Every
				variant cascade behaves identically to the button — the two elements share their modifier
				surface — but the anchor adds <code>:visited</code> handling and an inline / button-chrome
				split that the button doesn't need.
			</p>
		</hgroup>
		<p>
			Every demo below is real working markup. The framework's anchor partial declares 13
			<code>--set-a-*</code> tokens; consumers retune at <code>:root</code> to recolor every link in
			the app or per-host to scope. Zero Tailwind utilities paint the link chrome on this page —
			every underline, padding, and ring comes from the framework.
		</p>
	</section>

	<section id="anchor-bare">
		<h2>Bare anchor</h2>
		<p>
			Zero-class default: an inline link painted with <code>--color-primary</code> text and an
			underline. Hover darkens the color by 20%; <code>:focus-visible</code> rings via the
			framework's focus chain; <code>:visited</code> reuses the link color so a primary link never
			degrades to UA purple. The anchor's box collapses to its inline text — no padding, no
			background, no border — unless a style modifier opts in.
		</p>
		<p>
			Inline reading flow: the framework's
			<a href="#anchor-bare">anchor documentation</a> is right here, painted with the bare-anchor
			cascade. Hover me to see the darkening transition.
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetBare }}</code></pre>
		</details>
	</section>

	<section id="anchor-variants">
		<h2>Variants</h2>
		<p>
			Seven semantic variants — same vocabulary as the button. Each sets
			<code>--set-variant-on-canvas-color</code> which the anchor's color cascade resolves through.
			Bare anchors (no style modifier) paint the variant's <em>canvas-safe</em> shade as text color,
			keeping the underline.
		</p>
		<aside class="information">
			<strong>Why a separate <code>on-canvas</code> tier?</strong> The saturated <code>-600</code>
			variant step that reads as a solid fill (<code>.filled</code>) doesn't have enough luminance
			contrast against the body canvas when used as inline TEXT — measured at 2.13–4.02 against a
			white canvas (warning / success / information all failed AA) and ~3–4 against a slate-950
			canvas (every variant). The framework adds a dedicated
			<code>--color-{variant}-on-canvas</code> theme token, derived per-mode via
			<code>color-mix(in oklab, var(--color-{variant}) {70|80}%, var(--color-text))</code>, so the
			shade auto-inverts polarity between light and dark and clears AA on both canvases.
			<ul>
				<li>
					<strong>Naming</strong> follows Material Design's <code>on-X</code> convention — the
					suffix names the SURFACE the color is safe ON. Sibling to the
					<code>bg-subtle / text-emphasis / border-subtle</code> triplet that drives
					<code>.subtle</code> chrome.
				</li>
				<li>
					<strong>Symmetry</strong> with the variant cascade: each <code>.{variant}</code> class now
					sets <code>--set-variant-on-canvas-color</code> alongside its FILLED and SUBTLE token
					trios — a third "treatment" tier explicitly for unboxed variant text.
				</li>
				<li>
					<strong>Decoupling</strong> from <code>text-emphasis</code>: same numeric formula today,
					separate semantic API forever. Canvas-context can retune independently of
					bg-subtle-context if future themes need divergent shades.
				</li>
			</ul>
		</aside>
		<div class="cluster">
			<a href="#anchor-variants">Default</a>
			<a v-for="v in variants" :key="v" href="#anchor-variants" :class="v">
				{{ v[0].toUpperCase() + v.slice(1) }}
			</a>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="anchor-sizes">
		<h2>Sizes</h2>
		<p>
			Inline anchors stay at the parent's font-size by default. Adding
			<code>.small</code> or <code>.large</code> overrides via the same
			<code>--set-size-font-size</code> token the button uses. When the anchor also has a style
			modifier (<code>.subtle</code> / <code>.filled</code>), the size modifier additionally
			cascades into padding-inline / padding-block / border-radius so the button-shaped chrome
			scales coherently.
		</p>
		<div class="stack">
			<div class="cluster">
				<a href="#anchor-sizes" class="primary small">Small inline</a>
				<a href="#anchor-sizes" class="primary">Default inline</a>
				<a href="#anchor-sizes" class="primary large">Large inline</a>
			</div>
			<div class="cluster">
				<a href="#anchor-sizes" class="primary subtle small">Subtle · small</a>
				<a href="#anchor-sizes" class="primary subtle">Subtle · default</a>
				<a href="#anchor-sizes" class="primary subtle large">Subtle · large</a>
			</div>
			<div class="cluster">
				<a href="#anchor-sizes" class="primary filled small">Filled · small</a>
				<a href="#anchor-sizes" class="primary filled">Filled · default</a>
				<a href="#anchor-sizes" class="primary filled large">Filled · large</a>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="anchor-styles">
		<h2>Styles</h2>
		<p>
			Three fill treatments — same cascade as the button — but the anchor differentiates them on
			text-decoration too. <strong>Bare</strong> is inline (no padding, underline preserved).
			<code>.subtle</code> opts into button-shaped padding + tinted background AND keeps the
			underline so the link affordance stays clear in mixed flow. <code>.filled</code> opts into the
			same padding AND drops the underline — the saturated fill is enough signal on its own and an
			underlined fill reads as visual noise.
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="v" class="cluster">
				<a href="#anchor-styles" :class="v">{{ v }} (bare inline)</a>
				<a href="#anchor-styles" :class="`${v} subtle`">{{ v }} · subtle</a>
				<a href="#anchor-styles" :class="`${v} filled`">{{ v }} · filled</a>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStyles }}</code></pre>
		</details>
	</section>

	<section id="anchor-flat">
		<h2>Flat — quiet inline link</h2>
		<p>
			<code>.flat</code> drops the underline at rest and restores it on hover (paired with a 4%
			backdrop). Use for inline references in editorial copy where the underline introduces visual
			noise but the affordance should still be obvious on engagement. Variant colour cascades
			through unchanged.
		</p>
		<div class="stack">
			<p>
				Visit the
				<a class="flat" href="#anchor-flat">framework documentation</a> for setup instructions and
				see the <a class="success flat" href="#anchor-flat">latest release notes</a> for migration
				details. Cross-reference the
				<a class="information flat" href="#anchor-flat">community channels</a> if you hit a snag,
				and report any <a class="danger flat" href="#anchor-flat">production incidents</a> through
				the on-call rotation.
			</p>
			<p>
				Every variant ({{ variants.length }} of them) renders flat in the cluster below so the
				per-variant text colour is legible side-by-side.
			</p>
			<div class="cluster">
				<a v-for="v in variants" :key="v" class="flat" :class="v" href="#anchor-flat">
					{{ v }} flat
				</a>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFlat }}</code></pre>
		</details>
	</section>

	<section id="anchor-flush">
		<h2>Flush — tile-as-link</h2>
		<p>
			<code>.flush</code> fuses the anchor INTO its host: <code>display: block</code>, fills both
			axes, inherits the host's <code>border-radius</code>, drops the underline + the link-blue
			identity (color inherits from the host). The whole tile becomes clickable; the host owns the
			visual chrome. Hover any tile to see the 4% backdrop affordance reveal — the trailing arrow
			signals the navigation target.
		</p>
		<p>Three neutral tiles, each entirely clickable end-to-end:</p>
		<div class="cluster gap-4">
			<article class="frame showcase-tile">
				<a class="flush showcase-tile-link" href="#anchor-flush">
					<header class="flex justify-between items-baseline">
						<strong>Documentation</strong>
						<small aria-hidden="true">→</small>
					</header>
					<small class="showcase-muted">Setup, cascade, taxonomy.</small>
				</a>
			</article>
			<article class="frame showcase-tile">
				<a class="flush showcase-tile-link" href="#anchor-flush">
					<header class="flex justify-between items-baseline">
						<strong>Showcase</strong>
						<small aria-hidden="true">→</small>
					</header>
					<small class="showcase-muted">Every element, in context.</small>
				</a>
			</article>
			<article class="frame showcase-tile">
				<a class="flush showcase-tile-link" href="#anchor-flush">
					<header class="flex justify-between items-baseline">
						<strong>API reference</strong>
						<small aria-hidden="true">→</small>
					</header>
					<small class="showcase-muted">Composables, factories, types.</small>
				</a>
			</article>
		</div>
		<p>
			Variant cascade still flows through — an
			<code>&lt;article class="primary filled"&gt;</code> fills the tile in primary blue and the
			anchor's <code>color: inherit</code> reads white against it. Hover any tile to confirm the
			click area covers the entire surface:
		</p>
		<div class="cluster gap-4">
			<article
				v-for="v in ['primary', 'success', 'warning', 'danger']"
				:key="v"
				:class="`${v} filled frame showcase-tile`"
			>
				<a class="flush showcase-tile-link" href="#anchor-flush">
					<header class="flex justify-between items-baseline">
						<strong class="capitalize">{{ v }} tile</strong>
						<small aria-hidden="true">→</small>
					</header>
					<small>Whole card is the link.</small>
				</a>
			</article>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFlush }}</code></pre>
		</details>
	</section>

	<section id="anchor-states">
		<h2>States</h2>
		<p>
			Hover and <code>:focus-visible</code> paint without classes — interact with any anchor on this
			page to see them. <code>.active</code> mimics the depressed state without requiring an actual
			click. <code>.disabled</code> and <code>aria-disabled="true"</code> are equivalent — both dim
			the anchor, change the cursor to <code>not-allowed</code>, and disable pointer events.
			<code>:visited</code> intentionally reuses <code>--set-a-color</code> so a primary link
			doesn't degrade to UA purple after click; the browser's history bit is preserved, the styling
			stays under framework control.
		</p>
		<div class="cluster">
			<a href="#anchor-states" class="primary">Default · hover me</a>
			<a href="#anchor-states" class="primary active">.active</a>
			<a href="#anchor-states" class="primary disabled">.disabled</a>
			<a href="#anchor-states" class="primary" aria-disabled="true">aria-disabled</a>
		</div>
		<p>
			<small>
				Visited demo:
				<a href="#anchor-states-visited-target" class="success" @click="visitedCounter++">
					click this link
				</a>
				and then reload the page — it stays success-green, not UA purple. The counter persists
				across reloads via <code>localStorage</code>, so you can refresh and watch the visited state
				survive. (Click count: {{ visitedCounter }}.)
			</small>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStates }}</code></pre>
		</details>
	</section>

	<section id="anchor-cascade">
		<h2>The orthogonal cascade</h2>
		<p>
			Variant × size × style compose independently — the same orthogonality the button surfaces, now
			applied to inline + button-chrome link contexts. The matrix below is deliberately exhaustive:
			every variant rendered inline, subtle, and filled, at every size.
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="v" class="cluster">
				<a href="#anchor-cascade" :class="`${v} small`">{{ v }} · small</a>
				<a href="#anchor-cascade" :class="v">{{ v }}</a>
				<a href="#anchor-cascade" :class="`${v} large`">{{ v }} · large</a>
				<a href="#anchor-cascade" :class="`${v} small subtle`">small · subtle</a>
				<a href="#anchor-cascade" :class="`${v} subtle`">default · subtle</a>
				<a href="#anchor-cascade" :class="`${v} large subtle`">large · subtle</a>
				<a href="#anchor-cascade" :class="`${v} small filled`">small · filled</a>
				<a href="#anchor-cascade" :class="`${v} filled`">default · filled</a>
				<a href="#anchor-cascade" :class="`${v} large filled`">large · filled</a>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="anchor-contexts">
		<h2>The anchor-context contract (§6.1)</h2>
		<p>
			The bare-anchor baseline (primary text + underline) reads as a link inside body copy. That
			same chrome is wrong when an anchor is used as a NAVIGATION COMMAND — the page app bar's brand
			link, a sidebar menu row, an in-page TOC waypoint. The framework's components reset anchors in
			those contexts to <code>currentColor</code> + no underline so the navigation band reads as a
			unified surface. Hover tints toward primary so the link affordance still survives.
		</p>
		<p>
			Four reset contexts are shipped, all via <code>:where()</code> wrappers so a single class on
			the anchor opts back into the bare link look without <code>!important</code>:
		</p>
		<dl>
			<dt><code>body:has(main) &gt; header :where(a)</code></dt>
			<dd>Page app-bar brand + nav links — currentColor, no underline, hover tints to primary.</dd>

			<dt><code>body:has(main) &gt; footer :where(a)</code></dt>
			<dd>Page footer credits + secondary nav — same recipe as header.</dd>

			<dt><code>body:has(main) &gt; nav menu &gt; li &gt; :where(a, button)</code></dt>
			<dd>
				Sidebar nav rows — full-width, start-aligned, currentColor, hover bg tint,
				<code>aria-current="page"</code> paints a subtle-primary band.
			</dd>

			<dt><code>body:has(main) &gt; aside menu &gt; li &gt; :where(a, button)</code></dt>
			<dd>
				Aside TOC rows — muted text, leading-bar accent on
				<code>aria-current="location"</code>.
			</dd>
		</dl>
		<p>
			<small>
				These resets are <em>live in the showcase chrome you're reading right now</em> — the brand
				link in the page header, the sidebar route links, and the TOC entries on the right are all
				governed by the rules above. Inspect any of them.
			</small>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetContexts }}</code></pre>
		</details>
	</section>

	<section id="anchor-attributes">
		<h2>Attribute pass-through</h2>
		<p>
			Standard HTML attributes — <code>target</code>, <code>download</code>, <code>rel</code>,
			<code>hreflang</code>, <code>ping</code>, <code>type</code> — pass through unchanged. The
			framework adds no decoration to external links, downloads, or mailto/tel links; consumers can
			add per-site affordances via Tailwind utilities + the <code>--set-icon-external</code> glyph
			or per-protocol classes.
		</p>
		<div class="cluster">
			<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="primary">
				External link
				<i
					class="icon"
					aria-hidden="true"
					style="--icon: var(--set-icon-external); margin-inline-start: 0.25em"
				></i>
			</a>
			<a href="/document.pdf" download="report.pdf" class="primary">Download report (PDF)</a>
			<a href="mailto:hello@example.com" class="primary">hello@example.com</a>
			<a href="tel:+1234567890" class="primary">+1 (234) 567-890</a>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetAttributes }}</code></pre>
		</details>
	</section>

	<section id="anchor-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Every anchor transition on this page — color fade on hover, ring fade on focus, opacity on
			disabled — is paired with <code>prefers-reduced-motion: reduce</code> through the framework's
			<code>transition()</code> mixin. Toggle your OS reduced-motion preference and the same anchors
			will switch states instantly with zero animation.
		</p>
		<div class="cluster">
			<a href="#anchor-reduced-motion" class="primary">Hover me · slow</a>
			<a href="#anchor-reduced-motion" class="success subtle">And me</a>
			<a href="#anchor-reduced-motion" class="danger filled">And me</a>
		</div>
		<details>
			<summary><small>The mixin that enforces this</small></summary>
			<pre><code>{{ snippetReducedMotion }}</code></pre>
		</details>
	</section>

	<section id="anchor-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (or any <code>forced-colors: active</code> environment), the UA
			forces a small palette of system colors. The framework's anchor doesn't override the UA's
			<code>LinkText</code> system color — the link affordance survives natively. The variant-tinted
			background on <code>.filled</code> anchors collapses to <code>Canvas</code> +
			<code>CanvasText</code> per the same rules that govern the
			<code>&lt;button&gt;</code> forced-colors fallback.
		</p>
		<div class="cluster">
			<a href="#anchor-forced-colors" class="primary">Primary link · verify in HC mode</a>
			<a href="#anchor-forced-colors" class="primary filled">Primary filled in HC</a>
			<a href="#anchor-forced-colors" class="primary disabled">Disabled in HC</a>
		</div>
	</section>

	<section id="anchor-tokens">
		<h2>Tokens</h2>
		<p>
			Every visible value on an anchor flows through a <code>--set-a-*</code> token. Pin one at
			<code>:root</code> to retune every anchor in your app; pin one on a single host to scope. The
			defaults make a bare anchor "just look right" without consumer overrides.
		</p>
		<dl>
			<dt><code>--set-a-color</code></dt>
			<dd>Text color. Resolves <code>style → variant → --color-primary</code>.</dd>

			<dt><code>--set-a-background-color</code></dt>
			<dd>Surface fill. Resolves <code>style → transparent</code>.</dd>

			<dt><code>--set-a-border-color</code></dt>
			<dd>Border tint. Resolves <code>style → transparent</code>.</dd>

			<dt><code>--set-a-border-width</code></dt>
			<dd>Border thickness. Resolves <code>style → 0</code>.</dd>

			<dt><code>--set-a-border-radius</code></dt>
			<dd>
				Corner roundness. Resolves <code>size → 0</code> for bare; opts to
				<code>--radius-md</code> when a style modifier is present.
			</dd>

			<dt><code>--set-a-padding-inline</code></dt>
			<dd>
				Horizontal padding. <code>0</code> for bare; <code>spacing × 3</code> for
				<code>.subtle</code>/<code>.filled</code>.
			</dd>

			<dt><code>--set-a-padding-block</code></dt>
			<dd>
				Vertical padding. <code>0</code> for bare; <code>spacing × 1.5</code> for
				<code>.subtle</code>/<code>.filled</code>.
			</dd>

			<dt><code>--set-a-font-size</code></dt>
			<dd>Text size. Resolves <code>size → 1em</code>.</dd>

			<dt><code>--set-a-text-decoration</code></dt>
			<dd>
				Underline. <code>underline</code> for bare/<code>.subtle</code>; <code>none</code> for
				<code>.filled</code>.
			</dd>

			<dt><code>--set-a-transition-duration</code></dt>
			<dd>Animated-property duration. Defaults to <code>--set-transition-duration</code>.</dd>

			<dt><code>--set-a-cursor</code></dt>
			<dd>Pointer cursor. Defaults to <code>pointer</code>.</dd>

			<dt><code>--set-a-disabled-opacity</code></dt>
			<dd>Dimming applied to disabled anchors. Defaults to <code>0.5</code>.</dd>

			<dt><code>--set-a-focus-box-shadow</code></dt>
			<dd>
				The focus-visible ring. Computed from <code>--set-variant-background-color</code> mixed at
				<code>--set-focus-box-shadow-opacity</code> against transparent, sized by
				<code>--set-focus-box-shadow-width</code>.
			</dd>
		</dl>
	</section>
</template>
