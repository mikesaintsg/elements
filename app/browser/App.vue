<script lang="ts" setup>
import { computed } from 'vue'
import { current, routes } from './router.js'

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

/**
 * Minimal layout shell. The framework's `body:has(> main)` rule turns
 * <body> into a CSS-grid template-areas layout shell with named slots
 * for <header>, <nav>, <main>, <aside>, <footer>. Each section below
 * lands in its slot; the rule lives in `src/styles/components/_body.scss`.
 *
 * Drop / restore slots freely — the grid rule rewrites template-areas
 * via `body:has()` and `:not(:has())` so missing children collapse
 * cleanly without leaving empty columns.
 */
const page = computed(() => current.value.page)
</script>

<template>
	<header>
		<h1>Elements</h1>
	</header>

	<nav aria-label="Primary">
		<menu>
			<li v-for="route in routes" :key="route.id">
				<a :href="`#/${route.id}`">{{ route.title }}</a>
			</li>
		</menu>
	</nav>

	<main>
		<component :is="page" />
	</main>

	<footer>
		<small>Elements framework</small>
	</footer>
</template>
