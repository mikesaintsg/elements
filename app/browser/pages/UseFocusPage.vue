<script lang="ts" setup>
import { ref } from 'vue'
import { useFocus } from '@src/browser'

const trapRef = ref<HTMLElement | null>(null)
const trap = useFocus(trapRef)

const noRestoreRef = ref<HTMLElement | null>(null)
const noRestore = useFocus(noRestoreRef, { restore: false })

const initialRef = ref<HTMLElement | null>(null)
const initialBtn = ref<HTMLButtonElement | null>(null)
const initial = useFocus(initialRef, {
	initial: (host) => host.querySelector('[data-initial]'),
})
</script>

<template>
	<section>
		<header>
			<h1>useFocus</h1>
			<p>
				Focus-management composable. Confines <kbd>Tab</kbd> navigation to focusable descendants of
				the host while active and restores the previous focus on deactivation.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useFocus(elementRef, { initial?, restore? }): { active, activate(), deactivate() }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic trap</h2>
			<p class="showcase-caption">
				Click <em>Activate</em>, then press <kbd>Tab</kbd> repeatedly — focus wraps inside the
				bordered box. Click <em>Deactivate</em> to release; focus restores to the trigger.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="trap.activate()">Activate</button>
				<button type="button" @click="trap.deactivate()">Deactivate</button>
				<small
					>active = <code>{{ trap.active.value }}</code></small
				>
			</div>
			<div
				ref="trapRef"
				:style="{
					padding: '1.5rem',
					border: '2px solid var(--color-border, #ccc)',
					borderRadius: '0.5rem',
					marginBlockStart: '0.75rem',
				}"
			>
				<div class="showcase-row">
					<button type="button">First</button>
					<input placeholder="An input" />
					<a href="#">A link</a>
					<button type="button">Last</button>
				</div>
			</div>
		</section>

		<section id="initial">
			<h2>Initial focus target</h2>
			<p class="showcase-caption">
				Pass <code>initial</code> to set which descendant gets focus on activate (default: the first
				focusable). The <em>Confirm</em> button below is the explicit initial target.
			</p>
			<button type="button" class="primary" @click="initial.activate()">Open</button>
			<button type="button" @click="initial.deactivate()">Close</button>
			<div
				ref="initialRef"
				:style="{
					padding: '1.5rem',
					border: '2px solid var(--color-border, #ccc)',
					borderRadius: '0.5rem',
					marginBlockStart: '0.75rem',
				}"
			>
				<input placeholder="Don't focus me first" />
				<button ref="initialBtn" type="button" class="primary" data-initial>
					Confirm (initial)
				</button>
				<button type="button">Cancel</button>
			</div>
		</section>

		<section id="restore">
			<h2>Skip focus restore</h2>
			<p class="showcase-caption">
				With <code>restore: false</code> deactivation does not return focus to the previously
				focused element.
			</p>
			<button type="button" @click="noRestore.activate()">Activate (no restore)</button>
			<button type="button" @click="noRestore.deactivate()">Deactivate</button>
			<div
				ref="noRestoreRef"
				:style="{
					padding: '1.5rem',
					border: '2px solid var(--color-border, #ccc)',
					borderRadius: '0.5rem',
					marginBlockStart: '0.75rem',
				}"
			>
				<button type="button">A</button>
				<button type="button">B</button>
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
						<td><code>initial</code></td>
						<td><code>HTMLElement | (host) =&gt; HTMLElement | null</code></td>
						<td>Initial focus target. Defaults to first focusable.</td>
					</tr>
					<tr>
						<td><code>restore</code></td>
						<td><code>boolean</code></td>
						<td>Restore previous focus on deactivate. Default <code>true</code>.</td>
					</tr>
				</tbody>
			</table>
			<h3>Returns</h3>
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
						<td><code>active</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>Trap state.</td>
					</tr>
					<tr>
						<td><code>activate()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Stores the current focus then focuses the initial target.</td>
					</tr>
					<tr>
						<td><code>deactivate()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Releases the trap and (optionally) restores focus.</td>
					</tr>
				</tbody>
			</table>
			<h3>Notes</h3>
			<ul>
				<li>
					Element-agnostic — pair with any container holding at least one focusable descendant.
				</li>
				<li>
					<kbd>Tab</kbd> on the last element wraps to the first; <kbd>Shift</kbd>+<kbd>Tab</kbd> on
					the first wraps to the last.
				</li>
				<li>
					Extracted from mailbox's <code>useModal</code> focus-trap loop;
					<code>useDialog</code> uses native <code>showModal()</code> trap and does not call
					<code>useFocus</code>.
				</li>
			</ul>
		</section>
	</section>
</template>
