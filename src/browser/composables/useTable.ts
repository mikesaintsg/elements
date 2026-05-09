import type { Ref } from 'vue'
import type {
	CreateTableInstance,
	TableCaptionInterface,
	TableCell,
	TableCellsInterface,
	TableColumn,
	TableExpansionManagerInterface,
	TableFocusInterface,
	TableFooterInterface,
	TableHeadersInterface,
	TablePaginationInterface,
	TableResizeManagerInterface,
	TableRow,
	TableRowsInterface,
	TableSelectionManagerInterface,
	TableSortEntry,
	TableSortManagerInterface,
	TableStrategy,
	UseTableOptions,
	UseTableReturn,
} from '../types.js'
import { computed, shallowReactive, shallowRef, watch } from 'vue'
import { TABLE_EVENTS } from '../constants.js'
import { createTable } from '../factories/createTable.js'

const EMPTY_DATA: readonly TableRow[] = []
const EMPTY_STRINGS: readonly string[] = []
const EMPTY_HEADER_CELLS: readonly HTMLTableCellElement[] = []
const EMPTY_BODY_ROWS: readonly HTMLTableRowElement[] = []
const EMPTY_SORT_ENTRIES: readonly TableSortEntry[] = []
const EMPTY_COLUMNS: readonly TableColumn[] = []

/**
 * Native table controller. Vue adapter over `createTable` — resolves the
 * table element ref and forwards the sub-domain interfaces (`caption`,
 * `headers`, `rows`, `cells`, `footer`, `sort`, `expansion`, `selection`,
 * `resize`, `focus`, `pagination`) to the framework-agnostic factory.
 *
 * Element gating: the host MUST be `<table>` (the factory throws on
 * mismatch via `assertElement`).
 *
 * @see src/browser/factories/createTable.ts — the underlying factory.
 */
