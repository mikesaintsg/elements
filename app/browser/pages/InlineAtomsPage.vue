<script lang="ts" setup>
/**
 * InlineAtomsPage — the five class-root inline atoms the framework
 * ships for patterns with no semantic HTML home: `.badge`, `.dot`,
 * `.tag`, `.spinner`, `.skeleton`. Each is a `<span>` / `<div>` with
 * a class root and a `--set-{atom}-*` token surface; variants flow
 * through the framework's variant cascade so a `.badge.primary` reads
 * as primary, a `.tag.success` reads as success, etc.
 *
 * API surface coverage (from Phase 1 audit of
 * `src/styles/components/{_badge,_dot,_tag,_spinner,_skeleton}.scss`
 * + `src/browser/tokens.ts`):
 *
 *   1. `.badge` — small inline pill for counts / labels / status
 *      keywords. Bare = neutral subtle; layering a variant repaints
 *      with `bg-subtle` + `text-emphasis`. `.filled` saturates;
 *      `.pill` fully rounds; an empty `.badge` hides via
 *      `:empty { display: none }`. Inside a `<button>` the badge gets
 *      a small upward nudge for optical centering.
 *   2. `.dot` — small circular status indicator. Bare = text-muted;
 *      variant repaints via `--set-variant-background-color`. Sizes
 *      `.small` / `.large` retune diameter; `.pulse` adds an
 *      animated halo overlay that respects `prefers-reduced-motion`.
 *   3. `.tag` — chip-shape inline label, static or interactive.
 *      Variant subtle (bg + text + border triplet) by default;
 *      `.filled` / `.ghost` style modifiers; `.small` / `.large` /
 *      `.square` size + shape modifiers. `<button class="tag">`
 *      auto-promotes to an interactive chip with hover / active
 *      state layers. Descendant `<button class="remove">` paints
 *      the dismiss glyph. `.tag-group` wraps a row of tags.
 *   4. `.spinner` — rotating ring loader. Currentcolor border with
 *      one side transparent; rotation animation slows (not stops)
 *      under reduced-motion. Sizes via `.small` / `.large`; inside
 *      a `.loading` button auto-shrinks to label height.
 *   5. `.skeleton` — shimmering loading placeholder. Sliding
 *      gradient highlight over a tinted bg; `.text` (inline-block
 *      line) and `.circle` (avatar) shape helpers. Reduced-motion
 *      collapses to a flat tinted block (no frozen mid-sweep).
 *
 * Cross-references:
 *   - [ButtonPage](#/button) — `<button class="tag">` reuses the
 *     button baseline; `.loading > .spinner` documented there.
 *   - [ModifiersPage](#/modifiers) — the variant cascade these
 *     atoms read from is shared with every other component.
 */
import { ref } from 'vue'

import { INLINE_ATOMS_TAGS as tags, VARIANTS as variants } from '../constants.js'
import { useDismissed } from '../composables.js'

// Tag dismissal demo — track which chips have been removed so the user
// sees real interactive state.
const { ids: removed, dismiss, restore } = useDismissed()

// Loading button demo — toggle the loading state on click.
const loading = ref(false)
const submit = async (): Promise<void> => {
	loading.value = true
	await new Promise((r) => setTimeout(r, 1500))
	loading.value = false
}
</script>

