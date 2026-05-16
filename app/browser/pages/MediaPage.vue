<script lang="ts" setup>
import { onMounted } from 'vue'

/**
 * MediaPage — the canonical reference for `<img>`, `<picture>`,
 * `<video>`, `<audio>`, `<canvas>`, `<svg>`, `<iframe>`, `<embed>`,
 * `<object>`.
 *
 * API surface coverage (Phase 1 audit):
 *   `<img>` — Tailwind preflight ships `display: block; max-width:
 *     100%`. The framework adds `block-size: auto` (so an explicit
 *     `height` attribute doesn't squash on scale) and
 *     `vertical-align: middle` (inline images sit on the text midline
 *     not the baseline).
 *   `<picture>` — `display: contents` so the wrapper is invisible to
 *     the layout engine. Without this, a `<picture>` inside flex /
 *     grid introduces an extra inline box that confuses container
 *     queries and intrinsic sizing. Source switching semantics stay;
 *     only the layout box is suppressed.
 *   `<video>` — block-level, `max-inline-size: 100%`, `block-size:
 *     auto`, black background by default, optional border-radius via
 *     `--set-video-border-radius`. UA controls preserved.
 *   `<audio>` — full-width player (UA default is ~300px fixed). OS
 *     control bar preserved.
 *   `<canvas>` — capped at container width via
 *     `--set-canvas-max-inline-size`. Note: CSS size scales the
 *     rendered output, NOT the internal pixel grid (which is governed
 *     by `width` / `height` HTML attributes). Always set both for
 *     sharp HiDPI output.
 *   `<svg>` — same overflow-bound treatment as `<img>` / `<iframe>` /
 *     `<canvas>`. Capped at container width so viewBox-only inline
 *     SVGs don't overflow. Use `fill="currentColor"` to enable per-
 *     context theming via the `color` property.
 *   `<iframe>` — strips UA `border: 2px inset` and caps width.
 *     Aspect-ratio sits with consumers because every embed source
 *     has its own conventions.
 *   `<embed>` / `<object>` — same shape as `<iframe>`: max-width 100%
 *     so external plugin / PDF embeds don't blow out the layout.
 *
 * Cross-references:
 *   - `<figure>` + `<figcaption>` wrapping the media element lives on
 *     `FiguresPage` (next page in the roster) — that page demonstrates
 *     captioned image / code / table / pull-quote variants.
 *   - The framework's `<i class="icon">` mask-image pattern (per-icon
 *     `--icon` custom property) lives in `_i.scss` and is the right
 *     element for icon glyphs; bare inline `<svg>` is for full
 *     illustrations, not single-glyph icons.
 */

import {
	MEDIA_GRADIENT_THUMB_URI as gradientThumbDataUri,
	MEDIA_PORTRAIT_URI as portraitDataUri,
	MEDIA_SAMPLE_AUDIO_URL as sampleAudio,
	MEDIA_SAMPLE_VIDEO_URL as sampleVideo,
	MEDIA_WIDE_HERO_URI as wideHeroDataUri,
} from '../constants.js'

// `<canvas>` is fundamentally a JS-driven surface — the element's
// content comes from drawing commands, not from declarative CSS / HTML.
// This onMounted hook paints a small example (bar chart with the
// framework's primary color) so the demo canvas isn't empty. In real
// usage the consumer owns the drawing logic; the framework only ships
// the layout chrome (max-width + aspect-ratio preservation on scale).
onMounted(() => {
	const c = document.querySelector<HTMLCanvasElement>('[data-canvas-demo]')
	if (!c) return
	const ctx = c.getContext('2d')
	if (!ctx) return
	const w = c.width
	const h = c.height
	// Read the framework's primary color from the inherited :root.
	const css = getComputedStyle(c)
	const primary = css.getPropertyValue('--color-primary').trim() || '#2563eb'
	const text = css.getPropertyValue('--color-text').trim() || '#0f172a'
	// Faint baseline grid.
	ctx.strokeStyle = css.getPropertyValue('--color-border').trim() || '#e2e8f0'
	ctx.lineWidth = 1
	for (let y = 0; y <= h; y += 40) {
		ctx.beginPath()
		ctx.moveTo(0, y + 0.5)
		ctx.lineTo(w, y + 0.5)
		ctx.stroke()
	}
	// Bar chart — eight bars, decreasing heights.
	const heights = [180, 155, 130, 110, 95, 80, 65, 50]
	const gap = 8
	const barW = (w - gap * (heights.length + 1)) / heights.length
	ctx.fillStyle = primary
	for (let i = 0; i < heights.length; i += 1) {
		const x = gap + i * (barW + gap)
		const barH = heights[i]
		ctx.fillRect(x, h - barH, barW, barH)
	}
	// Title.
	ctx.fillStyle = text
	ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif'
	ctx.fillText('Canvas demo — bars painted via 2D context', 8, 18)
})
</script>

