<script lang="ts" setup>
/**
 * FormSurfacesPage — the four pseudo-element surfaces that drive
 * cross-element form chrome.
 *
 * Each surface lives in `src/styles/surfaces/`:
 *
 *   - `:focus-visible` — keyboard-focus ring, variant-tinted via
 *     `--set-focus-color`. Form controls (`<input>` / `<textarea>` /
 *     `<select>`) opt out so they paint their own border + ring
 *     recipe. Every other focusable element (button, link, summary,
 *     custom `[tabindex]` widget) gets the surface ring.
 *   - `::placeholder` — form-control placeholder text. Tracks
 *     `currentColor` with partial opacity so it reads as "hint
 *     text" but stays linked to the field's variant.
 *   - `::marker` — list-item bullet / number / glyph. Muted via
 *     `--color-text-muted` so bullets read as structural hints
 *     rather than emphasis ink. Custom content tokenised.
 *   - `::selection` — highlighted-text background + foreground.
 *     Variant cascade reaches it via the parent scope's
 *     `--set-variant-background-color`, so selecting text inside
 *     a `.success` ancestor highlights success-tinted.
 *
 * API surface coverage:
 *   1. `:focus-visible` ring generic + variant-tinted demos.
 *   2. Form-control focus opt-out — input / textarea / select keep
 *      their own border + ring chrome.
 *   3. Forced-colors fallback (Highlight outline).
 *   4. `::placeholder` opacity + currentColor.
 *   5. `::marker` color + content + size-tracking via `font-size: em`.
 *   6. `::selection` variant cascade demo.
 *   7. Tokens reference.
 *
 * Cross-references:
 *   - [ButtonPage](#/button) — focus-ring composes per-variant.
 *   - [FormControlsPage](#/form-controls) — full form-control demos
 *     including `<input>` / `<textarea>` / `<select>` focus chrome.
 *   - [ListsPage](#/lists) — `::marker` in context with the list
 *     element baselines.
 */
import { ref } from 'vue'

const variants = ['primary', 'success', 'warning', 'danger', 'information'] as const

// Selection demo — let the user pick which variant context wraps
// the selectable paragraph, so the `::selection` cascade is visible.
const selectionVariant = ref<(typeof variants)[number]>('primary')
</script>

<template>
	<section id="form-surfaces-intro">
		<hgroup>
			<h1>Form surfaces</h1>
			<p>
				Four pseudo-element surfaces drive the framework's cross-element form chrome —
				<code>:focus-visible</code>, <code>::placeholder</code>, <code>::marker</code>, and
				<code>::selection</code>. Each lives in <code>src/styles/surfaces/</code> as its own partial
				so consumers retune one token at <code>:root</code> and every element that touches that
				surface follows.
			</p>
		</hgroup>
		<p>
			Pseudo-elements have stricter property whitelists than regular elements — only color-family
			properties apply inside <code>::marker</code> / <code>::selection</code>, only color / opacity
			in <code>::placeholder</code>. The surfaces' rule shapes are intentionally minimal; modifier
			classes and variant context on ancestor elements feed the values via the framework's variant
			cascade.
		</p>
	</section>

	<section id="form-surfaces-focus">
		<h2>1. <code>:focus-visible</code> — keyboard-focus ring</h2>
		<p>
			The browser determines whether a focus event was keyboard-driven (Tab, arrow keys, focus
			programmatically restored) or pointer-driven (mouse click, touch tap) and only matches
			<code>:focus-visible</code> for the keyboard case. The framework's surface paints a
			variant-tinted ring (<code>0 0 0 var(--set-focus-box-shadow-width)</code> of the variant color
			at 35 % opacity) so the focus signal reads against every variant + theme combo.
		</p>
		<p>Tab through the buttons below. Each rings in its own variant identity.</p>
		<div class="cluster gap-2">
			<button type="button">Bare focus ring</button>
			<button v-for="v in variants" :key="v" type="button" :class="['filled', v]">{{ v }}</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;button type="button" class="filled primary"&gt;Primary&lt;/button&gt;
