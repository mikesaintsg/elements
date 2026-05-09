<script lang="ts" setup>
import { ref } from 'vue'
import { usePopover } from '@src/browser'
import type { Placement } from '@src/browser'

const popAnchor = ref<HTMLElement | null>(null)
const popPanel = ref<HTMLElement | null>(null)
const pop = usePopover({
	anchor: popAnchor,
	panel: popPanel,
	placement: 'top',
	trigger: { click: true },
})

const placements: readonly Placement[] = ['top', 'end', 'bottom', 'start']
const placement = ref<Placement>('top')
const placedAnchor = ref<HTMLElement | null>(null)
const placedPanel = ref<HTMLElement | null>(null)
const placed = usePopover({
	anchor: placedAnchor,
	panel: placedPanel,
	placement,
	trigger: { click: true },
})
const choose = (value: Placement): void => {
	placement.value = value
	placed.update()
}

const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const evAnchor = ref<HTMLElement | null>(null)
const evPanel = ref<HTMLElement | null>(null)
const ev = usePopover({
	anchor: evAnchor,
	panel: evPanel,
	placement: 'top',
	trigger: { click: true },
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
		place: () => log.value.unshift({ at: stamp(), kind: 'place' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>usePopover</h1>
			<p>
				Anchors a <code>[popover]</code> panel to a trigger element. Drives visibility, placement,
				dismiss-on-outside / dismiss-on-Escape, and emits the popover lifecycle events.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>usePopover({ anchor, panel, arrow?, placement?, trigger?, dismiss?, on? }): { visible, placement, show(), hide(), toggle(), update() }</code></pre>
		</section>

		<section id="basic">
			<h2>Click-trigger popover</h2>
			<p class="showcase-caption">
				Click the trigger to toggle. The framework's anchor-position chrome paints the panel.
			</p>
			<button ref="popAnchor" type="button" class="primary">Show popover</button>
			<aside ref="popPanel" popover class="top">
				<strong>Popover</strong>
				<p>This panel is anchored to the button.</p>
			</aside>
		</section>

		<section id="placement">
			<h2>Reactive placement</h2>
			<p class="showcase-caption">
				Pass a <code>Ref&lt;Placement&gt;</code> as <code>placement</code>; mutating it triggers
				<code>update()</code>.
			</p>
			<div class="showcase-row">
				<button
					v-for="p in placements"
					:key="p"
					type="button"
					:class="{ primary: placement === p }"
					@click="choose(p)"
				>
					{{ p }}
				</button>
			</div>
			<button ref="placedAnchor" type="button">Placement test</button>
			<aside ref="placedPanel" popover :class="placement">
				<strong>Placement: {{ placement }}</strong>
			</aside>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<button ref="evAnchor" type="button">Open me</button>
			<aside ref="evPanel" popover class="top">
				<p>Watch the log below.</p>
			</aside>
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
						<td><code>anchor</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>panel</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>placement</code></td>
						<td><code>Placement | Ref&lt;Placement&gt; | false</code></td>
						<td><code>'bottom'</code></td>
					</tr>
					<tr>
						<td><code>trigger.hover/focus/click</code></td>
						<td><code>boolean</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>dismiss.outside</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
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
						<td><code>elements:popover:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:popover:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:popover:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:popover:close</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:popover:place</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
