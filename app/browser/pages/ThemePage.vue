<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useTheme } from '@elements/browser'
import { useRootCssVars } from '../composables.js'

/**
 * ThemePage — the canonical reference for the framework's theme +
 * variant-palette surface. Every `--color-*` token in
 * `src/styles/_theme.scss` is surfaced here with live values + a
 * retune playground.
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Theme controller — `useTheme()` exposes `setting` (user
 *     preference: 'light' / 'dark' / 'system'), `mode` (resolved
 *     'light' / 'dark'), `set()`, `toggle()`. Pins via `data-theme=
 *     {light|dark}` on `<html>`; falls through to
 *     `@media (prefers-color-scheme: dark)` when setting === 'system'.
 *
 *   Variant palette — 7 variants (primary, secondary, tertiary,
 *     success, warning, danger, information). Each variant exposes
 *     5 color tokens:
 *       --color-{variant}              the saturated identity color
 *       --color-{variant}-bg-subtle    tinted bg for cards / alerts
 *       --color-{variant}-text-emphasis emphasized text inside subtle bg
 *       --color-{variant}-border-subtle subtle border tint
 *       --color-{variant}-on-canvas    WCAG-AA text color on body canvas
 *     The 4 tier tokens are derived via `color-mix(in oklab, …)` so
 *     they retune automatically when the saturated base shifts.
 *
 *   Base palette — non-variant background / text / border / inverted
 *     tiers:
 *       canvas       --color-canvas / --color-surface / --color-surface-raised
 *       text         --color-text / --color-text-strong / --color-text-muted
 *                    / --color-text-subtle
 *       border       --color-border / --color-border-strong / --color-border-subtle
 *       inverted     --color-inverted / --color-inverted-text
 *
 *   Light / dark cascade — `:root` declares the light palette;
 *     `[data-theme='dark']` and `@media (prefers-color-scheme: dark)`
 *     in `_theme.scss` re-declare the same tokens with dark values.
 *     `color-scheme: light dark` on `:root` opts UA chrome into the
 *     same transition.
 *
 * Cross-references:
 *   - TokensPage covers the global structural tokens (motion,
 *     elevation, focus, icons, etc.).
 *   - ModifiersPage covers how `.{variant}` modifier classes consume
 *     the palette via the `--set-variant-*` cascade hooks.
 */

const themeCtl = useTheme()

import type { ThemePaletteEntry } from '../types.js'
import { THEME_TIERS as tiers, VARIANTS as variants } from '../constants.js'

// Live :root reads — re-sampled on mount + on every theme flip.
const { read, write, clear } = useRootCssVars()

// ── Brand retune playground ────────────────────────────────────────────────
//
// Consumer pins `--color-primary` (or any variant base) and watches the
// four-tier cascade re-derive across the page. The input is a native
// `<input type="color">` so the user picks any hue; we write the hex
// back to `--color-primary` on `<html>`. The variant tier tokens
// (--color-primary-bg-subtle, etc.) re-derive automatically because
// they're declared via `color-mix(in oklab, var(--color-primary) …)`.

const brandColor = ref('#3b82f6') // default ≈ blue-600
const brandColorActive = ref(false)

const applyBrand = (): void => {
	write('--color-primary', brandColor.value)
	brandColorActive.value = true
}

const resetBrand = (): void => {
	clear('--color-primary')
	brandColor.value = '#3b82f6'
	brandColorActive.value = false
}

// ── Swatch generator helpers ───────────────────────────────────────────────

const variantBases = computed<readonly ThemePaletteEntry[]>(() =>
	variants.map((v) => ({
		token: `--color-${v}`,
		label: v,
		resolved: read(`--color-${v}`),
	})),
)

const variantTiers = computed<readonly { variant: string; entries: readonly ThemePaletteEntry[] }[]>(
	() =>
		variants.map((v) => ({
			variant: v,
			entries: tiers.map((tier) => ({
				token: `--color-${v}-${tier}`,
				label: tier,
				resolved: read(`--color-${v}-${tier}`),
			})),
		})),
)

