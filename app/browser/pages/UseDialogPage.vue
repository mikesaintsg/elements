<script lang="ts" setup>
import { ref } from 'vue'
import { useDialog } from '@src/browser'

const basicRef = ref<HTMLDialogElement | null>(null)
const basic = useDialog(basicRef)

const inlineRef = ref<HTMLDialogElement | null>(null)
const inline = useDialog(inlineRef, { modal: false })

const formRef = ref<HTMLDialogElement | null>(null)
const formName = ref('')
const formEmail = ref('')
const formDialog = useDialog(formRef)
const submitForm = (): void => formDialog.hide()

const staticRef = ref<HTMLDialogElement | null>(null)
const blocks = ref(0)
const staticDialog = useDialog(staticRef, {
	dismiss: { backdrop: 'static' },
	on: {
		prevent: () => {
			blocks.value++
		},
	},
})

const eventRef = ref<HTMLDialogElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const eventDialog = useDialog(eventRef, {
	on: {
		show: () => log.value.unshift({ at: stamp(), kind: 'show' }),
		open: () => log.value.unshift({ at: stamp(), kind: 'open' }),
		hide: () => log.value.unshift({ at: stamp(), kind: 'hide' }),
		close: () => log.value.unshift({ at: stamp(), kind: 'close' }),
	},
})

const smallRef = ref<HTMLDialogElement | null>(null)
const small = useDialog(smallRef)

const largeRef = ref<HTMLDialogElement | null>(null)
const large = useDialog(largeRef)

const fullscreenRef = ref<HTMLDialogElement | null>(null)
const fullscreen = useDialog(fullscreenRef)

const scrollableRef = ref<HTMLDialogElement | null>(null)
const scrollable = useDialog(scrollableRef)
</script>

