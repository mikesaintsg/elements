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
	<!-- SiteNav renders ONLY the grouped page list. The sidebar's
	     search filter lives in App.vue as a sibling in `<nav>` so the
	     showcase's flex-column rail layout can split the rail cleanly
	     into a fixed search strip on top + a scrollable list strip
	     below (mailbox's pattern). Search OUTSIDE the scroll region
	     means no `position: sticky` trickery, no z-index fights, and
	     no list rows scrolling behind the search box.

	     Each group is its own labelled `<section>` with `<menu><li><a>`
	     children — picks up the framework's vertical-rail menu shape
	     from `components/_menu.scss`. The active-page anchor uses
	     `aria-current="page"` so the framework's nav-rail menu rule
	     paints the affordance. Group label uses `<h6>` (the smallest
	     framework heading — 1rem, font-weight 600) so it reads as a
	     section divider rather than a competing page heading. -->
	<section v-for="g in grouped" :key="g.group">
		<h6 class="text-xs uppercase tracking-wider opacity-70">{{ g.group }}</h6>
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
