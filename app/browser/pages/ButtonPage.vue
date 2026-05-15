<script lang="ts" setup>
/**
 * ButtonPage — the canonical reference for the `<button>` element baseline.
 *
 * API surface coverage (Phase 1 audit):
 *   - Bare element baseline (element/_button.scss)
 *   - 7 variants — primary, secondary, tertiary, success, warning, danger, information
 *   - 3 sizes — .small, default, .large
 *   - 3 styles — bare (transparent), .subtle (Bootstrap tinted-bg pattern), .filled
 *   - 5 interactive states — :hover, :active/.active, :focus-visible, [disabled]/.disabled, .loading
 *   - .icon-only modifier (equal block + inline padding)
 *   - Icon registry consumption (--set-icon-* via <i class="icon">)
 *   - Link-as-button via <a class="primary"> per §6.1 anchor-context contract
 *   - [role="group"] and [role="toolbar"] composition (components/_role-group.scss)
 *   - useButton / createButton toggle composable (aria-pressed mirror + toggle event)
 *   - Reduced-motion respect (every transition paired via the @include transition() mixin)
 *   - Forced-colors fallback (ButtonFace / ButtonText / Highlight / GrayText cascade)
 *   - 14 --set-button-* tokens declared on the bare element
 *
 * Cross-references:
 *   - AnchorPage for link-as-button context (different page)
 *   - UseThemeButtonPage for useButton in a primitives-grouped composable demo
 *   - InlineAtomsPage for .spinner (composed here in the .loading example)
 */
import { ref, useTemplateRef } from 'vue'
import { useButton } from '@elements/browser'

// `useButton` mirrors the `.active` class + `aria-pressed` attribute. The
// composable returns an `active` reactive and a `toggle()` method; the
// `elements:button:toggle` event fires with `{ active }` detail on each flip.
const toggleRef = useTemplateRef<HTMLButtonElement>('toggleBtn')
const toggleApi = useButton(toggleRef)

// Event-log recorder so the reader sees the composable's emit pipeline.
const events = ref<{ at: string; active: boolean }[]>([])
const logToggle = (e: Event): void => {
	const detail = (e as CustomEvent<{ active: boolean }>).detail
	events.value.unshift({
		at: new Date().toLocaleTimeString('en-GB', { hour12: false }),
		active: detail.active,
	})
	if (events.value.length > 6) events.value.length = 6
}

import { VARIANTS as variants } from '../constants.js'

const snippetBare = `<button>Save</button>`

const snippetVariants = `<button>Default</button>
<button class="primary">Primary</button>
<button class="secondary">Secondary</button>
<button class="tertiary">Tertiary</button>
<button class="success">Success</button>
<button class="warning">Warning</button>
<button class="danger">Danger</button>
<button class="information">Information</button>`

const snippetSizes = `<button class="primary small">Small</button>
<button class="primary">Default</button>
<button class="primary large">Large</button>`

const snippetStyles = `<button class="primary">Bare (outline-ish)</button>
<button class="primary subtle">Ghost — text only</button>
<button class="primary filled">Filled — solid surface</button>`

const snippetFlat = `<!-- .flat: no fill, no border, no shadow at rest. Hover + focus
     reveal a 4% backdrop + neutral border. Focus ring still paints. -->
<div role="toolbar" aria-label="Editor actions">
  <button class="flat" type="button">Bold</button>
  <button class="flat" type="button">Italic</button>
  <button class="flat" type="button">Strike</button>
  <button class="primary flat" type="button">Save</button>
  <button class="danger flat" type="button">Delete</button>
</div>`

const snippetStates = `<button class="primary">Default</button>
<button class="primary active">.active (toggled)</button>
<button class="primary" disabled>[disabled]</button>
<button class="primary loading">
  <span class="spinner" role="status" aria-label="Loading"></span>
  Loading
</button>`

const snippetCascade = `<!-- Variant × Size × Style — the orthogonal cascade. Each axis is
     independent; an element wears at most one value from each. -->
<button class="primary small filled">Primary · small · filled</button>
<button class="success large subtle">Success · large · subtle</button>
<button class="danger filled">Danger · default · filled</button>`

