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

/** Slide direction for carousel transitions. `'left'` = forwards (next),
 *  `'right'` = backwards (prev). LTR-physical naming because the
 *  transition classes use the same axis. */
export type CarouselDirection = 'left' | 'right'

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

// ─────────────────────────────────────────────────────────────────────────
// useDialog (← useModal). Bound to the native `<dialog>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDialogEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired when a dismiss attempt is blocked by `dismiss.backdrop: 'static'`. */
	readonly prevent: (event: CustomEvent) => void
}

export interface CreateDialogOptions {
	/** `false` calls `dialog.show()` (non-modal). Default `true`. */
	readonly modal?: boolean
	readonly dismiss?: {
		/** `true` dismiss on `::backdrop` click. `'static'` fires `prevent`. */
		readonly backdrop?: boolean | 'static'
		readonly escape?: boolean
	}
	readonly scroll?: {
		/** Lock body scroll when `modal: false` (modal dialogs already lock natively). */
		readonly lock?: boolean
	}
	readonly on?: Partial<UseDialogEventMap>
}

export interface CreateDialogInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDialogOptions extends CreateDialogOptions {}

export interface UseDialogReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDetails (← useCollapse). Bound to the native `<details>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDetailsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateDetailsOptions {
	/** Open on mount. Default `false`. */
	readonly initial?: boolean
	/** Optional accordion container — opening one panel closes its open siblings. */
	readonly accordion?: HTMLElement | null
	readonly on?: Partial<UseDetailsEventMap>
}

export interface CreateDetailsInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDetailsOptions {
	readonly initial?: boolean
	readonly accordion?: Ref<HTMLElement | null>
	readonly on?: Partial<UseDetailsEventMap>
}

export interface UseDetailsReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAside (← useOffcanvas). Bound to the native `<aside>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAsideEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly prevent: (event: CustomEvent) => void
}

export interface CreateAsideOptions {
	readonly dismiss?: {
		readonly backdrop?: boolean | 'static'
		readonly escape?: boolean
	}
	readonly scroll?: {
		readonly lock?: boolean
	}
	readonly on?: Partial<UseAsideEventMap>
}

export interface CreateAsideInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseAsideOptions extends CreateAsideOptions {}

export interface UseAsideReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTooltip
// ─────────────────────────────────────────────────────────────────────────

export interface UseTooltipEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly place: (event: CustomEvent) => void
}

export interface CreateTooltipElements {
	readonly anchor: HTMLElement
	readonly panel: HTMLElement
	readonly arrow?: HTMLElement | null
}

