<script lang="ts" setup>
import { ref } from 'vue'

/**
 * PlacementsPage — the canonical reference for anchor-positioned
 * popover placement. Closes the four-page Foundations group:
 * TokensPage covered the global structural tokens; ThemePage covered
 * the color palette; ModifiersPage covered the 5-dimension cascade;
 * this page dives deep into one dimension (placement) and the CSS
 * anchor-positioning machinery that powers it.
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Placement vocabulary (8) — `.top`, `.bottom`, `.start`, `.end`,
 *     `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end`. Maps
 *     to `position-area` keywords plus matching `align-self` /
 *     `justify-self` so the popover lands flush against the anchor
 *     edge.
 *
 *   Anchor surface — `surfaces/_anchor-position.scss` paints the
 *     baseline `[popover]:not(:where(aside, dialog, nav, output))`
 *     with `--set-anchor-*` tokens (gap, max-size, position-try-
 *     fallbacks, position-area default).
 *
 *   Scope discipline — the `:not(:where(...))` exclusion list keeps
 *     drawer-shaped elements (aside / dialog / nav / output) out of
 *     the popover placement family. They have their own viewport-
 *     fixed geometry.
 *
 *   position-try-fallbacks — the browser flips the popover to a
 *     mirrored placement when the chosen side has no room. Default
 *     fallback chain: `flip-block, flip-inline, flip-block flip-
 *     inline`.
 *
 * Cross-references:
 *   - patterns.md §5 — scope discipline + the flattened `:not(:where
 *     (t1, t2, ...))` rule.
 *   - UsePopoverPage — the `usePopover` composable wraps the native
 *     Popover API and adds the placement + flip + dismiss machinery.
 *   - UseTooltipPage — same placement vocabulary on `[popover=hint]`
 *     tooltips.
 */

import type { ModifierPlacement } from '../types.js'
import { PLACEMENTS_MODIFIER as placements } from '../constants.js'

const livePlacement = ref<ModifierPlacement>('bottom-start')

const setPlacement = (p: ModifierPlacement): void => {
	livePlacement.value = p
	// Close and re-open so the new placement class takes effect
	// without the user having to dismiss + click the trigger.
	const popover = document.querySelector<HTMLElement>('#placements-live-popover')
	if (popover?.matches(':popover-open')) {
		popover.hidePopover()
		requestAnimationFrame(() => popover.showPopover())
	}
}

// Position-try-fallbacks demo runs entirely from CSS — no JS state needed.
// Two anchor buttons at opposite edges of the section; one requests a
// placement that doesn't fit (browser flips), the other gets its
// requested side (no flip).
</script>

