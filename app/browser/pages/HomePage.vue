<template>
	<article>
		<header>
			<h1>elements</h1>
			<p>
				A semantic-first CSS framework. One partial per HTML element — styles flow from element
				semantics outward through token-driven custom properties. Classes are modifiers, never the
				foundation.
			</p>
		</header>

		<section id="tokens">
			<h2>Tokens</h2>
			<p>
				Every visual decision is a CSS custom property defined in <code>:root</code>. Override any
				token globally, per component, or per theme without touching framework source.
			</p>
		</section>

		<section id="modifiers">
			<h2>Modifiers</h2>
			<p>
				Modifier classes set component-scoped custom properties. The element's base rule consumes
				them — no specificity battles, no <code>!important</code>.
			</p>
		</section>
	</article>
</template>
