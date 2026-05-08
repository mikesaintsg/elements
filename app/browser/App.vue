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
   `article section[id]` inside it to build the on-this-page list. */
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
	<!-- ── LEFT SIDEBAR ──────────────────────────────────────────────────────────
	     Persistent column at layout breakpoint; off-screen drawer below it. -->
	<aside id="sidebar" :class="{ open: sidebarOpen }">
		<header>
			<a href="#/home" @click="goHome">elements</a>
			<button type="button" aria-label="Close sidebar" @click="sidebarOpen = false">Close</button>
		</header>

		<form role="search" novalidate @submit.prevent>
			<input
				id="sidebar-filter"
				v-model="filterQuery"
				type="search"
				placeholder="Search…"
				aria-label="Search navigation"
				autocomplete="off"
			/>
		</form>
		<small>Press <kbd>/</kbd> to focus</small>

		<SiteNav :routes="filteredRoutes" @navigate="sidebarOpen = false" />
		<p v-if="filteredRoutes.length === 0">No results for "{{ filterQuery }}"</p>
	</aside>

	<!-- ── APP SHELL ─────────────────────────────────────────────────────────────
	     Flex column filling the remaining viewport width. -->
	<div id="shell">
		<!-- Topbar: sidebar toggle (mobile) + brand link. -->
		<header id="topbar">
			<button type="button" aria-label="Open sidebar" @click="sidebarOpen = true">Menu</button>
			<a href="#/home" id="topbar-brand" @click="goHome">elements</a>
		</header>

		<!-- Scrollable content region. Toc observes this element for headings. -->
		<div id="scroller" ref="scrollerRef">
			<main>
				<component :is="current.page" :key="current.id" />
			</main>

			<footer>
				<p>© 2026 elements</p>
			</footer>
		</div>
	</div>

	<!-- ── RIGHT TOC SIDEBAR ─────────────────────────────────────────────────────
	     Persistent column at xl+; hidden below. -->
	<aside id="toc">
		<header>On this page</header>
		<Toc :scroller="scrollerRef" />
	</aside>
</template>
