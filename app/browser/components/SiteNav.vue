<script lang="ts" setup>
/**
 * SiteNav — left sidebar listing every documentation page, grouped by section.
 * Highlights the current route and navigates by updating the URL hash.
 * Accepts an optional pre-filtered route list so the parent can drive
 * filtering without coupling SiteNav to the filter UI.
 */
import { computed, ref } from 'vue'
import type { Route } from '../router.js'
import { route, routes as allRoutes, navigate } from '../router.js'

interface Group {
	readonly name: string
	readonly items: readonly { readonly id: string; readonly title: string }[]
}

const props = defineProps<{
	/** Override the source list — defaults to the full route table. */
	routes?: readonly Route[]
}>()

const emit = defineEmits<{
	navigate: [id: string]
}>()

const navRef = ref<HTMLElement | null>(null)

const groups = computed<readonly Group[]>(() => {
	const map = new Map<string, { id: string; title: string }[]>()
	for (const r of props.routes ?? allRoutes) {
		const list = map.get(r.group) ?? []
		list.push({ id: r.id, title: r.title })
		map.set(r.group, list)
	}
	return Array.from(map, ([name, items]) => ({ name, items }))
})

const onClick = (id: string): void => {
	navigate(id)
	emit('navigate', id)
}

const onKeydown = (event: KeyboardEvent): void => {
	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
	event.preventDefault()
	const links = Array.from(navRef.value?.querySelectorAll<HTMLElement>('a') ?? [])
	if (links.length === 0) return
	const cur = links.indexOf(document.activeElement as HTMLElement)
	const delta = event.key === 'ArrowDown' ? 1 : -1
	const target =
		cur < 0
			? event.key === 'ArrowDown'
				? 0
				: links.length - 1
			: Math.max(0, Math.min(links.length - 1, cur + delta))
	links[target]?.focus()
}
</script>

<template>
	<nav ref="navRef" aria-label="Documentation navigation" @keydown="onKeydown">
		<template v-for="g in groups" :key="g.name">
			<h2>{{ g.name }}</h2>
			<ul>
				<li v-for="item in g.items" :key="item.id">
					<a
						:href="`#/${item.id}`"
						:aria-current="route === item.id ? 'page' : undefined"
						@click.prevent="onClick(item.id)"
						>{{ item.title }}</a
					>
				</li>
			</ul>
		</template>
	</nav>
</template>
