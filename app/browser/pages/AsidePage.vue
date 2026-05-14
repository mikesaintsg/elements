<script lang="ts" setup>
/**
 * AsidePage — the canonical reference for `<aside>` across the
 * contexts the framework paints. `<aside>` is W3C-defined as
 * "content tangentially related to the main flow"; context decides
 * the chrome.
 *
 *   1. body > aside (or body > * > aside) — page-level sidebar
 *      rail. Persistent column alongside `<main>`. Borders on the
 *      inner edge, scoped padding, fixed inline-size, vertical
 *      scroll. The showcase's right-hand TOC rail IS this — readers
 *      can see the chrome live on this very page.
 *   2. article aside — inline pull-quote / callout inside a card.
 *      Leading bar (in variant color) + italic body + indent.
 *      Tangential to the card's main flow.
 *   3. aside[role="alert"] / [role="status"] — IN-FLOW BANNER.
 *      Lives in the document flow, shifts content below it, and
 *      announces via the role's implicit `aria-live`. Variant
 *      tinting (bg-subtle + saturated leading bar + subtle
 *      perimeter). Open / closed lifecycle via `data-alert-open`
 *      attribute (toggled by `useAlert`).
 *   4. aside[popover] — TOP-LAYER PANEL. Generic tangential-info
 *      popover triggered by a button (`popovertarget`). When
 *      `useAside` attaches, the same `<aside popover>` becomes the
 *      framework's off-canvas drawer (composables/_aside.scss
 *      repaints the geometry). Chrome from `surfaces/_popover.scss`.
 *
 * What `<aside>` is NOT — the disambiguation that motivates this
 * page's section ordering:
 *
 *   • Toast notifications are NOT `<aside>`. Toasts use `<output
 *     popover>` (top-layer, transient, corner-anchored, polite
 *     `role="status"` announce). See `components/_output.scss`.
 *   • Modals are NOT `<aside>`. Modals use `<dialog>` with
 *     `.showModal()` (top-layer + backdrop + focus trap).
 *   • Tooltips are NOT `<aside>`. Tooltips use `[popover="hint"]`
 *     or `[role="tooltip"]` (small label-style hover panels).
 *
 * Layer mental model — the bright line behind the section ordering:
 *
 *   IN-FLOW (shifts surrounding UI):
 *     - body > aside (sidebar rail) — section 1
 *     - article aside (callout) — section 2
 *     - aside[role="alert"] / [role="status"] (banner) — section 3
 *
 *   TOP-LAYER (overlays surrounding UI):
 *     - aside[popover] (panel + drawer) — section 5
 *     - output[popover] (toast) — see OutputPage
 *     - dialog (modal) — see DialogPage
 *
 * Cross-references:
 *   - `useAlert` composable drives the in-flow open / close
 *     animation; chrome gates on `[data-alert-open]`.
 *   - `useAside` composable upgrades `<aside popover>` to a drawer
 *     by setting `[data-aside-open]`; composables/_aside.scss
 *     supplies the slide-from-edge geometry.
 *   - `<output role="alert">` is the inline form-validation peer —
 *     same live-region politeness, different layout (tied to an
 *     `<input>` via `aria-describedby`).
 */
import { ref } from 'vue'

const variants = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

// Dismissable alert demo state — each alert renders a dismiss button
// that toggles `data-alert-open` on its own root. In production this
// pairs with `useAlert`; here we wire it inline so the page is pure
// CSS / minimal-Vue without a composable instance.
const dismissed = ref<Set<string>>(new Set())
const dismiss = (id: string): void => {
	dismissed.value = new Set([...dismissed.value, id])
}
const restore = (): void => {
	dismissed.value = new Set()
}
</script>

