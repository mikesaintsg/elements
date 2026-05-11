<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@src/browser'
import { current, navigate, route, routes, section } from './router.js'
import SiteNav from './components/SiteNav.vue'
import Toc from './components/Toc.vue'

/**
 * Showcase shell. The framework's `body:has(> main)` rule turns <body>
 * into a CSS-grid template-areas layout shell with named slots for
 * <header>, <nav>, <main>, <aside>, <footer>. Each section below lands
 * in its slot; the rule lives in src/styles/components/_body.scss.
 *
 * Drawer logic: on viewports below the layout breakpoint the <nav> and
 * <aside> are off-screen; the header buttons toggle them. Drives via
 * `data-left-open` / `data-right-open` on <body>.
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

/* ── Scroll on route change ────────────────────────────────────────────────
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
	// Close mobile drawers on navigation so the new page is visible.
	leftOpen.value = false
	rightOpen.value = false
})

/* ── Keyboard shortcut + initial scroll ────────────────────────────────────
   "/" focuses the sidebar filter; on mount honour the initial URL hash. */
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

// Build stamp surfaced in the footer so the user can verify a fresh build
// loaded (cache-busting visual). __BUILD_ID__ is injected at build time by
// the showcase Vite config; falls back to "dev" at hot-reload time.
const buildId =
	typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
</script>

<template>
	<!-- Body grid slots are framework-driven. The drawer state attributes are
	     surfaced on the root <body> via the v-bind below so the chrome
	     selectors can read them. -->
	<header class="showcase-header">
		<button
			type="button"
			class="ghost showcase-icon-button"
			aria-label="Toggle navigation"
			:aria-expanded="leftOpen"
			@click="toggleLeft"
		>
			<span class="showcase-icon" :style="{ '--icon': 'var(--set-icon-menu)' }" />
		</button>

		<a href="#/home" class="showcase-brand" @click="goHome">
			<strong>Elements</strong>
		</a>

		<button
			type="button"
			class="ghost showcase-icon-button"
			:aria-label="`Switch theme (currently ${themeCtl.theme.value})`"
			@click="cycleTheme"
		>
			<span class="showcase-icon" :style="{ '--icon': `var(--set-icon-${themeIcon})` }" />
		</button>

		<button
			type="button"
			class="ghost showcase-icon-button showcase-toc-toggle"
			aria-label="Toggle table of contents"
			:aria-expanded="rightOpen"
			@click="toggleRight"
		>
			<span class="showcase-icon" :style="{ '--icon': 'var(--set-icon-menu)' }" />
		</button>
	</header>

	<nav
		aria-label="Primary"
		class="showcase-sidebar"
		:data-open="leftOpen ? '' : null"
	>
		<SiteNav
			v-model:query="filterQuery"
			:routes="filteredRoutes"
			:active="current.id"
			@navigate="leftOpen = false"
		/>
	</nav>

	<main ref="scrollerRef" class="showcase-main">
		<component :is="page" />
	</main>

	<aside
		aria-label="On this page"
		class="showcase-toc"
		:data-open="rightOpen ? '' : null"
	>
		<Toc :scroller="scrollerRef" :current-id="current.id" @navigate="rightOpen = false" />
	</aside>

	<footer class="showcase-footer">
		<small>Elements framework</small>
		<small class="showcase-build">build {{ buildId }}</small>
	</footer>

	<!-- Drawer backdrop — clicks dismiss whichever drawer is open. -->
	<div
		v-if="leftOpen || rightOpen"
		class="showcase-backdrop"
		aria-hidden="true"
		@click="leftOpen = false; rightOpen = false"
	></div>
</template>

<style scoped>
/* Chrome local to the showcase shell. Framework-driven where possible:
   bare semantic elements pick up the body-grid layout, headings,
   buttons, anchors via the framework's element + component cascade.
   These rules add chrome the framework doesn't ship — drawer slide,
   sidebar widths, header band, mobile-breakpoint behaviour. */

.showcase-header {
	display: flex;
	align-items: center;
	gap: calc(var(--spacing) * 3);
	padding-inline: calc(var(--spacing) * 4);
	padding-block: calc(var(--spacing) * 2);
	border-block-end: 1px solid var(--color-border);
	background-color: var(--color-surface);
	z-index: 20;
}

.showcase-brand {
	flex: 1;
	text-decoration: none;
	color: inherit;
	font-size: var(--text-lg);
}

.showcase-icon-button {
	inline-size: calc(var(--spacing) * 10);
	block-size: calc(var(--spacing) * 10);
	padding: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.showcase-icon {
	display: inline-block;
	inline-size: 1.25rem;
	block-size: 1.25rem;
	background-color: currentColor;
	mask: var(--icon) no-repeat center / contain;
}

.showcase-sidebar,
.showcase-toc {
	overflow-y: auto;
	border-color: var(--color-border);
	background-color: var(--color-surface);
}

.showcase-sidebar {
	border-inline-end: 1px solid var(--color-border);
	padding-block: calc(var(--spacing) * 4);
}

.showcase-toc {
	border-inline-start: 1px solid var(--color-border);
	padding-block: calc(var(--spacing) * 4);
	padding-inline: calc(var(--spacing) * 4);
}

.showcase-main {
	overflow-y: auto;
	padding-inline: calc(var(--spacing) * 6);
	padding-block: calc(var(--spacing) * 6);
}

.showcase-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-inline: calc(var(--spacing) * 4);
	padding-block: calc(var(--spacing) * 2);
	border-block-start: 1px solid var(--color-border);
	color: var(--color-text-muted);
}

.showcase-build {
	font-family: ui-monospace, monospace;
	font-size: var(--text-xs);
}

.showcase-toc-toggle {
	display: none;
}

/* ── Mobile: drawers slide in from the edges ─────────────────────────────── */
@media (max-width: 960px) {
	.showcase-header {
		grid-column: 1 / -1;
	}

	.showcase-toc-toggle {
		display: inline-flex;
	}

	.showcase-sidebar,
	.showcase-toc {
		position: fixed;
		inset-block: 0;
		inline-size: min(20rem, 85vw);
		z-index: 30;
		transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
		box-shadow: var(--set-box-shadow-lg);
	}

	.showcase-sidebar {
		inset-inline-start: 0;
		transform: translateX(-100%);
	}

	.showcase-toc {
		inset-inline-end: 0;
		transform: translateX(100%);
	}

	.showcase-sidebar[data-open],
	.showcase-toc[data-open] {
		transform: translateX(0);
	}

	.showcase-backdrop {
		position: fixed;
		inset: 0;
		background-color: color-mix(in oklab, black 35%, transparent);
		z-index: 25;
		backdrop-filter: blur(2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.showcase-sidebar,
		.showcase-toc {
			transition: none;
		}
	}
}
</style>
