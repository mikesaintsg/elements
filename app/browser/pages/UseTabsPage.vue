<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useTabs } from '@src/browser'

const group = ref<HTMLElement | null>(null)
const t1 = ref<HTMLElement | null>(null)
const t2 = ref<HTMLElement | null>(null)
const t3 = ref<HTMLElement | null>(null)
const p1 = ref<HTMLElement | null>(null)
const p2 = ref<HTMLElement | null>(null)
const p3 = ref<HTMLElement | null>(null)
const tab1 = useTabs(t1, { pane: p1, group })
const tab2 = useTabs(t2, { pane: p2, group })
const tab3 = useTabs(t3, { pane: p3, group })

const log = ref<{ at: string; kind: string; tab: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()

const navGroup = ref<HTMLElement | null>(null)
const nt1 = ref<HTMLElement | null>(null)
const nt2 = ref<HTMLElement | null>(null)
const np1 = ref<HTMLElement | null>(null)
const np2 = ref<HTMLElement | null>(null)
const record = (tab: string) => ({
	show: () => log.value.unshift({ at: stamp(), kind: 'show', tab }),
	open: () => log.value.unshift({ at: stamp(), kind: 'open', tab }),
	hide: () => log.value.unshift({ at: stamp(), kind: 'hide', tab }),
	close: () => log.value.unshift({ at: stamp(), kind: 'close', tab }),
})
const nav1 = useTabs(nt1, { pane: np1, group: navGroup, on: record('Profile') })
const nav2 = useTabs(nt2, { pane: np2, group: navGroup, on: record('Settings') })
const activeNav = computed(() =>
	nav1.active.value ? 'Profile' : nav2.active.value ? 'Settings' : '—',
)
</script>

<template>
	<section>
		<header>
			<h1>useTabs</h1>
			<p>
				Wires ONE trigger to ONE pane within a <code>[role="tablist"]</code> group. Sibling triggers
				coordinate via DOM events — no shared registry.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useTabs(triggerRef, { pane, group, on? }): { active, show(), hide(), toggle() }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic tabs</h2>
			<p class="showcase-caption">
				Each tab is a <code>&lt;button role="tab"&gt;</code> trigger. Pane visibility tracks
				<code>[data-tab-open]</code>.
			</p>
			<menu ref="group" role="tablist">
				<button ref="t1" type="button" @click="tab1.show()">Profile</button>
				<button ref="t2" type="button" @click="tab2.show()">Settings</button>
				<button ref="t3" type="button" @click="tab3.show()">Activity</button>
			</menu>
			<section
				ref="p1"
				role="tabpanel"
				:data-tab-open="tab1.active.value || undefined"
				:hidden="!tab1.active.value"
			>
				<p>Profile pane content.</p>
			</section>
			<section
				ref="p2"
				role="tabpanel"
				:data-tab-open="tab2.active.value || undefined"
				:hidden="!tab2.active.value"
			>
				<p>Settings pane content.</p>
			</section>
			<section
				ref="p3"
				role="tabpanel"
				:data-tab-open="tab3.active.value || undefined"
				:hidden="!tab3.active.value"
			>
				<p>Activity pane content.</p>
			</section>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				Active: <code>{{ activeNav }}</code
				>. Switch tabs to watch <code>show → open</code> and <code>hide → close</code> pairs.
			</p>
			<menu ref="navGroup" role="tablist">
				<button ref="nt1" type="button" @click="nav1.show()">Profile</button>
				<button ref="nt2" type="button" @click="nav2.show()">Settings</button>
			</menu>
			<section
				ref="np1"
				role="tabpanel"
				:data-tab-open="nav1.active.value || undefined"
				:hidden="!nav1.active.value"
			>
				<p>Profile content.</p>
			</section>
			<section
				ref="np2"
				role="tabpanel"
				:data-tab-open="nav2.active.value || undefined"
				:hidden="!nav2.active.value"
			>
				<p>Settings content.</p>
			</section>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> {{ e.tab }} — {{ e.at }}
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
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>pane</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>The <code>[role="tabpanel"]</code> the trigger controls.</td>
					</tr>
					<tr>
						<td><code>group</code></td>
						<td><code>Ref&lt;HTMLElement | null&gt;</code></td>
						<td>The <code>[role="tablist"]</code> wrapper scoping siblings.</td>
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
						<td><code>elements:tabs:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:tabs:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:tabs:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:tabs:close</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