&lt;button type="button" class="filled success"&gt;Success&lt;/button&gt;
&lt;!-- Focus ring auto-tints from `--set-variant-background-color`. --&gt;</code></pre>
		</details>

		<h3>Form-control opt-out — own border + ring chrome</h3>
		<p>
			<code>&lt;input&gt;</code> / <code>&lt;textarea&gt;</code> /
			<code>&lt;select&gt;</code> declare their own <code>&amp;:focus-visible</code> block in the
			elements layer so they paint border-color + box-shadow as ONE recipe. The surface uses
			<code>:focus-visible:not(:where(input, textarea, select))</code> so those three opt out and a
			<code>:user-invalid</code> + focus combination can paint a danger-tinted ring without the
			generic surface ring stomping it.
		</p>
		<form style="display: grid; gap: 0.75rem; max-inline-size: 24rem">
			<label>
				<small>Email</small>
				<input type="email" placeholder="you@example.com" />
			</label>
			<label>
				<small>Comments</small>
				<textarea rows="3" placeholder="Optional message…"></textarea>
			</label>
			<label>
				<small>Region</small>
				<select>
					<option>North America</option>
					<option>Europe</option>
					<option>Asia-Pacific</option>
				</select>
			</label>
		</form>
		<small
			>Tab through the controls — each rings with a tinted border + matching box-shadow, not the
			generic surface ring.</small
		>

		<h3>Forced-colors fallback</h3>
		<p>
			In Windows High Contrast (<code>forced-colors: active</code>) the UA strips custom
			<code>box-shadow</code> rings. The surface ships a paired
			<code>outline: 2px solid Highlight; outline-offset: 2px;</code> declaration inside the
			framework's <code>forced-colors</code> mixin so the focus signal survives HC mode. Verify in
			Chrome DevTools → Rendering → "Emulate CSS media feature forced-colors: active."
		</p>
	</section>

	<section id="form-surfaces-placeholder">
		<h2>2. <code>::placeholder</code> — input / textarea hint text</h2>
		<p>
			Placeholder text in <code>&lt;input&gt;</code> and <code>&lt;textarea&gt;</code> reads through
			<code>currentColor</code> with <code>opacity: 0.6</code> by default, so it stays linked to the
			form control's own text color but reads visually subdued — "this is a hint, not a value." A
			variant class on the control retints the placeholder via the same
			<code>currentColor</code> chain (a <code>&lt;input class="danger"&gt;</code> shows a
			danger-tinted placeholder).
		</p>
		<form style="display: grid; gap: 0.75rem; max-inline-size: 24rem">
			<label>
				<small>Bare input</small>
				<input type="text" placeholder="Type a name…" />
			</label>
			<label>
				<small>Email pattern</small>
				<input type="email" placeholder="you@example.com" />
			</label>
			<label>
				<small>Textarea</small>
				<textarea
					rows="2"
					placeholder="Optional message — the placeholder fades to 60% opacity by default."
				></textarea>
			</label>
		</form>
		<p>
			Forced-colors fallback flips the placeholder color to <code>GrayText</code> (the system
			"secondary text" keyword) at full opacity so the hint survives custom-color stripping.
		</p>
	</section>

	<section id="form-surfaces-marker">
		<h2>3. <code>::marker</code> — list-item bullet / number / glyph</h2>
		<p>
			Default UA markers paint at <code>currentColor</code>, which makes a long body of text with
			bullets read "ink-heavy" — the bullet has the same weight as the text. The framework's surface
			mutes the marker to <code>--color-text-muted</code> (slate-600 in light, slate-400 in dark) so
			bullets read as structural hints rather than emphasis.
		</p>
		<h3>Default mute — disc, decimal, lower-alpha</h3>
		<ul>
			<li>List items use a muted bullet by default.</li>
			<li>
				The marker tracks the parent's <code>font-size</code> via the UA's <code>em</code> sizing.
			</li>
			<li>
				Nested lists switch to <code>circle</code> / <code>square</code> per the framework's UA
				cascade restore.
			</li>
		</ul>
		<ol>
			<li>Decimal markers also paint muted.</li>
			<li>
				Nested ordered lists switch to <code>lower-alpha</code>.
				<ol>
					<li>Like this.</li>
					<li>And so on (third-level becomes <code>lower-roman</code>).</li>
				</ol>
			</li>
			<li>Bottom item back at the root level.</li>
		</ol>

		<h3>Custom content via <code>--set-marker-content</code></h3>
		<p>
			The token defaults to <code>normal</code> (use the UA-generated marker from
			<code>list-style-type</code>). Override at any scope to inject a custom glyph — string
			constant, counter, attribute reference, etc. Pseudo-element property whitelist applies:
			<code>color</code>, <code>content</code>, <code>font-*</code>, transitions / animations are
			the only properties <code>::marker</code> respects.
		</p>
		<ul style="--set-marker-content: '› '; --set-marker-color: var(--color-primary)">
			<li>Custom <code>'› '</code> marker, primary-tinted.</li>
			<li>Override at any scope — <code>:root</code>, parent, list element.</li>
			<li>Other tokens (<code>--set-marker-color</code>) still apply.</li>
		</ul>
	</section>

	<section id="form-surfaces-selection">
		<h2>4. <code>::selection</code> — highlighted text</h2>
		<p>
			The surface paints selected text with the variant's background color at
			<strong>25 % opacity</strong> + the framework's strong text color
			(<code>--color-text-strong</code>) on top. Reduced opacity keeps the highlighted characters
			legible — selection painted at full opacity can hide light text on dark bg in some
			anti-aliasing paths.
		</p>
		<p>
			A variant class on an ancestor retunes <code>--set-variant-background-color</code> in its
			subtree, and <code>::selection</code> reads through that token via <code>color-mix()</code>.
			Switch the variant below and select text inside the paragraph that follows to see the cascade.
		</p>
		<menu>
			<li v-for="v in variants" :key="v">
				<button
					type="button"
					:class="['small', v, selectionVariant === v ? 'filled' : 'subtle']"
					@click="selectionVariant = v"
				>
					{{ v }}
				</button>
			</li>
		</menu>
		<div
			:class="selectionVariant"
			style="
				padding: 1rem;
				border-radius: 0.5rem;
				margin-block-start: 1rem;
				--set-style-background-color: transparent;
			"
		>
			<p>
				Select this paragraph to see the <strong>{{ selectionVariant }}</strong> tint. The surface
				paints <code>color-mix(--set-variant-background-color 25%, transparent)</code> +
				<code>--color-text-strong</code> — both contrast tiers are theme-aware, so the highlighted
				text stays legible in light AND dark mode without per-theme overrides.
			</p>
		</div>
	</section>

	<section id="form-surfaces-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			None of the four surfaces ship animations. The focus ring transitions
			<code>box-shadow</code> via the button baseline's transition list (also reduced-motion- gated
			through <code>@include transition()</code>). Placeholder / marker / selection repaint
			instantly on state changes.
		</p>
	</section>

	<section id="form-surfaces-forced-colors">
		<h2>Forced colors</h2>
		<p>Each surface ships a forced-colors fallback in its partial:</p>
		<ul>
			<li>
				<strong><code>:focus-visible</code></strong> — custom box-shadow stripped; a 2 px
				<code>Highlight</code> outline with <code>outline-offset: 2px</code> takes over so the focus
				signal survives HC mode.
			</li>
			<li>
				<strong><code>::placeholder</code></strong> — color flattens to <code>GrayText</code>
				(canonical "secondary text" system keyword) at full opacity.
			</li>
			<li>
				<strong><code>::marker</code></strong> — paints via the UA cascade; bullet glyphs still
				appear at <code>CanvasText</code>.
			</li>
			<li>
				<strong><code>::selection</code></strong> — UA paints with the system
				<code>Highlight</code> / <code>HighlightText</code> pair regardless of custom tokens.
			</li>
		</ul>
	</section>

	<section id="form-surfaces-tokens">
		<h2>Tokens</h2>

		<h3><code>:focus-visible</code></h3>
		<dl>
			<dt><code>--set-focus-color</code></dt>
			<dd>
				Ring colour. Resolves through <code>--set-variant-background-color</code> →
				<code>--color-primary</code>.
			</dd>
			<dt><code>--set-focus-box-shadow-width</code></dt>
			<dd>Ring thickness. Default <code>0.1875rem</code> (3 px).</dd>
			<dt><code>--set-focus-box-shadow-opacity</code></dt>
			<dd>Ring opacity multiplier on the variant colour. Default <code>0.35</code>.</dd>
		</dl>

		<h3><code>::placeholder</code></h3>
		<dl>
			<dt><code>--set-placeholder-color</code></dt>
			<dd>
				Placeholder text colour. Default <code>currentColor</code> — tracks the form control's
				variant cascade.
			</dd>
			<dt><code>--set-placeholder-opacity</code></dt>
			<dd>Opacity multiplier. Default <code>0.6</code>.</dd>
		</dl>

		<h3><code>::marker</code></h3>
		<dl>
			<dt><code>--set-marker-color</code></dt>
			<dd>
				Bullet / number colour. Default <code>--color-text-muted</code> (slate-600 in light,
				slate-400 in dark).
			</dd>
			<dt><code>--set-marker-content</code></dt>
			<dd>
				Marker glyph. Default <code>normal</code> (use UA marker from <code>list-style-type</code>).
				Override per consumer for custom glyphs: <code>--set-marker-content: '› '</code>.
			</dd>
		</dl>

		<h3><code>::selection</code></h3>
		<dl>
			<dt><code>--set-selection-background-color</code></dt>
			<dd>
				Highlight tint. Default
				<code>color-mix(--set-variant-background-color 25%, transparent)</code> with
				<code>--color-primary</code> fallback.
			</dd>
			<dt><code>--set-selection-color</code></dt>
			<dd>
				Highlighted text colour. Default <code>--color-text-strong</code> (canvas- contrasting
				strong text — slate-950 in light, white in dark).
			</dd>
		</dl>
	</section>
</template>
