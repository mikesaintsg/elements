<script lang="ts" setup>
/**
 * Toc — right sidebar listing the section headings inside the current page
 * article. Reads the DOM after each route change via MutationObserver so that
 * async-rendered content is picked up, then smooth-scrolls on click.
 *
 * @remarks `useScrollSpy` will be wired here once the composable is built
 * in `src/browser`. For now active-section tracking is omitted.
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
	const sections = Array.from(root.querySelectorAll<HTMLElement>('article section[id]'))
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
	<nav v-if="entries.length" aria-label="Table of contents">
		<ol class="space-y-0.5 border-l border-slate-200">
			<li
				v-for="e in entries"
				:key="e.id"
				:data-level="e.level"
				:class="e.level === 3 ? 'pl-6' : 'pl-3'"
			>
				<a
					:href="`#${e.id}`"
					class="-ml-px block border-l border-transparent py-1 text-sm text-slate-600 no-underline transition-colors hover:border-slate-400 hover:text-slate-900"
					@click.prevent="goto(e.id)"
					>{{ e.label }}</a
				>
			</li>
		</ol>
	</nav>
</template>
