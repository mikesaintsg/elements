<script lang="ts" setup>
/**
 * NavPage — the canonical reference for `<nav>` across the contexts the
 * framework paints. `<nav>` is W3C-defined as "a section of a page that
 * links to other pages or to parts within the page." Content shape +
 * ancestry + `aria-label` decide the visual variant — there is no
 * `<nav class="...">` class root.
 *
 * API surface coverage (from Phase 1 audit of
 * `src/styles/components/_nav.scss` + `src/styles/components/_menu.scss`
 * + `src/browser/tokens.ts`):
 *
 *   1. Bare `<nav>` — block-flow container. The framework deliberately
 *      does NOT default `<nav>` to `display: flex`; nested navs are
 *      common and a flex-wrap default would stagger inner content. The
 *      consumer reaches for utilities (`flex flex-wrap gap-*`) for the
 *      "flat row of links" shape, or for one of the recognized
 *      aria-label opt-ins below.
 *   2. Body-shell rail (`body > nav`) — vertical column alongside
 *      `<main>` in the body-grid layout. 16 rem inline-size, padding,
 *      `border-inline-end`, `overflow-y: auto`, flex-column with gap.
 *      On mobile the showcase opts into native-popover drawer mode via
 *      `:popover="isMobile ? 'auto' : undefined"`; framework chrome
 *      from `:is(aside, nav)[popover]` takes over. The page you're
 *      reading right now mounts inside this rail to the LEFT — the
 *      live demo is the surrounding chrome.
 *   3. Nav-rail menu rows (`body > nav menu > li > a`) — full-width
 *      start-aligned rows with `aria-current="page"` tint. Chrome
 *      lives in `_menu.scss` (cross-referenced because the rail's
 *      grouped-sidebar pattern uses `<h6>` + `<menu>` siblings).
 *   4. Breadcrumb (`nav[aria-label="Breadcrumb"]`) — horizontal `<ol>`
 *      with chevron `::before` separators between siblings, dimmed
 *      `aria-current="page"` leaf.
 *   5. Pagination (`nav[aria-label="Pagination"]`) — bordered button
 *      row with collapsed adjacent borders, hover / focus z-index lift,
 *      `aria-current="page"` active fill, `aria-disabled` /
 *      `:disabled` muting.
 *   6. Tablist (`<nav role="tablist">`) — horizontal flex of
 *      button-like rows; the `aria-selected="true"` tab lifts to a
 *      `bg-subtle` fill + emphasised text (no border-line — matches
 *      the nav-row active idiom), `[hidden]`-gated
 *      `[role="tabpanel"]` body. Keyboard wiring (Left / Right / Home /
 *      End) lives in `useTabs` (Phase 6 composable, not yet shipped) —
 *      the framework paints the chrome only.
 *   7. `.fill` / `.justified` modifiers on the inner list — equal-
 *      width items spanning the container (Mailbox parity for
 *      `.nav-fill` / `.nav-justified`).
 *   8. Token surface — `--set-nav-*` (color / bg / border / padding /
 *      gap / inline-size / font-size + breadcrumb separator + pagination
 *      sub-surface).
 *
 * Cross-references:
 *   - [AsidePage](#/aside) — the right rail you're reading alongside;
 *     same body-grid placement contract, different element.
 *   - [SectioningPage](#/sectioning) — body grid layout discussion.
 *   - [MenuPage](#/menu) — `<menu>` chrome inside `<nav>` for the
 *     grouped-sidebar pattern.
 */
import { ref } from 'vue'

import { VARIANTS as variants } from '../constants.js'

// Tablist demo state — one of three tab ids active at a time. APG-
// recommended pattern: `aria-selected` mirrors the active id; inactive
// `[role="tabpanel"]` gets `[hidden]` so it leaves the document flow
// AND the tab order. Keyboard wiring is left for `useTabs` (Phase 6).
const tab = ref<'overview' | 'pricing' | 'support'>('overview')
const setTab = (id: 'overview' | 'pricing' | 'support'): void => {
	tab.value = id
}

