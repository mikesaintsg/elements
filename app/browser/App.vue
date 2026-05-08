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
	<!-- Three-column shell: sidebar / content / toc.
	     - Mobile: single column; sidebar slides over as a drawer.
	     - lg+: sidebar pinned as the first column.
	     - xl+: TOC pinned as the third column. -->
	<div
		class="grid min-h-screen grid-cols-1 bg-slate-50 text-slate-900 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]"
	>
		<!-- ── MOBILE DRAWER BACKDROP ──────────────────────────────────────────── -->
		<div
			v-if="sidebarOpen"
			class="fixed inset-0 z-40 bg-black/40 lg:hidden"
			aria-hidden="true"
			@click="sidebarOpen = false"
		/>

		<!-- ── LEFT SIDEBAR ────────────────────────────────────────────────────── -->
		<aside
			id="sidebar"
			:class="[
				'fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-4 border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-200',
				'lg:static lg:translate-x-0 lg:shadow-none lg:transition-none',
				sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
			]"
		>
			<header class="flex items-center justify-between">
				<a
					href="#/home"
					class="text-base font-semibold tracking-tight text-slate-900 no-underline hover:text-primary"
					@click="goHome"
					>elements</a
				>
				<button
					type="button"
					class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
					aria-label="Close sidebar"
					@click="sidebarOpen = false"
				>
					Close
				</button>
			</header>

			<form role="search" novalidate class="relative" @submit.prevent>
				<input
					id="sidebar-filter"
					v-model="filterQuery"
					type="search"
					placeholder="Search…"
					aria-label="Search navigation"
					autocomplete="off"
					class="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
				/>
				<small class="mt-1 block text-xs text-slate-500"
					>Press
					<kbd
						class="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-600"
						>/</kbd
					>
					to focus</small
				>
			</form>

			<div class="flex-1 overflow-y-auto">
				<SiteNav :routes="filteredRoutes" @navigate="sidebarOpen = false" />
				<p v-if="filteredRoutes.length === 0" class="mt-4 text-sm text-slate-500">
					No results for "{{ filterQuery }}"
				</p>
			</div>
		</aside>

		<!-- ── APP SHELL ───────────────────────────────────────────────────────── -->
		<div id="shell" class="flex min-w-0 flex-col">
			<!-- Topbar: only visible below lg (sidebar is the brand surface above). -->
			<header
				id="topbar"
				class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur lg:hidden"
			>
				<button
					type="button"
					class="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
					aria-label="Open sidebar"
					@click="sidebarOpen = true"
				>
					Menu
				</button>
				<a
					href="#/home"
					id="topbar-brand"
					class="text-base font-semibold tracking-tight text-slate-900 no-underline hover:text-primary"
					@click="goHome"
					>elements</a
				>
			</header>

			<!-- Scrollable content region. Toc observes this element for headings. -->
			<div id="scroller" ref="scrollerRef" class="flex-1 overflow-y-auto">
				<main class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
					<component :is="current.page" :key="current.id" />
				</main>

				<footer
					class="mx-auto w-full max-w-3xl border-t border-slate-200 px-4 py-6 text-sm text-slate-500 lg:px-8"
				>
					<p>© 2026 elements</p>
				</footer>
			</div>
		</div>

		<!-- ── RIGHT TOC SIDEBAR ───────────────────────────────────────────────── -->
		<aside
			id="toc"
			class="sticky top-0 hidden h-screen overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 xl:block"
		>
			<header class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
				On this page
			</header>
			<Toc :scroller="scrollerRef" />
		</aside>
	</div>
</template>
