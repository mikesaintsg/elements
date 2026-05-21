<script lang="ts" setup>
/**
 * SettingsExample — the framework's forms pillar.
 *
 * A body-shell settings screen: a section-nav <nav> rail beside one
 * useForm-validated <form> of <article> section cards in <main>. The
 * app-bar "Save" triggers requestSubmit; submit-gated validation chrome
 * (danger/valid borders, label re-tint) is pure framework CSS. Every
 * control is a bare element + modifier — fieldset/legend, text/email/
 * url/range/color/file inputs, role="switch" toggles, radios, selects,
 * textarea — plus a sessions <table> in the Security card. The <nav>
 * rail is a real sidebar on desktop and a popover drawer ≤960px.
 */
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useForm } from '../../../src/browser'

const MOBILE_QUERY = '(max-width: 960px)'
const isMobile = ref(false)
const mq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mq?.matches ?? false
}
onMounted(() => {
	syncMobile()
	mq?.addEventListener('change', syncMobile)
})
onUnmounted(() => mq?.removeEventListener('change', syncMobile))

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
	form.submit()
}

// In the app shell, <main> is the scroll container (body is
// overflow:hidden), so native `#id` hash-scrolling — which targets the
// document — doesn't move the in-main section into view. Scroll it
// explicitly within its scroll ancestor instead.
const scrollToSection = (id: string): void => {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	// Close the rail drawer after picking a section on mobile.
	const rail = document.getElementById('settings-rail')
	if (rail?.matches(':popover-open')) rail.hidePopover()
}

const sections = [
	{ id: 'settings-profile', label: 'Profile' },
	{ id: 'settings-account', label: 'Account' },
	{ id: 'settings-notifications', label: 'Notifications' },
	{ id: 'settings-appearance', label: 'Appearance' },
	{ id: 'settings-security', label: 'Security' },
	{ id: 'settings-danger', label: 'Danger zone' },
]

interface Session {
	readonly device: string
	readonly location: string
	readonly active: string
	readonly current: boolean
}
const sessions: readonly Session[] = [
	{
		device: 'MacBook Pro · Chrome',
		location: 'San Francisco, US',
		active: 'Active now',
		current: true,
	},
	{
		device: 'iPhone 15 · Safari',
		location: 'San Francisco, US',
		active: '2 hours ago',
		current: false,
	},
	{ device: 'Windows · Edge', location: 'Austin, US', active: '3 days ago', current: false },
]
</script>

