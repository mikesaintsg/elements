<script lang="ts" setup>
/**
 * UseAsidePage — JS-driven `<aside popover="manual">` slide-in drawer.
 *
 * `useAside(elementRef, options)` is the framework's adapter over
 * `createAside`. The factory hijacks `<aside>` + the native Popover API
 * to drive an offcanvas drawer:
 *
 *   1. **Top-layer rendering via `popover="manual"`.** The factory sets
 *      `popover="manual"` on attach so the panel renders in the top
 *      layer (above every other stacking context) and gets the native
 *      `::backdrop` pseudo for the scrim. `"manual"` opts out of the
 *      platform's default light-dismiss path — the factory wires
 *      Escape + backdrop-click itself so the consumer keeps control.
 *   2. **`[data-aside-open]` ↔ `[data-aside-closing]` attribute pair.**
 *      Open flips `[data-aside-open]` synchronously; close swaps to
 *      `[data-aside-closing]` BEFORE the slide-out animation and leaves
 *      it set for the discrete-transition tail (~150 ms). Both attributes
 *      keep the drawer geometry alive (`position: fixed`, full-height
 *      inset) so the panel slides off-screen smoothly instead of
 *      collapsing back to the bare popover-surface defaults (288 px
 *      tall, `position: absolute`) and ghost-flashing at the top of the
 *      viewport for the tail's duration.
 *   3. **A11y wiring.** Open: `aria-modal="true"` + `role="dialog"` +
 *      `inert` removed. Closed: `inert` set (blurs focused descendants
 *      synchronously, removes the subtree from the a11y tree, blocks
 *      pointer events), `aria-modal` / `role` removed. The factory
 *      uses `inert` rather than `aria-hidden` so a button focused
 *      inside the drawer at close-time doesn't trigger the
 *      `aria-hidden` console warning during the slide-out tail.
 *   4. **Body scroll lock (default on).** While the drawer is open the
 *      body scroll is locked; `scroll: { lock: false }` opts out — for
 *      drawers that should let the page scroll behind them (an
 *      inspector / TOC panel that's persistent but doesn't pin the
 *      view).
 *   5. **Dismiss policy.** `dismiss.backdrop: true | false | 'static'`
 *      and `dismiss.escape: false` — same shape as `useDialog`.
 *      `'static'` fires `elements:aside:prevent` so the consumer can
 *      shake the drawer.
 *   6. **Cancellable lifecycle.** `on.show` / `on.hide` veto via
 *      `preventDefault()`; `on.open` / `on.close` post-transition;
 *      `on.prevent` for `'static'` blocked dismiss. All five also
 *      dispatch as DOM events on the aside
 *      (`elements:aside:{show,open,hide,close,prevent}`).
 *
 * What this page is NOT: the static `<aside>` chrome (sidebar rail,
 * inline callout, banner role, popover panel, four-edge `.start` /
 * `.end` / `.top` / `.bottom` placement modifiers). For all of that, see
 * [AsidePage](#/aside). This page proves the JS layer that turns a bare
 * `<aside popover>` into a programmatically-driven drawer.
 *
 * Cross-references:
 *   - [AsidePage](#/aside) — every `<aside>` context (sidebar / callout /
 *     banner / popover) + the placement modifier vocabulary.
 *   - [UseDialogPage](#/use-dialog) — modal sibling. Dialogs center;
 *     asides slide from an edge. Same `dismiss` + `scroll.lock` shape.
 *   - [PlacementsPage](#/placements) — the `.start` / `.end` / `.top` /
 *     `.bottom` vocabulary the drawer panels carry.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useAside } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — four-edge programmatic drawer.
// ─────────────────────────────────────────────────────────────────────
const startRef = useTemplateRef<HTMLElement>('startRef')
const endRef = useTemplateRef<HTMLElement>('endRef')
const topRef = useTemplateRef<HTMLElement>('topRef')
const bottomRef = useTemplateRef<HTMLElement>('bottomRef')
const startDrawer = useAside(startRef)
const endDrawer = useAside(endRef)
const topDrawer = useAside(topRef)
const bottomDrawer = useAside(bottomRef)

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — dismiss policy. Sticky drawer (backdrop:false + escape:false)
// only closes via the inner button or a programmatic hide. Static
// backdrop flashes on outside-click via the `prevent` event.
// ─────────────────────────────────────────────────────────────────────
const stickyRef = useTemplateRef<HTMLElement>('stickyRef')
const stickyDrawer = useAside(stickyRef, {
	dismiss: { backdrop: false, escape: false },
})

const staticRef = useTemplateRef<HTMLElement>('staticRef')
const staticFlash = ref(false)
const staticDrawer = useAside(staticRef, {
	dismiss: { backdrop: 'static', escape: true },
	on: {
		prevent: () => {
			staticFlash.value = true
			window.setTimeout(() => {
				staticFlash.value = false
			}, 400)
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — `scroll.lock: false`. Drawer opens AS A TOP-LAYER PANEL but
// the body scroll keeps working — useful for inspector / TOC panels.
// ─────────────────────────────────────────────────────────────────────
const unlockedRef = useTemplateRef<HTMLElement>('unlockedRef')
const unlockedDrawer = useAside(unlockedRef, { scroll: { lock: false } })

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — cancellable lifecycle. preventDefault on show/hide vetoes the
// transition. The log shows when each event fires (show → open, hide →
// close, prevent for blocked static-backdrop clicks).
// ─────────────────────────────────────────────────────────────────────
const lifecycleRef = useTemplateRef<HTMLElement>('lifecycleRef')
const lifecycleLog = ref<string[]>([])
const allowOpen = ref(true)
const allowClose = ref(true)
const note = (line: string): void => {
	lifecycleLog.value = [...lifecycleLog.value.slice(-5), line]
}
const lifecycleDrawer = useAside(lifecycleRef, {
	on: {
		show: (event: CustomEvent) => {
			if (!allowOpen.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open (after slide)'),
		hide: (event: CustomEvent) => {
			if (!allowClose.value) {
				event.preventDefault()
				note('hide vetoed via preventDefault()')
				return
			}
			note('hide')
		},
		close: () => note('close (after slide)'),
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — lifecycle attribute readout. Same drawer as Demo 1 (start
// edge); the readout polls the panel's dataset every animation frame
// while it's transitioning so authors can see `[data-aside-open]` vs
// `[data-aside-closing]` swap in real time.
// ─────────────────────────────────────────────────────────────────────
const tick = ref(0)
const attrSnapshot = computed(() => {
	void tick.value // re-evaluate when `tick` advances
	const el = startRef.value
	if (!el) return { open: false, closing: false }
	return {
		open: el.hasAttribute('data-aside-open'),
		closing: el.hasAttribute('data-aside-closing'),
	}
})
const pollUntilSettled = (): void => {
	tick.value++
	const el = startRef.value
	if (!el) return
	if (el.hasAttribute('data-aside-open') || el.hasAttribute('data-aside-closing')) {
		requestAnimationFrame(pollUntilSettled)
	}
}
const openStart = (): void => {
	startDrawer.show()
	requestAnimationFrame(pollUntilSettled)
}
const closeStart = (): void => {
	startDrawer.hide()
	requestAnimationFrame(pollUntilSettled)
}
</script>

<template>
	<section id="use-aside-intro">
		<hgroup>
			<h1>useAside</h1>
			<p>
				JS-driven adapter that turns a bare <code>&lt;aside&gt;</code> into a top-layer slide-in
				drawer. Pass a <code>Ref&lt;HTMLElement&gt;</code> + optional <code>dismiss</code> /
				<code>scroll</code> / handlers — the composable sets <code>popover="manual"</code>, swaps
				the <code>[data-aside-open]</code> ↔ <code>[data-aside-closing]</code> attribute pair so the
				slide animation stays smooth across the discrete-transition tail, wires Escape +
				backdrop-click dismiss, locks the body scroll, and flips <code>inert</code> /
				<code>aria-modal</code> / <code>role="dialog"</code>.
			</p>
		</hgroup>
		<p>
			What it buys you over the bare <code>&lt;aside popover&gt;</code> + a
			<code>popovertarget</code> button: a <strong>programmatic open / close / toggle</strong> so
			the drawer can be driven by route state, async events, or external composables; a
			<strong>cancellable lifecycle</strong> via <code>preventDefault()</code> on
			<code>show</code> / <code>hide</code>; <strong>three backdrop modes</strong> (<code
				>true</code
			>
			/ <code>false</code> / <code>'static'</code>) with a <code>prevent</code> hook;
			<strong>opt-out body scroll-lock</strong> (default on); and the
			<strong><code>[data-aside-open]</code> ↔ <code>[data-aside-closing]</code></strong>
			attribute pair that keeps the drawer geometry alive during the slide-out animation so the
			panel doesn't ghost-flash at the top of the page during the popover surface's discrete
			transition. The static <code>&lt;aside&gt;</code> chrome (sidebar rail, callout, banner,
			popover panel, four-edge placement) lives on <a href="#/aside">AsidePage</a>.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				start <code>{{ startDrawer.visible.value ? 'open' : 'closed' }}</code> · end
				<code>{{ endDrawer.visible.value ? 'open' : 'closed' }}</code> · top
				<code>{{ topDrawer.visible.value ? 'open' : 'closed' }}</code> · bottom
				<code>{{ bottomDrawer.visible.value ? 'open' : 'closed' }}</code> · sticky
				<code>{{ stickyDrawer.visible.value ? 'open' : 'closed' }}</code> · static
				<code>{{ staticDrawer.visible.value ? 'open' : 'closed' }}</code> · unlocked
				<code>{{ unlockedDrawer.visible.value ? 'open' : 'closed' }}</code> · lifecycle
				<code>{{ lifecycleDrawer.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-aside-edges">
		<h2>1. Four-edge programmatic drawer</h2>
		<p>
			Each panel carries one of the placement modifiers (<code>.start</code>,
			<code>.end</code>, <code>.top</code>, <code>.bottom</code>) so the slide-in direction matches
			the edge — same vocabulary as <a href="#/placements">PlacementsPage</a> and the static drawer
			demos on <a href="#/aside">AsidePage</a>. The difference here: each is driven by
			<code>useAside</code>, so opening is a programmatic <code>drawer.show()</code> call, the
			<code>visible</code> ref stays in sync, and an inner button can
			<code>drawer.hide()</code> without needing <code>popovertargetaction="hide"</code>. Useful
			when the open path isn't a button click — a route change, a successful async fetch, a keyboard
			shortcut handler.
		</p>
		<menu>
			<li><button type="button" @click="startDrawer.show()">Open start</button></li>
			<li><button type="button" @click="endDrawer.show()">Open end</button></li>
			<li><button type="button" @click="topDrawer.show()">Open top</button></li>
			<li><button type="button" @click="bottomDrawer.show()">Open bottom</button></li>
		</menu>
		<aside ref="startRef" popover class="start">
			<header>
				<h3>Start drawer</h3>
			</header>
			<p>
				Sliding from the inline-start edge — left in LTR, right in RTL. Backdrop click or Escape
				closes. The composable also wires <code>aria-modal="true"</code> +
				<code>role="dialog"</code> for screen readers while open.
			</p>
			<footer>
				<button type="button" class="primary" @click="startDrawer.hide()">Close</button>
			</footer>
		</aside>
		<aside ref="endRef" popover class="end">
			<header>
				<h3>End drawer</h3>
			</header>
			<p>
				Sliding from the inline-end edge — right in LTR, left in RTL. The default for notification /
				settings drawers on most layouts.
			</p>
			<footer>
				<button type="button" class="primary" @click="endDrawer.hide()">Close</button>
			</footer>
		</aside>
		<aside ref="topRef" popover class="top">
			<header>
				<h3>Top drawer</h3>
			</header>
			<p>
				Sliding from the block-start edge — top of the viewport. Common for global search / command
				palettes.
			</p>
			<footer>
				<button type="button" class="primary" @click="topDrawer.hide()">Close</button>
			</footer>
		</aside>
		<aside ref="bottomRef" popover class="bottom">
			<header>
				<h3>Bottom drawer</h3>
			</header>
			<p>
				Sliding from the block-end edge — bottom of the viewport. Mobile-shaped sheet for action
				menus and quick-reply panels.
			</p>
			<footer>
				<button type="button" class="primary" @click="bottomDrawer.hide()">Close</button>
			</footer>
		</aside>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const drawer = useAside(asideRef)

&lt;button type="button" @click="drawer.show()"&gt;Open&lt;/button&gt;
&lt;aside ref="asideRef" popover class="start"&gt;
  &lt;header&gt;&lt;h3&gt;Drawer title&lt;/h3&gt;&lt;/header&gt;
  &lt;p&gt;…&lt;/p&gt;
  &lt;footer&gt;&lt;button @click="drawer.hide()"&gt;Close&lt;/button&gt;&lt;/footer&gt;
&lt;/aside&gt;</code></pre>
		</details>
	</section>

	<section id="use-aside-dismiss">
		<h2>2. <code>dismiss</code> — backdrop + escape policy</h2>
		<p>
			Same shape as <a href="#/use-dialog">useDialog</a>.
			<code>dismiss.backdrop: true</code> (default) closes on outside-click;
			<code>false</code> ignores entirely; <code>'static'</code> ignores AND fires
			<code>elements:aside:prevent</code> so the consumer can shake the drawer.
			<code>dismiss.escape: false</code> suppresses Escape via the document-level keydown handler
			the factory wires (popover="manual" opts out of the native light-dismiss path, so the
			composable owns Escape policy entirely).
		</p>
		<menu>
			<li>
				<button type="button" class="warning" @click="stickyDrawer.show()">Open sticky</button>
			</li>
			<li>
				<button type="button" @click="staticDrawer.show()">Open static</button>
			</li>
		</menu>
		<aside ref="stickyRef" popover class="end">
			<header>
				<h3>Sticky drawer</h3>
			</header>
			<p>
				<code>backdrop: false</code> + <code>escape: false</code>. Backdrop clicks AND Escape are
				ignored. Only an explicit button (or a programmatic <code>hide()</code>) closes it. Pattern:
				a confirmation drawer that demands a yes/no answer before yielding.
			</p>
			<footer>
				<button type="button" class="subtle" @click="stickyDrawer.hide()">Dismiss</button>
				<button type="button" class="primary" @click="stickyDrawer.hide()">Confirm</button>
			</footer>
		</aside>
		<aside ref="staticRef" popover class="end" :class="{ 'shake-once': staticFlash }">
			<header>
				<h3>Static-backdrop drawer</h3>
			</header>
			<p>
				<code>backdrop: 'static'</code> blocks outside-click dismiss AND fires
				<code>elements:aside:prevent</code>. The handler in this demo briefly flips a
				<code>shake-once</code> class on the panel so the blocked click leaves a visible footprint.
				Escape still closes (only backdrop is locked down).
			</p>
			<footer>
				<button type="button" class="primary" @click="staticDrawer.hide()">Close</button>
			</footer>
		</aside>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>// Sticky — both dismiss paths off, only programmatic hide() closes it.
useAside(asideRef, { dismiss: { backdrop: false, escape: false } })

// Static — backdrop click intercepted; Escape still works.
useAside(asideRef, {
  dismiss: { backdrop: 'static', escape: true },
  on: { prevent: () =&gt; flash() },
})</code></pre>
		</details>
	</section>

	<section id="use-aside-scroll">
		<h2>3. <code>scroll.lock</code> — opt-out body scroll-lock</h2>
		<p>
			Drawers default to <strong>locking the body scroll</strong> on open — the panel is in the top
			layer, but the page underneath is held still so the user's attention stays on the drawer. Set
			<code>scroll: { lock: false }</code> to opt out — useful for inspector / TOC drawers that are
			intentionally non-modal-feeling and shouldn't pin the page. With lock off, the user can scroll
			the page behind the drawer freely while the drawer hangs from its edge.
		</p>
		<menu>
			<li>
				<button type="button" class="secondary" @click="unlockedDrawer.show()">
					Open with scroll unlocked
				</button>
			</li>
		</menu>
		<aside ref="unlockedRef" popover class="end">
			<header>
				<h3>Unlocked drawer</h3>
			</header>
			<p>
				The page scroll is NOT locked while this drawer is open. Try scrolling the page now — the
				drawer stays pinned to the inline-end edge while the rest of the document scrolls
				underneath. Close with the button below or the backdrop / Escape.
			</p>
			<footer>
				<button type="button" class="primary" @click="unlockedDrawer.hide()">Close</button>
			</footer>
		</aside>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useAside(asideRef, { scroll: { lock: false } })</code></pre>
		</details>
	</section>

	<section id="use-aside-lifecycle">
		<h2>4. Cancellable lifecycle</h2>
		<p>
			<code>on.show</code> / <code>on.hide</code> fire BEFORE the slide with a cancellable
			<code>CustomEvent</code>; <code>event.preventDefault()</code> aborts the change.
			<code>on.open</code> / <code>on.close</code> fire AFTER the slide completes (informational).
			<code>on.prevent</code> fires when a <code>'static'</code> backdrop click or an Escape press
			is blocked. All five also dispatch as DOM events
			(<code>elements:aside:{show,open,hide,close,prevent}</code>) on the aside element.
		</p>
		<menu>
			<li>
				<label>
					<input v-model="allowOpen" type="checkbox" />
					allow <code>show</code> to proceed
				</label>
			</li>
			<li>
				<label>
					<input v-model="allowClose" type="checkbox" />
					allow <code>hide</code> to proceed
				</label>
			</li>
			<li>
				<button type="button" @click="lifecycleDrawer.show()">Try to open</button>
			</li>
		</menu>
		<aside ref="lifecycleRef" popover class="end">
			<header>
				<h3>Lifecycle demo</h3>
			</header>
			<p>
				If <strong>allow show</strong> is off the open is vetoed. If <strong>allow hide</strong> is
				off the close is vetoed (try the Cancel button, Escape, or clicking the backdrop — all fire
				<code>hide</code>, all honor the veto).
			</p>
			<footer>
				<button type="button" class="primary" @click="lifecycleDrawer.hide()">Close</button>
			</footer>
		</aside>
		<small style="display: block; margin-block-start: 0.5rem">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">flip a checkbox and click the button</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
	</section>

	<section id="use-aside-attrs">
		<h2>5. <code>[data-aside-open]</code> ↔ <code>[data-aside-closing]</code></h2>
		<p>
			The factory exposes a two-attribute lifecycle that
			<code>composables/_aside.scss</code> keys off: <code>[data-aside-open]</code> flips on
			synchronously when <code>show()</code> runs; <code>[data-aside-closing]</code> swaps in on
			<code>hide()</code> BEFORE the slide-out animation and stays for the popover surface's
			discrete-transition tail (~150 ms) so the drawer geometry (full-height inset, fixed
			positioning) survives until <code>display: none</code> finally lands. Without this swap the
			panel would snap to the bare popover surface defaults (288 px tall, absolute positioning)
			mid-slide and ghost-flash at the top of the viewport. Open the drawer below and watch the
			readout swap.
		</p>
		<menu>
			<li><button type="button" @click="openStart">Open start drawer</button></li>
			<li><button type="button" @click="closeStart">Close start drawer</button></li>
		</menu>
		<dl class="lifecycle-readout">
			<dt><code>data-aside-open</code></dt>
			<dd>{{ attrSnapshot.open ? 'present' : 'absent' }}</dd>
			<dt><code>data-aside-closing</code></dt>
			<dd>{{ attrSnapshot.closing ? 'present' : 'absent' }}</dd>
		</dl>
		<small>
			Readout above is bound to <code>startRef.value.hasAttribute(…)</code>, polled every animation
			frame while either attribute is present. The visible drawer panel is the same instance from
			§1.
		</small>
	</section>

	<section id="use-aside-api">
		<h2>API reference</h2>
		<dl>
			<dt>
				<code>useAside(elementRef, options?): UseAsideReturn</code>
			</dt>
			<dd>
				Composable. <code>elementRef</code> must point at an <code>&lt;aside&gt;</code> — the
				factory throws on mismatch (no <code>&lt;div popover&gt;</code> polyfill; the framework
				reserves <code>&lt;aside&gt;</code> for the drawer / banner / sidebar vocabulary).
			</dd>
			<dt><code>options.dismiss</code></dt>
			<dd>
				<code>{ backdrop?, escape? }</code>. <code>backdrop: true</code> (default) closes on
				outside-click; <code>false</code> ignores; <code>'static'</code> ignores AND fires
				<code>on.prevent</code>. <code>escape: false</code> suppresses Escape.
			</dd>
			<dt><code>options.scroll</code></dt>
			<dd>
				<code>{ lock?: boolean }</code> (default <code>true</code>). Body scroll-lock while open.
				Opt-out is for non-modal-feeling inspector / TOC drawers.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close?, prevent? }</code>. <code>show</code> /
				<code>hide</code> cancellable; <code>open</code> / <code>close</code> post-transition;
				<code>prevent</code> fires when a <code>'static'</code> dismiss is blocked.
			</dd>
			<dt><code>UseAsideReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reflects the drawer's open state. Stays in
				sync across every close path — programmatic <code>hide()</code>, Escape, backdrop click, an
				inner <code>hidePopover()</code> call.
			</dd>
			<dt><code>UseAsideReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>Programmatic lifecycle. Honors the cancellable-event contract.</dd>
		</dl>
		<p>
			Cross-references: <a href="#/aside">AsidePage</a> for every
			<code>&lt;aside&gt;</code> context's chrome. <a href="#/use-dialog">UseDialogPage</a> for the
			modal sibling. <a href="#/placements">PlacementsPage</a> for the placement vocabulary.
		</p>
	</section>
</template>

<style scoped>
.lifecycle-readout {
	display: grid;
	grid-template-columns: max-content 1fr;
	column-gap: 1rem;
	row-gap: 0.25rem;
	margin-block: 0.5rem 0.5rem;
}

.lifecycle-readout dt {
	margin: 0;
	font-weight: 500;
}

.lifecycle-readout dd {
	margin: 0;
}

aside.shake-once {
	animation: aside-shake 360ms ease;
}

@keyframes aside-shake {
	0%,
	100% {
		transform: translateX(0);
	}
	20% {
		transform: translateX(-6px);
	}
	40% {
		transform: translateX(6px);
	}
	60% {
		transform: translateX(-4px);
	}
	80% {
		transform: translateX(4px);
	}
}

@media (prefers-reduced-motion: reduce) {
	aside.shake-once {
		animation: none;
	}
}
</style>