const snippetIcon = `<!-- Icon-leading: icon then label, framework gap fills automatically. -->
<button class="primary">
  <i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
  Add item
</button>

<!-- Icon-trailing: label then icon, same rule. -->
<button class="primary">
  Continue
  <i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-right)"></i>
</button>

<!-- Icon-only: \`.icon-only\` collapses inline padding to match block padding,
     so a single-glyph button reads as a square. -->
<button class="icon-only subtle" aria-label="More actions">
  <i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
</button>`

const snippetLink = `<!-- <a> opts into button chrome via .filled and a variant class. The
     framework's anchor-context contract (guides §6.1) defers to the
     button cascade when these modifiers are present. -->
<a href="#button-link" class="primary filled">Primary anchor-as-button</a>
<a href="#button-link" class="success subtle">Success anchor, subtle style</a>`

const snippetDropdown = `<!-- .dropdown paints a chevron-down caret after the label via
     button::after + mask-image (--set-button-dropdown-caret-image).
     Same caret + currentColor recipe <summary>::before uses, so the
     affordance reads identically across the framework. -->
<button class="dropdown" popovertarget="my-menu">Open menu</button>

<!-- When the button also carries [aria-expanded] (popover trigger,
     row-expansion toggle, accordion summary, anything), the caret
     rotates 180° on aria-expanded="true" — same rotation contract
     <summary>::before uses on details[open]. Token-driven, so a
     consumer can flip to chevron-up + 0deg or to 45deg for plus/×
     pairs via a single :root override. -->
<button class="dropdown" aria-expanded="false" aria-controls="row-1">
  Details
</button>`

const snippetGroups = `<!-- Connected button group: a [role="group"] wrapping buttons
     produces a single bonded control. -->
<div role="group" aria-label="Text alignment">
  <button class="subtle">Left</button>
  <button class="subtle active" aria-pressed="true">Center</button>
  <button class="subtle">Right</button>
</div>

<!-- Toolbar: a [role="toolbar"] groups loose buttons with a labelled rail. -->
<div role="toolbar" aria-label="Document actions">
  <button class="primary">Save</button>
  <button class="secondary">Discard</button>
  <button class="subtle">Preview</button>
</div>`

// Build the toggle snippet by concatenating angle-bracket sentinels in pieces.
// A literal closing-script-tag substring anywhere inside this file's script
// block — even inside a template literal or a JS comment — would close the
// SFC's script block per the HTML parser's tokenization rules (the parser
// doesn't respect JS comment syntax when it scans for the block terminator).
// Splitting `<` and `>` away from the script / template / button tag names
// in the snippet payload sidesteps the parser entirely.
const LT = '<'
const GT = '>'
const snippetToggle =
	LT +
	`script setup lang="ts"` +
	GT +
	`
import { useTemplateRef } from 'vue'
import { useButton } from '@elements/browser'

const btn = useTemplateRef` +
	LT +
	`HTMLButtonElement` +
	GT +
	`('btn')
const { active, toggle } = useButton(btn, {
  on: { toggle: (e) => console.log('toggled to', e.detail.active) },
})
` +
	LT +
	`/script` +
	GT +
	`

` +
	LT +
	`template` +
	GT +
	`
  ` +
	LT +
	`button ref="btn" class="primary"` +
	GT +
	`
    {{ active ? 'On' : 'Off' }}
  ` +
	LT +
	`/button` +
	GT +
	`
` +
	LT +
	`/template` +
	GT

const snippetReducedMotion = `/* In src/styles/_mixins.scss — every transition the framework ships pairs with this guard. */
@mixin transition($value) {
  transition: $value;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}`
</script>

