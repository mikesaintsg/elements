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
const leftOpen = ref(false)
const rightOpen = ref(false)
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

watch([route, section], ([, target]) => {
	void scrollToTarget(target)
	leftOpen.value = false
	rightOpen.value = false
})

const closeDrawers = (): void => {
	leftOpen.value = false
	rightOpen.value = false
}

const onKeydown = (e: KeyboardEvent): void => {
	if (e.key === '/' && !document.querySelector('input:focus, textarea:focus')) {
		e.preventDefault()
		document.querySelector<HTMLInputElement>('#sidebar-filter')?.focus()
	}
	if (e.key === 'Escape') {
		leftOpen.value = false
		rightOpen.value = false
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
	leftOpen.value = false
	rightOpen.value = false
}

const toggleLeft = (): void => {
	leftOpen.value = !leftOpen.value
	if (leftOpen.value) rightOpen.value = false
}

const toggleRight = (): void => {
	rightOpen.value = !rightOpen.value
	if (rightOpen.value) leftOpen.value = false
}

const cycleTheme = (): void => {
	themeCtl.toggle()
}

const themeIcon = computed(() => {
	const t = themeCtl.theme.value
	if (t === 'dark') return 'moon'
	if (t === 'light') return 'sun'
	return 'system'
})

// Build stamp surfaced in the footer so the user can verify a fresh
// build loaded. `__BUILD_ID__` is injected at build time by the
// showcase Vite config; falls back to "dev" during hot reload.
const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
</script>

<template>
	<header>
		<button
			type="button"
			class="subtle showcase-nav-toggle"
			aria-label="Toggle navigation"
			:aria-expanded="leftOpen"
			@click="toggleLeft"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>

		<a href="#/home" class="flex-1" @click="goHome"><strong>Elements</strong></a>

		<button
			type="button"
			class="subtle"
			:aria-label="`Switch theme (currently ${themeCtl.theme.value})`"
			@click="cycleTheme"
		>
			<i class="icon" aria-hidden="true" :style="{ '--icon': `var(--set-icon-${themeIcon})` }"></i>
		</button>

		<button
			type="button"
			class="subtle showcase-toc-toggle"
			aria-label="Toggle table of contents"
			:aria-expanded="rightOpen"
			@click="toggleRight"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
	</header>

	<nav aria-label="Primary" :data-open="leftOpen ? '' : null">
		<header class="showcase-drawer-header">
			<button
				type="button"
				class="subtle icon-only showcase-drawer-close showcase-drawer-close-start"
				aria-label="Close navigation"
				@click="leftOpen = false"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<!-- `<search>` is the HTML5 search landmark. Mounted as a
		     separate, NON-scrolling row of the nav rail's flex column
		     (`showcase.css` switches the rail to a flex-column split
		     when it carries a `> search` child). The links list below
		     gets its own scroll region — the search stays anchored at
		     the top, the rest scrolls. -->
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

		<!-- Scrolling links region. The `<div>` is layout-only — it owns the
		     `flex: 1 + overflow-y: auto` scroll container so the sibling
		     `<header>` and `<search>` above can stay at fixed height
		     outside the overflow. Inside, SiteNav renders the framework's
		     documented `<h6>` + `<menu>` sibling-pair pattern. -->
		<div class="showcase-sidebar-scroll">
			<SiteNav :routes="filteredRoutes" :active="current.id" @navigate="leftOpen = false" />
		</div>
	</nav>

	<main ref="scrollerRef">
		<component :is="page" />
	</main>

	<aside aria-label="On this page" :data-open="rightOpen ? '' : null">
		<header class="showcase-drawer-header">
			<button
				type="button"
				class="subtle icon-only showcase-drawer-close showcase-drawer-close-end"
				aria-label="Close table of contents"
				@click="rightOpen = false"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>
		<Toc :scroller="scrollerRef" :current-id="current.id" @navigate="rightOpen = false" />
	</aside>

	<footer>
		<small>Elements framework</small>
		<small class="font-mono text-xs">build {{ buildId }}</small>
	</footer>

	<!-- Drawer backdrop — clicks dismiss whichever drawer is open. -->
	<div
		v-if="leftOpen || rightOpen"
		class="showcase-backdrop"
		aria-hidden="true"
		@click="closeDrawers"
	></div>
</template>
