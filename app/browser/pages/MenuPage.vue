<script lang="ts" setup>
/**
 * MenuPage — the canonical reference for `<menu>` across the contexts
 * the framework paints. `<menu>` per HTML LS is "a toolbar consisting
 * of an unordered list of items, each of which represents a command
 * the user can perform or activate." Content-equivalent to `<ul>` (must
 * contain `<li>`s per spec) but with semantic intent that signals
 * "these are commands, not bullet points."
 *
 * API surface coverage (from Phase 1 audit of
 * `src/styles/components/_menu.scss` + `src/browser/tokens.ts`):
 *
 *   1. Bare `<menu>` — horizontal flex toolbar / command row. Hosts
 *      `<button>` or `<a>`-as-button children; `<li>` wrappers (if
 *      present, per spec) use `display: contents` so the buttons
 *      become direct flex items of the menu.
 *   2. Article action row (`article menu`) — same horizontal shape
 *      pushed to the trailing edge via `--set-menu-justify-content:
 *      flex-end` (Bootstrap / Material convention).
 *   3. Nav-rail menu (`body > nav menu > li > a/button`) — vertical
 *      stack of nav commands. Full-width start-aligned rows with the
 *      framework's quiet-text + hover-tint + `aria-current="page"`
 *      active state (`bg-subtle` + `text-emphasis`). `touch-action:
 *      pan-y` for the iOS scroll-on-link contract.
 *   4. Aside-TOC menu (`body > aside menu > li > a/button`) — same
 *      vertical stack with a leading-rule indicator. `aria-current=
 *      "location"` flips the rule + text to the primary identity.
 *      `[data-level="3"]` indents h3-level entries beneath their h2
 *      parents.
 *   5. Dropdown menu (`<menu popover>` + `<button popovertarget>`) —
 *      top-layer command column triggered by a button. The popover
 *      surface paints the panel chrome; this partial re-orients the
 *      menu inside it as a vertical column with pill-shaped items.
 *   6. Wrapped dropdown (`<div popover><menu>`) — the same dropdown
 *      chrome applies when a `<menu>` is nested inside a non-drawer
 *      `[popover]` (covers consumers wrapping the menu in a custom
 *      panel element). The `:not(aside):not(nav)` selector clause
 *      excludes offcanvas drawer surfaces (where descendant menus
 *      should render with nav-rail chrome, not dropdown chrome).
 *   7. Token surface — `--set-menu-*` (color / bg / gap / padding /
 *      justify-content).
 *
 * Cross-references:
 *   - [NavPage § Body-shell rail](#/nav) — `<menu>` inside a `<nav>` is
 *     the documented grouped-sidebar pattern.
 *   - [AsidePage § Sidebar](#/aside) — `<menu>` inside an `<aside>` is
 *     the canonical TOC surface.
 *   - [ButtonPage](#/button) — `<menu>` is a button row by intent.
 */
import { ref } from 'vue'

// Toolbar demo state — toggle bookmarked state to show that menu
// children are real interactive `<button>` elements, not decoration.
const bookmarked = ref(false)
const bold = ref(false)
const italic = ref(false)
const underline = ref(false)

// Demo TOC active id — switching it flips the leading-rule indicator
// on the matching row via `aria-current="location"`.
const activeSection = ref('introduction')

// Dropdown demo: track which command the user picked last so the
// trigger button can reflect the choice.
const lastCommand = ref<string | null>(null)
const onCommand = (label: string): void => {
	lastCommand.value = label
	document.getElementById('demo-dropdown')?.hidePopover()
}
</script>

