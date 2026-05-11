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

/* Walk the scroller's `section[id]` descendants on every route change,
 * build the on-this-page list, and observe each with an
 * IntersectionObserver. Whichever section is closest to the viewport
 * top gets `active = id` → the matching anchor picks up
 * `aria-current="location"`, which `showcase.css` paints. */
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
		const heading = el.querySelector<HTMLElement>('h1, h2, h3')
		const label = (heading?.textContent ?? id).trim()
		const level = el.tagName === 'H3' ? 3 : 2
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
	<h2>On this page</h2>
	<!-- WAI-ARIA APG: the in-page TOC is a "Table of contents" navigation
	     landmark. Framework's components/_nav.scss + the showcase rules
	     in showcase.css paint the active-link affordance. -->
	<nav v-if="sections.length > 0" aria-label="Table of contents">
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
	<p v-else>
		<small>No sections on this page.</small>
	</p>
</template>