export function useTable(
	elementRef: Ref<HTMLTableElement | null>,
	options: UseTableOptions = {},
): UseTableReturn {
	const factory = shallowRef<CreateTableInstance | null>(null)

	const ready = computed<boolean>(() => factory.value?.ready.value ?? false)
	const data = computed<readonly TableRow[]>(() => factory.value?.data.value ?? EMPTY_DATA)
	const total = computed<number>(() => factory.value?.total.value ?? 0)
	const columnSchema: readonly TableColumn[] = options.columns ?? EMPTY_COLUMNS
	// Stable shallowReactive Set forwarded so templates re-render on mutation.
	const expansionView = shallowReactive(new Set<string>())
	const selectionView = shallowReactive(new Set<string>())

	const caption: TableCaptionInterface = {
		value: computed<string | null>(() => factory.value?.caption.value.value ?? null),
		caption: () => factory.value?.caption.caption() ?? null,
		set: (value) => factory.value?.caption.set(value),
		clear: () => factory.value?.caption.clear(),
	}

	const headers: TableHeadersInterface = {
		count: computed(() => factory.value?.headers.count.value ?? 0),
		values: computed(() => factory.value?.headers.values.value ?? EMPTY_STRINGS),
		headers: () => factory.value?.headers.headers() ?? EMPTY_HEADER_CELLS,
		header: (index) => factory.value?.headers.header(index) ?? null,
		set: (values) => factory.value?.headers.set(values),
		append: (value) => factory.value?.headers.append(value),
		insert: (index, value) => factory.value?.headers.insert(index, value),
		update: (index, value) => factory.value?.headers.update(index, value) ?? false,
		remove: (index) => factory.value?.headers.remove(index) ?? null,
		clear: () => factory.value?.headers.clear(),
	}

	const rows: TableRowsInterface = {
		count: computed(() => factory.value?.rows.count.value ?? 0),
		ids: computed(() => factory.value?.rows.ids.value ?? EMPTY_STRINGS),
		rows: () => factory.value?.rows.rows() ?? EMPTY_BODY_ROWS,
		row: (index) => factory.value?.rows.row(index) ?? null,
		id: (index) => factory.value?.rows.id(index) ?? null,
		has: (index) => factory.value?.rows.has(index) ?? false,
		append: (values, id) => factory.value?.rows.append(values, id) ?? null,
		prepend: (values, id) => factory.value?.rows.prepend(values, id) ?? null,
		insert: (index, values, id) => factory.value?.rows.insert(index, values, id) ?? null,
		update: (index, values) => factory.value?.rows.update(index, values) ?? false,
		remove: (index) => factory.value?.rows.remove(index) ?? null,
		move: (from, to) => factory.value?.rows.move(from, to) ?? false,
		swap: (first, second) => factory.value?.rows.swap(first, second) ?? false,
		clear: () => factory.value?.rows.clear(),
	}

	const cells: TableCellsInterface = {
		cell: (cell) => factory.value?.cells.cell(cell) ?? null,
		read: (cell) => factory.value?.cells.read(cell) ?? null,
		update: (cell, value) => factory.value?.cells.update(cell, value) ?? false,
		clear: (cell) => factory.value?.cells.clear(cell) ?? false,
	}

	const footer: TableFooterInterface = {
		count: computed(() => factory.value?.footer.count.value ?? 0),
		values: computed(() => factory.value?.footer.values.value ?? EMPTY_STRINGS),
		footers: () => factory.value?.footer.footers() ?? EMPTY_HEADER_CELLS,
		footer: (index) => factory.value?.footer.footer(index) ?? null,
		set: (values) => factory.value?.footer.set(values),
		append: (value) => factory.value?.footer.append(value),
		insert: (index, value) => factory.value?.footer.insert(index, value),
		update: (index, value) => factory.value?.footer.update(index, value) ?? false,
		remove: (index) => factory.value?.footer.remove(index) ?? null,
		clear: () => factory.value?.footer.clear(),
	}

	const sort: TableSortManagerInterface = {
		columns: computed(() => factory.value?.sort.columns.value ?? EMPTY_SORT_ENTRIES),
		toggle: (key) => factory.value?.sort.toggle(key),
		direction: (key) => factory.value?.sort.direction(key) ?? 'none',
		priority: (key) => factory.value?.sort.priority(key) ?? -1,
		clear: () => factory.value?.sort.clear(),
	}

	function selectionSelect(): void
	function selectionSelect(id: string): void
	function selectionSelect(ids: string[]): void
	function selectionSelect(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.selection.select()
		else if (Array.isArray(arg)) factory.value?.selection.select(arg)
		else factory.value?.selection.select(arg)
	}
	function selectionClear(): void
	function selectionClear(id: string): void
	function selectionClear(ids: string[]): void
	function selectionClear(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.selection.clear()
		else if (Array.isArray(arg)) factory.value?.selection.clear(arg)
		else factory.value?.selection.clear(arg)
	}
	function selectionToggle(): void
	function selectionToggle(id: string): void
	function selectionToggle(ids: string[]): void
	function selectionToggle(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.selection.toggle()
		else if (Array.isArray(arg)) factory.value?.selection.toggle(arg)
		else factory.value?.selection.toggle(arg)
	}

	const selection: TableSelectionManagerInterface = {
		ids: selectionView,
		all: computed(() => factory.value?.selection.all.value ?? false),
		mixed: computed(() => factory.value?.selection.mixed.value ?? false),
		strategy: (options.selection?.strategy ?? 'page') as TableStrategy,
		select: selectionSelect,
		clear: selectionClear,
		toggle: selectionToggle,
		selectable: (row) => factory.value?.selection.selectable(row) ?? true,
	}

	function expansionExpand(): void
	function expansionExpand(id: string): void
	function expansionExpand(ids: string[]): void
	function expansionExpand(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.expansion.expand()
		else if (Array.isArray(arg)) factory.value?.expansion.expand(arg)
		else factory.value?.expansion.expand(arg)
	}
	function expansionCollapse(): void
	function expansionCollapse(id: string): void
	function expansionCollapse(ids: string[]): void
	function expansionCollapse(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.expansion.collapse()
		else if (Array.isArray(arg)) factory.value?.expansion.collapse(arg)
		else factory.value?.expansion.collapse(arg)
	}
	function expansionToggle(): void
	function expansionToggle(id: string): void
	function expansionToggle(ids: string[]): void
	function expansionToggle(arg?: string | string[]): void {
		if (arg === undefined) factory.value?.expansion.toggle()
		else if (Array.isArray(arg)) factory.value?.expansion.toggle(arg)
		else factory.value?.expansion.toggle(arg)
	}

	const expansion: TableExpansionManagerInterface = {
		expanded: expansionView,
		expand: expansionExpand,
		collapse: expansionCollapse,
		toggle: expansionToggle,
		set: (ids) => factory.value?.expansion.set(ids),
	}

	const resize: TableResizeManagerInterface = {
		active: computed(() => factory.value?.resize?.active.value ?? false),
		width: (index) => factory.value?.resize?.width(index) ?? 0,
		set: (index, width) => factory.value?.resize?.set(index, width),
		clear: () => factory.value?.resize?.clear(),
	}

	const focus: TableFocusInterface = {
		cell: computed<TableCell | null>(() => factory.value?.focus.cell.value ?? null),
		focus: (cell) => factory.value?.focus.focus(cell) ?? false,
		move: (direction) => factory.value?.focus.move(direction) ?? false,
		clear: () => factory.value?.focus.clear(),
	}

	const pagination: TablePaginationInterface = {
		size: computed<number>(() => factory.value?.pagination.size.value ?? 0),
		page: computed<number>(() => factory.value?.pagination.page.value ?? 1),
		count: computed<number>(() => factory.value?.pagination.count.value ?? 1),
		to: (page) => factory.value?.pagination.to(page),
		next: () => factory.value?.pagination.next(),
		prev: () => factory.value?.pagination.prev(),
	}

	// Sync the locally-held shallowReactive views with the factory's underlying sets.
	const syncViews = (instance: CreateTableInstance | null): void => {
		expansionView.clear()
		if (instance) for (const id of instance.expansion.expanded) expansionView.add(id)
		selectionView.clear()
		if (instance) for (const id of instance.selection.ids) selectionView.add(id)
	}

	watch(
		() => elementRef.value,
		(el, _previous, onCleanup) => {
			if (typeof window === 'undefined' || !el) return
			const instance = createTable(el, options)
			factory.value = instance
			syncViews(instance)
			const onChange = (): void => syncViews(instance)
			el.addEventListener(TABLE_EVENTS.select, onChange)
			el.addEventListener(TABLE_EVENTS.expand, onChange)
			el.addEventListener(TABLE_EVENTS.collapse, onChange)
			el.addEventListener(TABLE_EVENTS.change, onChange)
			onCleanup(() => {
				el.removeEventListener(TABLE_EVENTS.select, onChange)
				el.removeEventListener(TABLE_EVENTS.expand, onChange)
				el.removeEventListener(TABLE_EVENTS.collapse, onChange)
				el.removeEventListener(TABLE_EVENTS.change, onChange)
				instance.destroy()
				if (factory.value === instance) factory.value = null
				expansionView.clear()
				selectionView.clear()
			})
		},
		{ flush: 'post', immediate: true },
	)

	return {
		element: elementRef,
		ready,
		data,
		caption,
		headers,
		rows,
		cells,
		footer,
		sort,
		expansion,
		selection,
		resize: options.resize ? resize : null,
		focus,
		pagination,
		columns: columnSchema,
		total,
		refresh: () => factory.value?.refresh(),
		clear: () => factory.value?.clear(),
		destroy: () => factory.value?.destroy(),
	}
}
