<script lang="ts" setup>
 /**
 * Showcase home page. Demonstrates the chrome (left/right drawers,
 * theme toggle, sidebar filter, scroll-to-target TOC) AND showcases
 * the sectioning-content baseline: bare `<main>` and `<section>`
 * already ship with proper padding gutters + vertical rhythm so the
 * page reads cleanly with zero per-element layout classes.
 */
</script>

<template>
	<section id="home">
		<hgroup>
			<h1>Elements</h1>
			<p>A semantic-first CSS + TS framework over Tailwind v4.</p>
		</hgroup>
		<p>
			<strong>The HTML element IS the component.</strong> Write <code>&lt;article&gt;</code> for a
			card, <code>&lt;aside&gt;</code> for a sidebar, <code>&lt;dialog&gt;</code> for a modal,
			<code>&lt;menu&gt;</code> for a toolbar. No <code>.card</code>, no <code>.sidebar</code>, no
			<code>.modal-dialog</code>. Variations come from a small modifier vocabulary (variant / size /
			style / state / placement) that's the same across every element.
		</p>
	</section>

	<section id="philosophy">
		<h2>Philosophy</h2>
		<p>
			Every framework decision flows out of element semantics. A <code>&lt;button&gt;</code>
			is interactive, so it auto-fills with the variant identity. An
			<code>&lt;article&gt;</code> is a self-contained composition, so its variant only tints the
			border. An <code>&lt;aside&gt;</code> inside the body shell is a sidebar; inside an
			<code>&lt;article&gt;</code> it's a callout. The element disambiguates its own context.
		</p>
		<p>
			Sectioning content is part of that surface. Bare <code>&lt;main&gt;</code> and
			<code>&lt;section&gt;</code> ship with hydrated padding gutters and a flex-column rhythm so
			authors can drop them in without reaching for <code>&lt;div class="stack"&gt;</code>.
			Successive sections collapse their double padding automatically.
		</p>
	</section>

	<section id="layers">
		<h2>The five style layers</h2>
		<p>
			Cascade-layer order:
			<code>theme, base, elements, components, surfaces, composables, modifiers, utilities</code>.
			Later layers win.
		</p>
		<dl>
			<dt><code>elements/</code></dt>
			<dd>One partial per HTML tag. Token-driven baseline + UA-quirk reset.</dd>
			<dt><code>components/</code></dt>
			<dd>Element compositions that read as one UI thing — card, sidebar, navbar, toolbar.</dd>
			<dt><code>surfaces/</code></dt>
			<dd>Browser-rendered chrome — <code>[popover]</code>, <code>::backdrop</code>, scrollbar.</dd>
			<dt><code>composables/</code></dt>
			<dd>
				Component chrome gated on a composable's state attribute — drawer geometry, listbox layout,
				toast deck.
			</dd>
			<dt><code>modifiers/</code></dt>
			<dd>The four orthogonal dimensions plus the placements system.</dd>
		</dl>
	</section>

	<section id="modifiers">
		<h2>The modifier vocabulary</h2>
		<p>
			Four orthogonal dimensions plus a placements system — an element takes at most one value from
			each. Tailwind owns the corner-roundness names (<code>.rounded</code>,
			<code>.outline</code>, <code>text-*</code>) so the framework deliberately doesn't ship a shape
			dimension, an <code>.outline</code> style, or a <code>.huge</code> size.
		</p>
		<ul>
			<li>
				<strong>Variant</strong> — semantic identity (<code>primary</code>, <code>secondary</code>,
				<code>tertiary</code>, <code>success</code>, <code>warning</code>, <code>danger</code>,
				<code>information</code>)
			</li>
			<li>
				<strong>Size</strong> — physical scale (<code>small</code>, default, <code>large</code>)
			</li>
			<li>
				<strong>Style</strong> — fill treatment (<code>subtle</code>, default, <code>filled</code>)
			</li>
			<li>
				<strong>State</strong> — interaction state (<code>disabled</code>, <code>active</code>,
				<code>loading</code>)
			</li>
			<li>
				<strong>Placement</strong> — anchored placement on popover surfaces (<code>top</code>,
				<code>bottom</code>, <code>start</code>, <code>end</code> + corners)
			</li>
		</ul>
	</section>

	<section id="getting-started">
		<h2>Getting started</h2>
		<p>Two CSS imports plus one TS import:</p>
		<pre><code>/* user-entry.css */
@import "tailwindcss";
@import "@elements/styles";</code></pre>
		<pre><code>// user-entry.ts
import { useDialog, useToast } from '@elements/browser'</code></pre>
		<p>
			Build your app with bare HTML + framework modifier classes. Reach for Tailwind utilities for
			last-mile tweaks. Reach for composables when you need behavioural state.
		</p>
	</section>

	<section id="next">
		<h2>Where next</h2>
		<p>
			Press <kbd>/</kbd> to filter the left sidebar. The right sidebar tracks sections on the
			current page — click an entry to jump to it. On mobile, both sidebars become drawers triggered
			from the header.
		</p>
	</section>
</template>