const canvasTier = computed<readonly ThemePaletteEntry[]>(() => [
	{ token: '--color-canvas', label: 'canvas', resolved: read('--color-canvas') },
	{ token: '--color-surface', label: 'surface', resolved: read('--color-surface') },
	{
		token: '--color-surface-raised',
		label: 'surface-raised',
		resolved: read('--color-surface-raised'),
	},
])

const textTier = computed<readonly ThemePaletteEntry[]>(() => [
	{ token: '--color-text', label: 'text', resolved: read('--color-text') },
	{ token: '--color-text-strong', label: 'text-strong', resolved: read('--color-text-strong') },
	{ token: '--color-text-muted', label: 'text-muted', resolved: read('--color-text-muted') },
	{ token: '--color-text-subtle', label: 'text-subtle', resolved: read('--color-text-subtle') },
])

const borderTier = computed<readonly ThemePaletteEntry[]>(() => [
	{ token: '--color-border', label: 'border', resolved: read('--color-border') },
	{
		token: '--color-border-strong',
		label: 'border-strong',
		resolved: read('--color-border-strong'),
	},
	{
		token: '--color-border-subtle',
		label: 'border-subtle',
		resolved: read('--color-border-subtle'),
	},
])

// Inverted tier — no array because the two tokens (`--color-inverted` +
// `--color-inverted-text`) are a tightly-coupled pair that must render
// together, not as parallel swatches. The template reads each token
// directly via `read(...)` to display its resolved value in the worked
// pair-demo card.
</script>

<template>
	<section id="theme-intro">
		<hgroup>
			<h1>Theme</h1>
			<p>
				The framework's color palette — light + dark, semantic variants, four-tier cascade per
				variant, base canvas / text / border tiers, inverted accent.
			</p>
		</hgroup>
		<p>
			The theme is declared as a Tailwind v4 <code>@theme</code> block in
			<code>src/styles/_theme.scss</code>, so every <code>--color-*</code> token participates in
			Tailwind's utility generators AND cascades to the framework's variant chrome. The four-tier
			cascade per variant (<code>--color-{`{variant}`}-bg-subtle</code> /
			<code>-text-emphasis</code> / <code>-border-subtle</code> / <code>-on-canvas</code>) is
			derived via <code>color-mix(in oklab, …)</code> so retuning the saturated base
			(<code>--color-primary</code>) automatically retunes its four downstream tiers.
		</p>
		<p>
			Light + dark switch via <code>data-theme</code> on <code>&lt;html&gt;</code>. The
			<code>useTheme</code> composable handles user-pinned + OS-follow modes; the page sidebar's sun
			/ moon button is one usage. <strong>Tokens vs theme:</strong> structural tokens
			(<code>--set-*</code>) live on TokensPage; this page covers the COLOR surface.
		</p>
	</section>

	<section id="theme-switcher">
		<h2>Theme switcher — <code>useTheme()</code></h2>
		<p>
			<code>useTheme()</code> exposes <code>setting</code> (user preference:
			<code>'light' / 'dark' / 'system'</code>), <code>mode</code> (resolved
			<code>'light' / 'dark'</code>), <code>set()</code>, and <code>toggle()</code>. When
			<code>setting === 'system'</code> (the default), <code>&lt;html&gt;</code> carries no
			<code>data-theme</code> attribute and the framework's
			<code>@media (prefers-color-scheme: dark)</code> rule in <code>_theme.scss</code> handles the
			OS-follow on its own — no JS rewrite when the OS preference flips.
		</p>
		<form class="row" @submit.prevent>
			<label>
				<span>Setting</span>
				<select
					:value="themeCtl.setting.value"
					@change="
						(e) =>
							themeCtl.set((e.target as HTMLSelectElement).value as 'light' | 'dark' | 'system')
					"
				>
					<option value="system">system (OS follows)</option>
					<option value="light">light (pinned)</option>
					<option value="dark">dark (pinned)</option>
				</select>
			</label>
			<button type="button" class="primary" @click="themeCtl.toggle()">Toggle light ↔ dark</button>
		</form>
		<dl>
			<dt><code>setting</code></dt>
			<dd>
				Live: <code>{{ themeCtl.setting.value }}</code
				>. User's preference. Persists in <code>localStorage</code> by default; opt out via
				<code>useTheme({ storage: false })</code>.
			</dd>
			<dt><code>mode</code></dt>
			<dd>
				Live: <code>{{ themeCtl.mode.value }}</code
				>. The resolved mode currently rendering. Updates reactively when the OS preference flips (a
				<code>matchMedia</code> listener inside the factory keeps it in sync), so a sun / moon icon
				stays accurate even when <code>setting === 'system'</code>.
			</dd>
		</dl>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;script setup&gt;
