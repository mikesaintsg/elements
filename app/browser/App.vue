<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { current, navigate, route, routes, section } from './router.js'
import SiteNav from './components/SiteNav.vue'
import Toc from './components/Toc.vue'

/* ── Sidebar drawer (mobile) ─────────────────────────────────────────────────
   Below the layout breakpoint the sidebar is off-screen; a toggle reveals it.
   CSS drives the open/closed transform; we only track the boolean here. */
const sidebarOpen = ref(false)

/* ── Sidebar filter ──────────────────────────────────────────────────────────
   Client-side filter over the full route table. "/" focuses the input. */
const filterQuery = ref('')

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

/* ── Scroller ────────────────────────────────────────────────────────────────
   The scrollable region between the topbar and footer. Toc reads
   `section[id]` inside it to build the on-this-page list. */
const scrollerRef = ref<HTMLElement | null>(null)

/* ── Scroll on route change ──────────────────────────────────────────────────
   Reset the scroller to the top on navigation. When the URL carries a section
   anchor scroll to that element instead. */
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

watch([route, section], ([, target]) => {
	void scrollToTarget(target)
})

/* ── Keyboard shortcut + initial scroll ──────────────────────────────────────
   "/" focuses the sidebar filter; on mount honour the initial URL hash. */
const onKeydown = (e: KeyboardEvent): void => {
	if (e.key === '/' && !document.querySelector('input:focus, textarea:focus')) {
		e.preventDefault()
		document.querySelector<HTMLInputElement>('#sidebar-filter')?.focus()
	}
}

onMounted(() => {
	document.addEventListener('keydown', onKeydown)
	void scrollToTarget(section.value)
})

onUnmounted(() => {
	document.removeEventListener('keydown', onKeydown)
})

const goHome = (event: MouseEvent): void => {
	event.preventDefault()
	navigate('home')
	sidebarOpen.value = false
}
</script>

<template>
	<!--
	  Bare-element layout shell. <body> is the framework's CSS-grid root
	  (see src/styles/components/_body.scss). These top-level sectioning
	  children are placed into named grid areas automatically:

	      ┌─ header ──────────────────────────────────────┐
	      │  brand + global search + (mobile menu btn)   │
	      ├─ nav ──┬─ main ────────────────┬─ aside ─────┤
	      │ route  │ scrollable content    │ on-this-    │
	      │ rail   │ (overflow-y: auto)    │ page TOC    │
	      └────────┴───────────────────────┴─────────────┘
	      └─ footer ──────────────────────────────────────┘

	  Header vs nav per HTML LS + ARIA APG: the page banner is a <header>
	  containing introductory aids (brand, search, mobile menu trigger).
	  The route list is a separate <nav aria-label="Primary"> in the rail
	  beneath. The TOC is a labelled <nav> inside the right <aside>.
	-->

	<!-- ── MOBILE DRAWER BACKDROP ─────────────────────────────────────────────
	     position: fixed pulls this out of the body grid; ignored on lg+. -->
	<div
		v-if="sidebarOpen"
		class="fixed inset-0 z-40 bg-black/40 lg:hidden"
		aria-hidden="true"
		@click="sidebarOpen = false"
	/>

	<!-- ── MOBILE PAGE BANNER ────────────────────────────────────────────────
	     Bare <header> in body shell → framework `_header.scss` paints flex /
	     gap / padding / border-bottom / bg / font-size. We hide it on lg+
	     because the sidebar carries the brand + filter on desktop (the
	     mailbox layout pattern: chrome lives in the rail, not in a banner). -->
	<header class="z-30 bg-white/85 backdrop-blur lg:hidden">
		<button
			type="button"
			class="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
			aria-label="Open navigation"
			@click="sidebarOpen = true"
		>
			Menu
		</button>
		<a
			href="#/home"
			class="text-base font-semibold tracking-tight text-slate-900 no-underline hover:text-primary"
			@click="goHome"
			>elements</a
		>
	</header>

	<!-- ── PRIMARY NAVIGATION RAIL ────────────────────────────────────────────
	     Bare <nav aria-label="Primary"> direct child of body shell → framework
	     `_nav.scss` paints the rail chrome (16rem inline-size, padding,
	     border-inline-end, scroll, flex column with gap). Inside the rail we
	     stack: a header (brand + close on mobile), a <search> filter, the
	     filter-focus hint, and the route list. On mobile, Tailwind turns the
	     whole rail into a slide-in drawer via fixed positioning + transform. -->
	<nav
		id="sidebar"
		aria-label="Primary"
		:class="[
			'fixed inset-y-0 left-0 z-50 shadow-xl transition-transform duration-200',
			'lg:static lg:shadow-none lg:transition-none lg:translate-x-0',
			sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
		]"
	>
		<header class="!flex items-center justify-between !p-0 !border-0 !bg-transparent">
			<a
				href="#/home"
				class="text-base font-semibold tracking-tight text-slate-900 no-underline hover:text-primary"
				@click="goHome"
				>elements</a
			>
			<button
				type="button"
				class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
				aria-label="Close navigation"
				@click="sidebarOpen = false"
			>
				Close
			</button>
		</header>

		<!-- <search> is the HTML5 landmark for filter / search inputs. The
		     framework's `_search.scss` paints the bare element as a flex row;
		     the <input> already styles itself per `_input.scss`. -->
		<search>
			<input
				id="sidebar-filter"
				v-model="filterQuery"
				type="search"
				placeholder="Filter pages…"
				aria-label="Filter pages"
				autocomplete="off"
			/>
		</search>
		<small class="-mt-1 text-xs text-slate-500"
			>Press
			<kbd
				class="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-600"
				>/</kbd
			>
			to focus</small
		>

		<SiteNav :routes="filteredRoutes" @navigate="sidebarOpen = false" />

		<p v-if="filteredRoutes.length === 0" class="text-sm text-slate-500">
			No results for "{{ filterQuery }}"
		</p>
	</nav>

	<!-- ── MAIN CONTENT ───────────────────────────────────────────────────────
	     Bare <main> in body shell → framework `_main.scss` gives overflow-y:
	     auto + scroll containment. Toc observes this element for headings. -->
	<main ref="scrollerRef" class="bg-slate-50 text-slate-900">
		<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
			<component :is="current.page" :key="current.id" />
		</div>
	</main>

	<!-- ── ON-THIS-PAGE TOC ───────────────────────────────────────────────────
	     Bare <aside> in body shell → framework `_aside.scss` gives a fixed
	     14rem rail with leading-edge separator. Inside, <Toc> renders a
	     labelled <nav aria-label="Table of contents"> with the page's section
	     headings. -->
	<aside id="toc" class="hidden bg-slate-50 xl:block">
		<header class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
			On this page
		</header>
		<Toc :scroller="scrollerRef" />
	</aside>

	<!-- ── PAGE FOOTER ────────────────────────────────────────────────────────
	     Bare <footer> in body shell → framework `_footer.scss` gives flex /
	     padding / top-border / bg / font-size. -->
	<footer class="lg:px-8">
		<p class="m-0">© 2026 elements</p>
	</footer>
</template>
