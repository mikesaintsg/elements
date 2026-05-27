import { describe, expect, it } from 'vitest'
import type { CreateTableInstance } from '@elements/browser'
import { createTable, TABLE_EVENTS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

function buildTable(): HTMLTableElement {
	return buildElement('table')
}

describe('createTable', () => {
	it('rejects non-<table> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createTable(wrong as unknown as HTMLTableElement)).toThrowError(/table/i)
	})

	it('seeds caption / headers / rows / footer from options', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				caption: 'Demo',
				headers: ['name', 'age'],
				rows: [
					['Ada', 36],
					['Linus', 54],
				],
				footer: ['n=2', ''],
			}),
		)
		expect(api.caption.value.value).toBe('Demo')
		expect(api.headers.values.value).toEqual(['name', 'age'])
		expect(api.rows.count.value).toBe(2)
		expect(api.footer.values.value).toEqual(['n=2', ''])
		expect(api.data.value).toEqual([
			['Ada', '36'],
			['Linus', '54'],
		])
	})

	it('writes / updates rows via the rows domain', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, { headers: ['k'], rows: [['a'], ['b']] }),
		)
		expect(api.rows.count.value).toBe(2)
		api.rows.append(['c'], 'row-c')
		expect(api.rows.count.value).toBe(3)
		expect(api.rows.id(2)).toBe('row-c')
		api.rows.update(0, ['z'])
		expect(api.cells.read({ row: 0, column: 0 })).toBe('z')
		api.rows.remove(1)
		expect(api.rows.count.value).toBe(2)
	})

	it('sort.toggle cycles direction and writes aria-sort', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Name', 'Age'],
				rows: [['a', '1']],
				columns: [
					{ key: 'name', sortable: true },
					{ key: 'age', sortable: true },
				],
			}),
		)
		const sortRecorder = createRecorder<[Event]>()
		table.addEventListener(TABLE_EVENTS.sort, sortRecorder.handler)
		api.sort.toggle('name')
		expect(api.sort.direction('name')).toBe('asc')
		const head = table.querySelector<HTMLTableCellElement>('thead th[data-key="name"]')
		expect(head?.getAttribute('aria-sort')).toBe('ascending')
		api.sort.toggle('name')
		expect(api.sort.direction('name')).toBe('desc')
		expect(head?.getAttribute('aria-sort')).toBe('descending')
		api.sort.toggle('name') // back to none (no mandate)
		expect(api.sort.direction('name')).toBe('none')
		expect(head?.hasAttribute('aria-sort')).toBe(false)
		expect(sortRecorder.count).toBe(3)
	})

	it('sorts by `data-sort-value` when present, falling back to cell text', () => {
		// A formatted currency column ("$1,200.00") sorts lexicographically by
		// text ($1,200 before $24); a numeric `data-sort-value` makes it sort
		// by magnitude instead.
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Item', 'Amount'],
				rows: [
					['A', '$1,200.00'],
					['B', '$24.00'],
					['C', '$480.00'],
				],
				columns: [{ key: 'item' }, { key: 'amount', sortable: true }],
				sort: { auto: true },
			}),
		)
		const rows = Array.from(table.tBodies[0]?.rows ?? [])
		const values = ['1200', '24', '480']
		const ids = ['a', 'b', 'c']
		rows.forEach((row, i) => {
			row.dataset.id = ids[i] ?? ''
			const amount = row.cells[1]
			if (amount) amount.dataset.sortValue = values[i] ?? ''
		})
		api.sort.toggle('amount') // ascending
		const order = Array.from(table.tBodies[0]?.rows ?? []).map((r) => r.dataset.id)
		// Numeric order (24 → 480 → 1200), NOT lexicographic ($1,200 first).
		expect(order).toEqual(['b', 'c', 'a'])
	})

	it('sortable headers seed `aria-sort="none"` and `tabindex="0"` so AT users see them as sortable', () => {
		const table = buildTable()
		createFactoryFixture(() =>
			createTable(table, {
				headers: ['Name', 'Age'],
				rows: [['a', '1']],
				columns: [
					{ key: 'name', sortable: true },
					{ key: 'age' }, // not sortable
				],
			}),
		)
		const nameTh = table.querySelector<HTMLTableCellElement>('thead th[data-key="name"]')
		const ageTh = table.querySelector<HTMLTableCellElement>('thead th[data-key="age"]')
		expect(nameTh?.getAttribute('aria-sort')).toBe('none')
		expect(nameTh?.getAttribute('tabindex')).toBe('0')
		// Non-sortable columns get neither attribute.
		expect(ageTh?.hasAttribute('aria-sort')).toBe(false)
		expect(ageTh?.hasAttribute('tabindex')).toBe(false)
	})

	it('clicking a sortable column header cycles sort direction', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Name'],
				rows: [['a']],
				columns: [{ key: 'name', sortable: true }],
			}),
		)
		const head = table.querySelector<HTMLTableCellElement>('thead th[data-key="name"]')
		expect(head).toBeTruthy()
		head!.click()
		expect(api.sort.direction('name')).toBe('asc')
		expect(head!.getAttribute('aria-sort')).toBe('ascending')
		head!.click()
		expect(api.sort.direction('name')).toBe('desc')
		head!.click()
		expect(api.sort.direction('name')).toBe('none')
	})

	it('Enter / Space on a focused sortable header drives the same cycle as click', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Name'],
				rows: [['a']],
				columns: [{ key: 'name', sortable: true }],
			}),
		)
		const head = table.querySelector<HTMLTableCellElement>('thead th[data-key="name"]')!
		head.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
		expect(api.sort.direction('name')).toBe('asc')
		head.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
		expect(api.sort.direction('name')).toBe('desc')
	})

	it('sort.auto (default) physically reorders <tbody> rows on sort', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Fruit', 'Quantity'],
				rows: [
					['Banana', '5'],
					['Apple', '12'],
					['Cherry', '20'],
				],
				columns: [
					{ key: 'fruit', sortable: true },
					{ key: 'qty', sortable: true },
				],
			}),
		)
		// Initial: insertion order
		const before = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(
			(r) => r.cells[0]!.textContent,
		)
		expect(before).toEqual(['Banana', 'Apple', 'Cherry'])
		// Sort fruit asc (alphabetical)
		api.sort.toggle('fruit')
		const afterAsc = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(
			(r) => r.cells[0]!.textContent,
		)
		expect(afterAsc).toEqual(['Apple', 'Banana', 'Cherry'])
		// Sort fruit desc
		api.sort.toggle('fruit')
		const afterDesc = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(
			(r) => r.cells[0]!.textContent,
		)
		expect(afterDesc).toEqual(['Cherry', 'Banana', 'Apple'])
	})

	it('sort.auto comparator sorts numeric columns numerically (not lexicographically)', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Fruit', 'Quantity'],
				rows: [
					['Apple', '12'],
					['Banana', '5'],
					['Cherry', '20'],
				],
				columns: [
					{ key: 'fruit', sortable: true },
					{ key: 'qty', sortable: true },
				],
			}),
		)
		api.sort.toggle('qty')
		// Lexicographic would give ['12', '20', '5']; numeric gives ['5', '12', '20'].
		const after = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(
			(r) => r.cells[1]!.textContent,
		)
		expect(after).toEqual(['5', '12', '20'])
	})

	it('sort.auto: false keeps row order even when sort state changes', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Fruit'],
				rows: [['Banana'], ['Apple'], ['Cherry']],
				columns: [{ key: 'fruit', sortable: true }],
				sort: { auto: false },
			}),
		)
		api.sort.toggle('fruit')
		// sort state updated...
		expect(api.sort.direction('fruit')).toBe('asc')
		// ...but row order untouched (consumer drives reorder).
		const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(
			(r) => r.cells[0]!.textContent,
		)
		expect(rows).toEqual(['Banana', 'Apple', 'Cherry'])
	})

	it('clicking a non-sortable header does NOT toggle sort', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() =>
			createTable(table, {
				headers: ['Name', 'Age'],
				rows: [['a', '1']],
				columns: [{ key: 'name', sortable: true }, { key: 'age' }],
			}),
		)
		const ageTh = table.querySelector<HTMLTableCellElement>('thead th[data-key="age"]')!
		ageTh.click()
		expect(api.sort.direction('age')).toBe('none')
		expect(api.sort.columns.value.length).toBe(0)
	})

	it('selection.select toggles aria-selected on rows by id', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() => {
			const instance = createTable(table, { rows: [['a'], ['b'], ['c']] })
			// Manually seed ids since we did not use options.id.
			const rows = instance.rows.rows()
			rows[0]!.dataset.id = 'r0'
			rows[1]!.dataset.id = 'r1'
			rows[2]!.dataset.id = 'r2'
			instance.refresh()
			return instance
		})
		const selectRecorder = createRecorder<[Event]>()
		table.addEventListener(TABLE_EVENTS.select, selectRecorder.handler)
		api.selection.select('r1')
		expect(api.selection.ids.has('r1')).toBe(true)
		const row = api.rows.row(1)
		expect(row?.getAttribute('aria-selected')).toBe('true')
		const other = api.rows.row(0)
		expect(other?.getAttribute('aria-selected')).toBe('false')
		api.selection.toggle('r1')
		expect(api.selection.ids.has('r1')).toBe(false)
		expect(selectRecorder.count).toBeGreaterThanOrEqual(2)
	})

	it('emits TABLE_EVENTS.change on row mutations', () => {
		const table = buildTable()
		const change = createRecorder<[Event]>()
		table.addEventListener(TABLE_EVENTS.change, change.handler)
		const [api] = createFactoryFixture(() => createTable(table, { rows: [['a']] }))
		api.rows.append(['b'])
		api.rows.remove(0)
		expect(change.count).toBeGreaterThanOrEqual(2)
	})

	it('expansion.expand / collapse toggles [data-table-expanded] + [inert] panel', () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() => {
			const instance = createTable(table, { rows: [['a'], ['b']] })
			const rows = instance.rows.rows()
			rows[0]!.dataset.id = 'r0'
			rows[1]!.dataset.id = 'r1'
			// Inject expansion detail rows after each data row so the
			// factory can find them via `findDetailRow`.
			for (const row of rows) {
				const detail = document.createElement('tr')
				detail.setAttribute('data-table-expansion', '')
				const cell = document.createElement('td')
				const panel = document.createElement('div')
				panel.setAttribute('data-table-expansion-panel', '')
				panel.setAttribute('inert', '')
				panel.textContent = `Detail for ${row.dataset.id}`
				cell.appendChild(panel)
				detail.appendChild(cell)
				row.parentElement?.insertBefore(detail, row.nextSibling)
			}
			instance.refresh()
			return instance
		})
		api.expansion.expand('r0')
		const row0 = api.rows.row(0)!
		expect(row0.hasAttribute('data-table-expanded')).toBe(true)
		const detail0 = row0.nextElementSibling as HTMLElement
		const panel0 = detail0.querySelector<HTMLElement>('[data-table-expansion-panel]')!
		expect(panel0.hasAttribute('inert')).toBe(false)

		api.expansion.collapse('r0')
		expect(row0.hasAttribute('data-table-expanded')).toBe(false)
		expect(panel0.hasAttribute('inert')).toBe(true)
	})

	it('expansion.multiple:false keeps only one row open at a time', async () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() => {
			const instance = createTable(table, {
				rows: [['a'], ['b']],
				expansion: { multiple: false },
			})
			const rows = instance.rows.rows()
			rows[0]!.dataset.id = 'r0'
			rows[1]!.dataset.id = 'r1'
			instance.refresh()
			return instance
		})
		api.expansion.expand('r0')
		expect(api.expansion.expanded.has('r0')).toBe(true)
		api.expansion.expand('r1')
		// `expansion.multiple: false` awaits the prior collapse via the
		// async expand/collapse pipeline. Even on the non-animated path
		// the await creates a microtask boundary; flush it before asserting.
		await Promise.resolve()
		expect(api.expansion.expanded.has('r1')).toBe(true)
		expect(api.expansion.expanded.has('r0')).toBe(false)
	})

	it('expansion drives the CSS-owned tween via [data-table-expanded] + [inert] on the panel', () => {
		// Earlier versions of `createTable` hand-rolled the height tween in JS
		// (`[data-collapsing]` + `style.height = 0 → scrollHeight`, awaiting
		// `transitionend`). The motion is now owned by `elements/_table.scss`
		// § "Row expansion panel" via `interpolate-size: allow-keywords` on
		// the `block-size: 0 → auto` transition keyed off `tr[data-table-
		// expanded] + tr > td > [data-table-expansion-panel]`. The factory's
		// only DOM writes for expansion are `[data-table-expanded]` on the
		// data row and `[inert]` on the panel (replaces the previous
		// `[hidden]` toggle, which would have frozen the CSS tween by
		// forcing `display: none`).
		const table = buildTable()
		const [api] = createFactoryFixture(() => {
			const instance = createTable(table, { rows: [['a']] })
			const row = instance.rows.row(0)!
			row.dataset.id = 'r0'
			const detail = document.createElement('tr')
			detail.setAttribute('data-table-expansion', '')
			const cell = document.createElement('td')
			const panel = document.createElement('div')
			panel.setAttribute('data-table-expansion-panel', '')
			panel.setAttribute('inert', '')
			panel.textContent = 'Detail'
			cell.appendChild(panel)
			detail.appendChild(cell)
			row.parentElement?.insertBefore(detail, row.nextSibling)
			instance.refresh()
			return instance
		})
		const row0 = api.rows.row(0)!
		const panel = (row0.nextElementSibling as HTMLElement).querySelector<HTMLElement>(
			'[data-table-expansion-panel]',
		)!
		// Synchronous expand: the public `expand()` no longer returns a
		// Promise, and there's no `runTransition` wait — the SCSS owns
		// the visual timing.
		api.expansion.expand('r0')
		expect(api.expansion.expanded.has('r0')).toBe(true)
		expect(row0.hasAttribute('data-table-expanded')).toBe(true)
		expect(panel.hasAttribute('inert')).toBe(false)
		// No leftover legacy markers from the previous JS animation.
		expect(panel.hasAttribute('data-collapsing')).toBe(false)
		expect(panel.style.height).toBe('')

		api.expansion.collapse('r0')
		expect(api.expansion.expanded.has('r0')).toBe(false)
		expect(row0.hasAttribute('data-table-expanded')).toBe(false)
		expect(panel.hasAttribute('inert')).toBe(true)
	})

	it('destroy reverses every listener and ARIA', () => {
		assertCleanDispose(
			() =>
				createTable(buildTable(), {
					headers: ['A'],
					rows: [['x']],
					focus: { keyboard: true },
				}),
			(instance) => {
				instance.rows.append(['y'], 'r-y')
				instance.selection.select('r-y')
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Table is a compound state machine with six orthogonal sub-domains
// (sort, selection, expansion, resize, focus, pagination). Each domain
// has its own statechart; this file covers the three with the cleanest
// finite-state shape (sort cycle, selection toggle, expansion toggle).
//
// Resize, focus, and pagination involve pointer-pixel arithmetic /
// keyboard direction vectors that resist tabular coverage; the existing
// one-off tests above already cover those flows.

// === Sort sub-machine ======================================================
// Per-column sort direction cycles: 'none' → 'asc' → 'desc' → 'none' on
// each `sort.toggle(key)`. `[aria-sort]` on the header mirrors direction.

type TableSortState = 'none' | 'asc' | 'desc'
type TableSortEvent = 'toggle'

interface TableSortContext {
	readonly api: CreateTableInstance
	readonly head: HTMLTableCellElement
}

function buildSortableTable(): TableSortContext {
	const table = buildElement('table')
	const [api] = createFactoryFixture(() =>
		createTable(table, {
			headers: ['Name'],
			rows: [['a']],
			columns: [{ key: 'name', sortable: true }],
		}),
	)
	const head = table.querySelector<HTMLTableCellElement>('thead th[data-key="name"]')
	if (!head) throw new Error('Expected sortable name column header')
	return { api, head }
}

function driveToSortState(context: TableSortContext, state: TableSortState): void {
	if (state === 'asc') context.api.sort.toggle('name')
	if (state === 'desc') {
		context.api.sort.toggle('name')
		context.api.sort.toggle('name')
	}
}

function fireSortEvent(context: TableSortContext, _event: TableSortEvent): void {
	context.api.sort.toggle('name')
}

const TABLE_SORT_OBSERVABLES: Readonly<Record<TableSortState, string | null>> = {
	none: null,
	asc: 'ascending',
	desc: 'descending',
}

function assertSortState(context: TableSortContext, state: TableSortState): void {
	expect(context.api.sort.direction('name')).toBe(state)
	expect(context.head.getAttribute('aria-sort')).toBe(TABLE_SORT_OBSERVABLES[state])
}

const TABLE_SORT_SCENARIOS: readonly StateScenario<
	TableSortState,
	TableSortEvent,
	TableSortContext
>[] = [
	{
		transition: { name: 'none × toggle → asc', from: 'none', event: 'toggle', to: 'asc' },
		arrange: driveToSortState,
		act: fireSortEvent,
		assert: assertSortState,
	},
	{
		transition: { name: 'asc × toggle → desc', from: 'asc', event: 'toggle', to: 'desc' },
		arrange: driveToSortState,
		act: fireSortEvent,
		assert: assertSortState,
	},
	{
		transition: { name: 'desc × toggle → none', from: 'desc', event: 'toggle', to: 'none' },
		arrange: driveToSortState,
		act: fireSortEvent,
		assert: assertSortState,
	},
]

describe('createTable (statechart) — sort direction cycle', () => {
	it.each(TABLE_SORT_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildSortableTable()
		expect(context.api.sort.direction('name')).toBe('none')
		await runScenario(scenario, context)
	})
})

// === Selection sub-machine =================================================
// Per-row selection: 'unselected' → 'selected' on `selection.select(id)`,
// flipped by `selection.toggle(id)`. `[aria-selected]` on the row mirrors.

type TableSelectionState = 'unselected' | 'selected'
type TableSelectionEvent = 'select' | 'toggle' | 'clear'

interface TableSelectionContext {
	readonly api: CreateTableInstance
}

function buildSelectableTable(): TableSelectionContext {
	const table = buildElement('table')
	const [api] = createFactoryFixture(() => {
		const instance = createTable(table, { rows: [['a'], ['b'], ['c']] })
		const rows = instance.rows.rows()
		for (let i = 0; i < rows.length; i += 1) {
			const row = rows[i]
			if (row) row.dataset.id = `r${i}`
		}
		instance.refresh()
		return instance
	})
	return { api }
}

function driveToSelectionState(context: TableSelectionContext, state: TableSelectionState): void {
	if (state === 'selected') context.api.selection.select('r0')
}

function fireSelectionEvent(context: TableSelectionContext, event: TableSelectionEvent): void {
	if (event === 'select') {
		context.api.selection.select('r0')
		return
	}
	if (event === 'toggle') {
		context.api.selection.toggle('r0')
		return
	}
	context.api.selection.clear()
}

function assertSelectionState(context: TableSelectionContext, state: TableSelectionState): void {
	const expectedSelected = state === 'selected'
	expect(context.api.selection.ids.has('r0')).toBe(expectedSelected)
	// `aria-selected="true"` when selected; the factory removes the
	// attribute entirely on clear/toggle-off rather than writing 'false'.
	const ariaSelected = context.api.rows.row(0)?.getAttribute('aria-selected')
	expect(ariaSelected).toBe(expectedSelected ? 'true' : null)
}

const TABLE_SELECTION_SCENARIOS: readonly StateScenario<
	TableSelectionState,
	TableSelectionEvent,
	TableSelectionContext
>[] = [
	{
		transition: {
			name: 'unselected × select → selected',
			from: 'unselected',
			event: 'select',
			to: 'selected',
		},
		arrange: driveToSelectionState,
		act: fireSelectionEvent,
		assert: assertSelectionState,
	},
	{
		transition: {
			name: 'selected × toggle → unselected',
			from: 'selected',
			event: 'toggle',
			to: 'unselected',
		},
		arrange: driveToSelectionState,
		act: fireSelectionEvent,
		assert: assertSelectionState,
	},
	{
		transition: {
			name: 'selected × clear → unselected',
			from: 'selected',
			event: 'clear',
			to: 'unselected',
		},
		arrange: driveToSelectionState,
		act: fireSelectionEvent,
		assert: assertSelectionState,
	},
	{
		transition: {
			name: 'unselected × toggle → selected',
			from: 'unselected',
			event: 'toggle',
			to: 'selected',
		},
		arrange: driveToSelectionState,
		act: fireSelectionEvent,
		assert: assertSelectionState,
	},
]

describe('createTable (statechart) — row selection toggle', () => {
	it.each(TABLE_SELECTION_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildSelectableTable()
		expect(context.api.selection.ids.size).toBe(0)
		await runScenario(scenario, context)
	})
})

// === Expansion sub-machine =================================================
// Per-row expansion: 'collapsed' → 'expanded' on `expansion.expand(id)`,
// flipped by `expansion.toggle(id)` / `expansion.collapse(id)`.
// `[data-table-expanded]` on the row + `[inert]` on the panel mirror.

type TableExpansionState = 'collapsed' | 'expanded'
type TableExpansionEvent = 'expand' | 'collapse' | 'toggle'

interface TableExpansionContext {
	readonly api: CreateTableInstance
}

function buildExpandableTable(): TableExpansionContext {
	const table = buildElement('table')
	const [api] = createFactoryFixture(() => {
		const instance = createTable(table, { rows: [['a']] })
		const row = instance.rows.row(0)
		if (row) {
			row.dataset.id = 'r0'
			const detail = document.createElement('tr')
			detail.setAttribute('data-table-expansion', '')
			const cell = document.createElement('td')
			const panel = document.createElement('div')
			panel.setAttribute('data-table-expansion-panel', '')
			panel.setAttribute('inert', '')
			cell.appendChild(panel)
			detail.appendChild(cell)
			row.parentElement?.insertBefore(detail, row.nextSibling)
		}
		instance.refresh()
		return instance
	})
	return { api }
}

function driveToExpansionState(context: TableExpansionContext, state: TableExpansionState): void {
	if (state === 'expanded') context.api.expansion.expand('r0')
}

function fireExpansionEvent(context: TableExpansionContext, event: TableExpansionEvent): void {
	if (event === 'expand') {
		context.api.expansion.expand('r0')
		return
	}
	if (event === 'collapse') {
		context.api.expansion.collapse('r0')
		return
	}
	context.api.expansion.toggle('r0')
}

function assertExpansionState(context: TableExpansionContext, state: TableExpansionState): void {
	const expectedExpanded = state === 'expanded'
	expect(context.api.expansion.expanded.has('r0')).toBe(expectedExpanded)
	const row = context.api.rows.row(0)
	expect(row?.hasAttribute('data-table-expanded')).toBe(expectedExpanded)
}

const TABLE_EXPANSION_SCENARIOS: readonly StateScenario<
	TableExpansionState,
	TableExpansionEvent,
	TableExpansionContext
>[] = [
	{
		transition: {
			name: 'collapsed × expand → expanded',
			from: 'collapsed',
			event: 'expand',
			to: 'expanded',
		},
		arrange: driveToExpansionState,
		act: fireExpansionEvent,
		assert: assertExpansionState,
	},
	{
		transition: {
			name: 'expanded × collapse → collapsed',
			from: 'expanded',
			event: 'collapse',
			to: 'collapsed',
		},
		arrange: driveToExpansionState,
		act: fireExpansionEvent,
		assert: assertExpansionState,
	},
	{
		transition: {
			name: 'collapsed × toggle → expanded',
			from: 'collapsed',
			event: 'toggle',
			to: 'expanded',
		},
		arrange: driveToExpansionState,
		act: fireExpansionEvent,
		assert: assertExpansionState,
	},
	{
		transition: {
			name: 'expanded × toggle → collapsed',
			from: 'expanded',
			event: 'toggle',
			to: 'collapsed',
		},
		arrange: driveToExpansionState,
		act: fireExpansionEvent,
		assert: assertExpansionState,
	},
]

describe('createTable (statechart) — row expansion toggle', () => {
	it.each(TABLE_EXPANSION_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildExpandableTable()
		expect(context.api.expansion.expanded.size).toBe(0)
		await runScenario(scenario, context)
	})
})
