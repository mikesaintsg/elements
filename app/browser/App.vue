<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@elements/browser'
import { current, navigate, route, routes, section } from './router.js'
import SiteNav from './components/SiteNav.vue'
import Toc from './components/Toc.vue'

/**
 * Showcase shell. The framework's `body:has(> main)` rule turns <body>
 * into a CSS-grid template-areas layout — the bare semantic elements
 * (<header>, <nav>, <main>, <aside>, <footer>) land in their slots
 * automatically. Element and component baselines own the chrome
 * (padding, borders, rail widths, scroll containment). Only the
 * mobile-drawer slide-in and a couple of small affordances are
 * showcase-specific; those live in `styles/showcase.css`.
 */

const themeCtl = useTheme()
const filterQuery = ref('')

// `isMobile` toggles the `popover` attribute on the body-shell rails
// (`<nav>` + `<aside>`) so they're native popover drawers on mobile
// but regular in-flow grid cells on desktop. The framework's
// `<aside popover>` / `<nav popover>` drawer chrome (slide from edge,
// fade with motion tokens, ::backdrop scrim) handles the mobile
// experience uniformly with the AsidePage offcanvas examples — same
// motion contract, same backdrop, same dismiss patterns (Esc, click-
// outside, popovertarget toggle button). On desktop the popover
// attribute is absent so the rails are just `<nav>` / `<aside>` —
// the body grid places them naturally, no popover machinery involved.
const isMobile = ref(false)
const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 960px)') : null
const updateMobile = (): void => {
	isMobile.value = mobileQuery?.matches ?? false
}

const filteredRoutes = computed(() => {
	const q = filterQuery.value.trim().toLowerCase()
	if (!q) return routes
	return routes.filter(
		(r) =>
			r.title.toLowerCase().includes(q) ||
			r.id.toLowerCase().includes(q) ||
			r.group.toLowerCase().includes(q),
	)
})

const page = computed(() => current.value.page)
const scrollerRef = ref<HTMLElement | null>(null)

const scrollToTarget = async (target: string | null): Promise<void> => {
	await nextTick()
	const scroller = scrollerRef.value
	if (!scroller) return
	if (target) {
		const element = scroller.querySelector<HTMLElement>(`#${CSS.escape(target)}`)
		if (element) {
			element.scrollIntoView({ block: 'start' })
			return
		}
	}
	scroller.scrollTop = 0
}

// Close any open rail drawer (mobile only). Calls `.hidePopover()` on
// each rail if it's currently open. On desktop the popover attribute
// isn't set, so the call is a no-op (the rail is in-flow grid content,
// not a popover). Used by the route watcher (close drawer when user
// navigates to a new page) and the goHome click handler.
const closeRailDrawers = (): void => {
	for (const id of ['primary-rail', 'toc-rail']) {
		const el = document.getElementById(id)
		if (el?.matches(':popover-open')) el.hidePopover()
	}
}

watch([route, section], ([, target]) => {
	void scrollToTarget(target)
	closeRailDrawers()
})

const onKeydown = (e: KeyboardEvent): void => {
	// `/` keyboard shortcut focuses the sidebar filter. Skip if the
	// user is already typing in another input (otherwise typing `/` in
	// any field would steal focus). The framework's native popover API
	// handles Escape-to-close on the rail drawers automatically; no
	// JS-side Escape handling needed here.
	if (e.key === '/' && !document.querySelector('input:focus, textarea:focus')) {
		e.preventDefault()
		document.querySelector<HTMLInputElement>('#sidebar-filter')?.focus()
	}
}

onMounted(() => {
	updateMobile()
	mobileQuery?.addEventListener('change', updateMobile)
	document.addEventListener('keydown', onKeydown)
	void scrollToTarget(section.value)
})

onUnmounted(() => {
	mobileQuery?.removeEventListener('change', updateMobile)
	document.removeEventListener('keydown', onKeydown)
})

const goHome = (event: MouseEvent): void => {
	event.preventDefault()
	navigate('home')
	closeRailDrawers()
}

const cycleTheme = (): void => {
	themeCtl.toggle()
}

// The header's sun/moon icon reads off the RESOLVED mode (`mode`), not
// the raw `setting` — so a `'system'` user on a dark OS sees the moon,
// matching what's actually rendered. `useTheme()` updates `mode`
// reactively when the OS preference flips (matchMedia listener inside
// the factory), so the icon stays in sync automatically.
const themeIcon = computed(() => (themeCtl.mode.value === 'dark' ? 'moon' : 'sun'))

// Build stamp surfaced in the footer so the user can verify a fresh
// build loaded. `__BUILD_ID__` is injected at build time by the
// showcase Vite config; falls back to "dev" during hot reload.
const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
</script>

