<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;article&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>article</em> element — "a self-contained composition... independently
				distributable, e.g., in syndication." In this framework, bare
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">&lt;article&gt;</code>
				renders as a card. The element IS the component — no
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">.card</code> class. Variant / size /
				style / state modifiers cascade through <code>--set-article-*</code> tokens the same way
				they do for <code>&lt;button&gt;</code> or <code>&lt;a&gt;</code>. Direct child
				<code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> elements get card-header /
				card-footer chrome via descendant selectors — also no classes needed.
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Bare</h2>
			<p class="text-sm leading-6">
				Just <code>&lt;article&gt;</code> — no class. Padding, border, radius, soft shadow.
			</p>
			<article>
				<h3 class="m-0 text-lg font-semibold">Default card</h3>
				<p class="m-0 text-sm leading-6">
					Bare <code>&lt;article&gt;</code> ships chrome by default. The flex column + gap means
					children space out predictably without extra wrappers.
				</p>
			</article>
		</section>

		<section id="header-footer" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Header + footer slots</h2>
			<p class="text-sm leading-6">
				Direct child <code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> get chrome via
				descendant selectors — subtle band, separator, inner radius matched to the outer card edge.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold">Confirm action</h3>
					<p class="m-0 mt-1 text-sm">This card has both a header and a footer slot.</p>
				</header>
				<p class="m-0 text-sm leading-6">
					The body content sits between the two band-styled slot regions. The negative inline
					margins on header / footer bleed them to the article's inner edge.
				</p>
				<footer class="flex justify-end gap-2">
					<button type="button">Cancel</button>
					<button type="button" class="primary">Confirm</button>
				</footer>
			</article>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<p class="text-sm leading-6">
				A variant modifier tints the border to the variant's identity color. Same vocabulary used
				everywhere else in the framework.
			</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<article class="primary">
					<header><h3 class="m-0 text-base font-semibold">Primary</h3></header>
					<p class="m-0 text-sm">Variant border tracks <code>--color-primary</code>.</p>
				</article>
				<article class="success">
					<header><h3 class="m-0 text-base font-semibold">Success</h3></header>
					<p class="m-0 text-sm">Same modifier surface as buttons and anchors.</p>
				</article>
				<article class="warning">
					<header><h3 class="m-0 text-base font-semibold">Warning</h3></header>
					<p class="m-0 text-sm">
						No <code>.card-warning</code> class — just <code>.warning</code>.
					</p>
				</article>
				<article class="danger">
					<header><h3 class="m-0 text-base font-semibold">Danger</h3></header>
					<p class="m-0 text-sm">Tinted bands inherit the variant identity.</p>
				</article>
				<article class="information">
					<header><h3 class="m-0 text-base font-semibold">Information</h3></header>
					<p class="m-0 text-sm">Seven variants, one cascade.</p>
				</article>
				<article class="tertiary">
					<header><h3 class="m-0 text-base font-semibold">Tertiary</h3></header>
					<p class="m-0 text-sm">Composes cleanly with size + style modifiers.</p>
				</article>
			</div>
		</section>

		<section id="styles" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Styles</h2>
			<p class="text-sm leading-6">
				<code>.filled</code> fills the surface with the variant color. <code>.ghost</code> keeps the
				background neutral but tints the border + content color through the style → variant cascade.
			</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<article class="primary filled">
					<header><h3 class="m-0 text-base font-semibold">Primary filled</h3></header>
					<p class="m-0 text-sm">
						The fill comes from the variant; text inverts to its contrast color.
					</p>
				</article>
				<article class="success filled">
					<header><h3 class="m-0 text-base font-semibold">Success filled</h3></header>
					<p class="m-0 text-sm">Header/footer bands stay subtle even on filled cards.</p>
				</article>
				<article class="primary ghost">
					<header><h3 class="m-0 text-base font-semibold">Primary ghost</h3></header>
					<p class="m-0 text-sm">Transparent surface, tinted accent.</p>
				</article>
			</div>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sizes</h2>
			<p class="text-sm leading-6">
				<code>.small</code> tightens padding + font; <code>.large</code> roomy.
			</p>
			<div class="grid gap-4 sm:grid-cols-3">
				<article class="small">
					<header><h3 class="m-0 text-base font-semibold">Small</h3></header>
					<p class="m-0 text-xs">Compact card.</p>
				</article>
				<article>
					<header><h3 class="m-0 text-base font-semibold">Default</h3></header>
					<p class="m-0 text-sm">Bare-element default chrome.</p>
				</article>
				<article class="large">
					<header><h3 class="m-0 text-base font-semibold">Large</h3></header>
					<p class="m-0 text-base">Roomy card; same modifier vocabulary as buttons.</p>
				</article>
			</div>
		</section>

		<section id="composition" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Composition</h2>
			<p class="text-sm leading-6">
				Cards compose with the framework's other elements without ceremony — buttons in the footer,
				an anchor in the body, a code block. No classes added to the wrapping article beyond a
				single <code>.large</code>.
			</p>
			<article class="large">
				<header>
					<h3 class="m-0 text-lg font-semibold">Repository</h3>
					<p class="m-0 mt-1 text-sm">A self-contained composition.</p>
				</header>
				<p class="m-0 text-sm leading-6">
					Visit the <a href="#/home">home page</a> to see more elements demo'd. Or read the source:
					<code>src/styles/components/_article.scss</code>.
				</p>
				<footer class="flex items-center justify-between">
					<small class="">Updated 2 minutes ago</small>
					<div class="flex gap-2">
						<button type="button" class="small">Skip</button>
						<button type="button" class="primary small">View</button>
					</div>
				</footer>
			</article>
		</section>
	</section>
</template>
