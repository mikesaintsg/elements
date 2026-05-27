import { describe, expect, it } from 'vitest'
import type { CreateDragInstance, CreateDragOptions } from '@elements/browser'
import { createDrag } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

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

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Drag has two orthogonal sub-machines. The selection sub-machine is the
// cleanest tabular target (click → single; shift-click → range; clear →
// empty). The drag sub-machine (dragstart → dragover → drop/dragend) is
// pointer-driven with DataTransfer state that resists synthetic
// dispatch in headless; the existing one-off tests cover that path.
//
//   Selection states : 'empty' | 'single' | 'range'
//   Selection events : 'select-1' | 'shift-3' | 'clear' | 'destroy'

type DragSelectionState = 'empty' | 'single' | 'range'
type DragSelectionEvent = 'select-1' | 'shift-3' | 'clear' | 'destroy'

interface DragContext {
	readonly api: CreateDragInstance
	readonly root: HTMLDivElement
	readonly rows: readonly HTMLDivElement[]
}

function buildDragContext(options: CreateDragOptions = {}): DragContext {
	const { root, rows } = createListWithRows(5)
	const [api] = createFactoryFixture(() => createDrag(root, options))
	return { api, root, rows }
}

function driveToDragState(context: DragContext, state: DragSelectionState): void {
	if (state === 'single') {
		context.api.select(1)
		return
	}
	if (state === 'range') {
		context.api.select(1)
		const shifted = new MouseEvent('click', { shiftKey: true })
		context.api.select(3, shifted)
	}
}

function fireDragEvent(context: DragContext, event: DragSelectionEvent): void {
	if (event === 'select-1') {
		context.api.select(1)
		return
	}
	if (event === 'shift-3') {
		const shifted = new MouseEvent('click', { shiftKey: true })
		context.api.select(3, shifted)
		return
	}
	if (event === 'clear') {
		context.api.clear()
		return
	}
	context.api.destroy()
}

interface DragObservables {
	readonly size: number
	readonly has: ReadonlySet<number>
}

function assertDragState(context: DragContext, state: DragSelectionState): void {
	const expected: DragObservables =
		state === 'empty'
			? { size: 0, has: new Set() }
			: state === 'single'
				? { size: 1, has: new Set([1]) }
				: { size: 3, has: new Set([1, 2, 3]) }
	expect(context.api.selected.value.size).toBe(expected.size)
	for (const index of expected.has) {
		expect(context.api.selected.value.has(index)).toBe(true)
	}
}

const DRAG_SCENARIOS: readonly StateScenario<
	DragSelectionState,
	DragSelectionEvent,
	DragContext
>[] = [
	{
		transition: {
			name: 'empty × select-1 → single',
			from: 'empty',
			event: 'select-1',
			to: 'single',
		},
		arrange: driveToDragState,
		act: fireDragEvent,
		assert: assertDragState,
	},
	{
		transition: {
			name: 'single × shift-3 → range (extends from anchor)',
			from: 'single',
			event: 'shift-3',
			to: 'range',
		},
		arrange: driveToDragState,
		act: fireDragEvent,
		assert: assertDragState,
	},
	{
		transition: {
			name: 'range × clear → empty',
			from: 'range',
			event: 'clear',
			to: 'empty',
		},
		arrange: driveToDragState,
		act: fireDragEvent,
		assert: assertDragState,
	},
	{
		transition: {
			name: 'single × clear → empty',
			from: 'single',
			event: 'clear',
			to: 'empty',
		},
		arrange: driveToDragState,
		act: fireDragEvent,
		assert: assertDragState,
	},
]

describe('createDrag (statechart) — selection region', () => {
	it.each(DRAG_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildDragContext()
		expect(context.api.selected.value.size).toBe(0)
		await runScenario(scenario, context)
	})
})
