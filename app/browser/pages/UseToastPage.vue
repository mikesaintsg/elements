<script lang="ts" setup>
import { ref } from 'vue'
import { useToast } from '@src/browser'

const successEl = ref<HTMLOutputElement | null>(null)
const warningEl = ref<HTMLOutputElement | null>(null)
const stickyEl = ref<HTMLOutputElement | null>(null)
const success = useToast(successEl, { autohide: { delay: 4000 } })
const warning = useToast(warningEl, { autohide: { delay: 6000 } })
const sticky = useToast(stickyEl, { autohide: false })

const pauseEl = ref<HTMLOutputElement | null>(null)
const pauseToast = useToast(pauseEl, { autohide: { delay: 6000 } })

const linearEl = ref<HTMLOutputElement | null>(null)
const linear = useToast(linearEl, { autohide: { delay: 5000 } })
</script>

<template>
	<section>
		<header>
			<h1>useToast</h1>
			<p>
				Transient notifications via <code>&lt;output popover&gt;</code>. Owns the autohide timer,
				pause / resume, and the stack-deck CSS variable <code>--set-toast-stack-depth</code>.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useToast(elementRef, options?): { visible, show(), hide(), pause(), resume() }</code></pre>
		</section>

		<section id="basic">
			<h2>Auto-hide / sticky</h2>
			<p class="showcase-caption">
				<code>autohide: { delay }</code> sets the dismiss timer; <code>autohide: false</code> keeps
				the toast sticky.
			</p>
			<div class="showcase-row">
				<button type="button" class="success" @click="success.show()">Success (4s)</button>
				<button type="button" class="warning" @click="warning.show()">Warning (6s)</button>
				<button type="button" @click="sticky.show()">Sticky</button>
				<button type="button" class="ghost small" @click="sticky.hide()">hide()</button>
			</div>
			<div data-toast-stack>
				<output ref="successEl" popover class="success">Saved successfully.</output>
				<output ref="warningEl" popover class="warning">3 unsaved sections.</output>
				<output ref="stickyEl" popover>I stay until you click hide().</output>
			</div>
		</section>

		<section id="pause">
			<h2>Pause &amp; resume</h2>
			<p class="showcase-caption">
				Pausing freezes the autohide timer; resuming restarts it from where it stopped.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="pauseToast.show()">Show (6s)</button>
				<button type="button" @click="pauseToast.pause()">pause()</button>
				<button type="button" @click="pauseToast.resume()">resume()</button>
			</div>
			<div data-toast-stack>
				<output ref="pauseEl" popover class="primary">Hover me to pause.</output>
			</div>
		</section>

		<section id="linear">
			<h2>Linear (no deck)</h2>
			<p class="showcase-caption">
				Without the <code>[data-toast-stack]</code> wrapper, toasts render in linear flow without
				the stack-depth offset.
			</p>
			<button type="button" class="primary" @click="linear.show()">Show linear</button>
			<output ref="linearEl" popover class="information">Linear toast — no deck.</output>
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
						<td><code>autohide</code></td>
						<td><code>false | { delay?: number }</code></td>
						<td><code>{ delay: 5000 }</code></td>
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
						<td><code>elements:toast:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:toast:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:toast:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:toast:close</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
