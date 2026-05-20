<script lang="ts" setup>
import type { Group, Route, Section } from './types.js'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@elements/browser'
import { current, navigate, route, routes, section } from './router.js'
import { ROUTE_GROUPS } from './types.js'
import { hasModifierKey } from './helpers.js'
import { FILTER_SELECTOR, MOBILE_QUERY, OBSERVER_ROOT_MARGIN, RAIL_IDS } from './constants.js'

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
const mobileQuery = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
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
// Examples route group renders without the docs chrome — header / rails
// / footer drop out so the example claims the full viewport. The body
// grid's `grid-template-areas` collapse the auto-sized tracks for the
// missing slots, so the `main` cell expands to fill.
const isExample = computed(() => current.value.group === 'Examples')
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
	for (const id of RAIL_IDS) {
		const el = document.getElementById(id)
		if (el?.matches(':popover-open')) el.hidePopover()
	}
}

// Sidebar group open/closed state — tracked in memory (no persistence;
// the showcase is a single-load SPA, a page reload resets to defaults
// which is the intended behavior). The framework's <details> baseline
// owns the visual collapse via `::details-content`; this set owns the
// APP decision of which groups start expanded.
//
// Default: every group CLOSED (empty set). The framework default for
// <details> is closed (per HTML spec); the showcase honors that — a
// fresh load shows a tight rail of just the group labels. The active
// route's group is auto-expanded on mount + on every navigation
// (orientation: "you are here, here are the siblings"). Manual user
// opens/closes are synced via the native `toggle` event and persist
// across navigation + filtering for the session.
const openGroups = ref<Set<string>>(new Set())

const isGroupOpen = (group: string): boolean => openGroups.value.has(group)

// Sync the in-memory set from a native <details> toggle. Reassign a
// fresh Set so the `:open` binding re-resolves deterministically (Vue
// tracks Set mutations, but a new reference removes any ambiguity in
// the controlled-details ↔ native-toggle round trip).
const onGroupToggle = (group: string, event: Event): void => {
	const el = event.target as HTMLDetailsElement
	const next = new Set(openGroups.value)
	if (el.open) next.add(group)
	else next.delete(group)
	openGroups.value = next
}

// Ensure the active route's group is expanded. Only ever ADDS — never
// collapses a group the user opened elsewhere.
const expandActiveGroup = (): void => {
	const group = current.value.group
	if (!openGroups.value.has(group)) {
		openGroups.value = new Set(openGroups.value).add(group)
	}
}

watch([route, section], ([, target]) => {
	void scrollToTarget(target)
	closeRailDrawers()
	expandActiveGroup()
})

const onKeydown = (e: KeyboardEvent): void => {
	// `/` keyboard shortcut focuses the sidebar filter. Skip if the
	// user is already typing in another input (otherwise typing `/` in
	// any field would steal focus). The framework's native popover API
	// handles Escape-to-close on the rail drawers automatically; no
	// JS-side Escape handling needed here.
	if (e.key === '/' && !document.querySelector('input:focus, textarea:focus')) {
		e.preventDefault()
		document.querySelector<HTMLInputElement>(FILTER_SELECTOR)?.focus()
	}
}

// Sidebar rail keyboard nav (ROADMAP §9.1). The framework's <details>
// + nav-menu chrome owns the VISUALS; this owns only the keyboard
// MODEL: an ordered list of focusable rows = each group's <summary>,
// then that group's links when it's open. Arrow Up/Down walk the rows
// (clamped, no wrap — predictable against a long rail); `[` / `]`
// collapse / expand the group owning the focused row. Setting
// `details.open` fires the native `toggle`, which `onGroupToggle`
// already syncs into `openGroups`, so the controlled state stays
// coherent. Scoped to the rail via the element listener — never a
// document handler (it must not fight typing in the filter input).
const railRows = (): HTMLElement[] => {
	const scroll = document.getElementById('primary-rail')?.querySelector('.showcase-sidebar-scroll')
	if (!scroll) return []
	const rows: HTMLElement[] = []
	for (const d of scroll.querySelectorAll<HTMLDetailsElement>(':scope > details')) {
		const summary = d.querySelector<HTMLElement>(':scope > summary')
		if (summary) rows.push(summary)
		if (d.open) for (const a of d.querySelectorAll<HTMLElement>(':scope > menu a')) rows.push(a)
	}
	return rows
}