<template>
	<section id="menu-intro">
		<hgroup>
			<h1>Menu</h1>
			<p>
				<code>&lt;menu&gt;</code> is the HTML LS toolbar element — a list of items where each item
				represents a command. Content-equivalent to <code>&lt;ul&gt;</code> but with semantic intent
				that signals "buttons, not bullets." Bare = horizontal command row; inside
				<code>&lt;article&gt;</code> = card action row; inside <code>&lt;nav&gt;</code> = vertical
				column of nav commands; inside <code>&lt;aside&gt;</code> = TOC waypoint column; with
				<code>popover</code> = dropdown panel.
			</p>
		</hgroup>
		<p>
			Per the spec, <code>&lt;menu&gt;</code> must contain <code>&lt;li&gt;</code> children, but the
			framework's chrome treats <code>&lt;li&gt;</code> as a layout-only wrapper:
			<code>&lt;li&gt;</code> gets <code>display: contents</code> so the
			<code>&lt;button&gt;</code> / <code>&lt;a&gt;</code> inside becomes a direct flex item of the
			menu — no extra box layer to fight when sizing and spacing.
		</p>
	</section>

	<section id="menu-bare">
		<h2>1. Bare <code>&lt;menu&gt;</code> — toolbar / command row</h2>
		<p>
			Outside any host context, <code>&lt;menu&gt;</code> is a horizontal flex row with
			<code>--set-menu-gap</code> between items and <code>flex-wrap: wrap</code> so a long row
			breaks onto multiple lines on narrow viewports. Children inherit the standard
			<code>&lt;button&gt;</code> chrome — variant + size + style modifiers all cascade.
		</p>
		<menu>
			<li>
				<button type="button" :aria-pressed="bold" @click="bold = !bold">
					<strong>B</strong>
				</button>
			</li>
			<li>
				<button type="button" :aria-pressed="italic" @click="italic = !italic">
					<em>I</em>
				</button>
			</li>
			<li>
				<button type="button" :aria-pressed="underline" @click="underline = !underline">
					<u>U</u>
				</button>
			</li>
			<li>
				<button
					type="button"
					class="subtle"
					:aria-pressed="bookmarked"
					@click="bookmarked = !bookmarked"
				>
					{{ bookmarked ? '★ Bookmarked' : '☆ Bookmark' }}
				</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;menu&gt;
  &lt;li&gt;&lt;button type="button"&gt;&lt;strong&gt;B&lt;/strong&gt;&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button type="button"&gt;&lt;em&gt;I&lt;/em&gt;&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button type="button"&gt;&lt;u&gt;U&lt;/u&gt;&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button type="button" class="subtle"&gt;☆ Bookmark&lt;/button&gt;&lt;/li&gt;
&lt;/menu&gt;</code></pre>
		</details>
	</section>

	<section id="menu-card-actions">
		<h2>2. Card action row — <code>article menu</code></h2>
		<p>
			Inside an <code>&lt;article&gt;</code> the menu picks up
			<code>--set-menu-justify-content: flex-end</code>, pushing actions to the trailing edge.
			Bootstrap and Material both converge on this convention — primary actions sit at the
			inline-end of the card so the eye reads body → actions in scan order.
		</p>
		<article>
			<header>
				<h3>Aurora 1.2 release</h3>
			</header>
			<p>
				The Aurora 1.2 SDK ships at the end of the month. Migration guide covers every breaking
				change with a one-step automated rewrite; consumers on 1.1.x with the legacy webhook
				signature should read the API council notes before upgrading.
			</p>
			<menu>
				<li>
					<button type="button" class="subtle">Dismiss</button>
				</li>
				<li>
					<button type="button" class="subtle">Remind me later</button>
				</li>
				<li>
					<button type="button" class="primary">Read migration guide</button>
				</li>
			</menu>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;p&gt;…&lt;/p&gt;
  &lt;menu&gt;
    &lt;li&gt;&lt;button class="subtle"&gt;Dismiss&lt;/button&gt;&lt;/li&gt;
    &lt;li&gt;&lt;button class="primary"&gt;Read migration guide&lt;/button&gt;&lt;/li&gt;
  &lt;/menu&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="menu-nav-rail">
		<h2>3. Nav-rail menu — <code>body &gt; nav menu</code></h2>
		<p>
			Inside a body-shell <code>&lt;nav&gt;</code> the menu flips to a vertical column. Each
			<code>&lt;li&gt;&lt;a&gt;</code> / <code>&lt;li&gt;&lt;button&gt;</code> becomes a full- width
			start-aligned row with quiet text, a subtle hover tint, and an
			<code>aria-current="page"</code> active state that paints
			<code>--color-primary-bg-subtle</code> + <code>--color-primary-text-emphasis</code> (same
			triplet the active tab and the in-flow alert variants use). Touch-action
			<code>pan-y</code> ships on every row to keep iOS Safari scroll-on-link working inside the
			popover-drawer rail.
		</p>
		<p>
			You're looking at this pattern live to the left — the showcase's primary navigation rail is a
			body-shell <code>&lt;nav&gt;</code> with <code>&lt;h6&gt;</code> +
			<code>&lt;menu&gt;</code> sibling pairs (see
			<a href="#/nav/nav-rail">NavPage § Body-shell rail</a> for the chrome contract).
		</p>
		<details>
			<summary><small>Markup — grouped nav-rail with active page</small></summary>
			<pre><code>&lt;nav aria-label="Primary"&gt;
  &lt;h6&gt;Components&lt;/h6&gt;
  &lt;menu&gt;
    &lt;li&gt;&lt;a href="#/article-card"&gt;Article card&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/aside"&gt;Aside&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/menu" aria-current="page"&gt;Menu&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#/nav"&gt;Nav&lt;/a&gt;&lt;/li&gt;
  &lt;/menu&gt;
