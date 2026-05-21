<script lang="ts" setup>
/**
 * SettingsExample — the framework's forms pillar.
 *
 * One <form> (useForm) wraps a stack of <article> section cards. The
 * app-bar "Save" triggers `report()`; submit-gated validation chrome
 * (danger borders on invalid, success tint on valid, label re-tint)
 * comes entirely from `form[data-form-validated]` — no per-field error
 * wiring. Every control is a bare element + modifier:
 *
 *   <fieldset>/<legend>   grouped controls
 *   <input>               text / email / url / range / color / file
 *   role="switch"         toggle checkboxes
 *   <input type=radio>    segmented choices
 *   <select>              language / timezone
 *   <textarea>            bio
 *
 * Renders just <header> + <main> (no rails) so the form is the whole
 * stage. On submit a success <aside role="status"> banner shifts in.
 */
import { ref, useTemplateRef } from 'vue'
import { useForm } from '../../../src/browser'

const formRef = useTemplateRef<HTMLFormElement>('formRef')
const saved = ref(false)
const form = useForm(formRef, {
	on: {
		submit: (event: Event) => {
			event.preventDefault()
			saved.value = true
		},
	},
})
const save = (): void => {
	saved.value = false
	// requestSubmit() runs interactive validation first: invalid → blocked +
	// chrome lights up; valid → fires the `submit` handler above.
	form.submit()
}
</script>

<template>
	<!-- App bar — Save lives here, outside the form, and drives it via the
	     composable. -->
	<header>
		<strong class="flex-1">Settings</strong>
		<button type="button" class="subtle" @click="form.reset()">Reset</button>
		<button type="button" class="primary" @click="save">Save changes</button>
	</header>

	<main>
		<div class="stack w-full max-w-2xl mx-auto">
			<hgroup>
				<p class="text-xs uppercase tracking-wide m-0" style="color: var(--color-text-subtle)">
					Account
				</p>
				<h1>Settings</h1>
				<p>Manage your profile, sign-in, and notification preferences.</p>
			</hgroup>

			<aside v-if="saved" role="status" class="success">
				<p><strong>Saved.</strong> Your preferences have been updated.</p>
			</aside>

			<form ref="formRef" class="stack">
				<!-- Profile -->
				<article>
					<header>
						<hgroup>
							<h2>Profile</h2>
							<p>This is how others will see you.</p>
						</hgroup>
					</header>

					<div class="cluster items-center">
						<span class="avatar large" aria-hidden="true">MS</span>
						<label>
							<span class="sr-only">Profile photo</span>
							<input type="file" accept="image/*" />
						</label>
					</div>

					<label>
						Display name
						<input type="text" name="name" value="Mike Saint" required autocomplete="name" />
					</label>

					<label>
						Bio
						<textarea name="bio" rows="3" maxlength="160" placeholder="A short line about you">
Designer, builder, occasional typographer.</textarea
						>
					</label>

					<label>
						Website
						<input
							type="url"
							name="website"
							placeholder="https://example.com"
							value="https://acme.dev"
						/>
					</label>
				</article>

				<!-- Account — the validated section. -->
				<article>
					<header>
						<hgroup>
							<h2>Account</h2>
							<p>Used to sign in and for account recovery.</p>
						</hgroup>
					</header>

					<label>
						Email
						<input type="email" name="email" value="mike@acme.dev" required autocomplete="email" />
						<small style="color: var(--color-text-subtle)"
							>We'll send a confirmation if this changes.</small
						>
					</label>

					<div class="grid sm:grid-cols-2 gap-4">
						<label>
							Username
							<input
								type="text"
								name="username"
								value="mikesaint"
								required
								minlength="3"
								pattern="[a-z0-9_]+"
								autocomplete="username"
							/>
							<small style="color: var(--color-text-subtle)"
								>Lowercase letters, numbers, underscore.</small
							>
						</label>
						<label>
							Language
							<select name="language">
								<option>English</option>
								<option>Español</option>
								<option>Français</option>
								<option>Deutsch</option>
								<option>日本語</option>
							</select>
						</label>
					</div>

					<label>
						Timezone
						<select name="timezone">
							<option>UTC</option>
							<option>America/New_York</option>
							<option selected>America/Los_Angeles</option>
							<option>Europe/London</option>
							<option>Asia/Tokyo</option>
						</select>
					</label>
				</article>

				<!-- Notifications — switches + a radio group inside a fieldset. -->
				<article>
					<header>
						<hgroup>
							<h2>Notifications</h2>
							<p>Choose what reaches your inbox.</p>
						</hgroup>
					</header>

					<fieldset>
						<legend>Channels</legend>
						<div class="stack">
							<div class="cluster items-center justify-between flex-nowrap">
								<label for="sw-news">Product news &amp; tips</label>
								<input id="sw-news" type="checkbox" role="switch" name="news" checked />
							</div>
							<div class="cluster items-center justify-between flex-nowrap">
								<label for="sw-digest">Weekly activity digest</label>
								<input id="sw-digest" type="checkbox" role="switch" name="digest" checked />
							</div>
							<div class="cluster items-center justify-between flex-nowrap">
								<label for="sw-security">Security alerts</label>
								<input
									id="sw-security"
									type="checkbox"
									role="switch"
									name="security"
									checked
									disabled
								/>
							</div>
						</div>
					</fieldset>

					<fieldset>
						<legend>Digest frequency</legend>
						<div class="cluster">
							<div class="cluster items-center">
								<input id="freq-daily" type="radio" name="freq" value="daily" />
								<label for="freq-daily">Daily</label>
							</div>
							<div class="cluster items-center">
								<input id="freq-weekly" type="radio" name="freq" value="weekly" checked />
								<label for="freq-weekly">Weekly</label>
							</div>
							<div class="cluster items-center">
								<input id="freq-never" type="radio" name="freq" value="never" />
								<label for="freq-never">Never</label>
							</div>
						</div>
					</fieldset>
				</article>

				<!-- Appearance — radios + range + color. -->
				<article>
					<header>
						<hgroup>
							<h2>Appearance</h2>
							<p>Tune the interface to taste.</p>
						</hgroup>
					</header>

					<fieldset>
						<legend>Theme</legend>
						<div class="cluster">
							<div class="cluster items-center">
								<input id="theme-system" type="radio" name="theme" value="system" checked />
								<label for="theme-system">System</label>
							</div>
							<div class="cluster items-center">
								<input id="theme-light" type="radio" name="theme" value="light" />
								<label for="theme-light">Light</label>
							</div>
							<div class="cluster items-center">
								<input id="theme-dark" type="radio" name="theme" value="dark" />
								<label for="theme-dark">Dark</label>
							</div>
						</div>
					</fieldset>

					<label for="density">Density</label>
					<input
						id="density"
						type="range"
						name="density"
						min="0"
						max="2"
						step="1"
						value="1"
						class="w-full"
					/>

					<div class="cluster items-center justify-between flex-nowrap">
						<label for="accent">Accent color</label>
						<input id="accent" type="color" name="accent" value="#4f46e5" />
					</div>
				</article>

				<!-- Danger zone — in-flow alert banner, not a toast. -->
				<aside role="alert" class="danger">
					<hgroup>
						<h3>Delete account</h3>
						<p>This permanently removes your workspace and all data. This cannot be undone.</p>
					</hgroup>
					<div class="cluster">
						<button type="button" class="danger">Delete account</button>
					</div>
				</aside>
			</form>
		</div>
	</main>
</template>
