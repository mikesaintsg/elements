<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">Button</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;button&gt;</code>
				element represents an interactive control that triggers an action when activated. The
				framework's button consumes context tokens via fallback chains so modifier classes (<code
					class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm"
					>.primary</code
				>, <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">.large</code>,
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">.ghost</code>, …) compose
				without per-element rules.
			</p>
		</header>

		<section id="types" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Types</h2>
			<p class="text-sm leading-6 text-slate-600">
				The <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">type</code> attribute
				controls what the button does inside a form. Always declare it explicitly — the browser
				default is <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">submit</code>,
				which will unexpectedly submit the nearest form if omitted.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button">Action</button>
				<button type="submit">Submit</button>
				<button type="reset">Reset</button>
			</div>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Variants</h2>
			<p class="text-sm leading-6 text-slate-600">
				Each variant modifier sets the four
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--set-variant-*</code>
				context tokens. The button consumes them; no per-element variant rules.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary">Primary</button>
				<button type="button" class="secondary">Secondary</button>
				<button type="button" class="tertiary">Tertiary</button>
				<button type="button" class="success">Success</button>
				<button type="button" class="warning">Warning</button>
				<button type="button" class="danger">Danger</button>
				<button type="button" class="information">Information</button>
			</div>
		</section>

		<section id="sizes" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Sizes</h2>
			<p class="text-sm leading-6 text-slate-600">
				Size modifiers route Tailwind's
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--spacing</code>,
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--text-*</code>, and
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--radius-*</code>
				scales into
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--set-size-*</code>
				context tokens. Two values:
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.small</code> and
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.large</code>. The bare
				element renders at the default size — there's no
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.medium</code> because
				absence is the default.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary small">Small</button>
				<button type="button" class="primary">Default</button>
				<button type="button" class="primary large">Large</button>
			</div>
		</section>

		<section id="styles" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Styles</h2>
			<p class="text-sm leading-6 text-slate-600">
				Style modifiers re-route the variant's color through
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">--set-style-*</code>
				tokens. <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.ghost</code>
				renders the variant color as text only against a transparent surface;
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.filled</code> is the
				explicit filled state.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary ghost">Ghost</button>
				<button type="button" class="primary filled">Filled</button>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="success ghost">Success</button>
				<button type="button" class="warning ghost">Warning</button>
				<button type="button" class="danger ghost">Danger</button>
			</div>
		</section>

		<section id="combined" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Combined</h2>
			<p class="text-sm leading-6 text-slate-600">
				Modifiers compose freely — variant + size + style stack without conflict. Corner radius
				comes from Tailwind's
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.rounded-{step}</code>
				utility scale (the framework doesn't ship a shape modifier dimension because every value
				would duplicate a Tailwind utility).
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary large ghost rounded-full">Large Ghost Pill</button>
				<button type="button" class="success large rounded-full">Large Success</button>
				<button type="button" class="danger small rounded-none">Small Square</button>
			</div>
		</section>

		<section id="tailwind-interop" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Tailwind interop</h2>
			<p class="text-sm leading-6 text-slate-600">
				Modifier classes and Tailwind utilities cohabit cleanly. The button below uses our
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.primary</code> variant
				alongside Tailwind's
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.shadow-lg</code>.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary shadow-lg">Tailwind shadow</button>
			</div>
		</section>

		<section id="disabled" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Disabled</h2>
			<p class="text-sm leading-6 text-slate-600">
				The <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">disabled</code>
				attribute removes the button from the tab order, prevents activation, and fires no events.
				It also propagates from a parent
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs"
					>&lt;fieldset disabled&gt;</code
				>
				to every descendant button automatically.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary">Normal</button>
				<button type="button" class="primary" disabled>Disabled</button>
			</div>
		</section>

		<section id="form-context" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Form context</h2>
			<p class="text-sm leading-6 text-slate-600">
				Buttons inside a
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">&lt;form&gt;</code> are
				automatically associated with it. A button outside the form can still be associated via the
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">form</code>
				attribute.
			</p>
			<form id="example-form" class="flex flex-wrap items-end gap-3">
				<label for="name" class="flex flex-col gap-1 text-sm">
					<span class="text-slate-600">Name</span>
					<input
						id="name"
						type="text"
						name="name"
						class="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</label>
				<button type="submit" class="primary">Submit</button>
				<button type="reset">Reset</button>
			</form>
			<button type="submit" form="example-form" class="success mt-2">Submit (outside form)</button>
		</section>

		<section id="accessibility" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Accessibility</h2>
			<ul class="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
				<li>
					Always use a real
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">&lt;button&gt;</code>
					for actions — not a
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">&lt;div&gt;</code> or
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">&lt;span&gt;</code>
					with a click handler. The browser provides keyboard focus,
					<kbd class="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-xs">Enter</kbd
					>/<kbd class="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-xs"
						>Space</kbd
					>
					activation, and role announcement for free.
				</li>
				<li>
					When the button label is only an icon or image, add
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">aria-label</code> to
					describe the action.
				</li>
				<li>
					Toggle buttons (pressed/unpressed) should carry
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs"
						>aria-pressed="true|false"</code
					>
					so the state is announced to screen readers.
				</li>
				<li>
					Never override
					<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">:focus-visible</code>
					without a visible replacement — the focus ring is the only keyboard accessibility signal.
				</li>
			</ul>
		</section>
	</section>
</template>
