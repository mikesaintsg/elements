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
	<section class="space-y-10">
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

		<section id="anchor-position" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Anchor positioning</h2>
			<p class="text-sm leading-6 text-slate-600">
				Pairing a <code>&lt;button popovertarget&gt;</code> with a <code>[popover]</code> sets up an
				<strong>implicit anchor</strong> — the browser positions the popover relative to its invoker
				via <code>position-area</code> with no <code>anchor-name</code> /
				<code>position-anchor</code> boilerplate. The framework's
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs"
					>surfaces/_anchor-position.scss</code
				>
				declares the default placement (<code>block-end</code>, i.e. directly below the anchor) and
				wires <code>position-try-fallbacks</code> so the popover flips automatically when there
				isn't room.
			</p>
			<p class="text-sm leading-6 text-slate-600">
				Override the default with placement modifiers — eight values, four edges and four corners.
				Try each one below; the popover lands relative to its trigger.
			</p>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<button type="button" popovertarget="place-top">.top</button>
				<button type="button" popovertarget="place-bottom">.bottom</button>
				<button type="button" popovertarget="place-start">.start</button>
				<button type="button" popovertarget="place-end">.end</button>
				<button type="button" popovertarget="place-top-start">.top-start</button>
				<button type="button" popovertarget="place-top-end">.top-end</button>
				<button type="button" popovertarget="place-bottom-start">.bottom-start</button>
				<button type="button" popovertarget="place-bottom-end">.bottom-end</button>
			</div>
			<aside popover id="place-top" class="top">Above the trigger.</aside>
			<aside popover id="place-bottom" class="bottom">Below the trigger.</aside>
			<aside popover id="place-start" class="start">Inline-start of the trigger.</aside>
			<aside popover id="place-end" class="end">Inline-end of the trigger.</aside>
			<aside popover id="place-top-start" class="top-start">Above + start corner.</aside>
			<aside popover id="place-top-end" class="top-end">Above + end corner.</aside>
			<aside popover id="place-bottom-start" class="bottom-start">Below + start corner.</aside>
			<aside popover id="place-bottom-end" class="bottom-end">Below + end corner.</aside>
			<p class="text-sm leading-6 text-slate-600">
				Logical-axis vocabulary — the class names are English directions but resolve to
				<code>block-start</code> / <code>block-end</code> / <code>inline-start</code> /
				<code>inline-end</code>, so a popover placed <code>.bottom-start</code> in LTR flips to
				<code>.top-end</code>-equivalent in <code>vertical-rl</code> writing modes. The framework
				re-uses these same class names on bare <code>&lt;aside&gt;</code> /
				<code>&lt;nav&gt;</code> / toast for per-element placement semantics — manual popovers
				(toasts) are intentionally excluded from the anchor-positioning rules so the two positioning
				models don't fight.
			</p>
		</section>

		<section id="tooltip" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">Tooltip</h2>
			<p class="text-sm leading-6 text-slate-600">
				<code>[popover=hint]</code> is the new HTML attribute value reserved for tooltip-style
				popovers. It behaves like <code>auto</code> for light-dismiss but is hierarchically nested
				under any open auto popover (so a tooltip inside an open menu doesn't kill the menu when
				shown). The framework styles it as a smaller, inverted, less-padded variant of the popover
				surface — and applies the same chrome to <code>[role=tooltip]</code> for CSS-only
				anchor-positioned tooltips.
			</p>
			<div class="flex items-center gap-4">
				<button type="button" popovertarget="copy-hint" popovertargetaction="show">
					Hover the tooltip
				</button>
				<aside popover="hint" id="copy-hint">Copies the value to your clipboard.</aside>
			</div>
			<p class="text-sm leading-6 text-slate-600">
				Native hover-driven tooltips arrive with the
				<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">useTooltip</code>
				composable in Phase 6 — until then, the framework paints chrome and the consumer wires
				show/hide via the popover API.
			</p>
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
	</section>
</template>