&lt;/nav&gt;</code></pre>
		</details>
	</section>

	<section id="menu-toc">
		<h2>4. In-aside TOC menu — <code>body &gt; aside menu</code></h2>
		<p>
			Inside a body-shell <code>&lt;aside&gt;</code> the menu reads as a stacked column of in-page
			waypoints. Each row carries a 2 px transparent <code>border-inline-start</code> rule that
			flips to <code>--color-primary</code> on <code>aria-current="location"</code>. The text colour
			mutes to <code>--color-text-muted</code> by default; active and hover lift it to
			<code>--color-text</code> / <code>--color-primary-on-canvas</code>. The optional
			<code>[data-level="3"]</code> attribute on the <code>&lt;li&gt;</code> nudges h3-level entries
			inward so the visual hierarchy mirrors the heading hierarchy.
		</p>
		<p>
			You're looking at this pattern live to the right — the showcase's on-this-page rail uses it
			for the section list of every page (including this one). Per the WAI-ARIA APG, in-page anchors
			use <code>aria-current="location"</code> (not <code>page</code>) since they navigate within
			the same page.
		</p>
		<details>
			<summary><small>Markup — TOC menu with two levels + active section</small></summary>
			<pre><code>&lt;aside&gt;
  &lt;h6&gt;On this page&lt;/h6&gt;
  &lt;nav aria-label="Table of contents"&gt;
    &lt;menu&gt;
      &lt;li&gt;&lt;a href="#section-1" aria-current="location"&gt;Introduction&lt;/a&gt;&lt;/li&gt;
      &lt;li data-level="3"&gt;&lt;a href="#section-1-1"&gt;Subtopic A&lt;/a&gt;&lt;/li&gt;
      &lt;li data-level="3"&gt;&lt;a href="#section-1-2"&gt;Subtopic B&lt;/a&gt;&lt;/li&gt;
      &lt;li&gt;&lt;a href="#section-2"&gt;Next chapter&lt;/a&gt;&lt;/li&gt;
    &lt;/menu&gt;
  &lt;/nav&gt;
