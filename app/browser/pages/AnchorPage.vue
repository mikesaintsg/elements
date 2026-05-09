<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Anchor</h1>
			<p class="mt-3 text-base leading-7">
				The
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">&lt;a&gt;</code>
				element is a hyperlink. Bare anchors stay inline and underlined; modifier classes route them
				through the same variant / size / style cascade as
				<a href="#/button">&lt;button&gt;</a>, so a link can act anywhere from "underlined blue
				text" to "filled call-to-action".
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Bare</h2>
			<p class="text-sm leading-6">
				With no modifier the anchor inherits its surrounding color and stays underlined — the
				classic in-prose link.
			</p>
			<p class="text-base leading-7">
				Read the <a href="#/home">overview</a> or jump to the <a href="#/button">button page</a>.
				Both are inline links inside this paragraph.
			</p>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<p class="text-sm leading-6">
				A variant modifier swaps the anchor's text color to the variant's identity color — underline
				preserved.
			</p>
			<p class="space-x-3 text-base leading-7">
				<a href="#" class="primary">Primary link</a>
				<a href="#" class="secondary">Secondary link</a>
				<a href="#" class="tertiary">Tertiary link</a>
				<a href="#" class="success">Success link</a>
				<a href="#" class="warning">Warning link</a>
				<a href="#" class="danger">Danger link</a>
				<a href="#" class="information">Information link</a>
			</p>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sizes (with chrome)</h2>
			<p class="text-sm leading-6">
				Adding a size modifier opts the anchor into the same padding / radius scale a button uses.
				Useful for "link-shaped" CTAs that need a hit area.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<a href="#" class="primary small filled">Small filled link</a>
				<a href="#" class="primary filled">Default filled link</a>
				<a href="#" class="primary large filled">Large filled link</a>
			</div>
		</section>

		<section id="styles" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Styles</h2>
			<p class="text-sm leading-6">
				<code class="rounded px-1 py-0.5 font-mono text-xs">.filled</code>
				routes the variant fill into the anchor and drops the underline (the fill is the affordance
				now).
				<code class="rounded px-1 py-0.5 font-mono text-xs">.ghost</code>
				keeps the variant text color and the underline against a transparent surface — identical to
				a bare-variant link, with the cascade making it explicit.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<a href="#" class="primary filled">Filled</a>
				<a href="#" class="primary ghost">Ghost</a>
				<a href="#" class="success filled">Success filled</a>
				<a href="#" class="danger filled">Danger filled</a>
			</div>
		</section>

		<section id="disabled" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Disabled</h2>
			<p class="text-sm leading-6">
				Anchors have no <code class="font-mono text-xs">disabled</code> attribute, so the framework
				reads
				<code class="rounded px-1 py-0.5 font-mono text-xs">aria-disabled="true"</code>
				and the <code class="rounded px-1 py-0.5 font-mono text-xs">.disabled</code>
				modifier — both apply
				<code class="rounded px-1 py-0.5 font-mono text-xs">cursor: not-allowed</code>, dim opacity,
				and disable pointer events.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<a href="#" class="primary">Active</a>
				<a href="#" class="primary disabled">Disabled (.disabled)</a>
				<a href="#" class="primary" aria-disabled="true">Disabled (aria-disabled)</a>
			</div>
		</section>

		<section id="accessibility" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Accessibility</h2>
			<ul class="list-disc space-y-2 pl-5 text-sm leading-6">
				<li>
					Use <code class="rounded px-1 py-0.5 font-mono text-xs">&lt;a href&gt;</code>
					for navigation and
					<code class="rounded px-1 py-0.5 font-mono text-xs">&lt;button&gt;</code>
					for actions. An anchor without
					<code class="rounded px-1 py-0.5 font-mono text-xs">href</code> is not focusable and
					conveys no role.
				</li>
				<li>
					Pair
					<code class="rounded px-1 py-0.5 font-mono text-xs">target="_blank"</code>
					with
					<code class="rounded px-1 py-0.5 font-mono text-xs">rel="noopener noreferrer"</code>
					to prevent tab-napping.
				</li>
				<li>
					Disabled links should also remove
					<code class="rounded px-1 py-0.5 font-mono text-xs">href</code> or set
					<code class="rounded px-1 py-0.5 font-mono text-xs">tabindex="-1"</code>
					so keyboard users can't activate them.
				</li>
			</ul>
		</section>
	</section>
</template>
