<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Table</h1>
			<p class="mt-3 text-base leading-7">
				The
				<code class="rounded px-1.5 py-0.5 font-mono text-sm">&lt;table&gt;</code>
				element is for tabular data only — never layout. The framework forces
				<code>border-collapse: collapse</code>, paints subtle row dividers via
				<code>border-block-end</code> on cells (so single-row tables stay clean), and routes the
				divider color through the variant cascade.
			</p>
		</header>

		<section id="bare" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Bare</h2>
			<table>
				<caption class="text-sm">
					Q1 product launches
				</caption>
				<thead>
					<tr>
						<th>Product</th>
						<th>Status</th>
						<th>Owner</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Anchor</td>
						<td>Shipped</td>
						<td>Kira</td>
					</tr>
					<tr>
						<td>Button</td>
						<td>Shipped</td>
						<td>Devon</td>
					</tr>
					<tr>
						<td>Dialog</td>
						<td>In review</td>
						<td>Maya</td>
					</tr>
					<tr>
						<td>Select</td>
						<td>In design</td>
						<td>Reza</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<p class="text-sm leading-6">
				The variant modifier moves the divider color to the variant identity, tinted to stay
				readable.
			</p>
			<table class="primary">
				<thead>
					<tr>
						<th>Region</th>
						<th>Revenue</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>NA</td>
						<td>$1.2M</td>
					</tr>
					<tr>
						<td>EU</td>
						<td>$0.9M</td>
					</tr>
					<tr>
						<td>APAC</td>
						<td>$0.7M</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sizes</h2>
			<table class="small">
				<thead>
					<tr>
						<th>Small</th>
						<th>cells</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Tighter</td>
						<td>padding</td>
					</tr>
					<tr>
						<td>Smaller</td>
						<td>font</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