<template>
	<section id="atoms-intro">
		<hgroup>
			<h1>Inline atoms</h1>
			<p>
				Five class-root primitives for patterns with no semantic HTML home —
				<code>.badge</code>, <code>.dot</code>, <code>.tag</code>, <code>.spinner</code>, and
				<code>.skeleton</code>. Each owns a <code>--set-{atom}-*</code> token surface and reads from
				the framework's seven-variant cascade, so a chip / count / status indicator / loader paints
				consistently with the surrounding chrome without per-instance overrides.
			</p>
		</hgroup>
		<p>
			Class roots, not bare HTML tags, because no element semantically means "colored chip" or
			"loading shimmer." The framework's preference is always a semantic element first (
			<code>&lt;article&gt;</code> for a card, <code>&lt;dialog&gt;</code> for a modal,
			<code>&lt;aside&gt;</code> for a sidebar) — class roots appear only when no semantic root
			exists. Markup is <code>&lt;span class="badge"&gt;</code> /
			<code>&lt;div class= "skeleton"&gt;</code>; consumers can swap the host element if they need
			to nest the atom inside an interactive shell (<code>&lt;button class="tag"&gt;</code>).
		</p>
	</section>

	<section id="atoms-badge">
		<h2>1. Badge — count / label / status keyword</h2>
		<p>
			Small inline pill for counts, status keywords, or short labels. Defaults to a neutral subtle
			tint; the seven variants paint with the
			<code>--color-{variant}-{bg-subtle, text-emphasis}</code> triplet so the badge reads as "this
			thing has identity X without shouting" — same recipe alerts, list-group active rows, and
			aside-popover drawers use.
		</p>
		<h3>Bare + seven variants</h3>
		<div class="cluster gap-2">
			<span class="badge">12</span>
			<span v-for="v in variants" :key="v" :class="['badge', v]">{{ v }}</span>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;span class="badge"&gt;12&lt;/span&gt;
