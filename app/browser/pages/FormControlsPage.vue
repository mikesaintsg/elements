<script lang="ts" setup>
/**
 * FormControlsPage — the canonical reference for every form-control
 * element baseline that ships in the framework.
 *
 * API surface coverage (Phase 1 audit):
 *   - `<input>` text-like types — text, email, password, search, tel, url,
 *     number, date, time, datetime-local, month, week
 *   - `<input>` specialized types — checkbox, radio, switch (role="switch"),
 *     range, color, file
 *   - `<textarea>` — vertical resize + `field-sizing: content` auto-grow
 *   - `<select>` — single, `multiple`, `size`, `<optgroup>`, paired with
 *     `<datalist>` via `<input list>`
 *   - `<label>` — `for=` binding + variant tint via `--set-variant-on-canvas-color`
 *   - `<fieldset>` + `<legend>` — bordered group with notch caption, variant
 *     border tint, `disabled` propagation to descendant controls
 *   - `<output>` — bare inline result + `.filled` chip variant; live-bound
 *     reactive demo (range value → output text)
 *   - `<progress>` — determinate + indeterminate, variant tint
 *   - `<meter>` — `min`/`low`/`high`/`max`/`optimum` semantics; light-side
 *     `:optimum`, `:sub-optimum`, `:even-less-good-value` color cascade
 *   - States — `:disabled` / `[readonly]` / `:user-invalid` (post-interaction
 *     validation), `:focus-visible` (variant-tinted ring)
 *   - Sizes — `.small`, default, `.large` cascade through every text-like
 *     control + textarea + select
 *   - Forced-colors fallback — input falls back to `Field`/`FieldText`/
 *     `Highlight`/`Mark`/`GrayText`; documented inline
 *   - Reduced-motion respect — every `transition:` paired via the
 *     `@include transition()` mixin
 *
 * Cross-references:
 *   - `UseFormPage` will demonstrate `useForm` (`[data-form-validated]`
 *     gate, `aria-invalid` mirror, summary error region).
 *   - `UseSelectPage` will demonstrate `useSelect` (custom listbox /
 *     combobox / typeahead) — this page covers ONLY the native `<select>`.
 *   - `UseTextareaPage` (composable layer) will demonstrate scripted
 *     auto-resize + remaining-character counter.
 */
import { computed, ref } from 'vue'

import {
	FORM_CONTROLS_SNIPPET_CHECK_RADIO as snippetCheckRadio,
	FORM_CONTROLS_SNIPPET_COLOR_FILE as snippetColorFile,
	FORM_CONTROLS_SNIPPET_FIELDSET as snippetFieldset,
	FORM_CONTROLS_SNIPPET_METER as snippetMeter,
	FORM_CONTROLS_SNIPPET_OUTPUT as snippetOutput,
	FORM_CONTROLS_SNIPPET_PROGRESS as snippetProgress,
	FORM_CONTROLS_SNIPPET_RANGE as snippetRange,
	FORM_CONTROLS_SNIPPET_SELECT as snippetSelect,
	FORM_CONTROLS_SNIPPET_SIZES as snippetSizes,
	FORM_CONTROLS_SNIPPET_STATES as snippetStates,
	FORM_CONTROLS_SNIPPET_TEXT as snippetText,
	FORM_CONTROLS_SNIPPET_TEXTAREA as snippetTextarea,
	FORM_CONTROLS_SNIPPET_VARIANTS as snippetVariants,
	FORM_CONTROLS_TEXT_INPUT_TYPES as textInputTypes,
	VARIANTS as variants,
} from '../constants.js'

// Reactive bindings for the live output / progress / meter demos.
const sliderValue = ref(42)
const progressValue = ref(35)
const meterValue = ref(72)
const sumA = ref(12)
const sumB = ref(30)
const sum = computed(() => sumA.value + sumB.value)
</script>

