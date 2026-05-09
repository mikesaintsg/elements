<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'

const total = 100
const used = ref(45)
const optimum = ref(0.7)

// Toast demo — open the popover-toast and auto-hide after 3s. The Phase 6
// `useToast` composable will own this lifecycle; here we wire it inline so
// the showcase demo works without a composable dependency.
const toastEl = useTemplateRef<HTMLOutputElement>('toastEl')
const showToast = (): void => {
	const el = toastEl.value
	if (!el) return
	el.showPopover()
	setTimeout(() => el.hidePopover(), 3000)
}
</script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">Forms</h1>
			<p class="mt-3 text-base leading-7">
				Phase 2 promotions: <code>&lt;label&gt;</code>, <code>&lt;fieldset&gt;</code> +
				<code>&lt;legend&gt;</code>, <code>&lt;details&gt;</code> + <code>&lt;summary&gt;</code>,
				<code>&lt;progress&gt;</code>, <code>&lt;meter&gt;</code>, <code>&lt;output&gt;</code>.
				Every element below is bare HTML wearing nothing but framework class modifiers.
			</p>
		</header>

		<section id="fieldset" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Fieldset + label</h2>
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
			<h2 class="text-xl font-semibold tracking-tight">Details + summary</h2>
			<details>
				<summary>What's a disclosure?</summary>
				<p class="m-0 mt-2 text-sm">
					A native widget for collapsible content. The framework adds chrome (border + padding +
					radius) and normalizes the marker triangle across browsers.
				</p>
			</details>
			<details open class="success">
				<summary>Initially open + variant</summary>
				<p class="m-0 mt-2 text-sm">
					The <code>[open]</code> attribute is the open signal — no <code>.open</code> class.
				</p>
			</details>
		</section>

		<section id="accordion" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Accordion group</h2>
			<p class="text-sm leading-6">
				A stack of sibling <code>&lt;details&gt;</code> elements is an accordion. Add the
				<code>name</code> attribute to enable HTML5's exclusive-accordion behavior (opening one
				auto-closes the others); the framework spaces the siblings vertically so they read as one
				coherent block whether the group is exclusive or independent.
			</p>
			<details name="faq" open>
				<summary>How are accordions different from disclosures?</summary>
				<p class="m-0 mt-2 text-sm">
					Same element. An accordion is just multiple <code>&lt;details&gt;</code> siblings —
					optionally with the same <code>name</code> for exclusive open. No new markup vocabulary.
				</p>
			</details>
			<details name="faq">
				<summary>Does this require JavaScript?</summary>
				<p class="m-0 mt-2 text-sm">
					No. The browser handles open/close state via the <code>[open]</code> attribute. The Phase
					6 <code>useDetails</code> composable adds events for animation hooks but isn't required.
				</p>
			</details>
			<details name="faq">
				<summary>Can I animate the disclosure height?</summary>
				<p class="m-0 mt-2 text-sm">
					Yes — the framework opts in to <code>interpolate-size: allow-keywords</code> on
					<code>:root</code>, so a <code>transition: block-size 200ms</code> on
					<code>::details-content</code> animates the open/close.
				</p>
			</details>
		</section>

		<section id="progress" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Progress</h2>
			<p class="text-sm">Determinate bars track the variant fill color.</p>
			<div class="grid gap-3">
				<progress :value="0.3" max="1"></progress>
				<progress class="primary" :value="0.6" max="1"></progress>
				<progress class="success" :value="0.9" max="1"></progress>
				<progress class="danger" :value="0.45" max="1"></progress>
			</div>
		</section>

		<section id="meter" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Meter</h2>
			<p class="text-sm">
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
			<h2 class="text-xl font-semibold tracking-tight">Output</h2>
			<p class="text-sm">
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

		<section id="toast" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Toast / status banner</h2>
			<p class="text-sm leading-6">
				<code>&lt;output&gt;</code> already carries <code>role="status"</code> implicitly (per ARIA,
				it's a polite live region) — the perfect root for a toast. Promote it to
				<code>popover="manual"</code> and the browser lifts it into the top layer with no z-index
				wars.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<button type="button" class="primary" @click="showToast">Show top-layer toast</button>
				<output ref="toastEl" popover="manual" id="save-toast" class="success">
					✓ Document saved
				</output>
			</div>
			<p class="text-sm leading-6">
				The
				<code class="rounded px-1 py-0.5 font-mono text-xs">useToast</code>
				composable (Phase 6) will own the autohide timer + stack management; here we wire
				<code>showPopover()</code> + a 3-second <code>setTimeout</code> inline so the demo works
				without a composable dependency. Default placement is bottom-end; flip with
				<code>.start</code> / <code>.top</code> modifiers.
			</p>
			<p class="text-sm leading-6">
				For an in-flow status banner (no top-layer, no popover), drop the attribute and use
				<code>&lt;output role="status"&gt;</code> directly:
			</p>
			<output role="status" class="information">
				<span> <strong>Connecting…</strong> waiting for the upstream service. </span>
			</output>
		</section>

		<section id="form" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Form stack</h2>
			<p class="text-sm">
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

			<h3 class="mt-6 text-base font-semibold tracking-tight">Row form</h3>
			<p class="text-sm">
				<code>&lt;form class="row"&gt;</code> flips to a horizontal flex row — useful for a
				single-line filter or quick-action input.
			</p>
			<form class="row" @submit.prevent>
				<label for="filter-q">
					Filter
					<input id="filter-q" type="search" placeholder="search…" />
				</label>
				<button type="submit" class="primary">Apply</button>
			</form>
		</section>
	</section>
</template>
