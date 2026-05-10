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

// Variant popovers — same composable, different `<aside class>` per
// variant for tinted chrome (variants come from the framework's
// shared modifier vocabulary).
const variantAnchors = {
	primary: ref<HTMLElement | null>(null),
	success: ref<HTMLElement | null>(null),
	warning: ref<HTMLElement | null>(null),
	danger: ref<HTMLElement | null>(null),
}
const variantPanels = {
	primary: ref<HTMLElement | null>(null),
	success: ref<HTMLElement | null>(null),
	warning: ref<HTMLElement | null>(null),
	danger: ref<HTMLElement | null>(null),
}
usePopover({
	anchor: variantAnchors.primary,
	panel: variantPanels.primary,
	placement: 'top',
	trigger: { click: true },
})
usePopover({
	anchor: variantAnchors.success,
	panel: variantPanels.success,
	placement: 'top',
	trigger: { click: true },
})
usePopover({
	anchor: variantAnchors.warning,
	panel: variantPanels.warning,
	placement: 'top',
	trigger: { click: true },
})
usePopover({
	anchor: variantAnchors.danger,
	panel: variantPanels.danger,
	placement: 'top',
	trigger: { click: true },
})

// Manual show / hide — `trigger: {}` opts out of auto-binding so the
// only way to open / close is via the API.
const manualAnchor = ref<HTMLElement | null>(null)
const manualPanel = ref<HTMLElement | null>(null)
const manual = usePopover({
	anchor: manualAnchor,
	panel: manualPanel,
	placement: 'top',
	trigger: {},
})

// Dismiss-on-outside disabled — clicks outside the panel don't close it.
// Useful when the popover hosts a confirmation flow that the user must
// commit to via an explicit button.
const stickyAnchor = ref<HTMLElement | null>(null)
const stickyPanel = ref<HTMLElement | null>(null)
const sticky = usePopover({
	anchor: stickyAnchor,
	panel: stickyPanel,
	placement: 'top',
	trigger: { click: true },
	dismiss: { outside: false },
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

		<section id="variants">
			<h2>Contextual variants</h2>
			<p class="showcase-caption">
				The popover panel is just an <code>&lt;aside&gt;</code> — variant classes tint it to match
				the framework's shared colour vocabulary.
			</p>
			<div class="showcase-row">
				<button
					:ref="(el) => (variantAnchors.primary.value = el as HTMLElement | null)"
					type="button"
				>
					Primary
				</button>
				<button
					:ref="(el) => (variantAnchors.success.value = el as HTMLElement | null)"
					type="button"
				>
					Success
				</button>
				<button
					:ref="(el) => (variantAnchors.warning.value = el as HTMLElement | null)"
					type="button"
				>
					Warning
				</button>
				<button
					:ref="(el) => (variantAnchors.danger.value = el as HTMLElement | null)"
					type="button"
				>
					Danger
				</button>
			</div>
			<aside
				:ref="(el) => (variantPanels.primary.value = el as HTMLElement | null)"
				popover
				class="primary top"
			>
				<strong>Primary</strong>
				<p>Tinted to the primary variant.</p>
			</aside>
			<aside
				:ref="(el) => (variantPanels.success.value = el as HTMLElement | null)"
				popover
				class="success top"
			>
				<strong>Success</strong>
				<p>Done.</p>
			</aside>
			<aside
				:ref="(el) => (variantPanels.warning.value = el as HTMLElement | null)"
				popover
				class="warning top"
			>
				<strong>Warning</strong>
				<p>Heads up.</p>
			</aside>
			<aside
				:ref="(el) => (variantPanels.danger.value = el as HTMLElement | null)"
				popover
				class="danger top"
			>
				<strong>Danger</strong>
				<p>Stop.</p>
			</aside>
		</section>

		<section id="manual">
			<h2>Manual show / hide</h2>
			<p class="showcase-caption">
				<code>trigger: {}</code> opts out of auto-binding — the only way to open / close is via the
				composable API.
			</p>
			<div class="showcase-row">
				<button ref="manualAnchor" type="button">Anchor</button>
				<button type="button" @click="manual.show()">show()</button>
				<button type="button" @click="manual.hide()">hide()</button>
				<button type="button" @click="manual.toggle()">toggle()</button>
			</div>
			<aside ref="manualPanel" popover class="top">
				Opens / closes only via the API — outside clicks still dismiss (use the rule below to
				disable that too).
			</aside>
		</section>

		<section id="dismiss-disabled">
			<h2>Dismiss-on-outside disabled</h2>
			<p class="showcase-caption">
				<code>dismiss: { outside: false }</code> — clicks outside the panel don't close it. Useful
				for confirmation flows that must be committed via an explicit button.
			</p>
			<button ref="stickyAnchor" type="button">Open sticky popover</button>
			<aside ref="stickyPanel" popover class="warning top">
				<strong>Confirm deletion</strong>
				<p>This action can't be undone.</p>
				<div class="showcase-row">
					<button type="button" @click="sticky.hide()">Cancel</button>
					<button type="button" class="danger" @click="sticky.hide()">Delete</button>
				</div>
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