<template>
	<section id="form-controls-intro">
		<hgroup>
			<h1>Form controls</h1>
			<p>
				The framework hydrates every native form control with a consistent border, focus ring, size
				cascade, variant tint, and forced-colors fallback. Bare markup looks production-ready out of
				the box — modifier classes opt into variant identity, size, or fill style; native attributes
				(<code>disabled</code>, <code>readonly</code>, <code>required</code>) drive the state
				cascade.
			</p>
		</hgroup>
		<p>
			Every demo below is real working markup tied to live state where useful. Each
			<code>--set-{control}-*</code> token chains through
			<code>style → variant → size → element-default</code> exactly like
			<code>&lt;button&gt;</code>. The page does not script validation — the
			<code>:user-invalid</code> ring shown in §States is the native pseudo-class kicking in after
			your first interaction.
		</p>
	</section>

	<section id="form-controls-text-inputs">
		<h2>Text-like inputs</h2>
		<p>
			The <code>&lt;input&gt;</code> baseline targets text-like types via a long
			<code>:not()</code> chain (text, email, password, search, tel, url, number, date, time,
			datetime-local, month, week — non-text types like <code>checkbox</code> / <code>range</code> /
			<code>file</code> get their own rules below). All twelve share the same
			<code>--set-input-*</code> token cascade: border, padding, focus ring, transition. The
			<em>pickers</em> (date / time / month / week) keep their native UA dropdowns — those panels
			cannot be styled cross-browser.
		</p>
		<div class="stack">
			<div v-for="t in textInputTypes" :key="t.type" class="showcase-field-row">
				<label :for="`type-${t.type}`">
					<code>type="{{ t.type }}"</code>
				</label>
				<input :id="`type-${t.type}`" :type="t.type" :placeholder="t.placeholder" />
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetText }}</code></pre>
		</details>
	</section>

	<section id="form-controls-checkbox-radio">
		<h2>Checkbox, radio, and switch</h2>
		<p>
			The framework re-skins checkbox + radio with <code>appearance: none</code> and paints the
			checked glyph through three icon tokens (<code>--set-icon-check</code>,
			<code>--set-icon-radio</code>, <code>--set-icon-dash</code>). A <code>checkbox</code> with
			<code>role="switch"</code> upgrades to the 2em pill shape via two more icon tokens
			(<code>--set-icon-switch-{off,on}</code>) — the same ARIA pattern Mailbox and Bootstrap use
			for binary toggles. Every glyph follows the framework's icon registry, so a single
			<code>--set-icon-*</code> override retunes every check / radio / switch on the page.
		</p>
		<div class="stack">
			<div class="cluster">
				<input id="cb-newsletter" type="checkbox" />
				<label for="cb-newsletter">Subscribe to the newsletter</label>
			</div>
			<div class="cluster">
				<input id="cb-subscribed" type="checkbox" checked />
				<label for="cb-subscribed">Already subscribed</label>
			</div>
			<div class="cluster">
				<input id="cb-indeterminate" type="checkbox" :indeterminate.prop="true" />
				<label for="cb-indeterminate">Partially selected (indeterminate)</label>
			</div>
			<div class="cluster">
				<input id="cb-disabled" type="checkbox" disabled />
				<label for="cb-disabled">Disabled</label>
			</div>
			<fieldset>
				<legend>Plan</legend>
				<div class="stack">
					<div class="cluster">
						<input id="plan-free" type="radio" name="plan-demo" value="free" />
						<label for="plan-free">Free</label>
					</div>
					<div class="cluster">
						<input id="plan-pro" type="radio" name="plan-demo" value="pro" checked />
						<label for="plan-pro">Pro</label>
					</div>
					<div class="cluster">
						<input id="plan-team" type="radio" name="plan-demo" value="team" />
						<label for="plan-team">Team</label>
					</div>
					<div class="cluster">
						<input id="plan-locked" type="radio" name="plan-demo" value="locked" disabled />
						<label for="plan-locked">Enterprise (contact sales)</label>
					</div>
				</div>
			</fieldset>
			<div class="cluster">
				<input id="switch-email" type="checkbox" role="switch" />
				<label for="switch-email">Email notifications</label>
			</div>
			<div class="cluster">
				<input id="switch-2fa" type="checkbox" role="switch" checked />
				<label for="switch-2fa">Two-factor auth</label>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetCheckRadio }}</code></pre>
		</details>
	</section>

	<section id="form-controls-range">
		<h2>Range slider</h2>
		<p>
			A custom flat-track + circular-thumb skin replaces every engine's UA chrome via the vendor
			pseudos (<code>::-webkit-slider-runnable-track</code>, <code>::-moz-range-track</code>, and
			thumb counterparts). The track and thumb track <code>--set-range-{track,thumb}-*</code> tokens
			so consumers can retune size, color, or ring without touching engine-specific selectors. The
			thumb's focus ring uses the framework's <code>--set-focus-*</code> sub-tokens for parity with
			every other control's focus affordance.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="volume">Volume</label>
				<!-- Range + readout stay paired across viewports — the showcase-field-row's
				     mobile single-column stack would otherwise drop the output
				     onto its own row at full width. A local flex wrapper keeps
				     the chip beside the slider on every breakpoint. -->
				<div class="showcase-field-row-range">
					<input id="volume" v-model.number="sliderValue" type="range" min="0" max="100" />
					<output for="volume" class="filled">{{ sliderValue }}</output>
				</div>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetRange }}</code></pre>
		</details>
	</section>

	<section id="form-controls-color-file">
		<h2>Color and file inputs</h2>
		<p>
			<code>&lt;input type="color"&gt;</code> renders a 3rem-wide swatch with the UA's chunky
			default border stripped via <code>appearance: none</code> and a framework border painted on
			top. The <code>::-webkit-color-swatch</code> + <code>::-moz-color-swatch</code>
			pseudos zero their UA border so the swatch reads as a flat rounded square.
			<code>&lt;input type="file"&gt;</code> targets the <code>::file-selector-button</code> pseudo
			(Chromium / Firefox / Safari 16.4+) to give the built-in upload button the framework's button
			cadence — padding, border, hover tint. The actual file picker dialog is OS chrome that no
			engine exposes.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="theme-color">Brand color</label>
				<input id="theme-color" type="color" value="#3b82f6" />
			</div>
			<div class="showcase-field-row">
				<label for="avatar">Avatar</label>
				<input id="avatar" type="file" accept="image/*" />
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetColorFile }}</code></pre>
		</details>
	</section>

	<section id="form-controls-textarea">
		<h2>Textarea</h2>
		<p>
			Same chrome contract as the text-like inputs — variant border, focus ring, size cascade — with
			two multi-line ergonomics: <code>resize: vertical</code> (the UA's default
			<code>both</code> causes layout flicker in form grids) and
			<code>field-sizing: content</code> (Chromium 123+, Firefox 142+) which auto-grows the control
			to fit its content while still respecting an explicit <code>rows</code>. Older engines fall
			back to the static <code>min-block-size</code>.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="bio">Short bio</label>
				<textarea
					id="bio"
					placeholder="Type a few paragraphs — the textarea grows with the content."
					rows="3"
				></textarea>
			</div>
			<div class="showcase-field-row">
				<label for="readonly-notes">Read-only notes</label>
				<textarea id="readonly-notes" readonly>