<template>
	<section id="button-intro">
		<hgroup>
			<h1>Button</h1>
			<p>
				The interactive primitive. Every other framework element ports the
				<code>&lt;button&gt;</code>
				cascade pattern — token chain, modifier orthogonality, hover / focus / active painting,
				forced-colors fallback — so what you see on this page describes the framework's posture
				toward every interactive surface that follows.
			</p>
		</hgroup>
		<p>
			Every demo below is real working markup. Inspect any element, walk the cascade, override the
			<code>--set-button-*</code> tokens at <code>:root</code> to retune. There are zero Tailwind
			utilities painting the chrome on this page — every line, padding, shadow, and ring comes from
			the framework.
		</p>
	</section>

	<section id="button-bare">
		<h2>Bare button</h2>
		<p>
			The zero-class default. Framework gives you padding, border-radius, font, focus ring, and
			motion-paired hover all for free. The bare element renders neutral so a variant modifier
			paints identity on top without fighting an opinionated baseline.
		</p>
		<div class="cluster">
			<button type="button">Save</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetBare }}</code></pre>
		</details>
	</section>

	<section id="button-variants">
		<h2>Variants</h2>
		<p>
			Seven semantic variants — <code>primary</code>, <code>secondary</code>, <code>tertiary</code>,
			<code>success</code>, <code>warning</code>, <code>danger</code>, <code>information</code>.
			Each sets the variant-context tokens; the button element resolves them through its fallback
			chain (<code>style → variant → default</code>).
		</p>
		<div class="cluster">
			<button type="button">Default</button>
			<button v-for="v in variants" :key="v" type="button" :class="v">
				{{ v[0].toUpperCase() + v.slice(1) }}
			</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="button-sizes">
		<h2>Sizes</h2>
		<p>
			Two modifier sizes plus the bare default — <code>.small</code>, default, <code>.large</code>.
			Each bundles a coordinated set of padding-inline / padding-block / font-size / border-radius
			so consumers never compose <code>px-* py-* text-* rounded-*</code>
			to make a button bigger. Tailwind has no built-in button-size utility; this is why.
		</p>
		<div class="cluster">
			<button type="button" class="primary small">Small</button>
			<button type="button" class="primary">Default</button>
			<button type="button" class="primary large">Large</button>
			<button type="button" class="secondary small">Small</button>
			<button type="button" class="secondary">Default</button>
			<button type="button" class="secondary large">Large</button>
			<button type="button" class="danger small">Small</button>
			<button type="button" class="danger">Default</button>
			<button type="button" class="danger large">Large</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="button-styles">
		<h2>Styles</h2>
		<p>
			Three fill treatments forming a soft / medium / loud escalation —
			<strong>bare</strong> (transparent surface, variant-tinted text, no border — the outlined
			look), <code>.subtle</code> (Bootstrap-pattern tinted-bg button: pale variant background,
			deeply-saturated variant text, subtle variant border — always reads cleanly against the canvas
			in both light and dark mode), and <code>.filled</code> (saturated identity surface with
			WCAG-AA contrast text). There is intentionally no <code>.outline</code> modifier — Tailwind
			owns that name. The previous <code>.ghost</code> modifier was dropped because its transparent
			text-on-canvas pattern failed WCAG AA for 4 of 7 variants in dark mode and 3 of 7 in light.
			<code>.subtle</code> solves the contrast problem by giving the text its own tinted lift off
			the canvas.
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="v" class="cluster">
				<button type="button" :class="v">{{ v }}</button>
				<button type="button" :class="`${v} subtle`">{{ v }} · subtle</button>
				<button type="button" :class="`${v} filled`">{{ v }} · filled</button>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStyles }}</code></pre>
		</details>
	</section>

	<section id="button-flat">
		<h2>Flat — toolbar / inline action chip</h2>
		<p>
			<code>.flat</code> is the fourth fill treatment:
			<strong>no chrome at rest, chrome on engagement</strong>. Distinct from
			<code>.subtle</code> (which keeps full button chrome but drops the variant fill) —
			<code>.flat</code> dissolves border + fill + shadow entirely so the button reads as
			text-with-affordance until hovered. Focus paints the focus-ring as the affordance, NOT a
			restored variant fill (restoring would defeat the dissolve semantic).
		</p>
		<p>
			Designed for toolbars, inline action chips inside table cells / list items, and any context
			where a button bar needs to read as quiet typography that brightens only on interaction. Hover
			any button below to see the 4% neutral backdrop reveal:
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="`flat-${v}`" class="cluster">
				<button type="button" :class="`${v} flat`">{{ v }} flat</button>
				<button type="button" :class="`${v} flat`">Action</button>
				<button type="button" :class="`${v} flat`" disabled>Disabled</button>
			</div>
		</div>
		<p>As a toolbar row using the framework's <code>[role="toolbar"]</code> host:</p>
		<div role="toolbar" aria-label="Editor actions" class="mt-2">
			<button class="flat" type="button">Bold</button>
			<button class="flat" type="button">Italic</button>
			<button class="flat" type="button">Underline</button>
			<button class="flat" type="button">Strike</button>
			<button class="primary flat" type="button">Save</button>
			<button class="danger flat" type="button">Delete</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetFlat }}</code></pre>
		</details>
	</section>

	<section id="button-flush">
		<h2>Flush — fill a host's content box</h2>
		<p>
			<code>.flush</code> on a button drops every margin / border / radius / shadow and inflates the
			button to <code>100% × 100%</code> of its host. The host owns the visual chrome; the button is
			the active surface inside it. Useful for full-width CTAs at the bottom of a card, full-cell
			buttons in a table, or grid tiles where the host IS the click target. A subtle backdrop
			reveals on hover + focus so the button stays discoverable inside the dissolved chrome.
		</p>
		<p>Three article tiles, each with a flush button filling the bottom strip:</p>
		<div class="cluster gap-4">
			<article class="frame showcase-tile">
				<div class="p-4">
					<strong>Quick action</strong>
					<p class="mt-1">
						<small>Neutral flush — fills the card's bottom edge.</small>
					</p>
				</div>
				<div class="h-10">
					<button class="flush" type="button">Run</button>
				</div>
			</article>
			<article class="primary subtle frame showcase-tile">
				<div class="p-4">
					<strong>Primary tile</strong>
					<p class="mt-1">
						<small>Variant cascade reaches the flush button's text.</small>
					</p>
				</div>
				<div class="h-10">
					<button class="primary flush" type="button">Confirm</button>
				</div>
			</article>
			<article class="danger subtle frame showcase-tile">
				<div class="p-4">
					<strong>Destructive tile</strong>
					<p class="mt-1">
						<small>Danger flush sits flush against the card's edges.</small>
					</p>
				</div>
				<div class="h-10">
					<button class="danger flush" type="button">Delete</button>
				</div>
			</article>
		</div>
		<p>
			Inside a table cell — the <code>&lt;td block-size: 1px&gt;</code> trick coerces the cell to
			its row's intrinsic height so the flush button's <code>block-size: 100%</code> resolves:
		</p>
		<table class="striped max-w-md">
			<thead>
				<tr>
					<th>Task</th>
					<th class="w-40">Action</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Run nightly sync</td>
					<td class="frame">
						<button class="primary flush" type="button">Run</button>
					</td>
				</tr>
				<tr>
					<td>Archive backups</td>
					<td class="frame">
						<button class="warning flush" type="button">Archive</button>
					</td>
				</tr>
				<tr>
					<td>Delete stale jobs</td>
					<td class="frame">
						<button class="danger flush" type="button">Delete</button>
					</td>
				</tr>
			</tbody>
		</table>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article class="p-0"&gt;
  &lt;div class="p-4"&gt;…&lt;/div&gt;
  &lt;button class="primary flush"&gt;Confirm&lt;/button&gt;
