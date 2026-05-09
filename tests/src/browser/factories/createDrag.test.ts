import { describe, expect, it } from 'vitest'
import { createDrag } from '@src/browser'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

function createListWithRows(count: number): {
	readonly root: HTMLDivElement
	readonly rows: readonly HTMLDivElement[]
} {
	const root = buildElement('div')
	const rows: HTMLDivElement[] = []
	for (let i = 0; i < count; i++) {
		const row = document.createElement('div')
		row.dataset.index = String(i)
		row.textContent = `Row ${i}`
		root.appendChild(row)
		rows.push(row)
	}
	return { root, rows }
}

describe('createDrag', () => {
	it('starts with empty selection / no drag', () => {
		const { root } = createListWithRows(3)
		const [api] = createFactoryFixture(() => createDrag(root))
		expect(api.dragging.value).toBe(false)
		expect(api.indices.value.size).toBe(0)
		expect(api.selected.value.size).toBe(0)
	})

	it('select(index) writes the selected ref and seeds the anchor', () => {
		const { root } = createListWithRows(3)
		const [api] = createFactoryFixture(() => createDrag(root))
		api.select(1)
		expect(api.selected.value.has(1)).toBe(true)
		expect(api.selected.value.size).toBe(1)
	})

	it('shift-click extends the selection range from the anchor', () => {
		const { root, rows } = createListWithRows(5)
		const [api] = createFactoryFixture(() => createDrag(root))
		api.select(1)
		const shifted = new MouseEvent('click', { shiftKey: true })
		// Shift-extend from anchor 1 → 3 should select indices 1, 2, 3.
		api.select(3, shifted)
		expect(api.selected.value.has(1)).toBe(true)
		expect(api.selected.value.has(2)).toBe(true)
		expect(api.selected.value.has(3)).toBe(true)
		void rows
	})

	it('clear empties selection and indices', () => {
		const { root } = createListWithRows(3)
		const [api] = createFactoryFixture(() => createDrag(root))
		api.select(0)
		api.clear()
		expect(api.selected.value.size).toBe(0)
		expect(api.indices.value.size).toBe(0)
	})

	it('marks rows draggable with auto:true', () => {
		const { root, rows } = createListWithRows(2)
		const [, ,] = createFactoryFixture(() => createDrag(root, { auto: true }))
		// Sync runs synchronously inside the constructor.
		expect(rows[0]?.draggable).toBe(true)
		expect(rows[1]?.draggable).toBe(true)
	})

	it('destroy reverses every listener and clears row state', () => {
		assertCleanDispose(() => {
			const { root } = createListWithRows(3)
			return createDrag(root)
		})
	})
})