import { useTheme } from '@elements/browser'

const theme = useTheme()
&lt;/script&gt;

&lt;template&gt;
  &lt;button @click="theme.toggle()"&gt;
    {{ theme.mode.value === 'dark' ? '☀' : '☾' }}
  &lt;/button&gt;
&lt;/template&gt;</code></pre>
		</details>
	</section>

	<section id="theme-variants">
		<h2>Variant palette — <code>--color-{`{variant}`}</code></h2>
		<p>
			Seven semantic identities. Each base is a saturated Tailwind palette color: primary →
			<code>blue-600</code>, success → <code>green-700</code>, danger → <code>red-700</code>, etc.
			(declared in <code>_theme.scss</code> § <code>@theme</code>). Retune any base at
			<code>:root</code> (or via a <code>@theme</code> block) and its four downstream tiers
			re-derive automatically.
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(11rem, 100%);
				--showcase-tile-grid-gap: 0.75rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article v-for="entry in variantBases" :key="entry.token" class="showcase-swatch">
				<div
					:style="{
						blockSize: '4.5rem',
						backgroundColor: `var(${entry.token})`,
					}"
				></div>
				<div class="showcase-swatch-meta">
					<strong class="capitalize">{{ entry.label }}</strong>
					<code class="showcase-swatch-label">{{ entry.token }}</code>
					<code class="showcase-swatch-label-quiet">{{ entry.resolved }}</code>
				</div>
			</article>
		</div>
	</section>

	<section id="theme-brand-retune">
		<h2>Brand retune — pin one color, watch the cascade</h2>
		<p>
			Pick a hue below to retune <code>--color-primary</code> globally. Every variant tier
			(<code>--color-primary-bg-subtle</code>, <code>--color-primary-text-emphasis</code>,
			<code>--color-primary-border-subtle</code>, <code>--color-primary-on-canvas</code>) re-derives
			from the new base via <code>color-mix(in oklab, …)</code>, so the alerts, buttons, badges,
			tags, focus rings, and active-row tints across the page (and the framework as a whole) all
			retune together. This is the live proof of the framework's customizability contract.
		</p>
		<form class="row items-center" @submit.prevent>
			<label>
				<span>Brand color</span>
				<input type="color" v-model="brandColor" @input="applyBrand" />
			</label>
			<output v-if="brandColorActive">
				<code>--color-primary</code>: <code>{{ brandColor }}</code>
			</output>
			<button type="button" class="subtle" @click="resetBrand">Reset</button>
		</form>
		<p>Cascade preview:</p>
		<div class="cluster justify-start">
			<button type="button" class="primary">Primary button</button>
			<span class="badge primary">Badge</span>
			<span class="tag primary">Tag</span>
			<span class="dot primary" aria-label="Status"></span>
			<a href="#" @click.prevent>Anchor</a>
		</div>
		<aside role="status" class="primary mt-4" data-alert-open>
			<p>
				<strong>Alert banner.</strong> Bg uses <code>--color-primary-bg-subtle</code>; the leading
				bar uses <code>--color-primary-text-emphasis</code>; the text uses
				<code>--color-primary-text-emphasis</code>; the perimeter uses
				<code>--color-primary-border-subtle</code>. All four re-derive from the chosen brand color.
			</p>
		</aside>
	</section>

	<section id="theme-tiers">
		<h2>Four-tier cascade per variant</h2>
		<p>
			Each variant exposes four derived tiers on top of the saturated base. The tier names map to
			specific cascade roles:
		</p>
		<dl>
			<dt><code>{`{variant}`}-bg-subtle</code></dt>
			<dd>
				Background fill for subtle cards / alerts / list-group rows. Mix of
				<code>variant 12%</code> + canvas (light) or <code>variant 15%</code> + canvas (dark). Reads
				as a tinted bg with WCAG headroom for foreground text.
			</dd>
			<dt><code>{`{variant}`}-text-emphasis</code></dt>
			<dd>
				Saturated text color for emphasized text on top of <code>bg-subtle</code>, OR the leading
				bar / accent edge on alerts. <code>70%</code> mix of variant + text (both modes) so the
				contrast scales with the dark / light text base.
			</dd>
			<dt><code>{`{variant}`}-border-subtle</code></dt>
			<dd>
				Subtle perimeter tint. Mix of <code>variant 35%</code> + canvas, so the border reads as a
				variant-aware rim that doesn't overpower the surface fill.
			</dd>
			<dt><code>{`{variant}`}-on-canvas</code></dt>
			<dd>
				Text color that clears WCAG AA against the page <strong>canvas</strong> (not against the
				variant bg). The earlier tiers cleared AA against <code>bg-subtle</code>; this tier handles
				the case where the variant text sits DIRECTLY on the body. Used by
				<code>&lt;a&gt;</code> baseline + nav active-row text. Bare
				<code>--color-primary</code> would fail AA on slate-950 in dark mode; this tier blends with
				text to recover contrast.
			</dd>
		</dl>
		<div v-for="block in variantTiers" :key="block.variant" class="mt-4">
			<h3 class="capitalize mb-2">
				{{ block.variant }}
			</h3>
			<div
				class="showcase-tile-grid"
				style="
					--showcase-tile-grid-min: min(12rem, 100%);
					--showcase-tile-grid-gap: 0.5rem;
					--showcase-tile-grid-flow: auto-fit;
				"
			>
				<article v-for="entry in block.entries" :key="entry.token" class="showcase-swatch">
					<div
						:style="{
							blockSize: '3.5rem',
							backgroundColor: `var(${entry.token})`,
						}"
					></div>
					<div class="showcase-swatch-meta-tight">
						<strong class="text-sm">{{ entry.label }}</strong>
						<code class="showcase-swatch-label-quiet">{{ entry.token }}</code>
					</div>
				</article>
			</div>
		</div>
	</section>

	<section id="theme-canvas">
		<h2>Canvas tier — backgrounds</h2>
		<p>
			Non-variant background tiers for layered surfaces. <code>canvas</code> is the body's bg;
			<code>surface</code> is a slightly raised plane (cards, popovers); <code>surface-raised</code>
			lifts further (code blocks, alerts on canvas).
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(12rem, 100%);
				--showcase-tile-grid-gap: 0.5rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article v-for="entry in canvasTier" :key="entry.token" class="frame">
				<div
					:style="{
						blockSize: '4rem',
						backgroundColor: `var(${entry.token})`,
					}"
				></div>
				<div class="showcase-swatch-meta-tight">
					<strong class="text-sm">{{ entry.label }}</strong>
					<code class="showcase-swatch-label-quiet">{{ entry.token }}</code>
				</div>
			</article>
		</div>
	</section>

	<section id="theme-text">
		<h2>Text tier — foreground</h2>
		<p>
			Four foreground intensities. <code>text</code> is the body default;
			<code>text-strong</code> emphasizes (matches <code>&lt;strong&gt;</code>);
			<code>text-muted</code> demotes (metadata, labels); <code>text-subtle</code> recedes further
			(placeholders, disabled hint).
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(12rem, 100%);
				--showcase-tile-grid-gap: 0.5rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article v-for="entry in textTier" :key="entry.token" class="p-2">
				<p
					:style="{
						color: `var(${entry.token})`,
						fontSize: '1.125rem',
						fontWeight: 500,
						margin: 0,
						marginBlockEnd: '0.5rem',
					}"
				>
					The quick brown fox
				</p>
				<strong class="text-sm">{{ entry.label }}</strong>
				<code class="showcase-swatch-label-quiet">{{ entry.token }}</code>
			</article>
		</div>
	</section>

	<section id="theme-border">
		<h2>Border tier — strokes</h2>
		<p>
			Three border intensities. <code>border</code> is the default 1px rule;
			<code>border-strong</code> emphasizes (focused inputs, active nav rails);
			<code>border-subtle</code> demotes (dividers between sibling rows that read more like rhythm
			than a hard line).
		</p>
		<div
			class="showcase-tile-grid"
			style="
				--showcase-tile-grid-min: min(12rem, 100%);
				--showcase-tile-grid-gap: 0.5rem;
				--showcase-tile-grid-flow: auto-fit;
			"
		>
			<article
				v-for="entry in borderTier"
				:key="entry.token"
				class="p-2"
				:style="{ border: `2px solid var(${entry.token})` }"
			>
				<strong class="text-sm">{{ entry.label }}</strong>
				<code class="showcase-swatch-label-quiet">{{ entry.token }}</code>
			</article>
		</div>
	</section>

	<section id="theme-inverted">
		<h2>Inverted tier — contrast accent</h2>
		<p>
			A single high-contrast surface for "always stands out" affordances — tooltip backgrounds,
			snackbar shells, focus highlights on subtle inputs. The two tokens are designed as a
			<strong>pair</strong>: <code>--color-inverted</code> is the surface fill,
			<code>--color-inverted-text</code> is the foreground for text + icons on top of it. In light
			mode the surface is near-black and the text is white; in dark mode the surface flips to
			near-white with dark text. Switch themes to see it pivot.
		</p>
		<article
			:style="{
				padding: 'calc(var(--spacing) * 4)',
				backgroundColor: 'var(--color-inverted)',
				color: 'var(--color-inverted-text)',
			}"
		>
			<h3 class="mb-2">Sample text on the inverted surface</h3>
			<p class="opacity-85">
				Background uses <code>--color-inverted</code>; this text uses
				<code>--color-inverted-text</code>. Both tokens resolve to:
			</p>
			<dl class="showcase-inverted-key-value mt-2">
				<dt><code>--color-inverted</code></dt>
				<dd>
					<code>{{ read('--color-inverted') }}</code>
				</dd>
				<dt><code>--color-inverted-text</code></dt>
				<dd>
					<code>{{ read('--color-inverted-text') }}</code>
				</dd>
			</dl>
		</article>
		<p class="mt-3">
			The two tokens are NOT meant to be used independently — using
			<code>--color-inverted-text</code> as a foreground over any other background (including the
			page canvas) will fail WCAG contrast in one of the two themes. Reach for
			<code>--color-text-strong</code> for "always-contrasted text" instead; reach for the pair only
			when you want the entire surface to invert.
		</p>
	</section>

	<section id="theme-data-attribute">
		<h2>How light / dark resolves</h2>
		<p>
			Three states; one CSS source of truth. The framework's <code>_theme.scss</code> declares the
			light palette on <code>:root</code>, then re-declares the dark palette under TWO selectors:
			<code>[data-theme='dark']</code> AND
			<code>@media (prefers-color-scheme: dark) :root:not([data-theme='light'])</code>. The
			media-query rule is the OS-follow path; the attribute rules are the user-pinned path.
		</p>
		<dl>
			<dt><code>html</code> with no <code>data-theme</code></dt>
			<dd>
				<strong>OS follow.</strong> The media query resolves to whichever the OS reports. JS leaves
				the attribute alone — when the OS preference flips, the page repaints automatically with no
				code path involved.
			</dd>
			<dt><code>&lt;html data-theme="light"&gt;</code></dt>
			<dd>
				<strong>Pinned light.</strong> The <code>:not([data-theme='light'])</code> guard on the
				media query keeps the dark palette from leaking in when the user explicitly chose light.
			</dd>
			<dt><code>&lt;html data-theme="dark"&gt;</code></dt>
			<dd><strong>Pinned dark.</strong> The <code>[data-theme='dark']</code> selector wins.</dd>
		</dl>
		<p>
			<code>color-scheme: light dark</code> on <code>:root</code> opts UA chrome (scrollbars, form
			controls, ::backdrop) into the same transition, so native widgets repaint alongside the
			framework's tokens.
		</p>
	</section>

	<section id="theme-customization">
		<h2>How + where to set theme tokens</h2>
		<p>
			Theme tokens are Tailwind-tracked, so the override surface differs slightly from the
			structural <code>--set-*</code> tokens documented on
			<a href="#/tokens/tokens-customization">TokensPage</a>. Two paths:
		</p>
		<h3>1. Tailwind <code>@theme</code> block — for the saturated bases</h3>
		<p>
			The variant bases (<code>--color-primary</code>, <code>--color-success</code>, …) are
			registered via <code>@theme</code>, which lets Tailwind generate utility classes and inject
			them into <code>:root</code>. Override in the consumer's entry CSS, after the framework
			imports:
		</p>
		<pre><code>@import 'tailwindcss';
