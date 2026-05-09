<script lang="ts" setup>
import { ref } from 'vue'

const total = 100
const used = ref(45)
const optimum = ref(0.7)
</script>

<template>
	<section class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">Forms</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				Phase 2 promotions: <code>&lt;label&gt;</code>, <code>&lt;fieldset&gt;</code> +
				<code>&lt;legend&gt;</code>, <code>&lt;details&gt;</code> + <code>&lt;summary&gt;</code>,
				<code>&lt;progress&gt;</code>, <code>&lt;meter&gt;</code>, <code>&lt;output&gt;</code>.
				Every element below is bare HTML wearing nothing but framework class modifiers.
			</p>
		</header>

		<section id="fieldset" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Fieldset + label</h2>
			<fieldset class="grid gap-3">
				<legend>Account</legend>
				<label for="account-name">Name <input id="account-name" type="text" /></label>
				<label for="account-email">Email <input id="account-email" type="email" /></label>
			</fieldset>

			<fieldset class="primary grid gap-3">
				<legend>Primary group</legend>
				<label class="primary" for="primary-handle">Handle</label>
				<input id="primary-handle" type="text" />
			</fieldset>

			<fieldset disabled class="grid gap-3">
				<legend>Disabled fieldset</legend>
				<label for="disabled-name">Cannot edit</label>
				<input id="disabled-name" type="text" value="value" />
			</fieldset>
		</section>

		<section id="details" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Details + summary</h2>
			<details>
				<summary>What's a disclosure?</summary>
				<p class="m-0 mt-2 text-sm text-slate-600">
					A native widget for collapsible content. The framework adds chrome (border + padding +
					radius) and normalizes the marker triangle across browsers.
				</p>
			</details>
			<details open class="success">
				<summary>Initially open + variant</summary>
				<p class="m-0 mt-2 text-sm text-slate-600">
					The <code>[open]</code> attribute is the open signal — no <code>.open</code> class.
				</p>
			</details>
		</section>

		<section id="progress" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Progress</h2>
			<p class="text-sm text-slate-600">Determinate bars track the variant fill color.</p>
			<div class="grid gap-3">
				<progress :value="0.3" max="1"></progress>
				<progress class="primary" :value="0.6" max="1"></progress>
				<progress class="success" :value="0.9" max="1"></progress>
				<progress class="danger" :value="0.45" max="1"></progress>
			</div>
		</section>

		<section id="meter" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Meter</h2>
			<p class="text-sm text-slate-600">
				Disk usage gauge — color tracks the UA's optimum / sub-optimum / even-less-good
				classification driven by <code>low</code>, <code>high</code>, <code>optimum</code>.
			</p>
			<div class="grid gap-3">
				<label>
					Disk usage ({{ used }} / {{ total }} GB)
					<meter :min="0" :max="total" :low="40" :high="80" :optimum="20" :value="used"></meter>
				</label>
				<input v-model.number="used" type="range" :min="0" :max="total" />
			</div>
		</section>

		<section id="output" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Output</h2>
			<p class="text-sm text-slate-600">
				Inline result chip. Bare <code>&lt;output&gt;</code> stays inline; <code>.filled</code>
				gives it pill chrome.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<label class="flex items-center gap-2">
					Optimum
					<input v-model.number="optimum" type="range" :min="0" :max="1" step="0.05" />
				</label>
				<output>raw: {{ optimum.toFixed(2) }}</output>
				<output class="filled primary">primary: {{ optimum.toFixed(2) }}</output>
				<output class="filled success">success: {{ optimum.toFixed(2) }}</output>
			</div>
		</section>

		<section id="form" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Form stack</h2>
			<p class="text-sm text-slate-600">
				Bare <code>&lt;form&gt;</code> stacks its children vertically with consistent gap — the most
				common form pattern, no extra <code>&lt;div&gt;</code> wrappers needed.
			</p>
			<form @submit.prevent>
				<label for="form-name">
					Name
					<input id="form-name" type="text" placeholder="Ada Lovelace" />
				</label>
				<label for="form-email">
					Email
					<input id="form-email" type="email" placeholder="ada@example.com" />
				</label>
				<label for="form-message">
					Message
					<textarea
						id="form-message"
						rows="3"
						placeholder="Tell us what's on your mind…"
					></textarea>
				</label>
				<button type="submit" class="primary">Send</button>
			</form>

			<h3 class="mt-6 text-base font-semibold tracking-tight text-slate-900">Inline form</h3>
			<p class="text-sm text-slate-600">
				<code>&lt;form class="inline"&gt;</code> flips to a horizontal flex row — useful for a
				single-line filter or quick-action input.
			</p>
			<form class="inline" @submit.prevent>
				<label for="filter-q">
					Filter
					<input id="filter-q" type="search" placeholder="search…" />
				</label>
				<button type="submit" class="primary">Apply</button>
			</form>
		</section>
	</section>
</template>
