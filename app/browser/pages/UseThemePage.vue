<script lang="ts" setup>
import { ref } from 'vue'
import { useTheme } from '@src/browser'

const theme = useTheme()

// Singleton — proves both refs return the SAME reactive ref. Mutating
// one should immediately propagate to the other.
const themeAlt = useTheme()

// Change log — listen on the theme's `change` event to trace every
// transition.
const log = ref<{ at: string; mode: string; setting: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
if (typeof document !== 'undefined') {
	document.documentElement.addEventListener('elements:theme:change', (event) => {
		const detail = (event as CustomEvent).detail as { mode: string; setting: string }
		log.value.unshift({
			at: stamp(),
			mode: detail.mode,
			setting: detail.setting,
		})
		if (log.value.length > 20) log.value.length = 20
	})
}
</script>

<template>
	<section>
		<header>
			<h1>useTheme</h1>
			<p>
				Singleton theme controller. Drives <code>html[data-theme]</code> and
				<code>html[data-core]</code>; tracks <code>prefers-color-scheme</code> when the user setting
				is <code>'system'</code>; persists the choice to <code>localStorage</code>.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useTheme(options?): { theme, setting, core, dark, toggle(), apply(setting), select(core) }</code></pre>
		</section>

		<section id="mode">
			<h2>Mode toggle</h2>
			<p class="showcase-caption">
				Resolved mode: <code>{{ theme.theme.value }}</code
				>. User setting: <code>{{ theme.setting.value }}</code
				>.
			</p>
			<div class="showcase-row">
				<button
					type="button"
					:class="{ primary: theme.setting.value === 'light' }"
					@click="theme.apply('light')"
				>
					Light
				</button>
				<button
					type="button"
					:class="{ primary: theme.setting.value === 'dark' }"
					@click="theme.apply('dark')"
				>
					Dark
				</button>
				<button
					type="button"
					:class="{ primary: theme.setting.value === 'system' }"
					@click="theme.apply('system')"
				>
					System
				</button>
				<button type="button" class="ghost" @click="theme.toggle()">toggle()</button>
			</div>
		</section>

		<section id="core">
			<h2>Core (palette)</h2>
			<p class="showcase-caption">
				Core: <code>{{ theme.core.value }}</code
				>. The framework ships one default core; consumers register more via the SCSS theme map.
			</p>
			<div class="showcase-row">
				<button type="button" @click="theme.select('default')">Default</button>
			</div>
		</section>

		<section id="preview">
			<h2>Preview</h2>
			<p class="showcase-caption">
				A grid of swatches that paint the active theme's palette tokens, so the user can see the
				resolved colours change as they toggle the mode / core.
			</p>
			<div
				class="showcase-grid"
				style="
					--grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
					grid-template-columns: var(--grid-template-columns);
				"
			>
				<div
					v-for="v in [
						'primary',
						'secondary',
						'tertiary',
						'success',
						'warning',
						'danger',
						'information',
					]"
					:key="v"
					:style="{
						backgroundColor: `var(--color-${v})`,
						padding: '1rem',
						borderRadius: '0.5rem',
						color: 'white',
						fontFamily: 'monospace',
						fontSize: '0.85em',
					}"
				>
					{{ v }}
				</div>
			</div>
		</section>

		<section id="singleton">
			<h2>Singleton</h2>
			<p class="showcase-caption">
				Calling <code>useTheme()</code> twice returns the SAME reactive controller. The values below
				are read from a second <code>useTheme()</code> instance — they always match the first.
			</p>
			<small>
				instance A mode: <code>{{ theme.theme.value }}</code> · instance B mode:
				<code>{{ themeAlt.theme.value }}</code>
				· same? <code>{{ theme.theme === themeAlt.theme }}</code>
			</small>
		</section>

		<section id="follow-system">
			<h2>Follow system preference</h2>
			<p class="showcase-caption">
				When <code>setting === 'system'</code>, the resolved theme tracks
				<code>prefers-color-scheme</code> live. Open your OS appearance pane and toggle dark / light
				— this badge updates.
			</p>
			<button type="button" class="primary" @click="theme.apply('system')">Set system</button>
			<small>
				setting: <code>{{ theme.setting.value }}</code> · resolved:
				<code>{{ theme.theme.value }}</code>
			</small>
		</section>

		<section id="change-log">
			<h2>Change event log</h2>
			<p class="showcase-caption">
				The factory dispatches <code>elements:theme:change</code> on
				<code>document.documentElement</code> every time the resolved mode flips.
			</p>
			<button type="button" class="ghost small" @click="log = []">clear</button>
			<small v-if="log.length === 0">No events yet — toggle the mode above.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					mode <code>{{ e.mode }}</code> · setting <code>{{ e.setting }}</code> — {{ e.at }}
				</li>
			</ul>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Member</th>
						<th>Type</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>theme</code></td>
						<td><code>Readonly&lt;Ref&lt;'light' | 'dark'&gt;&gt;</code></td>
						<td>Resolved mode applied to <code>&lt;html&gt;</code>.</td>
					</tr>
					<tr>
						<td><code>setting</code></td>
						<td><code>Readonly&lt;Ref&lt;'light' | 'dark' | 'system'&gt;&gt;</code></td>
						<td>Raw user setting.</td>
					</tr>
					<tr>
						<td><code>core</code></td>
						<td><code>Readonly&lt;Ref&lt;string&gt;&gt;</code></td>
						<td>Active palette.</td>
					</tr>
					<tr>
						<td><code>dark</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>True when resolved mode is dark.</td>
					</tr>
					<tr>
						<td><code>toggle()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Flip light ↔ dark.</td>
					</tr>
					<tr>
						<td><code>apply()</code></td>
						<td><code>(setting) =&gt; void</code></td>
						<td>Set the user mode setting.</td>
					</tr>
					<tr>
						<td><code>select()</code></td>
						<td><code>(core) =&gt; void</code></td>
						<td>Switch palette.</td>
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
						<td><code>elements:theme:change</code></td>
						<td><code>{ mode, setting, core }</code></td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
