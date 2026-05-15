<script lang="ts" setup>
/**
 * UseAsidePage — JS-driven `<aside popover>` drawer.
 *
 * `useAside(elementRef, options)` is the framework's thin adapter over
 * `createAside`. The PLATFORM owns the heavy lifting:
 *
 *   - Top-layer rendering (`[popover]:popover-open { display: flex }`),
 *   - Light-dismiss for `popover="auto"` (outside-click + Escape),
 *   - The native `::backdrop` pseudo (scrim styling in
 *     `surfaces/_backdrop.scss`),
 *   - Slide-in / slide-out animation via `:popover-open` +
 *     `@starting-style` + `transition-behavior: allow-discrete`
 *     (declared in `components/_aside.scss` per-edge),
 *   - `beforetoggle` / `toggle` lifecycle events.
 *
 * The composable is the programmatic shim on top:
 *
 *   1. **Element gating.** `useAside` ASSERTS the host is `<aside>` —
 *      the factory throws otherwise. The composable reserves the
 *      semantic `<aside>` for the drawer pattern; consumers who want a
 *      `<div popover>` reach for `usePopover` directly.
 *   2. **Popover mode toggle.** `options.popover` is `'auto'` (default —
 *      platform light-dismiss), `'manual'` (sticky panel, only
 *      programmatic close), or `false` (leave whatever the author put
 *      on the element).
 *   3. **Programmatic `show()` / `hide()` / `toggle()`** map directly
 *      to the native `showPopover()` / `hidePopover()` /
 *      `togglePopover()`. The slide-out animation starts immediately
 *      (no JS-side wait) because the platform's `:popover-open` +
 *      `allow-discrete` keeps the element in the render tree across
 *      the exit transition.
 *   4. **Reactive `visible`** mirrors `element.matches(':popover-open')`,
 *      synced on the native `toggle` event. Stays in sync across every
 *      close path — programmatic, Escape, outside-click, an inner
 *      `popovertargetaction="hide"` button.
 *   5. **Namespaced DOM events.** `beforetoggle` is bridged into
 *      `elements:aside:show` / `elements:aside:hide`; `toggle` into
 *      `elements:aside:open` / `elements:aside:close`. All four also
 *      fire as `options.on.{show,hide,open,close}` callbacks. The
 *      bridge is informational only — `beforetoggle` isn't cancellable
 *      for popovers in the platform spec.
 *
 * What this page is NOT: the static `<aside>` chrome (sidebar rail,
 * inline callout, banner role, popover panel, four-edge
 * `.start` / `.end` / `.top` / `.bottom` placement modifiers). For all
 * of that, see [AsidePage](#/aside). This page proves the JS shim.
 *
 * Cross-references:
 *   - [AsidePage](#/aside) — every `<aside>` context's chrome.
 *   - [UseDialogPage](#/use-dialog) — modal sibling. Dialogs center;
 *     asides slide from an edge.
 *   - [PlacementsPage](#/placements) — the `.start` / `.end` / `.top` /
 *     `.bottom` vocabulary the drawer panels carry.
 */
import { ref, useTemplateRef } from 'vue'
import { useAside } from '@elements/browser'
import { useLog } from '../composables.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — four-edge programmatic drawer (popover="auto", default).
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
// Demo 2 — popover="manual" sticky drawer. Native light-dismiss is off,
// so neither outside-click nor Escape closes it. Only programmatic
// `hide()` or an inner `popovertargetaction="hide"` button does.
// ─────────────────────────────────────────────────────────────────────
const stickyRef = useTemplateRef<HTMLElement>('stickyRef')
const stickyDrawer = useAside(stickyRef, { popover: 'manual' })

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — native event bridge. `beforetoggle` → show / hide;
// `toggle` → open / close. Informational only (not cancellable per
// the platform spec).
// ─────────────────────────────────────────────────────────────────────
const eventsRef = useTemplateRef<HTMLElement>('eventsRef')
const { entries: eventsLog, push: note } = useLog(6)
const eventsDrawer = useAside(eventsRef, {
	on: {
		show: () => note('show (beforetoggle → open)'),
		open: () => note('open (toggle → open)'),
		hide: () => note('hide (beforetoggle → closed)'),
		close: () => note('close (toggle → closed)'),
	},
})
</script>

