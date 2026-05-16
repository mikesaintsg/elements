<script lang="ts" setup>
/**
 * UseMenuPage — JS-driven dropdown / context-menu composable.
 *
 * `useMenu(toggleRef, menuRef, options)` is the framework's adapter
 * over `createMenu`, which composes `createPopover` (top-layer visibility +
 * anchor-position placement) with menu semantics layered on top:
 *
 *   1. **`aria-expanded` + `aria-haspopup="menu"` mirroring** on the
 *      toggle so screen readers announce "menu popup, collapsed/expanded"
 *      synchronously with the open/close transition.
 *   2. **Arrow-key roving focus** between `<li>` / `<a>` / `<button>`
 *      descendants of the `<menu>` (`MENU_ITEM_SELECTOR`). ArrowDown from
 *      the toggle opens the panel AND lands focus on the first item;
 *      ArrowUp opens it and lands focus on the last item. `Home` / `End`
 *      jump to first / last. The native popover attribute does none of
 *      this — every popover author has to wire it themselves.
 *   3. **Item-click dismiss.** Clicking any element matching
 *      `MENU_ITEM_SELECTOR` auto-closes the panel (configurable via
 *      `dismiss.inside`).
 *   4. **`flip` threshold.** `options.flip` (default 5) is forwarded to
 *      CSS as an inline `max-block-size` cap of `flip × 2.25rem`. The
 *      browser uses this as the demanded space when evaluating
 *      `position-try-fallbacks: flip-block` — the panel flips above
 *      ONLY when the requested side genuinely cannot host that many
 *      rows. `flip: 0` opts out and drops the cap.
 *   5. **Reactive placement** via `Ref<Placement>` — change the ref,
 *      the panel re-anchors live.
 *   6. **Dismiss policy.** `dismiss.outside` / `.escape` / `.inside`
 *      independently toggle the three light-dismiss paths.
 *   7. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE the
 *      transition; `event.preventDefault()` aborts the change.
 *      `on.open` / `on.close` are informational (post-transition).
 *
 * Element gating: `useMenu` ASSERTS the panel ref is an
 * `HTMLMenuElement`. Pointing it at a `<ul>` / `<div>` throws — the
 * factory reserves the semantic `<menu>` tag for the dropdown pattern.
 * Authors who want a `<ul>` panel reach for `usePopover` directly.
 *
 * What this page is NOT: the static `<menu>` chrome (toolbar / nav-rail /
 * TOC / dropdown surface tokens). For all of that, see
 * [MenuPage](#/menu). This page proves the JS interaction layer the
 * composable lays on top of the dropdown variant.
 *
 * Cross-references:
 *   - [MenuPage](#/menu) — the CSS chrome for every `<menu>` context.
 *   - [UsePopoverPage](#/use-popover) — `useMenu` composes `usePopover`
 *     plus the menu-specific keyboard + ARIA layer.
 *   - [PlacementsPage](#/placements) — the placement vocabulary used
 *     here.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useMenu } from '@elements/browser'
import { useLog } from '../composables.js'
import type { Placement } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — default dropdown. Click-to-toggle, ArrowDown/Up to rove,
// item-click dismiss, outside-click dismiss. The "what useMenu buys
// you over the bare native declaration" reference shape.
// ─────────────────────────────────────────────────────────────────────
const defaultToggle = useTemplateRef<HTMLButtonElement>('defaultToggle')
const defaultMenu = useTemplateRef<HTMLMenuElement>('defaultMenu')
const lastCommand = ref<string | null>(null)
const defaultDropdown = useMenu(defaultToggle, defaultMenu, {
	placement: 'bottom-start',
})
const onCommand = (label: string): void => {
	lastCommand.value = label
}

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — reactive placement. Pass a Ref<Placement>, mutate it from
// outside, the menu re-anchors. Proves the live re-positioning path
// distinct from per-button placement modifiers.
// ─────────────────────────────────────────────────────────────────────
import { PLACEMENTS as placementOptions } from '../constants.js'
const livePlacement = ref<Placement>('bottom-start')
const placedToggle = useTemplateRef<HTMLButtonElement>('placedToggle')
const placedMenu = useTemplateRef<HTMLMenuElement>('placedMenu')
const placedDropdown = useMenu(placedToggle, placedMenu, {
	placement: livePlacement,
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — flip threshold. flip: 0 opts out of the block-axis cap so
// the menu never flips above the trigger. flip: 8 leaves the default
// 5×2.25rem demand and lets position-try-fallbacks decide.
// ─────────────────────────────────────────────────────────────────────
const flipFloorToggle = useTemplateRef<HTMLButtonElement>('flipFloorToggle')
const flipFloorMenu = useTemplateRef<HTMLMenuElement>('flipFloorMenu')
const flipFloorDropdown = useMenu(flipFloorToggle, flipFloorMenu, {
	placement: 'bottom-start',
	flip: 0,
})
const flipCeilingToggle = useTemplateRef<HTMLButtonElement>('flipCeilingToggle')
const flipCeilingMenu = useTemplateRef<HTMLMenuElement>('flipCeilingMenu')
const flipCeilingDropdown = useMenu(flipCeilingToggle, flipCeilingMenu, {
	placement: 'bottom-start',
	flip: 8,
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — dismiss policy. Sticky (all three flags off — only the
// trigger or a programmatic hide closes it) and persistent-inside
// (item-click does NOT close — for filter / settings menus where
// the user picks multiple commands).
// ─────────────────────────────────────────────────────────────────────
const stickyToggle = useTemplateRef<HTMLButtonElement>('stickyToggle')
const stickyMenu = useTemplateRef<HTMLMenuElement>('stickyMenu')
const stickyDropdown = useMenu(stickyToggle, stickyMenu, {
	placement: 'bottom-start',
	dismiss: { outside: false, escape: false, inside: false },
})
const filterToggle = useTemplateRef<HTMLButtonElement>('filterToggle')
const filterMenu = useTemplateRef<HTMLMenuElement>('filterMenu')
const filters = ref<Record<string, boolean>>({
	bugs: true,
	features: false,
	docs: false,
	chores: false,
})
const filterDropdown = useMenu(filterToggle, filterMenu, {
	placement: 'bottom-end',
	dismiss: { outside: true, escape: true, inside: false },
})
const filterSummary = computed(() => {
	const on = Object.entries(filters.value)
		.filter(([, v]) => v)
		.map(([k]) => k)
	return on.length === 0 ? 'no filters' : on.join(' + ')
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — cancellable lifecycle + custom events. The `on.show` /
// `on.hide` callbacks fire with a CustomEvent — calling
// preventDefault() vetoes the open / close. `on.open` / `on.close`
// fire after the transition for informational use.
// ─────────────────────────────────────────────────────────────────────
const { entries: lifecycleLog, push: note } = useLog(5)
const allowOpen = ref(true)
const lifecycleToggle = useTemplateRef<HTMLButtonElement>('lifecycleToggle')
const lifecycleMenu = useTemplateRef<HTMLMenuElement>('lifecycleMenu')
const lifecycleDropdown = useMenu(lifecycleToggle, lifecycleMenu, {
	placement: 'bottom-start',
	on: {
		show: (event: CustomEvent) => {
			if (!allowOpen.value) {
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
	<section id="use-menu-intro">
		<hgroup>
			<h1>useMenu</h1>
			<p>
				JS-driven adapter that turns a <code>&lt;button&gt;</code> +
				<code>&lt;menu popover&gt;</code>
				pair into a fully keyboard-navigable dropdown. Pass refs to the toggle and the
				<code>&lt;menu&gt;</code> panel, optional <code>placement</code> / <code>flip</code> /
				<code>dismiss</code> / lifecycle handlers — the composable wires the native popover
				lifecycle plus arrow-key roving focus, item-click dismiss, and <code>aria-expanded</code> /
				<code>aria-haspopup</code> mirroring for you.
			</p>
		</hgroup>
		<p>
			What it buys you over the bare <code>&lt;button popovertarget&gt;</code> +
			<code>&lt;menu popover&gt;</code> markup: a
			<strong>keyboard interaction layer</strong> (ArrowDown opens + lands on first item, ArrowUp
			opens + lands on last, Home / End jump, ArrowDown / ArrowUp rove);
			<strong>auto-dismiss on item activation</strong> (configurable); a
			<strong>reactive placement ref</strong>; a <strong>flip threshold</strong> that caps the
			block-axis demand so <code>position-try-fallbacks: flip-block</code> only flips when the panel
			genuinely doesn't fit; <strong>independent dismiss-policy flags</strong> for outside-click /
			Escape / item-click; and a <strong>cancellable lifecycle</strong>. The CSS chrome itself —
			toolbar, nav-rail, TOC, dropdown surface tokens — lives on <a href="#/menu">MenuPage</a>.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				default <code>{{ defaultDropdown.visible.value ? 'open' : 'closed' }}</code> · placed
				<code>{{ placedDropdown.visible.value ? 'open' : 'closed' }}</code> · sticky
				<code>{{ stickyDropdown.visible.value ? 'open' : 'closed' }}</code> · filter
				<code>{{ filterDropdown.visible.value ? 'open' : 'closed' }}</code> · lifecycle
				<code>{{ lifecycleDropdown.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-menu-default">
		<h2>1. Default — click + keyboard + item-dismiss</h2>
		<p>
			The reference shape. Click to toggle, click outside or press Escape to dismiss, click any item
			to pick + dismiss. The keyboard layer is the part you can't get from the bare native
			declaration: focus the trigger, press <kbd>ArrowDown</kbd> — the panel opens AND focus lands
			on the first item. <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> rove with wrap-around.
			<kbd>Home</kbd> / <kbd>End</kbd> jump to first / last. <kbd>Enter</kbd> activates the focused
			item (the framework's <code>&lt;button&gt;</code> baseline does this; the composable just gets
			focus to the right item).
		</p>
		<div class="showcase-dropdown-stage">
			<button ref="defaultToggle" type="button" class="dropdown">Open menu</button>
		</div>
		<menu ref="defaultMenu" popover>
			<li><button type="button" @click="onCommand('Profile')">Profile</button></li>
			<li><button type="button" @click="onCommand('Settings')">Settings</button></li>
			<li><button type="button" @click="onCommand('Billing')">Billing</button></li>
			<hr />
			<li><button type="button" @click="onCommand('Sign out')">Sign out</button></li>
		</menu>
		<small class="block mt-2">
			<strong>Last picked:</strong>
			<span v-if="lastCommand">{{ lastCommand }}</span>
			<span v-else>(none yet — open the menu and pick an item)</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const toggle = useTemplateRef&lt;HTMLButtonElement&gt;('toggle')
const menu = useTemplateRef&lt;HTMLMenuElement&gt;('menu')
const dropdown = useMenu(toggle, menu, { placement: 'bottom-start' })

&lt;button ref="toggle" type="button" class="dropdown"&gt;Open menu&lt;/button&gt;
&lt;menu ref="menu" popover&gt;
  &lt;li&gt;&lt;button&gt;Profile&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button&gt;Settings&lt;/button&gt;&lt;/li&gt;
  &lt;hr /&gt;
  &lt;li&gt;&lt;button&gt;Sign out&lt;/button&gt;&lt;/li&gt;
&lt;/menu&gt;</code></pre>
		</details>
	</section>

	<section id="use-menu-placement">
		<h2>2. Reactive placement — <code>Ref&lt;Placement&gt;</code></h2>
		<p>
			Pass a ref instead of a string and the panel re-anchors live when you mutate it. Useful when
			placement is driven by external state — drawer side, user preference, viewport breakpoint. All
			12 placement values are available; the resolved side may differ from the requested side once
			<code>position-try-fallbacks</code> has flipped a clipping placement.
		</p>
		<menu class="showcase-placement-grid" aria-label="Placement">
			<li v-for="option in placementOptions" :key="option">
				<button
					type="button"
					class="subtle"
					:class="{ active: livePlacement === option }"
					@click="livePlacement = option"
				>
					{{ option }}
				</button>
			</li>
		</menu>
		<div class="showcase-dropdown-stage">
			<button ref="placedToggle" type="button" class="dropdown">placed: {{ livePlacement }}</button>
		</div>
		<menu ref="placedMenu" popover>
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
			<li><button type="button">Third action</button></li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const placement = ref&lt;Placement&gt;('bottom-start')
const dropdown = useMenu(toggleRef, menuRef, { placement })

// Anywhere in your component / outside the composable:
placement.value = 'top-end' // panel re-anchors immediately</code></pre>
		</details>
	</section>

	<section id="use-menu-flip">
		<h2>3. <code>flip</code> threshold — block-axis cap</h2>
		<p>
			The <code>flip</code> option (default <code>5</code>) is forwarded to CSS as an inline
			<code>max-block-size: flip × 2.25rem</code>. The browser uses that cap as the demanded space
			when evaluating <code>position-try-fallbacks: flip-block</code> — the panel only flips above
			when the requested side genuinely can't host <code>flip</code> rows. Two buttons below: one
			with <code>flip: 0</code> (no cap, never flips block-axis even when the panel overflows the
			viewport) and one with <code>flip: 8</code> (asks for room for 8 rows before flipping). Both
			render the same 4-item menu — the difference shows up near a viewport edge.
		</p>
		<div class="showcase-dropdown-stage" style="gap: 1rem">
			<button ref="flipFloorToggle" type="button" class="dropdown">flip: 0 (never flip)</button>
			<button ref="flipCeilingToggle" type="button" class="dropdown">flip: 8 (needs 8 rows)</button>
		</div>
		<menu ref="flipFloorMenu" popover>
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
			<li><button type="button">Third action</button></li>
			<li><button type="button">Fourth action</button></li>
		</menu>
		<menu ref="flipCeilingMenu" popover>
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
			<li><button type="button">Third action</button></li>
			<li><button type="button">Fourth action</button></li>
		</menu>
		<small>
			Resolved state: floor
			<code>{{ flipFloorDropdown.visible.value ? 'open' : 'closed' }}</code> · ceiling
			<code>{{ flipCeilingDropdown.visible.value ? 'open' : 'closed' }}</code
			>.
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useMenu(toggleRef, menuRef, { placement: 'bottom-start', flip: 0 })
// Equivalent to: max-block-size: none + position-try-fallbacks: flip-inline

useMenu(toggleRef, menuRef, { placement: 'bottom-start', flip: 8 })
// Asks for 8 × 2.25rem before allowing flip-block — useful for tall menus
// that you'd rather scroll than flip above on smaller viewports.</code></pre>
		</details>
	</section>

	<section id="use-menu-dismiss">
		<h2>4. Dismiss policy — three independent paths</h2>
		<p>
			<code>dismiss.outside</code> controls click-outside-to-close;
			<code>dismiss.escape</code> controls Escape-to-close; <code>dismiss.inside</code> controls
			item-click-to-close. All three default to <code>true</code>. Turning them off composes
			distinct UX shapes: a <strong>sticky panel</strong> (all three off — only the trigger or a
			programmatic <code>hide()</code> closes it) for confirmations, or a
			<strong>persistent filter menu</strong> (<code>inside: false</code>) where the user toggles
			multiple checkboxes before pressing Escape or clicking outside.
		</p>
		<div class="showcase-dropdown-stage flex flex-wrap gap-4">
			<button ref="stickyToggle" type="button" class="dropdown">Sticky — all dismiss off</button>
			<button ref="filterToggle" type="button" class="dropdown">
				Filters ({{ filterSummary }})
			</button>
		</div>
		<menu ref="stickyMenu" popover>
			<h6>Confirm action</h6>
			<li>
				<button type="button" class="primary" @click="stickyDropdown.hide()">Confirm</button>
			</li>
			<li>
				<button type="button" class="subtle" @click="stickyDropdown.hide()">Cancel</button>
			</li>
		</menu>
		<menu ref="filterMenu" popover>
			<h6>Issue types</h6>
			<li>
				<label class="showcase-filter-row"> <input v-model="filters.bugs" type="checkbox" /> Bugs </label>
			</li>
			<li>
				<label class="showcase-filter-row">
					<input v-model="filters.features" type="checkbox" /> Features
				</label>
			</li>
			<li>
				<label class="showcase-filter-row"> <input v-model="filters.docs" type="checkbox" /> Docs </label>
			</li>
			<li>
				<label class="showcase-filter-row">
					<input v-model="filters.chores" type="checkbox" /> Chores
				</label>
			</li>
			<hr />
			<li>
				<button type="button" class="subtle" @click="filterDropdown.hide()">Done</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>// Sticky — every dismiss path off, only programmatic hide() closes it
useMenu(toggleRef, menuRef, {
  dismiss: { outside: false, escape: false, inside: false },
})

// Persistent filter — outside-click + Escape close, item-click does NOT
useMenu(toggleRef, menuRef, {
  dismiss: { outside: true, escape: true, inside: false },
})</code></pre>
		</details>
	</section>

	<section id="use-menu-lifecycle">
		<h2>5. Cancellable lifecycle + custom events</h2>
		<p>
			<code>on.show</code> / <code>on.hide</code> fire BEFORE the transition with a cancellable
			<code>CustomEvent</code> — call <code>event.preventDefault()</code> to abort the open or
			close. <code>on.open</code> / <code>on.close</code> fire AFTER the transition (informational,
			non-cancellable). The same events are dispatched on the toggle as DOM events (<code
				>elements:menu:show</code
			>
			/ <code>elements:menu:open</code> / <code>elements:menu:hide</code> /
			<code>elements:menu:close</code>), so external scripts that can't import the composable can
			still listen.
		</p>
		<menu class="mt-0 mb-4">
			<li>
				<label>
					<input v-model="allowOpen" type="checkbox" />
					allow <code>show</code> to proceed
				</label>
			</li>
		</menu>
		<div class="showcase-dropdown-stage">
			<button ref="lifecycleToggle" type="button" class="dropdown">Try to open</button>
		</div>
		<menu ref="lifecycleMenu" popover>
			<li><button type="button">First action</button></li>
			<li><button type="button">Second action</button></li>
		</menu>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">click the button to trigger events</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useMenu(toggleRef, menuRef, {
  on: {
    show: (event) =&gt; {
      if (!canOpen.value) event.preventDefault() // vetoes the open
    },
    open:  () =&gt; console.log('opened (after transition)'),
    hide:  () =&gt; { /* preventDefault here to veto the close */ },
    close: () =&gt; console.log('closed (after transition)'),
  },
})

