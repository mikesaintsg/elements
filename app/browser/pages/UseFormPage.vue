<script lang="ts" setup>
import { ref } from 'vue'
import { useForm } from '@src/browser'

const formRef = ref<HTMLFormElement | null>(null)
const form = useForm(formRef, {
	on: {
		submit: (event) => {
			// In a real app, intercept and POST. Here, just log.
			event.preventDefault()
			submitted.value = true
		},
	},
})
const submitted = ref(false)

const eventForm = ref<HTMLFormElement | null>(null)
const log = ref<{ at: string; kind: string }[]>([])
const stamp = (): string => new Date().toLocaleTimeString()
const evt = useForm(eventForm, {
	on: {
		input: () => log.value.unshift({ at: stamp(), kind: 'input' }),
		change: () => log.value.unshift({ at: stamp(), kind: 'change' }),
		submit: (event) => {
			event.preventDefault()
			log.value.unshift({ at: stamp(), kind: 'submit' })
		},
		reset: () => log.value.unshift({ at: stamp(), kind: 'reset' }),
	},
})
</script>

<template>
	<section>
		<header>
			<h1>useForm</h1>
			<p>
				Native <code>&lt;form&gt;</code> controller. Wraps the constraint-validation pipeline,
				exposes reactive <code>data</code> / <code>dirty</code> / <code>valid</code> refs, and
				toggles <code>[data-form-validated]</code> on submit-attempt.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useForm(elementRef, options?): { data, dirty, touched, valid, validated, fields, validity, refresh, check, report, submit, reset, clear }</code></pre>
		</section>

		<section id="basic">
			<h2>Validated form</h2>
			<p class="showcase-caption">
				Submit with empty fields to surface native constraint messages — the composable adds
				<code>[data-form-validated]</code> on the form so styling can react.
			</p>
			<form ref="formRef">
				<label>Name <input name="name" required /></label>
				<label>Email <input name="email" type="email" required /></label>
				<div class="showcase-row">
					<button type="submit" class="primary">Submit</button>
					<button type="button" @click="form.reset()">Reset</button>
					<small>
						valid: <code>{{ form.valid.value }}</code> · dirty: <code>{{ form.dirty.value }}</code>
					</small>
				</div>
			</form>
			<small v-if="submitted">Submitted!</small>
		</section>

		<section id="events">
			<h2>Lifecycle events</h2>
			<form ref="eventForm">
				<label>First name <input name="first" /></label>
				<label>Last name <input name="last" /></label>
				<div class="showcase-row">
					<button type="submit" class="primary">Submit</button>
					<button type="reset">Reset</button>
					<button type="button" class="ghost small" @click="log = []">clear log</button>
				</div>
			</form>
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
						<th>Member</th>
						<th>Type</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>data</code></td>
						<td><code>Readonly&lt;Ref&lt;FormEntry[]&gt;&gt;</code></td>
						<td>Live form-data snapshot.</td>
					</tr>
					<tr>
						<td><code>dirty</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>True after the first edit.</td>
					</tr>
					<tr>
						<td><code>valid</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>Mirrors <code>checkValidity()</code>.</td>
					</tr>
					<tr>
						<td><code>validated</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>Mirrors <code>[data-form-validated]</code>.</td>
					</tr>
					<tr>
						<td><code>fields</code></td>
						<td><code>FormFieldsInterface</code></td>
						<td>Per-field lookup / focus / enable.</td>
					</tr>
					<tr>
						<td><code>validity</code></td>
						<td><code>FormValidityInterface</code></td>
						<td>Per-field error / message / mark.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<p class="showcase-caption">
				Standard form events: <code>elements:form:input</code>, <code>change</code>,
				<code>submit</code>, <code>reset</code>, <code>validate</code>.
			</p>
		</section>
	</section>
</template>
