<script lang="ts" setup>
import { useTheme } from '@src/browser'

const theme = useTheme()
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