// Pagination demo state — track which page is current so the
// `aria-current="page"` tint flows through the variant cascade.
const page = ref(2)
const goto = (n: number): void => {
	if (n < 1 || n > 7) return
	page.value = n
}
</script>

<template>
	<section id="nav-intro">
		<hgroup>
			<h1>Nav</h1>
			<p>
				<code>&lt;nav&gt;</code> is the W3C-defined navigation landmark. One element, multiple
				visual contexts disambiguated by ancestry + content shape + <code>aria-label</code> — never
				by a class on the root. Sidebar rail, breadcrumb trail, pagination row, tablist — all
				painted from the single <code>components/_nav.scss</code> partial.
			</p>
		</hgroup>
		<p>
			You're already looking at one of these contexts — the page you're reading mounts inside the
			showcase's body-shell <code>&lt;nav&gt;</code> rail to the left, and the on-this-page rail to
			the right is a sibling <code>&lt;aside&gt;</code>. Sections below cover the four other
			canonical shapes the framework paints.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Selector contract.</strong> The framework paints <code>&lt;nav&gt;</code> by
				ancestry (<code>body &gt; nav</code> = rail), inner-content shape (<code>nav &gt; ol</code>
				= breadcrumb / pagination / horizontal list, opted in via <code>aria-label</code>), or ARIA
				role (<code>nav role="tablist"</code> = tab strip). The bare element is a quiet block-flow
				container so nested navs don't stagger.
			</p>
		</aside>
	</section>

	<section id="nav-rail">
		<h2>1. Body-shell rail — <code>body &gt; nav</code></h2>
		<p>
			The primary navigation column in the body-grid layout shell. Selected via
			<code>body:has(main) &gt; nav</code> (plus the <code>&gt; * &gt;</code> once-removed variant
			for framework mount points). Fixed <code>--set-nav-inline-size</code> (16 rem default), scoped
			<code>--set-nav-padding-*</code>, <code>overflow-y: auto</code>, flex-column with
			<code>--set-nav-gap</code> between top-level children. Border on the inline-end edge by
			default (the rail sits leading <code>&lt;main&gt;</code>); the <code>.end</code> placement
			modifier flips the border to the leading edge for rails on the trailing side.
		</p>
		<p>
			Below 960 px the showcase lifts both body-shell rails into native popover-drawer mode via
			<code>:popover="isMobile ? 'auto' : undefined"</code>; the framework's
			<code>:is(aside, nav)[popover]</code> chrome from <code>components/_aside.scss</code> takes
			over (slide-from-edge motion, native <code>::backdrop</code> scrim, four placement modifiers,
			Esc / click-outside dismiss). See <a href="#/aside">AsidePage § Drawer / offcanvas</a> for the
			full drawer-surface contract — rails and standalone <code>&lt;aside popover&gt;</code> drawers
			share one chrome family.
		</p>
		<p>
			The grouped-sidebar pattern — <code>&lt;h6&gt;</code> + <code>&lt;menu&gt;</code> sibling
			pairs inside <code>&lt;nav&gt;</code> — paints each <code>&lt;li&gt;&lt;a&gt;</code> as a
			stacked vertical row with hover + <code>aria-current="page"</code> tint. The row chrome lives
			in <code>_menu.scss</code>; see <a href="#/menu">MenuPage</a> for the worked example.
		</p>
		<details>
			<summary><small>Markup — body-shell rail with grouped nav targets</small></summary>
			<pre><code>&lt;nav aria-label="Primary"&gt;
  &lt;h6&gt;Getting started&lt;/h6&gt;
  &lt;menu&gt;
    &lt;li&gt;&lt;a href="#/home" aria-current="page"&gt;Home&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/install"&gt;Install&lt;/a&gt;&lt;/li&gt;
  &lt;/menu&gt;
  &lt;h6&gt;Components&lt;/h6&gt;
  &lt;menu&gt;
    &lt;li&gt;&lt;a href="#/button"&gt;Button&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/anchor"&gt;Anchor&lt;/a&gt;&lt;/li&gt;
  &lt;/menu&gt;
