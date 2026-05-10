<script lang="ts" setup>
import { ref } from 'vue'
import { useSelect } from '@src/browser'

const toggleRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLMenuElement | null>(null)
const sel = useSelect(toggleRef, { menu: menuRef, value: 'apple' })

const multiToggle = ref<HTMLElement | null>(null)
const multiMenu = ref<HTMLMenuElement | null>(null)
const multi = useSelect(multiToggle, { menu: multiMenu, multiple: true })

const comboToggle = ref<HTMLElement | null>(null)
const comboInput = ref<HTMLInputElement | null>(null)
const comboMenu = ref<HTMLMenuElement | null>(null)
const combo = useSelect(comboToggle, {
	menu: comboMenu,
	input: comboInput,
	autocomplete: true,
})

// Flip threshold — `flip: 0` opts out of the row-count-based block-axis
// flip (the menu always opens downward and may scroll if it overflows
// the viewport). The default is `5` rows, which means menus over 5 rows
// flip upward when there's not enough room below.
const flipNeverToggle = ref<HTMLElement | null>(null)
const flipNeverMenu = ref<HTMLMenuElement | null>(null)
useSelect(flipNeverToggle, { menu: flipNeverMenu, flip: 0 })

const flipDefaultToggle = ref<HTMLElement | null>(null)
const flipDefaultMenu = ref<HTMLMenuElement | null>(null)
useSelect(flipDefaultToggle, { menu: flipDefaultMenu })

const longList = Array.from({ length: 30 }, (_, i) => `Option ${i + 1}`)

