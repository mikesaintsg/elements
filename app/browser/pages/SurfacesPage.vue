<script lang="ts" setup>
import { useTemplateRef } from 'vue'

const auto = useTemplateRef<HTMLElement>('auto')
const manual = useTemplateRef<HTMLElement>('manual')

const showAuto = (): void => {
	auto.value?.showPopover()
}
const showManual = (): void => {
	manual.value?.showPopover()
}
const hideManual = (): void => {
	manual.value?.hidePopover()
}
</script>

<template>
	<article class="space-y-10">
		<header class="border-b border-slate-200 pb-6">
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">Surfaces</h1>
			<p class="mt-3 text-base leading-7 text-slate-600">
				Browser-rendered chrome that isn't a tag or a composition: <code>[popover]</code>,
				<code>::backdrop</code>, scrollbar styling, and friends. The framework gives every surface a
				token-driven default that consumers can theme by overriding
				<code>--set-{surface}-*</code> on <code>:root</code> or per-host.
			</p>
		</header>

		<section id="popover-auto" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Popover — auto</h2>
			<p class="text-sm leading-6 text-slate-600">
				<code>[popover=auto]</code> is the default — light-dismissable (Escape, click outside). The
				framework styles the panel chrome plus the entry/exit transition (opacity + scale) using
				<code>transition-behavior: allow-discrete</code> and <code>@starting-style</code>.
			</p>
			<button type="button" class="primary" popovertarget="auto-pop">Open auto popover</button>
			<!--
				Tailwind layout utilities (.grid, .flex, .block) on a [popover] element override
				the UA's `display: none` for closed popovers — utilities sit in a later cascade
				layer than UA defaults. Wrap the content in a child div so the popover element
				keeps its own layout under framework control.
			-->
			<div ref="auto" id="auto-pop" popover="auto" style="max-inline-size: 24rem">
				<div class="grid gap-2">
					<strong>Auto popover</strong>
					<p class="m-0 text-sm text-slate-600">
						Click anywhere outside, or press
						<kbd class="rounded border border-slate-200 bg-slate-50 px-1 text-xs">Esc</kbd>, to
						dismiss.
					</p>
				</div>
			</div>
			<button type="button" class="hidden" @click="showAuto">programmatic open</button>
		</section>

		<section id="popover-manual" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Popover — manual</h2>
			<p class="text-sm leading-6 text-slate-600">
				<code>[popover=manual]</code> ignores light-dismiss — only an explicit
				<code>.hidePopover()</code> closes it. Same chrome, different lifecycle.
			</p>
			<div class="flex gap-2">
				<button type="button" class="success" @click="showManual">Open manual</button>
				<button type="button" @click="hideManual">Close manual</button>
			</div>
			<div ref="manual" id="manual-pop" popover="manual" style="max-inline-size: 24rem">
				<div class="grid gap-2">
					<strong>Manual popover</strong>
					<p class="m-0 text-sm text-slate-600">
						Esc and outside-click do nothing here — close me with the button.
					</p>
				</div>
			</div>
		</section>

		<section id="scrollbar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Scrollbar</h2>
			<p class="text-sm leading-6 text-slate-600">
				The framework sets <code>scrollbar-color</code>, <code>scrollbar-width</code>, and
				<code>scrollbar-gutter</code> on <code>:root</code>. Override
				<code>--set-scrollbar-thumb-color</code> / <code>--set-scrollbar-track-color</code> to
				retheme. The container below has fixed height + overflow so the styled scrollbar shows.
			</p>
			<div class="h-40 max-w-md overflow-y-auto rounded border border-slate-200 p-3">
				<p v-for="n in 30" :key="n" class="m-0 py-1 text-sm text-slate-700">
					Scrollable line {{ n }} — keep scrolling to see the themed thumb.
				</p>
			</div>
		</section>
	</article>
</template>