&lt;/nav&gt;</code></pre>
		</details>
	</section>

	<section id="nav-breadcrumb">
		<h2>2. Breadcrumb — <code>nav[aria-label="Breadcrumb"]</code></h2>
		<p>
			Horizontal list of ancestor links. Opted in via the WAI-ARIA APG-recommended
			<code>aria-label="Breadcrumb"</code> on <code>&lt;nav&gt;</code> wrapping an
			<code>&lt;ol&gt;</code>. Each non-first <code>&lt;li&gt;</code> gets a chevron
			<code>::before</code> separator (mask-image painted with <code>currentColor</code>); the
			trailing leaf carries <code>aria-current="page"</code> and dims through
			<code>--set-nav-breadcrumb-active-color</code>.
		</p>
		<nav aria-label="Breadcrumb">
			<ol>
				<li><a href="#/home">Home</a></li>
				<li><a href="#/sectioning">Components</a></li>
				<li><a href="#/nav">Navigation</a></li>
				<li aria-current="page">Breadcrumb</li>
			</ol>
		</nav>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;nav aria-label="Breadcrumb"&gt;
  &lt;ol&gt;
    &lt;li&gt;&lt;a href="#/home"&gt;Home&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/sectioning"&gt;Components&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/nav"&gt;Navigation&lt;/a&gt;&lt;/li&gt;
    &lt;li aria-current="page"&gt;Breadcrumb&lt;/li&gt;
  &lt;/ol&gt;
&lt;/nav&gt;</code></pre>
		</details>
		<h3>Custom separator</h3>
		<p>
			The separator glyph is a token. Override
			<code>--set-nav-breadcrumb-separator-image</code> at any scope to swap the chevron for a
			slash, a forward arrow, a custom inline SVG, etc. The color follows
			<code>currentColor</code> via the <code>mask-image</code> + <code>background-color</code>
			pattern.
		</p>
		<nav
			aria-label="Breadcrumb"
			style="
				--set-nav-breadcrumb-separator-image: url('data:image/svg+xml;utf8,&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;&gt;&lt;path fill=&quot;black&quot; d=&quot;M3 14L11 2H13L5 14z&quot;/&gt;&lt;/svg&gt;');
			"
		>
			<ol>
				<li><a href="#/home">Home</a></li>
				<li><a href="#/sectioning">Components</a></li>
				<li aria-current="page">Custom slash separator</li>
			</ol>
		</nav>
	</section>

	<section id="nav-pagination">
		<h2>3. Pagination — <code>nav[aria-label="Pagination"]</code></h2>
		<p>
			Bordered button row inside <code>&lt;nav aria-label="Pagination"&gt;</code> wrapping an
			<code>&lt;ol&gt;</code>. The first / last items pick up rounded corners; intermediate items
			collapse their adjacent borders via a <code>margin-inline-start: -1px</code> trick (Mailbox's
			<code>.page-item + .page-item .page-link</code> pattern). Hover and
			<code>:focus-visible</code> raise <code>z-index</code> so the focused tile paints over its
			neighbours' borders.
		</p>
		<p>
			<code>aria-current="page"</code> flips the active tile to the variant fill (defaults to
			<code>--color-primary</code> through the <code>--set-nav-pagination-active-*</code> triplet).
			<code>aria-disabled="true"</code> on an <code>&lt;a&gt;</code>, native
			<code>disabled</code> on a <code>&lt;button&gt;</code>, and the <code>.disabled</code> /
			<code>.active</code> class aliases all hook the same chrome — Bootstrap-parity markup migrates
			without rewriting.
		</p>
		<nav aria-label="Pagination">
			<ol>
				<li>
					<button
						type="button"
						:aria-disabled="page === 1 ? 'true' : undefined"
						:disabled="page === 1"
						@click="goto(page - 1)"
					>
						‹ Prev
					</button>
				</li>
				<li v-for="n in 7" :key="n">
					<button type="button" :aria-current="page === n ? 'page' : undefined" @click="goto(n)">
						{{ n }}
					</button>
				</li>
				<li>
					<button
						type="button"
						:aria-disabled="page === 7 ? 'true' : undefined"
						:disabled="page === 7"
						@click="goto(page + 1)"
					>
						Next ›
					</button>
				</li>
			</ol>
		</nav>
		<p class="mt-4">
			<small
				>Active page: <strong>{{ page }}</strong> — click a number to retune.</small
			>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;nav aria-label="Pagination"&gt;
  &lt;ol&gt;
    &lt;li&gt;&lt;a aria-disabled="true"&gt;‹ Prev&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#"&gt;1&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#" aria-current="page"&gt;2&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#"&gt;3&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#"&gt;Next ›&lt;/a&gt;&lt;/li&gt;
  &lt;/ol&gt;
