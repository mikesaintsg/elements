<script lang="ts" setup>
import { ref } from 'vue'

const filter = ref('')
</script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;form&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>form</em> element — "a hyperlink-like element associated with form controls;
				collects values for submission." The framework styles bare <code>&lt;form&gt;</code> as a
				vertical flex stack with consistent gap between fields, and gives every
				<code>&lt;label&gt;</code> child the label-on-top stack pattern. No wrapper
				<code>&lt;div&gt;</code>s, no <code>.form-group</code> classes.
			</p>
			<p class="mt-2 text-sm leading-6">
				The <code>.row</code> modifier flips the form to a horizontal flex row for filter bars and
				quick-input scenarios.
			</p>
		</header>

		<section id="vertical" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Vertical stack (default)</h2>
			<p class="text-sm leading-6">
				Each <code>&lt;label&gt;</code> wraps its text + control. Inside the form, labels become
				flex columns (text on top, control below) and inputs / textareas fill the available width.
				On mobile this layout collapses cleanly because each label is already its own column.
			</p>
			<form @submit.prevent>
				<label for="contact-name">
					Name
					<input id="contact-name" type="text" placeholder="Ada Lovelace" />
				</label>
				<label for="contact-email">
					Email
					<input id="contact-email" type="email" placeholder="ada@example.com" />
				</label>
				<label for="contact-message">
					Message
					<textarea
						id="contact-message"
						rows="4"
						placeholder="Tell us what's on your mind…"
					></textarea>
				</label>
				<button type="submit" class="primary">Send</button>
			</form>
		</section>

		<section id="row" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Row form</h2>
			<p class="text-sm leading-6">
				<code>&lt;form class="row"&gt;</code> flips to a wrapping flex row. Labels stay stacked
				(text on top, control below), but the label+control pairs flow horizontally. Inputs sit at
				their intrinsic width so multiple fields fit on one row.
			</p>
			<form class="row" @submit.prevent>
				<label for="filter-q">
					Filter
					<input id="filter-q" v-model="filter" type="search" placeholder="search…" />
				</label>
				<label for="filter-sort">
					Sort
					<select id="filter-sort">
						<option>Newest</option>
						<option>Oldest</option>
						<option>Most relevant</option>
					</select>
				</label>
				<button type="submit" class="primary">Apply</button>
			</form>
			<p v-if="filter" class="text-xs">Filtering for: {{ filter }}</p>
		</section>

		<section id="fieldset" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Grouping with fieldset</h2>
			<p class="text-sm leading-6">
				<code>&lt;fieldset&gt;</code> + <code>&lt;legend&gt;</code> group related controls. Inside a
				form's vertical stack, each fieldset reads as a sub-section.
			</p>
			<form @submit.prevent>
				<fieldset class="grid gap-3">
					<legend>Account</legend>
					<label for="acc-handle">
						Handle
						<input id="acc-handle" type="text" placeholder="@handle" />
					</label>
					<label for="acc-tld">
						TLD
						<input id="acc-tld" type="text" placeholder="example.com" />
					</label>
				</fieldset>
				<fieldset class="primary grid gap-3">
					<legend>Notifications</legend>
					<label for="notif-email">
						Email
						<input id="notif-email" type="email" />
					</label>
					<label for="notif-cadence">
						Cadence
						<select id="notif-cadence">
							<option>Real-time</option>
							<option>Daily digest</option>
							<option>Weekly</option>
						</select>
					</label>
				</fieldset>
				<button type="submit" class="primary">Save preferences</button>
			</form>
		</section>
	</section>
</template>