<template>
	<section id="use-aside-intro">
		<hgroup>
			<h1>useAside</h1>
			<p>
				JS-driven adapter that turns a bare <code>&lt;aside&gt;</code> into a programmatically
				openable / closable drawer. Pass a <code>Ref&lt;HTMLElement&gt;</code> + optional
				<code>popover</code> mode (<code>'auto'</code> / <code>'manual'</code> / <code>false</code>)
				and optional native-event callbacks — the composable sets the popover attribute, exposes
				<code>show()</code> / <code>hide()</code> / <code>toggle()</code>, and keeps a reactive
				<code>visible</code> ref in sync via the native <code>toggle</code> event. Everything else —
				the top-layer rendering, <code>::backdrop</code> scrim, light-dismiss, and slide animation —
				comes from the platform.
			</p>
		</hgroup>
		<p>
			What it buys you over the bare <code>&lt;aside popover&gt;</code> +
			<code>popovertarget</code> button: a <strong>programmatic open / close / toggle</strong> path
			so the drawer can be driven by route state, async events, or external composables; a
			<strong>reactive <code>visible</code></strong> ref bound to the actual
			<code>:popover-open</code> state; <strong>namespaced DOM events</strong>
			(<code>elements:aside:{show,open,hide,close}</code>) bridged from the native
			<code>beforetoggle</code> / <code>toggle</code> pair; and a one-line opt-in for
			<code>popover="manual"</code> when you need a sticky drawer. No custom dismiss policy, no
			lifecycle-attribute swapping, no scroll-lock — the platform already handles those. The static
			<code>&lt;aside&gt;</code> chrome (sidebar rail, callout, banner, popover panel, four-edge
			placement) lives on <a href="#/aside">AsidePage</a>.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				start <code>{{ startDrawer.visible.value ? 'open' : 'closed' }}</code> · end
				<code>{{ endDrawer.visible.value ? 'open' : 'closed' }}</code> · top
				<code>{{ topDrawer.visible.value ? 'open' : 'closed' }}</code> · bottom
				<code>{{ bottomDrawer.visible.value ? 'open' : 'closed' }}</code> · sticky
				<code>{{ stickyDrawer.visible.value ? 'open' : 'closed' }}</code> · events
				<code>{{ eventsDrawer.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-aside-edges">
		<h2>1. Four-edge programmatic drawer (popover="auto")</h2>
		<p>
			Each panel carries one of the placement modifiers (<code>.start</code>,
			<code>.end</code>, <code>.top</code>, <code>.bottom</code>) so the slide-in direction matches
			the edge — same vocabulary as <a href="#/placements">PlacementsPage</a> and the static drawer
			demos on <a href="#/aside">AsidePage</a>. The difference here: each is driven by
			<code>useAside</code>, so opening is a programmatic <code>drawer.show()</code> call, the
			<code>visible</code> ref stays in sync, and the default <code>popover="auto"</code> gives you
			native light-dismiss (Escape or outside-click closes the panel). The slide-out starts
			immediately — no JS-side wait.
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
				closes (native light-dismiss).
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
				settings drawers.
			</p>
			<footer>
				<button type="button" class="primary" @click="endDrawer.hide()">Close</button>
			</footer>
		</aside>
		<aside ref="topRef" popover class="top">
			<header>
				<h3>Top drawer</h3>
			</header>
			<p>Sliding from the block-start edge — common for global search / command palettes.</p>
			<footer>
				<button type="button" class="primary" @click="topDrawer.hide()">Close</button>
			</footer>
		</aside>
		<aside ref="bottomRef" popover class="bottom">
			<header>
				<h3>Bottom drawer</h3>
			</header>
			<p>
				Sliding from the block-end edge — mobile-shaped sheet for action menus and quick-reply
				panels.
			</p>
			<footer>
				<button type="button" class="primary" @click="bottomDrawer.hide()">Close</button>
			</footer>
		</aside>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const drawer = useAside(asideRef) // popover defaults to "auto"

&lt;button type="button" @click="drawer.show()"&gt;Open&lt;/button&gt;
&lt;aside ref="asideRef" popover class="start"&gt;
  &lt;header&gt;&lt;h3&gt;Drawer title&lt;/h3&gt;&lt;/header&gt;
  &lt;p&gt;…&lt;/p&gt;
  &lt;footer&gt;&lt;button @click="drawer.hide()"&gt;Close&lt;/button&gt;&lt;/footer&gt;
&lt;/aside&gt;</code></pre>
		</details>
	</section>

	<section id="use-aside-manual">
		<h2>2. Sticky drawer — popover="manual"</h2>
		<p>
			Pass <code>popover: 'manual'</code> to opt out of native light-dismiss. The panel ignores
			outside-clicks AND Escape — only a programmatic <code>hide()</code> or an inner
			<code>popovertargetaction="hide"</code> button closes it. Pattern: a confirmation drawer that
			demands a yes / no answer before yielding the viewport. (No more custom dismiss-policy options
			— the platform's <code>popover="auto"</code> vs <code>"manual"</code> attribute IS the
			policy.)
		</p>
		<menu>
			<li>
				<button type="button" class="warning" @click="stickyDrawer.show()">
					Open sticky drawer
				</button>
			</li>
		</menu>
		<aside ref="stickyRef" popover="manual" class="end">
			<header>
				<h3>Sticky drawer</h3>
			</header>
			<p>
				<code>popover="manual"</code>. Try clicking the backdrop or pressing Escape — neither closes
				the panel. Only the buttons below (or a programmatic <code>hide()</code>) do.
			</p>
			<footer>
				<button type="button" class="subtle" @click="stickyDrawer.hide()">Dismiss</button>
				<button type="button" class="primary" @click="stickyDrawer.hide()">Confirm</button>
			</footer>
		</aside>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useAside(asideRef, { popover: 'manual' })

&lt;aside ref="asideRef" popover="manual" class="end"&gt;…&lt;/aside&gt;</code></pre>
		</details>
	</section>

	<section id="use-aside-events">
		<h2>3. Native event bridge</h2>
		<p>
			The composable bridges the platform's native <code>beforetoggle</code> +
			<code>toggle</code> events into a namespaced map and an <code>on</code> options callback.
			<code>beforetoggle</code> fires synchronously before the open / close transition
			(informational — popover <code>beforetoggle</code> is NOT cancellable per the platform spec);
			<code>toggle</code> fires after the state has flipped. Both dispatch as DOM events on the
			aside (<code>elements:aside:{show,hide,open,close}</code>) so external scripts that can't
			import the composable can still listen.
		</p>
		<menu>
			<li>
				<button type="button" @click="eventsDrawer.show()">Open events drawer</button>
			</li>
		</menu>
		<aside ref="eventsRef" popover class="end">
			<header>
				<h3>Events demo</h3>
			</header>
			<p>
				Open / close this drawer to see the event order in the log below — open fires
				<code>show</code> then <code>open</code>; close fires <code>hide</code> then
				<code>close</code>.
			</p>
			<footer>
				<button type="button" class="primary" @click="eventsDrawer.hide()">Close</button>
			</footer>
		</aside>
		<small class="block mt-2">
			<strong>Event log:</strong>
			<span v-if="eventsLog.length === 0">open / close the drawer</span>
			<span v-else>{{ eventsLog.join(' → ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useAside(asideRef, {
  on: {
    show:  () =&gt; console.log('beforetoggle → open'),
    open:  () =&gt; console.log('toggle → open'),
    hide:  () =&gt; console.log('beforetoggle → closed'),
    close: () =&gt; console.log('toggle → closed'),
  },
})

// Or listen from outside the composable via the namespaced DOM events:
aside.addEventListener('elements:aside:open',  () =&gt; { /* … */ })
aside.addEventListener('elements:aside:close', () =&gt; { /* … */ })</code></pre>
		</details>
	</section>

	<section id="use-aside-api">
		<h2>API reference</h2>
		<dl>
			<dt>
				<code>useAside(elementRef, options?): UseAsideReturn</code>
			</dt>
			<dd>
				Composable. <code>elementRef</code> must point at an <code>&lt;aside&gt;</code> — the
				factory throws on mismatch.
			</dd>
			<dt><code>options.popover</code></dt>
			<dd>
				<code>'auto' | 'manual' | false</code> (default <code>'auto'</code>). <code>'auto'</code> =
				native light-dismiss (outside-click + Escape). <code>'manual'</code> = sticky (only
				programmatic close). <code>false</code> = leave the author-declared
				<code>popover</code> attribute untouched.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close? }</code>. <code>show</code> + <code>hide</code> are
				bridged from the native <code>beforetoggle</code> event; <code>open</code> +
				<code>close</code> from the native <code>toggle</code> event. None are cancellable — the
				popover lifecycle is platform-driven.
			</dd>
			<dt><code>UseAsideReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reflects
				<code>element.matches(':popover-open')</code>. Stays in sync across every close path —
				programmatic, Escape, outside-click, inner <code>popovertargetaction="hide"</code>.
			</dd>
			<dt><code>UseAsideReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>
				Programmatic lifecycle. Map directly to <code>showPopover()</code> /
				<code>hidePopover()</code> / <code>togglePopover()</code>.
			</dd>
		</dl>
		<p>
			Cross-references: <a href="#/aside">AsidePage</a> for every
			<code>&lt;aside&gt;</code> context's chrome. <a href="#/use-dialog">UseDialogPage</a> for the
			modal sibling. <a href="#/placements">PlacementsPage</a> for the placement vocabulary.
		</p>
	</section>
</template>
