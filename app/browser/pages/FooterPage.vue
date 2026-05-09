<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;footer&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>footer</em> element — "a footer for its nearest ancestor sectioning content
				element, or for the body." The framework styles two contexts:
			</p>
			<ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
				<li>
					<code>body &gt; footer</code> → page-level <strong>page footer</strong> (compact, top
					border separator).
				</li>
				<li>
					<code>article &gt; footer</code> → <strong>card footer</strong> slot (subtle band, bottom
					radius matched to the card edge).
				</li>
			</ul>
		</header>

		<section id="card-footer" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Card footer (in article)</h2>
			<p class="text-sm leading-6">
				Direct <code>&lt;footer&gt;</code> child of <code>&lt;article&gt;</code> picks up the
				card-footer band — typically used for action buttons and metadata.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold">Confirm action</h3>
				</header>
				<p class="m-0 text-sm">
					Card body content sits between the header and footer slots. The footer chrome bleeds to
					the inner edge with the bottom radius matched to the outer card.
				</p>
				<footer class="flex justify-end gap-2">
					<button type="button">Cancel</button>
					<button type="button" class="primary">Confirm</button>
				</footer>
			</article>
		</section>

		<section id="metadata-footer" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Metadata footer pattern</h2>
			<p class="text-sm leading-6">
				A common card-footer use: timestamp + tag row + secondary action.
			</p>
			<article class="primary">
				<header>
					<h3 class="m-0 text-lg font-semibold">Repository</h3>
				</header>
				<p class="m-0 text-sm">
					A self-contained composition. The header tints with the variant; the footer band inherits
					the same separator color.
				</p>
				<footer class="flex items-center justify-between text-sm">
					<small>Updated 2 minutes ago</small>
					<button type="button" class="primary small">View</button>
				</footer>
			</article>
		</section>

		<section id="page-footer" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Page footer (in body shell)</h2>
			<p class="text-sm leading-6">
				When <code>&lt;footer&gt;</code> is a direct child of the layout-shell
				<code>&lt;body&gt;</code>, it becomes the page's footer — spans the full bottom row of the
				body grid with a top separator. This app's "© 2026 elements" line at the bottom of the
				viewport is exactly that.
			</p>
		</section>
	</section>
</template>
