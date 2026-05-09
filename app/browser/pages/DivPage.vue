<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;div&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>div</em> element — "no special meaning; it represents its children." The
				framework's last-resort fallback for layout primitives + widgets that have no semantic home.
				We deliberately prefer a more semantic element when one exists (<code>&lt;output&gt;</code>
				over a count chip, <code>&lt;mark&gt;</code> over a highlight span,
				<code>&lt;article&gt;</code> over a card div, …) and reach for <code>&lt;div&gt;</code> only
				when nothing else fits.
			</p>
			<p class="mt-2 text-sm leading-6">
				Two layout primitives ship today: <code>.stack</code> (vertical flow) and
				<code>.cluster</code> (horizontal wrap). Both are class-keyed because
				<code>&lt;div&gt;</code> carries no semantic meaning a selector could rely on.
			</p>
		</header>

		<section id="stack" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">.stack — vertical flow</h2>
			<p class="text-sm leading-6">
				A <code>&lt;div class="stack"&gt;</code> stacks its children vertically with consistent gap.
				The most common composition pattern in CSS — what you'd otherwise reach for
				<code>flex flex-col gap-4</code> Tailwind utilities to express. Override
				<code>--set-stack-gap</code> per instance for tighter or looser spacing.
			</p>
			<div class="stack rounded border border-[color:var(--color-border)] p-4">
				<div class="rounded px-3 py-2">First child</div>
				<div class="rounded px-3 py-2">Second child</div>
				<div class="rounded px-3 py-2">Third child</div>
			</div>

			<p class="mt-3 text-sm leading-6">Custom gap via the token (e.g. tighter):</p>
			<div
				class="stack rounded border border-[color:var(--color-border)] p-4"
				style="--set-stack-gap: 0.25rem"
			>
				<div class="rounded px-3 py-2">Tight stack — 0.25rem gap</div>
				<div class="rounded px-3 py-2">Tight stack — 0.25rem gap</div>
				<div class="rounded px-3 py-2">Tight stack — 0.25rem gap</div>
			</div>
		</section>

		<section id="cluster" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">.cluster — horizontal wrap</h2>
			<p class="text-sm leading-6">
				A <code>&lt;div class="cluster"&gt;</code> lays its children out as a wrapping flex row,
				aligned center by default. Useful for tags, button rows, chip lists, and the like.
			</p>
			<div class="cluster rounded border border-[color:var(--color-border)] p-4">
				<button type="button" class="primary small">Primary</button>
				<button type="button" class="success small">Success</button>
				<button type="button" class="warning small">Warning</button>
				<button type="button" class="danger small">Danger</button>
				<button type="button" class="information small">Information</button>
				<button type="button" class="tertiary small">Tertiary</button>
				<button type="button" class="secondary small">Secondary</button>
			</div>
		</section>

		<section id="prefer-semantic" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Prefer the semantic alternative</h2>
			<p class="text-sm leading-6">
				Before reaching for <code>&lt;div&gt;</code>, check whether a more semantic element exists.
				The framework supplies chrome for many such cases out of the box:
			</p>
			<ul class="list-disc space-y-1 pl-5 text-sm leading-6">
				<li>Card → <code>&lt;article&gt;</code> (not <code>&lt;div class="card"&gt;</code>)</li>
				<li>Sidebar → <code>&lt;aside&gt;</code> (not <code>&lt;div class="sidebar"&gt;</code>)</li>
				<li>App bar → <code>&lt;header&gt;</code></li>
				<li>Toolbar / actions → <code>&lt;menu&gt;</code></li>
				<li>Search bar → <code>&lt;search&gt;</code></li>
				<li>Live count → <code>&lt;output&gt;</code></li>
				<li>Highlighted text → <code>&lt;mark&gt;</code></li>
				<li>Definition term → <code>&lt;dfn&gt;</code></li>
				<li>
					Inline code → <code>&lt;code&gt;</code> / <code>&lt;kbd&gt;</code> /
					<code>&lt;samp&gt;</code>
				</li>
			</ul>
		</section>
	</section>
</template>