@import '@elements/styles';

@theme {
  /* Retune the saturated bases. The four-tier cascade
     re-derives automatically via `color-mix(in oklab, …)`. */
  --color-primary: oklch(0.62 0.18 25);     /* warm red brand */
  --color-success: oklch(0.65 0.16 145);
  --color-danger:  oklch(0.55 0.22 25);

  /* Canvas / text / border tiers also live in @theme. */
  --color-canvas: oklch(0.99 0.005 90);
  --color-text:   oklch(0.18 0.02 250);
}</code></pre>

		<h3>2. <code>:root</code> override — for everything else (or per-mode tweaks)</h3>
		<p>
			Tier tokens (<code>--color-primary-bg-subtle</code>, etc.) can be overridden directly at
			<code>:root</code> if the derived value isn't quite what you want. Per-mode tweaks live under
			the matching selector:
		</p>
		<pre><code>:root {
  /* Override one tier directly without changing the base. */
  --color-primary-bg-subtle: color-mix(in oklab, var(--color-primary) 18%, var(--color-canvas));
}

[data-theme='dark'] {
  /* Per-mode tweak — the dark palette gets a deeper canvas. */
  --color-canvas: oklch(0.12 0.01 250);
}</code></pre>

		<h3>3. Scoped override — theme one part of the app</h3>
		<p>
			Any element scope can re-declare color tokens to override the cascade for that subtree. Useful
			for "always-dark" widgets or branded modules:
		</p>
		<pre><code>.always-dark {
  --color-canvas:  oklch(0.12 0.01 250);
  --color-text:    oklch(0.95 0.005 250);
  --color-surface: oklch(0.18 0.02 250);
  color-scheme: dark;
}</code></pre>
	</section>

	<section id="theme-reference">
		<h2>Reference</h2>
		<dl>
			<dt>Variant bases (7)</dt>
			<dd>
				<code>--color-primary</code>, <code>--color-secondary</code>, <code>--color-tertiary</code>,
				<code>--color-success</code>, <code>--color-warning</code>, <code>--color-danger</code>,
				<code>--color-information</code>.
			</dd>
			<dt>Variant tiers (7 × 4 = 28)</dt>
			<dd>
				For each base, four derived tokens:
				<code>{`{variant}`}-bg-subtle</code>, <code>{`{variant}`}-text-emphasis</code>,
				<code>{`{variant}`}-border-subtle</code>, <code>{`{variant}`}-on-canvas</code>.
			</dd>
			<dt>Canvas tier</dt>
			<dd>
				<code>--color-canvas</code>, <code>--color-surface</code>,
				<code>--color-surface-raised</code>.
			</dd>
			<dt>Text tier</dt>
			<dd>
				<code>--color-text</code>, <code>--color-text-strong</code>,
				<code>--color-text-muted</code>, <code>--color-text-subtle</code>.
			</dd>
			<dt>Border tier</dt>
			<dd>
				<code>--color-border</code>, <code>--color-border-strong</code>,
				<code>--color-border-subtle</code>.
			</dd>
			<dt>Inverted tier</dt>
			<dd>
				<code>--color-inverted</code>, <code>--color-inverted-text</code>. Always-contrasting accent
				surface for tooltips / snackbars / focus highlights.
			</dd>
			<dt>Variant cascade hooks (set by modifier classes)</dt>
			<dd>
				<code>--set-variant-color</code>, <code>--set-variant-background-color</code>,
				<code>--set-variant-border-color</code>, <code>--set-variant-border-width</code>. The
				<code>.{`{variant}`}</code> modifier rules in <code>modifiers/_variants.scss</code> set
				these from the variant palette; element baselines consume them.
			</dd>
		</dl>
	</section>
</template>
