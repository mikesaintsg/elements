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

// Inline validation feedback — `valid.value` per field via `validity`,
// rendered next to the input as the user types.
const inlineForm = ref<HTMLFormElement | null>(null)
const inline = useForm(inlineForm)

// Programmatic validity — `check()` runs the constraint check
// without surfacing browser bubbles; `report()` triggers them.
const programmaticForm = ref<HTMLFormElement | null>(null)
const programmatic = useForm(programmaticForm)
const checkResult = ref<string>('')
const runCheck = (): void => {
	checkResult.value = programmatic.check() ? 'all valid' : 'invalid — see fields'
}
const runReport = (): void => {
	programmatic.report()
}

// Field-group disable — `<fieldset disabled>` propagates to every
// descendant form control natively. The composable's `valid` /
// `dirty` refs stay in sync.
const groupForm = ref<HTMLFormElement | null>(null)
useForm(groupForm)
const groupDisabled = ref(false)
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

		<section id="inline">
			<h2>Inline validation feedback</h2>
			<p class="showcase-caption">
				The composable's <code>validity</code> map exposes per-field validity state. Pair with the
				<code>:invalid</code> CSS pseudo to surface inline messages without waiting for submit.
			</p>
			<form ref="inlineForm">
				<label>
					Name <input name="name" required minlength="2" />
					<small v-if="inline.validity.message('name')">
						{{ inline.validity.message('name') }}
					</small>
				</label>
				<label>
					Email <input name="email" type="email" required />
					<small v-if="inline.validity.message('email')">
						{{ inline.validity.message('email') }}
					</small>
				</label>
				<small>
					Form valid: <code>{{ inline.valid.value }}</code> · dirty:
					<code>{{ inline.dirty.value }}</code>
				</small>
			</form>
		</section>

		<section id="programmatic">
			<h2>Programmatic validity</h2>
			<p class="showcase-caption">
				<code>check()</code> runs the constraint check silently; <code>report()</code>
				triggers the browser's native validation bubbles.
			</p>
			<form ref="programmaticForm">
				<label>Username <input name="username" required pattern="[a-z0-9]+" /></label>
				<label>Password <input name="pwd" type="password" required minlength="8" /></label>
				<div class="showcase-row">
					<button type="button" @click="runCheck">check()</button>
					<button type="button" @click="runReport">report()</button>
					<small v-if="checkResult">→ {{ checkResult }}</small>
				</div>
			</form>
		</section>

		<section id="fieldset">
			<h2>Enable / disable a field group</h2>
			<p class="showcase-caption">
				<code>&lt;fieldset disabled&gt;</code> propagates natively — toggle the parent and every
				descendant control becomes inactive. The composable's reactive refs stay in sync.
			</p>
			<div class="showcase-row">
				<label>
					<input v-model="groupDisabled" type="checkbox" />
					Disable group
				</label>
			</div>
			<form ref="groupForm">
				<fieldset :disabled="groupDisabled">
					<legend>Account</legend>
					<label>First name <input name="first" /></label>
					<label>Last name <input name="last" /></label>
					<label>Email <input name="email" type="email" /></label>
				</fieldset>
			</form>
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
