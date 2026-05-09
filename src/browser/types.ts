// ============================================================================
//  Browser-side type definitions shared across composables / factories.
//
//  Two flavours of declaration land in this file:
//    1. Cross-cutting primitives — `Side`, `Placement`, `DropPosition`,
//       `FormFieldElement`, `TableCell`, … the small scalar / structural
//       types that more than one composable depends on. They live here
//       so `helpers.ts` and any composable can import from a single
//       module without circular imports.
//    2. Per-composable option / return / event-map / detail interfaces.
//       Each `use*` / `create*` declares its own `Use{Name}Options`,
//       `Use{Name}Return`, `Create{Name}Options`, `Create{Name}Instance`,
//       and `Use{Name}EventMap` here so consumers (and the tokens.ts /
//       events.ts parity tests) have a single canonical surface.
//
//  Composable-specific blocks are added when each composable lands. The
//  current file ships only the cross-cutting primitives — composable
//  blocks are filled in turn-by-turn.
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// Theme primitives
// ─────────────────────────────────────────────────────────────────────────

/** Theme color mode applied to `<html data-theme="…">`. */
export type ThemeMode = 'light' | 'dark'

/**
 * User-facing setting for the theme mode. `'system'` defers to the OS
 * `prefers-color-scheme` media query reactively — the resolved mode tracks
 * the system preference until the user explicitly picks `'light'` or
 * `'dark'`. The factory's `theme` ref always returns the resolved
 * `ThemeMode`; the `setting` ref returns this raw choice.
 */
export type ThemeModeSetting = ThemeMode | 'system'

/** Theme core / palette key applied to `<html data-core="…">`. */
export type ThemeCore = string

export interface ThemeChangeDetail {
	/** Resolved mode (`'light' | 'dark'`) actually applied to `<html>`. */
	readonly mode: ThemeMode
	/** Raw user setting (`'light' | 'dark' | 'system'`) before resolution. */
	readonly setting: ThemeModeSetting
	readonly core: ThemeCore
}

// ─────────────────────────────────────────────────────────────────────────
// Popover placement primitives
// ─────────────────────────────────────────────────────────────────────────

/** Logical popover side. `start` / `end` are inline-axis. */
export type Side = 'top' | 'end' | 'bottom' | 'start'
/** Optional alignment along the popover's flat edge against the anchor. */
export type Alignment = 'start' | 'end'
/** Combined placement — bare side, or side-aligned corner. */
export type Placement = Side | `${Side}-${Alignment}`
/** Popover positioning strategy. `absolute` participates in layout flow;
 *  `fixed` floats above stacking contexts. */
export type Strategy = 'absolute' | 'fixed'
/** Discriminator across popover-derived widgets. Drives chrome class names
 *  (`popover` for rich content, `tooltip` for inline labels). */
export type PopoverKind = 'popover' | 'tooltip'
/** Trigger interaction that opens the popover. */
export type PopoverTrigger = 'hover' | 'focus' | 'click'

export interface PopoverPlaceDetail {
	readonly placement: Placement
}

// ─────────────────────────────────────────────────────────────────────────
// Drag / drop primitives
// ─────────────────────────────────────────────────────────────────────────

/** Insertion position relative to the item currently under the drag cursor. */
export type DropPosition = 'before' | 'after' | 'into'

