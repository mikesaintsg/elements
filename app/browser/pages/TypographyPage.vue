<script lang="ts" setup></script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Typography</h1>
			<p class="mt-3 text-base leading-7">
				Phase 3 — prose elements. Headings get the full cascade so
				<code>&lt;h2 class="primary"&gt;</code> tints; <code>&lt;hr&gt;</code> /
				<code>&lt;blockquote&gt;</code> / inline code / <code>&lt;pre&gt;</code> /
				<code>&lt;dl&gt;</code> add framework rules where Tailwind preflight is too aggressive.
			</p>
		</header>

		<section id="headings" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Heading scale</h2>
			<div class="space-y-2 rounded border border-[color:var(--color-border)] p-4">
				<h1>Heading 1 — section title</h1>
				<h2>Heading 2 — page section</h2>
				<h3>Heading 3 — subsection</h3>
				<h4>Heading 4 — card title</h4>
				<h5>Heading 5 — minor head</h5>
				<h6>Heading 6 — sidebar label</h6>
			</div>

			<h3 class="text-lg font-semibold">Variant tinting</h3>
			<div class="space-y-2">
				<h2 class="primary">Primary heading</h2>
				<h2 class="success">Success heading</h2>
				<h2 class="danger">Danger heading</h2>
			</div>
		</section>

		<section id="hr" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Thematic break</h2>
			<hr />
			<p class="text-sm">Bare <code>&lt;hr&gt;</code> — neutral 1px stroke.</p>
			<hr class="primary" />
			<p class="text-sm"><code>&lt;hr class="primary"&gt;</code> — variant-tracked stroke.</p>
			<hr class="danger" />
			<p class="text-sm"><code>&lt;hr class="danger"&gt;</code> — danger stroke.</p>
		</section>

		<section id="blockquote" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Blockquote</h2>
			<blockquote>
				The framework adds an inline-start bar in the variant color and italics. Bare quotes get a
				neutral bar; class-tinted ones light up.
			</blockquote>
			<blockquote class="success">
				A success-tinted quote. Use sparingly — the bar carries semantic weight.
			</blockquote>
		</section>

		<section id="inline-code" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Inline code &amp; keys</h2>
			<p>
				Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to focus the search input. The shortcut is bound to
				<code>document.addEventListener('keydown', ...)</code>; the handler reads
				<var>event.key</var> and emits <samp>search:focus</samp> when matched.
			</p>
		</section>

		<section id="pre" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Code blocks</h2>
			<pre><code>// Inside a &lt;pre&gt;, &lt;code&gt; loses its inline chrome —
// the block owns the background.
const tokens = {
  color: { primary: '--color-primary' },
  button: { color: '--set-button-color' },
} as const</code></pre>
		</section>

		<section id="dl" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Description list</h2>
			<dl>
				<dt>Variant</dt>
				<dd>Semantic color identity (primary, success, danger…). Drives variant-context tokens.</dd>
				<dt>Size</dt>
				<dd>Discrete scale (small, large). Drives padding + font-size tokens.</dd>
				<dt>Style</dt>
				<dd>Visual treatment (ghost, filled). Drives style-context tokens.</dd>
				<dt>State</dt>
				<dd>Interaction state (disabled, active, loading). Toggles existing element rules.</dd>
			</dl>
		</section>
	</section>
</template>
