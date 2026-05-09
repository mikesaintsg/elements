<script lang="ts" setup>
/**
 * Toc — right sidebar listing the section headings inside the current page.
 * Reads the DOM after each route change via MutationObserver so that
 * async-rendered content is picked up, then smooth-scrolls on click.
 *
 * Hook-up to `useNav` (the renamed scroll-spy composable) is deferred — the
 * page-section list is shallow enough that observation is cheap and the
 * active-section highlight will flow through later.
 */
import { onUnmounted, ref, watch } from 'vue'
import { route } from '../router.js'

const props = defineProps<{
	/** The scroll container that holds the article. */
	scroller: HTMLElement | null
}>()

interface Entry {
	readonly id: string
	readonly label: string
	readonly level: number
}

const entries = ref<readonly Entry[]>([])

const collect = (): void => {
	const root = props.scroller
	if (!root) {
		entries.value = []
		return
	}
	const sections = Array.from(root.querySelectorAll<HTMLElement>('section[id]'))
	const list: Entry[] = []
	for (const sec of sections) {
		const heading = sec.querySelector<HTMLElement>('h2, h3')
		if (!heading) continue
		list.push({
			id: sec.id,
			label: heading.textContent?.trim() ?? sec.id,
			level: heading.tagName === 'H3' ? 3 : 2,
		})
	}
	entries.value = list
}

let mutationObs: MutationObserver | null = null

watch(
	() => route.value,
	() => {
		mutationObs?.disconnect()
		mutationObs = null
		const root = props.scroller
		if (!root) {
			collect()
			return
		}
		mutationObs = new MutationObserver(() => {
			collect()
			mutationObs?.disconnect()
			mutationObs = null
		})
		mutationObs.observe(root, { childList: true, subtree: true })
		collect()
	},
	{ immediate: true },
)

onUnmounted(() => {
	mutationObs?.disconnect()
	mutationObs = null
})

const goto = (id: string): void => {
	const el = props.scroller?.querySelector<HTMLElement>(`#${id}`)
	if (!el) return
	el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
	<!--
	  TOC nav — labelled landmark per WAI-ARIA APG (multi-nav pages must
	  disambiguate with aria-label). The framework's nav>ol auto-flex is
	  opt-in for `aria-label="Breadcrumb"|"Pagination"|"Primary"|"Secondary"`;
	  "Table of contents" stays vertical block flow, which is what a section
	  list wants.
	-->
	<nav v-if="entries.length" aria-label="Table of contents">
		<ol class="showcase-toc-list">
			<li v-for="e in entries" :key="e.id" :data-level="e.level">
				<a :href="`#${e.id}`" @click.prevent="goto(e.id)">{{ e.label }}</a>
			</li>
		</ol>
	</nav>
</template>
