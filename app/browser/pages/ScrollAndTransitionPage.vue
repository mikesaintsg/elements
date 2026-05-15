<script lang="ts" setup>
/**
 * ScrollAndTransitionPage — two narrow surface partials that polish
 * cross-element chrome: the UA scrollbar surface and the
 * `::view-transition-*` cross-fade surface.
 *
 * `surfaces/_scrollbar.scss` ships three CSS properties (the standard
 * scrollbar-color / -width / -gutter family that's replacing the
 * Chromium-only `::-webkit-scrollbar*` family) and applies them at
 * `:root` so every scrollable element in the app inherits the
 * framework's thin / muted / stable-gutter default without per-host
 * declarations.
 *
 * `surfaces/_view-transition.scss` ships the `::view-transition-old
 * (root)` and `::view-transition-new(root)` chrome that runs the
 * cross-fade animation the UA generates when `document.startView
 * Transition()` fires (or when `@view-transition { navigation: auto
 * }` is declared and the browser supports cross-document
 * transitions). The framework tokens duration + timing-function so
 * a `:root` retune flows through every transition the consumer
 * triggers, with `prefers-reduced-motion` collapsing to a 1 ms cut.
 *
 * API surface coverage:
 *   1. Scrollbar tokens — `--set-scrollbar-{thumb-color,track-color,
 *      width,gutter}` applied at `:root`.
 *   2. Per-element scrollbar override (per-host tighten / loosen).
 *   3. `scrollbar-gutter: stable` reserves space so layout doesn't
 *      shift between overflow / non-overflow states.
 *   4. View-transition tokens — `--set-view-transition-{duration,
 *      timing-function}`.
 *   5. `document.startViewTransition()` consumer trigger — live demo.
 *   6. Per-element `view-transition-name` for individual element
 *      morphing.
 *   7. Reduced-motion collapse to 1 ms.
 *
 * Cross-references:
 *   - [SectioningPage § Main scroller](#/sectioning) — `<main>` is
 *     the body-shell scroller; the scrollbar surface is the chrome
 *     that paints inside it.
 *   - [PopoverSurfacesPage § Anchor positioning](#/popover-surfaces)
 *     — long-content popovers scroll inside the panel via the same
 *     scrollbar tokens.
 */
import { ref } from 'vue'

// View-transition demo state — alternate two snapshots so the user
// can repeatedly trigger the cross-fade. Each click swaps the
// payload; `document.startViewTransition` wraps the DOM mutation.
import { SCROLL_TRANSITION_SNAPSHOTS as snapshots } from '../constants.js'

const snapshotIndex = ref(0)
const current = () => snapshots[snapshotIndex.value]

// Scrollbar gutter demo — toggle long content on / off so the user can
// observe layout shift behavior between `stable` (no shift) and
// `auto` (shift when overflow kicks in).
const gutterLong = ref(false)

const next = (): void => {
	const advance = (): void => {
		snapshotIndex.value = (snapshotIndex.value + 1) % snapshots.length
	}
	// Feature-detect: Safari + Firefox haven't shipped same-document
	// view-transitions universally yet. If unavailable, just swap.
	const hasViewTransition = typeof document.startViewTransition === 'function'
	if (hasViewTransition) {
		document.startViewTransition(advance)
	} else {
		advance()
	}
}
</script>

