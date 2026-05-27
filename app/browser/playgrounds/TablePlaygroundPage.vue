<script lang="ts" setup>
/**
 * Table playground — drives the createTable orthogonal sub-machines
 * from `tests/src/browser/factories/createTable.test.ts`:
 *
 *   - **Sort** per column: `'none' | 'asc' | 'desc'`. Toggling cycles.
 *   - **Selection** per row: `'unselected' | 'selected'`.
 *   - **Expansion** per row: `'collapsed' | 'expanded'`.
 *
 * State string aggregates the three regions so the harness's pass /
 * fail comparison covers all the active intent at once
 * (`sort=name:asc · selected=[1] · expanded=[2]`). Observable:
 * `[aria-sort]`, `[aria-selected]`, `[aria-expanded]`,
 * `TABLE_EVENTS.{sort, select, expand, collapse}`.
 */
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue'
import { createTable, TABLE_EVENTS } from '@elements/browser'
import type { CreateTableInstance } from '@elements/browser'
import { useLog } from '../composables.js'
import { waitForDelay } from '../helpers.js'
import StatechartHarness from './StatechartHarness.vue'

const tableRef = useTemplateRef<HTMLTableElement>('tableRef')
const factory = shallowRef<CreateTableInstance | null>(null)
const state = ref<string>('sort=none · selected=[] · expanded=[]')
const { entries: events, push } = useLog<{ name: string; time: number }>(16)

function sync(): void {
	const api = factory.value
	if (!api) {
		state.value = 'sort=none · selected=[] · expanded=[]'
		return
	}
	const nameDir = api.sort.direction('name')
	const sort = nameDir === 'none' ? 'name:none' : `name:${nameDir}`
	const selected = [...api.selection.ids].sort().join(',')
	const expanded = [...api.expansion.expanded].sort().join(',')
	state.value = `sort=${sort} · selected=[${selected}] · expanded=[${expanded}]`
}

let cleanup: (() => void) | null = null
onMounted(() => {
	const element = tableRef.value
	if (!element) return
	let seq = 0
	const instance = createTable(element, {
		columns: [
			{ key: 'name', title: 'Name', sortable: true },
			{ key: 'role', title: 'Role' },
		],
		headers: ['Name', 'Role'],
		rows: [
			['Alice', 'Engineer'],
			['Bob', 'Designer'],
			['Charlie', 'Manager'],
		],
		// Generator runs once per seeded row so ids are predictable
		// (`row-0`, `row-1`, `row-2`) and the playground's scenarios
		// can reference them by index.
		id: () => `row-${seq++}`,
		selection: { strategy: 'visible' as never },
		expansion: { multiple: true },
	} as never)
	factory.value = instance
	const log = (name: string) => (): void => {
		push({ name, time: performance.now() })
		sync()
	}
	const handlers: Array<[string, () => void]> = [
		[TABLE_EVENTS.sort, log(TABLE_EVENTS.sort)],
		[TABLE_EVENTS.select, log(TABLE_EVENTS.select)],
		[TABLE_EVENTS.expand, log(TABLE_EVENTS.expand)],
		[TABLE_EVENTS.collapse, log(TABLE_EVENTS.collapse)],
	]
	for (const [evt, handler] of handlers) element.addEventListener(evt, handler)
	sync()
	cleanup = () => {
		for (const [evt, handler] of handlers) element.removeEventListener(evt, handler)
		instance.destroy()
		factory.value = null
	}
})

async function reset(): Promise<void> {
	const api = factory.value
	if (!api) return
	api.sort.clear()
	api.selection.clear()
	api.expansion.collapse()
	await waitForDelay(150)
	sync()
}

function rowId(rowIndex: number): string {
	// Mirrors the deterministic `id` generator above (row-0 / row-1 /
	// row-2) so the scenario assertions can reference rows by position
	// without depending on table-internal id-derivation details.
	return `row-${rowIndex}`
}

const scenarios = [
	{
		name: 'sort.toggle(name) → asc',
		from: 'sort=name:none · selected=[] · expanded=[]',
		event: 'toggle',
		to: 'sort=name:asc · selected=[] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.sort.toggle('name')
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'sort.toggle(name) twice → desc',
		from: 'sort=name:asc · selected=[] · expanded=[]',
		event: 'toggle',
		to: 'sort=name:desc · selected=[] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.sort.toggle('name')
			await waitForDelay(150)
			factory.value?.sort.toggle('name')
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'sort.clear() restores none',
		from: 'sort=name:desc · selected=[] · expanded=[]',
		event: 'clear',
		to: 'sort=name:none · selected=[] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.sort.toggle('name')
			factory.value?.sort.toggle('name')
			await waitForDelay(150)
			factory.value?.sort.clear()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'selection.select(row-1)',
		from: 'sort=name:none · selected=[] · expanded=[]',
		event: 'select',
		to: 'sort=name:none · selected=[row-1] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.selection.select(rowId(1))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'selection.clear() empties',
		from: 'sort=name:none · selected=[row-1] · expanded=[]',
		event: 'clear',
		to: 'sort=name:none · selected=[] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.selection.select(rowId(1))
			await waitForDelay(150)
			factory.value?.selection.clear()
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'expansion.expand(row-0)',
		from: 'sort=name:none · selected=[] · expanded=[]',
		event: 'expand',
		to: 'sort=name:none · selected=[] · expanded=[row-0]',
		run: async () => {
			await reset()
			factory.value?.expansion.expand(rowId(0))
			await waitForDelay(200)
			sync()
		},
	},
	{
		name: 'expansion.collapse() resets',
		from: 'sort=name:none · selected=[] · expanded=[row-0]',
		event: 'collapse',
		to: 'sort=name:none · selected=[] · expanded=[]',
		run: async () => {
			await reset()
			factory.value?.expansion.expand(rowId(0))
			await waitForDelay(150)
			factory.value?.expansion.collapse()
			await waitForDelay(200)
			sync()
		},
	},
] as const

onUnmounted(() => {
	cleanup?.()
})
</script>

<template>
	<StatechartHarness
		title="createTable"
		:state="state"
		:events="events"
		:scenarios="scenarios"
		:step="reset"
	>
		<table ref="tableRef" class="showcase-table-playground"></table>
	</StatechartHarness>
</template>

<style scoped>
.showcase-table-playground {
	inline-size: 100%;
	border-collapse: collapse;
}
.showcase-table-playground :deep(th),
.showcase-table-playground :deep(td) {
	padding: calc(var(--spacing) * 2) calc(var(--spacing) * 3);
	text-align: start;
	border-block-end: 1px solid var(--set-border-color);
}
</style>
