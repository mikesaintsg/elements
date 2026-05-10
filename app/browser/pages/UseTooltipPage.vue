<script lang="ts" setup>
import { ref } from 'vue'
import { useTooltip } from '@src/browser'
import type { Placement } from '@src/browser'

const a = ref<HTMLElement | null>(null)
const p = ref<HTMLElement | null>(null)
const tip = useTooltip({ anchor: a, panel: p, placement: 'top' })

const placements: readonly Placement[] = ['top', 'end', 'bottom', 'start']

// One anchor + panel ref per placement so each button hovers its own
// tooltip with the matching `class="{placement}"` on the panel. The
// placement modifier (top / end / bottom / start) is what tells the
// framework's anchor-position rules which side to land the tooltip on.
const placementAnchors = {
	top: ref<HTMLElement | null>(null),
	end: ref<HTMLElement | null>(null),
	bottom: ref<HTMLElement | null>(null),
	start: ref<HTMLElement | null>(null),
}
const placementPanels = {
	top: ref<HTMLElement | null>(null),
	end: ref<HTMLElement | null>(null),
	bottom: ref<HTMLElement | null>(null),
	start: ref<HTMLElement | null>(null),
}
for (const pl of placements) {
	useTooltip({ anchor: placementAnchors[pl], panel: placementPanels[pl], placement: pl })
}

const delayed = ref<HTMLElement | null>(null)
const delayedPanel = ref<HTMLElement | null>(null)
useTooltip({
	anchor: delayed,
	panel: delayedPanel,
	placement: 'top',
	delay: { show: 600, hide: 100 },
})

// Programmatic control — anchor + show()/hide()/toggle() called from buttons.
const programmaticAnchor = ref<HTMLElement | null>(null)
const programmaticPanel = ref<HTMLElement | null>(null)
const programmatic = useTooltip({
	anchor: programmaticAnchor,
	panel: programmaticPanel,
	placement: 'top',
})

// Content shapes — different inner content (image, formatted text, list).
const richAnchor = ref<HTMLElement | null>(null)
const richPanel = ref<HTMLElement | null>(null)
useTooltip({ anchor: richAnchor, panel: richPanel, placement: 'top' })

// Inside scrollable container — verifies the anchor positioning
// follows the trigger as the surrounding scroller moves.
const scrollableAnchor = ref<HTMLElement | null>(null)
const scrollablePanel = ref<HTMLElement | null>(null)
useTooltip({
	anchor: scrollableAnchor,
	panel: scrollablePanel,
	placement: 'top',
})

