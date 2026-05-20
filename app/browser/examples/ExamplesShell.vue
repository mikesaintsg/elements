<script lang="ts" setup>
/**
 * ExamplesShell — toolbar + view-source dialog wrapper for layout
 * examples. The example's own markup goes into the default slot; the
 * shell paints the floating toolbar (prev / next / picker / theme /
 * source) on top. Three composables wire the chrome:
 *
 *   - `useDialog` owns the view-source `<dialog>` (Esc dismiss, focus
 *     trap, native `::backdrop`).
 *   - `useMenu` powers the example-picker dropdown.
 *   - `useTheme` mirrors the docs shell's singleton theme refs so
 *     toggling here propagates to the rest of the showcase.
 */
import { computed, onUnmounted, ref, useTemplateRef } from 'vue'
import { useDialog, useMenu, useTheme } from '@elements/browser'
import { navigate } from '../router.js'
import { examples } from './examples.js'

const props = defineProps<{
	readonly id: string
	readonly title: string
	readonly source: string
}>()

// Theme — same singleton refs the docs shell uses.
const theme = useTheme()
const themeIcon = computed(() => (theme.mode.value === 'dark' ? 'moon' : 'sun'))

// Example picker — useMenu over a popover <menu>.
const pickerRef = useTemplateRef<HTMLButtonElement>('pickerRef')
const pickerMenuRef = useTemplateRef<HTMLMenuElement>('pickerMenuRef')
const picker = useMenu(pickerRef, pickerMenuRef, { placement: 'top-end' })

const chooseExample = (id: string): void => {
	picker.hide()
	if (id !== props.id) navigate(id)
}

// Source viewer — useDialog over a native <dialog>.
const sourceRef = useTemplateRef<HTMLDialogElement>('sourceRef')
const source = useDialog(sourceRef)

// Rewrite monorepo-relative imports back to '@elements/browser' so the
// snippet compiles unchanged in any project that depends on elements.
const displaySource = computed(() =>
	props.source.replace(/from '(?:\.\.\/)+src\/browser'/g, "from '@elements/browser'"),
)
const lineCount = computed(() => displaySource.value.split('\n').length)

// Copy-to-clipboard — flips a 1.5s "Copied" badge.
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null
const copy = async (): Promise<void> => {
	try {
		await navigator.clipboard.writeText(displaySource.value)
		copied.value = true
		if (copyTimer) clearTimeout(copyTimer)
		copyTimer = setTimeout(() => {
			copied.value = false
		}, 1500)
	} catch {
		copied.value = false
	}
}

// Prev / next walk the registry in order. `null` at either end disables
// the chevron so the toolbar reads as bounded.
const currentIndex = computed(() => examples.findIndex((e) => e.id === props.id))
const previous = computed(() => {
	const idx = currentIndex.value
	return idx > 0 ? (examples[idx - 1] ?? null) : null
})
const next = computed(() => {
	const idx = currentIndex.value
	return idx >= 0 && idx < examples.length - 1 ? (examples[idx + 1] ?? null) : null
})

onUnmounted(() => {
	if (copyTimer) clearTimeout(copyTimer)
})

const goDocs = (): void => navigate('home')
const goPrev = (): void => {
	if (previous.value) navigate(previous.value.id)
}
const goNext = (): void => {
	if (next.value) navigate(next.value.id)
}
</script>

<template>
	<div class="examples-stage">
		<slot />

		<!-- Floating toolbar — `<menu role="toolbar">` is the canonical
		     elements pattern (parity test recognizes it via ATTR_ROOTED). -->
		<menu
			class="examples-toolbar"
			role="toolbar"
			:aria-label="`${title} example navigation`"
		>
			<li role="none">
				<button type="button" class="subtle compact" aria-label="Back to docs" @click="goDocs">
					<!-- TODO icon swap: --set-icon-arrow-left not in token set; using chevron-left -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
				</button>
			</li>
			<li role="none">
				<button
					type="button"
					class="subtle compact"
					aria-label="Previous example"
					:disabled="!previous"
					@click="goPrev"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
				</button>
			</li>
			<li role="none" class="examples-toolbar-label">
				<button
					ref="pickerRef"
					type="button"
					class="subtle"
					aria-haspopup="menu"
					:aria-label="`Choose example: currently ${title}`"
				>
					<!-- TODO icon swap: --set-icon-window-stack not in token set; using menu -->
					<i
						class="icon"
						aria-hidden="true"
						style="--icon: var(--set-icon-menu)"
					></i>
					<span class="examples-toolbar-label-text">{{ title }}</span>
				</button>
				<menu ref="pickerMenuRef" popover="auto" class="dropdown-menu" role="menu">
					<li v-for="example in examples" :key="example.id" role="none">
						<button
							type="button"
							role="menuitem"
							:aria-current="example.id === id ? 'true' : undefined"
							@click="chooseExample(example.id)"
						>
							<i
								class="icon"
								aria-hidden="true"
								:style="`--icon: var(--set-icon-${example.icon})`"
							></i>
							{{ example.title }}
						</button>
					</li>
				</menu>
			</li>
			<li role="none">
				<button
					type="button"
					class="subtle compact"
					aria-label="Next example"
					:disabled="!next"
					@click="goNext"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-right)"></i>
				</button>
			</li>
			<li role="none">
				<button
					type="button"
					class="subtle compact"
					:aria-label="`Switch theme (currently ${theme.mode.value})`"
					@click="theme.toggle()"
				>
					<i
						class="icon"
						aria-hidden="true"
						:style="`--icon: var(--set-icon-${themeIcon})`"
					></i>
				</button>
			</li>
			<li role="none">
				<!-- TODO icon swap: --set-icon-code-slash not in token set; using external -->
				<button type="button" class="primary" aria-label="View source" @click="source.show()">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					Source
				</button>
			</li>
		</menu>

		<!-- View-source dialog. <dialog> + useDialog → modal + focus trap +
		     ::backdrop, all native. Teleported to body so it escapes the
		     example's potentially-transform-clipped containers. -->
		<Teleport to="body">
			<dialog
				ref="sourceRef"
				:aria-label="`${title} example source`"
			>
				<header>
					<h2>
						<!-- TODO icon swap: --set-icon-code-slash not in token set; using external -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
						{{ title }} — source
						<small class="font-mono">{{ lineCount }} lines</small>
					</h2>
					<button
						type="button"
						class="subtle compact"
						:class="{ primary: copied }"
						@click="copy"
					>
						<!-- TODO icon swap — sort stands in for missing 'clipboard'; no closer token exists (copy/duplicate/file/paste/link all absent from _tokens.scss) -->
						<i
							class="icon"
							aria-hidden="true"
							:style="`--icon: var(--set-icon-${copied ? 'check' : 'sort'})`"
						></i>
						{{ copied ? 'Copied' : 'Copy' }}
					</button>
					<button
						type="button"
						class="subtle compact"
						aria-label="Close source"
						@click="source.hide()"
					>
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
					</button>
				</header>
				<pre class="examples-source font-mono"><code>{{ displaySource }}</code></pre>
				<footer>
					<small>
						Imports rewritten to <code>@elements/browser</code> so the snippet compiles
						unchanged in any project that installs elements.
					</small>
				</footer>
			</dialog>
		</Teleport>
	</div>
</template>
