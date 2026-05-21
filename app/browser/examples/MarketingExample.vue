<script lang="ts" setup>
/**
 * MarketingExample — long-scroll landing page port of mailbox's MarketingExample.
 *
 * Layout intent:
 *   - No sidebar, no topbar app shell — just a series of <section> blocks
 *     inside a single <main>, plus a body-shell <footer> sibling at the end.
 *   - The marketing site nav (header) lives INSIDE <main> at the top of
 *     the page content — it's site nav, not app nav, so it doesn't get
 *     body-shell chrome.
 *   - The site footer goes OUTSIDE <main> as a body-shell sibling so the
 *     framework's `body:has(main) > footer` chrome paints it.
 *
 * Body-shell pattern: Vue fragment renders <main> + <footer> as siblings
 * (no wrapping element). ExamplesShell renders a fragment too, so these
 * sit as effective grandchildren of <body> via the #app `display: contents`
 * hop. <main> gets zero padding tokens so each <section> owns its own
 * edge-to-edge gutter; <footer> picks up body-shell footer chrome.
 *
 * Translation rules (per the spec):
 *   - `<div class="marketing">` → Vue fragment (no wrapper)
 *   - `header.marketing-nav.sticky-top` → `<header class="marketing-nav">` sticky via scoped CSS
 *   - `<a class="btn btn-primary">` → `<a class="primary filled">`
 *   - `<a class="btn btn-secondary">` → `<a class="subtle filled">`
 *   - `<span class="tag tag-info">` → `<small class="tag information">`
 *   - `bg-gradient-haze` → scoped `.hero-gradient` rule
 *   - `display-4 fw-bold` → Tailwind `text-5xl font-bold`
 *   - `<div class="card">` → `<article>`
 *   - Bootstrap grid → Tailwind grid utilities
 *   - `.bars` + `.bar` chart → scoped SVG (same approach as DashboardExample)
 */
import { computed } from 'vue'

interface Feature {
	readonly icon: string
	readonly title: string
	readonly body: string
}

interface Plan {
	readonly name: string
	readonly price: string
	readonly cadence: string
	readonly tagline: string
	readonly features: readonly string[]
	readonly featured?: boolean
	readonly cta: string
}

const features: readonly Feature[] = [
	{
		icon: 'lightning',
		title: 'Native-speed primitives',
		body: 'Every component is a thin shim over the platform: the popover API, anchor positioning, and view transitions do the heavy lifting.',
	},
	{
		icon: 'external',
		title: 'Composable, not coupled',
		body: 'Vue composables wrap framework-agnostic factories — pull the same behaviour into a custom element, a Web Component, or a vanilla page.',
	},
	{
		icon: 'system',
		title: 'Token-driven theming',
		body: 'Three named cores out of the box, every value sized through CSS custom properties. Re-skinning is one declaration block.',
	},
	{
		icon: 'success',
		title: 'Accessible by default',
		body: 'Focus traps, forced-colors fallbacks, reduced-motion guards, and ARIA grids ship with the components — not as an afterthought.',
	},
	{
		icon: 'information',
		title: 'Reviewed at the seams',
		body: 'Dispose-hygiene tests assert every listener and timer is reversed on teardown, so swapping routes never leaks.',
	},
	{
		icon: 'filter',
		title: 'Bootstrap-compatible',
		body: 'Drop your existing markup straight in. We never rename a class — `.alert.alert-info` keeps working, your team keeps shipping.',
	},
]

const plans: readonly Plan[] = [
	{
		name: 'Starter',
		price: 'Free',
		cadence: 'forever',
		tagline: 'For solo builders and side projects.',
		features: ['All components', 'Up to 3 themes', 'Community support', 'MIT licensed'],
		cta: 'Start building',
	},
	{
		name: 'Studio',
		price: '$29',
		cadence: 'per seat / month',
		tagline: 'For teams that ship every week.',
		features: [
			'Everything in Starter',
			'Private theme registry',
			'Figma library sync',
			'Priority email support',
		],
		featured: true,
		cta: 'Start a 14-day trial',
	},
	{
		name: 'Enterprise',
		price: 'Talk to us',
		cadence: 'custom',
		tagline: 'For organisations under audit.',
		features: ['SSO + SCIM', 'SLA-backed support', 'Custom theme audit', 'Procurement docs'],
		cta: 'Contact sales',
	},
]

