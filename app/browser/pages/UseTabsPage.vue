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
const tab1 = useTabs(t1, { pane: p1, group, initial: true })
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
const nav1 = useTabs(nt1, { pane: np1, group: navGroup, on: record('Profile'), initial: true })
const nav2 = useTabs(nt2, { pane: np2, group: navGroup, on: record('Settings') })
const activeNav = computed(() =>
	nav1.active.value ? 'Profile' : nav2.active.value ? 'Settings' : '—',
)

// Pills variant — uses `.pills` modifier on the tablist for a filled-
// background indicator instead of an underline.
const pillsGroup = ref<HTMLElement | null>(null)
const pt1 = ref<HTMLElement | null>(null)
const pt2 = ref<HTMLElement | null>(null)
const pt3 = ref<HTMLElement | null>(null)
const pp1 = ref<HTMLElement | null>(null)
const pp2 = ref<HTMLElement | null>(null)
const pp3 = ref<HTMLElement | null>(null)
const pill1 = useTabs(pt1, { pane: pp1, group: pillsGroup, initial: true })
const pill2 = useTabs(pt2, { pane: pp2, group: pillsGroup })
const pill3 = useTabs(pt3, { pane: pp3, group: pillsGroup })

// Vertical variant — `.vertical` modifier stacks tabs in a column with
// the indicator on the inline-end edge.
const vertGroup = ref<HTMLElement | null>(null)
const vt1 = ref<HTMLElement | null>(null)
const vt2 = ref<HTMLElement | null>(null)
const vt3 = ref<HTMLElement | null>(null)
const vp1 = ref<HTMLElement | null>(null)
const vp2 = ref<HTMLElement | null>(null)
const vp3 = ref<HTMLElement | null>(null)
const vert1 = useTabs(vt1, { pane: vp1, group: vertGroup, initial: true })
const vert2 = useTabs(vt2, { pane: vp2, group: vertGroup })
const vert3 = useTabs(vt3, { pane: vp3, group: vertGroup })

// Bordered variant — `.bordered` modifier draws a continuous outline
// around the active tab + the panel below.
const bordGroup = ref<HTMLElement | null>(null)
const bt1 = ref<HTMLElement | null>(null)
const bt2 = ref<HTMLElement | null>(null)
const bp1 = ref<HTMLElement | null>(null)
const bp2 = ref<HTMLElement | null>(null)
const bord1 = useTabs(bt1, { pane: bp1, group: bordGroup, initial: true })
const bord2 = useTabs(bt2, { pane: bp2, group: bordGroup })
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

		<section id="pills">
			<h2>Pills</h2>
			<p class="showcase-caption">
				The <code>.pills</code> modifier swaps the underline indicator for a filled tinted
				background — useful for compact toolbars / segmented controls.
			</p>
			<menu ref="pillsGroup" role="tablist" class="pills">
				<button ref="pt1" type="button" @click="pill1.show()">Day</button>
				<button ref="pt2" type="button" @click="pill2.show()">Week</button>
				<button ref="pt3" type="button" @click="pill3.show()">Month</button>
			</menu>
			<section
				ref="pp1"
				role="tabpanel"
				:data-tab-open="pill1.active.value || undefined"
				:hidden="!pill1.active.value"
			>
				<p>Daily breakdown.</p>
			</section>
			<section
				ref="pp2"
				role="tabpanel"
				:data-tab-open="pill2.active.value || undefined"
				:hidden="!pill2.active.value"
			>
				<p>Weekly summary.</p>
			</section>
			<section
				ref="pp3"
				role="tabpanel"
				:data-tab-open="pill3.active.value || undefined"
				:hidden="!pill3.active.value"
			>
				<p>Monthly trend.</p>
			</section>
		</section>

		<section id="vertical">
			<h2>Vertical list-group tabs</h2>
			<p class="showcase-caption">
				The <code>.vertical</code> modifier stacks tabs in a column with the active indicator on the
				inline-end edge. Pair with a side-by-side wrapper to render a settings-style layout.
			</p>
			<div class="showcase-grid">
				<menu ref="vertGroup" role="tablist" class="vertical">
					<button ref="vt1" type="button" @click="vert1.show()">Account</button>
					<button ref="vt2" type="button" @click="vert2.show()">Notifications</button>
					<button ref="vt3" type="button" @click="vert3.show()">Security</button>
				</menu>
				<div>
					<section
						ref="vp1"
						role="tabpanel"
						:data-tab-open="vert1.active.value || undefined"
						:hidden="!vert1.active.value"
					>
						<p>Account settings — name, email, password.</p>
					</section>
					<section
						ref="vp2"
						role="tabpanel"
						:data-tab-open="vert2.active.value || undefined"
						:hidden="!vert2.active.value"
					>
						<p>Notification preferences.</p>
					</section>
					<section
						ref="vp3"
						role="tabpanel"
						:data-tab-open="vert3.active.value || undefined"
						:hidden="!vert3.active.value"
					>
						<p>Two-factor authentication, sessions, devices.</p>
					</section>
				</div>
			</div>
		</section>

		<section id="bordered">
			<h2>Bordered tabs</h2>
			<p class="showcase-caption">
				The <code>.bordered</code> modifier paints a continuous outline around the active tab so the
				tab + the panel below read as a single bordered shape.
			</p>
			<menu ref="bordGroup" role="tablist" class="bordered">
				<button ref="bt1" type="button" @click="bord1.show()">Overview</button>
				<button ref="bt2" type="button" @click="bord2.show()">Details</button>
			</menu>
			<section
				ref="bp1"
				role="tabpanel"
				:data-tab-open="bord1.active.value || undefined"
				:hidden="!bord1.active.value"
				style="border: 1px solid var(--color-border); border-block-start: 0; padding: 1rem"
			>
				<p>Overview pane content sits inside a bordered card.</p>
			</section>
			<section
				ref="bp2"
				role="tabpanel"
				:data-tab-open="bord2.active.value || undefined"
				:hidden="!bord2.active.value"
				style="border: 1px solid var(--color-border); border-block-start: 0; padding: 1rem"
			>
				<p>Details pane content sits inside a bordered card.</p>
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
