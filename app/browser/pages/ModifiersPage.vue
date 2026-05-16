<script lang="ts" setup>
import { computed, ref } from 'vue'
import { capitalize } from '../helpers.js'

/**
 * ModifiersPage — the canonical reference for the framework's five
 * orthogonal modifier dimensions: variant, size, style, state,
 * placement. Each dimension is orthogonal — an element takes at most
 * one value from each, and the dimensions compose freely
 * (`<button class="primary large filled">`).
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Variant (7) — primary, secondary, tertiary, success, warning,
 *     danger, information. Each .{variant} class sets eight context
 *     tokens across three tiers (FILLED, SUBTLE, ON-CANVAS).
 *
 *   Size (2 + default) — small, default, large. Each writes
 *     --set-size-{padding-inline, padding-block, font-size,
 *     border-radius}.
 *
 *   Style (2 + default) — subtle, default, filled. Each rewrites
 *     --set-style-* from the variant's FILLED or SUBTLE tier.
 *
 *   State (3) — disabled, active, loading. Toggle element rules; no
 *     dedicated context tokens.
 *
 *   Placement (8) — top, bottom, start, end, top-start, top-end,
 *     bottom-start, bottom-end. Anchored-popover positioning via
 *     `position-area` + matching align/justify-self.
 *
 * Cross-references:
 *   - TokensPage covers the global structural tokens.
 *   - ThemePage covers the variant palette the variant tokens consume.
 *   - PlacementsPage will dive deep into the placement system with
 *     live anchor positioning + position-try-fallbacks demos.
 */

import type { Variant } from '@elements/browser'
import type { ModifierSizeOption, ModifierStateOption, ModifierStyleOption } from '../types.js'
import { MODIFIERS_SIZE_ROWS as sizeRows, VARIANTS as variants } from '../constants.js'

// ── Combination picker state ───────────────────────────────────────────────

const pickedVariant = ref<Variant>('primary')
const pickedSize = ref<ModifierSizeOption>('')
const pickedStyle = ref<ModifierStyleOption>('')
const pickedState = ref<ModifierStateOption>('')

const classes = computed(() =>
	[pickedVariant.value, pickedSize.value, pickedStyle.value, pickedState.value]
		.filter(Boolean)
		.join(' '),
)

const buttonAttrs = computed(() => {
	const attrs: Record<string, unknown> = { class: classes.value }
	if (pickedState.value === 'disabled') attrs.disabled = true
	if (pickedState.value === 'loading') attrs['aria-busy'] = 'true'
	return attrs
})

// ── Placement demo state ───────────────────────────────────────────────────

const placements = [
	'top-start',
	'top',
	'top-end',
	'start',
	'end',
	'bottom-start',
	'bottom',
	'bottom-end',
] as const
</script>

<template>
	<section id="modifiers-intro">
		<hgroup>
			<h1>Modifiers</h1>
			<p>
				Five orthogonal dimensions — variant, size, style, state, placement — composed onto every
				framework element through one set of cascade context tokens.
			</p>
		</hgroup>
		<p>
			Every element shipped by the framework consumes the SAME modifier tokens through SAME fallback
			chains. <code>&lt;button class="primary large filled"&gt;</code>,
			<code>&lt;aside class="success subtle"&gt;</code>, and
			<code>&lt;dialog class="warning"&gt;</code> all resolve through
			<code>--set-style-* → --set-variant-* → --set-size-* → element-default</code> without per-tag
			variant code. Adding a new substantive element to the framework means writing the element's
			token consumption — the modifier system automatically reaches it.
		</p>
		<p>
			<strong>Names that look like they should be modifiers but aren't:</strong> there's no
			<code>.shape</code> dimension (Tailwind owns <code>.rounded</code>), no
			<code>.outline</code> style (Tailwind owns it), no <code>.ghost</code> style (failed WCAG AA
			on 4 of 7 variants in dark mode), no <code>.huge</code> size (Tailwind owns
			<code>text-*</code>). Per-call typography / radius / outline tweaks reach for Tailwind
			utilities directly.
		</p>
	</section>

	<section id="modifiers-cascade">
		<h2>How the cascade resolves</h2>
		<p>Walk through <code>&lt;button class="primary large filled"&gt;</code>:</p>
		<ol>
			<li>
				<code>.primary</code> sets the variant tier tokens — FILLED, SUBTLE, ON-CANVAS — derived
				from <code>--color-primary</code> + its theme-aware tints
				(<code>--color-primary-bg-subtle</code>, <code>--color-primary-text-emphasis</code>,
				<code>--color-primary-border-subtle</code>, <code>--color-primary-on-canvas</code>).
			</li>
			<li>
				<code>.large</code> sets the size tokens — <code>--set-size-padding-inline</code>,
				<code>--set-size-padding-block</code>, <code>--set-size-font-size</code>,
				<code>--set-size-border-radius</code>.
			</li>
			<li>
				<code>.filled</code> rewrites <code>--set-style-*</code> from the variant FILLED tier so the
				element paints with the saturated fill instead of the bare-element default.
			</li>
			<li>
				The <code>&lt;button&gt;</code> partial reads its tokens via the fallback chain
				<code>style → variant → size → element default</code>, so each modifier dimension's tokens
				win when set and fall through cleanly when absent.
			</li>
		</ol>
		<details>
			<summary><small>Resolved tokens for the cascade walk-through</small></summary>
			<pre v-pre><code>/* .primary */
