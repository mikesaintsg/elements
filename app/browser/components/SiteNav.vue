<script lang="ts" setup>
/**
 * SiteNav — primary nav rail content (groups of route links).
 *
 * Renders inside an outer `<nav aria-label="Primary">` (provided by App.vue),
 * so this component does NOT add another `<nav>` — that would create a
 * nested-landmark situation we don't need. We render the groups directly: a
 * stack of `<h2>` group headings + `<ul>` link lists. The visual register
 * is compact-rail (mailbox-inspired): small-caps section headings, full-
 * width tappable rows, current-route highlight via aria-current=page.
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
	<div ref="navRef" class="flex flex-1 flex-col gap-4 overflow-y-auto" @keydown="onKeydown">
		<template v-for="g in groups" :key="g.name">
			<div class="space-y-1.5">
				<h2 class="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
					{{ g.name }}
				</h2>
				<ul class="m-0 list-none space-y-0.5 p-0">
					<li v-for="item in g.items" :key="item.id" class="m-0">
						<a
							:href="`#/${item.id}`"
							:aria-current="route === item.id ? 'page' : undefined"
							class="block rounded-md px-2 py-1.5 text-sm text-slate-700 no-underline transition-colors hover:bg-slate-100 hover:text-slate-900 aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary"
							@click.prevent="onClick(item.id)"
							>{{ item.title }}</a
						>
					</li>
				</ul>
			</div>
		</template>
	</div>
</template>
