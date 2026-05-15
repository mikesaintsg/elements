<script lang="ts" setup>
/**
 * UseFormPage — JS-driven constraint-validation pipeline on top of
 * the native `<form>` element.
 *
 * `useForm(formRef, options?)` wraps `createForm`. The factory binds
 * `focusout` / `input` / `change` / `invalid` / `submit` / `reset` /
 * `formdata`, mirrors a `[data-form-validated]` attribute on the
 * `<form>` (Bootstrap `.was-validated` parity) and an `aria-invalid`
 * attribute on every validatable field, and exposes a reactive
 * surface (`data`, `dirty`, `touched`, `valid`, `validated`,
 * `fields`, `validity`).
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Reactive state (Readonly<Ref<…>> for each):
 *     data        readonly FormEntry[]  — `FormData` snapshot, one
 *                                          entry per `[name, value]` pair
 *                                          (multi-value fields appear N×).
 *     dirty       boolean               — true once any field has been
 *                                          touched by the user.
 *     touched     ReadonlySet<string>   — set of field names the user has
 *                                          either changed or focused-then-
 *                                          left.
 *     valid       boolean               — every validatable field
 *                                          passes its constraints.
 *     validated   boolean               — true once `check()` / `report()`
 *                                          / `submit` has run. Drives the
 *                                          `[data-form-validated]` mirror.
 *     fields.items       readonly FormFieldElement[]  — every form-
 *                                                       associated control.
 *     fields.names       readonly string[]            — distinct `name`
 *                                                       attributes in order.
 *     validity.errors    readonly FormError[]         — { name, message,
 *                                                       validity } per
 *                                                       invalid field.
 *
 *   Imperative API:
 *     check()       — run `form.checkValidity()`; refresh state; fire
 *                      `elements:form:validate`. Returns the valid bool.
 *     report()      — same as `check()` but uses
 *                      `form.reportValidity()` (browser shows its UI).
 *     submit()      — `form.requestSubmit()` (fires `submit` event,
 *                      runs validation first per spec).
 *     reset()       — `form.reset()` (clears values, fires `reset`).
 *     clear()       — clears `dirty` / `touched` / `validated` flags +
 *                      strips `[data-form-validated]` + `aria-invalid`
 *                      attrs. Does NOT touch field values.
 *     refresh()     — re-snapshot data / fields / validity.
 *     fields.field(name) | fields.fields(name) | fields.has(name) |
 *       fields.focus(name) | fields.enable(name) | fields.disable(name)
 *     validity.field(name) | validity.message(name) |
 *       validity.mark(name, message) | validity.clear(name?)
 *
 *   Options (`UseFormOptions extends CreateFormOptions`):
 *     submit.invalid    boolean (default false)  — if true, native submit
 *                                                  proceeds even when
 *                                                  invalid.
 *     validate.input    boolean (default false)  — set `validated = true`
 *                                                  on every `input` /
 *                                                  `change` (live
 *                                                  validation).
 *     validate.mount    boolean (default false)  — set `validated = true`
 *                                                  immediately on mount.
 *     validate.submit   boolean (default true)   — set `validated = true`
 *                                                  on submit / invalid.
 *     on                Partial<FormEventMap>    — wire any of `change`
 *                                                  / `formdata` / `input`
 *                                                  / `invalid` / `reset`
 *                                                  / `submit` / `validate`
 *                                                  through the composable
 *                                                  (mirrors the dispatched
 *                                                  CustomEvent shape).
 *
 *   Framework chrome hooks (declared in `components/_form.scss`):
 *     `form[data-form-validated] :where(input, select, textarea):invalid`
 *       → danger border + soft glow.
 *     `form[data-form-validated] :where(...):invalid:focus-visible`
 *       → danger focus ring.
 *     `form[data-form-validated] :where(...):valid`
 *       → success-tinted border.
 *     `form[data-form-validated] label:has(:invalid)`
 *       → `--color-danger-on-canvas` label text.
 *
 * Native-platform redundancy walk (`contribute.md` §5.4.1):
 *   1. `[data-form-validated]` is CSS-consumed (`components/_form.scss`
 *      lines 121-150). Not dead.
 *   2. `aria-invalid` is the standard ARIA mirror for the validation
 *      state. AT consumers and the framework's `:invalid` /
 *      `:user-invalid` rules both benefit. Not dead.
 *   3. No `runTransition` (form has no transition lifecycle).
 *   4. No re-implemented Escape / outside-click dismiss.
 *   5. No body-scroll lock (form isn't a top-layer surface).
 *   6. `invalid` events are captured (`useCapture: true`) because the
 *      native `invalid` event does not bubble — correct. `onSubmit`
 *      dispatches a cancellable `elements:form:submit`; if the
 *      consumer calls `preventDefault()`, the native submit is
 *      suppressed. Correct.
 *   Factory is clean; no strip needed.
 *
 * Cross-references:
 *   - FormControlsPage — static `<input>` / `<select>` / `<textarea>`
 *     chrome (variants, sizes, `.flat` / `.flush`, validation pseudo-
 *     classes). UseFormPage layers JS-driven form-wide validation on
 *     top of that baseline.
 *   - FormSurfacesPage — `::placeholder`, `::file-selector-button`,
 *     focus ring per control.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useForm } from '@elements/browser'

import { FORM_RESERVED_USERNAMES as taken, VARIANTS_FORM as variants } from '../constants.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — Bare submit-gated validation.
// `validate.submit: true` (default) — the form looks pristine on first
// paint, validation chrome lights up only after the user tries to
// submit. The `[data-form-validated]` attribute is the gate.
// ─────────────────────────────────────────────────────────────────────
const basicRef = useTemplateRef<HTMLFormElement>('basicRef')
const basic = useForm(basicRef)

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — Live state mirror.
// All five reactive refs read into a side-by-side panel so the user
// can watch `dirty` / `touched` / `valid` / `validated` flip as they
// type / tab / submit.
// ─────────────────────────────────────────────────────────────────────
const stateRef = useTemplateRef<HTMLFormElement>('stateRef')
const state = useForm(stateRef)
const stateData = computed(() => state.data.value.map((e) => `${e.name}=${e.value}`))
const stateTouched = computed(() => Array.from(state.touched.value))
const stateNames = computed(() => state.fields.names.value)

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Per-field error summary.
// `validity.errors` is the list every invalid field paired with its
// browser-supplied `validationMessage`. Use it for the summary error
// region that screen-reader users scan instead of hunting through the
// form for invalid markers.
// ─────────────────────────────────────────────────────────────────────
const errorRef = useTemplateRef<HTMLFormElement>('errorRef')
const error = useForm(errorRef)
const errorList = computed(() =>
	error.validity.errors.value.map((e) => ({ name: e.name, message: e.message })),
)

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — Custom validation with `validity.mark()`.
// Native constraint validation handles `required`, `type=email`,
// `minlength`, `pattern`, etc. For server-side or cross-field rules,
// `validity.mark(name, message)` calls `setCustomValidity()` on the
// matching field and re-runs `refresh()` so the error appears in
// `validity.errors` and lights up the `[data-form-validated]` chrome.
// ─────────────────────────────────────────────────────────────────────
const customRef = useTemplateRef<HTMLFormElement>('customRef')
const custom = useForm(customRef, { validate: { input: true } })
const checkUsername = (): void => {
	const value = custom.data.value.find((e) => e.name === 'username')?.value
	if (typeof value !== 'string' || value === '') {
		custom.validity.clear('username')
		return
	}
	if (taken.includes(value.toLowerCase())) {
		custom.validity.mark('username', `"${value}" is already taken — try another.`)
	} else {
		custom.validity.clear('username')
	}
}

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — `fields.focus` / `enable` / `disable`.
// Pair with the per-field error list: clicking an error jumps focus
// to the offending field. `disable()` flips `disabled` on every
// matching field; `enable()` re-enables.
// ─────────────────────────────────────────────────────────────────────
const fieldsRef = useTemplateRef<HTMLFormElement>('fieldsRef')
const fields = useForm(fieldsRef)
const focusField = (name: string): void => {
	fields.fields.focus(name)
}
const disableField = (name: string): void => {
	fields.fields.disable(name)
}
const enableField = (name: string): void => {
	fields.fields.enable(name)
}

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — `validate.input: true` (live as you type).
// First field has the option set, second doesn't. Side-by-side compares
// the experience.
// ─────────────────────────────────────────────────────────────────────
const liveRef = useTemplateRef<HTMLFormElement>('liveRef')
const live = useForm(liveRef, { validate: { input: true } })

// ─────────────────────────────────────────────────────────────────────
// Demo 7 — submit / reset / validate event listeners.
// The framework dispatches `elements:form:{submit, reset, validate,
// input, change, invalid, formdata}` CustomEvents. The composable's
// `on` option wires any subset.
// ─────────────────────────────────────────────────────────────────────
const eventLog = ref<readonly { kind: string; payload: string }[]>([])
const noteEvent = (kind: string, payload: unknown): void => {
	const next = [...eventLog.value, { kind, payload: JSON.stringify(payload) }]
	eventLog.value = next.slice(-6)
}
const eventsRef = useTemplateRef<HTMLFormElement>('eventsRef')
const events = useForm(eventsRef, {
	on: {
		input: (event) => noteEvent('input', event.detail),
		submit: (event) => {
			event.preventDefault()
			noteEvent('submit', event.detail)
		},
		reset: () => noteEvent('reset', null),
		validate: (event) => noteEvent('validate', event.detail),
		invalid: (event) => noteEvent('invalid', event.detail),
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 8 — `reset()` vs `clear()`.
// `reset()` calls the native `form.reset()` — values flip back to
// their defaults, the `reset` event fires, validation flags clear.
// `clear()` ONLY clears the flags (`dirty`, `touched`, `validated`,
// `[data-form-validated]`, `aria-invalid`) — values are preserved.
// Useful for a "stop highlighting errors" affordance during long edits.
// ─────────────────────────────────────────────────────────────────────
const distinctRef = useTemplateRef<HTMLFormElement>('distinctRef')
const distinct = useForm(distinctRef)
</script>

<template>
	<section id="use-form-intro">
		<hgroup>
			<h1>useForm</h1>
			<p>
				JS-driven constraint-validation pipeline on top of the native
				<code>&lt;form&gt;</code> element. The composable owns: a
				<code>[data-form-validated]</code> attribute on the form (Bootstrap
				<code>.was-validated</code> parity), an <code>aria-invalid</code> mirror on every
				validatable field, and a reactive surface (<code>data</code>, <code>dirty</code>,
				<code>touched</code>, <code>valid</code>, <code>validated</code>, <code>fields</code>,
				<code>validity</code>).
			</p>
		</hgroup>
		<p>
			The framework chrome for validation is gated on
			<code>form[data-form-validated]</code> — fields stay pristine on first paint and only light up
			invalid / valid border + label colour after the user has tried to submit. See
			<a href="#/form-controls">FormControlsPage</a> for the static control chrome this composable
			layers on top of.
		</p>
	</section>

	<section id="use-form-basic">
		<h2>1. Submit-gated validation</h2>
		<p>
			Default options. The form looks pristine until you press <strong>Submit</strong>. After the
			first attempt, the <code>[data-form-validated]</code> attribute is set and every invalid field
			paints its danger border + soft glow; valid fields paint a success-tinted border. The
			<code>label:has(:invalid)</code> rule re-tints the label in
			<code>--color-danger-on-canvas</code>.
		</p>
		<article class="frame max-w-md">
			<form ref="basicRef" class="p-4">
				<label>
					<span>Email</span>
					<input type="email" name="email" required placeholder="you@example.com" />
				</label>
				<label>
					<span>Password (8+ characters)</span>
					<input type="password" name="password" minlength="8" required />
				</label>
				<div class="cluster gap-2">
					<button type="submit" class="primary">Submit</button>
					<button type="button" class="subtle" @click="basic.report()">report()</button>
					<button type="button" class="subtle" @click="basic.clear()">clear()</button>
				</div>
			</form>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const formRef = useTemplateRef('formRef')
const form = useForm(formRef)

&lt;form ref="formRef"&gt;
  &lt;label&gt;&lt;span&gt;Email&lt;/span&gt;
    &lt;input type="email" name="email" required /&gt;
  &lt;/label&gt;
  &lt;label&gt;&lt;span&gt;Password&lt;/span&gt;
    &lt;input type="password" name="password" minlength="8" required /&gt;
  &lt;/label&gt;
  &lt;button type="submit"&gt;Submit&lt;/button&gt;
&lt;/form&gt;</code></pre>
		</details>
	</section>

	<section id="use-form-state-mirror">
		<h2>2. Live state mirror</h2>
		<p>
			Every reactive ref the composable exposes — <code>data</code>, <code>dirty</code>,
			<code>touched</code>, <code>valid</code>, <code>validated</code>, plus
			<code>fields.names</code> — read into a side-by-side panel. Type, tab, submit, and watch the
			flags flip.
		</p>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: min(18rem, 100%)">
			<article class="frame">
				<form ref="stateRef" class="p-4">
					<label>
						<span>Display name</span>
						<input type="text" name="displayName" required placeholder="Ada Lovelace" />
					</label>
					<label>
						<span>Newsletter</span>
						<select name="frequency">
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
							<option value="never">Never</option>
						</select>
					</label>
					<div class="cluster gap-2">
						<button type="submit" class="primary">Submit</button>
						<button type="button" class="subtle" @click="state.reset()">reset()</button>
					</div>
				</form>
			</article>
			<article>
				<header>
					<h3>Reactive surface</h3>
					<p class="showcase-card-subtitle">
						Snapshots update on input / change / focusout / submit / invalid.
					</p>
				</header>
				<dl>
					<dt><code>data</code></dt>
					<dd>
						<code v-if="stateData.length === 0">[]</code>
						<code v-for="entry in stateData" v-else :key="entry">{{ entry }}</code>
					</dd>
					<dt><code>dirty</code></dt>
					<dd>
						<code>{{ state.dirty.value }}</code>
					</dd>
					<dt><code>touched</code></dt>
					<dd>
						<code v-if="stateTouched.length === 0">∅</code>
						<code v-for="name in stateTouched" v-else :key="name">{{ name }}</code>
					</dd>
					<dt><code>valid</code></dt>
					<dd>
						<code>{{ state.valid.value }}</code>
					</dd>
					<dt><code>validated</code></dt>
					<dd>
						<code>{{ state.validated.value }}</code>
					</dd>
					<dt><code>fields.names</code></dt>
					<dd>
						<code v-for="name in stateNames" :key="name">{{ name }}</code>
					</dd>
				</dl>
			</article>
		</div>
	</section>

	<section id="use-form-errors">
		<h2>3. Per-field error summary</h2>
		<p>
			<code>validity.errors</code> is the list of every invalid field paired with its
			browser-supplied <code>validationMessage</code>. Render it above the form (the
			<code>role="alert"</code> region) so screen-reader users hear "3 errors" instead of hunting
			for red borders. Each row links back to the field via <code>fields.focus(name)</code>.
		</p>
		<article class="frame max-w-md">
			<aside
				v-if="error.validated.value && errorList.length > 0"
				role="alert"
				class="danger"
				data-alert-open
			>
				<div>
					<strong
						>{{ errorList.length }} error{{ errorList.length === 1 ? '' : 's' }} blocking
						submit:</strong
					>
					<ul>
						<li v-for="entry in errorList" :key="entry.name">
							<a href="#use-form-errors" @click.prevent="error.fields.focus(entry.name)">
								<code>{{ entry.name }}</code>
							</a>
							— {{ entry.message }}
						</li>
					</ul>
				</div>
			</aside>
			<form ref="errorRef" class="p-4">
				<label>
					<span>Full name</span>
					<input type="text" name="fullName" required minlength="2" />
				</label>
				<label>
					<span>Email</span>
					<input type="email" name="email" required />
				</label>
				<label>
					<span>Age (13+)</span>
					<input type="number" name="age" min="13" max="120" required />
				</label>
				<div class="cluster gap-2">
					<button type="submit" class="primary">Submit</button>
					<button type="button" class="subtle" @click="error.clear()">clear()</button>
				</div>
			</form>
		</article>
	</section>

	<section id="use-form-custom-validation">
		<h2>4. Custom validation — <code>validity.mark(name, message)</code></h2>
		<p>
			Native constraint validation covers <code>required</code>, <code>type=email</code>,
			<code>minlength</code>, <code>pattern</code>, etc. For consumer rules (server-side uniqueness,
			cross-field comparisons, business logic), <code>validity.mark(name, message)</code> calls
			<code>setCustomValidity()</code> on the field and re-snapshots so the error appears in
			<code>validity.errors</code> and lights up the framework chrome.
		</p>
		<p>
			Below: usernames <code>admin</code>, <code>root</code>, and <code>ada</code> are reserved.
			<code>validate.input: true</code> runs the check live; clear with
			<code>validity.clear('username')</code>.
		</p>
		<article class="frame max-w-md">
			<form ref="customRef" class="p-4" @submit.prevent>
				<label>
					<span>Username</span>
					<input
						type="text"
						name="username"
						required
						minlength="3"
						pattern="[a-zA-Z0-9_]+"
						placeholder="Try ada"
						@input="checkUsername"
					/>
				</label>
				<small class="showcase-muted">
					Reserved: <code>admin</code>, <code>root</code>, <code>ada</code>
				</small>
				<button type="submit" class="primary">Create account</button>
			</form>
		</article>
	</section>

	<section id="use-form-fields">
		<h2>5. Field control — <code>fields.focus / enable / disable</code></h2>
		<p>
			<code>fields.focus(name)</code> moves DOM focus to the first matching field.
			<code>fields.enable(name)</code> / <code>fields.disable(name)</code> flip the
			<code>disabled</code> attribute on every matching field; the chrome follows the native
			<code>[disabled]</code> styling.
		</p>
		<article class="frame max-w-md">
			<form ref="fieldsRef" class="p-4">
				<label>
					<span>Name</span>
					<input type="text" name="profileName" value="Margaret Hamilton" />
				</label>
				<label>
					<span>Bio</span>
					<textarea name="profileBio" rows="3"></textarea>
				</label>
				<div class="cluster gap-2">
					<button type="button" class="subtle" @click="focusField('profileName')">
						focus(name)
					</button>
					<button type="button" class="subtle" @click="disableField('profileBio')">
						disable(bio)
					</button>
					<button type="button" class="subtle" @click="enableField('profileBio')">
						enable(bio)
					</button>
				</div>
			</form>
		</article>
	</section>

	<section id="use-form-live-option">
		<h2>6. <code>validate.input: true</code> — live as you type</h2>
		<p>
			By default the form looks pristine until the first submit. With
			<code>validate.input: true</code>, every keystroke or change sets <code>validated</code> and
			chrome activates immediately. Useful for inline-edit panels and single-field affordances where
			the user benefits from instant feedback.
		</p>
		<article class="frame max-w-md">
			<form ref="liveRef" class="p-4">
				<label>
					<span>Workspace URL (subdomain)</span>
					<input
						type="text"
						name="subdomain"
						required
						pattern="[a-z0-9-]+"
						minlength="3"
						placeholder="my-team"
					/>
				</label>
				<small class="showcase-muted">
					Lowercase letters, digits, hyphens. Min 3 characters.
				</small>
				<output v-if="live.validated.value && !live.valid.value" class="danger">
					Not valid yet.
				</output>
				<output v-else-if="live.validated.value" class="success">Looks good.</output>
			</form>
		</article>
	</section>

	<section id="use-form-events">
		<h2>7. Event listeners</h2>
		<p>
			Every state transition fires a <code>elements:form:{kind}</code> CustomEvent on the form. The
			composable's <code>on</code> option wires any subset: <code>change</code>,
			<code>formdata</code>, <code>input</code>, <code>invalid</code>, <code>reset</code>,
			<code>submit</code>, <code>validate</code>. The most-recent 6 events show below.
		</p>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: min(18rem, 100%)">
			<article class="frame">
				<form ref="eventsRef" class="p-4">
					<label>
						<span>Comment</span>
						<input type="text" name="comment" required minlength="3" />
					</label>
					<div class="cluster gap-2">
						<button type="submit" class="primary">Submit</button>
						<button type="button" class="subtle" @click="events.reset()">reset()</button>
					</div>
				</form>
			</article>
			<article>
				<header>
					<h3>Event log</h3>
					<p class="showcase-card-subtitle">Last 6 events fired on the form.</p>
				</header>
				<ul v-if="eventLog.length === 0">
					<li><small class="showcase-muted">No events yet — interact with the form.</small></li>
				</ul>
				<ol v-else class="group">
					<li v-for="(entry, idx) in eventLog" :key="idx">
						<strong>{{ entry.kind }}</strong>
						<code class="block text-xs">{{ entry.payload }}</code>
					</li>
				</ol>
			</article>
		</div>
		<p>
			On <code>submit</code> the consumer calls <code>event.preventDefault()</code> to keep the form
			in-page (skipping the default native navigation); the <code>elements:form:submit</code> detail
			payload carries the current <code>data</code> + <code>errors</code> +
			<code>valid</code> snapshot.
		</p>
	</section>

	<section id="use-form-reset-vs-clear">
		<h2>8. <code>reset()</code> vs <code>clear()</code></h2>
		<p>
			Two distinct affordances. <code>reset()</code> flips values back to defaults via the native
			<code>form.reset()</code> (the <code>reset</code> event fires; validation flags clear).
			<code>clear()</code> ONLY clears the flags (<code>dirty</code> / <code>touched</code> /
			<code>validated</code> + <code>[data-form-validated]</code> + <code>aria-invalid</code>) and
			leaves values intact. Use it for "stop showing me errors" affordances during long-running
			edits.
		</p>
		<article class="frame max-w-md">
			<form ref="distinctRef" class="p-4">
				<label>
					<span>Field with default value</span>
					<input type="text" name="title" value="Draft proposal" required minlength="5" />
				</label>
				<label>
					<span>Empty required field</span>
					<input type="text" name="body" required />
				</label>
				<div class="cluster gap-2">
					<button type="submit" class="primary">Submit</button>
					<button type="button" class="subtle" @click="distinct.reset()">
						reset() — values + flags
					</button>
					<button type="button" class="subtle" @click="distinct.clear()">
						clear() — flags only
					</button>
				</div>
			</form>
		</article>
	</section>

	<section id="use-form-variants">
		<h2>9. Variants on validation chrome</h2>
		<p>
			The danger border / soft glow paints in <code>--color-danger</code>; the valid border tints
			through <code>--color-success</code>. Both come from the framework token surface — retune at
			<code>:root</code> and every form-validation chrome retunes alongside the rest of the variant
			cascade. The summary error region above demonstrates the
			<code>&lt;aside role="alert" class="danger"&gt;</code> banner pattern; pair it with
			<a href="#/aside">AsidePage's</a> alert / status disambiguation.
		</p>
		<div class="cluster gap-2">
			<span class="badge" v-for="v in variants" :key="v" :class="v">{{ v }}</span>
		</div>
	</section>

	<section id="use-form-a11y">
		<h2>10. Accessibility</h2>
		<dl>
			<dt><code>aria-invalid</code></dt>
			<dd>
				Set on every validatable field after the first validation cycle —
				<code>aria-invalid="true"</code> on invalid, <code>aria-invalid="false"</code> on valid. The
				explicit <code>false</code> matters: screen readers use it to confirm a field passed
				validation, not just absence of <code>true</code>.
			</dd>
			<dt>Live region for error summary</dt>
			<dd>
				The summary error region uses
				<code>&lt;aside role="alert"&gt;</code> so the assertive live region announces "{n} errors
				blocking submit" the moment the list appears.
			</dd>
			<dt>Native focus management</dt>
			<dd>
				<code>report()</code> calls <code>form.reportValidity()</code> which scrolls to and focuses
				the first invalid field — same default behaviour as a bare browser submit.
				<code>fields.focus(name)</code> overrides for consumer-driven jumps.
			</dd>
			<dt>Reduced motion</dt>
			<dd>
				Validation chrome doesn't animate — borders and box-shadows transition through
				<code>--set-input-transition-duration</code> (150ms) only when the user hasn't requested
				reduced motion (every framework transition is wrapped in
				<code>@include transition()</code>).
			</dd>
			<dt>Forced colors (Windows HC)</dt>
			<dd>
				The form-element baselines fall back to <code>Field</code> / <code>FieldText</code> /
				<code>Mark</code> / <code>Highlight</code> system colors via
				<code>@include forced-colors</code> blocks. Invalid-state chrome stays visible because
				<code>:invalid</code> + <code>aria-invalid</code> both bring native rendering pathways.
			</dd>
		</dl>
	</section>

	<section id="use-form-tokens">
		<h2>11. Tokens</h2>
		<p>
			<code>useForm</code> reads no element-scoped tokens of its own — the validation chrome
			consumes the form / input / select / textarea element baselines plus the global
			<code>--color-danger</code> + <code>--color-success</code> +
			<code>--color-danger-on-canvas</code>
			triplet.
		</p>
		<dl>
			<dt><code>--set-form-gap</code></dt>
			<dd>Vertical gap between top-level form children (label-row stack rhythm).</dd>
			<dt><code>--set-form-row-gap</code></dt>
			<dd>Gap when <code>form.row</code> flips to horizontal layout.</dd>
			<dt><code>--set-form-label-gap</code></dt>
			<dd>
				Label-text-to-control gap inside the implicit <code>&lt;label&gt; &gt; *</code> stack.
			</dd>
			<dt><code>--color-danger</code> / <code>--color-danger-on-canvas</code></dt>
			<dd>
				Invalid border + soft glow + label re-tint. <code>--color-danger-on-canvas</code> is the
				WCAG-AA-tuned text colour that survives both light and dark canvases.
			</dd>
			<dt><code>--color-success</code></dt>
			<dd>Valid-state border tint (mixed with <code>--color-border</code>).</dd>
			<dt><code>--set-focus-box-shadow-*</code></dt>
			<dd>
				Invalid-on-focus ring width + opacity — the focus-visible state combines the danger border
				with the focus ring at danger tint.
			</dd>
		</dl>
	</section>
</template>
