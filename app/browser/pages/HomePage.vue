<template>
	<article>
		<header class="mb-8 border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">elements</h1>
			<p class="mt-3 text-base text-slate-600">
				A semantic-first CSS framework on Tailwind v4. Pages hydrate as the framework grows.
			</p>
		</header>

		<section class="space-y-3 text-base leading-7 text-slate-700">
			<p>
				Styles flow outward from element semantics through token-driven custom properties.
				Modifier classes (<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm"
					>.primary</code
				>,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">.large</code>,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">.ghost</code>) set
				context tokens that elements consume via fallback chains. Tailwind v4 ships the palette,
				scales, and reset; the framework adds element baselines, modifier semantics, and a TS
				surface for typed component props.
			</p>
			<p>
				Use the navigation on the left to explore. Each element page demonstrates the modifier
				cascade in action.
			</p>
		</section>
	</article>
</template>