&lt;span class="badge primary"&gt;primary&lt;/span&gt;
&lt;span class="badge success"&gt;success&lt;/span&gt;</code></pre>
		</details>

		<h3>Filled — saturated identity</h3>
		<p>
			Adding <code>.filled</code> swaps the subtle tier for the variant's saturated identity color
			(and white text — the framework's "every variant takes white on fill" contract). Use
			sparingly: subtle badges sit politely in body copy; filled badges shout for attention.
		</p>
		<div class="cluster gap-2">
			<span v-for="v in variants" :key="v" :class="['badge', v, 'filled']">{{ v }}</span>
		</div>

		<h3>Pill — fully rounded</h3>
		<p>
			<code>.pill</code> bumps the border-radius to <code>9999px</code> for the fully-rounded chip
			silhouette (Mailbox <code>.tag</code> default shape). Composes with any variant.
		</p>
		<div class="cluster gap-2">
			<span class="badge pill">99+</span>
			<span class="badge primary pill">new</span>
			<span class="badge danger pill filled">live</span>
			<span class="badge success pill">v1.2.0</span>
		</div>

		<h3>Trailing badge inside a button</h3>
		<p>
			A common pattern: a button with a trailing count badge (inbox unread, notifications, cart
			items). The badge auto-nudges 1 px upward inside a <code>&lt;button&gt;</code> for optical
			centering against the button's baseline.
		</p>
		<div class="cluster gap-2">
			<button type="button">Inbox <span class="badge primary filled">42</span></button>
			<button type="button" class="subtle">
				Mentions <span class="badge information">7</span>
			</button>
			<button type="button" class="primary">
				Tasks <span class="badge filled" style="background-color: rgba(255, 255, 255, 0.2)">3</span>
			</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;button type="button"&gt;
  Inbox &lt;span class="badge primary filled"&gt;42&lt;/span&gt;
&lt;/button&gt;</code></pre>
		</details>
	</section>

	<section id="atoms-dot">
		<h2>2. Dot — circular status indicator</h2>
		<p>
			Tiny colored circle. Mailbox / GitHub / Slack all reach for one when the signal is "this thing
			has state, glance to know which kind." Default size is <code>0.5rem</code>;
			<code>.small</code> / <code>.large</code> retune diameter. The fill flows through
			<code>--set-variant-background-color</code> so layering a variant class paints the dot in that
			identity color; bare dots fall back to <code>--color-text-muted</code>.
		</p>
		<h3>Bare + seven variants</h3>
		<div class="cluster gap-4">
			<span class="dot" aria-label="Neutral status"></span>
			<span v-for="v in variants" :key="v" :class="['dot', v]" :aria-label="`${v} status`"></span>
		</div>

		<h3>Sizes</h3>
		<div class="cluster gap-4">
			<span class="dot small success" aria-label="Small"></span>
			<span class="dot success" aria-label="Default"></span>
			<span class="dot large success" aria-label="Large"></span>
		</div>

		<h3>Pulse — animated halo</h3>
		<p>
			<code>.pulse</code> adds an <code>::after</code> halo that scales out and fades in a 1.6 s
			loop. The halo inherits the dot's bg color so any variant pulses in its own identity.
			<code>prefers-reduced-motion: reduce</code> drops the animation entirely (per WCAG SC 2.3.3 —
			there's no value in a frozen mid-pulse).
		</p>
		<div class="cluster gap-6">
			<span class="dot success pulse" aria-label="Online — pulsing"></span>
			<span class="dot danger pulse" aria-label="Recording — pulsing"></span>
			<span class="dot warning pulse" aria-label="Pending — pulsing"></span>
		</div>

		<h3>Inline with text labels</h3>
		<p>Common composition — dot + label inside a flex row, like a user status line.</p>
		<ul class="flex flex-col gap-2">
			<li class="flex items-center gap-2">
				<span class="dot success pulse" aria-hidden="true"></span>
				<span>Alex Rivera — <small>online</small></span>
			</li>
			<li class="flex items-center gap-2">
				<span class="dot warning" aria-hidden="true"></span>
				<span>Jordan Lee — <small>away</small></span>
			</li>
			<li class="flex items-center gap-2">
				<span class="dot" aria-hidden="true"></span>
				<span>Sam Park — <small>offline</small></span>
			</li>
		</ul>
	</section>

	<section id="atoms-tag">
		<h2>3. Tag — chip-shape inline label</h2>
		<p>
			Pill-shaped chip for keywords, filter values, or short labels — distinct from
			<code>.badge</code> in three ways: <code>.tag</code> is pill-shaped by default,
			<code>.tag</code> can be interactive (when the host is a <code>&lt;button&gt;</code>), and
			<code>.tag</code> ships a descendant remove-button pattern. Variants paint with the same
			<code>bg-subtle / text-emphasis / border-subtle</code> triplet as <code>.badge</code> + alerts
			+ drawers.
		</p>
		<h3>Style modes — subtle (default) / filled / ghost</h3>
		<div class="stack" style="--set-stack-gap: 0.5rem">
			<div class="cluster gap-2">
				<span v-for="v in variants" :key="v" :class="['tag', v]">{{ v }}</span>
			</div>
			<div class="cluster gap-2">
				<span v-for="v in variants" :key="v" :class="['tag', v, 'filled']">{{ v }}</span>
			</div>
			<div class="cluster gap-2">
				<span v-for="v in variants" :key="v" :class="['tag', v, 'ghost']">{{ v }}</span>
			</div>
		</div>

		<h3>Sizes + square shape</h3>
		<div class="cluster gap-2">
			<span class="tag small primary">small</span>
			<span class="tag primary">default</span>
			<span class="tag large primary">large</span>
			<span class="tag square primary">square corners</span>
		</div>

		<h3>Interactive chip — <code>&lt;button class="tag"&gt;</code></h3>
		<p>
			When the tag's host is a <code>&lt;button&gt;</code>, the framework auto-adds a state layer:
			hover darkens / lightens the bg via <code>color-mix(currentColor 8%, ...)</code>, active
			deepens to 16 %, focus paints the framework's focus ring. Same pattern the
			<code>&lt;button&gt;</code> baseline uses, scoped to the tag chip.
		</p>
		<div class="cluster gap-2">
			<button type="button" class="tag">Bare</button>
			<button type="button" class="tag primary">primary</button>
			<button type="button" class="tag success">success</button>
			<button type="button" class="tag warning filled">filled warning</button>
		</div>

		<h3>Removable chip — <code>&lt;button class="remove"&gt;</code> descendant</h3>
		<p>
			A trailing <code>&lt;button class="remove"&gt;</code> inside the tag paints the dismiss glyph
			with a quiet hover state and a focus ring. Dispatch the remove handler on click; the visual is
			the framework's, the lifecycle is the consumer's.
		</p>
		<div class="tag-group" v-if="tags.some((t) => !removed.has(t))">
			<span v-for="tag in tags.filter((t) => !removed.has(t))" :key="tag" class="tag primary">
				#{{ tag }}
				<button type="button" class="remove" :aria-label="`Remove ${tag}`" @click="dismiss(tag)">
					×
				</button>
			</span>
		</div>
		<p v-if="removed.size > 0" class="mt-4">
			<button type="button" class="subtle small" @click="restore">Restore dismissed tags</button>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;div class="tag-group"&gt;
  &lt;span class="tag primary"&gt;
    #frontend
    &lt;button class="remove" aria-label="Remove frontend"&gt;×&lt;/button&gt;
  &lt;/span&gt;
  …
&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="atoms-spinner">
		<h2>4. Spinner — rotating ring loader</h2>
		<p>
			Three-quarter ring with one side transparent, rotating at <code>0.75 s</code>. Color cascades
			through <code>--set-style-color</code> → <code>--set-variant-color</code> →
			<code>currentColor</code> so a spinner inside <code>&lt;button class="primary"&gt;</code>
			paints WHITE (matching the button's label color), not the variant's identity blue — that was
			the visibility bug an earlier draft hit (blue spinner on blue button surface).
		</p>
		<p>
			Reduced motion <em>slows</em> the rotation (0.75 s → 1.5 s) rather than stops it. A frozen
			spinner conveys nothing; a slower spinner still reads as "in progress" without triggering
			vestibular discomfort. WCAG SC 2.3.3 explicitly permits this for spinners.
		</p>
		<h3>Sizes + variant color</h3>
		<div class="cluster gap-4">
			<span role="status" class="spinner small" aria-label="Loading (small)"></span>
			<span role="status" class="spinner" aria-label="Loading (default)"></span>
			<span role="status" class="spinner large" aria-label="Loading (large)"></span>
			<span role="status" class="spinner primary" aria-label="Primary"></span>
			<span role="status" class="spinner danger" aria-label="Danger"></span>
		</div>

		<h3>Inline inside a loading button</h3>
		<p>
			A <code>&lt;button class="loading"&gt;</code> with a child <code>.spinner</code>
			auto-shrinks the spinner to the button's font-size so the indicator sits next to the label
			without breaking the row. Click the button to toggle the loading state.
		</p>
		<div class="cluster gap-2">
			<button
				type="button"
				class="primary"
				:class="{ loading }"
				:disabled="loading"
				@click="submit"
			>
				<span v-if="loading" role="status" class="spinner" aria-label="Submitting"></span>
				{{ loading ? 'Submitting…' : 'Submit' }}
			</button>
			<button type="button" class="success loading" disabled>
				<span role="status" class="spinner" aria-label="Saving"></span>
				Saving
			</button>
			<button type="button" class="subtle loading" disabled>
				<span role="status" class="spinner" aria-label="Loading"></span>
				Bare subtle
			</button>
		</div>
	</section>

	<section id="atoms-skeleton">
		<h2>5. Skeleton — shimmering loading placeholder</h2>
		<p>
			A block-level placeholder masking content during loading. A 200 %-wide gradient highlight
			slides across a tinted base color (the highlight derives from
			<code>--color-text</code> mixed into the bg so the shimmer tracks the active theme
			automatically — pale tint in light mode, subtle lift in dark mode). Set the size with inline
			styles or width utilities; the framework owns the chrome.
		</p>
		<p>
			Reduced motion strips both the animation AND the gradient — what's left is a flat tinted
			block. Never a frozen mid-sweep (which would read as broken).
		</p>

		<h3>Block placeholder + multi-line text</h3>
		<article class="max-w-md">
			<header class="cluster gap-3">
				<div class="skeleton circle w-10 h-10" aria-hidden="true"></div>
				<div class="flex-1">
					<div class="skeleton text" style="inline-size: 60%" aria-hidden="true"></div>
					<div
						class="skeleton text"
						style="inline-size: 40%; margin-block-start: 0.375rem"
						aria-hidden="true"
					></div>
				</div>
			</header>
			<div class="skeleton" style="block-size: 8rem; margin-block: 1rem" aria-hidden="true"></div>
			<div class="skeleton text w-full" aria-hidden="true"></div>
			<div
				class="skeleton text"
				style="inline-size: 92%; margin-block-start: 0.5rem"
				aria-hidden="true"
			></div>
			<div
				class="skeleton text"
				style="inline-size: 78%; margin-block-start: 0.5rem"
				aria-hidden="true"
			></div>
		</article>
		<details>
			<summary><small>Markup — skeleton card</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header style="display: flex; gap: 0.75rem"&gt;
    &lt;div class="skeleton circle w-10 h-10"&gt;&lt;/div&gt;
    &lt;div style="flex: 1"&gt;
      &lt;div class="skeleton text" style="inline-size: 60%"&gt;&lt;/div&gt;
      &lt;div class="skeleton text" style="inline-size: 40%"&gt;&lt;/div&gt;
    &lt;/div&gt;
  &lt;/header&gt;
  &lt;div class="skeleton" style="block-size: 8rem"&gt;&lt;/div&gt;
  &lt;div class="skeleton text" class="w-full"&gt;&lt;/div&gt;
  &lt;div class="skeleton text" style="inline-size: 92%"&gt;&lt;/div&gt;
  &lt;div class="skeleton text" style="inline-size: 78%"&gt;&lt;/div&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="atoms-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Three atoms ship animations — <code>.dot.pulse</code>, <code>.spinner</code>, and
			<code>.skeleton</code>. Each handles <code>prefers-reduced-motion: reduce</code> per WAI
			guidance:
		</p>
		<ul>
			<li>
				<strong><code>.dot.pulse</code></strong> — halo animation dropped entirely. The dot keeps
				its color so the static status signal still reads.
			</li>
			<li>
				<strong><code>.spinner</code></strong> — rotation <em>slows</em> from 0.75 s to 1.5 s rather
				than stops. A frozen spinner reads as broken; a slower spinner still conveys "working"
				without vestibular impact (WCAG SC 2.3.3).
			</li>
			<li>
				<strong><code>.skeleton</code></strong> — shimmer animation AND gradient both drop; what's
				left is a flat tinted block. Never a frozen mid-sweep.
			</li>
		</ul>
		<p>
			Toggle your OS reduced-motion preference and watch the live demos above settle into their
			static states.
		</p>
	</section>

	<section id="atoms-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (or any <code>forced-colors: active</code> environment) the browser
			overrides custom colors with system tokens. The five atoms degrade gracefully: tinted variant
			backgrounds collapse to <code>Canvas</code> + <code>CanvasText</code>; the spinner's
			three-quarter ring still reads because <code>CanvasText</code> paints the visible arcs; the
			skeleton's gradient drops out and the base bg becomes <code>ButtonFace</code>, producing a
			flat solid block.
		</p>
	</section>

	<section id="atoms-tokens">
		<h2>Tokens</h2>
		<p>
			Each atom's tokens live on its class root. Override globally at <code>:root</code>, or
			per-instance via inline <code>style="..."</code>.
		</p>

		<h3><code>.badge</code></h3>
		<dl>
			<dt><code>--set-badge-color</code></dt>
			<dd>Text colour. Falls through variant → emphasis tier → body text.</dd>
			<dt><code>--set-badge-background-color</code></dt>
			<dd>Surface colour. Falls through variant → bg-subtle tier → border-subtle neutral.</dd>
			<dt><code>--set-badge-border-radius</code></dt>
			<dd>Default <code>0.375 rem</code>; <code>.pill</code> bumps to <code>9999 px</code>.</dd>
			<dt><code>--set-badge-padding-inline</code> / <code>--set-badge-padding-block</code></dt>
			<dd>Default <code>0.5em</code> / <code>0.25em</code> — scales with the host font-size.</dd>
			<dt>
				<code>--set-badge-font-size</code> / <code>--set-badge-font-weight</code> /
				<code>--set-badge-line-height</code>
			</dt>
			<dd>Default <code>0.75em</code> / <code>500</code> / <code>1</code>.</dd>
		</dl>

		<h3><code>.dot</code></h3>
		<dl>
			<dt><code>--set-dot-size</code></dt>
			<dd>
				Diameter. Default <code>0.5 rem</code>; <code>.small</code> = <code>0.375 rem</code>;
				<code>.large</code> = <code>0.75 rem</code>.
			</dd>
			<dt><code>--set-dot-background-color</code></dt>
			<dd>Fill colour. Falls through variant → <code>--color-text-muted</code>.</dd>
			<dt><code>--set-dot-pulse-duration</code> / <code>--set-dot-pulse-easing</code></dt>
			<dd>Pulse animation timing. Default <code>1.6 s</code> / <code>ease-out</code>.</dd>
		</dl>

		<h3><code>.tag</code></h3>
		<dl>
			<dt>
				<code>--set-tag-color</code> / <code>--set-tag-background-color</code> /
				<code>--set-tag-border-color</code>
			</dt>
			<dd>
				Variant tier triplet. Falls through variant → bg-subtle / text-emphasis / border-subtle /
				neutral.
			</dd>
			<dt><code>--set-tag-border-width</code> / <code>--set-tag-border-radius</code></dt>
			<dd>
				Default <code>1 px</code> / <code>9999 px</code> (pill). <code>.square</code> drops radius
				to <code>0.25 rem</code>.
			</dd>
			<dt>
				<code>--set-tag-padding-inline</code> / <code>--set-tag-padding-block</code> /
				<code>--set-tag-font-size</code>
			</dt>
			<dd>
				Default <code>0.5 rem</code> / <code>0.25 rem</code> / <code>0.75 rem</code>; sizes scale
				all three.
			</dd>
			<dt><code>--set-tag-gap</code></dt>
			<dd>
				Flex gap between tag content and the trailing remove glyph. Default <code>0.25 rem</code>.
			</dd>
			<dt><code>--set-tag-transition-duration</code></dt>
			<dd>
				Hover / active state-layer transition. Default <code>--set-transition-duration</code> (150
				ms).
			</dd>
		</dl>

		<h3><code>.spinner</code></h3>
		<dl>
			<dt><code>--set-spinner-size</code></dt>
			<dd>
				Outer diameter. Default <code>2em</code>; <code>.small</code> = <code>1em</code>;
				<code>.large</code> = <code>3em</code>.
			</dd>
			<dt><code>--set-spinner-border-width</code></dt>
			<dd>
				Ring thickness. Default <code>0.2em</code>; <code>.small</code> + button-loading shrink to
				<code>0.15em</code>.
			</dd>
			<dt><code>--set-spinner-color</code></dt>
			<dd>Ring colour. Falls through style → variant contrast → <code>currentColor</code>.</dd>
			<dt><code>--set-spinner-duration</code></dt>
			<dd>
				Rotation duration. Default <code>0.75 s</code>; reduced-motion bumps to <code>1.5 s</code>.
			</dd>
		</dl>

		<h3><code>.skeleton</code></h3>
		<dl>
			<dt><code>--set-skeleton-background-color</code></dt>
			<dd>Base tinted bg. Default <code>--color-border-subtle</code>.</dd>
			<dt><code>--set-skeleton-highlight-color</code></dt>
			<dd>
				Shimmer highlight. Derived from <code>color-mix(--color-text 6%, bg)</code> so it tracks the
				active theme.
			</dd>
			<dt><code>--set-skeleton-border-radius</code></dt>
			<dd>
				Corner radius. Default <code>0.375 rem</code>; <code>.circle</code> overrides to
				<code>50%</code>.
			</dd>
			<dt><code>--set-skeleton-duration</code></dt>
			<dd>Shimmer animation duration. Default <code>1.5 s</code>.</dd>
			<dt><code>--set-skeleton-line-block-size</code> / <code>--set-skeleton-line-gap</code></dt>
			<dd>
				<code>.text</code> shape helper line height + sibling line spacing. Defaults
				<code>0.75em</code> / <code>0.5em</code>.
			</dd>
		</dl>
	</section>
</template>