<template>
	<section>
		<header>
			<h1>useDialog</h1>
			<p>
				Native <code>&lt;dialog&gt;</code> adapter. Owns <code>showModal()</code> /
				<code>show()</code> / <code>close()</code>, body scroll lock, Escape dismiss, and
				backdrop-click dismissal.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useDialog(elementRef, options?): { visible, show(), hide(), toggle() }</code></pre>
		</section>

		<section id="basic">
			<h2>Basic show / hide</h2>
			<p class="showcase-caption">
				Modal dialog promoted to the top-layer with a native <code>::backdrop</code>. Press
				<kbd>Esc</kbd> or click outside to close.
			</p>
			<button type="button" class="primary" @click="basic.show()">Open dialog</button>
			<dialog ref="basicRef">
				<header>
					<h3>Confirm action</h3>
				</header>
				<p>Native <code>&lt;dialog&gt;</code> in the browser top-layer.</p>
				<footer>
					<button type="button" @click="basic.hide()">Cancel</button>
					<button type="button" class="primary" @click="basic.hide()">Confirm</button>
				</footer>
			</dialog>
		</section>

		<section id="sizes">
			<h2>Sizes</h2>
			<p class="showcase-caption">
				The <code>.small</code> and <code>.large</code> modifier classes override the default width
				— small caps to <code>20rem</code>, large stretches to <code>48rem</code>. Both clamp to
				viewport width on phones so neither produces horizontal scroll.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="small.show()">Open small</button>
				<button type="button" class="primary" @click="large.show()">Open large</button>
			</div>
			<dialog ref="smallRef" class="small">
				<header><h3>Small dialog</h3></header>
				<p>Capped at 20rem — useful for confirms and tight prompts.</p>
				<footer>
					<button type="button" class="primary" @click="small.hide()">OK</button>
				</footer>
			</dialog>
			<dialog ref="largeRef" class="large">
				<header><h3>Large dialog</h3></header>
				<p>
					Stretches to 48rem — useful for forms with multiple columns or a richer wizard step.
					Plenty of room for a two-column layout, a preview pane, or a comparison table.
				</p>
				<footer>
					<button type="button" @click="large.hide()">Cancel</button>
					<button type="button" class="primary" @click="large.hide()">Save</button>
				</footer>
			</dialog>
		</section>

		<section id="fullscreen">
			<h2>Fullscreen</h2>
			<p class="showcase-caption">
				<code>.fullscreen</code> stretches the dialog edge-to-edge with zero border-radius — the
				standard mobile sheet pattern.
			</p>
			<button type="button" class="primary" @click="fullscreen.show()">Open fullscreen</button>
			<dialog ref="fullscreenRef" class="fullscreen">
				<header><h3>Fullscreen sheet</h3></header>
				<p>
					Edge-to-edge, no border-radius. Often paired with a back arrow / close button in the
					header on mobile.
				</p>
				<footer>
					<button type="button" class="primary" @click="fullscreen.hide()">Close</button>
				</footer>
			</dialog>
		</section>

		<section id="scrollable">
			<h2>Scrollable body</h2>
			<p class="showcase-caption">
				<code>.scrollable</code> turns a child <code>&lt;section&gt;</code> into a scroll container
				that grows / shrinks within the dialog's <code>max-block-size</code> cap. Header and footer
				stay pinned outside the scroll.
			</p>
			<button type="button" class="primary" @click="scrollable.show()">Open scrollable</button>
			<dialog ref="scrollableRef" class="scrollable">
				<header><h3>Long content</h3></header>
				<section>
					<p v-for="i in 30" :key="i">
						Paragraph {{ i }} — this content scrolls inside the dialog while the header and footer
						stay pinned. Useful for terms-of-service, change-logs, long forms.
					</p>
				</section>
				<footer>
					<button type="button" @click="scrollable.hide()">Close</button>
					<button type="button" class="primary" @click="scrollable.hide()">Accept</button>
				</footer>
			</dialog>
		</section>

		<section id="non-modal">
			<h2>Non-modal</h2>
			<p class="showcase-caption">
				With <code>modal: false</code>, the factory calls <code>dialog.show()</code> instead of
				<code>showModal()</code> — no backdrop, no top-layer, no native focus trap.
			</p>
			<button type="button" class="success" @click="inline.toggle()">
				{{ inline.visible.value ? 'Close' : 'Open' }} non-modal
			</button>
			<dialog ref="inlineRef">
				<p>Hi! I'm a non-modal dialog rendered inline at my source position.</p>
			</dialog>
		</section>

		<section id="form">
			<h2>Dialog with a form</h2>
			<p class="showcase-caption">
				Native focus trap (modal mode) keeps Tab cycling inside the dialog.
			</p>
			<button type="button" class="success" @click="formDialog.show()">New invite</button>
			<dialog ref="formRef">
				<form @submit.prevent="submitForm">
					<header><h3>Invite teammate</h3></header>
					<label>Name <input v-model="formName" /></label>
					<label>Email <input v-model="formEmail" type="email" /></label>
					<footer>
						<button type="button" @click="formDialog.hide()">Cancel</button>
						<button type="submit" class="success">Send invite</button>
					</footer>
				</form>
			</dialog>
		</section>

		<section id="static">
			<h2>Static backdrop</h2>
			<p class="showcase-caption">
				<code>dismiss.backdrop: 'static'</code> turns backdrop clicks into <code>on.prevent</code>
				instead of dismissals — useful for forms with unsaved changes.
			</p>
			<div class="showcase-row">
				<button type="button" class="warning" @click="staticDialog.show()">Open static</button>
				<small>{{ blocks }} block{{ blocks !== 1 ? 's' : '' }}</small>
			</div>
			<dialog ref="staticRef">
				<header><h3>Static dialog</h3></header>
				<p>Click the backdrop — the counter increments instead of dismissing.</p>
				<footer>
					<button type="button" @click="staticDialog.hide()">Close</button>
				</footer>
			</dialog>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<p class="showcase-caption">
				<code>show</code> / <code>hide</code> are cancelable; <code>open</code> /
				<code>close</code> fire after their transitions.
			</p>
			<div class="showcase-row">
				<button type="button" @click="eventDialog.show()">Open me</button>
				<button type="button" class="ghost small" @click="log = []">clear log</button>
			</div>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else>
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code> — {{ e.at }}
				</li>
			</ul>
			<dialog ref="eventRef">
				<header><h3>Watching transitions</h3></header>
				<p>Open and close to watch the event sequence above.</p>
				<footer><button type="button" @click="eventDialog.hide()">Close</button></footer>
			</dialog>
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
						<td><code>modal</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>dismiss.backdrop</code></td>
						<td><code>boolean | 'static'</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>dismiss.escape</code></td>
						<td><code>boolean</code></td>
						<td><code>true</code></td>
					</tr>
					<tr>
						<td><code>scroll.lock</code></td>
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
						<th>When</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:dialog:show</code></td>
						<td>yes</td>
						<td>Before opening.</td>
					</tr>
					<tr>
						<td><code>elements:dialog:open</code></td>
						<td>no</td>
						<td>After entry transition.</td>
					</tr>
					<tr>
						<td><code>elements:dialog:hide</code></td>
						<td>yes</td>
						<td>Before closing.</td>
					</tr>
					<tr>
						<td><code>elements:dialog:close</code></td>
						<td>no</td>
						<td>After exit transition.</td>
					</tr>
					<tr>
						<td><code>elements:dialog:prevent</code></td>
						<td>no</td>
						<td>Static-backdrop rejection.</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
