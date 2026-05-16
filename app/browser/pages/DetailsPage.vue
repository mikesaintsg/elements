<script lang="ts" setup>
/**
 * DetailsPage — the canonical reference for `<details>` + `<summary>`.
 *
 * API surface coverage (Phase 1 audit):
 *   - Bare `<details>` baseline — 1px bordered box, framework-tuned padding,
 *     `[open]` state attribute, smooth open/close via the
 *     `::details-content` pseudo (Chromium 131+ / Safari 18.4+) + global
 *     `interpolate-size: allow-keywords` for `block-size: 0 → auto` tween
 *   - `<summary>` chrome — chevron marker via mask-image (tracks
 *     `currentColor`), rotate on `[open]`, transitioned bottom margin so
 *     the gap doesn't snap when the body collapses
 *   - 7 variants — primary, secondary, tertiary, success, warning, danger,
 *     information (variant tints the border by default; `.filled` opts
 *     into a saturated surface fill via the same cascade as `<fieldset>`,
 *     `<aside>`, `<article>`)
 *   - 2 sizes — `.small` / default / `.large` cascade through padding +
 *     font-size + border-radius
 *   - 2 styles — `.subtle` (tinted bg + emphasis text + subtle border),
 *     `.filled` (saturated fill + white text on the body chrome)
 *   - Group accordion via `name=` — exclusive disclosure (one-open-at-a-
 *     time, UA-driven), no JS required
 *   - Non-exclusive accordion (no `name=`) — independent disclosures with
 *     the same `details + details` adjacent-margin rhythm
 *   - Nested `<details>` — disclosure inside a disclosure, indented via
 *     the parent's padding-inline
 *   - Custom marker via `--set-summary-marker-image` — swap to any inline
 *     SVG data URL (the framework's own `--set-icon-plus` / `--set-icon-
 *     chevron-down` / consumer-supplied)
 *   - Reduced-motion respect — every transition paired via
 *     `@include transition()`
 *   - Forced-colors documented (UA chrome survives)
 *
 * Cross-references:
 *   - `UseDetailsPage` (composable layer) will demonstrate programmatic
 *     `open()` / `close()`, `toggle` event handling, animated height
 *     measurement, and the JS-driven one-open-at-a-time accordion
 *     pattern for browsers that need to support pre-`name=`-attribute
 *     accordion groups (Safari pre-17, Firefox pre-110).
 */
import {
	DETAILS_PLUS_MARKER as plusMarker,
	DETAILS_SNIPPET_BARE as snippetBare,
	DETAILS_SNIPPET_CUSTOM_MARKER as snippetCustomMarker,
	DETAILS_SNIPPET_FLAT as snippetFlat,
	DETAILS_SNIPPET_FLUSH as snippetFlush,
	DETAILS_SNIPPET_GROUP as snippetGroup,
	DETAILS_SNIPPET_NESTED as snippetNested,
	DETAILS_SNIPPET_SIZES as snippetSizes,
	DETAILS_SNIPPET_STYLES as snippetStyles,
	DETAILS_SNIPPET_VARIANTS as snippetVariants,
	VARIANTS as variants,
} from '../constants.js'
</script>

