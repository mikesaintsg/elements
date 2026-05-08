<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'

const modal = useTemplateRef<HTMLDialogElement>('modal')
const inline = useTemplateRef<HTMLDialogElement>('inline')
const inlineOpen = ref(false)

const openModal = (): void => {
	modal.value?.showModal()
}
const closeModal = (): void => {
	modal.value?.close()
}
const toggleInline = (): void => {
	if (!inline.value) return
	if (inlineOpen.value) {
		inline.value.close()
		inlineOpen.value = false
	} else {
		inline.value.show()
		inlineOpen.value = true
	}
}
</script>

<template>
	<article class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">Dialog</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				The
				<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">&lt;dialog&gt;</code>
				element is a modal or non-modal dialog box. <code>showModal()</code> promotes it to the
				top-layer with a <code>::backdrop</code>; <code>show()</code> renders inline without
				trapping focus. The framework styles both the dialog chrome and the backdrop surface.
			</p>
		</header>

		<section id="modal" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Modal</h2>
			<p class="text-sm leading-6 text-slate-600">
				The Escape key closes the dialog;
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs"
					>&lt;form method="dialog"&gt;</code
				>
				closes on submit without page navigation.
			</p>
			<button type="button" class="primary" @click="openModal">Open modal</button>

			<dialog ref="modal">
				<form method="dialog" class="grid gap-4">
					<header>
						<h3 class="text-lg font-semibold text-slate-900">Confirm action</h3>
						<p class="mt-1 text-sm text-slate-600">
							This is a real
							<code class="font-mono text-xs">&lt;dialog&gt;</code> in the browser top-layer. Press
							<kbd class="rounded border border-slate-200 bg-slate-50 px-1 text-xs">Esc</kbd>
							or click Cancel to dismiss.
						</p>
					</header>
					<footer class="flex justify-end gap-2">
						<button type="button" @click="closeModal">Cancel</button>
						<button type="submit" class="primary">Confirm</button>
					</footer>
				</form>
			</dialog>
		</section>

		<section id="non-modal" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Non-modal</h2>
			<p class="text-sm leading-6 text-slate-600">
				<code>show()</code> renders the dialog inline at its source position with no backdrop, no
				top-layer promotion, and no focus trap.
			</p>
			<button type="button" class="success" @click="toggleInline">
				{{ inlineOpen ? 'Close' : 'Open' }} non-modal
			</button>

			<dialog ref="inline">
				<p class="m-0">Hi! I'm a non-modal dialog.</p>
			</dialog>
		</section>

		<section id="variants" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Variants</h2>
			<p class="text-sm leading-6 text-slate-600">
				A variant modifier swaps the dialog's border to the variant identity. Below the dialogs are
				inline (with the <code>open</code> attribute) so they render in flow.
			</p>
			<div class="grid gap-4">
				<dialog open class="primary relative !static">
					<strong>Primary dialog</strong> — variant border + framework chrome.
				</dialog>
				<dialog open class="danger !static">
					<strong>Danger dialog</strong> — same chrome, danger border.
				</dialog>
			</div>
		</section>
	</article>
</template>