<template>
	<section id="media-intro">
		<hgroup>
			<h1>Media</h1>
			<p>
				The replaced-element family. <code>&lt;img&gt;</code> + <code>&lt;picture&gt;</code>,
				<code>&lt;video&gt;</code> + <code>&lt;audio&gt;</code>, <code>&lt;canvas&gt;</code>,
				<code>&lt;svg&gt;</code>, plus the embed family — <code>&lt;iframe&gt;</code>,
				<code>&lt;embed&gt;</code>, <code>&lt;object&gt;</code>. Each element ships UA defaults the
				framework either preserves, augments, or overrides per its layout contract.
			</p>
		</hgroup>
		<p>
			The unifying rule: media elements get <code>max-inline-size: 100%</code> so they bound to
			their container rather than pushing the page wider than the viewport. The two structural
			outliers are <code>&lt;picture&gt;</code> (which uses <code>display: contents</code> so the
			wrapper is invisible to flex / grid layout) and <code>&lt;video&gt;</code> (which paints a
			black background by default so the player chrome reads against any host surface).
		</p>
	</section>

	<section id="media-img">
		<h2><code>&lt;img&gt;</code></h2>
		<p>
			Tailwind preflight already ships <code>display: block; max-width: 100%</code>. The framework
			adds <code>block-size: auto</code> so an explicit <code>height</code> attribute doesn't squash
			the image when scaled, and <code>vertical-align: middle</code> so an inline image sits on the
			text midline (not the baseline, which leaves an awkward gap below).
		</p>
		<img
			:src="gradientThumbDataUri"
			alt="A blue-to-purple gradient sample image"
			width="480"
			height="320"
		/>
		<p>
			Inline-flow example — when a small
			<img
				:src="gradientThumbDataUri"
				alt=""
				width="20"
				height="20"
				class="inline"
				style="margin-inline: 0.25em"
			/>
			image sits in prose, the framework's <code>vertical-align: middle</code> keeps it aligned with
			the surrounding text midline rather than the baseline.
		</p>
	</section>

	<section id="media-picture">
		<h2><code>&lt;picture&gt;</code></h2>
		<p>
			The framework sets <code>display: contents</code> on <code>&lt;picture&gt;</code> so its
			wrapper box is invisible to the layout engine. Without this rule, a
			<code>&lt;picture&gt;</code> inside flex / grid introduces an extra inline box that confuses
			intrinsic sizing and container queries. With it, the parent layout sees the inner
			<code>&lt;img&gt;</code>
			directly — exactly as if the wrapper weren't there. Source-switching semantics still work
			normally.
		</p>
		<picture>
			<source media="(min-width: 900px)" :srcset="wideHeroDataUri" />
			<source media="(min-width: 500px)" :srcset="gradientThumbDataUri" />
			<img
				:src="portraitDataUri"
				alt="A pink-to-orange portrait sample image"
				width="320"
				height="480"
			/>
		</picture>
		<p>
			Resize the viewport — below 500px the portrait gradient (pink/orange) renders; between 500px
			and 900px the square thumb (blue/purple); 900px and up the wide hero (teal/cyan). One DOM,
			three sources, layout-invisible wrapper.
		</p>
	</section>

	<section id="media-video">
		<h2><code>&lt;video&gt;</code></h2>
		<p>
			Block-level, <code>max-inline-size: 100%</code>, <code>block-size: auto</code>, black
			background by default. The black background isn't decorative — it ensures the UA control bar
			reads against the player surface even when the host page background is light. Use
			<code>--set-video-border-radius</code> to round the corners to match an enclosing card.
		</p>
		<video :src="sampleVideo" controls preload="metadata" width="640" height="360">
			Your browser doesn't support embedded video.
		</video>
	</section>

	<section id="media-video-rounded">
		<h2><code>&lt;video&gt;</code> with rounded corners</h2>
		<p>
			Per-instance override of <code>--set-video-border-radius</code> (this is the canonical pattern
			for any per-element token override — set it inline or via a parent class, no need to declare a
			modifier just for radius).
		</p>
		<video
			:src="sampleVideo"
			controls
			preload="metadata"
			width="640"
			height="360"
			style="--set-video-border-radius: 0.75rem"
		>
			Your browser doesn't support embedded video.
		</video>
	</section>

	<section id="media-audio">
		<h2><code>&lt;audio&gt;</code></h2>
		<p>
			The UA default is a ~300px fixed-width player; the framework opts the audio control bar to
			fill its container (<code>inline-size: 100%</code>) so it reads as a first-class media row
			inside a card / list / article. The OS control chrome stays intact.
		</p>
		<audio :src="sampleAudio" controls preload="metadata">
			Your browser doesn't support embedded audio.
		</audio>
	</section>

	<section id="media-canvas">
		<h2><code>&lt;canvas&gt;</code></h2>
		<p>
			Same overflow-bound treatment as <code>&lt;img&gt;</code> / <code>&lt;iframe&gt;</code>:
			capped at container width. The internal pixel grid is governed by the <code>width</code> /
			<code>height</code> HTML attributes, not the CSS size — set BOTH for sharp HiDPI output. The
			CSS rule only ensures the canvas surface respects the layout container.
		</p>
		<canvas width="480" height="200" data-canvas-demo>
			Your browser doesn't support the canvas element.
		</canvas>
		<p>
			The demo canvas above is rendered statically via a small inline script in the showcase page
			bootstrap. In production, consumers drive canvas content via their own JS — the framework only
			owns the layout chrome (max-width + aspect-ratio preservation on scale).
		</p>
	</section>

	<section id="media-svg">
		<h2><code>&lt;svg&gt;</code></h2>
		<p>
			Inline SVG gets the same <code>max-inline-size: 100%</code> +
			<code>block-size: auto</code> treatment as <code>&lt;img&gt;</code>. The framework's
			per-context color theming hook is <code>fill="currentColor"</code> on the SVG's path — the
			color property cascades through to the SVG paint, so the same asset retints based on its host
			context. (For single-glyph icons, prefer <code>&lt;i class="icon"&gt;</code> with a mask-image
			token — see <code>_i.scss</code>; bare inline <code>&lt;svg&gt;</code> is for full
			illustrations.)
		</p>
		<svg
			viewBox="0 0 240 120"
			style="max-inline-size: 240px; color: var(--color-primary)"
			aria-hidden="true"
		>
			<rect x="10" y="10" width="40" height="100" fill="currentColor" />
			<rect x="60" y="30" width="40" height="80" fill="currentColor" opacity="0.7" />
			<rect x="110" y="50" width="40" height="60" fill="currentColor" opacity="0.5" />
			<rect x="160" y="70" width="40" height="40" fill="currentColor" opacity="0.35" />
			<rect x="210" y="90" width="20" height="20" fill="currentColor" opacity="0.2" />
		</svg>
		<p>
			The same SVG asset reading <code>fill="currentColor"</code> retints when its parent's text
			color changes — here it follows <code>--color-primary</code>. There is no SVG-specific
				variant rule (<code>_svg.scss</code> ships none): the SVG inherits whatever
				<code>color</code> the cascade resolves, so any ancestor that sets it — a variant's
				on-canvas text colour, a theme flip, an explicit override — retints the asset for free.
		</p>
		<div class="inline-block" style="color: var(--color-success)">
			<svg viewBox="0 0 240 120" style="max-inline-size: 240px" aria-hidden="true">
				<circle cx="120" cy="60" r="50" fill="currentColor" opacity="0.8" />
				<circle cx="80" cy="60" r="30" fill="currentColor" opacity="0.5" />
				<circle cx="160" cy="60" r="30" fill="currentColor" opacity="0.5" />
			</svg>
		</div>
	</section>

	<section id="media-iframe">
		<h2><code>&lt;iframe&gt;</code></h2>
		<p>
			The UA ships <code>border: 2px inset</code> on <code>&lt;iframe&gt;</code> — an ancient
			default that reads as visual noise on modern surfaces. The framework strips it (via
			<code>--set-iframe-border-width: 0</code>) and caps width to 100% of the container.
			Aspect-ratio sits with the consumer because every embed source has its own conventions — the
			framework just ensures the iframe never blows out the layout.
		</p>
		<iframe
			src="about:blank"
			title="Empty iframe example — replace `src` with your embed URL"
			width="640"
			height="240"
			style="background-color: var(--color-surface-raised)"
		></iframe>
		<p>
			The iframe above loads <code>about:blank</code> so the showcase stays self-contained.
			Real-world usage: a YouTube embed, a Stripe payment widget, a Calendly scheduler — the
			framework's only contribution is the chrome-strip + width-cap.
		</p>
	</section>

	<section id="media-embed">
		<h2><code>&lt;embed&gt;</code> and <code>&lt;object&gt;</code></h2>
		<p>
			Both elements predate <code>&lt;iframe&gt;</code> for embedding non-HTML resources (PDFs, SVGs
			as documents, legacy plugins). The framework gives them the same
			<code>max-inline-size: 100%</code> treatment so they bound cleanly to their container — no
			other chrome, no other defaults. Modern usage is rare; both elements are kept hydrated for the
			cases where they're the right tool (older PDF viewers, legacy embed conventions a consumer
			still ships).
		</p>
		<p>Markup contract:</p>
		<pre><code>&lt;embed src="document.pdf" type="application/pdf" /&gt;