This textarea is read-only. It stays focusable and selectable but rejects edits and disables the resize handle.</textarea
				>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetTextarea }}</code></pre>
		</details>
	</section>

	<section id="form-controls-select">
		<h2>Select and datalist</h2>
		<p>
			The native <code>&lt;select&gt;</code> baseline strips the OS chevron via
			<code>appearance: none</code> and paints a token-driven replacement
			(<code>--set-select-background-image</code>, defaulting to
			<code>--set-icon-chevron-down</code>). <code>multiple</code> and <code>size</code> attributes
			suppress the chevron automatically because the list-box shape has no single-row dropdown to
			indicate. <code>&lt;datalist&gt;</code> attaches suggestions to a text input via the
			<code>list=</code> attribute — the popup itself is unstyleable UA chrome that varies wildly
			between browsers; consumers needing a controllable suggestion panel should reach for
			<code>useSelect</code> (combobox mode) instead.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="region">Region</label>
				<select id="region">
					<option value="">Choose a region…</option>
					<optgroup label="Americas">
						<option>US East</option>
						<option>US West</option>
						<option>South America</option>
					</optgroup>
					<optgroup label="EMEA">
						<option>EU Central</option>
						<option>EU North</option>
					</optgroup>
					<optgroup label="Asia Pacific">
						<option>AP South</option>
						<option>AP Northeast</option>
					</optgroup>
				</select>
			</div>
			<div class="showcase-field-row">
				<label for="fruits">Pick any fruits</label>
				<select id="fruits" multiple size="5">
					<option>Apples</option>
					<option>Bananas</option>
					<option>Cherries</option>
					<option>Dates</option>
					<option>Elderberries</option>
					<option>Figs</option>
				</select>
			</div>
			<div class="showcase-field-row">
				<label for="city">City (with suggestions)</label>
				<input id="city" list="cities" placeholder="Search cities…" />
				<datalist id="cities">
					<option value="Tokyo"></option>
					<option value="Toronto"></option>
					<option value="Toulouse"></option>
					<option value="Tashkent"></option>
				</datalist>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSelect }}</code></pre>
		</details>
	</section>

	<section id="form-controls-fieldset">
		<h2>Fieldset and legend</h2>
		<p>
			<code>&lt;fieldset&gt;</code> ships a 1px bordered container with breathing-room padding so
			grouped controls render as a visual cluster without explicit theming.
			<code>&lt;legend&gt;</code> drops into the UA notch in the fieldset's top border — the
			framework styles the caption's typography (weight, color) but never repositions the legend or
			sets <code>display</code> on it (either breaks the notch). The variant cascade tints the
			BORDER only; opt into <code>.filled</code> to fill the body.
			<code>&lt;fieldset disabled&gt;</code> propagates <code>:disabled</code> to every descendant
			control via native UA behavior.
		</p>
		<div class="stack">
			<fieldset>
				<legend>Shipping address</legend>
				<div class="showcase-field-row">
					<label for="ship-street">Street</label>
					<input id="ship-street" type="text" placeholder="221B Baker Street" />
				</div>
				<div class="showcase-field-row">
					<label for="ship-city">City</label>
					<input id="ship-city" type="text" placeholder="London" />
				</div>
			</fieldset>
			<fieldset class="primary">
				<legend>Account (variant border)</legend>
				<div class="showcase-field-row">
					<label for="acct-email">Email</label>
					<input id="acct-email" type="email" placeholder="ada@example.com" />
				</div>
			</fieldset>
			<fieldset disabled>
				<legend>Payment (disabled propagates)</legend>
				<div class="showcase-field-row">
					<label for="card-num">Card number</label>
					<input id="card-num" type="text" placeholder="•••• •••• •••• ••••" />
				</div>
				<div class="showcase-field-row">
					<label for="card-cvc">CVC</label>
					<input id="card-cvc" type="text" inputmode="numeric" placeholder="•••" />
				</div>
			</fieldset>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFieldset }}</code></pre>
		</details>
	</section>

	<section id="form-controls-output">
		<h2>Output</h2>
		<p>
			<code>&lt;output&gt;</code> is a phrasing-level element for calculation or user-action
			results. The bare baseline renders as monospace inline text with no padding (it's meant to
			flow with sibling phrasing). The <code>.filled</code> style adds breathing room + background
			tint so the result reads as a discrete chip. <code>&lt;output&gt;</code> is also a live region
			by default (<code>role="status"</code>), so screen readers announce value updates without
			extra markup.
		</p>
		<form class="stack">
			<div class="showcase-field-row">
				<label for="sum-a">Left</label>
				<input id="sum-a" v-model.number="sumA" type="number" />
			</div>
			<div class="showcase-field-row">
				<label for="sum-b">Right</label>
				<input id="sum-b" v-model.number="sumB" type="number" />
			</div>
			<p>
				Inline bare: <code>{{ sumA }} + {{ sumB }} = </code>
				<output for="sum-a sum-b">{{ sum }}</output>
			</p>
			<p>
				Filled chip:
				<output for="sum-a sum-b" class="filled">{{ sum }}</output>
			</p>
		</form>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetOutput }}</code></pre>
		</details>
	</section>

	<section id="form-controls-progress">
		<h2>Progress</h2>
		<p>
			<code>&lt;progress&gt;</code> renders a flat track with rounded ends; the vendor pseudos
			(<code>::-webkit-progress-{bar,value}</code>, <code>::-moz-progress-bar</code>) paint the
			track and the fill so every evergreen browser shows the same shape. Omitting the
			<code>value</code> attribute hands the bar back to the UA's animated indeterminate state —
			Chromium and Firefox both ship slick built-in animations, and forcing custom keyframes onto
			the value pseudo would break the determinate render. The variant cascade tints the fill via
			<code>--set-variant-background-color</code>.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="prog-determinate">Determinate ({{ progressValue }}%)</label>
				<progress id="prog-determinate" :value="progressValue" max="100">
					{{ progressValue }}%
				</progress>
			</div>
			<div class="showcase-field-row">
				<label for="prog-control">Adjust value</label>
				<input id="prog-control" v-model.number="progressValue" type="range" min="0" max="100" />
			</div>
			<div class="showcase-field-row">
				<label for="prog-indeterminate">Indeterminate (no value)</label>
				<progress id="prog-indeterminate" max="100">Loading…</progress>
			</div>
			<div v-for="v in variants" :key="v" class="showcase-field-row">
				<label :for="`prog-${v}`"
					><code>.{{ v }}</code></label
				>
				<progress :id="`prog-${v}`" :class="v" value="60" max="100">60%</progress>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetProgress }}</code></pre>
		</details>
	</section>

	<section id="form-controls-meter">
		<h2>Meter</h2>
		<p>
			<code>&lt;meter&gt;</code> reads as a scalar gauge within a known range — distinct from
			<code>&lt;progress&gt;</code>, which is a task indicator. The <code>low</code> /
			<code>high</code> / <code>optimum</code> attributes define the meter's classification bands,
			and each engine exposes pseudos for the three zones —
			<code>::-webkit-meter-{optimum,suboptimum,even-less-good}-value</code> on Chromium / Safari,
			the host pseudo-class chain <code>:-moz-meter-{sub-optimum,sub-sub-optimum}</code> on Firefox.
			The framework maps the three zones to <code>--color-success</code>,
			<code>--color-warning</code>, <code>--color-danger</code> by default.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="meter-good">Disk space — 85% free (optimum)</label>
				<meter id="meter-good" value="0.85" min="0" max="1" low="0.3" high="0.7" optimum="0.9">
					85%
				</meter>
			</div>
			<div class="showcase-field-row">
				<label for="meter-warn">Disk space — 55% free (sub-optimum)</label>
				<meter id="meter-warn" value="0.55" min="0" max="1" low="0.3" high="0.7" optimum="0.9">
					55%
				</meter>
			</div>
			<div class="showcase-field-row">
				<label for="meter-bad">Disk space — 15% free (even less good)</label>
				<meter id="meter-bad" value="0.15" min="0" max="1" low="0.3" high="0.7" optimum="0.9">
					15%
				</meter>
			</div>
			<div class="showcase-field-row">
				<label for="meter-control">Adjust value</label>
				<input id="meter-control" v-model.number="meterValue" type="range" min="0" max="100" />
			</div>
			<div class="showcase-field-row">
				<label for="meter-live">Live meter ({{ meterValue }}%)</label>
				<meter
					id="meter-live"
					:value="meterValue / 100"
					min="0"
					max="1"
					low="0.3"
					high="0.7"
					optimum="0.9"
				>
					{{ meterValue }}%
				</meter>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetMeter }}</code></pre>
		</details>
	</section>

	<section id="form-controls-variants">
		<h2>Variant cascade</h2>
		<p>
			Adding a variant class to a text-like input swaps the border color to the variant identity
			(via <code>--set-variant-background-color</code>) and routes the focus ring through the
			matching variant tint. Label, textarea, and select pick up the same cascade — the
			<code>.warning</code> input pairs with a <code>.warning</code> label and tints both border
			plus on-canvas text together.
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="v" class="showcase-field-row">
				<label :for="`variant-${v}`" :class="v"
					><code>.{{ v }}</code></label
				>
				<input :id="`variant-${v}`" type="text" :class="v" :placeholder="v" />
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="form-controls-sizes">
		<h2>Size cascade</h2>
		<p>
			<code>.small</code> and <code>.large</code> route through <code>--set-size-*</code>
			(padding-inline, padding-block, font-size, border-radius) so every control's chrome scales
			coherently. Bare = default. Pair with a same-size label to keep vertical alignment honest.
		</p>
		<div class="stack">
			<div class="showcase-field-row">
				<label for="size-small" class="small">Small</label>
				<input id="size-small" type="text" class="small" placeholder="Small" />
			</div>
			<div class="showcase-field-row">
				<label for="size-default">Default</label>
				<input id="size-default" type="text" placeholder="Default" />
			</div>
			<div class="showcase-field-row">
				<label for="size-large" class="large">Large</label>
				<input id="size-large" type="text" class="large" placeholder="Large" />
			</div>
			<div class="showcase-field-row">
				<label for="size-select-small" class="small">Small select</label>
				<select id="size-select-small" class="small">
					<option>One</option>
					<option>Two</option>
				</select>
			</div>
			<div class="showcase-field-row">
				<label for="size-select-large" class="large">Large select</label>
				<select id="size-select-large" class="large">
					<option>One</option>
					<option>Two</option>
				</select>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="form-controls-states">
		<h2>States</h2>
		<p>
			<code>:focus-visible</code> paints the framework focus ring (variant-tinted box-shadow ×
			border-color swap) on every text-like control, textarea, select, range thumb, checkbox, radio,
			color swatch, and file button — keyboard tab through this page to observe the ring.
			<code>:disabled</code> and the matching <code>.disabled</code> class drop opacity to 0.5 and
			swap the cursor to <code>not-allowed</code>. <code>[readonly]</code> dims the background
			(currentColor 4% over Canvas) while keeping the field focusable and selectable.
			<code>:user-invalid</code> is the post-interaction validation pseudo-class — the field stays
			calm until the user has tried to submit or blurred a required-but-empty input, then the border
			+ focus ring switch to <code>--color-danger</code>. The legacy
			<code>:invalid:not(:placeholder-shown):not(:focus)</code> chain falls in behind it for Safari
			15- / Firefox &lt;88.
		</p>
		<form class="stack">
			<div class="showcase-field-row">
				<label for="state-default">Default (focus me)</label>
				<input id="state-default" type="text" placeholder="Focus this" />
			</div>
			<div class="showcase-field-row">
				<label for="state-disabled">Disabled</label>
				<input id="state-disabled" type="text" disabled value="Locked" />
			</div>
			<div class="showcase-field-row">
				<label for="state-readonly">Read-only</label>
				<input id="state-readonly" type="text" readonly value="Read-only value" />
			</div>
			<div class="showcase-field-row">
				<label for="state-required">Required (try focusing then blurring empty)</label>
				<input id="state-required" type="email" required placeholder="ada@example.com" />
			</div>
			<p class="showcase-field-row-hint">
				<small>
					<code>:user-invalid</code> kicks in after the field has been interacted with — empty +
					required + blurred = red border. Re-enter a valid email to clear.
				</small>
			</p>
		</form>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStates }}</code></pre>
		</details>
	</section>

	<section id="form-controls-flush">
		<h2><code>form.flush</code> — fill a host's body</h2>
		<p>
			<code>.flush</code> on a <code>&lt;form&gt;</code> resets margin + padding to zero and writes
			<code>inline-size: 100%</code>. The form has no outer chrome by default (the bare
			<code>&lt;form&gt;</code> is just a flex-column stack with consistent gap rhythm), so this is
			mostly a documentation rule that makes the "fill the host" intent explicit and predictable
			across consumer compositions. The internal vertical gap between control + label pairs is
			unchanged — that's where <code>&lt;form&gt;</code> earns its keep.
		</p>
		<p>
			Drop a flush form into a card body, an aside, or an expanded list-group item and it fills
			edge-to-edge with the host's chrome owning the perimeter:
		</p>
		<article class="frame max-w-lg">
			<header>
				<h3>Profile</h3>
			</header>
			<form class="flush p-4">
				<label>
					Display name
					<input type="text" placeholder="Ada Lovelace" />
				</label>
				<label>
					Email
					<input type="email" placeholder="ada@example.com" />
				</label>
				<label>
					Bio
					<textarea rows="3" placeholder="A short introduction"></textarea>
				</label>
			</form>
			<footer>
				<button type="button">Cancel</button>
				<button type="button" class="primary filled">Save changes</button>
			</footer>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;form class="flush"&gt;
    &lt;label&gt;…&lt;input type="text" /&gt;&lt;/label&gt;
    &lt;label&gt;…&lt;input type="email" /&gt;&lt;/label&gt;
    &lt;label&gt;…&lt;textarea&gt;&lt;/textarea&gt;&lt;/label&gt;
  &lt;/form&gt;
  &lt;footer&gt;…&lt;/footer&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="form-controls-flat-flush-controls">
		<h2>
			<code>input.flat</code> / <code>.flush</code> · <code>select</code> · <code>textarea</code>
		</h2>
		<p>
			Two paired modifiers for form controls inside dense surfaces (table cells, accordion headers,
			list-group rows, card bodies):
		</p>
		<ul>
			<li>
				<strong><code>.flat</code></strong> — transparent rest, subtle backdrop reveal on hover,
				focus promotes to the element's full bordered baseline with variant focus ring.
				<code>:user-invalid</code> still paints the danger border. Use when the control should
				signal it's interactive only on engagement (the chrome is there, just dissolved at rest).
			</li>
			<li>
				<strong><code>.flush</code></strong> — no margin / border / radius / ring at any state;
				inherits the host's <code>border-radius</code>; fills the host on both axes; subtle backdrop
				reveals on hover AND focus so the focused control stays visible. Use when the host cell IS
				the surface and the control should occupy every pixel inside it.
			</li>
		</ul>
		<h3>Flat — transparent rest, full chrome on focus</h3>
		<p>Click into any field below to see the chrome promote to the bordered baseline:</p>
		<div class="stack max-w-lg">
			<label>
				Display name
				<input class="flat" type="text" placeholder="Ada Lovelace" />
			</label>
			<label>
				Email
				<input class="flat" type="email" placeholder="ada@example.com" />
			</label>
			<label>
				Plan
				<select class="flat">
					<option>Free</option>
					<option>Pro</option>
					<option>Enterprise</option>
				</select>
			</label>
			<label>
				Bio
				<textarea class="flat" rows="3" placeholder="A short introduction"></textarea>
			</label>
		</div>
		<h3>Flush — cell IS the surface</h3>
		<p>
			The form controls live inside a card whose cells own the visual chrome. Each control fuses to
			its host's edges; on hover / focus a subtle backdrop confirms the active surface. Rows use
			<code>align-items: center</code> so the label text vertical-centres against the input's
			text-baseline (avoids the "label at top, input text below" mis-alignment that
			<code>align-items: stretch</code> produces when the input baseline sits in the middle of its
			content box).
		</p>
		<article class="frame max-w-lg">
			<header>
				<h3>Profile</h3>
			</header>
			<div class="showcase-form-row">
				<label for="flush-name" class="showcase-form-row-label">Name</label>
				<input
					id="flush-name"
					class="flush showcase-form-row-input"
					type="text"
					value="Ada Lovelace"
				/>
			</div>
			<div class="showcase-form-row">
				<label for="flush-email" class="showcase-form-row-label">Email</label>
				<input
					id="flush-email"
					class="flush showcase-form-row-input"
					type="email"
					value="ada@example.com"
				/>
			</div>
			<div class="showcase-form-row">
				<label for="flush-plan" class="showcase-form-row-label">Plan</label>
				<select id="flush-plan" class="flush">
					<option>Free</option>
					<option selected>Pro</option>
					<option>Enterprise</option>
				</select>
			</div>
			<div class="showcase-form-row-tall">
				<label for="flush-bio" class="showcase-form-row-label-top">Bio</label>
				<textarea
					id="flush-bio"
					class="flush showcase-form-row-input resize-none"
					rows="3"
					placeholder="Tell us about yourself"
				></textarea>
			</div>
		</article>
		<p>
			<small>
				The card cells own the perimeter; each <code>.flush</code> control inherits the host's inner
				radius and fills its cell. The grid keeps the label column at a fixed 8rem so the flush
				input gets the remaining track.
			</small>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;label&gt;Display name &lt;input class="flat" type="text" /&gt;&lt;/label&gt;
&lt;label&gt;Plan &lt;select class="flat"&gt;…&lt;/select&gt;&lt;/label&gt;

&lt;article class="p-0"&gt;
  &lt;div class="row"&gt;
    &lt;label&gt;Name&lt;/label&gt;
    &lt;input class="flush" type="text" /&gt;
  &lt;/div&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="form-controls-forced-colors">
		<h2>Forced colors and reduced motion</h2>
		<p>
			In Windows High Contrast (or any <code>forced-colors: active</code> environment), every
			text-like input falls back to the system color keywords: <code>background-color: Field</code>,
			<code>color: FieldText</code>, <code>border-color: FieldText</code>;
			<code>:focus-visible</code> draws <code>outline: 2px solid Highlight</code> with a 2px offset;
			<code>:disabled</code> uses <code>GrayText</code>; <code>:user-invalid</code> uses
			<code>Mark</code>. The custom box-shadow is dropped — HC mode forces a solid outline anyway.
			Every control's <code>transition:</code> declaration is paired with
			<code>prefers-reduced-motion: reduce</code> via the framework's
			<code>transition()</code> mixin, so focus-ring fade and value-change animations collapse to
			instant when the OS signals motion sensitivity.
		</p>
	</section>
</template>
