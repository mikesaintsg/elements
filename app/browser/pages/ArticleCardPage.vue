<script lang="ts" setup>
/**
 * ArticleCardPage — the canonical reference for `<article>` as the
 * framework's card primitive.
 *
 * `<article>` is the framework's flagship "element IS component"
 * proof point. Bare `<article>` ships a self-contained card surface
 * (padding, radius, border, soft shadow) — no `.card` class needed.
 * Same modifier cascade every other element uses:
 *
 *   - `.primary` / `.secondary` / `.tertiary` / `.success` /
 *     `.warning` / `.danger` / `.information` tint the border (and,
 *     when `.filled` is layered, the full surface).
 *   - `.subtle` / `.filled` swap fill treatment. `.subtle` paints the
 *     variant's bg-subtle tint; `.filled` paints the saturated
 *     identity color with white text.
 *   - `.small` / `.large` size the chrome via per-element padding /
 *     gap / font-size overrides (the global `--set-size-*` cascade
 *     would scale too aggressively for cards).
 *   - `.disabled` / `aria-disabled="true"` dim + block interaction.
 *
 * Auto-banded slots: a direct-child `<header>` / `<footer>` /
 * `<img>` / `<picture>` / `<ul class="group">` / `<ol class="group">`
 * picks up framework-painted chrome — tinted band, edge-to-edge
 * extension, inner-radius matched to the outer card edge. No extra
 * classes needed; the slot system reads structurally.
 *
 * Container query: the article registers as a size-container named
 * `article` so consumers can `@container article (min-inline-size:
 * 24rem) { … }` to adapt internal layout to the card's actual width
 * — independent of viewport.
 *
 * Cross-references:
 *   - `<dialog>` (DialogElementPage) shares the modifier cascade,
 *     the auto-banded header / footer pattern, and the inner-radius
 *     calculation. Many of the visual concepts on this page work
 *     identically there.
 *   - The framework's <aside> (SectioningPage) inside an article
 *     paints as a tinted inline callout — useful for asides that
 *     supplement a card's main content.
 *   - `<figure>` (FiguresPage) inside an article composes cleanly:
 *     the article supplies card chrome, the figure supplies the
 *     image + caption semantic grouping.
 */

const heroImageDataUri =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23h)'/%3E%3Ccircle cx='180' cy='120' r='60' fill='white' fill-opacity='0.22'/%3E%3Ccircle cx='620' cy='280' r='90' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 300 L200 220 L400 270 L600 200 L800 240 L800 400 L0 400 Z' fill='white' fill-opacity='0.20'/%3E%3C/svg%3E"

const portraitImageDataUri =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23db2777'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23p)'/%3E%3Ccircle cx='200' cy='160' r='70' fill='white' fill-opacity='0.30'/%3E%3Cpath d='M70 400 L200 240 L330 400 Z' fill='white' fill-opacity='0.22'/%3E%3C/svg%3E"

const cosmicImageDataUri =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3CradialGradient id='c' cx='30%25' cy='40%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%237c3aed'/%3E%3Cstop offset='60%25' stop-color='%231e293b'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23c)'/%3E%3Ccircle cx='180' cy='130' r='45' fill='white' fill-opacity='0.35'/%3E%3Ccircle cx='600' cy='80' r='2' fill='white'/%3E%3Ccircle cx='680' cy='180' r='1.5' fill='white'/%3E%3Ccircle cx='720' cy='280' r='2.5' fill='white'/%3E%3Ccircle cx='500' cy='350' r='1.5' fill='white'/%3E%3Ccircle cx='580' cy='320' r='1' fill='white'/%3E%3C/svg%3E"
</script>

