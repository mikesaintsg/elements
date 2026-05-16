<script lang="ts" setup>
/**
 * PopoverSurfacesPage — the canonical reference for the framework's
 * top-layer popover surface family.
 *
 * `[popover]` is the HTML attribute (Chrome 114+, Edge 114+, Safari
 * 17+, Firefox 125+) that promotes an element into the top layer
 * when shown. The framework paints THREE shapes from one surface
 * partial (`surfaces/_popover.scss`):
 *
 *   - `[popover]` (or `[popover=auto]`) — a generic top-layer
 *     panel. Light-dismissable (Esc + click-outside) by default.
 *     Becomes a dropdown when paired with a `<button popovertarget>`
 *     via the auto-anchor relationship the browser sets up.
 *   - `[popover=manual]` — same chrome, manual lifecycle. Won't
 *     dismiss on Esc / click-outside; consumer calls `.hidePopover()`
 *     explicitly. Used by toasts (`<output popover="manual">`),
 *     wizard panels, sticky filters that must stay open.
 *   - `[popover=hint]` / `[role="tooltip"]` — inverted, smaller,
 *     tighter padding. Reads as a transient label distinct from a
 *     full panel. Light-dismissable but hierarchically nested
 *     under any open auto popover (so a tooltip inside an open
 *     menu doesn't kill the menu).
 *
 * Placement comes from `surfaces/_anchor-position.scss` — the
 * browser auto-anchors a popover to its `popovertarget` trigger;
 * placement modifiers (`.top` / `.bottom` / `.start` / `.end` +
 * corners) map to `position-area` keywords; `position-try-fallbacks`
 * flips the popover when the requested side doesn't fit the
 * `max-block-size` cap.
 *
 * Backdrop scrim comes from `surfaces/_backdrop.scss` — `dialog:modal`
 * and `:is(aside, nav)[popover]` get the dim+blur scrim; all other
 * popovers keep the UA-default transparent backdrop.
 *
 * API surface coverage:
 *   1. `[popover=auto]` — generic top-layer panel + light-dismiss.
 *   2. `[popover=manual]` — explicit hide lifecycle.
 *   3. `[popover=hint]` / `[role="tooltip"]` — inverted label panel.
 *   4. `<button popovertarget>` — auto-anchor relationship.
 *   5. Placement modifiers — block-end default + `.top` / `.bottom` /
 *      `.start` / `.end` / corners.
 *   6. `position-try-fallbacks` — flip behavior when content
 *      doesn't fit on the requested side.
 *   7. Viewport-clamp on narrow screens via
 *      `--set-popover-viewport-inset`.
 *   8. `::backdrop` scrim — only on blocking surfaces (modal
 *      `<dialog>`, offcanvas `<aside popover>` / `<nav popover>`).
 *   9. Token surface — `--set-popover-*`, `--set-popover-hint-*`,
 *      `--set-anchor-*`.
 *
 * Cross-references:
 *   - [AsidePage § Drawer / offcanvas](#/aside) — the canonical
 *     `<aside popover>` drawer demos sharing the backdrop scrim.
 *   - [DialogElementPage](#/dialog-element) — modal `<dialog>`
 *     also uses the backdrop scrim.
 *   - [MenuPage § Dropdown](#/menu) — `<menu popover>` as the
 *     canonical dropdown panel composing this surface.
 */
import { ref } from 'vue'

// Manual popover demo — `popovertarget` opens the panel (the framework's
// implicit auto-anchor wires position from the trigger), then we
// schedule a programmatic `.hidePopover()` since `popover="manual"`
// disables light-dismiss. Using `popovertarget` instead of a bare
// `.showPopover()` call is what gives the panel its placement; without
// it the browser has no anchor relationship and the popover renders at
// viewport-top-left.
const scheduleManualHide = (id: string, ms = 3000): void => {
	setTimeout(() => {
		const el = document.getElementById(id)
		if (!el || !el.matches(':popover-open')) return
		try {
			el.hidePopover()
		} catch {
			// already closed
		}
	}, ms)
}

// Long-content demo for the viewport-clamp section.
const longContent = ref(false)
</script>

