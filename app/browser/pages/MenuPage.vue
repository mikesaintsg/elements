<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">
				<code class="font-mono">&lt;menu&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The HTML <em>menu</em> element — "a toolbar consisting of an unordered list of items, each
				of which represents a command the user can perform or activate." The framework styles bare
				<code>&lt;menu&gt;</code> as a horizontal flex row designed to host
				<code>&lt;button&gt;</code> children directly or in <code>&lt;li&gt;</code> wrappers.
			</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				<code>&lt;li&gt;</code> wrappers use <code>display: contents</code> so their children become
				direct flex items of the menu — no extra layout layer to fight.
			</p>
		</header>

		<section id="toolbar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Toolbar</h2>
			<p class="text-sm leading-6 text-slate-600">
				Bare <code>&lt;menu&gt;</code> at body or article scope — a row of commands. Buttons stay at
				their natural size; the menu itself just provides the row layout + gap.
			</p>
			<menu>
				<li><button type="button" class="primary">New</button></li>
				<li><button type="button">Open</button></li>
				<li><button type="button">Save</button></li>
				<li><button type="button">Save As…</button></li>
				<li><button type="button" class="danger ghost">Delete</button></li>
			</menu>
		</section>

		<section id="card-actions" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Card action row</h2>
			<p class="text-sm leading-6 text-slate-600">
				Inside an <code>&lt;article&gt;</code>, <code>&lt;menu&gt;</code> defaults to
				<code>justify-content: flex-end</code> — actions push to the trailing edge, the convention
				every Material / Bootstrap / etc. card follows.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold">Confirm action</h3>
				</header>
				<p class="m-0 text-sm">
					This card uses <code>&lt;menu&gt;</code> as its action row instead of
					<code>&lt;footer&gt;</code> — both are valid; the menu reads as "list of commands" where
					the footer reads as "metadata at the bottom."
				</p>
				<menu>
					<li><button type="button">Cancel</button></li>
					<li><button type="button" class="primary">Confirm</button></li>
				</menu>
			</article>
		</section>

		<section id="bare-buttons" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">
				Direct button children (no &lt;li&gt; wrappers)
			</h2>
			<p class="text-sm leading-6 text-slate-600">
				The HTML spec requires <code>&lt;li&gt;</code> children inside <code>&lt;menu&gt;</code>,
				but in practice many templates skip the wrappers. The framework handles both — direct
				<code>&lt;button&gt;</code> children become the flex items.
			</p>
			<menu>
				<button type="button">Cut</button>
				<button type="button">Copy</button>
				<button type="button">Paste</button>
			</menu>
		</section>
	</section>
</template>
