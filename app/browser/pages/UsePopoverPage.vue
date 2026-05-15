<script lang="ts" setup>
/**
 * UsePopoverPage — JS-driven native popover composable.
 *
 * `usePopover({ anchor, panel, arrow?, placement?, trigger?, delay?,
 * dismiss?, on? })` wraps the browser's Popover API + CSS Anchor
 * Positioning behind a Vue composable. It owns:
 *
 *   1. **Trigger wiring.** `trigger.click | hover | focus` — any
 *      combination. The native popover attribute only opens via
 *      `<button popovertarget>` click; the composable adds the hover +
 *      focus paths needed for tooltip-shaped and hybrid surfaces.
 *   2. **Delayed show / hide.** `delay.show` / `delay.hide` in ms —
 *      kills the "tooltip flicker" you get when the cursor sweeps
 *      across multiple triggers.
 *   3. **Placement.** `placement: 'bottom' | 'top' | ... | 'bottom-end'`
 *      written via `panel.style.positionArea`. The browser's
 *      `position-try-fallbacks` (declared on
 *      `surfaces/_anchor-position.scss`) flips when the requested side
 *      overflows. A reactive `Ref<Placement>` is also accepted — change
 *      it and the composable repositions.
 *   4. **Dismiss policy.** `dismiss.outside` and `dismiss.escape`
 *      independently toggle the two light-dismiss paths. Turn both off
 *      for a sticky panel that closes only on a programmatic `hide()`.
 *   5. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE the
 *      transition with `event.preventDefault()` aborting the change.
 *      `on.open` / `on.close` fire AFTER (informational, non-cancellable).
 *
 * What this page is NOT: the CSS surface contract. For
 * `[popover=auto]` vs `[popover=manual]` vs `[popover=hint]`, anchor-
 * position keywords, viewport clamp, `::backdrop` scrim, etc., see
 * [PopoverSurfacesPage](#/popover-surfaces). This page demos what the
 * COMPOSABLE buys you on top: dynamic placement via JS state, multi-
 * trigger, delays, cancellable lifecycle, dismiss policy control.
 *
 * Cross-references:
 *   - [PopoverSurfacesPage](#/popover-surfaces) — the CSS chrome.
 *   - [MenuPage](#/menu) — `useMenu` composes `usePopover` plus arrow-
 *     key roving + Home/End.
 *   - `useTooltip` will land later — also composes `usePopover` plus
 *     `[popover=hint]` + tooltip-role wiring.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { usePopover } from '@elements/browser'
import { useLog } from '../composables.js'
import type { Placement } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — placement showcase.
// One anchor + popover per side (top / end / bottom / start) so every
// placement is visible at once. Mirrors PopoverSurfacesPage's anchor-
// positioning section pattern — each button hosts its own popover, the
// stage has generous `padding-block` so every side has room to land
// without `position-try-fallbacks` flipping.
// ─────────────────────────────────────────────────────────────────────
const topAnchor = useTemplateRef<HTMLButtonElement>('topAnchor')
const topPanel = useTemplateRef<HTMLDivElement>('topPanel')
const topPopover = usePopover({
	anchor: topAnchor,
	panel: topPanel,
	placement: 'top',
	trigger: { click: true },
})

const endAnchor = useTemplateRef<HTMLButtonElement>('endAnchor')
const endPanel = useTemplateRef<HTMLDivElement>('endPanel')
const endPopover = usePopover({
	anchor: endAnchor,
	panel: endPanel,
	placement: 'end',
	trigger: { click: true },
})

const bottomAnchor = useTemplateRef<HTMLButtonElement>('bottomAnchor')
const bottomPanel = useTemplateRef<HTMLDivElement>('bottomPanel')
const bottomPopover = usePopover({
	anchor: bottomAnchor,
	panel: bottomPanel,
	placement: 'bottom',
	trigger: { click: true },
})

const startAnchor = useTemplateRef<HTMLButtonElement>('startAnchor')
const startPanel = useTemplateRef<HTMLDivElement>('startPanel')
const startPopover = usePopover({
	anchor: startAnchor,
	panel: startPanel,
	placement: 'start',
	trigger: { click: true },
})

// Reactive-placement demo — proves the `placement` option accepts a
// `Ref<Placement>` for consumers that want to drive it from external
// state. Kept as a smaller secondary demo since the multi-anchor stage
// above is the more direct way to see placement at a glance.
import { PLACEMENTS as placementOptions } from '../constants.js'
const dynamicPlacement = ref<Placement>('bottom')
const dynamicAnchor = useTemplateRef<HTMLButtonElement>('dynamicAnchor')
const dynamicPanel = useTemplateRef<HTMLDivElement>('dynamicPanel')
const dynamicPopover = usePopover({
	anchor: dynamicAnchor,
	panel: dynamicPanel,
	placement: dynamicPlacement,
	trigger: { click: true },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — hover trigger with delay (tooltip-shaped pattern).
// ─────────────────────────────────────────────────────────────────────
const hoverAnchor = useTemplateRef<HTMLButtonElement>('hoverAnchor')
const hoverPanel = useTemplateRef<HTMLDivElement>('hoverPanel')
const hoverPopover = usePopover({
	anchor: hoverAnchor,
	panel: hoverPanel,
	placement: 'top',
	trigger: { hover: true, focus: true },
	delay: { show: 150, hide: 100 },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — multi-trigger (click + hover + focus all coexist).
// ─────────────────────────────────────────────────────────────────────
const multiAnchor = useTemplateRef<HTMLButtonElement>('multiAnchor')
const multiPanel = useTemplateRef<HTMLDivElement>('multiPanel')
const multiPopover = usePopover({
	anchor: multiAnchor,
	panel: multiPanel,
	placement: 'bottom',
	trigger: { click: true, hover: true, focus: true },
	delay: { show: 100, hide: 150 },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — dismiss policy: sticky panel (programmatic hide only).
// ─────────────────────────────────────────────────────────────────────
const stickyAnchor = useTemplateRef<HTMLButtonElement>('stickyAnchor')
const stickyPanel = useTemplateRef<HTMLDivElement>('stickyPanel')
const stickyPopover = usePopover({
	anchor: stickyAnchor,
	panel: stickyPanel,
	placement: 'bottom-end',
	trigger: { click: true },
	dismiss: { outside: false, escape: false },
})

const escapeAnchor = useTemplateRef<HTMLButtonElement>('escapeAnchor')
const escapePanel = useTemplateRef<HTMLDivElement>('escapePanel')
const escapePopover = usePopover({
	anchor: escapeAnchor,
	panel: escapePanel,
	placement: 'bottom-start',
	trigger: { click: true },
	dismiss: { outside: false, escape: true },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — cancellable lifecycle via on.show / on.hide.
// ─────────────────────────────────────────────────────────────────────
const cancelAnchor = useTemplateRef<HTMLButtonElement>('cancelAnchor')
const cancelPanel = useTemplateRef<HTMLDivElement>('cancelPanel')
const acceptShow = ref(true)
const { entries: lifecycleLog, push: note } = useLog(5)
const cancelPopover = usePopover({
	anchor: cancelAnchor,
	panel: cancelPanel,
	placement: 'bottom',
	trigger: { click: true },
	on: {
		show: (event) => {
			if (!acceptShow.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open (after transition)'),
		hide: () => note('hide'),
		close: () => note('close (after transition)'),
	},
})
</script>

<template>
	<section id="use-popover-intro">
		<hgroup>
			<h1>usePopover</h1>
			<p>
				JS-driven adapter over the native Popover API and CSS Anchor Positioning. Pass
				<code>anchor</code> + <code>panel</code> refs, optional <code>placement</code>,
				<code>trigger</code>, <code>delay</code>, <code>dismiss</code>, and event handlers — the
				composable wires the lifecycle and writes <code>panel.style.positionArea</code> for you.
			</p>
		</hgroup>
		<p>
			What it buys you over the bare <code>&lt;button popovertarget&gt;</code> +
			<code>[popover]</code> declaration: a <strong>reactive placement ref</strong> (change it, the
			panel re-positions); <strong>hover and focus triggers</strong> with show/hide delays (the
			native attribute only opens via click); a <strong>cancellable lifecycle</strong> via
			<code>preventDefault()</code> on <code>show</code> / <code>hide</code>; and
			<strong>independent control</strong> over the outside-click + Escape dismiss paths. The CSS
			surface itself — `[popover=auto/manual/hint]` chrome, anchor-position keywords, viewport
			clamp, backdrop scrim — lives on <a href="#/popover-surfaces">PopoverSurfacesPage</a>.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				hover popover <code>{{ hoverPopover.visible.value ? 'open' : 'closed' }}</code> ·
				multi-trigger <code>{{ multiPopover.visible.value ? 'open' : 'closed' }}</code> · sticky
				<code>{{ stickyPopover.visible.value ? 'open' : 'closed' }}</code> · dynamic placement
				<code>{{ dynamicPopover.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-popover-placement">
		<h2>1. Placement</h2>
		<p>
			The <code>placement</code> option maps to <code>position-area</code> on the panel —
			<code>top</code>, <code>end</code>, <code>bottom</code>, <code>start</code> plus the eight
			corner variants (<code>top-start</code> / <code>bottom-end</code> / …). Each button below
			hosts its own popover anchored to itself, so every side is visible at once.
			<code>position-try-fallbacks</code> still flips a popover to the opposite side when the
			requested side doesn't fit the viewport.
		</p>
		<div class="placement-stage">
			<button ref="topAnchor" type="button" class="dropdown">.top</button>
			<button ref="endAnchor" type="button" class="dropdown">.end</button>
			<button ref="bottomAnchor" type="button" class="dropdown">.bottom</button>
			<button ref="startAnchor" type="button" class="dropdown">.start</button>
		</div>
		<div ref="topPanel" popover class="demo-popover">
			<small>Placement: <strong>top</strong></small>
			<menu>
				<li><button type="button" class="subtle" @click="topPopover.hide()">Close</button></li>
			</menu>
		</div>
		<div ref="endPanel" popover class="demo-popover">
			<small>Placement: <strong>end</strong></small>
			<menu>
				<li><button type="button" class="subtle" @click="endPopover.hide()">Close</button></li>
			</menu>
		</div>
		<div ref="bottomPanel" popover class="demo-popover">
			<small>Placement: <strong>bottom</strong></small>
			<menu>
				<li><button type="button" class="subtle" @click="bottomPopover.hide()">Close</button></li>
			</menu>
		</div>
		<div ref="startPanel" popover class="demo-popover">
			<small>Placement: <strong>start</strong></small>
			<menu>
				<li><button type="button" class="subtle" @click="startPopover.hide()">Close</button></li>
			</menu>
		</div>

		<h3>Reactive placement via <code>Ref&lt;Placement&gt;</code></h3>
		<p>
			Pass a ref instead of a string and the composable rewrites
			<code>position-area</code> when you mutate the ref. Useful when placement is driven by
			external state (drawer side, user preference, viewport breakpoint). All 12 placement values
			are exercised below — the resolved side appears inside the panel after
			<code>position-try-fallbacks</code> has had its say.
		</p>
		<menu class="placement-grid" aria-label="Placement">
			<li v-for="option in placementOptions" :key="option">
				<button
					type="button"
					class="subtle"
					:class="{ active: dynamicPlacement === option }"
					@click="dynamicPlacement = option"
				>
					{{ option }}
				</button>
			</li>
		</menu>
		<div class="placement-stage">
			<button ref="dynamicAnchor" type="button">
				Open popover ({{ dynamicPopover.visible.value ? 'open' : 'closed' }})
			</button>
		</div>
		<div ref="dynamicPanel" popover class="demo-popover">
			<small>
				Requested <code>{{ dynamicPlacement }}</code> · resolved
				<strong>{{ dynamicPopover.placement.value }}</strong>
			</small>
			<menu>
				<li><button type="button" class="subtle" @click="dynamicPopover.hide()">Close</button></li>
			</menu>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// Static — one popover per anchor, each placed on a different side.
usePopover({ anchor: topRef,    panel: topPanelRef,    placement: 'top' })
usePopover({ anchor: endRef,    panel: endPanelRef,    placement: 'end' })
usePopover({ anchor: bottomRef, panel: bottomPanelRef, placement: 'bottom' })
usePopover({ anchor: startRef,  panel: startPanelRef,  placement: 'start' })

// Reactive — single popover, placement driven by external state.
const placement = ref&lt;Placement&gt;('bottom')
usePopover({ anchor, panel, placement, trigger: { click: true } })</code></pre>
		</details>
	</section>

	<section id="use-popover-hover">
		<h2>2. Hover + focus triggers with delays</h2>
		<p>
			<code>trigger: { hover: true, focus: true }</code> opens the panel on mouse-enter OR
			keyboard-focus. <code>delay.show</code> killing the open-tear when the cursor sweeps past the
			anchor; <code>delay.hide</code> giving the user time to move the cursor INTO the panel before
			it auto-closes. The native popover attribute can't do hover or focus triggers — those are
			JS-only because the platform doesn't expose them declaratively.
		</p>
		<div class="placement-stage">
			<button ref="hoverAnchor" type="button">Hover or Tab to me</button>
		</div>
		<div ref="hoverPanel" popover class="demo-popover">
			<p>
				<small>
					Triggered by <strong>hover</strong> or <strong>focus</strong>; delayed by
					<strong>150 ms</strong> on show and <strong>100 ms</strong> on hide.
				</small>
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>usePopover({
  anchor, panel,
  placement: 'top',
  trigger: { hover: true, focus: true },
  delay: { show: 150, hide: 100 },
})</code></pre>
		</details>
	</section>

	<section id="use-popover-multi">
		<h2>3. Multi-trigger — hover + focus + click coexisting</h2>
		<p>
			The trigger flags compose. All three on the same anchor is the most common production shape: a
			header avatar that opens its menu on <strong>click</strong> (the affordance), on
			<strong>focus</strong> (keyboard users) AND on <strong>hover</strong> (mouse users who never
			click). Each path honors the same delay + dismiss policy, so the panel doesn't flicker if the
			cursor sweeps past and Tab key navigation stays smooth.
		</p>
		<div class="placement-stage">
			<button ref="multiAnchor" type="button">Hover, focus (Tab), or click me</button>
		</div>
		<div ref="multiPanel" popover class="demo-popover">
			<p>
				<small>
					Opened by <strong>any</strong> of: hover · focus · click. Same panel, same dismiss path.
				</small>
			</p>
			<menu>
				<li>
					<button type="button" class="subtle" @click="multiPopover.hide()">Close</button>
				</li>
			</menu>
		</div>
	</section>

	<section id="use-popover-dismiss">
		<h2>4. Dismiss policy — outside-click and Escape independently</h2>
		<p>
			<code>dismiss.outside</code> controls click-outside-to-close;
			<code>dismiss.escape</code> controls Escape-to-close. Both default to <code>true</code> (the
			platform's light-dismiss contract). Disable one or both to build sticky panels: a wizard step
			that closes only on Escape (preserve click-elsewhere for the user to interact with the page),
			or a filter sheet that closes only via an explicit <code>.hide()</code> call (lock the user in
			until they confirm).
		</p>
		<div class="placement-stage flex flex-wrap gap-4">
			<button ref="stickyAnchor" type="button">Sticky — both off (button only)</button>
			<button ref="escapeAnchor" type="button">Escape only</button>
		</div>
		<div ref="stickyPanel" popover class="demo-popover">
			<h6 class="mt-0 mb-2">Sticky panel</h6>
			<p>
				<small>
					<strong>outside: ignored</strong> · <strong>Escape: ignored</strong>. Only the button
					closes it.
				</small>
			</p>
			<menu>
				<li>
					<button type="button" class="primary" @click="stickyPopover.hide()">Done</button>
				</li>
			</menu>
		</div>
		<div ref="escapePanel" popover class="demo-popover">
			<h6 class="mt-0 mb-2">Escape-only panel</h6>
			<p>
				<small>
					<strong>outside: ignored</strong> · <strong>Escape: closes</strong>. Click anywhere on the
					page and the panel stays; press Esc to close.
				</small>
			</p>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// Both dismiss paths off — explicit hide() only
usePopover({
  anchor, panel,
  trigger: { click: true },
  dismiss: { outside: false, escape: false },
})

// Escape closes, outside-click ignored
usePopover({
  anchor, panel,
  trigger: { click: true },
  dismiss: { outside: false, escape: true },
})</code></pre>
		</details>
	</section>

	<section id="use-popover-lifecycle">
		<h2>5. Cancellable lifecycle — veto <code>show</code> / <code>hide</code></h2>
		<p>
			<code>on.show</code> and <code>on.hide</code> fire BEFORE the transition; calling
			<code>event.preventDefault()</code> on the event aborts the transition. Use this for
			confirm-on-close prompts, unsaved-changes guards, or feature-gated reveals.
			<code>on.open</code> and <code>on.close</code> fire AFTER the transition — they're
			informational and non-cancellable.
		</p>
		<menu class="mt-0 mb-4">
			<li>
				<label>
					<input v-model="acceptShow" type="checkbox" />
					allow <code>show</code> to proceed
				</label>
			</li>
		</menu>
		<div class="placement-stage">
			<button ref="cancelAnchor" type="button">Try to open</button>
		</div>
		<div ref="cancelPanel" popover class="demo-popover">
			<p>
				<small>
					I only open when the checkbox above is enabled. Otherwise <code>show</code> is
					<code>preventDefault()</code>'d.
				</small>
			</p>
			<menu>
				<li>
					<button type="button" class="subtle" @click="cancelPopover.hide()">Close</button>
				</li>
			</menu>
		</div>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">click the button to trigger events</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>usePopover({
  anchor, panel,
  trigger: { click: true },
  on: {
    show: (event) =&gt; {
      if (!canOpen.value) event.preventDefault() // vetoes the open
    },
    open: () =&gt; console.log('opened (after transition)'),
    hide: (event) =&gt; { /* preventDefault here to veto the close */ },
    close: () =&gt; console.log('closed (after transition)'),
  },
})</code></pre>
		</details>
	</section>

	<section id="use-popover-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>usePopover(options): UsePopoverReturn</code></dt>
			<dd>
				Composable. Options must include <code>anchor</code> + <code>panel</code>
				<code>Ref&lt;HTMLElement | null&gt;</code>; everything else is optional.
			</dd>
			<dt><code>options.anchor</code> / <code>options.panel</code></dt>
			<dd>
				Required. Refs to the trigger element and the popover panel. The panel ref must point at an
				element that supports the native popover API (every <code>HTMLElement</code> does,
				post-Chromium 114). The factory sets <code>popover="manual"</code> internally.
			</dd>
			<dt><code>options.arrow</code></dt>
			<dd>
				Optional <code>Ref&lt;HTMLElement | null&gt;</code> for a directional arrow inside the
				panel. Author CSS reads <code>panel[data-popover-side]</code> to rotate / pin the arrow per
				the resolved side.
			</dd>
			<dt><code>options.placement</code></dt>
			<dd>
				<code>Placement | Ref&lt;Placement&gt; | false</code> (default <code>'bottom'</code>). Maps
				to <code>position-area</code> on the panel.
				<code>'top' | 'bottom' | 'start' | 'end'</code> plus the eight corner variants.
				<code>false</code> opts out — the factory shows/hides but writes no placement attributes
				(use when the surface owns its own positioning).
			</dd>
			<dt><code>options.trigger</code></dt>
			<dd>
				<code>{ click?, hover?, focus? }</code>. Each flag toggles a trigger path. Default
				<code>{ click: true }</code>. The native popover attribute only does click via
				<code>popovertarget</code>; the composable adds hover + focus.
			</dd>
			<dt><code>options.delay</code></dt>
			<dd>
				<code>{ show?, hide? }</code> in ms. Defaults to 0 / 0. Useful for hover triggers where a
				tiny delay smooths out cursor-sweep accidents.
			</dd>
			<dt><code>options.dismiss</code></dt>
			<dd>
				<code>{ outside?, escape? }</code>. Both default to <code>true</code>. Set either to
				<code>false</code> to opt out of that light-dismiss path.
			</dd>
			<dt><code>options.on.show</code> / <code>options.on.hide</code></dt>
			<dd>
				Pre-transition lifecycle events. Calling <code>event.preventDefault()</code> on the event
				aborts the open / close.
			</dd>
			<dt><code>options.on.open</code> / <code>options.on.close</code></dt>
			<dd>
				Post-transition lifecycle events. Informational — fire after the CSS transition (or
				immediately when no transition is declared).
			</dd>
			<dt><code>options.on.place</code></dt>
			<dd>Fires every time the placement is recomputed (after viewport resize, fallback flips).</dd>
			<dt><code>UsePopoverReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Mirrors the panel's open state for template
				bindings.
			</dd>
			<dt><code>UsePopoverReturn.placement</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;Placement&gt;&gt;</code>. The RESOLVED placement after
				`position-try-fallbacks` has flipped (if needed). Read this for chrome that follows the
				rendered side; mutate <code>options.placement</code> (the ref you passed in) to REQUEST a
				new side.
			</dd>
			<dt><code>UsePopoverReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>
				Programmatic lifecycle. Fire the same events as a trigger-driven open/close; honor the same
				<code>delay</code> + cancellable-event contract.
			</dd>
			<dt><code>UsePopoverReturn.update()</code></dt>
			<dd>
				Manually re-apply the placement (rare — useful after the panel's content changes its size,
				e.g. an async children list landing).
			</dd>
		</dl>
	</section>
</template>

<style scoped>
.placement-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.375rem;
	margin: 0 0 1rem;
	padding: 0;
	list-style: none;
	max-inline-size: 24rem;
}

.placement-grid button {
	inline-size: 100%;
	font-family: var(--font-mono, monospace);
	font-size: 0.75rem;
}

.placement-grid button.active {
	background: color-mix(in oklch, var(--color-primary) 18%, var(--color-canvas));
	color: var(--color-primary-text-emphasis);
	border-color: color-mix(in oklch, var(--color-primary) 40%, var(--color-border));
}

/* Placement showcase — generous padding-block so every side has room
 * to land without `position-try-fallbacks` flipping the popover away
 * from the requested side. Mirrors PopoverSurfacesPage §4's stage. */
.placement-stage {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 0.75rem;
	padding-block: 6rem;
	padding-inline: 4rem;
	border: 1px dashed var(--color-border);
	border-radius: 0.5rem;
	background: color-mix(in oklch, var(--color-canvas-strong) 50%, var(--color-canvas));
	margin-block-end: 1rem;
}

.demo-popover {
	min-inline-size: 14rem;
	max-inline-size: 20rem;
}
</style>