<template>
	<section id="scroll-transition-intro">
		<hgroup>
			<h1>Scroll &amp; transition</h1>
			<p>
				Two narrow surface partials polish cross-element chrome that the consumer typically wires
				per-page: the UA scrollbar's thumb / track / gutter, and the cross-fade animation the
				browser generates for <code>document.startViewTransition()</code> and
				<code>@view-transition</code>. The framework applies sensible defaults at
				<code>:root</code> so neither needs per-host declarations.
			</p>
		</hgroup>
	</section>

	<section id="scroll-transition-scrollbar">
		<h2>
			1. Scrollbar — <code>scrollbar-color</code> / <code>-width</code> / <code>-gutter</code>
		</h2>
		<p>
			The standard CSS scrollbar properties replace the Chromium-only
			<code>::-webkit-scrollbar*</code> family. Browser support: Chrome 121+ / Firefox 64+ / Safari
			18.2+ for color + width; Chrome 94+ / Firefox 97+ / Safari 14.1+ for gutter. Safari &lt; 18.2
			keeps the iOS overlay scrollbar — acceptable fallback.
		</p>
		<p>Defaults (declared on <code>:root</code> in <code>surfaces/_scrollbar.scss</code>):</p>
		<ul>
			<li>
				<strong><code>scrollbar-width: thin</code></strong> — the narrower of two UA sizes.
			</li>
			<li>
				<strong><code>scrollbar-color: var(--color-border-strong) transparent</code></strong>
				— muted thumb on transparent track. Tracks the active theme via
				<code>--color-border-strong</code> (slate-300 in light, slate-600 in dark).
			</li>
			<li>
				<strong><code>scrollbar-gutter: stable</code></strong> — reserves the gutter even when
				content fits without overflow, so the layout doesn't shift between scrollable / not-
				scrollable states.
			</li>
		</ul>

		<h3><code>scrollbar-width</code> — three sizes side by side</h3>
		<p>
			<strong>Scroll inside each box to see the difference.</strong> On overlay-scrollbar platforms
			(macOS, iOS) the thin / auto distinction collapses while the pointer is idle; the moment you
			scroll, all three render distinctly. Windows + Linux Chrome paints all three at idle as well.
		</p>
		<div class="grid grid-cols-3 gap-4">
			<div class="showcase-scroll-stage">
				<p class="mt-0 mb-2">
					<small><code>thin</code> (default)</small>
				</p>
				<p>Narrower UA scrollbar. Framework default.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
			</div>
			<div class="showcase-scroll-stage" style="--set-scrollbar-width: auto">
				<p class="mt-0 mb-2">
					<small><code>auto</code> (OS default size)</small>
				</p>
				<p>Wider UA scrollbar — matches the host OS default.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
			</div>
			<div class="showcase-scroll-stage" style="--set-scrollbar-width: none">
				<p class="mt-0 mb-2">
					<small><code>none</code> (hidden)</small>
				</p>
				<p>Scrollbar fully hidden — content still scrolls. Useful for tab strips and chip rows.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
				<p>Lorem ipsum. Lorem ipsum. Lorem ipsum. Lorem ipsum.</p>
			</div>
		</div>

		<h3><code>scrollbar-color</code> — variant-tinted thumbs</h3>
		<p>
			Override <code>--set-scrollbar-thumb-color</code> per-host to tint the scrollbar with any
			colour token — variant identity, brand colour, or any custom value. Each scrollable below sets
			its thumb to a different variant; <strong>scroll the box to see the colour</strong>.
		</p>
		<div class="grid grid-cols-2 gap-4">
			<div
				v-for="v in ['primary', 'success', 'warning', 'danger'] as const"
				:key="v"
				class="showcase-scroll-stage"
				style="--showcase-scroll-stage-height: 8rem"
				:style="`--set-scrollbar-thumb-color: var(--color-${v})`"
			>
				<p class="mt-0 mb-2">
					<small>
						<code>--set-scrollbar-thumb-color: var(--color-{{ v }})</code>
					</small>
				</p>
				<p>Content. Content. Content. Content.</p>
				<p>Content. Content. Content. Content.</p>
				<p>Content. Content. Content. Content.</p>
				<p>Content. Content. Content. Content.</p>
				<p>Content. Content. Content. Content.</p>
			</div>
		</div>

		<h3><code>scrollbar-gutter</code> — reserve space, no layout shift</h3>
		<p>
			<code>stable</code> reserves the scrollbar gutter even when content doesn't currently
			overflow. The text below stays in the same horizontal position whether or not the box is
			scrollable — useful for cards / panels where content length varies between states and a
			snap-to-wider layout would look broken. Toggle the long-content state to see the difference
			between the two columns:
		</p>
		<div class="flex gap-2 mb-4">
			<button type="button" @click="gutterLong = !gutterLong">
				{{ gutterLong ? 'Show short content' : 'Show long content (triggers overflow)' }}
			</button>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div class="showcase-scroll-stage-conditional" style="--showcase-scroll-stage-height: 12rem">
				<p class="mt-0 mb-2">
					<small><code>stable</code> (default) — text stays put</small>
				</p>
				<p>Short content.</p>
				<template v-if="gutterLong">
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
				</template>
			</div>
			<div
				class="showcase-scroll-stage-conditional"
				style="--showcase-scroll-stage-height: 12rem; --set-scrollbar-gutter: auto"
			>
				<p class="mt-0 mb-2">
					<small><code>auto</code> — text snaps when scrollbar appears</small>
				</p>
				<p>Short content.</p>
				<template v-if="gutterLong">
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
					<p>Long content. Long content. Long content. Long content.</p>
				</template>
			</div>
		</div>

		<aside role="status" class="information mt-4" data-alert-open>
			<p>
				<strong>Why universal application, not just <code>:root</code>?</strong>
				Per CSS Scrollbars Module Level 1, <code>scrollbar-color</code> IS inherited but
				<code>scrollbar-width</code> + <code>scrollbar-gutter</code> are NOT. Declaring the trio
				only on <code>:root</code> styled the root <code>&lt;html&gt;</code> scrollbar and left
				every nested scroll container at the UA default. Plus <code>var()</code>
				substitution resolves at the declaring element, so a descendant overriding
				<code>--set-scrollbar-thumb-color</code> never re-resolved the inherited
				<code>scrollbar-color</code>. The surface applies the trio on
				<code>*, *::before, *::after</code> so every element re-resolves its own
				<code>var()</code> chain AND the non-inherited width + gutter apply at every scroll
				container.
			</p>
		</aside>
	</section>

	<section id="scroll-transition-view-transition">
		<h2>2. View transition — <code>::view-transition-old(root)</code> / <code>-new(root)</code></h2>
		<p>
			When the consumer wraps a DOM mutation in <code>document.startViewTransition(callback)</code>,
			the browser snapshots the current rendering, runs the mutation, snapshots again, and
			cross-fades between the two snapshots. The framework's surface tokens the duration +
			timing-function on the (root) snapshot pair so a <code>:root</code> retune flows through every
			transition the consumer triggers — no per-call <code>animation-duration</code>
			boilerplate.
		</p>
		<p>
			Browser support: Chrome 111+ / Edge 111+ (same-document), Chrome 126+ (cross-document via
			<code>@view-transition { navigation: auto }</code>), Safari 18+, Firefox not yet (gracefully
			degrades — the surface is inert when the UA doesn't run a transition).
		</p>

		<h3>Live demo — click to morph between snapshots</h3>
		<p>
			Each click swaps the title / body / variant of the card below. The DOM mutation is wrapped in
			<code>document.startViewTransition</code>, so the browser cross-fades the entire root snapshot
			— title, body, and the variant-tinted card surface all morph in lockstep.
		</p>
		<button type="button" @click="next">Show next snapshot</button>
		<article :class="['filled', current().variant, 'mt-4']">
			<header>
				<h3>{{ current().title }}</h3>
			</header>
			<p>{{ current().body }}</p>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const next = () =&gt; {
  const advance = () =&gt; { /* mutate DOM */ };
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(advance);
  } else {
    advance(); // Firefox + Safari &lt; 18 fall through.
  }
};</code></pre>
		</details>
	</section>

	<section id="scroll-transition-named">
		<h2>3. Per-element <code>view-transition-name</code></h2>
		<p>
			Setting <code>view-transition-name: pickAName</code> on an element makes the UA snapshot that
			element separately from the root and animate the pair via
			<code>::view-transition-old(pickAName)</code> / <code>-new(pickAName)</code>. Useful for
			shared-element transitions (a card morphing into its detail view, a thumbnail growing into a
			hero image, a chip animating into a filter pill).
		</p>
		<p>
			Per-name overrides live at the call site — the framework's surface only paints the default
			(<code>(root)</code>) chrome. Authors composing a shared-element transition declare their own
			keyframes / durations per name.
		</p>
		<pre><code>/* per-element morph */