<template>
	<header>
		<!-- `popovertarget` is set only when the rail IS a popover (mobile).
		     On desktop the rail has no popover attribute and these toggles
		     are hidden via `showcase.css` anyway, so the attribute is a
		     no-op there. Native popover handles toggle / focus / Esc-
		     dismiss / outside-click-dismiss for free. -->
		<button
			type="button"
			class="subtle showcase-nav-toggle"
			aria-label="Toggle navigation"
			:popovertarget="isMobile ? 'primary-rail' : undefined"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>

		<a href="#/home" class="flex-1" @click="goHome"><strong>Elements</strong></a>

		<button
			type="button"
			class="subtle"
			:aria-label="`Switch theme (currently ${themeCtl.mode.value})`"
			@click="cycleTheme"
		>
			<i class="icon" aria-hidden="true" :style="{ '--icon': `var(--set-icon-${themeIcon})` }"></i>
		</button>

		<button
			type="button"
			class="subtle showcase-toc-toggle"
			aria-label="Toggle table of contents"
			:popovertarget="isMobile ? 'toc-rail' : undefined"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
	</header>

	<!-- LEFT rail — `<nav>` on every viewport. The `:popover` binding
	     toggles the native popover attribute ON below the framework's
	     mobile breakpoint (960px). Above 960px, no popover attribute is
	     set and the rail renders as a regular in-flow body-grid cell.
	     This is the "framework drawer surface" pattern applied to the
	     showcase: the framework's `nav[popover]:popover-open` rules
	     (mirrored from `aside[popover]` in `components/_aside.scss`)
	     handle the slide-from-edge geometry + backdrop scrim, and Vue
	     just decides whether the rail is a popover or not.

	     `.showcase-sidebar` opts this rail into composed-mode (multiple
	     internal regions). The framework's bare-rail default is single-
	     scroller; the showcase needs a pinned filter card above a
	     separately-scrolling link list, so it overrides the rail's
	     containment + zeroes the rail's own padding/gap (in
	     `showcase.css`). Each region inside owns its own chrome via its
	     wrapper class — the framework deliberately doesn't single out
	     one element type (`<search>`, `<form>`, etc.) as the pinning
	     trigger; regions are styled by their wrapper, not their
	     content. -->
	<nav
		id="primary-rail"
		aria-label="Primary"
		class="showcase-sidebar"
		:popover="isMobile ? 'auto' : undefined"
	>
		<!-- Drawer header band — mobile only. Title + close button mirror
		     the canonical `<aside popover>` offcanvas pattern on
		     AsidePage so the body-shell rail drawers and the standalone
		     drawer demos read as one family. The framework's
		     `:is(aside, nav)[popover] > header:first-child` rule in
		     `components/_aside.scss` paints the chunky band, edge
		     bleed, divider, and the close-button pin
		     (`margin-inline-start: auto` on the trailing button). -->
		<header class="showcase-drawer-header">
			<strong>Navigation</strong>
			<button
				type="button"
				class="subtle icon-only"
				aria-label="Close navigation"
				popovertarget="primary-rail"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<!-- Pinned filter region. Card-like wrapper (`.showcase-sidebar-
		     region`) gives this part its own padding + bottom divider
		     so the filter sits flush with the rail edges and reads as
		     a separate region from the scrolling list below. The
		     framework doesn't single out `<search>` — the styling
		     lives on the wrapper class, so any pinned content (filter,
		     toolbar, status row, etc.) can use the same vocabulary.
		     The wrapper inherits `flex-shrink: 0` from
		     `.showcase-sidebar-region`. -->
		<div class="showcase-sidebar-region">
			<search>
				<label>
					<span class="sr-only">Filter pages</span>
					<input
						id="sidebar-filter"
						v-model="filterQuery"
						type="search"
						placeholder="Filter… (press /)"
						autocomplete="off"
					/>
				</label>
			</search>
		</div>

		<!-- Scrolling links region. `.showcase-sidebar-scroll` claims
		     remaining vertical space + owns `overflow-y: auto`, so the
		     long link list scrolls without consuming the pinned filter
		     above. Inside, SiteNav renders the framework's documented
		     `<h6>` + `<menu>` sibling-pair pattern. -->
		<div class="showcase-sidebar-scroll">
			<SiteNav :routes="filteredRoutes" :active="current.id" @navigate="closeRailDrawers" />
		</div>
	</nav>

	<main ref="scrollerRef">
		<component :is="page" />
	</main>

	<!-- RIGHT rail — `<aside>` mirrors the left `<nav>`: same conditional
	     popover binding, same framework offcanvas chrome on mobile, same
	     close-button + popovertarget contract. -->
	<aside id="toc-rail" aria-label="On this page" :popover="isMobile ? 'auto' : undefined">
		<header class="showcase-drawer-header">
			<strong>On this page</strong>
			<button
				type="button"
				class="subtle icon-only"
				aria-label="Close table of contents"
				popovertarget="toc-rail"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>
		<Toc :scroller="scrollerRef" :current-id="current.id" @navigate="closeRailDrawers" />
	</aside>

	<footer>
		<small>Elements framework</small>
		<small class="font-mono text-xs">build {{ buildId }}</small>
	</footer>

	<!-- No custom backdrop element — native `::backdrop` (styled in
	     `surfaces/_backdrop.scss`) handles the scrim for both rail
	     drawers AND the framework's `<aside popover>` offcanvas
	     drawers. Single-backdrop invariant: every overlay renders one
	     native pseudo, no duplicate DOM elements. Light-dismiss
	     (click outside) and Escape-dismiss are built into the Popover
	     API; no Vue handlers needed. -->
</template>