&lt;/article&gt;

&lt;td style="padding: 0; block-size: 1px"&gt;
  &lt;button class="danger flush"&gt;Delete&lt;/button&gt;
&lt;/td&gt;</code></pre>
		</details>
	</section>

	<section id="button-states">
		<h2>States</h2>
		<p>
			Hover and <code>:focus-visible</code> paint without classes — interact with any button on this
			page to see them. The remaining states get explicit demos: <code>.active</code> (toggled-on
			marker), <code>[disabled]</code> (UA-disabled state), and <code>.loading</code> (cursor +
			composed spinner). Every transition between states is paired with
			<code>prefers-reduced-motion: reduce</code> via the framework's
			<code>transition()</code> mixin.
		</p>
		<div class="cluster">
			<button type="button" class="primary">Default · hover me</button>
			<button type="button" class="primary active" aria-pressed="true">.active</button>
			<button type="button" class="primary" disabled>[disabled]</button>
			<button type="button" class="primary loading">
				<span class="spinner" role="status" aria-label="Loading"></span>
				Loading
			</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetStates }}</code></pre>
		</details>
	</section>

	<section id="button-cascade">
		<h2>The orthogonal cascade</h2>
		<p>
			Variant × size × style compose independently. An element wears at most one value from each
			dimension; the cascade resolves through token fallback (<code>--set-style-*</code> wins, then
			<code>--set-variant-*</code>, then the element default). The matrix below is deliberately
			exhaustive: every variant rendered at every size and every style so the orthogonality reads
			visually.
		</p>
		<div class="stack">
			<div v-for="v in variants" :key="v" class="cluster">
				<button type="button" :class="`${v} small`">{{ v }} · small</button>
				<button type="button" :class="v">{{ v }} · default</button>
				<button type="button" :class="`${v} large`">{{ v }} · large</button>
				<button type="button" :class="`${v} small subtle`">small · subtle</button>
				<button type="button" :class="`${v} subtle`">default · subtle</button>
				<button type="button" :class="`${v} large subtle`">large · subtle</button>
				<button type="button" :class="`${v} small filled`">small · filled</button>
				<button type="button" :class="`${v} filled`">default · filled</button>
				<button type="button" :class="`${v} large filled`">large · filled</button>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetCascade }}</code></pre>
		</details>
	</section>

	<section id="button-icon">
		<h2>Icon buttons</h2>
		<p>
			Icons consume the framework's <code>--set-icon-*</code> registry through
			<code>&lt;i class="icon"&gt;</code> — a CSS-mask painted from <code>currentColor</code> so a
			single icon source tints to whichever variant context the button sits in.
			<code>.icon-only</code> collapses inline padding to match block padding so single-glyph
			buttons read square; <code>aria-label</code> covers the missing text label.
		</p>
		<div class="cluster">
			<button type="button" class="primary">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
				Add item
			</button>
			<button type="button" class="primary">
				Continue
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-right)"></i>
			</button>
			<button type="button" class="danger">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
				Delete
			</button>
			<button type="button" class="icon-only subtle" aria-label="More actions">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
			</button>
			<button type="button" class="icon-only" aria-label="Refresh">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
			</button>
			<button type="button" class="icon-only primary filled" aria-label="Confirm">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-check)"></i>
			</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetIcon }}</code></pre>
		</details>
	</section>

	<section id="button-dropdown">
		<h2>Dropdown caret — <code>.dropdown</code></h2>
		<p>
			Opt-in caret affordance for buttons that open a dropdown panel, a popover, or any disclosure
			relationship. Painted via <code>button::after</code> with a mask-image so the glyph picks up
			<code>currentColor</code> and tints correctly through every variant / theme / forced-colors
			combination — same recipe <code>&lt;summary&gt;::before</code> uses for the disclosure marker.
			Tokens live on <code>:root</code>: <code>--set-button-dropdown-caret-image</code>,
			<code>--set-button-dropdown-caret-size</code>,
			<code>--set-button-dropdown-caret-opacity</code>,
			<code>--set-button-dropdown-caret-open-rotate</code>.
		</p>
		<p>
			<strong>Opt-in, not auto-painted.</strong> A button can target many kinds of popover — drawer,
			dialog, dropdown menu, tooltip — and only the dropdown shape conventionally carries a caret
			affordance. Slapping one on every <code>popovertarget</code> would put a chevron on the
			hamburger, the theme toggle, the close button. The <code>.dropdown</code> modifier matches
			Bootstrap's <code>.dropdown-toggle</code> opt-in but in the framework's single-English-word
			convention.
		</p>
		<div class="cluster">
			<button type="button" class="primary dropdown" popovertarget="button-dropdown-menu">
				Open menu
			</button>
			<menu popover id="button-dropdown-menu">
				<li><button type="button" class="subtle">Profile</button></li>
				<li><button type="button" class="subtle">Settings</button></li>
				<li><button type="button" class="subtle">Sign out</button></li>
			</menu>
			<button type="button" class="secondary dropdown small">Small dropdown</button>
			<button type="button" class="subtle dropdown">Subtle dropdown</button>
			<button type="button" class="success filled dropdown large">Large + filled</button>
		</div>
		<h3 class="mt-6">Caret rotation on <code>aria-expanded</code></h3>
		<p>
			When the same button drives a disclosure relationship — a popover trigger reading its
			<code>aria-expanded</code>, an accordion toggle, an expandable-row button — the caret rotates
			180° on <code>aria-expanded="true"</code>. Same rotation contract
			<code>&lt;summary&gt;::before</code> applies to <code>details[open]</code>, transitioned
			through <code>--set-transition-duration</code> so it animates in sync with every other "open
			this thing" affordance on the page.
		</p>
		<div class="cluster">
			<button type="button" class="subtle dropdown" aria-expanded="false">
				aria-expanded="false"
			</button>
			<button type="button" class="subtle dropdown" aria-expanded="true">
				aria-expanded="true"
			</button>
			<button type="button" class="primary dropdown" aria-expanded="false">Variant + aria</button>
			<button type="button" class="primary dropdown" aria-expanded="true">Variant + aria</button>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetDropdown }}</code></pre>
		</details>
	</section>

	<section id="button-link">
		<h2>Anchor as button</h2>
		<p>
			Apply a variant class to <code>&lt;a&gt;</code> and the framework's anchor-context contract
			(<a href="#/home">guides §6.1</a>) defers the link's bare-anchor paint (primary-tinted
			underlined text) to the button cascade. The result is a navigation-flavoured button — it
			follows hrefs, lights up the focus ring, and respects the same variant / size / style
			modifiers as the element it visually mirrors.
		</p>
		<div class="cluster">
			<a href="#button-link" class="primary filled">Primary anchor</a>
			<a href="#button-link" class="success">Success anchor</a>
			<a href="#button-link" class="danger subtle">Danger anchor · subtle</a>
			<a href="#button-link" class="information large">Information · large</a>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetLink }}</code></pre>
		</details>
	</section>

	<section id="button-groups">
		<h2>Groups and toolbars</h2>
		<p>
			A <code>[role="group"]</code> bonds related buttons into a single segmented control — useful
			for mutually-exclusive choices (alignment, view-mode). A <code>[role="toolbar"]</code> is the
			loose-grouping cousin: an accessibility-labelled rail of unrelated commands. The framework's
			<code>components/_role-group.scss</code> partial paints both.
		</p>
		<div class="stack">
			<div role="group" aria-label="Text alignment">
				<button type="button" class="subtle">Left</button>
				<button type="button" class="subtle active" aria-pressed="true">Center</button>
				<button type="button" class="subtle">Right</button>
				<button type="button" class="subtle">Justify</button>
			</div>
			<div role="toolbar" aria-label="Document actions">
				<button type="button" class="primary">Save</button>
				<button type="button" class="secondary">Discard</button>
				<button type="button" class="subtle">Preview</button>
				<button type="button" class="subtle icon-only" aria-label="More">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
				</button>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetGroups }}</code></pre>
		</details>
	</section>

	<section id="button-toggle">
		<h2>useButton — toggle composable</h2>
		<p>
			<code>useButton</code> binds toggle semantics to a real <code>&lt;button&gt;</code>. Clicks
			flip an internal <code>active</code> ref, mirror to the host's <code>.active</code> class +
			<code>aria-pressed</code> attribute, and emit <code>elements:button:toggle</code> with the new
			value in <code>event.detail.active</code>. The factory throws if the host isn't an
			<code>HTMLButtonElement</code> — toggle semantics require button-role, period.
		</p>
		<div class="cluster">
			<button ref="toggleBtn" type="button" class="primary" @elements:button:toggle="logToggle">
				{{ toggleApi.active.value ? 'On — click to turn off' : 'Off — click to turn on' }}
			</button>
			<button type="button" class="subtle" @click="toggleApi.toggle()">Toggle from outside</button>
		</div>
		<p>
			<small
				>Live state: <code>active = {{ toggleApi.active.value }}</code></small
			>
		</p>
		<section v-if="events.length > 0" id="button-toggle-events" class="event-log">
			<h6 class="text-xs uppercase tracking-wider opacity-70">Event log — newest first, max 6</h6>
			<ol>
				<li v-for="(entry, idx) in events" :key="idx">
					<small>
						<code>{{ entry.at }}</code> · <code>elements:button:toggle</code> →
						<code>active: {{ entry.active }}</code>
					</small>
				</li>
			</ol>
		</section>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetToggle }}</code></pre>
		</details>
	</section>

	<section id="button-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Every button transition on this page — colour fade on hover, ring fade on focus, opacity on
			disabled — is paired with <code>prefers-reduced-motion: reduce</code> through the framework's
			<code>transition()</code> mixin. Toggle your OS reduced-motion preference and the same buttons
			will switch states instantly with zero animation. The mixin is the single source of truth, so
			it's impossible to ship a transition that ignores the user's preference.
		</p>
		<div class="cluster">
			<button type="button" class="primary">Hover me · slow</button>
			<button type="button" class="success filled">And me</button>
			<button type="button" class="danger subtle">And me</button>
		</div>
		<details>
			<summary><small>The mixin that enforces this</small></summary>
			<pre><code>{{ snippetReducedMotion }}</code></pre>
		</details>
	</section>

	<section id="button-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast mode (or any browser surface reporting
			<code>forced-colors: active</code>), the framework swaps every custom palette colour on the
			button for system tokens — <code>ButtonFace</code> / <code>ButtonText</code> for default,
			<code>Highlight</code> / <code>HighlightText</code> on hover &amp; active,
			<code>GrayText</code> for disabled, and a paired <code>outline: 2px solid Highlight</code> on
			focus so the ring survives. Custom <code>box-shadow</code> rings are stripped under HC mode;
			the framework's paired <code>outline</code> takes over.
		</p>
		<div class="cluster">
			<button type="button" class="primary">Primary · verify in HC mode</button>
			<button type="button" class="primary" disabled>Disabled in HC</button>
			<button type="button" class="primary active" aria-pressed="true">Active in HC</button>
		</div>
	</section>

	<section id="button-tokens">
		<h2>Tokens</h2>
		<p>
			Every visible value on a button flows through a <code>--set-button-*</code> token. Pin one at
			<code>:root</code> to retune every button in your app; pin one on a single host to scope the
			retune. The defaults are tuned for Bootstrap-parity hydration so a bare button looks "alive"
			without consumer overrides.
		</p>
		<dl>
			<dt><code>--set-button-color</code></dt>
			<dd>Text color. Resolves <code>style → variant → currentColor</code>.</dd>

			<dt><code>--set-button-background-color</code></dt>
			<dd>Surface fill. Resolves <code>style → variant → transparent</code>.</dd>

			<dt><code>--set-button-border-color</code></dt>
			<dd>Border tint. Resolves <code>style → variant → transparent</code>.</dd>

			<dt><code>--set-button-border-width</code></dt>
			<dd>Border thickness. Resolves <code>style → variant → 0</code>.</dd>

			<dt><code>--set-button-border-radius</code></dt>
			<dd>Corner roundness. Resolves <code>size → --radius-md</code>.</dd>

			<dt><code>--set-button-padding-inline</code></dt>
			<dd>Horizontal padding. Resolves <code>size → spacing × 3</code>.</dd>

			<dt><code>--set-button-padding-block</code></dt>
			<dd>Vertical padding. Resolves <code>size → spacing × 1.5</code>.</dd>

			<dt><code>--set-button-font-size</code></dt>
			<dd>Text size. Resolves <code>size → --text-sm</code>.</dd>

			<dt><code>--set-button-font-weight</code></dt>
			<dd>Text weight. Defaults to <code>--font-weight-normal</code>.</dd>

			<dt><code>--set-button-line-height</code></dt>
			<dd>Text line height. Defaults to <code>--leading-normal</code>.</dd>

			<dt><code>--set-button-transition-duration</code></dt>
			<dd>Animated-property duration. Defaults to <code>--set-transition-duration</code>.</dd>

			<dt><code>--set-button-cursor</code></dt>
			<dd>Pointer cursor. Defaults to <code>pointer</code>.</dd>

			<dt><code>--set-button-disabled-opacity</code></dt>
			<dd>Dimming applied to disabled buttons. Defaults to <code>0.5</code>.</dd>

			<dt><code>--set-button-focus-box-shadow</code></dt>
			<dd>
				The focus-visible ring. Computed from
				<code>--set-variant-background-color</code> mixed at
				<code>--set-focus-box-shadow-opacity</code> against transparent, sized by
				<code>--set-focus-box-shadow-width</code>.
			</dd>
		</dl>
	</section>
</template>