--set-variant-color: white;
--set-variant-background-color: var(--color-primary);
--set-variant-border-color: var(--color-primary);
--set-variant-border-width: 1px;
--set-variant-subtle-color: var(--color-primary-text-emphasis);
--set-variant-subtle-background-color: var(--color-primary-bg-subtle);
--set-variant-subtle-border-color: var(--color-primary-border-subtle);
--set-variant-on-canvas-color: var(--color-primary-on-canvas);

/* .large */
--set-size-padding-inline: calc(var(--spacing) * 4);
--set-size-padding-block: calc(var(--spacing) * 2);
--set-size-font-size: var(--text-base);
--set-size-border-radius: var(--radius-lg);

/* .filled (overwrites --set-style-* from the variant FILLED tier) */
--set-style-color: var(--set-variant-color, currentColor);
--set-style-background-color: var(--set-variant-background-color, transparent);
--set-style-border-color: var(--set-variant-border-color, transparent);
--set-style-border-width: 1px;

/* &lt;button&gt; consumes: */
--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor));
--set-button-background-color: var(--set-style-background-color, var(--set-variant-background-color, transparent));
--set-button-border-radius: var(--set-size-border-radius, var(--radius-md));
--set-button-padding-inline: var(--set-size-padding-inline, calc(var(--spacing) * 3));</code></pre>
		</details>
	</section>

	<section id="modifiers-variants">
		<h2>Variants — semantic identity (7)</h2>
		<p>
			Seven semantic identities. Each <code>.{variant}</code> class sets eight context tokens across
			three tiers — FILLED (saturated identity), SUBTLE (tinted bg + emphasis text + subtle border),
			ON-CANVAS (variant text painted directly on body canvas, WCAG-AA-safe in both modes).
		</p>
		<p>
			Bare variant — saturated FILLED tier on action surfaces (<code>&lt;button&gt;</code>,
			<code>&lt;a&gt;</code>):
		</p>
		<div class="cluster justify-start">
			<button v-for="v in variants" :key="v" type="button" :class="v">
				{{ capitalize(v) }}
			</button>
		</div>
		<p class="mt-3">
			With <code>.filled</code> — every variant paints saturated regardless of element default:
		</p>
		<div class="cluster justify-start">
			<span v-for="v in variants" :key="v" class="badge filled" :class="v">{{ v }}</span>
		</div>
		<p class="mt-3">With <code>.subtle</code> — tinted bg + emphasis text + subtle border:</p>
		<div class="cluster justify-start">
			<button v-for="v in variants" :key="v" type="button" class="subtle" :class="v">
				{{ capitalize(v) }}
			</button>
		</div>
		<p class="mt-3">
			ON-CANVAS — variant text on body canvas. Bare <code>&lt;a&gt;</code> uses this tier:
		</p>
		<div class="cluster gap-4 justify-start">
			<a v-for="v in variants" :key="v" href="#" :class="v" @click.prevent>
				{{ capitalize(v) }} anchor
			</a>
		</div>
	</section>

	<section id="modifiers-sizes">
		<h2>Sizes — physical scale (2 + default)</h2>
		<p>
			<code>.small</code>, default (no modifier), <code>.large</code>. No <code>.medium</code> — the
			bare element IS medium. Each size value writes <code>--set-size-padding-inline</code>,
			<code>--set-size-padding-block</code>, <code>--set-size-font-size</code>, and
			<code>--set-size-border-radius</code>; every consumer with a fallback chain consumes them in
			lockstep, so a single <code>.large</code> on a parent could theoretically retune every child
			(but in practice it's applied per element to avoid surprise).
		</p>
		<div class="cluster justify-start">
			<button type="button" class="primary small">Small</button>
			<button type="button" class="primary">Default</button>
			<button type="button" class="primary large">Large</button>
		</div>
		<h3>Concrete token values</h3>
		<table>
			<thead>
				<tr>
					<th>Modifier</th>
					<th><code>padding-inline</code></th>
					<th><code>padding-block</code></th>
					<th><code>font-size</code></th>
					<th><code>border-radius</code></th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in sizeRows" :key="row.label">
					<td>
						<code>{{ row.label }}</code>
					</td>
					<td>
						<code>{{ row.padInline }}</code>
					</td>
					<td>
						<code>{{ row.padBlock }}</code>
					</td>
					<td>
						<code>{{ row.fontSize }}</code>
					</td>
					<td>
						<code>{{ row.radius }}</code>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="modifiers-styles">
		<h2>Styles — fill treatment (2 + default)</h2>
		<p>
			Three positions: <code>.subtle</code>, default (no modifier), <code>.filled</code>. The style
			dimension reads from the variant tiers — <code>.subtle</code> uses the variant's SUBTLE tier
			(tinted bg, emphasis text); <code>.filled</code> uses the FILLED tier (saturated fill,
			contrast text); the bare default uses each element's own opinion (action surfaces fill
			automatically, callout / card surfaces stay neutral).
		</p>
		<h3>Action surface — <code>&lt;button&gt;</code></h3>
		<p>
			Action surfaces fill by default — the bare-variant action button paints saturated. The style
			values stack ON TOP of that default:
		</p>
		<div class="cluster justify-start">
			<button type="button" class="primary subtle">Subtle</button>
			<button type="button" class="primary">Default (filled)</button>
			<button type="button" class="primary filled">Filled (explicit)</button>
		</div>
		<h3>Container surface — <code>&lt;article&gt;</code></h3>
		<p>
			Container surfaces stay neutral by default (variant tints the border only). Styles opt in to
			fill:
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(13rem, 100%);
				--showcase-tile-grid-gap: 0.5rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article class="primary subtle p-3">
				<strong>.primary.subtle</strong>
				<p class="mt-1 mb-0">Tinted bg + emphasis text + subtle border.</p>
			</article>
			<article class="primary p-3">
				<strong>.primary</strong>
				<p class="mt-1 mb-0">Bare — border tinted, body neutral.</p>
			</article>
			<article class="primary filled p-3">
				<strong>.primary.filled</strong>
				<p class="mt-1 mb-0">Saturated fill + contrast text.</p>
			</article>
		</div>
	</section>

	<section id="modifiers-states">
		<h2>States — interaction state (3)</h2>
		<p>
			<code>.disabled</code>, <code>.active</code>, <code>.loading</code>. Each toggles existing
			element chrome — no dedicated context tokens. The framework prefers attribute parity where
			possible: <code>.disabled</code> mirrors the native <code>[disabled]</code> /
			<code>aria-disabled</code> behavior; <code>.active</code> pairs with
			<code>aria-pressed</code> / <code>aria-current</code>; <code>.loading</code> pairs with
			<code>aria-busy</code>.
		</p>
		<div class="cluster justify-start">
			<button type="button" class="primary">Default</button>
			<button type="button" class="primary disabled" disabled>.disabled</button>
			<button type="button" class="primary active" aria-pressed="true">.active</button>
			<button type="button" class="primary loading" aria-busy="true">
				<span class="spinner small" role="status" aria-label="Loading"></span>
				.loading
			</button>
		</div>
		<dl>
			<dt><code>.disabled</code></dt>
			<dd>
				<code>opacity: 0.5</code>, <code>cursor: not-allowed</code>,
				<code>pointer-events: none</code>. Mirrors the native <code>[disabled]</code> shape for
				elements without the attribute (anchors, spans).
			</dd>
			<dt><code>.active</code></dt>
			<dd>
				Pressed / selected look. For nav rows, paired with <code>aria-current="page"</code>; for
				toggle buttons, paired with <code>aria-pressed="true"</code>.
			</dd>
			<dt><code>.loading</code></dt>
			<dd>
				Marker class — sets <code>cursor: progress</code> + pairs with
				<code>aria-busy="true"</code> so screen-readers announce the wait state. The visible spinner
				is consumer-provided: drop a <code>&lt;span class="spinner small"&gt;</code>
				inside the loading button or use a composable that injects one. The framework's
				<code>.spinner</code> class-component lives in <code>components/_spinner.scss</code>.
			</dd>
		</dl>
	</section>

	<section id="modifiers-placements">
		<h2>Placements — anchored surface placement (8)</h2>
		<p>
			Eight values for anchor-positioned popovers and toasts:
			<code>.top</code>, <code>.bottom</code>, <code>.start</code>, <code>.end</code> for the
			cardinal edges, plus <code>.top-start</code>, <code>.top-end</code>,
			<code>.bottom-start</code>, <code>.bottom-end</code> for the four corners. The class maps to
			CSS <code>position-area</code> keywords plus matching <code>align-self</code> /
			<code>justify-self</code> so the panel lands flush against the anchor edge.
		</p>
		<p>
			Logical-axis keywords (<code>block-start</code>, <code>inline-end</code>) under the hood, so
			RTL + vertical-writing-mode pages flip automatically.
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(10rem, 100%);
				--showcase-tile-grid-gap: 0.5rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article v-for="p in placements" :key="p" class="p-2 text-center">
				<strong class="block">.{{ p }}</strong>
				<code class="text-xs opacity-70">.{{ p }}</code>
			</article>
		</div>
		<p class="mt-3">
			See <a href="#/placements">PlacementsPage</a> for the live anchor-positioning demos —
			<code>position-try-fallbacks</code> flips, viewport-clamp behavior, and the
			<code>:not(:where(aside, dialog, nav, output))</code> scope rule that keeps drawer-shaped
			elements out of the popover placement family.
		</p>
	</section>

	<section id="modifiers-combinations">
		<h2>Combinations — the orthogonal cascade</h2>
		<p>
			Pick one value from each dimension and watch the single demo element re-render with the
			composed cascade. The output element's class list is shown live below the picker; copy it as
			your starting point.
		</p>
		<form class="row items-end" @submit.prevent>
			<label>
				<span>Variant</span>
				<select v-model="pickedVariant">
					<option v-for="v in variants" :key="v" :value="v">{{ v }}</option>
				</select>
			</label>
			<label>
				<span>Size</span>
				<select v-model="pickedSize">
					<option value="">default</option>
					<option value="small">small</option>
					<option value="large">large</option>
				</select>
			</label>
			<label>
				<span>Style</span>
				<select v-model="pickedStyle">
					<option value="">default</option>
					<option value="subtle">subtle</option>
					<option value="filled">filled</option>
				</select>
			</label>
			<label>
				<span>State</span>
				<select v-model="pickedState">
					<option value="">default</option>
					<option value="disabled">disabled</option>
					<option value="active">active</option>
					<option value="loading">loading</option>
				</select>
			</label>
		</form>
		<div class="cluster gap-3 py-3">
			<button type="button" v-bind="buttonAttrs">
				<span
					v-if="pickedState === 'loading'"
					class="spinner small"
					role="status"
					aria-label="Loading"
				></span>
				Composed button
			</button>
			<code class="text-sm">
				&lt;button class="{{ classes || '' }}"&gt;
				<template v-if="pickedState === 'disabled'"> disabled </template>
				<template v-if="pickedState === 'loading'"> aria-busy="true" </template>
				…&lt;/button&gt;
			</code>
		</div>
		<aside role="status" class="information" data-alert-open>
			<p>
				Same cascade applies to every framework consumer:
				<code>&lt;aside role="alert" class="{{ classes || 'primary' }}"&gt;</code>,
				<code>&lt;span class="badge {{ classes || 'primary' }}"&gt;</code>, etc. Try a few
				combinations — the modifier dimensions compose freely.
			</p>
		</aside>
	</section>

	<section id="modifiers-customization">
		<h2>How + where to set modifier tokens</h2>
		<p>
			The modifier system is closed to extension — the value vocabulary (`.primary`, `.large`,
			`.subtle`, etc.) is the framework's source of truth and is mirrored in
			<a href="#/tokens/tokens-customization">TypeScript</a> + the Sass lists in
			<code>src/styles/_mixins.scss</code>. But the values each modifier WRITES are fully
			retune-able via the context tokens they expose:
		</p>
		<h3>Override at the dimension scope</h3>
		<p>
			Each modifier dimension writes context tokens. Override them at <code>:root</code> to retune
			every consumer at once, or at any element scope to retune just that subtree:
		</p>
		<pre v-pre><code>:root {
  /* Retune the SUBTLE tier for the primary variant globally. */
  --set-variant-subtle-background-color: color-mix(in oklab, var(--color-primary) 20%, transparent);
}