&lt;/nav&gt;</code></pre>
		</details>

		<h3>Variant cascade on the active page</h3>
		<p>
			Pin <code>--set-nav-pagination-active-background-color</code> per-instance to retint the
			active tile through the seven variants. The token-driven cascade means the consumer never
			edits the partial.
		</p>
		<div class="flex flex-col gap-3">
			<nav
				v-for="v in variants"
				:key="v"
				aria-label="Pagination"
				:style="`--set-nav-pagination-active-background-color: var(--color-${v}); --set-nav-pagination-active-border-color: var(--color-${v});`"
			>
				<ol>
					<li><a href="#" :aria-label="`${v} pagination`">1</a></li>
					<li><a href="#" aria-current="page">2</a></li>
					<li><a href="#">3</a></li>
				</ol>
			</nav>
		</div>
	</section>

	<section id="nav-tablist">
		<h2>4. Tablist — <code>&lt;nav role="tablist"&gt;</code></h2>
		<p>
			Tab strip. Per the HTML LS <code>&lt;nav&gt;</code> covers "navigation to other pages or parts
			within the page" — tabs <em>do</em> navigate between sibling panels of the same page, so
			<code>&lt;nav&gt;</code> is the canonical host. The role-based selector also matches
			<code>&lt;menu role="tablist"&gt;</code> / <code>&lt;div role="tablist"&gt;</code> for tab
			groups inside cards or widgets where a landmark would be unwanted noise.
		</p>
		<p>
			The framework paints chrome only: a horizontal flex row of quiet button-like tabs. The
			<code>aria-selected="true"</code> tab lifts to a <code>bg-subtle</code> fill + emphasised text
			— the same active-row idiom as a body-shell nav rail, with no border-line (an earlier draft
			painted a 2&nbsp;px <code>border-block-end</code>; the button baseline's radius rounded its
			ends and it read as opinionated chrome). For the Bootstrap / Mailbox framed-tab look, opt in
			with <code>&lt;nav role="tablist" class="bordered"&gt;</code> as shown in the second demo
			below. Keyboard wiring (Left / Right / Home / End / Esc, roving tabindex) lives in
			<code>useTabs</code> (Phase 6 composable, not yet shipped); until then consumers wire the
			click handlers themselves as below.
		</p>
		<nav role="tablist" aria-label="Settings">
			<button
				type="button"
				role="tab"
				:aria-selected="tab === 'overview'"
				:tabindex="tab === 'overview' ? 0 : -1"
				aria-controls="tabpanel-overview"
				id="tab-overview"
				@click="setTab('overview')"
			>
				Overview
			</button>
			<button
				type="button"
				role="tab"
				:aria-selected="tab === 'pricing'"
				:tabindex="tab === 'pricing' ? 0 : -1"
				aria-controls="tabpanel-pricing"
				id="tab-pricing"
				@click="setTab('pricing')"
			>
				Pricing
			</button>
			<button
				type="button"
				role="tab"
				:aria-selected="tab === 'support'"
				:tabindex="tab === 'support' ? 0 : -1"
				aria-controls="tabpanel-support"
				id="tab-support"
				@click="setTab('support')"
			>
				Support
			</button>
		</nav>
		<div
			role="tabpanel"
			id="tabpanel-overview"
			aria-labelledby="tab-overview"
			:hidden="tab !== 'overview'"
		>
			<p>
				<strong>Overview panel.</strong> A short summary of what the product does, who it's for, and
				how it fits the surrounding workflow. Tabs let related content share a single page footprint
				without forcing the user to scroll through every section.
			</p>
		</div>
		<div
			role="tabpanel"
			id="tabpanel-pricing"
			aria-labelledby="tab-pricing"
			:hidden="tab !== 'pricing'"
		>
			<p>
				<strong>Pricing panel.</strong> Plans, billing cadence, fair-use policy. Tabs are
				appropriate when sibling sections are roughly equal in weight — a single dominant section +
				a few minor ones tends to read better as one scroll.
			</p>
		</div>
		<div
			role="tabpanel"
			id="tabpanel-support"
			aria-labelledby="tab-support"
			:hidden="tab !== 'support'"
		>
			<p>
				<strong>Support panel.</strong> Contact channels, response-time SLAs, links to the docs and
				the issue tracker. Use polite-tier <code>role="status"</code> for any inline state updates
				(saving, syncing) inside a panel; reserve <code>role="alert"</code> for genuine urgent
				notices.
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;nav role="tablist" aria-label="Settings"&gt;
  &lt;button role="tab" aria-selected="true"  aria-controls="p-1" id="t-1"&gt;Overview&lt;/button&gt;
  &lt;button role="tab" aria-selected="false" aria-controls="p-2" id="t-2"&gt;Pricing&lt;/button&gt;
  &lt;button role="tab" aria-selected="false" aria-controls="p-3" id="t-3"&gt;Support&lt;/button&gt;
