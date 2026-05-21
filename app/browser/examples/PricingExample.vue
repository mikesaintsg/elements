<script lang="ts" setup>
/**
 * PricingExample — the framework's composition pillar.
 *
 * A marketing landing page built from <article> cards, .badge / .tag
 * atoms, anchors-as-buttons (.primary.filled), and the .cluster / .stack
 * layout primitives. Renders just <main> (the scroll container) with a
 * trailing in-flow <footer> as the last section — the framework's
 * convention for tall marketing footers (a body-shell footer would pin
 * to the viewport and crush the scroll track).
 */
interface Plan {
	readonly name: string
	readonly tagline: string
	readonly price: string
	readonly unit: string
	readonly features: readonly string[]
	readonly cta: string
	readonly featured: boolean
}
const plans: readonly Plan[] = [
	{
		name: 'Starter',
		tagline: 'For solo builders',
		price: '$0',
		unit: '/ forever',
		features: ['3 projects', 'Community support', '1 GB storage', 'Core components'],
		cta: 'Start free',
		featured: false,
	},
	{
		name: 'Pro',
		tagline: 'For growing teams',
		price: '$24',
		unit: '/ month',
		features: [
			'Unlimited projects',
			'Priority support',
			'100 GB storage',
			'Advanced analytics',
			'Custom themes',
		],
		cta: 'Start 14-day trial',
		featured: true,
	},
	{
		name: 'Enterprise',
		tagline: 'For organizations',
		price: 'Custom',
		unit: '',
		features: ['Everything in Pro', 'SSO + SAML', 'SLA + dedicated CSM', 'On-premise option'],
		cta: 'Contact sales',
		featured: false,
	},
]

interface Feature {
	readonly icon: string
	readonly variant: string
	readonly title: string
	readonly body: string
}
const features: readonly Feature[] = [
	{
		icon: 'check',
		variant: 'success',
		title: 'Semantic by default',
		body: 'Every component is a real HTML element. Lints, screen readers, and syndication all agree.',
	},
	{
		icon: 'system',
		variant: 'primary',
		title: 'Themed in one knob',
		body: 'Override the color tokens at :root and the whole interface re-tunes in lockstep.',
	},
	{
		icon: 'information',
		variant: 'information',
		title: 'Tiny class surface',
		body: 'Seven variants, two sizes, two fills. The modifier vocabulary is the entire API.',
	},
]
</script>

