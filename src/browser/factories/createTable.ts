import type {
	CreatePointerInstance,
	CreateTableInstance,
	CreateTableOptions,
	TableAction,
	TableCaptionInterface,
	TableCell,
	TableCellsInterface,
	TableColumn,
	TableExpansionManagerInterface,
	TableFocusInterface,
	TableFooterInterface,
	TableHeadersInterface,
	TableInputRow,
	TablePaginationInterface,
	TablePart,
	TableResizeManagerInterface,
	TableRow,
	TableRowsInterface,
	TableSelectionManagerInterface,
	TableSortDirection,
	TableSortEntry,
	TableSortManagerInterface,
	TableStrategy,
} from '../types.js'
import {
	computed,
	effect,
	effectScope,
	isRef,
	readonly,
	ref,
	shallowReactive,
} from '@vue/reactivity'
import {
	ARIA_SORT_VALUE,
	PANEL_SELECTOR,
	RESIZE_HANDLE_ATTR,
	RESIZE_HANDLE_SELECTOR,
	TABLE_ARIA_ROWCOUNT,
	TABLE_ARIA_SORT,
	TABLE_EVENTS,
	TABLE_EXPANDED_ATTR,
	TABLE_EXPANSION_ATTR,
	TABLE_RESIZABLE_ATTR,
	TABLE_RESIZING_ATTR,
} from '../constants.js'
import {
	applyRowCount,
	applyRowIndex,
	assertElement,
	bindEventMap,
	cleanTableSelection,
	emit,
	extractRowId,
	findDetailRow,
	markTableUnselectedRows,
	normalizeIndex,
	readTableCells,
	readTableColumns,
	readTableData,
	readTableFooter,
	readTableHeaders,
	readTableRows,
	tableBody,
	tableFooterRow,
	tableHeaderRow,
	writeTableCell,
	writeTableFooterRow,
	writeTableHeaderRow,
	writeTableRow,
} from '../helpers.js'
import { createPointer } from './createPointer.js'

/**
 * Framework-agnostic native table controller. Reads and mutates semantic
 * table structure through table APIs, exposes snapshots, and owns row
 * selection (via `aria-selected`), expansion (via `data-table-expanded`),
 * sort (`aria-sort` on `<th data-key>`), and column-resize sub-domains.
 *
 * Element gating: the host MUST be `<table>` — `assertElement` throws
 * otherwise.
 *
 * @remarks Stable row identity comes from `data-id` (preferred) or
 * `data-index` (fallback). When `options.value` is set, rows seeded via
 * `options.rows` and `rows.insert()` write the supplied id as `data-id`
 * on the new `<tr>`. Rows without `data-id` use positional (unstable)
 * identity — selection / expansion / sort state will not survive
 * structural reorders.
 */