<template>
	<section id="details-intro">
		<hgroup>
			<h1>Details</h1>
			<p>
				The native disclosure widget. The framework hydrates <code>&lt;details&gt;</code> as a
				1px-bordered box with breathing-room padding, paints the <code>&lt;summary&gt;</code> with a
				masked chevron marker that rotates on <code>[open]</code>, and wires the
				<code>::details-content</code> pseudo so the open / close transition tweens
				<code>block-size: 0 → auto</code> via the framework-global
				<code>interpolate-size: allow-keywords</code> declaration.
			</p>
		</hgroup>
		<p>
			Every demo below is real working markup driven by the native <code>[open]</code> attribute —
			no JS, no <code>useDetails</code>. The exclusive accordion uses HTML5's
			<code>name=</code> attribute; the framework owns spacing rhythm but doesn't fight the UA's
			open / close machinery.
		</p>
	</section>

	<section id="details-bare">
		<h2>Bare disclosure</h2>
		<p>
			Zero-class default: a bordered box with a summary, a chevron marker, and a smooth open / close
			tween. The framework's <code>--set-details-*</code> token chain mirrors
			<code>&lt;fieldset&gt;</code> — both are container elements that only tint their
			<em>border</em> via the variant cascade (you opt into a body fill with <code>.filled</code>).
		</p>
		<details>
			<summary>What is the framework's modifier cascade?</summary>
			<p>
				Variants, sizes, styles, and states compose orthogonally. Each modifier class sets context
				tokens (<code>--set-variant-background-color</code>,
				<code>--set-size-padding-inline</code>, etc.); the element baseline reads them through
				fallback chains so adding a class is the entire opt-in surface.
			</p>
		</details>
		<details open>
			<summary>Why <code>name=</code> for accordions?</summary>
			<p>
				Per the HTML5 spec, <code>&lt;details name="faq"&gt;</code> puts the group into exclusive
				accordion mode: opening one auto-closes the siblings sharing the same <code>name=</code>.
				Browsers handle the open / close machinery; the framework only supplies vertical rhythm
				between sibling disclosures via <code>details + details { margin-block-start: … }</code>.
			</p>
		</details>
		<details>
			<summary>Does <code>[open]</code> persist across page reloads?</summary>
			<p>
				Not by default. The state lives in the DOM; consumers who want persistence write a cookie /
				<code>localStorage</code> hook on the <code>toggle</code> event. The framework stays out of
				state policy — see <code>UseDetailsPage</code> for the composable that wires `[open]` to a
				reactive ref.
			</p>
		</details>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetBare }}</code></pre>
		</details>
	</section>

	<section id="details-group">
		<h2>Exclusive accordion</h2>
		<p>
			<code>&lt;details name="…"&gt;</code> on every sibling puts the group into
			"one-open-at-a-time" mode. Open one panel; the others close automatically. No JavaScript
			required — the UA owns the open / close machinery. The framework's
			<code>details + details</code> adjacent-margin rule keeps the group readable as a coherent
			stack.
		</p>
		<details name="details-faq">
			<summary>How do variants compose with sizes?</summary>
			<p>
				Independently. A class like <code>.primary.large</code> writes
				<code>--set-variant-background-color</code> AND
				<code>--set-size-{padding,font-size,border-radius}</code>. The element reads both context
				tokens via <code>var()</code> fallback chains; the modifier-context cascade order is
				<code>style → variant → size → element-default</code>.
			</p>
		</details>
		<details name="details-faq">
			<summary>Where does the focus ring come from?</summary>
			<p>
				The framework's <code>focus-ring()</code> Sass mixin paints a variant-tinted ring via
				<code>--set-focus-box-shadow-width</code> + <code>--set-focus-box-shadow-opacity</code>.
				Every actionable element (<code>&lt;button&gt;</code>, <code>&lt;a&gt;</code>, every
				text-like <code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code>,
				<code>&lt;select&gt;</code>, range thumb, checkbox / radio) consumes the same tokens so the
				ring reads identically across every form control.
			</p>
		</details>
		<details name="details-faq">
			<summary>What about reduced motion?</summary>
			<p>
				Every framework <code>transition:</code> declaration is wrapped in the
				<code>@include transition()</code> mixin, which pairs the property tween with a
				<code>@media (prefers-reduced-motion: reduce)</code> opt-out. Disclosures included — flip
				<code>prefers-reduced-motion</code> on and the open / close becomes instant.
			</p>
		</details>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetGroup }}</code></pre>
		</details>
	</section>

	<section id="details-non-exclusive">
		<h2>Non-exclusive accordion</h2>
		<p>
			Omit <code>name=</code> and the siblings disclose independently — multiple can be open at
			once. The same <code>details + details</code> adjacent-margin keeps the group cohesive; the
			visual rhythm is identical to the exclusive flavor above.
		</p>
		<details>
			<summary>Task 1 — Migrate the token surface</summary>
			<p>Audit every <code>--set-*</code> declaration; mirror in <code>tokens.ts</code>.</p>
		</details>
		<details>
			<summary>Task 2 — Promote sectioning containers</summary>
			<p>
				Hydrate <code>&lt;main&gt;</code> / <code>&lt;section&gt;</code> /
				<code>&lt;hgroup&gt;</code>.
			</p>
		</details>
		<details>
			<summary>Task 3 — Build out the showcase roster</summary>
			<p>One page per element + composable; each gated on the per-page audit rubric.</p>
		</details>
	</section>

	<section id="details-variants">
		<h2>Variant cascade</h2>
		<p>
			Adding a variant class tints the border to <code>--set-variant-background-color</code>. Same
			contract as <code>&lt;fieldset&gt;</code>, <code>&lt;aside&gt;</code>,
			<code>&lt;article&gt;</code> — containers stay neutral by default; only the BORDER picks up
			the variant identity. To fill the body, opt into <code>.filled</code> (§Styles below).
		</p>
		<div class="stack">
			<details v-for="v in variants" :key="v" :class="v">
				<summary>
					<code>.{{ v }}</code>
				</summary>
				<p>
					<small>
						Variant border via <code>--set-variant-background-color</code>. Summary text inherits
						<code>--set-details-color</code> (currentColor by default).
					</small>
				</p>
			</details>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="details-sizes">
		<h2>Size cascade</h2>
		<p>
			<code>.small</code> and <code>.large</code> route through <code>--set-size-*</code> tokens
			that the details baseline reads via <code>var()</code> fallback. Padding + font-size +
			border-radius scale coherently — bare is the default.
		</p>
		<div class="stack">
			<details class="small">
				<summary>Small disclosure</summary>
				<p>Tighter padding, smaller summary font. Same chrome contract.</p>
			</details>
			<details>
				<summary>Default disclosure</summary>
				<p>Mid-tier padding, body-sized summary font.</p>
			</details>
			<details class="large">
				<summary>Large disclosure</summary>
				<p>Roomier padding, larger summary font.</p>
			</details>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="details-styles">
		<h2>Style cascade</h2>
		<p>
			Two style modifiers opt into pre-tuned chrome treatments:
			<code>.subtle</code> reads the variant's tinted-bg + emphasis-text + subtle-border triplet
			from the theme layer; <code>.filled</code> reads the saturated variant fill + white text pair.
			Both compose with the variant cascade — <code>.primary.subtle</code> reads the primary
			triplet, <code>.danger.filled</code> reads the danger fill.
		</p>
		<div class="stack">
			<details class="primary subtle">
				<summary>Subtle (primary)</summary>
				<p>
					<small>
						Tinted bg via <code>--color-primary-bg-subtle</code>, text via
						<code>--color-primary-text-emphasis</code>, border via
						<code>--color-primary-border-subtle</code>. Every variant retunes this triplet via
						<code>color-mix()</code> in <code>_theme.scss</code>.
					</small>
				</p>
			</details>
			<details class="success subtle">
				<summary>Subtle (success)</summary>
				<p><small>Same chrome, success-tuned palette.</small></p>
			</details>
			<details class="primary filled">
				<summary>Filled (primary)</summary>
				<p>
					<small>
						Saturated <code>--color-primary</code> fill with white text. Bare primary blue — the
						same surface a <code>.primary.filled</code> button paints.
					</small>
				</p>
			</details>
			<details class="warning filled">
				<summary>Filled (warning)</summary>
				<p>
					<small>
						The framework's variant cascade is symmetric: amber-700 fill with white text clears WCAG
						AA the same way primary blue-600 does.
					</small>
				</p>
			</details>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStyles }}</code></pre>
		</details>
	</section>

	<section id="details-flat">
		<h2>Flat — dissolve outer chrome at rest</h2>
		<p>
			<code>.flat</code> drops the disclosure's outer border + background at rest so the closed
			summary reads as a plain text line; hover reveals a neutral 4% backdrop + framework border;
			<code>[open]</code> restores the element's full <code>--set-details-*</code> chrome so an open
			disclosure reads as a contained region. The <code>&lt;summary&gt;</code> marker + click
			affordance is unchanged.
		</p>
		<div class="stack">
			<details class="flat">
				<summary>Neutral flat disclosure</summary>
				<p><small>Hover: neutral 4% backdrop. Open: framework's bare-details chrome.</small></p>
			</details>
			<details class="primary flat">
				<summary>Primary flat</summary>
				<p>
					<small>
						Variant cascade flows through to the open state — the primary-tinted bg / border / text
						reveals when opened, dissolves when closed.
					</small>
				</p>
			</details>
			<details class="success flat">
				<summary>Success flat</summary>
				<p><small>Same shape, success-tuned palette on open.</small></p>
			</details>
			<details class="danger flat">
				<summary>Danger flat</summary>
				<p><small>Danger-tinted on open; neutral on hover; dissolved at rest.</small></p>
			</details>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFlat }}</code></pre>
		</details>
	</section>

	<section id="details-flush">
		<h2>Flush — accordion-item shape</h2>
		<p>
			<code>.flush</code> drops all outer chrome (margin, border, radius, shadow) and inherits the
			host's <code>border-radius</code> so a stack of
			<code>&lt;details class="flush"&gt;</code> inside an <code>&lt;article&gt;</code> or any
			framed surface reads as one continuous region. The host owns the boundary; the framework
			doesn't paint internal dividers here so the consumer keeps full control over how items
			separate.
		</p>
		<article class="frame">
			<details class="flush">
				<summary>Item one</summary>
				<p>
					<small>
						No outer border, no radius, no margin. The host (this <code>&lt;article&gt;</code>)
						provides the perimeter; the details fuses in.
					</small>
				</p>
			</details>
			<details class="flush">
				<summary>Item two</summary>
				<p>
					<small>Inherits the article's border-radius for top / bottom corners via inherit.</small>
				</p>
			</details>
			<details class="flush">
				<summary>Item three</summary>
				<p>
					<small>Stack reads as one accordion surface, not three independent disclosures.</small>
				</p>
			</details>
		</article>
		<p>
			With variant text-emphasis on each item — variant cascade still reaches the summary text even
			when the outer chrome is dissolved:
		</p>
		<article class="frame">
			<details class="success flush">
				<summary>Success flush</summary>
				<p><small>Summary text picks up the success variant's text-emphasis color.</small></p>
			</details>
			<details class="warning flush">
				<summary>Warning flush</summary>
				<p><small>Same for warning — outer chrome dissolved, identity carries via text.</small></p>
			</details>
			<details class="danger flush">
				<summary>Danger flush</summary>
				<p><small>Danger emphasis on the summary line; no surrounding chrome.</small></p>
			</details>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFlush }}</code></pre>
		</details>
	</section>

	<section id="details-nested">
		<h2>Nested disclosures</h2>
		<p>
			A <code>&lt;details&gt;</code> inside another <code>&lt;details&gt;</code> is well-formed HTML
			— useful for progressive disclosure (FAQ inside a category, advanced settings inside a
			settings panel). The inner disclosure picks up the same chrome contract as the outer; the
			parent's <code>padding-inline</code> indents the child naturally.
		</p>
		<details open>
			<summary>Parent disclosure</summary>
			<p>
				Outer body content. The nested details below shares all the same chrome — same border, same
				marker, same transition.
			</p>
			<details>
				<summary>Child disclosure (level 1)</summary>
				<p>
					Inner body. Inset relative to the parent because <code>&lt;details&gt;</code>'s
					padding-inline applies recursively.
				</p>
				<details>
					<summary>Grandchild (level 2)</summary>
					<p>You can keep nesting; the chrome contract holds at every level.</p>
				</details>
			</details>
		</details>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetNested }}</code></pre>
		</details>
	</section>

	<section id="details-custom-marker">
		<h2>Custom marker</h2>
		<p>
			The chevron is painted via <code>mask-image: var(--set-summary-marker-image)</code> on the
			summary's <code>::before</code> pseudo — masking keeps the glyph tinted by
			<code>currentColor</code> instead of trapping a hardcoded color in the SVG. Override
			<code>--set-summary-marker-image</code> per-instance (or globally on <code>:root</code>) to
			swap in a plus sign, an arrow, a custom icon — anything that paints as a clean monochrome
			shape. Pair with <code>--set-summary-marker-open-rotate</code> to control the rotation on
			<code>[open]</code> (default is 90deg for the right-chevron; a plus sign rotates 45deg to
			become an X).
		</p>
		<details
			:style="{
				'--set-summary-marker-image': plusMarker,
				'--set-summary-marker-open-rotate': '45deg',
			}"
		>
			<summary>Plus marker — rotates to an X on open</summary>
			<p>
				The marker token resolves at the summary's
				<code>::before</code> pseudo via the mask-image cascade. Consumers can also retune globally
				— <code>:root { --set-summary-marker-image: url('chevron-down.svg') }</code> swaps the
				disclosure marker for every <code>&lt;summary&gt;</code> on the page in one declaration.
			</p>
		</details>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetCustomMarker }}</code></pre>
		</details>
	</section>

	<section id="details-motion">
		<h2>Smooth open / close</h2>
		<p>
			Native <code>&lt;details&gt;</code> traditionally snapped open with no transition — the
			disclosure body was either height-zero (hidden) or height-auto (visible) and there was no way
			to tween between them. Two recent platform features fixed this:
		</p>
		<ul>
			<li>
				<code>interpolate-size: allow-keywords</code> on <code>:root</code> lets
				<code>block-size: 0 ↔ auto</code> participate in transitions. The framework declares this
				globally in <code>_root.scss</code>.
			</li>
			<li>
				<code>::details-content</code> (Chromium 131+, Safari 18.4+) is the pseudo-element wrapping
				the disclosed body. The framework transitions <code>block-size</code> +
				<code>opacity</code> + <code>content-visibility</code> on this pseudo so the open / close
				feels like a real disclosure animation rather than a flicker.
			</li>
		</ul>
		<p>
			On engines that don't yet ship <code>::details-content</code>, the disclosure still works — it
			just snaps open without the height tween. No JS fallback needed.
		</p>
	</section>

	<section id="details-states-a11y">
		<h2>States, accessibility, and forced colors</h2>
		<p>
			<code>&lt;details&gt;</code>'s open state is the <code>[open]</code> attribute, NOT a
			<code>.open</code> class — the framework deliberately reads from the native attribute so
			consumers don't have to keep a class in sync with the DOM state. The
			<code>&lt;summary&gt;</code> element is keyboard-accessible by default: tab into the summary,
			press <kbd>Enter</kbd> or <kbd>Space</kbd> to toggle. The framework's
			<code>focus-ring()</code> paints the variant-tinted ring on <code>:focus-visible</code>.
		</p>
		<p>
			In <code>forced-colors: active</code> environments, the disclosure inherits Windows High
			Contrast system colors (<code>Canvas</code>, <code>CanvasText</code>,
			<code>Highlight</code> for focus) per the framework's per-element forced-colors blocks. The
			chevron marker is a masked monochrome glyph painted via
			<code>background-color: currentColor</code>, so it tracks
			<code>CanvasText</code> automatically in HC mode without a separate fallback rule.
		</p>
	</section>
</template>

<style scoped>
/* The framework's `.stack` rule lives at `components/_div.scss` and only
 * applies to `div.stack`. Wrap multi-element demo groups in a `<div>`
 * so the framework class targets the wrapper, providing the column-flex
 * rhythm without bespoke styling per page. */
</style>
