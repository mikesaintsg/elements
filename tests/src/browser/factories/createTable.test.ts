import { describe, expect, it } from 'vitest'
import { createTable, TABLE_EVENTS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
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
