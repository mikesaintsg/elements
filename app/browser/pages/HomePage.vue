<script lang="ts" setup></script>

<template>
	<section>
		<header>
			<h1>elements</h1>
			<p>
				A semantic-first CSS framework on Tailwind v4. The pitch in one sentence:
				<strong>the HTML element IS the component</strong> — write <code>&lt;article&gt;</code> to
				get a card, <code>&lt;aside&gt;</code> for a sidebar, <code>&lt;dialog&gt;</code> for a
				modal, <code>&lt;menu&gt;</code> for a toolbar. No <code>.card</code>, no
				<code>.sidebar</code>, no <code>.modal-dialog</code>. Variations come from a small modifier
				vocabulary that's the same across every element.
			</p>
		</header>

		<section id="philosophy">
			<h2>Philosophy</h2>
			<p>
				Every framework decision flows out of element semantics. A <code>&lt;button&gt;</code> is
				interactive, so it gets the action-surface chrome — bare <code>.primary</code> auto-fills
				with the variant color. An <code>&lt;article&gt;</code> is a self-contained composition, so
				its variant only tints the border; <code>.filled</code> is the explicit opt-in for surface
				fill. An <code>&lt;aside&gt;</code> means "tangentially related" — inside the body shell
				it's a sidebar; inside an <code>&lt;article&gt;</code> it's a callout. The element
				disambiguates its own context.
			</p>
			<aside>
				The HTML Living Standard already named these patterns. Why ask the developer to write
				<code>.card</code> on top?
			</aside>
		</section>

		<section id="scope">
			<h2>What ships today</h2>
			<dl class="showcase-spec">
				<dt>Element baselines</dt>
				<dd>
					Full token-driven cascade for <code>&lt;button&gt;</code>, <code>&lt;a&gt;</code>,
					<code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code>, <code>&lt;select&gt;</code>,
					<code>&lt;dialog&gt;</code>, <code>&lt;table&gt;</code> family.
				</dd>
				<dt>Components</dt>
				<dd>
					Bare-element compositions on every sectioning tag —
					<code>&lt;article&gt;</code> as card, <code>&lt;aside&gt;</code> as sidebar / callout,
					<code>&lt;header&gt;</code> as app bar, <code>&lt;footer&gt;</code>,
					<code>&lt;nav&gt;</code>, <code>&lt;menu&gt;</code> as toolbar,
					<code>&lt;search&gt;</code> as search bar, <code>&lt;form&gt;</code> as form stack.
				</dd>
				<dt>Modifiers</dt>
				<dd>
					Four orthogonal dimensions: <code>variant</code> (primary, success, danger…),
					<code>size</code> (small, large), <code>style</code> (filled, ghost),
					<code>state</code> (disabled, active, loading). Plus placement modifiers
					(<code>top</code>, <code>bottom</code>, <code>start</code>, <code>end</code>) for anchored
					surfaces.
				</dd>
				<dt>Surfaces</dt>
				<dd>
					Browser-rendered chrome that isn't a tag — <code>::backdrop</code>,
					<code>[popover]</code>, scrollbar styling, anchor positioning.
				</dd>
				<dt>Composables</dt>
				<dd>
					20 Vue adapters paired with framework-agnostic factories — <code>useDialog</code>,
					<code>useDetails</code>, <code>useMenu</code>, <code>useTooltip</code>,
					<code>useToast</code>, <code>useTable</code>, <code>useForm</code>,
					<code>useSelect</code>, and more. Each gates on the semantically-correct host element.
				</dd>
			</dl>
		</section>

		<section id="getting-around">
			<h2>Getting around</h2>
			<p>
				The left rail lists every element, component, pattern, and composable by tag name. Press
				<kbd>/</kbd> to focus the filter input. Each element page demos the modifier cascade in
				action — start with <a href="#/article">article</a> if you want the flagship "element IS
				component" proof point, or <a href="#/button">button</a> for the simplest cascade
				walkthrough.
			</p>
		</section>

		<section id="composition">
			<h2>Composition example</h2>
			<p>Every element below is bare HTML wearing nothing but framework modifier classes.</p>
			<article>
				<header>
					<h3>Repository</h3>
				</header>
				<p>
					An <code>&lt;article&gt;</code> with a <code>&lt;header&gt;</code> slot, body content, and
					a <code>&lt;footer&gt;</code> action row. No <code>.card</code> /
					<code>.card-header</code> / <code>.card-body</code> / <code>.card-footer</code>
					classes — the descendant context tells the framework what to paint where.
				</p>
				<footer class="showcase-row">
					<small>Updated 2 minutes ago</small>
					<menu>
						<button type="button">Skip</button>
						<button type="button" class="primary">View</button>
					</menu>
				</footer>
			</article>
		</section>
	</section>
</template>
