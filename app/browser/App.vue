<script lang="ts" setup>
import type { Group, Route, Section } from './types.js'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@elements/browser'
import { current, navigate, route, routes, section } from './router.js'
import { ROUTE_GROUPS } from './types.js'

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

// Sidebar groups — the framework's documented h6 + <menu> sibling-pair
// pattern. No <section> wrapper: nesting a region landmark inside <nav>
// fights the rail gap rhythm (see components/_menu.scss § Grouped-
// sidebar rhythm).
//
// Group display order is canonical via `ROUTE_GROUPS` in `types.ts` — we
// iterate the declared order and filter routes per group, so the order
// inside `router.ts` doesn't influence what the sidebar shows. Groups
// with no matching routes (after the filter) drop out automatically.
const grouped = computed<Group[]>(() =>
	ROUTE_GROUPS.map((group) => ({
		group,
		entries: filteredRoutes.value.filter((r: Route) => r.group === group),
	})).filter((g) => g.entries.length > 0),
)

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

// Sidebar link click. Honours modifier-key shortcuts (Cmd+click opens
// in new tab) identically to the TOC onClick below — both rails share
// the same guard so the two nav surfaces feel like one family.
const onLinkClick = (event: MouseEvent): void => {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
	closeRailDrawers()
}

// TOC — on-this-page section list with IntersectionObserver tracking.
const sections = ref<Section[]>([])
const active = ref<string | null>(null)
let io: IntersectionObserver | null = null

/* Walk the scroller's `section[id]` descendants on every route change,
 * build the on-this-page list, and observe each with an
 * IntersectionObserver. Whichever section is closest to the viewport
 * top gets `active = id` → the matching anchor picks up
 * `aria-current="location"`, which `showcase.css` paints. */
const rebuild = async (): Promise<void> => {
	await nextTick()
	io?.disconnect()
	io = null

	const scroller = scrollerRef.value
	if (!scroller) {
		sections.value = []
		active.value = null
		return
	}

	const list: Section[] = []
	for (const el of scroller.querySelectorAll<HTMLElement>('section[id], h2[id], h3[id]')) {
		const id = el.id
		if (!id || id === current.value.id) continue
		const heading = el.querySelector<HTMLElement>('h1, h2, h3')
		const label = (heading?.textContent ?? id).trim()
		const level = el.tagName === 'H3' ? 3 : 2
		list.push({ id, label, level })
	}
	sections.value = list

	if (list.length === 0) {
		active.value = null
		return
	}

	io = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((e) => e.isIntersecting)
				.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
			if (visible.length > 0) active.value = visible[0].target.id
		},
		{ root: scroller, rootMargin: '0px 0px -70% 0px', threshold: 0 },
	)

	for (const { id } of list) {
		const el = scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
		if (el) io.observe(el)
	}
	active.value = list[0]?.id ?? null
}

watch(
	() => [scrollerRef.value, current.value.id] as const,
	() => {
		void rebuild()
	},
	{ immediate: true },
)

const onClick = (event: MouseEvent, id: string): void => {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
	event.preventDefault()
	navigate(current.value.id, id)
	closeRailDrawers()
}

onMounted(() => {
	updateMobile()
	mobileQuery?.addEventListener('change', updateMobile)
	document.addEventListener('keydown', onKeydown)
	void scrollToTarget(section.value)
	void rebuild()
})

onUnmounted(() => {
	mobileQuery?.removeEventListener('change', updateMobile)
	document.removeEventListener('keydown', onKeydown)
	io?.disconnect()
	io = null
})

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
		     above. Each group renders as an `<h6>` + `<menu>` sibling
		     pair — the framework's documented grouped-sidebar pattern
		     (see `components/_menu.scss` § Grouped-sidebar rhythm).
		     `<menu>` (not `<ul>`) so the framework's nav-rail rules
		     paint the row chrome. -->
		<div class="showcase-sidebar-scroll">
			<template v-for="g in grouped" :key="g.group">
				<h6>{{ g.group }}</h6>
				<menu>
					<li v-for="r in g.entries" :key="r.id">
						<a
							:href="`#/${r.id}`"
							:aria-current="current.id === r.id ? 'page' : undefined"
							@click="onLinkClick"
						>
							{{ r.title }}
						</a>
					</li>
				</menu>
			</template>
			<p v-if="grouped.length === 0">
				<small>No matches.</small>
			</p>
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
		<!-- Desktop-only label. On mobile the rail is a popover drawer
		     whose `<header>` band carries the same "On this page" title,
		     so this h6 hides via `.showcase-toc-heading { display: none }`
		     below 960 px and reappears at the @media (min-width: 961px)
		     breakpoint — see `app/browser/styles/showcase.css`. The
		     uppercase-eyebrow typography comes from the framework's
		     `body:has(main) > :where(nav, aside) h6` rule in
		     `components/_menu.scss` § Grouped-sidebar rhythm. -->
		<h6 class="showcase-toc-heading">On this page</h6>
		<!-- WAI-ARIA APG: the in-page TOC is a "Table of contents" navigation
		     landmark. Framework's components/_nav.scss + the showcase rules
		     in showcase.css paint the active-link affordance. -->
		<nav v-if="sections.length > 0" aria-label="Table of contents">
			<menu>
				<li v-for="s in sections" :key="s.id" :data-level="s.level">
					<a
						:href="`#/${current.id}/${s.id}`"
						:aria-current="active === s.id ? 'location' : undefined"
						@click="(e) => onClick(e, s.id)"
					>
						{{ s.label }}
					</a>
				</li>
			</menu>
		</nav>
		<p v-else>
			<small>No sections on this page.</small>
		</p>
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