&lt;/nav&gt;
&lt;div role="tabpanel" id="p-1" aria-labelledby="t-1"&gt;…&lt;/div&gt;
&lt;div role="tabpanel" id="p-2" aria-labelledby="t-2" hidden&gt;…&lt;/div&gt;
&lt;div role="tabpanel" id="p-3" aria-labelledby="t-3" hidden&gt;…&lt;/div&gt;</code></pre>
		</details>

		<h3>Visual variants — <code>.pills</code>, <code>.bordered</code>, <code>.vertical</code></h3>
		<p>
			Three tablist style modifiers ship in <code>composables/_tabs.scss</code> for consumers using
			the <code>useTabs</code> composable:
		</p>
		<ul>
			<li>
				<strong><code>.pills</code></strong> — swaps the underline indicator for a filled background
				tint (segmented-control look).
			</li>
			<li>
				<strong><code>.bordered</code></strong> — frames the active tab + the panel below as a
				single card with a continuous border (Bootstrap <code>.nav-tabs</code> look).
			</li>
			<li>
				<strong><code>.vertical</code></strong> — stacks tabs in a column with the indicator on the
				inline-end edge; pairs with a wrapper that lays the tablist + the active panel side-by-side.
			</li>
		</ul>
		<p>
			All three reuse the framework's <code>--set-tab-*</code> token chain so a consumer retuning
			the active colour / padding cascades into every variant. Demo coverage for the three modifiers
			ships on the <strong>UseTabsPage</strong> when that composable lands.
		</p>
	</section>

	<section id="nav-fill-justified">
		<h2>5. <code>.fill</code> / <code>.justified</code> — equal-width row items</h2>
		<p>
			Mailbox-parity modifiers for stretched-row nav patterns. <code>.fill</code> on the inner
			<code>&lt;ol&gt;</code> / <code>&lt;ul&gt;</code> grows items to share the remaining space
			(content-aware width). <code>.justified</code> assigns zero flex-basis so every item is
			exactly equal width regardless of content. Useful for stretched tablist rows and segmented
			controls.
		</p>
		<nav aria-label="Pagination">
			<ol class="fill">
				<li><a href="#">Short</a></li>
				<li><a href="#" aria-current="page">A noticeably longer label</a></li>
				<li><a href="#">Mid</a></li>
			</ol>
		</nav>
		<p class="mt-4">
			<small><code>.fill</code> — items grow proportional to content.</small>
		</p>
		<nav aria-label="Pagination">
			<ol class="justified">
				<li><a href="#">Short</a></li>
				<li><a href="#" aria-current="page">A noticeably longer label</a></li>
				<li><a href="#">Mid</a></li>
			</ol>
		</nav>
		<p class="mt-4">
			<small
				><code>.justified</code> — items get equal flex-basis (zero), so every item is the same
				width regardless of content.</small
			>
		</p>
	</section>

	<section id="nav-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Every <code>&lt;nav&gt;</code>-surface transition (color, border, background fade on hover /
			focus / active) routes through the framework's <code>@include transition()</code> mixin, which
			automatically collapses to instant under <code>prefers-reduced-motion: reduce</code>. The
			pagination tile below transitions its border-color + background-color on hover at the
			framework's <code>--set-transition-duration</code> (150 ms); toggle your OS reduced-motion
			preference and verify the hover state snaps instantly with no fade.
		</p>
		<nav aria-label="Pagination">
			<ol>
				<li><a href="#">Hover me</a></li>
			</ol>
		</nav>
	</section>

	<section id="nav-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (and any <code>forced-colors: active</code> environment), the browser
			overrides custom backgrounds with <code>Canvas</code>, text with <code>CanvasText</code>,
			links with <code>LinkText</code>, and focus rings with <code>Highlight</code>. The framework
			chrome (border-color on rails, separator chevron via <code>currentColor</code>, pagination
			borders, tab indicators) survives because every color value flows through
			<code>--set-*</code> tokens that resolve to system color keywords under HC mode. No
			per-element <code>@forced-colors</code> blocks needed in <code>_nav.scss</code>; the
			inheritance chain handles it.
		</p>
		<p>
			Verify in Chrome DevTools via the <em>Rendering</em> panel → "Emulate CSS media feature
			forced-colors: active." Pagination borders should remain visible; the breadcrumb chevrons
			repaint with <code>CanvasText</code>; the active tablist indicator paints with
			<code>Highlight</code>.
		</p>
	</section>

	<section id="nav-tokens">
		<h2>Tokens</h2>
		<p>
			Every value below flows through a <code>--set-nav-*</code> custom property declared on bare
			<code>&lt;nav&gt;</code>. Pin one at <code>:root</code> to retune every nav across your app;
			pin per-instance via inline <code>style="…"</code> for a single rail / breadcrumb / pagination
			block.
		</p>
		<h3>Rail / generic</h3>
		<dl>
			<dt><code>--set-nav-color</code></dt>
			<dd>Text color of the rail. Defaults to <code>currentColor</code>.</dd>
			<dt><code>--set-nav-background-color</code></dt>
			<dd>Surface color of the rail. Defaults to <code>--color-surface</code>.</dd>
			<dt><code>--set-nav-border-color</code></dt>
			<dd>
				Edge border of the rail. Variant-aware cascade:
				<code>--set-style-border-color</code> → <code>--set-variant-background-color</code> →
				<code>--color-border</code>.
			</dd>
			<dt><code>--set-nav-border-width</code></dt>
			<dd>Width of the edge border. Defaults to <code>1px</code>.</dd>
			<dt><code>--set-nav-padding-inline</code> / <code>--set-nav-padding-block</code></dt>
			<dd>Inner padding of the rail. Defaults to <code>calc(var(--spacing) * 4)</code> (1 rem).</dd>
			<dt><code>--set-nav-inline-size</code></dt>
			<dd>Width of the rail column. Defaults to <code>16rem</code>.</dd>
			<dt><code>--set-nav-gap</code></dt>
			<dd>
				Vertical rhythm between top-level children of the rail. Defaults to <code>0.5 rem</code>.
			</dd>
			<dt><code>--set-nav-font-size</code></dt>
			<dd>Rail-context font size. Defaults to <code>--text-sm</code>.</dd>
			<dt><code>--set-nav-line-height</code></dt>
			<dd>Rail-context line height. Defaults to <code>--leading-normal</code>.</dd>
			<dt><code>--set-nav-transition-duration</code></dt>
			<dd>
				Duration of color / background / border transitions inside the rail. Defaults to
				<code>--set-transition-duration</code> (150 ms).
			</dd>
		</dl>
		<h3>Breadcrumb sub-surface</h3>
		<dl>
			<dt><code>--set-nav-breadcrumb-separator-image</code></dt>
			<dd>
				Mask-image for the chevron <code>::before</code> separator. Defaults to the framework
				chevron-right glyph from <code>--set-icon-chevron-right</code>.
			</dd>
			<dt><code>--set-nav-breadcrumb-separator-size</code></dt>
			<dd>Inline / block size of the separator glyph. Defaults to <code>0.75em</code>.</dd>
			<dt><code>--set-nav-breadcrumb-separator-opacity</code></dt>
			<dd>Opacity of the separator. Defaults to <code>0.5</code>.</dd>
			<dt><code>--set-nav-breadcrumb-active-color</code></dt>
			<dd>
				Color of the trailing <code>aria-current="page"</code> leaf. Defaults to
				<code>--color-text-muted</code>.
			</dd>
		</dl>
		<h3>Pagination sub-surface</h3>
		<dl>
			<dt>
				<code>--set-nav-pagination-color</code> / <code>--set-nav-pagination-background-color</code>
			</dt>
			<dd>Text + surface colour of each pagination tile.</dd>
			<dt>
				<code>--set-nav-pagination-border-color</code> /
				<code>--set-nav-pagination-border-width</code>
			</dt>
			<dd>
				Border tone + width of each tile. Adjacent tiles collapse their borders via the
				<code>margin-inline-start: -border-width</code> trick.
			</dd>
			<dt><code>--set-nav-pagination-border-radius</code></dt>
			<dd>
				Outer corner radius applied only to the first / last tile. Defaults to
				<code>--radius-md</code>.
			</dd>
			<dt>
				<code>--set-nav-pagination-padding-inline</code> /
				<code>--set-nav-pagination-padding-block</code>
			</dt>
			<dd>Internal padding of each tile.</dd>
			<dt><code>--set-nav-pagination-min-size</code></dt>
			<dd>
				Minimum inline-size so single-digit tiles stay square. Defaults to <code>2.25rem</code>.
			</dd>
			<dt><code>--set-nav-pagination-hover-background-color</code></dt>
			<dd>Hover tint. Defaults to a translucent <code>currentColor</code> mix.</dd>
			<dt>
				<code>--set-nav-pagination-active-color</code> /
				<code>--set-nav-pagination-active-background-color</code> /
				<code>--set-nav-pagination-active-border-color</code>
			</dt>
			<dd>
				Filled triplet for the <code>aria-current="page"</code> tile. Defaults to the
				<code>--color-primary</code> family.
			</dd>
			<dt><code>--set-nav-pagination-disabled-opacity</code></dt>
			<dd>
				Opacity multiplier for <code>aria-disabled</code> / <code>:disabled</code> tiles. Defaults
				to <code>0.5</code>.
			</dd>
		</dl>
	</section>
</template>
