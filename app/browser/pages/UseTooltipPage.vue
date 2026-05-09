<script lang="ts" setup>
import { ref } from 'vue'
import { useTooltip } from '@src/browser'
import type { Placement } from '@src/browser'

const a = ref<HTMLElement | null>(null)
const p = ref<HTMLElement | null>(null)
const tip = useTooltip({ anchor: a, panel: p, placement: 'top' })

const placements: readonly Placement[] = ['top', 'end', 'bottom', 'start']

const delayed = ref<HTMLElement | null>(null)
const delayedPanel = ref<HTMLElement | null>(null)
useTooltip({
	anchor: delayed,
	panel: delayedPanel,
	placement: 'top',
	delay: { show: 600, hide: 100 },
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
				handle the math.
			</p>
			<div class="showcase-row">
				<template v-for="pl in placements" :key="pl">
					<button :id="`tt-${pl}`" type="button">{{ pl }}</button>
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
