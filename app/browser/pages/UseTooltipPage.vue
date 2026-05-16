<script lang="ts" setup>
/**
 * UseTooltipPage — hover/focus tooltip composable.
 *
 * `useTooltip({ anchor, panel, arrow?, placement?, delay?, dismiss? })`
 * is the tooltip-shaped sibling of `usePopover`. Both compose the same
 * anchor-positioning surface and `popover="manual"` top-layer rendering,
 * but `useTooltip` narrows the contract:
 *
 *   - **Triggers are fixed at hover + focus.** Tooltips don't open on
 *     click — clicking the anchor dismisses any open tooltip and
 *     activates whatever the button does. No `trigger` option to
 *     misconfigure.
 *   - **Panel gets `role="tooltip"`.** Surface CSS keys off both
 *     `[popover=hint]` and `[role="tooltip"]` so the tooltip chrome
 *     (smaller, inverted, tight padding) paints automatically.
 *   - **Dismissed on Escape, on outside pointerdown, and on the anchor's
 *     own pointerdown.** No outside-click toggle; the keyboard path
 *     stays open via `dismiss.escape: false`.
 *   - **No `on.show` veto.** Tooltips fire and forget. If you need a
 *     cancellable open, use `usePopover` with a hint-styled panel.
 *
 * Reach for `useTooltip` when:
 *   - Icon-only buttons need a label that doesn't fit inline.
 *   - Truncated text needs the full string available on hover/focus.
 *   - Form inputs need contextual help that doesn't clutter the layout.
 *   - A keyboard user must surface info without a mouse — focus carries
 *     the tooltip the same way hover does.
 *
 * API surface coverage:
 *   1. Hover + focus on icon-only buttons.
 *   2. Delays — comparing fast (50/0) vs slow (400/200).
 *   3. Reactive placement — change where the tooltip lands.
 *   4. Rich content panel — not just a single line of text.
 *   5. Programmatic show/hide — for instructional pulses.
 *
 * Cross-references:
 *   - [UsePopoverPage](#/use-popover) — the click-trigger / cancellable
 *     sibling. Reach for `usePopover` when the panel hosts interactive
 *     content (controls, links you can Tab into); `useTooltip` is for
 *     label-shaped reveals only.
 *   - [PopoverSurfacesPage § hint](#/popover-surfaces) — the CSS chrome
 *     for `[popover=hint]` / `[role="tooltip"]`.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useTooltip } from '@elements/browser'
import type { Placement } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — icon-only button labels (the canonical use case).
// ─────────────────────────────────────────────────────────────────────
const saveAnchor = useTemplateRef<HTMLButtonElement>('saveAnchor')
const savePanel = useTemplateRef<HTMLDivElement>('savePanel')
useTooltip({ anchor: saveAnchor, panel: savePanel, placement: 'bottom' })

const trashAnchor = useTemplateRef<HTMLButtonElement>('trashAnchor')
const trashPanel = useTemplateRef<HTMLDivElement>('trashPanel')
useTooltip({ anchor: trashAnchor, panel: trashPanel, placement: 'bottom' })

const shareAnchor = useTemplateRef<HTMLButtonElement>('shareAnchor')
const sharePanel = useTemplateRef<HTMLDivElement>('sharePanel')
useTooltip({ anchor: shareAnchor, panel: sharePanel, placement: 'bottom' })

const settingsAnchor = useTemplateRef<HTMLButtonElement>('settingsAnchor')
const settingsPanel = useTemplateRef<HTMLDivElement>('settingsPanel')
useTooltip({ anchor: settingsAnchor, panel: settingsPanel, placement: 'bottom' })

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — delay tuning (fast vs slow).
// ─────────────────────────────────────────────────────────────────────
const fastAnchor = useTemplateRef<HTMLButtonElement>('fastAnchor')
const fastPanel = useTemplateRef<HTMLDivElement>('fastPanel')
useTooltip({
	anchor: fastAnchor,
	panel: fastPanel,
	placement: 'top',
	delay: { show: 50, hide: 0 },
})

const slowAnchor = useTemplateRef<HTMLButtonElement>('slowAnchor')
const slowPanel = useTemplateRef<HTMLDivElement>('slowPanel')
useTooltip({
	anchor: slowAnchor,
	panel: slowPanel,
	placement: 'top',
	delay: { show: 400, hide: 200 },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — placement showcase.
// One anchor per side (top / end / bottom / start) so the reader can
// see every placement at once without cycling through one ref. Mirrors
// PopoverSurfacesPage's anchor-positioning section pattern — each
// button hosts its own tooltip, the demo stage has enough padding-block
// for every side to land without `position-try-fallbacks` flipping.
// ─────────────────────────────────────────────────────────────────────
const topAnchor = useTemplateRef<HTMLButtonElement>('topAnchor')
const topPanel = useTemplateRef<HTMLDivElement>('topPanel')
useTooltip({ anchor: topAnchor, panel: topPanel, placement: 'top' })

const endAnchor = useTemplateRef<HTMLButtonElement>('endAnchor')
const endPanel = useTemplateRef<HTMLDivElement>('endPanel')
useTooltip({ anchor: endAnchor, panel: endPanel, placement: 'end' })

const bottomAnchor = useTemplateRef<HTMLButtonElement>('bottomAnchor')
const bottomPanel = useTemplateRef<HTMLDivElement>('bottomPanel')
useTooltip({ anchor: bottomAnchor, panel: bottomPanel, placement: 'bottom' })

const startAnchor = useTemplateRef<HTMLButtonElement>('startAnchor')
const startPanel = useTemplateRef<HTMLDivElement>('startPanel')
useTooltip({ anchor: startAnchor, panel: startPanel, placement: 'start' })

// Reactive-placement demo retained as a smaller section — proves the
// `placement` option accepts a `Ref<Placement>` for consumers that
// want to drive it from external state.
const dynamicPlacement = ref<Placement>('top')
const dynamicAnchor = useTemplateRef<HTMLButtonElement>('dynamicAnchor')
const dynamicPanel = useTemplateRef<HTMLDivElement>('dynamicPanel')
const dynamicTip = useTooltip({
	anchor: dynamicAnchor,
	panel: dynamicPanel,
	placement: dynamicPlacement,
})
import { TOOLTIP_PLACEMENT_SIDES as placementOptions } from '../constants.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — rich content panel.
// ─────────────────────────────────────────────────────────────────────
const richAnchor = useTemplateRef<HTMLButtonElement>('richAnchor')
const richPanel = useTemplateRef<HTMLDivElement>('richPanel')
useTooltip({
	anchor: richAnchor,
	panel: richPanel,
	placement: 'bottom-start',
	delay: { show: 150, hide: 200 },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — programmatic show / hide.
// ─────────────────────────────────────────────────────────────────────
const pulseAnchor = useTemplateRef<HTMLButtonElement>('pulseAnchor')
const pulsePanel = useTemplateRef<HTMLDivElement>('pulsePanel')
const pulseTip = useTooltip({
	anchor: pulseAnchor,
	panel: pulsePanel,
	placement: 'top',
})
const pulsing = ref(false)
const pulse = (): void => {
	pulsing.value = true
	pulseTip.show()
	window.setTimeout(() => {
		pulseTip.hide()
		pulsing.value = false
	}, 1800)
}

// Helper for the state alert.
const anyVisible = computed(() => dynamicTip.visible.value || pulseTip.visible.value)
</script>

<template>
	<section id="use-tooltip-intro">
		<hgroup>
			<h1>useTooltip</h1>
			<p>
				Hover + focus tooltip composable. A narrower sibling of
				<a href="#/use-popover"><code>usePopover</code></a> — same anchor-positioning surface and
				top-layer rendering, but the trigger contract is fixed (hover + focus, no click) and the
				panel automatically gets <code>role="tooltip"</code> so the framework's
				<code>[role="tooltip"]</code> chrome (smaller, inverted, tight padding) paints without
				ceremony.
			</p>
		</hgroup>
		<p>
			Reach for it when an anchor needs a transient label — icon-only buttons, truncated text,
			contextual help on form inputs. Reach for <code>usePopover</code> with a hint-styled panel
			instead when the panel hosts interactive content the user has to Tab into (a link, a control).
			Tooltips dismiss on pointer-down anywhere, including on the anchor itself, which means you
			can't Tab from the anchor into the panel.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				dynamic-placement demo
				<code>{{ dynamicTip.visible.value ? 'visible' : 'hidden' }}</code> · pulse demo
				<code>{{ pulseTip.visible.value ? 'visible' : 'hidden' }}</code>
				<span v-if="anyVisible"> · any visible</span>
			</p>
		</aside>
	</section>

	<section id="use-tooltip-icons">
		<h2>1. Icon-only buttons — the canonical use case</h2>
		<p>
			Icons compress affordances into pixels — clarity costs nothing for a sighted user with a
			mouse, but a keyboard user or a screen reader user needs the label spelled out. The tooltip
			composable supplies it via hover OR focus (Tab through the row to verify).
			<code>aria-label</code> on the button covers the AT case; the tooltip covers the
			sighted-keyboard case where the user wants to confirm before pressing.
		</p>
		<menu class="showcase-icon-row">
			<li>
				<button ref="saveAnchor" type="button" class="icon-only subtle" aria-label="Save">
					💾
				</button>
				<div ref="savePanel" popover>Save (⌘S)</div>
			</li>
			<li>
				<button ref="trashAnchor" type="button" class="icon-only danger subtle" aria-label="Delete">
					🗑
				</button>
				<div ref="trashPanel" popover>Move to trash</div>
			</li>
			<li>
				<button ref="shareAnchor" type="button" class="icon-only subtle" aria-label="Share">
					🔗
				</button>
				<div ref="sharePanel" popover>Copy share link</div>
			</li>
			<li>
				<button ref="settingsAnchor" type="button" class="icon-only subtle" aria-label="Settings">
					⚙️
				</button>
				<div ref="settingsPanel" popover>Open settings</div>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const anchor = useTemplateRef&lt;HTMLButtonElement&gt;('anchor')
const panel = useTemplateRef&lt;HTMLDivElement&gt;('panel')
useTooltip({ anchor, panel, placement: 'bottom' })

// &lt;button ref="anchor" aria-label="Save"&gt;💾&lt;/button&gt;
// &lt;div ref="panel" popover&gt;Save (⌘S)&lt;/div&gt;
//
// The factory writes role="tooltip" + popover="manual" on the panel;
// the framework's surface CSS keys off [role="tooltip"] for chrome.</code></pre>
		</details>
	</section>

	<section id="use-tooltip-delays">
		<h2>2. Delay tuning — fast vs slow</h2>
		<p>
			<code>delay.show</code> kills the open-tear when the cursor sweeps past a row of triggers;
			<code>delay.hide</code> gives the user a beat to read the label before it disappears. The
			right values depend on the surface — terse labels on a toolbar want a quick reveal (50–100
			ms); rich helper text on a sparse layout wants a slower one (300–500 ms) so it doesn't pop on
			every mouse twitch.
		</p>
		<div class="showcase-trigger-row">
			<div>
				<button ref="fastAnchor" type="button">Hover me (fast)</button>
				<div ref="fastPanel" popover><strong>50 ms</strong> show, <strong>0 ms</strong> hide</div>
				<p>
					<small
						>For dense toolbars / pickers where you want labels to keep up with cursor sweep.</small
					>
				</p>
			</div>
			<div>
				<button ref="slowAnchor" type="button">Hover me (slow)</button>
				<div ref="slowPanel" popover>
					<strong>400 ms</strong> show, <strong>200 ms</strong> hide
				</div>
				<p>
					<small>For long-form help — only fires when the user lingers on purpose.</small>
				</p>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>useTooltip({
  anchor, panel,
  placement: 'top',
  delay: { show: 50, hide: 0 },     // fast — dense toolbars
})

useTooltip({
  anchor, panel,
  placement: 'top',
  delay: { show: 400, hide: 200 },  // slow — rich help
})</code></pre>
		</details>
	</section>

	<section id="use-tooltip-placement">
		<h2>3. Placement</h2>
		<p>
			The <code>placement</code> option maps to <code>position-area</code> on the panel —
			<code>top</code>, <code>end</code>, <code>bottom</code>, <code>start</code> (plus the eight
			corner variants <code>top-start</code> / <code>bottom-end</code> / …). Each button below has
			its own tooltip anchored to itself, so you can see every side at once. Hover or focus any of
			them; the tooltip lands where the modifier says.
		</p>
		<div class="showcase-placement-stage">
			<button ref="topAnchor" type="button" class="subtle">.top</button>
			<button ref="endAnchor" type="button" class="subtle">.end</button>
			<button ref="bottomAnchor" type="button" class="subtle">.bottom</button>
			<button ref="startAnchor" type="button" class="subtle">.start</button>
		</div>
		<div ref="topPanel" popover>Placement: <strong>top</strong></div>
		<div ref="endPanel" popover>Placement: <strong>end</strong></div>
		<div ref="bottomPanel" popover>Placement: <strong>bottom</strong></div>
		<div ref="startPanel" popover>Placement: <strong>start</strong></div>

		<h3>Reactive placement via <code>Ref&lt;Placement&gt;</code></h3>
		<p>
			Pass a ref instead of a string and the composable rewrites
			<code>position-area</code> when you mutate the ref. <code>position-try-fallbacks</code> still
			flips on overflow — try placing the tooltip on <code>start</code> while the anchor sits near
			the viewport's left edge.
		</p>
		<menu class="showcase-placement-picker">
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
		<div class="showcase-placement-stage">
			<button ref="dynamicAnchor" type="button">Hover or focus me</button>
		</div>
		<div ref="dynamicPanel" popover>
			Resolved: <strong>{{ dynamicTip.placement.value }}</strong>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>// Static — one tooltip per anchor, each placed on a different side.
useTooltip({ anchor: topRef,    panel: topPanelRef,    placement: 'top' })
useTooltip({ anchor: endRef,    panel: endPanelRef,    placement: 'end' })
useTooltip({ anchor: bottomRef, panel: bottomPanelRef, placement: 'bottom' })
useTooltip({ anchor: startRef,  panel: startPanelRef,  placement: 'start' })

// Reactive — single tooltip, placement driven by external state.
const placement = ref&lt;Placement&gt;('top')
useTooltip({ anchor, panel, placement })</code></pre>
		</details>
	</section>

	<section id="use-tooltip-rich">
		<h2>4. Rich content — beyond a single line</h2>
		<p>
			Tooltips are usually one-liners, but the panel is a real DOM element — anything that renders
			inside an inline popover works. Use rich content sparingly: the user can't Tab into the panel,
			so any link / button you put inside is unreachable for keyboard users (a
			<code>usePopover</code> with hint chrome is the right tool there). Where rich content shines:
			a short structured callout (kbd shortcut, an icon, a colored status pill, a one-line code
			sample).
		</p>
		<div class="showcase-trigger-stage">
			<button ref="richAnchor" type="button">Hover for rich tooltip</button>
		</div>
		<div ref="richPanel" popover class="showcase-rich-tooltip">
			<header class="flex items-center gap-2">
				<span aria-hidden="true">🎹</span>
				<strong>Keyboard shortcut</strong>
			</header>
			<dl>
				<dt>Toggle:</dt>
				<dd><kbd>⌘</kbd>+<kbd>K</kbd></dd>
				<dt>Reset:</dt>
				<dd><kbd>⌘</kbd>+<kbd>R</kbd></dd>
			</dl>
		</div>
	</section>

	<section id="use-tooltip-programmatic">
		<h2>5. Programmatic show / hide — instructional pulses</h2>
		<p>
			<code>show()</code> / <code>hide()</code> / <code>toggle()</code> are available alongside the
			automatic hover + focus triggers. Useful for onboarding moments — pulse a label on a button
			the user hasn't found yet — or for guided tours where the tooltip needs to appear without user
			interaction.
		</p>
		<menu>
			<li>
				<button type="button" :disabled="pulsing" @click="pulse">
					{{ pulsing ? 'Pulsing…' : 'Pulse tooltip' }}
				</button>
			</li>
			<li>
				<button ref="pulseAnchor" type="button" class="subtle">Target button</button>
			</li>
		</menu>
		<div ref="pulsePanel" popover>
			<strong>Try me!</strong>
			<small style="display: block">programmatically shown for 1.8s</small>
		</div>
	</section>

	<section id="use-tooltip-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useTooltip(options): UseTooltipReturn</code></dt>
			<dd>
				Composable. Like <code>usePopover</code> but with hover + focus triggers fixed on, click
				trigger absent, panel automatically tagged with <code>role="tooltip"</code>.
			</dd>
			<dt><code>options.anchor</code> / <code>options.panel</code></dt>
			<dd>
				Required <code>Ref&lt;HTMLElement | null&gt;</code> pair. The factory writes
				<code>popover="manual"</code> + <code>role="tooltip"</code> on the panel.
			</dd>
			<dt><code>options.arrow</code></dt>
			<dd>
				Optional. Author CSS reads <code>panel[data-tooltip-side]</code> for resolved-side chrome.
			</dd>
			<dt><code>options.placement</code></dt>
			<dd>
				<code>Placement | Ref&lt;Placement&gt; | false</code> (default <code>'bottom'</code>). A
				reactive ref re-positions the tooltip on mutation.
			</dd>
			<dt><code>options.delay</code></dt>
			<dd>
				<code>{ show?, hide? }</code> in ms. Defaults to 0 / 0. The hover and focus paths share the
				same delays.
			</dd>
			<dt><code>options.dismiss.escape</code></dt>
			<dd>
				<code>boolean</code> (default <code>true</code>). Escape always closes the tooltip when this
				flag is on. Outside-click dismiss is implicit and not configurable — clicking ANYWHERE
				(including the anchor) closes the tooltip.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>show</code>, <code>open</code>, <code>hide</code>, <code>close</code>,
				<code>place</code>. Same lifecycle as <code>usePopover</code>, BUT <code>show</code> is NOT
				cancellable — calling <code>event.preventDefault()</code> has no effect (tooltips are
				fire-and-forget).
			</dd>
			<dt><code>UseTooltipReturn.visible</code></dt>
			<dd><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Mirrors the panel's open state.</dd>
			<dt><code>UseTooltipReturn.placement</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;Placement&gt;&gt;</code>. The RESOLVED placement after
				`position-try-fallbacks` has flipped (if needed).
			</dd>
			<dt><code>UseTooltipReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>
				Programmatic lifecycle. Honor the same <code>delay</code> values; bypass the hover-out /
				blur cancellation.
			</dd>
			<dt><code>UseTooltipReturn.update()</code></dt>
			<dd>Manually re-apply the placement (after panel content size changes).</dd>
		</dl>
	</section>
</template>

<style scoped>
.showcase-icon-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin: 0;
	padding: 0.75rem;
	list-style: none;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	background: var(--color-canvas-strong);
	inline-size: fit-content;
}

.showcase-icon-row > li {
	display: contents;
}

.showcase-icon-row .icon-only {
	font-size: 1.125rem;
	inline-size: 2.5rem;
	block-size: 2.5rem;
	padding: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.showcase-trigger-row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
	gap: 1.25rem;
}

.showcase-trigger-row > div {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	align-items: flex-start;
}

.showcase-placement-picker {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	margin: 0 0 1rem;
	padding: 0;
	list-style: none;
}

.showcase-placement-picker button {
	min-inline-size: 5rem;
	font-family: var(--font-mono, monospace);
	font-size: 0.75rem;
}

.showcase-placement-picker button.active {
	background: color-mix(in oklch, var(--color-primary) 18%, var(--color-canvas));
	color: var(--color-primary-text-emphasis);
	border-color: color-mix(in oklch, var(--color-primary) 40%, var(--color-border));
}

.showcase-trigger-stage {
	display: flex;
	justify-content: center;
	align-items: center;
	min-block-size: 6rem;
	padding: 1.5rem;
	border: 1px dashed var(--color-border);
	border-radius: 0.5rem;
	background: color-mix(in oklch, var(--color-canvas-strong) 50%, var(--color-canvas));
}

/* Placement showcase — generous padding-block so every side has room
 * to land without `position-try-fallbacks` flipping the tooltip away
 * from the requested side. Mirrors PopoverSurfacesPage §4's stage. */
.showcase-placement-stage {
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

.showcase-rich-tooltip {
	min-inline-size: 14rem;
}

.showcase-rich-tooltip dl {
	display: grid;
	grid-template-columns: auto auto;
	gap: 0.25rem 0.5rem;
	margin: 0.5rem 0 0;
}

.showcase-rich-tooltip dt {
	font-size: 0.75rem;
	opacity: 0.85;
}

.showcase-rich-tooltip dd {
	margin: 0;
	font-size: 0.75rem;
	display: flex;
	align-items: center;
	gap: 0.125rem;
}

.showcase-rich-tooltip kbd {
	font-family: var(--font-mono, monospace);
	font-size: 0.7rem;
	padding-inline: 0.3rem;
	padding-block: 0.05rem;
	border: 1px solid currentColor;
	border-radius: 0.25rem;
	opacity: 0.85;
}
</style>
