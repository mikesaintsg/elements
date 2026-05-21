<script lang="ts" setup>
/**
 * BoardExample — the framework's drag-and-drop board pillar.
 *
 * A Kanban board built from bare elements + the useDrag composable. The
 * board is a horizontal row of column <section>s; each column owns a
 * reorderable <ul> whose direct `[data-index]` card rows are draggable via
 * `useDrag(host, { list })` — Vue's reactivity splices the list on drop,
 * no manual DOM moves. Cards are bare <article>s with .badge / .avatar
 * atoms. Columns scroll horizontally on narrow viewports (mobile swipe).
 *
 * Each column is its own useDrag list, so intra-column reordering is
 * automatic. Cross-column moves are coordinated through the public drag
 * events (start / drop / end): the dragged cards are captured on start and,
 * on a drop in a different column, spliced out of the source list and into
 * the target — the framework's documented cross-list recipe.
 */
import { ref } from 'vue'
import type { UseDragReturn } from '../../../src/browser'
import { isDragDropDetail, isDragStartDetail, useDrag } from '../../../src/browser'

interface Card {
	readonly id: string
	readonly title: string
	readonly tag: string
	readonly variant: string
	readonly assignee: string
	readonly points: number
}

const backlog = ref<Card[]>([
	{
		id: 'c1',
		title: 'Audit color-contrast in dark mode',
		tag: 'a11y',
		variant: 'information',
		assignee: 'AL',
		points: 3,
	},
	{
		id: 'c2',
		title: 'Token docs: radius factor examples',
		tag: 'docs',
		variant: 'secondary',
		assignee: 'GH',
		points: 2,
	},
	{
		id: 'c3',
		title: 'Drop legacy grid system',
		tag: 'chore',
		variant: 'warning',
		assignee: 'LT',
		points: 5,
	},
])
const progress = ref<Card[]>([
	{
		id: 'c4',
		title: 'Reveal modifier: phase 1 spike',
		tag: 'feature',
		variant: 'primary',
		assignee: 'MH',
		points: 8,
	},
	{
		id: 'c5',
		title: 'Three-pane Mail example',
		tag: 'examples',
		variant: 'success',
		assignee: 'HL',
		points: 5,
	},
])
const review = ref<Card[]>([
	{
		id: 'c6',
		title: 'Stat-band on Pricing page',
		tag: 'examples',
		variant: 'success',
		assignee: 'AL',
		points: 2,
	},
	{
		id: 'c7',
		title: 'Fix select caret in dark mode',
		tag: 'bug',
		variant: 'danger',
		assignee: 'GH',
		points: 1,
	},
])
const done = ref<Card[]>([
	{
		id: 'c8',
		title: 'Two-axis theming (data-mode / data-theme)',
		tag: 'feature',
		variant: 'primary',
		assignee: 'MH',
		points: 13,
	},
	{
		id: 'c9',
		title: 'Drawer multi-child packing',
		tag: 'framework',
		variant: 'information',
		assignee: 'LT',
		points: 3,
	},
])

const backlogHost = ref<HTMLElement | null>(null)
const progressHost = ref<HTMLElement | null>(null)
const reviewHost = ref<HTMLElement | null>(null)
const doneHost = ref<HTMLElement | null>(null)

interface Column {
	readonly title: string
	readonly variant: string
	readonly list: typeof backlog
	readonly host: typeof backlogHost
}
const columns: readonly Column[] = [
	{ title: 'Backlog', variant: 'secondary', list: backlog, host: backlogHost },
	{ title: 'In progress', variant: 'primary', list: progress, host: progressHost },
	{ title: 'Review', variant: 'warning', list: review, host: reviewHost },
	{ title: 'Done', variant: 'success', list: done, host: doneHost },
]

// Each column is its own useDrag list, so intra-column reordering is
// automatic (the composable splices the column's list on drop). Moves
// BETWEEN columns are coordinated through the public drag events: capture
// the dragged cards on `start`, and on `drop` in a *different* column
// splice them out of the source list and into the target at the drop
// position. This is the framework's documented cross-list recipe.
const drags: (UseDragReturn | null)[] = columns.map(() => null)