// Lifecycle event log — show / open / hide / close / select.
const eventToggle = ref<HTMLElement | null>(null)
const eventMenu = ref<HTMLMenuElement | null>(null)
const log = ref<{ at: string; kind: string; payload?: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
useSelect(eventToggle, {
	menu: eventMenu,
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
		select: (event) =>
			log.value.unshift({
				at: stamp(),
				kind: 'select',
				payload: event.detail?.value ?? '',
			}),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useSelect</h1>
			<p>
				Listbox / combobox composable. Wires a toggle, a <code>&lt;menu&gt;</code> listbox, and an
				optional native <code>&lt;select&gt;</code> mirror or combobox <code>&lt;input&gt;</code>
				together.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useSelect(toggleRef, { menu, native?, input?, multiple?, autocomplete?, value?, ... }): { visible, value, values, query, show(), hide(), toggle(), select(), clear(), update() }</code></pre>
		</section>

		<section id="basic">
			<h2>Single-select</h2>
			<p class="showcase-caption">
				Click the toggle, pick an option. Selected: <code>{{ sel.value.value ?? '—' }}</code
				>.
			</p>
			<!-- Wrapped in `.select` so the menu can size to the
			     toggle's full width (mailbox `.select` pattern). The toggle
			     itself uses `.select-toggle` to get the chevron
			     and full-width layout. -->
			<div class="select">
				<button ref="toggleRef" type="button" class="select-toggle">
					<span class="select-value">{{ sel.value.value ?? 'Pick fruit' }}</span>
				</button>
				<menu ref="menuRef" popover class="select-menu">
					<li><button type="button" data-value="apple">Apple</button></li>
					<li><button type="button" data-value="banana">Banana</button></li>
					<li><button type="button" data-value="cherry">Cherry</button></li>
				</menu>
			</div>
		</section>

		<section id="multi">
			<h2>Multi-select</h2>
			<p class="showcase-caption">
				Selected: <code>{{ multi.values.value.join(', ') || '—' }}</code
				>.
			</p>
			<div class="select">
				<button ref="multiToggle" type="button" class="select-toggle">
					<span class="select-value">
						{{ multi.values.value.length ? multi.values.value.join(', ') : 'Choose colours' }}
					</span>
				</button>
				<menu ref="multiMenu" popover class="select-menu">
					<li><button type="button" data-value="red">Red</button></li>
					<li><button type="button" data-value="green">Green</button></li>
					<li><button type="button" data-value="blue">Blue</button></li>
				</menu>
			</div>
		</section>

		<section id="combo">
			<h2>Combobox (autocomplete)</h2>
			<p class="showcase-caption">
				Same shape as a single-select — one toggle button with the chevron — but the dropdown menu's
				first row is a <code>&lt;li class="select-search"&gt;</code> hosting the filter
				<code>&lt;input&gt;</code>. The composable promotes the toggle to
				<code>role="combobox"</code> and substring-filters options as the user types. Query:
				<code>{{ combo.query.value || '—' }}</code
				>.
			</p>
			<div class="select">
				<button ref="comboToggle" type="button" class="select-toggle">
					<span class="select-value">{{ combo.value.value ?? 'Pick a fruit' }}</span>
				</button>
				<menu ref="comboMenu" popover class="select-menu">
					<li class="select-search">
						<input ref="comboInput" type="text" placeholder="Filter…" />
					</li>
					<li><button type="button" data-value="apple">Apple</button></li>
					<li><button type="button" data-value="apricot">Apricot</button></li>
					<li><button type="button" data-value="avocado">Avocado</button></li>
					<li><button type="button" data-value="banana">Banana</button></li>
					<li><button type="button" data-value="blueberry">Blueberry</button></li>
				</menu>
			</div>
		</section>

		<section id="flip">
			<h2>Flip threshold</h2>
			<p class="showcase-caption">
				Two long-list selects side-by-side: the first has <code>flip: 0</code> (never flips — the
				menu opens downward even if it overflows the viewport), the second uses the default
				<code>flip: 5</code> (any menu over 5 rows flips upward when there's no room). Scroll the
				page so each toggle sits near the bottom edge to see the difference.
			</p>
			<div class="showcase-grid">
				<div class="select">
					<button ref="flipNeverToggle" type="button" class="select-toggle">
						<span class="select-value">flip: 0</span>
					</button>
					<menu ref="flipNeverMenu" popover class="select-menu">
						<li v-for="o in longList" :key="o">
							<button type="button" :data-value="o">{{ o }}</button>
						</li>
					</menu>
				</div>
				<div class="select">
					<button ref="flipDefaultToggle" type="button" class="select-toggle">
						<span class="select-value">flip: 5 (default)</span>
					</button>
					<menu ref="flipDefaultMenu" popover class="select-menu">
						<li v-for="o in longList" :key="o">
							<button type="button" :data-value="o">{{ o }}</button>
						</li>
					</menu>
				</div>
			</div>
		</section>

		<section id="events">
			<h2>Lifecycle event log</h2>
			<p class="showcase-caption">
				Open the listbox, pick a value, dismiss it — every transition emits a namespaced event.
				<code>select</code> carries the chosen value in <code>event.detail.value</code>.
			</p>
			<div class="select">
				<button ref="eventToggle" type="button" class="select-toggle">
					<span class="select-value">Pick fruit</span>
				</button>
				<menu ref="eventMenu" popover class="select-menu">
					<li><button type="button" data-value="apple">Apple</button></li>
					<li><button type="button" data-value="banana">Banana</button></li>
					<li><button type="button" data-value="cherry">Cherry</button></li>
				</menu>
			</div>
			<button type="button" class="ghost small" @click="log = []">clear log</button>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> {{ e.payload ?? '' }} — {{ e.at }}
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
						<td><code>menu</code></td>
						<td><code>Ref&lt;HTMLMenuElement | null&gt;</code></td>
						<td>The listbox panel.</td>
					</tr>
					<tr>
						<td><code>native</code></td>
						<td><code>Ref&lt;HTMLSelectElement | null&gt;</code></td>
						<td>Optional native mirror.</td>
					</tr>
					<tr>
						<td><code>input</code></td>
						<td><code>Ref&lt;HTMLInputElement | null&gt;</code></td>
						<td>Optional combobox input.</td>
					</tr>
					<tr>
						<td><code>multiple</code></td>
						<td><code>boolean</code></td>
						<td>Multi-select mode.</td>
					</tr>
					<tr>
						<td><code>autocomplete</code></td>
						<td><code>boolean</code></td>
						<td>Filter options by query.</td>
					</tr>
					<tr>
						<td><code>value</code></td>
						<td><code>string</code></td>
						<td>Initial selection.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:select:show</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>elements:select:open</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>elements:select:hide</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>elements:select:close</code></td>
						<td>—</td>
					</tr>
					<tr>
						<td><code>elements:select:select</code></td>
						<td><code>{ value, values }</code></td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
