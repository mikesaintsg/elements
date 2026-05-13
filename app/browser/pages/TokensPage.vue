<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * TokensPage — the canonical reference for the framework's `--set-*`
 * token surface. Every `:root`-declared token in
 * `src/styles/_tokens.scss` is surfaced here with its live computed
 * value, plus retune playgrounds that prove the customizability
 * contract (consumer pins one token at `:root` and watches every
 * downstream consumer retune in lockstep).
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Motion contract — `--set-motion-{duration, timing-function}` +
 *     `--set-transition-duration`. The reference smoothness is
 *     `<details>::details-content`; every panel reveal in the
 *     framework reads from these tokens so a single retune cascades
 *     to drawers, dialogs, alerts, table-row expansion.
 *
 *   Elevation — `--set-box-shadow-{small, base, large}`. Three lift
 *     tiers for floating surfaces.
 *
 *   Z-index — `--set-z-index-{sticky, fixed, dropdown, modal,
 *     popover, tooltip, toast}`. Single canonical layering order.
 *
 *   Radius + density factors — `--set-{border-radius, border-width,
 *     density-factor, radius-factor}`. Global multipliers for
 *     spacing + corner rhythm.
 *
 *   Spacing rhythm — `--set-{gap, stack-spacing, sticky-offset}`.
 *
 *   Focus chrome — `--set-focus-box-shadow-{width, opacity}`.
 *
 *   Floater viewport budget — `--set-floater-{gutter, inset-*,
 *     max-inline-size, max-block-size}`. How floating panels respect
 *     viewport edges on every form factor.
 *
 *   Icon registry — ~20 inline-SVG mask URLs (chevrons, form
 *     indicators, common UI, theme, status, disclosure). Consumer
 *     swaps one or the whole set without forking partials.
 *
 *   Summary disclosure marker — `--set-summary-marker-{image,
 *     open-rotate}`.
 *
 *   Variant context tokens — `--set-variant-{color, border-width}`
 *     (the cascade hooks modifier classes set; the variant palette
 *     itself — `--color-{primary, secondary, ...}-{bg-subtle,
 *     text-emphasis, border-subtle, on-canvas}` — is the theme's
 *     responsibility and lives on ThemePage).
 *
 * Cross-references:
 *   - ThemePage covers the variant color palette + light / dark.
 *   - ModifiersPage covers how the cascade resolves token values
 *     across the five modifier dimensions.
 *   - PlacementsPage covers the anchor-positioning + floater-budget
 *     interaction.
 *   - patterns.md § 6 catalogs the modifier-dimension required
 *     tokens; tokens.md catalogs the full per-tag surface; this
 *     page catalogs the GLOBAL :root surface.
 */

// Live computed-value reads — sample on mount + on theme toggle so the
// displayed values track the active cascade. Reads from `:root` so
// every token here is the consumer's override target.
const rootStyle = ref<CSSStyleDeclaration | null>(null)
const refreshSeed = ref(0)

const refresh = (): void => {
	refreshSeed.value += 1
}

let themeObserver: MutationObserver | null = null

onMounted(() => {
	if (typeof window === 'undefined') return
	rootStyle.value = getComputedStyle(document.documentElement)
	themeObserver = new MutationObserver(refresh)
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme', 'style'],
	})
})

onUnmounted(() => {
	themeObserver?.disconnect()
	themeObserver = null
})

const read = (token: string): string => {
	// `refreshSeed.value` participates so the computed re-runs on refresh.
	void refreshSeed.value
	return rootStyle.value?.getPropertyValue(token).trim() || '…'
}

// ── Live-bound playground refs ─────────────────────────────────────────────
//
// Each playground writes its slider value back to `:root` via
// `document.documentElement.style.setProperty`. Reset clears every
// inline override so the framework defaults return.

const radiusFactor = ref(1)
const densityFactor = ref(1)
const motionDuration = ref(250)
const motionTimingFunction = ref<'iOS' | 'ease' | 'linear' | 'snappy'>('iOS')

