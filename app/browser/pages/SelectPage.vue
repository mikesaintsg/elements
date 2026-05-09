<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Select</h1>
			<p class="mt-3 text-base leading-7">
				The
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">&lt;select&gt;</code>
				element renders a drop-down (or list-box with
				<code>multiple</code> / <code>size</code>). The framework strips the OS chevron and paints
				its own that tracks the variant color; the dropdown popup itself stays OS-rendered until
				<code>appearance: base-select</code> ships in every engine.
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Bare</h2>
			<select class="block max-w-md">
				<option>Pick one…</option>
				<option>Apple</option>
				<option>Banana</option>
				<option>Cherry</option>
			</select>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<div class="grid max-w-md gap-3">
				<select class="primary">
					<option>Primary</option>
				</select>
				<select class="success">
					<option>Success</option>
				</select>
				<select class="danger">
					<option>Danger</option>
				</select>
			</div>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sizes</h2>
			<div class="grid max-w-md gap-3">
				<select class="small">
					<option>Small</option>
				</select>
				<select>
					<option>Default</option>
				</select>
				<select class="large">
					<option>Large</option>
				</select>
			</div>
		</section>

		<section id="multiple" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Multiple / list-box</h2>
			<p class="text-sm leading-6">
				With <code>multiple</code> or <code>size&gt;1</code> the chevron is hidden because there's
				no single-row dropdown to indicate.
			</p>
			<select multiple size="4" class="block max-w-md">
				<option>Apple</option>
				<option>Banana</option>
				<option>Cherry</option>
				<option>Date</option>
			</select>
		</section>

		<section id="disabled" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Disabled</h2>
			<select disabled class="block max-w-md">
				<option>Disabled</option>
			</select>
		</section>
	</section>
</template>
