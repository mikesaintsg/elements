<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">elements</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				A semantic-first CSS framework on Tailwind v4. The pitch in one sentence:
				<strong class="text-slate-900">the HTML element IS the component</strong> — write
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;article&gt;</code>
				to get a card,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;aside&gt;</code>
				for a sidebar,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;dialog&gt;</code>
				for a modal,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;menu&gt;</code>
				for a toolbar. No <code>.card</code>, no <code>.sidebar</code>, no
				<code>.modal-dialog</code>. Variations come from a small modifier vocabulary that's the same
				across every element.
			</p>
		</header>

		<section id="philosophy" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Philosophy</h2>
			<p class="text-sm leading-6 text-slate-700">
				Every framework decision flows out of element semantics. A <code>&lt;button&gt;</code> is
				interactive, so it gets the action-surface chrome — bare <code>.primary</code> auto-fills
				with the variant color. An <code>&lt;article&gt;</code> is a self-contained composition, so
				its variant only tints the border; <code>.filled</code> is the explicit opt-in for surface
				fill. An <code>&lt;aside&gt;</code> means "tangentially related" — inside the body shell
				it's a sidebar; inside an <code>&lt;article&gt;</code> it's a callout. The element
				disambiguates its own context.
			</p>
			<aside>
				The HTML Living Standard already named these patterns. Why ask the developer to write
				<code>.card</code> on top?
			</aside>
		</section>

		<section id="scope" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">What ships today</h2>
			<dl class="grid gap-3 sm:grid-cols-[max-content_1fr]">
				<dt class="font-semibold text-slate-900">Element baselines</dt>
				<dd class="m-0 text-sm text-slate-600">
					Full token-driven cascade for <code>&lt;button&gt;</code>, <code>&lt;a&gt;</code>,
					<code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code>, <code>&lt;select&gt;</code>,
					<code>&lt;dialog&gt;</code>, <code>&lt;table&gt;</code> family.
				</dd>
				<dt class="font-semibold text-slate-900">Components</dt>
				<dd class="m-0 text-sm text-slate-600">
					Bare-element compositions on every sectioning tag — <code>&lt;article&gt;</code> as card,
					<code>&lt;aside&gt;</code> as sidebar / callout, <code>&lt;header&gt;</code> as app bar,
					<code>&lt;footer&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;menu&gt;</code> as
					toolbar, <code>&lt;search&gt;</code> as search bar, <code>&lt;form&gt;</code> as form
					stack.
				</dd>
				<dt class="font-semibold text-slate-900">Modifiers</dt>
				<dd class="m-0 text-sm text-slate-600">
					Four orthogonal dimensions: <code>variant</code> (primary, success, danger…),
					<code>size</code> (small, large), <code>style</code> (filled, ghost),
					<code>state</code> (disabled, active, loading). Plus placement modifiers (start, end) for
					layout-aware components.
				</dd>
				<dt class="font-semibold text-slate-900">Surfaces</dt>
				<dd class="m-0 text-sm text-slate-600">
					Browser-rendered chrome that isn't a tag — <code>::backdrop</code>,
					<code>[popover]</code>, scrollbar styling.
				</dd>
			</dl>
		</section>

		<section id="getting-around" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Getting around</h2>
			<p class="text-sm leading-6 text-slate-700">
				The left rail lists every element, component, and pattern by tag name. Press
				<kbd class="rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-xs">/</kbd>
				to focus the filter input in the page banner. Each element page demos the modifier cascade
				in action — start with <a href="#/article">article</a> if you want the flagship "element IS
				component" proof point, or <a href="#/button">button</a> for the simplest cascade
				walkthrough.
			</p>
		</section>

		<section id="composition" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Composition example</h2>
			<p class="text-sm leading-6 text-slate-600">
				Every element below is bare HTML wearing nothing but framework modifier classes.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold text-slate-900">Repository</h3>
				</header>
				<p class="m-0 text-sm leading-6 text-slate-700">
					An <code>&lt;article&gt;</code> with a <code>&lt;header&gt;</code> slot, body content, and
					a <code>&lt;footer&gt;</code> action row. No <code>.card</code> /
					<code>.card-header</code> / <code>.card-body</code> / <code>.card-footer</code>
					classes — the descendant context tells the framework what to paint where.
				</p>
				<footer class="flex items-center justify-between text-sm">
					<small class="text-slate-500">Updated 2 minutes ago</small>
					<menu>
						<button type="button">Skip</button>
						<button type="button" class="primary">View</button>
					</menu>
				</footer>
			</article>
		</section>
	</section>
</template>