const timingFunctionFor = (key: typeof motionTimingFunction.value): string => {
	switch (key) {
		case 'iOS':
			return 'cubic-bezier(0.32, 0.72, 0, 1)'
		case 'ease':
			return 'cubic-bezier(0.25, 0.1, 0.25, 1)'
		case 'linear':
			return 'linear'
		case 'snappy':
			return 'cubic-bezier(0.4, 0, 0.2, 1)'
	}
}

const applyRadius = (): void => {
	document.documentElement.style.setProperty('--set-radius-factor', String(radiusFactor.value))
}

const applyDensity = (): void => {
	document.documentElement.style.setProperty('--set-density-factor', String(densityFactor.value))
}

const applyMotionDuration = (): void => {
	document.documentElement.style.setProperty('--set-motion-duration', `${motionDuration.value}ms`)
	refresh()
}

const applyMotionTiming = (): void => {
	document.documentElement.style.setProperty(
		'--set-motion-timing-function',
		timingFunctionFor(motionTimingFunction.value),
	)
	refresh()
}

const resetTokens = (): void => {
	const root = document.documentElement
	for (const property of [
		'--set-radius-factor',
		'--set-density-factor',
		'--set-motion-duration',
		'--set-motion-timing-function',
	]) {
		root.style.removeProperty(property)
	}
	radiusFactor.value = 1
	densityFactor.value = 1
	motionDuration.value = 250
	motionTimingFunction.value = 'iOS'
	refresh()
}

// Trigger a details/alert re-open so the motion playground demonstrates
// the new duration / curve.
const motionOpen = ref(false)
const replayMotion = async (): Promise<void> => {
	motionOpen.value = false
	await new Promise((r) => setTimeout(r, 50))
	motionOpen.value = true
}

// Icon catalog — every icon registered in `_tokens.scss` § Icon
// tokens. Each row pairs the token name with a human label so the
// preview reads as a glyph swatch.
interface IconEntry {
	readonly token: string
	readonly label: string
}

const icons: readonly IconEntry[] = [
	{ token: '--set-icon-chevron-down', label: 'Chevron down' },
	{ token: '--set-icon-chevron-up', label: 'Chevron up' },
	{ token: '--set-icon-chevron-left', label: 'Chevron left' },
	{ token: '--set-icon-chevron-right', label: 'Chevron right' },
	{ token: '--set-icon-caret-down', label: 'Caret down' },
	{ token: '--set-icon-caret-up', label: 'Caret up' },
	{ token: '--set-icon-check', label: 'Check' },
	{ token: '--set-icon-dash', label: 'Dash' },
	{ token: '--set-icon-radio', label: 'Radio dot' },
	{ token: '--set-icon-close', label: 'Close (×)' },
	{ token: '--set-icon-menu', label: 'Menu (hamburger)' },
	{ token: '--set-icon-more', label: 'More (⋮)' },
	{ token: '--set-icon-search', label: 'Search' },
	{ token: '--set-icon-filter', label: 'Filter' },
	{ token: '--set-icon-sort', label: 'Sort' },
	{ token: '--set-icon-external', label: 'External link' },
	{ token: '--set-icon-sun', label: 'Sun (light theme)' },
	{ token: '--set-icon-moon', label: 'Moon (dark theme)' },
	{ token: '--set-icon-system', label: 'System (auto theme)' },
	{ token: '--set-icon-information', label: 'Information' },
	{ token: '--set-icon-success', label: 'Success' },
	{ token: '--set-icon-warning', label: 'Warning' },
	{ token: '--set-icon-danger', label: 'Danger' },
	{ token: '--set-icon-plus', label: 'Plus' },
	{ token: '--set-icon-minus', label: 'Minus' },
]

// Z-index layers in ascending order — drives the layering diagram.
interface ZIndexEntry {
	readonly token: string
	readonly value: string
	readonly role: string
}

const zIndexLayers = computed<readonly ZIndexEntry[]>(() => [
	{
		token: '--set-z-index-sticky',
		value: read('--set-z-index-sticky'),
		role: 'Sticky header / toolbar',
	},
	{ token: '--set-z-index-fixed', value: read('--set-z-index-fixed'), role: 'Fixed body chrome' },
	{
		token: '--set-z-index-dropdown',
		value: read('--set-z-index-dropdown'),
		role: 'Dropdown panel (non-popover)',
	},
	{
		token: '--set-z-index-modal',
		value: read('--set-z-index-modal'),
		role: 'Modal dialog (z-index fallback)',
	},
	{ token: '--set-z-index-popover', value: read('--set-z-index-popover'), role: 'Popover panel' },
	{ token: '--set-z-index-tooltip', value: read('--set-z-index-tooltip'), role: 'Tooltip' },
	{ token: '--set-z-index-toast', value: read('--set-z-index-toast'), role: 'Toast notification' },
])
</script>