<template>
	<!-- App bar — Save lives here, outside the form, and drives it via the
	     composable. -->
	<header>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open sections"
			popovertarget="settings-rail"
		>
			<i class="icon menu" aria-hidden="true"></i>
		</button>
		<strong class="fluid">Settings</strong>
		<button type="button" class="subtle" @click="form.reset()">Reset</button>
		<button type="button" class="primary" @click="save">Save changes</button>
	</header>

	<!-- Section nav. body-shell <nav> → vertical sidebar rail; `:popover`
	     flips it to a drawer ≤960px. The rail menu paints the framework's
	     full-width nav rows + active state and scrolls independently. -->
	<nav
		id="settings-rail"
		class="start"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Settings sections"
	>
		<header v-if="isMobile">
			<strong class="fluid">Sections</strong>
			<button
				type="button"
				class="subtle compact"
				aria-label="Close sections"
				popovertarget="settings-rail"
				popovertargetaction="hide"
			>
				<i class="icon close" aria-hidden="true"></i>
			</button>
		</header>
		<menu>
			<li v-for="s in sections" :key="s.id">
				<a :href="`#${s.id}`" @click.prevent="scrollToSection(s.id)">{{ s.label }}</a>
			</li>
		</menu>
	</nav>

	<main>
		<div class="stack fill">
			<hgroup>
				<p class="text-xs uppercase tracking-wide m-0 muted">Account</p>
				<h1>Settings</h1>
				<p>Manage your profile, sign-in, and notification preferences.</p>
			</hgroup>

			<aside v-if="saved" role="status" class="success">
				<p><strong>Saved.</strong> Your preferences have been updated.</p>
			</aside>

			<form ref="formRef" class="stack">
				<!-- Profile -->
				<article id="settings-profile">
					<header>
						<hgroup>
							<h2>Profile</h2>
							<p>This is how others will see you.</p>
						</hgroup>
					</header>

					<div class="cluster">
						<span class="avatar large" aria-hidden="true">MS</span>
						<label>
							<span class="sr-only">Profile photo</span>
							<input type="file" accept="image/*" />
						</label>
					</div>

					<div class="grid sm:grid-cols-2 gap-4">
						<label>
							Display name
							<input type="text" name="name" value="Mike Saint" required autocomplete="name" />
						</label>
						<label>
							Pronouns
							<input type="text" name="pronouns" value="he/him" />
						</label>
					</div>

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
				<article id="settings-account">
					<header>
						<hgroup>
							<h2>Account</h2>
							<p>Used to sign in and for account recovery.</p>
						</hgroup>
					</header>

					<label>
						Email
						<input type="email" name="email" value="mike@acme.dev" required autocomplete="email" />
						<small class="muted">We'll send a confirmation if this changes.</small>
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
							<small class="muted">Lowercase letters, numbers, underscore.</small>
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
				<article id="settings-notifications">
					<header>
						<hgroup>
							<h2>Notifications</h2>
							<p>Choose what reaches your inbox.</p>
						</hgroup>
					</header>

					<fieldset>
						<legend>Channels</legend>
						<div class="stack">
							<div class="cluster between flex-nowrap">
								<label for="sw-news">Product news &amp; tips</label>
								<input id="sw-news" type="checkbox" role="switch" name="news" checked />
							</div>
							<div class="cluster between flex-nowrap">
								<label for="sw-digest">Weekly activity digest</label>
								<input id="sw-digest" type="checkbox" role="switch" name="digest" checked />
							</div>
							<div class="cluster between flex-nowrap">
								<label for="sw-security">Security alerts</label>
								<input
									id="sw-security"
									type="checkbox"
									role="switch"
									name="securityAlerts"
									checked
									disabled
								/>
							</div>
						</div>
					</fieldset>

					<fieldset>
						<legend>Digest frequency</legend>
						<div class="cluster">
							<div class="cluster">
								<input id="freq-daily" type="radio" name="freq" value="daily" />
								<label for="freq-daily">Daily</label>
							</div>
							<div class="cluster">
								<input id="freq-weekly" type="radio" name="freq" value="weekly" checked />
								<label for="freq-weekly">Weekly</label>
							</div>
							<div class="cluster">
								<input id="freq-never" type="radio" name="freq" value="never" />
								<label for="freq-never">Never</label>
							</div>
						</div>
					</fieldset>
				</article>

				<!-- Appearance — radios + range + color. -->
				<article id="settings-appearance">
					<header>
						<hgroup>
							<h2>Appearance</h2>
							<p>Tune the interface to taste.</p>
						</hgroup>
					</header>

					<fieldset>
						<legend>Theme</legend>
						<div class="cluster">
							<div class="cluster">
								<input id="theme-system" type="radio" name="theme" value="system" checked />
								<label for="theme-system">System</label>
							</div>
							<div class="cluster">
								<input id="theme-light" type="radio" name="theme" value="light" />
								<label for="theme-light">Light</label>
							</div>
							<div class="cluster">
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
						class="fill"
					/>

					<div class="cluster between flex-nowrap">
						<label for="accent">Accent color</label>
						<input id="accent" type="color" name="accent" value="#4f46e5" />
					</div>
				</article>

				<!-- Security — sessions table + 2FA. -->
				<article id="settings-security">
					<header>
						<hgroup>
							<h2>Security</h2>
							<p>Where you're signed in and how you're protected.</p>
						</hgroup>
					</header>

					<div class="cluster between flex-nowrap">
						<label for="sw-2fa">Two-factor authentication</label>
						<input id="sw-2fa" type="checkbox" role="switch" name="twofa" checked />
					</div>

					<div class="scrollable">
						<table class="striped">
							<thead>
								<tr>
									<th>Device</th>
									<th>Location</th>
									<th>Last active</th>
									<th><span class="sr-only">Action</span></th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="session in sessions" :key="session.device">
									<td>
										{{ session.device }}
										<span v-if="session.current" class="badge success">This device</span>
									</td>
									<td>{{ session.location }}</td>
									<td>{{ session.active }}</td>
									<td>
										<button type="button" class="danger subtle small" :disabled="session.current">
											Revoke
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</article>

				<!-- Danger zone — in-flow alert banner, not a toast. -->
				<aside id="settings-danger" role="alert" class="danger">
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
