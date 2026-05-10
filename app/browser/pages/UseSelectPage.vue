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
				Pass an <code>input</code> ref + <code>autocomplete: true</code> to filter options as the
				user types. Query: <code>{{ combo.query.value || '—' }}</code
				>.
			</p>
			<!-- Combobox: input + caret button sit in a single row;
			     `.select-combo` lays them flush with the menu
			     anchor centred under the input/caret pair. -->
			<div class="select combo">
				<input ref="comboInput" type="text" class="select-input" placeholder="Type to filter…" />
				<button ref="comboToggle" type="button" class="select-caret" aria-label="Open options">
					▾
				</button>
				<menu ref="comboMenu" popover class="select-menu">
					<li><button type="button" data-value="apple">Apple</button></li>
					<li><button type="button" data-value="apricot">Apricot</button></li>
					<li><button type="button" data-value="avocado">Avocado</button></li>
					<li><button type="button" data-value="banana">Banana</button></li>
					<li><button type="button" data-value="blueberry">Blueberry</button></li>
				</menu>
			</div>
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
