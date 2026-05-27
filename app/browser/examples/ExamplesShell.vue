<script lang="ts" setup>
/**
 * ExamplesShell — toolbar + view-source dialog wrapper for layout
 * examples. The example's own markup goes into the default slot; the
 * shell paints the floating toolbar (prev / next / picker / theme /
 * source) on top. Four composables wire the chrome:
 *
 *   - `useDialog` owns the view-source `<dialog>` (Esc dismiss, focus
 *     trap, native `::backdrop`).
 *   - `useMenu` powers the example-picker dropdown.
 *   - `useTheme` mirrors the docs shell's singleton theme refs so
 *     toggling here propagates to the rest of the showcase.
 *   - `usePointer` drives the toolbar's drag-and-snap interaction —
 *     grabbing the leading grip handle lifts the toolbar off its
 *     viewport-corner snap zone and pins it to the cursor; on release
 *     a dominant-axis snap resolver picks the closest of six zones
 *     (top-start / top / top-end / bottom-start / bottom / bottom-end)
 *     and the toolbar settles via `.snap-{zone}` modifier — same
 *     vocabulary the framework's placement modifiers use.
 */
import { computed, onUnmounted, ref, useTemplateRef } from 'vue'
import { useDialog, useMenu, usePointer, useTheme } from '@elements/browser'
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

// ── Drag-and-snap toolbar ───────────────────────────────────────────────
//
// The toolbar sits at a viewport corner driven by a `.snap-{zone}` class
// (six zones — top-start / top / top-end / bottom-start / bottom /
// bottom-end). Grabbing the leading grip handle starts a `usePointer`
// drag: the toolbar lifts off its snap zone (the class is cleared
// while `dragging` is true) and pins to the cursor via inline
// `top` / `left` coords. On release a dominant-axis resolver picks the
// closest zone (a 15% dead-zone in the inline axis returns to the
// centred zone) and the toolbar settles back via the new class. The
// inline coords are cleared so the snap class owns the position
// again.
//
// Position math is in viewport space (`clientX` / `clientY`). The
// toolbar is `position: fixed`, so viewport-relative cursor coords
// translate directly to its `top` / `left`. Clamped to the viewport
// minus the toolbar's rendered size so a hard drag to the edge never
// pushes it out of view.
type SnapZone = 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'

const toolbarRef = useTemplateRef<HTMLMenuElement>('toolbarRef')
const gripRef = useTemplateRef<HTMLButtonElement>('gripRef')
// `null` zone = responsive baseline (.examples-toolbar's default rules:
// bottom-center on mobile, bottom-end on desktop). Once the user drags
// the toolbar, the resolver picks a specific zone and the user-chosen
// placement takes over (no longer responsive — the user owns it).
const zone = ref<SnapZone | null>(null)
const dragging = ref(false)
const dragX = ref(0)
const dragY = ref(0)
// Offset between the cursor and the toolbar's top-left at dragstart —
// keeps the relative grab point stable so the toolbar doesn't snap its
// top-left to the cursor on the first move.
let grabOffsetX = 0
let grabOffsetY = 0

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

const resolveSnap = (cx: number, cy: number): SnapZone => {
	const w = window.innerWidth
	const h = window.innerHeight
	const dx = cx - w / 2
	const dy = cy - h / 2
	const vertical: 'top' | 'bottom' = dy < 0 ? 'top' : 'bottom'
	// 15% inline dead-zone returns to the centred zone (no -start /
	// -end suffix) — matches the floater snap reference's pattern.
	const deadzone = w * 0.15
	if (Math.abs(dx) < deadzone) return vertical
	return `${vertical}-${dx < 0 ? 'start' : 'end'}` as SnapZone
}

const dragStyle = computed(() =>
	dragging.value ? { top: `${dragY.value}px`, left: `${dragX.value}px` } : undefined,
)

const toolbarClass = computed(() => {
	if (dragging.value) return 'dragging'
	return zone.value ? `snap-${zone.value}` : ''
})

