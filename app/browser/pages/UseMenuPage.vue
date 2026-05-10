<script lang="ts" setup>
import { ref } from 'vue'
import { useMenu } from '@src/browser'

const basicToggle = ref<HTMLElement | null>(null)
const basicMenu = ref<HTMLMenuElement | null>(null)
const basic = useMenu(basicToggle, basicMenu, { placement: 'bottom-start' })

const selectedToggle = ref<HTMLElement | null>(null)
const selectedMenu = ref<HTMLMenuElement | null>(null)
const selectMenu = useMenu(selectedToggle, selectedMenu, { placement: 'bottom-start' })
const selected = ref('')
const choose = (label: string): void => {
	selected.value = label
	selectMenu.hide()
}

const eventToggle = ref<HTMLElement | null>(null)
const eventMenuRef = ref<HTMLMenuElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const eventMenu = useMenu(eventToggle, eventMenuRef, {
	placement: 'bottom-start',
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
			<h1>useMenu</h1>
			<p>
				Menu / dropdown semantics on top of a <code>&lt;menu popover&gt;</code> panel anchored to a
				<code>&lt;button&gt;</code> toggle. Owns <code>aria-expanded</code>, item-click dismiss, and
				arrow-key roving focus.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useMenu(toggleRef, menuRef, options?): { visible, show(), hide(), toggle(), update() }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic menu</h2>
			<p class="showcase-caption">
				Click the toggle to open. Click outside, press <kbd>Esc</kbd>, or pick an item to dismiss.
			</p>
			<!-- No `@click` here — `useMenu` already wires the toggle's
			     click → `popover.toggle()`. Adding the same handler in
			     the template made the click fire twice (open then close
			     immediately), so the dropdown looked like it never opened. -->
			<button ref="basicToggle" type="button" class="primary">Account</button>
			<menu ref="basicMenu" popover>
				<li><button type="button">Profile</button></li>
				<li><button type="button">Settings</button></li>
				<li><button type="button">Sign out</button></li>
			</menu>
		</section>

		<section id="select">
			<h2>Selection</h2>
			<p class="showcase-caption">
				Items decide what to do — the composable just dismisses. Selected:
				<code>{{ selected || '—' }}</code
				>.
			</p>
			<button ref="selectedToggle" type="button">Pick one</button>
			<menu ref="selectedMenu" popover>
				<li><button type="button" @click="choose('Apple')">Apple</button></li>
				<li><button type="button" @click="choose('Banana')">Banana</button></li>
				<li><button type="button" @click="choose('Cherry')">Cherry</button></li>
			</menu>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<button ref="eventToggle" type="button">Open me</button>
			<menu ref="eventMenuRef" popover>
				<li><button type="button">Item one</button></li>
				<li><button type="button">Item two</button></li>
			</menu>
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
						<td><code>'bottom-start'</code></td>
					</tr>
					<tr>
						<td><code>strategy</code></td>
						<td><code>'absolute' | 'fixed'</code></td>
						<td><code>'absolute'</code></td>
					</tr>
					<tr>
						<td><code>offset</code></td>
						<td><code>number</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>flip</code></td>
						<td><code>number</code></td>
						<td><code>5</code></td>
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
					<tr>
						<td><code>dismiss.inside</code></td>
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
						<td><code>elements:menu:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:menu:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:menu:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:menu:close</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
