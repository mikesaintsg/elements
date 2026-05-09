<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">
				<code class="font-mono">&lt;header&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The HTML <em>header</em> element — "a group of introductory or navigational aids" for its
				nearest sectioning ancestor or the body. The framework styles two contexts:
			</p>
			<ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
				<li>
					<code>body &gt; header</code> → page-level <strong>app bar</strong> (compact, padded, with
					a bottom border).
				</li>
				<li>
					<code>article &gt; header</code> → <strong>card header</strong> slot (subtle band, top
					radius rounded to match the card edge).
				</li>
			</ul>
		</header>

		<section id="card-header" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Card header (in article)</h2>
			<p class="text-sm leading-6 text-slate-600">
				Direct <code>&lt;header&gt;</code> child of <code>&lt;article&gt;</code> picks up the
				card-header band — a subtle tint, separator border below, inner radius matched to the outer
				card edge.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold text-slate-900">Card title</h3>
					<p class="m-0 mt-1 text-sm text-slate-600">
						Optional sub-text that sits under the title in the band region.
					</p>
				</header>
				<p class="m-0">
					Card body content. The header sits flush with the card's inner top edge — no whitespace
					gap.
				</p>
			</article>
		</section>

		<section id="page-header" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">
				Page app bar (in body shell)
			</h2>
			<p class="text-sm leading-6 text-slate-600">
				When <code>&lt;header&gt;</code> is a direct child of the layout-shell
				<code>&lt;body&gt;</code>, it becomes the page's app bar (visible on this app's mobile
				topbar; hidden on lg+ where the sidebar takes the brand surface).
			</p>
			<p class="text-sm leading-6 text-slate-600">
				Outside the layout shell — e.g., a long-form blog post with a hero
				<code>&lt;header&gt;</code> — the framework deliberately paints no chrome, so heroes can
				stay free-form without fighting the compact app-bar look.
			</p>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Variant tints</h2>
			<p class="text-sm leading-6 text-slate-600">
				A variant modifier on the article reaches the card-header band's separator color through the
				variant cascade.
			</p>
			<div class="grid gap-4 sm:grid-cols-2">
				<article class="primary">
					<header>
						<h3 class="m-0 text-base font-semibold">Primary card</h3>
					</header>
					<p class="m-0 text-sm text-slate-600">Border + header separator track the variant.</p>
				</article>
				<article class="success">
					<header>
						<h3 class="m-0 text-base font-semibold">Success card</h3>
					</header>
					<p class="m-0 text-sm text-slate-600">Same vocabulary, different identity.</p>
				</article>
			</div>
		</section>
	</section>
</template>