<template>
	<section id="popover-surfaces-intro">
		<hgroup>
			<h1>Popover surfaces</h1>
			<p>
				The browser's <code>[popover]</code> attribute promotes an element into the top layer when
				shown. The framework paints three shapes from one surface partial — generic panel,
				manual-lifecycle panel, and tooltip — and a separate anchor-position partial wires the
				auto-anchor relationship that makes a <code>&lt;button popovertarget&gt;</code> into a
				dropdown without a single line of JavaScript.
			</p>
		</hgroup>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Browser support.</strong> Chrome 114+, Edge 114+, Safari 17+, Firefox 125+. Anchor
				positioning (<code>position-area</code> / <code>position-try-fallbacks</code>) is Chromium
				125+ as of this writing; Safari + Firefox shipping through 2025–2026. Non-supporting
				browsers fall back to whatever positioning the consumer applies directly.
			</p>
		</aside>
	</section>

	<section id="popover-surfaces-auto">
		<h2>1. <code>[popover]</code> / <code>[popover=auto]</code> — generic top-layer panel</h2>
		<p>
			Default. Paint chrome from <code>--set-popover-*</code>: surface color, border, radius,
			shadow, padding. The browser handles the open / close lifecycle — Esc dismisses, click-outside
			dismisses, programmatic <code>.hidePopover()</code> dismisses. A
			<code>&lt;button popovertarget="id"&gt;</code> opens the popover by id; the framework's
			auto-anchor surface positions it below the button.
		</p>
		<div class="cluster gap-2">
			<button type="button" class="dropdown" popovertarget="demo-pop-auto">
				Open auto popover
			</button>
		</div>
		<div popover id="demo-pop-auto" class="min-w-64">
			<h6 class="mt-0 mb-2">Auto popover</h6>
			<p>
				Click outside or press <strong>Esc</strong> to dismiss — no JS required, the browser handles
				both. The framework supplies the chrome: surface colour, border, radius, shadow, scale-in
				transition.
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;button popovertarget="my-panel"&gt;Open&lt;/button&gt;
&lt;div popover id="my-panel"&gt;
  &lt;h6&gt;Title&lt;/h6&gt;
  &lt;p&gt;Body content. Esc / click-outside dismisses.&lt;/p&gt;
&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="popover-surfaces-manual">
		<h2>2. <code>[popover=manual]</code> — explicit hide lifecycle</h2>
		<p>
			Same visual chrome, different lifecycle. <strong>No light-dismiss</strong>: pressing Esc or
			clicking outside doesn't close the panel — consumer code calls
			<code>.hidePopover()</code> explicitly. Used by toasts (<code
				>&lt;output popover="manual"&gt;</code
			>
			the framework wraps these in <code>useToast</code> with auto-hide), wizard panels that must
			stay open until the user picks a path, sticky filters that shouldn't dismiss when the user
			taps the surrounding canvas.
		</p>
		<div class="cluster gap-2">
			<button
				type="button"
				class="dropdown"
				popovertarget="demo-pop-manual"
				@click="scheduleManualHide('demo-pop-manual', 3000)"
			>
				Show manual popover (auto-hides in 3 s)
			</button>
		</div>
		<div popover="manual" id="demo-pop-manual" class="min-w-72">
			<h6 class="mt-0 mb-2">Manual lifecycle</h6>
			<p>
				Esc and click-outside <em>do not</em> dismiss this popover. A scheduled timeout calls
				<code>.hidePopover()</code> in 3 s; in production <code>useToast</code> /
				<code>useDialog</code> own this lifecycle.
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;!-- popovertarget gives the browser the implicit auto-anchor so the
     panel positions relative to its trigger. A bare `.showPopover()`
     call would open the panel but render it at viewport top-left
     because no anchor relationship exists. --&gt;
&lt;button popovertarget="panel" onclick="scheduleHide('panel', 3000)"&gt;
  Open
&lt;/button&gt;
&lt;div popover="manual" id="panel"&gt;
  &lt;p&gt;Stays open until .hidePopover() is called.&lt;/p&gt;
&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="popover-surfaces-hint">
		<h2>3. <code>[popover=hint]</code> / <code>[role="tooltip"]</code> — inverted label</h2>
		<p>
			Tooltip-shaped variant. Smaller, tighter padding, INVERTED colors (light text on dark surface
			in light mode; dark text on light surface in dark mode — sourced from the
			<code>--color-inverted</code> tier so the inversion produces real contrast in both themes).
			Light-dismissable but hierarchically <em>nested</em> under any open <code>auto</code> popover,
			so a tooltip inside an open menu doesn't kill the menu.
		</p>
		<p>
			The framework styles <code>[role="tooltip"]</code> identically, so a CSS-only anchored tooltip
			without the popover API gets the same chrome. Pair with WAI-ARIA's
			<code>aria-describedby</code> on the labelled element to expose the tooltip to assistive tech.
		</p>
		<div class="cluster gap-4">
			<button type="button" popovertarget="demo-pop-hint">Hover-ish trigger</button>
			<small
				>(Click to show; native popover API doesn't yet ship hover-trigger semantics —
				<code>useTooltip</code> composable wires that.)</small
			>
		</div>
		<div popover="hint" id="demo-pop-hint">
			Inverted tooltip — light text on dark surface in light mode.
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;button popovertarget="my-tooltip" aria-describedby="my-tooltip"&gt;
  Trigger
