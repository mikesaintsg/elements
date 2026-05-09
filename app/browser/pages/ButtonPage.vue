<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Button</h1>
			<p class="mt-3 text-base leading-7">
				The <code>&lt;button&gt;</code> element represents an interactive control that triggers an
				action when activated. The framework's button consumes context tokens via fallback chains so
				modifier classes (<code>.primary</code>, <code>.large</code>, <code>.ghost</code>, …)
				compose without per-element rules.
			</p>
		</header>

		<section id="types" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Types</h2>
			<p class="text-sm leading-6">
				The <code>type</code> attribute controls what the button does inside a form. Always declare
				it explicitly — the browser default is <code>submit</code>, which will unexpectedly submit
				the nearest form if omitted.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button">Action</button>
				<button type="submit">Submit</button>
				<button type="reset">Reset</button>
			</div>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Variants</h2>
			<p class="text-sm leading-6">
				Each variant modifier sets the four <code>--set-variant-*</code> context tokens. The button
				consumes them; no per-element variant rules.
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
			<h2 class="text-xl font-semibold tracking-tight">Sizes</h2>
			<p class="text-sm leading-6">
				Size modifiers route Tailwind's <code>--spacing</code>, <code>--text-*</code>, and
				<code>--radius-*</code> scales into <code>--set-size-*</code> context tokens. Two values:
				<code>.small</code> and <code>.large</code>. The bare element renders at the default size —
				there's no <code>.medium</code> because absence is the default.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary small">Small</button>
				<button type="button" class="primary">Default</button>
				<button type="button" class="primary large">Large</button>
			</div>
		</section>

		<section id="styles" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Styles</h2>
			<p class="text-sm leading-6">
				Style modifiers re-route the variant's color through <code>--set-style-*</code> tokens.
				<code>.ghost</code> renders the variant color as text only against a transparent surface;
				<code>.filled</code> is the explicit filled state.
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
			<h2 class="text-xl font-semibold tracking-tight">Combined</h2>
			<p class="text-sm leading-6">
				Modifiers compose freely — variant + size + style stack without conflict. Corner radius
				comes from Tailwind's <code>.rounded-{step}</code> utility scale (the framework doesn't ship
				a shape modifier dimension because every value would duplicate a Tailwind utility).
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary large ghost rounded-full">Large Ghost Pill</button>
				<button type="button" class="success large rounded-full">Large Success</button>
				<button type="button" class="danger small rounded-none">Small Square</button>
			</div>
		</section>

		<section id="tailwind-interop" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Tailwind interop</h2>
			<p class="text-sm leading-6">
				Modifier classes and Tailwind utilities cohabit cleanly. The button below uses our
				<code>.primary</code> variant alongside Tailwind's <code>.shadow-lg</code>.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary shadow-lg">Tailwind shadow</button>
			</div>
		</section>

		<section id="disabled" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Disabled</h2>
			<p class="text-sm leading-6">
				The <code>disabled</code> attribute removes the button from the tab order, prevents
				activation, and fires no events. It also propagates from a parent
				<code>&lt;fieldset disabled&gt;</code> to every descendant button automatically.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="primary">Normal</button>
				<button type="button" class="primary" disabled>Disabled</button>
			</div>
		</section>

		<section id="form-context" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Form context</h2>
			<p class="text-sm leading-6">
				Buttons inside a <code>&lt;form&gt;</code> are automatically associated with it. A button
				outside the form can still be associated via the <code>form</code> attribute.
			</p>
			<!-- The framework styles bare <form> as a vertical stack and labels as
			     flex-columns; .row flips to a wrapping row + intrinsic-width
			     inputs so a single-line filter / quick-action shape composes
			     without extra Tailwind utilities. -->
			<form id="example-form" class="row">
				<label for="name">
					Name
					<input id="name" type="text" name="name" />
				</label>
				<button type="submit" class="primary">Submit</button>
				<button type="reset">Reset</button>
			</form>
			<button type="submit" form="example-form" class="success">Submit (outside form)</button>
		</section>

		<section id="accessibility" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Accessibility</h2>
			<ul class="list-disc space-y-2 pl-5 text-sm leading-6">
				<li>
					Always use a real <code>&lt;button&gt;</code> for actions — not a
					<code>&lt;div&gt;</code> or <code>&lt;span&gt;</code> with a click handler. The browser
					provides keyboard focus, <kbd>Enter</kbd>/<kbd>Space</kbd> activation, and role
					announcement for free.
				</li>
				<li>
					When the button label is only an icon or image, add <code>aria-label</code> to describe
					the action.
				</li>
				<li>
					Toggle buttons (pressed/unpressed) should carry
					<code>aria-pressed="true|false"</code> so the state is announced to screen readers.
				</li>
				<li>
					Never override <code>:focus-visible</code> without a visible replacement — the focus ring
					is the only keyboard accessibility signal.
				</li>
			</ul>
		</section>
	</section>
</template>