usePointer(gripRef, {
	cursor: 'grabbing',
	on: {
		start: (event) => {
			const toolbar = toolbarRef.value
			if (!toolbar) return
			const rect = toolbar.getBoundingClientRect()
			grabOffsetX = rect.left - event.clientX
			grabOffsetY = rect.top - event.clientY
			// Seed the inline coords to the toolbar's CURRENT rendered
			// position before flipping `dragging`, otherwise the toolbar
			// teleports to (0, 0) when the snap class falls off on the
			// first frame.
			dragX.value = rect.left
			dragY.value = rect.top
			dragging.value = true
		},
		move: (event) => {
			const toolbar = toolbarRef.value
			if (!toolbar) return
			const rect = toolbar.getBoundingClientRect()
			dragX.value = clamp(event.clientX + grabOffsetX, 0, window.innerWidth - rect.width)
			dragY.value = clamp(event.clientY + grabOffsetY, 0, window.innerHeight - rect.height)
		},
		end: () => {
			const toolbar = toolbarRef.value
			if (toolbar) {
				const rect = toolbar.getBoundingClientRect()
				zone.value = resolveSnap(rect.left + rect.width / 2, rect.top + rect.height / 2)
			}
			dragging.value = false
		},
	},
})

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
	<!-- Multi-root template (Vue fragment) — no wrapping element so the
	     slotted example's body-shell siblings (<nav>, <header>, <main>,
	     <footer>) sit at the same DOM level as #app. That lets the
	     framework's `body:has(main) > * > nav` / `> aside` / `> header`
	     selectors match through the single `display: contents` hop
	     (#app), painting the chrome the example would otherwise have
	     to replicate in scoped CSS. -->
	<slot />

	<!-- Floating toolbar — `<menu role="toolbar">` is the canonical
		     elements pattern (parity test recognizes it via ATTR_ROOTED).
		     The leading `<button>` grip handle is the drag affordance:
		     `usePointer` (above) captures pointer-down on it, lifts the
		     toolbar off its `.snap-{zone}` class, pins it to the cursor
		     via inline `top` / `left` while dragging, then settles on
		     the dominant-axis-resolved zone on release. -->
	<menu
		ref="toolbarRef"
		class="examples-toolbar"
		:class="toolbarClass"
		:style="dragStyle"
		role="toolbar"
		:aria-label="`${title} example navigation`"
	>
		<li role="none">
			<button
				ref="gripRef"
				type="button"
				class="subtle compact examples-toolbar-grip"
				aria-label="Drag toolbar"
			>
				<i class="icon examples-icon-grip" aria-hidden="true"></i>
			</button>
		</li>
		<li role="none">
			<button type="button" class="subtle compact" aria-label="Back to docs" @click="goDocs">
				<i class="icon examples-icon-arrow-left" aria-hidden="true"></i>
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
				<i class="icon examples-icon-window-stack" aria-hidden="true"></i>
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
				<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${themeIcon})`"></i>
			</button>
		</li>
		<li role="none">
			<button type="button" class="primary" aria-label="View source" @click="source.show()">
				<i class="icon examples-icon-code-slash" aria-hidden="true"></i>
				Source
			</button>
		</li>
	</menu>

	<!-- View-source dialog. <dialog> + useDialog → modal + focus trap +
		     ::backdrop, all native. Teleported to body so it escapes the
		     example's potentially-transform-clipped containers. -->
	<Teleport to="body">
		<dialog ref="sourceRef" :aria-label="`${title} example source`">
			<header>
				<h2>
					<i class="icon examples-icon-code-slash" aria-hidden="true"></i>
					{{ title }} — source
					<small class="font-mono">{{ lineCount }} lines</small>
				</h2>
				<button type="button" class="subtle compact" :class="{ primary: copied }" @click="copy">
					<i
						class="icon"
						aria-hidden="true"
						:style="`--icon: var(--set-icon-${copied ? 'check' : 'copy'})`"
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
					Imports rewritten to <code>@elements/browser</code> so the snippet compiles unchanged in
					any project that installs elements.
				</small>
			</footer>
		</dialog>
	</Teleport>
</template>