&lt;/button&gt;
&lt;div popover="hint" id="my-tooltip"&gt;Help text.&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="popover-surfaces-anchor">
		<h2>4. Anchor positioning — auto-anchor + placement modifiers</h2>
		<p>
			When a popover is invoked via <code>&lt;button popovertarget&gt;</code>, the browser sets up
			an <strong>implicit anchor relationship</strong> between the invoker and the popover —
			regardless of the popover's mode (<code>auto</code> / <code>manual</code> /
			<code>hint</code>). No <code>anchor-name</code> / <code>position-anchor</code> boilerplate is
			required; the framework only declares placement on the popover and the browser handles the
			rest.
		</p>
		<p>
			Default placement is <code>block-end</code> (below the trigger in horizontal writing modes).
			Placement modifiers map to <code>position-area</code> keywords: <code>.top</code> /
			<code>.bottom</code> / <code>.start</code> / <code>.end</code> for the four sides,
			<code>.top-start</code> / <code>.bottom-end</code> / etc. for the four corners. Each composes
			with any popover mode + content.
		</p>
		<div class="flex flex-wrap justify-center gap-2 py-24">
			<button type="button" popovertarget="demo-pop-area-top" class="dropdown">.top</button>
			<button type="button" popovertarget="demo-pop-area-bottom" class="dropdown">.bottom</button>
			<button type="button" popovertarget="demo-pop-area-start" class="dropdown">.start</button>
			<button type="button" popovertarget="demo-pop-area-end" class="dropdown">.end</button>
		</div>
		<div popover id="demo-pop-area-top" class="top">Placed above the trigger.</div>
		<div popover id="demo-pop-area-bottom" class="bottom">Placed below the trigger.</div>
		<div popover id="demo-pop-area-start" class="start">Placed at the inline-start edge.</div>
		<div popover id="demo-pop-area-end" class="end">Placed at the inline-end edge.</div>

		<h3><code>position-try-fallbacks</code> — automatic flip when room runs out</h3>
		<p>
			The framework ships <code>flip-block, flip-inline, flip-block flip-inline</code> as the
			default fallback list. When a popover anchored at the bottom edge of the viewport doesn't fit
			on its requested side (the <code>max-block-size</code> demanded space exceeds available room),
			the browser flips it to the opposite side cleanly. Same recipe Mailbox uses for popovers and
			selects — "works perfectly for the common case." Scroll the page so the trigger sits near the
			viewport edge and click it; the popover lands on whichever side has room.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Known limitation.</strong> Chromium re-evaluates
				<code>position-try-fallbacks</code> only when the popover's own layout changes — scrolling
				the anchor in a nested container doesn't re-trigger the fallback evaluation, so a popover
				that flips at open time stays flipped for the rest of its session. Closing and re-opening
				always re-evaluates from scratch. The <code>useMenu</code> /
				<code>usePopover</code> composables (Phase 6) close this with a small
				<code>getBoundingClientRect</code>-based observer that nudges <code>max-block-size</code> on
				every scroll tick.
			</p>
		</aside>

		<h3>Viewport clamping on narrow screens</h3>
		<p>
			The popover's <code>max-inline-size</code> is
			<code
				>min(--set-popover-max-inline-size, --set-anchor-max-inline-size, 100vw -
				--set-popover-viewport-inset * 2)</code
			>. On wide viewports the panel's target width wins (~17.25 rem); on narrow viewports the
			viewport gutter clause wins so the popover can't reach the screen edges. The
			<code>position-visibility: anchors-visible</code> declaration also auto-hides the popover when
			the anchor scrolls offscreen, so a dropdown left open in a scrolling list doesn't float
			untethered.
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				popovertarget="demo-pop-long"
				class="dropdown"
				@click="longContent = !longContent"
			>
				Open long-content popover
			</button>
		</div>
		<div popover id="demo-pop-long">
			<h6 class="mt-0 mb-2">Scroll inside the popover</h6>
			<p>
				Long content scrolls inside the popover — the surface ships
				<code>overflow: auto</code> + <code>overscroll-behavior: contain</code> so wheel events
				don't chain to the document when the panel hits its bounds. The
				<code>max-block-size</code> cap (<code>--set-anchor-max-block-size</code>, default 18 rem ≈
				288 px) is the demanded space the browser uses to decide whether the requested side fits.
			</p>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
			<p>Vivamus lacinia odio vitae vestibulum vestibulum.</p>
			<p>Cras mattis consectetur purus sit amet fermentum.</p>
			<p>Cras justo odio, dapibus ac facilisis in, egestas eget quam.</p>
			<p>Morbi leo risus, porta ac consectetur ac, vestibulum at eros.</p>
			<p>Praesent commodo cursus magna, vel scelerisque nisl consectetur.</p>
		</div>
	</section>

	<section id="popover-surfaces-backdrop">
		<h2>5. <code>::backdrop</code> scrim — only on blocking overlays</h2>
		<p>
			Top-layer elements get a <code>::backdrop</code> pseudo-element from the browser. The
			framework paints a dim + blur scrim on the surfaces that genuinely <em>block</em>
			interaction with the page beneath:
		</p>
		<ul>
			<li>
				<strong>Modal <code>&lt;dialog&gt;</code></strong> (opened via <code>.showModal()</code>) —
				the canonical blocking modal.
			</li>
			<li>
				<strong><code>&lt;aside popover&gt;</code> + <code>&lt;nav popover&gt;</code></strong>
				offcanvas drawers — the slide-from-edge family that lifts into the top layer on mobile (see
				<a href="#/aside">AsidePage</a> for the drawer demos and the
				<a href="#/nav">body-shell rail</a> popover-mode binding).
			</li>
		</ul>
		<p>
			Everything else stays UA-default transparent: non-modal <code>&lt;dialog&gt;</code>,
			<code>&lt;output popover&gt;</code> toasts, <code>&lt;menu popover&gt;</code> dropdowns,
			<code>[popover="hint"]</code> tooltips, bare <code>[popover]</code> panels. The scrim tokens
			(<code>--set-backdrop-background-color</code>, <code>--set-backdrop-backdrop-filter</code>)
			live on <code>:root</code> because the <code>::backdrop</code> pseudo can't inherit element-
			scoped tokens (it renders outside the normal DOM tree).
		</p>
		<aside role="status" class="success" data-alert-open>
			<p>
				<strong>Single-backdrop guarantee.</strong> Every framework overlay that needs a scrim
				renders it via the native <code>::backdrop</code> pseudo. There is no per-component
				duplicate backdrop element anywhere in the framework — including the body-shell rails (they
				ride <code>::backdrop</code> via the same selector that covers
				<code>&lt;aside popover&gt;</code> drawers).
			</p>
		</aside>
	</section>

	<section id="popover-surfaces-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			The popover's entry / exit transition (scale-in + fade) routes through the framework's
			<code>@include transition()</code> mixin, which collapses to instant under
			<code>prefers-reduced-motion: reduce</code> for non-drawer popovers. The drawer family (<code
				>&lt;aside popover&gt;</code
			>
			/ <code>&lt;nav popover&gt;</code>) uses the shared <code>--set-motion-duration</code> (250
			ms) and motion timing function from <code>_tokens.scss</code> § Motion contract — see
			<a href="#/aside">AsidePage</a> for the full motion-token discussion.
		</p>
		<p>
			Backdrop scrim fades in / out over the same window so the dim layer and the panel dismiss in
			lockstep — no flash-then-fade between frame 0 of close and the panel's final fade-out frame.
			The transition list lives on the bare pseudo (<code
				>dialog::backdrop, :is(aside, nav)[popover]::backdrop</code
			>) so it survives the close transition tail.
		</p>
	</section>

	<section id="popover-surfaces-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (or any <code>forced-colors: active</code> environment) the popover
			surface paints with <code>Canvas</code> + <code>CanvasText</code> +
			<code>CanvasText</code> border via the variant cascade's token resolution.
			<code>[popover="hint"]</code> stays inverted via the <code>--color-inverted</code> tier
			(slate-900 in light, slate-100 in dark) which resolves to legible system colours under HC
			mode. The <code>::backdrop</code> scrim degrades to a dim layer over <code>Canvas</code>.
		</p>
	</section>

	<section id="popover-surfaces-tokens">
		<h2>Tokens</h2>
		<p>
			The surface ships three token namespaces. Override at <code>:root</code> for global retune;
			per-host via <code>#my-popover { … }</code>.
		</p>

		<h3>Generic <code>[popover]</code> chrome</h3>
		<dl>
			<dt><code>--set-popover-color</code> / <code>--set-popover-background-color</code></dt>
			<dd>
				Text + surface colours. Default <code>--color-text</code> / <code>--color-surface</code>.
			</dd>
			<dt><code>--set-popover-border-color</code> / <code>--set-popover-border-width</code></dt>
			<dd>Perimeter rule. Default <code>--color-border</code> / <code>1px</code>.</dd>
			<dt><code>--set-popover-border-radius</code></dt>
			<dd>Corner radius. Default <code>0.5rem</code>.</dd>
			<dt><code>--set-popover-padding-inline</code> / <code>--set-popover-padding-block</code></dt>
			<dd>Inner padding. Default <code>0.75 rem</code> both axes.</dd>
			<dt><code>--set-popover-box-shadow</code></dt>
			<dd>Floating-panel elevation. Default <code>--set-box-shadow</code> (base tier).</dd>
			<dt><code>--set-popover-max-inline-size</code></dt>
			<dd>Preferred panel width. Default <code>17.25 rem</code> (mailbox parity).</dd>
			<dt><code>--set-popover-viewport-inset</code></dt>
			<dd>Minimum gap to viewport edge on narrow screens. Default <code>1 rem</code>.</dd>
			<dt><code>--set-popover-transition-duration</code></dt>
			<dd>
				Scale-in / fade-out duration. Default <code>--set-transition-duration</code> (150 ms).
			</dd>
		</dl>

		<h3><code>[popover="hint"]</code> / <code>[role="tooltip"]</code> chrome</h3>
		<dl>
			<dt>
				<code>--set-popover-hint-color</code> / <code>--set-popover-hint-background-color</code>
			</dt>
			<dd>
				Inverted text + surface. Default <code>--color-inverted-text</code> /
				<code>color-mix(--color-inverted 95%, transparent)</code>.
			</dd>
			<dt><code>--set-popover-hint-border-color</code></dt>
			<dd>Tooltips are borderless by default — colour is transparent.</dd>
			<dt>
				<code>--set-popover-hint-padding-inline</code> /
				<code>--set-popover-hint-padding-block</code>
			</dt>
			<dd>Tighter than generic panel. Default <code>0.5 rem</code> / <code>0.25 rem</code>.</dd>
			<dt><code>--set-popover-hint-font-size</code></dt>
			<dd>Default <code>--text-xs</code> (12 px).</dd>
			<dt><code>--set-popover-hint-max-inline-size</code></dt>
			<dd>Narrower than panel cap. Default <code>12.5 rem</code> (mailbox parity).</dd>
			<dt><code>--set-popover-hint-box-shadow</code></dt>
			<dd>Lighter elevation. Default <code>--set-box-shadow-small</code>.</dd>
		</dl>

		<h3>Anchor positioning</h3>
		<dl>
			<dt><code>--set-anchor-gap</code></dt>
			<dd>Distance between the trigger and the popover. Default <code>0.25 rem</code>.</dd>
			<dt><code>--set-anchor-position-area</code></dt>
			<dd>
				Default placement. <code>block-end</code> (below the trigger). Placement modifiers (<code
					>.top</code
				>
				/ <code>.bottom</code> / etc.) override per-host.
			</dd>
			<dt><code>--set-anchor-position-try-fallbacks</code></dt>
			<dd>
				Flip list. Default <code>flip-block, flip-inline, flip-block flip-inline</code>. Consumers
				can opt out per- host (<code>position-try-fallbacks: none</code> or restrict to one axis).
			</dd>
			<dt><code>--set-anchor-position-try-order</code></dt>
			<dd>
				Fallback walk order. Default <code>normal</code> (spec-default — try sides in declaration
				order, commit to first that fits).
			</dd>
			<dt><code>--set-anchor-max-block-size</code></dt>
			<dd>
				Demanded space the browser uses when evaluating flip fallbacks. Default
				<code>18 rem</code> (~288 px). Consumers tighten for row-count-bounded menus (<code
					>#my-dropdown { --set-anchor-max-block-size: 12rem; }</code
				>).
			</dd>
			<dt><code>--set-anchor-max-inline-size</code></dt>
			<dd>Upper safety cap on popover width. Default <code>28 rem</code>.</dd>
			<dt><code>--set-anchor-viewport-inset</code></dt>
			<dd>Minimum gap to viewport edge / safe-area-inset. Default <code>0.5 rem</code>.</dd>
		</dl>
	</section>
</template>