<template>
	<main>
		<!-- Hero -->
		<section class="stack items-center text-center max-w-3xl mx-auto w-full">
			<span class="badge information pill">New · v2.4</span>
			<h1 class="text-balance">Build interfaces with the grain of the web</h1>
			<p class="text-lg" style="color: var(--color-text-subtle)">
				A semantic-first component framework where the HTML element <em>is</em> the component. Less
				to learn, less to maintain, nothing to fight.
			</p>
			<div class="cluster justify-center">
				<a href="#pricing" class="primary filled large">Get started</a>
				<a href="#" class="primary subtle large">Live demo</a>
			</div>
			<small style="color: var(--color-text-subtle)">No credit card required · Open source</small>
		</section>

		<!-- Logos -->
		<section class="stack items-center text-center">
			<small class="uppercase tracking-wide" style="color: var(--color-text-subtle)">
				Trusted by teams at
			</small>
			<div class="cluster justify-center items-center">
				<strong>Acme</strong>
				<strong>Buena Vista</strong>
				<strong>Initech</strong>
				<strong>Globex</strong>
				<strong>Hooli</strong>
			</div>
		</section>

		<!-- Features -->
		<section aria-label="Features" class="stack">
			<hgroup class="text-center">
				<h2>Everything you need, nothing you don't</h2>
				<p>Three ideas do all the work.</p>
			</hgroup>
			<div class="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
				<article v-for="feature in features" :key="feature.title">
					<span class="avatar square" :class="feature.variant" aria-hidden="true">
						<i class="icon" :style="`--icon: var(--set-icon-${feature.icon})`"></i>
					</span>
					<h3>{{ feature.title }}</h3>
					<p>{{ feature.body }}</p>
				</article>
			</div>
		</section>

		<!-- Pricing -->
		<section id="pricing" aria-label="Pricing" class="stack">
			<hgroup class="text-center">
				<h2>Simple, honest pricing</h2>
				<p>Start free. Upgrade when you're ready.</p>
			</hgroup>
			<div class="grid lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
				<article v-for="plan in plans" :key="plan.name" :class="plan.featured ? 'primary' : ''">
					<header>
						<div class="cluster items-center justify-between">
							<h3 class="m-0">{{ plan.name }}</h3>
							<span v-if="plan.featured" class="badge primary filled pill">Popular</span>
						</div>
						<p>{{ plan.tagline }}</p>
					</header>
					<p class="m-0">
						<strong class="text-4xl">{{ plan.price }}</strong>
						<small style="color: var(--color-text-subtle)"> {{ plan.unit }}</small>
					</p>
					<ul class="list-none flex flex-col gap-2">
						<li v-for="f in plan.features" :key="f" class="flex items-center gap-2">
							<i
								class="icon"
								aria-hidden="true"
								style="--icon: var(--set-icon-check); color: var(--color-success)"
							></i>
							{{ f }}
						</li>
					</ul>
					<footer>
						<a
							href="#"
							class="w-full large"
							:class="plan.featured ? 'primary filled' : 'primary subtle'"
							>{{ plan.cta }}</a
						>
					</footer>
				</article>
			</div>
			<p class="text-center">
				<small style="color: var(--color-text-subtle)">
					All plans include unlimited members and a 30-day money-back guarantee.
				</small>
			</p>
		</section>

		<!-- Testimonial -->
		<section class="max-w-3xl mx-auto w-full">
			<article class="information subtle">
				<blockquote class="m-0">
					<p>
						We deleted four thousand lines of CSS the week we adopted it. The diff was the easiest
						review of the year.
					</p>
					<footer class="flex items-center gap-3">
						<span class="avatar" aria-hidden="true">GH</span>
						<span class="flex flex-col leading-tight">
							<cite><strong>Grace Hopper</strong></cite>
							<small style="color: var(--color-text-subtle)">Staff Engineer, Globex</small>
						</span>
					</footer>
				</blockquote>
			</article>
		</section>

		<!-- Final CTA. Neutral (non-variant) card so the two explicitly-styled
		     CTAs don't inherit stray variant border/colour tokens. -->
		<section class="stack items-center text-center">
			<article class="max-w-3xl w-full items-center text-center">
				<h2>Ready to ship faster?</h2>
				<p>Join thousands of teams building with semantic HTML.</p>
				<div class="cluster justify-center items-center">
					<a href="#" class="primary filled large">Get started free</a>
					<a href="#" class="primary subtle large">Read the docs</a>
				</div>
			</article>
		</section>

		<!-- In-flow site footer (NOT a body-shell footer). -->
		<footer class="flex flex-col gap-6">
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
				<div class="stack leading-tight">
					<span class="avatar square primary" aria-hidden="true">E</span>
					<small style="color: var(--color-text-subtle)">Designed with the grain of the web.</small>
				</div>
				<div class="stack leading-tight">
					<strong>Product</strong>
					<a href="#">Features</a>
					<a href="#">Pricing</a>
					<a href="#">Changelog</a>
				</div>
				<div class="stack leading-tight">
					<strong>Company</strong>
					<a href="#">About</a>
					<a href="#">Blog</a>
					<a href="#">Careers</a>
				</div>
				<div class="stack leading-tight">
					<strong>Legal</strong>
					<a href="#">Privacy</a>
					<a href="#">Terms</a>
					<a href="#">Security</a>
				</div>
			</div>
			<hr />
			<div class="cluster items-center justify-between max-w-5xl mx-auto w-full">
				<small style="color: var(--color-text-subtle)">© 2026 Elements. All rights reserved.</small>
				<div class="cluster">
					<span class="tag">v2.4.0</span>
					<span class="tag">MIT</span>
				</div>
			</div>
		</footer>
	</main>
</template>