<template>
	<section id="placements-intro">
		<hgroup>
			<h1>Placements</h1>
			<p>
				Eight values for anchored popover placement, mapped to CSS <code>position-area</code> +
				matching alignment. The logical-axis vocabulary flips for RTL automatically.
			</p>
		</hgroup>
		<p>
			Placement is the fifth modifier dimension (variant / size / style / state / placement). It
			only applies to anchor-positioned popovers — bare <code>[popover]</code> hosts that aren't
			drawer-shaped. Drawer surfaces (<code>&lt;aside popover&gt;</code>,
			<code>&lt;dialog&gt;</code>, <code>&lt;nav popover&gt;</code>,
			<code>&lt;output popover&gt;</code> for toasts) carry their own viewport-fixed geometry and
			are explicitly excluded via the <code>:not(:where(aside, dialog, nav, output))</code> scope
			clause — see <a href="#/placements/placements-scope">§ Scope discipline</a> below.
		</p>
		<p>
			The CSS feature underneath is
			<strong>CSS Anchor Positioning</strong> (<code>position-area</code>,
			<code>position-try-fallbacks</code>) — Baseline 2024+ in Chromium, behind a flag in older
			Safari / Firefox builds. Browsers that don't support it fall back to whatever
			<code>position: absolute</code> resolves to without an anchor.
		</p>
	</section>

	<section id="placements-vocabulary">
		<h2>The eight placement classes</h2>
		<p>
			Four cardinal edges plus four corners. Each class translates to a logical-axis
			<code>position-area</code> keyword plus matching <code>align-self</code> /
			<code>justify-self</code> so the popover sits flush against the anchor edge instead of
			floating in the middle of the cell.
		</p>
		<table>
			<thead>
				<tr>
					<th>Class</th>
					<th>Reads as</th>
					<th><code>position-area</code></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>.top</code></td>
					<td>Above the anchor, centered inline</td>
					<td><code>block-start</code></td>
				</tr>
				<tr>
					<td><code>.bottom</code></td>
					<td>Below the anchor, centered inline</td>
					<td><code>block-end</code></td>
				</tr>
				<tr>
					<td><code>.start</code></td>
					<td>Inline-start of anchor, centered block</td>
					<td><code>inline-start</code></td>
				</tr>
				<tr>
					<td><code>.end</code></td>
					<td>Inline-end of anchor, centered block</td>
					<td><code>inline-end</code></td>
				</tr>
				<tr>
					<td><code>.top-start</code></td>
					<td>Above, start-aligned (Bootstrap dropdown default)</td>
					<td><code>block-start span-inline-end</code></td>
				</tr>
				<tr>
					<td><code>.top-end</code></td>
					<td>Above, end-aligned</td>
					<td><code>block-start span-inline-start</code></td>
				</tr>
				<tr>
					<td><code>.bottom-start</code></td>
					<td>Below, start-aligned (the common "drops down" shape)</td>
					<td><code>block-end span-inline-end</code></td>
				</tr>
				<tr>
					<td><code>.bottom-end</code></td>
					<td>Below, end-aligned</td>
					<td><code>block-end span-inline-start</code></td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="placements-live">
		<h2>Live demo</h2>
		<p>
			Pick a placement, then click <em>Open popover</em>. The same anchor button + popover
			re-renders with the new placement class. The popover surface chrome (background, border,
			shadow, scale-in transition) comes from <code>surfaces/_popover.scss</code>; the
			placement-specific positioning comes from <code>modifiers/_placements.scss</code>.
		</p>
		<form class="row" @submit.prevent>
			<label>
				<span>Placement</span>
				<select
					:value="livePlacement"
					@change="(e) => setPlacement((e.target as HTMLSelectElement).value as ModifierPlacement)"
				>
					<option v-for="p in placements" :key="p" :value="p">.{{ p }}</option>
				</select>
			</label>
		</form>
		<div class="showcase-anchor-stage">
			<button type="button" class="primary" popovertarget="placements-live-popover">
				Open popover ↓
			</button>
		</div>
		<div id="placements-live-popover" popover :class="livePlacement" class="min-w-56">
			<p class="mt-0 mb-2"><strong>Popover panel</strong></p>
			<p class="m-0 text-sm">
				Placement: <code>.{{ livePlacement }}</code
				>. The browser anchors to the trigger button; if the chosen side has no room,
				<code>position-try-fallbacks</code> flips it to the opposite side.
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;button popovertarget="my-popover"&gt;Open&lt;/button&gt;
&lt;div id="my-popover" popover class="bottom-start"&gt;
  Popover content…
