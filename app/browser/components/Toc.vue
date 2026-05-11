<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { navigate } from '../router.js'

const props = defineProps<{
	scroller: HTMLElement | null
	currentId: string
}>()

const emit = defineEmits<{ navigate: [] }>()

interface Section {
	readonly id: string
	readonly label: string
	readonly level: number
}

const sections = ref<Section[]>([])
const active = ref<string | null>(null)
let io: IntersectionObserver | null = null

/* ── Discover sections + observe ────────────────────────────────────────────
   On every route change or scroller mount, walk the scroller's DOM for
   `section[id]` and rebuild the TOC. An IntersectionObserver tracks which
   section is currently in view so the matching link gets aria-current. */
const rebuild = async (): Promise<void> => {
	await nextTick()
	io?.disconnect()
	io = null

	const scroller = props.scroller
	if (!scroller) {
		sections.value = []
		active.value = null
		return
	}

	const list: Section[] = []
	for (const el of scroller.querySelectorAll<HTMLElement>('section[id], h2[id], h3[id]')) {
		const id = el.id
		if (!id || id === props.currentId) continue
		// Prefer the section's first heading text; fall back to id.
		const heading = el.querySelector<HTMLElement>('h1, h2, h3')
		const label = (heading?.textContent ?? id).trim()
		const level = el.tagName === 'H3' ? 3 : el.tagName === 'H2' ? 2 : 2
		list.push({ id, label, level })
	}
	sections.value = list

	if (list.length === 0) {
		active.value = null
		return
	}

	io = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((e) => e.isIntersecting)
				.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
			if (visible.length > 0) active.value = visible[0].target.id
		},
		{ root: scroller, rootMargin: '0px 0px -70% 0px', threshold: 0 },
	)

	for (const { id } of list) {
		const el = scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
		if (el) io.observe(el)
	}
	active.value = list[0]?.id ?? null
}

watch(
	() => [props.scroller, props.currentId] as const,
	() => {
		void rebuild()
	},
	{ immediate: true },
)

onMounted(() => {
	void rebuild()
})

onUnmounted(() => {
	io?.disconnect()
	io = null
})

const onClick = (event: MouseEvent, id: string): void => {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
	event.preventDefault()
	navigate(props.currentId, id)
	emit('navigate')
}
</script>

<template>
	<h2 class="toc-heading">On this page</h2>
	<nav v-if="sections.length > 0" aria-label="Table of contents" class="toc-list">
		<menu>
			<li v-for="s in sections" :key="s.id" :data-level="s.level">
				<a
					:href="`#/${currentId}/${s.id}`"
					:aria-current="active === s.id ? 'location' : undefined"
					@click="(e) => onClick(e, s.id)"
				>
					{{ s.label }}
				</a>
			</li>
		</menu>
	</nav>
	<p v-else class="toc-empty">No sections on this page.</p>
</template>

<style scoped>
.toc-heading {
	margin-block-end: calc(var(--spacing) * 2);
	font-size: var(--text-xs);
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-text-muted);
}

.toc-list menu {
	display: flex;
	flex-direction: column;
	gap: 1px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.toc-list li[data-level='3'] {
	padding-inline-start: calc(var(--spacing) * 3);
}

.toc-list a {
	display: block;
	padding-inline: calc(var(--spacing) * 2);
	padding-block: calc(var(--spacing) * 1);
	border-radius: var(--radius-md);
	border-inline-start: 2px solid transparent;
	color: var(--color-text-muted);
	text-decoration: none;
	font-size: var(--text-sm);
	line-height: 1.4;
}

.toc-list a:hover {
	color: var(--color-text);
	background-color: color-mix(in oklab, var(--color-text) 4%, transparent);
}

.toc-list a[aria-current='location'] {
	color: var(--color-primary);
	border-inline-start-color: var(--color-primary);
	font-weight: 500;
}

.toc-empty {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}
</style>