interface Move {
	readonly column: number
	readonly indices: readonly number[]
	readonly cards: readonly Card[]
}
let pending: Move | null = null

const onStart = (column: number, event: CustomEvent): void => {
	if (!isDragStartDetail(event.detail)) return
	const indices = [...event.detail.indices].sort((a, b) => a - b)
	const list = columns[column]?.list
	if (!list) return
	const cards = indices.map((i) => list.value[i]).filter((card): card is Card => Boolean(card))
	pending = { column, indices, cards }
}

const onDrop = (column: number, event: CustomEvent): void => {
	const move = pending
	if (!move || column === move.column) return // same column → useDrag already reordered
	if (!isDragDropDetail(event.detail)) return
	const sourceList = columns[move.column]?.list
	const destList = columns[column]?.list
	if (!sourceList || !destList) return
	// Remove from source high-index-first so earlier indices stay valid.
	for (const i of [...move.indices].sort((a, b) => b - a)) sourceList.value.splice(i, 1)
	const { index, position } = event.detail
	const insertAt =
		index !== null && position !== null && position !== 'into'
			? position === 'after'
				? index + 1
				: index
			: destList.value.length
	destList.value.splice(insertAt, 0, ...move.cards)
	const sourceDrag = drags[move.column]
	const targetDrag = drags[column]
	window.setTimeout(() => {
		sourceDrag?.clear()
		targetDrag?.clear()
	}, 0)
	pending = null
}

const onEnd = (): void => {
	pending = null
}

columns.forEach((col, index) => {
	drags[index] = useDrag<Card>(col.host, {
		list: col.list,
		axis: 'vertical',
		on: {
			start: (event) => onStart(index, event),
			drop: (event) => onDrop(index, event),
			end: onEnd,
		},
	})
})

// Function-ref setter: inside a v-for, binding `:ref` to a ref object does
// not populate it — Vue needs a function ref per iteration. Each column's
// <ul> writes its element into the column's own host ref, which is what
// useDrag watches.
const setHost =
	(column: Column) =>
	(el: unknown): void => {
		column.host.value = el instanceof HTMLElement ? el : null
	}
</script>

<template>
	<!-- App bar. -->
	<header>
		<span class="avatar square primary" aria-hidden="true">B</span>
		<strong class="flex-1">Sprint 24 board</strong>
		<button type="button" class="subtle">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
			Filter
		</button>
		<button type="button" class="primary">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			New card
		</button>
	</header>

	<!-- Board. -->
	<main>
		<div class="flex gap-4 items-start overflow-x-auto w-full lg:h-full pb-2">
			<section
				v-for="column in columns"
				:key="column.title"
				class="flex flex-col gap-3 shrink-0 w-72 lg:h-full"
				:aria-label="column.title"
			>
				<header class="flex items-center justify-between gap-2 flex-nowrap">
					<span class="flex items-center gap-2 flex-nowrap">
						<span class="dot" :class="column.variant" aria-hidden="true"></span>
						<strong>{{ column.title }}</strong>
					</span>
					<span class="badge">{{ column.list.value.length }}</span>
				</header>

				<ul
					:ref="setHost(column)"
					class="flex flex-col gap-2 list-none lg:overflow-y-auto"
					:aria-label="`${column.title} cards`"
				>
					<li v-for="(card, index) in column.list.value" :key="card.id" :data-index="index">
						<article class="small" style="cursor: grab">
							<div class="cluster items-center justify-between flex-nowrap">
								<span class="badge" :class="card.variant">{{ card.tag }}</span>
								<small style="color: var(--color-text-subtle)">{{ card.id.toUpperCase() }}</small>
							</div>
							<p class="m-0">{{ card.title }}</p>
							<div class="cluster items-center justify-between flex-nowrap">
								<span class="avatar small" aria-hidden="true">{{ card.assignee }}</span>
								<span class="badge secondary subtle">{{ card.points }} pts</span>
							</div>
						</article>
					</li>
				</ul>

				<button type="button" class="subtle compact w-full">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
					Add card
				</button>
			</section>
		</div>
	</main>
</template>
