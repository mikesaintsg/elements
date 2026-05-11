<script lang="ts" setup>
import { computed } from 'vue'
import type { Route } from '../router.js'

const props = defineProps<{
	routes: readonly Route[]
	active: string
}>()

const query = defineModel<string>('query', { default: '' })
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
	<!-- Sidebar filter — the framework's <search> + <input type="search">
	     baselines paint the row + input chrome. Pressing "/" focuses the
	     input via the document-level keydown listener in App.vue. -->
	<search>
		<label>
			<span class="sr-only">Filter pages</span>
			<input
				id="sidebar-filter"
				v-model="query"
				type="search"
				placeholder="Filter… (press /)"
				autocomplete="off"
			/>
		</label>
	</search>
	<!-- Note: .sr-only is a Tailwind utility — visually hidden but accessible -->

	<!-- Each group is its own labelled <section>, list rendered as
	     <menu><li><a> — picks up the framework's vertical-rail menu
	     shape from components/_menu.scss. The active-page anchor uses
	     aria-current="page"; showcase.css paints the affordance. -->
	<section v-for="g in grouped" :key="g.group">
		<h2>{{ g.group }}</h2>
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
	</section>

	<p v-if="grouped.length === 0">
		<small>No matches.</small>
	</p>
</template>