.muted-area {
  /* Retune the large size's padding locally. */
  --set-size-padding-inline: calc(var(--spacing) * 6);
}</code></pre>
		<h3>Use a class-on-class for one-off pairings</h3>
		<p>
			Some authors want per-element-local modifiers (<code>form.row</code>,
			<code>button.dropdown</code>, <code>table.striped</code>) — class names that only make sense
			on a single tag, so they pair with the tag selector to keep scope tight. These currently live
			in their element / component partials (<code>components/_form.scss</code>,
			<code>elements/_button.scss</code>, <code>elements/_table.scss</code>);
			<code>modifiers/_local.scss</code> is the modifier-layer target home + charter for the family,
			with the migration still pending (reserved stubs there).
		</p>
		<h3>Don't reach for the variant palette directly</h3>
		<p>
			Bypassing the modifier classes (writing
			<code>style="background-color: var(--color-primary)"</code> on a custom element) breaks the
			theme + variant cascade — the surface won't repaint when the user picks a new brand color or
			flips dark mode. Reach for the modifier class on a semantic element, not the underlying
			palette token.
		</p>
	</section>

	<section id="modifiers-reference">
		<h2>Reference</h2>
		<dl>
			<dt>Variants (7)</dt>
			<dd>
				<code>.primary</code>, <code>.secondary</code>, <code>.tertiary</code>,
				<code>.success</code>, <code>.warning</code>, <code>.danger</code>,
				<code>.information</code>. Each writes 8 tokens across 3 tiers (FILLED, SUBTLE, ON-CANVAS).
			</dd>
			<dt>Sizes (2 + default)</dt>
			<dd>
				<code>.small</code>, default, <code>.large</code>. Each writes 4 tokens
				(<code>padding-inline</code>, <code>padding-block</code>, <code>font-size</code>,
				<code>border-radius</code>).
			</dd>
			<dt>Styles (2 + default)</dt>
			<dd>
				<code>.subtle</code>, default, <code>.filled</code>. Each rewrites
				<code>--set-style-*</code> from the active variant's matching tier.
			</dd>
			<dt>States (3)</dt>
			<dd>
				<code>.disabled</code>, <code>.active</code>, <code>.loading</code>. Toggle element rules
				directly; no dedicated context tokens. Pair with the matching ARIA attribute (<code
					>aria-disabled</code
				>
				/ <code>aria-pressed</code> / <code>aria-busy</code>).
			</dd>
			<dt>Placements (8)</dt>
			<dd>
				<code>.top</code>, <code>.bottom</code>, <code>.start</code>, <code>.end</code>,
				<code>.top-start</code>, <code>.top-end</code>, <code>.bottom-start</code>,
				<code>.bottom-end</code>. Anchor-positioned popovers / toasts.
			</dd>
			<dt>Context tokens (the cascade hooks)</dt>
			<dd>
				FILLED: <code>--set-variant-color</code>, <code>--set-variant-background-color</code>,
				<code>--set-variant-border-color</code>, <code>--set-variant-border-width</code>. SUBTLE:
				<code>--set-variant-subtle-{color, background-color, border-color}</code>. ON-CANVAS:
				<code>--set-variant-on-canvas-color</code>. Size:
				<code>--set-size-{padding-inline, padding-block, font-size, border-radius}</code>. Style:
				<code>--set-style-{color, background-color, border-color, border-width}</code>.
			</dd>
		</dl>
	</section>
</template>
