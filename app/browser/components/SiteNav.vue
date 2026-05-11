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
	// Don't intercept modified clicks (cmd-click for new tab, etc.).
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
	emit('navigate', id)
}
</script>

<template>
	<form class="sidenav-filter" role="search" @submit.prevent>
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
	</form>

	<nav aria-label="Pages" class="sidenav-list">
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
		<p v-if="grouped.length === 0" class="sidenav-empty">No matches.</p>
	</nav>
</template>

<style scoped>
.sidenav-filter {
	padding-inline: calc(var(--spacing) * 4);
	padding-block-end: calc(var(--spacing) * 3);
	border-block-end: 1px solid var(--color-border);
}

.sidenav-filter input {
	inline-size: 100%;
}

.sidenav-list {
	padding-inline: calc(var(--spacing) * 4);
}

.sidenav-list section + section {
	margin-block-start: calc(var(--spacing) * 4);
}

.sidenav-list h2 {
	margin-block-end: calc(var(--spacing) * 2);
	font-size: var(--text-xs);
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-text-muted);
}

.sidenav-list menu {
	display: flex;
	flex-direction: column;
	gap: 1px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.sidenav-list a {
	display: block;
	padding-inline: calc(var(--spacing) * 3);
	padding-block: calc(var(--spacing) * 1.5);
	border-radius: var(--radius-md);
	color: var(--color-text);
	text-decoration: none;
	font-size: var(--text-sm);
}

.sidenav-list a:hover {
	background-color: color-mix(in oklab, var(--color-text) 5%, transparent);
}

.sidenav-list a[aria-current='page'] {
	background-color: color-mix(in oklab, var(--color-primary) 12%, transparent);
	color: var(--color-primary);
	font-weight: 500;
}

.sidenav-empty {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
</style>
