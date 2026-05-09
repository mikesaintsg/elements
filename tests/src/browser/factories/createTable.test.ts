import { describe, expect, it } from 'vitest'
import { createTable, TABLE_EVENTS, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
	fireTransitionEnd,
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
		const sortRecorder = createRecorder<[CustomEvent]>()
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
		const selectRecorder = createRecorder<[CustomEvent]>()
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
		const change = createRecorder<[CustomEvent]>()
		table.addEventListener(TABLE_EVENTS.change, change.handler)
		const [api] = createFactoryFixture(() => createTable(table, { rows: [['a']] }))
		api.rows.append(['b'])
		api.rows.remove(0)
		expect(change.count).toBeGreaterThanOrEqual(2)
	})

	it('expansion.expand / collapse toggles [data-table-expanded] + [hidden] panel', () => {
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
				panel.setAttribute('hidden', '')
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
		expect(panel0.hasAttribute('hidden')).toBe(false)

		api.expansion.collapse('r0')
		expect(row0.hasAttribute('data-table-expanded')).toBe(false)
		expect(panel0.hasAttribute('hidden')).toBe(true)
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

	it('expansion.animate:true drives a height transition via [data-collapsing]', async () => {
		const table = buildTable()
		const [api] = createFactoryFixture(() => {
			const instance = createTable(table, {
				rows: [['a']],
				expansion: { animate: true },
			})
			const row = instance.rows.row(0)!
			row.dataset.id = 'r0'
			const detail = document.createElement('tr')
			detail.setAttribute('data-table-expansion', '')
			const cell = document.createElement('td')
			const panel = document.createElement('div')
			panel.setAttribute('data-table-expansion-panel', '')
			panel.setAttribute('hidden', '')
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
		// Kick off the animated open. While pending, the panel carries
		// `[data-collapsing]` and an inline height; both clear on the
		// `transitionend` callback.
		const opening = api.expansion.expand('r0')
		await Promise.resolve()
		expect(panel.hasAttribute('data-collapsing')).toBe(true)
		// Fire transitionend manually to settle the runTransition wait.
		fireTransitionEnd(panel)
		await opening
		expect(api.expansion.expanded.has('r0')).toBe(true)
		expect(panel.hasAttribute('data-collapsing')).toBe(false)
		expect(panel.hasAttribute('hidden')).toBe(false)
		expect(panel.style.height).toBe('')
		// Sanity: the runTransition fallback timer is bounded.
		expect(TRANSITION_FALLBACK_MS).toBeGreaterThan(0)
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
