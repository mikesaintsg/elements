<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Input</h1>
			<p class="mt-3 text-base leading-7">
				The
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">&lt;input&gt;</code>
				element renders text-like form controls. The framework styles every text-shaped type
				(<code>text</code>, <code>email</code>, <code>password</code>, <code>search</code>,
				<code>tel</code>, <code>url</code>, <code>number</code>, the date / time family) and leaves
				<code>checkbox</code>, <code>radio</code>, <code>range</code>, <code>color</code>,
				<code>file</code>, etc. untouched so OS-native widget chrome is preserved.
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Bare</h2>
			<p class="text-sm leading-6">
				No modifier — neutral border, system-color fill, font inherited from the page.
			</p>
			<div class="grid max-w-md gap-3">
				<input type="text" placeholder="Name" />
				<input type="email" placeholder="you@example.com" />
				<input type="password" placeholder="••••••••" />
			</div>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<p class="text-sm leading-6">
				A variant modifier swaps the border to the variant identity color — useful for inline
				validation or affordance hints.
			</p>
			<div class="grid max-w-md gap-3">
				<input type="text" class="primary" placeholder="Primary" />
				<input type="text" class="success" placeholder="Success" />
				<input type="text" class="warning" placeholder="Warning" />
				<input type="text" class="danger" placeholder="Danger" />
			</div>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sizes</h2>
			<div class="grid max-w-md gap-3">
				<input type="text" class="small" placeholder="Small" />
				<input type="text" placeholder="Default" />
				<input type="text" class="large" placeholder="Large" />
			</div>
		</section>

		<section id="states" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">States</h2>
			<div class="grid max-w-md gap-3">
				<input type="text" placeholder="Disabled" disabled />
				<input type="email" required value="not an email" />
				<fieldset disabled class="rounded border border-[color:var(--color-border)] p-3">
					<legend class="px-1 text-xs">fieldset[disabled]</legend>
					<input type="text" placeholder="Inherits :disabled" />
				</fieldset>
			</div>
		</section>
	</section>
</template>