&lt;/aside&gt;</code></pre>
		</details>
		<p>
			<button
				type="button"
				class="subtle small"
				@click="activeSection = activeSection === 'introduction' ? 'next' : 'introduction'"
			>
				Toggle which row reads as active (live demo bound to the showcase TOC)
			</button>
			<small style="margin-inline-start: 0.5rem"
				>Currently active: <strong>{{ activeSection }}</strong></small
			>
		</p>
	</section>

	<section id="menu-dropdown">
		<h2>5. Dropdown menu — <code>&lt;menu popover&gt;</code></h2>
		<p>
			With the <code>popover</code> attribute, <code>&lt;menu&gt;</code> becomes a top-layer command
			panel triggered by a <code>&lt;button popovertarget&gt;</code>. The popover surface
			(<code>surfaces/_popover.scss</code>) paints the panel chrome (background, border, radius,
			shadow, entry transition); this partial re-orients the menu inside as a vertical column with
			pill-shaped items (Mailbox / Bootstrap dropdown parity, including
			<code>--bs-dropdown-padding-{x, y}: 0.375 rem</code>).
		</p>
		<p>
			Click outside or press <strong>Esc</strong> to dismiss — native popover API handles both.
			Selecting an item inside calls <code>.hidePopover()</code> on the menu so the panel closes
			immediately on choice. Behavioural composables (<code>useMenu</code>, arrow-key roving, Home /
			End, type-ahead filter) land in <code>composables/</code> later; the panel chrome below is the
			static foundation they build on.
		</p>
		<p>
			<strong>Caret affordance.</strong> Any <code>&lt;button popovertarget&gt;</code> automatically
			paints a <code>chevron-down</code> caret via <code>::after</code> — same
			<code>currentColor</code> mask-image recipe <code>&lt;summary&gt;</code>'s disclosure marker,
			<code>&lt;select&gt;</code>'s chevron, and the breadcrumb separator all use, sized to
			<code>0.75 em</code> with the button's own flex <code>gap</code> handling the spacing between
			label and caret. No Unicode glyph in the label, no <code>.dropdown-toggle</code> class.
			Override per-instance via <code>--set-button-popover-caret-image</code> for a custom glyph;
			suppress automatically by composing with <code>.icon-only</code> (which already hosts a single
			glyph).
		</p>
		<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center">
			<button type="button" popovertarget="demo-dropdown">Account</button>
			<small v-if="lastCommand"
				>Last picked: <strong>{{ lastCommand }}</strong></small
			>
		</div>
		<menu popover id="demo-dropdown">
			<li>
				<button type="button" @click="onCommand('Profile')">Profile</button>
			</li>
			<li>
				<button type="button" @click="onCommand('Workspace settings')">Workspace settings</button>
			</li>
			<li>
				<button type="button" @click="onCommand('Billing')">Billing</button>
			</li>
			<li>
				<button type="button" @click="onCommand('Sign out')">Sign out</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;button popovertarget="account-actions"&gt;Account&lt;/button&gt;
&lt;menu popover id="account-actions"&gt;
  &lt;li&gt;&lt;button&gt;Profile&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button&gt;Workspace settings&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button&gt;Billing&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button&gt;Sign out&lt;/button&gt;&lt;/li&gt;
&lt;/menu&gt;</code></pre>
		</details>

		<h3>Section headers + dividers + disabled items</h3>
		<p>
			Mailbox-parity composition: an optional <code>&lt;h6&gt;</code> labels a group of commands, an
			<code>&lt;hr&gt;</code> separates groups (edge-to-edge perimeter rule), and an
			<code>aria-disabled="true"</code> (or native <code>disabled</code>) row mutes its affordance +
			suppresses pointer activation. Same opacity multiplier the
			<code>&lt;button&gt;</code> baseline and pagination disabled state use — disabled controls
			read consistently across the framework.
		</p>
		<button type="button" popovertarget="demo-dropdown-full">Document</button>
		<menu popover id="demo-dropdown-full">
			<h6>Edit</h6>
			<li><button type="button" @click="onCommand('Cut')">Cut</button></li>
			<li><button type="button" @click="onCommand('Copy')">Copy</button></li>
			<li><button type="button" aria-disabled="true">Paste</button></li>
			<hr />
			<h6>History</h6>
			<li><button type="button" @click="onCommand('Undo')">Undo</button></li>
			<li><button type="button" aria-disabled="true">Redo</button></li>
			<hr />
			<li><button type="button" @click="onCommand('Delete')">Delete</button></li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;menu popover id="document-actions"&gt;
  &lt;h6&gt;Edit&lt;/h6&gt;
  &lt;li&gt;&lt;button&gt;Cut&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button&gt;Copy&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button aria-disabled="true"&gt;Paste&lt;/button&gt;&lt;/li&gt;
  &lt;hr /&gt;
  &lt;h6&gt;History&lt;/h6&gt;
  &lt;li&gt;&lt;button&gt;Undo&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button aria-disabled="true"&gt;Redo&lt;/button&gt;&lt;/li&gt;