&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="placements-grid">
		<h2>The 3×3 grid metaphor</h2>
		<p>
			<code>position-area</code> divides the anchor's bounding area into a 3×3 grid (cells), then
			extends the grid outward to cover the 8 surrounding cells. A placement class picks one cell
			(or a span of cells) for the popover to land in.
		</p>
		<div class="showcase-placement-grid">
			<article class="showcase-placement-cell information">
				<code>.top-start</code>
			</article>
			<article class="showcase-placement-cell information">
				<code>.top</code>
			</article>
			<article class="showcase-placement-cell information">
				<code>.top-end</code>
			</article>
			<article class="showcase-placement-cell secondary">
				<code>.start</code>
			</article>
			<article class="showcase-placement-anchor">anchor</article>
			<article class="showcase-placement-cell secondary">
				<code>.end</code>
			</article>
			<article class="showcase-placement-cell information">
				<code>.bottom-start</code>
			</article>
			<article class="showcase-placement-cell information">
				<code>.bottom</code>
			</article>
			<article class="showcase-placement-cell information">
				<code>.bottom-end</code>
			</article>
		</div>
		<p>
			<strong>Corner placements use SPAN syntax, not corner cells.</strong> The class name
			<code>.bottom-start</code> reads as "below the anchor, aligned to its start edge" — the
			popover's start edge hugs the anchor's start edge and the panel extends inline-end-ward. This
			is the Bootstrap / Material "drops down, start-aligned" convention. (The literal corner cell —
			<code>block-end inline-start</code> — would sit BELOW and to the LEFT of the anchor, which is
			wrong for a dropdown.)
		</p>
	</section>

	<section id="placements-fallbacks">
		<h2>Flip fallbacks — <code>position-try-fallbacks</code></h2>
		<p>
			When the chosen placement has no room (the anchor is near a viewport edge), the browser flips
			the popover to a mirrored placement that does fit. The framework's default fallback chain is
			<code>flip-block, flip-inline, flip-block flip-inline</code> — try flipping the block axis,
			then the inline axis, then both. Consumers can override per-popover via
			<code>--set-anchor-position-try-fallbacks</code>.
		</p>
		<p>
			Two anchored demos below — each in its own bordered container so they stack cleanly on every
			viewport. Both popovers request <code>.start</code> placement (popover wants to sit to the
			anchor's inline-start). The first button sits at the inline-start edge of the page content so
			its popover has no room on the left — the browser flips it to <code>.end</code> via
			<code>position-try-fallbacks: flip-inline</code>. The second button sits at the inline-end
			edge so its popover fits the requested side without flipping.
		</p>

		<h3>1. Anchor near inline-start edge — popover flips</h3>
		<div class="showcase-bordered-stage justify-start mb-4">
			<button type="button" class="primary" popovertarget="placements-flip-left">
				Open (placement: .start)
			</button>
		</div>

		<h3>2. Anchor near inline-end edge — popover honored</h3>
		<div class="showcase-bordered-stage justify-end">
			<button type="button" class="primary" popovertarget="placements-flip-right">
				Open (placement: .start)
			</button>
		</div>
		<div id="placements-flip-left" popover class="start min-w-48">
			<p class="mt-0 mb-2"><strong>Flipped popover</strong></p>
			<p class="m-0 text-sm">
				Requested <code>.start</code> (left of anchor). No room — browser flipped to
				<code>.end</code>.
			</p>
		</div>
		<div id="placements-flip-right" popover class="start min-w-48">
			<p class="mt-0 mb-2"><strong>Honored placement</strong></p>
			<p class="m-0 text-sm">
				Requested <code>.start</code> (left of anchor). Fit found — no flip.
			</p>
		</div>
		<p>
			<strong>Per-popover override:</strong> if you want to OPT OUT of one axis, set
			<code>--set-anchor-position-try-fallbacks</code> on the popover host:
		</p>
		<pre v-pre><code>#my-popover {
  /* Only flip the inline axis; leave block-axis alone (no above-fallback). */
  --set-anchor-position-try-fallbacks: flip-inline;
}</code></pre>
	</section>

	<section id="placements-scope">
		<h2>Scope discipline — why drawers are excluded</h2>
		<p>
			The placement rules apply only to anchor-positioned popovers. Drawer-shaped elements (<code
				>&lt;aside popover&gt;</code
			>, <code>&lt;nav popover&gt;</code>, <code>&lt;output popover&gt;</code> toasts) have their
			own viewport-fixed geometry declared in <code>components/_aside.scss</code> and
			<code>components/_output.scss</code> — the placement modifier means something different on
			each:
		</p>
		<dl>
			<dt><code>&lt;aside popover&gt;</code> + <code>.top</code></dt>
			<dd>
				Slide-from-block-start drawer, full viewport width, ~30dvh tall. Not anchor-positioned —
				inset to viewport edges.
			</dd>
			<dt><code>&lt;output popover class="top"&gt;</code></dt>
			<dd>
				Toast pinned to the viewport's top edge, corner-anchored at one inline edge. Not anchored to
				a trigger — anchored to the viewport.
			</dd>
			<dt><code>&lt;div popover class="top"&gt;</code></dt>
			<dd>
				Anchor-positioned popover, lands above the trigger element. The placement modifier in
				<code>modifiers/_placements.scss</code> applies HERE.
			</dd>
		</dl>
		<p>
			The framework keeps these distinct via a single CSS scope clause —
			<code>:not(:where(aside, dialog, nav, output))</code> — on every rule that paints the
			anchor-positioning chrome. The <code>:where()</code> wrapper FLATTENS the exclusion list to
			zero specificity, so the rule's weight stays at <code>(0, 0, 1)</code> — the same as a bare
			<code>[popover]</code> rule. Future popover-able elements you didn't anticipate (<code
				>&lt;section popover&gt;</code
			>, <code>&lt;details popover&gt;</code>, etc.) automatically inherit the placement defaults —
			no silent failure.
		</p>
		<p>
			See
			<a
				href="https://github.com/mikesaintsg/elements/blob/main/guides/patterns.md"
				target="_blank"
				rel="noopener noreferrer"
				>patterns.md §5</a
			>
			for the full scope-discipline rule and the parity test that enforces flattened
			<code>:not(:where(...))</code> patterns across the framework.
		</p>
	</section>

	<section id="placements-rtl">
		<h2>Logical axis — RTL flips automatically</h2>
		<p>
			The placement vocabulary uses <strong>logical-axis</strong> keywords
			(<code>block-start</code>, <code>inline-end</code>, <code>span-inline-start</code>) under the
			hood. That means <code>.start</code> resolves to the LEFT side in <code>dir="ltr"</code> and
			to the RIGHT side in <code>dir="rtl"</code>; <code>.end</code> mirrors. Vertical writing modes
			(CJK) follow the same logical mapping.
		</p>
		<p>
			The framework's class names (`.start` / `.end` / `.top` / `.bottom`) stay LTR-mental-model
			friendly while the actual positioning honors the document's writing direction. Consumers
			rarely have to think about it — the placement class on a popover inside an
			<code>&lt;html dir="rtl"&gt;</code> document automatically lands on the correct side.
		</p>
	</section>

	<section id="placements-customization">
		<h2>How + where to retune anchor positioning</h2>
		<p>The anchor surface's tokens live on <code>:root</code> and on each popover host.</p>
		<h3><code>--set-anchor-gap</code> — distance from anchor</h3>
		<p>
			Default <code>calc(var(--spacing) * 1)</code> (4px). Increase for "breathing room" popovers:
		</p>
		<pre v-pre><code>:root {
  --set-anchor-gap: calc(var(--spacing) * 2);
}</code></pre>

		<h3><code>--set-anchor-max-inline-size</code> / <code>--set-anchor-max-block-size</code></h3>
		<p>
			Caps the popover's intrinsic size. Defaults: <code>28rem</code> inline, <code>18rem</code>
			block. Helpful when a popover's body is long — the panel caps and the body scrolls inside.
		</p>
		<pre v-pre><code>#my-dropdown {
  --set-anchor-max-block-size: 12rem;
}</code></pre>

		<h3><code>--set-anchor-position-try-fallbacks</code> — flip strategy</h3>
		<p>
			Default <code>flip-block, flip-inline, flip-block flip-inline</code>. Each comma-separated
			entry is a try-position the browser attempts when the previous one didn't fit. Override per
			popover if your design forbids one axis:
		</p>
		<pre v-pre><code>#my-tooltip {
  /* Tooltip should NEVER flip vertically — only horizontally. */
  --set-anchor-position-try-fallbacks: flip-inline;
}</code></pre>
	</section>

	<section id="placements-reference">
		<h2>Reference</h2>
		<dl>
			<dt>Placement classes (8)</dt>
			<dd>
				<code>.top</code>, <code>.bottom</code>, <code>.start</code>, <code>.end</code>,
				<code>.top-start</code>, <code>.top-end</code>, <code>.bottom-start</code>,
				<code>.bottom-end</code>. Mapped in <code>modifiers/_placements.scss</code>.
			</dd>
			<dt>Anchor-surface tokens</dt>
			<dd>
				<code>--set-anchor-gap</code>, <code>--set-anchor-max-inline-size</code>,
				<code>--set-anchor-max-block-size</code>, <code>--set-anchor-position-area</code>,
				<code>--set-anchor-position-try-fallbacks</code>,
				<code>--set-anchor-position-try-order</code>. Declared on <code>:root</code> in
				<code>surfaces/_anchor-position.scss</code>.
			</dd>
			<dt>Excluded surfaces (drawer-shaped)</dt>
			<dd>
				<code>&lt;aside popover&gt;</code> / <code>&lt;nav popover&gt;</code> →
				<code>components/_aside.scss</code> handles their geometry; placement classes flip meaning
				to "which viewport edge does the drawer slide from." <code>&lt;output popover&gt;</code> →
				<code>components/_output.scss</code> handles toast placement (corner-anchored to the
				viewport). <code>&lt;dialog&gt;</code> → user-agent top-layer placement (modal centering).
			</dd>
			<dt>CSS underlying the rule</dt>
			<dd>
				<a
					href="https://developer.mozilla.org/en-US/docs/Web/CSS/position-area"
					target="_blank"
					rel="noopener noreferrer"
					><code>position-area</code></a
				>,
				<a
					href="https://developer.mozilla.org/en-US/docs/Web/CSS/position-try-fallbacks"
					target="_blank"
					rel="noopener noreferrer"
					><code>position-try-fallbacks</code></a
				>. Baseline 2024+ in Chromium; partial support in Safari / Firefox.
			</dd>
		</dl>
	</section>
</template>