<template>
	<section id="article-intro">
		<hgroup>
			<h1>Article card</h1>
			<p>
				The framework's flagship <em>element-IS-component</em> proof. Drop in an
				<code>&lt;article&gt;</code> and it already paints as a card — padding, radius, border, soft
				shadow, flex-column rhythm. The same modifier vocabulary every other element uses applies:
				variants tint the chrome, <code>.subtle</code> and <code>.filled</code> swap fill treatment,
				size modifiers scale per-element. No <code>.card</code> class to remember; just the semantic
				root.
			</p>
		</hgroup>
		<p>
			Auto-banded slots make composition feel structural rather than configurational. Drop a
			<code>&lt;header&gt;</code> as the first child and it picks up a tinted band with a divider.
			Drop an <code>&lt;img&gt;</code> as the first or last child and it bleeds to the card's outer
			edge with corners pinned to the inner radius. Drop a <code>&lt;ul class="group"&gt;</code> and
			the list group's outer border drops — the card IS the panel edge. The framework reads the
			structure and paints the right chrome.
		</p>
	</section>

	<section id="article-bare">
		<h2>Bare <code>&lt;article&gt;</code></h2>
		<p>
			No classes. Token-driven defaults: <code>--set-box-shadow-small</code> elevation,
			<code>--set-article-padding-*</code> for the inset, <code>--set-article-gap</code> between
			top-level children. Container-query named <code>article</code> so descendants can adapt to the
			card's intrinsic inline-size.
		</p>
		<article>
			<h3>The Analytical Engine</h3>
			<p>
				The Analytical Engine has no pretensions whatever to <em>originate</em> anything. It can do
				<em>whatever we know how to order it</em> to perform. It can follow analysis; but it has no
				power of <em>anticipating</em> any analytical relations or truths.
			</p>
			<p class="showcase-card-subtitle">
				— Ada Lovelace, <cite>Notes on the Analytical Engine</cite>, 1843
			</p>
		</article>
	</section>

	<section id="article-slots">
		<h2>Auto-banded slots — <code>&lt;header&gt;</code> + <code>&lt;footer&gt;</code></h2>
		<p>
			A direct-child <code>&lt;header&gt;</code> (first) and <code>&lt;footer&gt;</code> (last) pick
			up edge-to-edge banded chrome — subtle tinted bg, divider border, inner radius matched to the
			outer card edge minus the border width. The article zeroes its own padding on the matching
			edge (via <code>:has()</code>) so the band reaches the card's inner edge without
			negative-margin tricks.
		</p>
		<article>
			<header>
				<h3>Account settings</h3>
				<p class="showcase-card-subtitle">
					Manage your profile, email, and notification preferences.
				</p>
			</header>
			<p>
				Changes are saved automatically. Sign-out from all devices is available in the security
				section.
			</p>
			<dl>
				<dt>Email</dt>
				<dd>ada@example.com</dd>
				<dt>Plan</dt>
				<dd>Pro — annual</dd>
				<dt>Member since</dt>
				<dd>March 2024</dd>
			</dl>
			<footer class="cluster showcase-footer-actions">
				<button type="button" class="subtle">Cancel</button>
				<button type="button" class="primary">Save changes</button>
			</footer>
		</article>
	</section>

	<section id="article-variants">
		<h2>Variant cascade — border tint</h2>
		<p>
			Articles are containers, not action surfaces, so the variant cascade only reaches the BORDER
			by default. The body stays neutral. Each card carries a single-word variant class
			(<code>.success</code>, <code>.warning</code>, etc.) and the border picks up the variant's
			identity color through <code>--set-variant-background-color</code>.
		</p>
		<div class="showcase-tile-grid">
			<article class="primary">
				<h4>Primary</h4>
				<p class="showcase-card-subtitle">
					Identity-bordered card.
				</p>
			</article>
			<article class="success">
				<h4>Success</h4>
				<p class="showcase-card-subtitle">
					Confirmation context.
				</p>
			</article>
			<article class="warning">
				<h4>Warning</h4>
				<p class="showcase-card-subtitle">
					Caution context.
				</p>
			</article>
			<article class="danger">
				<h4>Danger</h4>
				<p class="showcase-card-subtitle">
					Destructive context.
				</p>
			</article>
			<article class="information">
				<h4>Information</h4>
				<p class="showcase-card-subtitle">
					Neutral notice context.
				</p>
			</article>
			<article class="tertiary">
				<h4>Tertiary</h4>
				<p class="showcase-card-subtitle">
					Alternative action context.
				</p>
			</article>
		</div>
	</section>

	<section id="article-subtle">
		<h2>Style modifier — <code>.subtle</code></h2>
		<p>
			Layering <code>.subtle</code> on a variant card tints the body with the variant's
			<code>bg-subtle</code> color and shifts text to the variant's <code>text-emphasis</code>
			color. Use for callout cards where the variant signal matters more than the surface staying
			neutral.
		</p>
		<div class="showcase-tile-grid">
			<article class="success subtle">
				<h4>Build passed</h4>
				<p>
					All 1,420 tests passing on <code>main</code>. Ready to deploy.
				</p>
			</article>
			<article class="warning subtle">
				<h4>Quota warning</h4>
				<p>You're at 87% of your monthly API quota. Consider upgrading.</p>
			</article>
			<article class="danger subtle">
				<h4>Payment failed</h4>
				<p>
					Your subscription couldn't be renewed. Update your billing method.
				</p>
			</article>
			<article class="information subtle">
				<h4>Scheduled maintenance</h4>
				<p>
					Database maintenance tonight 02:00–04:00 UTC. Expect brief downtime.
				</p>
			</article>
		</div>
	</section>

	<section id="article-filled">
		<h2>Style modifier — <code>.filled</code></h2>
		<p>
			Layering <code>.filled</code> paints the saturated variant identity color with white text.
			Reserve for top-of-page hero cards where the variant signal needs to dominate the surrounding
			layout. Headers and footers inside a filled article inherit the fill — the band chrome reads
			as a tonal shift within the same surface, not a separate tier.
		</p>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: 18rem; --showcase-tile-grid-flow: auto-fit">
			<article class="primary filled">
				<header>
					<h3>Welcome to Pro</h3>
				</header>
				<p>
					You've unlocked unlimited projects, priority support, and advanced analytics. Your trial
					runs through April 30 — cancel anytime.
				</p>
				<footer class="cluster">
					<button type="button">Start a tour</button>
				</footer>
			</article>
			<article class="success filled">
				<header>
					<h3>Order shipped</h3>
				</header>
				<p>
					Tracking <code style="background-color: rgb(255 255 255 / 0.2)">FX-8821-991</code>.
					Delivery expected Friday between 10 AM and 2 PM.
				</p>
			</article>
		</div>
	</section>

	<section id="article-sizes">
		<h2>Size modifiers — <code>.small</code> / default / <code>.large</code></h2>
		<p>
			Per-element size overrides — articles consume the global <code>--set-size-*</code> cascade but
			with tighter values that suit cards specifically (a button's "small" is wildly different from
			a card's "small"). <code>.small</code> halves padding and gap; <code>.large</code> roughly
			doubles them and bumps the font-size.
		</p>
		<div class="stack">
			<article class="small">
				<h4>Small card</h4>
				<p class="showcase-card-subtitle">
					Compact density for tight grids and inline tiles.
				</p>
			</article>
			<article>
				<h3>Default card</h3>
				<p class="showcase-card-subtitle">
					The framework's neutral baseline. Used everywhere else on this page.
				</p>
			</article>
			<article class="large">
				<h2>Large card</h2>
				<p class="showcase-card-subtitle">
					Hero-tier surface — generous padding + radius for top-of-page splashes.
				</p>
			</article>
		</div>
	</section>

	<section id="article-image">
		<h2>Image bleed — <code>&lt;img&gt;</code> as first or last child</h2>
		<p>
			A direct-child <code>&lt;img&gt;</code> or <code>&lt;picture&gt;</code> bleeds to the
			article's outer edge — negative inline margins cancel the card's padding,
			<code>width: calc(100% + padding * 2)</code> stretches the image, and the matching
			corner-radius pair (<code>border-start-*</code> for first-child, <code>border-end-*</code> for
			last-child) gets pinned to the outer radius minus border-width.
		</p>
		<div
			class="showcase-tile-grid"
			style="--showcase-tile-grid-min: 20rem; --showcase-tile-grid-flow: auto-fit; --showcase-tile-grid-gap: 1.5rem"
		>
			<article>
				<img
					:src="heroImageDataUri"
					alt="A teal-to-cyan gradient with abstract circles and a low horizon"
					width="800"
					height="400"
				/>
				<h3>Coastal mornings</h3>
				<p class="showcase-card-subtitle">
					Image bleeds to the top edge; copy follows in the card's normal flow.
				</p>
				<footer class="cluster showcase-footer-actions">
					<button type="button" class="subtle">Save</button>
					<button type="button" class="primary">Read more</button>
				</footer>
			</article>
			<article>
				<header>
					<h3>Aurora notes</h3>
					<p class="showcase-card-subtitle">
						Mountain expedition log
					</p>
				</header>
				<p>
					Six days, three peaks, one unforgettable midnight sky. Field journal excerpts and trail
					GPX downloads below.
				</p>
				<img
					:src="cosmicImageDataUri"
					alt="A deep purple cosmic gradient with a bright planet and scattered stars"
					width="800"
					height="400"
				/>
			</article>
		</div>
	</section>

	<section id="article-list-group">
		<h2>Embedded list-group</h2>
		<p>
			A direct-child <code>&lt;ul class="group"&gt;</code> or <code>&lt;ol class="group"&gt;</code>
			bleeds to the card's inner edge and drops its own outer border — the card IS the panel edge.
			Useful for settings sheets, menu cards, and any pattern where a header / footer band frames a
			list of rows.
		</p>
		<article style="max-width: 28rem">
			<header>
				<h3>Notifications</h3>
			</header>
			<ul class="group">
				<li><a href="#article-list-group">Email digests</a></li>
				<li><a href="#article-list-group">Push notifications</a></li>
				<li><a href="#article-list-group">Sound alerts</a></li>
				<li><a href="#article-list-group">Do not disturb schedule</a></li>
			</ul>
			<footer class="showcase-footer-split">
				<small class="showcase-muted"> Changes save automatically </small>
				<button type="button" class="subtle small">Reset to defaults</button>
			</footer>
		</article>
	</section>

	<section id="article-flush">
		<h2>Nested cards — <code>article.flush</code></h2>
		<p>
			<code>.flush</code> drops the article's outer border, radius, shadow, and margin so a nested
			<code>&lt;article&gt;</code> inside a parent card / region surface reads as one continuous
			boundary owned by the host. Internal <code>&lt;header&gt;</code> / <code>&lt;footer&gt;</code>
			pin chrome survives because it's painted from inside the article's grid. Variant cascade still
			flows through to the article's internal chrome — variant headers / footers / borders show up
			on nested cards even when the outer perimeter is dissolved.
		</p>
		<p>Three nested articles inside one outer card — each is itself a fully-composed card:</p>
		<article class="frame" style="max-width: 32rem">
			<header>
				<h3>Deployment summary</h3>
			</header>
			<article class="success flush">
				<header><h4>Build passed</h4></header>
				<p>All 1,420 tests passing on <code>main</code>.</p>
			</article>
			<article class="warning flush">
				<header><h4>1 deprecation warning</h4></header>
				<p>See build log for the call site.</p>
			</article>
			<article class="information flush">
				<header><h4>Awaiting review</h4></header>
				<p>Deploy starts in 60 seconds unless cancelled.</p>
			</article>
			<footer>
				<small>Last updated 12 seconds ago.</small>
			</footer>
		</article>
		<p>
			Useful for status panels, settings group cards with internal section dividers, and any pattern
			where a parent card frames multiple structured sub-regions without each sub-region painting
			its own outline.
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;article class="success flush"&gt;
    &lt;header&gt;&lt;h4&gt;Build passed&lt;/h4&gt;&lt;/header&gt;
    &lt;p&gt;…&lt;/p&gt;
  &lt;/article&gt;
  &lt;article class="warning flush"&gt;…&lt;/article&gt;
  &lt;article class="information flush"&gt;…&lt;/article&gt;
  &lt;footer&gt;…&lt;/footer&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="article-compositions">
		<h2>Real-world compositions</h2>
		<p>
			Five card patterns built entirely from framework primitives — no per-pattern CSS, just the
			article + modifier cascade + auto-banded slots composed differently each time.
		</p>

		<h3>Profile card</h3>
		<article style="max-width: 24rem">
			<header class="showcase-profile-header">
				<img
					:src="portraitImageDataUri"
					alt="Ada Lovelace's portrait — abstract gradient placeholder"
					width="64"
					height="64"
					class="showcase-profile-avatar"
				/>
				<div>
					<h3>Ada Lovelace</h3>
					<p class="showcase-card-subtitle">
						Mathematician · Analytical team
					</p>
				</div>
			</header>
			<p>
				342 commits over the project's lifetime. Latest activity 2 hours ago.
			</p>
			<footer class="cluster">
				<button type="button" class="primary">Message</button>
				<button type="button" class="subtle">View profile</button>
			</footer>
		</article>

		<h3>Stat card grid</h3>
		<div
			class="showcase-tile-grid"
			style="--showcase-tile-grid-min: 12rem; --showcase-tile-grid-flow: auto-fit"
		>
			<article class="small">
				<p class="showcase-stat-label">Active users</p>
				<p class="showcase-stat-value">12,402</p>
				<p class="showcase-stat-delta showcase-stat-delta-up">↑ 4.2% vs last week</p>
			</article>
			<article class="small">
				<p class="showcase-stat-label">Revenue</p>
				<p class="showcase-stat-value">$48.7k</p>
				<p class="showcase-stat-delta showcase-stat-delta-up">↑ 8.7% vs last week</p>
			</article>
			<article class="small">
				<p class="showcase-stat-label">Churn rate</p>
				<p class="showcase-stat-value">2.4%</p>
				<p class="showcase-stat-delta showcase-stat-delta-down">↑ 0.3pp vs last week</p>
			</article>
			<article class="small">
				<p class="showcase-stat-label">Avg session</p>
				<p class="showcase-stat-value">14m 32s</p>
				<p class="showcase-stat-delta showcase-stat-delta-flat">— flat vs last week</p>
			</article>
		</div>

		<h3>Pricing card</h3>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-flow: auto-fit">
			<article>
				<header>
					<h4>Free</h4>
					<p class="showcase-card-subtitle">
						For solo builders
					</p>
				</header>
				<p class="showcase-price">
					$0
					<small class="showcase-price-unit">/ month</small>
				</p>
				<ul>
					<li>3 projects</li>
					<li>Community support</li>
					<li>1 GB storage</li>
				</ul>
				<footer>
					<button type="button" class="subtle w-full">Start free</button>
				</footer>
			</article>
			<article class="primary">
				<header>
					<h4>Pro</h4>
					<p class="showcase-card-subtitle">
						For growing teams
					</p>
				</header>
				<p class="showcase-price">
					$24
					<small class="showcase-price-unit">/ month</small>
				</p>
				<ul>
					<li>Unlimited projects</li>
					<li>Priority support</li>
					<li>100 GB storage</li>
					<li>Advanced analytics</li>
				</ul>
				<footer>
					<button type="button" class="primary w-full">Upgrade to Pro</button>
				</footer>
			</article>
			<article>
				<header>
					<h4>Enterprise</h4>
					<p class="showcase-card-subtitle">
						For organizations
					</p>
				</header>
				<p class="showcase-price">Custom</p>
				<ul>
					<li>Everything in Pro</li>
					<li>SSO + SAML</li>
					<li>SLA + dedicated CSM</li>
					<li>On-premise option</li>
				</ul>
				<footer>
					<button type="button" class="subtle w-full">Contact sales</button>
				</footer>
			</article>
		</div>

		<h3>Card with aside callout</h3>
		<article>
			<header>
				<h3>Project: Aurora 1.2 release</h3>
			</header>
			<p>
				The 1.2 release lands April 30. Migration guide is in the docs; the breaking changes summary
				is below. If you're on 1.1.x and using the legacy webhook signature, review the API council
				notes before upgrading.
			</p>
			<aside class="warning">
				<p>
					<strong>Heads up:</strong> the <code>v1/webhooks</code> endpoint is deprecated in 1.2 and
					will be removed in 1.3. Migrate to <code>v2/events</code>.
				</p>
			</aside>
			<footer class="showcase-footer-split">
				<small class="showcase-muted"> Filed by Margaret Hamilton </small>
				<a href="#article-compositions">Migration guide →</a>
			</footer>
		</article>

		<h3>Disabled card</h3>
		<article class="disabled" aria-disabled="true">
			<header>
				<h4>Locked feature</h4>
			</header>
			<p>
				Available on Pro plans. The card is dimmed and pointer-events are disabled so the footer
				button can't be clicked.
			</p>
			<footer class="cluster">
				<button type="button" class="primary" disabled>Open</button>
			</footer>
		</article>
	</section>

	<section id="article-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				Use <code>&lt;article&gt;</code> for content that could stand alone outside the page — a
				blog post, a product summary, a comment, a comparison row. For purely presentational
				containers, reach for <code>&lt;div&gt;</code>.
			</li>
			<li>
				Variant tinting is signal, not decoration. <code>.warning</code> should mean "this needs
				caution"; pair the color with a text cue (icon, label) so the meaning carries to color-blind
				and forced-colors readers (WCAG 1.4.1).
			</li>
			<li>
				<code>.filled</code> reads loud — reserve it for cards that need to dominate the visual
				hierarchy. Use <code>.subtle</code> for the more common "tinted but quiet" case.
			</li>
			<li>
				<code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> auto-band ONLY when they're
				direct children of the article AND match the first / last position. Nested
				<code>&lt;header&gt;</code> inside a <code>&lt;section&gt;</code> inside the article doesn't
				trigger the band chrome — that's intentional, the band is for top-level card slots.
			</li>
			<li>
				The article's container-query name <code>article</code> lets descendants adapt to the card's
				actual inline-size: <code>@container article (min-inline-size: 24rem) { … }</code>. Use this
				instead of viewport queries for layouts inside cards.
			</li>
		</ul>
	</section>
</template>