&lt;object data="document.pdf" type="application/pdf"&gt;
  &lt;!-- Fallback content shown when the resource can't load --&gt;
  &lt;p&gt;Your browser can't display this PDF.
    &lt;a href="document.pdf"&gt;Download instead&lt;/a&gt;.&lt;/p&gt;
&lt;/object&gt;</code></pre>
	</section>

	<section id="media-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				<strong><code>&lt;img&gt;</code> must have an <code>alt</code> attribute</strong> — empty
				(<code>alt=""</code>) for purely decorative images, descriptive for content images. Screen
				readers announce the alt; missing alt forces them to fall back to the file name, which reads
				poorly.
			</li>
			<li>
				Set both <code>width</code> and <code>height</code> HTML attributes on
				<code>&lt;img&gt;</code> / <code>&lt;video&gt;</code> / <code>&lt;iframe&gt;</code> /
				<code>&lt;canvas&gt;</code> — the browser uses them to reserve the layout slot before the
				resource loads, eliminating cumulative layout shift (CLS).
			</li>
			<li>
				Prefer <code>&lt;picture&gt;</code> over CSS background-images for content imagery —
				<code>&lt;source&gt;</code> media queries are richer than CSS alone (resolution switching
				via <code>srcset</code>, format negotiation via <code>type</code>), and the framework's
				<code>display: contents</code> keeps the wrapper layout-neutral.
			</li>
			<li>
				<code>&lt;video&gt;</code> and <code>&lt;audio&gt;</code> should always set
				<code>preload="metadata"</code> (or <code>"none"</code> if the user is unlikely to play) —
				<code>preload="auto"</code> downloads the full asset eagerly, costing bandwidth before the
				user expresses intent.
			</li>
			<li>
				Set the <code>width</code> / <code>height</code> attributes on <code>&lt;canvas&gt;</code>
				to its intended pixel grid (e.g. 2× the display size for HiDPI sharpness), then size the
				rendered output via CSS. The CSS size scales the bitmap; only the HTML attributes control
				resolution.
			</li>
			<li>
				<code>&lt;iframe&gt;</code> embedding third-party content should set <code>sandbox</code> to
				drop unused permissions (<code>allow-scripts</code> and <code>allow-same-origin</code> are
				the most common opt-ins). Same-origin embeds rarely need sandboxing; cross-origin embeds
				almost always do.
			</li>
		</ul>
	</section>
</template>
