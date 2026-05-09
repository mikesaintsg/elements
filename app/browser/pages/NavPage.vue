<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">
				<code class="font-mono">&lt;nav&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The HTML <em>nav</em> element — "a section of a page that links to other pages or to parts
				within the page." The framework defaults bare <code>&lt;nav&gt;</code> to block flow and
				lets descendant content semantics drive the visual variant — no class on the nav itself.
			</p>
		</header>

		<section id="navbar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Navbar (with inner list)</h2>
			<p class="text-sm leading-6 text-slate-600">
				A <code>&lt;nav&gt;&lt;ul&gt;</code> renders as a horizontal flex row with no list markers —
				the natural shape for a top-bar nav.
			</p>
			<nav>
				<ul>
					<li><a href="#/home">Home</a></li>
					<li><a href="#/article">Article</a></li>
					<li><a href="#/button">Button</a></li>
					<li><a href="#/forms">Forms</a></li>
				</ul>
			</nav>
		</section>

		<section id="breadcrumb" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Breadcrumb</h2>
			<p class="text-sm leading-6 text-slate-600">
				Opt-in via <code>aria-label="Breadcrumb"</code> on the nav (the WAI-ARIA Authoring Practices
				recommendation). Chevron separators appear between siblings; only this explicit pattern
				triggers them — pagination, table-of-contents, and other
				<code>&lt;nav&gt;&lt;ol&gt;</code> patterns stay separator-free.
			</p>
			<nav aria-label="Breadcrumb">
				<ol>
					<li><a href="#/home">Home</a></li>
					<li><a href="#/forms">Forms</a></li>
					<li>Output</li>
				</ol>
			</nav>
		</section>

		<section id="pagination" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Pagination</h2>
			<p class="text-sm leading-6 text-slate-600">
				A <code>&lt;nav aria-label="Pagination"&gt;&lt;ol&gt;</code> with numbered links — the
				framework lays out the inner list horizontally without separators, leaving consumers free to
				add their own visual treatment for previous/next, current page highlighting, etc.
			</p>
			<nav aria-label="Pagination">
				<ol>
					<li><a href="#prev">‹ Prev</a></li>
					<li><a href="#1">1</a></li>
					<li><a href="#2" aria-current="page">2</a></li>
					<li><a href="#3">3</a></li>
					<li><a href="#4">4</a></li>
					<li><a href="#next">Next ›</a></li>
				</ol>
			</nav>
		</section>

		<section id="rail" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Primary navigation rail</h2>
			<p class="text-sm leading-6 text-slate-600">
				When <code>&lt;nav&gt;</code> is a direct child of the layout-shell
				<code>&lt;body&gt;</code>, it becomes the page's primary navigation rail — vertical column,
				fixed inline-size, padded, scrollable, with a separator border. The navigation panel on the
				left of this app is exactly that.
			</p>
			<p class="text-sm leading-6 text-slate-600">
				Use <code>&lt;nav class="end"&gt;</code> to flip the border to the leading edge for rails
				placed on the trailing column.
			</p>
		</section>
	</section>
</template>
