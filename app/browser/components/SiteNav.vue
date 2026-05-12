<script lang="ts" setup>
import { computed } from 'vue'
import type { Route } from '../router.js'

const props = defineProps<{
	routes: readonly Route[]
	active: string
}>()

const emit = defineEmits<{ navigate: [id: string] }>()

interface Group {
	readonly group: string
	readonly entries: readonly Route[]
}

const grouped = computed<Group[]>(() => {
	const map = new Map<string, Route[]>()
	for (const r of props.routes) {
		const list = map.get(r.group) ?? []
		list.push(r)
		map.set(r.group, list)
	}
	return Array.from(map, ([group, entries]) => ({ group, entries }))
})

const onLinkClick = (event: MouseEvent, id: string): void => {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
	emit('navigate', id)
}
</script>

<template>
	<!-- SiteNav renders the grouped page list as alternating `<h6>` +
	     `<menu>` sibling pairs. NO outer `<section>` wrapper around
	     each group — `<section>` is for substantial thematic content
	     bodies with their own region landmark, and inside a `<nav>`
	     it nests landmarks unnecessarily AND ships framework
	     `padding-block: 24px` that bloats the sidebar's vertical
	     rhythm. Sibling pairs are the right semantic for "heading
	     labels a list" — the spacing rhythm comes from
	     `showcase.css` (h6 margins asymmetric: room above, tight
	     below).

	     `<menu>` (not `<ul>`) so the framework's nav-rail menu rules
	     in `components/_menu.scss` paint the row chrome. The
	     active-page anchor uses `aria-current="page"`; the framework
	     paints the affordance. -->
	<template v-for="g in grouped" :key="g.group">
		<h6>{{ g.group }}</h6>
		<menu>
			<li v-for="r in g.entries" :key="r.id">
				<a
					:href="`#/${r.id}`"
					:aria-current="active === r.id ? 'page' : undefined"
					@click="(e) => onLinkClick(e, r.id)"
				>
					{{ r.title }}
				</a>
			</li>
		</menu>
	</template>

	<p v-if="grouped.length === 0">
		<small>No matches.</small>
	</p>
</template>