// Or listen on the toggle from outside the composable:
toggle.addEventListener('elements:menu:open', () =&gt; { /* ... */ })</code></pre>
		</details>
	</section>

	<section id="use-menu-api">
		<h2>API reference</h2>
		<dl>
			<dt>
				<code>useMenu(toggleRef, menuRef, options?): UseMenuReturn</code>
			</dt>
			<dd>
				Composable. <code>toggleRef</code> must point at a focusable element (typically a
				<code>&lt;button&gt;</code>); <code>menuRef</code> must point at an
				<code>HTMLMenuElement</code> (the factory throws otherwise — the
				<code>&lt;menu&gt;</code> tag is reserved for the dropdown / context-menu pattern). For a
				<code>&lt;ul&gt;</code> or <code>&lt;div&gt;</code> panel, reach for
				<a href="#/use-popover"><code>usePopover</code></a> directly.
			</dd>
			<dt><code>options.placement</code></dt>
			<dd>
				<code>Placement | Ref&lt;Placement&gt;</code> (default <code>'bottom-start'</code>). The
				four sides + eight corner variants. A ref re-anchors live when mutated.
			</dd>
			<dt><code>options.flip</code></dt>
			<dd>
				<code>number</code> (default <code>5</code>). Block-axis cap as a row count (<code
					>flip × 2.25rem</code
				>). <code>0</code> opts out: drops the cap and the block-axis fallback, so the panel scales
				to its content and only flips on the inline axis.
			</dd>
			<dt><code>options.offset</code></dt>
			<dd>
				<code>number</code> in pixels (default <code>2</code>). Visual gap between the trigger and
				the panel edge.
			</dd>
			<dt><code>options.strategy</code></dt>
			<dd>
				<code>'absolute' | 'fixed'</code> (default <code>'absolute'</code>). Forwarded to the
				underlying popover; <code>'fixed'</code> escapes any positioned ancestor's clipping.
			</dd>
			<dt><code>options.dismiss</code></dt>
			<dd>
				<code>{ outside?, escape?, inside? }</code>. All three default to <code>true</code>.
				<code>outside</code> = click-outside dismiss; <code>escape</code> = Escape key dismiss;
				<code>inside</code> = click on a menu item dismisses (the item's own click handler still
				runs).
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close? }</code>. <code>show</code> + <code>hide</code> are
				cancellable (call <code>preventDefault()</code> on the event); <code>open</code> +
				<code>close</code> fire after the transition.
			</dd>
			<dt><code>UseMenuReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Mirrors the panel's open state for template
				bindings.
			</dd>
			<dt><code>UseMenuReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>
				Programmatic lifecycle. Honors the same cancellable-event contract — calling
				<code>preventDefault()</code> in <code>on.show</code> aborts a programmatic open just as it
				does a click-driven one.
			</dd>
			<dt><code>UseMenuReturn.update()</code></dt>
			<dd>
				Manually re-apply the placement (rare — useful after the panel's content changes its size,
				e.g. async items landing).
			</dd>
		</dl>
		<p>
			Cross-references: <a href="#/menu">MenuPage</a> for every <code>&lt;menu&gt;</code> context's
			chrome (toolbar, nav-rail, TOC, dropdown surface).
			<a href="#/use-popover">UsePopoverPage</a> for the underlying popover composable.
			<a href="#/placements">PlacementsPage</a> for the placement vocabulary.
		</p>
	</section>
</template>

<style scoped>
.showcase-placement-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.375rem;
	margin: 0 0 1rem;
	padding: 0;
	list-style: none;
	max-inline-size: 24rem;
}

.showcase-placement-grid button {
	inline-size: 100%;
	font-family: var(--font-mono, monospace);
	font-size: 0.75rem;
}

.showcase-placement-grid button.active {
	background: color-mix(in oklch, var(--color-primary) 18%, var(--color-canvas));
	color: var(--color-primary-text-emphasis);
	border-color: color-mix(in oklch, var(--color-primary) 40%, var(--color-border));
}

.showcase-dropdown-stage {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 0.75rem;
	padding-block: 4rem;
	padding-inline: 2rem;
	border: 1px dashed var(--color-border);
	border-radius: 0.5rem;
	background: color-mix(in oklch, var(--color-canvas-strong) 50%, var(--color-canvas));
	margin-block-end: 1rem;
}

.showcase-filter-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-block: 0.25rem;
	cursor: pointer;
}
</style>