const logos = [
	{ icon: 'external', name: 'Vector Co' },
	{ icon: 'filter', name: 'Stratus' },
	{ icon: 'sort', name: 'Northstar' },
	{ icon: 'minus', name: 'Helix' },
	{ icon: 'system', name: 'Switchboard' },
	{ icon: 'success', name: 'Greenhouse' },
]

const stats = [
	{ value: '42', label: 'Components' },
	{ value: '17', label: 'Composables' },
	{ value: '4', label: 'Themes' },
	{ value: '0', label: 'Runtime deps' },
]

// Deterministic bar heights — same approach as DashboardExample so screenshots
// are reproducible and don't require Math.random().
const chartBars = computed(() =>
	Array.from({ length: 24 }, (_, i) => ({
		i,
		h: 25 + Math.abs(Math.sin(i * 0.6)) * 75,
		o: 0.5 + (i % 6) / 12,
	})),
)
</script>

<template>
	<!-- Page content — <main> at body-shell position. Token overrides collapse
	     all internal padding to zero so each <section> block owns its own
	     edge-to-edge gutter. `pb-28 sm:pb-0` keeps the ExamplesShell toolbar
	     from overlapping the last section on mobile. -->
	<main
		class="pb-28 sm:pb-0"
		style="--set-main-padding-inline: 0; --set-main-padding-block: 0; --set-main-gap: 0"
	>
		<!-- ── Top nav ─────────────────────────────────────────────────────
		     Site nav lives INSIDE <main> — it's page nav, not app nav.
		     Sticky via scoped CSS; z-index 50 keeps it above sections. -->
		<header class="marketing-nav">
			<div class="marketing-container">
				<!-- Brand -->
				<a href="#" class="marketing-brand me-auto">
					<!-- TODO icon swap — external stands in for missing 'box' (brand icon) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					<strong>elements</strong>
				</a>
				<!-- Nav links — hidden on mobile -->
				<nav class="hidden md:flex items-center gap-5 text-sm" aria-label="Site">
					<a href="#features" style="color: var(--color-text)">Features</a>
					<a href="#pricing" style="color: var(--color-text)">Pricing</a>
					<a href="#" style="color: var(--color-text)">Docs</a>
					<a href="#" style="color: var(--color-text)">Changelog</a>
				</nav>
				<a href="#" style="color: var(--color-text)" class="text-sm">Sign in</a>
				<a href="#" class="primary filled text-sm">Get started</a>
			</div>
		</header>

		<!-- ── Hero ───────────────────────────────────────────────────────
		     Hero gradient is scoped (no framework utility yet — see
		     framework-gap note in commit message). Browser-window mockup
		     contains 4 stat <article>s + a bar chart <figure>. -->
		<section class="marketing-hero" aria-label="Hero">
			<div class="marketing-container text-center">
				<!-- Eyebrow tag -->
				<small class="tag information mb-4 inline-flex items-center gap-1">
					<!-- TODO icon swap — information stands in for missing 'spark' (new-feature indicator) -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
					New · v2.0 ships with native popover support
				</small>

				<!-- Headline -->
				<h1 class="text-5xl font-bold mb-4 mt-2">
					The component library<br />
					<span style="color: var(--color-primary)">your platform already runs.</span>
				</h1>

				<!-- Lead paragraph -->
				<p
					class="text-lg mb-6 mx-auto"
					style="max-inline-size: 38rem; color: var(--color-text-subtle)"
				>
					elements is a CSS-first, composable, Bootstrap-compatible component library that delegates
					to the modern web platform — so you ship less JavaScript and read more native specs.
				</p>

				<!-- CTA buttons -->
				<div class="flex flex-wrap justify-center gap-3 mb-10">
					<a href="#" class="primary filled">
						<!-- TODO icon swap — plus stands in for missing 'rocket-takeoff' -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
						Start building
					</a>
					<a href="#" class="subtle filled">
						<!-- TODO icon swap — external stands in for missing 'github' (brand icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
						Star on GitHub
					</a>
				</div>

				<!-- Browser-window mockup — decorative; aria-hidden so screen
				     readers skip the illustrative chart/stat numbers. -->
				<div class="marketing-window mx-auto" aria-hidden="true">
					<div class="marketing-window-bar">
						<span class="marketing-window-dots">
							<span class="marketing-window-dot"></span>
							<span class="marketing-window-dot"></span>
							<span class="marketing-window-dot"></span>
						</span>
						<span class="marketing-window-url">app.acme.dev</span>
					</div>
					<div class="marketing-window-body">
						<!-- 4 stat cards — <article class="small"> picks up framework
						     card chrome (border, radius, shadow, flex-col). -->
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
							<article v-for="stat in stats" :key="stat.label" class="small">
								<dl class="m-0">
									<dt class="text-xs" style="color: var(--color-text-subtle)">
										{{ stat.label }}
									</dt>
									<dd class="marketing-stat-value">{{ stat.value }}</dd>
								</dl>
							</article>
						</div>
						<!-- Bar chart visualization — scoped SVG, same approach as DashboardExample. -->
						<figure class="m-0" role="img" aria-label="Illustrative bar chart">
							<svg viewBox="0 0 240 60" preserveAspectRatio="none" class="marketing-chart">
								<rect
									v-for="bar in chartBars"
									:key="bar.i"
									:x="bar.i * 10 + 1"
									:y="60 - (bar.h * 60) / 100"
									width="8"
									:height="(bar.h * 60) / 100"
									:style="`opacity: ${bar.o}`"
								/>
							</svg>
							<figcaption class="sr-only">Illustrative bar chart — decorative</figcaption>
						</figure>
					</div>
				</div>
			</div>
		</section>

		<!-- ── Logos band ─────────────────────────────────────────────────
		     Trust strip: "Ships in production at" + 6 company names.
		     Flex-wrap with muted text — simple enough with utilities. -->
		<section class="marketing-logos" aria-label="Trusted by">
			<div class="marketing-container">
				<p
					class="text-xs uppercase font-semibold text-center mb-4"
					style="color: var(--color-text-subtle)"
				>
					Ships in production at
				</p>
				<ul
					class="flex flex-wrap justify-around items-center gap-4 text-sm font-semibold list-none m-0 p-0"
					style="color: var(--color-text-subtle)"
				>
					<li v-for="logo in logos" :key="logo.name" class="flex items-center gap-1">
						<!-- TODO icon swap — stand-ins for missing company-brand icons -->
						<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${logo.icon})`"></i>
						{{ logo.name }}
					</li>
				</ul>
			</div>
		</section>

		<!-- ── Features ───────────────────────────────────────────────────
		     6 feature cards in a responsive 3-up grid.
		     <article> picks up framework card chrome. -->
		<section id="features" class="marketing-features" aria-label="Features">
			<div class="marketing-container">
				<!-- Section header -->
				<div class="text-center mb-10">
					<p
						class="text-xs uppercase font-semibold mb-2"
						style="color: var(--color-primary-text-emphasis)"
					>
						What you get
					</p>
					<h2 class="text-3xl md:text-4xl font-bold mb-3">
						Designed against the platform, not around it.
					</h2>
					<p
						class="text-lg mx-auto"
						style="max-inline-size: 36rem; color: var(--color-text-subtle)"
					>
						Every primitive is documented, accessible, and named so a developer can find it without
						reading a glossary.
					</p>
				</div>
				<!-- Feature card grid — 1-up → 2-up → 3-up -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<article v-for="feature in features" :key="feature.title">
						<!-- Icon badge — scoped CSS for the tinted circle; no framework
						     "filled circle" primitive yet (same as DashboardExample .mark). -->
						<span class="marketing-feature-icon" aria-hidden="true">
							<i class="icon" :style="`--icon: var(--set-icon-${feature.icon})`"></i>
						</span>
						<h3 class="text-base font-semibold mt-3 mb-1">{{ feature.title }}</h3>
						<p class="text-sm m-0" style="color: var(--color-text-subtle)">
							{{ feature.body }}
						</p>
					</article>
				</div>
			</div>
		</section>

		<!-- ── Stats band ─────────────────────────────────────────────────
		     4 large-number stats with labels. Big-number stat typography
		     is scoped (framework-gap: Dashboard also has .dashboard-stat-value;
		     see commit message for gap analysis). -->
		<section class="marketing-stats-band" aria-label="Key statistics">
			<div class="marketing-container">
				<dl class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
					<div v-for="stat in stats" :key="stat.label">
						<dt
							class="text-xs uppercase font-semibold mb-1"
							style="color: var(--color-text-subtle)"
						>
							{{ stat.label }}
						</dt>
						<dd class="marketing-big-stat m-0" style="color: var(--color-primary)">
							{{ stat.value }}
						</dd>
					</div>
				</dl>
			</div>
		</section>

		<!-- ── Pricing ────────────────────────────────────────────────────
		     3 plan cards. Studio (middle / featured) uses <article class="primary">
		     to trigger the framework's variant-cascade border tint. Extra
		     elevation via scoped shadow rule on .featured-plan. -->
		<section id="pricing" class="marketing-pricing" aria-label="Pricing">
			<div class="marketing-container">
				<!-- Section header -->
				<div class="text-center mb-10">
					<p
						class="text-xs uppercase font-semibold mb-2"
						style="color: var(--color-primary-text-emphasis)"
					>
						Pricing
					</p>
					<h2 class="text-3xl md:text-4xl font-bold mb-3">Pay for the team, not the components.</h2>
					<p class="text-lg" style="color: var(--color-text-subtle)">
						Open-source forever. Studio and Enterprise tiers add tooling around the library.
					</p>
				</div>
				<!-- Pricing card grid -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
					<article
						v-for="plan in plans"
						:key="plan.name"
						:class="plan.featured ? 'primary marketing-featured-plan' : ''"
					>
						<header class="flex items-center gap-2">
							<h3 class="text-lg font-bold m-0">{{ plan.name }}</h3>
							<small v-if="plan.featured" class="tag information ms-auto">Most popular</small>
						</header>
						<p class="text-sm mt-2 mb-3" style="color: var(--color-text-subtle)">
							{{ plan.tagline }}
						</p>
						<p class="mb-4 m-0">
							<span class="marketing-price-value">{{ plan.price }}</span>
							<span class="text-sm" style="color: var(--color-text-subtle)">
								/ {{ plan.cadence }}
							</span>
						</p>
						<ul class="list-none m-0 p-0 mb-5 flex flex-col gap-2">
							<li
								v-for="bullet in plan.features"
								:key="bullet"
								class="flex items-start gap-2 text-sm"
							>
								<!-- TODO icon swap — success stands in for missing 'check-circle' -->
								<i
									class="icon flex-shrink-0"
									aria-hidden="true"
									style="--icon: var(--set-icon-success); color: var(--color-success)"
								></i>
								{{ bullet }}
							</li>
						</ul>
						<footer>
							<a
								href="#"
								:class="
									plan.featured
										? 'primary filled w-full justify-center'
										: 'subtle filled w-full justify-center'
								"
							>
								{{ plan.cta }}
							</a>
						</footer>
					</article>
				</div>
			</div>
		</section>

		<!-- ── CTA banner ─────────────────────────────────────────────────
		     "Ready to ship?" + 2 action buttons. -->
		<section class="marketing-cta-banner" aria-label="Call to action">
			<div class="marketing-container text-center">
				<h2 class="text-3xl md:text-4xl font-bold mb-3">Ready to ship something solid?</h2>
				<p
					class="text-lg mb-6 mx-auto"
					style="max-inline-size: 36rem; color: var(--color-text-subtle)"
				>
					Pull the package, drop the import, keep the platform conventions you already trust.
				</p>
				<div class="flex flex-wrap justify-center gap-3">
					<a href="#" class="primary filled">
						<!-- TODO icon swap — chevron-down stands in for missing 'download' (install icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-down)"></i>
						Install via npm
					</a>
					<a href="#" class="subtle filled">
						<!-- TODO icon swap — information stands in for missing 'book' (docs icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
						Read the docs
					</a>
				</div>
			</div>
		</section>

		<!-- ── Footer ─────────────────────────────────────────────────────
		     Site footer lives INSIDE <main> as the last section.
		     Note: the spec suggested a body-shell <footer> sibling, but
		     a tall multi-column footer at `auto` row height crushes the
		     `1fr` main track on mobile — leaving main only 112px tall.
		     Keeping the footer inside <main> ensures the scroll container
		     gets the full viewport height (1fr) and the footer content
		     scrolls with the page.
		     Framework-gap: the body-shell footer chrome (`body:has(main) >
		     footer { grid-area: footer }`) uses `auto` row sizing — this
		     works fine for single-line site footers (the framework's own
		     docs footer) but breaks for tall multi-column marketing footers.
		     A `max-block-size` token or a `scroll` body class that opts out
		     of the 100dvh + overflow:hidden contract would fix this at the
		     framework level. -->
		<footer aria-label="Site footer" class="marketing-site-footer">
			<div class="marketing-container marketing-footer-inner">
				<!-- Brand column -->
				<div class="marketing-footer-brand">
					<a href="#" class="marketing-brand mb-2">
						<!-- TODO icon swap — external stands in for missing 'box' (brand icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
						<strong>elements</strong>
					</a>
					<p class="text-sm mt-2" style="color: var(--color-text-subtle); max-inline-size: 22rem">
						A composable, CSS-first component library that ships with the modern web platform — not
						against it.
					</p>
				</div>
				<!-- Link columns -->
				<nav aria-label="Product links" class="marketing-footer-col">
					<p class="font-semibold text-sm mb-2">Product</p>
					<ul class="list-none m-0 p-0 flex flex-col gap-1">
						<li>
							<a href="#" class="text-sm" style="color: var(--color-text-subtle)">Features</a>
						</li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Pricing</a></li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Themes</a></li>
					</ul>
				</nav>
				<nav aria-label="Company links" class="marketing-footer-col">
					<p class="font-semibold text-sm mb-2">Company</p>
					<ul class="list-none m-0 p-0 flex flex-col gap-1">
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">About</a></li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Blog</a></li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Careers</a></li>
					</ul>
				</nav>
				<nav aria-label="Resources links" class="marketing-footer-col">
					<p class="font-semibold text-sm mb-2">Resources</p>
					<ul class="list-none m-0 p-0 flex flex-col gap-1">
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Docs</a></li>
						<li>
							<a href="#" class="text-sm" style="color: var(--color-text-subtle)">Changelog</a>
						</li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Status</a></li>
					</ul>
				</nav>
				<nav aria-label="Legal links" class="marketing-footer-col">
					<p class="font-semibold text-sm mb-2">Legal</p>
					<ul class="list-none m-0 p-0 flex flex-col gap-1">
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Privacy</a></li>
						<li><a href="#" class="text-sm" style="color: var(--color-text-subtle)">Terms</a></li>
					</ul>
				</nav>
			</div>
			<!-- Bottom bar: copyright + social -->
			<div class="marketing-footer-bottom marketing-container">
				<small style="color: var(--color-text-subtle)">
					© 2026 elements. MIT licensed, built with care.
				</small>
				<div class="flex gap-3">
					<a href="#" aria-label="GitHub" style="color: var(--color-text-subtle)">
						<!-- TODO icon swap — external stands in for missing 'github' (brand icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					</a>
					<a href="#" aria-label="Twitter / X" style="color: var(--color-text-subtle)">
						<!-- TODO icon swap — sort stands in for missing 'twitter-x' (brand icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
					</a>
					<a href="#" aria-label="Discord" style="color: var(--color-text-subtle)">
						<!-- TODO icon swap — filter stands in for missing 'discord' (brand icon) -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
					</a>
				</div>
			</div>
		</footer>
	</main>
</template>

<style scoped>
/* ── Shared layout container ───────────────────────────────────────────────
 *
 * Every section uses .marketing-container for max-width + horizontal
 * padding. Keeps section edge-to-edge (background fills the viewport)
 * while content is comfortably centered.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-container {
	max-inline-size: 72rem;
	margin-inline: auto;
	padding-inline: clamp(1rem, 5vw, 2.5rem);
}

/* ── Top nav ────────────────────────────────────────────────────────────────
 *
 * Sticky site nav inside <main>. Position sticky + z-index so it floats
 * above hero content as the user scrolls. Background picks up the surface
 * token so it reads correctly in all themes.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-nav {
	/* Override the body-shell <header> chrome height / band-height that
	 * would normally be painted by `body:has(main) > * > header`. The site
	 * nav is INSIDE <main> (not at body-shell position), so it doesn't get
	 * that chrome — but Tailwind's `sticky top-0` pattern needs a real
	 * position value and z-index. */
	position: sticky;
	inset-block-start: 0;
	z-index: 50;
	background-color: var(--color-surface);
	border-block-end: 1px solid var(--color-border);
}

.marketing-nav .marketing-container {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding-block: 0.75rem;
}

/* ── Brand link ─────────────────────────────────────────────────────────────
 *
 * Shared by nav + footer. Flex row with icon + text, no underline affordance
 * (the juxtaposition of icon + name signals brand, not a navigable link).
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-brand {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	text-decoration: none;
	font-weight: 700;
	color: var(--color-text);
}

.marketing-brand:hover {
	color: var(--color-text);
	text-decoration: none;
}

/* ── Hero section ───────────────────────────────────────────────────────────
 *
 * Gradient background: radial tint from the primary color toward transparent.
 * This is a universal marketing pattern; framework has no `.hero` primitive
 * yet. Flagged as a framework-gap opportunity (see commit message).
 *
 * @media prefers-reduced-motion: strip the perspective transform on the
 * window mockup.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-hero {
	padding-block: clamp(3rem, 8vw, 6rem);
	background: radial-gradient(
		ellipse at 50% 0%,
		color-mix(in oklab, var(--color-primary) 12%, transparent),
		transparent 70%
	);
}

.marketing-hero .marketing-container {
	display: flex;
	flex-direction: column;
	align-items: center;
}

/* ── Browser-window mockup ──────────────────────────────────────────────────
 *
 * Decorative "app screenshot" surface. Chrome bar with traffic-light dots +
 * a URL pill, then a padded body for the stat cards + chart.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-window {
	max-inline-size: 56rem;
	inline-size: 100%;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg, 0.75rem);
	overflow: hidden;
	box-shadow: 0 16px 48px color-mix(in oklab, var(--color-text) 12%, transparent);
	transform: perspective(1200px) rotateX(2deg);
}

@media (prefers-reduced-motion: reduce) {
	.marketing-window {
		transform: none;
	}
}

.marketing-window-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	background-color: var(--color-surface-raised, var(--color-surface));
	border-block-end: 1px solid var(--color-border);
}

.marketing-window-dots {
	display: flex;
	gap: 0.375rem;
}

.marketing-window-dot {
	display: block;
	inline-size: 0.625rem;
	block-size: 0.625rem;
	border-radius: 999px;
	background-color: var(--color-border);
}

.marketing-window-url {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	margin-inline-start: 0.25rem;
}

.marketing-window-body {
	padding: 1.25rem;
	background-color: var(--color-surface);
}

/* ── Hero stat cards ────────────────────────────────────────────────────────
 *
 * Big-value typography inside the window mockup stat cards.
 * Framework-gap: Dashboard uses .dashboard-stat-value for the same shape.
 * Two examples now want this — signals a potential `.stat` class root.
 * See commit message for the gap analysis.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-stat-value {
	margin: 0;
	font-size: 1.5rem;
	font-weight: 700;
}

/* ── Bar chart ──────────────────────────────────────────────────────────────
 *
 * SVG bar chart fill — same approach as DashboardExample.
 * SVG presentation attributes can't be set via Tailwind utilities.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-chart {
	display: block;
	inline-size: 100%;
	block-size: 5rem;
}

.marketing-chart rect {
	fill: var(--color-primary, oklch(60% 0.15 250));
}

/* ── Logos band ─────────────────────────────────────────────────────────────
 *
 * Trust strip between hero and features.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-logos {
	padding-block: 1.5rem;
	border-block: 1px solid var(--color-border);
	background-color: var(--color-surface-raised, var(--color-surface));
}

/* ── Features section ───────────────────────────────────────────────────────
 *
 * Generous vertical padding so the section reads as a distinct content block.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-features {
	padding-block: clamp(3rem, 8vw, 5rem);
}

/* Feature icon badge — tinted circle with icon. No framework "filled-circle"
 * primitive; same situation as DashboardExample's .mark. */
.marketing-feature-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: 2.5rem;
	block-size: 2.5rem;
	border-radius: 0.5rem;
	background-color: color-mix(in oklab, var(--color-primary) 12%, transparent);
	color: var(--color-primary-text-emphasis);
}

/* ── Stats band ─────────────────────────────────────────────────────────────
 *
 * Large-number highlight row.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-stats-band {
	padding-block: clamp(2.5rem, 6vw, 4rem);
	background-color: var(--color-surface-raised, var(--color-surface));
	border-block: 1px solid var(--color-border);
}

.marketing-big-stat {
	font-size: 3rem;
	font-weight: 700;
	line-height: 1.1;
}

/* ── Pricing section ────────────────────────────────────────────────────────
 *
 * The featured (Studio) card uses <article class="primary"> to trigger the
 * framework's variant-cascade border tint. Extra emphasis via box-shadow.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-pricing {
	padding-block: clamp(3rem, 8vw, 5rem);
}

.marketing-featured-plan {
	box-shadow: 0 8px 32px color-mix(in oklab, var(--color-primary) 20%, transparent);
}

.marketing-price-value {
	font-size: 2.25rem;
	font-weight: 700;
}

/* ── CTA banner ─────────────────────────────────────────────────────────────
 *
 * Final CTA section with a subtle gradient echo of the hero.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-cta-banner {
	padding-block: clamp(3rem, 8vw, 5rem);
	background: radial-gradient(
		ellipse at 50% 100%,
		color-mix(in oklab, var(--color-primary) 8%, transparent),
		transparent 70%
	);
	background-color: var(--color-surface-raised, var(--color-surface));
	border-block-start: 1px solid var(--color-border);
}

/* ── Site footer ────────────────────────────────────────────────────────────
 *
 * The site footer lives INSIDE <main> as the last section, NOT as a
 * body-shell sibling. This is a deliberate workaround: the body grid's
 * `grid-template-rows: auto 1fr auto` gives the footer row `auto` sizing,
 * which at mobile viewports lets a tall multi-column footer consume most of
 * the viewport and compress the `1fr` main track to near-zero. Moving the
 * footer inside main ensures main always gets the full 1fr space and the
 * footer scrolls with the page content.
 *
 * Framework-gap: the body-shell footer chrome works great for single-line
 * footers (docs copyright band) but breaks for tall multi-column marketing
 * footers. A `max-block-size` token on the footer row, or a `<body class="scroll">`
 * opt-out from 100dvh+overflow:hidden, would fix this at the framework level.
 * ────────────────────────────────────────────────────────────────────────── */
.marketing-site-footer {
	background-color: var(--color-surface-raised, var(--color-surface));
	border-block-start: 1px solid var(--color-border);
}

.marketing-footer-inner {
	display: grid;
	grid-template-columns: 1fr;
	gap: 2rem;
	padding-block-start: 2rem;
	padding-block-end: 1.5rem;
}

@media (min-width: 768px) {
	.marketing-footer-inner {
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
	}
}

.marketing-footer-brand {
	display: flex;
	flex-direction: column;
}

.marketing-footer-col {
	display: flex;
	flex-direction: column;
}

.marketing-footer-bottom {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: 0.5rem;
	padding-block-end: 1.5rem;
	border-block-start: 1px solid var(--color-border);
	padding-block-start: 1rem;
}
</style>
