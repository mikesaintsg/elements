<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">Textarea</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;textarea&gt;</code>
				element is a multi-line text input. The framework forces
				<code>resize: vertical</code>, opts into <code>field-sizing: content</code> (Chromium 123+,
				Firefox 142+) for auto-grow, and shares the variant / size / style cascade with
				<code>&lt;input&gt;</code>.
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Bare</h2>
			<textarea class="block max-w-md" placeholder="Tell us about your week…" />
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Variants</h2>
			<div class="grid max-w-md gap-3">
				<textarea class="primary" placeholder="Primary" />
				<textarea class="warning" placeholder="Warning" />
				<textarea class="danger" placeholder="Danger" />
			</div>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Sizes</h2>
			<div class="grid max-w-md gap-3">
				<textarea class="small" placeholder="Small" />
				<textarea placeholder="Default" />
				<textarea class="large" placeholder="Large" />
			</div>
		</section>

		<section id="disabled" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Disabled</h2>
			<textarea class="block max-w-md" placeholder="Read-only-ish" disabled />
		</section>
	</section>
</template>
