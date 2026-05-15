<script lang="ts" setup>
/**
 * UseToastPage — JS-driven `<output popover>` toast composable.
 *
 * `useToast(elementRef, options?)` is the framework's adapter over
 * `createToast`. The platform owns top-layer rendering + the popover
 * lifecycle; the composable adds the transient-notification layer:
 *
 *   1. **Auto-hide timer.** `options.autohide` defaults to a built-in
 *      delay; passing `false` keeps the toast sticky. The timer starts
 *      AFTER the entry transition completes (so the toast doesn't
 *      vanish mid-fade).
 *   2. **Pause-on-hover + pause-on-focus.** `mouseenter` / `focusin`
 *      pause the timer; `mouseleave` / `focusout` resume it. The
 *      composable exposes `pause()` / `resume()` so consumers can
 *      drive this from external state too.
 *   3. **Linear stack (default).** Toasts share a placement-anchored
 *      container; each opening toast writes `--set-toast-stack-offset`
 *      so cards stack vertically with the framework's spacing token.
 *   4. **Sonner-deck mode.** Set `[data-toast-stack]` on the parent
 *      container and the factory swaps to a deck layout: cards peek
 *      behind the front card (scaled + offset by index), the deck is
 *      depth-clamped via `--set-toast-stack-depth`, and overflow cards
 *      get `aria-hidden` + a `data-toast-hidden-count` indicator on
 *      the container.
 *   5. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE the
 *      popover transition; `preventDefault()` aborts. `on.open` /
 *      `on.close` fire AFTER. All four also dispatch as DOM events
 *      (`elements:toast:{show,open,hide,close}`).
 *
 * What this page is NOT: the bare `<output>` element chrome (in-flow
 * status chip, `--set-output-*` token surface). For all of that, see
 * the static element surface in `src/styles/elements/_output.scss`.
 * This page proves the JS / chrome interaction.
 *
 *   6. **Swipe-to-dismiss.** Bidirectional horizontal — flick the toast
 *      left or right with mouse or touch; the factory composes
 *      `createPointer` to capture the `pointerdown → pointermove* →
 *      pointerup` lifecycle, writes `--set-toast-swipe-offset` per
 *      frame (consumed by `_toast.scss` via the standalone `translate`
 *      property so it composes with the deck's `transform: translateY`),
 *      and on release: commits dismiss if `|dx| > --set-toast-swipe-
 *      threshold` (default 5 rem ≈ 80 px) by firing the cancellable
 *      `elements:toast:hide`, OR snaps back to origin via the motion-
 *      contract transition. Pointer-down on the trailing `<button>`
 *      dismiss is rejected via `accept` so button clicks survive.
 *      Composes inside `[data-toast-stack]` (deck mode) — any visible
 *      card can be swiped; the container pin keeps the deck expanded
 *      mid-swipe.
 */
import { ref, useTemplateRef } from 'vue'
import { useToast } from '@elements/browser'
import { useLog } from '../composables.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — single linear toast. Default auto-hide, pause-on-hover.
// ─────────────────────────────────────────────────────────────────────
const linearRef = useTemplateRef<HTMLOutputElement>('linearRef')
const linear = useToast(linearRef)

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — linear stack: multiple toasts share a placement-anchored
// container, no `[data-toast-stack]`. Cumulative vertical offset.
// ─────────────────────────────────────────────────────────────────────
const stack1Ref = useTemplateRef<HTMLOutputElement>('stack1Ref')
const stack2Ref = useTemplateRef<HTMLOutputElement>('stack2Ref')
const stack3Ref = useTemplateRef<HTMLOutputElement>('stack3Ref')
const stack1 = useToast(stack1Ref, { autohide: false })
const stack2 = useToast(stack2Ref, { autohide: false })
const stack3 = useToast(stack3Ref, { autohide: false })