.hero-card {
  view-transition-name: hero-card;
}

::view-transition-old(hero-card),
::view-transition-new(hero-card) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}</code></pre>
	</section>

	<section id="scroll-transition-reduced-motion">
		<h2>Reduced motion</h2>
		<p>Both surfaces respect <code>prefers-reduced-motion: reduce</code>:</p>
		<ul>
			<li>
				<strong>Scrollbar</strong> — no animations declared, so no override needed. The native
				scrollbar's hover / focus chrome is owned by the UA and follows the user's system
				preferences.
			</li>
			<li>
				<strong>View transition</strong> — the surface collapses <code>animation-duration</code> to
				<code>1 ms</code> rather than disabling the animation outright. Skipping the animation
				leaves the snapshot suspended in some engines; a 1 ms duration finishes synchronously and
				produces the right instant-cut effect.
			</li>
		</ul>
	</section>

	<section id="scroll-transition-forced-colors">
		<h2>Forced colors</h2>
		<p>In Windows High Contrast (<code>forced-colors: active</code>):</p>
		<ul>
			<li>
				<strong>Scrollbar</strong> — UA paints with system colours (<code>ButtonText</code> thumb,
				<code>Canvas</code> track) regardless of the framework's tokens. The framework's chrome
				degrades cleanly to the OS scrollbar.
			</li>
			<li>
				<strong>View transition</strong> — animations still run; colour-based custom keyframes (if
				any are declared on a named pair) flatten to system palette via the UA's forced-colors
				flattening pass.
			</li>
		</ul>
	</section>

	<section id="scroll-transition-tokens">
		<h2>Tokens</h2>

		<h3>Scrollbar</h3>
		<dl>
			<dt><code>--set-scrollbar-thumb-color</code></dt>
			<dd>
				Thumb (the draggable handle) colour. Default <code>var(--color-border-strong)</code> —
				muted, theme-aware.
			</dd>
			<dt><code>--set-scrollbar-track-color</code></dt>
			<dd>
				Track (the rail behind the thumb) colour. Default <code>transparent</code> so the scrollbar
				reads as floating on the underlying surface.
			</dd>
			<dt><code>--set-scrollbar-width</code></dt>
			<dd>
				Scrollbar size keyword. <code>auto</code> | <code>thin</code> | <code>none</code>. Default
				<code>thin</code>.
			</dd>
			<dt><code>--set-scrollbar-gutter</code></dt>
			<dd>
				Gutter reservation. <code>auto</code> | <code>stable</code> |
				<code>stable both-edges</code>. Default <code>stable</code> so layout doesn't shift on
				overflow transitions.
			</dd>
		</dl>

		<h3>View transition</h3>
		<dl>
			<dt><code>--set-view-transition-duration</code></dt>
			<dd>
				Cross-fade duration on the <code>(root)</code> pair. Default
				<code>--set-transition-duration</code> (150 ms). Reduced-motion collapses to
				<code>1 ms</code>.
			</dd>
			<dt><code>--set-view-transition-timing-function</code></dt>
			<dd>Cross-fade easing. Default <code>ease</code>.</dd>
		</dl>
	</section>
</template>

<style scoped>
/* Per-element view-transition-name on the article in §2 so the whole
   card morphs as a coordinated snapshot pair when `document.start
   ViewTransition()` fires. Without a name the UA still snapshots the
   entire (root), but a name lets the consumer override
   `::view-transition-old(scroll-transition-card)` per-instance if a
   future page wants a custom keyframe on this specific element. */
article {
	view-transition-name: scroll-transition-card;
}
</style>