&lt;/menu&gt;</code></pre>
		</details>

		<h3>Placement modifiers</h3>
		<p>
			Dropdowns share the popover surface's placement system. <code>.start</code> /
			<code>.end</code> / <code>.top</code> / <code>.bottom</code> on the
			<code>&lt;menu popover&gt;</code> root pin the panel to the matching edge of the trigger
			button. Useful when the trigger sits in a corner where the default
			<code>block-end</code> placement would clip against the viewport.
		</p>
		<div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
			<button type="button" popovertarget="demo-dd-start">Open from start</button>
			<button type="button" popovertarget="demo-dd-end">Open from end</button>
			<button type="button" popovertarget="demo-dd-top">Open above</button>
		</div>
		<menu popover id="demo-dd-start" class="start">
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
		</menu>
		<menu popover id="demo-dd-end" class="end">
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
		</menu>
		<menu popover id="demo-dd-top" class="top">
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
		</menu>

		<h3>Wrapped dropdown — <code>&lt;div popover&gt;&lt;menu&gt;</code></h3>
		<p>
			Some consumers want a custom popover panel that hosts a <code>&lt;menu&gt;</code> alongside
			other content (a header, a search field, a footer). The same dropdown chrome reaches the inner
			<code>&lt;menu&gt;</code> via the <code>[popover]:not(aside):not(nav) menu</code> selector —
			the <code>:not(aside):not(nav)</code> clause excludes the framework's offcanvas drawer
			surfaces (where descendant menus should render with nav-rail chrome, not dropdown chrome — the
			regression-guarded behavior captured during the iOS scroll-on-link audit).
		</p>
		<button type="button" popovertarget="demo-wrapped">Open wrapped panel</button>
		<div popover id="demo-wrapped" style="min-inline-size: 16rem">
			<header
				style="
					padding-block-end: 0.5rem;
					border-block-end: 1px solid var(--color-border);
					margin-block-end: 0.5rem;
				"
			>
				<strong>Filter</strong>
			</header>
			<menu>
				<li><button type="button">Recent</button></li>
				<li><button type="button">Starred</button></li>
				<li><button type="button">Archived</button></li>
			</menu>
		</div>
	</section>

	<section id="menu-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Menu row hover / focus transitions (background-color, color) route through the framework's
			<code>@include transition()</code> mixin, which collapses to instant under
			<code>prefers-reduced-motion: reduce</code>. Toggle the OS preference and verify hover swaps
			without a fade on the nav-rail rows in the left sidebar.
		</p>
	</section>

	<section id="menu-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (or any <code>forced-colors: active</code> environment), nav-row
			active state (<code>aria-current="page"</code>) falls back to <code>Highlight</code> /
			<code>HighlightText</code> via the framework's variant tokens. TOC leading rule paints with
			<code>currentColor</code> — also survives HC mode.
		</p>
	</section>

	<section id="menu-tokens">
		<h2>Tokens</h2>
		<p>
			Every value below flows through a <code>--set-menu-*</code> custom property declared on bare
			<code>&lt;menu&gt;</code>. Override at <code>:root</code> for global retune, per- instance via
			inline <code>style</code>, or via a parent context selector.
		</p>
		<dl>
			<dt><code>--set-menu-color</code></dt>
			<dd>Text colour of the menu and its descendants. Defaults to <code>currentColor</code>.</dd>
			<dt><code>--set-menu-background-color</code></dt>
			<dd>Surface colour behind the menu row. Defaults to <code>transparent</code>.</dd>
			<dt><code>--set-menu-gap</code></dt>
			<dd>
				Spacing between menu items. Defaults to <code>calc(var(--spacing) * 2)</code> (0.5 rem in
				the default theme).
			</dd>
			<dt><code>--set-menu-padding-inline</code> / <code>--set-menu-padding-block</code></dt>
			<dd>
				Inner padding of the menu container. Defaults to <code>0</code> on bare
				<code>&lt;menu&gt;</code>; populated for popover dropdowns by the popover surface.
			</dd>
			<dt><code>--set-menu-justify-content</code></dt>
			<dd>
				Flex justification of menu children. Defaults to <code>flex-start</code> on bare
				<code>&lt;menu&gt;</code>; flips to <code>flex-end</code> inside an
				<code>&lt;article&gt;</code> for the card-action-row convention.
			</dd>
			<dt><code>--set-menu-transition-duration</code></dt>
			<dd>
				Duration of color + background transitions inside the menu. Defaults to
				<code>--set-transition-duration</code> (150 ms in the default theme).
			</dd>
		</dl>
	</section>
</template>
