<template>
	<article>
		<header>
			<h1>Button</h1>
			<p>
				The <code>&lt;button&gt;</code> element represents an interactive control that triggers an
				action when activated. Browser UA styles are fully reset — font, color, border, background,
				and padding are all overridden so the element inherits from the cascade and can be styled
				consistently across platforms.
			</p>
		</header>

		<section id="types">
			<h2>Types</h2>
			<p>
				The <code>type</code> attribute controls what the button does inside a form. Always declare
				it explicitly — the browser default is <code>submit</code>, which will unexpectedly submit
				the nearest form if omitted.
			</p>
			<ul>
				<li>
					<code>type="button"</code> — performs a JS action; no form side effects. Use this for
					everything outside a form context.
				</li>
				<li><code>type="submit"</code> — submits the nearest form or the form referenced by <code>form</code>.</li>
				<li><code>type="reset"</code> — resets all controls in the associated form to their initial values.</li>
			</ul>
			<div>
				<button type="button">Action</button>
				<button type="submit">Submit</button>
				<button type="reset">Reset</button>
			</div>
		</section>

		<section id="disabled">
			<h2>Disabled</h2>
			<p>
				The <code>disabled</code> attribute removes the button from the tab order, prevents
				activation, and fires no events. It also propagates from a parent
				<code>&lt;fieldset disabled&gt;</code> to every descendant button automatically.
			</p>
			<div>
				<button type="button">Normal</button>
				<button type="button" disabled>Disabled</button>
			</div>
			<p>
				Note: the <code>disabled</code> attribute does nothing on
				<code>&lt;a&gt;</code> elements — use <code>aria-disabled="true"</code> +
				<code>tabindex="-1"</code> when a link must appear disabled.
			</p>
		</section>

		<section id="form-context">
			<h2>Form context</h2>
			<p>
				Buttons inside a <code>&lt;form&gt;</code> are automatically associated with it. A button
				outside the form can still be associated via the <code>form</code> attribute pointing to
				the form's <code>id</code>.
			</p>
			<form id="example-form">
				<label for="name">Name</label>
				<input id="name" type="text" name="name" />
				<button type="submit">Submit</button>
				<button type="reset">Reset</button>
			</form>
			<button type="submit" form="example-form">Submit (outside form)</button>
		</section>

		<section id="accessibility">
			<h2>Accessibility</h2>
			<ul>
				<li>
					Always use a real <code>&lt;button&gt;</code> for actions — not a
					<code>&lt;div&gt;</code> or <code>&lt;span&gt;</code> with a click handler. The browser
					provides keyboard focus, <kbd>Enter</kbd>/<kbd>Space</kbd> activation, and role
					announcement for free.
				</li>
				<li>
					When the button label is only an icon or image, add
					<code>aria-label</code> to describe the action.
				</li>
				<li>
					Toggle buttons (pressed/unpressed) should carry
					<code>aria-pressed="true|false"</code> so the state is announced to screen readers.
				</li>
				<li>
					Never override <code>:focus-visible</code> without a visible replacement — the focus
					ring is the only keyboard accessibility signal.
				</li>
			</ul>
		</section>
	</article>
</template>