<template>
	<section id="aside-intro">
		<hgroup>
			<h1>Aside</h1>
			<p>
				<code>&lt;aside&gt;</code> is the W3C-defined "tangentially-related content" element.
				Context picks the chrome — sidebar rail, article callout, in-flow alert banner, or top-layer
				popover panel. One element, four shapes, disambiguated by ancestry + role + attributes
				(never by a class).
			</p>
		</hgroup>
		<p>
			You're looking at one of these right now — the right-hand TOC rail on this page is a
			<code>&lt;body&gt; &gt; &lt;aside&gt;</code>. Sections below cover the other three.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Mental model.</strong> Sections 1–3 are <strong>in-flow</strong> shapes that shift
				the surrounding UI. Section 5 is a <strong>top-layer</strong> overlay that does NOT shift
				content. Toast notifications (top-layer, transient, auto-dismiss) and modals (top-layer,
				focus-trapped) are not <code>&lt;aside&gt;</code> — they belong on
				<code>&lt;output popover&gt;</code> and <code>&lt;dialog&gt;</code> respectively.
			</p>
		</aside>
	</section>

	<section id="aside-sidebar-context">
		<h2>1. Body-shell sidebar — <code>&lt;body&gt; &gt; &lt;aside&gt;</code></h2>
		<p>
			The showcase's right rail. Selected via <code>body:has(main) &gt; aside</code> (plus the
			<code>&gt; *&gt;</code> once-removed variant for framework mount points) so
			<code>&lt;aside&gt;</code> outside the shell isn't auto-styled. Fixed
			<code>--set-aside-inline-size</code>, scoped <code>--set-aside-padding-*</code>,
			<code>overflow-y: auto</code>, flex-column with <code>--set-aside-gap</code> between children.
			Border on the inline-start edge (the rail sits trailing the main content);
			<code>.start</code> flips the border for asides on the leading side.
		</p>
		<p>
			Under 960px the rail collapses to an off-canvas drawer driven by
			<code>[data-open]</code>. The chrome stays the same — only the positioning context flips
			between persistent grid item and fixed drawer. See
			<a href="#/sectioning">SectioningPage § Aside</a> for the body-grid layout discussion.
		</p>
	</section>

	<section id="aside-article-callout">
		<h2>2. Article callout — <code>&lt;article&gt; &lt;aside&gt;</code></h2>
		<p>
			An <code>&lt;aside&gt;</code> inside an <code>&lt;article&gt;</code> reads as a pull-quote /
			sidenote / inline note. Italic body, leading bar in the variant color
			(<code>--set-callout-bar-color</code>), modest <code>padding-inline-start</code>. No tinted
			background — the callout is a flow element inside the card, not a separate tier. Same semantic
			as a blockquote sidenote but tied to <em>tangentially related</em> content rather than
			<em>quoting from another source</em>.
		</p>
		<article>
			<h3>The Aurora 1.2 release</h3>
			<p>
				Aurora 1.2 ships at the end of the month. The migration guide is in the docs and covers
				every breaking change with a one-step automated rewrite. If you're on 1.1.x and using the
				legacy webhook signature, read the API council notes before upgrading — the new signature
				requires a config flip on your end too.
			</p>
			<aside>
				<strong>By the way:</strong> the new SDK ships TypeScript types directly, no
				<code>@types/aurora</code> companion package needed anymore. Drop it from your devDeps.
			</aside>
			<p>
				The deprecated <code>v1/webhooks</code> endpoint is removed in 1.3; the migration is one
				line in your handler signature. Telemetry shows ~14% of consumers still on the legacy
				endpoint, so we're keeping the dual-route shim through 1.4.
			</p>
		</article>

		<h3>Variant cascade on the leading bar</h3>
		<p>
			Adding a variant class to the callout tints its leading bar via the
			<code>--set-variant-background-color</code> cascade.
		</p>
		<article>
			<h4>Variant callouts</h4>
			<aside v-for="v in variants" :key="v" :class="v">
				<strong>{{ v.charAt(0).toUpperCase() + v.slice(1) }} callout.</strong> Leading bar picks up
				the variant's identity color via <code>--set-variant-background-color</code>.
			</aside>
		</article>
	</section>

	<section id="aside-alert">
		<h2>3. Alert banner — <code>&lt;aside role="alert"&gt;</code></h2>
		<p>
			<code>role="alert"</code> turns an aside into an assertive live region — screen readers
			announce it immediately when it appears. The chrome is a flex-row banner: leading content
			grows to fill, optional trailing dismiss <code>&lt;button&gt;</code> sits at the inline-end.
			Variant cascade tints the bg + leading bar + perimeter via the shared
			<code>--color-{variant}-{bg-subtle, text-emphasis, border-subtle}</code> triplet.
		</p>
		<p>
			The dismiss button's chrome auto-resets the variant context (<code>--set-variant-*</code>)
			locally so the close affordance paints as a transparent ghost regardless of the alert's
			variant class — without this reset, a <code>.warning</code> alert would propagate
			<code>--set-variant-background-color: amber</code> to the button, and the button would paint
			filled-amber against the tinted bg.
		</p>

		<div style="display: flex; flex-direction: column; gap: 0.75rem">
			<aside role="alert" data-alert-open>
				<div>
					<strong>Default alert.</strong> Neutral leading bar, no tinted bg. Use for generic notices
					that don't need the saturated identity of a variant.
				</div>
				<button type="button" aria-label="Dismiss">×</button>
			</aside>

			<aside
				v-for="v in variants"
				:key="v"
				role="alert"
				:class="v"
				:data-alert-open="dismissed.has(v) ? undefined : ''"
			>
				<div>
					<strong>{{ v.charAt(0).toUpperCase() + v.slice(1) }} alert.</strong>
					Variant-tinted background + saturated leading bar + subtle perimeter. Tap the × to
					dismiss; the alert animates closed via
					<code>interpolate-size: allow-keywords</code>.
				</div>
				<button type="button" aria-label="Dismiss" @click="dismiss(v)">×</button>
			</aside>

			<p v-if="dismissed.size > 0">
				<button type="button" class="subtle small" @click="restore">
					Restore dismissed alerts
				</button>
			</p>
		</div>

		<h3>With <code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> slots</h3>
		<p>
			A direct-child <code>&lt;header&gt;</code> (first) or <code>&lt;footer&gt;</code> (last)
			switches the alert from the simple banner row to a flex-column stack with banded chrome — same
			auto-banding pattern <code>&lt;article&gt;</code> and <code>&lt;dialog&gt;</code> use. The
			band tint adapts to the variant via <code>color-mix(currentColor 8%, transparent)</code>, so
			success alerts get a slightly more saturated green band, neutral alerts get a subtle slate
			band, etc.
		</p>
		<div style="display: flex; flex-direction: column; gap: 1rem">
			<aside role="alert" class="information" data-alert-open>
				<header>
					<strong>Scheduled maintenance</strong>
					<button type="button" aria-label="Dismiss">×</button>
				</header>
				<p style="margin-block: 0">
					Database maintenance tonight 02:00–04:00 UTC. The app will be read-only during that
					window. Reports and exports will queue and run after the window closes.
				</p>
				<footer>
					<a href="#aside-alert" style="margin-inline-end: auto">View status page →</a>
					<button type="button" class="subtle small">Snooze 1h</button>
					<button type="button" class="primary small">Acknowledge</button>
				</footer>
			</aside>

			<aside role="alert" class="danger" data-alert-open>
				<header>
					<strong>Payment failed</strong>
					<button type="button" aria-label="Dismiss">×</button>
				</header>
				<p style="margin-block: 0">
					Your subscription couldn't be renewed because the card on file was declined. Update the
					billing method to restore access. You have 7 days before the account is suspended.
				</p>
				<footer>
					<button type="button" class="subtle small" style="margin-inline-end: auto">
						Contact support
					</button>
					<button type="button" class="danger small">Update card</button>
				</footer>
			</aside>

			<aside role="alert" class="success" data-alert-open>
				<header>
					<strong>Build passed</strong>
					<button type="button" aria-label="Dismiss">×</button>
				</header>
				<p style="margin-block: 0">
					All 1,420 tests passing on <code>main</code>. The deploy will start in 60 seconds unless
					cancelled.
				</p>
			</aside>
		</div>

		<h3>Width behavior</h3>
		<p>
			Alerts span the full inline width of their parent's content area by default — they read as
			in-flow <strong>banners</strong>, sitting between siblings and announcing across the region.
			<code>--set-alert-max-inline-size</code> defaults to <code>none</code>; consumers who want a
			reading-width cap on a specific banner opt in per-instance (<code
				>style="--set-alert-max-inline-size: 32rem"</code
			>) or globally at <code>:root</code>. Mobile gutter comes from the parent (typically
			<code>&lt;main&gt;</code>'s fluid <code>--set-main-padding-inline</code>) — same idiom as
			every other in-flow element.
		</p>
		<p>
			The banner ALSO supports card-like composition when richer alert content is needed: a
			direct-child <code>&lt;header&gt;</code> + / or <code>&lt;footer&gt;</code> band switches the
			alert into a flex-column stack with tinted band-bg + divider on each band. Same composition
			pattern <code>&lt;article&gt;</code> and <code>&lt;dialog&gt;</code> use for their header /
			footer bands. See § "Alert with header + footer bands" below for the worked example.
		</p>
		<p>
			<strong>Alert is NOT a toast.</strong> If the intent is a top-layer transient notification
			(corner-anchored, auto-dismissing, deck-stacking), reach for
			<code>&lt;output popover&gt;</code> instead — see
			<a href="#/popover-surfaces">PopoverSurfacesPage</a>. Alert is in-flow banner chrome
			(announces as part of the UI); toast is overlay chrome (briefly visible, dismissed quickly).
		</p>
	</section>

	<section id="aside-alert-flat-flush">
		<h2>3a. Alert · <code>.flat</code> and <code>.flush</code></h2>
		<p>
			Two surface-dissolution modifiers for alerts inset into another framework surface (card body,
			sidebar rail, list-group row). <code>.flat</code> dissolves the alert's chrome at rest and
			restores it on hover — useful for low-emphasis inline notes that brighten only when the user
			engages. <code>.flush</code> drops the outer border + radius + top/bottom borders entirely
			(leading 4-px bar preserved because it's the variant identity signal), letting the alert sit
			flush against the host's edges as a divider band.
		</p>
		<h3>Flat — chrome on hover</h3>
		<p>
			Variant cascade still flows through: a <code>.success.flat</code> alert reveals success-tinted
			bar + bg-subtle backdrop on hover; rest state reads as plain inline copy.
		</p>
		<div class="stack" style="--set-stack-spacing: 0.5rem">
			<aside role="alert" class="flat" data-alert-open>
				<div>Neutral flat alert — hover to reveal the bar + backdrop.</div>
			</aside>
			<aside role="alert" class="information flat" data-alert-open>
				<div><strong>Heads up.</strong> Information-flat reveals on hover.</div>
			</aside>
			<aside role="alert" class="success flat" data-alert-open>
				<div>
					<strong>Looking good.</strong> Success-flat — quiet at rest, success-tinted on hover.
				</div>
			</aside>
			<aside role="alert" class="warning flat" data-alert-open>
				<div><strong>Caution.</strong> Warning-flat — amber bar reveals on hover.</div>
			</aside>
			<aside role="alert" class="danger flat" data-alert-open>
				<div><strong>Trouble.</strong> Danger-flat — red bar reveals on hover.</div>
			</aside>
		</div>
		<h3>Flush — divider band inset into a card</h3>
		<p>
			The alert lives inside an <code>&lt;article&gt;</code>; <code>.flush</code> drops the outer
			perimeter so the alert sits between siblings as a separator with the variant's leading bar.
		</p>
		<article
			style="
				--set-article-padding-inline: 0;
				--set-article-padding-block: 0;
				--set-article-gap: 0;
				overflow: clip;
			"
		>
			<header style="padding-inline: 1rem; padding-block: 0.75rem">
				<h3 style="margin: 0">Deployment status</h3>
			</header>
			<aside role="alert" class="success flush" data-alert-open>
				<div><strong>All tests passed.</strong> 1,420 / 1,420 on <code>main</code>.</div>
			</aside>
			<aside role="alert" class="warning flush" data-alert-open>
				<div><strong>1 deprecation warning.</strong> See build log for details.</div>
			</aside>
			<aside role="alert" class="information flush" data-alert-open>
				<div>Deploy starts in 60 seconds unless cancelled.</div>
			</aside>
			<footer style="padding-inline: 1rem; padding-block: 0.75rem">
				<small>Last updated 12 seconds ago.</small>
			</footer>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;aside role="alert" class="success flat"&gt;…&lt;/aside&gt;

&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;aside role="alert" class="success flush"&gt;…&lt;/aside&gt;
  &lt;aside role="alert" class="warning flush"&gt;…&lt;/aside&gt;
  &lt;footer&gt;…&lt;/footer&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="aside-status">
		<h2>4. Status banner — <code>&lt;aside role="status"&gt;</code></h2>
		<p>
			Same chrome, different live-region politeness — <code>role="status"</code> is a polite live
			region (screen readers announce when the user is idle, not interrupting current work). Use for
			non-urgent state updates: "Saved", "Connected", "Sync in progress".
		</p>
		<aside role="status" class="success" data-alert-open>
			<div><strong>Saved.</strong> All changes synced 12 seconds ago.</div>
		</aside>
		<aside role="status" class="information" data-alert-open style="margin-block-start: 0.75rem">
			<div><strong>Sync in progress.</strong> Uploading 4 of 12 files…</div>
		</aside>
	</section>

	<section id="aside-popover">
		<h2>5. Drawer / offcanvas — <code>&lt;aside popover&gt;</code></h2>
		<p>
			The <code>[popover]</code> attribute lifts the aside into the browser's
			<strong>top layer</strong> as a slide-in drawer (Bootstrap offcanvas parity). The drawer
			floats above the page — it does NOT shift the document below. A button with
			<code>popovertarget="…"</code> opens it; a second button inside with
			<code>popovertargetaction="hide"</code> closes it. No JS required.
		</p>
		<p>
			<strong>Placement modifiers</strong> pick which edge the drawer slides in from:
			<code>.start</code> (leading edge, full height), <code>.end</code> (trailing edge, full height
			— the default), <code>.top</code> (block-start, 30dvh tall), <code>.bottom</code>
			(block-end, 30dvh tall). The directional slide animation matches the placement — left edge
			slides from the left, top edge slides down from above, etc.
		</p>
		<p>
			<strong>Variants</strong> retint the drawer through <code>--set-popover-*</code> tokens (<code
				>bg-subtle</code
			>
			body, <code>border-subtle</code> perimeter, <code>text-emphasis</code> text). Any placement
			composes with any variant.
		</p>
		<p><strong>Not an alert, not a toast.</strong> Drawers are top-layer overlays:</p>
		<ul>
			<li>
				<strong>In-flow alerts</strong> (section 3) use <code>&lt;aside role="alert"&gt;</code> —
				sit in document flow, shift content below, announce via <code>aria-live="assertive"</code>.
			</li>
			<li>
				<strong>Top-layer toasts</strong> use <code>&lt;output popover&gt;</code> — transient
				corner-anchored notifications with auto-dismiss. See OutputPage.
			</li>
			<li>
				<strong>Modals</strong> use <code>&lt;dialog&gt;</code> opened with
				<code>.showModal()</code>
				— focus-trapped, with a backdrop. See DialogElementPage.
			</li>
		</ul>

		<h3>Placement modifiers</h3>
		<p>Click each button to open the drawer from the matching edge.</p>
		<div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
			<button type="button" popovertarget="aside-drawer-start">Slide from start</button>
			<button type="button" popovertarget="aside-drawer-end">Slide from end (default)</button>
			<button type="button" popovertarget="aside-drawer-top">Slide from top</button>
			<button type="button" popovertarget="aside-drawer-bottom">Slide from bottom</button>
		</div>

		<aside id="aside-drawer-start" popover class="start">
			<header>
				<strong>Start drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-start"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Slides in from the inline-start edge (left in LTR, right in RTL). Full block-height. Ideal
				for primary navigation, filter panels, or workspace switchers.
			</p>
		</aside>

		<aside id="aside-drawer-end" popover class="end">
			<header>
				<strong>End drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-end"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Slides in from the inline-end edge (right in LTR). Full block-height. The default placement
				— ideal for inspectors, settings panels, and detail views that supplement the main content.
			</p>
		</aside>

		<aside id="aside-drawer-top" popover class="top">
			<header>
				<strong>Top drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-top"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Slides down from the block-start edge. 30dvh tall by default. Useful for command palettes,
				quick search, or page-level notifications that need more room than a toast.
			</p>
		</aside>

		<aside id="aside-drawer-bottom" popover class="bottom">
			<header>
				<strong>Bottom drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-bottom"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Slides up from the block-end edge. 30dvh tall by default. Common on mobile for action
				sheets, share menus, or contextual pickers (mirrors iOS / Material bottom sheets).
			</p>
		</aside>

		<h3>Variant cascade</h3>
		<p>
			Any placement composes with any variant. The drawer's body, border, and text all retint
			through the popover surface tokens. Trigger buttons below open primary / success / warning /
			danger drawers, each on the end edge.
		</p>
		<div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
			<button type="button" popovertarget="aside-drawer-primary" class="primary">Primary</button>
			<button type="button" popovertarget="aside-drawer-success" class="success">Success</button>
			<button type="button" popovertarget="aside-drawer-warning" class="warning">Warning</button>
			<button type="button" popovertarget="aside-drawer-danger" class="danger">Danger</button>
		</div>

		<aside id="aside-drawer-primary" popover class="end primary">
			<header>
				<strong>Primary drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-primary"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Tinted through the popover surface's <code>--set-popover-*</code> token triplet (<code
					>bg-subtle</code
				>
				/ <code>border-subtle</code> / <code>text-emphasis</code>) — same triplet the in-flow
				primary alert uses, but lifted into the top layer.
			</p>
		</aside>

		<aside id="aside-drawer-success" popover class="end success">
			<header>
				<strong>Success drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-success"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Success variant — green-tinted body, emphasis-colored text. The panel doesn't announce
				itself like a status banner does (no implicit live region); user-triggered, user-dismissed.
			</p>
		</aside>

		<aside id="aside-drawer-warning" popover class="end warning">
			<header>
				<strong>Warning drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-warning"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Warning variant — amber-tinted. Suitable for "are you sure?" confirmation drawers where the
				user needs to acknowledge a state change without leaving the current view.
			</p>
		</aside>

		<aside id="aside-drawer-danger" popover class="end danger">
			<header>
				<strong>Danger drawer</strong>
				<button
					type="button"
					class="subtle icon-only"
					popovertarget="aside-drawer-danger"
					popovertargetaction="hide"
					aria-label="Close"
				>
					×
				</button>
			</header>
			<p>
				Danger variant — red-tinted. For genuinely destructive actions prefer a
				<code>&lt;dialog&gt;</code> (modal, focus-trapped, screen-reader announces as a modal); the
				drawer is fine for less-final destructive flows like "remove from list" or "archive".
			</p>
		</aside>
	</section>

	<section id="aside-forced-colors">
		<h2>Forced-colors fallback</h2>
		<p>
			In Windows High Contrast mode (and any
			<code>forced-colors: active</code> environment), the alert banner drops its variant tints — HC
			mode forces backgrounds to <code>Canvas</code> anyway — and falls back to a single perimeter
			border + leading bar painted with <code>CanvasText</code> so the banner's shape survives:
		</p>
		<pre><code>aside[role="alert"] {
  @include forced-colors {
    background-color: Canvas;
    color: CanvasText;
    border-color: CanvasText;
    border-inline-start-color: CanvasText;
  }
}</code></pre>
		<p>
			Variant signal is carried by the leading bar's PRESENCE (not its color, which gets forced
			anyway) plus the alert's accompanying strong / icon / status text. Per WCAG 1.4.1 (Use of
			Color), the meaning must survive without color — pair every variant alert with a strong-text
			status word and the meaning carries through HC mode without any extra work.
		</p>
	</section>

	<section id="aside-best-practices">
		<h2>Best practices</h2>
		<ul>
			<li>
				<strong>One <code>&lt;aside&gt;</code>, three semantic intents.</strong> Body sidebar =
				persistent supplementary column. Article callout = pull-quote / sidenote inside flow
				content. Alert / status = live-region banner. Match the role to the intent — don't put a
				callout inside the body shell or vice versa.
			</li>
			<li>
				Pair alert variants with a strong-text status word so the meaning survives color-blind and
				forced-colors readers (WCAG 1.4.1). "Danger" alone is decoration; "<strong
					>Payment failed.</strong
				>" carries the signal in text.
			</li>
			<li>
				<code>role="alert"</code> is assertive — screen readers interrupt to announce it. Reserve
				for urgent, time-sensitive notices. For routine state updates ("Saved", "Synced") use
				<code>role="status"</code> (polite).
			</li>
			<li>
				The dismiss button SHOULD have <code>aria-label="Dismiss"</code> (or similar) — the ×
				character alone reads as "multiplication sign" to most screen readers. The framework's
				variant-context reset on <code>aside[role="alert"] &gt; button:last-child</code>
				assumes the button is the only direct-child button; if your alert has multiple buttons, the
				rule still applies to the LAST one (typical dismiss-trailing convention).
			</li>
			<li>
				For inline form-validation messages tied to an input, prefer
				<code>&lt;output role="alert"&gt;</code> — it pairs with <code>aria-describedby</code> on
				the input and inherits the form's spacing rhythm. Reserve
				<code>&lt;aside role="alert"&gt;</code> for page-level or section-level notices.
			</li>
		</ul>
	</section>
</template>