const showAllLinear = (): void => {
	stack1.show()
	stack2.show()
	stack3.show()
}
const hideAllLinear = (): void => {
	stack1.hide()
	stack2.hide()
	stack3.hide()
}

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Sonner-deck mode: parent container has `[data-toast-stack]`,
// cards peek behind each other, depth-clamped, hidden-count indicator.
// 5 toasts; default depth=3 means 2 get the hidden-count overflow.
// ─────────────────────────────────────────────────────────────────────
const deck1Ref = useTemplateRef<HTMLOutputElement>('deck1Ref')
const deck2Ref = useTemplateRef<HTMLOutputElement>('deck2Ref')
const deck3Ref = useTemplateRef<HTMLOutputElement>('deck3Ref')
const deck4Ref = useTemplateRef<HTMLOutputElement>('deck4Ref')
const deck5Ref = useTemplateRef<HTMLOutputElement>('deck5Ref')
const deck1 = useToast(deck1Ref, { autohide: false })
const deck2 = useToast(deck2Ref, { autohide: false })
const deck3 = useToast(deck3Ref, { autohide: false })
const deck4 = useToast(deck4Ref, { autohide: false })
const deck5 = useToast(deck5Ref, { autohide: false })

const showAllDeck = (): void => {
	deck1.show()
	deck2.show()
	deck3.show()
	deck4.show()
	deck5.show()
}
const hideAllDeck = (): void => {
	deck1.hide()
	deck2.hide()
	deck3.hide()
	deck4.hide()
	deck5.hide()
}

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — variant tinting. .primary / .success / .warning / .danger
// all flow through the variant-context cascade.
// ─────────────────────────────────────────────────────────────────────
const variantRefs = {
	primary: useTemplateRef<HTMLOutputElement>('vPrimary'),
	success: useTemplateRef<HTMLOutputElement>('vSuccess'),
	warning: useTemplateRef<HTMLOutputElement>('vWarning'),
	danger: useTemplateRef<HTMLOutputElement>('vDanger'),
} as const

const variants = {
	primary: useToast(variantRefs.primary),
	success: useToast(variantRefs.success),
	warning: useToast(variantRefs.warning),
	danger: useToast(variantRefs.danger),
} as const

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — placement corners. The toast component's placement modifiers
// (`.top`, `.start`) flip the corner; combinations cover all four.
// ─────────────────────────────────────────────────────────────────────
const cornerRefs = {
	bottomEnd: useTemplateRef<HTMLOutputElement>('cBottomEnd'),
	bottomStart: useTemplateRef<HTMLOutputElement>('cBottomStart'),
	topEnd: useTemplateRef<HTMLOutputElement>('cTopEnd'),
	topStart: useTemplateRef<HTMLOutputElement>('cTopStart'),
} as const

const corners = {
	bottomEnd: useToast(cornerRefs.bottomEnd, { autohide: false }),
	bottomStart: useToast(cornerRefs.bottomStart, { autohide: false }),
	topEnd: useToast(cornerRefs.topEnd, { autohide: false }),
	topStart: useToast(cornerRefs.topStart, { autohide: false }),
} as const

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — banded header / footer. Mirrors aside-alert's banded
// chrome: a `<header>` or `<footer>` child switches the toast to
// flex-column with a tinted band; trailing dismiss button gets the
// variant-context reset (reads as a quiet icon).
// ─────────────────────────────────────────────────────────────────────
const bandHeaderRef = useTemplateRef<HTMLOutputElement>('bandHeaderRef')
const bandFooterRef = useTemplateRef<HTMLOutputElement>('bandFooterRef')
const bandHeader = useToast(bandHeaderRef, { autohide: false })
const bandFooter = useToast(bandFooterRef, { autohide: false })

// ─────────────────────────────────────────────────────────────────────
// Demo 7 — swipe-to-dismiss. Bidirectional horizontal swipe commits
// dismiss when displacement exceeds --set-toast-swipe-threshold; below
// threshold snaps back via motion-contract transition. The lifecycle
// log on the right shows show / open / hide / close events as they fire
// so the user can confirm the swipe path runs the cancellable hide.
// ─────────────────────────────────────────────────────────────────────
const swipeRef = useTemplateRef<HTMLOutputElement>('swipeRef')
const { entries: swipeLog, push: noteSwipe } = useLog(6)
const swipe = useToast(swipeRef, {
	autohide: false,
	on: {
		show: () => noteSwipe('show'),
		open: () => noteSwipe('open'),
		hide: () => noteSwipe('hide (dismissed by swipe or button)'),
		close: () => noteSwipe('close'),
	},
})

