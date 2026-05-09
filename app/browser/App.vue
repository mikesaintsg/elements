<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { current, navigate, route, routes, section } from './router.js'
import SiteNav from './components/SiteNav.vue'
import Toc from './components/Toc.vue'

/* ── Sidebar drawer (mobile) ─────────────────────────────────────────────────
   Below the layout breakpoint the sidebar is off-screen; a toggle reveals it.
   `data-sidebar-open` drives the slide-in via the showcase chrome SCSS. */
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
	  (see src/styles/components/_body.scss). Top-level sectioning children
	  are placed into named grid areas automatically. Every class below is
	  either a showcase-chrome class (`showcase-*`) or a framework modifier
	  (`ghost`, `small`) — zero utility classes from external CSS frameworks.
	-->

	<div
		v-if="sidebarOpen"
		class="showcase-backdrop"
		aria-hidden="true"
		@click="sidebarOpen = false"
	/>

	<header class="showcase-banner">
		<button
			type="button"
			class="ghost small"
			aria-label="Open navigation"
			@click="sidebarOpen = true"
		>
			Menu
		</button>
		<a href="#/home" class="showcase-brand" @click="goHome">elements</a>
	</header>

	<nav
		id="sidebar"
		aria-label="Primary"
		class="showcase-sidebar"
		:data-sidebar-open="sidebarOpen ? '' : null"
	>
		<header class="showcase-rail-header">
			<a href="#/home" class="showcase-brand" @click="goHome">elements</a>
			<button
				type="button"
				class="ghost small showcase-close"
				aria-label="Close navigation"
				@click="sidebarOpen = false"
			>
				Close
			</button>
		</header>

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
		<small class="showcase-hint"> Press <kbd>/</kbd> to focus </small>

		<SiteNav :routes="filteredRoutes" @navigate="sidebarOpen = false" />

		<p v-if="filteredRoutes.length === 0" class="showcase-empty">
			No results for "{{ filterQuery }}"
		</p>
	</nav>

	<main ref="scrollerRef">
		<div class="showcase-page">
			<component :is="current.page" :key="current.id" />
		</div>
	</main>

	<aside id="toc">
		<header class="showcase-toc-header">On this page</header>
		<Toc :scroller="scrollerRef" />
	</aside>

	<footer>
		<p>© 2026 elements</p>
	</footer>
</template>