export function createTable(
	element: HTMLTableElement,
	options: CreateTableOptions = {},
): CreateTableInstance {
	assertElement<HTMLTableElement>(element, 'table', 'createTable')

	const keyboard = options.focus?.keyboard ?? false
	const wrap = options.focus?.wrap ?? false
	const generate = options.id
	const schema: readonly TableColumn[] = options.columns ?? []
	const schemaByKey = new Map<string, TableColumn>()
	for (const col of schema) schemaByKey.set(col.key, col)

	const sortMultiple = options.sort?.multiple ?? false
	const sortMandate = options.sort?.mandate ?? false
	const sortOrder: 'asc' | 'desc' = options.sort?.order ?? 'asc'
	// `sort.auto` (default: true) reorders the `<tbody>` rows in place
	// whenever sort state changes. Consumers driving sort against a
	// remote / server-paged dataset opt out (`sort.auto: false`) and
	// listen to the `elements:table:sort` event to refetch.
	const sortAuto = options.sort?.auto ?? true

	const expansionMultiple = options.expansion?.multiple ?? true
	// `expansion.click` — controls how row-clicks toggle expansion:
	//   `true` / `'row'` (default): clicking anywhere on a row that has a
	//     sibling `<tr data-table-expansion>` toggles. Interactive
	//     descendants (`a, button, input, textarea, select, label`,
	//     `[data-no-select]`) are skipped so action chrome still works —
	//     same opt-out shape `selection.click` uses.
	//   `'caret'`: only clicks on `[data-table-expansion-trigger]` toggle.
	//     Consumers wire the trigger explicitly (e.g. a leading-cell
	//     button) when they want the rest of the row to behave as plain
	//     content.
	//   `false`: no built-in click handler; consumers drive the toggle
	//     via `expansion.toggle(id)` directly.
	const expansionClick = options.expansion?.click ?? true

	const selectionStrategy: TableStrategy = options.selection?.strategy ?? 'page'
	const selectablePredicate = options.selection?.selectable
	const selectionClick = options.selection?.click ?? true

	const resizeMin = options.resize?.min ?? 40
	const resizeMax = options.resize?.max ?? Infinity

	const scope = effectScope()
	const reactives = scope.run(() => ({
		ready: ref(false),
		data: ref<readonly TableRow[]>([]),
		captionValue: ref<string | null>(null),
		headerValues: ref<readonly string[]>([]),
		headerCount: ref(0),
		footerValues: ref<readonly string[]>([]),
		footerCount: ref(0),
		rowCount: ref(0),
		rowIds: ref<readonly string[]>([]),
		columnCount: ref(0),
		columnValues: ref<readonly TableRow[]>([]),
		focusedCell: ref<TableCell | null>(null),
		totalValue: ref(0),
		offsetValue: ref(1),
		sizeValue: ref(0),
		sortColumns: ref<readonly TableSortEntry[]>([]),
		resizeActive: ref(false),
		selectionTick: ref(0),
		expandedIds: shallowReactive(new Set<string>()),
	}))
	if (!reactives) throw new Error('createTable: failed to initialize reactive scope')
	const {
		ready,
		data,
		captionValue,
		headerValues,
		headerCount,
		footerValues,
		footerCount,
		rowCount,
		rowIds,
		columnCount,
		columnValues,
		focusedCell,
		totalValue,
		offsetValue,
		sizeValue,
		sortColumns,
		resizeActive,
		selectionTick,
		expandedIds,
	} = reactives

	let destroyed = false
	let addedRole = false
	let addedMulti = false
	let addedTabindex = false
	let addedResizable = false
	const tabindex = new Set<HTMLTableCellElement>()

	// Selection state — id-based, plain Set (mutated in place; reactive `all`/`mixed` recompute)
	const selectedIds = new Set<string>()

	// Sort state — direction map + order array.
	const sortDirection = new Map<string, Exclude<TableSortDirection, 'none'>>()
	const sortKeys: string[] = []

	// Resize state — pointer instances per handle.
	const resizePointers = new Map<HTMLElement, CreatePointerInstance>()

	// ── Table accessors ──────────────────────────────────────────────────
	const table = (): HTMLTableElement | null => (destroyed ? null : element)

	const body = (create: boolean): HTMLTableSectionElement | null => {
		const el = table()
		if (!el) return null
		return tableBody(el, create)
	}

	const bodyRows = (): readonly HTMLTableRowElement[] => {
		const el = table()
		return el ? readTableRows(el) : []
	}

	const rowAt = (index: number): HTMLTableRowElement | null => bodyRows()[index] ?? null

	const cellAt = (cell: TableCell): HTMLTableCellElement | null => {
		const row = rowAt(cell.row)
		return row?.cells[cell.column] ?? null
	}

	const headerRow = (create: boolean): HTMLTableRowElement | null => {
		const el = table()
		if (!el) return null
		return tableHeaderRow(el, create)
	}

	const footerRow = (create: boolean): HTMLTableRowElement | null => {
		const el = table()
		if (!el) return null
		return tableFooterRow(el, create)
	}

	// ── Strategy scope (selection) ───────────────────────────────────────
	const allBodyRows = (): HTMLTableRowElement[] => {
		const el = table()
		if (!el) return []
		const out: HTMLTableRowElement[] = []
		for (const section of Array.from(el.tBodies)) out.push(...Array.from(section.rows))
		return out
	}

	const scopeRows = (): HTMLTableRowElement[] => {
		if (selectionStrategy === 'single') return []
		if (selectionStrategy === 'page') return [...bodyRows()]
		return allBodyRows()
	}

	const isSelectable = (row: HTMLTableRowElement): boolean =>
		selectablePredicate ? selectablePredicate(row) : true

	const selectableScope = (): HTMLTableRowElement[] => scopeRows().filter(isSelectable)

	// ── Selection apply ──────────────────────────────────────────────────
	const applySelection = (): void => {
		const el = table()
		if (!el) return
		cleanTableSelection(el)
		for (const row of allBodyRows()) {
			const id = extractRowId(row)
			if (id && selectedIds.has(id)) {
				row.setAttribute('aria-selected', 'true')
			}
		}
		// ARIA grid: when any row is selected, non-selected rows must announce 'false'.
		// When zero rows are selected, leave aria-selected absent on every row.
		if (selectedIds.size > 0) markTableUnselectedRows(el)
	}

	// ── ARIA row index/count ─────────────────────────────────────────────
	const writeRowIndex = (): void => {
		applyRowIndex(bodyRows(), offsetValue.value)
	}

	const writeRowCount = (): void => {
		const el = table()
		if (!el) return
		applyRowCount(el, totalValue.value)
	}

	// ── Emit helpers ─────────────────────────────────────────────────────
	const emitChange = (part: TablePart, action: TableAction): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.change, { part, action })
	}

	const emitSelect = (): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.select, { ids: new Set(selectedIds) })
	}

	const emitFocus = (): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.focus, { cell: focusedCell.value })
	}

	const emitSort = (): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.sort, { columns: sortColumns.value })
	}

	const emitExpand = (id: string): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.expand, { id })
	}

	const emitCollapse = (id: string): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.collapse, { id })
	}

	// ── Row id seeding ───────────────────────────────────────────────────
	const seedRowId = (row: HTMLTableRowElement, _source: TableInputRow, fallback?: string): void => {
		const explicit = fallback ?? generate?.()
		if (explicit) {
			row.dataset.id = explicit
			return
		}
		const key = options.value
		if (!key) return
		// `_source` is positional; key extraction is only meaningful when source carries records,
		// which this factory does not currently model — caller-supplied id (or generate) is the path.
	}

	const seed = (el: HTMLTableElement): void => {
		if (options.caption !== undefined) {
			const caption = el.createCaption()
			caption.textContent = options.caption
		}
		if (options.headers) writeTableHeaderRow(el, options.headers)
		if (options.rows) {
			const section = el.tBodies[0] ?? el.createTBody()
			while (section.rows.length > 0) section.deleteRow(0)
			for (const values of options.rows) {
				const row = section.insertRow()
				writeTableRow(row, values)
				seedRowId(row, values)
			}
		}
		if (options.footer) writeTableFooterRow(el, options.footer)
		// Tag header cells with data-key from schema (in column order) so sort indicators apply.
		// For sortable columns, also seed the click + keyboard affordance:
		//   - `aria-sort="none"` advertises the column as sortable to AT users
		//     and gives consumer CSS a hook for sort indicators (▲▼ caret).
		//   - `tabindex="0"` makes the cell keyboard-focusable so Enter / Space
		//     can drive the same sort cycle as clicking.
		// The actual click + keydown handlers live on the `<table>` itself
		// (delegated) and are wired further down — see `onSortClick` /
		// `onSortKeydown`.
		if (schema.length > 0) {
			const head = el.tHead?.rows[0]
			if (head) {
				for (let i = 0; i < schema.length && i < head.cells.length; i++) {
					const col = schema[i]
					const cell = head.cells[i]
					if (!col || !cell) continue
					if (!cell.dataset.key) cell.dataset.key = col.key
					if (col.sortable === true) {
						if (!cell.hasAttribute(TABLE_ARIA_SORT)) {
							cell.setAttribute(TABLE_ARIA_SORT, 'none')
						}
						if (!cell.hasAttribute('tabindex')) {
							cell.setAttribute('tabindex', '0')
						}
					}
				}
			}
		}
	}

	// ── Total / offset wiring ────────────────────────────────────────────
	const initOffset = (): void => {
		const provided = options.offset
		if (isRef(provided)) {
			scope.run(() =>
				effect(() => {
					offsetValue.value = provided.value ?? 1
					if (!destroyed) writeRowIndex()
				}),
			)
		} else if (typeof provided === 'number') {
			offsetValue.value = provided
		}
	}

	const initTotal = (): void => {
		const provided = options.total
		if (isRef(provided)) {
			scope.run(() =>
				effect(() => {
					totalValue.value = provided.value ?? 0
					if (!destroyed) writeRowCount()
				}),
			)
		} else if (typeof provided === 'number') {
			totalValue.value = provided
		}
	}

	const initSize = (): void => {
		const provided = options.pagination?.size
		if (isRef(provided)) {
			scope.run(() =>
				effect(() => {
					sizeValue.value = provided.value ?? 0
				}),
			)
		} else if (typeof provided === 'number') {
			sizeValue.value = provided
		}
	}

	// ── Pagination ───────────────────────────────────────────────────────
	const sizeResolved = computed<number>(() => {
		const provided = sizeValue.value
		if (provided > 0) return provided
		return rowCount.value > 0 ? rowCount.value : 0
	})
	const pageNumber = computed<number>(() => {
		const size = sizeResolved.value
		if (size <= 0) return 1
		return Math.max(1, Math.floor((offsetValue.value - 1) / size) + 1)
	})
	const pageTotal = computed<number>(() => {
		const size = sizeResolved.value
		if (size <= 0) return 1
		return Math.max(1, Math.ceil(totalValue.value / size))
	})

	const emitPaginate = (page: number, offset: number, size: number): void => {
		const el = table()
		if (el) emit(el, TABLE_EVENTS.paginate, { page, offset, size })
	}

	const to = (page: number): void => {
		if (!Number.isFinite(page)) return
		const size = sizeResolved.value
		const target = Math.max(1, Math.min(Math.floor(page), pageTotal.value))
		const offset = size > 0 ? (target - 1) * size + 1 : 1
		emitPaginate(target, offset, size)
	}

	const next = (): void => to(pageNumber.value + 1)
	const prev = (): void => to(pageNumber.value - 1)

	const paginationDomain: TablePaginationInterface = {
		size: readonly(sizeResolved),
		page: readonly(pageNumber),
		count: readonly(pageTotal),
		to,
		next,
		prev,
	}

	// ── Refresh ──────────────────────────────────────────────────────────
	const refresh = (): void => {
		const el = table()
		if (!el) {
			ready.value = false
			data.value = []
			captionValue.value = null
			headerValues.value = []
			footerValues.value = []
			rowCount.value = 0
			rowIds.value = []
			columnCount.value = 0
			columnValues.value = []
			return
		}
		const rows = readTableRows(el)
		data.value = readTableData(el)
		captionValue.value = el.caption?.textContent ?? null
		headerValues.value = readTableHeaders(el)
		headerCount.value = headerValues.value.length
		footerValues.value = readTableFooter(el)
		footerCount.value = footerValues.value.length
		rowCount.value = rows.length
		rowIds.value = rows.map((row) => extractRowId(row))
		columnValues.value = readTableColumns(el)
		columnCount.value = Math.max(
			headerValues.value.length,
			footerValues.value.length,
			columnValues.value.length,
		)
		const liveIds = new Set(rowIds.value.filter((id) => id !== ''))
		const selectionBefore = selectedIds.size
		for (const id of Array.from(selectedIds)) if (!liveIds.has(id)) selectedIds.delete(id)
		const expansionBefore = expandedIds.size
		for (const id of Array.from(expandedIds)) if (!liveIds.has(id)) expandedIds.delete(id)
		const focusBefore = focusedCell.value
		if (focusedCell.value && !cellAt(focusedCell.value)) focusedCell.value = null
		applySelection()
		syncExpansion()
		writeRowIndex()
		writeRowCount()
		setupResizeHandles()
		ready.value = true
		if (selectedIds.size !== selectionBefore) {
			selectionTick.value++
			emitSelect()
		}
		if (expandedIds.size !== expansionBefore) syncExpansion()
		if (focusBefore && !focusedCell.value) emitFocus()
	}

	// ── Caption / Headers / Rows / Cells / Footer ────────────────────────
	const writeHeader = (values: TableInputRow): void => {
		const el = table()
		if (el) writeTableHeaderRow(el, values)
	}
	const writeFooter = (values: TableInputRow): void => {
		const el = table()
		if (el) writeTableFooterRow(el, values)
	}

	const caption: TableCaptionInterface = {
		value: readonly(captionValue),
		caption: () => table()?.caption ?? null,
		set: (value) => {
			const el = table()
			if (!el) return
			el.createCaption().textContent = value
			refresh()
			emitChange('caption', 'set')
		},
		clear: () => {
			const el = table()
			if (!el) return
			el.deleteCaption()
			refresh()
			emitChange('caption', 'clear')
		},
	}

	const headers: TableHeadersInterface = {
		count: readonly(headerCount),
		values: readonly(headerValues),
		headers: () => Array.from(headerRow(false)?.cells ?? []),
		header: (index) => headerRow(false)?.cells[index] ?? null,
		set: (values) => {
			writeHeader(values)
			refresh()
			emitChange('headers', 'set')
		},
		append: (value) => headers.insert(headerValues.value.length, value),
		insert: (index, value) => {
			const row = headerRow(true)
			if (!row) return
			const target = normalizeIndex(index, row.cells.length)
			if (target === null) return
			const cell = document.createElement('th')
			cell.scope = 'col'
			writeTableCell(cell, value)
			const before = row.cells[target]
			if (before) row.insertBefore(cell, before)
			else row.appendChild(cell)
			refresh()
			emitChange('headers', 'insert')
		},
		update: (index, value) => {
			const cell = headers.header(index)
			if (!cell) return false
			writeTableCell(cell, value)
			refresh()
			emitChange('headers', 'update')
			return true
		},
		remove: (index) => {
			const row = headerRow(false)
			const cell = row?.cells[index]
			if (!row || !cell) return null
			const value = cell.textContent ?? ''
			row.deleteCell(index)
			refresh()
			emitChange('headers', 'remove')
			return value
		},
		clear: () => {
			const el = table()
			if (!el) return
			el.deleteTHead()
			refresh()
			emitChange('headers', 'clear')
		},
	}

	const rowDomain: TableRowsInterface = {
		count: readonly(rowCount),
		ids: readonly(rowIds),
		rows: bodyRows,
		row: rowAt,
		id: (index) => {
			const row = rowAt(index)
			return row ? extractRowId(row) || null : null
		},
		has: (index) => Boolean(rowAt(index)),
		append: (values, id) => rowDomain.insert(rowCount.value, values, id),
		prepend: (values, id) => rowDomain.insert(0, values, id),
		insert: (index, values, id) => {
			const section = body(true)
			if (!section) return null
			const target = normalizeIndex(index, section.rows.length)
			if (target === null) return null
			const row = section.insertRow(target)
			seedRowId(row, values, id)
			writeTableRow(row, values)
			refresh()
			emitChange('rows', 'insert')
			return row
		},
		update: (index, values) => {
			const row = rowAt(index)
			if (!row) return false
			writeTableRow(row, values)
			refresh()
			emitChange('rows', 'update')
			return true
		},
		remove: (index) => {
			const row = rowAt(index)
			if (!row) return null
			const value = readTableCells(row)
			const detail = findDetailRow(row)
			row.remove()
			detail?.remove()
			refresh()
			emitChange('rows', 'remove')
			return value
		},
		move: (from, into) => {
			const source = rowAt(from)
			const target = rowAt(into)
			if (!source || !target || source === target) return false
			if (from < into) target.after(source)
			else target.before(source)
			refresh()
			emitChange('rows', 'move')
			return true
		},
		swap: (first, second) => {
			const a = rowAt(first)
			const b = rowAt(second)
			if (!a || !b || a === b) return false
			const placeholder = document.createComment('')
			a.before(placeholder)
			b.replaceWith(a)
			placeholder.replaceWith(b)
			refresh()
			emitChange('rows', 'swap')
			return true
		},
		clear: () => {
			const el = table()
			if (!el) return
			for (const section of Array.from(el.tBodies)) {
				while (section.rows.length > 0) section.deleteRow(0)
			}
			selectedIds.clear()
			expandedIds.clear()
			focusedCell.value = null
			refresh()
			emitChange('rows', 'clear')
		},
	}

	const cellDomain: TableCellsInterface = {
		cell: cellAt,
		read: (cell) => cellAt(cell)?.textContent ?? null,
		update: (cell, value) => {
			const row = rowAt(cell.row)
			if (!row) return false
			while (row.cells.length <= cell.column) row.insertCell()
			const target = row.cells[cell.column]
			if (!target) return false
			writeTableCell(target, value)
			refresh()
			emitChange('cells', 'update')
			return true
		},
		clear: (cell) => cellDomain.update(cell, ''),
	}

	const footerDomain: TableFooterInterface = {
		count: readonly(footerCount),
		values: readonly(footerValues),
		footers: () => Array.from(footerRow(false)?.cells ?? []),
		footer: (index) => footerRow(false)?.cells[index] ?? null,
		set: (values) => {
			writeFooter(values)
			refresh()
			emitChange('footer', 'set')
		},
		append: (value) => footerDomain.insert(footerValues.value.length, value),
		insert: (index, value) => {
			const row = footerRow(true)
			if (!row) return
			const target = normalizeIndex(index, row.cells.length)
			if (target === null) return
			writeTableCell(row.insertCell(target), value)
			refresh()
			emitChange('footer', 'insert')
		},
		update: (index, value) => {
			const cell = footerDomain.footer(index)
			if (!cell) return false
			writeTableCell(cell, value)
			refresh()
			emitChange('footer', 'update')
			return true
		},
		remove: (index) => {
			const row = footerRow(false)
			const cell = row?.cells[index]
			if (!row || !cell) return null
			const value = cell.textContent ?? ''
			row.deleteCell(index)
			refresh()
			emitChange('footer', 'remove')
			return value
		},
		clear: () => {
			const el = table()
			if (!el) return
			el.deleteTFoot()
			refresh()
			emitChange('footer', 'clear')
		},
	}

	// ── Sort sub-domain ──────────────────────────────────────────────────
	const recomputeSortColumns = (): void => {
		const entries: TableSortEntry[] = []
		for (const key of sortKeys) {
			const dir = sortDirection.get(key)
			if (dir) entries.push({ key, direction: dir })
		}
		sortColumns.value = entries
	}

	const applyAriaSort = (key: string, direction: TableSortDirection): void => {
		const el = table()
		if (!el) return
		const th = el.querySelector<HTMLTableCellElement>(`thead th[data-key="${cssEscape(key)}"]`)
		if (!th) return
		if (direction === 'none') th.removeAttribute(TABLE_ARIA_SORT)
		else th.setAttribute(TABLE_ARIA_SORT, ARIA_SORT_VALUE[direction])
	}

	const clearAllAriaSort = (): void => {
		const el = table()
		if (!el) return
		for (const th of Array.from(el.querySelectorAll<HTMLTableCellElement>('thead th[data-key]'))) {
			th.removeAttribute(TABLE_ARIA_SORT)
		}
	}

	const sortDirectionOf = (key: string): TableSortDirection => sortDirection.get(key) ?? 'none'

	const sortPriorityOf = (key: string): number => {
		const idx = sortKeys.indexOf(key)
		return idx < 0 ? -1 : idx
	}

	// Physically reorder `<tbody>` rows to match the active sort state.
	// Only runs when `sort.auto: true` (default). Works on the rendered
	// DOM rather than re-rendering from a data array — keeps existing
	// row references / event listeners intact.
	const applySortToDOM = (): void => {
		if (!sortAuto) return
		const el = table()
		if (!el) return
		const tbody = el.tBodies[0]
		if (!tbody) return
		if (sortKeys.length === 0) return // No sort active — leave rows as-is.

		// Map column key → cell index in the row (look up once per pass).
		const head = el.tHead?.rows[0]
		if (!head) return
		const indexByKey = new Map<string, number>()
		for (let i = 0; i < head.cells.length; i++) {
			const key = head.cells[i]?.dataset.key
			if (key) indexByKey.set(key, i)
		}

		// Capture current order with stable ordinal so equal keys keep
		// their relative position (a stable sort across multiple keys).
		const entries = Array.from(tbody.rows).map((row, ordinal) => ({ row, ordinal }))

		entries.sort((a, b) => {
			for (const key of sortKeys) {
				const direction = sortDirection.get(key)
				if (!direction) continue
				const cellIndex = indexByKey.get(key)
				if (cellIndex === undefined) continue
				const av = a.row.cells[cellIndex]?.textContent ?? ''
				const bv = b.row.cells[cellIndex]?.textContent ?? ''
				const cmp = compareCellValues(av, bv)
				if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
			}
			return a.ordinal - b.ordinal
		})

		// Re-append rows in sorted order. Because each row is already in
		// `tbody`, `appendChild` MOVES rather than clones — no listener
		// detachment, no row id churn.
		for (const { row } of entries) tbody.appendChild(row)
	}

	const sortClear = (): void => {
		if (sortDirection.size === 0 && sortKeys.length === 0) return
		sortDirection.clear()
		sortKeys.length = 0
		clearAllAriaSort()
		recomputeSortColumns()
		emitSort()
		emitChange('sort', 'clear')
	}

	const sortToggle = (key: string): void => {
		const col = schemaByKey.get(key)
		if (!col || col.sortable !== true) return
		const current = sortDirectionOf(key)
		const opposite: 'asc' | 'desc' = sortOrder === 'asc' ? 'desc' : 'asc'
		if (!sortMultiple) {
			for (const sibling of sortKeys)
				if (sibling !== key) {
					sortDirection.delete(sibling)
					applyAriaSort(sibling, 'none')
				}
			sortKeys.length = 0
			if (sortDirection.has(key)) sortKeys.push(key)
		}
		if (current === 'none') {
			sortDirection.set(key, sortOrder)
			if (sortKeys.indexOf(key) < 0) sortKeys.push(key)
			applyAriaSort(key, sortOrder)
		} else if (current === sortOrder) {
			sortDirection.set(key, opposite)
			applyAriaSort(key, opposite)
		} else {
			if (sortMandate) {
				sortDirection.set(key, sortOrder)
				applyAriaSort(key, sortOrder)
			} else {
				sortDirection.delete(key)
				const i = sortKeys.indexOf(key)
				if (i >= 0) sortKeys.splice(i, 1)
				applyAriaSort(key, 'none')
			}
		}
		recomputeSortColumns()
		applySortToDOM()
		emitSort()
		emitChange('sort', 'update')
	}

	const sortDomain: TableSortManagerInterface = {
		columns: readonly(sortColumns),
		toggle: sortToggle,
		direction: sortDirectionOf,
		priority: sortPriorityOf,
		clear: sortClear,
	}

	// ── Selection sub-domain (id-based, batch overloads) ─────────────────
	const computedAll = scope.run(() =>
		computed<boolean>(() => {
			void selectionTick.value
			const rows = selectableScope()
			if (rows.length === 0) return false
			for (const row of rows) {
				const id = extractRowId(row)
				if (!id || !selectedIds.has(id)) return false
			}
			return true
		}),
	)
	const computedMixed = scope.run(() =>
		computed<boolean>(() => {
			void selectionTick.value
			const rows = selectableScope()
			if (rows.length === 0) return false
			let some = false
			let all = true
			for (const row of rows) {
				const id = extractRowId(row)
				const has = id !== '' && selectedIds.has(id)
				if (has) some = true
				else all = false
			}
			return some && !all
		}),
	)
	if (!computedAll || !computedMixed) {
		throw new Error('createTable: failed to initialize selection computeds')
	}
	const allComputed = computedAll
	const mixedComputed = computedMixed

	const selectionMutated = (): void => {
		selectionTick.value++
		applySelection()
		emitSelect()
	}

	const selectIds = (ids: readonly string[]): void => {
		let changed = false
		for (const id of ids) {
			if (!id) continue
			if (selectionStrategy === 'single') {
				if (selectedIds.size === 1 && selectedIds.has(id)) continue
				selectedIds.clear()
				selectedIds.add(id)
				changed = true
				break
			}
			if (!selectedIds.has(id)) {
				selectedIds.add(id)
				changed = true
			}
		}
		if (changed) selectionMutated()
	}

	const clearIds = (ids: readonly string[]): void => {
		let changed = false
		for (const id of ids) if (selectedIds.delete(id)) changed = true
		if (changed) selectionMutated()
	}

	const toggleIds = (ids: readonly string[]): void => {
		let changed = false
		if (selectionStrategy === 'single') {
			const first = ids[0]
			if (!first) return
			if (selectedIds.has(first) && selectedIds.size === 1) selectedIds.delete(first)
			else {
				selectedIds.clear()
				selectedIds.add(first)
			}
			changed = true
		} else {
			for (const id of ids) {
				if (!id) continue
				if (selectedIds.has(id)) selectedIds.delete(id)
				else selectedIds.add(id)
				changed = true
			}
		}
		if (changed) selectionMutated()
	}

	function selectionSelect(): void
	function selectionSelect(id: string): void
	function selectionSelect(ids: string[]): void
	function selectionSelect(arg?: string | string[]): void {
		if (arg === undefined) {
			if (selectionStrategy === 'single') return
			const ids = selectableScope()
				.map((row) => extractRowId(row))
				.filter((id) => id !== '')
			selectIds(ids)
			return
		}
		if (Array.isArray(arg)) selectIds(arg)
		else selectIds([arg])
	}

	function selectionClear(): void
	function selectionClear(id: string): void
	function selectionClear(ids: string[]): void
	function selectionClear(arg?: string | string[]): void {
		if (arg === undefined) {
			if (selectedIds.size === 0) return
			selectedIds.clear()
			selectionMutated()
			return
		}
		if (Array.isArray(arg)) clearIds(arg)
		else clearIds([arg])
	}

	function selectionToggle(): void
	function selectionToggle(id: string): void
	function selectionToggle(ids: string[]): void
	function selectionToggle(arg?: string | string[]): void {
		if (arg === undefined) {
			if (allComputed.value) selectionClear()
			else selectionSelect()
			return
		}
		if (Array.isArray(arg)) toggleIds(arg)
		else toggleIds([arg])
	}

	const selectionDomain: TableSelectionManagerInterface = {
		ids: selectedIds,
		all: allComputed,
		mixed: mixedComputed,
		strategy: selectionStrategy,
		select: selectionSelect,
		clear: selectionClear,
		toggle: selectionToggle,
		selectable: isSelectable,
	}

	// ── Expansion sub-domain ─────────────────────────────────────────────
	// The data row carries `[data-table-expanded]` when open. The detail
	// `<tr>` carries `[data-table-expansion]`; the inner
	// `[data-table-expansion-panel]` is always rendered and its open /
	// closed visual is driven entirely by the SCSS rule in
	// `elements/_table.scss` § "Row expansion panel": `tr[data-table-
	// expanded] + tr > td > [data-table-expansion-panel]` paints
	// `block-size: auto / opacity: 1`; the bare `[data-table-expansion-
	// panel]` paints `block-size: 0 / opacity: 0 / overflow: clip`. The
	// `block-size: 0 → auto` tween uses `interpolate-size: allow-
	// keywords` (declared globally on `<html>` in `_html.scss`) and the
	// motion-contract tokens (`--set-motion-duration` + `--set-motion-
	// timing-function`) — same surface, same motion as `::details-
	// content` and every other framework disclosure.
	//
	// Earlier versions hand-rolled the height tween in JS: set
	// `[data-collapsing]`, pin `style.height = '0'`, force reflow, set
	// to `scrollHeight`, await `transitionend`, drop both. That entire
	// machinery is redundant with the CSS-driven tween and was stripped
	// (see `_native-redundancy.test.ts` history). The factory now flips
	// `[data-table-expanded]` and `[inert]` on the panel; the visual
	// timing is owned by CSS.
	//
	// `[inert]` on the closed panel (replaces the previous `[hidden]`
	// toggle) prevents focus / pointer / screen-reader interaction with
	// content that's visually clipped to zero. `[hidden]` was wrong
	// because it forces `display: none`, which freezes the CSS `block-
	// size` tween — `display: none` can't transition. `[inert]` leaves
	// rendering intact while suppressing every interactive affordance.
	// Baseline 2022 in every engine the framework targets.
	function syncExpansion(): void {
		for (const row of bodyRows()) {
			const id = extractRowId(row)
			const detail = findDetailRow(row)
			const open = id !== '' && expandedIds.has(id)
			if (open) row.setAttribute(TABLE_EXPANDED_ATTR, '')
			else row.removeAttribute(TABLE_EXPANDED_ATTR)
			if (!detail) continue
			const panel = panelOf(detail)
			if (!panel) continue
			if (open) panel.removeAttribute('inert')
			else panel.setAttribute('inert', '')
		}
	}

	const findRowById = (id: string): HTMLTableRowElement | null => {
		for (const row of bodyRows()) if (extractRowId(row) === id) return row
		return null
	}

	const panelOf = (detail: HTMLTableRowElement): HTMLElement | null =>
		detail.querySelector<HTMLElement>(PANEL_SELECTOR)

	const expandOne = (id: string): void => {
		if (!id) return
		const row = findRowById(id)
		if (!row) return
		if (!expansionMultiple) {
			for (const other of Array.from(expandedIds)) {
				if (other !== id) collapseOne(other)
			}
		}
		if (expandedIds.has(id)) return
		expandedIds.add(id)
		row.setAttribute(TABLE_EXPANDED_ATTR, '')
		const detail = findDetailRow(row)
		const panel = detail ? panelOf(detail) : null
		if (panel) panel.removeAttribute('inert')
		emitExpand(id)
		emitChange('expansion', 'update')
	}

	const collapseOne = (id: string): void => {
		if (!id) return
		if (!expandedIds.has(id)) return
		const row = findRowById(id)
		expandedIds.delete(id)
		if (row) row.removeAttribute(TABLE_EXPANDED_ATTR)
		const detail = row ? findDetailRow(row) : null
		const panel = detail ? panelOf(detail) : null
		if (panel) panel.setAttribute('inert', '')
		emitCollapse(id)
		emitChange('expansion', 'update')
	}

	const allBodyRowIds = (): string[] =>
		bodyRows()
			.map((row) => extractRowId(row))
			.filter((id) => id !== '')

	function expansionExpand(): void
	function expansionExpand(id: string): void
	function expansionExpand(ids: string[]): void
	function expansionExpand(arg?: string | string[]): void {
		if (arg === undefined) {
			for (const id of allBodyRowIds()) expandOne(id)
			return
		}
		if (Array.isArray(arg)) {
			for (const id of arg) expandOne(id)
			return
		}
		expandOne(arg)
	}

	function expansionCollapse(): void
	function expansionCollapse(id: string): void
	function expansionCollapse(ids: string[]): void
	function expansionCollapse(arg?: string | string[]): void {
		if (arg === undefined) {
			for (const id of Array.from(expandedIds)) collapseOne(id)
			return
		}
		if (Array.isArray(arg)) {
			for (const id of arg) collapseOne(id)
			return
		}
		collapseOne(arg)
	}

	function expansionToggle(): void
	function expansionToggle(id: string): void
	function expansionToggle(ids: string[]): void
	function expansionToggle(arg?: string | string[]): void {
		if (arg === undefined) {
			const ids = allBodyRowIds()
			const allOpen = ids.length > 0 && ids.every((id) => expandedIds.has(id))
			if (allOpen) expansionCollapse()
			else expansionExpand()
			return
		}
		const list = Array.isArray(arg) ? arg : [arg]
		for (const id of list) {
			if (expandedIds.has(id)) collapseOne(id)
			else expandOne(id)
		}
	}

	const expansionSet = (ids: readonly string[]): void => {
		expandedIds.clear()
		for (const id of ids) {
			if (!id) continue
			const row = findRowById(id)
			if (!row) continue
			if (!expansionMultiple && expandedIds.size >= 1) break
			expandedIds.add(id)
		}
		syncExpansion()
		emitChange('expansion', 'set')
	}

	const expansionDomain: TableExpansionManagerInterface = {
		expanded: expandedIds,
		expand: expansionExpand,
		collapse: expansionCollapse,
		toggle: expansionToggle,
		set: expansionSet,
	}

	// ── Resize sub-domain ────────────────────────────────────────────────
	let resizeDomain: TableResizeManagerInterface | null = null

	const resizeWidth = (index: number): number => {
		const head = headerRow(false)
		return head?.cells[index]?.offsetWidth ?? 0
	}

	const resizeSet = (index: number, width: number): void => {
		const head = headerRow(false)
		const th = head?.cells[index]
		if (!th) return
		const clamped = Math.max(resizeMin, Math.min(resizeMax, width))
		th.style.width = `${clamped}px`
	}

	const resizeClear = (): void => {
		const head = headerRow(false)
		if (!head) return
		for (const th of Array.from(head.cells)) th.style.removeProperty('width')
	}

	if (options.resize) {
		resizeDomain = {
			active: readonly(resizeActive),
			width: resizeWidth,
			set: resizeSet,
			clear: resizeClear,
		}
	}

	const ensureResizeHandles = (): void => {
		if (!options.resize) return
		const el = table()
		if (!el) return
		const headerCells = el.tHead?.rows[0]?.cells
		if (!headerCells) return
		for (const cell of Array.from(headerCells)) {
			if (cell.querySelector(`[${RESIZE_HANDLE_ATTR}]`)) continue
			const handle = document.createElement('div')
			handle.setAttribute(RESIZE_HANDLE_ATTR, '')
			cell.appendChild(handle)
		}
	}

	const setupResizeHandles = (): void => {
		if (!options.resize) return
		const el = table()
		if (!el) return
		ensureResizeHandles()
		const handles = el.querySelectorAll<HTMLElement>(RESIZE_HANDLE_SELECTOR)
		for (const handle of Array.from(handles)) {
			if (resizePointers.has(handle)) continue
			let baseline = 0
			let startX = 0
			const th = handle.closest('th')
			if (!(th instanceof HTMLTableCellElement)) continue
			const instance = createPointer(handle, {
				cursor: 'col-resize',
				on: {
					start: (event) => {
						baseline = th.offsetWidth
						startX = event.clientX
						el.setAttribute(TABLE_RESIZING_ATTR, '')
						resizeActive.value = true
					},
					move: (event) => {
						const deltaX = event.clientX - startX
						const clamped = Math.max(resizeMin, Math.min(resizeMax, baseline + deltaX))
						th.style.width = `${clamped}px`
					},
					end: () => {
						el.removeAttribute(TABLE_RESIZING_ATTR)
						resizeActive.value = false
						emitChange('resize', 'update')
					},
				},
			})
			resizePointers.set(handle, instance)
		}
	}

	// ── Focus sub-domain ─────────────────────────────────────────────────
	const clearTabindex = (): void => {
		for (const cell of tabindex) cell.removeAttribute('tabindex')
		tabindex.clear()
	}

	const focusDomain: TableFocusInterface = {
		cell: readonly(focusedCell),
		focus: (cell) => {
			const target = cellAt(cell)
			if (!target) return false
			clearTabindex()
			target.setAttribute('tabindex', '-1')
			tabindex.add(target)
			focusedCell.value = { row: cell.row, column: cell.column }
			target.focus()
			emitFocus()
			return true
		},
		move: (direction) => {
			const current = focusedCell.value
			if (!current) return false
			const rowTotal = rowCount.value
			const columnTotal = columnCount.value
			let row = current.row + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0)
			let column = current.column + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0)
			if (wrap && rowTotal > 0) row = (row + rowTotal) % rowTotal
			if (wrap && columnTotal > 0) column = (column + columnTotal) % columnTotal
			return focusDomain.focus({ row, column })
		},
		clear: () => {
			clearTabindex()
			focusedCell.value = null
			emitFocus()
		},
	}

	const onKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		const direction =
			event.key === 'ArrowDown'
				? 'down'
				: event.key === 'ArrowUp'
					? 'up'
					: event.key === 'ArrowLeft'
						? 'left'
						: event.key === 'ArrowRight'
							? 'right'
							: null
		if (!direction) return
		if (focusDomain.move(direction)) event.preventDefault()
	}

	// When the bare `<table tabindex="0">` receives focus (Tab keyboard
	// navigation lands here first because the table itself is the focus
	// anchor for the APG grid pattern), seed the first cell as the active
	// roving target so the next ArrowKey has something to move FROM.
	// Without this, the keyboard handler above silently no-ops on every
	// first keypress because `focusedCell.value` is `null`.
	const onTableFocus = (event: Event): void => {
		if (event.target !== element) return
		if (focusedCell.value) return
		if (rowCount.value === 0 || columnCount.value === 0) return
		focusDomain.focus({ row: 0, column: 0 })
	}

	// ── Sort click / keyboard handlers ────────────────────────────────────
	// Delegated on the `<table>` element so consumers don't need to wire
	// per-header listeners. A click on a `thead th[data-key]` whose schema
	// has `sortable: true` cycles `none → asc → desc → none` (or
	// `none → asc ↔ desc` when `sort.mandate: true`). Same effect on
	// Enter / Space when the header has focus.
	const sortableHeaderFor = (target: EventTarget | null): HTMLTableCellElement | null => {
		if (!(target instanceof Element)) return null
		const th = target.closest<HTMLTableCellElement>('thead th[data-key]')
		if (!th) return null
		if (th.closest('table') !== element) return null
		const key = th.dataset.key
		if (!key) return null
		const col = schemaByKey.get(key)
		return col?.sortable === true ? th : null
	}

	const onSortClick = (event: Event): void => {
		const th = sortableHeaderFor(event.target)
		if (!th || !th.dataset.key) return
		sortToggle(th.dataset.key)
	}

	const onSortKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		if (event.key !== 'Enter' && event.key !== ' ') return
		const th = sortableHeaderFor(event.target)
		if (!th || !th.dataset.key) return
		event.preventDefault()
		sortToggle(th.dataset.key)
	}

	// ── Selection click handler (shift / ctrl / click-away) ──────────────
	let selectionAnchor: string | null = null

	const isInteractiveTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return false
		if (target.closest('[data-no-select]')) return true
		return target.closest('input, button, a, select, textarea, label') !== null
	}

	const rowInTbody = (target: EventTarget | null): HTMLTableRowElement | null => {
		if (!(target instanceof Element)) return null
		const row = target.closest('tr[data-id]')
		if (!(row instanceof HTMLTableRowElement)) return null
		const tbody = row.closest('tbody')
		if (!tbody || tbody.parentElement !== element) return null
		if (row.hasAttribute(TABLE_EXPANSION_ATTR)) return null
		return row
	}

	const orderedSelectableIds = (): string[] =>
		bodyRows()
			.filter((row) => isSelectable(row))
			.map((row) => extractRowId(row))
			.filter((id) => id !== '')

	const applySelectionForClick = (
		id: string,
		modifiers: { ctrl: boolean; shift: boolean },
	): void => {
		const { ctrl, shift } = modifiers
		if (selectionStrategy === 'single') {
			selectionToggle(id)
			selectionAnchor = id
			return
		}
		if (shift && selectionAnchor !== null) {
			const ordered = orderedSelectableIds()
			const lo = ordered.indexOf(selectionAnchor)
			const hi = ordered.indexOf(id)
			if (lo === -1 || hi === -1) {
				selectionSelect([id])
				selectionAnchor = id
				return
			}
			const [start, end] = lo <= hi ? [lo, hi] : [hi, lo]
			const range = ordered.slice(start, end + 1)
			selectionClear()
			selectionSelect(range)
			return
		}
		if (ctrl) {
			selectionToggle(id)
			selectionAnchor = id
			return
		}
		selectionClear()
		selectionSelect([id])
		selectionAnchor = id
	}

	const onSelectionClick = (event: Event): void => {
		if (!(event instanceof MouseEvent)) return
		if (event.button !== 0) return
		if (isInteractiveTarget(event.target)) return
		const row = rowInTbody(event.target)
		if (!row) return
		const id = extractRowId(row)
		if (!id) return
		if (!isSelectable(row)) return
		const ctrl = event.ctrlKey || event.metaKey
		const shift = event.shiftKey && selectionAnchor !== null
		if (ctrl || shift) event.preventDefault()
		applySelectionForClick(id, { ctrl, shift })
		if (ctrl || shift) window.getSelection()?.removeAllRanges()
	}

	const onSelectionPointerDown = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (event.button !== 0) return
		if (!(event.shiftKey || event.ctrlKey || event.metaKey)) return
		if (!rowInTbody(event.target)) return
		event.preventDefault()
	}

	const onDocumentSelectionDown = (event: Event): void => {
		if (!(event instanceof PointerEvent)) return
		if (selectedIds.size === 0) return
		const t = event.target
		if (!(t instanceof Node)) return
		if (element.contains(t)) return
		selectionAnchor = null
		selectionClear()
	}

	// ── Expansion click handler ──────────────────────────────────────────
	// Clicks on an expandable row (one that has a sibling `<tr data-table-
	// expansion>` carrying the detail panel) toggle its expansion state.
	// Mirrors the selection click handler's opt-out shape: clicks on
	// interactive descendants or inside `[data-no-select]` are skipped so
	// row-internal action chrome survives. Clicks inside the detail panel
	// itself are also skipped — the panel is its own surface.
	//
	// `expansion.click: 'caret'` narrows the trigger to descendants of
	// `[data-table-expansion-trigger]`, so consumers wanting an explicit
	// caret button (and rows that read as plain content otherwise) can opt
	// in. `expansion.click: false` disables this entirely.
	const isInsideExpansionPanel = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return false
		const cell = target.closest('tr')
		return cell?.hasAttribute(TABLE_EXPANSION_ATTR) === true
	}

	const expandableRowFor = (target: EventTarget | null): HTMLTableRowElement | null => {
		if (!(target instanceof Element)) return null
		const row = target.closest('tr[data-id]')
		if (!(row instanceof HTMLTableRowElement)) return null
		if (row.hasAttribute(TABLE_EXPANSION_ATTR)) return null
		const tbody = row.closest('tbody')
		if (!tbody || tbody.parentElement !== element) return null
		const sibling = row.nextElementSibling
		if (!sibling || !(sibling instanceof HTMLTableRowElement)) return null
		if (!sibling.hasAttribute(TABLE_EXPANSION_ATTR)) return null
		return row
	}

	const onExpansionClick = (event: Event): void => {
		if (!(event instanceof MouseEvent)) return
		if (event.button !== 0) return
		if (isInsideExpansionPanel(event.target)) return
		if (expansionClick === 'caret') {
			if (
				!(event.target instanceof Element) ||
				!event.target.closest('[data-table-expansion-trigger]')
			) {
				return
			}
		} else if (isInteractiveTarget(event.target)) {
			return
		}
		const row = expandableRowFor(event.target)
		if (!row) return
		const id = extractRowId(row)
		if (!id) return
		expansionToggle(id)
	}

	// ── Teardown ─────────────────────────────────────────────────────────
	const teardown = (): void => {
		const el = element
		cleanTableSelection(el)
		clearTabindex()
		if (addedRole) el.removeAttribute('role')
		if (addedMulti) el.removeAttribute('aria-multiselectable')
		if (addedTabindex) el.removeAttribute('tabindex')
		if (addedResizable) el.removeAttribute(TABLE_RESIZABLE_ATTR)
		el.removeAttribute(TABLE_RESIZING_ATTR)
		el.removeAttribute(TABLE_ARIA_ROWCOUNT)
		for (const row of Array.from(el.rows)) row.removeAttribute('aria-rowindex')
		for (const th of Array.from(el.querySelectorAll<HTMLTableCellElement>('thead th'))) {
			th.removeAttribute(TABLE_ARIA_SORT)
		}
		for (const row of Array.from(el.rows)) row.removeAttribute(TABLE_EXPANDED_ATTR)
		const head = el.tHead?.rows[0]
		if (head) for (const th of Array.from(head.cells)) th.style.removeProperty('width')
		for (const instance of resizePointers.values()) instance.destroy()
		resizePointers.clear()
		addedRole = false
		addedMulti = false
		addedTabindex = false
		addedResizable = false
	}

	const clear = (): void => {
		const el = table()
		if (!el) return
		el.deleteCaption()
		el.deleteTHead()
		el.deleteTFoot()
		for (const section of Array.from(el.tBodies)) {
			while (section.rows.length > 0) section.deleteRow(0)
		}
		selectedIds.clear()
		expandedIds.clear()
		focusedCell.value = null
		clearTabindex()
		refresh()
		emitChange('rows', 'clear')
	}

	const destroy = (): void => {
		if (destroyed) {
			teardown()
			return
		}
		destroyed = true
		// Reset expanded rows. The CSS-driven height tween is purely
		// declarative now (no in-flight JS animations to cancel), so
		// teardown just clears the open-row attributes and restores the
		// panel's closed-state `[inert]`.
		for (const id of Array.from(expandedIds)) {
			const row = findRowById(id)
			if (row) {
				row.removeAttribute(TABLE_EXPANDED_ATTR)
				const detail = findDetailRow(row)
				const panel = detail ? panelOf(detail) : null
				if (panel) panel.setAttribute('inert', '')
			}
		}
		expandedIds.clear()
		if (keyboard) {
			element.removeEventListener('keydown', onKeydown)
			element.removeEventListener('focus', onTableFocus)
		}
		if (selectionClick) {
			element.removeEventListener('click', onSelectionClick)
			element.removeEventListener('pointerdown', onSelectionPointerDown)
			document.removeEventListener('pointerdown', onDocumentSelectionDown, true)
		}
		if (expansionClick !== false) {
			element.removeEventListener('click', onExpansionClick)
		}
		element.removeEventListener('click', onSortClick)
		element.removeEventListener('keydown', onSortKeydown)
		selectionAnchor = null
		offBound()
		scope.stop()
		teardown()
		selectedIds.clear()
		focusedCell.value = null
		ready.value = false
	}

	// ── Setup ────────────────────────────────────────────────────────────
	const offBound = bindEventMap(element, TABLE_EVENTS, options.on)
	seed(element)
	if (keyboard) {
		if (!element.hasAttribute('role')) {
			element.setAttribute('role', 'grid')
			addedRole = true
		}
		if (!element.hasAttribute('aria-multiselectable')) {
			element.setAttribute('aria-multiselectable', 'true')
			addedMulti = true
		}
		if (!element.hasAttribute('tabindex')) {
			element.setAttribute('tabindex', '0')
			addedTabindex = true
		}
	}
	if (options.resize && !element.hasAttribute(TABLE_RESIZABLE_ATTR)) {
		element.setAttribute(TABLE_RESIZABLE_ATTR, '')
		addedResizable = true
	}
	initOffset()
	initTotal()
	initSize()
	refresh()
	if (keyboard) {
		element.addEventListener('keydown', onKeydown)
		element.addEventListener('focus', onTableFocus)
	}
	if (selectionClick) {
		element.addEventListener('click', onSelectionClick)
		element.addEventListener('pointerdown', onSelectionPointerDown)
		document.addEventListener('pointerdown', onDocumentSelectionDown, true)
	}
	if (expansionClick !== false) {
		element.addEventListener('click', onExpansionClick)
	}
	// Sort delegation runs unconditionally — `sortableHeaderFor()` no-ops
	// for non-sortable headers, so this costs nothing on tables that don't
	// declare any `sortable: true` columns.
	element.addEventListener('click', onSortClick)
	element.addEventListener('keydown', onSortKeydown)
	if (options.expansion?.initial && options.expansion.initial.length > 0) {
		expansionSet(options.expansion.initial)
	}
	setupResizeHandles()

	return {
		element,
		ready: readonly(ready),
		data: readonly(data),
		caption,
		headers,
		rows: rowDomain,
		cells: cellDomain,
		footer: footerDomain,
		sort: sortDomain,
		expansion: expansionDomain,
		selection: selectionDomain,
		resize: resizeDomain,
		focus: focusDomain,
		pagination: paginationDomain,
		columns: schema,
		total: readonly(totalValue),
		refresh,
		clear,
		destroy,
	}
}

/** Minimal CSS.escape polyfill for attribute selector key values. */
function cssEscape(value: string): string {
	if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
	return value.replace(/(["\\\][])/g, '\\$1')
}

/**
 * Smart-compare two cell text values. Numeric-looking strings are
 * compared numerically; otherwise we fall back to a locale-aware
 * collator (`numeric: true` so "row 9" sorts before "row 10"; case
 * insensitive so "B" doesn't always trail "a"). Returns `<0`, `0`,
 * or `>0` per `Array.sort` convention.
 */
const sortCollator =
	typeof Intl !== 'undefined'
		? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
		: null
function compareCellValues(a: string, b: string): number {
	const at = a.trim()
	const bt = b.trim()
	const an = Number(at)
	const bn = Number(bt)
	if (at !== '' && bt !== '' && Number.isFinite(an) && Number.isFinite(bn)) {
		return an - bn
	}
	if (sortCollator) return sortCollator.compare(at, bt)
	return at < bt ? -1 : at > bt ? 1 : 0
}