// Disabled-swipe demo so the contrast is visible — `swipe: false`
// keeps the dismiss button as the only path.
const noSwipeRef = useTemplateRef<HTMLOutputElement>('noSwipeRef')
const noSwipe = useToast(noSwipeRef, { autohide: false, swipe: false })

// ─────────────────────────────────────────────────────────────────────
// Demo 8 — cancellable lifecycle. preventDefault on on.show vetoes.
// ─────────────────────────────────────────────────────────────────────
const lifecycleRef = useTemplateRef<HTMLOutputElement>('lifecycleRef')
const { entries: lifecycleLog, push: note } = useLog(6)
const allowShow = ref(true)
const lifecycle = useToast(lifecycleRef, {
	autohide: false,
	on: {
		show: (event: CustomEvent) => {
			if (!allowShow.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open (after entry transition)'),
		hide: () => note('hide'),
		close: () => note('close (after exit transition)'),
	},
})
</script>

<template>
	<section id="use-toast-intro">
		<hgroup>
			<h1>useToast</h1>
			<p>
				JS-driven adapter for the native <code>&lt;output popover&gt;</code> toast surface. Pass a
				<code>Ref&lt;HTMLOutputElement&gt;</code> + optional <code>autohide</code> /
				<code>on</code> handlers — the composable wires the popover lifecycle, manages the auto-hide
				timer (pause-on-hover, pause-on-focus), and coordinates linear-stack or Sonner-deck layout
				via the parent container's <code>[data-toast-stack]</code> opt-in.
			</p>
		</hgroup>
		<p>
			Toast surface family disambiguation (per <a href="#/aside">AsidePage</a> + the surface- family
			table in <code>guides/components.md §4.5</code>): toast is the
			<strong>top-layer transient</strong>
			that overlays the page in a corner; banner alert (<code>&lt;aside role="alert"&gt;</code>) is
			the <strong>in-flow surface</strong> that shifts UI between siblings. Both can carry the same
			variant palette; the difference is geometry. Reach for toast when "Saved" / "Copied" / "Failed
			to fetch" needs to surface without disturbing the user's reading flow.
		</p>
		<p>
			<strong>Note on the demo panels below.</strong> Each panel is the consumer's
			<em>trigger surface</em> — the bit of UI that holds the buttons that emit toasts. The
			<code>&lt;output&gt;</code> element lives inside the panel as a DOM sibling of those buttons
			(the factory reads <code>parentElement.children</code> for stack grouping), but when opened it
			elevates to the browser <em>top layer</em> and renders at the viewport corner indicated by
			each panel's caption — not inside the panel itself. The trailing <code>×</code> button in
			every toast is the dismiss control; the framework styles the last direct-child
			<code>&lt;button&gt;</code> as the close.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				linear <code>{{ linear.visible.value ? 'open' : 'closed' }}</code> · stack1
				<code>{{ stack1.visible.value ? 'open' : 'closed' }}</code> · stack2
				<code>{{ stack2.visible.value ? 'open' : 'closed' }}</code> · stack3
				<code>{{ stack3.visible.value ? 'open' : 'closed' }}</code> · deck (5)
				<code>{{ [deck1, deck2, deck3, deck4, deck5].filter((d) => d.visible.value).length }}</code>
				open · lifecycle <code>{{ lifecycle.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-toast-linear-single">
		<h2>1. Single toast — auto-hide + pause-on-hover</h2>
		<p>
			Default <code>autohide</code> = built-in delay (see <code>DEFAULT_TOAST_DELAY_MS</code> in
			<code>src/browser/constants.ts</code>). The timer starts AFTER the entry transition completes
			— important so the toast isn't already fading out the moment the user reads it. Hover the
			toast (or focus a control inside) to pause the timer; the resume on <code>mouseleave</code> /
			<code>focusout</code>.
		</p>
		<div class="toast-trigger">
			<small class="renders-at">Renders at <code>bottom-end</code> of viewport</small>
			<menu>
				<li><button type="button" @click="linear.show()">Show toast</button></li>
				<li><button type="button" @click="linear.hide()">Hide toast</button></li>
				<li><button type="button" @click="linear.pause()">Pause timer</button></li>
				<li><button type="button" @click="linear.resume()">Resume timer</button></li>
			</menu>
			<output ref="linearRef" popover>
				<p><strong>Saved.</strong> Your changes are in. Hover here to pause the auto-hide timer.</p>
				<button
					type="button"
					class="subtle"
					aria-label="Dismiss notification"
					@click="linear.hide()"
				>
					×
				</button>
			</output>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const ref = useTemplateRef&lt;HTMLOutputElement&gt;('ref')
const toast = useToast(ref) // default autohide

&lt;button @click="toast.show()"&gt;Show&lt;/button&gt;
&lt;output ref="ref" popover&gt;
  &lt;p&gt;Saved. …&lt;/p&gt;
  &lt;button @click="toast.hide()" aria-label="Dismiss"&gt;×&lt;/button&gt;
&lt;/output&gt;</code></pre>
		</details>
	</section>

	<section id="use-toast-linear-stack">
		<h2>2. Linear stack — multiple toasts, cumulative vertical offset</h2>
		<p>
			When multiple <code>&lt;output popover&gt;</code> elements share the same placement-anchored
			ancestor (here a container with <code>class="end bottom"</code>), the factory writes
			<code>--set-toast-stack-offset</code> on each open toast so they stack vertically with the
			framework's <code>--set-toast-spacing</code> gap. The newest open toast goes to the bottom of
			the stack (or top, in a top-anchored container — set <code>data-toast-position="top"</code> on
			the container to reverse). Sticky here (<code>autohide: false</code>) so you can compare
			layout shifts.
		</p>
		<div class="toast-trigger">
			<small class="renders-at">
				Renders at <code>bottom-end</code>, stacked vertically with
				<code>--set-toast-spacing</code> between cards
			</small>
			<menu>
				<li><button type="button" @click="showAllLinear">Show all 3</button></li>
				<li><button type="button" @click="hideAllLinear">Hide all 3</button></li>
				<li><button type="button" @click="stack2.hide()">Hide middle</button></li>
			</menu>
			<output ref="stack1Ref" popover class="information">
				<p><strong>1.</strong> First toast — sticky.</p>
				<button
					type="button"
					class="subtle"
					aria-label="Dismiss notification 1"
					@click="stack1.hide()"
				>
					×
				</button>
			</output>
			<output ref="stack2Ref" popover class="information">
				<p><strong>2.</strong> Middle toast — sticky. Hide me to see the others reflow.</p>
				<button
					type="button"
					class="subtle"
					aria-label="Dismiss notification 2"
					@click="stack2.hide()"
				>
					×
				</button>
			</output>
			<output ref="stack3Ref" popover class="information">
				<p><strong>3.</strong> Last toast — sticky.</p>
				<button
					type="button"
					class="subtle"
					aria-label="Dismiss notification 3"
					@click="stack3.hide()"
				>
					×
				</button>
			</output>
		</div>
	</section>

	<section id="use-toast-deck">
		<h2>3. Sonner-deck mode — <code>[data-toast-stack]</code></h2>
		<p>
			Add <code>data-toast-stack</code> to the parent container and the layout swaps to a deck:
			cards peek behind the front card (scaled + Y-offset by their stack index), the deck is
			depth-clamped via <code>--set-toast-stack-depth</code> (default 3), and toasts past the depth
			become <code>aria-hidden</code>'d with a <code>data-toast-hidden-count</code> indicator on the
			container (e.g. <em>+ 2 more</em>). Hover the deck to expand it (all cards rise to full
			opacity); on <code>mouseleave</code> it collapses back to the peek view. The gaps between
			expanded cards include an invisible pointer-capture strip so the deck doesn't twitch when the
			pointer passes between cards.
		</p>
		<div data-toast-stack class="toast-trigger">
			<small class="renders-at">
				Renders at <code>bottom-end</code>, stacked as a Sonner-style deck (peek behind) — depth
				clamp 3, overflow gets <code>aria-hidden</code>
			</small>
			<menu>
				<li><button type="button" @click="showAllDeck">Show all 5</button></li>
				<li><button type="button" @click="hideAllDeck">Hide all 5</button></li>
				<li><button type="button" @click="deck1.hide()">Hide toast 1</button></li>
			</menu>
			<output ref="deck1Ref" popover class="information">
				<p><strong>1.</strong> Deck card.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="deck1.hide()">×</button>
			</output>
			<output ref="deck2Ref" popover class="information">
				<p><strong>2.</strong> Deck card.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="deck2.hide()">×</button>
			</output>
			<output ref="deck3Ref" popover class="information">
				<p><strong>3.</strong> Deck card.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="deck3.hide()">×</button>
			</output>
			<output ref="deck4Ref" popover class="information">
				<p><strong>4.</strong> Deck card.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="deck4.hide()">×</button>
			</output>
			<output ref="deck5Ref" popover class="information">
				<p><strong>5.</strong> Deck card.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="deck5.hide()">×</button>
			</output>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;div data-toast-stack class="end bottom"&gt;
  &lt;output popover&gt;…&lt;/output&gt;
  &lt;output popover&gt;…&lt;/output&gt;
  …
&lt;/div&gt;

// `useToast` writes per-toast:
//   --set-toast-stack-index    (0 = front card; 1, 2, 3 = behind)
//   --set-toast-stack-offset   (used in linear mode only)
//   [data-toast-stack-hidden]  (set on cards beyond depth)
//
// …and on the container:
//   --set-toast-front-height   (front card height — cards align to it)
//   [data-toast-hidden-count]  (overflow count for the indicator)</code></pre>
		</details>
	</section>

	<section id="use-toast-variants">
		<h2>4. Variant tinting</h2>
		<p>
			Toasts pick up the framework's variant cascade through their host class. The toast surface
			repaints <code>--set-toast-{color, background-color, border-color}</code> from the
			<code>--color-{variant}-{text-emphasis, bg-subtle, border-subtle}</code> triplet — subtle tier
			by default to keep the toast readable as a transient note (versus the saturated fill that
			<code>.alert .filled</code> uses for explicit "I'm a status banner" framing).
		</p>
		<div class="toast-trigger">
			<small class="renders-at">
				Renders at <code>top-end</code> (every toast carries <code>.top</code> on its element)
			</small>
			<menu>
				<li>
					<button type="button" class="primary" @click="variants.primary.show()">Primary</button>
				</li>
				<li>
					<button type="button" class="success" @click="variants.success.show()">Success</button>
				</li>
				<li>
					<button type="button" class="warning" @click="variants.warning.show()">Warning</button>
				</li>
				<li>
					<button type="button" class="danger" @click="variants.danger.show()">Danger</button>
				</li>
			</menu>
			<output ref="vPrimary" popover class="primary top">
				<p><strong>New release.</strong> Read the changelog.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="variants.primary.hide()">
					×
				</button>
			</output>
			<output ref="vSuccess" popover class="success top">
				<p><strong>Saved.</strong> Your changes are live.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="variants.success.hide()">
					×
				</button>
			</output>
			<output ref="vWarning" popover class="warning top">
				<p><strong>Heads up.</strong> Your session expires in 5 minutes.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="variants.warning.hide()">
					×
				</button>
			</output>
			<output ref="vDanger" popover class="danger top">
				<p><strong>Failed to fetch.</strong> Check your connection.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="variants.danger.hide()">
					×
				</button>
			</output>
		</div>
	</section>

	<section id="use-toast-placements">
		<h2>5. Placement corners</h2>
		<p>
			The component placement modifiers (<code>.start</code> / <code>.end</code>,
			<code>.top</code> / <code>.bottom</code>) flip the toast's viewport corner. Default is
			<strong>bottom-end</strong>; the others compose as <code>.top</code>, <code>.start</code>, or
			<code>.start.top</code>. Click each button to anchor a sticky toast at the matching corner —
			they live in the top layer simultaneously so you can compare placements side-by-side.
		</p>
		<p>
			<small>
				Each corner toast lives in its <strong>own trigger panel</strong> — the factory computes
				<code>--set-toast-stack-offset</code> across an <code>&lt;output popover&gt;</code>'s DOM
				siblings, so co-locating toasts at different corners inside one container would have them
				shift each other.
			</small>
		</p>
		<div class="toast-trigger-grid">
			<div class="toast-trigger">
				<small class="renders-at">Renders at <code>bottom-end</code></small>
				<menu>
					<li><button type="button" @click="corners.bottomEnd.show()">Show</button></li>
					<li><button type="button" @click="corners.bottomEnd.hide()">Hide</button></li>
				</menu>
				<output ref="cBottomEnd" popover class="information">
					<p><strong>Bottom-end.</strong> Default corner — viewport bottom-right (LTR).</p>
					<button
						type="button"
						class="subtle"
						aria-label="Dismiss"
						@click="corners.bottomEnd.hide()"
					>
						×
					</button>
				</output>
			</div>
			<div class="toast-trigger">
				<small class="renders-at">Renders at <code>bottom-start</code></small>
				<menu>
					<li><button type="button" @click="corners.bottomStart.show()">Show</button></li>
					<li><button type="button" @click="corners.bottomStart.hide()">Hide</button></li>
				</menu>
				<output ref="cBottomStart" popover class="information start">
					<p><strong>Bottom-start.</strong> Viewport bottom-left (LTR) / bottom-right (RTL).</p>
					<button
						type="button"
						class="subtle"
						aria-label="Dismiss"
						@click="corners.bottomStart.hide()"
					>
						×
					</button>
				</output>
			</div>
			<div class="toast-trigger">
				<small class="renders-at">Renders at <code>top-end</code></small>
				<menu>
					<li><button type="button" @click="corners.topEnd.show()">Show</button></li>
					<li><button type="button" @click="corners.topEnd.hide()">Hide</button></li>
				</menu>
				<output ref="cTopEnd" popover class="information top">
					<p><strong>Top-end.</strong> Viewport top-right (LTR).</p>
					<button type="button" class="subtle" aria-label="Dismiss" @click="corners.topEnd.hide()">
						×
					</button>
				</output>
			</div>
			<div class="toast-trigger">
				<small class="renders-at">Renders at <code>top-start</code></small>
				<menu>
					<li><button type="button" @click="corners.topStart.show()">Show</button></li>
					<li><button type="button" @click="corners.topStart.hide()">Hide</button></li>
				</menu>
				<output ref="cTopStart" popover class="information start top">
					<p><strong>Top-start.</strong> Viewport top-left (LTR).</p>
					<button
						type="button"
						class="subtle"
						aria-label="Dismiss"
						@click="corners.topStart.hide()"
					>
						×
					</button>
				</output>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;!-- Default: bottom-end --&gt;
&lt;output popover&gt;…&lt;/output&gt;

&lt;!-- Bottom-start --&gt;
&lt;output popover class="start"&gt;…&lt;/output&gt;

&lt;!-- Top-end --&gt;
&lt;output popover class="top"&gt;…&lt;/output&gt;

&lt;!-- Top-start --&gt;
&lt;output popover class="start top"&gt;…&lt;/output&gt;</code></pre>
		</details>
	</section>

	<section id="use-toast-bands">
		<h2>6. Banded header / footer</h2>
		<p>
			A <code>&lt;header&gt;</code> or <code>&lt;footer&gt;</code> as a direct child switches the
			toast to flex-column layout and paints a tinted band over the heading / footer row. Mirrors
			the chrome used by <code>&lt;aside role="alert"&gt;</code> banners so consumers get one
			pattern for both surfaces. A trailing dismiss <code>&lt;button&gt;</code> inside the band gets
			the variant-context reset (transparent background, currentColor text) so it reads as a quiet
			icon regardless of the host variant.
		</p>
		<div class="toast-trigger">
			<small class="renders-at"
				>Renders at <code>bottom-end</code>; bands bleed to toast edges</small
			>
			<menu>
				<li><button type="button" @click="bandHeader.show()">Show header-band toast</button></li>
				<li><button type="button" @click="bandFooter.show()">Show footer-band toast</button></li>
				<li>
					<button
						type="button"
						@click="
							() => {
								bandHeader.hide()
								bandFooter.hide()
							}
						"
					>
						Hide both
					</button>
				</li>
			</menu>
			<output ref="bandHeaderRef" popover class="success">
				<header>
					<strong>Deployment complete</strong>
					<button type="button" class="subtle" aria-label="Dismiss" @click="bandHeader.hide()">
						×
					</button>
				</header>
				<p>
					Build <code>v1.4.2</code> shipped to production at 14:32 UTC. Logs and rollback are in the
					dashboard.
				</p>
			</output>
			<output ref="bandFooterRef" popover class="warning">
				<p>
					<strong>Session expiring.</strong> You'll be signed out in 5 minutes unless you extend the
					session.
				</p>
				<footer>
					<button type="button" class="warning small">Extend session</button>
					<button type="button" class="subtle" aria-label="Dismiss" @click="bandFooter.hide()">
						×
					</button>
				</footer>
			</output>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;!-- Header band --&gt;
&lt;output popover class="success"&gt;
  &lt;header&gt;
    &lt;strong&gt;Deployment complete&lt;/strong&gt;
    &lt;button class="subtle" aria-label="Dismiss"&gt;×&lt;/button&gt;
  &lt;/header&gt;
  &lt;p&gt;Build v1.4.2 shipped …&lt;/p&gt;
&lt;/output&gt;

&lt;!-- Footer band --&gt;
&lt;output popover class="warning"&gt;
  &lt;p&gt;Session expiring …&lt;/p&gt;
  &lt;footer&gt;
    &lt;button class="warning small"&gt;Extend session&lt;/button&gt;
    &lt;button class="subtle" aria-label="Dismiss"&gt;×&lt;/button&gt;
  &lt;/footer&gt;
&lt;/output&gt;</code></pre>
		</details>
	</section>

	<section id="use-toast-swipe">
		<h2>7. Swipe-to-dismiss</h2>
		<p>
			Bidirectional horizontal swipe. Open the toast, then drag it left or right with a mouse or
			touch — when displacement exceeds
			<code>--set-toast-swipe-threshold</code> (default <code>5rem</code> ≈ 80 px), release commits
			dismiss (firing the cancellable <code>elements:toast:hide</code>); below threshold, release
			snaps back via the motion-contract transition. The factory composes
			<a href="#/use-pointer"><code>createPointer</code></a> for the
			<code>pointerdown → pointermove* → pointerup</code> lifecycle — pointer capture means the drag
			persists even when the cursor leaves the toast bounds (a fast flick still commits).
			<code>pointerdown</code> on the trailing <code>×</code> button is rejected via
			<code>accept</code> so button clicks survive; vertical-first movement releases the toast to
			the page so a parent scroll passes through.
		</p>
		<div class="toast-trigger">
			<small class="renders-at">
				Renders at <code>bottom-end</code>, swipe left or right to dismiss
			</small>
			<menu>
				<li><button type="button" @click="swipe.show()">Show swipeable toast</button></li>
				<li><button type="button" @click="swipe.hide()">Hide</button></li>
				<li>
					<button type="button" @click="noSwipe.show()">Show NON-swipeable (control)</button>
				</li>
			</menu>
			<output ref="swipeRef" popover class="success">
				<p>
					<strong>Drag me.</strong> Swipe left or right past 80 px to dismiss, or use the
					<code>×</code> button. Button clicks survive — the factory rejects pointer-down on
					trailing controls.
				</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="swipe.hide()">×</button>
			</output>
			<output ref="noSwipeRef" popover class="warning">
				<p>
					<strong>Swipe disabled.</strong> This toast was constructed with
					<code>swipe: false</code>; dragging does nothing.
				</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="noSwipe.hide()">×</button>
			</output>
			<small class="lifecycle-log">
				<strong>Lifecycle log:</strong>
				<span v-if="swipeLog.length === 0">open the toast and swipe it to either side</span>
				<span v-else>{{ swipeLog.join(' → ') }}</span>
			</small>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const swipe = useToast(ref, {
  autohide: false,
  swipe: { threshold: 80 }, // default; pass `false` to opt out
})

&lt;output ref="ref" popover&gt;
  &lt;p&gt;Drag me…&lt;/p&gt;
  &lt;button aria-label="Dismiss"&gt;×&lt;/button&gt;
&lt;/output&gt;</code></pre>
		</details>
	</section>

	<section id="use-toast-lifecycle">
		<h2>8. Cancellable lifecycle</h2>
		<p>
			<code>on.show</code> fires BEFORE the popover entry with a cancellable
			<code>CustomEvent</code>; <code>event.preventDefault()</code> aborts the open.
			<code>on.hide</code> is the mirror for close. <code>on.open</code> / <code>on.close</code>
			fire AFTER (informational). All four also dispatch as DOM events
			(<code>elements:toast:{show,open,hide,close}</code>).
		</p>
		<div class="toast-trigger">
			<small class="renders-at">Renders at <code>bottom-end</code></small>
			<menu>
				<li>
					<label>
						<input v-model="allowShow" type="checkbox" />
						allow <code>show</code> to proceed
					</label>
				</li>
				<li>
					<button type="button" @click="lifecycle.show()">Try to show</button>
				</li>
				<li>
					<button type="button" @click="lifecycle.hide()">Hide</button>
				</li>
			</menu>
			<output ref="lifecycleRef" popover>
				<p><strong>Lifecycle toast.</strong> Toggle the checkbox to veto the next open.</p>
				<button type="button" class="subtle" aria-label="Dismiss" @click="lifecycle.hide()">
					×
				</button>
			</output>
			<small class="lifecycle-log">
				<strong>Lifecycle log:</strong>
				<span v-if="lifecycleLog.length === 0">flip the checkbox and click Try to show</span>
				<span v-else>{{ lifecycleLog.join(' → ') }}</span>
			</small>
		</div>
	</section>

	<section id="use-toast-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useToast(elementRef, options?): UseToastReturn</code></dt>
			<dd>
				Composable. <code>elementRef</code> MUST point at an <code>HTMLOutputElement</code> — the
				factory throws on mismatch.
			</dd>
			<dt><code>options.autohide</code></dt>
			<dd>
				<code>false | { delay?: number }</code>. Defaults to the framework's
				<code>DEFAULT_TOAST_DELAY_MS</code>. Pass <code>false</code> for sticky toasts that only
				close via the inner dismiss button or a programmatic <code>hide()</code>.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close? }</code>. <code>show</code> + <code>hide</code> are
				pre-transition cancellable; <code>open</code> + <code>close</code> are post-transition
				informational.
			</dd>
			<dt><code>UseToastReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reflects
				<code>element.matches(':popover-open')</code>.
			</dd>
			<dt><code>UseToastReturn.show()</code> / <code>.hide()</code></dt>
			<dd>Programmatic lifecycle. Honor the cancellable-event contract.</dd>
			<dt><code>UseToastReturn.pause()</code> / <code>.resume()</code></dt>
			<dd>
				Manually pause / resume the auto-hide timer. The composable already pauses on
				<code>mouseenter</code> + <code>focusin</code> and resumes on <code>mouseleave</code> +
				<code>focusout</code> — these methods cover external triggers (e.g. a sibling modal that
				should pause the toast).
			</dd>
		</dl>
		<p>
			<strong>Audit note (this PR):</strong> the prior guides claimed "swipe-to-dismiss" — the
			factory does NOT implement it (no <code>pointerdown</code> / <code>touch*</code> handlers).
			Claim struck from <code>guides/composables.md</code> + <code>guides/plan.md</code>. Track as a
			future enhancement if the project needs touch dismissal.
		</p>
	</section>
</template>

<style scoped>
/* Trigger panel — the consumer's surface that emits toasts. Holds the
 * buttons + the `<output popover>` elements as DOM siblings (the factory
 * reads `parentElement.children` for stack grouping). The toast itself
 * elevates to the top layer and renders at the viewport corner indicated
 * by its placement modifier — NOT inside this box. The `.renders-at`
 * caption tells the reader where to look. */
.toast-trigger {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	background: color-mix(in oklch, var(--color-canvas-strong) 25%, var(--color-canvas));
}
.toast-trigger > menu {
	margin-block: 0;
}
.toast-trigger > .renders-at {
	color: var(--color-text-muted, var(--color-text));
	font-size: var(--text-xs, 0.75rem);
}
.toast-trigger > .lifecycle-log {
	display: block;
	font-size: var(--text-xs, 0.75rem);
}
/* Grid wrapper for the placement-corners demo — 2-column on wide
 * viewports so the four trigger panels read as a 2x2 corner map. */
.toast-trigger-grid {
	display: grid;
	gap: 0.75rem;
	grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
</style>