/** Detail for `elements:drag:tap` — single click on a row. */
export interface DragTapDetail {
	readonly index: number
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:start` — native drag has begun. */
export interface DragStartDetail {
	readonly indices: ReadonlySet<number>
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:over` — native drag hovering a candidate target. */
export interface DragOverDetail {
	readonly index: number
	readonly position: DropPosition
	readonly target: HTMLElement
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:drop` — native drop over a target. */
export interface DragDropDetail {
	readonly index: number | null
	readonly position: DropPosition | null
	readonly target: HTMLElement | null
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:end` — drag terminated for any reason. */
export interface DragEndDetail {
	readonly cancelled: boolean
	readonly pointer: PointerEvent | null
}

/** Detail for `elements:drag:reorder` — successful in-list reorder. */
export interface DragReorderDetail {
	readonly fromIndices: readonly number[]
	readonly toIndex: number
	readonly items: readonly unknown[]
}

// ─────────────────────────────────────────────────────────────────────────
// Misc cross-cutting details
// ─────────────────────────────────────────────────────────────────────────

export interface ButtonToggleDetail {
	readonly active: boolean
}

export type CarouselDirection = 'next' | 'prev'

export interface CarouselSlideDetail {
	readonly direction: CarouselDirection
	readonly from: number
	readonly to: number
}

export interface NavActivateDetail {
	readonly id: string
}

// ─────────────────────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────────────────────

/** Native form-associated control element. */
export type FormFieldElement =
	| HTMLButtonElement
	| HTMLFieldSetElement
	| HTMLInputElement
	| HTMLObjectElement
	| HTMLOutputElement
	| HTMLSelectElement
	| HTMLTextAreaElement

/**
 * One `FormData` entry. Multi-value fields (checkbox groups, multi-selects,
 * `<input type="file" multiple>`) appear once per value, so the same `name`
 * may repeat across the array — duplicates are preserved on purpose.
 */
export interface FormEntry {
	readonly name: string
	readonly value: FormDataEntryValue
}

export interface FormError {
	readonly name: string
	readonly message: string
	readonly validity: ValidityState
}

export interface FormInputDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormChangeDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormSubmitDetail {
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormValidateDetail {
	readonly errors: readonly FormError[]
	readonly valid: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Table primitives
// ─────────────────────────────────────────────────────────────────────────

/** Acceptable cell input. `Node` is appended as a child; everything else
 *  becomes the cell's text content. */
export type TableInput = string | number | boolean | null | undefined | Node
/** Cell value as read back from a row. Always serialized to string. */
export type TableValue = string
/** A row's cells as an immutable array of values. */
export type TableRow = readonly TableValue[]
/** A row's cells as input values. */
export type TableInputRow = readonly TableInput[]

/** Body-cell coordinate inside a table. Both axes are 0-based. */
export interface TableCell {
	readonly row: number
	readonly column: number
}

/** Closed range of body-row indices. Both bounds inclusive. */
export interface TableRange {
	readonly from: number
	readonly to: number
}

/** Selection / focus / sort target. Either a sentinel, single row,
 *  cell coordinate, or row range. */
export type TableTarget = 'all' | number | TableCell | TableRange

/** Direction for a sorted column. `'none'` is the unsorted state. */
export type TableSortDirection = 'asc' | 'desc' | 'none'

/** Single entry in the active sort list (in priority order). */
export interface TableSortEntry {
	readonly key: string
	readonly direction: Exclude<TableSortDirection, 'none'>
}

/** Selection scope strategy applied by select-all operations. */
export type TableStrategy = 'single' | 'page' | 'all'

/** Arrow-key navigation direction inside a grid. */
export type TableDirection = 'up' | 'down' | 'left' | 'right'

/** Logical sub-region of a `<table>` that an action targets. */
export type TablePart =
	| 'caption'
	| 'headers'
	| 'rows'
	| 'cells'
	| 'footer'
	| 'selection'
	| 'expansion'
	| 'sort'
	| 'resize'
	| 'focus'

/** Mutation verb a table action expresses. */
export type TableAction =
	| 'set'
	| 'append'
	| 'prepend'
	| 'insert'
	| 'update'
	| 'remove'
	| 'move'
	| 'swap'
	| 'clear'
	| 'refresh'

// ─────────────────────────────────────────────────────────────────────────
// Per-composable option / return / instance blocks. Order alphabetical.
// ─────────────────────────────────────────────────────────────────────────

import type { ComputedRef, Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePointer
// ─────────────────────────────────────────────────────────────────────────

export interface UsePointerEventMap {
	readonly start: (event: PointerEvent) => void
	readonly move: (event: PointerEvent) => void
	readonly end: (event: PointerEvent) => void
}

export interface CreatePointerOptions {
	/** Cursor applied to `document.body` for the duration of the drag. */
	readonly cursor?: string
	/** Pure decision callback — return `false` to reject a `pointerdown`. */
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface CreatePointerInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UsePointerOptions {
	readonly cursor?: string
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface UsePointerReturn {
	readonly dragging: Readonly<Ref<boolean>>
	/** Programmatically cancel an in-progress drag and restore body styles. */
	readonly clear: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTheme
// ─────────────────────────────────────────────────────────────────────────

export interface UseThemeEventMap {
	/** `event.detail` is `ThemeChangeDetail`. */
	readonly change: (event: CustomEvent) => void
}

export interface CreateThemeOptions {
	/**
	 * Initial mode when nothing is stored. Defaults to `'system'` — the
	 * resolved mode follows `prefers-color-scheme` reactively until the user
	 * explicitly picks `'light'` or `'dark'`.
	 */
	readonly initial?: ThemeModeSetting
	/** Initial core when nothing is stored — defaults to `'default'`. */
	readonly core?: ThemeCore
	readonly storage?: false | { readonly key?: string }
	readonly on?: Partial<UseThemeEventMap>
}

export interface CreateThemeInstance {
	/** Resolved mode applied to `<html data-theme="…">` — `'light'` or `'dark'`. */
	readonly theme: Readonly<Ref<ThemeMode>>
	/** Raw user setting (`'light' | 'dark' | 'system'`). UI surfaces that let
	 *  the user pick between the three (e.g. tri-state segmented button)
	 *  read this; surfaces that only need the resolved mode read `theme`. */
	readonly setting: Readonly<Ref<ThemeModeSetting>>
	readonly core: Readonly<Ref<ThemeCore>>
	readonly dark: Readonly<Ref<boolean>>
	readonly toggle: () => void
	readonly apply: (mode: ThemeModeSetting) => void
	readonly select: (core: ThemeCore) => void
	readonly destroy: () => void
}

export interface UseThemeOptions {
	readonly initial?: ThemeModeSetting
	readonly core?: ThemeCore
	readonly storage?: false | { readonly key?: string }
	readonly on?: Partial<UseThemeEventMap>
}

export interface UseThemeReturn {
	readonly theme: Readonly<Ref<ThemeMode>>
	readonly setting: Readonly<Ref<ThemeModeSetting>>
	readonly core: Readonly<Ref<ThemeCore>>
	readonly dark: Readonly<Ref<boolean>>
	readonly toggle: () => void
	readonly apply: (mode: ThemeModeSetting) => void
	readonly select: (core: ThemeCore) => void
}

// `ComputedRef` is re-exported here so per-composable blocks below can use
// it without each one re-importing from 'vue'. The first import must stay
// in alphabetical order with `Ref`.
export type { ComputedRef, Ref }

import type { CSSProperties } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePopover
// ─────────────────────────────────────────────────────────────────────────

export interface UsePopoverEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired after placement is refreshed. `event.detail` is `PopoverPlaceDetail`. */
	readonly place: (event: CustomEvent) => void
}

export interface CreatePopoverElements {
	/** Reference (anchor) element. */
	readonly anchor: HTMLElement
	/** Floating panel element (must be in the DOM, ideally teleported to body). */
	readonly panel: HTMLElement
	/** Optional arrow inside the panel. */
	readonly arrow?: HTMLElement | null
}

export interface CreatePopoverOptions {
	/** Placement for the floating panel. `false` keeps native visibility
	 *  without applying any placement attributes. */
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface CreatePopoverInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UsePopoverOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface UsePopoverReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}
