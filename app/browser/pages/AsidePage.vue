<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">
				<code class="font-mono">&lt;aside&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The HTML <em>aside</em> element — "tangentially related content, e.g., a sidebar, pull
				quote, ad unit, or related links." The framework styles two contexts, disambiguated by
				ancestry (no naming class):
			</p>
			<ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
				<li>
					<code>body &gt; aside</code> → page-level <strong>sidebar</strong> rail (you can see one
					on the right of this page on wide viewports).
				</li>
				<li>
					<code>article &gt; aside</code> → inline <strong>callout</strong> / pull-quote inside a
					card.
				</li>
			</ul>
		</header>

		<section id="callout" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">
				Callout (inside an article)
			</h2>
			<p class="text-sm leading-6 text-slate-600">
				Bare <code>&lt;aside&gt;</code> as a descendant of an <code>&lt;article&gt;</code> gets a
				leading vertical bar in the variant identity color, italic body, and inline-start padding —
				the classic pull-quote shape.
			</p>
			<article>
				<header>
					<h3 class="m-0 text-lg font-semibold text-slate-900">Component-driven CSS</h3>
				</header>
				<p class="m-0">
					The framework's pivot is to map CSS chrome onto bare HTML elements rather than classes.
					Every <code>&lt;aside&gt;</code> already means <em>tangentially related</em>. Why ask the
					consumer to write <code>.callout</code> on top?
				</p>
				<aside>
					“The most semantic markup is the markup the developer doesn’t have to think about.” —
					unknown
				</aside>
				<p class="m-0">
					Variant modifiers tint the leading bar through the same
					<code>--set-variant-background-color</code> cascade used everywhere.
				</p>
			</article>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Callout — variant tints</h2>
			<p class="text-sm leading-6 text-slate-600">
				Apply the variant modifier to the <code>&lt;aside&gt;</code> directly. The leading bar picks
				up the variant identity.
			</p>
			<article>
				<aside class="primary">
					A primary-tinted callout — for product highlights or shipping notes.
				</aside>
				<aside class="success">A success callout — celebrating the happy path.</aside>
				<aside class="warning">
					A warning callout — for irreversible actions or data-loss caveats.
				</aside>
				<aside class="danger">A danger callout — for destructive consequences.</aside>
			</article>
		</section>

		<section id="alert" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Alert / status banner</h2>
			<p class="text-sm leading-6 text-slate-600">
				<code>&lt;aside role="alert"&gt;</code> is the third context this partial covers: a flex-row
				banner with leading variant bar, body content, and an optional trailing dismiss
				<code>&lt;button&gt;</code>. Per ARIA, <code>role="alert"</code> is an assertive live region
				(announces immediately) — use it for time-sensitive or error states. For polite
				notifications use <code>role="status"</code>; for inline form-validation messages tied to a
				control, prefer <code>&lt;output role="alert"&gt;</code>.
			</p>
			<aside role="alert" class="danger">
				<span><strong>Heads up.</strong> Your session expires in 2 minutes.</span>
				<button type="button" aria-label="Dismiss">×</button>
			</aside>
			<aside role="alert" class="warning">
				<span> <strong>Unsaved changes.</strong> Leaving this page will discard your draft. </span>
				<button type="button" aria-label="Dismiss">×</button>
			</aside>
			<aside role="alert" class="success">
				<span><strong>Saved.</strong> Your profile is up to date.</span>
			</aside>
			<aside role="alert" class="information">
				<span> <strong>FYI.</strong> Enter your team's domain to enable single sign-on. </span>
			</aside>
		</section>

		<section id="sidebar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Sidebar (in body shell)</h2>
			<p class="text-sm leading-6 text-slate-600">
				When <code>&lt;aside&gt;</code> is a direct child of <code>&lt;body&gt;</code> (the layout
				shell from
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">_body.scss</code>), it
				becomes a fixed-width column with its own scroll, a leading-edge separator, and a
				<code>.start</code> placement modifier to flip the border to the trailing edge for asides on
				the leading column.
			</p>
			<p class="text-sm leading-6 text-slate-600">
				This page's right-hand "On this page" panel is itself
				<code>&lt;aside id="toc"&gt;</code> — directly demonstrating the rail context (visible at
				xl+ viewports).
			</p>
		</section>
	</section>
</template>