// Lifecycle log — show / open / hide / close events.
const logAnchor = ref<HTMLElement | null>(null)
const logPanel = ref<HTMLElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
useTooltip({
	anchor: logAnchor,
	panel: logPanel,
	placement: 'top',
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useTooltip</h1>
			<p>
				Hover / focus tooltip on top of a <code>[popover]</code> panel. Tags the panel with
				<code>role="tooltip"</code>, attaches hover + focus triggers, and exposes
				<code>show / hide / toggle</code> for programmatic control.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useTooltip({ anchor, panel, arrow?, placement?, delay?, dismiss?, on? }): { visible, placement, show(), hide(), toggle(), update() }</code></pre>
		</section>

		<section id="basic">
			<h2>Hover / focus tooltip</h2>
			<p class="showcase-caption">
				Hover or tab onto the trigger; the tooltip surfaces from the cascade-layer
				<code>[popover]</code> chrome.
			</p>
			<button ref="a" type="button">Hover me</button>
			<aside ref="p" popover role="tooltip" class="top">Tooltip body.</aside>
			<small
				>visible = <code>{{ tip.visible.value }}</code></small
			>
		</section>

		<section id="placements">
			<h2>Placements</h2>
			<p class="showcase-caption">
				Each placement value just sets the popover's class. The framework's anchor-position rules
				handle the math — hover each button to see its tooltip surface on the matching side.
			</p>
			<div class="showcase-row">
				<template v-for="pl in placements" :key="pl">
					<button
						:ref="(el) => (placementAnchors[pl].value = el as HTMLElement | null)"
						type="button"
					>
						{{ pl }}
					</button>
					<aside
						:ref="(el) => (placementPanels[pl].value = el as HTMLElement | null)"
						popover
						role="tooltip"
						:class="pl"
					>
						{{ pl }} placement
					</aside>
				</template>
			</div>
		</section>

		<section id="delay">
			<h2>Show / hide delay</h2>
			<p class="showcase-caption">
				600ms show delay, 100ms hide delay — feels like macOS-style menu chrome.
			</p>
			<button ref="delayed" type="button">Hover slowly</button>
			<aside ref="delayedPanel" popover role="tooltip" class="top">Delayed.</aside>
		</section>

		<section id="programmatic">
			<h2>Programmatic control</h2>
			<p class="showcase-caption">
				Trigger the tooltip from any other action — useful for "what changed?" indicators that
				surface a tooltip when an upstream value mutates.
			</p>
			<div class="showcase-row">
				<button ref="programmaticAnchor" type="button">Anchor</button>
				<button type="button" @click="programmatic.show()">show()</button>
				<button type="button" @click="programmatic.hide()">hide()</button>
				<button type="button" @click="programmatic.toggle()">toggle()</button>
			</div>
			<aside ref="programmaticPanel" popover role="tooltip" class="top">
				Triggered programmatically.
			</aside>
		</section>

		<section id="content">
			<h2>Content shapes</h2>
			<p class="showcase-caption">
				The tooltip panel accepts any HTML — not just text. Headings, lists, even buttons (for
				nested controls) all work.
			</p>
			<button ref="richAnchor" type="button">Hover for rich content</button>
			<aside ref="richPanel" popover role="tooltip" class="top">
				<strong>Storage</strong>
				<ul>
					<li>Used: 4.2 GB</li>
					<li>Free: 11.8 GB</li>
					<li>Total: 16 GB</li>
				</ul>
			</aside>
		</section>

		<section id="scrollable">
			<h2>Inside a scrollable container</h2>
			<p class="showcase-caption">
				Verifies the tooltip's anchor positioning follows the trigger as the surrounding scroller
				moves. Open the tooltip, then scroll the panel.
			</p>
			<div
				style="
					block-size: 8rem;
					overflow-y: auto;
					border: 1px solid var(--color-border);
					padding: 1rem;
				"
			>
				<p>Scroll me…</p>
				<p>Scroll me…</p>
				<button ref="scrollableAnchor" type="button">Hover me, then scroll</button>
				<p>More content below.</p>
				<p>Even more.</p>
				<p>Keep scrolling.</p>
			</div>
			<aside ref="scrollablePanel" popover role="tooltip" class="top">Stays anchored.</aside>
		</section>

		<section id="lifecycle">
			<h2>Lifecycle event log</h2>
			<p class="showcase-caption">
				<code>show → open → hide → close</code> — same pipeline as <code>useDialog</code> /
				<code>usePopover</code>.
			</p>
			<button ref="logAnchor" type="button">Hover to log</button>
			<aside ref="logPanel" popover role="tooltip" class="top">Watching events.</aside>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> — {{ e.at }}
				</li>
			</ul>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Option</th>
						<th>Type</th>
						<th>Default</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>placement</code></td>
						<td><code>Placement</code></td>
						<td><code>'bottom'</code></td>
					</tr>
					<tr>
						<td><code>delay.show</code></td>
						<td><code>number</code></td>
						<td><code>0</code></td>
					</tr>
					<tr>
						<td><code>delay.hide</code></td>
						<td><code>number</code></td>
						<td><code>0</code></td>
					</tr>
					<tr>
						<td><code>dismiss.escape</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Cancelable</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:tooltip:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:tooltip:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:tooltip:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:tooltip:close</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:tooltip:place</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