export interface CreateTooltipOptions {
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface CreateTooltipInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UseTooltipOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface UseTooltipReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useMenu (← useDropdown). Bound to the native `<menu>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseMenuEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateMenuElements {
	readonly toggle: HTMLElement
	readonly menu: HTMLMenuElement
}

export interface CreateMenuOptions {
	readonly placement?: Placement
	readonly strategy?: Strategy
	readonly offset?: number
	/** Min item-rows the requested side must hold before the menu commits.
	 *  `0` opts out — surplus rows scroll inside the panel. Default 5. */
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface CreateMenuInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: Placement }) => void
	readonly destroy: () => void
}

export interface UseMenuOptions {
	readonly placement?: Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface UseMenuReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useToast. Bound to the native `<output>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseToastEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateToastOptions {
	/** `false` keeps the toast sticky. Object enables auto-hide with optional delay. */
	readonly autohide?: false | { readonly delay?: number }
	readonly on?: Partial<UseToastEventMap>
}

export interface CreateToastInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseToastOptions extends CreateToastOptions {}

export interface UseToastReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrag
// ─────────────────────────────────────────────────────────────────────────

export interface UseDragEventMap {
	readonly tap: (event: CustomEvent) => void
	readonly start: (event: CustomEvent) => void
	readonly over: (event: CustomEvent) => void
	readonly drop: (event: CustomEvent) => void
	readonly end: (event: CustomEvent) => void
	readonly reorder: (event: CustomEvent) => void
}

/** Mutable list accessor used by the factory in place of a Vue ref. */
export interface CreateDragList<T> {
	readonly read: () => T[]
	readonly splice: (start: number, deleteCount: number, ...items: T[]) => T[]
}

export interface CreateDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: CreateDragList<T>
	readonly items?: () => readonly T[]
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface CreateDragInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: Ref<T[]>
	readonly items?: Ref<readonly T[]>
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface UseDragReturn {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrop
// ─────────────────────────────────────────────────────────────────────────

export interface UseDropEventMap {
	readonly dragenter: (event: DragEvent) => void
	readonly dragover: (event: DragEvent) => void
	readonly dragleave: (event: DragEvent) => void
	readonly drop: (event: DragEvent) => void
}

export interface CreateDropOptions {
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly accept?: readonly string[]
	readonly on?: Partial<UseDropEventMap>
}

export interface CreateDropInstance {
	readonly over: Readonly<Ref<boolean>>
	readonly destroy: () => void
}

export interface UseDropOptions extends CreateDropOptions {}

export interface UseDropReturn {
	readonly over: Readonly<Ref<boolean>>
}

// ─────────────────────────────────────────────────────────────────────────
// useFocus (extracted from mailbox's useModal focus-trap loop)
// ─────────────────────────────────────────────────────────────────────────

export interface CreateFocusOptions {
	/** Element (or selector function) to focus on activate. Defaults to the
	 *  first focusable descendant. */
	readonly initial?: HTMLElement | ((host: HTMLElement) => HTMLElement | null)
	/** Restore focus to the previously-focused element on deactivate.
	 *  Default `true`. */
	readonly restore?: boolean
}

export interface CreateFocusInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
	readonly destroy: () => void
}

export interface UseFocusOptions extends CreateFocusOptions {}

export interface UseFocusReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useButton. Bound to native `<button>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseButtonEventMap {
	/** Fired after toggle. `event.detail` is `ButtonToggleDetail`. */
	readonly toggle: (event: CustomEvent) => void
}

export interface CreateButtonOptions {
	readonly on?: Partial<UseButtonEventMap>
}

export interface CreateButtonInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseButtonOptions extends CreateButtonOptions {}

export interface UseButtonReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAlert. Bound to any element carrying `[role="alert"]` / `[role="status"]`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAlertEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateAlertOptions {
	readonly on?: Partial<UseAlertEventMap>
}

export interface CreateAlertInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export type UseAlertOptions = CreateAlertOptions

export interface UseAlertReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTabs (← useTab). Operates on one tab/pane pair within a tablist group.
// ─────────────────────────────────────────────────────────────────────────

export interface UseTabsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateTabsElements {
	readonly trigger: HTMLElement
	readonly pane: HTMLElement
	readonly group: HTMLElement
}

export interface CreateTabsOptions {
	readonly on?: Partial<UseTabsEventMap>
}

export interface CreateTabsInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseTabsOptions {
	readonly pane: Ref<HTMLElement | null>
	readonly group: Ref<HTMLElement | null>
	readonly on?: Partial<UseTabsEventMap>
}

export interface UseTabsReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useNav (← useScrollSpy). Bound to native `<nav>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseNavEventMap {
	/** `event.detail` is `NavActivateDetail`. */
	readonly activate: (event: CustomEvent) => void
}

export interface CreateNavElements {
	readonly container: HTMLElement
	readonly nav?: HTMLElement | null
}

export interface CreateNavOptions {
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface CreateNavInstance {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
	readonly destroy: () => void
}

export interface UseNavOptions {
	readonly nav?: Ref<HTMLElement | null>
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface UseNavReturn {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useCarousel
// ─────────────────────────────────────────────────────────────────────────

export interface UseCarouselEventMap {
	readonly slide: (event: CustomEvent) => void
	readonly change: (event: CustomEvent) => void
	readonly pause: (event: CustomEvent) => void
	readonly resume: (event: CustomEvent) => void
}

export interface CreateCarouselOptions {
	readonly autoplay?: {
		readonly interval?: number
		readonly pause?: 'hover' | false
		readonly ride?: 'mount' | 'interaction' | false
	}
	readonly keyboard?: boolean
	readonly wrap?: boolean
	readonly touch?: boolean
	readonly on?: Partial<UseCarouselEventMap>
}

export interface CreateCarouselInstance {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseCarouselOptions extends CreateCarouselOptions {}

export interface UseCarouselReturn {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useForm. Bound to native `<form>`.
// ─────────────────────────────────────────────────────────────────────────

export interface FormDataDetail {
	readonly formData: FormData
}
export interface FormInvalidDetail {
	readonly field: string | null
	readonly message: string
	readonly validity: ValidityState | null
}
export interface FormResetDetail {
	readonly data: readonly FormEntry[]
}

export interface FormEventMap {
	readonly change: (event: CustomEvent) => void
	readonly formdata: (event: CustomEvent) => void
	readonly input: (event: CustomEvent) => void
	readonly invalid: (event: CustomEvent) => void
	readonly reset: (event: CustomEvent) => void
	readonly submit: (event: CustomEvent) => void
	readonly validate: (event: CustomEvent) => void
}

export interface CreateFormOptions {
	readonly submit?: { readonly invalid?: boolean }
	readonly validate?: {
		readonly input?: boolean
		readonly mount?: boolean
		readonly submit?: boolean
	}
	readonly on?: Partial<FormEventMap>
}

export interface FormFieldsInterface {
	readonly items: Readonly<Ref<readonly FormFieldElement[]>>
	readonly names: Readonly<Ref<readonly string[]>>
	readonly field: (name: string) => FormFieldElement | null
	readonly fields: (name?: string) => readonly FormFieldElement[]
	readonly has: (name: string) => boolean
	readonly focus: (name: string) => boolean
	readonly enable: (name: string) => void
	readonly disable: (name: string) => void
}

export interface FormValidityInterface {
	readonly errors: Readonly<Ref<readonly FormError[]>>
	readonly field: (name: string) => ValidityState | null
	readonly message: (name: string) => string | null
	readonly mark: (name: string, message: string) => boolean
	readonly clear: (name?: string) => void
}

export interface CreateFormInstance {
	readonly element: HTMLFormElement
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseFormOptions extends CreateFormOptions {}

export interface UseFormReturn {
	readonly element: Readonly<Ref<HTMLFormElement | null>>
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTable
// ─────────────────────────────────────────────────────────────────────────

/** Per-column schema entry — drives sortable / filterable behavior. */
export interface TableColumn {
	readonly key: string
	readonly title?: string
	readonly sortable?: boolean
	readonly filterable?: boolean
	/** Custom sort comparator. Receives cell `textContent` from two rows. */
	readonly sort?: (a: string, b: string) => number
	/** Custom filter predicate. */
	readonly filter?: (value: string, query: string) => boolean
}

export interface TableChangeDetail {
	readonly part: TablePart
	readonly action: TableAction
}

export interface TableSelectDetail {
	readonly ids: ReadonlySet<string>
}

export interface TablePaginateDetail {
	readonly page: number
	readonly offset: number
	readonly size: number
}

export interface TableFocusDetail {
	readonly cell: TableCell | null
}

export interface TableSortDetail {
	readonly columns: readonly TableSortEntry[]
}

export interface TableExpansionDetail {
	readonly id: string
}

export interface TableEventMap {
	readonly change: (event: CustomEvent) => void
	readonly focus: (event: CustomEvent) => void
	readonly select: (event: CustomEvent) => void
	readonly sort: (event: CustomEvent) => void
	readonly expand: (event: CustomEvent) => void
	readonly collapse: (event: CustomEvent) => void
	readonly paginate: (event: CustomEvent) => void
}

export interface CreateTableOptions {
	readonly caption?: string
	readonly footer?: TableInputRow
	readonly focus?: {
		readonly keyboard?: boolean
		readonly wrap?: boolean
	}
	readonly headers?: TableInputRow
	readonly id?: () => string
	readonly on?: Partial<TableEventMap>
	readonly rows?: readonly TableInputRow[]
	/** Per-column schema — drives sort/filter and column key discovery. */
	readonly columns?: readonly TableColumn[]
	/** Property name read from row data for stable identity (written as `data-id`). */
	readonly value?: string
	/** 1-based index of the first visible row in the full dataset (drives `aria-rowindex`). */
	readonly offset?: number | Ref<number>
	/** Total row count written as `aria-rowcount` on the `<table>` element. */
	readonly total?: number | Ref<number>
	readonly pagination?: {
		/**
		 * Rows per page — drives `pagination.page` / `pagination.count`
		 * derivations. When omitted the body row count at the time of access
		 * is used (the rendered page IS the page).
		 */
		readonly size?: number | Ref<number>
	}
	readonly sort?: {
		/** Allow multi-column sort. Default `false`. */
		readonly multiple?: boolean
		/** Prevent clearing sort (cycles asc→desc→asc). Default `false`. */
		readonly mandate?: boolean
		/** Direction on first click. Default `'asc'`. */
		readonly order?: 'asc' | 'desc'
	}
	readonly expansion?: {
		/** Allow multiple rows expanded simultaneously. Default `true`. */
		readonly multiple?: boolean
		/** Row ids to expand at construction (stale ids silently ignored). */
		readonly initial?: readonly string[]
		/** Animate the inner panel between `0` and `scrollHeight`. Default
		 *  `false`. When true, the factory drives a height-transition on the
		 *  `[data-table-expansion-panel]` element via the `[data-collapsing]`
		 *  attribute (mirrors `createDetails` semantics). When false, the
		 *  panel toggles `hidden` synchronously. */
		readonly animate?: boolean
	}
	readonly selection?: {
		/** Scope for select-all operations. Default `'page'`. */
		readonly strategy?: TableStrategy
		/** Predicate — return `false` to prevent a row from being selected. */
		readonly selectable?: (row: HTMLTableRowElement) => boolean
		/**
		 * When `true` (default), `createTable` listens for clicks on body rows
		 * and applies the canonical desktop selection model:
		 *  - plain click replaces the selection with that row
		 *  - Ctrl / ⌘ click toggles that row in or out of the selection
		 *  - Shift click extends from the anchor to the clicked row
		 *  - clicking outside the table with an active selection clears it
		 *
		 * Clicks whose target is interactive (`input`, `button`, `a`, `select`,
		 * `textarea`, `label`, or any descendant of `[data-no-select]`) are
		 * skipped so checkboxes / row actions still work.
		 *
		 * Set to `false` when driving selection entirely from custom UI.
		 */
		readonly click?: boolean
	}
	/** Column resize configuration. Absent = no resize handles. */
	readonly resize?: {
		/** Minimum column width in pixels. Default `40`. */
		readonly min?: number
		/** Maximum column width in pixels. Default `Infinity`. */
		readonly max?: number
	}
}

export interface CreateTableInstance {
	readonly element: HTMLTableElement
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	/** Column schema (structural, not reactive). */
	readonly columns: readonly TableColumn[]
	/** Reactive total ref — reflects `options.total`. */
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseTableOptions extends CreateTableOptions {}

export interface TableCaptionInterface {
	readonly value: Readonly<Ref<string | null>>
	readonly caption: () => HTMLTableCaptionElement | null
	readonly set: (value: string) => void
	readonly clear: () => void
}

export interface TableHeadersInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly headers: () => readonly HTMLTableCellElement[]
	readonly header: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableRowsInterface {
	readonly count: Readonly<Ref<number>>
	readonly ids: Readonly<Ref<readonly string[]>>
	readonly rows: () => readonly HTMLTableRowElement[]
	readonly row: (index: number) => HTMLTableRowElement | null
	readonly id: (index: number) => string | null
	readonly has: (index: number) => boolean
	readonly append: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly prepend: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly insert: (index: number, values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly update: (index: number, values: TableInputRow) => boolean
	readonly remove: (index: number) => TableRow | null
	readonly move: (from: number, to: number) => boolean
	readonly swap: (first: number, second: number) => boolean
	readonly clear: () => void
}

export interface TableCellsInterface {
	readonly cell: (cell: TableCell) => HTMLTableCellElement | null
	readonly read: (cell: TableCell) => string | null
	readonly update: (cell: TableCell, value: TableInput) => boolean
	readonly clear: (cell: TableCell) => boolean
}

export interface TableFooterInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly footers: () => readonly HTMLTableCellElement[]
	readonly footer: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableSortManagerInterface {
	/** Active sort entries in priority order. */
	readonly columns: Readonly<Ref<readonly TableSortEntry[]>>
	/** Toggle sort direction for a column key. */
	readonly toggle: (key: string) => void
	/** Sort direction for a column key. */
	readonly direction: (key: string) => TableSortDirection
	/** Sort priority (0-based) for a column key in multi-sort; `-1` if unsorted. */
	readonly priority: (key: string) => number
	/** Clear all sort state. */
	readonly clear: () => void
}

export interface TableSelectionManagerInterface {
	/** Currently selected row ids. */
	readonly ids: ReadonlySet<string>
	/** Whether all selectable rows in strategy scope are selected. */
	readonly all: Readonly<Ref<boolean>>
	/** Whether some but not all selectable rows in strategy scope are selected. */
	readonly mixed: Readonly<Ref<boolean>>
	/** Active strategy (read from options). */
	readonly strategy: TableStrategy
	readonly select: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly clear: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/** Whether a row can be selected (based on `selection.selectable` option). */
	readonly selectable: (row: HTMLTableRowElement) => boolean
}

export interface TableExpansionManagerInterface {
	/** Currently expanded row ids (`shallowReactive` Set — reactive in templates). */
	readonly expanded: ReadonlySet<string>
	readonly expand: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly collapse: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/**
	 * Replace the entire expanded set atomically (for state restoration).
	 *
	 * @remarks Stale ids (no matching body row) are silently ignored.
	 * Respects `expansion.multiple: false` — only first id is kept when false.
	 */
	readonly set: (ids: readonly string[]) => void
}

export interface TablePaginationInterface {
	/** Rows per page — caller-supplied or rendered body row count. */
	readonly size: Readonly<Ref<number>>
	/** 1-based current page number (1 when offset and size are 0). */
	readonly page: Readonly<Ref<number>>
	/** Total page count (1 minimum, even for empty datasets). */
	readonly count: Readonly<Ref<number>>
	/**
	 * Emit an `elements:table:paginate` event with the requested page (clamped
	 * to `[1, count]`) and the corresponding 1-based offset. Caller listens
	 * to apply the navigation — the factory does not mutate caller-owned
	 * `offset` or `data`.
	 */
	readonly to: (page: number) => void
	/** Sugar for `to(page + 1)`. */
	readonly next: () => void
	/** Sugar for `to(page - 1)`. */
	readonly prev: () => void
}

export interface TableResizeManagerInterface {
	/** True while a column resize drag is active. */
	readonly active: Readonly<Ref<boolean>>
	/** Current width of column at `index` (reads `offsetWidth`). */
	readonly width: (index: number) => number
	/** Programmatically set a column width in pixels. */
	readonly set: (index: number, width: number) => void
	/** Reset all columns to natural (content-driven) widths. */
	readonly clear: () => void
}

export interface TableFocusInterface {
	readonly cell: Readonly<Ref<TableCell | null>>
	readonly focus: (cell: TableCell) => boolean
	readonly move: (direction: TableDirection) => boolean
	readonly clear: () => void
}

export interface UseTableReturn {
	readonly element: Readonly<Ref<HTMLTableElement | null>>
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	readonly columns: readonly TableColumn[]
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}