<template>
	<section id="tokens-intro">
		<hgroup>
			<h1>Tokens</h1>
			<p>
				The framework's <code>--set-*</code> token surface — every retune-able value lives at
				<code>:root</code>, declared once in <code>src/styles/_tokens.scss</code>.
			</p>
		</hgroup>
		<p>
			Every visible value in the framework flows through a token. Per-element baselines
			(<code>--set-button-color</code>, <code>--set-aside-padding-inline</code>, …) consume the
			global tokens through fallback chains; a single override at <code>:root</code> retunes every
			consumer at once. The variant color palette is the theme's responsibility — see
			<a href="#/theme">ThemePage</a>. This page covers the global structural tokens: motion,
			elevation, layering, radius, density, focus, icons.
		</p>
		<p>
			<strong>How to retune:</strong> pin a token at <code>:root</code> in your own CSS, or
			scope-override on any host element. The retune playgrounds below demonstrate the contract live
			— adjust a slider and watch every downstream surface on this page (and across the entire
			framework) re-render with the new value.
		</p>
	</section>

	<section id="tokens-motion">
		<h2>Motion contract — <code>--set-motion-{duration, timing-function}</code></h2>
		<p>
			One shared pair for every "substantial reveal" surface — drawers, dialogs, disclosures,
			alerts, table-row expansion. The reference smoothness is
			<code>&lt;details&gt;::details-content</code>'s native animation: height tweens between
			<code>0</code> and <code>auto</code> via the global
			<code>interpolate-size: allow-keywords</code> declaration on <code>&lt;html&gt;</code>;
			opacity fades alongside; discrete properties (<code>visibility</code>,
			<code>content-visibility</code>, <code>display</code>, <code>overlay</code>) flip via
			<code>transition-behavior: allow-discrete</code>. Every framework panel matches this contract
			— same duration, same iOS-stiff-decel curve.
		</p>
		<dl>
			<dt><code>--set-motion-duration</code></dt>
			<dd>
				Live: <code>{{ read('--set-motion-duration') }}</code
				>. Default <code>250ms</code> — the perceptual sweet spot for substantial motion. Distinct
				from <code>--set-transition-duration</code> (<code>{{
					read('--set-transition-duration')
				}}</code
				>, used for small UI tints).
			</dd>
			<dt><code>--set-motion-timing-function</code></dt>
			<dd>
				Live: <code>{{ read('--set-motion-timing-function') }}</code
				>. Default <code>cubic-bezier(0.32, 0.72, 0, 1)</code> — iOS-stiff-decel, fast start +
				gentle settle. Opacity fades inside the motion family use plain <code>ease-out</code>.
			</dd>
		</dl>

		<h3>Retune playground</h3>
		<p>
			Drag the duration slider or pick a curve, then click <em>Replay</em>. The disclosure below
			animates with the new tokens, and so does every other panel on the page that uses the motion
			contract (theme toggle, alerts, sidebar drawer on mobile, etc).
		</p>
		<form class="row" @submit.prevent>
			<label>
				<span>Duration ({{ motionDuration }}ms)</span>
				<input
					type="range"
					v-model.number="motionDuration"
					min="0"
					max="2000"
					step="50"
					@input="applyMotionDuration"
				/>
			</label>
			<label>
				<span>Timing function</span>
				<select v-model="motionTimingFunction" @change="applyMotionTiming">
					<option value="iOS">iOS-stiff-decel (default)</option>
					<option value="ease">ease (CSS default)</option>
					<option value="linear">linear</option>
					<option value="snappy">snappy (Material-y)</option>
				</select>
			</label>
			<button type="button" class="primary" @click="replayMotion">Replay</button>
		</form>
		<details :open="motionOpen">
			<summary>Disclosure — reveal uses the motion tokens</summary>
			<p style="margin-block: var(--spacing); padding-inline: var(--spacing)">
				<code>::details-content</code> animates <code>block-size: 0 → auto</code> +
				<code>opacity: 0 → 1</code> using the current motion tokens. Change them above and click
				<em>Replay</em> to see the difference.
			</p>
		</details>
	</section>

	<section id="tokens-elevation">
		<h2>Elevation — <code>--set-box-shadow-{small, base, large}</code></h2>
		<p>
			Three distinct lift tiers for floating surfaces. Each level layers a diffuse main drop with a
			tighter contact shadow so the surface reads as a discrete floating layer rather than an
			inflated drop.
		</p>
		<div class="cluster">
			<article style="box-shadow: var(--set-box-shadow-small); padding: var(--spacing)">
				<h3 style="margin-block: 0"><code>small</code></h3>
				<p style="margin-block: var(--spacing) 0">
					List-group hover, dropdown items, subtle action panels.
				</p>
			</article>
			<article style="box-shadow: var(--set-box-shadow); padding: var(--spacing)">
				<h3 style="margin-block: 0"><code>base</code></h3>
				<p style="margin-block: var(--spacing) 0">Popover panels, dropdown menus.</p>
			</article>
			<article style="box-shadow: var(--set-box-shadow-large); padding: var(--spacing)">
				<h3 style="margin-block: 0"><code>large</code></h3>
				<p style="margin-block: var(--spacing) 0">Modal dialogs, toasts, drawer chrome.</p>
			</article>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article style="box-shadow: var(--set-box-shadow-small)"&gt;
  …
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="tokens-z-index">
		<h2>Z-index scale — <code>--set-z-index-*</code></h2>
		<p>
			Single canonical layering order. Native popovers and <code>&lt;dialog&gt;:modal</code> use the
			browser's TOP LAYER instead of z-index, but these tokens still matter for non-popover
			dropdowns, in-flow status banners, and consumer chrome that needs to layer against the
			framework's surfaces without guessing values. 20-step gaps leave breathing room for
			consumer-layered chrome.
		</p>
		<table>
			<thead>
				<tr>
					<th>Token</th>
					<th>Value</th>
					<th>Role</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="layer in zIndexLayers" :key="layer.token">
					<td>
						<code>{{ layer.token }}</code>
					</td>
					<td>
						<code>{{ layer.value }}</code>
					</td>
					<td>{{ layer.role }}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section id="tokens-radius">
		<h2>Radius — <code>--set-border-radius</code> + <code>--set-radius-factor</code></h2>
		<p>
			<code>--set-border-radius</code> (live: <code>{{ read('--set-border-radius') }}</code
			>) is the framework default; per-component radius tokens fall back to it.
			<code>--set-radius-factor</code> (live: <code>{{ read('--set-radius-factor') }}</code
			>) is a global multiplier: <code>0</code> = sharp / angular, <code>1</code> = default,
			<code>1.5</code>
			= very rounded.
		</p>
		<form class="row" @submit.prevent>
			<label>
				<span>Radius factor ({{ radiusFactor.toFixed(2) }})</span>
				<input
					type="range"
					v-model.number="radiusFactor"
					min="0"
					max="2"
					step="0.05"
					@input="applyRadius"
				/>
			</label>
		</form>
		<div class="cluster">
			<button type="button" class="primary">Primary button</button>
			<button type="button" class="secondary">Secondary</button>
			<article style="padding: var(--spacing)">
				<p style="margin-block: 0">An article card watching the radius factor.</p>
			</article>
			<span class="badge primary">Badge</span>
			<span class="tag information">Tag</span>
		</div>
	</section>

	<section id="tokens-density">
		<h2>Density — <code>--set-density-factor</code></h2>
		<p>
			Global multiplier for spacing rhythm. <code>0.75</code> = compact (mailbox-style desktop),
			<code>1</code> = default, <code>1.25</code> = spacious (touch-first). Components that opt in
			wrap their padding math in <code>calc(value * var(--set-density-factor))</code> so the shift
			propagates from a single host-page declaration.
		</p>
		<form class="row" @submit.prevent>
			<label>
				<span>Density factor ({{ densityFactor.toFixed(2) }})</span>
				<input
					type="range"
					v-model.number="densityFactor"
					min="0.5"
					max="1.5"
					step="0.05"
					@input="applyDensity"
				/>
			</label>
		</form>
		<p>
			Current density-aware consumers will retune in lockstep. Reset all sliders below to restore
			defaults across the page.
		</p>
		<button type="button" class="subtle" @click="resetTokens">Reset all token overrides</button>
	</section>

	<section id="tokens-spacing">
		<h2>Spacing rhythm — gap, stack-spacing, sticky-offset</h2>
		<dl>
			<dt><code>--set-gap</code></dt>
			<dd>
				Live: <code>{{ read('--set-gap') }}</code
				>. Default flex / grid gap for layout primitives (<code>.stack</code>,
				<code>.cluster</code>, <code>&lt;form&gt;</code> control list,
				<code>&lt;menu&gt;</code> toolbar).
			</dd>
			<dt><code>--set-stack-spacing</code></dt>
			<dd>
				Live: <code>{{ read('--set-stack-spacing') }}</code
				>. Sibling vertical rhythm; relative to local <code>font-size</code> so the gap scales with
				the typography context.
			</dd>
			<dt><code>--set-sticky-offset</code></dt>
			<dd>
				Live: <code>{{ read('--set-sticky-offset') }}</code
				>. Anchor-jump / scroll-snap offset so a sticky toolbar (consumer sets per app) never covers
				the scroll target. Defaults to <code>0px</code> so apps without sticky chrome get unmodified
				UA behaviour.
			</dd>
		</dl>
	</section>

	<section id="tokens-focus">
		<h2>Focus ring — <code>--set-focus-box-shadow-{width, opacity}</code></h2>
		<p>
			Sub-tokens consumed by the <code>@include focus-ring()</code> mixin (in
			<code>src/styles/_mixins.scss</code>). Width is the ring thickness; opacity is the alpha mix
			against the active variant color.
		</p>
		<dl>
			<dt><code>--set-focus-box-shadow-width</code></dt>
			<dd>
				Live: <code>{{ read('--set-focus-box-shadow-width') }}</code
				>. Default <code>0.25rem</code>.
			</dd>
			<dt><code>--set-focus-box-shadow-opacity</code></dt>
			<dd>
				Live: <code>{{ read('--set-focus-box-shadow-opacity') }}</code
				>. Default <code>0.35</code>.
			</dd>
		</dl>
		<p>Try it — tab to the button below to see the live ring:</p>
		<div class="cluster">
			<button type="button" class="primary">Primary</button>
			<button type="button" class="success">Success</button>
			<button type="button" class="danger">Danger</button>
		</div>
	</section>

	<section id="tokens-floater">
		<h2>Floater viewport budget — <code>--set-floater-*</code></h2>
		<p>
			Single source of truth for how a top-layer / native popover panel (popover, tooltip, toast,
			dropdown, drawer) respects the viewport edge on every form factor. Mirrors mailbox's
			<code>--bs-floater-*</code> token group; the floater mixins consume these through
			<code>var()</code> chains so a host-page retune at <code>:root</code> scope retunes every
			floater consumer at once.
		</p>
		<dl>
			<dt><code>--set-floater-gutter</code></dt>
			<dd>
				Live: <code>{{ read('--set-floater-gutter') }}</code
				>. Design-side minimum gap between a floating panel and the viewport edge.
			</dd>
			<dt>
				<code>--set-floater-inset-{top, bottom, start, end}</code>
			</dt>
			<dd>
				Live: top <code>{{ read('--set-floater-inset-top') }}</code
				>, bottom <code>{{ read('--set-floater-inset-bottom') }}</code
				>, start <code>{{ read('--set-floater-inset-start') }}</code
				>, end <code>{{ read('--set-floater-inset-end') }}</code
				>. <code>max(gutter, env(safe-area-inset-*))</code>
				so notched / rounded-corner devices keep clearance. Requires
				<code>&lt;meta name="viewport" content="… viewport-fit=cover"&gt;</code> for the env()
				values to resolve non-zero on iOS.
			</dd>
			<dt>
				<code>--set-floater-max-inline-size</code> / <code>--set-floater-max-block-size</code>
			</dt>
			<dd>
				Live: inline <code>{{ read('--set-floater-max-inline-size') }}</code
				>, block <code>{{ read('--set-floater-max-block-size') }}</code
				>. Dynamic-viewport (<code>dvw</code> / <code>dvh</code>) units keep the budget honest when
				mobile browser chrome (Safari URL bar) shows or hides.
			</dd>
		</dl>
	</section>

	<section id="tokens-icons">
		<h2>Icon registry — <code>--set-icon-*</code></h2>
		<p>
			Single overridable inline-SVG library for every chrome glyph the framework paints. Defaults
			are URL-encoded inline data: URLs (zero asset requests). Every glyph is a 16×16 viewBox at
			<code>stroke-width='2'</code> with <code>stroke='currentColor'</code>, so the same value works
			as either <code>background-image</code> (paints the stroke directly) or
			<code>mask-image</code> (drives the SHAPE, tint comes from the consumer's
			<code>background-color: currentColor</code> on the masked pseudo).
		</p>
		<p>
			Consumer swaps a single icon (<code>--set-icon-check</code>) or the whole set (heroicons /
			lucide / etc.) without forking framework partials:
		</p>
		<pre><code>:root {
  --set-icon-chevron-down: url("/icons/heroicons/chevron-down.svg");
}</code></pre>
		<div
			class="cluster"
			style="gap: calc(var(--spacing) * 2); --icon-color: var(--color-text); align-items: stretch"
		>
			<article
				v-for="icon in icons"
				:key="icon.token"
				style="
					display: flex;
					align-items: center;
					gap: var(--spacing);
					padding-block: calc(var(--spacing) * 1.5);
					padding-inline: calc(var(--spacing) * 2);
					inline-size: 18rem;
				"
			>
				<i
					aria-hidden="true"
					:style="{
						display: 'inline-block',
						inlineSize: '1.25rem',
						blockSize: '1.25rem',
						backgroundColor: 'currentColor',
						maskImage: `var(${icon.token})`,
						maskRepeat: 'no-repeat',
						maskPosition: 'center',
						maskSize: 'contain',
					}"
				></i>
				<div style="display: flex; flex-direction: column; gap: 0.125rem; min-inline-size: 0">
					<strong>{{ icon.label }}</strong>
					<code style="font-size: 0.75em; opacity: 0.7">{{ icon.token }}</code>
				</div>
			</article>
		</div>
	</section>

	<section id="tokens-summary-marker">
		<h2>Disclosure marker — <code>--set-summary-marker-{image, open-rotate}</code></h2>
		<p>
			Declared at <code>:root</code> (not on <code>summary</code>) so per-instance overrides on any
			ancestor (<code>&lt;details style="--set-summary-marker-image: …"&gt;</code>) flow down
			naturally. The default rotates a chevron-right to chevron-down on <code>[open]</code>;
			consumers swapping the marker to a plus-sign typically want <code>45deg</code> (plus → ×).
		</p>
		<details>
			<summary>Default marker (chevron, 90deg rotate)</summary>
			<p style="margin-block: var(--spacing) 0">Standard <code>&lt;details&gt;</code> rotation.</p>
		</details>
		<details
			style="
				--set-summary-marker-image: var(--set-icon-plus);
				--set-summary-marker-open-rotate: 45deg;
				margin-block-start: calc(var(--spacing) * 2);
			"
		>
			<summary>Plus marker (rotates 45deg → ×)</summary>
			<p style="margin-block: var(--spacing) 0">
				This <code>&lt;details&gt;</code> declares
				<code>--set-summary-marker-image: var(--set-icon-plus)</code> +
				<code>--set-summary-marker-open-rotate: 45deg</code> inline. Same animation contract,
				different glyph.
			</p>
		</details>
	</section>

	<section id="tokens-variant-context">
		<h2>Variant context — <code>--set-variant-{color, border-width}</code></h2>
		<p>
			Cascade hooks the modifier classes set. Bare <code>:root</code> declares
			<code>--set-variant-color: currentColor</code> (so an element whose color chain falls through
			stays text-colored) and <code>--set-variant-border-width: 0</code> (so bare elements stay
			borderless until a variant modifier opts in). <code>--set-variant-background-color</code> and
			<code>--set-variant-border-color</code> are intentionally undeclared — a
			<code>var(…, fallback)</code> chain receives the fallback rather than a forced
			<code>transparent</code>.
		</p>
		<p>
			The variant palette itself (<code>--color-primary</code>,
			<code>--color-success-bg-subtle</code>, …) lives in the theme — see
			<a href="#/theme">ThemePage</a> for the four-tier cascade per variant.
		</p>
	</section>

	<section id="tokens-reduced-motion">
		<h2>Reduced motion + forced colors</h2>
		<p>
			Every animation and transition the framework declares is wrapped in
			<code>@include transition()</code> which pairs the value with a
			<code>@media (prefers-reduced-motion: reduce) { transition: none }</code> override. Toggle
			your OS reduced-motion preference (macOS: System Settings → Accessibility → Display → Reduce
			motion; Windows: Settings → Accessibility → Visual effects) and reload — every panel on this
			page snaps instead of tweening.
		</p>
		<p>
			Every interactive surface invokes <code>@include forced-colors { … }</code> so Windows High
			Contrast keeps the affordance visible. In Chrome DevTools: Rendering → Emulate CSS media
			feature <code>forced-colors: active</code>.
		</p>
	</section>

	<section id="tokens-reference">
		<h2>Reference</h2>
		<p>
			Every <code>:root</code>-scoped framework token. Per-tag tokens (<code>--set-button-*</code>,
			<code>--set-aside-padding-*</code>, …) live in the per-element guides — see
			<a href="https://github.com/" target="_blank" rel="noopener noreferrer">tokens.md</a> for the
			complete per-element catalog.
		</p>
		<dl>
			<dt><code>--set-transition-duration</code></dt>
			<dd>
				Small-tint transition duration (color / border / opacity fades). Default <code>150ms</code>.
			</dd>

			<dt><code>--set-motion-duration</code></dt>
			<dd>
				Substantial-reveal duration (drawers, dialogs, disclosures, alerts). Default
				<code>250ms</code>.
			</dd>

			<dt><code>--set-motion-timing-function</code></dt>
			<dd>
				Substantial-reveal curve. Default
				<code>cubic-bezier(0.32, 0.72, 0, 1)</code> (iOS-stiff-decel).
			</dd>

			<dt><code>--set-border-radius</code> / <code>--set-border-width</code></dt>
			<dd>Framework defaults consumed by per-component fallback chains.</dd>

			<dt><code>--set-radius-factor</code> / <code>--set-density-factor</code></dt>
			<dd>Global multipliers for corner rhythm and spacing rhythm.</dd>

			<dt><code>--set-gap</code> / <code>--set-stack-spacing</code></dt>
			<dd>Layout-primitive gap defaults.</dd>

			<dt><code>--set-sticky-offset</code></dt>
			<dd>Anchor-jump offset for consumers with a sticky toolbar.</dd>

			<dt>
				<code>--set-z-index-{sticky, fixed, dropdown, modal, popover, tooltip, toast}</code>
			</dt>
			<dd>Canonical layering order — Bootstrap-parity.</dd>

			<dt><code>--set-box-shadow-{small, base, large}</code></dt>
			<dd>Three elevation tiers for floating surfaces.</dd>

			<dt><code>--set-focus-box-shadow-{width, opacity}</code></dt>
			<dd>Sub-tokens for the canonical focus ring.</dd>

			<dt><code>--set-variant-{color, border-width}</code></dt>
			<dd>Cascade hooks; modifier classes set the matching background-color / border-color.</dd>

			<dt><code>--set-icon-*</code></dt>
			<dd>~25 inline-SVG mask URLs. Override one or the whole set.</dd>

			<dt>
				<code>--set-summary-marker-image</code> / <code>--set-summary-marker-open-rotate</code>
			</dt>
			<dd>Disclosure marker glyph + open-state rotation angle.</dd>

			<dt><code>--set-floater-{gutter, inset-*, max-inline-size, max-block-size}</code></dt>
			<dd>Viewport budget for top-layer floating panels.</dd>
		</dl>
	</section>
</template>