const onRailKeydown = (e: KeyboardEvent): void => {
	const { key } = e
	if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== '[' && key !== ']') return
	const activeEl = document.activeElement as HTMLElement | null
	const rows = railRows()
	if (rows.length === 0) return
	const idx = activeEl ? rows.indexOf(activeEl) : -1

	if (key === 'ArrowDown' || key === 'ArrowUp') {
		e.preventDefault()
		const next =
			idx === -1
				? key === 'ArrowDown'
					? 0
					: rows.length - 1
				: Math.min(rows.length - 1, Math.max(0, idx + (key === 'ArrowDown' ? 1 : -1)))
		rows[next]?.focus()
		return
	}

	// `[` collapse / `]` expand the group owning the focused row.
	const owner = activeEl?.closest<HTMLDetailsElement>('.showcase-sidebar-scroll > details')
	if (!owner) return
	e.preventDefault()
	const open = key === ']'
	if (owner.open !== open) owner.open = open
	// Collapsing would orphan focus inside the now-hidden menu — pull it
	// back to the group's own summary so the rail stays keyboard-walkable.
	if (!open) owner.querySelector<HTMLElement>(':scope > summary')?.focus()
}

const goHome = (event: MouseEvent): void => {
	event.preventDefault()
	navigate('home')
	closeRailDrawers()
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
	if (hasModifierKey(event)) return
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
		{ root: scroller, rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0 },
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
	if (hasModifierKey(event)) return
	event.preventDefault()
	navigate(current.value.id, id)
	closeRailDrawers()
}

onMounted(() => {
	updateMobile()
	mobileQuery?.addEventListener('change', updateMobile)
	document.addEventListener('keydown', onKeydown)
	// Orientation on first paint — every group starts collapsed; expand
	// the one containing the landed route so the user sees where they
	// are + the sibling pages without hunting.
	expandActiveGroup()
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
	<header v-if="!isExample">
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
			@click="themeCtl.toggle()"
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
		v-if="!isExample"
		id="primary-rail"
		aria-label="Primary"
		class="showcase-sidebar"
		:popover="isMobile ? 'auto' : undefined"
		@keydown="onRailKeydown"
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
				class="subtle compact"
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
		     above. Each group renders as a `<details class="flush">` —
		     the framework's `<details>` baseline paints the disclosure
		     marker + cursor + animation; `.flush` strips the outer
		     card chrome so the disclosure sits inline with the rail's
		     typography. The `<summary>` wraps the framework-canonical
		     `<h6>` group title (kept for accessibility — screen readers
		     announce the heading + nesting). `<menu>` (not `<ul>`) so
		     the framework's nav-rail rules paint the row chrome. -->
		<div class="showcase-sidebar-scroll">
			<details
				v-for="g in grouped"
				:key="g.group"
				class="flush"
				:open="isGroupOpen(g.group)"
				:data-group="g.group"
				@toggle="onGroupToggle(g.group, $event)"
			>
				<summary>
					<h6>{{ g.group }}</h6>
				</summary>
				<menu>
					<li v-for="r in g.entries" :key="r.id">
						<a
							:href="`#/${r.id}`"
							:aria-current="current.id === r.id ? 'page' : undefined"
							@click="onLinkClick"
						>
							<i class="icon showcase-nav-icon" aria-hidden="true"></i>
							{{ r.title }}
						</a>
					</li>
				</menu>
			</details>
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
	<aside
		v-if="!isExample"
		id="toc-rail"
		aria-label="On this page"
		:popover="isMobile ? 'auto' : undefined"
	>
		<header class="showcase-drawer-header">
			<strong>On this page</strong>
			<button
				type="button"
				class="subtle compact"
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

	<footer v-if="!isExample">
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
